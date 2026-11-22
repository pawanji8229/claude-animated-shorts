#!/usr/bin/env node
// TwistFrame optional tool (glTF-Transform, MIT): LOSSLESS-BY-DEFAULT optimisation of a glTF/GLB model before it is
// used in a scene. Default passes never change what is rendered: dedup (identical accessors/textures/materials),
// prune (unused nodes/materials/textures), weld (merge identical vertices -> indexed geometry). Textures are kept at
// full resolution (no recompression: image quality stays exactly as authored). Optional --simplify <ratio> reduces
// triangles of DISTANT background props only (meshoptimizer, error-bounded); never use it on hero objects.
//   node optimize-gltf.mjs in.gltf out.glb [--simplify 0.5 --error 0.001]
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, weld, simplify } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import { statSync, readdirSync } from "node:fs";
const dirBytes = (d) => readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? dirBytes(join(d, e.name)) : statSync(join(d, e.name)).size), 0);
import { dirname, join } from "node:path";

const [inp, out] = process.argv.slice(2);
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
if (!inp || !out) { console.error("usage: optimize-gltf.mjs in.gltf|in.glb out.glb [--simplify ratio --error e]"); process.exit(2); }
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const stats = (d) => { let tris = 0, verts = 0; for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const pos = p.getAttribute("POSITION"), idx = p.getIndices(); verts += pos ? pos.getCount() : 0; tris += (idx ? idx.getCount() : pos ? pos.getCount() : 0) / 3; } return { meshes: d.getRoot().listMeshes().length, materials: d.getRoot().listMaterials().length, textures: d.getRoot().listTextures().length, verts, tris: Math.round(tris) }; };
const bounds = (d) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (const m of d.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const a = p.getAttribute("POSITION"); if (!a) continue; const mn = a.getMinNormalized ? a.getMin([]) : a.getMin([]), mx = a.getMax([]); for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], mn[i]); hi[i] = Math.max(hi[i], mx[i]); } } return [lo, hi].map((v) => v.map((x) => +x.toFixed(5))); };
const before = stats(doc), b0 = bounds(doc);
const passes = [dedup(), prune(), weld()];
const ratio = arg("simplify", 0);
if (ratio > 0 && ratio < 1) { await MeshoptSimplifier.ready; passes.push(simplify({ simplifier: MeshoptSimplifier, ratio, error: arg("error", 0.001) })); }
await doc.transform(...passes);
await io.write(out, doc);
const after = stats(doc), b1 = bounds(doc);
const inBytes = inp.endsWith(".gltf") ? dirBytes(dirname(inp)) : statSync(inp).size;
console.log(JSON.stringify({ input: inp, output: out, before, after, bytes: { in: inBytes, out: statSync(out).size }, boundsUnchanged: JSON.stringify(b0) === JSON.stringify(b1), simplify: ratio || null }, null, 1));
