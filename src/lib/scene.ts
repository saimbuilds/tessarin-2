import { useSyncExternalStore } from "react";

// Formation ids shared by the tile shader and the scroll choreography.
export const FORM = { WALL: 0, WINDOW: 1, SPHERE: 2, RING: 3, CLOUD: 4 } as const;
export type Form = (typeof FORM)[keyof typeof FORM];

// Mutable, per-frame state. Read inside render loops; never drives React renders.
export const scene = {
  from: FORM.WALL as Form,
  to: FORM.WALL as Form,
  t: 0,
  alpha: 1,
  muffled: false,
  /** True while an opaque section fully covers the tile field. */
  covered: false,
  /** performance.now() when the visitor entered; -1 before. */
  enteredAt: -1,
  pointer: { x: 0, y: 0, active: false, lastMove: 0, vx: 0, vy: 0 },
  reducedMotion: false,
};

// Small React store for UI state.
type UIState = { entered: boolean; sound: boolean; loaded: number; touch: boolean };
let ui: UIState = { entered: false, sound: false, loaded: 0, touch: false };
const subs = new Set<() => void>();

export function setUI(patch: Partial<UIState>) {
  ui = { ...ui, ...patch };
  subs.forEach((s) => s());
}

export function getUI() {
  return ui;
}

export function subscribeUI(fn: () => void) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

const serverUI: UIState = { entered: false, sound: false, loaded: 0, touch: false };

export function useUI<T>(select: (s: UIState) => T): T {
  return useSyncExternalStore(
    subscribeUI,
    () => select(ui),
    () => select(serverUI),
  );
}
