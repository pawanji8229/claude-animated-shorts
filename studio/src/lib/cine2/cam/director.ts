// Camera 2.0 director: turns story beats (what happens, who/what matters, the emotion, how important it is) into a
// continuous, collision-free, composed camera. Decisions are rule-based and explained (every shot carries `why`):
//   beat kind + subject kind + emotion -> ordered preset candidates -> each candidate is built, scored (composition in
//   9:16, line of sight to the subject through the set, clearance) and checked against variety rules (no preset three
//   times in a row, the 180-degree side is kept) -> best candidate wins.
// Evaluation: consecutive shots inside one scene BLEND (position lerp, aim slerp, focal in log space, focus in dioptres,
// with an eased weight over a transition window sized from the distance the camera must travel), so there are no cuts.
// A change of scene is the established opacity DISSOLVE (two layers). Finally the path is pushed out of obstacles with a
// smooth falloff and low-pass filtered (deterministic Gaussian), so the result is smooth and frame-pure.
import { add, sub, mul, dist, len, lerp, lerp3, clamp, clamp01, slerpDir, norm, ease, fovFromFocal, type CamState, type V3 } from "./core";
import { composeScore, type Subject } from "./frame";
import { resolve, visibility, subjectPts, type Env } from "./collide";
import { PRESETS, snap, type SubjectDef, type PresetName } from "./presets";
import * as moves from "./moves";
import type { Shot } from "./moves";

export type BeatKind = "establish" | "environment" | "structure" | "introduce" | "object" | "surprise" | "speak" | "action" | "react" | "interact" | "point" | "attention" | "reveal" | "settle";
export type Emotion = "neutral" | "mystery" | "suspense" | "excitement" | "sadness" | "surprise" | "grandeur" | "importance" | "comedy" | "calm";
export type Beat = { f0: number; f1: number; kind: BeatKind; subject: string; secondary?: string; poi?: V3; emotion?: Emotion; importance?: number; preset?: PresetName; scene?: string; note?: string };
export type PlannedShot = { beat: Beat; preset: PresetName; shot: Shot; transition: number; side: 1 | -1; why: string; score: number; visibility: number; dissolve: boolean };
export type Plan = { shots: PlannedShot[]; subjects: Record<string, SubjectDef>; env: Env; smoothSigma: number };

/** which presets suit each beat (in order of preference) */
const CANDIDATES: Record<BeatKind, PresetName[]> = {
  establish: ["environmentalEstablishing", "aerialEnvironmentReveal", "historicalDocumentary"],
  environment: ["environmentalEstablishing", "cinematicOrbit", "historicalDocumentary"],
  structure: ["giantStructureReveal", "epicScaleReveal", "cinematicOrbit"],
  introduce: ["documentaryCinematic", "cinematicOrbit", "emotionalCharacter"],
  object: ["objectDetailReveal", "dramaticCloseup", "documentaryCinematic"],
  surprise: ["dramaticCloseup", "mysteryReveal", "documentaryCinematic"],
  speak: ["documentaryCinematic", "emotionalCharacter", "historicalDocumentary"],
  action: ["smoothFollow", "actionTracking", "cinematicOrbit"],
  react: ["dramaticCloseup", "emotionalCharacter", "documentaryCinematic"],
  interact: ["documentaryCinematic", "cinematicOrbit", "historicalDocumentary"],
  point: ["objectDetailReveal", "documentaryCinematic", "cinematicOrbit"],
  attention: ["documentaryCinematic", "historicalDocumentary", "cinematicOrbit"],
  reveal: ["mysteryReveal", "epicScaleReveal", "objectDetailReveal"],
  settle: ["documentaryCinematic", "emotionalCharacter", "historicalDocumentary"],
};
/** emotion -> preferred presets (moved to the front) and movement intensity (how far / how much the camera moves) */
const EMOTION: Record<Emotion, { prefer: PresetName[]; intensity: number; transition: number; why: string }> = {
  neutral: { prefer: [], intensity: 0.6, transition: 1, why: "neutral beat: restrained coverage" },
  calm: { prefer: ["historicalDocumentary", "documentaryCinematic"], intensity: 0.4, transition: 1.3, why: "calm: slow, stable framing" },
  mystery: { prefer: ["mysteryReveal", "documentaryCinematic"], intensity: 0.7, transition: 1.3, why: "mystery: slow controlled push / foreground reveal" },
  suspense: { prefer: ["mysteryReveal", "emotionalCharacter"], intensity: 0.75, transition: 1.2, why: "suspense: gradual approach, held reveal" },
  excitement: { prefer: ["actionTracking", "cinematicOrbit", "smoothFollow"], intensity: 1, transition: 0.8, why: "excitement: energetic tracking" },
  sadness: { prefer: ["emotionalCharacter", "historicalDocumentary"], intensity: 0.35, transition: 1.5, why: "sadness: restrained, slow" },
  surprise: { prefer: ["dramaticCloseup", "mysteryReveal"], intensity: 0.9, transition: 0.7, why: "surprise: timed push / reveal, no shake" },
  grandeur: { prefer: ["giantStructureReveal", "epicScaleReveal", "aerialEnvironmentReveal"], intensity: 0.85, transition: 1.3, why: "grandeur: low angle, wide, slow crane" },
  importance: { prefer: ["documentaryCinematic", "dramaticCloseup"], intensity: 0.65, transition: 1.1, why: "importance: stable composition, deliberate push" },
  comedy: { prefer: ["documentaryCinematic", "emotionalCharacter"], intensity: 0.45, transition: 0.8, why: "comedy: clean framing, small timed reaction" },
};

export type DirectOpts = { env?: Env; side?: 1 | -1; smoothSigma?: number; minShot?: number };
const sampleFrames = (f0: number, f1: number, n = 6) => Array.from({ length: n }, (_, i) => Math.round(lerp(f0, f1, i / (n - 1))));
/** score a built shot: average composition over its duration, line of sight to the main subject, clearance */
const scoreShot = (shot: Shot, main: SubjectDef, second: SubjectDef | undefined, env: Env, f0: number, f1: number) => {
  let comp = 0, vis = 0, clr = 0; const fr = sampleFrames(f0, f1);
  for (const f of fr) { const s = shot.at(f), fov = fovFromFocal(s.focal), m = snap(main, f), o: Subject[] = second ? [snap(second, f)] : [];
    comp += composeScore(s, fov, m, o).score; vis += visibility(env, s.pos, subjectPts(m.base, m.height), (ob) => ob.id === main.id);
    const p = resolve(env, s.pos); clr += clamp01(1 - dist(p, s.pos) / 1.5); }
  return { comp: comp / fr.length, vis: vis / fr.length, clr: clr / fr.length };
};

/** plan the shots for a list of beats */
export const direct = (beats: Beat[], subjects: Record<string, SubjectDef>, opts: DirectOpts = {}): Plan => {
  const env = opts.env ?? { obstacles: [] }, shots: PlannedShot[] = [], minShot = opts.minShot ?? 36;
  let side: 1 | -1 = opts.side ?? 1, prevScene: string | undefined;
  const merged = beats.filter((b) => b.f1 - b.f0 >= minShot || b.kind === "surprise");   // ignore tiny beats: do not chase every movement
  merged.forEach((b, i) => {
    const main = subjects[b.subject], second = b.secondary ? subjects[b.secondary] : undefined;
    if (!main) throw new Error(`camera director: unknown subject ${b.subject}`);
    const emo = EMOTION[b.emotion ?? "neutral"], imp = clamp(b.importance ?? 0.6, 0, 1), intensity = clamp(emo.intensity * (0.7 + 0.5 * imp), 0.2, 1);
    const sceneChange = prevScene !== undefined && b.scene !== prevScene; if (sceneChange) side = opts.side ?? 1;
    let cands: PresetName[] = b.preset ? [b.preset] : [...new Set([...emo.prefer.filter((p) => CANDIDATES[b.kind].includes(p) || ["grandeur", "excitement"].includes(b.emotion ?? "")), ...CANDIDATES[b.kind]])];
    // big structures always get a scale-aware preset
    if (!b.preset && main.kind === "structure" && main.height > 8 && !["object", "point"].includes(b.kind)) cands = [...new Set(["giantStructureReveal" as PresetName, ...cands])];
    const recent = shots.slice(-2).map((s) => s.preset);
    let best: PlannedShot | undefined;
    for (const [ci, name] of cands.entries()) {
      for (const sd of [side, (-side) as 1 | -1]) {
        if (sd !== side && !["cinematicOrbit", "aerialEnvironmentReveal", "environmentalEstablishing"].includes(name) && !sceneChange) continue;   // 180-degree rule
        const pv = shots.length && !sceneChange ? shots[shots.length - 1] : undefined, pvs = pv?.shot.at(b.f0), mb = main.at(b.f0);
        const prevAz = pvs && sd === side ? Math.atan2(pvs.pos[0] - mb[0], pvs.pos[2] - mb[2]) : undefined;
        const shot = PRESETS[name].build({ f0: b.f0, f1: b.f1, main, second, side: sd, intensity, poi: b.poi, prevAz });
        const s = scoreShot(shot, main, second, env, b.f0, b.f1);
        const repeat = recent.length === 2 && recent.every((r) => r === name) ? 0.35 : recent[recent.length - 1] === name ? 0.08 : 0;
        // continuity: the transition from the previous shot must stay under ~3 m/s and ~35 deg/s at its peak
        const prevShot = shots.length && !sceneChange ? shots[shots.length - 1] : undefined;
        const tr = prevShot ? transitionNeed(prevShot.shot.at(b.f0), shot.at(b.f0)) : { T: 0, travel: 0, turn: 0 };
        const Tbase = PRESETS[name].params.transition * emo.transition, Tmax = Math.min(120, (b.f1 - b.f0) * 0.7, prevShot ? (prevShot.beat.f1 - prevShot.beat.f0) * 0.6 : 999);
        const Treq = Math.max(Tbase, tr.T), feasible = Treq <= Tmax, cont = prevShot ? clamp01(1 - Math.max(0, tr.T - Tbase) / Math.max(1, Tmax)) : 1;
        const total = 0.36 * s.comp + 0.3 * s.vis + 0.08 * s.clr + 0.18 * cont + 0.08 * (1 - ci / cands.length) - repeat - (sd !== side ? 0.05 : 0) - (feasible ? 0 : 0.12);
        if (!best || total > best.score) {
          const T = Math.round(clamp(Treq, 14, Math.max(14, Tmax)));
          best = { beat: b, preset: name, shot, transition: feasible || !prevShot ? T : 20, side: sd, score: total, visibility: s.vis, dissolve: sceneChange || (!!prevShot && !feasible),
            why: `${b.kind}${b.emotion ? ` / ${b.emotion}` : ""} -> ${name} (${PRESETS[name].params.note}); ${emo.why}; composition ${(s.comp * 100).toFixed(0)}%, line of sight ${(s.vis * 100).toFixed(0)}%${prevShot ? `, transition ${tr.travel.toFixed(1)} m / ${(tr.turn * 57.3).toFixed(0)} deg over ${feasible ? T : "a dissolve"} f` : ""}${repeat ? ", variety penalty" : ""}` };
        }
      }
    }
    if (best!.dissolve && !sceneChange && shots.length) {
      // nothing reachable smoothly: try continuing the previous camera position, re-aimed on the new subject (settling)
      const prevShot = shots[shots.length - 1], ps = prevShot.shot.at(b.f0), aimOff: V3 = [0, main.kind === "character" ? main.height * 0.78 : main.height * 0.45, 0];
      const rel = sub(ps.pos, add(main.at(b.f0), aimOff)), o = { az: Math.atan2(rel[0], rel[2]), el: Math.atan2(rel[1], Math.hypot(rel[0], rel[2])), d: len(rel) };
      // keep the intent of the beat: reactions / surprises still get their push-in, settles just breathe
      const pushK = b.kind === "react" || b.kind === "surprise" ? 0.3 : b.kind === "settle" ? 0.04 : 0.08;
      const cont = moves.rig("continue", { f0: b.f0, f1: b.f1, ease: pushK > 0.2 ? "settle" : "cine", focal: ps.focal, fstop: ps.fstop }, { target: (f: number) => add(main.at(f), aimOff), az: o.az, el: o.el, d: [o.d, o.d * (1 - pushK * intensity)], facing: main.kind === "character" ? main.facingAt : undefined });
      const tr = transitionNeed(ps, cont.at(b.f0)), Tmax = Math.min(150, (b.f1 - b.f0) * 0.9, (prevShot.beat.f1 - prevShot.beat.f0) * 0.7);
      if (tr.T <= Tmax) { const s2 = scoreShot(cont, main, second, env, b.f0, b.f1); best = { ...best!, preset: best!.preset, shot: cont, transition: Math.max(14, tr.T), dissolve: false, visibility: s2.vis,
        why: `${b.kind}: no new framing reachable smoothly in time, so the camera keeps its position and re-aims on ${b.subject} (pan ${(tr.turn * 57.3).toFixed(0)} deg over ${Math.max(14, tr.T)} f, ${(pushK * intensity * 100).toFixed(0)} % push)` }; }
    }
    shots.push(best!); side = best!.side; prevScene = b.scene;
    void i;
  });
  return { shots, subjects, env, smoothSigma: opts.smoothSigma ?? 2.5 };
};

// ---------------------------------------------------------------- evaluation
/** blend two camera states (position lerp, aim direction slerp, focal in log space, focus in dioptres) */
export const blendState = (a: CamState, b: CamState, w: number): CamState => {
  const da = sub(a.look, a.pos), db = sub(b.look, b.pos), pos = lerp3(a.pos, b.pos, w), dir = slerpDir(norm(da), norm(db), w), L = lerp(len(da), len(db), w);
  return { pos, look: add(pos, mul(dir, L)), focal: Math.exp(lerp(Math.log(a.focal), Math.log(b.focal), w)), focus: 1 / lerp(1 / Math.max(0.1, a.focus), 1 / Math.max(0.1, b.focus), w), fstop: lerp(a.fstop, b.fstop, w), roll: lerp(a.roll, b.roll, w) };
};
/** frames a camera transition needs so its peak speed stays <= vMax (m/s) and peak turn rate <= wMax (rad/s) with the
 *  "smoother" blend (peak rate = 1.875 x average) */
export const transitionNeed = (a: CamState, b: CamState, vMax = 3, wMax = 0.8, fps = 30, zoomMax = 0.022) => {
  const travel = dist(a.pos, b.pos), turn = Math.acos(clamp(dot3(norm(sub(a.look, a.pos)), norm(sub(b.look, b.pos))), -1, 1)), zoom = Math.abs(Math.log(b.focal / a.focal));
  return { travel, turn, T: Math.ceil(Math.max(((1.875 * travel) / vMax) * fps, ((1.875 * turn) / wMax) * fps, (1.875 * zoom) / zoomMax)) };
};
const dot3 = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** continuous segments of a plan: shots between dissolves */
const segments = (plan: Plan) => { const segs: PlannedShot[][] = []; for (const s of plan.shots) { if (!segs.length || s.dissolve) segs.push([]); segs[segs.length - 1].push(s); } return segs; };
const segmentAt = (plan: Plan, f: number) => { const segs = segments(plan); let k = 0; for (let i = 0; i < segs.length; i++) if (segs[i][0].beat.f0 <= f) k = i; return segs[k]; };
/** the raw (unfiltered) camera of one continuous segment at frame f */
const rawAt = (plan: Plan, list: PlannedShot[], f: number): CamState => {
  let i = list.findIndex((s, k) => f < (list[k + 1]?.beat.f0 ?? Infinity)); if (i < 0) i = list.length - 1;
  const cur = list[i], prev = list[i - 1];
  let st = cur.shot.at(f);
  if (prev) { const T = cur.transition, t0 = cur.beat.f0 - T * 0.35, w = ease("smoother", (f - t0) / T); if (w < 1) st = blendState(prev.shot.at(f), st, w); }
  // look ahead: blend into the NEXT shot early by the same amount so the transition is centred on the boundary
  const nxt = list[i + 1]; if (nxt) { const T = nxt.transition, t0 = nxt.beat.f0 - T * 0.35, w = ease("smoother", (f - t0) / T); if (w > 0) st = blendState(st, nxt.shot.at(f), w); }
  return { ...st, pos: resolve(plan.env, st.pos) };
};
/** camera of one segment at frame f: raw + deterministic Gaussian low-pass (jitter reduction) on position, aim and lens */
const evalSeg = (plan: Plan, list: PlannedShot[], f: number): CamState => {
  const sg = plan.smoothSigma; if (sg <= 0) return rawAt(plan, list, f);
  const R = Math.ceil(sg * 2.5); let W = 0; const acc = { p: [0, 0, 0] as V3, l: [0, 0, 0] as V3, fl: 0, fo: 0, fs: 0, r: 0 };
  for (let k = -R; k <= R; k++) { const w = Math.exp(-((k / sg) ** 2) / 2), s = rawAt(plan, list, f + k); W += w;
    acc.p = add(acc.p, mul(s.pos, w)); acc.l = add(acc.l, mul(s.look, w)); acc.fl += Math.log(s.focal) * w; acc.fo += w / Math.max(0.1, s.focus); acc.fs += s.fstop * w; acc.r += s.roll * w; }
  return { pos: mul(acc.p, 1 / W), look: mul(acc.l, 1 / W), focal: Math.exp(acc.fl / W), focus: W / acc.fo, fstop: acc.fs / W, roll: acc.r / W };
};
/** the camera at frame f (the segment that owns frame f; during a dissolve use `layers`) */
export const evaluate = (plan: Plan, f: number): CamState => evalSeg(plan, segmentAt(plan, f), f);
/** layered evaluation: outside dissolves one camera; during a dissolve two cameras (outgoing + incoming segment), the
 *  incoming one drawn on top with an eased opacity - the established TwistFrame opacity-dissolve transition */
export const layers = (plan: Plan, f: number, dissolveFrames = 24): { scene?: string; cam: CamState; opacity: number }[] => {
  const segs = segments(plan), k = segs.findIndex((sg, i) => i > 0 && Math.abs(f - sg[0].beat.f0) < dissolveFrames / 2);
  if (k < 0) { const sg = segmentAt(plan, f); return [{ scene: sg[0].beat.scene, cam: evalSeg(plan, sg, f), opacity: 1 }]; }
  const inc = segs[k], out = segs[k - 1], w = ease("sine", (f - (inc[0].beat.f0 - dissolveFrames / 2)) / dissolveFrames);
  return [{ scene: out[0].beat.scene, cam: evalSeg(plan, out, f), opacity: 1 }, { scene: inc[0].beat.scene, cam: evalSeg(plan, inc, f), opacity: w }];
};
/** each continuous camera segment (between dissolves) as its own camera function + frame range (QC, path tools) */
export const segmentCams = (plan: Plan, dissolveFrames = 24) => segments(plan).map((sg, i, all) => ({ f0: Math.max(0, sg[0].beat.f0 - (i ? dissolveFrames / 2 : 0)), f1: sg[sg.length - 1].beat.f1 - 1 + (i < all.length - 1 ? dissolveFrames / 2 : 0), shots: sg, at: (f: number) => evalSeg(plan, sg, f) }));
/** a human-readable shot list (the director's reasoning) */
export const shotList = (plan: Plan) => plan.shots.map((s, i) => `${String(i + 1).padStart(2)}  f${s.beat.f0}-${s.beat.f1}  ${s.beat.subject}${s.beat.secondary ? `+${s.beat.secondary}` : ""}  ${s.preset}  T=${s.transition}${s.dissolve ? " (dissolve)" : ""}  side ${s.side > 0 ? "R" : "L"}\n     ${s.why}`).join("\n");
export { lerp, clamp };
