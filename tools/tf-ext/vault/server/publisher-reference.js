// REFERENCE IMPLEMENTATION for the site owner (TwistFrame Model Vault). Add ONE of these to the site's backend.
// Written against the standard Fetch API (Request/Response, crypto.subtle), so it maps onto Cloudflare-Workers-style
// handlers. `store` stands for the site's existing model storage, the same one the Creator studio form uses; adapt the
// four calls (findBySha256, saveModel, ownerAccountId, getState/setState) to it.
//
// Security properties (both methods):
//   * no public upload endpoint is added: method A needs an owner-only secret, method B adds no inbound upload at all
//   * the site stores only the SHA-256 HASH of the publishing token (method A); a leaked copy of the site code reveals nothing
//   * constant-time comparison; per-day rate limit; strict validation identical to (or stricter than) the browser form
//   * no CORS headers: browsers on other origins cannot call it; it is server-to-server only
//   * idempotent: the GLB sha256 is the key, so a retried request never creates a duplicate
//   * every publish is attributed to the OWNER account (so "Unpublish" in the site still works) with creator "TwistFrame Lab"

const LIMITS = { glb: 16 * 1048576, preview: 2 * 1048576, name: 80, description: 280, perDay: 30 };
const LICENCES = new Set(["CC0 1.0", "CC BY 4.0", "CC BY-SA 4.0"]);
const CREATOR = "TwistFrame Lab";
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const sha256 = async (data) => hex(await crypto.subtle.digest("SHA-256", data));
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
function timingSafeEqualHex(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
function checkGlb(u8) { const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); return u8.byteLength >= 20 && v.getUint32(0, true) === 0x46546c67 && v.getUint32(4, true) === 2 && v.getUint32(8, true) === u8.byteLength && v.getUint32(16, true) === 0x4e4f534a; }
const isJpeg = (u8) => u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff;
const isPng = (u8) => u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47;
async function validated({ name, author, description = "", license, glb, preview, claimedSha }) {
  if (!name || name.length > LIMITS.name) return "title missing or too long";
  if (author !== CREATOR) return `creator must be "${CREATOR}"`;
  if (description.length > LIMITS.description) return "description too long";
  if (!LICENCES.has(license)) return "licence not allowed";
  if (glb.byteLength > LIMITS.glb || !checkGlb(glb)) return "model must be a valid self-contained GLB 2.0 within 16 MiB";
  if (preview.byteLength > LIMITS.preview || !(isJpeg(preview) || isPng(preview))) return "preview must be JPG/PNG within 2 MiB";
  const s = await sha256(glb); if (claimedSha && claimedSha !== s) return "sha256 mismatch";
  return { sha256: s };
}
async function rateLimited(store) { const day = new Date().toISOString().slice(0, 10), st = (await store.getState("publisher-rate")) ?? {}; const n = (st[day] ?? 0) + 1; if (n > LIMITS.perDay) return true; await store.setState("publisher-rate", { [day]: n }); return false; }

// ===================================================================================== METHOD A: owner token endpoint
// Setup (owner, once): generate a long random token on your own computer, e.g. `openssl rand -hex 32`. Store ONLY its
// SHA-256 as the backend secret/config value PUBLISH_TOKEN_SHA256 (e.g. `printf %s "$TOKEN" | shasum -a 256`). Then give the
// token itself to Claude through the cloud environment's secure credential form for the vault host (never in chat/code).
export async function handlePublisherA(request, env, store) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/publisher/")) return null;
  const auth = request.headers.get("authorization") ?? "", token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const ok = token.length >= 32 && env.PUBLISH_TOKEN_SHA256 && timingSafeEqualHex(await sha256(new TextEncoder().encode(token)), env.PUBLISH_TOKEN_SHA256);
  if (!ok) return json(401, { error: "unauthorised" });
  if (url.pathname === "/api/publisher/status" && request.method === "GET") return json(200, { ok: true, creator: CREATOR });
  if (url.pathname === "/api/publisher/models" && request.method === "POST") {
    if (await rateLimited(store)) return json(429, { error: "daily publishing limit reached" });
    const f = await request.formData(), glbFile = f.get("model"), prevFile = f.get("preview");
    if (!(glbFile instanceof File) || !(prevFile instanceof File)) return json(400, { error: "model and preview files are required" });
    const glb = new Uint8Array(await glbFile.arrayBuffer()), preview = new Uint8Array(await prevFile.arrayBuffer());
    const v = await validated({ name: f.get("name"), author: f.get("author"), description: f.get("description") ?? "", license: f.get("license"), glb, preview, claimedSha: f.get("sha256") });
    if (typeof v === "string") return json(422, { error: v });
    const existing = await store.findBySha256(v.sha256); if (existing) return json(409, { id: existing.id, name: existing.name, duplicate: true });
    const saved = await store.saveModel({ ownerAccountId: await store.ownerAccountId(), name: f.get("name"), author: CREATOR, description: f.get("description") ?? "", license: f.get("license"), glb, preview, previewType: isPng(preview) ? "image/png" : "image/jpeg", sha256: v.sha256, via: "publisher-token" });
    return json(201, { id: saved.id, name: saved.name, download: saved.download });
  }
  return json(404, { error: "not found" });
}

// ===================================================================================== METHOD B: pull from the owner's GitHub feed (no secret)
// The site fetches ONE fixed URL (constant in code, not a parameter): new entries are imported after every file's sha256
// is checked. Only the repository owner (and sessions the owner authorises) can push to the feed branch.
const FEED = { repo: "pawanji8229/claude-animated-shorts", branch: "vault-feed", base: "https://raw.githubusercontent.com/pawanji8229/claude-animated-shorts/vault-feed/" };
export async function syncFeedB(store) {
  const res = await fetch(FEED.base + "vault-feed/feed.json", { cf: { cacheTtl: 60 } }); if (!res.ok) return { imported: 0, error: `feed ${res.status}` };
  const feed = await res.json(); if (feed.format !== "twistframe-vault-feed/1") return { imported: 0, error: "unknown feed format" };
  let imported = 0; const errors = [];
  for (const m of feed.models ?? []) {
    if (await store.findBySha256(m.sha256)) continue;
    if (!/^vault-feed\/[a-z0-9-]+\/model\.glb$/.test(m.model) || !/^vault-feed\/[a-z0-9-]+\/preview\.(jpg|png)$/.test(m.preview)) { errors.push(`${m.slug}: bad path`); continue; }
    const glb = new Uint8Array(await (await fetch(FEED.base + m.model)).arrayBuffer()), preview = new Uint8Array(await (await fetch(FEED.base + m.preview)).arrayBuffer());
    const v = await validated({ name: m.name, author: m.author, description: m.description ?? "", license: m.license, glb, preview, claimedSha: m.sha256 });
    if (typeof v === "string") { errors.push(`${m.slug}: ${v}`); continue; }
    await store.saveModel({ ownerAccountId: await store.ownerAccountId(), name: m.name, author: CREATOR, description: m.description ?? "", license: m.license, glb, preview, previewType: isPng(preview) ? "image/png" : "image/jpeg", sha256: v.sha256, via: "github-feed" });
    imported++;
  }
  await store.setState("feed-sync", { lastSync: new Date().toISOString(), imported, errors }); return { imported, errors };
}
// Run syncFeedB on a schedule (e.g. every 10 minutes) and expose a read-only status the client can check:
export async function handleFeedStatusB(request, store) {
  if (new URL(request.url).pathname !== "/api/publisher/feed-status") return null;
  const st = (await store.getState("feed-sync")) ?? {}; return json(200, { repo: FEED.repo, branch: FEED.branch, ...st });
}
