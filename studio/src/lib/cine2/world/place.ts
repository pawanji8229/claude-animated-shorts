// World 2.0 placement engine: deterministic, rule-based population of a set. Objects are placed with logic (along curbs,
// against facades, around a work area, on a quay edge, in a room against walls), at real scale, resting on the ground,
// rotated sensibly, never overlapping solids, never inside buildings, never blocking the camera's view of the subject
// (unless a rule deliberately places foreground framing). Same seed -> same world, so re-renders are identical.
import { DEFS, type ObjDef, type V3, type EnvKind } from "./kit";
import type { BuildingSpec } from "./building";
import { rng } from "../../math";

export type Density = "MINIMAL" | "STANDARD" | "RICH" | "CINEMATIC";
export const DENSITY: Record<Density, { mul: number; tiers: Tier[]; microRadius: number; note: string }> = {
  MINIMAL: { mul: 0.45, tiers: ["base"], microRadius: 0, note: "simple but complete: structures, key furniture, no micro-detail" },
  STANDARD: { mul: 1, tiers: ["base", "standard"], microRadius: 18, note: "naturally detailed: furniture, vehicles, vegetation, micro-detail near the camera" },
  RICH: { mul: 1.5, tiers: ["base", "standard", "rich"], microRadius: 28, note: "busy, lived-in: extra clutter, more vehicles and props" },
  CINEMATIC: { mul: 2, tiers: ["base", "standard", "rich", "cinematic"], microRadius: 40, note: "maximum useful detail for hero wide shots (measured cost in world-bench)" },
};
export type Tier = "base" | "standard" | "rich" | "cinematic";
export type Placement = { id: string; def: string; pos: V3; ry: number; scale: number; variant: number; rule: string; solid: boolean; fg?: boolean; host?: string; path?: string };
export type PlacedBuilding = { id: string; spec: BuildingSpec; pos: V3; ry: number };
/** a straight edge in the ground plane (x, z) with an outward normal side (+1 = left of a->b) */
export type Edge = { id: string; a: [number, number]; b: [number, number]; side: 1 | -1 };
export type Area = { id: string; cx: number; cz: number; w: number; d: number; ry?: number };
export type Rule =
  | { kind: "along"; id: string; defs: string[]; edge: string; spacing: number; offset: number; jitter?: number; facing?: "out" | "in" | "along" | "random"; prob?: number; from?: number; to?: number; tier?: Tier; scaleJ?: number }
  | { kind: "scatter"; id: string; defs: string[]; area: string; perM2?: number; count?: number; minDist?: number; facing?: "random" | "axis"; tier?: Tier; scaleJ?: number; near?: boolean }
  | { kind: "cluster"; id: string; area: string; centre?: [number, number]; radius: number; members: { def: string; n: number }[]; tier?: Tier; facing?: "random" | "axis" | "centre" }
  | { kind: "at"; id: string; def: string; pos: V3; ry?: number; variant?: number; tier?: Tier; fg?: boolean; scale?: number }
  | { kind: "row"; id: string; def: string; a: V3; b: V3; n: number; ry?: number; tier?: Tier; variantStep?: number };
/** mounting height (m above the ground) of wall-placed objects placed by edge rules */
export const MOUNT: Record<string, number> = { acUnit: 3.4, wallSign: 2.7, safetySign: 1.6, electricBox: 1.2, gauge: 1.5, warningLight: 2.8, industrialFan: 3.2, pipeRun: 2.3, clock: 2.3, wallArt: 1.45, climbingPlant: 0, downpipe: 0, houseplant: 0 };
export type CameraHint = { samples: V3[]; subject: V3; corridor?: number };
export type PopulateOpts = { seed: number; density: Density; env: EnvKind; era: number; ground?: (x: number, z: number) => number; camera?: CameraHint; keepOut?: Area[] };
export type Footprint = { cx: number; cz: number; hw: number; hd: number; ry: number; h: number; id: string; y0?: number };

const corners = (f: Footprint): [number, number][] => { const c = Math.cos(f.ry), s = Math.sin(f.ry); return [[-f.hw, -f.hd], [f.hw, -f.hd], [f.hw, f.hd], [-f.hw, f.hd]].map(([x, z]) => [f.cx + x * c + z * s, f.cz - x * s + z * c]); };
/** oriented-box overlap (separating axis theorem in 2D) */
export const overlaps = (a: Footprint, b: Footprint, pad = 0) => {
  // vertical ranges must intersect too (stacked containers, a lamp hanging above a machine)
  if (a.y0 !== undefined && b.y0 !== undefined && (a.y0 >= b.y0 + b.h - 0.05 || b.y0 >= a.y0 + a.h - 0.05)) return false;
  if (Math.hypot(a.cx - b.cx, a.cz - b.cz) > Math.hypot(a.hw, a.hd) + Math.hypot(b.hw, b.hd) + pad) return false;
  const A = corners({ ...a, hw: a.hw + pad / 2, hd: a.hd + pad / 2 }), B = corners({ ...b, hw: b.hw + pad / 2, hd: b.hd + pad / 2 });
  for (const P of [A, B]) for (let i = 0; i < 4; i++) { const p = P[i], q = P[(i + 1) % 4], nx = -(q[1] - p[1]), nz = q[0] - p[0];
    const pa = A.map(([x, z]) => x * nx + z * nz), pb = B.map(([x, z]) => x * nx + z * nz); if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false; }
  return true;
};
/** the part of an object that actually stands on the ground (a tree's trunk, not its canopy) */
export const baseFootprint = (d: ObjDef, f: Footprint): Footprint => (d.anim === "wind" && (d.cat === "vegetation" || d.cat === "nature") && d.size[1] > 2 ? { ...f, hw: Math.min(f.hw, 0.4), hd: Math.min(f.hd, 0.4) } : f);
export const areaFootprint = (a: Area): Footprint => ({ cx: a.cx, cz: a.cz, hw: a.w / 2, hd: a.d / 2, ry: a.ry ?? 0, h: 100, id: a.id });
export const footprintOf = (d: ObjDef, pos: V3, ry: number, scale: number, id: string): Footprint => ({ cx: pos[0], cz: pos[2], hw: (d.size[0] * scale) / 2, hd: (d.size[2] * scale) / 2, ry, h: d.size[1] * scale, id, y0: pos[1] });
export const buildingFootprint = (b: PlacedBuilding): Footprint => { const c = Math.cos(b.ry), s = Math.sin(b.ry), d = b.spec.d; return { cx: b.pos[0] - s * d / 2, cz: b.pos[2] - c * d / 2, hw: b.spec.w / 2, hd: d / 2, ry: b.ry, h: b.spec.floors * 3.2, id: b.id }; };
/** parameter t (0..1) where the 2D segment a->b first enters an oriented box, or -1 */
export const segHitsBox = (a: V3, b: V3, f: Footprint) => { const c = Math.cos(f.ry), s = Math.sin(f.ry), loc = (p: V3) => { const dx = p[0] - f.cx, dz = p[2] - f.cz; return [dx * c - dz * s, dx * s + dz * c]; };
  const A = loc(a), B = loc(b), d = [B[0] - A[0], B[1] - A[1]], h = [f.hw, f.hd]; let t0 = 0, t1 = 1;
  for (let i = 0; i < 2; i++) { if (Math.abs(d[i]) < 1e-9) { if (Math.abs(A[i]) > h[i]) return -1; continue; } let u = (-h[i] - A[i]) / d[i], v = (h[i] - A[i]) / d[i]; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return -1; }
  return t0; };
const segDist = (px: number, pz: number, a: V3, b: V3) => { const dx = b[0] - a[0], dz = b[2] - a[2], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[2]) * dz) / L)); return Math.hypot(px - (a[0] + t * dx), pz - (a[2] + t * dz)); };
const inArea = (x: number, z: number, a: Area, pad = 0) => { const c = Math.cos(-(a.ry ?? 0)), s = Math.sin(-(a.ry ?? 0)), lx = (x - a.cx) * c + (z - a.cz) * s, lz = -(x - a.cx) * s + (z - a.cz) * c; return Math.abs(lx) <= a.w / 2 + pad && Math.abs(lz) <= a.d / 2 + pad; };

export type World = { env: EnvKind; era: number; placements: Placement[]; buildings: PlacedBuilding[]; rejected: { rule: string; def: string; why: string }[]; edges: Record<string, Edge>; areas: Record<string, Area> };
/** populate a set from rules */
export const populate = (rules: Rule[], edges: Edge[], areas: Area[], buildings: PlacedBuilding[], o: PopulateOpts): World => {
  const D = DENSITY[o.density], E = Object.fromEntries(edges.map((e) => [e.id, e])), A = Object.fromEntries(areas.map((a) => [a.id, a])), out: Placement[] = [], rejected: World["rejected"] = [];
  const solids: Footprint[] = buildings.map(buildingFootprint), all: Footprint[] = [];
  const ground = o.ground ?? (() => 0); let n = 0;
  const tryPlace = (rule: Rule, defId: string, x: number, z: number, ry: number, variant: number, scale = 1, fg = false, yOver?: number): boolean => {
    const d = DEFS.get(defId); if (!d) { rejected.push({ rule: rule.id, def: defId, why: "unknown object" }); return false; }
    if (d.era[0] > o.era || d.era[1] < o.era) { rejected.push({ rule: rule.id, def: defId, why: `era ${d.era.join("-")} vs ${o.era}` }); return false; }
    if (d.envs !== "any" && !d.envs.includes(o.env)) { rejected.push({ rule: rule.id, def: defId, why: `not used in ${o.env}` }); return false; }
    const pos: V3 = [x, yOver ?? ground(x, z), z], fp = footprintOf(d, pos, ry, scale, `p${n}`);
    const roadOk = d.cat === "vehicle" || d.tags?.includes("road") || d.id === "trafficLight";
    if (!roadOk && o.keepOut?.some((k) => overlaps(baseFootprint(d, { ...fp, y0: undefined }), areaFootprint(k)))) { rejected.push({ rule: rule.id, def: defId, why: "keep-out area (roadway)" }); return false; }
    if (d.place !== "wall" && d.place !== "hang" && solids.some((s) => s.id.startsWith("b") && overlaps(fp, s))) { rejected.push({ rule: rule.id, def: defId, why: "inside a building" }); return false; }
    if (d.solid && d.place !== "wall" && solids.some((s) => !s.id.startsWith("b") && overlaps(fp, s, 0.15))) { rejected.push({ rule: rule.id, def: defId, why: "overlaps a solid object" }); return false; }
    if (!d.solid && d.place === "ground" && rule.kind !== "row" && fp.h > 0.35 && all.some((s) => overlaps(fp, s, 0.02) && s.h > 0.35)) { rejected.push({ rule: rule.id, def: defId, why: "overlaps an object" }); return false; }
    // camera-aware: an object whose footprint the camera->subject sight line crosses, and which is taller than the
    // sight line there, would block the subject (low objects are fine; deliberate foreground framing is allowed)
    if (o.camera && !fg && fp.h > 0.5) { const half = (o.camera.corridor ?? 1.2) / 2, sub = o.camera.subject;
      if (o.camera.samples.some((c) => { const hit = segHitsBox(c, sub, { ...fp, hw: fp.hw + half, hd: fp.hd + half }); return hit >= 0 && pos[1] + fp.h > c[1] + (sub[1] + 1.0 - c[1]) * hit && Math.hypot(x - sub[0], z - sub[2]) > Math.max(fp.hw, fp.hd) * 0.5 + 0.6; })) { rejected.push({ rule: rule.id, def: defId, why: "would block the camera's view of the subject" }); return false; } }
    out.push({ id: `p${n++}`, def: defId, pos, ry, scale, variant, rule: rule.id, solid: d.solid, fg }); all.push(fp); if (d.solid) solids.push(fp); return true;
  };
  for (const [ri, rule] of rules.entries()) {
    const tier = rule.tier ?? "standard"; if (!D.tiers.includes(tier)) continue;
    const r = rng(o.seed * 7919 + ri * 104729 + 1), mul = rule.kind === "at" || rule.kind === "row" ? 1 : D.mul;
    if (rule.kind === "at") { const d = DEFS.get(rule.def), gy = ground(rule.pos[0], rule.pos[2]); tryPlace(rule, rule.def, rule.pos[0], rule.pos[2], rule.ry ?? 0, rule.variant ?? 0, rule.scale ?? 1, rule.fg, d?.place === "hang" || d?.place === "wall" || rule.pos[1] > gy + 0.3 || d?.place === "water" ? rule.pos[1] : undefined); }
    else if (rule.kind === "row") { for (let i = 0; i < rule.n; i++) { const t = rule.n === 1 ? 0.5 : i / (rule.n - 1), p: V3 = [rule.a[0] + (rule.b[0] - rule.a[0]) * t, rule.a[1] + (rule.b[1] - rule.a[1]) * t, rule.a[2] + (rule.b[2] - rule.a[2]) * t]; const d = DEFS.get(rule.def), gy = ground(p[0], p[2]); tryPlace(rule, rule.def, p[0], p[2], rule.ry ?? 0, i * (rule.variantStep ?? 1), 1, false, d?.place === "hang" || d?.place === "wall" || p[1] > gy + 0.3 ? p[1] : undefined); } }
    else if (rule.kind === "along") { const e = E[rule.edge]; if (!e) continue; const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]), ux = (e.b[0] - e.a[0]) / L, uz = (e.b[1] - e.a[1]) / L, nx = -uz * e.side, nz = ux * e.side;
      const sp = rule.spacing / Math.sqrt(mul), s0 = (rule.from ?? 0) * L, s1 = (rule.to ?? 1) * L, alongRy = Math.atan2(ux, uz), outRy = Math.atan2(nx, nz);
      for (let s = s0 + sp * (0.3 + 0.4 * r()); s < s1; s += sp * (0.8 + 0.4 * r())) { if (r() > (rule.prob ?? 1)) continue; const j = (rule.jitter ?? 0) * (r() - 0.5) * 2, def = rule.defs[Math.floor(r() * rule.defs.length)];
        const ry = rule.facing === "along" ? alongRy + (r() < 0.5 ? Math.PI : 0) : rule.facing === "in" ? outRy + Math.PI : rule.facing === "random" ? r() * Math.PI * 2 : outRy;
        const dd = DEFS.get(def), off = rule.offset + j * 0.3 + (dd?.place === "wall" ? 0 : 0); const px = e.a[0] + ux * (s + j) + nx * off, pz = e.a[1] + uz * (s + j) + nz * off;
        tryPlace(rule, def, px, pz, ry, Math.floor(r() * 97), 1 + (rule.scaleJ ?? 0) * (r() - 0.5) * 2, false, dd?.place === "hang" ? ground(px, pz) + 4 : dd?.place === "wall" ? ground(px, pz) + (MOUNT[def] ?? 0) : undefined); } }
    else if (rule.kind === "scatter") { const a = A[rule.area]; if (!a) continue; const cnt = Math.round((rule.count ?? (rule.perM2 ?? 0.01) * a.w * a.d) * mul); let tries = 0, placed = 0;
      while (placed < cnt && tries < cnt * 12) { tries++; const lx = (r() - 0.5) * a.w, lz = (r() - 0.5) * a.d, c = Math.cos(a.ry ?? 0), s = Math.sin(a.ry ?? 0), x = a.cx + lx * c + lz * s, z = a.cz - lx * s + lz * c;
        if (rule.near && o.camera && Math.min(...o.camera.samples.map((p) => Math.hypot(p[0] - x, p[2] - z))) > D.microRadius) continue;
        if (rule.minDist && out.some((p) => p.rule === rule.id && Math.hypot(p.pos[0] - x, p.pos[2] - z) < rule.minDist!)) continue;
        if (tryPlace(rule, rule.defs[Math.floor(r() * rule.defs.length)], x, z, rule.facing === "axis" ? (a.ry ?? 0) + Math.floor(r() * 4) * Math.PI / 2 : r() * Math.PI * 2, Math.floor(r() * 97), 1 + (rule.scaleJ ?? 0) * (r() - 0.5) * 2)) placed++; } }
    else if (rule.kind === "cluster") { const a = A[rule.area]; const cx = rule.centre ? rule.centre[0] : a ? a.cx + (r() - 0.5) * a.w * 0.6 : 0, cz = rule.centre ? rule.centre[1] : a ? a.cz + (r() - 0.5) * a.d * 0.6 : 0;
      for (const m of rule.members) for (let i = 0; i < Math.max(1, Math.round(m.n * Math.min(mul, 1.6))); i++) { let ok = false; for (let t = 0; t < 10 && !ok; t++) { const ang = r() * Math.PI * 2, rr = rule.radius * Math.sqrt(r()), x = cx + Math.cos(ang) * rr, z = cz + Math.sin(ang) * rr;
        ok = tryPlace(rule, m.def, x, z, rule.facing === "centre" ? Math.atan2(cx - x, cz - z) : rule.facing === "axis" ? Math.floor(r() * 4) * Math.PI / 2 : r() * Math.PI * 2, Math.floor(r() * 97)); } } }
  }
  return { env: o.env, era: o.era, placements: out, buildings, rejected, edges: E, areas: A };
};
/** per-shot visibility + LOD: decided once per shot from the camera samples (never per frame, so nothing pops mid-move) */
export type ShotCam = { pos: V3; look: V3; fov: number };
export const shotSelect = (w: World, cams: ShotCam[], aspect = 9 / 16) => {
  const vis = new Map<string, 0 | 1 | 2>();
  const items: { id: string; pos: V3; r: number; maxDist: number }[] = [...w.placements.map((p) => { const d = DEFS.get(p.def)!; return { id: p.id, pos: [p.pos[0], p.pos[1] + d.size[1] / 2, p.pos[2]] as V3, r: Math.hypot(...d.size) * p.scale / 2, maxDist: d.maxDist ?? 2000 }; }),
    ...w.buildings.map((b) => ({ id: b.id, pos: [b.pos[0], b.spec.floors * 1.6, b.pos[2]] as V3, r: Math.hypot(b.spec.w, b.spec.d, b.spec.floors * 3.2) / 2, maxDist: 3000 }))];
  for (const it of items) { let best = Infinity, seen = false;
    for (const c of cams) { const dx = it.pos[0] - c.pos[0], dy = it.pos[1] - c.pos[1], dz = it.pos[2] - c.pos[2], dist = Math.hypot(dx, dy, dz); best = Math.min(best, dist);
      const fx = c.look[0] - c.pos[0], fy = c.look[1] - c.pos[1], fz = c.look[2] - c.pos[2], fl = Math.hypot(fx, fy, fz) || 1, along = (dx * fx + dy * fy + dz * fz) / fl;
      if (along < -it.r) continue; const half = Math.atan(Math.tan((c.fov * Math.PI) / 360) * Math.max(1, aspect)) * 1.15, lateral = Math.sqrt(Math.max(0, dist * dist - along * along));
      if (lateral - it.r <= Math.tan(half) * Math.max(along, 0.1) + it.r * 0.5 || dist < it.r * 1.5) seen = true; }
    if (!seen || best > it.maxDist) continue; vis.set(it.id, best < 18 ? 0 : best < 50 ? 1 : 2); }
  return vis;
};
export { inArea, segDist };
