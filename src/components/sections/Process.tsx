"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { process } from "@/content/site";
import { scene } from "@/lib/scene";

gsap.registerPlugin(ScrollTrigger);

export function Process() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (scene.reducedMotion) return;
    const ctx = gsap.context(() => {
      // The rule above each step draws in, left to right, in order.
      gsap.fromTo(
        "[data-rule]",
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "expo.out",
          duration: 1.2,
          stagger: 0.15,
          scrollTrigger: { trigger: root.current, start: "top 70%" },
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} data-scene="process" className="relative px-[var(--gutter)] py-[14vh]">
      <h2 className="display mb-14 text-[clamp(44px,6vw,104px)] [font-stretch:62%]">{process.heading}</h2>
      <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {process.steps.map((s, i) => (
          <li key={s.name} className="relative pt-6">
            <span data-rule className="absolute inset-x-0 top-0 block h-px origin-left bg-white/25" aria-hidden />
            <span className="display block text-[clamp(64px,7vw,120px)] leading-[0.8] text-smalti [font-stretch:130%]" aria-hidden>
              {i + 1}
            </span>
            <h3 className="mt-6 text-[20px] font-medium">{s.name}</h3>
            <p className="mt-2 max-w-[32ch] text-[16px] leading-[1.5] text-ash">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
