// TF2 gestures: arm + hand targets (relative to each shoulder, body axes) for every acting gesture, with purposeful timing:
// anticipation (a small counter-move), action, sustained hold with a living secondary motion, and an eased release.
// Side s = -1 screen-left arm, +1 screen-right arm (when facing the viewer). Elbow poles keep elbows natural (down/out).
import { HANDS, mixHand, rippleHand, type HandName, type HandShape } from "./hands";
import { smooth, clamp01, type V3 } from "./rig";
import type { Gesture } from "./emotion";

export type ArmT = { hand: V3; pole: V3; bend: number; twist: number; shape: HandShape };
const A = (hand: V3, pole: V3, shape: HandName, bend = 0, twist = 0): ArmT => ({ hand, pole, bend, twist, shape: HANDS[shape] });
export const REST = (s: number): ArmT => A([s * 30, -196, 8], [s * 0.55, -0.1, -0.85], "relaxed", 0.1 * s);
export type GestureFrame = { L?: ArmT; R?: ArmT; shoulders?: number; head?: { yaw?: number; pitch?: number; roll?: number }; lean?: number; behindHead?: [boolean, boolean] };
const sin = Math.sin, TAU = Math.PI * 2;
/** static/holding pose of a gesture at local time t (frames) — secondary motion keeps it alive */
const POSE: Record<Exclude<Gesture, "none">, (t: number, o: { dir?: V3; count?: number }) => GestureFrame> = {
  fists: (t) => ({ L: A([-36, -182, 22], [-0.6, -0.3, -0.7], "fist", 0.1), R: A([36, -182 + sin(t * 0.9) * 2, 22], [0.6, -0.3, -0.7], "fist", -0.1), shoulders: 6 }),
  handsUp: (t) => ({ L: A([-112, 46 + sin(t * 0.7) * 4, 44], [-1, -0.6, -0.3], "open", -0.2), R: A([112, 46 + sin(t * 0.7 + 1) * 4, 44], [1, -0.6, -0.3], "open", 0.2), shoulders: 16 }),
  handsUpSmall: () => ({ L: A([-62, -70, 74], [-0.6, -1, -0.2], "claw", -0.3), R: A([62, -70, 74], [0.6, -1, -0.2], "claw", 0.3), shoulders: 10 }),
  palmsUp: (t) => ({ L: A([-112, -118 + sin(t * 0.3) * 3, 86], [-0.3, -1, -0.2], "palmUp", -0.3, -1.2), R: A([112, -118 + sin(t * 0.3 + 2) * 3, 86], [0.3, -1, -0.2], "palmUp", 0.3, 1.2), shoulders: 14 }),
  handOnHip: () => ({ R: A([22, -166, 8], [1, 0.05, -0.35], "flat", -0.9, 0.4) }),
  handsOnHips: () => ({ L: A([-22, -166, 8], [-1, 0.05, -0.35], "flat", 0.9, -0.4), R: A([22, -166, 8], [1, 0.05, -0.35], "flat", -0.9, 0.4) }),
  armsCrossed: (t) => ({ L: A([98, -118, 58], [-0.6, -0.7, 0.2], "grip", 0.2), R: A([-98, -128 + sin(t * 0.25) * 1.5, 70], [0.6, -0.7, 0.2], "grip", -0.2) }),
  handsTogether: (t) => ({ L: A([58, -112, 74], [-0.4, -1, 0], "flat", 0.6), R: A([-58, -112, 76], [0.4, -1, 0], "flat", -0.6), head: { pitch: 0.04 + sin(t * 0.2) * 0.01 } }),
  facepalm: () => ({ R: A([-44, 150, 148], [0.9, -0.4, 0.1], "flat", 0.25), head: { pitch: 0.2, roll: -0.08 }, lean: 0.06, shoulders: 8 }),
  chinThink: (t) => ({ R: A([-36, 72, 132], [0.6, -1, 0.2], "point", -0.6, 0.3), L: A([88, -112, 64], [-0.5, -0.8, 0.2], "grip", 0.2), head: { roll: 0.08 + sin(t * 0.15) * 0.02, pitch: -0.03 } }),
  chinRest: () => ({ R: A([-30, 62, 126], [0.5, -1, 0.3], "fist", -0.4), head: { roll: 0.12, pitch: 0.04 } }),
  fidget: (t) => ({ L: A([52 + sin(t * 0.8) * 6, -150, 58], [-0.4, -1, 0], "pinch", 0.2), R: A([-52 + sin(t * 0.8 + 1.5) * 6, -146, 60], [0.4, -1, 0], (Math.floor(t / 7) % 2 ? "grip" : "pinch"), -0.2) }),
  shrug: () => ({ L: A([-98, -150, 62], [-0.4, -1, -0.1], "palmUp", -0.2, -1.1), R: A([98, -150, 62], [0.4, -1, -0.1], "palmUp", 0.2, 1.1), shoulders: 24, head: { roll: 0.1 } }),
  thumbsUp: (t) => ({ R: A([40, -34 + sin(t * 0.5) * 2, 112], [0.4, -1, 0], "thumbsUp", -1.4, 0) }),
  thumbsDown: () => ({ R: A([44, -70, 108], [0.4, -1, 0], "thumbsDown", 1.6, 0) }),
  rubNeck: (t) => ({ R: A([-6 + sin(t * 0.7) * 10, 160, -40], [0.9, 0.8, 0.1], "flat", -0.4), behindHead: [false, true], head: { pitch: 0.08, roll: 0.1 }, shoulders: 6 }),
  coverMouth: () => ({ R: A([-52, 112, 150], [0.7, -0.7, 0.2], "flat", 0.3), head: { pitch: 0.04 } }),
  excitedFists: (t) => ({ L: A([-46, 10 + Math.abs(sin(t * 0.55)) * 46, 60], [-0.5, -1, 0], "fist", 0.2), R: A([46, 10 + Math.abs(sin(t * 0.55 + 1.6)) * 46, 60], [0.5, -1, 0], "fist", -0.2), shoulders: 10 }),
  hugSelf: (t) => ({ L: A([112, -36, 52], [-0.6, -0.8, 0.1], "grip", 0.3), R: A([-112, -46 + sin(t * 1.1) * 2, 60], [0.6, -0.8, 0.1], "grip", -0.3), shoulders: 18 }),
  handOnChest: () => ({ R: A([-46, -60, 76], [0.6, -1, 0], "flat", 0.4) }),
  pushAway: (t) => ({ L: A([-50, -38, 160 + sin(t * 0.4) * 4], [-0.5, -1, 0], "open", -0.2), R: A([50, -32, 162], [0.5, -1, 0], "open", 0.2), lean: -0.1 }),
  scratchHead: (t) => ({ R: A([-24 + sin(t * 1.4) * 8, 252, 26], [0.9, 0.6, 0.1], "claw", -0.8), behindHead: [false, true], head: { roll: -0.1 } }),
  point: (_t, o) => { const d = o.dir ?? [0.9, 0.15, 0.4]; const l = Math.hypot(...d) || 1; return { R: A([d[0] / l * 196, d[1] / l * 196, d[2] / l * 196], [0.5, -1, -0.2], "point", 0, 0) }; },
  wave: (t) => ({ R: A([70, 132, 34], [1, -0.4, -0.3], "wave", sin(t * TAU / 14) * 0.55, 0) }),
  clap: (t) => { const c = 0.5 + 0.5 * Math.cos(t * TAU / 10); return { L: A([58 - c * 70, -100, 82], [-0.4, -1, 0], "flat", 0.5), R: A([-58 + c * 70, -100, 84], [0.4, -1, 0], "flat", -0.5) }; },
  count: (_t, o) => ({ R: A([30, -26, 112], [0.4, -1, 0], (["one", "two", "three", "four", "five"] as HandName[])[Math.min(4, Math.max(0, (o.count ?? 1) - 1))], -1.5) }),
  behindBack: () => ({ L: A([30, -176, -60], [-0.5, -0.3, -0.8], "grip", 0.3), R: A([-30, -176, -62], [0.5, -0.3, -0.8], "grip", -0.3) }),
  spread: (t) => ({ L: A([-150, -110 + sin(t * 0.3) * 3, 40], [-0.4, -1, -0.2], "open", -0.3, -0.8), R: A([150, -110, 40], [0.4, -1, -0.2], "open", 0.3, 0.8), shoulders: 12 }),
};
export const gesturePose = (g: Gesture, t: number, o: { dir?: V3; count?: number } = {}): GestureFrame => g === "none" ? {} : POSE[g](t, o);
const mixV = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
/** blend an arm toward a gesture target with weight w; fingers ripple instead of switching */
export const blendArm = (a: ArmT, b: ArmT | undefined, w: number): ArmT => { if (!b || w <= 0) return a; const t = clamp01(w);
  return { hand: mixV(a.hand, b.hand, t), pole: mixV(a.pole, b.pole, t), bend: a.bend + (b.bend - a.bend) * t, twist: a.twist + (b.twist - a.twist) * t, shape: rippleHand(a.shape, b.shape, t) }; };
/** gesture envelope for a timed gesture: 0..1 with ease in/out; anticipation dips slightly below 0 (opposite move) */
export const envelope = (t: number, dur: number, inF = 9, outF = 10, antic = 0.12) => { if (t < 0 || t > dur) return 0; const a = t < inF ? smooth(t / inF) : 1, r = t > dur - outF ? smooth((dur - t) / outF) : 1;
  const ant = t < inF * 0.45 ? -antic * Math.sin(Math.PI * t / (inF * 0.45)) : 0; return Math.min(a, r) + ant; };
export { mixHand };
