// Sound-event module for the full London Bridge film (consumed by scripts/export-events.ts -> audio/mix_events.py).
// Every event is derived from the animation data of its act; the approved Reopening events are reused unchanged,
// offset to the film timeline (frame 1481 = 49.37 s, verified by cross-correlation).
import { hookSoundEvents } from "../../desert/desertHook";
import { londonSoundEvents } from "./londonTimeline";
import { seaSoundEvents } from "./SeaSet";
import { worksSoundEvents } from "./worksTimeline";
import { soundEvents as reopeningEvents } from "../reopening/scene";
import { FILM_FRAMES, SW } from "./timeline";

export const FPS = 30;
export { FILM_FRAMES };
export type SoundEvent = { frame: number; kind: string; x: number; gain: number; note?: string };
// v2: transitions are cross-dissolves (no curtain whooshes / dust gust); the ambience timeline crossfades under them.
const inRange = (a: number, b: number) => (e: SoundEvent) => e.frame >= a && e.frame < b;
export const soundEvents = (): SoundEvent[] => [
  ...hookSoundEvents().filter(inRange(0, SW.london)),
  ...londonSoundEvents().filter(inRange(SW.london - 40, SW.sea)),
  ...seaSoundEvents().filter(inRange(SW.sea, SW.works)),
  ...worksSoundEvents().filter(inRange(SW.works - 30, SW.reopen)),
  ...reopeningEvents().map((e) => ({ ...e, frame: e.frame + SW.reopen })).filter(inRange(SW.reopen, FILM_FRAMES)),
].sort((a, b) => a.frame - b.frame);
