// joralemon SUBWAY (today, scene 13): a real, enclosed underground the camera flies through - no cutaway diagram.
//   No. 58's basement opening -> concrete shaft with the emergency stair -> adit (damper panel, a maintenance worker)
//   -> emergency-exit doorway in a concrete headwall -> the Joralemon Street Tunnel: a long cast-iron tube (flanged,
//   bolted rings, grime/rust/efflorescence), concrete invert, benchwall walkway with handrail, block ties + tie plates,
//   running rails, third rail on insulators under its cover board, cable trays + conduit runs on brackets, caged
//   lamps, block signals (aspect changes when the train passes), a blue-light alarm box, a louvred vent opening.
//   The train: five original stainless cars in the spirit of today's IRT (A-division) stock - cab, headlights,
//   marker lights, destination sign (dot pattern, no text), three door pairs per side, lit interior (seats,
//   stanchions, grab bars, ad band, light strips), roof AC units, underframe boxes, bogies with wheelsets + shoe beams,
//   and passengers (individual poses / faces).
// Coordinates: world (No. 58 at x = 0). Everything static is merged into a few kits (built once).
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { pbr } from "../short3/tex";
import { V3, rng, smooth } from "../../lib/math";
import { TUN, AREA_Y, UWALK, RAIL_Y, SH, ADIT, DOOR, GAPX, trainNowHead } from "./world";

const R = TUN.r, ZT = TUN.z, YT = TUN.y, RING = 0.61, X0 = -86, X1 = 64;
const deg = (d: number) => (d * Math.PI) / 180;
const std = (color: string, rough = 0.7, metal = 0, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const glowMat = (c: [number, number, number]) => new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), toneMapped: false });
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed: number, srgb = true) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };

/** grimy cast-iron lining: dark paint, rust blooms, water streaks + white efflorescence running down from joints */
const liningTex = () => canvasTex(1024, 256, (g, r) => {
  g.fillStyle = "#4b4844"; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 9000; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(20,18,16,${0.05 + r() * 0.08})` : `rgba(140,128,110,${0.04 + r() * 0.06})`; g.fillRect(r() * 1024, r() * 256, 1 + r() * 4, 1 + r() * 3); }
  for (let i = 0; i < 26; i++) { const x = r() * 1024, y = r() * 256, s = 8 + r() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(${110 + r() * 40},${55 + r() * 20},${25},${0.35 + r() * 0.3})`); gr.addColorStop(1, "rgba(90,50,25,0)"); g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2); }
  // streaks run along the circumference (u), i.e. down the wall from the crown
  for (let i = 0; i < 40; i++) { const y = r() * 256, x0 = r() * 1024, L = 60 + r() * 260, wh = r() < 0.35; const gr = g.createLinearGradient(x0, 0, x0 + L, 0);
    gr.addColorStop(0, wh ? "rgba(225,222,210,0.28)" : "rgba(18,16,14,0.32)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x0, y, L, 2 + r() * 7); }
}, 41);
const grimeTex = (base: string, seed: number) => canvasTex(512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7000; i++) { g.fillStyle = r() < 0.6 ? `rgba(15,13,12,${0.04 + r() * 0.08})` : `rgba(230,225,215,${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 5, 1 + r() * 3); }
  for (let i = 0; i < 14; i++) { const x = r() * 512, w = 6 + r() * 30; const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "rgba(20,18,15,0.35)"); gr.addColorStop(1, "rgba(20,18,15,0)"); g.fillStyle = gr; g.fillRect(x, 0, w, 300 + r() * 212); }
}, seed);

const SM = () => once("subMats", () => {
  const lin = liningTex();
  return {
    lining: std("#ffffff", 0.72, 0.35, { map: lin, side: THREE.DoubleSide }),
    flange: std("#3c3a37", 0.6, 0.5), bolt: std("#2a2826", 0.5, 0.6),
    invert: pbr("concrete_pavement", { color: "#7a756e", scale: 0.8, normal: 0.9 }),
    bench: pbr("concrete_pavement", { color: "#9b958b", scale: 0.6, normal: 0.8 }),
    wallConc: pbr("concrete_pavement", { color: "#a49d92", scale: 1.3, normal: 0.7 }), grate: std("#5e5d5a", 0.72, 0.3),
    wet: new THREE.MeshPhysicalMaterial({ color: "#1d1c1a", roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4 }),
    railHead: std("#c9c6c0", 0.25, 0.95), railWeb: std("#5d4636", 0.8, 0.5), tie: pbr("dark_wood", { color: "#6a5240", scale: 0.6 }), plate: std("#34302d", 0.55, 0.7),
    third: std("#77706a", 0.45, 0.8), cover: pbr("old_planks_02", { color: "#9a8a6a", scale: 0.5 }), porcelain: std("#d9d2c0", 0.3, 0.05),
    tray: std("#9aa1a4", 0.45, 0.8), conduit: std("#7d8387", 0.5, 0.7), cable: std("#151517", 0.75), rust: pbr("rusty_metal_02", { color: "#c9b8a8", scale: 0.6 }), ballastB: pbr("gravel_road", { color: "#8a8378", scale: 0.5, normal: 1.0 }),
    shade: std("#2f4a3c", 0.5, 0.3), bulb: glowMat([2.8, 2.3, 1.5]), cage: std("#1d1d1f", 0.5, 0.6),
    sigBox: std("#121214", 0.5, 0.4), red: glowMat([3.2, 0.25, 0.15]), green: glowMat([0.25, 2.8, 1.2]), amber: glowMat([3.0, 1.6, 0.2]), lensOff: std("#1a1a1a", 0.2, 0.1),
    blue: glowMat([0.4, 0.9, 3.2]), doorGreen: std("#2f5546", 0.45, 0.45), wired: new THREE.MeshPhysicalMaterial({ color: "#8fa3a8", roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55 }),
    yellow: std("#e0b020", 0.5, 0.1), handrail: std("#d9a51e", 0.45, 0.3), extRed: std("#b3241c", 0.35, 0.2), panel: std("#7d8a80", 0.5, 0.35), black: std("#18181a", 0.6, 0.3),
    exitSign: new THREE.MeshBasicMaterial({ map: canvasTex(256, 96, (g) => { g.fillStyle = "#1a0606"; g.fillRect(0, 0, 256, 96); g.fillStyle = "#ff3a28"; g.font = "bold 70px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("EXIT", 128, 52); }, 1), toneMapped: false }),
    louvre: std("#3b4144", 0.5, 0.6), galv: std("#9aa1a4", 0.4, 0.75), back: std("#0c0c0d", 1),
  };
});
export type SubM = ReturnType<typeof SM>;

// ---------------------------------------------------------------- tunnel lining rings
/** one ring: lathe profile (skin + flanges at both edges) over theta in [t0, t1] (theta: z = R cos, y = R sin) */
const ringGeo = (t0: number, t1: number, seg: number) => {
  const h = RING / 2, pts: [number, number][] = [[R + 0.03, -h], [R - 0.14, -h], [R - 0.14, -h + 0.028], [R - 0.03, -h + 0.04], [R - 0.005, -h + 0.075], [R - 0.005, h - 0.075], [R - 0.03, h - 0.04], [R - 0.14, h - 0.028], [R - 0.14, h], [R + 0.03, h]];
  const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg, -t1, t1 - t0); return g; };
const shiftU = (g: THREE.BufferGeometry, du: number) => { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) + du); uv.needsUpdate = true; return g; };
const GAP_T: [number, number] = [deg(141), deg(203)];   // the headwall opening (near side, walkway level)
const HIDDEN: [number, number] = [deg(236), deg(304)];   // under the invert concrete: no flange detail needed
const inRange = (t: number, [a, b]: [number, number]) => { const u = ((t % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return u >= a && u <= b; };
const liningKit = () => once("subLining", () => { const M = SM(), k = new Kit(), r = rng(77);
  const full = ringGeo(0, Math.PI * 2, 72), gap = ringGeo(GAP_T[1], GAP_T[0] + Math.PI * 2, 60);
  const flG = new THREE.BoxGeometry(RING - 0.06, 0.13, 0.028), boltG = new THREE.BoxGeometry(0.05, 0.035, 0.05), boltR = new THREE.BoxGeometry(0.035, 0.05, 0.05);
  for (let x = X0; x < X1; x += RING) { const cx = x + RING / 2, isGap = Math.abs(cx) < GAPX, near = cx > -48 && cx < 30;
    k.add(M.lining, shiftU((isGap ? gap : full).clone(), r()), [cx, YT, ZT], [0, 0, -Math.PI / 2], [1, 1, 1], { ink: false, cast: false });
    if (!near) continue;
    for (let s = 0; s < 16; s++) { const t = (s / 16) * Math.PI * 2 + deg(11.25); if (inRange(t, HIDDEN) || (isGap && inRange(t, [GAP_T[0] - 0.05, GAP_T[1] + 0.05]))) continue;
      const rr = R - 0.07; k.add(M.flange, flG, [cx, YT + Math.sin(t) * rr, ZT + Math.cos(t) * rr], [Math.PI / 2 - t, 0, 0], [1, 1, 1], { ink: false, cast: false });
      for (const dx of [-0.17, 0.17]) k.add(M.bolt, boltR, [cx + dx, YT + Math.sin(t) * (R - 0.1), ZT + Math.cos(t) * (R - 0.1)], [Math.PI / 2 - t, 0, 0], [1, 1, 1], { ink: false, cast: false }); }
    for (let b = 0; b < 32; b++) { const t = (b / 32) * Math.PI * 2; if (inRange(t, HIDDEN) || (isGap && inRange(t, [GAP_T[0] - 0.05, GAP_T[1] + 0.05]))) continue;
      for (const s of [-1, 1]) k.add(M.bolt, boltG, [cx + s * (RING / 2 - 0.045), YT + Math.sin(t) * (R - 0.09), ZT + Math.cos(t) * (R - 0.09)], [Math.PI / 2 - t, 0, 0], [1, 1, 1], { ink: false, cast: false }); } }
  return k; });

// ---------------------------------------------------------------- invert, benchwalls, track, services
const yr = (v: number) => YT + v;                  // tunnel-relative height -> world
const BED = -2.62, BENCH = UWALK - YT, BENCH_EDGE = -1.9, LEDGE = -2.2, LEDGE_EDGE = 2.1, GAUGE = 0.7175;
const extrudeX = (pts: [number, number][], x0: number, x1: number) => { // (z, y) profile -> along +x
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y))), { depth: x1 - x0, bevelEnabled: false, curveSegments: 4 });
  g.rotateY(Math.PI / 2); g.translate(x0, 0, 0); return g; };
const railProfile: [number, number][] = [[-0.07, 0], [0.07, 0], [0.07, 0.014], [0.012, 0.03], [0.009, 0.135], [0.036, 0.142], [0.036, 0.18], [-0.036, 0.18], [-0.036, 0.142], [-0.009, 0.135], [-0.012, 0.03], [-0.07, 0.014]];
const trackKit = () => once("subTrack", () => { const M = SM(), k = new Kit(), r = rng(12);
  // invert fill (track bed), near benchwall (walkway), far ledge; world UVs come from the extrusion (metres)
  k.add(M.invert, extrudeX([[-R - 0.3, BED], [R + 0.3, BED], [R + 0.3, -R - 0.5], [-R - 0.3, -R - 0.5]], X0, X1), [0, YT, ZT], [0, 0, 0], [1, 1, 1], { ink: false, cast: false });
  k.add(M.bench, extrudeX([[-R - 0.4, BENCH], [BENCH_EDGE, BENCH], [BENCH_EDGE, BED], [-R - 0.4, BED]], X0, X1), [0, YT, ZT], [0, 0, 0], [1, 1, 1], { ink: 0.35, cast: false });
  k.add(M.bench, extrudeX([[LEDGE_EDGE, LEDGE], [R + 0.4, LEDGE], [R + 0.4, BED], [LEDGE_EDGE, BED]], X0, X1), [0, YT, ZT], [0, 0, 0], [1, 1, 1], { ink: 0.35, cast: false });
  // wet channel between the rails (catches lamp light), oil/dirt strip
  k.span(M.wet, [X0, yr(BED), ZT - 0.35], [X1, yr(BED) + 0.006, ZT + 0.35], { ink: false, cast: false });
  // block ties (pairs, set in the concrete) + tie plates + clips; long ties carry the third-rail insulators
  for (let x = X0 + 0.3; x < X1; x += 0.62) { const jit = (r() - 0.5) * 0.03;
    for (const s of [-1, 1]) { k.span(M.tie, [x - 0.12 + jit, yr(BED) - 0.02, ZT + s * GAUGE - 0.38], [x + 0.12 + jit, yr(BED) + 0.06, ZT + s * GAUGE + 0.38], { ink: false, cast: false });
      k.span(M.plate, [x - 0.1 + jit, yr(BED) + 0.06, ZT + s * GAUGE - 0.17], [x + 0.1 + jit, yr(BED) + 0.08, ZT + s * GAUGE + 0.17], { ink: false, cast: false });
      for (const o of [-0.1, 0.1]) k.span(M.plate, [x - 0.03 + jit, yr(BED) + 0.08, ZT + s * GAUGE + o - 0.02], [x + 0.03 + jit, yr(BED) + 0.105, ZT + s * GAUGE + o + 0.02], { ink: false, cast: false }); } }
  // running rails (real profile) - head polished, web/foot rusty
  const ry0 = RAIL_Y - 0.18;
  for (const s of [-1, 1]) { const zc = ZT + s * GAUGE;
    k.add(M.railWeb, extrudeX(railProfile.map(([z, y]) => [z, y]), X0, X1), [0, ry0, zc], [0, 0, 0], [1, 1, 1], { ink: false, cast: false });
    k.span(M.railHead, [X0, RAIL_Y - 0.004, zc - 0.034], [X1, RAIL_Y + 0.001, zc + 0.034], { ink: false, cast: false }); }
  // third rail (far side) on porcelain insulators, wooden cover board on brackets
  const z3 = ZT + 1.5, y3 = RAIL_Y + 0.06;
  k.span(M.third, [X0, y3 - 0.1, z3 - 0.04], [X1, y3, z3 + 0.04], { ink: 0.3, cast: false });
  k.span(M.cover, [X0, y3 + 0.16, z3 - 0.12], [X1, y3 + 0.19, z3 + 0.2], { ink: 0.3, cast: false });
  for (let x = X0 + 1; x < X1; x += 3.1) { k.cyl(M.porcelain, 0.07, 0.09, 0.16, [x, y3 - 0.18, z3], [0, 0, 0], 12, { ink: false, cast: false }); k.span(M.tie, [x - 0.13, yr(BED) - 0.02, ZT - 0.9], [x + 0.13, yr(BED) + 0.05, z3 + 0.4], { ink: false, cast: false });
    k.span(M.plate, [x - 0.02, y3 + 0.0, z3 + 0.16], [x + 0.02, y3 + 0.16, z3 + 0.2], { ink: false, cast: false }); }
  // services. Near wall (walkway side): handrail on standoffs, cable tray with cables, blue-light box. Far wall: conduit
  // bundle + low cables on hooks.
  const wz = (y: number, s: number) => ZT + s * Math.sqrt(R * R - y * y);           // lining surface z at relative height y
  const hrY = BENCH + 1.0, hrZ = wz(hrY, -1) + 0.12;
  k.cyl(M.handrail, 0.022, 0.022, X1 - X0, [(X0 + X1) / 2, yr(hrY), hrZ], [0, 0, Math.PI / 2], 8, { ink: 0.3, cast: false });
  for (let x = X0; x < X1; x += 1.83) if (Math.abs(x) > GAPX + 0.2) k.span(M.handrail, [x - 0.015, yr(hrY) - 0.015, wz(hrY, -1) - 0.02], [x + 0.015, yr(hrY) + 0.015, hrZ], { ink: false, cast: false });
  const tY = 1.15, tZ0 = wz(tY, -1) + 0.06;
  for (const [a, b] of [[X0, -GAPX - 0.3], [GAPX + 0.3, X1]]) {
    k.span(M.tray, [a, yr(tY), tZ0], [b, yr(tY) + 0.012, tZ0 + 0.34], { ink: false, cast: false }); k.span(M.tray, [a, yr(tY), tZ0 + 0.33], [b, yr(tY) + 0.1, tZ0 + 0.345], { ink: 0.25, cast: false });
    for (let c = 0; c < 6; c++) k.cyl(M.cable, 0.022 + (c % 3) * 0.006, 0.022 + (c % 3) * 0.006, b - a, [(a + b) / 2, yr(tY) + 0.035 + (c % 2) * 0.035, tZ0 + 0.05 + c * 0.045], [0, 0, Math.PI / 2], 6, { ink: false, cast: false }); }
  for (let x = X0; x < X1; x += 1.22) if (Math.abs(x) > GAPX + 0.3) k.span(M.tray, [x - 0.02, yr(tY) - 0.06, wz(tY, -1) - 0.05], [x + 0.02, yr(tY), tZ0 + 0.36], { ink: false, cast: false });
  const cY = 0.15, cZ = wz(cY, 1) - 0.1;
  for (let c = 0; c < 5; c++) k.cyl(c === 2 ? M.rust : M.conduit, 0.04, 0.04, X1 - X0, [(X0 + X1) / 2, yr(cY + c * 0.1), cZ - (c % 2) * 0.02], [0, 0, Math.PI / 2], 8, { ink: false, cast: false });
  for (let x = X0; x < X1; x += 2.44) k.span(M.conduit, [x - 0.025, yr(cY - 0.08), cZ - 0.07], [x + 0.025, yr(cY + 0.48), wz(cY, 1) + 0.02], { ink: false, cast: false });
  for (let c = 0; c < 3; c++) k.cyl(M.cable, 0.028, 0.028, X1 - X0, [(X0 + X1) / 2, yr(-1.05 - c * 0.07), wz(-1.05, 1) - 0.08], [0, 0, Math.PI / 2], 6, { ink: false, cast: false });
  // blue-light alarm/phone box on the near wall
  { const x = -9.2, y = yr(0.35), z = wz(0.35, -1) + 0.15; k.span(M.black, [x - 0.2, y - 0.3, z - 0.1], [x + 0.2, y + 0.25, z + 0.06]); k.sphere(M.blue, 0.07, [x, y + 0.36, z], [1, 1.3, 1], { ink: false }); }
  return k; });
/** lamps: caged bulbs with green enamel shades on both walls, staggered */
export const LAMPS_T: { x: number; s: 1 | -1 }[] = (() => { const a: { x: number; s: 1 | -1 }[] = []; for (let x = X0 + 2; x < X1; x += 7.32) { a.push({ x, s: -1 }); a.push({ x: x + 3.66, s: 1 }); } return a; })();
const LAMP_Y = 1.75;
export const lampPos = (l: { x: number; s: 1 | -1 }): V3 => [l.x, yr(LAMP_Y) - 0.18, ZT + l.s * (Math.sqrt(R * R - LAMP_Y * LAMP_Y) - 0.32)];
const lampKit = () => once("subLamps", () => { const M = SM(), k = new Kit();
  for (const l of LAMPS_T) { if (Math.abs(l.x) < GAPX + 0.5 && l.s < 0) continue; const [x, y, z] = lampPos(l), wzv = ZT + l.s * Math.sqrt(R * R - LAMP_Y * LAMP_Y);
    k.span(M.cage, [x - 0.02, y + 0.16, Math.min(z, wzv) - 0.01], [x + 0.02, y + 0.2, Math.max(z, wzv) + 0.01], { ink: false, cast: false });
    k.cyl(M.shade, 0.16, 0.06, 0.1, [x, y + 0.12, z], [0, 0, 0], 14, { ink: false, cast: false }); k.sphere(M.bulb, 0.05, [x, y + 0.03, z], [1, 1.25, 1], { ink: false, cast: false });
    for (let a = 0; a < 4; a++) k.rod(M.cage, [x + Math.cos(a * 1.57) * 0.08, y + 0.1, z + Math.sin(a * 1.57) * 0.08], [x + Math.cos(a * 1.57) * 0.06, y - 0.06, z + Math.sin(a * 1.57) * 0.06], 0.005, 4, { ink: false, cast: false }); }
  return k; });
/** block signals on the far wall: [x]; red once the train head has passed (and stays red behind it) */
export const SIGNALS = [-26, 16];
const signalHead = (k: Kit, M: SubM, x: number) => { const y = yr(-0.55), z = ZT + Math.sqrt(R * R - 0.3) - 0.28;
  k.span(M.sigBox, [x - 0.14, y - 0.42, z - 0.12], [x + 0.14, y + 0.42, z + 0.12]); k.span(M.sigBox, [x - 0.03, y - 0.55, z + 0.05], [x + 0.03, y - 0.42, z + 0.3]);
  for (const dy of [0.26, 0, -0.26]) k.span(M.sigBox, [x - 0.2, y + dy + 0.09, z - 0.12], [x - 0.13, y + dy + 0.11, z + 0.12], { ink: false }); };
const sigKit = () => once("subSig", () => { const M = SM(), k = new Kit(); for (const x of SIGNALS) signalHead(k, M, x); return k; });
const SigLenses: React.FC<{ f: number }> = ({ f }) => { const M = SM(), head = trainNowHead(f);
  return <>{SIGNALS.map((x) => { const red = head > x + 2, y = yr(-0.55), z = ZT + Math.sqrt(R * R - 0.3) - 0.28;
    return <group key={x}>{([[0.26, red ? M.red : M.lensOff], [0, M.lensOff], [-0.26, red ? M.lensOff : M.green]] as [number, THREE.Material][]).map(([dy, m], i) =>
      <mesh key={i} material={m} position={[x - 0.145, y + dy, z]}><sphereGeometry args={[0.065, 14, 10]} /></mesh>)}</group>; })}</>; };

// ---------------------------------------------------------------- shaft + adit + headwall (the emergency exit)
const shaftKit = () => once("subShaft", () => { const M = SM(), k = new Kit(), T = 0.3, yTop = AREA_Y - 0.02, o = { cast: false } as const;
  const { x: sx, z0, z1, yb } = SH;
  // shaft walls (concrete), floor
  k.span(M.wallConc, [-sx - T, yb - T, z0 - T], [sx + T, yTop, z0], { ink: false, ...o });
  for (const s of [-1, 1]) k.span(M.wallConc, [s > 0 ? sx : -sx - T, yb - T, z0 - T], [s > 0 ? sx + T : -sx, yTop, z1 + T], { ink: false, ...o });
  k.span(M.wallConc, [-sx, ADIT.y1, z1], [sx, yTop, z1 + T], { ink: false, ...o });
  for (const s of [-1, 1]) k.span(M.wallConc, [s > 0 ? ADIT.x : -sx, yb, z1], [s > 0 ? sx : -ADIT.x, ADIT.y1, z1 + T], { ink: false, ...o });
  k.span(M.bench, [-sx, yb - T, z0], [sx, yb, z1], { ink: false, ...o });
  for (let y = yb + 2.4; y < yTop; y += 2.4) for (const s of [-1, 1]) k.span(M.wallConc, [s > 0 ? sx - 0.06 : -sx, y, z0], [s > 0 ? sx : -sx + 0.06, y + 0.14, z1], { ink: 0.3, ...o });   // form-joint bands
  // zig-zag emergency stair against the back wall (flights alternate direction), landings, yellow handrails
  const n = 8, rise = (yTop - yb) / n;
  for (let i = 0; i < n; i++) { const ya = yTop - i * rise, yb2 = ya - rise, dir = i % 2 ? 1 : -1, xa = dir > 0 ? -sx + 1.0 : sx - 1.0, xb = xa + dir * 2.4 * 0.86;
    for (const z of [z0 + 0.08, z0 + 1.08]) k.rod(M.panel, [xa, ya - 0.05, z], [xb, yb2 - 0.05, z], 0.05, 6, o);
    const st = 13; for (let s = 1; s < st; s++) { const t = s / st; k.span(M.grate, [xa + (xb - xa) * t - 0.1, ya + (yb2 - ya) * t - 0.025, z0 + 0.1], [xa + (xb - xa) * t + 0.1, ya + (yb2 - ya) * t, z0 + 1.06], { ink: false, ...o }); }
    k.rod(M.handrail, [xa, ya + 0.95, z0 + 1.12], [xb, yb2 + 0.95, z0 + 1.12], 0.022, 6, o);
    const lx = dir > 0 ? sx - 0.5 : -sx + 0.5; k.span(M.grate, [lx - 0.5, yb2 - 0.04, z0], [lx + 0.5, yb2, z0 + 1.2], { ink: 0.3, ...o }); for (let gx = -0.45; gx < 0.5; gx += 0.1) k.span(M.black, [lx + gx - 0.008, yb2 - 0.045, z0 + 0.02], [lx + gx + 0.008, yb2 + 0.002, z0 + 1.18], { ink: false, ...o }); k.rod(M.handrail, [lx - 0.5, yb2 + 1.0, z0 + 1.2], [lx + 0.5, yb2 + 1.0, z0 + 1.2], 0.022, 6, o);
    k.sphere(M.bulb, 0.06, [lx, yb2 + 2.15, z0 + 0.14], [1, 1.2, 1], { ink: false, ...o }); k.cyl(M.shade, 0.14, 0.05, 0.1, [lx, yb2 + 2.24, z0 + 0.14], [0, 0, 0], 12, { ink: false, ...o }); }
  // services up the front-left corner: cables + a red standpipe
  for (let c = 0; c < 4; c++) k.cyl(M.cable, 0.03, 0.03, yTop - yb, [-sx + 0.1 + c * 0.08, (yTop + yb) / 2, z1 - 0.1], [0, 0, 0], 6, { ink: false, ...o });
  k.cyl(M.extRed, 0.06, 0.06, yTop - yb, [sx - 0.15, (yTop + yb) / 2, z1 - 0.15], [0, 0, 0], 10, { ink: 0.3, ...o });
  // adit: walls, ceiling, floor up to the headwall; cable tray; damper control panel; extinguisher; lamps
  for (const s of [-1, 1]) k.span(M.wallConc, [s > 0 ? ADIT.x : -ADIT.x - T, ADIT.y0 - T, z1], [s > 0 ? ADIT.x + T : -ADIT.x, ADIT.y1 + T, ADIT.zW + 0.25], { ink: false, ...o });
  k.span(M.wallConc, [-ADIT.x - T, ADIT.y1, z1], [ADIT.x + T, ADIT.y1 + T, ADIT.zW], { ink: false, ...o });
  k.span(M.bench, [-ADIT.x, ADIT.y0 - T, z1], [ADIT.x, ADIT.y0, ADIT.zW + 0.4], { ink: false, ...o });
  k.span(M.yellow, [-ADIT.x + 0.05, ADIT.y0 + 0.002, ADIT.zW - 0.25], [ADIT.x - 0.05, ADIT.y0 + 0.006, ADIT.zW - 0.12], { ink: false, ...o });
  k.span(M.tray, [ADIT.x - 0.36, ADIT.y1 - 0.4, z1], [ADIT.x - 0.02, ADIT.y1 - 0.38, ADIT.zW], { ink: false, ...o });
  for (let c = 0; c < 4; c++) k.cyl(M.cable, 0.022, 0.022, ADIT.zW - z1, [ADIT.x - 0.3 + c * 0.07, ADIT.y1 - 0.35, (ADIT.zW + z1) / 2], [Math.PI / 2, 0, 0], 6, { ink: false, ...o });
  k.span(M.panel, [-ADIT.x, ADIT.y0 + 0.5, 1.5], [-ADIT.x + 0.32, ADIT.y0 + 2.2, 2.6], { ink: 0.5, ...o });
  for (let i = 0; i < 3; i++) { k.sphere(i === 0 ? M.green : M.amber, 0.025, [-ADIT.x + 0.37, ADIT.y0 + 2.05, 1.65 + i * 0.35], [1, 1, 1], { ink: false, ...o }); }
  for (let i = 0; i < 2; i++) { const zc = 1.8 + i * 0.5, yc = ADIT.y0 + 1.55; k.cyl(M.black, 0.11, 0.11, 0.04, [-ADIT.x + 0.34, yc, zc], [0, 0, Math.PI / 2], 18, { ink: 0.3, ...o }); k.cyl(M.porcelain, 0.09, 0.09, 0.02, [-ADIT.x + 0.36, yc, zc], [0, 0, Math.PI / 2], 18, { ink: false, ...o });
    k.span(M.black, [-ADIT.x + 0.37, yc - 0.005, zc - 0.005], [-ADIT.x + 0.375, yc + 0.07, zc + 0.005], { ink: false, ...o }); }
  for (let i = 0; i < 4; i++) k.span(i % 2 ? M.extRed : M.black, [-ADIT.x + 0.32, ADIT.y0 + 1.0, 1.7 + i * 0.22], [-ADIT.x + 0.38, ADIT.y0 + 1.18, 1.8 + i * 0.22], { ink: 0.2, ...o });
  k.span(M.porcelain, [-ADIT.x + 0.321, ADIT.y0 + 0.65, 1.65], [-ADIT.x + 0.325, ADIT.y0 + 0.9, 2.45], { ink: false, ...o });
  k.cyl(M.extRed, 0.08, 0.08, 0.5, [ADIT.x - 0.15, ADIT.y0 + 0.35, 0.9], [0, 0, 0], 12, { ink: 0.4, ...o });
  for (const z of [0.6, 2.2]) { k.sphere(M.bulb, 0.06, [0, ADIT.y1 - 0.2, z], [1, 1.2, 1], { ink: false, ...o }); k.cyl(M.shade, 0.15, 0.06, 0.1, [0, ADIT.y1 - 0.1, z], [0, 0, 0], 12, { ink: false, ...o }); }
  // headwall in the opened rings: left/right of the doorway, louvre opening on the right, lintel slabs, return walls
  const zW = ADIT.zW, hw = (a: V3, b: V3) => k.span(M.wallConc, a, b, { ink: 0.4, ...o });
  hw([-GAPX, UWALK - 0.5, zW - 0.2], [-DOOR.x, ADIT.y1 + 0.35, zW]); hw([-DOOR.x, DOOR.y1, zW - 0.2], [DOOR.x, ADIT.y1 + 0.35, zW]);
  hw([DOOR.x, UWALK - 0.5, zW - 0.2], [1.7, ADIT.y1 + 0.35, zW]); hw([3.9, UWALK - 0.5, zW - 0.2], [GAPX, ADIT.y1 + 0.35, zW]);
  hw([1.7, UWALK - 0.5, zW - 0.2], [3.9, UWALK + 0.9, zW]); hw([1.7, ADIT.y1 - 0.25, zW - 0.2], [3.9, ADIT.y1 + 0.35, zW]);
  k.span(M.back, [1.7, UWALK + 0.9, zW - 0.6], [3.9, ADIT.y1 - 0.25, zW - 0.55], { ink: false, ...o });
  for (const s of [-1, 1]) k.span(M.wallConc, [s > 0 ? 3.9 : 1.6, UWALK + 0.9, zW - 0.6], [s > 0 ? 4.0 : 1.7, ADIT.y1 - 0.25, zW], { ink: false, ...o });
  for (let y = UWALK + 1.05; y < ADIT.y1 - 0.3; y += 0.16) k.add(M.louvre, new THREE.BoxGeometry(2.2, 0.15, 0.012), [2.8, y, zW - 0.08], [-0.75, 0, 0], [1, 1, 1], { ink: false, ...o });
  k.span(M.louvre, [1.7, UWALK + 0.9, zW - 0.05], [3.9, UWALK + 0.98, zW + 0.02], { ink: 0.3, ...o }); k.span(M.louvre, [1.7, ADIT.y1 - 0.33, zW - 0.05], [3.9, ADIT.y1 - 0.25, zW + 0.02], { ink: 0.3, ...o });
  k.span(M.wallConc, [-GAPX, ADIT.y1 + 0.05, zW - 0.2], [GAPX, ADIT.y1 + 0.35, ZT - R * Math.cos(GAP_T[0] - Math.PI) + 0.25], { ink: false, ...o });
  for (const s of [-1, 1]) k.span(M.wallConc, [s * GAPX - 0.03, UWALK, zW - 0.2], [s * GAPX + 0.03, ADIT.y1 + 0.35, 3.04], { ink: false, ...o });
  k.span(M.bench, [-GAPX, UWALK - 0.5, zW - 0.2], [GAPX, UWALK, ZT + BENCH_EDGE], { ink: false, ...o });
  // the doorway: steel frame, both leaves swung open into the adit (egress direction), wired-glass vision panels, push bars
  k.span(M.doorGreen, [-DOOR.x - 0.08, UWALK, zW - 0.22], [-DOOR.x, DOOR.y1 + 0.08, zW + 0.03], o); k.span(M.doorGreen, [DOOR.x, UWALK, zW - 0.22], [DOOR.x + 0.08, DOOR.y1 + 0.08, zW + 0.03], o);
  k.span(M.doorGreen, [-DOOR.x - 0.08, DOOR.y1, zW - 0.22], [DOOR.x + 0.08, DOOR.y1 + 0.08, zW + 0.03], o);
  // sliding fire door, pulled open: the leaf rests behind the right-hand headwall pier (edge + vision panel visible), track above
  k.span(M.doorGreen, [DOOR.x - 0.06, UWALK + 0.02, zW - 0.32], [DOOR.x + 1.3, DOOR.y1 - 0.02, zW - 0.24], { ink: 0.5, ...o });
  k.span(M.wired, [DOOR.x + 0.2, UWALK + 1.3, zW - 0.33], [DOOR.x + 0.6, UWALK + 1.85, zW - 0.325], { ink: false, ...o });
  k.span(M.yellow, [DOOR.x - 0.07, UWALK + 0.95, zW - 0.36], [DOOR.x - 0.02, UWALK + 1.1, zW - 0.2], { ink: false, ...o });
  k.span(M.galv, [-DOOR.x - 0.1, DOOR.y1 + 0.02, zW - 0.36], [DOOR.x + 1.4, DOOR.y1 + 0.1, zW - 0.22], { ink: 0.3, ...o });
  for (const z of [zW + 0.05, zW - 0.3]) k.span(M.exitSign, [-0.35, DOOR.y1 + 0.16, z - 0.03], [0.35, DOOR.y1 + 0.42, z + 0.03], { ink: false, ...o });
  return k; });

// ---------------------------------------------------------------- today's train (original design, IRT-size cars)
export const CAR = { L: 15.6, W: 2.69, PITCH: 16.0, N: 5 };
const DOORS_X = [-4.95, 0, 4.95], DW = 0.64;
const trainMats = () => once("trainMats", () => ({
  steel: std("#c4c8cc", 0.24, 0.92), steelD: std("#8c9196", 0.3, 0.9), black: std("#1a1b1d", 0.5, 0.3), rubber: std("#0e0e10", 0.85),
  glass: new THREE.MeshPhysicalMaterial({ color: "#8ea4ae", roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.32, envMapIntensity: 2.0, clearcoat: 1, depthWrite: false }),
  cabGlass: new THREE.MeshPhysicalMaterial({ color: "#1b2329", roughness: 0.04, metalness: 0.2, envMapIntensity: 2.2, clearcoat: 1 }),
  floor: std("#5d5f63", 0.8), seat: std("#5d7fa6", 0.45, 0.05), pole: std("#d8dadc", 0.18, 0.95), ceil: std("#e9e7e0", 0.6),
  strip: glowMat([2.2, 2.25, 2.1]), head: glowMat([3.2, 3.1, 2.7]), marker: glowMat([2.6, 2.3, 1.6]), tail: std("#4a0e0c", 0.3, 0.2),
  sign: new THREE.MeshBasicMaterial({ map: canvasTex(256, 64, (g, r) => { g.fillStyle = "#120802"; g.fillRect(0, 0, 256, 64); g.fillStyle = "#ffae2a"; for (let x = 10; x < 246; x += 6) for (let y = 12; y < 52; y += 6) if (r() < 0.42) g.fillRect(x, y, 4, 4); }, 9), toneMapped: false }),
  ads: [std("#c8452f", 0.6), std("#2f6fa8", 0.6), std("#e3b23a", 0.6), std("#3e8a5a", 0.6), std("#8a3a7a", 0.6)].map((m) => { m.emissive = m.color.clone(); m.emissiveIntensity = 0.35; return m; }),
  bogie: std("#2a2b2d", 0.6, 0.6), wheel: std("#6e6a66", 0.35, 0.9), shoe: std("#5a4632", 0.8), ac: std("#9aa0a4", 0.4, 0.8),
}));
const carKit = (cab: boolean) => once(`tnCar${cab}`, () => { const T = trainMats(), k = new Kit(), { L, W } = CAR, h = L / 2, w = W / 2;
  const yB = 0.98, yF = 1.13, yS = 1.95, yW = 2.78, yE = 3.06, yC = 3.62;
  const segs: [number, number][] = []; { let a = -h; for (const d of DOORS_X) { segs.push([a, d - DW]); a = d + DW; } segs.push([a, h]); }
  for (const s of [-1, 1]) { const z = s * w;
    for (const [a, b] of segs) {
      k.span(T.steel, [a, yB, z - 0.03], [b, yS, z + 0.03], { ink: 0.5 }); k.span(T.steel, [a, yW, z - 0.03], [b, yE, z + 0.03], { ink: 0.5 });
      for (let rb = 0; rb < 5; rb++) k.span(T.steelD, [a + 0.02, yB + 0.12 + rb * 0.16, z + s * 0.03], [b - 0.02, yB + 0.14 + rb * 0.16, z + s * 0.04], { ink: false });   // fluting
      const n = Math.max(1, Math.round((b - a) / 1.9)), pw = 0.16; // windows with pillars
      for (let i = 0; i <= n; i++) { const px = a + ((b - a) * i) / n; k.span(T.black, [Math.max(a, px - pw / 2), yS, z - 0.035], [Math.min(b, px + pw / 2), yW, z + 0.035], { ink: false }); }
      for (let i = 0; i < n; i++) { const x0 = a + ((b - a) * i) / n + pw / 2, x1 = a + ((b - a) * (i + 1)) / n - pw / 2; k.span(T.black, [x0, yS, z - 0.035], [x1, yS + 0.04, z + 0.035], { ink: false }); k.span(T.glass, [x0, yS + 0.04, z - 0.005], [x1, yW, z + 0.005], { ink: false, cast: false }); }
    }
    for (const d of DOORS_X) for (const lr of [-1, 1]) { const x0 = d + (lr < 0 ? -DW : 0), x1 = d + (lr < 0 ? 0 : DW);   // door leaves (closed): steel, window, rubber nosing
      k.span(T.steelD, [x0 + 0.01, yF, z - 0.02], [x1 - 0.01, yE - 0.02, z + 0.02], { ink: 0.4 }); k.span(T.glass, [x0 + 0.12, 2.05, z + s * 0.021], [x1 - 0.12, 2.75, z + s * 0.025], { ink: false, cast: false });
      k.span(T.rubber, [d - 0.015, yF, z - 0.025], [d + 0.015, yE - 0.02, z + 0.025], { ink: false }); }
    k.span(T.black, [-h, yB - 0.02, z - 0.02], [h, yB + 0.03, z + 0.02], { ink: false });
  }
  // roof (curved, extruded across), rain gutters, two AC units with grilles
  { const pts: [number, number][] = []; for (let i = 0; i <= 16; i++) { const t = i / 16, a = Math.PI * t; pts.push([-Math.cos(a) * w, yE + Math.sin(a) * (yC - yE)]); }
    const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y))); sh.lineTo(w, yE - 0.02); sh.lineTo(-w, yE - 0.02);
    const g = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false, curveSegments: 8 }); g.rotateY(Math.PI / 2); g.translate(-h, 0, 0); k.add(T.steel, g, [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: 0.6 }); }
  for (const s of [-1, 1]) k.span(T.steelD, [-h, yE - 0.02, s * w - 0.04], [h, yE + 0.04, s * w + 0.04], { ink: false });
  for (const ax of [-h + 2.6, h - 2.6]) { k.span(T.ac, [ax - 1.1, yC - 0.06, -0.85], [ax + 1.1, yC + 0.3, 0.85], { ink: 0.5 }); for (let gx = -0.9; gx < 1.0; gx += 0.12) k.span(T.black, [ax + gx - 0.02, yC + 0.3, -0.6], [ax + gx + 0.02, yC + 0.31, 0.6], { ink: false }); }
  // interior: floor, longitudinal seats, stanchions, grab bars, ceiling + light strips, ad band
  k.span(T.floor, [-h + 0.05, yF - 0.02, -w + 0.04], [h - 0.05, yF, w - 0.04], { ink: false, cast: false });
  k.span(T.ceil, [-h + 0.05, yE - 0.06, -w + 0.05], [h - 0.05, yE - 0.04, w - 0.05], { ink: false, cast: false });
  for (const s of [-1, 1]) { for (const [a, b] of segs) { if (b - a < 1) continue; k.span(T.seat, [a + 0.15, yF + 0.36, s * (w - 0.5)], [b - 0.15, yF + 0.46, s * (w - 0.06)], { ink: false, cast: false }); k.span(T.seat, [a + 0.15, yF + 0.46, s * (w - 0.14)], [b - 0.15, yS - 0.05, s * (w - 0.06)], { ink: false, cast: false });
      k.span(T.ads[Math.abs(Math.round(a * 3)) % 5], [a + 0.25, yW + 0.03, s * (w - 0.1)], [b - 0.25, yE - 0.1, s * (w - 0.08)], { ink: false, cast: false }); }
    k.cyl(T.pole, 0.018, 0.018, L - 1.0, [0, yW - 0.1, s * (w - 0.55)], [0, 0, Math.PI / 2], 8, { ink: false, cast: false });
    k.span(T.strip, [-h + 0.4, yE - 0.09, s * 0.55 - 0.08], [h - 0.4, yE - 0.06, s * 0.55 + 0.08], { ink: false, cast: false }); }
  for (const d of DOORS_X) for (const s of [-1, 1]) k.cyl(T.pole, 0.019, 0.019, yE - yF, [d + s * 0.95, (yE + yF) / 2, s * 0.35], [0, 0, 0], 8, { ink: false, cast: false });
  // underframe boxes, skirt, bogies (frames, wheelsets, springs, shoe beams), couplers
  for (const [a, b] of [[-h + 4.0, -1.4], [-1.0, 1.6], [2.0, h - 4.0]]) k.span(T.black, [a, 0.5, -1.0], [b, yB, 1.0], { ink: 0.4 });
  for (const bx of [-h + 2.5, h - 2.5]) { k.span(T.bogie, [bx - 1.25, 0.42, -1.12], [bx + 1.25, 0.72, -0.92], { ink: 0.4 }); k.span(T.bogie, [bx - 1.25, 0.42, 0.92], [bx + 1.25, 0.72, 1.12], { ink: 0.4 }); k.span(T.bogie, [bx - 0.3, 0.6, -1.0], [bx + 0.3, 0.85, 1.0], { ink: 0.3 });
    for (const wx of [-0.95, 0.95]) { k.cyl(T.bogie, 0.07, 0.07, 1.7, [bx + wx, 0.42, 0], [Math.PI / 2, 0, 0], 10, { ink: false }); for (const s of [-1, 1]) { k.cyl(T.wheel, 0.42, 0.42, 0.12, [bx + wx, 0.42, s * GAUGE], [Math.PI / 2, 0, 0], 24, { ink: 0.3 }); k.cyl(T.bogie, 0.3, 0.3, 0.13, [bx + wx, 0.42, s * GAUGE], [Math.PI / 2, 0, 0], 16, { ink: false }); }
      for (const s of [-1, 1]) k.cyl(T.steelD, 0.09, 0.09, 0.2, [bx + wx, 0.83, s * 1.02], [0, 0, 0], 10, { ink: false }); }
    for (const s of [-1, 1]) { k.span(T.shoe, [bx - 0.15, 0.2, s * 1.0], [bx + 0.15, 0.3, s * 1.42], { ink: false }); k.span(T.black, [bx - 0.18, 0.1, s * 1.42], [bx + 0.18, 0.14, s * 1.6], { ink: false }); } }
  for (const s of [-1, 1]) k.span(T.black, [s * h - (s > 0 ? 0 : 0.45), 0.72, -0.14], [s * h + (s > 0 ? 0.45 : 0), 0.95, 0.14], { ink: 0.3 });
  // ends: end wall with door + window; the cab end (+x on the lead car): windscreen, sign, head + marker lights, anticlimber
  for (const s of [-1, 1]) { const x = s * h, isCab = cab && s > 0;
    k.span(T.steel, [x - (s > 0 ? 0.04 : 0), yB, -w], [x + (s < 0 ? 0.04 : 0), yE, w], { ink: 0.6 });
    if (!isCab) { k.span(T.black, [x - 0.01, yF, -0.42], [x + 0.01, yE - 0.1, 0.42], { ink: false }); k.span(T.glass, [x + s * 0.012 - 0.003, 2.0, -0.28], [x + s * 0.012 + 0.003, 2.75, 0.28], { ink: false, cast: false });
      for (const zz of [-0.95, 0.95]) for (const yy of [1.35, 1.75]) k.cyl(T.steelD, 0.012, 0.012, 0.5, [x + s * 0.25, yy, zz], [0, 0, Math.PI / 2], 6, { ink: false }); continue; }
    k.span(T.cabGlass, [x + 0.04, 2.0, -w + 0.15], [x + 0.06, 2.85, -0.5], { ink: false }); k.span(T.cabGlass, [x + 0.04, 2.0, 0.5], [x + 0.06, 2.85, w - 0.15], { ink: false });
    k.span(T.black, [x + 0.04, yF + 0.1, -0.45], [x + 0.07, yE - 0.15, 0.45], { ink: 0.4 }); k.span(T.cabGlass, [x + 0.07, 2.05, -0.3], [x + 0.08, 2.75, 0.3], { ink: false });
    k.span(T.sign, [x + 0.06, 2.88, -0.55], [x + 0.08, 3.0, 0.55], { ink: false });
    for (const zz of [-0.85, 0.85]) { k.cyl(T.head, 0.11, 0.11, 0.04, [x + 0.07, 1.45, zz], [0, 0, Math.PI / 2], 18, { ink: false }); k.cyl(T.black, 0.15, 0.15, 0.03, [x + 0.055, 1.45, zz], [0, 0, Math.PI / 2], 18, { ink: false });
      k.cyl(T.marker, 0.06, 0.06, 0.03, [x + 0.07, 2.95, zz * 1.35], [0, 0, Math.PI / 2], 12, { ink: false }); k.cyl(T.tail, 0.05, 0.05, 0.03, [x + 0.07, 2.95, zz * 1.18], [0, 0, Math.PI / 2], 12, { ink: false }); }
    k.span(T.steelD, [x + 0.04, yB - 0.05, -w + 0.1], [x + 0.25, yB + 0.12, w - 0.1], { ink: 0.4 }); for (let r = 0; r < 4; r++) k.span(T.black, [x + 0.25, yB - 0.03 + r * 0.04, -w + 0.12], [x + 0.26, yB - 0.01 + r * 0.04, w - 0.12], { ink: false });
    for (const zz of [-1.1, 1.1]) k.cyl(T.steelD, 0.014, 0.014, 0.9, [x + 0.12, 2.3, zz], [0, 0, 0], 6, { ink: false }); }
  return k; });
/** car centres (x) for today's train with its head at `head` */
export const trainCars = (head: number) => Array.from({ length: CAR.N }, (_, i) => head - CAR.L / 2 - i * CAR.PITCH);
export const TrainNow: React.FC<{ f: number }> = ({ f }) => { const head = trainNowHead(f), T = trainMats();
  const flare = useMemo(() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!; const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,250,235,1)"); gr.addColorStop(0.18, "rgba(255,240,210,0.55)"); gr.addColorStop(1, "rgba(255,230,190,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; }, []);
  const spot = useMemo(() => { const s = new THREE.SpotLight("#fff2dc", 40, 70, 0.42, 0.55, 1.2); s.target.position.set(30, -0.6, 0); s.add(s.target); return s; }, []);
  if (head < X0 - 10 || head - CAR.N * CAR.PITCH > X1 + 10) return null;
  return (<group position={[0, RAIL_Y, ZT]}>
    {trainCars(head).map((cx, i) => <group key={i} position={[cx, 0, 0]}><KitMesh kit={carKit(i === 0)} />
      <pointLight position={[0, 2.4, 0]} color="#eef2ff" intensity={5} distance={8} decay={1.5} /></group>)}
    <group position={[head + 0.1, 1.45, 0]}><primitive object={spot} /></group>
    {[-0.85, 0.85].map((z) => <sprite key={z} position={[head + 0.2, 1.45, z]} scale={[1.6, 1.6, 1]}><spriteMaterial map={flare} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>)}
    <mesh visible={false} material={T.black} />
  </group>);
};

// ---------------------------------------------------------------- the whole underground (static) + its lights
export const SubwayStatic: React.FC<{ f: number }> = ({ f }) => {
  const near = LAMPS_T.filter((l) => l.x > -34 && l.x < 22 && !(Math.abs(l.x) < GAPX + 0.5 && l.s < 0));
  return (<group>
    <KitMesh kit={liningKit()} /><KitMesh kit={trackKit()} /><KitMesh kit={lampKit()} /><KitMesh kit={sigKit()} /><KitMesh kit={shaftKit()} />
    <SigLenses f={f} />
    {near.map((l, i) => { const p = lampPos(l); return <pointLight key={i} position={[p[0], p[1] - 0.15, p[2] - l.s * 0.2]} color="#ffd59a" intensity={5.5} distance={11} decay={1.5} />; })}
    {[[0, -3.0, -2.2], [0, -9.5, -2.2], [0, -15.8, -2.2], [0, ADIT.y1 - 0.5, 1.4]].map((p, i) => <pointLight key={`s${i}`} position={p as V3} color="#ffdcae" intensity={6} distance={9} decay={1.5} />)}
    <pointLight position={[0, DOOR.y1 + 0.3, ADIT.zW + 0.4]} color="#ff3a2a" intensity={1.6} distance={4} decay={1.6} />
    <pointLight position={[-9.2, yr(0.75), ZT - R + 0.6]} color="#5a8aff" intensity={1.2} distance={4} decay={1.6} />
  </group>);
};
/** underground fog/exposure helper: 1 when the camera is below the street */
export const underAmt = (camY: number) => smooth(-0.4, -2.5, camY);

// ================================================================ 1907 (scene 8): the same tunnel under construction,
// seen in the cutaway (back half of each ring, behind the section plane): rings appear behind the advancing shield;
// period track (timber ties on ballast, third rail + cover board) is laid behind the face in 4 m panels; bare-bulb
// lamps on brackets; a muck car on the construction track; then the first train - original steel cars in the
// spirit of 1904-08 IRT stock (olive body, clerestory roof with deck lights, end vestibules, rattan seats, bulbs).
const halfRingKit = () => once("ring1907", () => { const M = SM(), k = new Kit(), t0 = deg(58), t1 = deg(302);
  k.add(M.lining, ringGeo(t0, t1, 48), [0, 0, 0], [0, 0, -Math.PI / 2], [1, 1, 1], { ink: false, cast: false });
  const flG = new THREE.BoxGeometry(RING - 0.06, 0.13, 0.028), boltG = new THREE.BoxGeometry(0.05, 0.035, 0.05);
  for (let s = 0; s < 16; s++) { const t = (s / 16) * Math.PI * 2 + deg(11.25); if (!inRange(t, [t0, t1]) || inRange(t, HIDDEN)) continue; const rr = R - 0.07;
    k.add(M.flange, flG, [0, Math.sin(t) * rr, Math.cos(t) * rr], [Math.PI / 2 - t, 0, 0], [1, 1, 1], { ink: false, cast: false }); }
  for (let b = 0; b < 32; b++) { const t = (b / 32) * Math.PI * 2; if (!inRange(t, [t0, t1]) || inRange(t, HIDDEN)) continue;
    for (const sx of [-1, 1]) k.add(M.bolt, boltG, [sx * (RING / 2 - 0.045), Math.sin(t) * (R - 0.09), Math.cos(t) * (R - 0.09)], [Math.PI / 2 - t, 0, 0], [1, 1, 1], { ink: false, cast: false }); }
  return k; });
/** one 4 m panel of finished 1907 track + invert + walkway (built once, placed along x) */
const PANEL = 4.0;
const track1907Kit = () => once("trk1907", () => { const M = SM(), k = new Kit(), r = rng(19), a = -PANEL / 2, b = PANEL / 2, zc = CUT_Zsafe;
  k.add(M.invert, extrudeX([[-R - 0.3, BED], [zc, BED], [zc, -R - 0.5], [-R - 0.3, -R - 0.5]], a, b), [0, YT, ZT], [0, 0, 0], [1, 1, 1], { ink: false, cast: false });
  k.add(M.bench, extrudeX([[-R - 0.4, BENCH], [BENCH_EDGE, BENCH], [BENCH_EDGE, BED], [-R - 0.4, BED]], a, b), [0, YT, ZT], [0, 0, 0], [1, 1, 1], { ink: 0.35, cast: false });
  k.add(M.ballastB, extrudeX([[-1.5, BED], [-1.25, BED + 0.2], [1.25, BED + 0.2], [1.5, BED]], a, b), [0, YT, ZT], [0, 0, 0], [1, 1, 1], { ink: false, cast: false });
  for (let x = a + 0.3; x < b; x += 0.6) k.span(M.tie, [x - 0.11 + (r() - 0.5) * 0.03, yr(BED) + 0.12, ZT - 1.25], [x + 0.11, yr(BED) + 0.28, ZT + 1.25], { ink: false, cast: false });
  for (const s of [-1, 1]) { k.add(M.railWeb, extrudeX(railProfile, a, b), [0, RAIL_Y - 0.18 + 0.03, ZT + s * GAUGE], [0, 0, 0], [1, 1, 1], { ink: false, cast: false });
    k.span(M.railHead, [a, RAIL_Y + 0.026, ZT + s * GAUGE - 0.034], [b, RAIL_Y + 0.031, ZT + s * GAUGE + 0.034], { ink: false, cast: false }); }
  return k; });
const CUT_Zsafe = 1.55;   // track/invert stop just short of the section plane (CUT_Z - ZT = 1.6)
/** bare-bulb lamps on brackets (1907) every 6.1 m on the back wall */
const lamps1907Kit = () => once("lamps1907", () => { const M = SM(), k = new Kit();
  for (let x = X0 + 1; x < X1; x += 6.1) { const y = yr(1.6), wzv = ZT - Math.sqrt(R * R - 2.56); k.span(M.cage, [x - 0.015, y + 0.1, wzv], [x + 0.015, y + 0.13, wzv + 0.35], { ink: false, cast: false }); k.sphere(M.bulb, 0.055, [x, y, wzv + 0.33], [1, 1.25, 1], { ink: false, cast: false }); }
  return k; });
export const Lining1907: React.FC<{ front: number; f: number }> = ({ front }) => { const ring = halfRingKit(), trk = track1907Kit();
  const xs = useMemo(() => { const a: number[] = []; for (let x = -40; x < 40; x += RING) a.push(x); return a; }, []);
  const panels = useMemo(() => { const a: number[] = []; for (let x = -40; x < 44; x += PANEL) a.push(x); return a; }, []);
  return (<group>
    {xs.filter((x) => x + RING < front).map((x) => <group key={x} position={[x + RING / 2, YT, ZT]}><KitMesh kit={ring} /></group>)}
    {panels.filter((x) => x + PANEL < front - 3.5).map((x) => <group key={`p${x}`} position={[x + PANEL / 2, 0, 0]}><KitMesh kit={trk} /></group>)}
    <KitMesh kit={lamps1907Kit()} />
  </group>);
};
/** muck car on the construction track: shuttles spoil back from the face, pushed by a navvy (Set places the navvy) */
const muckKit = () => once("muck", () => { const M = SM(), k = new Kit();
  k.span(M.rust, [-0.75, 0.35, -0.5], [0.75, 1.0, 0.5], { ink: 0.6 }); k.span(M.black, [-0.8, 0.28, -0.55], [0.8, 0.36, 0.55]);
  for (const x of [-0.45, 0.45]) for (const s of [-1, 1]) k.cyl(M.black, 0.16, 0.16, 0.08, [x, 0.17, s * 0.33], [Math.PI / 2, 0, 0], 14, { ink: 0.3 });
  for (let i = 0; i < 7; i++) k.sphere(M.wallConc, 0.18 + (i % 3) * 0.04, [-0.5 + (i % 4) * 0.33, 1.0, -0.25 + Math.floor(i / 4) * 0.45], [1, 0.6, 1], { ink: false });
  return k; });
export const muckAt = (f: number, front: number): V3 | null => { if (f < 600 || f > 668) return null; const t = ((f - 600) % 34) / 34, x = front - 3.0 - Math.sin(t * Math.PI) * 5.5; return [x, yr(BED) + 0.02, ZT - 0.4]; };
export const MuckCar: React.FC<{ p: V3 }> = ({ p }) => <group position={p}><KitMesh kit={muckKit()} /></group>;

// ---------------------------------------------------------------- the 1907 train (original design, period spirit)
const t07Mats = () => once("t07", () => ({
  body: std("#3b4a33", 0.42, 0.25), bodyD: std("#28331f", 0.5, 0.2), cream: std("#d9c79a", 0.5, 0.1), roof: std("#3a3836", 0.8, 0.1), brass: std("#c9a24a", 0.3, 0.8),
  glass: new THREE.MeshPhysicalMaterial({ color: "#c9b48a", roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.4, depthWrite: false }),
  warm: glowMat([2.6, 1.9, 1.1]), seat: std("#a8854a", 0.7), floor: std("#4a3a2a", 0.85), wall: std("#6a4a2e", 0.6), head: glowMat([3.0, 2.6, 1.8]), red: glowMat([2.6, 0.3, 0.15]),
  truck: std("#2a2826", 0.6, 0.5), wheel: std("#5a5652", 0.4, 0.85),
}));
const car07Kit = (lead: boolean) => once(`c07${lead}`, () => { const T = t07Mats(), k = new Kit(), L = 15.2, W = 2.62, h = L / 2, w = W / 2;
  const yB = 1.0, yF = 1.15, yS = 1.85, yW = 2.62, yE = 2.86, yR = 3.1, yD = 3.48;
  for (const s of [-1, 1]) { const z = s * w;
    k.span(T.body, [-h + 0.9, yB, z - 0.03], [h - 0.9, yS, z + 0.03], { ink: 0.5 }); k.span(T.cream, [-h + 0.9, yS - 0.05, z + s * 0.03], [h - 0.9, yS - 0.02, z + s * 0.035], { ink: false });
    k.span(T.body, [-h + 0.9, yW, z - 0.03], [h - 0.9, yE, z + 0.03], { ink: 0.5 }); k.span(T.cream, [-h + 1.0, yW + 0.07, z + s * 0.03], [h - 1.0, yW + 0.09, z + s * 0.035], { ink: false });
    const n = 12; for (let i = 0; i <= n; i++) { const x = -h + 0.9 + ((L - 1.8) * i) / n; k.span(T.bodyD, [x - 0.07, yS, z - 0.035], [x + 0.07, yW, z + 0.035], { ink: false }); }
    for (let i = 0; i < n; i++) { const x0 = -h + 0.9 + ((L - 1.8) * i) / n + 0.07, x1 = -h + 0.9 + ((L - 1.8) * (i + 1)) / n - 0.07; k.span(T.glass, [x0, yS, z - 0.004], [x1, yW, z + 0.004], { ink: false, cast: false }); }
    for (const e of [-1, 1]) { const x0 = e * h - (e > 0 ? 0.9 : 0), x1 = e * h + (e < 0 ? 0.9 : 0);   // end vestibules with sliding doors (closed), small windows
      k.span(T.body, [x0, yB, z - 0.03], [x1, yE, z + 0.03], { ink: 0.5 }); k.span(T.bodyD, [x0 + 0.15, yF, z + s * 0.031], [x1 - 0.15, yE - 0.12, z + s * 0.036], { ink: 0.3 }); k.span(T.glass, [x0 + 0.25, 2.0, z + s * 0.037], [x1 - 0.25, 2.5, z + s * 0.04], { ink: false, cast: false }); }
  }
  // clerestory roof: lower curved roof, raised deck with deck lights
  { const prof = (z0: number, y0: number, yc: number) => { const p: [number, number][] = []; for (let i = 0; i <= 10; i++) { const a = (Math.PI * i) / 10; p.push([-Math.cos(a) * z0, y0 + Math.sin(a) * (yc - y0)]); } return p; };
    const lo = new THREE.Shape(prof(w + 0.05, yE, yR).map(([z, y]) => new THREE.Vector2(z, y))); lo.lineTo(w + 0.05, yE - 0.02); lo.lineTo(-w - 0.05, yE - 0.02);
    const g = new THREE.ExtrudeGeometry(lo, { depth: L + 0.1, bevelEnabled: false, curveSegments: 6 }); g.rotateY(Math.PI / 2); g.translate(-h - 0.05, 0, 0); k.add(T.roof, g, [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: 0.6 });
    k.span(T.bodyD, [-h + 0.6, yR - 0.05, -0.82], [h - 0.6, yD - 0.08, 0.82], { ink: 0.5 }); k.span(T.roof, [-h + 0.5, yD - 0.08, -0.9], [h - 0.5, yD, 0.9], { ink: 0.5 });
    for (let x = -h + 1.0; x < h - 1.0; x += 0.95) for (const s of [-1, 1]) k.span(T.warm, [x, yR + 0.05, s * 0.825 - 0.005], [x + 0.55, yD - 0.14, s * 0.825 + 0.005], { ink: false, cast: false }); }
  // interior: wood walls, rattan cross seats, bulbs
  k.span(T.floor, [-h + 0.05, yF - 0.02, -w + 0.05], [h - 0.05, yF, w - 0.05], { ink: false, cast: false });
  for (let x = -h + 1.6; x < h - 1.4; x += 1.25) for (const s of [-1, 1]) { k.span(T.seat, [x - 0.3, yF + 0.4, s * 0.25], [x + 0.2, yF + 0.5, s * (w - 0.1)], { ink: false, cast: false }); k.span(T.seat, [x + 0.15, yF + 0.5, s * 0.25], [x + 0.22, yS + 0.1, s * (w - 0.1)], { ink: false, cast: false }); }
  for (let x = -h + 1.5; x < h - 1.0; x += 1.9) k.sphere(T.warm, 0.07, [x, yE + 0.12, 0], [1, 1, 1], { ink: false, cast: false });
  // ends: three windows + door; lead end gets the headlight + marker lamps
  for (const e of [-1, 1]) { const x = e * h; k.span(T.body, [x - (e > 0 ? 0.04 : 0), yB, -w], [x + (e < 0 ? 0.04 : 0), yE, w], { ink: 0.6 });
    for (const zz of [-0.85, 0, 0.85]) k.span(T.glass, [x + e * 0.045 - 0.004, 2.0, zz - 0.3], [x + e * 0.045 + 0.004, 2.6, zz + 0.3], { ink: false, cast: false });
    k.span(T.truck, [x - 0.2, 0.6, -1.2], [x + 0.2, 0.75, 1.2], { ink: 0.3 });
    if (lead && e > 0) { k.cyl(T.head, 0.12, 0.12, 0.05, [x + 0.08, 2.92, 0], [0, 0, Math.PI / 2], 16, { ink: false }); k.cyl(T.brass, 0.17, 0.17, 0.04, [x + 0.06, 2.92, 0], [0, 0, Math.PI / 2], 16, { ink: false });
      for (const zz of [-1.05, 1.05]) k.cyl(T.red, 0.06, 0.06, 0.04, [x + 0.07, 2.6, zz], [0, 0, Math.PI / 2], 12, { ink: false }); } }
  // underframe + trucks
  k.span(T.truck, [-h + 3, 0.62, -1.0], [h - 3, yB, 1.0], { ink: 0.4 });
  for (const bx of [-h + 2.3, h - 2.3]) { for (const s of [-1, 1]) k.span(T.truck, [bx - 1.15, 0.38, s * 1.0 - 0.08], [bx + 1.15, 0.7, s * 1.0 + 0.08], { ink: 0.4 });
    for (const wx of [-0.85, 0.85]) for (const s of [-1, 1]) k.cyl(T.wheel, 0.43, 0.43, 0.11, [bx + wx, 0.43, s * GAUGE], [Math.PI / 2, 0, 0], 22, { ink: 0.3 }); }
  return k; });
export const Train1907: React.FC<{ head: number }> = ({ head }) => (
  <group position={[0, RAIL_Y + 0.03, ZT]}>{Array.from({ length: 4 }, (_, i) => <group key={i} position={[head - 7.6 - i * 15.6, 0, 0]}><KitMesh kit={car07Kit(i === 0)} />
    <pointLight position={[0, 2.3, 0]} color="#ffd29a" intensity={4} distance={8} decay={1.5} /></group>)}</group>);
