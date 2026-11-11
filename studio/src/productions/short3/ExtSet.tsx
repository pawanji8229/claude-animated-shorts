// short3 EXT: a 1930 American city block at midday -> late afternoon. Detailed PBR architecture (Hero, Neighbours,
// Street), skyline, traffic + streetcar + timber truck, crawler crane with wrecking ball, the move rig (timber cribs,
// riveted steel I-beams, rollers, screw jacks, service lines), stakes + rope of the new footprint, the new HQ steel
// frame, pedestrians, onlookers, crew, window crowd, smoke from the site hut and the crane. No text except in-world signs.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Post } from "../../lib/Post";
import { InkCtx, Ink } from "../../inventor/Workshop";
import { V3, rng, smooth, lerp } from "../../lib/math";
import { SetRig, RenderAfterMount, Toon } from "../london-bridge/common";
import { Rod } from "../london-bridge/assets";
import { BW, BD, BH, NEW_HQ, T, bldAt, sunAt } from "./world";
import * as TL from "./timeline";
import { Kit, KitMesh, once } from "./kit";
import { archMats } from "./archKit";
import { HeroBuilding } from "./Hero";
import { StreetBuildings } from "./Neighbours";
import { StreetStatic, Skyline, WIRE_Y } from "./Street";
import { Car30, Truck30, Streetcar, Crane30 } from "./Vehicles";
import { SkyEnv } from "./SkyEnv";
import * as L from "./life";

// ---------------------------------------------------------------- the moving equipment (building-local)
const rigKits = () => once("rig", () => {
  const M = archMats(), cribs: Kit[] = [], r = rng(7);
  for (let i = 0; i < 12; i++) { const k = new Kit(), n = 3 + (i % 2); for (let l = 0; l < n; l++) { const rot = l % 2 ? Math.PI / 2 : 0; for (const o of [-0.32, 0.32]) k.box(M.timber, [0.22, 0.2, 1.2], [rot ? 0 : o, 0.1 + l * 0.2, rot ? o : 0], [0, rot, 0]); }
    cribs.push(k); void r; }
  const beams = new Kit(); for (let b = 0; b < 6; b++) { const x = -BW / 2 + 2 + b * ((BW - 4) / 5), L0 = BD + 1.6;
    beams.span(M.redSteel, [x - 0.18, 0.4, -L0 / 2], [x + 0.18, 0.46, L0 / 2]); beams.span(M.redSteel, [x - 0.18, 0.2, -L0 / 2], [x + 0.18, 0.26, L0 / 2]); beams.span(M.redSteel, [x - 0.025, 0.26, -L0 / 2], [x + 0.025, 0.4, L0 / 2]);
    for (let z = -L0 / 2 + 0.3; z < L0 / 2; z += 0.45) for (const s of [-1, 1]) beams.sphere(M.ironPaint, 0.018, [x + s * 0.12, 0.465, z], [1, 0.6, 1], { ink: false }); }
  const jack = new Kit(); jack.lathe(M.ironPaint, [[0, 0], [0.26, 0], [0.24, 0.08], [0.17, 0.12], [0.15, 0.42], [0.11, 0.46], [0, 0.46]], [0, 0, 0], 16); jack.cyl(M.castIron, 0.07, 0.07, 0.25, [0, 0.58, 0], [0, 0, 0], 10); jack.cyl(M.ironPaint, 0.13, 0.13, 0.08, [0, 0.72, 0], [0, 0, 0], 12);
  for (let t = 0; t < 10; t++) jack.span(M.castIron, [-0.012, 0.47 + t * 0.022, -0.075], [0.012, 0.48 + t * 0.022, 0.075], { ink: false });
  const bar = new Kit(); bar.cyl(M.castIron, 0.028, 0.028, 2.2, [0, 0, 0], [0, 0, Math.PI / 2], 8); bar.span(M.rubber, [0.85, -0.04, -0.04], [1.1, 0.04, 0.04], { ink: false });
  const roller = new Kit(); roller.cyl(M.castIron, 0.12, 0.12, 1.0, [0, 0, 0], [0, 0, Math.PI / 2], 16); for (let g = 0; g < 4; g++) roller.span(M.rust, [-0.5, -0.005, -0.122 + (g % 2) * 0.244 - 0.004], [0.5, 0.005, -0.122 + (g % 2) * 0.244 + 0.004], { ink: false });
  return { cribs, beams, jack, bar, roller };
});
const MoveRig: React.FC<{ f: number; build: number; rollAngle: number }> = ({ f, build, rollAngle }) => {
  const R = rigKits(), shown = Math.floor(build * 12 + 0.001);
  return (<group>
    {build > 0.35 && <KitMesh kit={R.beams} />}
    {build > 0.55 && Array.from({ length: 10 }, (_, k) => <group key={k} position={[-BW / 2 + 1.5 + k * ((BW - 3) / 9), 0.12, BD / 2 + 0.55]} rotation={[rollAngle, 0, 0]}><KitMesh kit={R.roller} /></group>)}
    {R.cribs.slice(0, shown).map((c, i) => <group key={i} position={[-BW / 2 + 1 + i * ((BW - 2) / 11), 0, BD / 2 + 0.95]} rotation={[0, (i % 3 - 1) * 0.04, 0]}><KitMesh kit={c} /></group>)}
    {build > 0.8 && Array.from({ length: 6 }, (_, k) => <group key={`j${k}`} position={[-BW / 2 + 2.5 + k * ((BW - 5) / 5), 0, BD / 2 + 2.2]}>
      <KitMesh kit={R.jack} /><group position={[0, 0.62, 0]} rotation={[0, TL.jackTurn(k, f), 0]}><KitMesh kit={R.bar} /></group></group>)}
    {build > 0.9 && [[-8, 0.10], [-5, 0.13], [7, 0.11]].map(([x, r], k) => <ServiceLine key={k} x={x} r={r} />)}
  </group>);
};
const ServiceLine: React.FC<{ x: number; r: number }> = ({ x, r }) => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.9, BD / 2 + 0.2), new THREE.Vector3(x + 0.6, 0.2, BD / 2 + 1.5), new THREE.Vector3(x + 0.2, 0.06, BD / 2 + 3.2), new THREE.Vector3(x - 0.5, 0.06, BD / 2 + 4.6)]), 32, r, 8), [x, r]);
  return <mesh geometry={geo} material={archMats().rubber} castShadow><Ink k={0.5} /></mesh>;
};

// ---------------------------------------------------------------- smoke (soft billboards rising + spreading, deterministic)
const smokeTex = () => once("smokeTex", () => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!; const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, "rgba(235,230,222,0.55)"); gr.addColorStop(0.6, "rgba(215,210,200,0.22)"); gr.addColorStop(1, "rgba(200,195,190,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; });
const Smoke: React.FC<{ at: V3; f: number; n?: number; rate?: number; dark?: number; seed?: number }> = ({ at, f, n = 9, rate = 0.012, dark = 0, seed = 0 }) => (<>
  {Array.from({ length: n }, (_, i) => { const life = ((f * rate + i / n + seed * 0.13) % 1 + 1) % 1, s = 0.35 + life * 2.2, wob = Math.sin((i + seed) * 2.3 + f * 0.03) * 0.3;
    return <sprite key={i} position={[at[0] + life * 2.2 + wob, at[1] + life * 3.2, at[2] + wob * 0.5]} scale={[s, s, 1]}><spriteMaterial map={smokeTex()} transparent opacity={(1 - life) * 0.55} color={new THREE.Color().setScalar(1 - dark * 0.55)} depthWrite={false} /></sprite>; })}
</>);

// ---------------------------------------------------------------- the set
export const ExtSet: React.FC<{ from: number; worldMin?: number }> = ({ from, worldMin }) => {
  const f = useCurrentFrame() + from, wf = Math.max(f, worldMin ?? -1e9);   // wf = world time (a time-dissolve layer can start later than the camera)
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920;
  const c = TL.camExt(f);
  const M = archMats();
  const b = bldAt(wf), rig = TL.rigBuild(wf), lift = rig > 0.5 ? 0.62 : 0;
  const sun = sunAt(wf), sunPos: V3 = [lerp(-58, -80, sun), lerp(96, 46, sun), lerp(42, 26, sun)];
  const people = TL.extPeople(wf, c.pos), win = TL.windowPeople(wf), peds = L.pedsAt(wf);
  const cr = TL.craneAt(wf), hq = TL.hqRise(wf), stakes = TL.stakesOn(wf), truck = L.truckAt(wf), stc = L.streetcarAt(wf);
  const toBld = (lp: V3): V3 => { const cs = Math.cos(b.ry), sn = Math.sin(b.ry); return [b.p[0] + lp[0] * cs + lp[2] * sn, lp[1] + lift, b.p[2] - lp[0] * sn + lp[2] * cs]; };
  return (
    <AbsoluteFill style={{ backgroundColor: "#9ec3e6" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.1, far: 1400 }}>
        <SetRig c={c} bg="#9ec3e6" fog={["#cdd8e0", 110, 560]} env={0.3} />
        <SkyEnv intensity={0.6} warm={sun} />
        <InkCtx.Provider value={2.6 * k}>
          <mesh><sphereGeometry args={[900, 32, 16]} /><meshBasicMaterial side={THREE.BackSide} fog={false} depthWrite={false} color="#9fc4ea" /></mesh>
          <hemisphereLight args={["#dbe8ff", "#a48c6c", 1.35]} />
          <directionalLight position={sunPos} color={new THREE.Color().lerpColors(new THREE.Color("#fff3df"), new THREE.Color("#ffc890"), sun)} intensity={3.0} castShadow
            shadow-mapSize={[hi ? 4096 : 2048, hi ? 4096 : 2048]} shadow-camera-left={-55} shadow-camera-right={55} shadow-camera-top={55} shadow-camera-bottom={-55} shadow-camera-far={320} shadow-bias={-0.0003} shadow-normalBias={0.04} />
          <StreetStatic /><StreetBuildings /><Skyline />
          {/* the office block + its moving rig, positioned by the move path */}
          <group position={[b.p[0], 0, b.p[2]]} rotation={[0, b.ry, 0]}>
            <group position={[0, lift, 0]}><HeroBuilding /></group>
            {rig > 0 && <MoveRig f={wf} build={rig} rollAngle={TL.rollerAngle(wf)} />}
          </group>
          {/* flag on the roof */}
          <group position={toBld([0, BH + 1.85, BD / 2 - 0.6])}><mesh position={[0, 3.2, 0]} material={M.frameWhite}><cylinderGeometry args={[0.05, 0.08, 6.4, 8]} /></mesh><mesh position={[0, 6.45, 0]} material={M.brass}><sphereGeometry args={[0.12, 10, 8]} /></mesh><Flag f={f} /></group>
          {/* window workers (crowd cards inside the lit rooms, behind the glass) */}
          {win.map((w, i) => <Toon key={`win${i}`} pose={w.pose} pos={toBld(w.local)} cam={c.pos} h={w.h} hi={hi} halo={0.08} />)}
          {/* traffic */}
          {L.PARKED.map((p, i) => <group key={`pk${i}`} position={p.p} rotation={[0, p.ry, 0]}><Car30 color={p.color} spin={0} /></group>)}
          {L.carsAt(wf).map((p, i) => <group key={`car${i}`} position={p.p} rotation={[0, p.ry, 0]}><Car30 color={p.color} spin={p.spin} /></group>)}
          {stc && <group position={stc.p} rotation={[0, stc.ry, 0]}><Streetcar wireY={WIRE_Y + 0.13} /></group>}
          {truck && <group position={truck.p}><Truck30 color="#3a4a2a" spin={truck.spin} load={Math.round(truck.load * 12) / 12} /></group>}
          {cr.on && <group position={[cr.x, 0.02, cr.z]} rotation={[0, Math.PI, 0]}><Crane30 phase={cr.phase} yaw={cr.yaw} swing={cr.swing} swingZ={cr.swingZ} ropeL={cr.rope} /></group>}
          {cr.on && <Smoke at={[cr.x + 1.4, 5.5, cr.z - 0.6]} f={f} n={8} rate={0.03} dark={0.6} seed={1} />}
          <Smoke at={[-54.6, 4.0, -2.6]} f={f} n={8} rate={0.008} dark={0.2} seed={3} />
          {/* footprint of the planned new HQ: stakes + rope at knee height, running straight through the old walls */}
          {stakes > 0 && <group>{TL.stakePoints().map((p, i, a) => { const q = a[(i + 1) % a.length]; const vis = i / a.length < stakes; return vis ? <group key={i}>
            <mesh position={[p[0], 0.45, p[2]]} material={M.timber} castShadow><boxGeometry args={[0.07, 0.9, 0.07]} /><Ink k={0.5} /></mesh>
            <mesh position={[p[0], 0.93, p[2]]} material={M.red}><boxGeometry args={[0.09, 0.08, 0.09]} /></mesh>
            <Rod a={[p[0], 0.75, p[2]]} b={[q[0], 0.75, q[2]]} r={0.014} m={M.cream} shadow={false} />
          </group> : null; })}</group>}
          {/* new HQ steel frame rising on the old site */}
          {hq > 0 && <HQSteel hq={hq} />}
          {/* engineer's trestle with plans */}
          {TL.trestleOn(wf) && <group position={TL.TRESTLE}>
            {[-0.6, 0.6].map((x) => <mesh key={x} position={[x, 0.45, 0]} material={M.timber} castShadow><boxGeometry args={[0.08, 0.9, 0.7]} /><Ink k={0.5} /></mesh>)}
            <mesh position={[0, 0.92, 0]} material={M.timber} castShadow><boxGeometry args={[1.6, 0.05, 0.8]} /><Ink k={0.6} /></mesh>
            <mesh position={[0, 0.955, 0]} rotation={[-Math.PI / 2, 0, 0]} material={TL.planMat(M.paper)}><planeGeometry args={[1.4, 0.7]} /></mesh>
          </group>}
          {/* wooden gangway to the entrance at the new position */}
          {TL.gangwayOn(wf) && <group position={toBld([0, 0, BD / 2 + 2.3])} rotation={[0, b.ry, 0]}>
            <mesh position={[0, 0.35, 0]} rotation={[0.18, 0, 0]} material={M.timber} castShadow receiveShadow><boxGeometry args={[2.2, 0.12, 4.0]} /><Ink k={0.6} /></mesh>
            {[-1.05, 1.05].map((x) => <mesh key={x} position={[x, 0.95, 0]} rotation={[0.18, 0, 0]} material={M.timberDk}><boxGeometry args={[0.06, 0.06, 4.0]} /></mesh>)}
          </group>}
          {TL.blueprintAt(wf, c.pos) && (() => { const bp = TL.blueprintAt(wf, c.pos)!; return <mesh position={bp.p} rotation={[0, bp.ry, 0]} material={TL.planMat(M.paper)} castShadow><planeGeometry args={[bp.w, 0.5]} /><Ink k={0.4} /></mesh>; })()}
          {/* people on the ground */}
          {people.map((p, i) => <Toon key={i} pose={p.pose} pos={p.pos} cam={c.pos} h={p.h} hi={hi} light={p.light ?? 0} halo={p.halo ?? 0.12} flip={p.flip} />)}
          {people.filter((p) => p.carry).map((p, i) => <Rod key={`cy${i}`} a={p.carry!.a} b={p.carry!.b} r={0.1} m={M.timber} />)}
          {cr.on && (() => { const cs = Math.cos(cr.yaw), sn = Math.sin(cr.yaw), lx = 1.45 * cs + 0.62 * sn, lz = -1.45 * sn + 0.62 * cs; return <Toon pose={TL.craneOperator(wf)} pos={[cr.x - lx, 1.78, cr.z - lz]} cam={c.pos} h={1.45} hi={hi} halo={0.1} light={1.5} />; })()}
          {peds.map((p, i) => <Toon key={`pd${i}`} pose={p.pose} pos={p.pos} cam={c.pos} h={p.h} hi={hi} halo={p.halo ?? 0.08} flip={p.flip} />)}
        </InkCtx.Provider>
        <Post params={{ focusDist: c.focus, focusRange: 7, maxBlur: 0.14, bloom: 0.5, threshold: 1.7, exposure: 1.24, vignette: 0.4, ss: hi ? 1 : 2, contrast: 1.1, saturation: 1.06, lift: 0.01, warmCool: 0.55 + sun * 0.3, ao: 0.65, aoRadius: 0.6 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
const Flag: React.FC<{ f: number }> = ({ f }) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(2.0, 1.2, 16, 6), []), mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b8302a", roughness: 0.8, side: THREE.DoubleSide }), []);
  const p = geo.attributes.position as THREE.BufferAttribute, base = useMemo(() => Float32Array.from(p.array as Float32Array), [p]);
  for (let i = 0; i < p.count; i++) { const x = base[i * 3] + 1.0, y = base[i * 3 + 1]; p.setXYZ(i, x, y, Math.sin(x * 2.4 - f * 0.22) * 0.12 * x + Math.sin(y * 3 + f * 0.13) * 0.03); }
  p.needsUpdate = true; geo.computeVertexNormals();
  return <mesh geometry={geo} material={mat} position={[0, 5.6, 0]} castShadow />;
};
/** riveted steel frame of the new headquarters: columns rise in sequence, then girders at each floor */
const HQSteel: React.FC<{ hq: number }> = ({ hq }) => {
  const M = archMats(), cols = TL.hqColumns(), H = 11;
  const colKit = useMemo(() => { const k = new Kit(); k.span(M.redSteel, [-0.16, 0, -0.03], [0.16, 1, 0.03]); for (const s of [-1, 1]) k.span(M.redSteel, [-0.16, 0, s * 0.15 - 0.025], [0.16, 1, s * 0.15 + 0.025]); return k; }, [M]);
  return (<group>
    {cols.map((p, i) => { const h = Math.max(0.01, Math.min(H, hq * H * 1.4 - (i % 5) * 1.6)); return <group key={i} position={p} scale={[1, h, 1]}><KitMesh kit={colKit} /></group>; })}
    {[3.7, 7.4, 11].map((y, j) => hq > 0.45 + j * 0.15 && <group key={y}>
      {Array.from({ length: 6 }, (_, g) => { const z = NEW_HQ.z0 + 2 + g * 6; return z <= NEW_HQ.z1 - 2 ? <mesh key={g} position={[(NEW_HQ.x0 + NEW_HQ.x1) / 2, y, z]} material={M.redSteel} castShadow><boxGeometry args={[NEW_HQ.x1 - NEW_HQ.x0 - 4, 0.4, 0.22]} /><Ink k={0.5} /></mesh> : null; })}
      {Array.from({ length: 6 }, (_, g) => { const x = NEW_HQ.x0 + 2 + g * 6; return x <= NEW_HQ.x1 - 2 ? <mesh key={`x${g}`} position={[x, y - 0.02, (NEW_HQ.z0 + NEW_HQ.z1) / 2]} material={M.redSteel} castShadow><boxGeometry args={[0.2, 0.36, NEW_HQ.z1 - NEW_HQ.z0 - 4]} /><Ink k={0.5} /></mesh> : null; })}
    </group>)}
  </group>);
};
export { smooth };
