"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { studio } from "@/content/site";
import { scene } from "@/lib/scene";

gsap.registerPlugin(ScrollTrigger);

export function Studio() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (scene.reducedMotion) return;
    const ctx = gsap.context(() => {
      // Each headline line stretches open as it travels up the screen.
      gsap.utils.toArray<HTMLElement>("[data-stretch]").forEach((line) => {
        gsap.fromTo(
          line,
          { fontStretch: "50%" },
          {
            fontStretch: line.dataset.stretch === "wide" ? "125%" : "100%",
            ease: "none",
            scrollTrigger: { trigger: line, start: "top bottom", end: "top 30%", scrub: true },
          },
        );
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      data-scene="studio"
      className="relative px-[var(--gutter)] pb-[18vh] pt-[22vh]"
    >
      <h2 className="display text-[clamp(46px,7.4vw,150px)] leading-[0.86]">
        <span data-stretch className="block md:whitespace-nowrap">
          {studio.heading[0]}
        </span>
        <span data-stretch="wide" className="block md:whitespace-nowrap text-right">
          {studio.heading[1]}
        </span>
      </h2>
      <div className="mt-[12vh] grid gap-8 md:grid-cols-12">
        <div className="space-y-6 text-[clamp(18px,1.45vw,22px)] leading-[1.45] text-chalk md:col-span-5 md:col-start-7">
          {studio.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
