// World lab camera choice per (environment, mode): pure + testable. Every candidate is checked against the same 3D
// obstacle boxes Camera 2.0 uses (buildings, solid objects, the quay crane legs): the camera must not be inside anything
// and the line of sight to the look point must be clear. Interiors keep every camera inside the room shell.
import { add, sub, mul, norm, type V3 } from "../cam";
import { DEFS, type World, type Recipe } from "../world";
import { footprintOf, buildingFootprint, type Footprint } from "../world/place";

export type LabMode = "populated" | "basic" | "wide" | "detail" | "rich" | "night";
type Box3 = Footprint & { y0: number; id: string };
export const labBoxes = (recipe: Recipe, world: World): Box3[] => {
  const out: Box3[] = world.buildings.map((b) => ({ ...buildingFootprint(b), y0: 0, h: b.spec.floors * 3.2 + 1.2 }));
  for (const p of world.placements) { const d = DEFS.get(p.def)!;
    if (p.def === "quayCrane") { // non-solid for placement (ground under the portal stays usable) but its legs are real
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const c = Math.cos(p.ry), s = Math.sin(p.ry), lx = sx * d.size[0] * 0.42, lz = sz * d.size[2] * 0.42;
        out.push({ cx: p.pos[0] + lx * c + lz * s, cz: p.pos[2] - lx * s + lz * c, hw: 0.9, hd: 0.9, ry: p.ry, h: d.size[1] * p.scale, id: "quayCraneLeg", y0: p.pos[1] }); } continue; }
    if (!d.solid || d.place === "hang" || d.size[1] * p.scale < 0.6 || d.cat === "vegetation" || /tree|bush|hedge/i.test(d.id)) continue; // foliage is see-through-ish and often the framed subject
    out.push({ ...footprintOf(d, p.pos, p.ry, p.scale, p.id), y0: p.pos[1] }); }
  return out;
};
const inside = (p: V3, b: Box3, m = 0) => { const c = Math.cos(b.ry), s = Math.sin(b.ry), dx = p[0] - b.cx, dz = p[2] - b.cz, x = dx * c - dz * s, z = dx * s + dz * c;
  return Math.abs(x) < b.hw + m && Math.abs(z) < b.hd + m && p[1] > b.y0 - m && p[1] < b.y0 + b.h + m; };
/** first obstacle the camera is inside or that blocks the line of sight (ignoring the last `endSkip` m near the look point) */
export const viewBlocker = (pos: V3, look: V3, boxes: Box3[], endSkip = 1.2): string | null => {
  for (const b of boxes) if (inside(pos, b, 0.3)) return `camera inside ${b.id}`;
  const L = Math.hypot(...sub(look, pos)), n = Math.ceil(L / 0.25);
  for (let i = 1; i < n; i++) { const t = i / n; if (L * (1 - t) < endSkip) break; const p = add(pos, mul(sub(look, pos), t)); for (const b of boxes) if (inside(p, b)) return `view blocked by ${b.id}`; }
  return null;
};
const shellBox = (r: Recipe): [V3, V3] | null => { if (!r.shells.length) return null; const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const s of r.shells) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], s.box[0][i]); hi[i] = Math.max(hi[i], s.box[1][i]); } return [lo, hi]; };
/** the room's inner volume: shells are wall slabs, so the interior is the region inside them (inset 0.5 m) */
const clampIn = (p: V3, sb: [V3, V3]): V3 => [0, 1, 2].map((i) => Math.min(sb[1][i] - 0.7, Math.max(sb[0][i] + 0.7, p[i]))) as V3;

export const labCam = (mode: LabMode, recipe: Recipe, world: World): { pos: V3; look: V3; focal: number; note: string } => {
  const base = recipe.cam, boxes = labBoxes(recipe, world), sb = shellBox(recipe), dir = norm(sub(base.pos, base.look)), d0 = Math.hypot(...sub(base.pos, base.look));
  const ok = (pos: V3, look: V3) => !viewBlocker(pos, look, boxes);
  const orbit = (centre: V3, dist: number, up: number, yaw: number): V3 => { const c = Math.cos(yaw), s = Math.sin(yaw), h: V3 = [dir[0] * c - dir[2] * s, 0, dir[0] * s + dir[2] * c], l = Math.hypot(h[0], h[2]) || 1; return add(centre, [h[0] / l * dist, up, h[2] / l * dist]); };
  const YAWS = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4, -1.4];
  if (mode === "wide") {
    if (sb) { // interior: the widest view INSIDE the room: from the corner behind the camera, high, 20 mm-ish
      for (const yaw of YAWS) { const p = clampIn(orbit(base.look, d0 * 2.5, 1.2, yaw), sb); if (ok(p, base.look)) return { pos: p, look: base.look, focal: 20, note: `interior wide, yaw ${yaw}` }; }
    } else for (const [k, up] of [[3, 14], [2.2, 10], [3.5, 22], [1.6, 7]] as const) for (const yaw of YAWS) { const p = orbit(base.look, Math.max(24, k * d0), up, yaw); if (ok(p, base.look)) return { pos: p, look: base.look, focal: 24, note: `wide x${k} +${up} m, yaw ${yaw}` }; }
  }
  if (mode === "detail") { const look = add(recipe.subject, [0, 0.4, 0]);
    for (const [dist, up] of [[2.6, 1.0], [3.4, 1.3], [2.0, 0.8]] as const) for (const yaw of YAWS) { let p = orbit(recipe.subject, dist, up, yaw); if (sb) p = clampIn(p, sb); if (ok(p, look)) return { pos: p, look, focal: 40, note: `detail ${dist} m, yaw ${yaw}` }; }
  }
  if (ok(base.pos, base.look)) return { pos: base.pos, look: base.look, focal: 28, note: "recipe camera" };
  for (const yaw of YAWS) { let p = orbit(base.look, d0, base.pos[1] - base.look[1], yaw); if (sb) p = clampIn(p, sb); if (ok(p, base.look)) return { pos: p, look: base.look, focal: 28, note: `recipe camera moved, yaw ${yaw}` }; }
  return { pos: base.pos, look: base.look, focal: 28, note: `UNRESOLVED: ${viewBlocker(base.pos, base.look, boxes)}` };
};
