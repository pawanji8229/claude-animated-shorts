// short3 test bench (not part of the film): renders new models from fixed inspection cameras, one camera per frame.
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Post } from "../../lib/Post";
import { InkCtx } from "../../inventor/Workshop";
import { V3 } from "../../lib/math";
import { SetRig, RenderAfterMount } from "../london-bridge/common";
import { useTexReady } from "./tex";
import { SkyEnv } from "./SkyEnv";
import { HeroBuilding } from "./Hero";
import { StreetStatic, Skyline } from "./Street";
import { StreetBuildings } from "./Neighbours";
import { Car30, Truck30, Streetcar, Crane30 } from "./Vehicles";
import { TRACK_Z, WIRE_Y } from "./Street";
import { BD } from "./world";

const CAMS: { pos: V3; look: V3; fov: number }[] = [
  { pos: [16, 3, 26], look: [0, 6, 9], fov: 50 },        // 0 front 3/4 street level
  { pos: [3, 1.7, 15], look: [0, 2.2, 9], fov: 45 },      // 1 entrance close
  { pos: [7, 13, 13.5], look: [3, 12.5, 9], fov: 40 },    // 2 windows close (floor 3)
  { pos: [30, 20, 30], look: [0, 14, 0], fov: 45 },       // 3 aerial 3/4 front-east
  { pos: [22, 4, 2], look: [12, 8, -2], fov: 50 },        // 4 east side + fire escape
  { pos: [10, 33, 14], look: [4, 31, 9], fov: 45 },       // 5 cornice close
  { pos: [-25, 40, -30], look: [0, 25, 0], fov: 45 },     // 6 back aerial
  { pos: [1.2, 1.9, BD / 2 + 3.5], look: [0, 2.0, 5], fov: 50 },  // 7 into the portal
  { pos: [9.5, 1.75, 19], look: [-4, 4, 9], fov: 50 },    // 8 film 259: sidewalk toward the entrance
  { pos: [6, 1.7, 14], look: [20, 3, 28], fov: 50 },      // 9 across the street (shopfronts)
  { pos: [30, 44, 19], look: [0, 0, -1], fov: 44 },       // 10 film 600 crane-up
  { pos: [-10, 9.5, 17], look: [-10, 9, 9], fov: 42 },    // 11 film 795 window track
  { pos: [32, 44, 20], look: [-8, 0, -6], fov: 46 },      // 12 aerial
  { pos: [-5, 2.6, -21], look: [-21, 2, -16], fov: 50 },  // 13 finished/gangway area
  { pos: [-30, 3, 13], look: [-40, 3, 0], fov: 50 },      // 14 hoarding + lot
  { pos: [40, 2.5, 20], look: [20, 4, 9], fov: 50 },      // 15 right neighbours
  { pos: [9, 1.6, 18.5], look: [6, 0.9, 15.2], fov: 45 },  // 16 car close
  { pos: [1, 2.0, 19.5], look: [-3, 1.2, 15.6], fov: 50 }, // 17 truck
  { pos: [6, 2.2, 24], look: [16, 2.5, TRACK_Z], fov: 50 }, // 18 streetcar
  { pos: [18, 3.0, 13], look: [24, 4, 19], fov: 60 },      // 19 crane
];
export const S3Bench: React.FC = () => {
  const ready = useTexReady(); const f = useCurrentFrame(); const { width, height } = useVideoConfig();
  if (!ready) return null;
  const c = CAMS[f % CAMS.length], cam = { ...c, focus: Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]) };
  return (
    <AbsoluteFill style={{ backgroundColor: "#9ec3e6" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.1, far: 1400 }}>
        <SetRig c={cam} bg="#9ec3e6" fog={["#c6d3dc", 90, 520]} env={0.3} />
        <SkyEnv />
        <InkCtx.Provider value={2.8 * height / 1920}>
          <hemisphereLight args={["#cfe0ff", "#8a7358", 0.9]} />
          <directionalLight position={[-30, 70, 55]} color="#fff2dc" intensity={2.8} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-camera-far={300} shadow-bias={-0.0004} shadow-normalBias={0.03} />
          <HeroBuilding /><StreetStatic /><StreetBuildings /><Skyline />
          <group position={[6, 0.02, 15.2]}><Car30 color="#1f2a3a" spin={0.3} /></group>
          <group position={[-3, 0.02, 15.6]}><Truck30 color="#2f4a2a" spin={0} load={0.8} /></group>
          <group position={[16, 0.03, TRACK_Z]}><Streetcar wireY={WIRE_Y + 0.13} /></group>
          <group position={[26, 0.02, 19]} rotation={[0, Math.PI, 0]}><Crane30 phase={0.4} yaw={0} swing={0.15} /></group>
        </InkCtx.Provider>
        <Post params={{ focusDist: cam.focus, focusRange: 8, maxBlur: 0.1, bloom: 0.5, threshold: 1.6, exposure: 1.25, vignette: 0.4, ss: 2, contrast: 1.12, saturation: 1.05, lift: 0.01, warmCool: 0.5, ao: 0.6, aoRadius: 0.6 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
