// "The Awkward Encounter" — ONE continuous 10 s take (300 f @ 30 fps), no cuts, no text.
//   0-150   low tracking shot at the shoes and swinging lantern; camera cranes up to his face as he strolls
//           down the workshop (lantern pendulum, whistle "o", lidded side-glance)
//   150-172 he slows and stops under the lamps (momentum lean-back, lantern keeps swinging); camera keeps
//           drifting and arcs round toward his front
//   172-200 turns to camera, notices us: FREEZE (wide pinprick eyes, brows up, tiny "o", hairs spring up)
//   200-250 full cringe: squint ^^ + clenched yikes grin, blush, worried brows, sweat drop, scratches the back
//           of his head, side-eye away
//   250-300 slow awkward thumbs-up, wince (one eye open), grin widens, little nod; camera eases into a close-up
import { V3, clamp01, lerp, smooth } from "../lib/math";
import { ArmPose, ARM, Odo5Pose, pose5, REST_L, REST_R, PX5, W5, Eyes5, Mouth5, Hand5, lanternHandPx5 } from "../char/odo5";

export const DUR_TAKE = 300;
export const X_LANE = -0.42;
const Z0 = 0.6, VMAX = 0.72, STOP_A = 136, STOP_B = 162;
// ---- locomotion ----
const speedAt = (f: number) => VMAX * (f < STOP_A ? 1 : 1 - smooth(STOP_A, STOP_B, f));
const DIST = (() => { const d = [0]; for (let i = 1; i <= DUR_TAKE + 2; i++) d.push(d[i - 1] + (speedAt(i - 0.5) / 30)); return d; })();
const distAt = (f: number) => { const i = Math.max(0, Math.min(DUR_TAKE + 1, Math.floor(f))); const t = f - i; return DIST[i] + (DIST[i + 1] - DIST[i]) * t; };
export const odoAt = (f: number): V3 => [X_LANE, 0, Z0 - distAt(f)];
export const Z_STOP = Z0 - DIST[DUR_TAKE];

// ---- continuous camera: keyframes -> Catmull-Rom -> Gaussian low-pass (no cuts, no velocity jumps) ----
type Key = { f: number; pos: V3; look: V3; fov: number };
const KEYS: Key[] = (() => {
  const z = (f: number) => odoAt(f)[2], zs = Z_STOP;
  return [
    { f: -30, pos: [1.0, 0.42, z(-30) + 0.3], look: [X_LANE, 0.3, z(-30) - 0.1], fov: 42 },
    { f: 0, pos: [1.0, 0.42, z(0) + 0.35], look: [X_LANE, 0.32, z(0) - 0.1], fov: 42 },
    { f: 45, pos: [1.02, 0.72, z(45) + 0.45], look: [X_LANE, 0.62, z(45) - 0.15], fov: 42 },
    { f: 100, pos: [1.05, 1.08, z(100) + 0.8], look: [X_LANE, 0.9, z(100) - 0.25], fov: 41 },
    { f: 150, pos: [0.98, 1.12, z(150) + 1.25], look: [X_LANE, 0.92, z(150) - 0.15], fov: 40 },
    { f: 188, pos: [0.6, 1.05, zs + 1.95], look: [X_LANE, 0.93, zs], fov: 39 },
    { f: 242, pos: [0.38, 1.02, zs + 1.58], look: [X_LANE + 0.02, 0.95, zs], fov: 38 },
    { f: 300, pos: [0.24, 1.0, zs + 1.24], look: [X_LANE + 0.06, 0.97, zs], fov: 37 },
    { f: 330, pos: [0.2, 0.99, zs + 1.15], look: [X_LANE + 0.07, 0.97, zs], fov: 37 },
  ];
})();
const cr = (a: number, b: number, c: number, d: number, t: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
const rawCam = (f: number) => {
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1].f <= f) i++;
  const k0 = KEYS[Math.max(0, i - 1)], k1 = KEYS[i], k2 = KEYS[i + 1], k3 = KEYS[Math.min(KEYS.length - 1, i + 2)];
  const t = clamp01((f - k1.f) / (k2.f - k1.f));
  const v = (sel: (k: Key) => number) => cr(sel(k0), sel(k1), sel(k2), sel(k3), t);
  return { pos: [v((k) => k.pos[0]), v((k) => k.pos[1]), v((k) => k.pos[2])] as V3, look: [v((k) => k.look[0]), v((k) => k.look[1]), v((k) => k.look[2])] as V3, fov: v((k) => k.fov) };
};
const CAM = (() => {
  const raw = Array.from({ length: DUR_TAKE + 61 }, (_, i) => rawCam(i - 30));
  const sigma = 9, R = 27, w = Array.from({ length: 2 * R + 1 }, (_, k) => Math.exp(-((k - R) ** 2) / (2 * sigma * sigma)));
  const ws = w.reduce((a, b) => a + b, 0);
  const out: { pos: V3; look: V3; fov: number }[] = [];
  for (let f = 0; f <= DUR_TAKE; f++) {
    const acc = { pos: [0, 0, 0], look: [0, 0, 0], fov: 0 };
    for (let k = -R; k <= R; k++) {
      const s = raw[Math.max(0, Math.min(raw.length - 1, f + 30 + k))], wk = w[k + R] / ws;
      for (let a = 0; a < 3; a++) { acc.pos[a] += s.pos[a] * wk; acc.look[a] += s.look[a] * wk; }
      acc.fov += s.fov * wk;
    }
    out.push({ pos: acc.pos as V3, look: acc.look as V3, fov: acc.fov });
  }
  return out;
})();
export const camTake = (f: number) => {
  const i = Math.max(0, Math.min(DUR_TAKE - 1, Math.floor(f))), t = f - i;
  const a = CAM[i], b = CAM[Math.min(DUR_TAKE, i + 1)];
  const L = (x: V3, y: V3): V3 => [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)];
  const pos = L(a.pos, b.pos), look = L(a.look, b.look);
  const o = odoAt(f);
  return { pos, look, fov: lerp(a.fov, b.fov, t), focus: Math.hypot(o[0] - pos[0], 0.97 - pos[1], o[2] - pos[2]) };
};

// ---- gait driven by on-screen travel (feet stay planted even as the camera moves) ----
const STRIDE = 0.7;
const GAIT = (() => {
  const g = [0];
  for (let f = 1; f <= DUR_TAKE + 1; f++) {
    const c = camTake(Math.min(DUR_TAKE, f)), o1 = odoAt(f), o0 = odoAt(f - 1);
    const yaw = Math.atan2(c.pos[0] - o1[0], c.pos[2] - o1[2]);
    const right: V3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const proj = (o1[0] - o0[0]) * right[0] + (o1[2] - o0[2]) * right[2];
    g.push(g[f - 1] + Math.max(0, proj) / STRIDE);
  }
  return g;
})();

// ---- acting ----
const pulse = (a: number, b: number, c: number, d: number, f: number) => smooth(a, b, f) * (1 - smooth(c, d, f));
const BLINKS = [32, 96, 141, 178, 292];
type ArmKey = { f: number; arm: ArmPose };
const R_KEYS: ArmKey[] = [
  { f: 0, arm: { ...REST_R, elbow: [40, 100] } },
  { f: 204, arm: { ...REST_R, elbow: [40, 100] } },
  { f: 218, arm: ARM.scratch },
  { f: 250, arm: ARM.scratch },
  { f: 266, arm: ARM.thumb },
  { f: 400, arm: ARM.thumb },
];
const LANTERN_ARM: ArmPose = { ...ARM.lantern, elbow: [-44, 98] };
const armAt = (keys: ArmKey[], f: number): ArmPose => {
  let i = 0; while (i < keys.length - 2 && keys[i + 1].f <= f) i++;
  const a = keys[i].arm, b = keys[i + 1].arm, t = smooth(keys[i].f, keys[i + 1].f, f);
  const ea = a.elbow ?? [0, 100], eb = b.elbow ?? [0, 100];
  // hand travels on an outward arc (not a straight line) for a more animated gesture
  const arc = Math.sin(Math.PI * t) * 34;
  const hand: [number, number] = [lerp(a.hand[0], b.hand[0], t) + arc, lerp(a.hand[1], b.hand[1], t) - arc * 0.4];
  const shape: Hand5 = t < 0.55 ? a.shape : b.shape;
  return { hand, elbow: [lerp(ea[0], eb[0], t) + arc * 0.5, lerp(ea[1], eb[1], t)], bend: b.bend, shape, rot: lerp(a.rot, b.rot, t), behind: t > 0.6 ? !!b.behind : !!a.behind };
};

export const poseTake = (f: number): Odo5Pose => {
  const sp = speedAt(f) / VMAX;
  const front = f >= 172;
  const freeze = pulse(186, 190, 198, 204, f);
  const cringe = smooth(198, 206, f);
  const eyes: Eyes5 = f < 186 ? "lid" : f < 200 ? "wide" : f < 254 ? "squint" : "wince";
  const mouth: Mouth5 = f < 60 ? "awkward" : f < 104 ? "o" : f < 186 ? "awkward" : f < 200 ? "o" : "yikes";
  const scratching = smooth(214, 220, f) * (1 - smooth(248, 254, f));
  return pose5({
    view: front ? "front" : "side",
    gait: GAIT[Math.max(0, Math.min(DUR_TAKE, Math.round(f)))],
    walk: front ? 0 : clamp01(sp * 1.15),
    stride: STRIDE,
    lean: 0.03 * sp - 0.09 * pulse(150, 160, 164, 176, f) + 0.03 * smooth(254, 270, f),
    blink: BLINKS.some((b) => f >= b && f < b + 4),
    lookX: front ? lerp(lerp(0.6, 0.0, smooth(176, 186, f)), -0.55, pulse(226, 232, 244, 250, f)) : 0.6,
    lookY: 0,
    eyes, lids: 0.45, pupil: f < 200 ? lerp(1, 0.42, smooth(186, 190, f)) : 1,
    browL: lerp(lerp(0.7, 1.15, freeze), 0.5, cringe * (1 - freeze)) + 0.4 * smooth(254, 262, f),
    browR: lerp(lerp(-0.15, 1.15, freeze), 0.5, cringe * (1 - freeze)) - 0.2 * smooth(254, 262, f),
    worry: lerp(0, 1, cringe) - 0.2 * smooth(254, 262, f),
    mouth: mouth, mouthW: 0.85 + 0.3 * smooth(204, 214, f) + 0.12 * smooth(258, 270, f),
    blush: smooth(204, 220, f), sweat: smooth(206, 222, f),
    armL: front ? LANTERN_ARM : REST_L, armR: front ? armAt(R_KEYS, f) : REST_R,
    scratch: f * 1.6 * scratching,
    holdLantern: true,
    rim: 0.75,
    breathe: (f / 30) * Math.PI * 2 * 0.4,
    squash: Math.max(0, 1 - Math.abs(f - 172) / 4) + 0.6 * Math.max(0, 1 - Math.abs(f - 188) / 3) + 0.4 * pulse(272, 276, 278, 284, f),
    hairLag: front ? 0.8 * pulse(186, 189, 194, 206, f) - 0.25 * Math.sin(f * 0.5) * pulse(270, 274, 280, 290, f) : -0.35 * sp + 0.12 * Math.sin(GAIT[Math.round(Math.min(DUR_TAKE, f))] * Math.PI * 4),
  });
};

// ---- lantern pendulum (damped, driven by the hand's acceleration along the card plane) ----
const toWorld = (pos: V3, cam: V3, px: [number, number]): V3 => {
  const yaw = Math.atan2(cam[0] - pos[0], cam[2] - pos[2]);
  const lx = (px[0] - W5 / 2) * PX5, ly = (975 - px[1]) * PX5;
  return [pos[0] + Math.cos(yaw) * lx + Math.sin(yaw) * 0.03, ly, pos[2] - Math.sin(yaw) * lx + Math.cos(yaw) * 0.03];
};
export const handWorld = (f: number): V3 => toWorld(odoAt(f), camTake(f).pos, lanternHandPx5(poseTake(f)));
const PEND = (() => {
  const Lp = 0.16, gth = 9.81, dt = 1 / 30, sub = 6;
  let th = 0.25, om = 0; const out: number[] = [];
  let pPrev = handWorld(0), vPrev = 0;
  for (let f = 0; f <= DUR_TAKE; f++) {
    const p = handWorld(f);
    const c = camTake(f), yaw = Math.atan2(c.pos[0] - p[0], c.pos[2] - p[2]);
    const right: V3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const v = ((p[0] - pPrev[0]) * right[0] + (p[2] - pPrev[2]) * right[2]) / dt;
    const a = f === 0 ? 0 : (v - vPrev) / dt;
    for (let s = 0; s < sub; s++) { const h = dt / sub; const acc = -(gth / Lp) * Math.sin(th) - (a / Lp) * Math.cos(th) - 2.2 * om; om += acc * h; th += om * h; }
    out.push(th); pPrev = p; vPrev = v;
  }
  return out;
})();
export const lanternAngle = (f: number) => PEND[Math.max(0, Math.min(DUR_TAKE, Math.round(f)))];
