// TF2 renderer: draws a solved skeleton + face into the 600x1000 card in the TwistFrame brush style (heavier bottom-right
// ink, tapered strokes, drop-offset ink fill), plus the emissive glow mask (face white, rest dim).
// Identity rules enforced in drawing: the head silhouette is a FIXED ellipse (never stretches); nothing is ever drawn
// outside its sides (NO EARS - hair stays inside, hats sit on top); the head always overlaps the torso (solver).
// Head turns: facial features live on a curved "face shell" (radius FS) mapped through the head yaw/pitch/roll, so they
// slide smoothly across the face and fade (shrink) at the edge instead of popping.
import { P, W, SOLE, project, clamp, lerp, type V3, type Proj } from "./rig";
import type { Skeleton } from "./body";
import type { FaceRig, Eye, Brow } from "./face";
import type { HandShape } from "./hands";
import type { Costume } from "../odo5";

type G = CanvasRenderingContext2D; type Pt = [number, number]; type Pal = Record<string, string>;
export const COLORS: Pal = {
  ink: "#241923", limb: "#2b1f29", limbFar: "#3e303b", face: "#fffaf3", faceShade: "#ecdfd2", hair: "#ebe9f0", hairShade: "#b9b4c4",
  shirt: "#2f6f78", shirtShade: "#22545b", collar: "#f3ead6", belt: "#e4a62c", buckle: "#d3a64a", apron: "#c4572a", apronShade: "#9b4120",
  brass: "#d0a245", brassD: "#8c6522", lens: "#ffe08c", strap: "#5a3a2a", shoe: "#2e1d16", shoeHi: "#8a6a55", mouth: "#6a2230", mouthIn: "#3a1018", tongue: "#d0666e", teeth: "#ffffff",
  sweat: "#bfe6ff", tear: "#9fd6ff", blush: "#ff8a8a", rim: "#a9bcff", glove: "#6a4a3c", gloveHi: "#86624f", palm: "#8f6b58", vein: "#d8343a", sclera: "#ffffff",
  tie: "#7a3b22", hat: "#efe3c4", hatShade: "#cdbb92", band: "#6b3d22", pocket: "#c8452f",
};
const MASK: Pal = Object.fromEntries(Object.keys(COLORS).map((k) => [k, "#4a4a4a"]));
Object.assign(MASK, { ink: "#141414", limb: "#1a1a1a", limbFar: "#1a1a1a", face: "#ffffff", faceShade: "#ececec", teeth: "#ffffff", sclera: "#ffffff", lens: "#b0b0b0", blush: "#ffffff", rim: "#4a4a4a", sweat: "#9a9a9a", tear: "#9a9a9a", mouth: "#3a3a3a", mouthIn: "#2a2a2a", tongue: "#5a5a5a", palm: "#3a3a3a", vein: "#9a9a9a" });

// ---------------------------------------------------------------- brush helpers (TwistFrame line language)
const inked = (g: G, c: Pal, path: () => void, fill: string, w = 6, k = 5) => {
  g.save(); g.translate(k * 0.6, k * 0.8); path(); g.fillStyle = c.ink; g.fill(); g.lineWidth = w * 2; g.strokeStyle = c.ink; g.lineJoin = "round"; g.stroke(); g.restore();
  path(); g.lineWidth = w * 2; g.strokeStyle = c.ink; g.lineJoin = "round"; g.stroke(); path(); g.fillStyle = fill; g.fill(); };
const taper = (g: G, pts: Pt[], wMid: number, col: string, wEnd = 0.3, bias = 0.5) => {
  if (pts.length < 2) return; const S: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) for (let t = 0; t < 1; t += 0.125) S.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
  S.push(pts[pts.length - 1]); const n = S.length, Lf: Pt[] = [], R: Pt[] = [];
  for (let i = 0; i < n; i++) { const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const t = i / (n - 1), u = t < bias ? (t / bias) * 0.5 : 0.5 + ((t - bias) / (1 - bias)) * 0.5, w = (wMid * (wEnd + (1 - wEnd) * Math.pow(Math.sin(Math.PI * u), 0.6))) / 2;
    Lf.push([S[i][0] - dy * w, S[i][1] + dx * w]); R.push([S[i][0] + dy * w, S[i][1] - dx * w]); }
  g.beginPath(); g.moveTo(...Lf[0]); for (const p of Lf) g.lineTo(...p); for (let i = n - 1; i >= 0; i--) g.lineTo(...R[i]); g.closePath(); g.fillStyle = col; g.fill();
  g.beginPath(); g.arc(S[0][0], S[0][1], (wMid * wEnd) / 2, 0, Math.PI * 2); g.arc(S[n - 1][0], S[n - 1][1], (wMid * wEnd) / 2, 0, Math.PI * 2); g.fill(); };
const limb = (g: G, pts: Pt[], w: number, col: string) => taper(g, pts, w, col, 0.74, 0.35);
const xy = (p: Proj): Pt => [p.x, p.y];

// ---------------------------------------------------------------- face shell mapping
const FS = 108;   // face-shell radius: features slide across a curve narrower than the head (cartoon profile stays inside the head)
type FP = { x: number; y: number; k: number; vis: number };  // screen pos (relative to head centre, before roll), horizontal foreshortening, visibility 0..1
const faceMap = (yaw: number, pitch: number) => (fx: number, fy: number): FP => {
  const u = Math.asin(clamp(fx / FS, -0.99, 0.99)) + yaw, cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x = FS * Math.sin(u), z = FS * Math.cos(u), y = fy * cp + z * sp * 0.85;
  const k = Math.max(0, Math.cos(u)), vis = clamp((1.3 - Math.abs(u)) / 0.32, 0, 1);   // far-side features fade + shrink out before they turn into slivers
  return { x, y, k: lerp(0.0, 1, Math.min(1, k * 1.15)), vis };
};
// ---------------------------------------------------------------- face drawing
const drawEye = (g: G, c: Pal, p: FP, e: Eye, f: FaceRig, s: number, mask: boolean) => {
  if (p.vis <= 0.01) return; const es = f.eyeScale, k = Math.max(0.3, p.k) * p.vis, rx = 20 * es * k, ry = 24 * es * (0.55 + 0.45 * p.vis); if (rx < 5) return;
  const open = e.open, lower = e.lower, x = p.x, y = p.y, wide = open > 1.04;
  const top = y - ry * clamp(open, 0, 1.55) * 0.92, droop = wide ? -ry * 0.2 : 4 + (1 - Math.min(1, open)) * 7, arch = wide ? 0 : 3 + ry * 0.1;
  const bot = y + ry * 0.98, bulge = lower * ry * 1.05;                         // lower lid bulges UP when the cheeks push (crescent "happy" eyes)
  const upMid = (top + droop + top - arch) / 2, loMid = (bot + 3 + bot - bulge) / 2;
  if (loMid - upMid < 3.5) {   // closed: a lid line (arched up = happy/squeeze, flat = blink/sleep)
    const yy = (upMid + loMid) / 2, ar = clamp(lower * 1.5 - 0.3, -0.35, 1.2) * 13;
    taper(g, [[x - rx * 1.08, yy + ar * 0.45], [x, yy - ar * 0.75], [x + rx * 1.08, yy + ar * 0.45]], 7.5, c.ink, 0.45); return; }
  const upperPath = () => { g.beginPath(); g.moveTo(x - rx * 1.25, y - ry * 1.6); g.lineTo(x - rx * 1.25, top + droop); g.quadraticCurveTo(x, top - arch * 2, x + rx * 1.25, top + droop); g.lineTo(x + rx * 1.25, y - ry * 1.6); g.closePath(); };
  const lowerPath = () => { g.beginPath(); g.moveTo(x - rx * 1.25, y + ry * 1.6); g.lineTo(x - rx * 1.25, bot + 3); g.quadraticCurveTo(x, bot - bulge * 2 + 3, x + rx * 1.25, bot + 3); g.lineTo(x + rx * 1.25, y + ry * 1.6); g.closePath(); };
  g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.clip();
  g.fillStyle = c.sclera; g.fillRect(x - rx - 2, y - ry - 2, rx * 2 + 4, ry * 2 + 4);
  const pr = 13.5 * f.pupil * es, px = x + e.gx * (rx - pr * 0.35 * k), py = y + e.gy * (ry - pr * 0.45) * 0.9;
  g.beginPath(); g.ellipse(px, py, pr * Math.max(0.32, k), pr * 1.1, 0, 0, Math.PI * 2); g.fillStyle = c.ink; g.fill();
  if (!mask) { const hs = 3 + f.sparkle * 3.2; g.beginPath(); g.arc(px - pr * 0.35 * k, py - pr * 0.42, hs, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); if (f.sparkle > 0.8) { g.beginPath(); g.arc(px + pr * 0.38 * k, py + pr * 0.36, hs * 0.45, 0, Math.PI * 2); g.fill(); } }
  g.fillStyle = c.face; if (!wide) { upperPath(); g.fill(); } lowerPath(); g.fill();
  g.restore();
  // lid lines: a heavy upper lid (the TwistFrame lidded look) or a full outline when wide open; lower lid line when raised
  if (wide) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.lineWidth = 3.4; g.strokeStyle = c.ink; g.stroke(); }
  else { const q = (t: number): Pt => { const a = (1 - t) * (1 - t), b = 2 * t * (1 - t), d = t * t; return [a * (x - rx * 1.08) + b * x + d * (x + rx * 1.08), a * (top + droop) + b * (top - arch * 2) + d * (top + droop)]; };
    taper(g, [q(0), q(0.25), q(0.5), q(0.75), q(1)], 7 + (1 - Math.min(1, open)) * 2.5, c.ink, 0.42); }
  if (lower > 0.22) { const q = (t: number): Pt => { const a = (1 - t) * (1 - t), b = 2 * t * (1 - t), d = t * t; return [a * (x - rx) + b * x + d * (x + rx), a * (bot + 1) + b * (bot - bulge * 2 + 3) + d * (bot + 1)]; };
    taper(g, [q(0.1), q(0.5), q(0.9)], 3.6, c.ink, 0.4); }
  void s;
};
const drawBrow = (g: G, c: Pal, m: (fx: number, fy: number) => FP, b: Brow, s: number, f: FaceRig, ey: number) => {
  const base = ey - 52 - b.h * 18 - (f.eyeScale - 1) * 20;
  const pi = m(s * 22, base - b.inner * 14), pm = m(s * 50, base - 7 - b.arch * 8 - b.h * 1.5), po = m(s * 78, base + 3 - b.outer * 12);
  const vis = Math.min(pi.vis, po.vis); if (vis < 0.05) return;
  taper(g, [[pi.x, pi.y], [pm.x, pm.y], [po.x, po.y]], 13.5 * f.browThick * (0.5 + 0.5 * vis), c.ink, 0.35);
};
const drawMouth = (g: G, c: Pal, m: (fx: number, fy: number) => FP, f: FaceRig, mask: boolean) => {
  const my = 66 + f.mouthY, w = 40 * f.mouthW * (1 - 0.45 * f.pucker), open = f.open * (1 - 0.15 * f.pucker);
  const cornerY = (s: number) => my - f.smile * 16 - s * f.asym * 12 + f.pucker * 2;
  const L = m(-w, cornerY(-1)), R = m(w, cornerY(1)), C = m(0, my), vis = Math.min(L.vis, R.vis, C.vis); if (vis < 0.05 && C.vis < 0.05) return;
  const sag = f.smile * 13 + 2;                                           // centre lower than corners when smiling
  const upY = C.y + sag * 0.35 - open * 13 - f.upperLip * 8, loY = C.y + sag + open * 40 + f.pucker * open * 8;
  const roundK = f.pucker * 0.75;
  const shape = () => { g.beginPath(); g.moveTo(L.x, L.y);
    g.bezierCurveTo(lerp(L.x, C.x, 0.4), lerp(L.y, upY, 0.9 + roundK * 0.4) - roundK * 6, lerp(R.x, C.x, 0.4), lerp(R.y, upY, 0.9 + roundK * 0.4) - roundK * 6, R.x, R.y);
    g.bezierCurveTo(lerp(R.x, C.x, 0.3), lerp(R.y, loY, 1.0 + roundK * 0.2), lerp(L.x, C.x, 0.3), lerp(L.y, loY, 1.0 + roundK * 0.2), L.x, L.y); g.closePath(); };
  const gap = loY - upY;
  if (gap < 5 && f.teeth < 0.2) {    // closed mouth: one tapered line through the corners and the (smiling/frowning) centre
    taper(g, [[L.x, L.y], [lerp(L.x, C.x, 0.5), lerp(L.y, C.y + sag * 0.75, 0.6)], [C.x, C.y + sag * 0.7], [lerp(R.x, C.x, 0.5), lerp(R.y, C.y + sag * 0.75, 0.6)], [R.x, R.y]], 8.5, c.ink, 0.38);
  } else {
    inked(g, c, shape, f.teeth > 0.5 && open < 0.25 ? c.teeth : c.mouthIn, 3.4, 2.4);
    g.save(); shape(); g.clip();
    if (f.tongue > 0.05 || open > 0.35) { g.beginPath(); g.ellipse(C.x + f.asym * 6, loY - 4 + (1 - f.tongue) * 6, w * 0.55, 10 + f.tongue * 6, 0, 0, Math.PI * 2); g.fillStyle = c.tongue; g.fill(); }
    if (f.teeth > 0.05) { const th = 7 + f.teeth * 6; g.fillStyle = c.teeth; g.fillRect(L.x - 4, upY - 8, R.x - L.x + 8, th + 8 - (open < 0.25 ? 0 : 0));
      if (open < 0.3) g.fillRect(L.x - 4, loY - th - 2, R.x - L.x + 8, th + 4);
      if (f.clench > 0.2) { g.strokeStyle = c.ink; g.lineWidth = 2.2; g.beginPath(); g.moveTo(L.x, (upY + loY) / 2); g.quadraticCurveTo(C.x, (upY + loY) / 2 + sag * 0.3, R.x, (upY + loY) / 2); g.stroke();
        const n = 5; for (let i = 1; i < n; i++) { const xx = lerp(L.x, R.x, i / n); g.beginPath(); g.moveTo(xx, upY - 6); g.lineTo(xx, loY + 6); g.stroke(); } } }
    g.restore();
    if (f.clench > 0.4) for (const P2 of [L, R]) taper(g, [[P2.x, P2.y], [P2.x + Math.sign(P2.x - C.x) * 8, P2.y + 7]], 4, c.ink, 0.4);   // strain lines
  }
  if (f.tongue > 0.4 && f.open < 0.15 && !mask) { const tx = lerp(C.x, R.x, 0.6); inked(g, c, () => { g.beginPath(); g.ellipse(tx, C.y + sag * 0.6 + 7, 7, 9, 0.3, 0, Math.PI * 2); }, c.tongue, 2, 1.4); }   // concentration tongue
};
// ---------------------------------------------------------------- head
const drawHat = (g: G, c: Pal, cx: number, cy: number, kind: string, yaw: number) => {
  const k = 0.82 + 0.18 * Math.abs(Math.cos(yaw)), sh = Math.sin(yaw) * 10;
  g.save(); g.translate(cx + sh, cy - 104); g.scale(k, 1); g.rotate(-0.035);
  if (kind === "bowler") { inked(g, c, () => { g.beginPath(); g.ellipse(0, 6, 150, 22, 0, 0, Math.PI * 2); }, c.hat, 4, 3); inked(g, c, () => { g.beginPath(); g.moveTo(-96, 6); g.bezierCurveTo(-104, -100, 104, -100, 96, 6); g.closePath(); }, c.hat, 4, 3); g.fillStyle = c.band; g.fillRect(-97, -14, 194, 16); }
  else if (kind === "pilot") { inked(g, c, () => { g.beginPath(); g.moveTo(-112, 4); g.bezierCurveTo(-130, -40, -150, -78, -96, -88); g.lineTo(96, -88); g.bezierCurveTo(150, -78, 130, -40, 112, 4); g.closePath(); }, c.hat, 4, 3);
    g.fillStyle = c.band; g.fillRect(-112, -22, 224, 24); inked(g, c, () => { g.beginPath(); g.moveTo(-104, 2); g.quadraticCurveTo(0, 40, 104, 2); g.quadraticCurveTo(0, 18, -104, 2); g.closePath(); }, "#141416", 3.5, 3); }
  else if (kind === "cowboy") { inked(g, c, () => { g.beginPath(); g.moveTo(-205, -16); g.quadraticCurveTo(-190, 18, -100, 22); g.quadraticCurveTo(0, 30, 100, 22); g.quadraticCurveTo(190, 18, 205, -16); g.quadraticCurveTo(140, 6, 0, 8); g.quadraticCurveTo(-140, 6, -205, -16); g.closePath(); }, c.hat, 4.5, 4);
    inked(g, c, () => { g.beginPath(); g.moveTo(-86, 6); g.bezierCurveTo(-96, -60, -70, -104, -30, -98); g.quadraticCurveTo(0, -80, 30, -98); g.bezierCurveTo(70, -104, 96, -60, 86, 6); g.closePath(); }, c.hat, 4.5, 4); g.fillStyle = c.band; g.fillRect(-88, -20, 176, 20); }
  else { inked(g, c, () => { g.beginPath(); g.moveTo(-150, 10); g.quadraticCurveTo(-150, -2, -120, -4); g.lineTo(120, -4); g.quadraticCurveTo(150, -2, 150, 10); g.closePath(); }, c.hat, 4, 3);
    inked(g, c, () => { g.beginPath(); g.moveTo(-118, 0); g.bezierCurveTo(-120, -110, 120, -110, 118, 0); g.closePath(); }, c.hat, 4, 3); taper(g, [[0, -86], [0, -4]], 10, c.hatShade, 0.6); }
  g.restore();
};
const drawHead = (g: G, c: Pal, hc: Pt, s: Skeleton, f: FaceRig, cos: Costume, mask: boolean, t: number) => {
  const [cx, cy] = hc, roll = s.headRot.roll + (s.pose.bend * 0.5), yawF = s.yaw + s.headRot.yaw, pitchF = s.headRot.pitch;
  const head = () => { g.beginPath(); g.ellipse(cx, cy, P.headRx, P.headRy, 0, 0, Math.PI * 2); };
  inked(g, c, head, c.face, 5, 7);
  if (!mask) { g.save(); head(); g.clip();
    const lx = cx + 40 - Math.sin(yawF) * 30, gr = g.createRadialGradient(lx, cy - 50, 40, cx, cy, 178); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.72, "rgba(255,255,255,0)"); gr.addColorStop(1, c.faceShade); g.fillStyle = gr; g.fillRect(cx - 200, cy - 200, 400, 400);
    g.beginPath(); g.ellipse(cx, cy, P.headRx - 6, P.headRy - 6, 0, Math.PI * 0.62, Math.PI * 1.28); g.lineWidth = 9; g.strokeStyle = c.rim; g.globalAlpha = 0.42; g.stroke(); g.globalAlpha = 1;
    if (f.gloom > 0.02) { const gg = g.createLinearGradient(0, cy - P.headRy, 0, cy - 20); gg.addColorStop(0, `rgba(70,80,120,${0.35 * f.gloom})`); gg.addColorStop(1, "rgba(70,80,120,0)"); g.fillStyle = gg; g.fillRect(cx - 160, cy - 160, 320, 160); }
    // hair inside the silhouette under a hat brim (EARLESS: never outside the head)
    if (cos.hat && cos.tufts) for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(cx + sg * 160, cy - 110); g.quadraticCurveTo(cx + sg * 118, cy - 70, cx + sg * 132, cy - 10); g.quadraticCurveTo(cx + sg * 150, cy - 30, cx + sg * 160, cy - 40); g.closePath(); g.fillStyle = c.hair; g.fill(); }
    g.restore(); if (cos.hat && cos.tufts) { head(); g.lineWidth = 10; g.strokeStyle = c.ink; g.stroke(); } }
  // curly hairs (follow-through from head motion)
  if (cos.hairs) for (const [dx, h, cv] of [[-18, 54, -24], [4, 70, 14], [24, 46, 30]] as const) { const swing = Math.sin(t * 0.09 + dx) * 4 - roll * 40;
    taper(g, [[cx + dx, cy - P.headRy + 6], [cx + dx + cv * 0.4 - swing * 0.3, cy - P.headRy - h * 0.6], [cx + dx + cv - swing * 0.8, cy - P.headRy - h * 0.75], [cx + dx + cv * 1.3 - swing, cy - P.headRy - h * 0.45]], 7, c.ink, 0.3); }
  if (cos.goggles && Math.cos(yawF) < 0.25 && !mask) { g.save(); head(); g.clip(); g.globalAlpha = clamp((0.25 - Math.cos(yawF)) / 0.5, 0, 1); g.beginPath(); g.ellipse(cx, cy + 120, 185, 250, 0, Math.PI * 1.25, Math.PI * 1.75); g.lineWidth = 15; g.strokeStyle = c.strap; g.stroke(); g.globalAlpha = 1; g.restore(); }   // the strap wraps round the back
  g.save(); g.translate(cx, cy); g.rotate(roll);
  const m = faceMap(yawF, pitchF), ey = -4;
  // goggles on the forehead (brass lenses on the shell)
  if (cos.goggles && !mask) { g.save(); g.beginPath(); g.ellipse(0, 0, P.headRx, P.headRy, 0, 0, Math.PI * 2); g.clip(); g.beginPath(); g.ellipse(0, 120, 185, 250, 0, Math.PI * 1.25, Math.PI * 1.75); g.lineWidth = 15; g.strokeStyle = c.strap; g.stroke(); g.restore(); }
  if (cos.goggles) { const browUp = Math.max(f.browL.h, f.browR.h); for (const sg of [-1, 1]) { const q = m(sg * 40, -94 - Math.max(0, browUp - 0.9) * 10); if (q.vis < 0.1) continue; const r = 27 * Math.max(0.25, q.k);
    inked(g, c, () => { g.beginPath(); g.ellipse(q.x, q.y, r, 27, 0, 0, Math.PI * 2); }, c.brass, 4, 3); g.beginPath(); g.ellipse(q.x, q.y, r * 0.63, 17, 0, 0, Math.PI * 2); g.fillStyle = c.lens; g.fill(); g.lineWidth = 3.5; g.strokeStyle = c.ink; g.stroke(); } }
  // blush (behind the features)
  if (f.blush > 0.02 && !mask) for (const sg of [-1, 1]) { const q = m(sg * 60, ey + 36); if (q.vis < 0.1) continue; g.beginPath(); g.ellipse(q.x, q.y, 26 * Math.max(0.3, q.k), 12, 0, 0, Math.PI * 2); g.fillStyle = c.blush; g.globalAlpha = 0.5 * f.blush * q.vis; g.fill(); g.globalAlpha = 1;
    for (const kk of [-1, 0, 1]) taper(g, [[q.x + kk * 9 * q.k - 3, q.y - 4], [q.x + kk * 9 * q.k + 3, q.y + 4]], 3, c.ink, 0.5); }
  drawBrow(g, c, m, f.browL, -1, f, ey); drawBrow(g, c, m, f.browR, 1, f, ey);
  drawEye(g, c, m(-50, ey), f.eyeL, f, -1, mask); drawEye(g, c, m(50, ey), f.eyeR, f, 1, mask);
  if (cos.stache) for (const sg of [-1, 1]) { const a = m(sg * 4, 50), b = m(sg * 20, 47), d = m(sg * 36, 54); if (Math.min(a.vis, d.vis) > 0.1) taper(g, [[a.x, a.y], [b.x, b.y], [d.x, d.y]], 7, c.ink, 0.3); }
  drawMouth(g, c, m, f, mask);
  // tears, vein, sweat
  if (f.tears > 0.05 && !mask) for (const sg of [-1, 1]) { const q = m(sg * 50, ey + 22); if (q.vis < 0.2) continue; g.globalAlpha = Math.min(1, f.tears * 1.4);
    inked(g, c, () => { g.beginPath(); g.moveTo(q.x, q.y); g.quadraticCurveTo(q.x + 9, q.y + 18 + f.tears * 22, q.x, q.y + 24 + f.tears * 26); g.quadraticCurveTo(q.x - 9, q.y + 18 + f.tears * 22, q.x, q.y); }, c.tear, 2, 1.2); g.globalAlpha = 1; }
  if (f.vein > 0.05 && !mask) { const q = m(70, -100); if (q.vis > 0.2) { g.globalAlpha = Math.min(1, f.vein * 1.3); g.strokeStyle = c.vein; g.lineWidth = 4.5; for (const a of [0, 1.57, 3.14, 4.71]) { g.beginPath(); g.arc(q.x + Math.cos(a) * 9, q.y + Math.sin(a) * 9, 6, a + 2.3, a + 4); g.stroke(); } g.globalAlpha = 1; } }
  if (f.sweat > 0.03) { const q = m(112, -46); const sy = q.y - 8 + f.sweat * 10; g.globalAlpha = Math.min(1, f.sweat * 1.5);
    inked(g, c, () => { g.beginPath(); g.moveTo(q.x, sy - 24); g.quadraticCurveTo(q.x + 15, sy, q.x, sy + 9); g.quadraticCurveTo(q.x - 15, sy, q.x, sy - 24); }, c.sweat, 2.5, 1.5);
    if (!mask) { g.beginPath(); g.ellipse(q.x - 4, sy - 2, 3, 5, 0.3, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); } g.globalAlpha = 1; }
  g.restore();
  if (cos.hat) drawHat(g, c, cx, cy, cos.hat, yawF);
};
// ---------------------------------------------------------------- torso (elliptic cylinder along the projected spine)
const drawTorso = (g: G, c: Pal, s: Skeleton, cos: Costume, mask: boolean) => {
  const b = project(s.torsoBot, s.yaw), t = project(s.torsoTop, s.yaw), Y = s.yaw + s.pose.twist * 0.6;
  const cY = Math.cos(Y), sY = Math.sin(Y), wT = Math.hypot(P.torsoWTop * cY, P.torsoD * 0.95 * sY), wB = Math.hypot(P.torsoWBot * cY, (P.torsoD + 14) * sY) + s.pose.chest * 6;
  const ax = t.x - b.x, ay = t.y - b.y, L = Math.hypot(ax, ay), ux = ax / L, uy = ay / L, nx = -uy, ny = ux;          // spine axis (bottom -> top) + normal
  const at = (along: number, across: number): Pt => [b.x + ux * along + nx * across, b.y + uy * along + ny * across];
  const pill = () => { const top = at(L - wT / 2, 0); g.beginPath(); g.moveTo(...at(L - wT / 2, -wT / 2)); g.arc(top[0], top[1], wT / 2, Math.atan2(-ny, -nx), Math.atan2(ny, nx), ux * ny - uy * nx > 0);
    const r1 = at(L * 0.5, wT / 2), r2 = at(40, wB / 2 + 6), r3 = at(0, wB / 2 - 8); g.bezierCurveTo(r1[0], r1[1], r2[0], r2[1], r3[0], r3[1]);
    const m = at(-16, 0), l3 = at(0, -wB / 2 + 8); g.quadraticCurveTo(m[0], m[1], l3[0], l3[1]); const l2 = at(40, -wB / 2 - 6), l1 = at(L * 0.5, -wT / 2), l0 = at(L - wT / 2, -wT / 2); g.bezierCurveTo(l2[0], l2[1], l1[0], l1[1], l0[0], l0[1]); g.closePath(); };
  inked(g, c, pill, c.shirt, 5, 6);
  // surface point at cylinder angle a (0 = front centre): across offset + visibility
  const surf = (a: number, w: number) => ({ off: Math.sin(a + Y) * w / 2 * (Math.abs(cY) > 0.01 || true ? 1 : 1), vis: Math.cos(a + Y) });
  if (!mask) { g.save(); pill(); g.clip(); const sh = at(L * 0.5, -wB * 0.25 - sY * 30); g.fillStyle = c.shirtShade; g.globalAlpha = 0.9; g.beginPath(); g.ellipse(sh[0] - wB * 0.35, sh[1], wB * 0.32, L * 0.7, Math.atan2(uy, ux) + Math.PI / 2, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.beginPath(); const r0 = at(L - 70, -wT / 2 + 6), r1 = at(40, -wB / 2 + 8); g.moveTo(...r0); g.lineTo(...r1); g.lineWidth = 7; g.strokeStyle = c.rim; g.globalAlpha = 0.45; g.stroke(); g.globalAlpha = 1; g.restore(); }
  const front = surf(0, (wT + wB) / 2);
  if (front.vis > 0.05) {
    const v = (along: number, ac: number): Pt => at(along, front.off + ac * Math.max(0.3, front.vis));
    if (cos.suit) { inked(g, c, () => { g.beginPath(); g.moveTo(...v(L - 66, -34)); g.lineTo(...v(L - 66, 34)); g.lineTo(...v(L - 190, 0)); g.closePath(); }, c.collar, 3, 2);
      taper(g, [v(L - 84, 0), v(L - 140, 2), v(L - 186, 0)], 18 * Math.max(0.4, front.vis), c.tie, 0.55, 0.3);
      for (const sg of [-1, 1]) inked(g, c, () => { g.beginPath(); g.moveTo(...v(L - 64, sg * 34)); g.lineTo(...v(L - 196, sg * 10)); g.lineTo(...v(L - 120, sg * 46)); g.closePath(); }, c.shirtShade, 3, 2); }
    else { inked(g, c, () => { g.beginPath(); g.moveTo(...v(L - 70, -30)); g.lineTo(...v(L - 70, 30)); g.lineTo(...v(L - 140, 0)); g.closePath(); }, c.collar, 3, 2);
      if (!mask) for (const a2 of [L - 160, L - 190]) { const q = v(a2, 0); g.beginPath(); g.arc(q[0], q[1], 4.5, 0, Math.PI * 2); g.fillStyle = c.collar; g.fill(); g.lineWidth = 2; g.strokeStyle = c.ink; g.stroke(); } } }
  if (!cos.suit) { // belt band (full circumference) + buckle on the front
    g.save(); pill(); g.clip(); const by = 92; const p0 = at(by, -200), p1 = at(by, 200), q0 = at(by - 22, -200), q1 = at(by - 22, 200);
    g.beginPath(); g.moveTo(...p0); g.lineTo(...p1); g.lineTo(...q1); g.lineTo(...q0); g.closePath(); g.fillStyle = c.belt; g.fill(); g.lineWidth = 3.5; g.strokeStyle = c.ink; g.stroke(); g.restore();
    if (front.vis > 0.1) { const bq = at(92 - 11, front.off); inked(g, c, () => { g.beginPath(); g.ellipse(bq[0], bq[1], 15 * Math.max(0.35, front.vis), 16, Math.atan2(uy, ux) + Math.PI / 2, 0, Math.PI * 2); }, c.buckle, 3, 2); }
    if (cos.apron && front.vis > 0.05) { const a0 = front.off - 66 * front.vis, a1 = front.off + 66 * front.vis;
      inked(g, c, () => { g.beginPath(); g.moveTo(...at(70, a0)); g.lineTo(...at(70, a1)); g.lineTo(...at(-40, a1 + 8)); g.quadraticCurveTo(...at(-50, (a0 + a1) / 2), ...at(-40, a0 - 8)); g.closePath(); }, c.apron, 4, 4); } }
};
// ---------------------------------------------------------------- limbs, feet, hands
const drawShoe = (g: G, c: Pal, ankle: Proj, toe: Proj, far: boolean) => {
  let hx = ankle.x, hy = SOLE - 2, tx = toe.x, ty = Math.min(SOLE, toe.y + 14);
  const dx = tx - hx, dist = Math.abs(dx); if (dist < 44) { const mid = (hx + tx) / 2, sg = dx >= 0 ? 1 : -1; hx = mid - sg * 22; tx = mid + sg * 22; }
  const lift = Math.min(0, ankle.y - (SOLE - P.ankle));   // raised foot (swing / tiptoe)
  hy = Math.min(hy, ankle.y + 16); ty = Math.min(ty, ankle.y + 18);
  const dir = Math.sign(tx - hx) || 1; void lift;
  inked(g, c, () => { g.beginPath(); g.moveTo(hx - dir * 8, hy - 2); g.quadraticCurveTo(hx - dir * 14, hy - 22, hx + dir * 2, ankle.y - 10); g.lineTo(lerp(hx, tx, 0.55), ankle.y - 8);
    g.quadraticCurveTo(tx + dir * 6, ty - 22, tx + dir * 6, ty - 6); g.quadraticCurveTo(tx + dir * 4, ty + 1, tx - dir * 6, ty); g.lineTo(hx, hy); g.closePath(); }, far ? c.limbFar : c.shoe, 3.5, 3);
  g.beginPath(); g.moveTo(hx, hy - 1); g.lineTo(tx, ty - 1); g.lineWidth = 3; g.strokeStyle = c.shoeHi; g.stroke();
};
const drawHand = (g: G, c: Pal, wrist: Pt, dir: number, h: HandShape, side: number, bend: number, far: boolean, palmFacing: number) => {
  const col = far ? c.limbFar : c.glove, showPalm = palmFacing > 0.5, a = dir + bend * side;
  const mir = side * (showPalm ? 1 : -1);
  g.save(); g.translate(wrist[0], wrist[1]); g.rotate(a - Math.PI / 2); g.scale(1.32, 1.32);   // hand frame: +x along the hand (fingers), +y across
  const fingers: [number, number, number][] = [[18, 9, 22], [6, 9.5, 25], [-6, 9, 23], [-17, 8, 19]];   // across offset, width, length
  const curlLen = (L: number, k: number) => L * (1 - 0.72 * k);
  // fingers behind the palm first when curled (knuckle row), straight ones drawn after
  const fdraw = (i: number) => { const [off, wd, L] = fingers[i], k = h.curl[i + 1], spreadA = (i - 1.5) * 0.16 * h.spread * mir; const L2 = curlLen(L, k);
    const base: Pt = [20, off * 0.95 * mir], tip: Pt = [20 + Math.cos(spreadA) * L2, base[1] + Math.sin(spreadA) * L2 * 2.2];
    inked(g, c, () => { g.beginPath(); g.ellipse((base[0] + tip[0]) / 2 + (k > 0.6 ? -2 : 0), (base[1] + tip[1]) / 2, Math.max(wd * 0.62, (L2 + wd) / 2), wd / 2 + (k > 0.6 ? 1.5 : 0), spreadA, 0, Math.PI * 2); }, k > 0.6 ? (c.gloveHi ?? col) : col, 1.8, 1.2); };
  const order = [3, 2, 1, 0]; for (const i of order) if (h.curl[i + 1] > 0.6) fdraw(i);
  inked(g, c, () => { g.beginPath(); g.ellipse(10, 0, 17, 18, 0, 0, Math.PI * 2); }, showPalm && !far ? c.palm : col, 2.2, 1.6);
  for (const i of order) if (h.curl[i + 1] <= 0.6) fdraw(i);
  // thumb (abducts with thumbOut, curls across the palm)
  const tk = h.curl[0], ta = (0.35 + 0.9 * h.thumbOut) * mir * -1, tl = 20 * (1 - 0.55 * tk);
  inked(g, c, () => { g.beginPath(); g.ellipse(6 + Math.cos(ta) * tl * 0.5, -mir * 12 + Math.sin(ta) * tl * 0.5 * -1 * 0, Math.max(6, tl * 0.55), 6.5, ta, 0, Math.PI * 2); }, col, 1.8, 1.2);
  if (showPalm && !far) { g.beginPath(); g.moveTo(4, -6 * mir); g.quadraticCurveTo(12, 0, 4, 8 * mir); g.lineWidth = 1.6; g.strokeStyle = "rgba(40,20,15,0.5)"; g.stroke(); }
  g.restore();
};
const drawArm = (g: G, c: Pal, s: Skeleton, i: 0 | 1, far: boolean) => {
  const sh = project(s.shoulder[i], s.yaw), el = project(s.elbow[i], s.yaw), wr = project(s.wrist[i], s.yaw);
  limb(g, [xy(sh), xy(el), xy(wr)], far ? 12.5 : 14.5, far ? c.limbFar : c.limb);
  const dir = Math.atan2(wr.y - el.y, wr.x - el.x), arm = i === 0 ? s.pose.armL : s.pose.armR, side = i === 0 ? -1 : 1;
  const palmFacing = clamp(arm.shape.palm * Math.cos(s.yaw) + 0.5 * Math.sin(arm.twist * side), 0, 1);
  drawHand(g, c, xy(wr), dir, arm.shape, side, arm.bend, far, palmFacing);
};
const drawLeg = (g: G, c: Pal, s: Skeleton, i: 0 | 1, far: boolean, fins: boolean) => {
  const hp = project(s.hip[i], s.yaw), kn = project(s.knee[i], s.yaw), an = project(s.ankle[i], s.yaw), to = project(s.toe[i], s.yaw);
  limb(g, [xy(hp), xy(kn), xy(an)], far ? 13 : 15, far ? c.limbFar : c.limb); void fins;
  drawShoe(g, c, an, to, far);
};
// ---------------------------------------------------------------- the whole character
export type DrawOpts = { costume: Costume; mask?: boolean; t?: number; behindHead?: [boolean, boolean] };
export const drawTF2 = (g: G, s: Skeleton, f: FaceRig, o: DrawOpts) => {
  const cos = o.costume, mask = !!o.mask, c = mask ? MASK : { ...COLORS, ...(cos.pal ?? {}) };
  const pr = (p: V3) => project(p, s.yaw);
  const hd = pr(s.head);
  // depth ordering: legs (far first) -> arms behind the torso -> torso -> arms beside/behind the head -> head -> arms in front of the face
  const legD = [0, 1].map((i) => (pr(s.knee[i]).d + pr(s.ankle[i]).d) / 2);
  const armD = [0, 1].map((i) => (pr(s.elbow[i]).d + pr(s.wrist[i]).d) / 2);
  const legOrder = legD[0] <= legD[1] ? [0, 1] : [1, 0];
  for (const i of legOrder) drawLeg(g, c, s, i as 0 | 1, legD[i] < legD[1 - i] - 30, !!cos.fins);
  const farArm = (i: number) => armD[i] < -28;
  for (const i of [0, 1]) if (farArm(i)) drawArm(g, c, s, i as 0 | 1, true);
  drawTorso(g, c, s, cos, mask);
  const frontOfFace = (i: number) => { const w = pr(s.wrist[i]); return w.d > 70 && w.y < hd.y + P.headRy && !(o.behindHead?.[i]); };
  for (const i of [0, 1]) if (!farArm(i) && !frontOfFace(i)) drawArm(g, c, s, i as 0 | 1, false);
  drawHead(g, c, [hd.x, hd.y], s, f, cos, mask, o.t ?? 0);
  for (const i of [0, 1]) if (!farArm(i) && frontOfFace(i)) drawArm(g, c, s, i as 0 | 1, false);
};
/** card-px helpers for the 3D integration (halo, held props) */
export const headPx = (s: Skeleton): Pt => { const h = project(s.head, s.yaw); return [h.x, h.y]; };
export const wristPx = (s: Skeleton, i: 0 | 1): Pt => { const w = project(s.wrist[i], s.yaw); return [w.x, w.y]; };
export { W };
