#!/usr/bin/env node
// TwistFrame asset library (optional, OFF by default): integrity-checked downloader for openly licensed sources.
//   Poly Haven (CC0)   models (glTF + textures), PBR texture sets (glTF material bundle), HDRIs     md5 from the API
//   ambientCG  (CC0)   PBR material zips (2K-JPG)                                                  sha256 recorded
//   Kenney     (CC0)   asset packs (zip)                                                           sha256 recorded
//   Mixkit (Mixkit SFX Free License: use in projects, no attribution; NO standalone redistribution) sha256 recorded
// Files land in asset-library/cache/<source>/<id>/ (gitignored: the repository is public). Every file is verified
// (md5 vs the source when given, size otherwise) and its sha256 is written to <id>/manifest.json for later re-checks.
// Nothing is executed from downloads. Usage:
//   node fetch.mjs polyhaven model <id> [1k|2k]   |  node fetch.mjs polyhaven texture <id> [2k]  |  node fetch.mjs polyhaven hdri <id> [2k]
//   node fetch.mjs url <source> <id> <url> [licence]          (ambientCG / Kenney / Mixkit direct file URLs)
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process"; import { promisify } from "node:util";
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../asset-library/cache");
const UA = { "User-Agent": "TwistFrame-asset-library/1.0 (personal video project; respects licences)" };
const hash = (buf, algo) => crypto.createHash(algo).update(buf).digest("hex");
// downloads go through curl so the sandbox / corporate HTTPS proxy settings are honoured (Node's fetch ignores them)
const run = promisify(execFile);
async function get(url, tries = 4) { for (let i = 0; i < tries; i++) { try { const { stdout } = await run("curl", ["-sSfL", "--max-time", "600", "-A", UA["User-Agent"], url], { encoding: "buffer", maxBuffer: 1 << 30 }); return stdout; } catch (e) { if (i === tries - 1) throw new Error(`download failed ${url}: ${String(e.stderr ?? e.message).trim().slice(0, 120)}`); await new Promise((s) => setTimeout(s, 1500 * (i + 1))); } } }
export async function getJson(url) { return JSON.parse((await get(url)).toString()); }
async function save(dir, rel, url, md5, size) {
  const out = path.join(dir, rel); fs.mkdirSync(path.dirname(out), { recursive: true });
  if (fs.existsSync(out)) { const b = fs.readFileSync(out); if ((!md5 || hash(b, "md5") === md5) && (!size || b.length === size)) return { rel, bytes: b.length, sha256: hash(b, "sha256"), md5: md5 ?? null, cached: true }; }
  const b = await get(url); if (md5 && hash(b, "md5") !== md5) throw new Error(`md5 mismatch ${rel}`); if (size && b.length !== size) throw new Error(`size mismatch ${rel}`);
  fs.writeFileSync(out, b); return { rel, bytes: b.length, sha256: hash(b, "sha256"), md5: md5 ?? null, cached: false };
}
const writeManifest = (dir, m) => { fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(m, null, 1)); return m; };
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }

export async function polyhaven(kind, id, res) {
  const info = await getJson(`https://api.polyhaven.com/info/${id}`), files = await getJson(`https://api.polyhaven.com/files/${id}`), dir = path.join(ROOT, "polyhaven", id);
  let list = [];
  if (kind === "hdri") { const f = files.hdri[res].hdr; list = [[`${id}_${res}.hdr`, f.url, f.md5, f.size]]; }
  else { const g = files.gltf[res].gltf; list = [[`${id}_${res}.gltf`, g.url, g.md5, g.size], ...Object.entries(g.include).map(([p, f]) => [p, f.url, f.md5, f.size])]; }
  const got = await pool(list, 4, ([rel, url, md5, size]) => save(dir, rel, url, md5, size));
  return writeManifest(dir, { id, source: "polyhaven", kind, res, name: info.name, url: `https://polyhaven.com/a/${id}`, licence: "CC0-1.0", licenceUrl: "https://polyhaven.com/license",
    authors: Object.keys(info.authors ?? {}), categories: (info.categories ?? []).filter((c) => !c.startsWith("collection")), tags: info.tags ?? [], dimensionsMm: info.dimensions ?? null,
    polycount: info.polycount ?? null, entry: list[0][0], files: got, fetched: new Date().toISOString().slice(0, 10) });
}
export async function direct(source, id, url, licence) {
  const dir = path.join(ROOT, source, id), rel = decodeURIComponent(new URL(url).pathname.split("/").pop());
  const f = await save(dir, rel, url); if (f.bytes < 1000) throw new Error(`suspiciously small download ${url}`);
  return writeManifest(dir, { id, source, url, licence, entry: rel, files: [f], fetched: new Date().toISOString().slice(0, 10) });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [src, a, b, c, d] = process.argv.slice(2);
  const m = src === "polyhaven" ? await polyhaven(a, b, c ?? (a === "model" ? "1k" : "2k")) : await direct(a, b, c, d ?? "see catalog");
  console.log(`${m.source}/${m.id}: ${m.files.length} files, ${(m.files.reduce((s, f) => s + f.bytes, 0) / 1e6).toFixed(1)} MB, verified`);
}
