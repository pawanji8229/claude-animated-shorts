#!/usr/bin/env node
// TwistFrame Lab — turn raw CC0 downloads (assets_src/) into render-ready library files (public/lib/):
//   models   -> GLB: welded, joined/flattened (fewer draw calls), simplified with meshoptimizer to a per-category
//               triangle budget (only when over budget), textures -> WebP <= 1024 px. No Draco/Meshopt container
//               compression (no WASM decoder needed at render time; files are loaded once per page anyway).
//   textures -> WebP 1024 px (diff q86, normal q92, rough/arm q84)
//   hdris    -> copied (1k .hdr, ~1 MB) for PMREM environment lighting
// Writes optimized tri counts, sizes and bounds back into assets/registry.json.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/functions";
import sharp from "sharp";

const ROOT = new URL("../..", import.meta.url).pathname, REG = join(ROOT, "assets/registry.json");
const reg = JSON.parse(readFileSync(REG, "utf8")), only = process.argv.slice(2);
// modular kits / variant packs keep their named pieces (no join/flatten) so scenes can pick or assemble them
const KITS = new Set(["modular_urban_apartments_facade", "modular_fire_escape", "modular_wooden_pier", "modular_chainlink_fence", "modular_street_seating",
  "fire_hydrant", "metal_trash_can", "old_military_crate", "shrub_03", "rock_moss_set_01"]);
const budget = (e) => { const c = e.categories.join(" ");
  return /ships/.test(c) ? 60000 : /trees/.test(c) ? 45000 : /buildings|structures/.test(c) && !/props/.test(c) ? 50000 : /rocks|nature|ground cover/.test(c) ? 12000 : 15000; };
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const [id, e] of Object.entries(reg.assets)) {
  if (only.length && !only.includes(id)) continue;
  if (e.type === "model") {
    const src = join(ROOT, e.raw), gltf = readdirSync(src).find((f) => f.endsWith(".gltf")), out = join(ROOT, "public/lib/models", `${id}.glb`);
    mkdirSync(join(ROOT, "public/lib/models"), { recursive: true });
    const countTris = async (file) => { const d = await io.read(file); let t = 0, n = 0; for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) { n++; const idx = p.getIndices(); t += (idx ? idx.getCount() : p.getAttribute("POSITION").getCount()) / 3; } return { t, n, d }; };
    const srcTris = (await countTris(join(src, gltf))).t;   // real triangles (Poly Haven "polycount" counts quads)
    const ratio = Math.min(1, budget(e) / srcTris);
    let tris = 0, draws = 0, doc;
    for (const err of ratio < 0.98 ? ["0.01", "0.04", "0.12"] : [null]) {   // escalate the error tolerance until the budget is met
      const args = ["gltf-transform", "optimize", join(src, gltf), out, "--compress", "false", "--texture-compress", "webp", "--texture-size", "1024",
        "--join", KITS.has(id) ? "false" : "true", "--flatten", KITS.has(id) ? "false" : "true", "--instance", "false", "--palette", "false", "--weld", "true"];
      if (err) args.push("--simplify", "true", "--simplify-ratio", ratio.toFixed(4), "--simplify-error", err); else args.push("--simplify", "false");
      execFileSync("npx", args, { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
      ({ t: tris, n: draws, d: doc } = await countTris(out)); e.simplifyError = err;
      if (tris <= budget(e) * 1.2) break;
    }
    e.trisSource = Math.round(srcTris);
    const b = getBounds(doc.getRoot().listScenes()[0]);
    if (KITS.has(id)) e.kitPieces = doc.getRoot().listScenes()[0].listChildren().map((n) => { const bb = getBounds(n); return { name: n.getName(), min: bb.min.map((v) => +v.toFixed(3)), max: bb.max.map((v) => +v.toFixed(3)) }; });
    else delete e.kitPieces;
    e.kit = KITS.has(id);
    Object.assign(e, { file: `public/lib/models/${id}.glb`, trisOptimized: Math.round(tris), primitives: draws, glbBytes: statSync(out).size,
      boundsM: { min: b.min.map((v) => +v.toFixed(3)), max: b.max.map((v) => +v.toFixed(3)) }, simplifyRatio: +ratio.toFixed(4) });
    delete e.lod1; delete e.lod1Tris;
    if (tris > 6000 && !KITS.has(id)) {   // LOD1 for background use: ~25% of the triangles, 512 px textures
      const lo = join(ROOT, "public/lib/models", `${id}_lod1.glb`);
      execFileSync("npx", ["gltf-transform", "optimize", out, lo, "--compress", "false", "--texture-compress", "webp", "--texture-size", "512", "--join", "true", "--flatten", "true",
        "--instance", "false", "--palette", "false", "--weld", "true", "--simplify", "true", "--simplify-ratio", "0.25", "--simplify-error", "0.08"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
      const d2 = await io.read(lo); let t2 = 0; for (const m of d2.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const idx = p.getIndices(); t2 += (idx ? idx.getCount() : p.getAttribute("POSITION").getCount()) / 3; }
      e.lod1 = `public/lib/models/${id}_lod1.glb`; e.lod1Tris = Math.round(t2);
    }
    console.log(`${id}: ${e.polycountOriginal} -> ${Math.round(tris)} tris${e.lod1 ? ` (lod1 ${e.lod1Tris})` : ""}, ${draws} prims, ${(e.glbBytes / 1e6).toFixed(2)} MB`);
  } else if (e.type === "texture") {
    const dir = join(ROOT, "public/lib/textures", id); mkdirSync(dir, { recursive: true }); e.files = {};
    for (const [k, rel] of Object.entries(e.maps)) {
      const q = k === "nor" ? 92 : k === "diff" ? 86 : 84, o = join(dir, `${k}.webp`);
      await sharp(join(ROOT, rel)).resize(1024, 1024, { fit: "inside" }).webp({ quality: q }).toFile(o); e.files[k] = `public/lib/textures/${id}/${k}.webp`;
    }
    console.log(`${id}: ${Object.keys(e.files).join(",")}`);
  } else if (e.type === "hdri") {
    mkdirSync(join(ROOT, "public/lib/hdri"), { recursive: true }); const o = join(ROOT, "public/lib/hdri", basename(e.raw)); copyFileSync(join(ROOT, e.raw), o); e.file = `public/lib/hdri/${basename(e.raw)}`;
    console.log(`${id}: hdri`);
  }
}
writeFileSync(REG, JSON.stringify(reg, null, 1));
// typed manifest for the renderer (only what scenes need; origin/license stay in assets/registry.json)
const man = {};
for (const [id, e] of Object.entries(reg.assets)) {
  if (e.type === "model" && e.file) man[id] = { kind: "model", file: e.file, lod1: e.lod1, tris: e.trisOptimized, bounds: e.boundsM, license: e.license, ...(e.kit ? { pieces: e.kitPieces } : {}) };
  if (e.type === "texture" && e.files) man[id] = { kind: "texture", maps: e.files, license: e.license };
  if (e.type === "hdri" && e.file) man[id] = { kind: "hdri", file: e.file, license: e.license };
}
writeFileSync(join(ROOT, "src/lib/library/manifest.ts"), `// GENERATED by pipeline/assets/optimize_library.mjs from assets/registry.json. Do not edit.\n` +
  `export type AssetEntry = { kind: "model" | "texture" | "hdri"; file?: string; lod1?: string; tris?: number; bounds?: { min: number[]; max: number[] }; maps?: Record<string, string>; license: string; pieces?: { name: string; min: number[]; max: number[] }[] };\n` +
  `export type AssetId = ${Object.keys(man).map((k) => JSON.stringify(k)).join(" | ")};\n` +
  `export const MANIFEST: Record<AssetId, AssetEntry> = ${JSON.stringify(man, null, 1)};\n`);
console.log("manifest:", Object.keys(man).length, "assets");
