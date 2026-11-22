// Optional enhancement (OFF unless a scene imports it): use a prepared library model (tools/tf-ext/assets/prepare.mjs)
// inside a TwistFrame scene. Remotion-safe and deterministic:
//   * loading holds the render with delayRender until the GLB is decoded (no frame ever renders without it)
//   * one decode per file, shared by every canvas/frame (module cache); each use clones the scene graph
//   * LOD choice is a pure function of the camera position the scene already passes in (no wall clock, no screen-space
//     heuristics), so every parallel cloud chunk picks the same level for the same frame
//   * `LibraryInstances` draws many copies of a model as InstancedMeshes (one draw call per sub-mesh)
// Files are served from studio/public via staticFile(), e.g. public/library/<id>/<id>.glb (copied there by prepare.mjs --out).
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { continueRender, delayRender, staticFile } from "remotion";
import type { V3 } from "../math";

const cache = new Map<string, Promise<THREE.Group>>();
const load = (url: string) => { let p = cache.get(url); if (!p) { p = new GLTFLoader().loadAsync(url).then((g) => { g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return g.scene; }); cache.set(url, p); } return p; };
/** decoded scene for a public/ path, or null while loading (the render is held meanwhile) */
export const useLibraryScene = (file: string): THREE.Group | null => {
  const [scene, set] = useState<THREE.Group | null>(null);
  useEffect(() => { const h = delayRender(`library model ${file}`); let live = true;
    load(staticFile(file)).then((s) => { if (live) set(s); continueRender(h); }).catch((e) => { console.error(e); continueRender(h); throw e; });
    return () => { live = false; }; }, [file]);
  return scene;
};
export type Lod = { file: string; from: number };   // use `file` when the camera is at least `from` metres away
/** pick the LOD for a camera distance: the last level whose `from` is <= distance (levels sorted by `from`) */
export const pickLod = (base: string, lods: Lod[], camPos: V3 | undefined, at: V3): string => {
  if (!camPos || !lods.length) return base; const d = Math.hypot(camPos[0] - at[0], camPos[1] - at[1], camPos[2] - at[2]);
  let f = base; for (const l of [...lods].sort((a, b) => a.from - b.from)) if (d >= l.from) f = l.file; return f;
};
export const LibraryModel: React.FC<{ file: string; lods?: Lod[]; camPos?: V3; position?: V3; rotationY?: number; scale?: number }> = ({ file, lods = [], camPos, position = [0, 0, 0], rotationY = 0, scale = 1 }) => {
  const chosen = pickLod(file, lods, camPos, position), src = useLibraryScene(chosen);
  const obj = useMemo(() => src?.clone(true) ?? null, [src]);
  return obj ? <primitive object={obj} position={position} rotation={[0, rotationY, 0]} scale={scale} /> : null;
};
/** many copies of one model: transforms = [position, rotationY, scale] */
export const LibraryInstances: React.FC<{ file: string; transforms: [V3, number, number][] }> = ({ file, transforms }) => {
  const src = useLibraryScene(file);
  const meshes = useMemo(() => { if (!src) return []; src.updateMatrixWorld(true); const out: THREE.InstancedMesh[] = [], M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
    src.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const im = new THREE.InstancedMesh(m.geometry, m.material, transforms.length); im.castShadow = im.receiveShadow = true;
      transforms.forEach(([p, ry, s], i) => im.setMatrixAt(i, M.compose(new THREE.Vector3(...p), Q.setFromAxisAngle(Y, ry), new THREE.Vector3(s, s, s)).multiply(m.matrixWorld)));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); out.push(im); }); return out; }, [src, transforms]);
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
};
/** an HDRI from the library (public/ path) as an equirectangular environment texture, or null while loading
 *  (render held). Assign it as scene.environment (PMREM is applied by three automatically) for image-based lighting. */
const hdrCache = new Map<string, Promise<THREE.DataTexture>>();
export const useLibraryHdri = (file: string): THREE.DataTexture | null => {
  const [tex, set] = useState<THREE.DataTexture | null>(null);
  useEffect(() => { const h = delayRender(`library hdri ${file}`); let live = true, url = staticFile(file), p = hdrCache.get(url);
    if (!p) { p = new HDRLoader().loadAsync(url).then((t) => { t.mapping = THREE.EquirectangularReflectionMapping; return t; }); hdrCache.set(url, p); }
    p.then((t) => { if (live) set(t); continueRender(h); }).catch((e) => { console.error(e); continueRender(h); throw e; });
    return () => { live = false; }; }, [file]);
  return tex;
};
