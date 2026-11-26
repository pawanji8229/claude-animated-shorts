// internal QC views of the Boeing assets (stills only) - not part of the film
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useTexReady } from "../short3/tex";
import { CentSet, type PCam, type Mood } from "../centennial/Set";
import { Factory, FZ, ROOF_Y } from "./factory";
import { RoofTown, City } from "./town";
import type { V3 } from "../../lib/math";
import { InkCtx } from "../../inventor/Workshop";
/** outline width falls off with camera altitude: aerial views must not turn tiny houses into scribbles */
export const inkFor = (camY: number, hi: boolean) => (hi ? 2.4 : 1.2) * Math.max(0.35, Math.min(1, 26 / Math.max(1, camY - 12)));

const cam = (pos: V3, look: V3, fov = 45, dof = 0.04): PCam => ({ pos, look, fov, dof, focus: Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]) });
export const MORNING: Mood = { bg: "#c8d8e6", sky: "#e2ecf6", ground: "#8a8270", hemi: 1.0, env: 0.45, sun: { dir: [0.55, 0.55, 0.62], color: "#ffeed8", i: 2.8, size: 160, at: [0, 0, 0] }, exposure: 1.05, fog: { color: "#c9d6e2", near: 180, far: 1400 }, warmCool: 0.5 };
export const AERIAL: Mood = { ...MORNING, ao: 0.12, fog: { color: "#c3d1de", near: 260, far: 1700 }, saturation: 1.0, contrast: 1.04 };
export const INSIDE: Mood = { bg: "#2a2c2e", sky: "#d8dce0", ground: "#5a5850", hemi: 0.75, env: 0.35, sun: { dir: [0.15, 1, 0.25], color: "#fff0d8", i: 1.6, size: 70, at: [0, 0, 0] }, exposure: 1.4, fog: { color: "#4a4844", near: 70, far: 300 }, warmCool: 0.55 };
type V = { c: PCam; m: Mood; roof?: boolean };
export const VIEWS: V[] = [
  { c: cam([-60, 70, 140], [10, ROOF_Y, 10], 42), m: MORNING },
  { c: cam([-260, 380, 520], [20, 0, -40], 40), m: AERIAL },
  { c: cam([60, 4, FZ + 26], [0, 9, FZ - 4], 55), m: MORNING },
  { c: cam([10, 6.5, FZ - 12], [-30, 4, -10], 60), m: INSIDE, roof: true },
  { c: cam([38, 4.2, -8], [57, 2.6, -25], 50), m: INSIDE, roof: true },
];
export const BOEING_TEST_N = VIEWS.length;
export const BoeingTest: React.FC = () => {
  const f = useCurrentFrame(), ready = useTexReady(); if (!ready) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  const v = VIEWS[f % VIEWS.length];
  return <CentSet c={v.c} m={v.m} f={f} world={({ hi }) => <InkCtx.Provider value={inkFor(v.c.pos[1], hi)}><Factory /><RoofTown /><City /></InkCtx.Provider>} />;
};
