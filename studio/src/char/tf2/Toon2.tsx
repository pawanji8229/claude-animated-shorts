// TF2 in the 3D films: the same lit CardSprite + face-glow mask + halo as the approved PoToon, drawing the new rig.
// The card billboards to the camera; the planner's projection yaw (facing relative to the camera) makes the drawn body
// turn correctly in the world. Held props use cardPoint() to sit exactly in the drawn hand.
import React, { useMemo } from "react";
import * as THREE from "three";
import { CardSprite } from "../CardSprite";
import { glow } from "../../hall/hallTextures";
import { drawTF2, headPx, wristPx } from "./draw";
import { W, H, SOLE, type V3 } from "./rig";
import type { CharFrame } from "./planner";
import type { Costume } from "../odo5";

export type Placed2 = { fr: CharFrame; costume: Costume; h?: number; halo?: number; contact?: number; t: number };
export const Toon2: React.FC<{ p: Placed2; cam: V3; hi: boolean }> = ({ p, cam, hi }) => {
  const haloTex = useMemo(() => glow("rgba(255,236,205,0.9)", "rgba(255,210,160,0)"), []);
  const h = p.h ?? 1.55, sole: V3 = [p.fr.pos[0], p.fr.pos[1], p.fr.pos[2]], head = cardPoint(p, cam, headPx(p.fr.sk), -0.05);
  return (<group>
    <CardSprite W={W} H={H} sole={SOLE} cardH={h} pos={sole} camPos={cam} texScale={hi ? 1.7 : 1.15} albedo={0.84} fill={0.8} fillColor="#fff2e2" contact={p.contact ?? (p.fr.pos[1] > 0.02 ? 0.25 : 0.6)}
      draw={(g) => drawTF2(g, p.fr.sk, p.fr.face, { costume: p.costume, t: p.t, behindHead: p.fr.behindHead })} drawMask={(g) => drawTF2(g, p.fr.sk, p.fr.face, { costume: p.costume, mask: true, t: p.t, behindHead: p.fr.behindHead })} />
    {(p.halo ?? 0.1) > 0 && <sprite position={head} scale={[0.95 * h / 1.55, 0.95 * h / 1.55, 1]}><spriteMaterial map={haloTex} transparent opacity={p.halo ?? 0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>}
  </group>);
};
/** world position of a card-px point on this character's card (yaw billboard), optional push toward the camera */
export const cardPoint = (p: Placed2, cam: V3, px: [number, number], push = 0): V3 => {
  const h = p.h ?? 1.55, sole = p.fr.pos, yaw = Math.atan2(cam[0] - sole[0], cam[2] - sole[2]), s = h / H;
  const lx = (px[0] - W / 2) * s, ly = (SOLE - px[1]) * s;
  return [sole[0] + Math.cos(yaw) * lx + Math.sin(yaw) * push, sole[1] + ly, sole[2] - Math.sin(yaw) * lx + Math.cos(yaw) * push];
};
/** world position of a hand (for props held in the 3D scene) */
export const handWorld2 = (p: Placed2, cam: V3, i: 0 | 1) => cardPoint(p, cam, wristPx(p.fr.sk, i), 0.02);
