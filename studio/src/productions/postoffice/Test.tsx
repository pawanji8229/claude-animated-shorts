// internal QC views (stills of the reef, the office, the surface, the island) — not part of the film
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { PoSet, type PCam } from "./Set";
import { usePoReady } from "./assets";
import type { V3 } from "../../lib/math";
import { Reef } from "./reef";
import { Office } from "./office";
import { PO } from "./geo";
import { Fish } from "./fish";
import { REEF_SCHOOLS } from "./life";
import { Island } from "./island";

const cam = (pos: V3, look: V3, fov = 50): PCam => ({ pos, look, fov, focus: Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]) });
export const VIEWS: { c: PCam; t: number }[] = [
  { c: cam([2.2, -1.9, 7.6], [0, -1.9, 0], 52), t: 3 },
  { c: cam([-4.5, -2.6, 2.5], [0, -1.6, 0], 55), t: 4 },
  { c: cam([0, -2.6, 4], [0.5, -0.2, -1], 70), t: 3 },
  { c: cam([0, 0.02, 14], [0, -0.4, -20], 60), t: 3 },
  { c: cam([8, 1.6, -30], [4, 2.5, -70], 55), t: 3 },
  { c: cam([30, 18, 40], [0, 0, -80], 50), t: 3 },
];
export const PO_TEST_N = VIEWS.length;
export const PoTest: React.FC = () => {
  const f = useCurrentFrame(), ready = usePoReady(); if (!ready) return <AbsoluteFill style={{ backgroundColor: "#0e4c5c" }} />;
  const v = VIEWS[f % VIEWS.length];
  return <PoSet c={v.c} t={v.t} world={({ t, cam }) => <><Reef t={t} near={cam} /><group position={[PO.x, PO.y, PO.z]} rotation={[0, PO.rot, 0]}><Office /></group><Fish schools={REEF_SCHOOLS} t={t} /><Island t={t} cam={cam} hi={false} /></>} />;
};
