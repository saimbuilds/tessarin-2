"use client";

import { useEffect, useRef } from "react";
import { useUI } from "@/lib/scene";

/** A small red shard that trails the pointer and leans into its direction of travel. */
export function Cursor() {
  const entered = useUI((s) => s.entered);
  const touch = useUI((s) => s.touch);
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (touch) return;
    const node = el.current;
    if (!node) return;
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let angle = 0;
    let scale = 1;
    let hover = false;
    let down = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      const t = e.target as Element | null;
      hover = !!t?.closest("a, button, [data-cursor]");
    };
    const onDown = () => (down = true);
    const onUp = () => (down = false);
    const tick = () => {
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      pos.x += dx * 0.28;
      pos.y += dy * 0.28;
      const speed = Math.hypot(dx, dy);
      if (speed > 1.5) {
        const a = Math.atan2(dy, dx) * (180 / Math.PI);
        let diff = ((a - angle + 540) % 360) - 180;
        diff = Math.max(-25, Math.min(25, diff));
        angle += diff * 0.25;
      }
      const goal = (hover ? 2.4 : 1) * (down ? 0.75 : 1);
      scale += (goal - scale) * 0.2;
      const stretch = 1 + Math.min(speed / 60, 0.8);
      // Nothing moving: skip the style write.
      if (speed < 0.05 && Math.abs(goal - scale) < 0.001) {
        raf = requestAnimationFrame(tick);
        return;
      }
      node.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${angle}deg) scale(${scale * stretch}, ${scale / Math.sqrt(stretch)})`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [touch]);

  if (touch) return null;

  return (
    <div
      ref={el}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[90] -ml-[11px] -mt-[6px] hidden [@media(pointer:fine)]:block"
      style={{ opacity: entered ? 1 : 0 }}
    >
      <svg width="22" height="12" viewBox="0 0 324 168">
        <path d="M0 168 L119 168 L324 0 L144 0 Z" fill="#E8462A" stroke="#000" strokeWidth="10" />
      </svg>
    </div>
  );
}
