// short3 timeline: EXT camera path, every character's position + acting (pure functions of the frame), window crowd,
// rig build progress, jack ratchets, wrecking crane, stakes, new-HQ steel. INT (switchboard) camera + operators.
import * as THREE from "three";
import { V3, lerp, smooth, clamp01, rng } from "../../lib/math";
import { camPath, type Cam } from "../london-bridge/common";
import { pose5, shoulderPx5, COSTUME, REST_L, REST_R, ARM, type Odo5Pose, type ArmPose, type Costume } from "../../char/odo5";
import { cardWorld } from "../london-bridge/common";
import { personPose, type Persona } from "../../char/crowdLife";
import { BW, BD, FLOOR_H, BASE_H, SIDEWALK, STREET, NEW_HQ, T, bldAt, FILM_FRAMES } from "./world";
import { FACES, faceTrack, withFace, talkMouth, type FaceName } from "./expr";

const pulse = (a: number, b: number, c: number, d: number, f: number) => smooth(a, b, f) * (1 - smooth(c, d, f));
const tint = (c: Costume, pal: Record<string, string>, hat?: Costume["hat"]): Costume => ({ ...c, pal: { ...(c.pal ?? {}), ...pal }, ...(hat !== undefined ? { hat } : {}) });
const SW = (SIDEWALK[0] + SIDEWALK[1]) / 2;     // sidewalk centre line (z) in front of the original building

// ================================================================ EXT camera (one smooth path; dissolves cover the time jumps)
// Pace: every beat moves with purpose (push-ins on faces, tracking with action, cranes for reveals); never inside meshes.
export const camExt = camPath([
  // hook (flash-forward, building mid-move: front face at z ~ 3): low at the jacks + rollers, rise up the facade
  { f: 108, pos: [6.8, 0.95, 10.2], look: [1.2, 0.7, 4.6], fov: 44 },
  { f: 140, pos: [5.8, 4.2, 11.6], look: [1.8, 5.2, 3.2], fov: 42 },
  { f: 178, pos: [4.6, 13.6, 13.4], look: [3.43, 13.75, 2.5], fov: 24 },     // telephoto into a floor-3 window: the clerk works on, unaware
  { f: 241, pos: [4.3, 13.8, 14.0], look: [3.43, 13.8, 2.5], fov: 20 },
  // 1930: drop to the street, the entrance; Brightwater bursts out with the plans
  { f: 259, pos: [4.6, 12.0, 16.4], look: [2.0, 9.0, 9.0], fov: 34 },
  { f: 292, pos: [4.0, 1.95, 16.6], look: [0.4, 2.3, 8.2], fov: 40 },
  { f: 330, pos: [5.4, 1.45, 16.4], look: [2.0, 1.25, 10.8], fov: 38 },     // Brightwater + the squeezed clerks in the doorway
  { f: 390, pos: [4.9, 1.42, 15.4], look: [2.4, 1.3, 11.5], fov: 32 },
  { f: 440, pos: [4.4, 1.42, 14.6], look: [2.55, 1.35, 11.6], fov: 28 },
  { f: 492, pos: [3.85, 1.45, 13.9], look: [2.6, 1.38, 11.6], fov: 25 },     // cringe close-up (face fills the upper third)
  // crane-up: the new footprint's stakes + rope run straight through the old walls; the crawler crane is coming
  { f: 520, pos: [8.0, 6.0, 20.5], look: [1.0, 3.0, 6.0], fov: 42 },
  { f: 575, pos: [6.0, 26.0, 25.6], look: [1.0, 0.0, 1.0], fov: 46 },
  { f: 628, pos: [10.0, 30.0, 25.6], look: [4.0, 0.0, 4.0], fov: 46 },
  // the crane at street level: rolls up, ball swinging; Brightwater runs out waving it off; it backs away
  { f: 646, pos: [6.0, 2.6, 24.6], look: [15.5, 4.6, 16.3], fov: 56 },     // the crane rolls up, ball swinging over the sidewalk
  { f: 676, pos: [8.6, 1.15, 18.8], look: [10.4, 3.4, 12.6], fov: 64 },    // low: Brightwater waving, the ball + boom looming over him
  { f: 704, pos: [8.2, 1.4, 17.8], look: [10.0, 2.6, 12.8], fov: 50 },
  // engineer at the trestle: plans, the idea (two-shot faces)
  { f: 718, pos: [4.7, 1.6, 18.8], look: [3.95, 1.25, 11.3], fov: 37 },
  { f: 760, pos: [4.5, 1.55, 17.4], look: [3.95, 1.3, 11.3], fov: 35 },
  // lateral track along the facade windows (hundreds still inside)
  { f: 790, pos: [-9.5, 10.2, 17.5], look: [-7.5, 9.8, 9.0], fov: 50 },
  { f: 866, pos: [9.0, 11.0, 17.5], look: [7.6, 10.6, 9.0], fov: 50 },
  // support: the truck has pulled up, crew carries timber to the cribs (wide, then close at the hands)
  { f: 884, pos: [-4.0, 2.4, 22.0], look: [-12.0, 1.2, 13.5], fov: 50 },   // truck at the kerb, crew shouldering timbers
  { f: 925, pos: [6.4, 1.3, 15.0], look: [0.8, 0.6, 10.2], fov: 42 },
  { f: 962, pos: [8.2, 1.2, 15.6], look: [2.0, 0.6, 10.6], fov: 44 },
  // the creep: low, sliding with the building; jacks + rollers
  { f: 1000, pos: [6.6, 1.25, 14.6], look: [0.6, 0.9, 9.6], fov: 42 },
  { f: 1080, pos: [4.6, 1.6, 13.8], look: [-1.4, 1.3, 7.8], fov: 42 },
  // aerial over the street: slide back, turn 90 deg, slide sideways (time-lapse)
  { f: 1112, pos: [10.0, 40.0, 25.8], look: [-8.0, 0.0, -6.0], fov: 50 },
  { f: 1213, pos: [2.0, 44.0, 25.8], look: [-17.0, 0.0, -12.0], fov: 50 },
  // (INT 1213-1340) then: finished, new position + the new HQ steel rising on the old site
  { f: 1330, pos: [10.0, 11.0, 23.5], look: [-16.0, 6.0, -12.0], fov: 46 },
  { f: 1447, pos: [2.0, 7.5, 18.0], look: [-19.0, 5.0, -15.0], fov: 42 },
  // staff walk in at the new entrance; Brightwater tips his hat
  { f: 1465, pos: [-8.0, 2.3, -8.5], look: [-19.5, 1.8, -15.5], fov: 42 },
  { f: 1530, pos: [-9.6, 2.2, -10.4], look: [-20.0, 1.9, -15.8], fov: 38 },
], 5);

// ================================================================ rig / equipment schedule
/** 0 none .. 1 complete; cribbing is carried in one by one during "workers carefully supported the building".
 *  The hook is a flash-forward (rig complete). After the move the rig is dismantled behind the camera move. */
export const rigBuild = (f: number) => f < T.past0 ? 1 : f < T.support0 ? 0 : f < T.ext3_0 ? smooth(T.support0, T.creep0 - 6, f) : 0;
/** roller rotation follows the travelled distance (radius 0.12 m) */
export const rollerAngle = (f: number) => { const b = bldAt(f); return (Math.abs(b.p[2]) + Math.abs(b.p[0])) / 0.12; };
/** screw-jack bars ratchet: push 0.5 rad, swing back; staggered per jack (never all together) */
export const jackTurn = (k: number, f: number) => { const moving = bldAt(f).moving; if (!moving) return 0.2 * k; const ph = ((f + k * 7) % 26) / 26; return (ph < 0.6 ? ph / 0.6 : 1 - (ph - 0.6) / 0.4) * 0.6 - 0.3 + 0.2 * k; };
export const stakesOn = (f: number) => f >= T.footprint0 && f < T.ext3_0 ? smooth(T.footprint0, T.footprint0 + 70, f) : 0;
export const stakePoints = (): V3[] => { const out: V3[] = []; const { x0, x1, z0, z1 } = NEW_HQ;
  for (let x = x0; x < x1; x += 4) out.push([x, 0, z1]); for (let z = z1; z > z0; z -= 4) out.push([x1, 0, z]); for (let x = x1; x > x0; x -= 4) out.push([x, 0, z0]); for (let z = z0; z < z1; z += 4) out.push([x0, 0, z]); return out; };
export const hqRise = (f: number) => f >= T.ext3_0 ? smooth(T.ext3_0 - 10, T.gang0, f) : 0;
export const hqColumns = (): V3[] => { const out: V3[] = []; for (let x = NEW_HQ.x0 + 2; x <= NEW_HQ.x1 - 2; x += 6) for (let z = NEW_HQ.z0 + 2; z <= NEW_HQ.z1 - 2; z += 6) out.push([x, 0, z]); return out; };
export const TRESTLE: V3 = [5.6, 0.16, SW - 0.2];
export const trestleOn = (f: number) => f >= T.engineer0 && f < T.windows0 + 20;
export const gangwayOn = (f: number) => f >= T.ext3_0;
const planTexCache: { m?: THREE.MeshStandardMaterial } = {};
export const planMat = (fallback: THREE.Material) => {
  if (planTexCache.m) return planTexCache.m;
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d")!;
  g.fillStyle = "#1f4f8f"; g.fillRect(0, 0, 512, 256); g.strokeStyle = "rgba(220,235,255,0.25)"; for (let x = 0; x < 512; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } for (let y = 0; y < 256; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.strokeStyle = "#eaf2ff"; g.lineWidth = 4; g.strokeRect(60, 70, 150, 110);                                 // old building
  g.setLineDash([12, 8]); g.strokeRect(300, 40, 150, 110); g.setLineDash([]);                                  // its new spot
  g.lineWidth = 5; g.beginPath(); g.moveTo(215, 125); g.lineTo(290, 100); g.stroke(); g.beginPath(); g.moveTo(290, 100); g.lineTo(272, 92); g.moveTo(290, 100); g.lineTo(276, 112); g.stroke(); // arrow
  g.beginPath(); g.arc(375, 95, 30, -0.4, 1.4); g.stroke();                                                    // rotation mark
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; planTexCache.m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
  void fallback; return planTexCache.m;
};

// ================================================================ wrecking crane: rolls in from the right, waved off, backs out
export const CRANE_Z = STREET[0] + 3.3;
/** crawler crane: crawls in along the near lane during the crane-up (visible from above), threatens the block (upper
 *  swings toward it, ball sways), is waved off and backs away. Speeds stay plausible for a crawler (<= 5 m/s, eased). */
export const craneAt = (f: number) => {
  const off = { on: false, x: 90, z: CRANE_Z, phase: 0, yaw: 0, swing: 0, swingZ: 0, rope: 8.5 };
  if (f < 540 || f > T.windows0 + 30) return off;
  const X = (g: number) => lerp(lerp(48, 17, smooth(540, T.wreckWave - 6, g)), 64, smooth(T.wreckBack + 4, T.windows0 + 26, g));
  const x = X(f), v = X(f + 1) - x, a = X(f + 1) - 2 * x + X(f - 1);
  const yaw = -0.5 * (smooth(T.wreckWave - 24, T.wreckWave - 4, f) - smooth(T.wreckWave + 18, T.wreckBack + 6, f));
  const yawV = -0.5 * ((smooth(T.wreckWave - 23, T.wreckWave - 3, f) - smooth(T.wreckWave + 19, T.wreckBack + 7, f)) - (smooth(T.wreckWave - 24, T.wreckWave - 4, f) - smooth(T.wreckWave + 18, T.wreckBack + 6, f)));
  const swing = 0.16 * Math.sin(f * 0.105) * (0.35 + Math.min(1, Math.abs(v) * 3)) - a * 40 - v * 0.25, swingZ = 0.12 * Math.sin(f * 0.09 + 1) + yawV * 6;
  return { on: true, x, z: CRANE_Z, phase: 48 - x, yaw, swing, swingZ, rope: 8.5 };
};

// ================================================================ characters
export type Placed = { pose: Odo5Pose; pos: V3; h: number; flip?: boolean; light?: number; halo?: number; carry?: { a: V3; b: V3 } };
const walkPose = (costume: Costume, d: number, walking: number, extra: Partial<Odo5Pose> = {}): Odo5Pose =>
  pose5({ costume, view: walking > 0.02 ? "side" : "front", gait: d / 0.72, walk: walking, stride: 0.72, lean: 0.04 * walking, ...extra });
const blinkAt = (f: number, seed: number) => ((f + seed * 37) % (71 + (seed % 5) * 9)) < 3;
const BOSS = tint(COSTUME.clerk, { shirt: "#5b4632", shirtShade: "#463524", hat: "#2b241e", hatShade: "#191510", tie: "#7a2d22" });
const ENG = tint(COSTUME.workerB, { hat: "#f0f0ea", hatShade: "#c9c7bd", shirt: "#3d5a7a", shirtShade: "#2c4560" });
const WORKER: Costume[] = [
  tint(COSTUME.workerA, { shirt: "#7a5a3a", shirtShade: "#5c4228", hat: "#d9a520" }), tint(COSTUME.workerB, { shirt: "#4a5f3a", shirtShade: "#384a2b", hat: "#c98f1c" }),
  tint(COSTUME.workerA, { shirt: "#6c3f34", shirtShade: "#522f26", hat: "#e0b23a" }), tint(COSTUME.workerB, { shirt: "#3c4b63", shirtShade: "#2c384b", hat: "#d6a32e" }),
  tint(COSTUME.workerA, { shirt: "#8a7a5a", shirtShade: "#6d5f45", hat: "#cf9a26" }), tint(COSTUME.workerB, { shirt: "#5a3f5f", shirtShade: "#432f47", hat: "#e2b440" }),
];
// ---- Brightwater (the executive): bursts out of the doors, down the steps, unrolls the plans, proud -> frozen -> cringe;
//      runs out to wave off the wrecking crane; gapes at the engineer's idea; tips his hat at the new entrance
const BP_L: ArmPose = { hand: [40, 40], elbow: [-30, 86], shape: "grip", rot: -0.6, bend: -1 }, BP_R: ArmPose = { hand: [-40, 40], elbow: [30, 86], shape: "grip", rot: 0.6, bend: 1 };
const BP_SHOW_L: ArmPose = { hand: [10, -10], elbow: [-50, 60], shape: "grip", rot: -1.0, bend: -1 }, BP_SHOW_R: ArmPose = { hand: [-10, -10], elbow: [50, 60], shape: "grip", rot: 1.0, bend: 1 };
const WAVE_L: ArmPose = { hand: [-70, -150], elbow: [-90, -40], shape: "open", rot: -0.3, bend: -1 }, WAVE_R: ArmPose = { hand: [70, -150], elbow: [90, -40], shape: "open", rot: 0.3, bend: 1 };
const STEP_Z0 = BD / 2 + 0.06, STEP_Z1 = BD / 2 - 1.89;           // portal steps: bottom edge -> top edge (z), y 0.16 -> 1.4
const stepY = (z: number) => 0.16 + (BASE_H - 0.16) * clamp01((STEP_Z0 - z) / (STEP_Z0 - STEP_Z1));
const BOSS_PATH: [number, V3][] = [[262, [0.1, 0, BD / 2 - 2.5]], [276, [0.15, 0, BD / 2 - 1.95]], [298, [0.3, 0, BD / 2 + 0.25]], [312, [1.2, 0, BD / 2 + 1.25]], [329, [2.6, 0, SW + 0.4]]];
const BOSS_RUN: [number, V3][] = [[612, [2.6, 0, SW + 0.4]], [646, [9.6, 0, SW + 1.4]]];      // runs out toward the crane
const along = (path: [number, V3][], f: number): { p: V3; d: number; moving: number } => {
  let d = 0; for (let i = 0; i < path.length - 1; i++) { const [f0, a] = path[i], [f1, b] = path[i + 1], seg = Math.hypot(b[0] - a[0], b[2] - a[2]);
    if (f < f1) { const u = clamp01((f - f0) / (f1 - f0)); return { p: [lerp(a[0], b[0], u), 0, lerp(a[2], b[2], u)], d: d + seg * u, moving: f > f0 && f < f1 ? 1 : 0 }; } d += seg; }
  return { p: path[path.length - 1][1], d, moving: 0 };
};
export const bossAt = (f: number): V3 => {
  if (f >= T.gang0) return BOSS_DOOR;
  const q = f < 600 ? along(BOSS_PATH, f) : f < 700 ? along(BOSS_RUN, f) : along([[700, BOSS_RUN[1][1]], [736, [3.4, 0, SW + 0.5]]], f);
  return [q.p[0], q.p[2] < STEP_Z0 ? stepY(q.p[2]) : 0.16, q.p[2]];
};
const bossFace = faceTrack([[0, "proud"], [300, "proud"], [338, "smug"], [410, "proud"], [452, "neutral"], [458, "cringe"], [500, "sideEyeL"], [530, "panic"], [600, "worried"], [612, "panic"], [668, "nervousLaugh"], [700, "relieved"], [720, "neutral"], [728, "disbelief"], [750, "delighted"], [790, "proud"], [1450, "proud"], [1490, "delighted"], [1520, "relieved"]], 5);
const bossPose = (f: number): Odo5Pose => {
  const seg = f < 600 ? along(BOSS_PATH, f) : f < 736 ? (f < 700 ? along(BOSS_RUN, f) : along([[700, BOSS_RUN[1][1]], [736, [3.4, 0, SW + 0.5]]], f)) : { p: [0, 0, 0] as V3, d: 0, moving: 0 };
  const walking = seg.moving ? 1 : 0, face = bossFace(f);
  if (walking) return withFace(walkPose(BOSS, seg.d * (f >= 612 && f < 646 ? 1.0 : 1), 1, { armL: f < 340 ? BP_L : REST_L, lean: f >= 612 && f < 646 ? 0.14 : 0.04 }), face, f, 1);
  const show = pulse(T.blue0, T.blue0 + 12, T.problem - 4, T.problem + 6, f);
  const wave = pulse(646, 652, 690, 698, f), wv = Math.sin((f - 646) * 0.6) * 26 * wave, tip = pulse(1490, 1496, 1512, 1520, f), shrug = pulse(452, 458, 466, 474, f);
  const armL = wave > 0.05 ? { ...WAVE_L, hand: [WAVE_L.hand[0] + wv, WAVE_L.hand[1]] as [number, number] } : show > 0.05 ? BP_SHOW_L : f < T.blue0 + 4 ? BP_L : REST_L;
  const armR = wave > 0.05 ? { ...WAVE_R, hand: [WAVE_R.hand[0] - wv, WAVE_R.hand[1]] as [number, number] } : tip > 0.05 ? ARM.thumb : show > 0.05 ? BP_SHOW_R : f < T.blue0 + 4 ? BP_R : shrug > 0.3 ? ARM.shrugR : REST_R;
  return withFace(pose5({ costume: BOSS, armL, armR, blink: blinkAt(f, 1), bodyRoll: wave * Math.sin(f * 0.5) * 0.04 }), face, f, 1);
};
export const BLUEPRINT_SHOWN = (f: number) => pulse(T.blue0, T.blue0 + 12, T.problem - 4, T.problem + 6, f);
/** the blueprint sheet spans Brightwater's two hands (card px -> world), facing the camera; rolled (narrow) outside the show */
export const blueprintAt = (f: number, cam: V3): { p: V3; ry: number; w: number } | null => {
  if (f < T.blue0 - 6 || f > T.problem + 10) return null;
  const pose = bossPose(f), pos = bossAt(f);
  const hp = (side: -1 | 1) => { const s = shoulderPx5(pose, side), a = side < 0 ? pose.armL : pose.armR; return [s[0] + a.hand[0], s[1] + a.hand[1]] as [number, number]; };
  const L = cardWorld(pos, cam, hp(-1), 1.55, 0.12), R = cardWorld(pos, cam, hp(1), 1.55, 0.12);
  const w = Math.max(0.18, Math.hypot(R[0] - L[0], R[2] - L[2]) * (0.35 + 0.65 * BLUEPRINT_SHOWN(f)) + 0.1);
  return { p: [(L[0] + R[0]) / 2, (L[1] + R[1]) / 2 - 0.05, (L[2] + R[2]) / 2], ry: Math.atan2(cam[0] - pos[0], cam[2] - pos[2]), w };
};
// ---- "needed space": clerks squeezed into the vestibule behind him, jostling (each on its own rhythm + face)
const SQUEEZE: { p: V3; c: Costume; face: [number, FaceName][]; ph: number }[] = [
  { p: [-0.75, 0, BD / 2 - 2.35], c: tint(COSTUME.clerk, { shirt: "#3f5468" }, null), face: [[0, "awkwardSmile"], [330, "cringe"], [400, "sideEyeR"]], ph: 0 },
  { p: [0.7, 0, BD / 2 - 2.3], c: tint(COSTUME.hal, { shirt: "#7a6448" }, null), face: [[0, "worried"], [320, "panic"], [380, "nervousLaugh"]], ph: 1.3 },
  { p: [-0.35, 0, BD / 2 - 2.5], c: tint(COSTUME.clerk, { shirt: "#5c3c48" }, null), face: [[0, "deadpan"], [345, "sideEyeL"], [420, "bored"]], ph: 2.1 },
  { p: [0.35, 0, BD / 2 - 1.75], c: { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#c38a3a", shirtShade: "#a26f2a" } }, face: [[0, "nervousLaugh"], [350, "cringe"], [430, "awkwardSmile"]], ph: 0.7 },
  { p: [-0.8, 0, BD / 2 - 1.5], c: tint(COSTUME.clerk, { shirt: "#40506a" }, null), face: [[0, "confused"], [360, "suspicious"]], ph: 2.8 },
];
const squeezeAt = (f: number): Placed[] => f < 268 || f > 452 ? [] : SQUEEZE.map((q, i) => {
  const out = smooth(268 + i * 3, 290 + i * 3, f), z = lerp(q.p[2] - 0.6, q.p[2], out), jost = Math.sin(f * 0.23 + q.ph) * 0.05;
  const pose = withFace(pose5({ costume: q.c, armL: { hand: [-20, 40 + 20 * Math.sin(f * 0.2 + q.ph)], elbow: [-60, 80], shape: "open", rot: 0.2, bend: -1 }, armR: REST_R, bodyRoll: jost, headRoll: -jost * 1.4, blink: blinkAt(f, 10 + i) }), faceTrack(q.face, 6)(f), f, 10 + i);
  return { pose, pos: [q.p[0] + jost, stepY(z), z] as V3, h: 1.48, halo: 0.08 };
});
// ---- the engineer: walks to the trestle with plans, unrolls them, points from the building to the new spot
const ENG_A: V3 = [14.0, 0.16, SW - 1.4], ENG_B: V3 = [5.0, 0.16, SW - 1.1];
const engAt = (f: number): V3 => { const u = smooth(T.engineer0, T.point0 - 4, f); return [lerp(ENG_A[0], ENG_B[0], u), 0.16, lerp(ENG_A[2], ENG_B[2], u)]; };
const engFace = faceTrack([[0, "focused"], [T.point0, "smug"], [T.idea - 6, "idea"], [T.idea + 18, "proud"]], 5);
const engPose = (f: number): Odo5Pose => {
  const d = Math.abs(engAt(f)[0] - ENG_A[0]), walking = f > T.engineer0 && f < T.point0 - 4 ? clamp01(Math.min(f - T.engineer0, T.point0 - 4 - f) / 5) : 0;
  if (walking > 0.02) return withFace(walkPose(ENG, d, walking, { armR: { ...REST_R, shape: "grip" } }), FACES.focused, f, 2);
  const point = pulse(T.point0 + 6, T.point0 + 14, T.idea + 20, T.idea + 30, f), ph = (f - T.point0) / 40;
  const dir: [number, number] = [lerp(-150, -40, 0.5 + 0.5 * Math.sin(ph * Math.PI)), -60];
  return withFace(pose5({ costume: ENG, armR: point > 0.05 ? { hand: [dir[0] * -1, dir[1]], elbow: [60, 20], shape: "open", rot: 0.2, bend: 1 } : REST_R, armL: { hand: [-40, 120], elbow: [-50, 70], shape: "grip", rot: 0, bend: -1 }, blink: blinkAt(f, 2) }), engFace(f), f, 2);
};
// ---- crew: (1) two drive the footprint stakes with sledgehammers, (2) carry timbers from the truck to the cribs in pairs,
//      (3) each mans a screw-jack bar on his own rhythm. Carried timbers are real geometry between the two carriers' hands.
const crewSlot = (i: number): V3 => [-BW / 2 + 2.5 + i * ((BW - 5) / 5), 0.16, BD / 2 + 3.0];
const STAKERS: { x: number; z: number; t0: number }[] = [{ x: -7.0, z: NEW_HQ.z1, t0: 520 }, { x: 9.0, z: NEW_HQ.z1, t0: 532 }];
const stakerAt = (i: number, f: number): Placed => { const s = STAKERS[i], ph = ((f - s.t0) % 22 + 22) % 22, up = ph < 12 ? smooth(0, 12, ph) : 1 - smooth(12, 16, ph);
  return { pose: withFace(pose5({ costume: WORKER[i + 3], holdR: "hammer", armR: { hand: [lerp(40, 60, up), lerp(90, -130, up)], elbow: [lerp(70, 90, up), lerp(60, -20, up)], shape: "grip", rot: lerp(0.4, -2.4, up), bend: 1 }, armL: REST_L, lean: 0.1 * (1 - up), blink: blinkAt(f, 20 + i) }), up < 0.2 ? FACES.focused : FACES.neutral, f, 20 + i),
    pos: [s.x + 0.55, 0.16, s.z + 0.35], h: 1.5 }; };
const TRUCK_BED: V3 = [-16.0, 0.16, STREET[0] - 0.5];
const workerPose = (i: number, f: number, rel: V3): Placed => {
  const c = WORKER[i]; const r = rng(31 + i);
  if (f < T.support0 || f >= T.aerial0 + 4) return { pose: withFace(pose5({ costume: c, armL: REST_L, armR: i % 2 ? { ...REST_R, shape: "fist" } : REST_R, blink: blinkAt(f, 30 + i) }), FACES[(["neutral", "bored", "content", "deadpan", "focused", "neutral"] as FaceName[])[i]], f, 30 + i), pos: rel, h: 1.5 };
  if (f < T.jacks0) { // pairs carry one timber between them: from the truck to their crib, back again (each pair its own rhythm)
    const pair = Math.floor(i / 2), front = i % 2 === 0, per = 74 + pair * 11, ph = ((f - T.support0 + pair * 23) % per) / per, carry = ph < 0.5;
    const s = carry ? smooth(0.04, 0.46, ph) : 1 - smooth(0.54, 0.96, ph), dst = crewSlot(pair * 2 + 1);
    const base: V3 = [lerp(TRUCK_BED[0] + 1.5 + pair * 1.2, dst[0], s), 0.16, lerp(TRUCK_BED[2], dst[2] - 1.2, s)], gap = front ? 0.0 : -1.6;
    const dirx = Math.sign(dst[0] - TRUCK_BED[0]) || 1, p: V3 = [base[0] + gap * dirx * (carry ? 1 : -1) * 0.6, 0.16, base[2] + (front ? 0 : 0.25)];
    const moving = 4 * s * (1 - s) > 0.03 ? 1 : 0, strain = carry ? 1 : 0;
    const pose = withFace(walkPose(c, (f - T.support0) * 0.04, moving, { armL: carry ? { hand: [-30, -60], elbow: [-60, 20], shape: "grip", rot: -0.4, bend: -1 } : REST_L, armR: carry ? { hand: [30, -60], elbow: [60, 20], shape: "grip", rot: 0.4, bend: 1 } : REST_R, lean: 0.06 * strain }), carry ? FACES.focused : FACES.content, f, 30 + i);
    return { pose, pos: p, h: 1.5, flip: carry ? dirx < 0 : dirx > 0, carry: carry && front ? { a: [p[0], 1.45, p[2] + 0.05], b: [p[0] - dirx * 1.0, 1.45, p[2] + 0.3] } : undefined };
  }
  // jacks: each worker pushes his own bar on his own rhythm (jackTurn), leaning in on the push stroke
  const ph = ((f + i * 7) % 26) / 26, push = ph < 0.6 ? Math.sin((ph / 0.6) * Math.PI) : 0;
  return { pose: withFace(pose5({ costume: c, lean: 0.12 * push, blink: blinkAt(f, 30 + i),
    armL: { hand: [-20 + 10 * push, 70], elbow: [-60, 90], shape: "grip", rot: -0.2, bend: -1 }, armR: { hand: [20 + 10 * push, 70], elbow: [60, 90], shape: "grip", rot: 0.2, bend: 1 } }), push > 0.4 ? FACES.focused : (["neutral", "content", "bored"] as FaceName[]).map((n) => FACES[n])[i % 3], f, 30 + i), pos: crewSlot(i), h: 1.5 };
};
// ---- the crane operator in his cab (card behind the glass): smug -> confused -> sheepish
const opFace = faceTrack([[0, "smug"], [652, "confused"], [676, "awkwardSmile"], [700, "nervousLaugh"]], 5);
export const craneOperator = (f: number): Odo5Pose => withFace(pose5({ costume: tint(COSTUME.workerB, { shirt: "#4a3a2a", hat: "#3a3a3a" }), armR: { hand: [30, 40], elbow: [60, 80], shape: "grip", rot: 0, bend: 1 }, blink: blinkAt(f, 40) }), opFace(f), f, 40);
export const extPeople = (f: number, cam: V3): Placed[] => {
  const out: Placed[] = []; void cam;
  if (f >= 262 && f < T.windows0 - 10) out.push({ pose: bossPose(f), pos: bossAt(f), h: 1.55, light: 3, halo: 0.14, flip: (f < 340 && f > 296) || (f >= 612 && f < 646) ? false : f >= 700 && f < 736 });
  else if (f >= T.gang0) out.push({ pose: bossPose(f), pos: BOSS_DOOR, h: 1.55, light: 3, halo: 0.14 });
  out.push(...squeezeAt(f));
  if (f >= 515 && f < 640) for (let i = 0; i < 2; i++) out.push(stakerAt(i, f));
  if (f >= T.engineer0 && f < T.windows0 + 12) out.push({ pose: engPose(f), pos: engAt(f), h: 1.52, light: 2, flip: f < T.point0 - 4 });
  if (f < T.past0 || (f >= T.support0 && f < T.ext3_0)) {  // crew (the hook shows the same crew mid-move)
    const hook = f < T.past0, bz = bldAt(f).p[2];
    for (let i = 0; i < 6; i++) { const w = hook ? { ...workerPose(i, T.jacks0 + 20 + f, crewSlot(i)) } : workerPose(i, f, [14 - i * 0.5, 0.16, SW + 1.2]);
      if (hook || f >= T.jacks0) w.pos = [w.pos[0], w.pos[1], w.pos[2] + bz]; out.push(w); }
  }
  if (f >= T.gang0) STAFF.forEach((s, i) => { const t = f - s.t0; if (t < 0) return; const p = STAFF_PATH(t, i); out.push({ pose: withFace(walkPose(s.c, t * 0.034, p.walking), FACES[s.face], f, 50 + i), pos: p.pos, h: 1.5, halo: 0.1, flip: true }); });
  return out;
};
// staff walking into the building at its new position (front faces +x after the turn; entrance at x = -21, z = -16)
const STAFF: { c: Costume; t0: number; face: FaceName }[] = [
  { c: tint(COSTUME.clerk, { shirt: "#3f5468", hat: "#2a2a2a" }), t0: 1450, face: "content" }, { c: tint(COSTUME.hal, { shirt: "#7a6448", hat: "#d8c7a0" }), t0: 1462, face: "delighted" },
  { c: tint(COSTUME.clerk, { shirt: "#5c3c48", hat: "#3a2830" }), t0: 1474, face: "sideEyeL" }, { c: tint(COSTUME.odo, { shirt: "#c38a3a" }), t0: 1488, face: "bored" },
];
const DOOR_NEW = (): V3 => { const b = bldAt(1400); return [b.p[0] + BD / 2 + 0.2, 0.16, b.p[2]]; };
const BOSS_DOOR: V3 = (() => { const d = DOOR_NEW(); return [d[0] + 3.4, 0.16, d[2] + 1.6]; })();
const STAFF_PATH = (t: number, i: number): { pos: V3; walking: number } => {
  const door = DOOR_NEW(), start: V3 = [door[0] + 11 + i * 0.4, 0.16, door[2] + 3.5 - i * 0.9];
  const u = clamp01(t / 80); return { pos: [lerp(start[0], door[0] + 0.4, u), 0.16 + 0.4 * smooth(0.6, 0.9, u), lerp(start[2], door[2] + (i % 2 ? 0.3 : -0.3), u)], walking: u < 1 ? 1 : 0 };
};

// ================================================================ window crowd (independent office workers seen through the front windows)
type WinPerson = { floor: number; bay: number; dx: number; persona: Persona; h: number };
const WIN_COST: Costume[] = [tint(COSTUME.clerk, { shirt: "#3f5468" }), tint(COSTUME.hal, { shirt: "#7a6448" }), tint(COSTUME.clerk, { shirt: "#5c3c48" }), { ...COSTUME.odo, goggles: false, apron: false, pal: { shirt: "#c38a3a", shirtShade: "#a26f2a" } }];
const mkWin = (): WinPerson[] => { const r = rng(57), out: WinPerson[] = [];
  const idles: Persona["idle"][] = ["rest", "clasp", "behind", "hip", "pockets"];
  for (let fl = 0; fl < 6; fl++) for (let b = 0; b < 7; b++) { if (r() < 0.12) continue;
    const c = { ...WIN_COST[Math.floor(r() * WIN_COST.length)] }; c.hat = null;
    const clips: Persona["clips"] = []; const k = (out.length + Math.floor(r() * 2)) % 4; const slot = (out.length * 89 + Math.floor(r() * 20)) % 470; // staggered start slots: no two people share a start
    if (k === 0) clips.push({ kind: "talk", t0: slot, t1: 0, toward: r() < 0.5 ? 0.7 : -0.7, rate: 3 + r() * 2, gesture: r() < 0.5 ? 1 : -1 });
    if (k === 1) clips.push({ kind: "work", t0: slot, t1: 0, tool: "chalk", rate: 1.2 + r(), target: [-60, 60], amp: 0.6 });
    if (k === 2) clips.push({ kind: "look", t0: slot, t1: 0, x: (r() - 0.5) * 1.4, y: 0.2 });
    if (k === 3) clips.push({ kind: "nod", t0: slot, t1: 0, times: 2 + Math.floor(r() * 2) });
    if (r() < 0.55) clips.push({ kind: "look", t0: (slot + 160 + Math.floor(r() * 120)) % 480, t1: 0, x: (r() - 0.5) * 1.6, y: 0.1 + r() * 0.3 });
    for (const cl of clips) (cl as { t1: number; t0: number }).t1 = (cl as { t0: number }).t0 + 40 + Math.floor(r() * 80);
    out.push({ floor: fl, bay: b, dx: (r() - 0.5) * 0.5, h: 1.45 + r() * 0.12, persona: { seed: 300 + fl * 10 + b, costume: c, idle: idles[Math.floor(r() * idles.length)], breathe: 2 + Math.floor(r() * 3), sway: 1 + Math.floor(r() * 3), swayAmp: 0.006 + r() * 0.008, mood: r() < 0.6 ? "flat" : "smile", eyes: r() < 0.5 ? "lid" : "squint", brow: 0.6 + r() * 0.2, temper: 0.6 + r() * 0.6, clips } });
  } return out; };
export const WIN_PEOPLE = mkWin();
const CTX = { loop: 520, subjectX: () => 0 };
export const winPose = (i: number, f: number) => personPose(WIN_PEOPLE[i].persona, ((f % 520) + 520) % 520, CTX);
export const windowPeople = (f: number): { pose: Odo5Pose; local: V3; h: number }[] => {
  const hook = f >= 110 && f < T.past0, track = f >= T.windows0 - 6 && f < T.support0 + 6;
  if (!hook && !track) return [];
  return WIN_PEOPLE.filter((w) => (track || (w.floor >= 2 && w.floor <= 4)) && !(w.floor === 0 && w.bay === 3)).map((w, i) => ({ pose: winFace(w, i, f, hook), h: w.h,
    local: [-BW / 2 + (BW / 7) * (w.bay + 0.5) + w.dx, BASE_H + w.floor * FLOOR_H + 0.05, BD / 2 - 0.5] as V3 }));
};
/** window faces: in the hook almost nobody notices (bored / working), the coffee clerk gives the window a side-eye;
 *  during "hundreds still inside" everyone reacts differently (confused, side-eye, waving, suspicious, unbothered) */
const HOOK_FACES: FaceName[] = ["bored", "focused", "deadpan", "content", "focused", "bored", "talking"];
const TRACK_FACES: FaceName[] = ["confused", "sideEyeL", "bored", "suspicious", "shocked", "awkwardSmile", "deadpan", "content", "sideEyeR", "nervousLaugh", "disbelief", "delighted"];
const winFace = (w: WinPerson, i: number, f: number, hook: boolean): Odo5Pose => {
  const base = personPose(w.persona, f % 520, CTX), coffee = w.floor === COFFEE.floor && w.bay === COFFEE.bay;
  const name: FaceName = hook ? (coffee ? (f > 196 ? "sideEyeR" : f > 150 ? "content" : "focused") : HOOK_FACES[i % HOOK_FACES.length]) : TRACK_FACES[(i * 5) % TRACK_FACES.length];
  const p = withFace(base, FACES[name], f, 60 + i);
  const waves = !hook && i % 7 === 2, wv = Math.sin(f * 0.5 + i) * 18;
  return waves ? { ...p, armR: { hand: [70 + wv, -140], elbow: [90, -40], shape: "open", rot: 0.3, bend: 1 } } : p;
};
// the coffee clerk in the hook window: sips, the cup barely ripples
export const COFFEE = { floor: 3, bay: 4 };

// ================================================================ INT: switchboard office (building-local, y relative to the room floor)
export const camInt = camPath([
  { f: 0, pos: [-9.5, 1.62, 2.3], look: [-10.15, 1.12, 7.4], fov: 52 },       // down the switchboard row: operators recede toward the windows
  { f: 60, pos: [-9.4, 1.58, 2.65], look: [-10.0, 1.15, 7.5], fov: 48 },
  { f: 100, pos: [-8.6, 1.5, 3.2], look: [-6.1, 1.05, 6.35], fov: 44 },        // pan to Mabel + the window (street sliding)
  { f: 140, pos: [-8.3, 1.48, 3.5], look: [-6.0, 1.1, 6.6], fov: 40 },
  { f: 1213, pos: [-6.3, 1.25, 4.15], look: [-5.75, 0.92, 5.35], fov: 40 },    // "meanwhile": the desk telephone
  { f: 1238, pos: [-6.15, 1.15, 4.45], look: [-5.64, 0.86, 5.32], fov: 30 },   // it rings (close)
  { f: 1266, pos: [-6.4, 1.35, 4.15], look: [-6.0, 1.12, 6.35], fov: 42 },     // she lifts the handset
  { f: 1298, pos: [-6.6, 1.45, 3.75], look: [-6.1, 1.15, 6.5], fov: 46 },      // talking, side-eye at the window
  { f: 1330, pos: [-8.7, 1.56, 2.9], look: [-9.9, 1.15, 7.2], fov: 50 },
  { f: 1342, pos: [-9.0, 1.58, 2.8], look: [-10.05, 1.14, 7.3], fov: 51 },
  { f: 1528, pos: [-9.58, 1.64, 2.05], look: [-10.2, 1.1, 7.3], fov: 53 },     // loop pre-roll: moving into frame 0
  { f: FILM_FRAMES, pos: [-9.5, 1.62, 2.3], look: [-10.15, 1.12, 7.4], fov: 52 },  // = frame 0 (loop)
], 6);
export const OPS_X = [-1.6, -0.8, 0.0, 0.8, 1.6];   // pan positions of the five operators (sound only)
const OPS_COST: Costume[] = [
  { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#3f5f8a", shirtShade: "#2f4a6d", hair: "#3a2a1e" } },
  { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#8a3f4f", shirtShade: "#6d2f3d", hair: "#6b4a2e" } },
  { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#3f7a5a", shirtShade: "#2f5f45", hair: "#2a2a2a" } },
  { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#c99a3a", shirtShade: "#a07a2a", hair: "#8a5a32" } },
  { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#6a4a8a", shirtShade: "#523a6d", hair: "#4a3020" } },
];
const OP_FACES: FaceName[][] = [["focused", "talking", "content"], ["bored", "talking", "deadpan"], ["focused", "talking", "awkwardSmile"], ["content", "talking", "sideEyeL"], ["deadpan", "talking", "bored"]];
/** each operator: own call rhythm (lamp lights -> reach up to the jack field -> plug -> talk -> unplug), never in sync */
export const opAt = (i: number, f: number) => {
  const per = [150, 128, 172, 141, 163][i], off = [0, 37, 81, 15, 104][i];
  const ph = (((f + off) % per) + per) % per, reach = pulse(6, 16, 26, 34, ph), talk = pulse(26, 34, per - 30, per - 22, ph), unplug = pulse(per - 22, per - 14, per - 8, per, ph);
  const up = Math.max(reach, unplug), call = Math.floor((f + off) / per);
  const cm = (((call + i) % 3) + 3) % 3, face = talk > 0.5 ? talkMouth(FACES[OP_FACES[i][1]], f, i * 3) : FACES[OP_FACES[i][cm === 1 ? 0 : cm]];
  const pose = withFace(pose5({ costume: OPS_COST[i], armR: { hand: [lerp(40, 105, up), lerp(150, -40, up)], elbow: [lerp(30, 95, up), lerp(100, 40, up)], shape: up > 0.5 ? "grip" : "relaxed", rot: lerp(-0.1, -1.4, up), bend: 1 },
    armL: talk > 0.5 ? { hand: [-30, 110], elbow: [-70, 80], shape: "relaxed", rot: 0, bend: -1 } : REST_L, blink: blinkAt(f, 70 + i) }), { ...face, lookX: up > 0.3 ? 0.8 : face.lookX }, f, 70 + i);
  const plugged = talk > 0.3 || (ph >= 26 && ph < per - 10);
  const pm = (n: number, m: number) => ((n % m) + m) % m, cords = plugged ? [{ slot: pm(call, 4), col: pm(call * 7 + i * 3, 20) % 9, y: 1.05 + pm(call * 5 + i, 5) * 0.2 }] : [];
  return { pose, plugged, cords, ring: ph >= 0 && ph < 14, plug: ph >= 26 && ph < 28, unplugF: ph >= per - 10 && ph < per - 8 };
};
export const opCostumes = OPS_COST;
// ---- Mabel (clerk with the desk telephone) and Mr Finch (typing)
const MABEL = tint(COSTUME.clerk, { shirt: "#7a3f5a", shirtShade: "#5e2f45", tie: "#e8d9b0", hair: "#3a2418" }, null);
const FINCH = tint(COSTUME.clerk, { shirt: "#4a5a3a", shirtShade: "#384528", tie: "#7a2d22" }, null);
const mabFace = faceTrack([[0, "content"], [52, "sideEyeR"], [74, "suspicious"], [96, "awkwardSmile"], [118, "bored"],
  [1213, "focused"], [1238, "shocked"], [1248, "sideEyeL"], [1262, "deadpan"], [1272, "talking"], [1292, "sideEyeR"], [1306, "suspicious"], [1318, "content"], [1500, "content"]], 5);
export const mabelAt = (f: number) => {
  const ring = f >= 1238 && f < 1262 ? 1 : 0, lift = f >= 1258 ? Math.min(1, (f - 1258) / 12) : 0, shrug = pulse(96, 102, 110, 118, f);
  const write = f < 1238 && f > 1180 ? Math.sin(f * 0.6) * 6 : 0;
  let face = mabFace(f); if (f >= 1272 && f < 1330) face = talkMouth(face, f, 7, 0.9);
  if (f > 1290 && f < 1306) face = { ...face, lookX: 1, headRoll: 0.08 };
  const armL = lift > 0 ? { hand: [lerp(-60, -72, lift), lerp(120, -150, lift)] as [number, number], elbow: [lerp(-80, -118, lift), lerp(70, -20, lift)] as [number, number], shape: "grip" as const, rot: lerp(0, -2.6, lift), bend: -1 } : { hand: [-30 + write, 112] as [number, number], elbow: [-70, 78] as [number, number], shape: "grip" as const, rot: 0.2, bend: -1 };
  const armR = shrug > 0.3 ? ARM.shrugR : { hand: [30, 112] as [number, number], elbow: [70, 78] as [number, number], shape: "relaxed" as const, rot: -0.2, bend: 1 };
  return { pose: withFace(pose5({ costume: MABEL, armL, armR, blink: blinkAt(f, 80), headRoll: ring * Math.sin(f * 0.8) * 0.02 }), face, f, 80), ring, lift };
};
const finFace = faceTrack([[0, "focused"], [40, "bored"], [70, "focused"], [1213, "focused"], [1290, "sideEyeL"], [1305, "confused"], [1320, "focused"]], 6);
export const finchAt = (f: number) => {
  const t1 = Math.sin(f * 1.3) > 0.2 ? 8 : 0, t2 = Math.sin(f * 1.7 + 1) > 0.3 ? 8 : 0;
  return { pose: withFace(pose5({ costume: FINCH, armL: { hand: [-20, 108 + t1], elbow: [-70, 80], shape: "relaxed", rot: 0, bend: -1 }, armR: { hand: [20, 108 + t2], elbow: [70, 80], shape: "relaxed", rot: 0, bend: 1 }, blink: blinkAt(f, 81) }), finFace(f), f, 81) };
};
