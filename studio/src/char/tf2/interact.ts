// TF2 object interaction: reach targets with physically coherent arms. A target is given in body space (or converted from
// the 3D world with the card's billboard frame). If it is beyond the arm, the character first leans / bends (within
// natural limits) and finally the reach is clamped - the hand never stretches and never passes through the body.
// Held objects follow the grip point (wrist + hand direction), so a carried prop is always in the hand.
import { P, add, sub, len, norm, scl, clamp, type V3 } from "./rig";
import { solve, type BodyPose, type Skeleton } from "./body";

/** convert a world point to this character's body space (card billboard: x along the card, y up, z toward the camera) */
export const worldToBody = (world: V3, sole: V3, cam: V3, facingYaw: number, cardH = 1.55): V3 => {
  const s = 1000 / cardH, yawC = Math.atan2(cam[0] - sole[0], cam[2] - sole[2]);
  const d: V3 = [world[0] - sole[0], world[1] - sole[1], world[2] - sole[2]];
  const cx = Math.cos(yawC), sx = Math.sin(yawC); const lx = d[0] * cx - d[2] * sx, lz = d[0] * sx + d[2] * cx;    // card-plane coordinates
  // card plane -> body space for the current facing (inverse of the projection yaw)
  const c = Math.cos(-facingYaw), sn = Math.sin(-facingYaw); return [(lx * c + lz * sn) * s, d[1] * s, (-lx * sn + lz * c) * s];
};
/** solve a reach: returns the extra lean/bend needed and the hand offset (relative to the shoulder) for side i (0 L, 1 R) */
export const reach = (pose: BodyPose, target: V3, i: 0 | 1): { hand: V3; lean: number; bend: number; ok: boolean } => {
  let lean = 0, bend = 0; const armLen = (P.upperArm + P.foreArm) * 0.98;
  for (let it = 0; it < 6; it++) { const sk: Skeleton = solve({ ...pose, lean: pose.lean + lean, bend: pose.bend + bend }); const sh = sk.shoulder[i], d = sub(target, sh), L = len(d);
    if (L <= armLen) return { hand: d, lean, bend, ok: true };
    const over = L - armLen; if (target[1] < sh[1]) lean = clamp(lean + over / 260, 0, 0.75); else lean = clamp(lean + over / 400, 0, 0.35);   // bend down for low objects
    bend = clamp(bend + (i === 0 ? 1 : -1) * Math.sign(target[0] - sh[0]) * over / 900, -0.25, 0.25); }
  const sk = solve({ ...pose, lean: pose.lean + lean, bend: pose.bend + bend }), sh = sk.shoulder[i]; return { hand: scl(norm(sub(target, sh)), armLen), lean, bend, ok: false };
};
/** grip point of a solved hand (where a held object sits) */
export const gripPoint = (sk: Skeleton, i: 0 | 1): V3 => add(sk.wrist[i], scl(sk.handDir[i], 20));
