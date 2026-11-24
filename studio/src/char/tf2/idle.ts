// TF2 idle + eyes: the character is alive but never busy. Breathing, small weight shifts (feet stay planted), micro head
// motion, attention-driven saccades and a natural blink scheduler (variable interval and duration, occasional double
// blinks, slow blinks when sleepy/sad, faster when nervous). All deterministic from (frame, seed).
import { hash, noise1, smooth } from "./rig";

/** blink amount 0 (open) .. 1 (closed) at frame f. rate = blinks multiplier (1 = about every 3.6 s) */
export const blinkAt = (f: number, seed: number, rate = 1, slow = 0) => {
  const base = 108 / Math.max(0.3, rate); let t = -base * 2, k = 0;
  // walk the blink schedule backwards from f: events at irregular intervals (0.55..1.45 x base)
  let i = Math.floor(f / base) + 2; const ev: number[] = [];
  for (let n = 0; n < 6; n++, i--) { const t0 = i * base + (hash(i * 13.7 + seed) - 0.5) * base * 0.9; ev.push(t0); }
  let amt = 0;
  for (const t0 of ev) { const dur = 4 + Math.round(hash(t0 * 0.37 + seed) * 3) + slow * 8; const dt = f - t0;
    if (dt >= 0 && dt < dur) amt = Math.max(amt, Math.sin(Math.PI * Math.pow(dt / dur, 0.8)));
    const dbl = hash(t0 * 1.91 + seed * 3) < 0.16;                         // double blink
    if (dbl) { const d2 = dt - dur - 2; if (d2 >= 0 && d2 < dur) amt = Math.max(amt, Math.sin(Math.PI * d2 / dur)); } }
  void t; void k; return Math.min(1, amt);
};
/** saccade gaze: holds a fixation for 0.7..2.6 s, jumps in 3 frames (eyes lead), small drift during fixation */
export const saccade = (f: number, seed: number, amp = 0.35) => {
  const seg = 48; const i = Math.floor((f + hash(seed) * seg) / seg), t0 = i * seg - hash(seed) * seg, fr = f - t0;
  const tgt = (k: number): [number, number] => [(hash(k * 7.1 + seed) - 0.5) * 2 * amp, (hash(k * 3.3 + seed * 2) - 0.5) * amp];
  const a = tgt(i - 1), b = tgt(i), k = smooth(Math.min(1, fr / 3));
  return [a[0] + (b[0] - a[0]) * k + noise1(f * 0.05, seed) * 0.03, a[1] + (b[1] - a[1]) * k + noise1(f * 0.04, seed + 5) * 0.02] as [number, number];
};
/** idle body: breathing + weight shift (period ~6-9 s) + micro head motion; energy scales amplitudes (0.2 still .. 1.5 restless) */
export const idleBody = (f: number, seed: number, energy = 1) => {
  const br = Math.sin(f * 0.105 + seed);                                                    // ~3.4 s breath
  const shift = noise1(f / 210, seed + 11);                                                 // slow weight shift
  return { squash: br * 0.012, shoulders: br * 2.2, chest: Math.max(0, br) * 0.15, sway: shift * 7 * energy, hipRoll: shift * 0.035 * energy, knee: Math.max(0, shift) * 6 * energy,
    head: { yaw: noise1(f / 95, seed + 2) * 0.05 * energy, pitch: noise1(f / 120, seed + 3) * 0.03 * energy + br * 0.008, roll: noise1(f / 140, seed + 4) * 0.035 * energy } };
};
