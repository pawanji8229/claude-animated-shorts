// short3 street life (pure functions of the film frame): moving traffic in both lanes, parked cars, the streetcar,
// the timber truck, pedestrians with their own walks (some stop and gawk at the move), onlookers across the street.
// Every vehicle enters and leaves frame by driving (never spawns in view); wheels turn with distance travelled.
import { V3, smooth, lerp, clamp01, rng } from "../../lib/math";
import { pose5, COSTUME, REST_L, REST_R, type Odo5Pose, type Costume } from "../../char/odo5";
import { SIDEWALK, STREET, FAR_WALK, T } from "./world";
import { TRACK_Z } from "./Street";
import { FACES, withFace, type FaceName } from "./expr";

const tint = (c: Costume, pal: Record<string, string>, hat?: Costume["hat"]): Costume => ({ ...c, pal: { ...(c.pal ?? {}), ...pal }, ...(hat !== undefined ? { hat } : {}) });
export const LANE_NEAR = STREET[0] + 3.0, LANE_FAR = STREET[1] - 1.45;
const R_CAR = 0.34;

// ---------------------------------------------------------------- traffic
type CarRun = { t0: number; dir: 1 | -1; v: number; color: string; lane: number; era?: "hook" };
const RUNS: CarRun[] = [
  // flash-forward hook (its own era: only while the hook is on screen)
  { t0: 100, dir: 1, v: 7.5, color: "#1f2a3a", lane: LANE_NEAR, era: "hook" }, { t0: 150, dir: -1, v: 7.0, color: "#3a2a22", lane: LANE_FAR, era: "hook" },
  // 1930: the near lane is closed (sawhorses) while the street-level camera works there and the crawler crane occupies it,
  // so 1930 traffic uses the far lane; near-lane traffic returns once the crane has backed out (it then passes the parked truck)
  // (no far-lane car crosses x -5..25 during the low wave-off shot 640-712, so nothing drives through that camera)
  { t0: 205, dir: -1, v: 7.0, color: "#2a3a2a", lane: LANE_FAR }, { t0: 262, dir: -1, v: 7.0, color: "#141416", lane: LANE_FAR },
  { t0: 482, dir: -1, v: 7.0, color: "#5a1f1c", lane: LANE_FAR }, { t0: 535, dir: -1, v: 7.0, color: "#22304a", lane: LANE_FAR },
  { t0: 600, dir: -1, v: 7.0, color: "#4a3a2a", lane: LANE_FAR },
  { t0: 712, dir: -1, v: 7.0, color: "#2f3f2f", lane: LANE_FAR }, { t0: 800, dir: -1, v: 7.0, color: "#3a1e2a", lane: LANE_FAR },
  { t0: 905, dir: -1, v: 7.0, color: "#141416", lane: LANE_FAR }, { t0: 1035, dir: -1, v: 7.0, color: "#22304a", lane: LANE_FAR },
  { t0: 1330, dir: 1, v: 7.5, color: "#2a3a2a", lane: LANE_NEAR }, { t0: 1395, dir: -1, v: 7.0, color: "#5a1f1c", lane: LANE_FAR },
  { t0: 1460, dir: 1, v: 7.5, color: "#141416", lane: LANE_NEAR }, { t0: 1500, dir: -1, v: 7.0, color: "#1f2a3a", lane: LANE_FAR },
];
export type CarState = { p: V3; ry: number; spin: number; color: string };
export const carsAt = (f: number): CarState[] => RUNS.flatMap((c) => {
  const t = (f - c.t0) / 30; if (t < 0 || (c.era === "hook") !== (f < T.past0)) return []; const x = -c.dir * 80 + c.dir * c.v * t; if (Math.abs(x) > 82) return [];
  return [{ p: [x, 0.02, c.lane] as V3, ry: c.dir > 0 ? 0 : Math.PI, spin: (c.v * t) / R_CAR, color: c.color }];
});
export const PARKED: CarState[] = [
  { p: [-33, 0.02, STREET[0] + 0.95], ry: Math.PI, spin: 0, color: "#2a2a30" }, { p: [-40.5, 0.02, STREET[0] + 0.95], ry: Math.PI, spin: 0, color: "#4a3324" },
  { p: [-58, 0.02, STREET[0] + 0.95], ry: Math.PI, spin: 0, color: "#5a2a24" },
];
/** streetcar passes (bell cues at 285 and 420 sit inside these runs) */
const CARS_ST: { t0: number; dir: 1 | -1 }[] = [{ t0: 255, dir: -1 }, { t0: 395, dir: 1 }, { t0: 1340, dir: -1 }];
export const streetcarAt = (f: number): { p: V3; ry: number } | null => {
  for (const s of CARS_ST) { const t = (f - s.t0) / 30; const x = -s.dir * 95 + s.dir * 7.5 * t; if (t >= 0 && Math.abs(x) < 96) return { p: [x, 0.03, TRACK_Z], ry: s.dir > 0 ? 0 : Math.PI }; }
  return null;
};
/** timber truck: drives in along the near lane, parks by the site gate, crew unloads it during the support beat */
export const TRUCK_PARK: V3 = [-14.0, 0.02, STREET[0] + 0.95];
export const truckAt = (f: number): { p: V3; spin: number; load: number } | null => {
  if (f < 830 || f > T.aerial0 + 10) return null;
  const u = smooth(830, 884, f), x = lerp(-78, TRUCK_PARK[0], 1 - (1 - u) * (1 - u)), z = lerp(LANE_NEAR, TRUCK_PARK[2], smooth(862, 884, f));
  return { p: [x, 0.02, z], spin: (x + 78) / 0.48, load: 1 - 0.85 * smooth(890, T.jacks0 - 10, f) };
};

// ---------------------------------------------------------------- pedestrians
type Ped = { c: Costume; z: number; x0: number; v: number; t0: number; stop?: [number, number, FaceName]; h: number; face: FaceName };
const HATS: Costume["hat"][] = ["bowler", "bowler", null, "cowboy", "bowler"];
const mkPeds = (): Ped[] => { const r = rng(404), out: Ped[] = [];
  const shirts = ["#3b4a5c", "#6f5b45", "#556b4a", "#5a3a3a", "#2a2a33", "#7a5a5a", "#3a4a3a", "#6a5a7a", "#8a6a4a", "#40506a"];
  const spawn = (t0: number, zSide: "near" | "far", dir: 1 | -1, stop?: [number, number, FaceName]) => { const base = r() < 0.5 ? COSTUME.clerk : r() < 0.5 ? COSTUME.hal : COSTUME.workerA;
    const z = zSide === "near" ? (SIDEWALK[0] + SIDEWALK[1]) / 2 + 0.6 + r() * 1.2 : (FAR_WALK[0] + FAR_WALK[1]) / 2 - 0.6 + r() * 1.0;
    out.push({ c: tint(base, { shirt: shirts[Math.floor(r() * shirts.length)], shirtShade: "#2a2a2a" }, HATS[Math.floor(r() * HATS.length)]), z, x0: -dir * (34 + r() * 6), v: dir * (1.05 + r() * 0.45), t0, stop, h: 1.46 + r() * 0.1, face: (["neutral", "content", "bored", "deadpan"] as FaceName[])[Math.floor(r() * 4)] }); };
  // 1930 street (before the move): people on both sidewalks
  spawn(250, "near", 1); spawn(268, "far", -1); spawn(292, "far", 1); spawn(330, "near", -1, [395, 440, "sideEyeL"]); spawn(360, "far", -1); spawn(410, "near", 1);
  spawn(480, "far", 1, [520, 600, "confused"]); spawn(520, "near", -1);
  // during the move: gawkers stop across the street and watch
  spawn(900, "far", 1, [960, 1100, "shocked"]); spawn(920, "far", -1, [975, 1100, "disbelief"]); spawn(950, "far", 1, [1000, 1100, "suspicious"]); spawn(965, "near", -1, [1010, 1100, "confused"]);
  // after: ordinary day again
  spawn(1335, "far", -1); spawn(1355, "near", 1); spawn(1440, "far", 1); spawn(1470, "near", -1);
  return out; };
const PEDS = mkPeds();
export type Walker = { pose: Odo5Pose; pos: V3; h: number; flip?: boolean; halo?: number };
const walkP = (c: Costume, d: number, walking: number, extra: Partial<Odo5Pose> = {}): Odo5Pose => pose5({ costume: c, view: walking > 0.02 ? "side" : "front", gait: d / 0.72, walk: walking, stride: 0.72, lean: 0.04 * walking, ...extra });
export const pedsAt = (f: number): Walker[] => PEDS.flatMap((p, i) => {
  const t = (f - p.t0) / 30; if (t < 0) return [];
  // walk with an optional stop (gawk): distance is continuous, walking blends out/in over 6 frames
  const stopD = p.stop ? Math.abs(p.v) * Math.max(0, (p.stop[0] - p.t0) / 30) : Infinity;
  let d: number, walking = 1, stopped = false;
  if (p.stop && f >= p.stop[0]) { const tAfter = Math.max(0, (f - p.stop[1]) / 30); d = stopD + Math.abs(p.v) * tAfter; stopped = f < p.stop[1]; walking = stopped ? 1 - clamp01((f - p.stop[0]) / 6) : clamp01((f - p.stop[1]) / 6); }
  else d = Math.abs(p.v) * t;
  const x = p.x0 + Math.sign(p.v) * d; if (Math.abs(x) > 42) return [];
  const face = withFace(walkP(p.c, d, walking), FACES[stopped && p.stop ? p.stop[2] : p.face], f, i);
  const pose = stopped ? { ...face, view: "front" as const, lookX: (face.lookX || 0) - 0.5, armR: p.stop && p.stop[2] === "shocked" ? { hand: [60, -120] as [number, number], elbow: [90, -20] as [number, number], shape: "open" as const, rot: 0.3, bend: 1 } : REST_R, armL: REST_L } : face;
  return [{ pose, pos: [x, 0.16, p.z] as V3, h: p.h, flip: !stopped && p.v < 0, halo: 0.08 }];
});
