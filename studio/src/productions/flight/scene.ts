// flight scene module for the audio pipeline: FPS, FILM_FRAMES and soundEvents() derived from the same animation data
// the picture uses (gait contacts of every walker, the cabin acting frames, engine start / taxi / take-off / touchdown /
// spin-down from the aircraft motion, doors from their hinge curves). Continuous engine + wind beds follow the camera via
// the ambience timeline in productions/flight/production.json.
import * as T from "./timeline";
import type { FCam } from "./Set";

export const FPS = T.FPS, FILM_FRAMES = T.FILM_FRAMES;
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
const N = FILM_FRAMES;
const clampPan = (x: number) => Math.max(-0.85, Math.min(0.85, x));

/** camera for a film frame = the top-most visible layer's camera */
const camOf = (f: number): FCam => { const act = T.LAYERS.filter((L) => T.layerOpacity(L, f) > 0.5); const L = act[act.length - 1]?.[0] ?? "A";
  if (L === "A") return T.camA(f); if (L === "A_LOOP") return T.camA(f - N); if (L === "B") return T.camB(f); if (L === "C") return T.camC(f); if (L === "E") return T.camE(f); return T.camM(Number(L[1]))(f); };
const view = (f: number, p: number[], c = camOf(f)) => { const P = [p[0], p[1] + 0.7, p[2]];
  const fw = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], fl = Math.hypot(...fw); fw[0] /= fl; fw[1] /= fl; fw[2] /= fl;
  const rt = [-fw[2], 0, fw[0]], rl = Math.hypot(...rt) || 1; rt[0] /= rl; rt[2] /= rl; const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
  const d = [P[0] - c.pos[0], P[1] - c.pos[1], P[2] - c.pos[2]], dist = Math.hypot(...d), z = d[0] * fw[0] + d[1] * fw[1] + d[2] * fw[2];
  const x = d[0] * rt[0] + d[1] * rt[1] + d[2] * rt[2], y = d[0] * up[0] + d[1] * up[1] + d[2] * up[2], tv = Math.tan((c.fov / 2) * Math.PI / 180), th = tv * 9 / 16;
  return { dist, vis: z > 0.3 && Math.abs(x / z) < th + 0.08 && Math.abs(y / z) < tv + 0.1, pan: z > 0.3 ? x / z / (th + 1e-6) * 0.6 : 0 }; };

export const soundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  const add = (frame: number, kind: string, x: number, gain: number, note: string) => { const f = ((Math.round(frame) % N) + N) % N; ev.push({ frame: f, kind, x: clampPan(x), gain, note }); };
  // ---- FOOTSTEPS: one per foot contact (heel strike at every integer of 2 x gait), only while walking + visible + near
  const steps = (who: string, get: (f: number) => { pos: number[]; gait?: number; walk?: number }[], f0: number, f1: number, surface: (p: number[]) => string, near = 3, maxD = 16) => {
    const last = new Map<number, number>();
    for (let f = f0; f < f1; f++) { const L = get(f);
      L.forEach((a, i) => { if (a.gait === undefined || (a.walk ?? 0) < 0.3) { last.delete(i); return; } const k = Math.floor(a.gait * 2), pk = last.get(i); last.set(i, k);
        if (pk === undefined || k === pk) return; const v = view(f, a.pos); if (!v.vis || v.dist > maxD) return;
        add(f, `step_${surface(a.pos)}_${k % 2 ? "r" : "l"}`, v.pan, Math.min(1, Math.max(0.15, near / Math.max(v.dist, 0.5))), `${who} ${i}: ${k % 2 ? "right" : "left"} foot down`); }); } };
  const apronW = (p: number[]) => (p[2] < -22 && p[0] > 20 && p[0] < 175 ? "gravel" : "grass");
  const apronP = (p: number[]) => (p[2] < -168 && p[2] > -232 && p[0] > 2665 && p[0] < 2765 ? "gravel" : "grass");
  steps("Westray passenger", (f) => T.walkersB(f), 688, 790, apronW);
  steps("montage: the hero", (f) => T.montage(0, f).out, 1236, 1278, apronW, 3.5, 18);
  steps("Papa Westray passenger", (f) => T.walkersE(f), 1440, N, apronP);

  // ---- L1 cabin acting (S01-S06)
  add(116, "brow_pluck", -0.2, 0.8, "his eyebrows shoot up"); add(126, "cloth_soft", -0.2, 0.8, "sleeve as he lifts his wrist"); add(132, "watch_tick", -0.2, 0.9, "he checks his watch");
  add(146, "cloth_soft", -0.3, 0.6, "glance at the window"); add(158, "cloth_soft", -0.2, 0.6, "wrist up again"); add(162, "watch_tick", -0.2, 0.8, "watch again");
  add(201, "seat_creak", -0.2, 0.9, "he shuffles into the bench"); add(208, "cloth_soft", -0.2, 1.0, "tugs his jacket straight"); add(216, "cloth_soft", -0.15, 0.7, "jacket");
  add(236, "bag_set", -0.1, 0.9, "bag tucked under the seat"); add(246, "belt_slide", -0.1, 0.9, "pulls the lap belt across"); add(262, "belt_click", -0.1, 1.0, "lap belt clicks shut");
  add(268, "seat_creak", -0.2, 0.7, "comfy wiggle"); add(282, "double_take", -0.2, 0.8, "he notices the island already ahead"); add(296, "watch_tick", -0.2, 0.8, "watch again");
  add(348, "air_swell", 0.3, 0.9, "the camera passes out through the window into the open air");
  for (const f of [430, 486]) add(f, "gull", f < 450 ? -0.4 : 0.4, 0.5, "gulls over Papa Sound (far below)");
  add(606, "cloth_soft", 0.2, 0.7, "he points at the island"); add(640, "double_take", 0.1, 0.8, "double-take");
  // ---- L2 Westray: birds, wind, the windsock, boarding, door, engine start, taxi, take-off
  add(698, "oystercatcher", 0.5, 0.7, "oystercatchers piping by the shore"); add(712, "windsock", 0.4, 0.6, "the windsock flutters"); add(752, "sheep", -0.6, 0.6, "a sheep in the next field");
  add(724, "cloth_soft", 0.2, 0.6, "C climbs in"); add(748, "cloth_soft", 0.2, 0.6, "B climbs in"); add(776, "cloth_soft", 0.1, 0.8, "he ducks into the door");
  add(784, "ac_door_close", 0.0, 0.8, "the rear door shuts");
  add(806, "eng_start", 0.2, 1.0, "starboard engine: starter cranks, coughs, catches, runs up");
  add(822, "eng_start_far", -0.3, 0.8, "port engine starts (far side)");
  add(830, "cloth_soft", 0.5, 0.5, "the attendant gives a thumbs-up");
  add(TAXI0, "taxi", 0, 1.0, "taxi: idle power, tyres on the gravel, nose wheel turning");
  add(893, "takeoff", 0, 1.0, "take-off power; wheels leave the ground at ~936; climbing over the cliffs");
  add(1012, "watch_tick", -0.2, 0.7, "he checks his watch (seen through the window)"); add(1024, "brow_pluck", -0.2, 0.7, "brows up");
  // ---- L3 Papa Westray approach + cabin
  add(1088, "oystercatcher", -0.4, 0.4, "shore birds below as the coast passes under");
  add(1176, "belt_slide", -0.1, 0.9, "he tightens the belt, very seriously"); add(1192, "cloth_soft", -0.2, 1.0, "straightens his jacket"); add(1200, "cloth_soft", -0.2, 0.7, "jacket");
  add(1229, "double_take", -0.2, 0.9, "the runway is right outside (accent in the pause after \"about it\")");
  // ---- L4 montage
  add(1286, "cloth_soft", 0.1, 0.9, "ducking in through the door"); add(1310, "seat_creak", -0.1, 0.9, "he sits down, solemnly"); add(1332, "belt_slide", -0.1, 0.9, "belt across");
  add(T.BELT_CLICK_M, "belt_click", -0.1, 1.0, "belt clicks"); add(1350, "seat_creak", -0.2, 0.7, "comfy wiggle");
  // ---- L3 landing -> L5 arrived
  add(1392, "touchdown", 0, 1.0, "main wheels touch down on the grass runway"); add(1394, "rollout", 0, 0.9, "roll-out, power to idle");
  add(1420, "spin_down", 0, 0.9, "engines cut; props wind down to a stop");
  add(1442, "ac_door_open", 0.1, 1.0, "the starboard door opens");
  add(1470, "double_take", 0.0, 0.8, "he can't believe it's over"); add(1486, "cloth_soft", 0.0, 0.8, "he turns to the plane");
  add(1476, "oystercatcher", 0.6, 0.4, "shore birds at Papa Westray");
  void T.LAYERS;
  return ev.sort((a, b) => a.frame - b.frame);
};
const TAXI0 = 826;
