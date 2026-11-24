// TF2 emotion engine. An emotion is NOT a face preset: it is a coordinated spec for the face (offsets from NEUTRAL),
// the body (lean, slump, shoulders, head bias, chest, tension, idle energy, blink rate, gaze aversion, knee bend) and
// a characteristic arm gesture. Emotions take an INTENSITY 0..5 (fractional allowed) and BLEND by weight:
//   level 0 neutral, 1 very subtle, 2 mild, 3 noticeable, 4 strong, 5 exaggerated (cartoon extras appear from ~3.5:
//   sweat, blush, tears, anger vein, gloom - so a mild emotion never looks over-acted).
import { NEUTRAL, applyDelta, sanitize, type FaceDelta, type FaceRig } from "./face";

export type Gesture = "none" | "fists" | "handsUp" | "handsUpSmall" | "palmsUp" | "handOnHip" | "handsOnHips" | "armsCrossed" | "handsTogether" | "facepalm" | "chinThink"
  | "chinRest" | "fidget" | "shrug" | "thumbsUp" | "thumbsDown" | "rubNeck" | "coverMouth" | "excitedFists" | "hugSelf" | "handOnChest" | "pushAway" | "scratchHead"
  | "point" | "wave" | "clap" | "count" | "behindBack" | "spread";
export type BodyMood = { lean: number; slump: number; shoulders: number; headPitch: number; headRoll: number; headYaw: number; chest: number; tension: number; energy: number; blink: number; avert: number; knees: number };
export const BODY0: BodyMood = { lean: 0, slump: 0, shoulders: 0, headPitch: 0, headRoll: 0, headYaw: 0, chest: 0, tension: 0, energy: 1, blink: 1, avert: 0, knees: 0 };
type Spec = { face: FaceDelta; body: Partial<BodyMood>; gesture: Gesture; note: string };
const E = (face: FaceDelta, body: Partial<BodyMood>, gesture: Gesture, note: string): Spec => ({ face, body, gesture, note });

/** the 30 emotional states (offsets at intensity 5) */
export const EMOTIONS = {
  happiness: E({ smile: 0.85, mouthW: 0.2, open: 0.15, teeth: 0.3, eyeL: { lower: 0.85, open: -0.15 }, eyeR: { lower: 0.85, open: -0.15 }, browL: { h: 0.25, inner: 0.1 }, browR: { h: 0.25, inner: 0.1 }, blush: 0.25, sparkle: 0.3 },
    { lean: 0.02, chest: 0.4, shoulders: -0.05, headRoll: 0.05, energy: 1 }, "none", "warm smile, cheeks push the lower lids up"),
  excitement: E({ smile: 1.0, mouthW: 0.35, open: 0.75, teeth: 0.6, tongue: 0.4, eyeL: { open: 0.35, lower: 0.1 }, eyeR: { open: 0.35, lower: 0.1 }, eyeScale: 0.15, pupil: 0.15, sparkle: 0.9, browL: { h: 1.0, inner: 0.3 }, browR: { h: 1.0, inner: 0.3 }, blush: 0.3 },
    { lean: 0.08, chest: 0.5, shoulders: 0.25, energy: 1.5, tension: 0.4 }, "excitedFists", "big open grin, wide sparkling eyes, fists pumping"),
  curiosity: E({ eyeL: { open: 0.15 }, eyeR: { open: 0.05 }, pupil: 0.1, browL: { h: 0.55, inner: 0.3 }, browR: { h: 0.2, inner: 0.2 }, open: 0.12, pucker: 0.3, asym: 0.1, smile: -0.05 },
    { lean: 0.1, headRoll: 0.12, headPitch: -0.02, energy: 0.7 }, "chinThink", "leans in, one brow up, lips pursed"),
  confusion: E({ browL: { h: 0.8, inner: 0.2, outer: 0.4 }, browR: { h: -0.3, inner: -0.6 }, eyeL: { open: 0.15 }, eyeR: { open: -0.2, lower: 0.2 }, smile: -0.25, asym: -0.35, open: 0.1, mouthW: -0.15 },
    { headRoll: -0.16, lean: -0.02, shoulders: 0.1, energy: 0.6 }, "scratchHead", "lopsided brows, crooked mouth, head tilts"),
  disbelief: E({ eyeL: { open: 0.45 }, eyeR: { open: 0.25 }, pupil: -0.25, browL: { h: 1.3, inner: 0.2 }, browR: { h: 0.4 }, open: 0.25, smile: -0.3, mouthW: 0.1, asym: 0.2 },
    { lean: -0.06, headPitch: -0.05, headRoll: 0.1, energy: 0.5 }, "palmsUp", "staring, brow shot up, jaw slack, palms up"),
  shock: E({ eyeL: { open: 0.55, lower: -0.05 }, eyeR: { open: 0.55, lower: -0.05 }, eyeScale: 0.25, pupil: -0.5, browL: { h: 1.4, inner: 0.4 }, browR: { h: 1.4, inner: 0.4 }, open: 1.0, pucker: 0.35, mouthW: -0.1, smile: -0.3, sweat: 0.5 },
    { lean: -0.12, shoulders: 0.6, tension: 1, headPitch: -0.08, energy: 0.4 }, "handsUp", "eyes pop, pinprick pupils, jaw drops, hands fly up"),
  fear: E({ eyeL: { open: 0.45, lower: 0.1 }, eyeR: { open: 0.45, lower: 0.1 }, pupil: -0.45, browL: { h: 0.9, inner: 1.1, outer: -0.4 }, browR: { h: 0.9, inner: 1.1, outer: -0.4 }, open: 0.35, mouthW: 0.2, smile: -0.5, teeth: 0.5, clench: 0.4, sweat: 0.8 },
    { lean: -0.1, slump: 0.2, shoulders: 0.7, tension: 1, knees: 0.25, avert: 0.3, energy: 1.2 }, "hugSelf", "worried brows, teeth bared, shrinking posture"),
  nervousness: E({ eyeL: { open: 0.05 }, eyeR: { open: 0.05 }, pupil: -0.15, browL: { h: 0.3, inner: 0.9, outer: -0.2 }, browR: { h: 0.3, inner: 0.9, outer: -0.2 }, smile: 0.1, asym: 0.15, mouthW: 0.1, clench: 0.25, teeth: 0.35, sweat: 0.6, blush: 0.2 },
    { shoulders: 0.35, avert: 0.5, energy: 1.25, blink: 2.2, tension: 0.6 }, "fidget", "tight smile, darting eyes, fidgeting hands, fast blinks"),
  embarrassment: E({ eyeL: { lower: 0.75, open: -0.25, gy: 0.5 }, eyeR: { lower: 0.75, open: -0.25, gy: 0.5 }, browL: { inner: 0.8, h: 0.2 }, browR: { inner: 0.8, h: 0.2 }, smile: 0.25, mouthW: 0.15, asym: -0.2, teeth: 0.2, blush: 1.0, sweat: 0.5 },
    { headPitch: 0.12, headRoll: 0.12, slump: 0.3, shoulders: 0.3, avert: 0.8, energy: 0.8 }, "rubNeck", "looks down and away, blushing, rubs the back of the head"),
  frustration: E({ browL: { h: -0.4, inner: -1.0 }, browR: { h: -0.4, inner: -1.0 }, eyeL: { open: -0.2, lower: 0.25 }, eyeR: { open: -0.2, lower: 0.25 }, clench: 0.8, teeth: 0.8, mouthW: 0.25, smile: -0.4, open: 0.1, vein: 0.4, blush: 0.2 },
    { tension: 0.8, shoulders: 0.3, lean: 0.05, energy: 1.1 }, "fists", "gritted teeth, knitted brows, clenched fists"),
  anger: E({ browL: { h: -0.7, inner: -1.3, outer: 0.4 }, browR: { h: -0.7, inner: -1.3, outer: 0.4 }, eyeL: { open: -0.25, lower: 0.3 }, eyeR: { open: -0.25, lower: 0.3 }, pupil: -0.2, open: 0.35, teeth: 0.9, clench: 0.7, smile: -0.7, mouthW: 0.2, upperLip: 0.5, vein: 1, blush: 0.4 },
    { lean: 0.12, chest: 0.6, shoulders: 0.2, tension: 1, headPitch: 0.08, energy: 0.9 }, "fists", "V brows, narrowed eyes, snarl, chest forward"),
  sadness: E({ browL: { inner: 1.2, outer: -0.6, h: 0.1 }, browR: { inner: 1.2, outer: -0.6, h: 0.1 }, eyeL: { open: -0.35, lower: 0.15, gy: 0.4 }, eyeR: { open: -0.35, lower: 0.15, gy: 0.4 }, pupil: 0.1, smile: -0.85, mouthW: -0.15, open: 0.05, tears: 0.6, gloom: 0.5 },
    { slump: 0.8, headPitch: 0.2, shoulders: -0.15, lean: 0.05, energy: 0.4, blink: 0.7 }, "none", "tilted-up inner brows, downturned mouth, drooping body"),
  disappointment: E({ browL: { inner: 0.7, h: -0.1, outer: -0.4 }, browR: { inner: 0.7, h: -0.1, outer: -0.4 }, eyeL: { open: -0.4, gy: 0.3 }, eyeR: { open: -0.4, gy: 0.3 }, smile: -0.6, mouthW: 0.05, asym: 0.1, gloom: 0.3 },
    { slump: 0.6, headPitch: 0.15, shoulders: -0.2, energy: 0.5 }, "handsOnHips", "heavy lids, flat downturned mouth, shoulders drop"),
  suspicion: E({ browL: { h: -0.6, inner: -0.6 }, browR: { h: 0.9, outer: 0.2 }, eyeL: { open: -0.45, lower: 0.35, gx: 0.85 }, eyeR: { open: -0.35, lower: 0.35, gx: 0.85 }, smile: -0.25, asym: -0.3, mouthW: -0.25, pucker: 0.1 },
    { headRoll: 0.08, headYaw: -0.12, lean: -0.03, energy: 0.3 }, "armsCrossed", "side-eye, one brow down one up, minimal movement"),
  sarcasm: E({ eyeL: { open: -0.35, lower: 0.2, gy: -0.6 }, eyeR: { open: -0.35, lower: 0.2, gy: -0.6 }, browL: { h: 0.7 }, browR: { h: 0.1 }, smile: 0.35, asym: 0.7, mouthW: 0.1 },
    { headRoll: -0.1, headPitch: -0.05, lean: -0.04, energy: 0.6 }, "handOnHip", "eye-roll, lopsided smirk"),
  confidence: E({ eyeL: { open: -0.08, lower: 0.15 }, eyeR: { open: -0.08, lower: 0.15 }, browL: { h: 0.1, outer: 0.1 }, browR: { h: 0.1, outer: 0.1 }, smile: 0.45, asym: 0.35, mouthW: 0.1, sparkle: 0.3 },
    { chest: 0.8, lean: -0.04, headPitch: -0.08, shoulders: -0.1, tension: 0.3, energy: 0.6 }, "handOnHip", "upright, relaxed shoulders, easy half-smile"),
  pride: E({ eyeL: { lower: 0.95, open: -0.35 }, eyeR: { lower: 0.95, open: -0.35 }, browL: { h: 0.45 }, browR: { h: 0.45 }, smile: 0.75, mouthW: 0.2, teeth: 0.2, blush: 0.15 },
    { chest: 1, lean: -0.07, headPitch: -0.14, headRoll: -0.05, energy: 0.6 }, "handsOnHips", "chin up, chest out, satisfied closed-eye smile"),
  boredom: E({ eyeL: { open: -0.55, lower: 0.1, gx: -0.3, gy: 0.15 }, eyeR: { open: -0.55, lower: 0.1, gx: -0.3, gy: 0.15 }, browL: { h: -0.25 }, browR: { h: -0.25 }, smile: -0.2, mouthW: -0.25, asym: -0.15, gloom: 0.15 },
    { slump: 0.5, headRoll: 0.14, headPitch: 0.05, energy: 0.25, blink: 0.6 }, "chinRest", "half-shut eyes, slack posture, head propped on a hand"),
  sleepiness: E({ eyeL: { open: -0.75, lower: 0.15, gy: 0.2 }, eyeR: { open: -0.75, lower: 0.15, gy: 0.2 }, browL: { h: -0.1, inner: 0.3 }, browR: { h: -0.1, inner: 0.3 }, open: 0.08, smile: -0.1, mouthW: -0.2 },
    { slump: 0.7, headPitch: 0.25, headRoll: 0.15, energy: 0.2, blink: 0.4 }, "none", "drooping lids, nodding head"),
  surprise: E({ eyeL: { open: 0.45 }, eyeR: { open: 0.45 }, eyeScale: 0.15, pupil: -0.2, browL: { h: 1.2 }, browR: { h: 1.2 }, open: 0.6, pucker: 0.45, mouthW: -0.2, smile: 0.1 },
    { lean: -0.08, shoulders: 0.35, headPitch: -0.06, tension: 0.6, energy: 0.7 }, "handsUpSmall", "brows up, round 'oh' mouth, small startle"),
  awkwardness: E({ eyeL: { lower: 0.25, gx: 0.6 }, eyeR: { lower: 0.25, gx: 0.6 }, browL: { inner: 0.6, h: 0.3 }, browR: { inner: 0.6, h: 0.3 }, smile: 0.3, mouthW: 0.35, teeth: 0.6, clench: 0.6, asym: 0.2, sweat: 0.5, blush: 0.35 },
    { shoulders: 0.45, headRoll: 0.1, avert: 0.6, energy: 0.9 }, "rubNeck", "forced grin, eyes slide away"),
  relief: E({ eyeL: { open: -0.6, lower: 0.75 }, eyeR: { open: -0.6, lower: 0.75 }, browL: { inner: 0.5, h: 0.1 }, browR: { inner: 0.5, h: 0.1 }, smile: 0.45, open: 0.2, pucker: 0.2, sweat: 0.3 },
    { slump: 0.3, shoulders: -0.3, headPitch: -0.05, lean: -0.04, energy: 0.6 }, "handOnChest", "eyes close, 'phew' mouth, shoulders release"),
  determination: E({ browL: { h: -0.35, inner: -0.7 }, browR: { h: -0.35, inner: -0.7 }, eyeL: { open: -0.1, lower: 0.2 }, eyeR: { open: -0.1, lower: 0.2 }, pupil: -0.05, clench: 0.35, mouthW: 0.05, smile: -0.05, asym: 0.1, sparkle: 0.2 },
    { lean: 0.1, chest: 0.5, tension: 0.8, headPitch: 0.05, energy: 0.7 }, "fists", "set jaw, low brows, leaning in"),
  concentration: E({ browL: { inner: -0.6, h: -0.2 }, browR: { inner: -0.6, h: -0.2 }, eyeL: { open: -0.3, lower: 0.2, gy: 0.25 }, eyeR: { open: -0.3, lower: 0.2, gy: 0.25 }, mouthW: -0.25, smile: -0.1, asym: 0.25, tongue: 0.5, open: 0.08 },
    { lean: 0.12, headPitch: 0.1, headRoll: 0.05, energy: 0.3, blink: 0.5 }, "handsTogether", "squint, tongue poking out of a corner"),
  amusement: E({ eyeL: { lower: 1.0, open: -0.3 }, eyeR: { lower: 1.0, open: -0.3 }, browL: { h: 0.3, inner: 0.2 }, browR: { h: 0.3, inner: 0.2 }, smile: 0.8, open: 0.45, teeth: 0.5, mouthW: 0.2, asym: 0.15, blush: 0.2 },
    { headPitch: -0.06, headRoll: -0.06, shoulders: 0.1, energy: 1.1 }, "coverMouth", "laughing eyes, chuckling"),
  disgust: E({ browL: { h: -0.5, inner: -0.8 }, browR: { h: -0.2 }, eyeL: { open: -0.35, lower: 0.45 }, eyeR: { open: -0.35, lower: 0.45 }, upperLip: 0.8, smile: -0.6, asym: -0.5, mouthW: -0.05, teeth: 0.3, open: 0.1 },
    { lean: -0.12, headPitch: -0.1, headYaw: 0.2, shoulders: 0.2, energy: 0.5 }, "pushAway", "lip curled, recoils and turns away"),
  uncertainty: E({ browL: { h: 0.35, inner: 0.5 }, browR: { h: 0.05, inner: 0.3 }, eyeL: { gx: -0.4, open: -0.05 }, eyeR: { gx: -0.4, open: -0.05 }, smile: -0.1, asym: -0.3, mouthW: -0.2, pucker: 0.15 },
    { headRoll: 0.08, shoulders: 0.3, energy: 0.6 }, "shrug", "eyes drift aside, half-shrug"),
  excitedFear: E({ eyeL: { open: 0.5 }, eyeR: { open: 0.5 }, pupil: -0.3, eyeScale: 0.2, sparkle: 0.6, browL: { h: 1.0, inner: 0.9 }, browR: { h: 1.0, inner: 0.9 }, smile: 0.4, open: 0.55, teeth: 0.7, clench: 0.3, mouthW: 0.3, sweat: 0.6, blush: 0.2 },
    { lean: 0.05, shoulders: 0.5, tension: 0.9, energy: 1.35 }, "handsUp", "manic grin with terrified eyes"),
  confusedDisbelief: E({ browL: { h: 1.3 }, browR: { h: -0.5, inner: -0.5 }, eyeL: { open: 0.5 }, eyeR: { open: -0.35, lower: 0.3 }, pupil: -0.2, open: 0.3, smile: -0.3, asym: -0.5, pucker: 0.2 },
    { headRoll: -0.2, lean: -0.08, headPitch: -0.04, energy: 0.5 }, "palmsUp", "one eye wide one squinting, 'what?!'"),
  cringe: E({ eyeL: { open: -0.9, lower: 1.0 }, eyeR: { open: -0.9, lower: 1.0 }, browL: { inner: 1.2, h: 0.5 }, browR: { inner: 1.2, h: 0.5 }, teeth: 1, clench: 1, mouthW: 0.5, smile: -0.2, open: 0.2, sweat: 1, blush: 0.8 },
    { shoulders: 0.9, headRoll: 0.15, headPitch: 0.1, lean: -0.1, tension: 1, knees: 0.2, energy: 1.1 }, "hugSelf", "eyes squeezed shut, teeth clenched, whole body shrinks"),
} as const satisfies Record<string, Spec>;
export type EmotionName = keyof typeof EMOTIONS;
export const EMOTION_NAMES = Object.keys(EMOTIONS) as EmotionName[];

/** intensity level 0..5 -> amount (non-linear: subtle levels stay subtle) */
export const levelK = (lv: number) => { const K = [0, 0.15, 0.33, 0.55, 0.78, 1]; const l = Math.min(5, Math.max(0, lv)), i = Math.min(4, Math.floor(l)); return K[i] + (K[i + 1] - K[i]) * (l - i); };
/** cartoon extras only from ~3.5 upward */
const extraK = (lv: number) => { const t = Math.min(1, Math.max(0, (lv - 3) / 2)); return t * t * (3 - 2 * t); };
const EXTRA: (keyof FaceRig)[] = ["sweat", "blush", "tears", "vein", "gloom"];
export type EmotionMix = { e: EmotionName; level: number; w?: number }[];
export type EmotionOut = { face: FaceRig; body: BodyMood; gesture: Gesture; gestureW: number };
/** evaluate a weighted blend of emotions at their intensities -> face + body + dominant gesture */
export const evalEmotion = (mix: EmotionMix): EmotionOut => {
  const wsum = mix.reduce((s, m) => s + (m.w ?? 1), 0), norm = wsum > 1 ? 1 / wsum : 1;
  let face = NEUTRAL; const body: BodyMood = { ...BODY0 }; let best: { g: Gesture; s: number } = { g: "none", s: 0 };
  for (const m of mix) { const sp = EMOTIONS[m.e], w = (m.w ?? 1) * norm, k = levelK(m.level) * w, ek = extraK(m.level) * w;
    const main: FaceDelta = {}, extra: FaceDelta = {};
    for (const [key, v] of Object.entries(sp.face)) ((EXTRA as string[]).includes(key) ? extra : main)[key as keyof FaceDelta] = v as never;
    face = applyDelta(applyDelta(face, main, k), extra, ek);
    for (const [key, v] of Object.entries(sp.body)) { const kk = key as keyof BodyMood; if (kk === "energy" || kk === "blink") body[kk] *= 1 + ((v as number) - 1) * k; else body[kk] += (v as number) * k; }
    const s = k * (m.level >= 2.5 ? 1 : 0); if (sp.gesture !== "none" && s > best.s) best = { g: sp.gesture, s }; }
  const gl = mix.reduce((mx, m) => Math.max(mx, (EMOTIONS[m.e].gesture === best.g ? m.level : 0)), 0);
  return { face: sanitize(face), body, gesture: best.g, gestureW: Math.min(1, Math.max(0, (gl - 2.2) / 1.6)) };
};
/** suggested blends from the brief */
export const BLENDS: Record<string, EmotionMix> = {
  "confusion+suspicion": [{ e: "confusion", level: 4, w: 0.55 }, { e: "suspicion", level: 4, w: 0.45 }],
  "happiness+excitement": [{ e: "happiness", level: 4, w: 0.5 }, { e: "excitement", level: 4, w: 0.5 }],
  "shock+disbelief": [{ e: "shock", level: 4, w: 0.55 }, { e: "disbelief", level: 4, w: 0.45 }],
  "anger+frustration": [{ e: "anger", level: 4, w: 0.5 }, { e: "frustration", level: 4, w: 0.5 }],
  "fear+nervousness": [{ e: "fear", level: 4, w: 0.5 }, { e: "nervousness", level: 4, w: 0.5 }],
  "sadness+disappointment": [{ e: "sadness", level: 4, w: 0.5 }, { e: "disappointment", level: 4, w: 0.5 }],
  "confidence+sarcasm": [{ e: "confidence", level: 4, w: 0.5 }, { e: "sarcasm", level: 4, w: 0.5 }],
  "awkwardness+embarrassment": [{ e: "awkwardness", level: 4, w: 0.5 }, { e: "embarrassment", level: 4, w: 0.5 }],
};
