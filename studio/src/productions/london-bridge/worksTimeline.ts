// Arizona works (film frames 1064-1480): trucks deliver the numbered blocks, crews rebuild the granite facing around
// the concrete core, the "no river" callback with Hal, excavators dig, water floods the channel. Pure functions of the
// ABSOLUTE film frame; sound events derived from the same data.
import { V3, clamp01, lerp, smooth } from "../../lib/math";
import { COSTUME, Odo5Pose, pose5, REST_L, REST_R, ARM, type Costume } from "../../char/odo5";
import { personEvents, personPose, type Persona } from "../../char/crowdLife";
import { groundY, BR } from "../../desert/DesertWorld";
import { camPath, TAU } from "./common";

const pulse = (a: number, b: number, c: number, d: number, f: number) => smooth(a, b, f) * (1 - smooth(c, d, f));

// ---------------- camera ----------------
export const camWorks = camPath([
  { f: 1040, pos: [-74, 2.4, 27], look: [-60, 1.4, 16], fov: 46 },
  { f: 1064, pos: [-66, 2.2, 25], look: [-52, 1.3, 15.5], fov: 46 },
  { f: 1110, pos: [-44, 2.6, 25], look: [-30, 1.6, 13.5], fov: 46 },
  { f: 1145, pos: [-26, 6.5, 36], look: [-4, 4.5, 2], fov: 48 },
  { f: 1210, pos: [-16, 7.0, 33], look: [0, 4.6, 0], fov: 48 },
  { f: 1268, pos: [-9, 4.5, 24], look: [-5, 3.2, 4], fov: 46 },
  { f: 1295, pos: [-6.4, 1.15, 11.8], look: [-7.5, 1.05, 7.5], fov: 41 },
  { f: 1360, pos: [-6.9, 1.1, 11.4], look: [-7.55, 1.0, 7.5], fov: 40 },
  { f: 1398, pos: [-6.6, 1.25, 12.0], look: [-7.3, 0.9, 7.5], fov: 41 },
  { f: 1430, pos: [-4.5, 6.8, 22], look: [0, -1.0, 2], fov: 47 },
  { f: 1462, pos: [-6.5, 3.6, 22], look: [-1, -0.5, 4], fov: 47 },
  { f: 1481, pos: [-9.0, 1.6, 20.9], look: [-8.4, 3.2, 4.0], fov: 49 },  // lands on the Reopening opening camera
  { f: 1500, pos: [-9.0, 1.5, 20.6], look: [-8.3, 3.3, 4.0], fov: 50 },
], 6);

// ---------------- trucks on the desert road (1064-1140) ----------------
export const ROAD = (x: number) => 15.5 - 0.06 * (x + 60) + 1.4 * Math.sin((x + 60) * 0.05);
export const trucksAt = (f: number) => [0, 1, 2].map((i) => {
  const t0 = 1004 + i * 14, x = lerp(-90, -18 - i * 6.5, smooth(t0, t0 + 95, f)), z = ROAD(x) + (i % 2) * 0.2;
  const x2 = lerp(-90, -18 - i * 6.5, smooth(t0, t0 + 95, f + 1)), sp = (x2 - x) * 30;
  const ang = Math.atan2(ROAD(x + 0.5) - ROAD(x - 0.5), 1);
  return { pos: [x, groundY(x, z), z] as V3, ry: -ang, speed: sp, spin: (x + 90) / 0.45, i };
});

// ---------------- rebuild (1139-1272) ----------------
export const buildClip = (f: number) => lerp(-0.2, BR.deck + 1.9, smooth(1148, 1262, f));  // granite facing grows over the core
export const scaffoldDown = (f: number) => smooth(1238, 1272, f);
export const mixerDrum = (f: number) => f * 0.12;
export const MCRANE: V3 = [-15.5, 0, 9.5], MC_RY = 0.3, MC_REACH = 0.9 + Math.cos(0.95) * 12.6;
/** slewing centre of the truck crane and the hook's ground point for a slew angle */
export const MC_C: V3 = [MCRANE[0] - 2 * Math.cos(MC_RY), 0, MCRANE[2] + 2 * Math.sin(MC_RY)];
export const hookXZ = (yaw: number): [number, number] => [MC_C[0] + Math.cos(MC_RY + yaw) * MC_REACH, MC_C[2] - Math.sin(MC_RY + yaw) * MC_REACH];
const yawFor = (x: number, z: number) => Math.atan2(-(z - MC_C[2]), x - MC_C[0]) - MC_RY;
const CYC0 = 1136, CYC = 44;
/** block-centre height under the hook for a given hook drop (TruckCrane geometry: superstructure +1.3, tip 12.95) */
const gMC = groundY(MCRANE[0], MCRANE[2]);
const dropFor = (blockY: number) => gMC + 11.4 - blockY;
const PICK_YAW0 = yawFor(-21.0, 15.6), DY = 1.1 / MC_REACH;
/** the three top-row blocks sit ON the hook's reach circle, so the hook picks each exactly where it rests */
export const MC_PICKS = [0, -1, 1].map((k) => { const yaw = PICK_YAW0 + k * DY, [x, z] = hookXZ(yaw); return { yaw, p: [x, groundY(x, z) + 0.9, z] as V3, ry: MC_RY + yaw }; });
export const MC_STACK_BASE = [0, -1, 1].flatMap((k) => { const [x, z] = hookXZ(PICK_YAW0 + k * DY); return [0, 0.8].map((d) => { const xx = x - Math.cos(MC_RY + PICK_YAW0) * d, zz = z + Math.sin(MC_RY + PICK_YAW0) * d; return { p: [xx, groundY(xx, zz) + 0.3, zz] as V3, ry: MC_RY + PICK_YAW0 + k * DY }; }); });
/** set point: on the reach circle where the block lies flush in the north facing (z = 4.18), heights follow the build */
const SET_X = MC_C[0] + Math.sqrt(MC_REACH ** 2 - (4.18 - MC_C[2]) ** 2), SET_YAW = yawFor(SET_X, 4.18);
export const mcSetAt = (n: number): { p: V3; t: number } => { const t = CYC0 + n * CYC + 0.5 * CYC; return { p: [SET_X, buildClip(t) + 0.32, 4.18], t }; };
export const mcraneAt = (f: number) => {
  const act = f >= CYC0 && f < CYC0 + 3 * CYC, n = Math.min(2, Math.max(0, Math.floor((f - CYC0) / CYC))), cyc = act ? ((f - CYC0) / CYC) % 1 : 0;
  const P = MC_PICKS[n], S = mcSetAt(n);
  const out = smooth(0.12, 0.42, cyc) * (1 - smooth(0.6, 0.92, cyc)), back = smooth(0.6, 0.92, cyc);
  const yaw = act ? (cyc < 0.6 ? lerp(P.yaw, SET_YAW, out / Math.max(1e-6, 1)) : lerp(SET_YAW, MC_PICKS[Math.min(2, n + 1)].yaw, back)) : f < CYC0 ? MC_PICKS[0].yaw : SET_YAW;
  const pickD = dropFor(P.p[1]), setD = dropFor(S.p[1]), high = Math.min(pickD, setD) - 1.6;
  let drop = pickD;
  if (act) { drop = lerp(pickD, high, smooth(0.06, 0.16, cyc)); drop = lerp(drop, setD, smooth(0.42, 0.5, cyc)); drop = lerp(drop, high, smooth(0.54, 0.64, cyc)); drop = lerp(drop, dropFor(MC_PICKS[Math.min(2, n + 1)].p[1]), smooth(0.86, 0.98, cyc)); }
  else if (f >= CYC0) drop = high;
  const carrying = act && cyc >= 0.06 && cyc < 0.5;
  return { yaw, hookDrop: drop, carrying, picked: f < CYC0 ? 0 : Math.min(3, n + (cyc >= 0.06 || !act ? 1 : 0)), placed: f < CYC0 ? 0 : Math.min(3, n + (cyc >= 0.5 || !act ? 1 : 0)), blockSpin: carrying ? lerp(0, -(MC_RY + yaw), smooth(0.2, 0.45, cyc)) : 0, n };
};
const tint = (b: Costume, pal: Record<string, string>): Costume => ({ ...b, pal: { ...(b.pal ?? {}), ...pal } });
export const CREW: { pos: V3; h: number; P: Persona }[] = [
  { pos: [-11.2, 0, 7.2], h: 1.45, P: { seed: 701, costume: COSTUME.workerA, holdR: "hammer", idle: "hip", breathe: 3, sway: 1, swayAmp: 0.01, mood: "flat", eyes: "squint", brow: 0.6, temper: 1.1, clips: [{ kind: "work", t0: 1146, t1: 1228, tool: "hammer", rate: 1.3, target: [10, 40] }, { kind: "hat", t0: 1236, t1: 1258, side: 1 }] } },
  { pos: [-9.4, 0, 7.8], h: 1.48, P: { seed: 702, costume: COSTUME.workerB, holdR: "wrench", idle: "rest", breathe: 2, sway: 2, swayAmp: 0.012, mood: "awkward", eyes: "lid", brow: 0.65, temper: 0.9, clips: [{ kind: "look", t0: 1140, t1: 1164, x: 0.5, y: 0.5 }, { kind: "work", t0: 1166, t1: 1250, tool: "wrench", rate: 2.2, target: [30, 30] }] } },
  { pos: [-4.6, 0, 7.4], h: 1.44, P: { seed: 703, costume: tint(COSTUME.workerA, { hat: "#e85d3a", hatShade: "#b8432a", shirt: "#3f8f5a", shirtShade: "#2f6d44" }), holdR: "shovel", idle: "rest", breathe: 3, sway: 2, swayAmp: 0.01, mood: "flat", eyes: "lid", brow: 0.6, temper: 1.0, clips: [{ kind: "work", t0: 1152, t1: 1240, tool: "shovel", rate: 0.9, target: [20, 110] }] } },
  { pos: [3.8, 0, 7.6], h: 1.46, P: { seed: 704, costume: tint(COSTUME.workerB, { shirt: "#2f5f8f", shirtShade: "#21456a", hat: "#f2c230" }), holdR: "hammer", idle: "pockets", breathe: 2, sway: 3, swayAmp: 0.008, mood: "smile", eyes: "squint", brow: 0.7, temper: 0.8, clips: [{ kind: "wave", t0: 1142, t1: 1168, side: 1, rate: 1.8, height: 0.8 }, { kind: "work", t0: 1176, t1: 1252, tool: "hammer", rate: 1.0, target: [0, 50] }] } },
  { pos: [9.6, 0, 7.0], h: 1.42, P: { seed: 705, costume: tint(COSTUME.odo, { shirt: "#c8823a", shirtShade: "#a56a2a" }), idle: "clasp", breathe: 3, sway: 1, swayAmp: 0.01, mood: "smile", eyes: "lid", brow: 0.7, temper: 0.9, clips: [{ kind: "point", t0: 1150, t1: 1180, side: -1, dir: [-160, -120] }, { kind: "talk", t0: 1190, t1: 1240, toward: -0.6, rate: 3.6, gesture: 1 }] } },
];
const CREW_OFF: (V3 | null)[] = [[5.6, 0, 6.2], [7.4, 0, 8.6], [12.2, 0, 6.4], null, null], OFF0 = [1252, 1256, 1262];
const walkE = (t: number) => (t < 0.12 ? t * t / 0.24 : t > 0.88 ? 1 - (1 - t) ** 2 / 0.24 : (t - 0.06) / 0.88);
export const crewAt = (i: number, f: number): V3 => { const p = CREW[i].pos, o = CREW_OFF[i]; if (!o) return [p[0], groundY(p[0], p[2]), p[2]]; const u = walkE(clamp01((f - OFF0[i]) / 40)); const x = lerp(p[0], o[0], u), z = lerp(p[2], o[2], u); return [x, groundY(x, z), z]; };
export const crewPose = (i: number, f: number): Odo5Pose => {
  const o = CREW_OFF[i];
  if (o && f >= OFF0[i] - 2 && f < OFF0[i] + 42) { const a = crewAt(i, f), d = Math.hypot(a[0] - CREW[i].pos[0], a[2] - CREW[i].pos[2]); return pose5({ costume: CREW[i].P.costume, view: "side", gait: d / 0.7, walk: clamp01((f - OFF0[i]) / 4) * (1 - smooth(OFF0[i] + 36, OFF0[i] + 41, f)), stride: 0.7, lean: 0.03, lookX: 0.5, eyes: CREW[i].P.eyes, mouth: CREW[i].P.mood, holdR: CREW[i].P.holdR, rim: 0.45, breathe: (f / 30) * TAU * 0.3 }); }
  return personPose(CREW[i].P, f, { loop: 100000, subjectX: () => 0 });
};
export const crewVisible = (_f: number) => true;

// ---------------- callback: Hal under the dry arch (1273-1399) ----------------
export const HAL_W: V3 = [-7.6, groundY(-7.6, 7.5), 7.5];
const HAL_IN: V3 = [-15.5, 0, 9.4], HAL_OUT: V3 = [-17.5, 0, 10.2];
export const halWorksAt = (f: number): V3 => { const a = walkE(clamp01((f - 1236) / 32)), b = walkE(clamp01((f - 1404) / 40)); const x = lerp(lerp(HAL_IN[0], HAL_W[0], a), HAL_OUT[0], b), z = lerp(lerp(HAL_IN[2], HAL_W[2], a), HAL_OUT[2], b); return [x, groundY(x, z), z]; };
export const halWorksVisible = (f: number) => f >= 1234 && f < 1450;
const halWalk = (f: number) => (f < 1272 ? { on: f >= 1234, d: Math.hypot(halWorksAt(f)[0] - HAL_IN[0], halWorksAt(f)[2] - HAL_IN[2]), w: clamp01((f - 1236) / 4) * (1 - smooth(1264, 1269, f)), out: false } : { on: f >= 1402, d: Math.hypot(halWorksAt(f)[0] - HAL_W[0], halWorksAt(f)[2] - HAL_W[2]), w: clamp01((f - 1404) / 4), out: true });
export const halWorksPose = (f: number): Odo5Pose => {
  const hw = halWalk(f);
  if (hw.on && hw.w > 0.01) return pose5({ costume: COSTUME.hal, view: "side", gait: hw.d / 0.72, walk: hw.w, stride: 0.72, lean: 0.04, lookX: hw.out ? -0.5 : 0.5, eyes: hw.out ? "squint" : "lid", mouth: hw.out ? "yikes" : "smile", blush: hw.out ? 0.6 : 0, sweat: hw.out ? 0.6 : 0, rim: 0.55, breathe: (f / 30) * TAU * 0.35 });
  const proud = pulse(1270, 1280, 1330, 1342, f), look = smooth(1342, 1354, f), freeze = pulse(1356, 1359, 1366, 1372, f), cringe = smooth(1366, 1378, f);
  const taDa = { hand: [100, -150] as [number, number], elbow: [96, -40] as [number, number], shape: "open" as const, rot: 0.1, bend: 1 };
  return pose5({
    costume: COSTUME.hal, view: "front", lookX: lerp(lerp(0.3, 0.6, look), 0.1, cringe), lookY: lerp(0.4 * proud, -0.9, look) * (1 - cringe * 0.4),
    eyes: freeze > 0.5 ? "wide" : cringe > 0.4 ? "squint" : proud > 0.5 ? "squint" : "lid", lids: 0.3, pupil: lerp(1, 0.42, freeze),
    browL: 0.8 + 0.4 * freeze - 0.6 * cringe, browR: 0.5 + 0.5 * freeze - 0.6 * cringe, worry: cringe,
    mouth: freeze > 0.5 ? "o" : cringe > 0.4 ? "yikes" : "smile", mouthW: 1 + 0.15 * cringe, blush: cringe, sweat: smooth(1372, 1390, f),
    armL: { ...REST_L, elbow: [-40, 100] }, armR: proud > 0.05 ? { ...taDa, hand: [lerp(REST_R.hand[0], taDa.hand[0], proud), lerp(REST_R.hand[1], taDa.hand[1], proud)], elbow: [lerp(40, 96, proud), lerp(100, -40, proud)] } : cringe > 0.3 ? ARM.scratch : REST_R,
    scratch: f * 1.6 * cringe, rim: 0.55, breathe: (f / 30) * TAU * 0.35, squash: 0.7 * Math.max(0, 1 - Math.abs(f - 1358) / 3), hairLag: 0.6 * pulse(1356, 1359, 1364, 1374, f),
    blink: [1300, 1335, 1392].some((b) => f >= b && f < b + 4),
  });
};
export const tumbleWorks = (f: number) => { const t = clamp01((f - 1300) / 110), z = lerp(-14, 16, t), x = lerp(-1.0, 1.4, t); return [{ p: [x, -BR.chanDepth + 0.36 + Math.abs(Math.sin(z * 1.3)) * 0.12, z] as V3, spin: (z + 14) / 0.36 }]; };

// ---------------- dig + flood (1400-1480) ----------------
export const EXC: { pos: V3; from: V3; out: V3; t0: number; ph: number }[] = [
  { pos: [-2.4, 0, 12.0], from: [-1.0, 0, -26], out: [10.8, 0, 12.0], t0: 1386, ph: 0 },
  { pos: [1.8, 0, -12.0], from: [1.0, 0, -40], out: [10.8, 0, -12.0], t0: 1380, ph: 0.35 },
];
export const excVisible = (_f: number) => true;
const DIG0 = 1418, DIG1 = 1450, OUT1 = 1472;
/** where the excavator is, which way it faces, and how far its tracks have rolled */
export const excPlace = (e: number, f: number) => {
  const E = EXC[e], a = walkE(clamp01((f - E.t0) / (DIG0 - 4 - E.t0))), b = walkE(clamp01((f - DIG1) / (OUT1 - DIG1)));
  const x = b > 0 ? lerp(E.pos[0], E.out[0], b) : lerp(E.from[0], E.pos[0], a), z = b > 0 ? E.pos[2] : lerp(E.from[2], E.pos[2], a);
  const ry = b > 0 ? lerp(-Math.PI / 2, 0, smooth(DIG1, DIG1 + 6, f)) : -Math.PI / 2;      // facing +z while driving in; turns to +x to climb out
  const dist = Math.hypot(E.pos[0] - E.from[0], E.pos[2] - E.from[2]) * a + Math.abs(E.out[0] - E.pos[0]) * b;
  const y = groundY(x, z), slope = Math.atan2(groundY(x + 0.8, z) - groundY(x - 0.8, z), 1.6) * (b > 0 ? 1 : 0);
  return { pos: [x, y, z] as V3, ry, pitch: slope, track: dist, moving: (f > E.t0 && f < DIG0 - 4) || (f > DIG1 && f < OUT1) };
};
const KEYS: [number, number, number, number, number][] = [ // cyc, boom, stick, bucket, yaw
  [0.0, 0.55, 1.3, 0.3, 0], [0.32, 0.12, 2.3, 1.7, 0], [0.5, 0.75, 2.2, 1.8, 0], [0.66, 0.75, 2.0, 1.8, 1.3], [0.78, 0.7, 1.6, 0.1, 1.3], [0.92, 0.6, 1.4, 0.3, 0.1], [1.0, 0.55, 1.3, 0.3, 0]];
export const excPose = (e: number, f: number) => {
  const p = excPlace(e, f), cyc = f < DIG0 || f >= DIG1 ? 0 : (((f - DIG0) / (DIG1 - DIG0)) + 0) % 1;
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= cyc) i++;
  const A = KEYS[i], B = KEYS[i + 1], u = smooth(A[0], B[0], cyc);
  return { yaw: lerp(A[4], B[4], u) * (e ? -1 : 1), boom: lerp(A[1], B[1], u), stick: lerp(A[2], B[2], u), bucket: lerp(A[3], B[3], u), track: p.track * 1.0, travel: p.moving };
};
export const digProgress = (f: number) => smooth(DIG0, DIG1 + 4, f);
export const floodFront = (f: number) => lerp(-160, 60, smooth(1444, 1484, f));
export const floodY = (f: number) => lerp(-BR.chanDepth + 0.08, -0.62, smooth(1444, 1484, f));

// ---------------- sound events ----------------
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
export const worksSoundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  for (const i of [0, 1, 2]) ev.push({ frame: 1070 + i * 12, kind: "truck_pass", x: -0.6 + 0.3 * i, gain: 0.85 - 0.15 * i, note: `1960s flatbed truck ${i} rumbles past with numbered blocks` });
  ev.push({ frame: 1100, kind: "air_brake", x: 0.2, gain: 0.6, note: "lead truck's air brakes hiss at the site" });
  ev.push({ frame: 1142, kind: "concrete_mixer", x: 0.6, gain: 0.6, note: "concrete mixer drum churning" });
  for (let f = CYC0 + 1; f < CYC0 + 3 * CYC; f++) { const c0 = ((f - 1 - CYC0) / CYC) % 1, c1 = ((f - CYC0) / CYC) % 1; if (c0 < 0.06 && c1 >= 0.06) ev.push({ frame: f, kind: "crane_winch", x: -0.5, gain: 0.45, note: "truck crane winch lifts a block off the stack" }); if (c0 < 0.5 && c1 >= 0.5) ev.push({ frame: f, kind: "stone_thud", x: -0.4, gain: 0.7, note: "granite block set into the facing" }); }
  CREW.forEach((p, i) => { for (const e of personEvents(p.P, i)) ev.push({ frame: e.frame, kind: e.kind, x: Math.max(-1, Math.min(1, p.pos[0] / 12)), gain: 1, note: e.note }); });
  for (const f of [1238, 1247, 1255]) ev.push({ frame: f, kind: "scaffold_clatter", x: (f % 3) * 0.3 - 0.3, gain: 0.6, note: "scaffold poles come down" });
  ev.push({ frame: 1276, kind: "fabric_swish_big", x: -0.2, gain: 0.7, note: "Hal's proud ta-da at the finished bridge" });
  ev.push({ frame: 1300, kind: "tumble_roll_2", x: 0.1, gain: 0.5, note: "tumbleweed rolls along the dry channel" });
  ev.push({ frame: 1358, kind: "freeze_sting", x: 0, gain: 0.45, note: "Hal freezes: no river" });
  ev.push({ frame: 1372, kind: "gulp", x: -0.2, gain: 0.6, note: "nervous gulp" });
  ev.push({ frame: 1384, kind: "excavator", x: 0.2, gain: 0.7, note: "excavators rumble in along the channel on their tracks" });
  ev.push({ frame: 1420, kind: "bucket_scrape", x: -0.2, gain: 0.75, note: "excavator buckets bite the channel bed" });
  ev.push({ frame: 1440, kind: "dirt_dump", x: 0.3, gain: 0.6, note: "soil dumped on the bank" });
  ev.push({ frame: 1452, kind: "excavator", x: 0.4, gain: 0.55, note: "excavators climb out of the channel" });
  ev.push({ frame: 1408, kind: "step_sand", x: -0.4, gain: 0.5, note: "Hal slinks away" }); ev.push({ frame: 1420, kind: "step_sand", x: -0.5, gain: 0.45, note: "Hal slinks away" });
  for (const f of [1242, 1250, 1258, 1265]) ev.push({ frame: f, kind: "step_sand", x: -0.3, gain: 0.55, note: "Hal walks up to admire the bridge" });
  ev.push({ frame: 1444, kind: "water_rush", x: 0, gain: 0.9, note: "water released: rushes down the new channel" });
  ev.push({ frame: 1476, kind: "splash_big", x: 0.1, gain: 0.7, note: "flood front crashes under the arches" });
  return ev;
};
