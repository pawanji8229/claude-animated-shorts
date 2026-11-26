#!/usr/bin/env node
// Automatic, owner-authorised publishing to the TwistFrame Model Vault (OFF until both conditions hold):
//   (1) the site owner has installed ONE of the two owner-controlled publishing methods (see vault/server/README.md), and
//   (2) asset-library/vault-registry.json has  autoPublish.enabled = true  (the one-time authorisation, recorded there).
//
// Method A  "endpoint": POST /api/publisher/models on the site, authorised with an owner publishing token.
//           The token is NEVER in this code, the repo, logs or ZIPs: it is stored once through the cloud environment's
//           secure credential form for the vault host, and the egress proxy injects the Authorization header. This
//           client sends only a placeholder value, which the proxy replaces.
// Method B  "feed": no secret at all. The model, preview and a signed-by-hash manifest are committed to the dedicated
//           branch `vault-feed` of the owner's GitHub repository (only the owner + authorised sessions can push); the
//           site pulls https://raw.githubusercontent.com/<repo>/vault-feed/vault-feed/feed.json and ingests new entries
//           after checking every sha256.
//
// Every publish: eligibility (original or redistributable, licence whitelist), prepare() checks (GLB integrity, sizes,
// static quality, duplicates), idempotency key = GLB sha256 (re-running never creates a second copy), retries with
// backoff on temporary failures (network, 429, 5xx), an append-only log (asset-library/publish-log.jsonl) and a
// public verification (listed in /api/models AND the public download's sha256 matches).
//   node autopublish.mjs status | node autopublish.mjs run <slug> [--method endpoint|feed] [--dry-run]
import fs from "node:fs"; import path from "node:path"; import { execFile } from "node:child_process"; import { promisify } from "node:util"; import { fileURLToPath } from "node:url";
import { prepare, verify, loadRegistry } from "./publish.mjs"; import { VAULT, curl } from "./client.mjs";
const run = promisify(execFile), HERE = path.dirname(fileURLToPath(import.meta.url)), LIB = path.resolve(HERE, "../../../asset-library"), REPO = path.resolve(HERE, "../../.."), LOG = path.join(LIB, "publish-log.jsonl");
export const DEFAULTS = { author: "TwistFrame Lab", licence: "CC BY 4.0", feedBranch: "vault-feed", feedRepo: "pawanji8229/claude-animated-shorts" };
const log = (event) => fs.appendFileSync(LOG, JSON.stringify({ t: new Date().toISOString(), ...event }) + "\n");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** what the site supports right now (read-only probes; never uploads) */
export async function detect() {
  const out = { endpoint: "absent", feed: "unknown", autoPublish: loadRegistry().autoPublish ?? { enabled: false } };
  try { const { stdout } = await run("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "30", `${VAULT}/api/publisher/status`]); out.endpoint = stdout === "404" ? "absent" : stdout === "401" || stdout === "403" ? "installed (needs token)" : stdout === "200" ? "installed + authorised" : `unexpected ${stdout}`; } catch { out.endpoint = "unreachable"; }
  try { const st = JSON.parse(await curl(`${VAULT}/api/publisher/feed-status`)); out.feed = st.repo ? `installed: pulls ${st.repo}@${st.branch}` : "absent"; } catch { out.feed = "absent"; }
  return out;
}
async function withRetry(what, fn, tries = 5) { let last; for (let i = 0; i < tries; i++) { try { return await fn(); } catch (e) { last = e; const temp = /429|50\d|timed? ?out|reset|ECONN|EAI_AGAIN|Could not resolve/i.test(String(e.message)); log({ what, attempt: i + 1, error: String(e.message).slice(0, 200), retry: temp && i < tries - 1 }); if (!temp) break; await sleep(2000 * 2 ** i); } } throw last; }
/** Method A: multipart POST with the proxy-injected owner token; Idempotency-Key = sha256 */
async function publishEndpoint(e, bundle) {
  return withRetry("endpoint-upload", async () => {
    const { stdout } = await run("curl", ["-sS", "-m", "300", "-w", "\n%{http_code}", "-H", "Authorization: Bearer injected-by-egress-proxy", "-H", `Idempotency-Key: ${e.sha256}`,
      "-F", `name=${e.title}`, "-F", `author=${DEFAULTS.author}`, "-F", `description=${e.description}`, "-F", `license=${e.licence}`, "-F", `sha256=${e.sha256}`,
      "-F", `model=@${path.join(bundle, "model.glb")};type=model/gltf-binary`, "-F", `preview=@${path.join(bundle, path.basename(e.files.preview))};type=image/jpeg`, `${VAULT}/api/publisher/models`], { maxBuffer: 1 << 24 });
    const code = +stdout.trim().split("\n").pop(), body = stdout.trim().split("\n").slice(0, -1).join("\n");
    if (code === 200 || code === 201 || code === 409) return { code, body: JSON.parse(body || "{}") };   // 409 = already published (idempotent)
    throw new Error(`HTTP ${code}: ${body.slice(0, 160)}`);
  });
}
/** Method B: commit model + preview + manifest to the vault-feed branch (git worktree, never touches other branches) */
async function publishFeed(e, bundle) {
  const wt = path.join(LIB, "cache", "vault-feed-worktree"), g = (...a) => run("git", ["-C", REPO, ...a]);
  if (!fs.existsSync(wt)) { const exists = await g("ls-remote", "--heads", "origin", DEFAULTS.feedBranch).then((r) => r.stdout.trim().length > 0);
    if (exists) { await g("fetch", "origin", DEFAULTS.feedBranch); await g("worktree", "add", wt, `origin/${DEFAULTS.feedBranch}`); await run("git", ["-C", wt, "checkout", "-B", DEFAULTS.feedBranch]); }
    else { await g("worktree", "add", "--detach", wt); await run("git", ["-C", wt, "checkout", "--orphan", DEFAULTS.feedBranch]); await run("git", ["-C", wt, "rm", "-rqf", "."]); } }
  const dir = path.join(wt, "vault-feed", e.slug), feedF = path.join(wt, "vault-feed", "feed.json"); fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(bundle, "model.glb"), path.join(dir, "model.glb")); fs.copyFileSync(path.join(bundle, path.basename(e.files.preview)), path.join(dir, "preview.jpg"));
  const feed = fs.existsSync(feedF) ? JSON.parse(fs.readFileSync(feedF, "utf8")) : { format: "twistframe-vault-feed/1", models: [] };
  if (!feed.models.some((m) => m.sha256 === e.sha256)) feed.models.push({ slug: e.slug, name: e.title, author: DEFAULTS.author, description: e.description, license: e.licence, sha256: e.sha256,
    bytes: fs.statSync(path.join(dir, "model.glb")).size, model: `vault-feed/${e.slug}/model.glb`, preview: `vault-feed/${e.slug}/preview.jpg`, added: new Date().toISOString() });
  fs.writeFileSync(feedF, JSON.stringify(feed, null, 1));
  await run("git", ["-C", wt, "add", "vault-feed"]); const st = (await run("git", ["-C", wt, "status", "--porcelain"])).stdout.trim();
  if (st) await run("git", ["-C", wt, "commit", "-q", "-m", `Vault feed: ${e.title}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`]);
  await withRetry("feed-push", () => run("git", ["-C", wt, "push", "-q", "origin", `HEAD:${DEFAULTS.feedBranch}`]));
  return { code: 200, body: { feed: `https://raw.githubusercontent.com/${DEFAULTS.feedRepo}/${DEFAULTS.feedBranch}/vault-feed/feed.json` } };
}
export async function publishOne(slug, { method, dryRun = false } = {}) {
  const reg = loadRegistry(), auth = reg.autoPublish ?? { enabled: false };
  const e = await prepare(slug); if (e.status === "blocked") { log({ slug, result: "blocked", checks: e.checks }); return { slug, result: "blocked", checks: e.checks }; }
  if (e.status === "published") return { slug, result: "already-published", id: e.publishedId };
  if (!e.original && !e.redistributionAllowed) return { slug, result: "ineligible", reason: "not original and redistribution not confirmed" };
  const how = method ?? auth.method ?? "endpoint";
  if (dryRun || !auth.enabled) { log({ slug, result: "dry-run", method: how, authorised: !!auth.enabled }); return { slug, result: auth.enabled ? "dry-run" : "not-authorised", method: how, wouldPublish: { title: e.title, author: DEFAULTS.author, licence: e.licence, sha256: e.sha256 } }; }
  const r = how === "feed" ? await publishFeed(e, path.join(LIB, e.bundle)) : await publishEndpoint(e, path.join(LIB, e.bundle)); log({ slug, result: "submitted", method: how, code: r.code });
  // verification: poll the PUBLIC catalogue until the entry appears and its public download matches (feed imports may take a few minutes)
  let v; for (let i = 0; i < 10; i++) { v = await verify(slug); if (v.published) break; await sleep(Math.min(60000, 5000 * 2 ** i)); }
  log({ slug, result: v.published ? "verified" : "unverified", ...v }); return { slug, result: v.published ? "published+verified" : "submitted-not-yet-visible", ...v };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const av = process.argv.slice(2), m = av.indexOf("--method");
  const r = av[0] === "status" ? await detect() : await publishOne(av[1], { method: m > 0 ? av[m + 1] : undefined, dryRun: av.includes("--dry-run") }); console.log(JSON.stringify(r, null, 1)); }
