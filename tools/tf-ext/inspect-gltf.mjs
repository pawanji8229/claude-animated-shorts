#!/usr/bin/env node
// TwistFrame optional tool (glTF-Transform, MIT): READ-ONLY report for an imported vehicle / aircraft / prop model before
// it goes into a scene: real-world size (bounds in metres), up axis guess, triangle + vertex counts per mesh, materials,
// texture sizes, animations, and a suggested uniform scale so the model matches a known real length.
//   node inspect-gltf.mjs model.glb [--length 22.7]     (e.g. a B-17 fuselage is 22.66 m long)
// It never writes the model. Optimise separately with optimize-gltf.mjs (lossless) or pack-gltf.mjs (gltfpack).
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/core";

export const inspect = async (path, realLength) => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS), doc = await io.read(path), root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0], b = getBounds(scene), size = b.max.map((v, i) => v - b.min[i]);
  const meshes = root.listMeshes().map((m) => { let tris = 0, verts = 0; for (const p of m.listPrimitives()) { const pos = p.getAttribute("POSITION"), idx = p.getIndices(); verts += pos?.getCount() ?? 0; tris += (idx ? idx.getCount() : pos?.getCount() ?? 0) / 3; } return { name: m.getName(), prims: m.listPrimitives().length, tris: Math.round(tris), verts }; });
  const textures = root.listTextures().map((t) => ({ name: t.getName() || t.getURI(), mime: t.getMimeType(), size: t.getSize(), bytes: t.getImage()?.byteLength ?? 0 }));
  const longest = Math.max(...size), axis = ["x", "y", "z"][size.indexOf(longest)];
  return { file: path, sizeMetres: size.map((v) => +v.toFixed(3)), longestAxis: axis, upGuess: size[1] <= Math.min(size[0], size[2]) ? "y-up (flat model)" : "check: tallest along y",
    triangles: meshes.reduce((s, m) => s + m.tris, 0), meshes, materials: root.listMaterials().map((m) => m.getName()), textures, animations: root.listAnimations().map((a) => a.getName()),
    suggestedScale: realLength ? +(realLength / longest).toFixed(5) : null };
};
if (import.meta.url === `file://${process.argv[1]}`) {
  const [p] = process.argv.slice(2), i = process.argv.indexOf("--length"), L = i > 0 ? Number(process.argv[i + 1]) : null;
  if (!p) { console.error("usage: inspect-gltf.mjs model.glb [--length metres]"); process.exit(2); }
  console.log(JSON.stringify(await inspect(p, L), null, 1));
}
