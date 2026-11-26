// Centennial Light scene module for the audio pipeline: FPS, FILM_FRAMES, soundEvents() — every cue tied to a visible
// cause in the same timeline the picture uses (bulbs failing / being screwed in / lighting, ladders, the lantern, the
// cord cut + box in 1976, the engine, footsteps of every walker, the 2013 outage + flashlight + extension cord). Beds
// follow place + era via the ambience timeline in productions/centennial/production.json. Nothing cartoonish: only a
// few very soft comic accents on the hero's big expressions, subtle shimmers on era dissolves.
import * as T from "./timeline";

export const FPS = T.FPS, FILM_FRAMES = T.FILM_FRAMES;
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
const N = FILM_FRAMES;
export const soundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  const add = (frame: number, kind: string, x: number, gain: number, note: string) => { const f = ((Math.round(frame) % N) + N) % N; ev.push({ frame: f, kind, x: Math.max(-0.85, Math.min(0.85, x)), gain, note }); };
  /** footsteps along a walk: one per ~0.35 m (two per 0.7 m gait cycle), alternating feet */
  const steps = (f0: number, f1: number, dist: number, surface: "wood" | "concrete", x0: number, x1: number, gain: number, who: string) => {
    const n = Math.max(2, Math.round(dist / 0.35)); for (let i = 0; i < n; i++) { const f = f0 + ((f1 - f0) * (i + 0.5)) / n; add(f, `step_${surface}_${i % 2 ? "r" : "l"}`, x0 + (x1 - x0) * (i / n), gain, `${who}: footstep on ${surface}`); } };
  // ---- A: Station 6 at dusk, the macro pull-back
  add(30, "filament_on", 0, 0.25, "the Centennial's faint electrical hum close to the glass (it is lit, very dimly)");
  // ---- B: generations of newer bulbs
  add(150, "bulb_burnout", -0.3, 0.9, "1912: a newer bulb flickers and dies"); add(138, "brow_pluck", 0.3, 0.5, "the hero's eyebrow climbs");
  add(156, "time_shimmer", 0, 0.35, "era dissolve 1912 -> 1938"); add(166, "ladder_creak", -0.4, 0.8, "a fireman steps up the stepladder");
  add(174, "screw_bulb", -0.4, 0.9, "he screws in a frosted bulb"); add(188, "filament_on", -0.4, 0.8, "it lights"); add(196, "double_take", 0.3, 0.4, "the hero's confused side-eye");
  add(198, "time_shimmer", 0, 0.3, "era dissolve 1938 -> 1955"); add(217, "bulb_burnout", -0.5, 0.8, "1955: an enamel-shade lamp blinks out");
  // ---- C: 1901 street -> inside; the bulb installed; ordinary day
  steps(226, 320, 7.0, "wood", -0.7, -0.1, 0.55, "a townsman on the board sidewalk");
  add(300, "ladder_creak", -0.1, 0.8, "the electrician shifts on the stepladder"); add(318, "screw_bulb", -0.1, 1.0, "the bulb's brass base threads into the socket");
  add(INSTALL_ON(), "filament_on", -0.1, 1.0, "the Centennial lights for the first time (1901)"); add(396, "ladder_creak", -0.1, 0.8, "the electrician climbs down"); add(416, "ladder_creak", 0, 0.6, "last step");
  steps(436, 476, 3.4, "wood", 0.1, 0.6, 0.6, "the electrician walks away"); steps(360, 480, 8.3, "wood", 0.6, -0.6, 0.7, "a volunteer walks under the bulb without looking");
  add(382, "hose_coil", -0.4, 0.8, "a volunteer coils canvas hose"); add(434, "hose_coil", -0.4, 0.7, "more hose coiled");
  // ---- D: night 1901
  add(484, "match_strike", -0.2, 1.0, "a volunteer strikes a match and lights the lantern on the column"); add(520, "polish_rag", -0.4, 0.7, "another checks + wipes the brass nozzle");
  // ---- E: ordinary bulbs burn out and are replaced
  add(588, "bulb_burnout", 0.2, 1.0, "the ordinary bulb burns out"); add(598, "ladder_creak", 0.3, 0.7, "a fireman climbs to it"); add(612, "time_shimmer", 0, 0.3, "era dissolve 1912 -> 1940s");
  add(616, "screw_bulb", 0.2, 0.9, "the replacement goes in"); add(626, "filament_on", 0.2, 0.8, "the new bulb lights"); add(655, "brow_pluck", 0.1, 0.4, "the hero's smug look");
  // ---- F: years passed, then decades
  add(724, "time_shimmer", 0, 0.4, "years pass (1915 -> 1938)"); add(758, "time_shimmer", 0, 0.45, "decades (1938 -> 1976)"); add(762, "car_pass", 0.4, 0.5, "a 1970s car passes outside the doors");
  steps(688, 745, 4.0, "wood", -0.6, 0.1, 0.45, "a passer-by on the board sidewalk outside (1915)");
  // ---- G1: 1976 — cord cut, bulb into the padded box
  add(800, "ladder_creak", 0, 0.7, "a firefighter on the stepladder takes hold of the bulb"); add(T.CUT_AT, "cord_snip", 0, 1.0, "the cord is cut (the bulb goes dark for the move)");
  add(T.CUT_AT + 1, "bulb_dark", 0, 0.5, "its faint hum stops"); add(847, "box_lid", 0.2, 1.0, "the padded box is closed over the bulb");
  // ---- G2/G3: the move with an escort, arrival at Station 6
  add(834, "engine76", 0.1, 0.6, "the 1976 pumper rolls along the street"); add(840, "engine_arrive", 0.1, 0.9, "it slows and stops at the new Station 6");
  steps(918, 968, 6.0, "concrete", -0.2, -0.5, 0.7, "the firefighter carries the box into the bay");
  // ---- G4: installed in the new bay
  add(930, "screw_bulb", -0.1, 0.9, "the bulb goes into its new socket"); add(T.RELIT, "filament_on", -0.1, 0.9, "the Centennial lights again in its new home");
  // ---- H: the strange part
  add(952, "ladder_steel", 0.2, 0.6, "the hero shifts on the steel platform"); add(968, "brow_pluck", 0.2, 0.45, "one eyebrow up");
  // ---- J: interruptions (2013)
  add(T.OFF_AT, "bulb_dark", -0.1, 1.0, "the bulb's power supply fails: it goes dark"); add(T.OFF_AT + 4, "ladder_steel", 0.2, 0.7, "the hero jolts on the platform");
  add(1097, "flashlight_click", -0.4, 0.9, "a firefighter switches on a flashlight"); steps(1096, 1118, 3.9, "concrete", -0.3, -0.6, 0.75, "the firefighter walks to the power box");
  add(1122, "box_latch", -0.6, 0.9, "the power-supply box is opened"); add(1132, "cord_unroll", -0.6, 0.9, "an extension cord is pulled off its coil"); add(1146, "plug_click", -0.6, 1.0, "the bypass is plugged in");
  add(T.ON_AT, "filament_on", -0.1, 0.9, "the glow returns");
  // ---- K: survived more than a century (day)
  steps(1178, 1270, 8.8, "concrete", -0.7, 0.6, 0.65, "a modern firefighter in turnout boots walks past");
  // ---- L: the BulbCam + monitor
  add(1452, "double_take", -0.3, 0.4, "the hero's double-take from the monitor to the real bulb");
  return ev.sort((a, b) => a.frame - b.frame);
};
const INSTALL_ON = () => T.INSTALL_ON;
