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
  const t0 = 1040 + i * 16, x = lerp(-90, -18 - i * 6.5, smooth(t0, t0 + 95, f)), z = ROAD(x) + (i % 2) * 0.2;
  const x2 = lerp(-90, -18 - i * 6.5, smooth(t0, t0 + 95, f + 1)), sp = (x2 - x) * 30;
  const ang = Math.atan2(ROAD(x + 0.5) - ROAD(x - 0.5), 1);
  return { pos: [x, groundY(x, z), z] as V3, ry: -ang, speed: sp, spin: (x + 90) / 0.45, i };
});

// ---------------- rebuild (1139-1272) ----------------
export const buildClip = (f: number) => lerp(-0.2, BR.deck + 1.9, smooth(1148, 1262, f));  // granite facing grows over the core
export const scaffoldDown = (f: number) => smooth(1238, 1272, f);
export const mixerDrum = (f: number) => f * 0.12;
export const MCRANE: V3 = [-15.5, 0, 9.5];
export const mcraneAt = (f: number) => {
  const cyc = ((f - 1140) / 44) % 1, swing = Math.sin(TAU * cyc) * 0.55, lift = 0.5 - 0.5 * Math.cos(TAU * cyc);
  return { yaw: 0.85 + swing, hook: 3.5 + 4.5 * lift, carrying: cyc > 0.05 && cyc < 0.5, active: f >= 1140 && f < 1270 };
};
const tint = (b: Costume, pal: Record<string, string>): Costume => ({ ...b, pal: { ...(b.pal ?? {}), ...pal } });
export const CREW: { pos: V3; h: number; P: Persona }[] = [
  { pos: [-11.2, 0, 7.2], h: 1.45, P: { seed: 701, costume: COSTUME.workerA, holdR: "hammer", idle: "hip", breathe: 3, sway: 1, swayAmp: 0.01, mood: "flat", eyes: "squint", brow: 0.6, temper: 1.1, clips: [{ kind: "work", t0: 1146, t1: 1228, tool: "hammer", rate: 1.3, target: [10, 40] }, { kind: "hat", t0: 1236, t1: 1258, side: 1 }] } },
  { pos: [-9.4, 0, 7.8], h: 1.48, P: { seed: 702, costume: COSTUME.workerB, holdR: "wrench", idle: "rest", breathe: 2, sway: 2, swayAmp: 0.012, mood: "awkward", eyes: "lid", brow: 0.65, temper: 0.9, clips: [{ kind: "look", t0: 1140, t1: 1164, x: 0.5, y: 0.5 }, { kind: "work", t0: 1166, t1: 1250, tool: "wrench", rate: 2.2, target: [30, 30] }] } },
  { pos: [-4.6, 0, 7.4], h: 1.44, P: { seed: 703, costume: tint(COSTUME.workerA, { hat: "#e85d3a", hatShade: "#b8432a", shirt: "#3f8f5a", shirtShade: "#2f6d44" }), holdR: "shovel", idle: "rest", breathe: 3, sway: 2, swayAmp: 0.01, mood: "flat", eyes: "lid", brow: 0.6, temper: 1.0, clips: [{ kind: "work", t0: 1152, t1: 1240, tool: "shovel", rate: 0.9, target: [20, 110] }] } },
  { pos: [3.8, 0, 7.6], h: 1.46, P: { seed: 704, costume: tint(COSTUME.workerB, { shirt: "#2f5f8f", shirtShade: "#21456a", hat: "#f2c230" }), holdR: "hammer", idle: "pockets", breathe: 2, sway: 3, swayAmp: 0.008, mood: "smile", eyes: "squint", brow: 0.7, temper: 0.8, clips: [{ kind: "wave", t0: 1142, t1: 1168, side: 1, rate: 1.8, height: 0.8 }, { kind: "work", t0: 1176, t1: 1252, tool: "hammer", rate: 1.0, target: [0, 50] }] } },
  { pos: [9.6, 0, 7.0], h: 1.42, P: { seed: 705, costume: tint(COSTUME.odo, { shirt: "#c8823a", shirtShade: "#a56a2a" }), idle: "clasp", breathe: 3, sway: 1, swayAmp: 0.01, mood: "smile", eyes: "lid", brow: 0.7, temper: 0.9, clips: [{ kind: "point", t0: 1150, t1: 1180, side: -1, dir: [-160, -120] }, { kind: "talk", t0: 1190, t1: 1240, toward: -0.6, rate: 3.6, gesture: 1 }] } },
];
export const crewPose = (i: number, f: number) => personPose(CREW[i].P, f, { loop: 100000, subjectX: () => 0 });
export const crewVisible = (f: number) => f >= 1120 && f < 1285;

// ---------------- callback: Hal under the dry arch (1273-1399) ----------------
export const HAL_W: V3 = [-7.6, groundY(-7.6, 7.5), 7.5];
export const halWorksVisible = (f: number) => f >= 1262 && f < 1420;
export const halWorksPose = (f: number): Odo5Pose => {
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
export const EXC: { pos: V3; ry: number; ph: number }[] = [{ pos: [-2.6, -BR.chanDepth, 3.5], ry: 0.5, ph: 0 }, { pos: [2.8, -BR.chanDepth, -7.5], ry: -2.4, ph: 0.4 }];
export const excVisible = (f: number) => f >= 1392 && f < 1482;
export const excPose = (e: number, f: number) => {
  const cyc = (((f - 1400) / 40 + EXC[e].ph) % 1 + 1) % 1, dig = Math.sin(TAU * cyc);
  return { yaw: 0.6 * Math.sin(TAU * cyc + 1.2), boom: -0.45 + 0.35 * dig, arm: 1.1 - 0.5 * dig, bucket: 0.5 + 0.9 * Math.max(0, dig), retreat: smooth(1446, 1470, f) };
};
export const floodFront = (f: number) => lerp(-160, 60, smooth(1444, 1484, f));
export const floodY = (f: number) => lerp(-BR.chanDepth + 0.08, -0.62, smooth(1444, 1484, f));

// ---------------- sound events ----------------
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
export const worksSoundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  for (const i of [0, 1, 2]) ev.push({ frame: 1050 + i * 16, kind: "truck_pass", x: -0.6 + 0.3 * i, gain: 0.85 - 0.15 * i, note: `1960s flatbed truck ${i} rumbles past with numbered blocks` });
  ev.push({ frame: 1128, kind: "air_brake", x: 0.2, gain: 0.6, note: "lead truck's air brakes hiss at the site" });
  ev.push({ frame: 1142, kind: "concrete_mixer", x: 0.6, gain: 0.6, note: "concrete mixer drum churning" });
  for (let f = 1140; f < 1270; f++) { const c0 = ((f - 1 - 1140) / 44) % 1, c1 = ((f - 1140) / 44) % 1; if (c1 < c0) ev.push({ frame: f, kind: "crane_winch", x: -0.5, gain: 0.45, note: "mobile crane winch" }); if (c0 < 0.5 && c1 >= 0.5) ev.push({ frame: f, kind: "stone_thud", x: -0.4, gain: 0.7, note: "granite block set into place" }); }
  CREW.forEach((p, i) => { for (const e of personEvents(p.P, i)) ev.push({ frame: e.frame, kind: e.kind, x: Math.max(-1, Math.min(1, p.pos[0] / 12)), gain: 1, note: e.note }); });
  for (const f of [1238, 1247, 1255]) ev.push({ frame: f, kind: "scaffold_clatter", x: (f % 3) * 0.3 - 0.3, gain: 0.6, note: "scaffold poles come down" });
  ev.push({ frame: 1276, kind: "fabric_swish_big", x: -0.2, gain: 0.7, note: "Hal's proud ta-da at the finished bridge" });
  ev.push({ frame: 1300, kind: "tumble_roll_2", x: 0.1, gain: 0.5, note: "tumbleweed rolls along the dry channel" });
  ev.push({ frame: 1358, kind: "freeze_sting", x: 0, gain: 0.45, note: "Hal freezes: no river" });
  ev.push({ frame: 1372, kind: "gulp", x: -0.2, gain: 0.6, note: "nervous gulp" });
  ev.push({ frame: 1398, kind: "excavator", x: 0.1, gain: 0.8, note: "excavator diesels rev and dig" });
  for (const e of [0, 1]) for (let f = 1400; f < 1460; f++) { const a = ((f - 1 - 1400) / 40 + EXC[e].ph) % 1, b = ((f - 1400) / 40 + EXC[e].ph) % 1; if (a < 0.2 && b >= 0.2) ev.push({ frame: f, kind: "bucket_scrape", x: e ? 0.3 : -0.2, gain: 0.7, note: `excavator ${e} bucket bites the channel bed` }); if (a < 0.7 && b >= 0.7) ev.push({ frame: f, kind: "dirt_dump", x: e ? 0.4 : -0.3, gain: 0.55, note: `excavator ${e} dumps soil on the bank` }); }
  ev.push({ frame: 1444, kind: "water_rush", x: 0, gain: 0.9, note: "water released: rushes down the new channel" });
  ev.push({ frame: 1476, kind: "splash_big", x: 0.1, gain: 0.7, note: "flood front crashes under the arches" });
  return ev;
};
