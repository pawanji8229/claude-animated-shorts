// Arizona works (film frames 1064-1480) inside the SAME detailed desert world as the hook and the approved Reopening:
// 1960s flatbed trucks with numbered blocks + dust, the granite facing rising around the concrete core (scaffold, mobile
// crane, mixer truck, independent crew), the "no river" callback with Hal, excavators, and the flood filling the channel.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Post } from "../../lib/Post";
import { InkCtx, Ink } from "../../inventor/Workshop";
import { DesertWorld, groundY, BR } from "../../desert/DesertWorld";
import { BRIDGE_LEN } from "../../desert/Bridge";
import { softGlow } from "../../desert/desertTextures";
import { V3, rng } from "../../lib/math";
import { SetRig, RenderAfterMount, Toon, TAU } from "./common";
import * as W from "./worksTimeline";

const useMats = () => useMemo(() => ({
  cab: [new THREE.MeshStandardMaterial({ color: "#2f6f8f", roughness: 0.55 }), new THREE.MeshStandardMaterial({ color: "#a3392b", roughness: 0.55 }), new THREE.MeshStandardMaterial({ color: "#d9a43a", roughness: 0.55 })],
  chrome: new THREE.MeshStandardMaterial({ color: "#d8dde2", metalness: 0.85, roughness: 0.25 }), tyre: new THREE.MeshStandardMaterial({ color: "#1c1c1e", roughness: 0.9 }),
  glass: new THREE.MeshStandardMaterial({ color: "#3d5566", metalness: 0.3, roughness: 0.15 }), bed: new THREE.MeshStandardMaterial({ color: "#6b4e34", roughness: 0.85 }),
  stone: new THREE.MeshStandardMaterial({ color: "#c4ad8f", roughness: 0.9 }), steel: new THREE.MeshStandardMaterial({ color: "#8a8f96", metalness: 0.6, roughness: 0.45 }),
  yellow: new THREE.MeshStandardMaterial({ color: "#e0a91f", roughness: 0.55 }), dark: new THREE.MeshStandardMaterial({ color: "#2a2b30", roughness: 0.6 }),
  dirt: new THREE.MeshStandardMaterial({ color: "#a06a42", roughness: 1 }), drum: new THREE.MeshStandardMaterial({ color: "#e4e0d6", roughness: 0.6 }),
  dust: new THREE.SpriteMaterial({ map: softGlow("rgba(232,198,154,0.55)", "rgba(232,198,154,0)"), transparent: true, depthWrite: false }), foam: new THREE.MeshStandardMaterial({ color: "#f4fbfb", roughness: 0.6, transparent: true, opacity: 0.9 }),
}), []);
type Mt = ReturnType<typeof useMats>;

const Wheel: React.FC<{ p: V3; spin: number; m: Mt }> = ({ p, spin, m }) => (
  <group position={p} rotation={[0, 0, -spin]}><mesh rotation={[Math.PI / 2, 0, 0]} material={m.tyre} castShadow><cylinderGeometry args={[0.45, 0.45, 0.32, 18]} /><Ink k={0.6} /></mesh><mesh rotation={[Math.PI / 2, 0, 0]} material={m.chrome}><cylinderGeometry args={[0.22, 0.22, 0.34, 10]} /></mesh></group>
);
/** original 1960s long-nose flatbed truck, +x forward */
const Truck: React.FC<{ i: number; spin: number; m: Mt }> = ({ i, spin, m }) => (
  <group>
    <mesh position={[2.4, 1.05, 0]} material={m.cab[i % 3]} castShadow><boxGeometry args={[1.8, 0.9, 1.9]} /><Ink k={0.8} /></mesh>
    <mesh position={[1.1, 1.55, 0]} material={m.cab[i % 3]} castShadow><boxGeometry args={[1.3, 1.6, 2.1]} /><Ink k={0.8} /></mesh>
    <mesh position={[1.62, 1.85, 0]} material={m.glass}><boxGeometry args={[0.06, 0.62, 1.8]} /></mesh>
    <mesh position={[3.33, 1.0, 0]} material={m.chrome}><boxGeometry args={[0.08, 0.7, 1.5]} /></mesh>
    <mesh position={[3.4, 0.62, 0]} material={m.chrome}><boxGeometry args={[0.14, 0.2, 2.1]} /></mesh>
    <mesh position={[-1.9, 0.95, 0]} material={m.bed} castShadow receiveShadow><boxGeometry args={[4.6, 0.25, 2.2]} /><Ink k={0.7} /></mesh>
    <mesh position={[-1.4, 0.7, 0]} material={m.dark}><boxGeometry args={[7, 0.2, 0.9]} /></mesh>
    {Array.from({ length: 8 }, (_, k) => <mesh key={k} position={[-3.6 + (k % 4) * 1.05, 1.36, -0.5 + Math.floor(k / 4) * 1.0]} material={m.stone} castShadow><boxGeometry args={[0.95, 0.55, 0.8]} /><Ink k={0.5} /></mesh>)}
    {[[2.5, 0.45, 0.95], [2.5, 0.45, -0.95], [-2.4, 0.45, 0.95], [-2.4, 0.45, -0.95], [-3.4, 0.45, 0.95], [-3.4, 0.45, -0.95]].map((p, k) => <Wheel key={k} p={p as V3} spin={spin} m={m} />)}
  </group>
);
/** original excavator: tracks, cab, articulated boom/arm/bucket */
const Excavator: React.FC<{ q: ReturnType<typeof W.excPose>; m: Mt }> = ({ q, m }) => (
  <group>
    {[-1, 1].map((s) => <mesh key={s} position={[0, 0.4, s * 1.05]} material={m.dark} castShadow><boxGeometry args={[3.4, 0.8, 0.6]} /><Ink k={0.7} /></mesh>)}
    <group position={[0, 0.9, 0]} rotation={[0, q.yaw, 0]}>
      <mesh position={[-0.3, 0.5, 0]} material={m.yellow} castShadow><boxGeometry args={[2.6, 1.0, 2.2]} /><Ink k={0.8} /></mesh>
      <mesh position={[0.5, 1.4, -0.5]} material={m.yellow} castShadow><boxGeometry args={[1.1, 1.0, 1.0]} /><Ink k={0.7} /></mesh>
      <mesh position={[0.95, 1.45, -0.5]} material={m.glass}><boxGeometry args={[0.05, 0.7, 0.8]} /></mesh>
      <group position={[0.9, 1.0, 0.4]} rotation={[0, 0, q.boom]}>
        <mesh position={[1.6, 0, 0]} material={m.yellow} castShadow><boxGeometry args={[3.2, 0.4, 0.4]} /><Ink k={0.6} /></mesh>
        <group position={[3.2, 0, 0]} rotation={[0, 0, -q.arm]}>
          <mesh position={[1.1, 0, 0]} material={m.yellow} castShadow><boxGeometry args={[2.2, 0.3, 0.3]} /><Ink k={0.6} /></mesh>
          <group position={[2.2, 0, 0]} rotation={[0, 0, -q.bucket]}><mesh position={[0.3, -0.2, 0]} material={m.dark} castShadow><boxGeometry args={[0.7, 0.6, 0.9]} /><Ink k={0.6} /></mesh></group>
        </group>
      </group>
    </group>
  </group>
);

export const DesertWorks: React.FC<{ from: number }> = ({ from }) => {
  const f = useCurrentFrame() + from;
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920;
  const c = W.camWorks(f, W.halWorksVisible(f) && f > 1285 && f < 1405 ? [W.HAL_W[0], 1.0, W.HAL_W[2]] : undefined);
  const m = useMats();
  const trucks = W.trucksAt(f), mc = W.mcraneAt(f), down = W.scaffoldDown(f);
  const scaffold = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 1, 5), mesh = new THREE.InstancedMesh(geo, m.steel, 1400), o = new THREE.Object3D(); let n = 0;
    for (let x = -BRIDGE_LEN / 2 + 1; x < BRIDGE_LEN / 2 - 1 && n < 1380; x += 1.6) for (let lv = 0; lv < 5; lv++) {
      const y = lv * 1.9; o.rotation.set(0, 0, 0); o.scale.set(1, 1.9, 1); o.position.set(x, y + 0.95, BR.width / 2 + 0.9); o.updateMatrix(); mesh.setMatrixAt(n++, o.matrix);
      o.position.set(x, y + 0.95, BR.width / 2 + 1.7); o.updateMatrix(); mesh.setMatrixAt(n++, o.matrix);
      o.rotation.set(0, 0, Math.PI / 2); o.scale.set(1, 1.6, 1); o.position.set(x + 0.8, y + 1.9, BR.width / 2 + 1.3); o.updateMatrix(); mesh.setMatrixAt(n++, o.matrix);
    }
    mesh.count = n; mesh.castShadow = true; return mesh;
  }, [m]);
  const dust = useMemo(() => Array.from({ length: 36 }, (_, i) => i), []);
  const floodF = W.floodFront(f), floodY = W.floodY(f), flooding = f >= 1444;
  const piles = useMemo(() => { const r = rng(4); return Array.from({ length: 9 }, (_, i) => ({ p: [(i % 2 ? 1 : -1) * (BR.chanHalf + 1.5 + r() * 2), -0.1, -14 + i * 3.2] as V3, s: 0.8 + r() * 0.9 })); }, []);
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a120c" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.1, far: 1400 }}>
        <SetRig c={c} bg="#e9b88f" fog={["#efbb8c", 45, 300]} clip />
        <InkCtx.Provider value={2.8 * k}>
          <DesertWorld f={f} shadowRes={hi ? 4096 : 2048} tumble={f >= 1290 && f < 1420 ? W.tumbleWorks(f) : []} leftovers={false}
            build={f < 1268 ? { clipY: W.buildClip(f), core: true } : undefined} water={flooding} waterY={floodY} waterFront={floodF}
            clearZones={[[-95, -10, 11, 21]]}>
            {/* trucks + dust trails */}
            {f < 1160 && trucks.map((t) => <group key={t.i} position={t.pos} rotation={[0, t.ry, 0]}><Truck i={t.i} spin={t.spin} m={m} /></group>)}
            {f < 1160 && trucks.map((t) => dust.slice(0, 12).map((d) => { const back = (d + (f % 3) / 3) * 0.9, a = Math.max(0, 1 - back / 11) * Math.min(1, Math.abs(t.speed) / 6); return a > 0.02 ? <sprite key={`${t.i}-${d}`} position={[t.pos[0] - 4 - back, t.pos[1] + 0.5 + back * 0.12, t.pos[2] + Math.sin(d * 2.1) * 0.6]} scale={[(1.8 + back * 0.5) * (0.6 + 0.4 * a), (1.4 + back * 0.4) * (0.6 + 0.4 * a), 1]} material={m.dust} /> : null; }))}
            {/* rebuild: scaffold (comes down), mobile crane, mixer truck, block stacks */}
            {f >= 1120 && f < 1275 && <group position={[0, -down * 9.5, 0]}><primitive object={scaffold} /></group>}
            {f >= 1120 && f < 1285 && <group position={[W.MCRANE[0], groundY(W.MCRANE[0], W.MCRANE[2]), W.MCRANE[2]]}>
              <group rotation={[0, 0.3, 0]}><Truck i={2} spin={0} m={m} /></group>
              <group position={[0, 1.6, 0]} rotation={[0, mc.yaw, 0]}>
                <mesh position={[0, 0.4, 0]} material={m.yellow} castShadow><boxGeometry args={[1.6, 0.8, 1.6]} /><Ink k={0.7} /></mesh>
                <mesh position={[4.2, 4.0, 0]} rotation={[0, 0, 0.95]} material={m.yellow} castShadow><boxGeometry args={[10.5, 0.45, 0.45]} /><Ink k={0.6} /></mesh>
                <mesh position={[7.4, 8.2 - mc.hook / 2 - 0.2, 0]} material={m.dark}><cylinderGeometry args={[0.03, 0.03, Math.max(0.2, 8.2 - mc.hook), 4]} /></mesh>
                {mc.carrying && <mesh position={[7.4, 8.2 - (8.2 - mc.hook) - 0.5, 0]} material={m.stone} castShadow><boxGeometry args={[0.95, 0.55, 0.8]} /><Ink k={0.5} /></mesh>}
              </group>
            </group>}
            {f >= 1120 && f < 1285 && <group position={[12.5, groundY(12.5, 10.5), 10.5]} rotation={[0, -0.4, 0]}>
              <mesh position={[2.3, 1.2, 0]} material={m.cab[0]} castShadow><boxGeometry args={[1.4, 1.6, 2.0]} /><Ink k={0.8} /></mesh>
              <mesh position={[-1, 0.7, 0]} material={m.dark}><boxGeometry args={[5, 0.3, 1.2]} /></mesh>
              <group position={[-1.0, 1.8, 0]} rotation={[0, 0, 0.25]}><mesh rotation={[0, 0, Math.PI / 2]} material={m.drum} castShadow><cylinderGeometry args={[0.8, 1.15, 3.2, 16]} /><Ink k={0.7} /></mesh>{[0, 1, 2].map((j) => <mesh key={j} rotation={[W.mixerDrum(f) + j * 2.1, 0, Math.PI / 2]} material={m.cab[1]}><torusGeometry args={[1.0, 0.05, 6, 18, 1.2]} /></mesh>)}</group>
              {[[2.3, 0.45, 0.9], [2.3, 0.45, -0.9], [-2.2, 0.45, 0.9], [-2.2, 0.45, -0.9]].map((p, kk) => <Wheel key={kk} p={p as V3} spin={0} m={m} />)}
            </group>}
            {f >= 1120 && f < 1250 && Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[-13 + (i % 5) * 1.0, groundY(-13, 12.6) + 0.28 + Math.floor(i / 5) * 0.56, 12.6]} material={m.stone} castShadow><boxGeometry args={[0.95, 0.55, 0.8]} /><Ink k={0.5} /></mesh>)}
            {/* crew */}
            {W.crewVisible(f) && W.CREW.map((p, i) => <Toon key={i} pose={W.crewPose(i, f)} pos={[p.pos[0], groundY(p.pos[0], p.pos[2]), p.pos[2]]} cam={c.pos} h={p.h} hi={hi} halo={0.1} />)}
            {/* Hal: callback under the dry arch */}
            {W.halWorksVisible(f) && <Toon pose={W.halWorksPose(f)} pos={W.HAL_W} cam={c.pos} hi={hi} light={4.5} />}
            {/* excavators + soil piles + flood front */}
            {W.excVisible(f) && W.EXC.map((e, i) => <group key={i} position={[e.pos[0], e.pos[1], e.pos[2] - W.excPose(i, f).retreat * 0]} rotation={[0, e.ry, 0]}><Excavator q={W.excPose(i, f)} m={m} /></group>)}
            {f >= 1392 && piles.map((p, i) => <mesh key={i} position={p.p} scale={[p.s * 1.6, p.s, p.s * 1.3]} material={m.dirt} castShadow receiveShadow><icosahedronGeometry args={[1, 1]} /><Ink k={0.6} /></mesh>)}
            {flooding && floodF > -40 && floodF < 58 && Array.from({ length: 16 }, (_, i) => <mesh key={i} position={[-BR.chanHalf + 0.4 + i * 0.6, floodY + 0.12 + 0.12 * Math.sin(f * 0.7 + i), floodF - 0.3 * Math.abs(Math.sin(i * 1.7))]} material={m.foam}><icosahedronGeometry args={[0.38 + 0.12 * Math.sin(i * 2.3 + f * 0.4), 1]} /></mesh>)}
          </DesertWorld>
        </InkCtx.Provider>
        <Post params={{ focusDist: c.focus, focusRange: 4.5, maxBlur: 0.2, bloom: 0.7, threshold: 1.7, exposure: 1.0, vignette: 0.55, ss: hi ? 1 : 2, contrast: 1.15, saturation: 1.08, lift: 0.012, warmCool: 0.8, ao: 0.6, aoRadius: 0.6 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
void TAU;
