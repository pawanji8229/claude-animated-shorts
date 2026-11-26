// joralemon acting test (approval preview C): a close two-shot on the sidewalk in front of No. 58. The hero runs
// through the exaggerated expression set with eased transitions, head tilts, squash and gestures; his neighbour
// reacts on her OWN timing (never the same face at the same moment). Background = the real film set (frame 150).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useTexReady } from "../short3/tex";
import { JSet } from "./Set";
import { Toon, type Cam } from "../london-bridge/common";
import { pose5, REST_L, REST_R, ARM, COSTUME, type Odo5Pose } from "../../char/odo5";
import { faceTrack, withFace, type FaceName } from "../short3/expr";
import { HERO } from "./timeline";
import { SW_Y } from "./world";
import { smooth, lerp } from "../../lib/math";

export const EXPR_FRAMES = 300;
const heroF = faceTrack([[0, "content"], [18, "xSideEyeL"], [46, "oneBrowUp"], [74, "browsShoot"], [96, "hugeShock"], [124, "tinyConfused"], [152, "frozenSmile"],
  [180, "suspSquint"], [204, "content"], [214, "doubleTake"], [236, "uncomfyGrin"], [258, "embarrassed"], [280, "comicSerious"]] as [number, FaceName][], 5);
const ladyF = faceTrack([[0, "bored"], [30, "xSideEyeR"], [70, "deadpan"], [104, "xDisbelief"], [140, "suspicious"], [170, "oneBrowUp"], [222, "browsShoot"], [250, "smug"], [276, "xSideEyeR"]] as [number, FaceName][], 6);
const LADY = { ...COSTUME.clerk, hat: null, suit: false, pal: { ...(COSTUME.clerk.pal ?? {}), shirt: "#7a3a52", shirtShade: "#5a2a3c", hair: "#8a5a32", hairShade: "#6a4022" } };
const heroPose = (f: number): Odo5Pose => {
  const look = f >= 204 && f < 214 ? 1 : 0;   // double-take: glance away... snap back
  const tilt = 0.12 * Math.sin(f * 0.07) * smooth(120, 130, f) * (1 - smooth(150, 156, f)) - 0.1 * smooth(180, 186, f) * (1 - smooth(200, 206, f)) + 0.16 * smooth(258, 266, f) * (1 - smooth(280, 288, f));
  const pop = -0.35 * (smooth(74, 77, f) * (1 - smooth(77, 84, f)) + smooth(96, 99, f) * (1 - smooth(99, 108, f)) + smooth(214, 216, f) * (1 - smooth(216, 224, f)));
  const arms: Partial<Odo5Pose> = f >= 96 && f < 124 ? { armL: { hand: [-104, -60], elbow: [-74, 40], shape: "open", rot: -0.5, bend: -1 }, armR: { hand: [104, -60], elbow: [74, 40], shape: "open", rot: 0.5, bend: 1 } }
    : f >= 124 && f < 152 ? { armR: ARM.shrugR, armL: { hand: [-110, -40], elbow: [-80, 50], shape: "open", rot: 0.8, bend: -1 } }
    : f >= 46 && f < 74 ? { armR: ARM.scratch, scratch: f * 0.4 } : f >= 258 && f < 282 ? { armL: { hand: [-30, -150], elbow: [-90, -20], shape: "open", rot: 0.2, bend: -1 } } : {};
  const p = withFace(pose5({ costume: HERO, holdR: "bag", blink: ((f + 7) % 61) < 3 && !(f > 90 && f < 130), breathe: Math.sin(f * 0.12) * 0.5, lean: 0.12 * smooth(180, 188, f) * (1 - smooth(200, 206, f)), headRoll: tilt, squash: pop, armL: REST_L, armR: { ...REST_R, shape: "grip" }, ...arms }), heroF(f), f, 1);
  return { ...p, lookX: look ? 1.0 : p.lookX, lookY: look ? -0.2 : p.lookY };
};
const ladyPose = (f: number): Odo5Pose => withFace(pose5({ costume: LADY, holdR: "grocery", blink: ((f + 23) % 73) < 3, breathe: Math.sin(f * 0.1 + 1) * 0.5, headRoll: -0.08 * smooth(100, 108, f) * (1 - smooth(136, 142, f)), squash: -0.3 * smooth(222, 225, f) * (1 - smooth(225, 232, f)), lookX: -0.6 }), ladyF(f), f, 5);
const CAM = (f: number): Cam => { const t = smooth(0, EXPR_FRAMES, f); return { pos: [lerp(-0.9, -0.72, t), 1.36, lerp(6.55, 6.1, t)], look: [lerp(-0.86, -0.76, t), 1.1, 3.4], fov: 41, focus: 2.5 }; };
export const JExprTest: React.FC = () => { const f = useCurrentFrame(); const ready = useTexReady();
  if (!ready) return <AbsoluteFill style={{ backgroundColor: "#a9c7e6" }} />;
  return <JSet era="now" camAt={() => CAM(f)} frameOverride={800} hideHero extra={(c, hi) => <>
    <Toon pose={heroPose(f)} pos={[-1.02, SW_Y, 3.95]} cam={c.pos} h={1.5} hi={hi} halo={0.14} light={1.4} />
    <Toon pose={ladyPose(f)} pos={[-0.5, SW_Y, 3.05]} cam={c.pos} h={1.45} hi={hi} halo={0.12} light={1.0} flip />
  </>} />;
};
