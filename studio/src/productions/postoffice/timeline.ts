// The post office film timeline: 1518 frames (= the narration). Story layers (each its own camera move and actors),
// joined by planned opacity dissolves of different lengths/characters. Everything is a pure function of the frame.
import * as THREE from "three";
import { camPath } from "../london-bridge/common";
import { pose5, REST_L, REST_R, ARM, SOLE5, shoulderPx5, H5, W5, type Odo5Pose, type ArmPose, type Costume } from "../../char/odo5";
import { FACES, faceTrack, withFace, type FaceName } from "../short3/expr";
import { HERO_DIVE, WORKER, VISITORS, OWNER, POSTMASTER, SELLER, CLERK, BUILDERS, type Placed } from "./chars";
import { ow } from "./office";
import { PO, height } from "./geo";
import { EMB, CARD, SORT_ROOM } from "./props";
import { BUILDINGS, JETTY } from "./island";
import { waveY } from "./env";
import type { PCam } from "./Set";
import type { V3 } from "../../lib/math";

export const FPS = 30, FILM_FRAMES = 1518;
const N = FILM_FRAMES;
const cl = (x: number) => Math.min(1, Math.max(0, x));
export const sm = (a: number, b: number, f: number) => { const t = cl((f - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lv = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** office-local -> world */
export const L = (x: number, y: number, z: number): V3 => ow([x, y, z]);
/** smooth path through [frame, point] keys (monotone cubic + light Gaussian, same filter as the cameras) */
const path = (keys: [number, V3][], sigma = 5) => { const p = camPath(keys.map(([f, pos]) => ({ f, pos, look: pos, fov: 0 })), sigma); return (f: number): V3 => p(f).pos; };
const vel = (P: (f: number) => V3, f: number): V3 => { const a = P(f - 1), b = P(f + 1); return [(b[0] - a[0]) * 15, (b[1] - a[1]) * 15, (b[2] - a[2]) * 15]; };
type CK = [number, V3, V3, number];
/** the lens never lingers inside the wave band (|y| < waves + near plane): heights within 0.9 m of the surface are
 *  pushed away from it (monotone, max slope < 1) so the camera pops through y = 0 between two frames, like a real
 *  housing breaking the surface, instead of rendering frames that are half above / half below a wave. */
const SURF_GAP = 0.26;
export const surfGap = (y: number) => y === 0 ? SURF_GAP : y + Math.sign(y) * SURF_GAP * (1 - smoothstep01((Math.abs(y) - 0.2) / 0.7));
const smoothstep01 = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const rig = (keys: CK[], sigma = 7) => { const p = camPath(keys.map(([f, pos, look, fov]) => ({ f, pos, look, fov })), sigma); return (f: number): PCam => { const c = p(f); return { pos: [c.pos[0], surfGap(c.pos[1]), c.pos[2]], look: c.look, fov: c.fov, focus: c.focus }; }; };
const lazy = <T,>(make: () => T) => { let v: T | undefined; return () => (v ??= make()); };

// ---------------------------------------------------------------- arm poses (front view, px from the shoulder)
const A = (hand: [number, number], shape: ArmPose["shape"] = "relaxed", bend = 1, rot = 0, elbow?: [number, number]): ArmPose => ({ hand, shape, bend, rot, behind: false, elbow });
const SWIM_L = A([-34, 214], "relaxed", -1, 0.1), SWIM_R = A([34, 214], "relaxed", 1, -0.1);
const TREAD_L = A([-118, 70], "open", -1, 0.9), TREAD_R = A([118, 70], "open", 1, -0.9);
const UP_R = A([70, -150], "open", 1, Math.PI * 0.95), POINT_L = A([-150, -40], "open", -1, -2.1);
const CHEST_L = A([40, 40], "grip", -1, -1.2), CHEST_R = A([-40, 40], "grip", 1, 1.2);
const mixArm = (a: ArmPose, b: ArmPose, t: number): ArmPose => t <= 0 ? a : t >= 1 ? b : { ...b, hand: [lerp(a.hand[0], b.hand[0], t), lerp(a.hand[1], b.hand[1], t)], bend: t < 0.5 ? a.bend : b.bend, rot: lerp(a.rot, b.rot, t), shape: t < 0.5 ? a.shape : b.shape, elbow: undefined };
const armTrack = (keys: [number, ArmPose][], ease = 8) => (f: number) => { let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= f) i++; const prev = i > 0 ? keys[i - 1][1] : keys[0][1]; return mixArm(prev, keys[i][1], sm(keys[i][0], keys[i][0] + ease, f)); };

/** point a card's hand at a world point AS SEEN FROM THE CAMERA (ray onto the card plane) -> arm offset in px */
export const aimArm = (p: Placed, cam: V3, world: V3, side: -1 | 1, base: ArmPose): ArmPose => {
  const h = p.h, roll = p.roll ?? 0; const cy = h * (SOLE5 / H5 - 0.5); const sole: V3 = p.centre ? [p.pos[0], p.pos[1] - cy, p.pos[2]] : p.pos;
  const yaw = Math.atan2(cam[0] - sole[0], cam[2] - sole[2]); const n = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), C = new THREE.Vector3(...cam), W = new THREE.Vector3(...world), S = new THREE.Vector3(...sole);
  const d = W.clone().sub(C), t = S.clone().sub(C).dot(n) / Math.max(1e-5, d.dot(n)), hit = C.clone().addScaledVector(d, t);
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); let lx = hit.clone().sub(S).dot(right), ly = hit.y - S.y - cy;
  const rx = lx * Math.cos(-roll) - ly * Math.sin(-roll), ry = lx * Math.sin(-roll) + ly * Math.cos(-roll); lx = rx; ly = ry + cy;
  const s = h / H5, px = (p.flip ? -1 : 1) * lx / s + W5 / 2, py = SOLE5 - ly / s;
  const sh = shoulderPx5(p.pose, side); const hx = px - sh[0], hy = py - sh[1];
  // elbow hangs below the shoulder-hand line and outward (never flips up over the head)
  const el: [number, number] = [hx * 0.45 + side * 34, Math.max(hy * 0.5, 0) + 62];
  return { ...base, hand: [hx, hy], elbow: el };
};

// ---------------------------------------------------------------- generic actors
type Act = { costume: Costume; seed: number; face: (f: number) => ReturnType<ReturnType<typeof faceTrack>>; armL: (f: number) => ArmPose; armR: (f: number) => ArmPose; hold?: (f: number) => Odo5Pose["holdR"] };
const poseOf = (a: Act, f: number, extra: Partial<Odo5Pose> = {}) => withFace(pose5({ costume: a.costume, armL: a.armL(f), armR: a.armR(f), holdR: a.hold?.(f), blink: ((f + a.seed * 13) % (83 + a.seed * 7)) < 3, breathe: f * 0.09 + a.seed, ...extra }), a.face(f), f, a.seed);
/** a swimmer along a path: card centre, roll toward travel, own bob + kick */
const swimmer = (a: Act, P: (f: number) => V3, f: number, cam: PCam, opt: { kickHz?: number; h?: number; maxRoll?: number; upright?: number; halo?: number; bob?: number; wrapFade?: boolean; rollSmooth?: number } = {}): Placed => {
  const v = vel(P, f), sp = Math.hypot(...v);
  const rawRoll = (g: number) => { const v = vel(P, g), sp = Math.hypot(...v), cruise = cl((sp - 0.12) / 0.5) * (1 - (opt.upright ?? 0));
    const scr = (() => { const fw = new THREE.Vector3(cam.look[0] - cam.pos[0], cam.look[1] - cam.pos[1], cam.look[2] - cam.pos[2]).normalize(), rt = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(rt, fw); const V = new THREE.Vector3(...v); return Math.atan2(-V.dot(rt), V.dot(up)); })();
    // optional: heading straight down the screen wraps atan2 between +pi and -pi -> fade the roll back to upright there so it never flips sides in one frame
    const wrapW = opt.wrapFade ? 1 - cl((Math.abs(scr) - 2.2) / 0.8) : 1;
    const mr = opt.maxRoll ?? 1.45; return Math.max(-mr, Math.min(mr, scr)) * cruise * wrapW; };
  // optional: average the roll over +-n frames so braking / turning never rolls the card faster than a body would
  const n = opt.rollSmooth ?? 0; let rl = 0; for (let g = -n; g <= n; g++) rl += rawRoll(f + g); rl /= 2 * n + 1;
  const roll = rl + Math.sin(f * 0.06 + a.seed) * 0.05;
  const bob = Math.sin(f * 0.075 + a.seed * 2) * (opt.bob ?? 0.04), c = P(f);
  const kick = (f / 30) * (opt.kickHz ?? 1.3) + a.seed * 0.37, amt = 0.35 + 0.65 * cl(sp / 0.6);
  return { pose: poseOf(a, f, { swim: { kick, amt } }), pos: [c[0], c[1] + bob, c[2]], h: opt.h ?? 1.55, roll, centre: true, halo: opt.halo ?? 0.08, contact: 0 };
};
/** a person standing / sitting with feet on something (sole position) */
const stander = (a: Act, at: V3, f: number, extra: Partial<Odo5Pose> = {}, h = 1.55, contact = 0.6): Placed => ({ pose: poseOf(a, f, extra), pos: at, h, halo: 0.1, contact });
const ft = (keys: [number, FaceName][], ease = 6) => faceTrack(keys, ease);
const fixed = (p: ArmPose) => () => p;

// ---------------------------------------------------------------- the office scene (worker inside, counter)
export const COUNTER_OUT = L(0.0, 1.3, 1.36);        // where things are handed over (just outside the counter sill)
export const EMB_AT = { local: [0.18, 1.025, 0.92] as V3, ry: PO.rot + Math.PI };
export const embWorld = () => L(...EMB_AT.local);
const WORKER_SOLE = L(0.02, 0.26, 0.5);
const workerAct = (face: (f: number) => ReturnType<ReturnType<typeof faceTrack>>, armL: (f: number) => ArmPose, armR: (f: number) => ArmPose, hold?: (f: number) => Odo5Pose["holdR"]): Act => ({ costume: WORKER, seed: 3, face, armL, armR, hold });
const worker = (a: Act, f: number): Placed => ({ pose: poseOf(a, f), pos: [WORKER_SOLE[0], WORKER_SOLE[1] + Math.sin(f * 0.05) * 0.015, WORKER_SOLE[2]], h: 1.6, halo: 0.07, contact: 0 });

// ================================================================= LAYER A: push-in, handover, double-take, rise to the island
export const camA = lazy(() => rig([
  [-90, L(3.5, 1.0, 10.6), L(0, 1.55, 0), 52], [0, L(3.1, 0.95, 9.0), L(0, 1.55, 0), 52], [95, L(1.5, 1.25, 5.6), L(0.15, 1.35, 0.8), 48],
  [130, L(0.45, 1.45, 5.9), L(0.3, 1.3, 1.4), 50], [178, L(0.6, 1.42, 5.5), L(0.4, 1.28, 1.4), 48], [212, L(1.55, 1.75, 4.5), L(0.35, 1.95, 0.6), 46], [262, L(2.2, 2.85, 6.0), L(1.4, 3.6, -10), 50],
  [292, L(2.45, 3.55, 6.6), L(4, 4.6, -55), 52], [330, L(2.7, 4.5, 7.2), L(5, 5.0, -60), 52],
], 8));
const visA = { costume: VISITORS[0], seed: 5, face: ft([[0, "content"], [96, "focused"], [128, "delighted"], [168, "proud"], [220, "content"]]), armL: fixed(SWIM_L), armR: armTrack([[0, SWIM_R], [80, UP_R], [150, SWIM_R]], 14), hold: (f: number) => f < 136 ? "postcard" as const : undefined } as Act;
const visAPath = path([[-120, L(-6.5, 3.0, 6.5)], [0, L(-4.6, 2.5, 4.7)], [60, L(-2.5, 1.85, 3.1)], [104, L(-0.45, 1.25, 1.9)], [150, L(-0.42, 1.27, 1.9)], [205, L(-2.2, 2.2, 3.4)], [300, L(-6, 3.0, 6)]]);
const heroA_: Act = { costume: HERO_DIVE, seed: 1, face: ft([[0, "content"], [100, "neutral"], [110, "doubleTake"], [124, "xDisbelief"], [140, "shocked"], [152, "xSideEyeR"], [164, "hugeShock"], [182, "tinyConfused"], [230, "awkwardSmile"]], 5),
  armL: armTrack([[0, TREAD_L], [110, A([-60, -60], "open", -1, -2.4)], [150, TREAD_L]], 6), armR: armTrack([[0, TREAD_R], [160, A([70, -90], "open", 1, 2.4)], [200, TREAD_R]], 8) };
const heroAPath = path([[-120, L(1.35, 1.3, 2.5)], [100, L(1.05, 1.24, 2.2)], [190, L(0.95, 1.22, 2.1)], [300, L(1.2, 1.3, 2.3)]]);
const workerA = workerAct(ft([[0, "focused"], [118, "content"], [150, "proud"], [200, "focused"]]), fixed(REST_L), (f) => f < 112 ? REST_R : REST_R, (f) => f >= 136 && f < 200 ? "postcard" : undefined);
export const layerA = (f: number) => {
  const c = camA()(f); const hero = swimmer(heroA_, heroAPath, f, c, { upright: 1, bob: 0.05 }), vis = swimmer(visA, visAPath, f, c, { kickHz: 1.5 });
  // hero looks between the card (left) and the office (right): gaze driven by the acting beats
  const look = f > 112 && f < 182 ? (Math.floor((f - 112) / 14) % 2 ? 0.9 : -0.9) : hero.pose.lookX; hero.pose = { ...hero.pose, lookX: look };
  // the handover: visitor's card hand meets the worker's hand at the counter (both aimed through the camera ray)
  const meet = lv(COUNTER_OUT, L(0.05, 1.32, 1.3), sm(120, 140, f)), wk = worker(workerA, f);
  if (f > 96 && f < 150) vis.pose = { ...vis.pose, armR: mixArm(vis.pose.armR, aimArm(vis, c.pos, meet, 1, A([0, 0], "grip", 1, Math.PI * 0.6)), sm(96, 112, f) * (1 - sm(138, 150, f))) };
  if (f > 112 && f < 175) wk.pose = { ...wk.pose, armR: mixArm(wk.pose.armR, aimArm(wk, c.pos, meet, 1, A([0, 0], "grip", 1, -Math.PI * 0.5)), sm(112, 128, f) * (1 - sm(160, 175, f))) };
  return { c, actors: [wk, vis, hero], emitters: [workerBubbles(f0 => f0), snorkelBubbles(visAPath, 7), snorkelBubbles(heroAPath, 9)], flag: true };
};
// regulator exhalations (every ~4 s) + snorkellers' small mask burps
const workerBubbles = (_t: (f: number) => number) => ({ at: () => L(-0.35, 1.45, 0.35), bursts: Array.from({ length: 14 }, (_, k) => (k * 3.9 - 2) ), n: 18, size: 0.02, spread: 0.12 });
const snorkelBubbles = (P: (f: number) => V3, seed: number) => ({ at: (t: number) => { const p = P(t * 30); return [p[0], p[1] + 0.55, p[2]] as V3; }, bursts: Array.from({ length: 12 }, (_, k) => k * 4.7 + seed * 0.37 - 5), n: 5, size: 0.01, spread: 0.04 });

// ================================================================= LAYER A2: the idea (past: no office yet) — on the jetty end
const JE: V3 = [JETTY.x, JETTY.deck, JETTY.z1 - 0.6];
export const camA2 = lazy(() => rig([[290, [JE[0] - 0.4, 1.95, JE[2] + 4.6], [JE[0] + 0.1, 1.95, JE[2]], 40], [392, [JE[0] - 0.2, 1.92, JE[2] + 3.5], [JE[0] + 0.1, 1.9, JE[2]], 38]], 8));
const owner: Act = { costume: OWNER, seed: 11, face: ft([[290, "suspSquint"], [318, "suspicious"], [333, "oneBrowUp"], [344, "idea"], [356, "browsShoot"], [372, "delighted"]], 5), armL: fixed(REST_L), armR: armTrack([[290, A([-46, 60], "relaxed", 1, 1.0)], [342, UP_R], [380, UP_R]], 6) };
const pmaster: Act = { costume: POSTMASTER, seed: 12, face: ft([[290, "deadpan"], [336, "bored"], [349, "xSideEyeL"], [362, "xDisbelief"], [378, "nervousLaugh"]], 5), armL: fixed(A([60, 60], "relaxed", -1, -1.0)), armR: fixed(REST_R) };
export const layerA2 = (f: number) => { const c = camA2()(f);
  return { c, actors: [stander(owner, [JE[0] - 0.42, JE[1] + 0.03, JE[2]], f, { lookX: f < 330 ? 0.8 : -0.2, lookY: f < 330 ? 0.1 : -0.3 }), stander(pmaster, [JE[0] + 0.55, JE[1] + 0.03, JE[2] - 0.15], f, { lookX: f < 345 ? 0.7 : -1 })], emitters: [], flag: false }; };

// ================================================================= LAYER B: "what if tourists…" — beach to under water (past)
const HB: V3 = [3.2, 0, -51.6];
const heroBPath = path([[370, [HB[0], height(HB[0], HB[2]) + 0.83, HB[2]]], [425, [HB[0], height(HB[0], HB[2]) + 0.83, HB[2]]], [452, [HB[0] + 0.4, height(HB[0] + 0.4, HB[2] + 3.4) + 0.83, HB[2] + 3.4]], [466, [HB[0] + 0.6, -0.55, HB[2] + 5.0]], [500, [HB[0] + 1.6, -1.0, HB[2] + 10.5]]]);
const heroB_: Act = { costume: HERO_DIVE, seed: 1, face: ft([[370, "delighted"], [392, "proud"], [409, "idea"], [419, "doubleTake"], [432, "browsShoot"], [462, "hugeShock"], [478, "tinyConfused"]], 5),
  armL: armTrack([[370, CHEST_L], [411, POINT_L], [438, SWIM_L]], 8), armR: armTrack([[370, A([60, -110], "grip", 1, Math.PI * 0.8)], [404, A([40, -40], "grip", 1, Math.PI * 0.6)], [450, UP_R]], 8), hold: () => "postcard" };
export const camB = lazy(() => rig([[372, [HB[0] + 2.4, 1.05, HB[2] + 3.6], [HB[0], 1.1, HB[2]], 44], [425, [HB[0] + 2.2, 0.95, HB[2] + 4.4], [HB[0] + 0.1, 1.0, HB[2] + 0.4], 44],
  [455, [HB[0] + 2.0, 0.35, HB[2] + 7.0], [HB[0] + 0.4, 0.2, HB[2] + 3.2], 48], [470, [HB[0] + 2.2, -0.45, HB[2] + 8.2], [HB[0] + 0.7, -0.6, HB[2] + 5.2], 50], [500, [HB[0] + 3.4, -0.75, HB[2] + 12.5], [HB[0] + 1.4, -0.95, HB[2] + 9.0], 52]], 8));
export const layerB = (f: number) => { const c = camB()(f);
  const walking = f > 425 && f < 458, wk = sm(425, 432, f) * (1 - sm(452, 458, f));
  // the flop: over 452..468 the card tips from upright into the swim roll and its centre glides from the standing
  // position onto the swim path (no single-frame switch from standing to lying)
  const k = sm(452, 468, f), kp = sm(454, 466, f), d = 1.55 * (SOLE5 / H5 - 0.5);
  const standCentre = (q: number): V3 => { const p = heroBPath(q), g = height(p[0], p[2]); return [p[0], Math.max(g, -0.6) + d, p[2]]; };
  if (f < 452) { const p = heroBPath(f), g = height(p[0], p[2]); const pose = poseOf(heroB_, f, walking ? { view: "side", walk: wk, gait: (f - 425) / 30 * 1.1, stride: 0.55 } : {});
    return { c, actors: [{ pose, pos: [p[0], Math.max(g, -0.6), p[2]] as V3, h: 1.55, halo: 0.1, contact: g > -0.05 ? 0.6 : 0, flip: walking }], emitters: [], flag: false, marker: true }; }
  const sw = swimmer(heroB_, heroBPath, f, c, { kickHz: 1.7, maxRoll: 1.4 }), sc = standCentre(Math.min(f, 458));
  const pos: V3 = [lerp(sc[0], sw.pos[0], kp), lerp(sc[1], sw.pos[1], kp), lerp(sc[2], sw.pos[2], kp)];
  if (f < 458) { const p = heroBPath(f), g = height(p[0], p[2]); const pose = poseOf(heroB_, f, walking ? { view: "side", walk: wk, gait: (f - 425) / 30 * 1.1, stride: 0.55 } : {});
    return { c, actors: [{ pose, pos, centre: true, roll: (sw.roll ?? 0) * k, h: 1.55, halo: 0.1, contact: g > -0.05 ? 0.6 * (1 - k) : 0, flip: walking }], emitters: [], flag: false, marker: true }; }
  return { c, actors: [{ ...sw, pos, roll: (sw.roll ?? 0) * k }], emitters: [snorkelBubbles(heroBPath, 3)], flag: false, marker: true };
};
export const MARKER: V3 = [PO.x, 0, PO.z];

// ================================================================= LAYER C: building it (three dissolved beats)
const YARD: V3 = [27, height(27, -61.5), -61.5];
export const camC1 = lazy(() => rig([[478, [YARD[0] + 3.2, YARD[1] + 2.0, YARD[2] + 7.8], [YARD[0] + 0.3, YARD[1] + 1.5, YARD[2]], 50], [528, [YARD[0] + 2.8, YARD[1] + 1.9, YARD[2] + 7.0], [YARD[0] + 0.3, YARD[1] + 1.6, YARD[2]], 48]], 8));
const bld = (k: number, face: [number, FaceName][], armR: ArmPose, hold?: Odo5Pose["holdR"]): Act => ({ costume: BUILDERS[k], seed: 20 + k, face: ft(face), armL: fixed(A([-90, -130], "grip", -1, -Math.PI * 0.9)), armR: fixed(armR), hold: () => hold });
const BLD = [bld(0, [[478, "focused"], [500, "comicSerious"]], A([90, -130], "grip", 1, Math.PI * 0.9)), bld(1, [[478, "worried"], [505, "relieved"]], A([90, -130], "grip", 1, Math.PI * 0.9)), bld(2, [[478, "proud"], [508, "content"]], A([60, 30], "grip", 1, 0.3), "hammer")];
export const layerC1 = (f: number) => { const c = camC1()(f); const roofY = 0.55 * (1 - sm(486, 518, f));
  const sole = (dx: number, dz: number): V3 => { const x = YARD[0] + dx, z = YARD[2] + dz; return [x, height(x, z) + 0.02, z]; };
  return { c, office: { at: [YARD[0], YARD[1] + 0.12, YARD[2]] as V3, ry: 0.4, st: { clean: true, noChains: true, noSign: true, roofY } }, actors: [stander(BLD[0], sole(-1.4, 0.9), f, {}, 1.55), stander(BLD[1], sole(1.35, 0.95), f, {}, 1.55), stander(BLD[2], sole(1.9, -1.6), f, { lookX: -0.8 })], emitters: [], flag: false };
};
export const BARGE: V3 = [PO.x - 4.3, 0, PO.z];
export const camC2 = lazy(() => rig([[506, [BARGE[0] + 11, 1.2, BARGE[2] + 10], [BARGE[0] + 2, 1.6, BARGE[2]], 42], [552, [BARGE[0] + 9.5, 1.1, BARGE[2] + 8.6], [BARGE[0] + 2.6, 1.4, BARGE[2]], 42]], 8));
export const tankHang = (f: number): V3 => { const top: V3 = [BARGE[0] + 4.3 * Math.cos(-0.2) + 0.0, 0, BARGE[2]]; void top; return [PO.x, lerp(1.0, PO.y, sm(520, 578, f)), PO.z]; };
export const layerC2 = (f: number) => { const c = camC2()(f); const deck = (dx: number, dz: number): V3 => [BARGE[0] + dx, 0.32, BARGE[2] + dz];
  return { c, barge: true, office: { at: tankHang(Math.min(f, 520)), ry: PO.rot, st: { clean: true, noChains: true } }, actors: [stander(BLD[0], deck(1.6, 0.9), f, { lookX: 0.8 }), stander(BLD[1], deck(-0.6, -0.8), f, { armR: A([40, -60], "open", 1, 2.0) }), stander({ ...BLD[2], hold: () => undefined }, deck(-2.2, 0.6), f, { armR: A([60, 20], "grip", 1, 0.4) })], emitters: [], flag: false };
};
const diverA: Act = { costume: { ...WORKER, pal: { ...WORKER.pal, shirt: "#2c2c34", shirtShade: "#1c1c22" }, stache: false }, seed: 31, face: ft([[540, "focused"], [576, "relieved"]]), armL: fixed(A([-120, -60], "open", -1, -1.8)), armR: fixed(A([110, -40], "open", 1, 1.8)) };
const diverB: Act = { costume: { ...WORKER, pal: { ...WORKER.pal, shirt: "#3a4a2a", shirtShade: "#2a3a1c" } }, seed: 32, face: ft([[540, "worried"], [578, "proud"]]), armL: fixed(A([-110, -50], "open", -1, -1.8)), armR: fixed(A([120, -70], "open", 1, 1.8)) };
export const camC3 = lazy(() => rig([[536, L(3.4, 2.0, 7.2), L(0, 1.6, 0), 50], [596, L(2.9, 1.5, 6.4), L(0, 1.2, 0), 48]], 8));
export const layerC3 = (f: number) => { const c = camC3()(f), tk = tankHang(f), dy = tk[1] - PO.y;
  const dA = path([[530, L(1.4, 2.0, 3.3)], [596, L(1.1, 1.15, 2.9)]]), dB = path([[530, L(-1.6, 2.1, 0.9)], [596, L(-1.4, 1.25, 0.7)]]);
  const p = (P: (f: number) => V3): V3 => { const q = P(f); return [q[0], q[1] + dy * 0.85, q[2]]; };
  return { c, office: { at: tk, ry: PO.rot, st: { clean: true, noChains: f < 580 } }, ropes: true, puff: f, actors: [swimmer(diverA, () => p(dA), f, c, { upright: 1, kickHz: 1.1 }), swimmer(diverB, () => p(dB), f, c, { upright: 1, kickHz: 0.9 })],
    emitters: [{ at: (t: number) => { const q = p(dA); void t; return [q[0], q[1] + 0.5, q[2]] as V3; }, bursts: [18.0, 19.1], n: 16, size: 0.02, spread: 0.1 }, { at: () => { const q = p(dB); return [q[0], q[1] + 0.5, q[2]] as V3; }, bursts: [18.5], n: 16, size: 0.02, spread: 0.1 }], flag: false };
};

// ================================================================= LAYER D: paper + ink don't work (close-up at the counter)
export const camD = lazy(() => rig([[580, L(0.82, 1.3, 3.45), L(0.66, 1.2, 2.0), 42], [776, L(0.78, 1.3, 3.3), L(0.66, 1.2, 2.0), 41]], 10));
export const wetD = (f: number) => sm(612, 752, f);
export const PAPER_D = (f: number): { p: V3; r: V3 } => ({ p: L(0.64, 1.1 + Math.sin(f * 0.05) * 0.008, 2.62), r: [-0.25 + Math.sin(f * 0.04) * 0.03, PO.rot + 0.08, 0.04] });
const heroD_: Act = { costume: HERO_DIVE, seed: 1, face: ft([[580, "content"], [604, "focused"], [619, "worried"], [650, "suspSquint"], [670, "xSideEyeL"], [688, "xDisbelief"], [704, "frozenSmile"], [726, "cringe"], [748, "embarrassed"]], 5),
  armL: fixed(TREAD_L), armR: fixed(TREAD_R), hold: () => "pen" };
const heroDPath = path([[560, L(0.86, 0.98, 2.05)], [780, L(0.84, 0.98, 2.02)]]);
const workerD = workerAct(ft([[580, "bored"], [660, "focused"], [702, "xSideEyeR"], [730, "deadpan"]]), fixed(REST_L), fixed(REST_R));
export const layerD = (f: number) => { const c = camD()(f), hero = swimmer(heroD_, heroDPath, f, c, { upright: 1, bob: 0.025 }), P = PAPER_D(f);
  // left hand holds the card's near corner; right hand (pen) writes, then freezes as the ink runs
  const corner: V3 = [P.p[0] - 0.07, P.p[1] + 0.05, P.p[2]]; const write = f < 640 ? Math.sin(f * 0.9) * 0.012 : 0;
  const nib: V3 = [P.p[0] + 0.01 + write + (f < 640 ? (f - 600) * 0.0012 : 0.05), P.p[1] + 0.005 - (f > 640 ? 0.05 * sm(640, 660, f) : 0), P.p[2] + 0.02];
  hero.pose = { ...hero.pose, armL: aimArm(hero, c.pos, corner, -1, A([0, 0], "grip", -1, -2.0)), armR: aimArm(hero, c.pos, nib, 1, A([0, 0], "grip", 1, 2.4)), lookX: -0.4, lookY: 0.35 };
  return { c, actors: [worker(workerD, f), hero], paper: P, emitters: [snorkelBubbles(heroDPath, 4)], flag: true };
};

// ================================================================= LAYER E: special waterproof postcards (kiosk -> under water)
const KIOSK = BUILDINGS[1]; const kl = (x: number, y: number, z: number): V3 => { const c = Math.cos(KIOSK.ry), s = Math.sin(KIOSK.ry); return [KIOSK.p[0] + x * c + z * s, KIOSK.p[1] + y, KIOSK.p[2] - x * s + z * c]; };
export const camE1 = lazy(() => rig([[760, kl(2.75, 1.5, 3.3), kl(0.3, 1.45, 0.9), 48], [800, kl(2.45, 1.45, 3.0), kl(0.28, 1.38, 0.95), 46], [842, kl(2.15, 1.4, 2.7), kl(0.25, 1.3, 1.0), 44]], 8));
export const FAN_E = () => ({ p: kl(-0.05, 1.035, 1.0), ry: KIOSK.ry + 0.1 });
export const slideCard = (f: number): { p: V3; r: V3 } => { const k = sm(796, 822, f); const a = kl(-0.05, 1.05, 1.02), b = kl(0.35, 1.06, 1.42); const p = lv(a, b, k); p[1] += Math.sin(k * Math.PI) * 0.04; return { p, r: [-Math.PI / 2 + k * 0.25, KIOSK.ry + 0.1 - k * 0.4, 0] }; };
const seller: Act = { costume: SELLER, seed: 41, face: ft([[760, "content"], [790, "smug"], [812, "delighted"]]), armL: fixed(A([-70, 80], "grip", -1, -1.4)), armR: armTrack([[760, A([60, 90], "open", 1, 1.4)], [796, A([140, 40], "open", 1, 1.6)]], 10) };
const heroE1_: Act = { costume: HERO_DIVE, seed: 1, face: ft([[760, "suspicious"], [790, "oneBrowUp"], [812, "xSideEyeL"], [826, "browsShoot"]], 5), armL: fixed(REST_L), armR: armTrack([[760, REST_R], [814, A([-80, 40], "grip", 1, 1.6)]], 10) };
export const layerE1 = (f: number) => { const c = camE1()(f); return { c, actors: [stander(seller, kl(0.12, 0.27, 0.1), f, { lookX: 0.6 }), stander(heroE1_, kl(0.95, 0.02, 1.7), f, { lookX: -0.6, lookY: 0.4 })], fan: FAN_E(), slide: slideCard(f), emitters: [], flag: false }; };
export const camE2 = lazy(() => rig([[822, L(0.84, 1.32, 3.4), L(0.66, 1.2, 2.0), 42], [890, L(0.8, 1.3, 3.25), L(0.66, 1.2, 2.0), 40]], 8));
export const CARD_E2 = (f: number): { p: V3; r: V3 } => ({ p: L(0.64, 1.1 + Math.sin(f * 0.06) * 0.008, 2.62), r: [-0.2 + Math.sin(f * 0.05) * 0.06, PO.rot + 0.1 + Math.sin(f * 0.03) * 0.1, -0.06] });
const heroE2_: Act = { costume: HERO_DIVE, seed: 1, face: ft([[822, "oneBrowUp"], [846, "browsShoot"], [858, "delighted"], [872, "proud"]], 5), armL: fixed(TREAD_L), armR: fixed(TREAD_R) };
const heroE2Path = path([[800, L(0.86, 0.98, 2.05)], [900, L(0.84, 0.99, 2.02)]]);
export const layerE2 = (f: number) => { const c = camE2()(f), hero = swimmer(heroE2_, heroE2Path, f, c, { upright: 1, bob: 0.025 }), P = CARD_E2(f);
  hero.pose = { ...hero.pose, armL: aimArm(hero, c.pos, [P.p[0] - 0.07, P.p[1] + 0.04, P.p[2]], -1, A([0, 0], "grip", -1, -2.0)), armR: aimArm(hero, c.pos, [P.p[0] + 0.07, P.p[1] - 0.03, P.p[2]], 1, A([0, 0], "grip", 1, 2.0)), lookX: -0.35, lookY: 0.3 };
  return { c, actors: [hero], card: P, emitters: [snorkelBubbles(heroE2Path, 6)], flag: true };
};

// ================================================================= LAYER F: the embossing device (macro through the counter)
export const camF = lazy(() => rig([[872, L(0.55, 1.55, 1.85), L(0.1, 1.08, 0.88), 38], [960, L(0.45, 1.5, 1.72), L(0.13, 1.05, 0.9), 35], [1056, L(0.4, 1.47, 1.66), L(0.16, 1.05, 0.92), 33]], 10));
export const pressF = (f: number) => sm(1000, 1016, f) * (1 - sm(1028, 1038, f));
export const embF = (f: number) => sm(1010, 1017, f);
/** card on the lower die: slid in 946-984, pressed, drawn out + tilted to show the seal 1036-1052 */
export const cardF = (f: number, start = 946): { p: V3; r: V3 } => {
  const e = EMB_AT, em = new THREE.Matrix4().compose(new THREE.Vector3(...embWorld()), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, e.ry, 0)), new THREE.Vector3(1, 1, 1));
  const inP = new THREE.Vector3(EMB.dieX + 0.0525, EMB.dieY + 0.002, -0.0305), outP = new THREE.Vector3(EMB.dieX + 0.19, EMB.dieY + 0.03, 0.01), showP = new THREE.Vector3(EMB.dieX + 0.17, EMB.dieY + 0.09, -0.06);
  const kin = sm(start, start + 38, f), kout = sm(start + 90, start + 106, f); const p = outP.clone().lerp(inP, kin).lerp(showP, kout).applyMatrix4(em);
  return { p: [p.x, p.y, p.z], r: [Math.PI / 2 - kout * 0.95, e.ry, kout * 0.25] };
};
export const inkBoxF = (f: number) => ({ p: L(-0.2 - 0.17 * sm(902, 924, f), 1.025, 0.9 - 0.06 * sm(902, 924, f)), ry: PO.rot + 0.3 });
export const leverKnob = (f: number, press: number): V3 => { const a = 0.55 * (1 - press) + 0.02, e = EMB_AT; const lx = EMB.pivot[0] + Math.cos(a) * 0.225, ly = 0.155 + Math.sin(a) * 0.225; const m = new THREE.Matrix4().compose(new THREE.Vector3(...embWorld()), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, e.ry, 0)), new THREE.Vector3(1, 1, 1)); const v = new THREE.Vector3(lx, ly, 0).applyMatrix4(m); void f; return [v.x, v.y, v.z]; };
const workerF = workerAct(ft([[872, "focused"], [902, "comicSerious"], [930, "xSideEyeL"], [946, "focused"], [1018, "smug"], [1040, "proud"]], 5), fixed(REST_L), fixed(REST_R));
export const workerHands = (wk: Placed, c: PCam, f: number, press: number, card: { p: V3 }, cStart: number, box?: { p: V3 }) => {
  const knob = leverKnob(f, press), edge: V3 = [card.p[0] + 0.05, card.p[1] + 0.01, card.p[2] + 0.02];
  // right hand feeds / holds the card; left hand (the one nearer the lever) pushes the ink box aside, then works the lever
  const rTarget: V3 = edge;
  const rest: V3 = [knob[0], knob[1] - 0.06, knob[2]];
  const lTarget: V3 = box && f < cStart - 20 ? [box.p[0] + 0.08, box.p[1] + 0.05, box.p[2]] : f < cStart + 40 ? rest : f < cStart + 52 ? lv(rest, knob, sm(cStart + 40, cStart + 52, f)) : f < cStart + 92 ? knob : rest;
  wk.pose = { ...wk.pose, armR: aimArm(wk, c.pos, rTarget, 1, A([0, 0], "grip", 1, Math.PI * 0.45)), armL: aimArm(wk, c.pos, lTarget, -1, A([0, 0], "open", -1, -Math.PI * 0.45)), lookX: -0.3, lookY: 0.55 };
};
export const layerF = (f: number) => { const c = camF()(f), wk = worker(workerF, f), card = cardF(f), box = inkBoxF(f), press = pressF(f);
  workerHands(wk, c, f, press, card, 946, box);
  return { c, actors: [wk], emb: { press, card, emb: embF(f) }, inkBox: box, emitters: [workerBubbles((x) => x)], flag: true, dof: 0.22 };
};

// ================================================================= LAYER G: visitors swim down and hand over cards
export const camG = lazy(() => rig([[1040, L(5.8, 2.3, 5.6), L(0.2, 1.7, 1.2), 50], [1110, L(4.9, 1.9, 5.0), L(0.0, 1.45, 1.3), 48], [1176, L(4.5, 1.75, 4.7), L(0.1, 1.4, 1.35), 46]], 9));
const visG = (k: number, face: [number, FaceName][], hold: (f: number) => Odo5Pose["holdR"]): Act => ({ costume: VISITORS[k], seed: 50 + k * 3, face: ft(face, 5), armL: fixed(SWIM_L), armR: fixed(UP_R), hold });
const VG = [visG(0, [[1040, "content"], [1100, "focused"], [1124, "delighted"], [1146, "proud"]], (f) => f < 1127 ? "postcard" : undefined), visG(1, [[1040, "delighted"], [1108, "suspicious"], [1140, "awkwardSmile"]], () => "postcard"), visG(2, [[1040, "tinyConfused"], [1120, "oneBrowUp"], [1160, "content"]], () => "postcard")];
const PG = [path([[1030, L(-3.8, 3.05, 5.6)], [1094, L(-1.3, 1.65, 2.7)], [1112, L(-0.32, 1.25, 1.85)], [1138, L(-0.3, 1.27, 1.85)], [1175, L(-1.5, 2.0, 2.9)]]),
  path([[1030, L(4.2, 3.0, 6.8)], [1112, L(1.8, 1.85, 3.4)], [1176, L(1.15, 1.5, 2.75)]]), path([[1040, L(-0.6, 3.05, 7.6)], [1132, L(-1.5, 2.1, 3.9)], [1176, L(-1.9, 1.75, 3.2)]])];
const heroG_: Act = { costume: HERO_DIVE, seed: 1, face: ft([[1040, "content"], [1096, "browsShoot"], [1120, "hugeShock"], [1142, "delighted"]], 5), armL: fixed(SWIM_L), armR: fixed(SWIM_R) };
const heroGPath = path([[1030, L(2.8, 3.0, 0.6)], [1100, L(2.1, 2.4, 0.9)], [1176, L(1.75, 2.1, 1.3)]]);
const workerG = workerAct(ft([[1040, "content"], [1112, "focused"], [1130, "delighted"], [1150, "content"]]), fixed(REST_L), fixed(REST_R), (f) => f >= 1127 && f < 1172 ? "postcard" : undefined);
export const layerG = (f: number) => { const c = camG()(f); const vs = VG.map((a, k) => swimmer(a, PG[k], f, c, { kickHz: [1.45, 1.2, 1.65][k], bob: 0.04 + k * 0.01, wrapFade: true, rollSmooth: 5 })); const hero = swimmer(heroG_, heroGPath, f, c, { kickHz: 1.3 });
  const wk = worker(workerG, f), meet = lv(COUNTER_OUT, L(0.0, 1.32, 1.32), sm(1116, 1130, f));
  if (f > 1100 && f < 1140) vs[0].pose = { ...vs[0].pose, armR: mixArm(vs[0].pose.armR, aimArm(vs[0], c.pos, meet, 1, A([0, 0], "grip", 1, Math.PI * 0.6)), sm(1100, 1112, f) * (1 - sm(1130, 1140, f))) };
  if (f > 1112 && f < 1160) wk.pose = { ...wk.pose, armR: mixArm(wk.pose.armR, aimArm(wk, c.pos, meet, 1, A([0, 0], "grip", 1, -Math.PI * 0.5)), sm(1112, 1124, f) * (1 - sm(1146, 1160, f))) };
  return { c, actors: [wk, ...vs, hero], emitters: [workerBubbles((x) => x), ...PG.map((P, k) => snorkelBubbles(P, 11 + k)), snorkelBubbles(heroGPath, 15)], flag: true };
};

// ================================================================= LAYER H: a postal worker handles them under water
export const camH = lazy(() => rig([[1160, L(-0.25, 1.55, 3.9), L(0.2, 1.2, 1.1), 46], [1284, L(-0.15, 1.5, 3.6), L(0.2, 1.18, 1.1), 44]], 10));
export const BAG_H: V3 = [0, 0, 0];
export const bagH = () => L(-0.32, 1.15, 0.88);
const cardH = (f: number) => { const c = cardF(f, 1186); if (f > 1236) { const k = sm(1238, 1256, f), b = bagH(); return { p: lv(c.p, [b[0], b[1] + 0.2 - k * 0.12, b[2]], k), r: [lerp(c.r[0], 0.1, k), c.r[1], c.r[2]] as V3 }; } return c; };
const workerH = workerAct(ft([[1160, "focused"], [1200, "comicSerious"], [1226, "proud"], [1258, "content"]], 5), fixed(REST_L), fixed(REST_R));
const heroH_: Act = { costume: HERO_DIVE, seed: 1, face: ft([[1160, "browsShoot"], [1196, "hugeShock"], [1226, "doubleTake"], [1244, "delighted"], [1262, "proud"]], 5), armL: fixed(TREAD_L), armR: fixed(A([90, 0], "open", 1, 1.6)) };
const visH: Act = { costume: VISITORS[1], seed: 53, face: ft([[1160, "bored"], [1232, "oneBrowUp"], [1250, "xDisbelief"], [1268, "awkwardSmile"]], 5), armL: fixed(SWIM_L), armR: fixed(SWIM_R), hold: () => "postcard" };
export const layerH = (f: number) => { const c = camH()(f), wk = worker(workerH, f), card = cardH(f), press = sm(1214, 1228, f) * (1 - sm(1234, 1242, f));
  workerHands(wk, c, f, press, card, 1186);
  const hero = swimmer(heroH_, path([[1150, L(0.47, 0.95, 1.78)], [1290, L(0.44, 0.95, 1.75)]]), f, c, { upright: 1, bob: 0.02 }); hero.pose = { ...hero.pose, lookX: -0.9, lookY: 0.25 };
  const v = swimmer(visH, path([[1150, L(-0.55, 1.75, 2.4)], [1290, L(-0.5, 1.7, 2.35)]]), f, c, { upright: 1 }); v.pose = { ...v.pose, lookX: 0.8 };
  return { c, actors: [wk, hero, v], emb: { press, card, emb: sm(1222, 1229, f) }, bag: { p: bagH(), fill: 1 }, emitters: [workerBubbles((x) => x)], flag: true, dof: 0.16 };
};

// ================================================================= LAYER I: to the ordinary postal system
const workerUp: Act = { costume: WORKER, seed: 3, face: ft([[1268, "focused"], [1296, "content"]]), armL: fixed(SWIM_L), armR: fixed(A([60, -80], "grip", 1, Math.PI * 0.85)), hold: () => "mailbag" };
const PI1 = path([[1262, L(-0.4, 1.4, 1.9)], [1290, L(0.3, 2.4, 2.3)], [1318, L(0.9, 3.25, 2.7)]]);
export const camI1 = lazy(() => rig([[1262, L(2.3, 0.85, 4.4), L(0.0, 2.0, 1.9), 54], [1318, L(2.5, 1.2, 5.0), L(0.7, 3.0, 2.6), 56]], 8));
export const layerI1 = (f: number) => { const c = camI1()(f); const wu = swimmer(workerUp, PI1, f, c, { kickHz: 1.2, maxRoll: 1.2 }); wu.roll = (wu.roll ?? 0) - 0.35;
  return { c, actors: [wu], emitters: [{ at: (t: number) => { const p = PI1(t * 30); return [p[0], p[1] + 0.5, p[2]] as V3; }, bursts: [42.5, 43.8], n: 22, size: 0.022, spread: 0.12 }], flag: true }; };
const JS: V3 = [JETTY.x, JETTY.deck, JETTY.z1];   // jetty end, above the stair
export const camI2 = lazy(() => rig([[1298, [JS[0] + 3.6, 0.9, JS[2] + 3.9], [JS[0] + 0.1, 0.45, JS[2] + 1.8], 48], [1342, [JS[0] + 3.2, 0.88, JS[2] + 3.6], [JS[0] + 0.1, 0.45, JS[2] + 1.8], 46]], 8));
const pmI: Act = { costume: POSTMASTER, seed: 12, face: ft([[1298, "content"], [1320, "delighted"], [1332, "proud"]]), armL: fixed(REST_L), armR: armTrack([[1298, REST_R], [1312, A([-60, 60], "grip", 1, 1.0)]], 10), hold: (f) => f >= 1324 ? "mailbag" : undefined };
const wkI: Act = { costume: WORKER, seed: 3, face: ft([[1298, "content"], [1326, "proud"]]), armL: fixed(TREAD_L), armR: armTrack([[1298, A([70, -100], "grip", 1, Math.PI * 0.85)], [1326, TREAD_R]], 10), hold: (f) => f < 1324 ? "mailbag" : undefined };
export const layerI2 = (f: number) => { const c = camI2()(f); const wp: V3 = [JS[0] + 0.25, -0.45 + waveY(JS[0], JS[2] + 1.6, f / 30) * 0.8, JS[2] + 1.7];
  const pm = stander(pmI, [JS[0] - 0.05, JS[1] - 0.24 - 3 * 0.27 + 0.03, JS[2] + 1.03], f, { lookX: 0.5, lookY: 0.6 }); const w = { pose: poseOf(wkI, f, { swim: { kick: f / 30, amt: 0.3 } }), pos: [JS[0] + 0.15, wp[1], JS[2] + 2.3] as V3, h: 1.55, centre: true, halo: 0.08, contact: 0 } as Placed;
  const meet: V3 = [JS[0] + 0.08, 0.55, JS[2] + 1.7];
  if (f < 1330) w.pose = { ...w.pose, armR: aimArm(w, c.pos, meet, 1, A([0, 0], "grip", 1, Math.PI * 0.85)) };
  if (f > 1310) pm.pose = { ...pm.pose, armR: mixArm(pm.pose.armR, aimArm(pm, c.pos, f < 1332 ? meet : [JS[0], 0.9, JS[2] + 1.2], 1, A([0, 0], "grip", 1, 0.4)), sm(1310, 1320, f)) };
  return { c, actors: [pm, w], emitters: [], flag: true };
};
const SR = SORT_ROOM; const sr = (x: number, y: number, z: number): V3 => [SR[0] + x, SR[1] + y, SR[2] + z];
export const camI3 = lazy(() => rig([[1326, sr(0.6, 1.85, 0.75), sr(-0.15, 1.1, -0.6), 44], [1384, sr(0.5, 1.8, 0.6), sr(-0.15, 1.05, -0.55), 42]], 8));
const clerkI: Act = { costume: CLERK, seed: 61, face: ft([[1326, "focused"], [1349, "comicSerious"], [1362, "content"]]), armL: fixed(REST_L), armR: fixed(REST_R) };
export const stampI = (f: number) => sm(1340, 1347, f) * (1 - sm(1351, 1358, f));
export const cardI = (f: number): { p: V3; r: V3 } => { const k = sm(1360, 1378, f); return { p: lv(sr(-0.15, 0.965, -0.35), sr(2.0, 1.0, 0.55), k), r: [-Math.PI / 2 + k * 0.6, 0.3, k * 0.5] }; };
export const layerI3 = (f: number) => { const c = camI3()(f); const ck = stander(clerkI, sr(-0.25, 0.22, -1.02), f, { lookX: 0.1, lookY: 0.7 }, 1.55, 0.6);
  const card = cardI(f); ck.pose = { ...ck.pose, armR: aimArm(ck, c.pos, f < 1359 ? [card.p[0] + 0.05, card.p[1] + 0.06 + 0.08 * (1 - stampI(f)), card.p[2] + 0.02] : card.p, 1, A([0, 0], "grip", 1, 0.6)), armL: aimArm(ck, c.pos, sr(-0.4, 0.97, -0.5), -1, A([0, 0], "open", -1, -0.5)) };
  return { c, actors: [ck], room: { card, stamp: stampI(f) }, emitters: [], flag: false };
};

// ================================================================= LAYER J: floating, proud — sink back to the opening (loop)
const HJ = (f: number): V3 => { const p = L(1.7, 0, 4.4); return [p[0] + Math.sin(f * 0.02) * 0.1, -0.12 + waveY(p[0], p[2], f / 30), p[2]]; };
const heroJ_: Act = { costume: HERO_DIVE, seed: 1, face: ft([[1366, "relieved"], [1384, "proud"], [1412, "smug"], [1436, "delighted"], [1460, "proud"]], 6), armL: fixed(A([-40, -150], "open", -1, -2.8)), armR: fixed(ARM.thumb) };
export const camJ = lazy(() => rig([[1364, L(3.6, 3.5, 7.0), L(1.7, 3.15, 4.4), 46], [1408, L(3.7, 3.55, 7.6), L(1.6, 3.05, 4.3), 48], [1446, L(3.4, 2.6, 7.4), L(0.4, 1.7, 0.9), 50],
  [1490, L(3.25, 1.15, 8.1), L(0.05, 1.5, 0.2), 52], [1518, L(3.1, 0.95, 9.0), L(0, 1.55, 0), 52], [1608, L(1.8, 1.2, 5.0), L(0.15, 1.35, 0.6), 46]], 9));
export const layerJ = (f: number) => { const c = camJ()(f); const p = HJ(f);
  const hero: Placed = { pose: poseOf(heroJ_, f, { swim: { kick: f / 30 * 0.4, amt: 0.25 } }), pos: p, h: 1.55, centre: true, roll: -1.32 + Math.sin(f * 0.05) * 0.05, halo: 0.1, contact: 0 };
  return { c, actors: [hero, worker(workerA, f)], emitters: [workerBubbles((x) => x)], flag: true };
};

// ---------------------------------------------------------------- layers + dissolves (each different)
export type Layer = "A" | "A2" | "B" | "C1" | "C2" | "C3" | "D" | "E1" | "E2" | "F" | "G" | "H" | "I1" | "I2" | "I3" | "J" | "A_LOOP";
export const LAYERS: [Layer, number, number, number, number][] = [
  ["A", 0, 0, 300, 322], ["A2", 300, 322, 380, 394], ["B", 380, 394, 484, 498], ["C1", 484, 498, 508, 524], ["C2", 508, 524, 536, 552], ["C3", 536, 552, 580, 596],
  ["D", 580, 596, 760, 774], ["E1", 760, 774, 820, 842], ["E2", 820, 842, 872, 888], ["F", 872, 888, 1040, 1058], ["G", 1040, 1058, 1160, 1176], ["H", 1160, 1176, 1262, 1278],
  ["I1", 1262, 1278, 1298, 1312], ["I2", 1298, 1312, 1326, 1340], ["I3", 1326, 1340, 1364, 1380], ["J", 1364, 1380, N, N], ["A_LOOP", 1488, N, N, N],
];
export const layerOpacity = (Lr: (typeof LAYERS)[number], f: number) => { const [, a, b, c, d] = Lr; if (f < a || (f >= d && d < N)) return 0; const up = b > a ? sm(a, b, f) : 1; const dn = d > c ? 1 - sm(c, d, f) : 1; return Math.min(up, dn); };
/** E1 -> E2 dissolve washes through bright light (the surface), others are plain cross-fades of different lengths */
export const exposureBoost = (f: number) => 1 + 0.55 * Math.max(0, 1 - Math.abs(f - 831) / 12);
export const LAYER_FN: Record<Exclude<Layer, "A_LOOP">, (f: number) => ReturnType<typeof layerA> & Record<string, unknown>> = {
  A: layerA, A2: layerA2, B: layerB, C1: layerC1, C2: layerC2, C3: layerC3, D: layerD, E1: layerE1, E2: layerE2, F: layerF, G: layerG, H: layerH, I1: layerI1, I2: layerI2, I3: layerI3, J: layerJ,
} as unknown as Record<Exclude<Layer, "A_LOOP">, (f: number) => ReturnType<typeof layerA> & Record<string, unknown>>;
export { FACES, CARD };
