// TF2 3D integration test: the new rig as a lit card in a real 3D set (same CentSet lighting/post as the films), with the
// face-glow mask and halo, billboard yaw from the planner, a held parcel that follows the drawn hand, and the approved
// odo5 card standing next to it for an identity comparison (no ears, head overlaps body, same size, same glow).
import React from "react";
import { useCurrentFrame } from "remotion";
import { CentSet, type Mood } from "../../../productions/centennial/Set";
import { Toon } from "../../../productions/centennial/chars";
import { pose5 } from "../../odo5";
import { InkCtx } from "../../../inventor/Workshop";
import { HERO } from "../../../productions/postoffice/chars";
import { evaluate, type Script } from "../planner";
import { Toon2, handWorld2, type Placed2 } from "../Toon2";
import type { V3 } from "../rig";

export const STAGE_FRAMES = 300;
const MOOD: Mood = { bg: "#cdbfa8", sky: "#f2e8d8", ground: "#8a7a62", hemi: 0.9, env: 0.5, sun: { dir: [0.4, 0.8, 0.6], color: "#fff0dc", i: 2.4, size: 6, at: [0, 0, 0] }, exposure: 1.1, warmCool: 0.5 };
const SC: Script = { id: "stage", seed: 11, costume: HERO, start: [-1.6, 0.2], facing: Math.PI / 2,
  actions: [{ kind: "walk", f0: 10, f1: 90, to: [-0.15, 0.2], style: "curious" }, { kind: "turn", f0: 96, f1: 116, face: 0.35 }, { kind: "gesture", f0: 120, f1: 170, g: "wave" },
    { kind: "look", f0: 175, f1: 230, at: [1.2, 1.1, 0] }, { kind: "gesture", f0: 180, f1: 228, g: "point", dir: [0.9, 0.1, 0.3] }, { kind: "head", f0: 240, f1: 280, m: "doubleTilt" }],
  emotions: [{ f: 0, mix: [{ e: "curiosity", level: 2 }] }, { f: 118, mix: [{ e: "happiness", level: 4 }] }, { f: 176, mix: [{ e: "surprise", level: 4 }], ease: 3 }, { f: 236, mix: [{ e: "confusedDisbelief", level: 4 }], ease: 6 }] };
export const TF2Stage3D: React.FC = () => {
  const f = useCurrentFrame(); const cam: V3 = [0.3, 1.25, 4.6], look: V3 = [0.1, 0.85, 0];
  const fr = evaluate(SC, f, cam), p: Placed2 = { fr, costume: HERO, t: f };
  return <CentSet c={{ pos: cam, look, fov: 42, dof: 0.02, focus: 4.5 }} m={MOOD} f={f} world={({ hi }) => <InkCtx.Provider value={hi ? 2.2 : 1.1}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#b8a88e" roughness={0.9} /></mesh>
    <mesh position={[0, 1.5, -2.5]} receiveShadow><boxGeometry args={[12, 3, 0.2]} /><meshStandardMaterial color="#d8cbb4" roughness={0.9} /></mesh>
    <Toon2 p={p} cam={cam} hi={hi} />
    <Toon p={{ pose: pose5({ costume: HERO, mouth: "smile", eyes: "lid", lids: 0.4, breathe: f * 0.09 }), pos: [1.25, 0, -0.4], h: 1.62, halo: 0.1, contact: 0.6 }} cam={cam} hi={hi} />
    {fr.gesture === "point" && <mesh position={handWorld2(p, cam, 1)}><sphereGeometry args={[0.012, 8, 6]} /><meshBasicMaterial color="#ff0000" /></mesh>}
  </InkCtx.Provider>} />;
};
