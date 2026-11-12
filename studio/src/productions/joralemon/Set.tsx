// joralemon set: the whole world for ONE era, seen by the shared camera. The Film stacks two Sets during an era
// dissolve (same camera, the world changes); cutaways are material-level (cut.tsx), never image wipes.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Post } from "../../lib/Post";
import { InkCtx } from "../../inventor/Workshop";
import { SetRig, RenderAfterMount, Toon, type Cam } from "../london-bridge/common";
import { Rod } from "../london-bridge/assets";
import { SkyEnv } from "../short3/SkyEnv";
import { lerp, smooth } from "../../lib/math";
const lerpHex = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
import { type Era, facadeCut, groundCut, tunnelFront, UNDER_ON } from "./world";
import { SubwayStatic, TrainNow, underAmt, Train1907, MuckCar, muckAt } from "./subway";
import { setCut } from "./cut";
import { HouseRows, House58, Ground, StreetFurniture, Trees } from "./street";
import { VentInterior, ventKits } from "./vent58";
import { HomeInterior, FadeKit } from "./home58";
import { UnderStatic, Shield, Airflow } from "./under";
import { Car, Bike, Lorry, HandCart, Derrick } from "./vehicles";
import { DogToon, GhostPlant, FanUnit, Foundation, Trestle, ghostGrow, ghostFold, xProgress } from "./extras";
import { heroAt, type Placed } from "./timeline";
import * as L from "./life";
import { jMats } from "./mats";

export type SetProps = { era: Era; camAt: (f: number) => Cam; frameOverride?: number; hideHero?: boolean; extra?: (c: Cam, hi: boolean, f: number) => React.ReactNode };
export const SUN: [number, number, number] = [-38, 62, 46];
/** No. 58 being converted (1907, scene 11): rooms emptied -> stripped to brick -> steel -> machinery lowered in -> walkways */
const Conversion: React.FC<{ f: number }> = ({ f }) => { const K = ventKits();
  const furn = 1 - smooth(1000, 1018, f), rooms = 1 - smooth(1016, 1032, f), frame = smooth(1028, 1040, f), mach = smooth(1036, 1054, f), walks = smooth(1046, 1058, f);
  return (<group>
    <HomeInterior furn={furn} rooms={rooms} floors={rooms} lights={rooms} />
    {f > 1012 && <FadeKit kit={K.shell} o={smooth(1012, 1022, f)} id="cshell" />}
    {frame > 0 && <FadeKit kit={K.frame} o={frame} id="cframe" />}
    {mach > 0 && <FadeKit kit={K.mach} o={Math.min(1, mach * 1.6)} id="cmach" dy={(1 - mach) * 6} />}
    {walks > 0 && <FadeKit kit={K.walks} o={walks} id="cwalks" />}
    {[[-1.2, 3.2, -3], [1.4, 5.5, -8], [0, 1.0, -6]].map((p, i) => <pointLight key={i} position={p as [number, number, number]} color="#ffe0b0" intensity={9 * smooth(1010, 1024, f)} distance={10} decay={1.5} />)}
  </group>);
};
export const JSet: React.FC<SetProps> = ({ era, camAt, frameOverride, hideHero, extra }) => {
  const cur = useCurrentFrame(); const f = frameOverride ?? cur; const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920, c = camAt(f), M = jMats();
  const cutY = facadeCut(f), gc = groundCut(f); setCut(cutY, gc);
  const warm = era === "1847" ? 1 : era === "1907" ? 0.55 : 0, under = c.pos[1] < -0.5 ? 1 : 0, sub = era === "now" && UNDER_ON(f), ua = sub ? underAmt(c.pos[1]) : 0;
  const post = { focusDist: c.focus, focusRange: 8, maxBlur: 0.12, bloom: 0.45, threshold: 1.7, exposure: lerp(1.32, 1.24, warm) + under * 0.2, vignette: 0.38, ss: hi ? 1 : 2, contrast: 1.08, saturation: lerp(1.05, 0.9, warm), lift: 0.012, warmCool: lerp(0.5, 0.95, warm), ao: 0.7, aoRadius: 0.55 };
  const toon = (p: Placed | null | undefined, key: string) => p ? <Toon key={key} pose={p.pose} pos={p.pos} cam={c.pos} h={p.h} hi={hi} halo={p.halo ?? 0.1} light={p.light ?? 0} flip={p.flip} /> : null;
  const now = era === "now", w1907 = era === "1907";
  const hero = now && !hideHero ? heroAt(f) : null, front = tunnelFront(f), lift = w1907 ? L.fanLift(f) : null, lorry = w1907 ? L.lorryAt(f) : null, cy = now ? L.cyclistAt(f) : null;
  return (
    <AbsoluteFill style={{ backgroundColor: "#a9c7e6" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.08, far: 900 }}>
        <SetRig c={c} bg={ua > 0.5 ? "#141312" : "#a9c7e6"} fog={ua > 0.01 ? [lerpHex("#d2dde6", "#1b1a18", ua), lerp(70, 5, ua), lerp(330, 62, ua)] : ["#d2dde6", 70, 330]} env={0.3} />
        <SkyEnv intensity={lerp(0.55, 0.16, ua)} warm={warm} />
        <InkCtx.Provider value={2.5 * k}>
          <mesh><sphereGeometry args={[700, 32, 16]} /><meshBasicMaterial side={THREE.BackSide} fog={false} depthWrite={false} color={now ? "#a3c6ea" : "#c4cfd8"} /></mesh>
          <hemisphereLight args={["#dde9ff", "#a8987e", lerp(1.5, 0.18, ua)]} />
          <directionalLight position={SUN} color={now ? "#fff2dc" : "#ffe2b8"} intensity={3.3 * (1 - ua)} castShadow
            shadow-mapSize={[hi ? 4096 : 2048, hi ? 4096 : 2048]} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-camera-far={260} shadow-bias={-0.0003} shadow-normalBias={0.035} />
          <Ground cut={gc > 0} />
          <HouseRows />
          <House58 mode={now ? "vent" : "home"} cut={cutY < 14} rooms={false} />
          {now && cutY < 14 && <VentInterior f={f} spin={f * 0.32} />}
          {era === "1847" && <HomeInterior />}
          {w1907 && (f < 1000 ? <HomeInterior /> : <Conversion f={f} />)}
          {gc > 0.001 && era !== "1847" && <UnderStatic front={now ? 99 : front} era={now ? "now" : "1907"} />}
          {gc > 0.001 && w1907 && front < 40 && <Shield x={front} />}
          {gc > 0.001 && w1907 && <Train1907 head={-70 + (f - 610) * 0.95} />}
          {gc > 0.001 && w1907 && (() => { const m = muckAt(f, front); return m ? <MuckCar p={m} /> : null; })()}
          {now && (gc > 0.001 || cutY < 2 || sub) && <Airflow f={f} amt={Math.max(gc, cutY < 2 || sub ? 1 : 0)} />}
          {sub && <SubwayStatic f={f} />}
          {sub && <TrainNow f={f} />}
          {sub && L.passengersAt(f, c.pos).map((p, i) => <Toon key={`px${i}`} pose={p.pose} pos={p.pos} cam={c.pos} h={p.h} hi={hi} halo={0.06} flip={p.flip} texScale={0.7} />)}
          {sub && L.tunnelCrewAt(f).map((p, i) => toon(p, `tw${i}`))}
          <StreetFurniture era={now ? "now" : "old"} />
          <Trees f={f} />
          {/* ---- today: traffic, parked cars, cyclist, pedestrians, dog, the hero */}
          {now && L.PARKED.map((p, i) => <group key={`pk${i}`} position={p.p} rotation={[0, p.ry, 0]}><Car type={p.type} color={p.color} spin={0} /></group>)}
          {now && L.carsAt(f).map((p, i) => <group key={`car${i}`} position={p.p} rotation={[0, p.ry, 0]}><Car type={p.type} color={p.color} spin={p.spin} /></group>)}
          {cy && <group position={cy.pos}><Bike spin={cy.spin} /></group>}
          {cy && toon({ pose: cy.pose, pos: [cy.pos[0] - 0.1, 0.32, cy.pos[2]], h: 1.42, halo: 0.08 }, "cyc")}
          {now && L.pedsAt(f).map((p, i) => toon(p, `pd${i}`))}
          {now && L.dogsAt(f).map((d, i) => <DogToon key={`dog${i}`} pos={d.pos} cam={c.pos} phase={d.phase} flip={d.flip} hi={hi} />)}
          {now && L.leashes(f).map((l, i) => <Rod key={`lsh${i}`} a={l.a} b={l.b} r={0.008} m={M.drapeRed} shadow={false} />)}
          {toon(hero, "hero")}
          {extra?.(c, hi, f)}
          {/* ---- 1847: the family */}
          {era === "1847" && L.familyAt(f).map((p, i) => toon(p, `fam${i}`))}
          {/* ---- 1907: works, tunnel gang, lorry + fan, derrick, engineer, residents, conversion crew, the imagined plant */}
          {w1907 && L.crewAt(f).map((p, i) => <group key={`crew${i}`}>{toon(p, `cr${i}`)}{p.cart && <group position={p.cart.p}><HandCart spin={p.cart.spin} /></group>}</group>)}
          {w1907 && gc > 0.001 && L.tunnelGangAt(f, front).map((p, i) => toon(p, `tg${i}`))}
          {w1907 && lorry && <group position={lorry.p}><Lorry spin={lorry.spin}>{lorry.fanOn && <group position={[0, 1.15, 0]} rotation={[0, Math.PI / 2, 0]}><FanUnit spin={0} /></group>}</Lorry></group>}
          {w1907 && lift && f >= 690 && f < 1000 && <group position={L.DERRICK_AT}><Derrick luff={lift.luff} slew={lift.slew} hookY={lift.hook[1]} /></group>}
          {w1907 && f >= 700 && f < 1000 && <group position={L.FAN_SITE}><Foundation /></group>}
          {w1907 && lift && lift.fanAt && f < 1000 && <group position={f < 748 ? lift.fanAt : [L.FAN_SITE[0], 1.45, L.FAN_SITE[2]]} rotation={[0, 0.3, 0]}><FanUnit spin={lift.spin} /></group>}
          {w1907 && f >= 600 && f < 1000 && <group position={L.TRESTLE}><Trestle xU={xProgress(f)} /></group>}
          {w1907 && toon(L.engineerAt(f), "eng")}
          {w1907 && L.residentsAt(f).map((p, i) => toon(p, `res${i}`))}
          {w1907 && L.convCrewAt(f).map((p, i) => toon(p, `cc${i}`))}
          {w1907 && L.shellCrewAt(f).map((p, i) => toon(p, `sc${i}`))}
          {w1907 && <GhostPlant grow={ghostGrow(f)} fold={ghostFold(f)} f={f} />}
        </InkCtx.Provider>
        <Post params={post} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
