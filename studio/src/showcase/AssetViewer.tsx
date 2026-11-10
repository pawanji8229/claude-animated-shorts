// Library QA: renders one library model, auto-framed from its bounds, under a neutral HDRI with a ground shadow and a
// 1.7 m reference card (an earless TwistFrame character) for scale. pipeline/assets/contact_sheet.mjs renders every
// model this way into assets/contact_sheet.png so silhouettes, proportions, materials and pivots can be inspected.
import React, { useLayoutEffect } from "react";
import * as THREE from "three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Post } from "../lib/Post";
import { Toon } from "../productions/london-bridge/common";
import { COSTUME, pose5 } from "../char/odo5";
import { Ground, HdriEnvironment, Model } from "../lib/library/components";
import { MANIFEST, type AssetId } from "../lib/library/manifest";
type V3 = [number, number, number];
const Cam: React.FC<{ pos: V3; look: V3; fov: number }> = ({ pos, look, fov }) => { const { camera } = useThree();
  useLayoutEffect(() => { const c = camera as THREE.PerspectiveCamera; c.position.set(...pos); c.lookAt(...look); c.fov = fov; c.near = 0.02; c.far = 800; c.updateProjectionMatrix(); }); return null; };
export const AssetViewer: React.FC<{ id: string; lod?: number }> = ({ id }) => {
  const { width, height } = useVideoConfig(); const m = MANIFEST[id as AssetId];
  const b = m?.bounds ?? { min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] };
  const c: V3 = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
  const s = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2], 1.8);
  const pos: V3 = [c[0] + s * 0.75, c[1] + s * 0.35, c[2] + s * 1.15], ref: V3 = [b.max[0] + 0.6, 0, b.max[2] * 0.3];
  return (
    <AbsoluteFill style={{ background: "#8a8f94" }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: 40, position: pos }}>
        <Cam pos={pos} look={c} fov={40} />
        <color attach="background" args={["#9aa3ab"]} />
        <HdriEnvironment id="kloofendal_48d_partly_cloudy_puresky" intensity={1} />
        <directionalLight position={[s, s * 2, s]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-s} shadow-camera-right={s} shadow-camera-top={s} shadow-camera-bottom={-s} />
        <Ground tex="brushed_concrete" size={[s * 6, s * 6]} tile={2} pos={[c[0], b.min[1] - 0.001, c[2]]} />
        <Model id={id as AssetId} />
        <Toon pose={pose5({ costume: COSTUME.hal, mouth: "smile" })} pos={ref} cam={pos} h={1.7} hi={height > 1000} light={0} halo={0} />
        <Post params={{ focusDist: 10, focusRange: 100, maxBlur: 0, bloom: 0.2, threshold: 2, exposure: 1, vignette: 0.2, ss: 1 }} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
