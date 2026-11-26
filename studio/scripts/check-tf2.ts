// TF2 diagnostics over the lab motion reel: head-body gap, limb lengths, overreach, floor penetration, NaN, and world
// foot slide while planted. Exit code 1 on any hard failure.
import { MOTION } from "../src/char/tf2/lab/scripts";
import { checkScript } from "../src/char/tf2/validate";
let hard = 0; const rows: string[] = [];
for (const seg of MOTION) for (const sc of seg.scripts) {
  const r = checkScript(sc, 0, Math.round(seg.dur) - 1, [0, 1.2, 14]);
  const by: Record<string, number> = {}; for (const i of r.issues) by[i.check] = (by[i.check] ?? 0) + 1;
  const hardN = Object.entries(by).filter(([k]) => !k.includes("overreach")).reduce((a, [, v]) => a + v, 0); hard += hardN;
  rows.push(`${hardN ? "FAIL" : "ok  "} ${seg.title.padEnd(62)} slide ${(r.maxSlideM * 100).toFixed(2)} cm  ${JSON.stringify(by)}`);
}
console.log(rows.join("\n")); console.log(hard ? `\n${hard} hard issues` : "\nall hard checks pass"); process.exit(hard ? 1 : 0);
