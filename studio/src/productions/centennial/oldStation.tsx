// The old Livermore fire station (original design after period California firehouses): one building dressed for each
// era from 1901 to 1976. Brick ground storey with two segmental-arched apparatus doors (stone voussoirs + keystones,
// granite plinth, panelled doors with glazed lights folded open inside), painted sign frieze + dentil cornice,
// clapboard upper storey with sash windows and a bracketed cornice, false-front parapet with pediment, open bell
// cupola, hose-drying tower. Inside: plank floor, cast-iron columns under a timber girder, exposed joists, brick
// and plastered walls with wainscot, side windows for daylight, stair, stove, workbench, hose rack, gong.
// World frame: facade face z = 0 (street at +z), interior z in [-14, 0], x in [-5.5, 5.5], floor y = 0.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { archMats, windowUnit, wallRect, signTex, type Rect } from "../short3/archKit";
import { cm } from "./mats";
import type { V3 } from "../../lib/math";

export type Era = "1901" | "1912" | "1938" | "1955" | "1976";
export const ERA_N: Record<Era, number> = { "1901": 0, "1912": 1, "1938": 2, "1955": 3, "1976": 4 };
export const OLD = { W: 11, D: 14, H1: 5.0, girderY: 4.38, joistY: 4.78, doorCx: [-3.0, 3.0], doorHW: 1.6, doorH: 3.7, archTop: 4.2, cols: [-4.8, -9.6] };
/** where the Centennial Light hangs in the old station (ceiling attach point on the girder) and its cord drop */
export const OLD_BULB: V3 = [0, OLD.girderY, -3.3];
export const OLD_DROP = 1.73;
/** the "ordinary bulb" pendant next to it (same socket height -> match framing) */
export const OLD_NEXT: V3 = [1.6, OLD.joistY, -3.3];
export const OLD_NEXT_DROP = OLD.joistY - (OLD.girderY - OLD_DROP);
/** background fixtures (era-dressed), behind the Centennial as seen from the front */
export const OLD_FIX: V3[] = [[-0.95, OLD.joistY, -6.7], [-2.35, OLD.joistY, -6.7], [-0.95, OLD.joistY, -10.1], [-2.35, OLD.joistY, -10.1]];

const arc = (cx: number, hw: number, yS: number, yT: number, n = 14): [number, number][] => { const s = yT - yS, R = (hw * hw + s * s) / (2 * s), cy = yT - R, a0 = Math.asin(hw / R);
  return Array.from({ length: n + 1 }, (_, i) => { const a = -a0 + (2 * a0 * i) / n; return [cx + Math.sin(a) * R, cy + Math.cos(a) * R]; }); };
const archR = (hw: number, yS: number, yT: number) => { const s = yT - yS; return { R: (hw * hw + s * s) / (2 * s), cy: yT - (hw * hw + s * s) / (2 * s) }; };

/** lap-siding (clapboard) wall in the local plane z = 0 (faces +z), boards skip the rect openings */
const clapboard = (k: Kit, mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, holes: Rect[], back = 0.12) => {
  wallRect(k, mat, x0, x1, y0, y1, -back, -0.03, holes, { ink: false });
  for (let y = y0; y < y1 - 0.01; y += 0.16) { const ya = y, yb = Math.min(y1, y + 0.165);
    const cut = holes.filter((h) => h.y0 < yb && h.y1 > ya).map((h) => [h.x0, h.x1] as [number, number]).sort((a, b) => a[0] - b[0]);
    let x = x0; const seg = (a: number, b: number) => { if (b - a > 0.02) k.box(mat, [b - a, yb - ya, 0.022], [(a + b) / 2, (ya + yb) / 2, -0.012], [-0.09, 0, 0], { ink: 0.25 }); };
    for (const [a, b] of cut) { seg(x, a); x = Math.max(x, b); } seg(x, x1); }
};
/** painted window casing + sill + cap around an opening in a z = 0 wall */
const casing = (k: Kit, M: ReturnType<typeof cm>, cx: number, y0: number, w: number, h: number, cap = true) => {
  const T = M.clapTrim; k.span(T, [cx - w / 2 - 0.13, y0, 0], [cx - w / 2, y0 + h, 0.04]); k.span(T, [cx + w / 2, y0, 0], [cx + w / 2 + 0.13, y0 + h, 0.04]);
  k.span(T, [cx - w / 2 - 0.13, y0 + h, 0], [cx + w / 2 + 0.13, y0 + h + 0.16, 0.05]); k.span(T, [cx - w / 2 - 0.18, y0 - 0.06, 0], [cx + w / 2 + 0.18, y0, 0.1]);
  if (cap) { k.span(M.trimGreen, [cx - w / 2 - 0.22, y0 + h + 0.16, 0], [cx + w / 2 + 0.22, y0 + h + 0.24, 0.13]); k.ext(M.clapTrim, [[-w / 2 - 0.16, 0], [w / 2 + 0.16, 0], [0, 0.3]], 0.08, [cx, y0 + h + 0.24, 0.04]); }
};

// ================================================================= the shell (era independent)
export const oldShell = () => once("oldShell", () => { const M = cm(), A = archMats(), k = new Kit(), W2 = OLD.W / 2, D = OLD.D, H1 = OLD.H1;
  // ---- front wall: brick with two arched door openings (outline notched from the bottom)
  const out: [number, number][] = [[-W2, 0]];
  for (const cx of OLD.doorCx) { out.push([cx - OLD.doorHW, 0], [cx - OLD.doorHW, OLD.doorH]); out.push(...arc(cx, OLD.doorHW, OLD.doorH, OLD.archTop).slice(1, -1)); out.push([cx + OLD.doorHW, OLD.doorH], [cx + OLD.doorHW, 0]); }
  out.push([W2, 0], [W2, H1 + 0.02], [-W2, H1 + 0.02]);
  k.ext(M.brick, out, 0.4, [0, 0, -0.2], [0, 0, 0], 0, { ink: 0.5 });
  // voussoir rings (stone) + keystones, granite plinth, corner + centre piers
  for (const cx of OLD.doorCx) { const { R, cy } = archR(OLD.doorHW, OLD.doorH, OLD.archTop), a0 = Math.asin(OLD.doorHW / R), n = 11;
    for (let i = 0; i < n; i++) { const a = -a0 + (2 * a0 * (i + 0.5)) / n, da = (2 * a0) / n - 0.012, r0 = R + 0.005, r1 = R + (i === (n - 1) / 2 ? 0.52 : 0.36);
      const pts: [number, number][] = [[Math.sin(a - da / 2) * r0, Math.cos(a - da / 2) * r0], [Math.sin(a + da / 2) * r0, Math.cos(a + da / 2) * r0], [Math.sin(a + da / 2) * r1, Math.cos(a + da / 2) * r1], [Math.sin(a - da / 2) * r1, Math.cos(a - da / 2) * r1]];
      k.ext(i === (n - 1) / 2 ? A.sand : A.sandTrim, pts, 0.06, [cx, cy, 0.03], [0, 0, 0], 0, { ink: 0.35 }); }
    // springer blocks + iron wheel guards (bollards) at the jambs
    for (const s of [-1, 1]) { k.span(A.sandTrim, [cx + s * OLD.doorHW - (s < 0 ? 0.3 : 0), OLD.doorH - 0.3, 0], [cx + s * OLD.doorHW + (s > 0 ? 0.3 : 0), OLD.doorH, 0.06]);
      k.cyl(M.castIron, 0.09, 0.11, 0.7, [cx + s * (OLD.doorHW - 0.12), 0.35, 0.18], [0, 0, 0], 12); k.sphere(M.castIron, 0.1, [cx + s * (OLD.doorHW - 0.12), 0.72, 0.18]); } }
  for (const [a, b] of [[-W2, -4.6], [-1.4, 1.4], [4.6, W2]] as [number, number][]) k.span(A.granite, [a, 0, 0], [b, 0.5, 0.06]);
  for (const [a, b] of [[-W2, -W2 + 0.55], [W2 - 0.55, W2], [-0.55, 0.55]] as [number, number][]) { k.span(M.brick, [a, 0.5, 0], [b, H1, 0.07]); k.span(A.sandTrim, [a - 0.04, H1 - 0.28, 0], [b + 0.04, H1, 0.12]); }
  // cast-iron plaque on the centre pier (bas-relief roundel)
  k.cyl(M.castIron, 0.34, 0.34, 0.05, [0, 2.6, 0.1], [Math.PI / 2, 0, 0], 28); k.torus(M.brassDark, 0.3, 0.025, [0, 2.6, 0.13], [0, 0, 0]);
  // ---- entablature: architrave, sign frieze, dentil cornice
  k.span(M.trimGreen, [-W2 - 0.06, H1, 0], [W2 + 0.06, H1 + 0.16, 0.16]);
  k.span(M.trimGreen, [-W2 - 0.04, H1 + 0.16, -0.05], [W2 + 0.04, H1 + 0.72, 0.08]);
  k.span(M.trimGreen, [-W2 - 0.14, H1 + 0.72, 0], [W2 + 0.14, H1 + 0.84, 0.32]); k.span(M.trimGreen, [-W2 - 0.2, H1 + 0.84, 0], [W2 + 0.2, H1 + 0.94, 0.42]);
  for (let x = -W2 + 0.08; x < W2 - 0.05; x += 0.22) k.span(M.clapTrim, [x, H1 + 0.64, 0.08], [x + 0.1, H1 + 0.72, 0.26], { ink: false });
  // ---- upper storey: clapboard, three tall sash windows with casings, bracketed cornice, parapet + pediment
  const U0 = H1 + 0.94, U1 = 8.7, wins = [-3.2, 0, 3.2], wy = U0 + 0.55, ww = 1.05, wh = 1.95;
  const up = new Kit(); clapboard(up, M.clap, -W2, W2, U0, U1, wins.map((x) => ({ x0: x - ww / 2, x1: x + ww / 2, y0: wy, y1: wy + wh })));
  for (const x of wins) { windowUnit(up, A, x, wy, ww, wh, { frame: A.frameCream, panes: 2, blind: 0.35, blindMat: A.blind, open: 0 }, 0.12); casing(up, M, x, wy, ww, wh); }
  k.merge(up, [0, 0, 0]);
  k.span(M.plasterOld, [-W2 + 0.2, U0, -3.0], [W2 - 0.2, U1, -2.9], { ink: false });                              // the bunk-room wall seen through the glass
  k.span(M.floorOld, [-W2 + 0.1, U0 - 0.02, -3.0], [W2 - 0.1, U0 + 0.02, -0.15], { ink: false });
  for (const x of [-W2 - 0.02, W2 - 0.16]) k.span(M.clapTrim, [x, U0, -0.02], [x + 0.18, U1, 0.05]);              // corner boards
  k.span(M.clapTrim, [-W2 - 0.1, U1, -0.1], [W2 + 0.1, U1 + 0.3, 0.06]);
  for (let x = -W2 + 0.2; x <= W2 - 0.2 + 1e-6; x += (OLD.W - 0.4) / 10) k.ext(M.clapTrim, [[0, 0], [0.34, 0], [0.34, -0.06], [0.08, -0.32], [0, -0.32]], 0.12, [x, U1 + 0.4, 0.07], [0, -Math.PI / 2, 0], 0, { ink: 0.4 });
  k.span(M.trimGreen, [-W2 - 0.3, U1 + 0.3, -0.1], [W2 + 0.3, U1 + 0.46, 0.42]);
  k.span(M.clap, [-W2, U1 + 0.46, -0.2], [W2, U1 + 1.3, -0.02]); k.span(M.trimGreen, [-W2 - 0.08, U1 + 1.3, -0.24], [W2 + 0.08, U1 + 1.42, 0.08]);
  k.ext(M.clap, [[-2.2, 0], [2.2, 0], [0, 0.95]], 0.18, [0, U1 + 1.42, -0.11]); k.ext(M.trimGreen, [[-2.42, 0], [2.42, 0], [0, 1.08], [0, 1.2], [-2.6, 0.04]], 0.08, [0, U1 + 1.38, 0.0]);
  k.ext(M.trimGreen, [[2.6, 0.04], [0, 1.2], [0, 1.08], [2.42, 0]], 0.08, [0, U1 + 1.38, 0.0]);
  for (const x of [-W2, 0, W2]) { k.box(M.clapTrim, [0.22, 0.4, 0.22], [x, U1 + 1.62 + (x === 0 ? 0.95 : 0), -0.11]); k.sphere(M.gold, 0.1, [x, U1 + 1.9 + (x === 0 ? 0.95 : 0), -0.11]); }
  // ---- roof (gable along z behind the false front), bell cupola, hose-drying tower
  const rh = 10.6, ang = Math.atan2(rh - U1, W2 + 0.3), rl = Math.hypot(rh - U1, W2 + 0.3);
  for (const s of [-1, 1]) k.box(M.joist, [rl, 0.12, D + 0.4], [s * (W2 + 0.3) / 2, (U1 + rh) / 2, -D / 2], [0, 0, -s * ang], { ink: 0.4 });
  for (const s of [-1, 1]) k.span(M.brick, [s > 0 ? W2 - 0.4 : -W2, H1, -D], [s > 0 ? W2 : -W2 + 0.4, U1, -0.4]);
  k.ext(M.brick, [[-W2, U1], [W2, U1], [0, rh]], 0.4, [0, 0, -D + 0.2]);
  const cz = -2.6, cb = U1 + 1.6;
  k.span(M.clap, [-0.85, cb - 1.0, cz - 0.85], [0.85, cb + 0.7, cz + 0.85]); k.span(M.trimGreen, [-0.95, cb + 0.7, cz - 0.95], [0.95, cb + 0.82, cz + 0.95]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(M.clapTrim, [0.14, 1.25, 0.14], [sx * 0.75, cb + 1.45, cz + sz * 0.75]);
  for (const s of [-1, 1]) { k.ext(M.clapTrim, [[-0.68, 0], [0.68, 0], [0.68, 0.18], [0.3, 0.18], [0, 0.42], [-0.3, 0.18], [-0.68, 0.18]], 0.06, [0, cb + 1.82, cz + s * 0.75]); k.ext(M.clapTrim, [[-0.68, 0], [0.68, 0], [0.68, 0.18], [0.3, 0.18], [0, 0.42], [-0.3, 0.18], [-0.68, 0.18]], 0.06, [s * 0.75, cb + 1.82, cz], [0, Math.PI / 2, 0]); }
  k.span(M.trimGreen, [-1.0, cb + 2.08, cz - 1.0], [1.0, cb + 2.2, cz + 1.0]);
  k.add(M.trimGreen, new THREE.ConeGeometry(1.15, 1.2, 4, 1), [0, cb + 2.8, cz], [0, Math.PI / 4, 0]); k.rod(M.castIron, [0, cb + 3.4, cz], [0, cb + 4.3, cz], 0.025); k.sphere(M.gold, 0.08, [0, cb + 4.3, cz]);
  k.lathe(M.copper, [[0.0, 0.0], [0.32, 0.02], [0.34, 0.08], [0.27, 0.22], [0.2, 0.5], [0.18, 0.6], [0.06, 0.66], [0.0, 0.67]], [0, cb + 1.0, cz], 24); k.box(M.timber, [1.4, 0.12, 0.12], [0, cb + 1.7, cz]);
  const tx = -4.3, tz = -12.8, tw = 2.4, ty1 = 16.0;
  const tower = new Kit(); clapboard(tower, M.clap, -tw / 2, tw / 2, U1, ty1, [{ x0: -0.35, x1: 0.35, y0: ty1 - 2.6, y1: ty1 - 1.0 }]);
  for (let i = 0; i < 8; i++) tower.box(M.joist, [0.66, 0.05, 0.12], [0, ty1 - 2.5 + i * 0.2, -0.06], [-0.6, 0, 0], { ink: false });
  for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) k.merge(tower, [tx + Math.sin(r) * tw / 2, 0, tz + Math.cos(r) * tw / 2], [0, r, 0]);
  k.span(M.trimGreen, [tx - tw / 2 - 0.15, ty1, tz - tw / 2 - 0.15], [tx + tw / 2 + 0.15, ty1 + 0.18, tz + tw / 2 + 0.15]);
  k.add(M.trimGreen, new THREE.ConeGeometry(1.95, 1.6, 4, 1), [tx, ty1 + 0.98, tz], [0, Math.PI / 4, 0]); k.rod(M.castIron, [tx, ty1 + 1.7, tz], [tx, ty1 + 4.2, tz], 0.03);
  // ---- right side wall (faces the side yard): brick, three tall windows, plaster + wainscot inside
  const side = new Kit(), sw = [3.5, 7.5, 11.5], holes = sw.map((x) => ({ x0: x - 0.55, x1: x + 0.55, y0: 1.3, y1: 3.9 }));
  wallRect(side, M.brick, 0.4, D, 0, H1, -0.4, 0, holes, { ink: 0.5 });
  for (const x of sw) { windowUnit(side, A, x, 1.3, 1.1, 2.6, { frame: A.frameCream, panes: 2, blind: 0, open: 0 }, 0.2); side.span(A.sandTrim, [x - 0.65, 1.18, 0], [x + 0.65, 1.3, 0.1]); side.span(A.sandTrim, [x - 0.65, 3.9, 0], [x + 0.65, 4.15, 0.06]); }
  wallRect(side, M.plasterOld, 0.4, D - 0.4, 1.15, H1, -0.43, -0.4, holes.map((h) => ({ ...h })), { ink: false });
  wallRect(side, M.wainscot, 0.4, D - 0.4, 0, 1.15, -0.45, -0.4, [], { ink: false }); side.span(M.joist, [0.4, 1.12, -0.48], [D - 0.4, 1.2, -0.4], { ink: false });
  for (const x of sw) side.span(M.joist, [x - 0.62, 1.22, -0.5], [x + 0.62, 1.3, -0.4], { ink: false });
  k.merge(side, [W2, 0, 0], [0, Math.PI / 2, 0]);
  // ---- left wall (party wall): exposed brick inside
  k.span(M.brickIn, [-W2, 0, -D], [-W2 + 0.4, H1, -0.4]);
  // ---- rear wall: back door + window, plastered inside
  const rear = new Kit(), rh2: Rect[] = [{ x0: -2.6, x1: -1.6, y0: 0, y1: 2.35 }, { x0: 1.2, x1: 2.3, y0: 1.4, y1: 3.6 }];
  wallRect(rear, M.brick, -W2 + 0.4, W2 - 0.4, 0, H1, -0.4, 0, rh2); windowUnit(rear, A, 1.75, 1.4, 1.1, 2.2, { frame: A.frameCream, panes: 2, blind: 0.2, open: 0 }, 0.2);
  rear.span(M.doorPaint, [-2.58, 0, -0.28], [-1.62, 2.33, -0.22]); rear.plane(A.glass, 0.6, 0.6, [-2.1, 1.75, -0.215]); rear.span(M.brass, [-1.78, 1.05, -0.22], [-1.72, 1.12, -0.17], { ink: false });
  wallRect(rear, M.plasterOld, -W2 + 0.4, W2 - 0.4, 1.15, H1, 0.0, 0.03, rh2, { ink: false }); wallRect(rear, M.wainscot, -W2 + 0.4, W2 - 0.4, 0, 1.15, 0.0, 0.05, rh2, { ink: false });
  k.merge(rear, [0, 0, -D + 0.4], [0, Math.PI, 0]);
  // ---- floor, door aprons, ceiling (boards, joists, girder), cast-iron columns
  k.span(M.floorOld, [-W2 + 0.4, -0.12, -D + 0.4], [W2 - 0.4, 0, -0.4], { ink: false });
  for (const cx of OLD.doorCx) k.box(M.timber, [OLD.doorHW * 2 - 0.02, 0.08, 1.2], [cx, -0.05, 0.2], [-0.07, 0, 0], { ink: 0.3 });
  k.span(M.ceilBoard, [-W2 + 0.4, H1, -D + 0.4], [W2 - 0.4, H1 + 0.06, -0.4], { ink: false });
  for (let z = -0.75; z > -D + 0.5; z -= 0.61) k.span(M.joist, [-W2 + 0.4, OLD.joistY, z - 0.04], [W2 - 0.4, H1, z + 0.04], { ink: 0.35 });
  k.span(M.joist, [-0.16, OLD.girderY, -D + 0.4], [0.16, OLD.joistY, -0.4], { ink: 0.5 });
  const colM = M.trimGreen; for (const z of OLD.cols) { k.lathe(colM, [[0.0, 0], [0.17, 0], [0.17, 0.12], [0.12, 0.2], [0.095, 0.32], [0.085, 3.9], [0.11, 3.98], [0.17, 4.12], [0.22, 4.26], [0.22, OLD.girderY], [0, OLD.girderY]], [0, 0, z], 20);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.box(colM, [0.03, 3.5, 0.03], [Math.cos(a) * 0.088, 2.1, z + Math.sin(a) * 0.088], [0, -a, 0], { ink: false }); } }
  // apparatus doors: panelled leaves folded open against the jambs (inside), fixed arched transom lights
  for (const cx of OLD.doorCx) { for (const s of [-1, 1]) { const x = cx + s * (OLD.doorHW - 0.06), leaf = new Kit(), L = OLD.doorHW;
      leaf.span(M.doorPaint, [0, 0.02, -0.03], [L, OLD.doorH - 0.02, 0.03]);
      for (const [y0, y1] of [[0.25, 1.45], [1.65, 2.35]]) for (const [x0, x1] of [[0.18, L / 2 - 0.08], [L / 2 + 0.08, L - 0.18]]) { leaf.span(M.trimRed, [x0, y0, 0.03], [x1, y1, 0.05]); leaf.span(M.trimRed, [x0, y0, -0.05], [x1, y1, -0.03]); }
      leaf.plane(M.glassWin, L - 0.3, 1.0, [L / 2, 3.0, 0.035]); leaf.plane(M.glassWin, L - 0.3, 1.0, [L / 2, 3.0, -0.035], [0, Math.PI, 0]);
      for (const xx of [L / 3, (2 * L) / 3]) leaf.span(M.doorPaint, [xx - 0.025, 2.5, -0.04], [xx + 0.025, 3.5, 0.04]);
      for (const y of [0.4, 1.8, 3.3]) leaf.span(M.castIron, [0, y, 0.03], [0.4, y + 0.08, 0.05], { ink: false });
      k.merge(leaf, [x, 0, -0.42], [0, s < 0 ? -Math.PI / 2 : Math.PI / 2, 0]); void leaf; }
    const tr = arc(cx, OLD.doorHW - 0.04, OLD.doorH, OLD.archTop - 0.04);
    k.ext(M.doorPaint, [[cx - OLD.doorHW + 0.04, OLD.doorH - 0.12], [cx + OLD.doorHW - 0.04, OLD.doorH - 0.12], ...tr.slice().reverse()], 0.08, [0, 0, -0.32]);
    k.ext(M.glassWin, [[cx - OLD.doorHW + 0.14, OLD.doorH - 0.02], [cx + OLD.doorHW - 0.14, OLD.doorH - 0.02], ...arc(cx, OLD.doorHW - 0.14, OLD.doorH - 0.02, OLD.archTop - 0.14).slice().reverse()], 0.02, [0, 0, -0.26], [0, 0, 0], 0, { ink: false });
    for (let i = 1; i < 6; i++) { const a = -0.9 + (1.8 * i) / 6; k.rod(M.doorPaint, [cx, OLD.doorH - 0.05, -0.25], [cx + Math.sin(a) * 1.5, OLD.doorH + Math.cos(a) * 0.48, -0.25], 0.02, 5, { ink: false }); } }
  return k; });

// ================================================================= era-independent interior furniture
const furniture = () => once("oldFurn", () => { const M = cm(), k = new Kit(), W2 = OLD.W / 2;
  // stair along the rear wall (right), open stringers, balusters + handrail, hatch above
  const n = 16, x0 = 0.9, x1 = 5.0, zA = -13.55, zB = -12.55, rise = OLD.H1 / n, run = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { const x = x0 + i * run; k.span(M.timber, [x, (i + 1) * rise - 0.04, zA], [x + run + 0.03, (i + 1) * rise, zB]); k.span(M.joist, [x, i * rise, zA + 0.02], [x + 0.025, (i + 1) * rise - 0.04, zB - 0.02], { ink: false }); }
  for (const z of [zA, zB]) k.box(M.joist, [Math.hypot(x1 - x0, OLD.H1) + 0.2, 0.26, 0.06], [(x0 + x1) / 2, OLD.H1 / 2 - 0.05, z], [0, 0, Math.atan2(OLD.H1, x1 - x0)]);
  for (let i = 0; i < n; i += 2) { const x = x0 + (i + 0.5) * run; k.rod(M.joist, [x, (i + 1) * rise, zB + 0.04], [x, (i + 1) * rise + 0.95, zB + 0.04], 0.018, 6, { ink: false }); }
  k.rod(M.joist, [x0, 1.15, zB + 0.04], [x1, OLD.H1 + 0.95, zB + 0.04], 0.03, 8); k.box(M.joist, [0.12, 1.2, 0.12], [x0 + 0.05, 0.6, zB + 0.04]);
  k.span(M.black, [x1 - 1.2, OLD.H1 + 0.061, zA], [x1, OLD.H1 + 0.07, zB], { ink: false });
  // hose rack on the party wall: pegged rail with folded canvas hose, bucket shelf with leather buckets, tools
  const hx = -W2 + 0.4;
  k.span(M.timber, [hx, 1.9, -8.8], [hx + 0.06, 2.05, -3.2]); for (let z = -8.6; z <= -3.3; z += 0.52) { k.rod(M.wood, [hx + 0.05, 1.98, z], [hx + 0.38, 2.02, z], 0.025, 6);
    for (let j = 0; j < 4; j++) k.box(M.hose, [0.11, 1.15 - j * 0.06, 0.09], [hx + 0.12 + j * 0.07, 1.45 + j * 0.03, z], [0, 0, 0.04 * j], { ink: 0.3 }); }
  k.span(M.timber, [hx, 2.75, -8.8], [hx + 0.42, 2.8, -3.2]); for (let z = -8.5; z <= -3.4; z += 0.48) { k.lathe(M.leather, [[0, 0], [0.11, 0], [0.13, 0.32], [0.135, 0.34], [0, 0.34]], [hx + 0.2, 2.8, z], 14); k.span(M.gold, [hx + 0.06, 2.95, z - 0.07], [hx + 0.07, 3.05, z + 0.07], { ink: false }); }
  for (const z of [-9.4, -9.9]) { k.rod(M.wood, [hx + 0.1, 0.3, z], [hx + 0.1, 3.0, z], 0.022, 6); }
  k.rod(M.castIron, [hx + 0.1, 3.0, -9.4], [hx + 0.1, 3.2, -9.4], 0.012); k.box(M.castIron, [0.04, 0.22, 0.12], [hx + 0.1, 2.95, -9.9]);
  // alarm gong (big brass bell on a cast-iron bracket) near the front
  k.span(M.timber, [hx, 1.9, -1.9], [hx + 0.05, 3.1, -1.1]); k.lathe(M.brass, [[0, 0], [0.33, 0], [0.36, 0.05], [0.34, 0.08], [0.06, 0.13], [0, 0.14]], [hx + 0.2, 2.5, -1.5], 32, [0, 0, -Math.PI / 2]);
  k.sphere(M.castIron, 0.05, [hx + 0.36, 2.5, -1.5]); k.box(M.castIron, [0.06, 0.06, 0.4], [hx + 0.42, 2.25, -1.5]);
  // workbench (rear left): top, legs, vise, tool board with outlined tools, oil can, rags
  k.span(M.woodLight, [-W2 + 0.45, 0.88, -13.55], [-W2 + 2.6, 0.95, -12.85]); for (const x of [-W2 + 0.55, -W2 + 2.45]) for (const z of [-13.45, -12.95]) k.box(M.wood, [0.07, 0.88, 0.07], [x, 0.44, z]);
  k.span(M.woodLight, [-W2 + 0.5, 0.25, -13.5], [-W2 + 2.55, 0.29, -12.9], { ink: false });
  k.box(M.castIron, [0.18, 0.14, 0.2], [-W2 + 2.4, 1.03, -12.95]); k.rod(M.steel, [-W2 + 2.4, 1.05, -12.84], [-W2 + 2.4, 1.05, -12.72], 0.012);
  k.span(M.timber, [-W2 + 0.45, 1.25, -13.58], [-W2 + 2.6, 2.4, -13.55], { ink: false });
  for (let i = 0; i < 7; i++) { const x = -W2 + 0.7 + i * 0.28; k.box(i % 2 ? M.steel : M.wood, [0.04, 0.32 + (i % 3) * 0.08, 0.025], [x, 1.8, -13.53]); }
  k.lathe(M.brassDark, [[0, 0], [0.07, 0], [0.07, 0.1], [0.03, 0.16], [0.012, 0.26], [0, 0.26]], [-W2 + 1.2, 0.95, -13.2], 12);
  // pot-belly stove + stovepipe
  k.lathe(M.castIron, [[0, 0], [0.26, 0.06], [0.25, 0.16], [0.32, 0.45], [0.33, 0.7], [0.26, 0.95], [0.2, 1.05], [0.22, 1.12], [0.08, 1.16], [0, 1.16]], [-0.6, 0.12, -12.4], 24);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.6; k.rod(M.castIron, [-0.6 + Math.cos(a) * 0.15, 0.13, -12.4 + Math.sin(a) * 0.15], [-0.6 + Math.cos(a) * 0.24, 0.0, -12.4 + Math.sin(a) * 0.24], 0.025, 5); }
  k.rod(M.black, [-0.6, 1.28, -12.4], [-0.6, OLD.H1, -12.4], 0.075, 12); k.span(M.castIron, [-0.95, -0.002, -12.75], [-0.25, 0.012, -12.05], { ink: false });
  // benches
  k.span(M.woodLight, [W2 - 1.0, 0.44, -9.0], [W2 - 0.55, 0.5, -6.0]); for (const z of [-8.8, -6.2]) k.span(M.wood, [W2 - 0.95, 0, z - 0.04], [W2 - 0.6, 0.44, z + 0.04]);
  return k; });

// ================================================================= era dressing
/** hooks with helmets + coats on the right wall (era style) */
const gearWall = (era: Era) => once(`oldGear${era}`, () => { const M = cm(), k = new Kit(), W2 = OLD.W / 2, x = W2 - 0.42, mod = era === "1976";
  const coat = mod ? M.turnout : M.leatherBlk, helm = mod ? M.black : M.leatherBlk;
  for (const zc of [-1.6, -5.4, -9.4]) { k.span(M.timber, [x - 0.04, 1.95, zc - 0.9], [x, 2.08, zc + 0.9]);
    for (let i = 0; i < 4; i++) { const z = zc - 0.66 + i * 0.44; k.rod(M.brassDark, [x - 0.02, 2.02, z], [x - 0.16, 2.06, z], 0.012, 5);
      // coat hanging from the hook (tapered body, sleeves) + helmet on the peg above
      k.lathe(coat, [[0.05, 0], [0.17, -0.06], [0.2, -0.5], [0.22, -1.0], [0.2, -1.02], [0, -1.02]], [x - 0.17, 2.02, z], 10, [0, 0, 0], { ink: 0.5 });
      if (mod) k.box(M.reflect, [0.3, 0.05, 0.3], [x - 0.17, 1.2, z], [0, 0, 0], { ink: false });
      k.lathe(helm, [[0, 0], [0.13, 0], [0.13, 0.04], [0.11, 0.14], [0.06, 0.19], [0, 0.2]], [x - 0.17, 2.1, z], 14); k.cyl(helm, 0.21, 0.23, 0.02, [x - 0.2, 2.1, z], [0, 0, 0], 16);
      k.box(mod ? M.whiteEnamel : M.gold, [0.02, 0.1, 0.08], [x - 0.04, 2.17, z], [0, 0, 0], { ink: false }); } }
  if (mod) { // steel lockers + extinguisher
    for (let i = 0; i < 6; i++) { const z = -11.8 + i * 0.46; k.span(M.locker, [W2 - 0.95, 0, z - 0.22], [W2 - 0.45, 1.9, z + 0.22]); k.span(M.steelDark, [W2 - 0.96, 1.4, z - 0.1], [W2 - 0.95, 1.6, z + 0.1], { ink: false }); }
    k.cyl(M.redMod, 0.08, 0.08, 0.55, [-OLD.W / 2 + 0.55, 0.5, -2.4]); }
  return k; });
/** desk + chair + era telephone + wall clock + calendar (year in-world) */
const deskSet = (era: Era) => once(`oldDesk${era}`, () => { const M = cm(), k = new Kit(), x = 3.4, z = -10.6, n = ERA_N[era];
  const top = n >= 3 ? M.steel : M.wood;
  k.span(top, [x - 0.75, 0.74, z - 0.4], [x + 0.75, 0.79, z + 0.4]); for (const sx of [-1, 1]) k.span(n >= 3 ? M.steelDark : M.wood, [x + sx * 0.7 - 0.05, 0, z - 0.38], [x + sx * 0.7 + 0.05, 0.74, z + 0.38]);
  k.span(n >= 3 ? M.steelDark : M.wood, [x + 0.15, 0.1, z - 0.36], [x + 0.65, 0.72, z + 0.36]);
  k.span(M.wood, [x - 0.25, 0.45, z + 0.55], [x + 0.25, 0.5, z + 1.0]); k.span(M.wood, [x - 0.25, 0.5, z + 0.97], [x + 0.25, 1.0, z + 1.02]); for (const sx of [-1, 1]) for (const sz of [0.58, 0.98]) k.box(M.wood, [0.04, 0.45, 0.04], [x + sx * 0.22, 0.22, z + sz]);
  k.span(M.paper, [x - 0.5, 0.79, z - 0.2], [x - 0.15, 0.8, z + 0.05], { ink: false }); k.span(M.black, [x - 0.4, 0.8, z + 0.1], [x - 0.1, 0.84, z + 0.3]);
  if (n <= 1) { // wooden wall crank telephone
    const wx = x + 1.05; k.span(M.wood, [wx, 1.3, z - 0.18], [wx + 0.2, 1.95, z + 0.18]); k.span(M.wood, [wx - 0.02, 1.55, z - 0.22], [wx + 0.05, 1.6, z + 0.22]);
    for (const s of [-1, 1]) k.sphere(M.nickel, 0.05, [wx - 0.01, 1.85, z + s * 0.08]); k.rod(M.black, [wx - 0.02, 1.6, z], [wx - 0.22, 1.62, z], 0.02); k.cyl(M.black, 0.04, 0.03, 0.12, [wx - 0.27, 1.62, z], [0, 0, Math.PI / 2]);
    k.box(M.black, [0.05, 0.16, 0.05], [wx - 0.03, 1.5, z + 0.24]); }
  else if (n === 2) { k.cyl(M.black, 0.05, 0.065, 0.02, [x - 0.4, 0.8, z - 0.25]); k.cyl(M.black, 0.015, 0.015, 0.28, [x - 0.4, 0.94, z - 0.25]); k.cyl(M.black, 0.035, 0.03, 0.06, [x - 0.4, 1.09, z - 0.25]); k.box(M.black, [0.03, 0.1, 0.03], [x - 0.34, 1.0, z - 0.25]); }
  else { k.span(n === 4 ? M.offWhite : M.black, [x - 0.55, 0.8, z - 0.32], [x - 0.3, 0.87, z - 0.12]); k.box(n === 4 ? M.offWhite : M.black, [0.22, 0.05, 0.06], [x - 0.42, 0.9, z - 0.22]); }
  // wall clock (school-house) + calendar on the right wall
  const cx = OLD.W / 2 - 0.42; k.cyl(M.wood, 0.22, 0.22, 0.06, [cx, 3.1, z + 0.4], [0, 0, Math.PI / 2], 24); k.cyl(M.paper, 0.18, 0.18, 0.01, [cx - 0.035, 3.1, z + 0.4], [0, 0, Math.PI / 2], 24, { ink: false });
  k.rod(M.black, [cx - 0.045, 3.1, z + 0.4], [cx - 0.045, 3.22, z + 0.41], 0.006, 4, { ink: false }); k.rod(M.black, [cx - 0.045, 3.1, z + 0.4], [cx - 0.045, 3.1, z + 0.5], 0.006, 4, { ink: false });
  return k; });
const calTex = (year: string) => once(`cal${year}`, () => { const c = document.createElement("canvas"); c.width = 256; c.height = 360; const g = c.getContext("2d")!;
  g.fillStyle = "#f2ead6"; g.fillRect(0, 0, 256, 360); g.fillStyle = "#8a2a22"; g.fillRect(0, 0, 256, 110); g.fillStyle = "#f6ecd6"; g.font = "bold 76px Georgia, serif"; g.textAlign = "center"; g.fillText(year, 128, 84);
  g.fillStyle = "#3a3028"; for (let r = 0; r < 5; r++) for (let q = 0; q < 7; q++) { g.fillRect(18 + q * 33, 140 + r * 42, 24, 3); g.font = "18px Georgia"; g.fillText(String(r * 7 + q + 1 > 31 ? "" : r * 7 + q + 1), 30 + q * 33, 160 + r * 42); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
const ERA_YEAR: Record<Era, string> = { "1901": "1901", "1912": "1912", "1938": "1938", "1955": "1955", "1976": "1976" };

/** era fixtures over the bays: 1912 bare tungsten bulbs on cords, 1938 green enamel shades, 1955 white dome shades,
 *  1976 fluorescent strips. `on[i]` per fixture (0..1, for burn-outs). 1901 has none (the Centennial + lanterns). */
export const Fixtures: React.FC<{ era: Era; on?: number[]; at?: V3[]; drop?: number }> = ({ era, on = [1, 1, 1, 1], at = OLD_FIX, drop = 1.15 }) => {
  const M = cm(); if (era === "1901") return null;
  return <>{at.map((p, i) => { const g = on[i] ?? 1, y = p[1] - drop;
    const lampM = g > 0.5 ? M.lamp : M.lampOff;
    return <group key={i} position={[p[0], 0, p[2]]}>
      {era !== "1976" && <mesh position={[0, (p[1] + y) / 2 + 0.05, 0]}><cylinderGeometry args={[0.005, 0.005, p[1] - y - 0.1, 5]} /><meshStandardMaterial color="#2a2018" roughness={0.9} /></mesh>}
      {era === "1912" && <><mesh position={[0, y, 0]}><cylinderGeometry args={[0.02, 0.022, 0.06, 12]} /><primitive object={M.brass} attach="material" /></mesh>
        <mesh position={[0, y - 0.075, 0]} scale={[1, 1.25, 1]}><sphereGeometry args={[0.045, 16, 12]} /><primitive object={g > 0.5 ? M.lamp : M.glass} attach="material" /></mesh></>}
      {era === "1938" && <><mesh position={[0, y, 0]}><coneGeometry args={[0.26, 0.2, 24, 1, true]} /><primitive object={M.greenEnamel} attach="material" /></mesh>
        <mesh position={[0, y - 0.005, 0]}><coneGeometry args={[0.255, 0.195, 24, 1, true]} /><meshStandardMaterial color="#f4f0e2" side={THREE.BackSide} emissive="#ffe8c0" emissiveIntensity={g * 0.6} /></mesh>
        <mesh position={[0, y - 0.07, 0]}><sphereGeometry args={[0.05, 14, 10]} /><primitive object={lampM} attach="material" /></mesh></>}
      {era === "1955" && <><mesh position={[0, y, 0]}><sphereGeometry args={[0.24, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><primitive object={M.creamEnamel} attach="material" /></mesh>
        <mesh position={[0, y - 0.03, 0]}><sphereGeometry args={[0.08, 14, 10]} /><primitive object={lampM} attach="material" /></mesh></>}
      {era === "1976" && <><mesh position={[0, p[1] - 0.08, 0]}><boxGeometry args={[1.25, 0.08, 0.3]} /><primitive object={M.white} attach="material" /></mesh>
        {[-0.07, 0.07].map((z) => <mesh key={z} position={[0, p[1] - 0.13, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.019, 0.019, 1.2, 10]} /><primitive object={g > 0.5 ? M.lampCool : M.lampOff} attach="material" /></mesh>)}</>}
      {g > 0.05 && era !== "1976" && <pointLight position={[0, y - 0.08, 0]} color={era === "1912" ? "#ffd29a" : "#ffe2b8"} intensity={g * 0.9} distance={7} decay={1.6} />}
      {g > 0.05 && era === "1976" && <pointLight position={[0, p[1] - 0.4, 0]} color="#eef4ff" intensity={g * 1.1} distance={8} decay={1.4} />}
    </group>; })}</>;
};

/** the whole old station for an era (shell + furniture + era dressing). `fixtures` lets a layer drive burn-outs. */
export const OldStation: React.FC<{ era: Era; fixOn?: number[]; next?: React.ReactNode }> = ({ era, fixOn, next }) => {
  const calM = useMemo(() => new THREE.MeshStandardMaterial({ map: calTex(ERA_YEAR[era]), roughness: 0.85 }), [era]);
  const signM = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex(era === "1976" ? "LIVERMORE FIRE DEPT." : "LIVERMORE  FIRE  DEPARTMENT", "#24382c", "#f0dca0", 1600, 140), roughness: 0.6 }), [era]);
  const subM = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex(era === "1976" ? "STATION No. 1" : "HOSE Co. No. 1", "#f0dca0", "#24382c", 700, 120), roughness: 0.6 }), [era]);
  return <>
    <KitMesh kit={oldShell()} />
    <KitMesh kit={furniture()} />
    <KitMesh kit={gearWall(era)} />
    <KitMesh kit={deskSet(era)} />
    <mesh position={[0, OLD.H1 + 0.44, 0.085]}><planeGeometry args={[9.6, 0.5]} /><primitive object={signM} attach="material" /></mesh>
    <mesh position={[0, 3.35, 0.13]}><planeGeometry args={[0.9, 0.16]} /><primitive object={subM} attach="material" /></mesh>
    <mesh position={[OLD.W / 2 - 0.43, 2.55, -9.95]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.26, 0.36]} /><primitive object={calM} attach="material" /></mesh>
    <Fixtures era={era} on={fixOn} />
    {next}
  </>;
};
