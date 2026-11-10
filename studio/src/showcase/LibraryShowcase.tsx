// TwistFrame Lab — library showcase + benchmark film (pipeline v3). Five shot types the stories keep needing, built
// from the CC0 library (assets/registry.json) and the original procedural vehicles, joined by opacity dissolves:
//   1 character close-up (interior)   2 city street at dusk   3 construction site with machinery
//   4 harbour: water + ship           5 crowd on a plaza       (+ the dissolves = location transitions)
// Earless 2D cards (Toon) in detailed 3D, outlined, glowing faces; no captions. Every motion is a pure function of
// the frame number (deterministic; safe with __singleRender).
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Post } from "../lib/Post";
import { InkCtx } from "../inventor/Workshop";
import { Toon, camPath, type Cam } from "../productions/london-bridge/common";
import { Excavator5, Truck5, GraniteBlock, rippleNormal, type ExcQ } from "../productions/london-bridge/assets";
import { COSTUME, pose5, type Odo5Pose } from "../char/odo5";
import { CROWD, crowdPose } from "../productions/reopening/scene";
import { Ground, HdriEnvironment, Instanced, Model, PbrBox, Water, scatter } from "../lib/library/components";
import { quality } from "../lib/library/quality";
import { Building, Fence, KitPart, Pier } from "../lib/library/kits";
import { SceneAudit } from "../lib/library/SceneAudit";

type V3 = [number, number, number];
export const SHOT = 45, XF = 12, SHOTS = 5, SHOWCASE_FRAMES = SHOT * SHOTS + XF;   // 237 frames, 7.9 s
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const Rig: React.FC<{ c: Cam; fog?: [string, number, number]; bg?: string }> = ({ c, fog, bg }) => {
  const { camera, scene } = useThree();
  useLayoutEffect(() => {
    if (bg) scene.background = new THREE.Color(bg); scene.fog = fog ? new THREE.Fog(fog[0], fog[1], fog[2]) : null;
    const cam = camera as THREE.PerspectiveCamera; cam.position.set(...c.pos); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = 0.05; cam.far = 600; cam.updateProjectionMatrix();
  });
  return null;
};
/** shared canvas shell: shadows sized by quality profile, outline ink scale, post at profile supersampling */
const Shot: React.FC<{ c: Cam; children: React.ReactNode; post?: Partial<React.ComponentProps<typeof Post>["params"]>; fog?: [string, number, number]; bg?: string; label?: string }> = ({ c, children, post, fog, bg, label = "shot" }) => {
  const { width, height } = useVideoConfig(); const q = quality();
  return (
    <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.05, far: 600 }}>
      <Rig c={c} fog={fog} bg={bg} />
      <SceneAudit label={label} />
      <InkCtx.Provider value={2.8 * (height / 1920)}>{children}</InkCtx.Provider>
      <Post params={{ focusDist: c.focus, focusRange: 6, maxBlur: q.dof ? 0.1 : 0, bloom: 0.5, threshold: 1.6, exposure: 1.0, vignette: 0.45, ss: q.ss, contrast: 1.1, saturation: 1.1, lift: 0.01, warmCool: 0.5, ao: q.ao, aoRadius: 0.5, ...post }} />
    </ThreeCanvas>
  );
};
const Sun: React.FC<{ pos: V3; color?: string; intensity?: number; span?: number; target?: V3 }> = ({ pos, color = "#fff1dc", intensity = 2.4, span = 14, target = [0, 0, 0] }) => {
  const q = quality();
  const light = useMemo(() => { const l = new THREE.DirectionalLight(color, intensity); l.castShadow = true; l.shadow.mapSize.set(q.shadowMap, q.shadowMap);
    Object.assign(l.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: 220 }); l.shadow.bias = -0.0004; l.shadow.normalBias = 0.02; return l; }, [color, intensity, span, q.shadowMap]);
  light.position.set(...pos); light.target.position.set(...target); light.target.updateMatrixWorld();
  return <><primitive object={light} /><primitive object={light.target} /></>;
};
const hi = () => true;

// ---------------------------------------------------------------- 1. character close-up (study at night)
const camA = camPath([{ f: 0, pos: [0.85, 1.3, 1.55], look: [0.0, 0.95, -1.3], fov: 40 }, { f: SHOT + XF, pos: [0.55, 1.26, 1.05], look: [0.0, 0.98, -1.35], fov: 38 }], 4);
const ShotStudy: React.FC<{ f: number }> = ({ f }) => {
  const c = camA(f, [0.05, 1.2, -1.75]);
  const hal: Odo5Pose = pose5({ costume: COSTUME.hal, lookX: 0.15 + 0.1 * Math.sin(f / 14), lookY: -0.05, mouth: f > 26 ? "smile" : "awkward", blink: f % 52 > 47, browL: 0.65, browR: 0.1 });
  return (
    <Shot label="closeup" c={c} fog={["#1a1612", 8, 30]} bg="#120f0c" post={{ exposure: 1.05, bloom: 0.7, threshold: 1.3 }}>
      <HdriEnvironment id="cobblestone_street_night" intensity={0.35} />
      <ambientLight intensity={0.08} />
      <pointLight position={[-0.55, 1.35, -0.75]} color="#ffb768" intensity={5.5} distance={7} decay={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <Sun pos={[4, 6, 3]} color="#9fb6ff" intensity={0.6} span={5} />
      <Ground tex="wood_floor_deck" size={[12, 12]} tile={2.2} />
      <PbrBox tex="plastered_stone_wall" size={[9, 3.6, 0.25]} pos={[0, 1.8, -2.4]} tile={2.5} />
      <PbrBox tex="plastered_stone_wall" size={[0.25, 3.6, 7]} pos={[-3.0, 1.8, 0.6]} tile={2.5} />
      <Model id="WoodenTable_01" pos={[0, 0, -0.95]} />
      <Model id="Lantern_01" pos={[-0.55, 0.55, -0.85]} rot={[0, 0.4, 0]} />
      <Model id="metal_toolbox" pos={[0.45, 0.55, -1.05]} rot={[0, -0.3, 0]} />
      <Model id="desk_lamp_arm_01" pos={[0.7, 0.55, -1.2]} rot={[0, 2.4, 0]} height={0.55} />
      <Model id="Shelf_01" pos={[1.6, 0, -2.15]} />
      <Model id="ArmChair_01" pos={[-1.9, 0, -0.9]} rot={[0, 0.7, 0]} />
      <Model id="potted_plant_01" pos={[-2.3, 0, -1.95]} height={1.1} />
      <Model id="cardboard_box_01" pos={[1.25, 0, -1.4]} rot={[0, 0.5, 0]} />
      <Model id="Barrel_01" pos={[2.25, 0, -0.9]} />
      <Toon pose={hal} pos={[0.05, 0, -1.75]} cam={c.pos} hi={hi()} light={3.5} />
    </Shot>
  );
};

// ---------------------------------------------------------------- 2. city street at dusk
const camB = camPath([{ f: 0, pos: [0.6, 1.75, 10.5], look: [-0.6, 3.4, -10], fov: 56 }, { f: SHOT + XF, pos: [0.3, 1.75, 7.8], look: [-0.7, 3.4, -12], fov: 54 }], 4);
const lamps = [-24, -12, 0, 12].flatMap((z) => [[-4.9, z], [4.9, z + 6]] as [number, number][]);
const ShotStreet: React.FC<{ f: number }> = ({ f }) => {
  const c = camB(f, [-1.2, 1.2, 2]);
  const walk = f / 30, halX = -1.7, halZ = 4.2 - walk * 1.05;
  const hal = pose5({ costume: COSTUME.hal, view: "side", gait: walk * 1.05 / 0.72, walk: 1, stride: 0.72, lean: 0.04, mouth: "smile" });
  const trees = useMemo(() => [-18, -6, 6].map((z) => ({ p: [-5.6, 0.15, z] as V3, ry: z, s: 1 })), []);
  return (
    <Shot label="city" c={c} fog={["#c99a86", 25, 120]} post={{ exposure: 1.0, bloom: 0.8, threshold: 1.25 }}>
      <HdriEnvironment id="belfast_sunset_puresky" intensity={0.9} background rotationY={2.2} />
      <Sun pos={[-30, 22, -40]} color="#ffc48a" intensity={2.2} span={20} target={[0, 0, -4]} />
      <Ground tex="asphalt_02" size={[9, 90]} tile={4} pos={[0, 0, -20]} />
      <PbrBox tex="cobblestone_floor_01" size={[3.6, 0.16, 90]} pos={[-6.3, 0.08, -20]} tile={1.6} />
      <PbrBox tex="cobblestone_floor_01" size={[3.6, 0.16, 90]} pos={[6.3, 0.08, -20]} tile={1.6} />
      {[0, 1, 2].map((k) => <Building key={`L${k}`} bays={6} floors={4 + (k % 2)} seed={k * 3 + 1} pos={[-8.1, 0.16, -4 - k * 18.4]} rotY={Math.PI / 2} />)}
      {[0, 1, 2].map((k) => <Building key={`R${k}`} bays={6} floors={3 + ((k + 1) % 3)} seed={k * 5 + 2} pos={[8.1, 0.16, 2 - k * 18.4]} rotY={-Math.PI / 2} sideTex="red_sandstone_wall" />)}
      {lamps.map(([x, z], i) => <Model key={i} id="street_lamp_01" pos={[x, 0.16, z]} rot={[0, x < 0 ? 0 : Math.PI, 0]} lodFrom={c.pos} />)}
      {lamps.map(([x, z], i) => <pointLight key={`l${i}`} position={[x * 0.88, 3.7, z]} color="#ffbf73" intensity={2.2} distance={9} decay={1.7} />)}
      <KitPart id="fire_hydrant" match={/^fire_hydrant(_cap_0\d|_chain)?$/} pos={[-5.0, 0.16, 1.5]} />
      <KitPart id="metal_trash_can" match={/^metal_trash_can_rust(_handle_(left|right))?$/} pos={[-6.9, 0.16, -3.5]} rot={[0, Math.PI / 2, 0]} />
      <Model id="Barrel_01" pos={[6.9, 0.16, -9]} />
      <Model id="covered_car" pos={[3.0, 0, -3]} rot={[0, 0.02, 0]} />
      <Model id="concrete_road_barrier" pos={[2.6, 0, 3.2]} rot={[0, 1.4, 0]} />
      <Model id="utility_box_01" pos={[6.0, 0.16, 0.5]} rot={[0, -Math.PI / 2, 0]} />
      <Instanced id="jacaranda_tree" items={trees} height={6.5} />
      <Toon pose={hal} pos={[halX, 0.16, halZ]} cam={c.pos} hi={hi()} light={1.5} />
    </Shot>
  );
};

// ---------------------------------------------------------------- 3. construction site
const camC = camPath([{ f: 0, pos: [11, 4.2, 13], look: [0, 1.6, 0], fov: 46 }, { f: SHOT + XF, pos: [8.5, 3.6, 13.5], look: [-0.5, 1.6, 0], fov: 44 }], 4);
const excQ = (f: number): ExcQ => { const ph = (f % 60) / 60, dig = Math.sin(ph * Math.PI * 2);
  return { yaw: -0.5 + 0.5 * smooth(0.45, 0.7, ph) - 0.5 * smooth(0.9, 1, ph), boom: 0.3 + 0.25 * dig, stick: 1.3 - 0.4 * dig, bucket: 0.6 + 0.7 * Math.max(0, dig), track: 0 }; };
const ShotSite: React.FC<{ f: number }> = ({ f }) => {
  const c = camC(f, [0, 1.5, 0]);
  const barrels = useMemo(() => scatter(31, 7, [5, -6, 9, -2], 0.75, [0.95, 1.05]), []);
  const rocks = useMemo(() => scatter(7, 14, [-14, -12, 14, 6], 2.5, [0.5, 1.3], [[-6, -4, 8, 6]]), []);
  const worker = pose5({ costume: COSTUME.workerA, lookX: -0.5, mouth: "smile", blink: f % 47 > 43 });
  return (
    <Shot label="vehicles" c={c} fog={["#d8cbb6", 40, 160]} post={{ exposure: 1.0, bloom: 0.4, threshold: 1.8 }}>
      <HdriEnvironment id="kloofendal_48d_partly_cloudy_puresky" intensity={1.0} background rotationY={0.6} />
      <Sun pos={[18, 26, 12]} intensity={2.6} span={16} />
      <Ground tex="stony_dirt_path" size={[70, 70]} tile={3.5} />
      <group position={[-2, 0, -1]} rotation={[0, 0.6, 0]}><Excavator5 q={excQ(f)} /></group>
      <group position={[4.5, 0, 3.5]} rotation={[0, -2.6, 0]}><Truck5 c={1} spin={0} cargo={[2101, 2112, 2123, 2134, 2145, 2156]} /></group>
      {[0, 1, 2, 3].map((i) => <Model key={i} id="concrete_road_barrier" pos={[-5 + i * 1.6, 0, 6.5]} rot={[0, 0.03 * i, 0]} />)}
      <Fence n={9} pos={[-9, 0, -8]} />
      <Instanced id="Barrel_01" items={barrels} />
      <Instanced id="namaqualand_boulder_02" items={rocks} height={0.9} lod={1} />
      <Model id="ladder_sectioned_01" pos={[6.2, 0, -1.3]} rot={[-0.25, -0.4, 0]} />
      <Model id="old_tyre" pos={[2.4, 0, 6.2]} rot={[Math.PI / 2, 0, 0.4]} />
      <Model id="metal_jerrycan" pos={[2.9, 0, 5.6]} rot={[0, 0.6, 0]} />
      <Model id="sledgehammer_01" pos={[3.3, 0.02, 6.0]} rot={[Math.PI / 2, 0, 0.9]} />
      <Model id="old_military_crate" pos={[7.4, 0, 1.0]} rot={[0, 1.2, 0]} />
      {[0, 1, 2].map((i) => <GraniteBlock key={i} n={2201 + i * 7} p={[6.6 + i * 1.05, 0.3, 4.3]} ry={0.05 * i} />)}
      <Toon pose={worker} pos={[3.2, 0, 4.6]} cam={c.pos} h={1.5} hi={hi()} light={1} halo={0.1} />
    </Shot>
  );
};

// ---------------------------------------------------------------- 4. harbour: water + ship
const camD = camPath([{ f: 0, pos: [-10.5, 3.4, 9.5], look: [3, 3.6, -9], fov: 50 }, { f: SHOT + XF, pos: [-9.5, 3.2, 7.5], look: [3.5, 3.7, -9.5], fov: 48 }], 4);
const ShotHarbour: React.FC<{ f: number }> = ({ f }) => {
  const c = camD(f, [6, 4, -6]); const t = f / 30;
  const bob = 0.12 * Math.sin(t * 1.3), roll = 0.025 * Math.sin(t * 1.1 + 0.6), pitch = 0.012 * Math.sin(t * 0.9);
  const hal = pose5({ costume: COSTUME.hal, lookX: 0.6, mouth: "smile", armR: { hand: [60, -150], elbow: [80, -30], shape: "open", rot: 0.3 + 0.35 * Math.sin(f / 3.2), bend: 1 } });
  const crates = useMemo(() => [[-4.0, 2.2], [-3.4, 1.4], [-4.1, 0.8]].map(([x, z], i) => ({ p: [x, 1.8, z] as V3, ry: i * 0.6, s: 1 })), []);
  return (
    <Shot label="water_ship" c={c} fog={["#e6b892", 60, 260]} post={{ exposure: 1.0, bloom: 0.7, threshold: 1.4 }}>
      <HdriEnvironment id="small_harbour_sunset" intensity={1.0} background rotationY={-0.8} />
      <Sun pos={[-40, 18, -60]} color="#ffbe86" intensity={2.4} span={22} target={[2, 0, -4]} />
      <Water t={t} size={[220, 220]} seg={150} pos={[0, 0, -40]} normalTex={rippleNormal()} amp={0.12} shallow="#3d7f86" deep="#123b52" />
      <group position={[7, bob, -8]} rotation={[pitch, -0.6, roll]}><Model id="dutch_ship_medium" pos={[0, -1.3, 0]} height={22} /></group>
      <Pier n={5} pos={[-3.5, -0.9, 6]} />
      {crates.map((it, i) => <KitPart key={i} id="old_military_crate" match={i % 2 ? /_b$/ : /_a$/} pos={it.p} rot={[0, it.ry ?? 0, 0]} />)}
      <Model id="Barrel_01" pos={[-2.6, 1.8, -1.5]} />
      <Model id="lifebuoy" pos={[-2.3, 1.8, 3.2]} rot={[0, -1.2, 0]} />
      <Model id="wooden_lantern_01" pos={[-2.4, 1.8, -4.0]} />
      <Toon pose={hal} pos={[-3.2, 1.8, -6.5]} cam={c.pos} hi={hi()} light={1.2} />
    </Shot>
  );
};

// ---------------------------------------------------------------- 5. crowd on a plaza
const camE = camPath([{ f: 0, pos: [0.4, 1.7, 8.6], look: [0, 1.35, 0], fov: 42 }, { f: SHOT + XF, pos: [-0.3, 1.65, 7.6], look: [0, 1.35, 0], fov: 41 }], 4);
const SPOTS: [number, number][] = [[-2.6, 0.3], [-1.4, -0.2], [-0.3, 0.4], [0.9, -0.1], [2.1, 0.35], [-2.0, -1.4], [-0.8, -1.2], [0.4, -1.5], [1.5, -1.3], [2.7, -1.1]];
const ShotCrowd: React.FC<{ f: number }> = ({ f }) => {
  const c = camE(f, [0, 1.3, 0]);
  return (
    <Shot label="crowd" c={c} fog={["#bfa6a0", 25, 140]} post={{ exposure: 1.0, bloom: 0.6, threshold: 1.4 }}>
      <HdriEnvironment id="qwantani_dusk_2_puresky" intensity={0.95} background rotationY={1.4} />
      <Sun pos={[-20, 14, -18]} color="#ffcf9c" intensity={2.0} span={14} />
      <Ground tex="cobblestone_floor_01" size={[60, 60]} tile={1.8} />
      <Building bays={7} floors={4} seed={4} pos={[0, 0, -10]} />
      <Building bays={4} floors={5} seed={9} pos={[-14, 0, -8]} rotY={0.5} sideTex="red_sandstone_wall" />
      {[-6, 6].map((x) => <Model key={x} id="street_lamp_02" pos={[x, 0, -3]} />)}
      {[-4.5, 4.5].map((x) => <Model key={`p${x}`} id="potted_plant_01" pos={[x, 0, -4]} height={1.2} />)}
      {SPOTS.map(([x, z], i) => <Toon key={i} pose={crowdPose(i, (f * 1.0 + i * 23) % 280)} pos={[x, 0, z]} cam={c.pos} h={CROWD[i].h} hi={hi()} halo={0.1} />)}
    </Shot>
  );
};

const SHOTS_LIST = [ShotStudy, ShotStreet, ShotSite, ShotHarbour, ShotCrowd];
/** one shot alone (for benchmarks and quick tests), frame numbers local to the shot */
export const ShowcaseShot: React.FC<{ shot: number }> = ({ shot }) => { const f = useCurrentFrame(); const S = SHOTS_LIST[shot]; return <AbsoluteFill style={{ background: "#000" }}><S f={f} /></AbsoluteFill>; };
/** the whole showcase: shots dissolve into each other over XF frames (opacity cross-dissolve, no cuts) */
export const LibraryShowcase: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SHOTS_LIST.map((S, i) => { const from = i * SHOT, dur = SHOT + XF; const o = i === 0 ? 1 : smooth(from, from + XF, f);
        return <Sequence key={i} from={from} durationInFrames={dur} layout="none"><AbsoluteFill style={{ opacity: o }}><ShotLocal S={S} /></AbsoluteFill></Sequence>; })}
    </AbsoluteFill>
  );
};
const ShotLocal: React.FC<{ S: React.FC<{ f: number }> }> = ({ S }) => { const f = useCurrentFrame(); return <S f={f} />; };
