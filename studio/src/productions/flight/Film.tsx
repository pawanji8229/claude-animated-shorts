// flight film: 1511 frames. One Set per active story layer; planned opacity dissolves between layers (no hard cuts).
// The last ~0.8 s dissolves into the pre-roll of layer A, so frame 1510 flows into frame 0 (seamless loop).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FlightSet, type SetProps } from "./Set";
import { useFlightReady, fMats } from "./mats";
import { V3 } from "../../lib/math";
import * as T from "./timeline";
import type { PlaneT } from "./Set";

const N = T.FILM_FRAMES;
/** lap belt (plane-local): two webbing halves from the seat sides; `k` 0 = hanging open .. 1 = buckled across the lap */
const Belt: React.FC<{ seat: V3; k: number }> = ({ seat, k }) => { const m = fMats();
  const y = 0.98, xF = seat[0] + 0.17, zL = seat[2] - 0.23, zR = seat[2] + 0.23, mid: V3 = [xF + 0.02, y + 0.01, seat[2]];
  const endL: V3 = [lerp3(xF + 0.05, mid[0], k), lerp3(0.78, mid[1], k), lerp3(zL + 0.03, mid[2] - 0.035, k)], endR: V3 = [lerp3(xF + 0.05, mid[0], k), lerp3(0.8, mid[1], k), lerp3(zR - 0.03, mid[2] + 0.035, k)];
  const seg = (a: V3, b: V3, key: string) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1e-4;
    return <mesh key={key} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={quatY(d)} material={m.belt} castShadow><boxGeometry args={[0.012, L, 0.042]} /></mesh>; };
  return (<group>
    {seg([seat[0] + 0.02, y - 0.02, zL], endL, "l")}{seg([seat[0] + 0.02, y - 0.02, zR], endR, "r")}
    <mesh position={endL} material={m.buckle}><boxGeometry args={[0.02, 0.035, 0.06]} /></mesh>
    <mesh position={endR} material={m.buckle}><boxGeometry args={[0.02, 0.03, 0.045]} /></mesh>
  </group>);
};
const lerp3 = (a: number, b: number, t: number) => a + (b - a) * t;
import * as THREE from "three";
const quatY = (d: number[]) => { const v = new THREE.Vector3(d[0], d[1], d[2]).normalize(); return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v); };
const HERO_SEAT: V3 = [0.1, 0.62, 0.27];
const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const behind = (p: PlaneT, c: { pos: V3 }) => T.wl(p, c.pos)[0] < 1.6;
const layerProps = (L: T.Layer, f0: number): SetProps => {
  const f = L === "A_LOOP" ? f0 - N : f0, t = f / 30;
  if (L === "A" || L === "A_LOOP") { const p = T.planeA(f), c = T.camA(f), belt = sm(244, 262, f);
    return { c, t, plane: p, inPlane: [T.pilot(f, behind(p, c)), T.heroA(f), T.bA(f), T.cA(f), T.dA(f)], local: () => <Belt seat={HERO_SEAT} k={f < 200 ? 0 : belt} />, cabinLight: 2.2, exposure: 1.16 }; }
  if (L === "B") { const p = T.planeB(f), c = T.camB(f);
    return { c, t, plane: p, inPlane: [T.pilot(f, behind(p, c)), ...T.cabinB(f)], outside: [...T.walkersB(f), T.attendant(f)], local: () => f >= 784 ? <Belt seat={HERO_SEAT} k={1} /> : null, cabinLight: 1.6, shadow: { at: f < 900 ? [120, 9, -20] : p.pos, size: f < 900 ? 26 : 30 } }; }
  if (L === "C") { const p = T.planeC(f), c = T.camC(f);
    return { c, t, plane: p, inPlane: [T.pilot(f, behind(p, c)), ...T.cabinC(f)], local: () => <Belt seat={HERO_SEAT} k={1} />, cabinLight: 2.2 }; }
  if (L === "E") { const p = T.planeE(f), c = T.camE(f);
    return { c, t, plane: p, inPlane: [T.pilot(f, behind(p, c)), ...T.cabinE(f)], outside: [...T.walkersE(f), T.attendantE(f)], local: () => f < 1458 ? <Belt seat={HERO_SEAT} k={0} /> : null, shadow: { at: [2700, 7, -188], size: 24 } }; }
  const k = Number(L[1]), p = { ...T.planeB(760), s: { ...T.planeB(760).s, door: { rear: 1 } } }, c = T.camM(k)(f), M = T.montage(k, f);
  return { c, t, plane: p, inPlane: [T.pilot(f, behind(p, c)), ...M.cab], outside: M.out, local: () => k >= 2 ? <Belt seat={HERO_SEAT} k={k === 3 ? sm(1330, T.BELT_CLICK_M, f) : 0} /> : null, cabinLight: 1.8, shadow: { at: [118, 9, -22], size: 24 } };
};

export const FlightFilm: React.FC = () => {
  const f = useCurrentFrame(), ready = useFlightReady();
  if (!ready) return <AbsoluteFill style={{ backgroundColor: "#bcd2e4" }} />;
  const active = T.LAYERS.map((L) => ({ L, o: T.layerOpacity(L, f) })).filter((a) => a.o > 0.001);
  return (<AbsoluteFill style={{ backgroundColor: "#bcd2e4" }}>
    {active.map((a, i) => <AbsoluteFill key={`${a.L[0]}${a.L[1]}`} style={{ opacity: i === 0 ? 1 : a.o }}><FlightSet {...layerProps(a.L[0], f)} /></AbsoluteFill>)}
  </AbsoluteFill>);
};
