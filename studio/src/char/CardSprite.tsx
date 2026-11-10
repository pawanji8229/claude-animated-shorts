// Generic lit 2.5D character card: Canvas2D drawing re-painted each frame, yaw-only billboard toward the camera,
// lit by the scene (MeshStandardMaterial) with a small warm emissive "face fill" so expressions never go muddy,
// alpha-tested shadow caster, and a soft contact shadow under the feet.
import React, { useMemo } from "react";
import * as THREE from "three";
import { radial } from "../inventor/textures";

export const CardSprite: React.FC<{
  W: number; H: number; sole: number; cardH: number;
  draw: (g: CanvasRenderingContext2D) => void;
  pos: [number, number, number]; camPos: [number, number, number];
  texScale: number; fill?: number; fillColor?: string; contact?: number; albedo?: number;
  /** optional emissive mask (white = self-lit face glow); `fill` then scales it */
  drawMask?: (g: CanvasRenderingContext2D) => void;
}> = ({ W, H, sole, cardH, draw, pos, camPos, texScale, fill = 0.12, fillColor = "#ffe2bf", contact = 0.8, albedo = 1, drawMask }) => {
  const hasMask = !!drawMask;
  const { cv, tex, mat, depth, dist, mcv, mtex } = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = Math.round(W * texScale); cv.height = Math.round(H * texScale);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mcv = document.createElement("canvas"); mcv.width = cv.width; mcv.height = cv.height;
    const mtex = new THREE.CanvasTexture(mcv); mtex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, color: new THREE.Color(albedo, albedo, albedo), alphaTest: 0.5, roughness: 0.92, metalness: 0, emissive: new THREE.Color(fillColor), emissiveMap: hasMask ? mtex : tex, emissiveIntensity: fill, side: THREE.DoubleSide });
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
    const dist = new THREE.MeshDistanceMaterial({ map: tex, alphaTest: 0.5 });
    return { cv, tex, mat, depth, dist, mcv, mtex };
  }, [W, H, texScale, fill, fillColor, albedo, hasMask]);
  const blob = useMemo(() => new THREE.MeshBasicMaterial({ map: radial("rgba(8,4,10,0.9)", "rgba(8,4,10,0)"), transparent: true, depthWrite: false }), []);
  const g = cv.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(texScale, 0, 0, texScale, 0, 0);
  draw(g);
  tex.needsUpdate = true;
  if (drawMask) {
    const mg = mcv.getContext("2d")!;
    mg.setTransform(1, 0, 0, 1, 0, 0); mg.fillStyle = "#000"; mg.fillRect(0, 0, mcv.width, mcv.height);
    mg.setTransform(texScale, 0, 0, texScale, 0, 0); drawMask(mg); mtex.needsUpdate = true;
  }
  const cardW = cardH * (W / H);
  const yaw = Math.atan2(camPos[0] - pos[0], camPos[2] - pos[2]);
  const yOff = cardH * (1 - sole / H);
  blob.opacity = contact;
  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={blob} scale={[0.62, 0.3, 1]}><planeGeometry args={[1, 1]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]} material={blob} scale={[0.3, 0.14, 1]}><planeGeometry args={[1, 1]} /></mesh>
      <group rotation={[0, yaw, 0]}>
        <mesh position={[0, cardH / 2 - yOff, 0]} material={mat} castShadow customDepthMaterial={depth} customDistanceMaterial={dist}>
          <planeGeometry args={[cardW, cardH]} />
        </mesh>
      </group>
    </group>
  );
};
