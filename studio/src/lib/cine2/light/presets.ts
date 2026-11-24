// Lighting 2.0 presets: natural light from time of day, weather modifiers, 25 production presets, 14 lighting setups
// (key/fill/rim configurations relative to the camera), colour profiles and quality profiles. Every value is a working
// parameter consumed by Light2 + Post2 (no name-only presets).
import { mixSpec, hex, kelvin, mixRGB, scaleRGB, sunDir, sunKelvin, sunStrength, skyColors, clamp, type LightSpec, type RGB, type V3, type Practical } from "./model";

export type Weather = LightSpec["weather"];
export type NaturalOpts = { hour: number; lat?: number; day?: number; north?: number; cloud?: number; weather?: Weather; name?: string; profile?: string; exposure?: number; haze?: number; hdri?: string };
/** natural daylight / twilight / moonlight for an hour of day (the backbone of the outdoor presets) */
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
/** natural light at any hour, CONTINUOUS in time: the day (sun) and night (moon) rigs cross-fade around el -0.04..-0.16 and
 *  exposure / grade blend smoothly, so a time-lapse never pops (the old version switched exposure, key and grade in one frame) */
export const natural = (o: NaturalOpts): LightSpec => {
  const el = sunDir(o.hour, o.lat ?? 48, o.day ?? 172, o.north ?? 0).el, w = sstep(-0.04, -0.16, el);
  if (w <= 0) return naturalOne(o, false); if (w >= 1) return naturalOne(o, true);
  const m = mixSpec(naturalOne(o, false), naturalOne(o, true), w); return { ...m, name: o.name ?? `natural ${o.hour.toFixed(1)} h` };
};
const naturalOne = (o: NaturalOpts, night: boolean): LightSpec => {
  const s = sunDir(o.hour, o.lat ?? 48, o.day ?? 172, o.north ?? 0), cloud = clamp(o.cloud ?? 0, 0, 1), el = s.el;
  const day = clamp((el + 0.1) / 0.5, 0, 1), sk = skyColors(el, cloud);
  const sunK = sunKelvin(el), sunC = kelvin(sunK), str = sunStrength(el) * (1 - 0.82 * cloud);
  const moonDir: V3 = (() => { const m: V3 = [-s.dir[0] * 0.6, 0.62, -s.dir[2] * 0.6 + 0.3], l = Math.hypot(...m); return [m[0] / l, m[1] / l, m[2] / l]; })();
  const key = night ? { dir: moonDir, color: mixRGB(kelvin(4100), hex("#9fb6ff"), 0.45), intensity: 0.42 * (1 - 0.7 * cloud), shadow: true, softness: 2.5 }
    : { dir: el < 0.05 ? [s.dir[0], Math.max(0.05, s.dir[1]), s.dir[2]] as V3 : s.dir, color: sunC, intensity: 3.0 * str, shadow: str > 0.05, softness: 1 + cloud * 6 };
  const dusk = Math.exp(-Math.pow((el - 0.03) / 0.14, 2));
  const haze = o.haze ?? 1, fogC = mixRGB(sk.horizon, scaleRGB(sunC, 0.9), dusk * 0.35);
  return {
    name: o.name ?? `natural ${o.hour.toFixed(1)} h`, key,
    sky: { top: sk.zenith, bottom: sk.ground, intensity: night ? 0.32 : 0.3 + 0.75 * day + 0.35 * cloud }, ambient: night ? 0.05 : 0.03 + 0.03 * cloud,
    env: { source: o.hdri ? "hdri" : "room", hdri: o.hdri, intensity: night ? 0.12 : 0.18 + 0.32 * day, rotation: 0 },
    extras: night ? [] : [{ dir: [-key.dir[0], 0.25, -key.dir[2]], color: mixRGB(sk.ground, sk.horizon, 0.5), intensity: 0.22 * day * (1 - cloud * 0.5), role: "bounce" }],
    fog: { color: night ? hex("#0e1422") : fogC, density: (0.0012 + 0.0025 * dusk) * haze * (1 + cloud), heightBase: 0, heightFalloff: 0.035, start: 4, sunScatter: night ? 0 : 0.25 + 0.9 * dusk, skyFog: 0.35 },
    godRays: 0, dust: 0,
    exposure: o.exposure ?? (night ? 1.62 : lerpN(1.04 + 0.16 * dusk + 0.12 * cloud, 1.42, sstep(0.07, -0.03, el))), profile: o.profile ?? (night ? "night" : dusk > 0.5 ? "golden" : "documentary"),
    profileW: o.profile || night ? undefined : { golden: sstep(0.3, 0.7, dusk), documentary: 1 - sstep(0.3, 0.7, dusk) },
    whiteK: night ? 4300 : clamp(sunK + 1100, 4600, 6000), background: mixRGB(sk.horizon, sk.zenith, 0.35), wet: 0, weather: o.weather ?? (night ? "night" : cloud > 0.5 ? "cloudy" : "clear"),
    practicals: [], character: { faceGlow: night ? 0.95 : 0.8, tint: mixRGB(sk.zenith, sk.horizon, 0.5), rim: 0.15 + dusk * 0.4, rimColor: night ? hex("#9fb6ff") : sunC, albedo: night ? 0.8 : 0.84 },
    keyK: night ? 4100 : sunK,
  };
};
/** weather modifiers (applied on top of any spec; all smooth numbers so weather can transition) */
export const withWeather = (s: LightSpec, w: Weather, amt = 1): LightSpec => {
  const k = clamp(amt, 0, 1), m = (a: number, b: number) => a + (b - a) * k, c = (a: RGB, b: RGB) => mixRGB(a, b, k);
  const r: LightSpec = JSON.parse(JSON.stringify(s)); r.weather = w;
  const grey = mixRGB(s.sky.top, hex("#9aa2aa"), 0.7);
  switch (w) {
    case "cloudy": r.key.intensity = m(s.key.intensity, s.key.intensity * 0.3); r.key.softness = m(s.key.softness, 6); r.sky.intensity = m(s.sky.intensity, s.sky.intensity * 1.25); r.sky.top = c(s.sky.top, grey); r.exposure = m(s.exposure, s.exposure * 1.1); r.profile = "overcast"; break;
    case "rain": r.key.intensity = m(s.key.intensity, s.key.intensity * 0.18); r.key.softness = m(s.key.softness, 8); r.sky.top = c(s.sky.top, hex("#5e6670")); r.wet = m(s.wet, 1); r.fog.density = m(s.fog.density, s.fog.density * 4 + 0.004); r.fog.color = c(s.fog.color, hex("#7c858e")); r.exposure = m(s.exposure, s.exposure * 1.18); r.profile = "rain"; break;
    case "fog": r.key.intensity = m(s.key.intensity, s.key.intensity * 0.35); r.fog.density = m(s.fog.density, 0.028); r.fog.heightFalloff = m(s.fog.heightFalloff, 0.03); r.fog.color = c(s.fog.color, hex("#c8ccd0")); r.fog.skyFog = m(s.fog.skyFog, 0.95); r.fog.start = m(s.fog.start, 1); r.exposure = m(s.exposure, s.exposure * 1.06); r.profile = "fog"; break;
    case "mist": r.fog.density = m(s.fog.density, 0.035); r.fog.heightFalloff = m(s.fog.heightFalloff, 0.6); r.fog.heightBase = m(s.fog.heightBase, 0); r.fog.color = c(s.fog.color, mixRGB(s.fog.color, hex("#dfe6ea"), 0.6)); r.godRays = m(s.godRays, 0.35); break;
    case "storm": r.key.intensity = m(s.key.intensity, s.key.intensity * 0.12); r.sky.top = c(s.sky.top, hex("#2c323a")); r.sky.intensity = m(s.sky.intensity, s.sky.intensity * 0.7); r.wet = m(s.wet, 1); r.fog.density = m(s.fog.density, s.fog.density * 5 + 0.006); r.fog.color = c(s.fog.color, hex("#3e454c")); r.exposure = m(s.exposure, s.exposure * 1.3); r.profile = "storm"; break;
    case "dust": r.fog.color = c(s.fog.color, hex("#d8b88a")); r.fog.density = m(s.fog.density, s.fog.density * 6 + 0.004); r.fog.sunScatter = m(s.fog.sunScatter, 1.3); r.godRays = m(s.godRays, 0.55); r.dust = m(s.dust, 1); r.key.color = c(s.key.color, mixRGB(s.key.color, hex("#ffd9a0"), 0.5)); break;
    case "snow": r.sky.bottom = c(s.sky.bottom, hex("#e8eef4")); r.sky.intensity = m(s.sky.intensity, s.sky.intensity * 1.3); r.fog.color = c(s.fog.color, hex("#e4e9ee")); r.fog.density = m(s.fog.density, s.fog.density * 4 + 0.003); r.exposure = m(s.exposure, s.exposure * 0.92); r.whiteK = m(s.whiteK, 6200); r.profile = "snow"; break;
    case "night": case "clear": break;
  }
  return r;
};
const P = (pos: V3, kind: Practical["kind"], K: number, lumens: number, range: number, extra: Partial<Practical> = {}): Practical => ({ id: `${kind}@${pos.join(",")}`, kind, pos, color: kelvin(K), lumens, range, poolRadius: range * 0.45, importance: 0.5, ...extra });
/** an interior base: low sky fill, a soft window key, room environment, tungsten or fluorescent practicals */
const interior = (name: string, K: number, practicals: Practical[], window: number, profile: string, exposure: number): LightSpec => ({
  name, key: { dir: [0.55, 0.45, 0.7], color: kelvin(6200), intensity: window, shadow: true, softness: 4 }, sky: { top: kelvin(K), bottom: scaleRGB(kelvin(K), 0.4), intensity: 0.32 }, ambient: 0.05,
  env: { source: "room", intensity: 0.32, rotation: 0 }, extras: [{ dir: [-0.5, 0.6, -0.3], color: kelvin(K), intensity: 0.35, role: "fill" }],
  fog: { color: scaleRGB(kelvin(K), 0.08), density: 0.004, heightBase: 0, heightFalloff: 0.05, start: 2, sunScatter: 0.4, skyFog: 0 }, godRays: 0, dust: 0.25,
  exposure, profile, whiteK: K + 400, background: scaleRGB(kelvin(K), 0.05), wet: 0, weather: "clear", practicals, character: { faceGlow: 0.88, tint: kelvin(K), rim: 0.2, rimColor: kelvin(K), albedo: 0.82 }, keyK: K,
});
const with_ = (s: LightSpec, o: Partial<LightSpec>): LightSpec => ({ ...s, ...o });

/** the 25 production presets */
export const LIGHT_PRESETS: Record<string, LightSpec> = {
  cinematicDocumentary: natural({ hour: 10.2, name: "Cinematic Documentary", profile: "documentary" }),
  goldenHour: with_(natural({ hour: 19.35, name: "Golden Hour", profile: "golden", haze: 1.4 }), { name: "Golden Hour", godRays: 0.25 }),
  beautifulSunrise: with_(withWeather(natural({ hour: 5.45, name: "Beautiful Sunrise", profile: "golden", haze: 1.6 }), "mist", 0.35), { name: "Beautiful Sunrise", godRays: 0.35 }),
  brightDaylight: natural({ hour: 13, name: "Bright Daylight", profile: "clean" }),
  overcastDaylight: withWeather(natural({ hour: 12, cloud: 0.9, name: "Overcast Daylight" }), "cloudy"),
  dramaticSunset: with_(natural({ hour: 20.45, name: "Dramatic Sunset", profile: "golden", haze: 1.8 }), { name: "Dramatic Sunset", godRays: 0.45 }),
  blueHour: with_(natural({ hour: 21.6, name: "Blue Hour", profile: "blueHour" }), { name: "Blue Hour", practicals: [] }),
  moonlitNight: natural({ hour: 0.5, name: "Moonlit Night", profile: "night" }),
  cityNight: with_(natural({ hour: 23, name: "City Night", profile: "night", exposure: 1.5 }), { name: "City Night", notes: "practical-driven: street lamps / windows / signs carry the scene (add practicals from the set)" }),
  industrialFactory: with_(interior("Industrial Factory", 4200, [], 1.4, "industrial", 1.38), { key: { dir: [0.12, 0.98, 0.18], color: kelvin(6000), intensity: 1.5, shadow: true, softness: 6 }, godRays: 0.3, dust: 0.6, fog: { color: hex("#4a4844"), density: 0.012, heightBase: 0, heightFalloff: 0.04, start: 3, sunScatter: 0.6, skyFog: 0 } }),
  constructionSite: with_(withWeather(natural({ hour: 10.6, name: "Construction Site", profile: "documentary" }), "dust", 0.35), { name: "Construction Site" }),
  historicalArchitecture: with_(natural({ hour: 16.6, name: "Historical Architecture", profile: "historical", haze: 1.3 }), { name: "Historical Architecture" }),
  interiorWarm: interior("Interior Warm Lighting", 2900, [], 0.9, "warmInterior", 1.42),
  interiorCold: with_(interior("Cold Interior Lighting", 4800, [], 0.6, "coldInterior", 1.3), { extras: [{ dir: [0, 1, 0], color: mixRGB(kelvin(4800), hex("#d8ffe8"), 0.12), intensity: 0.9, role: "fill" }] }),
  foggyEnvironment: withWeather(natural({ hour: 9, cloud: 0.6, name: "Foggy Environment" }), "fog"),
  rainyStreet: with_(withWeather(natural({ hour: 18.2, cloud: 0.9, name: "Rainy Street" }), "rain"), { name: "Rainy Street" }),
  stormyAtmosphere: withWeather(natural({ hour: 15, cloud: 1, name: "Stormy Atmosphere" }), "storm"),
  desertSunlight: with_(withWeather(natural({ hour: 14.2, lat: 30, name: "Desert Sunlight", profile: "desert" }), "dust", 0.3), { name: "Desert Sunlight", extras: [{ dir: [0, -1, 0.1], color: hex("#d6a970"), intensity: 0.35, role: "bounce" }] }),
  forestLighting: with_(withWeather(natural({ hour: 11, name: "Forest Lighting", profile: "forest" }), "mist", 0.4), { name: "Forest Lighting", extras: [{ dir: [0.1, 0.4, -0.2], color: hex("#6f9a52"), intensity: 0.3, role: "bounce" }], godRays: 0.45 }),
  harborShips: with_(natural({ hour: 17.6, name: "Harbor and Ship Lighting", profile: "harbor", haze: 1.6 }), { name: "Harbor and Ship Lighting" }),
  tunnelLighting: with_(interior("Tunnel Lighting", 2200, [], 0.0, "tunnel", 1.55), { ambient: 0.03, sky: { top: kelvin(2200), bottom: scaleRGB(kelvin(2200), 0.2), intensity: 0.12 }, env: { source: "room", intensity: 0.08, rotation: 0 }, key: { dir: [0, 1, 0], color: kelvin(2200), intensity: 0, shadow: false, softness: 1 } }),
  dramaticCharacter: with_(natural({ hour: 17.8, name: "Dramatic Character Lighting", profile: "lowKey" }), { name: "Dramatic Character Lighting", sky: { ...natural({ hour: 17.8 }).sky, intensity: 0.35 }, ambient: 0.02, character: { faceGlow: 0.72, tint: hex("#b0a090"), rim: 0.55, rimColor: hex("#ffc890"), albedo: 0.84 } }),
  objectPresentation: with_(interior("Object Presentation Lighting", 5200, [], 1.6, "clean", 1.15), { key: { dir: [0.45, 0.75, 0.5], color: kelvin(5200), intensity: 1.8, shadow: true, softness: 7 }, extras: [{ dir: [-0.6, 0.4, 0.5], color: kelvin(5600), intensity: 0.6, role: "fill" }, { dir: [0, 0.4, -1], color: kelvin(6500), intensity: 1.1, role: "rim" }], fog: { color: hex("#20201e"), density: 0, heightBase: 0, heightFalloff: 0.05, start: 5, sunScatter: 0, skyFog: 0 } }),
  cinematicSilhouette: with_(natural({ hour: 20.5, name: "Cinematic Silhouette", profile: "golden", haze: 2.2, exposure: 0.92 }), { name: "Cinematic Silhouette", ambient: 0.01, sky: { ...natural({ hour: 20.5 }).sky, intensity: 0.25 }, godRays: 0.6, character: { faceGlow: 0.35, tint: hex("#2a1a14"), rim: 0.9, rimColor: hex("#ffb070"), albedo: 0.6 } }),
  epicEnvironmentReveal: with_(withWeather(natural({ hour: 7.6, name: "Epic Environment Reveal", profile: "epic", haze: 1.8 }), "mist", 0.3), { name: "Epic Environment Reveal", godRays: 0.4 }),
};
// interior presets get their motivated practicals by default (the set can add more)
LIGHT_PRESETS.interiorWarm.practicals = [P([1.5, 1.6, -1], "lamp", 2700, 600, 6), P([-2, 2.4, 1], "lamp", 2800, 450, 6)];
LIGHT_PRESETS.interiorCold.practicals = [P([0, 3, 0], "work", 5000, 900, 9, { dir: [0, -1, 0], angle: 1.1 })];
LIGHT_PRESETS.tunnelLighting.practicals = [0, 1, 2, 3].map((i) => P([0, 3.2, -i * 8], "tunnel", 2100, 500, 9));
LIGHT_PRESETS.industrialFactory.practicals = [P([-4, 6, -2], "work", 2100, 1400, 14, { dir: [0, -1, 0], angle: 0.9 }), P([5, 6, -6], "work", 4100, 1100, 14, { dir: [0, -1, 0], angle: 0.9 })];
export type LightPresetName = keyof typeof LIGHT_PRESETS;

// ---------------------------------------------------------------- lighting setups (relative to the camera)
const rotY = (v: V3, a: number): V3 => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
const dirFrom = (camAz: number, relAz: number, el: number): V3 => rotY([0, Math.sin(el), Math.cos(el)], camAz + relAz);
export const SETUPS: Record<string, { note: string; apply: (s: LightSpec, camAz: number) => LightSpec }> = {
  threePoint: { note: "key 40 deg off-axis high, fill opposite at ~1/3, rim from behind", apply: (s, a) => ({ ...s, key: { ...s.key, dir: dirFrom(a, 0.7, 0.6) }, extras: [{ dir: dirFrom(a, -0.9, 0.3), color: s.sky.top, intensity: s.key.intensity * 0.3, role: "fill" }, { dir: dirFrom(a, Math.PI - 0.4, 0.5), color: s.key.color, intensity: s.key.intensity * 0.55, role: "rim" }], character: { ...s.character, rim: 0.45 } }) },
  keyFillRim: { note: "classic portrait ratio 4:1 with a warm rim", apply: (s, a) => SETUPS.threePoint.apply({ ...s, key: { ...s.key, color: mixRGB(s.key.color, kelvin(4800), 0.3) } }, a) },
  dramaticSide: { note: "hard 90-degree side key, almost no fill (half the face in shadow, but never black: ambient floor)", apply: (s, a) => ({ ...s, key: { ...s.key, dir: dirFrom(a, 1.5, 0.35), softness: 0.8 }, extras: [], sky: { ...s.sky, intensity: s.sky.intensity * 0.45 }, ambient: Math.max(0.02, s.ambient * 0.6) }) },
  backlight: { note: "key behind the subject toward the camera: glowing edges, soft front fill", apply: (s, a) => ({ ...s, key: { ...s.key, dir: dirFrom(a, Math.PI - 0.25, 0.3) }, extras: [{ dir: dirFrom(a, 0, 0.2), color: s.sky.top, intensity: s.key.intensity * 0.25, role: "fill" }], character: { ...s.character, rim: 0.7 } }) },
  silhouette: { note: "bright background, subject unlit from the front", apply: (s, a) => ({ ...LIGHT_PRESETS.cinematicSilhouette, key: { ...LIGHT_PRESETS.cinematicSilhouette.key, dir: dirFrom(a, Math.PI, 0.12) } }) },
  softFrontal: { note: "large soft source near the lens: flattering, low contrast", apply: (s, a) => ({ ...s, key: { ...s.key, dir: dirFrom(a, 0.2, 0.35), softness: 9 }, sky: { ...s.sky, intensity: s.sky.intensity * 1.15 } }) },
  window: { note: "single soft key from one side (a window), warm interior fill bounce", apply: (s, a) => ({ ...s, key: { ...s.key, dir: dirFrom(a, 1.1, 0.4), color: kelvin(6300), softness: 5 }, extras: [{ dir: dirFrom(a, -1.2, 0.1), color: kelvin(3200), intensity: s.key.intensity * 0.18, role: "bounce" }] }) },
  top: { note: "overhead key (industrial / interrogation): deep eye sockets, used sparingly", apply: (s) => ({ ...s, key: { ...s.key, dir: [0.05, 1, 0.08] } }) },
  lowKey: { note: "mostly shadow, one motivated key, deep but detailed blacks", apply: (s, a) => ({ ...SETUPS.dramaticSide.apply(s, a), exposure: s.exposure * 0.9, profile: "lowKey" }) },
  highKey: { note: "bright, soft, low contrast (clean, optimistic)", apply: (s, a) => ({ ...SETUPS.softFrontal.apply(s, a), exposure: s.exposure * 1.12, sky: { ...s.sky, intensity: s.sky.intensity * 1.35 }, profile: "clean" }) },
  warmCool: { note: "warm key vs cool fill (sunset outside, sky fill in the shadows)", apply: (s, a) => ({ ...s, key: { ...s.key, color: kelvin(3200) }, extras: [{ dir: dirFrom(a, -1, 0.5), color: kelvin(9000), intensity: s.key.intensity * 0.35, role: "fill" }] }) },
  architectural: { note: "grazing side light that rakes the facade: texture and relief", apply: (s, a) => ({ ...s, key: { ...s.key, dir: dirFrom(a, 1.25, 0.32), softness: 1 } }) },
  industrial: { note: "high cool skylight key + warm sodium practicals and haze", apply: (s) => ({ ...s, key: { ...s.key, dir: [0.15, 0.97, 0.2], color: kelvin(6000) }, fog: { ...s.fog, density: Math.max(s.fog.density, 0.01) }, godRays: Math.max(s.godRays, 0.3) }) },
  documentary: { note: "naturalistic, motivated, gentle 3/4 key", apply: (s, a) => ({ ...s, key: { ...s.key, dir: dirFrom(a, 0.85, Math.max(0.35, Math.asin(Math.max(-1, Math.min(1, s.key.dir[1]))))) } }) },
};

// ---------------------------------------------------------------- colour profiles (Post2 grade parameters)
export type Profile = { contrast: number; saturation: number; lift: number; warmCool: number; vignette: number; gain: RGB; gamma: number; bloom: number; threshold: number };
/** weighted blend of grade profiles (a continuous grade for time-lapses and lighting transitions) */
export const blendProfiles = (w: Record<string, number>): Profile => { const e = Object.entries(w).filter(([n, v]) => v > 1e-4 && PROFILES[n]), tot = e.reduce((a, [, v]) => a + v, 0) || 1;
  const o: Profile = { contrast: 0, saturation: 0, lift: 0, warmCool: 0, vignette: 0, gain: [0, 0, 0], gamma: 0, bloom: 0, threshold: 0 };
  if (!e.length) return PROFILES.documentary;
  for (const [n, v] of e) { const p = PROFILES[n], k = v / tot; for (const f of ["contrast", "saturation", "lift", "warmCool", "vignette", "gamma", "bloom", "threshold"] as const) o[f] += p[f] * k; o.gain = [o.gain[0] + p.gain[0] * k, o.gain[1] + p.gain[1] * k, o.gain[2] + p.gain[2] * k]; }
  return o; };
export const PROFILES: Record<string, Profile> = {
  documentary: { contrast: 1.07, saturation: 1.05, lift: 0.01, warmCool: 0.45, vignette: 0.3, gain: [1, 1, 1], gamma: 1, bloom: 0.3, threshold: 1.6 },
  clean: { contrast: 1.04, saturation: 1.02, lift: 0.008, warmCool: 0.3, vignette: 0.2, gain: [1, 1, 1], gamma: 1, bloom: 0.25, threshold: 1.7 },
  golden: { contrast: 1.08, saturation: 1.1, lift: 0.012, warmCool: 0.6, vignette: 0.34, gain: [1.03, 1, 0.95], gamma: 1, bloom: 0.38, threshold: 1.55 },
  blueHour: { contrast: 1.06, saturation: 1.04, lift: 0.014, warmCool: 0.8, vignette: 0.38, gain: [0.97, 1, 1.05], gamma: 1, bloom: 0.42, threshold: 1.5 },
  night: { contrast: 1.1, saturation: 0.96, lift: 0.016, warmCool: 0.85, vignette: 0.42, gain: [0.96, 1, 1.06], gamma: 1, bloom: 0.45, threshold: 1.5 },
  overcast: { contrast: 1.05, saturation: 0.95, lift: 0.012, warmCool: 0.4, vignette: 0.26, gain: [1, 1, 1.01], gamma: 1, bloom: 0.22, threshold: 1.8 },
  rain: { contrast: 1.08, saturation: 0.9, lift: 0.014, warmCool: 0.7, vignette: 0.36, gain: [0.98, 1, 1.04], gamma: 1, bloom: 0.4, threshold: 1.55 },
  fog: { contrast: 1.02, saturation: 0.9, lift: 0.018, warmCool: 0.4, vignette: 0.3, gain: [1, 1, 1.02], gamma: 1, bloom: 0.3, threshold: 1.7 },
  storm: { contrast: 1.12, saturation: 0.85, lift: 0.012, warmCool: 0.75, vignette: 0.45, gain: [0.97, 1, 1.03], gamma: 1, bloom: 0.3, threshold: 1.7 },
  snow: { contrast: 1.04, saturation: 0.95, lift: 0.01, warmCool: 0.5, vignette: 0.25, gain: [0.98, 1, 1.03], gamma: 1, bloom: 0.25, threshold: 1.9 },
  historical: { contrast: 1.05, saturation: 0.88, lift: 0.018, warmCool: 0.55, vignette: 0.38, gain: [1.04, 1, 0.92], gamma: 1.02, bloom: 0.3, threshold: 1.6 },
  industrial: { contrast: 1.1, saturation: 0.92, lift: 0.012, warmCool: 0.6, vignette: 0.38, gain: [1.02, 1, 0.96], gamma: 1, bloom: 0.36, threshold: 1.55 },
  warmInterior: { contrast: 1.06, saturation: 1.04, lift: 0.014, warmCool: 0.25, vignette: 0.4, gain: [1, 1, 1], gamma: 1, bloom: 0.38, threshold: 1.6 },
  coldInterior: { contrast: 1.05, saturation: 0.94, lift: 0.012, warmCool: 0.5, vignette: 0.32, gain: [0.99, 1.01, 1.02], gamma: 1, bloom: 0.28, threshold: 1.7 },
  tunnel: { contrast: 1.1, saturation: 1, lift: 0.016, warmCool: 0.3, vignette: 0.46, gain: [1, 1, 1], gamma: 1, bloom: 0.45, threshold: 1.5 },
  desert: { contrast: 1.06, saturation: 1.06, lift: 0.01, warmCool: 0.5, vignette: 0.3, gain: [1.03, 1, 0.94], gamma: 1, bloom: 0.3, threshold: 1.6 },
  forest: { contrast: 1.07, saturation: 1.06, lift: 0.012, warmCool: 0.45, vignette: 0.34, gain: [0.99, 1.02, 0.97], gamma: 1, bloom: 0.32, threshold: 1.6 },
  harbor: { contrast: 1.06, saturation: 1.04, lift: 0.012, warmCool: 0.6, vignette: 0.32, gain: [1.01, 1, 0.99], gamma: 1, bloom: 0.34, threshold: 1.6 },
  lowKey: { contrast: 1.14, saturation: 1.0, lift: 0.006, warmCool: 0.55, vignette: 0.48, gain: [1, 1, 1], gamma: 1.03, bloom: 0.3, threshold: 1.6 },
  epic: { contrast: 1.08, saturation: 1.06, lift: 0.012, warmCool: 0.55, vignette: 0.34, gain: [1.02, 1, 0.97], gamma: 1, bloom: 0.36, threshold: 1.55 },
};

// ---------------------------------------------------------------- quality profiles (measured in light-bench)
export type Quality = "LOW" | "BALANCED" | "HIGH" | "CINEMATIC";
export const QUALITY: Record<Quality, { shadowMap: number; shadowType: "basic" | "pcf" | "pcfsoft"; aoSamples: number; aoStrength: number; ssPreview: number; ssFinal: number; godRaySamples: number; practicalBudget: number; postFog: boolean; contactShadows: boolean; envRes: number; note: string }> = {
  LOW: { shadowMap: 1024, shadowType: "pcf", aoSamples: 0, aoStrength: 0, ssPreview: 1, ssFinal: 1, godRaySamples: 0, practicalBudget: 2, postFog: true, contactShadows: true, envRes: 0.08, note: "maximum stability: no SSAO (contact blobs ground objects), small shadow map, 2 real practical lights" },
  BALANCED: { shadowMap: 2048, shadowType: "pcfsoft", aoSamples: 8, aoStrength: 0.55, ssPreview: 2, ssFinal: 1, godRaySamples: 0, practicalBudget: 4, postFog: true, contactShadows: true, envRes: 0.04, note: "recommended for production: 8-sample SSAO, soft 2k shadows, height fog, 4 real practical lights" },
  HIGH: { shadowMap: 2048, shadowType: "pcfsoft", aoSamples: 12, aoStrength: 0.65, ssPreview: 2, ssFinal: 1, godRaySamples: 24, practicalBudget: 6, postFog: true, contactShadows: true, envRes: 0.04, note: "12-sample SSAO (= approved Post), god rays (24 samples), 6 practical lights" },
  CINEMATIC: { shadowMap: 4096, shadowType: "pcfsoft", aoSamples: 16, aoStrength: 0.7, ssPreview: 2, ssFinal: 1, godRaySamples: 40, practicalBudget: 8, postFog: true, contactShadows: true, envRes: 0.03, note: "4k shadows, 16-sample SSAO, 40-sample god rays, 8 practical lights (slowest; still software-GL safe)" },
};
