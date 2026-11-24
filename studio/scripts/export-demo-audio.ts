// Exports the integration demo's scene as an Audio 2.0 scene JSON: Character 2.0 foot contacts (surface from the World
// 2.0 ground under the foot), actions, Camera 2.0 shots, World 2.0 sound sources tracked relative to the camera
// (listener), ambience, music moods. Usage: npx tsx scripts/export-demo-audio.ts out/audio2/demo_scene.json
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { labSet, LAB_HERO } from "../src/lib/cine2/lab/labSet";
import { demoPlan, DEMO_FRAMES } from "../src/lib/cine2/lab/Demo";
import { footSurfaceAt, audioSources, moverAt, DEFS } from "../src/lib/cine2/world";
import { evaluate as evalChar } from "../src/char/tf2/planner";
import * as C from "../src/lib/cine2/cam";

const out = process.argv[2] ?? "out/audio2/demo_scene.json", { recipe, world } = labSet(), plan = demoPlan();
const listener = (f: number, p: C.V3): C.V3 => { const c = C.evaluate(plan, f), b = C.basis(c), d = C.sub(p, c.pos); return [C.dot(d, b.rt), C.dot(d, b.up), C.dot(d, b.fw)].map((v) => +v.toFixed(2)) as C.V3; };
const footsteps: unknown[] = [], actions: unknown[] = []; let prev: [boolean, boolean] = [true, true];
for (let f = 0; f < DEMO_FRAMES; f++) { const fr = evalChar(LAB_HERO, f, C.evaluate(plan, f).pos);
  for (const i of [0, 1] as const) if (fr.contacts[i] && !prev[i] && fr.walking > 0.2) footsteps.push({ f, foot: i, surface: footSurfaceAt(recipe, fr.pos[0], fr.pos[2]), speed: 1.2 * fr.walking, pos: listener(f, fr.pos) });
  prev = fr.contacts; }
for (const a of LAB_HERO.actions) { if (a.f0 >= DEMO_FRAMES) continue; const p = listener(a.f0, evalChar(LAB_HERO, a.f0).pos);
  if (a.kind === "gesture" || a.kind === "turn") actions.push({ f: a.f0, kind: a.kind === "turn" ? "turn" : "gesture", pos: p }); if (a.kind === "reach") actions.push({ f: a.f0 + 25, kind: "reach", material: "stone", pos: p }); }
// world sound sources: always-on machine loops near the action + moving vehicles, tracked per 5 frames relative to the camera
const sources: unknown[] = [];
for (const s of audioSources(recipe, world.placements, 0)) { const track = []; for (let f = 0; f < DEMO_FRAMES; f += 5) { const pos = s.moving ? moverAt(recipe.movers.find((m) => m.id === s.id)!, f).pos : s.pos; track.push([f, ...listener(f, pos)]); } sources.push({ id: s.id, loop: s.loop, radius: s.radius, gainDb: s.gainDb, track }); }
// (moving vehicles are already included by audioSources, with their tracked positions)
// the excavator works (its arm moves): treat it as running
const ex = world.placements.find((p) => p.def === "excavator"); if (ex) sources.push({ id: "excavator", loop: "excavatorEngine", radius: 35, gainDb: -14, track: Array.from({ length: DEMO_FRAMES / 5 }, (_, i) => [i * 5, ...listener(i * 5, ex.pos)]) });
const shots = plan.shots.map((s) => ({ f0: s.beat.f0, f1: s.beat.f1, preset: s.preset, kind: s.beat.kind, emotion: s.beat.emotion, importance: s.beat.importance ?? 0.6, dissolve: s.dissolve }));
const scene = { fps: 30, frames: DEMO_FRAMES, environment: "construction", ambience: [{ f: 0, env: "construction" }], footsteps, actions, shots, sources, music: [{ f: 0, mood: "curious" }, { f: 200, mood: "adventurous" }], seed: 21 };
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(scene, null, 1));
console.log(`scene: ${footsteps.length} footsteps (${[...new Set(footsteps.map((x) => (x as { surface: string }).surface))].join("/")}), ${actions.length} actions, ${shots.length} shots, ${sources.length} sources`);
console.log(C.shotList(plan));
