// Lighting 2.0 director: chooses and adapts a lighting design per scene from what the scene IS (location, interior or
// exterior, time of day, weather), what it is ABOUT (main subject kind, emotion of the story beat) and where the camera
// looks from. Keeps adjacent scenes consistent (exposure / white balance changes limited unless the time or place
// changes), never auto-exposes during a camera move, and explains every decision.
import { LIGHT_PRESETS, SETUPS, natural, withWeather, type LightPresetName, type Weather } from "./presets";
import { mixRGB, kelvin, hex, clamp, type LightSpec, type Practical } from "./model";
import type { V3 } from "./model";

export type Location = "street" | "city" | "construction" | "harbor" | "factory" | "warehouse" | "historicTown" | "interior" | "countryside" | "forest" | "desert" | "tunnel" | "station" | "waterfront" | "studio";
export type SceneLightBrief = { id: string; location: Location; hour?: number; weather?: Weather; interior?: boolean; emotion?: string; subjectKind?: "character" | "structure" | "object" | "vehicle"; camAz?: number; practicals?: Practical[]; preset?: LightPresetName; setup?: keyof typeof SETUPS };
export type LightDecision = { id: string; spec: LightSpec; why: string[] };

const BASE: Partial<Record<Location, LightPresetName>> = { construction: "constructionSite", harbor: "harborShips", waterfront: "harborShips", factory: "industrialFactory", warehouse: "industrialFactory", historicTown: "historicalArchitecture", interior: "interiorWarm", forest: "forestLighting", desert: "desertSunlight", tunnel: "tunnelLighting", studio: "objectPresentation" };
const EMO_SETUP: Record<string, keyof typeof SETUPS | undefined> = { mystery: "lowKey", suspense: "dramaticSide", sadness: "softFrontal", grandeur: "architectural", importance: "keyFillRim", surprise: undefined, comedy: "highKey", excitement: "documentary", calm: "softFrontal" };

/** decide one scene's lighting */
export const lightScene = (b: SceneLightBrief): LightDecision => {
  const why: string[] = []; let spec: LightSpec;
  if (b.preset) { spec = LIGHT_PRESETS[b.preset]; why.push(`preset ${b.preset} requested`); }
  else if (b.interior || b.location === "interior" || b.location === "tunnel" || b.location === "factory" || b.location === "warehouse") { const p = BASE[b.location] ?? "interiorWarm"; spec = LIGHT_PRESETS[p]; why.push(`interior location ${b.location} -> ${p}`); }
  else if (b.hour !== undefined) {
    spec = natural({ hour: b.hour, name: `${b.location} ${b.hour.toFixed(1)}h`, profile: b.location === "historicTown" ? "historical" : undefined, haze: b.location === "harbor" || b.location === "waterfront" ? 1.6 : b.location === "construction" ? 1.3 : 1 });
    why.push(`exterior at ${b.hour.toFixed(1)} h -> sun elevation drives colour (${Math.round(spec.keyK)} K), intensity and sky`);
    if (b.location === "construction") { spec = withWeather(spec, "dust", 0.3); why.push("construction site: light dust in the air (haze + sun scatter)"); }
  } else { const p = BASE[b.location] ?? "cinematicDocumentary"; spec = LIGHT_PRESETS[p]; why.push(`location ${b.location} -> ${p}`); }
  if (b.weather && b.weather !== spec.weather && b.weather !== "clear") { spec = withWeather(spec, b.weather); why.push(`weather ${b.weather}: ${b.weather === "rain" ? "wet surfaces, soft key, denser haze" : b.weather === "fog" ? "reduced visibility, soft contrast" : b.weather === "storm" ? "dark sky, high contrast, wet" : "modified atmosphere"}`); }
  // story emotion -> lighting setup relative to the camera (only when the scene is about a character or object)
  const setupName = b.setup ?? (b.subjectKind && b.subjectKind !== "structure" ? EMO_SETUP[b.emotion ?? ""] : b.subjectKind === "structure" ? "architectural" : undefined);
  if (setupName) { spec = SETUPS[setupName].apply(spec, b.camAz ?? 0); why.push(`${b.emotion ?? "scene"} -> ${setupName} setup (${SETUPS[setupName].note})`); }
  if (b.practicals?.length) { spec = { ...spec, practicals: [...spec.practicals, ...b.practicals] }; why.push(`${b.practicals.length} practical light sources from the set`); }
  // readability floor for characters: the face must stay readable without blowing out (face glow 0.7..0.95)
  if (b.subjectKind === "character") { const fg = clamp(spec.character.faceGlow, 0.7, 0.95); if (fg !== spec.character.faceGlow) why.push(`character readability: face glow ${spec.character.faceGlow.toFixed(2)} -> ${fg.toFixed(2)}`); spec = { ...spec, character: { ...spec.character, faceGlow: fg } }; }
  return { id: b.id, spec, why };
};
/**
 * Light a sequence of scenes with continuity: when two adjacent scenes share location and roughly the time of day, the
 * exposure change is limited to 1/3 stop and white balance to 400 K, so cuts / dissolves do not jump in brightness or
 * colour. Different places or times are allowed to differ (that difference is the story).
 */
export const lightSequence = (briefs: SceneLightBrief[]): LightDecision[] => {
  const out: LightDecision[] = [];
  for (const b of briefs) { const d = lightScene(b), prev = out[out.length - 1], pb = briefs[out.length - 1];
    if (prev && pb && pb.location === b.location && Math.abs((pb.hour ?? 12) - (b.hour ?? 12)) < 1.5 && pb.interior === b.interior) {
      const maxE = Math.pow(2, 1 / 3), e = clamp(d.spec.exposure, prev.spec.exposure / maxE, prev.spec.exposure * maxE), wk = clamp(d.spec.whiteK, prev.spec.whiteK - 400, prev.spec.whiteK + 400);
      if (Math.abs(e - d.spec.exposure) > 1e-3 || Math.abs(wk - d.spec.whiteK) > 1) d.why.push(`continuity with ${prev.id}: exposure ${d.spec.exposure.toFixed(2)} -> ${e.toFixed(2)}, white balance ${Math.round(d.spec.whiteK)} -> ${Math.round(wk)} K`);
      d.spec = { ...d.spec, exposure: e, whiteK: wk }; }
    out.push(d); }
  return out;
};
/** time-of-day transition inside one continuous shot: sunrise -> day, day -> sunset, sunset -> night (pure function of t) */
export const timeLapse = (h0: number, h1: number, t: number, o: { weather?: Weather; cloud?: number } = {}) => { const s = natural({ hour: h0 + (h1 - h0) * clamp(t, 0, 1), cloud: o.cloud }); return o.weather ? withWeather(s, o.weather) : s; };
/** exterior -> interior (or back) lighting transition spec at t (the camera passes a doorway) */
export const doorway = (outside: LightSpec, inside: LightSpec, t: number) => { const k = clamp(t, 0, 1), s = k * k * (3 - 2 * k); return { ...inside, ...mixInOut(outside, inside, s) }; };
import { mixSpec } from "./model";
const mixInOut = (a: LightSpec, b: LightSpec, t: number) => mixSpec(a, b, t);
/** camera-aware character fill: keeps a low-angle shot from darkening the face (a small boost, not auto-exposure) */
export const characterAssist = (spec: LightSpec, camPos: V3, faceAt: V3) => { const up = (faceAt[1] - camPos[1]) / Math.max(0.5, Math.hypot(faceAt[0] - camPos[0], faceAt[2] - camPos[2]));
  return { ...spec.character, faceGlow: clamp(spec.character.faceGlow + clamp(up, 0, 0.6) * 0.08, 0.7, 0.95), tint: mixRGB(spec.character.tint, kelvin(spec.keyK), 0.3) }; };
export { hex };
