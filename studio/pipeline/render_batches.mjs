#!/usr/bin/env node
// TwistFrame Lab — batch renderer (Phase 9).
// node pipeline/render_batches.mjs --comp LondonBridgePreview --frames 0-1770 --batch 150 --out out/prod/video.mp4
//       [--audio mix.wav] [--crf 17] [--gl swangle] [--resume]
// Every batch uses identical encoder settings, so batches join losslessly (concat demuxer, stream copy) with no
// visible break; audio is muxed ONCE onto the joined video (no per-batch audio seams). Resumable: finished batches
// are kept and skipped on re-run.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(`--${k}`);
const cfg = JSON.parse(readFileSync(new URL("../twistframe.config.json", import.meta.url)));
const comp = arg("comp"), [a, b] = (arg("frames") || "").split("-").map(Number);
const batch = Number(arg("batch", cfg.render.batchFrames)), out = resolve(arg("out", "out/render.mp4"));
const crf = arg("crf", String(cfg.render.crf)), gl = arg("gl", cfg.render.gl), audio = arg("audio");
if (!comp || !(b >= a)) { console.error("usage: --comp <id> --frames a-b [--batch n] [--out file] [--audio wav]"); process.exit(2); }
const browser = [cfg.render.browserExecutable, "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"].find((p) => p && existsSync(p));
const dir = join(dirname(out), "batches"); mkdirSync(dir, { recursive: true });
const parts = [];
for (let s = a; s <= b; s += batch) {
  const e = Math.min(b, s + batch - 1), f = join(dir, `b_${String(s).padStart(5, "0")}-${String(e).padStart(5, "0")}.mp4`);
  parts.push(f);
  if (has("resume") && existsSync(f) && statSync(f).size > 1000) { console.log(`skip ${f}`); continue; }
  const args = ["remotion", "render", "src/index.ts", comp, f, `--frames=${s}-${e}`, "--codec=h264", `--crf=${crf}`, "--pixel-format=yuv420p", `--gl=${gl}`, "--muted", `--timeout=${cfg.render.delayRenderTimeoutMs}`];
  if (browser) args.push(`--browser-executable=${browser}`);
  const t0 = Date.now(); console.log(`render ${s}-${e} ...`);
  execFileSync("npx", args, { stdio: ["ignore", "ignore", "inherit"] });
  console.log(`  done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
const list = join(dir, "concat.txt"); writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
const joined = audio ? out.replace(/\.mp4$/, "_video.mp4") : out;
execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined], { stdio: "inherit" });
if (audio) {
  const dur = ((b - a + 1) / cfg.video.fps).toFixed(4);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", joined, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", cfg.audio.aacBitrate, "-t", dur, "-movflags", "+faststart", out], { stdio: "inherit" });
}
console.log(`wrote ${out}`);
