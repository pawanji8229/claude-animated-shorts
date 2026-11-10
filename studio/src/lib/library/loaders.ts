// Asset loading for the TwistFrame library. Every load is wrapped in Remotion's delayRender so no frame is captured
// before its models/textures exist, and cached per browser tab (a GLB is fetched + parsed once, then every <Model>
// shares its geometry and materials; clones only copy the node tree).
import { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { continueRender, delayRender, staticFile } from "remotion";
import { MANIFEST, type AssetId } from "./manifest";

const cache = new Map<string, Promise<unknown>>();
const once = <T,>(key: string, make: () => Promise<T>): Promise<T> => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key) as Promise<T>; };
const url = (p: string) => staticFile(p.replace(/^public\//, ""));

/** suspend-free hook: returns null until loaded, holding a delayRender handle meanwhile */
export function useAsset<T>(key: string, make: () => Promise<T>): T | null {
  const [v, setV] = useState<T | null>(null);
  useEffect(() => {
    let live = true; const h = delayRender(`asset ${key}`, { timeoutInMilliseconds: 300000 });
    once(key, make).then((x) => { if (live) setV(x); continueRender(h); }, (e) => { console.error(e); continueRender(h); throw e; });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

export const loadGltf = (id: AssetId, lod = 0) => once(`gltf:${id}:${lod}`, () => {
  const m = MANIFEST[id]; const file = lod && m.lod1 ? m.lod1 : m.file!;
  return new Promise<GLTF>((res, rej) => new GLTFLoader().load(url(file), (g) => {
    g.scene.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mt of mats) { const s = mt as THREE.MeshStandardMaterial; if (s.map) { s.map.anisotropy = 4; s.map.colorSpace = THREE.SRGBColorSpace; } } } });
    res(g);
  }, undefined, rej));
});
export const useGltf = (id: AssetId, lod = 0) => useAsset(`gltf:${id}:${lod}`, () => loadGltf(id, lod));

export type TexSet = { diff?: THREE.Texture; nor?: THREE.Texture; rough?: THREE.Texture; arm?: THREE.Texture };
export const loadTextureSet = (id: AssetId) => once(`tex:${id}`, async () => {
  const m = MANIFEST[id]; const L = new THREE.TextureLoader(); const out: TexSet = {};
  await Promise.all(Object.entries(m.maps ?? {}).map(([k, p]) => L.loadAsync(url(p)).then((t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; t.colorSpace = k === "diff" ? THREE.SRGBColorSpace : THREE.NoColorSpace; (out as Record<string, THREE.Texture>)[k] = t; })));
  return out;
});
export const useTextureSet = (id: AssetId) => useAsset(`tex:${id}`, () => loadTextureSet(id));

export const loadHdr = (id: AssetId) => once(`hdr:${id}`, () => new RGBELoader().loadAsync(url(MANIFEST[id].file!)).then((t) => { t.mapping = THREE.EquirectangularReflectionMapping; return t; }));
export const useHdr = (id: AssetId) => useAsset(`hdr:${id}`, () => loadHdr(id));
