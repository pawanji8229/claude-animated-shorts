// short3 hero: the 8-storey telephone-company office block (original design in the 1900s Chicago/Indianapolis
// commercial style). Local coords: centre of footprint, y = 0 at grade, front = +z. Built once into merged meshes.
//  - granite plinth with barred basement windows, chamfered water table
//  - rusticated sandstone ground storey; recessed entrance portal (pilasters, entablature + in-world sign, lanterns,
//    granite steps up to bronze double doors with glass, transom grille, lit lobby with elevator + reception desk)
//  - brick upper storeys, sandstone sills + flat-arch lintels with keystones, corner quoins, belt + attic courses
//  - double-hung windows on ALL four sides (frames, two sashes, muntins, glass, blinds/open sashes varied),
//    furnished offices behind every window (desks, typewriters, phones, lamps, cabinets, partitions, pendants)
//  - full entablature: architrave, frieze, dentils, modillions, corona, cymatium; brick parapet with stone coping
//  - iron fire escape on the east side, cast-iron downpipes, fire-alarm box, standpipe, junction box, plaque
//  - roof: tar-and-gravel, timber water tank on a braced steel tower, elevator penthouse, skylights, chimney
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "./kit";
import { AM, archMats, wallRect, rusticated, windowUnit, officeBay, fireEscape, downpipe, signTex, Rect, pick } from "./archKit";
import { BW, BD, FLOORS, FLOOR_H, BASE_H, BH } from "./world";
import { V3, rng } from "../../lib/math";

export const T_WALL = 0.5, WIN_W = 1.55, WIN_H = 2.45, SILL = 0.6, ROOM_D = 3.2;
export const FRONT_BAYS = 7, SIDE_BAYS = 5;
export const floorY = (i: number) => BASE_H + i * FLOOR_H;
export const ENTRANCE = { x0: -1.35, x1: 1.35, top: 4.4, depth: 2.6 };          // portal opening (front, centre bay)
const CORN = 0.95;                                                                // cornice projection
const PAR0 = BH + 0.62, PAR1 = BH + 1.55;                                         // parapet

/** stone/brick band running round all four faces without overlaps (front/back boxes own the corners) */
const ring = (k: Kit, mat: THREE.Material, y0: number, y1: number, proj: number, back = 0.12) => {
  const hx = BW / 2, hz = BD / 2;
  k.span(mat, [-hx - proj, y0, hz - back], [hx + proj, y1, hz + proj]); k.span(mat, [-hx - proj, y0, -hz - proj], [hx + proj, y1, -hz + back]);
  k.span(mat, [hx - back, y0, -hz + back], [hx + proj, y1, hz - back]); k.span(mat, [-hx - proj, y0, -hz + back], [-hx + back, y1, hz - back]);
};

/** one facade face (face-local: plane z = 0, x in [-W/2, W/2]) */
const face = (M: AM, W: number, bays: number, kind: "front" | "side" | "back", seed: number, fire = false) => {
  const k = new Kit(), r = rng(seed), bw = W / bays, cxs = Array.from({ length: bays }, (_, b) => -W / 2 + bw * (b + 0.5));
  const T = T_WALL, ent = kind === "front";
  const winHoles = (i: number): Rect[] => cxs.flatMap((cx, b) => (ent && i === 0 && b === 3 ? [] : [{ x0: cx - WIN_W / 2, x1: cx + WIN_W / 2, y0: floorY(i) + SILL, y1: floorY(i) + SILL + WIN_H }]));
  const portal: Rect[] = ent ? [{ x0: ENTRANCE.x0, x1: ENTRANCE.x1, y0: 0, y1: ENTRANCE.top }] : [];
  // ---- plinth (granite) with basement windows
  const base: Rect[] = cxs.flatMap((cx, b) => (ent && b === 3 ? [] : [{ x0: cx - 0.55, x1: cx + 0.55, y0: 0.42, y1: 1.0 }]));
  const ext = kind === "side" ? 0 : 0.07, wext = kind === "side" ? 0 : 0.13;
  wallRect(k, M.granite, -W / 2 - ext, W / 2 + ext, 0, 0.3, -T, 0.07, portal);            // base course (projects 7 cm)
  wallRect(k, M.granite, -W / 2, W / 2, 0.3, 1.28, -T, 0, [...base, ...portal]);
  for (const h of base) { const cx = (h.x0 + h.x1) / 2;
    k.span(M.granite, [h.x0, h.y0 - 0.03, -0.32], [h.x1, h.y0, 0.04]);                     // sloped sill (approximated)
    k.plane(M.glassDark, 1.08, 0.56, [cx, 0.71, -0.3]);
    for (let j = 0; j < 6; j++) { const x = h.x0 + 0.1 + j * 0.18; k.rod(M.castIron, [x, h.y0, -0.12], [x, h.y1, -0.12], 0.014, 6, { ink: false }); } k.span(M.castIron, [h.x0, 0.68, -0.135], [h.x1, 0.71, -0.105], { ink: false }); }
  // water table: chamfered stone course at the top of the plinth
  const wt: [number, number][] = [[-0.02, 0], [0.13, 0], [0.13, 0.08], [0.02, 0.2], [-0.02, 0.2]];
  const wtSpans: [number, number][] = ent ? [[-W / 2 - wext, ENTRANCE.x0 - 0.62], [ENTRANCE.x1 + 0.62, W / 2 + wext]] : [[-W / 2 - wext, W / 2 + wext]];
  for (const [a, b] of wtSpans) k.ext(M.sand, wt, b - a, [(a + b) / 2, 1.28, 0], [0, -Math.PI / 2, 0]);
  // ---- ground storey: rusticated sandstone
  const g0: Rect[] = [...winHoles(0), ...portal];
  rusticated(k, M.sand, -W / 2, W / 2, 1.48, floorY(1) - 0.25, -T, 0, g0, 0.52, 0.05, 0.03);
  // ground-storey window heads: 5 voussoirs + keystone
  for (const h of winHoles(0)) { const cx = (h.x0 + h.x1) / 2;
    k.ext(M.sandTrim, [[h.x0 - 0.22 - cx, 0], [h.x1 + 0.22 - cx, 0], [h.x1 + 0.3 - cx, 0.34], [h.x0 - 0.3 - cx, 0.34]], 0.07, [cx, h.y1, 0.035]);   // flat arch
    for (let v = -2; v <= 2; v++) if (v) k.span(M.sand, [cx + v * 0.36 - 0.012, h.y1 + 0.02, 0.07], [cx + v * 0.36 + 0.012, h.y1 + 0.32, 0.074], { ink: false });   // voussoir joints
    k.ext(M.sandTrim, [[-0.16, -0.05], [0.16, -0.05], [0.21, 0.38], [-0.21, 0.38]], 0.13, [cx, h.y1, 0.065]);                                                  // keystone
    k.span(M.sandTrim, [h.x0 - 0.14, h.y0 - 0.12, -0.2], [h.x1 + 0.14, h.y0 + 0.03, 0.12]); }
  // belt course over the ground storey (fillet + corona + wash) — built by ring() on the building
  // ---- upper storeys: brick + sandstone dressings
  for (let i = 1; i < FLOORS; i++) {
    const y = floorY(i), holes = winHoles(i), top = i === FLOORS - 1 ? BH - 0.62 : floorY(i + 1);
    wallRect(k, M.brick, -W / 2, W / 2, i === 1 ? floorY(1) + 0.12 : y, top, -T, 0, holes);
    for (const h of holes) { const cx = (h.x0 + h.x1) / 2;
      k.span(M.sandTrim, [h.x0 - 0.12, h.y0 - 0.1, -0.2], [h.x1 + 0.12, h.y0 + 0.04, 0.11]);              // sill
      k.span(M.sandTrim, [h.x0 - 0.16, h.y0 - 0.18, 0.0], [h.x0 - 0.02, h.y0 - 0.1, 0.07]); k.span(M.sandTrim, [h.x1 + 0.02, h.y0 - 0.18, 0.0], [h.x1 + 0.16, h.y0 - 0.1, 0.07]); // sill lugs
      k.ext(M.sandTrim, [[h.x0 - 0.2 - cx, 0], [h.x1 + 0.2 - cx, 0], [h.x1 + 0.28 - cx, 0.38], [h.x0 - 0.28 - cx, 0.38]], 0.06, [cx, h.y1, 0.03]); // flat-arch lintel (z 0..0.06)
      k.ext(M.sandTrim, [[-0.13, -0.04], [0.13, -0.04], [0.18, 0.46], [-0.18, 0.46]], 0.12, [cx, h.y1, 0.06]);                                // keystone (z 0..0.12)
    }
  }
  // corner pilaster strips (brick, proud 4 cm) between windows of the end bays give the facade a frame
  for (const s of [-1, 1]) wallRect(k, M.brick, s > 0 ? W / 2 - 0.62 : -W / 2, s > 0 ? W / 2 : -W / 2 + 0.62, floorY(1) + 0.3, BH - 0.62, 0, 0.04);

  // ---- windows (detailed units) + offices behind
  for (let i = 0; i < FLOORS; i++) for (let b = 0; b < bays; b++) {
    if (ent && i === 0 && b === 3) continue;
    const back = kind === "back", blind = back ? 0.35 + r() * 0.6 : r() < 0.45 ? 0.15 + r() * 0.45 : 0, open = !back && r() < 0.18 ? 0.5 + r() * 0.5 : 0;
    windowUnit(k, M, cxs[b], floorY(i) + SILL, WIN_W, WIN_H, { frame: M.frameGreen, panes: 2, blind, blindMat: r() < 0.25 ? M.blindGreen : M.blind, open });
  }
  // fire escape (east side) over bays 1..3
  if (fire) fireEscape(k, M, cxs[1] - 1.0, cxs[3] + 1.0, Array.from({ length: FLOORS - 1 }, (_, i) => floorY(i + 1)), 1.2);
  // downpipes near both ends
  if (kind !== "front") for (const x of [-W / 2 + 0.95, W / 2 - 0.95]) downpipe(k, M, x, BH - 0.7, 0.13);
  return k;
};

/** furnished office strips behind the windows (building-local), plus a dark core */
const interiors = (M: AM) => {
  const k = new Kit(), hx = BW / 2 - T_WALL, hz = BD / 2 - T_WALL, fbw = BW / FRONT_BAYS, sbw = (BD - 2 * T_WALL) / SIDE_BAYS;
  for (let i = 0; i < FLOORS; i++) {
    const y = floorY(i), H = FLOOR_H;
    // front strip: z from hz (window wall) back ROOM_D ; bays every fbw, glazed partition every 2 bays
    const fk = new Kit();
    for (let b = 0; b < FRONT_BAYS; b++) { if (i === 0 && b >= 2 && b <= 4) continue; const x0 = -hx + (b === 0 ? 0 : b * fbw - 0.0) - (b === 0 ? 0 : 0), x1 = b === FRONT_BAYS - 1 ? hx : -BW / 2 + (b + 1) * fbw; officeBay(fk, M, Math.max(-hx, -BW / 2 + b * fbw), Math.min(hx, x1), y, H, ROOM_D, 100 + i * 10 + b, { partitionL: b % 2 === 0 && b > 0 }); void x0; }
    k.merge(fk, [0, 0, hz]);
    // back strip
    const bk = new Kit(); for (let b = 0; b < FRONT_BAYS; b++) officeBay(bk, M, Math.max(-hx, -BW / 2 + b * fbw), Math.min(hx, -BW / 2 + (b + 1) * fbw), y, H, ROOM_D, 400 + i * 10 + b, { partitionL: b % 2 === 0 && b > 0 });
    k.merge(bk, [0, 0, -hz], [0, Math.PI, 0]);
    // side strips (between the front and back strips): x from hx inward 3.0, z in [-(hz - ROOM_D), hz - ROOM_D]
    for (const s of [-1, 1]) { const sk = new Kit(), span = hz - ROOM_D;
      for (let b = 0; b < SIDE_BAYS; b++) { const a = -hz + b * sbw, c = a + sbw; const x0 = Math.max(-span, a), x1 = Math.min(span, c); if (x1 - x0 < 0.6) continue; officeBay(sk, M, x0, x1, y, H, 3.0, 700 + i * 10 + b + (s > 0 ? 50 : 0), { partitionL: b > 0 }); }
      k.merge(sk, [s * hx, 0, 0], [0, s * Math.PI / 2, 0]); }
  }
  // core (stairs, lifts, corridors — unlit, closes every view through the building)
  const LZ0 = 2.1, LX = BW / FRONT_BAYS * 1.5 - 0.06;   // lobby: x within bays 2-4, z from the core front to the facade
  const CI = 0.14;   // core inset: never coplanar with a room's back wall
  k.span(M.plasterC, [-hx + 3.0 + CI, BASE_H - 0.05, -hz + ROOM_D + CI], [hx - 3.0 - CI, floorY(1) - 0.3, LZ0 - 0.12], { ink: false });
  k.span(M.plasterC, [-hx + 3.0 + CI, floorY(1) - 0.3, -hz + ROOM_D + CI], [hx - 3.0 - CI, BH - 0.6, hz - ROOM_D - CI], { ink: false });
  // ground-storey lobby behind the entrance (lit): marble floor, walls, elevator doors, reception desk + phone
  const LH = FLOOR_H - 0.32;
  k.span(M.sandTrim, [-LX, BASE_H - 0.05, LZ0], [LX, BASE_H + 0.02, hz - 0.02], { ink: false });                        // marble floor
  k.span(M.plaster, [-LX, BASE_H, LZ0 - 0.1], [LX, BASE_H + LH, LZ0], { ink: false });                                   // back wall
  for (const s of [-1, 1]) k.span(M.plaster, [s > 0 ? LX : -LX - 0.1, BASE_H, LZ0], [s > 0 ? LX + 0.1 : -LX, BASE_H + LH, hz - 0.02], { ink: false });
  k.span(M.ceiling, [-LX, BASE_H + LH, LZ0], [LX, BASE_H + LH + 0.05, hz - 0.02], { ink: false });
  k.span(M.wainscot, [-LX, BASE_H + 0.02, LZ0], [LX, BASE_H + 1.1, LZ0 + 0.03], { ink: false });
  for (const x of [-1.6, 1.6]) { k.span(M.brass, [x - 0.62, BASE_H + 0.02, LZ0], [x + 0.62, BASE_H + 2.3, LZ0 + 0.05], { ink: false }); k.span(M.bronze, [x - 0.01, BASE_H + 0.02, LZ0 + 0.05], [x + 0.01, BASE_H + 2.3, LZ0 + 0.07], { ink: false }); k.span(M.bronze, [x - 0.72, BASE_H + 2.3, LZ0], [x + 0.72, BASE_H + 2.62, LZ0 + 0.07], { ink: false }); k.sphere(M.lampDim, 0.05, [x, BASE_H + 2.46, LZ0 + 0.09], [1, 1, 1], { ink: false }); }
  k.span(M.furn, [-1.2, BASE_H + 0.02, 3.6], [1.2, BASE_H + 1.05, 4.2], { ink: false }); k.span(M.timberDk, [-1.3, BASE_H + 1.05, 3.55], [1.3, BASE_H + 1.1, 4.25], { ink: false });
  k.cyl(M.black, 0.08, 0.1, 0.05, [0.6, BASE_H + 1.13, 3.9], [0, 0, 0], 12, { ink: false }); k.span(M.black, [0.48, BASE_H + 1.19, 3.86], [0.72, BASE_H + 1.23, 3.94], { ink: false });
  for (const x of [-2.6, 0, 2.6]) { k.sphere(M.lamp, 0.2, [x, BASE_H + LH - 0.55, 5.6], [1, 0.75, 1], { ink: false }); k.rod(M.brass, [x, BASE_H + LH - 0.45, 5.6], [x, BASE_H + LH, 5.6], 0.012, 6, { ink: false }); }
  for (const x of [-4.2, 4.2]) { k.cyl(M.frameBrown, 0.25, 0.2, 0.45, [x, BASE_H + 0.25, 3.0], [0, 0, 0], 12, { ink: false }); k.sphere(M.green, 0.45, [x, BASE_H + 0.9, 3.0], [1, 1.2, 1], { ink: false }); }
  return k;
};

/** entrance portal dressing (front-face local) */
const portalKit = (M: AM, signM: THREE.Material) => {
  const k = new Kit(), { x0, x1, top, depth } = ENTRANCE;
  // pilasters with base + capital
  for (const s of [-1, 1]) { const xa = s < 0 ? x0 - 0.6 : x1, xb = s < 0 ? x0 : x1 + 0.6;
    k.span(M.sandTrim, [xa, 0.16, 0.0], [xb, top, 0.18]); k.span(M.granite, [xa - 0.06, 0.0, 0.0], [xb + 0.06, 0.62, 0.25]); k.span(M.sandTrim, [xa - 0.07, top - 0.32, 0.0], [xb + 0.07, top, 0.27]);
    for (let f = 1; f < 4; f++) k.span(M.sand, [xa + f * 0.15 - 0.025, 0.7, 0.18], [xa + f * 0.15 + 0.025, top - 0.4, 0.2], { ink: false });   // flutes (proud fillets)
    // bronze lantern on a scroll bracket
    const lx = s * (x1 + 0.3); k.span(M.bronze, [lx - 0.04, 3.05, 0.18], [lx + 0.04, 3.13, 0.62]); k.span(M.bronze, [lx - 0.17, 2.6, 0.48], [lx + 0.17, 2.66, 0.78]);
    k.span(M.lampDim, [lx - 0.13, 2.66, 0.51], [lx + 0.13, 3.0, 0.75], { ink: false }); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.span(M.bronze, [lx + a * 0.15 - 0.015, 2.66, 0.63 + b * 0.12 - 0.015], [lx + a * 0.15 + 0.015, 3.02, 0.63 + b * 0.12 + 0.015], { ink: false });
    k.ext(M.bronze, [[-0.2, 0], [0.2, 0], [0, 0.22]], 0.36, [lx, 3.0, 0.63]);
  }
  // entablature with the in-world sign
  k.span(M.sandTrim, [x0 - 0.75, top - 0.02, 0.0], [x1 + 0.75, top + 0.38, 0.24]); k.span(M.sandTrim, [x0 - 0.85, top + 0.38, 0.0], [x1 + 0.85, top + 0.46, 0.32]);
  k.plane(signM, 3.1, 0.34, [0, top + 0.18, 0.245], [0, 0, 0], { uv01: true });
  // recess: side walls (2 cm inside the opening), soffit with coffers, steps, landing
  for (const s of [-1, 1]) k.span(M.sandTrim, [s < 0 ? x0 + 0.02 : x1 - 0.22, 0, -depth], [s < 0 ? x0 + 0.22 : x1 - 0.02, top - 0.02, -0.01], { ink: false });
  k.span(M.sandTrim, [x0 + 0.22, top - 0.22, -depth], [x1 - 0.22, top - 0.02, -0.01], { ink: false });
  for (const zc of [-0.6, -1.4, -2.1]) k.span(M.sand, [-0.8, top - 0.26, zc - 0.25], [0.8, top - 0.22, zc + 0.25], { ink: false });
  const nS = 7, rise = (BASE_H - 0.16) / nS, run = 0.27;
  for (let s = 0; s < nS; s++) k.span(M.granite, [x0 + 0.22, 0, -(s + 1) * run - 0.02], [x1 - 0.22, 0.16 + (s + 1) * rise, 0.06 - s * run]);
  k.span(M.granite, [x0 + 0.22, 0, -depth], [x1 - 0.22, BASE_H, -nS * run - 0.02]);
  // brass handrails on both recess walls
  for (const s of [-1, 1]) { const x = s * (x1 - 0.32); k.rod(M.brass, [x, 0.16 + 0.9, 0.0], [x, BASE_H + 0.9, -nS * run], 0.025, 8); for (const t of [0.15, 0.85]) k.rod(M.brass, [x, 0.16 + (BASE_H - 0.16) * t, -nS * run * t], [x, 0.16 + (BASE_H - 0.16) * t + 0.9, -nS * run * t], 0.015, 6, { ink: false }); }
  // bronze doors with glass + kick plates, push bars, transom with grille
  const zd = -depth + 0.02;
  k.span(M.bronze, [x0 + 0.22, BASE_H, zd], [x0 + 0.34, top - 0.24, zd + 0.1]); k.span(M.bronze, [x1 - 0.34, BASE_H, zd], [x1 - 0.22, top - 0.24, zd + 0.1]);
  k.span(M.bronze, [x0 + 0.34, BASE_H + 2.4, zd], [x1 - 0.34, BASE_H + 2.52, zd + 0.1]);
  for (const s of [-1, 1]) { const a = s < 0 ? x0 + 0.34 : 0.01, b = s < 0 ? -0.01 : x1 - 0.34;
    k.span(M.bronze, [a, BASE_H, zd + 0.02], [a + 0.1, BASE_H + 2.4, zd + 0.08]); k.span(M.bronze, [b - 0.1, BASE_H, zd + 0.02], [b, BASE_H + 2.4, zd + 0.08]);
    k.span(M.bronze, [a + 0.1, BASE_H, zd + 0.02], [b - 0.1, BASE_H + 0.75, zd + 0.08]); k.span(M.bronze, [a + 0.1, BASE_H + 2.28, zd + 0.02], [b - 0.1, BASE_H + 2.4, zd + 0.08]);
    k.plane(M.glass, b - a - 0.2, 1.53, [(a + b) / 2, BASE_H + 1.515, zd + 0.05]);
    k.span(M.brass, [a + 0.1, BASE_H + 0.06, zd + 0.08], [b - 0.1, BASE_H + 0.35, zd + 0.09], { ink: false });
    k.rod(M.brass, [a + 0.15, BASE_H + 1.08, zd + 0.16], [b - 0.15, BASE_H + 1.08, zd + 0.16], 0.022, 8); for (const x of [a + 0.18, b - 0.18]) k.rod(M.brass, [x, BASE_H + 1.08, zd + 0.08], [x, BASE_H + 1.08, zd + 0.16], 0.015, 6, { ink: false }); }
  k.plane(M.glass, x1 - x0 - 0.7, top - 0.26 - BASE_H - 2.52, [0, (BASE_H + 2.52 + top - 0.24) / 2, zd + 0.05]);
  for (let g = 1; g < 8; g++) { const x = x0 + 0.34 + ((x1 - x0 - 0.68) * g) / 8; k.span(M.bronze, [x - 0.012, BASE_H + 2.52, zd + 0.03], [x + 0.012, top - 0.24, zd + 0.07], { ink: false }); }
  // bronze plaque, fire-alarm box, standpipe connection, telephone junction box (street-level fixtures)
  k.span(M.bronze, [x1 + 0.12, 1.55, 0.18], [x1 + 0.48, 2.0, 0.21]);
  k.span(M.red, [-6.3, 1.5, 0.0], [-5.95, 2.0, 0.16]); k.span(M.lampDim, [-6.2, 1.98, 0.08], [-6.05, 2.06, 0.13], { ink: false });
  k.cyl(M.brass, 0.06, 0.06, 0.4, [5.9, 0.55, 0.2], [Math.PI / 2, 0, 0], 10); for (const s of [-1, 1]) k.cyl(M.brass, 0.07, 0.07, 0.2, [5.9 + s * 0.16, 0.55, 0.42], [Math.PI / 2, 0, 0], 12); k.span(M.brass, [5.7, 0.5, 0.32], [6.1, 0.6, 0.38]);
  k.span(M.green, [8.4, 0.32, 0.0], [8.95, 1.2, 0.32]); k.span(M.green, [8.36, 1.2, -0.02], [8.99, 1.26, 0.36]);
  return k;
};

/** roof: tar + gravel, water tank on a braced steel tower, penthouse, skylights, chimney (building-local) */
const roofKit = (M: AM) => {
  const k = new Kit(), hx = BW / 2, hz = BD / 2;
  k.span(M.roofTar, [-hx + 0.2, BH + 0.4, -hz + 0.2], [hx - 0.2, BH + 0.62, hz - 0.2], { ink: false });
  // water tank
  const tx = -6, tz = -3, L = 3.2;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.span(M.ironPaint, [tx + a * 1.3 - 0.09, BH + 0.62, tz + b * 1.3 - 0.09], [tx + a * 1.3 + 0.09, BH + 0.62 + L, tz + b * 1.3 + 0.09]);
  for (const [p, q] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]] as [number[], number[]][]) {
    k.rod(M.ironPaint, [tx + p[0] * 1.3, BH + 0.9, tz + p[1] * 1.3], [tx + q[0] * 1.3, BH + 0.62 + L - 0.2, tz + q[1] * 1.3], 0.025, 6);
    k.rod(M.ironPaint, [tx + q[0] * 1.3, BH + 0.9, tz + q[1] * 1.3], [tx + p[0] * 1.3, BH + 0.62 + L - 0.2, tz + p[1] * 1.3], 0.025, 6);
    k.span(M.ironPaint, [Math.min(tx + p[0] * 1.3, tx + q[0] * 1.3) - 0.06, BH + 0.62 + L - 0.1, Math.min(tz + p[1] * 1.3, tz + q[1] * 1.3) - 0.06], [Math.max(tx + p[0] * 1.3, tx + q[0] * 1.3) + 0.06, BH + 0.62 + L, Math.max(tz + p[1] * 1.3, tz + q[1] * 1.3) + 0.06]);
  }
  const ty = BH + 0.62 + L; k.span(M.timberDk, [tx - 1.9, ty, tz - 1.9], [tx + 1.9, ty + 0.12, tz + 1.9]);
  k.cyl(M.timber, 1.75, 1.85, 3.0, [tx, ty + 1.62, tz], [0, 0, 0], 28); for (let h = 0; h < 5; h++) k.torus(M.ironPaint, 1.78 + h * 0.016, 0.03, [tx, ty + 0.35 + h * 0.62, tz], [Math.PI / 2, 0, 0]);
  k.lathe(M.ironPaint, [[0.0, 0.0], [1.95, 0.0], [1.0, 0.5], [0.12, 0.95], [0.0, 1.05]], [tx, ty + 3.12, tz], 28);
  for (let s = 0; s < 14; s++) k.rod(M.ironPaint, [tx + 1.95, BH + 0.62 + 0.3 + s * 0.42, tz], [tx + 1.95, BH + 0.62 + 0.3 + s * 0.42, tz + 0.4], 0.015, 5, { ink: false });
  for (const zz of [tz, tz + 0.4]) k.rod(M.ironPaint, [tx + 1.95, BH + 0.62, zz], [tx + 1.95, ty + 3.0, zz], 0.02, 6, { ink: false });
  // elevator penthouse (brick, stone coping, louvred vents + door)
  k.span(M.brick, [3.6, BH + 0.62, -6.2], [8.4, BH + 3.6, -2.4]); k.span(M.sandTrim, [3.5, BH + 3.6, -6.3], [8.5, BH + 3.78, -2.3]);
  for (let l = 0; l < 6; l++) k.span(M.ironPaint, [4.0, BH + 2.0 + l * 0.18, -2.4], [5.4, BH + 2.08 + l * 0.18, -2.25], { ink: false });
  k.span(M.frameBrown, [6.4, BH + 0.62, -2.42], [7.4, BH + 2.7, -2.33]);
  // skylights (pitched glass on iron frames)
  for (const [sx, sz] of [[-2, 4], [3.5, 4.5]]) { k.span(M.ironPaint, [sx - 1.3, BH + 0.62, sz - 0.9], [sx + 1.3, BH + 1.0, sz + 0.9]);
    for (const s of [-1, 1]) { k.plane(M.glass, 2.5, 1.05, [sx, BH + 1.32, sz + s * 0.44], [s * -0.62 - (s < 0 ? Math.PI : 0) * 0, s < 0 ? Math.PI : 0, 0]); }
    for (let g = -2; g <= 2; g++) for (const s of [-1, 1]) k.rod(M.ironPaint, [sx + g * 0.6, BH + 1.0, sz + s * 0.88], [sx + g * 0.6, BH + 1.66, sz], 0.02, 5, { ink: false });
    k.rod(M.ironPaint, [sx - 1.3, BH + 1.66, sz], [sx + 1.3, BH + 1.66, sz], 0.03, 6); }
  // chimney + roof hatch + vent pipes
  k.span(M.brick, [9.2, BH + 0.62, 5.0], [10.4, BH + 4.0, 6.2]); k.span(M.sandTrim, [9.1, BH + 4.0, 4.9], [10.5, BH + 4.18, 6.3]); k.cyl(M.castIron, 0.18, 0.18, 0.6, [9.8, BH + 4.45, 5.6], [0, 0, 0], 12);
  k.span(M.ironPaint, [-9.5, BH + 0.62, 6.0], [-8.3, BH + 1.2, 7.2]);
  for (const [vx, vz] of [[0, -6], [-2.5, -6.5], [6, 6.5]]) { k.cyl(M.castIron, 0.1, 0.1, 1.0, [vx, BH + 1.1, vz], [0, 0, 0], 10); k.cyl(M.castIron, 0.16, 0.12, 0.12, [vx, BH + 1.66, vz], [0, 0, 0], 10); }
  // flagpole socket
  k.cyl(M.castIron, 0.12, 0.15, 0.3, [0, BH + 1.7, hz - 0.6], [0, 0, 0], 10);
  return k;
};

/** cornice, belt courses, quoins, parapet (building-local, built with ring() so corners never overlap) */
const trimKit = (M: AM) => {
  const k = new Kit(), hx = BW / 2, hz = BD / 2;
  // belt course over the ground storey
  ring(k, M.sandTrim, floorY(1) - 0.25, floorY(1) - 0.12, 0.06); ring(k, M.sandTrim, floorY(1) - 0.12, floorY(1) + 0.08, 0.16); ring(k, M.sandTrim, floorY(1) + 0.08, floorY(1) + 0.12, 0.1);
  // attic sill course
  ring(k, M.sandTrim, floorY(FLOORS - 1) + 0.38, floorY(FLOORS - 1) + 0.58, 0.1);
  // entablature: architrave, frieze (brick, inside the walls already), dentils, modillions, corona, cymatium
  ring(k, M.sandTrim, BH - 0.62, BH - 0.4, 0.07); ring(k, M.sandTrim, BH - 0.4, BH - 0.33, 0.1);
  ring(k, M.brick, BH - 0.33, BH - 0.02, 0.01);
  ring(k, M.sandTrim, BH - 0.02, BH + 0.08, 0.36); ring(k, M.sandTrim, BH + 0.08, BH + 0.36, CORN); ring(k, M.sandTrim, BH + 0.36, BH + 0.48, CORN + 0.06); ring(k, M.sandTrim, BH + 0.48, BH + 0.62, CORN - 0.15);
  // dentils + modillions on all faces (along each face, never at the corner squares)
  const along = (len: number, step: number) => Array.from({ length: Math.floor(len / step) }, (_, i) => -len / 2 + step * (i + 0.5));
  for (const x of along(BW + 0.4, 0.26)) for (const s of [-1, 1]) k.span(M.sandTrim, [x - 0.07, BH - 0.3, s * hz + (s > 0 ? 0.01 : -0.26)], [x + 0.07, BH - 0.06, s * hz + (s > 0 ? 0.26 : -0.01)], { ink: 0.35 });
  for (const z of along(BD - 0.6, 0.26)) for (const s of [-1, 1]) k.span(M.sandTrim, [s * hx + (s > 0 ? 0.01 : -0.26), BH - 0.3, z - 0.07], [s * hx + (s > 0 ? 0.26 : -0.01), BH - 0.06, z + 0.07], { ink: 0.35 });
  const brk: [number, number][] = [[0, 0], [CORN - 0.12, 0], [CORN - 0.12, 0.1], [0.5, 0.12], [0.3, 0.22], [0.18, 0.36], [0, 0.36]];
  for (const x of along(BW, 0.85)) for (const s of [-1, 1]) k.ext(M.sandTrim, brk, 0.16, [x, BH - 0.28, s * hz], [0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]);
  for (const z of along(BD - 1.0, 0.85)) for (const s of [-1, 1]) k.ext(M.sandTrim, brk, 0.16, [s * hx, BH - 0.28, z], [0, s > 0 ? 0 : Math.PI, 0]);
  // parapet + coping
  ring(k, M.brick, PAR0, PAR1, 0.0, 0.35); ring(k, M.sandTrim, PAR1, PAR1 + 0.12, 0.06, 0.41);
  // corner quoins (alternating long/short, proud 4 cm, wrapping the corner)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let q = 0; q * 0.66 + floorY(1) + 0.2 < BH - 0.75; q++) {
    const y0 = floorY(1) + 0.2 + q * 0.66, y1 = y0 + 0.6, lf = q % 2 ? 0.55 : 0.95, ls = q % 2 ? 0.95 : 0.55;
    k.span(M.sandTrim, [sx > 0 ? hx - lf : -hx - 0.04, y0, sz > 0 ? hz : -hz - 0.04], [sx > 0 ? hx + 0.04 : -hx + lf, y1, sz > 0 ? hz + 0.04 : -hz], { ink: 0.4 });
    k.span(M.sandTrim, [sx > 0 ? hx : -hx - 0.04, y0, sz > 0 ? hz - ls : -hz], [sx > 0 ? hx + 0.04 : -hx, y1, sz > 0 ? hz : -hz + ls], { ink: 0.4 });
  }
  return k;
};

/** the complete static building (memoised) */
export const useHeroKit = () => once("hero", () => {
  const M = archMats(), k = new Kit(), signM = new THREE.MeshStandardMaterial({ map: signTex("TELEPHONE CO.", "#1d2a24", "#e8cf86"), roughness: 0.55, metalness: 0.1, emissive: new THREE.Color("#2a2418"), emissiveIntensity: 0.3 });
  const W2 = BD - 2 * T_WALL;
  k.merge(face(M, BW, FRONT_BAYS, "front", 11), [0, 0, BD / 2]);
  k.merge(face(M, BW, FRONT_BAYS, "back", 12), [0, 0, -BD / 2], [0, Math.PI, 0]);
  k.merge(face(M, W2, SIDE_BAYS, "side", 13, true), [BW / 2, 0, 0], [0, Math.PI / 2, 0]);
  k.merge(face(M, W2, SIDE_BAYS, "side", 14), [-BW / 2, 0, 0], [0, -Math.PI / 2, 0]);
  k.merge(portalKit(M, signM), [0, 0, BD / 2]);
  k.merge(interiors(M)); k.merge(trimKit(M)); k.merge(roofKit(M));
  return k;
});
export const HeroBuilding: React.FC = () => { const kit = useHeroKit(); return <KitMesh kit={kit} />; };
void pick;
