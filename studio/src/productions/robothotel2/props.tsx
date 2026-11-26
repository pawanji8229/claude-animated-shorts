// Costume pieces attached to the downloaded raptor's bones (bellhop cap on Head_09, bow tie on Neck_3_08). Bones live in
// metres in model space (GModel cancels the bone's rest rotation + scale).
import React from "react";
import * as THREE from "three";
const red = new THREE.MeshPhysicalMaterial({ color: "#c8202a", roughness: 0.35, clearcoat: 0.6 });
const gold = new THREE.MeshStandardMaterial({ color: "#e0b040", metalness: 0.9, roughness: 0.25 });
const black = new THREE.MeshStandardMaterial({ color: "#151518", roughness: 0.4 });
/** cap: s = size, o = local offset, r = local rotation (tuned on the test stills) */
export const BellhopCap: React.FC<{ s?: number; o?: [number, number, number]; r?: [number, number, number] }> = ({ s = 1, o = [0, 0, 0], r = [0, 0, 0] }) =>
  <group position={o} rotation={r} scale={s}>
    <mesh material={red} castShadow><cylinderGeometry args={[0.075, 0.082, 0.07, 28]} /></mesh>
    <mesh material={gold} position={[0, -0.022, 0]}><cylinderGeometry args={[0.0835, 0.0835, 0.014, 28]} /></mesh>
    <mesh material={black} position={[0, 0.036, 0]}><cylinderGeometry args={[0.076, 0.076, 0.004, 28]} /></mesh>
    <mesh material={gold} position={[0, 0.042, 0]}><sphereGeometry args={[0.013, 12, 10]} /></mesh>
  </group>;
export const BowTie: React.FC<{ s?: number; o?: [number, number, number]; r?: [number, number, number] }> = ({ s = 1, o = [0, 0, 0], r = [0, 0, 0] }) =>
  <group position={o} rotation={r} scale={s}>
    {[-1, 1].map((d) => <mesh key={d} material={red} position={[d * 0.05, 0, 0]} rotation={[0, 0, d * Math.PI / 2]} castShadow><coneGeometry args={[0.04, 0.09, 4]} /></mesh>)}
    <mesh material={red}><sphereGeometry args={[0.022, 12, 10]} /></mesh>
  </group>;
