// "Odo Fennick" v5: same design language as v4 (glowing round head overlapping a pill torso, brush line weight,
// goggles, silver tufts, curly hairs, teal shirt, mustard belt, rust tool-apron) with a rebuilt performance rig:
//   WALK  keyed contact / down / passing / up poses (periodic spline), planted feet with heel-strike & toe-off,
//         torso squash-stretch + tilt + sway, head lag + nod, hair follow-through, momentum lean
//   ARMS  shoulder swing with elbow follow-through and wrist drag, real hand shapes (relaxed, fist, grip, open,
//         thumbs-up, scratch), front-view arm poses solved with IK, arm can pass behind the head (scratch)
//   FACE  eye modes (lidded / wide pinprick / squint ^^ / wince), worried inner-brow raise, mouths incl. the
//         clenched "yikes" grin, blush, sweat drop, cool rim light painted on the card for separation
// Canvas 600 x 1000, soles on y = 975. `mask` mode draws the emissive glow mask (face white, rest dim).
export const W5 = 600, H5 = 1000, SOLE5 = 975, CARD_H5 = 1.55;
export const PX5 = CARD_H5 / H5;

export type Eyes5 = "lid" | "wide" | "squint" | "wince";
export type Mouth5 = "awkward" | "yikes" | "o" | "smile" | "flat" | "wobble";
export type Hand5 = "relaxed" | "fist" | "grip" | "open" | "thumb";
export type ArmPose = { hand: [number, number]; bend: number; shape: Hand5; rot: number; behind?: boolean; elbow?: [number, number] };
export type Odo5Pose = {
  view: "front" | "side";
  gait: number; // gait cycles (fractional) — drives every walk curve
  walk: number; // 0..1 blend standing -> walking
  stride: number; // metres per gait cycle
  lean: number; // extra momentum lean (radians, + forward)
  blink: boolean; lookX: number; lookY: number;
  eyes: Eyes5; lids: number; pupil: number; // pupil scale (0.4 = pinprick)
  browL: number; browR: number; worry: number; // brows lift (-1..1) and inner raise (0..1)
  mouth: Mouth5; mouthW: number; // mouth width multiplier
  blush: number; sweat: number;
  armL: ArmPose; armR: ArmPose; // front view (screen-left / screen-right)
  scratch: number; // phase for scratching wiggle
  holdLantern: boolean; // side: near hand grips lantern bail; front: armL grips it
  rim: number; // painted rim light strength
  breathe: number; squash: number; hairLag: number;
};
const A = (hand: [number, number], shape: Hand5 = "relaxed", bend = 1, rot = 0, behind = false, elbow?: [number, number]): ArmPose => ({ hand, bend, shape, rot, behind, elbow });
export const REST_L = A([-34, 194], "relaxed", -1, 0.15), REST_R = A([34, 194], "relaxed", 1, -0.15);
/** Front-view arm poses used by the acting timeline */
export const ARM = {
  lantern: A([-40, 190], "grip", -1, 0),
  scratch: A([88, -168], "open", -1, 2.6, true, [128, -64]),
  thumb: A([104, -26], "thumb", 1, Math.PI, false, [88, 66]),
  thumbLow: A([70, 60], "fist", 1, 0),
  shrugR: A([110, -40], "open", 1, -0.8),
};
export const pose5 = (o: Partial<Odo5Pose> = {}): Odo5Pose => ({
  view: "front", gait: 0, walk: 0, stride: 0.72, lean: 0, blink: false, lookX: 0.3, lookY: 0,
  eyes: "lid", lids: 0.45, pupil: 1, browL: 0.7, browR: -0.15, worry: 0, mouth: "awkward", mouthW: 1,
  blush: 0, sweat: 0, armL: REST_L, armR: REST_R, scratch: 0, holdLantern: false, rim: 0.6,
  breathe: 0, squash: 0, hairLag: 0, ...o,
});

type G = CanvasRenderingContext2D; type P = [number, number]; type Pal = Record<string, string>;
const COLORS: Pal = {
  ink: "#241923", limb: "#2b1f29", limbFar: "#3e303b", skin: "#fff6ea",
  face: "#fffaf3", faceShade: "#ecdfd2", hair: "#ebe9f0", hairShade: "#b9b4c4",
  shirt: "#2c6c72", shirtShade: "#1f5156", collar: "#f3ead6", belt: "#e4a62c", buckle: "#d3a64a",
  apron: "#c4572a", apronShade: "#9b4120", brass: "#d0a245", brassD: "#8c6522", lens: "#ffe08c", strap: "#5a3a2a",
  shoe: "#2e1d16", mouth: "#6a2230", tongue: "#d0666e", teeth: "#ffffff", sweat: "#bfe6ff", wrench: "#a9b2bc",
  blush: "#ff8a8a", rim: "#a9bcff", glove: "#6a4a3c",
};
const MASK: Pal = Object.fromEntries(Object.keys(COLORS).map((k) => [k, "#4a4a4a"]));
Object.assign(MASK, { ink: "#141414", limb: "#1a1a1a", limbFar: "#1a1a1a", face: "#ffffff", faceShade: "#ececec", teeth: "#ffffff", lens: "#b0b0b0", blush: "#ffffff", rim: "#4a4a4a", sweat: "#9a9a9a" });

// ---------- brush helpers ----------
const inked = (g: G, c: Pal, path: () => void, fill: string, w = 6, k = 5) => {
  g.save(); g.translate(k * 0.6, k * 0.8); path(); g.fillStyle = c.ink; g.fill(); g.lineWidth = w * 2; g.strokeStyle = c.ink; g.lineJoin = "round"; g.stroke(); g.restore();
  path(); g.lineWidth = w * 2; g.strokeStyle = c.ink; g.lineJoin = "round"; g.stroke();
  path(); g.fillStyle = fill; g.fill();
};
const taper = (g: G, pts: P[], wMid: number, col: string, wEnd = 0.25, bias = 0.5) => {
  const S: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) for (let t = 0; t < 1; t += 0.125) S.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
  S.push(pts[pts.length - 1]);
  const n = S.length, L: P[] = [], R: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const t = i / (n - 1);
    const u = t < bias ? (t / bias) * 0.5 : 0.5 + ((t - bias) / (1 - bias)) * 0.5;
    const w = (wMid * (wEnd + (1 - wEnd) * Math.pow(Math.sin(Math.PI * u), 0.6))) / 2;
    L.push([S[i][0] - dy * w, S[i][1] + dx * w]); R.push([S[i][0] + dy * w, S[i][1] - dx * w]);
  }
  g.beginPath(); g.moveTo(...L[0]); for (const p of L) g.lineTo(...p); for (let i = n - 1; i >= 0; i--) g.lineTo(...R[i]); g.closePath();
  g.fillStyle = col; g.fill();
  g.beginPath(); g.arc(S[0][0], S[0][1], (wMid * wEnd) / 2, 0, Math.PI * 2); g.arc(S[n - 1][0], S[n - 1][1], (wMid * wEnd) / 2, 0, Math.PI * 2); g.fill();
};
const limb = (g: G, pts: P[], w: number, col: string) => taper(g, pts, w, col, 0.72, 0.35);
const smooth = (t: number) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const ik = (a: P, b: P, L1: number, L2: number, bend: number): P => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.min(L1 + L2 - 0.5, Math.max(1, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx), k = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const ang = base - bend * k; return [a[0] + Math.cos(ang) * L1, a[1] + Math.sin(ang) * L1];
};
/** periodic Catmull-Rom through [t, v] keys on 0..1 */
const keyed = (keys: [number, number][], t: number) => {
  t = ((t % 1) + 1) % 1;
  const n = keys.length; let i = 0; while (i < n - 1 && keys[i + 1][0] <= t) i++;
  const k1 = keys[i], k2 = keys[(i + 1) % n];
  const t2 = k2[0] <= k1[0] ? k2[0] + 1 : k2[0];
  const u = (t - k1[0]) / (t2 - k1[0]);
  const v0 = keys[(i - 1 + n) % n][1], v1 = k1[1], v2 = k2[1], v3 = keys[(i + 2) % n][1];
  return 0.5 * (2 * v1 + (-v0 + v2) * u + (2 * v0 - 5 * v1 + 4 * v2 - v3) * u * u + (-v0 + 3 * v1 - 3 * v2 + v3) * u * u * u);
};

// ---------- hands ----------
/** Mitten hands with a readable thumb. `rot` = direction the hand points (radians, 0 = down). `side` mirrors thumb. */
const drawHand = (g: G, c: Pal, at: P, rot: number, shape: Hand5, side: number, far: boolean, s = 1) => {
  const col = far ? c.limbFar : c.glove;
  g.save(); g.translate(at[0], at[1]); g.rotate(-rot); g.scale(side * s, s);
  const palm = () => { g.beginPath(); if (shape === "open") g.ellipse(0, 6, 17, 19, 0, 0, Math.PI * 2); else g.ellipse(0, 4, 15, 16, 0, 0, Math.PI * 2); };
  inked(g, c, palm, col, 2.2, 1.6);
  if (shape === "thumb") inked(g, c, () => { g.beginPath(); g.ellipse(-4, -18, 6.5, 13, -0.15, 0, Math.PI * 2); }, col, 2, 1.4);
  else if (shape === "open") { for (const a of [-0.5, 0, 0.5]) inked(g, c, () => { g.beginPath(); g.ellipse(Math.sin(a) * 14, 20 + Math.cos(a) * 6, 5.5, 9, a, 0, Math.PI * 2); }, col, 1.8, 1.2); inked(g, c, () => { g.beginPath(); g.ellipse(15, 2, 5.5, 9, -1.0, 0, Math.PI * 2); }, col, 1.8, 1.2); }
  else if (shape !== "fist") inked(g, c, () => { g.beginPath(); g.ellipse(13, 0, 5.5, 9, -0.7, 0, Math.PI * 2); }, col, 1.8, 1.2);
  if (shape === "fist" || shape === "grip" || shape === "thumb") { g.beginPath(); g.moveTo(-9, 8); g.quadraticCurveTo(0, 12, 9, 8); g.lineWidth = 2; g.strokeStyle = far ? "#222" : "#6a5148"; g.stroke(); }
  g.restore();
};

// ---------- head ----------
export const HEAD5 = { rx: 150, ry: 143 };
const headPath = (g: G, cx: number, cy: number) => () => { g.beginPath(); g.ellipse(cx, cy, HEAD5.rx, HEAD5.ry, 0, 0, Math.PI * 2); };

const drawHead = (g: G, c: Pal, cx: number, cy: number, p: Odo5Pose, side: boolean, mask: boolean) => {
  const fx = side ? 46 : 0, sp = side ? 0.62 : 1;
  const tuft = (x: number, dir: number, s: number) => inked(g, c, () => {
    g.beginPath();
    g.moveTo(x, cy - 52 * s); g.bezierCurveTo(x + dir * 60 * s, cy - 70 * s, x + dir * 72 * s, cy - 6 * s, x + dir * 50 * s, cy + 10 * s);
    g.bezierCurveTo(x + dir * 74 * s, cy + 30 * s, x + dir * 50 * s, cy + 66 * s, x + dir * 12 * s, cy + 50 * s); g.closePath();
  }, c.hair, 4, 3);
  if (side) tuft(cx - 128, -1, 1.05); else { tuft(cx - 132, -1, 0.95); tuft(cx + 132, 1, 0.95); }
  inked(g, c, headPath(g, cx, cy), c.face, 5, 7);
  if (!mask) {
    g.save(); headPath(g, cx, cy)(); g.clip();
    const gr = g.createRadialGradient(cx + 40, cy - 50, 40, cx, cy, 175); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.72, "rgba(255,255,255,0)"); gr.addColorStop(1, c.faceShade);
    g.fillStyle = gr; g.fillRect(cx - 200, cy - 200, 400, 400);
    // cool rim light on the left edge (moonlight side) for separation from the warm background
    if (p.rim > 0) { g.beginPath(); g.ellipse(cx, cy, HEAD5.rx - 6, HEAD5.ry - 6, 0, Math.PI * 0.62, Math.PI * 1.28); g.lineWidth = 9; g.strokeStyle = c.rim; g.globalAlpha = 0.7 * p.rim; g.stroke(); g.globalAlpha = 1; }
    g.restore();
  }
  // curly hairs with follow-through
  const hl = p.hairLag;
  for (const [dx, h, cv] of [[-18, 54, -24], [4, 70, 14], [24, 46, 30]] as const) {
    const sw = hl * (0.6 + h / 100) * 26;
    taper(g, [[cx + dx, cy - HEAD5.ry + 6], [cx + dx + cv * 0.4 - sw * 0.3, cy - HEAD5.ry - h * 0.6], [cx + dx + cv - sw * 0.8, cy - HEAD5.ry - h * 0.75 + Math.abs(sw) * 0.2], [cx + dx + cv * 1.3 - sw, cy - HEAD5.ry - h * 0.45 + Math.abs(sw) * 0.3]], 7, c.ink, 0.3);
  }
  const ex = p.lookX * 9, ey = cy - 4 - 8 * p.lookY;
  const eyeX = (s: number) => cx + fx + s * 46 * sp;
  if (!mask) { g.save(); headPath(g, cx, cy)(); g.clip(); g.beginPath(); g.ellipse(cx, cy + 120, 185, 250, 0, Math.PI * 1.25, Math.PI * 1.75); g.lineWidth = 15; g.strokeStyle = c.strap; g.stroke(); g.restore(); }
  const gy = cy - 94;
  const lens = (x: number) => {
    inked(g, c, () => { g.beginPath(); g.arc(x, gy, 27, 0, Math.PI * 2); }, c.brass, 4, 3);
    g.beginPath(); g.arc(x, gy, 17, 0, Math.PI * 2); g.fillStyle = c.lens; g.fill(); g.lineWidth = 3.5; g.strokeStyle = c.ink; g.stroke();
    if (!mask) { g.beginPath(); g.ellipse(x - 6, gy - 6, 6, 3.5, -0.6, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 22, gy + Math.sin(a) * 22, 1.6, 0, Math.PI * 2); g.fillStyle = c.brassD; g.fill(); } }
  };
  if (side) lens(cx + fx + 40); else { lens(cx - 40); lens(cx + 40); g.beginPath(); g.moveTo(cx - 13, gy); g.lineTo(cx + 13, gy); g.lineWidth = 7; g.strokeStyle = c.brassD; g.stroke(); }

  // blush (behind features)
  if (p.blush > 0.02 && !mask) for (const s of side ? [1] : [-1, 1]) { g.beginPath(); g.ellipse(eyeX(s) + s * 14, ey + 36, 24 * sp + 4, 11, 0, 0, Math.PI * 2); g.fillStyle = c.blush; g.globalAlpha = 0.45 * p.blush; g.fill(); g.globalAlpha = 1;
    for (const k of [-1, 0, 1]) taper(g, [[eyeX(s) + s * 14 + k * 9 - 3, ey + 32], [eyeX(s) + s * 14 + k * 9 + 3, ey + 40]], 3, c.ink, 0.5); }

  // brows: lift + inner "worry" raise, tapered
  const brow = (s: number, lift: number) => {
    const x = eyeX(s), y = ey - 42 - lift * 16;
    const inner = -p.worry * 16, outer = p.worry * 6;
    const xi = x - s * 24 * sp, xo = x + s * 24 * sp;
    taper(g, [[xi, y + 4 + inner], [x, y - 6 - Math.max(0, lift) * 5 + inner * 0.4], [xo, y + 6 + outer]], 11.5, c.ink, 0.35);
  };
  brow(-1, p.browL); brow(1, side ? p.browR * 0.6 : p.browR);

  // eyes
  const eye = (s: number, mode: Eyes5) => {
    const x = eyeX(s);
    if (p.blink && mode !== "squint") { taper(g, [[x - 13, ey], [x, ey + 4], [x + 13, ey]], 6, c.ink, 0.4); return; }
    if (mode === "squint") { taper(g, [[x - 15, ey + 6], [x, ey - 7], [x + 15, ey + 6]], 7.5, c.ink, 0.4); return; } // ^ shape
    if (mode === "wide") {
      inked(g, c, () => { g.beginPath(); g.ellipse(x, ey, 17 * sp + 3, 20, 0, 0, Math.PI * 2); }, c.teeth, 2.5, 2);
      g.beginPath(); g.arc(x + ex * 0.6, ey + 1, 6.5 * p.pupil, 0, Math.PI * 2); g.fillStyle = c.ink; g.fill();
      return;
    }
    g.beginPath(); g.ellipse(x + ex, ey, 10.5 * p.pupil, 13 * p.pupil, 0, 0, Math.PI * 2); g.fillStyle = c.ink; g.fill();
    if (!mask) { g.beginPath(); g.arc(x + ex - 3, ey - 4, 3, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); }
    const lidY = ey - 13 + p.lids * 13;
    g.beginPath(); g.rect(x - 18, ey - 22, 36, lidY - (ey - 22)); g.fillStyle = c.face; g.fill();
    taper(g, [[x - 17, lidY + 1], [x, lidY - 1.5], [x + 17, lidY + 2]], 6.5, c.ink, 0.5);
  };
  const eL: Eyes5 = p.eyes === "wince" ? "squint" : p.eyes, eR: Eyes5 = p.eyes === "wince" ? "wide" : p.eyes;
  eye(-1, eL); eye(1, eR);
  if (p.eyes === "lid" && p.lids > 0.3) for (const s of side ? [1] : [-1, 1]) taper(g, [[eyeX(s) - 9, ey + 20], [eyeX(s) + 1, ey + 23], [eyeX(s) + 9, ey + 20]], 3, c.ink, 0.3);

  // mouth
  const mx = cx + fx + (side ? 8 : 6), my = cy + 64, mw = p.mouthW;
  switch (p.mouth) {
    case "awkward": taper(g, [[mx - 26 * sp * mw, my + 4], [mx - 10 * sp, my + 1], [mx + 4 * sp, my + 4], [mx + 18 * sp * mw, my - 4], [mx + 24 * sp * mw, my - 10]], 7, c.ink, 0.35); break;
    case "wobble": taper(g, [[mx - 28 * sp * mw, my + 2], [mx - 16 * sp, my - 3], [mx - 4 * sp, my + 3], [mx + 8 * sp, my - 3], [mx + 20 * sp, my + 3], [mx + 28 * sp * mw, my - 2]], 6.5, c.ink, 0.35); break;
    case "yikes": { // wide clenched grin, corners pulled down-and-out
      const w = 44 * sp * mw, h = 22;
      g.save(); g.translate(mx, my); g.rotate(-0.05);
      const shape = () => { g.beginPath(); g.moveTo(-w, 4); g.quadraticCurveTo(-w * 0.9, -h * 0.75, 0, -h * 0.7); g.quadraticCurveTo(w * 0.9, -h * 0.75, w, 2); g.quadraticCurveTo(w * 0.8, h * 0.9, 0, h * 0.85); g.quadraticCurveTo(-w * 0.8, h * 0.9, -w, 4); g.closePath(); };
      inked(g, c, shape, c.teeth, 3.5, 2.5);
      g.save(); shape(); g.clip();
      g.beginPath(); g.moveTo(-w, 2); g.quadraticCurveTo(0, 6, w, 1); g.lineWidth = 2.6; g.strokeStyle = c.ink; g.stroke();
      for (const t of [-0.66, -0.33, 0, 0.33, 0.66]) { g.beginPath(); g.moveTo(t * w, -h); g.lineTo(t * w * 1.04, h); g.lineWidth = 2.2; g.stroke(); }
      g.restore();
      for (const s of [-1, 1]) taper(g, [[s * w, 3], [s * (w + 8), 10]], 4.5, c.ink, 0.4); // strain lines at the corners
      g.restore(); break;
    }
    case "o": inked(g, c, () => { g.beginPath(); g.ellipse(mx, my + 2, 9 * sp + 3, 12, 0, 0, Math.PI * 2); }, c.mouth, 3.5, 2); break;
    case "smile": inked(g, c, () => { g.beginPath(); g.moveTo(mx - 24 * sp, my - 4); g.quadraticCurveTo(mx, my + 30, mx + 24 * sp, my - 6); g.quadraticCurveTo(mx, my + 6, mx - 24 * sp, my - 4); }, c.mouth, 3.5, 2); break;
    default: taper(g, [[mx - 18 * sp, my], [mx + 18 * sp, my - 2]], 6, c.ink, 0.4);
  }
  if (p.sweat > 0.02) {
    const sx = cx + (side ? -34 : 112), sy = cy - 44 + (1 - p.sweat) * -10 + p.sweat * 6;
    g.save(); g.globalAlpha = Math.min(1, p.sweat * 1.5);
    inked(g, c, () => { g.beginPath(); g.moveTo(sx, sy - 24); g.quadraticCurveTo(sx + 15, sy, sx, sy + 9); g.quadraticCurveTo(sx - 15, sy, sx, sy - 24); }, c.sweat, 2.5, 1.5);
    if (!mask) { g.beginPath(); g.ellipse(sx - 4, sy - 2, 3, 5, 0.3, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); }
    g.restore();
  }
};

// ---------- body ----------
const torsoPath = (g: G, cx: number, top: number, bot: number, wTop: number, wBot: number) => () => {
  g.beginPath(); g.moveTo(cx - wTop / 2, top + wTop / 2); g.arc(cx, top + wTop / 2, wTop / 2, Math.PI, 0);
  g.bezierCurveTo(cx + wTop / 2, top + (bot - top) * 0.5, cx + wBot / 2 + 6, bot - 40, cx + wBot / 2 - 8, bot);
  g.quadraticCurveTo(cx, bot + 16, cx - wBot / 2 + 8, bot);
  g.bezierCurveTo(cx - wBot / 2 - 6, bot - 40, cx - wTop / 2, top + (bot - top) * 0.5, cx - wTop / 2, top + wTop / 2); g.closePath();
};
const drawTorso = (g: G, c: Pal, cx: number, top: number, bot: number, side: boolean, sway: number, mask: boolean, rim: number) => {
  const wT = side ? 120 : 138, wB = side ? 132 : 156;
  const tp = torsoPath(g, cx, top, bot, wT, wB);
  inked(g, c, tp, c.shirt, 5, 6);
  if (!mask) {
    g.save(); tp(); g.clip(); g.fillStyle = c.shirtShade; g.fillRect(cx - wB, top, wB * 0.55, bot - top + 30);
    // fabric folds + stitched seam
    g.strokeStyle = "rgba(10,30,32,0.35)"; g.lineWidth = 3;
    for (const k of [-1, 1]) { g.beginPath(); g.moveTo(cx + k * 30, top + 160); g.quadraticCurveTo(cx + k * 38, top + 190, cx + k * 34, top + 210); g.stroke(); }
    g.setLineDash([6, 6]); g.beginPath(); g.moveTo(cx + (side ? 40 : 0), top + 150); g.lineTo(cx + (side ? 44 : 0), bot - 100); g.strokeStyle = "rgba(200,240,240,0.25)"; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
    if (rim > 0) { g.beginPath(); g.moveTo(cx - wT / 2 + 6, top + 70); g.bezierCurveTo(cx - wT / 2 + 4, top + 150, cx - wB / 2 + 2, bot - 60, cx - wB / 2 + 10, bot - 6); g.lineWidth = 7; g.strokeStyle = c.rim; g.globalAlpha = 0.55 * rim; g.stroke(); g.globalAlpha = 1; }
    g.restore();
  }
  const vx = cx + (side ? 26 : 0);
  inked(g, c, () => { g.beginPath(); g.moveTo(vx - 30, top + 70); g.lineTo(vx + 30, top + 70); g.lineTo(vx, top + 140); g.closePath(); }, c.collar, 3, 2);
  if (!mask) for (const y of [top + 160, top + 190]) { g.beginPath(); g.arc(vx + (side ? 4 : 0), y, 4.5, 0, Math.PI * 2); g.fillStyle = c.collar; g.fill(); g.lineWidth = 2; g.strokeStyle = c.ink; g.stroke(); }
  const by = bot - 92;
  g.save(); tp(); g.clip(); g.fillStyle = c.belt; g.fillRect(cx - 120, by, 240, 22); g.fillStyle = c.ink; g.fillRect(cx - 120, by - 3, 240, 4); g.fillRect(cx - 120, by + 21, 240, 4);
  if (!mask) { g.fillStyle = "rgba(90,50,0,0.5)"; for (let x = cx - 110; x < cx + 110; x += 18) g.fillRect(x, by + 9, 8, 3); }
  g.restore();
  inked(g, c, () => { g.beginPath(); g.roundRect(vx - 15 + (side ? 18 : 0), by - 5, 30, 32, 5); }, c.buckle, 3, 2);
  const a0 = side ? cx - 6 : cx - 66, a1 = side ? cx + wB / 2 + 12 : cx + 66;
  const apron = () => { g.beginPath(); g.moveTo(a0 + 4, by + 24); g.lineTo(a1 - 4, by + 24); g.lineTo(a1 + 6 + sway, bot + 46); g.quadraticCurveTo((a0 + a1) / 2 + sway, bot + 56, a0 - 6 + sway * 0.6, bot + 46); g.closePath(); };
  inked(g, c, apron, c.apron, 4, 4);
  if (!mask) {
    g.save(); apron(); g.clip(); g.fillStyle = c.apronShade; g.fillRect(a0 - 10, by + 20, 22, 120);
    g.setLineDash([5, 5]); g.strokeStyle = "rgba(255,220,180,0.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(a0 + 10, by + 34); g.lineTo(a1 - 10 + sway * 0.5, by + 34); g.stroke(); g.setLineDash([]); g.restore();
    const px = side ? cx + 46 : cx + 26, py = by + 46;
    inked(g, c, () => { g.beginPath(); g.roundRect(px - 20, py, 40, 30, 4); }, c.apronShade, 3, 2);
    limb(g, [[px - 6, py + 6], [px - 12, py - 26]], 8, c.wrench);
    g.beginPath(); g.arc(px - 13, py - 32, 9, 0.7, Math.PI * 2 - 0.7); g.lineWidth = 6; g.strokeStyle = c.wrench; g.stroke();
    limb(g, [[px + 8, py + 4], [px + 12, py - 20]], 6, "#e9c34a");
  }
};
const shoe = (g: G, c: Pal, ankle: P, ang: number, dir: number) => {
  g.save(); g.translate(ankle[0], ankle[1]); g.rotate(ang); g.scale(dir, 1);
  inked(g, c, () => { g.beginPath(); g.moveTo(-14, -10); g.quadraticCurveTo(-22, 12, -6, 14); g.lineTo(34, 14); g.quadraticCurveTo(46, 12, 40, -2); g.quadraticCurveTo(26, -14, 6, -16); g.closePath(); }, c.shoe, 3.5, 3);
  g.beginPath(); g.moveTo(-8, 15); g.lineTo(38, 15); g.lineWidth = 3; g.strokeStyle = "#8a6a55"; g.stroke();
  g.restore();
};

// ---------- walk ----------
const LEG_T = 144, LEG_S = 140, ANKLE = 16, STANCE = 0.6;
type Foot = { pos: P; ang: number };
const footAt = (q: number, Lpx: number): Foot => {
  q = ((q % 1) + 1) % 1;
  const half = (STANCE * Lpx) / 2;
  if (q < STANCE) {
    const u = q / STANCE, x = half - u * 2 * half;
    let ang = 0, lift = 0;
    if (u < 0.16) ang = -0.32 * (1 - smooth(u / 0.16));
    if (u > 0.68) { const k = (u - 0.68) / 0.32; ang = 0.62 * k * k; lift = Math.sin(ang) * 40; }
    return { pos: [x - (u > 0.68 ? (1 - Math.cos(ang)) * 40 : 0), SOLE5 - ANKLE - lift], ang };
  }
  const v = (q - STANCE) / (1 - STANCE), e = smooth(v);
  const x = -half + (e * 0.85 + v * 0.15) * 2 * half;
  const lift = Math.sin(Math.PI * Math.pow(v, 0.7)) * 52;
  const ang = 0.62 * (1 - smooth(v * 1.8)) - 0.32 * smooth((v - 0.55) / 0.45);
  return { pos: [x, SOLE5 - ANKLE - lift - Math.max(0, Math.sin(ang)) * 24], ang };
};
// per-STEP curves (s in 0..1 = one step; two steps per gait cycle)
const HIP_Y: [number, number][] = [[0, 4], [0.16, 24], [0.42, 6], [0.66, -14], [0.86, -4]];
const TORSO_SQ: [number, number][] = [[0, 0.0], [0.16, 0.04], [0.42, -0.01], [0.66, -0.035], [0.86, -0.01]];
const TORSO_TILT: [number, number][] = [[0, 0.06], [0.16, 0.09], [0.42, 0.05], [0.66, 0.03], [0.86, 0.045]];

type Rig = { hip: P; top: number; bot: number; headC: P; tilt: number; nod: number; side: boolean; sq: number; q: number; s: number };
const rig = (p: Odo5Pose): Rig => {
  const side = p.view === "side", w = side ? p.walk : 0;
  const q = p.gait - Math.floor(p.gait), s = (q * 2) % 1;
  const breath = Math.sin(p.breathe) * 3.5 * (1 - w);
  const hipStand = SOLE5 - ANKLE - (LEG_T + LEG_S) * 0.98;
  const hipY = hipStand + w * (6 + keyed(HIP_Y, s));
  const sq = w * keyed(TORSO_SQ, s);
  const tilt = w * keyed(TORSO_TILT, s) + p.lean;
  const hip: P = [300 - (side ? 4 : 0), hipY];
  const bot = hipY + 4, top = bot - 300 * (1 - sq) - breath;
  const hLag = w * keyed(HIP_Y, s - 0.1) * 0.45;
  const nod = w * (keyed(TORSO_TILT, s - 0.12) - 0.055) * 0.9;
  const headC: P = [hip[0] + (side ? 10 + Math.sin(tilt) * 300 : 0), top - 54 + hLag - (sq * 30)];
  return { hip, top, bot, headC, tilt, nod, side, sq, q, s };
};
export const headCenterPx5 = (p: Odo5Pose): P => rig(p).headC;

/** Near (lantern) hand position in canvas px for the 3D lantern; swings with the walk. */
export const lanternHandPx5 = (p: Odo5Pose): P => {
  const r = rig(p);
  if (r.side) {
    const sh: P = [r.hip[0] + 14 + Math.sin(r.tilt) * 210, r.top + 112];
    const a = sideArmAngles(p, r.q, false, true);
    const el: P = [sh[0] + Math.sin(a.a1) * 108, sh[1] + Math.cos(a.a1) * 108];
    return [el[0] + Math.sin(a.a2) * 100, el[1] + Math.cos(a.a2) * 100];
  }
  const sh: P = [300 - 64, r.top + 112];
  return [sh[0] + p.armL.hand[0], sh[1] + p.armL.hand[1]];
};

const sideArmAngles = (p: Odo5Pose, q: number, far: boolean, lantern: boolean) => {
  const w = p.walk;
  const ph = q + (far ? 0.5 : 0);
  const amp = lantern ? 0.32 : 0.78; // the lantern arm swings less (carrying weight)
  const sw = Math.sin(2 * Math.PI * ph);
  const a1 = -amp * sw * w + (lantern ? 0.12 : 0.04) + p.lean * 0.5;
  // elbow follows through: bends more as the arm swings forward, lagging the shoulder
  const fwd = Math.max(0, -Math.sin(2 * Math.PI * (ph - 0.09)));
  const a2 = a1 + (lantern ? 0.35 : 0.14) + (lantern ? 0.15 : 0.72) * fwd * w;
  // wrist drags behind the forearm
  const wrist = a2 + 0.25 * Math.sin(2 * Math.PI * (ph - 0.18)) * w * (lantern ? 0.2 : 1);
  return { a1, a2, wrist };
};

export const drawOdo5 = (g: G, p: Odo5Pose, mask = false) => {
  const c = mask ? MASK : COLORS;
  const r = rig(p);
  const side = r.side, w = side ? p.walk : 0;
  const Lpx = p.stride / PX5;
  const sqT = p.squash * 0.06;
  g.save(); g.translate(300, SOLE5); g.scale(1 + sqT, 1 - sqT); g.translate(-300, -SOLE5);
  const { hip, top, bot } = r;
  if (side) {
    const stand = (o: number): Foot => ({ pos: [o, SOLE5 - ANKLE], ang: 0 });
    const mixF = (f: Foot, st: Foot): Foot => ({ pos: [hip[0] + st.pos[0] + (f.pos[0] - st.pos[0]) * w, st.pos[1] + (f.pos[1] - st.pos[1]) * w], ang: f.ang * w });
    const near = mixF(footAt(r.q, Lpx), stand(14)), far = mixF(footAt(r.q + 0.5, Lpx), stand(-16));
    const sh: P = [hip[0] + 14 + Math.sin(r.tilt) * 210, top + 112];
    const arm = (isFar: boolean) => {
      const lantern = !isFar && p.holdLantern;
      const a = sideArmAngles(p, r.q, isFar, lantern);
      const o: P = isFar ? [sh[0] - 10, sh[1] + 2] : sh;
      const el: P = [o[0] + Math.sin(a.a1) * 108, o[1] + Math.cos(a.a1) * 108];
      const hd: P = [el[0] + Math.sin(a.a2) * 100, el[1] + Math.cos(a.a2) * 100];
      limb(g, [o, el, hd], isFar ? 12.5 : 14.5, isFar ? c.limbFar : c.limb);
      drawHand(g, c, hd, lantern ? 0 : a.wrist, lantern ? "grip" : "relaxed", 1, isFar, isFar ? 0.92 : 1);
    };
    arm(true);
    const leg = (f: Foot, isFar: boolean) => { const knee = ik(hip, f.pos, LEG_T, LEG_S, 1); limb(g, [hip, knee, f.pos], isFar ? 13 : 15, isFar ? c.limbFar : c.limb); shoe(g, c, f.pos, f.ang, 1); };
    leg(far, true); leg(near, false);
    const sway = -Math.sin(2 * Math.PI * r.q) * 9 * w;
    g.save(); g.translate(hip[0], hip[1]); g.rotate(r.tilt); g.translate(-hip[0], -hip[1]);
    drawTorso(g, c, hip[0], top, bot, true, sway, mask, p.rim);
    g.restore();
    const hc = r.headC;
    g.save(); g.translate(hc[0], hc[1] + 140); g.rotate(r.nod - 0.06 * p.lookY); g.translate(-hc[0], -(hc[1] + 140));
    drawHead(g, c, hc[0], hc[1], p, true, mask);
    g.restore();
    arm(false);
  } else {
    for (const s of [-1, 1]) {
      const h: P = [300 + s * 34, hip[1] - 6], a: P = [300 + s * 52, SOLE5 - ANKLE];
      const knee: P = [300 + s * 47, (h[1] + a[1]) / 2 - 4];
      limb(g, [h, knee, a], 15, c.limb); shoe(g, c, a, 0, s);
    }
    const shoulder = (s: number): P => [300 + s * 64, top + 112];
    const frontArm = (s: number, ap: ArmPose) => {
      const o = shoulder(s);
      let hd: P = [o[0] + ap.hand[0], o[1] + ap.hand[1]];
      if (ap.shape === "open" && ap.behind) hd = [hd[0] + Math.sin(p.scratch) * 12, hd[1] + Math.cos(p.scratch * 1.3) * 6]; // scratching wiggle
      const el: P = ap.elbow ? [o[0] + ap.elbow[0], o[1] + ap.elbow[1]] : ik(o, hd, 108, 100, ap.bend);
      limb(g, [o, el, hd], 14.5, c.limb);
      const dir = Math.atan2(hd[0] - el[0], hd[1] - el[1]);
      drawHand(g, c, hd, dir + ap.rot, ap.shape, s > 0 ? -1 : 1, false);
    };
    // arms that pass behind the head are drawn first
    if (p.armL.behind) frontArm(-1, p.armL);
    if (p.armR.behind) frontArm(1, p.armR);
    drawTorso(g, c, 300, top, bot, false, 0, mask, p.rim);
    drawHead(g, c, r.headC[0], r.headC[1], p, false, mask);
    if (!p.armL.behind) frontArm(-1, p.armL);
    if (!p.armR.behind) frontArm(1, p.armR);
  }
  g.restore();
};
