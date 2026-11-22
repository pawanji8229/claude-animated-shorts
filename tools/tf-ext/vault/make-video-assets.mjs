#!/usr/bin/env node
// MAKE VIDEO asset stage (optional; the approved MAKE VIDEO skill is not modified, this is called by Claude during
// production when you ask for vault-driven assets):
//   shots.json (objects from the story analysis) -> select (vault first, then library, scored per camera distance)
//   -> create missing originals (models/<generator>.js; a new generator is authored when none exists) -> preview + GLB
//   -> save to the reusable library (asset-library/originals + registry) -> prepare publication (metadata, checks,
//   duplicates) -> autopublish if authorised (else queued) -> report. Video quality first: the selected/created asset is
//   used in the scene regardless of publication; publication never lowers the model used in the film.
//   node make-video-assets.mjs shots.json --production <id> [--no-publish]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { loadIndex } from "./client.mjs"; import { selectFor } from "./select.mjs"; import { create } from "./create/runner.mjs"; import { metrics } from "./quality.mjs";
import { titleFor, describe } from "./metadata.mjs"; import { loadRegistry } from "./publish.mjs"; import { publishOne, DEFAULTS } from "./autopublish.mjs";
const HERE = path.dirname(fileURLToPath(import.meta.url)), LIB = path.resolve(HERE, "../../../asset-library");
export async function run(shots, { production, publish = true } = {}) {
  const idx = await loadIndex(), report = [];
  for (const need of shots) {
    const sel = await selectFor(need, idx); let entry = { need: need.need, decision: sel.decision, use: sel.best };
    if (sel.decision === "create") {
      const gen = need.generator && fs.existsSync(path.join(HERE, "create/models", `${need.generator}.js`)) ? need.generator : null;
      if (!gen) { report.push({ ...entry, status: "needs-new-generator", note: "Claude authors create/models/<name>.js for this object, then re-runs" }); continue; }
      const slug = need.slug ?? gen.replace(/_/g, "-"), out = path.join(LIB, "originals", slug), known = loadRegistry().models.find((x) => x.slug === slug);
      // reuse an existing original (regenerating would give a new file hash: GLTFExporter does not write images in a fixed order)
      const c = known && fs.existsSync(path.join(LIB, known.files.glb)) ? { glb: path.join(LIB, known.files.glb), preview: path.join(LIB, known.files.preview) } : await create(gen, out), m = await metrics(c.glb);
      const reg = loadRegistry(); let e = reg.models.find((x) => x.slug === slug);
      if (!e) { e = { slug, title: titleFor(need.title ?? { subject: need.need, kind: "3D Model" }), author: DEFAULTS.author, licence: need.licence ?? DEFAULTS.licence, original: true, created: new Date().toISOString().slice(0, 10), generator: `tools/tf-ext/vault/create/models/${gen}.js`,
        description: describe({ what: need.description ?? need.need, m, details: need.details, uses: need.uses }), files: { glb: path.relative(LIB, c.glb), preview: path.relative(LIB, c.preview) }, status: "new", production }; reg.models.push(e);
        fs.writeFileSync(path.join(LIB, "vault-registry.json"), JSON.stringify(reg, null, 1)); }
      entry = { ...entry, created: slug, file: path.relative(LIB, c.glb), quality: { triangles: m.triangles, maxTexture: m.maxTexture } };
      if (publish) entry.publication = await publishOne(slug);
    }
    report.push(entry);
  }
  if (production) fs.writeFileSync(path.join(LIB, `asset-report-${production}.json`), JSON.stringify(report, null, 1)); return report;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const av = process.argv.slice(2), p = av.indexOf("--production");
  const r = await run(JSON.parse(fs.readFileSync(av[0], "utf8")), { production: p > 0 ? av[p + 1] : undefined, publish: !av.includes("--no-publish") }); console.log(JSON.stringify(r, null, 1)); }
