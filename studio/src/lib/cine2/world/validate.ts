// World 2.0 automated validation: floating / sunken objects, overlaps between solids, objects inside buildings,
// scale sanity, missing materials, invalid geometry, era / environment consistency, density, camera obstruction,
// required environmental details per environment, render cost (triangles + draw calls) and mover path collisions.
import { DEFS, mergeByMaterial, triCount, type EnvKind } from "./kit";
import { overlaps, footprintOf, baseFootprint, buildingFootprint, segHitsBox, shotSelect, type World, type ShotCam } from "./place";
import { groundY, type Recipe } from "./recipes";
import { moverAt } from "./life";
import { SURFACES } from "../light/materials";
import { building } from "./building";

export type WorldIssue = { level: "error" | "warn"; kind: string; msg: string };
/** details every environment must contain to read as that place (environmental storytelling) */
export const REQUIRED: Record<EnvKind, string[][]> = {
  cityStreet: [["streetLamp"], ["bin"], ["bench", "busStop"], ["carModern", "van", "truck"], ["streetTree", "planter"], ["manhole", "drain"], ["trafficLight", "roadSign", "streetSign"]],
  constructionSite: [["towerCrane", "mobileCrane"], ["excavator", "bulldozer", "loader"], ["scaffold"], ["siteFence"], ["cementBags", "brickStack"], ["trafficCone", "roadBarrier"], ["siteOffice", "container"], ["generator", "workLight"]],
  harbor: [["cargoShip", "fishingBoat", "tugboat"], ["container"], ["mooringBollard"], ["quayCrane", "mobileCrane"], ["dockLight"], ["lifeRing", "fender"]],
  factory: [["machineTool"], ["conveyor"], ["storageRack"], ["hangingLamp", "ceilingLight"], ["safetySign"], ["drum", "pallet"]],
  historicTown: [["historicLamp"], ["mailbox", "bench"], ["bicycle", "car1930"], ["climbingPlant", "flowerBed", "planter"]],
  residentialInterior: [["sofa", "armchair"], ["coffeeTable", "diningSet"], ["bookshelf"], ["kitchenCabinets"], ["floorLamp", "ceilingLight"], ["houseplant"], ["curtains"]],
  countryside: [["treeDeciduous", "treeConifer"], ["rock", "stump", "log"], ["fence", "shrub"], ["reeds", "grassPatch"]],
  railwayStation: [["railTrack"], ["trainCarriage"], ["stationCanopy"], ["bench", "waitingChairs"], ["infoBoard", "clock"]],
  warehouse: [["storageRack"], ["pallet"], ["forklift"], ["industrialDoor", "loadingBay"], ["hangingLamp", "ceilingLight"]],
  waterfront: [["handrail"], ["bench"], ["historicLamp", "streetLamp"], ["fishingBoat", "pier"], ["streetTree", "planter"]],
};
export const validateWorld = (r: Recipe, w: World, cams?: ShotCam[]) => {
  const out: WorldIssue[] = [], e = (kind: string, msg: string) => out.push({ level: "error", kind, msg }), wn = (kind: string, msg: string) => out.push({ level: "warn", kind, msg });
  const fps = w.placements.map((p) => ({ p, d: DEFS.get(p.def)!, fp: footprintOf(DEFS.get(p.def)!, p.pos, p.ry, p.scale, p.id) })), bfp = w.buildings.map(buildingFootprint);
  for (const { p, d, fp } of fps) {
    if (!d) { e("unknown object", `${p.def}`); continue; }
    if (!p.pos.every(Number.isFinite)) e("invalid transform", `${p.id} ${p.def}`);
    const g = groundY(r, p.pos[0], p.pos[2]);
    if (d.place === "ground" && Math.abs(p.pos[1] - g) > 0.02 && !(p.rule.startsWith("stack") || p.pos[1] > g + 0.3)) e(p.pos[1] > g ? "floating object" : "sunken object", `${p.def} at ${p.pos.map((v) => v.toFixed(1))}: ${(p.pos[1] - g).toFixed(2)} m from ground`);
    if (p.scale < 0.6 || p.scale > 1.6) e("incorrect scale", `${p.def} scale ${p.scale.toFixed(2)}`);
    if (d.era[0] > w.era || d.era[1] < w.era) e("era inconsistency", `${p.def} (${d.era.join("-")}) in a ${w.era} world`);
    if (d.envs !== "any" && !d.envs.includes(w.env)) e("environment inconsistency", `${p.def} not expected in ${w.env}`);
    if (d.place !== "wall" && d.place !== "hang" && bfp.some((b) => overlaps(fp, b))) e("inside building", `${p.def} ${p.id}`);
  }
  // pairwise solid overlaps (spatial check)
  const solids = fps.filter((x) => x.d.solid && x.d.place === "ground");
  for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) if (overlaps(solids[i].fp, solids[j].fp)) e("geometry overlap", `${solids[i].p.def} ${solids[i].p.id} / ${solids[j].p.def} ${solids[j].p.id}`);
  // materials / geometry
  const usedDefs = new Set(w.placements.map((p) => p.def)); let tris = 0;
  for (const id of usedDefs) { const parts = DEFS.get(id)!.build(0, 0); if (!parts.length) e("missing geometry", id); for (const pt of parts) { if (!SURFACES[pt.s]) e("missing material", `${id}: ${pt.s}`); const pos = pt.g.attributes.position; if (!pos || pos.count === 0 || !Array.from(pos.array as Float32Array).every(Number.isFinite)) e("invalid geometry", id); } }
  // required environment details
  for (const alts of REQUIRED[w.env]) if (!alts.some((a) => usedDefs.has(a) || r.movers.some((m) => m.def === a))) e("missing environmental detail", `${w.env} needs one of: ${alts.join(", ")}`);
  // density (objects per 100 m2 of populated area)
  const area = Object.values(w.areas).reduce((s, a) => s + a.w * a.d, 0) || 1, dens = (w.placements.length / area) * 100; if (dens > 25) wn("excessive density", `${dens.toFixed(1)} objects / 100 m2`);
  if (w.placements.length < 20) e("empty scene", `only ${w.placements.length} objects`);
  // duplicates (identical transforms)
  const seen = new Set<string>(); for (const p of w.placements) { const k = `${p.def}|${p.pos.map((v) => v.toFixed(2))}`; if (seen.has(k)) e("duplicate placement", k); seen.add(k); }
  // camera obstruction + render cost per shot
  let drawCalls = 0;
  if (cams?.length) { const vis = shotSelect(w, cams), groups = new Map<string, number>();
    for (const p of w.placements) { const lod = vis.get(p.id); if (lod === undefined) continue; const k = `${p.def}|${lod}|${p.variant % (DEFS.get(p.def)!.variants ?? 3)}`; groups.set(k, (groups.get(k) ?? 0) + 1); tris += triCount(DEFS.get(p.def)!.build(lod, 0)); }
    for (const k of groups.keys()) { const [def, lod] = k.split("|"); drawCalls += mergeByMaterial(DEFS.get(def)!.build(+lod as 0, 0)).length; }
    for (const b of w.buildings) if (vis.has(b.id)) { const parts = building(b.spec, vis.get(b.id)!); tris += triCount(parts); drawCalls += mergeByMaterial(parts).length; }
    for (const c of cams) for (const { p, d, fp } of fps) { if (p.fg || fp.h < 0.6) continue; const t = segHitsBox(c.pos, r.subject, fp); if (t >= 0 && p.pos[1] + fp.h > c.pos[1] + (r.subject[1] + 1 - c.pos[1]) * t && Math.hypot(p.pos[0] - r.subject[0], p.pos[2] - r.subject[2]) > Math.max(fp.hw, fp.hd) * 0.5 + 0.6) e("camera obstruction", `${p.def} ${p.id} blocks the subject`); }
    if (tris > 2.5e6) e("excessive rendering cost", `${(tris / 1e6).toFixed(2)} M triangles`); else if (tris > 1.2e6) wn("high rendering cost", `${(tris / 1e6).toFixed(2)} M triangles`);
    if (drawCalls > 900) wn("many draw calls", `${drawCalls}`);
  }
  // movers: paths must not drive through solids or buildings (sampled)
  for (const m of r.movers) { const d = DEFS.get(m.def)!; for (let f = 0; f < 900; f += 15) { const s = moverAt(m, f); if (!s.visible) continue; const fp = footprintOf(d, s.pos, s.heading, 1, m.id);
    if (d.place !== "water" && bfp.some((b) => overlaps(fp, b))) { e("vehicle through building", `${m.id} at f${f}`); break; }
    const hit = solids.find((x) => x.d.cat !== "vehicle" && overlaps(fp, baseFootprint(x.d, x.fp), -0.1)); if (hit && d.place !== "water") { e("vehicle collision", `${m.id} hits ${hit.p.def} at f${f}`); break; } } }
  return { issues: out, errors: out.filter((x) => x.level === "error").length, warnings: out.filter((x) => x.level === "warn").length, objects: w.placements.length, buildings: w.buildings.length, triangles: Math.round(tris), drawCalls, density: dens };
};
