#!/usr/bin/env node
// Prepare a library model for a TwistFrame scene (Three.js / React Three Fiber): one self-contained GLB + LODs + usage.json.
//   node prepare.mjs <catalogId> --out <dir> [--scale s | --fit-stated] [--rotate-x deg] [--rotate-y deg] [--origin base-center|keep]
//                    [--lods 0.5,0.15] [--lod-texture 512] [--no-cache]
// Steps: scale correction (explicit, or automatic when the extents are off from the source's stated dimensions by one
// consistent factor, e.g. a 10x export), orientation, base-centre origin (sits on y = 0), LOSSLESS clean-up (dedup,
// prune, weld; textures untouched), optional simplified LODs (meshoptimizer, error-bounded) with optional smaller LOD
// textures. Results are cached in asset-library/cache/_prepared/<hash> so repeated use is instant.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, weld, simplify, textureCompress } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import { loadCatalog } from "./search.mjs";
import { ROOT } from "./fetch.mjs";
const LIB = path.resolve(ROOT, "..");
export function autoScale(sizeM, statedM) { if (!statedM) return 1; const a = [...sizeM].sort((p, q) => p - q), b = [...statedM].sort((p, q) => p - q); const r = a.map((v, i) => b[i] / v);
  const mean = r.reduce((s, x) => s + x, 0) / 3; return r.every((x) => Math.abs(x / mean - 1) < 0.05) && Math.abs(mean - 1) > 0.1 ? +mean.toPrecision(4) : 1; }
const tris = (doc) => { let t = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(), pos = p.getAttribute("POSITION"); t += (i ? i.getCount() : pos.getCount()) / 3; } return Math.round(t); };
async function transformed(io, file, o) {
  const doc = await io.read(file), root = doc.getRoot(), scene = root.getDefaultScene() ?? root.listScenes()[0], wrap = doc.createNode("tf_root");
  for (const c of scene.listChildren()) { scene.removeChild(c); wrap.addChild(c); } scene.addChild(wrap);
  const q = (ax, deg) => { const h = (deg * Math.PI) / 360, s = Math.sin(h); return ax === "x" ? [s, 0, 0, Math.cos(h)] : [0, s, 0, Math.cos(h)]; };
  const mul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  wrap.setRotation(mul(q("y", o.rotY), q("x", o.rotX))).setScale([o.scale, o.scale, o.scale]);
  if (o.origin !== "keep") { const b = getBounds(scene); wrap.setTranslation([-(b.min[0] + b.max[0]) / 2, -b.min[1], -(b.min[2] + b.max[2]) / 2]); }
  await doc.transform(dedup(), prune(), weld()); return doc;
}
export async function prepare(id, opts = {}) {
  const a = loadCatalog().find((x) => x.id === id); if (!a) throw new Error(`no catalog asset ${id}`); if (a.type !== "model") throw new Error(`${id} is a ${a.type}, not a model`); if (!a.local) throw new Error(`${id} is ${a.status}: download it first`);
  const q = a.quality ?? {}, scale = opts.scale ?? (opts.fitStated !== false ? autoScale(q.sizeM, q.statedM) : 1), o = { scale, rotX: opts.rotX ?? 0, rotY: opts.rotY ?? 0, origin: opts.origin ?? "base-center", lods: opts.lods ?? [], lodTex: opts.lodTex ?? 0 };
  const key = crypto.createHash("sha1").update(JSON.stringify([id, a.sha256, o])).digest("hex").slice(0, 16), cdir = path.join(ROOT, "_prepared", key), name = id.split(":").pop().replace(/[^\w-]/g, "_");
  if (!fs.existsSync(path.join(cdir, "usage.json")) || opts.noCache) {
    fs.mkdirSync(cdir, { recursive: true }); const io = new NodeIO().registerExtensions(ALL_EXTENSIONS), src = path.join(LIB, a.local);
    const doc = await transformed(io, src, o), b = getBounds(doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]); await io.write(path.join(cdir, `${name}.glb`), doc);
    const lods = []; for (const [i, ratio] of o.lods.entries()) { const d = await transformed(io, src, o); await MeshoptSimplifier.ready;
      await d.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01, lockBorder: false })); if (o.lodTex) { const sharp = (await import("sharp")).default; await d.transform(textureCompress({ encoder: sharp, resize: [o.lodTex, o.lodTex] })); }
      const f = `${name}_lod${i + 1}.glb`; await io.write(path.join(cdir, f), d); lods.push({ file: f, ratio, triangles: tris(d), bytes: fs.statSync(path.join(cdir, f)).size }); }
    fs.writeFileSync(path.join(cdir, "usage.json"), JSON.stringify({ id, file: `${name}.glb`, triangles: tris(doc), boundsM: b.max.map((v, i) => +(v - b.min[i]).toFixed(3)), appliedScale: scale, rotation: [o.rotX, o.rotY], origin: o.origin, lods,
      licence: a.licence, attribution: a.attribution, sourceUrl: a.sourceUrl, prepared: new Date().toISOString().slice(0, 10) }, null, 1)); }
  if (opts.out) { fs.mkdirSync(opts.out, { recursive: true }); for (const f of fs.readdirSync(cdir)) fs.copyFileSync(path.join(cdir, f), path.join(opts.out, f)); }
  return JSON.parse(fs.readFileSync(path.join(cdir, "usage.json"), "utf8"));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const av = process.argv.slice(2), v = (k) => { const i = av.indexOf(`--${k}`); return i > 0 ? av[i + 1] : undefined; };
  const u = await prepare(av[0], { out: v("out"), scale: v("scale") ? +v("scale") : undefined, fitStated: !av.includes("--no-fit"), rotX: +(v("rotate-x") ?? 0), rotY: +(v("rotate-y") ?? 0), origin: v("origin"), lods: v("lods") ? v("lods").split(",").map(Number) : [], lodTex: +(v("lod-texture") ?? 0), noCache: av.includes("--no-cache") });
  console.log(JSON.stringify(u, null, 1));
}
