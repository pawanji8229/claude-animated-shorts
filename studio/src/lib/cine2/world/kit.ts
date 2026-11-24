// World 2.0 kit: a small geometry DSL for building everyday objects procedurally (boxes, cylinders, cones, spheres,
// tori, lathes, tubes) with real-world dimensions in metres, plus the object definition type and registry.
// An object is a list of Parts (geometry + surface type + optional tint / emission). At render time all parts of all
// placed copies that share a material become ONE InstancedMesh per (object type, LOD, material), so even a dense
// street costs a few dozen draw calls.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Surface } from "../light/materials";

export type V3 = [number, number, number];
export type Part = { g: THREE.BufferGeometry; s: Surface; tint?: string; em?: string; emI?: number; tag?: "glass" | "wheel" | "light" | "anim" };
export type Lod = 0 | 1 | 2;
export type Category = "street" | "building" | "vehicle" | "vegetation" | "construction" | "harbor" | "industrial" | "interior" | "nature" | "micro" | "station" | "people";
export type EnvKind = "cityStreet" | "constructionSite" | "harbor" | "factory" | "historicTown" | "residentialInterior" | "countryside" | "railwayStation" | "warehouse" | "waterfront";
export type FootSurface = "concrete" | "stone" | "wood" | "metal" | "gravel" | "sand" | "grass" | "soil" | "water" | "snow" | "carpet" | "asphalt" | "tile";
export type AudioMeta = { loop?: string; events?: string[]; ambience?: string; radius?: number; gainDb?: number; when?: "always" | "animated" | "night" };
export type AnimKind = "wind" | "rotor" | "flag" | "smoke" | "steam" | "conveyor" | "excavator" | "craneSlew" | "blink" | "water";
export type ObjDef = {
  id: string; name: string; cat: Category; envs: EnvKind[] | "any";
  /** era range (years) in which the object is plausible */
  era: [number, number];
  /** bounding size w (x), h (y), d (z) in metres - used for placement, collision, validation */
  size: V3;
  place: "ground" | "wall" | "hang" | "onSurface" | "water";
  solid: boolean;
  build: (lod: Lod, variant: number) => Part[];
  /** light emitted by the object (street lamp, work light, window...) in object-local coordinates */
  light?: { kind: "street" | "work" | "warning" | "lamp" | "ship" | "headlight" | "neon" | "tunnel" | "window" | "screen" | "candle" | "fire"; at: V3; K: number; lumens: number; range: number; dir?: V3; flicker?: number; night?: boolean };
  audio?: AudioMeta; anim?: AnimKind; tags?: string[]; variants?: number;
  /** distance (m) beyond which the object is not worth drawing (micro-details) */
  maxDist?: number;
  /** vault model (CC0 Poly Haven, in the TwistFrame Model Vault) that can replace the procedural build for hero use */
  vault?: string;
  /** moving sub-assemblies (excavator boom, crane jib, fan blades...): each rotates about `pivot` (object-local) on `axis`
   *  by motion(t seconds, seed) radians; nested chains via `parent` index. Rendered per instance (few objects move). */
  moving?: (lod: Lod, variant: number) => Moving[];
};
export type Moving = { pivot: V3; axis: "x" | "y" | "z"; parts: Part[]; motion: (t: number, seed: number) => number; parent?: number };
export const DEFS = new Map<string, ObjDef>();
export const def = (d: Omit<ObjDef, "era" | "solid" | "place"> & Partial<Pick<ObjDef, "era" | "solid" | "place">>) => { const full: ObjDef = { era: [1850, 2100], solid: true, place: "ground", ...d }; DEFS.set(full.id, full); return full; };

// ---------------------------------------------------------------- geometry DSL (all positions are the part's CENTRE)
const seg = (lod: Lod, hi: number) => Math.max(4, Math.round(hi / (lod === 0 ? 1 : lod === 1 ? 2 : 3.2)));
const xf = (g: THREE.BufferGeometry, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale?: V3) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...(scale ?? [1, 1, 1]))); g.applyMatrix4(m); return g; };
export const G = {
  box: (w: number, h: number, d: number, at?: V3, rot?: V3) => xf(new THREE.BoxGeometry(w, h, d), at, rot),
  /** box resting on y=0 at (x, z) */
  boxOn: (w: number, h: number, d: number, x = 0, z = 0, y0 = 0, ry = 0) => xf(new THREE.BoxGeometry(w, h, d), [x, y0 + h / 2, z], [0, ry, 0]),
  cyl: (rt: number, rb: number, h: number, at?: V3, rot?: V3, lod: Lod = 0, n = 16) => xf(new THREE.CylinderGeometry(rt, rb, h, seg(lod, n), 1), at, rot),
  cone: (r: number, h: number, at?: V3, rot?: V3, lod: Lod = 0, n = 16) => xf(new THREE.ConeGeometry(r, h, seg(lod, n), 1), at, rot),
  sph: (r: number, at?: V3, lod: Lod = 0, n = 14, scale?: V3) => xf(new THREE.SphereGeometry(r, seg(lod, n), Math.max(3, Math.round(seg(lod, n) * 0.7))), at, [0, 0, 0], scale),
  tor: (R: number, r: number, at?: V3, rot?: V3, lod: Lod = 0, n = 18) => xf(new THREE.TorusGeometry(R, r, Math.max(3, seg(lod, 8)), seg(lod, n)), at, rot),
  lathe: (pts: [number, number][], at?: V3, lod: Lod = 0, n = 18) => xf(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg(lod, n)), at),
  tube: (pts: V3[], r: number, lod: Lod = 0, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), closed), Math.max(4, pts.length * (lod === 0 ? 6 : 3)), r, seg(lod, 8), closed),
  plane: (w: number, h: number, at?: V3, rot?: V3) => xf(new THREE.PlaneGeometry(w, h), at, rot),
  /** extruded 2D outline (x, y) with depth d, centred on z */
  extrude: (outline: [number, number][], d: number, at?: V3, rot?: V3) => { const s = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y))); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return xf(g, at, rot); },
  /** a wheel (tyre + hub) with its axis along x, resting so its bottom touches y=0 */
  wheel: (r: number, w: number, x: number, z: number, lod: Lod = 0): Part[] => [{ g: xf(new THREE.CylinderGeometry(r, r, w, seg(lod, 18)), [x, r, z], [0, 0, Math.PI / 2]), s: "rubber", tag: "wheel" }, { g: xf(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w * 1.04, seg(lod, 10)), [x, r, z], [0, 0, Math.PI / 2]), s: "metal", tint: "#9a9ea2", tag: "wheel" },
    // hub bolts make rolling visible
    ...(lod === 0 ? [0, 1, 2, 3, 4].map((i): Part => ({ g: xf(new THREE.BoxGeometry(w * 1.1, r * 0.08, r * 0.08), [x, r + Math.cos(i * 1.2566) * r * 0.32, z + Math.sin(i * 1.2566) * r * 0.32]), s: "metal", tint: "#3a3a3a", tag: "wheel" })) : [])],
};
export const part = (g: THREE.BufferGeometry, s: Surface, tint?: string, extra: Partial<Part> = {}): Part => ({ g, s, tint, ...extra });
/** merge an object's parts into one geometry per material key (surface + tint + emission) */
export const matKey = (p: Part) => `${p.s}|${p.tint ?? ""}|${p.em ?? ""}|${p.emI ?? ""}`;
export const mergeByMaterial = (parts: Part[]) => {
  const groups = new Map<string, { proto: Part; geos: THREE.BufferGeometry[] }>();
  for (const p of parts) { const k = matKey(p); let gr = groups.get(k); if (!gr) { gr = { proto: p, geos: [] }; groups.set(k, gr); }
    let g = p.g.index ? p.g.toNonIndexed() : p.g; if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2)); if (!g.attributes.normal) g.computeVertexNormals();
    for (const a of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(a)) g.deleteAttribute(a); gr.geos.push(g); }
  return [...groups.values()].map((gr) => ({ proto: gr.proto, geo: mergeGeometries(gr.geos, false)! }));
};
export const triCount = (parts: Part[]) => parts.reduce((s, p) => s + (p.g.index ? p.g.index.count : p.g.attributes.position.count) / 3, 0);
/** seeded variant helper: pick from a list by variant index */
export const pick = <T,>(list: T[], v: number) => list[((v % list.length) + list.length) % list.length];
