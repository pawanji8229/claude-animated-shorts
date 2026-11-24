// Camera 2.0 <-> Character 2.0. Reads a TF2 Script (actions + emotion keys) and produces camera beats:
//   walk                -> follow / tracking beat (the camera follows naturally)
//   walk end + standing -> settle beat (the camera settles; it does not chase small moves)
//   gesture "point"     -> point beat with the pointed-at location as a point of interest (camera reveals it)
//   look at a point     -> attention beat (the frame opens toward what the character looks at)
//   emotion level >= 4  -> react beat (the camera emphasises the expression with a push)
//   reach / push        -> interact beat (frames character + object together)
//   speak               -> speak beat (stable coverage)
// Beats shorter than `minShot` are merged into their neighbours, so idle fidgets and tiny gestures never move the camera.
import type { Script } from "../../../char/tf2/planner";
import { charPath } from "../../../char/tf2/planner";
import type { Beat, BeatKind, Emotion } from "./director";
import type { SubjectDef } from "./presets";
import type { V3 } from "./core";

/** subject definition of a TF2 character, with a per-frame cache (cameras sample the path many times per frame) */
export const tf2Subject = (sc: Script, id = sc.id, height = 1.55): SubjectDef => {
  const cache = new Map<number, { pos: V3; facing: number }>();
  const get = (f: number) => { const k = Math.round(f * 4) / 4; let v = cache.get(k); if (!v) { const p = charPath(sc, k); v = { pos: [p.pos[0], Math.max(0, p.pos[1]), p.pos[2]], facing: p.facing }; if (cache.size > 20000) cache.clear(); cache.set(k, v); } return v; };
  return { id, kind: "character", height, width: 0.55, importance: 1, at: (f) => get(f).pos, facingAt: (f) => get(f).facing };
};
const EMO_MAP: Record<string, Emotion> = { happiness: "excitement", excitement: "excitement", surprise: "surprise", shock: "surprise", fear: "suspense", nervousness: "suspense", curiosity: "mystery", suspicion: "mystery", sadness: "sadness", disappointment: "sadness", pride: "importance", determination: "importance", confidence: "importance", awe: "grandeur", amusement: "comedy", embarrassment: "comedy", awkwardness: "comedy", confusedDisbelief: "comedy", calm: "calm", relief: "calm" };
/** derive camera beats from a TF2 script over [f0, f1] */
export const beatsFromScript = (sc: Script, f0: number, f1: number, opts: { subject?: string; minShot?: number; scene?: string; objects?: Record<string, V3> } = {}): Beat[] => {
  const id = opts.subject ?? sc.id, minShot = opts.minShot ?? 40, raw: Beat[] = [];
  const emotionAt = (f: number): { e?: Emotion; lv: number } => { const k = [...sc.emotions].reverse().find((e) => e.f <= f); if (!k) return { lv: 0 }; const top = [...k.mix].sort((a, b) => b.level - a.level)[0]; return { e: EMO_MAP[top.e as string] ?? "neutral", lv: top.level }; };
  const push = (a: number, b: number, kind: BeatKind, extra: Partial<Beat> = {}) => { a = Math.max(f0, a); b = Math.min(f1, b); if (b - a >= 8) raw.push({ f0: a, f1: b, kind, subject: id, scene: opts.scene, emotion: emotionAt(a).e, ...extra }); };
  for (const a of sc.actions) {
    if (a.kind === "walk") push(a.f0, a.f1, "action", { importance: 0.6, note: "character walks: follow" });
    else if (a.kind === "gesture" && a.g === "point" && a.dir) { const p = charPath(sc, a.f0).pos, poi: V3 = [p[0] + a.dir[0] * 3, 1 + a.dir[1] * 3, p[2] + a.dir[2] * 3]; push(a.f0, a.f1 + 30, "point", { poi, importance: 0.8, note: "points: reveal what is pointed at" }); }
    else if (a.kind === "look" && a.at !== "camera") push(a.f0, a.f1, "attention", { poi: a.at as V3, importance: 0.5, note: "looks at something: open the frame toward it" });
    else if (a.kind === "reach" || a.kind === "push") push(a.f0, a.f1, "interact", { importance: 0.7, note: "handles an object: frame both" });
    else if (a.kind === "speak") push(a.f0, a.f1, "speak", { importance: 0.6, note: "speaks: stable coverage" });
  }
  for (const k of sc.emotions) { const top = [...k.mix].sort((a, b) => b.level - a.level)[0]; if (top && top.level >= 4) push(k.f, k.f + 60, "react", { importance: 0.85, emotion: EMO_MAP[top.e as string] ?? "surprise", note: `strong ${top.e} (level ${top.level}): emphasise the face` }); }
  raw.sort((a, b) => a.f0 - b.f0 || (b.importance ?? 0) - (a.importance ?? 0));
  // build a non-overlapping timeline: later / more important beats win their range, gaps become "settle" beats
  const out: Beat[] = []; let t = f0;
  for (const b of raw) { if (b.f0 > t + 4) out.push({ f0: t, f1: b.f0, kind: out.length ? "settle" : "introduce", subject: id, scene: opts.scene, emotion: emotionAt(t).e, note: out.length ? "standing: let the camera settle" : "first look at the character" });
    const s = Math.max(t, b.f0); if (b.f1 - s >= 8) { out.push({ ...b, f0: s }); t = b.f1; } }
  if (t < f1 - 4) out.push({ f0: t, f1, kind: "settle", subject: id, scene: opts.scene, emotion: emotionAt(t).e, note: "standing: let the camera settle" });
  // merge short beats into the previous beat (the camera does not follow every tiny movement)
  const merged: Beat[] = []; for (const b of out) { const last = merged[merged.length - 1]; if (last && b.f1 - b.f0 < minShot && b.kind !== "react") { last.f1 = b.f1; continue; } if (last) last.f1 = b.f0; merged.push({ ...b }); }
  // a short FIRST beat has no predecessor to merge into: the next beat starts earlier instead
  if (merged.length > 1 && merged[0].f1 - merged[0].f0 < minShot) { merged[1].f0 = merged[0].f0; merged.shift(); }
  return merged;
};
