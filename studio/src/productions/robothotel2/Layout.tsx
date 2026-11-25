// layout probes: where things are inside the big downloaded models (hotel exterior from 4 sides, bedroom from above)
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ToonSet, type Look } from "./ToonSet";
import { useH2Ready, GModel } from "./glb";
import type { V3 } from "../../lib/math";
const L: Look = { bg: "#8fc4ee", sky: "#eef6ff", ground: "#8a7a66", hemi: 0.9, env: 0.7, sun: { dir: [0.5, 0.8, 0.4], color: "#fff0d8", i: 3, at: [0, 0, 0], size: 20 }, exposure: 1.05, bloom: 0.2, threshold: 1.6, saturation: 1.25, contrast: 1.1, warmCool: 0.5, vignette: 0.2, ink: 0.8 };
const V: { pos: V3; look: V3; fov: number; what: "hotel" | "bed" }[] = [
  { pos: [0, 8, 45], look: [0, 8, 0], fov: 50, what: "hotel" }, { pos: [45, 8, 0], look: [0, 8, 0], fov: 50, what: "hotel" }, { pos: [0, 8, -45], look: [0, 8, 0], fov: 50, what: "hotel" }, { pos: [-45, 8, 0], look: [0, 8, 0], fov: 50, what: "hotel" },
  { pos: [0, 9, 0.01], look: [0, 0, 0], fov: 50, what: "bed" }, { pos: [0, 1.6, 4.5], look: [0, 1, 0], fov: 60, what: "bed" },
];
export const LAYOUT_N = V.length;
export const Layout: React.FC = () => { const f = useCurrentFrame(), ok = useH2Ready(); if (!ok) return <AbsoluteFill style={{ backgroundColor: "#000" }} />; const v = V[f];
  return <ToonSet c={{ pos: v.pos, look: v.look, fov: v.fov, dof: 0 }} m={L} f={f} world={() => <>
    {v.what === "hotel" ? <GModel name="jphotel" p={[0, 0, 0]} /> : <GModel name="bedroom" p={[0, 0, 0]} />}
    {[[-5, 0], [5, 0], [0, 5], [0, -5]].map(([x, z], i) => <mesh key={i} position={[x * (v.what === "bed" ? 0.4 : 3), 0.05, z * (v.what === "bed" ? 0.4 : 3)]}><boxGeometry args={v.what === "bed" ? [0.2, 0.2, 0.2] : [1.5, 1.5, 1.5]} /><meshBasicMaterial color={["#ff0000", "#00ff00", "#0000ff", "#ffff00"][i]} /></mesh>)}
  </>} />; };
import { BellhopCap, BowTie } from "./props";
import { useCurrentFrame as ucf } from "remotion";
const RL: Look = { ...L, bg: "#3a2a20" };
export const RAPTOR_TEST_N = 4;
export const RaptorTest: React.FC = () => { const f = ucf(), ok = useH2Ready(); if (!ok) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  const cams: { pos: V3; look: V3 }[] = [{ pos: [0, 1.6, 3.2], look: [0, 1.3, 0] }, { pos: [2.6, 1.6, 1.4], look: [0, 1.3, 0] }, { pos: [-2.6, 1.6, 1.4], look: [0, 1.3, 0] }, { pos: [0, 1.4, 2.6], look: [0, 1.4, 0] }];
  return <ToonSet c={{ ...cams[f], fov: 50, dof: 0 }} m={RL} f={f} world={() => <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[20, 20]} /><meshStandardMaterial color="#6a5040" /></mesh>
    <GModel name="raptorpbr" p={[0, 0, 0]} clip={f === 3 ? "Roar_01" : "Idle_01"} t={f === 3 ? 0.9 : 0.4} attach={[{ bone: "Head_09", node: <BellhopCap s={1.5} o={[0, 0.13, -0.03]} /> }, { bone: "Neck_3_08", node: <BowTie s={1.3} o={[0, -0.03, 0.16]} /> }]} /></>} />; };
