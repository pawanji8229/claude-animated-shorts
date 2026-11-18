// Sky / open-water dome, the sea surface (seen from above AND below), underwater sun shafts, marine snow and
// bubbles. All pure functions of (camera, time); nothing is spawned or removed per frame — distant elements fade
// in by distance so the camera never sees anything pop.
import React, { useMemo } from "react";
import * as THREE from "three";
import { SKY_GLSL, SCATTER } from "./water";
import { height, SUN_DIR } from "./geo";
import { once } from "../short3/kit";
import type { V3 } from "../../lib/math";

const SUN = new THREE.Vector3(...SUN_DIR);

// ---------------------------------------------------------------- dome
const domeMat = () => new THREE.ShaderMaterial({
  uniforms: { uSun: { value: SUN }, uScatter: { value: SCATTER.clone() } }, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; gl_Position.z = gl_Position.w * 0.99999; }`,
  fragmentShader: `${SKY_GLSL}
uniform vec3 uScatter; varying vec3 vW;
void main(){ vec3 d = normalize(vW - cameraPosition);
  vec3 c = cameraPosition.y < 0.0 ? deepCol(d, uScatter) : skyCol(d);
  if (cameraPosition.y >= 0.0 && d.y < 0.0) c = mix(vec3(0.70, 0.84, 0.95) * 1.25, vec3(0.08, 0.25, 0.36), smoothstep(0.0, 0.25, -d.y));
  gl_FragColor = vec4(c, 1.0); }`,
});
export const Dome: React.FC<{ cam: V3; scatter?: THREE.Color }> = ({ cam, scatter }) => {
  const m = useMemo(() => once("poDome", domeMat), []); if (scatter) (m.uniforms.uScatter.value as THREE.Color).copy(scatter);
  return <mesh position={cam} material={m} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[9000, 48, 24]} /></mesh>;
};

// ---------------------------------------------------------------- surface
const DEP = { x0: -260, z0: -360, w: 520, h: 520, n: 520 };
const depthTex = () => {
  const d = new Uint8Array(DEP.n * DEP.n * 4);
  for (let j = 0; j < DEP.n; j++) for (let i = 0; i < DEP.n; i++) {
    const x = DEP.x0 + (i + 0.5) * DEP.w / DEP.n, z = DEP.z0 + (j + 0.5) * DEP.h / DEP.n, y = height(x, z), q = (j * DEP.n + i) * 4;
    const v = Math.max(0, Math.min(255, Math.round((y + 20) * 8)));   // 1/8 m steps, -20..+11.9 m
    d[q] = v; d[q + 1] = v; d[q + 2] = v; d[q + 3] = 255;
  }
  const t = new THREE.DataTexture(d, DEP.n, DEP.n, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
};
/** one mesh: 0.4 m cells within ±90 m of the action, geometric growth to ±14 km (no seams, no overlapping planes) */
const surfGeo = () => {
  const axis = (c: number) => { const v: number[] = []; for (let x = -90; x <= 90 + 1e-6; x += 0.4) v.push(c + x); let s = 0.4, x = 90; while (x < 14000) { s *= 1.12; x += s; v.push(c + x); v.unshift(c - x); } return v; };
  const xs = axis(0), zs = axis(-30), nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3); for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const q = (j * nx + i) * 3; pos[q] = xs[i]; pos[q + 1] = 0; pos[q + 2] = zs[j]; }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let k = 0;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere(); return g;
};
const WAVES_GLSL = /* glsl */ `
uniform float uT;
const int NW = 6;
vec3 waveAt(vec2 p, out vec3 nrm) {
  vec2 D[NW]; float A[NW]; float Lw[NW]; float Ph[NW];
  D[0] = normalize(vec2(-0.3, -1.0)); A[0] = 0.055; Lw[0] = 11.0; Ph[0] = 0.0;
  D[1] = normalize(vec2(-0.55, -0.85)); A[1] = 0.035; Lw[1] = 6.3; Ph[1] = 1.7;
  D[2] = normalize(vec2(0.25, -1.0)); A[2] = 0.025; Lw[2] = 3.9; Ph[2] = 4.1;
  D[3] = normalize(vec2(-1.0, -0.4)); A[3] = 0.014; Lw[3] = 2.2; Ph[3] = 2.6;
  D[4] = normalize(vec2(0.7, -0.7)); A[4] = 0.008; Lw[4] = 1.3; Ph[4] = 5.3;
  D[5] = normalize(vec2(-0.2, -0.95)); A[5] = 0.006; Lw[5] = 0.8; Ph[5] = 0.9;
  float h = 0.0; vec2 g = vec2(0.0);
  for (int i = 0; i < NW; i++) { float k = 6.2831853 / Lw[i], w = sqrt(9.81 * k), a = k * dot(D[i], p) - w * uT + Ph[i];
    h += A[i] * sin(a); g += A[i] * k * cos(a) * D[i]; }
  nrm = normalize(vec3(-g.x, 1.0, -g.y)); return vec3(0.0, h, 0.0);
}`;
const surfMat = () => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uSun: { value: SUN }, uScatter: { value: SCATTER.clone() }, uDepth: { value: depthTex() }, uDom: { value: new THREE.Vector4(DEP.x0, DEP.z0, DEP.w, DEP.h) } },
  transparent: true, side: THREE.DoubleSide, depthWrite: true, fog: false,
  blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  vertexShader: `${WAVES_GLSL}
varying vec3 vW; varying vec3 vN;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vec3 n; vec3 d = waveAt(w.xz, n);
  float fade = 1.0 - smoothstep(60.0, 140.0, length(w.xz - cameraPosition.xz));
  w.y += d.y * fade; vN = normalize(mix(vec3(0, 1, 0), n, fade)); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `${SKY_GLSL}
uniform float uT; uniform vec3 uScatter; uniform sampler2D uDepth; uniform vec4 uDom; varying vec3 vW; varying vec3 vN;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
vec2 rip(vec2 p){ float e = 0.06; float a = vn(p), b = vn(p + vec2(e, 0.0)), c = vn(p + vec2(0.0, e)); return vec2(b - a, c - a) / e; }
void main(){
  float camD = length(vW - cameraPosition);
  float near = 1.0 - smoothstep(25.0, 260.0, camD);
  vec2 r = rip(vW.xz * 1.9 + vec2(uT * 0.31, -uT * 0.42)) * 0.09 + rip(vW.xz * 4.3 - vec2(uT * 0.55, uT * 0.2)) * 0.05 + rip(vW.xz * 0.6 + uT * 0.07) * 0.08;
  vec3 n = normalize(vN + vec3(r.x, 0.0, r.y) * near);
  vec3 V = normalize(vW - cameraPosition);
  vec2 duv = (vW.xz - uDom.xy) / uDom.zw;
  float bed = (duv.x > 0.0 && duv.x < 1.0 && duv.y > 0.0 && duv.y < 1.0) ? texture2D(uDepth, duv).r * 255.0 / 8.0 - 20.0 : -20.0;
  float depth = -bed;
  if (cameraPosition.y >= vW.y - 0.01) {
    if (depth < -0.02) discard;                                      // under the beach: land covers it
    float cosT = clamp(dot(-V, n), 0.0, 1.0);
    float F = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
    vec3 R = reflect(V, n); R.y = abs(R.y);
    vec3 refl = skyCol(R);
    float s = max(dot(R, uSun), 0.0); vec3 glint = vec3(1.0, 0.95, 0.85) * (pow(s, 1400.0) * 30.0 + pow(s, 120.0) * 0.5) * near;
    // body colour where the bed is too deep to show: open-ocean blue, shallow turquoise tint over sand
    float deepK = smoothstep(4.0, 22.0, depth);
    vec3 body = mix(vec3(0.0, 0.045, 0.06), vec3(0.0, 0.02, 0.07), deepK) * smoothstep(1.0, 9.0, depth);
    // shore wash: lapping foam lines on the wet sand
    float lap = sin(depth * 22.0 - uT * 2.1 + vn(vW.xz * 0.35) * 5.0) * 0.5 + 0.5;
    float foam = (1.0 - smoothstep(0.0, 0.32, depth)) * smoothstep(0.55, 0.92, lap) * (0.55 + 0.45 * vn(vW.xz * 2.4 + uT * 0.4));
    foam += (1.0 - smoothstep(0.0, 0.08, depth)) * 0.5 * vn(vW.xz * 3.0 - uT * 0.3);
    foam = clamp(foam, 0.0, 1.0);
    float a = clamp(F + 0.06 * smoothstep(1.0, 8.0, depth) + foam * 0.85 + deepK * 0.25, 0.0, 1.0);
    vec3 col = refl * F + glint + body + vec3(0.92, 0.96, 0.96) * foam * 0.85;
    gl_FragColor = vec4(col, a);
  } else {
    vec3 T = refract(V, -n, 1.333);
    float win = length(T) > 0.0 ? smoothstep(0.0, 0.18, dot(T, vec3(0, 1, 0))) : 0.0;     // Snell's window, soft rim
    vec3 sky = length(T) > 0.0 ? skyCol(normalize(T)) : vec3(0.0);
    float s = length(T) > 0.0 ? max(dot(normalize(T), uSun), 0.0) : 0.0;
    vec3 inWin = sky * 0.95 + vec3(1.0, 0.95, 0.8) * (pow(s, 40.0) * 3.0 + pow(s, 6.0) * 0.4);
    vec3 tir = uScatter * (0.55 + 0.25 * vn(vW.xz * 0.8 + uT * 0.2));                    // total internal reflection: the water below, mirrored
    vec3 col = mix(tir, inWin, win);
    float a = mix(1.0, 0.62, win);
    vec3 sig = vec3(0.17, 0.05, 0.04); vec3 tr = exp(-sig * camD);
    vec3 scat = uScatter * mix(1.0, 0.6, smoothstep(2.0, 20.0, -cameraPosition.y));
    col = col * tr + scat * (1.0 - tr); a = mix(1.0, a, tr.g);
    gl_FragColor = vec4(col * a, a);
  }
}`,
});
export const Surface: React.FC<{ t: number; scatter?: THREE.Color }> = ({ t, scatter }) => {
  const S = useMemo(() => once("poSurface", () => ({ g: surfGeo(), m: surfMat() })), []);
  S.m.uniforms.uT.value = t; if (scatter) (S.m.uniforms.uScatter.value as THREE.Color).copy(scatter);
  return <mesh geometry={S.g} material={S.m} renderOrder={5} frustumCulled={false} />;
};
/** CPU copy of the wave height (for floats / the flag buoy / the floating hero) */
export const waveY = (x: number, z: number, t: number) => {
  const W: [number, number, number, number, number][] = [[-0.3, -1, 0.055, 11, 0], [-0.55, -0.85, 0.035, 6.3, 1.7], [0.25, -1, 0.025, 3.9, 4.1], [-1, -0.4, 0.014, 2.2, 2.6]];
  let h = 0; for (const [dx, dz, A, L, P] of W) { const l = Math.hypot(dx, dz), k = 2 * Math.PI / L; h += A * Math.sin(k * (dx * x + dz * z) / l - Math.sqrt(9.81 * k) * t + P); } return h;
};

// ---------------------------------------------------------------- sun shafts (under water)
const RAY_N = 90;
const rayMat = () => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3(-0.22, -1, -0.26).normalize() }, uI: { value: 1 } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  vertexShader: `attribute vec4 aRay; uniform vec3 uDir; uniform float uT; varying vec2 vUv; varying float vFade; varying float vSeed; varying vec3 vW;
void main(){ // aRay: xz anchor, width, seed. Quad: x across (-1..1), y along (0 top .. 1 bottom); cylindrical billboard about the shaft axis
  vec3 top = vec3(aRay.x, -0.05, aRay.y); float len = 9.0 + 6.0 * fract(aRay.w * 7.3);
  vec3 ax = normalize(uDir); vec3 toC = cameraPosition - top; vec3 side = normalize(cross(ax, toC));
  vec3 p = top + ax * (uv.y * len) + side * (uv.x - 0.5) * aRay.z * (1.0 + uv.y * 0.6);
  vUv = uv; vSeed = aRay.w; vW = p;
  float d = length(cameraPosition - (top + ax * len * 0.5));
  vFade = (1.0 - smoothstep(16.0, 34.0, d)) * smoothstep(1.5, 5.0, d);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
  fragmentShader: `uniform float uT; uniform float uI; varying vec2 vUv; varying float vFade; varying float vSeed; varying vec3 vW;
void main(){ if (cameraPosition.y > 0.0) discard;
  float across = 1.0 - abs(vUv.x - 0.5) * 2.0; across = pow(across, 1.6);
  float along = smoothstep(0.0, 0.08, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
  float flick = 0.55 + 0.45 * sin(uT * (0.7 + vSeed * 0.9) + vSeed * 40.0) * sin(uT * 0.37 + vSeed * 13.0);
  float L = length(vW - cameraPosition); float tr = exp(-0.06 * L);
  float a = across * along * flick * vFade * tr * 0.05 * uI;
  gl_FragColor = vec4(vec3(0.75, 0.98, 1.0) * a, 1.0); }`,
});
const rayGeo = () => {
  const base = new THREE.PlaneGeometry(1, 1, 1, 6); base.translate(0.5, 0.5, 0); // uv (0..1)
  const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute("position", base.attributes.position); g.setAttribute("uv", base.attributes.uv);
  g.setAttribute("aRay", new THREE.InstancedBufferAttribute(new Float32Array(RAY_N * 4), 4)); g.instanceCount = RAY_N; return g;
};
/** shafts are anchored on a 4.5 m world grid near the camera (hash -> position/width), so they stay put as the camera moves */
export const SunShafts: React.FC<{ cam: V3; t: number; intensity?: number }> = ({ cam, t, intensity = 1 }) => {
  const S = useMemo(() => once("poRays", () => ({ g: rayGeo(), m: rayMat() })), []);
  const a = S.g.getAttribute("aRay") as THREE.InstancedBufferAttribute; const arr = a.array as Float32Array;
  const G = 4.5, cx = Math.floor(cam[0] / G), cz = Math.floor(cam[2] / G); let k = 0;
  const hh = (i: number, j: number, s: number) => { const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
  for (let j = -5; j <= 4 && k < RAY_N; j++) for (let i = -5; i <= 4 && k < RAY_N; i++) { const I = cx + i, J = cz + j;
    if (hh(I, J, 1) > 0.78) continue;
    arr[k * 4] = (I + hh(I, J, 2)) * G; arr[k * 4 + 1] = (J + hh(I, J, 3)) * G; arr[k * 4 + 2] = 0.5 + hh(I, J, 4) * 2.4; arr[k * 4 + 3] = hh(I, J, 5); k++; }
  for (; k < RAY_N; k++) { arr[k * 4] = 99999; arr[k * 4 + 1] = 99999; arr[k * 4 + 2] = 0; arr[k * 4 + 3] = 0; }
  a.needsUpdate = true; S.m.uniforms.uT.value = t; S.m.uniforms.uI.value = intensity;
  return <mesh geometry={S.g} material={S.m} frustumCulled={false} renderOrder={8} />;
};

// ---------------------------------------------------------------- marine snow (suspended particles)
const SNOW_N = 2600, BOX = 18;
const snowGeo = () => { const p = new Float32Array(SNOW_N * 3), s = new Float32Array(SNOW_N);
  let r = 1234567; const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let i = 0; i < SNOW_N; i++) { p[i * 3] = rnd() * BOX; p[i * 3 + 1] = rnd() * BOX; p[i * 3 + 2] = rnd() * BOX; s[i] = rnd(); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("aS", new THREE.BufferAttribute(s, 1)); return g; };
const snowMat = () => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uPx: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  vertexShader: `uniform float uT; uniform float uPx; attribute float aS; varying float vA;
void main(){ const float B = ${BOX.toFixed(1)};
  vec3 drift = vec3(0.07 * uT + sin(uT * 0.3 + aS * 30.0) * 0.15, -0.012 * uT + sin(uT * 0.5 + aS * 17.0) * 0.06, 0.04 * uT);
  vec3 p = mod(position + drift - cameraPosition + B * 0.5, B) - B * 0.5 + cameraPosition;
  float d = length(p - cameraPosition);
  vA = (1.0 - smoothstep(B * 0.3, B * 0.5, d)) * smoothstep(0.25, 0.9, d) * step(p.y, -0.05) * (0.35 + 0.65 * aS) * exp(-0.05 * d);
  vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
  gl_PointSize = uPx * (1.2 + 2.6 * aS) * 3.2 / max(-mv.z, 0.3); }`,
  fragmentShader: `varying float vA; void main(){ if (cameraPosition.y > 0.0) discard; vec2 c = gl_PointCoord - 0.5; float r = length(c); float a = smoothstep(0.5, 0.0, r) * vA; gl_FragColor = vec4(vec3(0.7, 0.92, 0.9) * a * 0.55, 1.0); }`,
});
export const MarineSnow: React.FC<{ t: number; pxScale: number }> = ({ t, pxScale }) => {
  const S = useMemo(() => once("poSnow", () => ({ g: snowGeo(), m: snowMat() })), []);
  S.m.uniforms.uT.value = t; S.m.uniforms.uPx.value = pxScale;
  return <points geometry={S.g} material={S.m} frustumCulled={false} renderOrder={9} />;
};

// ---------------------------------------------------------------- bubbles
export type Emitter = { at: (t: number) => V3; bursts: number[]; n?: number; size?: number; spread?: number };
const BUB_N = 420;
const bubbleMat = () => new THREE.MeshPhysicalMaterial({ color: "#e8fbff", roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.55, envMapIntensity: 1.6, emissive: "#8fd9e6", emissiveIntensity: 0.25 });
export const bubbleState = (em: Emitter[], t: number) => {
  const out: { p: V3; r: number }[] = [];
  em.forEach((e, ei) => e.bursts.forEach((b, bi) => { const age = t - b; if (age < 0 || age > 9) return; const o = e.at(b), n = e.n ?? 10;
    for (let i = 0; i < n; i++) { const s = Math.sin(ei * 91.7 + bi * 37.3 + i * 12.9) * 43758.5; const h = s - Math.floor(s), h2 = (s * 7.13) - Math.floor(s * 7.13);
      const delay = h * 0.35, a = age - delay; if (a < 0) continue; const r0 = (e.size ?? 0.018) * (0.35 + 1.3 * h2 * h2);
      const v = 0.22 + r0 * 9.0; const y = o[1] + 0.05 + v * a + 0.06 * a * a; if (y > -0.03) continue;
      const sp = e.spread ?? 0.05, wob = 0.04 + r0 * 1.5;
      out.push({ p: [o[0] + (h - 0.5) * sp + Math.sin(a * (5 + h * 4) + i) * wob, y, o[2] + (h2 - 0.5) * sp + Math.cos(a * (4 + h2 * 5) + i * 2) * wob], r: r0 * (1 + Math.max(0, -o[1] - (-y)) * 0.02) }); } }));
  return out;
};
export const Bubbles: React.FC<{ em: Emitter[]; t: number }> = ({ em, t }) => {
  const R = useMemo(() => once("poBubR", () => ({ g: new THREE.SphereGeometry(1, 12, 8), m: bubbleMat() })), []);
  const S = useMemo(() => { const m = new THREE.InstancedMesh(R.g, R.m, BUB_N); m.frustumCulled = false; m.renderOrder = 7; return m; }, [R]);
  const B = bubbleState(em, t), M = new THREE.Matrix4(), Q = new THREE.Quaternion();
  for (let i = 0; i < BUB_N; i++) { const b = B[i]; if (b) M.compose(new THREE.Vector3(...b.p), Q, new THREE.Vector3(b.r, b.r * 0.82, b.r)); else M.makeScale(0, 0, 0); S.setMatrixAt(i, M); }
  S.instanceMatrix.needsUpdate = true;
  return <primitive object={S} />;
};
