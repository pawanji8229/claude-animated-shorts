// Duplicate detection before publishing: (1) name similarity against every vault catalogue entry + community upload
// (token Jaccard, ignoring stop words), (2) exact file match (sha256) against community uploads, (3) geometry
// fingerprint (triangle count + sorted bounds) against already-registered models. Returns findings; publishing stops on any
// exact/near duplicate.
import crypto from "node:crypto"; import fs from "node:fs";
import { loadIndex, loadCommunity, curl } from "./client.mjs";
const STOP = new Set(["the", "and", "with", "for", "model", "detailed", "asset", "pbr", "glb", "high", "detail", "a", "of", "3d"]);
const toks = (s) => new Set(String(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)));
export const jaccard = (a, b) => { const A = toks(a), B = toks(b); const i = [...A].filter((x) => B.has(x)).length; return i / Math.max(1, A.size + B.size - i); };
export async function findDuplicates({ title, glbPath, fingerprint }, registry = []) {
  const out = [], idx = await loadIndex(), com = await loadCommunity(), sha = crypto.createHash("sha256").update(fs.readFileSync(glbPath)).digest("hex");
  for (const e of idx) { const j = jaccard(title, e.name); if (j >= 0.6) out.push({ kind: "name", where: "vault catalogue", id: e.id, name: e.name, similarity: +j.toFixed(2) }); }
  for (const c of com) { const j = jaccard(title, c.name); if (j >= 0.5) out.push({ kind: "name", where: "community", id: c.id, name: c.name, similarity: +j.toFixed(2) });
    if (c.bytes === fs.statSync(glbPath).size) { try { const b = await curl(c.download, { maxBytes: 20 * 1048576 }); if (crypto.createHash("sha256").update(b).digest("hex") === sha) out.push({ kind: "exact-file", where: "community", id: c.id, name: c.name }); } catch {} } }
  for (const r of registry) if (r.sha256 === sha) out.push({ kind: "exact-file", where: "registry", name: r.title }); else if (fingerprint && r.fingerprint && r.fingerprint.tris === fingerprint.tris && r.fingerprint.size.every((v, i) => Math.abs(v - fingerprint.size[i]) < 0.01)) out.push({ kind: "geometry", where: "registry", name: r.title });
  return { sha256: sha, duplicates: out, blocking: out.some((d) => d.kind !== "name" || d.similarity >= 0.75) };
}
