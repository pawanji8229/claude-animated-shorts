// Camera 2.0 environment awareness: obstacles (boxes, spheres, vertical cylinders), ground height, camera clearance,
// line-of-sight (occlusion) tests and path repair. World 2.0 exports its placed objects as these obstacles, so the camera
// knows the buildings, vehicles and props of the actual set.
import { add, sub, mul, norm, len, clamp, dist, type V3 } from "./core";

export type Obstacle =
  | { kind: "box"; min: V3; max: V3; id?: string; /** see-through for line of sight (fences, foliage) */ soft?: boolean }
  | { kind: "sphere"; c: V3; r: number; id?: string; soft?: boolean }
  | { kind: "cyl"; c: V3; r: number; h: number; id?: string; soft?: boolean };
export type Env = { obstacles: Obstacle[]; ground?: (x: number, z: number) => number; clearance?: number };

/** signed distance from p to an obstacle (negative = inside) */
export const sdf = (o: Obstacle, p: V3): number => {
  if (o.kind === "sphere") return dist(p, o.c) - o.r;
  if (o.kind === "cyl") { const dr = Math.hypot(p[0] - o.c[0], p[2] - o.c[2]) - o.r, dy = Math.max(o.c[1] - p[1], p[1] - (o.c[1] + o.h)); return dy > 0 && dr > 0 ? Math.hypot(dr, dy) : Math.max(dr, dy); }
  const q = [0, 1, 2].map((i) => Math.max(o.min[i] - p[i], p[i] - o.max[i])), out = Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0));
  return out > 0 ? out : Math.max(q[0], q[1], q[2]);
};
const grad = (o: Obstacle, p: V3): V3 => {
  // grounded boxes / cylinders can only be left sideways or over the top (never through the floor they stand on)
  if (o.kind === "box" && o.min[1] <= 0.05 && sdf(o, p) < 0) { const opts: [number, V3][] = [[p[0] - o.min[0], [-1, 0, 0]], [o.max[0] - p[0], [1, 0, 0]], [p[2] - o.min[2], [0, 0, -1]], [o.max[2] - p[2], [0, 0, 1]], [o.max[1] - p[1], [0, 1, 0]]]; opts.sort((a, b) => a[0] - b[0]); return opts[0][1]; }
  if (o.kind === "cyl" && sdf(o, p) < 0) { const r = Math.hypot(p[0] - o.c[0], p[2] - o.c[2]), top = o.c[1] + o.h - p[1]; return top < o.r - r ? [0, 1, 0] : r < 1e-6 ? [1, 0, 0] : [(p[0] - o.c[0]) / r, 0, (p[2] - o.c[2]) / r]; }
  const e = 1e-3, d0 = sdf(o, p); return norm([sdf(o, add(p, [e, 0, 0])) - d0, sdf(o, add(p, [0, e, 0])) - d0, sdf(o, add(p, [0, 0, e])) - d0]); };
/** nearest clearance of a point to the environment (ground included) */
export const clearanceAt = (env: Env, p: V3) => { let m = env.ground ? p[1] - env.ground(p[0], p[2]) : Infinity; for (const o of env.obstacles) m = Math.min(m, sdf(o, p)); return m; };
/**
 * Push a camera position out of every obstacle (and above the ground) to at least `clearance` metres, using a smooth
 * falloff (the push starts before contact) so a path skimming an obstacle bends gently instead of kinking.
 */
export const resolve = (env: Env, p: V3, clearance = env.clearance ?? 0.35): V3 => {
  let q = p;
  for (let it = 0; it < 4; it++) {
    let moved = false;
    for (const o of env.obstacles) { const d = sdf(o, q); if (d < clearance * 1.6) { const want = smoothMax(d, clearance, clearance * 0.6); if (want > d + 1e-5) { q = add(q, mul(grad(o, q), want - d)); moved = true; } } }
    if (env.ground) { const g = env.ground(q[0], q[2]) , d = q[1] - g, want = smoothMax(d, clearance, clearance * 0.6); if (want > d + 1e-5) { q = [q[0], g + want, q[2]]; moved = true; } }
    if (!moved) break;
  }
  return q;
};
/** soft max(d, c) with a blend width k (C1-continuous, so repaired paths keep continuous velocity) */
const smoothMax = (d: number, c: number, k: number) => { const h = clamp(0.5 + (0.5 * (d - c)) / k, 0, 1); return d * h + c * (1 - h) + k * h * (1 - h) * 0.5; };
/** segment vs obstacle: does the segment a->b pass through it? (slab test for boxes, closest approach otherwise) */
export const segHits = (o: Obstacle, a: V3, b: V3): boolean => {
  if (o.kind === "box") { let t0 = 0, t1 = 1; const d = sub(b, a);
    for (let i = 0; i < 3; i++) { if (Math.abs(d[i]) < 1e-9) { if (a[i] < o.min[i] || a[i] > o.max[i]) return false; continue; }
      let u = (o.min[i] - a[i]) / d[i], v = (o.max[i] - a[i]) / d[i]; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return false; }
    return true; }
  // march for round shapes (cheap: 16 samples)
  for (let i = 1; i < 16; i++) { const p = add(a, mul(sub(b, a), i / 16)); if (sdf(o, p) < 0) return true; } return false;
};
/** fraction of a subject's sample points visible from the camera (1 = fully visible). Soft obstacles count half. */
export const visibility = (env: Env, cam: V3, pts: V3[], ignore?: (o: Obstacle) => boolean) => {
  let vis = 0; for (const p of pts) { let blocked = 0; for (const o of env.obstacles) { if (ignore?.(o)) continue; if (sdf(o, p) < 0.02) continue; if (segHits(o, cam, p)) blocked = Math.max(blocked, o.soft ? (sdf(o, cam) < 6 ? 0.85 : 0.5) : 1); /* see-through clutter right in front of the lens fills the frame */ if (blocked >= 1) break; } vis += 1 - blocked; }
  return vis / Math.max(1, pts.length);
};
/** standard sample points of a standing subject: feet, waist, chest, head */
export const subjectPts = (base: V3, h: number): V3[] => [[base[0], base[1] + 0.05, base[2]], [base[0], base[1] + h * 0.5, base[2]], [base[0], base[1] + h * 0.75, base[2]], [base[0], base[1] + h * 0.95, base[2]]];
export { len };
