// Production "reopening" — 291 frames (9.6914 s narration), ONE take, designed as a seamless loop.
// Pure functions of the frame. Everything periodic uses integer cycles per loop so frame 291 == frame 0.
import { V3, clamp01, lerp, smooth } from "../../lib/math";
import { ARM, ArmPose, COSTUME, Costume, Odo5Pose, pose5, REST_L, REST_R } from "../../char/odo5";
import { groundY } from "../../desert/DesertWorld";

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
  const x = -12.0 + i * 0.42 + (i % 2) * 0.12, z = 13.4 - (i % 3) * 0.7 - (i % 2) * 0.35;
  return { pos: [x, groundY(x, z), z] as V3, costume: c, phase: i * 0.37, h: 1.42 + ((i * 37) % 13) * 0.012 };
});
const CAM_L: ArmPose = { hand: [72, -118], elbow: [-30, -10], shape: "grip", rot: 0, bend: 1 }, CAM_R: ArmPose = { hand: [-72, -118], elbow: [30, -10], shape: "grip", rot: 0, bend: 1 };
export const cameraRaise = (f: number) => pulse(222, 230, 266, 276, f);
export const crowdPose = (i: number, f: number): Odo5Pose => {
  const c = CROWD[i], t = loopT(f);
  const cheer = 0.5 + 0.5 * Math.sin(TAU * 3 * t + c.phase * 5); // 3 cheer waves per loop
  const camK = cameraRaise(f);
  const up = (s: number): ArmPose => ({ hand: [s * (60 + 110 * cheer), 150 - 300 * cheer], elbow: [s * (50 + 60 * cheer), 90 - 120 * cheer], shape: cheer > 0.4 ? "open" : "relaxed", rot: 0, bend: 1 });
  const mix = (a: ArmPose, b: ArmPose): ArmPose => ({ ...b, hand: [lerp(a.hand[0], b.hand[0], camK), lerp(a.hand[1], b.hand[1], camK)], elbow: [lerp(a.elbow![0], b.elbow![0], camK), lerp(a.elbow![1], b.elbow![1], camK)], shape: camK > 0.5 ? b.shape : a.shape });
  return pose5({
    costume: c.costume, view: "front", eyes: camK > 0.5 ? "lid" : "squint", lids: 0.3,
    mouth: camK > 0.5 ? "flat" : cheer > 0.55 ? "o" : "smile", browL: 0.7 + 0.3 * cheer, browR: 0.7 + 0.3 * cheer,
    armL: mix(up(-1), CAM_L), armR: mix(up(1), CAM_R), breathe: TAU * 2 * t + i, squash: 0.03 * cheer, rim: 0.4,
    lookX: camK > 0.5 ? 0.3 * Math.sign(HAL[0] - c.pos[0]) : 0, hairLag: 0.2 * Math.sin(TAU * 3 * t + i),
  });
};
// flash volley ("the world's attention") + a few early flashes; each flash belongs to one crowd member
export const FLASHES: { f: number; who: number }[] = [
  { f: 34, who: 3 }, { f: 118, who: 7 }, { f: 186, who: 1 },
  ...[231, 234, 237, 240, 244, 247, 251, 255, 259, 263].map((f, k) => ({ f, who: (k * 3 + 2) % CROWD.length })),
];
export const flashAt = (who: number, f: number) => Math.max(0, ...FLASHES.filter((x) => x.who === who).map((x) => (f >= x.f && f < x.f + 5 ? 1 - (f - x.f) / 5 : 0)));
export const flashLight = (f: number) => Math.max(0, ...FLASHES.map((x) => (f >= x.f && f < x.f + 4 ? 1 - (f - x.f) / 4 : 0)));

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
  for (const fl of FLASHES) {
    const px = Math.max(-1, Math.min(1, (CROWD[fl.who].pos[0] - camAt(fl.f).pos[0]) / 6));
    ev.push({ frame: fl.f - 1, kind: "shutter", x: px, gain: 0.8, note: `crowd member ${fl.who} camera shutter` });
    ev.push({ frame: fl.f, kind: "flash_pop", x: px, gain: 0.6, note: `flash bulb fires (member ${fl.who})` });
  }
  for (const [f, n] of [[6, "cheer as the scene opens"], [100, "cheer after 'reopened'"], [146, "cheer swell over the desert reveal"]] as const) ev.push({ frame: f, kind: "cheer", x: -0.4, gain: 0.7, note: n });
  ev.push({ frame: 229, kind: "crowd_ooh", x: -0.3, gain: 0.6, note: "crowd 'ooh' as cameras come up" });
  for (const f of [152, 220, 246, 278]) ev.push({ frame: f, kind: "fabric_swish", x: -0.15, gain: 0.55, note: "Hal's suit sleeve (gesture change)" });
  ev.push({ frame: 236, kind: "gulp", x: -0.15, gain: 0.55, note: "Hal gulps under the flash volley" });
  ev.push({ frame: 233, kind: "freeze_sting", x: -0.1, gain: 0.4, note: "comic freeze tick" });
  // boat passes: when each boat crosses z=2 (emerging from under the arch toward camera)
  for (let f = 1; f < N; f++) for (const [i, b] of boatsAt(f).entries()) { const p = boatsAt(f - 1)[i]; if (p.pos[2] < 2 && b.pos[2] >= 2) ev.push({ frame: f, kind: "boat_pass", x: Math.max(-1, Math.min(1, b.pos[0] / 6)), gain: 0.55, note: `motorboat ${i} passes under the arch` }); }
  return ev.sort((a, b) => a.frame - b.frame);
};
void clamp01;
