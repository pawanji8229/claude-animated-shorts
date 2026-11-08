// ORIGINAL character: "Odo Fennick", a night-owl inventor. Flat, bold-outlined 2.5D card drawn with Canvas2D.
// Design language follows the verified style bible (planar face, thick dark contour, sparse features, thin dark
// limbs, readable silhouette) but the design itself is ours: lightbulb-shaped head, brass goggles on the brow,
// silver side-tufts, a walrus moustache, teal shirt, rust apron with a wrench, mustard neckerchief.
// Design canvas: 600 x 1000, soles on y = 975. The card is anchored at the feet in 3D.
//
// v2 (10 s test): sleeves + skin mitten hands so arms read in profile, apron with shoulder strap and back bow
// (the profile no longer reads as a backpack), secondary motion (head bob/tilt, apron hem sway, moustache
// bounce), breathing idle, glance, idea finger, goggles-down with flare reflections, lever reach/pull.
import type { InventorState } from "./timeline";

export const CANVAS_W = 600, CANVAS_H = 1000, SOLE_Y = 975;

const INK = "#231722"; // plum-black contour
const LIMB = "#2a1d26";
const SKIN = "#f4e3cb";
const SKIN_SHADE = "#e2c9a8";
const HAIR = "#ece9e3";
const HAIR_SHADE = "#c9c4bd";
const SHIRT = "#2f7f7a";
const SHIRT_SHADE = "#225f5b";
const APRON = "#c8642b";
const APRON_SHADE = "#a34f21";
const SCARF = "#e3a92b";
const BRASS = "#c99a3a";
const BRASS_DARK = "#8f6a22";
const LENS = "#ffcf6a";
const BOOT = "#5a3622";
const WRENCH = "#9aa3ad";

type G = CanvasRenderingContext2D;
type P = [number, number];
const OUT = 9; // contour width (design px)

const fillStroke = (g: G, fill: string, w = OUT) => {
  g.fillStyle = fill; g.fill();
  g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.lineCap = "round"; g.stroke();
};
const limb = (g: G, pts: P[], w = 15, col = LIMB) => {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.lineWidth = w; g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
};
/** Rolled-up teal sleeve on the upper arm (reads the arm against the torso), then dark forearm + skin mitten. */
const arm = (g: G, sh: P, el: P, hand: P, opts: { back?: boolean; finger?: number; grip?: boolean } = {}) => {
  const w = opts.back ? 0.88 : 1;
  // forearm
  limb(g, [el, hand], 15 * w);
  // sleeve: thick ink then teal
  const mid: P = [sh[0] + (el[0] - sh[0]) * 0.72, sh[1] + (el[1] - sh[1]) * 0.72];
  limb(g, [sh, mid], 40 * w, INK);
  limb(g, [sh, mid], 28 * w, opts.back ? SHIRT_SHADE : SHIRT);
  // cuff
  g.beginPath(); g.arc(mid[0], mid[1], 15 * w, 0, Math.PI * 2); fillStroke(g, opts.back ? SHIRT_SHADE : SHIRT, 6);
  // hand
  g.beginPath(); g.arc(hand[0], hand[1], 19 * w, 0, Math.PI * 2); fillStroke(g, opts.back ? SKIN_SHADE : SKIN, 7);
  if (opts.finger && opts.finger > 0.05) {
    const L = 34 * opts.finger;
    g.beginPath(); g.moveTo(hand[0] + 2, hand[1] - 10); g.lineTo(hand[0] + 4, hand[1] - 10 - L);
    g.lineWidth = 17; g.strokeStyle = INK; g.lineCap = "round"; g.stroke();
    g.lineWidth = 9; g.strokeStyle = SKIN; g.stroke();
  }
};
const boot = (g: G, x: number, y: number, dir: number, ang = 0) => {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.beginPath(); g.ellipse(dir * 14, -10, 31, 16, 0, 0, Math.PI * 2);
  fillStroke(g, BOOT, 7);
  g.beginPath(); g.moveTo(dir * -10, -2); g.lineTo(dir * 40, -2); g.lineWidth = 5; g.strokeStyle = "#2c180d"; g.stroke(); // sole
  g.restore();
};

// Lightbulb head: round dome on top narrowing to a softer jaw.
const headPath = (g: G, cx: number, cy: number, side: boolean) => {
  const w = 150, h = 168;
  g.beginPath();
  if (!side) {
    g.moveTo(cx, cy - h);
    g.bezierCurveTo(cx + w * 1.05, cy - h, cx + w * 1.05, cy - h * 0.1, cx + w * 0.62, cy + h * 0.42);
    g.bezierCurveTo(cx + w * 0.42, cy + h * 0.72, cx - w * 0.42, cy + h * 0.72, cx - w * 0.62, cy + h * 0.42);
    g.bezierCurveTo(cx - w * 1.05, cy - h * 0.1, cx - w * 1.05, cy - h, cx, cy - h);
  } else {
    g.moveTo(cx - 10, cy - h);
    g.bezierCurveTo(cx + w * 0.95, cy - h, cx + w * 1.02, cy - h * 0.2, cx + w * 0.92, cy + h * 0.02);
    g.quadraticCurveTo(cx + w * 1.16, cy + h * 0.12, cx + w * 0.9, cy + h * 0.24); // nose
    g.bezierCurveTo(cx + w * 0.75, cy + h * 0.66, cx - w * 0.3, cy + h * 0.74, cx - w * 0.6, cy + h * 0.4);
    g.bezierCurveTo(cx - w * 1.05, cy - h * 0.05, cx - w * 0.95, cy - h, cx - 10, cy - h);
  }
  g.closePath();
};

const goggleLens = (g: G, x: number, y: number, r: number, glow: number) => {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); fillStroke(g, BRASS, 8);
  g.beginPath(); g.arc(x, y, r * 0.86, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = BRASS_DARK; g.stroke();
  g.beginPath(); g.arc(x, y, r * 0.64, 0, Math.PI * 2);
  const gr = g.createRadialGradient(x - r * 0.2, y - r * 0.2, 1, x, y, r * 0.64);
  gr.addColorStop(0, glow > 0.05 ? "#fffbe8" : "#ffe7a6"); gr.addColorStop(1, glow > 0.05 ? "#ffd27a" : LENS);
  g.fillStyle = gr; g.fill(); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
  // specular glints
  g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.25, r * 0.18, r * 0.1, -0.6, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,0.9)"; g.fill();
  if (glow > 0.02) { g.globalAlpha = Math.min(1, glow); g.beginPath(); g.arc(x + r * 0.2, y + r * 0.15, r * 0.12, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.globalAlpha = 1; }
};

const drawHead = (g: G, cx: number, cy: number, st: InventorState, side: boolean) => {
  const look = st.lookUp, joy = st.delight;
  const gog = st.goggles ?? 0;
  const lx = (st.lookX ?? 0) * 10;
  const ey = cy - 22 - 8 * look;
  // back tufts (behind head)
  if (side) { g.beginPath(); g.ellipse(cx - 118, cy - 6, 52, 64, -0.3, 0, Math.PI * 2); fillStroke(g, HAIR); }
  else for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 140, cy - 18, 46, 62, sx * 0.35, 0, Math.PI * 2); fillStroke(g, HAIR); }
  // tuft strands
  g.lineWidth = 3; g.strokeStyle = HAIR_SHADE;
  const tufts = side ? [cx - 118] : [cx - 140, cx + 140];
  for (const tx of tufts) for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(tx + k * 14, cy - 50); g.quadraticCurveTo(tx + k * 18, cy - 10, tx + k * 10, cy + 30); g.stroke(); }
  // head
  headPath(g, cx, cy, side); fillStroke(g, SKIN, OUT + 1);
  g.save(); headPath(g, cx, cy, side); g.clip();
  g.beginPath(); g.ellipse(cx - 175, cy + 40, 120, 220, 0, 0, Math.PI * 2); g.fillStyle = SKIN_SHADE; g.globalAlpha = 0.55; g.fill();
  g.globalAlpha = 1; g.restore();
  // ear (side view)
  if (side) { g.beginPath(); g.ellipse(cx - 30, cy - 2, 22, 30, 0.1, 0, Math.PI * 2); fillStroke(g, SKIN, 7); g.beginPath(); g.arc(cx - 30, cy, 9, -1.2, 1.4); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); }
  // crown highlight
  g.beginPath(); g.arc(cx + (side ? 10 : 30), cy - 128, 30, Math.PI * 1.15, Math.PI * 1.55);
  g.lineWidth = 10; g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineCap = "round"; g.stroke();

  // brows
  const bLift = 7 * joy + 3 * look + 6 * (st.idea ?? 0);
  const brow = (x: number, dir: number) => {
    g.beginPath(); g.moveTo(x - 24, ey - 30 - bLift + dir * 3); g.quadraticCurveTo(x, ey - 44 - bLift, x + 24, ey - 30 - bLift - dir * 3);
    g.lineWidth = 12; g.strokeStyle = HAIR_SHADE; g.lineCap = "round"; g.stroke();
    g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  };
  const eye = (x: number) => {
    if (st.blink) { g.beginPath(); g.moveTo(x - 13, ey); g.quadraticCurveTo(x, ey + 7, x + 13, ey); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); }
    else { g.beginPath(); g.ellipse(x + lx, ey, 10, 15 + 2 * joy, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); }
  };
  if (side) { eye(cx + 78); brow(cx + 76, 1); } else { eye(cx - 42); eye(cx + 42); brow(cx - 44, -1); brow(cx + 44, 1); }

  // goggles: on the brow (gog=0) sliding down over the eyes (gog=1)
  const gy = cy - 122 + (ey - (cy - 122)) * gog;
  const r = 32 + 6 * gog;
  g.beginPath();
  if (side) { g.moveTo(cx - 128, gy + 6); g.lineTo(cx + 96, gy); } else { g.moveTo(cx - 148, gy + 4); g.lineTo(cx + 148, gy + 4); }
  g.lineWidth = 16; g.strokeStyle = "#5b3a2a"; g.stroke();
  const glow = st.lensGlow ?? 0;
  if (side) goggleLens(g, cx + 88, gy, r, glow);
  else { goggleLens(g, cx - 48, gy, r, glow); goggleLens(g, cx + 48, gy, r, glow); g.beginPath(); g.moveTo(cx - 48 + r, gy); g.lineTo(cx + 48 - r, gy); g.lineWidth = 8; g.strokeStyle = BRASS_DARK; g.stroke(); }

  // walrus moustache + mouth (moustache bounces a touch with the gait)
  const bounce = Math.sin((st.phase ?? 0) * 2) * 2 * st.walkAmt;
  const my = cy + 48 - 6 * look + bounce;
  if (side) {
    g.beginPath(); g.ellipse(cx + 104, my, 44, 20, 0.15, 0, Math.PI * 2); fillStroke(g, HAIR, 7);
    if (joy > 0.05) { g.beginPath(); g.ellipse(cx + 98, my + 32, 18 * joy + 4, 14 * joy + 3, 0, 0, Math.PI); fillStroke(g, "#7a2b2b", 5); }
    else { g.beginPath(); g.moveTo(cx + 78, my + 30); g.quadraticCurveTo(cx + 96, my + 36, cx + 112, my + 28); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); }
  } else {
    if (joy > 0.05) {
      g.beginPath(); g.ellipse(cx, my + 34, 26 * joy + 6, 22 * joy + 4, 0, 0, Math.PI); fillStroke(g, "#7a2b2b", 6);
      g.beginPath(); g.ellipse(cx, my + 34 + 12 * joy, 12 * joy, 6 * joy, 0, 0, Math.PI * 2); g.fillStyle = "#c95a5a"; g.fill(); // tongue
    } else { g.beginPath(); g.moveTo(cx - 16, my + 32); g.quadraticCurveTo(cx, my + 38, cx + 16, my + 32); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); }
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 38, my + 4 - joy * 4, 44, 20, sx * (0.25 + 0.15 * joy), 0, Math.PI * 2); fillStroke(g, HAIR, 7); }
  }
};

const torso = (g: G, cx: number, top: number, hip: number, side: boolean, sway: number) => {
  const sw = side ? 58 : 84, hw = side ? 66 : 92;
  // shirt body
  g.beginPath();
  if (side) { // rounded back (left), straighter chest (right)
    g.moveTo(cx - 20, top - 2); g.quadraticCurveTo(cx + sw, top, cx + sw + 4, top + 40);
    g.lineTo(cx + hw, hip); g.lineTo(cx - hw + 6, hip); g.quadraticCurveTo(cx - sw - 22, top + 90, cx - 20, top - 2);
  } else { g.moveTo(cx - sw, top + 14); g.quadraticCurveTo(cx, top - 8, cx + sw, top + 14); g.lineTo(cx + hw, hip); g.lineTo(cx - hw, hip); }
  g.closePath(); fillStroke(g, SHIRT);
  g.save(); g.clip(); g.fillStyle = SHIRT_SHADE; g.fillRect(cx - hw - 30, top - 10, side ? 50 : 46, hip - top + 20); g.restore();
  // belt
  g.beginPath(); g.rect(cx - hw + (side ? 6 : 0), hip - 22, hw * 2 - (side ? 6 : 0), 20); fillStroke(g, "#4a2f1e", 6);
  if (!side) { g.beginPath(); g.rect(cx - 13, hip - 25, 26, 26); fillStroke(g, BRASS, 5); }
  // apron (front panel) with hem sway
  const ax0 = side ? cx + 2 : cx - 64, ax1 = side ? cx + hw + 8 : cx + 64;
  g.beginPath(); g.moveTo(ax0 + (side ? 22 : 12), top + 34); g.lineTo(ax1 - (side ? 6 : 12), top + 34);
  g.lineTo(ax1 + 6 + sway, hip + 74); g.quadraticCurveTo((ax0 + ax1) / 2 + sway, hip + 82, ax0 - 4 + sway * 0.6, hip + 74); g.closePath(); fillStroke(g, APRON);
  g.save(); g.clip(); g.fillStyle = APRON_SHADE; g.fillRect(ax0 - 10, top + 30, 24, hip - top + 70);
  g.strokeStyle = "rgba(90,40,15,0.35)"; g.lineWidth = 3; g.setLineDash([8, 7]);
  g.beginPath(); g.moveTo(ax0 + 14, top + 46); g.lineTo(ax0 + 10 + sway * 0.6, hip + 64); g.stroke(); g.setLineDash([]); g.restore();
  // apron strap over the shoulder + bow at the back (side) / neck strap (front)
  if (side) {
    g.beginPath(); g.moveTo(ax0 + 26, top + 36); g.quadraticCurveTo(cx - 10, top + 4, cx - 34, top + 24); g.lineWidth = 12; g.strokeStyle = INK; g.stroke(); g.lineWidth = 6; g.strokeStyle = APRON; g.stroke();
    g.beginPath(); g.moveTo(ax0 + 4, hip - 12); g.lineTo(cx - hw + 2, hip - 12); g.lineWidth = 10; g.strokeStyle = INK; g.stroke(); g.lineWidth = 5; g.strokeStyle = APRON; g.stroke();
    for (const a of [-0.6, 0.6]) { g.beginPath(); g.ellipse(cx - hw - 4, hip - 12 + a * 14, 16, 8, a, 0, Math.PI * 2); fillStroke(g, APRON, 5); }
    g.beginPath(); g.moveTo(cx - hw - 4, hip - 6); g.quadraticCurveTo(cx - hw - 14 - sway * 0.5, hip + 20, cx - hw - 10 - sway, hip + 40); g.lineWidth = 9; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = APRON; g.stroke();
  }
  // pocket + wrench
  const px = side ? cx + 44 : cx + 10, py = top + 132;
  g.beginPath(); g.rect(px - 28, py, 56, 40); fillStroke(g, APRON_SHADE, 6);
  g.beginPath(); g.moveTo(px + 8, py + 4); g.lineTo(px + 18, py - 46); g.lineWidth = 10; g.strokeStyle = WRENCH; g.lineCap = "round"; g.stroke();
  g.beginPath(); g.arc(px + 19, py - 52, 12, 0.6, Math.PI * 2 - 0.6); g.lineWidth = 8; g.strokeStyle = WRENCH; g.stroke();
  // neckerchief
  g.beginPath(); g.moveTo(cx - (side ? 30 : 50), top + 6); g.quadraticCurveTo(cx + (side ? 10 : 0), top + 34, cx + (side ? 54 : 50), top + 6);
  g.lineTo(cx + (side ? 44 : 14), top + 58); g.lineTo(cx + (side ? 22 : -14), top + 58); g.closePath(); fillStroke(g, SCARF, 7);
};

/** Draw the inventor for a given state into a 600x1000 canvas context (already cleared). */
export const drawInventor = (g: G, st: InventorState) => {
  const side = st.mode === "side";
  const cx = 300;
  const walk = st.walkAmt;
  const ph = st.phase;
  const LEG_T = 132, LEG_S = 126;
  const breath = Math.sin(st.breathe ?? 0) * 3 * (1 - walk);
  const shiver = (st.shiver ?? 0) * Math.sin((st.breathe ?? 0) * 9) * 6;
  const sq = st.turnSquash * 0.06;
  g.save();
  g.translate(cx, SOLE_Y); g.scale(1 + sq, 1 - sq); g.translate(-cx, -SOLE_Y);

  if (side) {
    const legs = [0, Math.PI].map((o) => {
      const p = ph + o;
      const hipA = 0.42 * Math.sin(p) * walk;
      const swing = Math.max(0, Math.cos(p)) * walk;
      const kneeA = hipA - 0.75 * swing;
      return { hipA, kneeA };
    });
    const footY = (l: { hipA: number; kneeA: number }) => LEG_T * Math.cos(l.hipA) + LEG_S * Math.cos(l.kneeA);
    const hipY = SOLE_Y - 12 - Math.max(...legs.map(footY));
    const reach = st.reach ?? 0;
    const lean = 0.06 * walk + 0.08 * reach;
    const hipX = cx - 8;
    const topY = hipY - 210 - breath;
    const sway = -Math.sin(ph) * 7 * walk + shiver;
    const headTilt = Math.sin(ph * 2) * 0.025 * walk - 0.12 * st.lookUp;
    const armA = (o: number) => -0.55 * Math.sin(ph + o) * walk;
    const sholder = (): P => [hipX + 6 + Math.sin(lean) * 200, topY + 34];
    const sideArm = (a: number, back: boolean) => {
      const sh = sholder();
      const a1 = a, a2 = a + 0.35;
      let e: P = [sh[0] + Math.sin(a1) * 92, sh[1] + Math.cos(a1) * 92];
      let h: P = [e[0] + Math.sin(a2) * 86, e[1] + Math.cos(a2) * 86];
      if (!back && reach > 0) {
        // two-bone IK: hand goes to the lever knob (up), then follows it as it is pulled toward the body
        const pull = st.pull ?? 0;
        const tUp: P = [sh[0] + 142, sh[1] - 86], tPull: P = [sh[0] + 40, sh[1] - 70];
        const tgt: P = [tUp[0] + (tPull[0] - tUp[0]) * pull, tUp[1] + (tPull[1] - tUp[1]) * pull];
        h = [h[0] + (tgt[0] - h[0]) * reach, h[1] + (tgt[1] - h[1]) * reach];
        const dx = h[0] - sh[0], dy = h[1] - sh[1];
        const L1 = 92, L2 = 86, d = Math.min(L1 + L2 - 0.01, Math.max(8, Math.hypot(dx, dy)));
        const base = Math.atan2(dy, dx);
        const k = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
        const ang = base + k; // elbow bends downward
        e = [sh[0] + Math.cos(ang) * L1, sh[1] + Math.sin(ang) * L1];
      }
      g.save(); if (back) g.globalAlpha = 0.95; arm(g, sh, e, h, { back }); g.restore();
    };
    sideArm(armA(0), true);
    legs.forEach((l, i) => {
      const k: P = [hipX + Math.sin(l.hipA) * LEG_T, hipY + Math.cos(l.hipA) * LEG_T];
      const a: P = [k[0] + Math.sin(l.kneeA) * LEG_S, k[1] + Math.cos(l.kneeA) * LEG_S];
      limb(g, [[hipX, hipY], k, a], i === 0 ? 14 : 16, i === 0 ? "#3a2a33" : LIMB);
      boot(g, a[0], a[1] + 8, 1, Math.max(-0.35, Math.min(0.35, l.kneeA * 0.5)));
    });
    g.save(); g.translate(hipX, hipY); g.rotate(lean); g.translate(-hipX, -hipY);
    torso(g, hipX, topY, hipY + 6, true, sway);
    const hx = hipX + 18, hy = topY - 150 + Math.abs(Math.sin(ph)) * -4 * walk;
    g.save(); g.translate(hx, hy + 120); g.rotate(headTilt); g.translate(-hx, -(hy + 120));
    drawHead(g, hx, hy, st, true);
    g.restore(); g.restore();
    sideArm(armA(Math.PI), false);
  } else {
    const hipY = SOLE_Y - 14 - LEG_T - LEG_S + 6;
    const topY = hipY - 210 - breath;
    const open = st.delight;
    const idea = st.idea ?? 0, gh = st.goggleHand ?? 0;
    for (const sx of [-1, 1]) {
      const hx = cx + sx * 34, fx = cx + sx * 58;
      limb(g, [[hx, hipY], [cx + sx * 46, hipY + LEG_T], [fx, SOLE_Y - 18]], 16);
      boot(g, fx, SOLE_Y - 10, sx, 0);
    }
    g.save(); g.translate(cx, hipY); g.rotate(shiver * 0.004); g.translate(-cx, -hipY);
    torso(g, cx, topY, hipY + 6, false, shiver);
    const headCY = topY - 152;
    const armsFront: (() => void)[] = [];
    for (const sx of [-1, 1]) {
      const sh: P = [cx + sx * 76, topY + 28];
      let e: P, h: P;
      if (sx > 0 && (idea > 0.01 || gh > 0.01)) {
        // right arm: raise index finger (idea) / or reach up to the goggles
        const tIdea: [P, P] = [[sh[0] + 70, sh[1] - 30], [sh[0] + 70, sh[1] - 130]];
        const tGog: [P, P] = [[sh[0] + 40, sh[1] - 90], [cx + 70, headCY - 60]];
        const rest: [P, P] = [[sh[0] + 16, sh[1] + 90], [sh[0] + 30, sh[1] + 172]];
        const k1 = Math.min(1, idea), k2 = gh;
        const blend = (i: 0 | 1): P => {
          const a = rest[i], b = tIdea[i], c = tGog[i];
          const x = a[0] + (b[0] - a[0]) * k1, y = a[1] + (b[1] - a[1]) * k1;
          return [x + (c[0] - x) * k2, y + (c[1] - y) * k2];
        };
        e = blend(0); h = blend(1);
        armsFront.push(() => arm(g, sh, e, h, { finger: idea * (1 - gh) }));
        continue;
      }
      const raise = sx > 0 ? open * 1.0 : open * 0.55;
      const a1 = sx * (0.18 + 0.7 * raise);
      e = [sh[0] + Math.sin(a1) * 92, sh[1] + Math.cos(a1) * 92];
      const a2 = a1 + sx * (0.2 + 1.2 * raise);
      h = [e[0] + Math.sin(a2) * 84, e[1] + Math.cos(a2) * 84];
      arm(g, sh, e, h);
    }
    drawHead(g, cx, headCY, st, false);
    armsFront.forEach((d) => d());
    g.restore();
  }
  g.restore();
};
