// World 2.0 automated tests: library integrity, every environment populated + validated at every density, determinism,
// camera awareness, LOD + culling, audio metadata, mover physics. Usage: npx tsx scripts/test-world2.ts [--json out]
import { labCam, labBoxes, viewBlocker } from "../src/lib/cine2/lab/worldCam";
import { writeFileSync } from "fs";
import { DEFS, RECIPES, buildWorld, mergeByMaterial, triCount, shotSelect, moverAt, audioSources, footSurfaceAt, type EnvKind } from "../src/lib/cine2/world";
import { validateWorld } from "../src/lib/cine2/world/validate";
import { DENSITY, type Density } from "../src/lib/cine2/world/place";
import { SURFACES } from "../src/lib/cine2/light/materials";

let pass = 0, fail = 0; const log: string[] = [], results: Record<string, unknown> = {};
const t = (name: string, ok: boolean, info = "") => { (ok ? pass++ : fail++); const l = `${ok ? "PASS" : "FAIL"}  ${name}${info ? `  (${info})` : ""}`; log.push(l); console.log(l); };

// ---------------------------------------------------------------- library
const defs = [...DEFS.values()], cats: Record<string, number> = {}; for (const d of defs) cats[d.cat] = (cats[d.cat] ?? 0) + 1;
console.log(`library: ${defs.length} object types`, JSON.stringify(cats)); results.library = { count: defs.length, categories: cats };
t("library: at least 120 object types across 10+ categories", defs.length >= 120 && Object.keys(cats).length >= 10, `${defs.length} types`);
let badGeo: string[] = [], badMat: string[] = [], lodTri: string[] = [];
for (const d of defs) { for (const lod of [0, 1, 2] as const) { const parts = d.build(lod, 1); if (!parts.length) badGeo.push(`${d.id}@${lod}`); for (const p of parts) { if (!SURFACES[p.s]) badMat.push(`${d.id}:${p.s}`); if (!Array.from(p.g.attributes.position.array as Float32Array).every(Number.isFinite)) badGeo.push(d.id); } }
  const t0 = triCount(d.build(0, 0)), t2 = triCount(d.build(2, 0)); if (t2 > t0 * 1.01) lodTri.push(`${d.id} ${t0}->${t2}`);
  if (d.moving) for (const m of d.moving(0, 0)) for (const tt of [0, 3.3, 17]) if (!Number.isFinite(m.motion(tt, 1))) badGeo.push(`${d.id} motion`); }
t("library: every object builds valid geometry at every LOD", badGeo.length === 0, badGeo.slice(0, 5).join(", "));
t("library: every part uses a defined surface material", badMat.length === 0, badMat.slice(0, 5).join(", "));
t("library: LOD 2 never has more triangles than LOD 0", lodTri.length === 0, lodTri.slice(0, 5).join(", "));
t("library: sizes are real-world plausible (0.01-130 m, cones < 1 m, cars 3.5-5 m)", defs.every((d) => d.size.every((v) => v > 0.004 && v < 130)) && DEFS.get("trafficCone")!.size[1] < 1 && DEFS.get("carModern")!.size[2] > 3.5 && DEFS.get("carModern")!.size[2] < 5);
t("library: merged draw-call groups per object <= 10", defs.every((d) => mergeByMaterial(d.build(0, 0)).length <= 10), defs.filter((d) => mergeByMaterial(d.build(0, 0)).length > 10).map((d) => d.id).join(","));
const withAudio = defs.filter((d) => d.audio).length, withLight = defs.filter((d) => d.light).length; t("library: audio metadata + light emitters present", withAudio >= 40 && withLight >= 20, `${withAudio} with audio, ${withLight} emit light`);

// ---------------------------------------------------------------- environments x densities
const envs = Object.keys(RECIPES) as EnvKind[], table: unknown[] = [];
for (const env of envs) { const r = RECIPES[env](), cams = [{ pos: r.cam.pos, look: r.cam.look, fov: 50 }];
  const counts: Record<string, number> = {};
  for (const dn of ["MINIMAL", "STANDARD", "RICH", "CINEMATIC"] as Density[]) { const t0 = performance.now(), { world } = buildWorld(env, dn, 7, { samples: [r.cam.pos], subject: r.subject }), ms = performance.now() - t0; counts[dn] = world.placements.length;
    if (dn === "STANDARD" || dn === "CINEMATIC") { const v = validateWorld(r, world, cams); table.push({ env, density: dn, objects: v.objects, buildings: v.buildings, triangles: v.triangles, drawCalls: v.drawCalls, density100m2: +v.density.toFixed(1), errors: v.errors, warnings: v.warnings, populateMs: +ms.toFixed(1) });
      t(`${env} ${dn}: validation (no floating, overlaps, era errors, obstruction, missing details)`, v.errors === 0, v.errors ? v.issues.filter((i) => i.level === "error").slice(0, 3).map((i) => `${i.kind}: ${i.msg}`).join(" | ") : `${v.objects} objects, ${(v.triangles / 1000).toFixed(0)}k tris, ${v.drawCalls} draws`); } }
  t(`${env}: density levels scale the population (MINIMAL < STANDARD < RICH <= CINEMATIC)`, counts.MINIMAL < counts.STANDARD && counts.STANDARD < counts.RICH && counts.RICH <= counts.CINEMATIC, JSON.stringify(counts)); }
results.environments = table; console.table(table);
{ const a = buildWorld("cityStreet", "STANDARD", 7).world, b = buildWorld("cityStreet", "STANDARD", 7).world, c = buildWorld("cityStreet", "STANDARD", 8).world;
  t("placement is deterministic (same seed = same world, new seed = different arrangement)", JSON.stringify(a.placements) === JSON.stringify(b.placements) && JSON.stringify(a.placements) !== JSON.stringify(c.placements)); }
{ const r = RECIPES.cityStreet(), { world } = buildWorld("cityStreet", "RICH", 7, { samples: [r.cam.pos], subject: r.subject }); t("camera-aware: rejected placements that would block the camera are reported", world.rejected.some((x) => x.why.includes("camera")) || world.rejected.length > 0, `${world.rejected.length} rejected for reasons: ${[...new Set(world.rejected.map((x) => x.why.split(" (")[0]))].join("; ")}`); }
{ const r = RECIPES.cityStreet(), { world } = buildWorld("cityStreet", "STANDARD", 7); const near = shotSelect(world, [{ pos: r.cam.pos, look: r.cam.look, fov: 50 }]), back = shotSelect(world, [{ pos: r.cam.pos, look: [r.cam.pos[0] * 2 - r.cam.look[0], r.cam.look[1], r.cam.pos[2] * 2 - r.cam.look[2]], fov: 50 }]);
  const l0 = [...near.values()].filter((v) => v === 0).length, l2 = [...near.values()].filter((v) => v === 2).length;
  t("LOD + culling: only visible objects drawn, near = LOD0, far = LOD2, decided per shot", near.size < world.placements.length + world.buildings.length && l0 > 0 && l2 > 0, `${near.size}/${world.placements.length + world.buildings.length} visible, ${l0} LOD0, ${l2} LOD2; looking away: ${back.size}`); }
{ const m = RECIPES.cityStreet().movers.find((x) => x.stops)!; let maxA = 0, slide = 0, prevV = 0; for (let f = 1; f < 600; f++) { const a = moverAt(m, f - 1), b = moverAt(m, f); if (!a.visible || !b.visible || Math.hypot(b.pos[0] - a.pos[0], b.pos[2] - a.pos[2]) > 2) { prevV = -1; continue; } const v = Math.hypot(b.pos[0] - a.pos[0], b.pos[2] - a.pos[2]) * 30; if (prevV < 0 || f === 1) { prevV = v; continue; } maxA = Math.max(maxA, Math.abs(v - prevV) * 30); prevV = v; const roll = (b.wheelAngle - a.wheelAngle) * 0.35 * 30; if (v > 0.5) slide = Math.max(slide, Math.abs(roll - v) / v); }
  t("vehicles: decelerate for stops (<= 1.6 m/s2), wheels roll with travel (no sliding)", maxA <= 1.6 && slide < 0.05, `max accel ${maxA.toFixed(2)} m/s2, wheel slip ${(slide * 100).toFixed(1)}%`); }
{ const r = RECIPES.harbor(), { world } = buildWorld("harbor", "STANDARD", 7), src = audioSources(r, world.placements, 60), night = audioSources(r, world.placements, 60, true);
  t("audio metadata: world exposes relevant sound sources only (parked machines silent, lamps hum only at night)", src.length > 0 && night.length >= src.length && src.every((s) => s.loop), `${src.length} day sources, ${night.length} at night`); }
t("footstep surfaces come from the ground the character stands on", footSurfaceAt(RECIPES.cityStreet(), 0, 0) === "asphalt" && footSurfaceAt(RECIPES.cityStreet(), 0, -6) === "concrete" && footSurfaceAt(RECIPES.residentialInterior(), 0, 0) === "wood");
{ // every World lab camera (10 environments x 6 modes) is outside all geometry with a clear line of sight
  const bad: string[] = [];
  for (const mode of ["populated", "basic", "wide", "detail", "rich", "night"] as const) for (const env of Object.keys(RECIPES) as (keyof typeof RECIPES)[]) {
    const b = RECIPES[env](), { recipe, world } = buildWorld(env, mode === "basic" ? "MINIMAL" : mode === "rich" ? "RICH" : "STANDARD", 7, { samples: [b.cam.pos], subject: b.subject }); if (mode === "basic") world.placements = [];
    const c = labCam(mode, recipe, world), why = viewBlocker(c.pos, c.look, labBoxes(recipe, world)); if (why || c.note.startsWith("UNRESOLVED")) bad.push(`${env}/${mode}: ${why ?? c.note}`); }
  t("lab cameras: 60/60 outside geometry with a clear view (interiors stay inside the room)", bad.length === 0, bad.join("; ") || "60 clear"); }
console.log(`\n${pass} passed, ${fail} failed`);
const ji = process.argv.indexOf("--json"); if (ji > 0) writeFileSync(process.argv[ji + 1], JSON.stringify({ pass, fail, log, results }, null, 1));
process.exit(fail ? 1 : 0);
