// Orkney terrain + sea. Height grids come from productions/flight/gen/orkney.py (outer 40 m > mid 6 m > near 2 m per
// airfield). Each level is cut into tiles (frustum-culled); a level skips the cells covered by the finer level inside it
// (shared grid lines, skirts hide sub-centimetre cracks). The ground shader paints the level's generated colour map
// (fields, dykes, roads, yards, rock shelves, sand) and adds real CC0 scan detail (grass / coast rock) close to the
// camera. The sea is one large plane: depth + shore distance from the generated shore maps drive the colour (deep
// Atlantic blue-green > turquoise shallows > rock shelf showing through), shore foam bands that wash in and out,
// scattered whitecaps, and two scrolling ripple normal maps for glints.
import React, { useMemo } from "react";
import * as THREE from "three";
import places from "./data/places.json";
import { heights, imgTex, SCANS } from "./mats";
import { once } from "../short3/kit";
import { rippleNormal } from "../london-bridge/assets";

type Lvl = { x0: number; z0: number; step: number; nx: number; nz: number; w: number; h: number };
const L = places.levels as unknown as Record<"outer" | "mid" | "wry" | "ppw", Lvl>;
const CHILD: Record<string, string[]> = { outer: ["mid"], mid: ["wry", "ppw"], wry: [], ppw: [] };
const inside = (l: Lvl, x: number, z: number) => x > l.x0 + 1e-3 && x < l.x0 + l.w - 1e-3 && z > l.z0 + 1e-3 && z < l.z0 + l.h - 1e-3;

/** terrain height (m) at a world point, from the finest level that covers it */
export const groundY = (x: number, z: number): number => {
  for (const k of ["wry", "ppw", "mid", "outer"] as const) { const l = L[k]; if (!inside(l, x, z)) continue; const H = heights(k);
    const u = (x - l.x0) / l.step, v = (z - l.z0) / l.step, i = Math.min(l.nx - 2, Math.floor(u)), j = Math.min(l.nz - 2, Math.floor(v)), fu = u - i, fv = v - j;
    const a = H[j * l.nx + i], b = H[j * l.nx + i + 1], c = H[(j + 1) * l.nx + i], d = H[(j + 1) * l.nx + i + 1];
    return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv; }
  return -20;
};

const TILE = 96;
const buildLevel = (k: "outer" | "mid" | "wry" | "ppw") => {
  const l = L[k], H = heights(k), kids = CHILD[k].map((c) => L[c as keyof typeof L]);
  const tiles: THREE.BufferGeometry[] = [];
  for (let tj = 0; tj < l.nz - 1; tj += TILE) for (let ti = 0; ti < l.nx - 1; ti += TILE) {
    const ni = Math.min(TILE, l.nx - 1 - ti), nj = Math.min(TILE, l.nz - 1 - tj);
    const pos = new Float32Array((ni + 1) * (nj + 1) * 3), nrm = new Float32Array((ni + 1) * (nj + 1) * 3), idx: number[] = [];
    for (let j = 0; j <= nj; j++) for (let i = 0; i <= ni; i++) {
      const gi = ti + i, gj = tj + j, q = (j * (ni + 1) + i) * 3, y = H[gj * l.nx + gi];
      pos[q] = l.x0 + gi * l.step; pos[q + 1] = y; pos[q + 2] = l.z0 + gj * l.step;
      const hl = H[gj * l.nx + Math.max(0, gi - 1)], hr = H[gj * l.nx + Math.min(l.nx - 1, gi + 1)], hu = H[Math.max(0, gj - 1) * l.nx + gi], hd = H[Math.min(l.nz - 1, gj + 1) * l.nx + gi];
      const nx = (hl - hr) / (2 * l.step), nz = (hu - hd) / (2 * l.step), n = Math.hypot(nx, 1, nz); nrm[q] = nx / n; nrm[q + 1] = 1 / n; nrm[q + 2] = nz / n;
    }
    for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) {
      const cx = l.x0 + (ti + i + 0.5) * l.step, cz = l.z0 + (tj + j + 0.5) * l.step;
      if (kids.some((c) => inside(c, cx, cz))) continue;
      const a = j * (ni + 1) + i, b = a + 1, c = a + ni + 1, d = c + 1;
      if (Math.max(pos[a * 3 + 1], pos[b * 3 + 1], pos[c * 3 + 1], pos[d * 3 + 1]) < -2.2) continue;   // deep water: the sea covers it
      idx.push(a, c, b, b, c, d);
    }
    if (!idx.length) continue;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3)); g.setIndex(idx); g.computeBoundingSphere(); tiles.push(g);
  }
  // skirt round a fine level: a 1.2 m curtain hanging below its edge (hides cracks against the coarser level)
  if (k !== "outer") { const sk: number[] = [], sn: number[] = [];
    const edge = (gi: number, gj: number) => [l.x0 + gi * l.step, H[gj * l.nx + gi], l.z0 + gj * l.step];
    const run: [number, number][] = []; for (let i = 0; i < l.nx; i++) run.push([i, 0]); for (let j = 0; j < l.nz; j++) run.push([l.nx - 1, j]); for (let i = l.nx - 1; i >= 0; i--) run.push([i, l.nz - 1]); for (let j = l.nz - 1; j >= 0; j--) run.push([0, j]);
    for (let r = 0; r < run.length - 1; r++) { const A = edge(...run[r]), B = edge(...run[r + 1]); if (Math.max(A[1], B[1]) < -2) continue;
      sk.push(...A, A[0], A[1] - 1.2, A[2], ...B, ...B, A[0], A[1] - 1.2, A[2], B[0], B[1] - 1.2, B[2]); for (let q = 0; q < 6; q++) sn.push(0, 1, 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(sk, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(sn, 3)); g.computeBoundingSphere(); tiles.push(g); }
  return tiles;
};

const scanTex = (n: string, m: string) => { const t = imgTex(`tex/${n}_${m}.jpg`, m === "diff", true); return t; };
const groundMat = (k: "outer" | "mid" | "wry" | "ppw") => {
  const l = L[k], mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95, metalness: 0 });
  const U = {
    uGround: { value: imgTex(`flight/ground_${k}.png`) }, uDom: { value: new THREE.Vector4(l.x0, l.z0, l.w, l.h) },
    uGrass: { value: scanTex(SCANS.grass, "diff") }, uGrassN: { value: scanTex(SCANS.grass, "nor_gl") }, uCoast: { value: scanTex(SCANS.coast, "diff") }, uCoastN: { value: scanTex(SCANS.coast, "nor_gl") },
    uRock: { value: scanTex(SCANS.rock, "diff") }, uDetail: { value: k === "outer" ? 0.0 : 1.0 },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vWp; uniform sampler2D uGround, uGrass, uGrassN, uCoast, uCoastN, uRock; uniform vec4 uDom; uniform float uDetail;
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }`)
      .replace("#include <map_fragment>", `
if (vWp.y < -0.03) discard;                       // under the sea: the sea shader shows the bed (no shoreline z-fighting)
vec2 guv = (vWp.xz - uDom.xy) / uDom.zw;
vec4 G = texture2D(uGround, guv);
float camD = length(vWp - cameraPosition);
float near = uDetail * (1.0 - smoothstep(120.0, 900.0, camD));
float cls = G.a * 255.0;
vec3 gA = texture2D(uGrass, vWp.xz / 15.0).rgb, gB = texture2D(uGrass, vWp.xz / 3.7 + 0.31).rgb;
vec3 cA = texture2D(uCoast, vWp.xz / 9.0).rgb, rA = texture2D(uRock, vWp.xz / 22.0).rgb;
float grassK = step(190.0, cls), rockK = step(80.0, cls) * (1.0 - step(130.0, cls)), sandK = step(30.0, cls) * (1.0 - step(80.0, cls)), gravK = step(130.0, cls) * (1.0 - step(190.0, cls));
float dG = lum(gA) / 0.32 * 0.6 + lum(gB) / 0.32 * 0.4;
float dR = mix(lum(cA) / 0.42, lum(rA) / 0.36, 0.4), dS = lum(cA) / 0.45;
float det = grassK * dG + rockK * dR + sandK * mix(1.0, dS, 0.5) + gravK * mix(1.0, lum(cA) / 0.42, 0.6) + (1.0 - grassK - rockK - sandK - gravK);
vec3 col = G.rgb * mix(1.0, clamp(det, 0.45, 1.7), near);
col = mix(col, col * gA / max(lum(gA), 0.05) * 0.95, near * grassK * 0.35);        // a little of the real grass hue variation
col = mix(col, cA * lum(G.rgb) / max(lum(cA), 0.05), near * rockK * 0.55);          // rock shelves take the scan's real texture
diffuseColor.rgb *= col;
`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{ vec3 nA = texture2D(uGrassN, vWp.xz / 3.7 + 0.31).xyz * 2.0 - 1.0, nB = texture2D(uCoastN, vWp.xz / 9.0).xyz * 2.0 - 1.0;
  vec3 tn = mix(nA, nB, rockK + sandK * 0.6); vec3 wn = vec3(tn.x, 0.0, -tn.y) * near * 0.55;
  normal = normalize(normal + (viewMatrix * vec4(wn, 0.0)).xyz); }`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.95, 0.7, rockK);");
  };
  mat.customProgramCacheKey = () => `flightGround_${k}`;
  return mat;
};

export const Terrain: React.FC = () => {
  const parts = useMemo(() => once("flightTerrain", () => (["outer", "mid", "wry", "ppw"] as const).map((k) => ({ k, tiles: buildLevel(k), mat: groundMat(k) }))), []);
  return <>{parts.map((p) => p.tiles.map((g, i) => <mesh key={`${p.k}${i}`} geometry={g} material={p.mat} receiveShadow castShadow={p.k !== "outer"} />))}</>;
};

// ---------------------------------------------------------------- sea
const seaMat = () => {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.16, metalness: 0.0, envMapIntensity: 0.55 });
  const rn = rippleNormal(); rn.wrapS = rn.wrapT = THREE.RepeatWrapping;
  const U = {
    uShoreO: { value: imgTex("flight/shore_outer.png", false) }, uShoreM: { value: imgTex("flight/shore_mid.png", false) },
    uBedO: { value: imgTex("flight/ground_outer.png") }, uBedM: { value: imgTex("flight/ground_mid.png") },
    uDomO: { value: new THREE.Vector4(L.outer.x0, L.outer.z0, L.outer.w, L.outer.h) }, uDomM: { value: new THREE.Vector4(L.mid.x0, L.mid.z0, L.mid.w, L.mid.h) },
    uRip: { value: rn }, uT: { value: 0 }, uWind: { value: new THREE.Vector2(-1, -0.35) },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vWp; uniform sampler2D uShoreO, uShoreM, uBedO, uBedM, uRip; uniform vec4 uDomO, uDomM; uniform float uT; uniform vec2 uWind;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }`)
      .replace("#include <map_fragment>", `
vec2 uvO = (vWp.xz - uDomO.xy) / uDomO.zw, uvM = (vWp.xz - uDomM.xy) / uDomM.zw;
float inM = step(0.0, uvM.x) * step(uvM.x, 1.0) * step(0.0, uvM.y) * step(uvM.y, 1.0);
vec3 S = mix(texture2D(uShoreO, uvO).rgb, texture2D(uShoreM, uvM).rgb, inM);
vec3 bed = mix(texture2D(uBedO, uvO).rgb, texture2D(uBedM, uvM).rgb, inM);
float depth = S.r * 25.5, shoreD = S.g * 255.0, rocky = S.b;
float camD = length(vWp - cameraPosition);
vec3 deep = vec3(0.035, 0.085, 0.11), mid = vec3(0.05, 0.13, 0.15), shallow = vec3(0.12, 0.27, 0.27);
vec3 col = mix(shallow, mid, smoothstep(0.5, 5.0, depth)); col = mix(col, deep, smoothstep(5.0, 22.0, depth));
col = mix(bed * 0.42, col, smoothstep(0.1, 1.2, depth));                               // rock shelf / sand visible in the shallows
// large-scale colour drift (wind lanes, cloud shadow-ish patches)
col *= 0.9 + 0.2 * vn(vWp.xz / 380.0 + uT * 0.002);
// shore foam: bands that wash in and out over the shelf
float wash = sin(shoreD * 0.55 - uT * 1.7 + vn(vWp.xz / 14.0) * 4.0) * 0.5 + 0.5;
float foam = (1.0 - smoothstep(0.0, 0.7, depth)) * smoothstep(0.45, 0.95, wash) * (0.35 + 0.5 * rocky) * (0.5 + 0.5 * vn(vWp.xz / 5.0 + uT * 0.2));
foam += (1.0 - smoothstep(0.0, 0.35, depth)) * 0.4 * vn(vWp.xz / 2.2 + uT * 0.3);
// whitecaps in open water (moving downwind, short-lived)
vec2 wp = vWp.xz / 9.0 - uWind * uT * 0.35;
float cap = smoothstep(0.885, 0.95, vn(wp) * 0.6 + vn(wp * 2.7 + 3.1) * 0.4) * smoothstep(3.0, 9.0, depth) * smoothstep(0.35, 0.75, vn(vWp.xz / 120.0 + uT * 0.01));
cap *= 1.0 - smoothstep(1200.0, 4000.0, camD) * 0.6;
float F = clamp(foam + cap * 0.85, 0.0, 1.0);
col = mix(col, vec3(0.93, 0.95, 0.95), F);
diffuseColor.rgb = col;
`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{ vec2 a = vWp.xz / 7.5 - uWind * uT * 0.06, b = vWp.xz / 31.0 + vec2(uT * 0.013, -uT * 0.021), c = vWp.xz / 2.1 - uWind * uT * 0.15;
  vec3 n1 = texture2D(uRip, a).xyz * 2.0 - 1.0, n2 = texture2D(uRip, b).xyz * 2.0 - 1.0, n3 = texture2D(uRip, c).xyz * 2.0 - 1.0;
  float k = 1.0 - smoothstep(60.0, 2500.0, length(vWp - cameraPosition)) * 0.75;
  vec3 tn = normalize(vec3((n1.xy * 0.55 + n2.xy * 0.75 + n3.xy * 0.3 * k) * 0.5, 1.0));
  vec3 wn = vec3(tn.x, tn.z, -tn.y);
  normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz); }`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.1, 0.85, F);");
  };
  mat.customProgramCacheKey = () => "flightSea";
  return { mat, U };
};
export const Sea: React.FC<{ t: number }> = ({ t }) => {
  const S = useMemo(() => once("flightSea", seaMat), []);
  S.U.uT.value = t;
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={S.mat} receiveShadow><planeGeometry args={[60000, 60000]} /></mesh>;
};
