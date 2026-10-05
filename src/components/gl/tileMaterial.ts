import * as THREE from "three";

export const vertexShader = /* glsl */ `
attribute float aSide;
attribute vec3 aWall;
attribute vec3 aWin;
attribute vec3 aSph;
attribute vec3 aRing;
attribute vec3 aRingN;
attribute vec3 aCloud;
attribute float aRot;
attribute vec4 aRand;
attribute vec2 aDyn; // x: flip 0..1, y: lift 0..1

uniform int uFrom;
uniform int uTo;
uniform float uT;
uniform float uArc;
uniform float uScale[5];
uniform vec3 uOff[5];
uniform mat3 uSpin[5];
uniform vec3 uWinN;

varying vec3 vN;
varying vec3 vPos;
varying float vSide;
varying vec4 vRand;
varying float vLift;

void formation(int f, out vec3 p, out vec3 n, out float s) {
  if (f == 0) { p = aWall; n = vec3(0.0, 0.0, 1.0); p = uSpin[0] * p; n = uSpin[0] * n; p += uOff[0]; s = uScale[0]; }
  else if (f == 1) { p = aWin; n = uWinN; p = uSpin[1] * p; n = uSpin[1] * n; p += uOff[1]; s = uScale[1]; }
  else if (f == 2) { p = aSph; n = normalize(aSph); p = uSpin[2] * p; n = uSpin[2] * n; p += uOff[2]; s = uScale[2]; }
  else if (f == 3) { p = aRing; n = aRingN; p = uSpin[3] * p; n = uSpin[3] * n; p += uOff[3]; s = uScale[3]; }
  else { p = aCloud; n = normalize(aRand.xyz * 2.0 - 1.0 + vec3(0.0, 0.0, 0.6)); p = uSpin[4] * p; n = uSpin[4] * n; p += uOff[4]; s = uScale[4] * (0.6 + aRand.y * 0.8); }
}

void main() {
  float e = clamp(uT * 1.6 - aRand.w * 0.6, 0.0, 1.0);
  e = e * e * (3.0 - 2.0 * e);
  float fly = sin(e * 3.14159265);

  vec3 pA; vec3 nA; float sA;
  vec3 pB; vec3 nB; float sB;
  formation(uFrom, pA, nA, sA);
  formation(uTo, pB, nB, sB);

  vec3 rdir = normalize(aRand.zxy * 2.0 - 1.0 + 1e-3);
  vec3 p = mix(pA, pB, e) + rdir * fly * (1.0 + aRand.y * 2.5) * uArc;
  vec3 n = normalize(mix(nA, nB, e) + 1e-4);
  float s = mix(sA, sB, e);

  vec3 up = abs(n.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 T = normalize(cross(up, n));
  vec3 B = cross(n, T);
  float rot = aRot + fly * (aRand.x - 0.5) * 7.0;
  float cr = cos(rot), sr = sin(rot);
  vec3 T2 = cr * T + sr * B;
  vec3 B2 = -sr * T + cr * B;

  float phi = aDyn.x * 3.14159265 + fly * (aRand.z - 0.5) * 5.0 + aDyn.y * 0.35;
  float cp = cos(phi), sp = sin(phi);
  vec3 v = position;
  vec3 lv = vec3(v.x, v.y * cp - v.z * sp, v.y * sp + v.z * cp);
  vec3 ln = vec3(normal.x, normal.y * cp - normal.z * sp, normal.y * sp + normal.z * cp);

  p += n * aDyn.y * s * 1.6;
  vec3 wp = p + s * (lv.x * T2 + lv.y * B2 + lv.z * n);
  vN = normalize(ln.x * T2 + ln.y * B2 + ln.z * n);
  vPos = wp;
  vSide = aSide;
  vRand = aRand;
  vLift = aDyn.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
uniform vec3 uLightPos;
uniform float uLightI;
uniform float uAlpha;
uniform vec3 uRed;
uniform vec3 uGraphite;
uniform float uFogNear;
uniform float uFogFar;

varying vec3 vN;
varying vec3 vPos;
varying float vSide;
varying vec4 vRand;
varying float vLift;

void main() {
  vec3 n = normalize(vN);
  vec3 V = normalize(cameraPosition - vPos);
  bool back = vSide < -0.5;
  bool edge = abs(vSide) < 0.5;

  // Real smalti varies tile to tile; so do these.
  vec3 base = back ? uRed * (0.78 + vRand.y * 0.34) : uGraphite * (0.7 + vRand.y * 0.6);
  if (edge) base = back ? uRed * 0.5 : vec3(0.05);

  vec3 L1 = normalize(vec3(-0.45, 0.75, 0.9));
  float dif = max(dot(n, L1), 0.0) * 0.42 + 0.14;
  float sp1 = pow(max(dot(n, normalize(L1 + V)), 0.0), 40.0) * 0.1;

  vec3 Lp = uLightPos - vPos;
  float dist = length(Lp);
  Lp /= dist;
  float att = uLightI / (1.0 + dist * dist * 0.18);
  float dif2 = max(dot(n, Lp), 0.0) * att;
  float sp2 = pow(max(dot(n, normalize(Lp + V)), 0.0), 120.0) * att * 1.1;

  float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);
  vec3 tint = back ? vec3(1.0, 0.82, 0.74) : vec3(0.9, 0.93, 1.0);
  vec3 col = base * (dif + dif2 * 1.1) + tint * (sp1 + sp2) + fres * 0.05;
  if (edge) col += vec3(0.25) * pow(max(dot(n, Lp), 0.0), 8.0) * att;

  float d = length(cameraPosition - vPos);
  col *= 1.0 - smoothstep(uFogNear, uFogFar, d);
  col *= uAlpha;
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}
`;

const toLinear = (hex: string) => new THREE.Color(hex);

export function createTileMaterial() {
  const ident = () => new THREE.Matrix3();
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uFrom: { value: 0 },
      uTo: { value: 0 },
      uT: { value: 0 },
      uArc: { value: 1 },
      uScale: { value: [1, 1, 1, 1, 1] },
      uOff: { value: [0, 1, 2, 3, 4].map(() => new THREE.Vector3()) },
      uSpin: { value: [ident(), ident(), ident(), ident(), ident()] },
      uWinN: { value: new THREE.Vector3(0, 0, 1) },
      uLightPos: { value: new THREE.Vector3(0, 0, 3) },
      uLightI: { value: 1 },
      uAlpha: { value: 1 },
      // THREE.Color converts sRGB hex to linear, matching the manual gamma in the shader.
      uRed: { value: toLinear("#E8462A") },
      uGraphite: { value: toLinear("#232325") },
      uFogNear: { value: 21 },
      uFogFar: { value: 36 },
    },
  });
}
