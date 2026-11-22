#!/usr/bin/env node
// TwistFrame optional tool (audio management): turn a production's cue sheet (productions/<id>/audio/cue_sheet.csv,
// written by the mixer) into a howler.js (MIT) sprite map over the rendered stems, so individual cues can be
// auditioned / reviewed in a browser page without re-running the mix. REVIEW ONLY: the production mix stays the offline,
// frame-accurate python mixer (audio/mix_events.py); howler plays on the wall clock and is never used for the render.
// Tone.js (MIT, also installed here) is reserved for browser-side music sketching with Tone.Offline (deterministic
// offline rendering to a buffer); its output would be exported to WAV and fed to the mixer as a bed, never played live.
//   node audio-sprite.mjs cue_sheet.csv out.json [--stem sfx]
import fs from "node:fs";
export const parseCsv = (text) => { const rows = []; for (const line of text.trim().split(/\r?\n/)) { const out = []; let cur = "", q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); rows.push(out); } return rows; };
/** {sprite: {name: [startMs, durationMs]}} for howler: `new Howl({ src: ["sfx.wav"], sprite })` */
export const spriteFromCues = (csv, stem = "sfx") => { const [head, ...rows] = parseCsv(csv), ix = (k) => head.indexOf(k), sprite = {}, seen = {};
  for (const r of rows) { if (r[ix("stem")] !== stem) continue; const base = `${r[ix("generator")]}_f${r[ix("trigger_frame")]}`, n = (seen[base] = (seen[base] ?? 0) + 1), name = n > 1 ? `${base}_${n}` : base;
    const s = Math.max(0, Number(r[ix("start_s")])), e = Number(r[ix("end_s")]); if (Number.isFinite(s) && e > s) sprite[name] = [Math.round(s * 1000), Math.round((e - s) * 1000)]; }
  return { sprite }; };
if (import.meta.url === `file://${process.argv[1]}`) {
  const [inp, out] = process.argv.slice(2), i = process.argv.indexOf("--stem"), stem = i > 0 ? process.argv[i + 1] : "sfx";
  if (!inp || !out) { console.error("usage: audio-sprite.mjs cue_sheet.csv out.json [--stem sfx]"); process.exit(2); }
  const res = spriteFromCues(fs.readFileSync(inp, "utf8"), stem); fs.writeFileSync(out, JSON.stringify(res, null, 1)); console.log(`${Object.keys(res.sprite).length} ${stem} cues -> ${out}`);
}
