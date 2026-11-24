// Robot Hotel scene module for the audio pipeline: FPS, FILM_FRAMES, soundEvents(). Every cue comes from the same
// timeline the picture uses: footsteps from each walker's on-screen travel (surface from where the foot lands: stone
// lobby, corridor carpet, room parquet), the sliding doors, the raptor's growl + servo whirs, the workforce powering
// down (one tone per robot, on its own frame), the key card, the porter's motor / error beeps / door bumps, the
// concierge's chirp + "thinking" tones, the synthesised snores on every breath the sleeper takes (only while the camera
// is in the room), the bedside robot's listening tone and wake-up alarm, the unplug, the passport/panel glitches, the
// dollies. Ambience: street -> lobby murmur -> room tone, as recorded layers. Levels: rel dB under the narration peak.
import * as T from "./timeline";
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
const surface = (p: V3) => p[2] < -12.4 && p[0] > 9.6 ? "wood" : p[0] > 9 ? "carpet" : "concrete";

export const soundEvents = () => {
  const out: SoundEvent[] = []; let n = 0;
  const frames = Array.from({ length: N }, (_, f) => T.frameAt(f));
  const rec = (frame: number, file: string, rel: number, x: number, note: string) => { const f = Math.round(frame); if (f < 0 || f >= N) return; out.push({ frame: f, kind: `rec:${file}`, x: Math.max(-0.85, Math.min(0.85, x)), gain: 1, rel, note }); };
  const at = (f: number, p: V3) => view(frames[Math.max(0, Math.min(N - 1, f))].c, p);
  const inRoom = (f: number) => frames[f].zone.room > 0.5;

  // ---- footsteps: match walkers frame to frame by position, one step per 0.62 m of travel, surface under the foot
  let prev: { p: V3; d: number; k: number }[] = [];
  for (let f = 0; f < N; f++) { const o = frames[f], cur: { p: V3; d: number; k: number }[] = [];
    for (const a of o.actors) { if (a.centre) continue; const q = prev.reduce<{ p: V3; d: number; k: number } | null>((b, c) => { const dd = Math.hypot(c.p[0] - a.pos[0], c.p[2] - a.pos[2]); return dd < 0.25 && (!b || dd < Math.hypot(b.p[0] - a.pos[0], b.p[2] - a.pos[2])) ? c : b; }, null);
      const st = { p: a.pos, d: q?.d ?? 0, k: q?.k ?? n++ }; if (q) { const step = Math.hypot(a.pos[0] - q.p[0], a.pos[2] - q.p[2]); if (step > 0.004) st.d += step; }
      if (st.d >= 0.62) { st.d -= 0.62; const v = view(o.c, a.pos); if (v.front && v.dist < 18 && a.pos[1] > -1) { const s = surface(a.pos), g = Math.min(1, 4 / Math.max(2, v.dist));
        rec(f, `k_footstep_${s}_00${pick([0, 1, 2, 3, 4], st.k * 3 + f)}.wav`, (s === "carpet" ? -31 : s === "wood" ? -29 : -28) + db(g), v.side * 0.8, `footstep on ${s === "concrete" ? "the stone lobby floor" : s === "carpet" ? "the corridor carpet" : "the room parquet"} (recorded)`); } }
      cur.push(st); }
    prev = cur; }

  // ---- A/B: street, the sliding doors, the workforce powering down
  rec(0, "mk2465.wav@4+5.2", -31, 0, "A: the street outside the hotel (recorded urban ambience)");
  rec(50, "mk1523.wav", -26, 0.0, "A: the automatic glass doors slide open");
  rec(104, "mk1523.wav@0.2+1.0", -30, -0.3, "B: the doors slide shut behind the camera");
  rec(86, "mk2981.wav@2+48", -33, 0, "lobby: guests murmuring, the hotel's room sound (recorded)");
  T.workersAt(0).forEach((_, i) => { const offs = [98, 0, 110, 122, 0, 134][i]; if (!offs) return; const p = T.workersAt(offs)[i].p, v = at(offs, p);
    rec(offs, pick(["k_lowDown.wav", "k_zapThreeToneDown.wav", "k_phaserDown1.wav"], i), -27, v.side * 0.7, `B: workforce robot ${i + 1} powers down`); });
  // ---- C: the raptor rears and roars, jaw clacks, servos, the bow
  rec(156, "syn_servo1.wav", -28, -0.3, "C: the raptor's neck servos rear it up (synthesised whir)");
  rec(160, "mk309.wav@0.4+2.4", -17, -0.35, "C: the animatronic raptor ROARS at the hero (recorded growl)");
  rec(196, "k_impactPlate_light_000.wav", -30, -0.35, "C: its jaw clacks shut");
  rec(206, "syn_servo0.wav", -29, -0.3, "C: servos whir as it bows");
  rec(214, "k_pepSound2.wav", -28, -0.3, "C: a polite robotic chirp with the bow");
  // ---- E: the human employee (coffee), F: check-in
  rec(506, "syn_servo2.wav", -29, -0.1, "F: the blue raptor's arm extends with the key card");
  rec(520, "k_confirmation_001.wav", -26, -0.1, "F: key card issued (confirmation tone)");
  rec(540, "k_impactPlate_light_001.wav", -31, -0.15, "F: the card taken from the claw");
  rec(522, "k_engineCircular_000.wav", -33, 0.4, "F: the luggage robot's motor hums as it rolls up");
  rec(552, "k_pepSound1.wav", -29, 0.2, "F: the porter chirps on arrival");
  rec(566, "k_impactSoft_medium_000.wav", -28, 0.1, "F: the hero heaves the suitcase");
  rec(585, "k_impactSoft_heavy_000.wav", -26, 0.1, "F: suitcase lands on the porter's deck");
  rec(588, "k_pepSound3.wav", -30, 0.6, "F: the concierge waves and chirps");
  // ---- G/H: following the porter, error
  rec(604, "k_engineCircular_000.wav", -32, 0.2, "G: the porter drives off");
  rec(705, "k_error_004.wav", -22, 0.4, "H: the porter stops dead: error beep");
  rec(714, "k_impactSoft_medium_001.wav", -27, 0.4, "H: the hero walks into the stopped porter");
  rec(708, "mk473.wav", -30, 0, "H: a deflating comedy piano sting (\"the problems started\")");
  rec(730, "k_error_002.wav", -27, 0.45, "H: its red ring blinks, error again");
  // ---- I: the concierge can't answer
  rec(772, "k_computerNoise_000.wav", -30, 0.25, "I: the concierge 'thinking' (loading dots)");
  rec(796, "k_question_002.wav", -27, 0.25, "I: a puzzled tone");
  rec(824, "k_question_003.wav", -27, 0.25, "I: still no answer");
  // ---- J: the porter goes the wrong way, bumps the wrong door
  rec(800, "k_pepSound4.wav", -29, 0.6, "J: the porter recovers and zooms into the corridor");
  for (const [f, i] of [[903, 0], [912, 1], [921, 2]] as const) rec(f, `k_impactPlank_medium_00${i}.wav`, -24, 0.45, "J: the porter bumps the door of the WRONG room");
  rec(904, "k_error_006.wav", -26, 0.45, "J: error beep at the wrong door");
  rec(927, "k_impactSoft_medium_000.wav", -28, 0.3, "J: the hero snatches the suitcase back");
  rec(948, "mk2842.wav@0+1.2", -28, -0.2, "K: key in the lock of room 101"); rec(952, "mk201.wav", -27, -0.2, "K: the door opens");
  // ---- K-N: the room at night: snores on every breath, the bedside robot listens, then wakes him
  rec(966, "mk3080.wav@3+62", -34, 0, "room 101 at night: quiet room tone (recorded)");
  rec(966, "mk1059.wav@0+11", -36, -0.4, "room: the alarm clock ticking on the nightstand (recorded)");
  for (let f = 990; f < 1146; f++) if (T.snorePhase(f) < T.snorePhase(f - 1) && inRoom(f)) rec(f + Math.round(0.30 * 72), `syn_snore${(f >> 3) % 4}.wav`, -23, -0.3, "L: the sleeping guest snores (synthesised)");
  for (let f = 1010; f < 1110; f++) { const e = T.eggAt(f).ring, e0 = T.eggAt(f - 1).ring; if (e > 0.6 && e0 <= 0.6) rec(f, pick(["k_forceField_000.wav", "k_forceField_001.wav"], f), -29, 0.3, "L: the bedside robot hears the snore and starts listening"); }
  rec(1108, "k_highUp.wav", -26, 0.3, "M: the bedside robot decides it was spoken to");
  rec(1112, "mk988.wav@0+2.4", -19, 0.3, "M: it answers LOUDLY (alarm-like chime) right next to his ear");
  rec(1146, "k_impactSoft_heavy_000.wav", -24, -0.2, "M: the guest jolts upright in bed (duvet)");
  rec(1206, "k_twoTone1.wav", -28, 0.3, "N: an innocent little chirp");
  // ---- O: staff step in: room door, unplug, the porter pushed back
  rec(1222, "mk182.wav@0+1.6", -26, -0.2, "O: an employee bursts in"); rec(1272, "k_switch_002.wav", -25, 0.1, "O: the bedside robot unplugged"); rec(1274, "k_lowDown.wav", -27, 0.1, "O: it powers down");
  rec(1288, "k_engineCircular_000.wav", -31, 0.4, "O: the porter's wheels as it is pushed back"); rec(1300, "k_error_002.wav", -30, 0.4, "O: it protests (error beep)");
  // ---- P: lobby chaos
  rec(1376, "k_impactMetal_light_000.wav", -27, 0.4, "P: the concierge's service panel opened");
  for (const f of [1398, 1436, 1468]) rec(f, pick(["mk2595.wav", "mk2594.wav@0+0.8", "k_glitch_002.wav"], f), -27, 0.4, "P: sparks + glitches inside the concierge");
  for (const f of [1392, 1424, 1458, 1486]) rec(f, pick(["syn_servo0.wav", "syn_servo1.wav", "syn_servo2.wav"], f), -30, -0.5, "P: the raptor tilts its head at the passport");
  rec(1410, "mk1530.wav", -31, -0.4, "P: the passport held up to the raptor's eyes (paper)");
  rec(1455, "k_impactGeneric_light_000.wav", -26, 0.3, "P: the manager facepalms");
  // ---- Q: 2019: the workforce powered down, wheeled away; the hero checks out; doors
  for (const [i, f] of [[0, 1530], [2, 1538], [3, 1546], [5, 1554]] as const) rec(f, pick(["k_lowDown.wav", "k_zapThreeToneDown.wav", "k_phaserDown1.wav", "k_lowDown.wav"], i), -26, 0.6, `Q: workforce robot ${i + 1} switched off for good`);
  for (const f of [1568, 1580]) rec(f, "k_impactMetal_light_001.wav", -27, 0.5, "Q: a robot tipped onto a dolly");
  rec(1582, "k_scratch_001.wav", -33, 0.4, "Q: dolly wheels roll away");
  rec(1530, "k_scratch_001.wav", -34, 0.3, "Q: the hero's suitcase wheels on the stone floor");
  rec(1616, "mk1523.wav", -27, 0, "R: the glass doors slide open as the camera drifts out"); rec(1652, "mk1523.wav@0.2+1.0", -31, 0, "R: and close");
  rec(1640, "mk2465.wav@10+3", -33, 0, "R: the street again (recorded)");
  return out.sort((a, b) => a.frame - b.frame);
};
