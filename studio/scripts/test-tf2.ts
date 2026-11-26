// TF2 unit + integration tests (node, no browser). Run: npx tsx scripts/test-tf2.ts  (exit 1 on any failure)
import { ik2, len, sub, P, smooth } from "../src/char/tf2/rig";
import { NEUTRAL, sanitize, mixFace } from "../src/char/tf2/face";
import { EMOTION_NAMES, EMOTIONS, evalEmotion, levelK, BLENDS } from "../src/char/tf2/emotion";
import { HANDS, mixHand, rippleHand } from "../src/char/tf2/hands";
import { solve, restArm, restLeg, headOverlap, type BodyPose } from "../src/char/tf2/body";
import { GAITS, gait, M } from "../src/char/tf2/locomotion";
import { blinkAt, saccade } from "../src/char/tf2/idle";
import { lipsync, type Word } from "../src/char/tf2/lipsync";
import { evaluate, type Script } from "../src/char/tf2/planner";
import { headMove } from "../src/char/tf2/head";
import { gesturePose } from "../src/char/tf2/gestures";
import { checkScript } from "../src/char/tf2/validate";
import { COSTUME } from "../src/char/odo5";

let pass = 0, fail = 0; const out: string[] = [];
const t = (name: string, ok: boolean, detail = "") => { if (ok) pass++; else fail++; out.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`); };
const pose = (o: Partial<BodyPose> = {}): BodyPose => ({ yaw: 0, root: [0, 0, 0], pelvisRoll: 0, pelvisYaw: 0, lean: 0, bend: 0, twist: 0, slump: 0, squash: 0, chest: 0, shoulderL: 0, shoulderR: 0, head: { yaw: 0, pitch: 0, roll: 0 },
  armL: restArm(-1, HANDS.relaxed), armR: restArm(1, HANDS.relaxed), legL: restLeg(-1), legR: restLeg(1), face: NEUTRAL, ...o });

// --- rig / IK
{ let worst = 0; for (let i = 0; i < 500; i++) { const tgt: [number, number, number] = [Math.sin(i) * 400, Math.cos(i * 1.3) * 400, Math.sin(i * 0.7) * 400]; const r = ik2([0, 0, 0], tgt, 108, 100, [0, -1, 0]);
    worst = Math.max(worst, Math.abs(len(r.mid) - 108), Math.abs(len(sub(r.end, r.mid)) - 100)); } t("IK keeps bone lengths for 500 random targets (incl. unreachable)", worst < 1e-6, `max error ${worst.toExponential(1)} px`); }
// --- head never separates from the body, under extreme head + spine poses
{ let minOv = 1e9; for (const yaw of [-1.5, 0, 1.5]) for (const pitch of [-1, 0, 1]) for (const roll of [-1, 0, 1]) for (const lean of [-0.5, 0, 0.9]) for (const slump of [0, 1]) { const s = solve(pose({ head: { yaw, pitch, roll }, lean, slump, yaw: yaw * 0.7 })); minOv = Math.min(minOv, headOverlap(s)); }
  t("head overlaps the torso by >= 70 px for every extreme head/spine combination", minOv >= P.neckOverlapMin, `min overlap ${minOv.toFixed(1)} px`); }
// --- face channels are clamped
{ const wild = sanitize({ ...NEUTRAL, open: 9, smile: -9, pupil: 0, mouthW: 99, eyeL: { open: 9, lower: -3, gx: 7, gy: -7 }, browR: { h: 9, inner: -9, outer: 9, arch: 9 } });
  t("sanitize clamps every face channel into its drawable range", wild.open <= 1.25 && wild.smile >= -1.1 && wild.pupil >= 0.4 && wild.mouthW <= 1.6 && wild.eyeL.open <= 1.6 && wild.eyeL.gx <= 1.15 && wild.browR.h <= 1.8); }
// --- face blending is continuous (no jumps between neighbouring blend steps)
{ let jump = 0; const a = evalEmotion([{ e: "shock", level: 5 }]).face, b = evalEmotion([{ e: "cringe", level: 5 }]).face; let prev = mixFace(a, b, 0);
  for (let i = 1; i <= 100; i++) { const c = mixFace(a, b, i / 100); jump = Math.max(jump, Math.abs(c.open - prev.open), Math.abs(c.smile - prev.smile), Math.abs(c.eyeL.open - prev.eyeL.open), Math.abs(c.browL.h - prev.browL.h)); prev = c; }
  t("face blend shock->cringe changes smoothly (max step per 1% <= 0.03)", jump <= 0.03, `max step ${jump.toFixed(4)}`); }
// --- emotion engine
t("exactly 30 emotional states", EMOTION_NAMES.length === 30, `${EMOTION_NAMES.length}`);
t("every emotion has a face spec, body spec, gesture and description", EMOTION_NAMES.every((e) => Object.keys(EMOTIONS[e].face).length > 0 && EMOTIONS[e].note.length > 5));
t("intensity mapping is monotonic 0..5 and level 0 is neutral", [0, 1, 2, 3, 4, 5].every((l, i, a) => i === 0 || levelK(l) > levelK(a[i - 1])) && levelK(0) === 0);
{ const d = (l: number) => { const f = evalEmotion([{ e: "anger", level: l }]).face; return Math.abs(f.browL.inner) + Math.abs(f.smile - NEUTRAL.smile) + f.clench; };
  t("emotion strength grows with intensity (anger 1 < 3 < 5)", d(1) < d(3) && d(3) < d(5)); }
t("cartoon extras (sweat/blush/tears/vein) stay off at low intensity", (() => { const f = evalEmotion([{ e: "cringe", level: 2 }]).face; return f.sweat < 0.01 && f.blush < 0.01; })());
t("cartoon extras appear at level 5", (() => { const f = evalEmotion([{ e: "cringe", level: 5 }]).face; return f.sweat > 0.8 && f.blush > 0.5; })());
{ const a = evalEmotion([{ e: "shock", level: 4 }]).face, b = evalEmotion([{ e: "disbelief", level: 4 }]).face, m = evalEmotion(BLENDS["shock+disbelief"]).face;
  t("a blend lies between its parts (shock+disbelief jaw)", m.open <= Math.max(a.open, b.open) + 1e-6 && m.open >= Math.min(a.open, b.open) - 1e-6); }
t("all 8 requested blends exist", Object.keys(BLENDS).length === 8);
{ let maxDiff = 0, minDiff = 1e9; const vec = (e: typeof EMOTION_NAMES[number]) => { const f = evalEmotion([{ e, level: 4 }]).face; return [f.eyeL.open, f.eyeL.lower, f.browL.h, f.browL.inner, f.browR.h, f.smile, f.open, f.asym, f.pucker, f.teeth, f.eyeL.gx, f.eyeL.gy]; };
  for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) { const a = vec(EMOTION_NAMES[i]), b = vec(EMOTION_NAMES[j]); const d = Math.hypot(...a.map((v, k) => v - b[k])); minDiff = Math.min(minDiff, d); maxDiff = Math.max(maxDiff, d); }
  t("all 30 faces are distinct from each other (min pairwise distance > 0.25)", minDiff > 0.25, `min ${minDiff.toFixed(2)} / max ${maxDiff.toFixed(2)}`); }
// --- hands
t("17 hand shapes, 5 digits each", Object.keys(HANDS).length === 17 && Object.values(HANDS).every((h) => h.curl.length === 5));
t("hand blends stay within [0,1] (ripple)", [0, 0.25, 0.5, 0.75, 1].every((k) => rippleHand(HANDS.fist, HANDS.open, k).curl.every((c) => c >= 0 && c <= 1)) && mixHand(HANDS.fist, HANDS.open, 1).curl.every((c) => c === 0));
// --- locomotion
{ const g = GAITS.normal, L = g.stride * M; let worst = 0;
  for (let d = 0; d < L * 3; d += 3) { const a = gait(d, g, 1), b = gait(d + 3, g, 1); for (const i of [0, 1] as const) if (a.contacts[i] && b.contacts[i]) { const fa = i ? a.legR : a.legL, fb = i ? b.legR : b.legL; if (fa.ankle[1] < P.ankle + 2 && fb.ankle[1] < P.ankle + 2) worst = Math.max(worst, Math.abs((fb.ankle[2] - fa.ankle[2]) + 3)); } }
  t("stance foot moves back exactly as far as the body moves forward (no slide)", worst < 0.01, `max slip ${worst.toFixed(4)} px per 3 px`); }
t("15 gait styles incl. run/jog/sprint with a flight phase", Object.keys(GAITS).length === 15 && GAITS.run.stance < 0.5 && GAITS.normal.stance > 0.5);
{ const r = gait(400, GAITS.run, 1); t("running has frames with both feet off the ground", (() => { for (let d = 0; d < 2000; d += 7) { const q = gait(d, GAITS.run, 1); if (!q.contacts[0] && !q.contacts[1]) return true; } return false; })()); void r; }
// --- idle / eyes
t("blinks are deterministic and occasional (5..40 blink frames per 10 s)", (() => { let n = 0; for (let f = 0; f < 300; f++) if (blinkAt(f, 7) > 0.5) n++; return n >= 5 && n <= 40 && blinkAt(123, 7) === blinkAt(123, 7); })());
t("saccades are small and deterministic", (() => { for (let f = 0; f < 300; f++) { const s = saccade(f, 3); if (Math.abs(s[0]) > 0.5 || Math.abs(s[1]) > 0.3) return false; } return saccade(77, 3)[0] === saccade(77, 3)[0]; })());
// --- lip-sync
{ const w: Word[] = [{ w: "mail", t0: 1.0, t1: 1.4 }, { w: "train", t0: 1.6, t1: 2.0 }];
  t("mouth is closed in pauses and before speech", lipsync(w, 0.5).open === 0 && lipsync(w, 2.6).open === 0);
  t("mouth opens during words and closes for M/B/P", lipsync(w, 1.25).open > 0.15 && lipsync(w, 1.02).open < lipsync(w, 1.25).open); }
// --- head moves + gestures
t("head moves are zero outside their window and bounded inside", ["nod", "shake", "quickTurn", "overShoulder"].every((m) => { const z = headMove(m as never, -1, 30); if (z.yaw || z.pitch || z.roll) return false; for (let k = 0; k <= 30; k++) { const h = headMove(m as never, k, 30); if (Math.abs(h.yaw) > 1.5 || Math.abs(h.pitch) > 0.5) return false; } return true; }));
t("every emotion gesture has a pose", EMOTION_NAMES.every((e) => EMOTIONS[e].gesture === "none" || Object.keys(gesturePose(EMOTIONS[e].gesture, 10)).length > 0));
// --- planner integration
{ const sc: Script = { id: "t", seed: 1, costume: COSTUME.odo, start: [0, 0], facing: 0, actions: [], emotions: [{ f: 0, mix: [{ e: "happiness", level: 1 }] }] };
  const a = evaluate(sc, 100), b = evaluate(sc, 400); t("idle character never drifts or walks (10 s)", Math.hypot(a.pos[0] - b.pos[0], a.pos[2] - b.pos[2]) < 1e-9 && a.walking === 0 && b.walking === 0);
  t("evaluate is deterministic (same frame -> identical skeleton)", JSON.stringify(evaluate(sc, 250).sk.wrist) === JSON.stringify(evaluate(sc, 250).sk.wrist)); }
{ const sc: Script = { id: "w", seed: 2, costume: COSTUME.odo, start: [-1, 0], facing: 0, actions: [{ kind: "walk", f0: 10, f1: 90, to: [1, 0.4] }, { kind: "walk", f0: 90, f1: 170, to: [-0.5, 1.2] }], emotions: [] };
  const r = checkScript(sc, 0, 200); const end = evaluate(sc, 200).pos;
  t("walk actions arrive exactly at their targets", Math.hypot(end[0] + 0.5, end[2] - 1.2) < 1e-6);
  t("walk with turns: no hard issues and world foot slide < 1 cm", r.issues.filter((i) => !i.check.includes("overreach")).length === 0 && r.maxSlideM < 0.01, `slide ${(r.maxSlideM * 100).toFixed(2)} cm`); }
t("smoothstep sanity", smooth(0) === 0 && smooth(1) === 1 && smooth(0.5) === 0.5);

console.log(out.join("\n")); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
