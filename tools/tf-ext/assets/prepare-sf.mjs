#!/usr/bin/env node
// Prepare cached Sketchfab glTF models as self-contained GLBs: scaled to a target height (m), base-centre origin,
// textures capped (--tex px), animations kept. Writes <out>/assets.json with licence + attribution.
//   node prepare-sf.mjs --out <dir> --tex 1024 name=uid:height [...]
import fs from "node:fs"; import path from "node:path";
import { NodeIO, getBounds } from "@gltf-transform/core"; import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, weld, textureCompress, metalRough } from "@gltf-transform/functions"; import sharp from "sharp"; import { ROOT } from "./fetch.mjs";
const av = process.argv.slice(2), opt = (k, d) => { const i = av.indexOf(`--${k}`); return i >= 0 ? av[i + 1] : d; };
const out = opt("out"), tex = +opt("tex", 1024); fs.mkdirSync(out, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS), listP = path.join(out, "assets.json"), list = fs.existsSync(listP) ? JSON.parse(fs.readFileSync(listP)) : [];
for (const spec of av.filter((a) => a.includes("=") && !a.startsWith("--"))) {
  const [name, rest] = spec.split("="), [uid, h] = rest.split(":"), dir = path.join(ROOT, "sketchfab", uid), man = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json")));
  const gl = fs.readdirSync(path.join(dir, "gltf")).find((f) => /\.(gltf|glb)$/.test(f));
  const doc = await io.read(path.join(dir, "gltf", gl)), root = doc.getRoot(), scene = root.getDefaultScene() ?? root.listScenes()[0], wrap = doc.createNode("tf_root");
  for (const c of scene.listChildren()) { scene.removeChild(c); wrap.addChild(c); } scene.addChild(wrap);
  const b = getBounds(scene), hh = b.max[1] - b.min[1], s = h ? +h / hh : 1;
  wrap.setScale([s, s, s]); wrap.setTranslation([-(b.min[0] + b.max[0]) / 2 * s, -b.min[1] * s, -(b.min[2] + b.max[2]) / 2 * s]);
  await doc.transform(metalRough(), dedup(), prune({ keepAttributes: true }), textureCompress({ encoder: sharp, resize: [tex, tex] }));
  await io.write(path.join(out, `${name}.glb`), doc); const nb = getBounds(doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]);
  const e = { name, file: `${name}.glb`, uid, title: man.name, author: man.author, url: man.url, licence: man.licence, attribution: man.attribution, sizeM: nb.max.map((v, i) => +(v - nb.min[i]).toFixed(3)), animations: root.listAnimations().map((a) => a.getName()), bytes: fs.statSync(path.join(out, `${name}.glb`)).size };
  const i = list.findIndex((x) => x.name === name); if (i >= 0) list[i] = e; else list.push(e); console.log(name, e.sizeM.join("x"), (e.bytes / 1e6).toFixed(1) + "MB", "anims:", e.animations.slice(0, 6).join(","));
}
fs.writeFileSync(listP, JSON.stringify(list, null, 1));
