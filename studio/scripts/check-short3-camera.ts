// short3: per-frame camera clearance against every moving/parked vehicle, the crane, the building and the ground.
import { camExt } from "../src/productions/short3/timeline";
import { craneAt } from "../src/productions/short3/timeline";
import { carsAt, PARKED, streetcarAt, truckAt } from "../src/productions/short3/life";
import { bldAt, BW, BD, BH, XF, SIDEWALK, FAR_WALK } from "../src/productions/short3/world";
import { NEAR_POLES, FAR_POLES, LAMPS } from "../src/productions/short3/Street";
import { TRESTLE, hqRise, camPose, toLocal, camIntAt } from "../src/productions/short3/timeline";
import { NEW_HQ } from "../src/productions/short3/world";
// static street furniture as vertical columns [x, z, radius, height]
const COLS: [string, number, number, number, number][] = [
  ...[...NEAR_POLES, ...FAR_POLES].map((p) => ["pole", p[0], p[2], 0.45, 9] as [string, number, number, number, number]),
  ...LAMPS.map((p) => ["lamp", p[0], p[2], 0.6, 4.6] as [string, number, number, number, number]),
  ...[-27, -9, 9, 27, 45].map((x) => ["tree", x, FAR_WALK[0] + 2.0, 1.1, 5] as [string, number, number, number, number]),
  ["mailbox", -4.6, SIDEWALK[1] - 0.8, 0.6, 1.6], ["firealarm", -20, SIDEWALK[1] - 0.7, 0.5, 2.7], ["callbox", 24, FAR_WALK[0] + 0.8, 0.6, 2.6],
  ["newsstand", -3, FAR_WALK[0] + 1.6, 1.5, 2.5], ["hydrant", -8, SIDEWALK[1] - 0.6, 0.5, 1], ["hydrant", 31, FAR_WALK[0] + 0.6, 0.5, 1],
  ["trestle", TRESTLE[0], TRESTLE[2], 1.3, 1.3]];
const COL_ON = (n: string, f: number) => n !== "trestle" || (f >= 690 && f < 805);
type Box = { name: string; c: number[]; half: number[]; ry: number };
const extOn = (f: number) => !(f < XF.intExt[0] || (f >= XF.extInt[1] && f < XF.intExt2[0]) || f >= XF.loop[1]);
const inside = (p: number[], b: Box, m: number) => { const dx = p[0] - b.c[0], dz = p[2] - b.c[2], c = Math.cos(-b.ry), s = Math.sin(-b.ry);
  const lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < b.half[0] + m && Math.abs(p[1] - b.c[1]) < b.half[1] + m && Math.abs(lz) < b.half[2] + m; };
let bad = 0; const M = 0.6;
// the switchboard room (building-local) + the raised sashes of bays 1-3: legal camera space; returns null = not in the room,
// "" = fine, or the name of the room obstacle the camera is too close to
const Y0 = 8.8, BAYX = [-6.86, -3.43, 0.0];
const roomOk = (l: number[]): string | null => {
  const y = l[1] - Y0;
  const inWin = BAYX.some((x) => Math.abs(l[0] - x) < 0.55) && l[2] > 8.3 && l[2] < 9.4 && y > 0.8 && y < 1.55;
  const inside = l[0] > -11.3 && l[0] < 4.9 && l[2] > 2.1 && l[2] < 8.45 && y > 0.3 && y < 3.2;
  if (!inWin && !inside) return null;
  const near = (x: number, z: number, r: number) => Math.hypot(l[0] - x, l[2] - z) < r;
  if (near(-6.0, 4.78, 0.7)) return "Mabel"; if (near(-2.8, 5.76, 0.7)) return "Finch";
  if (l[0] < -9.4) return "operators/switchboard";
  if (y < 1.05 && ((Math.abs(l[0] + 6) < 0.95 && Math.abs(l[2] - 5.6) < 0.6) || (Math.abs(l[0] + 2.9) < 0.9 && Math.abs(l[2] - 5.0) < 0.6))) return "desk";
  return "";
};
for (let f = 0; f < 1564; f++) { if (!extOn(f)) continue; const p = camExt(f).pos; const boxes: Box[] = [];
  for (const c of [...carsAt(f), ...PARKED]) boxes.push({ name: `car@${c.p[0].toFixed(1)},${c.p[2].toFixed(1)}`, c: [c.p[0], 0.9, c.p[2]], half: [2.3, 0.95, 0.95], ry: c.ry });
  const s = streetcarAt(f); if (s) boxes.push({ name: "streetcar", c: [s.p[0], 1.8, s.p[2]], half: [7, 2.0, 1.3], ry: s.ry });
  const t = truckAt(f); if (t) boxes.push({ name: "truck", c: [t.p[0], 1.3, t.p[2]], half: [3.4, 1.4, 1.02], ry: 0 });
  const cr = craneAt(f); if (cr.on) boxes.push({ name: "crane", c: [cr.x, 2.2, cr.z], half: [3.6, 2.4, 2.4], ry: 0 });
  const b = bldAt(f); boxes.push({ name: "building", c: [b.p[0], BH / 2, b.p[2]], half: [BW / 2, BH / 2 + 2, BD / 2], ry: b.ry });
  const L = toLocal(camPose(f), p); const inRoom = roomOk(L);
  const hits = boxes.filter((bx) => inside(p, bx, M) && !(bx.name === "building" && inRoom !== null)).map((bx) => bx.name);
  if (inRoom) hits.push(inRoom);
  void 0;
  for (const [n, x, z, r, h] of COLS) if (COL_ON(n, f) && Math.hypot(p[0] - x, p[2] - z) < r + 0.25 && p[1] < h + 0.3) hits.push(n);
  if (hqRise(f) > 0 && p[0] > NEW_HQ.x0 - 0.8 && p[0] < NEW_HQ.x1 + 0.8 && p[2] > NEW_HQ.z0 - 0.8 && p[2] < NEW_HQ.z1 + 0.8 && p[1] < 11 * Math.min(1, hqRise(f) * 1.4) + 1.2) hits.push("HQ steel");
  if (p[1] < 0.5) hits.push(`low y=${p[1].toFixed(2)}`);
  if (hits.length) { bad++; console.log(`frame ${f} cam ${p.map((v) => v.toFixed(2)).join(",")}: ${hits.join(" ")}`); } }
console.log(`problem frames: ${bad}`);
// vehicle vs vehicle (cars through the crane / truck / each other)
let vv = 0; const hit = (a: Box, b: Box) => Math.abs(a.c[0] - b.c[0]) < a.half[0] + b.half[0] && Math.abs(a.c[2] - b.c[2]) < a.half[2] + b.half[2];
const seen = new Set<string>();
for (let f = 0; f < 1564; f++) { const vs: Box[] = [];
  carsAt(f).forEach((c, i) => vs.push({ name: `car${i}(${c.color})`, c: [c.p[0], 0.9, c.p[2]], half: [2.3, 0.95, 0.95], ry: 0 }));
  PARKED.forEach((c, i) => vs.push({ name: `parked${i}`, c: [c.p[0], 0.9, c.p[2]], half: [2.3, 0.95, 0.95], ry: 0 }));
  const t = truckAt(f); if (t) vs.push({ name: "truck", c: [t.p[0], 1.3, t.p[2]], half: [3.4, 1.4, 1.02], ry: 0 });
  const cr = craneAt(f); if (cr.on) vs.push({ name: "crane", c: [cr.x, 2.2, cr.z], half: [3.6, 2.4, 2.4], ry: 0 });
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) if (hit(vs[i], vs[j])) { const k = vs[i].name + "|" + vs[j].name; if (!seen.has(k)) { seen.add(k); console.log(`frame ${f}: ${vs[i].name} overlaps ${vs[j].name}`); } vv++; } }
console.log(`vehicle overlap frames: ${vv}`);

// INT camera (room-local) wherever the INT set is on screen
let ib = 0; const intOn = (f: number) => f < XF.intExt[1] || (f >= XF.extInt[0] && f < XF.intExt2[1]) || f >= XF.loop[0];
for (let f = 0; f < 1564; f++) { if (!intOn(f)) continue; const c = camIntAt(f, 8.8); const r = roomOk([c.pos[0], c.pos[1] + 8.8, c.pos[2]]);
  if (r === null || r !== "") { const outside = r === null && c.pos[2] > 9.3; if (!outside) { ib++; console.log(`INT frame ${f} cam ${c.pos.map((v) => v.toFixed(2)).join(",")}: ${r ?? "outside room"}`); } } }
console.log(`INT problem frames: ${ib}`);
