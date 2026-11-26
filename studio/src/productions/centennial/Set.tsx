// One camera's view of one moment of the Centennial Light story (pure function of its props). The film stacks two
// Sets only during a planned opacity dissolve. Lighting is a per-layer "mood": sky/hemisphere fill, a sun or moon
// through the windows (shadowed), room environment reflections, fog for depth, and the Post chain (SSAO, DOF,
// restrained bloom with a high threshold, warm/cool grade).
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Post } from "../../lib/Post";
import { InkCtx } from "../../inventor/Workshop";
import { RenderAfterMount } from "../london-bridge/common";
import type { V3 } from "../../lib/math";

export type PCam = { pos: V3; look: V3; fov: number; focus: number; near?: number; roll?: number; dof?: number };
export type Mood = {
  bg: string; sky: string; ground: string; hemi: number; env: number;
  sun: { dir: V3; color: string; i: number; at?: V3; size?: number }; fog?: { color: string; near: number; far: number };
  exposure: number; bloom?: number; threshold?: number; warmCool?: number; vignette?: number; contrast?: number; saturation?: number; ao?: number;
};
const Rig: React.FC<{ c: PCam; m: Mood }> = ({ c, m }) => {
  const { camera, scene, gl } = useThree();
  const envTex = useMemo(() => { const pm = new THREE.PMREMGenerator(gl); const tx = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return tx; }, [gl]);
  useLayoutEffect(() => {
    scene.environment = envTex; scene.environmentIntensity = m.env; scene.background = new THREE.Color(m.bg);
    scene.fog = m.fog ? new THREE.Fog(m.fog.color, m.fog.near, m.fog.far) : null;
    const cam = camera as THREE.PerspectiveCamera; cam.position.set(...c.pos); cam.up.set(Math.sin(c.roll ?? 0), Math.cos(c.roll ?? 0), 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.near = c.near ?? 0.02; cam.far = 3000; cam.updateProjectionMatrix();
  });
  return null;
};
const Sun: React.FC<{ s: Mood["sun"]; look: V3; hi: boolean }> = ({ s, look, hi }) => {
  const light = useMemo(() => { const l = new THREE.DirectionalLight("#ffffff", 1); l.castShadow = true; return l; }, []);
  const at = s.at ?? look, size = s.size ?? 12, D = 120, d = new THREE.Vector3(...s.dir).normalize();
  light.color.set(s.color); light.intensity = s.i;
  light.position.set(at[0] + d.x * D, at[1] + d.y * D, at[2] + d.z * D); light.target.position.set(...at); light.target.updateMatrixWorld();
  const sc = light.shadow.camera as THREE.OrthographicCamera; sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 1; sc.far = D * 2; sc.updateProjectionMatrix();
  light.shadow.mapSize.set(hi ? 4096 : 2048, hi ? 4096 : 2048); light.shadow.bias = -0.0002; light.shadow.normalBias = 0.02 * Math.max(1, size / 12);
  return <><primitive object={light} /><primitive object={light.target} /></>;
};
export type SetProps = { c: PCam; m: Mood; f: number; world: (ctx: { hi: boolean; cam: V3 }) => React.ReactNode };
export const CentSet: React.FC<SetProps> = ({ c, m, f, world }) => {
  const { width, height } = useVideoConfig(); const hi = height >= 1500, k = height / 1920;
  const post = { focusDist: c.focus, focusRange: Math.max(0.12, c.focus * 0.5), maxBlur: c.dof ?? 0.12, bloom: m.bloom ?? 0.32, threshold: m.threshold ?? 1.6, exposure: m.exposure, vignette: m.vignette ?? 0.32,
    ss: hi ? 1 : 2, contrast: m.contrast ?? 1.07, saturation: m.saturation ?? 1.06, lift: 0.01, warmCool: m.warmCool ?? 0.45, ao: m.ao ?? 0.65, aoRadius: 0.4 };
  return (
    <AbsoluteFill style={{ backgroundColor: m.bg }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.02, far: 3000 }}>
        <Rig c={c} m={m} />
        <InkCtx.Provider value={2.4 * k}>
          <hemisphereLight args={[m.sky, m.ground, m.hemi]} />
          <Sun s={m.sun} look={c.look} hi={hi} />
          {world({ hi, cam: c.pos })}
        </InkCtx.Provider>
        <Post params={post} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
