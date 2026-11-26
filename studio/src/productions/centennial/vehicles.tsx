// Fire apparatus and cars of each era (original generic designs, no brands). Local frame: +x = forward, y up,
// ground at y = 0, centred on z. Wheels spin about their axles (`spin` = radians rolled).
//  HoseCart   1901 hand-drawn hose reel: tall wooden-spoked wheels with iron tyres, hose reel between them, pull pole
//             with drag ropes, brass hubs + lanterns, nozzle + axes, gold striping
//  Apparatus  "1912" motor chemical car (brass radiator, open seat, twin chemical tanks, hose basket, artillery wheels)
//             "1938" open-cab pumper (long hood, chrome grille, fenders, pump panel, hose bed, side ladders, bell)
//             "1976" cab-forward canopy pumper (flat-face tilt cab, light bar, compartments, pump panel, hose bed)
//             "mod"  modern custom-cab engine (raised roof, big glass, LED bars, roll-up compartment doors)
//  Sedan70    1970s full-size sedan (long hood + deck, chrome bumpers); police version with light bar + door shields
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { cm, enamel } from "./mats";
import type { V3 } from "../../lib/math";

type WheelType = "wood" | "artillery" | "disc" | "mod";
const wheelKit = (type: WheelType, r: number, w: number) => once(`cw${type}${r}${w}`, () => { const M = cm(), k = new Kit();
  if (type === "wood") { // iron tyre, felloe, 14 spokes, brass hub
    k.torus(M.castIron, r - 0.02, 0.025, [0, 0, 0], [0, 0, 0], Math.PI * 2, { ink: 0.5 }); k.torus(M.red, r - 0.07, 0.035, [0, 0, 0], [0, 0, 0], Math.PI * 2, { ink: 0.4 });
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; k.rod(M.red, [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0], [Math.cos(a) * (r - 0.09), Math.sin(a) * (r - 0.09), 0], 0.022, 6, { ink: 0.25 }); }
    k.cyl(M.brass, 0.1, 0.12, 0.2, [0, 0, 0], [Math.PI / 2, 0, 0], 16); k.cyl(M.brass, 0.05, 0.05, 0.28, [0, 0, 0], [Math.PI / 2, 0, 0], 12);
  } else if (type === "artillery") { // solid rubber tyre on a wooden artillery wheel
    k.torus(M.rubber, r - 0.05, 0.06, [0, 0, 0], [0, 0, 0], Math.PI * 2, { ink: 0.5 }); k.cyl(M.red, r - 0.1, r - 0.1, w * 0.5, [0, 0, 0], [Math.PI / 2, 0, 0], 24, { ink: false });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; k.box(M.red, [r - 0.18, 0.06, 0.07], [Math.cos(a) * (r - 0.1) / 2, Math.sin(a) * (r - 0.1) / 2, w * 0.27], [0, 0, a], { ink: 0.25 }); }
    k.cyl(M.brass, 0.09, 0.11, w * 0.6, [0, 0, w * 0.1], [Math.PI / 2, 0, 0], 14);
  } else { // pneumatic tyre + steel (disc) or polished (mod) wheel
    const lat: [number, number][] = [[r * 0.62, -w / 2], [r * 0.9, -w / 2], [r, -w * 0.38], [r, w * 0.38], [r * 0.9, w / 2], [r * 0.62, w / 2]];
    k.lathe(M.rubber, lat, [0, 0, 0], 32, [Math.PI / 2, 0, 0], { ink: 0.5 });
    k.cyl(type === "mod" ? M.chrome : M.whiteEnamel, r * 0.62, r * 0.62, w * 0.8, [0, 0, 0], [Math.PI / 2, 0, 0], 24, { ink: false });
    k.cyl(M.steelDark, r * 0.3, r * 0.34, w * 0.84, [0, 0, 0], [Math.PI / 2, 0, 0], 16, { ink: false });
    for (let i = 0; i < (type === "mod" ? 10 : 8); i++) { const a = (i / (type === "mod" ? 10 : 8)) * Math.PI * 2; k.cyl(M.chrome, 0.018, 0.018, 0.05, [Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22, w * 0.42], [Math.PI / 2, 0, 0], 6, { ink: false }); }
    if (type === "mod") for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.box(M.steel, [r * 0.24, 0.06, 0.02], [Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46, w * 0.41], [0, 0, a], { ink: false }); }
    else for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; k.cyl(M.steelDark, 0.04, 0.04, w * 0.82, [Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46, 0], [Math.PI / 2, 0, 0], 10, { ink: false }); }
  }
  return k; });
const Wheel: React.FC<{ type: WheelType; r: number; w: number; p: V3; spin: number; flip?: boolean }> = ({ type, r, w, p, spin, flip }) =>
  <group position={p} rotation={[0, flip ? Math.PI : 0, 0]}><group rotation={[0, 0, flip ? spin : -spin]}><KitMesh kit={wheelKit(type, r, w)} /></group></group>;

// ================================================================= 1901 hose cart
const cartKit = (col: string) => once(`hoseCart${col}`, () => { const M = cm(), P = enamel(col), k = new Kit(), R = 0.78, hw = 0.62;
  k.cyl(M.castIron, 0.04, 0.04, hw * 2 + 0.3, [0, R, 0], [Math.PI / 2, 0, 0], 10);
  // reel: drum with wound canvas hose + spoked flanges
  k.cyl(M.hose, 0.36, 0.36, hw * 1.55, [0, R, 0], [Math.PI / 2, 0, 0], 28);
  for (let i = 0; i < 9; i++) k.torus(M.hose, 0.36, 0.035, [0, R, -hw * 0.7 + (i * hw * 1.4) / 8], [0, 0, 0], Math.PI * 2, { ink: 0.2 });
  for (const s of [-1, 1]) { const z = s * hw * 0.8; k.torus(P, 0.58, 0.035, [0, R, z], [0, 0, 0]); k.torus(M.gold, 0.58, 0.012, [0, R, z + s * 0.035], [0, 0, 0], Math.PI * 2, { ink: false });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.rod(P, [Math.cos(a) * 0.36, R + Math.sin(a) * 0.36, z], [Math.cos(a) * 0.58, R + Math.sin(a) * 0.58, z], 0.022, 5); } }
  // frame: side rails from axle to the front pole, footboard, lamp brackets, nozzle + axes
  for (const s of [-1, 1]) { k.rod(P, [-0.2, R - 0.05, s * hw * 0.95], [1.2, R - 0.25, s * 0.28], 0.035, 6); k.rod(M.gold, [-0.2, R - 0.0, s * hw * 0.95], [1.2, R - 0.2, s * 0.28], 0.008, 4, { ink: false }); }
  k.box(P, [0.3, 0.08, 0.62], [1.2, R - 0.27, 0]); k.rod(M.wood, [1.2, R - 0.27, 0], [3.0, 0.75, 0], 0.035, 8); k.rod(M.brassDark, [3.0, 0.75, -0.35], [3.0, 0.75, 0.35], 0.025, 6);
  for (const s of [-1, 1]) { k.lathe(M.brass, [[0, 0], [0.07, 0], [0.09, 0.08], [0.09, 0.2], [0.05, 0.26], [0.02, 0.32], [0, 0.32]], [0.95, R - 0.1, s * 0.42], 14); k.cyl(M.glass, 0.075, 0.075, 0.12, [0.95, R + 0.04, s * 0.42], [0, 0, 0], 12, { ink: false }); }
  k.rod(M.brass, [0.2, R + 0.48, 0.1], [0.95, R + 0.18, 0.1], 0.04, 10); k.cyl(M.brass, 0.02, 0.05, 0.3, [1.08, R + 0.12, 0.1], [0, 0, -1.2]);
  k.rod(M.wood, [-0.1, R + 0.62, -0.25], [0.9, R + 0.4, -0.25], 0.025, 6); k.box(M.steel, [0.22, 0.14, 0.03], [0.92, R + 0.42, -0.25], [0, 0, -0.2]);
  // drag ropes coiled on the pole
  for (let i = 0; i < 5; i++) k.torus(M.canvas, 0.11, 0.018, [2.0 + i * 0.05, 0.86, 0.12], [0, Math.PI / 2, 0], Math.PI * 2, { ink: false });
  return k; });
export const HOSE_R = 0.78;
export const HoseCart: React.FC<{ spin?: number; color?: string }> = ({ spin = 0, color = "#a81a16" }) => <group>
  <KitMesh kit={cartKit(color)} />{[-1, 1].map((s) => <Wheel key={s} type="wood" r={HOSE_R} w={0.1} p={[0, HOSE_R, s * 0.75]} spin={spin} flip={s < 0} />)}
</group>;

// ================================================================= motor apparatus by era
export type AppType = "1912" | "1938" | "1976" | "mod";
export const APP: Record<AppType, { L: number; W: number; wb: number; rf: number; rr: number; wt: WheelType; fx: number }> = {
  "1912": { L: 5.6, W: 1.75, wb: 3.3, rf: 0.48, rr: 0.5, wt: "artillery", fx: 1.9 },
  "1938": { L: 7.2, W: 2.2, wb: 4.0, rf: 0.5, rr: 0.5, wt: "disc", fx: 2.4 },
  "1976": { L: 8.4, W: 2.45, wb: 4.6, rf: 0.55, rr: 0.55, wt: "disc", fx: 3.2 },
  "mod": { L: 10.0, W: 2.55, wb: 5.2, rf: 0.6, rr: 0.6, wt: "mod", fx: 3.7 },
};
/** side ladder on brackets (rails + rungs) */
const ladder = (k: Kit, mat: THREE.Material, x0: number, x1: number, y: number, z: number, w = 0.42) => { for (const dy of [0, w]) k.rod(mat, [x0, y + dy, z], [x1, y + dy, z], 0.03, 6); for (let x = x0 + 0.15; x < x1; x += 0.3) k.rod(mat, [x, y, z], [x, y + w, z], 0.015, 5, { ink: false }); };
/** row of compartment doors (hinged panels or roll-ups) on one side */
const compartments = (k: Kit, M: ReturnType<typeof cm>, P: THREE.Material, x0: number, x1: number, y0: number, y1: number, z: number, roll: boolean) => {
  const n = Math.max(2, Math.round((x1 - x0) / 1.1)), w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { const a = x0 + i * w + 0.04, b = a + w - 0.08;
    k.span(roll ? M.steel : P, [a, y0 + 0.05, z], [b, y1 - 0.05, z + Math.sign(z) * 0.02]);
    if (roll) for (let y = y0 + 0.12; y < y1 - 0.08; y += 0.07) k.span(M.steelDark, [a, y, z + Math.sign(z) * 0.02], [b, y + 0.008, z + Math.sign(z) * 0.024], { ink: false });
    else k.span(M.chrome, [(a + b) / 2 - 0.08, (y0 + y1) / 2, z + Math.sign(z) * 0.02], [(a + b) / 2 + 0.08, (y0 + y1) / 2 + 0.04, z + Math.sign(z) * 0.04], { ink: false });
    k.span(M.chrome, [a - 0.03, y1 - 0.06, z], [b + 0.03, y1 - 0.02, z + Math.sign(z) * 0.03], { ink: false }); }
};
const appKit = (type: AppType) => once(`app${type}`, () => { const M = cm(), d = APP[type], k = new Kit(), hw = d.W / 2, P = type === "1912" ? M.red : type === "1938" ? M.red : type === "1976" ? M.red76 : M.redMod;
  const xr = -d.wb / 2, xf = d.wb / 2, frameY = d.rr + 0.12;
  // chassis rails + bumper
  for (const s of [-1, 1]) k.span(M.black, [-d.L / 2 + 0.2, frameY - 0.12, s * 0.42 - 0.06], [d.L / 2 - 0.1, frameY + 0.08, s * 0.42 + 0.06], { ink: false });
  if (type === "1912") {
    // brass radiator, long hood with louvres, cowl, open bench seat, steering column, twin chemical tanks, hose basket
    k.span(M.brass, [xf + 0.65, 0.75, -0.42], [xf + 0.75, 1.55, 0.42]); for (let y = 0.82; y < 1.5; y += 0.05) k.span(M.brassDark, [xf + 0.75, y, -0.36], [xf + 0.76, y + 0.02, 0.36], { ink: false });
    k.span(P, [xf - 0.6, 0.85, -0.45], [xf + 0.65, 1.45, 0.45]); for (let x = xf - 0.4; x < xf + 0.5; x += 0.12) for (const s of [-1, 1]) k.span(M.black, [x, 1.05, s * 0.452], [x + 0.06, 1.3, s * 0.457], { ink: false });
    k.span(P, [xf - 1.1, 0.85, -0.7], [xf - 0.6, 1.55, 0.7]); k.span(M.leatherBlk, [xf - 1.7, 0.95, -0.72], [xf - 1.1, 1.15, 0.72]); k.span(M.leatherBlk, [xf - 1.8, 1.15, -0.72], [xf - 1.7, 1.75, 0.72]);
    k.rod(M.black, [xf - 0.8, 1.0, 0.3], [xf - 1.15, 1.75, 0.3], 0.025); k.torus(M.wood, 0.2, 0.02, [xf - 1.18, 1.78, 0.3], [0, Math.PI / 2 + 0.6, 0]);
    for (const s of [-1, 1]) { k.cyl(M.nickel, 0.24, 0.24, 1.0, [xf - 2.35, 1.35, s * 0.36], [0, 0, 0], 20); k.sphere(M.nickel, 0.24, [xf - 2.35, 1.85, s * 0.36], [1, 0.35, 1]); k.cyl(M.brass, 0.05, 0.05, 0.1, [xf - 2.35, 1.95, s * 0.36]); }
    k.span(P, [-d.L / 2 + 0.1, 0.85, -0.85], [xf - 1.8, 1.0, 0.85]); for (const s of [-1, 1]) k.span(P, [-d.L / 2 + 0.1, 1.0, s * 0.85 - 0.04], [xf - 2.7, 1.45, s * 0.85 + 0.04]);
    for (let x = -d.L / 2 + 0.25; x < xf - 2.75; x += 0.22) for (const s of [-1, 1]) k.rod(M.brass, [x, 1.45, s * 0.85], [x, 1.62, s * 0.85], 0.012, 5, { ink: false });
    for (let i = 0; i < 4; i++) k.box(M.hose, [1.0, 0.13, 1.55], [-d.L / 2 + 0.9, 1.06 + i * 0.13, 0], [0, 0, 0], { ink: 0.25 });
    for (const s of [-1, 1]) k.box(P, [1.7, 0.04, 0.42], [xf + 0.0, d.rf + 0.42, s * 0.82], [s * -0.25, 0, 0]);
    k.lathe(M.brass, [[0, 0], [0.13, 0.02], [0.18, 0.1], [0.16, 0.22], [0.05, 0.28], [0, 0.29]], [xf + 0.3, 1.45, 0], 18, [0, 0, Math.PI]);
    for (const s of [-1, 1]) { k.cyl(M.brass, 0.13, 0.11, 0.2, [xf + 0.85, 1.25, s * 0.55], [0, 0, Math.PI / 2], 16); k.cyl(M.glass, 0.11, 0.11, 0.02, [xf + 0.96, 1.25, s * 0.55], [0, 0, Math.PI / 2], 16, { ink: false }); }
    ladder(k, M.wood, -d.L / 2 + 0.1, xf - 1.0, 1.55, 0.9, 0.36);
  } else if (type === "1938") {
    // chrome grille shell, long hood, sweeping fenders + running boards, windshield, open cab with seats, pump panel,
    // hose bed with canvas cover, side ladders, bell, siren, headlamps
    k.span(M.chrome, [xf + 0.85, 0.8, -0.5], [xf + 0.98, 1.75, 0.5]); for (let z = -0.42; z < 0.43; z += 0.06) k.span(M.black, [xf + 0.98, 0.86, z], [xf + 0.99, 1.68, z + 0.025], { ink: false });
    k.span(P, [xf - 0.7, 0.95, -0.52], [xf + 0.85, 1.72, 0.52]); for (let x = xf - 0.45; x < xf + 0.6; x += 0.1) for (const s of [-1, 1]) k.span(M.chrome, [x, 1.2, s * 0.522], [x + 0.05, 1.5, s * 0.527], { ink: false });
    for (const s of [-1, 1]) { k.ext(P, [[-0.7, 0], [0.9, 0], [1.05, 0.25], [0.85, 0.55], [0.35, 0.62], [-0.2, 0.45]], 0.42, [xf, d.rf + 0.02, s * 0.85], [0, 0, 0], 0.03);
      k.span(M.black, [xf - 3.2, d.rf + 0.0, s * 0.75], [xf - 0.7, d.rf + 0.05, s * 1.05]); }
    for (const s of [-1, 1]) { k.sphere(M.chrome, 0.15, [xf + 0.85, 1.55, s * 0.7], [0.7, 1, 1]); k.cyl(M.glass, 0.12, 0.12, 0.02, [xf + 0.95, 1.55, s * 0.7], [0, 0, Math.PI / 2], 16, { ink: false }); }
    k.span(P, [xf - 1.0, 0.95, -hw], [xf - 0.7, 1.9, hw]); k.box(M.glass, [0.02, 0.5, d.W - 0.3], [xf - 0.85, 2.2, 0], [0, 0, 0.12], { ink: 0.3 }); k.span(M.chrome, [xf - 0.9, 1.92, -hw + 0.1], [xf - 0.82, 1.96, hw - 0.1], { ink: false });
    k.span(M.leatherBlk, [xf - 1.9, 1.0, -hw + 0.1], [xf - 1.0, 1.3, hw - 0.1]); k.span(M.leatherBlk, [xf - 2.0, 1.3, -hw + 0.1], [xf - 1.85, 1.95, hw - 0.1]);
    k.rod(M.black, [xf - 0.75, 1.25, 0.45], [xf - 1.15, 1.85, 0.45], 0.03); k.torus(M.black, 0.22, 0.02, [xf - 1.18, 1.88, 0.45], [0, Math.PI / 2 + 0.6, 0]);
    k.span(P, [xf - 2.9, 0.9, -hw], [xf - 2.0, 1.8, hw]); for (const s of [-1, 1]) { k.span(M.chrome, [xf - 2.85, 1.0, s * hw], [xf - 2.05, 1.75, s * (hw + 0.02)]); for (const [x, y] of [[-2.65, 1.5], [-2.3, 1.5], [-2.5, 1.2]]) { k.cyl(M.whiteEnamel, 0.08, 0.08, 0.04, [xf + x, y, s * (hw + 0.04)], [Math.PI / 2, 0, 0], 16, { ink: 0.3 }); k.torus(M.chrome, 0.08, 0.012, [xf + x, y, s * (hw + 0.06)], [0, 0, 0], Math.PI * 2, { ink: false }); }
      k.cyl(M.brass, 0.07, 0.07, 0.12, [xf - 2.2, 1.0, s * (hw + 0.06)], [Math.PI / 2, 0, 0], 12); }
    k.span(P, [-d.L / 2, 0.9, -hw], [xf - 2.9, 1.65, hw]); k.span(M.canvas, [-d.L / 2 + 0.05, 1.65, -hw + 0.08], [xf - 3.0, 1.82, hw - 0.08]);
    compartments(k, M, P, -d.L / 2 + 0.15, xf - 3.0, 0.95, 1.6, hw, false); compartments(k, M, P, -d.L / 2 + 0.15, xf - 3.0, 0.95, 1.6, -hw, false);
    for (const s of [-1, 1]) ladder(k, M.wood, -d.L / 2 - 0.2, xf - 2.2, 1.9, s * (hw + 0.08), 0.4);
    k.lathe(M.brass, [[0, 0], [0.14, 0.02], [0.19, 0.1], [0.17, 0.24], [0.05, 0.3], [0, 0.31]], [xf + 0.5, 1.75 + 0.31, 0], 18, [0, 0, Math.PI]); k.cyl(M.chrome, 0.11, 0.09, 0.22, [xf + 0.75, 1.82, -0.3], [0, 0, Math.PI / 2], 16);
    k.span(M.chrome, [xf + 0.9, d.rf - 0.05, -hw - 0.05], [xf + 1.15, d.rf + 0.12, hw + 0.05]);
    for (const s of [-1, 1]) k.ext(P, [[-0.75, 0], [0.75, 0], [0.62, 0.3], [-0.62, 0.3]], 0.36, [xr, d.rr + 0.18, s * 0.92], [0, 0, 0], 0.02);
  } else {
    // cab-forward (1976 canopy / modern custom): boxy cab, big glass, roof light bar, grille, bumper, compartments,
    // pump panel, hose bed, ladders, rear step
    const mod = type === "mod", cabL = mod ? 2.7 : 2.3, cab0 = xf + d.fx - cabL - (mod ? 0.2 : 0.4), cab1 = cab0 + cabL, roof = mod ? 3.15 : 2.85, top = mod ? M.whiteEnamel : M.whiteEnamel;
    k.span(P, [cab0, 0.75, -hw], [cab1, roof - 0.12, hw]); k.span(top, [cab0 + 0.04, roof - 0.12, -hw + 0.02], [cab1 - 0.04, roof, hw - 0.02]);
    k.box(M.glassDark, [0.04, mod ? 1.05 : 0.9, d.W - 0.24], [cab1 + 0.005, roof - (mod ? 0.75 : 0.68), 0], [0, 0, 0.06], { ink: 0.3 });
    for (const s of [-1, 1]) { for (const [a, b] of [[cab1 - 0.95, cab1 - 0.12], [cab0 + 0.15, cab1 - 1.05]]) k.span(M.glassDark, [a, 1.85, s * hw], [b, roof - 0.28, s * (hw + 0.012)], { ink: 0.3 });
      k.span(M.chrome, [cab1 - 1.0, 0.9, s * hw], [cab1 - 0.98, 2.6, s * (hw + 0.02)], { ink: false }); k.span(M.chrome, [cab1 - 0.4, 1.4, s * (hw + 0.012)], [cab1 - 0.25, 1.45, s * (hw + 0.04)], { ink: false });
      k.box(M.black, [0.05, 0.42, 0.18], [cab1 + 0.1, 2.0, s * (hw + 0.22)]); k.rod(M.chrome, [cab1 - 0.1, 2.0, s * hw], [cab1 + 0.1, 2.0, s * (hw + 0.2)], 0.015, 5, { ink: false });
      for (let i = 0; i < 2; i++) k.span(M.steel, [cab1 - 0.9 + i * 0.4, 0.45 + i * 0.32, s * (hw - 0.05)], [cab1 - 0.6 + i * 0.4, 0.5 + i * 0.32, s * (hw + 0.12)], { ink: false }); }
    k.span(M.chrome, [cab1, 0.85, -0.65], [cab1 + 0.03, 1.55, 0.65]); for (let y = 0.9; y < 1.52; y += 0.07) k.span(M.black, [cab1 + 0.03, y, -0.6], [cab1 + 0.035, y + 0.03, 0.6], { ink: false });
    for (const s of [-1, 1]) { k.span(M.chrome, [cab1, 0.95, s * 0.82 - 0.17], [cab1 + 0.03, 1.25, s * 0.82 + 0.17]); k.span(mod ? M.lampCool : M.lamp, [cab1 + 0.03, 1.0, s * 0.82 - 0.14], [cab1 + 0.04, 1.2, s * 0.82 + 0.14], { ink: false });
      k.span(M.redMod, [cab1, 0.55, s * (hw - 0.12) - 0.08], [cab1 + 0.04, 0.72, s * (hw - 0.12) + 0.08], { ink: false }); }
    k.span(M.chrome, [cab1 + 0.02, 0.45, -hw - 0.05], [cab1 + 0.45, 0.72, hw + 0.05]);
    k.span(M.steelDark, [cab0 + 0.5, roof, -hw + 0.15], [cab1 - 0.3, roof + 0.16, hw - 0.15]); for (let i = 0; i < 6; i++) k.span(i % 2 ? M.lampCool : M.redMod, [cab1 - 0.32 - 0.02, roof + 0.03, -hw + 0.25 + i * ((d.W - 0.5) / 6)], [cab1 - 0.28, roof + 0.14, -hw + 0.25 + (i + 0.85) * ((d.W - 0.5) / 6)], { ink: false });
    if (!mod) k.span(M.whiteEnamel, [cab0, 1.6, -hw - 0.005], [cab1, 1.72, hw + 0.005], { ink: false });
    // body
    const b0 = -d.L / 2, b1 = cab0 - 0.05, by = mod ? 2.55 : 2.15;
    k.span(P, [b0, 0.7, -hw], [b1 - 1.1, by, hw]);
    compartments(k, M, P, b0 + 0.1, b1 - 1.2, 0.8, by - 0.15, hw + 0.001, mod); compartments(k, M, P, b0 + 0.1, b1 - 1.2, 0.8, by - 0.15, -hw - 0.001, mod);
    k.span(M.steel, [b1 - 1.1, 0.7, -hw], [b1, by + 0.1, hw]); for (const s of [-1, 1]) { k.span(M.steelDark, [b1 - 1.0, 0.9, s * hw], [b1 - 0.1, by - 0.05, s * (hw + 0.01)], { ink: false });
      for (const [x, y, r] of [[-0.75, 1.7, 0.08], [-0.45, 1.7, 0.08], [-0.6, 1.95, 0.1], [-0.3, 1.2, 0.05], [-0.8, 1.2, 0.05]]) { k.cyl(M.whiteEnamel, r, r, 0.04, [b1 + x, y, s * (hw + 0.03)], [Math.PI / 2, 0, 0], 16, { ink: 0.3 }); k.torus(M.chrome, r, 0.01, [b1 + x, y, s * (hw + 0.05)], [0, 0, 0], Math.PI * 2, { ink: false }); }
      for (const x of [-0.85, -0.3]) { k.cyl(M.chrome, 0.07, 0.07, 0.14, [b1 + x, 1.0, s * (hw + 0.08)], [Math.PI / 2, 0, 0], 12); k.cyl(M.yellowLine, 0.075, 0.075, 0.03, [b1 + x, 1.0, s * (hw + 0.16)], [Math.PI / 2, 0, 0], 12, { ink: false }); } }
    k.span(M.steel, [b0, by, -hw + 0.05], [b1 - 1.1, by + 0.05, hw - 0.05], { ink: false });
    for (let i = 0; i < 3; i++) k.box(i === 1 ? M.hoseRed : M.hose, [b1 - 1.4 - b0 - 0.2, 0.15, 0.6], [(b0 + b1 - 1.1) / 2, by + 0.12 + 0.0, -0.75 + i * 0.75], [0, 0, 0], { ink: 0.3 });
    k.span(M.steelDark, [b0 + 0.1, by + 0.25, -hw + 0.02], [b1 - 1.2, by + 0.3, -hw + 0.12]);
    ladder(k, M.steel, b0 + 0.1, b1 - 1.3, by + 0.32, hw - 0.12, 0.4);
    k.span(M.steel, [b0 - 0.35, 0.55, -hw + 0.05], [b0, 0.62, hw - 0.05]);
    for (const s of [-1, 1]) { k.span(M.redMod, [b0 - 0.01, 1.5, s * (hw - 0.2) - 0.1], [b0, 1.75, s * (hw - 0.2) + 0.1], { ink: false }); k.span(M.lamp, [b0 - 0.01, 1.2, s * (hw - 0.2) - 0.1], [b0, 1.35, s * (hw - 0.2) + 0.1], { ink: false }); }
    for (const s of [-1, 1]) k.span(P, [xr - 0.75, d.rr + 0.2, s * (hw - 0.02)], [xr + 0.75, d.rr + 0.24, s * (hw + 0.06)]);
    if (mod) { for (const s of [-1, 1]) k.span(M.reflect, [b0, 0.95, s * (hw + 0.004)], [b1 - 1.2, 1.05, s * (hw + 0.008)], { ink: false }); }
    else for (const s of [-1, 1]) k.span(M.gold, [b0, 0.78, s * (hw + 0.004)], [cab1, 0.82, s * (hw + 0.008)], { ink: false });
  }
  return k; });
export const Apparatus: React.FC<{ type: AppType; spin?: number }> = ({ type, spin = 0 }) => { const d = APP[type], hw = d.W / 2 - 0.12, dual = type !== "1912";
  return <group><KitMesh kit={appKit(type)} />
    {[-1, 1].map((s) => <Wheel key={`f${s}`} type={d.wt} r={d.rf} w={0.28} p={[d.wb / 2, d.rf, s * hw]} spin={spin} flip={s < 0} />)}
    {[-1, 1].map((s) => <Wheel key={`r${s}`} type={d.wt} r={d.rr} w={dual ? 0.5 : 0.28} p={[-d.wb / 2, d.rr, s * hw]} spin={spin * d.rf / d.rr} flip={s < 0} />)}
  </group>; };

// ================================================================= 1970s sedan (civilian / police)
const sedanKit = (col: string, police: boolean) => once(`sedan70${col}${police}`, () => { const M = cm(), P = police ? M.whiteEnamel : enamel(col), Bk = M.black, k = new Kit(), L = 5.4, hw = 1.0, y0 = 0.32;
  const prof: [number, number][] = [[-L / 2, y0 + 0.05], [-1.95, y0], [-1.25, y0], [-1.22, 0.62], [-0.9, 0.7], [-0.6, 0.62], [-0.58, y0], [1.15, y0], [1.18, 0.62], [1.5, 0.7], [1.8, 0.62], [1.83, y0], [L / 2, y0 + 0.05], [L / 2, 0.86], [L / 2 - 0.1, 0.9], [-L / 2 + 0.05, 0.92], [-L / 2, 0.86]];
  k.ext(P, prof, hw * 2, [0, 0, 0], [0, 0, 0], 0.03);
  if (police) { const D = M.black; k.ext(D, [[-0.62, 0.36], [1.12, 0.36], [1.12, 0.9], [-0.62, 0.9]], hw * 2 + 0.012, [0, 0, 0]); }
  k.ext(M.glassDark, [[1.0, 0.92], [0.45, 1.38], [-0.95, 1.38], [-1.5, 0.92]], hw * 2 - 0.14, [0, 0, 0], [0, 0, 0], 0.02, { ink: 0.4 });
  k.ext(P, [[0.42, 1.36], [-0.93, 1.36], [-0.92, 1.42], [0.41, 1.42]], hw * 2 - 0.12, [0, 0, 0]);
  for (const s of [-1, 1]) { k.rod(P, [0.98, 0.92, s * (hw - 0.07)], [0.43, 1.38, s * (hw - 0.07)], 0.035, 6); k.rod(P, [-0.2, 0.92, s * (hw - 0.07)], [-0.25, 1.38, s * (hw - 0.07)], 0.04, 6); k.rod(P, [-1.48, 0.92, s * (hw - 0.07)], [-0.93, 1.38, s * (hw - 0.07)], 0.06, 6);
    k.span(M.chrome, [-L / 2 + 0.2, 0.62, s * hw], [L / 2 - 0.2, 0.65, s * (hw + 0.012)], { ink: false }); for (const x of [0.2, -0.95]) k.span(M.chrome, [x - 0.1, 0.85, s * hw], [x + 0.02, 0.87, s * (hw + 0.015)], { ink: false });
    k.span(M.lamp, [L / 2 - 0.01, 0.62, s * 0.72 - 0.12], [L / 2 + 0.01, 0.76, s * 0.72 + 0.12], { ink: false }); k.span(M.redMod, [-L / 2 - 0.01, 0.6, s * 0.7 - 0.2], [-L / 2 + 0.01, 0.78, s * 0.7 + 0.2], { ink: false }); }
  for (const sx of [-1, 1]) k.span(M.chrome, [sx * L / 2 - (sx > 0 ? 0 : 0.1), 0.38, -hw - 0.03], [sx * L / 2 + (sx > 0 ? 0.1 : 0), 0.52, hw + 0.03]);
  k.span(Bk, [L / 2 - 0.005, 0.56, -0.55], [L / 2 + 0.005, 0.8, 0.55], { ink: false }); for (let z = -0.5; z < 0.52; z += 0.08) k.span(M.chrome, [L / 2 + 0.005, 0.58, z], [L / 2 + 0.01, 0.78, z + 0.02], { ink: false });
  if (police) { k.span(M.black, [-0.4, 1.43, -0.65], [0.0, 1.47, 0.65]); k.span(M.redMod, [-0.35, 1.47, -0.62], [-0.05, 1.6, -0.05]); k.span(M.lampCool, [-0.35, 1.47, 0.05], [-0.05, 1.6, 0.62]); k.span(M.chrome, [-0.38, 1.47, -0.05], [-0.02, 1.62, 0.05]); }
  return k; });
export const Sedan70: React.FC<{ color?: string; police?: boolean; spin?: number }> = ({ color = "#6a7a3a", police = false, spin = 0 }) => <group>
  <KitMesh kit={sedanKit(color, police)} />{[[1.5, -0.9], [1.5, 0.9], [-0.9, -0.9], [-0.9, 0.9]].map(([x, z], i) => <Wheel key={i} type="disc" r={0.34} w={0.22} p={[x, 0.34, z]} spin={spin} flip={z < 0} />)}
</group>;
