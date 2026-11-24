// Robot Hotel assets: CC0 Poly Haven PBR textures (public/hotel/t) + CC0 Poly Haven furniture models (public/hotel/m,
// prepared by tools/tf-ext/assets/prepare-set.mjs; provenance in assets.json / textures.json). Everything is decoded
// BEFORE the first frame (delayRender), so no frame renders with a missing texture or model and every parallel render
// chunk sees identical materials. Kit geometry carries metre UVs, so `rep` = metres per texture tile.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { continueRender, delayRender, staticFile } from "remotion";
import type { V3 } from "../../lib/math";

const SETS: Record<string, string[]> = {
  marble: ["arm", "color", "normal"], terrazzo: ["arm", "color", "normal"], hinoki: ["arm", "color", "normal"], cedar: ["arm", "color", "normal"],
  parquet: ["arm", "color", "normal"], plaster: ["color", "normal", "rough"], jacquard: ["arm", "color", "normal"], pavers: ["color", "normal", "rough"],
  facade: ["arm", "color", "normal"], leather: ["color", "normal", "rough"], velvet: ["arm", "color", "normal"],
};
export const MODELS = ["sofa", "sofa1", "sofa3", "armchair", "lounge", "ottoman", "ctable", "rtable", "side", "sidetall", "plant1", "plant2", "plant4", "pachira",
  "clamp", "vase", "pillows", "clock", "night", "cabinet", "desklamp", "frame", "barchair", "console", "wallframe"] as const;
export type ModelName = (typeof MODELS)[number];
const texCache = new Map<string, THREE.Texture>(), scenes = new Map<string, THREE.Group>();
let loading: Promise<void> | null = null;
const loadAll = () => (loading ??= (async () => {
  const L = new THREE.TextureLoader(), G = new GLTFLoader();
  await Promise.all([
    ...Object.entries(SETS).flatMap(([k, slots]) => slots.map(async (s) => { const t = await L.loadAsync(staticFile(`hotel/t/${k}_${s}.jpg`));
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = s === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace; texCache.set(`${k}_${s}`, t); })),
    ...MODELS.map(async (n) => { const g = await G.loadAsync(staticFile(`hotel/m/${n}.glb`)); g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); scenes.set(n, g.scene); }),
  ]); })());
/** true once every texture and model is decoded (the render is held until then) */
export const useHotelReady = () => { const [ok, set] = useState(false);
  useEffect(() => { const h = delayRender("robot hotel textures + models"); loadAll().then(() => { set(true); continueRender(h); }).catch((e) => { console.error(e); continueRender(h); throw e; }); }, []);
  return ok; };
const tex = (k: string, s: string, rep: number) => { const t = texCache.get(`${k}_${s}`); if (!t) return null; const c = t.clone(); c.repeat.set(1 / rep, 1 / rep); c.needsUpdate = true; return c; };
const matCache = new Map<string, THREE.MeshStandardMaterial>();
/** PBR material from a texture set; rep = metres per tile; tint multiplies the colour map (cached per parameter set) */
export function pm(set: string, rep: number, o: { tint?: string; rough?: number; metal?: number; normal?: number; side?: THREE.Side; env?: number; noColor?: boolean } = {}) {
  const key = JSON.stringify([set, rep, o]); const hit = matCache.get(key); if (hit) return hit;
  const slots = SETS[set]; if (!slots) throw new Error(`unknown PBR set ${set}`);
  const arm = slots.includes("arm") ? tex(set, "arm", rep) : null;
  const m = new THREE.MeshStandardMaterial({ map: o.noColor ? null : tex(set, "color", rep), normalMap: tex(set, "normal", rep), color: o.tint ?? "#ffffff",
    roughnessMap: arm ?? (slots.includes("rough") ? tex(set, "rough", rep) : null), roughness: o.rough ?? 1, aoMap: arm, aoMapIntensity: 0.8,
    metalness: o.metal ?? 0, side: o.side ?? THREE.FrontSide, envMapIntensity: o.env ?? 1 });
  const n = o.normal ?? 1; m.normalScale.set(n, n); matCache.set(key, m); return m;
}
const sceneOf = (n: ModelName) => { const s = scenes.get(n); if (!s) throw new Error(`model ${n} not loaded`); return s; };
export type Place = { p: V3; ry?: number; s?: number };
/** many copies of one model as InstancedMeshes (one draw call per sub-mesh) */
export const Instances: React.FC<{ name: ModelName; items: Place[] }> = ({ name, items }) => {
  const src = sceneOf(name);
  const meshes = useMemo(() => { src.updateMatrixWorld(true); const out: THREE.InstancedMesh[] = [], M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
    src.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || !items.length) return; const im = new THREE.InstancedMesh(m.geometry, m.material, items.length); im.castShadow = true; im.receiveShadow = true;
      items.forEach((it, i) => { const s = it.s ?? 1; im.setMatrixAt(i, M.compose(new THREE.Vector3(...it.p), Q.setFromAxisAngle(Y, it.ry ?? 0), new THREE.Vector3(s, s, s)).multiply(m.matrixWorld)); });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); out.push(im); }); return out; }, [src, items]);
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
};
export const Model: React.FC<{ name: ModelName; p: V3; ry?: number; s?: number }> = ({ name, p, ry = 0, s = 1 }) => {
  const src = sceneOf(name); const obj = useMemo(() => src.clone(true), [src]);
  return <primitive object={obj} position={p} rotation={[0, ry, 0]} scale={s} />;
};
