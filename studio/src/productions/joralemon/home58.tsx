// joralemon: No. 58 as a family home (1847 -> 1907). Side-hall plan: hall + staircase on the stoop side (x < HALL_X),
// front parlour (x > HALL_X) with marble fireplace + mirror, round table + oil lamp + books, sofa, bookcase, pictures,
// chandelier, rug; bedroom (2nd), nursery (3rd), kitchen with an iron range (basement). Layers fade separately so the
// conversion (scene 11) can empty the rooms, strip them to the brick shell and bring the machinery in.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { V3, rng } from "../../lib/math";
import { jMats, JM } from "./mats";
import { W58, AREA_Y, PF, EAVE } from "./world";
import { STOREYS } from "./rowhouse";

const MIRROR = () => once("mirror", () => new THREE.MeshStandardMaterial({ color: "#c9c4b8", roughness: 0.08, metalness: 1, envMapIntensity: 1.4 }));
export const XI = W58 / 2 - 0.42, ZB = -12.6, ZF = -0.45, HALL_X = -0.95;
const FL = [AREA_Y, PF, PF + 3.5, PF + 6.7];
/** a canvas rug texture (border + medallion) */
const rugTex = () => once("rugTex", () => { const c = document.createElement("canvas"); c.width = 256; c.height = 384; const g = c.getContext("2d")!;
  g.fillStyle = "#7a2422"; g.fillRect(0, 0, 256, 384); g.strokeStyle = "#d8b46a"; g.lineWidth = 10; g.strokeRect(14, 14, 228, 356); g.strokeStyle = "#23324a"; g.lineWidth = 6; g.strokeRect(30, 30, 196, 324);
  g.fillStyle = "#23324a"; g.beginPath(); g.ellipse(128, 192, 60, 90, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#d8b46a"; g.beginPath(); g.ellipse(128, 192, 30, 50, 0, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,240,200" : "20,10,10"},0.05)`; g.fillRect(Math.random() * 256, Math.random() * 384, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; });
const book = (k: Kit, M: JM, r: () => number, x: number, y: number, z: number, n: number, ax: "x" | "z") => { let o = 0; for (let i = 0; i < n; i++) { const w = 0.03 + r() * 0.03, h = 0.2 + r() * 0.08; const m = [M.drapeRed, M.drapeGreen, M.doorBrown, M.doorBlue, M.corniceCream][Math.floor(r() * 5)];
  if (ax === "x") k.span(m, [x + o, y, z - 0.1], [x + o + w, y + h, z + 0.1], { ink: false }); else k.span(m, [x - 0.1, y, z + o], [x + 0.1, y + h, z + o + w], { ink: false }); o += w + 0.004; } };
const chair = (k: Kit, M: JM, x: number, y: number, z: number, ry: number) => { const c = Math.cos(ry), s = Math.sin(ry), P = (a: number, b: number): [number, number] => [x + a * c + b * s, z - a * s + b * c];
  const [sx, sz] = P(0, 0); k.box(M.furn, [0.45, 0.06, 0.45], [sx, y + 0.46, sz], [0, ry, 0]); const [bx, bz] = P(0, -0.21); k.box(M.furn, [0.42, 0.55, 0.05], [bx, y + 0.76, bz], [0, ry, 0]);
  k.box(M.drapeRed, [0.4, 0.04, 0.4], [sx, y + 0.5, sz], [0, ry, 0], { ink: false });
  for (const [a, b] of [[-0.19, -0.19], [0.19, -0.19], [0.19, 0.19], [-0.19, 0.19]]) { const [lx, lz] = P(a, b); k.cyl(M.furn, 0.02, 0.018, 0.46, [lx, y + 0.23, lz], [0, 0, 0], 6, { ink: false }); } };

export const homeKits = () => once("home58", () => { const M = jMats(), r = rng(47);
  const rooms = new Kit(), furn = new Kit(), floors = new Kit();
  // ---- floors (wood) per level, with the stair opening in the hall; ceilings underneath
  for (let i = 1; i < FL.length; i++) { const y = FL[i];
    floors.span(M.floorWood, [HALL_X, y - 0.25, ZB], [XI, y, ZF], { ink: false });
    floors.span(M.floorWood, [-XI, y - 0.25, ZB], [HALL_X, y, -6.6], { ink: false }); floors.span(M.floorWood, [-XI, y - 0.25, -2.6], [HALL_X, y, ZF], { ink: false });
    floors.span(M.ceiling, [-XI, y - 0.3, ZB], [XI, y - 0.25, ZF], { ink: false }); }
  floors.span(M.floorWood, [-XI, AREA_Y - 0.2, ZB], [XI, AREA_Y, ZF], { ink: false });
  // ---- room walls: wallpapered party walls per storey, hall partition with doorways, back walls; staircase in the hall
  const papers = [M.paperC, M.paperA, M.paperB, M.paperA];
  for (let i = 0; i < FL.length; i++) { const y0 = FL[i] + (i ? 0 : 0), y1 = (FL[i + 1] ?? EAVE) - 0.3, P = papers[i];
    for (const sx of [-1, 1]) rooms.span(P, [sx * XI - (sx > 0 ? 0 : 0.05), y0, ZB], [sx * XI + (sx > 0 ? 0.05 : 0), y1, ZF], { ink: false });
    rooms.span(P, [-XI, y0, ZB + 0.02], [XI, y1, ZB + 0.07], { ink: false });
    // hall partition with a doorway (parlour door) at z -5.4..-4.3
    rooms.span(P, [HALL_X - 0.06, y0, ZB], [HALL_X + 0.06, y1, -5.4], { ink: 0.4 }); rooms.span(P, [HALL_X - 0.06, y0, -4.3], [HALL_X + 0.06, y1, ZF], { ink: 0.4 }); rooms.span(P, [HALL_X - 0.06, y0 + 2.3, -5.4], [HALL_X + 0.06, y1, -4.3], { ink: 0.4 });
    for (const zz of [-5.45, -4.25]) rooms.span(M.sashWhite, [HALL_X - 0.09, y0, zz - 0.05], [HALL_X + 0.09, y0 + 2.36, zz + 0.05], { ink: 0.4 });
    // skirting + picture rail + crown in the parlour side
    rooms.span(M.sashWhite, [XI - 0.03, y0, ZB], [XI, y0 + 0.22, ZF], { ink: false }); rooms.span(M.sashWhite, [XI - 0.025, y1 - 0.5, ZB], [XI, y1 - 0.45, ZF], { ink: false }); rooms.span(M.sashWhite, [HALL_X + 0.06, y1 - 0.14, ZB], [XI, y1, ZB + 0.1], { ink: false });
  }
  // staircase (hall, rising toward the back) with balusters + a turned newel
  for (let i = 0; i < 3; i++) { const y0 = FL[i + 1 - 1 + 1] ?? 0; void y0; }
  for (let lv = 1; lv < 3; lv++) { const ya = FL[lv], yb = FL[lv + 1], n = Math.round((yb - ya) / 0.19), za = -2.7, zb2 = -6.5;
    for (let s = 0; s < n; s++) { const t = s / n, y = ya + (yb - ya) * t, z = za + (zb2 - za) * t; rooms.span(M.doorBrown, [-XI + 0.02, y, z - 0.31], [HALL_X - 0.15, y + 0.19 * 1.0, z + 0.04], { ink: 0.3 }); }
    rooms.rod(M.doorBrown, [HALL_X - 0.2, ya + 0.95, za], [HALL_X - 0.2, yb + 0.95, zb2], 0.035, 8); for (let s = 0; s < n; s += 1) { const t = s / n; rooms.rod(M.sashWhite, [HALL_X - 0.2, ya + (yb - ya) * t, za + (zb2 - za) * t], [HALL_X - 0.2, ya + (yb - ya) * t + 0.95, za + (zb2 - za) * t], 0.014, 5, { ink: false }); }
    rooms.cyl(M.doorBrown, 0.07, 0.08, 1.1, [HALL_X - 0.2, ya + 0.55, za + 0.1], [0, 0, 0], 10); }
  // ---- parlour furniture
  const y = PF, cxP = (HALL_X + XI) / 2;
  // fireplace on the right party wall: marble mantel, black iron insert, grate glow, gilt mirror above
  const fz = -4.8; furn.span(M.corniceCream, [XI - 0.32, y, fz - 0.95], [XI, y + 1.2, fz + 0.95]); furn.span(M.corniceCream, [XI - 0.42, y + 1.2, fz - 1.05], [XI, y + 1.3, fz + 1.05]);
  furn.span(M.machDark, [XI - 0.34, y, fz - 0.45], [XI - 0.3, y + 0.85, fz + 0.45], { ink: false }); furn.span(M.signalRed, [XI - 0.345, y + 0.08, fz - 0.28], [XI - 0.338, y + 0.3, fz + 0.28], { ink: false });
  furn.span(M.brass, [XI - 0.05, y + 1.55, fz - 0.75], [XI, y + 2.85, fz + 0.75]); furn.span(MIRROR(), [XI - 0.06, y + 1.65, fz - 0.65], [XI - 0.05, y + 2.75, fz + 0.65], { ink: false });
  for (const dz of [-0.8, 0.8]) { furn.cyl(M.brass, 0.05, 0.07, 0.3, [XI - 0.2, y + 1.45, fz + dz], [0, 0, 0], 10, { ink: false }); furn.cyl(M.corniceCream, 0.02, 0.02, 0.2, [XI - 0.2, y + 1.7, fz + dz], [0, 0, 0], 6, { ink: false }); }
  furn.cyl(M.doorBrown, 0.13, 0.13, 0.3, [XI - 0.2, y + 1.45, fz], [0, 0, 0], 12); // mantel clock
  // rug, round table with cloth + oil lamp + books, two chairs
  furn.add(new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1 }), new THREE.PlaneGeometry(2.6, 3.8), [cxP, y + 0.006, -4.2], [-Math.PI / 2, 0, 0], [1, 1, 1], { ink: false });
  const tx = cxP - 0.15, tz = -3.0; furn.cyl(M.paperC, 0.62, 0.66, 0.06, [tx, y + 0.75, tz], [0, 0, 0], 24); furn.cyl(M.corniceCream, 0.66, 0.7, 0.55, [tx, y + 0.45, tz], [0, 0, 0], 24, { ink: 0.5 }); furn.cyl(M.furn, 0.06, 0.1, 0.2, [tx, y + 0.08, tz], [0, 0, 0], 10);
  furn.cyl(M.brass, 0.08, 0.1, 0.18, [tx + 0.48, y + 0.87, tz + 0.22], [0, 0, 0], 12); furn.cyl(M.glass, 0.05, 0.07, 0.25, [tx + 0.48, y + 1.08, tz + 0.22], [0, 0, 0], 12, { ink: false }); furn.sphere(M.roomLamp, 0.05, [tx + 0.48, y + 1.02, tz + 0.22], [1, 1.3, 1], { ink: false });
  furn.cyl(M.drapeGold, 0.1, 0.22, 0.2, [tx + 0.48, y + 1.28, tz + 0.22], [0, 0, 0], 14, { ink: false });
  book(furn, M, r, tx - 0.45, y + 0.78, tz + 0.3, 3, "x");
  chair(furn, M, tx - 0.6, y, tz + 0.55, Math.PI * 0.8); chair(furn, M, tx + 0.75, y, tz - 0.2, -Math.PI / 2);
  // sofa against the back of the parlour, bookcase, side table + fern, pictures
  furn.span(M.drapeGreen, [HALL_X + 0.4, y + 0.3, -8.2], [XI - 0.5, y + 0.55, -7.5]); furn.span(M.drapeGreen, [HALL_X + 0.4, y + 0.55, -8.35], [XI - 0.5, y + 1.15, -8.15]); for (const x of [HALL_X + 0.35, XI - 0.45]) furn.span(M.furn, [x - 0.1, y, -8.35], [x + 0.1, y + 0.8, -7.5]);
  furn.span(M.furn, [XI - 0.45, y, -10.8], [XI - 0.05, y + 2.3, -9.2]); for (let s = 0; s < 5; s++) { furn.span(M.furn, [XI - 0.45, y + 0.3 + s * 0.42, -10.8], [XI - 0.05, y + 0.33 + s * 0.42, -9.2], { ink: false }); book(furn, M, r, XI - 0.25, y + 0.33 + s * 0.42, -10.75, 22, "z"); }
  furn.cyl(M.furn, 0.25, 0.25, 0.04, [HALL_X + 0.45, y + 0.7, -1.4], [0, 0, 0], 16); furn.cyl(M.furn, 0.03, 0.03, 0.68, [HALL_X + 0.45, y + 0.35, -1.4], [0, 0, 0], 6); furn.cyl(M.brownstone, 0.12, 0.09, 0.2, [HALL_X + 0.45, y + 0.82, -1.4], [0, 0, 0], 10);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; furn.add(M.leafA, new THREE.PlaneGeometry(0.12, 0.5), [HALL_X + 0.45 + Math.cos(a) * 0.15, y + 1.1, -1.4 + Math.sin(a) * 0.15], [0.6 * Math.sin(a), a, 0.6 * Math.cos(a)], [1, 1, 1], { ink: false }); }
  for (const [z, w, h] of [[-2.2, 0.6, 0.8], [-6.6, 0.9, 0.7], [-7.6, 0.5, 0.6]] as [number, number, number][]) { furn.span(M.brass, [HALL_X + 0.06, y + 1.6, z - w / 2], [HALL_X + 0.1, y + 1.6 + h, z + w / 2]); furn.span([M.paperB, M.drapeGold, M.doorBlue][Math.floor(r() * 3)], [HALL_X + 0.1, y + 1.65, z - w / 2 + 0.05], [HALL_X + 0.11, y + 1.55 + h, z + w / 2 - 0.05], { ink: false }); }
  // chandelier (oil lamps on a brass ring)
  furn.rod(M.brass, [cxP, y + 3.2, -4.2], [cxP, y + 2.6, -4.2], 0.02, 6); furn.torus(M.brass, 0.4, 0.025, [cxP, y + 2.55, -4.2], [Math.PI / 2, 0, 0]); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; furn.sphere(M.roomLamp, 0.05, [cxP + Math.cos(a) * 0.4, y + 2.68, -4.2 + Math.sin(a) * 0.4], [1, 1.4, 1], { ink: false }); }
  // drapes + lace inside the two parlour windows (bays 1, 2)
  for (const bxw of [2.15]) { furn.plane(M.lace, 0.85, 2.5, [bxw, y + 0.35 + 1.38, -0.62], [0, 0, 0]); for (const sd of [-1, 1]) furn.span(M.drapeRed, [bxw + sd * 0.55 - 0.16, y + 0.2, -0.75], [bxw + sd * 0.55 + 0.16, y + 3.25, -0.66], { ink: false }); furn.rod(M.brass, [bxw - 0.8, y + 3.28, -0.7], [bxw + 0.8, y + 3.28, -0.7], 0.02, 6, { ink: false }); }
  // ---- 2nd floor bedroom: bed, wardrobe, washstand
  const y2 = FL[2]; furn.span(M.furn, [HALL_X + 0.4, y2, -7.5], [HALL_X + 2.0, y2 + 0.5, -5.3]); furn.span(M.sashWhite, [HALL_X + 0.45, y2 + 0.5, -7.45], [HALL_X + 1.95, y2 + 0.68, -5.35], { ink: false }); furn.span(M.furn, [HALL_X + 0.4, y2, -7.6], [HALL_X + 2.0, y2 + 1.3, -7.45]); furn.span(M.drapeGreen, [HALL_X + 0.45, y2 + 0.66, -6.4], [HALL_X + 1.95, y2 + 0.72, -5.4], { ink: false });
  furn.span(M.furn, [XI - 0.6, y2, -11.2], [XI - 0.05, y2 + 2.2, -9.8]); furn.span(M.furn, [XI - 0.5, y2, -3.4], [XI - 0.05, y2 + 0.85, -2.4]); furn.cyl(M.corniceCream, 0.2, 0.15, 0.12, [XI - 0.28, y2 + 0.92, -2.9], [0, 0, 0], 14);
  // ---- 3rd floor nursery: small bed, trunk, rocking horse silhouette
  const y3 = FL[3]; furn.span(M.furn, [HALL_X + 0.4, y3, -6.0], [HALL_X + 1.5, y3 + 0.45, -4.4]); furn.span(M.paperC, [HALL_X + 0.45, y3 + 0.45, -5.95], [HALL_X + 1.45, y3 + 0.58, -4.45], { ink: false }); furn.span(M.doorBrown, [XI - 0.8, y3, -9.0], [XI - 0.1, y3 + 0.55, -8.2]);
  furn.span(M.doorRed, [XI - 1.3, y3 + 0.35, -3.2], [XI - 0.6, y3 + 0.7, -3.05]); furn.torus(M.doorBrown, 0.35, 0.03, [XI - 0.95, y3 + 0.25, -3.12], [0, 0, 0], Math.PI);
  for (const [yy, rugZ] of [[y2, -4.6], [y3, -6.4]] as [number, number][]) { furn.add(new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1, color: "#c8d8e8" }), new THREE.PlaneGeometry(2.0, 2.8), [cxP, yy + 0.006, rugZ], [-Math.PI / 2, 0, 0.1], [1, 1, 1], { ink: false });
    for (const [z, w] of [[-3.0, 0.7], [-8.5, 0.55]] as [number, number][]) { furn.span(M.brass, [HALL_X + 0.06, yy + 1.4, z - w / 2], [HALL_X + 0.1, yy + 2.0, z + w / 2]); furn.span([M.paperB, M.drapeGold, M.doorBlue][Math.floor(r() * 3)], [HALL_X + 0.1, yy + 1.45, z - w / 2 + 0.05], [HALL_X + 0.11, yy + 1.95, z + w / 2 - 0.05], { ink: false }); }
    for (const bxw of [-2.05, 0.1, 2.15]) { furn.plane(M.lace, 0.75, yy === y2 ? 1.9 : 1.5, [bxw, yy + (yy === y2 ? 0.5 + 1.05 : 0.45 + 0.85), -0.62], [0, 0, 0]); for (const sd of [-1, 1]) furn.span(M.drapeGreen, [bxw + sd * 0.5 - 0.12, yy + 0.3, -0.75], [bxw + sd * 0.5 + 0.12, yy + (yy === y2 ? 2.8 : 2.35), -0.68], { ink: false }); } }
  // ---- basement kitchen: cast-iron range with pipe, table, shelves with pots
  const y0 = FL[0]; furn.span(M.machDark, [XI - 0.75, y0, -10.5], [XI - 0.05, y0 + 0.9, -9.0]); furn.span(M.wrought, [XI - 0.8, y0 + 0.9, -10.55], [XI - 0.05, y0 + 0.95, -8.95]); furn.cyl(M.machDark, 0.09, 0.09, 1.6, [XI - 0.3, y0 + 1.75, -9.75], [0, 0, 0], 10); furn.span(M.signalRed, [XI - 0.76, y0 + 0.2, -10.1], [XI - 0.75, y0 + 0.45, -9.4], { ink: false });
  furn.span(M.timber, [HALL_X + 0.3, y0 + 0.75, -6.5], [HALL_X + 1.9, y0 + 0.8, -5.5]); for (const [a, b] of [[0.35, -6.45], [1.85, -6.45], [0.35, -5.55], [1.85, -5.55]]) furn.span(M.timber, [HALL_X + a - 0.03, y0, b - 0.03], [HALL_X + a + 0.03, y0 + 0.75, b + 0.03], { ink: false });
  for (let s = 0; s < 2; s++) { furn.span(M.timber, [-XI, y0 + 1.3 + s * 0.45, -11.8], [-XI + 0.3, y0 + 1.33 + s * 0.45, -9.2], { ink: false }); for (let p = 0; p < 4; p++) furn.cyl([M.brass, M.machDark][p % 2], 0.1, 0.09, 0.16, [-XI + 0.15, y0 + 1.42 + s * 0.45, -11.4 + p * 0.6], [0, 0, 0], 12, { ink: false }); }
  return { rooms, furn, floors }; });

/** lights of the home (warm lamps); `on` 0..1 */
export const HOME_LIGHTS: V3[] = [[(HALL_X + XI) / 2, PF + 2.4, -4.2], [1.25, PF + 1.3, -2.8], [0.5, PF + 3.5 + 1.8, -6], [XI - 0.6, AREA_Y + 1.6, -9.6]];
const fadeCache = new Map<string, THREE.Material[]>();
/** render a kit with all its materials faded to opacity o (o = 1 -> plain KitMesh) */
export const FadeKit: React.FC<{ kit: Kit; o: number; id: string; dy?: number }> = ({ kit, o, id, dy = 0 }) => {
  const parts = useMemo(() => kit.build(), [kit]);
  if (o >= 0.999) return <group position={[0, dy, 0]}><KitMesh kit={kit} /></group>;
  if (o <= 0.001) return null;
  let mats = fadeCache.get(id); if (!mats) { mats = parts.map((p) => { const m = p.mat.clone(); m.transparent = true; (m as THREE.MeshStandardMaterial).depthWrite = false; return m; }); fadeCache.set(id, mats); }
  mats.forEach((m, i) => { const base = (parts[i].mat as THREE.MeshStandardMaterial).opacity ?? 1; m.opacity = base * o; });
  return <group position={[0, dy, 0]}>{parts.map((p, i) => <mesh key={i} geometry={p.geo} material={mats![i]} castShadow={false} receiveShadow />)}</group>;
};
export const HomeInterior: React.FC<{ furn?: number; rooms?: number; floors?: number; lights?: number }> = ({ furn = 1, rooms = 1, floors = 1, lights = 1 }) => { const K = homeKits();
  return (<group>
    <FadeKit kit={K.floors} o={floors} id="hfloors" /><FadeKit kit={K.rooms} o={rooms} id="hrooms" /><FadeKit kit={K.furn} o={furn} id="hfurn" />
    {lights > 0.01 && HOME_LIGHTS.map((p, i) => <pointLight key={i} position={p} color="#ffcf90" intensity={2.6 * lights} distance={7} decay={1.6} />)}
  </group>);
};
export { STOREYS };
