#!/usr/bin/env node
// Simplify heavy GLBs in place (meshoptimizer, error-bounded): node simplify-glb.mjs <ratio> file.glb [...]
import { NodeIO } from "@gltf-transform/core"; import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { simplify, weld } from "@gltf-transform/functions"; import { MeshoptSimplifier } from "meshoptimizer";
const [ratio, ...files] = process.argv.slice(2); const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); await MeshoptSimplifier.ready;
const tris = (d) => d.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).reduce((t, p) => t + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0);
for (const f of files) { const d = await io.read(f), t0 = tris(d); await d.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: 0.004 })); await io.write(f, d); console.log(f, Math.round(t0), "->", Math.round(tris(d))); }
