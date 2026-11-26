// internal QC views of the centennial assets (stills only) — not part of the film
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useTexReady } from "../short3/tex";
import { CentSet, type PCam, type Mood } from "./Set";
import { CentennialLight, Dust, filamentAt } from "./bulb";
import { OldStation, OLD_BULB, OLD_DROP, type Era } from "./oldStation";
import { OldStreet } from "./street";
import { HoseCart, Apparatus, Sedan70 } from "./vehicles";
import { Station6, S6_BULB, S6_DROP, RollingLadder, Monitor, CAM_AT, MON_AT } from "./station6";
import type { V3 } from "../../lib/math";
import { Toon } from "./chars";
import { VOL_RED, FIRE76, FIRE12 } from "./chars";
import { pose5 } from "../../char/odo5";

const cam = (pos: V3, look: V3, fov = 40, dof = 0.08): PCam => ({ pos, look, fov, dof, focus: Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]) });
const DAY: Mood = { bg: "#bcd4e6", sky: "#dce8f4", ground: "#b8a07a", hemi: 1.0, env: 0.45, sun: { dir: [0.55, 0.75, 0.55], color: "#fff0d8", i: 2.6, size: 28 }, exposure: 1.05, fog: { color: "#c9d8e4", near: 60, far: 420 } };
const IN: Mood = { ...DAY, hemi: 1.3, exposure: 1.35, sun: { dir: [0.75, 0.45, 0.3], color: "#fff0d8", i: 2.4, size: 16, at: [0, 2, -6] } };
type V = { c: PCam; m: Mood; era: Era; s6?: boolean; hb?: number };
const DUSK6: Mood = { bg: "#1a2232", sky: "#6a7aa0", ground: "#3a3028", hemi: 0.55, env: 0.35, sun: { dir: [0.2, 0.35, 1.0], color: "#9ab0e0", i: 0.9, size: 18, at: [0, 2, -6] }, exposure: 1.3 };
const DAY6: Mood = { ...DUSK6, bg: "#c4d6e6", sky: "#e4eef8", ground: "#8a8478", hemi: 1.0, sun: { dir: [0.3, 0.8, 0.6], color: "#fff4e0", i: 2.6, size: 22, at: [0, 0, -2] }, exposure: 1.1 };
export const VIEWS: V[] = [
  { c: cam([3, 1.7, 11.5], [0, 5.0, -2], 62), m: DAY, era: "1901" },
  { c: cam([-9, 1.6, 9], [1, 4, -3], 50), m: DAY, era: "1901" },
  { c: cam([2.6, 1.65, -0.5], [-1, 2.4, -9], 58), m: IN, era: "1901" },
  { c: cam([-3.4, 2.2, -12.5], [1.5, 2.2, 0], 58), m: IN, era: "1938" },
  { c: cam([0, 5.5, 12.8], [0, 0.8, 5], 82), m: DAY, era: "1976" },
  { c: cam([3.5, 2.0, 1.5], [-1.5, 3.4, -8], 62), m: DUSK6, era: "1976", s6: true, hb: 0 },
  { c: cam([-4.6, 1.9, -8.6], [-7.2, 1.6, -10.4], 55), m: DUSK6, era: "1976", s6: true, hb: 0 },
  { c: cam([-6.3, 4.3, -7.6], [-7.25, 4.55, -8.4], 46), m: DAY6, era: "1976", s6: true, hb: 1 },
];
export const CENT_TEST_N = VIEWS.length;
export const CentTest: React.FC = () => {
  const f = useCurrentFrame(), ready = useTexReady(); if (!ready) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  const v = VIEWS[f % VIEWS.length];
  if (v.s6) return <CentSet c={v.c} m={v.m} f={f} world={() => <>
    <Station6 highbay={v.hb ?? 0} outside doors={[1, 0.15]} />
    <CentennialLight p={S6_BULB} drop={S6_DROP} glow={1} />
    <RollingLadder />
    <Monitor glow={1} sec={f} />
    <group position={[3.9, 0, -7.2]} rotation={[0, Math.PI / 2, 0]}><Apparatus type="mod" /></group>
  </>} />;
  return <CentSet c={v.c} m={v.m} f={f} world={() => <>
    <OldStation era={v.era} />
    <OldStreet era={v.era} />
    <CentennialLight p={OLD_BULB} drop={OLD_DROP} glow={1} />
    {f % VIEWS.length === 4 && <><group position={[-9, 0, 5]} rotation={[0, 0.5, 0]}><HoseCart /></group><group position={[-5, 0, 6]} rotation={[0, 0.5, 0]}><Apparatus type="1912" /></group><group position={[1, 0, 6]} rotation={[0, 0.5, 0]}><Apparatus type="1938" /></group>
      <group position={[8, 0, 6]} rotation={[0, 0.5, 0]}><Apparatus type="1976" /></group><group position={[13, 0, 6]} rotation={[0, 0.5, 0]}><Sedan70 police /></group><group position={[15, 0, 9.5]} rotation={[0, 2.5, 0]}><Sedan70 /></group><group position={[-12, 0, 10]} rotation={[0, 2.6, 0]}><Apparatus type="mod" /></group></>}
    {f % VIEWS.length === 0 && [VOL_RED, FIRE76, FIRE12].map((c, i) => <Toon key={i} p={{ pose: pose5({ costume: c }), pos: [1.2 + i * 0.9, 0.1, 8.5], h: 1.62 }} cam={v.c.pos} hi={false} />)}
    <Dust at={filamentAt(OLD_BULB, OLD_DROP)} t={f / 30} glow={1} n={20} />
  </>} />;
};
