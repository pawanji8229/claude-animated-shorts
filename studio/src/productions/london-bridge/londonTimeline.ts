// London act v2 (frames 344-996): camera, Hal, the seller (clerk), the purchase handover, promenade people, the
// dismantling crew walking in, the bridge being taken apart, the full crane loading cycle and the ship's departure.
// Pure functions of the ABSOLUTE film frame. Sound events are derived from the same data.
import { V3, clamp01, lerp, smooth } from "../../lib/math";
import { ARM, ArmPose, COSTUME, Odo5Pose, pose5, REST_L, REST_R, shoulderPx5, type Costume } from "../../char/odo5";
import { personEvents, personPose, type Persona } from "../../char/crowdLife";
import { camPath, TAU } from "./common";
import { BLOCK, CraneState, HOLDS, HOLD_FLOOR, shipDeckY } from "./assets";

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
  { f: 627, pos: [-33.6, 4.75, 22.6], look: [-30.35, 4.25, 16.75], fov: 42 },
  { f: 700, pos: [-33.0, 4.65, 21.9], look: [-30.35, 4.2, 16.8], fov: 40 },
  { f: 727, pos: [-31.55, 4.25, 18.55], look: [-30.55, 4.05, 16.55], fov: 31 },   // close on the cheque
  { f: 742, pos: [-31.5, 4.25, 18.5], look: [-30.55, 4.05, 16.55], fov: 31 },
  { f: 768, pos: [-33.3, 4.65, 22.0], look: [-30.35, 4.15, 16.8], fov: 42 },      // handshake + deed two-shot
  { f: 790, pos: [-36.5, 5.0, 20.0], look: [-33.0, 4.1, 11.5], fov: 42 },
  { f: 812, pos: [-40.6, 5.0, 14.6], look: [-36.4, 3.9, 7.6], fov: 40 },          // chalk numbering close
  { f: 846, pos: [-38.0, 13.5, 27.0], look: [-16.0, 7.0, 2.0], fov: 46 },         // reveal: the bridge coming apart
  { f: 876, pos: [-46.0, 12.5, 46.0], look: [-30.0, 6.5, 31.0], fov: 50 },        // loading: stack, crane, ship
  { f: 905, pos: [-45.0, 13.0, 47.0], look: [-28.5, 6.5, 32.0], fov: 50 },
  { f: 940, pos: [-42.0, 11.0, 46.0], look: [-26.5, 3.5, 34.0], fov: 46 },        // block into the hold
  { f: 970, pos: [-44.0, 12.0, 48.0], look: [-24.5, 2.5, 34.5], fov: 48 },
  { f: 996, pos: [-44.0, 12.0, 49.5], look: [-24.0, 2.5, 37.0], fov: 48 },        // ahead-left of the ship (= sea camera)
  { f: 1020, pos: [-44.0, 12.0, 51.0], look: [-24.0, 2.5, 40.0], fov: 48 },
], 7);

// ---------------- Hal ----------------
const HAL_A: V3 = [-36.0, Y0, 16.2], HAL_B: V3 = [-30.0, Y0, 17.0], WALK0 = 418, WALK1 = 452, STRIDE = 0.72;
const walkU = (f: number) => { const t = clamp01((f - WALK0) / (WALK1 - WALK0)); return t < 0.15 ? t * t / 0.3 : t > 0.82 ? 1 - (1 - t) ** 2 / 0.36 : (t - 0.075) / 0.82; };
export const halLondonAt = (f: number): V3 => { const u = Math.min(1, walkU(f)); return [lerp(HAL_A[0], HAL_B[0], u), Y0, lerp(HAL_A[2], HAL_B[2], u)]; };
export const halLondonVisible = (f: number) => f >= WALK0 - 2 && f < 1000;
const gaitAt = (f: number) => (Math.hypot(halLondonAt(f)[0] - HAL_A[0], halLondonAt(f)[2] - HAL_A[2])) / STRIDE;
type K = { f: number; arm: ArmPose };
const armAt = (keys: K[], f: number): ArmPose => {
  let i = 0; while (i < keys.length - 2 && keys[i + 1].f <= f) i++;
  const a = keys[i].arm, b = keys[i + 1].arm, u = smooth(keys[i].f, keys[i + 1].f, f);
  const ea = a.elbow ?? [a.hand[0] * 0.4, 96], eb = b.elbow ?? [b.hand[0] * 0.4, 96];
  return { hand: [lerp(a.hand[0], b.hand[0], u), lerp(a.hand[1], b.hand[1], u)], elbow: [lerp(ea[0], eb[0], u), lerp(ea[1], eb[1], u)], bend: b.bend, shape: u < 0.5 ? a.shape : b.shape, rot: lerp(a.rot, b.rot, u), behind: false };
};
const BP_L: ArmPose = { hand: [40, 40], elbow: [-30, 86], shape: "grip", rot: -0.6, bend: -1 }, BP_R: ArmPose = { hand: [-40, 40], elbow: [30, 86], shape: "grip", rot: 0.6, bend: 1 };
const BP_SHOW_L: ArmPose = { hand: [10, -10], elbow: [-50, 60], shape: "grip", rot: -1.0, bend: -1 }, BP_SHOW_R: ArmPose = { hand: [-10, -10], elbow: [50, 60], shape: "grip", rot: 1.0, bend: 1 };
const YAWN_R: ArmPose = { hand: [40, -160], elbow: [86, -40], shape: "open", rot: 2.4, bend: 1 }, IDEA_R: ArmPose = { hand: [70, -150], elbow: [78, -30], shape: "open", rot: 0.2, bend: 1 };
// purchase: cheque book in the left hand, pen in the right; tear; hand the cheque across; handshake; take the deed
const BOOK_L: ArmPose = { hand: [60, 70], elbow: [-20, 92], shape: "grip", rot: -1.2, bend: -1 }, PEN_R: ArmPose = { hand: [-30, 62], elbow: [40, 90], shape: "grip", rot: 2.4, bend: 1 };
const TEAR_R: ArmPose = { hand: [-10, 30], elbow: [60, 92], shape: "grip", rot: 2.0, bend: 1 }, GIVE_R: ArmPose = { hand: [-270, 30], elbow: [-70, 118], shape: "grip", rot: -1.4, bend: 1 };
const SHAKE_L: ArmPose = { hand: [-150, 40], elbow: [-92, 112], shape: "open", rot: -1.6, bend: -1 }, TAKE_L: ArmPose = { hand: [-200, 30], elbow: [-110, 104], shape: "grip", rot: -1.5, bend: -1 };
const DEED_UP: ArmPose = { hand: [-40, -130], elbow: [-96, 0], shape: "grip", rot: -2.6, bend: -1 };
export const SIGN0 = 656, SIGN1 = 700, TEAR = 704, GIVE = 718, POCKET0 = 742, POCKET1 = 750, SHAKE0 = 752, SHAKE1 = 764, DEED = 772, HATTIP = 786;
const L_KEYS: K[] = [{ f: 0, arm: REST_L }, { f: 462, arm: REST_L }, { f: 474, arm: BP_L }, { f: 500, arm: BP_L }, { f: 512, arm: BP_SHOW_L }, { f: 552, arm: BP_SHOW_L }, { f: 566, arm: { ...REST_L, shape: "grip" } }, { f: 640, arm: { ...REST_L, shape: "grip" } },
  { f: 650, arm: BOOK_L }, { f: TEAR, arm: BOOK_L }, { f: 712, arm: REST_L }, { f: 744, arm: REST_L }, { f: SHAKE0, arm: SHAKE_L }, { f: SHAKE1, arm: SHAKE_L }, { f: 768, arm: TAKE_L }, { f: 776, arm: TAKE_L }, { f: 790, arm: DEED_UP }, { f: 826, arm: DEED_UP }, { f: 840, arm: { ...REST_L, shape: "grip" } }, { f: 9999, arm: { ...REST_L, shape: "grip" } }];
const R_KEYS: K[] = [{ f: 0, arm: REST_R }, { f: 462, arm: REST_R }, { f: 474, arm: BP_R }, { f: 500, arm: BP_R }, { f: 512, arm: BP_SHOW_R }, { f: 552, arm: BP_SHOW_R }, { f: 564, arm: REST_R }, { f: 568, arm: YAWN_R }, { f: 592, arm: YAWN_R }, { f: 602, arm: REST_R }, { f: 608, arm: IDEA_R }, { f: 626, arm: IDEA_R }, { f: 638, arm: REST_R },
  { f: 652, arm: PEN_R }, { f: SIGN1, arm: PEN_R }, { f: TEAR, arm: TEAR_R }, { f: 708, arm: TEAR_R }, { f: 716, arm: GIVE_R }, { f: GIVE + 2, arm: GIVE_R }, { f: 730, arm: REST_R }, { f: 790, arm: REST_R }, { f: 800, arm: ARM.thumb }, { f: 822, arm: ARM.thumb }, { f: 836, arm: REST_R }, { f: 9999, arm: REST_R }];
const shakeBob = (f: number) => (f >= SHAKE0 && f < SHAKE1 ? 11 * Math.sin(TAU * (f - SHAKE0) / 7) * pulse(SHAKE0, SHAKE0 + 2, SHAKE1 - 2, SHAKE1, f) : 0);
export const halLondonPose = (f: number): Odo5Pose => {
  const front = f >= WALK1, walking = !front;
  const yawn = pulse(566, 572, 590, 600, f), idea = pulse(604, 608, 626, 636, f);
  const r = armAt(R_KEYS, f), l = armAt(L_KEYS, f);
  if (f >= SIGN0 && f < SIGN1) { const ph = (f - SIGN0) / 30 * 2.6; r.hand = [r.hand[0] + 9 * Math.cos(TAU * ph), r.hand[1] + 4 * Math.sin(TAU * 2 * ph)]; }
  l.hand = [l.hand[0], l.hand[1] + shakeBob(f)];
  const proud = smooth(780, 792, f) * (1 - smooth(830, 842, f));
  return pose5({
    costume: COSTUME.hal, view: front ? "front" : "side",
    gait: gaitAt(f), walk: walking ? clamp01((f - WALK0) / 4) * (1 - smooth(WALK1 - 4, WALK1, f)) : 0, stride: STRIDE, lean: walking ? 0.04 : 0,
    blink: [430, 520, 610, 690, 740, 810, 850].some((b) => f >= b && f < b + 4),
    lookX: front ? (f < 512 ? 0.1 : f < 560 ? 0.35 : f < 628 ? lerp(0.0, 0.7, smooth(598, 610, f)) : f < 704 ? -0.1 : f < 780 ? -0.5 : 0.15) : 0.5,
    lookY: front ? (f >= SIGN0 - 8 && f < TEAR + 2 ? -0.7 : f >= 598 && f < 640 ? 0.5 : proud * 0.3) : 0,
    eyes: yawn > 0.5 ? "squint" : idea > 0.4 ? "wide" : proud > 0.5 ? "squint" : "lid", lids: 0.35, pupil: 1,
    browL: 0.75 + 0.5 * idea - 0.2 * yawn + 0.2 * proud, browR: 0.4 + 0.5 * idea + 0.2 * proud, worry: 0,
    mouth: yawn > 0.4 ? "o" : idea > 0.4 ? "o" : f >= SIGN0 && f < SIGN1 ? "flat" : "smile", mouthW: yawn > 0.4 ? 1.35 : idea > 0.4 ? 0.8 : 1 + 0.15 * proud,
    armL: front ? l : REST_L, armR: front ? r : REST_R, rim: 0.55,
    breathe: (f / 30) * TAU * 0.35, squash: Math.max(0, 1 - Math.abs(f - WALK1) / 4) + 0.3 * yawn + 0.4 * Math.max(0, 1 - Math.abs(f - 608) / 4) + 0.25 * Math.max(0, 1 - Math.abs(f - 790) / 4),
    holdR: f >= 646 && f < TEAR + 2 ? "pen" : undefined, hairLag: 0,
  });
};
export const blueprintAt = (f: number) => ({ open: smooth(474, 498, f) * (1 - smooth(556, 566, f)), show: pulse(500, 514, 548, 558, f), rolledInL: f >= 562 && f < 646 });
export const ideaSpark = (f: number) => pulse(605, 609, 622, 632, f);

// ---------------- the seller (Corporation clerk) ----------------
export const CLERK: V3 = [-30.75, Y0, 16.55];
const CLERK_FROM: V3 = [-37.5, Y0, 15.0];
export const clerkAt = (f: number): V3 => { const u = smooth(600, 640, f); return [lerp(CLERK_FROM[0], CLERK[0], u), Y0, lerp(CLERK_FROM[2], CLERK[2], u)]; };
export const clerkVisible = (f: number) => f >= 598;
const RECV_R: ArmPose = { hand: [230, 30], elbow: [112, 100], shape: "grip", rot: 1.4, bend: 1 }, INSPECT_R: ArmPose = { hand: [60, -170], elbow: [120, -20], shape: "grip", rot: 2.4, bend: 1 };
const POCKET_R: ArmPose = { hand: [-70, 40], elbow: [60, 100], shape: "open", rot: 0.6, bend: 1 }, SHAKE_R: ArmPose = { hand: [232, 40], elbow: [112, 112], shape: "open", rot: 1.6, bend: 1 };
const HAND_L: ArmPose = { hand: [262, 22], elbow: [100, 112], shape: "grip", rot: 1.2, bend: -1 };
const C_R: K[] = [{ f: 0, arm: REST_R }, { f: 710, arm: REST_R }, { f: GIVE - 2, arm: RECV_R }, { f: GIVE + 4, arm: RECV_R }, { f: 730, arm: INSPECT_R }, { f: POCKET0, arm: INSPECT_R }, { f: POCKET1 - 2, arm: POCKET_R }, { f: POCKET1, arm: POCKET_R }, { f: SHAKE0 + 2, arm: SHAKE_R }, { f: SHAKE1, arm: SHAKE_R }, { f: 772, arm: REST_R }, { f: 9999, arm: REST_R }];
const C_L: K[] = [{ f: 0, arm: { ...REST_L, shape: "grip" } }, { f: SHAKE1, arm: { ...REST_L, shape: "grip" } }, { f: DEED - 4, arm: HAND_L }, { f: DEED + 2, arm: HAND_L }, { f: 784, arm: REST_L }, { f: 9999, arm: REST_L }];
export const clerkPose = (f: number): Odo5Pose => {
  const tip = pulse(HATTIP - 4, HATTIP + 4, HATTIP + 14, HATTIP + 22, f), walking = f < 640, insp = pulse(724, 730, 740, 746, f);
  const r = armAt(C_R, f); r.hand = [r.hand[0], r.hand[1] + shakeBob(f)];
  return pose5({
    costume: COSTUME.clerk, view: walking ? "side" : "front", gait: Math.hypot(clerkAt(f)[0] - CLERK_FROM[0], clerkAt(f)[2] - CLERK_FROM[2]) / 0.72, walk: walking ? clamp01((f - 600) / 4) * (1 - smooth(636, 640, f)) : 0, stride: 0.72,
    lookX: walking ? 0.5 : lerp(0.55, 0.2, insp), lookY: lerp(0, -0.35, insp), eyes: insp > 0.5 ? "wide" : "lid", lids: 0.45, mouth: insp > 0.5 ? "o" : f >= POCKET0 ? "smile" : "flat", mouthW: 1 - 0.2 * insp,
    browL: 0.55 + 0.3 * tip + 0.4 * insp, browR: 0.45 + 0.3 * tip + 0.4 * insp, blink: [660, 700, 760, 820].some((b) => f >= b && f < b + 4),
    armL: armAt(C_L, f), armR: tip > 0.01 ? { hand: [-30, -220 * tip], elbow: [70, -60 * tip], shape: "grip", rot: 2.6, bend: 1 } : r,
    rim: 0.45, breathe: (f / 30) * TAU * 0.3, squash: 0.15 * insp,
  });
};
/** card-pixel position of a front-view hand (side = -1 screen-left arm, +1 screen-right arm) */
export const handPx = (p: Odo5Pose, side: -1 | 1): [number, number] => { const s = shoulderPx5(p, side), a = side < 0 ? p.armL : p.armR; return [s[0] + a.hand[0], s[1] + a.hand[1]]; };
/** where each purchase prop is and who holds it */
export const props = (f: number) => ({
  book: { k: smooth(640, 648, f) * (1 - smooth(TEAR, TEAR + 8, f)), holder: "hal-L" as const },
  cheque: f < TEAR ? { k: smooth(640, 648, f), holder: "hal-L" as const } : f < GIVE ? { k: 1, holder: "hal-R" as const } : f < POCKET1 ? { k: 1 - smooth(POCKET0 + 2, POCKET1, f), holder: "clerk-R" as const } : { k: 0, holder: "clerk-R" as const },
  deed: f < DEED ? { holder: "clerk-L" as const } : { holder: "hal-L" as const },
});

// ---------------- people: promenade (always present), dismantling crew (walk in), quay + deck hands ----------------
const tint = (b: Costume, pal: Record<string, string>): Costume => ({ ...b, pal: { ...(b.pal ?? {}), ...pal } });
export type LPerson = { pos: V3; h: number; P: Persona; walkIn?: { from: V3; t0: number; t1: number }; onShip?: V3 };
export const LONDON_PEOPLE: LPerson[] = [
  { pos: [-33.6, Y0, 12.4], h: 1.5, P: { seed: 501, costume: tint(COSTUME.clerk, { shirt: "#5b4a3a", shirtShade: "#463829", hat: "#3a2f28" }), idle: "behind", breathe: 3, sway: 1, swayAmp: 0.008, mood: "smile", eyes: "lid", brow: 0.6, temper: 0.8, clips: [{ kind: "talk", t0: 360, t1: 470, toward: 0.6, rate: 3.8, gesture: 1 }, { kind: "laugh", t0: 470, t1: 488 }, { kind: "look", t0: 530, t1: 600, x: 0.7, y: 0.1 }, { kind: "talk", t0: 640, t1: 760, toward: 0.6, rate: 3.2, gesture: 0 }, { kind: "look", t0: 800, t1: 900, x: -0.6, y: 0.2 }] } },
  { pos: [-32.9, Y0, 11.9], h: 1.42, P: { seed: 502, costume: tint(COSTUME.odo, { shirt: "#8a3b4a", shirtShade: "#6a2b38" }), idle: "clasp", breathe: 2, sway: 2, swayAmp: 0.009, mood: "smile", eyes: "squint", brow: 0.7, temper: 0.9, clips: [{ kind: "look", t0: 360, t1: 470, x: -0.6, y: 0 }, { kind: "nod", t0: 400, t1: 430, times: 2 }, { kind: "laugh", t0: 472, t1: 492 }, { kind: "point", t0: 540, t1: 572, side: 1, dir: [150, -100] }, { kind: "look", t0: 640, t1: 760, x: -0.6, y: 0 }, { kind: "point", t0: 820, t1: 850, side: -1, dir: [-150, -120] }] } },
  { pos: [-29.3, Y0, 10.2], h: 1.5, P: { seed: 503, costume: tint(COSTUME.clerk, { shirt: "#2f3f5f", shirtShade: "#22304a" }), idle: "pockets", breathe: 2, sway: 3, swayAmp: 0.007, mood: "flat", eyes: "lid", brow: 0.5, temper: 0.6, clips: [{ kind: "look", t0: 380, t1: 520, x: 0.2, y: -0.5 }, { kind: "lapel", t0: 560, t1: 584, side: -1 }, { kind: "look", t0: 600, t1: 720, x: -0.5, y: 0.2 }, { kind: "look", t0: 790, t1: 880, x: -0.4, y: 0.5 }] } },
  // dismantling crew: walk in from the west end of the promenade, then chalk numbers / hammer / wrench at the stacks
  { pos: [-37.6, Y0, 8.6], h: 1.45, walkIn: { from: [-46.5, Y0, 10.6], t0: 740, t1: 784 }, P: { seed: 511, costume: COSTUME.workerA, holdR: "chalk", idle: "rest", breathe: 3, sway: 1, swayAmp: 0.01, mood: "flat", eyes: "lid", brow: 0.6, temper: 1.0, clips: [{ kind: "work", t0: 792, t1: 870, tool: "chalk", rate: 1.6, target: [60, 30] }, { kind: "look", t0: 874, t1: 940, x: 0.6, y: 0.5 }] } },
  { pos: [-36.3, Y0, 7.4], h: 1.48, walkIn: { from: [-47.0, Y0, 9.4], t0: 748, t1: 790 }, P: { seed: 512, costume: COSTUME.workerB, holdR: "hammer", idle: "hip", breathe: 2, sway: 2, swayAmp: 0.01, mood: "flat", eyes: "squint", brow: 0.6, temper: 1.1, clips: [{ kind: "work", t0: 798, t1: 884, tool: "hammer", rate: 1.25, target: [10, 60] }, { kind: "hat", t0: 892, t1: 916, side: 1 }] } },
  { pos: [-35.0, Y0, 8.9], h: 1.44, walkIn: { from: [-46.0, Y0, 11.4], t0: 756, t1: 800 }, P: { seed: 513, costume: tint(COSTUME.workerA, { hat: "#e85d3a", hatShade: "#b8432a", shirt: "#3f8f5a", shirtShade: "#2f6d44" }), holdR: "wrench", idle: "rest", breathe: 3, sway: 2, swayAmp: 0.012, mood: "awkward", eyes: "lid", brow: 0.65, temper: 0.9, clips: [{ kind: "look", t0: 802, t1: 818, x: -0.5, y: 0 }, { kind: "work", t0: 820, t1: 900, tool: "wrench", rate: 2.1, target: [20, 50] }] } },
  { pos: [-34.2, Y0, 6.8], h: 1.46, walkIn: { from: [-47.5, Y0, 8.0], t0: 762, t1: 808 }, P: { seed: 514, costume: tint(COSTUME.workerB, { shirt: "#2f5f8f", shirtShade: "#21456a", hat: "#f2c230" }), holdR: "chalk", idle: "pockets", breathe: 2, sway: 1, swayAmp: 0.008, mood: "smile", eyes: "squint", brow: 0.7, temper: 0.8, clips: [{ kind: "talk", t0: 810, t1: 830, toward: -0.6, rate: 3.6, gesture: 0 }, { kind: "work", t0: 834, t1: 900, tool: "chalk", rate: 1.3, target: [50, 40] }] } },
  // loading gang at the quay stack (there from the start of the act) + a deck hand aboard the ship
  { pos: [-35.6, Y0, 27.0], h: 1.46, P: { seed: 521, costume: tint(COSTUME.workerA, { shirt: "#6b4a2f", shirtShade: "#4f3622", hat: "#d9d2c0" }), idle: "hip", breathe: 3, sway: 2, swayAmp: 0.01, mood: "flat", eyes: "lid", brow: 0.6, temper: 1.1, clips: [{ kind: "look", t0: 600, t1: 830, x: 0.4, y: 0.2 }, { kind: "work", t0: 842, t1: 866, tool: "wrench", rate: 1.6, target: [80, 10] }, { kind: "point", t0: 872, t1: 900, side: 1, dir: [120, -170] }, { kind: "look", t0: 904, t1: 990, x: 0.6, y: 0.4 }] } },
  { pos: [-33.0, Y0, 30.0], h: 1.44, P: { seed: 522, costume: tint(COSTUME.workerB, { shirt: "#3f5f3f", shirtShade: "#2f472f", hat: "#c8b23a" }), idle: "rest", breathe: 2, sway: 1, swayAmp: 0.012, mood: "smile", eyes: "squint", brow: 0.7, temper: 0.9, clips: [{ kind: "talk", t0: 600, t1: 700, toward: -0.6, rate: 3.2, gesture: 0 }, { kind: "work", t0: 846, t1: 868, tool: "hammer", rate: 1.2, target: [-40, 40] }, { kind: "wave", t0: 900, t1: 922, side: 1, rate: 1.6, height: 0.9 }, { kind: "look", t0: 924, t1: 990, x: 0.5, y: 0.3 }] } },
  { pos: [0, 0, 0], h: 1.42, onShip: [3.0, 0, 1.8], P: { seed: 523, costume: tint(COSTUME.workerA, { shirt: "#2f3f6f", shirtShade: "#222f52", hat: "#2a2a2a" }), idle: "hip", breathe: 3, sway: 2, swayAmp: 0.01, mood: "flat", eyes: "lid", brow: 0.6, temper: 1.0, clips: [{ kind: "look", t0: 860, t1: 922, x: -0.3, y: 0.6 }, { kind: "point", t0: 924, t1: 944, side: -1, dir: [-120, 60] }, { kind: "work", t0: 946, t1: 960, tool: "wrench", rate: 1.8, target: [-40, 60] }, { kind: "wave", t0: 962, t1: 990, side: -1, rate: 1.5, height: 1.0 }] } },
];
const easeWalk = (t: number) => (t < 0.12 ? t * t / 0.24 : t > 0.88 ? 1 - (1 - t) ** 2 / 0.24 : (t - 0.06) / 0.88);
export const londonPersonAt = (i: number, f: number): V3 => {
  const p = LONDON_PEOPLE[i];
  if (p.onShip) { const s = shipAt(f), o = p.onShip; return [s[0] - o[2], RIVER_Y + shipDeckY(o[0]) + 0.01, s[2] + o[0]]; }
  if (!p.walkIn) return p.pos;
  const u = easeWalk(clamp01((f - p.walkIn.t0) / (p.walkIn.t1 - p.walkIn.t0)));
  return [lerp(p.walkIn.from[0], p.pos[0], u), Y0, lerp(p.walkIn.from[2], p.pos[2], u)];
};
export const londonPersonPose = (i: number, f: number): Odo5Pose => {
  const p = LONDON_PEOPLE[i], w = p.walkIn;
  if (w && f < w.t1 + 2) {
    const at = londonPersonAt(i, f), d = Math.hypot(at[0] - w.from[0], at[2] - w.from[2]);
    return pose5({ costume: p.P.costume, view: "side", gait: d / 0.7, walk: clamp01((f - w.t0) / 4) * (1 - smooth(w.t1 - 4, w.t1 + 1, f)), stride: 0.7, lean: 0.03, lookX: 0.5, eyes: p.P.eyes, mouth: p.P.mood, holdR: p.P.holdR, rim: 0.45, breathe: (f / 30) * TAU * 0.3, blink: (f + p.P.seed) % 97 < 4 });
  }
  return personPose(p.P, f, { loop: 100000, subjectX: () => 0.3 });
};
export const londonPeopleVisible = (_i: number, _f: number) => true;

// ---------------- the old bridge being taken apart ----------------
export const dismantleY = (f: number) => lerp(11.8, 7.4, smooth(776, 852, f));

// ---------------- quay stack, crane loading cycle, ship ----------------
export const CRANE: V3 = [-30.0, Y0, 30.5], STACK: V3 = [-34.2, Y0, 28.4];
export const SHIP0: V3 = [-24.7, RIVER_Y, 29.0];
export const DEPART = 958;
export const shipAt = (f: number): V3 => { const t = Math.max(0, f - DEPART); return [SHIP0[0] + 0.0011 * t * t, RIVER_Y, SHIP0[2] + 0.0045 * t * t]; };
export const shipSpeed = (f: number) => Math.hypot(shipAt(f + 1)[0] - shipAt(f)[0], shipAt(f + 1)[2] - shipAt(f)[2]);
export const CARGO0 = 11;                                   // blocks already in the forward hold when the act opens
/** ship-local slot of cargo block i (matches CargoShip's layout) */
export const cargoSlot = (i: number): V3 => { const H = HOLDS[0], col = i % 4, row = Math.floor(i / 4) % 3, lay = Math.floor(i / 12); return [H.x0 + 0.75 + col * 1.25, HOLD_FLOOR + 0.3 + lay * 0.6, -0.8 + row * 0.8]; };
const localToWorld = (l: V3, s: V3 = SHIP0): V3 => [s[0] - l[2], s[1] + l[1], s[2] + l[0]];
/** stack: 2 layers of 3 x 2; the crane lifts the top-front block (index LIFT) */
export const stackBlocks = (): { n: number; p: V3 }[] => Array.from({ length: 12 }, (_, i) => { const lay = Math.floor(i / 6), j = i % 6; return { n: 1172 + i * 13, p: [STACK[0] + (j % 3) * 1.08 - 1.08, Y0 + 0.3 + lay * 0.6, STACK[2] + Math.floor(j / 3) * 0.78 - 0.39] as V3 }; }).filter((_, i) => i < 10);
export const LIFT = 7;
const yawTo = (p: V3) => Math.atan2(-(p[2] - CRANE[2]), p[0] - CRANE[0]);
const radTo = (p: V3) => Math.hypot(p[0] - CRANE[0], p[2] - CRANE[2]) - 0.8;
export const craneAt = (f: number): CraneState & { carrying: boolean; released: boolean } => {
  const pick = stackBlocks()[LIFT].p, slot = localToWorld(cargoSlot(CARGO0));
  const yS = yawTo(pick), yH0 = yawTo(slot), yH = yH0 < yS ? yH0 + TAU : yH0, yR = yH;   // rest: jib over the ship
  const rS = radTo(pick), rH = radTo(slot), hookPick = pick[1] + 1.05 + BLOCK[1] / 2, hookSlot = slot[1] + 1.05 + BLOCK[1] / 2;
  const s1 = smooth(790, 836, f), s2 = smooth(892, 924, f);
  const yaw = lerp(lerp(yR, yS, s1), yH, s2), radius = lerp(lerp(5.6, rS, s1), rH, s2);
  let hookY = lerp(10.0, hookPick + 0.5, smooth(800, 836, f));
  hookY = lerp(hookY, hookPick, smooth(836, 848, f));
  hookY = lerp(hookY, 10.4, smooth(866, 892, f));
  hookY = lerp(hookY, hookSlot, smooth(924, 944, f));
  hookY = lerp(hookY, 7.5, smooth(950, 976, f));
  const carrying = f >= 866 && f < 944, swing = carrying ? Math.sin((f - 892) / 6.5) * 0.6 * pulse(890, 900, 926, 940, f) : 0;
  return { yaw, radius, hookY, load: carrying ? "slung" : "slack", swing, carrying, released: f >= 944, blockRy: lerp(0, -Math.PI / 2, smooth(900, 936, f)) };
};
export const shipCargo = (f: number) => CARGO0 + (f >= 944 ? 1 : 0);
export const stackHas = (i: number, f: number) => !(i === LIFT && f >= 866);
/** mooring lines (quay bollard -> ship bitt), hauled aboard as the ship casts off */
export const mooring = (f: number): [V3, V3][] => {
  const s = shipAt(f), k = 1 - smooth(948, 962, f); if (k <= 0.01) return [];
  return ([[[-27.9, Y0 + 0.35, SHIP0[2] - 8.5], [-5.2, 0, 1.3]], [[-27.9, Y0 + 0.35, SHIP0[2] + 10.5], [9.6, 0, 0.9]]] as [V3, V3][]).map(([q, l]) => {
    const b: V3 = [s[0] - l[2], RIVER_Y + shipDeckY(l[0]) + 0.35, s[2] + l[0]]; return [[lerp(b[0], q[0], k), lerp(b[1], q[1], k), lerp(b[2], q[2], k)], b];
  });
};

// ---------------- sound events ----------------
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
export const londonSoundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  ev.push({ frame: 380, kind: "bell_chime", x: 0.4, gain: 0.5, note: "distant city clock bell (original)" });
  for (const f of [366, 432, 548, 812, 905]) ev.push({ frame: f, kind: "gull", x: (f % 3) - 1, gain: 0.5, note: "gull cry over the river" });
  for (let f = WALK0 + 1; f <= WALK1; f++) for (const off of [0, 0.5]) if (Math.floor(gaitAt(f - 1) - off) !== Math.floor(gaitAt(f) - off) && gaitAt(f) - gaitAt(f - 1) > 0.001) ev.push({ frame: f, kind: "step_stone", x: -0.2, gain: 0.85, note: "Hal's shoes on the paving" });
  ev.push({ frame: WALK1, kind: "turn_scuff", x: -0.1, gain: 0.6, note: "Hal turns to camera" });
  ev.push({ frame: 476, kind: "paper_unroll", x: -0.05, gain: 0.8, note: "blueprint unrolls" });
  ev.push({ frame: 512, kind: "paper_rustle", x: -0.05, gain: 0.6, note: "blueprint shown to camera" });
  ev.push({ frame: 562, kind: "paper_rustle", x: -0.1, gain: 0.45, note: "blueprint rolled into one hand" });
  ev.push({ frame: 570, kind: "yawn", x: -0.05, gain: 0.7, note: "Hal's exaggerated yawn (nobody would visit)" });
  ev.push({ frame: 607, kind: "idea_ding", x: 0, gain: 0.55, note: "lightbulb moment: soft bell" });
  for (const f of [612, 622, 632]) ev.push({ frame: f, kind: "step_stone", x: -0.4, gain: 0.45, note: "the seller walks up with the deed" });
  ev.push({ frame: 642, kind: "cloth_soft", x: -0.05, gain: 0.7, note: "Hal pulls the cheque book from his jacket" });
  for (let f = SIGN0 + 2; f < SIGN1 - 2; f += 5) ev.push({ frame: f, kind: "pen_scratch", x: -0.05, gain: 0.7, note: "pen writes the cheque" });
  ev.push({ frame: TEAR, kind: "paper_rustle", x: -0.05, gain: 0.85, note: "cheque torn from the book" });
  ev.push({ frame: GIVE, kind: "paper_rustle", x: -0.15, gain: 0.5, note: "cheque handed to the seller" });
  ev.push({ frame: POCKET0 + 4, kind: "cloth_soft", x: -0.15, gain: 0.6, note: "seller tucks the cheque into his breast pocket" });
  ev.push({ frame: SHAKE0 + 2, kind: "cloth_soft", x: -0.1, gain: 0.7, note: "handshake" });
  ev.push({ frame: DEED, kind: "paper_rustle", x: -0.1, gain: 0.6, note: "the deed changes hands" });
  ev.push({ frame: HATTIP - 2, kind: "cloth_soft", x: -0.15, gain: 0.6, note: "seller tips his bowler" });
  LONDON_PEOPLE.forEach((p, i) => {
    if (p.walkIn) for (let f = p.walkIn.t0 + 1; f <= p.walkIn.t1; f++) { const g = (q: number) => Math.hypot(londonPersonAt(i, q)[0] - p.walkIn!.from[0], londonPersonAt(i, q)[2] - p.walkIn!.from[2]) / 0.7; for (const off of [0, 0.5]) if (Math.floor(g(f - 1) - off) !== Math.floor(g(f) - off)) ev.push({ frame: f, kind: "step_stone", x: -0.5, gain: 0.35, note: "dismantling crew walk in" }); }
    for (const e of personEvents(p.P, i)) if (!p.walkIn || e.frame > p.walkIn.t1) ev.push({ frame: e.frame, kind: e.kind, x: -0.3 + 0.1 * (i % 4), gain: 1, note: e.note });
  });
  ev.push({ frame: 792, kind: "crane_winch", x: 0.3, gain: 0.55, note: "quay crane slews over the stack" });
  ev.push({ frame: 838, kind: "chain_rattle", x: 0.2, gain: 0.5, note: "hook lowered to the block" });
  ev.push({ frame: 852, kind: "chain_rattle", x: 0.15, gain: 0.55, note: "slings hooked round the block" });
  ev.push({ frame: 866, kind: "crane_winch", x: 0.2, gain: 0.8, note: "winch takes the load, block lifts" });
  ev.push({ frame: 894, kind: "crane_winch", x: 0.4, gain: 0.55, note: "crane slews toward the ship" });
  ev.push({ frame: 926, kind: "crane_winch", x: 0.5, gain: 0.5, note: "block lowered into the hold" });
  ev.push({ frame: 944, kind: "stone_thud", x: 0.5, gain: 0.85, note: "block lands in the hold" });
  ev.push({ frame: 950, kind: "chain_rattle", x: 0.5, gain: 0.5, note: "deck hand frees the slings" });
  ev.push({ frame: 952, kind: "ship_horn", x: 0.6, gain: 0.7, note: "ship's horn: casting off" });
  ev.push({ frame: DEPART + 2, kind: "ship_engine", x: 0.6, gain: 0.7, note: "engine chugs as the ship pulls away" });
  ev.push({ frame: 970, kind: "bow_splash", x: 0.5, gain: 0.45, note: "bow wave as she gathers way" });
  return ev;
};
