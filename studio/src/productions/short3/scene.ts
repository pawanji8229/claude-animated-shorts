// short3 scene module for the audio pipeline: FPS, FILM_FRAMES, PERSONAS (window crowd, for the crowd gate) and
// soundEvents() DERIVED from the same animation functions the picture uses (no sound without a visible cause).
import { FPS, FILM_FRAMES, T, bldAt, XF } from "./world";
import { WIN_PEOPLE, winPose, opAt, OPS_X, bossAt, rigBuild, craneAt, mabelAt } from "./timeline";
import { carsAt, streetcarAt, truckAt, pedsAt } from "./life";

export { FPS, FILM_FRAMES };
export const PERSONAS = WIN_PEOPLE.map((w) => w.persona);
export const crowdPose = winPose;
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };

const intVisible = (f: number) => f < XF.intExt[0] + 8 || (f >= XF.extInt[0] + 8 && f < XF.intExt2[0] + 8) || f >= XF.loop[0] + 10;
const extVisible = (f: number) => !intVisible(f);
const clampPan = (x: number) => Math.max(-0.85, Math.min(0.85, x));

export const soundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  const add = (frame: number, kind: string, x: number, gain: number, note: string) => { if (frame >= 0 && frame < FILM_FRAMES) ev.push({ frame, kind, x: clampPan(x), gain, note }); };
  // ---- INT: every operator's own call cycle, Mabel's desk telephone, Finch's typewriter
  for (let f = 0; f < FILM_FRAMES; f++) { if (!intVisible(f)) continue; const tw = f;
    OPS_X.forEach((x, i) => { const o = opAt(i, tw), prev = opAt(i, tw - 1);
      if (o.ring && !prev.ring) add(f, "phone_ring", x * 0.5 - 0.3, 0.32, `operator ${i}: line lamp + buzzer`);
      if (o.plug && !prev.plug) add(f, "plug_click", x * 0.5 - 0.3, 0.7, `operator ${i} plugs the cord into the jack`);
      if (o.unplugF && !prev.unplugF) add(f, "plug_click", x * 0.5 - 0.3, 0.5, `operator ${i} pulls the cord`);
      if (o.plug && !prev.plug) add(f + 4, "key_click", x * 0.5 - 0.3, 0.5, `operator ${i} throws the talk key`); });
    if (f % 26 === 7 && (f < 120 || (f > 1213 && f < 1290) || f > 1530)) add(f, "typewriter", 0.45, 0.45, "Mr Finch types");
  }
  for (const f of [1238, 1250]) add(f, "phone_ring", 0.15, 1.0, "Mabel's desk telephone rings (handset rattles)");
  for (let f = 1240; f < 1340; f++) { const a = mabelAt(f), b = mabelAt(f - 1); if (a.lift > 0 && b.lift === 0) add(f + 2, "plug_click", 0.1, 0.9, "she lifts the handset off the cradle"); }
  add(54, "coffee_clink", 0.1, 0.4, "cup trembles on the saucer (the building creeps)");
  // ---- hook EXT (flash-forward): rollers groan, jacks pulled stroke by stroke
  add(118, "building_groan", 0.1, 0.8, "the building creeping on rollers"); add(148, "roller_creak", -0.1, 0.9, "rollers under load"); add(205, "roller_creak", 0.2, 0.6, "rollers under load");
  for (let k = 0; k < 6; k++) for (let f = 116 + ((26 - (k * 7) % 26) % 26); f < 176; f += 26) if (k % 2 === 0) add(f, "jack_pull", (k - 2.5) / 4, 0.6, `jack ${k} bar stroke`);
  add(214, "typewriter", 0.0, 0.4, "the clerk inside works on, unaware");
  // ---- 1930: doors, Brightwater's steps (stone stairs then paving), blueprint, freeze, gulp
  add(264, "office_door", -0.1, 0.8, "the bronze doors swing open"); add(286, "office_door", -0.1, 0.4, "a door bumps a squeezed clerk");
  let last = 0; for (let f = 263; f < 340; f++) { const a = bossAt(f), b = bossAt(f - 1); last += Math.hypot(a[0] - b[0], a[2] - b[2]) + Math.abs(a[1] - b[1]) * 0.6; if (last > 0.36) { add(f, "step_stone", (a[0] - 4) / 6, 0.8, "Brightwater's shoes on the stone steps / paving"); last = 0; } }
  add(T.blue0 + 2, "paper_unroll", 0.0, 0.9, "blueprint unrolls"); add(T.problem - 2, "paper_rustle", 0.0, 0.7, "blueprint lowered");
  add(T.cringe0, "freeze_sting", 0.0, 0.8, "comic freeze"); add(T.cringe0 + 14, "gulp", 0.0, 0.7, "nervous gulp");
  add(T.craneUp0 + 4, "whoosh_reveal", 0.0, 0.5, "camera rises over the block");
  for (const [t0, x] of [[520, -0.3], [532, 0.4]] as [number, number][]) for (let f = t0 + 16; f < 640; f += 22) add(f, "hammer_hit", x, 0.55, "sledgehammer drives a footprint stake");
  add(T.footprint0 + 40, "rope_creak", 0.3, 0.6, "the footprint rope pulled tight");
  // ---- wrecking crane: crawls in, stops, ball sways, waved off, backs away
  add(560, "crawler_crane", 0.6, 0.8, "crawler crane engine + tracks (approaching)"); add(T.wreckWave - 8, "brake_squeak", 0.5, 0.6, "crane stops");
  for (const f of [T.wreckWave + 2, T.wreckWave + 22]) add(f, "chain_rattle", 0.45, 0.5, "the ball's chain swings");
  last = 0; for (let f = 612; f < 650; f++) { const a = bossAt(f), b = bossAt(f - 1); last += Math.hypot(a[0] - b[0], a[2] - b[2]); if (last > 0.5) { add(f, "step_stone", 0.2, 0.7, "Brightwater runs out"); last = 0; } }
  add(T.wreckBack + 6, "crawler_crane", 0.7, 0.7, "crane backs away");
  // ---- engineer: plans + idea
  add(T.point0 + 4, "paper_unroll", 0.3, 0.8, "plans unrolled on the trestle"); add(T.idea, "idea_ding", 0.0, 0.55, "the idea lands");
  // ---- windows: hundreds still inside
  add(800, "typewriter", -0.5, 0.45, "typing behind a window"); add(822, "phone_ring", 0.3, 0.3, "a phone rings inside"); add(846, "typewriter", 0.5, 0.4, "typing behind a window");
  // ---- support: the truck arrives, timbers set down crib by crib, steel, rollers, jacks
  add(842, "truck_pass", -0.6, 0.7, "the timber truck pulls up"); add(882, "brake_squeak", -0.5, 0.5, "truck stops at the kerb");
  last = 0; for (let f = T.support0; f < T.creep0; f++) { const n = Math.floor(rigBuild(f) * 12 + 0.001); if (n > last) { add(f, "timber_thud", ((n - 6) / 6) * 0.7, 0.8, `crib ${n} set down`); last = n; } }
  for (const [th, kind, note] of [[0.35, "steel_clank", "steel I-beams slid under"], [0.55, "steel_clank", "rollers set"], [0.8, "ratchet", "jacks braced"]] as const)
    for (let f = T.support0; f < T.creep0; f++) if (rigBuild(f) >= th && rigBuild(f - 1) < th) add(f, kind, 0.2, 0.8, note);
  // ---- the creep (real time) + aerial (time compressed)
  add(T.creep0, "building_groan", 0.0, 1.0, "the whole building starts to move"); for (let f = T.creep0 + 10; f < T.aerial0; f += 40) add(f, "roller_creak", -0.2 + ((f / 40) % 2) * 0.4, 0.8, "rollers turn");
  for (let k = 0; k < 6; k++) for (let f = T.jacks0 + 14 + ((26 - (k * 7) % 26) % 26); f < T.aerial0; f += 26) if ((k + Math.floor(f / 26)) % 2 === 0) add(f, "jack_pull", (k - 2.5) / 4, 0.55, `worker ${k} pushes his jack bar`);
  add(T.aerial0 + 6, "building_groan", 0.0, 0.7, "moving back"); add(T.slide1End + 2, "roller_creak", 0.0, 0.6, "turning on the pivot"); add(T.rotEnd + 2, "roller_creak", 0.0, 0.6, "moving sideways");
  // ---- finished: steel of the new HQ, staff walk to the door
  [1346, 1378, 1404, 1430].forEach((f, i) => add(f, "steel_clank", -0.4 + i * 0.25, 0.55, "new HQ steel set"));
  [1450, 1462, 1474, 1488].forEach((t0, i) => { for (let k = 8; k < 80; k += 9) add(t0 + k + i, k > 56 ? "plank_step" : "step_stone", -0.1, 0.5, `staff member ${i} walks to the door`); });
  add(1508, "office_door", -0.2, 0.6, "the entrance door opens and closes");
  // ---- traffic, streetcar, pedestrians (only when the street is on screen; each pass at its closest point to centre)
  for (let f = 1; f < FILM_FRAMES; f++) { if (!extVisible(f)) continue;
    const a = carsAt(f), b = carsAt(f - 1); a.forEach((c, i) => { const p = b[i]; if (p && Math.sign(c.p[0] - 4) !== Math.sign(p.p[0] - 4)) add(f, "truck_pass", c.p[0] > p.p[0] ? 0.4 : -0.4, 0.28, "1930 sedan passes"); });
    const s = streetcarAt(f), sp = streetcarAt(f - 1); if (s && sp && Math.sign(s.p[0] - 4) !== Math.sign(sp.p[0] - 4)) add(f, "truck_pass", 0, 0.4, "streetcar rumbles past");
    void pedsAt; void truckAt; void craneAt; void bldAt; }
  add(285, "streetcar_bell", 0.6, 0.8, "streetcar bell (1930 street)"); add(430, "streetcar_bell", -0.5, 0.55, "streetcar bell further off");
  return ev.sort((a, b) => a.frame - b.frame);
};
