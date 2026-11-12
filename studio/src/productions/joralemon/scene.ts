// joralemon scene module for the audio pipeline: FPS, FILM_FRAMES and soundEvents() DERIVED from the same animation
// functions the picture uses (footsteps from walked distance, tool hits from the swing phase, vehicles at their pass,
// trains when they cross, machinery while it is on screen) - no sound without a visible cause.
import { FPS, FILM_FRAMES, XF, eraAt, facadeCut, groundCut } from "./world";
import { camAt, heroAt } from "./timeline";
import { PEDS, RUNS, CREW_PLAN, fanLift, cyclistAt } from "./life";

export { FPS, FILM_FRAMES };
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
const clampPan = (x: number) => Math.max(-0.85, Math.min(0.85, x));
const N = FILM_FRAMES;

export const soundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  const add = (frame: number, kind: string, x: number, gain: number, note: string) => { const f = ((Math.round(frame) % N) + N) % N; ev.push({ frame: f, kind, x: clampPan(x), gain, note }); };
  const outside = (f: number) => camAt(f).pos[1] > 0.2 && (camAt(f).pos[2] > 0 || facadeCut(f) < 14);
  const panOf = (f: number, wx: number) => { const c = camAt(f); return (wx - c.look[0]) / 6; };
  // ---- the hero's footsteps (bluestone flags): one per half gait cycle of walked distance
  { let acc = 0, prev = heroAt(0); for (let f = 1; f < N; f++) { const h = heroAt(f); if (h && prev && h.pose.walk > 0.3) { acc += Math.hypot(h.pos[0] - prev.pos[0], h.pos[2] - prev.pos[2]); if (acc > 0.475) { acc = 0; add(f, "step_stone", panOf(f, h.pos[0]), 0.75, "the hero's shoes on the bluestone sidewalk"); } } prev = h; } }
  // ---- pedestrians close to the camera (each on their own stride)
  for (const p of PEDS) { const half = p.stride / 2; let last = -1;
    for (let f = 0; f < N; f++) { if (eraAt(f) !== "now") continue; const t = (((f - p.t0) % N) + N) % N / 30, d = Math.abs(p.v) * t, x = p.x0 + Math.sign(p.v) * d, k = Math.floor(d / half);
      if (k !== last && last >= 0 && Math.abs(x - camAt(f).pos[0]) < 9 && Math.abs(p.z - camAt(f).pos[2]) < 9 && outside(f)) add(f, "step_stone", panOf(f, x), p.z > 10 ? 0.25 : 0.45, `pedestrian ${p.seed} footstep`);
      if (p.dog && k !== last && last >= 0 && k % 2 === 0 && Math.abs(x - camAt(f).pos[0]) < 9 && outside(f)) add(f + 3, "dog_paws", panOf(f, x + 0.9), 0.7, "the dog trots beside its walker");
      last = k; } }
  // ---- traffic, cyclist (today), leaves
  for (const c of RUNS) { const f = c.fc - 8; if (eraAt(((f % N) + N) % N) === "now" && outside(((f % N) + N) % N)) add(f, "car_pass", 0, 0.8, "a car passes along Joralemon Street"); }
  for (const fc of [60, 1372]) { const f = fc; const cy = cyclistAt(f); if (cy && outside(f)) add(f, "bike_tick", panOf(f, cy.pos[0]), 0.8, "the cyclist freewheels past"); }
  for (const f of [30, 210, 330, 1110, 1330, 1420]) add(f, "leaves", 0.3, 0.7, "a breeze moves the plane-tree leaves (visible sway)");
  // ---- story accents
  add(102, "mystery_accent", 0, 0.8, "\"look carefully\": a subtle mysterious accent (he looks left/right)");
  add(392, "whoosh_reveal", 0, 0.55, "reveal 1: the facade starts to dissolve"); for (const f of [404, 446]) add(f, "fan_hum", 0, 0.8, "ventilation fans behind the wall");
  for (const f of [XF.home[0], XF.works[0], XF.now[0]]) add(f + 6, "time_shimmer", 0, 0.7, "era dissolve");
  for (let f = 470; f < 586; f++) if (((f - 470) % 70) === 0) add(f, "paper_rustle", 0.2, 0.5, "the mother turns a page");
  // ---- 1907 works
  CREW_PLAN.forEach((c, i) => { for (let f = c.t0; f < c.t0 + 50; f += 9) if (outside(f)) add(f + i, "step_stone", 0, 0.3, `crewman ${i} walks in`);
    if (c.cart) add(c.t0 + 20, "crate_slide", 0, 0.45, `crewman ${i}'s hand cart rumbles in`);
    if (c.tool) for (let f = c.t0 + 50; f < 980; f++) { const ph = (f * c.rate) / 30 + i * 0.37, fr = ph - Math.floor(ph), pf = ((f - 1) * c.rate) / 30 + i * 0.37, pr = pf - Math.floor(pf);
      if (pr < 0.5 && fr >= 0.5 && outside(f)) add(f, c.tool === "hammer" ? "hammer_hit" : c.tool === "shovel" ? "shovel_dig" : "ratchet", (c.to[0] - camAt(f).look[0]) / 6, 0.45, `crewman ${i}: ${c.tool}`); } });
  for (const [f, k, n] of [[630, "shovel_dig", "tunnel gang digs at the shield"], [646, "hammer_hit", "ring bolts hammered"], [662, "shovel_dig", "tunnel gang"]] as [number, string, string][]) add(f, k, -0.2, 0.6, n);
  add(676, "train_old", -0.3, 0.9, "the first train runs through the finished tunnel");
  add(690, "truck_pass", -0.5, 0.6, "the lorry brings the fan"); add(712, "brake_squeak", -0.2, 0.5, "the lorry stops");
  add(718, "crane_winch", 0.4, 0.8, "the derrick winch lifts the fan"); add(722, "chain_rattle", 0.4, 0.6, "lifting chain");
  add(748, "stone_thud", 0.3, 0.8, "the fan is set down on its foundation"); for (const f of [752, 760, 768]) add(f, "ratchet", 0.3, 0.6, "bolting the fan housing");
  add(756, "fan_spinup", 0.3, 0.8, "the fan starts turning"); void fanLift;
  add(700, "paper_unroll", -0.3, 0.6, "the engineer spreads the plan"); add(770, "paper_rustle", -0.3, 0.5, "the engineer studies the plan");
  add(794, "whoosh_reveal", 0, 0.4, "the imagined plant grows (design preview)"); add(850, "gulp", -0.2, 0.7, "the engineer grimaces"); add(884, "cloth_soft", 0.4, 0.8, "the lady turns away");
  for (let f = 924; f < 950; f += 5) add(f, "pen_scratch", -0.2, 0.6, "he scribbles a big X");
  add(950, "reject_buzz", 0, 0.7, "the imagined plant folds away (rejected)"); add(966, "idea_ding", 0, 0.45, "he looks at the real house");
  // ---- conversion (1907)
  for (const f of [1004, 1015, 1028]) add(f, "timber_thud", -0.1, 0.6, "furniture carried out down the stoop");
  for (let f = 1020; f < 1060; f += 11) add(f, "hammer_hit", -0.2, 0.45, "stripping the rooms to the brick");
  add(1036, "crane_winch", 0, 0.7, "machinery lowered into the shell"); for (const f of [1044, 1054]) add(f, "steel_clank", 0, 0.7, "steel and fan housing set in place");
  // ---- reveal 2 (today): fans, airflow, the train under the street; the glimpse below the pedestrians
  add(1150, "whoosh_reveal", 0, 0.5, "reveal 2: the facade dissolves"); for (const f of [1170, 1205]) add(f, "fan_hum", 0, 0.9, "fans + air drawn up the shaft");
  add(1262, "train_rumble", -0.2, 1.0, "a train passes beneath No. 58"); add(1352, "fan_hum", 0, 0.45, "machinery glimpsed under the street"); add(1356, "train_rumble", 0.1, 0.35, "distant train under the sidewalk");
  void groundCut;
  return ev.sort((a, b) => a.frame - b.frame);
};
