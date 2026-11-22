#!/usr/bin/env node
// Publishing integration for the TwistFrame Model Vault (OFF by default; nothing is ever uploaded without approval).
// The site exposes uploads ONLY through its signed-in browser form ("Publish a model" at the bottom of the page,
// POST /api/models with a ChatGPT sign-in session). There is no API key / token for scripts, and session cookies are
// never requested or stored. Supported flow:
//   1. prepare  -> validated bundle: model.glb, preview.jpg, FORM.txt (exact field values), registry entry status "prepared"
//   2. you (or a browser session you control and explicitly authorise) submit the form while signed in
//   3. verify   -> public check: the title appears in /api/models and the public download matches the bundle's sha256
//   node publish.mjs prepare <slug>  |  node publish.mjs verify <slug>  |  node publish.mjs status
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
import { metrics } from "./quality.mjs"; import { validate } from "./metadata.mjs"; import { findDuplicates } from "./duplicates.mjs"; import { loadCommunity, curl, checkGlb, VAULT } from "./client.mjs";
const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../asset-library"), REG = path.join(LIB, "vault-registry.json");
export const loadRegistry = () => (fs.existsSync(REG) ? JSON.parse(fs.readFileSync(REG, "utf8")) : { note: "Original models created for TwistFrame videos and their vault publication status.", models: [] });
const saveRegistry = (r) => fs.writeFileSync(REG, JSON.stringify(r, null, 1));
export async function prepare(slug) {
  const reg = loadRegistry(), e = reg.models.find((m) => m.slug === slug); if (!e) throw new Error(`no registry entry ${slug}`);
  const glb = path.resolve(LIB, e.files.glb), prev = path.resolve(LIB, e.files.preview), b = fs.readFileSync(glb), problems = [...validate(e)];
  const bad = checkGlb(b); if (bad) problems.push(`GLB: ${bad}`); if (b.length > 16 * 1048576) problems.push("GLB > 16 MiB"); if (fs.statSync(prev).size > 2 * 1048576) problems.push("preview > 2 MiB");
  const m = await metrics(glb); if (m.unsupported.length) problems.push(`unsupported extensions ${m.unsupported}`); if (m.uvMissing || m.noNormals) problems.push("missing UVs/normals");
  const dup = await findDuplicates({ title: e.title, glbPath: glb, fingerprint: { tris: m.triangles, size: [...m.sizeM].sort() } }, reg.models.filter((x) => x.slug !== slug)); if (dup.blocking) problems.push(`duplicate: ${JSON.stringify(dup.duplicates)}`);
  const dir = path.join(LIB, "publish", slug); fs.mkdirSync(dir, { recursive: true }); fs.copyFileSync(glb, path.join(dir, "model.glb")); fs.copyFileSync(prev, path.join(dir, path.basename(prev)));
  fs.writeFileSync(path.join(dir, "FORM.txt"), [`Upload at: ${VAULT}/  (scroll to the BOTTOM -> "Publish a model", sign in with ChatGPT)`, "", `Model title:           ${e.title}`, `Public creator name:   ${e.author}`, `Description:           ${e.description}`, `3D file:               model.glb (${(b.length / 1048576).toFixed(2)} MiB, sha256 ${dup.sha256})`, `Model preview:         ${path.basename(prev)}`, `License:               ${e.licence}`, `Rights checkbox:       tick only if you agree to publish it under this licence`, "", "After publishing run:  node tools/tf-ext/vault/publish.mjs verify " + slug].join("\n"));
  Object.assign(e, { sha256: dup.sha256, fingerprint: { tris: m.triangles, size: [...m.sizeM].sort() }, metrics: { triangles: m.triangles, meshes: m.meshes, materials: m.materials, maxTexture: m.maxTexture, sizeM: m.sizeM }, duplicateCheck: dup.duplicates, checks: problems, status: problems.length ? "blocked" : e.status === "published" ? "published" : "prepared", bundle: path.relative(LIB, dir) });
  saveRegistry(reg); return e;
}
export async function verify(slug) {
  const reg = loadRegistry(), e = reg.models.find((m) => m.slug === slug); const hit = (await loadCommunity()).find((c) => c.name === e.title);
  if (!hit) return { published: false, reason: "title not found in the public community list" };
  const b = await curl(hit.download, { maxBytes: 20 * 1048576 }), sha = crypto.createHash("sha256").update(b).digest("hex"), ok = sha === e.sha256;
  if (ok) { Object.assign(e, { status: "published", publishedId: hit.id, publishedUrl: `${VAULT}/#community`, download: hit.download, verified: new Date().toISOString() }); saveRegistry(reg); }
  return { published: ok, id: hit.id, sha256Match: ok, author: hit.author, licence: hit.license };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const [cmd, slug] = process.argv.slice(2);
  const r = cmd === "prepare" ? await prepare(slug) : cmd === "verify" ? await verify(slug) : loadRegistry().models.map((m) => ({ slug: m.slug, title: m.title, status: m.status }));
  console.log(JSON.stringify(r, null, 1)); }
