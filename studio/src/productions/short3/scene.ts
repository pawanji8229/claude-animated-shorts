// short3 scene module for the audio pipeline: FPS, FILM_FRAMES, PERSONAS (window crowd, for the crowd gate) and
// soundEvents() DERIVED from the same animation functions the picture uses (no sound without a visible cause).
import { FPS, FILM_FRAMES, T, BW, bldAt } from "./world";
import { WIN_PEOPLE, winPose, opAt, OPS_X, bossAt, rigBuild } from "./timeline";
import { XF } from "./Film";

export { FPS, FILM_FRAMES };
export const PERSONAS = WIN_PEOPLE.map((w) => w.persona);
export const crowdPose = winPose;
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };

const intVisible = (f: number) => f < XF.intExt[0] + 8 || (f >= XF.extInt[0] + 8 && f < XF.intExt2[0] + 8) || f >= XF.loop[0] + 10;
/** footstep frames from a walker's travelled distance (two contacts per 0.72 m gait cycle) */
const steps = (dist: (f: number) => number, f0: number, f1: number): number[] => { const out: number[] = []; for (let f = f0 + 1; f <= f1; f++) { const a = Math.floor(dist(f - 1) / 0.36), b = Math.floor(dist(f) / 0.36); if (b > a) out.push(f); } return out; };

export const soundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  const add = (frame: number, kind: string, x: number, gain: number, note: string) => { if (frame >= 0 && frame < FILM_FRAMES) ev.push({ frame, kind, x, gain, note }); };
  // ---- INT: every operator's own call cycle (ring -> plug -> talk -> unplug), only while the switchboard is on screen
  for (let f = 0; f < FILM_FRAMES; f++) { if (!intVisible(f)) continue;
    OPS_X.forEach((x, i) => { const o = opAt(i, f), prev = opAt(i, f - 1), pan = Math.max(-0.8, Math.min(0.8, x / 5));
      if (o.ring && !prev.ring) add(f, "phone_ring", pan, i === 0 ? 0.7 : 0.45, `operator ${i} line lamp + ringer`);
      if (o.plug && !prev.plug) add(f, "plug_click", pan, 0.8, `operator ${i} plugs the answering cord`);
      if (o.unplugF && !prev.unplugF) add(f, "plug_click", pan, 0.55, `operator ${i} pulls the cord`);
      if (o.plug && !prev.plug) add(f + 3, "key_click", pan, 0.6, `operator ${i} throws the talk key`); }); }
  // ---- hook EXT (flash-forward): rollers groan, jacks pulled stroke by stroke, the clerk keeps working
  add(118, "building_groan", 0.1, 0.8, "11,000 tons creeping on rollers"); add(150, "roller_creak", -0.1, 0.9, "rollers under load"); add(205, "roller_creak", 0.2, 0.7, "rollers under load");
  for (let k = 0; k < 6; k++) for (let f = 116 + ((26 - (k * 7) % 26) % 26); f < 236; f += 26) if (k % 2 === 0) add(f, "jack_pull", (k - 2.5) / 4, 0.6, `jack ${k} bar stroke`);
  add(214, "typewriter", 0.0, 0.5, "the clerk inside types on, unaware");
  // ---- 1930: Brightwater walks in on stone, unrolls the blueprint, the problem, the cringe
  steps((f) => Math.abs(bossAt(f)[0] - bossAt(T.exec0)[0]), T.exec0, T.blue0 - 6).forEach((f, i) => add(f, "step_stone", -0.1, i % 2 ? 0.8 : 0.9, "Brightwater's shoes on the paving"));
  add(285, "streetcar_bell", 0.7, 0.8, "distant streetcar bell (1930 street)"); add(420, "streetcar_bell", -0.6, 0.6, "streetcar bell further off");
  add(T.blue0 + 2, "paper_unroll", 0.0, 0.9, "blueprint unrolls"); add(T.problem - 2, "paper_rustle", 0.0, 0.7, "blueprint lowered");
  add(T.cringe0, "freeze_sting", 0.0, 0.8, "comic freeze"); add(T.cringe0 + 12, "gulp", 0.0, 0.7, "nervous gulp");
  add(T.craneUp0 + 4, "whoosh_reveal", 0.0, 0.6, "camera rises over the block"); add(T.footprint0 + 14, "rope_creak", 0.3, 0.8, "the footprint rope tightens");
  // ---- wrecking crane rolls in, is waved off, backs away
  add(T.wreck0 + 2, "crawler_crane", 0.6, 1.0, "crawler crane rolls in"); add(T.wreckWave - 2, "chain_rattle", 0.4, 0.5, "the ball's chain sways"); add(T.wreckWave + 10, "brake_squeak", 0.3, 0.6, "crane stops");
  add(T.wreckBack, "crawler_crane", 0.7, 0.8, "crane backs away");
  // ---- engineer: plans + idea
  add(T.point0 + 4, "paper_unroll", 0.3, 0.8, "plans unrolled on the trestle"); add(T.idea, "idea_ding", 0.0, 0.6, "the idea lands");
  // ---- windows: hundreds still inside (quiet office life)
  add(800, "typewriter", -0.5, 0.55, "typing behind a window"); add(822, "phone_ring", 0.3, 0.35, "a phone rings inside"); add(846, "typewriter", 0.5, 0.5, "typing behind a window");
  // ---- support: each timber crib placed, beams, rollers, jacks (from the rig build schedule)
  let last = 0; for (let f = T.support0; f < T.creep0; f++) { const n = Math.floor(rigBuild(f) * 12 + 0.001); if (n > last) { add(f, "timber_thud", ((n - 6) / 6) * 0.7, 0.8, `crib ${n} set down`); last = n; } }
  for (const [th, kind, note] of [[0.35, "steel_clank", "steel I-beams slid under"], [0.55, "steel_clank", "rollers set"], [0.8, "jack_pull", "jacks braced"]] as const) {
    for (let f = T.support0; f < T.creep0; f++) if (rigBuild(f) >= th && rigBuild(f - 1) < th) add(f, kind, 0.2, 0.8, note); }
  // ---- the creep (real time) + aerial (time compressed)
  add(T.creep0, "building_groan", 0.0, 1.0, "the whole building starts to move"); for (let f = T.creep0 + 10; f < T.aerial0; f += 40) add(f, "roller_creak", -0.2 + ((f / 40) % 2) * 0.4, 0.8, "rollers turn");
  for (let k = 0; k < 6; k++) for (let f = T.jacks0 + 14 + ((26 - (k * 7) % 26) % 26); f < T.aerial0; f += 26) if ((k + Math.floor(f / 26)) % 2 === 0) add(f, "jack_pull", (k - 2.5) / 4, 0.55, `worker ${k} pushes his jack bar`);
  add(T.aerial0 + 6, "building_groan", 0.0, 0.7, "moving 16 m back"); add(T.slide1End + 2, "roller_creak", 0.0, 0.6, "turning on the pivot"); add(T.rotEnd + 2, "roller_creak", 0.0, 0.6, "moving 30 m sideways");
  // ---- finished: steel of the new HQ, staff cross the gangway, the door
  [1346, 1378, 1404, 1430].forEach((f, i) => add(f, "steel_clank", -0.4 + i * 0.25, 0.6, "new HQ column set"));
  const gangBase = bldAt(1400).p; void gangBase; void BW;
  [1452, 1470, 1484, 1497].forEach((t0, i) => { for (let k = 6; k < 70; k += 9) add(t0 + k + i, k > 38 ? "plank_step" : "step_stone", 0.2, 0.55, `staff member ${i} walks to the door`); });
  add(1505, "office_door", 0.2, 0.7, "the entrance door opens and closes");
  return ev.sort((a, b) => a.frame - b.frame);
};
