// joralemon timeline: ONE continuous camera (keys on the narration beats -> monotone cubic -> Gaussian) and the hero's
// blocking + acting (pure functions of the film frame). Other characters live in life.ts.
import { V3, lerp, smooth, clamp01 } from "../../lib/math";
import { camPath, type Cam } from "../london-bridge/common";
import { pose5, COSTUME, REST_L, REST_R, type Odo5Pose, type Costume } from "../../char/odo5";
import { FACES, faceTrack, withFace, type FaceName } from "../short3/expr";
import { SW_Y, PF, STOOP, FILM_FRAMES } from "./world";

// ================================================================ camera
const K = (f: number, pos: V3, look: V3, fov: number) => ({ f, pos, look, fov });
const OPEN = K(0, [-9.5, 1.15, 7.4], [-0.5, 3.8, 0.5], 50);
export const camMain = camPath([
  OPEN,
  K(40, [-7.0, 1.2, 7.4], [-1.4, 2.9, 1.5], 50),                 // S01 low tracking along the sidewalk
  K(76, [-4.6, 1.35, 7.6], [-0.9, 2.9, 1.6], 48),                  //     rising push toward No. 58
  K(112, [-2.6, 1.2, 7.8], [-0.8, 2.6, 2.2], 50),                // S02 he looks left / right
  K(152, [-1.0, 1.0, 7.4], [-0.3, 3.2, 1.0], 54),                 //     dolly in, tilting up
  K(186, [0.4, 1.0, 5.8], [0.2, 3.6, 0.0], 56),                  //     the upper windows
  K(222, [0.5, 0.95, 4.8], [0.1, 3.0, 0.0], 56),                 // S03 push in to the black parlour window
  K(256, [0.4, 0.95, 4.2], [0.1, 2.9, 0.0], 56),             //     his confused face in the foreground
  K(284, [-2.6, 2.5, 4.4], [-6.2, 3.3, 0.0], 44),              // S04 slide to No. 56's window (curtains)
  K(306, [0.4, 1.0, 4.3], [0.1, 2.9, 0.0], 56),                 //     and back to the black glass
  K(330, [-0.9, 2.3, 4.6], [-2.0, 2.7, 0.2], 46),                 // S05 down to the steel door
  K(352, [1.5, 1.9, 7.6], [-0.4, 2.1, 1.6], 48),                  //     wider: passers-by on the sidewalk
  K(374, [0.35, 1.72, 3.95], [0.15, 1.62, 2.25], 38),             //     "Seriously?" (his face)
  K(404, [0.9, 1.1, 8.2], [0.2, 4.6, 0.0], 58),                  // S06 reveal 1: back + up, the wall dissolves
  K(444, [0.7, 2.2, 6.6], [0.0, 4.0, -3.0], 56),
  K(482, [0.25, 4.3, 0.9], [0.0, 3.9, -6.0], 56),                 //     at the cutaway: fans + walkways
  K(522, [0.4, 3.8, 0.1], [0.7, 3.0, -5.0], 56),                  // S07 1847: into the parlour
  K(560, [-0.3, 3.5, -0.8], [1.4, 2.5, -4.6], 58),                //     the family
  K(590, [0.4, 3.5, 1.8], [0.3, 3.0, -4.0], 56),                  // S08 1907: back out through the (ghost) front
  K(622, [2.5, 2.3, 15.2], [-2.5, 1.0, 6.5], 52),                  //     street level: the works arrive
  K(652, [1.0, -7.0, 14.5], [-1.5, -15.0, 5.0], 56),              //     down through the cut street
  K(678, [-3.2, -18.3, 15.5], [-3.0, -19.3, 5.0], 54),            //     the tunnel takes shape, a train runs
  K(714, [3.5, 2.6, 14.0], [4.0, 1.6, 8.6], 50),                  // S09 up to the worksite (fan on the derrick)
  K(740, [7.8, 2.1, 14.6], [4.2, 1.7, 8.6], 48),                  //     track round the fan
  K(772, [-1.6, 1.7, 12.7], [-3.2, 1.3, 9.0], 44),                //     to the engineer + the model
  K(806, [-4.2, 2.3, 13.6], [-0.8, 6.2, 0.0], 54),                // S10 the imagined plant grows
  K(852, [-1.2, 3.0, 16.0], [0.0, 7.0, 0.0], 58),                 //     wide: elegant houses vs the eyesore
  K(902, [4.2, 2.0, 13.8], [-0.5, 5.0, 1.0], 54),                 //     residents react (foreground)
  K(946, [-2.0, 1.8, 11.9], [-3.2, 1.2, 9.0], 40),                //     the engineer crosses it out
  K(984, [-2.7, 2.1, 12.5], [-0.4, 4.6, 0.0], 50),                //     ...and looks at the real house
  K(1012, [0.9, 4.1, 7.0], [0.0, 4.3, -5.0], 58),                 // S11 the conversion cutaway
  K(1050, [0.6, 4.5, 5.2], [0.0, 4.3, -5.0], 58),
  K(1088, [-4.2, 1.45, 7.8], [-3.0, 2.0, 2.0], 46),               // S12 today: following him past the house
  K(1140, [0.5, 2.7, 13.4], [0.0, 5.6, 0.0], 52),                 //     widen to the full house
  K(1172, [0.4, 5.6, 7.2], [0.0, 4.0, -5.0], 56),                 // S13 reveal 2
  K(1202, [0.3, 3.0, 2.2], [0.0, 0.0, -3.5], 60),                 //     in and down toward the shaft
  K(1236, [1.4, -6.5, 4.4], [-0.8, -10.5, -3.4], 58),               //     down the shaft past the stair
  K(1266, [-2.0, -18.5, 15.0], [-2.5, -19.4, 5.0], 54),            //     the train beneath
  K(1304, [5.6, 1.6, 7.7], [2.0, 2.4, 1.6], 48),                  // S14 up to the street
  K(1350, [2.0, 1.35, 7.4], [-1.5, 2.4, 0.8], 50),                //     tracking with the pedestrians (+ a glimpse below)
  K(1396, [-3.4, 1.25, 7.4], [-2.2, 2.4, 2.0], 44),               //     his side-eye
  K(1432, [-7.6, 1.2, 7.2], [-0.8, 3.7, 0.4], 49),               // S15 back to the opening composition
  { ...OPEN, f: FILM_FRAMES - 1 },
], 5);
export const camAt = (f: number): Cam => camMain(f);

// ================================================================ the hero (odo: goggles, teal jacket, paper shopping bag)
export const HERO: Costume = { ...COSTUME.odo, apron: false, pal: { shirt: "#2f6f78", shirtShade: "#22545b", hair: "#ebe9f0", hairShade: "#b9b4c4" } };
export type Placed = { pose: Odo5Pose; pos: V3; h: number; flip?: boolean; halo?: number; light?: number };
const WALK_Z = 3.7, LAND: V3 = [0.15, SW_Y, 2.25];
const gaitPose = (c: Costume, d: number, walking: number, extra: Partial<Odo5Pose> = {}) => pose5({ costume: c, view: walking > 0.02 ? "side" : "front", gait: d / 0.95, walk: walking, stride: 0.95, lean: 0.05 * walking, ...extra });
const heroFace = faceTrack([
  [0, "content"], [72, "neutral"], [80, "suspicious"], [100, "sideEyeL"], [116, "sideEyeR"], [134, "suspicious"], [190, "focused"], [214, "confused"],
  [270, "suspicious"], [284, "awkwardSmile"], [312, "sideEyeL"], [330, "focused"], [346, "awkwardSmile"], [358, "deadpan"], [392, "shocked"], [420, "panic"],
  [1064, "content"], [1100, "bored"], [1384, "suspicious"], [1398, "cringe"], [1410, "nervousLaugh"], [1420, "content"],
] as [number, FaceName][], 6);
/** walk along a 1-D path: constant speed with short accel/decel ramps (rampIn/rampOut frames; 0 = already walking / keeps walking) */
const walkSeg = (f: number, f0: number, f1: number, d: number, rampIn = 8, rampOut = 10) => {
  const T = f1 - f0, v = d / (T - rampIn / 2 - rampOut / 2), t = Math.max(0, Math.min(T, f - f0));
  let x: number; if (t < rampIn) x = (v * t * t) / (2 * rampIn); else if (t < T - rampOut) x = (v * rampIn) / 2 + v * (t - rampIn); else { const r = T - t; x = d - (v * r * r) / (2 * Math.max(1e-6, rampOut)); }
  const w = f <= f0 || f >= f1 ? 0 : Math.min(1, rampIn ? t / rampIn : 1, rampOut ? (T - t) / rampOut : 1) * 0.85 + 0.15;
  return { d: x, w: f <= f0 || f >= f1 ? 0 : w };
};
export const heroAt = (f: number): Placed | null => {
  const blink = ((f + 11) % 83) < 3, base = { blink, holdR: "bag" as const };
  const face = heroFace(f);
  // S01-S06: walks in, stops, looks, climbs the stoop, peers, reacts (gone before the era dissolve completes)
  if (f < 500) {
    if (f < 76) { const s = walkSeg(f, -48, 76, 10.65, 0, 12); return { pose: withFace(gaitPose(HERO, s.d, s.w, base), face, f, 1), pos: [-11.6 + s.d, SW_Y, WALK_Z], h: 1.5, halo: 0.12 }; }
    if (f < 150) { const look = f < 92 ? smooth(76, 88, f) : 1 - smooth(130, 146, f) * 0.6; const lean = smooth(130, 140, f) * (1 - smooth(146, 152, f));
      return { pose: withFace(pose5({ costume: HERO, ...base, lookY: -0.8 * (f < 100 ? look : 0.3), lean: lean * 0.18, armR: { ...REST_R, shape: "grip" } }), face, f, 1), pos: [-1.0, SW_Y, WALK_Z], h: 1.5, halo: 0.12 }; }
    if (f < 194) { if (f < 150 + 0) {} const s = walkSeg(f, 150, 178, Math.hypot(1.15, 1.45), 6, 8); const u = s.d / Math.hypot(1.15, 1.45);   // to the fence below the black window
      return { pose: withFace(gaitPose(HERO, s.d, s.w, base), face, f, 1), pos: [lerp(-1.0, LAND[0], u), SW_Y, lerp(WALK_Z, LAND[2], u)], h: 1.5, halo: 0.12 }; }
    const leanIn = (f < 266 ? smooth(200, 222, f) : f < 312 ? 0.5 : 0.2) * 0.6, tilt = f >= 267 && f < 312 ? Math.sin((f - 267) / 44 * Math.PI) * 0.22 : 0;
    const lookCam = smooth(356, 366, f) * (1 - smooth(388, 396, f));
    const shock = smooth(392, 400, f), arms = f > 392 ? { armL: { hand: [-96, -40] as [number, number], elbow: [-70, 50] as [number, number], shape: "open" as const, rot: -0.4, bend: -1 }, armR: { hand: [96, -40] as [number, number], elbow: [70, 50] as [number, number], shape: "open" as const, rot: 0.4, bend: 1 } } : {};
    const p = withFace(pose5({ costume: HERO, ...base, lean: leanIn * 0.2 - shock * 0.08, headRoll: tilt, ...arms }), face, f, 1);
    const up = smooth(196, 210, f) * (1 - smooth(300, 318, f)) + smooth(392, 400, f) * 0.6;
    return { pose: { ...p, lookX: lerp(p.lookX, 0, lookCam), lookY: lerp(lerp(p.lookY, -0.75, up), 0, lookCam), squash: shock * (1 - smooth(400, 412, f)) * -0.6 }, pos: LAND, h: 1.5, halo: 0.14, light: 1.2 };
  }
  if (f < 1060) return null;
  // S12: strolls past No. 58 eastward (+x), out of the shot by ~1200
  if (f < 1220) { const s = walkSeg(f, 1060, 1220, 15.5); return { pose: withFace(gaitPose(HERO, s.d, s.w, base), face, f, 1), pos: [-6.0 + s.d, SW_Y, WALK_Z + 0.2], h: 1.5, halo: 0.12 }; }
  if (f < 1270) return null;
  // S14: comes back westward with the crowd, stops, side-eyes the house, walks on past the camera (loop: he will walk in again)
  if (f < 1380) { const s = walkSeg(f, 1270, 1380, 9.8, 0, 12); return { pose: withFace(gaitPose(HERO, s.d, s.w, base), face, f, 1), pos: [7.0 - s.d, SW_Y, WALK_Z], h: 1.5, flip: true, halo: 0.12 }; }
  if (f < 1408) { const sq = smooth(1396, 1404, f) * (1 - smooth(1416, 1426, f));
    return { pose: withFace(pose5({ costume: HERO, ...base, lean: 0.06 * sq, headRoll: -0.12 * sq, armL: { ...REST_L } }), face, f, 1), pos: [-2.8, SW_Y, WALK_Z], h: 1.5, halo: 0.13 }; }
  const s = walkSeg(f, 1408, FILM_FRAMES + 60, 9.9, 8, 0); return { pose: withFace(gaitPose(HERO, s.d, s.w, base), face, f, 1), pos: [-2.8 - s.d, SW_Y, WALK_Z], h: 1.5, flip: true, halo: 0.12 };
};
export { FACES, STOOP };
