// Camera 2.0 angles + composition for a VERTICAL 9:16 frame. Framing is solved directly in 9:16 (never a horizontal
// frame cropped afterwards): the shot size sets how much of the subject's height fills the frame height, the angle sets
// where the camera sits, and the composition target puts the subject's key point on the vertical frame's thirds,
// inside the Shorts safe area (top ~12 % and bottom ~22 % are covered by platform UI).
import { add, sub, mul, norm, dot, cross, len, clamp, sph, project, fovFromFocal, type V3 } from "./core";

export type ShotSize = "EWS" | "WS" | "FULL" | "MWS" | "MS" | "MCU" | "CU" | "ECU";
/** vertical span of the subject that a shot size frames (fractions of the subject height, 0 = feet / base, 1 = top),
 *  and how much of the frame height that span fills. For large structures the span is the whole structure. */
export const SIZES: Record<ShotSize, { span: [number, number]; fill: number; label: string }> = {
  EWS: { span: [0, 1], fill: 0.1, label: "extreme wide" },
  WS: { span: [0, 1], fill: 0.3, label: "wide / establishing" },
  FULL: { span: [-0.04, 1.06], fill: 0.56, label: "full body" },
  MWS: { span: [0.3, 1.08], fill: 0.66, label: "medium wide (knees up)" },
  MS: { span: [0.48, 1.08], fill: 0.62, label: "medium (waist up)" },
  MCU: { span: [0.62, 1.07], fill: 0.6, label: "medium close-up (chest up)" },
  CU: { span: [0.74, 1.06], fill: 0.55, label: "close-up (head + shoulders)" },
  ECU: { span: [0.82, 0.98], fill: 0.62, label: "extreme close-up (face)" },
};
export type VAngle = "eye" | "low" | "high" | "bird" | "worm";
/** camera elevation (radians) seen from the framed span centre */
export const V_ANGLES: Record<VAngle, number> = { eye: 0.02, low: -0.28, high: 0.38, bird: 1.32, worm: -0.95 };
export type HAngle = "front" | "threeQuarter" | "profile" | "back" | "threeQuarterBack";
/** azimuth relative to the subject's facing (sign chooses the side) */
export const H_ANGLES: Record<HAngle, number> = { front: 0.08, threeQuarter: 0.62, profile: 1.5, threeQuarterBack: 2.35, back: 3.05 };

export type Subject = { id: string; base: V3; height: number; facing?: number; width?: number; kind?: "character" | "structure" | "object" | "vehicle"; importance?: number };
export type FrameSpec = {
  size: ShotSize; v: VAngle | number; h: HAngle | number; side?: 1 | -1;
  focal: number;
  /** where the span centre (or the eyes for character close shots) lands, NDC: x -1..1, y -1..1 (y up) */
  screen?: [number, number];
  /** dutch roll (radians) - use sparingly */
  dutch?: number;
};
/** composition default: characters put their eye-line on the upper third; structures sit centre-low with sky above */
export const defaultScreen = (s: Subject, size: ShotSize): [number, number] => {
  // full-body framings centre the whole figure in the Shorts-safe band (feet above the bottom UI, head below the top UI)
  if (s.kind === "character" || !s.kind) return size === "EWS" || size === "WS" ? [0, -0.2] : size === "FULL" ? [0, (SAFE.yMin + SAFE.yMax) / 2] : [0, 1 / 3 - 0.02];
  return size === "EWS" ? [0, -0.2] : [0, -0.05];
};
/**
 * Solve the camera for a framing: distance from the lens so the chosen span fills `fill` of the 9:16 frame height
 * (accounting for the angle), then aim so the anchor point lands on `screen`. Returns pos / look / focal / roll.
 */
export const solveFrame = (s: Subject, spec: FrameSpec) => {
  const sz = SIZES[spec.size], lo = s.base[1] + sz.span[0] * s.height, hi = s.base[1] + sz.span[1] * s.height, spanH = Math.max(0.05, hi - lo);
  const c: V3 = [s.base[0], (lo + hi) / 2, s.base[2]];
  const el = typeof spec.v === "number" ? spec.v : V_ANGLES[spec.v], azRel = (typeof spec.h === "number" ? spec.h : H_ANGLES[spec.h]) * (spec.side ?? 1), az = (s.facing ?? 0) + azRel;
  const fov = fovFromFocal(spec.focal), t = Math.tan((fov * Math.PI) / 360);
  // seen from elevation el, a vertical span of height h projects to ~h*cos(el); a structure's width matters from above
  const projH = Math.max(spanH * Math.abs(Math.cos(el)), (s.width ?? spanH * 0.35) * Math.abs(Math.sin(el)));
  const d = projH / (sz.fill * 2 * t);
  const pos = add(c, sph(az, el, d));
  const scr = spec.screen ?? defaultScreen(s, spec.size);
  // anchor: eyes for character close/medium shots, span centre otherwise
  const anchor: V3 = (s.kind === "character" || !s.kind) && !["EWS", "WS", "FULL"].includes(spec.size) ? [s.base[0], s.base[1] + s.height * 0.9, s.base[2]] : c;
  const look = aimFor(pos, anchor, scr, fov);
  return { pos, look, focal: spec.focal, roll: spec.dutch ?? 0, dist: d, anchor };
};
/** aim point so that `p` appears at screen position scr (NDC) for a camera at pos with vertical fov (degrees) */
export const aimFor = (pos: V3, p: V3, scr: [number, number], fovDeg: number, aspect = 9 / 16): V3 => {
  const t = Math.tan((fovDeg * Math.PI) / 360), to = sub(p, pos), D = len(to), fw0 = norm(to);
  // rotate the forward direction so that p sits at angles (ax, ay) off-axis
  const ay = Math.atan(scr[1] * t), ax = Math.atan(scr[0] * t * aspect);
  let rt = cross(fw0, [0, 1, 0]); if (len(rt) < 1e-6) rt = [1, 0, 0]; rt = norm(rt); const up = cross(rt, fw0);
  const fw = norm(add(add(mul(fw0, Math.cos(ay) * Math.cos(ax)), mul(up, -Math.sin(ay))), mul(rt, -Math.sin(ax))));
  return add(pos, mul(fw, D));
};

// ---------------------------------------------------------------- composition scoring (9:16)
/** Shorts-safe region in NDC (platform UI covers the top ~12 % and the bottom ~22 % of the frame, plus side margins) */
export const SAFE = { xMin: -0.86, xMax: 0.86, yMin: -1 + 2 * 0.22, yMax: 1 - 2 * 0.12 };
export type Projected = { x: number; y: number; z: number };
/** project the subject's box (feet, head, left, right) */
export const subjectBox = (cam: { pos: V3; look: V3; roll?: number }, fovDeg: number, s: Subject) => {
  const w = (s.width ?? s.height * 0.35) / 2, b = s.base, top: V3 = [b[0], b[1] + s.height, b[2]], mid: V3 = [b[0], b[1] + s.height / 2, b[2]];
  const { rt } = { rt: norm(cross(norm(sub(cam.look, cam.pos)), [0, 1, 0])) };
  const pts = [b, top, add(mid, mul(rt, w)), add(mid, mul(rt, -w))].map((p) => project(cam, fovDeg, p));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), behind: pts.some((p) => p.z <= 0.05), head: pts[1] };
};
/** the region of a subject that must stay framed: a character's head (close shots may cut the body), an object's or a
 *  structure's centre region (a reveal may sweep along a facade bigger than the frame) */
export const keyBox = (cam: { pos: V3; look: V3; roll?: number }, fovDeg: number, s: Subject) => {
  if (s.kind === "character" || !s.kind) return subjectBox(cam, fovDeg, { ...s, base: [s.base[0], s.base[1] + s.height * 0.76, s.base[2]], height: s.height * 0.26, width: s.height * 0.22 });
  const h = s.kind === "structure" ? Math.min(s.height, 6) : s.height; return subjectBox(cam, fovDeg, { ...s, base: [s.base[0], s.base[1] + (s.height - h) * 0.4, s.base[2]], height: h, width: Math.min(s.width ?? h, h) });
};
/** fraction of the subject box inside a region */
export const insideFrac = (bx: { x0: number; x1: number; y0: number; y1: number }, r: { xMin: number; xMax: number; yMin: number; yMax: number }) => {
  const ix = Math.max(0, Math.min(bx.x1, r.xMax) - Math.max(bx.x0, r.xMin)), iy = Math.max(0, Math.min(bx.y1, r.yMax) - Math.max(bx.y0, r.yMin));
  const a = Math.max(1e-6, (bx.x1 - bx.x0) * (bx.y1 - bx.y0)); return clamp((ix * iy) / a, 0, 1);
};
/**
 * Composition score 0..1 for a camera against the scene's subjects: main subject inside the safe area, its key point near
 * a third (vertical frame: eye-line on the upper third), look-room in the facing direction, secondary subjects visible
 * but smaller, horizon not cutting through heads, sensible size. Used by the director to choose between candidates.
 */
export const composeScore = (cam: { pos: V3; look: V3; roll?: number }, fovDeg: number, main: Subject, others: Subject[] = []) => {
  const bx = keyBox(cam, fovDeg, main); if (bx.behind) return { score: 0, notes: ["main subject behind camera"] };
  const notes: string[] = []; let sc = 0;
  const safe = insideFrac(bx, SAFE); sc += 0.35 * safe; if (safe < 0.98) notes.push(`main ${(100 - safe * 100).toFixed(0)}% outside safe area`);
  const key = main.kind === "character" || !main.kind ? project(cam, fovDeg, [main.base[0], main.base[1] + main.height * 0.9, main.base[2]]) : { x: (bx.x0 + bx.x1) / 2, y: (bx.y0 + bx.y1) / 2 };
  const thirdsY = Math.min(Math.abs(key.y - 1 / 3), Math.abs(key.y + 1 / 3), Math.abs(key.y) + 0.12), thirdsX = Math.min(Math.abs(key.x), Math.abs(Math.abs(key.x) - 1 / 3));
  sc += 0.25 * (1 - clamp(thirdsY * 2.2, 0, 1)) + 0.1 * (1 - clamp(thirdsX * 2, 0, 1));
  if (main.facing !== undefined) { const fwd: V3 = [Math.sin(main.facing), 0, Math.cos(main.facing)], p2 = project(cam, fovDeg, add(main.base, mul(fwd, 1)));
    const room = (p2.x - project(cam, fovDeg, main.base).x) * -((bx.x0 + bx.x1) / 2); sc += 0.1 * clamp(0.5 + room * 2, 0, 1); }
  const hgt = bx.y1 - bx.y0; sc += 0.1 * (hgt > 0.04 && hgt < 1.4 ? 1 : 0);
  let sec = 1; for (const o of others) { const ob = subjectBox(cam, fovDeg, o); if (ob.behind) { sec -= 0.5; continue; } const f = insideFrac(ob, { xMin: -1, xMax: 1, yMin: -1, yMax: 1 }); sec = Math.min(sec, 0.4 + 0.6 * f); if (ob.y1 - ob.y0 > hgt * 1.4 && (o.importance ?? 0.5) < (main.importance ?? 1)) notes.push(`secondary ${o.id} dominates`); }
  sc += 0.1 * clamp(sec, 0, 1);
  return { score: clamp(sc, 0, 1), notes, box: bx, key };
};
export { dot };
