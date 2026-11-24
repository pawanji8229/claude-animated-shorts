// TF2 facial rig: every feature is a CONTINUOUS parameter (no discrete eye/mouth "modes" that pop at a blend midpoint).
// Two faces always interpolate smoothly, emotions are weighted sums of these parameters, and speech overlays only the
// mouth channels. Ranges are clamped in `sanitize` so no combination can tear or detach a feature.
export type Brow = { h: number; inner: number; outer: number; arch: number };      // height, inner-end lift (+ up / - furrow), outer-end lift, arch bend
export type Eye = { open: number; lower: number; gx: number; gy: number };           // upper-lid opening 0 shut .. 1 normal .. 1.5 wide, lower-lid raise 0..1 (happy squint), gaze -1..1
export type FaceRig = {
  eyeL: Eye; eyeR: Eye; pupil: number; eyeScale: number; sparkle: number;          // pupil size (0.45 pinprick .. 1.25), sclera scale, catch-light size
  browL: Brow; browR: Brow; browThick: number;
  mouthW: number; open: number; smile: number; asym: number; pucker: number;       // width, jaw opening, corner lift (-1 frown .. 1), corner asymmetry (+ right side up), rounded "o"
  teeth: number; clench: number; upperLip: number; tongue: number; mouthY: number; // teeth visible, clenched grin lines, upper lip raise, tongue, vertical offset (px)
  blush: number; sweat: number; tears: number; vein: number; gloom: number;         // cartoon extras (only at high intensities)
};
export const BROW0: Brow = { h: 0, inner: 0, outer: 0, arch: 0.2 };
export const EYE0: Eye = { open: 1, lower: 0.05, gx: 0, gy: 0 };
export const NEUTRAL: FaceRig = {
  eyeL: { ...EYE0 }, eyeR: { ...EYE0 }, pupil: 1, eyeScale: 1, sparkle: 0.5,
  browL: { ...BROW0 }, browR: { ...BROW0 }, browThick: 1,
  mouthW: 1, open: 0, smile: 0.12, asym: 0, pucker: 0, teeth: 0, clench: 0, upperLip: 0, tongue: 0, mouthY: 0,
  blush: 0, sweat: 0, tears: 0, vein: 0, gloom: 0,
};
const L = (a: number, b: number, t: number) => a + (b - a) * t;
const lb = (a: Brow, b: Brow, t: number): Brow => ({ h: L(a.h, b.h, t), inner: L(a.inner, b.inner, t), outer: L(a.outer, b.outer, t), arch: L(a.arch, b.arch, t) });
const le = (a: Eye, b: Eye, t: number): Eye => ({ open: L(a.open, b.open, t), lower: L(a.lower, b.lower, t), gx: L(a.gx, b.gx, t), gy: L(a.gy, b.gy, t) });
const NUM: (keyof FaceRig)[] = ["pupil", "eyeScale", "sparkle", "browThick", "mouthW", "open", "smile", "asym", "pucker", "teeth", "clench", "upperLip", "tongue", "mouthY", "blush", "sweat", "tears", "vein", "gloom"];
/** linear blend of two faces (t 0..1) */
export const mixFace = (a: FaceRig, b: FaceRig, t: number): FaceRig => {
  const o = { ...a, eyeL: le(a.eyeL, b.eyeL, t), eyeR: le(a.eyeR, b.eyeR, t), browL: lb(a.browL, b.browL, t), browR: lb(a.browR, b.browR, t) } as FaceRig;
  for (const k of NUM) (o as Record<string, unknown>)[k] = L(a[k] as number, b[k] as number, t);
  return o;
};
/** face expressed as an offset from NEUTRAL, scaled by k (used by the emotion engine to sum weighted emotions) */
export type FaceDelta = { [K in keyof FaceRig]?: FaceRig[K] extends number ? number : Partial<FaceRig[K]> };
export const applyDelta = (base: FaceRig, d: FaceDelta, k: number): FaceRig => {
  const o: FaceRig = { ...base, eyeL: { ...base.eyeL }, eyeR: { ...base.eyeR }, browL: { ...base.browL }, browR: { ...base.browR } };
  for (const [key, val] of Object.entries(d)) {
    if (val === undefined) continue;
    if (typeof val === "number") (o as Record<string, number | object>)[key] = ((o as Record<string, unknown>)[key] as number) + val * k;
    else { const tgt = (o as unknown as Record<string, Record<string, number>>)[key]; for (const [kk, vv] of Object.entries(val as Record<string, number>)) tgt[kk] += vv * k; }
  }
  return o;
};
const c = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const cb = (b: Brow): Brow => ({ h: c(b.h, -1.2, 1.8), inner: c(b.inner, -1.3, 1.3), outer: c(b.outer, -1.2, 1.2), arch: c(b.arch, -0.6, 1.2) });
const ce = (e: Eye): Eye => ({ open: c(e.open, 0, 1.6), lower: c(e.lower, 0, 1), gx: c(e.gx, -1.15, 1.15), gy: c(e.gy, -1, 1) });
/** clamp every channel to its drawable range (no feature can leave the face, invert, or detach) */
export const sanitize = (f: FaceRig): FaceRig => ({
  ...f, eyeL: ce(f.eyeL), eyeR: ce(f.eyeR), browL: cb(f.browL), browR: cb(f.browR), pupil: c(f.pupil, 0.4, 1.3), eyeScale: c(f.eyeScale, 0.8, 1.4), sparkle: c(f.sparkle, 0, 1.6),
  browThick: c(f.browThick, 0.7, 1.4), mouthW: c(f.mouthW, 0.5, 1.6), open: c(f.open, 0, 1.25), smile: c(f.smile, -1.1, 1.15), asym: c(f.asym, -1, 1), pucker: c(f.pucker, 0, 1),
  teeth: c(f.teeth, 0, 1), clench: c(f.clench, 0, 1), upperLip: c(f.upperLip, 0, 1), tongue: c(f.tongue, 0, 1), mouthY: c(f.mouthY, -14, 14),
  blush: c(f.blush, 0, 1), sweat: c(f.sweat, 0, 1), tears: c(f.tears, 0, 1), vein: c(f.vein, 0, 1), gloom: c(f.gloom, 0, 1),
});
