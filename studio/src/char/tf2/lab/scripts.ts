// TF2 lab motion scripts: every segment is a small purposeful scene (the character moves only when the test needs it).
import type { Script, Action, EmoKey, CharFrame } from "../planner";
import { walkFrames } from "../planner";
import { GAITS, type GaitName } from "../locomotion";
import { EMOTION_NAMES, type EmotionName } from "../emotion";
import type { Word } from "../lipsync";
import { project } from "../rig";
import { HERO } from "../../../productions/postoffice/chars";
import { COSTUME, type Costume } from "../../odo5";

type Prop = { kind: "box" | "ball"; p: [number, number]; w: number; h: number; col: string };
export type Segment = { title: string; sub?: string; f0: number; dur: number; scripts: Script[]; props?: (lf: number) => Prop[]; overlay?: (g: CanvasRenderingContext2D, lf: number, frs: CharFrame[], ground: number, pxm: number) => void };
const S = (o: Partial<Script> & { actions: Action[] }): Script => ({ id: "hero", seed: 7, costume: HERO, start: [0, 0], facing: 0, emotions: [{ f: 0, mix: [{ e: "happiness", level: 1 }] }], ...o });
const emo = (f: number, e: EmotionName, level: number, ease = 8): EmoKey => ({ f, mix: [{ e, level }], ease });
const CLERK: Costume = { ...COSTUME.clerk, hat: null };
const words = (txt: string, t0: number, rate = 0.27): Word[] => { let t = t0; return txt.split(" ").map((w) => { const d = 0.12 + w.length * 0.045 * (rate / 0.27); const o = { w, t0: t, t1: t + d }; t += d + 0.06 + (/[,.!?]$/.test(w) ? 0.25 : 0); return o; }); };
const segs: Omit<Segment, "f0">[] = [];
const add = (s: Omit<Segment, "f0">) => segs.push(s);

// 1. idle: breathing, blinks, saccades, tiny weight shifts - nothing else
add({ title: "Idle: breathing, natural blinks, saccades, weight shift", sub: "no walking, no waving - subtle life only", dur: 180, scripts: [S({ actions: [], emotions: [emo(0, "happiness", 1), emo(110, "curiosity", 2, 14)] })] });
// 2. walking styles (each crosses the stage with purpose: left -> right)
const STYLES: [GaitName, EmotionName, number][] = [["normal", "happiness", 1], ["slow", "boredom", 2], ["fast", "determination", 2], ["confident", "confidence", 3], ["nervous", "nervousness", 3], ["tired", "sleepiness", 3], ["hesitant", "uncertainty", 3], ["sneaky", "suspicion", 3], ["angry", "anger", 3], ["excited", "excitement", 3], ["sad", "sadness", 3], ["curious", "curiosity", 3]];
for (const [st, e, lv] of STYLES) { const d = st === "sneaky" || st === "curious" || st === "hesitant" ? 2.4 : 3.2, fr = walkFrames(d, st); add({ title: `Walk: ${st}`, sub: `${GAITS[st].stride} m stride, planted feet (watch the floor ticks)`, dur: fr + 30,
  scripts: [S({ start: [-d / 2, 0], facing: Math.PI / 2, actions: [{ kind: "walk", f0: 10, f1: 10 + fr, to: [d / 2, 0], style: st }], emotions: [emo(0, e, lv)] })] }); }
add({ title: "Walk backwards (cautious)", sub: "facing left, moving right: the cycle runs in reverse", dur: walkFrames(1.8, "slow") * 1.4 + 30, scripts: [S({ start: [-0.9, 0], facing: -Math.PI / 2, actions: [{ kind: "walk", f0: 10, f1: 10 + Math.round(walkFrames(1.8, "slow") * 1.4), to: [0.9, 0], style: "slow", backwards: true }], emotions: [emo(0, "fear", 2)] })] });
// 3. turning while walking: a diamond loop shows every facing angle
{ const pts: [number, number][] = [[0, 1.0], [1.4, 0], [0, -1.0], [-1.4, 0]]; let f = 10, prev: [number, number] = [-1.4, 0]; const acts: Action[] = [];
  for (const p of pts) { const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]), fr = walkFrames(d, "normal") - 10; acts.push({ kind: "walk", f0: f, f1: f + fr, to: p, style: "normal" }); f += fr; prev = p; }
  add({ title: "Turning while walking", sub: "smooth facing changes, every yaw angle", dur: f + 30, scripts: [S({ start: [-1.4, 0], facing: Math.PI / 4, actions: acts, emotions: [emo(0, "happiness", 2)] })] }); }
// 4. stopping naturally + turning in place
add({ title: "Walk, stop naturally, turn to camera", sub: "decelerates, settles, turns", dur: 190, scripts: [S({ start: [-1.5, 0], facing: Math.PI / 2, actions: [{ kind: "walk", f0: 8, f1: 8 + walkFrames(1.8, "normal"), to: [0.3, 0] }, { kind: "turn", f0: 8 + walkFrames(1.8, "normal") + 8, f1: 8 + walkFrames(1.8, "normal") + 26, face: 0 }],
  emotions: [emo(0, "curiosity", 2), emo(130, "happiness", 3, 10)] })] });
// 5. running
for (const st of ["jog", "run", "sprint"] as GaitName[]) add({ title: `Run: ${st}`, sub: "flight phase, pumping arms, forward lean", dur: walkFrames(3.6, st) + 30, scripts: [S({ start: [-1.8, 0], facing: Math.PI / 2, actions: [{ kind: "walk", f0: 8, f1: 8 + walkFrames(3.6, st), to: [1.8, 0], style: st }], emotions: [emo(0, st === "sprint" ? "excitedFear" : "determination", 3)] })] });
// 6. jumps, hops, landing
add({ title: "Jump in place, then a forward hop", sub: "anticipation crouch -> launch stretch -> tuck -> landing absorb", dur: 150, scripts: [S({ start: [-0.6, 0], facing: Math.PI / 2, actions: [{ kind: "jump", f0: 15, height: 0.45 }, { kind: "jump", f0: 80, height: 0.3, dist: 0.9 }], emotions: [emo(0, "excitement", 3)] })] });
add({ title: "Small hops", dur: 150, scripts: [S({ start: [-0.6, 0], facing: Math.PI / 2, actions: [0, 1, 2].map((i) => ({ kind: "jump", f0: 12 + i * 40, height: 0.14, dist: 0.35 }) as Action), emotions: [emo(0, "happiness", 4)] })] });
// 7. stumble + recover
add({ title: "Stumble and recover balance", sub: "trips mid-walk, catches a step, carries on", dur: 170, scripts: [S({ start: [-1.6, 0], facing: Math.PI / 2, actions: [{ kind: "walk", f0: 5, f1: 150, to: [1.6, 0], style: "normal" }, { kind: "stumble", f0: 60 }], emotions: [emo(0, "happiness", 1), emo(60, "shock", 4, 2), emo(95, "embarrassment", 3, 10), emo(130, "relief", 3, 10)] })] });
// 8. gestures (standing, each with its reason/emotion)
{ const G: [Action["kind"] extends never ? never : string, EmotionName, number?][] = [["wave", "happiness"], ["point", "curiosity"], ["thumbsUp", "confidence"], ["thumbsDown", "disappointment"], ["shrug", "uncertainty"], ["facepalm", "frustration"], ["palmsUp", "disbelief"], ["clap", "excitement"], ["count", "concentration", 3], ["handOnHip", "sarcasm"], ["armsCrossed", "suspicion"], ["chinThink", "curiosity"], ["handsUp", "shock"], ["rubNeck", "embarrassment"], ["hugSelf", "fear"], ["fidget", "nervousness"], ["coverMouth", "amusement"], ["pushAway", "disgust"]];
  const acts: Action[] = [], emos: EmoKey[] = []; G.forEach(([g, e, c], i) => { const f0 = 10 + i * 52; acts.push({ kind: "gesture", f0, f1: f0 + 44, g: g as never, count: c, dir: [0.95, 0.25, 0.3] }); emos.push(emo(f0 - 4, e, 3.5, 6)); });
  add({ title: "Hand + arm gestures", sub: G.map((x) => x[0]).join(" · "), dur: 10 + G.length * 52 + 20, scripts: [S({ actions: acts, emotions: emos })] }); }
// 9. head moves
{ const H: [string, number][] = [["nod", 1], ["strongNod", 1], ["shake", 1], ["tilt", 1], ["doubleTilt", 1], ["slowTurn", 1], ["quickTurn", -1], ["overShoulder", 1], ["confused", 1], ["suspicious", 1], ["lower", 1], ["raise", 1]];
  const acts: Action[] = H.map(([m, a], i) => ({ kind: "head", f0: 10 + i * 40, f1: 10 + i * 40 + 34, m: m as never, amt: a }));
  add({ title: "Head + neck moves (head stays joined to the body)", sub: H.map((h) => h[0]).join(" · "), dur: 10 + H.length * 40 + 20, scripts: [S({ actions: acts, emotions: [emo(0, "curiosity", 2), emo(90, "disbelief", 2), emo(300, "suspicion", 3), emo(400, "disappointment", 3), emo(440, "confidence", 3)] })] }); }
// 10. all 30 emotions with body acting, smooth transitions
{ const emos: EmoKey[] = EMOTION_NAMES.map((e, i) => emo(i * 26, e, 4, 9)); add({ title: "30 emotions with body acting (level 4)", sub: "smooth transitions, no facial popping", dur: EMOTION_NAMES.length * 26 + 20, scripts: [S({ actions: [], emotions: emos })], overlay: (g, lf) => { const i = Math.min(EMOTION_NAMES.length - 1, Math.floor(lf / 26)); g.save(); g.font = "600 30px Arial"; g.fillStyle = "#3a2a24"; g.textAlign = "center"; g.fillText(EMOTION_NAMES[i], 540, 160); g.restore(); } }); }
// 11. intensity ramps
add({ title: "Intensity 0 -> 5: happiness, anger, embarrassment", dur: 330, scripts: [S({ actions: [], emotions: [...[0, 1, 2, 3, 4, 5].map((l, i) => emo(i * 18, "happiness", l, 12)), ...[0, 1, 2, 3, 4, 5].map((l, i) => emo(110 + i * 18, "anger", l, 12)), ...[0, 1, 2, 3, 4, 5].map((l, i) => emo(220 + i * 18, "embarrassment", l, 12))] })] });
// 12. pick up, carry, put down
add({ title: "Interaction: pick up a parcel, carry it, put it down", sub: "hands reach the object; the parcel stays in the grip", dur: 330, props: (lf) => (lf < 70 ? [{ kind: "box", p: [0.55, 0], w: 0.3, h: 0.24, col: "#c9a06a" }] : lf > 262 ? [{ kind: "box", p: [-0.75, 0], w: 0.3, h: 0.24, col: "#c9a06a" }] : []),
  scripts: [S({ start: [-0.3, 0], facing: Math.PI / 2, actions: [{ kind: "walk", f0: 5, f1: 40, to: [0.15, 0], style: "curious" }, { kind: "bend", f0: 44, f1: 96 }, { kind: "reach", f0: 46, f1: 270, side: 1, at: [0.55, 0.12, 0], hold: true },
    { kind: "turn", f0: 104, f1: 124, face: -Math.PI / 2 }, { kind: "walk", f0: 126, f1: 214, to: [-0.4, 0], style: "slow" }, { kind: "bend", f0: 220, f1: 280 }], emotions: [emo(0, "curiosity", 2), emo(60, "concentration", 3), emo(130, "pride", 2), emo(240, "relief", 3)] })],
  overlay: (g, lf, frs, ground, pxm) => { const fr = frs[0]; if (lf < 70 || lf > 262 || !fr.grip) return; const pr = project(fr.grip.at, fr.yaw), s = 0.7, sx = 540 + fr.pos[0] * pxm - 300 * s + pr.x * s, sy = ground - 975 * s + pr.y * s;
    g.save(); g.fillStyle = "#c9a06a"; g.strokeStyle = "#241923"; g.lineWidth = 6; g.beginPath(); g.rect(sx - 0.15 * pxm, sy - 0.05 * pxm, 0.3 * pxm, 0.24 * pxm); g.fill(); g.stroke(); g.restore(); } });
// 13. push a crate
add({ title: "Interaction: push a heavy crate", sub: "leans in, staggered stance, hands on the crate", dur: 200, props: (lf) => { const x = 0.15 + Math.max(0, Math.min(1, (lf - 40) / 140)) * 0.8; return [{ kind: "box", p: [x + 0.12, 0], w: 0.5, h: 0.62, col: "#8a6a4a" }]; },
  scripts: [S({ start: [-0.6, 0], facing: Math.PI / 2, actions: [{ kind: "walk", f0: 4, f1: 34, to: [-0.4, 0], style: "slow" }, { kind: "push", f0: 34, f1: 190, at: [-0.05, 0.75, 0] }, { kind: "walk", f0: 40, f1: 180, to: [0.4, 0], style: "slow" }], emotions: [emo(0, "determination", 3), emo(120, "frustration", 3, 14)] })] });
// 14. watching a moving object
add({ title: "Attention: eyes lead, head follows a rolling ball, then points", dur: 200, props: (lf) => [{ kind: "ball", p: [-1.8 + lf * 0.02, 0], w: 0.2, h: 0.2, col: "#d9573a" }],
  scripts: [S({ actions: [{ kind: "look", f0: 0, f1: 190, at: [0, 0.1, 0] as never }, { kind: "gesture", f0: 120, f1: 185, g: "point", dir: [1, -0.4, 0.2] }], emotions: [emo(0, "curiosity", 3), emo(110, "surprise", 3, 4)] })].map((s) => ({ ...s, actions: s.actions.map((a) => a.kind === "look" ? { ...a, at: [0.5, 0.1, 0] as never } : a) })) });
// 15. dialogue: speak + listen
{ const A = words("Did you know the trains here never had a driver?", 0.4), B = words("No way. Not even one?", 4.2), A2 = words("Not even one!", 6.0);
  add({ title: "Talking + listening (lip-sync from word timings)", sub: "speaker gestures on beats; listener nods, reacts", dur: 250,
    scripts: [S({ id: "a", start: [-0.7, 0], facing: Math.PI / 2 - 0.5, actions: [{ kind: "speak", f0: 10, f1: 115, words: A }, { kind: "gesture", f0: 40, f1: 95, g: "palmsUp" }, { kind: "listen", f0: 120, f1: 175, at: [0.7, 1.3, 0] }, { kind: "speak", f0: 176, f1: 230, words: A2 }, { kind: "gesture", f0: 178, f1: 228, g: "count", count: 1 }],
        emotions: [emo(0, "excitement", 2), emo(120, "amusement", 2), emo(176, "pride", 3)] }),
      S({ id: "b", seed: 19, costume: CLERK, start: [0.7, 0], facing: -Math.PI / 2 + 0.5, actions: [{ kind: "listen", f0: 0, f1: 120, at: [-0.7, 1.3, 0] }, { kind: "speak", f0: 122, f1: 175, words: B }, { kind: "listen", f0: 176, f1: 248, at: [-0.7, 1.3, 0] }, { kind: "head", f0: 196, f1: 230, m: "shake" }],
        emotions: [emo(0, "curiosity", 2), emo(80, "disbelief", 3, 6), emo(176, "confusedDisbelief", 4, 4)] })] }); }
// 16. sit + stand, kneel
add({ title: "Sit down on a crate, stand up, kneel", dur: 300, props: () => [{ kind: "box", p: [0.05, 0], w: 0.45, h: 0.25, col: "#8a6a4a" }],
  scripts: [S({ start: [0, -0.05], facing: Math.PI / 2 - 0.9, actions: [{ kind: "sit", f0: 20, f1: 160, seat: 0.25 }, { kind: "kneel", f0: 200, f1: 290 }], emotions: [emo(0, "relief", 2), emo(90, "boredom", 3), emo(200, "curiosity", 3)] })] });
// 17. long idle stability
add({ title: "Long idle (stability)", sub: "10 s, nothing to do: stays put, alive, no drift", dur: 300, scripts: [S({ seed: 31, actions: [], emotions: [emo(0, "confidence", 1)] })] });

export const MOTION: Segment[] = (() => { let f = 0; return segs.map((s) => { const o = { ...s, f0: f }; f += Math.round(s.dur); return o; }); })();
export const MOTION_FRAMES = MOTION.reduce((a, s) => a + Math.round(s.dur), 0);
export const segmentAt = (f: number) => MOTION.find((s) => f >= s.f0 && f < s.f0 + Math.round(s.dur));
