"use client";

import { useEffect, useRef, useState } from "react";
import { preloader } from "@/content/site";
import { sound } from "@/lib/audio";
import { getLenis } from "@/lib/lenis";
import { LOGO_SHARD_PATH, LOGO_VIEWBOX, LOGO_WHITE_PATH } from "@/lib/logo";
import { scene, setUI, useUI } from "@/lib/scene";

const MIN_MS = 1700;

export function Preloader() {
  const entered = useUI((s) => s.entered);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(false);
  const primary = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let raf = 0;
    let fontsReady = false;
    const start = performance.now();
    document.fonts.ready.then(() => (fontsReady = true));
    let shown = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      // Count towards 90 on time alone, finish only once fonts are in.
      const goal = Math.min(elapsed / MIN_MS, 1) * (fontsReady ? 100 : 90);
      shown += (goal - shown) * 0.12;
      const v = Math.min(100, Math.round(shown + 0.4));
      setProgress(v);
      if (v >= 100) {
        setReady(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (ready) primary.current?.focus({ preventScroll: true });
  }, [ready]);

  const enter = async (withSound: boolean) => {
    if (entered) return;
    if (withSound) {
      try {
        await sound.enable();
        sound.enter();
      } catch {
        // Audio blocked or unsupported: carry on silently.
      }
    }
    scene.enteredAt = performance.now();
    setUI({ entered: true, sound: withSound && sound.enabled });
    document.documentElement.classList.add("cursor-on");
    getLenis()?.start();
    window.setTimeout(() => setGone(true), 1400);
  };

  if (gone) return null;

  const pct = progress / 100;
  // The counter physically stretches from condensed to wide as it loads.
  const stretch = 50 + pct * 100;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black text-chalk transition-[clip-path] duration-[1100ms] ease-[var(--ease-snap)]"
      style={{
        clipPath: entered
          ? "polygon(0 0, 100% 0, 100% 0, 0 -35%)"
          : "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
      }}
      aria-live="polite"
    >
      <div className="flex flex-1 items-center justify-center px-[var(--gutter)]">
        <svg viewBox={LOGO_VIEWBOX} className="w-[min(72vw,620px)]" role="img" aria-label="Tessarin">
          <defs>
            <clipPath id="pre-reveal">
              <rect x="0" y="0" height="788" width={3772 * pct} />
            </clipPath>
          </defs>
          <path d={LOGO_WHITE_PATH} fill="currentColor" clipPath="url(#pre-reveal)" />
          <path
            d={LOGO_SHARD_PATH}
            fill="#E8462A"
            style={{
              transform: ready ? "translateY(0)" : "translateY(-900px)",
              opacity: ready ? 1 : 0,
              transition: "transform 0.7s cubic-bezier(0.7,0,0.2,1.25), opacity 0.2s",
            }}
          />
        </svg>
      </div>

      <div className="flex items-end justify-between gap-6 px-[var(--gutter)] pb-[clamp(20px,4vh,44px)]">
        <span
          className="font-display text-[clamp(48px,9vw,128px)] font-[800] leading-[0.8] tabular-nums"
          style={{ fontStretch: `${stretch}%` }}
          aria-label={`Loading ${progress} percent`}
        >
          {String(progress).padStart(3, "0")}
        </span>

        <div
          className="flex flex-col items-end gap-3 transition-opacity duration-500"
          style={{ opacity: ready ? 1 : 0, pointerEvents: ready ? "auto" : "none" }}
        >
          <div className="flex flex-wrap justify-end gap-2">
            <button
              ref={primary}
              onClick={() => enter(true)}
              className="h-12 rounded-full bg-smalti px-6 text-[15px] font-medium text-black transition-transform hover:scale-[1.04] active:scale-95"
            >
              {preloader.enterWithSound}
            </button>
            <button
              onClick={() => enter(false)}
              className="h-12 rounded-full border border-white/25 px-6 text-[15px] font-medium text-chalk transition-colors hover:border-white/70"
            >
              {preloader.enterSilent}
            </button>
          </div>
          <span className="text-[13px] text-ash">{preloader.note}</span>
        </div>
      </div>
    </div>
  );
}
