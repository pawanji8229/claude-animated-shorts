#!/usr/bin/env node
// Suggest library recordings for a production's animation cues. Reads productions/<id>/events.json (exported by the
// scene's soundEvents()) and maps each event kind to catalog sounds by keyword rules + tags. Output: a suggestion table
// (kind -> best candidates, licence) the mixer can later use as recorded layers next to the synthesised generators.
// It never edits the narration, the existing mix or any production file.   node match-sounds.mjs <events.json> [--json]
import fs from "node:fs"; import { fileURLToPath } from "node:url";
import { loadCatalog } from "./search.mjs";
export const RULES = [ // [regex on event kind, catalog filter: category + any-of tags]; first match wins
  [/model_tick|_place/, "impacts", ["wood"]],
  [/^step_concrete/, "footsteps", ["concrete", "tunnel", "pavement"]], [/^step_(wood|plank)/, "footsteps", ["wood"]], [/^step_grass/, "footsteps", ["grass"]], [/^step_gravel/, "footsteps", ["gravel", "stone", "dirt"]],
  [/^step_sand/, "footsteps", ["dirt", "gravel"]], [/hammer/, "tools", ["hammer"]], [/saw/, "tools", ["saw"]], [/rivet/, "factory", ["hammering", "hit"]], [/tool_clink|wrench/, "tools", ["metal", "wrench", "drop"]],
  [/hangar_door|sliding/, "factory", ["door", "sliding"]], [/door/, "doors", ["door"]], [/truck|lorry/, "vehicles", ["truck"]], [/car_|car$/, "vehicles", ["car"]], [/train|rail/, "vehicles", ["train"]],
  [/ship|boat/, "vehicles", ["ship", "boat", "motorboat"]], [/winch|ratchet|crane/, "construction", ["machinery", "assembly"]], [/bundle_land|board|plank|lumber/, "impacts", ["plank", "wood"]],
  [/canvas|cloth/, "foley", ["cloth"]], [/paper/, "office", ["paper", "papers"]], [/typewriter/, "office", ["typewriter"]], [/clock|tick/, "office", ["clock"]], [/phone/, "office", ["telephone"]],
  [/bird|gull/, "birds", []], [/wind/, "wind", []], [/rain/, "weather", ["rain"]], [/thunder/, "weather", ["thunder"]], [/wave|sea|water|splash/, "water", []],
  [/whoosh|swoosh|shimmer|transition/, "transitions", []], [/crowd|murmur/, "crowd", []],
];
export function matchKind(kind, assets) { for (const [re, cat, tags] of RULES) if (re.test(kind)) {
  const c = assets.filter((a) => a.type === "sound" && a.status === "ready" && a.category === cat && (!tags.length || tags.some((t) => (a.tags ?? []).includes(t))));
  return c.sort((p, q) => (p.source === "mixkit") - (q.source === "mixkit") || p.id.localeCompare(q.id)).slice(0, 6); } return []; }
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ev = JSON.parse(fs.readFileSync(process.argv[2], "utf8")).events, kinds = [...new Set(ev.map((e) => e.kind))].sort(), lib = loadCatalog(), out = {};
  for (const k of kinds) out[k] = { cues: ev.filter((e) => e.kind === k).length, candidates: matchKind(k, lib).map((a) => ({ id: a.id, use: a.use, licence: a.licence })) };
  if (process.argv.includes("--json")) console.log(JSON.stringify(out, null, 1)); else for (const [k, v] of Object.entries(out)) console.log(`${k.padEnd(18)} ${String(v.cues).padStart(4)} cues -> ${v.candidates.slice(0, 3).map((c) => c.id).join(", ") || "(keep synthesised generator)"}`);
}
