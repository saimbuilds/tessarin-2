import { FORM, scene, type Form } from "./scene";

// Maps scroll position to what the tile field is doing. Sections opt in with
// data-scene="hero" | "studio" | "services" | "work" | "contact".

type Box = { top: number; height: number };
const boxes: Record<string, Box> = {};

// Cached viewport values, so the render loop never forces a layout read.
const view = { y: 0, vh: 1 };
if (typeof window !== "undefined") {
  const sync = () => {
    view.y = window.scrollY;
    view.vh = window.innerHeight;
  };
  sync();
  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
}

export function measureSections() {
  view.y = window.scrollY;
  view.vh = window.innerHeight;
  const y = view.y;
  document.querySelectorAll<HTMLElement>("[data-scene]").forEach((el) => {
    const r = el.getBoundingClientRect();
    boxes[el.dataset.scene!] = { top: r.top + y, height: r.height };
  });
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);
const range = (y: number, a: number, b: number) => clamp01((y - a) / (b - a));

function set(from: Form, to: Form, t: number, alpha: number) {
  scene.from = from;
  scene.to = to;
  scene.t = t;
  scene.alpha = alpha;
}

/** Progress (0..1) through the pinned services section, or -1 outside it. */
export function servicesProgress() {
  const s = boxes.services;
  if (!s) return -1;
  const y = view.y;
  const vh = view.vh;
  if (y < s.top || y > s.top + s.height - vh) return -1;
  return (y - s.top) / (s.height - vh);
}

export function updateChoreography() {
  const y = view.y;
  const vh = view.vh;
  const { hero, studio, services, work, contact, pattern } = boxes;
  scene.covered = !!pattern && y >= pattern.top && y <= pattern.top + pattern.height - vh;
  if (!hero || !services || !work) {
    set(FORM.WALL, FORM.WALL, 0, 1);
    return;
  }

  if (y < hero.top + hero.height) {
    const t = smooth(range(y, hero.height * 0.06, hero.height * 0.85));
    set(FORM.WALL, FORM.CLOUD, t, 1);
    return;
  }

  if (y < services.top - vh) {
    // Pattern and studio sections: a dim drift behind the copy.
    const a = studio ? 0.5 : 0.5;
    set(FORM.CLOUD, FORM.CLOUD, 1, a);
    return;
  }

  if (y < services.top) {
    const t = range(y, services.top - vh, services.top);
    set(FORM.CLOUD, FORM.WINDOW, smooth(t), 0.5 + 0.5 * t);
    return;
  }

  const end = services.top + services.height - vh;
  if (y <= end) {
    const p = (y - services.top) / (services.height - vh);
    if (p < 0.22) set(FORM.WINDOW, FORM.WINDOW, 0, 1);
    else if (p < 0.42) set(FORM.WINDOW, FORM.SPHERE, smooth((p - 0.22) / 0.2), 1);
    else if (p < 0.58) set(FORM.SPHERE, FORM.SPHERE, 0, 1);
    else if (p < 0.78) set(FORM.SPHERE, FORM.RING, smooth((p - 0.58) / 0.2), 1);
    else set(FORM.RING, FORM.RING, 0, 1);
    return;
  }

  if (y < work.top) {
    const t = range(y, end, work.top);
    set(FORM.RING, FORM.CLOUD, smooth(t), 1 - 0.6 * t);
    return;
  }

  let alpha = 0.4;
  if (contact) alpha = 0.4 * (1 - range(y, contact.top - vh, contact.top - vh * 0.4));
  set(FORM.CLOUD, FORM.CLOUD, 1, alpha);
}
