// "Night Errand" — 10 s / 300 f @ 30 fps in the Long Workshop. No on-screen text.
//   S1   0- 80  OPENING: already mid-stride. Low tracking shot at the shoes on the patterned runner, jar light
//               bobbing, camera cranes up to the glowing face as he walks
//   S2  80-168  wide diagonal tracking shot down the hall: rows of benches, pendants, he walks into the warm pool
//   S3 168-236  medium: he stops under the pendant, turns to us, side-eye, skeptical brow, sweat drop (awkward beat)
//   S4 236-300  close-up push: lifts the glowing jar to his face ("o"), it flares, cringe grin + shrug, glance away
import { V3, clamp01, lerp, mix3, smooth } from "../lib/math";
import { pose4, Odo4Pose, Mouth4 } from "../char/odo4";

export const DUR_H10 = 300;
const X = -0.42, Z0 = 1.7, Z1 = -4.05; // walk lane (left of the runner), start/stop
const WALK_END = 168;
const dist = (f: number) => { // already walking at frame 0, gentle settle into the stop
  const D = Z0 - Z1, t = clamp01(f / WALK_END);
  const e = t < 0.85 ? t / 0.925 : 0.85 / 0.925 + (1 - 0.85 / 0.925) * (1 - Math.pow(1 - (t - 0.85) / 0.15, 2));
  return D * e;
};
export const odoPos = (f: number): V3 => [X, 0, Z0 - dist(f)];
const pulse = (a: number, b: number, c: number, d: number, f: number) => smooth(a, b, f) * (1 - smooth(c, d, f));
const BLINKS = [40, 112, 196, 224, 288];

export const odoPose = (f: number): Odo4Pose => {
  const sp = dist(f + 0.5) - dist(f - 0.5);
  const front = f >= 176;
  const mouth: Mouth4 = f < 242 ? "awkward" : f < 262 ? "o" : "cringe";
  return pose4({
    view: front ? "front" : "side",
    distance: dist(f), walk: front ? 0 : clamp01(sp / 0.026), stride: 0.78,
    blink: BLINKS.some((b) => f >= b && f < b + 4),
    lookX: front ? lerp(lerp(0.55, 0.05, smooth(184, 194, f)), -0.45, smooth(282, 290, f)) : 0.6,
    lookUp: 0,
    browL: lerp(lerp(0.7, 1.0, smooth(186, 198, f)), 0.75, smooth(240, 250, f)),
    browR: lerp(lerp(-0.15, -0.45, smooth(186, 198, f)), 0.55, smooth(240, 250, f)) - 0.5 * smooth(262, 270, f),
    lids: lerp(lerp(0.45, 0.55, smooth(186, 198, f)), 0.08, smooth(240, 248, f)) + 0.25 * smooth(262, 272, f),
    mouth,
    sweat: smooth(200, 214, f),
    holdJar: 1,
    raiseJar: front ? smooth(236, 252, f) : 0,
    shrug: pulse(266, 278, 296, 320, f),
    breathe: (f / 30) * Math.PI * 2 * 0.4,
    squash: Math.max(0, 1 - Math.abs(f - 176) / 4),
  });
};
export const jarK = (f: number) => smooth(246, 262, f) - 0.35 * smooth(270, 290, f);
export const glowK = (f: number) => 1 - 0.12 * jarK(f); // jar light takes over: keep total face level steady

// ---------------- cameras ----------------
type Shot = { a: number; b: number; cam: (t: number, f: number) => { pos: V3; look: V3; fov: number } };
const SHOTS: Shot[] = [
  { a: 0, b: 80, cam: (t, f) => { const p = odoPos(f); const up = smooth(8, 76, f);
      return { pos: [1.3, lerp(0.32, 1.02, up), p[2] + lerp(0.25, 0.6, up)], look: [X, lerp(0.22, 0.9, up), p[2] - 0.25], fov: 42 }; } },
  { a: 80, b: 168, cam: (t, f) => { const p = odoPos(f);
      return { pos: [0.85, lerp(1.75, 1.55, t), p[2] + lerp(2.9, 2.4, t)], look: [X - 0.2, 0.8, p[2] - 1.4], fov: 46 }; } },
  { a: 168, b: 236, cam: (t) => ({ pos: mix3([0.78, 1.02, -1.75], [0.62, 1.0, -2.2], t), look: [X, 0.84, Z1], fov: 38 }) },
  { a: 236, b: 300, cam: (t) => ({ pos: mix3([0.5, 1.0, -2.3], [0.32, 0.98, -2.62], t), look: [X + 0.08, 0.9, Z1], fov: 34 }) },
];
export const camH10 = (f: number) => {
  const s = SHOTS.find((x) => f >= x.a && f < x.b) ?? SHOTS[SHOTS.length - 1];
  const t = smooth(s.a, s.b, f) * 0.8 + ((f - s.a) / (s.b - s.a)) * 0.2; // glide + creep, no dead holds
  const c = s.cam(t, f);
  const p = odoPos(f);
  const face: V3 = [p[0], 0.95, p[2]];
  return { ...c, focus: Math.hypot(face[0] - c.pos[0], face[1] - c.pos[1], face[2] - c.pos[2]), shot: SHOTS.indexOf(s) };
};
