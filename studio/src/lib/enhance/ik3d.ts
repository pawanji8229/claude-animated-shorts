// Optional enhancement (off unless a scene imports it): 3D inverse kinematics for MACHINERY and props (crane jibs,
// excavator arms, robot/derrick booms, lamp arms, aircraft landing-gear struts). Own code following the FABRIK method
// that jsantell/THREE.IK (MIT) implements, plus an exact analytic two-bone solver. Pure functions of the target, so
// deterministic per frame. NOT for the approved 2D odo5 characters: their arms keep using `aimArm` (camera-space card IK)
// and the approved character design is not changed.
import type { V3 } from "../math";

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** analytic two-bone IK: root, bone lengths a (upper) and b (lower), target, and a pole direction the elbow bends towards.
 *  Returns the elbow and the (reach-clamped) end point. */
export const twoBone = (root: V3, a: number, b: number, target: V3, pole: V3): { elbow: V3; end: V3; reached: boolean } => {
  const d = sub(target, root), L = len(d), reach = Math.min(Math.max(L, Math.abs(a - b) + 1e-6), a + b - 1e-6), dir = norm(d);
  const cosA = (a * a + reach * reach - b * b) / (2 * a * reach), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const side = norm(cross(cross(dir, pole), dir)); // pole projected perpendicular to the root->target axis
  const elbow = add(root, add(mul(dir, a * cosA), mul(side, a * sinA)));
  return { elbow, end: add(root, mul(dir, reach)), reached: L <= a + b };
};
/** FABRIK for a chain of any length. `joints` = initial joint positions (root first); lengths are taken from them.
 *  The root stays fixed. Returns new joint positions. */
export const fabrik = (joints: V3[], target: V3, iterations = 12, tol = 1e-4): V3[] => {
  const n = joints.length, lens = joints.slice(1).map((p, i) => len(sub(p, joints[i]))), total = lens.reduce((s, x) => s + x, 0), root = joints[0];
  const p = joints.map((j) => [...j] as V3);
  if (len(sub(target, root)) >= total) { const dir = norm(sub(target, root)); for (let i = 1; i < n; i++) p[i] = add(p[i - 1], mul(dir, lens[i - 1])); return p; }
  for (let it = 0; it < iterations; it++) {
    p[n - 1] = [...target]; for (let i = n - 2; i >= 0; i--) p[i] = add(p[i + 1], mul(norm(sub(p[i], p[i + 1])), lens[i]));
    p[0] = [...root]; for (let i = 1; i < n; i++) p[i] = add(p[i - 1], mul(norm(sub(p[i], p[i - 1])), lens[i - 1]));
    if (len(sub(p[n - 1], target)) < tol) break; }
  return p;
};
/** yaw (around +y) and pitch to aim a part at a point, e.g. a crane jib or searchlight */
export const aimAngles = (from: V3, to: V3) => { const d = sub(to, from); return { yaw: Math.atan2(d[0], d[2]), pitch: Math.atan2(d[1], Math.hypot(d[0], d[2])) }; };
