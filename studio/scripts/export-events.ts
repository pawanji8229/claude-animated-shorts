// Dump animation-derived sound events (frame-accurate) for the audio pipeline.
import { writeFileSync } from "node:fs";
import { hookSoundEvents, FILM_FRAMES, FPS } from "../src/desert/desertHook";
const ev = hookSoundEvents();
writeFileSync(process.argv[2] ?? "productions/london-bridge/events_act1.json", JSON.stringify({ fps: FPS, frames: FILM_FRAMES, events: ev }, null, 1));
console.log(`exported ${ev.length} events`);
