// Lighting 2.0 automated checks on a LightSpec (before rendering) and on a sequence of specs (transitions / flicker of
// the lighting values). Rendered-frame checks (luminance flicker, clipping, crushed shadows) run in
// scripts/light-frames-qc.py on the encoded clips.
import { LIGHT_PRESETS, PROFILES, QUALITY, type Quality } from "./presets";
import { luminance, type LightSpec } from "./model";
import { chooseReal } from "./Light2";
import { SURFACES, albedoRange, type Surface } from "./materials";
import * as THREE from "three";

export type LightIssue = { level: "error" | "warn"; msg: string };
const fin = (x: number) => Number.isFinite(x);
export const validateSpec = (s: LightSpec, q: Quality = "BALANCED"): LightIssue[] => {
  const out: LightIssue[] = [], e = (m: string) => out.push({ level: "error", msg: m }), w = (m: string) => out.push({ level: "warn", msg: m });
  const nums: [string, number][] = [["key.intensity", s.key.intensity], ["sky.intensity", s.sky.intensity], ["ambient", s.ambient], ["env.intensity", s.env.intensity], ["exposure", s.exposure], ["fog.density", s.fog.density], ["whiteK", s.whiteK]];
  for (const [k, v] of nums) if (!fin(v) || v < 0) e(`${k} invalid (${v})`);
  if (!s.key.dir.every(fin) || Math.abs(Math.hypot(...s.key.dir) - 1) > 0.02) e("key direction not a unit vector");
  if (s.key.dir[1] < -0.05 && s.key.intensity > 0.05) e("key light comes from below the horizon");
  if (s.key.intensity > 4.5) e(`key intensity ${s.key.intensity.toFixed(2)} too high (blown highlights)`);
  if (s.sky.intensity + s.ambient > 2.2) w(`fill ${(s.sky.intensity + s.ambient).toFixed(2)} very high (flat, washed out)`);
  if (s.ambient < 0.005 && s.sky.intensity < 0.1) w("no fill at all: shadows will be pure black");
  if (s.exposure < 0.6 || s.exposure > 2.4) e(`exposure ${s.exposure.toFixed(2)} out of range`);
  if (s.env.source === "hdri" && !s.env.hdri) e("HDRI environment selected but no file given");
  if (s.env.intensity <= 0.01 && s.weather !== "night") w("no environment lighting: metals / glass will look flat");
  if (!PROFILES[s.profile]) e(`unknown colour profile ${s.profile}`);
  if (s.fog.density > 0.06) w(`fog density ${s.fog.density} hides everything beyond ~${(3 / s.fog.density).toFixed(0)} m`);
  for (const c of [s.key.color, s.sky.top, s.sky.bottom, s.fog.color, s.background]) if (!c.every((v) => fin(v) && v >= 0)) e("invalid colour");
  for (const p of s.practicals) { if (!p.pos.every(fin) || p.lumens < 0 || p.range <= 0) e(`practical ${p.id} invalid`); if (p.flicker && p.flicker > 1) e(`practical ${p.id} flicker > 1 (strobing)`); }
  const real = chooseReal(s.practicals, [0, 1, 0], QUALITY[q].practicalBudget).length; if (real > QUALITY[q].practicalBudget) e("practical light budget exceeded");
  const lights = 2 + s.extras.length + real; if (lights > 12) e(`${lights} real lights: too many for software GL`); else if (lights > 8) w(`${lights} real lights`);
  if (s.character.faceGlow < 0.35 && s.profile !== "golden") w("face glow very low: character may be unreadable");
  if (s.character.faceGlow > 0.97) e("face glow > 0.97 blows out the face");
  return out;
};
/** frame-to-frame stability of a lighting function (time-of-day / weather transitions must not flicker or jump) */
export const lightStability = (at: (f: number) => LightSpec, f0: number, f1: number) => {
  let maxKey = 0, maxExp = 0, maxCol = 0, reversals = 0, lastSign = 0;
  for (let f = f0; f < f1; f++) { const a = at(f), b = at(f + 1);
    const dk = Math.abs(b.key.intensity - a.key.intensity), de = Math.abs(Math.log(b.exposure / a.exposure)), dc = Math.abs(luminance(b.key.color) - luminance(a.key.color)) + Math.hypot(...b.key.color.map((v, i) => v - a.key.color[i]));
    maxKey = Math.max(maxKey, dk); maxExp = Math.max(maxExp, de); maxCol = Math.max(maxCol, dc);
    const sg = Math.sign(Math.round((b.key.intensity - a.key.intensity) * 1e5)); if (sg && lastSign && sg !== lastSign) reversals++; if (sg) lastSign = sg; }
  return { maxKeyStep: maxKey, maxExposureStep: maxExp, maxColourStep: maxCol, reversals, ok: maxKey < 0.05 && maxExp < 0.01 && maxCol < 0.03 && reversals <= 1 };
};
/** materials: base albedo luminance inside the believable range per surface */
export const materialChecks = () => (Object.keys(SURFACES) as Surface[]).map((s) => { const c = new THREE.Color(SURFACES[s].color), L = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, [lo, hi] = albedoRange(s); return { s, L, ok: L >= lo && L <= hi }; });
export const allPresetIssues = (q: Quality = "BALANCED") => Object.entries(LIGHT_PRESETS).map(([k, v]) => ({ preset: k, issues: validateSpec(v, q) }));
