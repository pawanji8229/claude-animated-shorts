// The Centennial Light film timeline: 1607 frames (= the narration, 53.551 s). Story layers (own camera move, set,
// era, actors, bulb state) joined by planned opacity dissolves. Era sub-layers (B1-B3, E1-E2, F1-F3) share ONE
// camera path and the same hero + bulb, so only the world changes (the anchor never ghosts). Everything is a pure
// function of the frame. Beat frames come from the word timings of the narration (see STORYBOARD.md).
import * as THREE from "three";
import { camPath } from "../london-bridge/common";
import { pose5, REST_L, REST_R, SOLE5, shoulderPx5, H5, W5, type Odo5Pose, type ArmPose, type Costume } from "../../char/odo5";
import { faceTrack, withFace, type FaceName } from "../short3/expr";
import { HERO, VOL_RED, VOL_WHITE, VOL_NAVY, ELECTRICIAN, TOWN_A, TOWN_B, FIRE12, FIRE38, FIRE38B, FIRE76, FIRE76B, FIRE_MOD, FIRE_MOD_GEAR, cardPx, handPx, type Placed } from "./chars";
import { OLD_BULB, OLD_DROP, OLD_NEXT, type Era } from "./oldStation";
import { S6_BULB, S6_DROP, PLATFORM, BOX_AT, LADDER_AT, LADDER_RY, MON_AT } from "./station6";
import { stepAt } from "./props";
import { filamentAt } from "./bulb";
import type { AppType } from "./vehicles";
import type { PCam } from "./Set";
import type { V3 } from "../../lib/math";

export const FPS = 30, FILM_FRAMES = 1607;
const N = FILM_FRAMES;
export const cl = (x: number) => Math.min(1, Math.max(0, x));
export const sm = (a: number, b: number, f: number) => { const t = cl((f - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lv = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const path = (keys: [number, V3][], sigma = 5) => { const p = camPath(keys.map(([f, pos]) => ({ f, pos, look: pos, fov: 0 })), sigma); return (f: number): V3 => p(f).pos; };
type CK = [number, V3, V3, number];
const rig = (keys: CK[], sigma = 8, dof = 0.1) => { const p = camPath(keys.map(([f, pos, look, fov]) => ({ f, pos, look, fov })), sigma);
  return (f: number): PCam => { const c = p(f); return { pos: c.pos, look: c.look, fov: c.fov, dof, focus: Math.hypot(c.pos[0] - c.look[0], c.pos[1] - c.look[1], c.pos[2] - c.look[2]) }; }; };
const lazy = <T,>(make: () => T) => { let v: T | undefined; return () => (v ??= make()); };
/** focus a camera on a world point (rack focus) */
const focusOn = (c: PCam, p: V3, dof?: number): PCam => ({ ...c, focus: Math.hypot(c.pos[0] - p[0], c.pos[1] - p[1], c.pos[2] - p[2]), dof: dof ?? c.dof });

// ---------------------------------------------------------------- moods (lighting per layer)
export type MoodName = "dayInt" | "dayInt38" | "nightOld" | "dayExt" | "dusk6" | "night6" | "day6" | "day6ext";

// ---------------------------------------------------------------- arm poses + acting helpers
const A = (hand: [number, number], shape: ArmPose["shape"] = "relaxed", bend = 1, rot = 0, elbow?: [number, number]): ArmPose => ({ hand, shape, bend, rot, behind: false, elbow });
const UP_L = A([-60, -170], "open", -1, -Math.PI * 0.95), UP_R = A([60, -170], "open", 1, Math.PI * 0.95);
const HIP_L = A([-96, 96], "relaxed", -1, 0.9, [-110, 40]), HIP_R = A([96, 96], "relaxed", 1, -0.9, [110, 40]);
const CHIN_R = A([20, -40], "relaxed", 1, 2.2, [90, 40]), POINT_UP_R = A([90, -190], "open", 1, Math.PI * 0.9);
const HOLD_L = A([-70, 60], "grip", -1, -1.1, [-100, 40]), HOLD_R = A([70, 60], "grip", 1, 1.1, [100, 40]);
const WORK_L = A([-40, 90], "grip", -1, -0.6), WORK_R = A([60, 80], "grip", 1, 0.8);
export const mixArm = (a: ArmPose, b: ArmPose, t: number): ArmPose => t <= 0 ? a : t >= 1 ? b : { ...b, hand: [lerp(a.hand[0], b.hand[0], t), lerp(a.hand[1], b.hand[1], t)], bend: t < 0.5 ? a.bend : b.bend, rot: lerp(a.rot, b.rot, t), shape: t < 0.5 ? a.shape : b.shape, elbow: a.elbow && b.elbow ? [lerp(a.elbow[0], b.elbow[0], t), lerp(a.elbow[1], b.elbow[1], t)] : b.elbow };
const armTrack = (keys: [number, ArmPose][], ease = 8) => (f: number) => { let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= f) i++; const prev = i > 0 ? keys[i - 1][1] : keys[0][1]; return mixArm(prev, keys[i][1], sm(keys[i][0], keys[i][0] + ease, f)); };
/** point a card's hand at a world point as seen from the camera */
export const aimArm = (p: Placed, cam: V3, world: V3, side: -1 | 1, base: ArmPose): ArmPose => {
  const h = p.h, sole = p.pos; const yaw = Math.atan2(cam[0] - sole[0], cam[2] - sole[2]); const n = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), C = new THREE.Vector3(...cam), W = new THREE.Vector3(...world), S = new THREE.Vector3(...sole);
  const d = W.clone().sub(C), dn = d.dot(n), t = S.clone().sub(C).dot(n) / (Math.abs(dn) < 1e-5 ? -1e-5 : dn), hit = C.clone().addScaledVector(d, t);
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); const lx = hit.clone().sub(S).dot(right), ly = hit.y - S.y;
  const s = h / H5, px = (p.flip ? -1 : 1) * lx / s + W5 / 2, py = SOLE5 - ly / s; const sh = shoulderPx5(p.pose, side); let hx = px - sh[0], hy = py - sh[1];
  // a real arm only reaches so far: clamp the hand to the arm length (points toward the target)
  const len = Math.hypot(hx, hy), MAXR = 285; if (len > MAXR) { hx *= MAXR / len; hy *= MAXR / len; }
  // an arm raised overhead is drawn behind the (big) head so it never crosses the face
  return { ...base, hand: [hx, hy], elbow: [hx * 0.45 + side * 34, Math.max(hy * 0.5, 0) + 62], behind: hy < -170 };
};
const blinkAt = (f: number, seed: number) => ((f + seed * 37) % (97 + seed * 11)) < 3;
type Act = { c: Costume; seed: number; face: (f: number) => ReturnType<ReturnType<typeof faceTrack>>; armL?: (f: number) => ArmPose; armR?: (f: number) => ArmPose; h?: number };
const ft = (keys: [number, FaceName][], ease = 6) => faceTrack(keys, ease);
const poseOf = (a: Act, f: number, extra: Partial<Odo5Pose> = {}) => withFace(pose5({ costume: a.c, armL: a.armL?.(f) ?? REST_L, armR: a.armR?.(f) ?? REST_R, blink: blinkAt(f, a.seed), breathe: f * 0.09 + a.seed, ...extra }), a.face(f), f, a.seed);
/** a person standing with feet at `at` */
const stand = (a: Act, at: V3, f: number, extra: Partial<Odo5Pose> = {}, contact = 0.6): Placed => ({ pose: poseOf(a, f, extra), pos: at, h: a.h ?? 1.62, halo: 0.1, contact });
/** a person walking along a path (side view while moving, gait from distance travelled, faces the screen direction) */
const walker = (a: Act, P: (f: number) => V3, f: number, cam: PCam, f0: number, f1: number, extra: Partial<Odo5Pose> = {}): Placed => {
  const p = P(f), q = P(f + 1), v: V3 = [q[0] - p[0], 0, q[2] - p[2]], sp = Math.hypot(v[0], v[2]) * 30;
  let d = 0; for (let g = f0; g < f; g++) { const a0 = P(g), a1 = P(g + 1); d += Math.hypot(a1[0] - a0[0], a1[2] - a0[2]); }
  const walking = cl(sp / 0.5); const fw = new THREE.Vector3(cam.look[0] - cam.pos[0], 0, cam.look[2] - cam.pos[2]).normalize(), rt = new THREE.Vector3(-fw.z, 0, fw.x);
  const flip = v[0] * rt.x + v[2] * rt.z < 0; void f1;
  return { pose: withFace(pose5({ costume: a.c, view: walking > 0.05 ? "side" : "front", gait: d / 0.7, walk: walking, stride: 0.7, lean: 0.05 * walking, blink: blinkAt(f, a.seed), breathe: f * 0.09, armL: a.armL?.(f) ?? REST_L, armR: a.armR?.(f) ?? REST_R, ...extra }), a.face(f), f, a.seed),
    pos: p, h: a.h ?? 1.62, halo: 0.1, contact: 0.6, flip: walking > 0.05 ? flip : false };
};
/** world position of a card's hand (s = -1 screen-left arm, +1 screen-right arm) */
export const handWorld = (p: Placed, cam: V3, s: -1 | 1): V3 => cardPx(p, cam, handPx(p.pose, s));

export type Bulb = { p: V3; drop: number; glow: number; stub?: boolean };
export type AppPlace = { type: AppType | "cart"; p: V3; ry: number; spin?: number };
export type LayerOut = {
  c: PCam; mood: MoodName; set: "old" | "s6"; era: Era; actors: Placed[]; bulb: Bulb; t: number;
  fixOn?: number[]; next?: { era: Era; glow: number; drop: number }; app?: AppPlace[]; cars?: { kind: "car30" | "sedan" | "police"; color?: string; p: V3; ry: number; spin?: number }[];
  step?: { p: V3; ry: number }; box?: { p: V3; ry: number; open: number; bulbIn?: boolean }; lanterns?: { p: V3; lit: number }[]; flash?: { p: V3; to: V3; on: number };
  cords?: { pts: V3[]; color: string; r?: number }[]; ladder6?: { p: V3; ry: number } | null; doors6?: number[]; highbay?: number; monitor?: { glow: number; sec: number }; outside?: boolean;
  dust?: number; stubCord?: boolean; exposure?: number; warmFill?: number;
};

// ================================================================= shared bulb states
const OLD_FIL = filamentAt(OLD_BULB, OLD_DROP), S6_FIL = filamentAt(S6_BULB, S6_DROP);
const oldBulb = (glow = 1): Bulb => ({ p: OLD_BULB, drop: OLD_DROP, glow });
const s6Bulb = (glow = 1): Bulb => ({ p: S6_BULB, drop: S6_DROP, glow });
const HERO_A: Act = { c: HERO, seed: 1, h: 1.55, face: () => ({ eyes: "lid", lids: 0.45, pupil: 1, browL: 0.6, browR: 0.1, worry: 0, mouth: "flat", mouthW: 1, blush: 0, sweat: 0, lookX: 0, lookY: 0, headRoll: 0 }) };
const hero = (face: [number, FaceName][], armR?: (f: number) => ArmPose, armL?: (f: number) => ArmPose): Act => ({ ...HERO_A, face: ft(face, 6), armR, armL });

// ================================================================= A: macro on the bulb -> pull back through Station 6 at dusk
const S6_HERO_FLOOR: V3 = [-0.2, 0, -4.6];
const heroFloor = hero([[-200, "content"], [40, "idea"], [80, "content"], [1490, "content"], [1530, "idea"], [1580, "content"]]);
export const camA = lazy(() => rig([
  [-90, [S6_FIL[0] + 0.2, S6_FIL[1] + 0.035, S6_FIL[2] + 0.72], S6_FIL, 38], [-40, [S6_FIL[0] + 0.11, S6_FIL[1] + 0.022, S6_FIL[2] + 0.42], S6_FIL, 37],
  [0, [S6_FIL[0] + 0.075, S6_FIL[1] + 0.02, S6_FIL[2] + 0.29], S6_FIL, 36], [24, [S6_FIL[0] + 0.07, S6_FIL[1] + 0.01, S6_FIL[2] + 0.27], S6_FIL, 36],
  [62, [S6_FIL[0] + 0.5, S6_FIL[1] - 0.15, S6_FIL[2] + 1.2], [S6_FIL[0], S6_FIL[1] - 0.25, S6_FIL[2]], 40],
  [100, [-2.5, 2.2, -1.4], [1.2, 2.85, -7.7], 60], [130, [-2.7, 2.15, -1.2], [1.25, 2.85, -7.8], 62],
], 9, 0.12));
export const layerA = (f: number): LayerOut => { const c0 = camA()(f), near = f < 70;
  const c = near ? focusOn(c0, S6_FIL, 0.16) : c0;
  return { c, mood: "dusk6", set: "s6", era: "1976", t: f / 30, actors: [stand(heroFloor, S6_HERO_FLOOR, f, { lookY: -0.75, lookX: -0.4 })], bulb: s6Bulb(), dust: 1, ladder6: { p: [6.4, 0, -12.6], ry: 0 }, doors6: [0.04, 0.04], highbay: 0,
    app: [{ type: "mod", p: [3.9, 0, -7.4], ry: -Math.PI / 2 }], monitor: { glow: 1, sec: 2400 + f / 30 } };
};

// ================================================================= B1-B3: generations of newer bulbs (old station, three eras)
export const camB = lazy(() => rig([[104, [0.72, 2.3, -2.22], [-2.6, 1.95, -7.7], 54], [244, [0.5, 2.3, -2.38], [-2.8, 2.0, -7.7], 54]], 10, 0.09));
const heroB = hero([[100, "content"], [138, "oneBrowUp"], [176, "suspicious"], [196, "xSideEyeR"], [232, "xSideEyeR"]], undefined, () => HIP_L);
const B_HERO: V3 = [-1.1, 0, -5.2];
const fireB: Record<string, Act> = { a: { c: FIRE12, seed: 21, face: ft([[0, "focused"]]) }, b: { c: FIRE38, seed: 22, face: ft([[0, "focused"], [190, "proud"]]) }, c: { c: FIRE38B, seed: 23, face: ft([[0, "bored"], [214, "tinyConfused"]]) } };
const flick = (f: number, t0: number, t1: number, seed: number) => f < t0 ? 1 : f > t1 ? 0 : (Math.sin(f * 2.3 + seed) + Math.sin(f * 5.1 + seed * 2) > 0.2 ? 0.25 + 0.75 * (1 - (f - t0) / (t1 - t0)) : 0.05);
const layerB = (era: Era) => (f: number): LayerOut => { const c = camB()(f);
  const actors: Placed[] = [stand(heroB, B_HERO, f, { lookY: -0.6, lookX: 0.6 })];
  let fixOn = [1, 1, 1, 1], step: LayerOut["step"]; const app: AppPlace[] = [];
  if (era === "1912") { fixOn = [1, flick(f, 140, 156, 3), 1, 1]; app.push({ type: "cart", p: [-2.9, 0, -9.0], ry: -Math.PI / 2 }, { type: "1912", p: [2.9, 0, -9.5], ry: -Math.PI / 2 }); }
  if (era === "1938") { const s = stepAt([-0.75, 0, -6.95], 0, 3); step = { p: [-0.75, 0, -6.95], ry: 0 }; fixOn = [sm(186, 190, f) * (f > 186 ? 1 : 0), 1, 1, 1];
    const ff = stand({ ...fireB.b, armR: () => UP_R, armL: () => A([-30, 120], "grip", -1, -0.4) }, [s[0] - 0.1, s[1], s[2]], f, { lookY: -0.8 }); actors.push(ff);
    app.push({ type: "1938", p: [2.9, 0, -8.2], ry: -Math.PI / 2 }); }
  if (era === "1955") { fixOn = [1, 1, flick(f, 210, 224, 7), 1]; actors.push(stand({ ...fireB.c, armL: () => HIP_L }, [-2.6, 0, -9.0], f, { lookY: -0.5, lookX: -0.4 })); app.push({ type: "1938", p: [2.9, 0, -8.2], ry: -Math.PI / 2 }); }
  return { c, mood: era === "1912" ? "dayInt" : "dayInt38", set: "old", era, t: f / 30, actors, bulb: oldBulb(), fixOn, step, app, warmFill: 0.6 };
};
export const layerB1 = layerB("1912"), layerB2 = layerB("1938"), layerB3 = layerB("1955");

// ================================================================= C: 1901 street -> through the doors -> the bulb is installed; ordinary day
export const camC = lazy(() => rig([
  [222, [4.6, 1.95, 11.6], [0.4, 5.0, -1.0], 54], [262, [3.9, 2.0, 7.4], [0.8, 3.9, -2.0], 52], [300, [3.05, 2.1, 1.0], [0.5, 2.6, -3.3], 50],
  [338, [1.55, 2.4, -1.15], [0.12, 2.45, -3.3], 44], [362, [1.6, 2.38, -1.2], [0.1, 2.45, -3.3], 44], [392, [2.4, 2.0, -0.5], [-0.4, 2.15, -5.8], 54], [478, [2.2, 1.85, -0.7], [-0.6, 2.2, -6.4], 54],
], 9, 0.08));
const STEP_C: V3 = [-0.48, 0, -3.72], STEP_C_RY = -Math.PI / 2;
export const INSTALL_ON = 346;
const installer: Act = { c: ELECTRICIAN, seed: 31, face: ft([[200, "focused"], [349, "proud"], [380, "content"]]) };
const holder: Act = { c: VOL_RED, seed: 32, face: ft([[200, "focused"], [352, "delighted"], [384, "content"]]) };
const passer: Act = { c: VOL_NAVY, seed: 33, face: ft([[0, "bored"]]) };
const coiler: Act = { c: VOL_WHITE, seed: 34, face: ft([[0, "focused"], [420, "content"]]) };
const heroC = hero([[220, "content"], [390, "suspSquint"], [430, "oneBrowUp"], [470, "suspSquint"]], () => CHIN_R, () => HIP_L);
const townA: Act = { c: TOWN_A, seed: 35, face: ft([[0, "content"]]) }, townB: Act = { c: TOWN_B, seed: 36, face: ft([[0, "talking"], [260, "content"]]) };
const passPath = path([[360, [4.4, 0, -4.9]], [395, [1.6, 0, -4.2]], [440, [-1.8, 0, -3.9]], [480, [-3.6, 0, -4.6]]]);
const installerPos = (f: number): V3 => { const top = stepAt(STEP_C, STEP_C_RY, 2), lo = stepAt(STEP_C, STEP_C_RY, 1);
  // climbs down smoothly: step 1 -> step 0 -> floor, each with a small weight dip
  const a = sm(392, 404, f), b = sm(410, 424, f), y = lerp(lerp(top[1], lo[1], a), 0, b) - 0.025 * Math.sin(Math.PI * a) - 0.025 * Math.sin(Math.PI * b);
  const z = lerp(top[2], top[2] + 0.35, b); return f < 436 ? [top[0], y, z] : lv([top[0], 0, top[2] + 0.35], [3.6, 0, -6.2], sm(436, 476, f)); };
export const layerC = (f: number): LayerOut => { const c = camC()(f);
  const glow = f < INSTALL_ON ? 0 : Math.min(1, sm(INSTALL_ON, INSTALL_ON + 10, f) * (f < INSTALL_ON + 5 ? 0.5 + 0.5 * Math.sin((f - INSTALL_ON) * 2.2) : 1));
  const actors: Placed[] = [];
  // the electrician on the stepladder screws the bulb in (hands at the socket), then climbs down and leaves
  const ip = installerPos(f), inst = stand(installer, ip, f, { lookY: f < 400 ? -0.9 : 0, lookX: -0.5 }); const sock: V3 = [OLD_BULB[0], OLD_BULB[1] - OLD_DROP + 0.02, OLD_BULB[2]];
  const twist = Math.sin(f * 0.6) * 10 * (f < INSTALL_ON ? 1 : 0); const up = 1 - sm(372, 392, f);
  inst.pose = { ...inst.pose, armR: mixArm(REST_R, aimArm(inst, c.pos, [sock[0] + 0.03, sock[1] - 0.07 + twist * 0.001, sock[2]], 1, A([0, 0], "grip", 1, Math.PI * 0.9)), up), armL: mixArm(REST_L, aimArm(inst, c.pos, [sock[0] - 0.03, sock[1] - 0.1, sock[2]], -1, A([0, 0], "grip", -1, -Math.PI * 0.9)), up) };
  if (f >= 436) { const w = walker(installer, (g) => installerPos(g), f, c, 436, 480, { lookX: 0.3 }); inst.pose = w.pose; inst.flip = w.flip; }
  actors.push(inst);
  const hp = stand({ ...holder, armR: () => A([-40, 40], "grip", 1, 0.9) }, [-0.75, 0, -3.1], f, { lookY: f < 400 ? -0.85 : -0.2, lookX: -0.4 }); actors.push(hp);
  if (f > 355) actors.push(walker(passer, passPath, f, c, 355, 480, { lookX: 0.2 }));
  const coilArm = (g: number) => A([-40 + Math.sin(g * 0.18) * 30, 70 + Math.cos(g * 0.18) * 26], "grip", -1, -0.7);
  actors.push(stand({ ...coiler, armL: coilArm, armR: (g) => A([50, 90 + Math.sin(g * 0.18 + 1) * 20], "grip", 1, 0.7) }, [-2.1, 0, -6.6], f, { lookY: 0.3 }));
  actors.push(stand(heroC, [0.9, 0, -5.2], f, { lookY: -0.6, lookX: -0.6 }));
  // townsfolk outside (independent timing)
  if (f < 320) { actors.push(walker(townA, path([[200, [-9, 0.1, 1.6]], [330, [-2.0, 0.1, 1.5]]]), f, c, 200, 330)); actors.push(stand({ ...townB, armR: () => HIP_R }, [-7.2, 0.1, 2.2], f, { lookX: 0.6 })); }
  return { c, mood: "dayInt", set: "old", era: "1901", t: f / 30, actors, bulb: oldBulb(glow), step: f < 440 ? { p: STEP_C, ry: STEP_C_RY } : undefined, warmFill: 0.5,
    app: [{ type: "cart", p: [-2.9, 0, -8.6], ry: -Math.PI / 2 }, { type: "cart", p: [2.9, 0, -8.8], ry: -Math.PI / 2 }], exposure: f < 300 ? 1.05 : 1.3 };
};

// ================================================================= D: 1901 at night — just meant to help them see
export const camD = lazy(() => rig([[446, [2.95, 1.78, 0.9], [-0.7, 2.3, -5.4], 55], [572, [1.95, 1.9, -1.45], [-0.9, 2.45, -5.8], 49]], 10, 0.1));
const LANT_COL: V3 = [0.24, 1.12, -4.8];
const lighter: Act = { c: VOL_NAVY, seed: 41, face: ft([[440, "focused"], [500, "content"]]) };
const nozzle: Act = { c: VOL_RED, seed: 42, face: ft([[440, "focused"], [520, "deadpan"]]) };
const heroD = hero([[440, "bored"], [505, "comicSerious"], [540, "deadpan"]], undefined, () => HIP_L);
export const layerD = (f: number): LayerOut => { const c = camD()(f), lit = sm(486, 496, f);
  const lp = stand({ ...lighter }, [0.75, 0, -4.4], f, { lookY: -0.1, lookX: -0.6 });
  lp.pose = { ...lp.pose, armR: aimArm(lp, c.pos, [LANT_COL[0] + 0.05, LANT_COL[1] + 0.12, LANT_COL[2]], 1, A([0, 0], "grip", 1, 0.6)), armL: aimArm(lp, c.pos, [LANT_COL[0] + 0.1, LANT_COL[1] + 0.05 + (f < 492 ? Math.sin(f * 0.9) * 0.02 : 0), LANT_COL[2] + 0.05], -1, A([0, 0], "grip", -1, -0.6)) };
  const nz = stand({ ...nozzle, armL: (g) => A([-50, 60 + Math.sin(g * 0.11) * 8], "grip", -1, -1.0), armR: () => A([60, 50], "grip", 1, 1.0) }, [-1.75, 0, -7.3], f, { lookY: 0.4, lookX: -0.5 });
  return { c, mood: "nightOld", set: "old", era: "1901", t: f / 30, actors: [lp, nz, stand(heroD, [-0.6, 0, -6.6], f, { lookY: -0.5, lookX: -0.7 })], bulb: oldBulb(),
    lanterns: [{ p: LANT_COL, lit }, { p: [0, 1.55, -9.8], lit: 1 }, { p: [-4.6, 0.95, -12.9], lit: 1 }], app: [{ type: "cart", p: [-2.9, 0, -8.6], ry: -Math.PI / 2 }, { type: "cart", p: [2.9, 0, -8.8], ry: -Math.PI / 2 }] };
};

// ================================================================= E1/E2: ordinary bulbs burn out and are replaced — this one kept working
const NEXT_GLASS: V3 = [OLD_NEXT[0], OLD_FIL[1], OLD_NEXT[2]];
export const camE = lazy(() => rig([
  [540, [NEXT_GLASS[0] + 0.24, NEXT_GLASS[1] - 0.1, NEXT_GLASS[2] + 1.1], [NEXT_GLASS[0], NEXT_GLASS[1] - 0.05, NEXT_GLASS[2]], 38], [618, [NEXT_GLASS[0] + 0.2, NEXT_GLASS[1] - 0.14, NEXT_GLASS[2] + 1.05], [NEXT_GLASS[0], NEXT_GLASS[1] - 0.1, NEXT_GLASS[2]], 38],
  [650, [OLD_FIL[0] + 0.42, OLD_FIL[1] - 0.14, OLD_FIL[2] + 1.0], [OLD_FIL[0], OLD_FIL[1] - 0.1, OLD_FIL[2]], 38], [670, [OLD_FIL[0] + 0.62, OLD_FIL[1] - 0.35, OLD_FIL[2] + 1.7], [OLD_FIL[0], OLD_FIL[1] - 0.45, OLD_FIL[2]], 42],
  [706, [0.8, 1.95, -0.9], [-0.1, 1.75, -4.6], 52],
], 8, 0.08));
const changer: Record<string, Act> = { e1: { c: FIRE12, seed: 51, face: ft([[540, "deadpan"], [598, "tinyConfused"]]) }, e2: { c: FIRE38B, seed: 52, face: ft([[600, "focused"], [628, "proud"]]) } };
const heroE = hero([[600, "content"], [654, "smug"], [676, "delighted"], [700, "smug"]], () => POINT_UP_R, () => HIP_L);
const layerE = (era: Era) => (f: number): LayerOut => { const c = camE()(f), e1 = era === "1912";
  const nextGlow = e1 ? (f < 584 ? 1 : f < 598 ? (Math.sin(f * 2.7) > 0 ? 0.8 : 0.1) * (1 - (f - 584) / 14) : 0) : sm(624, 630, f);
  const s = stepAt([OLD_NEXT[0] + 0.85, 0, OLD_NEXT[2] - 1.4], Math.PI, 3);
  const ch = stand({ ...(e1 ? changer.e1 : changer.e2) }, [s[0], s[1], s[2]], f, { lookY: -0.9, lookX: -0.3 });
  const reach = e1 ? sm(600, 612, f) : 1 - sm(630, 646, f);
  ch.pose = { ...ch.pose, armR: mixArm(REST_R, aimArm(ch, c.pos, [NEXT_GLASS[0] + 0.02, NEXT_GLASS[1] - 0.06, NEXT_GLASS[2]], 1, A([0, 0], "grip", 1, Math.PI * 0.9)), reach) };
  const actors: Placed[] = [ch, stand(heroE, [-0.35, 0, -4.4], f, { lookY: -0.7, lookX: -0.6 })];
  return { c, mood: e1 ? "dayInt" : "dayInt38", set: "old", era: e1 ? "1912" : "1938", t: f / 30, actors, bulb: oldBulb(), next: { era: "1912", glow: nextGlow, drop: 2.13 },
    step: { p: [OLD_NEXT[0] + 0.85, 0, OLD_NEXT[2] - 1.4], ry: Math.PI }, warmFill: 0.6, fixOn: [1, 1, 1, 1] };
};
export const layerE1 = layerE("1912"), layerE2 = layerE("1938");

// ================================================================= F1-F3: years passed, then decades (looking out through the doors)
export const camF = lazy(() => rig([[684, [1.45, 2.85, -3.6], [-4.0, 1.85, -3.2], 56], [806, [1.05, 2.4, -3.5], [-4.0, 1.75, -3.05], 54]], 10, 0.06));
const heroF = hero([[680, "content"], [712, "xDisbelief"], [752, "tinyConfused"], [790, "xDisbelief"]], undefined, () => HIP_L);
const fRole: Record<string, Act> = {
  a: { c: FIRE12, seed: 61, face: ft([[0, "content"]]), armR: (g) => A([60, 70 + Math.sin(g * 0.3) * 10], "grip", 1, 0.9) }, b: { c: VOL_WHITE, seed: 62, face: ft([[0, "talking"]]) },
  c: { c: FIRE38, seed: 63, face: ft([[0, "focused"]]), armL: () => HOLD_L, armR: () => HOLD_R }, d: { c: FIRE38B, seed: 64, face: ft([[0, "bored"]]) },
  e: { c: FIRE76, seed: 65, face: ft([[0, "focused"]]) }, g: { c: FIRE76B, seed: 66, face: ft([[0, "talking"], [785, "content"]]) },
};
const layerF = (era: Era) => (f: number): LayerOut => { const c = camF()(f);
  const actors: Placed[] = [stand(heroF, [0.15, 0, -1.9], f, { lookY: -0.6, lookX: -0.5 })]; const app: AppPlace[] = []; const cars: LayerOut["cars"] = [];
  if (era === "1912") { app.push({ type: "cart", p: [-2.9, 0, -3.6], ry: -Math.PI / 2 }, { type: "cart", p: [-2.9, 0, -6.6], ry: -Math.PI / 2 }); actors.push(stand(fRole.a, [-1.35, 0, -3.0], f, { lookX: -0.6 }), stand(fRole.b, [-1.6, 0, -5.6], f, { lookX: 0.6 })); }
  if (era === "1938") { app.push({ type: "1938", p: [-2.95, 0, -5.0], ry: -Math.PI / 2 }); cars.push({ kind: "car30", color: "#3a4a3a", p: [-6.5, 0, 4.0], ry: 0 }); actors.push(stand(fRole.c, [-1.4, 0, -2.4], f, { lookY: 0.4 }), stand(fRole.d, [-1.2, 0, -6.4], f, { lookX: 0.6 })); }
  if (era === "1976") { app.push({ type: "1976", p: [-2.95, 0, -5.6], ry: -Math.PI / 2 }); cars.push({ kind: "sedan", color: "#8a6a2a", p: [-7.0, 0, 4.2], ry: 0 }, { kind: "sedan", color: "#3a5a6a", p: [2 + (f - 760) * 0.25, 0, 9.0], ry: 0, spin: (f - 760) * 0.25 / 0.34 });
    actors.push(stand(fRole.e, [-1.3, 0, -2.2], f, { lookX: 0.5 }), stand(fRole.g, [-1.05, 0, -6.0], f, { lookX: -0.6 })); }
  return { c, mood: era === "1912" ? "dayInt" : "dayInt38", set: "old", era, t: f / 30, actors, bulb: oldBulb(), app, cars, warmFill: 0.5, fixOn: [1, 1, 1, 1] };
};
export const layerF1 = layerF("1912"), layerF2 = layerF("1938"), layerF3 = layerF("1976");

// ================================================================= G1: 1976 — cord cut, bulb lowered into a padded box
export const camG1 = lazy(() => rig([[782, [2.4, 2.25, -2.45], [0.0, 2.3, -3.4], 46], [818, [2.3, 2.2, -2.5], [0.1, 2.15, -3.35], 46], [856, [2.2, 2.0, -2.55], [0.5, 1.55, -3.2], 46]], 9, 0.08));
export const CUT_AT = 812;
const STEP_G: V3 = [-0.48, 0, -3.72];
const cutter: Act = { c: FIRE76, seed: 71, face: ft([[780, "focused"], [CUT_AT + 2, "worried"], [836, "relieved"]]) };
const boxer: Act = { c: FIRE76B, seed: 72, face: ft([[780, "focused"], [840, "proud"]]) };
const G1_BOX: V3 = [0.7, 1.15, -3.0];
/** bulb position while carried: hangs from the girder until the cut, then lowered into the box */
const g1Bulb = (f: number): V3 => { const top: V3 = [OLD_BULB[0], OLD_BULB[1] - OLD_DROP + 0.12, OLD_BULB[2]]; const inBox: V3 = [G1_BOX[0], G1_BOX[1] + 0.28, G1_BOX[2]];
  if (f < CUT_AT + 6) return top; return lv(top, inBox, sm(CUT_AT + 6, 840, f)); };
export const layerG1 = (f: number): LayerOut => { const c = camG1()(f);
  const s = stepAt(STEP_G, -Math.PI / 2, 2), ct = stand(cutter, [s[0], s[1], s[2]], f, { lookY: -0.6, lookX: -0.4 });
  const bp = g1Bulb(f), hand: V3 = [bp[0] + 0.02, bp[1] - 0.04, bp[2]];
  ct.pose = { ...ct.pose, armR: aimArm(ct, c.pos, hand, 1, A([0, 0], "grip", 1, Math.PI * 0.8)), armL: f < CUT_AT + 4 ? aimArm(ct, c.pos, [OLD_BULB[0] - 0.02, OLD_BULB[1] - OLD_DROP + 0.25, OLD_BULB[2]], -1, A([0, 0], "grip", -1, -Math.PI * 0.8)) : mixArm(HOLD_L, REST_L, sm(CUT_AT + 4, 830, f)) };
  const bx = stand(boxer, [1.05, 0, -2.85], f, { lookY: -0.5, lookX: -0.6 }); const boxP: V3 = [G1_BOX[0], G1_BOX[1], G1_BOX[2]];
  bx.pose = { ...bx.pose, armL: aimArm(bx, c.pos, [boxP[0] - 0.15, boxP[1] + 0.1, boxP[2]], -1, A([0, 0], "grip", -1, -1.0)), armR: aimArm(bx, c.pos, [boxP[0] + 0.17, boxP[1] + 0.1, boxP[2]], 1, A([0, 0], "grip", 1, 1.0)) };
  const glow = f < CUT_AT ? 1 : f < CUT_AT + 3 ? 0.4 : 0;
  return { c, mood: "dayInt38", set: "old", era: "1976", t: f / 30, actors: [ct, bx], bulb: { p: bp, drop: f < CUT_AT + 2 ? OLD_DROP - 0.12 : 0.12, glow, stub: f >= CUT_AT + 2 }, stubCord: f >= CUT_AT + 2,
    step: { p: STEP_G, ry: -Math.PI / 2 }, box: { p: boxP, ry: 0.3, open: 1 - sm(842, 852, f) * 0.9 }, warmFill: 0.5, fixOn: [1, 1, 1, 1], app: [{ type: "1976", p: [-2.95, 0, -7.0], ry: -Math.PI / 2 }] };
};

// ================================================================= G2: 1976 street — the engine carries the box, police car leading
const G2_V = 3.2 / 30;   // m per frame
const engineX = (f: number) => 3.4 + (f - 836) * G2_V;
export const camG2 = lazy(() => rig([[832, [engineX(832) - 8.4, 2.2, 6.2], [engineX(832) + 5.0, 1.55, 5.6], 48], [910, [engineX(910) - 8.2, 2.15, 6.2], [engineX(910) + 5.0, 1.55, 5.6], 48]], 8, 0.05));
const rider: Act = { c: FIRE76, seed: 73, face: ft([[830, "focused"], [880, "comicSerious"]]), armL: () => HOLD_L, armR: () => HOLD_R };
export const layerG2 = (f: number): LayerOut => { const c = camG2()(f), ex = engineX(f), d = (f - 836) * G2_V;
  const rp: V3 = [ex - 4.55, 0.62, 5.6]; const r = stand(rider, rp, f, { lookX: 0.5 });
  return { c, mood: "dayExt", set: "old", era: "1976", t: f / 30, actors: [r], bulb: { p: [0, -50, 0], drop: 0.1, glow: 0 }, outside: true,
    app: [{ type: "1976", p: [ex, 0, 5.6], ry: 0, spin: d / 0.55 }], cars: [{ kind: "police", p: [ex + 10.5, 0, 7.7], ry: 0, spin: d / 0.34 }, { kind: "sedan", color: "#6a2a22", p: [-6.5, 0, 11.4], ry: Math.PI }],
    box: { p: [rp[0] - 0.32, 1.02, rp[2]], ry: 0, open: 0 } };
};

// ================================================================= G3: arrival at the new Station 6 (1976) — the box is carried in
export const camG3 = lazy(() => rig([[886, [-7.0, 1.8, 8.8], [3.6, 1.8, 4.6], 52], [918, [-6.7, 1.8, 8.5], [1.4, 1.8, 3.6], 52], [948, [-5.8, 1.75, 7.6], [-3.2, 1.7, -0.5], 50]], 8, 0.06));
const G3_STOP = 916;
const engG3 = (f: number): V3 => { const u = cl((f - 884) / (G3_STOP + 4 - 884)); return [4.5 + 4.5 * (1 - u) * (1 - u), 0, 5.4]; };
const carrier: Act = { c: FIRE76, seed: 74, face: ft([[880, "focused"], [930, "proud"]]), armL: () => HOLD_L, armR: () => HOLD_R };
const carryPath = path([[918, [1.0, 0, 3.9]], [926, [0.0, 0, 3.4]], [946, [-2.8, 0, 1.4]], [968, [-3.8, 0, -2.0]]]);
export const layerG3 = (f: number): LayerOut => { const c = camG3()(f), e = engG3(f);
  const cr = walker(carrier, carryPath, Math.max(f, 918), c, 918, 968); const hb = handWorld(cr, c.pos, 1), hb2 = handWorld(cr, c.pos, -1);
  return { c, mood: "day6ext", set: "s6", era: "1976", t: f / 30, actors: f >= 918 ? [cr] : [], bulb: { p: [0, -50, 0], drop: 0.1, glow: 0 }, outside: true, doors6: [1, 1], highbay: 1,
    app: [{ type: "1976", p: e, ry: Math.PI, spin: (9 - e[0]) / 0.55 }], box: f >= 918 ? { p: [(hb[0] + hb2[0]) / 2, (hb[1] + hb2[1]) / 2 - 0.12, (hb[2] + hb2[2]) / 2], ry: 0.2, open: 0 } : undefined };
};

// ================================================================= G4: the bulb goes up again in the new bay (1976)
export const RELIT = 950;
export const camG4 = lazy(() => rig([[924, [2.6, 4.95, -5.6], [-0.6, 4.15, -7.1], 50], [966, [2.2, 4.95, -5.85], [-0.6, 4.15, -7.1], 48]], 8, 0.08));
const fixer: Act = { c: FIRE76, seed: 75, face: ft([[920, "focused"], [RELIT + 2, "delighted"]]) };
export const layerG4 = (f: number): LayerOut => { const c = camG4()(f);
  const p = stand(fixer, PLATFORM, f, { lookY: -0.7, lookX: 0.3 }); const sock: V3 = [S6_BULB[0], S6_BULB[1] - S6_DROP + 0.02, S6_BULB[2]];
  p.pose = { ...p.pose, armR: mixArm(aimArm(p, c.pos, [sock[0], sock[1] - 0.08, sock[2]], 1, A([0, 0], "grip", 1, Math.PI * 0.9)), REST_R, sm(RELIT + 4, RELIT + 16, f)) };
  const glow = f < RELIT ? 0 : Math.min(1, sm(RELIT, RELIT + 8, f));
  return { c, mood: "dusk6", set: "s6", era: "1976", t: f / 30, actors: [p], bulb: s6Bulb(glow), ladder6: { p: LADDER_AT, ry: LADDER_RY }, doors6: [0.05, 0.05], highbay: 0.6, app: [{ type: "1976", p: [3.9, 0, -7.6], ry: -Math.PI / 2 }] };
};

// ================================================================= H: here's the strange part — the hero leans in on the platform
export const camH = lazy(() => rig([[944, [1.3, 4.7, -6.2], [-0.75, 4.22, -7.05], 46], [1010, [0.9, 4.62, -6.35], [-0.75, 4.22, -7.05], 42]], 9, 0.09));
const heroH = hero([[944, "content"], [952, "suspSquint"], [968, "oneBrowUp"], [990, "suspSquint"]], () => CHIN_R, () => A([-60, 40], "grip", -1, -1.0));
const heroPlat = (f: number, lean = 0.18) => stand(heroH, PLATFORM, f, { lookY: -0.3, lookX: -0.9, lean, bodyRoll: -0.12 * lean / 0.18 });
export const layerH = (f: number): LayerOut => { const c = camH()(f), lean = 0.08 + 0.12 * sm(950, 980, f);
  return { c, mood: "dusk6", set: "s6", era: "1976", t: f / 30, actors: [heroPlat(f, lean)], bulb: s6Bulb(), ladder6: { p: LADDER_AT, ry: LADDER_RY }, doors6: [0.04, 0.04], highbay: 0, dust: 0.5,
    app: [{ type: "mod", p: [3.9, 0, -7.4], ry: -Math.PI / 2 }] };
};

// ================================================================= J: occasional interruptions (night): dark -> flashlight check -> extension cord -> glow returns
export const OFF_AT = 1092, ON_AT = 1150;
export const camJ = lazy(() => rig([[986, [2.0, 3.9, -5.3], [-3.6, 2.9, -8.15], 56], [1182, [1.9, 3.88, -5.35], [-3.6, 2.88, -8.15], 55]], 12, 0.05));
const heroJ = hero([[986, "suspSquint"], [1040, "comicSerious"], [OFF_AT + 2, "hugeShock"], [1118, "panic"], [ON_AT + 3, "relieved"], [1166, "delighted"]], undefined, () => A([-60, 40], "grip", -1, -1.0));
const checker: Act = { c: FIRE_MOD, seed: 81, face: ft([[1090, "focused"], [1124, "tinyConfused"], [ON_AT + 2, "proud"]]) };
const checkPath = path([[1096, [-4.0, 0, -6.0]], [1118, [-6.75, 0, -8.0]], [1180, [-6.8, 0, -8.05]]]);
export const layerJ = (f: number): LayerOut => { const c = camJ()(f);
  const glow = f < OFF_AT ? 1 : f < ON_AT ? 0 : f < ON_AT + 6 ? ((f - ON_AT) % 3 < 1.5 ? 0.7 : 0.3) : 1;
  const actors: Placed[] = [stand(heroJ, PLATFORM, f, { lookY: -0.3, lookX: -0.8, lean: f > OFF_AT && f < 1120 ? -0.08 : 0.06 })];
  let flash: LayerOut["flash"]; const cords: LayerOut["cords"] = [];
  if (f >= 1096) { const ck = walker(checker, checkPath, f, c, 1096, 1180); const hw = handWorld(ck, c.pos, 1);
    const tgt: V3 = f < 1130 ? [BOX_AT[0], BOX_AT[1] + 0.05, BOX_AT[2]] : [BOX_AT[0], 0.45, BOX_AT[2]];
    if (f > 1118) ck.pose = { ...ck.pose, armR: aimArm(ck, c.pos, [hw[0] - 0.2, 1.35, hw[2]], 1, A([0, 0], "grip", 1, 1.2)), armL: f > 1132 ? aimArm(ck, c.pos, [BOX_AT[0] + 0.03, 0.46 + (f < ON_AT ? 0.04 * Math.sin(f * 0.8) : 0), BOX_AT[2] + 0.05], -1, A([0, 0], "grip", -1, -1.3)) : REST_L };
    actors.push(ck); const fh = handWorld(ck, c.pos, 1); flash = { p: [fh[0], fh[1] + 0.05, fh[2]], to: tgt, on: f < ON_AT + 20 ? 1 : 1 - sm(ON_AT + 20, ON_AT + 30, f) };
    if (f > 1136) cords.push({ pts: [[BOX_AT[0] + 0.02, 0.44, BOX_AT[2] + 0.05], [BOX_AT[0] + 0.25, 0.05, BOX_AT[2] + 0.2], [BOX_AT[0] + 0.6, 0.012, BOX_AT[2] + 0.1], [BOX_AT[0] + 0.5, 0.012, BOX_AT[2] - 0.2], [BOX_AT[0] + 0.08, 0.3, BOX_AT[2] - 0.15], [BOX_AT[0] + 0.02, BOX_AT[1] - 0.28, BOX_AT[2] - 0.1]], color: "#e86a1a", r: 0.009 }); }
  return { c, mood: "night6", set: "s6", era: "1976", t: f / 30, actors, bulb: s6Bulb(glow), ladder6: { p: LADDER_AT, ry: LADDER_RY }, doors6: [0.0, 0.0], highbay: 0, flash, cords, app: [{ type: "mod", p: [3.9, 0, -7.4], ry: -Math.PI / 2 }],
    monitor: { glow, sec: 3600 * 2 + f / 30 } };
};

// ================================================================= K: survived more than a century at very low brightness (day, high-bays on)
export const camK = lazy(() => rig([[1158, [2.7, 1.35, -1.5], [-0.8, 1.55, -6.8], 56], [1215, [2.4, 1.45, -2.1], [-0.7, 1.75, -6.8], 54], [1262, [1.2, 2.9, -4.2], [-0.6, 3.8, -6.6], 48], [1300, [0.25, 4.12, -5.55], [-0.6, 4.24, -6.6], 40], [1342, [0.05, 4.2, -5.75], [-0.6, 4.25, -6.6], 38]], 10, 0.1));
const heroK = hero([[1160, "content"], [1200, "delighted"], [1250, "idea"], [1290, "delighted"]], () => A([70, -40], "open", 1, 2.4, [110, 30]), () => HIP_L);
const modWalker: Act = { c: FIRE_MOD_GEAR, seed: 91, face: ft([[1180, "content"], [1220, "bored"]]) };
export const layerK = (f: number): LayerOut => { const c0 = camK()(f), c = f > 1270 ? focusOn(c0, S6_FIL, 0.14) : c0;
  return { c, mood: "day6", set: "s6", era: "1976", t: f / 30, actors: [stand(heroK, [0.95, 0, -5.6], f, { lookY: -0.8, lookX: -0.5 }), walker(modWalker, path([[1176, [-3.0, 0, -6.4]], [1250, [2.2, 0, -3.6]]]), f, c, 1176, 1250)],
    bulb: s6Bulb(0.9), ladder6: { p: [6.4, 0, -12.6], ry: 0 }, doors6: [1, 1], highbay: 1, app: [{ type: "mod", p: [3.9, 0, -7.4], ry: -Math.PI / 2 }], outside: true, dust: f > 1270 ? 0.6 : 0 };
};

// ================================================================= L: the BulbCam -> the monitor -> disbelief
const MON: V3 = MON_AT;
export const camL = lazy(() => rig([[1316, [-2.6, 2.0, -3.6], [-0.9, 2.6, -6.9], 54], [1360, [-3.0, 2.4, -4.2], [-1.0, 3.3, -7.0], 52], [1400, [-5.6, 3.9, -7.0], [-7.2, 4.45, -8.35], 46], [1418, [-6.25, 4.3, -7.55], [-7.25, 4.5, -8.4], 44], [1440, [-6.4, 4.35, -7.7], [-7.25, 4.52, -8.4], 42], [1470, [-5.15, 2.2, -9.4], [-7.0, 1.4, -10.95], 54], [1504, [-4.85, 1.65, -9.65], [-7.0, 1.4, -10.95], 56]], 10, 0.08));
const heroL = hero([[1320, "content"], [1408, "focused"], [1430, "xDisbelief"], [1452, "doubleTake"], [1474, "xDisbelief"]], () => A([40, 120], "relaxed", 1, 0.3), () => A([-70, 30], "open", -1, -1.6, [-110, 20]));
export const layerL = (f: number): LayerOut => { const c = camL()(f), lookUp = sm(1450, 1458, f) * (1 - sm(1470, 1480, f));
  const gazer = stand({ c: FIRE_MOD, seed: 95, face: ft([[1300, "content"], [1350, "delighted"]]), armR: () => HIP_R }, [-1.6, 0, -5.6], f, { lookY: -0.85, lookX: 0.4 });
  return { c, mood: "dusk6", set: "s6", era: "1976", t: f / 30, actors: [gazer, stand(heroL, [-6.5, 0, -11.3], f, { lookX: lerp(-0.9, 0.2, lookUp), lookY: lerp(0.1, -0.9, lookUp) })], bulb: s6Bulb(), ladder6: { p: [6.4, 0, -12.6], ry: 0 }, doors6: [0.04, 0.04], highbay: 0,
    monitor: { glow: 1, sec: 2400 + f / 30 }, app: [{ type: "mod", p: [3.9, 0, -7.4], ry: -Math.PI / 2 }] };
};
void MON;

// ================================================================= M: one little bulb just kept going -> back to the macro (loop)
export const camM = lazy(() => rig([[1478, [-2.7, 2.15, -1.2], [1.25, 2.85, -7.8], 62], [1524, [-1.6, 2.2, -2.2], [-0.15, 1.9, -6.0], 64], [1548, [-0.8, 3.6, -4.9], [-0.6, 4.15, -6.6], 44],
  [1557, [S6_FIL[0] + 0.3, S6_FIL[1] + 0.05, S6_FIL[2] + 0.95], S6_FIL, 39], [1567, [S6_FIL[0] + 0.11, S6_FIL[1] + 0.022, S6_FIL[2] + 0.43], S6_FIL, 37], [1607, [S6_FIL[0] + 0.075, S6_FIL[1] + 0.02, S6_FIL[2] + 0.29], S6_FIL, 36]], 9, 0.12));
export const layerM = (f: number): LayerOut => { const c0 = camM()(f), c = f > 1550 ? focusOn(c0, S6_FIL, 0.16) : c0;
  return { c, mood: "dusk6", set: "s6", era: "1976", t: f / 30, actors: [stand(heroFloor, S6_HERO_FLOOR, f, { lookY: -0.75, lookX: -0.4 })], bulb: s6Bulb(), dust: 1, ladder6: { p: [6.4, 0, -12.6], ry: 0 }, doors6: [0.04, 0.04], highbay: 0,
    app: [{ type: "mod", p: [3.9, 0, -7.4], ry: -Math.PI / 2 }], monitor: { glow: 1, sec: 2400 + f / 30 } };
};

// ================================================================= layers + dissolves
export type Layer = "A" | "B1" | "B2" | "B3" | "C" | "D" | "E1" | "E2" | "F1" | "F2" | "F3" | "G1" | "G2" | "G3" | "G4" | "H" | "J" | "K" | "L" | "M" | "A_LOOP";
export const LAYERS: [Layer, number, number, number, number][] = [
  ["A", 0, 0, 108, 128], ["B1", 108, 128, 150, 162], ["B2", 150, 162, 190, 202], ["B3", 190, 202, 226, 244], ["C", 226, 244, 450, 474], ["D", 450, 474, 546, 566],
  ["E1", 546, 566, 612, 628], ["E2", 612, 628, 688, 704], ["F1", 688, 704, 726, 738], ["F2", 726, 738, 760, 772], ["F3", 760, 772, 786, 800],
  ["G1", 786, 800, 838, 852], ["G2", 838, 852, 888, 900], ["G3", 888, 900, 924, 936], ["G4", 924, 936, 944, 958], ["H", 944, 958, 990, 1004], ["J", 990, 1004, 1158, 1176],
  ["K", 1158, 1176, 1318, 1336], ["L", 1318, 1336, 1478, 1496], ["M", 1478, 1496, N, N], ["A_LOOP", 1566, N, N, N],
];
export const layerOpacity = (Lr: (typeof LAYERS)[number], f: number) => { const [, a, b, c, d] = Lr; if (f < a || (f >= d && d < N)) return 0; const up = b > a ? sm(a, b, f) : 1; const dn = d > c ? 1 - sm(c, d, f) : 1; return Math.min(up, dn); };
export const LAYER_FN: Record<Exclude<Layer, "A_LOOP">, (f: number) => LayerOut> = {
  A: layerA, B1: layerB1, B2: layerB2, B3: layerB3, C: layerC, D: layerD, E1: layerE1, E2: layerE2, F1: layerF1, F2: layerF2, F3: layerF3,
  G1: layerG1, G2: layerG2, G3: layerG3, G4: layerG4, H: layerH, J: layerJ, K: layerK, L: layerL, M: layerM,
};
export const layerAt = (L: Layer, f0: number) => L === "A_LOOP" ? layerA(f0 - N) : LAYER_FN[L](f0);
void UP_L; void WORK_L; void WORK_R; void VOL_WHITE; void FIRE38B; void HOLD_R;
