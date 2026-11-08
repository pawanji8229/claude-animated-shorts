// Composition: "The Awkward Encounter" — one continuous 10 s take, no cuts, no on-screen text.
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Post } from "../lib/Post";
import { InkCtx } from "../inventor/Workshop";
import { LongHall } from "./LongHall";
import { HallDetail } from "./HallDetail";
import { CardSprite } from "../char/CardSprite";
import { drawOdo5, headCenterPx5, W5, H5, SOLE5, CARD_H5, PX5 } from "../char/odo5";
import { glow } from "./hallTextures";
import { camTake, handWorld, lanternAngle, odoAt, poseTake } from "./take10";
import { V3 } from "../lib/math";

const Rig: React.FC<{ f: number }> = ({ f }) => {
  const { camera, scene, gl } = useThree();
  const env = useMemo(() => { const pm = new THREE.PMREMGenerator(gl); const t = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return t; }, [gl]);
  useLayoutEffect(() => {
    scene.environment = env; scene.environmentIntensity = 0.14;
    scene.background = new THREE.Color("#0d0b18"); scene.fog = new THREE.Fog("#231b3d", 8, 30);
    const c = camTake(f), cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...c.pos); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = 0.04; cam.far = 60; cam.updateProjectionMatrix();
  });
  return null;
};
const RenderAfterMount: React.FC<{ f: number }> = ({ f }) => {
  const advance = useThree((s) => s.advance);
  useEffect(() => { advance(performance.now()); }, [f, advance]);
  return null;
};

const Lantern: React.FC<{ at: V3; angle: number; yaw: number; k: number }> = ({ at, angle, yaw, k }) => {
  const halo = useMemo(() => glow("rgba(255,214,130,1)", "rgba(255,160,60,0)"), []);
  return (
    <group position={at} rotation={[0, yaw, 0]}>
      <group rotation={[0, 0, angle]}>
        {/* bail handle */}
        <mesh position={[0, -0.05, 0]}><torusGeometry args={[0.045, 0.004, 6, 16, Math.PI]} /><meshStandardMaterial color="#8c6522" metalness={0.7} roughness={0.35} /></mesh>
        <group position={[0, -0.14, 0]}>
          <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.02, 0.055, 0.04, 16]} /><meshStandardMaterial color="#c99a3a" metalness={0.75} roughness={0.3} /></mesh>
          <mesh><cylinderGeometry args={[0.045, 0.045, 0.1, 16]} /><meshStandardMaterial color="#fff3d6" transparent opacity={0.35} roughness={0.05} /></mesh>
          {[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.cos((i / 4) * Math.PI * 2) * 0.046, 0, Math.sin((i / 4) * Math.PI * 2) * 0.046]}><boxGeometry args={[0.006, 0.1, 0.006]} /><meshStandardMaterial color="#8c6522" metalness={0.7} roughness={0.35} /></mesh>)}
          <mesh position={[0, -0.058, 0]}><cylinderGeometry args={[0.055, 0.05, 0.02, 16]} /><meshStandardMaterial color="#c99a3a" metalness={0.75} roughness={0.3} /></mesh>
          <mesh><sphereGeometry args={[0.018, 10, 8]} /><meshBasicMaterial color={[3.6 * k, 2.6 * k, 1.1 * k]} toneMapped={false} /></mesh>
          <sprite scale={[0.42, 0.42, 1]}><spriteMaterial map={halo} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
          <pointLight color="#ffc070" intensity={1.8 * k} distance={2.6} decay={1.8} />
        </group>
      </group>
    </group>
  );
};

export const Take10: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920;
  const c = camTake(f), o = odoAt(f), pose = poseTake(f);
  const yaw = Math.atan2(c.pos[0] - o[0], c.pos[2] - o[2]);
  const hc = headCenterPx5(pose);
  const head: V3 = [o[0] + Math.cos(yaw) * (hc[0] - W5 / 2) * PX5 - Math.sin(yaw) * 0.04, (SOLE5 - hc[1]) * PX5, o[2] - Math.sin(yaw) * (hc[0] - W5 / 2) * PX5 - Math.cos(yaw) * 0.04];
  const halo = useMemo(() => glow("rgba(255,236,205,0.9)", "rgba(255,210,160,0)"), []);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0a14" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }}
        gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.04, far: 60 }}>
        <Rig f={f} />
        <InkCtx.Provider value={2.8 * k}>
          <hemisphereLight args={["#5c66c4", "#241a30", 0.9]} />
          <LongHall f={f} shadowRes={hi ? 4096 : 2048} keyBay={1} reflectRes={hi ? 1024 : 512} />
          <HallDetail f={f} />
          {/* warm face key travelling with Odo (motivated by pendant + lantern), cool back-rim from the windows */}
          <pointLight position={[o[0] + 0.45, 2.2, o[2] + 1.4]} color="#ffc48a" intensity={3.2} distance={4.5} decay={1.8} />
          <pointLight position={[o[0] - 0.9, 1.8, o[2] - 1.3]} color="#7f8dff" intensity={2.4} distance={3.2} decay={2} />
          <CardSprite W={W5} H={H5} sole={SOLE5} cardH={CARD_H5} pos={o} camPos={c.pos} texScale={hi ? 2 : 1.3}
            albedo={0.8} fill={0.85} fillColor="#fff4e8" contact={0.85}
            draw={(g) => drawOdo5(g, pose)} drawMask={(g) => drawOdo5(g, pose, true)} />
          <sprite position={head} scale={[0.95, 0.95, 1]}><spriteMaterial map={halo} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
          <Lantern at={handWorld(f)} angle={lanternAngle(f)} yaw={yaw} k={1} />
        </InkCtx.Provider>
        <Post params={{ focusDist: c.focus, focusRange: 0.9, maxBlur: 0.55, bloom: 0.85, threshold: 1.55, exposure: 1.0, vignette: 0.64, ss: 2, contrast: 1.2, saturation: 1.1, lift: 0.01, warmCool: 1 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
