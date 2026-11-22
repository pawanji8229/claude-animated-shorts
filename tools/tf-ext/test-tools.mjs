// Non-rendering tests for the optional tf-ext tools (no video, no browser): builds a small glTF in memory, inspects it,
// packs it with both gltfpack presets, and builds a howler sprite map from a cue sheet.   node test-tools.mjs [cue_sheet.csv]
import assert from "node:assert/strict";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { pack } from "gltfpack";
import { inspect } from "./inspect-gltf.mjs";
import { packArgs } from "./pack-gltf.mjs";
import { spriteFromCues, parseCsv } from "./audio-sprite.mjs";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tfext-")), src = path.join(dir, "fuselage.glb");
// a 22.66 m long "fuselage" tube made of 64x16 quads (stand-in for an imported aircraft model)
const doc = new Document(), buf = doc.createBuffer(), pos = [], idx = [], S = 64, R = 16;
for (let i = 0; i <= S; i++) for (let j = 0; j <= R; j++) { const a = (j / R) * 2 * Math.PI, x = (i / S) * 22.66 - 11.33, r = 1.2 * Math.sin(Math.PI * (0.08 + 0.84 * i / S)); pos.push(x, 2.5 + r * Math.cos(a), r * Math.sin(a)); }
for (let i = 0; i < S; i++) for (let j = 0; j < R; j++) { const p = i * (R + 1) + j; idx.push(p, p + R + 1, p + 1, p + 1, p + R + 1, p + R + 2); }
const prim = doc.createPrimitive().setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(new Float32Array(pos)).setBuffer(buf)).setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(idx)).setBuffer(buf)).setMaterial(doc.createMaterial("aluminium"));
doc.createScene("s").addChild(doc.createNode("b17").setMesh(doc.createMesh("fuselage").addPrimitive(prim)));
await new NodeIO().write(src, doc);
const io = { read: (p) => fs.readFileSync(p), write: (p, d) => fs.writeFileSync(p, d) };
let n = 0; const ok = (m) => { n++; console.log("ok ", m); };
const rep = await inspect(src, 22.66); assert.equal(rep.triangles, S * R * 2); assert.ok(Math.abs(rep.sizeMetres[0] - 22.66) < 1e-3); assert.equal(rep.longestAxis, "x"); assert.ok(Math.abs(rep.suggestedScale - 1) < 1e-4); assert.deepEqual(rep.materials, ["aluminium"]); ok("inspect-gltf: size in metres, triangles, scale suggestion");
const hero = path.join(dir, "hero.glb"); await pack(packArgs(src, hero, "hero"), io); const h = await inspect(hero, 22.66); assert.equal(h.triangles, rep.triangles); assert.ok(Math.abs(h.sizeMetres[0] - 22.66) < 1e-3); ok("pack-gltf hero: triangles + size unchanged");
const bg = path.join(dir, "bg.glb"); await pack(packArgs(src, bg, "background", 0.5), io); const g = await inspect(bg); assert.ok(g.triangles < rep.triangles, `${g.triangles} < ${rep.triangles}`); assert.ok(Math.abs(g.sizeMetres[0] - 22.66) < 0.05); ok(`pack-gltf background: ${rep.triangles} -> ${g.triangles} triangles, bounds kept`);
const csv = `trigger_frame,start_s,end_s,source / responsible object,generator,stem,level,pan\n96,2.200,3.800,"camera, over the roof",soft_whoosh,sfx,-32 dB,+0.10\n96,2.250,3.900,x,soft_whoosh,sfx,-32 dB,0\n0,0.000,51.6,bed,ambience_roof,bed,-25 LU,0`;
assert.equal(parseCsv(csv)[1][3], "camera, over the roof"); const sp = spriteFromCues(csv).sprite; assert.deepEqual(sp.soft_whoosh_f96, [2200, 1600]); assert.ok(sp.soft_whoosh_f96_2); assert.equal(Object.keys(sp).length, 2); ok("audio-sprite: quoted CSV, duplicate names, stem filter");
const real = process.argv[2]; if (real && fs.existsSync(real)) { const s = spriteFromCues(fs.readFileSync(real, "utf8")).sprite; assert.ok(Object.keys(s).length > 50); ok(`audio-sprite on a real cue sheet: ${Object.keys(s).length} sfx cues`); }
const Tone = await import("tone").catch((e) => ({ err: e.message })); ok(`tone module resolves (${Tone.err ? "browser-only: " + Tone.err.slice(0, 60) : "exports " + Object.keys(Tone).length})`);
const howler = await import("howler").then((m) => Object.keys(m)).catch((e) => "browser-only: " + e.message.slice(0, 60)); ok(`howler module resolves (${howler})`);
fs.rmSync(dir, { recursive: true, force: true }); console.log(`\n${n} tool tests passed`);
