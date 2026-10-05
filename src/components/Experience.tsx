"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import dynamic from "next/dynamic";
import { useEffect, type ReactNode } from "react";
import { sound } from "@/lib/audio";
import { measureSections } from "@/lib/choreography";
import { setLenis } from "@/lib/lenis";
import { getUI, scene, setUI, subscribeUI } from "@/lib/scene";
import { Cursor } from "./Cursor";
import { Nav } from "./Nav";
import { Preloader } from "./Preloader";

const GLCanvas = dynamic(() => import("./gl/GLCanvas"), { ssr: false });

gsap.registerPlugin(ScrollTrigger);

export function Experience({ children }: { children: ReactNode }) {
  useEffect(() => {
    scene.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setUI({ touch: window.matchMedia("(pointer: coarse)").matches });
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    let lenis: Lenis | null = null;
    const raf = (time: number) => lenis?.raf(time * 1000);
    if (!scene.reducedMotion) {
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      if (!getUI().entered) lenis.stop();
      setLenis(lenis);
    }
    const lockNative = () => {
      document.documentElement.style.overflow = getUI().entered ? "" : "hidden";
    };
    lockNative();

    // Pointer, normalised to -1..1 with y up, shared with the WebGL scene.
    let lx = 0, ly = 0;
    const move = (x: number, y: number) => {
      const p = scene.pointer;
      p.vx = x - lx;
      p.vy = y - ly;
      lx = x;
      ly = y;
      p.x = (x / window.innerWidth) * 2 - 1;
      p.y = -((y / window.innerHeight) * 2 - 1);
      p.active = true;
      p.lastMove = performance.now();
    };
    const onPointer = (e: PointerEvent) => move(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) move(t.clientX, t.clientY);
    };
    const onLeave = () => (scene.pointer.active = false);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    // Interface sounds: a tick on hover, a tap on press.
    let lastHover: Element | null = null;
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest("a, button, [data-sound-hover]") ?? null;
      if (el && el !== lastHover) sound.hover();
      lastHover = el;
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest("a, button")) sound.press();
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("click", onClick);

    // Section geometry for the scroll choreography.
    const measure = () => measureSections();
    measure();
    ScrollTrigger.addEventListener("refresh", measure);
    const ro = new ResizeObserver(() => {
      measure();
      ScrollTrigger.refresh();
    });
    ro.observe(document.body);
    document.fonts.ready.then(() => {
      measure();
      ScrollTrigger.refresh();
    });

    const unsub = subscribeUI(lockNative);

    return () => {
      unsub();
      ro.disconnect();
      ScrollTrigger.removeEventListener("refresh", measure);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchstart", onTouch);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(raf);
      lenis?.destroy();
      setLenis(null);
    };
  }, []);

  return (
    <>
      <GLCanvas />
      <Preloader />
      <Nav />
      <Cursor />
      <div className="grain" aria-hidden />
      <div id="top" className="relative z-10">
        {children}
      </div>
    </>
  );
}
