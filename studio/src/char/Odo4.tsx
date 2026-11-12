// Odo v4 in 3D: lit card + face-only emissive glow mask + soft halo behind the head + optional glowing jar.
import React, { useMemo } from "react";
import * as THREE from "three";
import { CardSprite } from "./CardSprite";
import { drawOdo4, headCenterPx, jarHandPx, Odo4Pose, W4, H4, SOLE4, CARD_H4, PX4 } from "./odo4";
import { glow } from "../hall/hallTextures";
import { V3 } from "../lib/math";

/** Canvas px -> world, for a yaw-only card standing at `pos` facing `cam`. */
export const cardToWorld = (pos: V3, cam: V3, px: [number, number], push = 0): V3 => {
  const yaw = Math.atan2(cam[0] - pos[0], cam[2] - pos[2]);
  const lx = (px[0] - W4 / 2) * PX4, ly = (SOLE4 - px[1]) * PX4;
  return [pos[0] + Math.cos(yaw) * lx + Math.sin(yaw) * push, ly, pos[2] - Math.sin(yaw) * lx + Math.cos(yaw) * push];
};

export const Odo4: React.FC<{ pose: Odo4Pose; pos: V3; cam: V3; hi: boolean; glowK?: number; jar?: number }> = ({ pose, pos, cam, hi, glowK = 1, jar = 0 }) => {
  const halo = useMemo(() => glow("rgba(255,236,205,0.9)", "rgba(255,210,160,0)"), []);
  const jarGlow = useMemo(() => glow("rgba(255,214,120,1)", "rgba(255,160,60,0)"), []);
  const head = cardToWorld(pos, cam, headCenterPx(pose), -0.04);
  const jarP = cardToWorld(pos, cam, jarHandPx(pose), 0.03);
  const showJar = pose.holdJar > 0.5;
  return (
    <group>
      <CardSprite W={W4} H={H4} sole={SOLE4} cardH={CARD_H4} pos={pos} camPos={cam} texScale={hi ? 2 : 1.3}
        albedo={0.8} fill={0.85 * glowK} fillColor="#fff4e8" contact={0.85}
        draw={(g) => drawOdo4(g, pose)} drawMask={(g) => drawOdo4(g, pose, true)} />
      {/* soft halo just behind the head: the face reads as gently glowing, without blowing out */}
      <sprite position={head} scale={[0.95, 0.95, 1]}>
        <spriteMaterial map={halo} transparent opacity={0.16 * glowK} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {showJar && (
        <group position={[jarP[0], jarP[1] - 0.02, jarP[2]]}>
          <mesh><cylinderGeometry args={[0.045, 0.05, 0.11, 16]} /><meshStandardMaterial color="#cfe8ff" transparent opacity={0.35} roughness={0.05} /></mesh>
          <mesh position={[0, 0.066, 0]}><cylinderGeometry args={[0.04, 0.04, 0.02, 14]} /><meshStandardMaterial color="#b8853a" metalness={0.6} roughness={0.35} /></mesh>
          <mesh><sphereGeometry args={[0.022, 12, 10]} /><meshBasicMaterial color={[3.2 * (0.7 + 0.5 * jar), 2.4 * (0.7 + 0.5 * jar), 1.0]} toneMapped={false} /></mesh>
          <sprite scale={[0.42 + 0.25 * jar, 0.42 + 0.25 * jar, 1]}><spriteMaterial map={jarGlow} transparent opacity={0.38} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
          <pointLight color="#ffc670" intensity={1.4 + 1.2 * jar} distance={2.4} decay={1.9} />
        </group>
      )}
    </group>
  );
};
