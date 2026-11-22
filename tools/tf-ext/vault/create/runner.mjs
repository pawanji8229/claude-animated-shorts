#!/usr/bin/env node
// Original-model creation runner: serves three.js (from the project's existing install) + the builder page locally,
// opens headless Chromium (Playwright, preinstalled), builds the requested model, exports a binary GLB, renders a product
// preview still (1600x1200 PNG -> JPG <= 2 MiB for the vault), then validates the GLB statically (quality.mjs).
//   node runner.mjs <model> --out <dir>      (model = file name in models/, e.g. camouflage_house)
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import { createRequire } from "node:module";
const here = path.dirname(fileURLToPath(import.meta.url)), threeDir = path.resolve(here, "../../../../studio/node_modules/three");
const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const MIME = { ".js": "text/javascript", ".html": "text/html", ".json": "application/json", ".wasm": "application/wasm" };
export async function create(model, out) {
  fs.mkdirSync(out, { recursive: true });
  const srv = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, "http://x").pathname); const f = u.startsWith("/three/") ? path.join(threeDir, u.slice(7)) : path.join(here, u === "/" ? "page.html" : u);
    if (!f.startsWith(threeDir) && !f.startsWith(here)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(f)] ?? "application/octet-stream" }).end(b); }); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const port = srv.address().port;
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try { const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } }); const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    await page.goto(`http://127.0.0.1:${port}/page.html?model=${encodeURIComponent(model)}`); await page.waitForFunction(() => window.__ready || false, null, { timeout: 300000 }).catch(() => { throw new Error(`builder failed: ${errs.join(" | ")}`); });
    const glb = Buffer.from(await page.evaluate(() => window.__exportGLB()), "base64"), meta = await page.evaluate(() => window.__meta);
    const png = Buffer.from((await page.evaluate(() => window.__preview(1600, 1200))).split(",")[1], "base64");
    const back = meta.backView ? Buffer.from((await page.evaluate((v) => window.__preview(1600, 1200, v), meta.backView)).split(",")[1], "base64") : null;
    fs.writeFileSync(path.join(out, `${model}.glb`), glb); fs.writeFileSync(path.join(out, `${model}_preview.png`), png); if (back) fs.writeFileSync(path.join(out, `${model}_back.png`), back);
    const sharp = (await import("sharp")).default; let q = 90, jpg; do { jpg = await sharp(png).jpeg({ quality: q, mozjpeg: true }).toBuffer(); q -= 5; } while (jpg.length > 2 * 1048576 && q > 50);
    fs.writeFileSync(path.join(out, `${model}_preview.jpg`), jpg); if (errs.length) console.warn("page warnings:", errs.slice(0, 5));
    return { glb: path.join(out, `${model}.glb`), preview: path.join(out, `${model}_preview.jpg`), bytes: glb.length, previewBytes: jpg.length, meta };
  } finally { await browser.close(); srv.close(); }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const [model] = process.argv.slice(2), i = process.argv.indexOf("--out"); const r = await create(model, i > 0 ? process.argv[i + 1] : path.join(here, "out", model)); console.log(JSON.stringify(r, null, 1)); }
