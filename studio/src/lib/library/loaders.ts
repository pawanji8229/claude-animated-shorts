// Asset loading for the TwistFrame library. Every load is wrapped in Remotion's delayRender so no frame is captured
// before its models/textures exist, and cached per browser tab (a GLB is fetched + parsed once, then every <Model>
// shares its geometry and materials; clones only copy the node tree).
import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { continueRender, delayRender, staticFile } from "remotion";
import { MANIFEST, type AssetId } from "./manifest";

const cache = new Map<string, Promise<unknown>>(), done = new Map<string, unknown>();
const once = <T,>(key: string, make: () => Promise<T>): Promise<T> => {
  if (!cache.has(key)) cache.set(key, make().then((v) => { done.set(key, v); return v; }));
  return cache.get(key) as Promise<T>;
};
const url = (p: string) => staticFile(p.replace(/^public\//, ""));

/** Load inside a <ThreeCanvas>. Returns the asset synchronously when already cached in this tab; otherwise null while
 *  a delayRender handle blocks capture. With frameloop="never" R3F only draws on frame changes, so once the asset
 *  arrives we advance one draw ourselves and only THEN release the frame (else the screenshot shows the empty scene). */
export function useAsset<T>(key: string, make: () => Promise<T>): T | null {
  const [v, setV] = useState<T | null>(() => (done.has(key) ? (done.get(key) as T) : null));
  const advance = useThree((s) => s.advance);
  const handle = useRef<number | null>(null);
  useEffect(() => {
    if (done.has(key)) { setV(done.get(key) as T); return; }
    let live = true; handle.current = delayRender(`asset ${key}`, { timeoutInMilliseconds: 300000 });
    once(key, make).then((x) => { if (live) setV(x); else if (handle.current !== null) { continueRender(handle.current); handle.current = null; } },
      (e) => { console.error(`[asset] ${key} failed`, e); if (handle.current !== null) { continueRender(handle.current); handle.current = null; } });
    return () => { live = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (v === null || handle.current === null) return;
    const h = handle.current; handle.current = null;
    requestAnimationFrame(() => { advance(performance.now()); continueRender(h); });   // draw the scene with the asset, then allow capture
  }, [v, advance]);
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
