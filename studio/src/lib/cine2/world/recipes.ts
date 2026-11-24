// World 2.0 environment recipes: ten complete, story-logical sets (city street, construction site, harbour, factory,
// historic town, residential interior, countryside, railway station, warehouse, waterfront). Each recipe lays out the
// base set (ground surfaces, buildings, water, interior shell), the population rules (what belongs where and why), the
// moving life (vehicles, machines, walkers, birds) and the ambience / lighting hints for Audio 2.0 and Lighting 2.0.
import { def, G, part, DEFS, type V3, type EnvKind, type FootSurface } from "./kit";
import { populate, type Rule, type Edge, type Area, type PlacedBuilding, type Density, type CameraHint, type World } from "./place";
import type { BuildingSpec } from "./building";
import type { Surface } from "../light/materials";
import type { LightPresetName } from "../light/presets";

// extra objects only some recipes need
def({ id: "trainCarriage", name: "passenger carriage", cat: "station", envs: ["railwayStation"], era: [1930, 2100], size: [2.9, 3.9, 20], audio: { loop: "trainIdle", events: ["doorChime"], when: "animated" },
  build: (l) => { const out = [part(G.boxOn(2.9, 3.0, 20, 0, 0, 0.9), "paintedMetal", "#2a4a6a"), part(G.boxOn(2.92, 0.9, 18.5, 0, 0, 2.0), "glass", "#2a3440", { tag: "glass" as const }), part(G.boxOn(2.9, 0.25, 20, 0, 0, 3.9), "paintedMetal", "#8a8e92"), part(G.boxOn(2.92, 0.12, 20, 0, 0, 1.6), "paintedMetal", "#e8c020")];
    for (const z of [-7, -5.5, 5.5, 7]) out.push(...G.wheel(0.45, 0.2, -0.72, z, l), ...G.wheel(0.45, 0.2, 0.72, z, l)); return out; } });
def({ id: "concreteFrame", name: "concrete frame under construction", cat: "construction", envs: ["constructionSite"], era: [1950, 2100], size: [14, 13, 10],
  build: (l) => { const out = []; for (let f = 0; f < 4; f++) { out.push(part(G.boxOn(14, 0.3, 10, 0, 0, f * 3.2 + (f ? 0 : 0)), "concrete", "#b0aca2")); if (f < 3) for (const x of [-6.5, -2.2, 2.2, 6.5]) for (const z of [-4.5, 0, 4.5]) out.push(part(G.boxOn(0.4, 2.9, 0.4, x, z, f * 3.2 + 0.3), "concrete", "#a8a49a")); }
    if (l < 2) for (const x of [-6.5, -2.2, 2.2, 6.5]) out.push(part(G.cyl(0.015, 0.015, 1.6, [x, 10.6, 4.5], undefined, l, 4), "rust"), part(G.cyl(0.015, 0.015, 1.6, [x + 0.12, 10.6, 4.5], undefined, l, 4), "rust")); return out; } });

export type GroundPiece = { area: Area; y: number; h: number; s: Surface; tint?: string; foot: FootSurface; repeat?: number };
export type Shell = { box: [V3, V3]; s: Surface; tint?: string };   // interior walls / ceilings (min, max)
export type Mover = { id: string; def: string; path: V3[]; speed: number; offset: number; stops?: { at: number; dur: number }[]; variant?: number; loop?: boolean; yOff?: number };
export type Walker = { id: string; path: V3[]; speed: number; offset: number; costume: string };
export type Recipe = { env: EnvKind; era: number; name: string; story: string; ground: GroundPiece[]; shells: Shell[]; water?: { area: Area; y: number }; edges: Edge[]; areas: Area[]; buildings: PlacedBuilding[]; rules: Rule[]; movers: Mover[]; walkers: Walker[];
  birds?: { count: number; centre: V3; radius: number; kind: "gull" | "pigeon" }; light: LightPresetName; nightLight: LightPresetName; ambience: string; subject: V3; cam: { pos: V3; look: V3 }; groundFn?: (x: number, z: number) => number };
const B = (id: string, spec: BuildingSpec, x: number, z: number, ry: number): PlacedBuilding => ({ id, spec, pos: [x, 0, z], ry });
/** a row of buildings along x at street line z, facing +z (ry 0) or -z (ry PI) */
const row = (prefix: string, x0: number, x1: number, z: number, face: 1 | -1, styles: BuildingSpec["style"][], era: number, seed: number, floors: [number, number], gable = false): PlacedBuilding[] => {
  const out: PlacedBuilding[] = []; let x = x0, i = 0;
  while (x < x1 - 4) { const w = 6 + ((seed * 7 + i * 13) % 5), st = styles[(seed + i) % styles.length], fl = floors[0] + ((seed + i * 3) % (floors[1] - floors[0] + 1));
    out.push(B(`b${prefix}${i}`, { w, d: 9 + (i % 3), floors: fl, style: st, seed: seed * 31 + i, era, roof: gable ? "gable" : "flat" }, x + w / 2, z, face > 0 ? 0 : Math.PI)); x += w + 0.02; i++; }
  return out;
};
const edge = (id: string, a: [number, number], b: [number, number], side: 1 | -1): Edge => ({ id, a, b, side });
const area = (id: string, cx: number, cz: number, w: number, d: number, ry = 0): Area => ({ id, cx, cz, w, d, ry });
const lane = (z: number, dir: 1 | -1, y = 0): V3[] => dir > 0 ? [[-70, y, z], [70, y, z]] : [[70, y, z], [-70, y, z]];

export const RECIPES: Record<EnvKind, () => Recipe> = {
  // ------------------------------------------------------------------------------------------------- 1 city street
  cityStreet: () => { const era = 2020; return {
    env: "cityStreet", era, name: "Detailed city street", story: "a lived-in modern street: shops at street level, flats above, parked and passing traffic, people on the pavements",
    ground: [{ area: area("road", 0, 0, 120, 8), y: 0, h: 0.02, s: "asphalt", foot: "asphalt", repeat: 2 }, { area: area("swN", 0, -6.2, 120, 4.4), y: 0.15, h: 0.15, s: "concrete", tint: "#a8a49a", foot: "concrete" }, { area: area("swS", 0, 6.2, 120, 4.4), y: 0.15, h: 0.15, s: "concrete", tint: "#a8a49a", foot: "concrete" }, { area: area("curbN", 0, -4.05, 120, 0.25), y: 0.16, h: 0.16, s: "stone", tint: "#8a867e", foot: "stone" }, { area: area("curbS", 0, 4.05, 120, 0.25), y: 0.16, h: 0.16, s: "stone", tint: "#8a867e", foot: "stone" }],
    shells: [], edges: [edge("curbN", [-60, -4.2], [60, -4.2], -1), edge("curbS", [-60, 4.2], [60, 4.2], 1), edge("faceN", [-60, -8.4], [60, -8.4], 1), edge("faceS", [-60, 8.4], [60, 8.4], -1), edge("laneN", [-60, -2.9], [60, -2.9], 1), edge("laneS", [-60, 2.9], [60, 2.9], 1), edge("centre", [-60, 0], [60, 0], 1)],
    areas: [area("swN", 0, -6.2, 120, 4.2), area("swS", 0, 6.2, 120, 4.2), area("road", 0, 0, 120, 7.6), area("near", 0, 2, 26, 14)],
    buildings: [...row("N", -60, 60, -8.4, 1, ["shop", "cafe", "apartment", "office", "restaurant", "apartment"], era, 3, [3, 6]), ...row("S", -60, 60, 8.4, -1, ["apartment", "shop", "office", "cafe", "apartment"], era, 11, [3, 5])],
    rules: [
      { kind: "along", id: "lampsN", defs: ["streetLamp"], edge: "curbN", spacing: 18, offset: 0.55, facing: "in", tier: "base" }, { kind: "along", id: "lampsS", defs: ["streetLamp"], edge: "curbS", spacing: 18, offset: 0.55, facing: "in", tier: "base" },
      { kind: "along", id: "treesN", defs: ["streetTree"], edge: "curbN", spacing: 13, offset: 1.3, prob: 0.8, tier: "standard" }, { kind: "along", id: "treesS", defs: ["streetTree"], edge: "curbS", spacing: 14, offset: 1.3, prob: 0.8, tier: "standard" },
      { kind: "along", id: "furnN", defs: ["bin", "bench", "bollard", "bollard", "mailbox", "bikeRack", "newsStand", "planter", "hydrant", "electricalCabinet", "streetSign"], edge: "curbN", spacing: 4.5, offset: 0.9, jitter: 0.6, facing: "out", prob: 0.75, tier: "standard" },
      { kind: "along", id: "furnS", defs: ["bin", "bench", "bollard", "planter", "hydrant", "bikeRack", "roadSign", "streetSign"], edge: "curbS", spacing: 5, offset: 0.9, jitter: 0.6, facing: "out", prob: 0.7, tier: "standard" },
      { kind: "along", id: "parkedN", defs: ["carModern", "carModern", "van", "carModern"], edge: "laneN", spacing: 6.5, offset: -0.5, facing: "along", prob: 0.7, tier: "base", from: 0.05, to: 0.42 }, { kind: "along", id: "parkedN2", defs: ["carModern", "van", "motorcycle"], edge: "laneN", spacing: 6.5, offset: -0.5, facing: "along", prob: 0.7, tier: "base", from: 0.58, to: 0.95 },
      { kind: "along", id: "parkedS", defs: ["carModern", "carModern", "truck", "carModern"], edge: "laneS", spacing: 7, offset: 0.5, facing: "along", prob: 0.55, tier: "standard" },
      { kind: "at", id: "busStop", def: "busStop", pos: [14, 0.15, 6.6], ry: Math.PI, tier: "standard" }, { kind: "at", id: "tl1", def: "trafficLight", pos: [-9, 0.15, -4.6], ry: 0, tier: "base" }, { kind: "at", id: "tl2", def: "trafficLight", pos: [-9, 0.15, 4.6], ry: Math.PI, tier: "base" },
      { kind: "along", id: "manholes", defs: ["manhole", "drain"], edge: "centre", spacing: 11, offset: 0, jitter: 1.5, tier: "standard" }, { kind: "along", id: "drains", defs: ["drain"], edge: "curbN", spacing: 15, offset: -0.35, facing: "along", tier: "standard" },
      { kind: "along", id: "wallN", defs: ["acUnit", "wallSign", "downpipe", "climbingPlant", "houseplant"], edge: "faceN", spacing: 3.5, offset: 0.05, facing: "out", prob: 0.55, tier: "rich" }, { kind: "along", id: "wallS", defs: ["acUnit", "wallSign", "downpipe"], edge: "faceS", spacing: 4, offset: 0.05, facing: "out", prob: 0.5, tier: "rich" },
      { kind: "scatter", id: "litter", defs: ["paperScrap", "leafLitter", "crackDecal", "pebbles"], area: "near", perM2: 0.06, near: true, tier: "standard" },
      { kind: "scatter", id: "flowers", defs: ["flowerBed", "planter"], area: "swS", count: 4, minDist: 8, tier: "rich" },
    ],
    movers: [{ id: "carA", def: "carModern", path: lane(-1.6, 1), speed: 9, offset: 0, stops: [{ at: 60, dur: 3 }], variant: 2 }, { id: "carB", def: "carModern", path: lane(1.6, -1), speed: 10, offset: 70, variant: 4 }, { id: "busA", def: "bus", path: lane(1.6, -1), speed: 7, offset: 20, stops: [{ at: 56, dur: 6 }] }, { id: "bike", def: "bicycle", path: lane(-3.3, 1), speed: 4.5, offset: 40 }],
    walkers: [{ id: "w1", path: [[-20, 0.15, 6.8], [20, 0.15, 6.8]], speed: 1.25, offset: 6, costume: "clerk" }, { id: "w2", path: [[18, 0.15, -6.6], [-18, 0.15, -6.6]], speed: 1.1, offset: 2, costume: "workerA" }, { id: "w3", path: [[-14, 0.15, -5.6], [12, 0.15, -5.6]], speed: 1.35, offset: 14, costume: "hal" }],
    birds: { count: 6, centre: [0, 9, -6], radius: 14, kind: "pigeon" }, light: "cinematicDocumentary", nightLight: "cityNight", ambience: "city", subject: [-1, 0.15, -5.6], cam: { pos: [5.5, 1.65, 1.2], look: [-4, 1.9, -4.2] } }; },
  // ------------------------------------------------------------------------------------------------- 2 construction site
  constructionSite: () => { const era = 2015; return {
    env: "constructionSite", era, name: "Detailed construction site", story: "a four-storey concrete frame going up: excavation for the next block, materials staged by the gate, machines working",
    ground: [{ area: area("site", 0, -8, 70, 44), y: 0, h: 0.02, s: "gravel", tint: "#8a8070", foot: "gravel", repeat: 3 }, { area: area("pit", 12, -6, 12, 9), y: 0.01, h: 0.01, s: "soil", tint: "#4a3a2a", foot: "soil" }, { area: area("street", 0, 17, 70, 8), y: 0, h: 0.02, s: "asphalt", foot: "asphalt" }, { area: area("pave", 0, 12.2, 70, 2.4), y: 0.15, h: 0.15, s: "concrete", foot: "concrete" }],
    shells: [], edges: [edge("fence", [-34, 11], [34, 11], 1), edge("haul", [-30, 4], [30, 4], 1), edge("frameFace", [-14, -16.2], [0, -16.2], 1)],
    areas: [area("yard", -8, 2, 26, 10), area("materials", -20, -4, 12, 10), area("near", 0, 4, 24, 14), area("site", 0, -8, 66, 40)],
    buildings: [B("bAdj", { w: 16, d: 12, floors: 5, style: "apartment", seed: 5, era }, 30, -22, 0), B("bAdj2", { w: 12, d: 10, floors: 4, style: "office", seed: 8, era }, -30, -24, 0)],
    rules: [
      { kind: "at", id: "frame", def: "concreteFrame", pos: [-7, 0, -21], tier: "base" }, { kind: "at", id: "crane", def: "towerCrane", pos: [4, 0, -24], tier: "base" },
      { kind: "row", id: "scaffold", def: "scaffold", a: [-13, 0, -15.7], b: [-1, 0, -15.7], n: 5, tier: "standard" },
      { kind: "at", id: "excavator", def: "excavator", pos: [12, 0, -4], ry: -2.2, tier: "base" }, { kind: "at", id: "dump", def: "dumpTruck", pos: [19, 0, 2], ry: -1.57, tier: "base" }, { kind: "at", id: "loader", def: "loader", pos: [-24, 0, -14], ry: 0.6, tier: "standard" },
      { kind: "at", id: "office", def: "siteOffice", pos: [-26, 0, 6.5], ry: 0, tier: "base" }, { kind: "at", id: "container", def: "container", pos: [-17.5, 0, 7.5], ry: Math.PI / 2, variant: 1, tier: "standard" }, { kind: "at", id: "toilet", def: "portableToilet", pos: [-31, 0, 6.5], tier: "standard" },
      { kind: "cluster", id: "mixing", area: "yard", centre: [-6, 0], radius: 3.2, members: [{ def: "cementMixer", n: 1 }, { def: "cementBags", n: 2 }, { def: "brickStack", n: 2 }, { def: "wheelbarrow", n: 1 }, { def: "bucket", n: 3 }, { def: "shovel", n: 1 }], facing: "random", tier: "base" },
      { kind: "cluster", id: "steel", area: "materials", radius: 5, members: [{ def: "steelPipes", n: 1 }, { def: "steelBeams", n: 2 }, { def: "planks", n: 2 }, { def: "concretePipes", n: 1 }, { def: "pallet", n: 3 }, { def: "cableReel", n: 1 }], facing: "axis", tier: "standard" },
      { kind: "cluster", id: "power", area: "yard", centre: [-14, -9], radius: 2.2, members: [{ def: "generator", n: 1 }, { def: "workLight", n: 2 }, { def: "hose", n: 1 }, { def: "toolbox", n: 1 }], tier: "standard" },
      { kind: "along", id: "fence", defs: ["siteFence"], edge: "fence", spacing: 3.6, offset: 0, facing: "out", tier: "base", from: 0, to: 0.4 }, { kind: "along", id: "fence2", defs: ["siteFence"], edge: "fence", spacing: 3.6, offset: 0, facing: "out", tier: "base", from: 0.6, to: 1 },
      { kind: "along", id: "gate", defs: ["trafficCone", "roadBarrier", "warningSign", "trafficCone"], edge: "haul", spacing: 2.2, offset: 2.2, tier: "base", from: 0.43, to: 0.57 },
      { kind: "scatter", id: "cones", defs: ["trafficCone", "trafficCone", "concreteBarrier", "drum"], area: "site", count: 10, minDist: 5, tier: "standard" },
      { kind: "scatter", id: "clutter", defs: ["pallet", "bucket", "planks", "toolbox", "stoneBlocks"], area: "site", count: 9, minDist: 5, tier: "rich" },
      { kind: "scatter", id: "micro", defs: ["pebbles", "paperScrap", "puddleDecal", "pebbles"], area: "near", perM2: 0.07, near: true, tier: "standard" },
      { kind: "along", id: "streetLamps", defs: ["streetLamp"], edge: "fence", spacing: 20, offset: -2.5, facing: "out", tier: "standard" },
      { kind: "scatter", id: "parked", defs: ["van", "carModern"], area: "materials", count: 1, tier: "rich" },
    ],
    movers: [{ id: "dumpRun", def: "dumpTruck", path: [[-60, 0, 17.5], [60, 0, 17.5]], speed: 6, offset: 30 }, { id: "fork", def: "forklift", path: [[-10, 0, -6], [2, 0, -6], [2, 0, -8.5], [-10, 0, -8.5]], speed: 1.6, offset: 0, loop: true, stops: [{ at: 12, dur: 4 }] }],
    walkers: [{ id: "w1", path: [[-12, 0, 0.5], [-2, 0, -1.5], [-12, 0, -3.5]], speed: 1.0, offset: 0, costume: "workerA" }, { id: "w2", path: [[6, 0, -14], [6, 0, -2]], speed: 0.9, offset: 4, costume: "workerB" }],
    birds: { count: 4, centre: [0, 18, -10], radius: 20, kind: "pigeon" }, light: "constructionSite", nightLight: "industrialFactory", ambience: "construction", subject: [-3, 0, 4.5], cam: { pos: [2, 1.7, 13], look: [-3, 1.5, -4] } }; },
  // ------------------------------------------------------------------------------------------------- 3 harbour
  harbor: () => { const era = 2010; return {
    env: "harbor", era, name: "Detailed harbour", story: "a working container quay: a ship alongside, the quay crane over it, boxes stacked in rows, a tug standing by",
    ground: [{ area: area("quay", 0, -14, 120, 28), y: 1.2, h: 3.5, s: "concrete", tint: "#9a968c", foot: "concrete", repeat: 3 }], shells: [], water: { area: area("sea", 0, 60, 320, 120), y: 0 },
    edges: [edge("quayEdge", [-60, -0.4], [60, -0.4], 1), edge("back", [-60, -27], [60, -27], -1), edge("laneQ", [-60, -6], [60, -6], 1)],
    areas: [area("stack", -22, -18, 36, 14), area("apron", 6, -8, 60, 10), area("near", 0, -4, 24, 10)],
    buildings: [], rules: [
      { kind: "at", id: "ship", def: "cargoShip", pos: [8, 0, 16], ry: Math.PI / 2, tier: "base" }, { kind: "at", id: "qc", def: "quayCrane", pos: [-20, 1.2, -4], ry: 0, tier: "base" }, { kind: "at", id: "shed", def: "warehouseShed", pos: [30, 1.2, -22], ry: 0, tier: "base" },
      { kind: "row", id: "stack1", def: "container", a: [-36, 1.2, -14], b: [-8, 1.2, -14], n: 5, ry: Math.PI / 2, tier: "base", variantStep: 7 }, { kind: "row", id: "stack2", def: "container", a: [-36, 3.8, -14], b: [-16, 3.8, -14], n: 4, ry: Math.PI / 2, tier: "standard", variantStep: 5 }, { kind: "row", id: "stack3", def: "container", a: [-36, 1.2, -18], b: [-8, 1.2, -18], n: 5, ry: Math.PI / 2, tier: "standard", variantStep: 3 },
      { kind: "along", id: "bollards", defs: ["mooringBollard"], edge: "quayEdge", spacing: 8, offset: -0.7, tier: "base" }, { kind: "along", id: "fenders", defs: ["fender"], edge: "quayEdge", spacing: 6, offset: 0.0, facing: "out", tier: "standard" },
      { kind: "along", id: "edgeKit", defs: ["ropeCoil", "lifeRing", "ladder", "netPile", "ropeCoil"], edge: "quayEdge", spacing: 9, offset: -1.6, jitter: 1, tier: "standard" },
      { kind: "along", id: "lights", defs: ["dockLight"], edge: "back", spacing: 24, offset: 1.0, tier: "base" },
      { kind: "scatter", id: "kit", defs: ["drum", "cargoStack", "pallet", "trafficCone", "forklift", "cableReel"], area: "apron", count: 9, minDist: 4, tier: "standard" },
      { kind: "at", id: "sign", def: "harborSign", pos: [-4, 1.2, -9], ry: 0.3, tier: "standard" }, { kind: "at", id: "truck", def: "truck", pos: [-2, 1.2, -18], ry: 1.57, tier: "standard" }, { kind: "at", id: "anchor", def: "anchor", pos: [4.5, 1.2, -10.5], ry: 0.2, tier: "rich" },
      { kind: "scatter", id: "micro", defs: ["pebbles", "paperScrap", "crackDecal"], area: "near", perM2: 0.05, near: true, tier: "standard" },
      { kind: "at", id: "buoy1", def: "buoy", pos: [-30, 0, 34], tier: "standard" }, { kind: "at", id: "buoy2", def: "buoy", pos: [36, 0, 40], variant: 1, tier: "standard" }, { kind: "at", id: "fb", def: "fishingBoat", pos: [-64, 0, 6], ry: 1.57, tier: "standard" },
    ],
    movers: [{ id: "tug", def: "tugboat", path: [[-120, 0, 44], [120, 0, 44]], speed: 3.2, offset: 80, yOff: 0 }, { id: "boat2", def: "fishingBoat", path: [[140, 0, 70], [-140, 0, 70]], speed: 4, offset: 40, variant: 2 }, { id: "fork", def: "forklift", path: [[-30, 1.2, -23], [12, 1.2, -23]], speed: 2.2, offset: 0, loop: true }],
    walkers: [{ id: "w1", path: [[-8, 1.2, -2.5], [12, 1.2, -2.5]], speed: 1.1, offset: 0, costume: "workerA" }],
    birds: { count: 10, centre: [0, 14, 8], radius: 22, kind: "gull" }, light: "harborShips", nightLight: "cityNight", ambience: "harbor", subject: [8, 1.2, -2.2], cam: { pos: [24, 4.2, -13], look: [2, 6.5, 3] } }; },
  // ------------------------------------------------------------------------------------------------- 4 factory interior
  factory: () => { const era = 1985; return {
    env: "factory", era, name: "Detailed industrial factory", story: "a machining hall mid-shift: a line of machines feeding a conveyor, racking along the wall, a mezzanine office",
    ground: [{ area: area("floor", 0, 0, 40, 30), y: 0, h: 0.02, s: "concrete", tint: "#8a867c", foot: "concrete", repeat: 4 }, { area: area("aisle", 0, 4, 40, 3), y: 0.005, h: 0.005, s: "paintedMetal", tint: "#c8a830", foot: "concrete" }],
    shells: [{ box: [[-20, 0, -15.2], [20, 11, -15]], s: "brick", tint: "#7a5a46" }, { box: [[-20.2, 0, -15], [-20, 11, 15]], s: "brick", tint: "#7a5a46" }, { box: [[20, 0, -15], [20.2, 11, 15]], s: "brick", tint: "#7a5a46" }, { box: [[-20, 11, -15], [20, 11.3, 15]], s: "paintedMetal", tint: "#8a8a84" }, ...[-10, 0, 10].map((x): Shell => ({ box: [[x - 1.5, 10.95, -13], [x + 1.5, 11.0, 13]], s: "emissive", tint: "#e8eef2" }))],
    edges: [edge("backWall", [-19.5, -14.9], [19.5, -14.9], 1), edge("leftWall", [-19.9, 14], [-19.9, -14], 1), edge("rightWall", [19.9, -14], [19.9, 14], 1), edge("line", [-14, -4], [14, -4], 1), edge("ceilA", [-18, -6], [18, -6], 1), edge("ceilB", [-18, 6], [18, 6], 1)],
    areas: [area("floor", 0, 0, 36, 26), area("near", 0, 6, 16, 10), area("bay", 12, 8, 12, 10)],
    buildings: [], rules: [
      { kind: "row", id: "windows", def: "factoryWindow", a: [-14, 5.5, -14.95], b: [14, 5.5, -14.95], n: 4, tier: "base" },
      { kind: "row", id: "machines", def: "machineTool", a: [-12, 0, -7.5], b: [12, 0, -7.5], n: 5, tier: "base", variantStep: 1 }, { kind: "at", id: "conv", def: "conveyor", pos: [0, 0, -4], ry: Math.PI / 2, tier: "base" }, { kind: "at", id: "conv2", def: "conveyor", pos: [-8.5, 0, -4], ry: Math.PI / 2, tier: "standard" },
      { kind: "along", id: "racks", defs: ["storageRack"], edge: "leftWall", spacing: 3.0, offset: 0.7, facing: "out", tier: "base" },
      { kind: "along", id: "wallKit", defs: ["pipeRun", "electricBox", "safetySign", "gauge", "warningLight", "industrialFan", "clock"], edge: "backWall", spacing: 2.6, offset: 0.05, facing: "out", tier: "standard" },
      { kind: "along", id: "rightKit", defs: ["controlPanel", "toolCabinet", "workbench", "drum", "drum"], edge: "rightWall", spacing: 2.4, offset: 0.6, facing: "out", tier: "standard" },
      { kind: "row", id: "ductA", def: "duct", a: [-10, 9.2, -6], b: [10, 9.2, -6], n: 2, ry: Math.PI / 2, tier: "standard" }, { kind: "row", id: "lampsA", def: "hangingLamp", a: [-15, 8.6, -6], b: [15, 8.6, -6], n: 6, tier: "base" }, { kind: "row", id: "lampsB", def: "hangingLamp", a: [-15, 8.6, 6], b: [15, 8.6, 6], n: 6, tier: "base" },
      { kind: "at", id: "stairs", def: "metalStairs", pos: [16.5, 0, 2], ry: Math.PI, tier: "standard" }, { kind: "at", id: "walkway", def: "walkway", pos: [17.6, 0, -6], tier: "standard" }, { kind: "at", id: "door", def: "industrialDoor", pos: [8, 0, -14.95], tier: "base" }, { kind: "at", id: "tank", def: "storageTank", pos: [-16, 0, 11], tier: "rich" },
      { kind: "cluster", id: "bayKit", area: "bay", radius: 3.5, members: [{ def: "forklift", n: 1 }, { def: "pallet", n: 3 }, { def: "cargoStack", n: 1 }, { def: "drum", n: 2 }], tier: "standard" },
      { kind: "scatter", id: "floorKit", defs: ["drum", "pallet", "toolbox", "bucket", "trafficCone"], area: "floor", count: 8, minDist: 4, tier: "rich" },
      { kind: "scatter", id: "micro", defs: ["paperScrap", "crackDecal", "hose"], area: "near", perM2: 0.05, near: true, tier: "standard" },
    ],
    movers: [{ id: "fork", def: "forklift", path: [[-16, 0, 4], [16, 0, 4]], speed: 2, offset: 6, loop: true, stops: [{ at: 20, dur: 3 }] }], walkers: [{ id: "w1", path: [[-6, 0, -2.2], [6, 0, -2.2]], speed: 0.9, offset: 0, costume: "workerB" }],
    light: "industrialFactory", nightLight: "industrialFactory", ambience: "factory", subject: [2.5, 0, 2.5], cam: { pos: [5.5, 1.7, 10], look: [0, 1.6, -3] } }; },
  // ------------------------------------------------------------------------------------------------- 5 historic town
  historicTown: () => { const era = 1935; return {
    env: "historicTown", era, name: "Detailed historic town", story: "a 1930s market-town high street: cobbles, gabled brick terraces, gas-style lamps, bicycles and a few period cars",
    ground: [{ area: area("cobbles", 0, 0, 100, 9), y: 0, h: 0.02, s: "stone", tint: "#7a746a", foot: "stone", repeat: 6 }, { area: area("pN", 0, -6.3, 100, 3.6), y: 0.14, h: 0.14, s: "stone", tint: "#9a9488", foot: "stone" }, { area: area("pS", 0, 6.3, 100, 3.6), y: 0.14, h: 0.14, s: "stone", tint: "#9a9488", foot: "stone" }],
    shells: [], edges: [edge("curbN", [-50, -4.5], [50, -4.5], -1), edge("curbS", [-50, 4.5], [50, 4.5], 1), edge("faceN", [-50, -8.1], [50, -8.1], 1), edge("faceS", [-50, 8.1], [50, 8.1], -1), edge("laneN", [-50, -3.4], [50, -3.4], 1)],
    areas: [area("pN", 0, -6.3, 100, 3.4), area("pS", 0, 6.3, 100, 3.4), area("near", 0, 2, 22, 12)],
    buildings: [...row("N", -50, 50, -8.1, 1, ["historic", "historic", "shop", "historic", "restaurant"], era, 21, [2, 4], true), ...row("S", -50, 50, 8.1, -1, ["historic", "shop", "historic", "cafe"], era, 27, [2, 3], true)],
    rules: [
      { kind: "along", id: "lampsN", defs: ["historicLamp"], edge: "curbN", spacing: 14, offset: 0.5, tier: "base" }, { kind: "along", id: "lampsS", defs: ["historicLamp"], edge: "curbS", spacing: 14, offset: 0.5, tier: "base" },
      { kind: "along", id: "furn", defs: ["bench", "mailbox", "bicycle", "planter", "streetSign", "bollard"], edge: "curbN", spacing: 6, offset: 0.9, jitter: 0.6, prob: 0.8, tier: "standard" }, { kind: "along", id: "furnS", defs: ["bicycle", "flowerBed", "bench", "bin"], edge: "curbS", spacing: 7, offset: 0.9, prob: 0.7, tier: "standard" },
      { kind: "along", id: "cars", defs: ["car1930", "car1930"], edge: "laneN", spacing: 12, offset: -0.4, facing: "along", prob: 0.5, tier: "standard" },
      { kind: "along", id: "walls", defs: ["climbingPlant", "wallSign", "downpipe", "houseplant"], edge: "faceN", spacing: 4.2, offset: 0.05, prob: 0.6, tier: "rich" }, { kind: "along", id: "wallsS", defs: ["climbingPlant", "downpipe", "wallSign"], edge: "faceS", spacing: 4.6, offset: 0.05, prob: 0.55, tier: "rich" },
      { kind: "row", id: "scaffold", def: "scaffold", a: [-18, 0.14, -7.95], b: [-11, 0.14, -7.95], n: 3, tier: "rich" }, { kind: "scatter", id: "trees", defs: ["streetTree"], area: "pS", count: 3, minDist: 18, tier: "standard" },
      { kind: "scatter", id: "micro", defs: ["leafLitter", "paperScrap", "pebbles", "manhole", "drain"], area: "near", perM2: 0.05, near: true, tier: "standard" },
    ],
    movers: [{ id: "car", def: "car1930", path: lane(-1.4, 1), speed: 6, offset: 30, variant: 1 }, { id: "bike", def: "bicycle", path: lane(1.6, -1), speed: 4, offset: 10 }],
    walkers: [{ id: "w1", path: [[-15, 0.14, 6.6], [15, 0.14, 6.6]], speed: 1.1, offset: 0, costume: "clerk" }, { id: "w2", path: [[14, 0.14, -6.2], [-14, 0.14, -6.2]], speed: 1.0, offset: 9, costume: "hal" }],
    birds: { count: 5, centre: [0, 11, -5], radius: 12, kind: "pigeon" }, light: "historicalArchitecture", nightLight: "blueHour", ambience: "historicTown", subject: [0, 0.14, -6.0], cam: { pos: [5, 1.6, 1.0], look: [-4, 1.8, -4.0] } }; },
  // ------------------------------------------------------------------------------------------------- 6 residential interior
  residentialInterior: () => { const era = 2005; return {
    env: "residentialInterior", era, name: "Detailed residential interior", story: "an open-plan flat: living room by the window, kitchen and dining at the back, a work corner",
    ground: [{ area: area("floor", 0, 0, 10, 8), y: 0, h: 0.02, s: "wood", tint: "#9a7a52", foot: "wood", repeat: 3 }, { area: area("kitchen", -2.5, -3, 5, 2), y: 0.003, h: 0.005, s: "tile", tint: "#c8c4b8", foot: "tile" }],
    shells: [{ box: [[-5, 0, -4.1], [5, 2.8, -4]], s: "plaster", tint: "#e0d8c8" }, { box: [[-5.1, 0, -4], [-5, 2.8, 4]], s: "plaster", tint: "#d8d0c0" }, { box: [[5, 0, -4], [5.1, 2.8, 4]], s: "plaster", tint: "#e0d8c8" }, { box: [[-5, 2.8, -4], [5, 2.9, 4]], s: "plaster", tint: "#f2ece0" }],
    edges: [edge("back", [-4.9, -3.95], [4.9, -3.95], 1), edge("left", [-4.95, 3.8], [-4.95, -3.8], 1), edge("right", [4.95, -3.8], [4.95, 3.8], 1)],
    areas: [area("living", 1.5, 1, 6, 5), area("near", 0, 1.5, 8, 5)], buildings: [],
    rules: [
      { kind: "at", id: "sofa", def: "sofa", pos: [1.6, 0, 0.2], ry: Math.PI, tier: "base" }, { kind: "at", id: "arm", def: "armchair", pos: [3.6, 0, 1.6], ry: -1.9, tier: "base" }, { kind: "at", id: "table", def: "coffeeTable", pos: [1.6, 0, 1.5], tier: "base" }, { kind: "at", id: "rug", def: "rug", pos: [1.8, 0, 1.4], tier: "base" },
      { kind: "at", id: "tv", def: "tvUnit", pos: [1.6, 0, 3.6], ry: Math.PI, tier: "base" }, { kind: "at", id: "lamp", def: "floorLamp", pos: [3.9, 0, -0.4], tier: "base" }, { kind: "at", id: "shelf", def: "bookshelf", pos: [4.75, 0, -1.6], ry: -Math.PI / 2, tier: "base" },
      { kind: "at", id: "kitchen", def: "kitchenCabinets", pos: [-2.6, 0, -3.65], tier: "base" }, { kind: "at", id: "fridge", def: "fridge", pos: [-4.5, 0, -3.6], tier: "base" }, { kind: "at", id: "stove", def: "stove", pos: [-0.75, 0, -3.65], tier: "standard" }, { kind: "at", id: "dining", def: "diningSet", pos: [-2.6, 0, -1.2], tier: "base" },
      { kind: "row", id: "chairs", def: "chair", a: [-3.2, 0, -0.55], b: [-2.0, 0, -0.55], n: 2, ry: Math.PI, tier: "standard" }, { kind: "row", id: "chairs2", def: "chair", a: [-3.2, 0, -1.85], b: [-2.0, 0, -1.85], n: 2, tier: "standard" },
      { kind: "at", id: "desk", def: "desk", pos: [-4.1, 0, 1.6], ry: Math.PI / 2, tier: "standard" }, { kind: "at", id: "ochair", def: "officeChair", pos: [-3.3, 0, 1.6], ry: -Math.PI / 2, tier: "standard" }, { kind: "at", id: "filing", def: "filingCabinet", pos: [-4.65, 0, 3.0], ry: Math.PI / 2, tier: "rich" }, { kind: "at", id: "printer", def: "printer", pos: [-4.6, 0, 0.3], ry: Math.PI / 2, tier: "rich" },
      { kind: "row", id: "windows", def: "curtains", a: [-1.2, 0, -3.95], b: [3.6, 0, -3.95], n: 2, tier: "base" },
      { kind: "along", id: "wallArt", defs: ["wallArt", "wallArt", "clock"], edge: "left", spacing: 2.2, offset: 0.02, tier: "standard" },
      { kind: "scatter", id: "plants", defs: ["houseplant"], area: "living", count: 3, minDist: 2, tier: "standard" },
      { kind: "row", id: "ceiling", def: "ceilingLight", a: [-2.5, 2.78, 0], b: [2.5, 2.78, 0], n: 2, tier: "standard" },
    ],
    movers: [], walkers: [], light: "interiorWarm", nightLight: "interiorWarm", ambience: "interior", subject: [0.6, 0, 2.2], cam: { pos: [-0.8, 1.55, 6.2], look: [0.8, 1.2, -1] } }; },
  // ------------------------------------------------------------------------------------------------- 7 countryside
  countryside: () => { const era = 1990; const gf = (x: number, z: number) => { const flat = Math.min(1, Math.max(0, (Math.abs(z - 2) - 2.4) / 6)), pond = -1.1 * Math.exp(-((x + 14) ** 2) / 40 - ((z + 8) ** 2) / 18);
      return flat * (0.9 * Math.sin(x * 0.045) * Math.cos(z * 0.05) + 0.45 * Math.sin(x * 0.11 + z * 0.07)) + pond; };
    return { env: "countryside", era, name: "Detailed countryside", story: "a lane between fields: a farmhouse, a pond with reeds, a hedge line, woods behind", groundFn: gf,
      ground: [{ area: area("field", 0, -10, 140, 120), y: 0, h: 0.02, s: "vegetation", tint: "#6a8a3e", foot: "grass", repeat: 2 }, { area: area("lane", 0, 2, 140, 3.2), y: 0.02, h: 0.02, s: "gravel", tint: "#8a7a62", foot: "gravel" }], shells: [], water: { area: area("pond", -14, -8, 14, 9), y: -0.05 },
      edges: [edge("laneS", [-60, 3.8], [60, 3.8], 1), edge("laneN", [-60, 0.2], [60, 0.2], -1), edge("treeline", [-60, -34], [60, -34], 1)], areas: [area("field", 0, -16, 110, 30), area("pondEdge", -14, -8, 18, 13), area("near", 0, 3, 22, 12), area("meadowS", 0, 14, 100, 16)],
      buildings: [B("bFarm", { w: 11, d: 8, floors: 2, style: "house", seed: 4, era, roof: "gable" }, 18, -14, 0.3)],
      rules: [
        { kind: "along", id: "poles", defs: ["utilityPole"], edge: "laneN", spacing: 30, offset: 1.6, tier: "base" }, { kind: "along", id: "fenceS", defs: ["fence"], edge: "laneS", spacing: 3.1, offset: 0.8, facing: "out", tier: "standard", from: 0, to: 0.45 }, { kind: "along", id: "hedge", defs: ["shrub", "shrub", "bush"], edge: "laneS", spacing: 2.4, offset: 1.6, prob: 0.85, tier: "base", from: 0.55, to: 1 },
        { kind: "along", id: "woods", defs: ["treeDeciduous", "treeConifer", "treeDeciduous"], edge: "treeline", spacing: 6, offset: 2, jitter: 2.5, tier: "base" },
        { kind: "scatter", id: "fieldTrees", defs: ["treeDeciduous"], area: "field", count: 6, minDist: 14, tier: "base" }, { kind: "scatter", id: "rocks", defs: ["rock", "rock", "stump", "log"], area: "field", count: 10, minDist: 6, tier: "standard", scaleJ: 0.3 },
        { kind: "scatter", id: "reeds", defs: ["reeds"], area: "pondEdge", count: 9, minDist: 1.5, tier: "standard" }, { kind: "scatter", id: "grass", defs: ["grassPatch", "grassPatch", "flowerBed", "bush"], area: "meadowS", count: 30, minDist: 2, tier: "standard" },
        { kind: "scatter", id: "near", defs: ["grassPatch", "pebbles", "leafLitter", "grassPatch"], area: "near", perM2: 0.12, near: true, tier: "standard" },
        { kind: "at", id: "barrow", def: "wheelbarrow", pos: [13, 0, -8], ry: 0.6, tier: "rich" }, { kind: "at", id: "bench", def: "bench", pos: [-6, 0, 5.5], ry: Math.PI, tier: "rich" }, { kind: "at", id: "car", def: "carModern", pos: [14, 0, -8], ry: 1.2, variant: 5, tier: "rich" },
      ],
      movers: [{ id: "tractorish", def: "van", path: [[-80, 0, 1.4], [80, 0, 1.4]], speed: 7, offset: 0, variant: 0 }], walkers: [{ id: "w1", path: [[-20, 0, 2.6], [20, 0, 2.6]], speed: 1.0, offset: 8, costume: "hal" }],
      birds: { count: 8, centre: [0, 16, -12], radius: 26, kind: "pigeon" }, light: "epicEnvironmentReveal", nightLight: "moonlitNight", ambience: "countryside", subject: [0, 0, 3.2], cam: { pos: [2.5, 1.7, 11], look: [-1, 1.6, -4] } }; },
  // ------------------------------------------------------------------------------------------------- 8 railway station
  railwayStation: () => { const era = 1975; return {
    env: "railwayStation", era, name: "Detailed railway station", story: "an island platform under a canopy: a train waiting, passengers, the station building behind",
    ground: [{ area: area("bed", 0, 0, 120, 30), y: 0, h: 0.02, s: "gravel", tint: "#6a6460", foot: "gravel" }, { area: area("platform", 0, -2, 90, 7), y: 0.9, h: 0.9, s: "tile", tint: "#b8b4aa", foot: "tile", repeat: 4 }, { area: area("forecourt", 0, -12, 90, 8), y: 0.9, h: 0.9, s: "concrete", tint: "#a8a49a", foot: "concrete" }],
    shells: [], edges: [edge("pEdgeS", [-44, 1.4], [44, 1.4], 1), edge("pEdgeN", [-44, -5.4], [44, -5.4], -1), edge("pCentre", [-44, -2], [44, -2], 1), edge("facade", [-30, -16], [30, -16], 1)],
    areas: [area("platform", 0, -2, 80, 6), area("near", 0, -1, 20, 6)], buildings: [B("bStation", { w: 40, d: 10, floors: 2, style: "historic", seed: 6, era, floorH: 4 }, 0, -16, 0)],
    rules: [
      { kind: "row", id: "track1", def: "railTrack", a: [-50, 0, 4.4], b: [50, 0, 4.4], n: 11, ry: Math.PI / 2, tier: "base" }, { kind: "row", id: "track2", def: "railTrack", a: [-50, 0, 9.2], b: [50, 0, 9.2], n: 11, ry: Math.PI / 2, tier: "standard" },
      { kind: "at", id: "train", def: "trainCarriage", pos: [-4, 0.15, 4.4], ry: Math.PI / 2, tier: "base" }, { kind: "at", id: "train2", def: "trainCarriage", pos: [16.3, 0.15, 4.4], ry: Math.PI / 2, tier: "standard" },
      { kind: "row", id: "canopy", def: "stationCanopy", a: [-30, 0.9, -2], b: [30, 0.9, -2], n: 5, ry: Math.PI / 2, tier: "base" }, { kind: "row", id: "edgeS", def: "platformEdge", a: [-40, 0.9, 1.1], b: [40, 0.9, 1.1], n: 8, tier: "base" },
      { kind: "along", id: "kit", defs: ["bench", "bin", "waitingChairs", "vending", "bench", "mailbox", "newsStand"], edge: "pCentre", spacing: 5.5, offset: 1.2, jitter: 0.4, facing: "out", prob: 0.85, tier: "standard" },
      { kind: "row", id: "boards", def: "infoBoard", a: [-12, 4.0, -2], b: [12, 4.0, -2], n: 2, tier: "base" }, { kind: "row", id: "clocks", def: "clock", a: [-6, 3.2, -2.6], b: [6, 3.2, -2.6], n: 2, tier: "standard" }, { kind: "row", id: "lights", def: "ceilingLight", a: [-28, 4.2, -2], b: [28, 4.2, -2], n: 8, ry: Math.PI / 2, tier: "standard" },
      { kind: "along", id: "rail", defs: ["handrail"], edge: "pEdgeN", spacing: 6, offset: 0.4, facing: "along", tier: "standard" }, { kind: "along", id: "bikes", defs: ["bikeRack", "bicycle", "bicycle"], edge: "facade", spacing: 4, offset: 4.5, tier: "rich" },
      { kind: "along", id: "lamps", defs: ["streetLamp"], edge: "facade", spacing: 12, offset: 6, tier: "standard" }, { kind: "scatter", id: "micro", defs: ["paperScrap", "crackDecal"], area: "near", perM2: 0.05, near: true, tier: "standard" },
    ],
    movers: [{ id: "express", def: "trainCarriage", path: [[-200, 0.15, 9.2], [200, 0.15, 9.2]], speed: 14, offset: 160 }],
    walkers: [{ id: "w1", path: [[-14, 0.9, -0.5], [14, 0.9, -0.5]], speed: 1.2, offset: 0, costume: "clerk" }, { id: "w2", path: [[10, 0.9, -3.4], [-10, 0.9, -3.4]], speed: 1.0, offset: 5, costume: "hal" }],
    birds: { count: 5, centre: [0, 8, -4], radius: 12, kind: "pigeon" }, light: "overcastDaylight", nightLight: "cityNight", ambience: "station", subject: [0, 0.9, -0.8], cam: { pos: [7, 2.6, -1.2], look: [-5, 2.6, 1.2] } }; },
  // ------------------------------------------------------------------------------------------------- 9 warehouse
  warehouse: () => { const era = 2000; return {
    env: "warehouse", era, name: "Detailed warehouse", story: "a distribution warehouse: racking aisles, pallets staged at the loading bays, forklifts working",
    ground: [{ area: area("floor", 0, 0, 44, 34), y: 0, h: 0.02, s: "concrete", tint: "#9a968c", foot: "concrete", repeat: 4 }, { area: area("lineA", 0, 3, 44, 0.12), y: 0.004, h: 0.004, s: "paintedMetal", tint: "#e8c020", foot: "concrete" }, { area: area("lineB", 0, 7, 44, 0.12), y: 0.004, h: 0.004, s: "paintedMetal", tint: "#e8c020", foot: "concrete" }],
    shells: [{ box: [[-22, 0, -17.2], [22, 10, -17]], s: "paintedMetal", tint: "#9aa4a8" }, { box: [[-22.2, 0, -17], [-22, 10, 17]], s: "paintedMetal", tint: "#9aa4a8" }, { box: [[22, 0, -17], [22.2, 10, 17]], s: "paintedMetal", tint: "#9aa4a8" }, { box: [[-22, 10, -17], [22, 10.3, 17]], s: "paintedMetal", tint: "#8a8a84" }, ...[-12, 0, 12].map((x): Shell => ({ box: [[x - 1.5, 9.95, -15], [x + 1.5, 10.0, 15]], s: "emissive", tint: "#e8eef2" }))],
    edges: [edge("back", [-21.5, -16.9], [21.5, -16.9], 1), edge("right", [21.9, -15], [21.9, 15], 1)], areas: [area("stage", 4, 5, 26, 6), area("near", 0, 6, 16, 8)], buildings: [],
    rules: [
      ...[-14, -8, -2, 4, 10, 16].map((x, i): Rule => ({ kind: "row", id: `aisle${i}`, def: "storageRack", a: [x, 0, -14], b: [x, 0, -3], n: 4, ry: Math.PI / 2, tier: i % 2 ? "standard" : "base", variantStep: 3 })),
      { kind: "row", id: "doors", def: "industrialDoor", a: [-12, 0, -16.95], b: [12, 0, -16.95], n: 3, tier: "base" }, { kind: "row", id: "bays", def: "loadingBay", a: [-12, 0, -16.6], b: [12, 0, -16.6], n: 3, tier: "standard" },
      { kind: "row", id: "lamps", def: "hangingLamp", a: [-16, 8.2, -8], b: [16, 8.2, -8], n: 5, tier: "base" }, { kind: "row", id: "lamps2", def: "ceilingLight", a: [-16, 9.8, 5], b: [16, 9.8, 5], n: 5, tier: "base" },
      { kind: "cluster", id: "staging", area: "stage", radius: 6, members: [{ def: "pallet", n: 4 }, { def: "cargoStack", n: 3 }, { def: "drum", n: 3 }, { def: "trafficCone", n: 2 }], facing: "axis", tier: "base" },
      { kind: "at", id: "office", def: "siteOffice", pos: [16, 0, 11], ry: -Math.PI / 2, tier: "standard" }, { kind: "at", id: "bench", def: "workbench", pos: [-18, 0, 10], ry: Math.PI / 2, tier: "standard" }, { kind: "at", id: "cont", def: "container", pos: [-15, 0, 12], ry: Math.PI / 2, variant: 2, tier: "rich" },
      { kind: "along", id: "wall", defs: ["safetySign", "electricBox", "warningLight", "pipeRun"], edge: "right", spacing: 3.2, offset: 0.05, tier: "standard" }, { kind: "scatter", id: "micro", defs: ["paperScrap", "crackDecal", "pallet"], area: "near", perM2: 0.04, near: true, tier: "standard" },
    ],
    movers: [{ id: "fork1", def: "forklift", path: [[-20, 0, 1.2], [20, 0, 1.2]], speed: 2.4, offset: 0, loop: true, stops: [{ at: 12, dur: 3 }] }, { id: "fork2", def: "forklift", path: [[18, 0, -1], [-18, 0, -1]], speed: 2, offset: 15, loop: true }],
    walkers: [{ id: "w1", path: [[-10, 0, 9], [8, 0, 9]], speed: 1.0, offset: 0, costume: "workerA" }], light: "industrialFactory", nightLight: "industrialFactory", ambience: "warehouse", subject: [0, 0, 7], cam: { pos: [3, 1.7, 14], look: [-1, 1.8, -2] } }; },
  // ------------------------------------------------------------------------------------------------- 10 waterfront
  waterfront: () => { const era = 2018; return {
    env: "waterfront", era, name: "Detailed waterfront", story: "a promenade along the water: cafes with terraces, a timber pier, moored boats, people strolling",
    ground: [{ area: area("prom", 0, -6, 100, 12), y: 0.8, h: 2.0, s: "stone", tint: "#b8ae9a", foot: "stone", repeat: 5 }, { area: area("road", 0, -15, 100, 6), y: 0.8, h: 2.0, s: "asphalt", foot: "asphalt" }], shells: [], water: { area: area("bay", 0, 50, 300, 100), y: 0 },
    edges: [edge("edge", [-50, -0.2], [50, -0.2], 1), edge("cafeLine", [-50, -11.6], [50, -11.6], 1), edge("prom", [-50, -6], [50, -6], 1)], areas: [area("terrace", 0, -9.5, 60, 3), area("near", 0, -3, 20, 8)],
    buildings: row("C", -45, 45, -18.2, 1, ["cafe", "restaurant", "shop", "cafe", "apartment"], era, 41, [2, 4]),
    rules: [
      { kind: "along", id: "rail", defs: ["handrail"], edge: "edge", spacing: 4, offset: -0.3, facing: "along", tier: "base" }, { kind: "along", id: "lamps", defs: ["historicLamp"], edge: "edge", spacing: 12, offset: -1.2, tier: "base" },
      { kind: "along", id: "benches", defs: ["bench", "bin", "lifeRing", "bench", "planter"], edge: "edge", spacing: 6, offset: -1.6, facing: "in", prob: 0.85, tier: "standard" }, { kind: "along", id: "trees", defs: ["streetTree"], edge: "prom", spacing: 11, offset: -3.5, tier: "standard" },
      { kind: "scatter", id: "terrace", defs: ["diningSet", "chair", "chair", "houseplant"], area: "terrace", count: 10, minDist: 2.2, tier: "standard" }, { kind: "along", id: "bikes", defs: ["bicycle", "bikeRack"], edge: "prom", spacing: 9, offset: -4.6, prob: 0.6, tier: "rich" },
      { kind: "at", id: "pier", def: "pier", pos: [12, -0.2, 5], tier: "base" }, { kind: "at", id: "boat1", def: "fishingBoat", pos: [16.5, 0, 6], ry: 0.05, tier: "base" }, { kind: "at", id: "boat2", def: "fishingBoat", pos: [-14, 0, 6.5], ry: 1.5, variant: 3, tier: "standard" }, { kind: "at", id: "buoy", def: "buoy", pos: [-6, 0, 22], variant: 2, tier: "standard" },
      { kind: "along", id: "bollards", defs: ["mooringBollard", "ropeCoil"], edge: "edge", spacing: 7, offset: -0.6, tier: "standard" }, { kind: "scatter", id: "micro", defs: ["leafLitter", "paperScrap", "pebbles"], area: "near", perM2: 0.05, near: true, tier: "standard" },
    ],
    movers: [{ id: "sail", def: "fishingBoat", path: [[-150, 0, 40], [150, 0, 40]], speed: 3, offset: 70, variant: 1 }, { id: "car", def: "carModern", path: [[-60, 0.8, -14.2], [60, 0.8, -14.2]], speed: 8, offset: 30, variant: 3 }],
    walkers: [{ id: "w1", path: [[-16, 0.8, -4.2], [16, 0.8, -4.2]], speed: 1.1, offset: 3, costume: "clerk" }, { id: "w2", path: [[12, 0.8, -7.4], [-12, 0.8, -7.4]], speed: 0.95, offset: 10, costume: "hal" }],
    birds: { count: 8, centre: [0, 10, 6], radius: 18, kind: "gull" }, light: "goldenHour", nightLight: "blueHour", ambience: "waterfront", subject: [0, 0.8, -2.6], cam: { pos: [-7, 2.5, -3.5], look: [6, 1.8, 2.5] } }; },
};
/** build a populated world for a recipe */
export const buildWorld = (env: EnvKind, density: Density = "STANDARD", seed = 7, camera?: CameraHint): { recipe: Recipe; world: World } => {
  const recipe = RECIPES[env](); const keepOut = recipe.ground.filter((g) => g.area.id === "road" || g.area.id === "lane" || g.area.id === "street").map((g) => g.area);
  // driving lanes of the moving vehicles / machines are kept clear (no forklift through a pallet stack)
  for (const m of recipe.movers) { const d = DEFS.get(m.def); if (!d || d.place === "water") continue; const pts = m.loop ? [...m.path, m.path[0]] : m.path;
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[2] - a[2]); if (L < 0.01) continue; keepOut.push({ id: `lane-${m.id}-${i}`, cx: (a[0] + b[0]) / 2, cz: (a[2] + b[2]) / 2, w: d.size[0] + 1.2, d: L + d.size[2] + 1.2, ry: Math.atan2(b[0] - a[0], b[2] - a[2]) }); } }
  const world = populate(recipe.rules, recipe.edges, recipe.areas, recipe.buildings, { seed, density, env, era: recipe.era, ground: (x, z) => groundY(recipe, x, z), camera, keepOut: keepOut.length ? keepOut.map((a) => ({ ...a, id: a.id })) : undefined });
  return { recipe, world };
};
/** ground height of a recipe at (x, z): the highest walkable piece under the point (+ terrain function) */
export const groundY = (r: Recipe, x: number, z: number) => { let y = -Infinity; for (const g of r.ground) { const a = g.area, c = Math.cos(-(a.ry ?? 0)), s = Math.sin(-(a.ry ?? 0)), lx = (x - a.cx) * c + (z - a.cz) * s, lz = -(x - a.cx) * s + (z - a.cz) * c; if (Math.abs(lx) <= a.w / 2 && Math.abs(lz) <= a.d / 2) y = Math.max(y, g.y); } return (y === -Infinity ? 0 : y) + (r.groundFn ? r.groundFn(x, z) : 0); };
/** footstep surface at a point (Audio 2.0 surface-aware footsteps) */
export const footSurfaceAt = (r: Recipe, x: number, z: number): FootSurface => { let best: GroundPiece | undefined; for (const g of r.ground) { const a = g.area; if (Math.abs(x - a.cx) <= a.w / 2 && Math.abs(z - a.cz) <= a.d / 2 && (!best || g.y >= best.y)) best = g; } return best?.foot ?? "concrete"; };
