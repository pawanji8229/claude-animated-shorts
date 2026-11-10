// Shot plan for "Inventor walks into the workshop" — 5 s, 30 fps, 150 frames, one continuous shot.
// Beats:
//   0-24   door swings open, cool night spills in, inventor in the doorway
//   10-112 walk: through the door, diagonally across the planks into the bulb's light pool
//   112-120 settle, turn to camera (squash on the turn)
//   120-150 looks up at the bulb / contraption, delighted; contraption dome flares
// All values are frame-deterministic.
import { V3, clamp01, easeOut, lerp, mix3, smooth } from "../lib/math";

export const FPS = 30;
export const DURATION = 150;

export const ROOM = { x0: -4.2, x1: 4.2, zBack: -3.6, zFront: 3.2, h: 3.7 };
export const DOOR = { x: -2.55, w: 1.05, h: 2.15 };
export const WINDOW = { x: -0.55, y: 1.75, w: 1.1, h: 1.15 };
export const BENCH = { x: 1.75, z: -3.05, w: 2.6, d: 0.85, h: 0.92 };
export const BULB: V3 = [1.25, 2.55, -1.9];

export const DOOR_OPEN = (f: number) => easeOut(0, 24, f) * 1.75; // radians the door leaf swings

// Walk path (Catmull-Rom through hand-placed points, sampled by arc length on a smootherstep clock).
const PATH: V3[] = [
  [-2.55, 0, -4.15],
  [-2.5, 0, -3.1],
  [-1.9, 0, -2.25],
  [-0.5, 0, -1.65],
  [0.75, 0, -1.45],
  [1.15, 0, -1.45],
];
const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
const samplePath = (u: number): V3 => {
  const n = PATH.length - 1;
  const s = clamp01(u) * n;
  const i = Math.min(n - 1, Math.floor(s));
  const t = s - i;
  const P = (k: number) => PATH[Math.max(0, Math.min(n, k))];
  const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
  return [cr(a[0], b[0], c[0], d[0], t), 0, cr(a[2], b[2], c[2], d[2], t)];
};
// Arc-length table so the stride stays planted (constant speed in metres, not in parameter).
const TABLE = (() => {
  const N = 400; const pts: V3[] = []; const len: number[] = [0];
  for (let i = 0; i <= N; i++) pts.push(samplePath(i / N));
  for (let i = 1; i <= N; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
  return { N, pts, len, total: len[N] };
})();
const atDistance = (d: number): V3 => {
  const { N, pts, len, total } = TABLE;
  const x = Math.max(0, Math.min(total, d));
  let i = 1; while (i < N && len[i] < x) i++;
  const t = (x - len[i - 1]) / Math.max(1e-6, len[i] - len[i - 1]);
  return mix3(pts[i - 1], pts[i], t);
};

export const WALK_A = 10, WALK_B = 112;
// Eased walk clock: accelerates out of the doorway, decelerates into the stop.
const walkDist = (f: number) => {
  const t = clamp01((f - WALK_A) / (WALK_B - WALK_A));
  // ease in/out but mostly linear in the middle so the gait does not skate
  const e = t < 0.12 ? (t * t) / 0.24 : t > 0.88 ? 1 - ((1 - t) * (1 - t)) / 0.24 : (t - 0.06) / 0.88;
  return e * TABLE.total;
};
export const STRIDE = 0.62; // metres per full gait cycle (two steps)

export type InventorState = {
  pos: V3;
  heading: number; // +1 walking screen-right, -1 left (for the side-view drawing)
  mode: "side" | "front";
  phase: number; // gait phase, radians
  walkAmt: number; // 0 standing .. 1 full gait
  turnSquash: number; // 0..1 squash pulse on the turn
  lookUp: number; // 0..1 head/eyes up toward the bulb
  delight: number; // 0..1 brows up, smile, arms open
  blink: boolean;
  // v2 acting controls (optional so the 5 s shot keeps working unchanged)
  lookX?: number; // -1..1 eyes glance left/right
  idea?: number; // 0..1 right index finger raised (front view)
  goggles?: number; // 0..1 goggles lowered from brow onto the eyes
  goggleHand?: number; // 0..1 hand at the goggles while lowering them
  reach?: number; // 0..1 near arm reaches forward (side view) to the lever
  pull?: number; // 0..1 lever pulled (hand travels down)
  lensGlow?: number; // 0..1 goggles reflect the contraption flare
  breathe?: number; // idle breathing phase (radians)
  shiver?: number; // 0..1 shake-off-the-cold wiggle
};

const BLINKS = [44, 88, 131];
export const inventorAt = (f: number): InventorState => {
  const d = walkDist(f);
  const pos = atDistance(d);
  const speed = walkDist(f + 0.5) - walkDist(f - 0.5);
  const walkAmt = clamp01(speed / 0.02);
  const phase = (d / STRIDE) * Math.PI * 2;
  const TURN = 116;
  return {
    pos,
    heading: 1,
    mode: f < TURN ? "side" : "front",
    phase,
    walkAmt: f < TURN ? walkAmt : 0,
    turnSquash: Math.max(0, 1 - Math.abs(f - TURN) / 4),
    lookUp: smooth(121, 134, f),
    delight: smooth(124, 140, f),
    blink: BLINKS.some((b) => f >= b && f < b + 4),
  };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
const K = {
  wide: { pos: [-0.35, 1.62, 3.4] as V3, fov: 52 },
  track: { pos: [0.35, 1.5, 1.9] as V3, fov: 46 },
  close: { pos: [0.7, 1.28, 1.15] as V3, fov: 44 },
};
export const cameraAt = (f: number): Cam => {
  const inv = inventorAt(f);
  // look target leads with the inventor but lags a little (camera operator feel), clamped to the set
  const lag = inventorAt(Math.max(0, f - 6)).pos;
  const subj: V3 = [lerp(lag[0], inv.pos[0], 0.6), 1.05, lerp(lag[2], inv.pos[2], 0.6)];
  const g1 = smooth(14, 96, f); // wide -> track glide
  const g2 = smooth(96, 150, f); // track -> close push (every hold creeps)
  let pos = mix3(K.wide.pos, K.track.pos, g1);
  pos = mix3(pos, K.close.pos, g2);
  // early frames frame the door; then follow the subject; finally tilt up toward the bulb
  const doorLook: V3 = [DOOR.x + 0.35, 1.25, ROOM.zBack];
  let look = mix3(doorLook, subj, smooth(6, 40, f));
  const endLook: V3 = [1.2, 1.38, -1.95];
  look = mix3(look, endLook, smooth(112, 146, f));
  const fov = lerp(lerp(K.wide.fov, K.track.fov, g1), K.close.fov, g2);
  const roll = (-2.2 * (1 - g1) + 1.2 * g2) * (Math.PI / 180);
  return { pos, look, fov, roll };
};

// Contraption reaction (dome flare) and bulb gentle sway
export const domeGlow = (f: number) => 0.55 + 2.2 * smooth(126, 142, f) - 0.6 * smooth(142, 150, f);
export const bulbSway = (f: number) => 0.035 * Math.sin((f / FPS) * 2.1) * (1 - 0.4 * smooth(0, 150, f));
