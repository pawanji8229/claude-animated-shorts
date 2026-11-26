// The planning office (1942): wood wainscot + plaster, tall window with venetian blinds (morning light), green banker's
// lamps, wall map of Seattle, filing cabinet, telephone, rolled plans + papers, and the 1:200 table model of Plant 2 with
// its streets, the river and the surrounding houses (built with the same house generator as the real city, scaled).
// Own set, placed far from the plant: origin at the room's floor centre, window wall at z = -3.2, table centre (0, 0.78, 0).
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { archMats } from "../short3/archKit";
import { cm } from "../centennial/mats";
import { addHouse, tMats } from "./town";
import { rng, type V3 } from "../../lib/math";

export const OFFICE_AT: V3 = [0, 0, 600];          // world position of the office set (far from the plant)
export const TABLE_Y = 0.8, MODEL_S = 1 / 200;
export const MODEL_C: V3 = [0, TABLE_Y + 0.06, 0];   // model ground centre (local to the office)
const officeKit = () => once("b2Office", () => { const A = archMats(), M = cm(), k = new Kit();
  k.span(A.floorWood, [-3.4, -0.05, -3.4], [3.4, 0, 3.4], { ink: false });
  // walls: plaster above dado, dark wood wainscot, window wall with a tall 2-sash window + blinds
  const wall = (len: number, win: boolean) => { const w = new Kit(), h = len / 2; w.span(M.plasterOld, [-h, 1.1, -0.15], [h, 3.3, 0], { ink: false }); w.span(M.wainscot, [-h, 0, -0.17], [h, 1.1, 0.02], { ink: false }); w.span(M.joist, [-h, 1.06, -0.18], [h, 1.14, 0.04], { ink: false }); w.span(M.joist, [-h, 3.1, -0.18], [h, 3.3, 0.03], { ink: false });
    if (win) { w.span(A.frameCream, [-1.0, 1.0, -0.2], [1.0, 2.95, 0.04]); w.add(A.glass, new THREE.PlaneGeometry(1.8, 1.8), [0, 1.95, 0.045]); for (let y = 1.1; y < 2.9; y += 0.06) w.span(A.blind, [-0.88, y, 0.06], [0.88, y + 0.035, 0.08], { ink: false }); w.span(A.frameCream, [-0.04, 1.0, 0.04], [0.04, 2.95, 0.09], { ink: false }); }
    return w; };
  k.merge(wall(6.8, true), [0, 0, -3.2]); k.merge(wall(6.8, false), [-3.2, 0, 0], [0, Math.PI / 2, 0]); k.merge(wall(6.8, false), [3.2, 0, 0], [0, -Math.PI / 2, 0]);
  // big model table + legs, second desk with lamp, phone, papers; filing cabinet; wall map; chairs
  k.span(M.wood, [-1.0, TABLE_Y - 0.06, -0.75], [1.0, TABLE_Y, 0.75]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(M.wood, [0.08, TABLE_Y - 0.06, 0.08], [sx * 0.9, (TABLE_Y - 0.06) / 2, sz * 0.65]);
  k.span(M.woodLight, [-0.86, TABLE_Y, -0.6], [0.86, TABLE_Y + 0.05, 0.6]);                      // model base board
  k.span(M.wood, [1.6, 0.74, -2.6], [2.9, 0.79, -1.9]); for (const x of [1.65, 2.85]) k.span(M.wood, [x - 0.04, 0, -2.58], [x + 0.04, 0.74, -1.92]);
  k.span(M.paper, [1.8, 0.79, -2.4], [2.3, 0.795, -2.05], { ink: false }); k.span(M.paper, [2.0, 0.795, -2.35], [2.45, 0.8, -2.0], { ink: false });
  k.cyl(M.paper, 0.04, 0.04, 0.9, [-0.4, TABLE_Y + 0.04, 0.68], [0, 0, Math.PI / 2], 10, { ink: false }); k.cyl(M.paper, 0.035, 0.035, 0.8, [0.3, TABLE_Y + 0.035, 0.7], [0, 0, Math.PI / 2], 10, { ink: false });
  k.span(M.black, [2.55, 0.79, -2.55], [2.8, 0.86, -2.35]); k.box(M.black, [0.22, 0.05, 0.06], [2.67, 0.89, -2.45]);
  for (let i = 0; i < 3; i++) k.span(M.locker, [-3.0, i * 0.45, -2.9], [-2.45, i * 0.45 + 0.43, -2.3]); for (let i = 0; i < 3; i++) k.span(M.brass, [-2.46, i * 0.45 + 0.3, -2.62], [-2.44, i * 0.45 + 0.34, -2.56], { ink: false });
  for (const [x, z, ry] of [[1.25, 0.1, -Math.PI / 2], [-1.3, -0.2, Math.PI / 2]] as [number, number, number][]) { const c = new Kit(); c.span(M.wood, [-0.22, 0.45, -0.22], [0.22, 0.5, 0.22]); c.span(M.wood, [-0.22, 0.5, 0.18], [0.22, 0.95, 0.22]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.box(M.wood, [0.04, 0.45, 0.04], [sx * 0.19, 0.22, sz * 0.19]); k.merge(c, [x, 0, z], [0, ry, 0]); }
  k.span(M.wood, [-3.15, 1.4, -1.6], [-3.12, 2.6, 0.6]);
  return k; });
const mapTex = () => once("b2Map", () => { const c = document.createElement("canvas"); c.width = 512; c.height = 300; const g = c.getContext("2d")!, r = rng(4);
  g.fillStyle = "#efe6cc"; g.fillRect(0, 0, 512, 300); g.fillStyle = "#9ab8c8"; g.beginPath(); g.moveTo(0, 0); g.lineTo(150, 0); g.bezierCurveTo(120, 90, 190, 170, 140, 300); g.lineTo(0, 300); g.fill(); g.strokeStyle = "#7a9aac"; g.lineWidth = 6; g.beginPath(); g.moveTo(230, 300); g.bezierCurveTo(250, 200, 210, 140, 260, 60); g.stroke();
  g.strokeStyle = "rgba(90,70,50,0.35)"; g.lineWidth = 1; for (let x = 160; x < 512; x += 14) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 6, 300); g.stroke(); } for (let y = 0; y < 300; y += 14) { g.beginPath(); g.moveTo(150, y); g.lineTo(512, y + 4); g.stroke(); }
  g.fillStyle = "#b8463a"; g.fillRect(262, 170, 26, 16); g.strokeStyle = "#b8463a"; g.lineWidth = 3; g.beginPath(); g.arc(275, 178, 24, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(120,100,80,0.4)"; g.fillRect(170 + r() * 330, r() * 290, 6, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; });
/** 1:200 model: plant box (sash sides, grey roof), streets, river strip, houses around; `roofHouses` = 0..n tiny houses placed on the model roof */
const modelKit = () => once("b2Model", () => { const T = tMats(), A = archMats(), k = new Kit(), s = MODEL_S, y = MODEL_C[1], r = rng(31);
  k.span(T.lawnReal, [-0.84, y - 0.005, -0.58], [0.84, y, 0.58], { ink: false });
  k.span(T.water, [-0.84, y - 0.004, -0.58], [-0.72, y + 0.001, 0.58], { ink: false });
  k.span(T.roadReal, [-0.7, y, 0.4], [0.84, y + 0.002, 0.46], { ink: false }); for (const z of [-0.46, 0.52]) k.span(T.roadReal, [-0.7, y, z - 0.02], [0.84, y + 0.002, z + 0.02], { ink: false });
  const fx = 220 * s / 2, fz = 130 * s / 2, fh = 16.4 * s;
  k.span(A.brickC, [-fx, y, -fz], [fx, y + fh, fz], { ink: 0.5 }); k.span(new THREE.MeshStandardMaterial({ color: "#9a9a94", roughness: 0.85 }), [-fx, y + fh, -fz], [fx, y + fh + 0.003, fz], { ink: false }); for (let i = 1; i < 8; i++) k.span(A.frameCream, [-fx + i * fx / 4 - 0.004, y + fh + 0.003, -fz], [-fx + i * fx / 4 + 0.004, y + fh + 0.006, fz], { ink: false });
  const H = new Kit(); for (let z = -0.5; z < 0.56; z += 0.16) for (let x = -0.66; x < 0.82; x += 0.06) { if (Math.abs(x) < fx + 0.04 && Math.abs(z) < fz + 0.04) continue; if (Math.abs(z - 0.43) < 0.04) continue; if (r() < 0.12) continue;
    addHouse(H, { x: x / s, z: z / s, ry: r() < 0.5 ? 0 : Math.PI, w: 7, d: 6.5, h: 2.9, roof: "gable", wall: Math.floor(r() * 9), roofC: Math.floor(r() * 7), door: 0, chimney: false, porch: false, seed: Math.floor(r() * 1e6) }, false, 0, true); }
  k.merge(H, [0, y, 0], [0, 0, 0], [s, s, s]);
  return k; });
/** a tiny model tree (comically small next to the model plant) */
export const ModelTree: React.FC<{ p: V3 }> = ({ p }) => { const T = tMats(); return <group position={p}><mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.0015, 0.002, 0.024, 6]} /><primitive object={T.bark} attach="material" /></mesh><mesh position={[0, 0.03, 0]}><sphereGeometry args={[0.014, 10, 8]} /><primitive object={T.leaf} attach="material" /></mesh></group>; };
/** a tiny model house (for the roof idea) */
export const ModelHouse: React.FC<{ p: V3; seed: number }> = ({ p, seed }) => { const kit = useMemo(() => once(`b2MH${seed}`, () => { const k = new Kit(), H = new Kit(); addHouse(H, { x: 0, z: 4.5, ry: 0, w: 7, d: 6.5, h: 2.9, roof: "gable", wall: seed % 9, roofC: seed % 7, door: 0, chimney: true, porch: false, seed }, false, 0, true); k.merge(H, [0, 0, 0], [0, 0, 0], [MODEL_S * 1.6, MODEL_S * 1.6, MODEL_S * 1.6]); return k; }), [seed]);
  return <group position={p}><KitMesh kit={kit} /></group>; };
export const Office: React.FC = () => { const M = cm(), mapM = useMemo(() => new THREE.MeshStandardMaterial({ map: mapTex(), roughness: 0.8 }), []);
  return <group position={OFFICE_AT}>
    <KitMesh kit={officeKit()} /><KitMesh kit={modelKit()} />
    <mesh position={[3.18, 1.95, -0.5]} rotation={[0, -Math.PI / 2, 0]} material={mapM}><planeGeometry args={[2.1, 1.25]} /></mesh>
    {/* banker's lamps (green glass shade, brass), warm pools of light */}
    {([[2.6, 0.79, -2.15], [-0.82, TABLE_Y + 0.05, 0.52]] as V3[]).map((p, i) => <group key={i} position={p}>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.07, 0.08, 0.03, 16]} /><primitive object={M.brass} attach="material" /></mesh>
      <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.012, 0.012, 0.3, 8]} /><primitive object={M.brass} attach="material" /></mesh>
      <mesh position={[0, 0.33, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.07, 0.07, 0.26, 16, 1, true, 0, Math.PI]} /><meshStandardMaterial color="#1f5a3a" roughness={0.3} side={THREE.DoubleSide} emissive="#2a8a50" emissiveIntensity={0.25} /></mesh>
      <pointLight position={[0, 0.28, 0]} color="#ffd8a0" intensity={2.2} distance={4} decay={1.6} /></group>)}
    <pointLight position={[0, 2.9, -2.6]} color="#e8f0ff" intensity={4} distance={9} decay={1.4} />
  </group>; };
