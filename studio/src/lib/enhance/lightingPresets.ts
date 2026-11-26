// Optional enhancement (off unless a scene imports it): ready-made lighting + grade presets in the existing CentSet
// `Mood` format (centennial/Set.tsx), so a new scene can pick a motivated, tested look instead of hand-tuning.
// They use only the approved post chain (src/lib/Post.tsx: SSAO, DOF, bloom, warm/cool grade): nothing is replaced.
// Bloom thresholds stay >= 1.5 so faces never blow out (locked visual rule).
import type { Mood } from "../../productions/centennial/Set";

export const LIGHTING: Record<string, Mood> = {
  /** low warm sun, long shadows, cool fill: exteriors with drama */
  goldenHour: { bg: "#e8c8a0", sky: "#f2dcc0", ground: "#6a5a48", hemi: 0.75, env: 0.4, sun: { dir: [0.8, 0.28, 0.5], color: "#ffc890", i: 3.0, size: 60 }, exposure: 1.1, fog: { color: "#e6cfae", near: 120, far: 900 }, warmCool: 0.25, contrast: 1.1, threshold: 1.6 },
  /** soft overcast daylight: even, gentle shadows, slightly desaturated */
  overcast: { bg: "#c4ccd4", sky: "#dde3e8", ground: "#7a7a72", hemi: 1.15, env: 0.55, sun: { dir: [0.3, 0.9, 0.3], color: "#f2f4f6", i: 1.4, size: 60 }, exposure: 1.12, fog: { color: "#c8d0d6", near: 90, far: 700 }, warmCool: 0.5, saturation: 0.94, ao: 0.75 },
  /** clear midday: crisp, high sun, neutral grade */
  midday: { bg: "#bcd4ea", sky: "#e2ecf6", ground: "#8a8270", hemi: 1.0, env: 0.45, sun: { dir: [0.35, 0.92, 0.3], color: "#fff4e4", i: 2.9, size: 60 }, exposure: 1.04, fog: { color: "#c9d8e6", near: 160, far: 1300 }, warmCool: 0.45 },
  /** 1940s interior: tungsten practicals, warm pools, deep vignette */
  tungstenInterior: { bg: "#2c2622", sky: "#e6d8c4", ground: "#4a3a2c", hemi: 0.55, env: 0.3, sun: { dir: [0.4, 0.6, -0.7], color: "#ffd8a8", i: 1.8, size: 10 }, exposure: 1.45, fog: { color: "#2c2622", near: 25, far: 110 }, warmCool: 0.15, vignette: 0.4, threshold: 1.7 },
  /** industrial hall: cool overhead skylight + sodium warmth, hazy depth */
  factoryHall: { bg: "#2a2c2e", sky: "#d8dce0", ground: "#5a5850", hemi: 0.75, env: 0.35, sun: { dir: [0.15, 1, 0.25], color: "#fff0d8", i: 1.6, size: 70 }, exposure: 1.4, fog: { color: "#4a4844", near: 60, far: 280 }, warmCool: 0.55 },
  /** blue-hour exterior: dim cool key, windows/practicals carry the scene */
  blueHour: { bg: "#1c2638", sky: "#5d6e98", ground: "#2e2620", hemi: 0.5, env: 0.3, sun: { dir: [0.25, 0.3, 1.0], color: "#8ea6dc", i: 0.95, size: 40 }, exposure: 1.38, fog: { color: "#1c2638", near: 40, far: 260 }, warmCool: 0.85, vignette: 0.38 },
  /** high aerial: thin outlines need low AO and long fog so tiny houses do not turn to scribble */
  aerial: { bg: "#c8d8e6", sky: "#e2ecf6", ground: "#8a8270", hemi: 1.0, env: 0.45, sun: { dir: [0.55, 0.55, 0.62], color: "#ffeed8", i: 2.8, size: 160 }, exposure: 1.05, fog: { color: "#c3d1de", near: 260, far: 1700 }, warmCool: 0.5, ao: 0.12, contrast: 1.04 },
};
/** blend two presets (numbers interpolate, colours switch at t = 0.5) for a gradual time-of-day change inside one shot */
export const mixMood = (a: Mood, b: Mood, t: number): Mood => {
  const n = (x: number | undefined, y: number | undefined) => x === undefined || y === undefined ? (t < 0.5 ? x : y) : x + (y - x) * t;
  const pick = <T,>(x: T, y: T) => (t < 0.5 ? x : y);
  return { bg: pick(a.bg, b.bg), sky: pick(a.sky, b.sky), ground: pick(a.ground, b.ground), hemi: n(a.hemi, b.hemi)!, env: n(a.env, b.env)!,
    sun: { dir: [n(a.sun.dir[0], b.sun.dir[0])!, n(a.sun.dir[1], b.sun.dir[1])!, n(a.sun.dir[2], b.sun.dir[2])!], color: pick(a.sun.color, b.sun.color), i: n(a.sun.i, b.sun.i)!, size: n(a.sun.size, b.sun.size), at: pick(a.sun.at, b.sun.at) },
    fog: a.fog && b.fog ? { color: pick(a.fog.color, b.fog.color), near: n(a.fog.near, b.fog.near)!, far: n(a.fog.far, b.fog.far)! } : pick(a.fog, b.fog),
    exposure: n(a.exposure, b.exposure)!, bloom: n(a.bloom, b.bloom), threshold: n(a.threshold, b.threshold), warmCool: n(a.warmCool, b.warmCool), vignette: n(a.vignette, b.vignette),
    contrast: n(a.contrast, b.contrast), saturation: n(a.saturation, b.saturation), ao: n(a.ao, b.ao) };
};
