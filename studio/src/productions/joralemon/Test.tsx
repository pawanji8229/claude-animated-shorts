// joralemon test views (stills only): frame index picks a fixed camera + world frame.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useTexReady } from "../short3/tex";
import { JSet } from "./Set";
import type { Cam } from "../london-bridge/common";
import type { Era } from "./world";

const V: { cam: Cam; f: number; era: Era }[] = [
  { cam: { pos: [-9, 1.3, 9.5], look: [0, 5.5, 0], fov: 50, focus: 11 }, f: 10, era: "now" },              // 0 low 3/4 toward No. 58
  { cam: { pos: [1.5, 4.0, 8.5], look: [0, 5.0, 0], fov: 46, focus: 9 }, f: 10, era: "now" },               // 1 straight on
  { cam: { pos: [-1.2, 3.4, 3.2], look: [-2.05, 3.2, 0], fov: 40, focus: 3 }, f: 10, era: "now" },          // 2 close to the black window + door
  { cam: { pos: [-9, 1.3, 9.5], look: [0, 5.5, 0], fov: 50, focus: 11 }, f: 10, era: "1907" },             // 3 same, home era
  { cam: { pos: [6, 2.5, 12], look: [-4, 3.2, 1], fov: 48, focus: 10 }, f: 10, era: "now" },               // 4 stoop + areaway + neighbours
  { cam: { pos: [-1, 1.6, 16.5], look: [0, 6, 0], fov: 55, focus: 15 }, f: 10, era: "now" },               // 5 from the far sidewalk
  { cam: { pos: [-1, 4.5, 9], look: [0, 4.5, -4], fov: 52, focus: 9 }, f: 430, era: "now" },               // 6 cutaway (reveal 1)
  { cam: { pos: [2.5, 3.2, 9], look: [0, 4.6, -5], fov: 56, focus: 10 }, f: 480, era: "now" },             // 7 cutaway complete
  { cam: { pos: [-1.5, 6.5, 4.5], look: [0.5, 3.5, -6], fov: 60, focus: 9 }, f: 480, era: "now" },         // 8 cutaway high close
  { cam: { pos: [1.5, 4.0, 9.5], look: [0.5, 4.8, -5], fov: 56, focus: 10 }, f: 520, era: "1847" },        // 9 home cutaway
  { cam: { pos: [-0.4, 3.3, -0.9], look: [2.0, 2.4, -5], fov: 62, focus: 4 }, f: 600, era: "1847" },       // 10 inside the parlour
  { cam: { pos: [3, -6, 15], look: [0, -12, 2], fov: 58, focus: 14 }, f: 1240, era: "now" },              // 11 underground (now), train
  { cam: { pos: [-5, -14, 14], look: [-2, -18, 4], fov: 55, focus: 11 }, f: 640, era: "1907" },          // 12 tunnel works 1907
  { cam: { pos: [2, 2.0, 16.5], look: [0, -9, 0], fov: 64, focus: 18 }, f: 1240, era: "now" },               // 13 full cutaway overview
];
export const JTest: React.FC = () => { const i = useCurrentFrame(); const ready = useTexReady(); const v = V[Math.min(i, V.length - 1)];
  if (!ready) return <AbsoluteFill style={{ backgroundColor: "#222" }} />;
  return <JSet era={v.era} camAt={() => v.cam} frameOverride={v.f} />; };
export const J_TEST_N = V.length;
