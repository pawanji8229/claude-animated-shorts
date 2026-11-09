// London Bridge full film — master timeline (frames @ 30 fps). See productions/london-bridge/PRODUCTION_PLAN.md.
import type { VeilSpec } from "./Veil";
export const FPS = 30;
export const FILM_FRAMES = 1771;            // 59.0106 s narration (master clock)
export const REOPEN_FROM = 1481;            // approved Reopening scene: audio offset 49.37 s = frame 1481.1 (x-corr 0.99998)
// world switch frames (each sits at the opaque peak of a veil)
export const SW = { london: 356, sea: 985, works: 1064, reopen: REOPEN_FROM } as const;
export const VEILS: VeilSpec[] = [
  { at: SW.london, kind: "cloud", dir: [0.1, 1.0] },
  { at: SW.sea, kind: "fog", dir: [-1.0, 0.1] },
  { at: SW.works, kind: "haze", dir: [1.0, -0.2] },
  { at: SW.reopen, kind: "spray", dir: [0.2, -1.0] },
  { at: FILM_FRAMES - 1 + 0.5, kind: "dust", dir: [1.0, 0.15] }, // loop gust: peaks across the end->start seam
];
