// TwistFrame Character 2.0 — core rig: constants, 3D skeleton maths and the orthographic yaw projection onto the card.
// The character is still a 2D brush-inked card (identity preserved: big glowing round head overlapping a pill torso,
// no ears, no neck gap), but every joint now lives in a 3D BODY SPACE and is projected with the character's yaw
// relative to the camera. Turning, walking in any direction, looking over the shoulder and 3/4 views therefore come
// from ONE consistent model instead of separate "front" and "side" drawings.
// Units: card pixels (same canvas as odo5: 600 x 1000, soles on y = 975, 1.55 m card) so the new character drops into
// every existing scene at exactly the same size. Body space: x = character's left->right as seen when facing the
// camera, y = UP from the ground, z = forward (out of the chest).
export const W = 600, H = 1000, SOLE = 975, CARD_H = 1.55, PX = CARD_H / H;
/** proportions (identical silhouette to the approved odo5 card) */
export const P = {
  ankle: 16, thigh: 144, shin: 140, hipW: 34, pelvisY: 294,                  // pelvis height when standing straight
  torsoLen: 300, torsoWTop: 138, torsoWBot: 156, torsoD: 124,               // pill torso (front width / depth)
  shoulderW: 64, shoulderDrop: 112, upperArm: 108, foreArm: 100,
  headRx: 150, headRy: 143, headRz: 138, headUp: 54,                        // head centre sits 54 px ABOVE the torso top
  neckOverlapMin: 70,                                                        // head must overlap the torso by >= 70 px (no gap, ever)
};
export type V3 = [number, number, number];
export type V2 = [number, number];
export const v3 = (x = 0, y = 0, z = 0): V3 => [x, y, z];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scl = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const clamp01 = (x: number) => clamp(x, 0, 1);
export const smooth = (t: number) => { t = clamp01(t); return t * t * (3 - 2 * t); };
export const smoother = (t: number) => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };
/** smooth step over a frame window */
export const sw = (a: number, b: number, f: number) => smooth((f - a) / (b - a));
/** deterministic hash noise (no Math.random anywhere in the rig: every frame is reproducible in every cloud chunk) */
export const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const noise1 = (x: number, seed = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i + seed * 57.3), hash(i + 1 + seed * 57.3), u) * 2 - 1; };
/** rotations (radians): X = pitch (+ leans forward), Y = yaw (+ turns to the character's left), Z = roll (+ tilts to the character's left) */
export const rotX = (p: V3, a: number): V3 => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
export const rotY = (p: V3, a: number): V3 => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
export const rotZ = (p: V3, a: number): V3 => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
/** pitch forward = rotate about X so +y tips towards +z */
export const pitch = (p: V3, a: number) => rotX(p, -a);
/** Projection: body space -> card px. yaw = facing relative to the camera (0 = facing the viewer, +PI/2 = facing screen
 *  right). Returns screen x/y (card px, y down) and depth (+ = towards the viewer, used for draw order). */
export type Proj = { x: number; y: number; d: number };
export const project = (p: V3, yaw: number, ox = 300): Proj => { const r = rotY(p, yaw); return { x: ox + r[0], y: SOLE - r[1], d: r[2] }; };
/** two-bone IK in 3D: root -> target with bone lengths a, b and a pole direction for the middle joint.
 *  Reach is clamped to 99.5 % (never straight-locked, never stretched): limbs keep their length in every frame. */
export const ik2 = (root: V3, target: V3, a: number, b: number, pole: V3): { mid: V3; end: V3; reach: number } => {
  const d0 = sub(target, root), L = len(d0), maxR = (a + b) * 0.995, minR = Math.abs(a - b) + 2;
  const Lc = clamp(L, minR, maxR), dir = norm(d0), end = add(root, scl(dir, Lc));
  const cosA = clamp((a * a + Lc * Lc - b * b) / (2 * a * Lc), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  // pole projected perpendicular to the limb axis
  let pp = sub(pole, scl(dir, dot(pole, dir))); if (len(pp) < 1e-6) pp = cross(dir, [1, 0, 0]); pp = norm(pp);
  const mid = add(root, add(scl(dir, a * cosA), scl(pp, a * sinA)));
  return { mid, end, reach: L / (a + b) };
};
