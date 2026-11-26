// short3 neighbouring buildings (original, procedurally varied 1880-1925 American commercial/residential blocks):
// every one different in brick, trim, storeys, window rhythm, lintels, cornice, ground floor and roof clutter.
//  - shopfronts: cast-iron pilasters, painted sign board (in-world lettering), display windows with stall risers,
//    prism transoms, recessed doors, lit shop interiors with shelves of goods + counter, striped canvas awnings
//  - upper floors: real recessed double-hung windows, lit rooms with curtains/blinds, sills + lintels (stone,
//    segmental brick arch or pressed-metal hood), belt courses, bracketed metal / stone / corbelled-brick cornices
//  - front fire escapes on residential blocks, water tanks, chimneys, skylights, faded painted wall signs
// Local frame of one building: front face z = 0 (outside +z), x in [0, w], depth into -z.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "./kit";
import { AM, archMats, wallRect, windowUnit, fireEscape, downpipe, signTex, awningTex, ghostTex, posterTex, Rect, pick } from "./archKit";
import { BW, SIDEWALK, FAR_WALK } from "./world";
import { V3, rng } from "../../lib/math";

type Shop = { text: string; bg: string; fg: string; aw: [string, string] | null; goods: string[]; kind?: "barber" | "cafe" | "bank" | "hotel" };
export type NSpec = { w: number; floors: number; fh: number; brick: keyof AM; trim: "stone" | "paint"; paint: string; frame: keyof AM; wins: number;
  lintel: "stone" | "arch" | "hood"; cornice: "metal" | "stone" | "corbel"; shop: Shop | null; stoop?: boolean; fire: boolean; tank: boolean; ghost?: [string, string]; depth: number; seed: number; lite?: boolean };

const SHOPS: Shop[] = [
  { text: "DRUGS", bg: "#1f3b2c", fg: "#f2e2a8", aw: ["#2f6b44", "#efe6cf"], goods: ["#c9d6e0", "#7aa3c4", "#b23a2e", "#efe6cf"] },
  { text: "HARDWARE", bg: "#22283a", fg: "#e9d9a0", aw: ["#2e3d6b", "#e8dfc8"], goods: ["#6b6f74", "#8a5a3a", "#3a4a5a", "#b8862e"] },
  { text: "BAKERY", bg: "#5a1f1c", fg: "#f6e6c0", aw: ["#b22a24", "#f3ecdc"], goods: ["#d6a25a", "#c48a44", "#e9cf9a", "#a0623a"] },
  { text: "CAFE", bg: "#2a1c14", fg: "#e7c27a", aw: ["#7a2a2a", "#efe2c4"], goods: ["#efe6cf", "#6b4a32"], kind: "cafe" },
  { text: "GROCERY", bg: "#264028", fg: "#f2e8c4", aw: ["#3f7a3c", "#f1ead8"], goods: ["#d2462e", "#e3b43a", "#6aa24a", "#b8562e", "#efe6cf"] },
  { text: "BARBER", bg: "#f1ead8", fg: "#2a2626", aw: null, goods: ["#efe6cf"], kind: "barber" },
  { text: "TAILOR", bg: "#3a2a3a", fg: "#efdcb0", aw: ["#5a3a6a", "#e9dfc9"], goods: ["#3b3f52", "#6a5a4a", "#8a8a8a", "#2a2a33"] },
  { text: "SHOES", bg: "#2b2b2b", fg: "#e2c27a", aw: ["#8a6a2a", "#efe6cf"], goods: ["#3a2418", "#5a3a22", "#1a1a1a", "#8a5a3a"] },
  { text: "HOTEL", bg: "#4a1418", fg: "#f2d690", aw: null, goods: [], kind: "hotel" },
  { text: "NEWS & CIGARS", bg: "#1d2e3a", fg: "#f0e2b6", aw: ["#b8862e", "#efe6cf"], goods: ["#e9e2cf", "#c43a2a", "#2a5a8a"] },
  { text: "SAVINGS BANK", bg: "#1b1b1b", fg: "#e2c886", aw: null, goods: [], kind: "bank" },
];

const shopfront = (k: Kit, M: AM, s: NSpec, sh: Shop, w: number, H0: number) => {
  const pil = M.castIron, signM = new THREE.MeshStandardMaterial({ map: signTex(sh.text, sh.bg, sh.fg), roughness: 0.6, emissive: new THREE.Color("#2a2418"), emissiveIntensity: 0.25 });
  // cast-iron pilasters + capitals, sign board, shop cornice
  for (const x of [0, w - 0.36]) { k.span(pil, [x, 0.16, 0], [x + 0.36, H0 - 0.6, 0.14]); k.span(pil, [x - 0.04, H0 - 0.75, 0], [x + 0.4, H0 - 0.6, 0.2]); k.span(pil, [x - 0.03, 0.16, 0], [x + 0.39, 0.5, 0.18]); }
  k.span(M.frameGreen, [0, H0 - 0.6, 0], [w, H0, 0.12]); k.plane(signM, w - 1.0, 0.44, [w / 2, H0 - 0.3, 0.125], [0, 0, 0], { uv01: true });
  k.span(M.frameGreen, [-0.05, H0, 0], [w + 0.05, H0 + 0.12, 0.3]);
  // shop interior (lit): floor, walls, ceiling, shelves of goods, counter, pendants
  const D = 4.0, r = rng(s.seed + 5);
  k.span(M.floorWood, [0.36, 0.1, -D], [w - 0.36, 0.16, -0.3], { ink: false }); k.span(M.ceiling, [0.36, H0 - 0.65, -D], [w - 0.36, H0 - 0.6, -0.3], { ink: false });
  k.span(M.plaster, [0.36, 0.16, -D - 0.1], [w - 0.36, H0 - 0.65, -D], { ink: false });
  for (const x of [0.36, w - 0.46]) k.span(M.plasterC, [x, 0.16, -D], [x + 0.1, H0 - 0.65, -0.3], { ink: false });
  if (sh.kind === "cafe") { for (let t = 0; t < 3; t++) { const x = 1.2 + t * (w - 2.4) / 2, z = -1.6 - (t % 2) * 1.2; k.cyl(M.frameWhite, 0.4, 0.4, 0.04, [x, 0.92, z], [0, 0, 0], 16, { ink: false }); k.cyl(M.castIron, 0.04, 0.04, 0.76, [x, 0.54, z], [0, 0, 0], 8, { ink: false }); for (const d of [-1, 1]) { k.cyl(M.furn, 0.2, 0.2, 0.04, [x + d * 0.6, 0.62, z], [0, 0, 0], 12, { ink: false }); k.cyl(M.castIron, 0.02, 0.02, 0.46, [x + d * 0.6, 0.39, z], [0, 0, 0], 6, { ink: false }); } } }
  else if (sh.kind === "barber") { for (let c = 0; c < 2; c++) { const x = 1.4 + c * 1.8; k.span(M.red, [x - 0.3, 0.6, -2.6], [x + 0.3, 0.75, -2.0], { ink: false }); k.span(M.red, [x - 0.3, 0.75, -2.65], [x + 0.3, 1.5, -2.55], { ink: false }); k.cyl(M.chrome, 0.08, 0.15, 0.45, [x, 0.38, -2.3], [0, 0, 0], 10, { ink: false }); } k.plane(M.glassDark, w - 1.4, 1.0, [w / 2, 1.8, -D + 0.02]); }
  else if (sh.kind === "bank") { k.span(M.bronze, [0.8, 0.16, -2.6], [w - 0.8, 1.2, -2.3], { ink: false }); for (let b = 0; b < Math.floor((w - 1.6) / 0.25); b++) k.rod(M.brass, [0.9 + b * 0.25, 1.2, -2.45], [0.9 + b * 0.25, 2.2, -2.45], 0.01, 5, { ink: false }); }
  else if (sh.kind === "hotel") { k.span(M.furn, [1.0, 0.16, -3.0], [w - 1.0, 1.1, -2.5], { ink: false }); k.span(M.curtain, [0.5, 0.16, -D + 0.05], [w - 0.5, H0 - 0.7, -D + 0.08], { ink: false }); }
  else {
    for (let sl = 0; sl < 4; sl++) { const y = 0.5 + sl * 0.62; k.span(M.furn, [0.5, y, -D], [w - 0.5, y + 0.04, -D + 0.45], { ink: false });
      for (let x = 0.6; x < w - 0.7; x += 0.18 + r() * 0.1) { const c = new THREE.MeshStandardMaterial({ color: pick(r, sh.goods), roughness: 0.6, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.06 }); const gh = 0.15 + r() * 0.3; k.span(c, [x, y + 0.04, -D + 0.05 + r() * 0.1], [x + 0.12 + r() * 0.06, y + 0.04 + gh, -D + 0.3], { ink: false }); } }
    k.span(M.furn, [0.9, 0.16, -2.2], [w * 0.62, 1.0, -1.7], { ink: false }); k.span(M.timberDk, [0.85, 1.0, -2.25], [w * 0.62 + 0.05, 1.05, -1.65], { ink: false });
    k.span(M.brass, [w * 0.45, 1.05, -2.1], [w * 0.45 + 0.35, 1.35, -1.85], { ink: false });                                              // cash register
  }
  for (let p = 0; p < Math.max(1, Math.floor(w / 3)); p++) { const x = (w * (p + 0.5)) / Math.max(1, Math.floor(w / 3)); k.rod(M.castIron, [x, H0 - 0.65, -1.8], [x, H0 - 1.2, -1.8], 0.008, 5, { ink: false }); k.sphere(M.lamp, 0.12, [x, H0 - 1.28, -1.8], [1, 0.8, 1], { ink: false }); }
  // display windows: stall riser, glass, mullions, prism transom; recessed door (left or centre)
  const dW = 1.1, dX = s.seed % 2 ? 0.55 : w / 2 - dW / 2, y0 = 0.62, yT = H0 - 1.25;
  for (const [a, b] of [[0.36, dX], [dX + dW, w - 0.36]] as [number, number][]) { if (b - a < 0.3) continue;
    k.span(M.frameGreen, [a, 0.16, -0.08], [b, y0, 0.06]); k.span(M.frameGreen, [a, y0 - 0.04, -0.1], [b, y0 + 0.02, 0.08]);
    k.plane(M.glass, b - a - 0.08, yT - y0, [(a + b) / 2, (y0 + yT) / 2, -0.03]);
    for (let m = 1; m < Math.round((b - a) / 1.3); m++) { const x = a + ((b - a) * m) / Math.round((b - a) / 1.3); k.span(M.frameGreen, [x - 0.03, y0, -0.06], [x + 0.03, yT, 0.0]); }
    k.span(M.frameGreen, [a, yT, -0.07], [b, yT + 0.08, 0.02]); k.plane(M.frosted, b - a - 0.08, H0 - 0.68 - yT - 0.08, [(a + b) / 2, (yT + 0.08 + H0 - 0.68) / 2, -0.03]);
    // goods in the window
    for (let x = a + 0.3; x < b - 0.3; x += 0.35 + r() * 0.2) { const c = new THREE.MeshStandardMaterial({ color: pick(r, sh.goods.length ? sh.goods : ["#efe6cf"]), roughness: 0.6, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.06 }); k.span(c, [x, y0 + 0.02, -0.5], [x + 0.18, y0 + 0.2 + r() * 0.35, -0.3], { ink: false }); }
  }
  k.span(M.floorWood, [dX, 0.1, -1.2], [dX + dW, 0.17, 0.0], { ink: false });
  k.span(M.frameGreen, [dX + 0.08, 0.17, -1.2], [dX + dW - 0.08, 2.3, -1.12]); k.plane(M.glass, dW - 0.4, 1.1, [dX + dW / 2, 1.55, -1.1]); k.span(M.brass, [dX + dW - 0.28, 1.05, -1.11], [dX + dW - 0.2, 1.12, -1.06], { ink: false });
  k.span(M.frameGreen, [dX + 0.08, 2.3, -1.2], [dX + dW - 0.08, yT + 0.08, -1.12]);
  // awning (striped canvas, scalloped valance, iron arms) or barber pole / hotel marquee
  if (sh.aw) { const aM = new THREE.MeshStandardMaterial({ map: awningTex(sh.aw[0], sh.aw[1], s.seed), roughness: 0.95, side: THREE.DoubleSide }), aw = w - 0.5, z1 = 1.75, yA = H0 - 0.68, yB = yA - 0.95;
    const L = Math.hypot(z1, yA - yB), ang = Math.atan2(yA - yB, z1);
    k.plane(aM, aw, L, [w / 2, (yA + yB) / 2, z1 / 2], [-Math.PI / 2 + ang, 0, 0], { uv01: true, cast: true });
    const sc: [number, number][] = [[-aw / 2, 0], [aw / 2, 0]]; const n = Math.round(aw / 0.35); for (let i = n; i >= 0; i--) { const x = -aw / 2 + (aw * i) / n; sc.push([x, -0.26], [x - aw / n / 2, -0.18]); }
    k.ext(aM, sc.slice(0, -1), 0.01, [w / 2, yB, z1], [0, 0, 0], 0, { ink: 0.3 });
    for (const x of [0.4, w - 0.4]) { k.rod(M.castIron, [x, yA - 0.3, 0.05], [x, yB, z1 - 0.05], 0.012, 5); k.rod(M.castIron, [x, yA, 0.05], [x, yB, z1 - 0.05], 0.012, 5); }
  }
  if (sh.kind === "barber") { const bx = dX + dW + 0.35; k.span(M.chrome, [bx - 0.1, 2.25, 0.18], [bx + 0.1, 2.3, 0.38]); k.span(M.chrome, [bx - 0.1, 0.9, 0.18], [bx + 0.1, 0.95, 0.38]); }
  if (sh.kind === "hotel") { k.span(M.bronze, [dX - 0.6, H0 - 0.9, 0.0], [dX + dW + 0.6, H0 - 0.75, 2.6]); for (const x of [dX - 0.5, dX + dW + 0.5]) k.rod(M.bronze, [x, H0 - 0.75, 2.5], [x, H0 + 0.6, 0.05], 0.02, 6); for (let b = 0; b < 8; b++) k.sphere(M.lamp, 0.05, [dX - 0.4 + b * (dW + 0.8) / 7, H0 - 0.93, 2.5], [1, 1, 1], { ink: false }); }
};

/** cheap lit room behind an upper window */
const roomCell = (k: Kit, M: AM, cx: number, w: number, y: number, fh: number, r: () => number) => {
  const wall = pick(r, [M.plaster, M.plasterB, M.plasterC]), D = 1.6;
  k.span(M.floorWood, [cx - w / 2 - 0.3, y - 0.05, -D], [cx + w / 2 + 0.3, y + 0.02, -0.36], { ink: false });
  k.span(wall, [cx - w / 2 - 0.3, y, -D - 0.06], [cx + w / 2 + 0.3, y + fh, -D], { ink: false });
  k.span(M.ceiling, [cx - w / 2 - 0.3, y + fh - 0.3, -D], [cx + w / 2 + 0.3, y + fh - 0.25, -0.36], { ink: false });
  for (const sd of [-1, 1]) k.span(wall, [cx + sd * (w / 2 + 0.3) - 0.03, y, -D], [cx + sd * (w / 2 + 0.3) + 0.03, y + fh, -0.36], { ink: false });
  if (r() < 0.6) k.sphere(M.lamp, 0.1, [cx + (r() - 0.5) * 0.6, y + fh - 0.75, -D * 0.6], [1, 0.8, 1], { ink: false });
  if (r() < 0.5) k.span(M.furn, [cx - 0.5, y + 0.02, -D + 0.05], [cx + 0.4, y + 0.9 + r() * 0.9, -D + 0.45], { ink: false });
  if (r() < 0.5) k.span(M.frameBrown, [cx - 0.25, y + 1.5, -D + 0.01], [cx + 0.25, y + 1.9, -D + 0.03], { ink: false });
};

export const buildNeighbour = (s: NSpec) => {
  const M = archMats(), k = new Kit(), r = rng(s.seed), T = 0.36, w = s.w;
  const H0 = s.shop ? 4.4 : 1.2 + s.fh, floorsY = Array.from({ length: s.floors }, (_, i) => H0 + i * s.fh), H = H0 + s.floors * s.fh, Htop = H + 0.9;
  const wallM = M[s.brick] as THREE.Material, trim = s.trim === "stone" ? M.sandTrim : new THREE.MeshStandardMaterial({ color: s.paint, roughness: 0.6 }), frame = M[s.frame] as THREE.Material;
  // window grid
  const ww = Math.min(1.25, (w - 1.2) / s.wins - 0.55), wh = Math.min(2.2, s.fh - 1.25), xs = Array.from({ length: s.wins }, (_, i) => 0.6 + ((w - 1.2) * (i + 0.5)) / s.wins);
  const holes: Rect[] = floorsY.flatMap((y) => xs.map((x) => ({ x0: x - ww / 2, x1: x + ww / 2, y0: y + 0.8, y1: y + 0.8 + wh })));
  // main mass (sides, back, roof) + front wall with openings
  if (s.shop) { k.span(wallM, [0, 0, -s.depth], [w, H0, -4.2]); k.span(wallM, [0, H0, -s.depth], [w, H, -1.7]); } else k.span(wallM, [0, 0, -s.depth], [w, H, -1.7]);
  for (const sd of [0, w - T]) k.span(wallM, [sd, s.shop ? H0 : 0, -1.7], [sd + T, H, -T]);
  if (s.shop) wallRect(k, wallM, 0, w, H0 + 0.12, Htop, -T, 0, holes); else { wallRect(k, wallM, 0, w, 0, Htop, -T, 0, [...holes, { x0: w / 2 - 0.65, x1: w / 2 + 0.65, y0: 0, y1: 2.9 }]); }
  k.span(M.roofTar, [T, H - 0.05, -s.depth + T], [w - T, H + 0.05, -T], { ink: false });
  if (s.shop) shopfront(k, M, s, s.shop, w, H0);
  else { // residential stoop: steps, door with transom, lamps, basement windows
    for (let st = 0; st < 5; st++) k.span(M.sandTrim, [w / 2 - 1.0, 0, 0.1 + (4 - st) * 0.3], [w / 2 + 1.0, 0.16 + (st + 1) * 0.2, 0.1 + (5 - st) * 0.3 + (st === 4 ? 0 : 0)]);
    k.span(M.sandTrim, [w / 2 - 1.0, 0, -T + 0.02], [w / 2 + 1.0, 1.16, 0.1]);
    k.span(M.frameBrown, [w / 2 - 0.55, 1.16, -0.3], [w / 2 + 0.55, 2.5, -0.24]); k.plane(M.glass, 0.8, 0.5, [w / 2, 2.1, -0.235]); k.plane(M.glass, 1.1, 0.35, [w / 2, 2.7, -0.2]);
    k.span(M.brass, [w / 2 + 0.3, 1.8, -0.24], [w / 2 + 0.36, 1.86, -0.2], { ink: false });
    for (const sd of [-1, 1]) { k.rod(M.castIron, [w / 2 + sd * 1.0, 0.36, 1.6], [w / 2 + sd * 1.0, 2.0, 0.15], 0.018, 6); k.sphere(M.lampDim, 0.12, [w / 2 + sd * 1.0, 2.15, 0.25], [1, 1.3, 1], { ink: false }); }
    k.span(trim, [w / 2 - 0.85, 2.9, -0.05], [w / 2 + 0.85, 3.15, 0.18]);
  }
  // upper windows + rooms + sills + lintels
  for (const h of holes) { const cx = (h.x0 + h.x1) / 2, y = h.y0 - 0.8;
    if (s.lite) { k.span(frame, [h.x0 + 0.01, h.y0, -0.2], [h.x1 - 0.01, h.y1 - 0.01, -0.14]); k.plane(r() < 0.35 ? M.blind : M.glassDark, ww - 0.12, wh - 0.12, [cx, (h.y0 + h.y1) / 2, -0.135]); k.span(frame, [h.x0, (h.y0 + h.y1) / 2 - 0.03, -0.14], [h.x1, (h.y0 + h.y1) / 2 + 0.03, -0.1], { ink: false }); }
    else { windowUnit(k, M, cx, h.y0, ww, wh, { frame, panes: r() < 0.5 ? 1 : 2, blind: r() < 0.5 ? 0.1 + r() * 0.5 : 0, open: r() < 0.12 ? 0.6 : 0, curtain: r() < 0.4 ? pick(r, [M.curtain, M.curtainB]) : undefined, blindMat: r() < 0.3 ? M.blindGreen : M.blind });
      roomCell(k, M, cx, ww, y, s.fh, r); }
    k.span(trim, [h.x0 - 0.1, h.y0 - 0.1, -0.18], [h.x1 + 0.1, h.y0 + 0.03, 0.09]);
    if (s.lintel === "stone") { k.span(trim, [h.x0 - 0.12, h.y1, 0.0], [h.x1 + 0.12, h.y1 + 0.3, 0.05]); }
    else if (s.lintel === "hood") { k.span(trim, [h.x0 - 0.18, h.y1 + 0.02, 0.0], [h.x1 + 0.18, h.y1 + 0.32, 0.08]); k.span(trim, [h.x0 - 0.24, h.y1 + 0.32, 0.0], [h.x1 + 0.24, h.y1 + 0.42, 0.16]); for (const sd of [-1, 1]) k.span(trim, [cx + sd * (ww / 2 + 0.1) - 0.07, h.y1 - 0.12, 0.0], [cx + sd * (ww / 2 + 0.1) + 0.07, h.y1 + 0.02, 0.1]); }
    else { const pts: [number, number][] = []; const R = ww / 2 + 0.12, n = 9; for (let i = 0; i <= n; i++) { const a = Math.PI * 0.18 + (Math.PI * 0.64 * i) / n; pts.push([-Math.cos(a) * R * 1.35, Math.sin(a) * R * 0.55 - R * 0.55 * Math.sin(Math.PI * 0.18)]); } for (let i = n; i >= 0; i--) { const a = Math.PI * 0.18 + (Math.PI * 0.64 * i) / n; pts.push([-Math.cos(a) * (R * 1.35 + 0.0), Math.sin(a) * R * 0.55 - R * 0.55 * Math.sin(Math.PI * 0.18) + 0.24]); } k.ext(wallM, pts, 0.04, [cx, h.y1, 0.02]); }
  }
  // belt courses between floors (some buildings)
  if (s.seed % 3 !== 0) for (const y of floorsY.slice(1)) k.span(trim, [-0.04, y + 0.2, 0.0], [w + 0.04, y + 0.32, 0.07]);
  // cornice
  if (s.cornice === "metal") { const cm = new THREE.MeshStandardMaterial({ color: s.paint, roughness: 0.5, metalness: 0.2 });
    k.span(cm, [-0.1, H - 0.2, 0.0], [w + 0.1, H + 0.45, 0.12]); k.span(cm, [-0.25, H + 0.45, 0.0], [w + 0.25, H + 0.75, 0.62]); k.span(cm, [-0.3, H + 0.75, 0.0], [w + 0.3, H + 0.86, 0.7]);
    for (let x = 0.2; x <= w - 0.1; x += (w - 0.3) / Math.max(2, Math.round(w / 1.0))) k.ext(cm, [[0, 0], [0.5, 0.6], [0.5, 0.75], [0.12, 0.75], [0, 0.4]], 0.14, [x, H - 0.0, 0.0], [0, -Math.PI / 2, 0]);
    for (let x = 0.6; x < w - 0.6; x += 1.0) k.span(cm, [x - 0.3, H - 0.1, 0.12], [x + 0.3, H + 0.3, 0.15], { ink: 0.3 }); }
  else if (s.cornice === "stone") { k.span(M.sandTrim, [-0.1, H - 0.3, 0.0], [w + 0.1, H, 0.12]); k.span(M.sandTrim, [-0.2, H, 0.0], [w + 0.2, H + 0.25, 0.45]); for (let x = 0.1; x < w; x += 0.3) k.span(M.sandTrim, [x - 0.06, H - 0.22, 0.12], [x + 0.06, H - 0.04, 0.22], { ink: 0.3 }); k.span(M.sandTrim, [-0.22, H + 0.85, 0.0], [w + 0.22, H + 0.95, 0.1]); }
  else { for (let c = 0; c < 4; c++) k.span(wallM, [0, H - 0.2 + c * 0.14, 0.0], [w, H - 0.06 + c * 0.14, 0.05 + c * 0.05]); k.span(M.sandTrim, [-0.05, H + 0.82, -T], [w + 0.05, H + 0.94, 0.1]); }
  // roof clutter
  for (let c = 0; c < 1 + Math.floor(r() * 3); c++) { const cx = 0.8 + r() * (w - 1.6), cz = -2.5 - r() * (s.depth - 4); k.span(wallM, [cx - 0.45, H, cz - 0.35], [cx + 0.45, H + 1.5 + r() * 1.2, cz + 0.35]); }
  if (s.tank) { const tx = w * (0.3 + r() * 0.4), tz = -s.depth * 0.55, L = 2.0; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.span(M.ironPaint, [tx + a * 0.9 - 0.07, H, tz + b * 0.9 - 0.07], [tx + a * 0.9 + 0.07, H + L, tz + b * 0.9 + 0.07]);
    k.cyl(M.timber, 1.25, 1.3, 2.2, [tx, H + L + 1.1, tz], [0, 0, 0], 20); for (let hh = 0; hh < 4; hh++) k.torus(M.ironPaint, 1.29, 0.025, [tx, H + L + 0.3 + hh * 0.55, tz], [Math.PI / 2, 0, 0]); k.lathe(M.ironPaint, [[0, 0], [1.4, 0], [0.1, 0.7], [0, 0.75]], [tx, H + L + 2.2, tz], 20); }
  if (r() < 0.6) { const sx = w * 0.5, sz = -s.depth * 0.3; k.span(M.ironPaint, [sx - 0.8, H, sz - 0.6], [sx + 0.8, H + 0.5, sz + 0.6]); k.plane(M.glassDark, 1.5, 1.1, [sx, H + 0.52, sz], [-Math.PI / 2, 0, 0]); }
  if (s.fire) fireEscape(k, M, xs[0] - ww / 2 - 0.3, xs[Math.min(1, xs.length - 1)] + ww / 2 + 0.3, floorsY.map((y) => y + 0.02), 1.05);
  downpipe(k, M, s.seed % 2 ? w - 0.25 : 0.25, H - 0.1, 0.1);
  return { kit: k, H: Htop };
};

// ---------------------------------------------------------------- the street's buildings
const BRICKS: (keyof AM)[] = ["brickB", "brickC", "brickD", "brickE", "brickB", "brickC"];
const FRAMES: (keyof AM)[] = ["frameGreen", "frameCream", "frameBrown", "frameWhite"];
const PAINTS = ["#5a4a3a", "#6b6b5e", "#3f4a3a", "#7a6a52", "#4a3f45", "#8a7a62"];
const spec = (seed: number, w: number, shop: Shop | null, extra: Partial<NSpec> = {}): NSpec => { const r = rng(seed * 13 + 7);
  return { w, floors: 3 + Math.floor(r() * 4), fh: 3.3 + r() * 0.5, brick: pick(r, BRICKS), trim: r() < 0.55 ? "stone" : "paint", paint: pick(r, PAINTS), frame: pick(r, FRAMES), wins: Math.max(2, Math.round(w / 2.6)),
    lintel: pick(r, ["stone", "arch", "hood"] as const), cornice: pick(r, ["metal", "stone", "corbel"] as const), shop, fire: r() < 0.3, tank: r() < 0.4, depth: 14, seed, ...extra }; };

export type Placed = { kit: Kit; p: V3; ry: number; H: number; x0: number; w: number };
/** across the street (fronts face -z), same side right of the alley (fronts face +z), rear row behind the lot (fronts face +z) */
export const useStreetBuildings = () => once("streetBuildings", () => {
  const out: Placed[] = [], zA = FAR_WALK[1];
  let x = -64, i = 0; const shopOrder = [0, 9, 4, 2, 6, 5, 3, 8, 1, 7, 10, 4, 0];
  while (x < 70) { const r = rng(900 + i), w = 7 + Math.floor(r() * 4) * 1.5 + (i % 3 === 0 ? 3 : 0), sh = SHOPS[shopOrder[i % shopOrder.length]];
    const s = spec(100 + i, w, sh, { ghost: i % 4 === 1 ? ["COAL & ICE", "DELIVERED DAILY"] : undefined }); const b = buildNeighbour(s);
    out.push({ kit: b.kit, p: [x + w, 0, zA], ry: Math.PI, H: b.H, x0: x, w }); x += w; i++; }
  // same side, right of a 3 m alley
  x = BW / 2 + 3.0; i = 0; while (x < 70) { const r = rng(700 + i), w = 8 + Math.floor(r() * 4) * 1.5, s = spec(300 + i, w, i === 0 ? null : SHOPS[(i * 3 + 1) % SHOPS.length], i === 0 ? { floors: 4, fire: true, stoop: true } : {}); const b = buildNeighbour(s);
    out.push({ kit: b.kit, p: [x, 0, SIDEWALK[0]], ry: 0, H: b.H, x0: x, w }); x += w; i++; }
  // rear row (backs of the next street's blocks, facing the cleared lot) — residential, fire escapes
  x = -75; i = 0; while (x < 40) { const r = rng(500 + i), w = 9 + Math.floor(r() * 3) * 2, s = spec(500 + i, w, null, { fire: r() < 0.6, floors: 3 + Math.floor(r() * 3), depth: 12 }); const b = buildNeighbour(s);
    out.push({ kit: b.kit, p: [x, 0, -46], ry: 0, H: b.H, x0: x, w }); x += w + (r() < 0.3 ? 2.5 : 0); i++; }
  return out;
});

export const StreetBuildings: React.FC = () => {
  const B = useStreetBuildings();
  return <>{B.map((b, i) => <group key={i} position={b.p} rotation={[0, b.ry, 0]}><KitMesh kit={b.kit} /></group>)}</>;
};

/** painted wall signs + site hoarding posters (separate transparent materials) */
export const ghostMat = (l1: string, l2: string) => new THREE.MeshStandardMaterial({ map: ghostTex(l1, l2), transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
export const posterMat = (seed: number) => new THREE.MeshStandardMaterial({ map: posterTex(seed), roughness: 0.85 });
