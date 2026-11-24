// The Robot Hotel film: ONE CentSet, one continuous camera. The light blends smoothly with the camera's position
// (street day -> lobby interior -> corridor -> room 101 at night), never switching on a frame.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useTexReady } from "../short3/tex";
import { CentSet, type Mood } from "../centennial/Set";
import { Toon } from "../centennial/chars";
import { InkCtx } from "../../inventor/Workshop";
import { useHotelReady } from "./assets";
import { Building, HotelLights, Duvet, RAPTOR_AT, RAPTOR_SCALE, CONCIERGE_AT, NIGHTSTAND } from "./hotel";
import { Raptor, Concierge, Porter, Worker, Egg, Cleaner, Dolly, SuitcaseUp, DOLLY_DECK } from "./robots";
import * as T from "./timeline";
import type { V3 } from "../../lib/math";

const DAY: Mood = { bg: "#bcd2e4", sky: "#e4eef6", ground: "#8a8478", hemi: 0.9, env: 0.5, sun: { dir: [0.55, 0.7, 0.55], color: "#fff0dc", i: 2.6, size: 22, at: [0, 0, -3] }, exposure: 1.05, warmCool: 0.5, threshold: 1.7, bloom: 0.26 };
const LOBBY: Mood = { bg: "#2a2622", sky: "#f4ece0", ground: "#6a5a48", hemi: 0.58, env: 0.55, sun: { dir: [0.35, 0.55, 0.75], color: "#fff0dc", i: 2.2, size: 15, at: [0, 0, -7] }, exposure: 1.1, warmCool: 0.55, threshold: 1.7, bloom: 0.3 };
const COR: Mood = { ...LOBBY, hemi: 0.5, sun: { ...LOBBY.sun, i: 1.2, at: [13, 0, -11] }, exposure: 1.16 };
const NIGHT: Mood = { bg: "#0a0e1a", sky: "#5a6a9a", ground: "#1a1a22", hemi: 0.2, env: 0.16, sun: { dir: [0.15, 0.6, -0.8], color: "#9fb4ff", i: 0.55, size: 7, at: [12, 0, -16] }, exposure: 1.18, warmCool: 0.38, threshold: 1.75, bloom: 0.32 };
const mixC = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const blend = (ms: [Mood, number][]): Mood => { const tot = ms.reduce((s, [, w]) => s + w, 0) || 1, n = (g: (m: Mood) => number) => ms.reduce((s, [m, w]) => s + g(m) * w, 0) / tot;
  const col = (g: (m: Mood) => string) => { const c = new THREE.Color(0, 0, 0); for (const [m, w] of ms) c.add(new THREE.Color(g(m)).multiplyScalar(w / tot)); return "#" + c.getHexString(); };
  const v3 = (g: (m: Mood) => V3): V3 => [n((m) => g(m)[0]), n((m) => g(m)[1]), n((m) => g(m)[2])];
  return { bg: col((m) => m.bg), sky: col((m) => m.sky), ground: col((m) => m.ground), hemi: n((m) => m.hemi), env: n((m) => m.env), exposure: n((m) => m.exposure), warmCool: n((m) => m.warmCool ?? 0.5),
    threshold: n((m) => m.threshold ?? 1.7), bloom: n((m) => m.bloom ?? 0.28), vignette: 0.32,
    sun: { dir: v3((m) => m.sun.dir), color: col((m) => m.sun.color), i: n((m) => m.sun.i), size: n((m) => m.sun.size ?? 12), at: v3((m) => m.sun.at ?? [0, 0, 0]) } }; };
void mixC;

export const HotelFilm: React.FC<{ frame?: number }> = ({ frame }) => {
  const f0 = useCurrentFrame(), f = frame ?? f0, r0 = useTexReady(), r1 = useHotelReady();
  if (!r0 || !r1) return <AbsoluteFill style={{ backgroundColor: "#bcd2e4" }} />;
  const o = T.frameAt(f), z = o.zone, m = blend([[DAY, z.ext], [LOBBY, z.lobby], [COR, z.cor], [NIGHT, z.room]]), cx = o.c.pos[0], cz = o.c.pos[2];
  const show = { ext: cz > -9 && cx < 8.5, lobby: z.room < 0.85, cor: cx > 3 && z.room < 0.85, room: cx > 6.5 };
  const eggLight = o.egg.ring * 0.9 + o.egg.screen * 0.6;
  return <AbsoluteFill style={{ backgroundColor: m.bg }}>
    <CentSet c={o.c} m={m} f={f} world={({ hi, cam }) => <InkCtx.Provider value={hi ? 2.0 : 1.0}>
      <Building doors={o.doors} door101={o.door101} show={show} />
      <HotelLights lobby={z.lobby + z.ext > 0.05 && cx < 8.6 ? 1 : 0} cor={z.cor > 0.05 || (cx > 6 && z.room < 0.5) ? 1 : 0} room={z.room > 0.05 ? 0.15 : 0} />
      {show.room && <pointLight position={[NIGHTSTAND[0] + 0.45, 0.78, NIGHTSTAND[2] + 0.35]} intensity={0.4 + 1.6 * eggLight} distance={4} decay={1.5} color="#5fe0ff" />}
      {show.lobby && <>
        {RAPTOR_AT.map((p, i) => <Raptor key={i} s={o.raptors[i]} v={i} p={p} sc={RAPTOR_SCALE} />)}
        <Concierge s={o.concierge} p={CONCIERGE_AT} ry={-0.75} />
        {o.workers.map((w, i) => w.gone ? null : <React.Fragment key={i}>{w.dolly && <Dolly p={[w.p[0], 0, w.p[2]]} ry={w.ry} />}<Worker s={w.s} v={i} p={w.dolly ? [w.p[0], DOLLY_DECK, w.p[2]] : w.p} ry={w.ry} /></React.Fragment>)}
        <Cleaner p={o.cleaner.p} ry={o.cleaner.ry} />
      </>}
      <Porter s={o.porter.s} p={o.porter.p} ry={o.porter.ry} />
      {o.suit && <SuitcaseUp p={o.suit.p} ry={o.suit.ry} tilt={o.suit.tilt} />}
      {show.room && <><Egg s={o.egg} p={[NIGHTSTAND[0] + 0.12, 0.55, NIGHTSTAND[2] - 0.02]} ry={Math.PI / 2 - 0.35} /><Duvet lift={o.duvetLift} /></>}
      {o.actors.map((a, i) => <Toon key={`a${i}`} p={a} cam={cam} hi={hi} />)}
    </InkCtx.Provider>} />
  </AbsoluteFill>;
};
/** QC: chosen frames of the film as a short sequence (frame i shows film frame STILLS[i]) */
export const STILLS = [0, 60, 120, 175, 230, 330, 450, 560, 650, 730, 800, 900, 960, 1050, 1130, 1170, 1250, 1320, 1420, 1480, 1525, 1590, 1640, 1670];
export const HotelStills: React.FC = () => { const f = useCurrentFrame(); return <HotelFilm frame={STILLS[Math.min(f, STILLS.length - 1)]} />; };
