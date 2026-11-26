// joralemon vehicles (original generic designs, no brands): modern cars (sedan / hatch / SUV / van: extruded body with
// wheel arches, tinted cabin, pillars, lights, grille, mirrors, door seams, blank plates, spinning wheels), a bicycle,
// and the 1907 works: a chain-drive lorry with spoked wooden wheels, a two-wheel hand cart, a timber derrick + winch.
// Local axes: x = forward, y = up, z = width (centred). Ground contact at y = 0.
import React from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { V3 } from "../../lib/math";
import { jMats, carPaint } from "./mats";

type CarType = "sedan" | "hatch" | "suv" | "van";
const DIM: Record<CarType, { L: number; W: number; belt: number; roof: number; wb: number; r: number; front: number; back: number }> = {
  sedan: { L: 4.7, W: 1.84, belt: 0.98, roof: 1.44, wb: 1.42, r: 0.33, front: 1.0, back: -1.75 },
  hatch: { L: 4.1, W: 1.78, belt: 0.98, roof: 1.48, wb: 1.27, r: 0.31, front: 0.85, back: -1.85 },
  suv: { L: 4.75, W: 1.92, belt: 1.12, roof: 1.75, wb: 1.43, r: 0.38, front: 1.0, back: -2.15 },
  van: { L: 5.2, W: 2.0, belt: 1.15, roof: 2.15, wb: 1.65, r: 0.36, front: 1.6, back: -2.55 },
};
const arcPts = (cx: number, cy: number, R: number, a0: number, a1: number, n = 10): [number, number][] => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
const wheelKit = (r: number) => once(`wheel${r}`, () => { const M = jMats(), k = new Kit();
  k.cyl(M.tyre, r, r, 0.22, [0, 0, 0], [Math.PI / 2, 0, 0], 24); k.cyl(M.rim, r * 0.62, r * 0.62, 0.23, [0, 0, 0], [Math.PI / 2, 0, 0], 20, { ink: false });
  for (let s = 0; s < 5; s++) { const a = (s / 5) * Math.PI * 2; k.rod(M.plastic, [Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.118], [Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 0.118], 0.03, 5, { ink: false }); k.rod(M.plastic, [Math.cos(a) * 0.05, Math.sin(a) * 0.05, -0.118], [Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, -0.118], 0.03, 5, { ink: false }); }
  k.cyl(M.plastic, 0.07, 0.07, 0.24, [0, 0, 0], [Math.PI / 2, 0, 0], 10, { ink: false }); return k; });
const carKit = (type: CarType, color: string) => once(`mcar${type}${color}`, () => { const M = jMats(), k = new Kit(), d = DIM[type], P = carPaint(color), h = d.L / 2, y0 = 0.28;
  // body side profile with wheel arches (extruded across the width)
  const arch = (cx: number) => arcPts(cx, d.r + 0.02, d.r + 0.08, Math.PI, 0, 12);
  const prof: [number, number][] = [[-h, y0], [-d.wb - d.r - 0.1, y0], ...arch(-d.wb), [d.wb - d.r - 0.1, y0], ...arch(d.wb), [h, y0], [h + 0.03, 0.55], [h - 0.08, d.belt - 0.15], [d.front + 0.25, d.belt], [d.back - 0.1, d.belt], [-h + 0.05, d.belt - 0.12], [-h - 0.02, 0.55]];
  k.ext(P, prof, d.W, [0, 0, 0], [0, 0, 0], 0.04);
  // cabin: tinted glass shell + painted roof + pillars
  const top = d.roof, f0 = d.front, b0 = d.back, cab: [number, number][] = [[f0 + 0.2, d.belt], [f0 - 0.55, top - 0.05], [b0 + 0.55, top - 0.05], [b0 - 0.02, d.belt]];
  k.ext(M.carGlass, cab, d.W - 0.16, [0, 0, 0], [0, 0, 0], 0.03, { ink: 0.5 });
  k.ext(P, [[f0 - 0.5, top - 0.07], [b0 + 0.5, top - 0.07], [b0 + 0.52, top + 0.01], [f0 - 0.52, top + 0.01]], d.W - 0.14, [0, 0, 0], [0, 0, 0], 0.03);
  for (const s of [-1, 1]) { const z = s * (d.W / 2 - 0.075);
    k.rod(P, [f0 + 0.18, d.belt, z], [f0 - 0.53, top - 0.05, z], 0.045, 6); k.rod(P, [b0 + 0.02, d.belt, z], [b0 + 0.53, top - 0.05, z], 0.06, 6); k.rod(P, [(f0 + b0) / 2 - 0.1, d.belt, z], [(f0 + b0) / 2 - 0.1, top - 0.05, z], 0.04, 6);
    // door seams, handles, mirrors, side skirt
    for (const x of [(f0 + b0) / 2 - 0.12, f0 + 0.15, b0 + 0.1]) k.span(M.plastic, [x - 0.008, y0 + 0.12, s * d.W / 2 - 0.004], [x + 0.008, d.belt - 0.02, s * d.W / 2 + 0.006], { ink: false });
    for (const x of [f0 - 0.2, (f0 + b0) / 2 - 0.45]) k.span(M.chrome, [x - 0.1, d.belt - 0.14, s * d.W / 2], [x + 0.06, d.belt - 0.1, s * (d.W / 2 + 0.015)], { ink: false });
    k.span(P, [f0 + 0.05, d.belt + 0.05, s * d.W / 2], [f0 + 0.2, d.belt + 0.18, s * (d.W / 2 + 0.2)]);
    k.span(M.plastic, [-d.wb + d.r + 0.1, y0 - 0.02, s * d.W / 2 - 0.02], [d.wb - d.r - 0.1, y0 + 0.08, s * (d.W / 2 + 0.008)], { ink: false });
    // lights
    k.span(M.headlight, [h - 0.12, 0.66, s * (d.W / 2 - 0.42) - 0.2], [h + 0.02, 0.76, s * (d.W / 2 - 0.42) + 0.2], { ink: false });
    k.span(M.tail, [-h - 0.03, 0.72, s * (d.W / 2 - 0.3) - 0.22], [-h + 0.08, 0.86, s * (d.W / 2 - 0.3) + 0.22], { ink: false }); }
  k.span(M.plastic, [h - 0.02, 0.4, -0.45], [h + 0.04, 0.58, 0.45], { ink: false }); for (let i = 0; i < 4; i++) k.span(M.chrome, [h + 0.035, 0.42 + i * 0.04, -0.42], [h + 0.045, 0.43 + i * 0.04, 0.42], { ink: false });
  for (const sx of [-1, 1]) k.span(M.cream, [sx * (h + 0.02) - 0.01, 0.38, -0.26], [sx * (h + 0.02) + 0.01, 0.5, 0.26], { ink: false });   // blank plates
  return k; });
export const Car: React.FC<{ type: CarType; color: string; spin: number }> = ({ type, color, spin }) => { const d = DIM[type], W = wheelKit(d.r);
  return <group><KitMesh kit={carKit(type, color)} />{[[d.wb, 1], [-d.wb, 1], [d.wb, -1], [-d.wb, -1]].map(([x, s], i) => <group key={i} position={[x, d.r, s * (d.W / 2 - 0.13)]} rotation={[0, 0, -spin]}><KitMesh kit={W} /></group>)}</group>; };
export const CAR_R = (t: CarType) => DIM[t].r;

/** bicycle: wheels (tyre + spokes), diamond frame, fork, bars, saddle, cranks (rotate with `crank`) */
const bikeKit = () => once("bike", () => { const M = jMats(), k = new Kit(), R = 0.34, F: V3 = [0.53, R, 0], B: V3 = [-0.53, R, 0], BB: V3 = [0, 0.3, 0], ST: V3 = [-0.12, 0.85, 0], HT: V3 = [0.42, 0.86, 0], col = M.doorRed;
  for (const c of [F, B]) { k.torus(M.tyre, R, 0.022, c, [0, 0, 0]); k.torus(M.rim, R - 0.03, 0.008, c, [0, 0, 0], Math.PI * 2, { ink: false }); for (let s = 0; s < 16; s++) { const a = (s / 16) * Math.PI * 2; k.rod(M.rim, c, [c[0] + Math.cos(a) * (R - 0.03), c[1] + Math.sin(a) * (R - 0.03), (s % 2 ? 0.02 : -0.02)], 0.003, 3, { ink: false }); } }
  k.rod(col, B, BB, 0.018, 6); k.rod(col, B, ST, 0.016, 6); k.rod(col, BB, ST, 0.022, 6); k.rod(col, ST, HT, 0.022, 6); k.rod(col, BB, HT, 0.025, 6); k.rod(col, HT, F, 0.018, 6);
  k.rod(M.plastic, HT, [HT[0] - 0.04, HT[1] + 0.15, 0], 0.016, 6); k.rod(M.plastic, [HT[0] - 0.04, HT[1] + 0.15, -0.25], [HT[0] - 0.04, HT[1] + 0.15, 0.25], 0.014, 6);
  k.rod(M.plastic, ST, [ST[0] - 0.03, ST[1] + 0.12, 0], 0.014, 6); k.span(M.plastic, [ST[0] - 0.18, ST[1] + 0.12, -0.06], [ST[0] + 0.08, ST[1] + 0.16, 0.06]);
  return k; });
export const Bike: React.FC<{ spin: number }> = ({ spin }) => <group><KitMesh kit={bikeKit()} /><group position={[0, 0.3, 0]} rotation={[0, 0, -spin * 0.5]}><mesh material={jMats().plastic}><boxGeometry args={[0.34, 0.03, 0.03]} /></mesh></group></group>;

// ---------------------------------------------------------------- 1907 works
const spokedKit = (r: number) => once(`spoked${r}`, () => { const M = jMats(), k = new Kit(); k.torus(M.doorBrown, r - 0.04, 0.05, [0, 0, 0], [0, 0, 0]); k.torus(M.wrought, r, 0.025, [0, 0, 0], [0, 0, 0], Math.PI * 2, { ink: false });
  for (let s = 0; s < 12; s++) { const a = (s / 12) * Math.PI * 2; k.rod(M.doorBrown, [0, 0, 0], [Math.cos(a) * (r - 0.05), Math.sin(a) * (r - 0.05), 0], 0.022, 5, { ink: false }); } k.cyl(M.wrought, 0.09, 0.09, 0.14, [0, 0, 0], [Math.PI / 2, 0, 0], 10); return k; });
const lorryKit = () => once("lorry", () => { const M = jMats(), k = new Kit(), G = M.trainGreen;
  k.span(M.wrought, [-2.6, 0.62, -0.75], [2.4, 0.78, 0.75]); k.span(M.timber, [-2.7, 0.78, -1.05], [1.0, 0.9, 1.05]); for (const s of [-1, 1]) k.span(M.timber, [-2.7, 0.9, s * 1.05 - 0.04], [1.0, 1.25, s * 1.05 + 0.04]);
  k.span(G, [1.0, 0.78, -0.85], [1.9, 1.35, 0.85]); k.span(G, [1.0, 1.35, -0.8], [1.3, 2.35, 0.8]); k.span(G, [0.95, 2.35, -0.95], [2.0, 2.45, 0.95]); for (const s of [-1, 1]) k.rod(M.wrought, [1.95, 1.35, s * 0.85], [1.95, 2.35, s * 0.85], 0.02, 5);
  k.span(G, [1.9, 0.75, -0.55], [2.6, 1.45, 0.55]); k.span(M.brass, [2.6, 0.75, -0.5], [2.7, 1.5, 0.5]); for (let i = 0; i < 8; i++) k.span(M.machDark, [2.701, 0.82 + i * 0.08, -0.42], [2.71, 0.86 + i * 0.08, 0.42], { ink: false });
  k.cyl(M.brass, 0.1, 0.12, 0.12, [2.6, 1.45, 0.62], [0, 0, Math.PI / 2], 10); k.cyl(M.brass, 0.1, 0.12, 0.12, [2.6, 1.45, -0.62], [0, 0, Math.PI / 2], 10);
  k.span(M.drapeRed, [1.32, 1.05, -0.75], [1.8, 1.15, 0.75]); k.rod(M.wrought, [1.6, 1.2, 0.3], [1.85, 1.75, 0.3], 0.02, 5); k.torus(M.wrought, 0.2, 0.02, [1.85, 1.78, 0.3], [Math.PI / 2 - 0.4, 0, 0]);
  for (const s of [-1, 1]) { k.span(M.wrought, [-1.9, 0.5, s * 0.95], [-1.4, 0.56, s * 1.0], { ink: false }); k.rod(M.wrought, [-1.9, 0.53, s * 0.97], [0.6, 0.53, s * 0.97], 0.012, 4, { ink: false }); }
  return k; });
export const Lorry: React.FC<{ spin: number; children?: React.ReactNode }> = ({ spin, children }) => <group><KitMesh kit={lorryKit()} />
  {[[1.9, 0.48, 1], [1.9, 0.48, -1], [-1.65, 0.55, 1], [-1.65, 0.55, -1]].map(([x, r, s], i) => <group key={i} position={[x, r, s * 0.98]} rotation={[0, 0, -spin * (0.5 / r)]}><KitMesh kit={spokedKit(r)} /></group>)}
  <group position={[-0.8, 0.9, 0]}>{children}</group></group>;
const cartKit = () => once("cart", () => { const M = jMats(), k = new Kit(); k.span(M.timber, [-0.9, 0.55, -0.55], [0.7, 0.62, 0.55]); for (const s of [-1, 1]) k.span(M.timber, [-0.9, 0.62, s * 0.55 - 0.03], [0.7, 0.85, s * 0.55 + 0.03]);
  for (const s of [-1, 1]) k.rod(M.timber, [0.7, 0.6, s * 0.4], [1.6, 0.85, s * 0.35], 0.03, 6); k.rod(M.timber, [1.6, 0.85, -0.35], [1.6, 0.85, 0.35], 0.03, 6);
  for (let i = 0; i < 4; i++) k.span(M.timberDk, [-0.8, 0.62 + (i % 2) * 0.15, -0.45 + i * 0.25], [0.6, 0.77 + (i % 2) * 0.15, -0.3 + i * 0.25], { ink: 0.4 }); return k; });
export const HandCart: React.FC<{ spin: number }> = ({ spin }) => <group><KitMesh kit={cartKit()} />{[-1, 1].map((s) => <group key={s} position={[-0.1, 0.5, s * 0.66]} rotation={[0, 0, -spin]}><KitMesh kit={spokedKit(0.5)} /></group>)}</group>;
/** timber derrick: mast + guys, boom (luffing), pulley blocks, rope + hook (hook height given), hand winch with crank */
const derrickKit = () => once("derrick", () => { const M = jMats(), k = new Kit();
  k.box(M.timber, [0.3, 9.5, 0.3], [0, 4.75, 0]); for (const [x, z] of [[-3, -2], [3, -2], [0, 3.2]]) k.rod(M.machDark, [0, 9.3, 0], [x * 2.4, 0.1, z * 2.4], 0.012, 4, { ink: false });
  k.span(M.timber, [-0.6, 0, -0.6], [0.6, 0.25, 0.6]); k.span(M.machDark, [0.4, 0.25, -0.5], [1.2, 0.9, 0.5]); k.cyl(M.machDark, 0.25, 0.25, 0.9, [0.8, 0.95, 0], [Math.PI / 2, 0, 0], 14); k.rod(M.wrought, [0.8, 0.95, 0.5], [0.8, 1.3, 0.75], 0.02, 5);
  k.sphere(M.wrought, 0.12, [0, 9.4, 0]); return k; });
const boomKit = () => once("boom", () => { const M = jMats(), k = new Kit(); k.box(M.timber, [0.24, 8.0, 0.24], [0, 4.0, 0]); k.sphere(M.wrought, 0.13, [0, 8.0, 0]); return k; });
export const Derrick: React.FC<{ luff: number; slew: number; hookY: number; load?: React.ReactNode }> = ({ luff, slew, hookY, load }) => { const M = jMats();
  const tip: V3 = [Math.sin(luff) * 8.0 * Math.cos(slew), 0.6 + Math.cos(luff) * 8.0, -Math.sin(luff) * 8.0 * Math.sin(slew)];
  return <group><KitMesh kit={derrickKit()} /><group position={[0, 0.6, 0]} rotation={[0, slew, -luff]}><KitMesh kit={boomKit()} /></group>
    <mesh position={[tip[0], (tip[1] + hookY) / 2, tip[2]]} material={M.machDark}><cylinderGeometry args={[0.012, 0.012, Math.max(0.1, tip[1] - hookY), 5]} /></mesh>
    <mesh position={[(tip[0]) / 2, (tip[1] + 9.4) / 2, tip[2] / 2]} material={M.machDark} rotation={[0, 0, 0]}><cylinderGeometry args={[0.01, 0.01, 0.1, 4]} /></mesh>
    <group position={[tip[0], hookY, tip[2]]}><mesh material={M.wrought}><torusGeometry args={[0.12, 0.03, 6, 12, Math.PI * 1.5]} /></mesh>{load}</group></group>; };
export type { CarType };
