"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { contact, site } from "@/content/site";
import { useUI } from "@/lib/scene";
import { Logo } from "../Logo";

const FooterPhysics = dynamic(() => import("../gl/FooterPhysics"), { ssr: false });

export function Contact() {
  const section = useRef<HTMLElement>(null);
  const wordmark = useRef<HTMLDivElement>(null);
  const touch = useUI((s) => s.touch);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setMounted(true);
      },
      { threshold: 0.25 },
    );
    if (section.current) io.observe(section.current);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={section}
      id="contact"
      data-scene="contact"
      className="relative flex min-h-[100svh] flex-col overflow-hidden px-[var(--gutter)] pt-[calc(var(--nav-h)+8vh)]"
    >
      <div className="absolute inset-0">
        {mounted && <FooterPhysics anchor={wordmark} active={visible} />}
      </div>

      <div className="relative z-10 grid gap-10 md:grid-cols-12 md:items-end">
        <h2 className="display text-[clamp(56px,10vw,184px)] leading-[0.84] [font-stretch:68%] md:col-span-8">
          {contact.heading.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </h2>
        <div className="md:col-span-4">
          <p className="max-w-[30ch] text-[clamp(18px,1.45vw,22px)] leading-[1.4]">{contact.body}</p>
          <a
            href={site.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-7 inline-flex h-14 items-center gap-3 rounded-full bg-smalti pl-7 pr-6 text-[17px] font-medium text-black transition-transform hover:scale-[1.03]"
          >
            {contact.cta}
            <span className="shard-clip inline-block h-[9px] w-[18px] bg-black" aria-hidden />
          </a>
          <p className="mt-5 text-[15px] text-ash">
            {contact.emailPrefix}{" "}
            <a href={`mailto:${site.email}`} className="text-chalk underline decoration-white/30 underline-offset-4 hover:decoration-smalti">
              {site.email}
            </a>
          </p>
        </div>
      </div>

      <p className="relative z-10 mt-10 text-[14px] text-ash" aria-hidden>
        {touch ? contact.hintTouch : contact.hintPointer}
      </p>

      <div className="relative mt-auto">
        <div className="pointer-events-none relative z-0 pt-[18vh]">
          <div ref={wordmark}>
            <Logo className="block h-auto w-full text-chalk" />
          </div>
        </div>
        <footer className="relative z-10 flex flex-col gap-4 border-t border-white/15 py-6 text-[14px] text-ash md:flex-row md:items-center md:justify-between">
          <nav aria-label="Social" className="flex flex-wrap gap-x-6 gap-y-2">
            {site.socials.map((s) => (
              <a key={s.label} href={s.href} className="text-chalk hover:text-smalti">
                {s.label}
              </a>
            ))}
          </nav>
          <p>
            © {new Date().getFullYear()} {site.name}. {contact.legal}
          </p>
        </footer>
      </div>
    </section>
  );
}
