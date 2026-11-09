// Ocean + Panama Canal (film frames 985-1063): the cargo ship with the numbered blocks ploughs through a live ocean
// surface (CPU-displaced swell with foam crests, bow spray), then glides between concrete lock walls while the lock
// gates swing open; towing locomotives on the walls, control houses, jungle hills in tropical haze. No text.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Post } from "../../lib/Post";
import { InkCtx, Ink } from "../../inventor/Workshop";
import { V3, rng, smooth, lerp } from "../../lib/math";
import { SetRig, RenderAfterMount, camPath } from "./common";
import { Ship } from "./LondonSet";

export const SEA0 = 985, SEA1 = 1064;
const SPEED = 0.16;                                    // m per frame along +z
export const shipSeaZ = (f: number) => (f - SEA0) * SPEED;
export const LOCK_Z = 10, GATE_Z = 28, WALL_X = 4.2;    // lock chamber starts at z=4; gates at 25
export const gateOpen = (f: number) => smooth(1022, 1052, f);
const swell = (x: number, z: number, t: number) =>
  0.42 * Math.sin(0.21 * x + 0.13 * z + t * 1.1) + 0.27 * Math.sin(-0.11 * x + 0.29 * z + t * 1.7) + 0.12 * Math.sin(0.47 * x - 0.37 * z + t * 2.6) + 0.06 * Math.sin(0.9 * x + 0.7 * z + t * 3.9);
const lockCalm = (z: number) => 1 - smooth(LOCK_Z - 14, LOCK_Z + 2, z); // the swell dies down inside the canal

export const camSea = camPath([
  { f: 960, pos: [-17, 8, -18], look: [2, 1.5, 1], fov: 46 },
  { f: 985, pos: [-16, 9, -14], look: [2, 1.5, 2], fov: 46 },
  { f: 1020, pos: [-10, 15, -10], look: [1.5, 1.6, 5], fov: 46 },
  { f: 1063, pos: [-7, 20, -6], look: [1, 2.0, 10], fov: 47 },
  { f: 1090, pos: [-6, 22, -3], look: [1, 2, 14], fov: 47 },
], 6);

export const SeaSet: React.FC<{ from: number }> = ({ from }) => {
  const f = useCurrentFrame() + from;
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920, t = f / 30;
  const sz = shipSeaZ(f);
  const c = camSea(f, [0, 2.5, sz + 2]);

  const cam = { ...c, pos: [c.pos[0], c.pos[1], c.pos[2] + sz] as V3, look: [c.look[0], c.look[1], c.look[2] + sz] as V3 };
  const M = useMemo(() => ({
    water: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.05 }),
    concrete: new THREE.MeshStandardMaterial({ color: "#b9b4a8", roughness: 0.92 }), concreteD: new THREE.MeshStandardMaterial({ color: "#8f8a80", roughness: 0.95 }),
    gate: new THREE.MeshStandardMaterial({ color: "#5b6168", metalness: 0.4, roughness: 0.6 }), rail: new THREE.MeshStandardMaterial({ color: "#2a2c30", metalness: 0.5, roughness: 0.5 }),
    jungle: new THREE.MeshStandardMaterial({ color: "#3f6b3a", roughness: 1 }), jungleD: new THREE.MeshStandardMaterial({ color: "#2f5530", roughness: 1 }),
    house: new THREE.MeshStandardMaterial({ color: "#efe9dc", roughness: 0.8 }), roof: new THREE.MeshStandardMaterial({ color: "#a2412e", roughness: 0.8 }),
    loco: new THREE.MeshStandardMaterial({ color: "#c8b23a", roughness: 0.6 }), spray: new THREE.PointsMaterial({ color: "#ffffff", size: 0.12, transparent: true, opacity: 0.8 }),
    sky: new THREE.MeshBasicMaterial({ color: "#8fc2e8", side: THREE.BackSide, fog: false }),
  }), []);
  // ocean surface (around the ship, follows it)
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(160, 160, 110, 110); g.rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3)); return g; }, []);
  {
    const p = geo.attributes.position as THREE.BufferAttribute, col = geo.attributes.color as THREE.BufferAttribute;
    const deep = new THREE.Color("#1f5f86"), mid = new THREE.Color("#2f7fa6"), foam = new THREE.Color("#e9f4f6");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i) + sz, calm = lockCalm(z), inLock = Math.abs(x) < WALL_X && z > LOCK_Z - 2;
      // ship wake: a V of disturbed water behind the hull
      const dz = sz - z, wake = dz > 0 && dz < 40 ? Math.exp(-((Math.abs(x) - dz * 0.32) ** 2) / 0.8) * (1 - dz / 40) : 0;
      const hull = Math.exp(-(x * x) / 6 - ((z - sz) ** 2) / 60);
      const y = swell(x, z, t) * (0.25 + 0.75 * calm) * (1 - hull * 0.9) + 0.25 * wake;
      p.setY(i, inLock ? y * 0.15 : y);
      const crest = Math.max(0, y - 0.35) * 2.2 + wake * 0.9;
      const cc = mid.clone().lerp(deep, 0.5 + 0.5 * Math.sin(x * 0.05 + z * 0.03)).lerp(foam, Math.min(1, crest));
      col.setXYZ(i, cc.r, cc.g, cc.b);
    }
    p.needsUpdate = true; col.needsUpdate = true; geo.computeVertexNormals();
  }
  const bob = swell(0, sz, t) * 0.35 * (0.3 + 0.7 * lockCalm(sz)), pitch = (swell(0, sz + 4, t) - swell(0, sz - 4, t)) * 0.03 * lockCalm(sz), roll = (swell(1.5, sz, t) - swell(-1.5, sz, t)) * 0.04 * lockCalm(sz);
  const spray = useMemo(() => new THREE.BufferGeometry(), []);
  { const r = rng(Math.floor(f)), n = 120, arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const s = i % 2 ? 1 : -1, a = r(); arr.set([s * (1.2 + a * 2.2), 0.3 + r() * 1.4 * (1 - a), sz + 10.5 - a * 3 + r() * 0.6], i * 3); } spray.setAttribute("position", new THREE.BufferAttribute(arr, 3)); }
  const hills = useMemo(() => { const r = rng(9); return Array.from({ length: 26 }, (_, i) => ({ x: (i % 2 ? 1 : -1) * (24 + r() * 50), z: 30 + i * 9 + r() * 6, s: 8 + r() * 12, h: 5 + r() * 10 })); }, []);
  const go = gateOpen(f);
  return (
    <AbsoluteFill style={{ backgroundColor: "#8fc2e8" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: cam.fov, position: cam.pos, near: 0.1, far: 1400 }}>
        <SetRig c={cam} bg="#9cc9ea" fog={["#cfe0e6", 30, 260]} env={0.3} />
        <InkCtx.Provider value={2.8 * k}>
          <mesh material={M.sky}><sphereGeometry args={[900, 24, 12]} /></mesh>
          <hemisphereLight args={["#cfe6ff", "#4a6a5a", 1.1]} />
          <directionalLight position={[40, 60, -30]} color="#fff0d2" intensity={2.6} castShadow shadow-mapSize={[hi ? 4096 : 2048, hi ? 4096 : 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-camera-far={200} shadow-bias={-0.0004} />
          <mesh geometry={geo} material={M.water} position={[0, 0, sz]} receiveShadow />
          <group position={[0, bob + 0.1, sz]} rotation={[pitch, 0, roll]}><Ship blocks={20} /></group>
          <points geometry={spray} material={M.spray} />
          {/* canal: lock walls, gates, control houses, towing locomotives, jungle hills */}
          {[-1, 1].map((s) => <group key={s}>
            <mesh position={[s * (WALL_X + 3), 2.0, LOCK_Z + 40]} material={M.concrete} castShadow receiveShadow><boxGeometry args={[6, 5, 80]} /><Ink k={0.8} /></mesh>
            {Array.from({ length: 20 }, (_, i) => <mesh key={i} position={[s * (WALL_X + 0.02), 1.0, LOCK_Z + 1 + i * 4]} material={M.concreteD}><boxGeometry args={[0.06, 2.0, 0.12]} /></mesh>)}
            <mesh position={[s * (WALL_X + 1.5), 4.6, LOCK_Z + 40]} material={M.rail}><boxGeometry args={[0.12, 0.1, 80]} /></mesh>
            <mesh position={[s * (WALL_X + 2.3), 4.6, LOCK_Z + 40]} material={M.rail}><boxGeometry args={[0.12, 0.1, 80]} /></mesh>
            <group position={[s * (WALL_X + 1.9), 4.5, LOCK_Z + 6 + (f - SEA0) * SPEED * 0.6]}><mesh position={[0, 0.7, 0]} material={M.loco} castShadow><boxGeometry args={[1.4, 1.3, 3.2]} /><Ink k={0.6} /></mesh><mesh position={[0, 1.5, -0.6]} material={M.house}><boxGeometry args={[1.2, 0.5, 1.2]} /></mesh></group>
            <group position={[s * (WALL_X + 4.8), 4.5, GATE_Z - 3]}><mesh position={[0, 1.4, 0]} material={M.house} castShadow><boxGeometry args={[2.4, 2.8, 2.4]} /><Ink k={0.7} /></mesh><mesh position={[0, 3.1, 0]} material={M.roof} castShadow><coneGeometry args={[2.1, 1.0, 4]} /><Ink k={0.6} /></mesh></group>
            {/* mitre gate leaf hinged at the wall */}
            <group position={[s * WALL_X, 0, GATE_Z]} rotation={[0, s * (-0.32 - 1.15 * go), 0]}><mesh position={[-s * WALL_X * 0.53, 1.6, 0]} material={M.gate} castShadow><boxGeometry args={[WALL_X * 1.06, 4.6, 0.5]} /><Ink k={0.8} /></mesh>{[0.6, 1.8, 3.0].map((y) => <mesh key={y} position={[-s * WALL_X * 0.53, y, 0.28]} material={M.rail}><boxGeometry args={[WALL_X * 1.06, 0.12, 0.08]} /></mesh>)}</group>
          </group>)}
          {hills.map((h, i) => <mesh key={i} position={[h.x, h.h * 0.3, h.z]} scale={[h.s, h.h, h.s]} material={i % 3 ? M.jungle : M.jungleD} castShadow><icosahedronGeometry args={[1, 1]} /><Ink k={0.7} /></mesh>)}
        </InkCtx.Provider>
        <Post params={{ focusDist: cam.focus, focusRange: 8, maxBlur: 0.12, bloom: 0.6, threshold: 1.7, exposure: 1.05, vignette: 0.5, ss: hi ? 1 : 2, contrast: 1.12, saturation: 1.12, lift: 0.01, warmCool: 0.6, ao: 0.5, aoRadius: 0.6 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
void lerp;
export type SeaEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
export const seaSoundEvents = (): SeaEvent[] => [
  { frame: 988, kind: "ship_engine", x: 0.3, gain: 0.8, note: "ship engine at sea" },
  { frame: 992, kind: "bow_splash", x: 0.2, gain: 0.7, note: "bow cuts a swell" }, { frame: 1006, kind: "bow_splash", x: 0.2, gain: 0.6, note: "bow cuts a swell" },
  { frame: 1024, kind: "lock_gate", x: 0.4, gain: 0.8, note: "lock gate motors start, gates swing open" },
  { frame: 1034, kind: "ship_horn", x: 0.4, gain: 0.55, note: "short horn entering the lock" },
  { frame: 1040, kind: "water_rush", x: 0.3, gain: 0.6, note: "water churns as the gates open" },
];
