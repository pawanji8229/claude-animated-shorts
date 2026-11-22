// Boeing v2 scene assets from the TwistFrame Model Vault + local premium library + our original models, all prepared
// into public/boeing2/m (base-centre origin, 1k textures, decoder-free GLB):
//   camo_house  ORIGINAL TwistFrame model: canvas-and-timber rooftop decoy house (tinted variants, animated build-up)
//   bungalow / cottage / colonial   vault (Innerscene, CC0) real houses around the plant
//   maple / oak                    vault (Innerscene, CC0) street trees (LOD-reduced)
//   crane, lamp, drillpress, toolcart, rack, barrel, box, compressor, welder, toolchest, streetlamp, hydrant, trashcan
//                                  Poly Haven (CC0) factory + street props
// Loading holds the render (delayRender) and every placement is a pure function of fixed data -> identical in every
// parallel cloud chunk. Repeated objects are GPU-instanced (one draw call per sub-mesh and colour variant).
import React, { useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { rng, type V3 } from "../../lib/math";

export type Place = { p: V3; ry?: number; s?: number; v?: number };   // v = colour-variant index
const file = (n: string) => `boeing2/m/${n}.glb`;
// all GLBs are decoded BEFORE the first frame (useB2Ready awaits this), then read synchronously: no frame can be captured
// before a model is in the scene (async loading inside components races Remotion's screenshot)
export const MODEL_NAMES = ["camo_house", "bungalow", "cottage", "colonial", "maple", "oak", "crane", "lamp", "drillpress", "toolcart", "rack", "barrel", "box", "streetlamp", "hydrant", "trashcan", "compressor", "welder", "toolchest"];
const scenes = new Map<string, THREE.Group>(); let pre: Promise<void> | null = null;
export const preloadModels = () => (pre ??= Promise.all(MODEL_NAMES.map(async (n) => { const g = await new GLTFLoader().loadAsync(staticFile(file(n))); scenes.set(n, g.scene); })).then(() => undefined));
const useLibraryScene = (f: string) => { const n = f.replace("boeing2/m/", "").replace(".glb", ""); const s = scenes.get(n); if (!s) throw new Error(`model ${n} not preloaded`); return s; };
/** many copies of one GLB; `tints`: material-name substring -> colour per variant (multiplies the texture) */
export const Instances: React.FC<{ name: string; items: Place[]; tints?: Record<string, string[]>; shadows?: boolean }> = ({ name, items, tints, shadows = true }) => {
  const src = useLibraryScene(file(name));
  const meshes = useMemo(() => { if (!src || !items.length) return []; src.updateMatrixWorld(true); const out: THREE.InstancedMesh[] = [], M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
    const nV = tints ? Math.max(...Object.values(tints).map((a) => a.length)) : 1;
    for (let v = 0; v < nV; v++) { const group = items.filter((it) => (it.v ?? 0) % nV === v); if (!group.length) continue;
      src.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; let mat = m.material as THREE.MeshStandardMaterial;
        if (tints) for (const [k, cols] of Object.entries(tints)) if (mat.name?.includes(k)) { mat = mat.clone(); mat.color = new THREE.Color(cols[v % cols.length]); }
        const im = new THREE.InstancedMesh(m.geometry, mat, group.length); im.castShadow = shadows; im.receiveShadow = true;
        group.forEach((it, i) => { const s = it.s ?? 1; im.setMatrixAt(i, M.compose(new THREE.Vector3(...it.p), Q.setFromAxisAngle(Y, it.ry ?? 0), new THREE.Vector3(s, s, s)).multiply(m.matrixWorld)); });
        im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); out.push(im); }); }
    return out; }, [src, items, tints, shadows]);
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
};
/** a single GLB (cloned) */
export const Model: React.FC<{ name: string; p: V3; ry?: number; s?: number }> = ({ name, p, ry = 0, s = 1 }) => {
  const src = useLibraryScene(file(name)); const obj = useMemo(() => { if (!src) return null; const c = src.clone(true); c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = m.receiveShadow = true; } }); return c; }, [src]);
  return obj ? <primitive object={obj} position={p} rotation={[0, ry, 0]} scale={s} /> : null;
};

// ---------------------------------------------------------------- the rooftop decoy houses
// GLB local frame: front (door, burlap lawn) faces +z; bbox-centred, so the lawn's front edge is at z = +4.53
export const CAMO_FRONT = 4.53;
export const CAMO_TINTS: Record<string, string[]> = {
  "Painted canvas siding": ["#ffffff", "#e4f0ff", "#f4ffe8", "#fff0e6", "#ffffff", "#f0eadc"],
  "Painted canvas roof": ["#ffffff", "#c89a86", "#a4b0a0", "#d0b49a", "#8c96a6", "#b0a090"],
  "Painted shutter": ["#ffffff", "#6a7aa0", "#a07a50", "#7a4040", "#ffffff", "#5a6a5a"],
  "Painted door": ["#ffffff", "#5a7aa0", "#8aa070", "#c0a080", "#a0c0a0", "#ffffff"],
};
/** place a decoy house so its lawn front edge sits on the lot's street line (x, z, facing ry) */
export const camoAt = (x: number, y: number, z: number, ry: number, v: number): Place => ({ p: [x - Math.sin(ry) * CAMO_FRONT, y, z - Math.cos(ry) * CAMO_FRONT], ry, v });
const STAGES: Record<string, [number, number]> = { Frame: [0, 0.3], CanvasWalls: [0.25, 0.55], CanvasRoof: [0.5, 0.78], Chimney: [0.7, 0.85], PaintedDetails: [0.72, 0.9], LawnMat: [0.86, 1] };
/** one decoy house being built: parts revealed bottom-up with world-space clip planes (no popping, nothing spawns) */
export const BuildingCamoHouse: React.FC<{ place: Place; prog: number }> = ({ place, prog }) => {
  const src = useLibraryScene(file("camo_house"));
  const built = useMemo(() => { if (!src) return null; const root = src.clone(true), planes: Record<string, THREE.Plane> = {};
    root.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; let part = o.parent; while (part && !STAGES[part.name]) part = part.parent; const key = part?.name ?? "Frame";
      const pl = (planes[key] ??= new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)); const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => { const c = (x as THREE.Material).clone(); c.clippingPlanes = [pl]; return c; });
      m.material = mats.length === 1 ? mats[0] : mats; m.castShadow = m.receiveShadow = true; });
    return { root, planes }; }, [src]);
  if (!built) return null;
  const y0 = place.p[1], top = y0 + 5.2;
  for (const [k, [a, b]] of Object.entries(STAGES)) { const t = Math.min(1, Math.max(0, (prog - a) / (b - a))); const pl = built.planes[k]; if (!pl) continue;
    if (k === "LawnMat") { const n = new THREE.Vector3(Math.sin(place.ry ?? 0), 0, Math.cos(place.ry ?? 0)).negate(); pl.normal.copy(n); const front = new THREE.Vector3(...place.p).addScaledVector(n, -CAMO_FRONT); pl.constant = -n.dot(front) - (1 - t) * 3.2; }
    else pl.constant = y0 - 0.02 + t * (top - y0); }
  return <primitive object={built.root} position={place.p} rotation={[0, place.ry ?? 0, 0]} visible={prog > 0} />;
};

// ---------------------------------------------------------------- factory interior dressing around the assembly line
export function factoryProps(LINE: [number, number, number][]) {
  const r = rng(404), clusters: Record<string, Place[]> = { toolcart: [], drillpress: [], rack: [], barrel: [], box: [], compressor: [], welder: [], toolchest: [] };
  for (const [x, z] of LINE) { const gx = x + 14, side = z > 0 ? 1 : -1;
    clusters.toolcart.push({ p: [gx - 1.4, 0, z + side * 3.2], ry: r() * 6.28 }); clusters.toolchest.push({ p: [gx + 1.3, 0, z + side * 4.4], ry: Math.PI / 2 });
    clusters.barrel.push({ p: [gx + 1.6, 0, z - side * 3.6] }, { p: [gx + 2.2, 0, z - side * 3.1] }); clusters.box.push({ p: [gx - 1.8, 0, z - side * 4.2], ry: r() }, { p: [gx - 1.6, 0.34, z - side * 4.25], ry: r() });
    if (r() < 0.6) clusters.welder.push({ p: [gx, 0, z + side * 6.4], ry: r() * 6.28 }); else clusters.compressor.push({ p: [gx, 0, z + side * 6.4], ry: r() * 6.28 }); }
  // machine shop strip along the back wall: drill presses on benches-height + racks of parts
  for (let x = -96; x <= 96; x += 6) { clusters.rack.push({ p: [x, 0, -61], ry: 0 }); if (x % 12 === 0) clusters.drillpress.push({ p: [x + 3, 0, -58.5], ry: Math.PI }); }
  return clusters;
}
/** hanging enamel lamps over the floor + overhead bridge cranes over each line */
export const lampPlaces = (xs: number[], zs: number[], y: number): Place[] => xs.flatMap((x) => zs.map((z) => ({ p: [x, y, z] as V3 })));
