// The post office film: one PoSet per active story layer, planned opacity dissolves between layers (no hard cuts);
// the last second dissolves into layer A's pre-roll so frame 1517 flows into frame 0 (seamless loop).
import { OFF } from "./dbg";
import type { View } from "./reef";
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { PoSet } from "./Set";
import { usePoReady } from "./assets";
import { Reef } from "./reef";
import { Fish, type School, type Avoid } from "./fish";
import { REEF_SCHOOLS } from "./life";
import { Office, ROOF_TOP, ow, type OfficeState } from "./office";
import { Island } from "./island";
import { PoToon } from "./chars";
import { Postcard, PaperCard, Pen, Embosser, InkBox, MailBag3D, FlagFloat, Barge, Rope, SortRoom, InkStamp, CardFan } from "./props";
import { PO } from "./geo";
import { waveY } from "./env";
import * as T from "./timeline";
import type { V3 } from "../../lib/math";
import type { Emitter } from "./env";

const N = T.FILM_FRAMES;
type LayerOut = ReturnType<typeof T.layerA> & { marker?: boolean; office?: { at: V3; ry: number; st: OfficeState }; barge?: boolean; ropes?: boolean; puff?: number; paper?: { p: V3; r: V3 }; card?: { p: V3; r: V3 };
  emb?: { press: number; card: { p: V3; r: V3 }; emb: number }; inkBox?: { p: V3; ry: number }; bag?: { p: V3; fill: number }; fan?: { p: V3; ry: number }; slide?: { p: V3; r: V3 }; room?: { card: { p: V3; r: V3 }; stamp: number }; dof?: number };
/** a fusilier school crossing close in front of the camera at the start (and again at the loop end) */
const FORE: School = { sp: "fusilier", n: 26, centre: (t) => { const a = T.L(5.2 - t * 1.1, 1.75, 8.2 - t * 0.2); return a; }, radius: [1.2, 0.35, 0.9], size: [0.9, 1.15], speed: 1.3, seed: 401, minY: 1.0 };
const SCHOOLS = [...REEF_SCHOOLS, FORE];
const Puff: React.FC<{ f: number }> = ({ f }) => { const age = (f - 576) / 30; if (age < 0 || age > 2.2) return null; const base = ow([0, 0.05, 0]);
  return <>{Array.from({ length: 26 }, (_, i) => { const a = (i / 26) * Math.PI * 2 + i, r = 1.15 + age * (0.9 + (i % 5) * 0.12), y = 0.08 + age * 0.35 * ((i % 3) + 1) * 0.4, s = 0.4 + age * 0.7;
    return <sprite key={i} position={[base[0] + Math.cos(a) * r, base[1] + y, base[2] + Math.sin(a) * r]} scale={[s, s * 0.6, 1]}><spriteMaterial color="#d8d2bc" transparent opacity={0.42 * Math.max(0, 1 - age / 2.2)} depthWrite={false} /></sprite>; })}</>; };

const World: React.FC<{ L: T.Layer; o: LayerOut; f: number; t: number; cam: V3; hi: boolean; view: View }> = ({ L, o, f, t, cam, hi, view }) => {
  const pastNoOffice = L === "A2" || L === "B" || L === "C1" || L === "C2" || L === "C3";
  const roofRing = ow([0, ROOF_TOP, 0]);
  return (<>
    {!OFF("reef") && <Reef t={t} near={cam} view={view} />}
    {!OFF("fish") && <Fish schools={SCHOOLS} t={t} avoid={avoidFor(o, pastNoOffice)} />}
    {!OFF("island") && <Island t={t} cam={cam} hi={hi} />}
    {!pastNoOffice && <group position={[PO.x, PO.y, PO.z]} rotation={[0, PO.rot, 0]}><Office /></group>}
    {o.office && <group position={o.office.at} rotation={[0, o.office.ry, 0]}><Office st={o.office.st} /></group>}
    {o.flag && <FlagFloat p={[roofRing[0] + 0.6, waveY(roofRing[0] + 0.6, roofRing[2] + 0.4, t) + 0.05, roofRing[2] + 0.4]} t={t} tether={roofRing} />}
    {o.marker && <FlagFloat marker p={[T.MARKER[0], waveY(T.MARKER[0], T.MARKER[2], t) + 0.08, T.MARKER[2]]} t={t} tether={[T.MARKER[0], PO.y + 0.2, T.MARKER[2]]} />}
    {o.marker && <mesh position={[T.MARKER[0], PO.y + 0.1, T.MARKER[2]]}><boxGeometry args={[0.45, 0.25, 0.45]} /><meshStandardMaterial color="#8b8a7e" roughness={0.9} /></mesh>}
    {o.barge && <Barge p={T.BARGE} ry={0} t={t} />}
    {o.ropes && o.office && <>{[-0.5, 0.5].map((dz) => <Rope key={dz} a={[o.office!.at[0], o.office!.at[1] + ROOF_TOP, o.office!.at[2] + dz * 0.4]} b={[PO.x, 3.3, PO.z + dz * 0.3]} />)}<Barge p={T.BARGE} ry={0} t={t} /></>}
    {L === "C2" && o.office && [-0.5, 0.5].map((dz) => <Rope key={dz} a={[o.office!.at[0], o.office!.at[1] + ROOF_TOP, o.office!.at[2] + dz * 0.4]} b={[PO.x, 3.3, PO.z + dz * 0.3]} />)}
    {o.puff !== undefined && <Puff f={o.puff} />}
    {o.paper && <><PaperCard p={o.paper.p} r={o.paper.r} wet={T.wetD(f)} /></>}
    {o.card && <Postcard p={o.card.p} r={o.card.r} />}
    {o.emb && <><Embosser p={T.embWorld()} ry={T.EMB_AT.ry} press={o.emb.press} /><Postcard p={o.emb.card.p} r={o.emb.card.r} emb={o.emb.emb} /></>}
    {o.inkBox && <InkBox p={o.inkBox.p} ry={o.inkBox.ry} />}
    {o.bag && <MailBag3D p={o.bag.p} r={[0, PO.rot, 0]} fill={o.bag.fill} />}
    {o.fan && <CardFan p={o.fan.p} ry={o.fan.ry} />}
    {o.slide && <Postcard p={o.slide.p} r={o.slide.r} />}
    {o.room && <><SortRoom /><Postcard p={o.room.card.p} r={o.room.card.r} emb={1} /><InkStamp p={[o.room.card.p[0] + 0.03, o.room.card.p[1], o.room.card.p[2]]} down={o.room.stamp} /></>}
    {L === "D" && <Pen p={[o.paper!.p[0] + 0.06, o.paper!.p[1] + 0.02, o.paper!.p[2] + 0.03]} r={[0, PO.rot + 0.6, -0.9]} />}
    {!OFF("actors") && o.actors.map((a, i) => <PoToon key={i} p={a} cam={cam} hi={hi} />)}
  </>);
};
/** fish keep-out volumes for this moment: every character card + the office tank (where it stands) */
const avoidFor = (o: LayerOut, noOffice: boolean): Avoid[] => {
  const av: Avoid[] = o.actors.map((a) => { const base = a.centre ? [a.pos[0], a.pos[1] - a.h * 0.5, a.pos[2]] : a.pos; const rolled = Math.abs(a.roll ?? 0) > 0.3;
    return rolled ? { x: a.pos[0], z: a.pos[2], y0: a.pos[1], y1: a.pos[1], r: a.h * 0.55 } : { x: base[0], z: base[2], y0: base[1] + a.h * 0.25, y1: base[1] + a.h * 0.8, r: a.h * 0.32 }; });
  if (!noOffice) av.push({ x: PO.x, z: PO.z, y0: PO.y, y1: PO.y + ROOF_TOP, r: 1.45 });
  if (o.office) av.push({ x: o.office.at[0], z: o.office.at[2], y0: o.office.at[1], y1: o.office.at[1] + ROOF_TOP, r: 1.45 });
  return av; };
export const layerOut = (L: T.Layer, f0: number): { L: T.Layer; f: number; o: LayerOut } => { const f = L === "A_LOOP" ? f0 - N : f0; const fn = T.LAYER_FN[L === "A_LOOP" ? "A" : L]; return { L, f, o: fn(f) as LayerOut }; };
export const PoFilm: React.FC = () => {
  const f = useCurrentFrame(), ready = usePoReady();
  if (!ready) return <AbsoluteFill style={{ backgroundColor: "#0e4c5c" }} />;
  const active = T.LAYERS.map((Lr) => ({ Lr, op: T.layerOpacity(Lr, f) })).filter((a) => a.op > 0.001);
  return (<AbsoluteFill style={{ backgroundColor: "#0e4c5c" }}>
    {active.map((a, i) => { const { L, f: lf, o } = layerOut(a.Lr[0], f); const t = lf / 30;
      return <AbsoluteFill key={a.Lr[0]} style={{ opacity: i === 0 ? 1 : a.op }}>
        <PoSet c={o.c} t={t} emitters={o.emitters as Emitter[]} exposure={1.12 * (L === "E1" || L === "E2" ? T.exposureBoost(f) : 1)} dof={o.dof ?? 0.1} shadow={{ at: o.c.look, size: L === "C2" || L === "A2" || L === "B" || L === "I2" ? 14 : 8 }}
          world={({ hi, cam, view }) => <World L={L} o={o} f={lf} t={t} cam={cam} hi={hi} view={view} />} />
      </AbsoluteFill>; })}
  </AbsoluteFill>);
};
void THREE;
