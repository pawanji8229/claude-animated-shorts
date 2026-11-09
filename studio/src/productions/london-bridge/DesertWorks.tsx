// Arizona works (film frames 1052-1499) v2 inside the SAME detailed desert world as the hook and the approved Reopening.
// The site exists from the first frame (scaffold, truck crane on outriggers, mixer, block stack, crew at work); detailed
// 1960s trucks drive the numbered blocks in and PARK (nothing vanishes); the crane picks blocks off the stack and sets
// them at the rising granite facing around the concrete core; the crew walk off, Hal walks in for the "no river"
// callback and slinks away; tracked excavators drive in along the channel, dig, and climb out ahead of the water;
// spoil piles grow with the digging. No object is toggled on or off inside the frame.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Post } from "../../lib/Post";
import { InkCtx, Ink } from "../../inventor/Workshop";
import { DesertWorld, groundY, BR } from "../../desert/DesertWorld";
import { BRIDGE_LEN } from "../../desert/Bridge";
import { softGlow } from "../../desert/desertTextures";
import { V3, rng, smooth } from "../../lib/math";
import { Excavator5, GraniteBlock, MixerTruck, Truck5, TruckCrane } from "./assets";
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

export const DesertWorks: React.FC<{ from: number }> = ({ from }) => {
  const f = useCurrentFrame() + from;
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920;
  const halP = W.halWorksAt(f);
  const c = W.camWorks(f, W.halWorksVisible(f) && f > 1285 && f < 1405 ? [halP[0], halP[1] + 1.0, halP[2]] : undefined);
  const m = useMats();
  const trucks = W.trucksAt(f), mc = W.mcraneAt(f);
  const scaffold = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 1, 5), mesh = new THREE.InstancedMesh(geo, m.steel, 1400), o = new THREE.Object3D(); let n = 0;
    for (let x = -BRIDGE_LEN / 2 + 1; x < BRIDGE_LEN / 2 - 1 && n < 1380; x += 1.6) if (Math.abs(x) > BR.chanBank + 1.2) for (let lv = 0; lv < 5; lv++) {   // outer spans only: the channel stays clear for the excavators
      const y = lv * 1.9; o.rotation.set(0, 0, 0); o.scale.set(1, 1.9, 1); o.position.set(x, y + 0.95, BR.width / 2 + 0.9); o.updateMatrix(); mesh.setMatrixAt(n++, o.matrix);
      o.position.set(x, y + 0.95, BR.width / 2 + 1.7); o.updateMatrix(); mesh.setMatrixAt(n++, o.matrix);
      o.rotation.set(0, 0, Math.PI / 2); o.scale.set(1, 1.6, 1); o.position.set(x + 0.8, y + 1.9, BR.width / 2 + 1.3); o.updateMatrix(); mesh.setMatrixAt(n++, o.matrix);
    }
    mesh.count = n; mesh.castShadow = true; return mesh;
  }, [m]);
  const dust = useMemo(() => Array.from({ length: 36 }, (_, i) => i), []);
  const floodF = W.floodFront(f), floodY = W.floodY(f), flooding = f >= 1444, dig = W.digProgress(f);
  const piles = useMemo(() => { const r = rng(4); return Array.from({ length: 9 }, (_, i) => ({ p: [(i % 2 ? 1 : -1) * (BR.chanHalf + 1.5 + r() * 2), -0.1, -14 + i * 3.2] as V3, s: 0.8 + r() * 0.9 })); }, []);
  const cargo = [[1201, 1208, 1215, 1222, 1229, 1236], [1301, 1308, 1315, 1322, 1329, 1336], [1401, 1408, 1415, 1422, 1429, 1436]];
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a120c" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.1, far: 1400 }}>
        <SetRig c={c} bg="#e9b88f" fog={["#efbb8c", 45, 300]} clip />
        <InkCtx.Provider value={2.8 * k}>
          <DesertWorld f={f} shadowRes={hi ? 4096 : 2048} tumble={f >= 1290 && f < 1420 ? W.tumbleWorks(f) : []} leftovers={false}
            build={f < 1268 ? { clipY: W.buildClip(f), core: true } : undefined} water={flooding} waterY={floodY} waterFront={floodF}
            clearZones={[[-95, -10, 11, 21]]}>
            {/* 1960s trucks drive the numbered blocks in and park */}
            {trucks.map((t) => <group key={t.i} position={t.pos} rotation={[0, t.ry, 0]}><Truck5 c={t.i} spin={t.spin} cargo={cargo[t.i]} /></group>)}
            {trucks.map((t) => dust.slice(0, 12).map((d) => { const back = (d + (f % 3) / 3) * 0.9, a = Math.max(0, 1 - back / 11) * Math.min(1, Math.abs(t.speed) / 6); return a > 0.02 ? <sprite key={`${t.i}-${d}`} position={[t.pos[0] - 4.6 - back, t.pos[1] + 0.5 + back * 0.12, t.pos[2] + Math.sin(d * 2.1) * 0.6]} scale={[(1.8 + back * 0.5) * (0.6 + 0.4 * a), (1.4 + back * 0.4) * (0.6 + 0.4 * a), 1]} material={m.dust} /> : null; }))}
            {/* rebuild: scaffold (comes down), truck crane setting blocks, mixer truck, block stack */}
            {W.scaffoldUp(f) && <primitive object={scaffold} />}
            <group position={[W.MCRANE[0], groundY(W.MCRANE[0], W.MCRANE[2]), W.MCRANE[2]]} rotation={[0, W.MC_RY, 0]}>
              <TruckCrane yaw={mc.yaw} hookDrop={mc.hookDrop} carrying={mc.carrying} blockN={2101 + mc.n * 11} blockSpin={mc.blockSpin} />
            </group>
            {W.MC_STACK_BASE.map((b, i) => <GraniteBlock key={`s${i}`} n={2201 + i * 7} p={b.p} ry={b.ry} />)}
            {W.MC_PICKS.map((b, i) => i >= mc.picked && <GraniteBlock key={`p${i}`} n={2101 + i * 11} p={b.p} ry={b.ry} />)}
            {[0, 1, 2].map((i) => i < mc.placed && <GraniteBlock key={`d${i}`} n={2101 + i * 11} p={W.mcSetAt(i).p} ry={0} ink={0.3} />)}
            <group position={[12.5, groundY(12.5, 10.5), 10.5]} rotation={[0, -0.4 + Math.PI, 0]}><MixerTruck drum={W.mixerDrum(f)} spin={0} c={0} /></group>
            {/* crew (always present; three walk off before Hal's scene) */}
            {W.crewVisible(f) && W.CREW.map((p, i) => <Toon key={i} pose={W.crewPose(i, f)} pos={W.crewAt(i, f)} cam={c.pos} h={p.h} hi={hi} halo={0.1} />)}
            {/* Hal: walks in, callback under the dry arch, slinks away */}
            {W.halWorksVisible(f) && <Toon pose={W.halWorksPose(f)} pos={halP} cam={c.pos} hi={hi} light={4.5} flip={f >= 1402} />}
            {/* excavators drive in, dig, climb out; spoil piles grow with the digging */}
            {W.EXC.map((e, i) => { const pl = W.excPlace(i, f); return <group key={i} position={pl.pos} rotation={[0, pl.ry, 0]}><group rotation={[0, 0, pl.pitch]}><Excavator5 q={W.excPose(i, f)} /></group></group>; })}
            {dig > 0.01 && piles.map((p, i) => <mesh key={i} position={p.p} scale={[p.s * 1.6 * dig, p.s * dig, p.s * 1.3 * dig]} material={m.dirt} castShadow receiveShadow><icosahedronGeometry args={[1, 1]} /><Ink k={0.6} /></mesh>)}
            {flooding && floodF > -40 && floodF < 58 && Array.from({ length: 16 }, (_, i) => <mesh key={i} position={[-BR.chanHalf + 0.4 + i * 0.6, floodY + 0.12 + 0.12 * Math.sin(f * 0.7 + i), floodF - 0.3 * Math.abs(Math.sin(i * 1.7))]} material={m.foam}><icosahedronGeometry args={[0.38 + 0.12 * Math.sin(i * 2.3 + f * 0.4), 1]} /></mesh>)}
          </DesertWorld>
        </InkCtx.Provider>
        <Post params={{ focusDist: c.focus, focusRange: 4.5, maxBlur: 0.2, bloom: 0.7, threshold: 1.7, exposure: 1.0, vignette: 0.55, ss: hi ? 1 : 2, contrast: 1.15, saturation: 1.08, lift: 0.012, warmCool: 0.8, ao: 0.6, aoRadius: 0.6 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
void TAU; void smooth;
