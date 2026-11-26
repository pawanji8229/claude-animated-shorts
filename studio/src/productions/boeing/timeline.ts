// The Boeing film timeline: 1550 frames (= the narration, 51.644 s). Story layers (own camera, actors, world state)
// joined by planned opacity dissolves. The two-worlds reveal (J1 -> J2) is a dissolve between two IDENTICAL camera
// passes, with and without the roof + rooftop town, so the roof fades gradually to show the plant below.
// Beat frames come from the narration's word timings (see productions/boeing/STORYBOARD.md).
import { camPath } from "../london-bridge/common";
import { REST_L, REST_R } from "../../char/odo5";
import type { PCam } from "../centennial/Set";
import { ENGINEER, OFFICER, WORKERS, A, mixArm, sm, cl, lv, stand, walker, keys, aimArm, workArm, ft, type Act, type Placed } from "./actors";
import { FZ, FX, ROOF_Y, LINE, FUS_Y } from "./factory";
import { BUILD_LOTS, LOTS } from "./town";
import { OFFICE_AT, TABLE_Y, MODEL_C } from "./office";
import type { V3 } from "../../lib/math";

export const FPS = 30, FILM_FRAMES = 1550;
const N = FILM_FRAMES;
type CK = [number, V3, V3, number];
const rig = (keysC: CK[], sigma = 9, dof = 0.05) => { const p = camPath(keysC.map(([f, pos, look, fov]) => ({ f, pos, look, fov })), sigma);
  return (f: number): PCam => { const c = p(f); return { pos: c.pos, look: c.look, fov: c.fov, dof, focus: Math.hypot(c.pos[0] - c.look[0], c.pos[1] - c.look[1], c.pos[2] - c.look[2]) }; }; };
const lazy = <T,>(make: () => T) => { let v: T | undefined; return () => (v ??= make()); };
const O = (x: number, y: number, z: number): V3 => [OFFICE_AT[0] + x, OFFICE_AT[1] + y, OFFICE_AT[2] + z];
export type MoodName = "morning" | "aerial" | "inside" | "office";
export type Vehicle = { kind: "truck" | "car"; color: string; p: V3; ry: number; spin: number; load?: number };
export type LayerOut = {
  c: PCam; mood: MoodName; scene: "plant" | "office"; actors: Placed[];
  roof: boolean; town: "all" | "noBuild" | "none"; interior: boolean; door: number; build?: { lot: number; p: number }[];
  stripe?: { z: number; x0: number; x: number }; derrick?: { t: number; swing: number }; vehicles?: Vehicle[]; birds?: number;
  modelTrees?: V3[]; modelHouse?: V3 | null; heldTree?: V3 | null; heldHouse?: V3 | null; panel?: [V3, V3] | null; prop: number;
};

// ================================================================= A: the impossible neighbourhood (low aerial over the roof -> over the edge, look back)
export const camA = lazy(() => rig([
  [-70, [-34, 36, -52], [-6, 19, -6], 46], [0, [-28, 34, -40], [-2, 18.5, 4], 46], [60, [-14, 31, -6], [4, 18, 34], 45],
  [100, [-2, 29, 40], [6, 15, 80], 46], [140, [8, 26, 108], [2, 13, 40], 48], [180, [12, 29, 122], [0, 13, 36], 50],
], 10));
const plantAt = (f: number) => ({ prop: f * 0.9 });
export const layerA = (f: number): LayerOut => ({ c: camA()(f), mood: "morning", scene: "plant", actors: streetPeople(f), roof: true, town: "all", interior: false, door: 0.15, vehicles: streetVehicles(f), birds: 1, ...plantAt(f) });

// ================================================================= B: from above it looks normal (rise to a high aerial)
export const camB = lazy(() => rig([[156, [11, 28.5, 118], [0, 13, 36], 50], [205, [-30, 90, 190], [0, 6, 10], 46], [266, [-120, 230, 330], [0, 0, -20], 42]], 10));
export const layerB = (f: number): LayerOut => ({ c: camB()(f), mood: "aerial", scene: "plant", actors: [], roof: true, town: "all", interior: false, door: 0.15, vehicles: streetVehicles(f), birds: 1, ...plantAt(f) });

// ================================================================= C: Boeing's enormous factory in Seattle (street level along the façade)
export const camC = lazy(() => rig([[246, [72, 13, 92], [20, 8, 60], 50], [320, [40, 3.6, 88], [4, 7.5, 64], 54], [424, [12, 2.7, 81], [0, 5.2, 58], 58]], 10, 0.06));
export const truckX = (f: number) => 130 - 106 * sm(250, 390, f);
export const streetVehicles = (f: number): Vehicle[] => [
  { kind: "truck", color: "#3a4a3a", p: [truckX(f), 0, FZ + 13], ry: Math.PI, spin: (130 - truckX(f)) / 0.48, load: 1 },
  { kind: "car", color: "#2a2e3a", p: [-40, 0, FZ + 21], ry: 0, spin: 0 }, { kind: "car", color: "#5a3a2a", p: [52, 0, FZ + 21], ry: Math.PI, spin: 0 },
  { kind: "car", color: "#3a4a5a", p: [-70 + ((f * 0.35) % 260), 0, FZ + 17.5], ry: 0, spin: f * 0.35 / 0.34 },
  { kind: "truck", color: "#6a5a3a", p: [6, 0, FZ + 12], ry: 0, spin: 0, load: 1 },     // supply truck under the derrick
];
const STREET_WORKERS: { a: Act; path: [number, V3][] }[] = [
  { a: { c: WORKERS[0], seed: 61, face: ft([[0, "content"]]) }, path: [[290, [12, 0, FZ + 5]], [440, [7, 0, FZ - 1.5]]] },
  { a: { c: WORKERS[3], seed: 62, face: ft([[0, "talking"], [360, "content"]]) }, path: [[250, [17, 0, FZ + 7]], [440, [9, 0, FZ + 0]]] },
  { a: { c: WORKERS[4], seed: 63, face: ft([[0, "content"]]) }, path: [[240, [-6, 0, FZ + 7]], [440, [-1, 0, FZ - 2]]] },
  { a: { c: WORKERS[1], seed: 64, face: ft([[0, "bored"]]) }, path: [[250, [34, 0, FZ + 6.5]], [440, [24, 0, FZ + 6.5]]] },
  { a: { c: WORKERS[5], seed: 65, face: ft([[0, "focused"]]) }, path: [[230, [-24, 0, FZ + 7]], [440, [-14, 0, FZ + 6.5]]] },
];
export const streetPeople = (f: number, cam?: PCam): Placed[] => { const c = cam ?? camC()(f); return STREET_WORKERS.map((w) => walker(w.a, keys(w.path), f, c, w.path[0][0])); };
export const layerC = (f: number): LayerOut => { const c = camC()(f);
  return { c, mood: "morning", scene: "plant", actors: streetPeople(f, c), roof: true, town: "all", interior: true, door: doorC(f), vehicles: streetVehicles(f), birds: 0.4, ...plantAt(f) }; };
export const DOOR_OPEN = [262, 350] as const;
const doorC = (f: number) => 0.15 + 0.67 * sm(DOOR_OPEN[0], DOOR_OPEN[1], f);

// ================================================================= D: inside, workers building military aircraft
export const camD = lazy(() => rig([[406, [10, 3.0, 78], [0, 4.5, 50], 58], [462, [6, 4.2, 44], [-16, 3.6, 28], 56], [526, [-14, 4.6, 36.5], [-30, 3.0, 26], 54]], 9, 0.06));
export const RIVETERS: { a: Act; at: V3 }[] = LINE.filter(([, , s]) => s <= 2).slice(0, 10).flatMap(([x, z], i) => [
  { a: { c: WORKERS[(i * 2 + 3) % 7], seed: 70 + i * 2, face: ft([[0, i % 2 ? "focused" : "comicSerious"]]), armR: workArm(0.9 + i * 0.07, i * 1.3), armL: () => A([-50, 40], "grip", -1, -1.0) }, at: [x + 2 - (i % 3) * 3, FUS_Y + 0.34, z + 1.85] as V3 },
  { a: { c: WORKERS[(i * 2 + 4) % 7], seed: 71 + i * 2, face: ft([[0, "focused"]]), armR: workArm(1.1 - i * 0.04, i * 0.7 + 2), armL: () => A([-40, 60], "grip", -1, -0.8) }, at: [x - 3 + (i % 2) * 2, FUS_Y + 0.34, z - 1.85] as V3 },
]);
const FLOOR_WALK: { a: Act; path: [number, V3][] }[] = [
  { a: { c: WORKERS[2], seed: 91, face: ft([[0, "content"]]), armR: () => A([90, 10], "grip", 1, 1.2) }, path: [[380, [-5, 0, 8]], [560, [4, 0, 8]]] },
  { a: { c: WORKERS[6], seed: 92, face: ft([[0, "talking"]]) }, path: [[380, [6, 0, 44]], [560, [-4, 0, 43]]] },
  { a: { c: WORKERS[0], seed: 93, face: ft([[0, "focused"]]) }, path: [[380, [-14, 0, 20]], [560, [-10, 0, 30]]] },
  { a: { c: WORKERS[5], seed: 94, face: ft([[0, "bored"]]) }, path: [[1360, [-22, 0, 8]], [1550, [-10, 0, 9]]] },
  { a: { c: WORKERS[3], seed: 95, face: ft([[0, "content"]]) }, path: [[1360, [-6, 0, -9]], [1550, [-18, 0, -10]]] },
];
const insidePeople = (f: number, c: PCam): Placed[] => [...RIVETERS.map((r) => stand(r.a, r.at, f, { lookX: -0.4 })), ...FLOOR_WALK.filter((w) => f >= w.path[0][0] - 40 && f <= w.path[w.path.length - 1][0] + 40).map((w) => walker(w.a, keys(w.path), f, c, w.path[0][0]))];
export const layerD = (f: number): LayerOut => { const c = camD()(f); return { c, mood: "inside", scene: "plant", actors: insidePeople(f, c), roof: true, town: "none", interior: true, door: 0.82, ...plantAt(f) }; };

// ================================================================= E1/E2: the office — concern, the trees that cannot hide it, the ridiculous idea
const OFF_HERO: V3 = O(0.6, 0, -1.0), OFF_OFC: V3 = O(-0.62, 0, -1.0);
export const camE = lazy(() => rig([[506, O(0.15, 2.45, 2.5), O(0, 0.95, -0.4), 50], [700, O(0.08, 2.25, 2.15), O(0, 0.95, -0.35), 50], [800, O(0.0, 2.05, 1.85), O(0, 0.92, -0.3), 50], [904, O(0.05, 1.7, 1.3), O(0.02, 0.9, -0.2), 52]], 10, 0.08));
const TRAY: V3 = O(0.62, TABLE_Y + 0.04, 0.42);
const TREE_SPOTS: V3[] = [O(0.2, MODEL_C[1] + 0.0, 0.4), O(-0.26, MODEL_C[1], 0.4)];
const ROOF_SPOT: V3 = O(0.04, MODEL_C[1] + 16.4 / 200, 0.02);
const heroE: Act = { c: ENGINEER, seed: 1, h: 1.55, face: ft([[500, "content"], [560, "focused"], [690, "tinyConfused"], [740, "focused"], [766, "frozenSmile"], [790, "awkwardSmile"], [816, "idea"], [850, "delighted"], [880, "proud"]]) };
const ofcE: Act = { c: OFFICER, seed: 4, face: ft([[500, "suspicious"], [548, "worried"], [598, "suspSquint"], [628, "comicSerious"], [700, "xSideEyeL"], [764, "xDisbelief"], [800, "deadpan"], [836, "xDisbelief"], [868, "doubleTake"], [884, "cringe"]]) };
/** where the hero's hand is (and what it carries): tree 1 670-765, tree 2 770-800, house 840-875 */
const handPath = (f: number): { p: V3; tree: boolean; house: boolean } => {
  const t1 = sm(690, 752, f), t2 = sm(772, 798, f), h1 = sm(842, 872, f);
  if (f < 690) return { p: TRAY, tree: f > 672, house: false };
  if (f < 766) return { p: lv(TRAY, [TREE_SPOTS[0][0], TREE_SPOTS[0][1] + 0.05, TREE_SPOTS[0][2]], t1), tree: f < 760, house: false };
  if (f < 800) return { p: lv(TRAY, [TREE_SPOTS[1][0], TREE_SPOTS[1][1] + 0.05, TREE_SPOTS[1][2]], t2), tree: f < 797 && f > 770, house: false };
  if (f < 842) return { p: TRAY, tree: false, house: f > 830 };
  return { p: lv(TRAY, [ROOF_SPOT[0], ROOF_SPOT[1] + 0.03, ROOF_SPOT[2]], h1), house: f < 872, tree: false };
};
export const layerE = (f: number): LayerOut => { const c = camE()(f), hp = handPath(f);
  const hero = stand(heroE, OFF_HERO, f, { lookY: 0.55, lookX: -0.4 }), ofc = stand(ofcE, OFF_OFC, f, { lookY: f > 620 && f < 660 ? -0.9 : 0.5, lookX: f > 690 && f < 830 ? 0.8 : 0.3 });
  const reach = sm(668, 682, f) * (1 - sm(878, 892, f));
  hero.pose = { ...hero.pose, armR: mixArm(REST_R, aimArm(hero, c.pos, hp.p, 1, A([0, 0], "grip", 1, 1.0)), reach) };
  const point = sm(596, 610, f) * (1 - sm(650, 664, f));
  ofc.pose = { ...ofc.pose, armL: mixArm(A([-60, 60], "relaxed", -1, -0.6), A([-90, -200], "open", -1, -2.6, [-110, -60]), point), armR: f > 836 ? A([70, -40], "open", 1, 2.4, [110, 30]) : REST_R };
  const trees: V3[] = []; if (f >= 760) trees.push(TREE_SPOTS[0]); if (f >= 797) trees.push(TREE_SPOTS[1]);
  return { c, mood: "office", scene: "office", actors: [ofc, hero], roof: true, town: "none", interior: false, door: 0, modelTrees: trees, modelHouse: f >= 872 ? ROOF_SPOT : null,
    heldTree: hp.tree ? [hp.p[0], hp.p[1] - 0.04, hp.p[2]] : null, heldHouse: hp.house ? [hp.p[0], hp.p[1] - 0.02, hp.p[2]] : null, prop: 0 };
};

// ================================================================= F: building the neighbourhood on the roof
export const camF = lazy(() => rig([[880, [-30, 25.5, -9], [-13, 17.2, 4], 48], [990, [-13, 25.0, -9.5], [-5, 17.2, 4], 48], [1116, [8, 25.3, -9], [2, 17.2, 5], 48]], 10, 0.05));
export const BUILD_START: Record<number, number> = Object.fromEntries(BUILD_LOTS.map((l, i) => [l, 870 + [20, 0, 40, 70, 95, 120][i]]));
const lotS = (i: number) => LOTS.find((l) => l.i === i)!.s;
const R = ROOF_Y + 0.05;
const fWorkers = (f: number, c: PCam): Placed[] => { const out: Placed[] = []; const s0 = lotS(BUILD_LOTS[1]), s3 = lotS(BUILD_LOTS[4]);
  out.push(stand({ c: WORKERS[2], seed: 81, face: ft([[0, "focused"], [1000, "comicSerious"]]), armR: workArm(HAMMER[0].rate, HAMMER[0].ph), armL: () => A([-40, 60], "grip", -1, -0.9) }, [s0.x + 4.6, R, s0.z - 0.6], f, { holdR: "hammer" }));
  out.push(stand({ c: WORKERS[5], seed: 82, face: ft([[0, "focused"]]), armR: workArm(HAMMER[1].rate, HAMMER[1].ph), armL: () => A([-40, 60], "grip", -1, -0.9) }, [lotS(BUILD_LOTS[0]).x - 4.4, R, lotS(BUILD_LOTS[0]).z - 0.4], f, { holdR: "hammer" }));
  // painter following the roller along the road stripe
  out.push(walker({ c: WORKERS[6], seed: 83, face: ft([[0, "focused"], [1040, "content"]]), armR: () => A([80, 40], "grip", 1, 1.0) }, (g) => [stripeX(g) + 1.0, R, 0.7], f, c, 880, { lean: 0.18 }));
  // two carriers with a canvas wall panel walking along the avenue
  const P1 = keys([[880, [-21, R, -2.4]], [1080, [-11, R, -2.4]], [1116, [-11, R, -2.4]]]), P2 = (g: number): V3 => { const p = P1(g); return [p[0] + 2.6, p[1], p[2]]; };
  out.push(walker({ c: WORKERS[0], seed: 84, face: ft([[0, "content"]]), armR: () => A([60, -20], "grip", 1, 2.0), armL: () => A([-60, -20], "grip", -1, -2.0) }, P1, f, c, 880));
  out.push(walker({ c: WORKERS[1], seed: 85, face: ft([[0, "talking"]]), armR: () => A([60, -20], "grip", 1, 2.0), armL: () => A([-60, -20], "grip", -1, -2.0) }, P2, f, c, 880));
  // the hero inspects with a clipboard-less side-eye
  out.push(stand({ c: ENGINEER, seed: 1, h: 1.55, face: ft([[880, "content"], [960, "proud"], [1040, "oneBrowUp"]]) }, [-8, R, -6.5], f, { lookX: 0.6 }));
  return out; };
export const HAMMER = [{ rate: 0.42, ph: 0.2 }, { rate: 0.36, ph: 1.4 }];
export const STRIPE = { x0: -14, from: -8, to: -1, f0: 950, f1: 1110 };
export const stripeX = (f: number) => STRIPE.from + (STRIPE.to - STRIPE.from) * cl((f - STRIPE.f0) / (STRIPE.f1 - STRIPE.f0));   // steady walking pace
export const layerF = (f: number): LayerOut => { const c = camF()(f), P1 = keys([[880, [-21, R, -2.4]], [1080, [-11, R, -2.4]], [1116, [-11, R, -2.4]]])(f);
  return { c, mood: "morning", scene: "plant", actors: fWorkers(f, c), roof: true, town: "noBuild", interior: false, door: 0.15, build: BUILD_LOTS.map((l) => ({ lot: l, p: sm(BUILD_START[l], BUILD_START[l] + 150, f) })),
    stripe: { z: 0, x0: STRIPE.x0, x: stripeX(f) }, derrick: { t: sm(900, 990, f), swing: sm(990, 1030, f) * 1.1 }, vehicles: streetVehicles(f), birds: 0.6, panel: [[P1[0] - 0.2, R + 1.15, P1[2] - 0.05], [P1[0] + 2.8, R + 1.15, P1[2] - 0.05]], ...plantAt(f) }; };

// ================================================================= G: from the ground — a collection of props (behind the façades)
export const camG = lazy(() => rig([[1096, [-54, R + 2.4, 19.5], [-24, R + 1.4, 12.5], 50], [1170, [-44, R + 2.2, 19.6], [-14, R + 1.4, 12.5], 50], [1244, [-35, R + 2.2, 19.8], [-6, R + 1.5, 12.5], 50]], 10, 0.06));
const heroG: Act = { c: ENGINEER, seed: 1, h: 1.55, face: ft([[1100, "content"], [1150, "xSideEyeR"], [1190, "suspSquint"], [1210, "uncomfyGrin"]]), armL: () => A([-70, -10], "grip", -1, -1.6, [-100, 20]) };
export const layerG = (f: number): LayerOut => { const c = camG()(f), s = lotS(BUILD_LOTS[1]);
  const pr = walker({ c: WORKERS[3], seed: 86, face: ft([[0, "content"]]), armR: () => A([70, -60], "grip", 1, 2.3) }, keys([[1100, [-12, R, 13.2]], [1244, [-20, R, 13.2]]]), f, c, 1100);
  return { c, mood: "morning", scene: "plant", actors: [stand(heroG, [-25, R, 16.6], f, { lookX: 0.7 }), pr], roof: true, town: "all", interior: false, door: 0.15, vehicles: streetVehicles(f), birds: 0.4, ...plantAt(f) }; };

// ================================================================= H: from high in the sky it blends in
export const camH = lazy(() => rig([[1226, [24, R + 4, 22], [34, R + 2, -10], 52], [1300, [70, 70, 130], [0, 10, 0], 46], [1384, [-110, 250, 320], [0, 0, -30], 42]], 10));
export const layerH = (f: number): LayerOut => ({ c: camH()(f), mood: "aerial", scene: "plant", actors: [], roof: true, town: "all", interior: false, door: 0.15, vehicles: streetVehicles(f), birds: 0.6, ...plantAt(f) });

// ================================================================= J1/J2: the two worlds — the roof dissolves away, the real factory keeps working
export const camJ = lazy(() => rig([[1370, [-60, 110, 120], [0, 12, 0], 44], [1430, [-40, 62, 58], [-10, 6, 0], 46], [1500, [-26, 36, 34], [-16, 2, 4], 50], [1520, [-24, 34, 31], [-16, 2, 4], 50]], 10));
export const layerJ1 = (f: number): LayerOut => ({ c: camJ()(f), mood: "morning", scene: "plant", actors: [], roof: true, town: "all", interior: false, door: 0.15, vehicles: streetVehicles(f), birds: 0.4, ...plantAt(f) });
export const layerJ2 = (f: number): LayerOut => { const c = camJ()(f); return { c, mood: "morning", scene: "plant", actors: insidePeople(f, c), roof: false, town: "none", interior: true, door: 0.15, vehicles: streetVehicles(f), birds: 0.2, ...plantAt(f) }; };

// ================================================================= layers + dissolves (A_LOOP = layer A's pre-roll -> frame 1549 flows into frame 0)
export type Layer = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "J1" | "J2" | "A_LOOP";
export const LAYERS: [Layer, number, number, number, number][] = [
  ["A", 0, 0, 158, 178], ["B", 158, 178, 248, 268], ["C", 248, 268, 408, 424], ["D", 408, 424, 506, 526], ["E", 506, 526, 884, 904],
  ["F", 884, 904, 1098, 1116], ["G", 1098, 1116, 1228, 1246], ["H", 1228, 1246, 1370, 1388], ["J1", 1370, 1388, 1412, 1452], ["J2", 1412, 1452, N, N], ["A_LOOP", 1494, N, N, N],
];
export const layerOpacity = (Lr: (typeof LAYERS)[number], f: number) => { const [, a, b, c, d] = Lr; if (f < a || (f >= d && d < N)) return 0; const up = b > a ? sm(a, b, f) : 1; const dn = d > c ? 1 - sm(c, d, f) : 1; return Math.min(up, dn); };
const FN: Record<Exclude<Layer, "A_LOOP">, (f: number) => LayerOut> = { A: layerA, B: layerB, C: layerC, D: layerD, E: layerE, F: layerF, G: layerG, H: layerH, J1: layerJ1, J2: layerJ2 };
export const layerAt = (L: Layer, f: number): LayerOut => L === "A_LOOP" ? layerA(f - N) : FN[L](f);
void FX; void cl; void REST_L;
