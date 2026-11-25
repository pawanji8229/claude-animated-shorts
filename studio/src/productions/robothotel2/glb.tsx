// High-detail internet models (Sketchfab CC-BY, credits in public/hotel2/m/assets.json): decoded before the first frame,
// cloned per use with SkeletonUtils (skinned meshes keep their skeleton), animations evaluated as a pure function of
// time (AnimationMixer.setTime), so every frame / render chunk is deterministic.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { continueRender, delayRender, staticFile } from "remotion";
import type { V3 } from "../../lib/math";

type Loaded = { scene: THREE.Group; clips: THREE.AnimationClip[] };
const cache = new Map<string, Loaded>(); let all: Promise<void> | null = null;
export const H2_MODELS = ["rdino", "trex", "raptorpbr", "raptorblue", "copper", "poddy", "waitress", "humanoid", "robobun", "lugcart", "recdesk", "jphotel", "cityhotel", "bedroom", "cuterobot", "minirobot", "vintagebot", "vacuum", "suitcase", "bellhop"] as const;
export type H2Model = (typeof H2_MODELS)[number];
const loadAll = () => (all ??= Promise.all(H2_MODELS.map(async (n) => { const g = await new GLTFLoader().loadAsync(staticFile(`hotel2/m/${n}.glb`));
  g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; } }); cache.set(n, { scene: g.scene, clips: g.animations }); })).then(() => undefined));
export const useH2Ready = () => { const [ok, set] = useState(false);
  useEffect(() => { const h = delayRender("hotel2 models"); loadAll().then(() => { set(true); continueRender(h); }).catch((e) => { console.error(e); continueRender(h); throw e; }); }, []); return ok; };
export const clipsOf = (n: H2Model) => cache.get(n)?.clips.map((c) => `${c.name} ${c.duration.toFixed(1)}s`) ?? [];
/** a placed model; `clip` (name or index) is posed at `t` seconds (looped), `tint` optionally recolours materials */
export const GModel: React.FC<{ name: H2Model; p: V3; ry?: number; s?: number; clip?: string | number; t?: number; rx?: number }> = ({ name, p, ry = 0, s = 1, clip, t = 0, rx = 0 }) => {
  const src = cache.get(name)!;
  const { obj, mixer } = useMemo(() => { const o = skClone(src.scene) as THREE.Group; const mx = src.clips.length ? new THREE.AnimationMixer(o) : null; return { obj: o, mixer: mx }; }, [src]);
  if (mixer && clip !== undefined) { const c = typeof clip === "number" ? src.clips[clip] : src.clips.find((x) => x.name === clip) ?? src.clips[0];
    if (c) { mixer.stopAllAction(); const a = mixer.clipAction(c); a.reset(); a.play(); mixer.setTime(((t % c.duration) + c.duration) % c.duration); } }
  return <primitive object={obj} position={p} rotation={[rx, ry, 0]} scale={s} />;
};
