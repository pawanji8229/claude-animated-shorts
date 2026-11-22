// Boeing scene module for the audio pipeline: FPS, FILM_FRAMES, soundEvents(). Every cue is derived from the same
// timeline the picture uses: footsteps from every walker's on-screen travel (one per 0.35 m, surface by place, level
// by distance to the camera, pan by screen side), rivet-gun bursts from the riveters nearest the camera, hammer blows
// on the downstroke of each hammerer's arm cycle, the construction stages of every house (boards picked, canvas
// stretched), the paint roller, the derrick winch + the bundle landing, the truck braking, the hangar door rolling,
// the model pieces set on the office table, and soft whooshes on the big camera moves. Beds follow the place via
// ambienceTimeline in productions/boeing/production.json.
import * as T from "./timeline";
import type { V3 } from "../../lib/math";

export const FPS = T.FPS, FILM_FRAMES = T.FILM_FRAMES;
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string; rel?: number };
const N = FILM_FRAMES;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
/** screen side (-1 left .. 1 right) + distance of a world point for a camera */
const view = (c: { pos: V3; look: V3; fov: number }, p: V3) => { const fw = sub(c.look, c.pos), fl = len(fw), f: V3 = [fw[0] / fl, fw[1] / fl, fw[2] / fl];
  const rt: V3 = [-f[2], 0, f[0]], rl = Math.hypot(rt[0], rt[2]) || 1, d = sub(p, c.pos), z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
  const x = (d[0] * rt[0] + d[2] * rt[2]) / rl; const half = Math.tan((c.fov * Math.PI) / 360) * (9 / 16);
  return { side: z > 0 ? x / (z * half) : 0, dist: len(d), front: z > 0 }; };

export const soundEvents = (): SoundEvent[] => {
  const ev: SoundEvent[] = [];
  const add = (frame: number, kind: string, x: number, gain: number, note: string) => { const f = ((Math.round(frame) % N) + N) % N; ev.push({ frame: f, kind, x: Math.max(-0.85, Math.min(0.85, x)), gain: Math.max(0.05, Math.min(1, gain)), note }); };
  const span = (L: T.Layer) => T.LAYERS.find((l) => l[0] === L)!;

  // ---- footsteps: every walker of every layer, while that layer is the visible one
  const surface: Partial<Record<T.Layer, string>> = { A: "concrete", C: "concrete", D: "concrete", F: "gravel", G: "gravel", J2: "concrete" };
  for (const L of Object.keys(surface) as T.Layer[]) { const [, a, , , d] = span(L); const acc: Record<number, { prev: V3; dist: number; n: number }> = {};
    for (let f = a; f < Math.min(d, N); f++) { const o = T.layerAt(L, f), op = T.layerOpacity(span(L), f);
      o.actors.forEach((p, i) => { const s = acc[i] ?? (acc[i] = { prev: p.pos, dist: 0, n: 0 }); const step = Math.hypot(p.pos[0] - s.prev[0], p.pos[2] - s.prev[2]); s.prev = p.pos;
        if (step < 0.004 || step > 1) return; s.dist += step; if (s.dist < 0.35) return; s.dist -= 0.35; s.n++;
        const v = view(o.c, p.pos); if (!v.front || op < 0.35 || v.dist > 45) return;
        add(f, `step_${surface[L]}_${s.n % 2 ? "r" : "l"}`, v.side * 0.8, op * Math.min(1, 7 / Math.max(3, v.dist)), `${L}: walker ${i} footstep (${surface[L]})`); }); } }

  // ---- A: over the rooftop town, over the edge -> scale reveal
  add(96, "soft_whoosh", 0.1, 0.55, "camera glides over the roof edge (scale reveal)");
  // ---- B: rise to the high aerial
  add(214, "soft_whoosh", -0.2, 0.6, "camera climbs to the high aerial");
  // ---- C: street — the truck arrives, the hangar door rolls open
  add(378, "truck42", 0.3, 0.9, "a 1940s truck rolls along Marginal Way and brakes at the plant");
  add(T.DOOR_OPEN[0], "hangar_door", -0.1, 0.8, "a steel door leaf rolls open on its track"); add(T.DOOR_OPEN[0] + 40, "hangar_door", 0.25, 0.55, "the next leaf follows");
  // ---- D + J2: rivet guns of the riveters nearest the camera, irregular bursts per person
  for (const L of ["D", "J2"] as T.Layer[]) { const [, a, , , d] = span(L);
    for (let f = a; f < Math.min(d, N); f++) { const op = T.layerOpacity(span(L), f); if (op < 0.4) continue; const o = T.layerAt(L, f);
      T.RIVETERS.forEach((r, i) => { const period = 34 + (i * 7) % 23; if ((f + i * 13) % period !== 0) return; const v = view(o.c, r.at); if (!v.front || v.dist > 55) return;
        add(f, "rivet_burst", v.side * 0.8, op * Math.min(1, 9 / Math.max(4, v.dist)) * (L === "J2" ? 0.7 : 1), `${L}: riveter ${i} drives a rivet`); }); } }
  add(470, "tool_clink", -0.3, 0.6, "a bucking bar set down on the scaffold"); add(500, "tool_clink", 0.4, 0.5, "a wrench on the wing jig");
  // ---- E: the office
  add(536, "paper_slide", 0.0, 0.7, "plans slid across the model table");
  add(764, "model_tick", 0.15, 1.0, "the hero sets a tiny tree beside the model plant"); add(797, "model_tick", -0.1, 0.9, "a second tiny tree");
  add(766, "brow_pluck", -0.3, 0.55, "the officer's disbelief"); add(816, "idea_ding", 0.25, 0.35, "the hero gets the idea");
  add(868, "double_take", -0.3, 0.45, "the officer's double-take"); add(872, "model_tick", 0.05, 1.0, "the tiny house goes on the model roof");
  // ---- F: building the neighbourhood on the roof
  for (const l of Object.keys(T.BUILD_START).map(Number)) { const b = T.BUILD_START[l], o0 = T.layerAt("F", b + 20);
    const lot = o0.build!.find((x) => x.lot === l)!; void lot;
    add(b + 4, "board_pick", 0, 0.55, `lot ${l}: first boards lifted off the pile`); add(b + 30, "saw_stroke", 0, 0.45, `lot ${l}: a board sawn`);
    add(b + 40, "canvas_flap", 0, 0.6, `lot ${l}: canvas walls stretched up`); add(b + 78, "canvas_flap", 0, 0.5, `lot ${l}: roof canvas pulled over`); }
  { const [, a, , , d] = span("F");
    for (let f = a; f < d; f++) { const op = T.layerOpacity(span("F"), f); if (op < 0.4) continue; const o = T.layerAt("F", f);
      T.HAMMER.forEach((h, i) => { const ph = f * h.rate + h.ph, prev = (f - 1) * h.rate + h.ph; if (Math.floor((ph - Math.PI / 2) / (2 * Math.PI)) === Math.floor((prev - Math.PI / 2) / (2 * Math.PI))) return;
        const p = o.actors[i].pos, v = view(o.c, p); if (v.front) add(f, "hammer_wood", v.side * 0.8, op * Math.min(1, 10 / Math.max(4, v.dist)), `F: hammerer ${i} drives a nail`); }); }
    for (let f = T.STRIPE.f0 + 4; f < T.STRIPE.f1; f += 40) { const o = T.layerAt("F", f), v = view(o.c, [T.stripeX(f), 16.5, 0]); add(f, "paint_roll", v.side * 0.8, 0.8, "the roller lays the road stripe"); } }
  add(902, "winch_ratchet", 0.4, 0.6, "the derrick's hand winch hoists a lumber bundle up from the street"); add(1032, "bundle_land", 0.4, 0.6, "the bundle is swung in and set down");
  // ---- G: behind the façades
  add(1150, "brow_pluck", 0.0, 0.45, "the hero's side-eye at the hollow backs");
  // ---- H: up into the sky
  add(1262, "soft_whoosh", 0.2, 0.6, "camera sweeps up into the sky");
  // ---- J: the two worlds — the roof dissolves away
  add(1432, "reveal_shimmer", 0, 0.8, "the roof turns transparent: the real factory below");
  add(1512, "soft_whoosh", -0.1, 0.45, "the camera rises back over the rooftop town (loop)");
  return withRecordings(ev).sort((a, b) => a.frame - b.frame);
};

// ---------------------------------------------------------------- v2: recorded layers (Mixkit free licence + Kenney CC0, prepared
// into productions/boeing2/audio/samples, never committed). Every recorded cue sits on a visible cause from the same timeline.
// rel = peak level in dB under the narration peak (the mixer still ducks + guards every word).
const pick = <T,>(a: T[], i: number) => a[((i % a.length) + a.length) % a.length];
function withRecordings(ev: SoundEvent[]): SoundEvent[] {
  const out: SoundEvent[] = []; let i = 0;
  const rec = (frame: number, file: string, rel: number, x: number, note: string) => out.push({ frame: Math.max(0, Math.min(N - 1, Math.round(frame))), kind: `rec:${file}`, x, gain: 1, rel, note });
  for (const e of ev) { i++;
    if (e.kind.startsWith("step_concrete")) { rec(e.frame, pick(["k_footstep_concrete_000.wav", "k_footstep_concrete_001.wav", "k_footstep_concrete_002.wav", "k_footstep_concrete_003.wav", "k_footstep_concrete_004.wav"], i), -27 + 20 * Math.log10(Math.max(0.1, e.gain)), e.x, `${e.note} (recorded)`); continue; }
    if (e.kind.startsWith("step_gravel")) { rec(e.frame, pick(["k_footstep00.wav", "k_footstep01.wav", "k_footstep02.wav", "k_footstep03.wav", "k_footstep04.wav", "k_footstep05.wav"], i), -28 + 20 * Math.log10(Math.max(0.1, e.gain)), e.x, `${e.note} (recorded)`); continue; }
    if (e.kind === "soft_whoosh") { rec(e.frame - 12, pick(["mk1489.wav", "mk1486.wav@0+2.2", "mk1474.wav"], i), -31, e.x, `${e.note} (recorded air move)`); continue; }
    out.push(e);
    if (e.kind === "hammer_wood") rec(e.frame, "mk830.wav", -29 + 20 * Math.log10(Math.max(0.1, e.gain)), e.x, "hammer on wood (recorded layer)");
    if (e.kind === "saw_stroke") rec(e.frame, "mk827.wav", -30, e.x, "hand saw (recorded layer)");
    if (e.kind === "board_pick" || e.kind === "bundle_land") rec(e.frame, pick(["k_impactPlank_medium_000.wav", "k_impactPlank_medium_001.wav", "k_impactPlank_medium_002.wav"], i), e.kind === "bundle_land" ? -26 : -30, e.x, "planks (recorded layer)");
    if (e.kind === "canvas_flap") rec(e.frame, pick(["k_cloth1.wav", "k_cloth2.wav", "k_cloth3.wav"], i), -31, e.x, "canvas handled (recorded layer)");
    if (e.kind === "rivet_burst" && i % 2 === 0) rec(e.frame + 2, "mk798.wav", -32 + 20 * Math.log10(Math.max(0.1, e.gain)), e.x, "metalwork texture (recorded layer)");
    if (e.kind === "tool_clink") rec(e.frame, "mk831.wav@0+1.6", -31, e.x, "tools handled (recorded layer)");
    if (e.kind === "hangar_door") rec(e.frame, "mk200.wav", -28, e.x, "steel door leaf on its track (recorded layer)");
    if (e.kind === "truck42") rec(e.frame - 70, "mk1621.wav", -31, 0.3, "truck rolling along Marginal Way (recorded layer)");
    if (e.kind === "model_tick") rec(e.frame, "k_impactMetal_light_000.wav", -33, e.x, "tiny model set down (recorded layer)");
    if (e.kind === "paper_slide") rec(e.frame, "mk2379.wav", -32, e.x, "plans on the table (recorded)"); }
  // scene beds (recorded), placed where the picture is: roof birds + breeze, aerial wind, street, factory hum, construction, office clock
  rec(0, "mk17.wav@0+5.8", -33, 0.2, "A: sparrows over the rooftop town"); rec(10, "mk2427.wav@0+5.5", -33, -0.2, "A: breeze in the decoy trees");
  rec(176, "mk1267.wav@0+3.2", -31, 0, "B: high-altitude wind"); rec(250, "mk371.wav@4+5.6", -31, 0, "C: 1940s suburban street ambience + birds");
  rec(412, "mk2504.wav@2+3.4", -31, 0, "D: factory machine hum"); rec(512, "mk1060.wav@0+12.6", -35, -0.3, "E: office wall clock ticking");
  rec(892, "mk797.wav@10+7.0", -31, 0, "F: rooftop timber-and-canvas construction ambience"); rec(1100, "mk2472.wav@20+4.6", -33, 0.2, "G: morning birds on the roof");
  rec(1240, "mk1267.wav@8+4.6", -31, 0, "H: wind high above the plant"); rec(1420, "mk2504.wav@12+2.7", -31, 0, "J: the real factory humming below");
  return out;
}
