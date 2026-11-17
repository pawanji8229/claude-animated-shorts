// flight timeline: aircraft motion per story layer, the camera rig, every character's blocking + acting, and the
// layer dissolves. Pure functions of the film frame (30 fps, 1511 frames = the narration). See STORYBOARD.md.
//   L1 0-712 (+ pre-roll at the loop) flight across Papa Sound | L2 688-1052 Westray: board, start, taxi, take-off
//   L3 1038-1446 Papa Westray approach + landing | L4 1236-1370 montage (Westray) | L5 1432-1511 arrived -> loop
import * as THREE from "three";
import { V3, lerp, smooth, clamp01 } from "../../lib/math";
import { camPath } from "../london-bridge/common";
import { pose5, COSTUME, REST_L, REST_R, type Odo5Pose, type Costume, type ArmPose } from "../../char/odo5";
import { FACES, faceTrack, withFace, type FaceName } from "../short3/expr";
import { STILL, ROWS, SEAT_Z, type IslanderState, DOORS } from "./islander";
import type { PlaneT, FCam, Placed } from "./Set";
import places from "./data/places.json";

export const FPS = 30, FILM_FRAMES = 1511;
const N = FILM_FRAMES;
const WRY = places.WRY, PPW = places.PPW;
const TAU = Math.PI * 2;

// ================================================================ plane helpers
const pm = (p: PlaneT) => new THREE.Matrix4().compose(new THREE.Vector3(...p.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(p.roll, p.yaw, p.pitch, "YZX")), new THREE.Vector3(1, 1, 1));
export const lw = (p: PlaneT, l: V3): V3 => { const v = new THREE.Vector3(...l).applyMatrix4(pm(p)); return [v.x, v.y, v.z]; };
export const wl = (p: PlaneT, w: V3): V3 => { const v = new THREE.Vector3(...w).applyMatrix4(pm(p).invert()); return [v.x, v.y, v.z]; };
const flash = (t: number, period: number, ph = 0, len = 0.07) => { const u = (((t + ph) % period) + period) % period; return u < len ? 1 - u / len : 0; };
const lights = (t: number) => ({ beacon: flash(t, 1.1, 0.3, 0.16), strobe: Math.max(flash(t, 1.4, 0, 0.05), flash(t, 1.4, 0.13, 0.05)) });
/** prop angle (rad) from a revolutions-per-second history integrated with a simple trapezoid (deterministic per frame) */
const propAngle = (rps: (f: number) => number, f: number, f0: number, seed: number) => { let a = seed; for (let k = f0; k < f; k++) a += (rps(k) + rps(k + 1)) * 0.5 * TAU / 30; return a; };

// ---------------- L1: cruising across the sound, WRY -> PPW line (~40 m/s, ~105 m)
const A_HEAD = Math.atan2(155, 2810);
export const planeA = (f: number): PlaneT => { const t = f / 30, x = 380 + 40 * t;
  const s: IslanderState = { ...STILL, rps: [38, 38], prop: [t * 38 * TAU * 0.137 + 0.4, t * 38 * TAU * 0.131 + 1.9], flap: 0, ail: 0.02 * Math.sin(t * 0.9), rud: 0, elev: 0, door: {}, wheel: 0, nose: 0, ...lights(t) };
  return { pos: [x, 107 - 0.45 * t + 0.45 * Math.sin(t * 0.9) + 0.2 * Math.sin(t * 2.3 + 1), -x * Math.tan(A_HEAD)], yaw: A_HEAD + 0.004 * Math.sin(t * 0.5), pitch: 0.035 + 0.006 * Math.sin(t * 1.1), roll: 0.014 * Math.sin(t * 0.7) + 0.007 * Math.sin(t * 1.9 + 0.5), s };
};

// ---------------- L2: Westray. Parked on the apron edge -> taxi onto the runway -> take-off roll -> climb over the cliffs
const P0: V3 = [128, WRY.elev, -15], YAW0 = -0.55, ROLL0 = 893, TAXI0 = 826;
const bez = (u: number): { p: [number, number]; d: [number, number] } => {   // taxi curve P0 -> (150, 0) heading east
  const a: [number, number] = [P0[0], P0[2]], d0: [number, number] = [Math.cos(YAW0), -Math.sin(YAW0)];
  const b: [number, number] = [a[0] + d0[0] * 9, a[1] + d0[1] * 9], c: [number, number] = [141, 0], e: [number, number] = [150, 0];
  const v = 1 - u; const p: [number, number] = [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * e[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * e[1]];
  const dd: [number, number] = [3 * v * v * (b[0] - a[0]) + 6 * v * u * (c[0] - b[0]) + 3 * u * u * (e[0] - c[0]), 3 * v * v * (b[1] - a[1]) + 6 * v * u * (c[1] - b[1]) + 3 * u * u * (e[1] - c[1])];
  return { p, d: dd };
};
const BEZ_LEN = (() => { let L = 0, q = bez(0).p; for (let i = 1; i <= 200; i++) { const r = bez(i / 200).p; L += Math.hypot(r[0] - q[0], r[1] - q[1]); q = r; } return L; })();
const bezAt = (s: number) => { let L = 0, q = bez(0).p; for (let i = 1; i <= 200; i++) { const u = i / 200, r = bez(u).p, dl = Math.hypot(r[0] - q[0], r[1] - q[1]); if (L + dl >= s) { const k = (s - L) / dl, uu = (i - 1 + k) / 200; return bez(uu); } L += dl; q = r; } return bez(1); };
/** distance travelled from the parking spot (m) and speed (m/s) */
const motionB = (f: number) => {
  if (f <= TAXI0) return { s: 0, v: 0 };
  const sAt = (g: number): number => { // integrate v
    let s = 0; for (let k = TAXI0; k < g; k++) s += (vB(k) + vB(k + 1)) / 60; return s; };
  return { s: sAt(f), v: vB(f) };
};
const LIFT = 936;
function vB(f: number) { if (f <= TAXI0) return 0; if (f < TAXI0 + 22) return 12 * smooth(TAXI0, TAXI0 + 22, f); if (f < ROLL0) return 12;
  if (f < LIFT) return 12 + (30 - 12) * ((f - ROLL0) / (LIFT - ROLL0)) ** 0.9; return 30 + 20 * smooth(LIFT, 1000, f); }
export const planeB = (f: number): PlaneT => {
  const t = f / 30, { s, v } = motionB(f);
  let x: number, z: number, yaw: number;
  if (s < BEZ_LEN) { const b = bezAt(s); x = b.p[0]; z = b.p[1]; yaw = Math.atan2(-b.d[1], b.d[0]); } else { x = 150 + (s - BEZ_LEN); z = 0; yaw = 0; }
  const tl = Math.max(0, (Math.min(f, 1010) - LIFT) / 30), alt = f < LIFT ? 0 : 6.2 * tl ** 1.25 + (f > 1010 ? 6.2 * 1.25 * ((1010 - LIFT) / 30) ** 0.25 * ((f - 1010) / 30) * (1 - smooth(1010, 1050, f) * 0.6) : 0);
  const pitch = f < LIFT - 8 ? 0 : f < 1012 ? 0.13 * smooth(LIFT - 8, LIFT + 6, f) : lerp(0.13, -0.02, smooth(1012, 1040, f));
  const startS = (k: number) => k < 806 ? 0 : k < 816 ? 2.5 + Math.sin(k * 1.7) * 0.6 : k < 834 ? lerp(3, 17, smooth(816, 834, k)) : k < ROLL0 ? 17 : k < LIFT ? lerp(17, 40, smooth(ROLL0, ROLL0 + 18, k)) : 40;
  const startP = (k: number) => k < 822 ? 0 : k < 830 ? 2.5 : k < 846 ? lerp(3, 17, smooth(830, 846, k)) : k < ROLL0 ? 17 : lerp(17, 40, smooth(ROLL0, ROLL0 + 18, k));
  const shake = f > 812 && f < 830 ? 0.004 * Math.sin(f * 2.9) : 0;
  const s0: IslanderState = { ...STILL, rps: [startP(f), startS(f)], prop: [propAngle(startP, f, 800, 0.4), propAngle(startS, f, 800, 1.7)], flap: 0.35, ail: 0, rud: 0, elev: 0,
    door: { rear: 1 - smooth(772, 786, f) }, wheel: s / 0.3, nose: f < TAXI0 + 40 && s < BEZ_LEN ? 0.25 * Math.sin(smooth(TAXI0, TAXI0 + 40, f) * Math.PI) : 0, ...lights(t) };
  void v;
  return { pos: [x, WRY.elev + alt, z], yaw, pitch: pitch + shake, roll: f > LIFT ? 0.012 * Math.sin(t * 1.3) : shake * 0.5, s: s0 };
};
export const PARKED_B = (): PlaneT => planeB(760);

// ---------------- L3: approach to Papa Westray (eastbound, into the easterly), flare, touchdown, roll-out
const TD = 1392, X_TD = 2600, V_APP = 40;
const xC = (f: number) => f <= TD ? X_TD - V_APP * (TD - f) / 30 : X_TD + 32 * ((f - TD) / 30) - 2.6 * ((f - TD) / 30) ** 2;
const hC = (f: number) => { if (f >= TD) return 0; const d = X_TD - xC(f); return d > 42 ? 3.3 + (d - 42) * 0.0787 : 3.3 * (d / 42) ** 1.7; };
export const planeC = (f: number): PlaneT => { const t = f / 30, x = xC(f);
  const gust = 0.03 * Math.sin(t * 1.7) + 0.018 * Math.sin(t * 3.1 + 1.2) + 0.012 * Math.sin(t * 5.3);
  const crab = 0.07 * (1 - smooth(1372, 1390, f));
  const s: IslanderState = { ...STILL, rps: f < TD ? [34, 34] : [lerp(34, 14, smooth(TD, TD + 30, f)), lerp(34, 14, smooth(TD, TD + 30, f))], prop: [t * 34 * TAU * 0.11 + 0.3, t * 34 * TAU * 0.107 + 1.1],
    flap: lerp(0.6, 1, smooth(1230, 1290, f)), ail: gust * 1.2, rud: -crab * 0.6 + (f > 1372 && f < 1395 ? 0.12 * Math.sin((f - 1372) / 23 * Math.PI) : 0), elev: 0, door: {}, wheel: f > TD ? (xC(f) - X_TD) / 0.3 : 0, nose: 0, ...lights(t) };
  const pitch = f < TD - 20 ? 0.03 : f < TD ? lerp(0.03, 0.1, smooth(TD - 20, TD - 2, f)) : lerp(0.1, 0, smooth(TD, TD + 16, f));
  return { pos: [x, PPW.elev + hC(f) + (f < TD - 30 ? 0.3 * Math.sin(t * 2.1) : 0), PPW.z + (f < TD ? 0.6 * Math.sin(t * 0.8) * (1 - smooth(1340, TD, f)) : 0)], yaw: crab + gust * 0.3, pitch, roll: f < TD - 10 ? gust : gust * (1 - smooth(TD - 10, TD, f)), s };
};

// ---------------- L5: stopped on the Papa Westray apron, engines winding down, the starboard door opens
const P5: V3 = [2700, PPW.elev, -190];
export const planeE = (f: number): PlaneT => { const t = f / 30;
  const r = (k: number) => k < 1446 ? 9 * (1 - smooth(1418, 1446, k)) + 1.2 : k < 1466 ? 1.2 * (1 - smooth(1446, 1466, k)) : 0;
  return { pos: P5, yaw: 0, pitch: 0, roll: 0, s: { ...STILL, rps: [r(f), r(f)], prop: [propAngle(r, f, 1418, 0.7), propAngle(r, f, 1418, 2.2)], flap: 1 - smooth(1440, 1470, f) * 0.6, door: { stbd: smooth(1440, 1454, f) }, beacon: 0, strobe: 0 } };
};

// ================================================================ camera rig: keys in plane-local ("L") or world ("W") space
type CK = { f: number; sp: "L" | "W"; pos: V3; look: V3; fov: number };
const KL = (f: number, pos: V3, look: V3, fov: number): CK => ({ f, sp: "L", pos, look, fov });
const KW = (f: number, pos: V3, look: V3, fov: number): CK => ({ f, sp: "W", pos, look, fov });
const rig = (keys: CK[], plane: (f: number) => PlaneT, sigma = 5) => {
  const both = keys.map((k) => { const p = plane(k.f);
    return k.sp === "L" ? { f: k.f, L: { pos: k.pos, look: k.look }, W: { pos: lw(p, k.pos), look: lw(p, k.look) }, w: 1, fov: k.fov } : { f: k.f, W: { pos: k.pos, look: k.look }, L: { pos: wl(p, k.pos), look: wl(p, k.look) }, w: 0, fov: k.fov }; });
  const pL = camPath(both.map((b) => ({ f: b.f, pos: b.L.pos, look: b.L.look, fov: b.fov })), sigma);
  const pW = camPath(both.map((b) => ({ f: b.f, pos: b.W.pos, look: b.W.look, fov: b.fov })), sigma);
  const pw = camPath(both.map((b) => ({ f: b.f, pos: [b.w, 0, 0] as V3, look: [0, 0, 0] as V3, fov: b.fov })), sigma);
  return (f: number): FCam => {
    const p = plane(f), cl = pL(f), cw = pW(f), w = clamp01(pw(f).pos[0]);
    const pos: V3 = [0, 1, 2].map((i) => lerp(cw.pos[i], lw(p, cl.pos)[i], w)) as V3, look: V3 = [0, 1, 2].map((i) => lerp(cw.look[i], lw(p, cl.look)[i], w)) as V3;
    const loc = wl(p, pos), inCab = Math.abs(loc[2]) < 0.6 && loc[0] > -2.6 && loc[0] < 3.3 && loc[1] > 0.6 && loc[1] < 2.0;
    const dPlane = Math.hypot(pos[0] - p.pos[0], pos[1] - p.pos[1] - 1.5, pos[2] - p.pos[2]);
    return { pos, look, fov: cl.fov, focus: Math.hypot(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]), near: inCab ? 0.025 : dPlane < 6 ? 0.04 : dPlane < 40 ? 0.12 : dPlane < 300 ? 0.6 : 2.0 };
  };
};
const anchW = (fa: number, l: V3): V3 => lw(planeA(fa), l);
const OPEN_POS: V3 = [-0.9, 1.72, 8.8], OPEN_LOOK: V3 = [-0.1, 1.5, 0];
// cabin camera spots (row 2 is empty: the camera lives there / above it)
const MCU_POS: V3 = [1.22, 1.78, 0.04], MCU_LOOK: V3 = [0.08, 1.42, 0.08];
export const camA = rig([
  KL(-40, OPEN_POS, OPEN_LOOK, 40), KL(0, OPEN_POS, OPEN_LOOK, 40),
  KL(48, [-1.1, 1.82, 8.5], [-0.05, 1.47, 0], 40),                  // S01 side tracking (gentle drift)
  KL(96, [-26, 10, 18], [40, -20, -6], 50),                      //     reveal: back + up behind it, the sound + Papa Westray ahead
  KL(122, [2.2, 1.3, 4.6], [2.2, 1.4, 0.0], 46),                  // S02 glide in under the starboard nacelle...
  KL(138, [2.2, 1.32, 1.35], [2.2, 1.45, 0.0], 50),               //     ...to the cockpit side window
  KL(150, [2.12, 1.62, 0.4], [1.2, 1.5, 0.1], 54),                //     through the glass, turning aft
  KL(166, MCU_POS, MCU_LOOK, 46),                                  //     MCU: him + B over the empty row-2 bench
  KL(198, [1.0, 1.76, 0.08], [0.08, 1.43, 0.14], 44),              //     subtle push toward him
  KL(222, [0.58, 1.5, 0.16], [0.12, 1.0, 0.26], 54),             // S03 down to his hands + the lap belt (behind the empty row-2 bench)
  KL(262, [0.58, 1.52, 0.15], [0.12, 1.02, 0.26], 54),
  KL(284, [1.2, 1.78, 0.12], [0.1, 1.42, 0.25], 44),               //     up to his face (he notices)
  KL(300, [1.2, 1.78, 0.12], [0.1, 1.42, 0.25], 44),
  KL(316, [2.42, 1.86, 0.15], [60, 1.0, -1.0], 50),              //     toward the window: the island + airfield ahead
  KL(330, [2.22, 1.46, 0.42], [3.4, 1.15, 6.0], 54),              // S04 slide to the cockpit side window...
  KL(342, [2.22, 1.3, 1.5], [4.0, 0.6, 8.0], 56),                 //     ...out under the nacelle
  KL(356, [2.5, 1.15, 3.8], [12, -1.0, 12], 58),
  KL(368, [1.6, 0.9, 9.6], [14, 0.5, 2.0], 58),                  //     out beyond the wingtip (below the wing) before rising
  KW(384, anchW(370, [-30, 26, 30]), anchW(384, [60, -10, -2]), 56),   // left behind: the aircraft flies on, the sound opens up
  KW(404, [180, 400, -70], [1150, 0, -90], 50),                  //     wide aerial: Westray's coast below, the aircraft over the sound, Papa Westray ahead
  KW(470, [600, 380, -80], [1500, 0, -110], 52),                   // S05 travelling east across the water
  KW(525, [850, 300, -60], [1500, 0, -100], 52),
  KW(560, [1000, 160, -55], [1500, 20, -100], 50),                 //     descending onto the aircraft
  KL(600, [-9, 3.0, 9.5], [4, 1.0, -0.5], 44),                    // S06 alongside, behind the wing: the destination ahead
  KL(624, [-1.6, 1.85, 5.2], [0.3, 1.5, 0.4], 42),                 //     closer on his window (he points)
  KL(654, [-1.4, 1.85, 4.9], [0.4, 1.5, 0.3], 42),                 //     double-take
  KL(696, [-22, 9, 46], [14, 0, -4], 50),                          //     controlled wide: aircraft + destination
  KL(720, [-28, 10, 54], [16, 0, -4], 50),
], planeA, 5);

// L2 (Westray)
const doorRearW = (dx = 0) => lw(planeB(760), [DOORS.rear.rect.x0 + 0.6 + dx, 0, -1.25]);
const followHero = (f: number): CK => { const h = walkersB(f).find((w) => w.pose.costume === HERO) ?? walkersB(760).find((w) => w.pose.costume === HERO)!; const d = h.dir ?? [0.6, 0, 0.8];
  const side: V3 = [d[2], 0, -d[0]];   // to the hero's left (west side of his walk toward the plane)
  return KW(f, [h.pos[0] + side[0] * 2.2 - d[0] * 1.6, WRY.elev + 0.42, h.pos[2] + side[2] * 2.2 - d[2] * 1.6], [h.pos[0] + d[0] * 1.2, WRY.elev + 1.15, h.pos[2] + d[2] * 1.2], 54); };
let _camB: ((f: number) => FCam) | null = null;
export const camB = (f: number): FCam => (_camB ??= rig([
  KW(688, [86, WRY.elev + 0.5, -66], [100, WRY.elev + 1.6, -46], 52),
  followHero(700), followHero(724), followHero(748), followHero(768),   // S07 low angle, tracking the hero to the plane
  KL(784, [2.0, 1.1, -6.5], [-0.6, 1.4, 0.0], 50),                 //     he climbs in; the camera swings round the nose
  KL(796, [8.6, 1.6, -2.8], [2.4, 1.5, 0.3], 46),
  KL(806, [8.9, 1.8, 1.6], [2.6, 1.6, 1.4], 46),
  KL(816, [5.3, 1.8, 4.3], [2.6, 1.7, 1.5], 46),                   // S08 starboard engine + cockpit + his window
  KL(836, [5.0, 1.75, 4.6], [2.2, 1.6, 1.2], 46),
  KL(852, [1.9, 0.62, 5.6], [0.6, 0.45, 1.9], 50),                 // S09 low by the wheels as it rolls
  KL(886, [-1.4, 0.9, 7.2], [9, 0.9, 0.0], 50),                    //     the runway opens ahead (windsock)
  KL(912, [-1.8, 0.75, 7.6], [5, 0.8, 0.0], 48),                   // S10 take-off roll
  KL(938, [-0.4, 0.55, 8.0], [1.0, 0.8, 0.0], 48),                 //     wheels leave the ground
  KL(972, [-7, 3.2, 15], [8, 0.2, -1.0], 50),                      //     climbing: back + up, the cliff edge, the sea
  KL(998, [-5, 2.4, 10], [30, -6, -2], 48),                        //     Papa Westray already ahead
  KL(1020, [0.3, 1.38, 3.0], [0.08, 1.42, 0.3], 46),               //     slide to his window
  KL(1046, [0.22, 1.42, 1.5], [0.08, 1.44, 0.3], 42),
  KL(1060, [0.2, 1.42, 1.45], [0.08, 1.44, 0.3], 42),
], planeB, 5))(f);
// L3 (Papa Westray approach + landing)
export const camC = rig([
  KL(1030, [-3.2, 1.9, 16.5], [9, 0.3, 0.0], 44), KL(1044, [-3.2, 1.9, 16.5], [9, 0.3, 0.0], 44),   // S11 over the sea, Papa Westray ahead
  KL(1092, [-1.4, 2.8, 17.5], [10, 0.0, 0.0], 46),                 //     the coast passes under; windsock ahead
  KL(1126, [6.1, 2.2, 4.4], [2.4, 1.55, -0.2], 44),               //     ease to the cockpit: the pilot flying
  KL(1144, [5.6, 2.05, 3.4], [2.2, 1.55, -0.3], 44),
  KL(1156, [2.2, 1.28, 3.6], [2.2, 1.4, 0.0], 46),                 // S12 in under the nacelle, through the cockpit side window
  KL(1164, [2.2, 1.32, 1.3], [2.2, 1.45, 0.0], 50),
  KL(1172, [2.1, 1.52, 0.35], [1.0, 1.45, 0.1], 54),
  KL(1184, MCU_POS, MCU_LOOK, 50),
  KL(1236, [1.0, 1.76, 0.08], [0.08, 1.43, 0.14], 44), KL(1250, [1.0, 1.76, 0.08], [0.08, 1.43, 0.14], 44),
  KL(1356, [0.6, 0.75, 6.4], [1.2, 0.6, 0.0], 46), KL(1370, [0.6, 0.75, 6.4], [1.2, 0.6, 0.0], 46),   // S14 low beside the wheels
  KL(1396, [0.2, 0.62, 6.0], [0.7, 0.4, 0.0], 46),                 //     touchdown
  KL(1418, [0.3, 1.38, 2.9], [0.08, 1.42, 0.3], 44),               //     to his window: disbelief
  KL(1446, [0.22, 1.42, 1.5], [0.08, 1.44, 0.3], 42),
], planeC, 4);
// L5 (arrived) -> the opening composition
export const camE = rig([
  KL(1428, [0.6, 1.0, 4.6], [0.1, 1.05, 0.8], 50), KL(1446, [0.5, 1.05, 4.4], [0.1, 1.1, 0.8], 50),
  KL(1462, [-0.2, 1.2, 4.9], [0.15, 1.2, 1.2], 50),                // he steps down and looks around
  KL(1478, [0.7, 1.4, 4.6], [0.25, 1.32, 1.5], 48),                // S15 he turns to the plane: suspicious
  KL(1500, OPEN_POS, OPEN_LOOK, 40), KL(1530, OPEN_POS, OPEN_LOOK, 40),
], planeE, 5);
// L4 montage: each moment its own small camera (all with the parked aircraft at Westray)
const parked = (): PlaneT => planeB(760);
const followM = (f: number): CK => { const h = montage(0, f).out[0], d = h.dir ?? [0.6, 0, 0.8], side: V3 = [d[2], 0, -d[0]];
  return KW(f, [h.pos[0] + side[0] * 2.0 - d[0] * 1.4, WRY.elev + 0.4, h.pos[2] + side[2] * 2.0 - d[2] * 1.4], [h.pos[0] + d[0] * 1.0, WRY.elev + 1.1, h.pos[2] + d[2] * 1.0], 54); };
let _camM: ((f: number) => FCam)[] | null = null;
export const camM = (k: number) => (_camM ??= [
  rig([followM(1230), followM(1256), followM(1282)], parked, 4),
  rig([KL(1266, [-3.6, 1.25, -5.4], [-1.8, 1.1, -0.6], 48), KL(1306, [-3.0, 1.2, -4.9], [-1.8, 1.15, -0.6], 48)], parked, 4),
  rig([KL(1296, [1.3, 1.8, 0.02], [0.06, 1.3, 0.1], 48), KL(1336, [1.2, 1.78, 0.04], [0.08, 1.38, 0.12], 46)], parked, 4),
  rig([KL(1326, [0.58, 1.48, 0.16], [0.12, 1.0, 0.26], 54), KL(1350, [0.6, 1.58, 0.12], [0.1, 1.25, 0.25], 52), KL(1376, [0.64, 1.66, 0.12], [0.1, 1.38, 0.25], 52)], parked, 4),
])[k];

// ================================================================ characters
export const HERO: Costume = { ...COSTUME.odo, apron: false, pal: { shirt: "#2f6f78", shirtShade: "#22545b", hair: "#ebe9f0", hairShade: "#b9b4c4" } };
const CB: Costume = { goggles: false, hairs: false, tufts: true, hat: null, stache: true, suit: false, apron: false, pal: { shirt: "#c08a2e", shirtShade: "#9a6c20", hair: "#a8582c", hairShade: "#7d3f1e" } };
const CC: Costume = { goggles: false, hairs: false, tufts: true, hat: null, stache: false, suit: false, apron: false, pal: { shirt: "#6b4a7a", shirtShade: "#523a5e", hair: "#d4d4dc", hairShade: "#a9a9b4" } };
const CD: Costume = { goggles: false, hairs: false, tufts: true, hat: null, stache: false, suit: false, apron: false, pal: { shirt: "#3f6f4a", shirtShade: "#2f5538", hair: "#3a2c24", hairShade: "#24190f" } };
const PILOT: Costume = { goggles: false, hairs: false, tufts: true, hat: "pilot", stache: false, suit: true, apron: false, pal: { shirt: "#f2f2f0", shirtShade: "#d2d3d0", collar: "#ffffff", tie: "#1d2433", hat: "#1d2433", hatShade: "#11151e", band: "#0d0f14", hair: "#4a3a2e", glove: "#6a4a3c", pocket: "#f2f2f0" } };
const ATT: Costume = { goggles: false, hairs: false, tufts: true, hat: null, stache: true, suit: false, apron: false, pal: { shirt: "#e8df2e", shirtShade: "#bcb21c", hair: "#5b4636", hairShade: "#3a2c22" } };
const H = 1.3;
const SEAT = (row: number, side: 1 | -1): V3 => [ROWS[row] - 0.1, 0.62, side * SEAT_Z];
const A = (hand: [number, number], shape: ArmPose["shape"] = "relaxed", bend = 1, rot = 0, elbow?: [number, number]): ArmPose => ({ hand, bend, shape, rot, elbow });
// front-view arm poses for the seated acting
const ARMS = {
  rest: { armL: REST_L, armR: REST_R },
  lap: { armL: A([18, 168], "relaxed", -1, 0.4), armR: A([-18, 168], "relaxed", 1, -0.4) },
  watch: { armL: A([78, 52], "relaxed", -1, 1.4, [-6, 104]), armR: A([-12, 160], "relaxed", 1, -0.3) },
  point: { armL: REST_L, armR: A([150, -90], "open", 1, -2.2, [96, 6]) },
  tug: { armL: A([52, 8], "grip", -1, 0.6), armR: A([-52, 8], "grip", 1, -0.6) },
  belt: { armL: A([64, 176], "grip", -1, 0.9), armR: A([-64, 176], "grip", 1, -0.9) },
  bag: { armL: REST_L, armR: A([20, 250], "grip", 1, 0.2) },
  yoke: { armL: A([36, 80], "grip", -1, 0.5), armR: A([-36, 80], "grip", 1, -0.5) },
  thumb: { armL: REST_L, armR: A([104, -26], "thumb", 1, Math.PI, [88, 66]) },
  wave: { armL: REST_L, armR: A([120, -150], "open", 1, -2.8, [110, -40]) },
  hold: { armL: A([-10, 196], "relaxed", -1, 0.15), armR: A([10, 196], "grip", 1, -0.15) },
};
type ArmKey = keyof typeof ARMS;
const lerpArm = (a: ArmPose, b: ArmPose, t: number): ArmPose => ({ hand: [lerp(a.hand[0], b.hand[0], t), lerp(a.hand[1], b.hand[1], t)], bend: t < 0.5 ? a.bend : b.bend, shape: t < 0.5 ? a.shape : b.shape, rot: lerp(a.rot, b.rot, t),
  elbow: a.elbow || b.elbow ? [lerp((a.elbow ?? [a.hand[0] * 0.4, 100])[0], (b.elbow ?? [b.hand[0] * 0.4, 100])[0], t), lerp((a.elbow ?? [0, 100])[1], (b.elbow ?? [0, 100])[1], t)] : undefined });
const armTrack = (keys: [number, ArmKey][], ease = 7) => (f: number) => { let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= f) i++;
  const cur = ARMS[keys[i][1]], prev = i > 0 ? ARMS[keys[i - 1][1]] : cur, t = smooth(0, 1, clamp01((f - keys[i][0]) / ease));
  return { armL: lerpArm(prev.armL, cur.armL, t), armR: lerpArm(prev.armR, cur.armR, t) }; };
const seated = (costume: Costume, f: number, face: (f: number) => ReturnType<ReturnType<typeof faceTrack>>, arms: (f: number) => { armL: ArmPose; armR: ArmPose }, seed: number, extra: Partial<Odo5Pose> = {}) => {
  const blink = ((f + seed * 13) % (71 + seed * 7)) < 3, breathe = Math.sin(f * 0.11 + seed) * 0.5 + 0.5;
  return withFace(pose5({ costume, blink, breathe, ...arms(f), ...extra }), face(f), f, seed);
};
const fixedArms = (k: ArmKey) => () => ARMS[k];

// ---- the pilot (always flying; front view; profile when seen from behind)
const pilotFace = faceTrack([[0, "focused"], [820, "content"], [900, "focused"], [1100, "focused"], [1130, "content"], [1150, "focused"]], 8);
export const pilot = (f: number, behind: boolean): Placed => ({ pose: seated(PILOT, f, pilotFace, fixedArms("yoke"), 5, behind ? { view: "side" } : {}), pos: [ROWS[0] - 0.06, 0.62, -SEAT_Z], h: H, halo: 0.06, flip: false });

// ---- L1 cabin: hero (row 2 stbd), B (row 2 port), C (row 3 stbd, calm), D (row 3 port, dozing)
const heroFaceA = faceTrack([
  [-60, "smug"], [70, "smug"], [104, "xDisbelief"], [116, "browsShoot"], [130, "focused"], [146, "xSideEyeL"], [160, "focused"], [174, "frozenSmile"], [188, "uncomfyGrin"],
  [204, "comicSerious"], [244, "focused"], [264, "content"], [272, "delighted"], [282, "hugeShock"], [294, "frozenSmile"], [306, "panic"],
  [330, "panic"], [560, "smug"], [598, "doubleTake"], [610, "idea"], [640, "doubleTake"], [654, "hugeShock"], [672, "nervousLaugh"],
] as [number, FaceName][], 5);
const heroArmsA = armTrack([[-60, "rest"], [126, "watch"], [146, "rest"], [158, "watch"], [176, "rest"], [208, "tug"], [226, "bag"], [244, "belt"], [266, "lap"], [292, "watch"], [312, "rest"], [606, "point"], [644, "rest"]]);
export const heroA = (f: number): Placed => { const wig = f > 200 && f < 226 ? Math.sin((f - 200) * 0.7) * 0.05 : f > 266 && f < 280 ? Math.sin((f - 266) * 0.9) * 0.06 : 0;
  const leanBag = f > 226 && f < 246 ? Math.sin(((f - 226) / 20) * Math.PI) * 0.22 : 0, jolt = f > 282 && f < 292 ? -0.5 * Math.sin(((f - 282) / 10) * Math.PI) : 0;
  const lookWin = (f > 146 && f < 158) || (f > 602 && f < 644) ? 1 : 0;
  const p = seated(HERO, f, heroFaceA, heroArmsA, 1, { watch: true, bodyRoll: wig, lean: leanBag, squash: jolt * 0.4 });
  return { pose: { ...p, lookX: lookWin ? -1 : p.lookX, lookY: (f > 126 && f < 146) || (f > 158 && f < 176) || (f > 292 && f < 310) ? 0.75 : f > 226 && f < 266 ? 0.7 : p.lookY }, pos: SEAT(2, 1), h: H, halo: 0.12, light: f > 100 && f < 330 ? 0.9 : 0 };
};
const bFaceA = faceTrack([[-60, "bored"], [118, "deadpan"], [150, "xSideEyeL"], [196, "suspicious"], [230, "bored"], [290, "xSideEyeL"], [340, "bored"], [620, "xSideEyeL"]] as [number, FaceName][], 6);
export const bA = (f: number): Placed => ({ pose: seated(CB, f, bFaceA, fixedArms("lap"), 2), pos: SEAT(2, -1), h: H, halo: 0.08 });
const cFace = faceTrack([[-60, "content"], [230, "bored"], [260, "content"], [700, "content"]] as [number, FaceName][], 8);
export const cA = (f: number): Placed => { const p = seated(CC, f, cFace, fixedArms("lap"), 3); return { pose: { ...p, lookX: -1, lookY: 0.1 }, pos: SEAT(3, 1), h: H, halo: 0.06 }; };
const dFace = faceTrack([[-60, "deadpan"], [100, "bored"], [400, "deadpan"]] as [number, FaceName][], 8);
export const dA = (f: number): Placed => { const p = seated(CD, f, dFace, fixedArms("lap"), 4); return { pose: { ...p, lids: 0.92, headRoll: (p.headRoll ?? 0) + 0.12 + 0.03 * Math.sin(f * 0.05) }, pos: SEAT(4, -1), h: H, halo: 0.05 }; };

// ---- walkers (outdoors, side view); gait from distance walked (no foot slide)
const walkSeg = (f: number, f0: number, f1: number, d: number, rampIn = 8, rampOut = 10) => {
  const T = f1 - f0, v = d / (T - rampIn / 2 - rampOut / 2), t = Math.max(0, Math.min(T, f - f0));
  let x: number; if (t < rampIn) x = (v * t * t) / (2 * rampIn); else if (t < T - rampOut) x = (v * rampIn) / 2 + v * (t - rampIn); else { const r = T - t; x = d - (v * r * r) / (2 * Math.max(1e-6, rampOut)); }
  const w = f <= f0 || f >= f1 ? 0 : Math.min(1, rampIn ? t / rampIn : 1, rampOut ? (T - t) / rampOut : 1) * 0.85 + 0.15;
  return { d: x, w: f <= f0 || f >= f1 ? 0 : w };
};
type Walker = Placed & { dir?: V3; gait?: number; walk?: number };
const walkPose = (c: Costume, d: number, w: number, extra: Partial<Odo5Pose> = {}) => pose5({ costume: c, view: w > 0.02 ? "side" : "front", gait: d / 0.8, walk: w, stride: 0.8, lean: 0.05 * w, ...extra });
/** walk from a to b during [f0, f1], then climb into the door [f1, f2] (rise + disappear into the cabin) */
const boardWalk = (c: Costume, f: number, a: V3, b: V3, f0: number, f1: number, f2: number, face: (f: number) => ReturnType<ReturnType<typeof faceTrack>>, seed: number, extra: Partial<Odo5Pose> = {}): Walker | null => {
  if (f > f2) return null; const L = Math.hypot(b[0] - a[0], b[2] - a[2]); const s = walkSeg(f, f0, f1, L, 8, 10), u = s.d / L;
  const dir: V3 = [(b[0] - a[0]) / L, 0, (b[2] - a[2]) / L];
  let pos: V3 = [lerp(a[0], b[0], u), a[1], lerp(a[2], b[2], u)];
  if (f > f1) { const k = smooth(f1, f2, f); const din = lw(planeB(760), [DOORS.rear.rect.x0 + 0.6, 0.62, -0.3]); pos = [lerp(b[0], din[0], k), lerp(b[1], b[1] + 0.62, smooth(f1, f1 + (f2 - f1) * 0.5, f)), lerp(b[2], din[2], k)]; }
  const blink = ((f + seed * 17) % 79) < 3;
  return { pose: withFace(walkPose(c, s.d, s.w, { blink, holdR: "bag", ...extra }), face(f), f, seed), pos, h: H, halo: 0.1, dir, gait: s.d / 0.8, walk: s.w };
};
const heroWalkFace = faceTrack([[680, "oneBrowUp"], [716, "suspSquint"], [738, "xDisbelief"], [756, "uncomfyGrin"], [770, "worried"]] as [number, FaceName][], 6);
const heroL2Face = faceTrack([[780, "worried"], [806, "panic"], [826, "nervousLaugh"], [850, "worried"], [890, "frozenSmile"], [940, "hugeShock"], [1010, "xDisbelief"], [1024, "browsShoot"], [1040, "xDisbelief"]] as [number, FaceName][], 5);
const heroL2Arms = armTrack([[780, "lap"], [1012, "watch"], [1030, "rest"], [1036, "watch"]]);
const bWalkFace = faceTrack([[680, "content"], [740, "bored"]] as [number, FaceName][], 6);
const cWalkFace = faceTrack([[680, "content"]] as [number, FaceName][], 6);
export const walkersB = (f: number): Walker[] => {
  const door = doorRearW(), out: Walker[] = [];
  const off = (dx: number, dz: number): V3 => [door[0] + dx, WRY.elev, door[2] + dz];
  const c = boardWalk(CC, f, off(-1.4, -2.6), door, 664, 716, 734, cWalkFace, 3); if (c) out.push(c);
  const b = boardWalk(CB, f, off(-1.8, -3.0), door, 680, 744, 758, bWalkFace, 2); if (b) out.push(b);
  const h = boardWalk(HERO, f, off(-2.0, -3.6), door, 690, 770, 783, heroWalkFace, 1, { watch: true, lookY: f > 700 && f < 760 ? -0.6 : 0 }); if (h) out.push(h);
  return out;
};
/** seated cabin list for L2 (after boarding) */
export const cabinB = (f: number): Placed[] => {
  const L: Placed[] = [];
  if (f >= 760) L.push({ pose: seated(CC, f, cFace, fixedArms("lap"), 3), pos: SEAT(3, 1), h: H, halo: 0.06 });
  if (f >= 770) L.push({ pose: seated(CB, f, faceTrack([[760, "bored"], [900, "deadpan"], [945, "content"]] as [number, FaceName][], 6), fixedArms("lap"), 2), pos: SEAT(2, -1), h: H, halo: 0.08 });
  if (f >= 784) { const p = seated(HERO, f, heroL2Face, heroL2Arms, 1, { watch: true, squash: f > 806 && f < 816 ? -0.15 : 0 });
    L.push({ pose: { ...p, lookX: f > 840 && f < 1000 ? -0.9 : p.lookX, lookY: (f > 1012 && f < 1030) || f > 1036 ? 0.7 : p.lookY }, pos: SEAT(2, 1), h: H, halo: 0.12, light: 0.9 }); }
  L.push(dA(f));
  return L;
};
/** the Westray attendant (hi-vis): watches the start, thumbs-up to the pilot, then waves the aircraft off */
const attFace = faceTrack([[680, "content"], [800, "focused"], [830, "proud"], [900, "delighted"]] as [number, FaceName][], 8);
export const attendant = (f: number): Walker => { const arms = f > 828 && f < 860 ? ARMS.thumb : f > 900 && f < 990 ? ARMS.wave : ARMS.rest; const wv = f > 900 && f < 990 ? Math.sin(f * 0.5) * 30 : 0;
  return { pose: withFace(pose5({ costume: ATT, ...arms, armR: { ...arms.armR, hand: [arms.armR.hand[0] + wv * 0.3, arms.armR.hand[1] + wv] }, blink: (f % 67) < 3 }), attFace(f), f, 7), pos: [150, WRY.elev, -38], h: H, halo: 0.08 }; };

// ---- L3 cabin (approach): the hero very serious, then the runway right outside
const heroFaceC = faceTrack([[1150, "content"], [1170, "comicSerious"], [1214, "focused"], [1222, "hugeShock"], [1232, "doubleTake"], [1250, "hugeShock"],
  [1400, "xDisbelief"], [1414, "browsShoot"], [1426, "xDisbelief"]] as [number, FaceName][], 4);
const heroArmsC = armTrack([[1150, "lap"], [1176, "belt"], [1192, "tug"], [1206, "lap"], [1226, "rest"]]);
export const cabinC = (f: number): Placed[] => {
  const p = seated(HERO, f, heroFaceC, heroArmsC, 1, { watch: true, bodyRoll: f > 1192 && f < 1206 ? Math.sin((f - 1192) * 0.9) * 0.04 : 0, squash: f > 1222 && f < 1230 ? -0.25 : 0 });
  const hero: Placed = { pose: { ...p, lookX: f > 1214 && f < 1222 ? -1 : f > 1400 ? -0.8 : p.lookX }, pos: SEAT(2, 1), h: H, halo: 0.12, light: 0.9 };
  const bF = faceTrack([[1150, "bored"], [1196, "xSideEyeL"], [1240, "deadpan"]] as [number, FaceName][], 6);
  return [hero, { pose: seated(CB, f, bF, fixedArms("lap"), 2), pos: SEAT(2, -1), h: H, halo: 0.08 }, { ...cA(f) }, dA(f)];
};

// ---- L4 montage (overly serious boarding, at Westray)
const seriousFace = faceTrack([[1220, "comicSerious"], [1340, "comicSerious"], [1350, "content"], [1358, "delighted"]] as [number, FaceName][], 5);
export const montage = (k: number, f: number): { out: Walker[]; cab: Placed[] } => {
  if (k === 0) { const b: V3 = doorRearW(), a: V3 = [b[0] - 2.6, WRY.elev, b[2] - 4.4]; const s = walkSeg(f, 1222, 1290, Math.hypot(b[0] - a[0], b[2] - a[2]) * 0.86, 6, 0), L = Math.hypot(b[0] - a[0], b[2] - a[2]), u = s.d / L;
    return { out: [{ pose: withFace(walkPose(HERO, s.d * 0.9, s.w, { watch: true, holdR: "bag", lean: -0.06 }), seriousFace(f), f, 1), pos: [lerp(a[0], b[0], u), a[1], lerp(a[2], b[2], u)], h: H, halo: 0.1, dir: [(b[0] - a[0]) / L, 0, (b[2] - a[2]) / L], gait: s.d * 0.9 / 0.8, walk: s.w }], cab: [] }; }
  if (k === 1) { const b = doorRearW(), din = lw(planeB(760), [DOORS.rear.rect.x0 + 0.6, 0.62, -0.25]), u = smooth(1272, 1300, f), up = smooth(1272, 1286, f);
    const p = withFace(pose5({ costume: HERO, watch: true, holdR: "bag", lean: 0.25 * up, squash: 0.12 * up }), seriousFace(f), f, 1);
    return { out: [{ pose: p, pos: [lerp(b[0], din[0], u), b[1] + 0.62 * up, lerp(b[2], din[2], u)], h: H, halo: 0.1 }], cab: [] }; }
  const sitting = k === 2 ? smooth(1306, 1322, f) : 1;
  const arms = k === 2 ? ARMS.rest : f < 1344 ? ARMS.belt : ARMS.lap;
  const p = withFace(pose5({ costume: HERO, watch: true, ...arms, squash: k === 2 ? 0.2 * (1 - sitting) : 0, bodyRoll: k === 3 && f > 1346 ? Math.sin((f - 1346) * 0.8) * 0.06 : 0, lean: k === 2 ? 0.3 * (1 - sitting) : 0 }), seriousFace(f), f, 1);
  return { out: [], cab: [{ pose: p, pos: [SEAT(2, 1)[0], 0.62 + 0.38 * (1 - sitting), SEAT(2, 1)[2]], h: H, halo: 0.12, light: 0.9 }, { pose: seated(CC, f, cFace, fixedArms("lap"), 3), pos: SEAT(3, 1), h: H, halo: 0.06 }] };
};
export const BELT_CLICK_M = 1344;

// ---- L5 arrived: C then B then the hero step out of the starboard door; he looks round, can't believe it, side-eyes the plane
const doorStbdW = (dz = 0): V3 => lw(planeE(1450), [(DOORS.stbd.rect.x0 + DOORS.stbd.rect.x1) / 2, 0, 0.62 + dz]);
const heroFaceE = faceTrack([[1440, "xDisbelief"], [1462, "tinyConfused"], [1470, "doubleTake"], [1478, "hugeShock"], [1486, "suspSquint"], [1496, "xSideEyeR"], [1520, "suspSquint"]] as [number, FaceName][], 5);
export const walkersE = (f: number): Walker[] => {
  const out: Walker[] = [], d0 = doorStbdW(), step = (f0: number, c: Costume, face: (f: number) => ReturnType<ReturnType<typeof faceTrack>>, seed: number, to: V3, fw: number) => {
    if (f < f0) return; const k = smooth(f0, f0 + 10, f); const base: V3 = [d0[0], d0[1] + 0.62 * (1 - k), d0[2] + 0.4 + k * 0.9];
    const L = Math.hypot(to[0] - base[0], to[2] - base[2]), s = walkSeg(f, f0 + 10, f0 + 10 + fw, L, 6, 8), u = s.d / L;
    out.push({ pose: withFace(walkPose(c, s.d, s.w, { blink: (f % 61) < 3, holdR: "bag" }), face(f), f, seed), pos: [lerp(base[0], to[0], u), base[1], lerp(base[2], to[2], u)], h: H, halo: 0.08, dir: [(to[0] - base[0]) / L, 0, (to[2] - base[2]) / L], gait: s.d / 0.8, walk: s.w }); };
  step(1448, CC, cFace, 3, [d0[0] - 3.2, PPW.elev, d0[2] + 2.6], 70); step(1456, CB, faceTrack([[1440, "bored"]] as [number, FaceName][]), 2, [d0[0] - 2.4, PPW.elev, d0[2] + 3.6], 70);
  if (f >= 1460) { const k = smooth(1460, 1470, f), turn = smooth(1484, 1492, f);
    const p = withFace(pose5({ costume: HERO, watch: true, holdR: "bag", squash: f > 1476 && f < 1482 ? -0.2 : 0, lean: -0.05 * turn }), heroFaceE(f), f, 1);
    const look = f < 1478 ? Math.sin((f - 1462) * 0.25) : -1 + 2 * turn;
    out.push({ pose: { ...p, lookX: f > 1490 ? 1 : look, lookY: f > 1490 ? -0.15 : p.lookY }, pos: [d0[0] + 0.1, d0[1] + 0.62 * (1 - k), d0[2] + 0.5 + 0.8 * k], h: H, halo: 0.13, light: 1.0 }); }
  return out;
};
export const cabinE = (f: number): Placed[] => { const L: Placed[] = [dA(f)]; if (f < 1448) L.push({ pose: seated(CC, f, cFace, fixedArms("lap"), 3), pos: SEAT(3, 1), h: H, halo: 0.06 }); if (f < 1456) L.push({ pose: seated(CB, f, faceTrack([[1400, "bored"]] as [number, FaceName][]), fixedArms("lap"), 2), pos: SEAT(2, -1), h: H, halo: 0.08 });
  if (f < 1460) L.push({ pose: seated(HERO, f, heroFaceE, fixedArms("lap"), 1, { watch: true }), pos: SEAT(2, 1), h: H, halo: 0.12 }); return L; };
export const attendantE = (f: number): Walker => ({ pose: withFace(pose5({ costume: ATT, ...(f > 1452 && f < 1480 ? ARMS.wave : ARMS.rest), blink: (f % 67) < 3 }), attFace(900), f, 7), pos: [2706, PPW.elev, -212], h: H, halo: 0.08 });

// ================================================================ layers + dissolves
export type Layer = "A" | "B" | "C" | "M0" | "M1" | "M2" | "M3" | "E" | "A_LOOP";
/** [layer, start, fullFrom, fullTo, end] — opacity ramps start->fullFrom and fullTo->end (smoothstep) */
export const LAYERS: [Layer, number, number, number, number][] = [
  ["A", 0, 0, 688, 706], ["B", 688, 706, 1038, 1052], ["C", 1038, 1052, 1236, 1250], ["M0", 1236, 1250, 1268, 1278], ["M1", 1268, 1278, 1298, 1308], ["M2", 1298, 1308, 1326, 1336],
  ["M3", 1326, 1336, 1356, 1368], ["C", 1356, 1368, 1432, 1446], ["E", 1432, 1446, N, N], ["A_LOOP", 1486, N, N, N],
];
export const layerOpacity = (L: (typeof LAYERS)[number], f: number) => { const [, a, b, c, d] = L; if (f < a || f >= d && d < N) return 0; const up = b > a ? smooth(a, b, f) : 1; const dn = d > c ? 1 - smooth(c, d, f) : 1; return Math.min(up, dn); };
export { N as FILM_N };
void TAU; void REST_L;
