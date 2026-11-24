// Camera 2.0 laboratory renders.
//   C2CamMoves  : 8 movement / reveal demos (120 f each) on the real construction-site set, each a single-preset plan
//   C2CamAngles : 16 stills - shot sizes, vertical + horizontal angles, OTS / POV, dutch, lenses (24-85 mm), apertures,
//                 with the 9:16 Shorts safe area + thirds overlay
//   C2CamOld    : the old keyframe camera (cinecam + camPath) for the same beats as C2CamNew (old-vs-new comparison)
//   C2CamNew    : the Camera 2.0 director for those beats
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { labSet, LAB_HERO } from "./labSet";
import { World2, worldPracticals } from "../world/World2";
import { Stage2 } from "../light/Stage2";
import { LIGHT_PRESETS } from "../light/presets";
import { Toon2Lit } from "../light/Toon2Lit";
import { evaluate as evalChar } from "../../../char/tf2/planner";
import { TF2_HERO } from "../../../char/tf2/costume";
import * as C from "../cam";
import { camPath } from "../../../productions/london-bridge/common";
import * as OLD from "../../enhance/cinecam";

const SEG = 90;
export const MOVE_DEMOS: { title: string; beat: C.Beat }[] = [
  { title: "Giant structure reveal (low, tilt up the frame)", beat: { f0: 0, f1: SEG, kind: "structure", subject: "frame", preset: "giantStructureReveal", emotion: "grandeur", importance: 0.9 } },
  { title: "Object detail -> pull-back reveal", beat: { f0: 0, f1: SEG, kind: "object", subject: "mixer", preset: "objectDetailReveal", importance: 0.8 } },
  { title: "Foreground reveal + rack focus (mystery)", beat: { f0: 0, f1: SEG, kind: "reveal", subject: "hero", preset: "mysteryReveal", emotion: "mystery" } },
  { title: "Side-tracking the walk (prediction)", beat: { f0: 40, f1: 40 + SEG, kind: "action", subject: "hero", preset: "actionTracking" } },
  { title: "Follow camera (lag + lead room)", beat: { f0: 40, f1: 40 + SEG, kind: "action", subject: "hero", preset: "smoothFollow" } },
  { title: "Cinematic partial orbit", beat: { f0: 0, f1: SEG, kind: "environment", subject: "excavator", preset: "cinematicOrbit" } },
  { title: "Epic scale reveal: character -> structure", beat: { f0: 0, f1: SEG, kind: "structure", subject: "hero", secondary: "crane", preset: "epicScaleReveal", emotion: "grandeur" } },
  { title: "Dramatic push-in on a reaction", beat: { f0: 230, f1: 230 + SEG, kind: "react", subject: "hero", preset: "dramaticCloseup", emotion: "surprise" } },
];
export const MOVES_FRAMES = MOVE_DEMOS.length * SEG;
const Label: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => <div style={{ position: "absolute", top: "4%", left: 0, right: 0, textAlign: "center", fontFamily: "sans-serif", color: "white", textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}><div style={{ fontSize: 26, fontWeight: 700 }}>{text}</div>{sub && <div style={{ fontSize: 16, opacity: 0.9 }}>{sub}</div>}</div>;
/** camera samples of a whole shot (every 10 f): World 2.0 decides LOD + visibility ONCE per shot from these */
const shotSamples = (fn: (f: number) => { pos: C.V3; look: C.V3; focal: number }, f0: number, f1: number) => Array.from({ length: Math.ceil((f1 - f0) / 10) + 1 }, (_, i) => { const c = fn(Math.min(f1, f0 + i * 10)); return { pos: c.pos, look: c.look, fov: C.fovFromFocal(c.focal) }; });
const SetView: React.FC<{ cam: C.RenderCam; f: number; hf: number; focus?: C.V3; shot?: { pos: C.V3; look: C.V3; fov: number }[] }> = ({ cam, f, hf, focus, shot }) => {
  const { recipe, world } = labSet(), spec = LIGHT_PRESETS.constructionSite, light = { ...spec, practicals: worldPracticals(world, spec) };
  const fr = evalChar(LAB_HERO, hf, cam.pos);
  return <Stage2 cam={cam} light={light} f={f} quality="LOW" focus={focus ?? fr.pos} shadowSize={28} world={({ hi, light: l }) => <>
    <World2 recipe={recipe} world={world} f={f} cam={cam.pos} shot={shot ?? [{ pos: cam.pos, look: cam.look, fov: cam.fov }]} light={l} hi={hi} walkers={false} />
    <Toon2Lit p={{ fr, costume: TF2_HERO, t: hf }} cam={cam.pos} hi={hi} light={l} />
  </>} />;
};
export const CamMoves: React.FC = () => {
  const f = useCurrentFrame(), k = Math.floor(f / SEG), local = f % SEG, demo = MOVE_DEMOS[k], { subjects, obstacles } = labSet();
  const plan = useMemo(() => C.direct([demo.beat], subjects, { env: { obstacles, ground: () => 0, clearance: 0.4 }, minShot: 10 }), [k]);
  const shot = useMemo(() => shotSamples((x) => C.evaluate(plan, x), demo.beat.f0, demo.beat.f0 + SEG), [k]);
  const hf = demo.beat.f0 + local, st = C.evaluate(plan, hf), cam = C.toRender(st);
  return <AbsoluteFill><SetView cam={cam} f={hf} hf={hf} shot={shot} /><Label text={demo.title} sub={`${plan.shots[0].preset} | ${st.focal.toFixed(0)} mm f/${st.fstop.toFixed(1)}`} /></AbsoluteFill>;
};
// ---------------------------------------------------------------- angles / lenses stills
const hero0 = (): C.Subject => { const { subjects } = labSet(), s = subjects.hero; return { id: "hero", base: s.at(205), height: 1.55, facing: s.facingAt!(205), kind: "character", width: 0.55 }; };
export const ANGLE_STILLS: { title: string; spec: Partial<C.FrameSpec> & { size: C.ShotSize }; fstop?: number }[] = [
  { title: "Extreme wide (EWS)", spec: { size: "EWS", v: 0.25, h: "threeQuarter", focal: 24 } }, { title: "Wide (WS)", spec: { size: "WS", v: 0.12, h: "threeQuarter", focal: 24 } }, { title: "Full body", spec: { size: "FULL", v: "eye", h: "threeQuarter", focal: 32 } },
  { title: "Medium wide", spec: { size: "MWS", v: "eye", h: "threeQuarter", focal: 35 } }, { title: "Medium", spec: { size: "MS", v: "eye", h: "threeQuarter", focal: 40 } }, { title: "Medium close-up", spec: { size: "MCU", v: "eye", h: "threeQuarter", focal: 50 } },
  { title: "Close-up", spec: { size: "CU", v: "eye", h: "threeQuarter", focal: 60 }, fstop: 2.8 }, { title: "Extreme close-up", spec: { size: "ECU", v: "eye", h: "front", focal: 85 }, fstop: 2.8 }, { title: "Low angle", spec: { size: "MWS", v: "low", h: "threeQuarter", focal: 28 } },
  { title: "High angle", spec: { size: "MWS", v: "high", h: "threeQuarter", focal: 35 } }, { title: "Bird's-eye", spec: { size: "WS", v: "bird", h: "front", focal: 24 } }, { title: "Worm's-eye", spec: { size: "FULL", v: "worm", h: "threeQuarter", focal: 20 } },
  { title: "Profile", spec: { size: "MS", v: "eye", h: "profile", focal: 45 } }, { title: "Dutch angle (sparingly)", spec: { size: "MS", v: "eye", h: "threeQuarter", focal: 35, dutch: 0.14 } },
  { title: "24 mm vs ... (wide lens)", spec: { size: "MS", v: "eye", h: "threeQuarter", focal: 24 } }, { title: "... 85 mm (telephoto) same size", spec: { size: "MS", v: "eye", h: "threeQuarter", focal: 85 }, fstop: 2.8 },
];
export const ANGLE_FRAMES = ANGLE_STILLS.length;
const Guides: React.FC = () => <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
  <rect x={7} y={12} width={86} height={66} fill="none" stroke="rgba(80,255,140,0.8)" strokeWidth={0.4} strokeDasharray="1.5 1" />
  {[33.3, 66.7].map((v) => <line key={v} x1={v} x2={v} y1={0} y2={100} stroke="rgba(255,255,255,0.45)" strokeWidth={0.25} />)}{[33.3, 66.7].map((v) => <line key={v} y1={v} y2={v} x1={0} x2={100} stroke="rgba(255,255,255,0.45)" strokeWidth={0.25} />)}
  <rect x={0} y={78} width={100} height={22} fill="rgba(0,0,0,0.18)" /><rect x={0} y={0} width={100} height={12} fill="rgba(0,0,0,0.18)" /></svg>;
export const CamAngles: React.FC = () => {
  const f = useCurrentFrame(), a = ANGLE_STILLS[f % ANGLE_STILLS.length], s = hero0(), spec: C.FrameSpec = { v: "eye", h: "threeQuarter", focal: 35, side: 1, ...a.spec } as C.FrameSpec;
  const fr = C.solveFrame(s, spec), d = Math.hypot(...C.sub(fr.anchor, fr.pos)), cam = C.toRender({ pos: fr.pos, look: fr.look, focal: fr.focal, focus: d, fstop: a.fstop ?? 5.6, roll: fr.roll });
  return <AbsoluteFill><SetView cam={cam} f={205} hf={205} focus={s.base} /><Guides /><Label text={a.title} sub={`${spec.focal} mm f/${a.fstop ?? 5.6} | camera ${d.toFixed(1)} m | safe area (green) + thirds`} /></AbsoluteFill>;
};
// ---------------------------------------------------------------- old vs new (same story beats)
export const CMP_BEATS: C.Beat[] = [{ f0: 0, f1: 200, kind: "action", subject: "hero" }, { f0: 200, f1: 330, kind: "react", subject: "hero", emotion: "surprise", importance: 0.85 }, { f0: 330, f1: 420, kind: "action", subject: "hero" }];
export const CMP_FRAMES = 420;
const oldCam = (() => { let fn: ((f: number) => ReturnType<ReturnType<typeof camPath>>) | null = null; return () => {
  if (fn) return fn; const { subjects } = labSet(), h = subjects.hero.at, p = (f: number): C.V3 => { const q = h(f); return [q[0], 1.2, q[2]]; };
  // what a hand-keyed production would do: keyframes every ~2 s around the walker, a quick push for the reaction
  const keys = [...OLD.truck(0, 200, C.add(p(0), [3.5, 0.6, 4]), p(100), 5).map((k) => ({ ...k, look: p(k.f) })), ...OLD.dolly(200, 330, C.add(p(210), [2.2, 0.5, 2.6]), C.add(p(210), [0, 0.35, 0]), -1.4).slice(1), ...OLD.truck(330, 420, C.add(p(330), [3, 0.6, 3.5]), p(380), -3).slice(1).map((k) => ({ ...k, look: p(k.f) }))];
  fn = camPath(keys.map((k) => ({ ...k, fov: 45 })) as never, 6); return fn; }; })();
export const CamOld: React.FC = () => { const f = useCurrentFrame(), c = oldCam()(f); const cam = C.toRender({ pos: c.pos, look: c.look, focal: C.focalFromFov(c.fov), focus: c.focus, fstop: 5.6, roll: 0 });
  const shot = useMemo(() => shotSamples((x) => { const o = oldCam()(x); return { pos: o.pos, look: o.look, focal: C.focalFromFov(o.fov) }; }, 0, CMP_FRAMES), []);
  return <AbsoluteFill><SetView cam={cam} f={f} hf={f} shot={shot} /><Label text="OLD: keyframed camera" sub="cinecam keys + camPath smoothing" /></AbsoluteFill>; };
export const CamNew: React.FC = () => { const f = useCurrentFrame(), { subjects, obstacles } = labSet();
  const plan = useMemo(() => C.direct(CMP_BEATS, subjects, { env: { obstacles, ground: () => 0, clearance: 0.4 } }), []); const cam = C.toRender(C.evaluate(plan, f));
  const shot = useMemo(() => shotSamples((x) => C.evaluate(plan, x), 0, CMP_FRAMES), [plan]);
  return <AbsoluteFill><SetView cam={cam} f={f} hf={f} shot={shot} /><Label text="NEW: Camera 2.0 director" sub={plan.shots.map((s) => s.preset).join(" > ")} /></AbsoluteFill>; };
export { oldCam };
