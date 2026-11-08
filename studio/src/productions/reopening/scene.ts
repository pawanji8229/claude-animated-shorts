// Production "reopening" — 291 frames (9.6914 s narration), ONE take, designed as a seamless loop.
// Pure functions of the frame. Everything periodic uses integer cycles per loop so frame 291 == frame 0.
import { V3, clamp01, lerp, smooth } from "../../lib/math";
import { ARM, ArmPose, COSTUME, Costume, Odo5Pose, pose5, REST_L, REST_R } from "../../char/odo5";
import { groundY } from "../../desert/DesertWorld";
import { personPose, personEvents, personFlash, type Persona } from "../../char/crowdLife";

export const FPS = 30;
export const FILM_FRAMES = 291;
const N = FILM_FRAMES;
export const loopT = (f: number) => ((f % N) + N) % N / N;
const TAU = Math.PI * 2;
const pulse = (a: number, b: number, c: number, d: number, f: number) => smooth(a, b, f) * (1 - smooth(c, d, f));

// ---------------- camera: base pose + integer-frequency drift (position & velocity identical at the loop seam) -----
const HAL_X = -9.0, HAL_Z = 14.8;
export const camAt = (f: number) => {
  const t = loopT(f);
  const pos: V3 = [-9.0 + 1.6 * Math.sin(TAU * t), 1.5 + 0.2 * Math.sin(2 * TAU * t + 0.5), 20.6 - 0.7 * Math.sin(TAU * t + 1.2)];
  // aim tracks Hal (keeps him ~centre all loop) while the orbit gives the bridge parallax; small periodic drift on top
  const k = (pos[2] - 4.0) / (pos[2] - HAL_Z);
  const look: V3 = [pos[0] + (HAL_X + 0.35 - pos[0]) * k * 0.9 + 0.4 * Math.sin(TAU * t - 0.4), 3.3 + 0.15 * Math.sin(TAU * t), 4.0];
  const fov = 50 + 1.2 * Math.cos(TAU * t);
  return { pos, look, fov, focus: Math.hypot(HAL[0] - pos[0], 1 - pos[1], HAL[2] - pos[2]) };
};

// ---------------- Hal ----------------
export const HAL: V3 = [-9.0, groundY(-9.0, 14.8), 14.8];
const WAVE: ArmPose = { hand: [96, -150], elbow: [112, -34], shape: "open", rot: 0, bend: 1 };
const POINT_BACK: ArmPose = { hand: [128, 18], elbow: [96, 74], shape: "open", rot: -1.1, bend: 1 };
type K = { f: number; arm: ArmPose };
const R_KEYS: K[] = [{ f: 0, arm: WAVE }, { f: 150, arm: WAVE }, { f: 164, arm: POINT_BACK }, { f: 212, arm: POINT_BACK }, { f: 226, arm: { ...REST_R, elbow: [40, 100] } }, { f: 242, arm: { ...REST_R, elbow: [40, 100] } }, { f: 254, arm: ARM.thumb }, { f: 268, arm: ARM.thumb }, { f: 284, arm: WAVE }, { f: 999, arm: WAVE }];
const armAt = (keys: K[], f: number): ArmPose => {
  let i = 0; while (i < keys.length - 2 && keys[i + 1].f <= f) i++;
  const a = keys[i].arm, b = keys[i + 1].arm, u = smooth(keys[i].f, keys[i + 1].f, f);
  const ea = a.elbow ?? [40, 100], eb = b.elbow ?? [40, 100], arc = Math.sin(Math.PI * u) * 26;
  return { hand: [lerp(a.hand[0], b.hand[0], u) + arc, lerp(a.hand[1], b.hand[1], u) - arc * 0.3], elbow: [lerp(ea[0], eb[0], u) + arc * 0.5, lerp(ea[1], eb[1], u)], bend: b.bend, shape: u < 0.5 ? a.shape : b.shape, rot: lerp(a.rot, b.rot, u), behind: false };
};
export const halPose = (f: number): Odo5Pose => {
  const waving = 1 - pulse(146, 156, 278, 288, f); // 1 while waving (start & end), 0 in the middle beats
  const freeze = pulse(230, 233, 238, 242, f), cringe = pulse(240, 248, 272, 284, f);
  const arm = armAt(R_KEYS, f);
  if (waving > 0.01) arm.rot += waving * 0.35 * Math.sin(TAU * 8 * loopT(f)); // 8 waves per loop -> periodic
  return pose5({
    costume: COSTUME.hal, view: "front",
    eyes: freeze > 0.5 ? "wide" : cringe > 0.4 ? "squint" : f >= 160 && f < 222 ? "lid" : "squint",
    lids: 0.4, pupil: lerp(1, 0.42, freeze), lookX: 0.12 * Math.sin(TAU * loopT(f)),
    browL: 0.8 + 0.4 * freeze - 0.5 * cringe + 0.2 * pulse(160, 170, 212, 222, f), browR: 0.55 + 0.6 * freeze - 0.5 * cringe - 0.4 * pulse(160, 170, 212, 222, f),
    worry: cringe, mouth: freeze > 0.5 ? "o" : cringe > 0.4 ? "yikes" : "smile", mouthW: 1 + 0.15 * cringe,
    blush: cringe, sweat: cringe, armL: { ...REST_L, elbow: [-40, 100] }, armR: arm,
    breathe: TAU * 3 * loopT(f), squash: 0.6 * Math.max(0, 1 - Math.abs(f - 232) / 3), rim: 0.5,
    blink: [70, 190].some((b) => f >= b && f < b + 4), hairLag: 0,
  });
};

// ---------------- crowd ----------------
const tint = (base: Costume, pal: Record<string, string>): Costume => ({ ...base, pal: { ...(base.pal ?? {}), ...pal } });
const COSTUMES: Costume[] = [
  COSTUME.workerA, COSTUME.workerB, COSTUME.clerk,
  tint(COSTUME.hal, { shirt: "#6f9fc9", shirtShade: "#4f7ea8", hat: "#f3e9cf", tie: "#c8452f" }),
  tint(COSTUME.workerA, { hat: "#e85d3a", hatShade: "#b8432a", shirt: "#3f8f5a", shirtShade: "#2f6d44" }),
  tint(COSTUME.clerk, { shirt: "#7a3b5a", shirtShade: "#5a2a42", hat: "#3a2a22" }),
  { ...COSTUME.odo, goggles: false, apron: false, pal: { shirt: "#d9a23a", shirtShade: "#b07f22" } },
  tint(COSTUME.hal, { shirt: "#e9e2d0", shirtShade: "#c8bfa9", hat: "#d8402f", band: "#22232b" }),
  tint(COSTUME.workerB, { shirt: "#2f5f8f", shirtShade: "#21456a", hat: "#f2c230" }),
  { ...COSTUME.odo, goggles: false, apron: true, pal: { shirt: "#8a5ab0", shirtShade: "#6a3f8a" } },
];
export const CROWD = COSTUMES.map((c, i) => {
  // hand-placed on dry land inside the visible strip (x -10.3..-7.8), two loose clusters either side of Hal, front rows
  // for the photographers; positions verified by scripts/check-crowd.ts (every shutter moment visible); nobody directly behind Hal (x = -9.0) so every face and camera reads
  const [x, z] = ([[-10.3, 12.8], [-8.15, 13.6], [-9.45, 12.9], [-8.5, 13.55], [-9.85, 12.75], [-7.85, 13.6], [-8.3, 12.75], [-10.0, 13.6], [-8.0, 12.7], [-9.65, 13.65]] as const)[i];
  return { pos: [x, groundY(x, z), z] as V3, costume: c, phase: i * 0.37, h: 1.42 + ((i * 37) % 13) * 0.012 };
});
// Independent crowd: every person has their own persona + clip schedule (src/char/crowdLife.ts). No shared timing:
// photographers notice, reach, raise, aim, shoot (some with flash, some without), wind on, lower — each at their own
// moment and speed; others clap in short bursts, chat, laugh, nod, wave once, fix a hat or lapel, or just watch.
const toHal = (i: number) => Math.max(-0.8, Math.min(0.8, (HAL[0] - CROWD[i].pos[0]) * 0.35 + 0.15));
const PER: Omit<Persona, "costume" | "seed">[] = [
  { idle: "hip", breathe: 3, sway: 1, swayAmp: 0.012, mood: "smile", eyes: "squint", brow: 0.75, temper: 1.1,
    clips: [{ kind: "clap", t0: 12, t1: 54, rate: 3.6, amp: 0.9 }, { kind: "clap", t0: 116, t1: 142, rate: 3.1, amp: 0.6 }, { kind: "look", t0: 176, t1: 218, x: -0.2, y: 0.55 }, { kind: "hat", t0: 238, t1: 262, side: 1 }] },
  { idle: "rest", breathe: 2, sway: 2, swayAmp: 0.01, mood: "smile", eyes: "lid", brow: 0.7, temper: 1.0, camera: { flash: "cube" },
    clips: [{ kind: "photo", notice: 9, reach: 9, raise: 11, shots: [{ f: 44, flash: true }, { f: 58, flash: false }], lowerAfter: 7, lower: 12, check: true, elbowsOut: 0.7 },
            { kind: "talk", t0: 160, t1: 200, toward: -0.7, rate: 4.2, gesture: -1 }, { kind: "laugh", t0: 200, t1: 216 }] },
  { idle: "clasp", breathe: 2, sway: 1, swayAmp: 0.006, mood: "flat", eyes: "lid", brow: 0.6, temper: 0.6,
    clips: [{ kind: "look", t0: 26, t1: 92, x: 0.45, y: 0.05 }, { kind: "nod", t0: 100, t1: 124, times: 2 }, { kind: "look", t0: 182, t1: 228, x: -0.1, y: 0.6 }, { kind: "lapel", t0: 250, t1: 272, side: 1 }] },
  { idle: "pockets", breathe: 3, sway: 2, swayAmp: 0.009, mood: "smile", eyes: "squint", brow: 0.8, temper: 0.9, camera: { flash: "gun" },
    clips: [{ kind: "photo", notice: 12, reach: 14, raise: 16, shots: [{ f: 124, flash: true }], lowerAfter: 12, lower: 15, elbowsOut: 0.3 },
            { kind: "wave", t0: 236, t1: 262, side: 1, rate: 2.0, height: 0.8 }] },
  { idle: "rest", breathe: 3, sway: 3, swayAmp: 0.014, mood: "smile", eyes: "squint", brow: 0.8, temper: 1.3,
    clips: [{ kind: "talk", t0: 18, t1: 70, toward: 0.75, rate: 4.6, gesture: 1 }, { kind: "laugh", t0: 70, t1: 86 }, { kind: "clap", t0: 102, t1: 130, rate: 4.2, amp: 1.0 },
            { kind: "point", t0: 178, t1: 206, side: -1, dir: [-170, -110] }, { kind: "talk", t0: 240, t1: 274, toward: 0.7, rate: 3.8, gesture: 0 }] },
  { idle: "clasp", breathe: 2, sway: 2, swayAmp: 0.008, mood: "smile", eyes: "lid", brow: 0.7, temper: 0.8, camera: { flash: "cube" },
    clips: [{ kind: "look", t0: 20, t1: 72, x: -0.7, y: 0 }, { kind: "nod", t0: 38, t1: 60, times: 3 }, { kind: "laugh", t0: 73, t1: 90 },
            { kind: "photo", notice: 7, reach: 8, raise: 10, shots: [{ f: 229, flash: true }, { f: 246, flash: false }], lowerAfter: 8, lower: 13, elbowsOut: 0.9 }] },
  { idle: "behind", breathe: 2, sway: 1, swayAmp: 0.01, mood: "smile", eyes: "squint", brow: 0.75, temper: 1.0,
    clips: [{ kind: "wave", t0: 58, t1: 96, side: -1, rate: 2.2, height: 0.9 }, { kind: "lapel", t0: 148, t1: 170, side: -1 }, { kind: "clap", t0: 208, t1: 236, rate: 3.0, amp: 0.7 }] },
  { idle: "rest", breathe: 3, sway: 2, swayAmp: 0.011, mood: "flat", eyes: "lid", brow: 0.65, temper: 0.9, camera: { flash: "gun" },
    clips: [{ kind: "photo", notice: 10, reach: 11, raise: 13, shots: [{ f: 172, flash: false }, { f: 188, flash: true }], lowerAfter: 8, lower: 14 },
            { kind: "photo", notice: 6, reach: 9, raise: 12, shots: [{ f: 258, flash: false }], lowerAfter: 5, lower: 12, elbowsOut: 0.4 }] },
  { idle: "pockets", breathe: 2, sway: 3, swayAmp: 0.007, mood: "awkward", eyes: "lid", brow: 0.6, temper: 0.7,
    clips: [{ kind: "look", t0: 44, t1: 84, x: 0.3, y: 0.2 }, { kind: "clap", t0: 146, t1: 166, rate: 2.6, amp: 0.5 }, { kind: "look", t0: 194, t1: 234, x: -0.3, y: 0.55 }, { kind: "nod", t0: 250, t1: 266, times: 1 }] },
  { idle: "rest", breathe: 3, sway: 1, swayAmp: 0.01, mood: "smile", eyes: "squint", brow: 0.7, temper: 1.0, camera: { flash: "cube" },
    clips: [{ kind: "lapel", t0: 28, t1: 52, side: 1 }, { kind: "look", t0: 98, t1: 142, x: 0.9, y: -0.05 },
            { kind: "photo", notice: 8, reach: 10, raise: 12, shots: [{ f: 206, flash: false }, { f: 216, flash: true }], lowerAfter: 9, lower: 13, check: true, elbowsOut: 0.6 }] },
];
export const PERSONAS: Persona[] = PER.map((p, i) => ({ ...p, seed: 101 + i * 37, costume: CROWD[i].costume }));
const LIFE = { loop: N, subjectX: () => 0 };
export const crowdPose = (i: number, f: number): Odo5Pose => personPose(PERSONAS[i], f, { ...LIFE, subjectX: () => toHal(i) }, toHal(i) * 0.25);
export const crowdFlash = (i: number, f: number) => personFlash(PERSONAS[i], f);

// ---------------- boats (spaced one loop-travel apart -> seamless) ----------------
export const boatsAt = (f: number) => [0, 1, 2].map((i) => {
  const u = (loopT(f) + i / 3) % 1;
  const z = -46 + u * 69, x = [-2.0, 2.3, -0.2][i];
  return { pos: [x, -0.62, z] as V3, scale: smooth(0, 0.08, u), u, hue: i };
});

// ---------------- confetti & balloons (periodic) ----------------
export const confettiAt = (f: number) => Array.from({ length: 140 }, (_, k) => {
  const ph = (k * 0.61803) % 1, t = (loopT(f) * 2 + ph) % 1, x = -12.5 + ((k * 7.3) % 7), z = 10.5 + ((k * 3.7) % 6);
  return [x + 0.4 * Math.sin(TAU * (t * 3 + ph)), 6.5 - 6.8 * t, z + 0.3 * Math.cos(TAU * (t * 2 + ph))] as V3;
});
export const balloonOffset = (k: number, f: number): V3 => [0.12 * Math.sin(TAU * 2 * loopT(f) + k), 0.08 * Math.sin(TAU * 3 * loopT(f) + k * 1.7), 0.1 * Math.cos(TAU * 2 * loopT(f) + k)];

// ---------------- sound events (derived from the animation above) ----------------
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
export const soundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  // crowd: every shutter/flash/clap/cloth sound comes from that person's own animation schedule
  for (const [i, P] of PERSONAS.entries()) for (const e of personEvents(P, i)) {
    const px = Math.max(-1, Math.min(1, (CROWD[i].pos[0] - camAt(e.frame).pos[0]) / 3));
    ev.push({ frame: e.frame, kind: e.kind, x: px, gain: 1, note: e.note });
  }
  for (const f of [152, 220, 246, 278]) ev.push({ frame: f, kind: "fabric_swish", x: -0.15, gain: 0.55, note: "Hal's suit sleeve (gesture change)" });
  ev.push({ frame: 236, kind: "gulp", x: -0.15, gain: 0.55, note: "Hal gulps after the flash" });
  ev.push({ frame: 233, kind: "freeze_sting", x: -0.1, gain: 0.4, note: "comic freeze tick" });
  // boat passes: when each boat crosses z=2 (emerging from under the arch toward camera)
  for (let f = 1; f < N; f++) for (const [i, b] of boatsAt(f).entries()) { const p = boatsAt(f - 1)[i]; if (p.pos[2] < 2 && b.pos[2] >= 2) ev.push({ frame: f, kind: "boat_pass", x: Math.max(-1, Math.min(1, b.pos[0] / 6)), gain: 0.55, note: `motorboat ${i} passes under the arch` }); }
  return ev.sort((a, b) => a.frame - b.frame);
};
void clamp01;
