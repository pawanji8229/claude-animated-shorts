// "The Night Shift" — 10 s / 300 f @ 30 fps. Original story beat for the quality test:
//   S1   0- 62  wide, low: door swings open, Odo stands in the doorway, shakes off the cold, glances around
//   S2  62-170  lateral tracking shot with foreground parallax as he crosses into the lamp's pool
//   S3 170-250  medium front, creeping push: he looks up at the lamp, turns to us, gets an idea, lowers his goggles
//   S4 250-272  insert (hard cut): he reaches for the lever on the control box and pulls it
//   S5 272-300  pull-back crane: the contraption ignites (flare, sparks, spinning gears), he turns to us delighted
// Everything is a pure function of the frame number.
import { V3, clamp01, lerp, mix3, smooth } from "../lib/math";
import { BENCH, BULB, type InventorState, type Cam } from "./timeline";
import { reachHandPx, SOLE_Y, CANVAS_H } from "./inventorDraw";

export const DURATION10 = 300;

// --- walk path (arc-length parametrised so feet stay planted) ---
const PATH: V3[] = [
  [-2.55, 0, -3.78],
  [-2.42, 0, -2.95],
  [-1.7, 0, -2.25],
  [-0.5, 0, -1.92],
  [0.45, 0, -2.0],
  [0.92, 0, -2.25],
];
const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
const sampleRaw = (u: number): V3 => {
  const n = PATH.length - 1, s = clamp01(u) * n, i = Math.min(n - 1, Math.floor(s)), t = s - i;
  const P = (k: number) => PATH[Math.max(0, Math.min(n, k))];
  const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
  return [cr(a[0], b[0], c[0], d[0], t), 0, cr(a[2], b[2], c[2], d[2], t)];
};
const TABLE = (() => {
  const N = 600, pts: V3[] = [], len: number[] = [0];
  for (let i = 0; i <= N; i++) pts.push(sampleRaw(i / N));
  for (let i = 1; i <= N; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
  return { N, pts, len, total: len[N] };
})();
const atDist = (d: number): V3 => {
  const { N, pts, len, total } = TABLE;
  const x = Math.max(0, Math.min(total, d));
  let i = 1; while (i < N && len[i] < x) i++;
  return mix3(pts[i - 1], pts[i], (x - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]));
};
const W0 = 42, W1 = 168;
const walkDist = (f: number) => {
  const t = clamp01((f - W0) / (W1 - W0));
  const e = t < 0.1 ? (t * t) / 0.2 : t > 0.9 ? 1 - ((1 - t) * (1 - t)) / 0.2 : (t - 0.05) / 0.9;
  return e * TABLE.total;
};
const STRIDE = 0.64;

// --- beats ---
export const IGNITE = 268;
const TURNS: [number, "side" | "front"][] = [[0, "front"], [40, "side"], [198, "front"], [250, "side"], [282, "front"]];
const modeAt = (f: number) => { let m: "side" | "front" = "front"; for (const [t, mm] of TURNS) if (f >= t) m = mm; return m; };
const squashAt = (f: number) => Math.max(0, ...TURNS.slice(1).map(([t]) => 1 - Math.abs(f - t) / 4));
const BLINKS = [12, 58, 120, 186, 222, 290];
const pulse = (a: number, b: number, c: number, d: number, f: number) => smooth(a, b, f) * (1 - smooth(c, d, f));

export const igniteAt = (f: number) => smooth(IGNITE, IGNITE + 10, f);
export const doorOpen10 = (f: number) => {
  const t = clamp01(f / 26); // ease-out with a small overshoot settle
  return 1.75 * (1 - Math.pow(1 - t, 3)) + 0.06 * Math.sin(clamp01((f - 26) / 14) * Math.PI) * (f > 26 ? 1 : 0);
};

export const inventor10 = (f: number): InventorState => {
  const d = walkDist(f);
  const speed = walkDist(f + 0.5) - walkDist(f - 0.5);
  const mode = modeAt(f);
  const ign = igniteAt(f);
  return {
    pos: atDist(d),
    heading: 1,
    mode,
    phase: (d / STRIDE) * Math.PI * 2,
    walkAmt: mode === "side" ? clamp01(speed / 0.022) : 0,
    turnSquash: squashAt(f),
    lookUp: pulse(176, 190, 196, 206, f) + 0.25 * ign * (mode === "front" ? 0 : 1),
    delight: Math.max(pulse(204, 216, 238, 246, f) * 0.8, smooth(IGNITE + 4, IGNITE + 16, f)),
    blink: BLINKS.some((b) => f >= b && f < b + 4),
    lookX: lerp(lerp(0, -1, smooth(12, 18, f)), 1, smooth(24, 30, f)) * (1 - smooth(34, 40, f)),
    idea: pulse(204, 212, 226, 232, f),
    goggleHand: pulse(226, 233, 242, 249, f),
    goggles: smooth(230, 242, f),
    reach: smooth(252, 262, f) * (1 - smooth(276, 282, f)),
    pull: smooth(262, 268, f),
    lensGlow: ign * (0.8 + 0.2 * Math.sin(f * 0.9)),
    breathe: (f / 30) * Math.PI * 2 * 0.35,
    shiver: pulse(6, 10, 26, 32, f),
  };
};

// --- set FX ---
let gearAcc: number[] | null = null;
export const gearRot10 = (f: number) => {
  if (!gearAcc) { gearAcc = [0]; for (let i = 1; i <= DURATION10 + 2; i++) gearAcc.push(gearAcc[i - 1] + (0.03 + 0.42 * igniteAt(i)) ); }
  const i = Math.max(0, Math.min(DURATION10, Math.floor(f)));
  return gearAcc[i];
};
export const glow10 = (f: number) => 0.45 + 3.3 * igniteAt(f) - 0.5 * smooth(IGNITE + 14, IGNITE + 28, f);
export const lampK10 = (f: number) => {
  if (f < IGNITE) return 1;
  const t = f - IGNITE;
  const flicker = t < 9 ? [0.55, 1.35, 0.7, 1.4, 0.85, 1.25, 1.0, 1.2, 1.1][t] : 1.12;
  return flicker;
};
export const lever10 = (f: number) => smooth(262, 268, f); // drives the lever angle; matches inventor `pull`

// --- camera: shots with cuts; every hold creeps ---
type Shot = { a: number; b: number; cam: (t: number, f: number) => Cam; focus: (f: number) => V3 };
const head = (f: number): V3 => { const p = inventor10(f).pos; return [p[0], 1.28, p[2]]; };
// Floor lever geometry is solved from Odo's hand: the knob sits 4 cm behind his card exactly where the drawn hand is
// (as seen from the insert camera), so the grip always reads, whatever the pose curves are.
const ODO_END: V3 = [0.92, 0, -2.25];
const S4_CAM: V3 = [1.34, 0.95, -1.05];
const YAW4 = Math.atan2(S4_CAM[0] - ODO_END[0], S4_CAM[2] - ODO_END[2]);
const CARD_S = 1.62 / CANVAS_H;
export const knobAt = (pull: number): V3 => {
  const [hx, hy] = reachHandPx(pull);
  const lx = (hx - 300) * CARD_S, ly = (SOLE_Y - hy) * CARD_S;
  const right: V3 = [Math.cos(YAW4), 0, -Math.sin(YAW4)], back: V3 = [-Math.sin(YAW4), 0, -Math.cos(YAW4)];
  return [ODO_END[0] + right[0] * lx + back[0] * 0.05, ly, ODO_END[2] + right[2] * lx + back[2] * 0.05];
};
const K0 = knobAt(0);
export const LEVER_POS: V3 = [K0[0] + 0.05, 0, K0[2]]; // pivot base on the floor, rod leans slightly toward Odo
const DOME: V3 = [BENCH.x - 0.35 + 0.18, BENCH.h + 0.52, BENCH.z + 0.05];
const SHOTS: Shot[] = [
  { a: 0, b: 62, focus: head, cam: (t) => ({
    pos: mix3([0.55, 1.05, 2.7], [0.2, 1.12, 2.15], t), look: mix3([-2.35, 1.3, -3.5], [-2.2, 1.2, -3.2], t), fov: 44, roll: -1.8 * Math.PI / 180 }) },
  { a: 62, b: 170, focus: head, cam: (t, f) => {
    const h = head(f);
    const pos = mix3([-1.9, 1.38, 1.55], [0.55, 1.42, 1.35], t);
    return { pos, look: [h[0] + 0.25, 1.02, h[2]], fov: 40, roll: 0 };
  } },
  { a: 170, b: 250, focus: head, cam: (t, f) => {
    const up = pulse(176, 190, 196, 208, f);
    const look = mix3([0.95, 1.18, -2.25], [1.1, 2.1, -2.0], up * 0.75);
    return { pos: mix3([0.98, 1.2, 1.15], [0.96, 1.28, 0.5], t), look, fov: 40, roll: 0.8 * Math.PI / 180 * t };
  } },
  { a: 250, b: 272, focus: () => K0, cam: (t) => ({
    pos: mix3([1.38, 0.84, -0.98], [1.3, 0.81, -1.12], t), look: mix3([1.06, 0.68, -2.3], [1.04, 0.67, -2.3], t), fov: 42, roll: -2.5 * Math.PI / 180 }) },
  { a: 272, b: 300, focus: () => mix3(head(290), DOME, 0.35), cam: (t) => ({
    pos: mix3([2.0, 1.08, -1.2], [2.35, 1.55, 0.35], t), look: mix3([1.35, 1.2, -2.8], [1.08, 1.28, -2.45], t), fov: lerp(40, 46, t), roll: lerp(-2, 1.5, t) * Math.PI / 180 }) },
];
const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const camera10 = (f: number): Cam & { focus: V3; shot: number } => {
  const s = shotAt(f);
  const t = smooth(s.a, s.b, f) * 0.85 + ((f - s.a) / (s.b - s.a)) * 0.15; // smootherstep glide + linear creep
  const c = s.cam(t, f);
  // impact kick on the ignition: sign-flipping, decaying over 7 f
  const k = f - IGNITE - 6;
  if (k >= 0 && k < 7) { const a = 0.012 * (1 - k / 7) * (k % 2 ? -1 : 1); c.pos = [c.pos[0] + a, c.pos[1] + a * 0.6, c.pos[2]]; }
  return { ...c, focus: s.focus(f), shot: SHOTS.indexOf(s) };
};
export const DOME_POS = DOME;
export { BULB };
