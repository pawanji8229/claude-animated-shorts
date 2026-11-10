// TwistFrame library components: GLB models (shared geometry/materials, optional LOD), deterministic instanced
// scatter (one draw call per primitive for any number of copies), PBR ground/surfaces from CC0 texture sets, HDRI
// image-based lighting, and a calm/ocean water surface lit by the HDRI (no extra reflection render pass).
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useGltf, useHdr, useTextureSet } from "./loaders";
import { MANIFEST, type AssetId } from "./manifest";
import { quality } from "./quality";

type V3 = [number, number, number];
const rng = (seed: number) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; };

/** a library model. `height` (m) rescales uniformly to that height; otherwise native metres. `lodFrom` = camera
 *  position: beyond quality().lodNear the reduced LOD1 mesh is used (only for models that ship one). */
export const Model: React.FC<{ id: AssetId; pos?: V3; rot?: V3; scale?: number; height?: number; lodFrom?: V3; shadows?: boolean; tint?: string }> = ({ id, pos = [0, 0, 0], rot = [0, 0, 0], scale, height, lodFrom, shadows = true, tint }) => {
  const m = MANIFEST[id];
  const far = !!(lodFrom && m.lod1 && Math.hypot(lodFrom[0] - pos[0], lodFrom[1] - pos[1], lodFrom[2] - pos[2]) > quality().lodNear);
  const g = useGltf(id, far ? 1 : 0);
  const obj = useMemo(() => { if (!g) return null; const c = g.scene.clone(true);
    c.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) { me.castShadow = shadows; me.receiveShadow = true;
      if (tint) { me.material = (me.material as THREE.MeshStandardMaterial).clone(); (me.material as THREE.MeshStandardMaterial).color.multiply(new THREE.Color(tint)); } } });
    return c; }, [g, shadows, tint]);
  if (!obj) return null;
  const h = m.bounds ? m.bounds.max[1] - m.bounds.min[1] : 1, s = scale ?? (height ? height / h : 1);
  return <primitive object={obj} position={pos} rotation={rot} scale={s} />;
};

export type ScatterItem = { p: V3; ry?: number; s?: number };
/** deterministic placements in a rectangle [x0,z0]-[x1,z1] with a minimum spacing; `avoid` rectangles stay empty */
export const scatter = (seed: number, n: number, rect: [number, number, number, number], minGap = 1, sRange: [number, number] = [0.8, 1.2], avoid: [number, number, number, number][] = [], y = 0): ScatterItem[] => {
  const r = rng(seed), out: ScatterItem[] = [];
  for (let tries = 0; out.length < n && tries < n * 60; tries++) {
    const x = rect[0] + r() * (rect[2] - rect[0]), z = rect[1] + r() * (rect[3] - rect[1]);
    if (avoid.some(([a, b, c, d]) => x > a && x < c && z > b && z < d)) continue;
    if (out.some((o) => Math.hypot(o.p[0] - x, o.p[2] - z) < minGap)) continue;
    out.push({ p: [x, y, z], ry: r() * Math.PI * 2, s: sRange[0] + r() * (sRange[1] - sRange[0]) });
  }
  return out;
};
/** many copies of one library model as InstancedMeshes (1 draw call per primitive). */
export const Instanced: React.FC<{ id: AssetId; items: ScatterItem[]; lod?: 0 | 1; shadows?: boolean; height?: number }> = ({ id, items, lod = 0, shadows = true, height }) => {
  const g = useGltf(id, lod), m = MANIFEST[id];
  const meshes = useMemo(() => {
    if (!g) return [];
    const h = m.bounds ? m.bounds.max[1] - m.bounds.min[1] : 1, base = height ? height / h : 1;
    const list: THREE.InstancedMesh[] = []; g.scene.updateMatrixWorld(true);
    g.scene.traverse((o) => { const me = o as THREE.Mesh; if (!me.isMesh) return;
      const im = new THREE.InstancedMesh(me.geometry, me.material, items.length), M = new THREE.Matrix4(), q = new THREE.Quaternion();
      items.forEach((it, i) => { const s = (it.s ?? 1) * base; M.compose(new THREE.Vector3(...it.p), q.setFromEuler(new THREE.Euler(0, it.ry ?? 0, 0)), new THREE.Vector3(s, s, s)).multiply(me.matrixWorld); im.setMatrixAt(i, M); });
      im.castShadow = shadows; im.receiveShadow = true; im.computeBoundingSphere(); list.push(im); });
    return list; }, [g, items, shadows, height, m.bounds]);
  return <>{meshes.map((im, i) => <primitive key={i} object={im} />)}</>;
};

/** PBR material from a CC0 texture set; `repeat` = tiles across the surface; cached per (id, repeat, tint) */
const matCache = new Map<string, THREE.MeshStandardMaterial>();
export const usePbr = (id: AssetId, repeat: [number, number] = [1, 1], o: { tint?: string; roughness?: number; metalness?: number; normalScale?: number } = {}) => {
  const t = useTextureSet(id);
  return useMemo(() => {
    if (!t) return null; const key = `${id}|${repeat}|${JSON.stringify(o)}`; if (matCache.has(key)) return matCache.get(key)!;
    const rep = (x?: THREE.Texture): THREE.Texture | null => { if (!x) return null; const c = x.clone(); c.repeat.set(repeat[0], repeat[1]); c.needsUpdate = true; return c; };
    const mat = new THREE.MeshStandardMaterial({ map: rep(t.diff), normalMap: rep(t.nor), roughnessMap: rep(t.rough ?? t.arm), roughness: o.roughness ?? 1, metalness: o.metalness ?? 0,
      color: new THREE.Color(o.tint ?? "#ffffff"), normalScale: new THREE.Vector2(o.normalScale ?? 1, o.normalScale ?? 1) });
    if (t.arm && !t.rough) { mat.aoMap = rep(t.arm); }
    matCache.set(key, mat); return mat; }, [t, id, repeat[0], repeat[1], o.tint, o.roughness, o.metalness, o.normalScale]); // eslint-disable-line react-hooks/exhaustive-deps
};
/** textured ground plane (receives shadows) */
export const Ground: React.FC<{ tex: AssetId; size: [number, number]; tile?: number; pos?: V3; tint?: string; normalScale?: number }> = ({ tex, size, tile = 4, pos = [0, 0, 0], tint, normalScale }) => {
  const mat = usePbr(tex, [size[0] / tile, size[1] / tile], { tint, normalScale });
  return mat ? <mesh rotation={[-Math.PI / 2, 0, 0]} position={pos} material={mat} receiveShadow><planeGeometry args={size} /></mesh> : null;
};
/** a textured box (walls, kerbs, plinths) with UVs scaled to world size so tiles keep their real size */
export const PbrBox: React.FC<{ tex: AssetId; size: V3; pos: V3; rot?: V3; tile?: number; tint?: string; cast?: boolean }> = ({ tex, size, pos, rot = [0, 0, 0], tile = 2, tint, cast = true }) => {
  const mat = usePbr(tex, [1, 1], { tint });
  const geo = useMemo(() => { const g = new THREE.BoxGeometry(...size); const uv = g.attributes.uv as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const [w, h] = ax > 0.5 ? [size[2], size[1]] : ay > 0.5 ? [size[0], size[2]] : [size[0], size[1]]; uv.setXY(i, uv.getX(i) * w / tile, uv.getY(i) * h / tile); }
    return g; }, [size[0], size[1], size[2], tile]); // eslint-disable-line react-hooks/exhaustive-deps
  return mat ? <mesh geometry={geo} material={mat} position={pos} rotation={rot} castShadow={cast} receiveShadow /> : null;
};

/** HDRI image-based lighting (PMREM, built once per HDRI and canvas). `background` also shows the sky. */
export const HdriEnvironment: React.FC<{ id: AssetId; intensity?: number; background?: boolean; rotationY?: number }> = ({ id, intensity = 1, background = false, rotationY = 0 }) => {
  const hdr = useHdr(id); const { gl, scene } = useThree();
  const env = useMemo(() => { if (!hdr) return null; const p = new THREE.PMREMGenerator(gl); const rt = p.fromEquirectangular(hdr); p.dispose(); return rt.texture; }, [hdr, gl]);
  useMemo(() => { if (!env) return; scene.environment = env; scene.environmentIntensity = intensity; scene.environmentRotation.set(0, rotationY, 0);
    if (background) { scene.background = hdr; scene.backgroundRotation.set(0, rotationY, 0); scene.backgroundIntensity = intensity; } }, [env, hdr, scene, intensity, background, rotationY]);
  return null;
};

/** water: vertex swell on a CPU grid (deterministic in frame time t), two scrolling normal layers, HDRI reflections
 *  through scene.environment (no planar reflection pass = no second scene render), depth tint toward `deep`. */
export const Water: React.FC<{ t: number; size: [number, number]; seg?: number; pos?: V3; amp?: number; shallow?: string; deep?: string; normalTex?: THREE.Texture | null; roughness?: number; chop?: number }> = ({ t, size, seg = 160, pos = [0, 0, 0], amp = 0.18, shallow = "#2f6f7a", deep = "#0d3346", normalTex, roughness = 0.12, chop = 1 }) => {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(size[0], size[1], seg, seg); g.rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3)); return g; }, [size[0], size[1], seg]); // eslint-disable-line react-hooks/exhaustive-deps
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0, envMapIntensity: 1.0 }), [roughness]);
  if (normalTex && mat.normalMap !== normalTex) { mat.normalMap = normalTex; mat.normalScale.set(0.35 * chop, 0.35 * chop); mat.needsUpdate = true; }
  if (mat.normalMap) mat.normalMap.offset.set(t * 0.011, t * 0.017);
  { const p = geo.attributes.position as THREE.BufferAttribute, c = geo.attributes.color as THREE.BufferAttribute, a = new THREE.Color(shallow), b = new THREE.Color(deep), k = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i);
      const y = amp * (Math.sin(0.35 * x + 0.21 * z + t * 1.1) + 0.6 * Math.sin(-0.23 * x + 0.47 * z + t * 1.7) + 0.25 * Math.sin(0.9 * x - 0.8 * z + t * 2.6)) * chop;
      p.setY(i, y); const d = Math.min(1, Math.hypot(x, z) / (size[0] * 0.45)); k.copy(a).lerp(b, 0.35 + 0.65 * d).offsetHSL(0, 0, y * 0.25); c.setXYZ(i, k.r, k.g, k.b); }
    p.needsUpdate = true; c.needsUpdate = true; geo.computeVertexNormals(); }
  return <mesh geometry={geo} material={mat} position={pos} receiveShadow />;
};
