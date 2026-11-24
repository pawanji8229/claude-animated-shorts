// Camera 2.0 core: vector helpers, the camera state, the virtual lens and the easing library.
// Everything is a pure function of numbers (no wall clock, no Math.random) so any frame can be evaluated alone, in any
// order, in any parallel render chunk, and always gives the same camera.
export type V3 = [number, number, number];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const clamp01 = (x: number) => clamp(x, 0, 1);
export const finite3 = (a: V3) => Number.isFinite(a[0]) && Number.isFinite(a[1]) && Number.isFinite(a[2]);
/** spherical offset: azimuth (0 = +z, toward +x positive), elevation (up positive), distance */
export const sph = (az: number, el: number, d: number): V3 => [Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d];
/** azimuth / elevation of a direction vector (inverse of sph) */
export const azel = (v: V3) => ({ az: Math.atan2(v[0], v[2]), el: Math.atan2(v[1], Math.hypot(v[0], v[2])), d: len(v) });
/** spherical interpolation of two directions (unit vectors) */
export const slerpDir = (a: V3, b: V3, t: number): V3 => {
  const c = clamp(dot(a, b), -1, 1), th = Math.acos(c);
  if (th < 1e-5) return norm(lerp3(a, b, t));
  const s = Math.sin(th); return norm(add(mul(a, Math.sin((1 - t) * th) / s), mul(b, Math.sin(t * th) / s)));
};

// ---------------------------------------------------------------- camera state + lens
/** the full camera state Camera 2.0 evaluates per frame */
export type CamState = {
  pos: V3; look: V3;
  /** focal length in mm (full-frame-diagonal equivalent for a 9:16 frame, see `fovFromFocal`) */
  focal: number;
  /** focus distance in metres */
  focus: number;
  /** aperture f-number (smaller = shallower depth of field) */
  fstop: number;
  /** camera roll in radians (dutch angle) */
  roll: number;
};
/** the PCam / Post parameters the existing renderer (CentSet + Post) consumes */
export type RenderCam = { pos: V3; look: V3; fov: number; focus: number; roll: number; dof: number; focusRange: number };

/** Vertical frame size of the virtual sensor (mm). The 9:16 frame is given the same DIAGONAL as a 36x24 full-frame
 *  sensor (43.27 mm), so "35 mm" or "85 mm" mean what a cinematographer expects: 9:16 frame = 21.2 x 37.7 mm. */
export const SENSOR_H = (43.267 * 16) / Math.hypot(9, 16), SENSOR_W = (43.267 * 9) / Math.hypot(9, 16);
/** vertical field of view (degrees) for a focal length (mm) */
export const fovFromFocal = (mm: number) => (2 * Math.atan(SENSOR_H / (2 * mm)) * 180) / Math.PI;
export const focalFromFov = (deg: number) => SENSOR_H / (2 * Math.tan((deg * Math.PI) / 360));
/** circle of confusion for the 9:16 frame (diagonal / 1500, the usual cinema criterion) */
export const COC_MM = 43.267 / 1500;
/** thin-lens depth of field: near / far limits of acceptable sharpness (metres) */
export const dofLimits = (focal: number, fstop: number, focus: number) => {
  const f = focal / 1000, c = COC_MM / 1000, H = (f * f) / (fstop * c) + f, s = Math.max(focus, f * 1.01);
  const near = (s * (H - f)) / (H + s - 2 * f), far = s >= H ? Infinity : (s * (H - f)) / (H - s);
  return { near, far, hyperfocal: H };
};
/**
 * Map the physical lens to the existing Post DOF parameters. The renderer's blur is a 2-level mip blend, so it cannot
 * show more than "soft" blur without artefacts: the strength is capped (MAX_BLUR) and the in-focus band never shrinks below
 * the subject depth (`minBand`), which keeps the important subject sharp (no excessive blur).
 */
export const MAX_BLUR = 0.32;
export const lensToPost = (focal: number, fstop: number, focus: number, minBand = 0.6) => {
  const { near, far } = dofLimits(focal, fstop, focus), band = Math.max(minBand, Math.min(far, focus * 6) - near);
  // blur strength ~ how fast the CoC grows past the band: proportional to aperture diameter / focus distance
  const aperture = focal / fstop / 1000, k = clamp((aperture / Math.max(0.3, focus)) * 9, 0, 1);
  return { focusRange: band, dof: MAX_BLUR * k };
};
export const toRender = (s: CamState, minBand?: number): RenderCam => { const p = lensToPost(s.focal, s.fstop, s.focus, minBand); return { pos: s.pos, look: s.look, fov: fovFromFocal(s.focal), focus: s.focus, roll: s.roll, dof: p.dof, focusRange: p.focusRange }; };
/** camera basis: forward, right, up (roll applied) */
export const basis = (s: { pos: V3; look: V3; roll?: number }) => {
  const fw = norm(sub(s.look, s.pos)); let rt = cross(fw, [0, 1, 0]); if (len(rt) < 1e-6) rt = [1, 0, 0]; rt = norm(rt); let up = cross(rt, fw);
  const r = s.roll ?? 0; if (r) { const c = Math.cos(r), sn = Math.sin(r); const rt2 = add(mul(rt, c), mul(up, sn)), up2 = add(mul(up, c), mul(rt, -sn)); rt = rt2; up = up2; }
  return { fw, rt, up };
};
/** project a world point to normalized device coords of a 9:16 frame: x,y in -1..1 (y up), z = depth along the view */
export const project = (s: { pos: V3; look: V3; roll?: number }, fovDeg: number, p: V3, aspect = 9 / 16) => {
  const { fw, rt, up } = basis(s), d = sub(p, s.pos), z = dot(d, fw), t = Math.tan((fovDeg * Math.PI) / 360);
  return { x: dot(d, rt) / (z * t * aspect), y: dot(d, up) / (z * t), z };
};

// ---------------------------------------------------------------- easing library
export type EaseName = "linear" | "sine" | "cubic" | "quint" | "expo" | "smoother" | "cine" | "settle" | "launch" | "land";
/** classic in-out curves plus three cinematic profiles:
 *  cine   = gentle start, long soft landing (an operator easing off the wheel),
 *  launch = accelerates away and keeps moving (start of a continuing move),
 *  land   = arrives moving and settles (end of a move that was already in motion),
 *  settle = quick smooth start, long deceleration (decisive push that lands softly, no overshoot) */
export const ease = (name: EaseName, t: number): number => {
  t = clamp01(t);
  switch (name) {
    case "linear": return t;
    case "sine": return 0.5 - 0.5 * Math.cos(Math.PI * t);
    case "cubic": return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case "quint": return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2;
    case "expo": return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
    case "smoother": return t * t * t * (t * (t * 6 - 15) + 10);
    case "cine": return trapezoid(t, 0.3, 0.55);
    case "launch": return trapezoid(t, 0.4, 0);
    case "land": return trapezoid(t, 0, 0.5);
    case "settle": return trapezoid(t, 0.14, 0.8);   // quick, smooth acceleration then a long settle (no overshoot, no jolt)
  }
};
/**
 * Smooth trapezoidal velocity profile, integrated in closed form: velocity ramps up with a sin^2 shape over the first
 * `acc` of the move, cruises, and ramps down over the last `dec`. Position is 0..1. acc/dec = 0 means the move starts /
 * ends at cruise speed (for chaining moves without a stop). Acceleration is continuous everywhere inside the move.
 */
export const trapezoid = (t: number, acc: number, dec: number): number => {
  t = clamp01(t); const a = clamp(acc, 0, 1), d = clamp(dec, 0, 1 - a), area = 1 - a / 2 - d / 2;
  let p: number;
  if (a > 0 && t < a) { const u = t / a; p = a * (u / 2 - Math.sin(Math.PI * u) / (2 * Math.PI)); }
  else if (d > 0 && t > 1 - d) { const u = (t - (1 - d)) / d; p = a / 2 + (1 - d - a) + d * (u / 2 + Math.sin(Math.PI * u) / (2 * Math.PI)); }
  else p = a / 2 + (t - a);
  return p / area;
};
/** asymmetric easing with explicit acceleration / deceleration fractions (0..1 of the duration) */
export const easeAD = (t: number, accel: number, decel: number) => trapezoid(t, accel, decel);

// ---------------------------------------------------------------- deterministic noise (handheld)
/** smooth deterministic 1D noise from a seeded sum of incommensurate sines (no state, frame-pure) */
export const wobble = (f: number, seed: number, hz = 0.35, fps = 30) => {
  const t = (f / fps) * hz * 2 * Math.PI, s = seed * 12.9898;
  return 0.5 * Math.sin(t + s) + 0.3 * Math.sin(t * 2.17 + s * 1.7) + 0.2 * Math.sin(t * 3.71 + s * 2.3);
};
