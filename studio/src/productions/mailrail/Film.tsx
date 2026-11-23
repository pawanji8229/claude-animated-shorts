// The Mail Rail film: ONE CentSet, one continuous camera. Lighting blends smoothly between the street/section mood and
// the underground mood around the interior span (never switches on a frame), so the clip switch is invisible.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useTexReady } from "../short3/tex";
import { useMRReady } from "./pbr";
import { CentSet, type Mood } from "../centennial/Set";
import { Toon } from "../centennial/chars";
import { InkCtx } from "../../inventor/Workshop";
import { Car30, Truck30 } from "../short3/Vehicles";
import { MRWorld } from "./world";
import { MailTrain, lampPos } from "./train";
import { Bag } from "./mailbag";
import { RT } from "./cutaway";
import { UNDER_Z } from "./london";
import { TRACK_Z } from "./tunnel";
import * as T from "./timeline";
import { sm } from "./actors";

const DAY: Mood = { bg: "#c4ccd4", sky: "#dfe6ee", ground: "#7a7060", hemi: 0.95, env: 0.45, sun: { dir: [0.35, 0.62, 0.7], color: "#fff0dc", i: 2.6, size: 70 }, exposure: 1.08, fog: { color: "#c8d0d8", near: 140, far: 900 }, warmCool: 0.5, threshold: 1.7, bloom: 0.25 };
const UNDER: Mood = { bg: "#141210", sky: "#c8b498", ground: "#3a3028", hemi: 0.62, env: 0.3, sun: { dir: [0.35, 0.62, 0.7], color: "#fff0dc", i: 0, size: 30 }, exposure: 1.3, fog: { color: "#1c1814", near: 14, far: 70 }, warmCool: 0.55, vignette: 0.34, threshold: 1.8, bloom: 0.28 };
const mixC = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const mixN = (a: number, b: number, t: number) => a + (b - a) * t;
const moodAt = (f: number, closed: number): Mood => { const [a, b] = T.SEC_OFF, u = sm(a - 28, a + 4, f) * (1 - sm(b - 4, b + 28, f)), d = DAY, w = UNDER;
  return { bg: mixC(d.bg, w.bg, u), sky: mixC(d.sky, w.sky, u), ground: mixC(d.ground, w.ground, u), hemi: mixN(d.hemi, w.hemi * (1 - 0.35 * closed), u), env: mixN(d.env, w.env, u),
    sun: { ...d.sun, i: mixN(d.sun.i, 0, u), size: mixN(70, 30, u), at: [20, -4, 0] }, exposure: mixN(d.exposure, w.exposure, u),
    fog: { color: mixC(d.fog!.color, w.fog!.color, u), near: mixN(d.fog!.near, w.fog!.near, u), far: mixN(d.fog!.far, w.fog!.far, u) }, warmCool: mixN(0.5, 0.55, u), vignette: mixN(0.32, 0.34, u), threshold: 1.75, bloom: mixN(0.25, 0.28, u) }; };
const inkFor = (camY: number, hi: boolean) => (hi ? 2.2 : 1.1) * Math.max(0.35, Math.min(1, 22 / Math.max(1, camY - 2)));
const TZ = UNDER_Z + TRACK_Z[0];

export const MailRailFilm: React.FC<{ frame?: number }> = ({ frame }) => {
  const f0 = useCurrentFrame(), f = frame ?? f0, r0 = useTexReady(), r1 = useMRReady();
  if (!r0 || !r1) return <AbsoluteFill style={{ backgroundColor: "#c4ccd4" }} />;
  const o = T.frameAt(f), closed = sm(1572, 1596, f) * (f < 1790 ? 1 : 0), m = moodAt(f, closed), lp = lampPos(o.train.x);
  return <AbsoluteFill style={{ backgroundColor: m.bg }}>
    <CentSet c={o.c} m={m} f={f} world={({ hi, cam }) => <InkCtx.Provider value={inkFor(cam[1], hi)}>
      <MRWorld w={{ section: o.section, city: o.city, camX: o.c.pos[0], belt: o.belt, clock: o.clock, lightK: o.lightK, cool: o.cool, tunnelK: o.tunnelK }} />
      <group position={[0, RT, TZ]}><MailTrain s={o.train} /></group>
      {o.under && <pointLight position={[lp[0], RT + lp[1], TZ]} intensity={1.8 * (o.train.lamp ?? 1)} distance={9} decay={1.5} color="#ffe6b0" />}
      {o.bags.map((b, i) => <Bag key={`b${i}`} b={b} />)}
      {o.street && o.vehicles.map((v, i) => <group key={`v${i}`} position={v.p} rotation={[0, v.ry, 0]}>{v.kind === "truck" ? <Truck30 color={v.color} spin={v.spin} load={0} /> : <Car30 color={v.color} spin={v.spin} />}</group>)}
      {o.actors.map((a, i) => <Toon key={`a${i}`} p={a} cam={cam} hi={hi} />)}
    </InkCtx.Provider>} />
  </AbsoluteFill>;
};
/** QC: chosen frames of the film as a short sequence (frame i shows film frame STILLS[i]) */
export const STILLS = [0, 45, 100, 122, 228, 268, 450, 520, 722, 846, 858, 900, 940, 1060, 1200, 1300, 1480, 1590, 1640, 1652, 1700, 1760];
export const MailRailStills: React.FC = () => { const f = useCurrentFrame(); return <MailRailFilm frame={STILLS[Math.min(f, STILLS.length - 1)]} />; };
