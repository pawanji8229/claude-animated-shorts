// joralemon street: the north row (No. 58 at x = 0 between its neighbours) and the south row facing it, ground
// (bluestone flags, granite kerbs, asphalt, crosswalk bars), London plane trees (mottled bark, layered leaf canopies
// that sway in the wind), historic-district lamp posts, hydrants, bins, bike racks, tree-pit guards, manholes.
// Era-dependent pieces (cars, carts, gas vs electric lamps) are placed by the Set; this module is static.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { V3, rng } from "../../lib/math";
import { jMats, JM } from "./mats";
import { buildFront, buildRooms, HouseSpec } from "./rowhouse";
import { SW_Y, SIDEWALK, STREET, FAR_WALK, W58, AREA_Z } from "./world";
import { CutKitMesh } from "./cut";

// ---------------------------------------------------------------- the two rows of houses
const BR: (keyof JM)[] = ["brickRed", "brickWarm", "brickDeep", "brickRed", "brickBrown", "brickWarm"];
const SASH: (keyof JM)[] = ["sashWhite", "sashCream", "sashGreen", "sashWhite", "sashBlack"];
const DOORS: (keyof JM)[] = ["doorGreen", "doorRed", "doorBrown", "doorBlue", "doorBrown"];
const CORN: (keyof JM)[] = ["corniceCream", "corniceBrown", "corniceGrey", "corniceCream"];
const CURT: (keyof JM)[] = ["drapeRed", "drapeGreen", "drapeGold"];
const spec = (i: number, w: number, side: number): HouseSpec => { const r = rng(1000 + i * 7 + side * 300);
  const allStone = r() < 0.2;
  return { w, storeys: r() < 0.3 ? 4 : 3, brick: BR[Math.floor(r() * BR.length)], base: "brownstone", trim: r() < 0.2 ? "cream" : "brownstone", sash: SASH[Math.floor(r() * SASH.length)],
    door: DOORS[Math.floor(r() * DOORS.length)], cornice: CORN[Math.floor(r() * CORN.length)], stoop: r() < 0.5 ? "L" : "R", mode: "home", seed: 50 + i * 13 + side * 101, allStone,
    shutters: r() < 0.25 ? "sashGreen" : null, curtain: CURT[Math.floor(r() * CURT.length)] }; };
export type Placed = { s: HouseSpec; x: number; side: 1 | -1 };
/** north row: No. 58 at x = 0 (index 0); neighbours both ways. South row faces it across the street. */
export const ROW: Placed[] = (() => { const out: Placed[] = []; const r = rng(31);
  // No. 56 (west, -x) is the "curtains" neighbour of scene 4: three storeys, white sashes, lace + red drapes
  let x = -W58 / 2; for (let i = 1; i <= 9; i++) { const w = i === 1 ? 6.4 : 5.8 + r() * 1.8; x -= w; const s = spec(i, w, 0); if (i === 1) Object.assign(s, { storeys: 3, sash: "sashWhite", curtain: "drapeRed", stoop: "R", allStone: false, brick: "brickWarm", trim: "brownstone", shutters: null }); out.push({ s, x: x + w / 2, side: 1 }); }
  x = W58 / 2; for (let i = 1; i <= 9; i++) { const w = 5.8 + r() * 1.8; const s = spec(20 + i, w, 0); if (i === 1) Object.assign(s, { storeys: 3, stoop: "L" }); out.push({ s, x: x + w / 2, side: 1 }); x += w; }
  x = -60; for (let i = 0; i < 20; i++) { const w = 5.8 + r() * 1.9; out.push({ s: spec(60 + i, w, 1), x: x + w / 2, side: -1 }); x += w; }
  return out; })();
export const SPEC58 = (mode: "home" | "vent"): HouseSpec => ({ w: W58, storeys: 3, brick: "brickRed", base: "brownstone", trim: "brownstone", sash: "sashWhite", door: "doorGreen", cornice: "corniceBrown", stoop: "L", mode, seed: 58, shutters: null, curtain: "drapeGreen" });

const rowKits = () => once("jRows", () => { const M = jMats();
  return ROW.map((p) => { const f = buildFront(M, p.s), rooms = buildRooms(M, p.s); return { p, front: f.kit, rooms }; }); });
export const HouseRows: React.FC = () => { const R = rowKits();
  return <>{R.map(({ p, front, rooms }, i) => <group key={i} position={[p.x, 0, p.side > 0 ? 0 : FAR_WALK[1]]} rotation={[0, p.side > 0 ? 0 : Math.PI, 0]}>
    <KitMesh kit={front} /><KitMesh kit={rooms} /></group>)}</>;
};
/** No. 58 itself (front + optional rooms), cut-capable */
const k58 = (mode: "home" | "vent") => once(`j58${mode}`, () => { const M = jMats(); const s = SPEC58(mode); return { front: buildFront(M, s), rooms: buildRooms(M, s, true) }; });
export const House58: React.FC<{ mode: "home" | "vent"; cut: boolean; rooms?: boolean }> = ({ mode, cut, rooms = true }) => { const K = k58(mode);
  return <group>{cut ? <CutKitMesh kit={K.front.kit} kind="facade" /> : <KitMesh kit={K.front.kit} />}{mode === "home" && rooms && <KitMesh kit={K.rooms} />}</group>;
};
export const front58 = (mode: "home" | "vent") => k58(mode).front;

// ---------------------------------------------------------------- ground
const X0 = -70, X1 = 75;
const groundKits = () => once("jGround", () => { const M = jMats(), solid = new Kit(), cutK = new Kit();
  // the part of the ground in front of No. 58 that the cutaways remove lives in its own (cut-capable) kit
  const inCut = (x0: number, x1: number) => [Math.max(x0, -15), Math.min(x1, 15)] as const;
  const slab = (mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, opt = {}) => {
    const [a, b] = inCut(x0, x1); if (z1 > -4.5 && b > a) { if (a > x0) solid.span(mat, [x0, y0, z0], [a, y1, z1], opt); cutK.span(mat, [a, y0, z0], [b, y1, z1], opt); if (x1 > b) solid.span(mat, [b, y0, z0], [x1, y1, z1], opt); } else solid.span(mat, [x0, y0, z0], [x1, y1, z1], opt); };
  // north sidewalk: bluestone flags (joints = 1 cm gaps over a dark bed) from the areaway fences to the kerb
  slab(M.asphalt, X0, X1, -0.6, SW_Y - 0.03, AREA_Z + 0.25, SIDEWALK[1] - 0.3, { ink: false, cast: false });
  { const r = rng(5); for (let x = X0; x < X1; ) { const w = 1.1 + r() * 0.5; for (let z = AREA_Z + 0.27; z < SIDEWALK[1] - 0.32; ) { const d = Math.min(SIDEWALK[1] - 0.32 - z, 0.9 + r() * 0.5); slab(M.bluestone, x + 0.006, x + w - 0.006, SW_Y - 0.06, SW_Y - 0.002 * Math.floor(r() * 4), z + 0.006, z + d - 0.006, { ink: false, cast: false }); z += d; } x += w; } }
  slab(M.granite, X0, X1, -0.6, SW_Y + 0.003, SIDEWALK[1] - 0.3, SIDEWALK[1], { ink: 0.3 });
  slab(M.asphalt, X0, X1, -0.6, 0, STREET[0], STREET[1], { ink: false, cast: false });
  // crosswalk bars at the west end + a manhole + lane edge
  for (let z = STREET[0] + 0.6; z < STREET[1] - 0.5; z += 1.0) solid.span(M.cream, [-46.5, 0.0, z], [-43.5, 0.008, z + 0.55], { ink: false, cast: false });
  slab(M.granite, X0, X1, -0.6, SW_Y + 0.003, STREET[1], STREET[1] + 0.3, { ink: 0.3 });
  solid.span(M.bluestone, [X0, -0.6, STREET[1] + 0.3], [X1, SW_Y - 0.002, FAR_WALK[1] - AREA_Z - 0.25], { ink: false, cast: false });
  solid.span(M.concrete, [X0, -0.6, FAR_WALK[1] - AREA_Z - 0.25], [X1, SW_Y - 0.001, FAR_WALK[1] + 40], { ink: false, cast: false });
  for (const [x, z] of [[-9, 9.6], [22, 8.2]] as [number, number][]) { const k = Math.abs(x) < 15 ? cutK : solid; k.cyl(M.castIron, 0.36, 0.36, 0.014, [x, 0.006, z], [0, 0, 0], 24, { ink: 0.3 }); for (let i = -2; i <= 2; i++) k.span(M.castIron, [x - 0.28, 0.012, z + i * 0.11 - 0.015], [x + 0.28, 0.017, z + i * 0.11 + 0.015], { ink: false }); }
  // beyond the ends of the block: back ground far below the fog
  { const o = { ink: false, cast: false } as const, y0 = -0.7, y1 = -0.05;   // with a hole under the cutaway box (so the cut ground opens onto the underground)
    solid.span(M.concrete, [X0 - 200, y0, -60], [-15, y1, 120], o); solid.span(M.concrete, [15, y0, -60], [X1 + 200, y1, 120], o);
    solid.span(M.concrete, [-15, y0, -60], [15, y1, -4.5], o); solid.span(M.concrete, [-15, y0, 17], [15, y1, 120], o); }
  return { solid, cutK }; });
export const Ground: React.FC<{ cut: boolean }> = ({ cut }) => { const G = groundKits(); return <><KitMesh kit={G.solid} />{cut ? <CutKitMesh kit={G.cutK} kind="ground" /> : <KitMesh kit={G.cutK} />}</>; };

// ---------------------------------------------------------------- street furniture
const lampPost = (k: Kit, M: JM, p: V3, mat: THREE.Material) => { const [x, y, z] = p;
  k.lathe(M.wrought, [[0, 0], [0.24, 0], [0.24, 0.1], [0.18, 0.16], [0.15, 0.6], [0.09, 0.75], [0.07, 0.95], [0, 0.95]], [x, y, z], 16);
  k.cyl(M.wrought, 0.055, 0.075, 3.0, [x, y + 2.4, z], [0, 0, 0], 12); for (const h of [1.15, 2.2, 3.3]) k.torus(M.wrought, 0.075, 0.016, [x, y + h, z], [Math.PI / 2, 0, 0]);
  k.lathe(M.wrought, [[0, 0], [0.12, 0], [0.16, 0.05], [0.16, 0.08], [0, 0.08]], [x, y + 3.9, z], 12);
  // lantern: tapered glass box with four frame posts + a cap
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.rod(M.wrought, [x + a * 0.13, y + 3.98, z + b * 0.13], [x + a * 0.2, y + 4.55, z + b * 0.2], 0.012, 5, { ink: false });
  k.add(mat, new THREE.CylinderGeometry(0.19, 0.12, 0.55, 4, 1), [x, y + 4.26, z], [0, Math.PI / 4, 0], [1, 1, 1], { ink: false });
  k.add(M.wrought, new THREE.ConeGeometry(0.3, 0.3, 4), [x, y + 4.72, z], [0, Math.PI / 4, 0]); k.sphere(M.wrought, 0.05, [x, y + 4.9, z]);
};
const hydrant = (k: Kit, M: JM, p: V3) => { const [x, y, z] = p;
  k.lathe(M.safety, [[0, 0], [0.16, 0], [0.16, 0.05], [0.12, 0.09], [0.12, 0.55], [0.15, 0.6], [0.15, 0.66], [0.1, 0.74], [0.05, 0.8], [0, 0.82]], [x, y, z], 16);
  for (const s of [-1, 1]) k.cyl(M.safety, 0.05, 0.05, 0.16, [x + s * 0.16, y + 0.45, z], [0, 0, Math.PI / 2], 10); k.cyl(M.safety, 0.065, 0.065, 0.14, [x, y + 0.42, z + 0.15], [Math.PI / 2, 0, 0], 10);
  k.cyl(M.machDark, 0.03, 0.03, 0.05, [x, y + 0.84, z], [0, 0, 0], 6, { ink: false });
};
const bikeRack = (k: Kit, M: JM, p: V3) => { const [x, y, z] = p; for (const dx of [-0.45, 0.45]) { k.rod(M.galv, [x + dx, y, z - 0.35], [x + dx, y + 0.8, z - 0.35], 0.03, 8); k.rod(M.galv, [x + dx, y, z + 0.35], [x + dx, y + 0.8, z + 0.35], 0.03, 8); k.torus(M.galv, 0.35, 0.03, [x + dx, y + 0.8, z], [0, Math.PI / 2, 0], Math.PI); } };
const bin = (k: Kit, M: JM, p: V3) => { const [x, y, z] = p; k.cyl(M.machGreen, 0.28, 0.24, 0.9, [x, y + 0.45, z], [0, 0, 0], 16); for (let a = 0; a < 16; a++) { const t = (a / 16) * Math.PI * 2; k.rod(M.machDark, [x + Math.cos(t) * 0.285, y + 0.1, z + Math.sin(t) * 0.285], [x + Math.cos(t) * 0.285, y + 0.85, z + Math.sin(t) * 0.285], 0.008, 4, { ink: false }); } k.cyl(M.machDark, 0.3, 0.3, 0.04, [x, y + 0.92, z], [0, 0, 0], 16); };
const pit = (k: Kit, M: JM, p: V3) => { const [x, y, z] = p; k.span(M.soilTop, [x - 0.75, y - 0.03, z - 0.75], [x + 0.75, y - 0.005, z + 0.75], { ink: false, cast: false });
  for (const [a, b, c, d] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) { k.rod(M.wrought, [x + a * 0.78, y + 0.42, z + b * 0.78], [x + c * 0.78, y + 0.42, z + d * 0.78], 0.014, 5); for (let t = 0.1; t < 1; t += 0.2) k.rod(M.wrought, [x + (a + (c - a) * t) * 0.78, y, z + (b + (d - b) * t) * 0.78], [x + (a + (c - a) * t) * 0.78, y + 0.42, z + (b + (d - b) * t) * 0.78], 0.009, 4, { ink: false }); }
  // low plants in the pit
  for (let i = 0; i < 6; i++) k.sphere(M.leafB, 0.14, [x - 0.5 + (i % 3) * 0.5, y + 0.05, z - 0.35 + Math.floor(i / 3) * 0.6], [1, 0.6, 1], { ink: false }); };
export const TREES: V3[] = [...[-38, -26, -15.5, 9.5, 19, 31, 43].map((x) => [x, SW_Y, SIDEWALK[1] - 1.05] as V3), ...[-32, -20, -8, 4, 16, 28, 40].map((x) => [x, SW_Y, STREET[1] + 1.15] as V3)];
export const LAMPS: V3[] = [...[-31, -9.8, 12, 34].map((x) => [x, SW_Y, SIDEWALK[1] - 0.6] as V3), ...[-22, 1, 23].map((x) => [x, SW_Y, STREET[1] + 0.65] as V3)];
const furnKit = (era: "now" | "old") => once(`jFurn${era}`, () => { const M = jMats(), k = new Kit();
  for (const p of LAMPS) lampPost(k, M, p, era === "now" ? M.lamp : M.lampDim);
  for (const p of TREES) pit(k, M, p);
  if (era === "now") { hydrant(k, M, [10.6, SW_Y, SIDEWALK[1] - 0.55]); hydrant(k, M, [-29, SW_Y, STREET[1] + 0.55]); bikeRack(k, M, [-17.5, SW_Y, SIDEWALK[1] - 0.9]); bin(k, M, [7.4, SW_Y, SIDEWALK[1] - 0.55]); bin(k, M, [25, SW_Y, STREET[1] + 0.6]);
    // signposts (blank plates: no text), parking meters
    for (const x of [-21, 15.5]) { k.cyl(M.galv, 0.03, 0.03, 2.8, [x, SW_Y + 1.4, SIDEWALK[1] - 0.45], [0, 0, 0], 8); k.span(M.cream, [x - 0.22, SW_Y + 2.2, SIDEWALK[1] - 0.47], [x + 0.22, SW_Y + 2.62, SIDEWALK[1] - 0.44]); k.span(M.red, [x - 0.2, SW_Y + 2.52, SIDEWALK[1] - 0.441], [x + 0.2, SW_Y + 2.6, SIDEWALK[1] - 0.437], { ink: false }); } }
  return k; });
export const StreetFurniture: React.FC<{ era: "now" | "old" }> = ({ era }) => <KitMesh kit={furnKit(era)} />;

// ---------------------------------------------------------------- London plane trees (bark + swaying canopy)
const barkTex = () => once("barkTex", () => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d")!; const r = rng(4);
  g.fillStyle = "#8a8270"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 90; i++) { g.fillStyle = ["#a9a184", "#6d6654", "#9a9276", "#7d7864"][Math.floor(r() * 4)]; g.beginPath(); g.ellipse(r() * 256, r() * 256, 10 + r() * 28, 6 + r() * 18, r() * 3, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; });
const leafTex = (seed: number) => once(`leafTex${seed}`, () => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d")!; const r = rng(seed);
  g.clearRect(0, 0, 256, 256); for (let i = 0; i < 46; i++) { const x = 34 + r() * 188, y = 34 + r() * 188, s = 15 + r() * 13, a = r() * 6.28; const sh = 0.72 + r() * 0.55, yl = r() < 0.25 ? 1.18 : 1;
    g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = `rgb(${Math.round(78 * sh * yl)},${Math.round(122 * sh)},${Math.round(50 * sh)})`; g.strokeStyle = "rgba(28,44,20,0.5)"; g.lineWidth = 1.1;
    // London plane leaf: three broad lobes (overlapping pointed ovals) + stalk
    for (const t of [-0.75, 0, 0.75]) { g.save(); g.rotate(t); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.55, -s * 0.45, 0, -s * (t === 0 ? 1.05 : 0.85)); g.quadraticCurveTo(-s * 0.55, -s * 0.45, 0, 0); g.fill(); g.stroke(); g.restore(); }
    g.strokeStyle = "rgba(40,60,25,0.7)"; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, s * 0.35); g.stroke(); g.restore(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; });
const leafMat = (seed: number) => once(`leafMat${seed}`, () => new THREE.MeshStandardMaterial({ map: leafTex(seed), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }));
const trunkKit = (seed: number) => once(`trunk${seed}`, () => { const M = jMats(), k = new Kit(), r = rng(seed);
  const bark = new THREE.MeshStandardMaterial({ map: barkTex(), roughness: 0.9 }); k.lathe(bark, [[0, 0], [0.24, 0], [0.2, 0.4], [0.16, 2.6], [0.12, 3.6], [0, 3.6]], [0, 0, 0], 12);
  for (let b = 0; b < 5; b++) { const a = (b / 5) * Math.PI * 2 + r(), L = 2.2 + r() * 1.4; k.rod(bark, [0, 2.9 + r() * 0.6, 0], [Math.cos(a) * L * 0.7, 4.6 + r() * 1.6, Math.sin(a) * L * 0.7], 0.06 + r() * 0.03, 6); }
  void M; return k; });
/** leaf clusters: crossed cards grouped into 5 sub-canopies that sway independently (wind) */
const canopyKits = (seed: number) => once(`canopy${seed}`, () => { const r = rng(seed + 9); return Array.from({ length: 5 }, (_, g) => { const k = new Kit(), mat = leafMat(1 + ((seed + g) % 3)), a0 = (g / 5) * Math.PI * 2;
  for (let i = 0; i < 26; i++) { const a = a0 + (r() - 0.5) * 1.6, rad = 0.6 + r() * 2.6, y = 4.2 + r() * 3.2 - rad * 0.25, s = 1.1 + r() * 0.9; const p: V3 = [Math.cos(a) * rad, y, Math.sin(a) * rad];
    k.add(mat, new THREE.PlaneGeometry(s, s), p, [r() * 0.6 - 0.3, r() * 6.28, r() * 0.6 - 0.3], [1, 1, 1], { ink: false }); k.add(mat, new THREE.PlaneGeometry(s, s), p, [Math.PI / 2 + r() * 0.5, r() * 6.28, 0], [1, 1, 1], { ink: false }); }
  return k; }); });
export const Trees: React.FC<{ f: number }> = ({ f }) => (<>{TREES.map((p, i) => { const s = 1 + ((i * 37) % 5) * 0.06;
  return <group key={i} position={p} scale={[s, s, s]} rotation={[0, i * 1.3, 0]}><KitMesh kit={trunkKit(i % 4)} />
    {canopyKits(i % 4).map((k, g) => { const w = Math.sin(f * 0.045 + i * 1.7 + g * 2.1) * 0.035 + Math.sin(f * 0.11 + g + i) * 0.012; return <group key={g} position={[0, 3.6, 0]} rotation={[w, 0, w * 0.7]}><group position={[0, -3.6, 0]}><KitMesh kit={k} /></group></group>; })}
  </group>; })}</>);
export { useMemo };
