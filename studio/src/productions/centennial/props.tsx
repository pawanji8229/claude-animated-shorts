// Hand props + small set pieces: wooden stepladder, the padded transport box (1976), kerosene lantern (lit: flame +
// warm light), flashlight with a soft beam, cut cord stub, orange extension cord (the 2013 bypass).
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { cm } from "./mats";
import { glow as glowTex } from "../../hall/hallTextures";
import type { V3 } from "../../lib/math";

/** wooden A-frame stepladder, 5 steps, top at 1.95 m. Local: front legs at +x (steps), rear legs at -x */
export const STEP_H = [0.36, 0.72, 1.08, 1.44, 1.8];
const stepKit = () => once("cStep", () => { const M = cm(), k = new Kit();
  for (const s of [-1, 1]) { k.rod(M.woodLight, [0.42, 0, s * 0.27], [0.05, 1.95, s * 0.22], 0.03, 6); k.rod(M.woodLight, [-0.48, 0, s * 0.26], [-0.05, 1.92, s * 0.22], 0.028, 6); }
  STEP_H.forEach((y) => { const x = 0.42 - (y / 1.95) * 0.37; k.box(M.woodLight, [0.13, 0.03, 0.5 - y * 0.04], [x, y, 0], [0, 0, 0], { ink: 0.3 }); });
  k.box(M.woodLight, [0.32, 0.04, 0.5], [0.0, 1.97, 0]); k.box(M.wood, [0.3, 0.02, 0.4], [-0.25, 1.1, 0], [0, 0, 0.9]);
  for (const s of [-1, 1]) k.rod(M.steel, [0.25, 0.9, s * 0.26], [-0.28, 0.9, s * 0.25], 0.006, 4, { ink: false });
  return k; });
export const StepLadder: React.FC<{ p: V3; ry?: number }> = ({ p, ry = 0 }) => <group position={p} rotation={[0, ry, 0]}><KitMesh kit={stepKit()} /></group>;
/** world position of the top of step i of a stepladder at p, ry */
export const stepAt = (p: V3, ry: number, i: number): V3 => { const y = STEP_H[i], x = 0.42 - (y / 1.95) * 0.37; return [p[0] + Math.cos(ry) * x, p[1] + y + 0.015, p[2] - Math.sin(ry) * x]; };

/** padded wooden box with a hinged lid; `open` 0..1 (lid angle); foam lining visible when open */
const boxKit = () => once("cBox", () => { const M = cm(), k = new Kit(), w = 0.36, d = 0.32, h = 0.3;
  k.span(M.woodLight, [-w / 2, 0, -d / 2], [w / 2, 0.02, d / 2]); for (const s of [-1, 1]) { k.span(M.woodLight, [-w / 2, 0, s * d / 2 - (s > 0 ? 0.02 : 0)], [w / 2, h, s * d / 2 + (s < 0 ? 0.02 : 0)]); k.span(M.woodLight, [s * w / 2 - (s > 0 ? 0.02 : 0), 0, -d / 2], [s * w / 2 + (s < 0 ? 0.02 : 0), h, d / 2]); }
  k.span(M.offWhite, [-w / 2 + 0.02, 0.02, -d / 2 + 0.02], [w / 2 - 0.02, 0.12, d / 2 - 0.02], { ink: false });
  for (const s of [-1, 1]) { k.span(M.offWhite, [-w / 2 + 0.02, 0.02, s * (d / 2 - 0.06) - 0.04], [w / 2 - 0.02, h - 0.02, s * (d / 2 - 0.06) + 0.04], { ink: false }); }
  for (const s of [-1, 1]) k.span(M.black, [s * w / 2 - 0.01, 0.12, -0.08], [s * w / 2 + 0.01, 0.16, 0.08], { ink: false });
  return k; });
const lidKit = () => once("cLid", () => { const M = cm(), k = new Kit(); k.span(M.woodLight, [0, 0, -0.17], [0.38, 0.025, 0.17]); k.span(M.offWhite, [0.03, -0.04, -0.14], [0.35, 0, 0.14], { ink: false }); return k; });
export const PaddedBox: React.FC<{ p: V3; ry?: number; open?: number; children?: React.ReactNode }> = ({ p, ry = 0, open = 0, children }) => <group position={p} rotation={[0, ry, 0]}>
  <KitMesh kit={boxKit()} /><group position={[-0.19, 0.3, 0]} rotation={[0, 0, open * 1.9]}><KitMesh kit={lidKit()} /></group>{children}</group>;

/** kerosene lantern (hanging or standing); `lit` 0..1 adds flame + warm light */
const lanternKit = () => once("cLantern", () => { const M = cm(), k = new Kit();
  k.cyl(M.redMod, 0.07, 0.075, 0.07, [0, 0.035, 0], [0, 0, 0], 16); k.cyl(M.redMod, 0.04, 0.07, 0.03, [0, 0.085, 0], [0, 0, 0], 16);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; k.rod(M.steelDark, [Math.cos(a) * 0.065, 0.08, Math.sin(a) * 0.065], [Math.cos(a) * 0.055, 0.27, Math.sin(a) * 0.055], 0.005, 4, { ink: false }); }
  k.cyl(M.redMod, 0.05, 0.07, 0.04, [0, 0.29, 0], [0, 0, 0], 16); k.cyl(M.redMod, 0.02, 0.04, 0.05, [0, 0.33, 0], [0, 0, 0], 12);
  k.torus(M.steelDark, 0.08, 0.005, [0, 0.36, 0], [0, 0, 0], Math.PI); return k; });
export const Lantern: React.FC<{ p: V3; lit: number; light?: boolean }> = ({ p, lit, light = true }) => { const M = cm(), t = useMemo(() => glowTex("rgba(255,200,120,0.9)", "rgba(255,150,60,0)"), []);
  return <group position={p}><KitMesh kit={lanternKit()} />
    <mesh position={[0, 0.185, 0]}><sphereGeometry args={[0.058, 16, 12]} /><primitive object={M.glass} attach="material" /></mesh>
    {lit > 0.02 && <><mesh position={[0, 0.17, 0]} scale={[0.6, 1.4 * lit, 0.6]}><sphereGeometry args={[0.018, 10, 8]} /><primitive object={M.flame} attach="material" /></mesh>
      <sprite position={[0, 0.18, 0]} scale={[0.32, 0.32, 1]}><spriteMaterial map={t} transparent opacity={0.35 * lit} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
      {light && <pointLight position={[0, 0.2, 0]} color="#ffb060" intensity={1.4 * lit} distance={6} decay={1.7} />}</>}
  </group>; };

/** flashlight in a hand at p aiming at `to`: body + lens + spotlight + a faint visible beam cone */
export const Flashlight: React.FC<{ p: V3; to: V3; on: number }> = ({ p, to, on }) => { const M = cm();
  const { q, len } = useMemo(() => { const d = new THREE.Vector3(to[0] - p[0], to[1] - p[1], to[2] - p[2]); const len = d.length(); return { q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), len }; }, [p, to]);
  const spot = useMemo(() => { const s = new THREE.SpotLight("#fff4dc", 0, 12, 0.32, 0.6, 1.2); return s; }, []);
  spot.position.set(...p); spot.target.position.set(...to); spot.target.updateMatrixWorld(); spot.intensity = 14 * on;
  return <><group position={p} quaternion={q}>
    <mesh position={[0, -0.08, 0]}><cylinderGeometry args={[0.02, 0.018, 0.17, 12]} /><primitive object={M.black} attach="material" /></mesh>
    <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.03, 0.022, 0.05, 14]} /><primitive object={M.black} attach="material" /></mesh>
    {on > 0.05 && <mesh position={[0, 0.046, 0]}><circleGeometry args={[0.025, 14]} /><meshBasicMaterial color={new THREE.Color(3, 2.8, 2.4)} toneMapped={false} side={THREE.DoubleSide} /></mesh>}
    {on > 0.05 && <mesh position={[0, 0.05 + Math.min(len, 3) / 2, 0]}><coneGeometry args={[Math.min(len, 3) * 0.33, Math.min(len, 3), 24, 1, true]} /><meshBasicMaterial color="#fff2d8" transparent opacity={0.05 * on} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>}
  </group><primitive object={spot} /><primitive object={spot.target} /></>; };

/** tube through points (cords, cables) */
export const Cord: React.FC<{ pts: V3[]; r?: number; color?: string }> = ({ pts, r = 0.006, color = "#3a2a1e" }) => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), Math.max(12, pts.length * 8), r, 6, false), [JSON.stringify(pts), r]); // eslint-disable-line
  return <mesh geometry={geo} castShadow><meshStandardMaterial color={color} roughness={0.8} /></mesh>; };
