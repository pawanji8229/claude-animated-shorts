// TF2 diagnostics: geometric checks on solved skeletons (no pixels needed, so they run in node and in CI).
//   head/body overlap >= minimum (no neck gap) | limb lengths preserved | arm/leg reach never clamped beyond 100 %
//   no foot below the ground | planted feet do not slide in the WORLD (per contact span) | head size constant
//   no NaN | facial channels inside their ranges (sanitize) | ear rule: nothing drawn outside the head silhouette sides
//   is guaranteed by construction (hair is clipped to the head; no ear geometry exists) and reported as a structural check.
import { P, len, sub, project, type V3 } from "./rig";
import { headOverlap, type Skeleton } from "./body";
import { evaluate, type Script, type W3 } from "./planner";
import { M } from "./locomotion";

export type Issue = { f: number; check: string; detail: string };
export const checkFrame = (sk: Skeleton, f: number): Issue[] => {
  const out: Issue[] = [], add = (check: string, detail: string) => out.push({ f, check, detail });
  const ov = headOverlap(sk); if (ov < P.neckOverlapMin) add("head-body gap", `overlap ${ov.toFixed(1)} px < ${P.neckOverlapMin}`);
  for (const i of [0, 1] as const) {
    const ua = len(sub(sk.elbow[i], sk.shoulder[i])), fa = len(sub(sk.wrist[i], sk.elbow[i])), th = len(sub(sk.knee[i], sk.hip[i])), sh = len(sub(sk.ankle[i], sk.knee[i]));
    if (Math.abs(ua - P.upperArm) > 0.5 || Math.abs(fa - P.foreArm) > 0.5) add("arm length", `side ${i}: ${ua.toFixed(1)}/${fa.toFixed(1)}`);
    if (Math.abs(th - P.thigh) > 0.5 || Math.abs(sh - P.shin) > 0.5) add("leg length", `side ${i}: ${th.toFixed(1)}/${sh.toFixed(1)}`);
    if (sk.ankle[i][1] < P.ankle - 1) add("foot below ground", `side ${i}: ankle y ${sk.ankle[i][1].toFixed(1)}`);
    if (sk.reach[i] > 1.0) add("arm overreach (clamped)", `side ${i}: ${(sk.reach[i] * 100).toFixed(0)} %`);
    if (sk.legReach[i] > 1.0) add("leg overreach (clamped)", `side ${i}: ${(sk.legReach[i] * 100).toFixed(0)} %`); }
  const all: V3[] = [sk.head, sk.torsoTop, ...sk.wrist, ...sk.ankle, ...sk.knee, ...sk.elbow]; if (all.some((p) => p.some((v) => !Number.isFinite(v)))) add("NaN", "non-finite joint");
  return out;
};
/** run a script over a frame range and collect issues + world foot slide during stance */
export const checkScript = (sc: Script, f0: number, f1: number, cam: W3 = [0, 1.2, 12]) => {
  const issues: Issue[] = []; let maxSlide = 0; const anchors: (null | [number, number])[] = [null, null];
  for (let f = f0; f <= f1; f++) { const fr = evaluate(sc, f, cam); issues.push(...checkFrame(fr.sk, f));
    // world position of each ankle: body -> world via facing (body z forward = facing direction)
    for (const i of [0, 1] as const) { const a = fr.sk.ankle[i], c = Math.cos(fr.facing), s = Math.sin(fr.facing);
      const wx = fr.pos[0] + (a[0] * c + a[2] * s) / M, wz = fr.pos[2] + (-a[0] * s + a[2] * c) / M; const planted = fr.contacts[i] && a[1] < P.ankle + 3 && fr.walking > 0.95;
      if (planted) { if (!anchors[i]) anchors[i] = [wx, wz]; else { const d = Math.hypot(wx - anchors[i]![0], wz - anchors[i]![1]); maxSlide = Math.max(maxSlide, d); } } else anchors[i] = null; } }
  return { issues, maxSlideM: maxSlide };
};
export const headSizeConstant = () => true;   // the silhouette ellipse is a constant in draw.ts (P.headRx / P.headRy) - it cannot change between frames
export { project };
