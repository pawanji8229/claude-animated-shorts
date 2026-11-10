#!/usr/bin/env node
// Phase 7 scene audit: renders selected frames with inputProps.__audit and prints each canvas's [audit] report
// (triangles, draw calls, meshes, instanced draws, textures, primitive-placeholder candidates covering >4% of frame).
// node pipeline/audit_scenes.mjs <Composition> <frames,...> [out.json]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const [, , comp, list, out = "out/audit.json"] = process.argv; const frames = list.split(",").map(Number);
const ip = { __audit: true, __singleRender: true }, exe = ["/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"].find(existsSync) ?? null;
const serveUrl = await bundle({ entryPoint: resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable: exe, chromiumOptions: { gl: "swangle" } });
const composition = await selectComposition({ serveUrl, id: comp, inputProps: ip, puppeteerInstance: browser });
const rows = []; mkdirSync("out", { recursive: true });
for (const frame of frames) {
  const got = [];
  await renderStill({ composition, serveUrl, inputProps: ip, frame, output: `out/audit_${frame}.png`, scale: 0.25, puppeteerInstance: browser, chromiumOptions: { gl: "swangle" }, timeoutInMilliseconds: 300000,
    onBrowserLog: (l) => { if (l.text.startsWith("[audit] ")) got.push(JSON.parse(l.text.slice(8))); } });
  const last = new Map(); for (const g of got) last.set(g.label, g);   // last draw before capture = fully loaded scene
  for (const g of last.values()) { rows.push(g); console.log(JSON.stringify({ frame, label: g.label, tris: g.tris, meshes: g.meshes, instanced: g.instanced, textures: g.textures, placeholders: g.placeholders.length, top: g.placeholders.slice(0, 3) })); }
}
await browser.close({ silent: true }); writeFileSync(out, JSON.stringify(rows, null, 1));
