// TwistFrame characters for the post office film: the approved earless odo5 cards (face glow + halo), with dive gear
// and swimming. A swimmer's card rolls toward its direction of travel ON SCREEN (horizontal when cruising, upright when
// treading water), bobs with its own buoyancy rhythm and flutter-kicks at its own rate.
import React, { useMemo } from "react";
import * as THREE from "three";
import { CardSprite } from "../../char/CardSprite";
import { drawOdo5, headCenterPx5, shoulderPx5, W5, H5, SOLE5, COSTUME, type Odo5Pose, type Costume } from "../../char/odo5";
import { glow } from "../../hall/hallTextures";
import type { V3 } from "../../lib/math";

export const HERO: Costume = { ...COSTUME.odo, apron: false, pal: { shirt: "#2f6f78", shirtShade: "#22545b", hair: "#ebe9f0", hairShade: "#b9b4c4" } };
export const HERO_DIVE: Costume = { ...HERO, goggles: false, dive: "snorkel", fins: true, pal: { ...HERO.pal, shirt: "#1f8a8a", shirtShade: "#156464", belt: "#2a2a30", buckle: "#9aa3ad", fin: "#f0c22e", finShade: "#c99a12" } };
export const WORKER: Costume = { goggles: false, hairs: false, tufts: true, hat: null, stache: true, suit: false, apron: false, dive: "scuba", fins: true,
  pal: { shirt: "#1d3552", shirtShade: "#142740", collar: "#f0c22e", hair: "#2a1f1a", belt: "#202024", buckle: "#9aa3ad", fin: "#1d1d22", finShade: "#3a3a44", maskFrame: "#101418", snorkel: "#f0c22e" } };
const VIS = (shirt: string, shade: string, hair: string, fin: string, stache = false): Costume => ({ goggles: false, hairs: false, tufts: true, hat: null, stache, suit: false, apron: false, dive: "snorkel", fins: true,
  pal: { shirt, shirtShade: shade, hair, belt: shirt, buckle: shade, collar: shade, fin, finShade: "#00000033", snorkel: fin } });
export const VISITORS: Costume[] = [VIS("#d9577a", "#b03c5c", "#3a2a22", "#e8f0f6"), VIS("#e88a2e", "#b86a1c", "#c9a06a", "#2f6f9f", true), VIS("#7a5ac8", "#5a3fa0", "#1a1a1a", "#f2602a")];
export const OWNER: Costume = { ...COSTUME.hal, pal: { ...COSTUME.hal.pal, shirt: "#e9e2c8", shirtShade: "#c9c0a0", tie: "#2f8f8a", hat: "#efe3c4" } };
export const POSTMASTER: Costume = { goggles: false, hairs: false, tufts: true, hat: "pilot", stache: false, suit: true, apron: false, pal: { shirt: "#2b4a7a", shirtShade: "#1e365c", collar: "#f6f2e6", tie: "#f0c22e", hat: "#2b4a7a", hatShade: "#1e365c", band: "#f0c22e", hair: "#2a2220", pocket: "#f0c22e" } };
export const SELLER: Costume = { goggles: false, hairs: false, tufts: true, hat: null, stache: false, suit: false, apron: false, pal: { shirt: "#d9573a", shirtShade: "#b03c2a", hair: "#1a1410", collar: "#f6e6c8", belt: "#3a2a20" } };
export const CLERK: Costume = { ...COSTUME.clerk, hat: null, pal: { ...COSTUME.clerk.pal, shirt: "#2b4a7a", shirtShade: "#1e365c", tie: "#f0c22e" } };
export const BUILDERS: Costume[] = [COSTUME.workerA, COSTUME.workerB, { ...COSTUME.workerA, stache: true, pal: { ...COSTUME.workerA.pal, shirt: "#3f8a4a", shirtShade: "#2c6534" } }];

export type Placed = { pose: Odo5Pose; pos: V3; h: number; roll?: number; halo?: number; flip?: boolean; contact?: number; centre?: boolean };
const mirror = (g: CanvasRenderingContext2D, on: boolean | undefined, draw: () => void) => { if (!on) return draw(); g.save(); g.translate(W5, 0); g.scale(-1, 1); draw(); g.restore(); };
/** card centre <-> sole: a card's sole sits cardH * (SOLE5/H5 - 0.5) below its centre */
const soleFromCentre = (c: V3, h: number, roll: number): V3 => { const d = h * (SOLE5 / H5 - 0.5); return [c[0] + Math.sin(roll) * d * 0, c[1] - d, c[2]]; };
export const PoToon: React.FC<{ p: Placed; cam: V3; hi: boolean }> = ({ p, cam, hi }) => {
  const haloTex = useMemo(() => glow("rgba(255,236,205,0.9)", "rgba(255,210,160,0)"), []);
  const roll = p.roll ?? 0, h = p.h;
  const sole = p.centre ? soleFromCentre(p.pos, h, roll) : p.pos;
  // head position for the halo: card px -> card plane (yaw billboard), then the roll about the card centre
  const hc = headCenterPx5(p.pose), yaw = Math.atan2(cam[0] - sole[0], cam[2] - sole[2]), s = h / H5;
  let lx = ((p.flip ? W5 - hc[0] : hc[0]) - W5 / 2) * s, ly = (SOLE5 - hc[1]) * s; const cy = h * (SOLE5 / H5 - 0.5); ly -= cy; const rx = lx * Math.cos(roll) - ly * Math.sin(roll), ry = lx * Math.sin(roll) + ly * Math.cos(roll); lx = rx; ly = ry + cy;
  const head: V3 = [sole[0] + Math.cos(yaw) * lx - Math.sin(yaw) * 0.05, sole[1] + ly, sole[2] - Math.sin(yaw) * lx - Math.cos(yaw) * 0.05];
  return (<group>
    <CardSprite W={W5} H={H5} sole={SOLE5} cardH={h} pos={sole} camPos={cam} texScale={hi ? 1.7 : 1.15} albedo={0.84} fill={0.8} fillColor="#fff2e2" contact={p.contact ?? 0} roll={roll}
      draw={(g) => mirror(g, p.flip, () => drawOdo5(g, p.pose))} drawMask={(g) => mirror(g, p.flip, () => drawOdo5(g, p.pose, true))} />
    {(p.halo ?? 0.1) > 0 && <sprite position={head} scale={[0.95 * h / 1.55, 0.95 * h / 1.55, 1]}><spriteMaterial map={haloTex} transparent opacity={p.halo ?? 0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>}
  </group>);
};
/** world position of a card-px point (front view), honouring yaw billboard + roll about the card centre */
export const cardPx = (p: Placed, cam: V3, px: [number, number]): V3 => {
  const roll = p.roll ?? 0, h = p.h, sole = p.centre ? soleFromCentre(p.pos, h, roll) : p.pos, yaw = Math.atan2(cam[0] - sole[0], cam[2] - sole[2]), s = h / H5;
  let lx = ((p.flip ? W5 - px[0] : px[0]) - W5 / 2) * s, ly = (SOLE5 - px[1]) * s; const cy = h * (SOLE5 / H5 - 0.5); ly -= cy;
  const rx = lx * Math.cos(roll) - ly * Math.sin(roll), ry = lx * Math.sin(roll) + ly * Math.cos(roll);
  return [sole[0] + Math.cos(yaw) * rx, sole[1] + ry + cy, sole[2] - Math.sin(yaw) * rx];
};
/** front-view hand position in card px (s = -1 screen-left arm, +1 screen-right arm) */
export const handPx = (pose: Odo5Pose, s: -1 | 1): [number, number] => { const o = shoulderPx5(pose, s), a = s < 0 ? pose.armL : pose.armR; const x = o[0] + a.hand[0] - 300, y = o[1] + a.hand[1] - SOLE5, r = pose.bodyRoll ?? 0; return [300 + x * Math.cos(r) - y * Math.sin(r), SOLE5 + x * Math.sin(r) + y * Math.cos(r)]; };
/** card roll that points the head along a world velocity as seen from the camera (blended to upright when slow) */
export const swimRoll = (cam: V3, look: V3, vel: V3, cruise: number) => {
  const f = new THREE.Vector3(look[0] - cam[0], look[1] - cam[1], look[2] - cam[2]).normalize(), right = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, f);
  const v = new THREE.Vector3(...vel), sx = v.dot(right), sy = v.dot(up); const sp = Math.hypot(sx, sy);
  if (sp < 1e-4) return 0; const target = Math.atan2(-sx, sy);   // head along screen motion
  return target * Math.min(1, cruise);
};
