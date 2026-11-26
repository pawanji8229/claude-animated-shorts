// Local test of publisher-reference.js with an in-memory store and a mocked GitHub feed (no network, no real site).
import assert from "node:assert/strict"; import fs from "node:fs"; import crypto from "node:crypto"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { handlePublisherA, syncFeedB, handleFeedStatusB } from "./publisher-reference.js";
const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../asset-library");
const glb = fs.readFileSync(path.join(LIB, "publish/camouflage-prop-house-1940s/model.glb")), jpg = fs.readFileSync(path.join(LIB, "publish/camouflage-prop-house-1940s/camouflage_house_preview.jpg"));
const sha = crypto.createHash("sha256").update(glb).digest("hex");
const mkStore = () => { const models = [], state = {}; return { models, findBySha256: async (s) => models.find((m) => m.sha256 === s) ?? null, saveModel: async (m) => { const r = { ...m, id: models.length + 1, download: `/files/${models.length + 1}.glb` }; models.push(r); return r; }, ownerAccountId: async () => "owner-1", getState: async (k) => state[k], setState: async (k, v) => { state[k] = v; } }; };
let n = 0; const ok = (m) => { n++; console.log("ok ", m); };
// ---- method A
const token = crypto.randomBytes(32).toString("hex"), env = { PUBLISH_TOKEN_SHA256: crypto.createHash("sha256").update(token).digest("hex") }, store = mkStore();
const form = (over = {}) => { const f = new FormData(); const v = { name: "1940s Rooftop Camouflage Prop House — Canvas & Timber Stage Set", author: "TwistFrame Lab", description: "test", license: "CC BY 4.0", sha256: sha, ...over }; for (const [k, x] of Object.entries(v)) f.set(k, x); f.set("model", new File([over.glb ?? glb], "model.glb")); f.set("preview", new File([jpg], "p.jpg")); return f; };
const req = (p, init) => new Request(`https://vault.example${p}`, init);
assert.equal((await handlePublisherA(req("/api/publisher/status", { headers: {} }), env, store)).status, 401);
assert.equal((await handlePublisherA(req("/api/publisher/status", { headers: { authorization: "Bearer " + "x".repeat(64) } }), env, store)).status, 401);
assert.equal((await handlePublisherA(req("/api/publisher/status", { headers: { authorization: `Bearer ${token}` } }), env, store)).status, 200); ok("A: no/wrong token -> 401, right token -> 200");
assert.equal(await handlePublisherA(req("/api/models", {}), env, store), null); ok("A: does not touch the existing public routes");
let r = await handlePublisherA(req("/api/publisher/models", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form() }), env, store); assert.equal(r.status, 201); assert.equal(store.models[0].author, "TwistFrame Lab"); assert.equal(store.models[0].ownerAccountId, "owner-1"); ok("A: valid upload published as TwistFrame Lab under the owner account");
r = await handlePublisherA(req("/api/publisher/models", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form() }), env, store); assert.equal(r.status, 409); assert.equal(store.models.length, 1); ok("A: re-upload of the same file -> 409, no duplicate");
for (const [over, why] of [[{ author: "Someone" }, "creator"], [{ license: "All rights reserved" }, "licence"], [{ glb: Buffer.from("not a glb, definitely not") }, "GLB"], [{ sha256: "0".repeat(64) }, "sha256"], [{ name: "x".repeat(81) }, "title"]]) {
  r = await handlePublisherA(req("/api/publisher/models", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form(over) }), env, store); assert.equal(r.status, 422, why); }
ok("A: rejects wrong creator, licence, invalid GLB, sha mismatch, long title (422)");
// ---- method B (mock GitHub raw)
const feed = { format: "twistframe-vault-feed/1", models: [{ slug: "camouflage-prop-house-1940s", name: "1940s Rooftop Camouflage Prop House — Canvas & Timber Stage Set", author: "TwistFrame Lab", description: "d", license: "CC BY 4.0", sha256: sha, model: "vault-feed/camouflage-prop-house-1940s/model.glb", preview: "vault-feed/camouflage-prop-house-1940s/preview.jpg" },
  { slug: "evil", name: "x", author: "TwistFrame Lab", license: "CC BY 4.0", sha256: "1".repeat(64), model: "https://evil.example/x.glb", preview: "vault-feed/evil/preview.jpg" }] };
globalThis.fetch = async (u) => { const s = String(u); if (s.endsWith("feed.json")) return new Response(JSON.stringify(feed)); if (s.endsWith("model.glb")) return new Response(glb); if (s.endsWith("preview.jpg")) return new Response(jpg); return new Response("no", { status: 404 }); };
const sb = mkStore(); let s1 = await syncFeedB(sb); assert.equal(s1.imported, 1); assert.match(s1.errors[0], /bad path/); assert.equal(sb.models[0].via, "github-feed"); ok("B: feed entry imported after sha256 check; foreign URL rejected");
s1 = await syncFeedB(sb); assert.equal(s1.imported, 0); assert.equal(sb.models.length, 1); ok("B: re-sync imports nothing twice");
const st = await (await handleFeedStatusB(new Request("https://vault.example/api/publisher/feed-status"), sb)).json(); assert.equal(st.branch, "vault-feed"); ok("B: feed-status endpoint");
console.log(`\n${n} reference-server tests passed`);
