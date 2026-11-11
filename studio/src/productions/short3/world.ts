// short3 "The Office That Moved" — world layout, building path and story clock (pure functions of the film frame).
// EXT: a 1930 city block. The office block (24 x 18 m footprint, 8 storeys) faces the street (+z). The move:
// slide back 16 m (-z), rotate 90 deg about its centre, slide 30 m sideways (-x). The new HQ rises on the old site.
import { V3, smooth, lerp, clamp01 } from "../../lib/math";

export const FPS = 30;
export const FILM_FRAMES = 1564;
export const BW = 24, BD = 18, FLOORS = 8, FLOOR_H = 3.7, BASE_H = 1.4;                  // building
export const BH = BASE_H + FLOORS * FLOOR_H;                                             // 31 m to the cornice
export const SIDEWALK = [BD / 2, BD / 2 + 4.5] as const, STREET = [BD / 2 + 4.5, BD / 2 + 15.5] as const; // z ranges
export const FAR_WALK = [STREET[1], STREET[1] + 4] as const;
export const MOVE1 = 16, MOVE3 = 30;                                                    // metres

// ---- story clock (frames from the narration analysis) ----
export const T = {
  hookEnd: 241, past0: 259,                // flash-forward hook (building mid-move), then dissolve back to 1930
  exec0: 262, blue0: 335, blueUp: 365, problem: 449, cringe0: 458,
  craneUp0: 501, footprint0: 520, wreck0: 600, wreckWave: 648, wreckBack: 690,
  engineer0: 690, point0: 712, idea: 745,
  windows0: 785, support0: 870, jacks0: 960, creep0: 971, aerial0: 1100, slide1End: 1140, rotEnd: 1176, slide3End: 1213,
  int2_0: 1213, int2_1: 1235, ext3_0: 1322, ext3_1: 1340, gang0: 1450, loop0: 1530,
} as const;

/** building pose: centre position (y=0 ground) and yaw. The hook (f < 241) is a flash-forward during move 1. */
export const bldAt = (f: number): { p: V3; ry: number; moving: number } => {
  if (f < T.past0) { const z = -6.0 - 0.5 * (f / T.hookEnd); return { p: [0, 0, z], ry: 0, moving: 1 }; }   // creeping mid-move
  if (f < T.creep0) return { p: [0, 0, 0], ry: 0, moving: 0 };
  if (f < T.aerial0) { const u = smooth(T.creep0, T.aerial0 + 30, f); return { p: [0, 0, -1.8 * u], ry: 0, moving: 1 }; }   // first creep, real speed
  // aerial: time compressed (weeks in seconds) - slide back, turn, slide sideways
  const z = lerp(-1.8 * smooth(T.creep0, T.aerial0 + 30, f), -MOVE1, smooth(T.aerial0 + 4, T.slide1End, f));
  const ry = (Math.PI / 2) * smooth(T.slide1End, T.rotEnd, f);
  const x = -MOVE3 * smooth(T.rotEnd, T.slide3End, f);
  return { p: [x, 0, z], ry, moving: f < T.slide3End + 4 ? 1 : 0 };
};
/** jack-to-jack micro steps: the building advances in small pulses while the jacks are turned (visible "creep") */
export const pulse = (f: number) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * clamp01(((f % 18) / 18)));
export const NEW_HQ = { x0: -14.5, x1: 14.5, z0: -15, z1: 11 };   // footprint of the planned bigger headquarters
export const sunAt = (f: number) => f >= T.aerial0 && f < T.slide3End ? smooth(T.aerial0, T.slide3End, f) : f >= T.ext3_0 ? 1 : 0; // 0 noon -> 1 late afternoon

/** sun position (offset from the scene centre, world space) - shared by both sets */
export const sunWorld = (f: number): V3 => { const s = sunAt(f); return [lerp(-58, -80, s), lerp(96, 46, s), lerp(42, 26, s)]; };

/** opacity cross-dissolves between the two sets (frames) */
export const XF = { intExt: [102, 110], past: [241, 259], extInt: [1280, 1288], intExt2: [1316, 1324], loop: [1553, 1561] } as const;
