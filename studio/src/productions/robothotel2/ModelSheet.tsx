// QC: each internet model alone on a studio floor (frame i = model i), framed to its size.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ToonSet, type Look } from "./ToonSet";
import { useH2Ready, GModel, H2_MODELS } from "./glb";
const STUDIO: Look = { bg: "#6f8fb0", sky: "#eef4ff", ground: "#7a6a58", hemi: 0.8, env: 0.7, sun: { dir: [0.6, 0.8, 0.5], color: "#fff0d8", i: 3, at: [0, 0, 0], size: 4 },
  rim: { dir: [-0.5, 0.4, -1], color: "#9fdcff", i: 1.4 }, exposure: 1.05, bloom: 0.3, threshold: 1.5, saturation: 1.3, contrast: 1.12, warmCool: 0.5, vignette: 0.3, ink: 0.9 };
const H = [2.4, 2.6, 1.9, 1.9, 1.5, 1.0, 1.6, 1.7, 1.0, 1.6, 1.1, 20, 30, 2.8, 0.35, 0.9, 1.3, 0.3, 0.7, 1.7];
export const MODEL_SHEET_N = H2_MODELS.length;
export const ModelSheet: React.FC = () => { const f = useCurrentFrame(), ok = useH2Ready(); if (!ok) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  const i = f % H2_MODELS.length, h = H[i], d = h * 2.2;
  return <ToonSet c={{ pos: [d * 0.55, h * 0.75, d], look: [0, h * 0.5, 0], fov: 45, dof: 0.05 }} m={STUDIO} f={f} world={() => <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#8a7a66" /></mesh>
    <GModel name={H2_MODELS[i]} p={[0, 0, 0]} clip={0} t={1.2} /></>} />; };
