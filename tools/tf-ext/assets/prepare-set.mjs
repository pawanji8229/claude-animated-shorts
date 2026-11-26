#!/usr/bin/env node
// Prepare a SET of cached Poly Haven models for one production in a single step (no catalog entry needed):
// each glTF from asset-library/cache/polyhaven/<id>/ becomes one self-contained GLB with a base-centre origin
// (sits on y = 0, centred in x/z), lossless clean-up (dedup / prune / weld) and textures capped at --tex px (JPEG).
// Writes <out>/<name>.glb + <out>/assets.json (licence, author, source URL, size in metres, triangles) so every
// model in the production carries its provenance.
//   node prepare-set.mjs --out <dir> --tex 512 name=polyhavenId [name=polyhavenId ...]
import fs from "node:fs"; import path from "node:path";
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, weld, textureCompress } from "@gltf-transform/functions";
import sharp from "sharp";
import { ROOT } from "./fetch.mjs";

const av = process.argv.slice(2), opt = (k, d) => { const i = av.indexOf(`--${k}`); return i >= 0 ? av[i + 1] : d; };
const out = opt("out"), tex = +opt("tex", 512); if (!out) throw new Error("--out required");
const pairs = av.filter((a) => a.includes("=") && !a.startsWith("--")).map((a) => a.split("="));
fs.mkdirSync(out, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const tris = (doc) => { let t = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(), pos = p.getAttribute("POSITION"); t += (i ? i.getCount() : pos.getCount()) / 3; } return Math.round(t); };
const list = [];
for (const [name, id] of pairs) {
  const dir = path.join(ROOT, "polyhaven", id), man = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const doc = await io.read(path.join(dir, man.entry)), root = doc.getRoot(), scene = root.getDefaultScene() ?? root.listScenes()[0], wrap = doc.createNode("tf_root");
  for (const c of scene.listChildren()) { scene.removeChild(c); wrap.addChild(c); } scene.addChild(wrap);
  const b = getBounds(scene); wrap.setTranslation([-(b.min[0] + b.max[0]) / 2, -b.min[1], -(b.min[2] + b.max[2]) / 2]);
  await doc.transform(dedup(), prune(), weld(), textureCompress({ encoder: sharp, resize: [tex, tex], targetFormat: "jpeg", quality: 85, slots: /^(?!.*normal).*$/ }), textureCompress({ encoder: sharp, resize: [tex, tex], slots: /normal/ }));
  const file = `${name}.glb`; await io.write(path.join(out, file), doc);
  const nb = getBounds(doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]);
  list.push({ name, file, source: man.url, polyhavenId: id, title: man.name, licence: man.licence, licenceUrl: man.licenceUrl, authors: man.authors, sizeM: nb.max.map((v, i) => +(v - nb.min[i]).toFixed(3)), triangles: tris(doc), bytes: fs.statSync(path.join(out, file)).size });
  console.log(`${name.padEnd(14)} ${id.padEnd(28)} ${list.at(-1).sizeM.join(" x ")} m  ${list.at(-1).triangles} tris  ${(list.at(-1).bytes / 1e6).toFixed(2)} MB`);
}
fs.writeFileSync(path.join(out, "assets.json"), JSON.stringify(list, null, 1));
