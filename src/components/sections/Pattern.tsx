"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { pattern } from "@/content/site";
import { sound } from "@/lib/audio";
import { scene } from "@/lib/scene";
import { SHARD_PERIOD, SHARD_POINTS } from "@/lib/tiles";

gsap.registerPlugin(ScrollTrigger);

// Scroll-progress milestones inside the pinned section.
const P_THROW = 0.14;
const P_HIT = 0.26;
const P_FALL = 0.29;

type Piece = {
  pts: [number, number][]; // relative to centroid, in mock pixels
  cx: number;
  cy: number;
  dist: number; // 0..1 distance from impact
  dirX: number;
  dirY: number;
  r1: number;
  r2: number;
};

const M = pattern.mock;

/** The generic agency website, drawn deliberately bland: Arial, SaaS blue, stock photo. */
function drawMock(ctx: CanvasRenderingContext2D, w: number, h: number, compact: boolean) {
  const r = Math.min(w, h) * 0.025;
  const f = (px: number, weight = "normal") => `${weight} ${px}px Arial, Helvetica, sans-serif`;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, r);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Browser chrome
  const bar = h * 0.065;
  ctx.fillStyle = "#ececec";
  ctx.fillRect(0, 0, w, bar);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(bar * 0.6 + i * bar * 0.5, bar / 2, bar * 0.14, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(w * 0.3, bar * 0.2, w * 0.4, bar * 0.6, bar * 0.3);
  ctx.fill();
  ctx.fillStyle = "#8a8a8a";
  ctx.font = f(bar * 0.32);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(M.url, w * 0.5, bar / 2 + 1);

  // Nav
  const navY = bar + h * 0.045;
  const grad = ctx.createLinearGradient(w * 0.05, 0, w * 0.08, 0);
  grad.addColorStop(0, "#3b6cf6");
  grad.addColorStop(1, "#8b5cf6");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(w * 0.05, navY - h * 0.018, h * 0.036, h * 0.036, h * 0.008);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.font = f(h * 0.03, "bold");
  ctx.textAlign = "left";
  ctx.fillText(M.brand, w * 0.05 + h * 0.05, navY + 1);
  ctx.font = f(h * 0.022);
  ctx.fillStyle = "#4b5563";
  const links = compact ? M.links.slice(0, 2) : M.links;
  links.forEach((l, i) => ctx.fillText(l, w * (compact ? 0.42 : 0.36) + i * w * 0.085, navY + 1));
  ctx.fillStyle = "#3b6cf6";
  ctx.beginPath();
  ctx.roundRect(w * 0.8, navY - h * 0.022, w * 0.15, h * 0.044, h * 0.022);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = f(h * 0.021, "bold");
  ctx.textAlign = "center";
  ctx.fillText(M.button, w * 0.875, navY + 1);

  // Hero
  const heroY = bar + h * 0.09;
  const heroH = h * 0.47;
  const hg = ctx.createLinearGradient(0, heroY, w, heroY + heroH);
  hg.addColorStop(0, "#eef3ff");
  hg.addColorStop(1, "#f6efff");
  ctx.fillStyle = hg;
  ctx.fillRect(0, heroY, w, heroH);
  const blob = ctx.createRadialGradient(w * 0.78, heroY + heroH * 0.5, 0, w * 0.78, heroY + heroH * 0.5, heroH * 0.7);
  blob.addColorStop(0, "rgba(139,92,246,0.35)");
  blob.addColorStop(1, "rgba(139,92,246,0)");
  ctx.fillStyle = blob;
  ctx.fillRect(w * 0.4, heroY, w * 0.6, heroH);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#111827";
  ctx.font = f(h * 0.058, "bold");
  M.headline.forEach((l, i) => ctx.fillText(l, w * 0.06, heroY + heroH * 0.3 + i * h * 0.07));
  ctx.fillStyle = "#6b7280";
  ctx.font = f(h * 0.024);
  M.sub.forEach((l, i) => ctx.fillText(l, w * 0.06, heroY + heroH * 0.6 + i * h * 0.034));
  ctx.fillStyle = "#3b6cf6";
  ctx.beginPath();
  ctx.roundRect(w * 0.06, heroY + heroH * 0.75, w * 0.14, h * 0.05, h * 0.025);
  ctx.fill();
  ctx.strokeStyle = "#3b6cf6";
  ctx.lineWidth = Math.max(1, h * 0.003);
  ctx.beginPath();
  ctx.roundRect(w * 0.215, heroY + heroH * 0.75, w * 0.14, h * 0.05, h * 0.025);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = f(h * 0.021, "bold");
  ctx.fillStyle = "#fff";
  ctx.fillText(M.primary, w * 0.13, heroY + heroH * 0.75 + h * 0.025);
  ctx.fillStyle = "#3b6cf6";
  ctx.fillText(M.secondary, w * 0.285, heroY + heroH * 0.75 + h * 0.025);

  // Stock photo
  const px = w * 0.56, py = heroY + heroH * 0.12, pw = w * 0.38, ph = heroH * 0.76;
  ctx.fillStyle = "#d7dbe3";
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, r);
  ctx.fill();
  ctx.fillStyle = "#bfc5d0";
  ctx.beginPath();
  ctx.moveTo(px + pw * 0.1, py + ph * 0.8);
  ctx.lineTo(px + pw * 0.38, py + ph * 0.42);
  ctx.lineTo(px + pw * 0.56, py + ph * 0.66);
  ctx.lineTo(px + pw * 0.7, py + ph * 0.5);
  ctx.lineTo(px + pw * 0.9, py + ph * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + pw * 0.74, py + ph * 0.27, ph * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a93a3";
  ctx.font = f(h * 0.018);
  ctx.fillText(M.photo, px + pw / 2, py + ph * 0.92);

  // Three identical cards
  const cy = heroY + heroH + h * 0.045;
  const ch = h * 0.24;
  const gap = w * 0.03;
  const cw = (w * 0.88 - gap * 2) / 3;
  const icons = ["#3b6cf6", "#8b5cf6", "#14b8a6"];
  M.cards.forEach((title, i) => {
    const cx = w * 0.06 + i * (cw + gap);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = Math.max(1, h * 0.002);
    ctx.beginPath();
    ctx.roundRect(cx, cy, cw, ch, r);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = icons[i];
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(cx + cw * 0.16, cy + ch * 0.26, ch * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx + cw * 0.16, cy + ch * 0.26, ch * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111827";
    ctx.textAlign = "left";
    ctx.font = f(Math.min(h * 0.024, cw * 0.075), "bold");
    ctx.fillText(title, cx + cw * 0.08, cy + ch * 0.55);
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(cx + cw * 0.08, cy + ch * 0.7, cw * 0.8, ch * 0.05);
    ctx.fillRect(cx + cw * 0.08, cy + ch * 0.82, cw * 0.6, ch * 0.05);
  });

  ctx.fillStyle = "#9ca3af";
  ctx.font = f(h * 0.019);
  ctx.textAlign = "center";
  ctx.fillText(M.trusted, w / 2, h * 0.955);
  ctx.restore();
}

function buildPieces(mw: number, mh: number, rows: number, ix: number, iy: number) {
  const th = mh / rows;
  const P = SHARD_PERIOD * th;
  const tl = SHARD_POINTS[3][0];
  const pieces: Piece[] = [];
  const maxD = Math.hypot(Math.max(ix, mw - ix), Math.max(iy, mh - iy));
  // y-down canvas: flip the shard so it keeps the logo's slant.
  const base = SHARD_POINTS.map(([x, y]) => [x * th, (1 - y) * th] as [number, number]);
  const partner = base.map(([x, y]) => [(SHARD_POINTS[1][0] + SHARD_POINTS[2][0]) * th - x, th - y] as [number, number]);
  for (let r = 0; r < rows; r++) {
    const rowY = mh - (r + 1) * th;
    const shift = ((r * tl) % SHARD_PERIOD) * th;
    for (let x0 = -P * 2 + shift; x0 < mw + P; x0 += P) {
      for (const shape of [base, partner]) {
        const pts = shape.map(([x, y]) => [x0 + x, rowY + y] as [number, number]);
        const minX = Math.min(...pts.map((p) => p[0]));
        const maxX = Math.max(...pts.map((p) => p[0]));
        if (maxX < 0 || minX > mw) continue;
        const cx = pts.reduce((a, p) => a + p[0], 0) / 4;
        const cy = pts.reduce((a, p) => a + p[1], 0) / 4;
        const dx = cx - ix;
        const dy = cy - iy;
        const d = Math.hypot(dx, dy) || 1;
        pieces.push({
          pts: pts.map(([x, y]) => [x - cx, y - cy]),
          cx,
          cy,
          dist: d / maxD,
          dirX: dx / d,
          dirY: dy / d,
          r1: Math.random(),
          r2: Math.random(),
        });
      }
    }
  }
  return pieces;
}

export function Pattern() {
  const section = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const afterRef = useRef<HTMLParagraphElement>(null);
  const punchRef = useRef<HTMLParagraphElement>(null);
  const headRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const mockCanvas = document.createElement("canvas");
    const mctx = mockCanvas.getContext("2d")!;
    let W = 0, H = 0, dpr = 1;
    let mx = 0, my = 0, mw = 0, mh = 0;
    let ix = 0, iy = 0;
    let pieces: Piece[] = [];
    let progress = 0;
    let hitPlayed = false;
    let raf = 0;

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const narrow = W < 760;
      mw = narrow ? W * 0.92 : Math.min(W * 0.5, 900);
      mh = mw * (narrow ? 0.78 : 0.64);
      mx = narrow ? (W - mw) / 2 : W - mw - W * 0.06;
      my = narrow ? H * 0.42 : (H - mh) / 2 + H * 0.04;
      mockCanvas.width = Math.round(mw * dpr);
      mockCanvas.height = Math.round(mh * dpr);
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawMock(mctx, mw, mh, narrow);
      ix = mw * 0.3;
      iy = mh * 0.33;
      pieces = buildPieces(mw, mh, narrow ? 9 : 12, ix, iy);
      draw();
    };

    const shardPath = (c: CanvasRenderingContext2D, s: number) => {
      const pts = SHARD_POINTS.map(([x, y]) => [(x - 0.96) * s, (0.5 - y) * s]);
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
    };

    const draw = () => {
      const p = progress;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const reduced = scene.reducedMotion;

      if (p < P_HIT || reduced) {
        ctx.save();
        // Reduced motion: no smash, the template just fades as the answer arrives.
        if (reduced) ctx.globalAlpha = Math.min(1, Math.max(0, 1 - (p - 0.42) / 0.1));
        ctx.shadowColor = "rgba(0,0,0,0.18)";
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 18;
        ctx.drawImage(mockCanvas, mx, my, mw, mh);
        ctx.restore();
      } else {
        const g = mh * 2.4;
        for (const pc of pieces) {
          const crack = Math.min(1, Math.max(0, (p - P_HIT - pc.dist * 0.03) / 0.015));
          const delay = P_FALL + pc.dist * 0.15 + pc.r1 * 0.04;
          const tau = Math.max(0, p - delay) * 7;
          const v0 = (1.25 - pc.dist) * mh * 0.55;
          const ox = pc.dirX * (crack * 3 * (1 - pc.dist) + v0 * tau);
          const oy = pc.dirY * (crack * 3 * (1 - pc.dist) + v0 * tau) - mh * 0.3 * (1 - pc.dist) * tau + 0.5 * g * tau * tau;
          const x = mx + pc.cx + ox;
          const y = my + pc.cy + oy;
          if (y > H + mh * 0.3) continue;
          const rot = (pc.r2 - 0.5) * 7 * tau;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.beginPath();
          const k = crack > 0 ? 0.975 : 1;
          pc.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * k, py * k) : ctx.moveTo(px * k, py * k)));
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(mockCanvas, -pc.cx, -pc.cy, mw, mh);
          ctx.restore();
        }
      }

      // The red shard: thrown in, lodged, then dropped with the debris.
      if (!reduced && p > P_THROW) {
        const s = mh * 0.24;
        const tx = mx + ix, ty = my + iy;
        let x: number, y: number, rot: number;
        if (p < P_HIT) {
          const k = (p - P_THROW) / (P_HIT - P_THROW);
          const e = k * k;
          x = W + s * 1.5 + (tx - (W + s * 1.5)) * e;
          y = -s * 1.5 + (ty + s * 1.5) * e;
          rot = -2.6 + 2.9 * e;
        } else {
          const tau = Math.max(0, p - (P_FALL + 0.12)) * 7;
          x = tx + mh * 0.12 * tau;
          y = ty + 0.5 * mh * 2.4 * tau * tau;
          rot = 0.3 + tau * 2.5;
        }
        if (y < H + s * 2) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rot);
          ctx.shadowColor = "rgba(0,0,0,0.25)";
          ctx.shadowBlur = 24;
          ctx.shadowOffsetY = 10;
          shardPath(ctx, s);
          ctx.fillStyle = "#E8462A";
          ctx.fill();
          ctx.shadowColor = "transparent";
          const hl = ctx.createLinearGradient(-s, -s / 2, s, s / 2);
          hl.addColorStop(0, "rgba(255,255,255,0.28)");
          hl.addColorStop(0.5, "rgba(255,255,255,0)");
          ctx.fillStyle = hl;
          ctx.fill();
          ctx.restore();
        }
      }

      // Copy that arrives once the template is gone.
      const a = Math.min(1, Math.max(0, (p - 0.5) / 0.1));
      const b = Math.min(1, Math.max(0, (p - 0.64) / 0.12));
      if (afterRef.current) {
        afterRef.current.style.opacity = String(a);
        afterRef.current.style.transform = `translateY(${(1 - a) * 24}px)`;
      }
      if (punchRef.current) {
        punchRef.current.style.opacity = String(Math.min(1, b * 2));
        punchRef.current.style.fontStretch = `${50 + b * 62}%`;
      }
      // The question makes way for the answer.
      const h = Math.min(1, Math.max(0, (p - 0.44) / 0.12));
      if (headRef.current) {
        headRef.current.style.opacity = String(1 - h);
        headRef.current.style.transform = `translateY(${-h * 40}px)`;
      }
    };

    const loop = () => {
      draw();
      raf = 0;
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const st = ScrollTrigger.create({
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const prev = progress;
        progress = self.progress;
        if (prev < P_HIT && progress >= P_HIT && !hitPlayed && !scene.reducedMotion) {
          hitPlayed = true;
          sound.shatter();
        }
        if (progress < P_HIT - 0.04) hitPlayed = false;
        if (prev < P_THROW && progress >= P_THROW && progress < P_HIT) sound.whoosh(0.7, false, 0.8);
        sound.muffle(self.isActive && progress < P_HIT);
        request();
      },
      onToggle: (self) => {
        if (!self.isActive) sound.muffle(false);
      },
    });

    // Dark nav over this light section.
    const navST = ScrollTrigger.create({
      trigger: section.current,
      start: "top top+=36",
      end: "bottom top+=36",
      onToggle: (self) => {
        if (self.isActive) document.documentElement.dataset.nav = "light";
        else delete document.documentElement.dataset.nav;
      },
    });

    const ro = new ResizeObserver(build);
    ro.observe(canvas);
    build();

    return () => {
      st.kill();
      navST.kill();
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={section} data-scene="pattern" className="relative h-[340vh] bg-grout text-ink">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <h2
          ref={headRef}
          className="display absolute left-[var(--gutter)] top-[calc(var(--nav-h)+4vh)] z-10 max-w-[11ch] text-[clamp(42px,5.6vw,100px)] [font-stretch:80%]"
        >
          {pattern.heading}
        </h2>
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
        <div className="absolute inset-x-[var(--gutter)] bottom-[clamp(28px,7vh,72px)] z-10 grid gap-6 md:grid-cols-12 md:items-end">
          <p
            ref={punchRef}
            className="display text-[clamp(52px,8.6vw,156px)] leading-[0.84] opacity-0 md:col-span-8"
            style={{ fontStretch: "50%" }}
          >
            {pattern.punch}
          </p>
          <p
            ref={afterRef}
            className="max-w-[34ch] text-[clamp(18px,1.45vw,22px)] leading-[1.4] opacity-0 md:col-span-4 md:col-start-9 md:pb-3"
          >
            {pattern.after}
          </p>
        </div>
      </div>
    </section>
  );
}
