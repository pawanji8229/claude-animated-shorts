// flight test views (QC stills of the aircraft, cabin, runway, coastline) — not part of the film
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FlightSet, toWorld, type PlaneT, type FCam } from "./Set";
import { useFlightReady } from "./mats";
import { STILL, ROWS, SEAT_Z } from "./islander";
import { pose5, COSTUME, type Costume } from "../../char/odo5";
import { FACES, withFace } from "../short3/expr";
import { V3 } from "../../lib/math";

const cam = (pos: V3, look: V3, fov: number, near = 0.1): FCam => ({ pos, look, fov, focus: Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]), near });
const HERO: Costume = { ...COSTUME.odo, apron: false, pal: { shirt: "#2f6f78", shirtShade: "#22545b", hair: "#ebe9f0", hairShade: "#b9b4c4" } };
const seated = (row: number, z: number, face: keyof typeof FACES, costume: Costume = HERO) => ({ pose: withFace(pose5({ costume, lookX: 0.4 }), FACES[face], 0, 1), pos: [ROWS[row] - 0.1, 0.62, z] as V3, h: 1.3 });
type View = { c: (p: PlaneT) => FCam; plane: PlaneT; t: number };
const parked: PlaneT = { pos: [110, 9, -24], yaw: 0.55, pitch: 0, roll: 0, s: { ...STILL, door: { rear: 1 } } };
const flying: PlaneT = { pos: [700, 108, -38], yaw: 0.055, pitch: 0.02, roll: 0.01, s: { ...STILL, rps: [38, 38], prop: [0.3, 1.2], flap: 0 } };
export const VIEWS: View[] = [
  { plane: parked, t: 3, c: (p) => cam(toWorld(p, [7.5, 1.2, -6.5]), toWorld(p, [-0.5, 1.6, 0]), 50) },
  { plane: flying, t: 5, c: (p) => cam(toWorld(p, [0.6, 2.0, 13.5]), toWorld(p, [0.2, 1.6, 0]), 42) },
  { plane: flying, t: 5, c: (p) => cam(toWorld(p, [2.05, 1.74, 0.1]), toWorld(p, [0.85, 1.3, 0.04]), 58, 0.03) },
  { plane: flying, t: 5, c: (p) => cam([-400, 520, 900], [1500, 0, -200], 50, 2) },
  { plane: { ...parked, pos: [2700, 7, -195], yaw: 0 }, t: 6, c: () => cam([2672, 8.6, -168], [2702, 9, -205], 52) },
  { plane: { ...parked, s: { ...STILL, flap: 1, ail: 0.2 } }, t: 3, c: (p) => cam(toWorld(p, [-3.5, 0.9, 6.5]), toWorld(p, [0.2, 2.0, 3.2]), 50) },
  { plane: { ...parked, s: { ...STILL, rps: [0, 6], prop: [0.3, 1.2] } }, t: 3, c: (p) => cam(toWorld(p, [5.2, 1.7, 3.6]), toWorld(p, [2.6, 1.6, 1.4]), 46) },
];
export const FLIGHT_TEST_N = VIEWS.length;
export const FlightTest: React.FC = () => {
  const f = useCurrentFrame(), ready = useFlightReady(); if (!ready) return <AbsoluteFill style={{ backgroundColor: "#bcd2e4" }} />;
  const v = VIEWS[f % VIEWS.length], c = v.c(v.plane);
  const inPlane = [seated(1, SEAT_Z, "content"), seated(1, -SEAT_Z, "xSideEyeL", { ...COSTUME.clerk, hat: null, stache: true }), seated(2, SEAT_Z, "bored", COSTUME.clerk), { ...seated(0, -SEAT_Z, "focused", { ...COSTUME.clerk, hat: "pilot", pal: { ...COSTUME.clerk.pal, shirt: "#f2f2f0", shirtShade: "#d6d6d2", hat: "#1d2433", hatShade: "#11151e", band: "#0d0f14" } }) }];
  return <FlightSet c={c} t={v.t} plane={v.plane} inPlane={inPlane} cabinLight={c.near && c.near < 0.05 ? 3 : 0} />;
};
