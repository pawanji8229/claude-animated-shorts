// internal QC views of the Mail Rail assets (stills + short motion tests) - not part of the film
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CentSet, type PCam, type Mood } from "../centennial/Set";
import { InkCtx } from "../../inventor/Workshop";
import { useMRReady } from "./pbr";
import { MailTrain, TRAIN_L } from "./train";
import { RunningTunnel, LampLights, TrackOnly, TRACK_Z } from "./tunnel";
import type { V3 } from "../../lib/math";
import { MRWorld, U } from "./world";

const cam = (pos: V3, look: V3, fov = 45, dof = 0.03): PCam => ({ pos, look, fov, dof, focus: Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]) });
export const TUNNEL: Mood = { bg: "#141210", sky: "#b8a890", ground: "#3a3028", hemi: 0.55, env: 0.3, sun: { dir: [0.2, 1, 0.3], color: "#ffe0b0", i: 0.0, size: 8 }, exposure: 1.25, fog: { color: "#1a1714", near: 10, far: 60 }, warmCool: 0.55, vignette: 0.35, threshold: 1.8, bloom: 0.25 };
export const STUDIO: Mood = { bg: "#7c838a", sky: "#e8ecf0", ground: "#6a645a", hemi: 1.0, env: 0.6, sun: { dir: [0.5, 0.8, 0.6], color: "#fff4e4", i: 2.6, size: 6, at: [0, 0, 0] }, exposure: 1.1, warmCool: 0.5 };
type V = { c: PCam; m: Mood; tunnel?: boolean; x?: number; lids?: number[]; fill?: number[]; world?: { section: boolean; city: boolean } };
export const DAY: Mood = { bg: "#c4ccd4", sky: "#dfe6ee", ground: "#7a7060", hemi: 0.95, env: 0.45, sun: { dir: [0.35, 0.62, 0.7], color: "#fff0dc", i: 2.6, size: 70, at: [20, -4, 0] }, exposure: 1.08, fog: { color: "#c8d0d8", near: 120, far: 900 }, warmCool: 0.5 };
const tz = TRACK_Z[0];
export const VIEWS: V[] = [
  { c: cam([8.2, 1.5, tz + 3.6], [2.4, 0.6, tz], 40), m: STUDIO, x: 0, lids: [0, 1.7, 0, 0], fill: [6, 4, 6, 0] },               // 3/4 front, studio
  { c: cam([4.3, 0.36, tz + 1.3], [2.5, 0.24, tz], 42), m: STUDIO, x: 0 },                                                         // low running-gear close-up
  { c: cam([2.5, 2.5, tz + 1.7], [2.5, 0.7, tz], 45), m: STUDIO, x: 0, lids: [1.8, 1.8, 1.8, 1.8], fill: [6, 6, 3, 0] },         // looking down into containers
  { c: cam([12, 1.0, TRACK_Z[1]], [0, 0.6, tz], 50), m: TUNNEL, tunnel: true, x: 4 },                                              // tunnel, train approaching on far track
  { c: cam([2.6, 0.9, TRACK_Z[1] + 0.1], [6.5, 0.6, tz], 48), m: TUNNEL, tunnel: true, x: 6 },                                     // tracking-shot framing
  { c: cam([-6, 1.2, TRACK_Z[1]], [10, 1.0, 0], 55), m: TUNNEL, tunnel: true, x: 30 },                                             // empty tunnel perspective
  { c: { ...cam([12, -3.5, 46], [12, -5.5, 0], 46), near: 0.2 }, m: DAY, world: { section: true, city: true } },                      // section, wide
  { c: cam(U(-14, 2.0, 2.2), U(-20, 0.9, -2.2), 55), m: TUNNEL, world: { section: false, city: false } },                              // station A interior
  { c: cam([24, 1.7, 4.2], [8, 4.5, -9], 50), m: DAY, world: { section: true, city: true } },                                          // street level
  { c: { ...cam([20, 70, 30], [20, 0, -70], 45), near: 0.5 }, m: DAY, world: { section: true, city: true } },                          // aerial
];
export const MR_TEST_N = VIEWS.length;
export const MailRailTest: React.FC = () => {
  const f = useCurrentFrame(), ready = useMRReady(); if (!ready) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  const v = VIEWS[f % VIEWS.length];
  if (v.world) return <CentSet c={v.c} m={v.m} f={f} world={({ hi }) => <InkCtx.Provider value={hi ? 2.0 : 1.0}><MRWorld w={{ ...v.world!, camX: v.c.pos[0] }} />
    <group position={U(-20, 0, TRACK_Z[0])}><MailTrain s={{ x: 0, lids: [1.8, 1.8, 0, 0], fill: [4, 6, 6, 6], lamp: 1 }} /></group></InkCtx.Provider>} />;
  return <CentSet c={v.c} m={v.m} f={f} world={({ hi }) => <InkCtx.Provider value={hi ? 2.0 : 1.0}>
    {v.tunnel ? <group position={[-40, 0, 0]}><RunningTunnel len={90} id="test" /><LampLights x0={0} len={90} camX={v.c.pos[0] + 40} /></group>
      : <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0]} receiveShadow><planeGeometry args={[40, 40]} /><meshStandardMaterial color="#8a8478" roughness={0.9} /></mesh>}
    {!v.tunnel && <group position={[-20, 0, 0]}><RunningTunnelTrackOnly /></group>}
    <group position={[0, 0, tz]}><MailTrain s={{ x: v.x ?? 0, lids: v.lids, fill: v.fill, lamp: 1, sway: 0 }} /></group>
    {v.tunnel && <pointLight position={[(v.x ?? 0) + TRAIN_L / 2 + 0.6, 0.72, tz]} intensity={1.6} distance={8} decay={1.5} color="#ffe6b0" />}
  </InkCtx.Provider>} />;
};
const RunningTunnelTrackOnly: React.FC = () => <TrackOnly len={40} id="studio" />;
