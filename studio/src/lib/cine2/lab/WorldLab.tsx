// World 2.0 laboratory: the ten environments, each as (0) populated STANDARD view, (1) the basic scene before
// population (ground + buildings only), (2) wide establishing view, (3) close-up detail view, (4) RICH density,
// (5) night with practical lights. Frame index = mode * 10 + environment.
import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import "../world";
import { buildWorld, RECIPES, worldPracticalsShim, type EnvKind } from "./worldShim";
import { World2 } from "../world/World2";
import { Stage2 } from "../light/Stage2";
import { LIGHT_PRESETS } from "../light/presets";
import { toRender, add, sub, mul, norm, type V3 } from "../cam";
import type { Density } from "../world/place";

export const ENVS = Object.keys(RECIPES) as EnvKind[];
export const WORLD_LAB_FRAMES = ENVS.length * 6;
const MODES = ["populated", "basic", "wide", "detail", "rich", "night"] as const;
export const WorldLab: React.FC = () => {
  const f = useCurrentFrame(), env = ENVS[f % ENVS.length], mode = MODES[Math.floor(f / ENVS.length) % MODES.length];
  const density: Density = mode === "basic" ? "MINIMAL" : mode === "rich" ? "RICH" : "STANDARD";
  const base = RECIPES[env](), dir = norm(sub(base.cam.pos, base.cam.look));
  const camPos: V3 = mode === "wide" ? add(base.cam.look, add(mul(dir, Math.max(28, 3 * Math.hypot(...sub(base.cam.pos, base.cam.look)))), [0, 14, 0])) : mode === "detail" ? add(base.subject, add(mul(dir, 2.6), [0, 1.0, 0])) : base.cam.pos;
  const look: V3 = mode === "detail" ? add(base.subject, [0, 0.4, 0]) : mode === "wide" ? base.cam.look : base.cam.look;
  const { recipe, world } = useMemo(() => { const r = buildWorld(env, density, 7, { samples: [camPos], subject: base.subject }); if (mode === "basic") r.world.placements = r.world.placements.filter((p) => false && p); return r; }, [env, density, mode]);
  const spec0 = LIGHT_PRESETS[mode === "night" ? recipe.nightLight : recipe.light], interior = ["factory", "residentialInterior", "warehouse"].includes(env);
  const light = { ...spec0, practicals: [...spec0.practicals, ...worldPracticalsShim(world, spec0, interior || mode === "night")] };
  const cam = toRender({ pos: camPos, look, focal: mode === "wide" ? 24 : mode === "detail" ? 40 : 28, focus: Math.hypot(...sub(look, camPos)), fstop: mode === "detail" ? 4 : 8, roll: 0 });
  return <Stage2 cam={cam} light={light} f={f} quality="BALANCED" focus={recipe.subject} shadowSize={mode === "wide" ? 40 : 20} world={({ hi, light: l }) => <World2 recipe={recipe} world={world} f={90 + f * 0} cam={cam.pos} shot={[{ pos: cam.pos, look: cam.look, fov: cam.fov }]} light={l} hi={hi} walkers={mode !== "basic"} birds={mode !== "basic"} />} />;
};
