// London Bridge full film — master timeline (frames @ 30 fps). See productions/london-bridge/PRODUCTION_PLAN.md.
export const FPS = 30;
export const FILM_FRAMES = 1771;            // 59.0106 s narration (master clock)
export const REOPEN_FROM = 1481;            // approved Reopening scene: audio offset 49.37 s = frame 1481.1 (x-corr 0.99998)
/** nominal world boundaries (centre of each cross-dissolve) */
export const SW = { london: 356, sea: 984, works: 1064, reopen: REOPEN_FROM } as const;
/** v2 transitions: true opacity cross-dissolves between two simultaneously rendered worlds (no curtains, no cuts).
 *  [a, b) = frames where both worlds are on screen; the incoming world's opacity eases 0 -> 1 across the window. */
export const XF = {
  hookLondon: [344, 368], londonSea: [972, 996], oceanLock: [1010, 1026], seaWorks: [1052, 1076],
  worksReopen: [REOPEN_FROM, REOPEN_FROM + 18],   // the Reopening is already underneath; the works layer fades OUT (matched camera)
  loop: [1747, FILM_FRAMES],                     // end -> frozen opening image (frame 0) fades IN, so frame 1770 ~ frame 0
} as const;
export const xfade = (w: readonly [number, number], f: number) => { const t = Math.min(1, Math.max(0, (f - w[0] + 1) / (w[1] - w[0]))); return t * t * (3 - 2 * t); };
