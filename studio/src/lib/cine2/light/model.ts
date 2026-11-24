// Lighting 2.0 model: colour science helpers, a physically motivated sun / sky / moon model, the LightSpec that fully
// describes a scene's lighting, and smooth (linear-light) blending between specs for time-of-day / weather transitions.
// All of it is plain data + pure functions: deterministic, frame-pure, cheap.
export type RGB = [number, number, number];   // LINEAR rgb
export type V3 = [number, number, number];
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------- colour
export const srgbToLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const linToSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
export const hex = (h: string): RGB => { const n = parseInt(h.replace("#", ""), 16); return [srgbToLin(((n >> 16) & 255) / 255), srgbToLin(((n >> 8) & 255) / 255), srgbToLin((n & 255) / 255)]; };
export const toHex = (c: RGB) => "#" + c.map((v) => Math.round(clamp(linToSrgb(clamp(v, 0, 1)), 0, 1) * 255).toString(16).padStart(2, "0")).join("");
export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const scaleRGB = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
export const luminance = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
/** black-body colour temperature (K) -> linear RGB normalised to luminance 1 (Tanner Helland fit, then linearised) */
export const kelvin = (K: number): RGB => {
  const t = clamp(K, 1000, 40000) / 100; let r: number, g: number, b: number;
  r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c: RGB = [srgbToLin(clamp(r, 0, 255) / 255), srgbToLin(clamp(g, 0, 255) / 255), srgbToLin(clamp(b, 0, 255) / 255)];
  return scaleRGB(c, 1 / Math.max(1e-4, luminance(c)));
};
/** white-balance gains that neutralise a light of temperature K (camera set to K), with a green/magenta tint */
export const whiteBalance = (K: number, tint = 0, strength = 0.45): RGB => {
  // partial correction (like a cinematographer keeping tungsten warm / moonlight cool): gains are blended toward 1 by
  // `strength`, clamped, and renormalised to keep luminance (white balance must never change exposure)
  const c = kelvin(K), w = kelvin(6500), g: RGB = [w[0] / c[0], (w[1] / c[1]) * (1 + tint * 0.1), w[2] / c[2]].map((v) => clamp(1 + (v - 1) * strength, 0.75, 1.35)) as RGB;
  const L = luminance(g); return [g[0] / L, g[1] / L, g[2] / L];
};

// ---------------------------------------------------------------- sun / sky / moon
/** sun direction (TOWARD the sun, y up, +z = south-ish "front" of a set) from the hour of day; latitude in degrees,
 *  day of year 1..365; `northDeg` rotates the compass so a set can face any way */
export const sunDir = (hour: number, lat = 48, day = 172, northDeg = 0): { dir: V3; el: number; az: number } => {
  const decl = (23.44 * Math.PI) / 180 * Math.sin(((2 * Math.PI) / 365) * (day - 81)), L = (lat * Math.PI) / 180, H = ((hour - 12) * 15 * Math.PI) / 180;
  const el = Math.asin(Math.sin(L) * Math.sin(decl) + Math.cos(L) * Math.cos(decl) * Math.cos(H));
  let az = Math.atan2(-Math.sin(H), Math.tan(decl) * Math.cos(L) - Math.sin(L) * Math.cos(H));   // 0 = south, + = west
  az += (northDeg * Math.PI) / 180;
  return { dir: [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)], el, az };
};
/** sunlight colour temperature from elevation: ~1900 K at the horizon, ~5600 K high (Rayleigh reddening via air mass) */
export const sunKelvin = (el: number) => { const e = Math.max(-0.05, el); return 1900 + 3700 * (1 - Math.exp(-Math.max(0, e) * 6.5)); };
/** direct-sun intensity factor from elevation (air-mass extinction, fades to 0 just below the horizon) */
export const sunStrength = (el: number) => { if (el < -0.08) return 0; const am = 1 / (Math.max(0.02, Math.sin(Math.max(0.01, el))) + 0.15 * Math.pow(Math.max(0.01, (el * 180) / Math.PI) + 3.885, -1.253)); return clamp(Math.pow(0.7, Math.pow(am, 0.678)) / 0.7, 0, 1) * clamp((el + 0.08) / 0.1, 0, 1); };
/** sky (zenith), horizon and ground bounce colours (linear) for a sun elevation and overcast factor 0..1 */
export const skyColors = (el: number, cloud = 0): { zenith: RGB; horizon: RGB; ground: RGB } => {
  const day = clamp((el + 0.1) / 0.5, 0, 1), dusk = Math.exp(-Math.pow((el - 0.02) / 0.12, 2));
  let zen = mixRGB(hex("#0b1226"), hex("#5d8fd6"), day), hor = mixRGB(hex("#1a2238"), hex("#cfe0f0"), day);
  hor = mixRGB(hor, hex("#f2a66a"), dusk * 0.75); zen = mixRGB(zen, hex("#6c6ea8"), dusk * 0.35);
  const grey = mixRGB(hex("#2a2e36"), hex("#c6ccd2"), day); zen = mixRGB(zen, grey, cloud * 0.85); hor = mixRGB(hor, grey, cloud * 0.8);
  return { zenith: zen, horizon: hor, ground: mixRGB(hex("#1a1612"), hex("#7a6c5a"), day) };
};

// ---------------------------------------------------------------- the light spec
export type Practical = { id: string; kind: "street" | "window" | "headlight" | "ship" | "warning" | "neon" | "lamp" | "candle" | "fire" | "screen" | "work" | "tunnel";
  pos: V3; color: RGB; lumens: number; range: number; dir?: V3; angle?: number; flicker?: number; poolRadius?: number; importance?: number; /** 0..1 dimmer (night lamps fading in at dusk) */ level?: number };
export type LightSpec = {
  name: string;
  /** direct key: sun or moon (one shadow-casting directional light) */
  key: { dir: V3; color: RGB; intensity: number; shadow: boolean; softness: number };
  /** sky fill (hemisphere) + flat ambient floor (keeps shadow detail; never pure black) */
  sky: { top: RGB; bottom: RGB; intensity: number }; ambient: number;
  /** image-based lighting: procedural room environment or a library HDRI, with intensity and yaw */
  env: { source: "room" | "hdri"; hdri?: string; intensity: number; rotation: number };
  /** optional extra non-shadow directionals (bounce / motivated fill / rim), relative to world */
  extras: { dir: V3; color: RGB; intensity: number; role: "fill" | "rim" | "bounce" }[];
  /** atmosphere (rendered in Post2 from depth): exp height fog + atmospheric perspective + sun in-scatter */
  fog: { color: RGB; density: number; heightBase: number; heightFalloff: number; start: number; sunScatter: number; skyFog: number };
  godRays: number; dust: number;
  /** exposure (fixed per scene - never auto-adapts during camera moves) and colour profile */
  exposure: number; profile: string; whiteK: number;
  /** optional blend of grade profiles (name -> weight); when set it overrides `profile` so the grade changes continuously */
  profileW?: Record<string, number>;
  background: RGB;
  /** surfaces: 0 dry .. 1 soaked (roughness / albedo modifiers, puddle reflections) */
  wet: number;
  weather: "clear" | "cloudy" | "rain" | "fog" | "mist" | "storm" | "dust" | "snow" | "night";
  practicals: Practical[];
  /** character integration: face glow (emissive fill of the approved face mask), environment tint, rim strength */
  character: { faceGlow: number; tint: RGB; rim: number; rimColor: RGB; albedo: number };
  /** the light's colour temperature for documentation / director continuity */
  keyK: number;
  notes?: string;
};
/** blend two specs in LINEAR light (no colour switching at t = 0.5): every numeric property and colour interpolates,
 *  directions slerp; categorical fields switch at the midpoint. Practicals cross-fade by intensity. */
export const mixSpec = (a: LightSpec, b: LightSpec, t: number): LightSpec => {
  const n = (x: number, y: number) => lerp(x, y, t), c = (x: RGB, y: RGB) => mixRGB(x, y, t), pick = <T,>(x: T, y: T) => (t < 0.5 ? x : y);
  const dir = (x: V3, y: V3): V3 => { const m: V3 = [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)], l = Math.hypot(...m) || 1; return [m[0] / l, m[1] / l, m[2] / l]; };
  const ex = Math.max(a.extras.length, b.extras.length);
  return {
    name: t < 0.5 ? a.name : b.name, key: { dir: dir(a.key.dir, b.key.dir), color: c(a.key.color, b.key.color), intensity: n(a.key.intensity, b.key.intensity), shadow: a.key.shadow || b.key.shadow, softness: n(a.key.softness, b.key.softness) },
    sky: { top: c(a.sky.top, b.sky.top), bottom: c(a.sky.bottom, b.sky.bottom), intensity: n(a.sky.intensity, b.sky.intensity) }, ambient: n(a.ambient, b.ambient),
    env: { ...pick(a.env, b.env), intensity: n(a.env.intensity, b.env.intensity), rotation: n(a.env.rotation, b.env.rotation) },
    extras: Array.from({ length: ex }, (_, i) => { const x = a.extras[i] ?? { ...b.extras[i], intensity: 0 }, y = b.extras[i] ?? { ...a.extras[i], intensity: 0 }; return { dir: dir(x.dir, y.dir), color: c(x.color, y.color), intensity: n(x.intensity, y.intensity), role: pick(x.role, y.role) }; }),
    fog: { color: c(a.fog.color, b.fog.color), density: Math.exp(lerp(Math.log(a.fog.density + 1e-6), Math.log(b.fog.density + 1e-6), t)), heightBase: n(a.fog.heightBase, b.fog.heightBase), heightFalloff: n(a.fog.heightFalloff, b.fog.heightFalloff), start: n(a.fog.start, b.fog.start), sunScatter: n(a.fog.sunScatter, b.fog.sunScatter), skyFog: n(a.fog.skyFog, b.fog.skyFog) },
    godRays: n(a.godRays, b.godRays), dust: n(a.dust, b.dust), exposure: Math.exp(lerp(Math.log(a.exposure), Math.log(b.exposure), t)), profile: pick(a.profile, b.profile), profileW: (() => { const w: Record<string, number> = {}; for (const [x, k] of [[a, 1 - t], [b, t]] as [LightSpec, number][]) for (const [nm, v] of Object.entries(x.profileW ?? { [x.profile]: 1 })) w[nm] = (w[nm] ?? 0) + v * k; return w; })(), whiteK: n(a.whiteK, b.whiteK),
    background: c(a.background, b.background), wet: n(a.wet, b.wet), weather: pick(a.weather, b.weather),
    practicals: [...a.practicals.map((p) => ({ ...p, lumens: p.lumens * (1 - t) })), ...b.practicals.map((p) => ({ ...p, id: p.id + "~b", lumens: p.lumens * t }))].filter((p) => p.lumens > 1e-3),
    character: { faceGlow: n(a.character.faceGlow, b.character.faceGlow), tint: c(a.character.tint, b.character.tint), rim: n(a.character.rim, b.character.rim), rimColor: c(a.character.rimColor, b.character.rimColor), albedo: n(a.character.albedo, b.character.albedo) },
    keyK: n(a.keyK, b.keyK), notes: t < 0.5 ? a.notes : b.notes,
  };
};
export { clamp, lerp };
