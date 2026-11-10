// Quality profiles for library scenes (inputProps.__quality, set by pipeline/render_fast.mjs --profile).
// Spend render cost where the viewer sees it: shadow-map resolution and post supersampling scale with output size;
// geometry/material detail does NOT drop between profiles (story actions and silhouettes must read the same).
import { getInputProps } from "remotion";
export type QualityName = "quick" | "story" | "final";
export type Quality = { name: QualityName; shadowMap: number; ss: number; ao: number; dof: boolean; envRes: number; lodNear: number; dpr: number };
// dpr = WebGL drawing-buffer scale. Remotion's --scale alone does NOT reduce 3D cost (measured: identical s/frame at
// scale 1, 0.5, 0.25) because R3F clamps devicePixelRatio to >= 1; previews must lower the canvas resolution itself.
const Q: Record<QualityName, Quality> = {
  quick: { name: "quick", shadowMap: 1024, ss: 1, ao: 0, dof: false, envRes: 128, lodNear: 14, dpr: 0.25 },
  story: { name: "story", shadowMap: 2048, ss: 1, ao: 0.4, dof: true, envRes: 256, lodNear: 20, dpr: 0.5 },
  final: { name: "final", shadowMap: 2048, ss: 1, ao: 0.5, dof: true, envRes: 256, lodNear: 28, dpr: 1 },
};
export const quality = (): Quality => { try { const n = (getInputProps() as { __quality?: QualityName }).__quality; return Q[n ?? "final"] ?? Q.final; } catch { return Q.final; } };
