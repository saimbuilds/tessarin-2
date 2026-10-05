"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { sound } from "@/lib/audio";
import { updateChoreography } from "@/lib/choreography";
import { FORM, scene } from "@/lib/scene";
import { buildLayout, makeTileGeometry, sampleMask, textMask, type Layout } from "@/lib/tiles";
import { hero } from "@/content/site";
import { createTileMaterial } from "./tileMaterial";

export const CAM_Z = 20;
export const FOV = 32;

function viewSize(aspect: number) {
  const h = 2 * CAM_Z * Math.tan(((FOV / 2) * Math.PI) / 180);
  return { w: h * aspect, h };
}

function useDebouncedSize() {
  const size = useThree((s) => s.size);
  const [stable, setStable] = useState(size);
  useEffect(() => {
    const id = setTimeout(() => setStable(size), 180);
    return () => clearTimeout(id);
  }, [size]);
  return stable;
}

// The tiled "browser window": a top bar and a page that scrolls forever.
function drawWindow(ctx: CanvasRenderingContext2D, w: number, h: number, time: number, portrait: boolean) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  const bar = h * (portrait ? 0.06 : 0.1);
  // Frame
  const f = Math.max(2, h * 0.025);
  ctx.fillRect(0, 0, w, f);
  ctx.fillRect(0, h - f, w, f);
  ctx.fillRect(0, 0, f, h);
  ctx.fillRect(w - f, 0, f, h);
  ctx.fillRect(0, bar, w, f);
  // Window dots and address bar
  for (let i = 0; i < 3; i++) ctx.fillRect(w * 0.035 + i * w * 0.04, bar * 0.35, w * 0.022, bar * 0.35);
  ctx.fillRect(w * 0.22, bar * 0.32, w * 0.5, bar * 0.4);

  ctx.save();
  ctx.beginPath();
  ctx.rect(f * 2, bar + f * 2, w - f * 4, h - bar - f * 4);
  ctx.clip();
  const pageH = h * 1.6;
  const off = ((time * h * 0.09) % pageH);
  const pad = w * 0.08;
  for (let rep = 0; rep < 2; rep++) {
    const y0 = bar + h * 0.08 - off + rep * pageH;
    // Hero block with a headline cut out of it
    ctx.fillRect(pad, y0, w - pad * 2, h * 0.34);
    ctx.fillStyle = "#000";
    ctx.fillRect(pad + w * 0.05, y0 + h * 0.08, (w - pad * 2) * 0.55, h * 0.06);
    ctx.fillRect(pad + w * 0.05, y0 + h * 0.17, (w - pad * 2) * 0.35, h * 0.04);
    ctx.fillStyle = "#fff";
    // Text lines
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(pad, y0 + h * (0.44 + i * 0.07), (w - pad * 2) * (i % 2 ? 0.62 : 0.85), h * 0.03);
    }
    // Card row
    const cols = portrait ? 2 : 3;
    const gap = w * 0.04;
    const cw = (w - pad * 2 - gap * (cols - 1)) / cols;
    for (let i = 0; i < cols; i++) ctx.fillRect(pad + i * (cw + gap), y0 + h * 0.76, cw, h * 0.26);
    // Big footer bar
    ctx.fillRect(pad, y0 + h * 1.12, w - pad * 2, h * 0.2);
  }
  ctx.restore();
}

export function TileField() {
  const size = useDebouncedSize();
  const camera = useThree((s) => s.camera);
  const meshRef = useRef<THREE.Mesh>(null);
  const aspect = size.width / size.height;
  const portrait = aspect < 0.85;
  const mobile = size.width < 760;

  const layout: Layout = useMemo(() => {
    const v = viewSize(aspect);
    const rows = portrait ? (mobile ? 92 : 96) : size.width < 1100 ? 50 : 58;
    return buildLayout(v.w * 1.05, v.h * 1.05, rows, portrait);
  }, [aspect, portrait, mobile, size.width]);

  const material = useMemo(() => createTileMaterial(), []);
  const base = useMemo(() => makeTileGeometry(0.12), []);

  const geometry = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute("position", base.getAttribute("position").clone());
    g.setAttribute("normal", base.getAttribute("normal").clone());
    g.setAttribute("aSide", base.getAttribute("aSide").clone());
    const inst = (arr: Float32Array, n: number) => new THREE.InstancedBufferAttribute(arr, n);
    g.setAttribute("aWall", inst(layout.wall, 3));
    g.setAttribute("aWin", inst(layout.window, 3));
    g.setAttribute("aSph", inst(layout.sphere, 3));
    g.setAttribute("aRing", inst(layout.ring, 3));
    g.setAttribute("aRingN", inst(layout.ringNormal, 3));
    g.setAttribute("aCloud", inst(layout.cloud, 3));
    g.setAttribute("aRot", inst(layout.rot, 1));
    g.setAttribute("aRand", inst(layout.rand, 4));
    const dyn = new Float32Array(layout.count * 2);
    for (let i = 0; i < layout.count; i++) dyn[i * 2] = 0.5; // edge-on until the intro opens them
    const dynAttr = inst(dyn, 2);
    dynAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("aDyn", dynAttr);
    g.instanceCount = layout.count;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    return g;
  }, [base, layout]);

  // Free the previous geometry when the layout is rebuilt (not on StrictMode's double effect run).
  const prevGeometry = useRef<THREE.InstancedBufferGeometry | null>(null);
  useEffect(() => {
    if (prevGeometry.current && prevGeometry.current !== geometry) prevGeometry.current.dispose();
    prevGeometry.current = geometry;
  }, [geometry]);

  // Per-tile simulation state, rebuilt with the layout.
  const sim = useMemo(() => {
    const n = layout.count;
    const flip = new Float32Array(n).fill(0.5);
    const vel = new Float32Array(n);
    const lift = new Float32Array(n);
    const disturb = new Float32Array(n);
    const fire = new Float32Array(n);
    const introDelay = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = layout.uv[i * 2];
      const v = layout.uv[i * 2 + 1];
      introDelay[i] = (u * 0.75 + (1 - v) * 0.45) * 1.25 + layout.rand[i * 4 + 1] * 0.18;
    }
    const sphereDir = new Float32Array(n * 3);
    let maxR = 0;
    for (let i = 0; i < n; i++) maxR = Math.max(maxR, Math.hypot(layout.sphere[i * 3], layout.sphere[i * 3 + 1], layout.sphere[i * 3 + 2]));
    for (let i = 0; i < n * 3; i++) sphereDir[i] = layout.sphere[i] / maxR;
    return { flip, vel, lift, disturb, fire, introDelay, sphereDir, text: new Float32Array(n), win: new Float32Array(n) };
  }, [layout]);

  // Hero text mask, once the display font is ready.
  useEffect(() => {
    let cancelled = false;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-anybody").trim() || "sans-serif";
    const draw = () => {
      if (cancelled) return;
      sim.text.set(textMask(layout, portrait ? hero.wallPortrait : hero.wall, family, portrait));
    };
    document.fonts.load(`900 100px ${family}`).then(draw, draw);
    return () => {
      cancelled = true;
    };
  }, [layout, sim, portrait]);

  // Offscreen canvas for the animated window mask.
  const winCanvas = useMemo(() => {
    const cw = Math.round((layout.wallW / layout.tileH) * 3);
    const ch = Math.round((layout.wallH / layout.tileH) * 3);
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    return { ctx: c.getContext("2d", { willReadFrequently: true })!, cw, ch, last: 0 };
  }, [layout]);

  const tmp = useMemo(
    () => ({ m4: new THREE.Matrix4(), m4b: new THREE.Matrix4(), e: new THREE.Euler(), light: new THREE.Vector3(), tilt: { x: 0, y: 0 } }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const time = state.clock.elapsedTime;
    const now = performance.now();
    updateChoreography();

    const u = material.uniforms;
    const view = viewSize(aspect);
    const { from, to, t } = scene;
    u.uFrom.value = from;
    u.uTo.value = to;
    u.uT.value = t;
    u.uAlpha.value += (scene.alpha - u.uAlpha.value) * Math.min(1, dt * 4);
    u.uArc.value = from === FORM.WALL || to === FORM.WALL ? 2.2 : 1.2;

    // Skip all work while nothing of the field can be seen.
    const hidden = scene.covered || (scene.alpha < 0.01 && u.uAlpha.value < 0.01);
    if (meshRef.current) meshRef.current.visible = !hidden;
    if (hidden) return;

    // Formation placement: services shapes sit beside the copy on desktop, above it on mobile.
    const side = portrait ? new THREE.Vector3(0, view.h * 0.27, 0) : new THREE.Vector3(view.w * 0.19, -view.h * 0.02, 0);
    (u.uOff.value as THREE.Vector3[])[1].copy(side);
    (u.uOff.value as THREE.Vector3[])[2].copy(side);
    (u.uOff.value as THREE.Vector3[])[3].copy(side);
    const tileScale = layout.tileH * 0.94;
    const sc = u.uScale.value as number[];
    sc[0] = tileScale;
    sc[1] = tileScale * layout.windowScale;
    sc[2] = layout.sphereScale;
    sc[3] = layout.ringScale;
    sc[4] = tileScale * 0.85;
    (u.uWinN.value as THREE.Vector3).copy(layout.windowNormal);

    // Pointer: tilt for 3D formations, light source everywhere.
    const p = scene.pointer;
    tmp.tilt.x += (p.y * 0.25 - tmp.tilt.x) * Math.min(1, dt * 3);
    tmp.tilt.y += (p.x * 0.35 - tmp.tilt.y) * Math.min(1, dt * 3);
    const spins = u.uSpin.value as THREE.Matrix3[];
    const rm = scene.reducedMotion ? 0 : 1;
    tmp.e.set(-tmp.tilt.x * 0.4, tmp.tilt.y * 0.4 + Math.sin(time * 0.4) * 0.03 * rm, 0, "YXZ");
    spins[1].setFromMatrix4(tmp.m4.makeRotationFromEuler(tmp.e));
    tmp.e.set(-tmp.tilt.x + 0.25, time * 0.18 * rm + tmp.tilt.y, 0, "YXZ");
    spins[2].setFromMatrix4(tmp.m4.makeRotationFromEuler(tmp.e));
    tmp.e.set(-tmp.tilt.x - 0.35, tmp.tilt.y + 0.3, 0, "YXZ");
    tmp.m4.makeRotationFromEuler(tmp.e).multiply(tmp.m4b.makeRotationZ(time * 0.22 * rm));
    spins[3].setFromMatrix4(tmp.m4);
    // Drift in-plane only: a Y rotation would swing the wide cloud into the camera.
    tmp.e.set(Math.sin(time * 0.07) * 0.08 * rm, Math.sin(time * 0.05) * 0.12 * rm, time * 0.015 * rm, "XYZ");
    spins[4].setFromMatrix4(tmp.m4.makeRotationFromEuler(tmp.e));

    const px = p.x * (view.w / 2);
    const py = p.y * (view.h / 2);
    if (p.active) tmp.light.set(px, py, 3.2);
    else tmp.light.set(Math.sin(time * 0.31) * view.w * 0.35, Math.cos(time * 0.23) * view.h * 0.3, 4);
    (u.uLightPos.value as THREE.Vector3).lerp(tmp.light, Math.min(1, dt * 8));
    u.uLightI.value = p.active ? 1.25 : 0.8;

    // ---------- flip targets ----------
    const n = layout.count;
    const form = t < 0.5 ? from : to;
    if (form === FORM.WINDOW && now - winCanvas.last > 70) {
      winCanvas.last = now;
      drawWindow(winCanvas.ctx, winCanvas.cw, winCanvas.ch, time, portrait);
      sampleMask(layout, winCanvas.ctx, winCanvas.cw, winCanvas.ch, sim.win);
    }

    const entered = scene.enteredAt >= 0;
    const since = entered ? (now - scene.enteredAt) / 1000 : 0;
    const wallActive = from === FORM.WALL && t < 0.3 && entered;
    const radius = layout.tileH * (2.2 + Math.min(2.5, Math.hypot(p.vx, p.vy) * 0.02));
    const r2 = radius * radius;
    const pointerOnWall = wallActive && p.active && now - p.lastMove < 1200 && !scene.reducedMotion;

    // Sphere "thought" waves travel across the surface; rings get spiral bands.
    const wx = Math.sin(time * 0.7), wy = Math.cos(time * 0.53), wz = Math.sin(time * 0.37 + 1);
    const fireRate = form === FORM.SPHERE ? 0.004 : 0;

    const dyn = geometry.getAttribute("aDyn") as THREE.InstancedBufferAttribute;
    const d = dyn.array as Float32Array;
    let crossed = 0;
    let crossedX = 0;
    const K = 230, C = 17;

    for (let i = 0; i < n; i++) {
      let target: number;
      if (form === FORM.WALL) target = sim.text[i];
      else if (form === FORM.WINDOW) target = sim.win[i];
      else if (form === FORM.SPHERE) {
        const sx = sim.sphereDir[i * 3], sy = sim.sphereDir[i * 3 + 1], sz = sim.sphereDir[i * 3 + 2];
        const wave = Math.sin((sx * wx + sy * wy + sz * wz) * 7 - time * 2.4);
        if (Math.random() < fireRate) sim.fire[i] = 1;
        target = wave > 0.86 || sim.fire[i] > 0.5 ? 1 : 0;
      } else if (form === FORM.RING) {
        const a = layout.ringAngles[i * 2], b = layout.ringAngles[i * 2 + 1];
        target = Math.sin(a * 5 + b - time * 2.2) > 0.72 ? 1 : 0;
      } else {
        target = layout.rand[i * 4 + 2] > 0.93 ? 1 : 0;
      }
      sim.fire[i] = Math.max(0, sim.fire[i] - dt * 1.4);

      // Cursor breaks the pattern: tiles under it invert, then heal.
      let liftT = 0;
      if (pointerOnWall) {
        const dx = layout.wall[i * 3] - px;
        const dy = layout.wall[i * 3 + 1] - py;
        const dd = dx * dx + dy * dy;
        if (dd < r2) sim.disturb[i] = 1;
        liftT = Math.exp(-dd / (r2 * 1.4));
      }
      sim.disturb[i] = Math.max(0, sim.disturb[i] - dt * 0.75);
      if (wallActive && sim.disturb[i] > 0.5) target = 1 - target;

      if (!entered || since < sim.introDelay[i]) target = 0.5;

      const prev = sim.flip[i];
      if (scene.reducedMotion) {
        sim.flip[i] = target;
        sim.vel[i] = 0;
      } else {
        sim.vel[i] += (K * (target - prev) - C * sim.vel[i]) * dt;
        sim.flip[i] = prev + sim.vel[i] * dt;
      }
      if ((prev - 0.5) * (sim.flip[i] - 0.5) < 0) {
        crossed++;
        crossedX += layout.uv[i * 2];
      }
      sim.lift[i] += (liftT - sim.lift[i]) * Math.min(1, dt * 10);
      d[i * 2] = sim.flip[i];
      d[i * 2 + 1] = sim.lift[i];
    }
    dyn.needsUpdate = true;

    if (crossed > 0 && u.uAlpha.value > 0.3) {
      const vol = form === FORM.WALL ? 1 : 0.45;
      sound.tiles(crossed, (crossedX / crossed) * 2 - 1, vol);
    }

    camera.position.set(0, 0, CAM_Z);
    camera.lookAt(0, 0, 0);
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />;
}
