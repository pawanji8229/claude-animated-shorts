// Fire Station #6 (built 1976; original design after typical 1970s California stations): single-storey brick +
// painted block building with two glazed sectional apparatus doors, flat roof with parapet and fascia sign, drive
// apron, flagpole. Inside the apparatus bay: epoxy floor with yellow bay lines + trench drain, bar-joist roof on
// steel beams, round LED high-bays, vehicle-exhaust hose rails, turnout-gear racks (coats, helmets, boots), lockers,
// hose shelves + SCBA bottles, workbench, plaque; the Centennial Light hanging on its cord between the bays, its
// dedicated power-supply box + conduit, the BulbCam (bracket, housing, sun hood, lens, cable) and the watch desk
// with the monitor showing the live view of the bulb; a rolling platform ladder.
// World frame (own set): facade face z = 0, interior z in [-16, 0], x in [-8, 8], floor y = 0.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { archMats, signTex, wallRect, type Rect } from "../short3/archKit";
import { cm } from "./mats";
import { rng, type V3 } from "../../lib/math";

export const S6 = { W: 16, D: 16, H: 5.6, doorCx: [-3.9, 3.9], doorHW: 1.95, doorH: 4.3 };
export const S6_BULB: V3 = [-0.6, S6.H - 0.25, -6.6];     // ceiling attach (bottom of a bar joist)
export const S6_DROP = 0.95;                              // socket top at ~4.4 m
export const CAM_AT: V3 = [-7.25, 4.55, -8.4];            // BulbCam lens position (on the left wall bracket)
export const BOX_AT: V3 = [-7.55, 1.55, -7.0];            // power-supply box (front face centre)
export const DESK_AT: V3 = [-6.9, 0, -10.6];              // watch desk (left wall)
export const MON_AT: V3 = [-7.05, 1.42, -10.6];           // monitor screen centre (faces +x)
export const LADDER_AT: V3 = [-0.6, 0, -7.825];           // rolling platform ladder (ry = pi/2: platform beside the bulb, stairs going -z)
export const LADDER_RY = Math.PI / 2;
export const PLATFORM: V3 = [-0.6, 3.0, -7.3];             // where someone stands on the platform
export const LADDER_TOP = 3.0;

// ---------------------------------------------------------------- shell
const shell = () => once("s6Shell", () => { const M = cm(), A = archMats(), k = new Kit(), W2 = S6.W / 2, D = S6.D, H = S6.H;
  // front: brick piers + block above the doors, glazed sectional doors (raised/closed per layer: separate)
  const fh: Rect[] = S6.doorCx.map((cx) => ({ x0: cx - S6.doorHW, x1: cx + S6.doorHW, y0: 0, y1: S6.doorH }));
  wallRect(k, M.brickMod, -W2, W2, 0, H + 0.9, -0.3, 0, fh, { ink: 0.5 });
  for (const cx of S6.doorCx) { k.span(M.steelDark, [cx - S6.doorHW - 0.08, 0, -0.32], [cx - S6.doorHW, S6.doorH + 0.08, 0.02]); k.span(M.steelDark, [cx + S6.doorHW, 0, -0.32], [cx + S6.doorHW + 0.08, S6.doorH + 0.08, 0.02]); k.span(M.steelDark, [cx - S6.doorHW - 0.08, S6.doorH, -0.32], [cx + S6.doorHW + 0.08, S6.doorH + 0.08, 0.02]);
    for (const s of [-1, 1]) { k.cyl(M.yellowLine, 0.11, 0.11, 1.1, [cx + s * (S6.doorHW + 0.3), 0.55, 0.25], [0, 0, 0], 14); } }
  k.span(M.white, [-W2 - 0.1, H + 0.9, -0.4], [W2 + 0.1, H + 1.5, 0.12]);                   // fascia band (sign mounted on it)
  k.span(M.steelDark, [-W2 - 0.12, H + 1.5, -0.42], [W2 + 0.12, H + 1.58, 0.14]);
  // side + rear walls: painted block inside (lower), brick outside, a few windows on the right, rear doors
  const rh: Rect[] = [{ x0: -5.0, x1: -3.9, y0: 0, y1: 2.2 }, { x0: 2.5, x1: 4.3, y0: 1.1, y1: 2.4 }];
  const rear = new Kit(); wallRect(rear, M.block, -W2, W2, 0, H, -0.3, 0, rh); rear.span(M.steel, [-4.98, 0, -0.2], [-3.92, 2.18, -0.15]); rear.plane(M.glassWin, 1.76, 1.26, [3.4, 1.75, -0.15]);
  k.merge(rear, [0, 0, -D + 0.3], [0, Math.PI, 0]);
  const sideL = new Kit(); wallRect(sideL, M.block, 0.3, D - 0.3, 0, H, -0.3, 0, []); k.merge(sideL, [-W2 + 0.3, 0, 0], [0, Math.PI / 2, 0]);
  const sideR = new Kit(), sw: Rect[] = [{ x0: -5.6, x1: -4, y0: 1.2, y1: 2.6 }, { x0: -10.6, x1: -9, y0: 1.2, y1: 2.6 }];
  wallRect(sideR, M.block, -(D - 0.3), -0.3, 0, H, -0.3, 0, sw); for (const w of sw) sideR.plane(M.glassWin, w.x1 - w.x0, w.y1 - w.y0, [(w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, -0.15]);
  k.merge(sideR, [W2 - 0.3, 0, 0], [0, -Math.PI / 2, 0]);
  // clerestory window bands high on the side walls (dusk / daylight, detail on the big walls)
  for (const sx of [-1, 1]) { const x = sx * (W2 - 0.3); for (let i = 0; i < 6; i++) { const z0 = -2.2 - i * 2.2; for (const [za, zb] of [[z0 - 1.65, z0 - 1.6], [z0 - 0.05, z0], [z0 - 0.85, z0 - 0.8]]) k.span(M.steelDark, [x - 0.04, 3.75, za], [x + 0.04, 4.75, zb]); for (const y of [3.75, 4.7]) k.span(M.steelDark, [x - 0.04, y, z0 - 1.65], [x + 0.04, y + 0.05, z0]); k.plane(M.glassWin, 1.5, 0.86, [x - sx * 0.05, 4.25, z0 - 0.825], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]);
    k.span(M.offWhite, [x - sx * 0.08 - 0.04, 3.68, z0 - 1.7], [x - sx * 0.08 + 0.04, 3.75, z0 + 0.05], { ink: false }); } }
  // painted dado stripe inside (red) at 1.2 m
  for (const s of [-1, 1]) k.span(M.lockerRed, [s * (W2 - 0.3) - (s > 0 ? 0.01 : 0), 1.15, -D + 0.3], [s * (W2 - 0.3) + (s > 0 ? 0 : 0.01), 1.3, -0.3], { ink: false });
  // floor: epoxy, yellow bay lines, trench drain, apron outside
  k.span(M.epoxy, [-W2, -0.1, -D], [W2, 0, 0], { ink: false });
  for (const cx of S6.doorCx) for (const s of [-1, 1]) k.span(M.yellowLine, [cx + s * 1.55 - 0.05, 0.001, -D + 1], [cx + s * 1.55 + 0.05, 0.004, -0.4], { ink: false });
  k.span(M.steelDark, [-W2 + 0.5, 0.0005, -1.05], [W2 - 0.5, 0.003, -0.85], { ink: false }); for (let x = -W2 + 0.55; x < W2 - 0.5; x += 0.06) k.span(M.black, [x, 0.0035, -1.03], [x + 0.025, 0.004, -0.87], { ink: false });
  k.span(M.concrete, [-W2 - 2, -0.12, 0], [W2 + 2, -0.02, 9], { ink: false });
  // roof structure: steel beams across x, bar joists along z, metal deck
  k.span(M.deck, [-W2, H + 0.32, -D], [W2, H + 0.36, 0], { ink: false });
  for (let i = 0; i < 9; i++) k.span(M.deck, [-W2, H + 0.3, -D + i * (D / 9)], [W2, H + 0.32, -D + i * (D / 9) + 0.02], { ink: false });
  for (const z of [-5.2, -10.6]) { k.span(M.steelDark, [-W2, H - 0.25, z - 0.1], [W2, H + 0.3, z + 0.1]); }
  for (let x = -W2 + 0.9; x < W2 - 0.5; x += 1.5) { k.span(M.steel, [x - 0.04, H + 0.22, -D + 0.3], [x + 0.04, H + 0.3, -0.3], { ink: false }); k.span(M.steel, [x - 0.04, H - 0.25, -D + 0.3], [x + 0.04, H - 0.17, -0.3], { ink: false });
    for (let z = -D + 0.4; z < -0.4; z += 0.55) k.rod(M.steel, [x, H - 0.17, z], [x, H + 0.22, z + 0.27], 0.012, 4, { ink: false }); }
  // exhaust-removal rails along each bay + hanging hoses
  for (const cx of S6.doorCx) { k.span(M.steelDark, [cx + 0.6, H - 0.55, -D + 1], [cx + 0.75, H - 0.45, -1.5]); k.rod(M.steelDark, [cx + 0.68, H - 0.45, -6], [cx + 0.68, H - 0.25, -6], 0.02, 5, { ink: false });
    const pts: V3[] = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([cx + 0.68, H - 0.55 - t * 2.4 + Math.sin(t * 3) * 0.1, -4.2 - t * 0.3]); }
    for (let i = 0; i < pts.length - 1; i++) k.rod(M.black, pts[i], pts[i + 1], 0.07, 10, { ink: 0.3 }); k.cyl(M.redMod, 0.12, 0.09, 0.25, [pts[16][0], pts[16][1] - 0.1, pts[16][2]], [0, 0, 0], 14); }
  return k; });

// ---------------------------------------------------------------- equipment + furniture
const dressing = () => once("s6Dress", () => { const M = cm(), k = new Kit(), W2 = S6.W / 2, r = rng(41);
  // turnout gear racks on the left wall (open steel cubbies): coat, helmet on top shelf, boots + pants below
  for (let i = 0; i < 8; i++) { const z = -1.6 - i * 0.62; if (z > -4.2 && z < -3.0) continue;
    const x = -W2 + 0.3; k.span(M.locker, [x, 0, z - 0.3], [x + 0.55, 2.1, z - 0.27]); if (i === 7) k.span(M.locker, [x, 0, z + 0.27], [x + 0.55, 2.1, z + 0.3]);
    k.span(M.locker, [x, 1.75, z - 0.3], [x + 0.55, 1.78, z + 0.3], { ink: false }); k.span(M.locker, [x, 0.3, z - 0.3], [x + 0.55, 0.33, z + 0.3], { ink: false });
    k.lathe(M.turnout, [[0.05, 0], [0.19, -0.06], [0.22, -0.55], [0.24, -1.15], [0.2, -1.17], [0, -1.17]], [x + 0.28, 1.68, z], 10, [0, 0, 0], { ink: 0.5 });
    k.box(M.reflect, [0.42, 0.05, 0.42], [x + 0.28, 0.75, z]); k.box(M.reflect, [0.44, 0.05, 0.44], [x + 0.28, 1.05, z]);
    const hc = [M.black, M.yellowLine, M.black, M.black, M.redMod][i % 5]; k.lathe(hc, [[0, 0], [0.14, 0], [0.14, 0.05], [0.12, 0.15], [0.06, 0.21], [0, 0.22]], [x + 0.28, 1.79, z], 14); k.cyl(hc, 0.21, 0.25, 0.025, [x + 0.24, 1.79, z], [0, 0, 0], 16);
    for (const s of [-1, 1]) k.box(M.rubber, [0.26, 0.38, 0.12], [x + 0.3, 0.52, z + s * 0.08]); k.box(M.turnout, [0.3, 0.2, 0.36], [x + 0.3, 0.82, z]); }
  // plaque about the light (left wall, under the bulb's sightline)
  k.span(M.wood, [-W2 + 0.3, 2.35, -6.0], [-W2 + 0.34, 2.95, -5.2]);
  // power-supply conduit: from the box up the wall, across the ceiling to the bulb
  const [bx, by, bz] = BOX_AT; k.span(M.plasticGrey, [bx - 0.12, by - 0.3, bz - 0.22], [bx, by + 0.3, bz + 0.22]); k.span(M.steelDark, [bx, by - 0.05, bz - 0.05], [bx + 0.02, by + 0.18, bz + 0.12], { ink: false });
  k.span(M.lamp, [bx + 0.005, by + 0.22, bz - 0.15], [bx + 0.012, by + 0.25, bz - 0.12], { ink: false });
  k.rod(M.steel, [bx - 0.06, by + 0.3, bz], [bx - 0.06, S6.H - 0.3, bz], 0.014, 6); k.rod(M.steel, [bx - 0.06, S6.H - 0.3, bz], [S6_BULB[0], S6.H - 0.3, bz], 0.014, 6); k.rod(M.steel, [S6_BULB[0], S6.H - 0.3, bz], [S6_BULB[0], S6.H - 0.3, S6_BULB[2]], 0.014, 6);
  k.cyl(M.steel, 0.07, 0.07, 0.06, [S6_BULB[0], S6_BULB[1] + 0.02, S6_BULB[2]], [0, 0, 0], 18);
  // outlet under the box (the extension-cord bypass plugs in here)
  k.span(M.offWhite, [bx - 0.02, 0.38, bz - 0.06], [bx + 0.005, 0.5, bz + 0.06]);
  // BulbCam: wall bracket arm, bullet housing with sun hood, lens ring, cable to the desk via conduit
  const [cx, cy, cz] = CAM_AT, aim = new THREE.Vector3(S6_BULB[0] - cx, S6_BULB[1] - S6_DROP - 0.15 - cy, S6_BULB[2] - cz).normalize();
  const yaw = Math.atan2(-aim.z, aim.x), pitch = Math.asin(aim.y);
  k.span(M.offWhite, [-W2 + 0.3, cy - 0.12, cz - 0.08], [-W2 + 0.34, cy + 0.12, cz + 0.08]); k.rod(M.offWhite, [-W2 + 0.34, cy, cz], [cx - 0.12, cy + 0.02, cz], 0.025, 8);
  const cam = new Kit(); cam.cyl(M.offWhite, 0.06, 0.06, 0.26, [0, 0, 0], [0, 0, Math.PI / 2], 18); cam.box(M.offWhite, [0.34, 0.012, 0.15], [0.03, 0.075, 0], [0, 0, 0.03]);
  cam.torus(M.black, 0.045, 0.012, [0.13, 0, 0], [0, Math.PI / 2, 0]); cam.cyl(M.glassDark, 0.04, 0.04, 0.01, [0.131, 0, 0], [0, 0, Math.PI / 2], 16, { ink: false });
  cam.cyl(M.offWhite, 0.035, 0.04, 0.06, [-0.02, -0.07, 0], [0, 0, 0], 12); cam.box(M.black, [0.02, 0.02, 0.03], [0.12, 0.04, 0.045], [0, 0, 0], { ink: false });
  k.merge(cam, [cx, cy, cz], [0, yaw, pitch]);
  k.rod(M.black, [cx - 0.14, cy - 0.04, cz], [-W2 + 0.36, cy - 0.3, cz], 0.008, 4, { ink: false }); k.rod(M.steel, [-W2 + 0.33, cy - 0.3, cz], [-W2 + 0.33, 1.0, cz], 0.012, 5, { ink: false });
  k.rod(M.steel, [-W2 + 0.33, 1.0, cz], [-W2 + 0.33, 1.0, MON_AT[2]], 0.012, 5, { ink: false });
  // watch desk + monitor on an arm + keyboard, chair, binder shelf
  const [dx, , dz] = DESK_AT; k.span(M.woodLight, [dx - 0.8, 0.74, dz - 0.75], [dx + 0.2, 0.78, dz + 0.75]); for (const sz of [-1, 1]) k.span(M.steelDark, [dx - 0.75, 0, dz + sz * 0.7 - 0.03], [dx + 0.15, 0.74, dz + sz * 0.7 + 0.03]);
  k.span(M.plastic, [MON_AT[0] - 0.05, 0.78, dz - 0.1], [MON_AT[0] + 0.05, 1.12, dz + 0.1]); k.span(M.plastic, [MON_AT[0] - 0.035, MON_AT[1] - 0.3, MON_AT[2] - 0.47], [MON_AT[0] - 0.005, MON_AT[1] + 0.3, MON_AT[2] + 0.47]);
  k.span(M.plastic, [dx - 0.3, 0.78, dz - 0.25], [dx - 0.12, 0.8, dz + 0.25]); k.span(M.plasticGrey, [dx - 0.4, 0.78, dz + 0.4], [dx - 0.2, 0.8, dz + 0.55], { ink: false });
  k.span(M.black, [dx + 0.3, 0.45, dz - 0.25], [dx + 0.8, 0.52, dz + 0.25]); k.span(M.black, [dx + 0.75, 0.52, dz - 0.25], [dx + 0.8, 1.05, dz + 0.25]); k.cyl(M.steelDark, 0.03, 0.03, 0.45, [dx + 0.55, 0.22, dz]);
  k.span(M.steel, [-W2 + 0.3, 1.75, dz - 0.8], [-W2 + 0.6, 1.79, dz + 0.8]); for (let i = 0; i < 9; i++) k.span([M.redMod, M.black, M.greenEnamel, M.locker][i % 4], [-W2 + 0.34, 1.79, dz - 0.75 + i * 0.16], [-W2 + 0.58, 2.1 - (i % 3) * 0.03, dz - 0.63 + i * 0.16]);
  // right wall: hose shelves with rolled hoses, SCBA bottles, workbench, AED, extinguishers
  for (let s = 0; s < 3; s++) { const y = 0.4 + s * 0.75; k.span(M.steel, [W2 - 0.9, y, -13.5], [W2 - 0.3, y + 0.04, -9.5]); for (let i = 0; i < 6; i++) k.cyl(i % 3 === 1 ? M.hoseRed : M.hose, 0.27, 0.27, 0.12, [W2 - 0.6, y + 0.3, -13.2 + i * 0.6], [0, 0, Math.PI / 2], 20); }
  for (const z of [-13.5, -9.5]) k.span(M.steel, [W2 - 0.92, 0, z - 0.03], [W2 - 0.28, 2.6, z + 0.03]);
  k.span(M.steelDark, [W2 - 0.9, 0.9, -8.5], [W2 - 0.3, 0.95, -6.0]); for (let i = 0; i < 6; i++) { k.cyl(M.yellowLine, 0.09, 0.09, 0.6, [W2 - 0.55, 1.25, -8.3 + i * 0.4], [0, 0, 0], 14); k.sphere(M.yellowLine, 0.09, [W2 - 0.55, 1.55, -8.3 + i * 0.4]); k.cyl(M.chrome, 0.03, 0.03, 0.08, [W2 - 0.55, 1.65, -8.3 + i * 0.4]); }
  k.span(M.woodLight, [W2 - 0.9, 0.9, -5.6], [W2 - 0.3, 0.95, -3.4]); k.span(M.steelDark, [W2 - 0.9, 0, -5.55], [W2 - 0.35, 0.9, -3.45]); k.span(M.locker, [W2 - 0.34, 1.2, -5.6], [W2 - 0.3, 2.4, -3.4]);
  for (let i = 0; i < 6; i++) k.box([M.redMod, M.yellowLine, M.steel][i % 3], [0.04, 0.2 + r() * 0.2, 0.08], [W2 - 0.36, 1.6 + (i % 2) * 0.4, -5.4 + i * 0.35]);
  k.span(M.whiteEnamel, [W2 - 0.36, 1.3, -2.6], [W2 - 0.3, 1.75, -2.2]); k.span(M.redMod, [W2 - 0.37, 1.55, -2.5], [W2 - 0.36, 1.65, -2.3], { ink: false });
  for (const z of [-2.0, -14.0]) { k.cyl(M.redMod, 0.08, 0.08, 0.55, [W2 - 0.45, 0.85, z]); k.box(M.black, [0.05, 0.12, 0.05], [W2 - 0.45, 1.18, z]); }
  // rear wall: framed photographs of the bulb through the decades, steel shelving with equipment, utility sink
  for (let i = 0; i < 5; i++) { const x = 1.2 + i * 0.95; k.span(M.wood, [x - 0.38, 2.55, -S6.D + 0.32], [x + 0.38, 3.05, -S6.D + 0.36]); k.span(i % 2 ? M.paper : M.offWhite, [x - 0.31, 2.61, -S6.D + 0.36], [x + 0.31, 2.99, -S6.D + 0.365], { ink: false }); }
  for (let s2 = 0; s2 < 4; s2++) k.span(M.steel, [-7.6, 0.3 + s2 * 0.55, -S6.D + 0.32], [-5.6, 0.34 + s2 * 0.55, -S6.D + 0.9]);
  for (const x of [-7.6, -5.6]) k.span(M.steel, [x - 0.03, 0, -S6.D + 0.32], [x + 0.03, 2.0, -S6.D + 0.9]);
  for (let i = 0; i < 10; i++) k.box([M.redMod, M.yellowLine, M.steel, M.black, M.greenEnamel][i % 5], [0.3, 0.22 + (i % 3) * 0.06, 0.4], [-7.35 + (i % 5) * 0.42, 0.46 + Math.floor(i / 5) * 0.55 + 0.11, -S6.D + 0.6]);
  k.span(M.steel, [4.6, 0.85, -S6.D + 0.32], [5.6, 0.92, -S6.D + 0.9]); k.span(M.steelDark, [4.65, 0, -S6.D + 0.35], [5.55, 0.85, -S6.D + 0.85]);
  // rear: door to quarters, bulletin board, clock
  k.span(M.wood, [-1.4, 1.3, -S6.D + 0.32], [0.6, 2.4, -S6.D + 0.36]); for (let i = 0; i < 7; i++) k.span(M.paper, [-1.3 + (i % 4) * 0.45, 1.45 + Math.floor(i / 4) * 0.45, -S6.D + 0.365], [-1.0 + (i % 4) * 0.45, 1.8 + Math.floor(i / 4) * 0.45, -S6.D + 0.37], { ink: false });
  k.cyl(M.white, 0.2, 0.2, 0.05, [2.0, 3.0, -S6.D + 0.33], [Math.PI / 2, 0, 0], 24); k.torus(M.black, 0.2, 0.015, [2.0, 3.0, -S6.D + 0.36], [0, 0, 0]);
  return k; });

/** LED high-bay fixtures (round, aluminium fins); `on` 0..1 */
const HB: V3[] = [[-3.9, S6.H - 0.6, -3.2], [3.9, S6.H - 0.6, -3.2], [-3.9, S6.H - 0.6, -9.0], [3.9, S6.H - 0.6, -9.0], [-3.9, S6.H - 0.6, -13.5], [3.9, S6.H - 0.6, -13.5]];
const hbKit = () => once("s6hb", () => { const M = cm(), k = new Kit(); k.cyl(M.steel, 0.24, 0.2, 0.12, [0, 0, 0], [0, 0, 0], 24); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; k.box(M.steelDark, [0.08, 0.1, 0.01], [Math.cos(a) * 0.2, 0.06, Math.sin(a) * 0.2], [0, -a, 0], { ink: false }); }
  k.rod(M.steelDark, [0, 0.06, 0], [0, 0.6, 0], 0.012); return k; });
export const HighBays: React.FC<{ on: number }> = ({ on }) => { const M = cm();
  return <>{HB.map((p, i) => <group key={i} position={p}><KitMesh kit={hbKit()} />
    <mesh position={[0, -0.065, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.22, 24]} /><meshBasicMaterial color={on > 0.5 ? new THREE.Color(2.2, 2.25, 2.3) : new THREE.Color(0.25, 0.26, 0.27)} toneMapped={false} side={THREE.DoubleSide} /></mesh>
    {on > 0.02 && <pointLight position={[0, -0.3, 0]} color="#f2f6ff" intensity={on * 3.2} distance={14} decay={1.3} />}
  </group>)}{void M}</>; };

/** sectional glazed doors: open = 0 closed .. 1 fully raised (panels roll up into the ceiling track) */
const doorPanelKit = () => once("s6door", () => { const M = cm(), k = new Kit(), w = S6.doorHW * 2 - 0.04, h = S6.doorH / 5;
  k.span(M.white, [-w / 2, 0, -0.04], [w / 2, h, 0.0]); const n = 4; for (let i = 0; i < n; i++) { const a = -w / 2 + 0.08 + i * ((w - 0.16) / n); k.plane(M.glassWin, (w - 0.16) / n - 0.08, h - 0.16, [a + ((w - 0.16) / n) / 2, h / 2, 0.003]); }
  k.span(M.white, [-w / 2, h - 0.04, -0.045], [w / 2, h, 0.005], { ink: false }); return k; });
export const S6Doors: React.FC<{ open: number[] }> = ({ open }) => <>{S6.doorCx.map((cx, d) => { const o = open[d] ?? 1, h = S6.doorH / 5;
  return <group key={d}>{Array.from({ length: 5 }, (_, i) => { // panel i from the bottom; raised panels travel up then back along the ceiling track
    const s = i * h + o * (S6.doorH + 0.2), y = Math.min(s, S6.doorH), back = Math.max(0, s - S6.doorH);
    return <group key={i} position={[cx, back > 0 ? S6.doorH + 0.15 : y, -0.25 - back]} rotation={[back > 0 ? -Math.PI / 2 : 0, 0, 0]}><KitMesh kit={doorPanelKit()} /></group>; })}</group>; })}</>;

/** rolling platform ladder: steel stairs with handrails, platform + guard rails, casters. Local: stairs rise toward -x. */
const ladderKit = () => once("s6ladder", () => { const M = cm(), k = new Kit(), top = LADDER_TOP, n = 11, run = 0.24;
  for (let i = 0; i < n; i++) { const x = 1.6 - i * run, y = ((i + 1) * top) / (n + 1); k.span(M.steel, [x - run, y - 0.03, -0.35], [x, y, 0.35]); for (let g = 0; g < 4; g++) k.span(M.steelDark, [x - run + 0.02 + g * 0.055, y + 0.001, -0.33], [x - run + 0.045 + g * 0.055, y + 0.004, 0.33], { ink: false }); }
  k.span(M.steel, [-1.05, top - 0.04, -0.4], [-0.1, top, 0.4]); for (const s of [-1, 1]) { k.rod(M.yellowLine, [1.75, 0.0, s * 0.4], [-0.1, top, s * 0.4], 0.03, 6); k.rod(M.yellowLine, [1.75, 0.95, s * 0.42], [-0.1, top + 1.0, s * 0.42], 0.022, 6);
    k.rod(M.yellowLine, [-0.1, top + 1.0, s * 0.42], [-1.05, top + 1.0, s * 0.42], 0.022, 6); k.rod(M.yellowLine, [-1.05, top, s * 0.42], [-1.05, top + 1.0, s * 0.42], 0.022, 6); k.rod(M.yellowLine, [-1.05, top + 0.5, s * 0.42], [-0.1, top + 0.5, s * 0.42], 0.016, 6);
    for (const x of [-1.05, -0.1]) k.rod(M.steel, [x, 0.12, s * 0.4], [x, top, s * 0.4], 0.03, 6); k.rod(M.steel, [-1.05, 0.12, s * 0.4], [1.7, 0.12, s * 0.4], 0.025, 6); }
  k.rod(M.yellowLine, [-1.05, top + 1.0, -0.42], [-1.05, top + 1.0, 0.42], 0.022, 6); for (const x of [-1.05, -0.1, 1.7]) for (const s of [-1, 1]) { k.cyl(M.black, 0.06, 0.06, 0.05, [x, 0.06, s * 0.4], [Math.PI / 2, 0, 0], 12); k.box(M.steelDark, [0.05, 0.06, 0.05], [x, 0.11, s * 0.4]); }
  return k; });
export const RollingLadder: React.FC<{ p?: V3; ry?: number }> = ({ p = LADDER_AT, ry = LADDER_RY }) => <group position={p} rotation={[0, ry, 0]}><KitMesh kit={ladderKit()} /></group>;

/** the BulbCam live view: the same bulb from the camera's angle, painted (dark ceiling, cord, warm filament, timestamp) */
export const bulbcamTex = (glow: number, sec: number) => { const c = document.createElement("canvas"); c.width = 640; c.height = 400; const g = c.getContext("2d")!;
  const bg = g.createRadialGradient(330, 210, 10, 330, 210, 420); bg.addColorStop(0, `rgb(${40 + 60 * glow},${28 + 34 * glow},${18 + 14 * glow})`); bg.addColorStop(1, "#0b0b0d"); g.fillStyle = bg; g.fillRect(0, 0, 640, 400);
  g.strokeStyle = "#20242a"; g.lineWidth = 16; for (let x = -80; x < 720; x += 110) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 60); g.stroke(); }
  g.strokeStyle = "#3a2a1e"; g.lineWidth = 6; g.beginPath(); g.moveTo(330, 0); g.lineTo(330, 120); g.stroke();
  g.fillStyle = "#a9802f"; g.fillRect(312, 118, 36, 46); g.fillStyle = "#c99a40"; for (let y = 166; y < 186; y += 5) g.fillRect(316, y, 28, 3);
  const gl = g.createRadialGradient(330, 248, 4, 330, 248, 140); gl.addColorStop(0, `rgba(255,190,110,${0.55 * glow})`); gl.addColorStop(1, "rgba(255,150,60,0)"); g.fillStyle = gl; g.fillRect(150, 100, 360, 300);
  g.strokeStyle = "rgba(230,230,235,0.55)"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(318, 186); g.bezierCurveTo(268, 214, 272, 292, 312, 318); g.quadraticCurveTo(330, 334, 348, 318); g.bezierCurveTo(388, 292, 392, 214, 342, 186); g.stroke();
  g.beginPath(); g.moveTo(326, 326); g.lineTo(330, 340); g.lineTo(334, 326); g.stroke();
  g.strokeStyle = glow > 0.05 ? `rgb(255,${150 + 60 * glow},${70 + 50 * glow})` : "#4a3020"; g.lineWidth = 3; g.shadowColor = "rgba(255,170,80,0.9)"; g.shadowBlur = 18 * glow;
  g.beginPath(); g.moveTo(326, 210); g.bezierCurveTo(300, 230, 304, 300, 330, 306); g.bezierCurveTo(356, 300, 360, 230, 334, 210); g.stroke(); g.shadowBlur = 0;
  g.fillStyle = "rgba(255,255,255,0.85)"; g.font = "bold 20px monospace"; g.fillText("BULBCAM  ● LIVE", 18, 32); const s = Math.floor(sec) % 60, m = 14 + Math.floor(sec / 60);
  g.fillText(`STATION 6   19:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`, 18, 384);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
export const Monitor: React.FC<{ glow: number; sec: number }> = ({ glow, sec }) => {
  const tex = useMemo(() => bulbcamTex(glow, sec), [Math.round(glow * 20), Math.floor(sec)]);   // eslint-disable-line
  return <mesh position={[MON_AT[0] + 0.001, MON_AT[1], MON_AT[2]]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.88, 0.55]} /><meshBasicMaterial map={tex} toneMapped={false} color={new THREE.Color(1.15, 1.15, 1.15)} /></mesh>;
};

const ext = () => once("s6Ext", () => { const M = cm(), k = new Kit(), A = archMats();
  // flagpole + flag, shrubs, lawn strips, two trees, parking, the street (East Avenue)
  k.cyl(M.chrome, 0.06, 0.08, 9.5, [9.5, 4.75, 4.5], [0, 0, 0], 12); k.sphere(M.gold, 0.1, [9.5, 9.55, 4.5]);
  k.span(A.paving, [-30, -0.15, 9], [30, -0.04, 11], { ink: false }); k.span(M.asphalt, [-60, -0.2, 11], [60, -0.12, 25], { ink: false });
  for (const [x, z] of [[-10.5, 2], [11.5, 1.5], [-12.5, 6], [13.5, 6.5]] as [number, number][]) { k.cyl(M.joist, 0.14, 0.2, 2.6, [x, 1.3, z], [0, 0, 0], 10);
    k.sphere(M.green, 1.7, [x, 3.6, z], [1, 0.9, 1]); k.sphere(M.green, 1.3, [x + 0.7, 4.4, z - 0.4], [1, 0.9, 1]); k.sphere(M.green, 1.2, [x - 0.8, 4.2, z + 0.5], [1, 0.9, 1]); }
  for (let i = 0; i < 10; i++) k.sphere(M.green, 0.45, [-7.6 + (i % 5) * 0.35, 0.3, 0.6 + Math.floor(i / 5) * 0.5], [1, 0.75, 1]);
  return k; });
export const Station6: React.FC<{ doors?: number[]; highbay?: number; inside?: boolean; outside?: boolean }> = ({ doors = [1, 1], highbay = 0, outside = false }) => {
  const signM = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex("FIRE STATION 6", "#f2f0ea", "#8a1f1e", 1400, 150, "Arial, sans-serif", "#f2f0ea"), roughness: 0.5 }), []);
  const plaqueM = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex("CENTENNIAL LIGHT • SINCE 1901", "#2a1e14", "#e8c878", 900, 120, "Georgia, serif"), roughness: 0.5 }), []);
  const flagM = useMemo(() => { const c = document.createElement("canvas"); c.width = 380; c.height = 200; const g = c.getContext("2d")!; for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f4f4f2" : "#b22234"; g.fillRect(0, (i * 200) / 13, 380, 200 / 13 + 1); }
    g.fillStyle = "#3c3b6e"; g.fillRect(0, 0, 152, 108); g.fillStyle = "#fff"; for (let r = 0; r < 9; r++) for (let q = 0; q < (r % 2 ? 5 : 6); q++) { g.beginPath(); g.arc(13 + q * 25 + (r % 2 ? 12 : 0), 9 + r * 11, 2.5, 0, Math.PI * 2); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.85 }); }, []);
  const crossM = useMemo(() => { const c = document.createElement("canvas"); c.width = 512; c.height = 512; const g = c.getContext("2d")!; g.translate(256, 256);
    // generic fire-service cross (four flared arms) with a ring: painted wall emblem, no lettering
    g.fillStyle = "#8a1f1e"; for (let i = 0; i < 4; i++) { g.save(); g.rotate((i * Math.PI) / 2); g.beginPath(); g.moveTo(-40, -40); g.lineTo(-120, -235); g.quadraticCurveTo(0, -200, 120, -235); g.lineTo(40, -40); g.closePath(); g.fill(); g.restore(); }
    g.strokeStyle = "#e8c060"; g.lineWidth = 14; g.beginPath(); g.arc(0, 0, 92, 0, Math.PI * 2); g.stroke(); g.fillStyle = "#f2f0ea"; g.beginPath(); g.arc(0, 0, 80, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#8a1f1e"; g.font = "bold 92px Georgia"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("6", 0, 6);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.7 }); }, []);
  return <>
    <KitMesh kit={shell()} />
    <KitMesh kit={dressing()} />
    <HighBays on={highbay} />
    <S6Doors open={doors} />
    <mesh position={[0, S6.H + 1.2, 0.13]}><planeGeometry args={[7.5, 0.6]} /><primitive object={signM} attach="material" /></mesh>
    <mesh position={[-S6.W / 2 + 0.345, 2.65, -5.6]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.76, 0.1]} /><primitive object={plaqueM} attach="material" /></mesh>
    <mesh position={[-1.9, 3.9, -S6.D + 0.33]} material={flagM}><planeGeometry args={[3.0, 1.58]} /></mesh>
    <mesh position={[2.9, 3.9, -S6.D + 0.33]} material={crossM}><planeGeometry args={[1.5, 1.5]} /></mesh>
    {outside && <><KitMesh kit={ext()} /><mesh position={[9.5 + 0.95, 8.9, 4.5]} rotation={[0, 0, 0]} material={flagM}><planeGeometry args={[1.8, 0.95, 12, 1]} /></mesh></>}
  </>;
};
