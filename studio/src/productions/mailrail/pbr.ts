// Mail Rail (from Boeing v2): real PBR materials (CC0 Poly Haven / ambientCG scans, 1k) for every large surface. All textures are
// decoded BEFORE the first frame (delayRender), so no frame ever renders with a missing or half-loaded texture, and
// every parallel cloud chunk sees identical materials. Kit geometry carries metre UVs, so `rep` = metres per tile.
// ARM maps follow the glTF packing three.js expects: R = ambient occlusion, G = roughness, B = metalness.
import { useEffect, useState } from "react";
import * as THREE from "three";
import { continueRender, delayRender, staticFile } from "remotion";

const SETS: Record<string, string[]> = {
  brickY: ["color", "normal", "rough"], brickR: ["color", "normal", "rough"], stucco: ["color", "normal", "rough"], slate: ["color", "normal", "rough"], setts: ["color", "normal", "rough"],
  asphalt: ["color", "normal", "rough"], paving: ["arm", "color", "normal"], tiles: ["arm", "color", "normal"], iron: ["color", "normal", "rough"], metal: ["color", "normal", "rough"],
  concrete: ["color", "normal", "rough"], plaster: ["arm", "color", "normal"], oak: ["arm", "color", "normal"], rust: ["color", "normal", "rough"],
};
const cache = new Map<string, THREE.Texture>();
let loading: Promise<void> | null = null;
export const loadMRTextures = () => (loading ??= (async () => { const L = new THREE.TextureLoader();
  await Promise.all(Object.entries(SETS).flatMap(([k, slots]) => slots.map(async (s) => { const t = await L.loadAsync(staticFile(`mailrail/t/${k}_${s}.jpg`));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = s === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace; cache.set(`${k}_${s}`, t); }))); })());
/** true once every texture is decoded (the render is held until then) */
export const useMRReady = () => { const [ok, set] = useState(false);
  useEffect(() => { const h = delayRender("mailrail PBR textures + models"); Promise.all([loadMRTextures(), import("./models").then((m) => m.preloadModels())]).then(() => { set(true); continueRender(h); }).catch((e) => { console.error(e); continueRender(h); throw e; }); }, []);
  return ok; };
const tex = (k: string, s: string, rep: number) => { const t = cache.get(`${k}_${s}`); if (!t) return null; const c = t.clone(); c.repeat.set(1 / rep, 1 / rep); c.needsUpdate = true; return c; };
/** PBR material from a set; rep = metres per texture tile; tint multiplies the colour map */
export function pm(set: string, rep: number, o: { tint?: string; rough?: number; metal?: number; normal?: number; side?: THREE.Side; alphaTest?: number } = {}) {
  const slots = SETS[set]; if (!slots) throw new Error(`unknown PBR set ${set}`);
  const arm = slots.includes("arm") ? tex(set, "arm", rep) : null;
  const m = new THREE.MeshStandardMaterial({ map: tex(set, "color", rep), normalMap: tex(set, "normal", rep), color: o.tint ?? "#ffffff",
    roughnessMap: arm ?? (slots.includes("rough") ? tex(set, "rough", rep) : null), roughness: o.rough ?? 1, aoMap: arm ?? (slots.includes("ao") ? tex(set, "ao", rep) : null), aoMapIntensity: 0.8,
    metalnessMap: slots.includes("metal") ? tex(set, "metal", rep) : null, metalness: o.metal ?? (slots.includes("metal") ? 1 : 0), side: o.side ?? THREE.FrontSide,
    alphaMap: slots.includes("opacity") ? tex(set, "opacity", rep) : null, alphaTest: o.alphaTest ?? (slots.includes("opacity") ? 0.5 : 0) });
  const n = o.normal ?? 1; m.normalScale.set(n, n); return m;
}
