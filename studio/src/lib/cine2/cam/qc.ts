// Camera 2.0 automated checks. Run over any camera function (Camera 2.0 plan, the old camPath, a hand-made path):
// jumps, jitter, speed / acceleration spikes, rotation spikes, focal-length jumps, focus hunting, invalid coordinates,
// clipping into the set, subject leaving the frame / the Shorts safe area, unwanted movement during holds, dutch overuse.
import { sub, len, dot, norm, finite3, fovFromFocal, type CamState, type V3 } from "./core";
import { keyBox, insideFrac, SAFE, type Subject } from "./frame";
import { sdf, type Env } from "./collide";

export type QcOpts = { env?: Env; subjects?: (f: number) => Subject[]; holds?: [number, number][]; fps?: number };
export type QcLimits = { maxSpeed: number; maxAccel: number; maxJerk: number; maxRotSpeed: number; maxRotAccel: number; maxFocalRate: number; maxJitter: number; minSafe: number; maxDutchFrac: number };
/** default limits (per frame at 30 fps): a fast but controlled move tops out ~6 m/s; acceleration limits stop jolts */
export const LIMITS: QcLimits = { maxSpeed: 0.2, maxAccel: 0.012, maxJerk: 0.004, maxRotSpeed: 0.035, maxRotAccel: 0.006, maxFocalRate: 0.03, maxJitter: 0.0008, minSafe: 0.9, maxDutchFrac: 0.15 };
export type QcIssue = { f: number; kind: string; value: number; limit: number };
export const cameraQc = (cam: (f: number) => CamState, f0: number, f1: number, o: QcOpts = {}, L: QcLimits = LIMITS) => {
  const issues: QcIssue[] = [], S: CamState[] = []; for (let f = f0 - 2; f <= f1 + 2; f++) S.push(cam(f));
  const at = (f: number) => S[f - f0 + 2], v = (f: number) => sub(at(f + 1).pos, at(f).pos);
  const dir = (f: number) => norm(sub(at(f).look, at(f).pos)), ang = (a: V3, b: V3) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
  let maxV = 0, maxA = 0, maxJ = 0, maxR = 0, maxRA = 0, maxFR = 0, jitter = 0, dutch = 0, hunts = 0, minSafe = 1, clipF = 0, outF = 0, holdMove = 0;
  let lastFocusSign = 0, lastRev = -999;
  for (let f = f0; f <= f1; f++) {
    const s = at(f);
    if (!finite3(s.pos) || !finite3(s.look) || !Number.isFinite(s.focal) || !Number.isFinite(s.focus) || Math.abs(s.pos[0]) > 1e4 || Math.abs(s.pos[1]) > 1e4 || Math.abs(s.pos[2]) > 1e4) { issues.push({ f, kind: "invalid coordinates", value: NaN, limit: 0 }); continue; }
    if (f >= f1) break;
    const sp = len(v(f)), ac = len(sub(v(f), v(f - 1))), jk = len(sub(sub(v(f + 1), v(f)), sub(v(f), v(f - 1))));
    const r = ang(dir(f), dir(f + 1)), ra = Math.abs(r - ang(dir(f - 1), dir(f))), fr = Math.abs(Math.log(at(f + 1).focal / s.focal));
    // jitter: high-frequency energy = residual of the position after a 5-tap smoothing
    // jitter = oscillation: the acceleration reversing direction from one frame to the next while both are significant
    // (a smooth eased move reverses its acceleration once, at cruise speed, where it is ~0; wobble reverses every frame)
    const a0 = sub(v(f), v(f - 1)), a1 = sub(v(f + 1), v(f)), jit = dot(a0, a1) < 0 ? Math.min(len(a0), len(a1)) : 0;
    maxV = Math.max(maxV, sp); maxA = Math.max(maxA, ac); maxJ = Math.max(maxJ, jk); maxR = Math.max(maxR, r); maxRA = Math.max(maxRA, ra); maxFR = Math.max(maxFR, fr); jitter = Math.max(jitter, jit);
    if (sp > L.maxSpeed) issues.push({ f, kind: sp > L.maxSpeed * 3 ? "camera jump" : "speed", value: sp, limit: L.maxSpeed });
    if (ac > L.maxAccel) issues.push({ f, kind: "abrupt speed change", value: ac, limit: L.maxAccel });
    if (r > L.maxRotSpeed) issues.push({ f, kind: "rotation speed", value: r, limit: L.maxRotSpeed });
    if (ra > L.maxRotAccel) issues.push({ f, kind: "rotation jolt", value: ra, limit: L.maxRotAccel });
    if (fr > L.maxFocalRate) issues.push({ f, kind: "focal-length jump", value: fr, limit: L.maxFocalRate });
    if (jit > L.maxJitter) issues.push({ f, kind: "jitter", value: jit, limit: L.maxJitter });
    // focus hunting: focus velocity (dioptres) changing sign repeatedly
    const fv = 1 / at(f + 1).focus - 1 / s.focus, sg = Math.abs(fv) < 2e-4 ? 0 : Math.sign(fv); if (sg && lastFocusSign && sg !== lastFocusSign) { if (f - lastRev < 15) hunts++; lastRev = f; } if (sg) lastFocusSign = sg;
    if (Math.abs(s.roll) > 0.02) dutch++;
    if (o.env) { let c = o.env.ground ? s.pos[1] - o.env.ground(s.pos[0], s.pos[2]) : Infinity; for (const ob of o.env.obstacles) c = Math.min(c, sdf(ob, s.pos)); if (c < 0.05) { clipF++; issues.push({ f, kind: "camera clipping geometry", value: c, limit: 0.05 }); } }
    if (o.subjects) { const fov = fovFromFocal(s.focal); for (const sub0 of o.subjects(f).slice(0, 1)) { const bx = keyBox(s, fov, sub0), inF = bx.behind ? 0 : insideFrac(bx, { xMin: -1, xMax: 1, yMin: -1, yMax: 1 }), inS = bx.behind ? 0 : insideFrac(bx, SAFE);
      minSafe = Math.min(minSafe, inS); if (inF < 0.6) { outF++; issues.push({ f, kind: "subject leaving frame", value: inF, limit: 0.6 }); } else if (inS < L.minSafe) issues.push({ f, kind: "subject outside Shorts safe area", value: inS, limit: L.minSafe }); } }
    if (o.holds?.some(([a, b]) => f >= a && f < b) && sp > 0.01) { holdMove++; issues.push({ f, kind: "unwanted movement during hold", value: sp, limit: 0.01 }); }
  }
  const n = f1 - f0 + 1; if (dutch / n > L.maxDutchFrac) issues.push({ f: f0, kind: "dutch angle overused", value: dutch / n, limit: L.maxDutchFrac });
  if (hunts > 0) issues.push({ f: f0, kind: "focus hunting", value: hunts, limit: 0 });
  const fps = o.fps ?? 30, kinds = [...new Set(issues.map((i) => i.kind))];
  return { pass: issues.length === 0, frames: n, issues, kinds, summary: { maxSpeed_ms: maxV * fps, maxAccel_ms2: maxA * fps * fps, maxJerk: maxJ, maxRot_degs: (maxR * fps * 180) / Math.PI, maxRotAccel: maxRA, maxFocalRatePerFrame: maxFR, maxJitter_mm: jitter * 1000, focusReversals: hunts, dutchFrac: dutch / n, minSafeFrac: minSafe, clipFrames: clipF, outOfFrameFrames: outF, holdMoveFrames: holdMove } };
};
/** compact text for logs */
export const qcText = (r: ReturnType<typeof cameraQc>) => {
  const s = r.summary, byKind = r.kinds.map((k) => `${k} x${r.issues.filter((i) => i.kind === k).length}`).join(", ");
  return `${r.pass ? "PASS" : "FAIL"} ${r.frames}f | speed ${s.maxSpeed_ms.toFixed(2)} m/s, accel ${s.maxAccel_ms2.toFixed(2)} m/s2, rot ${s.maxRot_degs.toFixed(1)} deg/s, jitter ${s.maxJitter_mm.toFixed(2)} mm, focal ${(s.maxFocalRatePerFrame * 100).toFixed(2)}%/f, rapid focus reversals ${s.focusReversals}, min safe ${(s.minSafeFrac * 100).toFixed(0)}%, clip ${s.clipFrames}${byKind ? ` | ${byKind}` : ""}`;
};
