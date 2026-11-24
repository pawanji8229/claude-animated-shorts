// TF2 locomotion. Gait is driven by DISTANCE travelled (never by time): the stance foot moves backwards in body space by
// exactly the distance the body moves forward, so a planted foot is stationary in the world (no foot sliding) at any
// speed, including slowing down, stopping and walking backwards (distance decreasing runs the cycle in reverse).
//   cycle phase phi = d / strideLength (one cycle = two steps). Stance fraction sigma: walk ~0.6 (double support),
//   run ~0.36 (flight phase). Heel strike -> foot flat -> heel rise -> toe-off -> swing arc -> heel strike.
// Styles change stride, step height, bounce, sway, lean, arm swing, knee lift, crouch, tiptoe, stomp and drag.
import { P, clamp, smooth, type V3 } from "./rig";
import type { Leg } from "./body";

export const M = 1 / 0.00155;                       // card px per metre (1.55 m card = 1000 px)
export type GaitStyle = {
  stride: number; stance: number; lift: number; bounce: number; sway: number; lean: number; armSwing: number; elbow: number;
  hipRoll: number; twist: number; crouch: number; tiptoe: number; stomp: number; drag: number; headStab: number; heel: number; toeOff: number; width: number; run?: boolean;
};
const G = (o: Partial<GaitStyle>): GaitStyle => ({ stride: 0.74, stance: 0.6, lift: 46, bounce: 9, sway: 6, lean: 0.06, armSwing: 0.78, elbow: 0.4, hipRoll: 0.05, twist: 0.12, crouch: 0, tiptoe: 0, stomp: 0, drag: 0, headStab: 0.6, heel: 0.3, toeOff: 0.55, width: 1, ...o });
export const GAITS = {
  normal: G({}),
  slow: G({ stride: 0.56, lift: 34, bounce: 6, armSwing: 0.5, lean: 0.03, twist: 0.08 }),
  fast: G({ stride: 0.92, lift: 52, bounce: 11, armSwing: 0.95, elbow: 0.6, lean: 0.12, twist: 0.16 }),
  confident: G({ stride: 0.82, lift: 50, bounce: 10, sway: 9, armSwing: 0.9, lean: -0.02, hipRoll: 0.08, twist: 0.18, headStab: 0.85 }),
  nervous: G({ stride: 0.5, lift: 30, bounce: 5, sway: 3, armSwing: 0.15, elbow: 0.9, lean: 0.08, crouch: 10, twist: 0.04, width: 0.8 }),
  tired: G({ stride: 0.52, lift: 18, bounce: 4, sway: 10, armSwing: 0.18, elbow: 0.1, lean: 0.14, crouch: 8, drag: 1, hipRoll: 0.09, headStab: 0.2, toeOff: 0.25, heel: 0.12 }),
  hesitant: G({ stride: 0.42, lift: 28, bounce: 4, armSwing: 0.12, elbow: 0.7, lean: -0.04, twist: 0.04, width: 0.85 }),
  sneaky: G({ stride: 0.62, lift: 62, bounce: 4, sway: 4, armSwing: 0.2, elbow: 1.2, lean: 0.16, crouch: 34, tiptoe: 1, twist: 0.06, headStab: 0.9 }),
  angry: G({ stride: 0.86, lift: 40, bounce: 7, armSwing: 0.8, elbow: 1.0, lean: 0.14, stomp: 1, twist: 0.1, headStab: 0.8 }),
  excited: G({ stride: 0.84, lift: 64, bounce: 18, sway: 5, armSwing: 1.05, elbow: 0.7, lean: 0.04, twist: 0.14 }),
  sad: G({ stride: 0.5, lift: 22, bounce: 3, sway: 7, armSwing: 0.1, elbow: 0.05, lean: 0.1, drag: 0.6, headStab: 0.3, toeOff: 0.3 }),
  curious: G({ stride: 0.5, lift: 40, bounce: 6, armSwing: 0.2, elbow: 0.5, lean: 0.12, twist: 0.05 }),
  jog: G({ stride: 1.15, stance: 0.42, lift: 70, bounce: 16, armSwing: 0.6, elbow: 1.45, lean: 0.12, twist: 0.12, toeOff: 0.7, run: true }),
  run: G({ stride: 1.55, stance: 0.36, lift: 92, bounce: 20, armSwing: 0.85, elbow: 1.55, lean: 0.2, twist: 0.16, toeOff: 0.85, heel: 0.15, run: true }),
  sprint: G({ stride: 1.95, stance: 0.32, lift: 110, bounce: 22, armSwing: 1.0, elbow: 1.6, lean: 0.3, twist: 0.18, toeOff: 0.95, heel: 0.05, run: true }),
} as const satisfies Record<string, GaitStyle>;
export type GaitName = keyof typeof GAITS;
export const mixGait = (a: GaitStyle, b: GaitStyle, t: number): GaitStyle => { const o = { ...a } as Record<string, number | boolean | undefined>; for (const k of Object.keys(a) as (keyof GaitStyle)[]) if (typeof a[k] === "number") o[k] = (a[k] as number) + ((b[k] as number) - (a[k] as number)) * t; o.run = t < 0.5 ? a.run : b.run; return o as unknown as GaitStyle; };

export type GaitOut = { legL: Leg; legR: Leg; root: V3; pelvisRoll: number; pelvisYaw: number; lean: number; twist: number; squash: number; armSwingL: number; armSwingR: number; elbow: number; headPitch: number; contacts: [boolean, boolean] };
/** foot in body space for leg phase q (0..1, 0 = heel strike) */
const foot = (q: number, g: GaitStyle, Lpx: number, side: -1 | 1, w: number): { ankle: V3; pitch: number; contact: boolean } => {
  q = ((q % 1) + 1) % 1; const sg = g.stance, half = (sg * Lpx) / 2, x = side * (P.hipW + 14) * g.width;
  const footLen = 38;
  if (q < sg) { const u = q / sg; let z = half * (1 - 2 * u), y = P.ankle, pitch = 0;
    if (u < 0.15) pitch = -g.heel * (1 - smooth(u / 0.15)) * (1 - g.tiptoe);                         // heel strike -> foot flat
    if (u > 0.62) { const k = (u - 0.62) / 0.38; pitch = g.toeOff * k * k; y += Math.sin(pitch) * footLen; z -= (1 - Math.cos(pitch)) * footLen * 0.6; }   // heel rise, pivot on the toe
    if (g.tiptoe) { pitch = Math.max(pitch, 0.45 * g.tiptoe); y = Math.max(y, P.ankle + Math.sin(0.45) * footLen * g.tiptoe); }
    return { ankle: [x, y, z], pitch: pitch * w, contact: true }; }
  const v = (q - sg) / (1 - sg), e = smooth(v);
  const z = -half + (e * 0.88 + v * 0.12) * 2 * half;
  const lift = g.lift * Math.sin(Math.PI * Math.pow(v, 0.75)) * (1 - 0.6 * g.drag) + (g.run ? 26 * Math.sin(Math.PI * v) : 0);
  const pitch = g.toeOff * (1 - smooth(v * 1.7)) - g.heel * smooth((v - 0.6) / 0.4) * (1 - g.tiptoe) + g.tiptoe * 0.4;
  return { ankle: [x, P.ankle + lift, z], pitch: pitch * w, contact: false };
};
/** gait pose for distance d (px, signed), walk weight w (0 stand .. 1 full gait) */
export const gait = (d: number, g: GaitStyle, w: number): GaitOut => {
  const Lpx = g.stride * M, phi = d / Lpx, s = ((phi * 2) % 1 + 1) % 1;
  const fl = foot(phi, g, Lpx, -1, w), fr = foot(phi + 0.5, g, Lpx, 1, w);
  const stand = (side: -1 | 1): V3 => [side * 50, P.ankle, 4];
  const legOf = (f: { ankle: V3; pitch: number }, side: -1 | 1): Leg => ({ ankle: [stand(side)[0] + (f.ankle[0] - stand(side)[0]) * w, P.ankle + (f.ankle[1] - P.ankle) * w, stand(side)[2] + (f.ankle[2] - stand(side)[2]) * w], pitch: f.pitch, yaw: side * 0.12 * (1 - w), pole: [side * 0.12, 0, 1] });
  // pelvis: low at contact, high at passing (walk); compression after contact, high in flight (run)
  const bob = g.run ? g.bounce * (0.5 - Math.abs(Math.cos(Math.PI * s))) * 1.6 + Math.cos(2 * Math.PI * (s - 0.15)) * -g.bounce * 0.3 : -g.bounce * Math.cos(2 * Math.PI * s);
  const stomp = g.stomp * Math.max(0, Math.cos(2 * Math.PI * s) - 0.7) * -26;   // heavy drop at each contact
  const root: V3 = [g.sway * Math.sin(2 * Math.PI * phi) * w, (bob + stomp - g.crouch - (g.run ? 12 : 0)) * w, 0];
  const sq = (g.run ? 0.05 : 0.02) * Math.cos(2 * Math.PI * s) * w;
  const arm = Math.sin(2 * Math.PI * phi);
  return { legL: legOf(fl, -1), legR: legOf(fr, 1), root, pelvisRoll: g.hipRoll * Math.sin(2 * Math.PI * phi) * w, pelvisYaw: g.twist * Math.sin(2 * Math.PI * phi) * w,
    lean: g.lean * w, twist: -g.twist * 1.2 * Math.sin(2 * Math.PI * phi) * w, squash: -sq, armSwingL: g.armSwing * arm * w, armSwingR: -g.armSwing * arm * w, elbow: g.elbow * w,
    headPitch: (1 - g.headStab) * 0.05 * Math.cos(2 * Math.PI * (s - 0.12)) * w, contacts: [fl.contact, fr.contact] };
};
/** jump: t in frames since the action start; returns root lift, crouch, leg tuck, arm raise. Total = anticipation 9 + air + landing 12 */
export const jump = (t: number, height: number, air = 16) => {
  const ant = 9, land = 12; let rootY = 0, crouch = 0, tuck = 0, arms = 0, lean = 0, squash = 0;
  if (t < ant) { const u = smooth(t / ant); crouch = 38 * u; arms = -0.6 * u; lean = 0.18 * u; squash = -0.08 * u; }                                       // anticipation: crouch, arms swing back
  else if (t < ant + air) { const u = (t - ant) / air; rootY = height * 4 * u * (1 - u); tuck = Math.sin(Math.PI * u) * 0.9; arms = 1.3 * Math.sin(Math.PI * Math.min(1, u * 1.6)); squash = 0.1 * (1 - u * 2) * (u < 0.5 ? 1 : 0); lean = 0.05; }   // launch: stretch, arms up, legs tuck
  else if (t < ant + air + land) { const u = (t - ant - air) / land; crouch = 42 * Math.sin(Math.PI * Math.min(1, u * 1.3)) * (1 - u * 0.4); squash = -0.1 * (1 - u); arms = 0.4 * (1 - u); lean = 0.15 * (1 - u); }   // landing: absorb + recover
  return { rootY, crouch: clamp(crouch, 0, 60), tuck, arms, lean, squash, done: t >= ant + air + land, airborne: t >= ant && t < ant + air };
};
