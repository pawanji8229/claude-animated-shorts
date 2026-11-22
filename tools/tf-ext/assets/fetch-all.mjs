#!/usr/bin/env node
// Download (or re-verify) the whole curated library into asset-library/cache. Safe to re-run: verified files are kept.
//   node fetch-all.mjs [--only polyhaven|ambientcg|kenney|mixkit] [--max-mb 2500]
import fs from "node:fs"; import path from "node:path";
import { polyhaven, direct, ROOT } from "./fetch.mjs";
import { SELECTION } from "./selection.mjs";
const only = (() => { const i = process.argv.indexOf("--only"); return i > 0 ? process.argv[i + 1] : null; })();
const log = []; let ok = 0, fail = 0;
for (const a of SELECTION.filter((x) => !only || x.source === only)) {
  try { const m = a.source === "polyhaven" ? await polyhaven(a.kind, a.id, a.res) : await direct(a.source, a.id, a.url, a.source === "ambientcg" ? "CC0-1.0" : a.licence);
    ok++; const mb = m.files.reduce((s, f) => s + f.bytes, 0) / 1e6; log.push([a.source, a.id, "ok", mb.toFixed(1)]); console.log(`ok   ${a.source}/${a.id} ${mb.toFixed(1)} MB`); }
  catch (e) { fail++; log.push([a.source, a.id, "FAIL", String(e.message).slice(0, 120)]); console.log(`FAIL ${a.source}/${a.id}: ${e.message}`); }
}
fs.writeFileSync(path.join(ROOT, `fetch-log-${only ?? "all"}.json`), JSON.stringify(log, null, 1));
console.log(`\n${ok} ok, ${fail} failed`);
