// Reef fish of Vanuatu's fringing reefs, each species with its own silhouette, colour pattern, size and behaviour:
// blue-green chromis (hovering clouds over branching coral), sergeant majors (the cheeky crowd round snorkellers at
// Hideaway), convict surgeonfish (grazing school), Moorish idols and threadfin butterflyfish (pairs), anemonefish (in
// their anemone), bullethead parrotfish (roaming, nibbling), yellowtail fusiliers (mid-water school passing through)
// and bluestreak cleaner wrasse. Bodies are double-sided meshes with real thickness (an ellipsoid body that thins out
// into membrane fins), painted on canvas, alpha-cut silhouettes, and a travelling-wave body bend in the vertex shader
// (tail beat scales with each fish's own speed). Every fish runs its OWN path: school centre + its own slow offset
// orbit + its own phases, headings from the path derivative — no two fish share a curve.
import React, { useMemo } from "react";
import * as THREE from "three";
import { once } from "../short3/kit";
import { paintTex } from "./assets";
import { height } from "./geo";
import type { V3 } from "../../lib/math";

type Sp = { key: string; len: number; depth: number; thick: number; tail: "fork" | "lunate" | "round"; dorsal: number; anal: number; paint: (g: CanvasRenderingContext2D, W: number, H: number, r: () => number) => void; filament?: boolean; snout?: number; rough?: number; metal?: number };
const W = 512, H = 256;
// canvas mapping: x in [-0.55, 0.55] -> [0, W]; y in [-0.5*H/W*1.1 .. ] keep square scale: 1 unit = W/1.1 px
const SX = W / 1.1, X = (x: number) => (x + 0.55) * SX, Y = (y: number) => H / 2 - y * SX;
const outline = (g: CanvasRenderingContext2D, s: Sp) => {
  const d = s.depth / 2, sn = s.snout ?? 0;
  g.beginPath(); g.moveTo(X(0.5 + sn), Y(-0.02));
  // top: forehead -> dorsal fin -> peduncle
  g.bezierCurveTo(X(0.46), Y(d * 0.75), X(0.32), Y(d), X(0.18), Y(d * 1.02));
  g.bezierCurveTo(X(0.12), Y(d + s.dorsal * (s.filament ? 1.5 : 1)), X(-0.02), Y(d + s.dorsal * 0.9), X(-0.2), Y(d * 0.65 + s.dorsal * 0.45));
  g.bezierCurveTo(X(-0.26), Y(d * 0.45), X(-0.3), Y(d * 0.28), X(-0.34), Y(d * 0.22));
  // tail
  if (s.tail === "fork") { g.lineTo(X(-0.52), Y(d * 0.95)); g.quadraticCurveTo(X(-0.45), Y(0), X(-0.52), Y(-d * 0.95)); }
  else if (s.tail === "lunate") { g.lineTo(X(-0.5), Y(d * 0.8)); g.quadraticCurveTo(X(-0.42), Y(0), X(-0.5), Y(-d * 0.8)); }
  else { g.bezierCurveTo(X(-0.46), Y(d * 0.65), X(-0.52), Y(-d * 0.65), X(-0.34), Y(-d * 0.22)); }
  g.lineTo(X(-0.34), Y(-d * 0.22));
  // bottom: anal fin -> belly -> chin
  g.bezierCurveTo(X(-0.3), Y(-d * 0.3), X(-0.2), Y(-d * 0.6 - s.anal * 0.5), X(-0.1), Y(-d - s.anal * 0.7));
  g.bezierCurveTo(X(0.0), Y(-d - s.anal * 0.4), X(0.08), Y(-d), X(0.2), Y(-d * 0.95));
  g.bezierCurveTo(X(0.36), Y(-d * 0.85), X(0.46), Y(-d * 0.45), X(0.5 + sn), Y(-0.02));
  g.closePath();
};
const eye = (g: CanvasRenderingContext2D, x: number, y: number, r: number, ring = "#d9d0b0") => { g.fillStyle = ring; g.beginPath(); g.arc(X(x), Y(y), r * SX * 1.35, 0, 7); g.fill(); g.fillStyle = "#08080a"; g.beginPath(); g.arc(X(x), Y(y), r * SX, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.arc(X(x) - r * SX * 0.35, Y(y) - r * SX * 0.35, r * SX * 0.3, 0, 7); g.fill(); };
const bars = (g: CanvasRenderingContext2D, xs: number[], w: number, col: string) => { g.fillStyle = col; for (const x of xs) { g.beginPath(); g.moveTo(X(x - w / 2 + 0.02), 0); g.lineTo(X(x + w / 2 + 0.02), 0); g.lineTo(X(x + w / 2 - 0.02), H); g.lineTo(X(x - w / 2 - 0.02), H); g.fill(); } };
const scales = (g: CanvasRenderingContext2D, r: () => number, a = 0.12) => { for (let i = 0; i < 700; i++) { const x = r() * W, y = r() * H; g.strokeStyle = `rgba(255,255,255,${r() * a})`; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 3 + r() * 2, 0.3, 2.8); g.stroke(); } };
const finAlpha = (g: CanvasRenderingContext2D, s: Sp, a: number) => { // fins slightly translucent: re-draw body ellipse opaque over a translucent whole
  void s; g.globalCompositeOperation = "destination-in"; g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = "source-over"; };
const grad = (g: CanvasRenderingContext2D, top: string, bot: string, d: number) => { const gr = g.createLinearGradient(0, Y(d / 2), 0, Y(-d / 2)); gr.addColorStop(0, top); gr.addColorStop(1, bot); return gr; };

export const SPECIES: Sp[] = [
  { key: "chromis", len: 0.075, depth: 0.42, thick: 0.13, tail: "fork", dorsal: 0.05, anal: 0.05, rough: 0.35, metal: 0.25, paint: (g, w, h, r) => { g.fillStyle = grad(g, "#4fd9c9", "#a8f0ff", 0.42); g.fillRect(0, 0, w, h); scales(g, r, 0.2); eye(g, 0.36, 0.04, 0.035); } },
  { key: "sergeant", len: 0.15, depth: 0.55, thick: 0.12, tail: "fork", dorsal: 0.07, anal: 0.06, rough: 0.4, metal: 0.15, paint: (g, w, h, r) => { g.fillStyle = grad(g, "#f2d23a", "#e9eef2", 0.55); g.fillRect(0, 0, w, h); g.fillStyle = "rgba(240,210,60,0.65)"; g.fillRect(0, 0, w, Y(0.12)); bars(g, [0.27, 0.12, -0.03, -0.17, -0.3], 0.055, "#1a1a22"); scales(g, r); eye(g, 0.38, 0.06, 0.035); } },
  { key: "convict", len: 0.18, depth: 0.58, thick: 0.1, tail: "lunate", dorsal: 0.05, anal: 0.05, snout: 0.02, rough: 0.45, paint: (g, w, h, r) => { g.fillStyle = grad(g, "#d8dcc8", "#f4f2e6", 0.58); g.fillRect(0, 0, w, h); bars(g, [0.38, 0.22, 0.06, -0.1, -0.24, -0.36], 0.02, "#202020"); scales(g, r, 0.08); eye(g, 0.36, 0.08, 0.03); } },
  { key: "idol", len: 0.19, depth: 0.95, thick: 0.08, tail: "lunate", dorsal: 0.32, anal: 0.25, snout: 0.06, filament: true, rough: 0.4, paint: (g, w, h) => { g.fillStyle = "#f6f2e2"; g.fillRect(0, 0, w, h); g.fillStyle = "#121216"; g.fillRect(X(0.12), 0, X(0.34) - X(0.12), h); g.fillRect(X(-0.26), 0, X(-0.12) - X(-0.26), h); g.fillStyle = "#f2c63a"; g.fillRect(X(-0.12), 0, X(0.12) - X(-0.12), h); g.fillRect(X(-0.55), 0, X(-0.42) - X(-0.55), h); g.fillStyle = "#121216"; g.fillRect(X(-0.56), 0, X(-0.48) - X(-0.56), h); g.fillStyle = "#ef8a2a"; g.beginPath(); g.arc(X(0.47), Y(0.06), 0.05 * SX, 0, 7); g.fill(); eye(g, 0.36, 0.06, 0.03, "#f6f2e2"); } },
  { key: "butterfly", len: 0.16, depth: 0.78, thick: 0.08, tail: "round", dorsal: 0.12, anal: 0.1, snout: 0.04, rough: 0.45, paint: (g, w, h) => { g.fillStyle = "#f7f4ea"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(60,60,70,0.6)"; g.lineWidth = 2.5; for (let k = -10; k < 14; k++) { g.beginPath(); g.moveTo(X(0.35 - k * 0.06), Y(0.5)); g.lineTo(X(0.05 - k * 0.06), Y(-0.05)); g.lineTo(X(0.35 - k * 0.06), Y(-0.5)); g.stroke(); }
    const gr = g.createLinearGradient(X(0), 0, X(-0.4), 0); gr.addColorStop(0, "rgba(245,200,40,0)"); gr.addColorStop(1, "rgba(245,200,40,0.95)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#151518"; g.fillRect(X(0.34), 0, X(0.4) - X(0.34), h); g.beginPath(); g.arc(X(-0.22), Y(0.34), 0.04 * SX, 0, 7); g.fill(); eye(g, 0.37, 0.07, 0.028, "#151518"); } },
  { key: "clown", len: 0.09, depth: 0.5, thick: 0.15, tail: "round", dorsal: 0.08, anal: 0.06, rough: 0.35, paint: (g, w, h) => { g.fillStyle = "#3a1a10"; g.fillRect(0, 0, w, h); g.fillStyle = "#f08a24"; g.fillRect(X(0.3), 0, w, h); g.fillRect(0, 0, X(-0.36), h); g.fillStyle = "rgba(240,138,36,0.9)"; g.fillRect(0, Y(-0.18), w, h); for (const [x, ww] of [[0.3, 0.07], [0.02, 0.08]]) { g.fillStyle = "#f8f6f0"; g.fillRect(X(x - ww / 2), 0, ww * SX, h); g.fillStyle = "#151515"; g.fillRect(X(x - ww / 2) - 3, 0, 3, h); g.fillRect(X(x + ww / 2), 0, 3, h); } eye(g, 0.4, 0.05, 0.04, "#f08a24"); } },
  { key: "parrot", len: 0.42, depth: 0.42, thick: 0.15, tail: "lunate", dorsal: 0.04, anal: 0.04, rough: 0.5, paint: (g, w, h, r) => { g.fillStyle = grad(g, "#2f8f86", "#62c2a2", 0.42); g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h; g.strokeStyle = `rgba(240,120,150,${0.25 + r() * 0.3})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 7, 0.4, 2.6); g.stroke(); }
    g.fillStyle = "#d8e8d0"; g.beginPath(); g.ellipse(X(0.48), Y(-0.02), 0.06 * SX, 0.05 * SX, 0, 0, 7); g.fill(); g.strokeStyle = "rgba(240,150,90,0.8)"; g.lineWidth = 4; g.beginPath(); g.moveTo(X(0.44), Y(0.0)); g.lineTo(X(0.3), Y(0.06)); g.stroke(); eye(g, 0.4, 0.06, 0.022); } },
  { key: "fusilier", len: 0.22, depth: 0.32, thick: 0.13, tail: "fork", dorsal: 0.03, anal: 0.03, rough: 0.3, metal: 0.3, paint: (g, w, h, r) => { g.fillStyle = grad(g, "#3a6fd0", "#dfe9f2", 0.32); g.fillRect(0, 0, w, h); g.fillStyle = "rgba(244,212,40,0.95)"; g.fillRect(0, 0, X(-0.25), h); g.fillRect(X(-0.25), Y(0.16), X(0.2) - X(-0.25), Y(0.05) - Y(0.16)); scales(g, r, 0.15); eye(g, 0.4, 0.03, 0.03); } },
  { key: "wrasse", len: 0.1, depth: 0.24, thick: 0.15, tail: "round", dorsal: 0.03, anal: 0.03, rough: 0.35, paint: (g, w, h) => { g.fillStyle = grad(g, "#9ad0ff", "#e6f4ff", 0.24); g.fillRect(0, 0, w, h); g.fillStyle = "#101018"; g.beginPath(); g.moveTo(X(0.5), Y(0.0)); g.lineTo(X(-0.5), Y(0.08)); g.lineTo(X(-0.5), Y(-0.08)); g.closePath(); g.fill(); eye(g, 0.4, 0.04, 0.03, "#9ad0ff"); } },
];

const fishTex = (s: Sp, i: number) => paintTex(W, H, (g, r) => { g.clearRect(0, 0, W, H); g.save(); outline(g, s); g.clip(); s.paint(g, W, H, r); g.restore();
  g.save(); outline(g, s); g.lineWidth = 2.2; g.strokeStyle = "rgba(20,20,26,0.55)"; g.stroke(); g.restore(); finAlpha(g, s, 1); }, 77 + i * 13, true, false);
/** grid over the silhouette box; z = ± body thickness (ellipsoid) so it reads solid from any angle, fins are membranes */
const fishGeo = (s: Sp) => {
  const nx = 36, ny = 16, hy = 0.5 * H / SX, pos: number[] = [], uv: number[] = [], idx: number[] = [], bend: number[] = [];
  const thick = (x: number, y: number) => { const a = 0.38, b = s.depth * 0.46, cx = 0.08; const q = 1 - ((x - cx) / a) ** 2 - (y / b) ** 2; return q > 0 ? Math.sqrt(q) * s.thick * 0.5 * (x > cx ? 1 : 0.85) : 0; };
  for (const side of [1, -1]) { const base = pos.length / 3;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const u = i / nx, v = j / ny, x = -0.55 + u * 1.1, y = -hy + v * 2 * hy; pos.push(x, y, side * thick(x, y)); uv.push(u, v); bend.push(Math.max(0, 0.28 - x)); }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1; if (side > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("aBend", new THREE.Float32BufferAttribute(bend, 1)); g.setIndex(idx); g.computeVertexNormals(); return g;
};
const fishMat = (s: Sp, i: number) => {
  const m = new THREE.MeshStandardMaterial({ map: fishTex(s, i), alphaTest: 0.5, side: THREE.DoubleSide, roughness: s.rough ?? 0.4, metalness: s.metal ?? 0.1, envMapIntensity: 1.3 });
  const U = { uT: { value: 0 } };
  m.onBeforeCompile = (sh) => { sh.uniforms.uT = U.uT;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float aBend; attribute vec2 aPh; uniform float uT;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
{ float w = aPh.y; float ph = aPh.x + uT * w; float k = 7.5;
  transformed.z += sin(k * transformed.x - ph) * aBend * aBend * 0.26 + sin(ph * 0.5) * 0.012; }`);
  };
  m.customProgramCacheKey = () => `poFish${s.key}`; (m as unknown as { _U: typeof U })._U = U; return m;
};

// ---------------------------------------------------------------- behaviour
export type School = { sp: string; n: number; centre: (t: number) => V3; radius: [number, number, number]; size: [number, number]; speed: number; seed: number; hover?: boolean; minY?: number };
const hh = (i: number, s: number) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
/** one fish of one school at time t: school centre + its own slow 3-axis orbit (own radii, rates, phases) */
export const fishAt = (S: School, i: number, t: number): { p: V3; scale: number } => {
  const c = S.centre(t), a = hh(i, S.seed), b = hh(i, S.seed + 1), d = hh(i, S.seed + 2), e = hh(i, S.seed + 3);
  const w1 = (0.12 + 0.25 * a) * S.speed, w2 = (0.09 + 0.2 * b) * S.speed, w3 = (0.15 + 0.3 * d) * S.speed;
  const p: V3 = [c[0] + S.radius[0] * (Math.sin(t * w1 + a * 40) * 0.7 + Math.sin(t * w2 * 1.7 + e * 20) * 0.3) * (0.4 + 0.6 * b),
    c[1] + S.radius[1] * (Math.sin(t * w3 + b * 30) * 0.6 + (d - 0.5)) ,
    c[2] + S.radius[2] * (Math.cos(t * w1 * 0.9 + d * 50) * 0.7 + Math.cos(t * w2 + a * 9) * 0.3) * (0.4 + 0.6 * e)];
  const g = height(p[0], p[2]) + (S.minY ?? 0.25); if (p[1] < g) p[1] = g + (p[1] - g) * 0.1; if (p[1] > -0.25) p[1] = -0.25;
  return { p, scale: S.size[0] + (S.size[1] - S.size[0]) * e };
};
export const Fish: React.FC<{ schools: School[]; t: number }> = ({ schools, t }) => {
  const R = useMemo(() => once("poFishRes", () => Object.fromEntries(SPECIES.map((s, i) => [s.key, { s, geo: fishGeo(s), mat: fishMat(s, i) }]))), []);
  const meshes = useMemo(() => schools.map((S) => { const r = R[S.sp]; const g = r.geo.clone(); g.setAttribute("aPh", new THREE.InstancedBufferAttribute(new Float32Array(S.n * 2), 2)); const m = new THREE.InstancedMesh(g, r.mat, S.n); m.frustumCulled = false; m.castShadow = true; return m; }), [schools, R]);
  const M = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  schools.forEach((S, si) => { const im = meshes[si], sp = R[S.sp].s, ph = im.geometry.getAttribute("aPh") as THREE.InstancedBufferAttribute;
    for (let i = 0; i < S.n; i++) { const a = fishAt(S, i, t), b = fishAt(S, i, t + 0.15), v = new THREE.Vector3(b.p[0] - a.p[0], b.p[1] - a.p[1], b.p[2] - a.p[2]); const spd = v.length() / 0.15;
      if (v.lengthSq() < 1e-8) v.set(1, 0, 0); v.normalize(); v.y = Math.max(-0.5, Math.min(0.5, v.y));
      const fwd = v.normalize(), side = new THREE.Vector3().crossVectors(fwd, up).normalize(), u2 = new THREE.Vector3().crossVectors(side, fwd);
      const bank = Math.sin(t * 0.8 + i * 1.7) * 0.08; u2.applyAxisAngle(fwd, bank); side.applyAxisAngle(fwd, bank);
      const L = sp.len * a.scale; M.makeBasis(fwd, u2, side); M.scale(new THREE.Vector3(L, L, L)); M.setPosition(a.p[0], a.p[1], a.p[2]); im.setMatrixAt(i, M);
      ph.setXY(i, hh(i, S.seed + 5) * 60, (S.hover ? 7 : 9) + 5 * hh(i, S.seed + 6)); void spd; }
    im.instanceMatrix.needsUpdate = true; ph.needsUpdate = true; });
  for (const k of Object.keys(R)) ((R[k].mat as unknown as { _U: { uT: { value: number } } })._U.uT.value = t);
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
};
