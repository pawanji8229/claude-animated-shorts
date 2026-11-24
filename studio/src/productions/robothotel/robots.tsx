// ORIGINAL robot cast of the Robot Hotel (procedural, not copies of any real product):
//   Raptor     bow-tied, bellhop-capped animatronic raptor receptionist (head/jaw/neck/arms/tail rig, eyes on/off)
//   Concierge  capsule robot on a round base: face screen (eyes / happy / loading dots / off), waving arms, tilting head
//   Porter     luggage cart robot: rounded body, bumper, status light ring (ok / error), face screen, carries a suitcase
//   Worker     small humanoid "workforce" robot in a charging alcove: powers down (eyes dim, head droops, arms sag)
//   Egg        bedside assistant: egg shell, face screen, base ring light that pulses while "listening"
//   Cleaner    floor-cleaning puck; Suitcase; Dolly (for wheeling retired robots away)
// All static parts are merged per material (short3 Kit, ink outlines); moving parts are groups with pure-number states.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import type { V3 } from "../../lib/math";

// ---------------------------------------------------------------- materials
const plastic = (k: string, col: string, rough = 0.32, clear = 0.6) => once(`rhP_${k}`, () => new THREE.MeshPhysicalMaterial({ color: col, roughness: rough, metalness: 0, clearcoat: clear, clearcoatRoughness: 0.25 }));
const metal = (k: string, col: string, rough = 0.35) => once(`rhM_${k}`, () => new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: 0.85 }));
const matte = (k: string, col: string, rough = 0.8) => once(`rhF_${k}`, () => new THREE.MeshStandardMaterial({ color: col, roughness: rough }));
const glow = (col: string, i: number) => { const key = `rhG_${col}_${Math.round(i * 20)}`; return once(key, () => new THREE.MeshStandardMaterial({ color: i > 0.05 ? col : "#1a1c20", emissive: col, emissiveIntensity: Math.round(i * 20) / 20 * 2.2, roughness: 0.25 })); };
export const MAT = {
  white: () => plastic("white", "#f2f1ec"), grey: () => plastic("grey", "#9aa0a8", 0.4, 0.3), dark: () => plastic("dark", "#2a2e35", 0.4, 0.4), black: () => matte("black", "#16181c", 0.6),
  joint: () => metal("joint", "#5a606a", 0.4), chrome: () => metal("chrome", "#c8ccd2", 0.2), rubber: () => matte("rubber", "#1a1a1c", 0.9),
  red: () => plastic("red", "#c3262c", 0.35), gold: () => metal("gold", "#c9a040", 0.3), cream: () => plastic("cream", "#eadcbc", 0.45, 0.2), tooth: () => plastic("tooth", "#f8f4ea", 0.3, 0.2),
};
// ---------------------------------------------------------------- face screens (canvas textures, cached per state)
type FaceMode = "eyes" | "happy" | "loading" | "off" | "wide" | "sleepy" | "alert";
const faceTex = (mode: FaceMode, phase: number, col: string, w = 256, h = 160) => once(`rhFace_${mode}_${phase}_${col}_${w}`, () => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; g.fillStyle = "#07090c"; g.fillRect(0, 0, w, h);
  g.fillStyle = col; g.strokeStyle = col; g.lineCap = "round"; g.shadowColor = col; g.shadowBlur = 14; const cx = w / 2, cy = h / 2;
  if (mode === "eyes" || mode === "wide" || mode === "alert") { const r = mode === "eyes" ? 20 : 27, dy = mode === "alert" ? -4 : 0;
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 52, cy + dy, r * 0.8, r * (mode === "eyes" ? 1.15 : 1.3), 0, 0, Math.PI * 2); g.fill(); }
    if (mode === "alert") { g.lineWidth = 7; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 30, cy - 46); g.lineTo(cx + s * 72, cy - 36); g.stroke(); } } }
  if (mode === "happy") { g.lineWidth = 11; for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 52, cy + 12, 24, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } }
  if (mode === "sleepy") { g.lineWidth = 9; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 52 - 22, cy + 4); g.lineTo(cx + s * 52 + 22, cy + 4); g.stroke(); } }
  if (mode === "loading") { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, on = (i - phase + 8) % 8; g.globalAlpha = Math.max(0.12, 1 - on * 0.14); g.beginPath(); g.arc(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40, 9, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; });
const faceMat = (mode: FaceMode, phase: number, col: string, k = 1) => once(`rhFaceM_${mode}_${phase}_${col}_${Math.round(k * 10)}`, () => new THREE.MeshStandardMaterial({ map: faceTex(mode, phase, col), emissiveMap: faceTex(mode, phase, col), emissive: "#ffffff", emissiveIntensity: mode === "off" ? 0 : 1.3 * Math.round(k * 10) / 10, color: "#ffffff", roughness: 0.15, metalness: 0 }));
/** a flat face screen (w x h metres) facing +z */
const Screen: React.FC<{ w: number; h: number; mode: FaceMode; phase?: number; col?: string; k?: number; p?: V3; r?: V3 }> = ({ w, h, mode, phase = 0, col = "#5fe0ff", k = 1, p = [0, 0, 0], r = [0, 0, 0] }) =>
  <mesh position={p} rotation={r} material={faceMat(mode, phase % 8, col, k)}><planeGeometry args={[w, h]} /></mesh>;

// ---------------------------------------------------------------- RAPTOR (receptionist; local +z = towards the guest; origin = floor under the hips)
export type RaptorState = { headYaw: number; headPitch: number; jaw: number; bow: number; armL: number; armR: number; eyes: number; breathe: number; tail: number; cardOut?: number };
export const RAPTOR_REST: RaptorState = { headYaw: 0, headPitch: 0, jaw: 0.05, bow: 0, armL: 0, armR: 0, eyes: 1, breathe: 0, tail: 0 };
const raptorSkin = (v: number) => v === 0 ? plastic("raptA", "#3d8a6a", 0.35, 0.5) : plastic("raptB", "#4a6fa8", 0.35, 0.5);
const raptorBody = (v: number) => once(`rhRaptorBody${v}`, () => { const k = new Kit(), S = raptorSkin(v), B = MAT.cream(), J = MAT.joint();
  k.sphere(S, 0.3, [0, 1.12, 0], [1.0, 1.25, 1.55]);                                 // torso (long, leaning forward)
  k.sphere(B, 0.26, [0, 1.06, 0.2], [0.85, 1.05, 1.1]);                                // belly plate
  for (const s of [-1, 1]) { k.sphere(S, 0.2, [s * 0.2, 0.86, -0.12], [0.8, 1.3, 1.2]);    // thighs
    k.rod(S, [s * 0.22, 0.7, -0.08], [s * 0.22, 0.32, 0.06], 0.07); k.rod(J, [s * 0.22, 0.32, 0.06], [s * 0.22, 0.06, -0.04], 0.05); k.box(J, [0.14, 0.05, 0.26], [s * 0.22, 0.03, 0.06]); }
  return k; });
const raptorTail = (v: number) => once(`rhRaptorTail${v}`, () => { const k = new Kit(), S = raptorSkin(v);
  for (let i = 0; i < 9; i++) { const t = i / 8; k.sphere(S, 0.2 * (1 - t * 0.8), [0, 1.08 - 0.12 * t + 0.1 * Math.sin(t * 3), -0.35 - t * 1.15], [1, 1, 1.5]); } return k; });
const raptorNeck = (v: number) => once(`rhRaptorNeck${v}`, () => { const k = new Kit(), S = raptorSkin(v), B = MAT.cream();
  k.rod(S, [0, 0, 0], [0, 0.32, 0.18], 0.11, 12); k.sphere(B, 0.09, [0, 0.12, 0.1], [0.9, 1.4, 0.6]); return k; });
const raptorHead = (v: number) => once(`rhRaptorHead${v}`, () => { const k = new Kit(), S = raptorSkin(v), T = MAT.tooth(), D = MAT.dark(), R = MAT.red(), G = MAT.gold();
  k.sphere(S, 0.17, [0, 0.03, 0.05], [1.0, 0.95, 1.35]);                               // cranium
  k.sphere(S, 0.12, [0, 0.0, 0.3], [0.95, 0.72, 1.6]);                                 // upper snout
  for (const s of [-1, 1]) { k.sphere(D, 0.045, [s * 0.11, 0.08, 0.17], [1, 0.55, 1.4]);           // brow ridge
    k.sphere(D, 0.014, [s * 0.04, 0.02, 0.5]);                                         // nostrils
    for (let i = 0; i < 5; i++) k.add(T, new THREE.ConeGeometry(0.014, 0.05, 6), [s * (0.085 - i * 0.004), -0.07, 0.2 + i * 0.06], [Math.PI, 0, 0]); }
  // bellhop cap
  k.cyl(R, 0.1, 0.11, 0.08, [0, 0.21, 0.02], [-0.15, 0, 0], 20); k.cyl(G, 0.112, 0.112, 0.02, [0, 0.19, 0.02], [-0.15, 0, 0], 20); k.cyl(D, 0.115, 0.115, 0.012, [0, 0.25, 0.03], [-0.15, 0, 0], 20);
  return k; });
const raptorJaw = (v: number) => once(`rhRaptorJaw${v}`, () => { const k = new Kit(), S = raptorSkin(v), T = MAT.tooth(), M = matte("mouth", "#5a1e24", 0.6);
  k.sphere(S, 0.1, [0, -0.02, 0.18], [0.85, 0.42, 1.75]); k.box(M, [0.12, 0.012, 0.28], [0, 0.022, 0.2], [0, 0, 0], { ink: false });
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) k.add(T, new THREE.ConeGeometry(0.012, 0.04, 6), [s * (0.07 - i * 0.004), 0.04, 0.12 + i * 0.065]); return k; });
const raptorArm = (v: number) => once(`rhRaptorArm${v}`, () => { const k = new Kit(), S = raptorSkin(v), C = MAT.dark();
  k.rod(S, [0, 0, 0], [0, -0.14, 0.12], 0.045); k.rod(S, [0, -0.14, 0.12], [0, -0.12, 0.3], 0.035);
  for (const a of [-0.5, 0, 0.5]) k.add(C, new THREE.ConeGeometry(0.014, 0.07, 6), [Math.sin(a) * 0.03, -0.13, 0.34], [Math.PI / 2 + 0.3, 0, a]); return k; });
const bowTie = () => once("rhBowTie", () => { const k = new Kit(), R = MAT.red();
  for (const s of [-1, 1]) k.ext(R, [[0, 0], [s * 0.11, 0.055], [s * 0.11, -0.055]], 0.03, [0, 0, 0]); k.sphere(R, 0.028, [0, 0, 0.01]); return k; });
export const Raptor: React.FC<{ s: RaptorState; v?: number; p: V3; ry?: number; sc?: number }> = ({ s, v = 0, p, ry = 0, sc = 1 }) => {
  const e = s.eyes, b = s.breathe;
  return <group position={p} rotation={[0, ry, 0]} scale={sc}>
    <group position={[0, 0.0, 0]}><KitMesh kit={raptorBody(v)} /></group>
    <group position={[0, 1.08, -0.35]} rotation={[0, s.tail * 0.3, 0]}><group position={[0, -1.08, 0.35]}><KitMesh kit={raptorTail(v)} /></group></group>
    {/* torso pivot at the hips: bowing tips the neck/head/arms forward */}
    <group position={[0, 0.95, 0]} rotation={[s.bow * 0.45 + 0.02 * b, 0, 0]}><group position={[0, -0.95, 0]}>
      <group position={[0, 1.42, 0.3]} rotation={[0.05, 0, 0]}><KitMesh kit={raptorNeck(v)} />
        <group position={[0, 0.2, 0.235]} rotation={[-0.5, 0, 0]}><KitMesh kit={bowTie()} /></group>
        <group position={[0, 0.34, 0.2]} rotation={[-s.headPitch, s.headYaw, 0]}>
          <KitMesh kit={raptorHead(v)} />
          <group position={[0, -0.05, 0.08]} rotation={[s.jaw * 0.6, 0, 0]}><KitMesh kit={raptorJaw(v)} /></group>
          {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.115, 0.045, 0.2]} material={glow("#ffb02e", e)}><sphereGeometry args={[0.032, 14, 10]} /></mesh>)}
        </group>
      </group>
      {[-1, 1].map((sd) => { const a = sd < 0 ? s.armL : s.armR; return <group key={sd} position={[sd * 0.2, 1.32, 0.33]} rotation={[-a * 1.6, 0, sd * a * 0.25]}><KitMesh kit={raptorArm(v)} />
        {sd > 0 && (s.cardOut ?? 0) > 0 && <mesh position={[0, -0.11, 0.36]} rotation={[0.2, 0, 0]} material={MAT.gold()}><boxGeometry args={[0.085, 0.004, 0.054]} /></mesh>}</group>; })}
    </group></group>
  </group>;
};

// ---------------------------------------------------------------- CONCIERGE (capsule robot; origin floor centre, faces +z)
export type ConciergeState = { face: FaceMode; phase?: number; headTilt: number; headYaw: number; wave: number; armL: number; panel?: number; on?: number };
const conciergeBody = () => once("rhConcBody", () => { const k = new Kit(), W = MAT.white(), G = MAT.grey(), D = MAT.dark();
  k.lathe(W, [[0, 0.04], [0.3, 0.05], [0.31, 0.12], [0.24, 0.2], [0.22, 0.55], [0.25, 0.9], [0.21, 1.02], [0.12, 1.08], [0, 1.09]], [0, 0, 0], 32);
  k.cyl(G, 0.32, 0.33, 0.06, [0, 0.03, 0], [0, 0, 0], 32); k.torus(D, 0.31, 0.012, [0, 0.11, 0], [Math.PI / 2, 0, 0]);
  k.cyl(D, 0.06, 0.07, 0.08, [0, 1.12, 0], [0, 0, 0], 16);                              // neck
  k.box(D, [0.26, 0.18, 0.02], [0, 0.78, 0.235], [-0.12, 0, 0]);                        // chest tablet bezel
  return k; });
const conciergeHead = () => once("rhConcHead", () => { const k = new Kit(), W = MAT.white(), D = MAT.dark();
  k.sphere(W, 0.2, [0, 0.17, 0], [1.05, 0.95, 1]); k.sphere(D, 0.172, [0, 0.165, 0.035], [1.02, 0.78, 0.98]);   // shell + dark visor
  for (const s of [-1, 1]) k.cyl(MAT.grey(), 0.05, 0.05, 0.03, [s * 0.205, 0.17, 0], [0, 0, Math.PI / 2], 16); return k; });
const conciergeArm = () => once("rhConcArm", () => { const k = new Kit(), W = MAT.white(), J = MAT.joint();
  k.sphere(J, 0.05, [0, 0, 0]); k.rod(W, [0, 0, 0], [0, -0.3, 0.02], 0.045); k.sphere(J, 0.04, [0, -0.3, 0.02]); k.rod(W, [0, -0.3, 0.02], [0, -0.56, 0.06], 0.04); k.sphere(W, 0.055, [0, -0.6, 0.07]); return k; });
export const Concierge: React.FC<{ s: ConciergeState; p: V3; ry?: number }> = ({ s, p, ry = 0 }) => {
  const on = s.on ?? 1;
  return <group position={p} rotation={[0, ry, 0]}><KitMesh kit={conciergeBody()} />
    <Screen w={0.22} h={0.14} mode={on > 0.1 ? (s.face === "loading" ? "loading" : "happy") : "off"} phase={s.phase} col="#7fe8ff" k={on} p={[0, 0.78, 0.248]} r={[-0.12, 0, 0]} />
    {(s.panel ?? 0) > 0 && <group position={[0.2, 0.55, 0.05]} rotation={[0, (s.panel ?? 0) * 1.6, 0]}><mesh position={[0, 0, 0.12]} material={MAT.white()}><boxGeometry args={[0.02, 0.3, 0.24]} /></mesh></group>}
    <group position={[0, 1.15, 0]} rotation={[0, s.headYaw, s.headTilt]}><KitMesh kit={conciergeHead()} />
      <Screen w={0.22} h={0.13} mode={on > 0.1 ? s.face : "off"} phase={s.phase} col="#7fe8ff" k={on} p={[0, 0.17, 0.2]} /></group>
    <group position={[0.27, 0.98, 0]} rotation={[-s.wave * 0.4, 0, s.wave * 2.4]}><group rotation={[0, 0, s.wave > 0.5 ? Math.sin(s.wave * 40) * 0.25 : 0]}><KitMesh kit={conciergeArm()} /></group></group>
    <group position={[-0.27, 0.98, 0]} rotation={[-s.armL * 1.2, 0, -s.armL * 0.3]}><KitMesh kit={conciergeArm()} /></group>
  </group>;
};

// ---------------------------------------------------------------- PORTER (luggage robot; origin floor centre, drives along +z)
export type PorterState = { err: number; face: FaceMode; wheel: number; tilt?: number; load: boolean };
const porterBody = () => once("rhPorter", () => { const k = new Kit(), W = MAT.white(), G = MAT.grey(), D = MAT.dark(), R = MAT.rubber();
  k.box(W, [0.62, 0.34, 0.86], [0, 0.27, 0]); k.box(G, [0.66, 0.08, 0.9], [0, 0.11, 0]);                 // body + bumper skirt
  k.box(D, [0.6, 0.03, 0.82], [0, 0.455, 0]);                                                             // top deck mat
  for (const s of [-1, 1]) k.rod(MAT.chrome(), [s * 0.29, 0.46, -0.4], [s * 0.29, 0.62, -0.4], 0.015);   // rear rail posts
  k.rod(MAT.chrome(), [-0.29, 0.62, -0.4], [0.29, 0.62, -0.4], 0.015);
  k.box(D, [0.3, 0.18, 0.04], [0, 0.3, 0.44]);                                                           // face bezel
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(R, 0.07, 0.07, 0.05, [sx * 0.29, 0.07, sz * 0.3], [0, 0, Math.PI / 2], 16);
  return k; });
export const Porter: React.FC<{ s: PorterState; p: V3; ry?: number }> = ({ s, p, ry = 0 }) => {
  const ok = s.err < 0.5, ring = ok ? "#3cff8a" : "#ff3a2a", blink = ok ? 1 : (Math.floor(s.wheel * 0) + 1);
  return <group position={p} rotation={[0, ry, s.tilt ?? 0]}><KitMesh kit={porterBody()} />
    <mesh position={[0, 0.2, 0]} material={glow(ring, 0.9 * blink)}><boxGeometry args={[0.635, 0.018, 0.875]} /></mesh>
    <Screen w={0.26} h={0.15} mode={s.face} col={ok ? "#7fe8ff" : "#ff6a5a"} p={[0, 0.3, 0.462]} />
    {s.load && <group position={[0, 0.47, -0.02]} rotation={[0, 0, 0]}><Suitcase /></group>}
  </group>;
};

// ---------------------------------------------------------------- SUITCASE (lying flat on its back, origin bottom centre)
export const suitcaseKit = () => once("rhSuitcase", () => { const k = new Kit(), O = plastic("case", "#e0662a", 0.4, 0.5), D = MAT.dark(), C = MAT.chrome();
  k.box(O, [0.46, 0.24, 0.68], [0, 0.12, 0]); for (const x of [-0.12, 0, 0.12]) k.box(plastic("caseRib", "#c95420", 0.4, 0.4), [0.03, 0.245, 0.66], [x, 0.122, 0]);
  k.box(D, [0.47, 0.012, 0.69], [0, 0.12, 0]); k.rod(C, [-0.08, 0.27, 0.36], [0.08, 0.27, 0.36], 0.012); for (const s of [-1, 1]) k.rod(C, [s * 0.08, 0.2, 0.345], [s * 0.08, 0.27, 0.36], 0.01);
  return k; });
export const Suitcase: React.FC = () => <KitMesh kit={suitcaseKit()} />;
/** standing suitcase (upright, wheels down, telescopic handle) for a guest pulling it; origin floor centre */
export const suitcaseUp = () => once("rhSuitcaseUp", () => { const k = new Kit(), O = plastic("case", "#e0662a", 0.4, 0.5), C = MAT.chrome(), R = MAT.rubber();
  k.box(O, [0.46, 0.68, 0.24], [0, 0.4, 0]); for (const x of [-0.12, 0, 0.12]) k.box(plastic("caseRib", "#c95420", 0.4, 0.4), [0.03, 0.66, 0.245], [x, 0.4, 0]);
  for (const s of [-1, 1]) { k.rod(C, [s * 0.08, 0.74, -0.08], [s * 0.08, 1.0, -0.08], 0.01); k.cyl(R, 0.03, 0.03, 0.03, [s * 0.18, 0.03, -0.08], [0, 0, Math.PI / 2], 12); }
  k.rod(C, [-0.09, 1.0, -0.08], [0.09, 1.0, -0.08], 0.014); return k; });
export const SuitcaseUp: React.FC<{ p: V3; ry?: number; tilt?: number }> = ({ p, ry = 0, tilt = 0 }) => <group position={p} rotation={[0, ry, 0]}><group rotation={[tilt, 0, 0]}><KitMesh kit={suitcaseUp()} /></group></group>;

// ---------------------------------------------------------------- WORKER (workforce robot, ~1.25 m; origin floor centre, faces +z)
export type WorkerState = { on: number; droop: number; look: number };
const workerKit = (v: number) => once(`rhWorker${v}`, () => { const k = new Kit(), A = v % 2 ? plastic("wkB", "#d8dde4", 0.32, 0.6) : plastic("wkA", "#f0d48a", 0.32, 0.6), D = MAT.dark(), J = MAT.joint();
  k.lathe(A, [[0, 0.02], [0.2, 0.03], [0.22, 0.12], [0.17, 0.28], [0.19, 0.62], [0.16, 0.78], [0.08, 0.84], [0, 0.85]], [0, 0, 0], 28);
  k.cyl(D, 0.23, 0.23, 0.04, [0, 0.02, 0], [0, 0, 0], 28); k.box(D, [0.16, 0.1, 0.02], [0, 0.55, 0.185], [-0.08, 0, 0]);
  k.cyl(J, 0.04, 0.05, 0.08, [0, 0.88, 0], [0, 0, 0], 12); return k; });
const workerHead = (v: number) => once(`rhWorkerHead${v}`, () => { const k = new Kit(), A = v % 2 ? plastic("wkB", "#d8dde4", 0.32, 0.6) : plastic("wkA", "#f0d48a", 0.32, 0.6), D = MAT.dark();
  k.box(A, [0.3, 0.24, 0.26], [0, 0.13, 0]); k.box(D, [0.25, 0.14, 0.02], [0, 0.13, 0.13]); k.rod(MAT.chrome(), [0.08, 0.25, 0], [0.12, 0.36, 0], 0.008); k.sphere(MAT.red(), 0.02, [0.12, 0.37, 0]); return k; });
const workerArm = () => once("rhWorkerArm", () => { const k = new Kit(), J = MAT.joint(), D = MAT.dark(); k.sphere(J, 0.04, [0, 0, 0]); k.rod(D, [0, 0, 0], [0, -0.38, 0.03], 0.03); k.sphere(J, 0.045, [0, -0.41, 0.03]); return k; });
export const Worker: React.FC<{ s: WorkerState; v: number; p: V3; ry?: number }> = ({ s, v, p, ry = 0 }) =>
  <group position={p} rotation={[0, ry, 0]}><KitMesh kit={workerKit(v)} />
    {[-1, 1].map((sd) => <group key={sd} position={[sd * 0.21, 0.72, 0]} rotation={[s.droop * 0.15, 0, sd * (0.08 - s.droop * 0.06)]}><KitMesh kit={workerArm()} /></group>)}
    <group position={[0, 0.9, 0]} rotation={[s.droop * 0.55, s.look * 0.4, 0]}><KitMesh kit={workerHead(v)} />
      <Screen w={0.22} h={0.12} mode={s.on > 0.08 ? "eyes" : "off"} col="#7fe8ff" k={s.on} p={[0, 0.13, 0.142]} /></group>
    <mesh position={[0, 0.03, 0.235]} material={glow(s.on > 0.08 ? "#3cff8a" : "#ff3a2a", s.on > 0.08 ? 0.8 * s.on : 0.25)}><boxGeometry args={[0.08, 0.02, 0.01]} /></mesh>
  </group>;

// ---------------------------------------------------------------- EGG (bedside assistant ~0.26 m; origin base centre, faces +z)
export type EggState = { face: FaceMode; ring: number; screen: number; tilt?: number; plugged?: boolean };
const eggKit = () => once("rhEgg", () => { const k = new Kit(), W = MAT.white(), D = MAT.dark();
  const prof: [number, number][] = []; for (let i = 0; i <= 16; i++) { const t = i / 16, y = 0.03 + t * 0.24, r = 0.1 * Math.sin(Math.PI * Math.pow(t, 0.85)) * (1 - 0.18 * t); prof.push([Math.max(0.001, r), y]); }
  prof.unshift([0.0, 0.03]); k.lathe(W, prof, [0, 0, 0], 28); k.cyl(D, 0.085, 0.09, 0.03, [0, 0.015, 0], [0, 0, 0], 28); return k; });
export const Egg: React.FC<{ s: EggState; p: V3; ry?: number }> = ({ s, p, ry = 0 }) =>
  <group position={p} rotation={[0, ry, 0]}><group rotation={[s.tilt ?? 0, 0, 0]}><KitMesh kit={eggKit()} />
    <mesh position={[0, 0.034, 0]} material={glow("#5fe0ff", s.ring)}><torusGeometry args={[0.086, 0.007, 8, 32]} /></mesh>
    <mesh position={[0, 0.034, 0]} rotation={[Math.PI / 2, 0, 0]} material={glow("#5fe0ff", s.ring)}><torusGeometry args={[0.086, 0.007, 8, 32]} /></mesh>
    <Screen w={0.1} h={0.062} mode={s.screen > 0.05 ? s.face : "off"} col="#7fe8ff" k={s.screen} p={[0, 0.15, 0.093]} r={[-0.08, 0, 0]} />
  </group></group>;

// ---------------------------------------------------------------- CLEANER puck + DOLLY
const cleanerKit = () => once("rhCleaner", () => { const k = new Kit(); k.cyl(MAT.white(), 0.17, 0.18, 0.07, [0, 0.045, 0], [0, 0, 0], 28); k.cyl(MAT.dark(), 0.181, 0.181, 0.03, [0, 0.03, 0], [0, 0, 0], 28); k.cyl(MAT.grey(), 0.05, 0.05, 0.012, [0, 0.085, 0.04], [0, 0, 0], 16); return k; });
export const Cleaner: React.FC<{ p: V3; ry?: number; led?: number }> = ({ p, ry = 0, led = 1 }) => <group position={p} rotation={[0, ry, 0]}><KitMesh kit={cleanerKit()} />
  <mesh position={[0, 0.082, 0.12]} material={glow("#3cff8a", led)}><sphereGeometry args={[0.012, 8, 6]} /></mesh></group>;
const dollyKit = () => once("rhDolly", () => { const k = new Kit(), M = metal("dolly", "#7a8088", 0.45), R = MAT.rubber();
  k.box(matte("dollyDeck", "#3a3e44", 0.7), [0.62, 0.04, 0.62], [0, 0.12, 0]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(R, 0.05, 0.05, 0.04, [sx * 0.25, 0.05, sz * 0.25], [0, 0, Math.PI / 2], 12);
  k.rod(M, [-0.28, 0.14, -0.3], [-0.28, 1.0, -0.36], 0.016); k.rod(M, [0.28, 0.14, -0.3], [0.28, 1.0, -0.36], 0.016); k.rod(M, [-0.28, 1.0, -0.36], [0.28, 1.0, -0.36], 0.016); return k; });
export const Dolly: React.FC<{ p: V3; ry?: number }> = ({ p, ry = 0 }) => <group position={p} rotation={[0, ry, 0]}><KitMesh kit={dollyKit()} /></group>;
export const DOLLY_DECK = 0.14;
void useMemo;
