// The Mail Rail film: 1801 frames (= the narration, 60.03 s), ONE continuous camera journey (no cuts, no dissolves):
// aerial London -> down past the street's section edge into the railway -> close beside the driverless train -> the
// "no passengers" gag at Liverpool Street -> up to the crowded street -> back down the section to Mount Pleasant ->
// through the cut into the station (loading) -> riding beside the train through the tunnel -> unloading at the other
// station -> decades pass at the same camera -> closure -> back out through the cut and up into the aerial (loop).
// Beat frames come from the narration's word timings (productions/mailrail/STORYBOARD.md).
import { camPath } from "../london-bridge/common";
import { REST_L, REST_R } from "../../char/odo5";
import type { PCam } from "../centennial/Set";
import { ENGINEER, OFFICER, WORKERS, A, mixArm, sm, cl, lv, stand, walker, keys, ft, type Act, type Placed } from "./actors";
import { handWorld } from "../centennial/timeline";
import { CONTAINERS, TRAIN_L } from "./train";
import type { TrainState } from "./train";
import type { BagPlace } from "./mailbag";
import { ZC, RT } from "./cutaway";
import { UNDER_Z, STATION_X } from "./london";
import { CONV, PLAT_Y } from "./station";
import { TRACK_Z } from "./tunnel";
import type { V3 } from "../../lib/math";

export const FPS = 30, FILM_FRAMES = 1801;
const N = FILM_FRAMES;
const TZ = UNDER_Z + TRACK_Z[0];                  // hero track (world z)
const PY = RT + PLAT_Y;                           // platform top (world y)
const lazy = <T,>(make: () => T) => { let v: T | undefined; return () => (v ??= make()); };
type CK = [number, V3, V3, number];

// ================================================================= the train
const STOP_A = -10, STOP_B = 28;
/** run 1 (opening, A-B): steady 0.15 m/frame, brakes into Liverpool Street from f 205, stands from f 275 */
const run1 = (f: number) => { if (f <= 205) return { x: 22.75 - 0.15 * (205 - f), v: 0.15 }; const u = Math.min(70, f - 205); return { x: 22.75 + 0.15 * u - 0.15 * u * u / 140, v: 0.15 * (1 - u / 70) }; };
/** run 2 (F): Mount Pleasant -> Liverpool Street, smooth trapezoid speed profile (cosine ramps), DEP..ARR */
export const DEP = 962, ARR = 1150;
const run2 = (f: number) => { const Ta = 44, Td = 50, T = ARR - DEP, Tc = T - Ta - Td, D = STOP_B - STOP_A, v = D / (Ta / 2 + Tc + Td / 2);
  const t = Math.min(T, Math.max(0, f - DEP));
  if (t < Ta) return { x: STOP_A + v * (t / 2 - Ta / (2 * Math.PI) * Math.sin(Math.PI * t / Ta)), v: v * (1 - Math.cos(Math.PI * t / Ta)) / 2 };
  if (t < Ta + Tc) return { x: STOP_A + v * (Ta / 2 + (t - Ta)), v };
  const u = t - Ta - Tc; return { x: STOP_A + v * (Ta / 2 + Tc + u / 2 + Td / (2 * Math.PI) * Math.sin(Math.PI * u / Td)), v: v * (1 + Math.cos(Math.PI * u / Td)) / 2 }; };
export const trainRun = (f: number): { x: number; v: number } => { if (f < 0) return trainRun(f + N); if (f < 420) return run1(f); if (f >= 1790) return run1(f - N); if (f < DEP) return { x: STOP_A, v: 0 }; return f < ARR ? run2(f) : { x: STOP_B, v: 0 }; };

// ================================================================= loading (E) and unloading (G) choreography
type Job = { who: number; k: number; t0: number; per: number; n: number };   // worker, container, first cycle start, cycle length, cycles
const LOADS: Job[] = [{ who: 0, k: 3, t0: 856, per: 31, n: 3 }, { who: 1, k: 2, t0: 866, per: 29, n: 3 }, { who: 2, k: 1, t0: 861, per: 33, n: 3 }];
const UNLOADS: Job[] = [{ who: 3, k: 1, t0: 1166, per: 32, n: 6 }, { who: 4, k: 0, t0: 1180, per: 30, n: 6 }];
/** time-lapse during H: the unloaders' clock runs faster (decades pass), then they finish and walk off */
const workClock = (f: number) => f < 1290 ? f : 1290 + (f - 1290) * 1.7;
const cycleOf = (j: Job, f: number) => { const t = f - j.t0; if (t < 0) return null; const i = Math.floor(t / j.per); if (i >= j.n) return null; return { i, u: (t - i * j.per) / j.per }; };
const containerWorld = (k: number, x: number): V3 => [x + CONTAINERS[k][0], RT + CONTAINERS[k][1], TZ];
const SLOT = (i: number): V3 => [[-0.38, -0.15], [0, -0.15], [0.38, -0.15], [-0.38, 0.15], [0, 0.15], [0.38, 0.15]].map(([x, z]) => [x * 0.9, 0, z] as V3)[((i % 6) + 6) % 6];
export const LOAD_START = [6, 3, 3, 3], UNLOAD_START = [6, 6, 6, 6];
/** frames at which a loaded bag lands in container k (for the fill counters and the "thump" sound) */
export const LOAD_LANDS = LOADS.flatMap((j) => Array.from({ length: j.n }, (_, i) => ({ k: j.k, f: Math.ceil(j.t0 + (i + 0.9) * j.per), who: j.who })));
const unloadRealFrame = (j: Job, i: number, frac: number) => { const wt = j.t0 + (i + frac) * j.per; return wt <= 1290 ? wt : 1290 + (wt - 1290) / 1.7; };
export const BELT_PUTS = UNLOADS.flatMap((j) => Array.from({ length: j.n }, (_, i) => ({ f: Math.ceil(unloadRealFrame(j, i, 0.82)), who: j.who, i })));
export const UNLOAD_LIFTS = UNLOADS.flatMap((j) => Array.from({ length: j.n }, (_, i) => ({ k: j.k, f: Math.ceil(unloadRealFrame(j, i, 0.12)), who: j.who, i })));
const fillAt = (f: number): number[] => { const fl = (f < 1100 ? LOAD_START : UNLOAD_START).slice();
  if (f < 1100) for (const e of LOAD_LANDS) { if (f >= e.f) fl[e.k] = Math.min(6, fl[e.k] + 1); }
  else for (const j of UNLOADS) for (let i = 0; i < j.n; i++) if (f >= Math.ceil(unloadRealFrame(j, i, 0.12))) fl[j.k] = Math.max(0, fl[j.k] - 1);
  return fl; };
/** lid angles: open at Mount Pleasant before loading, closed by the loaders at the end; opened again for unloading */
export const LID_CLOSE = [[946, 958], [950, 962], [944, 956]] as const;
const lidsAt = (f: number): number[] => {
  if (f < 420 || f >= 1790) return [0, 0, 0, 0];
  if (f < 1100) { const c = (i: number) => 3.0 * (1 - sm(LID_CLOSE[i][0], LID_CLOSE[i][1], f)); return [f < 940 ? 3.0 * (1 - sm(925, 940, f)) : 0, c(2), c(1), c(0)]; }
  const o = 3.0 * sm(1154, 1170, f) * (1 - sm(1404, 1418, f)); return [o, o, 0, 0]; };
export const trainState = (f: number): TrainState => { const r = trainRun(f); return { x: r.x, sway: Math.min(1, r.v / 0.15), lamp: f > 1560 && f < 1790 ? 1 - sm(1580, 1590, f) : 1, lids: lidsAt(f), fill: fillAt(f) }; };

// ================================================================= the camera (one continuous path)
const KEYS: CK[] = [
  [-60, [75, 30, 14], [44, 6, -200], 48], [0, [75, 30, 14], [44, 6, -200], 48], [45, [60, 21, 22], [32, 0, -70], 47],
  [88, [30, 9, 25], [15, -1, -12], 46], [122, [12, 1.6, 23], [9, -1.6, 0], 45], [152, [13.5, -3.6, 14.5], [15.5, -5.4, 4.9], 44],
  [185, [19.6, -4.95, 9.5], [22.6, -5.8, 4.9], 40], [228, [29.4, -4.75, 9.4], [32.6, -5.35, 3.8], 40], [292, [30.6, -4.55, 9.6], [33.2, -5.25, 3.6], 42],
  [342, [32, -1.2, 13.5], [31, 0.8, 0], 46], [390, [35, 1.9, 9.5], [30.5, 1.6, 0], 46], [440, [34.6, 1.6, 5.8], [30.0, 1.15, 4.05], 46], [585, [34.2, 1.62, 5.75], [29.9, 1.15, 4.0], 46],
  [645, [30, 3.6, 12], [20, 0.4, -2], 46], [722, [2, 0.8, 32], [-7, -3.2, 0], 46], [792, [-10, -3.1, 17], [-11.8, -5.0, 3.5], 46], [838, [-11.8, -3.95, 9.6], [-12.6, -5.2, 3.0], 48],
  [872, [-11.6, -3.9, 7.6], [-12.9, -5.3, 2.8], 50], [946, [-10.6, -3.95, 7.5], [-11.6, -5.35, 2.7], 50],
  // 962..1150: train-relative (see camAt)
  [1172, [25.4, -3.7, 7.6], [30.8, -5.35, 2.6], 50], [1272, [25.8, -3.65, 7.65], [31.0, -5.3, 2.7], 50], [1420, [26.3, -3.6, 7.7], [31.2, -5.2, 2.6], 49],
  [1530, [26.9, -3.7, 7.6], [30.6, -5.3, 2.7], 48], [1636, [27.6, -3.6, 7.4], [30.6, -4.6, 2.8], 47],
  [1672, [29.5, -3.4, 11], [30.2, -4.6, 3.0], 46], [1714, [32.5, 0.5, 22], [32, -3.5, 0], 46], [1760, [55, 18, 22], [38, 2, -60], 47], [1801, [75, 30, 14], [44, 6, -200], 48], [1860, [75, 30, 14], [44, 6, -200], 48],
];
const path = lazy(() => camPath(KEYS.map(([f, pos, look, fov]) => ({ f, pos, look, fov })), 9));
/** F: riding beside the train on the other track; enters from the E keys and hands over to the G keys with smooth blends */
const RIDE = (f: number) => { const x = trainRun(f).x, front = x + TRAIN_L / 2; const lead = 1.6 + 0.8 * Math.sin(Math.PI * cl((f - DEP) / (ARR - DEP)));
  return { pos: [front - 3.2 - lead * 0.4, RT + 1.05, UNDER_Z + TRACK_Z[1] - 0.12] as V3, look: [front + 3.5 + lead, RT + 0.7, TZ - 0.15] as V3, fov: 52 }; };
export const camAt = (f: number): PCam => { const p = path()(f); let pos = p.pos, look = p.look, fov = p.fov;
  const w = sm(948, 985, f) * (1 - sm(1128, 1166, f));
  if (w > 0) { const r = RIDE(f); pos = lv(pos, r.pos, w); look = lv(look, r.look, w); fov = fov + (r.fov - fov) * w; }
  return { pos, look, fov, dof: f > 840 && f < 1650 ? 0.06 : 0.04, focus: Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]), near: pos[1] > 12 ? 0.4 : 0.03 }; };
/** section on everywhere except the interior span (switched while the camera is inside the cut, facing away) */
/** switched while the camera is INSIDE the chamber volume (z 6..9) with the restored near half below/behind the frame */
export const SEC_OFF: [number, number] = [858, 1648];
export const sectionOn = (f: number) => !(f >= SEC_OFF[0] && f <= SEC_OFF[1]);

// ================================================================= cast + acting
const HOLD_L = A([-60, 55], "grip", -1, -1.1, [-95, 40]), HOLD_R = A([60, 55], "grip", 1, 1.1, [95, 40]);
const UP_L = A([-115, -175], "open", -1, -2.6, [-105, -55]), UP_R = A([115, -175], "open", 1, 2.6, [105, -55]);
const REACH_L = A([-40, 120], "grip", -1, -0.6, [-80, 60]), REACH_R = A([40, 120], "grip", 1, 0.6, [80, 60]);
const LIFT_L = A([-55, -10], "grip", -1, -1.4, [-100, 20]), LIFT_R = A([55, -10], "grip", 1, 1.4, [100, 20]);
const OVER_L = A([-30, 70], "grip", -1, -0.9, [-90, 50]), OVER_R = A([30, 70], "grip", 1, 0.9, [90, 50]);
const POINT_R = A([150, -40], "open", 1, 1.7, [90, -10]);
/** arms for one load/unload cycle phase u in 0..1 (reach down to the pile, lift, carry over, release) */
const workArms = (u: number, unload: boolean): [typeof REST_L, typeof REST_R] => {
  const seq = unload ? [[0, REST_L, REST_R], [0.12, REACH_L, REACH_R], [0.32, LIFT_L, LIFT_R], [0.62, OVER_L, OVER_R], [0.8, OVER_L, OVER_R], [0.95, REST_L, REST_R]] as const
    : [[0, REST_L, REST_R], [0.14, REACH_L, REACH_R], [0.36, LIFT_L, LIFT_R], [0.6, OVER_L, OVER_R], [0.78, OVER_L, OVER_R], [0.95, REST_L, REST_R]] as const;
  for (let i = 0; i < seq.length - 1; i++) { const [a, l0, r0] = seq[i], [b, l1, r1] = seq[i + 1]; if (u <= b) { const t = sm(0, 1, (u - a) / (b - a)); return [mixArm(l0, l1, t), mixArm(r0, r1, t)]; } }
  return [REST_L, REST_R]; };
export type CarryBag = BagPlace;
const LOADERS: { a: Act; at: V3 }[] = [
  { a: { c: WORKERS[0], seed: 31, face: ft([[700, "talking"], [760, "content"], [850, "focused"], [930, "proud"]]) }, at: [-13.12, PY, UNDER_Z - 1.55] },
  { a: { c: WORKERS[1], seed: 32, face: ft([[700, "content"], [770, "nervousLaugh"], [850, "focused"], [940, "relieved"]]) }, at: [-11.84, PY, UNDER_Z - 1.6] },
  { a: { c: WORKERS[5], seed: 33, face: ft([[700, "comicSerious"], [850, "focused"], [935, "smug"]]) }, at: [-8.16, PY, UNDER_Z - 1.55] },
];
const UNLOADERS: { a: Act; at: V3 }[] = [
  { a: { c: WORKERS[2], seed: 34, face: ft([[1150, "content"], [1180, "focused"], [1300, "bored"], [1360, "deadpan"]]) }, at: [29.84, PY, UNDER_Z - 1.55] },
  { a: { c: WORKERS[6], seed: 35, face: ft([[1150, "talking"], [1190, "focused"], [1310, "bored"], [1380, "uncomfyGrin"]]) }, at: [31.12, PY, UNDER_Z - 1.6] },
];
const PILE_DX = 0.75;          // the loader's bag stack sits beside him, towards +x, on the platform
/** a worker doing jobs + the bag in his hands / in flight */
const worker = (W: { a: Act; at: V3 }, jobs: Job[], f: number, c: PCam, x: number, unload: boolean, out: { actors: Placed[]; bags: CarryBag[] }, clock = (g: number) => g) => {
  const g = clock(f); let cy: { i: number; u: number } | null = null, job: Job | undefined; for (const j of jobs) { const q = cycleOf(j, g); if (q) { cy = q; job = j; } }
  const arms = cy ? workArms(cy.u, unload) : [W.a.armL?.(f) ?? REST_L, W.a.armR?.(f) ?? REST_R];
  const bend = cy ? (cy.u > 0.1 && cy.u < 0.32 ? 0.08 : 0) : 0;
  const p = stand({ ...W.a, armL: () => arms[0], armR: () => arms[1] }, W.at, f, { lean: bend, lookX: cy ? (cy.u < 0.3 ? 0.6 : -0.4) : 0.2 });
  out.actors.push(p);
  if (cy && job) { const hl = handWorld(p, c.pos, -1), hr = handWorld(p, c.pos, 1), hands: V3 = [(hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2 - 0.3, (hl[2] + hr[2]) / 2];
    const cw = containerWorld(job.k, x), slot = SLOT(unload ? 5 - cy.i : LOAD_START[job.k] + cy.i), inBox: V3 = [cw[0] + slot[0], cw[1] - 0.6 + 0.02, cw[2] + slot[2]];
    const pile: V3 = [W.at[0] + PILE_DX, PY + 0.05, W.at[2] - 0.15], table: V3 = [STATION_X.B + CONV.x0 - 0.1, RT + CONV.y0 - 0.05, UNDER_Z + CONV.z];
    const v = (job.k + cy.i) % 3, u = cy.u;
    if (!unload) { if (u > 0.14 && u < 0.78) out.bags.push({ p: u < 0.36 ? lv(pile, hands, sm(0.14, 0.36, u)) : hands, ry: cy.i * 1.3, v, s: 0.68 });
      else if (u >= 0.78 && u < 0.9) { const t = cl((u - 0.78) / 0.115); out.bags.push({ p: [hands[0] + (inBox[0] - hands[0]) * t, hands[1] + (inBox[1] - hands[1]) * t + 0.25 * Math.sin(Math.PI * t), hands[2] + (inBox[2] - hands[2]) * t], ry: cy.i * 1.3, v, s: 0.68, tilt: 0.2 * (1 - t) }); } }
    else { if (u > 0.12 && u < 0.82) out.bags.push({ p: u < 0.32 ? lv(inBox, hands, sm(0.12, 0.32, u)) : u < 0.62 ? hands : lv(hands, table, sm(0.62, 0.82, u)), ry: cy.i, v, s: 0.68 }); } }
  return p; };
/** bags riding the conveyor up into the sorting office (they vanish into the vault opening, never pop) */
export const BELT_SPEED = 0.035;
const beltBags = (f: number): CarryBag[] => { const { x0, x1, y0, y1, z } = CONV, len = Math.hypot(x1 - x0, y1 - y0); const out: CarryBag[] = [];
  for (const b of BELT_PUTS) { const d = (f - b.f) * BELT_SPEED; if (d < 0 || d > len + 0.5) continue; const t = d / len; out.push({ p: [STATION_X.B + x0 - 0.1 + (x1 - x0 + 0.1) * t, RT + y0 - 0.05 + (y1 - y0 + 0.05) * t + 0.02, UNDER_Z + z], ry: b.i, v: (b.i + b.who) % 3, s: 0.68, tilt: -Math.atan2(y1 - y0, x1 - x0) * 0 }); }
  return out; };

// ---- B: the "no passengers" gag at Liverpool Street (platform A, beside the arriving train)
const HERO_GAG: V3 = [32.6, PY, UNDER_Z - 1.75], OFF_GAG: V3 = [34.7, PY, UNDER_Z - 2.1];
const SIGN_W: V3 = [STATION_X.B + 12, RT + 1.95, UNDER_Z - 3.45];
const heroB: Act = { c: ENGINEER, seed: 7, face: ft([[150, "content"], [205, "delighted"], [236, "idea"], [252, "frozenSmile"], [262, "embarrassed"], [282, "awkwardSmile"], [312, "cringe"]]),
  armR: (f) => f > 222 && f < 252 ? mixArm(REST_R, A([95, -150], "open", 1, 2.4, [80, -60]), sm(222, 232, f)) : f >= 252 && f < 290 ? mixArm(A([95, -150], "open", 1, 2.4, [80, -60]), A([30, 10], "relaxed", 1, 0.3), sm(252, 266, f)) : REST_R,
  armL: (f) => f > 262 && f < 312 ? A([-45, -95], "relaxed", -1, -2.0, [-90, -20]) : REST_L };
const offB: Act = { c: OFFICER, seed: 8, face: ft([[150, "comicSerious"], [240, "suspSquint"], [252, "oneBrowUp"], [276, "smug"]]),
  armL: (f) => f > 244 && f < 300 ? mixArm(REST_L, A([-60, -120], "open", -1, -2.2, [-60, -40]), sm(244, 252, f)) : A([-30, 30], "grip", -1, -0.8) };
const gag = (f: number, c: PCam): Placed[] => { const step = sm(232, 246, f) * (1 - sm(262, 280, f));   // hero takes one eager step towards the train, then back
  const hp: V3 = [HERO_GAG[0], HERO_GAG[1], HERO_GAG[2] + 0.38 * step];
  const hero = stand(heroB, hp, f, { gait: 0.25, walk: step * 0.9, lookX: f > 250 ? -0.7 : 0.5 }), off = stand(offB, OFF_GAG, f, { lookX: f > 240 ? -0.8 : -0.2 });
  if (f > 244 && f < 300) off.pose.armR = A([150, -60], "open", 1, 1.6, [90, -20]);
  void SIGN_W; void c; return [hero, off]; };

// ---- C: the crowded street (hero with a mountain of mail, pedestrians, a stuck lorry)
const HERO_ST: V3 = [30.0, 0.15, 4.25];
const heroC: Act = { c: ENGINEER, seed: 9, face: ft([[320, "neutral"], [338, "worried"], [380, "confused"], [430, "xSideEyeL"], [470, "panic"], [505, "disbelief"], [545, "cringe"], [575, "comicSerious"]]),
  armL: (f) => f < 470 ? HOLD_L : f < 500 ? mixArm(HOLD_L, UP_L, sm(470, 480, f)) : f < 540 ? mixArm(UP_L, A([-30, -110], "open", -1, -2.4, [-80, -40]), sm(518, 530, f)) : A([-30, -110], "open", -1, -2.4, [-80, -40]),
  armR: (f) => f < 470 ? HOLD_R : f < 500 ? mixArm(HOLD_R, UP_R, sm(470, 480, f)) : f < 540 ? mixArm(UP_R, REST_R, sm(518, 532, f)) : REST_R };
export const HERO_SACK_UNTIL = 470;
const PEDS: { a: Act; path: [number, V3][] }[] = [
  { a: { c: WORKERS[3], seed: 41, face: ft([[300, "talking"], [420, "content"]]) }, path: [[300, [14, 0.15, -7.6]], [600, [27, 0.15, -7.6]]] },
  { a: { c: WORKERS[4], seed: 42, face: ft([[300, "bored"], [450, "suspicious"]]) }, path: [[310, [44, 0.15, -6.7]], [600, [32, 0.15, -6.7]]] },
  { a: { c: OFFICER, seed: 43, face: ft([[300, "comicSerious"]]), armR: () => HOLD_R }, path: [[320, [20, 0.15, -8.1]], [600, [32.5, 0.15, -8.1]]] },
  { a: { c: WORKERS[6], seed: 44, face: ft([[300, "focused"], [480, "nervousLaugh"]]) }, path: [[340, [24.2, 0.15, 3.65]], [470, [27.4, 0.15, 3.65]], [520, [27.4, 0.15, 3.65]], [600, [23.5, 0.15, 3.65]]] },
  { a: { c: WORKERS[0], seed: 45, face: ft([[300, "talking"]]) }, path: [[300, [40, 0.15, -7.2]], [600, [28.5, 0.15, -7.2]]] },
];
// postmen on the far pavement each carrying a sack (bag in both hands)
const POSTMEN: { a: Act; path: [number, V3][] }[] = [
  { a: { c: WORKERS[1], seed: 46, face: ft([[300, "worried"], [500, "panic"]]), armL: () => HOLD_L, armR: () => HOLD_R }, path: [[300, [17, 0.15, -6.3]], [600, [26.5, 0.15, -6.3]]] },
];
export type Vehicle = { kind: "car" | "truck" | "bus"; color: string; p: V3; ry: number; spin: number };
/** stop-and-go traffic: monotonic creep with its own rhythm per vehicle (never reverses) */
const creep = (f: number, v: number, ph: number) => v * f - v * 18 * Math.cos(f / 18 + ph);
const TRAFFIC: { kind: Vehicle["kind"]; color: string; x0: number; dir: 1 | -1; v: number; ph: number; r: number }[] = [
  { kind: "car", color: "#16171a", x0: 2, dir: 1, v: 0.03, ph: 0, r: 0.34 }, { kind: "truck", color: "#9a1e18", x0: 10, dir: 1, v: 0.03, ph: 0.6, r: 0.48 }, { kind: "car", color: "#3a1a1c", x0: 18.5, dir: 1, v: 0.03, ph: 1.1, r: 0.34 },
  { kind: "car", color: "#1e2a24", x0: 25.5, dir: 1, v: 0.03, ph: 1.7, r: 0.34 },
  { kind: "car", color: "#20242a", x0: 56, dir: -1, v: 0.035, ph: 0.3, r: 0.34 }, { kind: "truck", color: "#4a3a28", x0: 64, dir: -1, v: 0.035, ph: 0.9, r: 0.48 }, { kind: "car", color: "#16171a", x0: 72.5, dir: -1, v: 0.035, ph: 1.4, r: 0.34 },
  { kind: "truck", color: "#9a1e18", x0: 81, dir: -1, v: 0.035, ph: 2.0, r: 0.48 },
];
export const vehiclesAt = (f: number): Vehicle[] => TRAFFIC.map((t) => { const d = creep(f, t.v, t.ph) - creep(0, t.v, t.ph); return { kind: t.kind, color: t.color, p: [t.x0 + t.dir * d, 0, t.dir > 0 ? 0.9 : -2.6], ry: t.dir > 0 ? 0 : Math.PI, spin: d / t.r }; });

// ---- I: the hero returns to the closed station
const heroI: Act = { c: ENGINEER, seed: 10, face: ft([[1440, "content"], [1500, "confused"], [1560, "suspSquint"], [1575, "hugeShock"], [1596, "xDisbelief"], [1622, "deadpan"]]),
  armL: (f) => f > 1600 && f < 1640 ? A([-90, -60], "open", -1, -1.8, [-100, -10]) : REST_L, armR: (f) => f > 1600 && f < 1640 ? A([90, -60], "open", 1, 1.8, [100, -10]) : REST_R };
const HERO_I_PATH: [number, V3][] = [[1452, [25.8, PY, UNDER_Z - 2.1]], [1528, [29.4, PY, UNDER_Z - 2.1]]];

export type FrameOut = { c: PCam; section: boolean; city: boolean; mood: "day" | "section" | "under"; actors: Placed[]; bags: CarryBag[]; train: TrainState; vehicles: Vehicle[];
  belt: number; clock: { hours: number; year: number }; lightK: number; cool: number; tunnelK: number; street: boolean; under: boolean };
const YEARS: [number, number][] = [[0, 1927], [1300, 1927], [1316, 1935], [1332, 1945], [1348, 1955], [1364, 1965], [1380, 1975], [1396, 1985], [1412, 1995], [1470, 1999], [1520, 2001], [1567, 2003]];
export const yearAt = (f: number) => { let y = 1927; for (const [g, v] of YEARS) if (f >= g) y = v; return y; };
export const frameAt = (f: number): FrameOut => {
  const c = camAt(f), section = sectionOn(f), tr = trainState(f), actors: Placed[] = [], bags: CarryBag[] = [];
  const street = f < 160 || (f > 300 && f < 760) || f > 1690;                 // street life is evaluated only while the street can be seen
  const under = f > 95 && f < 380 || f > 600;
  if (street) { for (const p of PEDS) if (f >= p.path[0][0] - 1) actors.push(walker(p.a, keys(p.path), f, c, p.path[0][0]));
    for (const p of POSTMEN) { const w = walker(p.a, keys(p.path), f, c, p.path[0][0]); actors.push(w); const hl = handWorld(w, c.pos, -1), hr = handWorld(w, c.pos, 1); bags.push({ p: [(hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2 - 0.35, (hl[2] + hr[2]) / 2], s: 0.75, v: 1, ry: 0.4 }); }
    if (f > 300 && f < 640) { const h = stand(heroC, HERO_ST, f, { lookX: f > 425 && f < 470 ? -0.8 : 0.3 }); actors.push(h);
      if (f < HERO_SACK_UNTIL) { const hl = handWorld(h, c.pos, -1), hr = handWorld(h, c.pos, 1); bags.push({ p: [(hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2 - 0.4, (hl[2] + hr[2]) / 2], s: 0.95, v: 2, ry: 0.2 }); }
      else { const t = cl((f - HERO_SACK_UNTIL) / 9); bags.push({ p: [HERO_ST[0] + 0.25, 0.15 + 0.5 * (1 - t) * (1 - t), HERO_ST[2] + 0.12], s: 0.95, v: 2, ry: 0.2, tilt: 0.25 * t }); } } }
  if (f > 140 && f < 330) actors.push(...gag(f, c));
  if (f > 600 && f < 1000) for (const [i, L] of LOADERS.entries()) { const idle = f < 850; const W = idle ? { ...L, a: { ...L.a, armR: (g: number) => i === 0 ? A([70 + 15 * Math.sin(g * 0.2), 10], "open", 1, 1.5) : REST_R } } : L;
    worker(W, LOADS.filter((j) => j.who === i), f, c, STOP_A, false, { actors, bags });
    if (f > LID_CLOSE[i][0] - 6 && f < LID_CLOSE[i][1] + 4) actors[actors.length - 1].pose.armR = A([60, -40], "open", 1, 1.6, [90, 0]); }
  if (f > 1140 && f < 1560) for (const [i, U] of UNLOADERS.entries()) { const leave = 1420 + i * 10, arrive = leave + 50 + 25 * (U.at[0] - 29.84);   // off through the lift gate (behind the camera)
    if (f < leave) worker(U, UNLOADS.filter((j) => j.who === i + 3), f, c, STOP_B, true, { actors, bags }, workClock);
    else if (f < arrive + 2) actors.push(walker(U.a, keys([[leave, U.at], [arrive, [STATION_X.B + 4, U.at[1], UNDER_Z - 3.0]]]), f, c, leave)); }
  if (f > 1445 && f < 1700) { const P = keys(HERO_I_PATH); actors.push(f < 1528 ? walker(heroI, P, f, c, HERO_I_PATH[0][0]) : stand(heroI, P(f), f, { lookX: f > 1560 ? -0.6 : 0.4 })); }
  bags.push(...beltBags(f));
  const cool = sm(1300, 1420, f), lightK = (1 - 0.62 * sm(1572, 1596, f)) * (f >= 1790 ? 1 : 1), tunnelK = 1 - 0.7 * sm(1572, 1600, f);
  return { c, section, city: c.pos[1] > 6 || c.pos[2] > 12 || f < 140 || f > 1690, mood: !section ? "under" : c.pos[1] > 3 ? "day" : "section", actors, bags, train: tr, vehicles: vehiclesAt(f),
    belt: f * BELT_SPEED, clock: { hours: 8 + 0.09 * Math.min(140, Math.max(0, f - 1290)) + 0.018 * Math.max(0, f - 1430), year: yearAt(f) }, lightK, cool, tunnelK, street, under };
};
void TZ; void ZC; void N; void lv;
