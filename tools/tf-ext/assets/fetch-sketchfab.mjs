#!/usr/bin/env node
// Download a Sketchfab model (glTF zip) with its licence + author recorded. The API token is injected by the
// session's network proxy (never stored here). Usage: node fetch-sketchfab.mjs <uid> [<uid> ...]
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process"; import { ROOT } from "./fetch.mjs";
const curl = (url, out) => execFileSync("curl", ["-sSfL", "--max-time", "900", ...(out ? ["-o", out] : []), url], { maxBuffer: 1 << 28 });
for (const uid of process.argv.slice(2)) {
  const dir = path.join(ROOT, "sketchfab", uid); fs.mkdirSync(dir, { recursive: true });
  try {
    const meta = JSON.parse(curl(`https://api.sketchfab.com/v3/models/${uid}`).toString());
    const lic = meta.license?.label ?? "?"; if (/NonCommercial|NoDeriv/i.test(lic)) { console.log(`skip ${uid} (${lic})`); continue; }
    const dl = JSON.parse(curl(`https://api.sketchfab.com/v3/models/${uid}/download`).toString());
    const g = dl.gltf ?? dl.glb; if (!g) { console.log(`no gltf for ${uid}`); continue; }
    const zip = path.join(dir, "model.zip"); curl(g.url, zip); execFileSync("unzip", ["-oq", zip, "-d", path.join(dir, "gltf")]); fs.rmSync(zip);
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ uid, name: meta.name, author: meta.user?.displayName, username: meta.user?.username, url: meta.viewerUrl,
      licence: lic, licenceUrl: meta.license?.url, faces: meta.faceCount, animations: meta.animationCount, attribution: `"${meta.name}" by ${meta.user?.displayName} (${meta.viewerUrl}), ${lic}` }, null, 1));
    console.log(`ok ${uid} ${meta.name} | ${lic} | ${meta.faceCount} faces | anims ${meta.animationCount}`);
  } catch (e) { console.log(`fail ${uid}: ${String(e.message).slice(0, 120)}`); }
}
