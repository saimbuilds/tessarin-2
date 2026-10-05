"use client";

import { hero } from "@/content/site";
import { useUI } from "@/lib/scene";

export function Hero() {
  const entered = useUI((s) => s.entered);
  const touch = useUI((s) => s.touch);

  return (
    <section data-scene="hero" className="relative h-[100svh] min-h-[560px]">
      {/* The tile wall spells this out visually; this is the real heading for everyone else. */}
      <h1 className="sr-only">{hero.heading}</h1>

      <div
        className="absolute inset-x-0 bottom-0 grid gap-5 px-[var(--gutter)] pb-[clamp(22px,4.5vh,44px)] transition-[opacity,transform] delay-[1500ms] duration-1000 ease-[var(--ease-out-quint)] md:grid-cols-[1fr_auto] md:items-end"
        style={{ opacity: entered ? 1 : 0, transform: entered ? "none" : "translateY(14px)" }}
      >
        <p className="max-w-[30ch] text-[clamp(19px,1.6vw,24px)] leading-[1.32] font-medium text-chalk md:max-w-[36ch]">
          {hero.intro}
        </p>
        <p className="flex items-center gap-3 text-[14px] text-ash md:justify-end">
          <span className="inline-block h-[7px] w-[14px] bg-smalti shard-clip" aria-hidden />
          {touch ? hero.hintTouch : hero.hintPointer}
        </p>
      </div>
    </section>
  );
}
