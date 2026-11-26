// The Centennial Light film: one CentSet per active story layer, planned opacity dissolves between layers (no hard
// cuts). The last second dissolves into layer A's pre-roll, so frame 1606 flows into frame 0 (seamless loop).
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useTexReady } from "../short3/tex";
import { Car30 } from "../short3/Vehicles";
import { CentSet, type Mood } from "./Set";
import { CentennialLight, Dust, filamentAt } from "./bulb";
import { OldStation, Fixtures, OLD_BULB, OLD_NEXT } from "./oldStation";
import { OldStreet } from "./street";
import { Station6, RollingLadder, Monitor, S6_BULB, DESK_AT } from "./station6";
import { HoseCart, Apparatus, Sedan70 } from "./vehicles";
import { StepLadder, PaddedBox, Lantern, Flashlight, Cord } from "./props";
import { Toon } from "./chars";
import * as T from "./timeline";
import type { V3 } from "../../lib/math";

export const MOODS: Record<T.MoodName, Mood> = {
  dayInt: { bg: "#bcd4e6", sky: "#e2ecf6", ground: "#9a7a58", hemi: 0.85, env: 0.4, sun: { dir: [0.85, 0.5, 0.35], color: "#fff0d6", i: 2.8, size: 16, at: [0, 1.5, -6] }, exposure: 1.48, fog: { color: "#d8e2ea", near: 40, far: 320 }, warmCool: 0.5 },
  dayInt38: { bg: "#bcd4e6", sky: "#e2ecf6", ground: "#9a7a58", hemi: 0.85, env: 0.4, sun: { dir: [0.7, 0.55, 0.5], color: "#ffeed4", i: 2.6, size: 16, at: [0, 1.5, -6] }, exposure: 1.45, fog: { color: "#d8e2ea", near: 40, far: 320 }, warmCool: 0.45, saturation: 1.02 },
  nightOld: { bg: "#0c1220", sky: "#3a4a78", ground: "#1a140e", hemi: 0.22, env: 0.12, sun: { dir: [0.75, 0.55, 0.5], color: "#8aa2dc", i: 0.55, size: 16, at: [0, 1.5, -6] }, exposure: 2.0, fog: { color: "#101828", near: 25, far: 160 }, warmCool: 0.9, vignette: 0.45 },
  dayExt: { bg: "#b8d0e4", sky: "#dce8f4", ground: "#b8a07a", hemi: 1.0, env: 0.45, sun: { dir: [0.55, 0.75, 0.6], color: "#fff0d8", i: 2.7, size: 26 }, exposure: 1.05, fog: { color: "#c9d8e4", near: 60, far: 420 } },
  dusk6: { bg: "#1c2638", sky: "#5d6e98", ground: "#2e2620", hemi: 0.5, env: 0.3, sun: { dir: [0.25, 0.3, 1.0], color: "#8ea6dc", i: 0.95, size: 18, at: [0, 2, -6] }, exposure: 1.38, fog: { color: "#1c2638", near: 30, far: 200 }, warmCool: 0.85, vignette: 0.38 },
  night6: { bg: "#0b1018", sky: "#33405e", ground: "#16120e", hemi: 0.2, env: 0.12, sun: { dir: [0.3, 0.4, 1.0], color: "#7a90c8", i: 0.45, size: 18, at: [0, 2, -6] }, exposure: 1.75, fog: { color: "#0b1018", near: 25, far: 150 }, warmCool: 0.9, vignette: 0.45 },
  day6: { bg: "#c4d6e6", sky: "#e8f0f8", ground: "#8a8478", hemi: 0.95, env: 0.5, sun: { dir: [0.3, 0.75, 0.75], color: "#fff4e0", i: 2.6, size: 22, at: [0, 0, -4] }, exposure: 1.08, warmCool: 0.25, saturation: 1.02 },
  day6ext: { bg: "#b8d0e4", sky: "#dce8f4", ground: "#8a8478", hemi: 1.0, env: 0.45, sun: { dir: [0.5, 0.75, 0.6], color: "#fff0d8", i: 2.7, size: 26 }, exposure: 1.05, fog: { color: "#c9d8e4", near: 60, far: 420 } },
};
const N = T.FILM_FRAMES;

/** a short cut cord left hanging from the ceiling after the 1976 cut */
const CutStub: React.FC = () => <Cord pts={[[OLD_BULB[0], OLD_BULB[1], OLD_BULB[2]], [OLD_BULB[0] + 0.01, OLD_BULB[1] - 0.18, OLD_BULB[2]], [OLD_BULB[0] + 0.03, OLD_BULB[1] - 0.34, OLD_BULB[2] + 0.01]]} r={0.005} />;
/** interior bounce/fill: soft warm points under the ceiling (no shadows) so wood + brick read in daylight */
const OldFill: React.FC<{ k: number }> = ({ k }) => <>{[[0, 3.6, -2], [-3, 3.6, -6], [3, 3.6, -6], [0, 3.6, -10.5]].map((p, i) => <pointLight key={i} position={p as V3} color="#ffe2c0" intensity={0.55 * k} distance={9} decay={1.4} />)}</>;
/** Station 6 practicals: desk lamp (warm), exit sign (red), wall pack over the rear door (cool) */
const S6Practicals: React.FC<{ night: boolean }> = ({ night }) => <>
  <pointLight position={[DESK_AT[0] + 0.1, 1.25, DESK_AT[2] + 0.5]} color="#ffc890" intensity={night ? 0.8 : 1.1} distance={4.5} decay={1.6} />
  <mesh position={[DESK_AT[0] + 0.05, 1.08, DESK_AT[2] + 0.55]}><coneGeometry args={[0.09, 0.12, 16, 1, true]} /><meshStandardMaterial color="#2a4a3a" side={THREE.DoubleSide} emissive="#ffd8a0" emissiveIntensity={0.4} /></mesh>
  <mesh position={[-4.45, 2.45, -15.68]}><boxGeometry args={[0.36, 0.16, 0.05]} /><meshBasicMaterial color={new THREE.Color(2.2, 0.25, 0.2)} toneMapped={false} /></mesh>
  <pointLight position={[-4.45, 2.3, -15.4]} color="#ff3020" intensity={0.25} distance={3} />
  <pointLight position={[0, 4.6, -14.8]} color="#cfe0ff" intensity={night ? 0.35 : 0.5} distance={9} decay={1.5} />
</>;

const World: React.FC<{ o: T.LayerOut; hi: boolean; cam: V3 }> = ({ o, hi, cam }) => { const t = o.t;
  return (<>
    {o.set === "old" ? <><OldStation era={o.era} fixOn={o.fixOn} /><OldStreet era={o.era} />{(o.warmFill ?? 0) > 0 && <OldFill k={o.warmFill!} />}</>
      : <><Station6 highbay={o.highbay ?? 0} doors={o.doors6 ?? [1, 1]} outside={o.outside} /><S6Practicals night={o.mood === "night6"} /></>}
    {o.bulb.p[1] > -10 && <CentennialLight p={o.bulb.p} drop={o.bulb.drop} glow={o.bulb.glow} shadow={o.mood === "nightOld" || o.mood === "night6"} />}
    {o.stubCord && <CutStub />}
    {o.next && <Fixtures era={o.next.era} at={[OLD_NEXT]} on={[o.next.glow]} drop={o.next.drop} />}
    {(o.dust ?? 0) > 0 && <Dust at={filamentAt(o.set === "old" ? OLD_BULB : S6_BULB, o.set === "old" ? 1.13 : 0.95)} t={t} glow={o.bulb.glow * (o.dust ?? 1)} n={110} size={[0.9, 0.7, 0.9]} />}
    {o.app?.map((a, i) => <group key={i} position={a.p} rotation={[0, a.ry, 0]}>{a.type === "cart" ? <HoseCart spin={a.spin} /> : <Apparatus type={a.type} spin={a.spin} />}</group>)}
    {o.cars?.map((c, i) => <group key={`c${i}`} position={c.p} rotation={[0, c.ry, 0]}>{c.kind === "car30" ? <Car30 color={c.color ?? "#3a4a3a"} spin={c.spin ?? 0} /> : <Sedan70 color={c.color} police={c.kind === "police"} spin={c.spin} />}</group>)}
    {o.step && <StepLadder p={o.step.p} ry={o.step.ry} />}
    {o.box && <PaddedBox p={o.box.p} ry={o.box.ry} open={o.box.open} />}
    {o.lanterns?.map((l, i) => <Lantern key={`l${i}`} p={l.p} lit={l.lit} />)}
    {o.flash && <Flashlight p={o.flash.p} to={o.flash.to} on={o.flash.on} />}
    {o.cords?.map((c, i) => <Cord key={`k${i}`} pts={c.pts} r={c.r} color={c.color} />)}
    {o.ladder6 && <RollingLadder p={o.ladder6.p} ry={o.ladder6.ry} />}
    {o.monitor && <Monitor glow={o.monitor.glow} sec={o.monitor.sec} />}
    {o.actors.map((a, i) => <Toon key={`a${i}`} p={a} cam={cam} hi={hi} />)}
  </>);
};

export const CentFilm: React.FC = () => {
  const f = useCurrentFrame(), ready = useTexReady();
  if (!ready) return <AbsoluteFill style={{ backgroundColor: "#1c2638" }} />;
  const active = T.LAYERS.map((Lr) => ({ Lr, op: T.layerOpacity(Lr, f) })).filter((a) => a.op > 0.001);
  return (<AbsoluteFill style={{ backgroundColor: "#1c2638" }}>
    {active.map((a, i) => { const o = T.layerAt(a.Lr[0], f); const m = MOODS[o.mood]; const mood = o.exposure ? { ...m, exposure: o.exposure } : m;
      return <AbsoluteFill key={a.Lr[0]} style={{ opacity: i === 0 ? 1 : a.op }}>
        <CentSet c={o.c} m={mood} f={f} world={({ hi, cam }) => <World o={o} hi={hi} cam={cam} />} />
      </AbsoluteFill>; })}
  </AbsoluteFill>);
};
void N;
