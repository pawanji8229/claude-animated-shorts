// The Hideaway Island underwater post office, modelled on the real one: a converted cylindrical FIBREGLASS WATER TANK
// with a gable roof added, a counter opening cut on one side and an entrance on the other, chained to the seabed;
// a separate post box beside it for snorkellers; a yellow flag on a float at the surface while it is staffed.
// Built at true scale (≈2.24 m diameter, 2.0 m wall): moulded double wall with real jambs round both openings, rolled top
// lip, gussets, roof panels with drip edges and a ridge cap, gable sign, timber counter shelves, interior rack, chains,
// eye bolts, anchor blocks, marine growth (algae film thickest low down, coralline crust, small colonies on the roof).
import React, { useMemo } from "react";
import * as THREE from "three";
import { once } from "../short3/kit";
import { paintTex, scan } from "./assets";
import { PO } from "./geo";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { V3 } from "../../lib/math";

export const TANK = { R: 1.12, H: 2.0, wall: 0.045 };
export const OPEN = {
  counter: { th: Math.PI / 2, w: 0.98, y0: 1.02, y1: 1.6 },
  door: { th: -Math.PI / 2, w: 0.74, y0: 0.22, y1: 1.6 },
};
const ROOF = { pitch: 0.5, len: 2.9, half: 1.5, y: 2.02, t: 0.05 };

const inOpen = (th: number, y: number, pad = 0) => {
  for (const o of Object.values(OPEN)) { let d = th - o.th; d = Math.atan2(Math.sin(d), Math.cos(d)); const s = d * TANK.R;
    if (Math.abs(s) < o.w / 2 + pad && y > o.y0 - pad && y < o.y1 + pad) return true; } return false; };
const trimK = (th: number, y: number) => !inOpen(th, y) && inOpen(th, y, 0.07);
const wallGeo = () => {
  const NA = 160, NY = 50, R0 = TANK.R, R1 = TANK.R - TANK.wall; const pos: number[] = [], nrm: number[] = [], col: number[] = [], uv: number[] = [];
  const cream = new THREE.Color("#e9e2c8"), trim = new THREE.Color("#2f5d8a"), inner = new THREE.Color("#d8d2bd");
  const P = (th: number, y: number, r: number): V3 => [Math.cos(th) * r, y, Math.sin(th) * r];
  const quad = (a: V3, b: V3, c: V3, d: V3, n: (p: V3) => V3, cl: THREE.Color, u: [number, number][]) => { for (const [p, k] of [[a, 0], [b, 1], [c, 2], [a, 0], [c, 2], [d, 3]] as [V3, number][]) { pos.push(...p); nrm.push(...n(p)); col.push(cl.r, cl.g, cl.b); uv.push(...u[k]); } };
  const outN = (p: V3): V3 => { const l = Math.hypot(p[0], p[2]); return [p[0] / l, 0, p[2] / l]; }, inN = (p: V3): V3 => { const o = outN(p); return [-o[0], 0, -o[2]]; };
  const kept = (i: number, j: number) => { const th = ((i + 0.5) / NA) * Math.PI * 2, y = ((j + 0.5) / NY) * TANK.H; return !inOpen(th, y); };
  for (let i = 0; i < NA; i++) for (let j = 0; j < NY; j++) { if (!kept(i, j)) continue;
    const t0 = (i / NA) * Math.PI * 2, t1 = ((i + 1) / NA) * Math.PI * 2, y0 = (j / NY) * TANK.H, y1 = ((j + 1) / NY) * TANK.H, tm = (t0 + t1) / 2, ym = (y0 + y1) / 2;
    const cl = trimK(tm, ym) ? trim : cream; const u0 = t0 * R0, u1 = t1 * R0;
    quad(P(t0, y0, R0), P(t0, y1, R0), P(t1, y1, R0), P(t1, y0, R0), outN, cl, [[u0, y0], [u0, y1], [u1, y1], [u1, y0]]);
    quad(P(t1, y0, R1), P(t1, y1, R1), P(t0, y1, R1), P(t0, y0, R1), inN, trimK(tm, ym) ? trim : inner, [[u1, y0], [u1, y1], [u0, y1], [u0, y0]]);
    // jambs where a neighbour is cut away
    const jn = (a: V3, b: V3, c: V3, d: V3, n: V3) => quad(a, b, c, d, () => n, trim, [[0, 0], [0, 0.05], [0.05, 0.05], [0.05, 0]]);
    if (!kept((i + NA - 1) % NA, j)) { const n: V3 = [Math.sin(t0), 0, -Math.cos(t0)]; jn(P(t0, y0, R1), P(t0, y1, R1), P(t0, y1, R0), P(t0, y0, R0), n); }
    if (!kept((i + 1) % NA, j)) { const n: V3 = [-Math.sin(t1), 0, Math.cos(t1)]; jn(P(t1, y0, R0), P(t1, y1, R0), P(t1, y1, R1), P(t1, y0, R1), n); }
    if (j > 0 && !kept(i, j - 1)) jn(P(t0, y0, R0), P(t1, y0, R0), P(t1, y0, R1), P(t0, y0, R1), [0, -1, 0]);
    if (j < NY - 1 && !kept(i, j + 1)) jn(P(t0, y1, R1), P(t1, y1, R1), P(t1, y1, R0), P(t0, y1, R0), [0, 1, 0]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeBoundingSphere(); return g;
};
const withColor = (g: THREE.BufferGeometry, c: string) => { const h = g.index ? g.toNonIndexed() : g; const n = h.attributes.position.count, cl = new THREE.Color(c), a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = cl.r; a[i * 3 + 1] = cl.g; a[i * 3 + 2] = cl.b; } h.setAttribute("color", new THREE.BufferAttribute(a, 3)); if (!h.attributes.uv) h.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2)); return h; };
const box = (w: number, h: number, d: number, p: V3, c: string, r: V3 = [0, 0, 0]) => { const g = new THREE.BoxGeometry(w, h, d); g.rotateX(r[0]); g.rotateY(r[1]); g.rotateZ(r[2]); g.translate(...p); return withColor(g, c); };
const cylG = (r0: number, r1: number, h: number, p: V3, c: string, seg = 24, rot: V3 = [0, 0, 0]) => { const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.rotateX(rot[0]); g.rotateZ(rot[2]); g.rotateY(rot[1]); g.translate(...p); return withColor(g, c); };
const torusG = (R: number, r: number, p: V3, c: string, rot: V3 = [Math.PI / 2, 0, 0], arc = Math.PI * 2) => { const g = new THREE.TorusGeometry(R, r, 8, 96, arc); g.rotateX(rot[0]); g.rotateY(rot[1]); g.rotateZ(rot[2]); g.translate(...p); return withColor(g, c); };
const mg = (gs: THREE.BufferGeometry[]) => { const m = mergeGeometries(gs.map((g) => { const h = g.index ? g.toNonIndexed() : g; return h; }), false)!; m.computeBoundingSphere(); return m; };

/** fibreglass shell: wall + lip + footing ring + roof (panels, gables, ridge, drip edges, gussets) */
const shellGeo = () => {
  const gs: THREE.BufferGeometry[] = [wallGeo()];
  gs.push(torusG(TANK.R - 0.01, 0.035, [0, TANK.H, 0], "#e4dcc0"));                 // rolled top lip
  gs.push(torusG(TANK.R + 0.005, 0.03, [0, 0.04, 0], "#cfc6a8"));                    // moulded base flange
  for (let k = 0; k < 6; k++) gs.push(torusG(TANK.R + 0.006, 0.012, [0, 0.33 * k + 0.2, 0], "#e2dbc2"));    // moulded hoop ribs (water-tank style)
  // remove rib segments crossing the openings: overpaint is simpler — openings are cut through the ribs by clipping in the shader is overkill; ribs stop at the jamb via short masking boxes is not needed visually since
  // the ribs sit outside the wall: we instead skip the ribs that would cross an opening height band
  return mg(gs.filter((g, i) => { if (i < 3) return true; const y = 0.33 * (i - 3) + 0.2; return !(y > OPEN.door.y0 - 0.05 && y < OPEN.door.y1 + 0.05) && !(y > OPEN.counter.y0 - 0.05 && y < OPEN.counter.y1 + 0.05); }));
};
const roofGeo = () => {
  const gs: THREE.BufferGeometry[] = []; const { pitch, len, half, y, t } = ROOF; const rise = Math.sin(pitch) * half, run = Math.cos(pitch) * half;
  // ridge runs along x (gables face +z / -z = counter / door sides)
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(len, t, half); g.rotateX(s * pitch); g.translate(0, y + rise / 2 + 0.04, s * run / 2); gs.push(withColor(g, "#5f86a3"));
    // corrugation ribs on the roof panels
    for (let k = -6; k <= 6; k++) { const r = new THREE.CylinderGeometry(0.014, 0.014, half, 6); r.rotateX(Math.PI / 2 + s * pitch); r.translate(k * 0.22, y + rise / 2 + 0.07, s * run / 2); gs.push(withColor(r, "#6a92ae")); }
    const drip = new THREE.BoxGeometry(len + 0.02, 0.06, 0.03); drip.translate(0, y + 0.03 - 0.02, s * (run + 0.01)); gs.push(withColor(drip, "#2f5d8a"));
  }
  gs.push(cylG(0.05, 0.05, len + 0.04, [0, y + rise + 0.06, 0], "#2f5d8a", 12, [0, 0, Math.PI / 2]));       // ridge cap
  // gable end walls (triangles) over the tank on both ridge ends -> face +-x; and the deep gable over the counter
  for (const sx of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(-run, 0); sh.lineTo(run, 0); sh.lineTo(0, rise); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(sx * (len / 2 - 0.12), y + 0.04, 0); gs.push(withColor(g, "#e6dfc4")); }
  // roof bearers sitting on the lip
  for (const sx of [-0.7, 0, 0.7]) gs.push(box(0.08, 0.08, 2.0, [sx, y, 0], "#d7cfb2"));
  gs.push(box(2.3, 0.08, 0.08, [0, y, 0.0], "#d7cfb2"));
  return mg(gs);
};
/** counter shelves (in + out), interior rack, hooks, eye bolts, anchor blocks + chains, post box */
const fitGeo = () => {
  const gs: THREE.BufferGeometry[] = []; const c = OPEN.counter;
  gs.push(box(c.w + 0.16, 0.045, 0.32, [0, c.y0 - 0.02, TANK.R + 0.1], "#8a6a46"));                      // outer sill (hardwood)
  gs.push(box(c.w + 0.1, 0.045, 0.42, [0, c.y0 - 0.02, TANK.R - 0.26], "#8a6a46"));                        // inner counter
  for (const sx of [-1, 1]) gs.push(box(0.04, 0.2, 0.04, [sx * (c.w / 2 + 0.02), c.y0 - 0.14, TANK.R + 0.2], "#6d5236", [0.6, 0, 0]));    // sill brackets
  // interior rack with pigeonholes (back wall, opposite the counter)
  gs.push(box(0.9, 0.62, 0.18, [0.0, 1.32, -TANK.R + 0.2], "#7a5c3c"));
  for (let k = 0; k < 4; k++) gs.push(box(0.88, 0.02, 0.17, [0, 1.06 + k * 0.17, -TANK.R + 0.22], "#5a4228"));
  for (let k = 0; k < 4; k++) gs.push(box(0.02, 0.6, 0.17, [-0.33 + k * 0.22, 1.32, -TANK.R + 0.22], "#5a4228"));
  // eye bolts at the base (x4) and anchor blocks on the sand
  for (const a of [0.35, 1.95, 3.55, 5.15]) { const x = Math.cos(a) * (TANK.R + 0.02), z = Math.sin(a) * (TANK.R + 0.02); gs.push(torusG(0.04, 0.01, [x, 0.18, z], "#5b4a3a", [0, -a, 0]));
    const X = Math.cos(a) * 2.25, Z = Math.sin(a) * 2.25; gs.push(box(0.4, 0.22, 0.4, [X, 0.04, Z], "#8b8a7e", [0, a, 0])); gs.push(torusG(0.05, 0.013, [X, 0.18, Z], "#5b4a3a", [0, -a, 0])); }
  return mg(gs);
};
/** chain: a row of interlocking oval links between two points (sagging) */
const chainGeo = () => { const gs: THREE.BufferGeometry[] = [];
  for (const a of [0.35, 1.95, 3.55, 5.15]) { const A = new THREE.Vector3(Math.cos(a) * (TANK.R + 0.06), 0.18, Math.sin(a) * (TANK.R + 0.06)), B = new THREE.Vector3(Math.cos(a) * 2.2, 0.17, Math.sin(a) * 2.2); const L = A.distanceTo(B), n = Math.floor(L / 0.055);
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, p = A.clone().lerp(B, u); p.y -= Math.sin(u * Math.PI) * 0.12; const t = new THREE.TorusGeometry(0.026, 0.0065, 5, 10); t.scale(1.4, 1, 1); if (i % 2) t.rotateX(Math.PI / 2); t.rotateY(-a); t.translate(p.x, p.y, p.z); gs.push(withColor(t, "#4e3f33")); } }
  return mg(gs); };
const postboxGeo = () => { const gs: THREE.BufferGeometry[] = [];
  gs.push(cylG(0.05, 0.05, 1.05, [0, 0.52, 0], "#3b5f86", 12)); gs.push(box(0.3, 0.06, 0.3, [0, 0.03, 0], "#8b8a7e"));
  gs.push(box(0.46, 0.4, 0.32, [0, 1.25, 0], "#2f5d8a")); const top = new THREE.CylinderGeometry(0.16, 0.16, 0.46, 20, 1, false, 0, Math.PI); top.rotateZ(Math.PI / 2); top.rotateX(Math.PI / 2); top.translate(0, 1.45, 0); gs.push(withColor(top, "#2f5d8a"));
  gs.push(box(0.3, 0.025, 0.02, [0, 1.36, 0.165], "#141a20")); gs.push(box(0.36, 0.06, 0.02, [0, 1.12, 0.165], "#e9c43a")); return mg(gs); };

// ---------------------------------------------------------------- materials
const fibreTex = () => paintTex(512, 512, (g, r) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${150 + r() * 60},${140 + r() * 60},${110 + r() * 50},${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 4, 1 + r() * 4); }
  for (let i = 0; i < 90; i++) { const x = r() * 512, y = r() * 512; g.strokeStyle = `rgba(90,85,60,${0.05 + r() * 0.08})`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + 30 + r() * 80); g.stroke(); } }, 31);
const growthMat = (rough: number, clean: { v: number }) => {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0, map: fibreTex() });
  const U = { uClean: { value: 0 }, uBase: { value: PO.y } };
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vGw; varying vec3 vGn;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvGw = (modelMatrix * vec4(transformed, 1.0)).xyz; vGn = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
varying vec3 vGw; varying vec3 vGn; uniform float uClean, uBase;
float gh3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float gn3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(gh3(i), gh3(i + vec3(1,0,0)), f.x), mix(gh3(i + vec3(0,1,0)), gh3(i + vec3(1,1,0)), f.x), f.y), mix(mix(gh3(i + vec3(0,0,1)), gh3(i + vec3(1,0,1)), f.x), mix(gh3(i + vec3(0,1,1)), gh3(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
{ float h = vGw.y - uBase; float n1 = gn3(vGw * 3.1), n2 = gn3(vGw * 11.0 + 4.0), n3 = gn3(vGw * 0.9 + 9.0);
  float film = (1.0 - smoothstep(0.1, 1.6, h)) * 0.75 + smoothstep(0.55, 1.0, vGn.y) * 0.55 + 0.18;
  film = clamp(film * (0.55 + 0.7 * n1) - 0.12, 0.0, 1.0);
  vec3 algae = mix(vec3(0.33, 0.37, 0.18), vec3(0.42, 0.33, 0.2), n3);
  vec3 c = mix(diffuseColor.rgb, diffuseColor.rgb * 0.55 + algae * 0.6, film * 0.85);
  float streak = smoothstep(0.62, 0.9, gn3(vec3(vGw.x * 9.0, vGw.y * 0.6, vGw.z * 9.0))) * (1.0 - smoothstep(0.0, 1.0, abs(vGn.y)));   // run-off streaks
  c = mix(c, c * vec3(0.72, 0.68, 0.55), streak * 0.5);
  float crust = smoothstep(0.78, 0.86, n2) * (1.0 - smoothstep(0.2, 1.1, h)) ;                      // coralline crust spots
  c = mix(c, vec3(0.62, 0.42, 0.52), crust * 0.7);
  diffuseColor.rgb = mix(c, diffuseColor.rgb, uClean); }`);
  };
  m.customProgramCacheKey = () => `poGrowth${rough}`; (m as unknown as { _U: typeof U })._U = U; void clean; return m;
};
/** painted sign boards (in-world signage) */
export const signTex = (lines: { t: string; size: number; y: number; col?: string; font?: string }[], w = 1024, h = 256, bg = "#f2ead2", border = "#2f5d8a", seed = 3) => paintTex(w, h, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = border; g.lineWidth = h * 0.06; g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
  for (const L of lines) { g.fillStyle = L.col ?? border; g.font = `${L.font ?? "bold"} ${L.size}px "DejaVu Sans", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(L.t, w / 2, L.y); }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${60 + r() * 40},${70 + r() * 40},${40},${r() * 0.06})`; g.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 6); }   // weathering
}, seed, true, false);

export type OfficeState = { clean?: boolean; noRoof?: boolean; noChains?: boolean; noSign?: boolean; withBox?: boolean; roofY?: number };
export const officeParts = () => once("poOfficeParts", () => {
  const clean = { v: 0 };
  const growth = growthMat(0.55, clean), growthRoof = growthMat(0.6, clean), wood = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, map: scan("dark_wood", "diff") }), metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.4 });
  const signMat = new THREE.MeshStandardMaterial({ map: signTex([{ t: "POST OFFICE", size: 150, y: 128 }]), roughness: 0.6 });
  const plaqueMat = new THREE.MeshStandardMaterial({ map: signTex([{ t: "UNDERWATER", size: 64, y: 74 }, { t: "POST OFFICE", size: 64, y: 140 }, { t: "HIDEAWAY ISLAND · VANUATU", size: 30, y: 200, font: "" }], 512, 256, "#f6efd6", "#2f5d8a", 9), roughness: 0.55 });
  const pbSign = new THREE.MeshStandardMaterial({ map: signTex([{ t: "POST", size: 120, y: 128, col: "#f2ead2" }], 512, 256, "#2f5d8a", "#e9c43a", 4), roughness: 0.6 });
  return { shell: shellGeo(), roof: roofGeo(), fit: fitGeo(), chain: chainGeo(), pbox: postboxGeo(), growth, growthRoof, wood, metal, signMat, plaqueMat, pbSign };
});
/** the office, local origin at the tank base centre; counter faces local +z */
export const Office: React.FC<{ st?: OfficeState }> = ({ st = {} }) => {
  const P = officeParts();
  ((P.growth as unknown as { _U: { uClean: { value: number } } })._U.uClean.value = st.clean ? 1 : 0);
  ((P.growthRoof as unknown as { _U: { uClean: { value: number } } })._U.uClean.value = st.clean ? 1 : 0);
  const { pitch, half, y } = ROOF, rise = Math.sin(pitch) * half;
  return (<group>
    <mesh geometry={P.shell} material={P.growth} castShadow receiveShadow />
    {/* daylight that spills in through the counter + door openings (keeps the counter work readable) */}
    <pointLight position={[0, 1.45, 0.35]} intensity={2.2} distance={2.6} decay={1.5} color="#cdeff0" />
    {!st.noRoof && <mesh geometry={P.roof} material={P.growthRoof} position={[0, st.roofY ?? 0, 0]} castShadow receiveShadow />}
    <mesh geometry={P.fit} material={P.wood} castShadow receiveShadow />
    {!st.noChains && <mesh geometry={P.chain} material={P.metal} castShadow />}
    {/* "POST OFFICE" board above the counter + plaque beside it */}
    {!st.noSign && <mesh position={[0, 1.8, TANK.R + 0.025]} material={P.signMat} castShadow><boxGeometry args={[1.05, 0.26, 0.03]} /></mesh>}
    {!st.noSign && <mesh position={[Math.cos(Math.PI / 2 - 0.62) * (TANK.R + 0.012), 1.25, Math.sin(Math.PI / 2 - 0.62) * (TANK.R + 0.012)]} rotation={[0, 0.62, 0]} material={P.plaqueMat}><boxGeometry args={[0.42, 0.21, 0.015]} /></mesh>}
    {!st.noRoof && <mesh position={[0, y + rise + 0.2 + (st.roofY ?? 0), 0]} material={P.metal}><torusGeometry args={[0.05, 0.012, 6, 14]} /></mesh>}
    <group position={[1.75, 0, 1.15]} rotation={[0, -0.5, 0]}>
      <mesh geometry={P.pbox} material={P.growth} castShadow receiveShadow />
      <mesh position={[0, 1.27, 0.172]} material={P.pbSign}><planeGeometry args={[0.3, 0.15]} /></mesh>
    </group>
  </group>);
};
/** world transform of the office */
export const officeMatrix = () => new THREE.Matrix4().compose(new THREE.Vector3(PO.x, PO.y, PO.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, PO.rot, 0)), new THREE.Vector3(1, 1, 1));
export const ow = (l: V3): V3 => { const v = new THREE.Vector3(...l).applyMatrix4(officeMatrix()); return [v.x, v.y, v.z]; };
export const ROOF_TOP = ROOF.y + Math.sin(ROOF.pitch) * ROOF.half + 0.2;
