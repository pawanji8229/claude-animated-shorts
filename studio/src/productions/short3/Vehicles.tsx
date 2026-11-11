// short3 vehicles (original 1930-period designs, no brand marks). Local frame: +x = forward, y up, wheels on y = 0.
//  Car30      sedan: wire-spoke wheels, sweeping fenders, running boards, chrome radiator shell + grille, louvred hood,
//             bowl headlamps on a bar, cowl lamps, door seams + handles, glass, visor, roof, spare wheel, bumpers
//  Truck30    stake-bed truck: cab with glass, long louvred hood, dual rear wheels, stake sides, timber load
//  Streetcar  double-truck car: two-tone body, sash windows, letterboard, clerestory, trolley pole + harp + wheel,
//             trucks with wheels + springs, fenders, headlamp, destination sign, steps
//  Crane30    crawler crane: tracks with moving shoes (instanced), idler + sprocket + rollers, carbody, revolving
//             house (sheet metal, vents, door, windows), cab, exhaust stack, counterweight, gantry + pendant lines,
//             lattice boom, tip sheaves, hoist rope, swivel + chain + wrecking ball, lamps
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Kit, KitMesh } from "./kit";
import { AM, archMats, signTex } from "./archKit";
import { pbr } from "./tex";
import { V3 } from "../../lib/math";
import { struts, latticePairs } from "../london-bridge/assets";
import { Ink } from "../../inventor/Workshop";

const paint = (c: string) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.15 });
const PAINTS: Record<string, THREE.Material> = {};
const P = (c: string) => (PAINTS[c] ??= paint(c));

// ---------------------------------------------------------------- wheels
const wireWheel = (M: AM, R = 0.34, w = 0.13, spokes = 24, hub = "#1a1a1a") => {
  const k = new Kit(); k.torus(M.rubber, R - 0.055, 0.06, [0, 0, 0], [0, 0, 0], Math.PI * 2, { ink: 0.6 }); k.torus(M.cream, R - 0.105, 0.008, [0, 0, 0.055], [0, 0, 0], Math.PI * 2, { ink: false });
  k.torus(P(hub), R - 0.12, 0.018, [0, 0, 0], [0, 0, 0], Math.PI * 2, { ink: false });
  for (let s = 0; s < spokes; s++) { const a = (s / spokes) * Math.PI * 2, side = s % 2 ? 0.035 : -0.035; k.rod(M.chrome, [Math.cos(a) * 0.05, Math.sin(a) * 0.05, side], [Math.cos(a + 0.12) * (R - 0.125), Math.sin(a + 0.12) * (R - 0.125), 0], 0.005, 4, { ink: false }); }
  k.cyl(M.chrome, 0.07, 0.08, w * 0.9, [0, 0, 0], [Math.PI / 2, 0, 0], 14, { ink: 0.4 }); k.sphere(M.chrome, 0.05, [0, 0, w * 0.45], [1, 1, 0.6], { ink: false });
  return k;
};
const discWheel = (M: AM, R = 0.48, w = 0.22, col = "#2a2a2a") => {
  const k = new Kit(); k.torus(M.rubber, R - 0.09, 0.1, [0, 0, 0], [0, 0, 0], Math.PI * 2, { ink: 0.6 }); k.cyl(P(col), R - 0.17, R - 0.17, w * 0.7, [0, 0, 0], [Math.PI / 2, 0, 0], 20, { ink: 0.4 });
  for (let s = 0; s < 8; s++) { const a = (s / 8) * Math.PI * 2; k.cyl(M.chrome, 0.02, 0.02, 0.03, [Math.cos(a) * 0.14, Math.sin(a) * 0.14, w * 0.36], [Math.PI / 2, 0, 0], 6, { ink: false }); }
  k.cyl(M.chrome, 0.08, 0.09, w * 0.8, [0, 0, 0.02], [Math.PI / 2, 0, 0], 12, { ink: false }); return k;
};
const Wheel: React.FC<{ kit: Kit; p: V3; spin: number; flip?: boolean }> = ({ kit, p, spin, flip }) => (
  <group position={p} rotation={[0, flip ? Math.PI : 0, 0]}><group rotation={[0, 0, (flip ? 1 : -1) * spin]}><KitMesh kit={kit} /></group></group>);

// ---------------------------------------------------------------- 1930 sedan
const carBody = (M: AM, col: string) => {
  const k = new Kit(), B = P(col), Bk = P("#141416"), L = 4.1, W = 1.68, hw = W / 2, R = 0.34, fx = 1.3, rx = -1.25;
  // frame + running boards (rubber mat on top)
  for (const s of [-1, 1]) k.span(Bk, [-1.95, 0.32, s * 0.42 - 0.05], [2.0, 0.44, s * 0.42 + 0.05]);
  for (const s of [-1, 1]) { k.span(Bk, [fx - 0.85, 0.38, s * hw - 0.02], [rx + 0.6, 0.42, s * (hw - 0.3)].map((v, i) => (i === 2 ? s * (hw - 0.3) : v)) as V3); k.span(M.rubber, [rx + 0.62, 0.42, s * hw * 0.98 - (s > 0 ? 0.28 : -0.0)], [fx - 0.85, 0.43, s * hw * 0.98 + (s > 0 ? 0 : 0.28)], { ink: false }); }
  // fenders: crescent profiles over each wheel, extruded across the tyre width
  const fender = (cx: number, front: boolean) => { const pts: [number, number][] = []; const r0 = R + 0.05, r1 = R + 0.13, a0 = front ? -0.15 : 0.0, a1 = front ? Math.PI * 0.98 : Math.PI + 0.15;
    for (let i = 0; i <= 20; i++) { const a = a0 + (a1 - a0) * (i / 20); pts.push([Math.cos(a) * r1, Math.sin(a) * r1 * 1.05]); }
    for (let i = 20; i >= 0; i--) { const a = a0 + (a1 - a0) * (i / 20); pts.push([Math.cos(a) * r0, Math.sin(a) * r0]); }
    for (const s of [-1, 1]) k.ext(B, pts, 0.3, [cx, R, s * (hw - 0.1)], [0, 0, 0], 0.015, { ink: 0.8 }); };
  fender(fx, true); fender(rx, false);
  for (const s of [-1, 1]) { k.ext(B, [[0, 0], [0.62, 0], [0.62, 0.05], [0.0, 0.14]], 0.3, [fx - 0.85 - 0.62 + 0.62, 0.42, s * (hw - 0.1)], [0, Math.PI, 0]); }   // front fender skirt down to the board
  // body sill + lower body, cowl, hood with louvres, radiator shell + grille + cap
  k.span(B, [-1.85, 0.44, -hw + 0.08], [0.55, 1.05, hw - 0.08]);
  k.span(B, [0.55, 0.62, -0.52], [1.95, 1.08, 0.52]); k.span(B, [0.55, 1.08, -0.48], [1.95, 1.13, 0.48]);
  for (const s of [-1, 1]) for (let l = 0; l < 9; l++) k.span(Bk, [0.95 + l * 0.08, 0.78, s * 0.525 - 0.004], [0.99 + l * 0.08, 0.98, s * 0.525 + 0.004], { ink: false });
  k.span(M.chrome, [1.95, 0.5, -0.5], [2.05, 1.12, 0.5]); k.span(Bk, [2.0, 0.56, -0.43], [2.06, 1.06, 0.43], { ink: false });
  for (let g = -6; g <= 6; g++) k.span(M.chrome, [2.055, 0.58, g * 0.06 - 0.008], [2.065, 1.04, g * 0.06 + 0.008], { ink: false });
  k.cyl(M.chrome, 0.04, 0.05, 0.08, [1.98, 1.17, 0], [0, 0, 0], 10, { ink: 0.4 }); k.ext(M.chrome, [[0, 0], [0.18, 0.02], [0.05, 0.08]], 0.02, [1.98, 1.21, 0]);
  // headlamps on a bar, cowl lamps
  k.rod(M.chrome, [2.05, 0.92, -0.62], [2.05, 0.92, 0.62], 0.02, 6); for (const s of [-1, 1]) { k.lathe(M.chrome, [[0, 0], [0.13, 0.02], [0.15, 0.12], [0.14, 0.17], [0, 0.17]], [2.08, 0.98, s * 0.62], 16, [0, 0, -Math.PI / 2]); k.cyl(M.lampDim, 0.12, 0.12, 0.01, [2.255, 0.98, s * 0.62], [0, 0, Math.PI / 2], 16, { ink: false }); }
  for (const s of [-1, 1]) k.sphere(M.chrome, 0.06, [0.62, 1.12, s * 0.56], [1.4, 1, 1]);
  // cabin: doors (seams + handles), glass, pillars, windshield + visor, roof, rear panel with spare wheel + tail lamp
  for (const x of [-0.6, 0.45]) for (const s of [-1, 1]) k.span(Bk, [x - 0.005, 0.5, s * (hw - 0.08) - 0.004], [x + 0.005, 1.04, s * (hw - 0.08) + 0.004], { ink: false });
  for (const [x, s] of [[0.32, -1], [0.32, 1], [-0.75, -1], [-0.75, 1]] as [number, number][]) k.span(M.chrome, [x - 0.07, 0.9, s * (hw - 0.065)], [x + 0.03, 0.92, s * (hw - 0.065) + s * 0.02].map((v, i) => (i === 2 ? s * (hw - 0.04) : v)) as V3, { ink: false });
  const cabX0 = -1.6, cabX1 = 0.62, yb = 1.05, yt = 1.62;
  for (const x of [cabX0, -0.62, 0.45, cabX1]) for (const s of [-1, 1]) k.span(B, [x - 0.04, yb, s * (hw - 0.12) - 0.04], [x + 0.04, yt, s * (hw - 0.12) + 0.04]);
  for (const [a, b] of [[cabX0 + 0.04, -0.66], [-0.58, 0.41]]) for (const s of [-1, 1]) k.plane(M.glassDark, b - a, yt - yb - 0.06, [(a + b) / 2, (yb + yt) / 2, s * (hw - 0.12)], [0, s > 0 ? 0 : Math.PI, 0]);
  k.plane(M.glass, W - 0.3, yt - yb - 0.04, [cabX1 + 0.02, (yb + yt) / 2, 0], [0, Math.PI / 2, 0]); k.span(B, [cabX1 - 0.02, yb, -hw + 0.12], [cabX1 + 0.04, yb + 0.04, hw - 0.12]);
  k.span(B, [cabX1 - 0.05, yt - 0.02, -hw + 0.1], [cabX1 + 0.28, yt + 0.02, hw - 0.1]);       // sun visor
  k.ext(Bk, [[cabX0 - 0.08, 0], [cabX1 + 0.06, 0], [cabX1 + 0.04, 0.05], [cabX1 - 0.15, 0.12], [cabX0 + 0.15, 0.12], [cabX0 - 0.08, 0.04]], W - 0.18, [0, yt, 0], [0, 0, 0], 0.02, { ink: 0.9 });
  k.span(B, [cabX0 - 0.05, yb, -hw + 0.12], [cabX0 + 0.04, yt, hw - 0.12]); k.plane(M.glassDark, 0.5, 0.3, [cabX0 - 0.055, 1.35, 0], [0, -Math.PI / 2, 0]);
  k.span(B, [-1.95, 0.44, -hw + 0.1], [-1.85, 1.05, hw - 0.1]);
  // interior: seat backs + steering wheel
  k.span(P("#5a3a26"), [-1.35, 0.95, -0.65], [-1.2, 1.45, 0.65], { ink: false }); k.span(P("#5a3a26"), [-0.3, 0.95, -0.65], [-0.15, 1.42, 0.65], { ink: false });
  k.torus(Bk, 0.17, 0.015, [0.25, 1.22, -0.35], [0, Math.PI / 2, 0.5], Math.PI * 2, { ink: false }); k.rod(Bk, [0.25, 1.22, -0.35], [0.5, 0.9, -0.35], 0.015, 5, { ink: false });
  // spare wheel mount, tail lamp, licence plate, bumpers (twin blades)
  k.span(M.chrome, [-2.0, 0.55, -0.07], [-1.95, 0.75, 0.07]); k.sphere(P("#8a1a14"), 0.05, [-1.98, 0.88, -0.6], [0.6, 1, 1]); k.span(M.cream, [-1.99, 0.62, 0.35], [-1.97, 0.76, 0.6], { ink: 0.3 });
  for (const x of [2.25, -2.25]) for (const y of [0.36, 0.46]) k.span(M.chrome, [x - 0.03, y, -0.82], [x + 0.03, y + 0.05, 0.82]);
  for (const x of [2.1, -2.12]) for (const s of [-1, 1]) k.rod(M.chrome, [x, 0.42, s * 0.5], [x + Math.sign(x) * 0.13, 0.42, s * 0.5], 0.02, 6, { ink: false });
  return k;
};
export const Car30: React.FC<{ color: string; spin: number }> = ({ color, spin }) => {
  const { body, wheel, spare } = useMemo(() => { const M = archMats(); return { body: carBody(M, color), wheel: wireWheel(M), spare: wireWheel(M) }; }, [color]);
  return (<group>
    <KitMesh kit={body} />
    {[[1.3, 0.34, 0.74], [1.3, 0.34, -0.74], [-1.25, 0.34, 0.74], [-1.25, 0.34, -0.74]].map((p, i) => <Wheel key={i} kit={wheel} p={p as V3} spin={spin} flip={p[2] < 0} />)}
    <group position={[-2.1, 0.78, 0]} rotation={[0, -Math.PI / 2, 0]}><KitMesh kit={spare} /></group>
  </group>);
};

// ---------------------------------------------------------------- 1930 stake-bed truck
const truckBody = (M: AM, col: string, load: number) => {
  const k = new Kit(), B = P(col), Bk = P("#161616"), hw = 0.95;
  for (const s of [-1, 1]) k.span(Bk, [-3.3, 0.5, s * 0.45 - 0.07], [2.4, 0.68, s * 0.45 + 0.07]);
  // front fenders + running boards
  for (const s of [-1, 1]) { const pts: [number, number][] = []; for (let i = 0; i <= 16; i++) { const a = -0.1 + (Math.PI * 1.05 * i) / 16; pts.push([Math.cos(a) * 0.62, Math.sin(a) * 0.62]); } for (let i = 16; i >= 0; i--) { const a = -0.1 + (Math.PI * 1.05 * i) / 16; pts.push([Math.cos(a) * 0.54, Math.sin(a) * 0.54]); } k.ext(B, pts, 0.3, [1.7, 0.48, s * (hw - 0.05)], [0, 0, 0], 0.015, { ink: 0.8 }); }
  for (const s of [-1, 1]) k.span(Bk, [0.0, 0.5, s * hw - (s > 0 ? 0.3 : 0)], [1.1, 0.55, s * hw + (s > 0 ? 0 : 0.3)]);
  // hood, radiator, lamps
  k.span(B, [0.85, 0.75, -0.55], [2.45, 1.4, 0.55]); for (const s of [-1, 1]) for (let l = 0; l < 10; l++) k.span(Bk, [1.25 + l * 0.09, 0.95, s * 0.555 - 0.004], [1.29 + l * 0.09, 1.25, s * 0.555 + 0.004], { ink: false });
  k.span(Bk, [2.45, 0.68, -0.56], [2.6, 1.45, 0.56]); for (let g = -7; g <= 7; g++) k.span(M.ironPaint, [2.6, 0.75, g * 0.065 - 0.012], [2.62, 1.38, g * 0.065 + 0.012], { ink: false });
  k.cyl(M.chrome, 0.05, 0.05, 0.1, [2.52, 1.5, 0], [0, 0, 0], 8); for (const s of [-1, 1]) { k.lathe(Bk, [[0, 0], [0.15, 0.02], [0.17, 0.14], [0, 0.18]], [2.4, 1.25, s * 0.75], 14, [0, 0, -Math.PI / 2]); k.cyl(M.lampDim, 0.14, 0.14, 0.01, [2.585, 1.25, s * 0.75], [0, 0, Math.PI / 2], 14, { ink: false }); k.rod(Bk, [2.4, 1.25, s * 0.75], [2.2, 0.9, s * 0.62], 0.02, 5); }
  // cab: walls, doors, glass, roof, windshield
  k.span(B, [-0.55, 0.68, -hw], [0.85, 1.35, hw]); k.span(B, [-0.55, 1.35, -hw], [-0.45, 2.15, hw]);
  for (const x of [-0.5, 0.8]) for (const s of [-1, 1]) k.span(B, [x - 0.05, 1.35, s * (hw - 0.05) - 0.05], [x + 0.05, 2.15, s * (hw - 0.05) + 0.05]);
  for (const s of [-1, 1]) { k.plane(M.glassDark, 1.2, 0.68, [0.15, 1.75, s * (hw - 0.05)], [0, s > 0 ? 0 : Math.PI, 0]); k.span(Bk, [-0.4, 0.75, s * hw - 0.005], [-0.39, 1.33, s * hw + 0.005].map((v, i) => (i === 2 ? s * hw + 0.005 : v)) as V3, { ink: false }); k.span(M.chrome, [0.55, 1.15, s * hw], [0.7, 1.17, s * (hw + 0.025)], { ink: false }); }
  k.plane(M.glass, 1.75, 0.7, [0.83, 1.76, 0], [0, Math.PI / 2, 0]); k.span(Bk, [-0.62, 2.15, -hw - 0.05], [1.0, 2.25, hw + 0.05]);
  // stake bed: floor, stakes, side boards, front rack, timber load
  k.span(M.timber, [-3.4, 0.72, -1.05], [-0.65, 0.84, 1.05]);
  for (let x = -3.35; x <= -0.7; x += 0.44) for (const s of [-1, 1]) k.span(M.timberDk, [x - 0.04, 0.84, s * 1.0 - 0.04], [x + 0.04, 1.8, s * 1.0 + 0.04]);
  for (const y of [1.15, 1.55]) for (const s of [-1, 1]) k.span(M.timber, [-3.4, y, s * 1.04 - 0.02], [-0.65, y + 0.14, s * 1.04 + 0.02]);
  k.span(M.timber, [-0.75, 0.84, -1.0], [-0.65, 1.95, 1.0]);
  for (let l = 0; l < Math.ceil(load * 3); l++) for (let j = 0; j < 4; j++) if (l * 4 + j < load * 12) k.span(M.timber, [-3.6, 0.86 + l * 0.22, -0.84 + j * 0.42], [-0.8, 1.06 + l * 0.22, -0.84 + j * 0.42 + 0.2]);
  k.sphere(P("#8a1a14"), 0.05, [-3.42, 0.8, 0.85], [0.6, 1, 1]);
  return k;
};
export const Truck30: React.FC<{ color: string; spin: number; load: number }> = ({ color, spin, load }) => {
  const { body, fw, rw } = useMemo(() => { const M = archMats(); return { body: truckBody(M, color, load), fw: discWheel(M, 0.48, 0.2, "#7a1f1a"), rw: discWheel(M, 0.48, 0.42, "#7a1f1a") }; }, [color, load]);
  return (<group><KitMesh kit={body} />
    {[[1.7, 0.48, 0.82, fw], [1.7, 0.48, -0.82, fw], [-2.5, 0.48, 0.74, rw], [-2.5, 0.48, -0.74, rw]].map((p, i) => <Wheel key={i} kit={p[3] as Kit} p={[p[0], p[1], p[2]] as V3} spin={spin} flip={(p[2] as number) < 0} />)}
  </group>);
};

// ---------------------------------------------------------------- streetcar
const carShell = (M: AM) => {
  const k = new Kit(), L = 13.2, hl = L / 2, W = 2.6, hw = W / 2, lower = P("#2f5a3a"), cream = P("#efe2c2"), roofM = P("#5a4a3a"), Bk = P("#141414");
  k.span(Bk, [-hl + 0.4, 0.62, -hw + 0.15], [hl - 0.4, 0.86, hw - 0.15]);
  k.span(lower, [-hl, 0.86, -hw], [hl, 1.65, hw]); k.span(cream, [-hl + 0.02, 1.65, -hw + 0.02], [hl - 0.02, 2.75, hw - 0.02]);
  k.span(P("#c9a24a"), [-hl - 0.005, 1.62, -hw - 0.005], [hl + 0.005, 1.68, hw + 0.005], { ink: false });
  // windows (sash) both sides
  for (let i = 0; i < 11; i++) { const x = -hl + 0.9 + i * ((L - 1.8) / 10.4); for (const s of [-1, 1]) { k.plane(M.glassDark, 0.82, 0.78, [x + 0.45, 2.15, s * (hw - 0.01)], [0, s > 0 ? 0 : Math.PI, 0]); k.span(cream, [x + 0.03, 2.12, s * hw - 0.02], [x + 0.87, 2.16, s * hw + 0.02], { ink: false }); } }
  k.span(P("#2f5a3a"), [-hl + 0.01, 2.75, -hw + 0.01], [hl - 0.01, 3.0, hw - 0.01]);                                       // letterboard
  k.ext(roofM, [[-hw - 0.05, 0], [hw + 0.05, 0], [hw - 0.25, 0.28], [-hw + 0.25, 0.28]], L + 0.3, [0, 3.0, 0], [0, Math.PI / 2, 0], 0.02, { ink: 0.8 });
  k.span(roofM, [-hl + 1.2, 3.28, -0.65], [hl - 1.2, 3.62, 0.65]); for (let i = 0; i < 14; i++) for (const s of [-1, 1]) k.plane(M.glassDark, 0.5, 0.18, [-hl + 1.6 + i * 0.75, 3.45, s * 0.651], [0, s > 0 ? 0 : Math.PI, 0]);
  k.ext(roofM, [[-0.7, 0], [0.7, 0], [0.55, 0.12], [-0.55, 0.12]], L - 2.2, [0, 3.62, 0], [0, Math.PI / 2, 0]);
  // ends: dash panels, windows, headlamp, destination sign, fenders, steps
  const dest = new THREE.MeshStandardMaterial({ map: signTex("4  MERIDIAN", "#141414", "#f4ead0", 512, 100, "Arial, sans-serif", "#141414"), roughness: 0.5, emissive: new THREE.Color("#fff2d8"), emissiveIntensity: 0.4 });
  for (const s of [-1, 1]) { const x = s * hl;
    for (const z of [-0.85, 0, 0.85]) k.plane(M.glassDark, 0.75, 0.78, [x + s * 0.005, 2.15, z], [0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0]);
    k.lathe(M.chrome, [[0, 0], [0.16, 0.02], [0.18, 0.12], [0, 0.14]], [x + s * 0.02, 1.35, 0], 14, [0, 0, -s * Math.PI / 2]); k.cyl(M.lamp, 0.15, 0.15, 0.01, [x + s * 0.165, 1.35, 0], [0, 0, Math.PI / 2], 14, { ink: false });
    k.plane(dest, 1.3, 0.24, [x + s * 0.01, 2.87, 0], [0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0], { uv01: true });
    k.span(Bk, [x + (s > 0 ? 0 : -0.6), 0.45, -hw + 0.2], [x + (s > 0 ? 0.6 : 0), 0.62, hw - 0.2]);
    for (let b = 0; b < 7; b++) k.span(Bk, [x + s * 0.45 - 0.02, 0.2, -hw + 0.4 + b * 0.3], [x + s * 0.45 + 0.02, 0.45, -hw + 0.45 + b * 0.3], { ink: false });
    k.span(Bk, [x - s * 1.1 - 0.4, 0.5, hw - 0.02], [x - s * 1.1 + 0.4, 0.55, hw + 0.25]); }
  // trucks (bogies): side frames, springs, wheels on the rails (gauge 1.435)
  for (const tx of [-hl + 2.6, hl - 2.6]) { for (const s of [-1, 1]) { k.span(Bk, [tx - 1.2, 0.35, s * 0.82 - 0.06], [tx + 1.2, 0.58, s * 0.82 + 0.06]); for (const dx of [-0.35, 0.35]) k.cyl(M.rust, 0.08, 0.08, 0.22, [tx + dx, 0.7, s * 0.82], [0, 0, 0], 10, { ink: false }); }
    for (const dx of [-0.75, 0.75]) for (const s of [-1, 1]) { k.cyl(M.rust, 0.36, 0.36, 0.08, [tx + dx, 0.36, s * 0.718], [Math.PI / 2, 0, 0], 18); k.cyl(Bk, 0.4, 0.4, 0.03, [tx + dx, 0.36, s * 0.66], [Math.PI / 2, 0, 0], 18, { ink: false }); } }
  // trolley base + pole (to the wire) + harp + wheel
  k.span(Bk, [-hl + 2.0, 3.74, -0.3], [-hl + 2.8, 3.86, 0.3]); k.cyl(M.rust, 0.08, 0.08, 0.3, [-hl + 2.4, 3.95, 0], [0, 0, 0], 10);
  return k;
};
export const Streetcar: React.FC<{ wireY: number }> = ({ wireY }) => {
  const shell = useMemo(() => carShell(archMats()), []); const M = archMats();
  const base: V3 = [-6.6 + 2.4, 4.05, 0], dy = wireY - base[1], len = 6.0, dx = Math.sqrt(Math.max(0.1, len * len - dy * dy)), tip: V3 = [base[0] + dx, wireY, 0];
  const mid: V3 = [(base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2, 0], ang = Math.atan2(dy, dx);
  return (<group><KitMesh kit={shell} />
    <mesh position={mid} rotation={[0, 0, ang - Math.PI / 2]} material={M.castIron} castShadow><cylinderGeometry args={[0.03, 0.045, len, 8]} /><Ink k={0.5} /></mesh>
    <mesh position={[tip[0], tip[1] - 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.brass}><cylinderGeometry args={[0.07, 0.07, 0.04, 12]} /></mesh>
  </group>);
};

// ---------------------------------------------------------------- crawler crane with wrecking ball
const TRACK_L = 4.6, TRACK_H = 0.95, SHOES = 44;
const craneUpper = (M: AM) => {
  const k = new Kit(), Y = pbr("rusty_painted_metal", { color: "#e2b04a", normal: 0.5, metal: 0.2, scale: 0.5, bright: 1.25 }), Dk = P("#2a2a28"), Bk = P("#141414");
  // revolving frame + house (sheet-metal panels with seams), louvres, door, windows
  k.span(Dk, [-2.3, 1.55, -1.25], [2.0, 1.75, 1.25]);
  k.span(Y, [-2.2, 1.75, -1.15], [1.0, 3.55, 1.15]);
  for (let x = -2.0; x < 1.0; x += 0.6) for (const s of [-1, 1]) k.span(Dk, [x - 0.01, 1.8, s * 1.152 - 0.004], [x + 0.01, 3.5, s * 1.152 + 0.004], { ink: false });
  for (let l = 0; l < 7; l++) for (const s of [-1, 1]) k.span(Dk, [-1.9, 2.3 + l * 0.14, s * 1.155 - 0.02], [-0.9, 2.36 + l * 0.14, s * 1.155 + 0.02], { ink: false });
  k.span(Dk, [-0.6, 1.8, 1.152], [0.2, 3.2, 1.17]); k.span(M.chrome, [0.05, 2.5, 1.17], [0.12, 2.56, 1.2], { ink: false });
  k.span(Y, [-2.3, 3.55, -1.25], [1.1, 3.65, 1.25]);
  // cab (front-right) with glass on three sides, operator's seat + levers
  k.span(Y, [1.0, 1.75, 0.05], [2.0, 2.2, 1.15]); for (const [x, z] of [[1.0, 0.05], [1.95, 0.05], [1.0, 1.1], [1.95, 1.1]]) k.span(Y, [x, 2.2, z], [x + 0.05, 3.3, z + 0.05]);
  k.span(Y, [0.95, 3.3, 0.0], [2.08, 3.4, 1.2]); k.plane(M.glass, 1.0, 1.05, [2.0, 2.75, 0.6], [0, Math.PI / 2, 0]); k.plane(M.glass, 0.9, 1.05, [1.5, 2.75, 1.13]); k.plane(M.glass, 0.9, 1.05, [1.5, 2.75, 0.07], [0, Math.PI, 0]);
  for (let l = 0; l < 4; l++) k.rod(Bk, [1.65, 1.8, 0.3 + l * 0.15], [1.75, 2.35, 0.3 + l * 0.15], 0.012, 5, { ink: false });
  k.cyl(M.lamp, 0.09, 0.09, 0.03, [2.09, 3.0, 0.9], [0, 0, Math.PI / 2], 12, { ink: false }); k.lathe(M.chrome, [[0, 0], [0.11, 0], [0.11, 0.12], [0, 0.12]], [2.0, 3.0, 0.9], 12, [0, 0, -Math.PI / 2]);
  // counterweight (cast iron, rear), radiator grille, exhaust stack with spark arrester
  k.span(Dk, [-2.75, 1.6, -1.2], [-2.2, 3.0, 1.2]); for (let g = 0; g < 9; g++) k.span(Bk, [-2.77, 1.8 + g * 0.12, -0.8], [-2.75, 1.84 + g * 0.12, 0.8], { ink: false });
  k.cyl(Bk, 0.11, 0.11, 1.6, [-1.4, 4.4, -0.6], [0, 0, 0], 10); k.cyl(Bk, 0.2, 0.14, 0.3, [-1.4, 5.3, -0.6], [0, 0, 0], 12);
  // gantry (A-frame) + boom-hoist sheave block
  for (const s of [-1, 1]) { k.rod(Dk, [-1.9, 3.65, s * 0.9], [-0.9, 5.6, s * 0.4], 0.07, 8); k.rod(Dk, [0.6, 3.65, s * 0.9], [-0.9, 5.6, s * 0.4], 0.06, 8); }
  k.cyl(Dk, 0.22, 0.22, 0.9, [-0.9, 5.65, 0], [Math.PI / 2, 0, 0], 14);
  // boom foot pins
  for (const s of [-1, 1]) k.span(Dk, [1.6, 1.75, s * 0.5 - 0.12], [2.3, 2.35, s * 0.5 + 0.12]);
  return k;
};
const craneLower = (M: AM) => {
  const k = new Kit(), Dk = P("#2a2a28");
  k.span(Dk, [-1.4, 0.95, -0.9], [1.4, 1.45, 0.9]); k.cyl(Dk, 1.3, 1.3, 0.12, [0, 1.5, 0], [0, 0, 0], 28);
  for (const s of [-1, 1]) { k.span(Dk, [-TRACK_L / 2 + 0.4, 0.35, s * 1.3 - 0.25], [TRACK_L / 2 - 0.4, 0.85, s * 1.3 + 0.25]); k.span(Dk, [-0.6, 0.85, s * 0.9], [0.6, 1.05, s * 1.3].map((v, i) => (i === 2 ? s * 1.15 : v)) as V3); }
  return k;
};
/** track shoe positions around a stadium loop (length TRACK_L, height TRACK_H), phase = travelled metres */
const shoeAt = (i: number, phase: number) => {
  const r = TRACK_H / 2, straight = TRACK_L - TRACK_H, per = 2 * straight + 2 * Math.PI * r, d = ((((i / SHOES) * per + phase) % per) + per) % per;
  if (d < straight) return { x: -straight / 2 + d, y: TRACK_H, a: 0 };
  if (d < straight + Math.PI * r) { const a = (d - straight) / r; return { x: straight / 2 + Math.sin(a) * r, y: r + Math.cos(a) * r, a: -a }; }
  if (d < 2 * straight + Math.PI * r) { const e = d - straight - Math.PI * r; return { x: straight / 2 - e, y: 0, a: -Math.PI }; }
  const a = (d - 2 * straight - Math.PI * r) / r; return { x: -straight / 2 - Math.sin(a) * r, y: r - Math.cos(a) * r, a: -Math.PI - a };
};
const Tracks: React.FC<{ phase: number }> = ({ phase }) => {
  const ref = useRef<THREE.InstancedMesh>(null); const M = archMats();
  const geo = useMemo(() => new THREE.BoxGeometry(0.26, 0.07, 0.62), []);
  useLayoutEffect(() => { const m = ref.current; if (!m) return; const o = new THREE.Object3D(); let n = 0;
    for (const s of [-1, 1]) for (let i = 0; i < SHOES; i++) { const q = shoeAt(i, phase); o.position.set(q.x, q.y + 0.04, s * 1.3); o.rotation.set(0, 0, q.a); o.updateMatrix(); m.setMatrixAt(n++, o.matrix); }
    m.instanceMatrix.needsUpdate = true; });
  const r = TRACK_H / 2, straight = TRACK_L - TRACK_H, spin = -phase / r;
  return (<group>
    <instancedMesh ref={ref} args={[geo, M.ironPaint, SHOES * 2]} castShadow receiveShadow />
    {[-1, 1].flatMap((s) => [-straight / 2, straight / 2].map((x) => <group key={`${s}${x}`} position={[x, r + 0.04, s * 1.3]} rotation={[0, 0, spin]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={M.ironPaint} castShadow><cylinderGeometry args={[r - 0.06, r - 0.06, 0.4, 12]} /><Ink k={0.5} /></mesh>
      {Array.from({ length: 6 }, (_, t) => <mesh key={t} position={[Math.cos((t / 6) * Math.PI * 2) * (r - 0.02), Math.sin((t / 6) * Math.PI * 2) * (r - 0.02), 0]} material={M.ironPaint}><boxGeometry args={[0.1, 0.1, 0.42]} /></mesh>)}
    </group>))}
    {[-1, 1].flatMap((s) => [-1.2, -0.4, 0.4, 1.2].map((x) => <mesh key={`r${s}${x}`} position={[x, 0.22, s * 1.3]} rotation={[Math.PI / 2, 0, 0]} material={M.castIron}><cylinderGeometry args={[0.14, 0.14, 0.44, 10]} /></mesh>))}
  </group>);
};
export const BOOM_L = 15, BOOM_ANG = 0.95;
/** world-local (crane frame) position of the boom tip for a given upper yaw */
export const craneTip = (yaw: number): V3 => { const fx = 2.0 + Math.cos(BOOM_ANG) * BOOM_L; return [Math.cos(yaw) * fx, 2.05 + Math.sin(BOOM_ANG) * BOOM_L, -Math.sin(yaw) * fx]; };
export const Crane30: React.FC<{ phase: number; yaw: number; swing: number; swingZ?: number; ropeL?: number; children?: React.ReactNode }> = ({ phase, yaw, swing, swingZ = 0, ropeL = 9.5, children }) => {
  const { up, low, boom } = useMemo(() => { const M = archMats(); return { up: craneUpper(M), low: craneLower(M), boom: struts(latticePairs(BOOM_L, 0.95, 0.95, 16, 0.42), 0.045, pbr("rusty_painted_metal", { color: "#e2b04a", normal: 0.5, metal: 0.2, scale: 0.5, bright: 1.25 })) }; }, []);
  const M = archMats(), tipL: V3 = [2.0 + Math.cos(BOOM_ANG) * BOOM_L, 2.05 + Math.sin(BOOM_ANG) * BOOM_L, 0];
  const ball: V3 = [tipL[0] + Math.sin(swing) * ropeL, tipL[1] - Math.cos(swing) * Math.cos(swingZ) * ropeL, Math.sin(swingZ) * ropeL];
  const rope = (a: V3, b: V3, r: number, key: string) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); const mid = A.add(B).multiplyScalar(0.5);
    return <mesh key={key} position={mid} quaternion={q} material={M.castIron}><cylinderGeometry args={[r, r, L, 6]} /></mesh>; };
  const gantry: V3 = [-0.9, 5.65, 0];
  return (<group>
    <KitMesh kit={low} /><Tracks phase={phase} />
    <group rotation={[0, yaw, 0]}>
      <KitMesh kit={up} />
      <group position={[2.0, 2.05, 0]} rotation={[0, 0, BOOM_ANG]}><primitive object={boom} /></group>
      <mesh position={tipL} rotation={[Math.PI / 2, 0, 0]} material={M.castIron}><cylinderGeometry args={[0.3, 0.3, 0.25, 16]} /><Ink k={0.5} /></mesh>
      {[-0.25, 0, 0.25].map((dz) => rope([gantry[0], gantry[1], dz], [tipL[0] - 0.2, tipL[1] - 0.1, dz], 0.018, `p${dz}`))}
      {rope([tipL[0], tipL[1] - 0.3, 0], [ball[0], ball[1] + 1.2, ball[2]], 0.022, "hoist")}
      {Array.from({ length: 5 }, (_, i) => { const t = i / 5, p: V3 = [ball[0] + (ball[0] - ball[0]) * t, ball[1] + 1.2 - i * 0.18, ball[2]]; return <mesh key={`c${i}`} position={p} rotation={[0, i % 2 ? Math.PI / 2 : 0, 0]} material={M.castIron}><torusGeometry args={[0.07, 0.022, 6, 12]} /></mesh>; })}
      <mesh position={[ball[0], ball[1] + 1.28, ball[2]]} material={M.castIron}><cylinderGeometry args={[0.09, 0.12, 0.25, 10]} /></mesh>
      <mesh position={ball} material={M.castIron} castShadow><sphereGeometry args={[0.62, 24, 16]} /><Ink k={0.7} /></mesh>
      {children}
    </group>
  </group>);
};
