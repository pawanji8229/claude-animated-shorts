#!/usr/bin/env node
// TwistFrame Lab — fast renderer (pipeline v3). Replaces one `npx remotion render` process per batch with:
//   * ONE webpack bundle and ONE Chromium for every batch (render_batches.mjs re-bundled + relaunched per batch)
//   * __singleRender: each frame's 3D scene + post is drawn once, not twice (measured identical pixels)
//   * measured-best concurrency for this host (pipeline/bench results), quality profiles A/B/C
//   * resumable batches written atomically (tmp file -> rename), so an interrupted job never loses finished work
//   * identical encoder settings per batch -> stream-copy concat, audio muxed once
// Usage: node pipeline/render_fast.mjs --comp <id> --frames a-b --out out/x.mp4 [--profile quick|story|final]
//        [--batch 150] [--concurrency N] [--audio mix.wav] [--resume] [--legacy-double-render]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import os from "node:os";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(`--${k}`);
const here = (p) => new URL(p, import.meta.url);
const cfg = JSON.parse(readFileSync(here("../twistframe.config.json")));
const profiles = JSON.parse(readFileSync(here("./profiles.json")));
const prof = profiles[arg("profile", "final")]; if (!prof) throw new Error("unknown profile");
const comp = arg("comp"), [a, b] = (arg("frames") || "").split("-").map(Number), out = resolve(arg("out", "out/render.mp4"));
const batch = Number(arg("batch", cfg.render.batchFrames)), audio = arg("audio"), gl = arg("gl", cfg.render.gl);
const concurrency = Number(arg("concurrency", cfg.render.concurrency ?? Math.max(1, os.cpus().length)));
const crf = Number(arg("crf", prof.crf)), x264Preset = arg("x264-preset", prof.x264Preset), scale = Number(arg("scale", prof.scale));
if (!comp || !(b >= a)) { console.error("usage: --comp <id> --frames a-b [--profile final] [--out file] [--audio wav] [--resume]"); process.exit(2); }
const browserExecutable = [process.env.REMOTION_BROWSER, cfg.render.browserExecutable, "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"].find((p) => p && existsSync(p)) ?? null;
const inputProps = { __singleRender: !has("legacy-double-render"), __quality: prof.quality };
const dir = join(dirname(out), "batches"); mkdirSync(dir, { recursive: true });
const log = join(dirname(out), "render_fast.log.jsonl");
const T = () => performance.now();
let t = T();
const serveUrl = await bundle({ entryPoint: resolve("src/index.ts") });
const bundleMs = T() - t; t = T();
const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions: { gl } });
const composition = await selectComposition({ serveUrl, id: comp, inputProps, puppeteerInstance: browser, browserExecutable, chromiumOptions: { gl }, timeoutInMilliseconds: cfg.render.delayRenderTimeoutMs });
console.log(`bundle ${(bundleMs / 1000).toFixed(1)} s, browser+select ${((T() - t) / 1000).toFixed(1)} s | ${comp} ${composition.width}x${composition.height} @${scale} | concurrency ${concurrency} | ${prof.label}`);
const parts = [];
for (let s = a; s <= b; s += batch) {
  const e = Math.min(b, s + batch - 1), f = join(dir, `b_${String(s).padStart(5, "0")}-${String(e).padStart(5, "0")}.mp4`);
  parts.push(f);
  if (has("resume") && existsSync(f) && statSync(f).size > 1000) { console.log(`skip ${f}`); continue; }
  const tmp = f.replace(/\.mp4$/, ".partial.mp4"); t = T();
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: tmp, inputProps, frameRange: [s, e], concurrency, scale, crf, x264Preset,
    pixelFormat: "yuv420p", imageFormat: "jpeg", jpegQuality: 92, muted: true, puppeteerInstance: browser, browserExecutable, chromiumOptions: { gl },
    timeoutInMilliseconds: cfg.render.delayRenderTimeoutMs, overwrite: true });
  renameSync(tmp, f);   // atomic: a batch file only exists once it is complete
  const sec = (T() - t) / 1000, n = e - s + 1;
  console.log(`  ${s}-${e}: ${sec.toFixed(0)} s (${(sec / n).toFixed(2)} s/frame)`);
  appendFileSync(log, JSON.stringify({ comp, s, e, sec: +sec.toFixed(1), perFrame: +(sec / n).toFixed(3), concurrency, scale, profile: prof.quality, at: new Date().toISOString() }) + "\n");
}
await browser.close({ silent: true });
const list = join(dir, "concat.txt"); writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
const joined = audio ? out.replace(/\.mp4$/, "_video.mp4") : out;
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined], { stdio: "inherit" });
if (audio) {
  const dur = ((b - a + 1) / cfg.video.fps).toFixed(4);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", joined, "-ss", (a / cfg.video.fps).toFixed(4), "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", cfg.audio.aacBitrate, "-t", dur, "-movflags", "+faststart", out], { stdio: "inherit" });
}
console.log(`wrote ${out}`);
