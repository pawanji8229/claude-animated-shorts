// short3 facial acting: a library of exaggerated, readable-on-a-phone expressions built ONLY from the original odo5
// face parameters (eyes/lids/pupil, asymmetric brows + worry, mouth shape + width, blush, sweat, gaze, head roll).
// Expressions are keyed per character on the narration timeline and blended smoothly (numbers ease, shapes switch at
// the midpoint), with per-character offsets so two people never pull the same face at the same moment.
import type { Odo5Pose, Eyes5, Mouth5 } from "../../char/odo5";
import { clamp01 } from "../../lib/math";

export type Face = { eyes: Eyes5; lids: number; pupil: number; browL: number; browR: number; worry: number; mouth: Mouth5; mouthW: number; blush: number; sweat: number; lookX: number; lookY: number; headRoll: number };
const F = (o: Partial<Face>): Face => ({ eyes: "lid", lids: 0.45, pupil: 1, browL: 0.6, browR: 0.1, worry: 0, mouth: "flat", mouthW: 1, blush: 0, sweat: 0, lookX: 0, lookY: 0, headRoll: 0, ...o });
export const FACES = {
  neutral: F({}),
  content: F({ mouth: "smile", mouthW: 0.8, lids: 0.5, browL: 0.5, browR: 0.4 }),
  proud: F({ mouth: "smile", mouthW: 1.25, eyes: "squint", browL: 0.9, browR: 0.9, headRoll: -0.06 }),
  smug: F({ mouth: "awkward", mouthW: 1.2, lids: 0.75, browL: 0.95, browR: -0.2, lookX: 0.5, headRoll: 0.05 }),
  sideEyeL: F({ lids: 0.62, lookX: -1, browL: -0.2, browR: 0.7, mouth: "flat", mouthW: 0.7 }),
  sideEyeR: F({ lids: 0.62, lookX: 1, browL: 0.7, browR: -0.25, mouth: "flat", mouthW: 0.7 }),
  suspicious: F({ lids: 0.78, lookX: 0.7, browL: -0.6, browR: 0.95, mouth: "wobble", mouthW: 0.6, headRoll: 0.07 }),
  confused: F({ eyes: "wince", browL: 1.0, browR: -0.5, worry: 0.4, mouth: "wobble", mouthW: 0.8, headRoll: -0.1 }),
  shocked: F({ eyes: "wide", pupil: 0.42, browL: 1.0, browR: 1.0, worry: 0.2, mouth: "o", mouthW: 1.2 }),
  panic: F({ eyes: "wide", pupil: 0.38, browL: 0.9, browR: 0.9, worry: 1.0, mouth: "yikes", mouthW: 1.25, sweat: 1, blush: 0.2 }),
  cringe: F({ eyes: "squint", browL: 0.9, browR: 0.9, worry: 1.0, mouth: "yikes", mouthW: 1.3, sweat: 1, blush: 0.7, headRoll: 0.08 }),
  awkwardSmile: F({ lids: 0.5, browL: 0.8, browR: 0.6, worry: 0.6, mouth: "awkward", mouthW: 1.3, blush: 0.5, sweat: 0.4, lookX: 0.3 }),
  nervousLaugh: F({ eyes: "squint", browL: 0.8, browR: 0.8, worry: 0.8, mouth: "yikes", mouthW: 1.0, sweat: 0.7, blush: 0.4, headRoll: -0.05 }),
  deadpan: F({ lids: 0.8, browL: 0.0, browR: 0.0, mouth: "flat", mouthW: 0.8 }),
  bored: F({ lids: 0.85, browL: 0.1, browR: 0.25, mouth: "flat", mouthW: 0.6, lookX: -0.4, lookY: 0.25 }),
  relieved: F({ eyes: "squint", browL: 0.5, browR: 0.5, worry: 0.3, mouth: "smile", mouthW: 1.1, sweat: 0.3 }),
  delighted: F({ eyes: "squint", browL: 1.0, browR: 1.0, mouth: "smile", mouthW: 1.35 }),
  talking: F({ mouth: "o", mouthW: 0.8, lids: 0.4, browL: 0.7, browR: 0.5 }),
  focused: F({ lids: 0.6, browL: -0.3, browR: -0.3, mouth: "flat", mouthW: 0.7, lookY: 0.3 }),
  idea: F({ eyes: "wide", pupil: 0.7, browL: 1.0, browR: 1.0, mouth: "smile", mouthW: 1.2, lookY: -0.4 }),
  worried: F({ lids: 0.4, browL: 0.7, browR: 0.7, worry: 1.0, mouth: "wobble", mouthW: 0.9, sweat: 0.3 }),
  disbelief: F({ eyes: "wide", pupil: 0.6, browL: 1.0, browR: 0.2, worry: 0.3, mouth: "flat", mouthW: 1.1, headRoll: 0.1 }),
} as const;
export type FaceName = keyof typeof FACES;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const blendFace = (a: Face, b: Face, t: number): Face => {
  const s = t * t * (3 - 2 * t); const h = s < 0.5;
  return { eyes: h ? a.eyes : b.eyes, mouth: h ? a.mouth : b.mouth, lids: lerp(a.lids, b.lids, s), pupil: lerp(a.pupil, b.pupil, s), browL: lerp(a.browL, b.browL, s), browR: lerp(a.browR, b.browR, s),
    worry: lerp(a.worry, b.worry, s), mouthW: lerp(a.mouthW, b.mouthW, s), blush: lerp(a.blush, b.blush, s), sweat: lerp(a.sweat, b.sweat, s), lookX: lerp(a.lookX, b.lookX, s), lookY: lerp(a.lookY, b.lookY, s), headRoll: lerp(a.headRoll, b.headRoll, s) };
};
/** keyed face track: [[frame, face], ...] sorted; each change eases over `ease` frames (holds otherwise) */
export const faceTrack = (keys: [number, FaceName][], ease = 6) => (f: number): Face => {
  let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= f) i++;
  const cur = FACES[keys[i][1]], prev = i > 0 ? FACES[keys[i - 1][1]] : cur;
  return blendFace(prev, cur, clamp01((f - keys[i][0]) / ease));
};
/** apply a face to a pose (keeps blinks; adds a tiny live jitter to brows so a held face never looks frozen) */
export const withFace = (p: Odo5Pose, face: Face, f: number, seed = 0): Odo5Pose => {
  const j = Math.sin(f * 0.21 + seed) * 0.04 + Math.sin(f * 0.077 + seed * 2) * 0.03;
  return { ...p, eyes: face.eyes, lids: face.lids, pupil: face.pupil, browL: face.browL + j, browR: face.browR - j * 0.6, worry: face.worry, mouth: face.mouth, mouthW: face.mouthW,
    blush: face.blush, sweat: face.sweat, lookX: face.lookX, lookY: face.lookY, headRoll: (p.headRoll ?? 0) + face.headRoll };
};
/** talking mouth flap on top of a face (irregular syllables) */
export const talkMouth = (face: Face, f: number, seed: number, amount = 1): Face => {
  if (amount <= 0.01) return face; const s = Math.sin(f * 0.9 + seed) + Math.sin(f * 1.7 + seed * 3) * 0.6;
  return s * amount > 0.35 ? { ...face, mouth: "o", mouthW: 0.7 + 0.3 * amount } : face;
};
