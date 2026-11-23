// ORIGINAL: 1920s London street over the railway. Georgian/Victorian terraces (London stock brick, stucco ground floors
// and shopfronts, 6-over-6 sashes with stucco lintels and stone sills, first-floor iron balconettes, string course,
// cornice + parapet, slate mansards with dormers, party-wall chimney stacks with clay pots), a Post Office sorting
// office, granite kerbs, flagstone pavements, gas lamps, pillar boxes, and the city's roofscape for the aerial views.
// Street frame: x along the street; far facade line z = FAR_Z (facing +z); road z ROAD; near pavement up to the
// section plane ZC. Pavement top y = PAV. Houses: local x centred, front face z = 0, base at y = PAV.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { wallRect, rusticated, signTex, awningTex, type Rect } from "../short3/archKit";
import { pm } from "./pbr";
import { ZC, RT, earthFaceKit, type Hole } from "./cutaway";
import { Instances, type Place } from "./models";
import { RS, SAX, ST_L } from "./station";
import { R_TUN, AXIS } from "./tunnel";
import { rng, type V3 } from "../../lib/math";

export const PAV = 0.15, FAR_Z = -9, ROAD = [-5.5, 3] as const, X0 = -130, X1 = 190;
export const FL = [PAV, PAV + 3.6, PAV + 6.9, PAV + 9.9, PAV + 12.6], PARAPET = PAV + 13.5;
const LM = {
  brickY: () => once("lBrickY", () => pm("brickY", 1.1, { tint: "#e8dcc8" })), brickR: () => once("lBrickR", () => pm("brickR", 1.1, { tint: "#d8c4b4" })),
  stucco: () => once("lStucco", () => pm("stucco", 1.6, { tint: "#efe8da" })), stuccoG: () => once("lStuccoG", () => pm("stucco", 1.6, { tint: "#d8d4c8" })),
  slate: () => once("lSlate", () => pm("slate", 1.0, { tint: "#8a8e96" })), paving: () => once("lPaving", () => pm("paving", 1.2, { tint: "#c4beb2" })),
  asphalt: () => once("lAsphalt", () => pm("asphalt", 3.0, { tint: "#8a8680" })), setts: () => once("lSetts", () => pm("setts", 1.2, { tint: "#a49e94" })),
  kerb: () => once("lKerb", () => pm("concrete", 0.8, { tint: "#b4b0aa" })), conc: () => once("lConc", () => pm("concrete", 1.5, { tint: "#a09c94" })),
  sand: () => once("lSand", () => pm("concrete", 1.0, { tint: "#b8a888" })),
  frame: () => once("lFrame", () => new THREE.MeshStandardMaterial({ color: "#f2efe6", roughness: 0.5 })),
  iron: () => once("lIron", () => new THREE.MeshStandardMaterial({ color: "#1c1e1d", roughness: 0.55, metalness: 0.4 })),
  terracotta: () => once("lPot", () => new THREE.MeshStandardMaterial({ color: "#a8624a", roughness: 0.8 })),
  wood: () => once("lWood", () => pm("oak", 0.8, { tint: "#7a5a40" })),
  red: () => once("lRed", () => new THREE.MeshStandardMaterial({ color: "#b0221c", roughness: 0.4, metalness: 0.15 })),
  stone: () => once("lStone", () => pm("plaster", 1.4, { tint: "#ddd6c6" })),
};
const DOORS = ["#2a3a2e", "#1a1a1a", "#5a1e1c", "#1e2a44", "#3a2a20"].map((c, i) => () => once(`lDoor${i}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 })));
/** window glass: dark reflective pane with net curtains / blinds painted behind (uv 0..1 per pane) */
const glassMat = (v: number) => once(`lGlass${v}`, () => { const c = document.createElement("canvas"); c.width = 128; c.height = 256; const g = c.getContext("2d")!, r = rng(900 + v);
  const gr = g.createLinearGradient(0, 0, 128, 256); gr.addColorStop(0, "#5a6672"); gr.addColorStop(0.5, "#2a3038"); gr.addColorStop(1, "#1a1e24"); g.fillStyle = gr; g.fillRect(0, 0, 128, 256);
  if (v % 4 !== 3) { g.fillStyle = ["rgba(236,230,214,0.55)", "rgba(220,214,190,0.5)", "rgba(200,190,170,0.45)"][v % 3]; g.fillRect(0, 0, 40 + r() * 20, 256); g.fillRect(128 - 40 - r() * 20, 0, 60, 256);
    for (let x = 0; x < 128; x += 6) { g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(x, 0, 2, 256); } }
  if (v % 4 === 1) { g.fillStyle = "rgba(210,190,150,0.7)"; g.fillRect(0, 0, 128, 70 + r() * 40); }
  g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.moveTo(0, 40); g.lineTo(128, 0); g.lineTo(128, 30); g.lineTo(0, 90); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.12, metalness: 0.35 }); });
const SHOPS = ["W. HARGREAVE & SON  GROCERS", "TOBACCONIST", "CHEMIST", "TEA ROOMS", "IRONMONGER", "BAKER", "HATTER & HOSIER", "NEWSAGENT", "BOOT MAKER", "CORN CHANDLER"];
const shopSign = (i: number) => once(`lShop${i}`, () => new THREE.MeshStandardMaterial({ map: signTex(SHOPS[i % SHOPS.length], ["#1e3a2a", "#2a1e3a", "#3a1e1a", "#1a1a1a", "#1e2a44"][i % 5], "#e8d49a", 1024, 128), roughness: 0.4 }));
const awning = (i: number) => once(`lAwn${i}`, () => new THREE.MeshStandardMaterial({ map: awningTex(["#2a5a3a", "#7a2a22", "#2a3a6a"][i % 3], "#e8e0c8", i), roughness: 0.8, side: THREE.DoubleSide }));

/** 6-over-6 sash in an opening (cx, y0 bottom, w x h); glass set back 0.13 behind the wall face (z = 0) */
const sash = (k: Kit, cx: number, y0: number, w: number, h: number, gv: number, zf = 0, back = false) => { const F = LM.frame(), zg = zf + (back ? 0.13 : -0.13), dir = back ? Math.PI : 0, zs = (z: number) => (back ? zf + (zf - z) * -1 : z);
  k.plane(glassMat(gv), w - 0.08, h - 0.08, [cx, y0 + h / 2, zg], [0, dir, 0], { uv01: true, cast: false });
  const zb = zg + (back ? -0.02 : 0.02); void zs;
  k.box(F, [w, 0.07, 0.08], [cx, y0 + 0.035, zb]); k.box(F, [w, 0.07, 0.08], [cx, y0 + h - 0.035, zb]); k.box(F, [0.07, h, 0.08], [cx - w / 2 + 0.035, y0 + h / 2, zb]); k.box(F, [0.07, h, 0.08], [cx + w / 2 - 0.035, y0 + h / 2, zb]);
  k.box(F, [w - 0.1, 0.06, 0.07], [cx, y0 + h / 2, zb + (back ? -0.03 : 0.03)], [0, 0, 0], { ink: false });                       // meeting rail (upper sash proud)
  for (const f of [1 / 3, 2 / 3]) k.box(F, [0.025, h - 0.1, 0.03], [cx - w / 2 + w * f, y0 + h / 2, zb + (back ? -0.01 : 0.01)], [0, 0, 0], { ink: false });
  for (const f of [0.25, 0.75]) k.box(F, [w - 0.1, 0.025, 0.03], [cx, y0 + h * f, zb + (back ? -0.01 : 0.01)], [0, 0, 0], { ink: false }); };

export type HouseSpec = { w: number; shop: number | null; brick: "brickY" | "brickR"; door: number; seed: number };
const BAYS = (w: number) => [-w * 0.3, 0, w * 0.3];
const WIN = [[1.0, 2.25, 0.5], [0.98, 1.95, 0.55], [0.9, 1.5, 0.5]];
/** one terrace house front + roof + rear (detailed) */
const houseKit = (s: HouseSpec) => once(`lHouse${s.w}_${s.shop}_${s.brick}_${s.door}_${s.seed}`, () => { const k = new Kit(), w = s.w, B = s.brick === "brickY" ? LM.brickY() : LM.brickR(), S = LM.stucco(), r = rng(s.seed), T = 0.45;
  const bx = BAYS(w), holes: Rect[] = [];
  for (let f = 1; f <= 3; f++) for (const x of bx) { const [ww, hh, sill] = WIN[f - 1]; holes.push({ x0: x - ww / 2, x1: x + ww / 2, y0: FL[f] + sill, y1: FL[f] + sill + hh }); }
  wallRect(k, B, -w / 2, w / 2, FL[1], PARAPET, -T, 0, holes, { ink: 0.35 });
  for (const h of holes) { const ww = h.x1 - h.x0, cx = (h.x0 + h.x1) / 2, fl = FL.findIndex((y) => y > h.y0) - 1;
    sash(k, cx, h.y0, ww, h.y1 - h.y0, Math.floor(r() * 8));
    k.box(S, [ww + 0.3, 0.24, 0.05], [cx, h.y1 + 0.12, 0.025], [0, 0, 0], { ink: 0.25 });                   // stucco lintel / keystone band
    k.box(S, [0.18, 0.3, 0.07], [cx, h.y1 + 0.13, 0.035], [0, 0, 0], { ink: false });
    k.box(S, [ww + 0.16, 0.08, 0.12], [cx, h.y0 - 0.04, 0.06], [0, 0, 0], { ink: 0.25 });                    // stone sill
    if (fl === 1) { for (let i = 0; i <= 10; i++) k.box(LM.iron(), [0.014, 0.62, 0.014], [h.x0 + 0.02 + i * (ww - 0.04) / 10, h.y0 + 0.31, 0.18], [0, 0, 0], { ink: false });   // balconette
      k.box(LM.iron(), [ww + 0.06, 0.03, 0.03], [cx, h.y0 + 0.62, 0.18], [0, 0, 0], { ink: false }); k.box(LM.iron(), [ww + 0.06, 0.03, 0.22], [cx, h.y0 + 0.01, 0.1], [0, 0, 0], { ink: false }); } }
  // string course over the ground floor, cornice at the top floor, parapet coping
  k.box(S, [w, 0.22, 0.08], [0, FL[1] + 0.05, 0.04], [0, 0, 0], { ink: 0.3 });
  k.box(S, [w, 0.14, 0.14], [0, FL[4] + 0.07, 0.07], [0, 0, 0], { ink: false }); k.box(S, [w, 0.12, 0.24], [0, FL[4] + 0.2, 0.12], [0, 0, 0], { ink: 0.3 }); k.box(S, [w, 0.1, 0.34], [0, FL[4] + 0.31, 0.17], [0, 0, 0], { ink: 0.3 });
  k.box(S, [w, 0.08, T + 0.1], [0, PARAPET + 0.04, -T / 2 + 0.03], [0, 0, 0], { ink: 0.3 });
  // ground floor
  const gf = FL[1] - FL[0];
  if (s.shop === null) { const dx = bx[s.door % 2 ? 0 : 2], winX = bx.filter((x) => x !== dx), ghol: Rect[] = [{ x0: dx - 0.6, x1: dx + 0.6, y0: PAV, y1: PAV + 3.0 }, ...winX.map((x) => ({ x0: x - 0.55, x1: x + 0.55, y0: PAV + 0.75, y1: PAV + 3.0 }))];
    rusticated(k, LM.stuccoG(), -w / 2, w / 2, PAV, FL[1], -T, 0.03, ghol, 0.45, 0.04, 0.025);
    for (const x of winX) sash(k, x, PAV + 0.75, 1.1, 2.25, Math.floor(r() * 8), 0.03);
    k.box(DOORS[s.door % DOORS.length](), [1.0, 2.2, 0.06], [dx, PAV + 0.18 + 1.1, -0.32]);                        // panelled door recessed 0.32
    for (const [py, ph] of [[0.55, 0.7], [1.55, 0.95]] as [number, number][]) for (const sx of [-0.22, 0.22]) k.box(DOORS[s.door % DOORS.length](), [0.32, ph, 0.03], [dx + sx, PAV + 0.18 + py, -0.28], [0, 0, 0], { ink: false });
    k.box(LM.terracotta(), [0.05, 0.12, 0.02], [dx + 0.3, PAV + 1.35, -0.28], [0, 0, 0], { ink: false });
    k.plane(glassMat(3), 1.0, 0.55, [dx, PAV + 2.68, -0.3], [0, 0, 0], { uv01: true, cast: false });                           // fanlight
    k.box(LM.frame(), [1.1, 0.06, 0.06], [dx, PAV + 2.4, -0.29]); for (let i = -2; i <= 2; i++) k.box(LM.frame(), [0.02, 0.5, 0.03], [dx + i * 0.2, PAV + 2.68, -0.28], [0, 0, 0], { ink: false });
    for (let i = 0; i < 2; i++) k.box(LM.stone(), [1.4, 0.09, 0.32 - i * 0.16], [dx, PAV + 0.045 + i * 0.09, 0.16 - i * 0.16 + 0.0], [0, 0, 0], { ink: 0.3 });   // door steps
    k.box(LM.stone(), [1.4, 0.0, 0], [dx, PAV, 0]); }
  else { const fasc = shopSign(s.shop), aw = awning(s.shop);
    for (const sx of [-1, 1]) k.box(S, [0.4, gf, 0.12], [sx * (w / 2 - 0.2), PAV + gf / 2, 0.06], [0, 0, 0], { ink: 0.35 });   // pilasters
    k.box(LM.wood(), [w - 0.8, 0.62, 0.1], [0, PAV + 0.31, -0.05], [0, 0, 0], { ink: 0.35 });                                  // stall riser
    k.box(S, [w, 0.6, 0.5], [0, FL[1] - 0.3, -0.2]);                                                                       // fascia block
    k.plane(fasc, w - 0.9, 0.42, [0, FL[1] - 0.32, 0.055], [0, 0, 0], { uv01: true, cast: false });
    k.box(S, [w + 0.04, 0.1, 0.16], [0, FL[1] - 0.04, 0.08], [0, 0, 0], { ink: 0.3 });
    k.plane(glassMat(4 + (s.shop % 3)), w - 2.2, gf - 1.3, [-0.55, PAV + 0.62 + (gf - 1.3) / 2, -0.1], [0, 0, 0], { uv01: true, cast: false });
    for (const xx of [-w / 2 + 0.42, w / 2 - 1.6, -0.55]) k.box(LM.wood(), [0.07, gf - 1.25, 0.1], [xx, PAV + 0.62 + (gf - 1.25) / 2, -0.06], [0, 0, 0], { ink: false });
    k.box(LM.wood(), [w - 0.8, 0.07, 0.1], [0, PAV + gf - 0.66, -0.06], [0, 0, 0], { ink: false });
    k.box(DOORS[s.door % DOORS.length](), [0.95, 2.4, 0.06], [w / 2 - 1.0, PAV + 1.2, -0.6]);                                  // recessed shop door
    k.box(LM.wood(), [1.2, 0.02, 0.6], [w / 2 - 1.0, PAV + 0.01, -0.3], [0, 0, 0], { ink: false });
    k.box(LM.conc(), [w - 0.8, PAV + gf, 0.2], [0, (PAV + gf) / 2, -0.75], [0, 0, 0], { ink: false });                       // back of the display (shadowed interior)
    // retracted striped awning under the fascia (a roll in its box + a short drop)
    k.box(LM.iron(), [w - 0.9, 0.12, 0.14], [0, FL[1] - 0.66, 0.1]); k.plane(aw, w - 0.95, 0.35, [0, FL[1] - 0.85, 0.16], [0.35, 0, 0], { uv01: false, cast: false }); }
  // slate mansard with two dormers (front), flat lead top, rear slope
  const roofP: [number, number][] = [[-0.3, PARAPET - 0.2], [-0.3, PARAPET + 0.02], [-1.9, PARAPET + 2.9], [-10.2, PARAPET + 2.9], [-11.7, PARAPET + 0.6], [-11.7, PARAPET - 0.2]];
  k.ext(LM.slate(), roofP, w - 0.01, [0, 0, 0], [0, -Math.PI / 2, 0], 0, { ink: 0.35 });
  for (const x of [-w * 0.25, w * 0.25]) { const z0 = -0.75, y0 = PARAPET + 0.75;
    k.box(LM.slate(), [1.1, 1.35, 1.2], [x, y0 + 0.62, z0 - 0.6]); k.box(LM.frame(), [1.16, 0.1, 1.3], [x, y0 + 1.33, z0 - 0.62], [0, 0, 0], { ink: 0.3 });
    sash(k, x, y0 + 0.08, 0.72, 1.0, Math.floor(r() * 8), z0 + 0.0); }
  // party-wall chimney stack on the +x edge: brick stack, stucco cap, four clay pots
  const cz = -5.6; k.box(B, [0.85, 2.3, 1.5], [w / 2, PARAPET + 3.9, cz], [0, 0, 0], { ink: 0.4 }); k.box(S, [0.95, 0.14, 1.6], [w / 2, PARAPET + 5.1, cz], [0, 0, 0], { ink: 0.3 });
  for (let i = 0; i < 4; i++) k.lathe(LM.terracotta(), [[0.001, 0], [0.13, 0], [0.11, 0.08], [0.09, 0.45], [0.11, 0.5], [0.07, 0.52], [0.001, 0.52]], [w / 2, PARAPET + 5.17, cz - 0.54 + i * 0.36], 10, [0, 0, 0], { ink: 0.3 });
  // rear wall (seen from the air and between blocks): brick with plain windows
  const rh: Rect[] = []; for (let f = 0; f < 4; f++) for (const x of [-w * 0.25, w * 0.25]) rh.push({ x0: x - 0.45, x1: x + 0.45, y0: FL[f] + 0.7, y1: FL[f] + 2.3 - f * 0.15 });
  wallRect(k, B, -w / 2, w / 2, PAV, PARAPET, -12, -11.55, rh, { ink: 0.3 });
  for (const h of rh) k.plane(glassMat(Math.floor(r() * 8)), h.x1 - h.x0, h.y1 - h.y0, [(h.x0 + h.x1) / 2, (h.y0 + h.y1) / 2, -11.75], [0, Math.PI, 0], { uv01: true, cast: false });
  k.box(B, [w, PARAPET - PAV, 0.1], [0, (PARAPET + PAV) / 2, -6], [0, 0, 0], { ink: false, cast: false });   // internal spine wall (closes the house volume seen through windows)
  return k; });
/** far rows for the aerial roofscape: brick block, painted window grid, slate mansard, stacks (cheap) */
const facadeTex = () => once("lFacadeTex", () => { const c = document.createElement("canvas"); c.width = 256; c.height = 512; const g = c.getContext("2d")!; const r = rng(5);
  g.fillStyle = "#b8a68a"; g.fillRect(0, 0, 256, 512); g.fillStyle = "#e8e0d0"; g.fillRect(0, 380, 256, 132); g.fillRect(0, 368, 256, 8); g.fillRect(0, 0, 256, 18);
  for (let f = 0; f < 3; f++) for (let b = 0; b < 3; b++) { const x = 30 + b * 80, y = 60 + f * 105; g.fillStyle = "#efe8da"; g.fillRect(x - 6, y - 10, 52, 8); g.fillStyle = `rgb(${40 + r() * 30},${46 + r() * 30},${56 + r() * 30})`; g.fillRect(x, y, 40, 78 - f * 10); g.fillStyle = "#f2efe6"; g.fillRect(x + 18, y, 3, 78 - f * 10); g.fillRect(x, y + 36, 40, 3); }
  for (let b = 0; b < 3; b++) { g.fillStyle = "#2a3038"; g.fillRect(30 + b * 80, 410, 40, 80); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); });
const farRowKit = (key: string, x0: number, x1: number, z: number, facing: 1 | -1) => once(`lFar${key}`, () => { const k = new Kit(), W = 6, D = 11.5, r = rng(key.length * 97 + Math.round(x0 * 3 + z));
  const zc = z - facing * D / 2; let x = x0;
  // segments of 3-9 houses with their own height, brick and roof tone (a real roofscape is never one long block)
  while (x < x1 - W) { const n = Math.min(Math.floor((x1 - x) / W), 3 + Math.floor(r() * 7)), L = n * W, cx = x + L / 2, H = PARAPET - PAV + [-2.8, -1.4, 0, 0, 1.3, 2.6][Math.floor(r() * 6)];
    const brick = r() < 0.7 ? LM.brickY() : LM.brickR(), roofH = 1.8 + r() * 1.4, mans = r() < 0.6;
    k.box(brick, [L, H, D], [cx, PAV + H / 2, zc], [0, 0, 0], { ink: 0.3 });
    const fac = new THREE.PlaneGeometry(L, H); const uv = fac.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * n, uv.getY(i) * H / (PARAPET - PAV));
    for (const side of [1, -1]) k.add(facadeTex(), fac.clone(), [cx, PAV + H / 2, zc + side * (D / 2 + 0.01)], [0, side > 0 ? 0 : Math.PI, 0], [1, 1, 1], { ink: false, cast: false });
    k.ext(mans ? LM.slate() : LM.terracotta(), mans ? [[-D / 2, 0], [-D / 2 + 1.5, roofH], [D / 2 - 1.5, roofH], [D / 2, 0]] : [[-D / 2, 0], [0, roofH + 1.2], [D / 2, 0]], L, [cx, PAV + H, zc], [0, -Math.PI / 2, 0], 0, { ink: 0.25 });
    for (let i = 0; i <= n; i++) { const xx = x + i * W; k.box(brick, [0.8, 2.0, 1.3], [xx, PAV + H + roofH + 0.4, zc], [0, 0, 0], { ink: 0.3 }); for (let j = 0; j < 3; j++) k.cyl(LM.terracotta(), 0.1, 0.12, 0.45, [xx, PAV + H + roofH + 1.62, zc - 0.4 + j * 0.4], [0, 0, 0], 8, { ink: false }); }
    x += L + (r() < 0.12 ? 8 : 0); }                                                                                               // the odd gap / alley
  return k; });
/** London plane trees in the back gardens (canopy of a few lumpy spheres + trunk) */
const leafMat = () => once("lLeaf", () => new THREE.MeshStandardMaterial({ color: "#56703e", roughness: 0.9 }));
const treesKit = () => once("lTrees", () => { const k = new Kit(), r = rng(808), bark = LM.wood();
  for (let b = 0; b < 6; b++) for (let i = 0; i < 26; i++) { if (r() < 0.35) continue; const x = X0 - 30 + i * 13 + r() * 8, z = FAR_Z - 13.6 - b * 45 + (r() - 0.5) * 0.8, h = 7 + r() * 5;
    k.cyl(bark, 0.25, 0.35, h * 0.55, [x, h * 0.27, z], [0, 0, 0], 8, { ink: false });
    for (let j = 0; j < 4; j++) k.sphere(leafMat(), 2.2 + r() * 1.4, [x + (r() - 0.5) * 2.6, h * 0.7 + r() * 2, z + (r() - 0.5) * 2.6], [1, 0.85, 1], { ink: 0.25 }); }
  return k; });
/** the sorting office (over station A): 5 storeys, Portland-stone ground floor with loading arches, red brick above */
export const SORT = { x0: -42, x1: -2 };
const sortingKit = () => once("lSorting", () => { const k = new Kit(), { x0, x1 } = SORT, w = x1 - x0, cx = (x0 + x1) / 2, H = 19.5, T = 0.6, B = LM.brickR(), S = LM.stone();
  const holes: Rect[] = []; for (let f = 1; f < 5; f++) for (let x = x0 + 2.2; x < x1 - 1.5; x += 3.2) holes.push({ x0: x - 0.8, x1: x + 0.8, y0: PAV + 4.8 + (f - 1) * 3.6 + 0.6, y1: PAV + 4.8 + (f - 1) * 3.6 + 3.0 });
  wallRect(k, B, x0, x1, PAV + 4.8, PAV + H, -T, 0, holes, { ink: 0.35 });
  const r = rng(77); for (const h of holes) { sash(k, (h.x0 + h.x1) / 2, h.y0, h.x1 - h.x0, h.y1 - h.y0, Math.floor(r() * 8)); k.box(S, [1.9, 0.1, 0.14], [(h.x0 + h.x1) / 2, h.y0 - 0.05, 0.07], [0, 0, 0], { ink: 0.25 }); k.box(S, [1.9, 0.3, 0.06], [(h.x0 + h.x1) / 2, h.y1 + 0.15, 0.03], [0, 0, 0], { ink: 0.25 }); }
  const arches: Rect[] = []; for (let i = 0; i < 6; i++) { const ax = x0 + 4 + i * (w - 8) / 5; arches.push({ x0: ax - 1.6, x1: ax + 1.6, y0: PAV, y1: PAV + 3.8 }); }
  rusticated(k, S, x0, x1, PAV, PAV + 4.8, -T, 0.04, arches, 0.6, 0.05, 0.03);
  for (const a of arches) { const ax = (a.x0 + a.x1) / 2; k.box(LM.conc(), [3.2, 3.8, 0.2], [ax, PAV + 1.9, -2.5], [0, 0, 0], { ink: false }); k.box(LM.iron(), [3.3, 0.18, 0.2], [ax, PAV + 3.8, 0.05], [0, 0, 0], { ink: 0.3 });
    for (let j = -4; j <= 4; j++) k.box(LM.iron(), [0.04, 0.6, 0.04], [ax + j * 0.36, PAV + 3.5, 0.0], [0, 0, 0], { ink: false }); }
  k.box(S, [w, 0.3, 0.2], [cx, PAV + 4.85, 0.1], [0, 0, 0], { ink: 0.3 }); k.box(S, [w + 0.2, 0.5, 0.5], [cx, PAV + H - 0.1, 0.2], [0, 0, 0], { ink: 0.35 }); k.box(S, [w, 1.0, T], [cx, PAV + H + 0.5, -T / 2], [0, 0, 0], { ink: 0.3 });
  k.plane(once("lSortSign", () => new THREE.MeshStandardMaterial({ map: signTex("POST OFFICE  •  LETTERS & PARCELS", "#efe8da", "#2a2a2a", 2048, 160, "Georgia, serif", "#efe8da"), roughness: 0.5 })), w - 6, 0.9, [cx, PAV + 4.3, 0.08], [0, 0, 0], { uv01: true, cast: false });
  k.box(S, [w, H, 0.4], [cx, PAV + H / 2, -24], [0, 0, 0], { ink: 0.3 }); for (const xe of [x0, x1]) k.box(B, [0.6, H, 24], [xe, PAV + H / 2, -12], [0, 0, 0], { ink: 0.3 });
  k.box(LM.slate(), [w, 0.3, 24], [cx, PAV + H, -12], [0, 0, 0], { ink: 0.3 });
  for (const x of [cx - 12, cx, cx + 12]) k.box(B, [1.4, 3.5, 1.4], [x, PAV + H + 1.75, -14], [0, 0, 0], { ink: 0.35 });
  return k; });

// ---------------------------------------------------------------- the main street rows
const SPECS: HouseSpec[] = (() => { const r = rng(1927), out: HouseSpec[] = []; for (let i = 0; i < 60; i++) out.push({ w: [5.6, 6.0, 6.4][Math.floor(r() * 3)], shop: r() < 0.45 ? Math.floor(r() * 10) : null, brick: r() < 0.78 ? "brickY" : "brickR", door: Math.floor(r() * 5), seed: Math.floor(r() * 4) }); return out; })();
type Placed = { s: HouseSpec; x: number };
/** far terrace (facing the camera), skipping the sorting office lot and two cross streets */
export const ROW_FAR: Placed[] = (() => { const out: Placed[] = []; let x = X0, i = 0; const gaps: [number, number][] = [[SORT.x0, SORT.x1], [-74, -64], [118, 128]];
  while (x < X1) { const s = SPECS[i++ % SPECS.length]; const g = gaps.find(([a, b]) => x + s.w > a && x < b); if (g) { x = g[1]; continue; } out.push({ s, x: x + s.w / 2 }); x += s.w; } return out; })();
const rowKit = () => once("lRowFar", () => { const k = new Kit(); for (const p of ROW_FAR) k.merge(houseKit(p.s), [p.x, 0, FAR_Z]);
  // exposed end walls at the gaps
  for (const p of ROW_FAR) { const xl = p.x - p.s.w / 2, xr = p.x + p.s.w / 2; if (!ROW_FAR.some((q) => Math.abs(q.x + q.s.w / 2 - xl) < 0.01)) k.box(LM.brickY(), [0.3, PARAPET - PAV, 12], [xl + 0.15, (PARAPET + PAV) / 2, FAR_Z - 6], [0, 0, 0], { ink: 0.4 });
    if (!ROW_FAR.some((q) => Math.abs(q.x - q.s.w / 2 - xr) < 0.01)) k.box(LM.brickY(), [0.3, PARAPET - PAV, 12], [xr - 0.15, (PARAPET + PAV) / 2, FAR_Z - 6], [0, 0, 0], { ink: 0.4 }); }
  return k; });
/** street surfaces + kerbs + pavement build-up (cut cleanly at the section plane) */
const streetKit = () => once("lStreet", () => { const k = new Kit(), L = X1 - X0, cx = (X0 + X1) / 2;
  k.box(LM.asphalt(), [L, 0.12, ROAD[1] - ROAD[0] - 0.8], [cx, -0.06, (ROAD[0] + ROAD[1]) / 2], [0, 0, 0], { ink: false, cast: false });
  for (const z of [ROAD[0] + 0.2, ROAD[1] - 0.2]) k.box(LM.setts(), [L, 0.12, 0.4], [cx, -0.065, z], [0, 0, 0], { ink: false, cast: false });                  // sett gutters (5 mm lower)
  k.box(LM.conc(), [L, 0.3, ROAD[1] - ROAD[0]], [cx, -0.27, (ROAD[0] + ROAD[1]) / 2], [0, 0, 0], { ink: false, cast: false });
  for (const [za, zb] of [[FAR_Z - 0.4, ROAD[0] - 0.3], [ROAD[1] + 0.3, ZC - 0.002]] as [number, number][]) {
    k.box(LM.paving(), [L, 0.08, zb - za], [cx, PAV - 0.04, (za + zb) / 2], [0, 0, 0], { ink: false, cast: false });
    k.box(LM.sand(), [L, 0.4, zb - za], [cx, PAV - 0.28, (za + zb) / 2], [0, 0, 0], { ink: false, cast: false }); }
  for (const z of [ROAD[0] - 0.15, ROAD[1] + 0.15]) { k.box(LM.kerb(), [L, PAV + 0.35, 0.3], [cx, (PAV - 0.35) / 2, z], [0, 0, 0], { ink: 0.3, cast: false }); }
  // back-land ground (yards, cross streets) and the city ground for the aerial, 6 cm under the pavements
  k.box(LM.paving(), [L + 200, 0.1, 400], [cx, -0.11, FAR_Z - 200.5], [0, 0, 0], { ink: false, cast: false });
  return k; });
/** the city behind the main street: rows of terraces facing alternate ways, for the aerial */
const cityKit = () => once("lCity", () => { const k = new Kit();
  for (let b = 0; b < 6; b++) { const zf = FAR_Z - 27 - b * 45, zb = zf - 18;
    k.merge(farRowKit(`b${b}a`, X0 - 40, -70 - (b % 2) * 6, zf, -1)); k.merge(farRowKit(`b${b}b`, -60 + (b % 2) * 6, 116, zf, -1)); k.merge(farRowKit(`b${b}c`, 130, X1 + 40, zf, -1));
    k.merge(farRowKit(`b${b}d`, X0 - 40, -70, zb, 1)); k.merge(farRowKit(`b${b}e`, -60, 116 - (b % 2) * 12, zb, 1)); k.merge(farRowKit(`b${b}f`, 130, X1 + 40, zb, 1)); }
  // a domed cathedral and church spires on the skyline
  const S = LM.stone(); const dx = 40, dz = -330;
  k.box(S, [60, 22, 34], [dx, 11, dz]); k.cyl(S, 15, 15, 14, [dx, 29, dz], [0, 0, 0], 40); for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; k.cyl(S, 0.6, 0.6, 12, [dx + Math.cos(a) * 15.6, 29, dz + Math.sin(a) * 15.6], [0, 0, 0], 8, { ink: false }); }
  k.lathe(LM.slate(), Array.from({ length: 13 }, (_, i) => [Math.cos(i / 12 * Math.PI / 2) * 14.5 + 0.001, Math.sin(i / 12 * Math.PI / 2) * 16] as [number, number]), [dx, 36, dz], 40);
  k.cyl(S, 2.5, 2.8, 8, [dx, 55, dz], [0, 0, 0], 16); k.sphere(LM.red(), 1.2, [dx, 60.5, dz]);
  for (const [x, z, h] of [[-120, -160, 46], [150, -210, 40], [-30, -250, 38], [95, -120, 34]]) { k.box(S, [6, h * 0.55, 6], [x, h * 0.275, z]); k.cyl(LM.slate(), 0.05, 3.6, h * 0.5, [x, h * 0.55 + h * 0.25, z], [0, 0, 0], 8); }
  return k; });

// ---------------------------------------------------------------- street furniture
export const STREETLAMPS: Place[] = [...Array.from({ length: 16 }, (_, i) => ({ p: [X0 + 12 + i * 20, PAV, FAR_Z + 2.9] as V3, ry: 0 })), ...Array.from({ length: 16 }, (_, i) => ({ p: [X0 + 22 + i * 20, PAV, ZC - 1.2] as V3, ry: Math.PI }))];
const pillarKit = () => once("lPillar", () => { const k = new Kit(), R = LM.red();
  k.lathe(R, [[0.001, 0], [0.3, 0], [0.3, 0.12], [0.26, 0.16], [0.26, 1.25], [0.29, 1.3], [0.29, 1.36], [0.2, 1.48], [0.06, 1.55], [0.001, 1.56]], [0, PAV, 0], 28, [0, 0, 0], { ink: 0.5 });
  k.box(LM.iron(), [0.22, 0.04, 0.06], [0, PAV + 1.1, 0.25], [0, 0, 0], { ink: false }); k.box(LM.frame(), [0.18, 0.12, 0.02], [0, PAV + 0.85, 0.262], [0, 0, 0], { ink: false });
  return k; });
export const PILLARS: V3[] = [[-6, 0, ZC - 1.0], [44, 0, FAR_Z + 1.2], [96, 0, ZC - 1.0]];

/** cut face of the ground (section), with the railway, the stations and four service pipes running back under the street */
export const STATION_X = { A: -34, B: 22 }, TUNNEL_X = [-4, 22] as const;
export const UNDER_Z = ZC - 0.55;                                        // tunnel axis (world z)
const sideChord = (R: number) => Math.sqrt(R * R - 0.55 * 0.55);
export const PIPES: { x: number; y: number; r: number }[] = [{ x: -52, y: -1.3, r: 0.32 }, { x: 12, y: -2.2, r: 0.55 }, { x: 30, y: -1.0, r: 0.18 }, { x: 100, y: -2.6, r: 0.75 }, { x: 108, y: -1.5, r: 0.3 }, { x: -96, y: -2.6, r: 0.6 }];
const faceHoles = (): Hole[] => { const st = sideChord(RS) - 0.12, tu = sideChord(R_TUN) - 0.08, out: Hole[] = [];
  for (const sx of [STATION_X.A, STATION_X.B]) out.push({ kind: "strip", x0: sx + 0.05, x1: sx + ST_L - 0.05, y0: RT - 0.12, y1: RT + SAX + st });
  out.push({ kind: "strip", x0: TUNNEL_X[0] + 0.05, x1: TUNNEL_X[1] - 0.05, y0: RT - 0.08, y1: RT + AXIS + tu });
  for (const sx of [STATION_X.A - 14, STATION_X.B + ST_L]) out.push({ kind: "strip", x0: sx + 0.05, x1: sx + 14 - 0.05, y0: RT - 0.08, y1: RT + AXIS + tu });   // stub tunnels beyond
  for (const p of PIPES) out.push({ kind: "circle", x: p.x, y: p.y, r: p.r }); return out; };
const pipeKit = () => once("lPipes", () => { const k = new Kit(), m = new THREE.MeshStandardMaterial({ color: "#2a2622", roughness: 0.9, side: THREE.BackSide }), w = pm("brickR", 0.8, { tint: "#8a6a5a", side: THREE.BackSide });
  for (const [i, p] of PIPES.entries()) { const g = new THREE.CylinderGeometry(p.r, p.r, 6, 24, 1, true); g.rotateX(Math.PI / 2); k.add(i % 2 ? m : w, g, [p.x, p.y, ZC - 3], [0, 0, 0], [1, 1, 1], { ink: false, cast: false });
    k.add(LM.iron(), new THREE.CircleGeometry(p.r, 24), [p.x, p.y, ZC - 5.9], [0, 0, 0], [1, 1, 1], { ink: false, cast: false }); }
  return k; });

/** everything above ground + the cut face (static). `city` = also the far rows/skyline (aerial and high shots) */
export const London: React.FC<{ city: boolean; section?: boolean }> = ({ city, section = true }) => {
  const kits = useMemo(() => [rowKit(), sortingKit(), streetKit(), earthFaceKit(X0, X1, -0.33, -24, faceHoles()), pipeKit(), ...PILLARS.map(() => pillarKit())], []);
  return <>
    {kits.slice(0, 5).map((k, i) => (i === 3 || i === 4) && !section ? null : <KitMesh key={i} kit={k} />)}   {/* cut face only exists while the section is on */}
    {PILLARS.map((p, i) => <group key={i} position={p}><KitMesh kit={kits[5 + i]} /></group>)}
    {city && <><KitMesh kit={cityKit()} /><KitMesh kit={treesKit()} /></>}
    <Instances name="streetlamp" items={STREETLAMPS} shadows={false} />
  </>;
};
export { SAX };
