"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { services } from "@/content/site";
import { sound } from "@/lib/audio";
import { scrollToTarget } from "@/lib/lenis";
import { scene } from "@/lib/scene";

gsap.registerPlugin(ScrollTrigger);

// Where each service's formation is fully formed (matches choreography holds).
const STOPS = [0.1, 0.5, 0.9];
const SWITCH = [0.32, 0.68];

export function Services() {
  const root = useRef<HTMLElement>(null);
  const detail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let current = 0;
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        const p = self.progress;
        const idx = p < SWITCH[0] ? 0 : p < SWITCH[1] ? 1 : 2;
        if (idx !== current) {
          current = idx;
          setActive(idx);
          sound.whoosh(1.1, idx > 0);
        }
      },
    });
    return () => st.kill();
  }, []);

  useEffect(() => {
    if (!detail.current || scene.reducedMotion) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-name]",
        { fontStretch: "50%", opacity: 0 },
        { fontStretch: "100%", opacity: 1, duration: 0.9, ease: "expo.out" },
      );
      gsap.fromTo(
        "[data-reveal]",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.05, delay: 0.1 },
      );
    }, detail);
    return () => ctx.revert();
  }, [active]);

  const goTo = (i: number) => {
    const el = root.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollToTarget(top + STOPS[i] * (el.offsetHeight - window.innerHeight));
  };

  const item = services.items[active];

  return (
    <section ref={root} data-scene="services" className="relative h-[420vh]" aria-label={services.heading}>
      <div className="sticky top-0 flex h-[100svh] flex-col justify-end px-[var(--gutter)] pb-[clamp(24px,5vh,56px)] md:justify-center md:pb-0">
        {/* Fade the tile shapes under the copy on small screens. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-black from-55% via-black/80 to-transparent md:hidden" />
        <div className="relative md:w-[46%]">
          <h2 className="mb-4 text-[15px] text-ash md:mb-6">{services.heading}</h2>
          <div className="mb-6 flex flex-wrap gap-1.5 md:mb-8 md:gap-2" role="tablist" aria-label={services.heading}>
            {services.items.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === active}
                onClick={() => goTo(i)}
                className={`h-8 rounded-full border px-3 text-[13px] font-medium transition-colors md:h-9 md:px-4 md:text-[14px] ${
                  i === active ? "border-smalti bg-smalti text-black" : "border-white/20 text-chalk hover:border-white/60"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div ref={detail} key={item.id} role="tabpanel">
            <h3 data-name className="display text-[clamp(40px,6.2vw,108px)] leading-[0.86]">
              {item.name}
            </h3>
            <p data-reveal className="mt-6 max-w-[40ch] text-[clamp(17px,1.35vw,20px)] leading-[1.45] text-chalk/90">
              {item.body}
            </p>
            <ul className="mt-5 hidden max-w-[40ch] gap-x-6 gap-y-1.5 text-[15px] text-ash sm:grid sm:grid-cols-2">
              {item.list.map((l) => (
                <li data-reveal key={l} className="flex items-center gap-2.5">
                  <span className="shard-clip inline-block h-[6px] w-[12px] shrink-0 bg-smalti" aria-hidden />
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
