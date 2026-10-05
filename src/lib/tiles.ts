import * as THREE from "three";

// The red shard from the Tessarin "r", in units where its height is 1 (y up).
// Paired with a copy rotated 180°, it tessellates the plane.
const BL: [number, number] = [0, 0];
const BR: [number, number] = [119 / 168, 0];
const TR: [number, number] = [324 / 168, 1];
const TL: [number, number] = [144 / 168, 1];
export const SHARD_POINTS = [BL, BR, TR, TL];
export const SHARD_PERIOD = BR[0] + TR[0] - TL[0]; // width of an upright + inverted pair
export const SHARD_AREA = ((BR[0] - BL[0]) + (TR[0] - TL[0])) / 2;

export function polygonCentroid(pts: [number, number][]) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  a *= 0.5;
  return [cx / (6 * a), cy / (6 * a)] as [number, number];
}

export const SHARD_CENTROID = polygonCentroid(SHARD_POINTS);
// Centroid of the inverted partner tile, relative to the same pair origin.
export const SHARD_PARTNER_CENTROID: [number, number] = [
  BR[0] + TR[0] - SHARD_CENTROID[0],
  1 - SHARD_CENTROID[1],
];

/** A thin slab in the shard shape, centred on its centroid. aSide: 1 front, -1 back, 0 edge. */
export function makeTileGeometry(depth = 0.1) {
  const [cx, cy] = SHARD_CENTROID;
  const pts = SHARD_POINTS.map(([x, y]) => [x - cx, y - cy]);
  const z = depth / 2;
  const pos: number[] = [];
  const nor: number[] = [];
  const side: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[], s: number) => {
    for (const v of [a, b, c, a, c, d]) {
      pos.push(...v);
      nor.push(...n);
      side.push(s);
    }
  };
  const [p0, p1, p2, p3] = pts;
  quad([p0[0], p0[1], z], [p1[0], p1[1], z], [p2[0], p2[1], z], [p3[0], p3[1], z], [0, 0, 1], 1);
  quad([p0[0], p0[1], -z], [p3[0], p3[1], -z], [p2[0], p2[1], -z], [p1[0], p1[1], -z], [0, 0, -1], -1);
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey);
    const n = [ey / len, -ex / len, 0];
    quad([a[0], a[1], -z], [b[0], b[1], -z], [b[0], b[1], z], [a[0], a[1], z], n, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  return g;
}

export type Layout = {
  count: number;
  wallW: number;
  wallH: number;
  tileH: number;
  wall: Float32Array; // centres on the wall, z = 0
  rot: Float32Array; // 0 upright, PI inverted
  uv: Float32Array; // 0..1 across the wall, for sampling masks
  window: Float32Array; // wall shrunk into a tilted "browser window", centred on origin
  windowNormal: THREE.Vector3;
  windowScale: number;
  sphere: Float32Array;
  sphereScale: number;
  ring: Float32Array;
  ringNormal: Float32Array;
  ringAngles: Float32Array; // u, v per tile for procedural patterns
  ringScale: number;
  cloud: Float32Array;
  rand: Float32Array; // 4 per tile
};

function shuffle(n: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Lay the shards out as a wall covering wallW × wallH, plus every other formation. */
export function buildLayout(wallW: number, wallH: number, rows: number, portrait: boolean): Layout {
  const h = wallH / rows;
  const P = SHARD_PERIOD * h;
  const pairs = Math.ceil(wallW / P) + 2;
  const count = rows * pairs * 2;

  const wall = new Float32Array(count * 3);
  const rot = new Float32Array(count);
  const uv = new Float32Array(count * 2);
  const rand = new Float32Array(count * 4);
  for (let i = 0; i < rand.length; i++) rand[i] = Math.random();

  let i = 0;
  for (let r = 0; r < rows; r++) {
    // Shift each row so the slanted grout lines run on unbroken across rows.
    const shift = ((r * TL[0]) % SHARD_PERIOD) * h;
    const x0 = -wallW / 2 - P + shift;
    const y0 = -wallH / 2 + r * h;
    for (let k = 0; k < pairs; k++) {
      for (let s = 0; s < 2; s++) {
        const c = s === 0 ? SHARD_CENTROID : SHARD_PARTNER_CENTROID;
        const x = x0 + k * P + c[0] * h;
        const y = y0 + c[1] * h;
        wall[i * 3] = x;
        wall[i * 3 + 1] = y;
        wall[i * 3 + 2] = 0;
        rot[i] = s === 0 ? 0 : Math.PI;
        uv[i * 2] = (x + wallW / 2) / wallW;
        uv[i * 2 + 1] = (y + wallH / 2) / wallH;
        i++;
      }
    }
  }

  // Browser window (or phone screen on portrait): the same tessellation, shrunk and tilted.
  const winScale = portrait ? 0.4 : 0.43;
  const winRot = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler(portrait ? -0.18 : -0.1, portrait ? -0.32 : -0.42, 0, "YXZ"),
  );
  const window = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let j = 0; j < count; j++) {
    v.set(wall[j * 3] * winScale, wall[j * 3 + 1] * winScale, 0).applyMatrix4(winRot);
    window[j * 3] = v.x;
    window[j * 3 + 1] = v.y;
    window[j * 3 + 2] = v.z;
  }
  const windowNormal = new THREE.Vector3(0, 0, 1).applyMatrix4(winRot).normalize();

  // Sphere (AI): Fibonacci distribution, assigned to tiles in random order.
  const R = portrait ? wallW * 0.28 : wallH * 0.3;
  const sphere = new Float32Array(count * 3);
  const sOrder = shuffle(count);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let j = 0; j < count; j++) {
    const y = 1 - (j / (count - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * j;
    const t = sOrder[j];
    sphere[t * 3] = Math.cos(th) * rad * R;
    sphere[t * 3 + 1] = y * R;
    sphere[t * 3 + 2] = Math.sin(th) * rad * R;
  }
  const sphereScale = Math.sqrt((4 * Math.PI * R * R) / count / SHARD_AREA) * 0.86;

  // Ring (emerging tech): a torus portal facing the camera.
  const RR = portrait ? wallW * 0.25 : wallH * 0.27;
  const rr = RR * 0.3;
  const nu = Math.round(Math.sqrt((count * RR) / rr));
  const nv = Math.ceil(count / nu);
  const cells = shuffle(nu * nv).slice(0, count);
  const ring = new Float32Array(count * 3);
  const ringNormal = new Float32Array(count * 3);
  const ringAngles = new Float32Array(count * 2);
  const rOrder = shuffle(count);
  for (let j = 0; j < count; j++) {
    const cell = cells[j];
    const u = ((cell % nu) / nu) * Math.PI * 2;
    const vv = (Math.floor(cell / nu) / nv) * Math.PI * 2;
    const t = rOrder[j];
    ring[t * 3] = (RR + rr * Math.cos(vv)) * Math.cos(u);
    ring[t * 3 + 1] = (RR + rr * Math.cos(vv)) * Math.sin(u);
    ring[t * 3 + 2] = rr * Math.sin(vv);
    ringNormal[t * 3] = Math.cos(vv) * Math.cos(u);
    ringNormal[t * 3 + 1] = Math.cos(vv) * Math.sin(u);
    ringNormal[t * 3 + 2] = Math.sin(vv);
    ringAngles[t * 2] = u;
    ringAngles[t * 2 + 1] = vv;
  }
  const ringScale = Math.sqrt((4 * Math.PI * Math.PI * RR * rr) / (nu * nv) / SHARD_AREA) * 0.9;

  // Cloud: a loose drift of tiles through deep space.
  const cloud = new Float32Array(count * 3);
  for (let j = 0; j < count; j++) {
    const a = Math.random() * Math.PI * 2;
    const rad = Math.pow(Math.random(), 0.6);
    cloud[j * 3] = Math.cos(a) * rad * wallW * 0.75;
    cloud[j * 3 + 1] = Math.sin(a) * rad * wallH * 0.75;
    cloud[j * 3 + 2] = -2 - Math.random() * 12;
  }

  return {
    count,
    wallW,
    wallH,
    tileH: h,
    wall,
    rot,
    uv,
    window,
    windowNormal,
    windowScale: winScale,
    sphere,
    sphereScale,
    ring,
    ringNormal,
    ringAngles,
    ringScale,
    cloud,
    rand,
  };
}

// ---------- masks: which tiles show their red back ----------

const STRETCHES = [
  "ultra-condensed",
  "extra-condensed",
  "condensed",
  "semi-condensed",
  "normal",
  "semi-expanded",
  "expanded",
  "extra-expanded",
] as const;

/** Rasterise the hero lines (each stretched to full width) and sample one value per tile. */
export function textMask(layout: Layout, lines: string[], fontFamily: string, portrait: boolean) {
  const res = 6;
  const cw = Math.max(64, Math.round((layout.wallW / layout.tileH) * res));
  const ch = Math.max(64, Math.round((layout.wallH / layout.tileH) * res));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";

  // Leave room for the nav above and the intro copy below.
  const top = ch * (portrait ? 0.17 : 0.13);
  const bottom = ch * (portrait ? 0.66 : 0.76);
  const marginX = cw * (portrait ? 0.07 : 0.06);
  const gap = (bottom - top) * 0.06;
  const lineH = (bottom - top - gap * (lines.length - 1)) / lines.length;
  const fontPx = lineH / 0.72; // cap height of Anybody is roughly 0.72 em

  lines.forEach((line, idx) => {
    const target = cw - marginX * 2;
    // Pick the width setting that gets closest, then scale exactly to fill the line.
    let best: { stretch: CanvasFontStretch; w: number } = { stretch: "normal", w: 1 };
    let bestDiff = Infinity;
    for (const stretch of STRETCHES) {
      ctx.fontStretch = stretch;
      ctx.font = `900 ${fontPx}px ${fontFamily}`;
      const w = ctx.measureText(line).width;
      const diff = Math.abs(Math.log(target / w));
      if (diff < bestDiff) {
        bestDiff = diff;
        best = { stretch, w };
      }
    }
    ctx.fontStretch = best.stretch;
    ctx.font = `900 ${fontPx}px ${fontFamily}`;
    const baseline = top + lineH * (idx + 1) + gap * idx;
    ctx.save();
    ctx.translate(marginX, baseline);
    ctx.scale(target / best.w, 1);
    ctx.fillText(line, 0, 0);
    ctx.restore();
  });

  return sampleMask(layout, ctx, cw, ch);
}

export function sampleMask(layout: Layout, ctx: CanvasRenderingContext2D, cw: number, ch: number, out?: Float32Array) {
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const mask = out ?? new Float32Array(layout.count);
  const sx = (layout.tileH / layout.wallW) * cw * 0.22;
  const sy = (layout.tileH / layout.wallH) * ch * 0.22;
  for (let i = 0; i < layout.count; i++) {
    const u = layout.uv[i * 2];
    const v = layout.uv[i * 2 + 1];
    let sum = 0;
    for (const [ox, oy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const x = Math.round(u * cw + ox * sx);
      const y = Math.round((1 - v) * ch + oy * sy);
      if (x < 0 || y < 0 || x >= cw || y >= ch) continue;
      sum += data[(y * cw + x) * 4];
    }
    mask[i] = sum / (5 * 255) > 0.5 ? 1 : 0;
  }
  return mask;
}
