// Render a list of stills from one composition with a single bundle (QC helper).
// usage: node scripts/stills.mjs <Composition> <outDir> <frame,frame,...> [scale]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
const [comp, out, frames, scale = "1"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions: { gl: "swangle" } });
const composition = await selectComposition({ serveUrl, id: comp, puppeteerInstance: browser, timeoutInMilliseconds: 240000 });
for (const f of frames.split(",").map(Number)) {
  const t = Date.now();
  await renderStill({ serveUrl, composition, frame: f, output: path.join(out, `f${String(f).padStart(4, "0")}.png`), puppeteerInstance: browser, scale: Number(scale), timeoutInMilliseconds: 240000, chromiumOptions: { gl: "swangle" } });
  console.log(`frame ${f} ${((Date.now() - t) / 1000).toFixed(1)}s`);
}
await browser.close({ silent: true });
