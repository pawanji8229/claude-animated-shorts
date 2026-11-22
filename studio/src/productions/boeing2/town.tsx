// The two kinds of houses: the rooftop CAMOUFLAGE town (stage props: canvas walls on light timber frames, open at the
// back with diagonal bracing, painted windows and doors, painted streets on burlap "lawn", chicken-wire trees with
// feathers, burlap hedges, picket fences) and the REAL neighbourhoods around the plant (solid houses, real gardens,
// trees, garages, streets with period cars). Same generator, so from the air the two read alike - that was the point.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { archMats } from "../short3/archKit";
import { cm } from "../centennial/mats";
import { FX, FZ, ROOF_Y } from "./factory";
import { rng, type V3 } from "../../lib/math";
import { pm } from "./pbr";
import { Instances, camoAt, CAMO_TINTS, type Place } from "./models";

const std = (c: string, r = 0.85, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
const canvasTex = (base: string, seed: number, weave = true) => { const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d")!, r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${0.03 + r() * 0.04})`; g.fillRect(r() * 128, r() * 128, 1 + r() * 3, 1 + r() * 3); }
  if (weave) { g.strokeStyle = "rgba(0,0,0,0.05)"; for (let i = 0; i < 128; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; };
const tm = (base: string, seed: number, rep = 1, rough = 0.9, weave = true) => { const t = canvasTex(base, seed, weave); t.repeat.set(1 / rep, 1 / rep); return new THREE.MeshStandardMaterial({ map: t, roughness: rough }); };
export const tMats = () => once("b2TownMats", () => ({
  // real scanned PBR surfaces (v2): clapboard siding + shingles tinted per house
  walls: ["#f4ead2", "#efdcae", "#d6e4cc", "#e2d0bc", "#cad8e4", "#f0d0c0", "#fbf8ee", "#e2e6c6", "#d4c2a2"].map((c) => pm("siding", 2.2, { tint: c })),
  roofs: ["#a05a48", "#7d6a5e", "#6e7a66", "#8a8f92", "#aa7a5a", "#5f6a75", "#936654"].map((c) => pm("shingle", 1.6, { tint: c })),
  trim: std("#f4f2ea", 0.6), window: std("#2a3440", 0.3, { metalness: 0.3 }), windowLit: std("#3a4652", 0.25, { metalness: 0.35, envMapIntensity: 1.4 }),
  door: ["#6a2e22", "#2f4a3a", "#2a3a5a", "#5a4a3a"].map((c) => std(c, 0.6)),
  lawnFake: pm("grass", 3.5, { tint: "#b8c890" }), lawnReal: pm("grass", 3, { tint: "#d8e0b8" }), road: pm("asphalt", 4, { tint: "#d6d6d2" }), roadReal: pm("asphalt", 4), curb: pm("sidewalk", 2.5),
  burlap: tm("#5f7440", 54, 0.8, 0.95), burlapDk: tm("#4e6236", 55, 0.8, 0.95), feather: tm("#3f5a32", 56, 0.5, 0.95), featherB: tm("#4d6a38", 57, 0.5, 0.95), leaf: tm("#466b34", 58, 0.6, 0.9), leafB: tm("#5a7a3a", 59, 0.6, 0.9),
  bark: std("#4a3a2c", 0.9), timber: pm("planks", 1.5, { tint: "#e8d0a8" }), brick: pm("brick", 2.2), fence: std("#ece8dc", 0.7), garden: tm("#6a4a32", 60, 1, 0.95), flowers: tm("#c8a03a", 61, 0.5, 0.9),
  ground: pm("grassph", 5, { tint: "#d8dcb8" }), water: new THREE.MeshPhysicalMaterial({ color: "#3e5a64", roughness: 0.18, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.4 }),
  rail: std("#4a4038", 0.9), boxcar: ["#7a3a2a", "#6a4030", "#5a3a2e"].map((c) => std(c, 0.8)), industrial: ["#8a7a6a", "#7a6a5a", "#9a8a72"].map((c, i) => tm(c, 70 + i, 2)),
}));

export type HouseSpec = { x: number; z: number; ry: number; w: number; d: number; h: number; roof: "gable" | "hip"; wall: number; roofC: number; door: number; chimney: boolean; porch: boolean; seed: number };
const houseSpec = (x: number, z: number, ry: number, seed: number): HouseSpec => { const r = rng(seed);
  return { x, z, ry, w: 6 + r() * 2.6, d: 5.6 + r() * 2.2, h: 2.6 + r() * 0.7, roof: r() < 0.62 ? "gable" : "hip", wall: Math.floor(r() * 9), roofC: Math.floor(r() * 7), door: Math.floor(r() * 4), chimney: r() < 0.7, porch: r() < 0.55, seed }; };
/** one house into kit k at its lot (local origin = lot front-centre at ground). fake = canvas prop, open back + bracing */
export type HousePart = "all" | "frame" | "walls" | "roof" | "garden";
export const addHouse = (k: Kit, s: HouseSpec, fake: boolean, y0: number, far = false, part: HousePart = "all") => { const P = (x: HousePart) => part === "all" || part === x; const T = tMats(), h = new Kit(), hw = s.w / 2, hd = s.d / 2, W = T.walls[s.wall], R = T.roofs[s.roofC];
  const cz = -3.2 - hd;    // house centre behind a 3.2 m front garden
  if (!fake && P("garden")) { const lw = far ? 11 : 11.5; h.span(T.lawnReal, [-lw / 2, 0.005, cz - hd - 5], [lw / 2, 0.02, -0.15], { ink: false }); }
  if (far) { h.box(W, [s.w, s.h, s.d], [0, s.h / 2, cz], [0, 0, 0], { ink: false }); h.add(R, prism(s.w + 0.5, 1.6 + s.w * 0.12, s.d + 0.5), [0, s.h, cz], [0, 0, 0], [1, 1, 1], { ink: false });
    const tr2 = rng(s.seed); if (tr2() < 0.8) h.sphere(tr2() < 0.5 ? T.leaf : T.leafB, 2.0 + tr2(), [s.w * 0.45, 3.0, -1.6], [1, 0.9, 1], { ink: false }); if (tr2() < 0.5) h.sphere(T.leaf, 2.4, [-s.w * 0.3, 3.4, cz - hd - 2.5], [1, 0.9, 1], { ink: false }); k.merge(h, [s.x, y0, s.z], [0, s.ry, 0]); return; }
  const th = fake ? 0.03 : 0.2;
  // walls: front + sides (+ back for real houses)
  if (P("walls")) { h.span(W, [-hw, 0, cz + hd - th], [hw, s.h, cz + hd]);
  for (const sx of [-1, 1]) h.span(W, [sx > 0 ? hw - th : -hw, 0, cz - hd], [sx > 0 ? hw : -hw + th, s.h, cz + hd - th]);
  if (!fake) h.span(W, [-hw + th, 0, cz - hd], [hw - th, s.h, cz - hd + th]); }
  if (fake && P("frame")) { // open back: timber frame + diagonal braces + props holding the façade
    for (const x of [-hw + 0.1, -hw / 3, hw / 3, hw - 0.1]) { h.span(T.timber, [x - 0.05, 0, cz + hd - 0.15], [x + 0.05, s.h, cz + hd - 0.05], { ink: 0.4 }); h.rod(T.timber, [x, s.h * 0.85, cz + hd - 0.12], [x, 0.02, cz + hd - 2.2], 0.045, 5, { ink: 0.3 }); }
    h.span(T.timber, [-hw, s.h - 0.12, cz + hd - 0.16], [hw, s.h, cz + hd - 0.05], { ink: 0.3 }); h.span(T.timber, [-hw, 0, cz - hd], [hw, 0.1, cz - hd + 0.1], { ink: 0.3 });
    for (const sx of [-1, 1]) { h.rod(T.timber, [sx * (hw - 0.08), 0.05, cz - hd], [sx * (hw - 0.08), s.h, cz - hd + 0.05], 0.05, 5, { ink: 0.3 }); h.rod(T.timber, [sx * (hw - 0.08), 0.1, cz - hd], [sx * (hw - 0.08), s.h - 0.1, cz + hd - 0.2], 0.035, 4, { ink: false }); } }
  // roof (canvas over rafters for the fakes)
  const rh = 1.5 + s.w * 0.12; if (P("roof")) { if (s.roof === "gable") h.add(R, prism(s.w + 0.6, rh, s.d + 0.6), [0, s.h, cz]); else h.add(R, hip(s.w + 0.6, rh * 0.85, s.d + 0.6), [0, s.h, cz]);
  if (s.chimney) { const cx = (rng(s.seed + 3)() - 0.5) * s.w * 0.6; h.span(T.brick, [cx - 0.3, s.h + 0.4, cz - 0.3], [cx + 0.3, s.h + rh + 0.7, cz + 0.3], { ink: 0.4 }); h.span(T.trim, [cx - 0.36, s.h + rh + 0.7, cz - 0.36], [cx + 0.36, s.h + rh + 0.8, cz + 0.36], { ink: false }); } }
  // front: door + windows (painted on the fakes), trim, porch, steps
  const fz = cz + hd + 0.004;
  if (P("walls")) {
  h.span(T.door[s.door], [-0.45, 0.05, fz], [0.45, 2.05, fz + 0.03]); h.span(T.trim, [-0.55, 2.05, fz], [0.55, 2.15, fz + 0.04], { ink: false });
  for (const x of [-hw * 0.58, hw * 0.58]) { h.span(T.trim, [x - 0.62, 0.92, fz], [x + 0.62, 2.12, fz + 0.03], { ink: false }); h.span(fake ? T.window : T.windowLit, [x - 0.52, 1.0, fz + 0.02], [x + 0.52, 2.04, fz + 0.035], { ink: false });
    h.span(T.trim, [x - 0.03, 1.0, fz + 0.035], [x + 0.03, 2.04, fz + 0.045], { ink: false }); h.span(T.trim, [x - 0.52, 1.5, fz + 0.035], [x + 0.52, 1.55, fz + 0.045], { ink: false }); }
  for (const sx of [-1, 1]) { h.span(T.trim, [sx * hw - 0.002, 1.0, cz - 0.6], [sx * hw + 0.002 * sx + (sx > 0 ? 0.03 : -0.03), 2.0, cz + 0.6], { ink: false }); }
  if (s.porch) { h.span(T.trim, [-1.3, 2.3, fz], [1.3, 2.4, fz + 1.4]); for (const sx of [-1, 1]) h.rod(T.trim, [sx * 1.2, 0, fz + 1.3], [sx * 1.2, 2.3, fz + 1.3], 0.06, 6); }
  h.span(T.curb, [-0.8, 0, fz], [0.8, 0.18, fz + 0.5], { ink: false }); }
  if (P("garden")) {
  // front garden: path, hedge (burlap on the fakes), flower bed, picket fence, a tree (chicken wire + feathers / real)
  h.span(T.curb, [-0.45, 0.01, fz + 0.5], [0.45, 0.03, 0], { ink: false });
  for (const sx of [-1, 1]) h.span(fake ? T.burlapDk : T.leafB, [sx * 1.1, 0, -1.4], [sx * (hw - 0.3), 0.7, -0.9], { ink: 0.4 });
  h.span(T.garden, [hw * 0.2, 0.01, fz + 0.4], [hw - 0.3, 0.08, fz + 1.1], { ink: false }); h.span(T.flowers, [hw * 0.25, 0.08, fz + 0.5], [hw - 0.4, 0.2, fz + 1.0], { ink: false });
  for (let x = -hw; x <= hw + 0.01; x += 0.32) if (Math.abs(x) > 0.55) h.box(T.fence, [0.06, 0.8, 0.03], [x, 0.4, -0.25], [0, 0, 0], { ink: false });
  for (const y of [0.25, 0.62]) for (const sx of [-1, 1]) h.span(T.fence, [sx > 0 ? 0.55 : -hw, y, -0.28], [sx > 0 ? hw : -0.55, y + 0.06, -0.24], { ink: false });
  const tr = rng(s.seed + 7); if (tr() < 0.8) { const tx = (tr() < 0.5 ? -1 : 1) * (hw - 1.2), tz = -2.0, H = 3.2 + tr() * 2.5, Rr = 1.3 + tr() * 0.9;
    h.cyl(T.bark, 0.1, 0.16, H * 0.6, [tx, H * 0.3, tz], [0, 0, 0], 8);
    const L = fake ? (tr() < 0.5 ? T.feather : T.featherB) : (tr() < 0.5 ? T.leaf : T.leafB);
    for (let i = 0; i < (fake ? 4 : 6); i++) { const a = i * 2.1 + tr(), rr = Rr * (0.55 + tr() * 0.35); h.sphere(L, rr, [tx + Math.cos(a) * Rr * 0.4, H * 0.62 + tr() * Rr * 0.6, tz + Math.sin(a) * Rr * 0.4], [1, fake ? 0.78 : 0.9, 1], { ink: 0.35 }); } } }
  k.merge(h, [s.x, y0, s.z], [0, s.ry, 0]);
};
const prism = (w: number, h: number, d: number) => { const g = new THREE.BufferGeometry(); const x = w / 2, z = d / 2;
  const v = [-x, 0, z, x, 0, z, 0, h, z, x, 0, -z, -x, 0, -z, 0, h, -z, -x, 0, -z, -x, 0, z, 0, h, z, -x, 0, -z, 0, h, z, 0, h, -z, x, 0, z, x, 0, -z, 0, h, -z, x, 0, z, 0, h, -z, 0, h, z];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); const uv: number[] = []; for (let i = 0; i < v.length; i += 3) uv.push(v[i] + v[i + 2], v[i + 1] * 1.4 + v[i + 2]); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; };
const hip = (w: number, h: number, d: number) => { const g = new THREE.ConeGeometry(Math.hypot(w, d) / 2, h, 4, 1); g.rotateY(Math.PI / 4); g.scale(w / Math.hypot(w, d) * 1.414, 1, d / Math.hypot(w, d) * 1.414); g.translate(0, h / 2, 0); return g; };

// ================================================================= the rooftop camouflage town
export const ROADS_X = [-36, 0, 36];          // roads along x at these z
export const ROADS_Z = [-74, -26, 26, 74];    // roads along z at these x
export type Lot = { s: HouseSpec; i: number };
export const LOTS: Lot[] = (() => { const out: Lot[] = []; let i = 0;
  const xs = [-FX + 5, ...ROADS_Z.flatMap((x) => [x - 5, x + 5]), FX - 5].sort((a, b) => a - b);
  for (let bi = 0; bi < xs.length - 1; bi += 2) { const a = xs[bi], b = xs[bi + 1]; const n = Math.floor((b - a) / 11.5);
    for (const rz of [-36, 0, 36]) for (const side of [-1, 1]) { const zRoad = rz; const z = zRoad + side * 4.6; for (let j = 0; j < n; j++) { const x = a + (b - a) * (j + 0.5) / n;
      if (Math.abs(z) > FZ - 9) continue; out.push({ s: houseSpec(x, z, side > 0 ? Math.PI : 0, 500 + i), i }); i++; } } }
  // houses facing the edge streets (z = -60 / 60 lines)
  for (const ez of [-62, 62]) for (let x = -FX + 9; x < FX - 6; x += 12) { if (ROADS_Z.some((rx) => Math.abs(rx - x) < 7)) continue; out.push({ s: houseSpec(x, ez - Math.sign(ez) * 0.5, ez > 0 ? 0 : Math.PI, 900 + i), i }); i++; }
  return out; })();
/** lots that are part of the on-camera construction (layer F) */
export const BUILD_LOTS = LOTS.filter((l) => l.s.x > -20 && l.s.x < 22 && l.s.z > 0 && l.s.z < 40).map((l) => l.i);
const groundKit = (fakeRoof: boolean) => once(`b2RoofGround${fakeRoof}`, () => { const T = tMats(), k = new Kit(), y = ROOF_Y;
  k.span(T.lawnFake, [-FX + 0.6, y, -FZ + 0.6], [FX - 0.6, y + 0.04, FZ - 0.6], { ink: false });
  for (const z of ROADS_X) { k.span(T.road, [-FX + 1, y + 0.04, z - 3.6], [FX - 1, y + 0.07, z + 3.6], { ink: false }); for (const s of [-1, 1]) k.span(T.curb, [-FX + 1, y + 0.04, z + s * 3.6 - 0.2], [FX - 1, y + 0.1, z + s * 3.6 + 0.2], { ink: false }); }
  for (const x of ROADS_Z) { k.span(T.road, [x - 3.6, y + 0.045, -FZ + 1], [x + 3.6, y + 0.075, FZ - 1], { ink: false }); }
  // a curving crescent road between two avenues (the camoufleurs avoided a perfect grid)
  for (let i = 0; i < 24; i++) { const a0 = Math.PI * (i / 24), a1 = Math.PI * ((i + 1) / 24), R = 15, cx = 50, cz = 18; const p0: V3 = [cx + Math.cos(a0) * R, y + 0.08, cz + Math.sin(a0) * R * 0.8], p1: V3 = [cx + Math.cos(a1) * R, y + 0.08, cz + Math.sin(a1) * R * 0.8];
    const L = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]); k.box(T.road, [L + 0.4, 0.03, 6.4], [(p0[0] + p1[0]) / 2, y + 0.06, (p0[2] + p1[2]) / 2], [0, -Math.atan2(p1[2] - p0[2], p1[0] - p0[0]), 0], { ink: false }); }
  void fakeRoof; return k; });
export const townKit = (filter: "all" | "noBuild" | "done") => once(`b2Town${filter}`, () => { const k = new Kit();
  for (const l of LOTS) { const inB = BUILD_LOTS.includes(l.i); if (filter === "noBuild" && inB) continue; if (filter === "done" && (inB || l.s.x > -20)) continue; addHouse(k, l.s, true, ROOF_Y + 0.05); }
  return k; });
const signTexS = (t: string) => { const c = document.createElement("canvas"); c.width = 512; c.height = 96; const g = c.getContext("2d")!; g.fillStyle = "#f2efe2"; g.fillRect(0, 0, 512, 96); g.fillStyle = "#1e2a3a"; g.font = "bold 54px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, 256, 50);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6 }); };
export const STREET_SIGNS: { p: V3; text: string; ry: number }[] = [{ p: [-21.5, ROOF_Y, 4.2], text: "BURLAP BLVD", ry: 0 }, { p: [30.5, ROOF_Y, -31.8], text: "SYNTHETIC ST", ry: 0.3 }];
const ROOF_TREE_TINT = { "": ["#7f9a6a", "#6a8a5a", "#8aa070"] }, CITY_TINT = { "": ["#f8f2e4", "#e8f0f8", "#f4ead0", "#e6f0dc", "#fff4ec", "#ece4d8"] };
const _rh: Record<string, Place[]> = {};
export const roofHouses = (mode: string) => (_rh[mode] ??= LOTS.filter((l) => !(mode === "noBuild" && BUILD_LOTS.includes(l.i))).map((l) => camoAt(l.s.x, ROOF_Y + 0.05, l.s.z, l.s.ry, l.i)));
let _rt: Place[] | null = null;
/** feathered decoy trees in the back yards between the rows (every third lot), slightly smaller than real trees */
export const roofTrees = () => (_rt ??= LOTS.filter((l) => l.i % 3 === 0 && Math.abs(l.s.z) < 50).map((l) => { const d = 11.2; return { p: [l.s.x + (l.i % 2 ? 2.5 : -2.5), ROOF_Y + 0.05, l.s.z - Math.cos(l.s.ry) * d] as V3, ry: l.i, s: 0.5 + (l.i % 5) * 0.04, v: l.i }; }));
export const RoofTown: React.FC<{ mode?: "all" | "noBuild" | "done"; grounds?: boolean }> = ({ mode = "all", grounds = true }) => {
  const signs = useMemo(() => STREET_SIGNS.map((s) => signTexS(s.text)), []); const M = cm();
  return <>
    {grounds && <KitMesh kit={groundKit(true)} />}
    {/* v2: the rooftop decoys are our original canvas-and-timber prop house (instanced, 6 paint schemes) + feathered "trees" */}
    <Instances name="camo_house" items={roofHouses(mode)} tints={CAMO_TINTS} />
    <Instances name="oak" items={roofTrees()} tints={ROOF_TREE_TINT} />
    {STREET_SIGNS.map((s, i) => <group key={i} position={s.p} rotation={[0, s.ry, 0]}><mesh position={[0, 1.3, 0]}><cylinderGeometry args={[0.04, 0.04, 2.6, 6]} /><primitive object={M.steelDark} attach="material" /></mesh>
      <mesh position={[0, 2.45, 0.05]}><planeGeometry args={[1.5, 0.28]} /><primitive object={signs[i]} attach="material" /></mesh><mesh position={[0, 2.45, -0.05]} rotation={[0, Math.PI, 0]}><planeGeometry args={[1.5, 0.28]} /><primitive object={signs[i]} attach="material" /></mesh></group>)}
  </>;
};

// ================================================================= the real city around the plant
export const CITY_HOUSES: { x: number; z: number; ry: number; kind: number; v: number }[] = [];
const cityKit = () => once("b2City", () => { const T = tMats(), A = archMats(), k = new Kit(), r = rng(77);
  // ground, streets around the plant, East Marginal Way (+z), river (-x), rail yard (+x)
  k.span(T.ground, [-900, -0.2, -900], [900, -0.05, 900], { ink: false });
  k.span(T.roadReal, [-400, -0.05, FZ + 8], [400, 0.0, FZ + 24], { ink: false });
  for (const s of [-1, 1]) k.span(T.curb, [-400, -0.05, FZ + (s < 0 ? 7.6 : 24)], [400, 0.12, FZ + (s < 0 ? 8.2 : 24.6)], { ink: false });
  k.span(T.roadReal, [-FX - 12, -0.05, -400], [-FX - 2, 0.0, FZ + 8], { ink: false }); k.span(A.paving, [-FX - 2, -0.05, -FZ - 8], [FX + 8, 0.02, FZ + 7.6], { ink: false });
  k.span(T.roadReal, [-FX - 2, -0.05, -FZ - 22], [FX + 60, 0.0, -FZ - 10], { ink: false });
  // rail spur + yard along +x
  for (let t = 0; t < 4; t++) { const x = FX + 14 + t * 5; for (const s of [-0.72, 0.72]) k.span(T.rail, [x + s - 0.06, 0.0, -300], [x + s + 0.06, 0.15, 300], { ink: false }); for (let z = -300; z < 300; z += 0.9) k.span(T.timber, [x - 1.25, -0.04, z], [x + 1.25, 0.06, z + 0.22], { ink: false }); }
  // neighbourhoods (real houses) beyond the streets
  const hood = (x0: number, x1: number, z0: number, z1: number, seed: number, far: boolean) => { const rr = rng(seed);
    for (let z = z0; z < z1; z += 32) { k.span(T.roadReal, [x0, -0.05, z - 3.5], [x1, 0.0, z + 3.5], { ink: false });
      for (let x = x0 + 8; x < x1 - 8; x += 15 + rr() * 2) for (const side of [-1, 1]) { if (rr() < 0.06) continue; const ry = side > 0 ? Math.PI : 0, seed = Math.floor(rr() * 1e6);
        if (far) addHouse(k, houseSpec(x, z + side * 4.6, ry, seed), false, 0, true); else CITY_HOUSES.push({ x, z: z + side * 5.2, ry, kind: seed % 3, v: seed % 6 }); } } };
  hood(-90, 120, FZ + 40, FZ + 200, 11, false); hood(-90, 160, FZ + 200, FZ + 520, 12, true);
  hood(-90, 140, -FZ - 200, -FZ - 30, 13, false); hood(-120, 200, -FZ - 520, -FZ - 200, 14, true);
  hood(FX + 40, FX + 260, -FZ - 20, FZ + 40, 15, false); hood(FX + 260, FX + 600, -300, 400, 16, true);
  // industrial blocks across Marginal Way (warehouses with sawtooth roofs)
  for (let i = 0; i < 9; i++) { const x = -110 + i * 26, w = 20 + r() * 4, d = 18 + r() * 8, h = 8 + r() * 6, M = T.industrial[i % 3];
    k.span(M, [x, 0, FZ + 32], [x + w, h, FZ + 32 + d]); k.span(pm("tarroof", 4), [x + 0.3, h, FZ + 32.3], [x + w - 0.3, h + 0.12, FZ + 32 + d - 0.3], { ink: false });   // v2: flat tar-and-gravel roof (the old sawtooth extrusion was mis-rotated)
    for (const [a0, a1] of [[x, x + w]] as [number, number][]) { k.span(M, [a0, h, FZ + 32], [a1, h + 0.7, FZ + 32.3]); k.span(M, [a0, h, FZ + 32 + d - 0.3], [a1, h + 0.7, FZ + 32 + d]); }
    for (let m = 0; m < 3; m++) k.span(A.roofTar, [x + 2 + m * (w - 4) / 3, h + 0.12, FZ + 32 + d * 0.35], [x + 2 + m * (w - 4) / 3 + 2.4, h + 1.4, FZ + 32 + d * 0.65]); }
  // river (west) with a timber quay
  k.span(T.water, [-900, -0.6, -900], [-FX - 40, -0.35, 900], { ink: false }); k.span(T.timber, [-FX - 40, -0.6, -300], [-FX - 36, 0.2, 300]);
  return k; });
const mountainTex = () => once("b2Mtn", () => { const c = document.createElement("canvas"); c.width = 2048; c.height = 512; const g = c.getContext("2d")!, r = rng(9);
  g.clearRect(0, 0, 2048, 512); g.fillStyle = "#9eaabb"; g.beginPath(); g.moveTo(0, 512); for (let x = 0; x <= 2048; x += 8) g.lineTo(x, 380 - 50 * Math.sin(x * 0.004 + 1) - 20 * Math.sin(x * 0.013)); g.lineTo(2048, 512); g.fill();
  // a great snow volcano (Rainier) right of centre
  const cx = 1350; g.fillStyle = "#b8c4d2"; g.beginPath(); g.moveTo(cx - 520, 420); g.quadraticCurveTo(cx - 140, 150, cx - 40, 92); g.quadraticCurveTo(cx, 80, cx + 50, 94); g.quadraticCurveTo(cx + 170, 160, cx + 560, 420); g.fill();
  g.fillStyle = "#eef2f6"; g.beginPath(); g.moveTo(cx - 160, 200); g.quadraticCurveTo(cx - 60, 104, cx - 40, 92); g.quadraticCurveTo(cx, 80, cx + 50, 94); g.quadraticCurveTo(cx + 90, 120, cx + 190, 210);
  for (let i = 0; i < 9; i++) g.lineTo(cx + 190 - i * 40, 210 + (i % 2 ? 40 : 0) * r()); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; });
export const City: React.FC = () => { const mtn = useMemo(() => new THREE.MeshBasicMaterial({ map: mountainTex(), transparent: true, fog: false, depthWrite: false }), []);
  const kit = cityKit(), houses = useMemo(() => { const by: Place[][] = [[], [], []]; for (const h of CITY_HOUSES) { const c = 10.4; by[h.kind].push({ p: [h.x - Math.sin(h.ry) * c, 0, h.z - Math.cos(h.ry) * c], ry: h.ry + Math.PI, s: 0.8, v: h.v }); } return by; }, [kit]);
  const trees = useMemo(() => { const t = CITY_HOUSES.filter((_, i) => i % 2 === 0).map((h, i): Place => ({ p: [h.x + 7.5, 0, h.z - Math.cos(h.ry) * 0.6], ry: i, s: 0.85 + (i % 4) * 0.08 })); return [t.filter((_, i) => i % 2 === 0), t.filter((_, i) => i % 2 === 1)]; }, [kit]);
  return <><KitMesh kit={kit} />
    <Instances name="bungalow" items={houses[0]} /><Instances name="cottage" items={houses[1]} /><Instances name="colonial" items={houses[2]} />
    <Instances name="maple" items={trees[0]} /><Instances name="oak" items={trees[1]} />
    <mesh position={[300, 140, -1500]} material={mtn} renderOrder={-1}><planeGeometry args={[4200, 1050]} /></mesh>
    <mesh position={[-1500, 110, 200]} rotation={[0, Math.PI / 2, 0]} material={mtn} renderOrder={-1}><planeGeometry args={[4200, 900]} /></mesh></>; };
