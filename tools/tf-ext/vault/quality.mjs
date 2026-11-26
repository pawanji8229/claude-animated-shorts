// Model quality evaluation (static, no rendering). Scores a glTF/GLB for use at a given camera distance:
//   hero  (close-up)   rewards geometric detail, 2k+ textures, full PBR (base + normal + ORM), real-world scale
//   mid                balanced
//   far   (background) rewards light geometry + small files; texture/detail requirements relaxed
// Returns { score 0..100, tier, metrics, reasons[] } so a selector can compare candidates on evidence, not names.
import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
/** glTF reader that understands meshopt-compressed files (common on the vault) */
export async function reader() { await MeshoptDecoder.ready; return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder }); }
const THREE_OK = new Set(["KHR_materials_clearcoat", "KHR_materials_transmission", "KHR_materials_ior", "KHR_materials_specular", "KHR_materials_sheen", "KHR_materials_volume", "KHR_materials_emissive_strength", "KHR_materials_iridescence", "KHR_materials_anisotropy", "KHR_materials_unlit", "KHR_texture_transform", "KHR_mesh_quantization", "KHR_lights_punctual", "KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu", "EXT_texture_webp", "EXT_mesh_gpu_instancing", "KHR_materials_dispersion"]);
export async function metrics(file) {
  const doc = await (await reader()).read(file), root = doc.getRoot(), scene = root.getDefaultScene() ?? root.listScenes()[0], b = getBounds(scene);
  let tris = 0, prims = 0, uvMissing = 0, noNormals = 0;
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { prims++; const pos = p.getAttribute("POSITION"), idx = p.getIndices(); if (!pos) continue; tris += (idx ? idx.getCount() : pos.getCount()) / 3;
    if (p.getMaterial()?.getBaseColorTexture() && !p.getAttribute("TEXCOORD_0")) uvMissing++; if (!p.getAttribute("NORMAL")) noNormals++; }
  const mats = root.listMaterials(), tex = root.listTextures().map((t) => { try { return t.getSize()?.[0] ?? 0; } catch { return 0; } });
  const exts = root.listExtensionsUsed().map((e) => e.extensionName);
  return { triangles: Math.round(tris), primitives: prims, meshes: root.listMeshes().length, nodes: root.listNodes().length, materials: mats.length, sizeM: b.max.map((v, i) => +(v - b.min[i]).toFixed(3)),
    textures: tex.length, maxTexture: Math.max(0, ...tex), pbr: { base: mats.filter((m) => m.getBaseColorTexture()).length, normal: mats.filter((m) => m.getNormalTexture()).length, orm: mats.filter((m) => m.getMetallicRoughnessTexture() || m.getOcclusionTexture()).length },
    flatColourMaterials: mats.filter((m) => !m.getBaseColorTexture()).length, uvMissing, noNormals, extensions: exts, unsupported: exts.filter((e) => !THREE_OK.has(e)), animations: root.listAnimations().length,
    decoders: exts.filter((e) => ["EXT_meshopt_compression", "KHR_draco_mesh_compression", "KHR_texture_basisu"].includes(e)) };
}
/** expected = { lengthM?: [min, max] longest side in metres } ; distance = "hero" | "mid" | "far" */
export function score(m, { distance = "mid", expected } = {}) {
  const r = [], add = (pts, why) => { r.push(`${pts >= 0 ? "+" : ""}${pts} ${why}`); return pts; }; let s = 50;
  if (m.unsupported.length) return { score: 0, tier: "reject", metrics: m, reasons: [`unsupported extensions: ${m.unsupported.join(", ")}`] };
  if (m.uvMissing) s += add(-25, `${m.uvMissing} textured primitives without UVs`); if (m.noNormals) s += add(-10, `${m.noNormals} primitives without normals`);
  const t = m.triangles, want = { hero: [40e3, 1.5e6], mid: [8e3, 400e3], far: [300, 60e3] }[distance];
  if (t < want[0]) s += add(distance === "far" ? 0 : -Math.min(25, Math.round(25 * (1 - t / want[0]))), `low geometric detail for ${distance} (${t} tris)`); else if (t > want[1]) s += add(-Math.min(20, Math.round(10 * Math.log2(t / want[1]))), `heavy for ${distance} (${t} tris): needs LOD`); else s += add(10, `geometry fits ${distance} (${t} tris)`);
  const texWant = { hero: 2048, mid: 1024, far: 256 }[distance];
  if (m.textures === 0) s += add(distance === "far" ? -3 : -15, "no textures (flat colours only)"); else if (m.maxTexture >= texWant) s += add(8, `textures ${m.maxTexture}px`); else s += add(-6, `textures only ${m.maxTexture}px`);
  if (m.materials) { const pbrFrac = (m.pbr.normal + m.pbr.orm) / (2 * m.materials); s += add(Math.round((distance === "far" ? 6 : 16) * pbrFrac - (distance === "far" ? 0 : 4)), `PBR coverage ${(pbrFrac * 100).toFixed(0)}% (normal + ORM maps)`); }
  if (expected?.lengthM) { const L = Math.max(...m.sizeM), [a, b] = expected.lengthM; if (L >= a && L <= b) s += add(8, `real-world size ok (${L} m)`); else { const k = L > b ? L / b : a / Math.max(L, 1e-6); s += add(k > 50 ? -10 : -4, `size ${L} m outside ${a}-${b} m (scale x${(1 / (L > b ? L / b : 1 / k)).toPrecision(2)} needed)`); } }
  if (m.decoders?.length) r.push(`note: needs ${m.decoders.join(" + ")} decoder in the loader (or decompress in prepare)`);
  if (m.animations) s += add(3, `${m.animations} animations / movable parts`);
  s = Math.max(0, Math.min(100, s)); return { score: s, tier: s >= 75 ? "excellent" : s >= 60 ? "good" : s >= 45 ? "usable" : "poor", metrics: m, reasons: r };
}
