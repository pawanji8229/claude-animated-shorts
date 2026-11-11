// short3 PBR textures: CC0 scans from Poly Haven (studio/public/tex, see LICENSE_CC0.txt), loaded ONCE per page before
// the first frame renders (delayRender), then shared by every canvas. All geometry built with kit.ts carries UVs in
// METRES, so a material only needs the real-world tile size of its scan -> bricks/stones keep true scale everywhere
// (no stretched or squashed courses, whatever the size of the wall).
import { useEffect, useState } from "react";
import * as THREE from "three";
import { continueRender, delayRender, staticFile } from "remotion";

/** real-world size (m) of one tile of each scan (Poly Haven "dimensions") */
export const TEX = {
  red_brick_03: 1.0, large_sandstone_blocks_01: 3.0, concrete_pavement: 1.8, asphalt_01: 2.08, gravel_road: 2.0,
  tarred_gravel: 2.2, large_red_bricks: 2.0, factory_brick: 1.5, dark_brick_wall: 1.05, brick_wall_006: 3.0,
  old_planks_02: 2.0, rusty_painted_metal: 2.2, rusty_metal_02: 1.0, beige_wall_001: 3.0, old_wood_floor: 3.0, dark_wood: 2.0,
} as const;
export type TexName = keyof typeof TEX;
const MAPS = ["diff", "nor_gl", "rough"] as const;
const IMG = new Map<string, HTMLImageElement>();
let loading: Promise<void> | null = null;
const loadAll = () => loading ??= Promise.all(Object.keys(TEX).flatMap((n) => MAPS.map((m) => new Promise<void>((res, rej) => {
  const im = new Image(); im.onload = () => { IMG.set(`${n}_${m}`, im); res(); }; im.onerror = () => rej(new Error(`texture ${n}_${m}`)); im.src = staticFile(`tex/${n}_${m}.jpg`);
})))).then(() => undefined);

/** call once at the top of the film: false until every scan is decoded (render is held with delayRender meanwhile) */
export const useTexReady = () => {
  const [ready, set] = useState(IMG.size === Object.keys(TEX).length * MAPS.length);
  useEffect(() => { if (ready) return; const h = delayRender("short3 textures"); loadAll().then(() => { set(true); continueRender(h); }); }, [ready]);
  return ready;
};

const TX = new Map<string, THREE.Texture>();
const tex = (n: TexName, m: (typeof MAPS)[number], scale: number) => {
  const key = `${n}_${m}_${scale}`; let t = TX.get(key); if (t) return t;
  const im = IMG.get(`${n}_${m}`); if (!im) throw new Error(`texture not loaded: ${n}_${m}`);
  t = new THREE.Texture(im); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(1 / (TEX[n] * scale), 1 / (TEX[n] * scale));
  if (m === "diff") t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; TX.set(key, t); return t;
};
export type PbrOpts = { color?: string; rough?: number; metal?: number; normal?: number; scale?: number; emissive?: string; ei?: number; bright?: number };
const MAT = new Map<string, THREE.MeshStandardMaterial>();
/** PBR material from a scan (UVs in metres). `color` tints the albedo, `scale` enlarges the tile, `normal` = normal strength */
export const pbr = (n: TexName, o: PbrOpts = {}) => {
  const key = `${n}|${JSON.stringify(o)}`; let mm = MAT.get(key); if (mm) return mm;
  const s = o.scale ?? 1;
  mm = new THREE.MeshStandardMaterial({ map: tex(n, "diff", s), normalMap: tex(n, "nor_gl", s), roughnessMap: tex(n, "rough", s), color: o.color ?? "#ffffff",
    roughness: o.rough ?? 1, metalness: o.metal ?? 0, normalScale: new THREE.Vector2(o.normal ?? 1, o.normal ?? 1) });
  if (o.bright) mm.color.multiplyScalar(o.bright);
  if (o.emissive === "map") { mm.emissiveMap = mm.map; mm.emissive = new THREE.Color("#ffe6c4"); mm.emissiveIntensity = o.ei ?? 0.2; }   // fake interior bounce light
  else if (o.emissive) { mm.emissive = new THREE.Color(o.emissive); mm.emissiveIntensity = o.ei ?? 1; }
  MAT.set(key, mm); return mm;
};
