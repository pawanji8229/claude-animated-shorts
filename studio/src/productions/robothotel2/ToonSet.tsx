// "Cartoon 3D" frame (the reference look): one camera's view rendered with saturated colour, a strong sun key with crisp
// shadows, a coloured rim/back light, warm practicals, bloom on lamps, shallow depth of field, depth-edge ink lines on
// every silhouette (PostToon) and optional screen-space motion blur for whip pans. Pure function of its props.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PostToon } from "../../lib/PostToon";
import { InkCtx } from "../../inventor/Workshop";
import { RenderAfterMount } from "../london-bridge/common";
import type { V3 } from "../../lib/math";

export type TCam = { pos: V3; look: V3; fov: number; roll?: number; focus?: number; dof?: number; mblur?: [number, number] };
export type Look = {
  bg: string; sky: string; ground: string; hemi: number; env: number;
  sun: { dir: V3; color: string; i: number; at: V3; size: number };
  rim?: { dir: V3; color: string; i: number };
  fog?: { color: string; near: number; far: number };
  exposure: number; bloom: number; threshold: number; saturation: number; contrast: number; warmCool: number; vignette: number; ink: number;
};
const Rig: React.FC<{ c: TCam; m: Look }> = ({ c, m }) => {
  const { camera, scene, gl } = useThree();
  const envTex = useMemo(() => { const pm = new THREE.PMREMGenerator(gl); const tx = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return tx; }, [gl]);
  useLayoutEffect(() => {
    scene.environment = envTex; scene.environmentIntensity = m.env; scene.background = new THREE.Color(m.bg);
    scene.fog = m.fog ? new THREE.Fog(m.fog.color, m.fog.near, m.fog.far) : null;
    const cam = camera as THREE.PerspectiveCamera; cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); if (c.roll) cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.03; cam.far = 600; cam.updateProjectionMatrix();
  });
  return null;
};
const Sun: React.FC<{ s: Look["sun"]; hi: boolean }> = ({ s, hi }) => {
  const light = useMemo(() => { const l = new THREE.DirectionalLight("#ffffff", 1); l.castShadow = true; return l; }, []);
  const d = new THREE.Vector3(...s.dir).normalize(), D = 80;
  light.color.set(s.color); light.intensity = s.i;
  light.position.set(s.at[0] + d.x * D, s.at[1] + d.y * D, s.at[2] + d.z * D); light.target.position.set(...s.at); light.target.updateMatrixWorld();
  const sc = light.shadow.camera as THREE.OrthographicCamera; sc.left = -s.size; sc.right = s.size; sc.top = s.size; sc.bottom = -s.size; sc.near = 1; sc.far = D * 2; sc.updateProjectionMatrix();
  light.shadow.mapSize.set(hi ? 4096 : 2048, hi ? 4096 : 2048); light.shadow.bias = -0.0003; light.shadow.normalBias = 0.02 * Math.max(1, s.size / 10); light.shadow.radius = 1.5;
  return <><primitive object={light} /><primitive object={light.target} /></>;
};
export const ToonSet: React.FC<{ c: TCam; m: Look; f: number; world: (ctx: { hi: boolean; cam: V3 }) => React.ReactNode }> = ({ c, m, f, world }) => {
  const { width, height } = useVideoConfig(); const hi = height >= 1500, k = height / 1920;
  const focus = c.focus ?? Math.hypot(c.pos[0] - c.look[0], c.pos[1] - c.look[1], c.pos[2] - c.look[2]);
  const post = { focusDist: focus, focusRange: Math.max(0.3, focus * 0.45), maxBlur: c.dof ?? 0.35, bloom: m.bloom, threshold: m.threshold, exposure: m.exposure, vignette: m.vignette,
    ss: hi ? 1 : 2, contrast: m.contrast, saturation: m.saturation, lift: 0.012, warmCool: m.warmCool, ao: 0.75, aoRadius: 0.35,
    ink: m.ink, inkWidth: hi ? 1.5 : 0.9, inkThreshold: 0.016, mblur: c.mblur };
  return (
    <AbsoluteFill style={{ backgroundColor: m.bg }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.03, far: 600 }}>
        <Rig c={c} m={m} />
        <InkCtx.Provider value={2.6 * k}>
          <hemisphereLight args={[m.sky, m.ground, m.hemi]} />
          <Sun s={m.sun} hi={hi} />
          {m.rim && <directionalLight position={[m.rim.dir[0] * 50, m.rim.dir[1] * 50, m.rim.dir[2] * 50]} color={m.rim.color} intensity={m.rim.i} />}
          {world({ hi, cam: c.pos })}
        </InkCtx.Provider>
        <PostToon params={post} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
