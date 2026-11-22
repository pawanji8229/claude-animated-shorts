// Optional enhancement (off unless a scene imports it): professional camera moves as DETERMINISTIC keyframe builders.
// Each builder returns keys for the existing `camPath` (monotone cubic + Gaussian smoothing, london-bridge/common.tsx),
// so a move is a pure function of the frame and identical in every parallel cloud chunk. No wall-clock helpers
// (drei CameraShake / Float / controls) are used: those differ per chunk.
//   dolly        straight push-in / pull-out along the view axis
//   truck        lateral slide past a subject while it stays framed
//   crane        rise (or fall) while tilting to keep the subject framed
//   orbit        arc around a subject (integer turns => loop-safe)
//   overEdge     glide over an edge (roof, cliff) then look back: the classic scale reveal
//   handheld     subtle, seeded, loop-periodic breathing (no random per render)
// plus `speedReport` to check a finished move for speed / acceleration spikes before rendering.
import type { V3 } from "../math";

export type CineKey = { f: number; pos: V3; look: V3; fov: number };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** keys at n+1 evenly spaced frames between f0 and f1, sampling `at(t)` with t in 0..1 */
const sample = (f0: number, f1: number, n: number, at: (t: number) => Omit<CineKey, "f">): CineKey[] =>
  Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return { f: Math.round(lerp(f0, f1, t)), ...at(t) }; });

/** push in (dist < 0) or pull out (dist > 0) along the camera -> subject axis; fov can zoom at the same time (dolly-zoom) */
export const dolly = (f0: number, f1: number, from: V3, subject: V3, dist: number, fov: [number, number] = [45, 45]) => {
  const ax = norm(sub(from, subject));
  return sample(f0, f1, 4, (t) => ({ pos: add(from, mul(ax, dist * t)), look: subject, fov: lerp(fov[0], fov[1], t) }));
};
/** slide sideways by `dist` metres (camera-right) keeping the subject framed */
export const truck = (f0: number, f1: number, from: V3, subject: V3, dist: number, fov = 45) => {
  const fw = norm(sub(subject, from)), rt: V3 = norm([-fw[2], 0, fw[0]]);
  return sample(f0, f1, 4, (t) => ({ pos: add(from, mul(rt, dist * t)), look: subject, fov }));
};
/** rise by `height` metres (negative = descend) while the aim follows from `look0` to `look1` */
export const crane = (f0: number, f1: number, from: V3, height: number, look0: V3, look1: V3 = look0, fov = 45) =>
  sample(f0, f1, 4, (t) => ({ pos: [from[0], from[1] + height * t, from[2]], look: [lerp(look0[0], look1[0], t), lerp(look0[1], look1[1], t), lerp(look0[2], look1[2], t)], fov }));
/** arc of `turns` (1 = full circle) around the subject at radius r and height h, starting at angle a0 (radians) */
export const orbit = (f0: number, f1: number, subject: V3, r: number, h: number, turns: number, a0 = 0, fov = 45) =>
  sample(f0, f1, Math.max(8, Math.ceil(Math.abs(turns) * 16)), (t) => { const a = a0 + turns * 2 * Math.PI * t; return { pos: [subject[0] + Math.cos(a) * r, subject[1] + h, subject[2] + Math.sin(a) * r], look: subject, fov }; });
/** glide over an edge then look back at what it sits on: start over the top, pass the edge, end out beyond it looking back */
export const overEdge = (f0: number, f1: number, over: V3, edge: V3, beyond: V3, lookBack: V3, fov: [number, number] = [45, 50]): CineKey[] => [
  { f: f0, pos: over, look: edge, fov: fov[0] },
  { f: Math.round(lerp(f0, f1, 0.45)), pos: [edge[0], edge[1] + 6, edge[2]], look: lerp3(edge, beyond, 0.5), fov: lerp(fov[0], fov[1], 0.4) },
  { f: f1, pos: beyond, look: lookBack, fov: fov[1] },
];
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** subtle handheld breathing offset for frame f; periodic over `loop` frames (integer cycles => seamless loops); amp in metres */
export const handheld = (f: number, seed: number, amp = 0.02, loop = 900): V3 => {
  const w = (k: number, ph: number) => Math.sin((2 * Math.PI * k * f) / loop + ph);
  return [amp * (0.6 * w(3, seed) + 0.4 * w(7, seed * 1.7)), amp * 0.7 * (0.6 * w(4, seed * 2.3) + 0.4 * w(9, seed * 0.9)), amp * 0.5 * w(5, seed * 3.1)];
};
/** max camera speed (m/frame) and acceleration (m/frame^2) of a camera function over [f0, f1], plus the worst frames */
export const speedReport = (cam: (f: number) => { pos: V3 }, f0: number, f1: number) => {
  let vMax = 0, aMax = 0, fv = f0, fa = f0, prevV: V3 | null = null;
  for (let f = f0; f < f1; f++) { const v = sub(cam(f + 1).pos, cam(f).pos), s = len(v); if (s > vMax) { vMax = s; fv = f; }
    if (prevV) { const a = len(sub(v, prevV)); if (a > aMax) { aMax = a; fa = f; } } prevV = v; }
  return { vMax, aMax, atV: fv, atA: fa };
};
