// Character 2.0 x Lighting 2.0: the TF2 character card lit by the scene's LightSpec. Same identity, same approved
// face-glow mask + halo technique as Toon2; the lighting director sets the parameters instead of fixed constants:
//   - albedo (how strongly the scene key / fill light the card; never so low the card goes black),
//   - face glow (consistent warm-white emissive fill of the face mask, 0.7-0.95: readable, never blown out),
//   - subtle environment tint of that glow (15 %) so the face belongs to the scene's light,
//   - a rim / back-glow sprite on the side away from the camera when the key is behind the subject (approximation:
//     a flat card has no real silhouette normals, so the rim is an additive glow behind the head and shoulders),
//   - the existing alpha-tested shadow casting (character shadows on the set) + contact shadow under the feet.
import React, { useMemo } from "react";
import * as THREE from "three";
import { CardSprite } from "../../../char/CardSprite";
import { glow } from "../../../hall/hallTextures";
import { drawTF2, headPx } from "../../../char/tf2/draw";
import { W, H, SOLE, type V3 } from "../../../char/tf2/rig";
import { cardPoint, type Placed2 } from "../../../char/tf2/Toon2";
import { mixRGB, hex, toHex, type LightSpec } from "./model";

export const Toon2Lit: React.FC<{ p: Placed2; cam: V3; hi: boolean; light: LightSpec }> = ({ p, cam, hi, light }) => {
  const haloTex = useMemo(() => glow("rgba(255,236,205,0.9)", "rgba(255,210,160,0)"), []);
  const rimTex = useMemo(() => glow("rgba(255,255,255,0.85)", "rgba(255,255,255,0)"), []);
  const h = p.h ?? 1.55, sole: V3 = [p.fr.pos[0], p.fr.pos[1], p.fr.pos[2]], head = cardPoint(p, cam, headPx(p.fr.sk), -0.05);
  const ch = light.character, fillColor = toHex(mixRGB(hex("#fff2e2"), ch.tint, 0.15));
  // backlight factor: how much the key comes from behind the subject (relative to the camera)
  const toCam = [cam[0] - sole[0], 0, cam[2] - sole[2]], l = Math.hypot(toCam[0], toCam[2]) || 1, back = Math.max(0, -(light.key.dir[0] * toCam[0] + light.key.dir[2] * toCam[2]) / l);
  const rim = Math.min(0.6, ch.rim * (0.35 + 0.65 * back)) * Math.min(1, light.key.intensity / 1.5 + 0.3);
  const behind = cardPoint(p, cam, headPx(p.fr.sk), -0.12);
  return (<group>
    <CardSprite W={W} H={H} sole={SOLE} cardH={h} pos={sole} camPos={cam} texScale={hi ? 1.7 : 1.15} albedo={ch.albedo} fill={ch.faceGlow} fillColor={fillColor} contact={p.contact ?? (p.fr.pos[1] > 0.02 ? 0.25 : 0.6)}
      draw={(g) => drawTF2(g, p.fr.sk, p.fr.face, { costume: p.costume, t: p.t, behindHead: p.fr.behindHead })} drawMask={(g) => drawTF2(g, p.fr.sk, p.fr.face, { costume: p.costume, mask: true, t: p.t, behindHead: p.fr.behindHead })} />
    {(p.halo ?? 0.1) > 0 && <sprite position={head} scale={[0.95 * h / 1.55, 0.95 * h / 1.55, 1]}><spriteMaterial map={haloTex} transparent opacity={p.halo ?? 0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>}
    {rim > 0.03 && <sprite position={[behind[0], behind[1] - 0.12, behind[2]]} scale={[0.9 * h / 1.55, 1.05 * h / 1.55, 1]} renderOrder={-1}><spriteMaterial map={rimTex} color={new THREE.Color().setRGB(...ch.rimColor, THREE.LinearSRGBColorSpace)} transparent opacity={rim} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>}
  </group>);
};
