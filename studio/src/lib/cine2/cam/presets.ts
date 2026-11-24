// Camera 2.0 presets: reusable shot recipes with real parameters and movement logic. Each preset turns a story beat
// (subject + time range + emotion) into a concrete Shot by solving a 9:16 framing for its start (and end) and choosing a
// move from the library. `params` are the documented knobs; `build` is the logic.
import { sub, add, azel, lerp3, type V3 } from "./core";
import { solveFrame, H_ANGLES, type FrameSpec, type Subject, type ShotSize, type VAngle, type HAngle } from "./frame";
import * as M from "./moves";

export type SubjectDef = Omit<Subject, "base" | "facing"> & { at: (f: number) => V3; facingAt?: (f: number) => number };
export const snap = (s: SubjectDef, f: number): Subject => ({ ...s, base: s.at(f), facing: s.facingAt?.(f) });
export type BuildCtx = { f0: number; f1: number; main: SubjectDef; second?: SubjectDef; side: 1 | -1; intensity: number; /** optional point of interest (pointing target, detail) */ poi?: V3;
  /** world azimuth (from the subject) of the previous camera when it covered the same subject: angle continuity */
  prevAz?: number };
export type PresetParams = { size: ShotSize; endSize?: ShotSize; v: VAngle | number; h: HAngle | number; focal: number; endFocal?: number; fstop: number; ease: M.Common["ease"]; handheld: number; transition: number; note: string };
export type Preset = { name: string; params: PresetParams; build: (c: BuildCtx) => M.Shot };

/** rig parameters (target offset + spherical camera offset) that reproduce a solved framing on a moving subject */
const rigFrom = (s: SubjectDef, f: number, spec: FrameSpec) => {
  const fr = solveFrame(snap(s, f), spec), base = s.at(f), lookOff = sub(fr.look, base), o = azel(sub(fr.pos, fr.look));
  return { lookOff, az: o.az, el: o.el, d: o.d, focal: fr.focal, pos: fr.pos, look: fr.look };
};
/** characters: framing follows their (smoothed) facing changes; objects / structures: fixed azimuth */
const fac = (c: BuildCtx) => (c.main.kind === "character" || !c.main.kind ? c.main.facingAt : undefined);
const movingTarget = (s: SubjectDef, off: V3) => (f: number) => add(s.at(f), off);
/** framing spec of a preset; with angle continuity the horizontal angle starts where the previous camera was (within
 *  70 degrees of the preset's own angle), so consecutive shots of one subject change size / move, not the whole view */
const spec = (p: PresetParams, c: BuildCtx, over: Partial<FrameSpec> = {}): FrameSpec => {
  // shot sizes are defined on the human figure: a vehicle / structure / object is never cropped tighter than "the whole
  // thing" by a preset that was written for people (an MWS orbit of a 6.5 m excavator would put the lens inside it)
  const tight = ["MWS", "MS", "MCU", "CU", "ECU"].includes(p.size) && c.main.kind !== "character" && (c.main.width ?? 1) > 2.5;
  const base: FrameSpec = { size: tight ? "FULL" : p.size, v: p.v, h: p.h, side: c.side, focal: p.focal, ...over };
  if (c.prevAz === undefined) return base;
  const fc = c.main.facingAt?.(c.f0) ?? 0, want = fc + (typeof base.h === "number" ? base.h : H_ANGLES[base.h]) * (base.side ?? 1), d = Math.atan2(Math.sin(c.prevAz - want), Math.cos(c.prevAz - want));
  const k = Math.max(-1.2, Math.min(1.2, d)); return { ...base, h: want + k - fc, side: 1 };
};
const P = (p: PresetParams, build: (c: BuildCtx, p: PresetParams) => M.Shot) => ({ params: p, build: (c: BuildCtx) => build(c, p) });

export const PRESETS: Record<string, Preset> = Object.fromEntries(Object.entries({
  documentaryCinematic: P({ size: "MS", v: "eye", h: "threeQuarter", focal: 35, fstop: 4, ease: "cine", handheld: 0.004, transition: 24, note: "the default documentary coverage: three-quarter medium, a 10 % push, a breathing operator" },
    (c, p) => { const r = rigFrom(c.main, c.f0, spec(p, c)); return M.rig("documentaryCinematic", { f0: c.f0, f1: c.f1, ease: p.ease, focal: p.focal, fstop: p.fstop, handheld: p.handheld }, { target: movingTarget(c.main, r.lookOff), az: r.az, el: r.el, d: [r.d, r.d * (1 - 0.1 * c.intensity)], facing: fac(c) }); }),
  epicScaleReveal: P({ size: "FULL", endSize: "WS", v: "low", h: "threeQuarter", focal: 28, endFocal: 22, fstop: 8, ease: "cine", handheld: 0, transition: 30, note: "start on the character at the foot of a giant subject, crane up and back until the structure dwarfs them (scale contrast)" },
    (c, p) => { const big = c.second ?? c.main, a = rigFrom(c.main, c.f0, spec(p, c)), b = rigFrom(big, c.f1, { ...spec(p, c), size: p.endSize!, v: -0.18, focal: p.endFocal! });
      return M.approach({ f0: c.f0, f1: c.f1, ease: p.ease, focal: [p.focal, p.endFocal!], fstop: p.fstop }, a.pos, b.pos, (f: number) => lerp3(add(c.main.at(f), a.lookOff), add(big.at(f), b.lookOff), M.progress({ f0: c.f0, ease: "sine" }, c.f1, f))); }),
  historicalDocumentary: P({ size: "MWS", v: "eye", h: "threeQuarter", focal: 40, fstop: 5.6, ease: "linear", handheld: 0, transition: 30, note: "measured lateral parallax past the subject - the 'museum' move, steady and unhurried" },
    (c, p) => { const r = rigFrom(c.main, c.f0, spec(p, c)); return M.parallax({ f0: c.f0, f1: c.f1, ease: "sine", focal: p.focal, fstop: p.fstop }, r.pos, movingTarget(c.main, r.lookOff), -c.side * r.d * 0.35 * c.intensity); }),
  mysteryReveal: P({ size: "MS", v: "low", h: "threeQuarter", focal: 40, fstop: 2.8, ease: "cine", handheld: 0, transition: 36, note: "slow push from behind a foreground shape; focus racks from the foreground to the subject" },
    (c, p) => { const r = rigFrom(c.main, c.f0, spec(p, c)), fg = lerp3(r.pos, r.look, 0.22); return M.fgReveal({ f0: c.f0, f1: c.f1, ease: p.ease, focal: p.focal, fstop: p.fstop, handheld: p.handheld }, fg, movingTarget(c.main, r.lookOff), c.side * 1.2 * c.intensity, r.d * 0.5); }),
  dramaticCloseup: P({ size: "MCU", endSize: "CU", v: "eye", h: "threeQuarter", focal: 50, endFocal: 58, fstop: 2.8, ease: "settle", handheld: 0, transition: 18, note: "decisive push from medium close-up to close-up; fast start, long settle - impact without shake" },
    (c, p) => { const r = rigFrom(c.main, c.f0, spec(p, c)); return M.dramaticPush({ f0: c.f0, f1: c.f1, focal: [p.focal, p.endFocal!], fstop: p.fstop, intensity: 0.55 * c.intensity }, movingTarget(c.main, r.lookOff), r.az, r.el, r.d, fac(c)); }),
  giantStructureReveal: P({ size: "WS", v: "worm", h: "front", focal: 22, fstop: 8, ease: "cine", handheld: 0, transition: 36, note: "camera low near the base, slow approach while the aim tilts up the facade to the top (communicates height)" },
    (c, p) => { const s = c.main, b = s.at(c.f0), facing = s.facingAt?.(c.f0) ?? 0, d = Math.max(8, s.height * 0.62), low: V3 = add(b, [Math.sin(facing + 0.25 * c.side) * d, 1.2, Math.cos(facing + 0.25 * c.side) * d]);
      const end: V3 = lerp3(low, [b[0], 1.6, b[2]], 0.25 * c.intensity); return M.approach({ f0: c.f0, f1: c.f1, ease: p.ease, focal: [p.focal, p.focal - 2], fstop: p.fstop }, low, end, (f: number) => lerp3(add(s.at(f), [0, s.height * 0.18, 0]), add(s.at(f), [0, s.height * 0.72, 0]), M.progress({ f0: c.f0, ease: "sine" }, c.f1, f))); }),
  smoothFollow: P({ size: "MWS", v: "eye", h: "threeQuarterBack", focal: 32, fstop: 4, ease: "linear", handheld: 0.003, transition: 24, note: "behind-and-beside follow with lag and prediction: the walker leads the frame" },
    (c, p) => M.follow({ f0: c.f0, f1: c.f1, focal: p.focal, fstop: p.fstop, handheld: p.handheld }, c.main.at, 3.0, 1.45, 0.9 * c.side, c.main.facingAt)),
  cinematicOrbit: P({ size: "MWS", v: 0.12, h: "threeQuarter", focal: 35, fstop: 4, ease: "sine", handheld: 0, transition: 30, note: "a 55-70 degree partial orbit that keeps the subject centred: reveals the subject's shape and the space behind it" },
    (c, p) => { const r = rigFrom(c.main, c.f0, spec(p, c)); return M.orbit({ f0: c.f0, f1: c.f1, ease: p.ease, focal: p.focal, fstop: p.fstop, intensity: c.intensity }, movingTarget(c.main, r.lookOff), r.az, -c.side * 0.17, r.el, r.d, fac(c)); }),
  environmentalEstablishing: P({ size: "EWS", v: 0.22, h: "threeQuarter", focal: 24, fstop: 11, ease: "linear", handheld: 0, transition: 40, note: "very wide and high, slow drift and a slight rise: the world first, the story second" },
    (c, p) => { const r = rigFrom(c.main, c.f0, spec(p, c)); return M.establishing({ f0: c.f0, f1: c.f1, focal: p.focal, fstop: p.fstop }, movingTarget(c.main, r.lookOff), r.az, r.el, r.d, 0.1 * c.intensity); }),
  actionTracking: P({ size: "FULL", v: "eye", h: "profile", focal: 28, fstop: 5.6, ease: "linear", handheld: 0.005, transition: 20, note: "side-tracking alongside the action with prediction (lead room) and wide lens energy" },
    (c, p) => { const fr = rigFrom(c.main, c.f0, spec(p, c)); return M.sideTrack({ f0: c.f0, f1: c.f1, focal: p.focal, fstop: p.fstop, handheld: p.handheld }, c.main.at, c.side * Math.min(5, fr.d), undefined, 1.25, c.main.facingAt); }),
  emotionalCharacter: P({ size: "MCU", v: 0.1, h: "threeQuarter", focal: 50, fstop: 2.8, ease: "cine", handheld: 0.002, transition: 30, note: "slightly high three-quarter MCU, a slow 12 % push and shallow (but capped) focus: intimacy" },
    (c, p) => { const r = rigFrom(c.main, c.f0, spec(p, c)); return M.slowPush({ f0: c.f0, f1: c.f1, focal: p.focal, fstop: p.fstop, handheld: p.handheld, intensity: 0.5 * c.intensity }, movingTarget(c.main, r.lookOff), r.az, r.el, r.d, fac(c)); }),
  objectDetailReveal: P({ size: "CU", endSize: "MWS", v: 0.2, h: "threeQuarter", focal: 50, endFocal: 30, fstop: 4, ease: "cine", handheld: 0, transition: 24, note: "open on the object's detail, pull back and rise until its context and the character are in frame" },
    (c, p) => { const obj = c.second ?? c.main, ob = obj.at(c.f0), detail: V3 = c.poi ?? add(ob, [0, obj.height * 0.6, 0]), whole = lerp3(add(ob, [0, obj.height * 0.5, 0]), add(c.main.at(c.f0), [0, c.main.height * 0.55, 0]), c.second ? 0.4 : 0);
      const az = (c.main.facingAt?.(c.f0) ?? 0) + 0.6 * c.side, d0 = Math.max(0.6, obj.height * 1.1); return M.pullBackReveal({ f0: c.f0, f1: c.f1, focal: [p.focal, p.endFocal!], fstop: p.fstop }, detail, whole, az, [0.15, 0.32], [d0, d0 * 4.5 * c.intensity + d0]); }),
  aerialEnvironmentReveal: P({ size: "EWS", v: 0.5, h: "front", focal: 24, fstop: 11, ease: "sine", handheld: 0, transition: 45, note: "a high flight line toward the subject, descending slightly with a gentle bank; the aim settles on the subject" },
    (c, p) => { const t = c.main.at(c.f0), facing = c.main.facingAt?.(c.f0) ?? 0, R = Math.max(40, c.main.height * 4), a: V3 = add(t, [Math.sin(facing + 0.5 * c.side) * R * 1.6, 0, Math.cos(facing + 0.5 * c.side) * R * 1.6]), b: V3 = add(t, [Math.sin(facing + 0.3 * c.side) * R * 0.8, 0, Math.cos(facing + 0.3 * c.side) * R * 0.8]);
      return M.aerial({ f0: c.f0, f1: c.f1, focal: p.focal, fstop: p.fstop }, a, b, R * 0.45, add(t, [0, c.main.height * 0.4, 0]), 0.03); }),
}).map(([name, v]) => [name, { name, ...v }]));
export type PresetName = keyof typeof PRESETS;
