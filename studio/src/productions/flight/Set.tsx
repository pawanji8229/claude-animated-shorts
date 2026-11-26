// flight set: the whole world seen by ONE camera for one moment of story. The film stacks two Sets only during a planned
// opacity dissolve (S04->S07 moments, the S13 montage, the loop). Everything is a pure function of the props.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Post } from "../../lib/Post";
import { InkCtx } from "../../inventor/Workshop";
import { RenderAfterMount, Toon } from "../london-bridge/common";
import { SkyEnv } from "../short3/SkyEnv";
import { V3 } from "../../lib/math";
import { Terrain, Sea } from "./terrain";
import { Sky, Airfield, Farms, Sheep, Birds } from "./world";
import { Islander, type IslanderState } from "./islander";
import type { Odo5Pose } from "../../char/odo5";

export type FCam = { pos: V3; look: V3; fov: number; focus: number; near?: number; far?: number };
export type PlaneT = { pos: V3; yaw: number; pitch: number; roll: number; s: IslanderState };
export type Placed = { pose: Odo5Pose; pos: V3; h: number; flip?: boolean; halo?: number; light?: number; dir?: V3 };
export const SUN_DIR: V3 = [-0.52, 0.6, 0.6];

/** world -> plane local (for cards that sit inside the cabin and must face the camera from the plane's frame) */
export const planeMatrix = (p: PlaneT) => new THREE.Matrix4().compose(new THREE.Vector3(...p.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(p.roll, p.yaw, p.pitch, "YZX")), new THREE.Vector3(1, 1, 1));
export const toLocal = (p: PlaneT, w: V3): V3 => { const v = new THREE.Vector3(...w).applyMatrix4(planeMatrix(p).invert()); return [v.x, v.y, v.z]; };
export const toWorld = (p: PlaneT, l: V3): V3 => { const v = new THREE.Vector3(...l).applyMatrix4(planeMatrix(p)); return [v.x, v.y, v.z]; };

const Rig: React.FC<{ c: FCam; fog: [string, number, number] }> = ({ c, fog }) => {
  const { camera, scene, gl } = useThree();
  const envTex = useMemo(() => { const pm = new THREE.PMREMGenerator(gl); const t = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return t; }, [gl]);
  useLayoutEffect(() => {
    scene.environment = envTex; scene.background = new THREE.Color("#bcd2e4"); scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
    const cam = camera as THREE.PerspectiveCamera; cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = c.near ?? 0.1; cam.far = c.far ?? 40000; cam.updateProjectionMatrix();
  });
  return null;
};
/** sun with a shadow box that follows the action */
const Sun: React.FC<{ at: V3; size: number; hi: boolean }> = ({ at, size, hi }) => {
  const light = useMemo(() => { const l = new THREE.DirectionalLight("#fff4e2", 3.1); l.castShadow = true; return l; }, []);
  const D = 400; light.position.set(at[0] + SUN_DIR[0] * D, at[1] + SUN_DIR[1] * D, at[2] + SUN_DIR[2] * D); light.target.position.set(...at); light.target.updateMatrixWorld();
  const sc = light.shadow.camera as THREE.OrthographicCamera; sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 1; sc.far = D * 2; sc.updateProjectionMatrix();
  light.shadow.mapSize.set(hi ? 4096 : 2048, hi ? 4096 : 2048); light.shadow.bias = -0.0002; light.shadow.normalBias = 0.02 * Math.max(1, size / 20);
  return <><primitive object={light} /><primitive object={light.target} /></>;
};

export type SetProps = {
  c: FCam; t: number; plane?: PlaneT; inPlane?: Placed[]; outside?: Placed[]; shadow?: { at: V3; size: number };
  local?: (cl: V3, hi: boolean) => React.ReactNode;   // extra plane-local props (lap belts, bag)
  world?: (hi: boolean) => React.ReactNode;           // extra world props
  dof?: number; exposure?: number; cabinLight?: number;
};
export const FlightSet: React.FC<SetProps> = ({ c, t, plane, inPlane = [], outside = [], shadow, local, world, dof = 0.08, exposure = 1.18, cabinLight = 0 }) => {
  const { width, height } = useVideoConfig(); const hi = height >= 1500, k = height / 1920;
  const alt = c.pos[1];
  const fog: [string, number, number] = [alt > 60 ? "#c7d4db" : "#cdd8dd", alt > 60 ? 2500 : 900, alt > 60 ? 30000 : 16000];
  const post = { focusDist: c.focus, focusRange: Math.max(4, c.focus * 0.6), maxBlur: dof, bloom: 0.32, threshold: 1.8, exposure, vignette: 0.3, ss: hi ? 1 : 2, contrast: 1.07, saturation: 1.06, lift: 0.01, warmCool: 0.45, ao: 0.55, aoRadius: 0.5 };
  const sh = shadow ?? { at: plane ? plane.pos : c.look, size: 22 };
  const cl = plane ? toLocal(plane, c.pos) : c.pos;
  const inside = plane ? Math.abs(cl[2]) < 0.62 && cl[0] > -2.6 && cl[0] < 3.4 && cl[1] > 0.6 && cl[1] < 2.0 : false;
  const nearPlane = plane ? Math.hypot(c.pos[0] - plane.pos[0], c.pos[1] - plane.pos[1], c.pos[2] - plane.pos[2]) < 45 : false;
  return (
    <AbsoluteFill style={{ backgroundColor: "#bcd2e4" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.05, far: 40000 }}>
        <Rig c={c} fog={fog} />
        <SkyEnv intensity={0.6} />
        <InkCtx.Provider value={2.4 * k}>
          <hemisphereLight args={["#dfeaf6", "#8e9a8c", 1.55]} />
          <Sun at={sh.at} size={sh.size} hi={hi} />
          <Sky t={t} />
          <Terrain />
          <Sea t={t} />
          <Airfield which="wry" t={t} />
          <Airfield which="ppw" t={t} />
          <Farms near={c.look} />
          <Sheep t={t} near={c.look} />
          <Birds t={t} />
          {outside.map((p, i) => { const fw = [c.look[0] - c.pos[0], c.look[2] - c.pos[2]], flip = p.flip ?? (p.dir ? p.dir[0] * -fw[1] + p.dir[2] * fw[0] < 0 : false);
            return <Toon key={`o${i}`} pose={p.pose} pos={p.pos} cam={c.pos} h={p.h} hi={hi} halo={p.halo ?? 0.1} light={p.light ?? 0} flip={flip} />; })}
          {world?.(hi)}
          {plane && <group position={plane.pos} rotation={new THREE.Euler(plane.roll, plane.yaw, plane.pitch, "YZX")}>
            <Islander s={{ ...plane.s, cabin: inside || nearPlane }} />
            {(inside || nearPlane) && inPlane.map((p, i) => <Toon key={`i${i}`} pose={p.pose} pos={p.pos} cam={cl} h={p.h} hi={hi} halo={p.halo ?? 0.08} light={p.light ?? 0} flip={p.flip} />)}
            {(inside || nearPlane) && local?.(cl, hi)}
            {cabinLight > 0 && <pointLight position={[1.9, 1.45, 0]} intensity={cabinLight} distance={3.5} decay={1.6} color="#ffe6c8" />}
          </group>}
        </InkCtx.Provider>
        <Post params={post} />
        <RenderAfterMount f={Math.round(t * 30)} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
