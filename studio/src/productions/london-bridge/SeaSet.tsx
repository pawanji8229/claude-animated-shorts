// Ocean + Panama Canal (film frames 972-1076) v2: the detailed cargo ship with its numbered blocks crosses a live ocean
// (CPU swell on a fine grid, deterministic noise foam on crests and in the wake, scrolling ripple normals, sky reflection
// from a gradient environment), with a deterministic bow spray. Then it glides into a lock: panelled concrete walls with
// coping, bollards and ladders, steel mitre gates with trussed leaves and walkways, electric towing locomotives on rails
// with tow cables, control houses with windows, lamp posts, rain-forest hills. No text.
// v2.1: two modes joined by a cross-dissolve on the ship. "ocean": open sea only. "lock": the ship sits in a lock chamber
// between closed mitre gates; culverts boil as the chamber fills, the water (and the ship) rise ~2.4 m to the upstream
// level, the upper gates swing open and the mules lead the ship out.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Post } from "../../lib/Post";
import { InkCtx, Ink } from "../../inventor/Workshop";
import { V3, rng, smooth } from "../../lib/math";
import { SetRig, RenderAfterMount, camPath } from "./common";
import { CargoShip, cnv, rippleNormal, struts } from "./assets";

export const SEA0 = 985, SEA1 = 1064;
const SPEED = 0.16;                                    // m per frame along +z
export const shipSeaZ = (f: number) => (f - SEA0) * SPEED;
export const LOCK_Z = 22, GATE_Z = 40, WALL_X = 4.2;
export const gateOpen = (f: number) => smooth(1048, 1062, f);
export const GATE_L = 47.5, LIFT_H = 2.8;                               // lock mode: upper gates and lift height
export const lockLevel = (f: number) => LIFT_H * smooth(1020, 1048, f); // chamber water level above the lower pool
export const shipLockZ = (f: number) => LOCK_Z + 12.0 + 0.0026 * Math.max(0, f - 1052) ** 2;
const fillBoil = (f: number) => smooth(1014, 1022, f) * (1 - smooth(1040, 1050, f));
const swell = (x: number, z: number, t: number) =>
  0.42 * Math.sin(0.21 * x + 0.13 * z + t * 1.1) + 0.27 * Math.sin(-0.11 * x + 0.29 * z + t * 1.7) + 0.12 * Math.sin(0.47 * x - 0.37 * z + t * 2.6) + 0.06 * Math.sin(0.9 * x + 0.7 * z + t * 3.9);
const lockCalm = (z: number) => 1 - smooth(LOCK_Z - 14, LOCK_Z + 2, z);
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x: number, z: number) => { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return (hash(xi, zi) * (1 - u) + hash(xi + 1, zi) * u) * (1 - v) + (hash(xi, zi + 1) * (1 - u) + hash(xi + 1, zi + 1) * u) * v; };

export const camSea = camPath([           // relative to the ship; opens matched to the London camera (ahead-left), orbits behind
  { f: 950, pos: [-20, 11, 16], look: [0, 2, 0], fov: 48 },
  { f: 972, pos: [-20, 11, 16], look: [0, 2, 0], fov: 48 },
  { f: 1000, pos: [-18, 12, 12], look: [0, 2, 2], fov: 47 },
  { f: 1026, pos: [-10, 13, -27], look: [0, 2.4, 1], fov: 47 },          // swings behind: closed lower gates and the low pool in the foreground
  { f: 1048, pos: [-6.5, 12, -31], look: [0, 3.0, 1], fov: 46 },
  { f: 1063, pos: [-5.5, 12.5, -29], look: [0, 3.4, 5], fov: 47 },
  { f: 1090, pos: [-4.5, 13, -25], look: [0, 3.6, 10], fov: 47 },
], 6);

const SkyEnv: React.FC<{ mat: THREE.MeshStandardMaterial }> = ({ mat }) => {
  const { gl } = useThree();
  useMemo(() => {
    const sc = new THREE.Scene(), g = new THREE.SphereGeometry(10, 32, 16), col: number[] = [], p = g.attributes.position as THREE.BufferAttribute;
    const top = new THREE.Color("#4f8fd0"), hor = new THREE.Color("#d8ecf6"), low = new THREE.Color("#2f5f7a");
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10, c = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(low, Math.min(1, -y * 3)); col.push(c.r, c.g, c.b); }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    sc.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.7) })); sun.position.set(6, 7, -3); sc.add(sun);
    const pm = new THREE.PMREMGenerator(gl); mat.envMap = pm.fromScene(sc, 0.02).texture; mat.needsUpdate = true; pm.dispose();
  }, [gl, mat]);
  return null;
};
const concreteTex = () => cnv(512, 256, (g, r) => {
  g.fillStyle = "#b9b4a8"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "60,58,52" : "235,232,222"},${r() * 0.08})`; g.fillRect(r() * 512, r() * 256, 2 + r() * 4, 2 + r() * 3); }
  g.fillStyle = "rgba(70,66,60,0.55)"; for (let x = 0; x < 512; x += 128) g.fillRect(x, 0, 3, 256); g.fillRect(0, 126, 512, 2);   // pour joints
  const e = g.createLinearGradient(0, 0, 0, 256); e.addColorStop(0, "rgba(0,0,0,0)"); e.addColorStop(0.55, "rgba(60,70,60,0.08)"); e.addColorStop(0.8, "rgba(50,60,45,0.35)"); e.addColorStop(1, "rgba(40,50,35,0.6)"); g.fillStyle = e; g.fillRect(0, 0, 512, 256); // water stain
  for (let i = 0; i < 30; i++) { g.fillStyle = "rgba(40,40,35,0.12)"; g.fillRect(r() * 512, 120 + r() * 40, 2, 60 + r() * 80); }                                      // drip streaks
}, 71);

export const SeaSet: React.FC<{ from: number; mode?: "ocean" | "lock" }> = ({ from, mode = "ocean" }) => {
  const lock = mode === "lock";
  const f = useCurrentFrame() + from;
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920, t = f / 30;
  const sz = lock ? shipLockZ(f) : shipSeaZ(f), lev = lock ? lockLevel(f) : 0, boil = lock ? fillBoil(f) : 0;
  const c = camSea(f, [0, 2.5, sz + 2]);
  const cam = { ...c, pos: [c.pos[0], c.pos[1], c.pos[2] + sz] as V3, look: [c.look[0], c.look[1], c.look[2] + sz] as V3 };
  const M = useMemo(() => {
    const ct = concreteTex(); ct.repeat.set(10, 1);
    return {
      water: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.0, normalMap: rippleNormal().clone(), normalScale: new THREE.Vector2(0.14, 0.14), envMapIntensity: 0.8 }),
      concrete: new THREE.MeshStandardMaterial({ map: ct, roughness: 0.92 }), cope: new THREE.MeshStandardMaterial({ color: "#d5d0c4", roughness: 0.85 }),
      gate: new THREE.MeshStandardMaterial({ color: "#56606a", metalness: 0.45, roughness: 0.55 }), rail: new THREE.MeshStandardMaterial({ color: "#2a2c30", metalness: 0.6, roughness: 0.45 }),
      iron: new THREE.MeshStandardMaterial({ color: "#2b2d31", metalness: 0.5, roughness: 0.5 }), yellow: new THREE.MeshStandardMaterial({ color: "#e2c23a", roughness: 0.5 }),
      jungle: ["#3f6b3a", "#2f5530", "#4f7a3f", "#365f35"].map((cc) => new THREE.MeshStandardMaterial({ color: cc, roughness: 1 })),
      house: new THREE.MeshStandardMaterial({ color: "#efe9dc", roughness: 0.8 }), roof: new THREE.MeshStandardMaterial({ color: "#a2412e", roughness: 0.8 }),
      loco: new THREE.MeshStandardMaterial({ color: "#c7cbd0", roughness: 0.4, metalness: 0.5 }), locoBand: new THREE.MeshStandardMaterial({ color: "#1f3f78", roughness: 0.5 }),
      glass: new THREE.MeshStandardMaterial({ color: "#1d2b38", roughness: 0.08, metalness: 0.5 }), spray: new THREE.PointsMaterial({ color: "#ffffff", size: 0.1, transparent: true, opacity: 0.85, depthWrite: false }),
      sky: new THREE.MeshBasicMaterial({ color: "#8fc2e8", side: THREE.BackSide, fog: false }), cable: new THREE.MeshStandardMaterial({ color: "#1b1b1b", roughness: 0.6 }),
      slime: new THREE.MeshStandardMaterial({ color: "#3c4a36", roughness: 0.9 }), land: new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 1 }),
    };
  }, []);
  M.water.normalMap!.wrapS = M.water.normalMap!.wrapT = THREE.RepeatWrapping; M.water.normalMap!.repeat.set(56, 56); M.water.normalMap!.offset.set(f * 0.0011, -f * 0.0019);
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(140, 140, 200, 200); g.rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3)); return g; }, []);
  {
    const p = geo.attributes.position as THREE.BufferAttribute, col = geo.attributes.color as THREE.BufferAttribute;
    const deep = new THREE.Color("#0f4a6e"), mid = new THREE.Color("#1f6f93"), teal = new THREE.Color("#2a8a96"), canal = new THREE.Color("#4f7a6a"), foam = new THREE.Color("#eef6f6");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i) + sz, calm = lock ? 0 : lockCalm(z), inLock = lock && Math.abs(x) < WALL_X + 6 && z > LOCK_Z - 2;
      const dz = sz - z, wakeV = !lock && dz > 0 && dz < 46 ? Math.exp(-((Math.abs(x) - 1.6 - dz * 0.3) ** 2) / (0.5 + dz * 0.04)) * (1 - dz / 46) : 0;
      const prop = !lock && dz > 9 && dz < 60 ? Math.exp(-(x * x) / (1.2 + (dz - 9) * 0.05)) * (1 - (dz - 9) / 51) : 0;           // propeller wash behind the stern
      const hull = lock ? 0 : Math.exp(-(x * x) / 6 - ((z - sz) ** 2) / 60), bow = lock ? 0 : Math.exp(-((Math.abs(x) - 1.9) ** 2) / 0.35 - ((z - sz - 10.2) ** 2) / 3.5);
      const y = swell(x, z, t) * (lock ? 0.12 : 0.25 + 0.75 * calm) * (1 - hull * 0.9) + 0.22 * wakeV + 0.28 * bow;
      p.setY(i, inLock ? y * 0.15 : y);
      const n = vnoise(x * 0.9 + t * 0.6, z * 0.9 - t * 0.4), n2 = vnoise(x * 2.7 - t, z * 2.7);
      const foamK = Math.min(1, Math.max(0, (y - 0.42) * 2.4) * n * n + (wakeV * 1.4 + prop * 1.1 + bow * 1.6) * smooth(0.25, 0.75, n * 0.6 + n2 * 0.5));
      const base = inLock || lock ? canal : mid.clone().lerp(deep, 0.45 + 0.35 * Math.sin(x * 0.05 + z * 0.03) + 0.2 * n).lerp(teal, 0.25 * calm * Math.max(0, y));
      const cc = (lock && z > LOCK_Z - 6 ? base.clone().lerp(canal, smooth(LOCK_Z - 6, LOCK_Z + 4, z)) : base).lerp(foam, foamK);
      col.setXYZ(i, cc.r, cc.g, cc.b);
    }
    p.needsUpdate = true; col.needsUpdate = true; geo.computeVertexNormals();
  }
  const lc = lock ? 0 : 1, bob = lock ? lev : swell(0, sz, t) * 0.35, pitch = (swell(0, sz + 4, t) - swell(0, sz - 4, t)) * 0.03 * lc, roll = (swell(1.5, sz, t) - swell(-1.5, sz, t)) * 0.04 * lc;
  // deterministic bow spray: each droplet follows a ballistic arc over its own life cycle
  const spray = useMemo(() => new THREE.BufferGeometry(), []);
  { const n = 160, arr = new Float32Array(n * 3), cal = 1; for (let i = 0; i < n; i++) { const r = rng(i + 1), life = 14 + r() * 10, ph = ((f + r() * life) % life) / life, s = i % 2 ? 1 : -1, vx = 0.8 + r() * 1.6, vy = 1.2 + r() * 1.4;
    arr.set([s * (1.6 + vx * ph * 1.4), (0.2 + vy * ph - 2.4 * ph * ph) * cal + bob, sz + 10.6 - ph * 2.2 - r() * 0.6], i * 3); } spray.setAttribute("position", new THREE.BufferAttribute(arr, 3)); }
  const hills = useMemo(() => { const r = rng(9); return Array.from({ length: 26 }, (_, i) => ({ x: (i % 2 ? 1 : -1) * (24 + r() * 50), z: 30 + i * 9 + r() * 6, s: 8 + r() * 12, h: 5 + r() * 10 })); }, []);
  const canopy = useMemo(() => { const r = rng(19), g = new THREE.IcosahedronGeometry(1, 1), mats = M.jungle; const ims = mats.map((m) => { const im = new THREE.InstancedMesh(g, m, 260); im.castShadow = true; return im; }), o = new THREE.Object3D(), cnt = [0, 0, 0, 0];
    for (const h of hills) for (let j = 0; j < 38; j++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * h.s * 0.95, x = h.x + Math.cos(a) * d, z = h.z + Math.sin(a) * d, top = h.h * 0.3 + h.h * Math.sqrt(Math.max(0, 1 - (d / h.s) ** 2)); const k2 = Math.floor(r() * 4); if (cnt[k2] >= 260) continue; const s = 1.2 + r() * 1.6; o.position.set(x, top, z); o.scale.set(s, s * 0.8, s); o.rotation.set(r(), r(), r()); o.updateMatrix(); ims[k2].setMatrixAt(cnt[k2]++, o.matrix); }
    ims.forEach((im, i) => { im.count = cnt[i]; }); return ims; }, [M, hills]);
  const gateTruss = useMemo(() => { const P: [V3, V3][] = []; const L2 = WALL_X * 1.06; for (let i = 0; i <= 6; i++) { const x = -i * L2 / 6; P.push([[x, -0.6, 0.3], [x, 3.8, 0.3]]); if (i < 6) P.push([[x, -0.6, 0.3], [x - L2 / 6, 3.8, 0.3]]); } for (const y of [-0.6, 1.6, 3.8]) P.push([[0, y, 0.3], [-L2, y, 0.3]]); return P; }, []);
  const truss = useMemo(() => [1, -1].map(() => struts(gateTruss, 0.06, M.gate)), [M, gateTruss]);
  const go = gateOpen(f), towZ = sz - 4.5;
  const chamber = useMemo(() => { const g = new THREE.PlaneGeometry(WALL_X * 2, GATE_L - LOCK_Z, 28, 90); g.rotateX(-Math.PI / 2); g.translate(0, 0, (GATE_L + LOCK_Z) / 2); g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3)); return g; }, []);
  const upper = useMemo(() => { const g = new THREE.PlaneGeometry(WALL_X * 2, 90, 4, 30); g.rotateX(-Math.PI / 2); g.translate(0, 0, GATE_L + 45); const c = new Float32Array(g.attributes.position.count * 3), cc = new THREE.Color("#4f7a6a"); for (let i = 0; i < c.length; i += 3) c.set([cc.r, cc.g, cc.b], i); g.setAttribute("color", new THREE.Float32BufferAttribute(c, 3)); return g; }, []);
  if (lock) {   // culvert outlets along the chamber floor boil up while it fills: deterministic noise-driven foam and bulges
    const p = chamber.attributes.position as THREE.BufferAttribute, col = chamber.attributes.color as THREE.BufferAttribute, canal = new THREE.Color("#4f7a6a"), foam = new THREE.Color("#e8f2ee"), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let b = 0; for (let k = 0; k < 6; k++) { const bz = LOCK_Z + 2.5 + k * 4.0, bx = (k % 2 ? 1 : -1) * 2.6; b += Math.exp(-((x - bx) ** 2 + (z - bz) ** 2) / (1.4 + 0.5 * Math.sin(f * 0.21 + k))); }
      const n = vnoise(x * 1.3 + t * 1.6, z * 1.3 - t * 1.1), wall = Math.abs(x) > WALL_X - 0.15 ? 1 : 0, hullGap = Math.abs(x) < 2.4 && z > sz - 10 && z < sz + 11.4 ? 0.35 : 1;
      p.setY(i, 0.09 * boil * b * hullGap * (0.6 + 0.8 * n) + 0.03 * Math.sin(x * 1.7 + z * 0.9 + t * 3) * (0.3 + boil));
      cc.copy(canal).lerp(foam, Math.min(1, boil * hullGap * (b * 0.9 * smooth(0.3, 0.75, n) + 0.25 * n) + wall * boil * 0.3)); col.setXYZ(i, cc.r, cc.g, cc.b); }
    p.needsUpdate = true; col.needsUpdate = true; chamber.computeVertexNormals();
  }
  const gate = (s: number, z: number, rot: number, key: string) => (
    <group key={key} position={[s * WALL_X, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[-s * WALL_X * 0.53, 1.6, 0]} material={M.gate} castShadow><boxGeometry args={[WALL_X * 1.06, 4.6, 0.5]} /><Ink k={0.8} /></mesh>
      <group scale={[s, 1, 1]} position={[0, 0.2, 0]}><primitive object={truss[s > 0 ? 0 : 1]} /></group>
      <mesh position={[-s * WALL_X * 0.53, 4.0, -0.2]} material={M.yellow}><boxGeometry args={[WALL_X * 1.06, 0.08, 0.9]} /></mesh>
      {Array.from({ length: 6 }, (_, j) => <mesh key={j} position={[-s * (0.3 + j * 0.7), 4.5, -0.6]} material={M.yellow}><boxGeometry args={[0.04, 0.9, 0.04]} /></mesh>)}
      <mesh position={[-s * WALL_X * 0.53, 4.95, -0.6]} material={M.yellow}><boxGeometry args={[WALL_X * 1.06, 0.04, 0.04]} /></mesh>
    </group>);
  return (
    <AbsoluteFill style={{ backgroundColor: "#8fc2e8" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: cam.fov, position: cam.pos, near: 0.1, far: 1400 }}>
        <SetRig c={cam} bg="#9cc9ea" fog={["#cfe0e6", 30, 260]} env={0.3} />
        <SkyEnv mat={M.water} />
        <InkCtx.Provider value={2.8 * k}>
          <mesh material={M.sky}><sphereGeometry args={[900, 24, 12]} /></mesh>
          <hemisphereLight args={["#cfe6ff", "#4a6a5a", 1.1]} />
          <directionalLight position={[40, 60, -30]} color="#fff0d2" intensity={2.6} castShadow shadow-mapSize={[hi ? 4096 : 2048, hi ? 4096 : 2048]} shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-camera-far={200} shadow-bias={-0.0004} />
          <mesh geometry={geo} material={M.water} position={[0, 0, sz]} receiveShadow />
          <group position={[0, bob + 0.1, sz]} rotation={[pitch, 0, roll]}><CargoShip cargo={12} cargo2={9} open lights={0} /></group>
          {!lock && <points geometry={spray} material={M.spray} />}
          {lock && <mesh geometry={chamber} material={M.water} position={[0, lev + 0.02, 0]} receiveShadow />}
          {lock && <mesh geometry={upper} material={M.water} position={[0, LIFT_H + 0.02, 0]} receiveShadow />}
          {/* lock walls with coping, bollards, ladders, mule rails; mitre gates; locomotives with tow cables; control houses; lamps */}
          {lock && [-1, 1].map((s) => <group key={s}>
            {/* algae-stained band of the low-water level on the chamber walls: drowned as the chamber fills */}
            <mesh position={[s * (WALL_X - 0.012), 0.45, (LOCK_Z + GATE_L) / 2]} material={M.slime}><boxGeometry args={[0.02, 1.0, GATE_L - LOCK_Z]} /></mesh>
            <mesh position={[s * (WALL_X + 3 + 30), 4.35, LOCK_Z + 40]} material={M.land} receiveShadow><boxGeometry args={[60, 0.3, 90]} /></mesh>
            <mesh position={[s * (WALL_X + 3), 2.0, LOCK_Z + 40]} material={M.concrete} castShadow receiveShadow><boxGeometry args={[6, 5, 80]} /><Ink k={0.8} /></mesh>
            <mesh position={[s * (WALL_X + 0.35), 4.56, LOCK_Z + 40]} material={M.cope} castShadow><boxGeometry args={[0.7, 0.14, 80]} /><Ink k={0.6} /></mesh>
            {Array.from({ length: 13 }, (_, i) => <mesh key={i} position={[s * (WALL_X + 0.4), 4.78, LOCK_Z + 2 + i * 6]} material={M.iron} castShadow><cylinderGeometry args={[0.16, 0.2, 0.32, 10]} /></mesh>)}
            {Array.from({ length: 7 }, (_, i) => <group key={`l${i}`} position={[s * (WALL_X + 0.03), 0, LOCK_Z + 5 + i * 11]}>{[-0.22, 0.22].map((dz) => <mesh key={dz} position={[0, 2.2, dz]} material={M.iron}><boxGeometry args={[0.05, 4.4, 0.05]} /></mesh>)}{Array.from({ length: 12 }, (_, j) => <mesh key={j} position={[0, 0.3 + j * 0.36, 0]} material={M.iron}><boxGeometry args={[0.05, 0.04, 0.44]} /></mesh>)}</group>)}
            {[1.5, 2.3].map((dx) => <mesh key={dx} position={[s * (WALL_X + dx), 4.62, LOCK_Z + 40]} material={M.rail}><boxGeometry args={[0.1, 0.1, 80]} /></mesh>)}
            <group position={[s * (WALL_X + 1.9), 4.62, towZ]}>
              <mesh position={[0, 0.85, 0]} material={M.loco} castShadow><boxGeometry args={[1.5, 1.4, 4.2]} /><Ink k={0.6} /></mesh>
              <mesh position={[0, 0.45, 0]} material={M.locoBand}><boxGeometry args={[1.54, 0.25, 4.24]} /></mesh>
              {[-1.5, 1.5].map((dz) => <mesh key={dz} position={[0, 1.95, dz]} material={M.loco} castShadow><boxGeometry args={[1.3, 0.8, 1.1]} /><Ink k={0.5} /></mesh>)}
              {[-1.5, 1.5].map((dz) => <mesh key={`g${dz}`} position={[0, 2.0, dz + Math.sign(dz) * 0.56]} material={M.glass}><boxGeometry args={[1.1, 0.45, 0.03]} /></mesh>)}
              {[-1.4, -0.5, 0.5, 1.4].map((dz) => <mesh key={`w${dz}`} position={[0, 0.12, dz]} rotation={[0, 0, Math.PI / 2]} material={M.iron}><cylinderGeometry args={[0.24, 0.24, 1.3, 14]} /></mesh>)}
              <mesh position={[-s * 0.4, 1.3, 0.3]} material={M.iron}><cylinderGeometry args={[0.25, 0.25, 0.4, 12]} /></mesh>
            </group>
            <group position={[s * (WALL_X + 4.8), 4.5, GATE_L + 3]}>
              <mesh position={[0, 1.4, 0]} material={M.house} castShadow><boxGeometry args={[2.4, 2.8, 2.4]} /><Ink k={0.7} /></mesh>
              {[-0.6, 0.6].map((dz) => <mesh key={dz} position={[-s * 1.21, 1.7, dz]} material={M.glass}><boxGeometry args={[0.03, 0.8, 0.6]} /></mesh>)}
              <mesh position={[0, 3.1, 0]} material={M.roof} castShadow><coneGeometry args={[2.1, 1.0, 4]} /><Ink k={0.6} /></mesh>
            </group>
            {[LOCK_Z + 8, LOCK_Z + 30, LOCK_Z + 52].map((z) => <group key={z} position={[s * (WALL_X + 5.6), 4.5, z]}><mesh position={[0, 2.5, 0]} material={M.iron}><cylinderGeometry args={[0.06, 0.09, 5, 8]} /></mesh><mesh position={[-s * 0.4, 5.0, 0]} material={M.iron}><boxGeometry args={[0.9, 0.12, 0.25]} /></mesh></group>)}
            {gate(s, LOCK_Z, s * 0.32, "lo")}
            {gate(s, GATE_L, s * (0.32 + 1.15 * go), "up")}
          </group>)}
          {lock && hills.map((h, i) => <mesh key={i} position={[h.x, h.h * 0.3, h.z]} scale={[h.s, h.h, h.s]} material={M.jungle[i % 4]} castShadow><icosahedronGeometry args={[1, 2]} /><Ink k={0.5} /></mesh>)}
          {lock && canopy.map((im, i) => <primitive key={i} object={im} />)}
        </InkCtx.Provider>
        <Post params={{ focusDist: cam.focus, focusRange: 8, maxBlur: 0.12, bloom: 0.6, threshold: 1.7, exposure: 1.05, vignette: 0.5, ss: hi ? 1 : 2, contrast: 1.12, saturation: 1.12, lift: 0.01, warmCool: 0.6, ao: 0.5, aoRadius: 0.6 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
export type SeaEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
export const seaSoundEvents = (): SeaEvent[] => [
  { frame: 988, kind: "ship_engine", x: 0.3, gain: 0.8, note: "ship engine at sea" },
  { frame: 992, kind: "bow_splash", x: 0.2, gain: 0.7, note: "bow cuts a swell" }, { frame: 1006, kind: "bow_splash", x: 0.2, gain: 0.6, note: "bow cuts a swell" },
  { frame: 1016, kind: "water_rush", x: 0.3, gain: 0.65, note: "culverts open: water boils up and fills the lock chamber" },
  { frame: 1046, kind: "lock_gate", x: 0.4, gain: 0.8, note: "upper gate motors start, gates swing open" },
  { frame: 1054, kind: "ship_horn", x: 0.4, gain: 0.5, note: "short horn as the ship leaves the lock" },
];
function grassTex() {   // mown verge beside the lock: mottled greens with worn paths, deterministic
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d")!, r = rng(77);
  g.fillStyle = "#58733f"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = r(); g.fillStyle = v < 0.4 ? "#4a6536" : v < 0.75 ? "#64804a" : v < 0.93 ? "#3f5a30" : "#7b8a55"; g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 20); t.colorSpace = THREE.SRGBColorSpace; return t;
}
