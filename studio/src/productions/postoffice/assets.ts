// Asset loading for the post office film: CC0 scans (Poly Haven) + CC0 glTF models, loaded once behind delayRender.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { continueRender, delayRender, staticFile } from "remotion";
import { useEffect, useState } from "react";
import { rng } from "../../lib/math";

export const TEXS = ["coast_sand_01", "coral_ground_02", "thatch_roof_angled", "palm_tree_bark", "damp_beach_sand", "aerial_beach_01"] as const;
const OLD = ["aerial_grass_rock", "rocky_terrain_02", "old_planks_02", "dark_wood"] as const;
const IMAGES = [...TEXS.flatMap((n) => ["diff", "nor_gl", "rough"].map((m) => `po/tex/${n}_${m}.jpg`)), ...OLD.flatMap((n) => ["diff", "nor_gl"].map((m) => `tex/${n}_${m}.jpg`))];
export const MODELS = ["rock_07", "rock_09", "boulder_01", "lambis_shell", "wooden_picnic_table", "outdoor_table_chair_set_01"] as const;
const IMG = new Map<string, HTMLImageElement>(); const GLB = new Map<string, THREE.Group>();
let loading: Promise<void> | null = null;
const loadAll = () => loading ??= Promise.all([
  ...IMAGES.map((p) => new Promise<void>((res, rej) => { const im = new Image(); im.onload = () => { IMG.set(p, im); res(); }; im.onerror = () => rej(new Error(p)); im.src = staticFile(p); })),
  ...MODELS.map((m) => new GLTFLoader().loadAsync(staticFile(`po/models/${m}/${m}.gltf`)).then((g) => { GLB.set(m, g.scene); })),
]).then(() => undefined);
export const usePoReady = () => {
  const [ready, set] = useState(IMG.size === IMAGES.length && GLB.size === MODELS.length);
  useEffect(() => { if (ready) return; const h = delayRender("postoffice assets", { timeoutInMilliseconds: 300000 }); loadAll().then(() => { set(true); continueRender(h); }); }, [ready]);
  return ready;
};
const TX = new Map<string, THREE.Texture>();
/** a scan map: n = texture name, m = diff | nor_gl | rough */
export const scan = (n: string, m: "diff" | "nor_gl" | "rough", repeat = true) => {
  const p = (TEXS as readonly string[]).includes(n) ? `po/tex/${n}_${m}.jpg` : `tex/${n}_${m}.jpg`;
  const key = `${p}|${repeat}`; let t = TX.get(key); if (t) return t; const im = IMG.get(p); if (!im) throw new Error(`not loaded: ${p}`);
  t = new THREE.Texture(im); t.anisotropy = 8; if (m === "diff") t.colorSpace = THREE.SRGBColorSpace; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; TX.set(key, t); return t;
};
/** merged geometry + material list of a glTF model (first mesh), recentred so its base sits at y = 0 */
const MG = new Map<string, { geo: THREE.BufferGeometry; mat: THREE.Material; size: THREE.Vector3 }[]>();
export const model = (m: string) => {
  let r = MG.get(m); if (r) return r; const sc = GLB.get(m); if (!sc) throw new Error(`model not loaded: ${m}`);
  sc.updateMatrixWorld(true); const parts: { geo: THREE.BufferGeometry; mat: THREE.Material; size: THREE.Vector3 }[] = []; const box = new THREE.Box3().setFromObject(sc);
  sc.traverse((o) => { const me = o as THREE.Mesh; if (!me.isMesh) return; const g = me.geometry.clone(); g.applyMatrix4(me.matrixWorld); g.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2); g.computeBoundingSphere();
    const mat = (Array.isArray(me.material) ? me.material[0] : me.material) as THREE.MeshStandardMaterial; parts.push({ geo: g, mat, size: box.getSize(new THREE.Vector3()) }); });
  MG.set(m, parts); return parts;
};

/** painted canvas texture helper (seeded, deterministic) */
export const paintTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 1, srgb = true, repeat = true) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; draw(g, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
