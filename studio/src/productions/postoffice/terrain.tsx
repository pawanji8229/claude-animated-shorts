// Hideaway Island ground: one height function (geo.ts) meshed at three resolutions (near 0.3 m round the office and the
// beach, mid 1.5 m, outer 10 m), finer levels punched out of coarser ones (+ skirts). The ground shader blends real CC0
// scans by elevation / shore distance: fine reef sand with current ripples and coral-rubble patches under water, damp
// beach sand at the waterline, dry white coral sand above it, then tropical undergrowth inland.
import React, { useMemo } from "react";
import * as THREE from "three";
import { height, shoreDist } from "./geo";
import { scan } from "./assets";
import { once } from "../short3/kit";

type Lvl = { x0: number; z0: number; x1: number; z1: number; step: number };
const LV: Record<"near" | "mid" | "outer", Lvl> = {
  near: { x0: -66, z0: -84, x1: 66, z1: 54, step: 0.3 },
  mid: { x0: -330, z0: -480, x1: 330, z1: 210, step: 1.5 },
  outer: { x0: -3000, z0: -3000, x1: 3000, z1: 3000, step: 12 },
};
const KIDS: Record<string, Lvl[]> = { outer: [LV.mid], mid: [LV.near], near: [] };
const inside = (l: Lvl, x: number, z: number) => x > l.x0 + 1e-3 && x < l.x1 - 1e-3 && z > l.z0 + 1e-3 && z < l.z1 - 1e-3;
const TILE = 120;
const build = (k: keyof typeof LV) => {
  const l = LV[k], nx = Math.round((l.x1 - l.x0) / l.step) + 1, nz = Math.round((l.z1 - l.z0) / l.step) + 1, kids = KIDS[k];
  const H = new Float32Array(nx * nz), D = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = l.x0 + i * l.step, z = l.z0 + j * l.step; H[j * nx + i] = height(x, z); D[j * nx + i] = shoreDist(x, z); }
  const tiles: THREE.BufferGeometry[] = [];
  for (let tj = 0; tj < nz - 1; tj += TILE) for (let ti = 0; ti < nx - 1; ti += TILE) {
    const ni = Math.min(TILE, nx - 1 - ti), nj = Math.min(TILE, nz - 1 - tj), V = (ni + 1) * (nj + 1);
    const pos = new Float32Array(V * 3), nrm = new Float32Array(V * 3), dd = new Float32Array(V), idx: number[] = [];
    for (let j = 0; j <= nj; j++) for (let i = 0; i <= ni; i++) { const gi = ti + i, gj = tj + j, q = j * (ni + 1) + i;
      pos[q * 3] = l.x0 + gi * l.step; pos[q * 3 + 1] = H[gj * nx + gi]; pos[q * 3 + 2] = l.z0 + gj * l.step; dd[q] = D[gj * nx + gi];
      const hl = H[gj * nx + Math.max(0, gi - 1)], hr = H[gj * nx + Math.min(nx - 1, gi + 1)], hu = H[Math.max(0, gj - 1) * nx + gi], hd = H[Math.min(nz - 1, gj + 1) * nx + gi];
      const ax = (hl - hr) / (2 * l.step), az = (hu - hd) / (2 * l.step), n = Math.hypot(ax, 1, az); nrm[q * 3] = ax / n; nrm[q * 3 + 1] = 1 / n; nrm[q * 3 + 2] = az / n; }
    for (let j = 0; j < nj; j++) for (let i = 0; i < ni; i++) { const cx = l.x0 + (ti + i + 0.5) * l.step, cz = l.z0 + (tj + j + 0.5) * l.step;
      if (kids.some((c) => inside(c, cx, cz))) continue; const a = j * (ni + 1) + i, b = a + 1, c = a + ni + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    if (!idx.length) continue;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3)); g.setAttribute("aD", new THREE.BufferAttribute(dd, 1)); g.setIndex(idx); g.computeBoundingSphere(); tiles.push(g);
  }
  if (k !== "outer") { const sk: number[] = [], sd: number[] = [], sn: number[] = [];
    const E = (i: number, j: number) => [l.x0 + i * l.step, H[j * nx + i], l.z0 + j * l.step, D[j * nx + i]];
    const run: [number, number][] = []; for (let i = 0; i < nx; i++) run.push([i, 0]); for (let j = 0; j < nz; j++) run.push([nx - 1, j]); for (let i = nx - 1; i >= 0; i--) run.push([i, nz - 1]); for (let j = nz - 1; j >= 0; j--) run.push([0, j]);
    for (let r = 0; r < run.length - 1; r++) { const A = E(...run[r]), B = E(...run[r + 1]);
      for (const P of [[A, 0], [A, 1], [B, 0], [B, 0], [A, 1], [B, 1]] as [number[], number][]) { sk.push(P[0][0], P[0][1] - P[1] * 1.5, P[0][2]); sd.push(P[0][3]); sn.push(0, 1, 0); } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(sk, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(sn, 3)); g.setAttribute("aD", new THREE.Float32BufferAttribute(sd, 1)); g.computeBoundingSphere(); tiles.push(g); }
  return tiles;
};

const groundMat = () => {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95, metalness: 0 });
  const U = {
    uSand: { value: scan("coast_sand_01", "diff") }, uSandN: { value: scan("coast_sand_01", "nor_gl") },
    uRub: { value: scan("coral_ground_02", "diff") }, uRubN: { value: scan("coral_ground_02", "nor_gl") },
    uWet: { value: scan("damp_beach_sand", "diff") }, uWetN: { value: scan("damp_beach_sand", "nor_gl") },
    uGrass: { value: scan("aerial_grass_rock", "diff") }, uGrassN: { value: scan("aerial_grass_rock", "nor_gl") },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aD; varying float vD; varying vec3 vWp;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vD = aD;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying float vD; varying vec3 vWp; uniform sampler2D uSand, uSandN, uRub, uRubN, uWet, uWetN, uGrass, uGrassN;
float gh(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }
float gf(vec2 p){ return gn(p) * 0.5 + gn(p * 2.1 + 3.7) * 0.3 + gn(p * 4.3 - 1.3) * 0.2; }`)
      .replace("#include <map_fragment>", `
float camD = length(vWp - cameraPosition);
vec2 P = vWp.xz;
// underwater: fine sand (+ ripples) with rubble patches; waterline: damp sand; beach: dry coral sand; inland: undergrowth
vec3 sandA = texture2D(uSand, P / 3.1).rgb, sandB = texture2D(uSand, P / 11.0 + 0.37).rgb;
vec3 sand = mix(sandA, sandB, 0.4); sand = mix(vec3(dot(sand, vec3(0.33))), sand, 0.45) * vec3(1.42, 1.38, 1.26);
vec3 rub = texture2D(uRub, P / 4.2).rgb * vec3(1.05, 1.02, 0.95);
vec3 wet = texture2D(uWet, P / 3.6).rgb * vec3(1.0, 0.98, 0.92);
vec3 dry = mix(sandA, texture2D(uSand, P / 1.7 + 0.2).rgb, 0.5); dry = mix(vec3(dot(dry, vec3(0.33))), dry, 0.4) * vec3(1.75, 1.7, 1.56);
vec3 grass = texture2D(uGrass, P / 9.0).rgb * vec3(0.72, 1.05, 0.55), litter = vec3(0.24, 0.19, 0.12) * (0.7 + 0.6 * gn(P * 0.7));
float rubK = smoothstep(0.56, 0.7, gf(P / 9.0 + 7.0)) * smoothstep(6.0, 18.0, vD) + smoothstep(55.0, 70.0, vD) * 0.75;
rubK = clamp(rubK, 0.0, 1.0);
vec3 col = mix(sand, rub, rubK);
float y = vWp.y;
col = mix(col, wet, smoothstep(-0.9, -0.15, y) * (1.0 - smoothstep(0.55, 0.95, y)));
col = mix(col, dry, smoothstep(0.55, 0.95, y));
float inland = smoothstep(14.0, 24.0, -vD);
col = mix(col, mix(grass, litter, 0.35 + 0.4 * gn(P * 0.15)), inland);
col *= 0.92 + 0.16 * gf(P / 30.0);
diffuseColor.rgb *= col;
`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
{ float nearK = 1.0 - smoothstep(25.0, 140.0, camD);
  vec3 nS = texture2D(uSandN, P / 3.1).xyz * 2.0 - 1.0, nR = texture2D(uRubN, P / 4.2).xyz * 2.0 - 1.0, nW = texture2D(uWetN, P / 3.6).xyz * 2.0 - 1.0, nG = texture2D(uGrassN, P / 9.0).xyz * 2.0 - 1.0;
  vec3 tn = mix(mix(nS, nR, rubK), nW, smoothstep(-0.9, -0.15, y) * (1.0 - smoothstep(0.55, 0.95, y))); tn = mix(tn, nG, inland);
  // current ripples in the sand: crests ~0.5 m apart, slightly sinuous, only on clean sand under water
  float rp = P.x * 0.55 + P.y * 1.25 + sin(P.x * 0.31 + P.y * 0.12) * 1.6 + gn(P * 0.5) * 1.2;
  float rip = cos(rp * 6.2831853 / 0.55 * 0.5) * (1.0 - rubK) * smoothstep(-0.6, -1.6, y) * 0.35;
  vec3 wn = vec3(tn.x * 0.8 + rip * 0.55, 0.0, -tn.y * 0.8 + rip * 1.2) * nearK;
  normal = normalize(normal + (viewMatrix * vec4(wn, 0.0)).xyz); }`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.97, 0.55, smoothstep(-0.4, 0.2, y) * (1.0 - smoothstep(0.5, 0.9, y)));");
  };
  mat.customProgramCacheKey = () => "poGround";
  return mat;
};

export const Ground: React.FC = () => {
  const P = useMemo(() => once("poGround", () => ({ mat: groundMat(), tiles: (["outer", "mid", "near"] as const).flatMap((k) => build(k).map((g) => ({ g, k }))) })), []);
  return <>{P.tiles.map((t, i) => <mesh key={i} geometry={t.g} material={P.mat} receiveShadow castShadow={t.k !== "outer"} />)}</>;
};
