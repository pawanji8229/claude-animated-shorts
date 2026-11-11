// short3 geometry kit: build detailed static models from many small parts, then MERGE them per material (one draw call
// per material, one ink hull each). Every part gets UVs in METRES, offset by its own position, so textures keep true
// scale and brick courses run on continuously from pier to spandrel to lintel (no seams, no stretched textures).
// Rule against z-fighting: parts that touch must differ in depth by >= 1 cm (use the `proud` helpers), never coplanar.
import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Ink } from "../../inventor/Workshop";
import { V3 } from "../../lib/math";

type Opt = { ink?: number | false; cast?: boolean; receive?: boolean };
const E = new THREE.Euler(), Q = new THREE.Quaternion(), M = new THREE.Matrix4(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();

/** BoxGeometry with metre UVs (per face: u along the face's width, v along its height), offset by world position */
export const boxGeo = (w: number, h: number, d: number, off: V3 = [0, 0, 0]) => {
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv as THREE.BufferAttribute;
  // face order: +x, -x, +y, -y, +z, -z (4 verts each)
  const dims: [number, number, number, number][] = [[d, h, -off[2], off[1]], [d, h, off[2], off[1]], [w, d, off[0], -off[2]], [w, d, off[0], off[2]], [w, h, off[0], off[1]], [w, h, -off[0], off[1]]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] + dims[f][2] - dims[f][0] / 2, uv.getY(i) * dims[f][1] + dims[f][3] - dims[f][1] / 2); }
  return g;
};
export const cylGeo = (rt: number, rb: number, h: number, seg = 16, open = false) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); const uv = g.attributes.uv as THREE.BufferAttribute; const c = Math.PI * 2 * Math.max(rt, rb);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * c, uv.getY(i) * h); return g;
};

export class Kit {
  private parts = new Map<string, { mat: THREE.Material; opt: Opt; geos: THREE.BufferGeometry[] }>();
  add(mat: THREE.Material, g: THREE.BufferGeometry, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 = [1, 1, 1], opt: Opt = {}) {
    const geo = (g.index ? g.toNonIndexed() : g.clone());
    for (const name of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(name)) geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    M.compose(P.set(...p), Q.setFromEuler(E.set(r[0], r[1], r[2])), S.set(...s)); geo.applyMatrix4(M);
    const key = `${mat.uuid}|${opt.ink ?? 0.7}|${opt.cast ?? true}|${opt.receive ?? true}`;
    let e = this.parts.get(key); if (!e) { e = { mat, opt, geos: [] }; this.parts.set(key, e); } e.geos.push(geo); return this;
  }
  /** box of size s centred at p (UVs in metres, continuous across neighbouring boxes on the same plane) */
  box(mat: THREE.Material, s: V3, p: V3, r: V3 = [0, 0, 0], opt: Opt = {}) { return this.add(mat, boxGeo(s[0], s[1], s[2], r[0] || r[1] || r[2] ? [0, 0, 0] : p), p, r, [1, 1, 1], opt); }
  /** box given by its min/max corners */
  span(mat: THREE.Material, a: V3, b: V3, opt: Opt = {}) { const s: V3 = [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])]; return this.box(mat, s, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [0, 0, 0], opt); }
  cyl(mat: THREE.Material, rt: number, rb: number, h: number, p: V3, r: V3 = [0, 0, 0], seg = 16, opt: Opt = {}) { return this.add(mat, cylGeo(rt, rb, h, seg), p, r, [1, 1, 1], opt); }
  /** rod between two points */
  rod(mat: THREE.Material, a: V3, b: V3, rad: number, seg = 8, opt: Opt = {}) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length(); if (L < 1e-5) return this;
    const g = cylGeo(rad, rad, L, seg); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    const mid = A.add(B).multiplyScalar(0.5); g.applyQuaternion(q); return this.add(mat, g, [mid.x, mid.y, mid.z], [0, 0, 0], [1, 1, 1], opt);
  }
  /** extruded 2D profile (x,y) along z with depth, metre UVs (three's default world UV generator) */
  ext(mat: THREE.Material, pts: [number, number][], depth: number, p: V3, r: V3 = [0, 0, 0], bevel = 0, opt: Opt = {}, holes: [number, number][][] = []) {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))); for (const h of holes) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 12 }); g.translate(0, 0, -depth / 2);
    return this.add(mat, g, p, r, [1, 1, 1], opt);
  }
  /** lathe (profile in x=radius, y=height) around y */
  lathe(mat: THREE.Material, prof: [number, number][], p: V3, seg = 20, r: V3 = [0, 0, 0], opt: Opt = {}) {
    const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), seg); const uv = g.attributes.uv as THREE.BufferAttribute; const R = Math.max(...prof.map((q) => q[0])), H = Math.max(...prof.map((q) => q[1])) - Math.min(...prof.map((q) => q[1]));
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * R, uv.getY(i) * H); return this.add(mat, g, p, r, [1, 1, 1], opt);
  }
  torus(mat: THREE.Material, R: number, rr: number, p: V3, r: V3 = [0, 0, 0], arc = Math.PI * 2, opt: Opt = {}) { return this.add(mat, new THREE.TorusGeometry(R, rr, 8, 24, arc), p, r, [1, 1, 1], opt); }
  sphere(mat: THREE.Material, rad: number, p: V3, s: V3 = [1, 1, 1], opt: Opt = {}) { return this.add(mat, new THREE.SphereGeometry(rad, 16, 12), p, [0, 0, 0], s, opt); }
  plane(mat: THREE.Material, w: number, h: number, p: V3, r: V3 = [0, 0, 0], opt: Opt & { uv01?: boolean } = {}) {
    const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv as THREE.BufferAttribute; if (!opt.uv01) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w + p[0], uv.getY(i) * h + p[1]);
    return this.add(mat, g, p, r, [1, 1, 1], { ink: false, ...opt });
  }
  /** append another kit transformed (instancing at build time) */
  merge(k: Kit, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 = [1, 1, 1]) { for (const e of k.parts.values()) for (const g of e.geos) this.add(e.mat, g, p, r, s, e.opt); return this; }
  private built: { geo: THREE.BufferGeometry; mat: THREE.Material; opt: Opt }[] | null = null;
  /** merged geometry per material (cached: every canvas that renders this kit shares the same buffers) */
  build() { return (this.built ??= [...this.parts.values()].map((e) => ({ geo: mergeGeometries(e.geos, false)!, mat: e.mat, opt: e.opt }))); }
}

/** render a built kit (memoise the kit with useMemo in the caller) */
/** build-once cache for static kits (shared by all canvases on the page) */
const KITS = new Map<string, unknown>();
export const once = <T,>(key: string, make: () => T): T => { if (!KITS.has(key)) KITS.set(key, make()); return KITS.get(key) as T; };
export const KitMesh: React.FC<{ kit: Kit; inkScale?: number }> = ({ kit, inkScale = 1 }) => {
  const parts = useMemo(() => kit.build(), [kit]);
  return <>{parts.map((p, i) => <mesh key={i} geometry={p.geo} material={p.mat} castShadow={p.opt.cast ?? true} receiveShadow={p.opt.receive ?? true}>
    {p.opt.ink !== false && <Ink k={(p.opt.ink ?? 0.7) * inkScale} />}
  </mesh>)}</>;
};

/** z-fighting audit: finds faces of DIFFERENT parts that lie in the same axis-aligned plane, face the same way (not
 *  undersides) and truly overlap (triangle-triangle SAT test) -> both visible at the same depth -> flicker. */
export const auditCoplanar = (kit: Kit, minArea = 4e-4, opts: { skip?: (ax: number, sgn: number, plane: number) => boolean } = {}) => {
  type Tri = { pid: number; p: [number, number][]; a0: number; a1: number; b0: number; b1: number };
  const groups = new Map<string, Tri[]>(); let pid = 0;
  const parts = (kit as unknown as { parts: Map<string, { geos: THREE.BufferGeometry[] }> }).parts;
  for (const e of parts.values()) for (const g of e.geos) { pid++;
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i += 3) {
      const A = new THREE.Vector3().fromBufferAttribute(pos, i), B = new THREE.Vector3().fromBufferAttribute(pos, i + 1), C = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
      const n = B.clone().sub(A).cross(C.clone().sub(A)); const len = n.length(); if (len < 1e-9) continue; n.divideScalar(len);
      const ax = Math.abs(n.x) > 0.999 ? 0 : Math.abs(n.y) > 0.999 ? 1 : Math.abs(n.z) > 0.999 ? 2 : -1; if (ax < 0) continue;
      const sgn = Math.sign([n.x, n.y, n.z][ax]); if (ax === 1 && sgn < 0) continue;            // undersides are never seen
      if (opts.skip?.(ax, sgn, [A.x, A.y, A.z][ax])) continue;
      const pl = Math.round([A.x, A.y, A.z][ax] * 1000) / 1000, u = (ax + 1) % 3, v = (ax + 2) % 3;
      const p = [A, B, C].map((q) => { const c = [q.x, q.y, q.z]; return [c[u], c[v]] as [number, number]; });
      const t: Tri = { pid, p, a0: Math.min(p[0][0], p[1][0], p[2][0]), a1: Math.max(p[0][0], p[1][0], p[2][0]), b0: Math.min(p[0][1], p[1][1], p[2][1]), b1: Math.max(p[0][1], p[1][1], p[2][1]) };
      const key = `${ax}|${sgn}|${pl}`; (groups.get(key) ?? groups.set(key, []).get(key)!).push(t);
    } }
  const sep = (P: [number, number][], Q: [number, number][]) => { for (const S of [P, Q]) for (let i = 0; i < 3; i++) { const a = S[i], b = S[(i + 1) % 3], nx = b[1] - a[1], ny = a[0] - b[0];
    const pr = (T: [number, number][]) => T.map((q) => q[0] * nx + q[1] * ny); const x = pr(P), y = pr(Q); if (Math.max(...x) <= Math.min(...y) + 1e-4 || Math.max(...y) <= Math.min(...x) + 1e-4) return true; } return false; };
  const hits: { plane: string; area: number; at: [number, number] }[] = [];
  for (const [g, ts] of groups) { ts.sort((p, q) => p.a0 - q.a0);
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length && ts[j].a0 < ts[i].a1; j++) { const p = ts[i], q = ts[j]; if (p.pid === q.pid) continue;
      const w = Math.min(p.a1, q.a1) - Math.max(p.a0, q.a0), h = Math.min(p.b1, q.b1) - Math.max(p.b0, q.b0);
      if (w > 0.004 && h > 0.004 && w * h > minArea && !sep(p.p, q.p)) { const [ax, sg, pl] = g.split("|"); hits.push({ plane: `${"xyz"[+ax]}${sg === "1" ? "+" : "-"}=${pl}`, area: +(w * h).toFixed(4), at: [+(Math.max(p.a0, q.a0)).toFixed(2), +(Math.max(p.b0, q.b0)).toFixed(2)] }); } } }
  return hits.sort((a, b) => b.area - a.area);
};
