#!/usr/bin/env node
// Automatic asset selection for MAKE VIDEO. Input: a scene shot list (JSON) of objects the narration needs:
//   [{ "need": "1940s aircraft hangar", "keywords": ["hangar","aircraft"], "category": "Infrastructure", "distance": "far",
//      "lengthM": [30,120], "era": "1940s", "avoid": ["modern","sci-fi"] }, ...]
// For each object: search the TwistFrame Model Vault FIRST (names + categories, synonym-expanded, not exact-name matching),
// then the local premium library (asset-library/catalog.json); download the top candidates (verified), evaluate each with
// quality.mjs for that camera distance and expected size, and pick the best. If nothing scores >= minScore the object is
// marked "create" (missing-model workflow) — a poor model is never chosen just because it exists.
//   node select.mjs shots.json [--top 4] [--min 55] [--out selection.json]
import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { loadIndex, download } from "./client.mjs";
import { metrics, score } from "./quality.mjs";
const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../asset-library");
const SYN = { truck: ["lorry", "van", "pickup"], car: ["sedan", "automobile", "coupe"], house: ["bungalow", "cottage", "home", "residential"], factory: ["works", "mill"], aircraft: ["airplane", "plane", "bomber", "airliner"],
  warehouse: ["storehouse", "godown", "depot"], crane: ["gantry", "hoist", "derrick"], lamp: ["light", "lantern"], tree: ["oak", "pine", "fir", "maple"], boat: ["ship", "tug", "barge"], train: ["locomotive", "railcar", "boxcar", "wagon"] };
const words = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
/** relevance of an index entry to a need: keyword + synonym hits in name (weighted) and category, minus avoided words */
export function relevance(entry, need) {
  const kw = [...new Set([...(need.keywords ?? words(need.need)), ...(need.keywords ?? []).flatMap((k) => SYN[k] ?? [])])], name = entry.name.toLowerCase(), cat = String(entry.category).toLowerCase();
  let r = 0, inName = 0; for (const k of kw) { if (new RegExp(`\\b${k}(s|es)?\\b`).test(name)) { r += 3; inName++; } else if (cat.includes(k)) r += 1; }
  if (!inName) return 0;   // a category match alone is not evidence the model is the right object
  const primary = (need.keywords ?? words(need.need))[0], forms = [primary, ...(SYN[primary] ?? [])];
  if (primary && !forms.some((k) => new RegExp(`\\b${k}(s|es)?\\b`).test(name))) return 0;   // the main noun must be in the name (a "hangar" request never gets a propeller)
  if (need.category && cat.includes(need.category.toLowerCase())) r += 1; for (const a of need.avoid ?? []) if (name.includes(a)) r -= 5; return r;
}
export async function selectFor(need, index, { top = 4, minScore = 55 } = {}) {
  const cands = index.filter((e) => e.files.length && /glb|gltf/i.test(e.format) && ["CC0 1.0", "CC BY 4.0", "CC BY-SA 4.0"].includes(e.licence)).map((e) => ({ e, rel: relevance(e, need) })).filter((x) => x.rel >= 3).sort((a, b) => b.rel - a.rel).slice(0, top);
  const evals = [];
  for (const { e, rel } of cands) { try { const d = await download(e), m = await metrics(path.join(d.dir, d.entry)), s = score(m, { distance: need.distance, expected: need.lengthM ? { lengthM: need.lengthM } : undefined });
    evals.push({ source: "vault", id: e.id, name: e.name, author: e.author, licence: e.licence, url: e.source, relevance: rel, file: path.relative(LIB, path.join(d.dir, d.entry)), score: s.score, tier: s.tier, reasons: s.reasons }); }
    catch (err) { evals.push({ source: "vault", id: e.id, name: e.name, error: String(err.message).slice(0, 160), score: 0 }); } }
  // local premium library (already verified): add matching ready models with their stored inspection
  const lib = fs.existsSync(path.join(LIB, "catalog.json")) ? JSON.parse(fs.readFileSync(path.join(LIB, "catalog.json"), "utf8")).assets : [];
  for (const a of lib.filter((a) => a.type === "model" && a.status === "ready")) { const rel = relevance({ name: `${a.name} ${a.use}`, category: a.category }, need); if (rel < 3) continue;
    const q = a.quality, m = { triangles: q.triangles, sizeM: q.sizeM, textures: q.textures, maxTexture: q.textureRes[1], materials: q.materials.length, pbr: { normal: q.materials.filter((x) => x.normal).length, orm: q.materials.filter((x) => x.orm).length }, uvMissing: 0, noNormals: 0, unsupported: [], animations: 0 };
    const s = score(m, { distance: need.distance, expected: need.lengthM ? { lengthM: need.lengthM } : undefined }); evals.push({ source: "library", id: a.id, name: a.name, licence: a.licence, url: a.sourceUrl, relevance: rel, file: a.local, score: s.score, tier: s.tier, reasons: s.reasons }); }
  evals.sort((a, b) => b.score - a.score || (b.relevance ?? 0) - (a.relevance ?? 0)); const best = evals.find((x) => x.score >= minScore) ?? null;
  return { need: need.need, distance: need.distance, decision: best ? "use" : "create", best, candidates: evals };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const av = process.argv.slice(2), v = (k, d) => { const i = av.indexOf(`--${k}`); return i > 0 ? av[i + 1] : d; };
  const shots = JSON.parse(fs.readFileSync(av[0], "utf8")), idx = await loadIndex(), out = [];
  for (const need of shots) { const r = await selectFor(need, idx, { top: +v("top", 4), minScore: +v("min", 55) }); out.push(r);
    console.log(`${r.decision.toUpperCase().padEnd(6)} ${need.need.padEnd(34)} -> ${r.best ? `${r.best.source}:${r.best.id} "${r.best.name}" score ${r.best.score} (${r.best.tier})` : "nothing good enough: create an original model"}`); }
  if (v("out")) fs.writeFileSync(v("out"), JSON.stringify(out, null, 1));
}
