// Camera 2.0 movement library. Every move returns a `Shot`: a pure function frame -> CamState over [f0, f1] (it also
// answers outside its range by holding the end states, so transitions can blend into / out of it).
// Every move has adjustable timing (f0/f1 or a speed in m/s), easing (named curve or explicit accel/decel fractions),
// distance, direction and intensity, plus the lens (focal length, aperture, focus target / rack focus) and an optional
// deterministic handheld layer. Moves are subject-relative where that makes sense (they keep a moving target framed).
import { add, sub, mul, norm, len, dist, lerp, lerp3, clamp, clamp01, cross, sph, azel, ease, trapezoid, wobble, type CamState, type EaseName, type V3 } from "./core";

export type Target = V3 | ((f: number) => V3);
export const tp = (t: Target, f: number): V3 => (typeof t === "function" ? t(f) : t);
export type Shot = { name: string; f0: number; f1: number; at: (f: number) => CamState; /** subjects this shot is about (for QC framing checks) */ subjects?: Target[] };

export type Common = {
  f0: number; f1?: number;
  /** alternatively give a travel speed (m/s) and let the move compute its own duration */
  speed?: number;
  ease?: EaseName; accel?: number; decel?: number;
  /** 0..1 scales the move's distance / angle */
  intensity?: number;
  /** focal length (mm), or [start, end] for a zoom/dolly-zoom */
  focal?: number | [number, number];
  fstop?: number;
  /** focus target; [a, b] = rack focus from a to b over `rack` (fraction window of the move) */
  focusOn?: Target | [Target, Target];
  rack?: [number, number];
  roll?: number;
  /** handheld amplitude in metres (0 = locked off). Kept small and low-frequency: a breathing operator, never shake. */
  handheld?: number; seed?: number;
};
const FPS = 30;
const endF = (c: Common, lengthM: number) => c.f1 ?? Math.round(c.f0 + (c.speed ? (lengthM / c.speed) * FPS : 90));
/** progress 0..1 of the move at frame f (holds outside the range) */
export const progress = (c: Common, f1: number, f: number) => {
  const t = clamp01((f - c.f0) / Math.max(1, f1 - c.f0));
  return c.accel !== undefined || c.decel !== undefined ? trapezoid(t, c.accel ?? 0.3, c.decel ?? 0.3) : ease(c.ease ?? "cine", t);
};
const focalAt = (c: Common, p: number, def: number) => { const v = c.focal ?? def; return Array.isArray(v) ? Math.exp(lerp(Math.log(v[0]), Math.log(v[1]), p)) : v; };
/** focus distance: subject distance, or a rack between two targets interpolated in DIOPTERS (1/d) so it never hunts */
const focusAt = (c: Common, pos: V3, look: V3, f: number, f1: number) => {
  const fo = c.focusOn;
  if (Array.isArray(fo) && fo.length === 2 && (typeof fo[0] === "function" || Array.isArray(fo[0]))) {
    const [a, b] = fo as [Target, Target], w = c.rack ?? [0.3, 0.7], t = clamp01((f - c.f0) / Math.max(1, f1 - c.f0)), u = ease("sine", (t - w[0]) / Math.max(1e-3, w[1] - w[0]));
    const da = 1 / Math.max(0.2, dist(pos, tp(a, f))), db = 1 / Math.max(0.2, dist(pos, tp(b, f))); return 1 / lerp(da, db, u);
  }
  return dist(pos, fo ? tp(fo as Target, f) : look);
};
const hand = (c: Common, f: number): V3 => { const a = c.handheld ?? 0; if (!a) return [0, 0, 0]; const s = c.seed ?? 7; return [a * wobble(f, s, 0.32), a * 0.7 * wobble(f, s + 3.1, 0.27), a * 0.5 * wobble(f, s + 5.7, 0.21)]; };
const make = (name: string, c: Common, f1: number, pose: (f: number, p: number) => { pos: V3; look: V3; roll?: number }, focalDef: number, subjects?: Target[]): Shot => ({
  name, f0: c.f0, f1, subjects,
  at: (f) => { const p = progress(c, f1, f), q = pose(f, p), h = hand(c, f), pos = add(q.pos, h), look = add(q.look, mul(h, 0.6));
    return { pos, look, focal: focalAt(c, p, focalDef), focus: focusAt(c, pos, look, f, f1), fstop: c.fstop ?? 5.6, roll: (q.roll ?? 0) + (c.roll ?? 0) }; },
});

// ---------------------------------------------------------------- spherical rig moves (subject-centred)
export type Rig = { target: Target; az: number | [number, number]; el: number | [number, number]; d: number | [number, number]; lookOffset?: V3; height?: number | [number, number];
  /** subject facing per frame: the rig turns with the subject's facing CHANGE since f0 (heavily smoothed: big turns are
   *  followed, fidgets are not) so a character who turns keeps the planned three-quarter framing */
  facing?: (f: number) => number; facingSigma?: number };
/** Gaussian-smoothed facing change since f0 (angle-wrap safe) */
export const facingDelta = (facing: (f: number) => number, f: number, f0: number, sig = 18) => {
  const R = Math.ceil(sig * 2.5); let x = 0, z = 0; for (let i = -R; i <= R; i++) { const k = Math.exp(-((i / sig) ** 2) / 2), a = facing(f + i); x += Math.sin(a) * k; z += Math.cos(a) * k; }
  let x0 = 0, z0 = 0; for (let i = -R; i <= R; i++) { const k = Math.exp(-((i / sig) ** 2) / 2), a = facing(f0 + i); x0 += Math.sin(a) * k; z0 += Math.cos(a) * k; }
  const d = Math.atan2(x, z) - Math.atan2(x0, z0); return Math.atan2(Math.sin(d), Math.cos(d));
};
const rv = (v: number | [number, number], p: number) => (Array.isArray(v) ? lerp(v[0], v[1], p) : v);
/** the base of dolly / push / pull / orbit / arc / circular moves: interpolate azimuth, elevation and distance around a target */
export const rig = (name: string, c: Common, r: Rig, focalDef = 35) => {
  const arcLen = Math.abs(rv(r.d, 0.5) * (rv(r.az, 1) - rv(r.az, 0))) + Math.abs(rv(r.d, 1) - rv(r.d, 0)), f1 = endF(c, arcLen);
  return make(name, c, f1, (f, p) => { const t = tp(r.target, f), look = add(t, r.lookOffset ?? [0, 0, 0]);
    const daz = r.facing ? facingDelta(r.facing, f, c.f0, r.facingSigma ?? 30) : 0;
    return { pos: add(add(t, sph(rv(r.az, p) + daz, rv(r.el, p), rv(r.d, p))), [0, rv(r.height ?? 0, p), 0]), look }; }, focalDef, [r.target]);
};
/** dolly in (d1 < d0) or out along the view axis */
export const dolly = (c: Common, target: Target, az: number, el: number, d0: number, d1: number) => rig("dolly", c, { target, az, el, d: [d0, d1] });
/** slow push-in: 8-25 % closer over a long, gentle move (mystery, importance, listening) */
export const slowPush = (c: Common, target: Target, az: number, el: number, d0: number, facing?: (f: number) => number) => rig("slowPush", { ease: "cine", ...c }, { target, az, el, d: [d0, d0 * (1 - 0.25 * (c.intensity ?? 0.6))], facing }, 40);
/** dramatic push-in: fast start, long settle, slight focal increase (surprise, realization). No shake. */
export const dramaticPush = (c: Common, target: Target, az: number, el: number, d0: number, facing?: (f: number) => number) =>
  rig("dramaticPush", { ease: "settle", focal: c.focal ?? [35, 42], ...c }, { target, az, el, d: [d0, d0 * (1 - 0.55 * (c.intensity ?? 0.8))], facing });
/** pull-back reveal: start on a detail, retreat and rise while the aim migrates to the whole subject/environment */
export const pullBackReveal = (c: Common, detail: Target, whole: Target, az: number, el: [number, number], d: [number, number]) => {
  const f1 = endF(c, Math.abs(d[1] - d[0]));
  return make("pullBackReveal", { focal: [50, 28], ease: "cine", ...c }, f1, (f, p) => {
    const w = ease("sine", clamp01((p - 0.1) / 0.75)), look = lerp3(tp(detail, f), tp(whole, f), w);
    return { pos: add(tp(detail, f), sph(az, lerp(el[0], el[1], p), lerp(d[0], d[1], p))), look };
  }, 35, [detail, whole]);
};
/** orbit / partial orbit: `turns` of a circle (dir = sign); constant-speed when ease = linear */
export const orbit = (c: Common, target: Target, az0: number, turns: number, el: number, d: number, facing?: (f: number) => number) => rig("orbit", { ease: "sine", ...c }, { target, az: [az0, az0 + turns * 2 * Math.PI * (c.intensity ?? 1)], el, d, facing });
/** arc: a partial orbit that also changes distance (closing in while circling the subject) */
export const arc = (c: Common, target: Target, az: [number, number], el: [number, number], d: [number, number]) => rig("arc", c, { target, az, el, d });
/** full circular move at constant angular speed (loop-safe when `turns` is an integer) */
export const circular = (c: Common & { loop?: boolean }, target: Target, az0: number, turns: number, el: number, d: number) => rig("circular", c.loop ? { ease: "linear", ...c } : { accel: 0.12, decel: 0.12, ...c }, { target, az: [az0, az0 + turns * 2 * Math.PI], el, d });

// ---------------------------------------------------------------- world-space moves
/** crane up / down: the camera rises (h > 0) or descends while the aim stays on (or migrates between) targets */
export const crane = (c: Common, from: V3, h: number, look0: Target, look1: Target = look0) => make("crane", c, endF(c, Math.abs(h)), (f, p) => ({ pos: add(from, [0, h * p * (c.intensity ?? 1), 0]), look: lerp3(tp(look0, f), tp(look1, f), p) }), 32, [look0]);
/** pedestal: camera AND aim move vertically together (no tilt) */
export const pedestal = (c: Common, from: V3, look: V3, h: number) => make("pedestal", c, endF(c, Math.abs(h)), (_f, p) => { const o: V3 = [0, h * p * (c.intensity ?? 1), 0]; return { pos: add(from, o), look: add(look, o) }; }, 35);
/** pan (yaw about the camera) from az0 to az1, at elevation el */
export const pan = (c: Common, from: V3, az0: number, az1: number, el = 0, aimDist = 20) => make("pan", { ease: "sine", ...c }, endF(c, Math.abs(az1 - az0) * aimDist), (_f, p) => ({ pos: from, look: add(from, sph(lerp(az0, az1, p), el, aimDist)) }), 35);
/** tilt (pitch about the camera) */
export const tilt = (c: Common, from: V3, az: number, el0: number, el1: number, aimDist = 20) => make("tilt", { ease: "sine", ...c }, endF(c, Math.abs(el1 - el0) * aimDist), (_f, p) => ({ pos: from, look: add(from, sph(az, lerp(el0, el1, p), aimDist)) }), 35);
const rightOf = (from: V3, look: V3): V3 => norm(cross(norm(sub(look, from)), [0, 1, 0]));
/** truck: camera AND aim slide sideways (dist > 0 = camera-right) - a lateral move that does not pivot */
export const truck = (c: Common, from: V3, look: V3, d: number) => { const r = rightOf(from, look); return make("truck", c, endF(c, Math.abs(d)), (_f, p) => { const o = mul(r, d * p * (c.intensity ?? 1)); return { pos: add(from, o), look: add(look, o) }; }, 35); };
/** parallax: the camera slides sideways while the aim stays locked on the subject, so foreground and background
 *  layers slide past each other at different speeds (depth without moving the subject) */
export const parallax = (c: Common, from: V3, subject: Target, d: number) => make("parallax", c, endF(c, Math.abs(d)), (f, p) => { const s = tp(subject, f), r = rightOf(from, s); return { pos: add(from, mul(r, d * p * (c.intensity ?? 1))), look: s }; }, 40, [subject]);
/** approach (arrives and settles) / depart (starts still, accelerates away) along a straight line */
export const approach = (c: Common, from: V3, to: V3, look: Target) => make("approach", { accel: 0.25, decel: 0.5, ...c }, endF(c, dist(from, to)), (f, p) => ({ pos: lerp3(from, to, p), look: tp(look, f) }), 35, [look]);
export const depart = (c: Common, from: V3, to: V3, look: Target) => make("depart", { accel: 0.5, decel: 0.25, ...c }, endF(c, dist(from, to)), (f, p) => ({ pos: lerp3(from, to, p), look: tp(look, f) }), 35, [look]);
/** foreground-to-background reveal: the camera starts tucked behind a foreground object (which fills part of the frame),
 *  slides sideways + forward past it while focus racks from the foreground to the subject */
export const fgReveal = (c: Common, fg: V3, subject: Target, side: number, d: number) => {
  const f1 = endF(c, Math.abs(side) + d * 0.3);
  const cc: Common = { ease: "cine", focal: 32, focusOn: [fg, subject], rack: [0.25, 0.75], ...c };
  return make("fgReveal", cc, f1, (f, p) => { const s = tp(subject, f), ax = norm(sub(fg, s)), start = add(fg, mul(ax, 0.9)), r = norm(cross(ax, [0, 1, 0]));
    return { pos: add(add(start, mul(r, side * p)), mul(ax, -d * 0.3 * p)), look: lerp3(lerp3(fg, s, 0.75), s, p) }; }, 32, [subject]);
};
/** pass around an object: arc on a circle of radius r around `around` (clearance included) while aiming at `subject` */
export const passAround = (c: Common, around: V3, r: number, a0: number, a1: number, y: number, subject: Target) =>
  make("passAround", { ease: "sine", ...c }, endF(c, Math.abs(a1 - a0) * r), (f, p) => { const a = lerp(a0, a1, p); return { pos: [around[0] + Math.sin(a) * r, y, around[2] + Math.cos(a) * r], look: tp(subject, f) }; }, 30, [subject]);

// ---------------------------------------------------------------- subject-following moves
/** subject heading from its motion (smoothed over +-`win` frames so steps do not wiggle the camera) */
export const headingOf = (s: Target, f: number, win = 12): number => {
  const a = tp(s, f - win), b = tp(s, f + win), v = sub(b, a); return Math.hypot(v[0], v[2]) < 1e-4 ? NaN : Math.atan2(v[0], v[2]);
};
/** Gaussian-smoothed subject position (deterministic low-pass; a pure function of the frame) */
export const smoothed = (s: Target, f: number, sigma = 6): V3 => {
  if (typeof s !== "function" || sigma <= 0) return tp(s, f); const R = Math.ceil(sigma * 2.5); let w = 0, x = 0, y = 0, z = 0;
  for (let i = -R; i <= R; i++) { const k = Math.exp(-((i / sigma) ** 2) / 2), q = s(f + i); w += k; x += q[0] * k; y += q[1] * k; z += q[2] * k; }
  return [x / w, y / w, z / w];
};
export type FollowRig = {
  subject: Target;
  /** camera offset in the subject's heading frame: [right, up, back] metres */
  offset: V3;
  /** aim offset from the subject (e.g. chest height) */
  aim?: V3;
  /** 0..1 how strongly the camera follows (1 = locked to the smoothed subject, 0.4 = lazy) */
  strength?: number;
  /** frames of prediction: aim where the subject WILL be (keeps leading room in front of a walker) */
  lead?: number;
  /** smoothing sigma (frames) for position and heading: larger = steadier */
  sigma?: number;
  /** fixed heading (radians) instead of following the subject's heading (side-tracking along a straight path) */
  heading?: number;
  /** the subject's facing (radians) per frame - used as its heading when known (stable when it stops walking) */
  facing?: (f: number) => number;
};
/** heading as a Gaussian-weighted average of unit vectors (angle-wrap safe, smooth through turns and stops) */
const smoothHeading = (r: FollowRig, f: number, sig: number) => {
  if (r.heading !== undefined) return r.heading;
  // travel direction (speed-weighted, so stops do not count); standing still -> the last direction it moved in
  if (typeof r.subject === "function") { const s = r.subject, R = Math.ceil(sig * 2.5);
    for (const dirn of [-1, 1]) for (let back = 0; back <= 300; back += 6) { const g = f + dirn * back; let x = 0, z = 0; for (let i = -R; i <= R; i++) { const k = Math.exp(-((i / sig) ** 2) / 2), a = s(g + i), b = s(g + i + 1); x += (b[0] - a[0]) * k; z += (b[2] - a[2]) * k; }
      if (Math.hypot(x, z) > 2e-3 * sig) return Math.atan2(x, z); } }
  if (r.facing) { const R = Math.ceil(sig * 2.5); let x = 0, z = 0; for (let i = -R; i <= R; i++) { const k = Math.exp(-((i / sig) ** 2) / 2), a = r.facing(f + i); x += Math.sin(a) * k; z += Math.cos(a) * k; } return Math.atan2(x, z); }
  const h = headingOf(r.subject, f, Math.max(6, sig * 2)); return Number.isFinite(h) ? h : 0;
};
const followPose = (r: FollowRig, f: number, anchor: V3) => {
  const sig = r.sigma ?? 8, s = smoothed(r.subject, f, sig), lead = r.lead ?? 0, ahead = smoothed(r.subject, f + lead, sig);
  const h = smoothHeading(r, f, Math.max(8, sig * 1.5));
  const fw: V3 = [Math.sin(h), 0, Math.cos(h)], rt: V3 = [Math.cos(h), 0, -Math.sin(h)], k = clamp01(r.strength ?? 1);
  const at = lerp3(anchor, s, k), pos = add(add(add(at, mul(rt, r.offset[0])), [0, r.offset[1], 0]), mul(fw, -r.offset[2]));
  return { pos, look: add(lerp3(anchor, ahead, k), r.aim ?? [0, 1.1, 0]) };
};
/** tracking shot: the camera travels with the subject at a fixed offset in the subject's frame */
export const track = (c: Common, r: FollowRig) => { const f1 = c.f1 ?? c.f0 + 120, anchor = tp(r.subject, c.f0); return make("track", c, f1, (f) => followPose(r, f, anchor), 35, [r.subject]); };
/** side-tracking: the camera runs parallel to the subject's path, `d` metres to its side */
export const sideTrack = (c: Common, subject: Target, d: number, heading?: number, h = 1.2, facing?: (f: number) => number) => track({ ...c }, { subject, offset: [d, h, 0], aim: [0, 1.0, 0], heading, facing, lead: 10 });
/** follow camera: behind (or in front of) the subject, lagging slightly (strength < 1), leading the aim */
export const follow = (c: Common, subject: Target, back = 3.2, up = 1.5, side = 0.6, facing?: (f: number) => number) => track(c, { subject, offset: [side, up, back], aim: [0, 1.1, 0], strength: 0.92, lead: 14, sigma: 10, facing });
/** dynamic action-following: wider framing, more prediction, stronger heading smoothing so turns read as arcs */
export const actionFollow = (c: Common, subject: Target, back = 4.5, up = 1.8, side = 1.6, facing?: (f: number) => number) => track({ focal: 28, ...c }, { subject, offset: [side, up, back], aim: [0, 1.0, 0], strength: 0.85, lead: 22, sigma: 12, facing });

// ---------------------------------------------------------------- large-scale / environmental moves
/** aerial-style move: a straight flight line at altitude, banking gently through any curvature, aim blending from the
 *  ground ahead to the target. `bank` scales the roll (aircraft feel) - keep small. */
export const aerial = (c: Common, a: V3, b: V3, alt: number, target: Target, bank = 0.04) => {
  const f1 = endF(c, dist(a, b));
  return make("aerial", { ease: "sine", focal: 24, ...c }, f1, (f, p) => { const pos = add(lerp3(a, b, p), [0, alt, 0]), ahead = add(lerp3(a, b, clamp01(p + 0.3)), [0, 0, 0]);
    return { pos, look: lerp3(ahead, tp(target, f), ease("sine", p)), roll: bank * Math.sin(Math.PI * p) }; }, 24, [target]);
};
/** establishing shot: very wide, high, a slow drift sideways + a slight rise (the world exists, the camera discovers it) */
export const establishing = (c: Common, target: Target, az: number, el = 0.18, d = 60, drift = 0.08) =>
  rig("establishing", { accel: 0.2, decel: 0.2, focal: 24, ...c }, { target, az: [az - drift / 2, az + drift / 2], el: [el, el + 0.03], d: [d, d * 0.97] }, 24);
/** hold with breathing: an almost-static frame that pushes 2-4 % over its length (keeps a long dialogue shot alive) */
export const hold = (c: Common, target: Target, az: number, el: number, d: number, breathe = 0.03) => rig("hold", { ease: "linear", ...c }, { target, az, el, d: [d, d * (1 - breathe)] });
/** POV: camera at an eye position looking at a target (the character's view) */
export const pov = (c: Common, eye: Target, at: Target) => make("pov", { focal: 30, handheld: 0.006, ...c }, c.f1 ?? c.f0 + 90, (f) => ({ pos: tp(eye, f), look: tp(at, f) }), 30, [at]);

/** distance a shot's camera travels (for speed / QC reports) */
export const pathLength = (s: Shot, step = 1) => { let L = 0; for (let f = s.f0; f < s.f1; f += step) L += dist(s.at(f).pos, s.at(f + step).pos); return L; };
/** helper for the angle system: azimuth from a subject toward a camera */
export const azFrom = (subject: V3, cam: V3) => azel(sub(cam, subject)).az;
export { len };
