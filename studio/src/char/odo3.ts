// "Odo Fennick" v3: same original inventor (goggles, silver side tufts, walrus moustache, teal shirt, rust apron,
// mustard neckerchief), redesigned to the verified 2.5D rules:
//   - big round head (~36% of body height) that OVERLAPS the torso: no neck gap from any view
//   - small bean torso, thin but properly proportioned limbs, bold plum outline, consistent sizes in every view
//   - walk cycle driven by distance travelled: IK legs with planted stance feet (zero slide when the card moves at
//     the same speed), heel-strike -> flat -> toe-off foot roll, hip dip on contact, opposite arm swing with
//     elbow lag, delayed head bob, slight forward lean
// Canvas 600 x 1000, soles on y = 975, card height 1.62 m (=> 1 px = 1.62 mm).
export const W3 = 600, H3 = 1000, SOLE3 = 975, CARD_H3 = 1.62;
export const PX = CARD_H3 / H3; // metres per canvas px

export type Odo3Pose = {
  view: "front" | "side"; // side = facing +x (screen right)
  distance: number; // metres walked (drives gait phase so feet never slide)
  walk: number; // 0 stand .. 1 full walk
  stride: number; // metres per full gait cycle (2 steps)
  blink: boolean;
  lookX: number; // -1..1
  lookUp: number; // 0..1
  brows: number; // -1 worried .. 0 neutral .. 1 raised
  mouth: "flat" | "smile" | "open" | "o" | "grin";
  armsOpen: number; // 0..1 front view delight
  wave: number; // 0..1 right hand raised (front)
  breathe: number; // radians
  goggles: number; // 0 on brow .. 1 over eyes
  squash: number; // 0..1 turn squash
};
export const defaultPose = (): Odo3Pose => ({
  view: "front", distance: 0, walk: 0, stride: 0.66, blink: false, lookX: 0, lookUp: 0, brows: 0, mouth: "flat",
  armsOpen: 0, wave: 0, breathe: 0, goggles: 0, squash: 0,
});

const INK = "#221722", LIMB = "#2a1d26";
const SKIN = "#f6ead8", SKIN_SH = "#e0cdb3";
const HAIR = "#eeebe5", HAIR_SH = "#c8c2ba";
const SHIRT = "#2f7f7a", SHIRT_SH = "#22605c";
const APRON = "#c8642b", APRON_SH = "#a14d1f";
const SCARF = "#e6ad2e", SCARF_SH = "#c28b1c";
const BRASS = "#c99a3a", BRASS_D = "#8a6420", LENS = "#ffd77a";
const BOOT = "#4f2f1d", SOLE = "#24140b";
type G = CanvasRenderingContext2D; type P = [number, number];
const OUT = 9;

const fs = (g: G, fill: string, w = OUT) => { g.fillStyle = fill; g.fill(); g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); };
const line = (g: G, pts: P[], w: number, col: string) => { g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.lineWidth = w; g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); };
const smooth = (t: number) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

/** Two-bone IK. bend=+1 puts the middle joint on the +x side of the line (knees forward when facing +x). */
const ik = (a: P, b: P, L1: number, L2: number, bend: number): P => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const d = Math.min(L1 + L2 - 0.5, Math.max(1, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const k = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const ang = base - bend * k;
  return [a[0] + Math.cos(ang) * L1, a[1] + Math.sin(ang) * L1];
};

// ---------------- parts ----------------
const HEAD_RX = 166, HEAD_RY = 168;
const headShape = (g: G, cx: number, cy: number, side: boolean) => {
  g.beginPath();
  // slightly fuller crown, softer jaw: a subtle nod to the lightbulb motif without breaking the round silhouette
  g.moveTo(cx, cy - HEAD_RY);
  g.bezierCurveTo(cx + HEAD_RX * 1.02, cy - HEAD_RY, cx + HEAD_RX * 1.05, cy + HEAD_RY * 0.2, cx + HEAD_RX * 0.78, cy + HEAD_RY * 0.68);
  g.bezierCurveTo(cx + HEAD_RX * 0.5, cy + HEAD_RY * 1.02, cx - HEAD_RX * 0.5, cy + HEAD_RY * 1.02, cx - HEAD_RX * 0.78, cy + HEAD_RY * 0.68);
  g.bezierCurveTo(cx - HEAD_RX * 1.05, cy + HEAD_RY * 0.2, cx - HEAD_RX * 1.02, cy - HEAD_RY, cx, cy - HEAD_RY);
  g.closePath();
  if (side) { /* nose drawn separately on the silhouette */ }
};

const lens = (g: G, x: number, y: number, r: number) => {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); fs(g, BRASS, 7);
  g.beginPath(); g.arc(x, y, r * 0.66, 0, Math.PI * 2);
  const gr = g.createRadialGradient(x - r * 0.25, y - r * 0.25, 1, x, y, r * 0.7); gr.addColorStop(0, "#fff3cf"); gr.addColorStop(1, LENS);
  g.fillStyle = gr; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.28, r * 0.2, r * 0.1, -0.6, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,0.9)"; g.fill();
};

const drawHead = (g: G, cx: number, cy: number, p: Odo3Pose, side: boolean) => {
  const ey = cy + 6 - 10 * p.lookUp, ex = p.lookX * 9;
  // side tufts (behind)
  const tuft = (x: number, dir: number) => {
    g.beginPath();
    g.moveTo(x, cy - 70); g.quadraticCurveTo(x + dir * 70, cy - 60, x + dir * 62, cy + 10);
    g.quadraticCurveTo(x + dir * 78, cy + 40, x + dir * 40, cy + 70); g.quadraticCurveTo(x + dir * 10, cy + 40, x, cy + 30); g.closePath();
    fs(g, HAIR);
    g.lineWidth = 3; g.strokeStyle = HAIR_SH;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x + dir * (14 + k * 12), cy - 40 + k * 6); g.quadraticCurveTo(x + dir * (36 + k * 10), cy + 0, x + dir * (22 + k * 8), cy + 44); g.stroke(); }
  };
  if (side) tuft(cx - 120, -1); else { tuft(cx - 140, -1); tuft(cx + 140, 1); }
  // head
  headShape(g, cx, cy, side); fs(g, SKIN, OUT + 1);
  g.save(); headShape(g, cx, cy, side); g.clip();
  g.beginPath(); g.ellipse(cx - 190, cy + 30, 120, 230, 0, 0, Math.PI * 2); g.fillStyle = SKIN_SH; g.globalAlpha = 0.5; g.fill(); g.globalAlpha = 1;
  g.restore();
  // three comedic crown hairs
  g.lineWidth = 5; g.strokeStyle = INK;
  for (const [dx, h, c] of [[-14, 46, -16], [6, 58, 10], [24, 40, 22]] as const) {
    g.beginPath(); g.moveTo(cx + dx, cy - HEAD_RY + 4); g.quadraticCurveTo(cx + dx + c, cy - HEAD_RY - h * 0.7, cx + dx + c * 1.6, cy - HEAD_RY - h * 0.55); g.stroke();
  }
  // crown highlight
  g.beginPath(); g.arc(cx + (side ? 4 : 34), cy - 104, 34, Math.PI * 1.15, Math.PI * 1.55); g.lineWidth = 10; g.strokeStyle = "rgba(255,255,255,0.7)"; g.stroke();

  // brows
  const bl = 9 * p.brows, worried = p.brows < 0 ? -p.brows : 0;
  const brow = (x: number, dir: number) => {
    g.beginPath(); g.moveTo(x - 22, ey - 38 - bl + dir * worried * 8); g.quadraticCurveTo(x, ey - 50 - bl, x + 22, ey - 38 - bl - dir * worried * 8);
    g.lineWidth = 11; g.strokeStyle = HAIR_SH; g.lineCap = "round"; g.stroke(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  };
  const eye = (x: number) => {
    if (p.blink) { g.beginPath(); g.moveTo(x - 12, ey); g.quadraticCurveTo(x, ey + 7, x + 12, ey); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); return; }
    g.beginPath(); g.ellipse(x + ex, ey, 9.5, 14, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
  };
  // goggles
  const gy = (cy - 98) + (ey - (cy - 98)) * p.goggles;
  const gr = 30 + 8 * p.goggles;
  if (side) {
    eye(cx + 92); brow(cx + 90, 1);
    g.beginPath(); g.moveTo(cx - 140, gy + 8); g.lineTo(cx + 110, gy); g.lineWidth = 14; g.strokeStyle = "#5b3a2a"; g.stroke();
    lens(g, cx + 104, gy, gr);
    // nose
    g.beginPath(); g.ellipse(cx + 162, cy + 34, 22, 18, 0, -Math.PI * 0.5, Math.PI * 0.6); fs(g, SKIN, 7);
  } else {
    eye(cx - 40); eye(cx + 40); brow(cx - 42, -1); brow(cx + 42, 1);
    g.beginPath(); g.moveTo(cx - 162, gy + 4); g.lineTo(cx + 162, gy + 4); g.lineWidth = 14; g.strokeStyle = "#5b3a2a"; g.stroke();
    lens(g, cx - 46, gy, gr); lens(g, cx + 46, gy, gr);
    g.beginPath(); g.moveTo(cx - 46 + gr, gy); g.lineTo(cx + 46 - gr, gy); g.lineWidth = 7; g.strokeStyle = BRASS_D; g.stroke();
    // tiny nose
    g.beginPath(); g.arc(cx + 2, cy + 34, 10, 0.2, Math.PI - 0.2); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  }
  // mouth + walrus moustache
  const my = cy + 58;
  const mx = side ? cx + 118 : cx;
  const mouth = () => {
    g.beginPath();
    switch (p.mouth) {
      case "smile": g.moveTo(mx - 18, my + 28); g.quadraticCurveTo(mx, my + 44, mx + 18, my + 28); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); break;
      case "open": case "grin": g.ellipse(mx, my + 32, side ? 16 : 24, p.mouth === "grin" ? 14 : 20, 0, 0, Math.PI); fs(g, "#7a2b2b", 6);
        g.beginPath(); g.ellipse(mx, my + 40, side ? 7 : 11, 6, 0, 0, Math.PI * 2); g.fillStyle = "#c95a5a"; g.fill(); break;
      case "o": g.ellipse(mx, my + 34, 9, 12, 0, 0, Math.PI * 2); fs(g, "#7a2b2b", 5); break;
      default: g.moveTo(mx - 14, my + 32); g.lineTo(mx + 14, my + 31); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
    }
  };
  mouth();
  if (side) { g.beginPath(); g.ellipse(cx + 120, my + 4, 44, 19, 0.12, 0, Math.PI * 2); fs(g, HAIR, 7); }
  else for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 36, my + 2, 42, 19, sx * 0.25, 0, Math.PI * 2); fs(g, HAIR, 7); }
};

// torso (bean). top overlaps the head bottom by ~24 px; drawn BEFORE the head so the join is hidden.
const torso = (g: G, cx: number, top: number, hip: number, side: boolean, sway: number) => {
  const w = side ? 64 : 82, hw = side ? 70 : 90;
  g.beginPath();
  g.moveTo(cx - w, top + 30); g.quadraticCurveTo(cx - w, top, cx, top); g.quadraticCurveTo(cx + w, top, cx + w + (side ? 6 : 0), top + 30);
  g.quadraticCurveTo(cx + hw + 4, hip - 40, cx + hw - 6, hip); g.quadraticCurveTo(cx, hip + 14, cx - hw + 6, hip);
  g.quadraticCurveTo(cx - hw - 4, hip - 40, cx - w, top + 30); g.closePath(); fs(g, SHIRT);
  g.save(); g.clip(); g.fillStyle = SHIRT_SH; g.fillRect(cx - hw - 10, top, side ? 44 : 40, hip - top + 20); g.restore();
  // apron
  const a0 = side ? cx - 4 : cx - 60, a1 = side ? cx + hw + 10 : cx + 60;
  g.beginPath(); g.moveTo(a0 + (side ? 26 : 10), top + 70); g.lineTo(a1 - (side ? 10 : 10), top + 70);
  g.lineTo(a1 + 6 + sway, hip + 60); g.quadraticCurveTo((a0 + a1) / 2 + sway, hip + 70, a0 - 4 + sway * 0.6, hip + 60); g.closePath(); fs(g, APRON);
  g.save(); g.clip(); g.fillStyle = APRON_SH; g.fillRect(a0 - 8, top + 60, 24, hip - top + 30); g.restore();
  // pocket + pencil
  const px = side ? cx + 40 : cx + 8, py = top + 150;
  g.beginPath(); g.rect(px - 24, py, 48, 34); fs(g, APRON_SH, 6);
  line(g, [[px + 8, py + 4], [px + 16, py - 32]], 9, "#e9c34a"); line(g, [[px + 16, py - 32], [px + 18, py - 40]], 6, INK);
  // strap + side bow
  if (side) {
    line(g, [[a0 + 28, top + 72], [cx - 6, top + 26]], 12, INK); line(g, [[a0 + 28, top + 72], [cx - 6, top + 26]], 6, APRON);
    line(g, [[a0 + 2, hip - 18], [cx - hw + 4, hip - 18]], 10, INK); line(g, [[a0 + 2, hip - 18], [cx - hw + 4, hip - 18]], 5, APRON);
    for (const a of [-0.6, 0.6]) { g.beginPath(); g.ellipse(cx - hw - 6, hip - 18 + a * 12, 14, 7, a, 0, Math.PI * 2); fs(g, APRON, 5); }
  }
};

const scarf = (g: G, cx: number, top: number, side: boolean) => {
  g.beginPath(); g.moveTo(cx - (side ? 44 : 64), top + 4); g.quadraticCurveTo(cx + (side ? 14 : 0), top + 44, cx + (side ? 66 : 64), top + 4);
  g.lineTo(cx + (side ? 56 : 18), top + 66); g.lineTo(cx + (side ? 28 : -18), top + 66); g.closePath(); fs(g, SCARF, 7);
  g.save(); g.clip(); g.fillStyle = SCARF_SH; g.fillRect(cx - 80, top + 34, 160, 40); g.restore();
};

const arm = (g: G, sh: P, el: P, hand: P, far: boolean, finger = 0) => {
  const mid: P = [sh[0] + (el[0] - sh[0]) * 0.75, sh[1] + (el[1] - sh[1]) * 0.75];
  line(g, [el, hand], far ? 13 : 15, far ? "#3b2b34" : LIMB);
  line(g, [sh, mid], far ? 34 : 38, INK); line(g, [sh, mid], far ? 22 : 26, far ? SHIRT_SH : SHIRT);
  g.beginPath(); g.arc(hand[0], hand[1], far ? 16 : 18, 0, Math.PI * 2); fs(g, far ? SKIN_SH : SKIN, 7);
  if (finger > 0.05) { line(g, [[hand[0] + 2, hand[1] - 8], [hand[0] + 4, hand[1] - 8 - 30 * finger]], 16, INK); line(g, [[hand[0] + 2, hand[1] - 8], [hand[0] + 4, hand[1] - 8 - 30 * finger]], 8, SKIN); }
};

/** Boot with sole; `ang` rotates about the given pivot ("heel" or "toe") so heel-strike and toe-off read. */
const boot = (g: G, ankle: P, ang: number, far: boolean) => {
  g.save(); g.translate(ankle[0], ankle[1]); g.rotate(ang);
  g.beginPath(); g.moveTo(-18, -16); g.quadraticCurveTo(-24, 10, -14, 14); g.lineTo(44, 14); g.quadraticCurveTo(52, 4, 40, -6); g.quadraticCurveTo(18, -14, 10, -22); g.closePath();
  fs(g, far ? "#3e2416" : BOOT, 7);
  line(g, [[-16, 14], [46, 14]], 6, SOLE);
  g.restore();
};

// ---------------- full figure ----------------
const LEG_T = 168, LEG_S = 160; // thigh / shin (to ankle)
const ANKLE_H = 18; // ankle above the sole line
const STANCE = 0.6; // fraction of the cycle a foot is planted

type FootState = { pos: P; ang: number };
/** Foot (ankle point + roll angle) in canvas px relative to the hip x, for one foot at gait phase q (0..1). */
const footAt = (q: number, Lpx: number): FootState => {
  q = ((q % 1) + 1) % 1;
  const half = (STANCE * Lpx) / 2;
  if (q < STANCE) {
    const u = q / STANCE; // planted: moves back exactly as fast as the body moves forward
    const x = half - u * 2 * half;
    let ang = 0, lift = 0;
    if (u < 0.12) ang = -0.28 * (1 - u / 0.12); // heel strike: toe up
    if (u > 0.72) { const k = (u - 0.72) / 0.28; ang = 0.55 * k * k; lift = Math.sin(ang) * 44; } // heel peels, pivot on toe
    return { pos: [x - (u > 0.72 ? (1 - Math.cos(ang)) * 44 : 0), SOLE3 - ANKLE_H - lift], ang };
  }
  const v = (q - STANCE) / (1 - STANCE); // swing: accelerate through, lift early, reach for the next contact
  const e = smooth(v);
  const x = -half + e * 2 * half;
  const lift = Math.sin(Math.PI * Math.pow(v, 0.8)) * 46;
  const ang = 0.55 * (1 - smooth(v * 1.6)) - 0.28 * smooth((v - 0.6) / 0.4);
  return { pos: [x, SOLE3 - ANKLE_H - lift - Math.max(0, Math.sin(ang)) * 30], ang };
};

export const drawOdo3 = (g: G, p: Odo3Pose) => {
  const cx = 300;
  const side = p.view === "side";
  const w = side ? p.walk : 0;
  const Lpx = p.stride / PX;
  const ph = p.distance / p.stride; // cycles
  const q = ph - Math.floor(ph);
  const breath = Math.sin(p.breathe) * 3 * (1 - w);
  // hip: lowest just after each contact (down pose), highest at passing
  const bob = 0.5 + 0.5 * Math.cos(Math.PI * 4 * (q - 0.07));
  const hipStand = SOLE3 - ANKLE_H - (LEG_T + LEG_S) * 0.985;
  const hipY = hipStand + w * (6 + 14 * bob);
  const lean = 0.07 * w;
  const sq = p.squash * 0.06;
  g.save(); g.translate(cx, SOLE3); g.scale(1 + sq, 1 - sq); g.translate(-cx, -SOLE3);

  if (side) {
    const hip: P = [cx - 6, hipY];
    const top = hipY - 228 - breath;
    // feet: blend gait with a relaxed standing pose
    const stand = (o: number): FootState => ({ pos: [o, SOLE3 - ANKLE_H], ang: 0 });
    const fA = footAt(q, Lpx), fB = footAt(q + 0.5, Lpx);
    const mixF = (f: FootState, s: FootState): FootState => ({ pos: [hip[0] + s.pos[0] + (f.pos[0] - s.pos[0]) * w, s.pos[1] + (f.pos[1] - s.pos[1]) * w], ang: f.ang * w });
    const near = mixF(fA, stand(10)), far = mixF(fB, stand(-14));
    // arms: opposite to legs (near arm swings with the far leg), elbow lags on the forward swing
    const sh: P = [hip[0] + 10 + Math.sin(lean) * 228, top + 42];
    const armPose = (phase: number, isFar: boolean) => {
      const s = Math.sin(2 * Math.PI * phase);
      const a1 = -0.55 * s * w + 0.04; // + is forward (toward +x)
      const fwd = Math.max(0, -Math.cos(2 * Math.PI * phase + 0.6));
      const a2 = a1 + (0.12 + 0.5 * fwd * w);
      const el: P = [sh[0] + Math.sin(a1) * 118, sh[1] + Math.cos(a1) * 118];
      const hd: P = [el[0] + Math.sin(a2) * 112, el[1] + Math.cos(a2) * 112];
      arm(g, isFar ? [sh[0] - 8, sh[1] + 2] : sh, el, hd, isFar);
    };
    armPose(q + 0.5, true);
    // far leg
    const legDraw = (f: FootState, isFar: boolean) => {
      const knee = ik(hip, f.pos, LEG_T, LEG_S, 1);
      line(g, [hip, knee, f.pos], isFar ? 14 : 16, isFar ? "#3b2b34" : LIMB);
      boot(g, f.pos, f.ang, isFar);
    };
    legDraw(far, true);
    legDraw(near, false);
    const sway = -Math.sin(2 * Math.PI * q) * 7 * w;
    g.save(); g.translate(hip[0], hip[1]); g.rotate(lean); g.translate(-hip[0], -hip[1]);
    torso(g, hip[0], top, hipY + 4, true, sway);
    scarf(g, hip[0], top + 6, true);
    // head: delayed bob + slight nod
    const hb = w * 5 * (0.5 + 0.5 * Math.cos(Math.PI * 4 * (q - 0.13)));
    const hc: P = [hip[0] + 16, top - 128 + hb];
    g.save(); g.translate(hc[0], hc[1] + 150); g.rotate(Math.sin(Math.PI * 4 * q) * 0.02 * w - 0.12 * p.lookUp); g.translate(-hc[0], -(hc[1] + 150));
    drawHead(g, hc[0], hc[1], p, true);
    g.restore(); g.restore();
    armPose(q, false);
  } else {
    const hip: P = [cx, hipStand];
    const top = hipStand - 228 - breath;
    for (const sx of [-1, 1]) {
      const h: P = [cx + sx * 36, hipStand], a: P = [cx + sx * 54, SOLE3 - ANKLE_H];
      const knee: P = [cx + sx * 46, (h[1] + a[1]) / 2];
      line(g, [h, knee, a], 16, LIMB);
      g.save(); g.translate(a[0], a[1]); g.scale(sx, 1);
      g.beginPath(); g.ellipse(10, 2, 30, 15, 0, 0, Math.PI * 2); fs(g, BOOT, 7); g.restore();
    }
    torso(g, cx, top, hipStand + 4, false, 0);
    scarf(g, cx, top + 6, false);
    for (const sx of [-1, 1]) {
      const sh: P = [cx + sx * 74, top + 44];
      const open = p.armsOpen * (sx > 0 ? 1 : 0.7);
      const wave = sx > 0 ? p.wave : 0;
      let a1 = sx * (0.14 + 0.75 * open), a2 = a1 + sx * (0.12 + 1.1 * open);
      if (wave > 0) { a1 = a1 + (sx * 2.3 - a1) * wave; a2 = a2 + (sx * 3.1 + Math.sin(p.breathe * 6) * 0.25 - a2) * wave; }
      const el: P = [sh[0] + Math.sin(a1) * 118, sh[1] + Math.cos(a1) * 118];
      const hd: P = [el[0] + Math.sin(a2) * 112, el[1] + Math.cos(a2) * 112];
      arm(g, sh, el, hd, false);
    }
    drawHead(g, cx, top - 128, p, false);
  }
  g.restore();
  void hipY;
};
