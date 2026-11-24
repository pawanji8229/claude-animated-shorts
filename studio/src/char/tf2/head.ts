// TF2 head moves: purposeful head animations as additive yaw/pitch/roll curves over a local time window (frames).
// Every move eases in and out; quick moves overshoot slightly and settle. The solver clamps the result and pivots it
// inside the torso overlap, so no head move can open a neck gap.
import { smooth } from "./rig";
export type HeadMove = "nod" | "strongNod" | "shake" | "tilt" | "doubleTilt" | "slowTurn" | "quickTurn" | "overShoulder" | "confused" | "suspicious" | "lower" | "raise" | "lookUp" | "lookDown";
export type HeadAdd = { yaw: number; pitch: number; roll: number; bodyTwist?: number };
const S = Math.sin, PI = Math.PI;
/** t local frame, dur frames, amt -1..1 direction/amount (e.g. turn left/right) */
export const headMove = (m: HeadMove, t: number, dur: number, amt = 1): HeadAdd => {
  const u = Math.min(1, Math.max(0, t / dur)), env = smooth(Math.min(1, t / 6)) * smooth(Math.min(1, (dur - t) / 8));
  const z: HeadAdd = { yaw: 0, pitch: 0, roll: 0 }; if (t < 0 || t > dur) return z;
  switch (m) {
    case "nod": return { ...z, pitch: 0.12 * S(u * PI * 4) * env * amt };
    case "strongNod": return { ...z, pitch: 0.26 * Math.max(-0.3, S(u * PI * 3)) * env * amt };
    case "shake": return { ...z, yaw: 0.32 * S(u * PI * 6) * env * amt, roll: 0.03 * S(u * PI * 6 + 1) * env };
    case "tilt": return { ...z, roll: 0.22 * amt * env, pitch: -0.02 * env };
    case "doubleTilt": return { ...z, roll: (u < 0.5 ? 0.18 : -0.2) * amt * smooth(Math.min(1, Math.abs(u - 0.5) * 8)) * env };
    case "slowTurn": return { ...z, yaw: 0.9 * amt * smooth(u * 1.4) * env };
    case "quickTurn": { const k = Math.min(1, t / 5), os = 1 + 0.12 * S(Math.min(1, t / 9) * PI) * (t < 9 ? 1 : 0); return { ...z, yaw: 1.0 * amt * smooth(k) * os * smooth(Math.min(1, (dur - t) / 8)), pitch: -0.05 * env }; }
    case "overShoulder": return { yaw: 1.25 * amt * env, pitch: -0.04 * env, roll: 0.06 * amt * env, bodyTwist: 0.45 * amt * env };
    case "confused": return { ...z, roll: 0.16 * S(u * PI * 2) * env * amt, yaw: 0.08 * S(u * PI * 2 + 0.6) * env };
    case "suspicious": return { yaw: -0.22 * amt * env, pitch: 0.04 * env, roll: 0.08 * amt * env };
    case "lower": return { ...z, pitch: 0.32 * smooth(u * 1.5) * env };
    case "raise": return { ...z, pitch: -0.2 * smooth(u * 1.5) * env };
    case "lookUp": return { ...z, pitch: -0.32 * env };
    case "lookDown": return { ...z, pitch: 0.4 * env };
  }
};
