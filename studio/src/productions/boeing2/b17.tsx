// B-17 Flying Fortress (original procedural model after the real proportions: length 22.7 m, span 31.6 m, height 5.8 m).
// Natural-aluminium skin with panel lines + rivet rows (metre UVs), oval fuselage with the big dorsal fin, glazed nose +
// cockpit, top / ball / chin turrets, waist windows, low-mid tapered wing with dihedral, four radial engines in nacelles
// (cowling rings, cylinder heads, three-blade props), main gear under the inboard nacelles + tail wheel, national
// insignia. Assembly STAGES for the production line: 0 bare fuselage section (primer-green frames exposed at the open
// break), 1 fuselage skinned, 2 + wings / stabilisers, 3 complete (engines, props, turrets, insignia).
// Local frame: +x = nose, y up (ground at y = 0 on its gear), z = right wing.
import React, { useMemo } from "react";
import * as THREE from "three";
import { pm } from "./pbr";
import { Kit, KitMesh, once } from "../short3/kit";
import { cm } from "../centennial/mats";
import type { V3 } from "../../lib/math";

const panelTex = () => once("b217panel", () => { const c = document.createElement("canvas"); c.width = 512; c.height = 512; const g = c.getContext("2d")!;
  g.fillStyle = "#c4c9cc"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(${200 + (i * 37) % 30},${205 + (i * 53) % 25},${208 + (i * 29) % 20},0.35)`; g.fillRect((i * 97) % 512, (i * 61) % 512, 120 + (i * 13) % 90, 70 + (i * 7) % 60); }
  g.strokeStyle = "rgba(70,74,78,0.55)"; g.lineWidth = 2; for (let x = 0; x <= 512; x += 170) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); } for (let y = 0; y <= 512; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.fillStyle = "rgba(60,64,68,0.45)"; for (let x = 0; x <= 512; x += 170) for (let y = 4; y < 512; y += 9) { g.beginPath(); g.arc(x + 5, y, 1.1, 0, Math.PI * 2); g.fill(); }
  for (let y = 0; y <= 512; y += 128) for (let x = 4; x < 512; x += 9) { g.beginPath(); g.arc(x, y + 5, 1.1, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 2.2, 1 / 2.2); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
const starTex = () => once("b217star", () => { const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d")!; g.clearRect(0, 0, 512, 256);
  g.fillStyle = "#1f2f5e"; g.fillRect(40, 92, 432, 72); g.beginPath(); g.arc(256, 128, 112, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#f4f4f2"; g.fillRect(60, 104, 392, 48); g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 40 : 100; g.lineTo(256 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
export const b17Mats = () => once("b217mats", () => ({
  alu: (() => { const m = new THREE.MeshStandardMaterial({ map: panelTex(), color: "#ffffff", metalness: 0.8, roughness: 0.32 }), a = pm("aluminium", 1.2); m.normalMap = a.normalMap; m.roughnessMap = a.roughnessMap; m.normalScale.set(0.6, 0.6); return m; })(),
  aluDark: new THREE.MeshStandardMaterial({ color: "#8e9599", metalness: 0.7, roughness: 0.4 }),
  primer: new THREE.MeshStandardMaterial({ color: "#7d9a4a", roughness: 0.6, metalness: 0.15 }),    // zinc-chromate green
  od: new THREE.MeshStandardMaterial({ color: "#545a3a", roughness: 0.7 }),                          // olive drab anti-glare panel
  glass: new THREE.MeshPhysicalMaterial({ color: "#9fb6c4", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 1.6, depthWrite: false }),
  frame: new THREE.MeshStandardMaterial({ color: "#3a3e42", metalness: 0.6, roughness: 0.4 }),
  prop: new THREE.MeshStandardMaterial({ color: "#1c1c1e", roughness: 0.5 }), tipY: new THREE.MeshStandardMaterial({ color: "#e8c22a", roughness: 0.5 }),
  rubber: new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.85 }),
  star: new THREE.MeshStandardMaterial({ map: starTex(), transparent: true, roughness: 0.5, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2 }),
}));

// fuselage radius (width) along x, nose +11.3 -> tail -11.3; height factor 1.14 (oval)
const FUS: [number, number][] = [[11.3, 0.12], [11.0, 0.62], [10.4, 0.92], [9.4, 1.1], [7.6, 1.2], [5.0, 1.24], [2.0, 1.24], [-1.0, 1.2], [-3.5, 1.06], [-6.0, 0.84], [-8.5, 0.56], [-10.4, 0.32], [-11.3, 0.12]];
export const FUS_Y = 2.55;                      // fuselage axis height on the gear
const rAt = (x: number) => { for (let i = 0; i < FUS.length - 1; i++) { const [x0, r0] = FUS[i], [x1, r1] = FUS[i + 1]; if (x <= x0 && x >= x1) return r0 + (r1 - r0) * ((x0 - x) / (x0 - x1)); } return 0.1; };
/** lathe fuselage section between xa (front) and xb (rear) (open ends allowed) */
const fusSection = (k: Kit, mat: THREE.Material, xa: number, xb: number, seg = 40) => {
  const pts: THREE.Vector2[] = []; const n = 28; for (let i = 0; i <= n; i++) { const x = xb + ((xa - xb) * i) / n; pts.push(new THREE.Vector2(rAt(x), x)); }
  const g = new THREE.LatheGeometry(pts, seg); const uv = g.attributes.uv as THREE.BufferAttribute, pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2.5, pos.getY(i));
  k.add(mat, g, [0, FUS_Y, 0], [0, 0, -Math.PI / 2], [1, 1.14, 1]);
};
const wingPlan = (span: number, rootLE: number, rootTE: number, tipLE: number, tipTE: number, z0: number): [number, number][] => [[rootLE, z0], [tipLE, span - 0.4], [tipLE - 0.6, span], [tipTE + 0.3, span], [tipTE, span - 0.3], [rootTE, z0]];
/** thin cambered panel: planform (x, z) extruded downwards, rotated flat, then dihedral */
const panel = (k: Kit, mat: THREE.Material, plan: [number, number][], thick: number, p: V3, dihedral = 0, side = 1) => {
  const pts = plan.map(([x, z]) => [x, z * side] as [number, number]); if (side < 0) pts.reverse();
  k.ext(mat, pts, thick, p, [Math.PI / 2, 0, 0], Math.min(0.08, thick * 0.4), { ink: 0.5 });
  void dihedral;
};

const fuselageKit = (stage: number) => once(`b217fus${stage}`, () => { const M = b17Mats(), k = new Kit();
  if (stage === 0) { // front half skinned, rear half frames only (primer green), open at the break
    fusSection(k, M.alu, 11.3, 1.0);
    for (let x = 0.6; x > -10.6; x -= 0.6) { const r = rAt(x); k.torus(M.primer, r - 0.03, 0.035, [x, FUS_Y, 0], [0, Math.PI / 2, 0], Math.PI * 2, { ink: 0.3 }); k.add(M.primer, new THREE.TorusGeometry(r - 0.03, 0.035, 6, 32), [x, FUS_Y, 0], [0, Math.PI / 2, 0], [1, 1.14, 1], { ink: 0.3 }); }
    for (let a = 0; a < 16; a++) { const ang = (a / 16) * Math.PI * 2; const pts: V3[] = []; for (let x = 0.6; x > -10.6; x -= 1.2) pts.push([x, FUS_Y + Math.sin(ang) * rAt(x) * 1.14, Math.cos(ang) * rAt(x)]); for (let i = 0; i < pts.length - 1; i++) k.rod(M.primer, pts[i], pts[i + 1], 0.025, 4, { ink: false }); }
    k.span(M.aluDark, [-10.6, FUS_Y - 0.9, -0.5], [0.6, FUS_Y - 0.85, 0.5], { ink: false });   // floor keel
    return k; }
  fusSection(k, M.alu, 11.3, -11.3);
  // glazed nose + cockpit, anti-glare panel, waist windows, radio-room hatch, frames
  k.sphere(M.glass, 0.78, [10.55, FUS_Y + 0.05, 0], [1.05, 1.0, 1.0]); for (let a = -2; a <= 2; a++) k.torus(M.frame, 0.66 + Math.abs(a) * -0.05, 0.015, [10.6 + a * 0.12, FUS_Y + 0.05, 0], [0, Math.PI / 2, 0], Math.PI * 2, { ink: false });
  k.ext(M.glass, [[0, 0], [1.9, 0], [1.45, 0.62], [0.35, 0.62]], 1.7, [6.9, FUS_Y + 1.05, 0], [0, 0, 0], 0.04, { ink: 0.4 });
  for (const x of [7.15, 7.6, 8.05, 8.5]) k.span(M.frame, [x - 0.02, FUS_Y + 1.05, -0.86], [x + 0.02, FUS_Y + 1.6, 0.86], { ink: false });
  k.ext(M.od, [[0, 0], [1.6, 0], [1.6, 0.06], [0, 0.06]], 1.5, [8.85, FUS_Y + 1.1, 0], [0, 0, -0.18]);
  for (const s of [-1, 1]) { k.span(M.frame, [-4.9, FUS_Y + 0.2, s * 1.0 - 0.02], [-3.7, FUS_Y + 0.85, s * 1.0 + 0.02], { ink: 0.3 }); for (const x of [5.6, 5.0, 2.8]) k.span(M.frame, [x - 0.18, FUS_Y + 0.35, s * 1.2 - 0.01], [x + 0.18, FUS_Y + 0.62, s * 1.2 + 0.01], { ink: false }); }
  // dorsal fin (long fillet) + rudder, tail-gun position
  k.ext(M.alu, [[-3.8, 0], [-11.0, 0], [-11.0, 4.3], [-9.8, 4.6], [-8.9, 3.0], [-6.3, 1.0]], 0.28, [0, FUS_Y + 0.75, 0], [0, 0, 0], 0.06, { ink: 0.6 });
  k.span(M.frame, [-10.95, FUS_Y + 0.9, -0.16], [-10.9, FUS_Y + 4.8, 0.16], { ink: false });
  k.box(M.glass, [0.8, 0.55, 0.6], [-11.35, FUS_Y + 0.1, 0]); k.rod(M.frame, [-11.6, FUS_Y + 0.1, 0.12], [-12.2, FUS_Y + 0.1, 0.12], 0.025); k.rod(M.frame, [-11.6, FUS_Y + 0.1, -0.12], [-12.2, FUS_Y + 0.1, -0.12], 0.025);
  return k; });
const wingKit = () => once("b217wing", () => { const M = b17Mats(), k = new Kit();
  for (const s of [-1, 1]) { panel(k, M.alu, wingPlan(15.8, 2.7, -3.1, 1.15, -0.95, 0.9), 0.5, [0, FUS_Y - 0.55, 0], 0, s);
    panel(k, M.alu, wingPlan(6.7, -8.6, -11.2, -9.9, -11.0, 0.3), 0.18, [0, FUS_Y + 0.25, 0], 0, s);
    for (let i = 0; i < 6; i++) { const z = s * (2.0 + i * 2.3); k.span(M.aluDark, [-0.6 - i * 0.12, FUS_Y - 0.31, z - 0.6], [-0.2 - i * 0.12, FUS_Y - 0.3, z + 0.6], { ink: false }); } }
  return k; });
/** engine + nacelle at its own origin (prop hub at +x) */
const engineKit = () => once("b217eng", () => { const M = b17Mats(), k = new Kit();
  k.lathe(M.alu, [[0.0, -3.4], [0.55, -3.0], [0.68, -1.2], [0.7, 0.1], [0.66, 0.35], [0.0, 0.36]], [0, 0, 0], 28, [0, 0, -Math.PI / 2], { ink: 0.5 });
  k.torus(M.aluDark, 0.62, 0.09, [0.35, 0, 0], [0, Math.PI / 2, 0], Math.PI * 2, { ink: 0.4 });
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; k.cyl(M.frame, 0.07, 0.08, 0.22, [0.32, Math.sin(a) * 0.42, Math.cos(a) * 0.42], [0, 0, Math.PI / 2], 8, { ink: false }); }
  k.sphere(M.frame, 0.18, [0.48, 0, 0], [0.9, 1, 1]);
  k.span(M.aluDark, [-2.4, -0.62, -0.18], [-0.5, -0.55, 0.18], { ink: false });     // turbo-supercharger fairing under
  return k; });
const propKit = () => once("b217prop", () => { const M = b17Mats(), k = new Kit();
  for (let b = 0; b < 3; b++) { const a = (b / 3) * Math.PI * 2; const blade = new Kit(); blade.box(M.prop, [0.07, 1.65, 0.24], [0, 0.95, 0], [0, 0.25, 0]); blade.box(M.tipY, [0.075, 0.14, 0.24], [0, 1.72, 0], [0, 0.25, 0], { ink: false }); k.merge(blade, [0, 0, 0], [a, 0, 0]); }
  k.sphere(M.aluDark, 0.2, [0.05, 0, 0], [1.3, 1, 1]); return k; });
const turretsKit = () => once("b217tur", () => { const M = b17Mats(), k = new Kit();
  k.sphere(M.glass, 0.52, [5.3, FUS_Y + 1.32, 0], [1, 0.75, 1]); k.cyl(M.frame, 0.5, 0.5, 0.18, [5.3, FUS_Y + 1.22, 0]); for (const s of [-1, 1]) k.rod(M.frame, [5.4, FUS_Y + 1.45, s * 0.1], [6.5, FUS_Y + 1.5, s * 0.1], 0.025);
  k.sphere(M.aluDark, 0.62, [-1.6, FUS_Y - 1.42, 0]); k.torus(M.frame, 0.6, 0.03, [-1.6, FUS_Y - 1.42, 0], [Math.PI / 2, 0, 0], Math.PI * 2, { ink: false });
  k.sphere(M.aluDark, 0.36, [10.1, FUS_Y - 0.82, 0], [1, 0.8, 1]); for (const s of [-1, 1]) k.rod(M.frame, [10.3, FUS_Y - 0.85, s * 0.1], [11.2, FUS_Y - 0.9, s * 0.1], 0.025);
  return k; });
const gearKit = () => once("b217gear", () => { const M = b17Mats(), k = new Kit();
  for (const s of [-1, 1]) { const z = s * 4.1; k.rod(M.frame, [0.4, FUS_Y - 1.1, z], [0.2, 0.62, z], 0.09); k.rod(M.frame, [-0.6, FUS_Y - 1.1, z], [0.2, 0.62, z], 0.05);
    k.cyl(M.rubber, 0.62, 0.62, 0.42, [0.2, 0.62, z], [Math.PI / 2, 0, 0], 28); k.cyl(M.aluDark, 0.36, 0.36, 0.44, [0.2, 0.62, z], [Math.PI / 2, 0, 0], 18, { ink: false }); }
  k.rod(M.frame, [-9.4, FUS_Y - 0.4, 0], [-9.6, 0.3, 0], 0.06); k.cyl(M.rubber, 0.3, 0.3, 0.2, [-9.6, 0.3, 0], [Math.PI / 2, 0, 0], 18);
  return k; });
const NAC: [number, number][] = [[4.1, 2.85], [7.6, 2.45]];   // [z, nacelle front x]
export const B17: React.FC<{ stage: number; prop?: number }> = ({ stage, prop = 0 }) => { const M = b17Mats();
  const starM = M.star;
  return <group>
    <KitMesh kit={fuselageKit(stage === 0 ? 0 : 1)} />
    {stage >= 2 && <KitMesh kit={wingKit()} />}
    {stage >= 3 && <>{NAC.flatMap(([z, x]) => [-1, 1].map((s) => <group key={`${z}${s}`} position={[x, FUS_Y - 0.25 + Math.abs(z) * 0.035, s * z]}>
      <KitMesh kit={engineKit()} /><group position={[0.62, 0, 0]} rotation={[prop + z, 0, 0]}><KitMesh kit={propKit()} /></group></group>))}
      <KitMesh kit={turretsKit()} />
      {[-1, 1].map((s) => <mesh key={s} position={[-5.6, FUS_Y + 0.1, s * 1.09]} rotation={[0, s > 0 ? 0 : Math.PI, 0]} material={starM}><planeGeometry args={[1.9, 0.95]} /></mesh>)}
      <mesh position={[1.0, FUS_Y - 0.28, -11.0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={starM}><planeGeometry args={[2.6, 1.3]} /></mesh></>}
    {stage >= 2 && <KitMesh kit={gearKit()} />}
  </group>; };
/** work stand around a fuselage: steel frame scaffold with plank decks + ladder (local, along x) */
export const standKit = (len: number, h: number) => once(`b217stand${len}${h}`, () => { const M = cm(), k = new Kit();
  for (const s of [-1, 1]) { const z = s * 1.9; for (let x = -len / 2; x <= len / 2 + 0.01; x += len / 4) { k.rod(M.steel, [x, 0, z], [x, h + 1.0, z], 0.04, 6); }
    k.rod(M.steel, [-len / 2, h, z], [len / 2, h, z], 0.035, 6); k.rod(M.steel, [-len / 2, h + 1.0, z], [len / 2, h + 1.0, z], 0.03, 6);
    k.span(M.woodLight, [-len / 2, h - 0.06, z - s * 0.75 - 0.35], [len / 2, h, z - s * 0.75 + 0.35]);
    for (let x = -len / 2; x < len / 2; x += len / 4) k.rod(M.steel, [x, 0.2, z], [x + len / 4, h - 0.1, z], 0.02, 4, { ink: false }); }
  for (let y = 0.3; y < h; y += 0.32) k.rod(M.steel, [len / 2 + 0.2, y, -1.6], [len / 2 + 0.2, y, -1.2], 0.015, 4, { ink: false });
  for (const z of [-1.6, -1.2]) k.rod(M.steel, [len / 2 + 0.2, 0, z], [len / 2 + 0.2, h + 1, z], 0.025, 5);
  return k; });
