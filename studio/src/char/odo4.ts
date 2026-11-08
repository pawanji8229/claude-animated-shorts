// "Odo Fennick" v4: the original night-owl inventor, redrawn for appeal and clarity.
//   - glowing white round head that OVERLAPS a pill torso: one clean silhouette, no neck, no floating head
//   - brush-style variable line weight: thin on the top-left, heavier on the bottom-right, tapered stroke ends
//   - mildly awkward / cringe comedic face: half-lidded eyes glancing sideways, mismatched brows, crooked mouth,
//     optional grimace and sweat drop
//   - identity props: brass goggles pushed up on the brow, silver side tufts, curly three-hair tuft, teal shirt,
//     mustard belt with brass buckle, rust tool-apron with wrench
//   - the face stays front-ish even when walking sideways (features slide toward the walking direction), so the
//     design reads identically from every camera angle
//   - bouncy stylised walk: IK legs with planted feet driven by distance, heel/toe roll, hip dip, torso
//     squash-stretch and sway, counter-swinging arms with elbow follow-through, lagging head bob and tilt
// Canvas 600 x 1000, soles at y = 975. `mask` mode draws the emissive mask (face white, everything else dark).
export const W4 = 600, H4 = 1000, SOLE4 = 975, CARD_H4 = 1.55;
export const PX4 = CARD_H4 / H4;

export type Mouth4 = "awkward" | "cringe" | "o" | "smile" | "flat";
export type Odo4Pose = {
  view: "front" | "side";
  distance: number; walk: number; stride: number;
  blink: boolean; lookX: number; lookUp: number;
  browL: number; browR: number; // -1 low/angry .. 1 raised (asymmetry = awkward)
  lids: number; // 0 open .. 1 heavy half-lidded
  mouth: Mouth4; sweat: number; // 0..1
  holdJar: number; // 0..1 near/right hand holds the jar (side: forward at chest; front: raised near the face)
  raiseJar: number; // 0..1 front view: jar lifted to the face
  shrug: number; // 0..1 front view shoulders/hands up
  breathe: number; squash: number;
};
export const pose4 = (o: Partial<Odo4Pose> = {}): Odo4Pose => ({
  view: "front", distance: 0, walk: 0, stride: 0.78, blink: false, lookX: 0.35, lookUp: 0,
  browL: 0.75, browR: -0.15, lids: 0.45, mouth: "awkward", sweat: 0, holdJar: 0, raiseJar: 0, shrug: 0,
  breathe: 0, squash: 0, ...o,
});

type G = CanvasRenderingContext2D; type P = [number, number];
type Pal = Record<string, string>;
const COLORS: Pal = {
  ink: "#251a24", limb: "#2b1f29", limbFar: "#3d2f3a",
  face: "#fffaf3", faceShade: "#efe3d6", hair: "#e9e7ee", hairShade: "#bdb8c6",
  shirt: "#2c6c72", shirtShade: "#215358", collar: "#f3ead6", belt: "#e4a62c", buckle: "#c99a3a",
  apron: "#c4572a", apronShade: "#9e4320", brass: "#d0a245", brassD: "#8c6522", lens: "#ffe08c", strap: "#5a3a2a",
  shoe: "#2e1d16", mouth: "#6e2430", tongue: "#d0666e", teeth: "#ffffff", sweat: "#bfe6ff", wrench: "#a9b2bc",
};
const MASK: Pal = Object.fromEntries(Object.keys(COLORS).map((k) => [k, "#4a4a4a"]));
Object.assign(MASK, { ink: "#000000", limb: "#1a1a1a", limbFar: "#1a1a1a", face: "#ffffff", faceShade: "#e8e8e8", teeth: "#ffffff", lens: "#bbbbbb", collar: "#5a5a5a" });

// ---------- brush helpers ----------
/** Fill a closed shape with a brush outline: base width w, plus extra weight k toward the bottom-right. */
const inked = (g: G, c: Pal, path: () => void, fill: string, w = 6, k = 5) => {
  g.save(); g.translate(k * 0.6, k * 0.8); path(); g.fillStyle = c.ink; g.fill(); g.lineWidth = w * 2; g.strokeStyle = c.ink; g.lineJoin = "round"; g.stroke(); g.restore();
  path(); g.lineWidth = w * 2; g.strokeStyle = c.ink; g.lineJoin = "round"; g.stroke();
  path(); g.fillStyle = fill; g.fill();
};
/** Tapered stroke along a polyline (quadratic smoothing), width swelling in the middle, thin at the ends. */
const taper = (g: G, pts: P[], wMid: number, col: string, wEnd = 0.25, bias = 0.5) => {
  // resample
  const S: P[] = [];
  for (let i = 0; i < pts.length - 1; i++) for (let t = 0; t < 1; t += 0.125) S.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
  S.push(pts[pts.length - 1]);
  const n = S.length; const L: P[] = [], R: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const t = i / (n - 1);
    const prof = wEnd + (1 - wEnd) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t < bias ? (t / bias) * 0.5 : 0.5 + ((t - bias) / (1 - bias)) * 0.5))), 0.6);
    const w = (wMid * prof) / 2;
    L.push([S[i][0] - dy * w, S[i][1] + dx * w]); R.push([S[i][0] + dy * w, S[i][1] - dx * w]);
  }
  g.beginPath(); g.moveTo(...L[0]); for (const p of L) g.lineTo(...p); for (let i = n - 1; i >= 0; i--) g.lineTo(...R[i]); g.closePath();
  g.fillStyle = col; g.fill();
  g.beginPath(); g.arc(S[0][0], S[0][1], (wMid * wEnd) / 2, 0, Math.PI * 2); g.arc(S[n - 1][0], S[n - 1][1], (wMid * wEnd) / 2, 0, Math.PI * 2); g.fill();
};
/** Limb: tapered, slightly thicker at the root. */
const limb = (g: G, pts: P[], w: number, col: string) => taper(g, pts, w, col, 0.7, 0.35);
const smooth = (t: number) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const ik = (a: P, b: P, L1: number, L2: number, bend: number): P => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.min(L1 + L2 - 0.5, Math.max(1, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx), k = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const ang = base - bend * k; return [a[0] + Math.cos(ang) * L1, a[1] + Math.sin(ang) * L1];
};

// ---------- head ----------
export const HEAD = { rx: 150, ry: 143 };
const headPath = (g: G, cx: number, cy: number) => () => { g.beginPath(); g.ellipse(cx, cy, HEAD.rx, HEAD.ry, 0, 0, Math.PI * 2); };

const drawHead = (g: G, c: Pal, cx: number, cy: number, p: Odo4Pose, side: boolean, mask: boolean) => {
  const fx = side ? 46 : 0; // features slide toward the walking direction in side view
  const sp = side ? 0.62 : 1; // and compress
  // silver side tufts (behind)
  const tuft = (x: number, dir: number, s: number) => inked(g, c, () => {
    g.beginPath();
    g.moveTo(x, cy - 52 * s); g.bezierCurveTo(x + dir * 60 * s, cy - 70 * s, x + dir * 72 * s, cy - 6 * s, x + dir * 50 * s, cy + 10 * s);
    g.bezierCurveTo(x + dir * 74 * s, cy + 30 * s, x + dir * 50 * s, cy + 66 * s, x + dir * 12 * s, cy + 50 * s); g.closePath();
  }, c.hair, 4, 3);
  if (side) tuft(cx - 128, -1, 1.05); else { tuft(cx - 132, -1, 0.95); tuft(cx + 132, 1, 0.95); }
  // head
  inked(g, c, headPath(g, cx, cy), c.face, 5, 7);
  if (!mask) { // gentle form shading inside the glow (keeps volume without dulling the face)
    g.save(); headPath(g, cx, cy)(); g.clip();
    const gr = g.createRadialGradient(cx + 40, cy - 50, 40, cx, cy, 175); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.75, "rgba(255,255,255,0)"); gr.addColorStop(1, c.faceShade);
    g.fillStyle = gr; g.fillRect(cx - 200, cy - 200, 400, 400); g.restore();
  }
  // curly three-hair tuft
  for (const [dx, h, cv] of [[-18, 54, -24], [4, 70, 14], [24, 46, 30]] as const)
    taper(g, [[cx + dx, cy - HEAD.ry + 6], [cx + dx + cv * 0.4, cy - HEAD.ry - h * 0.6], [cx + dx + cv, cy - HEAD.ry - h * 0.75], [cx + dx + cv * 1.3, cy - HEAD.ry - h * 0.45]], 7, c.ink, 0.3);

  const ex = (p.lookX || 0) * 9, ey = cy - 4 - 8 * p.lookUp;
  const eyeX = (s: number) => cx + fx + s * 46 * sp;
  // goggles pushed up on the brow (strap follows the head curve)
  if (!mask) {
    g.save(); headPath(g, cx, cy)(); g.clip();
    g.beginPath(); g.ellipse(cx, cy + 120, 185, 250, 0, Math.PI * 1.25, Math.PI * 1.75); g.lineWidth = 15; g.strokeStyle = c.strap; g.stroke();
    g.restore();
  }
  const gy = cy - 92;
  const lens = (x: number) => {
    inked(g, c, () => { g.beginPath(); g.arc(x, gy, 27, 0, Math.PI * 2); }, c.brass, 4, 3);
    g.beginPath(); g.arc(x, gy, 17, 0, Math.PI * 2); g.fillStyle = c.lens; g.fill(); g.lineWidth = 3.5; g.strokeStyle = c.ink; g.stroke();
    if (!mask) { g.beginPath(); g.ellipse(x - 6, gy - 6, 6, 3.5, -0.6, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); }
  };
  if (side) lens(cx + fx + 40); else { lens(cx - 40); lens(cx + 40); g.beginPath(); g.moveTo(cx - 13, gy); g.lineTo(cx + 13, gy); g.lineWidth = 7; g.strokeStyle = c.brassD; g.stroke(); }

  // brows: asymmetric, tapered (left raised & arched, right flatter & lower)
  const brow = (s: number, lift: number) => {
    const x = eyeX(s), y = ey - 40 - lift * 16;
    const tilt = s * (lift < 0 ? 6 : -2);
    taper(g, [[x - 24 * sp, y + 6 + tilt], [x, y - 6 - Math.max(0, lift) * 6], [x + 24 * sp, y + 4 - tilt]], 11, c.ink, 0.35);
  };
  brow(-1, p.browL); if (!side) brow(1, p.browR); else brow(1, p.browR * 0.6);
  // eyes: dark pupils + heavy upper lids (half-lidded deadpan)
  const eye = (s: number) => {
    const x = eyeX(s);
    if (p.blink) { taper(g, [[x - 13, ey], [x, ey + 4], [x + 13, ey]], 6, c.ink, 0.4); return; }
    g.beginPath(); g.ellipse(x + ex, ey, 10.5, 13, 0, 0, Math.PI * 2); g.fillStyle = c.ink; g.fill();
    if (!mask) { g.beginPath(); g.arc(x + ex - 3, ey - 4, 3, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); }
    const lidY = ey - 13 + p.lids * 13;
    // cover the top of the pupil with face colour, then the lid line
    g.beginPath(); g.rect(x - 18, ey - 20, 36, lidY - (ey - 20)); g.fillStyle = c.face; g.fill();
    taper(g, [[x - 17, lidY + 1], [x, lidY - 1.5], [x + 17, lidY + 2]], 6.5, c.ink, 0.5);
  };
  eye(-1); eye(1);
  // tired little under-eye creases (cringe)
  if (p.lids > 0.3) for (const s of side ? [1] : [-1, 1]) taper(g, [[eyeX(s) - 9, ey + 20], [eyeX(s) + 1, ey + 23], [eyeX(s) + 9, ey + 20]], 3, c.ink, 0.3);

  // mouth
  const mx = cx + fx + (side ? 8 : 10), my = cy + 62;
  switch (p.mouth) {
    case "awkward": // crooked wobbly line, one corner pulled up
      taper(g, [[mx - 26 * sp, my + 4], [mx - 10 * sp, my + 1], [mx + 4 * sp, my + 4], [mx + 18 * sp, my - 4], [mx + 24 * sp, my - 10]], 7, c.ink, 0.35);
      break;
    case "cringe": { // clenched grimace with teeth, tilted
      g.save(); g.translate(mx, my); g.rotate(-0.08);
      inked(g, c, () => { g.beginPath(); g.roundRect(-30 * sp, -12, 60 * sp, 24, 11); }, c.teeth, 3.5, 2);
      g.beginPath(); g.moveTo(-28 * sp, 0); g.lineTo(28 * sp, 0); g.lineWidth = 2.5; g.strokeStyle = c.ink; g.stroke();
      for (const t of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(t * 40 * sp, -11); g.lineTo(t * 40 * sp, 11); g.stroke(); }
      g.restore(); break;
    }
    case "o": inked(g, c, () => { g.beginPath(); g.ellipse(mx, my + 2, 10 * sp + 3, 13, 0, 0, Math.PI * 2); }, c.mouth, 3.5, 2); break;
    case "smile":
      inked(g, c, () => { g.beginPath(); g.moveTo(mx - 24 * sp, my - 4); g.quadraticCurveTo(mx, my + 30, mx + 24 * sp, my - 6); g.quadraticCurveTo(mx, my + 6, mx - 24 * sp, my - 4); }, c.mouth, 3.5, 2);
      break;
    default: taper(g, [[mx - 18 * sp, my], [mx + 18 * sp, my - 2]], 6, c.ink, 0.4);
  }
  // sweat drop at the temple
  if (p.sweat > 0.02) {
    const sx = cx + (side ? -30 : 108), sy = cy - 40 + (1 - p.sweat) * -10;
    g.save(); g.globalAlpha = Math.min(1, p.sweat * 1.5);
    inked(g, c, () => { g.beginPath(); g.moveTo(sx, sy - 22); g.quadraticCurveTo(sx + 14, sy, sx, sy + 8); g.quadraticCurveTo(sx - 14, sy, sx, sy - 22); }, c.sweat, 2.5, 1.5);
    g.restore();
  }
};

// ---------- body ----------
const torsoPath = (g: G, cx: number, top: number, bot: number, wTop: number, wBot: number) => () => {
  g.beginPath();
  g.moveTo(cx - wTop / 2, top + wTop / 2);
  g.arc(cx, top + wTop / 2, wTop / 2, Math.PI, 0);
  g.bezierCurveTo(cx + wTop / 2, top + (bot - top) * 0.5, cx + wBot / 2 + 6, bot - 40, cx + wBot / 2 - 8, bot);
  g.quadraticCurveTo(cx, bot + 16, cx - wBot / 2 + 8, bot);
  g.bezierCurveTo(cx - wBot / 2 - 6, bot - 40, cx - wTop / 2, top + (bot - top) * 0.5, cx - wTop / 2, top + wTop / 2);
  g.closePath();
};
const drawTorso = (g: G, c: Pal, cx: number, top: number, bot: number, side: boolean, sway: number, mask: boolean) => {
  const wT = side ? 120 : 138, wB = side ? 132 : 156;
  const tp = torsoPath(g, cx, top, bot, wT, wB);
  inked(g, c, tp, c.shirt, 5, 6);
  if (!mask) { g.save(); tp(); g.clip(); g.fillStyle = c.shirtShade; g.fillRect(cx - wB, top, wB * 0.55, bot - top + 30); g.restore(); }
  // collar V
  const vx = cx + (side ? 26 : 0);
  inked(g, c, () => { g.beginPath(); g.moveTo(vx - 30, top + 70); g.lineTo(vx + 30, top + 70); g.lineTo(vx, top + 140); g.closePath(); }, c.collar, 3, 2);
  // belt + buckle
  const by = bot - 92;
  g.save(); tp(); g.clip(); g.fillStyle = c.belt; g.fillRect(cx - 120, by, 240, 22); g.fillStyle = c.ink; g.fillRect(cx - 120, by - 3, 240, 4); g.fillRect(cx - 120, by + 21, 240, 4); g.restore();
  inked(g, c, () => { g.beginPath(); g.roundRect(vx - 15 + (side ? 18 : 0), by - 5, 30, 32, 5); }, c.buckle, 3, 2);
  // rust tool-apron below the belt (front panel, flares with the step)
  const a0 = side ? cx - 6 : cx - 66, a1 = side ? cx + wB / 2 + 12 : cx + 66;
  inked(g, c, () => { g.beginPath(); g.moveTo(a0 + 4, by + 24); g.lineTo(a1 - 4, by + 24); g.lineTo(a1 + 6 + sway, bot + 46); g.quadraticCurveTo((a0 + a1) / 2 + sway, bot + 56, a0 - 6 + sway * 0.6, bot + 46); g.closePath(); }, c.apron, 4, 4);
  if (!mask) {
    // pocket + wrench
    const px = side ? cx + 46 : cx + 26, py = by + 46;
    inked(g, c, () => { g.beginPath(); g.roundRect(px - 20, py, 40, 30, 4); }, c.apronShade, 3, 2);
    limb(g, [[px - 6, py + 6], [px - 12, py - 26]], 8, c.wrench);
    g.beginPath(); g.arc(px - 13, py - 32, 9, 0.7, Math.PI * 2 - 0.7); g.lineWidth = 6; g.strokeStyle = c.wrench; g.stroke();
  }
};

const shoe = (g: G, c: Pal, ankle: P, ang: number, dir: number) => {
  g.save(); g.translate(ankle[0], ankle[1]); g.rotate(ang); g.scale(dir, 1);
  inked(g, c, () => { g.beginPath(); g.moveTo(-14, -10); g.quadraticCurveTo(-22, 12, -6, 14); g.lineTo(34, 14); g.quadraticCurveTo(46, 12, 40, -2); g.quadraticCurveTo(26, -14, 6, -16); g.closePath(); }, c.shoe, 3.5, 3);
  g.restore();
};
const hand = (g: G, c: Pal, h: P, far: boolean) => inked(g, c, () => { g.beginPath(); g.arc(h[0], h[1], far ? 12 : 13.5, 0, Math.PI * 2); }, far ? c.limbFar : c.limb, 2, 1.5);

// ---------- walk ----------
const LEG_T = 144, LEG_S = 140, ANKLE = 16, STANCE = 0.58;
type Foot = { pos: P; ang: number };
const footAt = (q: number, Lpx: number): Foot => {
  q = ((q % 1) + 1) % 1;
  const half = (STANCE * Lpx) / 2;
  if (q < STANCE) {
    const u = q / STANCE; const x = half - u * 2 * half;
    let ang = 0, lift = 0;
    if (u < 0.14) ang = -0.3 * (1 - u / 0.14);
    if (u > 0.7) { const k = (u - 0.7) / 0.3; ang = 0.6 * k * k; lift = Math.sin(ang) * 40; }
    return { pos: [x - (u > 0.7 ? (1 - Math.cos(ang)) * 40 : 0), SOLE4 - ANKLE - lift], ang };
  }
  const v = (q - STANCE) / (1 - STANCE), e = smooth(v);
  const x = -half + e * 2 * half;
  const lift = Math.sin(Math.PI * Math.pow(v, 0.75)) * 58; // bouncy, high-ish swing
  const ang = 0.6 * (1 - smooth(v * 1.7)) - 0.3 * smooth((v - 0.55) / 0.45);
  return { pos: [x, SOLE4 - ANKLE - lift - Math.max(0, Math.sin(ang)) * 26], ang };
};

/** Canvas position of the jar hand (near hand) for attaching the 3D jar. */
export const jarHandPx = (p: Odo4Pose): P => {
  const c = poseRig(p);
  return c.jarHand;
};

type Rig = { hip: P; top: number; bot: number; headC: P; lean: number; sq: number; jarHand: P; side: boolean };
const poseRig = (p: Odo4Pose): Rig => {
  const side = p.view === "side", w = side ? p.walk : 0;
  const ph = p.distance / p.stride, q = ph - Math.floor(ph);
  const breath = Math.sin(p.breathe) * 3 * (1 - w);
  const bob = 0.5 + 0.5 * Math.cos(Math.PI * 4 * (q - 0.06)); // 1 at "down" just after contact
  const hipStand = SOLE4 - ANKLE - (LEG_T + LEG_S) * 0.98;
  const hipY = hipStand + w * (8 + 20 * bob);
  const sq = w * (0.035 * (bob - 0.5)) + (p.shrug * -0.02); // squash on down, stretch on passing
  const lean = 0.06 * w;
  const hip: P = [300 - (side ? 4 : 0), hipY];
  const bot = hipY + 4, top = bot - 300 * (1 - sq) - breath;
  const hb = w * 8 * (0.5 + 0.5 * Math.cos(Math.PI * 4 * (q - 0.14))); // head lags the body
  const headC: P = [hip[0] + (side ? 10 + Math.sin(lean) * 300 : 0), top - 54 + hb * 0.4 - p.shrug * 10];
  // jar hand
  let jarHand: P;
  if (side) {
    const sh: P = [hip[0] + 14 + Math.sin(lean) * 210, top + 112];
    jarHand = [sh[0] + 112, sh[1] + 58 + Math.sin(Math.PI * 4 * q) * 4 * w];
  } else {
    const sh: P = [300 + 64, top + 112];
    const rest: P = [sh[0] + 40, sh[1] + 150], up: P = [300 + 178, headC[1] + 96];
    jarHand = [rest[0] + (up[0] - rest[0]) * p.raiseJar, rest[1] + (up[1] - rest[1]) * p.raiseJar];
  }
  return { hip, top, bot, headC, lean, sq, jarHand, side };
};

export const drawOdo4 = (g: G, p: Odo4Pose, mask = false) => {
  const c = mask ? MASK : COLORS;
  const r = poseRig(p);
  const side = r.side, w = side ? p.walk : 0;
  const Lpx = p.stride / PX4;
  const ph = p.distance / p.stride, q = ph - Math.floor(ph);
  const sqT = p.squash * 0.06;
  g.save(); g.translate(300, SOLE4); g.scale(1 + sqT, 1 - sqT); g.translate(-300, -SOLE4);
  if (side) {
    const { hip, top, bot } = r;
    const stand = (o: number): Foot => ({ pos: [o, SOLE4 - ANKLE], ang: 0 });
    const mixF = (f: Foot, s: Foot): Foot => ({ pos: [hip[0] + s.pos[0] + (f.pos[0] - s.pos[0]) * w, s.pos[1] + (f.pos[1] - s.pos[1]) * w], ang: f.ang * w });
    const near = mixF(footAt(q, Lpx), stand(14)), far = mixF(footAt(q + 0.5, Lpx), stand(-16));
    const sh: P = [hip[0] + 14 + Math.sin(r.lean) * 210, top + 112];
    const swingArm = (phase: number, isFar: boolean) => {
      const s = Math.sin(2 * Math.PI * phase);
      const a1 = -0.62 * s * w + 0.05;
      const fwd = Math.max(0, -Math.cos(2 * Math.PI * phase + 0.7));
      const a2 = a1 + 0.15 + 0.6 * fwd * w; // elbow follow-through
      const o: P = isFar ? [sh[0] - 10, sh[1] + 2] : sh;
      const el: P = [o[0] + Math.sin(a1) * 108, o[1] + Math.cos(a1) * 108];
      const hd: P = [el[0] + Math.sin(a2) * 100, el[1] + Math.cos(a2) * 100];
      limb(g, [o, el, hd], isFar ? 12 : 14, isFar ? c.limbFar : c.limb); hand(g, c, hd, isFar);
    };
    swingArm(q + 0.5, true);
    const leg = (f: Foot, isFar: boolean) => {
      const knee = ik(hip, f.pos, LEG_T, LEG_S, 1);
      limb(g, [hip, knee, f.pos], isFar ? 13 : 15, isFar ? c.limbFar : c.limb);
      shoe(g, c, f.pos, f.ang, 1);
    };
    leg(far, true); leg(near, false);
    const sway = -Math.sin(2 * Math.PI * q) * 8 * w;
    g.save(); g.translate(hip[0], hip[1]); g.rotate(r.lean + Math.sin(2 * Math.PI * q * 2) * 0.012 * w); g.translate(-hip[0], -hip[1]);
    drawTorso(g, c, hip[0], top, bot, true, sway, mask);
    g.restore();
    // head (drawn after torso so it overlaps the top of the pill: clean join)
    const hc = r.headC;
    g.save(); g.translate(hc[0], hc[1] + 140); g.rotate(Math.sin(Math.PI * 4 * (q - 0.1)) * 0.025 * w - 0.08 * p.lookUp); g.translate(-hc[0], -(hc[1] + 140));
    drawHead(g, c, hc[0], hc[1], p, true, mask);
    g.restore();
    // near arm: holds the jar forward, or swings
    if (p.holdJar > 0.5) {
      const hd = r.jarHand, el = ik(sh, hd, 108, 100, -1);
      limb(g, [sh, el, hd], 14, c.limb); hand(g, c, hd, false);
    } else swingArm(q, false);
  } else {
    const { hip, top, bot } = r;
    for (const s of [-1, 1]) {
      const h: P = [300 + s * 34, hip[1] - 6], a: P = [300 + s * 52, SOLE4 - ANKLE];
      const knee: P = [300 + s * 47, (h[1] + a[1]) / 2 - 4];
      limb(g, [h, knee, a], 15, c.limb); shoe(g, c, a, 0, s);
    }
    drawTorso(g, c, 300, top, bot, false, 0, mask);
    drawHead(g, c, r.headC[0], r.headC[1], p, false, mask);
    // arms: from the torso edge, hanging just outside the pill (never across the face or chest)
    const sh = (s: number): P => [300 + s * 64, top + 112];
    const armF = (s: number, hd: P) => {
      const o = sh(s);
      const mid: P = [(o[0] + hd[0]) / 2 + s * 22, (o[1] + hd[1]) / 2 + 6];
      limb(g, [o, mid, hd], 14, c.limb); hand(g, c, hd, false);
    };
    const shr = p.shrug;
    armF(-1, [sh(-1)[0] - 38 - 70 * shr, sh(-1)[1] + 160 - 175 * shr]);
    armF(1, p.holdJar > 0.5 ? r.jarHand : [sh(1)[0] + 38 + 70 * shr, sh(1)[1] + 160 - 175 * shr]);
  }
  g.restore();
};

/** Head centre in canvas px (for the glow halo sprite). */
export const headCenterPx = (p: Odo4Pose): P => poseRig(p).headC;
