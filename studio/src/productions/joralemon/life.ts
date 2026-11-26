// joralemon life (pure functions of the film frame): today's pedestrians (each with its own walk, speed, prop, face,
// timing - nobody synchronised, nobody notices No. 58), a dog walker + dog, a cyclist, traffic + parked cars (all
// PERIODIC over the film length, so the last frame flows into frame 0); the 1847 family; the 1907 works (crew with hand
// carts, tunnel gang, lorry with the fan, derrick, engineer with plan + model, two residents) and the conversion crew.
import { V3, lerp, smooth, clamp01, rng } from "../../lib/math";
import { pose5, COSTUME, REST_L, REST_R, type Odo5Pose, type Costume } from "../../char/odo5";
import { FACES, faceTrack, withFace, type FaceName } from "../short3/expr";
import { SW_Y, PF, LANE, PARK_N, PARK_S, FILM_FRAMES, XF, eraAt, TUN, RAIL_Y, UWALK, ADIT, trainNowHead } from "./world";
import type { Placed } from "./timeline";
import type { CarType } from "./vehicles";

const N = FILM_FRAMES;
const tint = (c: Costume, pal: Record<string, string>, hat?: Costume["hat"]): Costume => ({ ...c, apron: false, goggles: false, pal: { ...(c.pal ?? {}), ...pal }, ...(hat !== undefined ? { hat } : {}) });
const gait = (c: Costume, d: number, walking: number, stride: number, extra: Partial<Odo5Pose> = {}) => pose5({ costume: c, view: walking > 0.02 ? "side" : "front", gait: d / stride, walk: walking, stride, lean: 0.04 * walking, ...extra });
const wrap = (f: number, t0: number) => ((f - t0) % N + N) % N;   // periodic time since t0
const blinkAt = (f: number, seed: number) => ((f + seed * 37) % (71 + (seed % 5) * 9)) < 3;
const nowOn = (f: number) => f < XF.home[1] || f >= XF.now[0];

// ---------------------------------------------------------------- today: pedestrians
type Ped = { c: Costume; t0: number; x0: number; fc: number; v: number; z: number; h: number; prop?: Odo5Pose["holdR"]; face: FaceName; stride: number; dog?: boolean; seed: number };
const SHIRTS = ["#3b4a5c", "#8a4a3a", "#556b4a", "#6a5a7a", "#2a2a33", "#b0703a", "#3a5a6a", "#7a3a52", "#4a6a8a", "#9a8a5a", "#5a6a3a"];
const BASES = [COSTUME.clerk, COSTUME.hal, COSTUME.workerA, COSTUME.odo];
const mkPeds = (): Ped[] => { const r = rng(808), out: Ped[] = [];
  const add = (t0: number, x0: number, dir: 1 | -1, z: number, prop?: Odo5Pose["holdR"], extra: Partial<Ped> = {}) => { const base = BASES[Math.floor(r() * BASES.length)];
    out.push({ c: tint(base, { shirt: SHIRTS[Math.floor(r() * SHIRTS.length)], shirtShade: "#2a2a2a", hair: ["#3a2a1e", "#6b4a2e", "#2a2a2a", "#c9b090", "#8a5a32"][Math.floor(r() * 5)] }, r() < 0.25 ? "bowler" : null),
      t0, x0, fc: 0, v: dir * (1.15 + r() * 0.5), z, h: 1.42 + r() * 0.14, prop, face: (["content", "bored", "neutral", "talking", "deadpan", "content"] as FaceName[])[Math.floor(r() * 6)], stride: 0.7 + r() * 0.12, seed: out.length + 3, ...extra }); };
  // north sidewalk (z 3.95 / 4.3): the S05 passers-by cross in front of the stoop around frames 335-365
  add(225, 4.5, -1, 3.95, "grocery", { v: -1.3, face: "content" });                  // neighbour with a shopping bag
  add(300, -5.5, 1, 4.45, undefined, { v: 1.05, dog: true, face: "bored" });         // dog walker
  add(1360, 9, -1, 4.25, "cup", { face: "content" }); add(1300, -9, 1, 4.3, "briefcase", { face: "deadpan" }); add(1335, 12, -1, 3.95, "grocery", { face: "bored" });
  add(90, -18, 1, 4.1, undefined, { v: 2.9, stride: 1.25, face: "focused", h: 1.5 });   // jogger
  add(1150, 15, -1, 4.0, "grocery", { v: -1.0, face: "talking" }); add(1150, 15.55, -1, 4.45, undefined, { v: -1.0, h: 1.04, face: "content", stride: 0.5 });   // parent + child
  add(1060, -12, 1, 4.25); add(1240, -9, 1, 4.6, "cup"); add(20, 11, -1, 4.25, "briefcase"); add(1430, -14, 1, 4.25, "grocery");
  add(160, 12, -1, 4.25, "cup"); add(230, -12, 1, 4.0); add(N - 60, 9, -1, 15.2, "grocery"); add(N - 200, 16, -1, 15.2, "bag");
  // far sidewalk (z 15.1 / 15.6)
  for (const [t0, dir] of [[0, 1], [140, -1], [260, 1], [380, -1], [1080, 1], [1200, -1], [1290, 1], [1390, -1]] as [number, 1 | -1][]) add(t0, dir > 0 ? -22 : 22, dir, r() < 0.5 ? 15.15 : 15.6, r() < 0.3 ? "bag" : r() < 0.5 ? "briefcase" : undefined);
  // fc = the frame each person crosses x = 0 (in front of No. 58). Default: where the (t0, x0) start puts them;
  // overrides keep the opening's window close-ups clear (nobody walks between the lens and the house 110-460) and
  // gather the passers-by into the ending ("people walk past it every day").
  const FC: Record<number, number> = { 0: 20, 1: 480, 2: 1300, 3: 1395, 4: 1420, 5: 30, 6: 1290, 7: 1307, 10: 1180, 11: 1220, 12: 1120, 13: 1250 };
  out.forEach((p, i) => { p.fc = FC[i] ?? Math.round(p.t0 + (-p.x0 / p.v) * 30); if (i === 0) p.z = 4.45; });
  return out; };
export const PEDS = mkPeds();
/** walked distance (signed time from the x = 0 crossing, wrapped to +-half a loop) and position; null when the person is
 *  far down the street (beyond the point where the loop wraps them round, so nobody ever appears or vanishes in view) */
export const pedTrack = (p: Ped, f: number, ahead = 0): { d: number; x: number } | null => { let t = (f - p.fc) / 30; const T = N / 30; t = ((t + T / 2) % T + T) % T - T / 2;
  const d = Math.abs(p.v) * t, x = Math.sign(p.v) * (d + ahead), lim = Math.min(30, (Math.abs(p.v) * T) / 2 - 0.6); return Math.abs(x) > lim ? null : { d, x }; };
export const pedsAt = (f: number): Placed[] => { if (!nowOn(f)) return [];
  return PEDS.flatMap((p) => { const tr = pedTrack(p, f); if (!tr) return []; const { d, x } = tr;
    const face = withFace(gait(p.c, d, 1, p.stride, { holdR: p.prop, blink: blinkAt(f, p.seed), lookX: p.face === "talking" ? 0.6 : 0.2 }), FACES[p.face], f, p.seed);
    return [{ pose: face, pos: [x, SW_Y, p.z] as V3, h: p.h, flip: p.v < 0, halo: 0.08 }]; }); };
/** dog of the dog walker: trots 0.9 m ahead on the kerb side */
export const dogsAt = (f: number): { pos: V3; flip: boolean; phase: number }[] => { if (!nowOn(f)) return [];
  return PEDS.filter((p) => p.dog).flatMap((p) => { const tr = pedTrack(p, f, 0.95); if (!tr) return []; const { d, x } = tr;
    return [{ pos: [x, SW_Y, p.z + 0.35] as V3, flip: p.v < 0, phase: d / 0.55 }]; }); };
export const leashes = (f: number): { a: V3; b: V3 }[] => { if (!nowOn(f)) return [];
  return PEDS.filter((p) => p.dog).flatMap((p) => { const tr = pedTrack(p, f), s = Math.sign(p.v); if (!tr) return []; const x = tr.x; if (Math.abs(x) > 34) return [];
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
  ...[[-27, "sedan", "#3a3d42"], [-21.2, "suv", "#1f2a1f"], [-15.6, "hatch", "#9aa0a6"], [-9.8, "sedan", "#5a2a3a"], [7.6, "suv", "#4a4a4c"], [13.4, "hatch", "#2a6a8a"], [19.2, "sedan", "#7a5a3a"], [25.1, "sedan", "#e0e0dc"]].map(([x, t, c]) => ({ p: [x as number, 0, PARK_S] as V3, ry: Math.PI, type: t as CarType, color: c as string })),
];

// ---------------------------------------------------------------- 1847: the family in the parlour (world == No. 58-local here)
const MOTHER = tint(COSTUME.clerk, { shirt: "#6a2f45", shirtShade: "#4f2234", collar: "#f4ecda", tie: "#6a2f45", hair: "#5a3a26" }, null);
const FATHER = tint(COSTUME.hal, { shirt: "#3a3f52", shirtShade: "#2a2d3c", hair: "#4a3a2a", tie: "#2a2622" }, null);
const CHILD = tint(COSTUME.odo, { shirt: "#3f7a5a", shirtShade: "#2f5f45", hair: "#8a5a32" }, null);
const momFT = faceTrack([[0, "content"], [506, "focused"], [528, "idea"], [534, "delighted"], [560, "content"]] as [number, FaceName][], 5);
const dadFT = faceTrack([[0, "focused"], [520, "oneBrowUp"], [540, "xSideEyeR"], [556, "content"], [572, "proud"]] as [number, FaceName][], 5);
const kidFT = faceTrack([[0, "delighted"], [540, "talking"], [552, "delighted"]] as [number, FaceName][], 4);
/** 1847: mother reads (a page turn with a real hand sweep, looks up and beams at her son), the boy skips across the
 *  parlour to the door, turns and waves; father tugs the curtain twice, side-eyes the noise, then softens. */
export const familyAt = (f: number): Placed[] => { if (eraAt(f) === "now" && f > 600) return [];
  const pg = clamp01((f - 512) / 10), sweep = Math.sin(pg * Math.PI);
  const look = smooth(526, 532, f) * (1 - smooth(556, 566, f));
  const mom = withFace(pose5({ costume: MOTHER, holdR: "book", lookY: lerp(0.45, -0.1, look), lookX: lerp(0.1, -0.6, look), headRoll: 0.08 * look,
    armR: { hand: [lerp(-20, 70, sweep), lerp(40, 10, sweep)], elbow: [60, 90], shape: sweep > 0.2 ? "open" : "grip", rot: lerp(0, -0.6, sweep), bend: 1 }, armL: { hand: [20, 40], elbow: [-60, 90], shape: "grip", rot: 0, bend: -1 }, blink: blinkAt(f, 4), breathe: Math.sin(f * 0.09) * 0.4 }), momFT(f), f, 41);
  const tug = Math.max(0, Math.sin(((f - 496) / 14) * Math.PI)) * (f > 496 && f < 524 ? 1 : 0), turnD = smooth(536, 544, f);
  const dad = withFace(pose5({ costume: FATHER, lookX: lerp(0.8, -0.7, turnD), lookY: lerp(-0.2, 0.1, turnD), lean: -0.06 * tug, headRoll: -0.06 * turnD,
    armR: turnD > 0.6 ? { hand: [70, -20], elbow: [80, 60], shape: "relaxed", rot: 0.2, bend: 1 } : { hand: [70, -150 + 34 * tug], elbow: [80, -30 + 20 * tug], shape: "grip", rot: 0.2, bend: 1 }, blink: blinkAt(f, 6) }), dadFT(f), f, 42);
  const u = smooth(498, 548, f), cx = lerp(2.2, -0.55, u), cz = lerp(-6.3, -4.85, u), skip = f > 498 && f < 548 ? Math.abs(Math.sin(f * 0.42)) : 0, wave = smooth(550, 556, f);
  const kidP = f < 548 ? gait(CHILD, u * 3.0, f > 498 ? 1 : 0, 0.5, { blink: blinkAt(f, 9), squash: -0.15 * skip })
    : pose5({ costume: CHILD, blink: blinkAt(f, 9), headRoll: 0.1 * wave, armR: { hand: [92, lerp(60, -150 + Math.sin(f * 0.9) * 22, wave)], elbow: [96, lerp(80, -40, wave)], shape: "open", rot: -0.3, bend: 1 } });
  const kid = withFace(kidP, kidFT(f), f, 43);
  return [{ pose: mom, pos: [1.0, PF + 0.12, -3.85], h: 1.42, halo: 0.12, light: 0.8 }, { pose: dad, pos: [1.75, PF, -1.05], h: 1.55, halo: 0.12 },
    { pose: kid, pos: [cx, PF + skip * 0.08, cz], h: 1.0, flip: f < 548, halo: 0.12 }]; };

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
  return [0, 1, 2].map((i): Placed => { const ph = (f * (0.8 + i * 0.27)) / 30 + i * 0.4, up = Math.max(0, Math.sin(ph * Math.PI * 2));
    const pose = withFace(pose5({ costume: CREW[(i + 2) % 6], holdR: i === 1 ? "hammer" : "shovel", armR: { hand: [50, lerp(80, -100, up)], elbow: [80, lerp(60, 0, up)], shape: "grip", rot: lerp(0.4, -2.0, up), bend: 1 }, blink: blinkAt(f, i + 40) }), FACES[up > 0.6 ? "focused" : "neutral"], f, 70 + i);
    return { pose, pos: [front - 1.6 - i * 1.3, TUN.y - TUN.r + 0.55, TUN.z - 0.6 + i * 0.5] as V3, h: 1.45, halo: 0.1, light: 1.2 }; }).concat(muckNavvy(f, front)); };
/** the navvy pushing the muck car back from the face (leaning into it on the way out, walking back for the next load) */
const muckNavvy = (f: number, front: number): Placed[] => { if (f < 600 || f > 668) return []; const t = ((f - 600) % 34) / 34, x = front - 3.0 - Math.sin(t * Math.PI) * 5.5, out = t < 0.5;
  const pose = withFace(gait(CREW[4], Math.abs(x) * 1.3, 1, 0.7, { lean: out ? 0.25 : 0.05, armR: { hand: [90, 20], elbow: [70, 40], shape: "grip", rot: 0, bend: 1 }, blink: blinkAt(f, 47) }), FACES[out ? "focused" : "neutral"], f, 47);
  return [{ pose, pos: [x + (out ? 0.95 : -0.95), TUN.y - TUN.r + 0.6, TUN.z - 0.4] as V3, h: 1.45, flip: out, halo: 0.1, light: 1.2 }]; };
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
const ladyFT = faceTrack([[0, "content"], [846, "browsShoot"], [862, "xDisbelief"], [884, "comicSerious"]] as [number, FaceName][], 5);
const gentFT = faceTrack([[0, "content"], [866, "xSideEyeL"], [902, "oneBrowUp"], [930, "suspSquint"]] as [number, FaceName][], 5);
const engFace = faceTrack([[0, "focused"], [700, "focused"], [740, "worried"], [760, "focused"], [790, "idea"], [830, "suspSquint"], [848, "uncomfyGrin"], [890, "xDisbelief"], [920, "focused"], [952, "relieved"], [970, "proud"]] as [number, FaceName][], 7);
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
    const faceL = ladyFT(f); const p = walking ? gait(LADY, Math.abs(x - 8.4), 1, 0.66) : pose5({ costume: LADY, lookY: -0.5, lookX: -0.4 });
    out.push({ pose: withFace(p, faceL, f, 81), pos: [x, SW_Y, 4.2], h: 1.45, flip: f < 884, halo: 0.12 }); }
  { const inU = smooth(792, 850, f), x = lerp(-9.5, 1.4, inU), walking = f > 792 && f < 850; const faceG = gentFT(f);
    const p = walking ? gait(GENT, Math.abs(x + 9.5), 1, 0.74) : pose5({ costume: GENT, armR: { ...REST_R, shape: "grip" }, lookY: -0.3 });
    out.push({ pose: withFace(p, faceG, f, 82), pos: [x, SW_Y, 4.5], h: 1.58, halo: 0.12 }); }
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

// ---------------------------------------------------------------- today, underground: passengers in the train + crew
const PAX_CAR_L = 15.6, PAX_PITCH = 16.0;
type Pax = { c: Costume; dx: number; dz: number; seat: boolean; face: FaceName; late?: FaceName; h: number; arm: "bar" | "pole" | "rest" | "phone"; seed: number; prop?: Odo5Pose["holdR"] };
const PAX: Pax[][] = (() => { const r = rng(5150), cars: Pax[][] = [];
  const faces: FaceName[] = ["bored", "deadpan", "content", "talking", "bored", "focused", "deadpan", "worried", "smug", "bored"];
  for (let c = 0; c < 5; c++) { const a: Pax[] = []; const n = 6 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) { const base = BASES[Math.floor(r() * BASES.length)], seat = r() < 0.35;
      const dx = -6.6 + (13.2 * (i + 0.2 + r() * 0.6)) / n, dz = seat ? -0.86 : (r() - 0.5) * 1.0;
      a.push({ c: tint(base, { shirt: SHIRTS[Math.floor(r() * SHIRTS.length)], shirtShade: "#2a2a2a", hair: ["#3a2a1e", "#6b4a2e", "#2a2a2a", "#c9b090", "#8a5a32", "#d8d4cc"][Math.floor(r() * 6)] }, r() < 0.2 ? "bowler" : null),
        dx, dz, seat, face: faces[Math.floor(r() * faces.length)], h: 1.4 + r() * 0.16, arm: seat ? "rest" : r() < 0.55 ? "bar" : r() < 0.5 ? "pole" : "phone", seed: 900 + c * 20 + i, prop: r() < 0.25 ? (["bag", "briefcase", "cup", "book"] as const)[Math.floor(r() * 4)] : undefined }); }
    cars.push(a); }
  // the lead car's front window: one rider notices the camera on the walkway (double-take, then a long side-eye)
  cars[0][1] = { ...cars[0][1], dx: 3.2, dz: -0.35, seat: false, face: "deadpan", late: "sideEyeL", arm: "bar" };
  cars[1][2] = { ...cars[1][2], dx: -1.5, dz: -0.3, seat: false, face: "bored", late: "shocked", arm: "pole" };
  return cars; })();
const BAR: Odo5Pose["armR"] = { hand: [62, -236], elbow: [96, -96], shape: "grip", rot: 0, bend: 1 };
const POLE: Odo5Pose["armR"] = { hand: [58, -40], elbow: [86, 40], shape: "grip", rot: 0, bend: 1 };
const PHONE: Odo5Pose["armR"] = { hand: [18, -6], elbow: [78, 70], shape: "grip", rot: 0.4, bend: 1 };
/** passengers of the cars that are near the camera (sway with the car's motion; nobody moves in sync) */
export const passengersAt = (f: number, cam: V3): (Placed & { flip?: boolean })[] => { const head = trainNowHead(f), out: (Placed & { flip?: boolean })[] = [];
  for (let c = 0; c < 5; c++) { const cx = head - PAX_CAR_L / 2 - c * PAX_PITCH; if (Math.abs(cx - cam[0]) > 34) continue;
    for (const p of PAX[c]) { const x = cx + p.dx; const sway = Math.sin(f * 0.13 + p.seed) * 0.03 + Math.sin(f * 0.051 + p.seed * 2) * 0.02;
      // the two "noticers" react when they are level with the camera
      const lvl = smooth(-3, 0.5, x - cam[0]) * (1 - smooth(4, 9, x - cam[0]));
      const face = p.late && lvl > 0.5 ? FACES[p.late] : FACES[p.face];
      const arm = p.arm === "bar" ? { armR: BAR } : p.arm === "pole" ? { armR: POLE } : p.arm === "phone" ? { armR: PHONE, lookY: 0.55 } : {};
      const pose = withFace(pose5({ costume: p.c, ...arm, holdR: p.arm === "rest" ? p.prop : undefined, blink: blinkAt(f, p.seed), bodyRoll: sway * (p.seat ? 0.4 : 1), lookX: p.late && lvl > 0.5 ? -0.9 : 0.2 }), face, f, p.seed);
      out.push({ pose, pos: [x, RAIL_Y + 1.13 - (p.seat ? 0.28 : 0), TUN.z + p.dz], h: p.h, halo: 0.05, flip: (p.seed % 2) === 0 }); } }
  return out; };
/** maintenance crew (authorised staff only): one at the damper panel in the adit, one on the walkway further down */
const CREW_HV: Costume = tint(COSTUME.workerA, { shirt: "#c9e02a", shirtShade: "#9aac1c", hat: "#f07a1a", hatShade: "#b85a10", hair: "#3a2a1e" }, "hard");
const CREW_HV2: Costume = tint(COSTUME.workerB, { shirt: "#e8f040", shirtShade: "#b0b62a", hat: "#f2f0e8", hatShade: "#c2bfb4" }, "hard");
const panelFace = faceTrack([[0, "focused"], [1228, "focused"], [1231, "doubleTake"], [1238, "xSideEyeR"], [1300, "suspSquint"], [1320, "focused"]] as [number, FaceName][], 4);
export const tunnelCrewAt = (f: number): Placed[] => { const out: Placed[] = [];
  // panel worker: checks the damper panel (wrench), turns at the passing camera (double-take), then side-eyes it
  const turn = smooth(1228, 1233, f) * (1 - smooth(1300, 1316, f)), nod = Math.sin(f * 0.21) * 0.03 * (1 - turn);
  out.push({ pose: withFace(pose5({ costume: CREW_HV, holdR: "wrench", blink: blinkAt(f, 61), headRoll: nod + turn * 0.1, lookX: lerp(-0.8, 0.5, turn), armR: turn > 0.5 ? REST_R : { hand: [-30, -60], elbow: [70, 20], shape: "grip", rot: -0.8, bend: 1 }, squash: -0.25 * smooth(1229, 1232, f) * (1 - smooth(1232, 1238, f)) }), panelFace(f), f, 61),
    pos: [-1.3, ADIT.y0, 2.35], h: 1.5, halo: 0.12, light: 1.0 });
  // walkway worker with a lamp, standing well back against the wall while the train passes
  const back = smooth(1236, 1250, f), wf = faceTrack([[0, "content"], [1242, "focused"], [1290, "bored"]] as [number, FaceName][], 6)(f);
  out.push({ pose: withFace(pose5({ costume: CREW_HV2, holdR: "wrench", blink: blinkAt(f, 62), lookX: -0.6 }), wf, f, 62),
    pos: [-15.5, UWALK, lerp(3.85, 3.35, back)], h: 1.5, halo: 0.1, light: 0.8 });
  return out; };
