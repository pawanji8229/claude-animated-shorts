// internal QC views of the Robot Hotel assets (stills) - not part of the film
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CentSet, type PCam, type Mood } from "../centennial/Set";
import { InkCtx } from "../../inventor/Workshop";
import { useHotelReady, Model, MODELS } from "./assets";
import type { V3 } from "../../lib/math";
import { Raptor, RAPTOR_REST, Concierge, Porter, Worker, Egg, Cleaner, Dolly, SuitcaseUp } from "./robots";
const floor = <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow><planeGeometry args={[60, 60]} /><meshStandardMaterial color="#8a8478" roughness={0.9} /></mesh>;
const lineup = (f: number) => <>{floor}
  <Raptor s={{ ...RAPTOR_REST, jaw: 0.6 + 0.4 * Math.sin(f), bow: 0.2, armR: 0.6, cardOut: 1, headYaw: 0.2 }} p={[-1.6, 0, 0]} />
  <Raptor s={RAPTOR_REST} v={1} p={[-3.2, 0, -0.6]} ry={0.4} />
  <Concierge s={{ face: "eyes", headTilt: 0.15, headYaw: 0.1, wave: 0.8, armL: 0 }} p={[0, 0, 0]} />
  <Concierge s={{ face: "loading", phase: 3, headTilt: -0.2, headYaw: 0, wave: 0, armL: 0.4 }} p={[0.9, 0, -0.5]} />
  <Porter s={{ err: 0, face: "eyes", wheel: 0, load: true }} p={[1.8, 0, 0.4]} ry={-0.6} />
  <Porter s={{ err: 1, face: "alert", wheel: 0, load: false }} p={[3.0, 0, -0.4]} ry={-0.3} />
  <Worker s={{ on: 1, droop: 0, look: 0 }} v={0} p={[-1, 0, -1.8]} /><Worker s={{ on: 0, droop: 1, look: 0 }} v={1} p={[-0.2, 0, -1.8]} />
  <Egg s={{ face: "eyes", ring: 1, screen: 1 }} p={[0.6, 0.6, 1.2]} /><mesh position={[0.6, 0.3, 1.2]} material={undefined}><boxGeometry args={[0.4, 0.6, 0.4]} /><meshStandardMaterial color="#6a5040" /></mesh>
  <Cleaner p={[1.2, 0, 1.4]} /><Dolly p={[2.4, 0, -1.6]} /><SuitcaseUp p={[-0.6, 0, 1.4]} ry={0.5} />
</>;

const cam = (pos: V3, look: V3, fov = 45, dof = 0.02): PCam => ({ pos, look, fov, dof, focus: Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]) });
export const STUDIO: Mood = { bg: "#8a9098", sky: "#eef0f4", ground: "#6a645a", hemi: 1.0, env: 0.6, sun: { dir: [0.5, 0.8, 0.6], color: "#fff4e4", i: 2.4, size: 9, at: [0, 0, 0] }, exposure: 1.1, warmCool: 0.5 };
type V = { c: PCam; m: Mood; kind: "models" | "custom"; node?: (f: number) => React.ReactNode };
let EXTRA: V[] = [];
export const registerViews = (v: V[]) => { EXTRA = v; };
const grid = () => MODELS.map((n, i) => <Model key={n} name={n} p={[(i % 5) * 2.6 - 5.2, 0, -Math.floor(i / 5) * 2.6]} />);
const VIEWS = (): V[] => [
  { c: cam([0, 7, 9], [0, 0.4, -4.5], 50), m: STUDIO, kind: "models" },
  { c: cam([-2.6, 2.2, 3.5], [-2.6, 0.5, -1.2], 45), m: STUDIO, kind: "models" },
  { c: cam([0.4, 1.5, 4.6], [0.2, 0.75, -0.2], 50), m: STUDIO, kind: "custom", node: lineup },
  { c: cam([0.2, 1.6, 3.0], [-2.0, 1.2, -0.2], 45), m: STUDIO, kind: "custom", node: lineup },
  ...EXTRA,
];
export const HOTEL_TEST_N = 24;
export const HotelTest: React.FC = () => {
  const f = useCurrentFrame(), ready = useHotelReady(); if (!ready) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  const all = VIEWS(), v = all[f % all.length];
  return <CentSet c={v.c} m={v.m} f={f} world={({ hi }) => <InkCtx.Provider value={hi ? 2.0 : 1.0}>
    {v.kind === "models" && <>{grid()}<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow><planeGeometry args={[60, 60]} /><meshStandardMaterial color="#8a8478" roughness={0.9} /></mesh></>}
    {v.node?.(f)}
  </InkCtx.Provider>} />;
};
import { Building, HotelLights, RAPTOR_AT, ALCOVES, CONCIERGE_AT, NIGHTSTAND, Duvet } from "./hotel";
import { Raptor as R2, RAPTOR_REST as RR, Concierge as C2, Worker as W2, Egg as E2, Porter as P2 } from "./robots";
export const DAYX: Mood = { bg: "#bcd2e4", sky: "#e4eef6", ground: "#8a8478", hemi: 0.9, env: 0.5, sun: { dir: [0.55, 0.7, 0.55], color: "#fff0dc", i: 2.6, size: 26, at: [0, 0, -4] }, exposure: 1.05, warmCool: 0.5 };
export const LOBBYM: Mood = { bg: "#2a2622", sky: "#f4ece0", ground: "#6a5a48", hemi: 0.55, env: 0.55, sun: { dir: [0.35, 0.55, 0.75], color: "#fff0dc", i: 2.2, size: 16, at: [0, 0, -6] }, exposure: 1.12, warmCool: 0.55, threshold: 1.7, bloom: 0.3 };
export const NIGHTM: Mood = { bg: "#0a0e1a", sky: "#4a5a8a", ground: "#1a1a22", hemi: 0.22, env: 0.18, sun: { dir: [0.1, 0.6, -0.8], color: "#9fb4ff", i: 0.5, size: 8, at: [17, 0, -16] }, exposure: 1.3, warmCool: 0.35, threshold: 1.8, bloom: 0.3 };
const ALL = { ext: true, lobby: true, cor: true, room: true };
const cast = (f: number, night = false) => <>
  <Building doors={0.3} door101={night ? 0.2 : 0} show={ALL} />
  <HotelLights lobby={1} cor={1} room={night ? 0.15 : 1} />
  {RAPTOR_AT.map((p, i) => <R2 key={i} s={{ ...RR, headYaw: i ? -0.2 : 0.2 }} v={i} p={p} sc={1.22} />)}
  {ALCOVES.map((p, i) => <W2 key={i} s={{ on: i % 2 ? 0 : 1, droop: i % 2, look: 0 }} v={i} p={p} ry={-Math.PI / 2} />)}
  <C2 s={{ face: "eyes", headTilt: 0, headYaw: 0, wave: 0, armL: 0 }} p={CONCIERGE_AT} ry={-0.6} />
  <P2 s={{ err: 0, face: "eyes", wheel: 0, load: true }} p={[4.5, 0, -7.5]} ry={-1} />
  <E2 s={{ face: "eyes", ring: 1, screen: 1 }} p={[NIGHTSTAND[0] + 0.12, 0.55, NIGHTSTAND[2] - 0.05]} ry={Math.PI / 2} />
  {night && <pointLight position={[NIGHTSTAND[0] + 0.4, 0.75, NIGHTSTAND[2] + 0.3]} intensity={1.2} distance={3.5} decay={1.6} color="#5fe0ff" />}
  <Duvet lift={0} />
</>;
registerViews([
  { c: cam([1.5, 1.7, 13], [0, 2.6, 0], 50), m: DAYX, kind: "custom", node: (f) => cast(f) },
  { c: cam([0, 1.65, 1.6], [-1.2, 1.4, -11], 52), m: LOBBYM, kind: "custom", node: (f) => cast(f) },
  { c: cam([-1.0, 1.75, -7.0], [-1.6, 1.45, -12.4], 46), m: LOBBYM, kind: "custom", node: (f) => cast(f) },
  { c: cam([3.2, 1.5, -4.0], [8.5, 1.0, -6.5], 48), m: LOBBYM, kind: "custom", node: (f) => cast(f) },
  { c: cam([-1.5, 4.2, -1.0], [-2.5, 0.6, -9.5], 58), m: LOBBYM, kind: "custom", node: (f) => cast(f) },
  { c: cam([10.0, 1.6, -11.3], [24, 1.2, -11.3], 55), m: LOBBYM, kind: "custom", node: (f) => cast(f) },
  { c: cam([17.8, 1.5, -12.9], [15.6, 0.8, -15.8], 55), m: NIGHTM, kind: "custom", node: (f) => cast(f, true) },
]);
void ALCOVES; void CONCIERGE_AT;
