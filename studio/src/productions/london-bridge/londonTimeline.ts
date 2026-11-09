// London act (frames 340-984): camera, Hal, clerk, promenade people, dismantling crew, crane, ship. Pure functions of
// the ABSOLUTE film frame. Sound events are derived from the same data.
import { V3, clamp01, lerp, smooth } from "../../lib/math";
import { ARM, ArmPose, COSTUME, Odo5Pose, pose5, REST_L, REST_R, type Costume } from "../../char/odo5";
import { personEvents, personPose, type Persona } from "../../char/crowdLife";
import { camPath, TAU } from "./common";

export const Y0 = 3.0;                   // promenade height (river surface 0.9)
export const RIVER_Y = 0.9, BANK_X = 27.6;
const pulse = (a: number, b: number, c: number, d: number, f: number) => smooth(a, b, f) * (1 - smooth(c, d, f));

// ---------------- camera ----------------
export const camLondon = camPath([
  { f: 300, pos: [-2, 92, 170], look: [-6, 20, 10], fov: 50 },
  { f: 340, pos: [-8, 64, 128], look: [-10, 10, 0], fov: 50 },
  { f: 400, pos: [-34, 17, 58], look: [-22, 6, 2], fov: 48 },
  { f: 440, pos: [-40.0, 6.8, 29.5], look: [-30.5, 4.3, 16.0], fov: 46 },
  { f: 470, pos: [-34.6, 4.7, 22.6], look: [-29.5, 4.2, 15.6], fov: 42 },
  { f: 560, pos: [-34.0, 4.6, 22.2], look: [-29.4, 4.2, 15.7], fov: 40 },
  { f: 627, pos: [-33.6, 4.7, 22.0], look: [-29.6, 4.4, 15.4], fov: 40 },
  { f: 700, pos: [-35.6, 4.7, 22.8], look: [-31.0, 4.2, 15.8], fov: 42 },
  { f: 773, pos: [-39.0, 5.4, 21.5], look: [-33.5, 4.3, 12.0], fov: 46 },
  { f: 830, pos: [-42.4, 6.6, 16.2], look: [-36.0, 4.4, 7.2], fov: 46 },
  { f: 880, pos: [-41.5, 8.0, 33.0], look: [-27.0, 5.0, 24.5], fov: 48 },
  { f: 935, pos: [-40.0, 11.0, 33.0], look: [-22.0, 3.0, 34.0], fov: 48 },
  { f: 990, pos: [-40.0, 14.0, 36.0], look: [-20.0, 2.0, 56.0], fov: 50 },
  { f: 1030, pos: [-39.0, 15.0, 42.0], look: [-19.0, 2.0, 70.0], fov: 50 },
], 7);

// ---------------- Hal ----------------
const HAL_A: V3 = [-36.0, Y0, 16.2], HAL_B: V3 = [-30.0, Y0, 17.0], WALK0 = 418, WALK1 = 452, STRIDE = 0.72;
const walkU = (f: number) => { const t = clamp01((f - WALK0) / (WALK1 - WALK0)); return t < 0.15 ? t * t / 0.3 : t > 0.82 ? 1 - (1 - t) ** 2 / 0.36 : (t - 0.075) / 0.82; };
export const halLondonAt = (f: number): V3 => { const u = Math.min(1, walkU(f)); return [lerp(HAL_A[0], HAL_B[0], u), Y0, lerp(HAL_A[2], HAL_B[2], u)]; };
export const halLondonVisible = (f: number) => f >= WALK0 - 2 && f < 985;
const gaitAt = (f: number) => (Math.hypot(halLondonAt(f)[0] - HAL_A[0], halLondonAt(f)[2] - HAL_A[2])) / STRIDE;
type K = { f: number; arm: ArmPose };
const armAt = (keys: K[], f: number): ArmPose => {
  let i = 0; while (i < keys.length - 2 && keys[i + 1].f <= f) i++;
  const a = keys[i].arm, b = keys[i + 1].arm, u = smooth(keys[i].f, keys[i + 1].f, f);
  const ea = a.elbow ?? [a.hand[0] * 0.4, 96], eb = b.elbow ?? [b.hand[0] * 0.4, 96];
  return { hand: [lerp(a.hand[0], b.hand[0], u), lerp(a.hand[1], b.hand[1], u)], elbow: [lerp(ea[0], eb[0], u), lerp(ea[1], eb[1], u)], bend: b.bend, shape: u < 0.5 ? a.shape : b.shape, rot: lerp(a.rot, b.rot, u), behind: false };
};
// blueprint is held between both hands at chest height (470-560), lowered in the left hand (560-628)
const BP_L: ArmPose = { hand: [40, 40], elbow: [-30, 86], shape: "grip", rot: -0.6, bend: -1 }, BP_R: ArmPose = { hand: [-40, 40], elbow: [30, 86], shape: "grip", rot: 0.6, bend: 1 };
const BP_SHOW_L: ArmPose = { hand: [10, -10], elbow: [-50, 60], shape: "grip", rot: -1.0, bend: -1 }, BP_SHOW_R: ArmPose = { hand: [-10, -10], elbow: [50, 60], shape: "grip", rot: 1.0, bend: 1 };
const YAWN_R: ArmPose = { hand: [40, -160], elbow: [86, -40], shape: "open", rot: 2.4, bend: 1 }, IDEA_R: ArmPose = { hand: [70, -150], elbow: [78, -30], shape: "open", rot: 0.2, bend: 1 };
const PEN_R: ArmPose = { hand: [-30, 62], elbow: [40, 90], shape: "grip", rot: 2.4, bend: 1 }, LEAN_L: ArmPose = { hand: [60, 70], elbow: [-20, 92], shape: "open", rot: -1.2, bend: -1 };
const PUSH_L: ArmPose = { hand: [96, 80], elbow: [10, 96], shape: "open", rot: -1.4, bend: -1 }, PUSH_R: ArmPose = { hand: [40, 84], elbow: [60, 96], shape: "open", rot: -1.2, bend: 1 };
const L_KEYS: K[] = [{ f: 0, arm: REST_L }, { f: 462, arm: REST_L }, { f: 474, arm: BP_L }, { f: 500, arm: BP_L }, { f: 512, arm: BP_SHOW_L }, { f: 552, arm: BP_SHOW_L }, { f: 566, arm: { ...REST_L, shape: "grip" } }, { f: 640, arm: { ...REST_L, shape: "grip" } }, { f: 652, arm: LEAN_L }, { f: 712, arm: LEAN_L }, { f: 722, arm: PUSH_L }, { f: 744, arm: PUSH_L }, { f: 756, arm: REST_L }, { f: 9999, arm: REST_L }];
const R_KEYS: K[] = [{ f: 0, arm: REST_R }, { f: 462, arm: REST_R }, { f: 474, arm: BP_R }, { f: 500, arm: BP_R }, { f: 512, arm: BP_SHOW_R }, { f: 552, arm: BP_SHOW_R }, { f: 564, arm: REST_R }, { f: 568, arm: YAWN_R }, { f: 592, arm: YAWN_R }, { f: 602, arm: REST_R }, { f: 608, arm: IDEA_R }, { f: 626, arm: IDEA_R }, { f: 638, arm: REST_R }, { f: 652, arm: PEN_R }, { f: 704, arm: PEN_R }, { f: 714, arm: REST_R }, { f: 722, arm: PUSH_R }, { f: 744, arm: PUSH_R }, { f: 758, arm: ARM.thumb }, { f: 772, arm: ARM.thumb }, { f: 786, arm: REST_R }, { f: 9999, arm: REST_R }];
export const SIGN0 = 656, SIGN1 = 700;
export const halLondonPose = (f: number): Odo5Pose => {
  const front = f >= WALK1, walking = !front;
  const yawn = pulse(566, 572, 590, 600, f), idea = pulse(604, 608, 626, 636, f);
  const r = armAt(R_KEYS, f);
  if (f >= SIGN0 && f < SIGN1) { const ph = (f - SIGN0) / 30 * 2.6; r.hand = [r.hand[0] + 9 * Math.cos(TAU * ph), r.hand[1] + 4 * Math.sin(TAU * 2 * ph)]; }
  return pose5({
    costume: COSTUME.hal, view: front ? "front" : "side",
    gait: gaitAt(f), walk: walking ? clamp01((f - WALK0) / 4) * (1 - smooth(WALK1 - 4, WALK1, f)) : 0, stride: STRIDE, lean: walking ? 0.04 : 0,
    blink: [430, 520, 610, 690, 760, 850].some((b) => f >= b && f < b + 4),
    lookX: front ? (f < 512 ? 0.1 : f < 560 ? 0.35 : f < 628 ? lerp(0.0, 0.7, smooth(598, 610, f)) : f < 710 ? -0.35 : -0.5) : 0.5,
    lookY: front ? (f >= SIGN0 && f < SIGN1 ? -0.7 : f >= 598 && f < 640 ? 0.5 : 0) : 0,
    eyes: yawn > 0.5 ? "squint" : idea > 0.4 ? "wide" : "lid", lids: 0.35, pupil: 1,
    browL: 0.75 + 0.5 * idea - 0.2 * yawn, browR: 0.4 + 0.5 * idea, worry: 0,
    mouth: yawn > 0.4 ? "o" : idea > 0.4 ? "o" : f >= SIGN0 && f < SIGN1 ? "flat" : "smile", mouthW: yawn > 0.4 ? 1.35 : idea > 0.4 ? 0.8 : 1,
    armL: front ? armAt(L_KEYS, f) : REST_L, armR: front ? r : REST_R, rim: 0.55,
    breathe: (f / 30) * TAU * 0.35, squash: Math.max(0, 1 - Math.abs(f - WALK1) / 4) + 0.3 * yawn + 0.4 * Math.max(0, 1 - Math.abs(f - 608) / 4),
    holdR: f >= 646 && f < 712 ? "pen" : undefined, hairLag: 0,
  });
};
export const blueprintAt = (f: number) => ({ open: smooth(474, 498, f) * (1 - smooth(556, 566, f)), show: pulse(500, 514, 548, 558, f), rolledInL: f >= 562 && f < 646 });
export const ideaSpark = (f: number) => pulse(605, 609, 622, 632, f);

// ---------------- clerk + lectern + cheque + money ----------------
export const CLERK: V3 = [-32.5, Y0, 16.4], LECTERN: V3 = [-31.25, Y0, 17.1];
export const lecternIn = (f: number) => smooth(612, 640, f);         // lectern + clerk walk-on (slide in from left, behind camera line)
export const clerkAt = (f: number): V3 => [lerp(-38, CLERK[0], smooth(600, 640, f)), Y0, CLERK[2]];
export const STAMP = 706, CRATE0 = 722, CRATE1 = 744, HATTIP = 756;
export const clerkPose = (f: number): Odo5Pose => {
  const stamp = pulse(700, 704, 708, 712, f), tip = pulse(HATTIP - 4, HATTIP + 4, HATTIP + 14, HATTIP + 22, f), walking = f < 640;
  const stampArm: ArmPose = { hand: [-20 + 0, 30 - 70 * (1 - Math.abs(Math.sin((f - 700) / 12 * Math.PI)))], elbow: [40, 70], shape: "fist", rot: 0, bend: 1 };
  return pose5({
    costume: COSTUME.clerk, view: walking ? "side" : "front", gait: (lerp(-38, CLERK[0], smooth(600, 640, f)) + 38) / 0.72, walk: walking ? clamp01((f - 600) / 4) * (1 - smooth(636, 640, f)) : 0, stride: 0.72,
    lookX: walking ? 0.5 : f < 700 ? 0.55 : f < 744 ? 0.35 : 0.2, lookY: f >= 650 && f < 700 ? -0.5 : 0, eyes: "lid", lids: 0.45, mouth: f >= 744 ? "smile" : "flat",
    browL: 0.55 + 0.3 * tip, browR: 0.45 + 0.3 * tip, blink: [660, 735, 800].some((b) => f >= b && f < b + 4),
    armL: REST_L, armR: tip > 0.01 ? { hand: [-30, -220 * tip], elbow: [70, -60 * tip], shape: "grip", rot: 2.6, bend: 1 } : stamp > 0 || (f >= 696 && f < 716) ? stampArm : { ...REST_R, shape: "grip" },
    holdR: f < 690 || f > 740 ? "umbrella" : undefined, rim: 0.45, breathe: (f / 30) * TAU * 0.3, squash: 0.25 * Math.max(0, 1 - Math.abs(f - STAMP) / 3),
  });
};
export const crateX = (f: number) => lerp(-30.4, -31.9, smooth(CRATE0, CRATE1, f));
export const CRATE_Z = 17.9;

// ---------------- dismantling crew + promenade people (independent crowdLife personas) ----------------
const tint = (b: Costume, pal: Record<string, string>): Costume => ({ ...b, pal: { ...(b.pal ?? {}), ...pal } });
export const LONDON_PEOPLE: { pos: V3; h: number; P: Persona }[] = [
  // promenade: a chatting couple, a man with a newspaper, a woman watching the river
  { pos: [-33.6, Y0, 12.4], h: 1.5, P: { seed: 501, costume: tint(COSTUME.clerk, { shirt: "#5b4a3a", shirtShade: "#463829", hat: "#3a2f28" }), idle: "behind", breathe: 3, sway: 1, swayAmp: 0.008, mood: "smile", eyes: "lid", brow: 0.6, temper: 0.8, clips: [{ kind: "talk", t0: 360, t1: 470, toward: 0.6, rate: 3.8, gesture: 1 }, { kind: "laugh", t0: 470, t1: 488 }, { kind: "look", t0: 530, t1: 600, x: 0.7, y: 0.1 }, { kind: "talk", t0: 640, t1: 760, toward: 0.6, rate: 3.2, gesture: 0 }] } },
  { pos: [-32.9, Y0, 11.9], h: 1.42, P: { seed: 502, costume: tint(COSTUME.odo, { shirt: "#8a3b4a", shirtShade: "#6a2b38" }), idle: "clasp", breathe: 2, sway: 2, swayAmp: 0.009, mood: "smile", eyes: "squint", brow: 0.7, temper: 0.9, clips: [{ kind: "look", t0: 360, t1: 470, x: -0.6, y: 0 }, { kind: "nod", t0: 400, t1: 430, times: 2 }, { kind: "laugh", t0: 472, t1: 492 }, { kind: "point", t0: 540, t1: 572, side: 1, dir: [150, -100] }, { kind: "look", t0: 640, t1: 760, x: -0.6, y: 0 }] } },
  { pos: [-29.3, Y0, 10.2], h: 1.5, P: { seed: 503, costume: tint(COSTUME.clerk, { shirt: "#2f3f5f", shirtShade: "#22304a" }), idle: "pockets", breathe: 2, sway: 3, swayAmp: 0.007, mood: "flat", eyes: "lid", brow: 0.5, temper: 0.6, clips: [{ kind: "look", t0: 380, t1: 520, x: 0.2, y: -0.5 }, { kind: "lapel", t0: 560, t1: 584, side: -1 }, { kind: "look", t0: 600, t1: 720, x: -0.5, y: 0.2 }] } },
  // dismantling crew at the stacked blocks under the north abutment (chalk numbers, hammer, wrench) — x -34..-31, z 2..6
  { pos: [-37.6, Y0, 8.6], h: 1.45, P: { seed: 511, costume: COSTUME.workerA, holdR: "chalk", idle: "rest", breathe: 3, sway: 1, swayAmp: 0.01, mood: "flat", eyes: "lid", brow: 0.6, temper: 1.0, clips: [{ kind: "work", t0: 780, t1: 860, tool: "chalk", rate: 1.6, target: [60, 30] }, { kind: "look", t0: 866, t1: 920, x: 0.6, y: 0.5 }] } },
  { pos: [-36.3, Y0, 7.4], h: 1.48, P: { seed: 512, costume: COSTUME.workerB, holdR: "hammer", idle: "hip", breathe: 2, sway: 2, swayAmp: 0.01, mood: "flat", eyes: "squint", brow: 0.6, temper: 1.1, clips: [{ kind: "work", t0: 792, t1: 880, tool: "hammer", rate: 1.25, target: [10, 60] }, { kind: "hat", t0: 890, t1: 914, side: 1 }] } },
  { pos: [-35.0, Y0, 8.9], h: 1.44, P: { seed: 513, costume: tint(COSTUME.workerA, { hat: "#e85d3a", hatShade: "#b8432a", shirt: "#3f8f5a", shirtShade: "#2f6d44" }), holdR: "wrench", idle: "rest", breathe: 3, sway: 2, swayAmp: 0.012, mood: "awkward", eyes: "lid", brow: 0.65, temper: 0.9, clips: [{ kind: "look", t0: 776, t1: 806, x: -0.5, y: 0 }, { kind: "work", t0: 808, t1: 900, tool: "wrench", rate: 2.1, target: [20, 50] }] } },
  { pos: [-34.2, Y0, 6.8], h: 1.46, P: { seed: 514, costume: tint(COSTUME.workerB, { shirt: "#2f5f8f", shirtShade: "#21456a", hat: "#f2c230" }), holdR: "chalk", idle: "pockets", breathe: 2, sway: 1, swayAmp: 0.008, mood: "smile", eyes: "squint", brow: 0.7, temper: 0.8, clips: [{ kind: "talk", t0: 776, t1: 820, toward: -0.6, rate: 3.6, gesture: 0 }, { kind: "work", t0: 826, t1: 900, tool: "chalk", rate: 1.3, target: [50, 40] }] } },
];
export const londonPersonPose = (i: number, f: number) => personPose(LONDON_PEOPLE[i].P, f, { loop: 100000, subjectX: () => 0.3 });
export const londonPeopleVisible = (i: number, f: number) => (i < 3 ? f < 800 : f >= 760);

// ---------------- crane, blocks, ship ----------------
// derrick crane at the quay: lifts a numbered block from the stack and swings it into the ship's hold (870-940)
export const CRANE: V3 = [-29.6, Y0, 24.5], STACK: V3 = [-33.0, Y0, 23.0];
export const SHIP0: V3 = [-21.0, RIVER_Y, 28.5];
export const shipAt = (f: number): V3 => { const t = Math.max(0, f - 942); return [SHIP0[0] + 0.004 * t * t * 0.02, RIVER_Y, SHIP0[2] + 0.0045 * t * t]; };
export const craneAt = (f: number) => {
  const u = smooth(872, 900, f), sw = smooth(900, 928, f), down = smooth(928, 940, f);
  const yaw = lerp(2.25, 0.62, sw);                           // boom heading (rad, around y)
  const hookY = lerp(Y0 + 0.9, Y0 + 6.2, u) - (Y0 + 4.2) * down * 0.62;
  return { yaw, hookY, carrying: f >= 878 && f < 940, released: f >= 940 };
};
// ---------------- sound events ----------------
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
export const londonSoundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  ev.push({ frame: 318, kind: "whoosh_reveal", x: 0, gain: 0.4, note: "camera rises into the clouds" });
  ev.push({ frame: 352, kind: "whoosh_reveal", x: 0, gain: 0.3, note: "camera descends out of the clouds over the Thames" });
  ev.push({ frame: 380, kind: "bell_chime", x: 0.4, gain: 0.5, note: "distant city clock bell (original)" });
  for (const f of [366, 432, 548, 812, 905]) ev.push({ frame: f, kind: "gull", x: (f % 3) - 1, gain: 0.5, note: "gull cry over the river" });
  for (let f = WALK0 + 1; f <= WALK1; f++) for (const off of [0, 0.5]) if (Math.floor(gaitAt(f - 1) - off) !== Math.floor(gaitAt(f) - off) && gaitAt(f) - gaitAt(f - 1) > 0.001) ev.push({ frame: f, kind: "step_stone", x: -0.2, gain: 0.85, note: "Hal's shoes on the paving" });
  ev.push({ frame: WALK1, kind: "turn_scuff", x: -0.1, gain: 0.6, note: "Hal turns to camera" });
  ev.push({ frame: 476, kind: "paper_unroll", x: -0.05, gain: 0.8, note: "blueprint unrolls" });
  ev.push({ frame: 512, kind: "paper_rustle", x: -0.05, gain: 0.6, note: "blueprint shown to camera" });
  ev.push({ frame: 562, kind: "paper_rustle", x: -0.1, gain: 0.45, note: "blueprint rolled into one hand" });
  ev.push({ frame: 570, kind: "yawn", x: -0.05, gain: 0.7, note: "Hal's exaggerated yawn (nobody would visit)" });
  ev.push({ frame: 607, kind: "idea_ding", x: 0, gain: 0.55, note: "lightbulb moment: soft bell" });
  for (let f = SIGN0 + 2; f < SIGN1 - 2; f += 5) ev.push({ frame: f, kind: "pen_scratch", x: -0.05, gain: 0.7, note: "pen signs the cheque" });
  ev.push({ frame: STAMP, kind: "stamp_thunk", x: -0.15, gain: 0.85, note: "clerk stamps the cheque" });
  ev.push({ frame: CRATE0 + 2, kind: "crate_slide", x: -0.1, gain: 0.7, note: "money crate slides across" });
  ev.push({ frame: CRATE1 - 4, kind: "register_ring", x: -0.1, gain: 0.5, note: "cash-register ding (original synth)" });
  ev.push({ frame: HATTIP - 2, kind: "cloth_soft", x: -0.15, gain: 0.8, note: "clerk tips bowler hat" });
  ev.push({ frame: 640, kind: "step_stone", x: -0.4, gain: 0.5, note: "clerk arrives at the lectern" });
  LONDON_PEOPLE.forEach((p, i) => { for (const e of personEvents(p.P, i)) ev.push({ frame: e.frame, kind: e.kind, x: -0.3 + 0.1 * (i % 4), gain: 1, note: e.note }); });
  ev.push({ frame: 874, kind: "crane_winch", x: 0.2, gain: 0.8, note: "crane winch lifts a numbered block" });
  ev.push({ frame: 878, kind: "chain_rattle", x: 0.2, gain: 0.6, note: "lifting chain takes the load" });
  ev.push({ frame: 902, kind: "crane_winch", x: 0.4, gain: 0.55, note: "crane slews toward the ship" });
  ev.push({ frame: 940, kind: "stone_thud", x: 0.5, gain: 0.85, note: "block lands in the ship's hold" });
  ev.push({ frame: 946, kind: "ship_horn", x: 0.6, gain: 0.7, note: "cargo ship horn: departure" });
  ev.push({ frame: 950, kind: "ship_engine", x: 0.6, gain: 0.7, note: "ship engine chugs as it pulls away" });
  return ev;
};
