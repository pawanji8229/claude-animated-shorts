// Three approval frames (no text overlays of any kind):
//   "character"   — full-body Odo v3 (front + side mid-stride) in a lit studio: proportions, head/torso join
//   "environment" — the Long Workshop with no characters
//   "composite"   — Odo inside the hall with final lighting + grade
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { z } from "zod";
import { Post } from "../lib/Post";
import { InkCtx } from "../inventor/Workshop";
import { LongHall, bayZ, PENDANT_X } from "../hall/LongHall";
import { CardSprite } from "../char/CardSprite";
import { drawOdo3, defaultPose, W3, H3, SOLE3, CARD_H3, Odo3Pose } from "../char/odo3";
import { V3 } from "../lib/math";

export const previewSchema = z.object({ mode: z.enum(["character", "environment", "composite"]) });
type Props = z.infer<typeof previewSchema>;

const Rig: React.FC<{ pos: V3; look: V3; fov: number; fog: [string, number, number]; bg: string }> = ({ pos, look, fov, fog, bg }) => {
  const { camera, scene, gl } = useThree();
  const env = useMemo(() => { const pm = new THREE.PMREMGenerator(gl); const t = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return t; }, [gl]);
  useLayoutEffect(() => {
    scene.environment = env; scene.environmentIntensity = 0.14;
    scene.background = new THREE.Color(bg); scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
    const c = camera as THREE.PerspectiveCamera;
    c.position.set(...pos); c.lookAt(...look); c.fov = fov; c.near = 0.05; c.far = 60; c.updateProjectionMatrix();
  });
  return null;
};
const RenderAfterMount: React.FC<{ f: number }> = ({ f }) => {
  const advance = useThree((s) => s.advance);
  useEffect(() => { advance(performance.now()); }, [f, advance]);
  return null;
};

const Odo: React.FC<{ pose: Partial<Odo3Pose>; pos: V3; cam: V3; hi: boolean }> = ({ pose, pos, cam, hi }) => (
  <CardSprite W={W3} H={H3} sole={SOLE3} cardH={CARD_H3} pos={pos} camPos={cam} texScale={hi ? 2 : 1.2}
    fill={0.34} albedo={0.72} fillColor="#ffe8cc" draw={(g) => drawOdo3(g, { ...defaultPose(), ...pose })} />
);

const Studio: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[14, 14]} />
      <MeshReflectorMaterial color="#2a2338" roughness={0.5} metalness={0.1} mirror={0.4} blur={[200, 80]} resolution={512} mixBlur={1} mixStrength={1.2} />
    </mesh>

  </group>
);

export const Previews: React.FC<Props> = ({ mode }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const hi = height >= 1500;
  const k = height / 1920;
  const studio = mode === "character";
  const cam: V3 = studio ? [0.12, 0.82, 3.5] : [0.4, 1.3, 1.2];
  const look: V3 = studio ? [0.12, 0.74, 0] : [-0.05, 1.18, -12];
  const odoPos: V3 = [0.12, 0, bayZ(1) + 0.55];
  const focus = studio ? 3.5 : Math.hypot(odoPos[0] - cam[0], 1.0 - cam[1], odoPos[2] - cam[2]);
  const keyTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, 0, 0); return o; }, []);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0a14" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }}
        gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }}
        camera={{ fov: 50, position: cam, near: 0.05, far: 60 }}>
        <Rig pos={cam} look={look} fov={studio ? 34 : 50} fog={studio ? ["#1e1a36", 3.6, 8.5] : ["#231b3d", 9, 34]} bg={studio ? "#1e1a36" : "#0d0b18"} />
        <InkCtx.Provider value={2.8 * k}>
          {/* cool blue/violet ambient everywhere; warm only where a practical motivates it */}
          <hemisphereLight args={["#5c66c4", "#241a30", studio ? 0.75 : 0.95]} />
          {studio ? (
            <>
              <Studio />
              <primitive object={keyTarget} />
              <spotLight position={[0.8, 3.8, 3.2]} target={keyTarget} color="#ffd9b0" intensity={34} angle={0.55} penumbra={0.7} distance={10} decay={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
              <directionalLight position={[-3, 2.2, -2.5]} color="#7d8cff" intensity={1.6} />
              <pointLight position={[2.2, 1.2, -1.2]} color="#b07dff" intensity={2.5} distance={6} />
              <Odo pose={{ view: "side", walk: 1, distance: 0.66 * 0.08, lookX: 0.3 }} pos={[0.62, 0, -1.4]} cam={cam} hi={hi} />
              <Odo pose={{ view: "front", mouth: "smile", brows: 0.3, breathe: 0.4 }} pos={[-0.08, 0, 0]} cam={cam} hi={hi} />
            </>
          ) : (
            <>
              <LongHall f={f} shadowRes={hi ? 4096 : 2048} keyBay={1} reflectRes={hi ? 1024 : 512} />
              {mode === "composite" && (
                // warm face key motivated by the pendant above him (cheated forward so the flat card catches it)
                <pointLight position={[odoPos[0] + 0.35, 2.3, odoPos[2] + 1.5]} color="#ffc48a" intensity={4.2} distance={4.5} decay={1.8} />
              )}
              {mode === "composite" && (
                <Odo pose={{ view: "side", walk: 1, distance: 0.66 * 0.06, lookUp: 0.15, mouth: "smile", brows: 0.2 }} pos={odoPos} cam={cam} hi={hi} />
              )}
            </>
          )}
        </InkCtx.Provider>
        <Post params={{ focusDist: focus, focusRange: studio ? 3 : 5, maxBlur: studio ? 0.25 : mode === "environment" ? 0.12 : 0.3, bloom: 0.75, threshold: 1.6, exposure: studio ? 1.0 : 1.05, vignette: 0.6, ss: 2, contrast: 1.16, saturation: 1.1, lift: 0.012, warmCool: 1 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
void PENDANT_X;
