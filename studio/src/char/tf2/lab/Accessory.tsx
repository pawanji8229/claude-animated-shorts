// Accessory / eye / hand QC pages (rendered identically before and after the visual fix):
//   0 standing face close-up   1 three-quarter close-up   2 profile close-up   3 walking sideways (6 phases)
//   4 walking towards the camera (6 phases)   5 head turning (7 angles)   6 expressions (8)   7 hands (gestures) close-up
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { drawTF2 } from "../draw";
import { solve, restLeg, type BodyPose } from "../body";
import { NEUTRAL } from "../face";
import { evalEmotion, type EmotionName } from "../emotion";
import { REST, gesturePose } from "../gestures";
import { evaluate, type Script } from "../planner";
import { TF2_HERO } from "../costume";

type G = CanvasRenderingContext2D;
const BG = "#efe7d8";
export const ACC_PAGES = 8;
const label = (g: G, t: string, x: number, y: number, s = 24) => { g.save(); g.font = `600 ${s}px Arial`; g.fillStyle = "#3a2a24"; g.textAlign = "center"; g.fillText(t, x, y); g.restore(); };
const P0 = (o: Partial<BodyPose> = {}): BodyPose => ({ yaw: 0, root: [0, 0, 0], pelvisRoll: 0, pelvisYaw: 0, lean: 0, bend: 0, twist: 0, slump: 0, squash: 0, chest: 0, shoulderL: 0, shoulderR: 0, head: { yaw: 0, pitch: 0, roll: 0 }, armL: { ...REST(-1) }, armR: { ...REST(1) }, legL: restLeg(-1), legR: restLeg(1), face: NEUTRAL, ...o });
const put = (g: G, x: number, ground: number, s: number, draw: () => void) => { g.save(); g.translate(x - 300 * s, ground - 975 * s); g.scale(s, s); draw(); g.restore(); };
const happy = () => evalEmotion([{ e: "happiness", level: 2 }]).face;
const WALK_SIDE: Script = { id: "ws", seed: 4, costume: TF2_HERO, start: [-3, 0], facing: Math.PI / 2, actions: [{ kind: "walk", f0: 0, f1: 400, to: [5, 0], style: "normal" }], emotions: [{ f: 0, mix: [{ e: "happiness", level: 2 }] }] };
const WALK_TOWARD: Script = { id: "wt", seed: 5, costume: TF2_HERO, start: [0, -4], facing: 0, actions: [{ kind: "walk", f0: 0, f1: 400, to: [0, 4], style: "normal" }], emotions: [{ f: 0, mix: [{ e: "happiness", level: 2 }] }] };
const drawPage = (g: G, page: number) => {
  g.fillStyle = BG; g.fillRect(0, 0, 1080, 1920); const c = TF2_HERO;
  const close = (yaw: number, title: string) => { label(g, title, 540, 70, 34); const face = happy(); put(g, 540, 2300, 2.2, () => drawTF2(g, solve(P0({ yaw, face })), face, { costume: c })); };
  if (page === 0) close(0, "Standing: face close-up");
  else if (page === 1) close(0.62, "Three-quarter view close-up");
  else if (page === 2) close(Math.PI / 2, "Profile view close-up (walking angle)");
  else if (page === 3 || page === 4) { const sc = page === 3 ? WALK_SIDE : WALK_TOWARD, cam: [number, number, number] = [0, 1.2, 14]; label(g, page === 3 ? "Walking sideways: 6 phases of one cycle" : "Walking towards the camera: 6 phases", 540, 70, 32);
    for (let k = 0; k < 6; k++) { const fr = evaluate(sc, 60 + Math.round(k * 3.1), cam), x = 180 + (k % 3) * 360, y = 880 + Math.floor(k / 3) * 860; put(g, x, y, 0.82, () => drawTF2(g, fr.sk, fr.face, { costume: c, t: 60 + k * 3 })); label(g, `frame ${60 + Math.round(k * 3.1)}`, x, y + 40, 22); } }
  else if (page === 5) { label(g, "Head turning (body facing the camera)", 540, 70, 32); const ys = [-1.25, -0.85, -0.45, 0, 0.45, 0.85, 1.25];
    ys.forEach((hy, i) => { const x = 160 + (i % 4) * 255, y = 900 + Math.floor(i / 4) * 860, face = happy(); put(g, x, y, 0.62, () => drawTF2(g, solve(P0({ head: { yaw: hy, pitch: 0, roll: 0 }, face })), face, { costume: c })); label(g, `head ${(hy * 57.3).toFixed(0)} deg`, x, y + 40, 22); }); }
  else if (page === 6) { label(g, "Expressions", 540, 70, 32); const es: EmotionName[] = ["happiness", "shock", "confusion", "anger", "sadness", "suspicion", "embarrassment", "cringe"];
    es.forEach((e, i) => { const x = 140 + (i % 4) * 267, y = 960 + Math.floor(i / 4) * 860, f = evalEmotion([{ e, level: 4 }]).face, yaw = i % 2 ? 0.5 : 0; put(g, x, y, 0.66, () => drawTF2(g, solve(P0({ yaw, face: f })), f, { costume: c })); label(g, `${e}${yaw ? " (3/4)" : ""}`, x, y + 40, 22); }); }
  else { label(g, "Hands: wave, thumbs up, open palms, point", 540, 70, 32); const gs = ["wave", "thumbsUp", "palmsUp", "point"] as const;
    gs.forEach((ge, i) => { const gp = gesturePose(ge, 20, {}), x = 270 + (i % 2) * 540, y = 960 + Math.floor(i / 2) * 860, face = happy();
      put(g, x, y, 0.9, () => drawTF2(g, solve(P0({ face, armL: gp.L ? { ...gp.L } : { ...REST(-1) }, armR: gp.R ? { ...gp.R } : { ...REST(1) }, shoulderL: gp.shoulders ?? 0, shoulderR: gp.shoulders ?? 0 })), face, { costume: c })); label(g, ge, x, y + 40, 24); }); }
};
export const TF2Accessory: React.FC = () => { const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null); useLayoutEffect(() => drawPage(ref.current!.getContext("2d")!, Math.min(f, ACC_PAGES - 1)), [f]);
  return <AbsoluteFill style={{ backgroundColor: BG }}><canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>; };
