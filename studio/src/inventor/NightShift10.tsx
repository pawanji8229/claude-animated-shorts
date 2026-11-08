// Composition: "The Night Shift" — 10 s quality test (see timeline10.ts for the beat sheet).
// Render stack: shadowed key (pendant spot) + practical fills -> inked set + lit character card ->
// N8AO contact occlusion -> depth of field on the subject -> HDR bloom -> NEUTRAL tone map -> vignette.
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Post } from "../lib/Post";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { z } from "zod";
import { Workshop, InkCtx } from "./Workshop";
import { Inventor } from "./Inventor";
import { Extras } from "./Extras";
import { DOOR, ROOM } from "./timeline";
import { DOME_POS, IGNITE, camera10, doorOpen10, gearRot10, glow10, igniteAt, inventor10, lampK10, lever10 } from "./timeline10";
import { Caption } from "../lib/Caption";

export const nightShiftSchema = z.object({ captions: z.boolean(), post: z.boolean() });
export type NightShiftProps = z.infer<typeof nightShiftSchema>;

const Rig: React.FC<{ f: number }> = ({ f }) => {
  const { camera, scene, gl } = useThree();
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose(); return t;
  }, [gl]);
  useLayoutEffect(() => {
    scene.environment = env; scene.environmentIntensity = 0.2;
    scene.background = new THREE.Color("#120b08");
    scene.fog = new THREE.Fog("#1a0f0a", 7, 16);
  }, [scene, env]);
  useLayoutEffect(() => {
    const c = camera10(f);
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(...c.pos);
    cam.up.set(Math.sin(c.roll), Math.cos(c.roll), 0);
    cam.lookAt(...c.look);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 40;
    cam.updateProjectionMatrix();
  }, [f, camera]);
  return null;
};

/** Must be the LAST child of <ThreeCanvas>. @remotion/three advances R3F once per frame, but that can run before
 *  the <Post> pipeline (or any priority useFrame) has mounted (effects run child-first), leaving a black canvas in the screenshot.
 *  Advancing again after everything mounted guarantees the composed frame is in the drawing buffer. */
const RenderAfterMount: React.FC<{ f: number }> = ({ f }) => {
  const advance = useThree((s) => s.advance);
  useEffect(() => { advance(performance.now()); }, [f, advance]);
  return null;
};

const CAPTIONS: [number, number, string][] = [
  [8, 96, "Midnight. Everyone else is asleep."],
  [104, 200, "Odo has one more idea to try."],
  [206, 300, "Tonight, it finally works."],
];

export const NightShift10: React.FC<NightShiftProps> = ({ captions, post }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const st = inventor10(f);
  const cam = camera10(f);
  const k = height / 1920;
  const ign = igniteAt(f);
  const focusDist = Math.hypot(cam.focus[0] - cam.pos[0], cam.focus[1] - cam.pos[1], cam.focus[2] - cam.pos[2]);
  const hi = height >= 1500;
  return (
    <AbsoluteFill style={{ backgroundColor: "#120b08" }}>
      <ThreeCanvas
        width={width}
        height={height}
        shadows={{ type: THREE.PCFSoftShadowMap }}
        gl={{ antialias: !post, toneMapping: post ? THREE.NoToneMapping : THREE.NeutralToneMapping, toneMappingExposure: 1.05, preserveDrawingBuffer: true }}
        camera={{ fov: cam.fov, position: cam.pos, near: 0.05, far: 40 }}
      >
        <Rig f={f} />
        <InkCtx.Provider value={3.2 * k}>
          <hemisphereLight args={["#5a4636", "#1a120c", 0.5]} />
          {/* moonlight: cool key through door + window, falls off into the room */}
          <directionalLight position={[DOOR.x - 1.5, 2.6, ROOM.zBack - 3]} color="#6f8fd6" intensity={0.5} />
          <spotLight position={[DOOR.x, 1.9, ROOM.zBack - 1.2]} color="#7b9be0" intensity={6.5 * Math.min(1, f / 18 + 0.15)} angle={0.7} penumbra={0.8} distance={7} decay={1.6} />
          {/* warm bounce off the planks + cool rim from the window side so the card separates from the wall */}
          <pointLight position={[0.6, 0.25, -1.6]} color="#ff9a55" intensity={0.9} distance={4} decay={2} />
          <pointLight position={[-1.2, 2.2, -2.9]} color="#8fb0ff" intensity={0.8} distance={5} decay={2} />
          {/* ignition flash: cool-white key from the dome that rakes the inventor's face */}
          <pointLight position={[DOME_POS[0] - 0.1, DOME_POS[1] + 0.15, DOME_POS[2] + 0.6]} color="#fff1d6" intensity={3.2 * ign * (f < IGNITE + 6 ? 1.5 : 1)} distance={4.5} decay={2} />
          <Workshop f={f} doorOpen={doorOpen10(f)} shadowRes={hi ? 4096 : 2048} fx={{ glow: glow10(f), gearRot: gearRot10(f), lever: lever10(f), lampK: lampK10(f), extras: true }}>
            <Extras f={f} lever={lever10(f)} />
          </Workshop>
          <Inventor st={st} camPos={cam.pos} texScale={hi ? 1.6 : 1.2} />
        </InkCtx.Provider>
        {post ? (
          <Post params={{
            focusDist, focusRange: cam.shot === 0 ? 3.0 : 1.4, maxBlur: cam.shot === 3 ? 0.95 : cam.shot === 0 ? 0.35 : 0.7,
            bloom: 0.9 + 0.4 * ign, threshold: 1.45, exposure: 1.0, vignette: 0.55, ss: 2,
          }} />
        ) : <></>}
        <RenderAfterMount f={f} />
      </ThreeCanvas>
      {/* warm grade wash + white flash on ignition */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 65% at 55% 45%, rgba(0,0,0,0) 60%, rgba(14,6,2,0.35) 100%)", pointerEvents: "none" }} />
      <AbsoluteFill style={{ backgroundColor: "#fff6e0", opacity: Math.max(0, 0.3 * (1 - Math.abs(f - IGNITE - 2) / 3)), pointerEvents: "none" }} />
      {captions ? CAPTIONS.map(([a, b, t]) => <Caption key={a} text={t} from={a} to={b} />) : null}
    </AbsoluteFill>
  );
};
