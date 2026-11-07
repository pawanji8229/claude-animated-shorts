// Composition: 5 s establishing shot — an original inventor walks into his warmly lit workshop at night.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { z } from "zod";
import { Workshop, InkCtx } from "./Workshop";
import { Inventor } from "./Inventor";
import { DOOR, DOOR_OPEN, ROOM, cameraAt, inventorAt } from "./timeline";
import { Caption } from "../lib/Caption";

export const inventorSchema = z.object({
  captions: z.boolean(),
  caption: z.string(),
});
export type InventorProps = z.infer<typeof inventorSchema>;

const Rig: React.FC<{ f: number }> = ({ f }) => {
  const { camera, scene, gl } = useThree();
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return t;
  }, [gl]);
  useLayoutEffect(() => {
    scene.environment = env;
    scene.environmentIntensity = 0.22; // subtle reflections for brass/steel only; keep the warm key dominant
    scene.background = new THREE.Color("#120b08");
    scene.fog = new THREE.Fog("#1a0f0a", 7, 16);
  }, [scene, env]);
  useLayoutEffect(() => {
    const c = cameraAt(f);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...c.pos);
    cam.up.set(Math.sin(c.roll), Math.cos(c.roll), 0);
    cam.lookAt(...c.look);
    cam.fov = c.fov;
    cam.near = 0.05; cam.far = 40;
    cam.updateProjectionMatrix();
  }, [f, camera]);
  return null;
};

export const InventorWalkIn: React.FC<InventorProps> = ({ captions, caption }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const st = inventorAt(f);
  const cam = cameraAt(f);
  const k = height / 1920; // every pixel-sized parameter scales with output height
  return (
    <AbsoluteFill style={{ backgroundColor: "#120b08" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.05, preserveDrawingBuffer: true }}
        camera={{ fov: cam.fov, position: cam.pos, near: 0.05, far: 40 }}
      >
        <Rig f={f} />
        <InkCtx.Provider value={3.2 * k}>
          {/* warm low ambient + cool moonlight through the door/window (motivated two-tone lighting) */}
          <hemisphereLight args={["#5a4636", "#1a120c", 0.55]} />
          <directionalLight position={[DOOR.x - 1.5, 2.6, ROOM.zBack - 3]} color="#6f8fd6" intensity={0.55} />
          <spotLight position={[DOOR.x, 1.9, ROOM.zBack - 1.2]} color="#7b9be0" intensity={6 * Math.min(1, f / 18 + 0.15)} angle={0.7} penumbra={0.8} distance={7} decay={1.6} />
          <Workshop f={f} doorOpen={DOOR_OPEN(f)} shadowRes={height >= 1500 ? 2048 : 1024} />
          <Inventor st={st} camPos={cam.pos} texScale={height >= 1500 ? 1.4 : 0.8} />
        </InkCtx.Provider>
      </ThreeCanvas>
      {/* grade: warm vignette, darker corners (motivated by the single practical) */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 60% at 55% 45%, rgba(0,0,0,0) 55%, rgba(14,6,2,0.55) 100%)", pointerEvents: "none" }} />
      {captions ? <Caption text={caption} from={18} to={140} /> : null}
    </AbsoluteFill>
  );
};
