// Shared lab set: the World 2.0 construction site + a TF2 hero, with Camera 2.0 subjects and collision obstacles built
// from the actual placed world (buildings, machines, stacks), so the camera labs test against real geometry.
import "../world";
import { buildWorld, DEFS, type World, type Recipe } from "../world";
import { footprintOf, buildingFootprint } from "../world/place";
import { tf2Subject, type Obstacle, type SubjectDef, type V3 } from "../cam";
import type { Script } from "../../../char/tf2/planner";
import { TF2_HERO } from "../../../char/tf2/costume";

/** World 2.0 placements -> Camera 2.0 obstacles (solid objects + buildings as boxes; foliage / fences see-through) */
export const worldObstacles = (w: World): Obstacle[] => {
  const box = (f: { cx: number; cz: number; hw: number; hd: number; ry: number }, y0: number, h: number, id: string, soft = false): Obstacle => {
    const c = Math.abs(Math.cos(f.ry)), s = Math.abs(Math.sin(f.ry)), ex = f.hw * c + f.hd * s, ez = f.hw * s + f.hd * c;
    return { kind: "box", id, min: [f.cx - ex, y0, f.cz - ez], max: [f.cx + ex, y0 + h, f.cz + ez], soft };
  };
  const out: Obstacle[] = w.buildings.map((b) => box(buildingFootprint(b), 0, b.spec.floors * 3.2 + 1, b.id));
  for (const p of w.placements) { const d = DEFS.get(p.def)!; if (!d.solid || d.place === "hang" || d.size[1] < 0.6) continue; out.push(box(footprintOf(d, p.pos, p.ry, p.scale, p.id), p.pos[1], d.size[1] * p.scale, p.def, d.cat === "vegetation" || d.id === "siteFence" || d.id === "scaffold")); }
  return out;
};
export const LAB_HERO: Script = {
  id: "hero", seed: 31, costume: TF2_HERO, start: [-12, 6], facing: 1.9,
  actions: [
    { kind: "walk", f0: 10, f1: 200, to: [-4.5, 3.2], style: "curious" },
    { kind: "turn", f0: 205, f1: 225, face: 3.4 },
    { kind: "look", f0: 230, f1: 330, at: [-7, 9, -21] },
    { kind: "gesture", f0: 250, f1: 300, g: "point", dir: [-0.2, 0.55, -0.8] },
    { kind: "walk", f0: 360, f1: 520, to: [-6.2, -0.6], style: "normal" },
    { kind: "reach", f0: 540, f1: 600, side: 1, at: [-6.0, 0.9, -1.3] },
  ],
  emotions: [{ f: 0, mix: [{ e: "curiosity", level: 2 }] }, { f: 235, mix: [{ e: "surprise", level: 4 }], ease: 4 }, { f: 330, mix: [{ e: "happiness", level: 3 }] }, { f: 520, mix: [{ e: "concentration", level: 3 }] }],
};
let cache: { recipe: Recipe; world: World; obstacles: Obstacle[]; subjects: Record<string, SubjectDef> } | null = null;
export const labSet = () => {
  if (cache) return cache;
  const { recipe, world } = buildWorld("constructionSite", "STANDARD", 7, { samples: [[2, 1.7, 13]], subject: [-6, 0, 2] });
  const at = (def: string): V3 => world.placements.find((p) => p.def === def)?.pos ?? [0, 0, 0];
  const subjects: Record<string, SubjectDef> = {
    hero: tf2Subject(LAB_HERO, "hero"),
    frame: { id: "frame", kind: "structure", height: 13, width: 14, importance: 0.9, at: () => at("concreteFrame"), facingAt: () => 0.2 },
    crane: { id: "crane", kind: "structure", height: 42, width: 4, importance: 0.8, at: () => at("towerCrane"), facingAt: () => 0.3 },
    excavator: { id: "excavator", kind: "vehicle", height: 4.2, width: 6.5, /* boom + 6.5 m tracks: frame the whole machine */ importance: 0.7, at: () => at("excavator"), facingAt: () => -2.2 },
    mixer: { id: "mixer", kind: "object", height: 1.5, width: 1.2, importance: 0.7, at: () => at("cementMixer"), facingAt: () => 0.4 },
  };
  cache = { recipe, world, obstacles: worldObstacles(world), subjects }; return cache;
};
