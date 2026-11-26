// joralemon fauna renderer: a small, readable pigeon (grey body, iridescent neck, darker wing bars, pink feet, beak),
// posed per frame from fauna.ts (yaw/pitch/bank, wing flap + spread, head bob/turn/peck, stepping legs). Small sky
// birds reuse the rig darker and smaller.
import React from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import type { BirdState } from "./fauna";

const std = (c: string, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const PM = () => once("pigeonMats", () => ({ body: std("#8f95a2", 0.85), wing: std("#7a808c", 0.85), bar: std("#3c3f46", 0.8), neck: std("#4f7a6c", 0.35, 0.4), head: std("#848a97", 0.8),
  beak: std("#2c2a2a", 0.5), feet: std("#c9706e", 0.6), eye: std("#e08a2a", 0.3), dark: std("#3a342e", 0.8), tail: std("#6a707c", 0.8) }));
const bodyKit = (dark: boolean) => once(`pgBody${dark}`, () => { const M = PM(), k = new Kit(), b = dark ? M.dark : M.body;
  k.sphere(b, 0.085, [0, 0.135, 0], [1.55, 1.0, 0.95], { ink: 0.35 });
  k.sphere(dark ? M.dark : M.neck, 0.055, [0.085, 0.19, 0], [1, 1.1, 1], { ink: false });
  k.add(dark ? M.dark : M.tail, new THREE.BoxGeometry(0.15, 0.012, 0.075), [-0.17, 0.15, 0], [0, 0, 0.25], [1, 1, 1], { ink: 0.3 });
  k.add(M.bar, new THREE.BoxGeometry(0.03, 0.013, 0.078), [-0.225, 0.137, 0], [0, 0, 0.25], [1, 1, 1], { ink: false });
  return k; });
const headKit = (dark: boolean) => once(`pgHead${dark}`, () => { const M = PM(), k = new Kit();
  k.sphere(dark ? M.dark : M.head, 0.042, [0, 0, 0], [1.1, 1, 0.95], { ink: 0.35 });
  k.add(M.beak, new THREE.ConeGeometry(0.012, 0.04, 8), [0.055, -0.006, 0], [0, 0, -Math.PI / 2 - 0.25], [1, 1, 1], { ink: false });
  for (const s of [-1, 1]) k.sphere(M.eye, 0.008, [0.022, 0.012, s * 0.036], [1, 1, 1], { ink: false });
  return k; });
const wingKit = (dark: boolean) => once(`pgWing${dark}`, () => { const M = PM(), k = new Kit();
  const sh = new THREE.Shape(); sh.moveTo(0.05, 0); sh.quadraticCurveTo(0.02, 0.12, -0.06, 0.26); sh.lineTo(-0.12, 0.24); sh.quadraticCurveTo(-0.11, 0.1, -0.1, 0); sh.closePath();
  const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2);   // wing lies in the x-z plane, span along +z
  k.add(dark ? M.dark : M.wing, g, [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: 0.3, cast: true });
  for (const zz of [0.08, 0.13]) k.span(M.bar, [-0.08, 0.002, zz], [0.01, 0.006, zz + 0.018], { ink: false });
  const m = k.build()[0].mat as THREE.MeshStandardMaterial; m.side = THREE.DoubleSide; return k; });
const legKit = () => once("pgLeg", () => { const M = PM(), k = new Kit(); k.rod(M.feet, [0, 0.07, 0], [0.01, 0, 0], 0.006, 5, { ink: false }); k.span(M.feet, [-0.01, 0, -0.012], [0.04, 0.006, 0.012], { ink: false }); return k; });
export const Bird3D: React.FC<{ b: BirdState; dark?: boolean }> = ({ b, dark = false }) => {
  const legSw = b.step ? Math.sin(b.step * Math.PI * 2) * 0.5 : 0, bob = b.step ? Math.max(0, Math.sin(b.step * Math.PI * 2 + 0.6)) * 0.03 : 0;
  const fold = 1 - b.spread, flap = b.wing;
  return (<group position={b.pos} rotation={[b.bank, b.yaw, 0]} scale={b.scale}><group rotation={[0, 0, b.pitch]}>
    <KitMesh kit={bodyKit(dark)} />
    <group position={[0.11 + bob - b.peck * 0.02, 0.24 - b.peck * 0.11, 0]} rotation={[0, b.head, -b.peck * 1.1]}><KitMesh kit={headKit(dark)} /></group>
    {[-1, 1].map((s) => <group key={s} position={[0.02, 0.17, s * 0.06]} scale={[1, 1, s]} rotation={[s * (fold * -0.15 + (1 - fold) * flap * 1.15), fold * 0.55, 0]}>
      <group scale={[1, 1, lerp1(1, 0.42, fold)]} rotation={[0, fold * -0.3, 0]}><KitMesh kit={wingKit(dark)} /></group></group>)}
    {b.ground && [-1, 1].map((s) => <group key={`l${s}`} position={[0, 0, s * 0.025]} rotation={[0, 0, s * legSw]}><KitMesh kit={legKit()} /></group>)}
  </group></group>);
};
const lerp1 = (a: number, b: number, t: number) => a + (b - a) * t;
