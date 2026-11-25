// High-detail internet models (Sketchfab CC-BY, credits in public/hotel2/m/assets.json): decoded before the first frame,
// cloned per use with SkeletonUtils (skinned meshes keep their skeleton), animations evaluated as a pure function of
// time (AnimationMixer.setTime), so every frame / render chunk is deterministic.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as skClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { continueRender, delayRender, staticFile } from "remotion";
import { createPortal } from "@react-three/fiber";
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
export type Attach = { bone: string; node: React.ReactNode };
export const GModel: React.FC<{ name: H2Model; p: V3; ry?: number; s?: number; clip?: string | number; t?: number; rx?: number; attach?: Attach[]; blend?: { clip: string | number; t: number; w: number } }> = ({ name, p, ry = 0, s = 1, clip, t = 0, rx = 0, attach = [], blend }) => {
  const src = cache.get(name)!;
  const { obj, mixer } = useMemo(() => { const o = skClone(src.scene) as THREE.Group; const mx = src.clips.length ? new THREE.AnimationMixer(o) : null; return { obj: o, mixer: mx }; }, [src]);
  const find = (c: string | number) => typeof c === "number" ? src.clips[c] : src.clips.find((x) => x.name === c) ?? src.clips[0];
  if (mixer && clip !== undefined) { mixer.stopAllAction(); const c = find(clip);
    if (c) { const a = mixer.clipAction(c); a.reset(); a.setEffectiveWeight(blend ? 1 - blend.w : 1); a.play(); a.time = ((t % c.duration) + c.duration) % c.duration; }
    if (blend) { const c2 = find(blend.clip); if (c2) { const b = mixer.clipAction(c2); b.reset(); b.setEffectiveWeight(blend.w); b.play(); b.time = ((blend.t % c2.duration) + c2.duration) % c2.duration; } }
    mixer.update(0); }
  // per bone: its rest-pose world rotation + scale inside the (identity) model, so attachments are authored in model
  // metres, upright at rest, and then follow the bone's animated rotation relative to rest
  const bones = useMemo(() => { obj.updateMatrixWorld(true); return attach.map((a) => { const b = obj.getObjectByName(a.bone); if (!b) return null;
    const q = new THREE.Quaternion(), sc = new THREE.Vector3(); b.getWorldQuaternion(q); b.getWorldScale(sc); return { b, q: q.invert(), s: 1 / sc.x }; }); }, [obj, attach.map((a) => a.bone).join()]);
  return <><primitive object={obj} position={p} rotation={[rx, ry, 0]} scale={s} />{attach.map((a, i) => { const B = bones[i]; return B ? <React.Fragment key={i}>{createPortal(<group quaternion={B.q} scale={B.s}>{a.node}</group>, B.b)}</React.Fragment> : null; })}</>;
};
