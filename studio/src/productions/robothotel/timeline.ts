// The Robot Hotel film: 1679 frames (= the narration, 55.95 s), ONE continuous camera (no cuts, no dissolves):
// street -> through the sliding doors -> the robot workforce (half power down) -> the raptor receptionists (roar, bow,
// the hero's double take) -> crane up over the lobby -> the one human employee -> check-in + the luggage robot ->
// following it to the corridor -> it fails (red light) -> the concierge can't answer -> the porter takes the luggage to
// the wrong room -> past the door jamb into room 101 at night -> snoring, the bedside robot "listens" and wakes the
// guest -> staff step in (room, corridor) -> lobby chaos -> 2019: the workforce is powered down and wheeled away ->
// back out through the doors to the opening framing (loop). Beat frames follow the narration (STORYBOARD.md).
import { camPath } from "../london-bridge/common";
import { REST_L, REST_R, type Costume } from "../../char/odo5";
import type { PCam } from "../centennial/Set";
import { HERO } from "../centennial/chars";
import { A, mixArm, sm, cl, lv, stand, walker, keys, ft, type Act, type Placed } from "../mailrail/actors";
import { handWorld } from "../centennial/timeline";
import { BED, NIGHTSTAND, DOOR101, CONCIERGE_AT, ALCOVES, OFFICE_DOOR, DOORS } from "./hotel";
import { RAPTOR_REST, type RaptorState, type ConciergeState, type PorterState, type WorkerState, type EggState } from "./robots";
import type { V3 } from "../../lib/math";

export const FPS = 30, FILM_FRAMES = 1679;
const N = FILM_FRAMES;
const lazy = <T,>(make: () => T) => { let v: T | undefined; return () => (v ??= make()); };
const wrap = (f: number) => ((f % N) + N) % N;
type CK = [number, V3, V3, number];

// ================================================================= camera (one continuous path; loop: last key = first key)
const KEYS: CK[] = [
  [-60, [0.9, 1.62, 9.5], [-0.3, 3.15, -2], 50], [0, [0.9, 1.62, 9.5], [-0.3, 3.15, -2], 50],
  [52, [0.5, 1.62, 4.2], [-0.6, 1.55, -8], 50], [92, [0.2, 1.66, 0.2], [2.6, 1.45, -6.5], 50],                    // A -> doors open, step through
  [122, [1.6, 1.66, -2.4], [8.3, 1.15, -5.8], 50], [150, [1.8, 1.66, -3.2], [8.2, 1.1, -6.6], 50],               // B: the workforce powers down
  [182, [-0.5, 1.62, -6.3], [-2.3, 1.6, -12.0], 47], [232, [-0.9, 1.6, -7.3], [-2.3, 1.62, -12.0], 46],          // C: raptors + double take
  [262, [-0.6, 1.62, -7.6], [-1.9, 1.55, -11.8], 46], [318, [-2.4, 3.7, -2.2], [-1.6, 1.1, -9.6], 54],             // D: crane up, wide lobby
  [372, [-3.2, 4.2, -1.2], [-2.6, 0.9, -8.2], 56], [426, [1.8, 2.4, -5.6], [5.0, 1.25, -12.8], 50],               // E: the one human
  [478, [3.0, 1.72, -8.6], [5.1, 1.3, -13.0], 46], [522, [0.6, 1.62, -7.4], [-1.1, 1.3, -11.0], 47],              // F: check-in, the porter
  [600, [1.4, 1.6, -7.2], [-0.2, 1.0, -10.4], 48], [652, [2.0, 1.62, -7.0], [4.0, 1.0, -10.8], 49],               // G: following the porter
  [702, [4.4, 1.6, -7.4], [7.4, 0.95, -11.0], 48], [742, [5.0, 1.6, -7.7], [7.3, 1.0, -10.8], 46],                 // H: error
  [790, [4.6, 1.55, -5.4], [6.6, 1.25, -8.7], 44], [838, [4.8, 1.55, -5.6], [6.7, 1.2, -8.8], 44],                 // I: the concierge can't answer
  [866, [6.3, 1.62, -10.7], [12.0, 1.0, -11.3], 50], [884, [8.2, 1.62, -11.15], [14.0, 0.95, -11.4], 50], [918, [11.6, 1.6, -10.9], [16.0, 0.85, -11.8], 50],           // J: corridor, wrong room
  [946, [12.3, 1.58, -11.25], [12.4, 1.2, -14.5], 50], [972, [12.75, 1.5, -12.9], [10.9, 0.95, -15.6], 48],        // K: past the jamb into 101
  [1004, [12.9, 1.75, -13.5], [10.1, 0.72, -16.3], 50], [1100, [12.6, 1.62, -13.8], [10.05, 0.72, -16.3], 47],       // L: slow push on the sleeper
  [1150, [12.55, 1.6, -13.85], [10.05, 0.8, -16.3], 47], [1202, [12.5, 1.62, -13.9], [10.05, 0.9, -16.3], 47],        // M/N: wake-up, side-eye
  [1240, [12.7, 1.5, -13.3], [11.0, 0.95, -15.8], 46], [1284, [12.6, 1.6, -12.0], [11.0, 0.9, -16.4], 48],         // O: staff in, unplugged
  [1312, [11.0, 1.65, -10.9], [15.8, 1.0, -11.4], 50], [1342, [10.2, 1.62, -10.8], [14.6, 0.95, -11.4], 50],       // O: corridor fix
  [1386, [4.6, 2.0, -5.2], [6.8, 1.0, -8.4], 50], [1430, [4.0, 2.2, -5.0], [5.8, 1.0, -8.8], 50],                   // P: concierge panel
  [1488, [1.0, 2.0, -6.0], [-1.0, 1.3, -11.4], 48], [1520, [0.7, 1.45, -9.3], [0.95, 1.18, -11.1], 40], [1540, [0.72, 1.45, -9.35], [0.95, 1.18, -11.1], 40],             // P: desk chaos -> Q: calendar 2019
  [1572, [3.2, 1.75, -5.6], [8.0, 1.0, -6.6], 50], [1600, [1.4, 1.7, -3.2], [-1.2, 1.4, -10.0], 50],                 // Q: workforce powered down, wheeled away
  [1632, [0.6, 1.66, -0.4], [-0.6, 1.7, -9.0], 50], [1679, [0.9, 1.62, 9.5], [-0.3, 3.15, -2], 50], [1740, [0.9, 1.62, 9.5], [-0.3, 3.15, -2], 50],
];
const path = lazy(() => camPath(KEYS.map(([f, pos, look, fov]) => ({ f, pos, look, fov })), 8));
export const camAt = (f: number): PCam => { const p = path()(f), pos = p.pos, look = p.look;
  const inRoom = pos[2] < -12.6 && pos[0] > 9.5;
  return { pos, look, fov: p.fov, dof: inRoom ? 0.05 : 0.035, focus: Math.hypot(pos[0] - look[0], pos[1] - look[1], pos[2] - look[2]), near: 0.03 }; };
/** where the camera is: 0 street, 1 lobby, 2 corridor, 3 room (continuous weights for the light blend) */
export const zoneW = (c: PCam) => { const [x, , z] = c.pos;
  const ext = sm(-0.4, 0.8, z), room = sm(-12.2, -13.0, z) * sm(9.4, 10.2, x), cor = (1 - room) * sm(8.6, 9.6, x);
  return { ext, room, cor, lobby: Math.max(0, 1 - ext - room - cor) }; };

// ================================================================= the cast (approved earless odo5 cards)
const C = (o: Partial<Costume> & { pal: Record<string, string> }): Costume => ({ goggles: false, hairs: false, tufts: true, hat: null, stache: false, suit: false, apron: false, ...o });
const STAFF = (shirt: string, shade: string, hair: string, stache = false): Costume => C({ suit: true, stache, pal: { shirt, shirtShade: shade, collar: "#f4f2ec", tie: "#c3262c", hair, pocket: "#f4f2ec" } });
export const KEN = STAFF("#22304a", "#172036", "#2a201a"), YUKI = STAFF("#6a2232", "#4e1824", "#3a2418"), MIKA = STAFF("#3e4652", "#2c323c", "#1e1a16");
export const MANAGER = C({ suit: true, stache: true, pal: { shirt: "#1c1c22", shirtShade: "#121216", collar: "#f6f4ee", tie: "#c9a040", hair: "#5a5a60", pocket: "#c9a040" } });
export const TECH = C({ hat: "hard", pal: { shirt: "#3d6fa8", shirtShade: "#2c537f", hat: "#f2f0ea", hatShade: "#c8c4b8", hair: "#3a2a1e" } });
export const GUEST2 = C({ hat: "bowler", stache: true, suit: true, pal: { shirt: "#7a5a3a", shirtShade: "#5a4028", collar: "#efe6d0", tie: "#2a4a6a", hat: "#4a3a2a", hatShade: "#2e2418", band: "#7a2a22", hair: "#d8d4cc" } });
export const GUEST3 = C({ pal: { shirt: "#4a7a5a", shirtShade: "#365a42", collar: "#e8e0cc", hair: "#7a4a2a" } });
export const GUEST4 = C({ suit: true, pal: { shirt: "#8a6a9a", shirtShade: "#6a4e78", collar: "#f2ecdc", tie: "#2a2a30", hair: "#1e1a16" } });

// ---- the hero (guest): at the desk (loop seam) -> follows the porter -> chases it -> bed -> back to the desk
export const HERO_DESK: V3 = [-1.6, 0, -10.25];
const heroFace = ft([[0, "content"], [150, "content"], [166, "hugeShock"], [190, "doubleTake"], [214, "delighted"], [262, "content"], [500, "talking"], [545, "delighted"], [612, "proud"],
  [706, "content"], [712, "shocked"], [724, "confused"], [770, "xSideEyeR"], [846, "panic"], [922, "worried"], [1148, "hugeShock"], [1164, "xDisbelief"], [1200, "suspSquint"], [1240, "deadpan"],
  [1530, "bored"], [1600, "deadpan"], [1650, "content"]], 5);
const SUIT_HOLD = A([55, 60], "grip", 1, 1.2, [95, 40]);
const heroArms = (f: number): [typeof REST_L, typeof REST_R] => {
  if (f > 168 && f < 200) return [mixArm(REST_L, A([-110, -160], "open", -1, -2.5, [-100, -50]), sm(168, 174, f)), mixArm(REST_R, A([110, -160], "open", 1, 2.5, [100, -50]), sm(168, 174, f))];
  if (f > 500 && f < 545) return [REST_L, mixArm(REST_R, A([120, -30], "open", 1, 1.4, [90, -10]), sm(505, 515, f) * (1 - sm(535, 545, f)))];
  if (f >= 545 && f < 590) { const u = sm(552, 566, f) * (1 - sm(578, 590, f)); return [mixArm(REST_L, A([-50, 90], "grip", -1, -0.8, [-90, 50]), u), mixArm(REST_R, A([50, 90], "grip", 1, 0.8, [90, 50]), u)]; }
  if (f > 846 && f < 925) return [A([-80, -20], "open", -1, -1.8, [-100, 10]), A([90, -60], "open", 1, 1.6, [100, -10])];
  if (f >= 925 && f < 970) return [REST_L, SUIT_HOLD];
  if (f >= 1530 && f < 1612) return [REST_L, A([60, 40], "grip", 1, 1.3, [90, 30])];
  return [REST_L, REST_R]; };
const heroAct: Act = { c: HERO, seed: 7, face: heroFace, armL: (f) => heroArms(f)[0], armR: (f) => heroArms(f)[1] };
const HERO_PATHS: [number, V3][][] = [
  [[600, HERO_DESK], [612, [-1.2, 0, -10.1]], [700, [6.6, 0, -10.7]], [714, [7.2, 0, -10.85]]],                   // G-H: follows the porter, bumps into it
  [[846, [7.2, 0, -10.85]], [918, [14.6, 0, -11.05]], [928, [14.8, 0, -11.05]], [946, [13.2, 0, -11.2]], [962, [12.55, 0, -12.1]]],   // J: chase, grab, into 101
  [[1520, [8.4, 0, -11.2]], [1612, [-1.2, 0, -10.1]], [1626, HERO_DESK]],                                       // Q: back through the lobby to check out
];
const SLEEP_C: V3 = [BED.x0 + 0.95, BED.top + 0.24, BED.z + 0.02];                                             // card centre lying on the pillow
const SIT_C: V3 = [BED.x0 + 0.62, BED.top + 0.45, BED.z + 0.02];
const SNORE = 72;                                                                                               // frames per breath while asleep
export const snorePhase = (f: number) => ((f - 990) % SNORE + SNORE) % SNORE / SNORE;                          // 0..1, inhale ~0.55
const hero = (f: number, c: PCam): { p: Placed | null; suit: V3 | null; suitTilt: number } => {
  const a = heroAct;
  if (f < 600 || f >= 1626) { const lift = f >= 1626 ? 0 : sm(566, 584, f), floor: V3 = [-0.95, 0, -10.05], deck: V3 = [-0.55, 0.47, -9.85];   // F: lifted onto the porter's deck
    return { p: stand(a, HERO_DESK, f, { lookX: f > 140 && f < 170 ? -0.6 : f > 480 && f < 600 ? 0.6 : -0.3 }), suit: f >= 585 && f < 1626 ? null : [floor[0] + (deck[0] - floor[0]) * lift, deck[1] * Math.sin(lift * Math.PI / 2) + 0.12 * Math.sin(lift * Math.PI), floor[2] + (deck[2] - floor[2]) * lift], suitTilt: -1.2 * lift }; }
  for (const P of HERO_PATHS) if (f >= P[0][0] && f <= P[P.length - 1][0]) { const pf = keys(P), w = walker(a, pf, f, c, P[0][0]);
    const behind = lv(pf(Math.max(P[0][0], f - 14)), pf(f), 0.1);
    if (P === HERO_PATHS[1] && f >= 928) { const hr = handWorld(w, c.pos, 1); return { p: w, suit: [hr[0], 0, hr[2] + 0.05], suitTilt: 0.25 }; }
    if (P === HERO_PATHS[2]) return { p: w, suit: [behind[0] + 0.35, 0, behind[2] + 0.1], suitTilt: f < 1612 ? 0.35 : 0 };
    return { p: w, suit: null, suitTilt: 0 }; }
  if (f > 714 && f < 846) return { p: stand(a, [7.2, 0, -10.85], f, { lookX: f < 760 ? 0.5 : -0.7, squash: f > 712 && f < 720 ? 0.3 : 0 }), suit: null, suitTilt: 0 };
  if (f >= 964 && f < 1440) {                                                                                     // in bed (only ever seen inside room 101)
    const up = sm(1146, 1158, f), ph = snorePhase(f), breath = Math.sin(ph * Math.PI * 2);
    const pos = lv(SLEEP_C, SIT_C, up), roll = (Math.PI / 2) * (1 - up) + 0.12 * up - (f > 1146 && f < 1170 ? 0.05 * Math.sin((f - 1146) * 0.9) : 0);
    const face = f < 1146 ? { ...heroFace(f) } : heroFace(f);
    const pose = { ...stand(a, pos, f, {}).pose, blink: f < 1146, breathe: f * 0.07, armL: up > 0.5 ? A([-70, -20], "open", -1, -1.6, [-90, 10]) : REST_L, armR: REST_R };
    if (f < 1146) { pose.mouth = ph > 0.45 && ph < 0.75 ? "o" : "flat"; pose.mouthW = 0.6 + 0.5 * Math.max(0, breath); pose.lids = 1; pose.browL = 0.2; pose.browR = 0.2; pose.worry = 0; pose.eyes = "lid"; void face; }
    return { p: { pose, pos, h: 1.6, centre: true, roll, halo: 0.08, contact: 0 }, suit: null, suitTilt: 0 }; }
  return { p: null, suit: null, suitTilt: 0 }; };

// ---- staff + guests (individual schedules; nobody shares a curve)
type Who = { a: Act; on: [number, number]; at: (f: number, c: PCam) => Placed };
const KEN_ACT: Act = { c: KEN, seed: 21, face: ft([[380, "bored"], [430, "deadpan"], [470, "content"], [1228, "panic"], [1262, "focused"], [1282, "relieved"]]),
  armL: (f) => f < 520 ? A([-20, -40], "grip", -1, -1.9, [-70, -10]) : REST_L, armR: (f) => f < 520 ? A([40, -110], "grip", 1, 2.6, [70, -40]) : f > 1264 && f < 1282 ? A([90, 120], "grip", 1, 0.8, [100, 60]) : REST_R };
const KEN_IN: [number, V3][] = [[1226, [12.5, 0, -11.6]], [1236, [12.45, 0, -12.9]], [1262, [10.55, 0, -16.55]]];
const YUKI_ACT: Act = { c: YUKI, seed: 22, face: ft([[1270, "comicSerious"], [1310, "focused"], [1336, "awkwardSmile"]]), armR: (f) => f > 1286 ? A([95, 20], "grip", 1, 1.4, [100, 20]) : REST_R };
const MIKA_ACT: Act = { c: MIKA, seed: 23, face: ft([[1360, "nervousLaugh"], [1420, "uncomfyGrin"], [1470, "embarrassed"], [1540, "focused"], [1600, "content"]]),
  armR: (f) => f < 1505 ? A([110, -120], "open", 1, 2.2, [90, -40]) : A([60, 40], "grip", 1, 1.3, [90, 30]), armL: (f) => f > 1505 ? A([-60, 40], "grip", -1, -1.3, [-90, 30]) : REST_L };
const TECH_ACT: Act = { c: TECH, seed: 24, face: ft([[1360, "focused"], [1430, "confused"], [1470, "xDisbelief"], [1530, "focused"]]),
  armR: (f) => f < 1500 ? A([110, 40 + 25 * Math.sin(f * 0.31)], "grip", 1, 1.2, [100, 30]) : A([60, 40], "grip", 1, 1.3, [90, 30]), armL: (f) => f > 1500 ? A([-60, 40], "grip", -1, -1.3, [-90, 30]) : REST_L };
const MGR_ACT: Act = { c: MANAGER, seed: 25, face: ft([[1400, "comicSerious"], [1452, "cringe"], [1500, "deadpan"], [1560, "relieved"]]),
  armR: (f) => f > 1452 && f < 1500 ? mixArm(REST_R, A([20, -175], "open", 1, 2.9, [70, -70]), sm(1452, 1460, f)) : A([40, 30], "grip", 1, 1.0, [80, 20]) };
const G2_ACT: Act = { c: GUEST2, seed: 26, face: ft([[740, "talking"], [784, "content"], [800, "confused"], [826, "tinyConfused"], [846, "xDisbelief"]]),
  armR: (f) => f > 760 && f < 800 ? A([110, -60], "open", 1, 1.6, [90, -20]) : REST_R, armL: (f) => f > 812 && f < 846 ? A([-30, -110], "open", -1, -2.4, [-80, -40]) : REST_L };
const G3_ACT: Act = { c: GUEST3, seed: 27, face: ft([[0, "talking"], [300, "content"], [520, "talking"], [900, "content"], [1380, "suspicious"], [1500, "content"]]),
  armR: (f) => A([80 + 20 * Math.sin(f * 0.13), -40 + 18 * Math.sin(f * 0.07)], "open", 1, 1.6, [90, -10]) };
const G4_ACT: Act = { c: GUEST4, seed: 28, face: ft([[0, "content"], [320, "delighted"], [700, "talking"], [1380, "nervousLaugh"], [1520, "content"]]),
  armL: (f) => (f % 211) < 40 ? A([-60, -100], "open", -1, -2.0, [-80, -30]) : REST_L };
const WHO: Who[] = [
  { a: KEN_ACT, on: [370, 525], at: (f, c) => f < 500 ? stand(KEN_ACT, [5.55, 0, -13.05], f, { lookX: -0.4, lean: -0.03 }) : walker(KEN_ACT, keys([[500, [5.55, 0, -13.05]], [522, [5.2, 0, -13.75]]]), f, c, 500) },
  { a: KEN_ACT, on: [1226, 1300], at: (f, c) => f < 1262 ? walker(KEN_ACT, keys(KEN_IN), f, c, 1226) : stand(KEN_ACT, KEN_IN[2][1], f, { lean: f > 1264 && f < 1282 ? 0.14 : 0, lookX: -0.6 }) },
  { a: YUKI_ACT, on: [1270, 1350], at: (f, c) => walker(YUKI_ACT, keys([[1270, [16.2, 0, -11.3]], [1286, [15.9, 0, -11.3]], [1346, [12.9, 0, -11.3]]]), f, c, 1270) },
  { a: MIKA_ACT, on: [1350, 1679], at: (f, c) => f < 1505 ? stand(MIKA_ACT, [-1.55, 0.22, -11.85], f, { lookX: -0.8 }) : f < 1640 ? walker(MIKA_ACT, keys([[1505, [-1.55, 0.22, -11.85]], [1520, [1.6, 0, -11.0]], [1560, [8.0, 0, -6.7]], [1576, [8.0, 0, -6.7]], [1640, [5.2, 0, -13.6]]]), f, c, 1505) : stand(MIKA_ACT, [5.2, -9, -13.9], f) },
  { a: TECH_ACT, on: [1350, 1679], at: (f, c) => f < 1500 ? stand(TECH_ACT, [6.0, 0, -9.35], f, { lean: 0.12, lookX: 0.7 }) : f < 1642 ? walker(TECH_ACT, keys([[1500, [6.0, 0, -9.35]], [1520, [7.9, 0, -3.7]], [1540, [7.9, 0, -3.7]], [1642, [5.2, 0, -13.6]]]), f, c, 1500) : stand(TECH_ACT, [5.2, -9, -13.9], f) },
  { a: MGR_ACT, on: [1380, 1679], at: (f) => stand(MGR_ACT, [0.5, 0, -8.9], f, { lookX: f < 1500 ? -0.8 : 0.6 }) },
  { a: G2_ACT, on: [700, 1000], at: (f, c) => f < 760 ? walker(G2_ACT, keys([[700, [1.6, 0, -7.7]], [760, [5.6, 0, -7.95]]]), f, c, 700) : f < 860 ? stand(G2_ACT, [5.6, 0, -7.95], f, { lookX: 0.6 }) : walker(G2_ACT, keys([[860, [5.6, 0, -7.95]], [1000, [-3.6, 0, -6.2]]]), f, c, 860) },
  { a: G3_ACT, on: [0, N], at: (f) => stand(G3_ACT, [-5.0, 0, -5.2], f, { lookX: -0.8 + 0.3 * Math.sin(f * 0.021) }) },
  { a: G4_ACT, on: [0, N], at: (f) => stand(G4_ACT, [-6.15, 0, -5.55], f, { lookX: 0.7 }) },
];

// ================================================================= the robots
/** idle breathing / glances (integer cycles per loop so frame N == frame 0) */
const loopSin = (f: number, cycles: number, ph = 0) => Math.sin((f / N) * Math.PI * 2 * cycles + ph);
export const raptors = (f: number): RaptorState[] => {
  const a: RaptorState = { ...RAPTOR_REST, headYaw: 0.25 * loopSin(f, 9, 1), headPitch: 0.06 * loopSin(f, 14), breathe: loopSin(f, 40), tail: loopSin(f, 11, 2), jaw: 0.05 };
  const b: RaptorState = { ...RAPTOR_REST, headYaw: -0.2 + 0.2 * loopSin(f, 8, 3), headPitch: 0.05 * loopSin(f, 13, 1), breathe: loopSin(f, 37, 1), tail: loopSin(f, 10, 0.4), jaw: 0.05 };
  // C: raptor A rears + roars at the hero, then bows politely
  const rear = sm(156, 166, f) * (1 - sm(196, 206, f)), bow = sm(206, 222, f) * (1 - sm(240, 256, f));
  a.headPitch += 0.5 * rear; a.jaw = Math.max(a.jaw, rear * (0.75 + 0.25 * Math.sin(f * 1.3))); a.headYaw = a.headYaw * (1 - rear) + 0.45 * rear; a.armL = 0.7 * rear; a.armR = 0.7 * rear; a.bow = -0.25 * rear + bow;
  // F: raptor B hands the key card over
  const give = sm(506, 520, f) * (1 - sm(540, 552, f)); b.armR = Math.max(b.armR, give); b.cardOut = give > 0.2 ? 1 : 0; b.headYaw = b.headYaw * (1 - give) + 0.5 * give; b.bow = 0.2 * give;
  // P: raptor A can't read the passport Mika holds up: confused head tilts, jaw flaps, eyes flicker
  if (f > 1380 && f < 1500) { a.headYaw = -0.6 + 0.15 * Math.sin(f * 0.2); a.headPitch = 0.1 * Math.sin(f * 0.37); a.jaw = 0.25 + 0.2 * Math.sin(f * 0.9); a.eyes = ((f % 23) < 3) ? 0.2 : 1; }
  return [a, b]; };
export const conciergeAt = (f: number): ConciergeState => {
  const s: ConciergeState = { face: "eyes", phase: 0, headTilt: 0.06 * loopSin(f, 12), headYaw: 0.25 * loopSin(f, 7, 2), wave: 0, armL: 0, panel: 0, on: 1 };
  s.wave = sm(586, 594, f) * (1 - sm(612, 620, f)); if (s.wave > 0) s.face = "happy";
  if (f > 768 && f < 846) { s.face = "loading"; s.phase = Math.floor(f / 3) % 8; s.headTilt = 0.18 * Math.sin((f - 768) * 0.09); s.headYaw = 0.3; }
  if (f > 1370 && f < 1500) { s.panel = sm(1372, 1384, f) * (1 - sm(1488, 1500, f)); s.on = f < 1500 ? 0 : 1; s.headTilt = 0.25; }
  if (f >= 1500) { s.on = 1 - sm(1520, 1530, f); s.headTilt = 0.3 * sm(1520, 1540, f); s.face = "eyes"; }
  if (f >= 1500 && (s.on ?? 1) < 0.1) s.face = "off";
  return s; };
/** the luggage robot: parked (loop seam) -> to the hero -> loaded -> to the corridor -> error -> wrong room -> pushed back -> parked */
const PARK: V3 = [4.0, 0, -7.6];
const PORTER_PATH: [number, V3][] = [[0, PARK], [516, PARK], [552, [-0.55, 0, -9.75]], [600, [-0.55, 0, -9.75]], [640, [3.2, 0, -10.45]], [702, [7.85, 0, -11.1]], [800, [7.85, 0, -11.1]], [848, [11.0, 0, -11.3]],
  [902, [15.25, 0, -11.45]], [928, [15.35, 0, -11.45]], [1286, [15.35, 0, -11.45]], [1346, [12.9, 0, -11.3]], [1450, [12.9, 0, -11.3]], [1500, [8.6, 0, -11.2]], [1556, [5.6, 0, -8.8]], [1600, PARK], [N, PARK]];
const porterPos = keys(PORTER_PATH);
export const porterAt = (f: number) => { const p = porterPos(f), q = porterPos(f + 3), dx = q[0] - p[0], dz = q[2] - p[2], mv = Math.hypot(dx, dz) > 0.004;
  let ry = Math.atan2(dx, dz); if (!mv) ry = f < 516 || f >= 1600 ? -Math.PI / 2 : f < 600 ? -Math.PI / 2 : f < 902 ? Math.PI / 2 : f < 1286 ? -0.2 : Math.PI / 2;
  if (f >= 1286 && f < 1346) ry = Math.PI / 2;                                    // pushed back in reverse (faces the wrong door)
  const err = (f > 704 && f < 800) || (f > 902 && f < 930) ? 1 : 0, bump = f > 902 && f < 928 ? Math.max(0, Math.sin((f - 902) * 0.8)) * 0.06 : 0;
  const s: PorterState = { err, face: err ? "alert" : mv ? "happy" : "eyes", wheel: 0, load: f >= 585 && f < 928, tilt: 0 };
  return { s, p: [p[0] + Math.sin(ry) * bump, 0, p[2] + Math.cos(ry) * bump] as V3, ry }; };
/** workforce: all on (loop seam); B: 4 of 6 power down one by one; C (off camera): they reboot; Q: 4 power down for good, 2 wheeled away */
const OFF_B = [98, 0, 110, 122, 0, 134], OFF_Q = [1530, 0, 1538, 1546, 0, 1554];
export const workersAt = (f: number): { s: WorkerState; p: V3; ry: number; gone: boolean; dolly: boolean }[] => ALCOVES.map((p0, i) => {
  let on = 1; if (OFF_B[i]) on *= 1 - sm(OFF_B[i], OFF_B[i] + 8, f) * (1 - sm(200 + i * 4, 210 + i * 4, f));
  if (OFF_Q[i]) on *= 1 - sm(OFF_Q[i], OFF_Q[i] + 8, f);
  const droop = 1 - on, look = 0.4 * loopSin(f, 5 + i, i), s: WorkerState = { on, droop, look: look * on };
  // Q: robot 0 (Mika) and robot 3 (Tech) are tipped onto dollies and wheeled to the office door; they never come back
  const roll = (i === 0 ? keys([[1576, [8.0, 0, -6.7]], [1640, [5.2, 0, -13.5]]]) : i === 3 ? keys([[1540, [7.9, 0, -3.7]], [1642, [5.2, 0, -13.5]]]) : null);
  if (roll && f >= (i === 0 ? 1566 : 1530)) { const q = roll(f), gone = f >= (i === 0 ? 1641 : 1643); return { s, p: [q[0], 0.14, q[2]], ry: Math.PI + 0.3, gone, dolly: true }; }
  return { s, p: p0, ry: -Math.PI / 2, gone: false, dolly: false }; });
export const eggAt = (f: number): EggState => {
  const ph = snorePhase(f), listening = f > 1010 && f < 1110 && ph > 0.5 && ph < 0.9 ? Math.sin((ph - 0.5) / 0.4 * Math.PI) : 0;
  const s: EggState = { face: "sleepy", ring: 0.25 + 0.75 * listening, screen: 0.35 + 0.5 * listening };
  if (f >= 1060 && listening > 0.3) s.face = "eyes";
  if (f >= 1110 && f < 1205) { s.face = "alert"; s.ring = 1; s.screen = 1; }
  if (f >= 1205 && f < 1272) { s.face = (f % 40) < 4 ? "sleepy" : "happy"; s.ring = 0.6; s.screen = 0.9; }
  if (f >= 1272) { s.face = "off"; s.ring = 0; s.screen = 0; }
  return s; };
/** floor cleaner: periodic loop around the lounge (2 laps per film) with a stuck "bump" against the sofa leg */
export const cleanerAt = (f: number): { p: V3; ry: number } => { const t = (f / N) * Math.PI * 2 * 2, x = -5.6 + 1.6 * Math.cos(t), z = -6.1 + 1.25 * Math.sin(t * 1);
  return { p: [x, 0, z], ry: Math.atan2(-1.6 * Math.sin(t), 1.25 * Math.cos(t)) }; };

// ================================================================= per-frame output
export type FrameOut = { c: PCam; actors: Placed[]; suit: { p: V3; tilt: number; ry: number } | null; raptors: RaptorState[]; concierge: ConciergeState; porter: ReturnType<typeof porterAt>;
  workers: ReturnType<typeof workersAt>; egg: EggState; cleaner: { p: V3; ry: number }; doors: number; door101: number; duvetLift: number; zone: ReturnType<typeof zoneW> };
export const frameAt = (f0: number): FrameOut => {
  const f = wrap(f0), c = camAt(f), actors: Placed[] = [];
  const h = hero(f, c); if (h.p) actors.push(h.p);
  for (const w of WHO) if (f >= w.on[0] && f < w.on[1]) actors.push(w.at(f, c));
  const doors = Math.max(sm(48, 72, f) * (1 - sm(104, 128, f)), sm(1616, 1630, f) * (1 - sm(1654, 1672, f)));
  const door101 = Math.max(sm(948, 960, f) * (1 - sm(996, 1010, f)), sm(1222, 1232, f) * (1 - sm(1440, 1460, f)));
  return { c, actors, suit: h.suit ? { p: h.suit, tilt: h.suitTilt, ry: 0.3 } : null, raptors: raptors(f), concierge: conciergeAt(f), porter: porterAt(f), workers: workersAt(f), egg: eggAt(f),
    cleaner: cleanerAt(f), doors, door101, duvetLift: sm(1146, 1158, f), zone: zoneW(c) };
};
void NIGHTSTAND; void DOOR101; void CONCIERGE_AT; void OFFICE_DOOR; void DOORS; void cl;
