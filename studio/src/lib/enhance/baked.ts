// Optional enhancement (off unless a scene imports it): play back rigid-body motion baked offline by
// tools/tf-ext/bake-physics.mjs (Rapier). Pure function of the video frame -> deterministic and safe for the parallel
// cloud renderer (every chunk reads the same baked track; nothing is simulated at render time).
import type { V3 } from "../math";

export type BakedPhysics = { fps: number; frames: number; startFrame: number; engine?: string; bodies: Record<string, number[][]> };
export type BakedPose = { pos: V3; quat: [number, number, number, number] };
/** pose of body `id` at video frame f (holds the first / last baked pose outside the baked range) */
export const bakedPose = (bake: BakedPhysics, id: string, f: number): BakedPose => {
  const tr = bake.bodies[id]; if (!tr) throw new Error(`no baked body ${id}`);
  const i = Math.max(0, Math.min(tr.length - 1, Math.round(f - bake.startFrame))), p = tr[i];
  return { pos: [p[0], p[1], p[2]], quat: [p[3], p[4], p[5], p[6]] };
};
