// Act 1 (frames 0-309) of the continuous take: the desert hook. Pure functions of the frame number.
// Also exports SOUND EVENTS derived from the same animation data (foot contacts, gestures, impacts) so the audio
// is triggered by the actual animation rather than placed by hand.
import { V3, clamp01, lerp, smooth } from "../lib/math";
import { ARM, ArmPose, COSTUME, Odo5Pose, pose5, REST_L, REST_R } from "../char/odo5";
import { BR, groundY } from "./DesertWorld";

export const FPS = 30;
export const FILM_FRAMES = 1771; // 59.0106 s narration
export const HOOK_END = 309;

// ---------------- Hal locomotion ----------------
const H0: V3 = [-11.2, 0, 7.5], H1: V3 = [-7.6, 0, 7.5];
const W_A = 42, W_B = 124;
const walkT = (f: number) => {
  const t = clamp01((f - W_A) / (W_B - W_A));
  return t < 0.08 ? (t * t) / 0.16 : t > 0.86 ? 1 - ((1 - t) ** 2) / 0.28 : (t - 0.04) / 0.82 * (1 - 0.0); // ease in / settle out
};
// ---------------- the car drives in and parks (tyre tracks follow this path) ----------------
export const CAR_PARK: V3 = [-11.6, 0, 8.6];
export const CAR_PATH: [number, number][] = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return [lerp(-46, CAR_PARK[0], t), lerp(12.5, CAR_PARK[2], t) + Math.sin(t * Math.PI) * 0.8] as [number, number]; });
const carT = (f: number) => { const t = clamp01(f / 38); return 1 - Math.pow(1 - t, 2.4); };
export const carAt = (f: number) => {
  const t = carT(f), x = lerp(-46, CAR_PARK[0], t), z = lerp(12.5, CAR_PARK[2], t) + Math.sin(t * Math.PI) * 0.8;
  const t2 = carT(f + 1), x2 = lerp(-46, CAR_PARK[0], t2), z2 = lerp(12.5, CAR_PARK[2], t2) + Math.sin(t2 * Math.PI) * 0.8;
  const moving = Math.hypot(x2 - x, z2 - z);
  const ry = moving > 1e-4 ? -Math.atan2(z2 - z, x2 - x) : 0.18;
  const dist = (46 + CAR_PARK[0]) * t;
  return { pos: [x, groundY(x, z), z] as V3, ry: lerp(ry, 0.18, smooth(30, 40, f)), spin: dist / 0.41, speed: moving * 30, brake: pulse(26, 30, 38, 46, f) };
};
export const halVisible = (f: number) => f >= 40;
export const halAt = (f: number): V3 => { const t = Math.min(1, walkT(f)); const x = lerp(H0[0], H1[0], t), z = H0[2]; return [x, groundY(x, z), z]; };
const speed = (f: number) => Math.abs(halAt(f + 0.5)[0] - halAt(f - 0.5)[0]) * 30;

// ---------------- continuous camera (keys -> Catmull-Rom -> Gaussian low-pass) ----------------
type Key = { f: number; pos: V3; look: V3; fov: number };
const KEYS: Key[] = [
  { f: -40, pos: [1.2, 0.55, 40], look: [0, 4.2, 0], fov: 44 },
  { f: 0, pos: [1.0, 0.6, 36], look: [-1.0, 4.0, 0], fov: 44 },
  { f: 54, pos: [-6.0, 0.8, 16.5], look: [-8.6, 1.4, 7.5], fov: 42 },
  { f: 118, pos: [-6.9, 0.75, 12.6], look: [-7.5, 1.25, 7.5], fov: 40 },
  { f: 168, pos: [-6.7, 0.8, 12.3], look: [-7.45, 1.25, 7.5], fov: 40 },
  { f: 226, pos: [5, 13.5, 44], look: [-1, 6.5, 0], fov: 50 },
  { f: 262, pos: [-5.6, 2.7, 15.8], look: [-6.0, 0.2, 6.8], fov: 47 },
  { f: 300, pos: [-7.0, 1.05, 11.4], look: [-7.5, 1.0, 7.5], fov: 40 },
  { f: 330, pos: [-6.4, 2.6, 12.5], look: [-6.5, 5.5, 2.0], fov: 44 },
  { f: 370, pos: [-3.0, 12, 18], look: [0, 18, -40], fov: 50 },
];
const cr = (a: number, b: number, c: number, d: number, t: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
/** Monotone cubic Hermite (Fritsch-Carlson) per channel: smooth, no overshoot between keys. */
const monotone = (xs: number[], ys: number[]) => {
  const n = xs.length, d: number[] = [], m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  return (x: number) => {
    let i = 0; while (i < n - 2 && xs[i + 1] <= x) i++;
    const h = xs[i + 1] - xs[i], t = Math.max(0, Math.min(1, (x - xs[i]) / h));
    const h00 = 2 * t ** 3 - 3 * t ** 2 + 1, h10 = t ** 3 - 2 * t ** 2 + t, h01 = -2 * t ** 3 + 3 * t ** 2, h11 = t ** 3 - t ** 2;
    return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1];
  };
};
const CH = (() => { const xs = KEYS.map((k) => k.f); const mk = (sel: (k: Key) => number) => monotone(xs, KEYS.map(sel));
  return { px: mk((k) => k.pos[0]), py: mk((k) => k.pos[1]), pz: mk((k) => k.pos[2]), lx: mk((k) => k.look[0]), ly: mk((k) => k.look[1]), lz: mk((k) => k.look[2]), fov: mk((k) => k.fov) }; })();
const rawCam = (f: number) => ({ pos: [CH.px(f), CH.py(f), CH.pz(f)] as V3, look: [CH.lx(f), CH.ly(f), CH.lz(f)] as V3, fov: CH.fov(f) });
void cr;
const N = HOOK_END + 1;
const CAM = (() => {
  const pad = 40, raw = Array.from({ length: N + 2 * pad }, (_, i) => rawCam(i - pad));
  const sigma = 8, R = 24, w = Array.from({ length: 2 * R + 1 }, (_, k) => Math.exp(-((k - R) ** 2) / (2 * sigma * sigma))), ws = w.reduce((a, b) => a + b, 0);
  return Array.from({ length: N }, (_, f) => {
    const acc = { pos: [0, 0, 0], look: [0, 0, 0], fov: 0 };
    for (let k = -R; k <= R; k++) { const s = raw[f + pad + k], wk = w[k + R] / ws; for (let a = 0; a < 3; a++) { acc.pos[a] += s.pos[a] * wk; acc.look[a] += s.look[a] * wk; } acc.fov += s.fov * wk; }
    return { pos: acc.pos as V3, look: acc.look as V3, fov: acc.fov };
  });
})();
export const camHook = (f: number) => {
  const i = Math.max(0, Math.min(N - 2, Math.floor(f))), t = Math.max(0, Math.min(1, f - i));
  const a = CAM[i], b = CAM[i + 1];
  const L = (x: V3, y: V3): V3 => [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)];
  const pos = L(a.pos, b.pos), look = L(a.look, b.look), h = halAt(f);
  return { pos, look, fov: lerp(a.fov, b.fov, t), focus: Math.hypot(h[0] - pos[0], h[1] + 1.0 - pos[1], h[2] - pos[2]) };
};

// ---------------- gait from on-screen travel ----------------
const STRIDE = 0.8;
const GAIT = (() => {
  const g = [0];
  for (let f = 1; f <= N; f++) {
    const c = camHook(Math.min(N - 1, f)), o1 = halAt(f), o0 = halAt(f - 1);
    const yaw = Math.atan2(c.pos[0] - o1[0], c.pos[2] - o1[2]);
    const proj = (o1[0] - o0[0]) * Math.cos(yaw) + (o1[2] - o0[2]) * -Math.sin(yaw);
    g.push(g[f - 1] + Math.max(0, proj) / STRIDE);
  }
  return g;
})();

// ---------------- acting ----------------
const pulse = (a: number, b: number, c: number, d: number, f: number) => smooth(a, b, f) * (1 - smooth(c, d, f));
type ArmKey = { f: number; arm: ArmPose };
const A = (hand: [number, number], elbow: [number, number], shape: ArmPose["shape"], rot = 0, behind = false): ArmPose => ({ hand, elbow, shape, rot, bend: 1, behind });
const RL = { ...REST_L, elbow: [-40, 100] as [number, number] }, RR = { ...REST_R, elbow: [40, 100] as [number, number] };
const TADA_L = A([-170, -150], [-118, -38], "open", Math.PI + 0.3), TADA_R = A([170, -150], [118, -38], "open", Math.PI - 0.3);
const PAT = A([18, 40], [86, 92], "open", 2.4), PAT_UP = A([22, 28], [88, 84], "open", 2.4);
const HIP_L = A([-62, 132], [-122, 52], "fist", 0.4), HIP_R = A([62, 132], [122, 52], "fist", -0.4);
const L_KEYS: ArmKey[] = [{ f: 0, arm: RL }, { f: 122, arm: RL }, { f: 134, arm: TADA_L }, { f: 150, arm: TADA_L }, { f: 162, arm: RL }, { f: 180, arm: RL }, { f: 192, arm: HIP_L }, { f: 240, arm: HIP_L }, { f: 252, arm: RL }, { f: 999, arm: RL }];
const R_KEYS: ArmKey[] = [{ f: 0, arm: RR }, { f: 122, arm: RR }, { f: 134, arm: TADA_R }, { f: 150, arm: TADA_R }, { f: 160, arm: PAT }, { f: 165, arm: PAT_UP }, { f: 170, arm: PAT }, { f: 175, arm: PAT_UP }, { f: 180, arm: PAT }, { f: 192, arm: HIP_R }, { f: 240, arm: HIP_R }, { f: 252, arm: RR }, { f: 284, arm: RR }, { f: 296, arm: ARM.scratch }, { f: 999, arm: ARM.scratch }];
const armAt = (keys: ArmKey[], f: number): ArmPose => {
  let i = 0; while (i < keys.length - 2 && keys[i + 1].f <= f) i++;
  const a = keys[i].arm, b = keys[i + 1].arm, t = smooth(keys[i].f, keys[i + 1].f, f);
  const ea = a.elbow ?? [0, 100], eb = b.elbow ?? [0, 100], arc = Math.sin(Math.PI * t) * (Math.abs(a.hand[1] - b.hand[1]) > 80 ? 30 : 6) * Math.sign(b.hand[0] + a.hand[0] || 1);
  return { hand: [lerp(a.hand[0], b.hand[0], t) + arc, lerp(a.hand[1], b.hand[1], t)], elbow: [lerp(ea[0], eb[0], t) + arc * 0.5, lerp(ea[1], eb[1], t)], bend: b.bend, shape: t < 0.5 ? a.shape : b.shape, rot: lerp(a.rot, b.rot, t), behind: t > 0.6 ? !!b.behind : !!a.behind };
};
const BLINKS = [20, 98, 188, 232];
export const halPose = (f: number): Odo5Pose => {
  const front = f >= 125, sp = speed(f) / 1.1;
  const freeze = pulse(272, 275, 282, 288, f), cringe = smooth(282, 292, f);
  return pose5({
    costume: COSTUME.hal,
    view: front ? "front" : "side",
    gait: GAIT[Math.max(0, Math.min(N, Math.round(f)))], walk: front ? 0 : clamp01(sp * 1.2), stride: STRIDE,
    lean: front ? 0.03 * pulse(124, 132, 146, 156, f) : 0.04 * clamp01(sp) - 0.07 * pulse(108, 116, 118, 124, f),
    blink: BLINKS.some((b) => f >= b && f < b + 4),
    lookX: front ? lerp(lerp(0.2, 0.0, smooth(150, 160, f)), 0.6, smooth(228, 240, f)) : 0.5,
    lookY: front ? -0.9 * smooth(228, 240, f) : 0,
    eyes: f < 124 ? "lid" : f < 152 ? "squint" : f < 272 ? "lid" : f < 284 ? "wide" : "squint",
    lids: f < 228 ? 0.35 : 0.2, pupil: lerp(1, 0.42, freeze),
    browL: lerp(lerp(0.75, 1.1, pulse(124, 132, 146, 156, f)), 1.2, freeze) - 0.6 * cringe + 0.3 * smooth(228, 240, f) * (1 - freeze),
    browR: lerp(lerp(0.35, 1.1, pulse(124, 132, 146, 156, f)), 1.2, freeze) - 0.6 * cringe,
    worry: cringe,
    mouth: f < 124 ? "smile" : f < 228 ? "smile" : f < 272 ? "flat" : f < 284 ? "o" : "yikes",
    mouthW: 1 + 0.15 * cringe,
    blush: cringe, sweat: smooth(286, 300, f),
    armL: front ? armAt(L_KEYS, f) : REST_L, armR: front ? armAt(R_KEYS, f) : REST_R,
    scratch: f * 1.6 * smooth(296, 302, f),
    holdLantern: false, rim: 0.55,
    breathe: (f / 30) * Math.PI * 2 * 0.35,
    squash: Math.max(0, 1 - Math.abs(f - 125) / 4) + 0.7 * Math.max(0, 1 - Math.abs(f - 274) / 3) + 0.25 * pulse(122, 126, 128, 134, f),
    hairLag: front ? 0.6 * pulse(272, 275, 280, 290, f) : 0,
  });
};

// ---------------- props in motion ----------------
export const tumbleweeds = (f: number) => {
  const t1 = clamp01(f / 100), x1 = lerp(-15, 13, t1), z1 = lerp(22.5, 19.5, t1);
  const t2 = clamp01((f - 228) / 140), z2 = lerp(15, -12, t2), x2 = lerp(1.6, -0.8, t2);
  const hop = (x: number) => Math.abs(Math.sin(x * 1.3)) * 0.18;
  return [
    { p: [x1, groundY(x1, z1) + 0.45 + hop(x1), z1] as [number, number, number], spin: (x1 + 15) / 0.45 },
    { p: [x2, -BR.chanDepth + 0.36 + hop(z2) * 0.6, z2] as [number, number, number], spin: (15 - z2) / 0.36 },
  ];
};
const PEB_A = 250, PEB_B = 272, PEB_X = -4.4, PEB_Z = 6.3;
export const pebbleAt = (f: number): [number, number, number] | null => {
  if (f < PEB_A) return null;
  const t = Math.min(1, (f - PEB_A) / (PEB_B - PEB_A));
  return [PEB_X, lerp(BR.deck + 1.0, -BR.chanDepth + 0.05, t * t), PEB_Z];
};

// ---------------- sound events (derived from the animation) ----------------
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
export const hookSoundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  // foot contacts: a gait cycle has two heel strikes at phase 0 (near foot) and 0.5 (far foot)
  for (let f = 1; f <= N; f++) {
    const g0 = GAIT[f - 1], g1 = GAIT[f];
    for (const off of [0, 0.5]) if (Math.floor(g0 - off) !== Math.floor(g1 - off) && g1 - g0 > 0.001) {
      const h = halAt(f), c = camHook(f);
      ev.push({ frame: f, kind: "step_sand", x: Math.max(-1, Math.min(1, (h[0] - c.pos[0]) / 6)), gain: 0.9, note: off ? "far foot heel strike" : "near foot heel strike" });
    }
  }
  ev.push({ frame: 125, kind: "turn_scuff", x: -0.3, gain: 0.7, note: "Hal turns to camera (foot reposition)" });
  ev.push({ frame: 0, kind: "car_arrive", x: -0.9, gain: 0.8, note: "1960s V8 approaches on gravel, decelerates, brakes (f0-40)" });
  ev.push({ frame: 29, kind: "brake_squeak", x: -0.6, gain: 0.35, note: "brakes squeak as the car stops" });
  ev.push({ frame: 40, kind: "engine_off", x: -0.6, gain: 0.5, note: "ignition off: engine shudder + tick" });
  ev.push({ frame: 41, kind: "door_open", x: -0.6, gain: 0.55, note: "car door latch + hinge (far side)" });
  ev.push({ frame: 49, kind: "door_close", x: -0.6, gain: 0.7, note: "car door shuts" });
  ev.push({ frame: 126, kind: "fabric_swish_big", x: -0.2, gain: 0.85, note: "ta-da arms sweep up" });
  ev.push({ frame: 154, kind: "fabric_swish", x: -0.2, gain: 0.55, note: "arms come down" });
  for (const f of [160, 170, 180]) ev.push({ frame: f, kind: "wallet_pat", x: -0.15, gain: 0.8, note: "hand pats chest pocket" });
  for (const f of [161, 171, 181]) ev.push({ frame: f, kind: "coin_jingle", x: -0.15, gain: 0.45, note: "coins in wallet" });
  ev.push({ frame: 190, kind: "fabric_swish", x: -0.2, gain: 0.5, note: "hands to hips" });
  ev.push({ frame: 186, kind: "whoosh_reveal", x: 0, gain: 0.55, note: "camera rises / pulls back to reveal the bridge" });
  ev.push({ frame: 250, kind: "pebble_whistle", x: 0.2, gain: 0.35, note: "pebble tips off parapet" });
  ev.push({ frame: 272, kind: "pebble_clack", x: 0.25, gain: 0.85, note: "pebble hits dry riverbed" });
  ev.push({ frame: 274, kind: "freeze_sting", x: 0, gain: 0.45, note: "Hal freezes (comic tick)" });
  ev.push({ frame: 286, kind: "gulp", x: -0.2, gain: 0.6, note: "nervous gulp as cringe starts" });
  ev.push({ frame: 70, kind: "hawk", x: 0.6, gain: 0.35, note: "distant hawk" });
  ev.push({ frame: 205, kind: "hawk", x: -0.5, gain: 0.3, note: "distant hawk over the reveal" });
  ev.push({ frame: 0, kind: "tumble_roll_1", x: -0.9, gain: 0.6, note: "tumbleweed crosses foreground L->R (f0-100)" });
  ev.push({ frame: 228, kind: "tumble_roll_2", x: 0.1, gain: 0.45, note: "tumbleweed rolls away under the arch" });
  ev.push({ frame: 236, kind: "vulture_flap", x: 0.7, gain: 0.3, note: "vulture shifts on the dead tree" });
  return ev.sort((a, b) => a.frame - b.frame);
};
