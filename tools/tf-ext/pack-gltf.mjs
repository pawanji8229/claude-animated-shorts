#!/usr/bin/env node
// TwistFrame optional tool: geometry + texture optimisation with gltfpack (meshoptimizer, MIT; WebAssembly build, no
// native install). Two presets so hero assets keep their quality:
//   hero        reorder + vertex-cache / overdraw optimisation only (-noq: no quantisation, no simplification) => looks identical
//   background  additionally simplify to `--ratio` (default 0.5) with a locked border, quantised attributes (-si -slb)
//   node pack-gltf.mjs in.glb out.glb [--preset hero|background] [--ratio 0.5]
// Textures are copied unchanged (KTX2/WebP recompression is deliberately not enabled: it would change the look).
import { pack } from "gltfpack";
import fs from "node:fs";
export const packArgs = (inp, out, preset = "hero", ratio = 0.5) => preset === "background" ? ["-i", inp, "-o", out, "-si", String(ratio), "-slb", "-kn", "-km"] : ["-i", inp, "-o", out, "-noq", "-kn", "-km"];
if (import.meta.url === `file://${process.argv[1]}`) {
  const [inp, out] = process.argv.slice(2), v = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
  if (!inp || !out) { console.error("usage: pack-gltf.mjs in.glb out.glb [--preset hero|background] [--ratio 0.5]"); process.exit(2); }
  const log = await pack(packArgs(inp, out, v("preset", "hero"), Number(v("ratio", 0.5))), { read: (p) => fs.readFileSync(p), write: (p, d) => fs.writeFileSync(p, d) });
  process.stdout.write(log);
}
