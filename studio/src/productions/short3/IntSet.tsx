// short3 INT: the switchboard office on the third floor of the moving building. The room is built in building-local
// coordinates and placed by the move path, so the windows look out on the REAL street (buildings, traffic, people)
// sliding by as the building creeps. Five operators (headsets, own call rhythms) at an oak cord switchboard; Mabel at
// her desk with a late-1920s desk telephone (dial, cradle, handset, cord) that rings and is answered; Mr. Finch typing.
// Room: wood floor, wainscot, plaster, picture rail, ceiling beams, schoolhouse pendants (sway with the move), ceiling
// fan, cast-iron radiators, window stools, filing cabinets, coat rack + hats, water cooler, wall clock, palm.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Post } from "../../lib/Post";
import { InkCtx } from "../../inventor/Workshop";
import { V3, lerp } from "../../lib/math";
import { SetRig, RenderAfterMount, Toon, cardWorld } from "../london-bridge/common";
import { headCenterPx5, shoulderPx5, HEAD5 } from "../../char/odo5";
import { BW, BD, T, bldAt, sunWorld, sunAt } from "./world";
import * as TL from "./timeline";
import { Kit, KitMesh, once } from "./kit";
import { archMats, wallRect, windowUnit } from "./archKit";
import { floorY, SILL, WIN_W, WIN_H } from "./Hero";
import { StreetStatic, Skyline, WIRE_Y } from "./Street";
import { StreetBuildings } from "./Neighbours";
import { Car30, Streetcar } from "./Vehicles";
import { SkyEnv } from "./SkyEnv";
import { DeskPhone, switchboardKit, PlugCord, POS_W } from "./Phone";
import * as Lf from "./life";

export const Y0 = floorY(2);
/** the room's window blinds; bays 1-3 have the lower sash fully raised (the camera flies through them). The hero facade uses the same. */
export { ROOM_BLINDS } from "./Hero";
import { ROOM_BLINDS } from "./Hero";                                   // room floor (building-local)
const RX0 = -11.4, RX1 = 5.0, RZ0 = 2.0, RZ1 = BD / 2 - 0.5, CEIL = 3.38;
export const BOARD = { x: -10.75, z0: 2.95 };
export const MABEL_SEAT: V3 = [-6.0, floorY(2) - 0.02, 5.6 - 0.82];   // room side of her desk, facing the windows
export const DESK_M: V3 = [-6.0, Y0, 5.6], DESK_F: V3 = [-2.9, Y0, 5.0], PHONE_M: V3 = [-5.62, Y0 + 0.775, 5.32];

export const roomKit = (withWall = true) => once(withWall ? "intRoom" : "intRoomNoWall", () => {
  const M = archMats(), k = new Kit(), y = Y0;
  k.span(M.floorWood, [RX0, y - 0.06, RZ0], [RX1, y + 0.02, RZ1], { ink: false });
  k.span(M.ceiling, [RX0, y + CEIL, RZ0], [RX1, y + CEIL + 0.06, RZ1], { ink: false });
  for (const z of [3.9, 6.3]) k.span(M.ceiling, [RX0, y + CEIL - 0.22, z - 0.16], [RX1, y + CEIL, z + 0.16]);
  // walls (back, sides) with wainscot + picture rail
  const wall = (a: V3, b: V3) => k.span(M.plaster, a, b, { ink: false });
  wall([RX0, y, RZ0 - 0.12], [RX1, y + CEIL, RZ0]); wall([RX0 - 0.12, y, RZ0], [RX0, y + CEIL, RZ1]); wall([RX1, y, RZ0], [RX1 + 0.12, y + CEIL, RZ1]);
  k.span(M.wainscot, [RX0, y + 0.02, RZ0], [RX1, y + 1.0, RZ0 + 0.03], { ink: false }); k.span(M.wainscot, [RX1 - 0.03, y + 0.02, RZ0], [RX1, y + 1.0, RZ1], { ink: false });
  k.span(M.wainscot, [RX0, y + 2.42, RZ0], [RX1, y + 2.47, RZ0 + 0.03], { ink: false });
  // door to the corridor (frosted glass upper panel + transom) on the back wall
  k.span(M.frameBrown, [-1.6, y, RZ0], [-0.5, y + 2.25, RZ0 + 0.06]); k.plane(M.frosted, 0.8, 0.9, [-1.05, y + 1.65, RZ0 + 0.065]); k.span(M.brass, [-0.7, y + 1.05, RZ0 + 0.06], [-0.64, y + 1.1, RZ0 + 0.11], { ink: false });
  k.span(M.frameBrown, [-1.65, y + 2.25, RZ0], [-0.45, y + 2.3, RZ0 + 0.08]); k.plane(M.frosted, 1.0, 0.4, [-1.05, y + 2.55, RZ0 + 0.03]);
  // window wall: plaster wall with openings (face-local, outer face z = BD/2), detailed windows, stools, radiators
  const fw = new Kit(), cxs = Array.from({ length: 7 }, (_, b) => -BW / 2 + (BW / 7) * (b + 0.5));
  const holes = cxs.map((cx) => ({ x0: cx - WIN_W / 2, x1: cx + WIN_W / 2, y0: y + SILL, y1: y + SILL + WIN_H }));
  // INT: the full window wall (plaster, 0.5 m) + windows. EXT: the hero facade supplies wall + windows; the room only adds a
  // 2 cm plaster lining on its inner face (so both sets show the same plaster wall from inside) + the stools and radiators
  if (withWall) wallRect(fw, M.plaster, RX0 - 0.12, RX1 + 0.12, y - 0.06, y + CEIL + 0.06, -0.5, 0, holes, { ink: false });
  else wallRect(fw, M.plaster, RX0, RX1, y + 0.02, y + CEIL, -0.52, -0.5, holes, { ink: false });
  cxs.forEach((cx, b) => { if (cx + WIN_W / 2 < RX0 || cx - WIN_W / 2 > RX1) return; if (withWall) windowUnit(fw, M, cx, y + SILL, WIN_W, WIN_H, { frame: M.frameGreen, panes: 2, blind: ROOM_BLINDS[b] ?? 0, open: b >= 1 && b <= 3 ? 1.0 : 0 });
    fw.span(M.furn, [cx - WIN_W / 2 - 0.1, y + SILL - 0.04, -0.62], [cx + WIN_W / 2 + 0.1, y + SILL + 0.01, -0.48]);
    // cast-iron column radiator + pipes
    for (let c = 0; c < 12; c++) fw.span(M.ironPaint, [cx - 0.55 + c * 0.093, y + 0.08, -0.78], [cx - 0.55 + c * 0.093 + 0.07, y + 0.62, -0.62]);
    fw.span(M.ironPaint, [cx - 0.58, y + 0.095, -0.75], [cx + 0.58, y + 0.14, -0.65]); fw.span(M.ironPaint, [cx - 0.58, y + 0.56, -0.75], [cx + 0.58, y + 0.605, -0.65]);
    fw.cyl(M.ironPaint, 0.025, 0.025, 0.1, [cx - 0.62, y + 0.06, -0.7], [0, 0, 0], 8); fw.cyl(M.brass, 0.03, 0.03, 0.04, [cx + 0.62, y + 0.6, -0.7], [0, 0, Math.PI / 2], 8, { ink: false }); });
  k.merge(fw, [0, 0, BD / 2]);
  // Mabel's desk (+ chair, blotter, in/out tray, lamp, papers), Mr Finch's desk (+ typewriter)
  const desk = (p: V3, w = 1.5) => { k.span(M.furn, [p[0] - w / 2, y + 0.73, p[2] - 0.4], [p[0] + w / 2, y + 0.78, p[2] + 0.4]); k.span(M.furn, [p[0] - w / 2 + 0.03, y, p[2] - 0.37], [p[0] - w / 2 + 0.5, y + 0.73, p[2] + 0.37]); k.span(M.furn, [p[0] + w / 2 - 0.5, y, p[2] - 0.37], [p[0] + w / 2 - 0.03, y + 0.73, p[2] + 0.37]);
    for (const s of [-1, 1]) for (let d = 0; d < 3; d++) { const x = p[0] + s * (w / 2 - 0.265); k.span(M.timberDk, [x - 0.2, y + 0.08 + d * 0.22, p[2] - 0.375], [x + 0.2, y + 0.26 + d * 0.22, p[2] - 0.37], { ink: 0.3 }); k.span(M.brass, [x - 0.05, y + 0.16 + d * 0.22, p[2] - 0.385], [x + 0.05, y + 0.18 + d * 0.22, p[2] - 0.37], { ink: false }); }
    k.span(M.furn, [p[0] - w / 2 + 0.5, y + 0.3, p[2] + 0.33], [p[0] + w / 2 - 0.5, y + 0.73, p[2] + 0.36]); };
  desk(DESK_M); desk(DESK_F, 1.4);
  k.span(M.green, [DESK_M[0] - 0.42, y + 0.78, DESK_M[2] - 0.28], [DESK_M[0] + 0.25, y + 0.787, DESK_M[2] + 0.18], { ink: false });
  for (let s = 0; s < 4; s++) k.span(M.paper, [DESK_M[0] - 0.36 + s * 0.005, y + 0.787 + s * 0.003, DESK_M[2] - 0.22], [DESK_M[0] - 0.1 + s * 0.005, y + 0.79 + s * 0.003, DESK_M[2] + 0.1], { ink: false });
  k.span(M.brass, [DESK_M[0] + 0.32, y + 0.78, DESK_M[2] - 0.1], [DESK_M[0] + 0.62, y + 0.83, DESK_M[2] + 0.18]); for (let s = 0; s < 6; s++) k.span(M.paper, [DESK_M[0] + 0.34, y + 0.785 + s * 0.006, DESK_M[2] - 0.08], [DESK_M[0] + 0.6, y + 0.79 + s * 0.006, DESK_M[2] + 0.16], { ink: false });
  const lamp = (x: number, z: number) => { k.cyl(M.brass, 0.07, 0.08, 0.02, [x, y + 0.79, z], [0, 0, 0], 14); k.rod(M.brass, [x, y + 0.79, z], [x, y + 1.18, z], 0.012, 6); k.lathe(M.green, [[0.02, 0], [0.14, -0.06], [0.15, -0.08], [0.0, -0.02]], [x, y + 1.24, z + 0.05], 18, [0.3, 0, 0]); k.sphere(M.lampDim, 0.035, [x, y + 1.19, z + 0.06], [1, 1, 1], { ink: false }); };
  lamp(DESK_M[0] - 0.55, DESK_M[2] + 0.22); lamp(DESK_F[0] + 0.5, DESK_F[2] + 0.2);
  const tw: V3 = [DESK_F[0] - 0.1, y + 0.78, DESK_F[2] - 0.05];
  k.span(M.black, [tw[0] - 0.24, tw[1], tw[2] - 0.2], [tw[0] + 0.24, tw[1] + 0.09, tw[2] + 0.18]); k.span(M.black, [tw[0] - 0.22, tw[1] + 0.09, tw[2] + 0.02], [tw[0] + 0.22, tw[1] + 0.18, tw[2] + 0.2]);
  k.cyl(M.black, 0.035, 0.035, 0.5, [tw[0], tw[1] + 0.2, tw[2] + 0.17], [0, 0, Math.PI / 2], 12); k.span(M.paper, [tw[0] - 0.15, tw[1] + 0.2, tw[2] + 0.18], [tw[0] + 0.15, tw[1] + 0.42, tw[2] + 0.19], { ink: false });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) k.cyl(M.cream, 0.011, 0.011, 0.012, [tw[0] - 0.19 + c * 0.042 + r * 0.01, tw[1] + 0.07 + r * 0.012, tw[2] - 0.17 + r * 0.045], [0, 0, 0], 8, { ink: false });
  // chairs
  const chair = (p: V3, back = 1) => { k.span(M.furn, [p[0] - 0.24, y + 0.46, p[2] - 0.22], [p[0] + 0.24, y + 0.51, p[2] + 0.22]); k.span(M.furn, [p[0] - 0.24, y + 0.51, p[2] + (back > 0 ? 0.19 : -0.23)], [p[0] + 0.24, y + 1.0, p[2] + (back > 0 ? 0.23 : -0.19)]); k.cyl(M.ironPaint, 0.03, 0.03, 0.42, [p[0], y + 0.25, p[2]], [0, 0, 0], 8); for (let a = 0; a < 4; a++) k.rod(M.ironPaint, [p[0], y + 0.05, p[2]], [p[0] + Math.cos(a * 1.57 + 0.78) * 0.3, y + 0.02, p[2] + Math.sin(a * 1.57 + 0.78) * 0.3], 0.02, 6); };
  chair([DESK_M[0], 0, DESK_M[2] - 0.75], -1);   // Mabel sits on the room side, facing the windows chair([DESK_F[0] + 0.1, 0, DESK_F[2] + 0.7]);
  // operators' stools
  for (let i = 0; i < 5; i++) { const z = BOARD.z0 + POS_W * (i + 0.5), x = BOARD.x + 0.85; k.cyl(M.furn, 0.19, 0.19, 0.05, [x, y + 0.66, z], [0, 0, 0], 16); for (let a = 0; a < 3; a++) k.rod(M.ironPaint, [x, y + 0.64, z], [x + Math.cos(a * 2.1) * 0.24, y + 0.02, z + Math.sin(a * 2.1) * 0.24], 0.015, 6); k.torus(M.ironPaint, 0.19, 0.012, [x, y + 0.3, z], [Math.PI / 2, 0, 0]); }
  // filing cabinets, coat rack + hats, water cooler, wall clock, pictures, palm, wastebasket
  for (let c = 0; c < 4; c++) { const x = 0.5 + c * 0.58; k.span(M.ironPaint, [x, y, RZ0 + 0.02], [x + 0.55, y + 1.32, RZ0 + 0.66]); for (let d = 0; d < 4; d++) { k.span(M.ironPaint, [x + 0.03, y + 0.06 + d * 0.32, RZ0 + 0.66], [x + 0.52, y + 0.34 + d * 0.32, RZ0 + 0.68], { ink: 0.3 }); k.span(M.brass, [x + 0.22, y + 0.24 + d * 0.32, RZ0 + 0.68], [x + 0.33, y + 0.26 + d * 0.32, RZ0 + 0.7], { ink: false }); } }
  const cr: V3 = [4.3, y, 2.7]; k.cyl(M.timberDk, 0.03, 0.04, 1.85, [cr[0], y + 0.93, cr[2]], [0, 0, 0], 8); for (let a = 0; a < 4; a++) { k.rod(M.timberDk, [cr[0], y + 0.05, cr[2]], [cr[0] + Math.cos(a * 1.57) * 0.3, y + 0.0, cr[2] + Math.sin(a * 1.57) * 0.3], 0.02, 6); k.rod(M.brass, [cr[0], y + 1.75, cr[2]], [cr[0] + Math.cos(a * 1.57 + 0.4) * 0.22, y + 1.85, cr[2] + Math.sin(a * 1.57 + 0.4) * 0.22], 0.01, 5); }
  k.lathe(M.black, [[0, 0], [0.16, 0], [0.16, 0.02], [0.1, 0.03], [0.1, 0.12], [0, 0.13]], [cr[0] + 0.2, y + 1.82, cr[2] + 0.08], 16); k.lathe(M.frameBrown, [[0, 0], [0.17, 0], [0.17, 0.02], [0.1, 0.03], [0.09, 0.11], [0, 0.12]], [cr[0] - 0.18, y + 1.8, cr[2] - 0.1], 16);
  const wc: V3 = [4.4, y, 3.7]; k.span(M.frameWhite, [wc[0] - 0.2, y, wc[2] - 0.2], [wc[0] + 0.2, y + 0.95, wc[2] + 0.2]); k.span(M.chrome, [wc[0] - 0.03, y + 0.75, wc[2] - 0.25], [wc[0] + 0.03, y + 0.8, wc[2] - 0.2], { ink: false });
  k.lathe(new THREE.MeshPhysicalMaterial({ color: "#bfe0f2", transparent: true, opacity: 0.45, roughness: 0.05, transmission: 0, depthWrite: false }), [[0, 0], [0.15, 0.02], [0.16, 0.3], [0.12, 0.42], [0.05, 0.46], [0.05, 0.5], [0, 0.5]], [wc[0], y + 0.95, wc[2]], 20, [0, 0, 0], { ink: 0.4 });
  const clk: V3 = [-4.6, y + 2.75, RZ0 + 0.03]; k.cyl(M.timberDk, 0.3, 0.3, 0.06, clk, [Math.PI / 2, 0, 0], 28); k.cyl(M.cream, 0.25, 0.25, 0.02, [clk[0], clk[1], clk[2] + 0.04], [Math.PI / 2, 0, 0], 28, { ink: false });
  for (let h = 0; h < 12; h++) { const a = (h / 12) * Math.PI * 2; k.span(M.black, [clk[0] + Math.sin(a) * 0.21 - 0.008, clk[1] + Math.cos(a) * 0.21 - 0.02, clk[2] + 0.05], [clk[0] + Math.sin(a) * 0.21 + 0.008, clk[1] + Math.cos(a) * 0.21 + 0.02, clk[2] + 0.055], { ink: false }); }
  for (const [x, w, h] of [[-8.5, 0.7, 0.5], [-7.4, 0.45, 0.6], [2.8, 0.8, 0.55]] as [number, number, number][]) { k.span(M.frameBrown, [x - w / 2, y + 1.55, RZ0 + 0.0], [x + w / 2, y + 1.55 + h, RZ0 + 0.04]); k.span([M.plasterB, M.curtainB, M.green][Math.round(x) % 3 < 0 ? 0 : Math.round(x) % 3], [x - w / 2 + 0.05, y + 1.6, RZ0 + 0.04], [x + w / 2 - 0.05, y + 1.5 + h, RZ0 + 0.05], { ink: false }); }
  const palm: V3 = [4.3, y, 7.6]; k.lathe(M.frameBrown, [[0, 0], [0.18, 0], [0.24, 0.4], [0.26, 0.45], [0, 0.45]], palm, 16); for (let l = 0; l < 9; l++) { const a = (l / 9) * Math.PI * 2; k.rod(M.green, [palm[0], y + 0.42, palm[2]], [palm[0] + Math.cos(a) * 0.55, y + 1.0 + (l % 3) * 0.18, palm[2] + Math.sin(a) * 0.55], 0.025, 5); k.sphere(M.green, 0.12, [palm[0] + Math.cos(a) * 0.55, y + 1.0 + (l % 3) * 0.18, palm[2] + Math.sin(a) * 0.55], [2.0, 0.25, 0.9]); }
  k.lathe(M.ironPaint, [[0, 0], [0.15, 0], [0.18, 0.35], [0, 0.35]], [DESK_M[0] + 0.95, y, DESK_M[2] + 0.2], 14); for (let p = 0; p < 3; p++) k.sphere(M.paper, 0.06, [DESK_M[0] + 0.95 + (p - 1) * 0.05, y + 0.33, DESK_M[2] + 0.2], [1, 0.7, 1], { ink: false });
  return k;
});
const pendantKit = () => once("pendant", () => { const M = archMats(), k = new Kit(); k.rod(M.brass, [0, 0, 0], [0, -0.75, 0], 0.01, 6); k.lathe(M.brass, [[0, 0], [0.07, 0], [0.07, -0.05], [0.04, -0.08], [0, -0.08]], [0, -0.73, 0], 14); k.sphere(M.lamp, 0.18, [0, -0.97, 0], [1, 1.05, 1], { ink: 0.4 }); return k; });
const fanKit = () => once("fan", () => { const M = archMats(), k = new Kit(); for (let b = 0; b < 4; b++) { const a = (b / 4) * Math.PI * 2; k.box(M.timberDk, [0.62, 0.012, 0.13], [Math.cos(a) * 0.42, 0, -Math.sin(a) * 0.42], [0, a, 0.08]); } k.lathe(M.brass, [[0, 0.06], [0.12, 0.04], [0.12, -0.04], [0.05, -0.08], [0, -0.08]], [0, 0, 0], 16); return k; });
const headsetKit = () => once("headset", () => { const M = archMats(), k = new Kit(); k.torus(M.black, 1.0, 0.035, [0, 0, 0], [0, 0, 0], Math.PI, { ink: 0.3 }); k.cyl(M.black, 0.16, 0.16, 0.08, [1.0, -0.02, 0], [0, 0, Math.PI / 2], 14, { ink: 0.4 }); return k; });

/** building pose for the interior (matches the EXT set exactly, incl. the 0.62 m ride on cribbing + rollers):
 *  hook / loop pre-roll = the flash-forward creep; "meanwhile" (1213-1340) = the building at its new position (turned 90 deg) */
export const intPose = (f: number): { p: V3; ry: number; sway: number } => {
  if (f < T.past0) return { p: [0, TL.LIFT_H, -6.0 - 0.5 * (f / T.hookEnd)], ry: 0, sway: 1 };
  const b = bldAt(f); return { p: [b.p[0], TL.liftAt(f), b.p[2]], ry: b.ry, sway: 0.5 };
};
export const toWorld = TL.toWorld, toLocal = TL.toLocal;

/** the switchboard room + everyone in it, in building-local coordinates (placed by the caller's pose group).
 *  Used by the INT set and - with the facade's own window wall - by the EXT set, so a camera can fly through a window
 *  from one set into the other and both show the same room. camL = camera position in building-local coordinates. */
export const Room: React.FC<{ f: number; tw: number; camL: V3; hi: boolean; wall: boolean; sway: number; people?: boolean }> = ({ f, tw, camL, hi, wall, sway: swayAmp, people = true }) => {
  const ops = Array.from({ length: 5 }, (_, i) => TL.opAt(i, tw));
  const mab = TL.mabelAt(tw), fin = TL.finchAt(tw);
  const sway = (s: number) => Math.sin(f * 0.07 + s) * 0.035 * swayAmp;
  const M = archMats();
  const mabPos: V3 = MABEL_SEAT;
  // handset in Mabel's hand (screen-left hand near her ear), else in the cradle
  const held = mab.lift > 0.02 ? (() => { const sh = shoulderPx5(mab.pose, -1), hp: [number, number] = [sh[0] + mab.pose.armL.hand[0], sh[1] + mab.pose.armL.hand[1]];
    const hw = cardWorld(mabPos, camL, hp, 1.5, 0.08), cradle: V3 = [PHONE_M[0], PHONE_M[1] + 0.228, PHONE_M[2] - 0.02]; const yaw = Math.atan2(camL[0] - mabPos[0], camL[2] - mabPos[2]);
    const u = Math.min(1, mab.lift); return { p: [lerp(cradle[0], hw[0], u), lerp(cradle[1], hw[1], u), lerp(cradle[2], hw[2], u)] as V3, r: [0, yaw, lerp(0, -Math.PI / 2 + 0.3, u)] as V3 }; })() : null;
  return (<group>
    {[[-8.6, 4.2], [-4.0, 4.4], [0.4, 4.6]].map(([x, z], i) => <pointLight key={i} position={[x, Y0 + CEIL - 1.1, z]} color="#ffd9a8" intensity={5} distance={8} decay={1.6} />)}
    <pointLight position={[-6.2, Y0 + 1.9, 4.0]} color="#ffe8cc" intensity={2.5} distance={5} decay={1.6} />
    <pointLight position={[DESK_M[0] - 0.5, Y0 + 1.15, DESK_M[2] + 0.1]} color="#ffd59a" intensity={1.6} distance={2.2} decay={1.8} />
    <KitMesh kit={roomKit(wall)} />
    <group position={[BOARD.x, Y0, BOARD.z0]}><KitMesh kit={switchboardKit(5)} />
      {ops.map((o, i) => o.cords.map((cd, j) => <PlugCord key={`${i}${j}`} from={[0.0, 0.9, i * POS_W + 0.15 + cd.slot * 0.1]} to={[-0.42, cd.y, i * POS_W + 0.1 + cd.col * 0.04]} />))}
      {ops.map((o, i) => <mesh key={`l${i}`} position={[-0.41, 1.12 + (i % 2) * 0.3, i * POS_W + 0.5]} material={o.ring ? M.lamp : M.lampDim} scale={o.ring || o.plugged ? 1 : 0.6}><sphereGeometry args={[0.022, 8, 6]} /></mesh>)}
    </group>
    {[[-8.6, 4.2], [-4.0, 4.4], [0.4, 4.6]].map(([x, z], i) => <group key={i} position={[x, Y0 + CEIL, z]} rotation={[sway(i * 1.7), 0, sway(i * 2.3 + 1)]}><KitMesh kit={pendantKit()} /></group>)}
    <group position={[-6.6, Y0 + CEIL - 0.42, 6.9]}><mesh position={[0, 0.2, 0]} material={M.brass}><cylinderGeometry args={[0.015, 0.015, 0.4, 6]} /></mesh><group rotation={[0, f * 0.16, 0]}><KitMesh kit={fanKit()} /></group></group>
    {/* coffee cup on Mabel's desk: the surface trembles with the move */}
    <group position={[DESK_M[0] - 0.12, Y0 + 0.78, DESK_M[2] + 0.05]}><mesh position={[0, 0.045, 0]} material={M.frameWhite} castShadow><cylinderGeometry args={[0.042, 0.034, 0.09, 16, 1, true]} /></mesh><mesh position={[0, 0.002, 0]} material={M.frameWhite}><cylinderGeometry args={[0.07, 0.07, 0.006, 16]} /></mesh>
      <mesh position={[0, 0.075 + Math.sin(f * 1.3) * 0.002 * swayAmp, 0]} rotation={[-Math.PI / 2 + Math.sin(f * 0.9) * 0.05 * swayAmp, 0, 0]}><circleGeometry args={[0.039, 16]} /><meshStandardMaterial color="#3a2414" roughness={0.15} /></mesh></group>
    <DeskPhone p={PHONE_M} ry={-0.35} ring={mab.ring} f={f} held={held} />
    {people && <>
      {/* operators with headsets */}
      {ops.map((o, i) => { const pos: V3 = [BOARD.x + 0.85, Y0 + 0.05, BOARD.z0 + POS_W * (i + 0.5)]; const hc = headCenterPx5(o.pose), hw = cardWorld(pos, camL, hc, 1.48, 0.03), r = (HEAD5.rx / 1000) * 1.48 * 1.04, yaw = Math.atan2(camL[0] - pos[0], camL[2] - pos[2]);
        return <group key={i}><Toon pose={o.pose} pos={pos} cam={camL} h={1.48} hi={hi} light={i === 0 ? 1.5 : 0.8} halo={0.1} />
          <group position={hw} rotation={[0, yaw, 0]} scale={[r, r, r]}><KitMesh kit={headsetKit()} inkScale={0.6} /></group></group>; })}
      <Toon pose={mab.pose} pos={mabPos} cam={camL} h={1.5} hi={hi} light={2.5} halo={0.14} />
      <Toon pose={fin.pose} pos={[DESK_F[0] + 0.1, Y0 - 0.04, DESK_F[2] + 0.76]} cam={camL} h={1.52} hi={hi} light={1.2} halo={0.1} />
    </>}
  </group>);
};

export const IntSet: React.FC<{ from: number }> = ({ from }) => {
  const f = useCurrentFrame() + from;                         // negative frames = the loop pre-roll that flows into frame 0
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920;
  const tw = f < 0 ? 1564 + f : f;                              // timeline frame for the acting (loop pre-roll = end of film)
  const pose = intPose(f), cl = TL.camIntAt(tw, Y0);
  const W = (l: V3) => toWorld(pose, l);
  const c = { ...cl, pos: W([cl.pos[0], cl.pos[1] + Y0, cl.pos[2]]), look: W([cl.look[0], cl.look[1] + Y0, cl.look[2]]) };
  const camL: V3 = [cl.pos[0], cl.pos[1] + Y0, cl.pos[2]];
  const sunP = sunWorld(f);
  return (
    <AbsoluteFill style={{ backgroundColor: "#2a2018" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.05, far: 900 }}>
        <SetRig c={c} bg="#9ec3e6" fog={["#cdd8e0", 120, 600]} env={0.3} />
        <SkyEnv intensity={0.5} warm={sunAt(Math.max(0, f))} />
        <InkCtx.Provider value={2.6 * k}>
          <mesh><sphereGeometry args={[800, 32, 16]} /><meshBasicMaterial side={THREE.BackSide} fog={false} depthWrite={false} color="#a3c6ea" /></mesh>
          <hemisphereLight args={["#ffeed6", "#6a5440", 0.75]} />
          {/* the same sun as the EXT set (direction in world space), shadow box centred on the room */}
          <directionalLight position={[pose.p[0] + sunP[0], sunP[1], pose.p[2] + sunP[2]]} color={new THREE.Color().lerpColors(new THREE.Color("#fff3df"), new THREE.Color("#ffc890"), sunAt(Math.max(0, f)))} intensity={3.0} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-far={300} shadow-bias={-0.0003} shadow-normalBias={0.03}>
            <object3D attach="target" position={[pose.p[0], 0, pose.p[2]]} />
          </directionalLight>
          {/* the real street outside */}
          <StreetStatic /><StreetBuildings /><Skyline />
          {Lf.PARKED.map((p, i) => <group key={`pk${i}`} position={p.p} rotation={[0, p.ry, 0]}><Car30 color={p.color} spin={0} /></group>)}
          {Lf.carsAt(tw).map((p, i) => <group key={`car${i}`} position={p.p} rotation={[0, p.ry, 0]}><Car30 color={p.color} spin={p.spin} /></group>)}
          {Lf.streetcarAt(tw) && (() => { const s = Lf.streetcarAt(tw)!; return <group position={s.p} rotation={[0, s.ry, 0]}><Streetcar wireY={WIRE_Y + 0.13} /></group>; })()}
          {/* the room, carried by the building */}
          <group position={pose.p} rotation={[0, pose.ry, 0]}><Room f={f} tw={tw} camL={camL} hi={hi} wall sway={pose.sway} /></group>
        </InkCtx.Provider>
        <Post params={INT_POST(c.focus, hi)} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
export const INT_POST = (focus: number, hi: boolean) => ({ focusDist: focus, focusRange: 1.8, maxBlur: 0.2, bloom: 0.55, threshold: 1.65, exposure: 1.18, vignette: 0.5, ss: hi ? 1 : 2, contrast: 1.1, saturation: 1.05, lift: 0.012, warmCool: 0.68, ao: 0.65, aoRadius: 0.45 });
