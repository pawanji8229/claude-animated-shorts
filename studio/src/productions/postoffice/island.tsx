// Hideaway Island above the water: coconut palms (grown procedurally: curved ringed trunks with the CC0 palm-bark scan,
// pinnate fronds with drooping leaflets that move in the trade wind, coconut clusters, dead hanging fronds), broadleaf
// beach scrub and an inland canopy, thatched bures on stilts, the open-sided beach restaurant, the postcard kiosk,
// the timber jetty with its steps down into the water, moored fibreglass boats, kayaks, loungers, the Efate mainland
// across Mele Bay, and tropical cumulus.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { scan, paintTex, model } from "./assets";
import { height, shoreDist, fbm, ISLAND } from "./geo";
import { signTex } from "./office";
import { waveY } from "./env";
import { rng, type V3 } from "../../lib/math";

// ---------------------------------------------------------------- shared wind sway (palms, scrub)
const windMat = (base: THREE.MeshStandardMaterial, amp: number, key: string) => { const U = { uT: { value: 0 } };
  base.onBeforeCompile = (sh) => { sh.uniforms.uT = U.uT;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aSway; uniform float uT;").replace("#include <begin_vertex>", `#include <begin_vertex>
{ vec3 ip = vec3(0.0);
#ifdef USE_INSTANCING
  ip = instanceMatrix[3].xyz;
#endif
  float ph = ip.x * 0.17 + ip.z * 0.11; float g = sin(uT * 1.3 + ph) * 0.6 + sin(uT * 2.9 + ph * 2.3) * 0.25 + sin(uT * 5.1 + position.x * 3.0) * 0.15;
  transformed.x += (g * 0.8 + 0.35) * aSway * ${amp.toFixed(3)}; transformed.y -= abs(g) * aSway * ${(amp * 0.25).toFixed(3)}; transformed.z += g * 0.5 * aSway * ${amp.toFixed(3)}; }`); };
  base.customProgramCacheKey = () => `poWind${key}`; (base as unknown as { _U: typeof U })._U = U; return base; };
const setT = (m: THREE.Material, t: number) => { const u = (m as unknown as { _U?: { uT: { value: number } } })._U; if (u) u.uT.value = t; };
const withSway = (g: THREE.BufferGeometry, f: (p: THREE.Vector3) => number) => { const P = g.attributes.position as THREE.BufferAttribute, a = new Float32Array(P.count), v = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); a[i] = f(v); } g.setAttribute("aSway", new THREE.BufferAttribute(a, 1)); return g; };

// ---------------------------------------------------------------- coconut palm
const frondTex = () => paintTex(256, 1024, (g, r) => { g.clearRect(0, 0, 256, 1024);
  for (let y = 20; y < 1000; y += 9) { const u = y / 1024, w = 120 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.6); for (const s of [-1, 1]) { const len = w * (0.85 + r() * 0.3);
      const gr = g.createLinearGradient(128, y, 128 + s * len, y + 40); gr.addColorStop(0, "#5f7d2a"); gr.addColorStop(0.6, `rgb(${80 + r() * 30},${120 + r() * 30},${40 + r() * 15})`); gr.addColorStop(1, r() < 0.25 ? "#a39a52" : "#6f8f34"); g.strokeStyle = gr; g.lineWidth = 5 + r() * 2; g.lineCap = "round";
      g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + s * len * 0.5, y + 6, 128 + s * len, y + 30 + r() * 20); g.stroke(); } }
  g.strokeStyle = "#c2b46a"; g.lineWidth = 7; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 1024); g.stroke(); }, 41, true, false);
const deadTex = () => paintTex(128, 512, (g, r) => { g.clearRect(0, 0, 128, 512); for (let y = 0; y < 500; y += 6) for (const s of [-1, 1]) { g.strokeStyle = `rgb(${120 + r() * 30},${92 + r() * 20},${55})`; g.lineWidth = 3; g.beginPath(); g.moveTo(64, y); g.lineTo(64 + s * (18 + r() * 14), y + 40); g.stroke(); } }, 43, true, false);
/** one palm variant: trunk tube along a leaning curve + crown */
const palmGeo = (seed: number) => {
  const r = rng(seed), H = 7 + r() * 5, lean = 0.5 + r() * 1.6, bend = r() * 0.6;
  const C = (u: number) => new THREE.Vector3(lean * (u * u * 0.9 + u * 0.1) * H * 0.18, u * H, bend * Math.sin(u * 2.5) * 0.4);
  // trunk: rings every ~6 cm of uv, radius 0.2 at base flaring, 0.13 at the crown
  const segs = 48, rad = 14, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) { const u = i / segs, c = C(u), d = C(Math.min(1, u + 0.01)).sub(C(Math.max(0, u - 0.01))).normalize(); const s1 = new THREE.Vector3(1, 0, 0).cross(d).normalize(), s2 = d.clone().cross(s1);
    const R = 0.13 + 0.07 * Math.pow(1 - u, 3) + 0.012 * Math.sin(u * H * 9);
    for (let k = 0; k <= rad; k++) { const a = (k / rad) * Math.PI * 2; const p = c.clone().addScaledVector(s1, Math.cos(a) * R).addScaledVector(s2, Math.sin(a) * R); pos.push(p.x, p.y, p.z); uv.push((k / rad) * 1.2, u * H / 1.4); } }
  for (let i = 0; i < segs; i++) for (let k = 0; k < rad; k++) { const a = i * (rad + 1) + k, b = a + 1, c2 = a + rad + 1, d = c2 + 1; idx.push(a, c2, b, b, c2, d); }
  const trunk = new THREE.BufferGeometry(); trunk.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); trunk.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); trunk.setIndex(idx); trunk.computeVertexNormals(); withSway(trunk, (p) => Math.pow(p.y / H, 2) * 0.25);
  // crown: fronds = folded ribbons along arching rachises
  const top = C(1); const fp: number[] = [], fu: number[] = [], fi: number[] = [], fs: number[] = []; const dp: number[] = [], du: number[] = [], di: number[] = [], ds: number[] = [];
  const nF = 15 + Math.floor(r() * 5);
  const ribbon = (P: number[], U: number[], I: number[], Sw: number[], a: number, e: number, L: number, W: number, droop: number) => {
    const base = P.length / 3, n = 18, h = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    for (let i = 0; i <= n; i++) { const s = i / n, c = top.clone().addScaledVector(h, L * s * Math.cos(e)).add(new THREE.Vector3(0, L * (Math.sin(e) * s - droop * s * s), 0));
      for (const [k, sx] of [[0, -1], [0.5, 0], [1, 1]] as [number, number][]) { const w = W * Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.05)), 0.6) * 0.5; const p = c.clone().addScaledVector(side, sx * w).add(new THREE.Vector3(0, -Math.abs(sx) * w * 0.55, 0)); P.push(p.x, p.y, p.z); U.push(k, s); Sw.push(s * s * L * 0.35); } }
    for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) { const a0 = base + i * 3 + k, b0 = a0 + 1, c0 = a0 + 3, d0 = c0 + 1; I.push(a0, c0, b0, b0, c0, d0); } };
  for (let f = 0; f < nF; f++) { const a = (f / nF) * Math.PI * 2 + r() * 0.3, young = f % 4 === 0; ribbon(fp, fu, fi, fs, a, young ? 0.9 + r() * 0.3 : 0.25 + r() * 0.35, 3.2 + r() * 1.2, 1.5 + r() * 0.3, young ? 0.4 : 0.85 + r() * 0.3); }
  for (let f = 0; f < 4; f++) ribbon(dp, du, di, ds, r() * Math.PI * 2, -1.2 - r() * 0.2, 1.8 + r() * 0.6, 0.4, 0.1);
  const mk = (P: number[], U: number[], I: number[], Sw: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setAttribute("aSway", new THREE.Float32BufferAttribute(Sw, 1)); g.setIndex(I); g.computeVertexNormals(); return g; };
  // coconuts
  const nuts: THREE.BufferGeometry[] = []; for (let k = 0; k < 7; k++) { const a = r() * Math.PI * 2; const s = new THREE.SphereGeometry(0.13, 10, 8); s.scale(1, 1.15, 1); s.translate(top.x + Math.cos(a) * 0.2, top.y - 0.25 - r() * 0.15, top.z + Math.sin(a) * 0.2); nuts.push(s); }
  const nut = withSway(mergeSimple(nuts), () => 0.05);
  return { trunk, fronds: mk(fp, fu, fi, fs), dead: mk(dp, du, di, ds), nut, H };
};
const mergeSimple = (gs: THREE.BufferGeometry[]) => { const pos: number[] = [], nrm: number[] = []; for (const g0 of gs) { const g = g0.index ? g0.toNonIndexed() : g0; pos.push(...(g.attributes.position.array as Float32Array)); nrm.push(...(g.attributes.normal.array as Float32Array)); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)); return g; };

// ---------------------------------------------------------------- broadleaf scrub / canopy (leaf-card crowns)
const leafTex = () => paintTex(512, 512, (g, r) => { g.clearRect(0, 0, 512, 512);
  // twig clusters of small glossy leaves (Pacific scrub: Barringtonia / Terminalia / Pandanus-like), darker inside, sun-lit rims
  for (let i = 0; i < 900; i++) { const x = 30 + r() * 452, y = 30 + r() * 452, dc = Math.hypot(x - 256, y - 256) / 256; if (dc > 1) continue; const a = r() * Math.PI * 2, L = 9 + r() * 12; g.save(); g.translate(x, y); g.rotate(a);
    const l = 0.55 + 0.45 * (1 - dc) * r(); const hue = r(); g.fillStyle = `rgb(${Math.round((30 + hue * 35) * l + 10)},${Math.round((70 + hue * 55) * l + 20)},${Math.round((22 + hue * 18) * l + 8)})`;
    g.beginPath(); g.ellipse(0, 0, L, L * 0.45, 0, 0, Math.PI * 2); g.fill(); if (r() < 0.35) { g.fillStyle = "rgba(220,240,170,0.35)"; g.beginPath(); g.ellipse(-L * 0.3, -L * 0.12, L * 0.5, L * 0.14, 0, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = "rgba(20,40,10,0.45)"; g.lineWidth = 1; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke(); g.restore(); } }, 51, true, false);
const crownGeo = (seed: number, R: number, trunkH: number) => { const r = rng(seed), P: number[] = [], U: number[] = [], S: number[] = [], I: number[] = [];
  for (let i = 0; i < 90; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, rr = R * (0.45 + 0.55 * Math.cbrt(r())); const c = new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(a) * rr, trunkH + R * 0.8 + u * rr * 0.7, Math.sqrt(1 - u * u) * Math.sin(a) * rr);
    const s = R * (0.36 + r() * 0.24), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3)); const b = P.length / 3;
    for (const [x, y, uu, vv] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) { const p = new THREE.Vector3(x * s, y * s, 0).applyQuaternion(q).add(c); P.push(p.x, p.y, p.z); U.push(uu, vv); S.push(Math.max(0, p.y - trunkH) * 0.15); }
    I.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); g.setAttribute("aSway", new THREE.Float32BufferAttribute(S, 1)); g.setIndex(I);
  // normals pointing out of the crown centre (soft, foliage-like shading)
  const N: number[] = []; for (let i = 0; i < P.length; i += 3) { const n = new THREE.Vector3(P[i], P[i + 1] - trunkH - R * 0.8, P[i + 2]).normalize(); N.push(n.x, n.y, n.z); } g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); return g; };

// ---------------------------------------------------------------- placement
type Tr = { p: V3; s: number; ry: number; v: number };
export const islandLayout = () => once("poIslandLayout", () => {
  const r = rng(5170), palms: Tr[] = [], scrub: Tr[] = [], canopy: Tr[] = [];
  const freeOfBuildings = (x: number, z: number) => BUILDINGS.every((b) => Math.hypot(x - b.p[0], z - b.p[2]) > b.r);
  for (let i = 0; i < 8000 && palms.length < 260; i++) { const x = -200 + r() * 420, z = -340 + r() * 300, d = shoreDist(x, z); if (d > -4 || d < -70 || !freeOfBuildings(x, z)) continue; if (d < -22 && r() < 0.55) continue;
    palms.push({ p: [x, height(x, z) - 0.1, z], s: 0.85 + r() * 0.35, ry: Math.atan2(-(z - ISLAND.cz), x - ISLAND.cx) + (r() - 0.5) * 1.6, v: Math.floor(r() * 6) }); }
  for (let i = 0; i < 6000 && scrub.length < 260; i++) { const x = -200 + r() * 420, z = -340 + r() * 300, d = shoreDist(x, z); if (d > -16 || d < -45 || !freeOfBuildings(x, z)) continue; scrub.push({ p: [x, height(x, z) - 0.2, z], s: 0.8 + r() * 0.9, ry: r() * 6, v: Math.floor(r() * 3) }); }
  for (let i = 0; i < 9000 && canopy.length < 420; i++) { const x = -200 + r() * 420, z = -340 + r() * 300, d = shoreDist(x, z); if (d > -38 || !freeOfBuildings(x, z)) continue; canopy.push({ p: [x, height(x, z) - 0.3, z], s: 0.9 + r() * 0.8, ry: r() * 6, v: 3 + Math.floor(r() * 3) }); }
  return { palms, scrub, canopy };
});
/** where the built things stand (also keeps palms out of them) */
type BK = "bure" | "cafe" | "kiosk" | "shed";
export const BUILDINGS: { k: BK; p: V3; ry: number; r: number }[] = ([
  { k: "cafe", p: [-20, 0, -78], ry: 0.12, r: 10 }, { k: "kiosk", p: [6.5, 0, -64.5], ry: -0.05, r: 3.5 },
  { k: "bure", p: [-48, 0, -79], ry: 0.32, r: 6 }, { k: "bure", p: [-68, 0, -88], ry: 0.45, r: 6 }, { k: "bure", p: [34, 0, -80], ry: -0.22, r: 6 }, { k: "bure", p: [54, 0, -88], ry: -0.36, r: 6 }, { k: "bure", p: [-88, 0, -103], ry: 0.6, r: 6 },
  { k: "shed", p: [24, 0, -68], ry: -0.1, r: 5 },
] as { k: BK; p: V3; ry: number; r: number }[]).map((b) => ({ ...b, p: [b.p[0], height(b.p[0], b.p[2]), b.p[2]] as V3 }));
export const JETTY = { x: 15, z0: -62, z1: -36, deck: 1.15, w: 1.8 };

// ---------------------------------------------------------------- buildings (Kit: merged per material, ink outlines)
const mats = () => once("poIslandMats", () => {
  const thatch = new THREE.MeshStandardMaterial({ map: scan("thatch_roof_angled", "diff"), normalMap: scan("thatch_roof_angled", "nor_gl"), roughness: 0.95, color: "#e8dcc0" });
  const plank = new THREE.MeshStandardMaterial({ map: scan("old_planks_02", "diff"), normalMap: scan("old_planks_02", "nor_gl"), roughness: 0.85 });
  const wood = new THREE.MeshStandardMaterial({ map: scan("dark_wood", "diff"), roughness: 0.75, color: "#c9a27a" });
  const weave = new THREE.MeshStandardMaterial({ map: paintTex(256, 256, (g, r) => { g.fillStyle = "#b99a62"; g.fillRect(0, 0, 256, 256); for (let y = 0; y < 256; y += 16) for (let x = 0; x < 256; x += 16) { const o = ((x + y) / 16) % 2; g.fillStyle = o ? `rgba(120,90,50,${0.35 + r() * 0.2})` : `rgba(230,205,150,${0.25 + r() * 0.2})`; g.fillRect(x + 1, y + 1, 14, 14); g.strokeStyle = "rgba(70,50,30,0.35)"; g.strokeRect(x + 0.5, y + 0.5, 15, 15); } }, 61), roughness: 0.9 });
  const white = new THREE.MeshStandardMaterial({ color: "#f1ede2", roughness: 0.6 }), blue = new THREE.MeshStandardMaterial({ color: "#2f6f9f", roughness: 0.55 }), dark = new THREE.MeshStandardMaterial({ color: "#2a2420", roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: "#1e3440", roughness: 0.15, metalness: 0.2 }), cushion = new THREE.MeshStandardMaterial({ color: "#d9573a", roughness: 0.85 }), cushion2 = new THREE.MeshStandardMaterial({ color: "#2f8f8a", roughness: 0.85 });
  const glassfibre = new THREE.MeshStandardMaterial({ color: "#f3f1ea", roughness: 0.35 }), hullBlue = new THREE.MeshStandardMaterial({ color: "#2b5e8c", roughness: 0.4 }), yellow = new THREE.MeshStandardMaterial({ color: "#f0c22e", roughness: 0.45 }), red = new THREE.MeshStandardMaterial({ color: "#c8452e", roughness: 0.55 });
  const kioskSign = new THREE.MeshStandardMaterial({ map: signTex([{ t: "UNDERWATER POST OFFICE", size: 64, y: 84 }, { t: "WATERPROOF POSTCARDS", size: 54, y: 168, col: "#c8452e" }], 1024, 256, "#f6efd8", "#2f5d8a", 12), roughness: 0.6 });
  const jettySign = new THREE.MeshStandardMaterial({ map: signTex([{ t: "UNDERWATER", size: 92, y: 80 }, { t: "POST OFFICE  →  50 m", size: 70, y: 176, col: "#c8452e" }], 1024, 256, "#f6efd8", "#2f5d8a", 13), roughness: 0.6 });
  return { thatch, plank, wood, weave, white, blue, dark, glass, cushion, cushion2, glassfibre, hullBlue, yellow, red, kioskSign, jettySign };
});
const hipRoof = (K: Kit, m: THREE.Material, L: number, W: number, y: number, rise: number, over = 0.6) => { // four sloped thatch planes
  const l = L / 2 + over, w = W / 2 + over; const sh = (pts: [number, number, number][]) => { const g = new THREE.BufferGeometry(); const P = new Float32Array(pts.flat()); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); const uv = new Float32Array(pts.length * 2); pts.forEach((p, i) => { uv[i * 2] = p[0] + p[2]; uv[i * 2 + 1] = Math.hypot(p[1] - y, Math.min(Math.abs(p[0]), Math.abs(p[2]))); }); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; };
  const top = y + rise, rl = Math.max(0.2, l - w);
  K.add(m, sh([[-l, y, w], [l, y, w], [rl, top, 0], [-l, y, w], [rl, top, 0], [-rl, top, 0]]), [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: 0.5 });
  K.add(m, sh([[l, y, -w], [-l, y, -w], [-rl, top, 0], [l, y, -w], [-rl, top, 0], [rl, top, 0]]), [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: 0.5 });
  K.add(m, sh([[l, y, w], [l, y, -w], [rl, top, 0]]), [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: 0.5 }); K.add(m, sh([[-l, y, -w], [-l, y, w], [-rl, top, 0]]), [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: 0.5 });
  // thatch thickness at the eaves (fringe)
  for (const [a, b] of [[[-l, w], [l, w]], [[l, -w], [-l, -w]], [[l, w], [l, -w]], [[-l, -w], [-l, w]]] as [number, number][][]) K.rod(m, [a[0], y - 0.06, a[1]], [b[0], y - 0.06, b[1]], 0.12, 6, { ink: 0.5 });
};
const bureKit = () => once("poBure", () => { const m = mats(), K = new Kit(); const L = 5, W = 4, fl = 0.7, wh = 2.3;
  for (const [x, z] of [[-2.4, -1.9], [2.4, -1.9], [-2.4, 1.9], [2.4, 1.9], [-2.4, 3.6], [2.4, 3.6], [0, 3.6], [0, -1.9]]) K.cyl(m.wood, 0.09, 0.1, fl + (z > 3 ? 2.3 : 0.05), [x, (fl + (z > 3 ? 2.3 : 0.05)) / 2, z], [0, 0, 0], 8);
  K.box(m.plank, [L + 0.2, 0.12, W + 2.2], [0, fl, 0.9]);
  K.box(m.weave, [L, wh, 0.1], [0, fl + wh / 2, -W / 2]); K.box(m.weave, [0.1, wh, W], [-L / 2, fl + wh / 2, 0]); K.box(m.weave, [0.1, wh, W], [L / 2, fl + wh / 2, 0]);
  K.box(m.weave, [1.6, wh, 0.1], [-1.7, fl + wh / 2, W / 2]); K.box(m.weave, [1.6, wh, 0.1], [1.7, fl + wh / 2, W / 2]); K.box(m.weave, [1.8, 0.5, 0.1], [0, fl + wh - 0.25, W / 2]);
  K.box(m.dark, [1.6, 1.6, 0.04], [0, fl + 0.8, W / 2 - 0.08]);
  for (const sx of [-1.7, 1.7]) { K.box(m.glass, [0.9, 0.8, 0.04], [sx, fl + 1.35, W / 2 + 0.06]); K.box(m.wood, [1.0, 0.08, 0.12], [sx, fl + 0.92, W / 2 + 0.08]); }
  for (let x = -2.4; x <= 2.41; x += 0.6) K.cyl(m.wood, 0.03, 0.03, 0.9, [x, fl + 0.45, 3.8], [0, 0, 0], 6); K.box(m.wood, [5.0, 0.08, 0.1], [0, fl + 0.9, 3.8]);
  hipRoof(K, m.thatch, L, W + 1.8, fl + wh, 2.1, 0.8);
  K.box(m.cushion, [0.7, 0.35, 1.8], [-1.6, fl + 0.25, 2.8]); K.box(m.cushion2, [0.7, 0.35, 1.8], [1.6, fl + 0.25, 2.8]);
  return K; });
const cafeKit = () => once("poCafe", () => { const m = mats(), K = new Kit(); const L = 14, W = 9;
  K.box(m.plank, [L, 0.2, W], [0, 0.45, 0]); for (let x = -L / 2 + 0.5; x <= L / 2 - 0.4; x += 3.25) for (const z of [-W / 2 + 0.4, W / 2 - 0.4]) K.cyl(m.wood, 0.14, 0.16, 3.4, [x, 2.0, z], [0, 0, 0], 10);
  hipRoof(K, m.thatch, L, W, 3.6, 3.2, 1.2);
  K.box(m.wood, [5.5, 1.1, 0.8], [-3.5, 1.1, -W / 2 + 1.2]); K.box(m.plank, [5.7, 0.08, 1.0], [-3.5, 1.7, -W / 2 + 1.2]);
  for (let k = 0; k < 6; k++) K.cyl(m.white, 0.2, 0.2, 0.75, [-5.6 + k * 0.9, 0.95, -W / 2 + 2.1], [0, 0, 0], 10);
  for (const s of [-1, 1]) K.box(m.wood, [L, 0.12, 0.12], [0, 3.55, s * (W / 2 - 0.4)]);
  // steps down to the sand
  for (let k = 0; k < 3; k++) K.box(m.plank, [3, 0.15, 0.4], [3, 0.38 - k * 0.15, W / 2 + 0.2 + k * 0.4]);
  return K; });
const kioskKit = () => once("poKiosk", () => { const m = mats(), K = new Kit();
  for (const [x, z] of [[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]]) K.cyl(m.wood, 0.07, 0.08, 2.5, [x, 1.25, z], [0, 0, 0], 8);
  K.box(m.weave, [2.6, 1.0, 0.08], [0, 0.55, -1]); K.box(m.weave, [0.08, 1.0, 2.0], [-1.3, 0.55, 0]); K.box(m.weave, [0.08, 1.0, 2.0], [1.3, 0.55, 0]);
  K.box(m.wood, [2.6, 0.95, 0.5], [0, 0.48, 1.0]); K.box(m.plank, [2.8, 0.06, 0.75], [0, 1.0, 1.05]);
  hipRoof(K, once("poKioskThatch", () => { const t = m.thatch.clone(); t.side = THREE.DoubleSide; return t; }), 2.6, 2.0, 2.45, 1.3, 0.55);   // seen from under the eave in the close shot
  K.box(m.wood, [2.4, 0.6, 0.04], [0, 2.1, 1.12], [0, 0, 0], { ink: 0.3 });                                              // sign board
  K.add(m.kioskSign, new THREE.PlaneGeometry(2.34, 0.56), [0, 2.1, 1.145], [0, 0, 0], [1, 1, 1], { ink: 0 });          // painted face, toward the beach
  // postcard display rack on the back wall
  K.box(m.wood, [1.8, 0.9, 0.08], [0, 1.45, -0.94]);
  return K; });
const shedKit = () => once("poShed", () => { const m = mats(), K = new Kit(); K.box(m.weave, [4, 2.4, 3], [0, 1.2, 0]); hipRoof(K, m.thatch, 4, 3, 2.4, 1.4, 0.5); K.box(m.dark, [1.4, 1.9, 0.04], [0, 0.95, 1.52]); return K; });
const jettyKit = () => once("poJetty", () => { const m = mats(), K = new Kit(); const { z0, z1, deck, w } = JETTY;
  for (let z = z0; z <= z1 + 0.01; z += 2.2) for (const sx of [-w / 2, w / 2]) { const gy = height(JETTY.x + sx, z); K.cyl(m.wood, 0.1, 0.12, deck - gy + 0.4, [sx, (deck + gy - 0.4) / 2, z], [0, 0, 0], 8); }
  for (let z = z0; z < z1; z += 0.24) K.box(m.plank, [w + 0.2, 0.06, 0.2], [0, deck, z + 0.12], [0, (Math.sin(z * 7.3) * 0.01), 0]);
  for (const sx of [-w / 2 - 0.05, w / 2 + 0.05]) K.box(m.wood, [0.12, 0.22, z1 - z0], [sx, deck - 0.12, (z0 + z1) / 2]);
  // the stair into the water at the seaward end: stringers + treads down to ~1 m below the surface
  for (let k = 0; k < 9; k++) K.box(m.plank, [1.2, 0.05, 0.26], [0, deck - 0.24 - k * 0.27, z1 + 0.25 + k * 0.26]);
  for (const sx of [-0.62, 0.62]) { K.rod(m.wood, [sx, deck, z1], [sx, deck - 2.6, z1 + 2.5], 0.05, 6); K.rod(m.wood, [sx, deck + 0.9, z1], [sx, deck - 1.4, z1 + 2.4], 0.035, 6); }
  K.cyl(m.wood, 0.06, 0.06, 1.6, [-1.15, deck + 0.8, z0 + 1.2], [0, 0, 0], 8); K.box(m.jettySign, [1.4, 0.36, 0.04], [-1.15, deck + 1.5, z0 + 1.24], [0, 0, 0], { ink: 0.3 }); K.box(m.wood, [1.44, 0.4, 0.03], [-1.15, deck + 1.5, z0 + 1.2], [0, 0, 0], { ink: false });
  return K; });
/** fibreglass dinghy with an outboard (lofted hull) */
const boatKit = (len: number, key: string, hullMat: "hullBlue" | "white" | "yellow") => once(`poBoat${key}`, () => { const m = mats(), K = new Kit(); const B = len * 0.36;
  const sec = (u: number) => { const w = B / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.95)), 0.55), d = 0.55; return { w, d, y0: 0.12 * (1 - u) * (1 - u) * 0 + Math.pow(Math.max(0, u - 0.7) / 0.3, 2) * 0.35 }; };
  const P: number[] = [], I: number[] = [], n = 24, k = 8; for (let i = 0; i <= n; i++) { const u = i / n, s = sec(u), x = -len / 2 + u * len; for (let j = 0; j <= k; j++) { const a = (j / k) * Math.PI; P.push(x, s.y0 + s.d - Math.sin(a) * s.d * (1 - s.y0), Math.cos(a) * s.w); } }
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) { const a = i * (k + 1) + j, b = a + 1, c = a + k + 1, d = c + 1; I.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  K.add(m[hullMat], g, [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: 0.5 }); const gi = g.clone(); gi.scale(0.96, 0.95, 0.94); gi.translate(0, 0.04, 0); const ix = gi.index!.array as Uint32Array | Uint16Array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } gi.computeVertexNormals(); K.add(m.white, gi, [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: false });
  K.box(m.white, [0.25, 0.06, B * 0.9], [-len * 0.05, 0.42, 0]); K.box(m.white, [0.25, 0.06, B * 0.7], [len * 0.22, 0.42, 0]);
  K.box(m.dark, [0.35, 0.5, 0.3], [-len / 2 - 0.12, 0.65, 0]); K.box(m.dark, [0.08, 0.7, 0.1], [-len / 2 - 0.18, 0.2, 0]); K.cyl(m.dark, 0.06, 0.06, 0.1, [-len / 2 - 0.18, -0.15, 0], [Math.PI / 2, 0, 0], 8);
  K.rod(m.white, [-len / 2 + 0.2, 0.6, B / 2 - 0.02], [len / 2 - 0.4, 0.62, B / 2 - 0.05], 0.03, 6); K.rod(m.white, [-len / 2 + 0.2, 0.6, -B / 2 + 0.02], [len / 2 - 0.4, 0.62, -B / 2 + 0.05], 0.03, 6);
  return K; });
export const BOATS: { p: V3; ry: number; len: number; key: string; hull: "hullBlue" | "white" | "yellow" }[] = [
  { p: [19.5, 0, -42], ry: 1.35, len: 4.6, key: "a", hull: "hullBlue" }, { p: [10.5, 0, -45.5], ry: 1.75, len: 4.0, key: "b", hull: "white" }, { p: [-34, 0, -40], ry: 0.4, len: 5.2, key: "c", hull: "yellow" },
];

// ---------------------------------------------------------------- mainland + clouds
const mainlandGeo = () => { const nx = 220, nz = 40, P: number[] = [], C: number[] = [], I: number[] = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = -5200 + i * (10400 / nx), z = -1500 - j * 60, ridge = Math.sin(Math.PI * j / nz), hgt = Math.max(0, ridge * (60 + 260 * fbm(x / 900 + 4, j / 9, 5)) + (j < 2 ? -2 : 0)); P.push(x, hgt - 1.5, z);
    const g = new THREE.Color().setHSL(0.27 + 0.03 * fbm(x / 300, z / 300), 0.45, 0.16 + 0.1 * fbm(x / 120, z / 120)); if (j === 0) g.setRGB(0.85, 0.8, 0.66); C.push(g.r, g.g, g.b); }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; I.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I); g.computeVertexNormals(); return g; };
const cloudTex = (seed: number) => paintTex(512, 256, (g, r) => { g.clearRect(0, 0, 512, 256); for (let i = 0; i < 70; i++) { const x = 70 + r() * 372, y = 120 + (r() - 0.6) * 70 * (1 - Math.abs(x - 256) / 300), rr = 26 + r() * 48;
  const gr = g.createRadialGradient(x, y - rr * 0.3, rr * 0.1, x, y, rr); gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.6, "rgba(246,248,252,0.75)"); gr.addColorStop(1, "rgba(220,228,240,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
  const sh = g.createLinearGradient(0, 120, 0, 220); sh.addColorStop(0, "rgba(160,175,195,0)"); sh.addColorStop(1, "rgba(150,165,185,0.5)"); g.globalCompositeOperation = "source-atop"; g.fillStyle = sh; g.fillRect(0, 0, 512, 256); }, seed, true, false);
const CLOUDS = Array.from({ length: 26 }, (_, i) => { const r = rng(900 + i); const a = r() * Math.PI * 2, d = 1800 + r() * 4500; return { p: [Math.cos(a) * d, 520 + r() * 600, Math.sin(a) * d - 600] as V3, s: 700 + r() * 900, k: i % 4 }; });

export const Island: React.FC<{ t: number; cam: V3; hi: boolean; noJetty?: boolean; boats?: boolean }> = ({ t, cam, boats = true }) => {
  const R = useMemo(() => once("poIslandRes", () => {
    const fr = windMat(new THREE.MeshStandardMaterial({ map: frondTex(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 }), 0.22, "frond");
    const dead = windMat(new THREE.MeshStandardMaterial({ map: deadTex(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 }), 0.12, "dead");
    const bark = windMat(new THREE.MeshStandardMaterial({ map: scan("palm_tree_bark", "diff"), normalMap: scan("palm_tree_bark", "nor_gl"), roughness: 0.9 }), 0.2, "bark");
    const nut = windMat(new THREE.MeshStandardMaterial({ color: "#7a6a2a", roughness: 0.6 }), 0.2, "nut");
    const leaf = windMat(new THREE.MeshStandardMaterial({ map: leafTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }), 0.12, "leaf");
    const stem = new THREE.MeshStandardMaterial({ color: "#5a4632", roughness: 0.9 });
    const palms = Array.from({ length: 6 }, (_, v) => palmGeo(301 + v * 17));
    const crowns = [[2.2, 0.4], [1.7, 0.2], [2.6, 0.6], [4.5, 4.5], [5.5, 6], [4, 3.6]].map(([Rr, h], v) => crownGeo(700 + v, Rr, h));
    const mainland = new THREE.Mesh(mainlandGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    const clouds = [0, 1, 2, 3].map((k) => new THREE.SpriteMaterial({ map: cloudTex(30 + k), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
    return { fr, dead, bark, nut, leaf, stem, palms, crowns, mainland, clouds };
  }), []);
  const L = islandLayout();
  const inst = useMemo(() => {
    const out: THREE.InstancedMesh[] = []; const M = new THREE.Matrix4(), Q = new THREE.Quaternion();
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, list: Tr[], cast = true) => { if (!list.length) return; const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((it, i) => { Q.setFromEuler(new THREE.Euler(0, it.ry, 0)); M.compose(new THREE.Vector3(...it.p), Q, new THREE.Vector3(it.s, it.s, it.s)); im.setMatrixAt(i, M); }); im.castShadow = cast; im.receiveShadow = true; im.computeBoundingSphere(); out.push(im); };
    for (let v = 0; v < 6; v++) { const list = L.palms.filter((p) => p.v === v); const P = R.palms[v]; add(P.trunk, R.bark, list); add(P.fronds, R.fr, list); add(P.dead, R.dead, list); add(P.nut, R.nut, list); }
    for (let v = 0; v < 6; v++) { const list = [...L.scrub, ...L.canopy].filter((p) => p.v === v); add(R.crowns[v], R.leaf, list); const trunk = new THREE.CylinderGeometry(0.12, 0.2, v < 3 ? 0.6 : 5, 7); trunk.translate(0, v < 3 ? 0.3 : 2.5, 0); withSway(trunk, () => 0); add(trunk, R.stem, list.filter(() => v >= 3)); }
    return out;
  }, [L, R]);
  for (const m of [R.fr, R.dead, R.bark, R.nut, R.leaf]) setT(m, t);
  void cam;
  return (<group>
    {inst.map((m, i) => <primitive key={i} object={m} />)}
    <primitive object={R.mainland} />
    {CLOUDS.map((c, i) => <sprite key={i} position={[c.p[0] + t * 1.5, c.p[1], c.p[2]]} scale={[c.s * 2, c.s, 1]} material={R.clouds[c.k]} />)}
    {BUILDINGS.map((b, i) => <group key={i} position={b.p} rotation={[0, b.ry, 0]}><KitMesh kit={b.k === "bure" ? bureKit() : b.k === "cafe" ? cafeKit() : b.k === "kiosk" ? kioskKit() : shedKit()} /></group>)}
    {b0(cafeKit) && <CafeFurniture />}
    <group position={[JETTY.x, 0, 0]}><KitMesh kit={jettyKit()} /></group>
    {boats && BOATS.map((b, i) => { const y = waveY(b.p[0], b.p[2], t), roll = Math.sin(t * 1.3 + i * 2) * 0.04, pitch = Math.sin(t * 0.9 + i) * 0.025;
      return <group key={i} position={[b.p[0], y - 0.22, b.p[2]]} rotation={[roll, b.ry, pitch]}><KitMesh kit={boatKit(b.len, b.key, b.hull)} /></group>; })}
    <BeachProps />
  </group>);
};
const b0 = (f: () => unknown) => !!f;
/** tables + chairs on the restaurant deck (CC0 models) */
const CafeFurniture: React.FC = () => { const parts = useMemo(() => model("outdoor_table_chair_set_01"), []); const cafe = BUILDINGS[0];
  return <group position={cafe.p} rotation={[0, cafe.ry, 0]}>{[[-4, 1.5], [0, 1.6], [4, 1.4], [-2, -1.2], [2.5, -1.0]].map(([x, z], i) => <group key={i} position={[x, 0.56, z]} rotation={[0, i * 0.7, 0]}>{parts.map((p, j) => <mesh key={j} geometry={p.geo} material={p.mat} castShadow receiveShadow />)}</group>)}</group>; };
/** kayaks, loungers + umbrella, a few coconuts and driftwood on the beach */
const beachKit = () => once("poBeach", () => { const m = mats(), K = new Kit();
  const kayak = (x: number, z: number, ry: number, mat: THREE.Material) => { const g = new THREE.SphereGeometry(1, 20, 10); g.scale(1.6, 0.17, 0.34); K.add(mat, g, [x, height(x, z) + 0.12, z], [0, ry, 0], [1, 1, 1], { ink: 0.5 }); };
  kayak(-8, -55.5, 0.3, m.yellow); kayak(-6.6, -55.8, 0.25, m.red); kayak(-5.2, -55.4, 0.4, m.hullBlue);
  for (const [x, z, ry] of [[-28, -58, 0.1], [-25.5, -58.3, 0.05], [30, -59, -0.2]]) { const y = height(x, z); K.box(m.white, [0.7, 0.08, 1.9], [x, y + 0.35, z], [0.0, ry, 0]); K.box(m.white, [0.7, 0.08, 0.7], [x, y + 0.6, z - 0.9], [-0.7, ry, 0]); K.box(m.cushion2, [0.66, 0.06, 1.8], [x, y + 0.42, z], [0, ry, 0], { ink: false }); for (const sx of [-0.3, 0.3]) for (const sz of [-0.8, 0.8]) K.cyl(m.white, 0.03, 0.03, 0.35, [x + sx, y + 0.17, z + sz], [0, 0, 0], 6); }
  for (const [x, z] of [[-26.8, -59.6], [31.4, -60.5]]) { const y = height(x, z); K.cyl(m.wood, 0.03, 0.03, 2.4, [x, y + 1.2, z], [0, 0, 0], 6); K.add(m.blue, new THREE.ConeGeometry(1.4, 0.5, 10, 1, true), [x, y + 2.35, z], [0, 0, 0], [1, 1, 1], { ink: 0.5 }); }
  for (let i = 0; i < 14; i++) { const r = rng(400 + i), x = -40 + r() * 80, z = -52 - r() * 10, y = height(x, z); K.sphere(m.dark, 0.11, [x, y + 0.08, z], [1, 1.1, 1], { ink: false }); }
  for (const [x, z, a, l] of [[-14, -55, 0.4, 2.6], [22, -56, -0.7, 1.8], [-40, -57, 1.2, 3.1]]) K.rod(m.wood, [x, height(x, z) + 0.08, z], [x + Math.cos(a) * l, height(x + Math.cos(a) * l, z + Math.sin(a) * l) + 0.08, z + Math.sin(a) * l], 0.08, 7, { ink: 0.5 });
  return K; });
const BeachProps: React.FC = () => <KitMesh kit={beachKit()} />;
