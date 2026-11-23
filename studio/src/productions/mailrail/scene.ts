// Mail Rail scene module for the audio pipeline: FPS, FILM_FRAMES, soundEvents(). Every cue comes from the same timeline
// the picture uses: footsteps from each walker's on-screen travel (one per 0.62 m, matched frame to frame), the train's
// rail-joint clacks from its axle positions (every 9.14 m rail length + the crossover frogs), motor hum while it runs,
// brake squeal while it decelerates, bag pick-ups / thumps / lid clanks from the loading and unloading cycles, the
// conveyor, the street traffic (horn on the hero's side-eye), the calendar flips + clock in the time-lapse, the lights
// switching off at the closure, and soft air moves on the big camera moves. Levels: rel dB under the narration peak.
import * as T from "./timeline";
import { CAR_X } from "./train";
import { ZC } from "./cutaway";
import type { V3 } from "../../lib/math";

export const FPS = T.FPS, FILM_FRAMES = T.FILM_FRAMES;
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string; rel?: number };
const N = FILM_FRAMES;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const view = (c: { pos: V3; look: V3; fov: number }, p: V3) => { const fw = sub(c.look, c.pos), fl = len(fw), f: V3 = [fw[0] / fl, fw[1] / fl, fw[2] / fl];
  const rt: V3 = [-f[2], 0, f[0]], rl = Math.hypot(rt[0], rt[2]) || 1, d = sub(p, c.pos), z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
  const x = (d[0] * rt[0] + d[2] * rt[2]) / rl; const half = Math.tan((c.fov * Math.PI) / 360) * (9 / 16);
  return { side: z > 0 ? Math.max(-1, Math.min(1, x / (z * half))) : 0, dist: len(d), front: z > 0 }; };
const db = (g: number) => 20 * Math.log10(Math.max(0.05, g));
const pick = <X,>(a: X[], i: number) => a[((i % a.length) + a.length) % a.length];

export const soundEvents = (): SoundEvent[] => {
  const out: SoundEvent[] = []; let n = 0;
  const rec = (frame: number, file: string, rel: number, x: number, note: string) => { const f = Math.round(frame); if (f < 0 || f >= N) return; out.push({ frame: f, kind: `rec:${file}`, x: Math.max(-0.85, Math.min(0.85, x)), gain: 1, rel, note }); };
  const syn = (frame: number, kind: string, gain: number, x: number, note: string) => { const f = Math.round(frame); if (f < 0 || f >= N) return; out.push({ frame: f, kind, x: Math.max(-0.85, Math.min(0.85, x)), gain: Math.max(0.05, Math.min(1, gain)), note }); };
  const frames = Array.from({ length: N }, (_, f) => T.frameAt(f));

  // ---- footsteps: match walkers frame to frame by position, a step every 0.62 m of travel
  let prev: { p: V3; d: number; k: number }[] = [];
  for (let f = 0; f < N; f++) { const o = frames[f], cur: { p: V3; d: number; k: number }[] = [];
    for (const a of o.actors) { const q = prev.reduce<{ p: V3; d: number; k: number } | null>((b, c) => { const dd = Math.hypot(c.p[0] - a.pos[0], c.p[2] - a.pos[2]); return dd < 0.25 && (!b || dd < Math.hypot(b.p[0] - a.pos[0], b.p[2] - a.pos[2])) ? c : b; }, null);
      const st = { p: a.pos, d: q?.d ?? 0, k: q?.k ?? n++ }; if (q) { const step = Math.hypot(a.pos[0] - q.p[0], a.pos[2] - q.p[2]); if (step > 0.004) st.d += step; }
      if (st.d >= 0.62) { st.d -= 0.62; const v = view(o.c, a.pos); if (v.front && v.dist < 30) { const under = a.pos[1] < -3, g = Math.min(1, 5 / Math.max(2.5, v.dist));
        rec(f, pick(["k_footstep_concrete_000.wav", "k_footstep_concrete_001.wav", "k_footstep_concrete_002.wav", "k_footstep_concrete_003.wav", "k_footstep_concrete_004.wav"], st.k * 7 + f), (under ? -31 : -30) + db(g), v.side * 0.8, `walker footstep on ${under ? "the platform (concrete)" : "the flagstones"} (recorded)`); } }
      cur.push(st); }
    prev = cur; }

  // ---- the train: clacks at rail joints (9.14 m) + crossover frogs, motor hum while moving, brake squeal while slowing
  const AXLES = CAR_X.flatMap((cx) => [1.78, -1.78].flatMap((b) => [0.42, -0.42].map((a) => cx + b + a)));
  const JOINT = 9.14, FROGS = [6.0, 6.0 + 4.2];
  let moving = false, brake = -999;
  for (let f = 1; f < N; f++) { const o = frames[f], x0 = T.trainRun(f - 1).x, x1 = o.train.x, v = Math.abs(x1 - x0); if (v > 0.5) continue;    // loop wrap
    const tp: V3 = [x1, -6.0, 4.9], vw = view(o.c, tp), audible = o.under && vw.dist < 45, g = Math.min(1, 9 / Math.max(3, vw.dist));
    if (v > 0.01) for (const ax of AXLES) { const a0 = x0 + ax, a1 = x1 + ax;
      if (Math.floor(a0 / JOINT) !== Math.floor(a1 / JOINT) && audible) syn(f, "rail_clack", g * Math.min(1, v / 0.15) * 0.8, vw.side * 0.7, "a wheelset crosses a rail joint");
      for (const fx of FROGS) if (a0 < fx && a1 >= fx && audible) syn(f, "rail_clack", g, vw.side * 0.7, "a wheelset bangs over the crossover frog"); }
    if (v > 0.02 && !moving && audible) { rec(f - 6, "mk2504.wav@3+5.5", -27 + db(g), vw.side * 0.5, "the train's traction motors hum up (recorded machine hum)"); moving = true; }
    if (v < 0.01) moving = false;
    const vp = Math.abs(x0 - T.trainRun(f - 2).x); if (v < vp - 0.0015 && v > 0.01 && f - brake > 40 && audible) { syn(f, "brake_squeal", g * 0.9, vw.side * 0.6, "brake blocks squeal as the train slows"); brake = f; } }
  rec(150, "mk2504.wav@10+4.5", -28, 0.2, "B: motors humming beside the camera"); rec(190, "mk2504.wav@16+3.5", -27, 0.1, "B: the driverless train hums past");
  syn(276, "parcel_thud", 0.5, 0.2, "B: the train comes to rest (buffers settle)");
  rec(T.DEP - 4, "mk2504.wav@20+6.5", -25, 0.1, "F: motors spool up as the train departs");
  rec(T.DEP + 150, "mk2504.wav@28+2.2", -27, 0, "F: motors wind down into the station");
  syn(T.DEP + 6, "train_old", 0.75, 0, "F: the train accelerates away into the tunnel (rumble + whine)");
  for (const f of [1000, 1040, 1080]) syn(f, "air_rush", 0.45, 0.4, "F: tunnel air pushed past the lamps");
  syn(T.ARR + 2, "parcel_thud", 0.55, 0.2, "G: the train stops at Liverpool Street");

  // ---- loading (E): bag lifted from the stack (canvas), thump into the container, lids slammed shut
  for (const e of T.LOAD_LANDS) { const o = frames[e.f], v = view(o.c, [o.train.x, -5.6, 4.9]);
    rec(e.f - 18, pick(["k_cloth1.wav", "k_cloth2.wav", "k_cloth3.wav", "k_cloth4.wav"], e.f), -32, v.side * 0.6, "a mailbag hauled off the stack (recorded canvas)");
    rec(e.f, pick(["k_impactSoft_heavy_000.wav", "k_impactSoft_heavy_001.wav", "k_impactSoft_heavy_002.wav", "k_dropLeather.wav"], e.f), -27, v.side * 0.6, "the mailbag lands in the steel container (recorded)"); }
  for (const [, b] of T.LID_CLOSE) rec(b, pick(["k_impactMetal_medium_000.wav", "k_impactMetal_medium_001.wav", "k_impactMetal_medium_002.wav"], b), -25, 0.1, "a container lid slammed shut (recorded steel)");
  rec(933, "k_metalLatch.wav", -30, 0.2, "the first lid latched");
  // ---- unloading (G..H): lids flung open, bags lifted out, set on the conveyor, the belt running
  rec(1166, "k_impactMetal_heavy_000.wav", -27, 0.3, "the container lids swing open onto the far side");
  for (const e of T.UNLOAD_LIFTS) rec(e.f, pick(["k_cloth2.wav", "k_cloth3.wav", "k_handleSmallLeather.wav"], e.f), -32, 0.3, "a mailbag lifted out of the container");
  for (const e of T.BELT_PUTS) rec(e.f, pick(["k_impactSoft_medium_000.wav", "k_impactSoft_medium_001.wav", "k_impactSoft_medium_002.wav"], e.f), -29, 0.45, "the bag dropped onto the conveyor");
  rec(1176, "mk2504.wav@30+12", -32, 0.5, "G-H: the conveyor motor drones as bags ride up to the sorting office");
  for (const e of T.LID_CLOSE.slice(0, 1)) void e;
  rec(1416, "k_impactMetal_medium_003.wav", -27, 0.3, "H: lids closed for the last time");

  // ---- street (A, C, J): traffic, the stuck lorry's horn on the hero's side-eye, the sack dropped
  rec(0, "mk2930.wav@5+5.2", -34, 0, "A: the city far below (distant traffic, muffled)"); rec(0, "mk17.wav@0+5.0", -33, -0.3, "A: sparrows over the rooftops");
  rec(312, "mk1536.wav@0+9", -29, 0.3, "C: a vintage car crawls past in the jam (recorded)"); rec(330, "mk1621.wav@1+8.6", -31, -0.3, "C: the post lorry idles and creeps (recorded)");
  rec(422, "mk1565.wav", -24, 0.4, "C: the lorry driver leans on the horn (recorded classic horn)"); rec(452, "mk1565.wav", -27, 0.4, "C: and again");
  rec(500, "mk2706.wav@3+4", -31, -0.4, "C: a motor bus grinds past on the far side");
  syn(T.HERO_SACK_UNTIL + 9, "parcel_thud", 0.8, 0.1, "C: the hero drops the overstuffed mailbag");
  syn(236, "idea_ding", 0.4, 0.3, "B: the hero gets an idea (ride the train!)"); syn(252, "brow_pluck", 0.55, 0.3, "B: the officer's raised brow");
  syn(262, "brow_pluck", 0.45, 0.1, "B: the hero freezes, embarrassed");
  syn(505, "brow_pluck", 0.45, 0.0, "C: the hero's disbelief"); syn(1575, "brow_pluck", 0.5, 0.2, "I: the hero's shock at the closure");

  // ---- time passing (H): calendar pages flip, the clock races
  let lastY = 1927; for (let f = 1290; f < 1600; f++) { const y = T.yearAt(f); if (y !== lastY) { rec(f, pick(["k_bookFlip1.wav", "k_bookFlip2.wav", "k_bookFlip3.wav"], f), -31, 0.45, `H: the calendar flips to ${y}`); lastY = y; } }
  rec(1290, "mk1060.wav@0+9", -33, 0.4, "H: the station clock ticking (recorded)");
  // ---- closure (I): banks of lights switched off, one lamp left, quiet
  rec(1574, "k_metalClick.wav", -24, -0.2, "I: the main lighting switch thrown"); rec(1576, "k_impactMetal_light_002.wav", -30, -0.2, "I: the switch gear clunks");
  rec(1586, "k_creak1.wav", -33, 0.3, "I: the empty station settles");

  // ---- camera air moves (big moves only, soft)
  for (const [f, file, note] of [[96, "mk1486.wav@0+2.6", "camera glides down past the street edge"], [338, "mk1489.wav", "camera rises to the street"], [690, "mk1474.wav", "camera sinks back down the section"],
    [850, "mk1489.wav", "camera slips into the station"], [1660, "mk1474.wav", "camera pulls out through the cut"], [1735, "mk1482.wav", "camera climbs into the aerial"]] as [number, string, string][]) rec(f - 10, file, -32, 0, note);
  void ZC;
  return out.sort((a, b) => a.frame - b.frame);
};
