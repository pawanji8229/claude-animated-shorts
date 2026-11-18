// post office scene module for the audio pipeline: FPS, FILM_FRAMES, soundEvents() — every cue tied to a visible cause
// in the same timeline the picture uses (layers, handovers, lever, tank, swims, surface crossings). Beds follow the
// camera medium (reef / surface / beach / sorting room) via the ambience timeline in productions/postoffice/production.json.
import * as T from "./timeline";

export const FPS = T.FPS, FILM_FRAMES = T.FILM_FRAMES;
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
const N = FILM_FRAMES;
/** which layer is on top (visible) at frame f */
const top = (f: number) => { const act = T.LAYERS.filter((L) => T.layerOpacity(L, f) > 0.5); return act[act.length - 1]?.[0] ?? "A"; };
const UNDER = new Set(["A", "D", "E2", "F", "G", "H", "I1", "J", "C3", "A_LOOP"]);
export const soundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  const add = (frame: number, kind: string, x: number, gain: number, note: string) => { const f = ((Math.round(frame) % N) + N) % N; ev.push({ frame: f, kind, x: Math.max(-0.85, Math.min(0.85, x)), gain, note }); };
  // ---- the postal worker's regulator: an exhalation every ~3.9 s whenever we are under water near the office
  for (let k = 0; k < 14; k++) { const f = Math.round((k * 3.9 - 2) * 30); if (f < 0 || f >= N) continue; const L = top(f); if (!UNDER.has(L) || L === "I1" || L === "C3" || L === "E2") continue;
    add(f, "regulator", -0.2, L === "F" || L === "H" ? 0.9 : 0.6, "the postal worker breathes out: a train of bubbles rises from the regulator"); }
  // ---- A: push-in, handover, the double-take, up through the surface
  for (const f of [8, 30, 52, 74, 92]) add(f, "fin_kick", -0.5 + f / 300, 0.55, "the snorkeller's fins push her towards the counter");
  add(40, "bubbles_small", -0.4, 0.5, "a few bubbles escape the snorkeller's mask"); add(15, "fin_kick", 0.6, 0.35, "fusiliers flick past the lens");
  add(110, "double_take", 0.2, 0.8, "the hero's double-take ('yes')"); add(126, "card_uw", -0.1, 0.9, "the waterproof card is held out at the counter");
  add(140, "card_uw", 0.0, 0.8, "the worker takes it"); add(164, "brow_pluck", 0.25, 0.8, "eyes pop: card -> office -> card"); add(196, "bubbles_small", 0.3, 0.6, "the hero's startled bubbles");
  add(274, "surface_break", 0, 1.0, "the camera rises out of the water"); add(292, "flag_flutter", 0.2, 0.6, "the yellow 'open' flag on its float"); add(300, "bird", -0.5, 0.6, "tropical birds on the island");
  // ---- A2: the strange idea
  add(326, "bird", 0.6, 0.5, "birds in the palms"); add(333, "brow_pluck", -0.2, 0.8, "one eyebrow climbs ('strange')"); add(345, "idea_pop", -0.2, 0.9, "the idea lands");
  add(350, "double_take", 0.3, 0.7, "the postmaster's side-eye"); add(372, "bird", -0.4, 0.4, "birds");
  // ---- B: what if tourists... (fins on the sand, wade, dive, under)
  for (let f = 428, k = 0; f < 452; f += 7, k++) add(f, "fin_flap", -0.1 + (k % 2) * 0.2, 0.75, `fins slap the wet sand (${k % 2 ? "right" : "left"})`);
  add(419, "double_take", 0, 0.7, "he spots the marker float out at sea"); add(436, "wade", 0, 0.8, "wading into the shallows"); add(447, "wade", 0.1, 0.7, "wading deeper");
  add(457, "splash_entry", 0.1, 1.0, "he flops forward into the water"); add(463, "dip_under", 0, 0.9, "the camera follows him under");
  for (const f of [470, 482, 494]) add(f, "fin_kick", 0.1, 0.7, "he kicks out towards the spot");
  // ---- C: building it
  add(490, "rope_creak", 0.3, 0.6, "builders take the weight of the roof"); add(496, "hammer_hit", 0.5, 0.6, "a builder hammers a bracket"); add(504, "hammer_hit", 0.5, 0.55, "hammer"); add(517, "roof_set", 0, 0.9, "the roof drops onto the tank");
  add(510, "outboard_idle", 0.2, 0.8, "the work barge idling off the beach"); add(524, "winch", 0.4, 0.8, "the A-frame winch pays out"); add(534, "rope_creak", 0.4, 0.7, "ropes creak");
  add(544, "tank_descend", 0, 0.9, "the tank sinks on its ropes"); add(560, "bubbles_small", -0.3, 0.8, "air spills from under the roof"); add(576, "tank_settle", 0, 1.0, "it settles into the sand (puff)");
  // ---- D: paper and ink
  add(600, "pen_scratch_uw", 0.1, 0.8, "he tries to write with a ballpoint"); add(626, "paper_soak", -0.1, 0.8, "the paper starts to soak"); add(670, "brow_pluck", 0.1, 0.6, "suspicious squint");
  add(688, "double_take", 0.1, 0.7, "the ink runs ('ink')"); add(720, "paper_soak", -0.1, 0.6, "corners sag"); add(744, "bubbles_small", 0.2, 0.7, "embarrassed bubbles");
  // ---- E: waterproof postcards
  add(768, "card_flick", -0.2, 0.9, "the seller fans out the waterproof cards"); add(782, "card_flick", -0.1, 0.7, "glossy cards"); add(778, "bird", 0.6, 0.4, "birds behind the kiosk");
  add(798, "card_slide", 0.1, 0.9, "one card slides across the counter"); add(826, "brow_pluck", 0.2, 0.7, "brows shoot up"); add(832, "dip_under", 0, 0.7, "light-wash into the water");
  add(848, "card_uw", 0.1, 0.9, "the card, crisp under water"); add(860, "bubbles_small", 0.2, 0.6, "bubbles");
  // ---- F: the embosser
  add(904, "box_slide_uw", -0.4, 0.9, "the dry box with the ink stamp is pushed aside"); add(948, "card_uw", 0.2, 0.9, "the card is slid between the dies");
  add(1000, "emboss_press", 0.1, 1.0, "lever down: the die presses the seal into the card"); add(1030, "emboss_release", 0.1, 0.9, "lever released"); add(1040, "card_uw", 0.2, 0.8, "the embossed card is drawn out");
  // ---- G: visitors swim down and hand over
  for (const [f, x] of [[1046, -0.6], [1060, 0.6], [1072, -0.5], [1084, 0.5], [1094, -0.3], [1106, 0.4], [1120, -0.2]] as [number, number][]) add(f, "fin_kick", x, 0.55, "visitors kicking down to the office");
  add(1068, "bubbles_small", -0.5, 0.6, "snorkellers' bubbles"); add(1096, "bubbles_small", 0.5, 0.5, "bubbles"); add(1120, "card_uw", -0.1, 0.9, "a visitor hands over her card"); add(1129, "card_uw", 0.0, 0.8, "the worker takes it");
  // ---- H: handled under water
  add(1190, "card_uw", 0.0, 0.8, "card onto the die"); add(1214, "emboss_press", 0.0, 0.9, "embossed ('handles')"); add(1236, "emboss_release", 0.0, 0.8, "lever back"); add(1226, "double_take", 0.4, 0.6, "the hero, fascinated");
  add(1250, "bag_rustle_uw", -0.3, 0.9, "into the sealed mail bag");
  // ---- I: to the ordinary postal system
  for (const f of [1266, 1280, 1294]) add(f, "fin_kick", 0, 0.7, "the worker swims the bag up");
  add(1300, "surface_emerge", 0.1, 0.9, "he surfaces at the jetty steps"); add(1320, "bag_rustle", 0.1, 0.9, "the bag is handed up"); add(1310, "bird", -0.5, 0.4, "birds");
  add(1346, "stamp_ink", 0, 0.9, "the Port Vila clerk date-stamps the card (above water)"); add(1370, "drop_in_bag", 0.3, 0.9, "into the outward mail bag");
  // ---- J: floating, proud; back down to the start
  add(1386, "bird", 0.5, 0.4, "birds"); add(1400, "flag_flutter", -0.2, 0.5, "the flag above the office"); add(1428, "dip_under", 0, 0.8, "the camera sinks under");
  add(1462, "bubbles_small", 0.2, 0.5, "bubbles"); add(1500, "fin_kick", 0.6, 0.35, "fusiliers turn past the lens");
  return ev.sort((a, b) => a.frame - b.frame);
};
