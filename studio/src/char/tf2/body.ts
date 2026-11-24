// TF2 body: the full pose description (what animation layers write) and the solver that turns it into a skeleton of
// 3D joints. All constraints that protect the TwistFrame identity are enforced HERE, after every layer has spoken:
//   * head rotation is clamped and pivots inside the torso overlap -> the head can never separate from the body (no gap)
//   * arms/legs are 2-bone IK with fixed bone lengths and clamped reach -> limbs never stretch or shrink
//   * feet below the ground are lifted to it -> no floor penetration
import { P, SOLE, add, sub, scl, len, norm, clamp, rotX, rotY, rotZ, ik2, project, type V3, type Proj } from "./rig";
import type { FaceRig } from "./face";
import type { HandShape } from "./hands";

export type Arm = { hand: V3; pole: V3; bend: number; twist: number; shape: HandShape };   // hand target RELATIVE TO ITS SHOULDER (body axes), elbow pole, wrist bend (rad), wrist roll (rad)
export type Leg = { ankle: V3; pitch: number; yaw: number; pole: V3 };                         // ankle target, foot pitch (+ toe down), foot yaw
export type BodyPose = {
  yaw: number;                                    // facing relative to the camera (0 = towards the viewer)
  root: V3;                                       // body offset (sway x, bob y, forward z)
  pelvisRoll: number; pelvisYaw: number;          // hip drop / hip twist
  lean: number; bend: number; twist: number;      // spine pitch (+ forward), side bend (+ to character's left), upper-body twist
  slump: number; squash: number; chest: number;   // round-shouldered droop 0..1, squash (-)/stretch(+) -0.12..0.12, chest out 0..1
  shoulderL: number; shoulderR: number;           // shrug (px up)
  head: { yaw: number; pitch: number; roll: number };
  armL: Arm; armR: Arm; legL: Leg; legR: Leg;
  face: FaceRig;
};
export type Skeleton = {
  yaw: number; pelvis: V3; hip: [V3, V3]; knee: [V3, V3]; ankle: [V3, V3]; toe: [V3, V3]; footPitch: [number, number];
  torsoBot: V3; torsoTop: V3; spineR: (p: V3) => V3; neck: V3; head: V3; headRot: { yaw: number; pitch: number; roll: number };
  shoulder: [V3, V3]; elbow: [V3, V3]; wrist: [V3, V3]; handDir: [V3, V3]; reach: [number, number]; legReach: [number, number];
  pose: BodyPose;
};
/** standing rest targets (body space) */
export const restArm = (side: -1 | 1, shape: HandShape): Arm => ({ hand: [side * 30, -196, 8], pole: [side * 0.55, -0.1, -0.85], bend: 0, twist: 0, shape });
export const restLeg = (side: -1 | 1): Leg => ({ ankle: [side * 50, P.ankle, 4], pitch: 0, yaw: side * 0.12, pole: [side * 0.15, 0, 1] });

/** solve a pose into joints. Head/neck: pivot 30 px BELOW the torso top (inside the overlap). */
export const solve = (b: BodyPose): Skeleton => {
  const pel: V3 = add([0, P.pelvisY, 0], b.root);
  // pelvis: hips drop/twist
  const hipOff = (s: number): V3 => rotY(rotZ([s * P.hipW, -6, 0], b.pelvisRoll), b.pelvisYaw);
  const hip: [V3, V3] = [add(pel, hipOff(-1)), add(pel, hipOff(1))];
  // legs (2-bone IK, knee forward)
  const legs = ([b.legL, b.legR] as Leg[]).map((lg, i) => { const a: V3 = [lg.ankle[0], Math.max(P.ankle - 0.5, lg.ankle[1]), lg.ankle[2]]; const r = ik2(hip[i], a, P.thigh, P.shin, lg.pole);
    const fwd = rotY([0, 0, 1], lg.yaw), toe = add(r.end, add(scl(fwd, 34 * Math.cos(lg.pitch)), [0, -16 - 34 * Math.sin(lg.pitch) + 16 * (1 - Math.cos(lg.pitch)), 0]));
    return { knee: r.mid, ankle: r.end, toe, reach: r.reach }; });
  // spine: twist (yaw) -> lean (pitch) -> bend (roll); torso bottom sits just above the hip line
  const spineR = (p: V3) => rotZ(rotX(rotY(p, b.twist), -b.lean), b.bend);
  const tb = add(pel, [0, 4, 0]);
  const tl = P.torsoLen * (1 + clamp(b.squash, -0.14, 0.14));
  const tt = add(tb, spineR([0, tl, b.slump * -18]));
  const upper = (p: V3) => rotZ(rotX(rotY(p, b.twist * 1.3), -(b.lean + b.slump * 0.32)), b.bend);           // shoulders/head follow the slump a bit more
  const shoulder: [V3, V3] = [-1, 1].map((s) => add(tt, add(upper([s * P.shoulderW, -P.shoulderDrop, b.slump * 16 - b.chest * 6]), [0, s < 0 ? b.shoulderL : b.shoulderR, 0]))) as [V3, V3];
  const arms = ([b.armL, b.armR] as Arm[]).map((am, i) => { const r = ik2(shoulder[i], add(shoulder[i], am.hand), P.upperArm, P.foreArm, am.pole); return { elbow: r.mid, wrist: r.end, dir: norm(sub(r.end, r.mid)), reach: r.reach }; });
  // head: clamped rotation about a pivot inside the torso overlap -> no gap is possible
  const hr = { yaw: clamp(b.head.yaw, -1.3, 1.3), pitch: clamp(b.head.pitch, -0.45, 0.55), roll: clamp(b.head.roll, -0.42, 0.42) };
  const neck = add(tt, upper([0, -30, 0]));
  const headOff = rotZ(rotX([0, P.headUp + 30, 0], -hr.pitch), hr.roll);
  const head = add(neck, upper(headOff));
  return { yaw: b.yaw, pelvis: pel, hip, knee: [legs[0].knee, legs[1].knee], ankle: [legs[0].ankle, legs[1].ankle], toe: [legs[0].toe, legs[1].toe], footPitch: [b.legL.pitch, b.legR.pitch],
    torsoBot: tb, torsoTop: tt, spineR, neck, head, headRot: hr, shoulder, elbow: [arms[0].elbow, arms[1].elbow], wrist: [arms[0].wrist, arms[1].wrist], handDir: [arms[0].dir, arms[1].dir],
    reach: [arms[0].reach, arms[1].reach], legReach: [legs[0].reach, legs[1].reach], pose: b };
};
/** project every joint for drawing / diagnostics */
export const projectAll = (s: Skeleton) => { const pr = (p: V3): Proj => project(p, s.yaw);
  return { pr, head: pr(s.head), torsoTop: pr(s.torsoTop), torsoBot: pr(s.torsoBot) }; };
/** vertical overlap of the head over the torso top in card px (must stay >= P.neckOverlapMin) */
export const headOverlap = (s: Skeleton) => { const h = project(s.head, s.yaw), t = project(s.torsoTop, s.yaw); return (h.y + P.headRy) - t.y; };
export const SOLE_Y = SOLE; void len;
