// joralemon fauna (pure functions of the film frame, today only): a flock of five pigeons that wander and peck on
// the sidewalk in front of No. 60 (head-bob locked to their steps), take off one by one when the dog walker arrives,
// fly up (flap -> glide -> flare) to No. 60's cornice, sit there through the middle of the film (head turns, a
// shuffle), and fly back down to the same spots before the loop point; one pigeon on the lamp lantern; small birds
// crossing high over the street. Everything is periodic over FILM_FRAMES (frame 1465 flows into frame 0).
import { V3, lerp, smooth, rng } from "../../lib/math";
import { FILM_FRAMES, SW_Y } from "./world";
import { ROW } from "./street";
import { levels } from "./rowhouse";

const N = FILM_FRAMES;
export type BirdState = { pos: V3; yaw: number; pitch: number; bank: number; wing: number; spread: number; head: number; peck: number; step: number; ground: boolean; scale: number };
const no60 = ROW.find((p) => p.side > 0 && p.x > 3) ?? ROW[0];
const CORNICE_Y = levels(no60.s).eave + 0.78, CORNICE_X = no60.x;
type Pig = { home: [number, number]; seed: number; tk: number; land: number; perch: V3 };
export const PIGEONS: Pig[] = Array.from({ length: 5 }, (_, i) => { const r = rng(300 + i * 7);
  return { home: [0.9 + i * 0.62 + r() * 0.25, 2.75 + r() * 0.85], seed: i * 13 + 5, tk: 156 + [0, 5, 2, 9, 13][i], land: 1356 + [0, 7, 3, 11, 15][i],
    perch: [CORNICE_X - 1.6 + i * 0.75 + r() * 0.2, CORNICE_Y, 0.3] as V3 }; });
const GROUND_FROM = (p: Pig) => p.land + 34;          // walking again after landing
/** ground wander (periodic, continuous across the loop seam): slow loops around the home spot */
const wander = (p: Pig, f: number): [number, number] => { const u = ((f - GROUND_FROM(p)) % N + N) % N, s = p.seed;
  return [p.home[0] + 0.32 * Math.sin(u * 0.021 + s) + 0.12 * Math.sin(u * 0.067 + s * 2), p.home[1] + 0.22 * Math.sin(u * 0.017 + s * 3) + 0.08 * Math.cos(u * 0.059 + s)]; };
const bez = (a: V3, b: V3, c: V3, d: V3, t: number): V3 => { const m = 1 - t; return [0, 1, 2].map((k) => m * m * m * a[k] + 3 * m * m * t * b[k] + 3 * m * t * t * c[k] + t * t * t * d[k]) as V3; };
const FLY_T = 36;
const flight = (from: V3, to: V3, up: boolean) => (t: number): V3 => up ? bez(from, [from[0] + 0.3, from[1] + 2.2, from[2] + 0.6], [to[0], to[1] + 1.6, to[2] + 2.2], to, t)
  : bez(from, [from[0], from[1] + 0.8, from[2] + 2.0], [to[0] + 0.6, to[1] + 2.6, to[2] + 1.2], to, t);
export const pigeonsAt = (f: number): BirdState[] => PIGEONS.map((p) => {
  const g0: V3 = (() => { const [x, z] = wander(p, p.tk); return [x, SW_Y, z]; })();
  const g1: V3 = (() => { const [x, z] = wander(p, GROUND_FROM(p)); return [x, SW_Y, z]; })();
  const flyBlock = (t0: number, path: (t: number) => V3, up: boolean): BirdState => { const t = Math.min(1, Math.max(0, (f - t0) / FLY_T)), e = up ? 1 - (1 - t) ** 1.6 : t * t * (3 - 2 * t);
    const a = path(e), b = path(Math.min(1, e + 0.02)), dx = b[0] - a[0], dz = b[2] - a[2], dy = b[1] - a[1];
    const flap = up ? (t < 0.65 ? 1 : 0.35) : t > 0.75 ? 1 : 0.45, wing = Math.sin(f * 2.2 + p.seed) * flap;
    return { pos: a, yaw: Math.atan2(-dz, dx), pitch: Math.atan2(dy, Math.hypot(dx, dz) + 1e-4) * 0.6 + (t > 0.85 ? 0.5 : 0), bank: Math.sin(t * Math.PI) * 0.3, wing, spread: 1, head: 0, peck: 0, step: 0, ground: false, scale: 1 }; };
  if (f >= p.tk && f < p.tk + FLY_T) return flyBlock(p.tk, flight(g0, p.perch, true), true);
  if (f >= p.land - 2 && f < p.land - 2 + FLY_T) return flyBlock(p.land - 2, flight(p.perch, g1, false), false);
  if (f >= p.land - 2 + FLY_T && f < GROUND_FROM(p)) return { pos: g1, yaw: Math.PI * 0.5, pitch: 0, bank: 0, wing: 0, spread: 1 - smooth(p.land + FLY_T - 2, GROUND_FROM(p), f), head: 0, peck: 0, step: 0, ground: true, scale: 1 };
  if (f >= p.tk + FLY_T && f < p.land - 2) { // perched: head turns, an occasional shuffle along the ledge
    const sh = 0.12 * Math.sin(f * 0.013 + p.seed) * smooth(p.tk + FLY_T, p.tk + FLY_T + 30, f) * (1 - smooth(p.land - 32, p.land - 2, f)), yawK = smooth(p.tk + FLY_T, p.tk + FLY_T + 20, f) * (1 - smooth(p.land - 24, p.land - 2, f)); return { pos: [p.perch[0] + sh, p.perch[1], p.perch[2]], yaw: -Math.PI / 2 + 0.4 * Math.sin(f * 0.009 + p.seed) * yawK, pitch: 0, bank: 0, wing: 0, spread: 0, head: 0.7 * Math.sin(f * 0.05 + p.seed * 2) * yawK, peck: 0, step: 0, ground: false, scale: 1 }; }
  // on the ground: walk (head-bob locked to steps), stop and peck
  const [x, z] = wander(p, f), [x2, z2] = wander(p, f + 1), v = Math.hypot(x2 - x, z2 - z), pk = Math.max(0, Math.sin(f * 0.11 + p.seed)) ** 6;
  const step = (((f - GROUND_FROM(p)) % N + N) % N) * 0.35 + p.seed;
  return { pos: [x, SW_Y, z], yaw: Math.atan2(-(z2 - z), x2 - x), pitch: 0, bank: 0, wing: 0, spread: 0, head: 0, peck: v < 0.006 ? pk : pk * 0.4, step: v > 0.004 ? step : 0, ground: true, scale: 1 };
});
/** a pigeon on the lantern of the lamp post at x = -9.8 (preens, looks around) - today only */
export const lampPigeon = (f: number): BirdState => ({ pos: [-9.8, SW_Y + 4.98, 4.15], yaw: 0.6 + 0.5 * Math.sin(f * 0.011), pitch: 0, bank: 0, wing: 0, spread: 0, head: 0.8 * Math.sin(f * 0.043 + 1), peck: Math.max(0, Math.sin(f * 0.031)) ** 12 * 0.6, step: 0, ground: true, scale: 1 });
/** small birds crossing high over the street (two loose flocks, periodic) */
export const skyBirdsAt = (f: number): BirdState[] => { const out: BirdState[] = [];
  for (const [t0, dir, y0, z0] of [[0, 1, 19, 8], [700, -1, 23, 12]] as [number, number, number, number][]) for (let i = 0; i < 4; i++) {
    const u = ((f - t0 - i * 6) % N + N) % N, x = dir * (-75 + u * 0.32) + i * 1.3 * dir, y = y0 + 1.5 * Math.sin(u * 0.03 + i) + i * 0.6, z = z0 + i * 1.1 + Math.sin(u * 0.02 + i * 2);
    if (Math.abs(x) > 80) continue; const glide = Math.sin(u * 0.05 + i) > 0.6;
    out.push({ pos: [x, y, z], yaw: dir > 0 ? 0 : Math.PI, pitch: 0, bank: 0.15 * Math.sin(u * 0.03 + i), wing: glide ? 0.15 : Math.sin(f * 2.6 + i * 1.7), spread: 1, head: 0, peck: 0, step: 0, ground: false, scale: 0.55 }); }
  return out; };
export const wingFlaps = (f: number) => PIGEONS.flatMap((p, i) => [{ f: p.tk, i, kind: "up" as const }, { f: p.land + FLY_T - 8, i, kind: "land" as const }]);
export { lerp };
