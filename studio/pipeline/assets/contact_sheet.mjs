#!/usr/bin/env node
// Render every library model with the AssetViewer composition (one bundle, one browser) and tile them into a
// labelled contact sheet for visual QA: node pipeline/assets/contact_sheet.mjs [out.png] [id ...]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
const out = resolve(process.argv[2] || "assets/contact_sheet.png"), ids0 = process.argv.slice(3);
const reg = JSON.parse(readFileSync("assets/registry.json", "utf8")).assets;
const ids = ids0.length ? ids0 : Object.keys(reg).filter((k) => reg[k].type === "model" && reg[k].file).sort();
const dir = join("out", "contact"); mkdirSync(dir, { recursive: true });
const browserExecutable = ["/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"].find(existsSync) ?? null;
const serveUrl = await bundle({ entryPoint: resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions: { gl: "swangle" } });
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id: "AssetViewer", inputProps: { id, __singleRender: true }, puppeteerInstance: browser });
  await renderStill({ composition, serveUrl, inputProps: { id, __singleRender: true }, output: join(dir, `${id}.png`), scale: 0.5, puppeteerInstance: browser, chromiumOptions: { gl: "swangle" }, timeoutInMilliseconds: 300000 });
  console.log("rendered", id);
}
await browser.close({ silent: true });
const inputs = ids.flatMap((id) => ["-i", join(dir, `${id}.png`)]);
const lab = ids.map((id, i) => `[${i}]drawtext=text='${id}':fontcolor=white:fontsize=16:box=1:boxcolor=black@0.6:x=6:y=6[l${i}]`).join(";");
const cols = 6, rows = Math.ceil(ids.length / cols);
const layout = ids.map((_, i) => `${(i % cols) * 360}_${Math.floor(i / cols) * 360}`).join("|");
execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", `${lab};${ids.map((_, i) => `[l${i}]`).join("")}xstack=inputs=${ids.length}:layout=${layout}:fill=black`, out]);
console.log("wrote", out, `${cols}x${rows}`);
