// Procedural sound engine. Every sound on the site is synthesised here with the
// Web Audio API, so there are no audio files to download.

type Voice = { out: GainNode; pan: StereoPannerNode };

const SCALE = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66]; // A minor pentatonic-ish

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

class SoundEngine {
  ctx: AudioContext | null = null;
  enabled = false;
  private master!: GainNode;
  private sfx!: GainNode;
  private amb!: GainNode;
  private ambFilter!: BiquadFilterNode;
  private send!: GainNode;
  private noise!: AudioBuffer;
  private pink!: AudioBuffer;
  private ambientStarted = false;
  private bellTimer: ReturnType<typeof setTimeout> | null = null;
  private tokens = 0;
  private lastRefill = 0;
  private listeners = new Set<(on: boolean) => void>();

  private init() {
    if (this.ctx) return;
    const ctx = new AudioContext({ latencyHint: "interactive" });
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);

    this.ambFilter = ctx.createBiquadFilter();
    this.ambFilter.type = "lowpass";
    this.ambFilter.frequency.value = 16000;
    this.amb = ctx.createGain();
    this.amb.gain.value = 0;
    this.amb.connect(this.ambFilter).connect(this.master);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(2.4, 3);
    this.send = ctx.createGain();
    this.send.gain.value = 1;
    const ret = ctx.createGain();
    ret.gain.value = 0.55;
    this.send.connect(reverb).connect(ret).connect(this.master);

    this.noise = this.makeNoise(2, false);
    this.pink = this.makeNoise(4, true);

    document.addEventListener("visibilitychange", () => {
      if (!this.ctx || !this.enabled) return;
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(document.hidden ? 0 : 0.85, t, 0.15);
    });
  }

  private makeNoise(seconds: number, pink: boolean) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (!pink) {
          d[i] = w;
          continue;
        }
        // Paul Kellet's refined pink noise filter
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    return buf;
  }

  // Synthetic room: decaying stereo noise that darkens as it fades.
  private impulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    const pre = Math.floor(ctx.sampleRate * 0.018);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = pre; i < len; i++) {
        const k = (i - pre) / (len - pre);
        const coef = 0.15 + 0.8 * k; // more smoothing over time = darker tail
        lp = lp * coef + (Math.random() * 2 - 1) * (1 - coef);
        d[i] = lp * Math.pow(1 - k, decay) * 2.2;
      }
    }
    return buf;
  }

  private voice(pan = 0, wet = 0.15): Voice {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    out.connect(p);
    p.connect(this.sfx);
    if (wet > 0) {
      const s = ctx.createGain();
      s.gain.value = wet;
      p.connect(s).connect(this.send);
    }
    return { out, pan: p };
  }

  private env(g: GainNode, t: number, attack: number, decay: number, peak: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private noiseBurst(t: number, dest: AudioNode, type: BiquadFilterType, freq: number, q: number, attack: number, decay: number, peak: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, attack, decay, peak);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 1.5, attack + decay + 0.05);
    return f;
  }

  private tone(t: number, dest: AudioNode, type: OscillatorType, f0: number, f1: number, glide: number, attack: number, decay: number, peak: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + glide);
    const g = ctx.createGain();
    this.env(g, t, attack, decay, peak);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  // Two-operator FM bell: inharmonic ratio gives a glassy, struck-metal tone.
  private bell(t: number, dest: AudioNode, freq: number, ratio: number, index: number, decay: number, peak: number) {
    const ctx = this.ctx!;
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    car.frequency.value = freq;
    mod.frequency.value = freq * ratio;
    modGain.gain.setValueAtTime(freq * index, t);
    modGain.gain.exponentialRampToValueAtTime(freq * 0.05, t + decay * 0.6);
    mod.connect(modGain).connect(car.frequency);
    const g = ctx.createGain();
    this.env(g, t, 0.002, decay, peak);
    car.connect(g).connect(dest);
    car.start(t);
    mod.start(t);
    car.stop(t + decay + 0.1);
    mod.stop(t + decay + 0.1);
  }

  // ---------- public API ----------

  subscribe(fn: (on: boolean) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  async enable() {
    this.init();
    const ctx = this.ctx!;
    if (ctx.state !== "running") await ctx.resume();
    this.enabled = true;
    const t = ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0.85, t, 0.2);
    this.startAmbient();
    this.listeners.forEach((l) => l(true));
  }

  disable() {
    this.enabled = false;
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(0, t, 0.12);
    }
    this.listeners.forEach((l) => l(false));
  }

  toggle() {
    if (this.enabled) this.disable();
    else void this.enable();
  }

  private get live() {
    return this.enabled && this.ctx !== null && this.ctx.state === "running";
  }

  /** Muffle the ambience, e.g. while a light section covers the tile field. */
  muffle(on: boolean) {
    if (!this.ctx) return;
    this.ambFilter.frequency.setTargetAtTime(on ? 520 : 16000, this.ctx.currentTime, 0.4);
  }

  private startAmbient() {
    if (this.ambientStarted || !this.ctx) return;
    this.ambientStarted = true;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Drone: low fifths through a slowly breathing low-pass.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 360;
    lp.Q.value = 0.8;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.045;
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start(t);
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.11;
    lp.connect(droneGain).connect(this.amb);
    const droneSend = ctx.createGain();
    droneSend.gain.value = 0.25;
    droneGain.connect(droneSend).connect(this.send);
    (
      [
        [55, "sine", 0.9],
        [82.41, "sine", 0.55],
        [110.3, "triangle", 0.35],
        [164.6, "triangle", 0.12],
      ] as [number, OscillatorType, number][]
    ).forEach(([f, type, v]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = rand(-6, 6);
      const g = ctx.createGain();
      g.gain.value = v;
      o.connect(g).connect(lp);
      o.start(t);
    });

    // Air: band-limited pink noise with a slow swell.
    const air = ctx.createBufferSource();
    air.buffer = this.pink;
    air.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 0.35;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.05;
    const airLfo = ctx.createOscillator();
    const airLfoGain = ctx.createGain();
    airLfo.frequency.value = 0.07;
    airLfoGain.gain.value = 0.025;
    airLfo.connect(airLfoGain).connect(airGain.gain);
    airLfo.start(t);
    air.connect(bp).connect(airGain).connect(this.amb);
    air.start(t);

    this.amb.gain.setValueAtTime(0, t);
    this.amb.gain.linearRampToValueAtTime(0.7, t + 4);

    const scheduleBell = () => {
      this.bellTimer = setTimeout(() => {
        if (this.live) {
          const now = this.ctx!.currentTime;
          const v = this.voice(rand(-0.7, 0.7), 0.9);
          this.bell(now, v.out, pick(SCALE), 3.5, 1.2, rand(3, 5), 0.018);
        }
        scheduleBell();
      }, rand(6000, 14000));
    };
    scheduleBell();
  }

  /** Mechanical clack of one tile flipping. */
  click(pan = 0, intensity = 1, when = 0) {
    if (!this.live) return;
    const t = this.ctx!.currentTime + when;
    const v = this.voice(pan, 0.12);
    const k = Math.min(1, intensity);
    this.noiseBurst(t, v.out, "bandpass", rand(2600, 5200), 1.4, 0.0008, rand(0.012, 0.03), 0.38 * k);
    const f = rand(190, 330);
    this.tone(t, v.out, "triangle", f, f * 0.82, 0.03, 0.001, 0.045, 0.16 * k);
  }

  /** Called once per frame with how many tiles flipped. Rate-limited into a "rain" of clacks. */
  tiles(count: number, pan: number, volume = 1) {
    if (!this.live || count <= 0) return;
    const now = performance.now();
    const dt = (now - this.lastRefill) / 1000;
    this.lastRefill = now;
    this.tokens = Math.min(6, this.tokens + dt * 55);
    const n = Math.min(Math.floor(this.tokens), count, 4);
    if (n <= 0) return;
    this.tokens -= n;
    const loud = Math.min(1, 0.35 + Math.log2(1 + count) * 0.12) * volume;
    for (let i = 0; i < n; i++) {
      this.click(pan + rand(-0.25, 0.25), loud * rand(0.6, 1), rand(0, 0.016));
    }
  }

  /** Soft tick for hovering interactive elements. */
  hover() {
    if (!this.live) return;
    const t = this.ctx!.currentTime;
    const v = this.voice(rand(-0.2, 0.2), 0.25);
    const f = pick(SCALE) * 2;
    this.tone(t, v.out, "sine", f, f * 0.94, 0.06, 0.002, 0.09, 0.045);
    this.noiseBurst(t, v.out, "highpass", 7000, 0.7, 0.0005, 0.008, 0.05);
  }

  /** Confirming press: two quick bell taps. */
  press() {
    if (!this.live) return;
    const t = this.ctx!.currentTime;
    const v = this.voice(0, 0.35);
    this.bell(t, v.out, 1046.5, 2, 0.8, 0.35, 0.08);
    this.bell(t + 0.07, v.out, 1567.98, 2, 0.6, 0.5, 0.06);
  }

  /** Filtered noise sweep for big transitions. */
  whoosh(duration = 1.2, up = true, volume = 1) {
    if (!this.live) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const v = this.voice(0, 0.4);
    const src = ctx.createBufferSource();
    src.buffer = this.pink;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.1;
    const [a, b] = up ? [280, 3400] : [3400, 280];
    f.frequency.setValueAtTime(a, t);
    f.frequency.exponentialRampToValueAtTime(b, t + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * volume, t + duration * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    v.pan.pan.setValueAtTime(up ? -0.6 : 0.6, t);
    v.pan.pan.linearRampToValueAtTime(up ? 0.6 : -0.6, t + duration);
    src.connect(f).connect(g).connect(v.out);
    v.out.gain.value = 1;
    src.start(t, Math.random() * 2, duration + 0.1);
  }

  /** Glass and tile breaking: an impact, a spray of glassy pings, then debris. */
  shatter() {
    if (!this.live) return;
    const t = this.ctx!.currentTime;
    const body = this.voice(0, 0.3);
    this.tone(t, body.out, "sine", 120, 38, 0.3, 0.002, 0.45, 0.7);
    this.noiseBurst(t, body.out, "highpass", 1400, 0.7, 0.001, 0.32, 0.55);
    this.noiseBurst(t, body.out, "lowpass", 900, 0.7, 0.001, 0.12, 0.5);
    for (let i = 0; i < 20; i++) {
      const dt = Math.pow(Math.random(), 2) * 0.45;
      const v = this.voice(rand(-0.9, 0.9), 0.55);
      this.bell(t + dt, v.out, rand(1900, 6800), pick([1.41, 2.76, 3.13]), rand(0.6, 2), rand(0.12, 0.9), rand(0.02, 0.07));
    }
    for (let i = 0; i < 26; i++) {
      this.click(rand(-0.8, 0.8), rand(0.15, 0.55), 0.05 + Math.pow(Math.random(), 1.6) * 0.9);
    }
  }

  /** The entrance: sub drop and an opening chord swell. */
  enter() {
    if (!this.live) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const sub = this.voice(0, 0.2);
    this.tone(t, sub.out, "sine", 96, 34, 1.6, 0.01, 2.6, 0.6);
    const chord = this.voice(0, 0.9);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 2;
    lp.frequency.setValueAtTime(180, t);
    lp.frequency.exponentialRampToValueAtTime(2600, t + 1.4);
    lp.frequency.exponentialRampToValueAtTime(500, t + 4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
    lp.connect(g).connect(chord.out);
    [110, 164.81, 246.94, 329.63, 493.88].forEach((f) => {
      [-7, 7].forEach((d) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        o.detune.value = d;
        o.connect(lp);
        o.start(t);
        o.stop(t + 4.6);
      });
    });
  }

  /** Physical knock for tiles colliding in the footer. */
  thud(strength: number, pan = 0) {
    if (!this.live) return;
    const now = performance.now();
    const dt = (now - this.lastRefill) / 1000;
    this.lastRefill = now;
    this.tokens = Math.min(6, this.tokens + dt * 40);
    if (this.tokens < 1) return;
    this.tokens -= 1;
    const t = this.ctx!.currentTime;
    const k = Math.min(1, strength);
    const v = this.voice(pan, 0.18);
    const f = rand(140, 240);
    this.tone(t, v.out, "triangle", f, f * 0.7, 0.05, 0.001, 0.09 + k * 0.08, 0.28 * k);
    this.noiseBurst(t, v.out, "bandpass", rand(1500, 3200), 1.2, 0.0008, 0.03, 0.35 * k);
  }

  dispose() {
    if (this.bellTimer) clearTimeout(this.bellTimer);
  }
}

export const sound = new SoundEngine();

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __sound: SoundEngine }).__sound = sound;
}
