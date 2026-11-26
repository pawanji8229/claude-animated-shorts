// Boeing cast (approved earless odo5 cards with face glow, rendered by the PoToon card renderer) + acting helpers.
import * as THREE from "three";
import { pose5, REST_L, REST_R, SOLE5, shoulderPx5, H5, W5, type ArmPose, type Costume, type Odo5Pose } from "../../char/odo5";
import { faceTrack, withFace, type FaceName } from "../short3/expr";
import { HERO } from "../centennial/chars";
import type { Placed } from "../centennial/chars";
import type { V3 } from "../../lib/math";
export type { Placed };

const C = (o: Partial<Costume> & { pal: Record<string, string> }): Costume => ({ goggles: false, hairs: false, tufts: true, hat: null, stache: false, suit: false, apron: false, ...o });
export const ENGINEER = HERO;   // the approved TwistFrame hero plays the engineer
export const OFFICER = C({ hat: "pilot", suit: true, stache: true, pal: { shirt: "#6a6a42", shirtShade: "#55552f", collar: "#d8cfa8", tie: "#4a4a2a", hat: "#6a6a42", hatShade: "#4e4e2e", band: "#3a3a22", hair: "#3a2a20", pocket: "#c9a040", glove: "#5a4a3a" } });
export const WORKERS: Costume[] = [
  C({ hat: "bowler", pal: { shirt: "#3f5e88", shirtShade: "#2e4668", hat: "#2e3a4a", hatShade: "#1e2836", band: "#3a4a5a", hair: "#4a3424" } }),
  C({ stache: true, pal: { shirt: "#3b5a7e", shirtShade: "#2a4260", hair: "#2a1e16", collar: "#9ab0c8" } }),
  C({ hat: "hard", pal: { shirt: "#5a6a7a", shirtShade: "#44525e", hat: "#c9a040", hatShade: "#a07e2a", hair: "#6a4a2e" } }),
  C({ pal: { shirt: "#a8442e", shirtShade: "#86321e", hair: "#3a2a1e", collar: "#f0e6d0" } }),      // riveter (red shirt)
  C({ pal: { shirt: "#3a6a8a", shirtShade: "#2a5068", hair: "#b8864a", collar: "#e8e0cc" } }),      // riveter (blue coverall)
  C({ hat: "bowler", stache: true, pal: { shirt: "#6a5a42", shirtShade: "#524430", hat: "#3a3028", hatShade: "#2a2018", band: "#4a3a2a", hair: "#2a2220" } }),
  C({ pal: { shirt: "#7a8a5a", shirtShade: "#5e6c42", hair: "#1e1a16", collar: "#d8d4c0" } }),
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const cl = (x: number) => Math.min(1, Math.max(0, x));
export const sm = (a: number, b: number, f: number) => { const t = cl((f - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lv = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const A = (hand: [number, number], shape: ArmPose["shape"] = "relaxed", bend = 1, rot = 0, elbow?: [number, number]): ArmPose => ({ hand, shape, bend, rot, behind: false, elbow });
export const mixArm = (a: ArmPose, b: ArmPose, t: number): ArmPose => t <= 0 ? a : t >= 1 ? b : { ...b, hand: [lerp(a.hand[0], b.hand[0], t), lerp(a.hand[1], b.hand[1], t)], bend: t < 0.5 ? a.bend : b.bend, rot: lerp(a.rot, b.rot, t), shape: t < 0.5 ? a.shape : b.shape, elbow: a.elbow && b.elbow ? [lerp(a.elbow[0], b.elbow[0], t), lerp(a.elbow[1], b.elbow[1], t)] : b.elbow };
export const blinkAt = (f: number, seed: number) => ((f + seed * 37) % (97 + seed * 11)) < 3;
export type Act = { c: Costume; seed: number; face: (f: number) => ReturnType<ReturnType<typeof faceTrack>>; armL?: (f: number) => ArmPose; armR?: (f: number) => ArmPose; h?: number };
export const ft = (keys: [number, FaceName][], ease = 6) => faceTrack(keys, ease);
const poseOf = (a: Act, f: number, extra: Partial<Odo5Pose> = {}) => withFace(pose5({ costume: a.c, armL: a.armL?.(f) ?? REST_L, armR: a.armR?.(f) ?? REST_R, blink: blinkAt(f, a.seed), breathe: f * 0.09 + a.seed, ...extra }), a.face(f), f, a.seed);
export const stand = (a: Act, at: V3, f: number, extra: Partial<Odo5Pose> = {}, contact = 0.6): Placed => ({ pose: poseOf(a, f, extra), pos: at, h: a.h ?? 1.62, halo: 0.1, contact });
/** walking along a path P(f): side view while moving, gait from distance travelled (no foot slide), faces its screen direction */
export const walker = (a: Act, P: (f: number) => V3, f: number, cam: { pos: V3; look: V3 }, f0: number, extra: Partial<Odo5Pose> = {}): Placed => {
  const p = P(f), q = P(f + 1), v: V3 = [q[0] - p[0], 0, q[2] - p[2]], sp = Math.hypot(v[0], v[2]) * 30;
  let d = 0; for (let g = f0; g < f; g++) { const a0 = P(g), a1 = P(g + 1); d += Math.hypot(a1[0] - a0[0], a1[2] - a0[2]); }
  const walking = cl(sp / 0.5), fw = new THREE.Vector3(cam.look[0] - cam.pos[0], 0, cam.look[2] - cam.pos[2]).normalize(), rt = new THREE.Vector3(-fw.z, 0, fw.x);
  const flip = v[0] * rt.x + v[2] * rt.z > 0;
  return { pose: withFace(pose5({ costume: a.c, view: walking > 0.05 ? "side" : "front", gait: d / 0.7, walk: walking, stride: 0.7, lean: 0.05 * walking, blink: blinkAt(f, a.seed), breathe: f * 0.09, armL: a.armL?.(f) ?? REST_L, armR: a.armR?.(f) ?? REST_R, ...extra }), a.face(f), f, a.seed),
    pos: p, h: a.h ?? 1.62, halo: 0.1, contact: 0.6, flip: walking > 0.05 ? flip : false };
};
/** straight-line path between keyframes (smoothstep per segment) */
export const keys = (k: [number, V3][]) => (f: number): V3 => { if (f <= k[0][0]) return k[0][1]; for (let i = 0; i < k.length - 1; i++) { const [f0, a] = k[i], [f1, b] = k[i + 1]; if (f <= f1) { const t = (f - f0) / (f1 - f0); return lv(a, b, t); } } return k[k.length - 1][1]; };
/** point a card's hand at a world point as seen from the camera (2D card IK; reach clamped to arm length) */
export const aimArm = (p: Placed, cam: V3, world: V3, side: -1 | 1, base: ArmPose): ArmPose => {
  const h = p.h, sole = p.pos; const yaw = Math.atan2(cam[0] - sole[0], cam[2] - sole[2]); const n = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), Cm = new THREE.Vector3(...cam), W = new THREE.Vector3(...world), S = new THREE.Vector3(...sole);
  const d = W.clone().sub(Cm), dn = d.dot(n), t = S.clone().sub(Cm).dot(n) / (Math.abs(dn) < 1e-5 ? -1e-5 : dn), hit = Cm.clone().addScaledVector(d, t);
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); const lx = hit.clone().sub(S).dot(right), ly = hit.y - S.y;
  const s = h / H5, px = (p.flip ? -1 : 1) * lx / s + W5 / 2, py = SOLE5 - ly / s; const sh = shoulderPx5(p.pose, side); let hx = px - sh[0], hy = py - sh[1];
  const len = Math.hypot(hx, hy), MAXR = 285; if (len > MAXR) { hx *= MAXR / len; hy *= MAXR / len; }
  return { ...base, hand: [hx, hy], elbow: [hx * 0.45 + side * 34, Math.max(hy * 0.5, 0) + 62], behind: hy < -170 };
};
/** repetitive work motion (hammer / rivet gun / roller) with its own rate and phase */
export const workArm = (rate: number, ph: number, amp = 1) => (f: number) => { const s = Math.sin(f * rate + ph); return A([60 + s * 12 * amp, 30 + Math.max(0, s) * 40 * amp], "grip", 1, 1.1 + s * 0.4 * amp, [100, 40]); };
