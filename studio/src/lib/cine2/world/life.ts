// World 2.0 life: deterministic, frame-pure motion of the world - vehicles and machines on paths (accelerate, cruise,
// slow for stops, turn along the path tangent, wheels rolling by arc length, never sliding), walkers (TF2 scripts that
// follow sidewalks), birds, and the environmental audio sources the world exposes to Audio 2.0.
import { DEFS, type V3 } from "./kit";
import type { Mover, Walker, Recipe } from "./recipes";
import type { Script } from "../../../char/tf2/planner";
import { COSTUME } from "../../../char/odo5";

const segLens = (p: V3[]) => p.slice(1).map((q, i) => Math.hypot(q[0] - p[i][0], q[1] - p[i][1], q[2] - p[i][2]));
/** position + heading at arc length s along a polyline */
export const alongPath = (p: V3[], s: number): { pos: V3; heading: number } => {
  const L = segLens(p); let i = 0, acc = 0; while (i < L.length - 1 && acc + L[i] < s) { acc += L[i]; i++; }
  const t = Math.max(0, Math.min(1, (s - acc) / (L[i] || 1))), a = p[i], b = p[i + 1];
  // heading: blend toward the next segment over the last metre (smooth turning, no snapping)
  const h0 = Math.atan2(b[0] - a[0], b[2] - a[2]), nx = p[i + 2], h1 = nx ? Math.atan2(nx[0] - b[0], nx[2] - b[2]) : h0, rem = (L[i] || 1) * (1 - t), k = rem < 1.5 && nx ? (1 - rem / 1.5) * 0.5 : 0;
  const dh = Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0));
  return { pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], heading: h0 + dh * k };
};
/**
 * distance travelled at time t (s) for a cruise speed with optional timed stops: before each stop the vehicle
 * decelerates (constant 1.5 m/s2 -> no slide), waits, then accelerates again. Pure function of t (deterministic).
 */
export const distanceAt = (m: Mover, t: number, total: number) => {
  const v = m.speed, a = 1.5, tRamp = v / a, dRamp = (v * v) / (2 * a);
  let s = m.offset + v * t;   // free-running
  for (const st of m.stops ?? []) { // a stop at distance st.at (on the first lap): time lost = dur + 2*tRamp - 2*dRamp/v
    const tArrive = (st.at - dRamp - m.offset) / v; if (t <= tArrive) continue;
    const tc = t - tArrive; let ds: number;
    if (tc < tRamp) ds = v * tc - 0.5 * a * tc * tc; else if (tc < tRamp + st.dur) ds = dRamp; else if (tc < 2 * tRamp + st.dur) { const u = tc - tRamp - st.dur; ds = dRamp + 0.5 * a * u * u; } else ds = 2 * dRamp + v * (tc - 2 * tRamp - st.dur);
    s = m.offset + v * tArrive + ds; }
  // loops wrap seamlessly; one-way traffic re-enters after a 25 m gap beyond the (off-screen) path end
  const L = m.loop ? total : total + 25; s = ((s % L) + L) % L;
  return s;
};
export const pathLength = (p: V3[]) => segLens(p).reduce((a, b) => a + b, 0);
/** a loop path made of a polyline + its return (closed) */
const closed = (p: V3[]) => (Math.hypot(p[0][0] - p[p.length - 1][0], p[0][2] - p[p.length - 1][2]) < 0.01 ? p : [...p, p[0]]);
export type MoverState = { id: string; def: string; pos: V3; heading: number; wheelAngle: number; speed: number; visible: boolean; variant: number };
export const moverAt = (m: Mover, f: number, fps = 30): MoverState => {
  const path = m.loop ? closed(m.path) : m.path, L = pathLength(path), t = f / fps, s = distanceAt(m, t, L), s2 = distanceAt(m, t + 1 / fps, L);
  const vis = m.loop || s <= L, q = alongPath(path, Math.max(0, Math.min(L, s))), d = DEFS.get(m.def), r = d?.cat === "vehicle" || d?.cat === "construction" ? 0.35 : 0.3;
  return { id: m.id, def: m.def, pos: [q.pos[0], q.pos[1] + (m.yOff ?? 0), q.pos[2]], heading: q.heading, wheelAngle: s / r, speed: (s2 - s) * fps, visible: vis, variant: m.variant ?? 0 };
};
/** a walker as a TF2 script: walk actions along the path at the given speed (Character 2.0 gait = no foot sliding) */
export const walkerScript = (w: Walker, frames: number, fps = 30): Script => {
  const L = pathLength(w.path), dir = Math.atan2(w.path[1][0] - w.path[0][0], w.path[1][2] - w.path[0][2]);
  const startS = (w.offset % L), q = alongPath(w.path, startS), end = alongPath(w.path, Math.min(L, startS + (w.speed * frames) / fps));
  return { id: w.id, seed: w.id.length * 13 + 7, costume: COSTUME[w.costume] ?? COSTUME.clerk, start: [q.pos[0], q.pos[2]], facing: dir,
    actions: [{ kind: "walk", f0: 0, f1: frames, to: [end.pos[0], end.pos[2]], style: w.speed > 1.25 ? "confident" : w.speed < 1.0 ? "slow" : "normal" }], emotions: [{ f: 0, mix: [{ e: "relief", level: 1 }] }] } as unknown as Script;
};
/** birds: deterministic loose flock positions + wing phase (pure functions of index and time) */
export const birdAt = (i: number, f: number, c: V3, R: number, fps = 30) => {
  const t = f / fps, h = (k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const w = 0.12 + h(1) * 0.1, ph = h(2) * Math.PI * 2, rr = R * (0.4 + 0.6 * h(3)), a = ph + t * w * (h(4) < 0.5 ? 1 : -1);
  const pos: V3 = [c[0] + Math.cos(a) * rr, c[1] + Math.sin(t * 0.3 + ph) * 1.5 + h(5) * 4, c[2] + Math.sin(a) * rr * 0.6];
  return { pos, heading: a + (h(4) < 0.5 ? Math.PI / 2 : -Math.PI / 2), flap: Math.sin(t * (7 + h(6) * 3) * Math.PI * 2 * 0.25 + ph) };
};
/** environmental audio sources of a world at frame f (only sources that are present and relevant) */
export type AudioSource = { id: string; kind: string; pos: V3; loop?: string; events?: string[]; radius: number; gainDb: number; moving?: boolean; speed?: number };
export const audioSources = (r: Recipe, placements: { id: string; def: string; pos: V3 }[], f: number, night = false): AudioSource[] => {
  const out: AudioSource[] = [];
  for (const p of placements) { const d = DEFS.get(p.def); if (!d?.audio) continue; const a = d.audio; if (a.when === "night" && !night) continue; if (a.when === "animated") continue;   // parked vehicles / idle machines are silent
    if (a.loop) out.push({ id: p.id, kind: p.def, pos: p.pos, loop: a.loop, radius: a.radius ?? 10, gainDb: a.gainDb ?? -24 }); }
  for (const m of r.movers) { const s = moverAt(m, f), d = DEFS.get(m.def); if (!s.visible || !d?.audio?.loop) continue; out.push({ id: m.id, kind: m.def, pos: s.pos, loop: d.audio.loop, events: d.audio.events, radius: d.audio.radius ?? 40, gainDb: d.audio.gainDb ?? -16, moving: true, speed: s.speed }); }
  return out;
};
