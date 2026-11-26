// Render the three QA preview stills (start / middle / end) of a composition.
// Usage: node scripts/render-stills.mjs [Composition] [outDir] [frames]
//   env BROWSER=/path/to/chrome-headless-shell to use a preinstalled browser; GL=swangle|angle
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const comp = process.argv[2] ?? "InventorWalkInPreview";
const outDir = process.argv[3] ?? "out/stills";
const frames = (process.argv[4] ?? "8,70,140").split(",").map(Number);
mkdirSync(outDir, { recursive: true });
for (const f of frames) {
  const out = `${outDir}/${comp}_f${String(f).padStart(3, "0")}.png`;
  const args = ["remotion", "still", "src/index.ts", comp, out, `--frame=${f}`, `--gl=${process.env.GL ?? "swangle"}`];
  if (process.env.BROWSER) args.push(`--browser-executable=${process.env.BROWSER}`);
  if (process.env.PROPS) args.push(`--props=${process.env.PROPS}`);
  console.log(`> npx ${args.join(" ")}`);
  execFileSync("npx", args, { stdio: "inherit" });
}
