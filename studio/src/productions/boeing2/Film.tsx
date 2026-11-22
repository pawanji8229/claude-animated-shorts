// The Boeing film: one CentSet per active story layer with planned opacity dissolves (no hard cuts). The two-worlds
// reveal is J1 (roof + rooftop town) dissolving into J2 (same camera, roof removed, the factory working below).
// The last two seconds dissolve into layer A's pre-roll so frame 1549 flows into frame 0 (seamless loop).
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useTexReady } from "../short3/tex";
import { useB2Ready } from "./pbr";
import { Car30, Truck30 } from "../short3/Vehicles";
import { CentSet, type Mood } from "../centennial/Set";
import { Toon } from "../centennial/chars";
import { InkCtx } from "../../inventor/Workshop";
import { MORNING, AERIAL, INSIDE, inkFor } from "./Test";
import { Factory } from "./factory";
import { RoofTown, City, tMats } from "./town";
import { Office, ModelTree, ModelHouse, OFFICE_AT } from "./office";
import { EnableClipping, LumberPile, RoadStripe, Derrick } from "./construction";
import { BuildingCamoHouse, camoAt } from "./models";
import { LOTS } from "./town";
import { ROOF_Y } from "./factory";
import * as T from "./timeline";
import { rng, type V3 } from "../../lib/math";

export const MOODS: Record<T.MoodName, Mood> = {
  morning: MORNING, aerial: AERIAL, inside: INSIDE,
  office: { bg: "#3a3430", sky: "#e8e2d4", ground: "#5a4a38", hemi: 0.7, env: 0.35, sun: { dir: [0.35, 0.55, -0.75], color: "#ffe8c8", i: 2.4, size: 8, at: OFFICE_AT }, exposure: 1.35, fog: { color: "#3a3430", near: 30, far: 120 }, warmCool: 0.35, vignette: 0.3 },
};

/** a loose flock of gulls / crows circling high over the plant (deterministic, loop-periodic: integer turns per film) */
const FLOCK = (() => { const r = rng(5); return Array.from({ length: 14 }, () => ({ cx: -60 + r() * 120, cz: -40 + r() * 120, R: 30 + r() * 60, y: 34 + r() * 30, k: (1 + Math.floor(r() * 2)) * (r() < 0.5 ? -1 : 1), ph: r() * 6.283 })); })();
const Birds: React.FC<{ f: number; k: number }> = ({ f, k }) => { const M = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a3a40", roughness: 0.8, side: THREE.DoubleSide }), []);
  const n = Math.round(FLOCK.length * k);
  return <>{FLOCK.slice(0, n).map((b, i) => { const a = b.ph + (f / T.FILM_FRAMES) * 6.283 * b.k, p: V3 = [b.cx + Math.cos(a) * b.R, b.y + Math.sin(a * 3) * 1.5, b.cz + Math.sin(a) * b.R];
    const flap = Math.sin(f * 0.55 + i * 1.7) * 0.6, yaw = -a + (b.k > 0 ? 0 : Math.PI);
    return <group key={i} position={p} rotation={[0, yaw, 0]}>
      <mesh material={M}><capsuleGeometry args={[0.09, 0.32, 3, 6]} /></mesh>
      {[1, -1].map((s) => <mesh key={s} material={M} position={[0, 0, s * 0.05]} rotation={[s * flap, 0, 0]}><boxGeometry args={[0.28, 0.02, 0.9]} /></mesh>)}
    </group>; })}</>; };

/** the canvas wall panel carried by two workers (layer F) */
const Panel: React.FC<{ a: V3; b: V3 }> = ({ a, b }) => { const W = tMats().walls[3], len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  return <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.25, (a[2] + b[2]) / 2]} rotation={[0, -Math.atan2(b[2] - a[2], b[0] - a[0]), 0]} material={W} castShadow><boxGeometry args={[len, 1.3, 0.06]} /></mesh>; };

const World: React.FC<{ o: T.LayerOut; hi: boolean; cam: V3; f: number }> = ({ o, hi, cam, f }) => (
  <InkCtx.Provider value={inkFor(cam[1] - (o.scene === "office" ? -12 : 0), hi)}>
    {o.scene === "office" ? <>
      <Office />
      {o.modelTrees?.map((p, i) => <ModelTree key={`t${i}`} p={p} />)}
      {o.heldTree && <ModelTree p={o.heldTree} />}
      {o.modelHouse && <ModelHouse p={o.modelHouse} seed={7} />}
      {o.heldHouse && <ModelHouse p={o.heldHouse} seed={7} />}
    </> : <>
      <Factory roof={o.roof} interior={o.interior} door={o.door} prop={o.prop} />
      {o.town !== "none" && <RoofTown mode={o.town} />}
      <City />
      {o.build && <><EnableClipping />{o.build.map((b) => { const L = LOTS.find((l) => l.i === b.lot)!.s; return <React.Fragment key={b.lot}><BuildingCamoHouse place={camoAt(L.x, ROOF_Y + 0.05, L.z, L.ry, b.lot)} prog={b.p} /><LumberPile lot={b.lot} left={1 - Math.min(1, b.p / 0.6)} /></React.Fragment>; })}</>}
      {o.stripe && <RoadStripe {...o.stripe} />}
      {o.derrick && <Derrick {...o.derrick} />}
      {o.panel && <Panel a={o.panel[0]} b={o.panel[1]} />}
      {o.vehicles?.map((v, i) => <group key={`v${i}`} position={v.p} rotation={[0, v.ry, 0]}>{v.kind === "truck" ? <Truck30 color={v.color} spin={v.spin} load={v.load ?? 0} /> : <Car30 color={v.color} spin={v.spin} />}</group>)}
      {(o.birds ?? 0) > 0 && <Birds f={f} k={o.birds!} />}
    </>}
    {o.actors.map((a, i) => <Toon key={`a${i}`} p={a} cam={cam} hi={hi} />)}
  </InkCtx.Provider>);

export const Boeing2Film: React.FC = () => {
  const f = useCurrentFrame(), ready0 = useTexReady(), ready1 = useB2Ready(), ready = ready0 && ready1;
  if (!ready) return <AbsoluteFill style={{ backgroundColor: "#c8d8e6" }} />;
  const active = T.LAYERS.map((Lr) => ({ Lr, op: T.layerOpacity(Lr, f) })).filter((a) => a.op > 0.001);
  return (<AbsoluteFill style={{ backgroundColor: "#c8d8e6" }}>
    {active.map((a, i) => { const o = T.layerAt(a.Lr[0], f);
      return <AbsoluteFill key={a.Lr[0]} style={{ opacity: i === 0 ? 1 : a.op }}>
        <CentSet c={o.c} m={MOODS[o.mood]} f={f} world={({ hi, cam }) => <World o={o} hi={hi} cam={cam} f={a.Lr[0] === "A_LOOP" ? f - T.FILM_FRAMES : f} />} />
      </AbsoluteFill>; })}
  </AbsoluteFill>);
};
