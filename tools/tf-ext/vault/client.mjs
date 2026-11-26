// TwistFrame Model Vault client (optional, OFF by default). Read-only access to the public site
// https://twistframe-model-vault.pawanji8229.chatgpt.site/ :
//   index      /catalog.json (2,501 entries: id, name, category, format, preview, source) + /all-files.json (files, licence, author)
//   community  /api/models (public community uploads, paginated)
// Downloads go to the PUBLISHER's file URL listed in the index (the vault indexes; publishers host the files).
// Every download is checked: GLB magic + version + declared length, size limit, sha256 recorded. Nothing is executed.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { execFile } from "node:child_process"; import { promisify } from "node:util"; import { fileURLToPath } from "node:url";
export const VAULT = "https://twistframe-model-vault.pawanji8229.chatgpt.site";
export const CACHE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../asset-library/cache/vault");
const run = promisify(execFile);
// curl honours the sandbox / system HTTPS proxy (Node's fetch does not)
export async function curl(url, { maxBytes = 300 * 1048576, out } = {}) {
  const args = ["-sSfL", "--max-time", "900", "--max-filesize", String(maxBytes), "-A", "TwistFrame-MAKE-VIDEO/1.0 (+vault integration)", url];
  if (out) { await run("curl", [...args, "-o", out]); return fs.readFileSync(out); }
  const { stdout } = await run("curl", args, { encoding: "buffer", maxBuffer: maxBytes + 1 }); return stdout;
}
const fresh = (f, hours) => fs.existsSync(f) && Date.now() - fs.statSync(f).mtimeMs < hours * 3600e3;
/** merged vault index (cached 12 h): [{id, name, category, format, edition, author, licence, licenceUrl, source, image, files:[{path,url,bytes}]}] */
export async function loadIndex({ refresh = false } = {}) {
  fs.mkdirSync(CACHE, { recursive: true }); const f = path.join(CACHE, "index.json");
  if (!refresh && fresh(f, 12)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const cat = JSON.parse(await curl(`${VAULT}/catalog.json`)), all = JSON.parse(await curl(`${VAULT}/all-files.json`)), byId = new Map(all.models.map((m) => [m.id, m]));
  const idx = cat.models.map((c) => { const a = byId.get(c.id) ?? {}; return { id: c.id, name: c.name, category: c.category, format: c.format, edition: c.edition, author: a.author ?? null, licence: a.license ?? null, licenceUrl: a.license_url ?? null,
    credit: a.credit ?? null, source: c.source, image: c.image_url, files: (a.files ?? []).map((x) => ({ path: x.path, url: x.url, bytes: x.bytes ?? null })) }; });
  fs.writeFileSync(f, JSON.stringify(idx)); return idx;
}
/** public community uploads (all pages) */
export async function loadCommunity() { const out = []; let cursor = null;
  do { const j = JSON.parse(await curl(`${VAULT}/api/models${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`)); out.push(...j.models); cursor = j.cursor; } while (cursor); return out; }
/** check a buffer is a well-formed binary glTF 2.0 (magic, version, total length, JSON chunk) */
export function checkGlb(buf) { if (buf.length < 20) return "too small"; if (buf.readUInt32LE(0) !== 0x46546c67) return "not a GLB (magic)"; if (buf.readUInt32LE(4) !== 2) return "not glTF 2.0";
  if (buf.readUInt32LE(8) !== buf.length) return `length header ${buf.readUInt32LE(8)} != file ${buf.length}`; if (buf.readUInt32LE(16) !== 0x4e4f534a) return "first chunk is not JSON"; return null; }
/** download every file of a vault entry into the cache (verified); returns {dir, entry, files:[{path, bytes, sha256}]} */
export async function download(entry) {
  const dir = path.join(CACHE, "models", String(entry.id)); fs.mkdirSync(dir, { recursive: true }); const files = [];
  for (const f of entry.files) { const rel = path.normalize(f.path).replace(/^([/\\]|\.\.[/\\])+/, ""); if (rel.split(/[/\\]/).includes("..")) throw new Error(`unsafe path ${f.path}`);
    const out = path.join(dir, rel); fs.mkdirSync(path.dirname(out), { recursive: true }); const buf = await curl(f.url, { out });
    if (f.bytes && buf.length !== f.bytes) throw new Error(`${f.path}: size ${buf.length} != declared ${f.bytes}`);
    if (/\.glb$/i.test(f.path)) { const bad = checkGlb(buf); if (bad) throw new Error(`${f.path}: ${bad}`); }
    files.push({ path: rel, bytes: buf.length, sha256: crypto.createHash("sha256").update(buf).digest("hex") }); }
  const glb = files.find((f) => /\.(glb|gltf)$/i.test(f.path)); const man = { id: entry.id, name: entry.name, author: entry.author, licence: entry.licence, source: entry.source, files, entry: glb?.path ?? null, downloaded: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(man, null, 1)); return { dir, ...man };
}
