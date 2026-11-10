// short3 timeline: EXT camera path, every character's position + acting (pure functions of the frame), window crowd,
// rig build progress, jack ratchets, wrecking crane, stakes, new-HQ steel. INT (switchboard) camera + operators.
import * as THREE from "three";
import { V3, lerp, smooth, clamp01, rng } from "../../lib/math";
import { camPath, type Cam } from "../london-bridge/common";
import { pose5, shoulderPx5, COSTUME, REST_L, REST_R, ARM, type Odo5Pose, type ArmPose, type Costume } from "../../char/odo5";
import { cardWorld } from "../london-bridge/common";
import { personPose, type Persona } from "../../char/crowdLife";
import { BW, BD, FLOOR_H, BASE_H, SIDEWALK, STREET, NEW_HQ, T, bldAt, FILM_FRAMES } from "./world";

const pulse = (a: number, b: number, c: number, d: number, f: number) => smooth(a, b, f) * (1 - smooth(c, d, f));
const tint = (c: Costume, pal: Record<string, string>): Costume => ({ ...c, pal: { ...(c.pal ?? {}), ...pal } });
const SW = (SIDEWALK[0] + SIDEWALK[1]) / 2;     // sidewalk centre line (z) in front of the original building

// ================================================================ EXT camera (one smooth path; dissolves cover the time jumps)
export const camExt = camPath([
  // hook (flash-forward, building mid-move, front face at z ~ 3): start low at the jacks, rise along the facade
  { f: 110, pos: [7.5, 1.4, 11.5], look: [2.5, 1.6, 3.0], fov: 46 },
  { f: 150, pos: [6.5, 4.5, 11.5], look: [1.5, 5.5, 3.0], fov: 44 },
  { f: 195, pos: [2.4, 14.3, 8.4], look: [0.0, 14.05, 2.7], fov: 38 },      // straight into a floor-3 window: a clerk works on, unaware
  { f: 241, pos: [2.2, 14.4, 7.9], look: [0.0, 14.1, 2.7], fov: 36 },
  // 1930, before: street level, Brightwater walks in with the blueprint
  { f: 259, pos: [9.5, 1.75, 19.0], look: [3.0, 1.9, 11.0], fov: 42 },
  { f: 300, pos: [8.6, 1.7, 17.6], look: [2.6, 1.8, 11.4], fov: 40 },
  { f: 440, pos: [7.6, 1.65, 16.4], look: [2.6, 1.75, 11.6], fov: 36 },
  { f: 490, pos: [6.0, 1.6, 15.0], look: [2.7, 1.7, 11.6], fov: 32 },       // push in on the cringe
  // crane up: the new footprint's stakes + rope run straight through the old walls
  { f: 520, pos: [9.0, 6.0, 22.0], look: [1.0, 4.0, 6.0], fov: 44 },
  { f: 600, pos: [30.0, 44.0, 19.0], look: [0.0, 0.0, -1.0], fov: 44 },
  { f: 630, pos: [31.0, 46.0, 19.5], look: [0.0, 0.0, -1.0], fov: 44 },
  // wrecking crane rolls in (street, wide), is waved off, backs away
  { f: 660, pos: [26.0, 12.0, 27.5], look: [8.0, 4.0, 13.0], fov: 46 },
  { f: 700, pos: [17.0, 5.0, 25.0], look: [4.0, 3.0, 13.0], fov: 44 },
  // engineer at the trestle: plans + pointing
  { f: 712, pos: [11.0, 2.3, 19.5], look: [4.5, 1.5, 12.0], fov: 40 },
  { f: 778, pos: [10.4, 2.4, 19.0], look: [4.0, 1.6, 12.0], fov: 38 },
  // lateral track along the facade windows (hundreds still inside)
  { f: 795, pos: [-10.0, 9.5, 17.0], look: [-8.0, 9.2, 9.0], fov: 40 },
  { f: 862, pos: [9.0, 11.0, 17.0], look: [8.0, 10.6, 9.0], fov: 40 },
  // support: low at the base, cribbing, beams, rollers
  { f: 880, pos: [17.0, 2.6, 19.0], look: [6.0, 0.9, 11.0], fov: 46 },
  { f: 960, pos: [13.0, 2.3, 18.0], look: [2.0, 0.8, 11.0], fov: 46 },
  // the creep: low, sliding with the building
  { f: 1000, pos: [7.0, 1.5, 14.6], look: [0.0, 1.2, 9.5], fov: 42 },
  { f: 1090, pos: [5.5, 1.6, 13.0], look: [-1.0, 1.4, 7.8], fov: 42 },
  // aerial: slide back, turn 90 deg, slide sideways
  { f: 1112, pos: [32.0, 44.0, 20.0], look: [-8.0, 0.0, -6.0], fov: 46 },
  { f: 1213, pos: [26.0, 50.0, 18.0], look: [-14.0, 0.0, -10.0], fov: 46 },
  // (INT 1213-1340) then: finished, new position + the new HQ steel rising on the old site
  { f: 1330, pos: [12.0, 13.0, 26.0], look: [-18.0, 7.0, -14.0], fov: 46 },
  { f: 1447, pos: [6.0, 9.0, 18.0], look: [-20.0, 7.0, -16.0], fov: 44 },
  // gangway: staff walk in, Brightwater tips his bowler
  { f: 1465, pos: [-4.5, 2.6, -21.0], look: [-17.0, 1.8, -16.0], fov: 42 },
  { f: 1530, pos: [-5.5, 2.7, -20.0], look: [-17.5, 2.0, -16.0], fov: 42 },
], 6);

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
export const TRESTLE: V3 = [5.6, 0.16, SW + 0.3];
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
export const craneAt = (f: number) => {
  if (f < T.wreck0 - 4 || f > T.windows0 + 30) return { on: false, x: 60, swing: 0 };
  const inU = smooth(T.wreck0, T.wreckWave + 8, f), outU = smooth(T.wreckBack - 10, T.windows0 + 28, f);
  const x = lerp(lerp(58, 16, inU), 62, outU);
  const v = (lerp(lerp(58, 16, smooth(T.wreck0, T.wreckWave + 8, f + 1)), 62, smooth(T.wreckBack - 10, T.windows0 + 28, f + 1)) - x);
  const swing = 0.22 * Math.sin(f * 0.12) * (0.4 + Math.min(1, Math.abs(v) * 2)) - v * 0.8;     // ball sways with the crane's acceleration
  return { on: true, x, swing };
};

// ================================================================ characters
type Placed = { pose: Odo5Pose; pos: V3; h: number; flip?: boolean; light?: number; halo?: number };
const walkPose = (costume: Costume, d: number, walking: number, extra: Partial<Odo5Pose> = {}): Odo5Pose =>
  pose5({ costume, view: walking > 0.02 ? "side" : "front", gait: d / 0.72, walk: walking, stride: 0.72, lean: 0.04 * walking, ...extra });
const BOSS = tint(COSTUME.clerk, { shirt: "#5b4632", shirtShade: "#463524", hat: "#2b241e", hatShade: "#191510", tie: "#7a2d22" });
const ENG = tint(COSTUME.workerB, { hat: "#f0f0ea", hatShade: "#c9c7bd", shirt: "#3d5a7a", shirtShade: "#2c4560" });
const WORKER: Costume[] = [
  tint(COSTUME.workerA, { shirt: "#7a5a3a", shirtShade: "#5c4228", hat: "#d9a520" }), tint(COSTUME.workerB, { shirt: "#4a5f3a", shirtShade: "#384a2b", hat: "#c98f1c" }),
  tint(COSTUME.workerA, { shirt: "#6c3f34", shirtShade: "#522f26", hat: "#e0b23a" }), tint(COSTUME.workerB, { shirt: "#3c4b63", shirtShade: "#2c384b", hat: "#d6a32e" }),
  tint(COSTUME.workerA, { shirt: "#8a7a5a", shirtShade: "#6d5f45", hat: "#cf9a26" }), tint(COSTUME.workerB, { shirt: "#5a3f5f", shirtShade: "#432f47", hat: "#e2b440" }),
];
// Brightwater (the executive): walks in, unrolls the blueprint, shows it, cringes, looks up, waves off the crane, grins
const BP_L: ArmPose = { hand: [40, 40], elbow: [-30, 86], shape: "grip", rot: -0.6, bend: -1 }, BP_R: ArmPose = { hand: [-40, 40], elbow: [30, 86], shape: "grip", rot: 0.6, bend: 1 };
const BP_SHOW_L: ArmPose = { hand: [10, -10], elbow: [-50, 60], shape: "grip", rot: -1.0, bend: -1 }, BP_SHOW_R: ArmPose = { hand: [-10, -10], elbow: [50, 60], shape: "grip", rot: 1.0, bend: 1 };
const WAVE_L: ArmPose = { hand: [-70, -150], elbow: [-90, -40], shape: "open", rot: -0.3, bend: -1 }, WAVE_R: ArmPose = { hand: [70, -150], elbow: [90, -40], shape: "open", rot: 0.3, bend: 1 };
const BOSS_A: V3 = [-1.0, 0.16, SW + 0.2], BOSS_B: V3 = [2.6, 0.16, SW + 0.4];
export const bossAt = (f: number): V3 => { const u = smooth(T.exec0, T.blue0 - 6, f); return [lerp(BOSS_A[0], BOSS_B[0], u), 0.16, lerp(BOSS_A[2], BOSS_B[2], u)]; };
const bossPose = (f: number): Odo5Pose => {
  const d = Math.abs(bossAt(f)[0] - BOSS_A[0]), walking = f > T.exec0 && f < T.blue0 - 6 ? clamp01(Math.min(f - T.exec0, T.blue0 - 6 - f) / 5) : 0;
  if (walking > 0.02) return walkPose(BOSS, d, walking, { mouth: "smile", eyes: "lid", armL: BP_L });
  const show = pulse(T.blue0, T.blue0 + 12, T.problem - 4, T.problem + 6, f), cringe = pulse(T.cringe0, T.cringe0 + 4, T.craneUp0 + 30, T.craneUp0 + 44, f);
  const wave = pulse(T.wreckWave - 6, T.wreckWave, T.wreckBack - 2, T.wreckBack + 6, f), wv = Math.sin((f - T.wreckWave) * 0.55) * 22 * wave;
  const grin = smooth(T.idea, T.idea + 8, f), tip = pulse(1490, 1496, 1512, 1520, f);
  const armL = wave > 0.05 ? { ...WAVE_L, hand: [WAVE_L.hand[0] + wv, WAVE_L.hand[1]] as [number, number] } : show > 0.05 ? BP_SHOW_L : f < T.blue0 + 4 ? BP_L : REST_L;
  const armR = wave > 0.05 ? { ...WAVE_R, hand: [WAVE_R.hand[0] - wv, WAVE_R.hand[1]] as [number, number] } : tip > 0.05 ? ARM.thumb : show > 0.05 ? BP_SHOW_R : f < T.blue0 + 4 ? BP_R : REST_R;
  return pose5({ costume: BOSS, lookX: cringe > 0.5 ? 0.45 : f > T.craneUp0 && f < T.wreck0 ? 0.35 : 0.1, lookY: f > T.craneUp0 && f < T.wreck0 ? -0.6 : 0,
    eyes: cringe > 0.5 ? "squint" : wave > 0.3 ? "wide" : "lid", mouth: cringe > 0.5 ? "yikes" : wave > 0.3 ? "o" : grin > 0.5 || show > 0.5 ? "smile" : "awkward",
    sweat: cringe, blush: cringe * 0.6, browL: cringe > 0.5 ? 0.9 : 0.6, browR: cringe > 0.5 ? 0.9 : 0.1, worry: cringe, armL, armR, blink: [330, 400, 560, 610, 760].some((b) => f >= b && f < b + 4) });
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
// the engineer: walks to the trestle carrying plans, unrolls them, points from the building to the new spot
const ENG_A: V3 = [16.0, 0.16, SW - 0.2], ENG_B: V3 = [6.6, 0.16, SW - 0.6];
const engAt = (f: number): V3 => { const u = smooth(T.engineer0, T.point0 - 4, f); return [lerp(ENG_A[0], ENG_B[0], u), 0.16, lerp(ENG_A[2], ENG_B[2], u)]; };
const engPose = (f: number): Odo5Pose => {
  const d = Math.abs(engAt(f)[0] - ENG_A[0]), walking = f > T.engineer0 && f < T.point0 - 4 ? clamp01(Math.min(f - T.engineer0, T.point0 - 4 - f) / 5) : 0;
  if (walking > 0.02) return walkPose(ENG, d, walking, { mouth: "flat", armR: { ...REST_R, shape: "grip" } });
  const point = pulse(T.point0 + 6, T.point0 + 14, T.idea + 20, T.idea + 30, f), ph = (f - T.point0) / 40;
  const dir: [number, number] = [lerp(-150, -40, 0.5 + 0.5 * Math.sin(ph * Math.PI)), -60];
  return pose5({ costume: ENG, lookX: -0.4, eyes: "lid", mouth: point > 0.5 ? "smile" : "flat", browL: 0.7, browR: 0.3,
    armR: point > 0.05 ? { hand: [-dir[0] * -1, dir[1]], elbow: [60, 20], shape: "open", rot: 0.2, bend: 1 } : REST_R, armL: { hand: [-40, 120], elbow: [-50, 70], shape: "grip", rot: 0, bend: -1 } });
};
// workers: carry timber to the cribs (two by two), tap them level with hammers, then each mans a screw-jack bar
const crewSlot = (i: number): V3 => [-BW / 2 + 2.5 + i * ((BW - 5) / 5), 0.16, BD / 2 + 3.0];
const workerPose = (i: number, f: number, rel: V3): Placed => {
  const c = WORKER[i]; const r = rng(31 + i);
  if (f < T.support0 || f >= T.aerial0 + 4) { // idle by the timber pile, independent fidgets
    return { pose: pose5({ costume: c, lookX: (r() - 0.5) * 0.6, mouth: "flat", eyes: "lid", armL: REST_L, armR: i % 2 ? { ...REST_R, shape: "fist" } : REST_R, blink: ((f + i * 13) % (70 + i * 9)) < 4 }), pos: rel, h: 1.5 };
  }
  if (f < T.jacks0) { // carry trips: out to the crib line and back, phase-shifted AND different speeds per worker
    const per = 62 + i * 9, ph = ((f - T.support0 + i * 17) % per) / per, carry = ph < 0.5;
    const s = carry ? smooth(0, 0.5, ph) : 1 - smooth(0.5, 1, ph);
    const p: V3 = [lerp(14.5 - i * 0.4, crewSlot(i)[0], s), 0.16, lerp(SW + 0.8, crewSlot(i)[2] - 0.6, s)];
    const moving = 4 * s * (1 - s) > 0.05 ? 1 : 0;
    return { pose: walkPose(c, ((f - T.support0) * 0.035) % 100, moving, { armL: carry ? { hand: [-30, -60], elbow: [-60, 20], shape: "grip", rot: -0.4, bend: -1 } : REST_L, armR: carry ? { hand: [30, -60], elbow: [60, 20], shape: "grip", rot: 0.4, bend: 1 } : REST_R }), pos: p, h: 1.5, flip: !carry };
  }
  // jacks: each worker pushes his own bar on his own rhythm (jackTurn), leaning in on the push stroke
  const ph = ((f + i * 7) % 26) / 26, push = ph < 0.6 ? Math.sin((ph / 0.6) * Math.PI) : 0;
  return { pose: pose5({ costume: c, lookX: 0.0, eyes: push > 0.4 ? "squint" : "lid", mouth: push > 0.4 ? "flat" : "awkward", lean: 0.12 * push,
    armL: { hand: [-20 + 10 * push, 70], elbow: [-60, 90], shape: "grip", rot: -0.2, bend: -1 }, armR: { hand: [20 + 10 * push, 70], elbow: [60, 90], shape: "grip", rot: 0.2, bend: 1 } }), pos: crewSlot(i), h: 1.5 };
};
// pedestrians on the sidewalk / far sidewalk in 1930 (independent walks, different speeds/directions; enter + exit frame)
const PEDS = [
  { c: tint(COSTUME.clerk, { shirt: "#3b4a5c", hat: "#2a2a2a" }), z: SW + 1.6, x0: -30, v: 0.045, t0: 262 },
  { c: tint(COSTUME.hal, { shirt: "#6f5b45", hat: "#c9b88f" }), z: SW + 1.9, x0: 30, v: -0.038, t0: 300 },
  { c: tint(COSTUME.workerA, { shirt: "#556b4a", hat: "#8a6a3a" }), z: STREET[1] + 1.5, x0: -24, v: 0.032, t0: 270 },
  { c: tint(COSTUME.clerk, { shirt: "#5a3a3a", hat: "#3a2a22" }), z: STREET[1] + 2.2, x0: 26, v: -0.05, t0: 330 },
];
export const extPeople = (f: number, cam: V3): Placed[] => {
  const out: Placed[] = []; void cam;
  if (f >= T.past0 && f < T.windows0) out.push({ pose: bossPose(f), pos: bossAt(f), h: 1.55, light: 3, halo: 0.14, flip: f < T.blue0 - 6 });
  else if (f >= T.gang0) out.push({ pose: bossPose(f), pos: STAFF_DOOR(f, 0.4), h: 1.55, light: 3, halo: 0.14 });
  if (f >= T.engineer0 && f < T.windows0 + 12) out.push({ pose: engPose(f), pos: engAt(f), h: 1.52, light: 2, flip: f < T.point0 - 4 });
  if (f >= T.past0 && f < T.windows0) PEDS.forEach((p) => { const t = f - p.t0; if (t < 0) return; const x = p.x0 + p.v * t * 30 / 30 * 1; if (Math.abs(x) > 34) return;
    out.push({ pose: walkPose(p.c, Math.abs(p.v) * t, 1, { mouth: "flat" }), pos: [x, 0.16, p.z], h: 1.5, flip: p.v < 0, halo: 0.08 }); });
  if (f < T.past0 || (f >= T.support0 && f < T.ext3_0)) {  // crew (the hook shows the same crew mid-move)
    const hook = f < T.past0, bz = bldAt(f).p[2];
    for (let i = 0; i < 6; i++) { const w = hook ? { ...workerPose(i, T.jacks0 + 20 + f, crewSlot(i)) } : workerPose(i, f, [14 - i * 0.5, 0.16, SW + 1.2]);
      if (hook || f >= T.jacks0) w.pos = [w.pos[0], w.pos[1], w.pos[2] + bz]; out.push(w); }
  }
  if (f >= T.gang0) STAFF.forEach((s, i) => { const t = f - s.t0; if (t < 0) return; const p = STAFF_PATH(t, i); out.push({ pose: walkPose(s.c, t * 0.034, p.walking, { mouth: "smile" }), pos: p.pos, h: 1.5, halo: 0.1 }); });
  return out;
};
// staff walking across the gangway into the building at its new position (front faces +x after the turn)
const STAFF = [
  { c: tint(COSTUME.clerk, { shirt: "#3f5468", hat: "#2a2a2a" }), t0: 1452 }, { c: tint(COSTUME.hal, { shirt: "#7a6448", hat: "#d8c7a0" }), t0: 1470 },
  { c: tint(COSTUME.clerk, { shirt: "#5c3c48", hat: "#3a2830" }), t0: 1484 }, { c: tint(COSTUME.odo, { shirt: "#c38a3a" }), t0: 1497 },
];
const STAFF_DOOR = (f: number, side: number): V3 => { void f; const b = bldAt(1400); return [b.p[0] + BD / 2 + 3.6, 0.16, b.p[2] - 2.0 * side]; };
const STAFF_PATH = (t: number, i: number): { pos: V3; walking: number } => {
  const b = bldAt(1400), door: V3 = [b.p[0] + BD / 2 + 0.6, 0.16, b.p[2]], start: V3 = [b.p[0] + BD / 2 + 9 + i * 0.6, 0.16, b.p[2] + 4 + i * 1.2];
  const u = clamp01(t / 70); return { pos: [lerp(start[0], door[0], u), 0.16 + 0.55 * smooth(0.55, 0.85, u), lerp(start[2], door[2], u)], walking: u < 1 ? 1 : 0 };
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
  return WIN_PEOPLE.filter((w) => track || (w.floor >= 2 && w.floor <= 4)).map((w) => ({ pose: personPose(w.persona, f % 520, CTX), h: w.h,
    local: [-BW / 2 + (BW / 7) * (w.bay + 0.5) + w.dx, BASE_H + w.floor * FLOOR_H + 0.05, BD / 2 - 0.5] as V3 }));
};
// the coffee clerk in the hook window: sips, the cup barely ripples
export const COFFEE = { floor: 3, bay: 4 };

// ================================================================ INT: switchboard floor
export const camInt = camPath([
  { f: 0, pos: [1.3, 1.9, 3.0], look: [0.1, 1.2, -0.4], fov: 42 },
  { f: 113, pos: [3.2, 2.2, 5.2], look: [0.0, 1.3, -0.5], fov: 46 },
  { f: 140, pos: [3.5, 2.25, 5.5], look: [-0.1, 1.3, -0.5], fov: 46 },
  { f: 1210, pos: [-4.2, 2.1, 3.9], look: [-1.2, 1.25, -0.5], fov: 44 },
  { f: 1330, pos: [1.8, 2.05, 4.1], look: [0.3, 1.25, -0.5], fov: 42 },
  { f: 1530, pos: [2.0, 2.05, 4.3], look: [0.4, 1.25, -0.5], fov: 42 },
  { f: FILM_FRAMES, pos: [1.3, 1.9, 3.0], look: [0.1, 1.2, -0.4], fov: 42 },   // = frame 0 (loop)
], 6);
export const OPS_X = [-4.2, -2.8, -1.4, 0.0, 1.4, 2.8];   // operator seats along the board (0 = Ada, the hero)
const OPS_COST: Costume[] = [
  { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#3f5f8a", shirtShade: "#2f4a6d", hair: "#3a2a1e" } },
  { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#8a3f4f", shirtShade: "#6d2f3d", hair: "#6b4a2e" } },
  { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#3f7a5a", shirtShade: "#2f5f45", hair: "#2a2a2a" } },
  { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#c99a3a", shirtShade: "#a07a2a", hair: "#8a5a32" } },
  { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#6a4a8a", shirtShade: "#523a6d", hair: "#4a3020" } },
  { ...COSTUME.odo, goggles: false, apron: false, hat: null, pal: { shirt: "#3a6a7a", shirtShade: "#2a5260", hair: "#2e2018" } },
];
/** each operator: own call rhythm (answer -> plug -> talk -> unplug), never in sync. Returns pose + current cord state. */
export const opAt = (i: number, f: number) => {
  const per = [150, 128, 172, 141, 163, 119][i], off = [0, 37, 81, 15, 104, 66][i];
  const ph = (((f + off) % per) + per) % per, reach = pulse(6, 18, 30, 40, ph), talk = pulse(26, 34, per - 30, per - 22, ph), unplug = pulse(per - 22, per - 12, per - 6, per, ph);
  const hand: [number, number] = [lerp(-30, -95, Math.max(reach, unplug)), lerp(150, 40, Math.max(reach, unplug))];
  const pose = pose5({ costume: OPS_COST[i], lookX: talk > 0.5 ? (i % 2 ? 0.25 : -0.25) : -0.1, lookY: reach > 0.5 ? 0.35 : 0.05, eyes: "lid", mouth: talk > 0.5 && Math.sin((f + i * 5) * 0.9) > 0 ? "o" : i === 0 ? "smile" : "flat",
    armR: { hand, elbow: [lerp(20, -40, Math.max(reach, unplug)), lerp(96, 70, Math.max(reach, unplug))], shape: "grip", rot: 0.2, bend: 1 },
    armL: talk > 0.5 ? { hand: [-36, -92], elbow: [-80, 0], shape: "grip", rot: -2.2, bend: -1 } : REST_L, blink: ((f + i * 23) % (64 + i * 7)) < 4,
    browL: 0.65, browR: 0.25 });
  return { pose, plugged: talk > 0.3, ring: ph >= 2 && ph < 4, plug: ph >= 34 && ph < 36, unplugF: ph >= per - 12 && ph < per - 10 };
};
export const opCostumes = OPS_COST;
