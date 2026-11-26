// TF2 lip-sync: narration-aware mouth animation from the ASR word timings the pipeline already produces
// (analysis.json -> phrases[].asr_words [{w, t0, t1}]). Each word is split into viseme classes from its letters, spread
// over the word's duration, smoothed (coarticulation) and scaled by an emphasis envelope. Between words and in pauses
// the mouth rests closed - it never flaps randomly, and it only runs during a "speak" action.
export type Word = { w: string; t0: number; t1: number };
type Vis = { open: number; pucker: number; w: number; teeth: number; upperLip: number };
const V = (open: number, pucker: number, w: number, teeth: number, upperLip = 0): Vis => ({ open, pucker, w, teeth, upperLip });
const REST: Vis = V(0, 0, 0, 0);
/** viseme classes (mouth deltas) */
const VIS: Record<string, Vis> = {
  A: V(0.72, 0, 0.12, 0.35), E: V(0.42, 0, 0.28, 0.5), I: V(0.28, 0, 0.32, 0.6), O: V(0.55, 0.75, -0.25, 0.1), U: V(0.25, 0.95, -0.35, 0),
  MBP: V(0, 0.1, -0.05, 0), FV: V(0.12, 0, 0.05, 0.6, 0.6), L: V(0.35, 0, 0.1, 0.45), TH: V(0.2, 0, 0.1, 0.55), WQ: V(0.2, 0.9, -0.3, 0), CDG: V(0.3, 0, 0.15, 0.55), S: V(0.12, 0, 0.18, 0.75),
};
const cls = (ch: string, next: string): string | null => {
  if ("aá".includes(ch)) return "A"; if ("e".includes(ch)) return "E"; if ("iy".includes(ch)) return "I"; if (ch === "o") return next === "o" ? "U" : "O"; if (ch === "u") return "U";
  if ("mbp".includes(ch)) return "MBP"; if ("fv".includes(ch)) return "FV"; if (ch === "l") return "L"; if (ch === "t" && next === "h") return "TH"; if ("wq".includes(ch)) return "WQ";
  if ("cdgkntrj".includes(ch)) return "CDG"; if ("szx".includes(ch)) return "S"; return null; };
const visemesOf = (w: string) => { const s = w.toLowerCase().replace(/[^a-z]/g, ""); const out: string[] = []; for (let i = 0; i < s.length; i++) { const c = cls(s[i], s[i + 1] ?? ""); if (c && out[out.length - 1] !== c) out.push(c); } return out.length ? out : ["E"]; };
const at = (words: Word[], t: number): Vis => {
  const wd = words.find((x) => t >= x.t0 && t < x.t1); if (!wd) return REST;
  const vs = visemesOf(wd.w), u = (t - wd.t0) / Math.max(0.05, wd.t1 - wd.t0), k = Math.min(vs.length - 1, Math.floor(u * vs.length));
  const edge = Math.min(1, Math.min(t - wd.t0, wd.t1 - t) / 0.05);            // close softly at word edges
  const v = VIS[vs[k]]; return { open: v.open * edge, pucker: v.pucker * edge, w: v.w * edge, teeth: v.teeth * edge, upperLip: v.upperLip * edge };
};
/** mouth deltas at time t (s): coarticulated (weighted window), amount 0..1 (emphasis/energy) */
export const lipsync = (words: Word[], t: number, amount = 1): Vis => {
  const taps: [number, number][] = [[-0.045, 0.2], [-0.02, 0.25], [0, 0.3], [0.025, 0.25]];
  const o = { open: 0, pucker: 0, w: 0, teeth: 0, upperLip: 0 }; for (const [dt, wt] of taps) { const v = at(words, t + dt); o.open += v.open * wt; o.pucker += v.pucker * wt; o.w += v.w * wt; o.teeth += v.teeth * wt; o.upperLip += v.upperLip * wt; }
  return { open: o.open * amount, pucker: o.pucker * amount, w: o.w * amount, teeth: o.teeth * amount, upperLip: o.upperLip * amount };
};
/** is someone speaking at t (used for listening/reaction choices) */
export const speakingAt = (words: Word[], t: number) => words.some((x) => t >= x.t0 - 0.05 && t < x.t1 + 0.05);
