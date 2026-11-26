// Boeing Plant 2 stand-in (scaled, simplified; original design after period aircraft plants). World frame: building
// footprint x in [-110, 110], z in [-65, 65]; floor y = 0; roof deck top y = ROOF_Y (the fake town stands on it).
// Street façade = +z (East Marginal Way side) with the great sliding hangar door; rail spur along +x.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { archMats, signTex } from "../short3/archKit";
import { cm } from "../centennial/mats";
import { B17, standKit, b17Mats, FUS_Y } from "./b17";
import type { V3 } from "../../lib/math";

export const FX = 110, FZ = 65, ROOF_Y = 16.4, WALL_H = 16.0;
export const DOOR = { x0: -32, x1: 32, h: 13 };
export const COL_X = Array.from({ length: 11 }, (_, i) => -100 + i * 20);   // -100..100
export const COL_Z = [-48, 0, 48];
/** the two assembly lines: [x, z, stage] (nose +x) */
export const LINE: [number, number, number][] = [
  ...[-84, -56, -28, 0, 28, 56, 84].map((x, i) => [x, -25, [0, 1, 1, 2, 2, 3, 3][i]] as [number, number, number]),
  ...[-84, -56, -28, 0, 28, 56, 84].map((x, i) => [x, 25, [1, 1, 2, 2, 3, 3, 3][i]] as [number, number, number]),
];
export const LAMP_ROWS = { xs: Array.from({ length: 20 }, (_, i) => -104 + i * 11), zs: [-56, -40, -25, -10, 10, 25, 40, 56], y: 12.2 };

const sashTex = () => once("bSash", () => { const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d")!;
  g.fillStyle = "#2c3236"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 64; i++) { const x = (i % 8) * 32, y = Math.floor(i / 8) * 32; const v = 40 + ((i * 37) % 23); g.fillStyle = `rgb(${v},${v + 6},${v + 10})`; g.fillRect(x + 3, y + 3, 26, 26); if ((i * 13) % 9 === 0) { g.fillStyle = "rgba(255,240,210,0.35)"; g.fillRect(x + 3, y + 3, 26, 26); } }
  g.strokeStyle = "#1a1d20"; g.lineWidth = 3; for (let x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(256, x); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 3.2, 1 / 3.2); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
const bMats = () => once("bMats", () => { const A = archMats(), M = cm(); return {
  A, M, sash: new THREE.MeshStandardMaterial({ map: sashTex(), roughness: 0.25, metalness: 0.4, envMapIntensity: 1.2 }),
  sashIn: new THREE.MeshStandardMaterial({ map: sashTex(), roughness: 0.4, metalness: 0.2, emissive: new THREE.Color("#c8d4dc"), emissiveIntensity: 0.18 }),
  conc: A.sandTrim, brick: M.brick, deck: new THREE.MeshStandardMaterial({ color: "#5a5e5c", roughness: 0.9 }),
  truss: new THREE.MeshStandardMaterial({ color: "#6f7778", roughness: 0.6, metalness: 0.5 }), floor: new THREE.MeshStandardMaterial({ map: (M.concrete as THREE.MeshStandardMaterial).map, normalMap: (M.concrete as THREE.MeshStandardMaterial).normalMap, color: "#c4c4c0", roughness: 0.55 }), paint: new THREE.MeshStandardMaterial({ color: "#5d7a52", roughness: 0.6 }),
}; });

// ================================================================= shell
const shellKit = () => once("bShell", () => { const B = bMats(), k = new Kit(), A = B.A;
  const face = (len: number, door: boolean) => { const w = new Kit(), half = len / 2;
    for (let x = -half; x < half - 0.01; x += 8) { const a = x, b = x + 8, inDoor = door && b > DOOR.x0 && a < DOOR.x1;
      if (inDoor) { if (a >= DOOR.x0 && b <= DOOR.x1) { w.span(B.conc, [a, DOOR.h, -0.5], [b, WALL_H, 0]); continue; } }
      w.span(B.brick, [a, 0, -0.5], [a + 1.2, WALL_H, 0.15]);                                     // pier
      w.span(B.brick, [a + 1.2, 0, -0.5], [b, 3.6, 0]);                                           // brick plinth
      w.add(B.sash, new THREE.PlaneGeometry(6.8, 9.2), [a + 4.6, 8.2, -0.12]);                      // steel sash glazing
      w.span(A.granite, [a + 1.2, 3.6, -0.5], [b, 3.75, 0.12], { ink: false });
      for (let y = 4.0; y < 12.8; y += 1.55) w.span(B.M.steelDark, [a + 1.2, y - 0.03, -0.14], [b, y + 0.03, -0.08], { ink: false });
      w.span(B.conc, [a + 1.2, 12.8, -0.5], [b, WALL_H, 0]); }
    w.span(B.conc, [-half - 0.3, WALL_H, -0.6], [half + 0.3, WALL_H + 0.9, 0.25]);                   // parapet
    w.span(A.sandTrim, [-half - 0.4, WALL_H + 0.9, -0.7], [half + 0.4, WALL_H + 1.05, 0.35], { ink: 0.4 });
    return w; };
  k.merge(face(2 * FX, true), [0, 0, FZ]);
  k.merge(face(2 * FX, false), [0, 0, -FZ], [0, Math.PI, 0]);
  k.merge(face(2 * FZ, false), [FX, 0, 0], [0, Math.PI / 2, 0]);
  k.merge(face(2 * FZ, false), [-FX, 0, 0], [0, -Math.PI / 2, 0]);
  // door frame: steel header girder + jamb towers
  k.span(B.M.steelDark, [DOOR.x0 - 1.0, DOOR.h, FZ - 0.6], [DOOR.x1 + 1.0, DOOR.h + 1.4, FZ + 0.3]);
  for (const x of [DOOR.x0 - 1.2, DOOR.x1]) k.span(B.conc, [x, 0, FZ - 0.6], [x + 1.2, DOOR.h + 1.4, FZ + 0.4]);
  // floor (inside) with painted aisle lines
  k.span(B.floor, [-FX, -0.1, -FZ], [FX, 0.0, FZ], { ink: false });
  for (const z of [-9, 9, -41, 41]) k.span(B.M.yellowLine, [-FX + 2, 0.002, z - 0.08], [FX - 2, 0.006, z + 0.08], { ink: false });
  return k; });
const roofKit = () => once("bRoof", () => { const B = bMats(), k = new Kit();
  k.span(B.deck, [-FX, WALL_H - 0.2, -FZ], [FX, ROOF_Y, FZ], { ink: false });
  return k; });
/** interior structure: columns, Pratt trusses spanning z, purlins, bracing, lamp fixtures (emissive) */
const structureKit = () => once("bStruct", () => { const B = bMats(), k = new Kit(), T = B.truss, ty0 = 12.6, ty1 = WALL_H - 0.25;
  for (const x of COL_X) for (const z of COL_Z) { k.span(T, [x - 0.25, 0, z - 0.2], [x + 0.25, ty0, z + 0.2]); k.span(B.conc, [x - 0.5, 0, z - 0.5], [x + 0.5, 0.25, z + 0.5]); }
  for (const x of COL_X) { // a truss along z over each column line (and at mid-span, carried by a girder)
    for (const xx of [x, x + 10]) { if (xx > FX - 2) continue;
      k.span(T, [xx - 0.15, ty1 - 0.25, -FZ], [xx + 0.15, ty1, FZ]); k.span(T, [xx - 0.15, ty0, -FZ], [xx + 0.15, ty0 + 0.25, FZ]);
      for (let z = -FZ; z < FZ; z += 4) { k.rod(T, [xx, ty0 + 0.12, z], [xx, ty1 - 0.12, z], 0.06, 4, { ink: false }); k.rod(T, [xx, ty0 + 0.12, z], [xx, ty1 - 0.12, z + 4], 0.05, 4, { ink: false }); } } }
  for (const z of COL_Z) k.span(T, [-FX, ty0 - 0.6, z - 0.2], [FX, ty0, z + 0.2]);
  for (let z = -FZ + 2; z < FZ; z += 4) k.span(T, [-FX, ty1 - 0.05, z - 0.06], [FX, ty1 + 0.1, z + 0.06], { ink: false });
  // lamp fixtures: dome reflector + bulb on a rod drop
  for (const x of LAMP_ROWS.xs) for (const z of LAMP_ROWS.zs) { k.rod(B.M.steelDark, [x, LAMP_ROWS.y + 0.3, z], [x, ty0, z], 0.015, 4, { ink: false });
    k.lathe(B.M.greenEnamel, [[0.06, 0.32], [0.18, 0.28], [0.42, 0.06], [0.46, 0.0]], [x, LAMP_ROWS.y, z], 16, [0, 0, 0], { ink: 0.3 }); }
  return k; });
const bulbsKit = () => once("bBulbs", () => { const B = bMats(), k = new Kit(); for (const x of LAMP_ROWS.xs) for (const z of LAMP_ROWS.zs) k.sphere(B.M.lamp, 0.13, [x, LAMP_ROWS.y + 0.02, z], [1, 0.7, 1], { ink: false }); return k; });

// ================================================================= floor equipment
const equipKit = () => once("bEquip", () => { const B = bMats(), M = B.M, k = new Kit(), m = b17Mats();
  // wing jigs (tall steel frames holding wing panels upright) along the -x end
  for (let i = 0; i < 4; i++) { const x = -102 + i * 0, z = -52 + i * 9;
    for (const dx of [-7, 7]) k.span(M.steel, [x + dx - 0.2, 0, z - 0.2], [x + dx + 0.2, 7.5, z + 0.2]); k.span(M.steel, [x - 7.2, 7.3, z - 0.25], [x + 7.2, 7.7, z + 0.25]); k.span(M.steel, [x - 7.2, 0.5, z - 0.25], [x + 7.2, 0.9, z + 0.25]);
    k.ext(m.alu, [[-6.2, 1.0], [6.2, 1.0], [5.0, 7.1], [-5.6, 7.1]], 0.45, [x, 0, z]); }
  // parts racks + benches along the walls (detail at the eye line)
  for (let x = -98; x < 98; x += 9) for (const zs of [-1, 1]) { const z = zs * (FZ - 2.2);
    k.span(M.steel, [x - 2.0, 0, z - 0.6], [x + 2.0, 0.9, z + 0.6]); k.span(M.woodLight, [x - 2.1, 0.9, z - 0.65], [x + 2.1, 0.96, z + 0.65]);
    for (let j = 0; j < 4; j++) k.box([M.locker, m.alu, M.yellowLine, M.redMod][(j + Math.round(x)) & 3], [0.45, 0.3 + (j % 2) * 0.15, 0.4], [x - 1.4 + j * 0.9, 1.15 + (j % 2) * 0.07, z]);
    k.span(M.steel, [x - 2.0, 2.2, z + zs * 0.4 - 0.05], [x + 2.0, 2.26, z + zs * 0.4 + 0.45]); }
  // parts carts + compressor tanks + hose reels by every second aircraft
  return k; });
const CART = (B: ReturnType<typeof bMats>) => once("bCart", () => { const M = B.M, k = new Kit(), m = b17Mats();
  k.span(M.steel, [-1.2, 0.45, -0.6], [1.2, 0.52, 0.6]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(M.rubber, 0.18, 0.18, 0.1, [sx * 1.0, 0.18, sz * 0.5], [Math.PI / 2, 0, 0], 12);
  k.rod(M.steel, [1.2, 0.52, -0.5], [1.6, 1.1, -0.5], 0.025); k.rod(M.steel, [1.2, 0.52, 0.5], [1.6, 1.1, 0.5], 0.025); k.rod(M.steel, [1.6, 1.1, -0.5], [1.6, 1.1, 0.5], 0.025);
  for (let i = 0; i < 3; i++) k.ext(m.alu, [[-0.9, 0], [0.9, 0], [0.7, 0.25], [-0.7, 0.25]], 1.0, [0, 0.55 + i * 0.27, 0]); return k; });
export const Cart: React.FC<{ p: V3; ry: number }> = ({ p, ry }) => <group position={p} rotation={[0, ry, 0]}><KitMesh kit={CART(bMats())} /></group>;

/** the whole plant. roof: false for the two-worlds reveal (the roof dissolves away in the layer above) */
export const Factory: React.FC<{ roof?: boolean; interior?: boolean; door?: number; prop?: number; lights?: number }> = ({ roof = true, interior = true, door = 0.75, prop = 0, lights = 1 }) => {
  const B = bMats();
  const signM = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex("BOEING AIRPLANE COMPANY", "#f2ede0", "#22304a", 1800, 160, "Arial Black, Arial, sans-serif", "#22304a"), roughness: 0.5 }), []);
  const leafKit = useMemo(() => once("bLeaf", () => { const k = new Kit(), w = 8, P = new THREE.MeshStandardMaterial({ color: "#7d877c", roughness: 0.6, metalness: 0.3 }); k.span(P, [-w / 2, 0, -0.25], [w / 2, DOOR.h - 0.1, 0.0]); for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) k.span(B.truss, [x - 0.15, 0, 0], [x + 0.15, DOOR.h - 0.1, 0.08]); for (let y = 1; y < DOOR.h; y += 1.6) k.span(B.truss, [-w / 2, y, 0.0], [w / 2, y + 0.1, 0.06], { ink: false }); k.add(B.sash, new THREE.PlaneGeometry(w - 0.8, 3.0), [0, DOOR.h - 2.4, 0.07]); return k; }), [B]);
  const open = door, nLeaf = 8, leafW = 8;
  return <>
    <KitMesh kit={shellKit()} />
    {roof && <KitMesh kit={roofKit()} />}
    {/* sliding door leaves: telescope towards both jambs as the door opens */}
    {Array.from({ length: nLeaf }, (_, i) => { const side = i < nLeaf / 2 ? -1 : 1, j = side < 0 ? i : nLeaf - 1 - i, closedX = DOOR.x0 + leafW / 2 + i * leafW;
      const openX = side < 0 ? DOOR.x0 + leafW / 2 - 6 + j * 1.2 : DOOR.x1 - leafW / 2 + 6 - j * 1.2; const x = closedX + (openX - closedX) * open;
      return <group key={i} position={[x, 0, FZ + 0.6 + j * 0.32]}><KitMesh kit={leafKit} /></group>; })}
    <mesh position={[0, DOOR.h + 0.7, FZ + 0.32]}><planeGeometry args={[36, 1.25]} /><primitive object={signM} attach="material" /></mesh>
    {interior && <>
      <KitMesh kit={structureKit()} /><KitMesh kit={bulbsKit()} /><KitMesh kit={equipKit()} />
      {LINE.map(([x, z, s], i) => <group key={i} position={[x, 0, z]}><B17 stage={s} prop={prop} />{s <= 2 && <KitMesh kit={standKit(16, FUS_Y + 0.4)} />}</group>)}
      {[[-70, 0, -8], [-14, 0, 8], [42, 0, -10], [70, 0, 10], [-42, 0, 40]].map((p, i) => <Cart key={i} p={p as V3} ry={i * 0.9} />)}
      {/* lamp light: a few broad point lights (no shadows) + the overhead "sun" the Set provides as the key */}
      {[-80, -40, 0, 40, 80].flatMap((x) => [-25, 25].map((z) => <pointLight key={`${x}${z}`} position={[x, 11, z]} color="#fff0d6" intensity={110 * lights} distance={85} decay={1.5} />))}
    </>}
  </>;
};
export { FUS_Y };
