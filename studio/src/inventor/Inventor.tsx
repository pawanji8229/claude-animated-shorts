// The inventor as a lit, yaw-only billboard card in the 3D set (HYBRID_2_5D mode).
// - Canvas2D drawing re-painted every frame from the deterministic state (pose, blink, expression).
// - MeshStandardMaterial so the card is lit by the scene (brightens as he enters the bulb's pool) with a small
//   emissive floor so the face never goes muddy; alphaTest lets it cast a correct silhouette shadow.
// - Soft multiply contact shadow under the feet so he is grounded, never floating.
import React, { useMemo } from "react";
import * as THREE from "three";
import { CANVAS_H, CANVAS_W, SOLE_Y, drawInventor } from "./inventorDraw";
import type { InventorState } from "./timeline";
import { radial } from "./textures";

export const CARD_H = 1.62; // metres for the full 1000 px design canvas
const CARD_W = CARD_H * (CANVAS_W / CANVAS_H);

export const Inventor: React.FC<{ st: InventorState; texScale: number; camPos: [number, number, number] }> = ({ st, texScale, camPos }) => {
  const { cv, tex, mat, depthMat } = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = Math.round(CANVAS_W * texScale); cv.height = Math.round(CANVAS_H * texScale);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({
      map: tex, transparent: false, alphaTest: 0.5, roughness: 1, metalness: 0,
      emissive: new THREE.Color("#ffffff"), emissiveMap: tex, emissiveIntensity: 0.14, side: THREE.DoubleSide,
    });
    const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
    const distMat = new THREE.MeshDistanceMaterial({ map: tex, alphaTest: 0.5 });
    return { cv, tex, mat, depthMat: { depthMat, distMat } };
  }, [texScale]);
  const blob = useMemo(() => new THREE.MeshBasicMaterial({ map: radial("rgba(20,8,4,0.75)", "rgba(20,8,4,0)"), transparent: true, depthWrite: false }), []);

  // repaint the card for this frame
  const g = cv.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(texScale, 0, 0, texScale, 0, 0);
  drawInventor(g, st);
  tex.needsUpdate = true;

  // yaw-only billboard toward the (deterministic) camera position for this frame
  const yaw = Math.atan2(camPos[0] - st.pos[0], camPos[2] - st.pos[2]);

  const yOff = CARD_H * (1 - SOLE_Y / CANVAS_H); // canvas soles sit at y=975 -> lift so soles touch the floor
  return (
    <group position={st.pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} material={blob} scale={[0.7, 0.32, 1]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <group rotation={[0, yaw, 0]}>
        <mesh position={[0, CARD_H / 2 - yOff, 0]} material={mat} castShadow customDepthMaterial={depthMat.depthMat} customDistanceMaterial={depthMat.distMat}>
          <planeGeometry args={[CARD_W, CARD_H]} />
        </mesh>
      </group>
    </group>
  );
};
