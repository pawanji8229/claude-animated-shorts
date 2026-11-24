// TF2 character-action planner. A character is driven by a SCRIPT of purposeful actions (each with a start, duration,
// targets, style, emotion) - never by filler motion. evaluate(script, f, cam) is a pure function of the frame, so every
// cloud render chunk produces identical frames. Layer priorities per body part (low -> high):
//   LEGS/ROOT : stand + idle weight shift  <  locomotion (walk/run)  <  jump / sit / kneel / bend / stance (push, pull)
//   SPINE     : emotion posture + idle breathing  <  locomotion lean  <  action lean (bend, push, reach)
//   ARMS      : rest + gait swing  <  emotion gesture (only when standing)  <  explicit gesture  <  interaction (reach/hold)
//   HEAD      : emotion bias + idle  <  head moves  <  look-at target (eyes lead, head follows, body twists beyond 0.6 rad)
//   FACE      : emotion blend  <  speech mouth (mouth channels only)  <  blink (lids only)
// If the character has nothing to do it stands still with subtle idle motion. Walking only happens inside a walk action.
import { P, clamp, lerp, smooth, type V3 } from "./rig";
import { NEUTRAL, mixFace, sanitize, type FaceRig } from "./face";
import { evalEmotion, type EmotionMix, type BodyMood, type Gesture } from "./emotion";
import { HANDS } from "./hands";
import { solve, restLeg, type BodyPose, type Skeleton, type Arm } from "./body";
import { GAITS, gait, jump, M, type GaitName } from "./locomotion";
import { gesturePose, blendArm, envelope, REST, type ArmT } from "./gestures";
import { headMove, type HeadMove } from "./head";
import { blinkAt, saccade, idleBody } from "./idle";
import { lipsync, type Word } from "./lipsync";
import { reach, worldToBody, gripPoint } from "./interact";
import type { Costume } from "../odo5";

export type W3 = [number, number, number];   // world metres (y up)
export type Action =
  | { kind: "walk"; f0: number; f1: number; to: [number, number]; style?: GaitName; backwards?: boolean }
  | { kind: "turn"; f0: number; f1: number; face: number }
  | { kind: "jump"; f0: number; height?: number; dist?: number }
  | { kind: "sit"; f0: number; f1: number; seat: number }            // seat height (m)
  | { kind: "kneel"; f0: number; f1: number }
  | { kind: "bend"; f0: number; f1: number }
  | { kind: "stumble"; f0: number }
  | { kind: "gesture"; f0: number; f1: number; g: Gesture; dir?: V3; count?: number }
  | { kind: "head"; f0: number; f1: number; m: HeadMove; amt?: number }
  | { kind: "look"; f0: number; f1: number; at: W3 | "camera" }
  | { kind: "speak"; f0: number; f1: number; words: Word[]; amount?: number }
  | { kind: "listen"; f0: number; f1: number; at: W3 }
  | { kind: "reach"; f0: number; f1: number; side: 0 | 1; at: W3; hold?: boolean }
  | { kind: "push"; f0: number; f1: number; reach?: number; height?: number; pull?: boolean };   // pushes/pulls an object `reach` m in front at `height` m (moves with the character)
export type EmoKey = { f: number; mix: EmotionMix; ease?: number };
export type Script = { id: string; seed: number; costume: Costume; start: [number, number]; facing: number; actions: Action[]; emotions: EmoKey[]; fps?: number };
export type CharFrame = { sk: Skeleton; face: FaceRig; pos: W3; facing: number; yaw: number; behindHead: [boolean, boolean]; grip?: { side: 0 | 1; at: V3 }; walking: number; contacts: [boolean, boolean]; gesture: Gesture };

const ARM0 = (s: -1 | 1): Arm => ({ ...REST(s) });
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const toArm = (a: ArmT): Arm => ({ hand: a.hand, pole: a.pole, bend: a.bend, twist: a.twist, shape: a.shape });

/** locomotion state at f: world position, facing, cumulative gait distance, speed weight, style */
const locomotion = (sc: Script, f: number) => {
  let x = sc.start[0], z = sc.start[1], facing = sc.facing, dist = 0, w = 0, style: GaitName = "normal", turnTo: number | null = null, rootY = 0, jumpT = -1, jh = 0;
  const moves = sc.actions.filter((a) => a.kind === "walk" || a.kind === "turn" || a.kind === "jump").sort((a, b) => a.f0 - b.f0);
  for (const a of moves) {
    if (a.kind === "walk") { const dx = a.to[0] - x, dz = a.to[1] - z, D = Math.hypot(dx, dz), dur = a.f1 - a.f0; const dirA = Math.atan2(dx, dz) + (a.backwards ? Math.PI : 0);
      const ramp = Math.min(14, dur * 0.3); const prof = (t: number) => { // trapezoid speed profile -> distance fraction
        const T = dur, r = ramp, vmax = 1 / (T - r); if (t <= 0) return 0; if (t >= T) return 1; if (t < r) return vmax * t * t / (2 * r); if (t > T - r) { const u = T - t; return 1 - vmax * u * u / (2 * r); } return vmax * (t - r / 2); };
      if (f < a.f0) break;
      const t = f - a.f0, k = prof(t), vk = (prof(t + 0.5) - prof(t - 0.5)) * D;          // metres per frame
      const st = GAITS[a.style ?? "normal"], vNom = st.stride * 1.65 / 30;
      const turnW = smooth(Math.min(1, t / 10));
      if (f <= a.f1) { x += dx * k; z += dz * k; dist += (a.backwards ? -1 : 1) * D * k * M; w = smooth(Math.min(1, vk / (vNom * 0.45))); style = a.style ?? "normal"; facing = facing + wrapA(dirA - facing) * turnW; return { x, z, facing, dist, w, style, rootY, jumpT, jh }; }
      x = a.to[0]; z = a.to[1]; dist += (a.backwards ? -1 : 1) * D * M; facing = dirA; }
    else if (a.kind === "turn") { if (f < a.f0) break; const u = smooth((f - a.f0) / (a.f1 - a.f0)); const tgt = facing + wrapA(a.face - facing); if (f <= a.f1) { turnTo = lerp(facing, tgt, u); facing = turnTo; return { x, z, facing, dist, w, style, rootY, jumpT, jh }; } facing = a.face; }
    else if (a.kind === "jump") { if (f < a.f0) break; const j = jump(f - a.f0, (a.height ?? 0.35) * M), total = 9 + 16 + 12; const t = f - a.f0;
      const fwd = (a.dist ?? 0) * clamp((t - 9) / 16, 0, 1); if (t <= total) { x += Math.sin(facing) * fwd; z += Math.cos(facing) * fwd; rootY = j.rootY; jumpT = t; jh = a.height ?? 0.35; return { x, z, facing, dist, w, style, rootY, jumpT, jh }; }
      x += Math.sin(facing) * (a.dist ?? 0); z += Math.cos(facing) * (a.dist ?? 0); }
  }
  return { x, z, facing, dist, w: 0, style, rootY, jumpT, jh };
};
/** emotion at f (smooth transitions between keys; ease 2 = sudden reaction) */
const emotionAt = (sc: Script, f: number) => {
  const ks = sc.emotions; if (!ks.length) return evalEmotion([]);
  let i = 0; while (i < ks.length - 1 && ks[i + 1].f <= f) i++;
  const cur = evalEmotion(ks[i].mix); if (i === 0 && f < ks[0].f) return cur;
  const prev = i > 0 ? evalEmotion(ks[i - 1].mix) : cur, e = ks[i].ease ?? 8, t = smooth((f - ks[i].f) / e);
  if (t >= 1) return cur;
  const body = {} as BodyMood; for (const k of Object.keys(cur.body) as (keyof BodyMood)[]) body[k] = lerp(prev.body[k], cur.body[k], t);
  return { face: mixFace(prev.face, cur.face, t), body, gesture: t < 0.5 ? prev.gesture : cur.gesture, gestureW: t < 0.5 ? prev.gestureW * (1 - t * 2) : cur.gestureW * (t * 2 - 1) };
};
const active = <K extends Action["kind"]>(sc: Script, f: number, kind: K, pad = 0) => sc.actions.filter((a) => a.kind === kind && f >= a.f0 - pad && f <= ("f1" in a ? a.f1 : a.f0 + 40) + pad) as Extract<Action, { kind: K }>[];

export const evaluate = (sc: Script, f: number, cam: W3 = [0, 1.2, 12]): CharFrame => {
  const seed = sc.seed, lo = locomotion(sc, f), emo = emotionAt(sc, f), mood = emo.body;
  const pos: W3 = [lo.x, lo.rootY / M, lo.z];
  const camYaw = Math.atan2(cam[0] - lo.x, cam[2] - lo.z), yaw = wrapA(lo.facing - camYaw);
  // ---------------- base body: stand + idle + emotion posture
  const idle = idleBody(f, seed, mood.energy * (1 - lo.w));
  const pose: BodyPose = { yaw, root: [idle.sway, -mood.knees * 22 - idle.knee * 0.4, 0], pelvisRoll: idle.hipRoll, pelvisYaw: 0, lean: mood.lean, bend: 0, twist: 0, slump: clamp(mood.slump, 0, 1), squash: idle.squash, chest: clamp(mood.chest + idle.chest, 0, 1.2),
    shoulderL: mood.shoulders * 22 + idle.shoulders, shoulderR: mood.shoulders * 22 + idle.shoulders, head: { yaw: mood.headYaw + idle.head.yaw, pitch: mood.headPitch + idle.head.pitch, roll: mood.headRoll + idle.head.roll },
    armL: ARM0(-1), armR: ARM0(1), legL: restLeg(-1), legR: restLeg(1), face: NEUTRAL };
  // weight shift: the loaded leg straightens, the other knee relaxes (feet stay planted)
  pose.legL.ankle = [pose.legL.ankle[0] - idle.sway * 0.0, P.ankle, 4]; pose.legR.ankle = [pose.legR.ankle[0], P.ankle, 4];
  // ---------------- locomotion layer
  let contacts: [boolean, boolean] = [true, true];
  if (lo.w > 0.001) { const g = gait(lo.dist, GAITS[lo.style], lo.w); pose.legL = g.legL; pose.legR = g.legR;
    // planted feet are anchored in the WORLD: find the frame this stance began, take the foot's world position there and
    // express it in today's body frame. Straight walking gives the same answer as the gait; turning makes the foot pivot.
    for (const i of [0, 1] as const) { if (!g.contacts[i] || lo.w < 0.5) continue; let fc = f;
      for (let k = 1; k < 45; k++) { const l2 = locomotion(sc, f - k); if (l2.w < 0.5 || !gait(l2.dist, GAITS[l2.style], l2.w).contacts[i]) break; fc = f - k; }
      if (fc === f) continue; const l0 = locomotion(sc, fc), g0 = gait(l0.dist, GAITS[l0.style], l0.w), a0 = (i === 0 ? g0.legL : g0.legR).ankle;
      const c0 = Math.cos(l0.facing), s0 = Math.sin(l0.facing), wx = l0.x * M + a0[0] * c0 + a0[2] * s0, wz = l0.z * M - a0[0] * s0 + a0[2] * c0;
      const dx = wx - lo.x * M, dz = wz - lo.z * M, c1 = Math.cos(lo.facing), s1 = Math.sin(lo.facing); const leg = i === 0 ? pose.legL : pose.legR;
      leg.ankle = [dx * c1 - dz * s1, leg.ankle[1], dx * s1 + dz * c1]; leg.yaw += wrapA(l0.facing - lo.facing); } pose.root = [pose.root[0] * (1 - lo.w) + g.root[0], pose.root[1] * (1 - lo.w) + g.root[1], 0];
    pose.pelvisRoll = lerp(pose.pelvisRoll, g.pelvisRoll, lo.w); pose.pelvisYaw = g.pelvisYaw; pose.lean += g.lean; pose.twist += g.twist; pose.squash += g.squash; pose.head.pitch += g.headPitch; contacts = g.contacts;
    for (const [i, sw] of [[0, g.armSwingL], [1, g.armSwingR]] as [0 | 1, number][]) { const s = i === 0 ? -1 : 1, arm = i === 0 ? pose.armL : pose.armR; const a = sw, el = g.elbow;
      // swing about the shoulder in the sagittal plane; elbow bends more on the forward swing (follow-through)
      const upper: V3 = [s * 18, -Math.cos(a) * P.upperArm, Math.sin(a) * P.upperArm], fa = a + el * (0.6 + 0.4 * Math.max(0, Math.sin(a + 0.4)));
      const hraw: V3 = [upper[0] + s * 8, upper[1] - Math.cos(fa) * P.foreArm, upper[2] + Math.sin(fa) * P.foreArm], hl = Math.hypot(...hraw), hand: V3 = hl > 196 ? [hraw[0] * 196 / hl, hraw[1] * 196 / hl, hraw[2] * 196 / hl] : hraw;
      const out = blendArm(arm, { hand, pole: [s * 0.3, -0.2, -1], bend: -0.2 * Math.sin(a) * s, twist: 0, shape: lo.style === "angry" ? HANDS.fist : HANDS.relaxed }, lo.w); if (i === 0) pose.armL = toArm(out); else pose.armR = toArm(out); } }
  // ---------------- jump / sit / kneel / bend / stumble / push (legs + root priority)
  if (lo.jumpT >= 0) { const j = jump(lo.jumpT, lo.jh * M); pose.root = [pose.root[0], pose.root[1] - j.crouch, 0]; pose.lean += j.lean; pose.squash += j.squash;
    const tuck = j.tuck; for (const [lg, s] of [[pose.legL, -1], [pose.legR, 1]] as const) { lg.ankle = [s * 44, P.ankle + tuck * 120, -tuck * 30]; lg.pitch = tuck * 0.5; }
    for (const [i, s] of [[0, -1], [1, 1]] as const) { const a = j.arms; const arm = { hand: [s * (40 + Math.max(0, a) * 60), -196 * Math.cos(a * 1.1) + 0, 196 * Math.sin(a * 0.9) * 0.6] as V3, pole: [s * 0.6, -0.4, -0.6] as V3, bend: 0, twist: 0, shape: a > 0.5 ? HANDS.open : HANDS.relaxed };
      if (i === 0) pose.armL = arm; else pose.armR = arm; } }
  for (const a of active(sc, f, "sit")) { const u = smooth(Math.min(1, (f - a.f0) / 18)) * smooth(Math.min(1, (a.f1 - f) / 18)), drop = (P.pelvisY - (a.seat * M + 14)) * u;
    pose.root = [pose.root[0] * (1 - u), pose.root[1] * (1 - u) - drop, 0]; pose.lean += (u < 1 ? 0.25 * Math.sin(Math.PI * u) : 0) - 0.04 * u;
    pose.legL.ankle = [-52, P.ankle, 4 + 120 * u]; pose.legR.ankle = [52, P.ankle, 4 + 120 * u]; pose.armL = toArm(blendArm(pose.armL, { hand: [8, -150, 120], pole: [-0.4, -1, 0], bend: 0.3, twist: 0, shape: HANDS.flat }, u)); pose.armR = toArm(blendArm(pose.armR, { hand: [-8, -150, 120], pole: [0.4, -1, 0], bend: -0.3, twist: 0, shape: HANDS.flat }, u)); }
  for (const a of active(sc, f, "kneel")) { const u = smooth(Math.min(1, (f - a.f0) / 16)) * smooth(Math.min(1, (a.f1 - f) / 16));
    pose.root = [pose.root[0], pose.root[1] - 150 * u, 0]; pose.legL.ankle = [-46, P.ankle + 10 * u, 4 - 150 * u]; pose.legL.pitch = 0.9 * u; pose.legR.ankle = [50, P.ankle, 4 + 90 * u]; pose.lean += 0.08 * u; }
  for (const a of active(sc, f, "bend")) { const u = smooth(Math.min(1, (f - a.f0) / 14)) * smooth(Math.min(1, (a.f1 - f) / 14)); pose.root = [pose.root[0], pose.root[1] - 95 * u, 0]; pose.lean += 0.62 * u; pose.legL.ankle = [-56, P.ankle, 30 * u]; pose.legR.ankle = [56, P.ankle, -10 * u]; pose.head.pitch -= 0.25 * u; }
  for (const a of active(sc, f, "stumble")) { const t = f - a.f0, k = t < 6 ? smooth(t / 6) : Math.max(0, 1 - (t - 6) / 26);
    const cw = 1 - smooth((t - 12) / 14); if (cw > 0.01) contacts = [contacts[0], false]; pose.lean += 0.32 * k; pose.root = [pose.root[0], pose.root[1] - 26 * k, 0]; pose.head.pitch -= 0.2 * k;
    { const cs: V3 = [50, P.ankle + 50 * Math.sin(Math.PI * Math.min(1, t / 10)) * (t < 10 ? 1 : 0), 4 + 130 * smooth(Math.min(1, t / 10))], a0 = pose.legR.ankle; pose.legR.ankle = [lerp(a0[0], cs[0], cw), lerp(a0[1], cs[1], cw), lerp(a0[2], cs[2], cw)]; }   // the catch step, then back into the gait
    pose.armL = toArm(blendArm(pose.armL, { hand: [-120, 30, 60], pole: [-1, -0.5, 0], bend: 0, twist: 0, shape: HANDS.open }, k)); pose.armR = toArm(blendArm(pose.armR, { hand: [130, 10, 80], pole: [1, -0.5, 0], bend: 0, twist: 0, shape: HANDS.open }, k)); }
  // ---------------- arms: emotion gesture (standing only) < explicit gesture < interaction
  let behind: [boolean, boolean] = [false, false], gname: Gesture = "none";
  const standK = 1 - lo.w;
  if (emo.gesture !== "none" && emo.gestureW > 0 && standK > 0.05 && !active(sc, f, "gesture").length && !active(sc, f, "reach").length) {
    const gp = gesturePose(emo.gesture, f, {}), w = emo.gestureW * standK; gname = emo.gesture;
    pose.armL = toArm(blendArm(pose.armL, gp.L, w)); pose.armR = toArm(blendArm(pose.armR, gp.R, w)); pose.shoulderL += (gp.shoulders ?? 0) * w; pose.shoulderR += (gp.shoulders ?? 0) * w;
    if (gp.head) { pose.head.yaw += (gp.head.yaw ?? 0) * w; pose.head.pitch += (gp.head.pitch ?? 0) * w; pose.head.roll += (gp.head.roll ?? 0) * w; } if (gp.behindHead) behind = gp.behindHead; }
  for (const a of active(sc, f, "gesture")) { const t = f - a.f0, w = envelope(t, a.f1 - a.f0), gp = gesturePose(a.g, t, { dir: a.dir, count: a.count }); gname = a.g;
    const lw = clamp(w, 0, 1), negW = Math.min(0, w);
    pose.armL = toArm(blendArm(pose.armL, gp.L, lw)); pose.armR = toArm(blendArm(pose.armR, gp.R, lw));
    if (negW < 0) { pose.shoulderL += negW * 10; pose.shoulderR += negW * 10; }   // anticipation dip
    pose.shoulderL += (gp.shoulders ?? 0) * lw; pose.shoulderR += (gp.shoulders ?? 0) * lw; pose.lean += (gp.lean ?? 0) * lw;
    if (gp.head) { pose.head.yaw += (gp.head.yaw ?? 0) * lw; pose.head.pitch += (gp.head.pitch ?? 0) * lw; pose.head.roll += (gp.head.roll ?? 0) * lw; } if (gp.behindHead && lw > 0.2) behind = gp.behindHead; }
  let grip: CharFrame["grip"];
  for (const a of active(sc, f, "reach")) { const u = smooth(Math.min(1, (f - a.f0) / 14)) * (a.hold ? 1 : smooth(Math.min(1, (a.f1 - f) / 12)));
    const tgt = worldToBody(a.at, [pos[0], 0, pos[2]], cam, yaw), r = reach(pose, tgt, a.side); pose.lean += r.lean * u; pose.bend += r.bend * u;
    const arm = a.side === 0 ? pose.armL : pose.armR, s = a.side === 0 ? -1 : 1, shape = u > 0.85 ? HANDS.grip : HANDS.open;
    const out = toArm(blendArm(arm, { hand: r.hand, pole: [s * 0.6, -0.8, -0.2], bend: 0, twist: 0, shape }, u)); if (a.side === 0) pose.armL = out; else pose.armR = out; if (u > 0.85) grip = { side: a.side, at: [0, 0, 0] }; }
  for (const a of active(sc, f, "push")) { const u = smooth(Math.min(1, (f - a.f0) / 12)) * smooth(Math.min(1, (a.f1 - f) / 12)); const tgt: V3 = [0, (a.height ?? 0.75) * M, (a.reach ?? 0.42) * M];
    pose.lean += (a.pull ? -0.22 : 0.28) * u; pose.legL.ankle = [-48, P.ankle, 4 + (a.pull ? 70 : 85) * u]; pose.legR.ankle = [50, P.ankle, 4 - (a.pull ? 30 : 50) * u]; pose.root = [pose.root[0], pose.root[1] - 18 * u, 0];
    for (const i of [0, 1] as const) { const s = i === 0 ? -1 : 1, r = reach(pose, [tgt[0] + s * 70, tgt[1], tgt[2]], i); const out = toArm(blendArm(i === 0 ? pose.armL : pose.armR, { hand: r.hand, pole: [s * 0.5, -1, -0.1], bend: 0, twist: 0, shape: a.pull ? HANDS.grip : HANDS.flat }, u)); if (i === 0) pose.armL = out; else pose.armR = out; } }
  // ---------------- head: moves, then look-at (eyes lead, head follows, body twists for large angles)
  for (const a of active(sc, f, "head")) { const h = headMove(a.m, f - a.f0, a.f1 - a.f0, a.amt ?? 1); pose.head.yaw += h.yaw; pose.head.pitch += h.pitch; pose.head.roll += h.roll; pose.twist += h.bodyTwist ?? 0; }
  let gaze: [number, number] = saccade(f, seed, 0.28 * (0.5 + mood.energy * 0.5));
  gaze = [gaze[0] + mood.avert * 0.75 * Math.sign(Math.sin(seed * 3.1) || 1), gaze[1] + mood.avert * 0.25];
  const lookAt = (at: W3 | "camera", w: number) => { let ty: number, tp: number;
    if (at === "camera") { ty = -yaw; tp = 0; } else { const dx = at[0] - pos[0], dz = at[2] - pos[2], dy = at[1] - (pos[1] + 1.25); ty = wrapA(Math.atan2(dx, dz) - lo.facing); tp = -Math.atan2(dy, Math.hypot(dx, dz)); }
    const eyesOnly = clamp(ty, -0.35, 0.35), headPart = ty - eyesOnly * 0.4, body = Math.abs(headPart) > 0.9 ? (headPart - Math.sign(headPart) * 0.9) * 0.6 : 0;
    pose.head.yaw = lerp(pose.head.yaw, clamp(headPart, -1.15, 1.15), w); pose.twist += body * w; pose.head.pitch = lerp(pose.head.pitch, clamp(tp * 0.7, -0.35, 0.45), w);
    gaze = [lerp(gaze[0], clamp(eyesOnly / 0.45 + (headPart - clamp(headPart, -1.15, 1.15)) * 1.2, -1, 1), w), lerp(gaze[1], clamp(tp * 1.4, -0.8, 0.8), w)]; };
  for (const a of active(sc, f, "look")) lookAt(a.at, smooth(Math.min(1, (f - a.f0) / 7)) * smooth(Math.min(1, (a.f1 - f) / 9)));
  for (const a of active(sc, f, "listen")) { const w = smooth(Math.min(1, (f - a.f0) / 8)) * smooth(Math.min(1, (a.f1 - f) / 8)); lookAt(a.at, w); pose.head.pitch += 0.06 * Math.max(0, Math.sin((f - a.f0) * 0.13)) * w; pose.head.roll += 0.05 * w; }
  // ---------------- face: emotion + gaze + speech + blink
  let face = { ...emo.face, eyeL: { ...emo.face.eyeL }, eyeR: { ...emo.face.eyeR } };
  face.eyeL.gx = clamp(face.eyeL.gx + gaze[0], -1.1, 1.1); face.eyeR.gx = clamp(face.eyeR.gx + gaze[0], -1.1, 1.1); face.eyeL.gy = clamp(face.eyeL.gy + gaze[1], -1, 1); face.eyeR.gy = clamp(face.eyeR.gy + gaze[1], -1, 1);
  const fps = sc.fps ?? 30;
  for (const a of active(sc, f, "speak")) { const w = smooth(Math.min(1, (f - a.f0) / 4)) * smooth(Math.min(1, (a.f1 - f) / 4)), v = lipsync(a.words, f / fps, (a.amount ?? 1) * w);
    face.open += v.open; face.pucker = clamp(face.pucker + v.pucker, 0, 1); face.mouthW += v.w; face.teeth = Math.max(face.teeth, v.teeth * 0.8); face.upperLip += v.upperLip * 0.5;
    const wd = a.words.find((x) => f / fps >= x.t0 && f / fps < x.t1); if (wd && wd.t1 - wd.t0 > 0.32) { const e = Math.sin(Math.PI * clamp((f / fps - wd.t0) / 0.25, 0, 1)) * 0.3 * w; face.browL.h += e; face.browR.h += e; pose.head.pitch -= e * 0.08; } }
  const bl = blinkAt(f, seed, mood.blink, Math.max(0, 1 - mood.blink) * 0.6);
  face.eyeL.open *= 1 - bl; face.eyeR.open *= 1 - bl;
  face = sanitize(face); pose.face = face;
  const sk = solve(pose);
  if (grip) grip.at = gripPoint(sk, grip.side);
  return { sk, face, pos, facing: lo.facing, yaw, behindHead: behind, grip, walking: lo.w, contacts, gesture: gname };
};
/** suggested duration (frames) for walking a distance (m) in a style */
/** cheap world path of a script (position + facing only, no skeleton/face): for cameras that must sample it many times */
export const charPath = (sc: Script, f: number): { pos: W3; facing: number; walking: number } => { const l = locomotion(sc, f); return { pos: [l.x, l.rootY, l.z], facing: l.facing, walking: l.w }; };
export const walkFrames = (dist: number, style: GaitName = "normal", fps = 30) => Math.round((dist / (GAITS[style].stride * (GAITS[style].run ? 1.45 : 1.6))) * fps + 16);
export { NEUTRAL };
