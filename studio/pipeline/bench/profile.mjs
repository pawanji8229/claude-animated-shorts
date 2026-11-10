// TwistFrame Lab — pipeline profiler (Phase 1). Measures each stage separately with one bundle + one browser:
//   bundle, browser start, composition select, per-scene frame rendering (with in-browser GPU stage timing from
//   Post's opt-in [bench] logs), and blank-composition overhead (screenshot + Remotion plumbing, no 3D).
// Usage: node pipeline/bench/profile.mjs --out <dir> [--comp LondonBridgeFull] [--scenes name:a-b,...]
//        [--concurrency 1] [--gl swangle] [--scale 1] [--format jpeg|png] [--bench 1]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderFrames, selectComposition } from "@remotion/renderer";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import os from "node:os";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const out = resolve(arg("out", "out/bench")), comp = arg("comp", "LondonBridgeFull"), gl = arg("gl", "swangle");
const conc = Number(arg("concurrency", 1)), scale = Number(arg("scale", 1)), format = arg("format", "jpeg"), bench = arg("bench", "1") === "1", single = arg("single", "0") === "1";
const scenes = arg("scenes", "closeup:690-697,city:400-407,vehicles:1100-1107,water_ship:1000-1007,crowd:1600-1607,transition:985-992")
  .split(",").map((s) => { const [n, r] = s.split(":"); const [a, b] = r.split("-").map(Number); return { n, a, b }; });
mkdirSync(out, { recursive: true });
const T = () => performance.now(), R = { host: { cpus: os.cpus().length, cpuModel: os.cpus()[0].model, memGB: +(os.totalmem() / 2 ** 30).toFixed(1) }, settings: { comp, gl, conc, scale, format, bench, single }, stages: {}, scenes: [] };
let t = T();
const serveUrl = await bundle({ entryPoint: resolve("src/index.ts"), webpackOverride: (c) => c });
R.stages.bundleMs = Math.round(T() - t); t = T();
const browserExecutable = [process.env.REMOTION_BROWSER, "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell"].find((p) => p && existsSync(p)) ?? null;
const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions: { gl } });
R.stages.browserStartMs = Math.round(T() - t);
const logs = [];
const rawLog = [];
const onBrowserLog = (l) => { if (l.text.startsWith("[bench] ")) { const j = JSON.parse(l.text.slice(8)); logs.push(j); rawLog.push(j); } };
for (const id of [comp, "BenchBlank"]) {
  t = T();
  const composition = await selectComposition({ serveUrl, id, inputProps: { __bench: bench, __singleRender: single }, puppeteerInstance: browser, browserExecutable, chromiumOptions: { gl }, timeoutInMilliseconds: 400000 });
  R.stages[`select_${id}_Ms`] = Math.round(T() - t);
  const list = id === "BenchBlank" ? [{ n: "blank_overhead", a: 0, b: 15 }] : scenes;
  for (const sc of list) {
    const dir = join(out, "frames", sc.n); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    logs.length = 0; const per = [];
    let cpu0 = process.cpuUsage(); t = T();
    await renderFrames({ composition, serveUrl, inputProps: { __bench: bench, __singleRender: single }, frameRange: [sc.a, sc.b], outputDir: dir, imageFormat: format, ...(format === "jpeg" ? { jpegQuality: 92 } : {}), scale,
      concurrency: conc, puppeteerInstance: browser, browserExecutable, chromiumOptions: { gl }, timeoutInMilliseconds: 400000, onBrowserLog,
      onFrameUpdate: (_n, _f, ms) => per.push(ms), onStart: () => {} });
    const wall = T() - t, n = sc.b - sc.a + 1, avg = (k) => logs.length ? +(logs.reduce((s, x) => s + x[k], 0) / logs.length).toFixed(1) : null;
    const loadavg = os.loadavg()[0];
    const row = { scene: sc.n, frames: [sc.a, sc.b], wallMs: Math.round(wall), msPerFrame: Math.round(wall / n), fps: +(n / (wall / 1000)).toFixed(3),
      perFrameMs: per.length ? Math.round(per.reduce((s, x) => s + x, 0) / per.length) : null,
      gpu: logs.length ? { sceneWithShadows: avg("sceneWithShadows"), sceneNoShadowUpdate: avg("sceneNoShadowUpdate"), shadowUpdate: +(avg("sceneWithShadows") - avg("sceneNoShadowUpdate")).toFixed(1), post: avg("post"), ss: logs[0].ss, calls: avg("calls"), tris: avg("tris"), canvases: +(logs.length / n).toFixed(2) } : null,
      load1m: +loadavg.toFixed(2) };
    row.perFrameList = per.map(Math.round); row.raw = logs.slice(); R.scenes.push(row); console.log(JSON.stringify({ ...row, raw: undefined }));
  }
}
await browser.close({ silent: true });
writeFileSync(join(out, "profile.json"), JSON.stringify(R, null, 2));
console.log("wrote", join(out, "profile.json"));
