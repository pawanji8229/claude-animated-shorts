// Composition: "Night Errand" — Odo v4 walks the Long Workshop (10 s). No on-screen text.
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Post } from "../lib/Post";
import { InkCtx } from "../inventor/Workshop";
import { LongHall } from "./LongHall";
import { Odo4 } from "../char/Odo4";
import { camH10, glowK, jarK, odoPos, odoPose } from "./timelineHall10";

const Rig: React.FC<{ f: number }> = ({ f }) => {
  const { camera, scene, gl } = useThree();
  const env = useMemo(() => { const pm = new THREE.PMREMGenerator(gl); const t = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return t; }, [gl]);
  useLayoutEffect(() => {
    scene.environment = env; scene.environmentIntensity = 0.14;
    scene.background = new THREE.Color("#0d0b18"); scene.fog = new THREE.Fog("#231b3d", 9, 34);
    const c = camH10(f), cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...c.pos); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = 0.05; cam.far = 60; cam.updateProjectionMatrix();
  });
  return null;
};
const RenderAfterMount: React.FC<{ f: number }> = ({ f }) => {
  const advance = useThree((s) => s.advance);
  useEffect(() => { advance(performance.now()); }, [f, advance]);
  return null;
};

export const Hall10: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920;
  const c = camH10(f), p = odoPos(f), pose = odoPose(f);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0a14" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }}
        gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.05, far: 60 }}>
        <Rig f={f} />
        <InkCtx.Provider value={2.8 * k}>
          <hemisphereLight args={["#5c66c4", "#241a30", 0.95]} />
          <LongHall f={f} shadowRes={hi ? 4096 : 2048} keyBay={1} reflectRes={hi ? 1024 : 512} />
          {/* warm face key that travels with Odo (motivated by the pendants / his jar) */}
          <pointLight position={[p[0] + 0.35, 2.3, p[2] + 1.5]} color="#ffc48a" intensity={3.4} distance={4.5} decay={1.8} />
          <Odo4 pose={pose} pos={p} cam={c.pos} hi={hi} jar={jarK(f)} glowK={glowK(f)} />
        </InkCtx.Provider>
        <Post params={{ focusDist: c.focus, focusRange: c.shot === 3 ? 0.6 : c.shot === 0 ? 0.9 : 1.6, maxBlur: c.shot === 1 ? 0.3 : 0.6,
          bloom: 0.8 + 0.1 * jarK(f), threshold: 1.55, exposure: 1.0, vignette: 0.62, ss: 2, contrast: 1.16, saturation: 1.1, lift: 0.012, warmCool: 1 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
