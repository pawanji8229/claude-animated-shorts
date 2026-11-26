// TF2 hands: articulated cartoon gloves (palm + thumb + four fingers). Each digit has its own curl (0 straight .. 1 fully
// curled into the palm) plus a shared spread and thumb abduction, so shapes blend continuously (a fist opening into a
// wave passes through every in-between) and finger motion is coordinated by the gesture that owns the hand.
export type HandShape = { curl: [number, number, number, number, number]; spread: number; thumbOut: number; palm: number };   // curl: thumb, index, middle, ring, pinky; palm: 0 back of hand .. 1 palm towards viewer
const H = (curl: [number, number, number, number, number], spread: number, thumbOut: number, palm = 0.3): HandShape => ({ curl, spread, thumbOut, palm });
export const HANDS = {
  relaxed: H([0.35, 0.3, 0.38, 0.45, 0.5], 0.15, 0.35, 0.2),
  open: H([0, 0, 0, 0, 0], 0.7, 1, 0.85),
  flat: H([0.1, 0, 0, 0, 0], 0.08, 0.4, 0.6),
  fist: H([0.75, 1, 1, 1, 1], 0, 0.2, 0.1),
  point: H([0.7, 0, 1, 1, 1], 0, 0.2, 0.15),
  thumbsUp: H([0, 1, 1, 1, 1], 0, 1, 0.15),
  thumbsDown: H([0, 1, 1, 1, 1], 0, 1, 0.15),
  palmUp: H([0.15, 0.08, 0.12, 0.16, 0.2], 0.35, 0.8, 1),
  grip: H([0.6, 0.72, 0.75, 0.78, 0.8], 0.05, 0.6, 0.2),
  pinch: H([0.45, 0.55, 0.85, 0.9, 0.9], 0.1, 0.6, 0.3),
  wave: H([0, 0, 0, 0, 0], 0.45, 0.8, 0.9),
  claw: H([0.45, 0.5, 0.5, 0.5, 0.5], 0.75, 0.9, 0.7),
  one: H([0.8, 0, 1, 1, 1], 0, 0.15, 0.75), two: H([0.8, 0, 0, 1, 1], 0.3, 0.15, 0.75), three: H([0.8, 0, 0, 0, 1], 0.35, 0.15, 0.75),
  four: H([0.85, 0, 0, 0, 0], 0.4, 0.1, 0.75), five: H([0, 0, 0, 0, 0], 0.6, 1, 0.8),
} as const satisfies Record<string, HandShape>;
export type HandName = keyof typeof HANDS;
const L = (a: number, b: number, t: number) => a + (b - a) * t;
export const mixHand = (a: HandShape, b: HandShape, t: number): HandShape => ({ curl: a.curl.map((v, i) => L(v, b.curl[i], t)) as HandShape["curl"], spread: L(a.spread, b.spread, t), thumbOut: L(a.thumbOut, b.thumbOut, t), palm: L(a.palm, b.palm, t) });
/** fingers ripple when a hand closes/opens (pinky leads a fist, index leads an opening): t 0..1 */
export const rippleHand = (a: HandShape, b: HandShape, t: number): HandShape => ({ ...mixHand(a, b, t), curl: a.curl.map((v, i) => { const lag = i === 0 ? 0.12 : (4 - i) * 0.07; const u = Math.min(1, Math.max(0, (t - lag) / (1 - 0.28))); return L(v, b.curl[i], u * u * (3 - 2 * u)); }) as HandShape["curl"] });
