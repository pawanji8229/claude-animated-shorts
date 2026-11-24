// Integration demo: every 2.0 system together in one continuous 9:16 shot sequence.
//   World 2.0      construction site (STANDARD density, camera-aware placement, machines + birds + smoke)
//   Character 2.0  the TF2 hero walks in, stops, reacts with surprise and points at the frame
//   Camera 2.0     director plan: grandeur establishing on the concrete frame -> beats derived from the TF2 script
//   Lighting 2.0   lighting director: construction site, late afternoon, dust in the air, character readability
//   Audio 2.0      scripts/export-demo-audio.ts + audio2/mix_demo.py build the soundtrack from the same data
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { labSet, LAB_HERO } from "./labSet";
import { World2, worldPracticals } from "../world/World2";
import { Stage2 } from "../light/Stage2";
import { lightScene } from "../light/director";
import { Toon2Lit } from "../light/Toon2Lit";
import { evaluate as evalChar } from "../../../char/tf2/planner";
import { TF2_HERO } from "../../../char/tf2/costume";
import * as C from "../cam";

export const DEMO_FRAMES = 330;
export const demoPlan = (() => { let p: C.Plan | null = null; return () => {
  if (p) return p; const { subjects, obstacles } = labSet();
  const beats: C.Beat[] = [{ f0: 0, f1: 105, kind: "structure", subject: "frame", emotion: "grandeur", importance: 0.9, note: "the site: a frame rising" }, ...C.beatsFromScript(LAB_HERO, 105, DEMO_FRAMES, { minShot: 45 })];
  p = C.direct(beats, subjects, { env: { obstacles, ground: () => 0, clearance: 0.4 } }); return p; }; })();
export const demoLight = () => lightScene({ id: "demo", location: "construction", hour: 17.2, subjectKind: "character", emotion: "curiosity" });
export const Demo: React.FC = () => {
  const f = useCurrentFrame(), plan = demoPlan(), { recipe, world } = labSet(), d = useMemo(() => demoLight(), []);
  const segs = useMemo(() => C.segmentCams(plan), [plan]), shot = useMemo(() => Array.from({ length: Math.ceil(DEMO_FRAMES / 10) + 1 }, (_, i) => { const c = C.evaluate(plan, Math.min(DEMO_FRAMES - 1, i * 10)); return { pos: c.pos, look: c.look, fov: C.fovFromFocal(c.focal) }; }), [plan]);
  const light = { ...d.spec, practicals: worldPracticals(world, d.spec) }; void segs;
  const layers = C.layers(plan, f, 24);
  return <AbsoluteFill>{layers.map((ly, i) => { const cam = C.toRender(ly.cam), fr = evalChar(LAB_HERO, f, cam.pos);
    return <AbsoluteFill key={i} style={{ opacity: ly.opacity }}><Stage2 cam={cam} light={light} f={f} quality="BALANCED" focus={fr.pos} shadowSize={30} world={({ hi, light: l }) => <>
      <World2 recipe={recipe} world={world} f={f} cam={cam.pos} shot={shot} light={l} hi={hi} walkers={false} />
      <Toon2Lit p={{ fr, costume: TF2_HERO, t: f }} cam={cam.pos} hi={hi} light={l} />
    </>} /></AbsoluteFill>; })}</AbsoluteFill>;
};
