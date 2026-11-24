// Export the ORIGINAL TwistFrame glasses (src/char/tf2/glasses.ts) as a self-contained GLB (no external tools, no copied
// models): frame tubes + lenses from the same geometry definition the character renderer projects every frame.
// Units: metres (the head-space card px are scaled so the frame is ~14 cm wide, a real adult frame width).
// Usage: npx tsx scripts/export-glasses-glb.ts out/tf2/twistframe_glasses_panto.glb
import { writeFileSync } from "fs";
import * as THREE from "three";
import { glassesMesh } from "../src/char/tf2/glasses";

const out = process.argv[2] ?? "out/tf2/twistframe_glasses_panto.glb";
const main = async () => {
  const grp = await glassesMesh(); grp.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(grp), size = box.getSize(new THREE.Vector3()), k = 0.14 / size.x;   // 14 cm frame width
  type Prim = { pos: Float32Array; nrm: Float32Array; idx: Uint32Array; mat: number };
  const mats: { name: string; color: number[]; rough: number; alpha?: number }[] = [{ name: "espresso acetate", color: [0.17, 0.11, 0.1, 1], rough: 0.35 }, { name: "lens", color: [0.87, 0.94, 1, 0.25], rough: 0.05, alpha: 0.25 }];
  const prims: Prim[] = [];
  grp.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const g = (m.geometry as THREE.BufferGeometry).clone().applyMatrix4(m.matrixWorld); g.scale(k, k, k); if (!g.index) { const n = g.attributes.position.count; g.setIndex(Array.from({ length: n }, (_, i) => i)); } g.computeVertexNormals();
    prims.push({ pos: new Float32Array(g.attributes.position.array), nrm: new Float32Array(g.attributes.normal.array), idx: new Uint32Array(g.index!.array), mat: (m.material as THREE.Material).type === "MeshPhysicalMaterial" ? 1 : 0 }); });
  // pack buffers
  const chunks: Buffer[] = []; let off = 0; const views: object[] = [], accessors: object[] = [];
  const addView = (arr: Float32Array | Uint32Array, target: number) => { const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); const pad = (4 - (b.length % 4)) % 4; chunks.push(b, Buffer.alloc(pad)); views.push({ buffer: 0, byteOffset: off, byteLength: b.length, target }); off += b.length + pad; return views.length - 1; };
  const meshes = prims.map((p) => { const mm = (a: Float32Array) => { const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < a.length; i += 3) for (let j = 0; j < 3; j++) { mn[j] = Math.min(mn[j], a[i + j]); mx[j] = Math.max(mx[j], a[i + j]); } return { min: mn, max: mx }; };
    const pv = addView(p.pos, 34962); accessors.push({ bufferView: pv, componentType: 5126, count: p.pos.length / 3, type: "VEC3", ...mm(p.pos) }); const pa = accessors.length - 1;
    const nv = addView(p.nrm, 34962); accessors.push({ bufferView: nv, componentType: 5126, count: p.nrm.length / 3, type: "VEC3" }); const na = accessors.length - 1;
    const iv = addView(p.idx, 34963); accessors.push({ bufferView: iv, componentType: 5125, count: p.idx.length, type: "SCALAR" }); const ia = accessors.length - 1;
    return { primitives: [{ attributes: { POSITION: pa, NORMAL: na }, indices: ia, material: p.mat }] }; });
  const bin = Buffer.concat(chunks);
  const gltf = { asset: { version: "2.0", generator: "TwistFrame Lab glasses exporter", copyright: "Original TwistFrame Lab design" }, scene: 0, scenes: [{ nodes: meshes.map((_, i) => i) }], nodes: meshes.map((_, i) => ({ mesh: i, name: `glasses_part_${i}` })), meshes,
    materials: mats.map((m) => ({ name: m.name, pbrMetallicRoughness: { baseColorFactor: m.color, metallicFactor: 0, roughnessFactor: m.rough }, ...(m.alpha ? { alphaMode: "BLEND", doubleSided: true } : {}) })),
    buffers: [{ byteLength: bin.length }], bufferViews: views, accessors };
  let json = Buffer.from(JSON.stringify(gltf)); const jp = (4 - (json.length % 4)) % 4; json = Buffer.concat([json, Buffer.alloc(jp, 0x20)]);
  const total = 12 + 8 + json.length + 8 + bin.length, h = Buffer.alloc(12); h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(total, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4e4f534a, 4); const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  writeFileSync(out, Buffer.concat([h, jh, json, bh, bin])); console.log(`wrote ${out}: ${prims.length} parts, ${(total / 1024).toFixed(1)} KB, frame ${(size.x * k * 100).toFixed(1)} x ${(size.y * k * 100).toFixed(1)} x ${(size.z * k * 100).toFixed(1)} cm`);
};
main();
