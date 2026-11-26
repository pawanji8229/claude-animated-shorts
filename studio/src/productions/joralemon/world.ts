// joralemon "The House That Isn't Really a House" — world layout + story clock (pure functions of the film frame).
// Joralemon Street runs along x. North side: 1840s row houses facing +z; No. 58 centred at x = 0, front face z = 0.
// Ground: sidewalk top y = 0.15, street y = 0. Underground (illustrative cutaway): the Joralemon Street Tunnel along x,
// a shaft under No. 58's front rooms down to it. Eras swap by opacity dissolves on the same camera.
import { smooth, clamp01, lerp } from "../../lib/math";

export const FPS = 30;
export const FILM_FRAMES = 1466;

// ---- No. 58 (and the row-house module it shares with its neighbours)
export const W58 = 6.4, DEPTH = 13;                  // frontage, depth (m)
export const SW_Y = 0.15;                            // sidewalk top
export const AREA_Y = -0.75;                         // areaway + basement floor
export const PF = 1.75;                              // parlour floor (top of the stoop)
export const FLOORS = [PF, PF + 3.5, PF + 6.7] as const;   // parlour, 2nd, 3rd floor levels
export const STOREY = [3.5, 3.2, 2.8] as const;
export const EAVE = PF + 9.5;                        // top of the 3rd storey wall (cornice starts)
export const ROOF = EAVE + 0.75;                     // top of the cornice
export const BAYS58 = [-2.05, 0.1, 2.15] as const;   // window bay centres (bay 0 = entrance bay, stoop in front)
export const STOOP = { x0: -3.0, x1: -1.1, z1: 3.05, steps: 10 };   // the stoop of No. 58 (x span, front edge)
export const AREA_Z = 1.75;                          // areaway fence line
export const SIDEWALK = [0, 4.75] as const, STREET = [4.75, 13.95] as const, FAR_WALK = [13.95, 18.7] as const;
export const LANE = 9.35;                            // the one travel lane (one-way street, parked cars both kerbs)
export const PARK_N = STREET[0] + 1.1, PARK_S = STREET[1] - 1.1;

// ---- underground (illustrative): tunnel axis along x, the cut plane, the shaft notch under No. 58's front
export const TUN = { z: 6.0, y: -19.0, r: 3.2 };     // Joralemon Street Tunnel (cast-iron rings)
export const CUT_Z = 7.6;                            // section plane: earth for z < CUT_Z, void in front (cutaway view)
export const SHAFT = { x0: -2.4, x1: 2.4, z0: -4.0, y0: -16.2 };   // shaft notch (to the section plane) down to the tunnel crown
export const VOID = { x0: -15, x1: 15, z1: 17, y0: -25 };

// ---- story clock (frames from the narration analysis)
export const T = {
  s2: 93, s3: 195, s4: 267, s5: 312, s6: 377, s7: 483, s8: 574, s9: 683, s10: 774, s11: 989, s12: 1064, s13: 1146, s14: 1280, s15: 1435,
} as const;
/** era cross-dissolves (same camera, the world changes) */
export const XF = { home: [486, 514], works: [566, 588], now: [1050, 1074] } as const;
export type Era = "now" | "1847" | "1907";
export const eraAt = (f: number): Era => (f < XF.home[0] ? "now" : f < XF.works[0] ? "1847" : f < XF.now[0] ? "1907" : "now");

/** No. 58 facade cutaway: world-y of the soft dissolve edge (above it the facade is a faint ghost). >= 14 = intact. */
const ramp = (a: number, b: number, f: number, from: number, to: number) => lerp(from, to, smooth(a, b, f));
export const facadeCut = (f: number): number => {
  const TOP = 14.5, BOT = -1.6;
  if (f < 392) return TOP;
  if (f < 600) return ramp(392, 470, f, TOP, BOT);                          // reveal 1 (machinery), held into 1847 (parlour)
  if (f < 640) return ramp(600, 626, f, BOT, TOP);                          // camera inside the parlour: the wall returns behind it
  if (f < 1000) return TOP;
  if (f < 1066) return ramp(996, 1024, f, TOP, BOT);                        // the conversion cutaway (1907)
  if (f < 1100) return ramp(1066, 1090, f, BOT, TOP);                       // restored as the street returns to today
  if (f < 1352) return ramp(1150, 1192, f, TOP, BOT);                       // reveal 2: the camera dives in (and comes back out ~1347)
  if (f < 1390) return ramp(1352, 1378, f, BOT, TOP);                       // the wall closes again in front of the camera
  return TOP;
};
/** the street slab + sidewalk in front of No. 58 (and No. 58's basement floor): 0 = solid, 1 = cut away (underground view) */
export const groundCut = (f: number): number => {
  if (f >= 596 && f < 736) return smooth(596, 618, f) * (1 - smooth(715, 735, f));        // S08: down to the tunnel works
  return 0;
};
/** S11 conversion stages: 0 parlour -> 1 emptied -> 2 bare shell -> 3 machinery installed */
export const convStage = (f: number) => clamp01((f - 1000) / 56) * 3;
/** tunnel construction progress along x (S08): rings exist for x < tunnelFront(f) */
export const tunnelFront = (f: number) => lerp(-16, 16, smooth(600, 660, f));
export { smooth, clamp01, lerp };

// ---- the walk-through underground (today, scene 13): an ENCLOSED route the camera can fly through (no cutaway):
// No. 58's basement opening -> vertical shaft (emergency stair) -> horizontal adit -> emergency-exit door in a
// concrete headwall -> the tunnel walkway (benchwall). All solid; nothing here is shown as a section.
export const UWALK = -20.2;                                   // tunnel walkway (benchwall) top, 1.05 m above the rail head
export const RAIL_Y = TUN.y - TUN.r + 0.95;                   // rail head
export const SH = { x: 2.4, z0: -4.0, z1: -0.45, yb: UWALK }; // shaft inner faces (under No. 58's front rooms)
export const ADIT = { x: 1.8, y0: UWALK, y1: -17.0, zW: 2.95 }; // adit inner faces; headwall plane zW
export const DOOR = { x: 1.1, y1: UWALK + 2.2 };              // emergency-exit doorway in the headwall
export const GAPX = 4.2;                                       // tunnel rings |x| < GAPX are opened for the headwall
/** today's train (scene 13/14): head position along +x (one-way), cruising 0.42 m/frame (12.6 m/s), then braking to
 *  0.30 m/frame over frames 1284-1322 (brake squeal), steady after. Passes the walkway camera at x = -3.4 at frame 1280. */
const TV = (f: number) => (f < 1284 ? 0.42 : f > 1322 ? 0.3 : 0.42 - 0.12 * smooth(1284, 1322, f));
const THEAD: number[] = (() => { const a: number[] = []; let x = -3.4; for (let f = 1280; f <= 1500; f++) { a[f - 1280] = x; x += TV(f); } return a; })();
export const trainNowHead = (f: number) => (f <= 1280 ? -3.4 - (1280 - f) * 0.42 : THEAD[Math.min(THEAD.length - 1, Math.round(f) - 1280)] + (f - Math.round(f)) * TV(f));
export const trainNowSpeed = (f: number) => TV(f);
/** the underground set is mounted only while the camera can see it (scene 13-14 dive) */
export const UNDER_ON = (f: number) => f >= 1186 && f < 1350;
