// Dump animation-derived sound events for any production.
// npx tsx scripts/export-events.ts <scene-module.ts> <out.json>
// The module must export soundEvents(): {frame, kind, x, gain, note}[], plus FPS and FILM_FRAMES.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const mod = process.argv[2] ?? "src/desert/desertHook.ts", out = process.argv[3] ?? "productions/london-bridge/events_act1.json";
(async () => {
  const m = await import(pathToFileURL(resolve(mod)).href);
  const ev = (m.soundEvents ?? m.hookSoundEvents)();
  writeFileSync(out, JSON.stringify({ fps: m.FPS, frames: m.FILM_FRAMES, events: ev }, null, 1));
  console.log(`exported ${ev.length} events -> ${out}`);
})();
