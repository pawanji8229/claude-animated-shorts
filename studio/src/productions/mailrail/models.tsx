// Mail Rail scene props from the TwistFrame Model Vault (Poly Haven CC0, prepared into public/mailrail/m: base-centre origin,
// capped textures, decoder-free GLB). All are decoded BEFORE the first frame (useMRReady awaits preloadModels) and then
// read synchronously, so no frame is captured before a model exists. Repeated props are GPU-instanced.
import React, { useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import type { V3 } from "../../lib/math";
export const MODEL_NAMES = ["lamp_hang", "lamp_cage", "lamp_wall", "sacktruck", "cart", "crate", "streetlamp"];
const scenes = new Map<string, THREE.Group>(); let pre: Promise<void> | null = null;
export const preloadModels = () => (pre ??= Promise.all(MODEL_NAMES.map(async (n) => { const g = await new GLTFLoader().loadAsync(staticFile(`mailrail/m/${n}.glb`)); scenes.set(n, g.scene); })).then(() => undefined));
const sceneOf = (n: string) => { const s = scenes.get(n); if (!s) throw new Error(`model ${n} not preloaded`); return s; };
export type Place = { p: V3; ry?: number; s?: number };
export const Instances: React.FC<{ name: string; items: Place[]; shadows?: boolean }> = ({ name, items, shadows = true }) => {
  const src = sceneOf(name);
  const meshes = useMemo(() => { src.updateMatrixWorld(true); const out: THREE.InstancedMesh[] = [], M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
    src.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || !items.length) return; const im = new THREE.InstancedMesh(m.geometry, m.material, items.length); im.castShadow = shadows; im.receiveShadow = true;
      items.forEach((it, i) => { const s = it.s ?? 1; im.setMatrixAt(i, M.compose(new THREE.Vector3(...it.p), Q.setFromAxisAngle(Y, it.ry ?? 0), new THREE.Vector3(s, s, s)).multiply(m.matrixWorld)); });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); out.push(im); }); return out; }, [src, items, shadows]);
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
};
export const Model: React.FC<{ name: string; p: V3; ry?: number; s?: number }> = ({ name, p, ry = 0, s = 1 }) => {
  const src = sceneOf(name); const obj = useMemo(() => { const c = src.clone(true); c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return c; }, [src]);
  return <primitive object={obj} position={p} rotation={[0, ry, 0]} scale={s} />;
};
