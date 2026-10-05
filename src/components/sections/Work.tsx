"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { work } from "@/content/site";
import { SHARD_PERIOD, SHARD_POINTS } from "@/lib/tiles";

// Deterministic pseudo-random so covers render identically on server and client.
function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const VB_W = 480;
const VB_H = 300;

/** Generative mosaic cover: a placeholder that still looks like it belongs to the studio. */
export function Cover({ hue, seed, on }: { hue: number; seed: number; on: boolean }) {
  const tiles = useMemo(() => {
    const rand = rng(seed + 1);
    const th = 24;
    const P = SHARD_PERIOD * th;
    const rows = Math.ceil(VB_H / th);
    const a = rand() * 6, b = rand() * 6;
    const out: { d: string; fill: string; delay: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const y0 = VB_H - (r + 1) * th;
      const shift = ((r * SHARD_POINTS[3][0]) % SHARD_PERIOD) * th;
      for (let x0 = -P * 2 + shift; x0 < VB_W + P; x0 += P) {
        for (let s = 0; s < 2; s++) {
          const pts = SHARD_POINTS.map(([x, y]) => {
            const px = s === 0 ? x * th : (SHARD_POINTS[1][0] + SHARD_POINTS[2][0]) * th - x * th;
            const py = s === 0 ? (1 - y) * th : y * th;
            return [x0 + px, y0 + py];
          });
          const cx = pts.reduce((m, p) => m + p[0], 0) / 4;
          const cy = pts.reduce((m, p) => m + p[1], 0) / 4;
          if (cx < -th || cx > VB_W + th) continue;
          const u = cx / VB_W, v = cy / VB_H;
          const field = Math.sin(u * 5 + a) * 0.5 + Math.sin(v * 4 + b + u * 2) * 0.5 + (rand() - 0.5) * 0.5;
          const l = 18 + (field + 1) * 24;
          const accent = rand() > 0.985;
          const fill = accent
            ? "#E8462A"
            : `hsl(${(hue + field * 18).toFixed(1)} ${(42 + field * 20).toFixed(1)}% ${l.toFixed(1)}%)`;
          out.push({
            d: `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L")} Z`,
            fill,
            delay: Math.round((u * 0.7 + v * 0.3) * 420 + rand() * 120),
          });
        }
      }
    }
    return out;
  }, [hue, seed]);

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block h-full w-full bg-black" aria-hidden>
      {tiles.map((t, i) => (
        <path
          key={i}
          d={t.d}
          fill={t.fill}
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            transform: on ? "scaleY(1)" : "scaleY(0)",
            transition: `transform 380ms cubic-bezier(0.7,0,0.2,1) ${on ? t.delay : 0}ms`,
          }}
        />
      ))}
    </svg>
  );
}

function InlineCover({ hue, seed }: { hue: number; seed: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.4 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="mb-4 aspect-[16/10] overflow-hidden rounded-[6px] md:hidden">
      <Cover hue={hue} seed={seed} on={on} />
    </div>
  );
}

export function Work() {
  const [hovered, setHovered] = useState<number | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const showing = useRef(false);
  useEffect(() => {
    showing.current = hovered !== null;
  }, [hovered]);

  useEffect(() => {
    const el = preview.current;
    if (!el) return;
    const pos = { x: 0, y: 0 }, target = { x: 0, y: 0 };
    let raf = 0;
    const move = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!showing.current) {
        // Park the card at the pointer so it appears in place, without per-frame writes.
        pos.x = target.x;
        pos.y = target.y;
        return;
      }
      pos.x += (target.x - pos.x) * 0.14;
      pos.y += (target.y - pos.y) * 0.14;
      const tilt = Math.max(-8, Math.min(8, (target.x - pos.x) * 0.08));
      el.style.transform = `translate3d(${pos.x + 28}px, ${pos.y - 120}px, 0) rotate(${tilt}deg)`;
    };
    window.addEventListener("pointermove", move, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section data-scene="work" className="relative px-[var(--gutter)] py-[16vh]">
      <div className="mb-12 grid gap-6 md:grid-cols-12 md:items-end">
        <h2 className="display text-[clamp(52px,9vw,160px)] [font-stretch:62%] md:col-span-7">{work.heading}</h2>
        <p className="max-w-[36ch] text-[17px] leading-[1.45] text-ash md:col-span-4 md:col-start-9">{work.note}</p>
      </div>

      <ul onPointerLeave={() => setHovered(null)}>
        {work.items.map((p, i) => (
          <li
            key={p.title}
            data-cursor
            onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(i)}
            className="group border-t border-white/15 py-6 last:border-b md:py-7"
          >
            <InlineCover hue={p.hue} seed={i} />
            <div className="grid items-baseline gap-2 md:grid-cols-12">
              <h3 className="display text-[clamp(36px,5.4vw,92px)] leading-[0.9] transition-[font-stretch,color] duration-500 ease-[var(--ease-out-quint)] [font-stretch:72%] group-hover:text-smalti md:col-span-7 md:group-hover:[font-stretch:118%]">
                {p.title}
              </h3>
              <p className="text-[15px] text-ash md:col-span-2">{p.kind}</p>
              <p className="text-[15px] text-ash md:col-span-1">{p.year}</p>
              <p className="text-[14px] text-chalk/70 md:col-span-2 md:text-right">{work.soon}</p>
            </div>
          </li>
        ))}
      </ul>

      <div
        ref={preview}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-40 hidden w-[340px] overflow-hidden rounded-[6px] transition-opacity duration-300 [@media(pointer:fine)]:md:block"
        style={{ opacity: hovered === null ? 0 : 1 }}
      >
        <div className="relative aspect-[16/10]">
          {work.items.map((p, i) => (
            <div key={p.title} className="absolute inset-0" style={{ zIndex: hovered === i ? 2 : 1 }}>
              <Cover hue={p.hue} seed={i} on={hovered === i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
