// Lighting 2.0 laboratory: presets on populated World 2.0 sets, old-vs-new comparisons on IDENTICAL scene + camera,
// material response (dry / wet), character lighting setups, shadow quality, water + reflections, and a moving-camera
// time-of-day clip for the stability (flicker) check. Frame index = demo index (C2LightLab); C2LightMove = clip.
import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import "../world";
import { buildWorld, type EnvKind } from "../world";
import { World2, worldPracticals } from "../world/World2";
import { Stage2 } from "../light/Stage2";
import { LIGHT_PRESETS, SETUPS, type Quality } from "../light/presets";
import { timeLapse } from "../light/director";
import { surfaceMaterial, SURFACES, type Surface } from "../light/materials";
import { Toon2Lit } from "../light/Toon2Lit";
import { Puddle } from "../light/Light2";
import type { LightSpec } from "../light/model";
import { evaluate as evalChar } from "../../../char/tf2/planner";
import { TF2_HERO } from "../../../char/tf2/costume";
import { LIGHTING } from "../../enhance/lightingPresets";
import { CentSet, type Mood } from "../../../productions/centennial/Set";
import * as C from "../cam";

type Demo = { title: string; env: EnvKind; light?: LightSpec; old?: Mood; q?: Quality; view?: "default" | "close" | "materials" | "shadow"; setup?: keyof typeof SETUPS; wet?: boolean };
const L = LIGHT_PRESETS;
export const LIGHT_DEMOS: Demo[] = [
  { title: "Bright daylight", env: "cityStreet", light: L.brightDaylight }, { title: "Golden hour", env: "cityStreet", light: L.goldenHour }, { title: "Beautiful sunrise", env: "countryside", light: L.beautifulSunrise },
  { title: "Overcast daylight", env: "historicTown", light: L.overcastDaylight }, { title: "Blue hour", env: "historicTown", light: L.blueHour }, { title: "Moonlit night", env: "countryside", light: L.moonlitNight },
  { title: "City night (practical lights)", env: "cityStreet", light: L.cityNight }, { title: "Rainy street (wet surfaces)", env: "cityStreet", light: L.rainyStreet }, { title: "Foggy environment", env: "harbor", light: L.foggyEnvironment },
  { title: "Stormy atmosphere", env: "constructionSite", light: L.stormyAtmosphere }, { title: "Construction site (dusty sun)", env: "constructionSite", light: L.constructionSite }, { title: "Interior warm", env: "residentialInterior", light: L.interiorWarm },
  { title: "Industrial factory", env: "factory", light: L.industrialFactory }, { title: "Warehouse (cold interior)", env: "warehouse", light: L.interiorCold }, { title: "Harbour + water reflections", env: "harbor", light: L.harborShips }, { title: "Waterfront golden hour", env: "waterfront", light: L.goldenHour },
  { title: "OLD lighting: goldenHour Mood", env: "cityStreet", old: LIGHTING.goldenHour }, { title: "NEW Lighting 2.0: Golden Hour", env: "cityStreet", light: L.goldenHour },
  { title: "OLD lighting: overcast Mood", env: "historicTown", old: LIGHTING.overcast }, { title: "NEW Lighting 2.0: Overcast", env: "historicTown", light: L.overcastDaylight },
  { title: "OLD lighting: blueHour Mood", env: "cityStreet", old: LIGHTING.blueHour }, { title: "NEW Lighting 2.0: City night", env: "cityStreet", light: L.cityNight },
  { title: "OLD lighting: tungstenInterior Mood", env: "residentialInterior", old: LIGHTING.tungstenInterior }, { title: "NEW Lighting 2.0: Interior warm", env: "residentialInterior", light: L.interiorWarm },
  { title: "Materials: dry", env: "cityStreet", light: L.cinematicDocumentary, view: "materials" }, { title: "Materials: wet (rain)", env: "cityStreet", light: L.rainyStreet, view: "materials", wet: true },
  { title: "Character: three-point", env: "historicTown", light: L.cinematicDocumentary, view: "close", setup: "threePoint" }, { title: "Character: dramatic side", env: "historicTown", light: L.cinematicDocumentary, view: "close", setup: "dramaticSide" },
  { title: "Character: backlight + rim", env: "historicTown", light: L.goldenHour, view: "close", setup: "backlight" }, { title: "Character: soft frontal", env: "historicTown", light: L.overcastDaylight, view: "close", setup: "softFrontal" },
  { title: "Character: warm / cool contrast", env: "historicTown", light: L.blueHour, view: "close", setup: "warmCool" }, { title: "Character: silhouette", env: "historicTown", light: L.goldenHour, view: "close", setup: "silhouette" },
  { title: "Shadows: LOW profile (1k, no SSAO, contact blobs)", env: "constructionSite", light: L.cinematicDocumentary, q: "LOW", view: "shadow" }, { title: "Shadows: CINEMATIC (4k soft, 16-sample SSAO)", env: "constructionSite", light: L.cinematicDocumentary, q: "CINEMATIC", view: "shadow" },
];
export const LIGHT_LAB_FRAMES = LIGHT_DEMOS.length;
const worlds = new Map<string, ReturnType<typeof buildWorld>>();
const getWorld = (env: EnvKind) => { let w = worlds.get(env); if (!w) { w = buildWorld(env, "STANDARD", 7); worlds.set(env, w); } return w; };
const Label: React.FC<{ t: string; s?: string }> = ({ t, s }) => <div style={{ position: "absolute", top: "4%", width: "100%", textAlign: "center", fontFamily: "sans-serif", color: "white", textShadow: "0 2px 6px #000" }}><div style={{ fontSize: 26, fontWeight: 700 }}>{t}</div>{s && <div style={{ fontSize: 15 }}>{s}</div>}</div>;
const MATS = Object.keys(SURFACES).filter((s) => s !== "emissive") as Surface[];
const Materials: React.FC<{ wet: boolean; at: C.V3 }> = ({ wet, at }) => <group position={at}>{MATS.map((s, i) => { const x = (i % 5) * 0.9 - 1.8, z = Math.floor(i / 5) * 0.9 - 0.9;
  return <group key={s} position={[x, 0, z]}><mesh position={[0, 0.25, 0]} castShadow receiveShadow material={surfaceMaterial(s, { wet: wet ? 1 : 0 })}><boxGeometry args={[0.5, 0.5, 0.5]} /></mesh><mesh position={[0, 0.72, 0]} castShadow material={surfaceMaterial(s, { wet: wet ? 1 : 0, variant: 1 })}><sphereGeometry args={[0.22, 28, 18]} /></mesh></group>; })}
  {wet && <><Puddle at={[-1, 0, 1.4]} r={0.6} /><Puddle at={[1.2, 0, 1.2]} r={0.45} /></>}</group>;
export const LightLab: React.FC = () => {
  const f = useCurrentFrame(), d = LIGHT_DEMOS[f % LIGHT_DEMOS.length], { recipe, world } = getWorld(d.env);
  const subj = recipe.subject, hero = useMemo(() => evalChar({ ...{ id: "h", seed: 3, costume: TF2_HERO, actions: [], emotions: [{ f: 0, mix: [{ e: "curiosity", level: 2 }] }] }, start: [subj[0], subj[2]], facing: Math.atan2(recipe.cam.pos[0] - subj[0], recipe.cam.pos[2] - subj[2]) + 0.4 } as never, 40, recipe.cam.pos), [d.env]);
  let pos = recipe.cam.pos, look = recipe.cam.look, focal = 28;
  if (d.view === "close") { const fr = C.solveFrame({ id: "h", base: subj, height: 1.55, facing: hero.facing, kind: "character" }, { size: "MCU", v: "eye", h: "threeQuarter", focal: 50 }); pos = fr.pos; look = fr.look; focal = 50; }
  if (d.view === "materials") { pos = C.add(subj, [2.2, 2.4, 4.6]); look = C.add(subj, [0.2, 0.5, 0.6]); focal = 32; }
  if (d.view === "shadow") { pos = C.add(subj, [3, 2.2, 5]); look = C.add(subj, [-1, 0.6, -2]); focal = 30; }
  const camAz = Math.atan2(pos[0] - subj[0], pos[2] - subj[2]);
  const spec0 = d.light ?? L.cinematicDocumentary, spec1 = d.setup ? SETUPS[d.setup].apply(spec0, camAz) : spec0, interior = ["residentialInterior", "factory", "warehouse"].includes(d.env);
  const light: LightSpec = { ...spec1, practicals: [...spec1.practicals, ...worldPracticals(world, spec1, interior)] };
  const cam = C.toRender({ pos, look, focal, focus: C.dist(pos, look), fstop: d.view === "close" ? 2.8 : 8, roll: 0 });
  const scene = (hi: boolean, l: LightSpec) => <>
    <World2 recipe={recipe} world={world} f={90} cam={cam.pos} shot={[{ pos: cam.pos, look: cam.look, fov: cam.fov }]} light={l} hi={hi} quality={d.q ?? "BALANCED"} walkers={false} />
    {d.view !== "materials" && <Toon2Lit p={{ fr: { ...hero, pos: [subj[0], subj[1], subj[2]] }, costume: TF2_HERO, t: 40 }} cam={cam.pos} hi={hi} light={l} />}
    {d.view === "materials" && <Materials wet={!!d.wet} at={C.add(subj, [0, 0, 0.6])} />}</>;
  if (d.old) { const m = d.old; return <AbsoluteFill><CentSet c={{ pos: cam.pos, look: cam.look, fov: cam.fov, focus: cam.focus, dof: 0.05 }} m={m} f={90} world={({ hi }) => scene(hi, { ...L.cinematicDocumentary, practicals: [] })} /><Label t={d.title} s="approved CentSet + Post (Mood): unchanged pipeline" /></AbsoluteFill>; }
  return <AbsoluteFill><Stage2 cam={cam} light={light} f={90} quality={d.q ?? "BALANCED"} focus={subj} shadowSize={d.view === "close" ? 8 : 24} world={({ hi, light: l }) => scene(hi, l)} /><Label t={d.title} s={`${light.name} | ${Math.round(light.keyK)} K key | exposure ${light.exposure.toFixed(2)} | ${d.q ?? "BALANCED"}${d.setup ? ` | ${d.setup}` : ""}`} /></AbsoluteFill>;
};
/** stability clip: the camera dollies down the street while the light moves from golden hour to dusk (flicker QC) */
export const LIGHT_MOVE_FRAMES = 180;
export const LightMove: React.FC = () => {
  const f = useCurrentFrame(), { recipe, world } = getWorld("cityStreet"), t = f / (LIGHT_MOVE_FRAMES - 1), u = t * t * (3 - 2 * t);
  const pos: C.V3 = [6 - 9 * u, 1.65 + 0.3 * u, 1.2 - 0.4 * u], look: C.V3 = [-6 - 6 * u, 2.0, -4.2], spec = timeLapse(19.0, 21.3, t);
  const light: LightSpec = { ...spec, practicals: worldPracticals(world, spec) }, cam = C.toRender({ pos, look, focal: 28, focus: 9, fstop: 8, roll: 0 });
  return <AbsoluteFill><Stage2 cam={cam} light={light} f={f} quality="BALANCED" focus={recipe.subject} shadowSize={26} world={({ hi, light: l }) => <World2 recipe={recipe} world={world} f={f} cam={cam.pos} shot={[{ pos: [6, 1.65, 1.2], look, fov: cam.fov }, { pos: [-3, 1.95, 0.8], look, fov: cam.fov }]} light={l} hi={hi} />} /></AbsoluteFill>;
};
