"use client";

import { useEffect, useRef } from "react";
import { nav, site } from "@/content/site";
import { sound } from "@/lib/audio";
import { scrollToTarget } from "@/lib/lenis";
import { setUI, useUI } from "@/lib/scene";
import { Logo } from "./Logo";

const PROGRESS_TILES = 18;

function TileProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let last = -1;
    // Cache the page height; reading it every frame would force a layout.
    let max = 1;
    const measure = () => {
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      update();
    };
    const update = () => {
      const lit = Math.round(Math.min(1, window.scrollY / max) * PROGRESS_TILES);
      if (lit !== last && ref.current) {
        last = lit;
        Array.from(ref.current.children).forEach((c, i) => c.classList.toggle("is-lit", i < lit));
      }
    };
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    measure();
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, []);
  return (
    <div ref={ref} className="hidden items-center md:flex" aria-hidden>
      {Array.from({ length: PROGRESS_TILES }, (_, i) => (
        <span
          key={i}
          className="shard-clip -ml-[3px] h-[10px] w-[19px] bg-current opacity-25 transition-[opacity,background-color] duration-300 [&.is-lit]:bg-smalti [&.is-lit]:opacity-100"
          style={{ transform: i % 2 ? "rotate(180deg)" : undefined }}
        />
      ))}
    </div>
  );
}

function SoundToggle() {
  const on = useUI((s) => s.sound);
  useEffect(() => sound.subscribe((v) => setUI({ sound: v })), []);
  return (
    <button
      onClick={() => sound.toggle()}
      aria-pressed={on}
      className="flex h-10 items-center gap-2.5 rounded-full px-3 text-[14px] font-medium"
    >
      <span className="flex h-3 items-end gap-[2px]" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-[2px] origin-bottom bg-current"
            style={{
              height: "100%",
              animation: on ? `eq 0.${7 + i}s ease-in-out ${i * 0.1}s infinite alternate` : "none",
              transform: on ? undefined : "scaleY(0.25)",
            }}
          />
        ))}
      </span>
      {on ? nav.soundOn : nav.soundOff}
      <style>{`@keyframes eq{from{transform:scaleY(.2)}to{transform:scaleY(1)}}`}</style>
    </button>
  );
}

export function Nav() {
  const entered = useUI((s) => s.entered);
  return (
    <header
      className="nav fixed inset-x-0 top-0 z-50 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[130%] before:bg-gradient-to-b before:from-black/75 before:to-transparent before:transition-opacity before:duration-500 [html[data-nav=light]_&]:before:opacity-0 flex h-[var(--nav-h)] items-center justify-between px-[var(--gutter)] text-chalk transition-[opacity,color] duration-500"
      style={{ opacity: entered ? 1 : 0, pointerEvents: entered ? "auto" : "none" }}
    >
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          scrollToTarget(0);
        }}
        aria-label="Tessarin, back to top"
      >
        <Logo className="h-[18px] w-auto md:h-[21px]" />
      </a>
      <TileProgress />
      <div className="flex items-center gap-1 md:gap-3">
        <SoundToggle />
        <a
          href={site.bookingUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-10 items-center rounded-full bg-smalti px-5 text-[14px] font-medium text-black transition-transform hover:scale-[1.04]"
        >
          {nav.cta}
        </a>
      </div>
    </header>
  );
}
