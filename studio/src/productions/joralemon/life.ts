// joralemon life (pure functions of the film frame): today's pedestrians (each with its own walk, speed, prop, face,
// timing - nobody synchronised, nobody notices No. 58), a dog walker + dog, a cyclist, traffic + parked cars (all
// PERIODIC over the film length, so the last frame flows into frame 0); the 1847 family; the 1907 works (crew with hand
// carts, tunnel gang, lorry with the fan, derrick, engineer with plan + model, two residents) and the conversion crew.
import { V3, lerp, smooth, clamp01, rng } from "../../lib/math";
import { pose5, COSTUME, REST_L, REST_R, type Odo5Pose, type Costume } from "../../char/odo5";
import { FACES, faceTrack, withFace, type FaceName } from "../short3/expr";
import { SW_Y, PF, LANE, PARK_N, PARK_S, FILM_FRAMES, XF, eraAt, TUN } from "./world";
import type { Placed } from "./timeline";
import type { CarType } from "./vehicles";

const N = FILM_FRAMES;
const tint = (c: Costume, pal: Record<string, string>, hat?: Costume["hat"]): Costume => ({ ...c, apron: false, goggles: false, pal: { ...(c.pal ?? {}), ...pal }, ...(hat !== undefined ? { hat } : {}) });
const gait = (c: Costume, d: number, walking: number, stride: number, extra: Partial<Odo5Pose> = {}) => pose5({ costume: c, view: walking > 0.02 ? "side" : "front", gait: d / stride, walk: walking, stride, lean: 0.04 * walking, ...extra });
const wrap = (f: number, t0: number) => ((f - t0) % N + N) % N;   // periodic time since t0
const blinkAt = (f: number, seed: number) => ((f + seed * 37) % (71 + (seed % 5) * 9)) < 3;
const nowOn = (f: number) => f < XF.home[1] || f >= XF.now[0];

// ---------------------------------------------------------------- today: pedestrians
type Ped = { c: Costume; t0: number; x0: number; v: number; z: number; h: number; prop?: Odo5Pose["holdR"]; face: FaceName; stride: number; dog?: boolean; seed: number };
const SHIRTS = ["#3b4a5c", "#8a4a3a", "#556b4a", "#6a5a7a", "#2a2a33", "#b0703a", "#3a5a6a", "#7a3a52", "#4a6a8a", "#9a8a5a", "#5a6a3a"];
const BASES = [COSTUME.clerk, COSTUME.hal, COSTUME.workerA, COSTUME.odo];
const mkPeds = (): Ped[] => { const r = rng(808), out: Ped[] = [];
  const add = (t0: number, x0: number, dir: 1 | -1, z: number, prop?: Odo5Pose["holdR"], extra: Partial<Ped> = {}) => { const base = BASES[Math.floor(r() * BASES.length)];
    out.push({ c: tint(base, { shirt: SHIRTS[Math.floor(r() * SHIRTS.length)], shirtShade: "#2a2a2a", hair: ["#3a2a1e", "#6b4a2e", "#2a2a2a", "#c9b090", "#8a5a32"][Math.floor(r() * 5)] }, r() < 0.25 ? "bowler" : null),
      t0, x0, v: dir * (1.15 + r() * 0.5), z, h: 1.42 + r() * 0.14, prop, face: (["content", "bored", "neutral", "talking", "deadpan", "content"] as FaceName[])[Math.floor(r() * 6)], stride: 0.7 + r() * 0.12, seed: out.length + 3, ...extra }); };
  // north sidewalk (z 3.95 / 4.3): the S05 passers-by cross in front of the stoop around frames 335-365
  add(252, 4.5, -1, 3.95, "grocery", { v: -1.3, face: "content" });                  // neighbour with a shopping bag
  add(222, -5.5, 1, 4.45, undefined, { v: 1.05, dog: true, face: "bored" });         // dog walker
  add(1360, 9, -1, 4.25, "cup", { face: "content" }); add(1300, -9, 1, 4.3, "briefcase", { face: "deadpan" }); add(1335, 12, -1, 3.95, "grocery", { face: "bored" });
  add(1110, -12, 1, 4.25); add(1180, 10, -1, 4.0, "cup"); add(20, 11, -1, 4.25, "briefcase"); add(1430, -14, 1, 4.25, "grocery");
  add(160, 12, -1, 4.25, "cup"); add(230, -12, 1, 4.0); add(N - 60, 9, -1, 15.2, "grocery"); add(N - 200, 16, -1, 15.2, "bag");
  // far sidewalk (z 15.1 / 15.6)
  for (const [t0, dir] of [[0, 1], [140, -1], [260, 1], [380, -1], [1080, 1], [1200, -1], [1290, 1], [1390, -1]] as [number, 1 | -1][]) add(t0, dir > 0 ? -22 : 22, dir, r() < 0.5 ? 15.15 : 15.6, r() < 0.3 ? "bag" : r() < 0.5 ? "briefcase" : undefined);
  return out; };
export const PEDS = mkPeds();
export const pedsAt = (f: number): Placed[] => { if (!nowOn(f)) return [];
  return PEDS.flatMap((p) => { const t = wrap(f, p.t0) / 30, d = Math.abs(p.v) * t, x = p.x0 + Math.sign(p.v) * d; if (Math.abs(x) > 34) return [];
    const face = withFace(gait(p.c, d, 1, p.stride, { holdR: p.prop, blink: blinkAt(f, p.seed), lookX: p.face === "talking" ? 0.6 : 0.2 }), FACES[p.face], f, p.seed);
    return [{ pose: face, pos: [x, SW_Y, p.z] as V3, h: p.h, flip: p.v < 0, halo: 0.08 }]; }); };
/** dog of the dog walker: trots 0.9 m ahead on the kerb side */
export const dogsAt = (f: number): { pos: V3; flip: boolean; phase: number }[] => { if (!nowOn(f)) return [];
  return PEDS.filter((p) => p.dog).flatMap((p) => { const t = wrap(f, p.t0) / 30, d = Math.abs(p.v) * t, x = p.x0 + Math.sign(p.v) * (d + 0.95); if (Math.abs(x) > 34) return [];
    return [{ pos: [x, SW_Y, p.z + 0.35] as V3, flip: p.v < 0, phase: d / 0.55 }]; }); };
export const leashes = (f: number): { a: V3; b: V3 }[] => { if (!nowOn(f)) return [];
  return PEDS.filter((p) => p.dog).flatMap((p) => { const t = wrap(f, p.t0) / 30, d = Math.abs(p.v) * t, x = p.x0 + Math.sign(p.v) * d, s = Math.sign(p.v); if (Math.abs(x) > 34) return [];
    return [{ a: [x + s * 0.18, SW_Y + 0.8, p.z + 0.05] as V3, b: [x + s * 0.9, SW_Y + 0.36, p.z + 0.33] as V3 }]; }); };

// ---------------------------------------------------------------- today: cyclist + traffic (periodic)
export const cyclistAt = (f: number): { pos: V3; spin: number; pose: Odo5Pose; flip: boolean } | null => { if (!nowOn(f)) return null;
  for (const [fc, v] of [[60, 5.2], [1372, 5.0]] as [number, number][]) { let t = f - fc; if (t > N / 2) t -= N; if (t < -N / 2) t += N; const x = (t * v) / 30; if (Math.abs(x) > 60) continue;
    const c = tint(COSTUME.workerA, { shirt: "#c84a2a", shirtShade: "#9a3a20", hat: "#e8e8e0", hatShade: "#b8b8b0" }, "hard");
    const pose = withFace(gait(c, (x + 60) * 0.6, 1, 0.7, { lean: 0.22, armR: { hand: [80, 40], elbow: [60, 60], shape: "grip", rot: 0, bend: 1 } }), FACES.content, f, 77);
    return { pos: [x, 0.0, LANE - 1.6], spin: (x + 60) / 0.34, pose, flip: false }; } return null; };
type CarRun = { fc: number; v: number; type: CarType; color: string };
export const RUNS: CarRun[] = [{ fc: 52, v: 8.5, type: "sedan", color: "#2b3f5a" }, { fc: 205, v: 9.0, type: "suv", color: "#7a7d80" }, { fc: 352, v: 8.0, type: "hatch", color: "#8a2a22" },
  { fc: 1185, v: 8.8, type: "van", color: "#e8e6e0" }, { fc: 1262, v: 8.5, type: "sedan", color: "#1c1d20" }, { fc: 1356, v: 9.0, type: "hatch", color: "#3a6a5a" }];
export const carsAt = (f: number): { p: V3; ry: number; spin: number; type: CarType; color: string }[] => { if (!nowOn(f)) return [];
  return RUNS.flatMap((c) => { let t = f - c.fc; if (t > N / 2) t -= N; if (t < -N / 2) t += N; const x = (t * c.v) / 30; if (Math.abs(x) > 85) return []; return [{ p: [x, 0.0, LANE] as V3, ry: 0, spin: x / 0.33, type: c.type, color: c.color }]; }); };
export const PARKED: { p: V3; ry: number; type: CarType; color: string }[] = [
  ...[[-31, "suv", "#5a5e62"], [-25.2, "sedan", "#a8acb0"], [-19.8, "hatch", "#2c4a6a"], [9.6, "sedan", "#6a1e1e"], [15.4, "van", "#d8d6d0"], [21.6, "hatch", "#e2c23a"], [27.3, "sedan", "#202224"]].map(([x, t, c]) => ({ p: [x as number, 0, PARK_N] as V3, ry: 0, type: t as CarType, color: c as string })),
  ...[[-27, "sedan", "#3a3d42"], [-21.2, "suv", "#1f2a1f"], [-15.6, "hatch", "#9aa0a6"], [-9.8, "sedan", "#5a2a3a"], [-4.0, "van", "#2a3a5a"], [1.9, "sedan", "#c8c8c4"], [7.6, "suv", "#4a4a4c"], [13.4, "hatch", "#2a6a8a"], [19.2, "sedan", "#7a5a3a"], [25.1, "sedan", "#e0e0dc"]].map(([x, t, c]) => ({ p: [x as number, 0, PARK_S] as V3, ry: Math.PI, type: t as CarType, color: c as string })),
];

// ---------------------------------------------------------------- 1847: the family in the parlour (world == No. 58-local here)
const MOTHER = tint(COSTUME.clerk, { shirt: "#6a2f45", shirtShade: "#4f2234", collar: "#f4ecda", tie: "#6a2f45", hair: "#5a3a26" }, null);
const FATHER = tint(COSTUME.hal, { shirt: "#3a3f52", shirtShade: "#2a2d3c", hair: "#4a3a2a", tie: "#2a2622" }, null);
const CHILD = tint(COSTUME.odo, { shirt: "#3f7a5a", shirtShade: "#2f5f45", hair: "#8a5a32" }, null);
export const familyAt = (f: number): Placed[] => { if (eraAt(f) === "now" && f > 600) return [];
  const turn = ((f - 470) % 70) < 8; const mom = withFace(pose5({ costume: MOTHER, holdR: "book", lookY: 0.45, armR: { hand: [-20, 40], elbow: [60, 90], shape: "grip", rot: 0.0, bend: 1 }, armL: { hand: [20, 40], elbow: [-60, 90], shape: "grip", rot: 0, bend: -1 }, blink: blinkAt(f, 4) }), FACES[turn ? "focused" : "content"], f, 41);
  const pull = Math.sin(f * 0.11) * 0.5 + 0.5; const dad = withFace(pose5({ costume: FATHER, lookX: 0.8, lookY: -0.2, armR: { hand: [70, lerp(-150, -120, pull)], elbow: [80, -30], shape: "grip", rot: 0.2, bend: 1 }, blink: blinkAt(f, 6) }), FACES.content, f, 42);
  const u = smooth(498, 560, f), cx = lerp(2.2, -0.55, u), cz = lerp(-6.3, -4.85, u), kid = withFace(gait(CHILD, u * 3.0, f > 498 && f < 560 ? 1 : 0, 0.5, { blink: blinkAt(f, 9) }), FACES.delighted, f, 43);
  return [{ pose: mom, pos: [1.0, PF + 0.12, -3.85], h: 1.42, halo: 0.12, light: 0.8 }, { pose: dad, pos: [1.75, PF, -1.05], h: 1.55, halo: 0.12 }, { pose: kid, pos: [cx, PF, cz], h: 1.0, flip: true, halo: 0.12 }]; };

// ---------------------------------------------------------------- 1907: the works
export const ENGINEER = tint(COSTUME.clerk, { shirt: "#4a4a3a", shirtShade: "#363628", hat: "#2a2622", tie: "#7a2d22" }, "bowler");
const CREW: Costume[] = ["#7a5a3a", "#4a5f3a", "#6c3f34", "#3c4b63", "#8a7a5a", "#5a3f5f"].map((s, i) => tint(i % 2 ? COSTUME.workerB : COSTUME.workerA, { shirt: s, shirtShade: "#2a2a2a", hat: "#3a3a3a", hatShade: "#222" }, i % 3 === 0 ? "bowler" : null));
export const TRESTLE: V3 = [-3.2, 0, 9.0], FAN_SITE: V3 = [4.3, 0, 8.4], DERRICK_AT: V3 = [7.4, 0, 10.6], LORRY_PARK: V3 = [2.2, 0, 6.4];
const worksOn = (f: number) => f >= XF.works[0] && f < XF.now[1];
/** crew: walk in from the west with carts (588-640), then each works in place on their own rhythm */
const CREW_X0 = -15;
export const CREW_PLAN: { t0: number; to: V3; tool: Odo5Pose["holdR"]; rate: number; cart?: boolean }[] = [
  { t0: 586, to: [-0.6, 0, 7.6], tool: "shovel", rate: 0.9, cart: true }, { t0: 598, to: [1.2, 0, 9.8], tool: "hammer", rate: 1.3 }, { t0: 606, to: [5.6, 0, 7.4], tool: "wrench", rate: 0.7 },
  { t0: 594, to: [-6.4, 0, 10.4], tool: "shovel", rate: 1.1, cart: true }, { t0: 612, to: [6.6, 0, 9.4], tool: "hammer", rate: 1.0 }, { t0: 602, to: [-1.8, 0, 10.6], tool: undefined, rate: 0 },
];
export const crewAt = (f: number): (Placed & { cart?: { p: V3; spin: number } })[] => { if (!worksOn(f)) return [];
  return CREW_PLAN.map((c, i) => { const x0 = CREW_X0 - i * 1.6, u = clamp01((f - c.t0) / 50), s = u * u * (3 - 2 * u), x = lerp(x0, c.to[0], s), z = lerp(c.to[2] + 0.8, c.to[2], s);
    const walking = u > 0 && u < 1 ? 1 : 0, d = Math.abs(x - x0);
    const work = u >= 1 && c.tool && f < 980; const ph = (f * c.rate) / 30 + i * 0.37, up = Math.max(0, Math.sin(ph * Math.PI * 2));
    const pointing = i === 5 && f > 730 && f < 775;
    const pose = walking ? gait(CREW[i], d, 1, 0.72, { blink: blinkAt(f, i + 20) }) : pose5({ costume: CREW[i], holdR: work ? c.tool : undefined, blink: blinkAt(f, i + 20),
      armR: pointing ? { hand: [-140, -20], elbow: [-60, 40], shape: "open", rot: -1.4, bend: 1 } : work ? { hand: [50, lerp(90, -110, up)], elbow: [80, lerp(60, -10, up)], shape: "grip", rot: lerp(0.4, -2.2, up), bend: 1 } : REST_R, armL: REST_L, lean: work ? 0.12 * (1 - up) : 0 });
    const faced = withFace(pose, FACES[pointing ? "idea" : work ? (up > 0.7 ? "focused" : "neutral") : (["content", "bored", "talking"] as FaceName[])[i % 3]], f, 60 + i);
    return { pose: faced, pos: [x, c.to[1] + 0.0, z] as V3, h: 1.5, flip: false, halo: 0.1, cart: c.cart ? { p: [x + 1.1, 0, z + 0.05] as V3, spin: d / 0.5 } : undefined }; }); };
/** tunnel gang (S08): three men at the shield face */
export const tunnelGangAt = (f: number, front: number): Placed[] => { if (!worksOn(f) || f > 720) return [];
  return [0, 1, 2].map((i) => { const ph = (f * (0.8 + i * 0.27)) / 30 + i * 0.4, up = Math.max(0, Math.sin(ph * Math.PI * 2));
    const pose = withFace(pose5({ costume: CREW[(i + 2) % 6], holdR: i === 1 ? "hammer" : "shovel", armR: { hand: [50, lerp(80, -100, up)], elbow: [80, lerp(60, 0, up)], shape: "grip", rot: lerp(0.4, -2.0, up), bend: 1 }, blink: blinkAt(f, i + 40) }), FACES[up > 0.6 ? "focused" : "neutral"], f, 70 + i);
    return { pose, pos: [front - 1.6 - i * 1.3, TUN.y - TUN.r + 0.55, TUN.z - 0.6 + i * 0.5] as V3, h: 1.45, halo: 0.1, light: 1.2 }; }); };
/** the lorry with the fan: drives in 682-712 and parks; the derrick lifts the fan 716-748 onto its foundation */
export const lorryAt = (f: number): { p: V3; spin: number; fanOn: boolean } | null => { if (!worksOn(f) || f < 670 || f > 1000) return null;
  const u = smooth(672, 712, f), away = smooth(770, 830, f), x = lerp(-40, LORRY_PARK[0], 1 - (1 - u) * (1 - u)) + away * away * 40; if (x > 45) return null; return { p: [x, 0, LORRY_PARK[2]], spin: (x + 40) / 0.5, fanOn: f < 716 }; };
export const fanLift = (f: number): { hook: V3; slew: number; luff: number; fanAt: V3 | null; spin: number } => {
  const a = smooth(712, 724, f), b = smooth(724, 748, f), back = smooth(752, 768, f);
  const pick: V3 = [LORRY_PARK[0] - 0.8, 1.9, LORRY_PARK[2]], drop: V3 = [FAN_SITE[0], 1.45, FAN_SITE[2]];
  const at: V3 = f < 724 ? pick : [lerp(pick[0], drop[0], b), lerp(pick[1], drop[1], b) + Math.sin(b * Math.PI) * 1.6, lerp(pick[2], drop[2], b)];
  const rel = (p: V3) => [p[0] - DERRICK_AT[0], p[2] - DERRICK_AT[2]] as [number, number];
  const [dx, dz] = rel(f < 748 ? at : drop), slew = Math.atan2(-dz, dx), reach = Math.hypot(dx, dz), luff = Math.asin(Math.min(0.95, reach / 8.0));
  return { hook: [at[0], (f < 748 ? at[1] : drop[1]) + 1.25 + back * 2.5, at[2]], slew, luff, fanAt: f < 712 ? null : at, spin: f > 754 ? (f - 754) * (0.02 + smooth(754, 790, f) * 0.18) : 0 };
};
/** engineer at the trestle: studies the plan, the model, imagines the plant, grimaces, crosses it out, looks at the house */
const engFace = faceTrack([[0, "focused"], [700, "focused"], [740, "worried"], [760, "focused"], [790, "idea"], [830, "suspicious"], [848, "cringe"], [890, "disbelief"], [920, "focused"], [952, "relieved"], [970, "proud"]] as [number, FaceName][], 7);
export const engineerAt = (f: number): Placed | null => { if (!worksOn(f) || f > 1000) return null;
  const scrib = f > 922 && f < 952 ? (f - 922) / 30 : 0, writing = scrib > 0;
  const armR = writing ? { hand: [-30 + Math.sin(scrib * Math.PI * 6) * 40, 60 + Math.cos(scrib * Math.PI * 4) * 18] as [number, number], elbow: [70, 80] as [number, number], shape: "grip" as const, rot: 0.8, bend: 1 } : f > 790 && f < 845 ? { hand: [40, -40] as [number, number], elbow: [90, 40] as [number, number], shape: "open" as const, rot: -0.6, bend: 1 } : REST_R;
  const p = withFace(pose5({ costume: ENGINEER, holdR: writing ? "pen" : undefined, armR, armL: f > 845 && f < 880 ? { hand: [-30, -150], elbow: [-90, -40], shape: "open", rot: 2.6, bend: -1 } : REST_L, lookY: f > 790 && f < 900 ? -0.6 : f > 960 ? -0.4 : 0.45, lean: writing ? 0.12 : 0, blink: blinkAt(f, 31) }), engFace(f), f, 33);
  return { pose: p, pos: [TRESTLE[0] + 0.45, 0, TRESTLE[2] + 0.75], h: 1.52, halo: 0.13, light: 1.2 }; };
/** two residents of 1907: the lady (brows up, turns away) and the gentleman (side-eye) */
const LADY = tint(COSTUME.clerk, { shirt: "#7a4a6a", shirtShade: "#5a3450", collar: "#f6eedc", tie: "#7a4a6a", hair: "#3a2a1e" }, null);
const GENT = tint(COSTUME.hal, { shirt: "#5a5048", shirtShade: "#463c34", hat: "#2a2622", hatShade: "#1a1612", band: "#5a2a22" }, "bowler");
export const residentsAt = (f: number): Placed[] => { if (!worksOn(f) || f < 770 || f > 1010) return [];
  const out: Placed[] = [];
  { const inU = smooth(776, 826, f), away = smooth(884, 940, f), x = f < 884 ? lerp(8.4, 3.2, inU) : lerp(3.2, 8.6, away), walking = (f > 776 && f < 826) || (f > 884 && f < 940);
    const face = f < 846 ? "content" : f < 884 ? "disbelief" : "deadpan"; const p = walking ? gait(LADY, Math.abs(x - 8.4), 1, 0.66) : pose5({ costume: LADY, lookY: -0.5, lookX: -0.4 });
    out.push({ pose: withFace(p, FACES[face as FaceName], f, 81), pos: [x, SW_Y, 4.2], h: 1.45, flip: f < 884, halo: 0.12 }); }
  { const inU = smooth(792, 850, f), x = lerp(-9.5, 1.4, inU), walking = f > 792 && f < 850; const face: FaceName = f < 866 ? "content" : f < 930 ? "sideEyeL" : "suspicious";
    const p = walking ? gait(GENT, Math.abs(x + 9.5), 1, 0.74) : pose5({ costume: GENT, armR: { ...REST_R, shape: "grip" }, lookY: -0.3 });
    out.push({ pose: withFace(p, FACES[face], f, 82), pos: [x, SW_Y, 4.5], h: 1.58, halo: 0.12 }); }
  return out; };
/** conversion crew (S11): men carry furniture out down the stoop and machinery parts in, staggered */
export const convCrewAt = (f: number): Placed[] => { if (!worksOn(f) || f < 990 || f > 1066) return [];
  return [0, 1, 2, 3].map((i) => { const t0 = 992 + i * 13, u = clamp01((f - t0) / 40), inward = i % 2 === 1;
    const k = inward ? u : 1 - u, z = lerp(5.2, 0.6, k), y = SW_Y + (PF - SW_Y) * clamp01((3.05 - z) / 2.5), x = -2.05 + (i % 2 ? 0.25 : -0.25);
    const pose = withFace(gait(CREW[i], u * 4.6, u > 0 && u < 1 ? 1 : 0, 0.7, { armR: { hand: [60, -20], elbow: [70, 40], shape: "grip", rot: 0, bend: 1 }, armL: { hand: [-60, -20], elbow: [-70, 40], shape: "grip", rot: 0, bend: -1 } }), FACES[inward ? "focused" : "neutral"], f, 90 + i);
    return { pose, pos: [x, y, z] as V3, h: 1.5, halo: 0.1, flip: !inward }; }); };
/** inside the stripped shell (S11): two men at work on the basement slab, one guiding a part down on a rope */
export const shellCrewAt = (f: number): Placed[] => { if (!worksOn(f) || f < 1016 || f > 1066) return [];
  return [[-1.4, -7.5, "hammer", 1.2], [1.2, -5.2, "wrench", 0.8], [0.2, -9.6, undefined, 0]].map(([x, z, tool, rate], i) => { const up = Math.max(0, Math.sin(((f * (rate as number)) / 30 + i * 0.4) * Math.PI * 2));
    const pose = withFace(pose5({ costume: CREW[(i + 3) % 6], holdR: tool as Odo5Pose["holdR"], armR: tool ? { hand: [50, lerp(90, -110, up)], elbow: [80, lerp(60, -10, up)], shape: "grip", rot: lerp(0.4, -2.2, up), bend: 1 } : { hand: [30, -170], elbow: [60, -60], shape: "grip", rot: 3.0, bend: 1 }, lookY: tool ? 0.3 : -0.7, blink: blinkAt(f, i + 50) }), FACES[tool ? "focused" : "worried"], f, 95 + i);
    return { pose, pos: [x as number, -0.75, z as number] as V3, h: 1.5, halo: 0.12, light: 1.4 }; }); };
export { REST_L, REST_R };
