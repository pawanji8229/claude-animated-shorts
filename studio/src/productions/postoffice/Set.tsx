// One camera's view of Hideaway Island for one moment of story (pure function of the props). The film stacks two Sets
// only during a planned opacity dissolve.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OFF, PROFILE } from "./dbg";
import { Post } from "../../lib/Post";
import { InkCtx } from "../../inventor/Workshop";
import { RenderAfterMount } from "../london-bridge/common";
import { mediumFog, SCATTER } from "./water";
import { Dome, Surface, SunShafts, MarineSnow, Bubbles, type Emitter } from "./env";
import { Ground } from "./terrain";
import { SUN_DIR } from "./geo";
import type { V3 } from "../../lib/math";

export type PCam = { pos: V3; look: V3; fov: number; focus: number; near?: number; roll?: number };
const Rig: React.FC<{ c: PCam; t: number; scatter: THREE.Color }> = ({ c, t, scatter }) => {
  const { camera, scene, gl } = useThree();
  const envTex = useMemo(() => { const pm = new THREE.PMREMGenerator(gl); const tx = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return tx; }, [gl]);
  useLayoutEffect(() => {
    scene.environment = envTex; scene.environmentIntensity = 0.55; scene.background = new THREE.Color(c.pos[1] < 0 ? "#0e4c5c" : "#b9d6ea");
    scene.fog = mediumFog(t, scatter);
    const cam = camera as THREE.PerspectiveCamera; cam.position.set(...c.pos); cam.up.set(Math.sin(c.roll ?? 0), Math.cos(c.roll ?? 0), 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.near = c.near ?? 0.05; cam.far = 20000; cam.updateProjectionMatrix();
  });
  return null;
};
const Sun: React.FC<{ at: V3; size: number; hi: boolean }> = ({ at, size, hi }) => {
  const light = useMemo(() => { const l = new THREE.DirectionalLight("#fff3df", 3.3); l.castShadow = !OFF("shadow"); return l; }, []);
  const D = 300; light.position.set(at[0] + SUN_DIR[0] * D, at[1] + SUN_DIR[1] * D, at[2] + SUN_DIR[2] * D); light.target.position.set(...at); light.target.updateMatrixWorld();
  const sc = light.shadow.camera as THREE.OrthographicCamera; sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 1; sc.far = D * 2; sc.updateProjectionMatrix();
  light.shadow.mapSize.set(hi ? 4096 : 2048, hi ? 4096 : 2048); light.shadow.bias = -0.0003; light.shadow.normalBias = 0.03 * Math.max(1, size / 15);
  return <><primitive object={light} /><primitive object={light.target} /></>;
};

const Tri: React.FC = () => { const { scene } = useThree(); useLayoutEffect(() => { const by: Record<string, number> = {}; let calls = 0; scene.traverseVisible((o) => { const m = o as THREE.Mesh; if (!m.geometry) return; const g = m.geometry; const n = (g.index ? g.index.count : (g.attributes.position?.count ?? 0)) / 3 * ((m as unknown as THREE.InstancedMesh).isInstancedMesh ? (m as unknown as THREE.InstancedMesh).count : 1); let top: THREE.Object3D = o; while (top.parent && top.parent !== scene) top = top.parent; const k = top.type + ":" + (top.children.length) ; by[k] = (by[k] ?? 0) + n; calls++; }); console.log("TRI calls=" + calls + " " + JSON.stringify(Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => k + "=" + Math.round(v / 1000) + "k"))); }); return null; };
export type SetProps = {
  c: PCam; t: number; shadow?: { at: V3; size: number };
  world?: (ctx: { hi: boolean; cam: V3; t: number }) => React.ReactNode;
  emitters?: Emitter[]; exposure?: number; dof?: number; rays?: number; scatter?: THREE.Color; snow?: boolean;
};
export const PoSet: React.FC<SetProps> = ({ c, t, shadow, world, emitters = [], exposure = 1.12, dof = 0.1, rays = 1, scatter = SCATTER, snow = true }) => {
  const { width, height } = useVideoConfig(); const hi = height >= 1500, k = height / 1920;
  const under = c.pos[1] < 0;
  const post = { focusDist: c.focus, focusRange: Math.max(1.2, c.focus * 0.55), maxBlur: dof, bloom: under ? 0.26 : 0.3, threshold: under ? 1.6 : 1.9, exposure: exposure, vignette: under ? 0.42 : 0.3,
    ss: OFF("ss") ? 1 : hi ? 1 : 2, contrast: under ? 1.05 : 1.08, saturation: under ? 1.1 : 1.08, lift: 0.012, warmCool: under ? 0.25 : 0.4, ao: OFF("ao") ? 0 : 0.6, aoRadius: 0.45 };
  const sh = shadow ?? { at: c.look, size: 14 };
  return (
    <AbsoluteFill style={{ backgroundColor: under ? "#0e4c5c" : "#b9d6ea" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.05, far: 20000 }}>
        <Rig c={c} t={t} scatter={scatter} />
        <InkCtx.Provider value={2.4 * k}>
          <hemisphereLight args={[under ? "#c4eef8" : "#dcecff", under ? "#4d7f8a" : "#b6a27e", under ? 1.3 : 1.15]} />
          <Sun at={sh.at} size={sh.size} hi={hi} />{PROFILE && <Tri />}
          <Dome cam={c.pos} scatter={scatter} />
          {!OFF("ground") && <Ground />}
          {!OFF("surface") && <Surface t={t} scatter={scatter} />}
          {world?.({ hi, cam: c.pos, t })}
          {rays > 0 && !OFF("rays") && <SunShafts cam={c.pos} t={t} intensity={rays} />}
          {snow && !OFF("snow") && <MarineSnow t={t} pxScale={k * 2} />}
          {emitters.length > 0 && <Bubbles em={emitters} t={t} />}
        </InkCtx.Provider>
        <Post params={post} />
        <RenderAfterMount f={Math.round(t * 30)} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
