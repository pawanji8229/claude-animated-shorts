// The reef round the post office: procedurally GROWN Indo-Pacific corals (not a repeated model) — staghorn & table
// Acropora, brain coral, massive Porites boulders, Turbinaria cups, gorgonian sea fans, leather + tree soft corals,
// magnificent anemones, giant clams, sponges, urchins, blue Linckia stars, sea cucumbers, conchs (CC0 scan), sea grass,
// and CC0 scanned rocks encrusted with coralline algae. Every species has several seeded variants; every colony gets
// its own scale / rotation / tint. Soft things (grass, fans, anemone tentacles, soft corals) sway with the surge.
import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { height, normalAt, PO, fbm } from "./geo";
import { model, paintTex } from "./assets";
import { once } from "../short3/kit";
import { rng, type V3 } from "../../lib/math";

type R = () => number;
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const C = (h: string) => new THREE.Color(h);
/** give a geometry vertex colours (fn of local position) + a sway weight (0 at the base) */
const finish = (g: THREE.BufferGeometry, col: (p: THREE.Vector3, i: number) => THREE.Color, sway: (p: THREE.Vector3) => number = () => 0, uvK = 1) => {
  g = g.index ? g.toNonIndexed() : g; const P = g.attributes.position as THREE.BufferAttribute, n = P.count; const c = new Float32Array(n * 3), s = new Float32Array(n), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) { p.fromBufferAttribute(P, i); const k = col(p, i); c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; s[i] = sway(p); }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3)); g.setAttribute("aSway", new THREE.BufferAttribute(s, 1));
  if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  else if (uvK !== 1) { const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uvK, uv.getY(i) * uvK); }
  return g;
};
const cyl = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, seg = 7, open = false) => {
  const d = b.clone().sub(a), L = d.length(); const g = new THREE.CylinderGeometry(r1, r0, L, seg, 1, open);
  const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * Math.max(r0, r1) / 0.045, uv.getY(i) * L / 0.045);   // polyp texture at true scale
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d.normalize())); const m = a.clone().add(b).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return g;
};
const ball = (p: THREE.Vector3, r: number, seg = 7) => { const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)); g.translate(p.x, p.y, p.z); return g; };
const merge = (gs: THREE.BufferGeometry[]) => { const m = mergeGeometries(gs.map((g) => { const h = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(h.attributes)) if (!["position", "normal", "uv"].includes(k)) h.deleteAttribute(k); if (!h.attributes.uv) h.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(h.attributes.position.count * 2), 2)); if (!h.attributes.normal) h.computeVertexNormals(); return h; }), false)!; m.computeBoundingSphere(); return m; };
const lerpC = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, Math.min(1, Math.max(0, t)));

// ---------------------------------------------------------------- species generators (local space, base at y = 0)
/** staghorn / bushy Acropora: recursive tapering branches, pale growing tips */
const acropora = (r: R, base: string, tip: string, bushy: boolean) => {
  const gs: THREE.BufferGeometry[] = []; const tips: THREE.Vector3[] = []; const cs: THREE.BufferGeometry[] = [], anchors: THREE.Vector3[] = [];
  const grow = (p: THREE.Vector3, dir: THREE.Vector3, rad: number, depth: number) => {
    const len = (bushy ? 0.05 : 0.075) + r() * (bushy ? 0.04 : 0.06); const q = p.clone().add(dir.clone().multiplyScalar(len)); const r1 = rad * (bushy ? 0.9 : 0.88);
    gs.push(cyl(p, q, rad, r1, 8, true));   // joints/tips are covered by the next branch or the tip ball: no caps
    // radial corallites: tiny tubular cups along the branch (the bumpy texture that makes Acropora read as coral)
    const side = new THREE.Vector3().crossVectors(dir, v3(0.3, 0.1, 0.9)).normalize(), up2 = new THREE.Vector3().crossVectors(dir, side).normalize();
    for (let c = 0; c < 4; c++) { const u = (c + r() * 0.7) / 4, ang = r() * Math.PI * 2, at = p.clone().lerp(q, u), o = side.clone().multiplyScalar(Math.cos(ang)).addScaledVector(up2, Math.sin(ang)), rr = rad + (r1 - rad) * u;
      const b0 = at.clone().addScaledVector(o, rr * 0.7), b1 = b0.clone().addScaledVector(o.clone().multiplyScalar(0.8).addScaledVector(dir, 0.6).normalize(), rr * 0.75 + 0.004); { const cg = cyl(b0, b1, rr * 0.42, rr * 0.3, 5, true); cs.push(cg); anchors.push(b0.clone().addScaledVector(o, -rr * 0.2)); } }   // (open tube = the corallite cup)
    if (depth <= 0 || r1 < 0.0055) { gs.push(ball(q, r1 * 1.15, 6)); tips.push(q); return; }
    const nb = r() < (bushy ? 0.42 : 0.24) ? 2 : 1;
    for (let b = 0; b < nb; b++) { const nd = dir.clone().add(v3((r() - 0.5) * (b ? 1.1 : 0.45), (r() - 0.25) * 0.35, (r() - 0.5) * (b ? 1.1 : 0.45))).normalize(); if (nd.y < 0.05) nd.y = 0.05 + r() * 0.2; grow(q, nd.normalize(), b ? r1 * 0.85 : r1, depth - 1); }
  };
  const n = bushy ? 9 + Math.floor(r() * 5) : 6 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, e = 0.35 + r() * 0.75; grow(v3(Math.cos(a) * 0.05 * r(), 0, Math.sin(a) * 0.05 * r()), v3(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)), 0.016 + r() * 0.006, bushy ? 9 : 9); }
  const B = C(base), T = C(tip), maxY = Math.max(...tips.map((t) => t.y), 0.2);
  const tipSet = tips.slice(0, 160); const colour = (p: THREE.Vector3) => { let near = 1e9; for (const t of tipSet) near = Math.min(near, t.distanceToSquared(p)); return lerpC(lerpC(B.clone().multiplyScalar(0.55), B, p.y / maxY), T, 1 - Math.min(1, near / 0.0016)).multiplyScalar(0.85 + 0.3 * fbm(p.x * 25 + 3, p.z * 25 + p.y * 10)); };
  const main = finish(merge(gs), colour, (p) => p.y * 0.15);
  // corallites: their own geometry so they can shrink into the branch with distance (no popping, ~70% fewer triangles far away)
  const cor = finish(merge(cs), colour, (p) => p.y * 0.15); const an = new Float32Array(cor.attributes.position.count * 3); let q = 0;
  cs.forEach((g, ci) => { const n = g.index ? g.index.count : g.attributes.position.count; for (let v = 0; v < n; v++, q++) { an[q * 3] = anchors[ci].x; an[q * 3 + 1] = anchors[ci].y; an[q * 3 + 2] = anchors[ci].z; } });
  cor.setAttribute("aAnchor", new THREE.BufferAttribute(an, 3)); cor.computeBoundingSphere(); main.userData.cor = cor; return main;
};
/** table Acropora: a wide, slightly dished plate with a ragged rim on a short stalk */
const table = (r: R, top: string, rim: string) => {
  const R0 = 0.45 + r() * 0.35, rings = 14, secs = 64, pos: number[] = [], idx: number[] = []; const wob = Array.from({ length: 7 }, () => r() * Math.PI * 2);
  const rad = (a: number) => R0 * (1 + 0.12 * Math.sin(a * 3 + wob[0]) + 0.07 * Math.sin(a * 5 + wob[1]) + 0.04 * Math.sin(a * 11 + wob[2]));
  const H = 0.32 + r() * 0.2;
  for (let s = 0; s <= 1; s++) for (let i = 0; i <= rings; i++) for (let j = 0; j < secs; j++) { const a = (j / secs) * Math.PI * 2, u = i / rings, rr = rad(a) * u;
    pos.push(Math.cos(a) * rr, H + u * u * 0.09 - (s ? 0.035 * (1 - u * 0.6) : 0) + 0.012 * Math.sin(a * 17 + u * 9), Math.sin(a) * rr); }
  const V = (s: number, i: number, j: number) => s * (rings + 1) * secs + i * secs + (j % secs);
  for (let i = 0; i < rings; i++) for (let j = 0; j < secs; j++) { idx.push(V(0, i, j), V(0, i, j + 1), V(0, i + 1, j), V(0, i + 1, j), V(0, i, j + 1), V(0, i + 1, j + 1)); idx.push(V(1, i, j), V(1, i + 1, j), V(1, i, j + 1), V(1, i + 1, j), V(1, i + 1, j + 1), V(1, i, j + 1)); }
  for (let j = 0; j < secs; j++) idx.push(V(0, rings, j), V(0, rings, j + 1), V(1, rings, j), V(1, rings, j), V(0, rings, j + 1), V(1, rings, j + 1));
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const stalk = cyl(v3(0, 0, 0), v3(0.02, H, 0), 0.09, 0.06, 9); const T = C(top), Rm = C(rim);
  return finish(merge([g, stalk]), (p) => { const u = Math.hypot(p.x, p.z) / R0; return p.y < H - 0.05 ? T.clone().multiplyScalar(0.45) : lerpC(T, Rm, (u - 0.75) * 4).multiplyScalar(0.85 + 0.25 * fbm(p.x * 20, p.z * 20)); });
};
/** brain coral: hemispherical dome with meandering ridges and dark valleys */
const brain = (r: R, ridge: string, valley: string) => {
  const R0 = 0.28 + r() * 0.3, g = new THREE.SphereGeometry(R0, 96, 48, 0, Math.PI * 2, 0, Math.PI * 0.55); const P = g.attributes.position as THREE.BufferAttribute, p = v3(0, 0, 0), sx = r() * 50, sz = r() * 50;
  const ridgeAt = (q: THREE.Vector3) => { const w = fbm(q.x * 7 + sx, q.z * 7 + sz + q.y * 5, 3) * 9 + fbm(q.y * 6 + sz, q.x * 6 + sx, 2) * 4; return Math.pow(Math.abs(Math.sin(w * Math.PI)), 0.6); };
  for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); const n = p.clone().normalize(); const k = ridgeAt(p); p.addScaledVector(n, 0.018 * k - 0.009); p.y *= 0.82; p.y -= R0 * 0.08; P.setXYZ(i, p.x, p.y, p.z); }
  g.computeVertexNormals(); const Rg = C(ridge), Vl = C(valley);
  return finish(g, (q) => lerpC(Vl, Rg, ridgeAt(q.clone().setY((q.y + R0 * 0.08) / 0.82))), () => 0, 14);
};
/** massive Porites: lumpy lobed boulder */
const porites = (r: R, col: string) => {
  const R0 = 0.35 + r() * 0.45, g = new THREE.SphereGeometry(R0, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.6); const P = g.attributes.position as THREE.BufferAttribute, p = v3(0, 0, 0), o = r() * 40;
  for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); const n = p.clone().normalize(); const k = fbm(n.x * 2.2 + o, n.z * 2.2 + n.y * 1.7 + o, 4); p.addScaledVector(n, (k - 0.5) * R0 * 0.55 + 0.02 * fbm(n.x * 14, n.z * 14)); p.y = p.y * 0.75 - R0 * 0.12; P.setXYZ(i, p.x, p.y, p.z); }
  g.computeVertexNormals(); const B = C(col);
  return finish(g, (q) => B.clone().multiplyScalar(0.7 + 0.45 * fbm(q.x * 6 + o, q.z * 6 + q.y * 4)).lerp(C("#6e6a4a"), q.y < 0.05 ? 0.5 : 0), () => 0, 22);
};
/** Turbinaria / cup coral: a spiralling wavy vase */
const cup = (r: R, col: string) => {
  const prof: THREE.Vector2[] = []; const Hh = 0.3 + r() * 0.25; for (let i = 0; i <= 14; i++) { const u = i / 14; prof.push(new THREE.Vector2(0.04 + u * u * (0.35 + r() * 0.05), u * Hh)); }
  const outer = new THREE.LatheGeometry(prof, 56); const P = outer.attributes.position as THREE.BufferAttribute, p = v3(0, 0, 0), w = r() * 6;
  for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); const a = Math.atan2(p.z, p.x), u = p.y / Hh; p.y += Math.sin(a * 4 + w) * 0.05 * u * u + Math.sin(a * 9) * 0.015 * u; P.setXYZ(i, p.x, p.y, p.z); }
  outer.computeVertexNormals(); const inner = outer.clone(); inner.scale(0.94, 1, 0.94); inner.translate(0, 0.015, 0); const ix = inner.index!.array as Uint16Array | Uint32Array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = t; } inner.computeVertexNormals();
  const B = C(col); return finish(merge([outer, inner]), (q) => B.clone().multiplyScalar(0.55 + 0.6 * (q.y / Hh)));
};
/** gorgonian sea fan: a flat fractal branch net in one plane */
const seaFan = (r: R, col: string) => {
  const gs: THREE.BufferGeometry[] = [];
  const grow = (p: THREE.Vector3, a: number, rad: number, d: number) => { const len = 0.07 + r() * 0.06, q = p.clone().add(v3(Math.cos(a) * len, Math.sin(a) * len, (r() - 0.5) * 0.01)); gs.push(cyl(p, q, rad, rad * 0.88, 4));
    if (d <= 0) return; grow(q, a + (r() - 0.5) * 0.35 - 0.22, rad * 0.86, d - 1); if (r() < 0.62) grow(q, a + 0.25 + r() * 0.45, rad * 0.8, d - 1); };
  gs.push(cyl(v3(0, 0, 0), v3(0, 0.12, 0), 0.03, 0.022, 6)); for (let i = 0; i < 5; i++) grow(v3(0, 0.12, 0), Math.PI / 2 + (i - 2) * 0.32, 0.016, 7);
  const B = C(col); return finish(merge(gs), (q) => B.clone().multiplyScalar(0.7 + 0.5 * Math.min(1, q.y / 0.8)), (q) => q.y * 0.5);
};
/** leather coral (Sarcophyton): stalk + ruffled mushroom cap; tree soft coral (Dendronephthya): pink puffs */
const leather = (r: R, col: string) => {
  const prof = [new THREE.Vector2(0.001, 0.0), new THREE.Vector2(0.09, 0.0), new THREE.Vector2(0.075, 0.12), new THREE.Vector2(0.09, 0.2), new THREE.Vector2(0.25, 0.25), new THREE.Vector2(0.3, 0.27), new THREE.Vector2(0.24, 0.3), new THREE.Vector2(0.001, 0.29)];
  const g = new THREE.LatheGeometry(prof, 64); const P = g.attributes.position as THREE.BufferAttribute, p = v3(0, 0, 0), w = r() * 6;
  for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); const a = Math.atan2(p.z, p.x), rr = Math.hypot(p.x, p.z); if (rr > 0.12) p.y += Math.sin(a * 7 + w) * 0.03 * (rr - 0.12) * 5; P.setXYZ(i, p.x, p.y, p.z); }
  g.computeVertexNormals(); const B = C(col); return finish(g, (q) => B.clone().multiplyScalar(q.y < 0.2 ? 0.7 : 1.0 + 0.15 * fbm(q.x * 30, q.z * 30)), (q) => Math.max(0, q.y - 0.15) * 0.6);
};
const dendro = (r: R, col: string) => {
  const gs: THREE.BufferGeometry[] = []; const trunk = 0.18 + r() * 0.1; gs.push(cyl(v3(0, 0, 0), v3(0, trunk, 0), 0.05, 0.035, 8));
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, e = r() * 0.9 + 0.2, L = 0.08 + r() * 0.14, s = v3(0, trunk * (0.4 + r() * 0.6), 0), q = s.clone().add(v3(Math.cos(a) * Math.cos(e) * L, Math.sin(e) * L, Math.sin(a) * Math.cos(e) * L));
    gs.push(cyl(s, q, 0.018, 0.012, 5)); for (let k = 0; k < 4; k++) gs.push(ball(q.clone().add(v3((r() - 0.5) * 0.06, (r() - 0.3) * 0.05, (r() - 0.5) * 0.06)), 0.022 + r() * 0.02, 6)); }
  const B = C(col); return finish(merge(gs), (q) => q.y < trunk * 0.5 ? C("#e8d4dc").multiplyScalar(0.8) : B.clone().multiplyScalar(0.8 + 0.4 * fbm(q.x * 20, q.y * 20)), (q) => q.y * 0.4);
};
/** magnificent anemone: purple column + a carpet of fat tentacles */
const anemone = (r: R, tent: string, column: string) => {
  const gs: THREE.BufferGeometry[] = [cyl(v3(0, 0, 0), v3(0, 0.08, 0), 0.2, 0.22, 20)]; const disc = new THREE.CylinderGeometry(0.22, 0.22, 0.02, 24); disc.translate(0, 0.085, 0); gs.push(disc);
  for (let i = 0; i < 170; i++) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.24, L = 0.07 + r() * 0.07, b = v3(Math.cos(a) * rr, 0.09, Math.sin(a) * rr), d = v3(Math.cos(a) * 0.5 * rr / 0.24, 1, Math.sin(a) * 0.5 * rr / 0.24).normalize();
    const q = b.clone().addScaledVector(d, L); gs.push(cyl(b, q, 0.011, 0.008, 5)); gs.push(ball(q, 0.009, 5)); }
  const T = C(tent), Cl = C(column); return finish(merge(gs), (q) => q.y < 0.085 ? Cl : lerpC(T.clone().multiplyScalar(0.8), C("#f3e6a8"), (q.y - 0.1) * 8), (q) => Math.max(0, q.y - 0.09) * 6);
};
/** giant clam: fluted shells + bright mottled mantle */
const clam = (r: R, mantle: string) => {
  const sh = new THREE.SphereGeometry(0.2, 40, 20, 0, Math.PI, 0, Math.PI / 2); const P = sh.attributes.position as THREE.BufferAttribute, p = v3(0, 0, 0);
  for (let i = 0; i < P.count; i++) { p.fromBufferAttribute(P, i); const a = Math.atan2(p.y, p.x); const rib = Math.pow(Math.abs(Math.sin(a * 3)), 0.5) * 0.025; p.x *= 1.4; p.y *= 0.9; p.z *= 0.85; p.addScaledVector(p.clone().normalize(), rib); P.setXYZ(i, p.x, p.y, p.z); }
  sh.computeVertexNormals(); const a2 = sh.clone(); a2.rotateY(Math.PI); const ma = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6); ma.scale(1, 1, 4); ma.rotateZ(Math.PI / 2); ma.translate(0, 0.17, 0);
  const g = merge([sh, a2, ma]); const M = C(mantle);
  return finish(g, (q) => Math.abs(q.z) < 0.05 && q.y > 0.12 ? M.clone().multiplyScalar(0.8 + 0.5 * (fbm(q.x * 40, q.y * 40) > 0.55 ? 1 : 0)) : C("#cbc3a8").multiplyScalar(0.75 + 0.25 * Math.abs(Math.sin(Math.atan2(q.y, q.x) * 6))));
};
const urchin = (r: R) => { const gs: THREE.BufferGeometry[] = [ball(v3(0, 0.05, 0), 0.06, 10)]; for (let i = 0; i < 46; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, d = v3(Math.sqrt(1 - u * u) * Math.cos(a), Math.abs(u) * 0.9 + 0.1, Math.sqrt(1 - u * u) * Math.sin(a)).normalize(); gs.push(cyl(v3(0, 0.05, 0).addScaledVector(d, 0.05), v3(0, 0.05, 0).addScaledVector(d, 0.2 + r() * 0.12), 0.006, 0.0008, 4)); }
  return finish(merge(gs), () => C("#120d16"), (q) => q.y * 0.3); };
const star = (r: R, col: string) => { const s = new THREE.Shape(); for (let i = 0; i <= 50; i++) { const a = (i / 50) * Math.PI * 2, k = Math.abs(Math.cos(a * 2.5)); const rr = 0.035 + 0.13 * Math.pow(k, 3) + r() * 0.004; if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 4 }); g.rotateX(-Math.PI / 2); g.translate(0, 0.012, 0); const B = C(col); return finish(g, () => B); };
const cucumber = () => { const g = new THREE.CapsuleGeometry(0.045, 0.28, 6, 10); g.rotateZ(Math.PI / 2); g.scale(1, 0.75, 1); g.translate(0, 0.035, 0); return finish(g, (q) => C("#2a1f18").multiplyScalar(0.8 + 0.4 * fbm(q.x * 50, q.z * 50))); };
const sponge = (r: R, col: string) => { const gs: THREE.BufferGeometry[] = []; const n = 2 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) { const h = 0.25 + r() * 0.35, rr = 0.05 + r() * 0.04, ox = (r() - 0.5) * 0.18, oz = (r() - 0.5) * 0.18; const t = new THREE.CylinderGeometry(rr * 1.15, rr, h, 14, 1, true); t.translate(ox, h / 2, oz); gs.push(t);
    const inn = new THREE.CylinderGeometry(rr * 0.95, rr * 0.8, h * 0.95, 14, 1, true); const ix = inn.index!.array as Uint16Array; for (let k = 0; k < ix.length; k += 3) { const tt = ix[k]; ix[k] = ix[k + 1]; ix[k + 1] = tt; } inn.computeVertexNormals(); inn.translate(ox, h / 2 + 0.02, oz); gs.push(inn); }
  const B = C(col); return finish(merge(gs), (q) => B.clone().multiplyScalar(0.6 + 0.5 * Math.min(1, q.y * 2.5))); };
const grassBlade = (r: R) => { const gs: THREE.BufferGeometry[] = []; for (let i = 0; i < 9; i++) { const h = 0.18 + r() * 0.28, w = 0.008 + r() * 0.005, pl = new THREE.PlaneGeometry(w, h, 1, 5); pl.translate((r() - 0.5) * 0.12, h / 2, (r() - 0.5) * 0.12);
    const P = pl.attributes.position as THREE.BufferAttribute; const lean = (r() - 0.5) * 0.4; for (let k = 0; k < P.count; k++) { const y = P.getY(k); P.setX(k, P.getX(k) + lean * y * y * 2); } pl.rotateY(r() * Math.PI); pl.computeVertexNormals(); gs.push(pl); }
  return finish(merge(gs), (q) => lerpC(C("#3e5a26"), C("#90a64e"), q.y * 3), (q) => q.y * q.y * 6); };

// ---------------------------------------------------------------- materials (vertex colour + polyp micro-detail + surge sway)
export const SURGE = { t: 0 };
const polypN = () => paintTex(256, 256, (g, r) => { g.fillStyle = "rgb(128,128,255)"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1300; i++) { const x = r() * 256, y = r() * 256, s = 1.5 + r() * 2.5; const gr = g.createRadialGradient(x - s * 0.4, y - s * 0.4, 0, x, y, s); gr.addColorStop(0, "rgb(96,96,255)"); gr.addColorStop(0.6, "rgb(150,150,255)"); gr.addColorStop(1, "rgba(128,128,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill(); } }, 7, false);
export const COR_FADE = [4.5, 8.5];
const swayMat = (rough = 0.82, amp = 0.05, side: THREE.Side = THREE.FrontSide, cor = false) => {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0, normalMap: polypN(), normalScale: new THREE.Vector2(1.0, 1.0), side });
  const U = { uT: { value: 0 } };
  m.onBeforeCompile = (sh) => { sh.uniforms.uT = U.uT;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aSway; uniform float uT;" + (cor ? "\nattribute vec3 aAnchor;" : ""))
      .replace("#include <begin_vertex>", `#include <begin_vertex>
${cor ? `{ vec4 wq = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  wq = instanceMatrix * wq;
#endif
  wq = modelMatrix * wq; float kc = 1.0 - smoothstep(${COR_FADE[0].toFixed(2)}, ${COR_FADE[1].toFixed(2)}, distance(wq.xyz, cameraPosition)); transformed = mix(aAnchor, transformed, kc); }
` : ""}{ vec3 ip = vec3(0.0);
#ifdef USE_INSTANCING
  ip = instanceMatrix[3].xyz;
#endif
  float ph = ip.x * 0.31 + ip.z * 0.23; float s = sin(uT * 1.15 + ph) * 0.7 + sin(uT * 2.3 + ph * 1.7) * 0.3;
  transformed.x += s * aSway * ${amp.toFixed(3)}; transformed.z += cos(uT * 0.9 + ph) * aSway * ${(amp * 0.6).toFixed(3)}; }`);
  };
  m.customProgramCacheKey = () => `poSway${rough}${amp}${side}${cor}`;
  (m as unknown as { _U: typeof U })._U = U; return m;
};

// ---------------------------------------------------------------- placement
type Kind = { key: string; make: (r: R, v: number) => THREE.BufferGeometry; variants: number; mat: () => THREE.Material };
const ACRO = [["#7d6644", "#e9dbb3", false], ["#5f5a70", "#9cc0ea", true], ["#7a5a6e", "#d9a6d6", false], ["#7a6a46", "#c8e09a", true], ["#866a46", "#f0e6c8", true]] as const;
const KINDS: Kind[] = [
  { key: "acro", variants: 10, make: (r, v) => { const a = ACRO[v % ACRO.length]; return acropora(r, a[0], a[1], a[2]); }, mat: () => swayMat(0.78, 0.004) },   // + corallite geometry in userData.cor
  { key: "table", variants: 4, make: (r, v) => table(r, ["#8f8558", "#7a8f62", "#9a7f6a", "#6f8a7e"][v], ["#e7dcae", "#cfe6a4", "#f0c8b8", "#b8e4d6"][v]), mat: () => swayMat(0.8, 0) },
  { key: "brain", variants: 4, make: (r, v) => brain(r, ["#c2ad6c", "#8fb36a", "#c79a6e", "#9db8a0"][v], ["#4f5a2e", "#2e4a2a", "#5a3a2a", "#3a4e54"][v]), mat: () => swayMat(0.75, 0) },
  { key: "porites", variants: 4, make: (r, v) => porites(r, ["#c4ae84", "#a597b8", "#b3925e", "#9fae86"][v]), mat: () => swayMat(0.85, 0) },
  { key: "cup", variants: 3, make: (r, v) => cup(r, ["#c9b24a", "#9cae3e", "#c78f3a"][v]), mat: () => swayMat(0.8, 0, THREE.DoubleSide) },
  { key: "fan", variants: 4, make: (r, v) => seaFan(r, ["#c9432c", "#de7a2c", "#9a3f8e", "#d9b23a"][v]), mat: () => swayMat(0.8, 0.07) },
  { key: "leather", variants: 3, make: (r, v) => leather(r, ["#d8cfa0", "#b9c088", "#cdb6a0"][v]), mat: () => swayMat(0.9, 0.05) },
  { key: "dendro", variants: 3, make: (r, v) => dendro(r, ["#e2588c", "#ef7d3a", "#c94fd0"][v]), mat: () => swayMat(0.7, 0.06) },
  { key: "anemone", variants: 2, make: (r, v) => anemone(r, ["#cdb466", "#b9c98a"][v], ["#8a2f6a", "#a3342e"][v]), mat: () => swayMat(0.7, 0.05) },
  { key: "clam", variants: 3, make: (r, v) => clam(r, ["#2f6fd6", "#2fa58a", "#6a3fbf"][v]), mat: () => swayMat(0.45, 0) },
  { key: "urchin", variants: 2, make: (r) => urchin(r), mat: () => swayMat(0.5, 0.01) },
  { key: "star", variants: 2, make: (r, v) => star(r, ["#2f5fd8", "#e07a2a"][v]), mat: () => swayMat(0.7, 0) },
  { key: "cucumber", variants: 1, make: () => cucumber(), mat: () => swayMat(0.6, 0) },
  { key: "sponge", variants: 3, make: (r, v) => sponge(r, ["#c46a2a", "#8a4fa0", "#d1b24a"][v]), mat: () => swayMat(0.9, 0) },
  { key: "grass", variants: 4, make: (r) => grassBlade(r), mat: () => swayMat(0.7, 0.09, THREE.DoubleSide) },
];
type Inst = { kind: string; v: number; p: V3; s: number; ry: number; tilt?: [number, number]; tint?: number };
/** keep-clear zones (the action): the office pad, the counter approach, the swim lanes */
export const CLEAR: { x: number; z: number; r: number }[] = [{ x: PO.x, z: PO.z, r: 3.3 }, { x: PO.x + 1.0, z: PO.z + 4.2, r: 2.6 }, { x: PO.x - 2.6, z: PO.z + 2.6, r: 1.6 }];
const clear = (x: number, z: number, pad = 0) => CLEAR.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + pad);
/** patch reefs (bommies): rock core + a crowd of colonies; plus scattered colonies, sea-grass meadows, critters */
export const BOMMIES: { x: number; z: number; r: number }[] = [
  { x: 4.6, z: 3.2, r: 1.9 }, { x: -5.2, z: 4.4, r: 2.3 }, { x: 6.8, z: -3.4, r: 1.7 }, { x: -6.6, z: -2.4, r: 2.0 }, { x: 1.2, z: 9.5, r: 2.6 },
  { x: -3.4, z: 11.5, r: 2.2 }, { x: 9.5, z: 8.5, r: 2.4 }, { x: -11.5, z: 7.0, r: 2.8 }, { x: 13.5, z: 0.5, r: 2.6 }, { x: -13.0, z: -4.5, r: 2.4 },
  { x: 3.5, z: -9.5, r: 1.8 }, { x: -2.5, z: -12.5, r: 2.0 }, { x: 8.0, z: 15.0, r: 3.0 }, { x: -9.0, z: 16.5, r: 3.2 }, { x: 17.0, z: 11.0, r: 3.0 },
  { x: -18.0, z: 2.5, r: 3.0 }, { x: 19.0, z: -6.0, r: 2.6 }, { x: 0.5, z: 20.0, r: 3.4 }, { x: -16.0, z: 13.0, r: 2.6 }, { x: 13.0, z: 22.0, r: 3.0 },
  { x: -6.0, z: 25.0, r: 3.2 }, { x: 24.0, z: 4.0, r: 3.0 }, { x: -24.0, z: -1.0, r: 3.0 }, { x: 6.0, z: 30.0, r: 3.6 }, { x: -20.0, z: 22.0, r: 3.2 },
  { x: 27.0, z: 16.0, r: 3.4 }, { x: -28.0, z: 12.0, r: 3.2 }, { x: 11.0, z: -14.0, r: 2.0 }, { x: -10.0, z: -14.0, r: 2.0 }, { x: 22.0, z: 28.0, r: 3.6 },
  // framing bommies for the opening push-in + the swim-down lanes (left / right of the counter approach)
  { x: 5.8, z: 7.6, r: 1.5 }, { x: -3.9, z: 7.9, r: 1.6 }, { x: 8.6, z: 2.2, r: 1.4 }, { x: -8.8, z: 1.6, r: 1.6 }, { x: 3.2, z: -5.6, r: 1.4 }, { x: -3.6, z: -6.2, r: 1.5 },
  { x: 11.5, z: 5.0, r: 2.0 }, { x: -12.0, z: 3.5, r: 2.0 }, { x: 15.0, z: -10.0, r: 2.6 }, { x: -15.5, z: -9.0, r: 2.6 }, { x: 31.0, z: 2.0, r: 3.4 }, { x: -32.0, z: -6.0, r: 3.4 },
  { x: 16.0, z: 34.0, r: 4.0 }, { x: -14.0, z: 33.0, r: 4.0 }, { x: 34.0, z: 24.0, r: 3.8 }, { x: -34.0, z: 24.0, r: 3.8 }, { x: 2.0, z: 40.0, r: 4.2 },
];
const ROCKS = ["rock_07", "rock_09", "boulder_01"] as const;
export type RockInst = { m: (typeof ROCKS)[number]; p: V3; s: number; ry: number };
export const layout = () => once("poReefLayout", () => {
  const r = rng(20031126), L: Inst[] = [], rocks: RockInst[] = [];
  const put = (kind: string, v: number, x: number, z: number, s: number, sink = 0.02, tilt = 0.12) => { const y = height(x, z) - sink * s; const n = normalAt(x, z); L.push({ kind, v, p: [x, y, z], s, ry: r() * Math.PI * 2, tilt: [n[2] * 0.8 + (r() - 0.5) * tilt, -n[0] * 0.8 + (r() - 0.5) * tilt], tint: 0.85 + r() * 0.3 }); };
  const pick = (w: [string, number][]) => { const tot = w.reduce((a, b) => a + b[1], 0); let x = r() * tot; for (const [k, ww] of w) { x -= ww; if (x <= 0) return k; } return w[0][0]; };
  const VAR: Record<string, number> = Object.fromEntries(KINDS.map((k) => [k.key, k.variants]));
  for (const b of BOMMIES) {
    const nR = 2 + Math.floor(r() * 3); for (let i = 0; i < nR; i++) { const a = r() * Math.PI * 2, d = r() * b.r * 0.45; rocks.push({ m: ROCKS[Math.floor(r() * 3)], p: [b.x + Math.cos(a) * d, height(b.x, b.z) - 0.25, b.z + Math.sin(a) * d], s: b.r * (0.32 + r() * 0.25), ry: r() * Math.PI * 2 }); }
    const n = Math.round(b.r * b.r * 10);
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * b.r * 1.15, x = b.x + Math.cos(a) * d, z = b.z + Math.sin(a) * d; if (!clear(x, z, 0.2)) continue;
      const k = pick(d < b.r * 0.6 ? [["acro", 5], ["table", 2], ["brain", 2], ["porites", 2], ["fan", 1.2], ["dendro", 1], ["leather", 1], ["cup", 1]] : [["acro", 3], ["brain", 1.5], ["porites", 1.2], ["leather", 1], ["anemone", 0.35], ["clam", 0.5], ["sponge", 0.8], ["urchin", 0.8], ["cup", 1], ["dendro", 0.8], ["fan", 0.5]]);
      const raise = d < b.r * 0.6 ? b.r * 0.22 * (1 - d / (b.r * 0.6)) : 0;   // colonies stack up on the rock core
      const s = k === "acro" ? 0.8 + r() * 0.9 : k === "table" ? 0.8 + r() * 0.7 : k === "porites" ? 0.7 + r() * 0.8 : 0.75 + r() * 0.6;
      put(k, Math.floor(r() * VAR[k]), x, z, s, -raise / s, 0.25); }
  }
  // scattered colonies + critters on the sand, sea-grass meadows (denser towards the beach)
  for (let i = 0; i < 1100; i++) { const x = (r() - 0.5) * 80, z = -20 + r() * 66; if (!clear(x, z, 0.4)) continue; const k = pick([["acro", 2], ["brain", 1], ["porites", 1], ["star", 1.2], ["cucumber", 1], ["urchin", 1], ["clam", 0.4], ["sponge", 0.5], ["leather", 0.5]]);
    put(k, Math.floor(r() * VAR[k]), x, z, (k === "acro" ? 0.5 : 0.6) + r() * 0.6); }
  for (let m = 0; m < 26; m++) { const cx = (r() - 0.5) * 80, cz = -40 + r() * 46, rad = 2 + r() * 5;
    for (let i = 0; i < rad * rad * 9; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (!clear(x, z, -0.6) || height(x, z) > -0.45) continue; put("grass", Math.floor(r() * 4), x, z, 0.8 + r() * 0.6, 0); } }
  // detail round the office pad: a few stars, a cucumber, grass tufts at the pad rim (not on the swim lanes)
  for (const [k, x, z, s] of [["star", 1.6, 2.2, 1.0], ["star", -2.4, -1.4, 0.9], ["cucumber", -1.8, 2.9, 1.0], ["urchin", 2.9, -1.2, 0.9], ["grass", 3.1, 0.2, 1.1], ["grass", -3.0, 0.9, 1.0], ["grass", -2.8, -2.4, 1.2], ["grass", 2.2, -2.9, 1.0]] as [string, number, number, number][])
    put(k, 0, PO.x + x, PO.z + z, s);
  return { L, rocks };
});

const kindGeos = () => once("poReefGeo", () => Object.fromEntries(KINDS.map((k) => [k.key, { mat: k.mat(), geos: Array.from({ length: k.variants }, (_, v) => k.make(rng(9000 + v * 131 + k.key.length * 7), v)) }])) as Record<string, { mat: THREE.Material; geos: THREE.BufferGeometry[] }>);
const rockMat = (base: THREE.MeshStandardMaterial) => { const m = base.clone(); m.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vRw; varying vec3 vRn;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvRw = (modelMatrix * vec4(transformed, 1.0)).xyz; vRn = normalize(mat3(modelMatrix) * objectNormal);");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vRw; varying vec3 vRn;\nfloat rh(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }")
    .replace("#include <map_fragment>", `#include <map_fragment>
{ float up = smoothstep(0.1, 0.8, vRn.y); float sp = rh(floor(vRw * 9.0)); float sp2 = rh(floor(vRw * 23.0) + 3.0);
  vec3 coralline = mix(vec3(0.62, 0.42, 0.52), vec3(0.55, 0.6, 0.38), step(0.5, rh(floor(vRw * 2.0))));
  diffuseColor.rgb = mix(diffuseColor.rgb * vec3(0.9, 0.93, 0.85), coralline, up * 0.55 + 0.15 * step(0.8, sp));
  diffuseColor.rgb *= 0.85 + 0.3 * sp2; }`); };
  m.customProgramCacheKey = () => `poRock${base.uuid}`; return m; };

export type View = { pos: V3; look: V3; fov: number; aspect: number; roll?: number; shadowAt: V3; shadowSize: number; pxH: number };
type Src = { im: THREE.InstancedMesh; M: THREE.Matrix4[]; col: THREE.Color[]; ctr: THREE.Vector3[]; rad: number[]; maxD?: number };
const _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _cam = new THREE.PerspectiveCamera(), _sp = new THREE.Sphere(), _sc = new THREE.Matrix4();
/** per-frame instance culling (pure function of the view): only colonies inside the view frustum or the sun's shadow box
 *  are drawn; colonies that are sub-pixel shrink smoothly to nothing (1.2..2.4 px) so nothing ever pops. */
export const cullInstances = (srcs: Src[], v: View | undefined) => {
  if (!v) { for (const s of srcs) { s.M.forEach((m, i) => s.im.setMatrixAt(i, m)); s.im.count = s.M.length; s.im.instanceMatrix.needsUpdate = true; } return; }
  const rolled = Math.abs(v.roll ?? 0) > 0.005; _cam.fov = rolled ? (2 * Math.atan(Math.tan((v.fov * Math.PI) / 360) * Math.hypot(1, v.aspect)) * 180) / Math.PI : v.fov; _cam.aspect = rolled ? 1 : v.aspect; _cam.near = 0.05; _cam.far = 20000; _cam.position.set(...v.pos); _cam.up.set(0, 1, 0); _cam.lookAt(...v.look); _cam.updateProjectionMatrix(); _cam.updateMatrixWorld();
  _pm.multiplyMatrices(_cam.projectionMatrix, _cam.matrixWorldInverse); _fr.setFromProjectionMatrix(_pm);
  const pxPerRad = v.pxH / (2 * Math.tan((v.fov * Math.PI) / 360)), S = v.shadowSize * 1.3 + 1.5;
  for (const s of srcs) { let n = 0;
    for (let i = 0; i < s.M.length; i++) { const c = s.ctr[i], r = s.rad[i]; _sp.set(c, r * 1.15 + 0.05);
      const inView = _fr.intersectsSphere(_sp), inShadow = Math.abs(c.x - v.shadowAt[0]) < S + r && Math.abs(c.z - v.shadowAt[2]) < S + r;
      if (!inView && !inShadow) continue;
      const d = Math.max(0.05, Math.hypot(c.x - v.pos[0], c.y - v.pos[1], c.z - v.pos[2]));
      if (s.maxD !== undefined && (d - r > s.maxD || !inView)) continue;
      const px = (2 * r * pxPerRad) / d; const k = inView ? Math.min(1, Math.max(0, (px - 1.2) / 1.2)) : 1;
      if (k <= 0) continue;
      if (k < 1) { _sc.makeScale(k, k, k); const m = s.M[i].clone().multiply(_sc); s.im.setMatrixAt(n, m); } else s.im.setMatrixAt(n, s.M[i]);
      if (s.im.instanceColor) s.im.setColorAt(n, s.col[i]); n++; }
    s.im.count = n; s.im.instanceMatrix.needsUpdate = true; if (s.im.instanceColor) s.im.instanceColor.needsUpdate = true; }
};
export const Reef: React.FC<{ t: number; near: V3; radius?: number; view?: View }> = ({ t, near, radius = 60, view }) => {
  const G = kindGeos(), lay = layout();
  const rocks = useMemo(() => once("poRockMeshes", () => Object.fromEntries(ROCKS.map((m) => [m, model(m).map((p) => ({ geo: p.geo, mat: rockMat(p.mat as THREE.MeshStandardMaterial), size: p.size }))]))), []);
  const srcs = useMemo(() => {
    const out: Src[] = [];
    const corMat = once("poCorMat", () => { const m = swayMat(0.78, 0.004, THREE.FrontSide, true); return m; });
    const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, Ms: THREE.Matrix4[], cols: THREE.Color[], maxD?: number) => { if (!geo.boundingSphere) geo.computeBoundingSphere(); const bs = geo.boundingSphere!;
      const im = new THREE.InstancedMesh(geo, mat, Ms.length); im.frustumCulled = false; im.castShadow = maxD === undefined; im.receiveShadow = true;
      const ctr = Ms.map((m) => bs.center.clone().applyMatrix4(m)), rad = Ms.map((m) => bs.radius * m.getMaxScaleOnAxis());
      if (cols.length) cols.forEach((c, i) => im.setColorAt(i, c)); out.push({ im, M: Ms, col: cols, ctr, rad, maxD }); };
    for (const k of KINDS) { const g = G[k.key]; g.geos.forEach((geo, v) => { const list = lay.L.filter((i) => i.kind === k.key && i.v === v); if (!list.length) return;
      const Ms = list.map((it) => new THREE.Matrix4().compose(new THREE.Vector3(...it.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(it.tilt?.[0] ?? 0, it.ry, it.tilt?.[1] ?? 0, "YXZ")), new THREE.Vector3(it.s, it.s, it.s)));
      const cols = list.map((it) => new THREE.Color().setScalar(it.tint ?? 1)); mk(geo, g.mat, Ms, cols);
      if (geo.userData.cor) mk(geo.userData.cor as THREE.BufferGeometry, corMat, Ms, cols, COR_FADE[1]); }); }
    for (const m of ROCKS) { const list = lay.rocks.filter((r) => r.m === m); if (!list.length) continue;
      for (const part of rocks[m]) { const Ms = list.map((it) => { const sc = it.s / Math.max(part.size.x, part.size.z); return new THREE.Matrix4().compose(new THREE.Vector3(...it.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.ry, 0)), new THREE.Vector3(sc, sc * 0.8, sc)); });
        mk(part.geo, part.mat, Ms, []); } }
    return out;
  }, [G, lay, rocks]);
  cullInstances(srcs, view);
  for (const k of KINDS) ((G[k.key].mat as unknown as { _U: { uT: { value: number } } })._U.uT.value = t);
  (once("poCorMat", () => swayMat(0.78, 0.004, THREE.FrontSide, true)) as unknown as { _U: { uT: { value: number } } })._U.uT.value = t;
  void near; void radius;
  return <>{srcs.map((s, i) => <primitive key={i} object={s.im} />)}</>;
};
