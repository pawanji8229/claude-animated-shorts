// Layer F: building the camouflage town, with visible progress and no spawning:
//  * each house on the build lots goes up in stages, revealed from the bottom up with a rising clip plane (timber
//    frame erected -> canvas walls stretched up -> roof canvas -> garden), while its lumber pile shrinks board by board
//  * a painter's roller lays the road stripe (the stripe exists only behind the roller)
//  * a timber derrick at the roof edge hoists material bundles from a truck in the street
import React, { useContext, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Kit, KitMesh, once } from "../short3/kit";
import { Ink, InkCtx } from "../../inventor/Workshop";
import { InkHull, type InkFade } from "../../lib/Ink";
import { cm } from "../centennial/mats";
import { addHouse, tMats, LOTS, type HousePart } from "./town";
import { ROOF_Y, FZ } from "./factory";
import type { V3 } from "../../lib/math";

export const EnableClipping: React.FC = () => { const gl = useThree((s) => s.gl); useLayoutEffect(() => { gl.localClippingEnabled = true; }, [gl]); return null; };
const partKit = (lot: number, part: HousePart) => once(`bPart${lot}${part}`, () => { const k = new Kit(); addHouse(k, LOTS.find((l) => l.i === lot)!.s, true, ROOF_Y + 0.05, false, part); return k; });
/** a kit revealed below world height `y` (clip plane), materials cloned per instance */
const ClipKit: React.FC<{ kit: Kit; y: number; top: number; inkK?: number }> = ({ kit, y, top, inkK = 1 }) => {
  const px = useContext(InkCtx);
  const parts = useMemo(() => { const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), fade: InkFade = { uniforms: { clipY: { value: 0 } }, decl: "uniform float clipY;", alpha: "step(vW.y, clipY)" };
    return { plane, fade, list: kit.build().map((p) => { const m = (p.mat as THREE.Material).clone(); m.clippingPlanes = [plane]; return { ...p, m }; }) }; }, [kit]);
  parts.plane.constant = y; parts.fade.uniforms.clipY.value = y;
  // outlines are clipped with the same height (the hull shader discards above it), so nothing unrevealed shows
  return <>{parts.list.map((p, i) => <mesh key={i} geometry={p.geo} material={p.m} castShadow={y >= top - 0.01} receiveShadow>{p.opt.ink !== false && y > ROOF_Y + 0.3 && <InkHull px={px * (typeof p.opt.ink === "number" ? p.opt.ink : 0.7) * inkK} color="#0b0a0c" fade={parts.fade} />}</mesh>)}</>;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl = (x: number) => Math.min(1, Math.max(0, x));
/** one house under construction; p 0..1 (frame 0-0.3, walls 0.25-0.55, roof 0.5-0.78, garden 0.75-1) */
export const AnimHouse: React.FC<{ lot: number; p: number }> = ({ lot, p }) => { const L = LOTS.find((l) => l.i === lot)!.s, top = ROOF_Y + L.h + 3.6;
  const reveal = (a: number, b: number, hi: number) => lerp(ROOF_Y - 0.05, hi, cl((p - a) / (b - a)));
  return <>
    {p > 0 && <ClipKit kit={partKit(lot, "frame")} y={reveal(0, 0.3, top)} top={top} />}
    {p > 0.25 && <ClipKit kit={partKit(lot, "walls")} y={reveal(0.25, 0.55, ROOF_Y + L.h + 0.3)} top={ROOF_Y + L.h + 0.3} />}
    {p > 0.5 && <mesh position={[L.x - Math.sin(L.ry) * (3.2 + L.d / 2), ROOF_Y + 0.05 + L.h + 0.03, L.z - Math.cos(L.ry) * (3.2 + L.d / 2)]} rotation={[-Math.PI / 2, 0, -L.ry]} material={cm().woodLight} receiveShadow><planeGeometry args={[L.w + 0.05, L.d + 0.05]} /></mesh>}
    {p > 0.5 && <ClipKit kit={partKit(lot, "roof")} y={reveal(0.5, 0.78, top)} top={top} />}
    {p > 0.75 && <ClipKit kit={partKit(lot, "garden")} y={reveal(0.75, 1, ROOF_Y + 6.5)} top={ROOF_Y + 6.5} />}
    <LumberPile lot={lot} left={1 - cl(p / 0.6)} />
  </>; };
/** stacked boards + canvas rolls beside the lot; `left` 1..0 = how much is still unused (boards removed from the top) */
const BOARDS = 14;
const pileKit = () => once("bPile", () => { const M = cm(), k = new Kit(); for (let i = 0; i < BOARDS; i++) { const row = Math.floor(i / 4), c = i % 4; k.box(M.woodLight, [3.2, 0.12, 0.28], [0, 0.07 + row * 0.13, -0.45 + c * 0.3], [0, (row % 2) * 0.03, 0]); } return k; });
const LumberPile: React.FC<{ lot: number; left: number }> = ({ lot, left }) => { const L = LOTS.find((l) => l.i === lot)!.s, M = cm(), T = tMats(); const n = Math.round(left * BOARDS); if (n <= 0) return null;
  const ry = L.ry, ox = Math.cos(ry) * (L.w / 2 + 2.2), oz = -Math.sin(ry) * (L.w / 2 + 2.2);
  return <group position={[L.x + ox, ROOF_Y + 0.05, L.z + oz - 3]} rotation={[0, ry, 0]}>
    {Array.from({ length: n }, (_, i) => { const row = Math.floor(i / 4), c = i % 4; return <mesh key={i} position={[0, 0.07 + row * 0.13, -0.45 + c * 0.3]} material={M.woodLight} castShadow><boxGeometry args={[3.2, 0.12, 0.28]} /><Ink k={0.4} /></mesh>; })}
    {left > 0.4 && [0, 1].map((i) => <mesh key={`r${i}`} position={[0.4 - i * 0.9, 0.18, 0.9]} rotation={[Math.PI / 2, 0, 0]} material={T.walls[(lot + i) % 9]}><cylinderGeometry args={[0.18, 0.18, 1.6, 14]} /><Ink k={0.4} /></mesh>)}
  </group>; };
void pileKit;

/** painted road stripe along x from x0 to xRoller (only behind the roller) + the roller + paint tray */
export const RoadStripe: React.FC<{ z: number; x0: number; x: number }> = ({ z, x0, x }) => { const M = cm(); const len = Math.max(0.01, x - x0);
  return <>
    <mesh position={[x0 + len / 2, ROOF_Y + 0.085, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[len, 0.14]} /><meshStandardMaterial color="#f2efe2" roughness={0.6} polygonOffset polygonOffsetFactor={-3} /></mesh>
    <group position={[x + 0.12, ROOF_Y + 0.1, z]}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 0.24, 12]} /><meshStandardMaterial color="#e8e4d4" /><Ink k={0.4} /></mesh>
      <mesh position={[0.35, 0.42, 0]} rotation={[0, 0, 0.9]}><cylinderGeometry args={[0.012, 0.012, 1.1, 6]} /><primitive object={M.wood} attach="material" /></mesh></group>
    <mesh position={[x0 - 0.8, ROOF_Y + 0.12, z + 0.7]}><boxGeometry args={[0.4, 0.08, 0.3]} /><primitive object={M.steel} attach="material" /><Ink k={0.4} /></mesh>
  </>; };

/** timber derrick (gin pole + boom) at the roof edge, hoisting a bundle from the street to the roof */
export const DERRICK: V3 = [6, ROOF_Y, FZ - 2.2];
const derrickKit = () => once("bDerrick", () => { const M = cm(), k = new Kit();
  k.rod(M.timber, [0, 0, 0], [0, 9, 0], 0.16, 10); for (const a of [0.6, 2.6, 4.6]) k.rod(M.steelDark, [0, 8.8, 0], [Math.cos(a) * 6, 0.05, Math.sin(a) * 6 - 2.5], 0.015, 4, { ink: false });
  k.span(M.steel, [-0.6, 0, -0.6], [0.6, 0.15, 0.6]); k.cyl(M.castIron, 0.25, 0.25, 0.5, [-0.9, 0.5, -0.6], [Math.PI / 2, 0, 0], 14); k.span(M.steelDark, [-1.3, 0, -1.0], [-0.5, 0.25, -0.2]);
  return k; });
/** hoist: t 0..1 bundle path from the truck bed (street) up to the boom tip, then swung in over the roof */
export const Derrick: React.FC<{ t: number; swing: number }> = ({ t, swing }) => { const M = cm(), tip: V3 = [Math.sin(swing) * -5.5, 8.6, Math.cos(swing) * 5.5];
  const hang = lerp(-ROOF_Y + 1.6, 1.4, cl(t));   // bundle y relative to the roof (street -> roof height)
  const b: V3 = [tip[0], hang, tip[2]];
  const rope = (a: V3, c: V3) => { const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c), d = C.clone().sub(A), L = d.length(); return <mesh position={A.clone().add(C).multiplyScalar(0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())}><cylinderGeometry args={[0.02, 0.02, L, 5]} /><primitive object={M.castIron} attach="material" /></mesh>; };
  return <group position={DERRICK}>
    <KitMesh kit={derrickKit()} />
    {rope([0, 1.2, 0], tip)}{rope([0, 0.5, -0.6], [0, 8.9, 0])}
    {rope(tip, [b[0], b[1] + 0.9, b[2]])}
    <group position={b}><mesh material={M.woodLight} castShadow><boxGeometry args={[2.4, 0.5, 0.9]} /><Ink k={0.5} /></mesh>{rope([-1.0, 0.25, 0], [0, 0.9, 0])}{rope([1.0, 0.25, 0], [0, 0.9, 0])}</group>
  </group>; };
