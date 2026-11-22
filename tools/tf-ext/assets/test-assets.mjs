// Non-rendering tests for the asset library (no frames, previews or video): catalog integrity, licence rules,
// re-verification of every cached file's sha256, search, automatic scale correction, LOD preparation and cue matching.
//   node assets/test-assets.mjs [boeing events.json]
import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import os from "node:os";
import { loadCatalog, search } from "./search.mjs"; import { prepare, autoScale } from "./prepare.mjs"; import { matchKind } from "./match-sounds.mjs"; import { ROOT } from "./fetch.mjs";
const LIB = path.resolve(ROOT, ".."), A = loadCatalog(); let n = 0; const ok = (m) => { n++; console.log("ok ", m); };
// 1. every catalog entry has a licence + source URL; only allowed licences; redistribution flags right
const ALLOWED = ["CC0-1.0", "Mixkit Sound Effects Free License", "CC Attribution", "CC Attribution-ShareAlike", "CC0 Public Domain"];
for (const a of A) { assert.ok(a.licence && a.sourceUrl, a.id); assert.ok(ALLOWED.includes(a.licence), `${a.id} ${a.licence}`); if (a.source === "mixkit") assert.equal(a.redistributable, false); }
ok(`${A.length} catalog entries: licence + source on every entry, only CC0 / CC-BY(-SA) / Mixkit free licence`);
// 2. re-hash every downloaded file against its manifest (download integrity)
let files = 0; for (const src of ["polyhaven", "ambientcg", "mixkit"]) for (const id of fs.readdirSync(path.join(ROOT, src))) { const mf = path.join(ROOT, src, id, "manifest.json"); if (!fs.existsSync(mf)) continue;
  for (const f of JSON.parse(fs.readFileSync(mf, "utf8")).files) { const b = fs.readFileSync(path.join(ROOT, src, id, f.rel)); assert.equal(crypto.createHash("sha256").update(b).digest("hex"), f.sha256, f.rel); files++; } }
ok(`${files} downloaded files re-verified (sha256 matches the manifest written at download time)`);
// 3. every "ready" asset exists locally and passed inspection
for (const a of A.filter((x) => x.status === "ready")) { assert.ok(a.local && fs.existsSync(path.join(LIB, a.local)), a.id); assert.ok(a.quality?.ready, a.id); }
ok(`${A.filter((x) => x.status === "ready").length} ready assets present + inspected`);
// 4. search
const f40 = search(A, { type: "model", era: "1940s", setting: "factory" }); assert.ok(f40.length >= 20 && f40.every((a) => a.era === "any" || parseInt(a.era) <= 1940));
assert.ok(search(A, { type: "sound", category: "footsteps", tag: "concrete" }).length >= 5); assert.ok(!search(A, { type: "model", era: "1940s" }).some((a) => a.id === "polyhaven:mounted_fluorescent_lights"), "1950s fluorescent fittings must not appear for 1940s");
ok("search by type / era / setting / tag / text (era filter excludes anachronisms)");
// 5. scale correction + prepare (cached) + LOD
assert.equal(autoScale([10.974, 21.405, 5.021], [1.097, 0.502, 2.141]), 0.09999); assert.equal(autoScale([1, 2, 3], [1.02, 2.01, 2.98]), 1);
const out = fs.mkdtempSync(path.join(os.tmpdir(), "tfprep-")), u = await prepare("polyhaven:steel_frame_shelves_01", { out }); assert.ok(Math.abs(Math.max(...u.boundsM) - 2.141) < 0.01); assert.ok(fs.existsSync(path.join(out, u.file)));
const c = await prepare("polyhaven:old_drill_press", { out, lods: [0.3] }); assert.ok(c.lods[0].triangles < c.triangles * 0.4 && c.lods[0].triangles > 0); assert.ok(Math.abs(c.boundsM[1] - A.find((a) => a.id === "polyhaven:old_drill_press").quality.sizeM[1]) < 0.01);
fs.rmSync(out, { recursive: true, force: true }); ok(`prepare: 10x shelves auto-corrected to ${Math.max(...u.boundsM)} m; drill press LOD ${c.triangles} -> ${c.lods[0].triangles} tris, size kept`);
// 6. sound matching
assert.ok(matchKind("step_concrete_l", A)[0].tags.includes("concrete")); assert.ok(matchKind("hammer_wood", A).length > 0); assert.equal(matchKind("brow_pluck", A).length, 0);
const evf = process.argv[2]; if (evf && fs.existsSync(evf)) { const ev = JSON.parse(fs.readFileSync(evf, "utf8")).events, kinds = [...new Set(ev.map((e) => e.kind))]; const hit = kinds.filter((k) => matchKind(k, A).length).length; ok(`cue matching on a real production: ${hit}/${kinds.length} cue kinds have recorded candidates`); }
else ok("cue matching rules");
console.log(`\n${n} asset-library tests passed`);
