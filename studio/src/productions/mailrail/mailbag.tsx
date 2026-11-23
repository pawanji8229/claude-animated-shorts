// ORIGINAL MODEL: Post Office mailbag (c. 1930s): heavy canvas sack, slightly slumped body, neck cinched by a cord with a
// brass seal/label, stencilled "G.P.O." on the side. Geometry is a lathe with per-vertex slump + bulge noise (organic,
// not a cylinder); the canvas texture is drawn once (weave + seams + stencil + dirt) with a matching normal-ish bump.
// `bagGeo(v)` gives 3 shape variants; `BagRack` draws many bags instanced (one draw call per variant).
import React, { useMemo } from "react";
import * as THREE from "three";
import { once } from "../short3/kit";
import { rng, type V3 } from "../../lib/math";

const canvasTex = () => once("mrBagTex", () => { const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d")!, r = rng(77);
  g.fillStyle = "#b8a888"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) { g.fillStyle = `rgba(80,64,40,${0.05 + r() * 0.06})`; g.fillRect(0, y, 512, 1); }
  for (let x = 0; x < 512; x += 2) { g.fillStyle = `rgba(255,248,230,${0.03 + r() * 0.05})`; g.fillRect(x, 0, 1, 512); }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(60,48,30,${r() * 0.08})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 4 + r() * 30, 3 + r() * 14, r() * 3, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(70,55,35,0.55)"; g.lineWidth = 3; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(0, 470); g.lineTo(512, 470); g.stroke(); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.stroke(); g.setLineDash([]);
  g.font = "bold 74px Arial Black, Arial"; g.textAlign = "center"; g.fillStyle = "rgba(40,40,60,0.72)"; g.fillText("G.P.O.", 128, 300); g.font = "bold 28px Arial"; g.fillText("LONDON", 128, 340);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
export const bagMat = () => once("mrBagMat", () => new THREE.MeshStandardMaterial({ map: canvasTex(), bumpMap: canvasTex(), bumpScale: 0.6, roughness: 0.95 }));
const cordMat = () => once("mrCordMat", () => new THREE.MeshStandardMaterial({ color: "#5a4630", roughness: 0.9 }));
const brassMat = () => once("mrBrass", () => new THREE.MeshStandardMaterial({ color: "#c8a050", metalness: 0.85, roughness: 0.35 }));
/** bag geometry, base at y = 0, height ~0.62 m, radius ~0.2 m; v = variant 0..2 */
export const bagGeo = (v: number) => once(`mrBagGeo${v}`, () => { const r = rng(300 + v), H = 0.58 + v * 0.03;
  const prof: THREE.Vector2[] = []; const N = 18;
  for (let i = 0; i <= N; i++) { const t = i / N, y = t * H; let rad = t < 0.06 ? 0.2 * Math.sin((t / 0.06) * Math.PI / 2) : t < 0.72 ? 0.2 + 0.025 * Math.sin(t * 9 + v) : t < 0.86 ? 0.2 - (t - 0.72) / 0.14 * 0.15 : 0.05 + (t - 0.86) / 0.14 * 0.035;
    if (t > 0.97) rad *= (1 - t) / 0.03 * 0.6 + 0.0; prof.push(new THREE.Vector2(Math.max(0.004, rad), y)); }
  const g = new THREE.LatheGeometry(prof, 28), p = g.attributes.position; const ph = r() * 6;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), t = y / H;
    const bulge = 1 + 0.08 * Math.sin(a * 3 + ph) * Math.sin(Math.PI * Math.min(1, t * 1.3)) + 0.04 * Math.sin(a * 7 + ph * 2) * t;
    const slump = t < 0.7 ? 1 + 0.12 * (0.7 - t) : 1; p.setXYZ(i, x * bulge * slump * (1 + 0.15 * (v === 2 ? 1 : 0)), y * (1 - 0.06 * Math.sin(a + ph) * t), z * bulge * slump * 0.88); }
  g.computeVertexNormals(); return g; });
const neckGeo = () => once("mrNeck", () => new THREE.TorusGeometry(0.05, 0.012, 6, 16));
const labelGeo = () => once("mrLabel", () => new THREE.BoxGeometry(0.05, 0.035, 0.004));
export type BagPlace = { p: V3; ry?: number; tilt?: number; v?: number; s?: number };
const mtx = (b: BagPlace, local = new THREE.Matrix4()) => { const s = b.s ?? 1; return new THREE.Matrix4().compose(new THREE.Vector3(...b.p), new THREE.Quaternion().setFromEuler(new THREE.Euler(b.tilt ?? 0, b.ry ?? 0, (b.tilt ?? 0) * 0.6, "YXZ")), new THREE.Vector3(s, s, s)).multiply(local); };
/** many mailbags, instanced per shape variant (+ cords + brass labels) */
export const BagRack: React.FC<{ bags: BagPlace[] }> = ({ bags }) => {
  const meshes = useMemo(() => { const out: THREE.InstancedMesh[] = [];
    for (let v = 0; v < 3; v++) { const group = bags.filter((b) => (b.v ?? 0) % 3 === v); if (!group.length) continue; const H = 0.58 + v * 0.03;
      const body = new THREE.InstancedMesh(bagGeo(v), bagMat(), group.length), cord = new THREE.InstancedMesh(neckGeo(), cordMat(), group.length), lab = new THREE.InstancedMesh(labelGeo(), brassMat(), group.length);
      const cordL = new THREE.Matrix4().compose(new THREE.Vector3(0, H * 0.87, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1));
      const labL = new THREE.Matrix4().compose(new THREE.Vector3(0.055, H * 0.8, 0.02), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.4, 0.3)), new THREE.Vector3(1, 1, 1));
      group.forEach((b, i) => { body.setMatrixAt(i, mtx(b)); cord.setMatrixAt(i, mtx(b, cordL)); lab.setMatrixAt(i, mtx(b, labL)); });
      for (const m of [body, cord, lab]) { m.castShadow = m === body; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); out.push(m); } }
    return out; }, [bags]);
  return <>{meshes.map((m, i) => <primitive key={i} object={m} />)}</>;
};
/** one bag (for a bag being carried: placed in a worker's hands each frame) */
export const Bag: React.FC<{ b: BagPlace }> = ({ b }) => { const v = (b.v ?? 0) % 3, H = 0.58 + v * 0.03;
  return <group position={b.p} rotation={[b.tilt ?? 0, b.ry ?? 0, (b.tilt ?? 0) * 0.6]} scale={b.s ?? 1}>
    <mesh geometry={bagGeo(v)} material={bagMat()} castShadow receiveShadow />
    <mesh geometry={neckGeo()} material={cordMat()} position={[0, H * 0.87, 0]} rotation={[Math.PI / 2, 0, 0]} />
    <mesh geometry={labelGeo()} material={brassMat()} position={[0.055, H * 0.8, 0.02]} rotation={[0, 0.4, 0.3]} /></group>; };
