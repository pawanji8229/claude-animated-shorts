// Smoke test for Stage2 / Light2 / Post2: one frame per lighting preset on a tiny set (shader compile + sanity).
import React from "react";
import { useCurrentFrame } from "remotion";
import { Stage2 } from "../light/Stage2";
import { LIGHT_PRESETS, type Quality } from "../light/presets";
import { surfaceMaterial } from "../light/materials";
import { ContactShadow } from "../light/Light2";
import { Toon2Lit } from "../light/Toon2Lit";
import { evaluate as evalChar } from "../../../char/tf2/planner";
import { TF2_HERO } from "../../../char/tf2/costume";
import { solveFrame, toRender, type V3 } from "../cam";
import { HERO_SCRIPT } from "./story";

const NAMES = Object.keys(LIGHT_PRESETS);
export const SMOKE_FRAMES = NAMES.length;
export const C2Smoke: React.FC<{ quality?: Quality }> = ({ quality = "HIGH" }) => {
  const f = useCurrentFrame(), spec = LIGHT_PRESETS[NAMES[f % NAMES.length]];
  const fr = solveFrame({ id: "h", base: [0, 0, 0], height: 1.55, facing: 0.5, kind: "character" }, { size: "FULL", v: 0.05, h: "threeQuarter", focal: 28 });
  const cam = toRender({ pos: [fr.pos[0] * 1.9, 1.4, fr.pos[2] * 1.9] as V3, look: [0, 1.4, -1.5], focal: 26, focus: 4, fstop: 5.6, roll: 0 });
  const chf = evalChar({ ...HERO_SCRIPT, start: [0, 0], facing: 0.5, actions: [] }, 60, cam.pos);
  return <Stage2 cam={cam} light={spec} f={f} quality={quality} world={({ hi, light }) => <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={surfaceMaterial("concrete", { wet: light.wet })}><planeGeometry args={[80, 80]} /></mesh>
    <mesh position={[-3, 2.5, -4]} castShadow receiveShadow material={surfaceMaterial("brick")}><boxGeometry args={[4, 5, 3]} /></mesh>
    <mesh position={[2.6, 0.5, -1.5]} castShadow receiveShadow material={surfaceMaterial("paintedMetal")}><boxGeometry args={[1, 1, 1]} /></mesh>
    <ContactShadow at={[2.6, 0, -1.5]} w={1} d={1} />
    <mesh position={[1.4, 0.35, 1]} castShadow receiveShadow material={surfaceMaterial("metal")}><sphereGeometry args={[0.35, 24, 16]} /></mesh>
    <mesh position={[0, 6, -18]} castShadow receiveShadow material={surfaceMaterial("stone")}><boxGeometry args={[6, 12, 6]} /></mesh>
    <Toon2Lit p={{ fr: chf, costume: TF2_HERO, t: f }} cam={cam.pos} hi={hi} light={light} />
  </>} />;
};
