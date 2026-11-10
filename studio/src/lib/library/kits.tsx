// Modular kits from the CC0 library, assembled at runtime from their named pieces (pipeline keeps kit nodes separate):
//   <Building>  modular_urban_apartments_facade (3 m grid): base plinth, ground floor of doors/shop windows, upper
//               floors of window bays with their own window inserts, cornice + crown, plus a solid textured volume
//               and roof behind the facade so the building has depth from any angle
//   <KitPart>   pick one variant out of a pack (new vs aged hydrant, clean vs rusty bin, crate a/b, single rock...)
//   <Pier>      chain wooden pier sections;  <Fence> chain chain-link panels with posts
// Every piece keeps the asset's materials; geometry is shared between all copies (clone = node tree only).
import React, { useMemo } from "react";
import * as THREE from "three";
import { useGltf } from "./loaders";
import { MANIFEST, type AssetId } from "./manifest";
import { PbrBox } from "./components";

type V3 = [number, number, number];
type Piece = { name: string; min: number[]; max: number[] };
const pieces = (id: AssetId) => new Map((MANIFEST[id].pieces ?? []).map((p) => [p.name, p as Piece]));
/** clone a named root piece of a kit and move it so its bounding-box minimum lands on `target` */
const place = (scene: THREE.Object3D, P: Map<string, Piece>, name: string, target: V3, keepZ = true): THREE.Object3D | null => {
  const src = scene.getObjectByName(name), pc = P.get(name); if (!src || !pc) return null;
  const c = src.clone(true); c.position.set(src.position.x + target[0] - pc.min[0], src.position.y + target[1] - pc.min[1], src.position.z + (keepZ ? 0 : target[2] - pc.min[2]));
  c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return c;
};

const UPPER = [["wall_window_centered_double_01", "window_centered_double_01"], ["wall_window_offset_small_01", "window_offset_small_01"], ["wall_window_centered_double_02", "window_centered_double_02"], ["wall_window_offset_small_03", "window_offset_small_03"]] as const;
const GROUND = [["wall_door_centered_small_01", "door_centered_small_01"], ["wall_window_centered_double_01", "window_centered_double_01"], ["wall_window_offset_small_01", "window_offset_small_01"]] as const;
/** a building front `bays` x 3 m wide, `floors` storeys of 3 m, facing +z from `pos` (rotate with rotY). */
export const Building: React.FC<{ bays: number; floors: number; pos?: V3; rotY?: number; seed?: number; doorBay?: number; depth?: number; roofTex?: AssetId; sideTex?: AssetId }> = ({ bays, floors, pos = [0, 0, 0], rotY = 0, seed = 1, doorBay, depth = 7, sideTex = "red_brick_03" }) => {
  const g = useGltf("modular_urban_apartments_facade");
  const group = useMemo(() => {
    if (!g) return null; const P = pieces("modular_urban_apartments_facade"), grp = new THREE.Group();
    const BASE = 0.75, W = bays * 3, x0 = -W / 2; const door = doorBay ?? Math.floor(bays / 2);
    const add = (o: THREE.Object3D | null) => { if (o) grp.add(o); };
    for (let b = 0; b < bays; b++) {
      const x = x0 + b * 3;
      add(place(g.scene, P, "base_standard_01", [x, 0, 0]));
      const [gw, gi] = b === door ? GROUND[0] : GROUND[1 + ((b + seed) % 2)];
      const gwP = P.get(gw)!, giP = P.get(gi)!;
      add(place(g.scene, P, gw, [x, BASE, 0])); add(place(g.scene, P, gi, [x + giP.min[0] - gwP.min[0], BASE + giP.min[1] - gwP.min[1], 0]));
      for (let f = 1; f < floors; f++) {
        const [w, i] = UPPER[(b * 3 + f * 5 + seed) % UPPER.length], wP = P.get(w)!, iP = P.get(i)!, y = BASE + f * 3;
        add(place(g.scene, P, w, [x, y, 0])); add(place(g.scene, P, i, [x + iP.min[0] - wP.min[0], y + iP.min[1] - wP.min[1], 0]));
      }
      const top = BASE + floors * 3;
      add(place(g.scene, P, "cornice_standard_standard_01", [x, top, 0]));
      add(place(g.scene, P, "crown_standard_standard_01", [x, top + 0.2, 0]));
    }
    return grp;
  }, [g, bays, floors, seed, doorBay]);
  if (!group) return null;
  const H = 0.75 + floors * 3, W = bays * 3;
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <primitive object={group} />
      {/* building volume behind the facade: brick side/back walls and a roof slab, tiled at real size */}
      <PbrBox tex={sideTex} size={[W - 0.02, H, depth]} pos={[0, H / 2, -depth / 2 - 0.05]} tile={2.2} />
      <PbrBox tex="concrete_block_wall" size={[W + 0.3, 0.25, depth + 0.4]} pos={[0, H + 0.12, -depth / 2]} tile={3} />
    </group>
  );
};

/** render the pieces of a kit whose names match `match`, kept in their relative layout, recentred so the group's
 *  footprint centre sits at `pos` on the ground. e.g. <KitPart id="fire_hydrant" match={/^fire_hydrant(_cap_0\d|_chain)?$/} /> */
export const KitPart: React.FC<{ id: AssetId; match: RegExp; pos?: V3; rot?: V3; scale?: number }> = ({ id, match, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1 }) => {
  const g = useGltf(id);
  const group = useMemo(() => {
    if (!g) return null; const P = pieces(id), names = [...P.keys()].filter((n) => match.test(n)); if (!names.length) return null;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const n of names) { const p = P.get(n)!; for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p.min[k]); mx[k] = Math.max(mx[k], p.max[k]); } }
    const grp = new THREE.Group(), off = new THREE.Vector3(-(mn[0] + mx[0]) / 2, -mn[1], -(mn[2] + mx[2]) / 2);
    for (const n of names) { const s = g.scene.getObjectByName(n); if (!s) continue; const c = s.clone(true); c.position.add(off); c.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); grp.add(c); }
    return grp; }, [g, id, match.source]); // eslint-disable-line react-hooks/exhaustive-deps
  return group ? <primitive object={group} position={pos} rotation={rot} scale={scale} /> : null;
};

/** wooden pier: `n` sections chained along -z from pos (deck top ~2.7 m above the section base) */
export const Pier: React.FC<{ n: number; pos?: V3; rotY?: number }> = ({ n, pos = [0, 0, 0], rotY = 0 }) => {
  const g = useGltf("modular_wooden_pier");
  const group = useMemo(() => {
    if (!g) return null; const P = pieces("modular_wooden_pier"), grp = new THREE.Group(); const names = ["modular_wooden_pier_section_01", "modular_wooden_pier_section_02", "modular_wooden_pier_section_03", "modular_wooden_pier_section_04"];
    let z = 0; for (let i = 0; i < n; i++) { const nm = names[i % names.length], p = P.get(nm)!, len = p.max[2] - p.min[2] - 0.35;
      const o = place(g.scene, P, nm, [-(p.max[0] - p.min[0]) / 2, p.min[1], z - len], false); if (o) grp.add(o); z -= len; }
    return grp; }, [g, n]);
  return group ? <primitive object={group} position={pos} rotation={[0, rotY, 0]} /> : null;
};

/** chain-link fence along +x from pos: `n` 2 m double panels with posts at every joint */
export const Fence: React.FC<{ n: number; pos?: V3; rotY?: number }> = ({ n, pos = [0, 0, 0], rotY = 0 }) => {
  const g = useGltf("modular_chainlink_fence");
  const group = useMemo(() => {
    if (!g) return null; const P = pieces("modular_chainlink_fence"), grp = new THREE.Group();
    for (let i = 0; i < n; i++) { const o = place(g.scene, P, "modular_chainlink_fence_double", [i * 2.0, 0.1, 0], false); if (o) grp.add(o); }
    for (let i = 0; i <= n; i++) { const o = place(g.scene, P, "modular_chainlink_post_middle", [i * 2.0 - 0.1, 0, -0.05], false); if (o) grp.add(o); }
    return grp; }, [g, n]);
  return group ? <primitive object={group} position={pos} rotation={[0, rotY, 0]} /> : null;
};
