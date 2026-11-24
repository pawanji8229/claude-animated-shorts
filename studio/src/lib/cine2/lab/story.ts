// Shared demo story for the Camera / Lighting / World laboratories and the automated tests: a TwistFrame character in a
// small town square with a 34 m clock tower, a crate "artifact" on a table, a wall and lamp posts. Pure data.
import type { Script } from "../../../char/tf2/planner";
import { TF2_HERO } from "../../../char/tf2/costume";
import type { Obstacle } from "../cam/collide";
import { tf2Subject, type SubjectDef, type Beat, type V3 } from "../cam";

export const TOWER: V3 = [-6, 0, -14];
export const TABLE: V3 = [2.4, 0, -1.2];
export const HERO_SCRIPT: Script = {
  id: "hero", seed: 21, costume: TF2_HERO, start: [-3.2, 3.2], facing: Math.PI * 0.8,
  actions: [
    { kind: "walk", f0: 20, f1: 150, to: [1.2, -0.4], style: "curious" },
    { kind: "turn", f0: 152, f1: 172, face: 0.9 },
    { kind: "gesture", f0: 200, f1: 250, g: "point", dir: [-0.45, 0.35, -0.82] },
    { kind: "look", f0: 196, f1: 260, at: [-6, 14, -14] },
    { kind: "reach", f0: 290, f1: 340, side: 1, at: [2.2, 0.95, -1.0] },
  ],
  emotions: [{ f: 0, mix: [{ e: "curiosity", level: 2 }] }, { f: 196, mix: [{ e: "surprise", level: 4 }], ease: 4 }, { f: 280, mix: [{ e: "happiness", level: 3 }] }],
};
export const STORY_FRAMES = 420;
export const subjects = (): Record<string, SubjectDef> => ({
  hero: tf2Subject(HERO_SCRIPT, "hero"),
  tower: { id: "tower", kind: "structure", height: 34, width: 7, importance: 0.9, at: () => TOWER, facingAt: () => 0.35 },
  artifact: { id: "artifact", kind: "object", height: 1.15, width: 0.8, importance: 0.8, at: () => TABLE, facingAt: () => 0.4 },
});
/** the set's solid geometry for collision and line-of-sight tests */
export const SET_OBSTACLES: Obstacle[] = [
  { kind: "box", id: "tower", min: [TOWER[0] - 3.5, 0, TOWER[2] - 3.5], max: [TOWER[0] + 3.5, 34, TOWER[2] + 3.5] },
  { kind: "box", id: "rowNorth", min: [-30, 0, -26], max: [30, 14, -20] },
  { kind: "box", id: "rowWest", min: [-26, 0, -20], max: [-18, 12, 20] },
  { kind: "box", id: "rowEast", min: [14, 0, -20], max: [22, 11, 12] },
  { kind: "box", id: "table", min: [TABLE[0] - 0.6, 0, TABLE[2] - 0.45], max: [TABLE[0] + 0.6, 0.8, TABLE[2] + 0.45] },
  { kind: "box", id: "wall", min: [5, 0, 1], max: [9, 2.2, 1.4] },
  { kind: "cyl", id: "lamp1", c: [-1.5, 0, 4.5], r: 0.12, h: 4.2 },
  { kind: "cyl", id: "lamp2", c: [4.5, 0, -4.5], r: 0.12, h: 4.2 },
  { kind: "box", id: "crates", min: [-5.2, 0, -2.6], max: [-3.8, 1.4, -1.4] },
];
/** the story as camera beats (what a narration-driven timeline would produce) */
export const STORY_BEATS: Beat[] = [
  { f0: 0, f1: 120, kind: "structure", subject: "tower", emotion: "grandeur", importance: 0.9, scene: "square", note: "narration: 'In the middle of the old square stands a tower...'" },
  { f0: 120, f1: 230, kind: "introduce", subject: "hero", emotion: "mystery", scene: "square", note: "'...and our curious friend has come to see it.'" },
  { f0: 230, f1: 300, kind: "surprise", subject: "hero", emotion: "surprise", importance: 0.9, scene: "square", note: "'...but something on the table catches his eye.'" },
  { f0: 300, f1: 420, kind: "object", subject: "hero", secondary: "artifact", emotion: "importance", importance: 0.8, scene: "square", note: "'A crate that has not been opened for a hundred years.'" },
];
