// "London Bridge in the Desert" — the full film as ONE composition (1771 frames = the 59.01 s narration).
// Batches render frame ranges of this same composition, so characters / lights / camera stay identical.
// Currently implemented: Act 1 (frames 0-309, desert hook). No on-screen text.
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Post } from "../lib/Post";
import { InkCtx } from "../inventor/Workshop";
import { CardSprite } from "../char/CardSprite";
import { drawOdo5, headCenterPx5, W5, H5, SOLE5, CARD_H5, PX5 } from "../char/odo5";
import { glow } from "../hall/hallTextures";
import { DesertWorld } from "./DesertWorld";
import { camHook, halAt, halPose, pebbleAt, tumbleweeds, HOOK_END, carAt, CAR_PATH, halVisible } from "./desertHook";
import { V3 } from "../lib/math";

type Cam = { pos: V3; look: V3; fov: number; focus: number };
const Rig: React.FC<{ c: Cam }> = ({ c }) => {
  const { camera, scene, gl } = useThree();
  const env = useMemo(() => { const pm = new THREE.PMREMGenerator(gl); const t = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return t; }, [gl]);
  useLayoutEffect(() => {
    scene.environment = env; scene.environmentIntensity = 0.25;
    scene.background = new THREE.Color("#e9b88f"); scene.fog = new THREE.Fog("#efbb8c", 45, 300);
    const cam = camera as THREE.PerspectiveCamera; cam.layers.enable(1);
    cam.position.set(...c.pos); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = 0.1; cam.far = 900; cam.updateProjectionMatrix();
  });
  return null;
};
const RenderAfterMount: React.FC<{ f: number }> = ({ f }) => {
  const advance = useThree((s) => s.advance);
  useEffect(() => { advance(performance.now()); }, [f, advance]);
  return null;
};

/** `withAudio`: plays the synced mix inside Remotion (Studio preview). Batch renders keep it off and the master
 *  audio is muxed once after concatenation, so batch joins can never introduce audio gaps. */
export const LondonBridgeFilm: React.FC<{ envOnly?: boolean; frameOverride?: number; camOverride?: Cam; withAudio?: boolean; maxFrame?: number }> = ({ envOnly, frameOverride, camOverride, withAudio, maxFrame }) => {
  const f0 = useCurrentFrame(), f = Math.min(frameOverride ?? f0, maxFrame ?? HOOK_END);
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920;
  const c: Cam = camOverride ?? camHook(f);
  const h = halAt(f), pose = halPose(f);
  const yaw = Math.atan2(c.pos[0] - h[0], c.pos[2] - h[2]);
  const hc = headCenterPx5(pose);
  const head: V3 = [h[0] + Math.cos(yaw) * (hc[0] - W5 / 2) * PX5 - Math.sin(yaw) * 0.05, h[1] + (SOLE5 - hc[1]) * PX5, h[2] - Math.sin(yaw) * (hc[0] - W5 / 2) * PX5 - Math.cos(yaw) * 0.05];
  const halo = useMemo(() => glow("rgba(255,236,205,0.9)", "rgba(255,210,160,0)"), []);
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a120c" }}>
      {withAudio ? <Audio src={staticFile("audio/london_bridge_act1_mix.wav")} /> : null}
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }}
        gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.1, far: 900 }}>
        <Rig c={c} />
        <InkCtx.Provider value={2.8 * k}>
          <DesertWorld f={f} shadowRes={hi ? 4096 : 2048} tumble={tumbleweeds(f)} pebble={pebbleAt(f)} car={carAt(f)} carPath={CAR_PATH} />
          {!envOnly && halVisible(f) && (
            <>
              {/* warm face key (low sun bounce off the sand, cheated in front of the card) */}
              <pointLight position={[h[0] + 0.8, h[1] + 1.9, h[2] + 2.2]} color="#ffd2a0" intensity={4.5} distance={6} decay={1.7} />
              <CardSprite W={W5} H={H5} sole={SOLE5} cardH={CARD_H5} pos={h} camPos={c.pos} texScale={hi ? 2 : 1.3}
                albedo={0.82} fill={0.82} fillColor="#fff2e2" contact={0.9}
                draw={(g) => drawOdo5(g, pose)} drawMask={(g) => drawOdo5(g, pose, true)} />
              <sprite position={head} scale={[0.95, 0.95, 1]}><spriteMaterial map={halo} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
            </>
          )}
        </InkCtx.Provider>
        <Post params={{ focusDist: c.focus, focusRange: 3.5, maxBlur: 0.22, bloom: 0.7, threshold: 1.7, exposure: 1.0, vignette: 0.55, ss: hi ? 1 : 2, contrast: 1.15, saturation: 1.08, lift: 0.012, warmCool: 0.8, ao: 0.6, aoRadius: 0.6 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
