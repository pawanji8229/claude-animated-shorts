// TF2 vs approved odo5: (1) identity + expression comparison sheet, (2) walk comparison, (3) performance benchmark
// compositions drawing the same number of animated characters with each system (render time is measured outside).
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { drawOdo5, pose5 } from "../../odo5";
import { FACES, withFace, type FaceName } from "../../../productions/short3/expr";
import { HERO } from "../../../productions/postoffice/chars";
import { drawTF2 } from "../draw";
import { evaluate, type Script } from "../planner";
import { evalEmotion, type EmotionName } from "../emotion";
import { solve, restLeg, type BodyPose } from "../body";
import { NEUTRAL } from "../face";
import { REST } from "../gestures";
import { gait, GAITS, M } from "../locomotion";

type G = CanvasRenderingContext2D;
const BG = "#efe7d8";
const label = (g: G, t: string, x: number, y: number, s = 24) => { g.save(); g.font = `600 ${s}px Arial`; g.fillStyle = "#3a2a24"; g.textAlign = "center"; g.fillText(t, x, y); g.restore(); };
const P0 = (o: Partial<BodyPose> = {}): BodyPose => ({ yaw: 0, root: [0, 0, 0], pelvisRoll: 0, pelvisYaw: 0, lean: 0, bend: 0, twist: 0, slump: 0, squash: 0, chest: 0, shoulderL: 0, shoulderR: 0, head: { yaw: 0, pitch: 0, roll: 0 }, armL: { ...REST(-1) }, armR: { ...REST(1) }, legL: restLeg(-1), legR: restLeg(1), face: NEUTRAL, ...o });
const WALK_SC: Script = { id: "cw", seed: 4, costume: HERO, start: [-3, 0], facing: Math.PI / 2, actions: [{ kind: "walk", f0: 0, f1: 400, to: [5, 0], style: "normal" }], emotions: [{ f: 0, mix: [{ e: "happiness", level: 2 }] }] };
const PAIRS: [FaceName, EmotionName, string][] = [["neutral", "happiness", "neutral / happiness L1"], ["delighted", "happiness", "delighted / happiness L5"], ["shocked", "shock", "shocked / shock"], ["confused", "confusion", "confused / confusion"],
  ["suspicious", "suspicion", "suspicious / suspicion"], ["embarrassed", "embarrassment", "embarrassed / embarrassment"], ["cringe", "cringe", "cringe / cringe"], ["xDisbelief", "confusedDisbelief", "xDisbelief / confusedDisbelief"]];
const drawCompare = (g: G, page: number) => {
  g.fillStyle = BG; g.fillRect(0, 0, 1080, 1920);
  if (page === 0) { label(g, "Approved odo5 (left)  vs  Character 2.0 (right)", 540, 50, 32);
    PAIRS.forEach(([old, emo, name], i) => { const row = Math.floor(i / 2), col = i % 2, x0 = col * 540, y0 = 80 + row * 455;
      const lv = name.includes("L1") ? 1 : name.includes("L5") ? 5 : 4;
      // old: approved odo5 card with the approved face library
      g.save(); g.beginPath(); g.rect(x0 + 6, y0, 260, 410); g.clip(); g.translate(x0 + 136 - 300 * 0.5, y0 + 520 - 975 * 0.5); g.scale(0.5, 0.5); drawOdo5(g, withFace(pose5({ costume: HERO }), FACES[old], 40, 3)); g.restore();
      // new: TF2 with the emotion engine (face + body + gesture at the same intensity)
      const e = evalEmotion([{ e: emo, level: lv }]); const sk = solve(P0({ face: e.face, lean: e.body.lean, slump: Math.min(1, e.body.slump), shoulderL: e.body.shoulders * 22, shoulderR: e.body.shoulders * 22, head: { yaw: e.body.headYaw, pitch: e.body.headPitch, roll: e.body.headRoll } }));
      g.save(); g.beginPath(); g.rect(x0 + 274, y0, 260, 410); g.clip(); g.translate(x0 + 404 - 300 * 0.5, y0 + 520 - 975 * 0.5); g.scale(0.5, 0.5); drawTF2(g, sk, e.face, { costume: HERO }); g.restore();
      label(g, name, x0 + 270, y0 + 438, 20); }); }
  else { label(g, "Walk cycle: approved odo5 (top)  vs  Character 2.0 (bottom)", 540, 50, 30);
    for (let k = 0; k < 6; k++) { const q = k / 6, x = 90 + k * 180;
      g.save(); g.translate(x - 300 * 0.36, 820 - 975 * 0.36); g.scale(0.36, 0.36); drawOdo5(g, pose5({ costume: HERO, view: "side", walk: 1, gait: q, stride: 0.74, eyes: "lid", mouth: "smile", lookX: 0.6 })); g.restore();
      // the real planner (legs + arm swing + torso + head), sampled at the same cycle phase in the middle of a steady walk
      const fr0 = WALK_SC, fq = 60 + Math.round(k * 3.1);   // ~19 frames per gait cycle at 1.2 m/s: 6 samples across one cycle
      const fr = evaluate(fr0, fq); g.save(); g.translate(x - 300 * 0.36, 1560 - 975 * 0.36); g.scale(0.36, 0.36); drawTF2(g, fr.sk, fr.face, { costume: HERO }); g.restore(); void gait; void solve; void P0;
      label(g, `phase ${(q * 100).toFixed(0)}%`, x, 1610, 20); }
    g.strokeStyle = "#cbbca4"; g.lineWidth = 3; for (const y of [820, 1560]) { g.beginPath(); g.moveTo(0, y); g.lineTo(1080, y); g.stroke(); } }
};
export const TF2Compare: React.FC = () => { const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null); useLayoutEffect(() => drawCompare(ref.current!.getContext("2d")!, Math.min(f, 1)), [f]);
  return <AbsoluteFill style={{ backgroundColor: BG }}><canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>; };

// ---------------------------------------------------------------- performance benchmark (12 animated characters per frame)
const N = 12;
const SCRIPTS: Script[] = Array.from({ length: N }, (_, i) => ({ id: `p${i}`, seed: i * 7 + 1, costume: HERO, start: [-1.2 + (i % 4) * 0.8, 0], facing: Math.PI / 2,
  actions: i % 2 ? [{ kind: "walk", f0: 0, f1: 150, to: [-0.6 + (i % 4) * 0.8, 0], style: "normal" }] : [{ kind: "gesture", f0: 20, f1: 120, g: "wave" }], emotions: [{ f: 0, mix: [{ e: "happiness", level: 3 }] }] }));
export const PERF_FRAMES = 150;
const drawPerf = (g: G, f: number, mode: "old" | "new") => { g.fillStyle = BG; g.fillRect(0, 0, 1080, 1920);
  for (let i = 0; i < N; i++) { const x = 140 + (i % 4) * 270, y = 560 + Math.floor(i / 4) * 600; g.save(); g.translate(x - 300 * 0.5, y - 975 * 0.5); g.scale(0.5, 0.5);
    if (mode === "old") drawOdo5(g, withFace(pose5({ costume: HERO, view: i % 2 ? "side" : "front", walk: i % 2 ? 1 : 0, gait: f / 18, breathe: f * 0.09 + i }), FACES.delighted, f, i));
    else { const fr = evaluate(SCRIPTS[i], f); drawTF2(g, fr.sk, fr.face, { costume: HERO, t: f, behindHead: fr.behindHead }); }
    g.restore(); } };
export const TF2PerfOld: React.FC = () => { const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null); useLayoutEffect(() => drawPerf(ref.current!.getContext("2d")!, f, "old"), [f]);
  return <AbsoluteFill><canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>; };
export const TF2PerfNew: React.FC = () => { const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null); useLayoutEffect(() => drawPerf(ref.current!.getContext("2d")!, f, "new"), [f]);
  return <AbsoluteFill><canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>; };
