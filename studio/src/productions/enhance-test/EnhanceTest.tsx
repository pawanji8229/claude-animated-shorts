// Integration test scene for the optional enhancement modules (experimental/twistframe-all-repos). 5 s, 150 frames.
// Everything visual is the APPROVED TwistFrame system (Station 6 set, Centennial bulb, odo5 cards with face glow,
// faceTrack cringe acting, camPath camera, Post grade); the only new ingredient is rigid-body motion baked offline
// with Rapier (tools/tf-ext/bake-physics.mjs) and played back as a pure function of the frame.
// Story beat: a firefighter strides past and clips a cluster of traffic cones; they topple and roll; the hero's face
// goes from content to huge shock to full cringe.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useTexReady } from "../short3/tex";
import { Kit, KitMesh, once } from "../short3/kit";
import { camPath } from "../london-bridge/common";
import { pose5, REST_L, REST_R } from "../../char/odo5";
import { faceTrack, withFace } from "../short3/expr";
import { CentSet } from "../centennial/Set";
import { MOODS } from "../centennial/Film";
import { Station6, RollingLadder, S6_BULB, S6_DROP } from "../centennial/station6";
import { CentennialLight } from "../centennial/bulb";
import { Apparatus } from "../centennial/vehicles";
import { cm } from "../centennial/mats";
import { HERO, FIRE_MOD_GEAR, Toon, type Placed } from "../centennial/chars";
import { bakedPose, type BakedPhysics } from "../../lib/enhance/baked";
import baked from "./physics.baked.json";
import type { V3 } from "../../lib/math";

export const ENHANCE_TEST_FRAMES = 150;
const BAKE = baked as unknown as BakedPhysics;
const CONES = Object.keys(BAKE.bodies);

/** traffic cone: square rubber base, orange cone with two retro-reflective white bands. Collider centre = cone mid-height. */
const coneKit = () => once("etCone", () => { const M = cm(), k = new Kit(), orange = new THREE.MeshStandardMaterial({ color: "#f05a12", roughness: 0.55 });
  const h = 0.54, y0 = -h / 2;   // local origin at the collider centre (half height 0.27)
  k.box(M.rubber, [0.36, 0.035, 0.36], [0, y0 + 0.0175, 0], [0, 0, 0], { ink: 0.5 });
  k.lathe(orange, [[0.0, 0.0], [0.17, 0.0], [0.155, 0.03], [0.03, h], [0.0, h]], [0, y0 + 0.035, 0], 28, [0, 0, 0], { ink: 0.6 });
  for (const [a, b] of [[0.28, 0.34], [0.4, 0.45]] as [number, number][]) k.lathe(M.white, [[0.031 + 0.125 * (1 - a / 0.54) - 0.001 + 0.004, a * 0.995], [0.031 + 0.125 * (1 - b / 0.54) + 0.004, b * 0.995]].map(([r, y]) => [r, y] as [number, number]), [0, y0 + 0.035, 0], 28, [0, 0, 0], { ink: false });
  return k; });

const cam = (() => { const p = camPath([{ f: -10, pos: [-0.35, 1.7, -0.9], look: [1.2, 1.0, -5.7], fov: 50 }, { f: 70, pos: [-0.05, 1.6, -1.45], look: [1.25, 0.9, -5.75], fov: 48 }, { f: 160, pos: [0.25, 1.52, -1.95], look: [1.3, 0.85, -5.8], fov: 46 }], 10);
  return (f: number) => { const c = p(f); return { pos: c.pos, look: c.look, fov: c.fov, dof: 0.1, focus: Math.hypot(c.pos[0] - 1.2, c.pos[1] - 1.0, c.pos[2] + 5.6) }; }; })();
const heroFace = faceTrack([[0, "content"], [44, "oneBrowUp"], [55, "hugeShock"], [72, "cringe"], [104, "uncomfyGrin"], [132, "awkwardSmile"]], 5);
const blink = (f: number, s: number) => ((f + s * 37) % (97 + s * 11)) < 3;
/** firefighter strides past along z = -5.05; gait from distance travelled (no foot slide) */
const walkX = (f: number) => -2.6 + Math.max(0, Math.min(f, 118)) * 0.05;
const fighter = (f: number): Placed => { const x = walkX(f), walking = f < 118 ? 1 : 0;
  const face = faceTrack([[0, "focused"], [56, "doubleTake"], [80, "embarrassed"], [118, "nervousLaugh"]], 5)(f);
  return { pose: withFace(pose5({ costume: FIRE_MOD_GEAR, view: walking ? "side" : "front", gait: (x + 2.6) / 0.7, walk: walking, stride: 0.7, lean: 0.05 * walking, blink: blink(f, 9), breathe: f * 0.09 }), face, f, 9),
    pos: [x, 0, -4.95], h: 1.66, halo: 0.1, contact: 0.6, flip: walking > 0 }; };
const hero = (f: number): Placed => ({ pose: withFace(pose5({ costume: HERO, armL: REST_L, armR: f > 58 && f < 100 ? { hand: [40, -40], bend: 1, shape: "open", rot: 2.4, elbow: [110, 30] } : REST_R, blink: blink(f, 1), breathe: f * 0.09 }), heroFace(f), f, 1),
  pos: [1.3, 0, -6.45], h: 1.55, halo: 0.1, contact: 0.6 });

export const EnhanceTest: React.FC = () => {
  const f = useCurrentFrame(), ready = useTexReady();
  if (!ready) return <AbsoluteFill style={{ backgroundColor: "#1c2638" }} />;
  const c = cam(f);
  return <CentSet c={c} m={MOODS.dusk6} f={f} world={({ hi, cam: cp }) => <>
    <Station6 highbay={0} doors={[0.04, 0.04]} />
    <CentennialLight p={S6_BULB} drop={S6_DROP} glow={1} />
    <RollingLadder p={[6.4, 0, -12.6] as V3} ry={0} />
    <group position={[3.9, 0, -7.4]} rotation={[0, -Math.PI / 2, 0]}><Apparatus type="mod" /></group>
    {CONES.map((id) => { const p = bakedPose(BAKE, id, f); return <group key={id} position={p.pos} quaternion={new THREE.Quaternion(...p.quat)}><KitMesh kit={coneKit()} /></group>; })}
    <Toon p={fighter(f)} cam={cp} hi={hi} />
    <Toon p={hero(f)} cam={cp} hi={hi} />
  </>} />;
};
