// TF2 Character Lab: the dedicated test scene (not part of any film). Two compositions:
//   TF2Sheet  - one still page per frame: emotions L4, emotions L5, intensity ladders, blends, hands, turn sweep, gestures
//   TF2Motion - a reel of scripted motion tests: idle, every walk style, run/jump/stumble, turns, gestures, head moves,
//               object interaction, talk + listen, emotion transitions with body acting, sit / kneel, long idle
// Drawn straight onto a 2D canvas (no WebGL) so tests are fast; the 3D card integration is tested separately.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { drawTF2 } from "../draw";
import { solve, restLeg, type BodyPose } from "../body";
import { NEUTRAL } from "../face";
import { EMOTIONS, EMOTION_NAMES, BLENDS, evalEmotion, type EmotionName } from "../emotion";
import { HANDS, type HandName } from "../hands";
import { REST, gesturePose } from "../gestures";
import { evaluate, type Script, type CharFrame } from "../planner";
import { TF2_HERO as HERO } from "../costume";
import { COSTUME } from "../../odo5";
import { MOTION, MOTION_FRAMES, segmentAt } from "./scripts";

const BG = "#efe7d8";
type G = CanvasRenderingContext2D;
const basePose = (o: Partial<BodyPose> = {}): BodyPose => ({ yaw: 0, root: [0, 0, 0], pelvisRoll: 0, pelvisYaw: 0, lean: 0, bend: 0, twist: 0, slump: 0, squash: 0, chest: 0, shoulderL: 0, shoulderR: 0,
  head: { yaw: 0, pitch: 0, roll: 0 }, armL: { ...REST(-1) }, armR: { ...REST(1) }, legL: restLeg(-1), legR: restLeg(1), face: NEUTRAL, ...o });
/** draw a character card at (x, ground) with scale s; crop = "bust" to show head+shoulders bigger */
const card = (g: G, fr: { sk: ReturnType<typeof solve>; face: typeof NEUTRAL; behind?: [boolean, boolean] }, x: number, ground: number, s: number, costume = HERO, t = 0, lift = 0) => {
  g.save(); g.translate(x - 300 * s, ground - 975 * s - lift); g.scale(s, s); drawTF2(g, fr.sk, fr.face, { costume, t, behindHead: fr.behind }); g.restore(); };
const shadow = (g: G, x: number, ground: number, s: number, k = 1) => { g.save(); g.fillStyle = `rgba(40,25,20,${0.18 * k})`; g.beginPath(); g.ellipse(x, ground + 4, 130 * s, 22 * s, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
const label = (g: G, txt: string, x: number, y: number, size = 26, col = "#3a2a24") => { g.save(); g.font = `600 ${size}px Arial, sans-serif`; g.fillStyle = col; g.textAlign = "center"; g.fillText(txt, x, y); g.restore(); };
const emoFrame = (mix: Parameters<typeof evalEmotion>[0], t = 40) => { const e = evalEmotion(mix);
  const p = basePose({ face: e.face, lean: e.body.lean, slump: Math.min(1, e.body.slump), chest: e.body.chest, shoulderL: e.body.shoulders * 22, shoulderR: e.body.shoulders * 22, head: { yaw: e.body.headYaw, pitch: e.body.headPitch, roll: e.body.headRoll }, root: [0, -e.body.knees * 22, 0] });
  const gp = gesturePose(e.gesture, t, {}); const w = e.gestureW; if (gp.L && w > 0) p.armL = { ...p.armL, hand: gp.L.hand.map((v, i) => p.armL.hand[i] + (v - p.armL.hand[i]) * w) as never, pole: gp.L.pole, shape: w > 0.5 ? gp.L.shape : p.armL.shape, bend: gp.L.bend * w, twist: gp.L.twist * w };
  if (gp.R && w > 0) p.armR = { ...p.armR, hand: gp.R.hand.map((v, i) => p.armR.hand[i] + (v - p.armR.hand[i]) * w) as never, pole: gp.R.pole, shape: w > 0.5 ? gp.R.shape : p.armR.shape, bend: gp.R.bend * w, twist: gp.R.twist * w };
  return { sk: solve(p), face: e.face, behind: gp.behindHead }; };

// ---------------------------------------------------------------- sheets
const PAGES = ["emotions L4", "emotions L5", "intensity ladders", "blends", "hands", "turn sweep", "gestures"] as const;
export const TF2_SHEET_N = PAGES.length;
const drawSheet = (g: G, page: number) => {
  g.fillStyle = BG; g.fillRect(0, 0, 1080, 1920); const name = PAGES[page]; label(g, `TwistFrame Character 2.0 - ${name}`, 540, 54, 34);
  if (page <= 1) { const lv = page === 0 ? 4 : 5, cols = 5, cw = 216, ch = 300;   // 30 emotions, bust crops
    EMOTION_NAMES.forEach((e, i) => { const cx = (i % cols) * cw + cw / 2, cy = 90 + Math.floor(i / cols) * ch; const fr = emoFrame([{ e, level: lv }]);
      g.save(); g.beginPath(); g.rect(cx - cw / 2 + 4, cy, cw - 8, ch - 34); g.clip(); card(g, fr, cx, cy + 520, 0.62); g.restore(); label(g, e, cx, cy + ch - 10, 21); }); }
  else if (page === 2) { const es: EmotionName[] = ["happiness", "anger", "sadness", "shock", "confusion", "embarrassment"]; const cw = 1080 / 6, ch = 290;
    es.forEach((e, r) => { for (let l = 0; l <= 5; l++) { const cx = l * cw + cw / 2, cy = 80 + r * ch; const fr = emoFrame([{ e, level: l }]); g.save(); g.beginPath(); g.rect(cx - cw / 2 + 3, cy, cw - 6, ch - 30); g.clip(); card(g, fr, cx, cy + 470, 0.56); g.restore(); label(g, `${e} ${l}`, cx, cy + ch - 8, 18); } }); }
  else if (page === 3) { const ks = Object.keys(BLENDS); const cw = 270, ch = 440;
    ks.forEach((k, i) => { const cx = (i % 4) * cw + cw / 2, cy = 90 + Math.floor(i / 4) * ch; const fr = emoFrame(BLENDS[k]); g.save(); g.beginPath(); g.rect(cx - cw / 2 + 4, cy, cw - 8, ch - 40); g.clip(); card(g, fr, cx, cy + 620, 0.66); g.restore(); label(g, k, cx, cy + ch - 12, 20); });
    // full-body acting row
    const rows: EmotionName[] = ["confidence", "fear", "excitement", "disappointment"]; rows.forEach((e, i) => { const cx = 135 + i * 270; const fr = emoFrame([{ e, level: 4.5 }]); shadow(g, cx, 1840, 0.3); card(g, fr, cx, 1840, 0.36); label(g, e, cx, 1890, 22); }); }
  else if (page === 4) { const hs = Object.keys(HANDS) as HandName[]; const cw = 216, ch = 300;
    hs.forEach((h, i) => { const cx = (i % 5) * cw + cw / 2, cy = 110 + Math.floor(i / 5) * ch; const p = basePose({ armR: { hand: [40, -40, 120], pole: [0.4, -1, 0], bend: -1.4, twist: 0, shape: HANDS[h] }, armL: { hand: [-20, -40, 120], pole: [-0.4, -1, 0], bend: 1.4, twist: 0, shape: HANDS[h] } });
      const sk = solve(p); g.save(); g.beginPath(); g.rect(cx - cw / 2 + 4, cy - 20, cw - 8, ch - 40); g.clip(); card(g, { sk, face: NEUTRAL }, cx, cy + 470, 0.6); g.restore(); label(g, h, cx, cy + ch - 30, 20); }); }
  else if (page === 5) { const n = 12; for (let i = 0; i < n; i++) { const yaw = -Math.PI + (i / (n - 1)) * 2 * Math.PI; const cx = 90 + (i % 6) * 180, gy = 860 + Math.floor(i / 6) * 900; const p = basePose({ yaw, face: evalEmotion([{ e: "curiosity", level: 2 }]).face });
      shadow(g, cx, gy, 0.42); card(g, { sk: solve(p), face: p.face }, cx, gy, 0.42); label(g, `yaw ${(yaw * 180 / Math.PI).toFixed(0)}`, cx, gy + 40, 22); } }
  else if (page === 6) { const gs = ["point", "wave", "clap", "shrug", "facepalm", "thumbsUp", "thumbsDown", "palmsUp", "handOnHip", "armsCrossed", "chinThink", "handsUp", "count", "rubNeck", "hugSelf"] as const; const cw = 216, ch = 600;
    gs.forEach((ge, i) => { const cx = (i % 5) * cw + cw / 2, gy = 100 + Math.floor(i / 5) * ch + 520; const gp = gesturePose(ge, 30, { count: 3 }); const p = basePose({ armL: gp.L ? { ...gp.L } : { ...REST(-1) }, armR: gp.R ? { ...gp.R } : { ...REST(1) }, head: { yaw: gp.head?.yaw ?? 0, pitch: gp.head?.pitch ?? 0, roll: gp.head?.roll ?? 0 }, shoulderL: gp.shoulders ?? 0, shoulderR: gp.shoulders ?? 0, lean: gp.lean ?? 0,
      face: evalEmotion([{ e: ge === "facepalm" ? "frustration" : ge === "thumbsUp" ? "confidence" : ge === "shrug" ? "uncertainty" : ge === "handsUp" ? "surprise" : ge === "hugSelf" ? "fear" : "happiness", level: 3 }]).face });
      shadow(g, cx, gy, 0.5); card(g, { sk: solve(p), face: p.face, behind: gp.behindHead }, cx, gy, 0.5); label(g, ge, cx, gy + 40, 22); }); }
};
export const TF2Sheet: React.FC = () => { const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const g = ref.current!.getContext("2d")!; drawSheet(g, Math.min(f, PAGES.length - 1)); }, [f]);
  return <AbsoluteFill style={{ backgroundColor: BG }}><canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>; };

// ---------------------------------------------------------------- motion reel
const PXM = 440;   // screen px per metre on the stage
const drawMotion = (g: G, f: number) => {
  g.fillStyle = BG; g.fillRect(0, 0, 1080, 1920); const seg = segmentAt(f); if (!seg) return; const lf = f - seg.f0;
  const ground = 1560; g.fillStyle = "#e2d6c2"; g.fillRect(0, ground, 1080, 360); g.strokeStyle = "#cbbca4"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, ground); g.lineTo(1080, ground); g.stroke();
  for (let x = -2; x <= 2; x += 0.5) { const sx = 540 + x * PXM; g.beginPath(); g.moveTo(sx, ground); g.lineTo(sx, ground + 12); g.stroke(); }   // metre ticks: reveal any foot sliding against the floor
  label(g, seg.title, 540, 70, 34); if (seg.sub) label(g, seg.sub, 540, 112, 24, "#6a5a50");
  const frames: { fr: CharFrame; sc: Script }[] = seg.scripts.map((sc) => ({ sc, fr: evaluate(sc, lf, [0, 1.2, 14]) }));
  frames.sort((a, b) => a.fr.pos[2] - b.fr.pos[2]);
  if (seg.underlay) seg.underlay(g, lf, frames.map((x) => x.fr), ground, PXM);
  // props
  for (const pr of seg.props?.(lf) ?? []) { const sx = 540 + pr.p[0] * PXM, sy = ground - pr.p[1] * PXM; g.save(); g.fillStyle = pr.col; g.strokeStyle = "#241923"; g.lineWidth = 6;
    if (pr.kind === "box") { g.beginPath(); g.rect(sx - pr.w * PXM / 2, sy - pr.h * PXM, pr.w * PXM, pr.h * PXM); g.fill(); g.stroke(); } else { g.beginPath(); g.arc(sx, sy - pr.h * PXM / 2, pr.h * PXM / 2, 0, Math.PI * 2); g.fill(); g.stroke(); } g.restore(); }

  for (const { fr, sc } of frames) { const sx = 540 + fr.pos[0] * PXM, s = 0.7 * (1 + fr.pos[2] * 0.03); shadow(g, sx, ground, s, fr.pos[1] > 0.02 ? 0.5 : 1); card(g, { sk: fr.sk, face: fr.face, behind: fr.behindHead }, sx, ground, s, sc.costume, lf, fr.pos[1] * PXM); }
  if (seg.overlay) seg.overlay(g, lf, frames.map((x) => x.fr), ground, PXM);
};
export const TF2Motion: React.FC = () => { const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const g = ref.current!.getContext("2d")!; drawMotion(g, f); }, [f]);
  return <AbsoluteFill style={{ backgroundColor: BG }}><canvas ref={ref} width={1080} height={1920} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>; };
export { MOTION, MOTION_FRAMES, EMOTIONS, COSTUME };
