// TwistFrame crowd life — independent, deterministic background-character behaviour for the odo5 rig.
// Every person has a persona (seeded idle stance, breathing/sway rates, temperament, reaction delay) and an
// individual schedule of clips (photograph, clap, wave, talk, laugh, adjust hat/lapel, look, point). Clips are authored
// per person with different timings, amplitudes and holds — never one animation offset by a few frames.
// All motion is a pure function of the frame (batch-safe) and periodic idle motion uses integer cycles per loop, so a
// loop that keeps clips inside the loop window is seamless. Sound events (shutter, flash, claps, cloth) are DERIVED from
// the same clip data, so every sound has a visible cause.
import { pose5, shoulderPx5, REST_L, REST_R, type ArmPose, type Odo5Pose, type Costume, type Eyes5, type Mouth5 } from "./odo5";

type P2 = [number, number];
const TAU = Math.PI * 2;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const sm = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp2 = (a: P2, b: P2, t: number): P2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
/** stable hash -> [0,1) (no state; same answer in every render batch) */
export const hash01 = (...n: number[]) => { let h = 2166136261; for (const v of n) { h ^= Math.floor(v * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((h >>> 0) % 100000) / 100000; };

export type Shot = { f: number; flash: boolean };
export type Clip =
  | { kind: "photo"; notice: number; reach: number; raise: number; shots: Shot[]; lowerAfter: number; lower: number; check?: boolean; elbowsOut?: number }
  | { kind: "clap"; t0: number; t1: number; rate: number; amp: number }
  | { kind: "wave"; t0: number; t1: number; side: 1 | -1; rate: number; height: number }
  | { kind: "talk"; t0: number; t1: number; toward: number; rate: number; gesture: 1 | -1 | 0 }
  | { kind: "laugh"; t0: number; t1: number }
  | { kind: "nod"; t0: number; t1: number; times: number }
  | { kind: "hat"; t0: number; t1: number; side: 1 | -1 }
  | { kind: "lapel"; t0: number; t1: number; side: 1 | -1 }
  | { kind: "look"; t0: number; t1: number; x: number; y: number }
  | { kind: "point"; t0: number; t1: number; side: 1 | -1; dir: P2 };

export type Persona = {
  seed: number; costume: Costume;
  idle: "rest" | "clasp" | "behind" | "hip" | "pockets";
  breathe: number; sway: number; swayAmp: number; // integer cycles per loop + amplitude (rad)
  mood: Mouth5; eyes: Eyes5; brow: number; temper: number; // temper scales gesture amplitude (0.6 calm .. 1.3 lively)
  camera?: { flash: "cube" | "gun" | "none" };
  clips: Clip[];
};
export type LifeCtx = { loop: number; subjectX: (f: number) => number }; // subjectX = lookX toward the main subject

const pn = (seed: number, t: number, cyc: number[], amp = 1) => cyc.reduce((s, k, j) => s + Math.sin(TAU * k * t + hash01(seed, j) * TAU) / (j + 1), 0) * amp / 1.6;
const env = (f: number, a: number, b: number, inn: number, out: number) => sm(a, a + inn, f) * (1 - sm(b - out, b, f));

/** idle arm poses (per stance) */
const idleArms = (st: Persona["idle"], s: number): ArmPose => {
  const m = s; // -1 left, +1 right
  switch (st) {
    case "clasp": return { hand: [-m * 50, 170], elbow: [m * 22, 98], shape: "fist", rot: 0, bend: m };
    case "behind": return { hand: [-m * 30, 150], elbow: [m * 26, 92], shape: "relaxed", rot: 0, bend: m, behind: true };
    case "hip": return s > 0 ? { hand: [30, 128], elbow: [74, 56], shape: "fist", rot: -0.6, bend: 1 } : REST_L;
    case "pockets": return { hand: [m * 6, 176], elbow: [m * 30, 96], shape: "fist", rot: 0, bend: m };
    default: return s > 0 ? REST_R : REST_L;
  }
};
const mixArm = (a: ArmPose, b: ArmPose, t: number): ArmPose => t <= 0 ? a : t >= 1 ? b : ({
  ...(t < 0.5 ? a : b), hand: lerp2(a.hand, b.hand, t), elbow: lerp2(a.elbow ?? [a.hand[0] * 0.4, 96], b.elbow ?? [b.hand[0] * 0.4, 96], t), rot: lerp(a.rot, b.rot, t), behind: t < 0.5 ? a.behind : b.behind,
});

/** camera hand targets relative to each shoulder, for a camera centre at card px `c` */
const camHands = (base: Odo5Pose, c: P2, elbowsOut: number): [ArmPose, ArmPose] => {
  const sL = shoulderPx5(base, -1), sR = shoulderPx5(base, 1);
  const hl: P2 = [c[0] - 36 - sL[0], c[1] + 8 - sL[1]], hr: P2 = [c[0] + 36 - sR[0], c[1] + 8 - sR[1]];
  const eo = elbowsOut;
  return [{ hand: hl, elbow: [-16 - 30 * eo, 70 - 70 * eo + Math.max(0, hl[1]) * 0.3], shape: "grip", rot: -0.3, bend: -1 },
          { hand: hr, elbow: [16 + 30 * eo, 70 - 70 * eo + Math.max(0, hr[1]) * 0.3], shape: "grip", rot: 0.3, bend: 1 }];
};

export const photoSpan = (c: Extract<Clip, { kind: "photo" }>) => {
  const last = c.shots[c.shots.length - 1].f, first = c.shots[0].f;
  const tRaise1 = first - 4; // camera settled at the eye a few frames before the first press
  const tRaise0 = tRaise1 - c.raise, tReach0 = tRaise0 - c.reach, tNotice = tReach0 - c.notice;
  const tLower0 = last + c.lowerAfter, tLower1 = tLower0 + c.lower;
  return { tNotice, tReach0, tRaise0, tRaise1, tLower0, tLower1, end: tLower1 + 10 };
};

export const personPose = (P: Persona, f: number, ctx: LifeCtx, faceRight = 0): Odo5Pose => {
  const t = f / ctx.loop, T = P.temper;
  // ---- idle (periodic, individual rates) ----
  const breathe = TAU * P.breathe * t + hash01(P.seed, 7) * TAU;
  let bodyRoll = P.swayAmp * pn(P.seed, t, [P.sway, P.sway + 1]);
  let headRoll = 0.05 * pn(P.seed + 3, t, [P.sway + 1, P.sway + 3]);
  let lookX = 0.35 * pn(P.seed + 5, t, [1, 2, 3]) + faceRight, lookY = 0.15 * pn(P.seed + 9, t, [2, 3]);
  let squash = 0, mouth: Mouth5 = P.mood, eyes: Eyes5 = P.eyes, brow = P.brow, mouthW = 1, worry = 0;
  const base = pose5({ costume: P.costume, breathe });
  let armL = idleArms(P.idle, -1), armR = idleArms(P.idle, 1);
  let camera: Odo5Pose["camera"] = P.camera ? { blend: 0, flash: P.camera.flash } : undefined;
  // ---- clips ----
  for (const c of P.clips) {
    if (c.kind === "photo") {
      const s = photoSpan(c); if (f < s.tNotice || f > s.end) continue;
      const eo = c.elbowsOut ?? 0.5;
      const notice = env(f, s.tNotice, s.tLower1, 6, 12);
      lookX = lerp(lookX, ctx.subjectX(f), notice); brow = lerp(brow, brow + 0.35, env(f, s.tNotice, s.tReach0 + 4, 4, 6));
      // R hand reaches first, L follows ~4 frames later; both carry the camera up; settle with a small overshoot
      const reachR = sm(s.tReach0, s.tRaise0, f), reachL = sm(s.tReach0 + 4, s.tRaise0 + 2, f);
      const up = sm(s.tRaise0, s.tRaise1, f) * (1 - sm(s.tLower0, s.tLower1, f));
      const settle = Math.sin(clamp01((f - s.tRaise1) / 8) * Math.PI) * 4 * (f > s.tRaise1 && f < s.tRaise1 + 8 ? 1 : 0);
      const aimDrift: P2 = [3 * Math.sin(TAU * (f - s.tRaise1) / (40 + 20 * hash01(P.seed, 2))), 2 * Math.sin(TAU * (f - s.tRaise1) / (31 + 9 * hash01(P.seed, 3)))];
      // shutter press: camera dips 3px for 2 frames; film-advance thumb flick 6-9 frames later
      let press = 0, advance = 0;
      for (const sh of c.shots) { if (f >= sh.f && f < sh.f + 3) press = 1 - (f - sh.f) / 3; const a0 = sh.f + 6 + Math.round(3 * hash01(P.seed, sh.f)); if (f >= a0 && f < a0 + 5) advance = Math.sin(((f - a0) / 5) * Math.PI); }
      const chest: P2 = [300, shoulderPx5(base, 1)[1] + 38];
      const eye: P2 = [300 + faceRight * 30 - 6 + aimDrift[0], shoulderPx5(base, 1)[1] - 136 + aimDrift[1] + settle + press * 3];
      const camC = lerp2(chest, eye, up);
      if (camera) camera.tiltRad = 0.05 * Math.sin(TAU * hash01(P.seed, 4)) * up;
      const [hL, hR] = camHands(base, camC, eo * up);
      hR.hand = [hR.hand[0] + advance * 6, hR.hand[1] - advance * 4];
      armR = mixArm(armR, hR, reachR * (1 - sm(s.tLower1, s.end, f)));
      armL = mixArm(armL, hL, reachL * (1 - sm(s.tLower1 - 2, s.end - 4, f)));
      if (camera) camera.blend = reachR * reachL * (1 - sm(s.tLower1 - 2, s.end - 4, f)); // both hands hold it; lets go -> hangs on the strap
      eyes = up > 0.6 ? "squint" : eyes; mouth = up > 0.6 ? "flat" : mouth;
      headRoll += -0.08 * up * (hash01(P.seed, 5) > 0.5 ? 1 : -1); bodyRoll += 0.02 * up * T * (hash01(P.seed, 6) - 0.5);
      if (c.check) { const k = env(f, s.tLower0, s.end, 4, 6); lookY = lerp(lookY, -0.8, k); lookX = lerp(lookX, 0, k); }
      squash += 0.15 * press;
    } else if (c.kind === "clap") {
      const w = env(f, c.t0, c.t1, 6, 8); if (w <= 0) continue;
      const ph = ((f - c.t0) / 30) * c.rate, open = 0.5 - 0.5 * Math.cos(TAU * ph); // 0 = palms together
      const y = 70 - 30 * c.amp * T, gap = 6 + 34 * open * c.amp;
      armL = mixArm(armL, { hand: [64 - gap, y], elbow: [-26, 84], shape: "open", rot: -1.4, bend: -1 }, w);
      armR = mixArm(armR, { hand: [-64 + gap, y], elbow: [26, 84], shape: "open", rot: 1.4, bend: 1 }, w);
      mouth = w > 0.5 ? "smile" : mouth; squash += 0.04 * w * (1 - open);
    } else if (c.kind === "wave") {
      const w = env(f, c.t0, c.t1, 8, 10); if (w <= 0) continue;
      const wv = Math.sin(TAU * ((f - c.t0) / 30) * c.rate);
      const arm: ArmPose = { hand: [c.side * (70 + 10 * wv), -110 * c.height * T], elbow: [c.side * 70, -6], shape: "open", rot: c.side * (0.15 + 0.35 * wv), bend: c.side };
      if (c.side > 0) armR = mixArm(armR, arm, w); else armL = mixArm(armL, arm, w);
      mouth = "smile"; brow += 0.2 * w; lookX = lerp(lookX, ctx.subjectX(f), w);
    } else if (c.kind === "talk") {
      const w = env(f, c.t0, c.t1, 6, 8); if (w <= 0) continue;
      lookX = lerp(lookX, c.toward, w); headRoll += 0.06 * w * Math.sign(c.toward);
      const syl = Math.floor(((f - c.t0) / 30) * c.rate), open = hash01(P.seed, syl) > 0.45; // irregular syllables
      if (w > 0.5) mouth = open ? "o" : "smile"; mouthW = open ? 0.7 : 1;
      if (c.gesture) { const g = 0.5 + 0.5 * Math.sin(TAU * ((f - c.t0) / 30) * 0.7 + hash01(P.seed, 11) * TAU); const a: ArmPose = { hand: [c.gesture * (20 + 30 * g), 40 + 20 * g], elbow: [c.gesture * 40, 90], shape: "open", rot: c.gesture * -0.9, bend: c.gesture }; if (c.gesture > 0) armR = mixArm(armR, a, w * 0.9); else armL = mixArm(armL, a, w * 0.9); }
    } else if (c.kind === "laugh") {
      const w = env(f, c.t0, c.t1, 4, 10); if (w <= 0) continue;
      eyes = "squint"; mouth = "smile"; mouthW = 1.2; squash += 0.06 * w * Math.abs(Math.sin(TAU * (f - c.t0) / 9)); headRoll += 0.08 * w;
    } else if (c.kind === "nod") {
      const w = env(f, c.t0, c.t1, 3, 3); if (w <= 0) continue;
      lookY += -0.5 * w * Math.max(0, Math.sin(Math.PI * c.times * (f - c.t0) / (c.t1 - c.t0)));
    } else if (c.kind === "hat" || c.kind === "lapel") {
      const w = env(f, c.t0, c.t1, 7, 8); if (w <= 0) continue;
      const wig = Math.sin(TAU * (f - c.t0) / 12) * 4;
      const a: ArmPose = c.kind === "hat" ? { hand: [-c.side * 40 + wig, -205], elbow: [c.side * 74, -40], shape: "grip", rot: c.side * 2.6, bend: c.side }
                                          : { hand: [-c.side * 40, 30 + wig], elbow: [c.side * 34, 86], shape: "grip", rot: c.side * -2.2, bend: c.side };
      if (c.side > 0) armR = mixArm(armR, a, w); else armL = mixArm(armL, a, w);
      if (c.kind === "hat") headRoll += -0.05 * w * c.side; else lookY = lerp(lookY, -0.5, w * 0.7);
    } else if (c.kind === "look") {
      const w = env(f, c.t0, c.t1, 7, 10); lookX = lerp(lookX, c.x, w); lookY = lerp(lookY, c.y, w); brow += 0.15 * w * (c.y > 0 ? 1 : 0);
    } else if (c.kind === "point") {
      const w = env(f, c.t0, c.t1, 7, 9); if (w <= 0) continue;
      // dir = hand offset from that shoulder in screen px (e.g. [-170, -110] = up and out to the left for side -1)
      const a: ArmPose = { hand: [c.dir[0], c.dir[1]], elbow: [c.dir[0] * 0.5, c.dir[1] * 0.35 + 30], shape: "open", rot: Math.atan2(-c.dir[0], c.dir[1]) * 0.15, bend: c.side };
      if (c.side > 0) armR = mixArm(armR, a, w); else armL = mixArm(armL, a, w);
      lookX = lerp(lookX, c.side * 0.6, w); lookY = lerp(lookY, 0.4, w); mouth = "o";
    }
  }
  // irregular, individual blinks (inside the loop window)
  const blinkEvery = 70 + Math.floor(50 * hash01(P.seed, 21)), off = Math.floor(blinkEvery * hash01(P.seed, 22));
  const bk = (f + off) % blinkEvery, blink = bk < 3 && f > 4 && f < ctx.loop - 6 && !(camera && camera.blend > 0.8);
  return pose5({
    costume: P.costume, view: "front", breathe, squash, rim: 0.4, lids: 0.3,
    eyes, mouth, mouthW, worry, browL: brow, browR: brow - 0.05 + 0.1 * hash01(P.seed, 8), blink,
    lookX: Math.max(-1, Math.min(1, lookX)), lookY: Math.max(-1, Math.min(1, lookY)),
    armL, armR, headRoll, bodyRoll, camera, hairLag: 0.15 * pn(P.seed + 1, t, [2, 3]),
  });
};

export type LifeEvent = { frame: number; kind: string; who: number; note: string };
/** sound triggers derived from the same clip data that drives the poses */
export const personEvents = (P: Persona, who: number): LifeEvent[] => {
  const ev: LifeEvent[] = [];
  for (const c of P.clips) {
    if (c.kind === "photo") {
      const s = photoSpan(c);
      ev.push({ frame: s.tRaise0, kind: "cloth_soft", who, note: `person ${who} lifts camera` });
      for (const sh of c.shots) {
        ev.push({ frame: sh.f, kind: "shutter", who, note: `person ${who} presses the shutter` });
        if (sh.flash) ev.push({ frame: sh.f, kind: "flash_pop", who, note: `person ${who} flashcube/flash gun fires` });
        ev.push({ frame: sh.f + 6 + Math.round(3 * hash01(P.seed, sh.f)), kind: "film_advance", who, note: `person ${who} winds on the film` });
      }
      ev.push({ frame: s.tLower0, kind: "cloth_soft", who, note: `person ${who} lowers camera` });
    } else if (c.kind === "clap") {
      // one clap per palm contact (cos phase minimum), skipping the envelope ramps
      for (let f = c.t0 + 6; f < c.t1 - 6; f++) { const ph = ((f - c.t0) / 30) * c.rate, ph1 = ((f + 1 - c.t0) / 30) * c.rate; if (Math.floor(ph1) > Math.floor(ph)) ev.push({ frame: f + 1, kind: "clap_soft", who, note: `person ${who} claps` }); }
    } else if (c.kind === "hat" || c.kind === "lapel" || c.kind === "wave") {
      ev.push({ frame: c.t0 + 2, kind: "cloth_soft", who, note: `person ${who} ${c.kind}` });
    }
  }
  return ev;
};
/** flash intensity 0..1 for a person at frame f (brief: peak on the shutter frame, gone after 3 frames) */
export const personFlash = (P: Persona, f: number) => {
  let v = 0;
  for (const c of P.clips) if (c.kind === "photo") for (const sh of c.shots) if (sh.flash && f >= sh.f && f < sh.f + 3) v = Math.max(v, [1, 0.35, 0.1][f - sh.f]);
  return v;
};
