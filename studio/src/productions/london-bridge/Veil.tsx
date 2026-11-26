// Atmospheric pass-through veil (clouds / sea fog / heat haze / spray / dust): the camera keeps moving while the
// frame fills with soft, fast-drifting volumes, peaks opaque for a few frames (the world is swapped there), then
// clears. Procedural, deterministic per frame, no text. Drawn on a 2D canvas over the 3D render.
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

export type VeilKind = "cloud" | "fog" | "haze" | "spray" | "dust";
export type VeilSpec = { at: number; kind: VeilKind; dir: [number, number] }; // `at` = swap frame (peak); dir = drift
const PAL: Record<VeilKind, [string, string, string]> = {
  cloud: ["#fff7ec", "#ffe2bf", "#f4f1f7"], fog: ["#c9d6df", "#aebfcc", "#e3eaef"], haze: ["#f3c58d", "#e9a868", "#fbe2bd"],
  spray: ["#e9f6f8", "#bfe4ea", "#ffffff"], dust: ["#d9a46a", "#c88a52", "#f0c992"],
};
const IN = 9, HOLD = 2, OUT = 11; // frames: ramp in, opaque half-width, ramp out
const sm = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
export const veilAmount = (v: VeilSpec, f: number) => {
  const d = f - v.at;
  if (d < -HOLD - IN || d > HOLD + OUT) return 0;
  if (Math.abs(d) <= HOLD) return 1;
  return d < 0 ? sm((d + HOLD + IN) / IN) : 1 - sm((d - HOLD) / OUT);
};
const rnd = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

export const Veil: React.FC<{ f: number; veils: VeilSpec[]; loopFrames?: number }> = ({ f, veils, loopFrames }) => {
  const { width: W, height: H } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  // a veil can wrap around the loop point (end -> start)
  const active = veils.map((v) => {
    let a = veilAmount(v, f), df = f - v.at;
    if (loopFrames) { const a2 = veilAmount(v, f + loopFrames), a3 = veilAmount(v, f - loopFrames); if (a2 > a) { a = a2; df = f + loopFrames - v.at; } if (a3 > a) { a = a3; df = f - loopFrames - v.at; } }
    return { v, a, df };
  }).filter((x) => x.a > 0.001);
  useLayoutEffect(() => {
    const cv = ref.current; if (!cv) return; const g = cv.getContext("2d")!; g.clearRect(0, 0, W, H);
    for (const { v, a, df } of active) {
      const [c0, c1, c2] = PAL[v.kind];
      // base wash (only becomes solid at the peak)
      g.globalAlpha = Math.pow(a, 2.2); g.fillStyle = c0; g.fillRect(0, 0, W, H);
      // 46 soft volumes streaming past the lens (they expand + drift: reads as flying through)
      for (let i = 0; i < 46; i++) {
        const sp = 0.6 + rnd(i, 1) * 1.4, life = ((df * 0.035 * sp + rnd(i, 2)) % 1 + 1) % 1;
        const r = (0.18 + 0.5 * rnd(i, 3)) * Math.max(W, H) * (0.5 + 1.3 * life);
        const x = (rnd(i, 4) + v.dir[0] * df * 0.012 * sp) % 1.4 - 0.2, y = (rnd(i, 5) + v.dir[1] * df * 0.012 * sp) % 1.4 - 0.2;
        const gr = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, r);
        const col = [c0, c1, c2][i % 3];
        gr.addColorStop(0, col); gr.addColorStop(1, col + "00");
        g.globalAlpha = Math.min(1, a * 1.25) * (0.35 + 0.4 * rnd(i, 6)) * Math.sin(Math.PI * life);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
      }
    }
    g.globalAlpha = 1;
  });
  if (!active.length) return null;
  return <AbsoluteFill style={{ pointerEvents: "none" }}><canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} /></AbsoluteFill>;
};
