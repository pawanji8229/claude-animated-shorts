// joralemon extras: the dog (original ink card, trotting gait), the imagined "ugly plant" (scene 10: a blue,
// see-through design preview that grows where No. 58 stands, then folds away), the 1907 fan unit on its timber
// foundation, the engineer's trestle with plan sheet (+ the red X he scribbles) and a little model of the street.
import React, { useMemo } from "react";
import * as THREE from "three";
import { CardSprite } from "../../char/CardSprite";
import { Kit, KitMesh, once } from "../short3/kit";
import { V3, smooth, clamp01 } from "../../lib/math";
import { pbr } from "../short3/tex";
import { jMats } from "./mats";
import { W58, EAVE } from "./world";

// ---------------------------------------------------------------- dog card (no text; ink + soft face glow like the people)
const DW = 420, DH = 300, DSOLE = 285;
const drawDog = (g: CanvasRenderingContext2D, ph: number, mask = false) => {
  g.clearRect(0, 0, DW, DH); const ink = "#241923", fur = mask ? "#ffffff" : "#f6efe4", shade = mask ? "#ffffff" : "#d9cdbd", spot = mask ? "#ffffff" : "#8a5a3a";
  const leg = (x: number, a: number) => { const kx = x + Math.sin(a) * 26, fy = DSOLE - Math.max(0, Math.cos(a)) * 12; g.strokeStyle = ink; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(x, 180); g.lineTo(kx, fy - 8); g.stroke(); g.strokeStyle = mask ? "#000" : shade; g.lineWidth = 9; g.stroke(); };
  const t = ph * Math.PI * 2; leg(150, t + Math.PI); leg(280, t);
  g.lineJoin = "round"; g.fillStyle = fur; g.strokeStyle = ink; g.lineWidth = 7; g.beginPath(); g.ellipse(215, 165, 105, 52, -0.05, 0, Math.PI * 2); g.fill(); g.stroke();
  if (!mask) { g.fillStyle = spot; g.beginPath(); g.ellipse(190, 145, 34, 22, 0.3, 0, Math.PI * 2); g.fill(); }
  leg(130, t); leg(300, t + Math.PI);
  const wag = Math.sin(t * 2) * 0.5; g.strokeStyle = ink; g.lineWidth = 12; g.beginPath(); g.moveTo(112, 150); g.quadraticCurveTo(70, 120 + wag * 30, 60 + wag * 20, 80); g.stroke(); g.strokeStyle = fur; g.lineWidth = 5; g.stroke();
  const bob = Math.sin(t * 2) * 4; g.fillStyle = fur; g.strokeStyle = ink; g.lineWidth = 7; g.beginPath(); g.ellipse(330, 112 + bob, 58, 52, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(378, 128 + bob, 30, 20, 0.2, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = mask ? "#fff" : spot; g.beginPath(); g.ellipse(304, 92 + bob, 20, 38, 0.5 + Math.sin(t * 2) * 0.1, 0, Math.PI * 2); g.fill(); g.strokeStyle = ink; g.lineWidth = 5; g.stroke();
  if (!mask) { g.fillStyle = ink; g.beginPath(); g.arc(345, 104 + bob, 7, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(404, 122 + bob, 9, 7, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.moveTo(382, 140 + bob); g.quadraticCurveTo(392, 150 + bob, 402, 140 + bob); g.stroke();
    g.fillStyle = "#c8452f"; g.fillRect(276, 140 + bob, 30, 9); }
};
export const DogToon: React.FC<{ pos: V3; cam: V3; phase: number; flip: boolean; hi: boolean }> = ({ pos, cam, phase, flip, hi }) => (
  <CardSprite W={DW} H={DH} sole={DSOLE} cardH={0.62} pos={pos} camPos={cam} texScale={hi ? 1.4 : 1.0} albedo={0.85} fill={0.25} fillColor="#fff2e2" contact={0.8}
    draw={(g) => { g.save(); if (flip) { g.translate(DW, 0); g.scale(-1, 1); } drawDog(g, phase); g.restore(); }} drawMask={(g) => { g.save(); if (flip) { g.translate(DW, 0); g.scale(-1, 1); } drawDog(g, phase, true); g.restore(); }} />);

// ---------------------------------------------------------------- the imagined plant: a SOLID, ugly industrial block that
// springs up on No. 58's lot (overshoot + settle, like a thought made real) and collapses back into the ground when the
// engineer crosses it out. Opaque, inked like everything else - no transparent overlay, no glowing wireframe.
const plantKit = () => once("plant2", () => { const M = jMats(), k = new Kit(), w = W58 - 0.06;
  const conc = pbr("concrete_pavement", { color: "#8e8c86", scale: 1.0, normal: 0.9 }), rust = pbr("rusty_painted_metal", { color: "#b8a898", scale: 0.8 }), grime = pbr("concrete_pavement", { color: "#6f6d68", scale: 0.7 });
  k.span(conc, [-w / 2, 0, -12], [w / 2, 14.6, 0.6], { ink: 0.8 });
  for (let y = 1.6; y < 14; y += 1.45) { k.span(M.galv, [-w / 2 + 0.3, y, 0.6], [w / 2 - 0.3, y + 0.55, 0.9], { ink: 0.5 }); for (let x = -w / 2 + 0.4; x < w / 2 - 0.3; x += 0.22) k.span(M.machDark, [x, y + 0.05, 0.9], [x + 0.03, y + 0.5, 0.93], { ink: false }); }
  for (let y = 0; y < 14.6; y += 3.0) k.span(grime, [-w / 2 - 0.02, y, 0.58], [w / 2 + 0.02, y + 0.18, 0.62], { ink: 0.4 });
  for (const x of [-2.1, 2.1]) { k.cyl(rust, 0.85, 1.0, 8, [x, 18.4, -5], [0, 0, 0], 20, { ink: 0.7 }); k.cyl(M.machDark, 0.9, 0.9, 0.3, [x, 22.5, -5], [0, 0, 0], 20, { ink: 0.5 }); }
  for (const x of [-1.4, 0.3, 1.9]) { k.cyl(M.galv, 0.28, 0.28, 13.5, [x, 7.0, 1.25], [0, 0, 0], 12, { ink: 0.5 }); for (let y = 1.0; y < 14; y += 2.2) k.torus(M.machDark, 0.3, 0.04, [x, y, 1.25], [Math.PI / 2, 0, 0], Math.PI * 2, { ink: false }); }
  for (const [x, y] of [[-1.7, 3.3], [1.7, 3.3], [0, 9.6]]) { k.cyl(rust, 1.25, 1.25, 0.7, [x, y, 1.0], [Math.PI / 2, 0, 0], 28, { ink: 0.7 }); k.cyl(M.machDark, 1.05, 1.05, 0.72, [x, y, 1.01], [Math.PI / 2, 0, 0], 28, { ink: false });
    for (let sp = 0; sp < 6; sp++) { const a = (sp / 6) * Math.PI * 2; k.rod(M.galv, [x, y, 1.38], [x + Math.cos(a) * 1.05, y + Math.sin(a) * 1.05, 1.38], 0.03, 5, { ink: false }); } }
  k.span(M.machDark, [-0.7, 0, 0.6], [0.7, 2.4, 0.95], { ink: 0.6 });
  return k; });
/** grow = 0..1 springs up (overshoot then settle); fold = 0..1 collapses back into the ground */
export const GhostPlant: React.FC<{ grow: number; fold: number; f: number }> = ({ grow, fold }) => { const K = plantKit();
  const g1 = grow - 1, pop = grow < 1 ? 1 + 2.4 * g1 ** 3 + 1.4 * g1 ** 2 : 1, sy = Math.max(0.001, pop * (1 - fold) ** 1.4);
  if (sy <= 0.004) return null;
  return <group scale={[1 + fold * 0.06, sy, 1 + fold * 0.06]}><KitMesh kit={K} /></group>; };

// ---------------------------------------------------------------- 1907 fan unit + foundation; trestle with plan, X, model
const fanUnitKit = () => once("fanUnit", () => { const M = jMats(), k = new Kit(), R = 1.05;
  k.add(M.machGreen, new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.9, 32, 1, true), [0, 0, 0], [Math.PI / 2, 0, 0]); k.torus(M.machGreen, R + 0.12, 0.05, [0, 0, 0.45]); k.torus(M.machGreen, R + 0.12, 0.05, [0, 0, -0.45]);
  for (const rr of [0.35, 0.7, 1.0]) k.torus(M.machDark, rr, 0.012, [0, 0, 0.5], [0, 0, 0], Math.PI * 2, { ink: false });
  for (let s = 0; s < 8; s++) { const a = (s / 8) * Math.PI * 2; k.rod(M.machDark, [0, 0, 0.5], [Math.cos(a) * (R + 0.1), Math.sin(a) * (R + 0.1), 0.5], 0.012, 4, { ink: false }); }
  k.cyl(M.machDark, 0.32, 0.32, 0.7, [0, 0, -0.85], [Math.PI / 2, 0, 0], 20); k.span(M.machGreen, [-0.9, -R - 0.15, -0.6], [0.9, -R + 0.15, 0.6]);
  return k; });
const rotorKit = () => once("fanRotor", () => { const M = jMats(), k = new Kit(); k.sphere(M.machDark, 0.2, [0, 0, 0.1], [1, 1, 1.3]);
  for (let b = 0; b < 7; b++) { const a = (b / 7) * Math.PI * 2; const g = new THREE.BoxGeometry(0.34, 0.85, 0.025); g.translate(0, 0.6, 0); k.add(M.machYellow, g, [0, 0, 0.05], [0.35, 0, a]); } return k; });
export const FanUnit: React.FC<{ spin: number }> = ({ spin }) => <group><KitMesh kit={fanUnitKit()} /><group rotation={[0, 0, spin]}><KitMesh kit={rotorKit()} /></group></group>;
const foundationKit = () => once("fanFound", () => { const M = jMats(), k = new Kit(); for (let l = 0; l < 2; l++) for (let i = 0; i < 4; i++) { const rot = l % 2 ? Math.PI / 2 : 0; k.box(M.timber, [2.4, 0.18, 0.24], [rot ? -0.9 + i * 0.6 : 0, 0.09 + l * 0.18, rot ? 0 : -0.9 + i * 0.6], [0, rot, 0]); }
  k.span(M.concrete, [-1.3, 0.36, -1.0], [1.3, 0.5, 1.0]); return k; });
export const Foundation: React.FC = () => <KitMesh kit={foundationKit()} />;
const planTex = () => once("planTex", () => { const c = document.createElement("canvas"); c.width = 512; c.height = 360; const g = c.getContext("2d")!;
  g.fillStyle = "#2a4f7a"; g.fillRect(0, 0, 512, 360); g.strokeStyle = "rgba(220,235,255,0.85)"; g.lineWidth = 3;
  g.strokeRect(20, 20, 472, 320); for (let i = 0; i < 4; i++) g.strokeRect(60 + i * 100, 120, 80, 180); g.strokeRect(200, 40, 120, 260); for (let y = 60; y < 300; y += 20) { g.beginPath(); g.moveTo(205, y); g.lineTo(315, y); g.stroke(); }
  g.beginPath(); g.arc(230, 90, 18, 0, Math.PI * 2); g.arc(290, 90, 18, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1; for (let x = 20; x < 492; x += 24) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x, 340); g.globalAlpha = 0.25; g.stroke(); g.globalAlpha = 1; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; });
const xTex = () => once("xTex", () => { const c = document.createElement("canvas"); c.width = 512; c.height = 360; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; });
/** draw the scribbled X progressively (u 0..1) */
const drawX = (u: number) => { const t = xTex(), c = t.image as HTMLCanvasElement, g = c.getContext("2d")!; g.clearRect(0, 0, 512, 360); g.strokeStyle = "#d42a1e"; g.lineCap = "round"; g.lineWidth = 16;
  const a = clamp01(u * 2), b = clamp01(u * 2 - 1); g.beginPath(); g.moveTo(170, 50); g.lineTo(170 + 180 * a, 50 + 250 * a); g.stroke(); if (b > 0) { g.beginPath(); g.moveTo(350, 50); g.lineTo(350 - 180 * b, 50 + 250 * b); g.stroke(); } t.needsUpdate = true; return t; };
const modelKit = () => once("model", () => { const M = jMats(), k = new Kit(); k.span(M.timber, [-0.45, 0, -0.2], [0.45, 0.03, 0.2]);
  for (let i = 0; i < 7; i++) { const h = 0.16 + ((i * 37) % 5) * 0.02; k.span(i === 3 ? M.brickRed : [M.brickWarm, M.brownstone, M.brickDeep][i % 3], [-0.42 + i * 0.12, 0.03, -0.15], [-0.31 + i * 0.12, 0.03 + h, 0.0], { ink: 0.3 }); }
  k.span(M.asphalt, [-0.44, 0.031, 0.02], [0.44, 0.035, 0.18], { ink: false }); return k; });
export const Trestle: React.FC<{ xU: number }> = ({ xU }) => { const M = jMats(), planMat = useMemo(() => new THREE.MeshStandardMaterial({ map: planTex(), roughness: 0.85 }), []), xMat = useMemo(() => new THREE.MeshBasicMaterial({ map: xTex(), transparent: true, depthWrite: false }), []);
  if (xU > 0) drawX(xU);
  return <group>
    {[-0.75, 0.75].map((x) => <mesh key={x} position={[x, 0.45, 0]} material={M.timber} castShadow><boxGeometry args={[0.08, 0.9, 0.8]} /></mesh>)}
    <mesh position={[0, 0.92, 0]} material={M.timber} castShadow receiveShadow><boxGeometry args={[1.9, 0.05, 0.9]} /></mesh>
    <mesh position={[0.35, 0.952, 0.05]} rotation={[-Math.PI / 2, 0, 0.06]} material={planMat}><planeGeometry args={[1.05, 0.74]} /></mesh>
    {xU > 0 && <mesh position={[0.35, 0.956, 0.05]} rotation={[-Math.PI / 2, 0, 0.06]} material={xMat}><planeGeometry args={[1.05, 0.74]} /></mesh>}
    <group position={[-0.5, 0.945, -0.05]}><KitMesh kit={modelKit()} /></group>
  </group>; };
export const ghostGrow = (f: number) => smooth(792, 842, f);
export const ghostFold = (f: number) => smooth(948, 972, f);
export const xProgress = (f: number) => clamp01((f - 922) / 28);
export { EAVE };
