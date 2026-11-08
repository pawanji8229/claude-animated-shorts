// "The Long Workshop": original detailed 3D environment for Odo, built to the extracted reference rules:
// one-point perspective, long repeating rows of detailed props, patterned runner, glossy reflective floor, ceiling
// light rhythm, cool blue/violet ambient + moon shafts vs warm gold pools, haze and a bright warm focal point at the
// far end, strong foreground / middle / background separation.
import React, { useMemo } from "react";
import * as THREE from "three";
import { MeshReflectorMaterial } from "@react-three/drei";
import { Ink } from "../inventor/Workshop";
import { cabinetWood, fadeV, glow, hallFloor, hallWall, nightSky, runnerRug, warmGlow } from "./hallTextures";
import { rng } from "../lib/math";
import { gearGeometry } from "../inventor/Workshop";

export const HALL = { x0: -2.4, x1: 2.4, zFront: 2.6, zFar: -24.2, h: 4.4, bay: 2.6, bays: 9 };
export const bayZ = (i: number) => -1.3 - i * HALL.bay; // bay centre
export const PENDANT_X = 0.25, PENDANT_Y = 2.95;

type M = ReturnType<typeof useHallMats>;
const useHallMats = () => useMemo(() => {
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, ...o });
  const wallT = hallWall(1);
  wallT.repeat.set(1 / HALL.bay, 1 / HALL.h);
  const cab = cabinetWood();
  return {
    wall: std({ map: wallT, side: THREE.DoubleSide }),
    wallL: (() => { const t = hallWall(1); t.repeat.set(1 / HALL.bay, 1); return std({ map: t }); })(),
    ceiling: std({ color: "#1a1424" }),
    beam: std({ color: "#3b2619", roughness: 0.8 }),
    beamDark: std({ color: "#24160e" }),
    benchTop: std({ color: "#7a4e2c", roughness: 0.55 }),
    bench: std({ map: cab }),
    drawer: std({ map: cab, color: "#c99a7a" }),
    peg: std({ color: "#3c2a22" }),
    brass: std({ color: "#c79a45", metalness: 0.75, roughness: 0.32 }),
    brassMatte: std({ color: "#b0873c", metalness: 0.35, roughness: 0.55 }),
    copper: std({ color: "#b8653a", metalness: 0.7, roughness: 0.35 }),
    iron: std({ color: "#2f3138", metalness: 0.55, roughness: 0.5 }),
    steel: std({ color: "#9aa3ad", metalness: 0.7, roughness: 0.3 }),
    leather: std({ color: "#7a1f22", roughness: 0.22, metalness: 0.05 }),
    belt: std({ color: "#3a2116", roughness: 0.6 }),
    greenGlass: new THREE.MeshStandardMaterial({ color: "#1d6a4c", emissive: "#1f8a5c", emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.1, side: THREE.DoubleSide }),
    shadeOut: std({ color: "#1f3b3a", metalness: 0.3, roughness: 0.4, side: THREE.DoubleSide }),
    shadeIn: new THREE.MeshStandardMaterial({ color: "#fff1d6", emissive: "#ffcf8a", emissiveIntensity: 0.6, side: THREE.BackSide }),
    glassDome: new THREE.MeshStandardMaterial({ color: "#a9c8e8", transparent: true, opacity: 0.35, roughness: 0.05 }),
    jarG: new THREE.MeshStandardMaterial({ color: "#6fc49a", transparent: true, opacity: 0.6, roughness: 0.1 }),
    jarA: new THREE.MeshStandardMaterial({ color: "#e0a44a", transparent: true, opacity: 0.65, roughness: 0.1 }),
    jarB: new THREE.MeshStandardMaterial({ color: "#7ea6e8", transparent: true, opacity: 0.6, roughness: 0.1 }),
    book: ["#7d2f2a", "#2c4d6e", "#6b6a2c", "#a2702c", "#4a2c5a"].map((c) => std({ color: c })),
    paper: std({ color: "#e9dfc4", roughness: 0.9 }),
    trim: std({ color: "#2a1a12" }),
    sky: new THREE.MeshBasicMaterial({ map: nightSky(), toneMapped: false, fog: false }),
    warm: new THREE.MeshBasicMaterial({ map: warmGlow(), toneMapped: false, fog: false, color: new THREE.Color(1.15, 1.0, 0.9) }),
    bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.4, 1.8), toneMapped: false }),
    bulbSmall: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.3), toneMapped: false }),
    filament: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.2, 0.8), toneMapped: false }),
    clockFace: std({ color: "#efe2c2", emissive: "#ffcf8a", emissiveIntensity: 0.25 }),
  };
}, []);

const B: React.FC<{ p: [number, number, number]; s: [number, number, number]; r?: [number, number, number]; m: THREE.Material; ink?: boolean; cast?: boolean }> = ({ p, s, r, m, ink = true, cast = true }) => (
  <mesh position={p} rotation={r} material={m} castShadow={cast} receiveShadow><boxGeometry args={s} />{ink && <Ink />}</mesh>
);
const C: React.FC<{ p: [number, number, number]; rt: number; rb: number; h: number; m: THREE.Material; r?: [number, number, number]; seg?: number; ink?: boolean }> = ({ p, rt, rb, h, m, r, seg = 20, ink = true }) => (
  <mesh position={p} rotation={r} material={m} castShadow receiveShadow><cylinderGeometry args={[rt, rb, h, seg]} />{ink && <Ink />}</mesh>
);

// ---------------- bench unit (left wall) ----------------
const Machine: React.FC<{ m: M; kind: number; f: number; x: number; z: number; y: number; gears: THREE.BufferGeometry[] }> = ({ m, kind, f, x, z, y, gears }) => {
  const rot = f * 0.03;
  switch (kind % 4) {
    case 0: return ( // gear tower
      <group position={[x, y, z]}>
        <B p={[0, 0.04, 0]} s={[0.32, 0.08, 0.32]} m={m.bench} />
        <C p={[0, 0.34, 0]} rt={0.015} rb={0.015} h={0.56} m={m.steel} seg={8} ink={false} />
        {[0.18, 0.34, 0.5].map((h, i) => (
          <mesh key={i} position={[0, h, 0]} rotation={[Math.PI / 2, 0, rot * (i % 2 ? -1.4 : 1) + i]} material={i === 1 ? m.copper : m.brass} castShadow>
            <primitive object={gears[i % 2]} attach="geometry" /><Ink k={0.7} />
          </mesh>
        ))}
      </group>
    );
    case 1: return ( // armillary globe
      <group position={[x, y, z]}>
        <C p={[0, 0.05, 0]} rt={0.09} rb={0.12} h={0.1} m={m.brassMatte} />
        <C p={[0, 0.2, 0]} rt={0.012} rb={0.012} h={0.22} m={m.brass} seg={8} ink={false} />
        <mesh position={[0, 0.42, 0]} material={m.jarB} castShadow><sphereGeometry args={[0.1, 20, 14]} /><Ink k={0.7} /></mesh>
        <mesh position={[0, 0.42, 0]} rotation={[0.4, rot, 0.2]} material={m.brass}><torusGeometry args={[0.15, 0.008, 6, 40]} /></mesh>
        <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, rot * 0.6]} material={m.brass}><torusGeometry args={[0.17, 0.008, 6, 40]} /></mesh>
      </group>
    );
    case 2: return ( // bell jar with a glowing filament
      <group position={[x, y, z]}>
        <C p={[0, 0.03, 0]} rt={0.13} rb={0.14} h={0.06} m={m.bench} />
        <mesh position={[0, 0.06, 0]} material={m.glassDome}><sphereGeometry args={[0.12, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <mesh position={[0, 0.06, 0]} material={m.glassDome}><cylinderGeometry args={[0.12, 0.12, 0.2, 20, 1, true]} /></mesh>
        <mesh position={[0, 0.2, 0]} material={m.filament}><torusKnotGeometry args={[0.03, 0.006, 40, 6, 2, 5]} /></mesh>
      </group>
    );
    default: return ( // coil tower
      <group position={[x, y, z]}>
        <B p={[0, 0.03, 0]} s={[0.26, 0.06, 0.26]} m={m.iron} />
        {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[0, 0.1 + i * 0.045, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.copper}><torusGeometry args={[0.07, 0.014, 6, 20]} /></mesh>)}
        <mesh position={[0, 0.48, 0]} material={m.brass} castShadow><sphereGeometry args={[0.06, 16, 12]} /><Ink k={0.7} /></mesh>
      </group>
    );
  }
};

const BenchUnit: React.FC<{ m: M; i: number; f: number; gears: THREE.BufferGeometry[]; poolTex: THREE.Texture }> = ({ m, i, f, gears, poolTex }) => {
  const z = bayZ(i), x = -1.98, top = 0.92;
  const r = rng(500 + i);
  const pegX = HALL.x0 + 0.03;
  return (
    <group>
      <B p={[x, top - 0.035, z]} s={[0.8, 0.07, 1.95]} m={m.benchTop} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], k) => <B key={k} p={[x + sx * 0.34, (top - 0.07) / 2, z + sz * 0.9]} s={[0.07, top - 0.07, 0.07]} m={m.beamDark} />)}
      {/* drawer stack */}
      <B p={[x + 0.02, 0.48, z - 0.55]} s={[0.66, 0.66, 0.6]} m={m.bench} />
      {[0, 1, 2].map((k) => (
        <group key={k}>
          <B p={[x + 0.36, 0.28 + k * 0.2, z - 0.55]} s={[0.02, 0.17, 0.54]} m={m.drawer} />
          <mesh position={[x + 0.385, 0.28 + k * 0.2, z - 0.55]} material={m.brass}><boxGeometry args={[0.02, 0.025, 0.12]} /></mesh>
        </group>
      ))}
      <B p={[x, 0.18, z + 0.4]} s={[0.66, 0.04, 0.9]} m={m.beamDark} />
      <B p={[x - 0.05, 0.31, z + 0.45]} s={[0.4, 0.22, 0.34]} m={r() < 0.5 ? m.trim : m.iron} />
      {/* pegboard + tools */}
      <B p={[pegX, 1.55, z]} s={[0.04, 0.85, 1.75]} m={m.peg} cast={false} />
      {Array.from({ length: 6 }, (_, k) => {
        const tz = z - 0.7 + k * 0.28, h = 0.25 + r() * 0.25;
        return <B key={k} p={[pegX + 0.04, 1.62 - (0.5 - h) * 0.3, tz]} s={[0.025, h, 0.04 + r() * 0.05]} m={k % 3 === 0 ? m.steel : k % 3 === 1 ? m.beam : m.iron} />;
      })}
      <mesh position={[pegX + 0.05, 1.75, z + 0.62]} rotation={[0, Math.PI / 2, 0]} material={m.leather}><torusGeometry args={[0.09, 0.02, 8, 18, Math.PI * 1.6]} /></mesh>
      {/* shelf with jars & books above */}
      <B p={[pegX + 0.14, 2.1, z]} s={[0.26, 0.04, 1.8]} m={m.beamDark} />
      {Array.from({ length: 9 }, (_, k) => {
        const jz = z - 0.8 + k * 0.2;
        if (r() < 0.5) return <C key={k} p={[pegX + 0.14, 2.2, jz]} rt={0.05} rb={0.055} h={0.16 + r() * 0.08} m={[m.jarG, m.jarA, m.jarB][k % 3]} seg={12} />;
        return <B key={k} p={[pegX + 0.14, 2.24, jz]} s={[0.18, 0.24, 0.06]} m={m.book[k % 5]} r={[r() < 0.2 ? 0.2 : 0, 0, 0]} />;
      })}
      {/* green banker's lamp + warm pool on the bench */}
      <group position={[x + 0.12, top, z + 0.55]}>
        <C p={[0, 0.02, 0]} rt={0.07} rb={0.08} h={0.04} m={m.brass} />
        <C p={[0, 0.16, 0]} rt={0.01} rb={0.01} h={0.28} m={m.brass} seg={8} ink={false} />
        <mesh position={[0, 0.32, 0]} rotation={[0, 0, Math.PI / 2]} material={m.greenGlass}><cylinderGeometry args={[0.08, 0.08, 0.32, 20, 1, true, 0, Math.PI]} /><Ink k={0.7} /></mesh>
        <mesh position={[0, 0.3, 0]} material={m.bulbSmall}><sphereGeometry args={[0.03, 10, 8]} /></mesh>
        {i <= 4 && <pointLight position={[0.1, 0.24, 0]} color="#ffb060" intensity={2.4} distance={2.6} decay={1.8} />}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -0.1]}><planeGeometry args={[0.9, 1.1]} /><meshBasicMaterial map={poolTex} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      </group>
      <Machine m={m} kind={i} f={f} x={x - 0.05} z={z - 0.1} y={top} gears={gears} />
      {/* papers */}
      <mesh position={[x + 0.18, top + 0.002, z + 0.05]} rotation={[-Math.PI / 2, 0, 0.3 * (r() - 0.5)]} material={m.paper} receiveShadow><planeGeometry args={[0.3, 0.22]} /></mesh>
      {/* stool */}
      <group position={[-1.2, 0, z + 0.3 * (r() - 0.5)]}>
        <C p={[0, 0.68, 0]} rt={0.19} rb={0.17} h={0.09} m={m.leather} seg={24} />
        <mesh position={[0, 0.62, 0]} material={m.brass}><torusGeometry args={[0.16, 0.015, 6, 24]} /></mesh>
        {[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2 + i; return <C key={k} p={[Math.cos(a) * 0.12, 0.3, Math.sin(a) * 0.12]} rt={0.015} rb={0.02} h={0.62} m={m.brass} seg={8} r={[Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]} ink={false} />; })}
        <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.brass}><torusGeometry args={[0.15, 0.01, 6, 24]} /></mesh>
      </group>
      {/* drive belt from the line shaft down to the machine */}
      {(() => {
        const a = new THREE.Vector3(-1.7, 3.62, z - 0.1), b = new THREE.Vector3(x - 0.05, top + 0.3, z - 0.1);
        const mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        return <mesh position={mid} quaternion={q} material={m.belt}><boxGeometry args={[0.012, len, 0.05]} /></mesh>;
      })()}
    </group>
  );
};

// ---------------- right wall with tall arched windows ----------------
const WIN = { w: 1.25, sill: 1.0, h: 2.1 }; // rectangle height; arch radius = w/2 on top
const RightWall: React.FC<{ m: M }> = ({ m }) => {
  const geo = useMemo(() => {
    const L = HALL.zFront - HALL.zFar;
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(L, 0); s.lineTo(L, HALL.h); s.lineTo(0, HALL.h); s.closePath();
    for (let i = 0; i < HALL.bays; i++) {
      const c = HALL.zFront - bayZ(i); // distance from front
      const hole = new THREE.Path();
      hole.moveTo(c - WIN.w / 2, WIN.sill); hole.lineTo(c + WIN.w / 2, WIN.sill); hole.lineTo(c + WIN.w / 2, WIN.sill + WIN.h);
      hole.absarc(c, WIN.sill + WIN.h, WIN.w / 2, 0, Math.PI, false); hole.lineTo(c - WIN.w / 2, WIN.sill);
      s.holes.push(hole);
    }
    return new THREE.ShapeGeometry(s, 16);
  }, []);
  return (
    <group>
      {/* shape lies in XY; rotate so its x runs along -z at x = x1 */}
      <mesh geometry={geo} material={m.wall} position={[HALL.x1, 0, HALL.zFront]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow />
      {Array.from({ length: HALL.bays }, (_, i) => {
        const z = bayZ(i), xw = HALL.x1 - 0.02;
        return (
          <group key={i}>
            <B p={[xw - 0.08, WIN.sill - 0.03, z]} s={[0.24, 0.06, WIN.w + 0.2]} m={m.trim} />
            <B p={[xw, WIN.sill + WIN.h / 2, z - WIN.w / 2 - 0.04]} s={[0.08, WIN.h, 0.08]} m={m.trim} />
            <B p={[xw, WIN.sill + WIN.h / 2, z + WIN.w / 2 + 0.04]} s={[0.08, WIN.h, 0.08]} m={m.trim} />
            <B p={[xw, WIN.sill + WIN.h / 2, z]} s={[0.05, WIN.h, 0.04]} m={m.trim} cast />
            {[0.55, 1.1, 1.65].map((h) => <B key={h} p={[xw, WIN.sill + h, z]} s={[0.05, 0.035, WIN.w]} m={m.trim} />)}
            <mesh position={[xw, WIN.sill + WIN.h, z]} rotation={[0, Math.PI / 2, 0]} material={m.trim} castShadow><torusGeometry args={[WIN.w / 2 + 0.04, 0.04, 6, 24, Math.PI]} /><Ink /></mesh>
            {/* tall tool cabinet between windows */}
            {i < HALL.bays - 1 && (
              <group position={[HALL.x1 - 0.3, 0, z - HALL.bay / 2]}>
                <B p={[0, 1.05, 0]} s={[0.5, 2.1, 0.9]} m={m.bench} />
                {Array.from({ length: 6 }, (_, k) => (
                  <group key={k}>
                    <B p={[-0.26, 0.25 + k * 0.3, 0]} s={[0.02, 0.26, 0.82]} m={m.drawer} ink={false} />
                    <mesh position={[-0.28, 0.25 + k * 0.3, 0]} material={m.brass}><boxGeometry args={[0.02, 0.03, 0.16]} /></mesh>
                  </group>
                ))}
                <B p={[0, 2.13, 0]} s={[0.56, 0.06, 0.96]} m={m.trim} />
                <C p={[0, 2.3, 0.2]} rt={0.07} rb={0.08} h={0.28} m={m.jarA} seg={12} />
                <B p={[0, 2.25, -0.2]} s={[0.3, 0.18, 0.3]} m={m.book[i % 5]} />
              </group>
            )}
          </group>
        );
      })}
      {/* night outside */}
      <mesh position={[HALL.x1 + 3.5, 2.6, (HALL.zFront + HALL.zFar) / 2]} rotation={[0, -Math.PI / 2, 0]} material={m.sky}><planeGeometry args={[34, 9]} /></mesh>
    </group>
  );
};

// ---------------- far wall with warm doorway + clock ----------------
const FarWall: React.FC<{ m: M; f: number }> = ({ m, f }) => {
  const z = HALL.zFar, dw = 1.9, dh = 2.75;
  const geo = useMemo(() => {
    const s = new THREE.Shape(); const W = HALL.x1 - HALL.x0;
    s.moveTo(0, 0); s.lineTo(W, 0); s.lineTo(W, HALL.h); s.lineTo(0, HALL.h); s.closePath();
    const h = new THREE.Path(); const c = W / 2 + 0.2;
    h.moveTo(c - dw / 2, 0); h.lineTo(c + dw / 2, 0); h.lineTo(c + dw / 2, dh); h.lineTo(c - dw / 2, dh); h.closePath(); s.holes.push(h);
    return new THREE.ShapeGeometry(s);
  }, []);
  const sec = Math.floor(f / 30) * (Math.PI / 30);
  const spill = useMemo(() => glow("rgba(255,160,70,0.5)", "rgba(255,120,40,0)"), []);
  return (
    <group>
      <mesh geometry={geo} material={m.wall} position={[HALL.x0, 0, z]} receiveShadow />
      {/* lit back room seen through the door: back wall, side walls, floor, a lamp, shelves */}
      <mesh position={[0.2, 1.6, z - 2.6]} material={m.warm}><planeGeometry args={[3.2, 3.4]} /></mesh>
      <mesh position={[-1.2, 1.6, z - 1.3]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2.6, 3.4]} /><meshStandardMaterial color="#8a4a26" emissive="#ff8a3a" emissiveIntensity={0.25} /></mesh>
      <mesh position={[1.6, 1.6, z - 1.3]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[2.6, 3.4]} /><meshStandardMaterial color="#8a4a26" emissive="#ff8a3a" emissiveIntensity={0.25} /></mesh>
      <mesh position={[0.2, 0.002, z - 1.3]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3, 2.6]} /><meshStandardMaterial color="#6b3a1e" emissive="#ff8a3a" emissiveIntensity={0.15} /></mesh>
      <B p={[-0.3, 0.45, z - 2.1]} s={[1.2, 0.9, 0.5]} m={m.bench} />
      <mesh position={[0.6, 2.1, z - 1.6]} material={m.bulb}><sphereGeometry args={[0.08, 12, 8]} /></mesh>
      <pointLight position={[0.6, 2.0, z - 1.4]} color="#ffad5a" intensity={6} distance={4} decay={1.6} />
      {/* warm spill on the hall floor in front of the doorway */}
      <mesh position={[0.2, 0.006, z + 1.6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.6, 3.4]} /><meshBasicMaterial map={spill} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      <pointLight position={[0.2, 1.6, z + 0.6]} color="#ffad5a" intensity={14} distance={9} decay={1.6} />
      <B p={[0.2 - dw / 2 - 0.07, dh / 2, z + 0.05]} s={[0.14, dh, 0.14]} m={m.trim} />
      <B p={[0.2 + dw / 2 + 0.07, dh / 2, z + 0.05]} s={[0.14, dh, 0.14]} m={m.trim} />
      <B p={[0.2, dh + 0.08, z + 0.05]} s={[dw + 0.4, 0.16, 0.16]} m={m.trim} />
      {/* big workshop clock */}
      <group position={[0.2, 3.55, z + 0.08]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.brass}><cylinderGeometry args={[0.55, 0.55, 0.08, 40]} /><Ink /></mesh>
        <mesh position={[0, 0, 0.045]} material={m.clockFace}><circleGeometry args={[0.47, 40]} /></mesh>
        {Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * Math.PI * 2; return <mesh key={k} position={[Math.sin(a) * 0.4, Math.cos(a) * 0.4, 0.05]} rotation={[0, 0, -a]}><planeGeometry args={[0.025, 0.08]} /><meshBasicMaterial color="#2a1d26" /></mesh>; })}
        <mesh position={[0, 0, 0.055]} rotation={[0, 0, -2.4]}><planeGeometry args={[0.03, 0.5]} /><meshBasicMaterial color="#2a1d26" /></mesh>
        <mesh position={[0, 0, 0.06]} rotation={[0, 0, -0.5]}><planeGeometry args={[0.025, 0.7]} /><meshBasicMaterial color="#2a1d26" /></mesh>
        <mesh position={[0, 0, 0.065]} rotation={[0, 0, -sec]}><planeGeometry args={[0.01, 0.78]} /><meshBasicMaterial color="#9e3a2c" /></mesh>
      </group>
    </group>
  );
};

// ---------------- ceiling: trusses, line shaft, pendants ----------------
const Ceiling: React.FC<{ m: M; f: number; lit: number; fadeTex: THREE.Texture; haloTex: THREE.Texture; keyBay: number; shadowRes: number }> = ({ m, f, lit, fadeTex, haloTex, keyBay, shadowRes }) => {
  const W = HALL.x1 - HALL.x0, H = HALL.h;
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <group>
      <mesh position={[0, H, (HALL.zFront + HALL.zFar) / 2]} rotation={[Math.PI / 2, 0, 0]} material={m.ceiling}><planeGeometry args={[W, HALL.zFront - HALL.zFar]} /></mesh>
      {Array.from({ length: HALL.bays + 1 }, (_, i) => {
        const z = bayZ(i) + HALL.bay / 2;
        const rl = Math.hypot(W / 2, 0.42), ang = Math.atan2(0.42, W / 2);
        return (
          <group key={i} position={[0, 0, z]}>
            <B p={[0, 3.95, 0]} s={[W, 0.16, 0.16]} m={m.beam} cast={false} />
            <B p={[0, 4.18, 0]} s={[0.12, 0.46, 0.12]} m={m.beam} cast={false} />
            <B p={[-W / 4, 4.16, 0]} s={[rl, 0.1, 0.1]} r={[0, 0, ang]} m={m.beam} cast={false} />
            <B p={[W / 4, 4.16, 0]} s={[rl, 0.1, 0.1]} r={[0, 0, -ang]} m={m.beam} cast={false} />
            {/* shaft hanger */}
            <B p={[-1.7, 3.8, 0]} s={[0.05, 0.3, 0.05]} m={m.iron} ink={false} cast={false} />
          </group>
        );
      })}
      {/* line shaft + pulleys */}
      <C p={[-1.7, 3.62, (HALL.zFront + HALL.zFar) / 2]} rt={0.03} rb={0.03} h={HALL.zFront - HALL.zFar} r={[Math.PI / 2, 0, 0]} m={m.steel} seg={10} ink={false} />
      {Array.from({ length: HALL.bays }, (_, i) => (
        <group key={i} position={[-1.7, 3.62, bayZ(i) - 0.1]} rotation={[f * 0.08, 0, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={m.iron} castShadow><cylinderGeometry args={[0.16, 0.16, 0.08, 20]} /><Ink k={0.8} /></mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} material={m.brass}><boxGeometry args={[0.3, 0.09, 0.03]} /></mesh>
        </group>
      ))}
      {/* pendant lamps down the centre */}
      {Array.from({ length: HALL.bays }, (_, i) => {
        const z = bayZ(i) + 0.15, near = i <= 4;
        const key = i === keyBay;
        return (
          <group key={i} position={[PENDANT_X, 0, z]}>
            <mesh position={[0, (H + PENDANT_Y) / 2 + 0.1, 0]} material={m.iron}><cylinderGeometry args={[0.006, 0.006, H - PENDANT_Y - 0.2, 5]} /></mesh>
            <mesh position={[0, PENDANT_Y + 0.12, 0]} material={m.shadeOut} castShadow><coneGeometry args={[0.3, 0.24, 28, 1, true]} /><Ink /></mesh>
            <mesh position={[0, PENDANT_Y + 0.12, 0]} material={m.shadeIn}><coneGeometry args={[0.29, 0.23, 28, 1, true]} /></mesh>
            <mesh position={[0, PENDANT_Y + 0.02, 0]} material={m.bulb}><sphereGeometry args={[0.065, 14, 10]} /></mesh>
            <sprite position={[0, PENDANT_Y, 0]} scale={[0.75, 0.75, 1]}><spriteMaterial map={haloTex} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.35} toneMapped={false} /></sprite>
            <mesh position={[0, PENDANT_Y - 1.1, 0]} visible={i <= 2}><cylinderGeometry args={[0.24, 0.85, 2.2, 32, 1, true]} /><meshBasicMaterial color="#ffb466" alphaMap={fadeTex} transparent opacity={0.022 * lit} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
            {key ? (
              <>
                <primitive object={target} position={[0, -3, 0]} />
                <spotLight position={[0, PENDANT_Y, 0]} target={target} color="#ffb565" intensity={26 * lit} distance={8} decay={1.8} angle={0.9} penumbra={0.7} castShadow shadow-mapSize={[shadowRes, shadowRes]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
              </>
            ) : near ? <pointLight position={[0, PENDANT_Y - 0.1, 0]} color="#ffad5e" intensity={5.5 * lit} distance={4.2} decay={1.7} /> : null}
          </group>
        );
      })}
    </group>
  );
};

/** Moonlight shafts through each window (additive, fading toward the floor). */
const MoonShafts: React.FC<{ fadeTex: THREE.Texture }> = ({ fadeTex }) => (
  <group>
    {Array.from({ length: HALL.bays }, (_, i) => (
      <mesh key={i} position={[HALL.x1 - 1.1, 1.75, bayZ(i) + 0.35]} rotation={[0.18, 0, -0.62]}>
        <planeGeometry args={[1.15, 3.4]} />
        <meshBasicMaterial color="#6f86ff" alphaMap={fadeTex} transparent opacity={0.028} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    ))}
  </group>
);

/** Right-hand floor row: cast-iron drill presses alternating with crate stacks (second repeating row of detail). */
const FloorRow: React.FC<{ m: M; f: number }> = ({ m, f }) => (
  <group>
    {Array.from({ length: HALL.bays }, (_, i) => {
      const z = bayZ(i) - 0.25, x = 1.42;
      if (i % 2 === 0) return (
        <group key={i} position={[x, 0, z]} rotation={[0, -Math.PI / 2 + 0.25, 0]}>
          <B p={[0, 0.05, 0]} s={[0.5, 0.1, 0.38]} m={m.iron} />
          <C p={[0, 0.85, -0.08]} rt={0.045} rb={0.05} h={1.6} m={m.iron} seg={14} />
          <B p={[0, 0.78, 0.06]} s={[0.34, 0.04, 0.3]} m={m.iron} />
          <B p={[0, 1.55, 0.02]} s={[0.24, 0.3, 0.42]} m={m.iron} />
          <B p={[0, 1.74, 0.02]} s={[0.2, 0.1, 0.34]} m={m.brassMatte} />
          <C p={[0, 1.33, 0.12]} rt={0.025} rb={0.012} h={0.16} m={m.steel} seg={10} />
          <group position={[0.15, 1.5, 0.05]} rotation={[f * 0.02, 0, 0]}>
            {[0, 1, 2].map((k) => <mesh key={k} rotation={[(k / 3) * Math.PI * 2, 0, 0]} position={[0, 0, 0]} material={m.steel}><boxGeometry args={[0.012, 0.012, 0.36]} /></mesh>)}
            {[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return <mesh key={k} position={[0, Math.sin(a) * 0.18, Math.cos(a) * 0.18]} material={m.leather}><sphereGeometry args={[0.025, 10, 8]} /></mesh>; })}
          </group>
          <mesh position={[0, 1.88, 0.02]} rotation={[0, 0, Math.PI / 2]} material={m.belt}><torusGeometry args={[0.1, 0.012, 6, 18]} /></mesh>
        </group>
      );
      return (
        <group key={i} position={[x + 0.1, 0, z]}>
          <B p={[0, 0.25, 0]} s={[0.5, 0.5, 0.5]} r={[0, 0.3, 0]} m={m.bench} />
          <B p={[0.02, 0.66, 0.02]} s={[0.38, 0.32, 0.38]} r={[0, -0.2, 0]} m={m.benchTop} />
          <mesh position={[-0.05, 0.86, 0]} rotation={[-Math.PI / 2, 0, 0.4]} material={m.brass}><torusGeometry args={[0.09, 0.02, 6, 16]} /></mesh>
          <C p={[0.08, 0.92, 0.05]} rt={0.06} rb={0.07} h={0.2} m={[m.jarG, m.jarA, m.jarB][i % 3]} seg={12} />
        </group>
      );
    })}
  </group>
);

export type HallProps = { f: number; shadowRes: number; keyBay?: number; lit?: number; reflectRes?: number };

export const LongHall: React.FC<HallProps> = ({ f, shadowRes, keyBay = 1, lit = 1, reflectRes = 512 }) => {
  const m = useHallMats();
  const gears = useMemo(() => [gearGeometry(12, 0.13, 0.11, 0.02, 0.03), gearGeometry(9, 0.1, 0.082, 0.018, 0.03)], []);
  const floorT = useMemo(() => hallFloor(1, 1), []);
  floorT.repeat.set((HALL.x1 - HALL.x0) / 3.2, (HALL.zFront - HALL.zFar) / 6.4);
  const rugT = useMemo(() => runnerRug(1), []);
  rugT.repeat.set(1, (HALL.zFront - HALL.zFar) / 2.4);
  const fadeTex = useMemo(() => fadeV(), []);
  const haloTex = useMemo(() => glow("rgba(255,200,130,1)", "rgba(255,150,60,0)"), []);
  const poolTex = useMemo(() => glow("rgba(255,170,80,0.55)", "rgba(255,120,40,0)"), []);
  const moonTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(-0.6, 0, -5.5); return o; }, []);
  const L = HALL.zFront - HALL.zFar, zc = (HALL.zFront + HALL.zFar) / 2;
  return (
    <group>
      {/* glossy reflective plank floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, zc]} receiveShadow>
        <planeGeometry args={[HALL.x1 - HALL.x0, L]} />
        <MeshReflectorMaterial map={floorT} color="#e6c2a8" roughness={0.35} metalness={0.05} mirror={0.75} blur={[220, 70]} resolution={reflectRes} mixBlur={0.8} mixStrength={3.2} mixContrast={1.1} depthScale={0.8} minDepthThreshold={0.3} maxDepthThreshold={1.4} />
      </mesh>
      {/* runner rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.15, 0.004, zc]} receiveShadow>
        <planeGeometry args={[0.92, L - 0.6]} />
        <meshStandardMaterial map={rugT} roughness={0.95} />
      </mesh>
      {/* left wall */}
      <mesh position={[HALL.x0, HALL.h / 2, zc]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[L, HALL.h]} />
        <primitive object={m.wallL} attach="material" />
      </mesh>
      <RightWall m={m} />
      <FarWall m={m} f={f} />
      <Ceiling m={m} f={f} lit={lit} fadeTex={fadeTex} haloTex={haloTex} keyBay={keyBay} shadowRes={shadowRes} />
      {Array.from({ length: HALL.bays }, (_, i) => <BenchUnit key={i} m={m} i={i} f={f} gears={gears} poolTex={poolTex} />)}
      <FloorRow m={m} f={f} />
      <MoonShafts fadeTex={fadeTex} />
      {/* cool bounce along the window wall so cabinets and frames keep their shape in shadow */}
      {[0, 2, 4, 6].map((i) => <pointLight key={i} position={[HALL.x1 - 0.5, 2.6, bayZ(i) - 0.9]} color="#6f7dff" intensity={1.1} distance={3.2} decay={1.8} />)}
      {/* moonlight: cool key through the windows, casts mullion patterns on the floor */}
      <primitive object={moonTarget} />
      <directionalLight position={[HALL.x1 + 5, 6.5, -9]} target={moonTarget} color="#8a9cff" intensity={3.4} castShadow
        shadow-mapSize={[shadowRes, shadowRes]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-near={0.5} shadow-camera-far={30} shadow-bias={-0.0006} shadow-normalBias={0.03} />
      {/* foreground framing: crate stack with parts (right) */}
      <group position={[1.75, 0, 1.15]}>
        <B p={[0, 0.3, 0]} s={[0.6, 0.6, 0.6]} r={[0, 0.25, 0]} m={m.bench} />
        <B p={[-0.05, 0.78, 0.02]} s={[0.42, 0.36, 0.42]} r={[0, -0.15, 0]} m={m.benchTop} />
        <C p={[0.05, 1.08, 0.0]} rt={0.08} rb={0.09} h={0.24} m={m.jarG} seg={14} />
      </group>
    </group>
  );
};
