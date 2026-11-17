// BN-2 Islander (generic livery, fictional registration). Local axes: +x nose, +y up, +z starboard; y = 0 is the ground
// under the wheels. Dimensions follow the real type: length ~10.9 m, span 14.94 m, height ~4.2 m, cantilever high wing
// (no wing struts), two flat-six piston engines with two-blade props, fixed tricycle gear (twin-wheel main legs on long
// faired struts below the nacelles, single steerable nose wheel), bench seats with no aisle, side doors (pilot door port
// front, starboard door mid-cabin, port rear door).
//
// The fuselage skin is generated on a fine grid (stations along x, points around a rounded-rectangle section) with
// smooth analytic normals. Each grid quad is sorted by where it sits: paint (white / navy cheat line / teal stripe /
// grey belly), GLASS (windows + windscreen: the same curved skin, transparent, so passengers really show through), or a
// DOOR (moved by its hinge). A second, inset copy forms the cabin liner (window holes left open).
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { V3 } from "../../lib/math";
import { fMats, livery } from "./mats";

// ---------------------------------------------------------------- section along the fuselage
type Sec = { hw: number; yb: number; yt: number; rb: number; rt: number };
const CAB = { x0: -2.7, x1: 2.55 };
export const FUS = { nose: 5.35, tail: -5.62, hw: 0.605, floor: 0.62, roof: 1.96 };
const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const section = (x: number): Sec => {
  const base: Sec = { hw: 0.605, yb: 0.55, yt: 2.0, rb: 0.14, rt: 0.2 };
  if (x >= CAB.x1) { // windscreen + nose
    const w = sm(CAB.x1, 3.3, x); let yt = 2.0 - 0.42 * w, rt = 0.2 + 0.1 * w, yb = 0.55 + 0.07 * sm(3.0, 5.0, x), hw = 0.605 - 0.04 * w;
    if (x > 3.3) { const t = (x - 3.3) / (FUS.nose - 3.3); yt = 1.58 - 0.3 * Math.pow(t, 1.4); hw = 0.565 - 0.24 * Math.pow(t, 1.5); yb = 0.62 + 0.25 * Math.pow(t, 1.8); rt = Math.min(0.32, (yt - yb) / 2); }
    const tip = x > 4.75 ? Math.sqrt(Math.max(0, 1 - ((x - 4.75) / (FUS.nose - 4.75)) ** 2)) : 1, cy = (yt + yb) / 2;
    return { hw: hw * tip, yb: cy - (cy - yb) * tip, yt: cy + (yt - cy) * tip, rb: Math.min(0.14 + 0.12 * w, hw * tip, (yt - yb) * tip / 2), rt: Math.min(rt, hw * tip, (yt - yb) * tip / 2) };
  }
  if (x <= CAB.x0) { // tail cone: the belly sweeps up to the tail
    const t = (CAB.x0 - x) / (CAB.x0 - FUS.tail); const yb = 0.55 + 1.02 * Math.pow(t, 1.25), yt = 2.0 - 0.14 * t, hw = 0.605 * (1 - 0.74 * Math.pow(t, 1.1));
    return { hw, yb, yt, rb: Math.min(0.14, hw, (yt - yb) / 2), rt: Math.min(0.2, hw, (yt - yb) / 2) };
  }
  return base;
};
const M = 112;                              // points around the section
const ring = (s: Sec, out: Float32Array) => {   // (z, y) pairs by arc length, from top centre toward starboard (+z)
  const segs: ((t: number) => [number, number])[] = [], lens: number[] = [];
  const line = (a: [number, number], b: [number, number]) => { segs.push((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); lens.push(Math.hypot(b[0] - a[0], b[1] - a[1])); };
  const arc = (c: [number, number], r: number, a0: number, a1: number) => { segs.push((t) => { const a = a0 + (a1 - a0) * t; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; }); lens.push(Math.abs(a1 - a0) * r); };
  const { hw, yb, yt, rb, rt } = s;
  line([0, yt], [hw - rt, yt]); arc([hw - rt, yt - rt], rt, Math.PI / 2, 0); line([hw, yt - rt], [hw, yb + rb]); arc([hw - rb, yb + rb], rb, 0, -Math.PI / 2);
  line([hw - rb, yb], [-hw + rb, yb]); arc([-hw + rb, yb + rb], rb, -Math.PI / 2, -Math.PI); line([-hw, yb + rb], [-hw, yt - rt]); arc([-hw + rt, yt - rt], rt, Math.PI, Math.PI / 2); line([-hw + rt, yt], [0, yt]);
  const L = lens.reduce((a, b) => a + b, 0) || 1e-6;
  for (let i = 0; i < M; i++) { let d = (i / M) * L, k = 0; while (k < lens.length - 1 && d > lens[k]) { d -= lens[k]; k++; } const p = segs[k](lens[k] > 1e-9 ? d / lens[k] : 0); out[i * 2] = p[0]; out[i * 2 + 1] = p[1]; }
  return L;
};

// ---------------------------------------------------------------- openings (side view rounded rects on the flat walls)
type Rect = { x0: number; x1: number; y0: number; y1: number; r: number };
const R = (x0: number, x1: number, y0: number, y1: number, r = 0.07): Rect => ({ x0, x1, y0, y1, r });
const inRR = (q: Rect, x: number, y: number, grow = 0) => { const cx = (q.x0 + q.x1) / 2, cy = (q.y0 + q.y1) / 2, hx = (q.x1 - q.x0) / 2 + grow, hy = (q.y1 - q.y0) / 2 + grow, r = Math.min(q.r + grow, hx, hy);
  const dx = Math.max(0, Math.abs(x - cx) - (hx - r)), dy = Math.max(0, Math.abs(y - cy) - (hy - r)); return Math.abs(x - cx) <= hx && Math.abs(y - cy) <= hy && dx * dx + dy * dy <= r * r; };
export type DoorId = "pilot" | "stbd" | "rear";
export const DOORS: Record<DoorId, { side: 1 | -1; rect: Rect; win: Rect; hinge: number }> = {
  pilot: { side: -1, rect: R(1.72, 2.62, 0.7, 1.9, 0.08), win: R(1.86, 2.5, 1.24, 1.76, 0.08), hinge: 2.62 },
  stbd: { side: 1, rect: R(-0.47, 0.58, 0.7, 1.9, 0.08), win: R(-0.2, 0.36, 1.22, 1.74, 0.08), hinge: 0.58 },
  rear: { side: -1, rect: R(-2.36, -1.16, 0.7, 1.9, 0.08), win: R(-2.11, -1.41, 1.22, 1.74, 0.08), hinge: -1.16 },
};
const WINDOWS: { side: 1 | -1; r: Rect }[] = [
  { side: 1, r: R(1.86, 2.5, 1.24, 1.76) }, { side: 1, r: R(0.68, 1.24, 1.22, 1.74) }, { side: 1, r: R(-1.06, -0.5, 1.22, 1.74) }, { side: 1, r: R(-1.92, -1.36, 1.22, 1.74) },
  { side: -1, r: R(0.68, 1.24, 1.22, 1.74) }, { side: -1, r: R(-0.2, 0.36, 1.22, 1.74) }, { side: -1, r: R(-1.06, -0.5, 1.22, 1.74) },
];
/** row x positions (seat cushion centre) and the seat each character uses */
export const ROWS = [1.98, 1.06, 0.2, -0.66, -1.52];
export const SEAT_Z = 0.27;
const isWindscreen = (x: number, y: number, z: number) => x > CAB.x1 + 0.06 && x < 3.26 && y > section(x).yt - 0.32 && Math.abs(z) < 0.52;
type Bucket = "white" | "navy" | "teal" | "belly" | "glass" | DoorId;
/** cheat line height along the fuselage (sweeps up toward the tail) */
const cheat = (x: number) => 1.04 + 0.42 * sm(-2.4, -5.4, x) - 0.12 * sm(3.2, 5.0, x);
const classify = (x: number, y: number, z: number): Bucket => {
  const side = z > 0 ? 1 : -1, flat = Math.abs(z) > section(x).hw - 0.03;
  if (isWindscreen(x, y, z)) return "glass";
  if (flat) {
    for (const w of WINDOWS) if (w.side === side && inRR(w.r, x, y)) return "glass";
    for (const [id, d] of Object.entries(DOORS) as [DoorId, typeof DOORS["rear"]][]) if (d.side === side && inRR(d.rect, x, y)) return inRR(d.win, x, y) ? "glass" : id;
  }
  void cheat;
  return "white";
};
const doorPaint = (_x: number, _y: number) => "paint";

// ---------------------------------------------------------------- fuselage build
type Tri = { pos: number[]; nrm: number[]; uv: number[] };
const tri = (): Tri => ({ pos: [], nrm: [], uv: [] });
const geoOf = (t: Tri) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(t.pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(t.nrm, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(t.uv, 2)); return g; };
const buildHull = () => {
  const NX = Math.round((FUS.nose - FUS.tail) / 0.02) + 1, xs = Array.from({ length: NX }, (_, i) => FUS.tail + (i / (NX - 1)) * (FUS.nose - FUS.tail));
  const P = new Float32Array(NX * M * 3), N = new Float32Array(NX * M * 3), U = new Float32Array(NX * M), tmp = new Float32Array(M * 2);
  xs.forEach((x, i) => { const L = ring(section(x), tmp); for (let j = 0; j < M; j++) { const k = (i * M + j) * 3; P[k] = x; P[k + 1] = tmp[j * 2 + 1]; P[k + 2] = tmp[j * 2]; U[i * M + j] = (j / M) * L; } });
  const at = (i: number, j: number) => ((Math.min(NX - 1, Math.max(0, i)) * M) + ((j + M) % M)) * 3;
  for (let i = 0; i < NX; i++) for (let j = 0; j < M; j++) {
    const a = at(i, j + 1), b = at(i, j - 1), c = at(i + 1, j), d = at(i - 1, j);
    const tj = [P[a] - P[b], P[a + 1] - P[b + 1], P[a + 2] - P[b + 2]], ti = [P[c] - P[d], P[c + 1] - P[d + 1], P[c + 2] - P[d + 2]];
    let n = [tj[1] * ti[2] - tj[2] * ti[1], tj[2] * ti[0] - tj[0] * ti[2], tj[0] * ti[1] - tj[1] * ti[0]]; // ring runs top -> starboard -> bottom: tj x ti points outward
    const l = Math.hypot(n[0], n[1], n[2]); if (l < 1e-9) n = [Math.sign(xs[i]) || 1, 0, 0]; else n = n.map((v) => v / l);
    const k = (i * M + j) * 3; N[k] = n[0]; N[k + 1] = n[1]; N[k + 2] = n[2];
  }
  const B: Record<string, Tri> = {}, get = (k: string) => (B[k] ??= tri());
  const liner = tri(), linerDoor: Record<DoorId, Tri> = { pilot: tri(), stbd: tri(), rear: tri() };
  const push = (t: Tri, ids: [number, number][], inset = 0, flip = false) => {
    const order = flip ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];   // outward = CCW seen from outside
    for (const o of order) { const [i, j] = ids[o], k = at(i, j); const s = flip ? -1 : 1;
      t.pos.push(P[k] - N[k] * inset, P[k + 1] - N[k + 1] * inset, P[k + 2] - N[k + 2] * inset); t.nrm.push(N[k] * s, N[k + 1] * s, N[k + 2] * s); t.uv.push(U[Math.min(NX - 1, i) * M + ((j + M) % M)], xs[Math.min(NX - 1, i)]); }
  };
  for (let i = 0; i < NX - 1; i++) for (let j = 0; j < M; j++) {
    const ids: [number, number][] = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
    const c0 = at(i, j), c2 = at(i + 1, j + 1); const cx = (P[c0] + P[c2]) / 2, cy = (P[c0 + 1] + P[c2 + 1]) / 2, cz = (P[c0 + 2] + P[c2 + 2]) / 2;
    const b = classify(cx, cy, cz);
    if (b === "pilot" || b === "stbd" || b === "rear") { push(get(`${b}:${doorPaint(cx, cy)}`), ids); push(linerDoor[b], ids, 0.034, true); continue; }
    push(get(b), ids);
    if (b !== "glass" && cx > -2.55 && cx < 3.3 && !(cy < 0.66)) push(liner, ids, 0.034, true);   // inner liner (not the floor pan)
  }
  // tail cap
  const capT = tri(), i0 = 0; for (let j = 0; j < M; j++) { const a = at(i0, j), b2 = at(i0, j + 1); capT.pos.push(FUS.tail, P[a + 1], 0, P[b2], P[b2 + 1], P[b2 + 2], P[a], P[a + 1], P[a + 2]); for (let q = 0; q < 3; q++) capT.nrm.push(-1, 0, 0); capT.uv.push(0, 0, 0.1, 0, 0, 0.1); }
  const cy0 = (section(FUS.tail).yb + section(FUS.tail).yt) / 2; for (let q = 0; q < capT.pos.length; q += 9) capT.pos[q + 1] = cy0;
  return { B, liner, linerDoor, capT };
};

// ---------------------------------------------------------------- generic loft (ellipse rings) for nacelles, spinners, fairings
const loftEll = (st: { x: number; cy: number; cz?: number; rz: number; ry: number }[], seg = 28) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  st.forEach((s, i) => { for (let j = 0; j <= seg; j++) { const a = (j / seg) * Math.PI * 2; pos.push(s.x, s.cy + Math.cos(a) * s.ry, (s.cz ?? 0) + Math.sin(a) * s.rz); uv.push((j / seg) * Math.PI * (s.rz + s.ry), s.x); } });
  for (let i = 0; i < st.length - 1; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  // computeVertexNormals points inward for this winding when x decreases; make normals point away from the axis
  const P = g.attributes.position as THREE.BufferAttribute, Nn = g.attributes.normal as THREE.BufferAttribute;
  let flip = 0; for (let k = 0; k < P.count; k += 7) { const s = st[Math.floor(k / (seg + 1))]; const dy = P.getY(k) - s.cy, dz = P.getZ(k) - (s.cz ?? 0); flip += Nn.getY(k) * dy + Nn.getZ(k) * dz; }
  if (flip < 0) { for (let k = 0; k < Nn.count; k++) Nn.setXYZ(k, -Nn.getX(k), -Nn.getY(k), -Nn.getZ(k)); for (let k = 0; k < idx.length; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; } g.setIndex(idx); }
  return g;
};
/** airfoil (NACA 4-digit-like) as a 2D outline in (x, y): LE at x = le, TE at le - chord, centred on y0 */
const airfoil = (le: number, chord: number, y0: number, t = 0.13, camber = 0.02, n = 26): [number, number][] => {
  const up: [number, number][] = [], lo: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const xc = 0.5 - 0.5 * Math.cos((i / n) * Math.PI); const yt = 5 * t * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc * xc + 0.2843 * xc ** 3 - 0.1036 * xc ** 4), yc = camber * (xc < 0.4 ? (2 * 0.4 * xc - xc * xc) / 0.16 : ((1 - 0.8) + 2 * 0.4 * xc - xc * xc) / 0.36);
    up.push([le - xc * chord, y0 + (yc + yt) * chord]); lo.push([le - xc * chord, y0 + (yc - yt) * chord]); }
  return [...up.reverse(), ...lo.slice(1)];
};

// ---------------------------------------------------------------- static parts
export const WING = { le: 2.35, chord: 2.08, y: 2.0, semi: 7.47, eng: 1.88 };
export const ENG_Z = [-WING.eng, WING.eng];
const buildStatic = () => {
  const m = fMats(), K = new Kit(), H = buildHull();
  const matOf: Record<string, THREE.Material> = { white: livery(), glass: m.glass };
  for (const [k, t] of Object.entries(H.B)) if (!k.includes(":")) K.add(matOf[k], geoOf(t), [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: k === "glass" ? false : 0.55, cast: k !== "glass" });
  K.add(m.white, geoOf(H.capT), [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: false });
  // ---- wing: centre box over the cabin + two panels; flaps/ailerons are separate (they move)
  const yW = WING.y + 0.03, prof = airfoil(WING.le, WING.chord, yW + 0.12, 0.14, 0.02), mainProf = prof.filter(([x]) => x >= WING.le - WING.chord * 0.74);
  const box = [...mainProf, [WING.le - WING.chord * 0.745, yW + 0.07] as [number, number], [WING.le - WING.chord * 0.745, yW + 0.2] as [number, number]];
  K.ext(m.white, mainProf, WING.semi * 2 - 0.12, [0, 0, 0], [0, 0, 0], 0, { ink: 0.6 });
  // false spar / flap well (dark) behind the main box, under the flaps
  K.box(m.gap, [0.04, 0.16, WING.semi * 2 - 0.4], [WING.le - WING.chord * 0.755, yW + 0.13, 0], [0, 0, 0], { ink: false });
  void box;
  // rounded tips (raked fairing)
  for (const s of [-1, 1]) {
    const tipProf = airfoil(WING.le - 0.04, WING.chord - 0.1, yW + 0.12, 0.1, 0.01);
    K.ext(m.white, tipProf, 0.16, [0, 0, s * (WING.semi - 0.02)], [0, 0, 0], 0.03, { ink: 0.6 });
    // nav light (red port / green starboard) + white strobe in a clear lens
    K.sphere(s < 0 ? m.navRed : m.navGreen, 0.035, [WING.le - 0.35, yW + 0.12, s * (WING.semi + 0.08)], [1, 1, 1], { ink: false });
    K.sphere(m.lens, 0.05, [WING.le - 0.35, yW + 0.12, s * (WING.semi + 0.06)], [1.6, 0.8, 0.6], { ink: false });
    // static wicks on the trailing edge
    for (const dz of [0.3, 0.7]) K.rod(m.darkMetal, [WING.le - WING.chord + 0.02, yW + 0.12, s * (WING.semi - dz)], [WING.le - WING.chord - 0.13, yW + 0.12, s * (WING.semi - dz)], 0.006, 5, { ink: false });
  }
  // wing walk + fuel caps
  for (const s of [-1, 1]) for (const dz of [2.9, 5.6]) K.cyl(m.darkMetal, 0.05, 0.05, 0.012, [WING.le - 0.7, yW + 0.27, s * dz], [0, 0, 0], 12, { ink: false });
  // ---- engine nacelles (slender, slung under the wing) + exhaust + intake
  for (const z of ENG_Z) {
    const st = [
      { x: 3.34, cy: 1.84, rz: 0.06, ry: 0.06 }, { x: 3.3, cy: 1.84, rz: 0.27, ry: 0.27 }, { x: 3.12, cy: 1.85, rz: 0.36, ry: 0.36 }, { x: 2.7, cy: 1.86, rz: 0.39, ry: 0.42 },
      { x: 2.2, cy: 1.86, rz: 0.39, ry: 0.43 }, { x: 1.6, cy: 1.84, rz: 0.36, ry: 0.43 }, { x: 0.8, cy: 1.84, rz: 0.3, ry: 0.36 }, { x: 0.1, cy: 1.9, rz: 0.2, ry: 0.24 }, { x: -0.45, cy: 1.98, rz: 0.06, ry: 0.08 }];
    K.add(m.white, loftEll(st.map((s) => ({ ...s, cz: z })), 32), [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: 0.55 });
    // cooling inlets either side of the spinner, exhaust stack (outboard, low) + soot streak on the nacelle side
    for (const s of [-1, 1]) K.add(m.intake, new THREE.BoxGeometry(0.03, 0.07, 0.1), [3.305, 1.84 - 0.13, z + s * 0.15], [0, 0, 0], [1, 1, 1], { ink: false });
    const ox = z > 0 ? 1 : -1;
    K.rod(m.exhaust, [2.3, 1.58, z + ox * 0.33], [1.85, 1.52, z + ox * 0.36], 0.045, 10, { ink: 0.4 });
    K.add(m.soot, new THREE.PlaneGeometry(1.4, 0.32), [1.15, 1.64, z + ox * 0.37], [0, ox > 0 ? 0 : Math.PI, 0], [1, 1, 1], { ink: false, cast: false });
    // cowling seams
    for (const x of [2.95, 2.0]) K.add(m.gap, new THREE.TorusGeometry(1, 0.006, 4, 40), [x, 1.855, z], [0, Math.PI / 2, 0], [0.4, 0.43, 0.4], { ink: false, cast: false });
    // main gear: streamlined leg from the nacelle to the axle, drag brace, axle fairing
    const ax = 0.62, ay = 0.33;
    K.add(m.strut, new THREE.CylinderGeometry(0.06, 0.075, 1.38, 14), [ax + 0.12, 1.02, z], [0, 0, -0.17], [1.9, 1, 0.75], { ink: 0.5 });
    K.add(m.darkMetal, new THREE.CylinderGeometry(0.05, 0.05, 0.62, 12), [ax, ay, z], [Math.PI / 2, 0, 0], [1, 1, 1], { ink: 0.4 });
    K.add(m.strut, new THREE.SphereGeometry(0.13, 16, 10), [ax + 0.02, ay + 0.09, z], [0, 0, 0], [1.6, 0.8, 0.8], { ink: 0.4 });
  }
  // nose gear: oleo, torque link, fork; landing/taxi light in the nose
  K.add(m.strut, new THREE.CylinderGeometry(0.05, 0.05, 0.5, 12), [3.98, 0.58, 0], [0, 0, 0.12], [1, 1, 1], { ink: 0.45 });
  K.add(m.chrome, new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), [3.96, 0.38, 0], [0, 0, 0.12], [1, 1, 1], { ink: 0.3 });
  K.add(m.navWhite, new THREE.SphereGeometry(0.05, 12, 8), [FUS.nose - 0.02, 1.05, 0], [0, 0, 0], [0.5, 1, 1], { ink: false });
  // ---- tail: dorsal fillet + fin (swept), tailplane, beacon, tail light
  const fin: [number, number][] = [[-3.25, 1.98], [-4.15, 2.35], [-4.95, 4.15], [-5.42, 4.18], [-5.42, 2.0], [-5.2, 1.86]];
  K.ext(m.teal, fin, 0.13, [0, 0, 0], [0, 0, 0], 0.025, { ink: 0.6 });
  // white wave band across the fin (decorative, no logo)
  K.ext(m.white, [[-4.3, 2.75], [-4.62, 3.45], [-5.0, 3.28], [-5.42, 3.25], [-5.42, 2.95], [-5.0, 2.98], [-4.62, 3.12], [-4.42, 2.72]], 0.15, [0, 0, 0], [0, 0, 0], 0.012, { ink: false });
  K.sphere(m.beacon, 0.06, [-5.15, 4.22, 0], [1, 0.9, 1], { ink: false });
  K.sphere(m.navWhite, 0.03, [-5.75, 2.02, 0], [1, 1, 1], { ink: false });
  const tp: [number, number][] = [[-4.25, 0], [-4.32, 2.33], [-4.62, 2.36], [-4.92, 2.33], [-4.92, 0]];
  for (const s of [-1, 1]) K.ext(m.white, tp.map(([x, zz]) => [x, zz] as [number, number]), 0.09, [0, 1.92, 0], [s > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0], 0.02, { ink: 0.55 });
  // ---- details: pitot, roof antennas, steps under the doors, door outlines, handles, registration
  K.rod(m.chrome, [1.2, yW + 0.05, -4.8], [2.65, yW + 0.05, -4.8], 0.012, 6, { ink: false });
  K.add(m.rubber, new THREE.BoxGeometry(0.3, 0.02, 0.05), [0.6, FUS.roof + 0.33, 0], [0, 0, -0.3], [1, 1, 1], { ink: false });
  K.rod(m.darkMetal, [-1.6, FUS.roof + 0.03, 0], [-2.3, FUS.roof + 0.6, 0], 0.008, 5, { ink: false });
  K.add(m.rubber, new THREE.BoxGeometry(0.45, 0.012, 0.06), [-3.1, 0.62 + 0.25, 0.2], [0, 0, 0], [1, 1, 1], { ink: false });
  for (const [id, d] of Object.entries(DOORS) as [DoorId, typeof DOORS["rear"]][]) {
    const z = d.side * (FUS.hw + 0.004), q = d.rect;
    // door gap outline (dark, very thin, proud by 4 mm)
    K.rod(m.gap, [q.x0 + q.r, q.y1, z], [q.x1 - q.r, q.y1, z], 0.006, 4, { ink: false }); K.rod(m.gap, [q.x0 + q.r, q.y0, z], [q.x1 - q.r, q.y0, z], 0.006, 4, { ink: false });
    K.rod(m.gap, [q.x0, q.y0 + q.r, z], [q.x0, q.y1 - q.r, z], 0.006, 4, { ink: false }); K.rod(m.gap, [q.x1, q.y0 + q.r, z], [q.x1, q.y1 - q.r, z], 0.006, 4, { ink: false });
    if (id !== "pilot") K.box(m.darkMetal, [0.32, 0.025, 0.2], [(q.x0 + q.x1) / 2, 0.42, d.side * (FUS.hw + 0.1)], [0, 0, 0], { ink: 0.3 });   // step
    if (id !== "pilot") { K.rod(m.darkMetal, [(q.x0 + q.x1) / 2 - 0.1, 0.55, d.side * (FUS.hw + 0.02)], [(q.x0 + q.x1) / 2 - 0.1, 0.42, d.side * (FUS.hw + 0.1)], 0.01, 5, { ink: false }); K.rod(m.darkMetal, [(q.x0 + q.x1) / 2 + 0.1, 0.55, d.side * (FUS.hw + 0.02)], [(q.x0 + q.x1) / 2 + 0.1, 0.42, d.side * (FUS.hw + 0.1)], 0.01, 5, { ink: false }); }
  }
  // circumferential panel lines (thin dark rings) at a few stations
  for (const x of [3.32, -2.72, -3.9, -4.9]) { const s = section(x), tmp = new Float32Array(M * 2); ring(s, tmp); for (let j = 0; j < M; j += 1) { const a = j, b = (j + 1) % M; K.rod(m.gap, [x, tmp[a * 2 + 1], tmp[a * 2] * 1.006], [x, tmp[b * 2 + 1], tmp[b * 2] * 1.006], 0.004, 3, { ink: false, cast: false }); } }
  // window frames (rubber seal rings, inside + outside) on the flat walls
  const frame = (side: number, q: Rect) => {
    const rr = (g: number): [number, number][] => { const pts: [number, number][] = []; const cx = (q.x0 + q.x1) / 2, cy = (q.y0 + q.y1) / 2, hx = (q.x1 - q.x0) / 2 + g, hy = (q.y1 - q.y0) / 2 + g, r = Math.min(q.r + g, hx, hy);
      for (const [qx, qy, a0] of [[1, 1, 0], [-1, 1, Math.PI / 2], [-1, -1, Math.PI], [1, -1, Math.PI * 1.5]] as [number, number, number][]) for (let k = 0; k <= 6; k++) { const a = a0 + (k / 6) * Math.PI / 2; pts.push([cx + qx * (hx - r) + Math.cos(a) * r, cy + qy * (hy - r) + Math.sin(a) * r]); } return pts; };
    K.ext(m.seal, rr(0.032), 0.012, [0, 0, side * (FUS.hw + 0.006)], [0, 0, 0], 0, { ink: false }, [rr(-0.004).reverse()]);
    K.ext(m.linerDark, rr(0.04), 0.012, [0, 0, side * (FUS.hw - 0.04)], [0, 0, 0], 0, { ink: false }, [rr(-0.004).reverse()]);
    // reveal (the sill between skin and liner)
    K.ext(m.linerDark, rr(0.002), 0.04, [0, 0, side * (FUS.hw - 0.017)], [0, 0, 0], 0, { ink: false }, [rr(-0.006).reverse()]);
  };
  for (const w of WINDOWS) frame(w.side, w.r);
  // windscreen centre post + frame
  K.rod(m.seal, [CAB.x1 + 0.05, FUS.roof + 0.03, 0], [3.27, 1.6, 0], 0.022, 6, { ink: 0.3 });
  // registration (fictional) on the rear fuselage, both sides
  for (const s of [-1, 1]) K.add(m.reg, new THREE.PlaneGeometry(1.15, 0.29), [-3.55, 1.48, s * (section(-3.55).hw + 0.006)], [0, s > 0 ? 0 : Math.PI, 0], [1, 1, 1], { ink: false, cast: false });
  return { K, H };
};

// ---------------------------------------------------------------- moving parts
const blade = () => {   // one prop blade from the hub out to r = 0.99 m, twisted, rounded tip; built along +y
  const pos: number[] = [], idx: number[] = [], uv: number[] = [], n = 22, ch = 10;
  for (let i = 0; i <= n; i++) { const r = 0.1 + (i / n) * 0.89, c = (0.075 + 0.07 * Math.sin(Math.min(1, (r - 0.1) / 0.5) * Math.PI * 0.5)) * (r > 0.88 ? Math.sqrt(Math.max(0.05, 1 - ((r - 0.88) / 0.115) ** 2)) : 1), tw = Math.atan(0.42 / (2 * Math.PI * Math.max(r, 0.15))) * 1.1, th = 0.018 * (1 - 0.6 * (i / n));
    for (let k = 0; k <= ch; k++) { const a = (k / ch) * Math.PI * 2, lx = Math.cos(a) * c / 2, ly = Math.sin(a) * th;   // ellipse-ish section (chord along x', thickness along z')
      pos.push(lx * Math.cos(tw) - ly * Math.sin(tw), r, lx * Math.sin(tw) + ly * Math.cos(tw)); uv.push(k / ch, r); } }
  for (let i = 0; i < n; i++) for (let k = 0; k < ch; k++) { const a = i * (ch + 1) + k, b = a + ch + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
};
const buildProp = () => { const m = fMats(), K = new Kit(), b = blade();
  for (const s of [0, Math.PI]) { K.add(m.propBlack, b, [0, 0, 0], [s, 0, 0], [1, 1, 1], { ink: 0.35 }); }
  // yellow tips (overlay the outer 9 cm, slightly fatter so they win the depth test)
  const tip = new THREE.CylinderGeometry(0.004, 0.004, 0.0, 3);
  void tip;
  return K; };
const buildPropTips = () => { const m = fMats(), K = new Kit(); const b = blade(); const P = b.attributes.position as THREE.BufferAttribute;
  // copy only the outer part of the blade, pushed out by 1.5 mm along the normal
  const g = b.clone(); const Pp = g.attributes.position as THREE.BufferAttribute, Nn = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < Pp.count; i++) Pp.setXYZ(i, Pp.getX(i) + Nn.getX(i) * 0.0015, Pp.getY(i), Pp.getZ(i) + Nn.getZ(i) * 0.0015);
  const idx = g.index!.array, keep: number[] = []; for (let i = 0; i < idx.length; i += 3) { if (P.getY(idx[i]) > 0.9 && P.getY(idx[i + 1]) > 0.9 && P.getY(idx[i + 2]) > 0.9) keep.push(idx[i], idx[i + 1], idx[i + 2]); } g.setIndex(keep);
  for (const s of [0, Math.PI]) K.add(m.propTip, g, [0, 0, 0], [s, 0, 0], [1, 1, 1], { ink: false });
  return K; };
const buildSpinner = () => { const m = fMats(), K = new Kit();
  K.lathe(m.spinner, [[0.16, 0.0], [0.155, 0.08], [0.135, 0.18], [0.1, 0.27], [0.05, 0.31], [0.0, 0.32]], [0, 0, 0], 24, [0, 0, -Math.PI / 2], { ink: 0.45 });
  return K; };
const buildWheel = (r: number, w: number) => { const m = fMats(), K = new Kit();
  const prof: [number, number][] = []; for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + (i / 16) * Math.PI; prof.push([r - 0.08 + Math.cos(a) * 0.08, Math.sin(a) * w / 2]); }
  K.lathe(m.tire, prof, [0, 0, 0], 28, [Math.PI / 2, 0, 0], { ink: 0.5 });
  K.cyl(m.hub, r * 0.55, r * 0.55, w * 0.7, [0, 0, 0], [Math.PI / 2, 0, 0], 20, { ink: 0.35 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; K.cyl(m.darkMetal, 0.012, 0.012, w * 0.74, [Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, 0], [Math.PI / 2, 0, 0], 6, { ink: false }); }   // bolt heads -> visible rotation
  K.box(m.darkMetal, [r * 0.7, 0.03, w * 0.72], [0, 0, 0], [0, 0, 0], { ink: false });
  return K; };
// flap / aileron (one surface, hinged at its leading edge, built with the hinge at the origin)
const buildSurface = (z0: number, z1: number) => { const m = fMats(), K = new Kit(); const yW = WING.y + 0.03;
  const prof = airfoil(WING.le, WING.chord, yW + 0.12, 0.14, 0.02).filter(([x]) => x < WING.le - WING.chord * 0.75).map(([x, y]) => [x, y] as [number, number]);
  const hx = WING.le - WING.chord * 0.76, hy = yW + 0.1; const closed: [number, number][] = [[hx, hy + 0.07], ...prof, [hx, hy - 0.05]];
  K.ext(m.white, closed.map(([x, y]) => [x - hx, y - hy] as [number, number]), z1 - z0 - 0.02, [0, 0, (z0 + z1) / 2], [0, 0, 0], 0, { ink: 0.5 });
  return { K, hinge: [hx, hy] as [number, number] }; };
const SURF = { flapIn: [0.66, 1.42], flapOut: [2.32, 4.42], ail: [4.46, 7.1] } as const;
const buildDoor = (id: DoorId, H: ReturnType<typeof buildHull>) => { const m = fMats(), K = new Kit(), d = DOORS[id];
  for (const [k, t] of Object.entries(H.B)) if (k.startsWith(`${id}:`)) K.add(livery([d.hinge, 0, d.side * FUS.hw]), geoOf(t), [-d.hinge, 0, -d.side * FUS.hw], [0, 0, 0], [1, 1, 1], { ink: 0.4 });
  K.add(m.liner, geoOf(H.linerDoor[id]), [-d.hinge, 0, -d.side * FUS.hw], [0, 0, 0], [1, 1, 1], { ink: false });
  // door window glass + seal (moves with the door)
  const q = d.win, cx = (q.x0 + q.x1) / 2 - d.hinge, cy = (q.y0 + q.y1) / 2;
  K.add(m.glass, new THREE.PlaneGeometry(q.x1 - q.x0, q.y1 - q.y0), [cx, cy, d.side * 0.004], [0, d.side > 0 ? 0 : Math.PI, 0], [1, 1, 1], { ink: false, cast: false });
  K.box(m.seal, [q.x1 - q.x0 + 0.05, 0.03, 0.02], [cx, q.y1 + 0.012, d.side * 0.006], [0, 0, 0], { ink: false }); K.box(m.seal, [q.x1 - q.x0 + 0.05, 0.03, 0.02], [cx, q.y0 - 0.012, d.side * 0.006], [0, 0, 0], { ink: false });
  K.box(m.seal, [0.03, q.y1 - q.y0 + 0.05, 0.02], [q.x0 - 0.012 - d.hinge, cy, d.side * 0.006], [0, 0, 0], { ink: false }); K.box(m.seal, [0.03, q.y1 - q.y0 + 0.05, 0.02], [q.x1 + 0.012 - d.hinge, cy, d.side * 0.006], [0, 0, 0], { ink: false });
  // edge strips (door thickness, so an open door is not paper-thin) + handle
  const r = d.rect; for (const [a, b] of [[[r.x0, r.y0], [r.x0, r.y1]], [[r.x0, r.y1], [r.x1, r.y1]], [[r.x0, r.y0], [r.x1, r.y0]]] as [number, number][][]) K.rod(m.linerDark, [a[0] - d.hinge, a[1], -d.side * 0.017], [b[0] - d.hinge, b[1], -d.side * 0.017], 0.018, 4, { ink: false });
  K.box(m.chrome, [0.14, 0.025, 0.025], [r.x0 + 0.12 - d.hinge, 1.12, d.side * 0.02], [0, 0, 0], { ink: 0.3 });
  return K; };

// ---------------------------------------------------------------- cabin + cockpit interior
const buildCabin = () => { const m = fMats(), K = new Kit(), H = buildHull();
  K.add(m.liner, geoOf(H.liner), [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: false, cast: false });
  K.box(m.carpet, [CAB.x1 + 0.4 - (CAB.x0 + 0.2), 0.03, 1.1], [((CAB.x1 + 0.4) + (CAB.x0 + 0.2)) / 2, FUS.floor - 0.015, 0], [0, 0, 0], { ink: false, cast: false });
  // benches (rows 2-5): base, cushion, reclined back with a centre seam, frame legs, lap belts (stowed)
  ROWS.forEach((rx, i) => {
    const bench = i > 0, w = bench ? 1.08 : 0.42;
    for (const zc of bench ? [0] : [-SEAT_Z, SEAT_Z]) {
      K.box(m.seatFrame, [0.42, 0.26, w], [rx, FUS.floor + 0.13, zc], [0, 0, 0], { ink: 0.35 });
      K.box(m.fabric, [0.46, 0.1, w + 0.02], [rx + 0.02, FUS.floor + 0.3, zc], [0, 0, 0], { ink: 0.35 });
      K.box(m.fabric, [0.11, 0.6, w + 0.02], [rx - 0.25, FUS.floor + 0.63, zc], [0, 0, 0.17], { ink: 0.35 });
      K.box(m.seatFrame, [0.04, 0.04, w + 0.04], [rx - 0.33, FUS.floor + 0.92, zc], [0, 0, 0], { ink: 0.3 });   // grab rail on the back
      if (bench) { K.box(m.seatFrame, [0.5, 0.012, 0.02], [rx + 0.02, FUS.floor + 0.353, 0], [0, 0, 0], { ink: false }); K.box(m.seatFrame, [0.02, 0.6, 0.02], [rx - 0.19, FUS.floor + 0.63, 0], [0, 0, 0.17], { ink: false }); }
    }
  });
  // cockpit: panel + glareshield + yokes + throttle quadrant + compass
  K.box(m.panelBody, [0.18, 0.3, 1.12], [2.88, 1.42, 0], [0, 0, -0.12], { ink: 0.35 });
  K.add(m.panel, new THREE.PlaneGeometry(1.08, 0.27), [2.785, 1.42, 0], [0, -Math.PI / 2, 0.12], [1, 1, 1], { ink: false, cast: false });
  K.box(m.panelBody, [0.3, 0.05, 1.1], [2.88, 1.6, 0], [0, 0, -0.1], { ink: 0.3 });
  for (const z of [-SEAT_Z, SEAT_Z]) { K.rod(m.yoke, [2.79, 1.3, z], [2.5, 1.3, z], 0.018, 8, { ink: 0.3 }); K.box(m.yoke, [0.04, 0.05, 0.3], [2.5, 1.32, z], [0, 0, 0], { ink: 0.3 }); for (const s of [-1, 1]) K.box(m.yoke, [0.04, 0.12, 0.04], [2.5, 1.38, z + s * 0.14], [0, 0, 0], { ink: 0.3 }); }
  K.box(m.panelBody, [0.22, 0.18, 0.14], [2.62, 1.12, 0], [0, 0, 0.3], { ink: 0.3 });
  for (const dz of [-0.035, 0, 0.035]) K.rod(m.chrome, [2.58, 1.2, dz], [2.5, 1.32, dz], 0.008, 5, { ink: false });
  K.sphere(m.panelBody, 0.04, [2.86, 1.63, 0], [1, 0.8, 1], { ink: false });
  // overhead fresh-air vents / reading lights along the roof
  for (const rx of ROWS.slice(1)) for (const s of [-1, 1]) K.cyl(m.chrome, 0.025, 0.03, 0.025, [rx + 0.1, FUS.roof - 0.045, s * 0.3], [0, 0, 0], 12, { ink: false });
  // rear bulkhead + baggage net
  K.box(m.linerDark, [0.03, 1.1, 1.1], [-2.42, 1.25, 0], [0, 0, 0], { ink: false });
  for (let i = 0; i < 6; i++) K.rod(m.belt, [-2.39, 0.8 + i * 0.16, -0.5], [-2.39, 0.8 + i * 0.16, 0.5], 0.006, 4, { ink: false });
  // stowed lap belts (hang down the cushion front)
  ROWS.slice(1).forEach((rx) => { for (const z of [-0.45, -0.09, 0.09, 0.45]) K.box(m.belt, [0.012, 0.16, 0.045], [rx + 0.24, FUS.floor + 0.24, z], [0, 0, 0], { ink: false }); });
  return K; };

// ---------------------------------------------------------------- state + component
export type IslanderState = {
  prop: [number, number]; rps: [number, number];   // blade angle (rad) and revolutions per second, port + starboard
  flap: number;                                     // 0 up .. 1 full (landing)
  ail: number; rud: number; elev: number;            // control deflections (rad, small)
  door: Partial<Record<DoorId, number>>;            // 0 shut .. 1 open
  wheel: number; nose: number;                      // wheel roll angle (rad), nose wheel steering (rad)
  beacon: number; strobe: number;                   // 0..1 flashes
  cabin?: boolean;                                  // build the interior (only when the camera can see inside)
};
export const STILL: IslanderState = { prop: [0.4, 1.7], rps: [0, 0], flap: 0, ail: 0, rud: 0, elev: 0, door: {}, wheel: 0, nose: 0, beacon: 0, strobe: 0 };
const kits = () => once("islander", () => { const s = buildStatic(); return {
  st: s.K, cabin: buildCabin(), prop: buildProp(), tips: buildPropTips(), spinner: buildSpinner(), wheelM: buildWheel(0.3, 0.2), wheelN: buildWheel(0.24, 0.16),
  surf: { flapIn: buildSurface(SURF.flapIn[0], SURF.flapIn[1]), flapOut: buildSurface(SURF.flapOut[0], SURF.flapOut[1]), ail: buildSurface(SURF.ail[0], SURF.ail[1]),
    flapInP: buildSurface(-SURF.flapIn[1], -SURF.flapIn[0]), flapOutP: buildSurface(-SURF.flapOut[1], -SURF.flapOut[0]), ailP: buildSurface(-SURF.ail[1], -SURF.ail[0]) },
  doors: { pilot: buildDoor("pilot", s.H), stbd: buildDoor("stbd", s.H), rear: buildDoor("rear", s.H) },
}; });
/** spinning prop: crisp blades when slow; motion-blurred copies across this frame's sweep when fast; a soft disc at speed */
const Prop: React.FC<{ ang: number; rps: number; ccw?: boolean }> = ({ ang, rps, ccw }) => {
  const k = kits(), m = fMats(); const sweep = Math.abs(rps) * Math.PI * 2 / 30 * 0.5;   // 180-degree shutter
  const blur = Math.min(1, Math.max(0, (sweep - 0.12) / 0.8)), copies = sweep < 0.12 ? 1 : sweep < 0.5 ? 4 : 6;
  const mats = useMemo(() => { const b = (m.propBlack as THREE.MeshStandardMaterial).clone(); b.transparent = true; b.depthWrite = false; const t = (m.propTip as THREE.MeshStandardMaterial).clone(); t.transparent = true; t.depthWrite = false; return { b, t }; }, [m]);
  const dir = ccw ? -1 : 1;
  if (copies === 1) return <group rotation={[dir * ang, 0, 0]}><KitMesh kit={k.prop} /><KitMesh kit={k.tips} /></group>;
  mats.b.opacity = Math.max(0.04, (1 - blur * 0.9) / copies * 1.8); mats.t.opacity = mats.b.opacity * 1.2;
  const parts = k.prop.build(), tips = k.tips.build();
  return (<group>
    {Array.from({ length: copies }, (_, i) => { const a = dir * (ang - sweep * (i / (copies - 1))); return <group key={i} rotation={[a, 0, 0]}>{parts.map((p, j) => <mesh key={j} geometry={p.geo} material={mats.b} />)}{tips.map((p, j) => <mesh key={`t${j}`} geometry={p.geo} material={mats.t} />)}</group>; })}
    {blur > 0.05 && <mesh rotation={[0, Math.PI / 2, 0]} material={m.propDisc} renderOrder={2} scale={[1, 1, 1]}><circleGeometry args={[0.99, 48]} /></mesh>}
  </group>);
};
export const PROP_X = 3.44;
export const Islander: React.FC<{ s: IslanderState }> = ({ s }) => {
  const k = kits(), m = fMats();
  (m.beacon as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + 5.5 * s.beacon; (m.strobe as THREE.MeshStandardMaterial).emissiveIntensity = 0.3 + 9 * s.strobe;
  const surf = (key: keyof ReturnType<typeof kits>["surf"], rot: number) => { const S = k.surf[key]; return <group position={[S.hinge[0], S.hinge[1], 0]} rotation={[0, 0, -rot]}><KitMesh kit={S.K} /></group>; };
  return (
    <group>
      <KitMesh kit={k.st} />
      {s.cabin && <KitMesh kit={k.cabin} />}
      {surf("flapIn", s.flap * 0.5)}{surf("flapOut", s.flap * 0.5)}{surf("flapInP", s.flap * 0.5)}{surf("flapOutP", s.flap * 0.5)}
      {surf("ail", s.ail)}{surf("ailP", -s.ail)}
      {(["pilot", "stbd", "rear"] as DoorId[]).map((id) => { const d = DOORS[id], o = s.door[id] ?? 0;
        return <group key={id} position={[d.hinge, 0, d.side * FUS.hw]} rotation={[0, d.side * o * 1.75, 0]}><KitMesh kit={k.doors[id]} /></group>; })}
      {ENG_Z.map((z, i) => <group key={i} position={[PROP_X, 1.84, z]}><Prop ang={s.prop[i]} rps={s.rps[i]} /><group position={[0.01, 0, 0]}><KitMesh kit={k.spinner} /></group></group>)}
      {ENG_Z.map((z, i) => [-0.16, 0.16].map((dz, j) => <group key={`${i}${j}`} position={[0.62, 0.3, z + dz]} rotation={[0, 0, -s.wheel]}><KitMesh kit={k.wheelM} /></group>))}
      <group position={[3.9, 0.24, 0]} rotation={[0, s.nose, 0]}><group rotation={[0, 0, -s.wheel * 1.25]}><KitMesh kit={k.wheelN} /></group>
        <mesh position={[0.02, 0.1, 0]} material={m.strut}><boxGeometry args={[0.36, 0.04, 0.22]} /></mesh></group>
      <group position={[-5.42, 2.6, 0]} rotation={[0, s.rud, 0]}><mesh position={[-0.16, 0.4, 0]} material={m.teal} castShadow><boxGeometry args={[0.32, 2.9, 0.08]} /></mesh></group>
      {s.strobe > 0.05 && [-1, 1].map((sd) => <pointLight key={sd} position={[WING.le - 0.35, WING.y + 0.15, sd * (WING.semi + 0.2)]} intensity={40 * s.strobe} distance={8} decay={2} color="#ffffff" />)}
      {[-1, 1].map((sd) => <mesh key={sd} position={[WING.le - 0.35, WING.y + 0.15, sd * (WING.semi + 0.12)]} material={m.strobe}><sphereGeometry args={[0.03, 8, 6]} /></mesh>)}
    </group>
  );
};
