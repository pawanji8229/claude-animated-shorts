#!/usr/bin/env node
// Download the curated Mixkit sounds (full-quality WAV) into asset-library/cache/mixkit/<id>/, verified (RIFF/WAVE
// header, size > 1 kB) with sha256 recorded.   node fetch-sounds.mjs
import fs from "node:fs"; import path from "node:path";
import { direct, ROOT } from "./fetch.mjs";
import { MIXKIT } from "./sound-selection.mjs";
let ok = 0, fail = 0;
for (const [id, cat, tags, era, use] of MIXKIT) {
  try { const m = await direct("mixkit", String(id), `https://assets.mixkit.co/active_storage/sfx/${id}/${id}.wav`, "Mixkit Sound Effects Free License (https://mixkit.co/license/#sfxFree)");
    const f = path.join(ROOT, "mixkit", String(id), m.entry), head = Buffer.alloc(12); const fd = fs.openSync(f, "r"); fs.readSync(fd, head, 0, 12, 0); fs.closeSync(fd);
    if (head.toString("ascii", 0, 4) !== "RIFF" || head.toString("ascii", 8, 12) !== "WAVE") throw new Error("not a WAV file");
    Object.assign(m, { category: cat, tags, era, use, page: `https://mixkit.co/free-sound-effects/` }); fs.writeFileSync(path.join(ROOT, "mixkit", String(id), "manifest.json"), JSON.stringify(m, null, 1)); ok++; }
  catch (e) { fail++; console.log(`FAIL ${id}: ${e.message}`); }
}
console.log(`${ok} ok, ${fail} failed`);
// Kenney CC0 audio packs: the site's own free download path ("continue without donating" -> signed link), zip-tested + extracted.
import { execFileSync } from "node:child_process";
for (const pack of ["impact-sounds", "rpg-audio"]) { const d = path.join(ROOT, "kenney", pack), z = path.join(d, `kenney_${pack}.zip`); fs.mkdirSync(d, { recursive: true });
  if (!fs.existsSync(z)) { const id = Buffer.from(`assets/${pack}`).toString("hex"), j = JSON.parse(execFileSync("curl", ["-sSf", "-A", "Mozilla/5.0", "-H", `Referer: https://kenney.nl/assets/${pack}`, `https://kenney.nl/download-link/${id}`]).toString());
    execFileSync("curl", ["-sSfL", "-A", "Mozilla/5.0", "-o", z, j.url]); }
  execFileSync("unzip", ["-tq", z]); execFileSync("unzip", ["-qo", z, "-d", path.join(d, "files")]); console.log(`kenney ${pack}: ok (CC0)`); }
