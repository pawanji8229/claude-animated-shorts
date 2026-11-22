#!/usr/bin/env node
// Static quality inspection of everything in asset-library/cache (no rendering): writes asset-library/quality-report.json
//   models    glTF validity (all referenced files present), bounds (m) vs the source's stated dimensions, triangles,
//             meshes, materials, PBR maps per material (base colour / normal / ORM / emissive), texture resolutions,
//             UVs (TEXCOORD_0) on every textured primitive, normals, glTF extensions vs what three r180 GLTFLoader supports
//   textures  PH glTF material bundles + ambientCG zips (zip integrity, which PBR maps exist, resolution)
//   HDRIs     Radiance header + resolution
//   sounds    ffprobe codec / sample rate / channels / duration + peak level (ffmpeg volumedetect)
import fs from "node:fs"; import path from "node:path"; import { execFileSync, spawnSync } from "node:child_process";
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { ROOT } from "./fetch.mjs";
const THREE_OK = new Set(["KHR_materials_clearcoat", "KHR_materials_transmission", "KHR_materials_ior", "KHR_materials_specular", "KHR_materials_sheen", "KHR_materials_volume", "KHR_materials_emissive_strength", "KHR_materials_iridescence", "KHR_materials_anisotropy", "KHR_materials_unlit", "KHR_texture_transform", "KHR_mesh_quantization", "KHR_lights_punctual", "KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu", "EXT_texture_webp", "EXT_mesh_gpu_instancing", "KHR_materials_dispersion"]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const sizeOf = (t) => { try { return t.getSize(); } catch { return null; } };
async function inspectModel(dir, man) {
  const f = path.join(dir, man.entry), missing = man.files.filter((x) => !fs.existsSync(path.join(dir, x.rel))).map((x) => x.rel);
  const doc = await io.read(f), root = doc.getRoot(), b = getBounds(root.getDefaultScene() ?? root.listScenes()[0]), size = b.max.map((v, i) => +(v - b.min[i]).toFixed(3));
  let tris = 0, prims = 0, noUV = 0, noNormal = 0;
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { prims++; const pos = p.getAttribute("POSITION"), idx = p.getIndices(); tris += (idx ? idx.getCount() : pos.getCount()) / 3;
    if (p.getMaterial()?.getBaseColorTexture() && !p.getAttribute("TEXCOORD_0")) noUV++; if (!p.getAttribute("NORMAL")) noNormal++; }
  const mats = root.listMaterials().map((m) => ({ name: m.getName(), base: !!m.getBaseColorTexture(), normal: !!m.getNormalTexture(), orm: !!(m.getMetallicRoughnessTexture() || m.getOcclusionTexture()), emissive: !!m.getEmissiveTexture(), alpha: m.getAlphaMode(), metallic: m.getMetallicFactor(), roughness: m.getRoughnessFactor() }));
  const tex = root.listTextures().map((t) => sizeOf(t)?.[0] ?? 0), exts = root.listExtensionsUsed().map((e) => e.extensionName), unsupported = exts.filter((e) => !THREE_OK.has(e));
  const dimM = man.dimensionsMm ? man.dimensionsMm.map((v) => +(v / 1000).toFixed(3)) : null;
  // the source states dimensions in mm (x, y, z in Blender = x, depth, height). Compare sorted extents (axis order differs Z-up vs Y-up)
  const scaleOk = dimM ? (() => { const a = [...size].sort((p, q) => p - q), c = [...dimM].sort((p, q) => p - q); return a.every((v, i) => Math.abs(v - c[i]) <= Math.max(0.05, c[i] * 0.06)); })() : null;
  const flags = []; if (missing.length) flags.push("missing files"); if (noUV) flags.push(`${noUV} textured primitives without UVs`); if (noNormal) flags.push(`${noNormal} primitives without normals`);
  if (unsupported.length) flags.push(`extensions not in three r180: ${unsupported.join(",")}`); if (scaleOk === false) flags.push("bounds differ from stated dimensions"); if (mats.some((m) => m.base && !m.normal)) flags.push("some materials without normal map");
  if (tris > 500000) flags.push("heavy (>500k tris): use LOD/simplify for distance, or as hero only");
  return { triangles: Math.round(tris), primitives: prims, meshes: root.listMeshes().length, sizeM: size, statedM: dimM, scaleOk, materials: mats, textures: tex.length, textureRes: [Math.min(...tex, Infinity) === Infinity ? 0 : Math.min(...tex), Math.max(0, ...tex)], extensions: exts, flags, ready: !missing.length && !noUV && !unsupported.length };
}
async function inspectTextureBundle(dir, man) { const doc = await io.read(path.join(dir, man.entry)), m = doc.getRoot().listMaterials()[0], t = doc.getRoot().listTextures();
  return { maps: { base: !!m.getBaseColorTexture(), normal: !!m.getNormalTexture(), orm: !!m.getMetallicRoughnessTexture(), ao: !!m.getOcclusionTexture() }, res: t.map((x) => sizeOf(x)?.[0] ?? 0), files: man.files.map((f) => f.rel.split("/").pop()), ready: !!m.getBaseColorTexture() && !!m.getNormalTexture() }; }
function inspectZip(dir, man) { const z = path.join(dir, man.entry); execFileSync("unzip", ["-tq", z]); const out = path.join(dir, "files"); execFileSync("unzip", ["-qo", z, "-d", out]);
  const files = fs.readdirSync(out), has = (k) => files.some((f) => f.includes(k)); const col = files.find((f) => /_Color\.jpg$/.test(f));
  let res = null; if (col) { const id = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path.join(out, col)]).toString().trim(); res = id; }
  return { zipOk: true, maps: { color: !!col, normalGL: has("NormalGL"), roughness: has("Roughness"), ao: has("AmbientOcclusion"), displacement: has("Displacement"), metalness: has("Metalness"), opacity: has("Opacity") }, res, files, ready: !!col && has("NormalGL") && has("Roughness") }; }
function inspectHdri(dir, man) { const f = path.join(dir, man.entry), head = fs.readFileSync(f).subarray(0, 200).toString("latin1"), m = head.match(/-Y (\d+) \+X (\d+)/);
  return { radiance: head.startsWith("#?RADIANCE") || head.startsWith("#?RGBE"), width: m ? +m[2] : null, height: m ? +m[1] : null, ready: head.startsWith("#?") && !!m }; }
export function inspectAudio(f) { const p = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", f]).toString());
  const vd = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", f, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" }).stderr ?? "";
  const num = (k) => { const m = vd.match(new RegExp(`${k}:\\s*(-?[\\d.]+) dB`)); return m ? +m[1] : null; };
  return { codec: p.streams[0].codec_name, sampleRate: +p.streams[0].sample_rate, channels: p.streams[0].channels, duration: +(+p.format.duration).toFixed(2), peakDb: num("max_volume"), meanDb: num("mean_volume") };
}
const report = { generated: new Date().toISOString().slice(0, 10), models: {}, textures: {}, materials: {}, hdris: {}, sounds: {} };
for (const src of fs.readdirSync(ROOT).filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory())) for (const id of fs.readdirSync(path.join(ROOT, src))) {
  const dir = path.join(ROOT, src, id), mf = path.join(dir, "manifest.json"); if (!fs.existsSync(mf)) continue; const man = JSON.parse(fs.readFileSync(mf, "utf8"));
  try {
    if (src === "polyhaven" && man.kind === "model") report.models[id] = await inspectModel(dir, man);
    else if (src === "polyhaven" && man.kind === "texture") report.textures[id] = await inspectTextureBundle(dir, man);
    else if (src === "polyhaven" && man.kind === "hdri") report.hdris[id] = inspectHdri(dir, man);
    else if (src === "ambientcg") report.materials[id] = inspectZip(dir, man);
    else if (src === "mixkit") { const a = inspectAudio(path.join(dir, man.entry)); report.sounds[`mixkit:${id}`] = { ...a, ready: a.duration > 0 }; }
  } catch (e) { (report.errors ??= []).push(`${src}/${id}: ${e.message}`); }
}
for (const pack of ["impact-sounds", "rpg-audio"]) { const d = path.join(ROOT, "kenney", pack, "files", "Audio"); if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".ogg"))) { try { const a = inspectAudio(path.join(d, f)); report.sounds[`kenney:${pack}/${f}`] = { ...a, ready: a.duration > 0 }; } catch (e) { (report.errors ??= []).push(`kenney ${f}: ${e.message}`); } } }
fs.writeFileSync(path.join(ROOT, "..", "quality-report.json"), JSON.stringify(report, null, 1));
const c = (o) => Object.keys(o).length, r = (o) => Object.values(o).filter((x) => x.ready).length;
console.log(`models ${r(report.models)}/${c(report.models)} ready | PH textures ${r(report.textures)}/${c(report.textures)} | ambientCG ${r(report.materials)}/${c(report.materials)} | HDRIs ${r(report.hdris)}/${c(report.hdris)} | sounds ${r(report.sounds)}/${c(report.sounds)} | errors ${(report.errors ?? []).length}`);
