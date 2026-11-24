// Performance benchmark compositions: the same populated city-street shot rendered with (a) the approved CentSet + Post
// pipeline (old lighting) and (b) Stage2 + Light2 + Post2 at each quality profile. Frame index = profile index.
import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import "../world";
import { buildWorld } from "../world";
import { World2, worldPracticals } from "../world/World2";
import { Stage2 } from "../light/Stage2";
import { LIGHT_PRESETS, type Quality } from "../light/presets";
import { toRender, sub } from "../cam";
import { CentSet, type Mood } from "../../../productions/centennial/Set";

export const BENCH_Q: Quality[] = ["LOW", "BALANCED", "HIGH", "CINEMATIC"];
const useCity = () => useMemo(() => buildWorld("cityStreet", "STANDARD", 7), []);
export const BenchNew: React.FC<{ q?: number }> = ({ q }) => {
  const f = useCurrentFrame(), quality = BENCH_Q[q ?? f % 4], { recipe, world } = useCity(), spec = LIGHT_PRESETS.goldenHour;
  const cam = toRender({ pos: recipe.cam.pos, look: recipe.cam.look, focal: 28, focus: Math.hypot(...sub(recipe.cam.look, recipe.cam.pos)), fstop: 8, roll: 0 });
  const light = { ...spec, practicals: worldPracticals(world, spec) };
  return <Stage2 cam={cam} light={light} f={60} quality={quality} focus={recipe.subject} shadowSize={24} world={({ hi, light: l }) => <World2 recipe={recipe} world={world} f={60} cam={cam.pos} shot={[{ pos: cam.pos, look: cam.look, fov: cam.fov }]} light={l} hi={hi} quality={quality} />} />;
};
/** the same world + camera through the approved pipeline (CentSet + Post, Mood lighting) = "old lighting" */
const OLD_MOOD: Mood = { bg: "#e8c8a0", sky: "#f2dcc0", ground: "#6a5a48", hemi: 0.75, env: 0.4, sun: { dir: [0.8, 0.28, 0.5], color: "#ffc890", i: 3.0, size: 24 }, exposure: 1.1, fog: { color: "#e6cfae", near: 120, far: 900 }, warmCool: 0.25, contrast: 1.1, threshold: 1.6 };
export const BenchOld: React.FC = () => {
  const { recipe, world } = useCity(), c = { pos: recipe.cam.pos, look: recipe.cam.look, fov: 56.6, focus: 8, dof: 0.05 };
  return <CentSet c={c} m={OLD_MOOD} f={60} world={({ hi }) => <World2 recipe={recipe} world={world} f={60} cam={c.pos} shot={[{ pos: c.pos, look: c.look, fov: c.fov }]} light={LIGHT_PRESETS.goldenHour} hi={hi} />} />;
};
