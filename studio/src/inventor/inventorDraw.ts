// ORIGINAL character: "Odo Fennick", a night-owl inventor. Flat, bold-outlined 2.5D card drawn with Canvas2D.
// Design language follows the verified style bible (planar face, thick dark contour, sparse features, thin dark
// limbs, readable silhouette) but the design itself is ours: lightbulb-shaped head, brass goggles on the brow,
// silver side-tufts, a walrus moustache, teal shirt, rust apron with a wrench, mustard neckerchief.
// Design canvas: 600 x 1000, soles on y = 975. The card is anchored at the feet in 3D.
import type { InventorState } from "./timeline";

export const CANVAS_W = 600, CANVAS_H = 1000, SOLE_Y = 975;

const INK = "#231722"; // plum-black contour
const LIMB = "#2a1d26";
const SKIN = "#f4e3cb";
const SKIN_SHADE = "#e2c9a8";
const HAIR = "#e9e6e0";
const HAIR_SHADE = "#c9c4bd";
const SHIRT = "#2f7f7a";
const SHIRT_SHADE = "#246561";
const APRON = "#c8642b";
const APRON_SHADE = "#a34f21";
const SCARF = "#e3a92b";
const BRASS = "#c99a3a";
const LENS = "#ffcf6a";
const BOOT = "#5a3622";
const WRENCH = "#9aa3ad";

type G = CanvasRenderingContext2D;
const OUT = 9; // contour width (design px)

const fillStroke = (g: G, fill: string, w = OUT) => {
  g.fillStyle = fill; g.fill();
  g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.lineCap = "round"; g.stroke();
};
const limb = (g: G, pts: [number, number][], w = 15) => {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.lineWidth = w; g.strokeStyle = LIMB; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
};
const dot = (g: G, x: number, y: number, r: number, c = INK) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = c; g.fill(); };
const boot = (g: G, x: number, y: number, dir: number, ang = 0) => {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.beginPath(); g.ellipse(dir * 14, -10, 30, 15, 0, 0, Math.PI * 2);
  fillStroke(g, BOOT, 7); g.restore();
};

// Lightbulb head: round dome on top narrowing to a softer jaw.
const headPath = (g: G, cx: number, cy: number, s: number, side: boolean) => {
  const w = 150 * s, h = 168 * s;
  g.beginPath();
  if (!side) {
    g.moveTo(cx, cy - h);
    g.bezierCurveTo(cx + w * 1.05, cy - h, cx + w * 1.05, cy - h * 0.1, cx + w * 0.62, cy + h * 0.42);
    g.bezierCurveTo(cx + w * 0.42, cy + h * 0.72, cx - w * 0.42, cy + h * 0.72, cx - w * 0.62, cy + h * 0.42);
    g.bezierCurveTo(cx - w * 1.05, cy - h * 0.1, cx - w * 1.05, cy - h, cx, cy - h);
  } else {
    // profile facing +x: fuller back of skull, nose bump at front
    g.moveTo(cx - 10 * s, cy - h);
    g.bezierCurveTo(cx + w * 0.95, cy - h, cx + w * 1.02, cy - h * 0.2, cx + w * 0.92, cy + h * 0.02);
    g.quadraticCurveTo(cx + w * 1.16, cy + h * 0.12, cx + w * 0.9, cy + h * 0.24); // nose
    g.bezierCurveTo(cx + w * 0.75, cy + h * 0.66, cx - w * 0.3, cy + h * 0.74, cx - w * 0.6, cy + h * 0.4);
    g.bezierCurveTo(cx - w * 1.05, cy - h * 0.05, cx - w * 0.95, cy - h, cx - 10 * s, cy - h);
  }
  g.closePath();
};

const drawHead = (g: G, cx: number, cy: number, st: InventorState, side: boolean) => {
  const look = st.lookUp, joy = st.delight;
  const ey = cy - 22 - 8 * look; // eyes travel up when looking at the bulb
  // back tufts (behind head)
  g.save();
  if (side) {
    g.beginPath(); g.ellipse(cx - 118, cy - 6, 52, 64, -0.3, 0, Math.PI * 2); fillStroke(g, HAIR);
  } else {
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 140, cy - 18, 46, 62, sx * 0.35, 0, Math.PI * 2); fillStroke(g, HAIR); }
  }
  g.restore();
  // head
  headPath(g, cx, cy, 1, side); fillStroke(g, SKIN, OUT + 1);
  // painted shade crescent on the shadow side (cards are lit by scene light too; this gives them volume)
  g.save(); headPath(g, cx, cy, 1, side); g.clip();
  g.beginPath(); g.ellipse(cx - 175, cy + 40, 120, 220, 0, 0, Math.PI * 2); g.fillStyle = SKIN_SHADE; g.globalAlpha = 0.55; g.fill();
  g.restore();
  // crown highlight stroke (reads as a polished bald dome)
  g.beginPath(); g.arc(cx + (side ? 10 : 30), cy - 128, 30, Math.PI * 1.15, Math.PI * 1.55);
  g.lineWidth = 10; g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineCap = "round"; g.stroke();

  // goggles strapped across the brow
  const gy = cy - 122;
  g.beginPath();
  if (side) { g.moveTo(cx - 128, gy + 6); g.lineTo(cx + 96, gy); } else { g.moveTo(cx - 148, gy + 4); g.lineTo(cx + 148, gy + 4); }
  g.lineWidth = 16; g.strokeStyle = "#5b3a2a"; g.stroke();
  const lenses = side ? [cx + 92] : [cx - 52, cx + 52];
  for (const lx of lenses) {
    g.beginPath(); g.arc(lx, gy, 32, 0, Math.PI * 2); fillStroke(g, BRASS, 8);
    g.beginPath(); g.arc(lx, gy, 20, 0, Math.PI * 2); fillStroke(g, LENS, 5);
    g.beginPath(); g.arc(lx - 8, gy - 8, 7, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,0.85)"; g.fill();
  }

  // brows
  const bLift = 7 * joy + 3 * look;
  const brow = (x: number, dir: number) => {
    g.beginPath(); g.moveTo(x - 24, ey - 30 - bLift + dir * 3); g.quadraticCurveTo(x, ey - 44 - bLift, x + 24, ey - 30 - bLift - dir * 3);
    g.lineWidth = 11; g.strokeStyle = HAIR_SHADE; g.lineCap = "round"; g.stroke();
    g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  };
  // eyes (sparse black ovals, no highlights) + blink
  const eye = (x: number) => {
    if (st.blink) { g.beginPath(); g.moveTo(x - 13, ey); g.quadraticCurveTo(x, ey + 7, x + 13, ey); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); }
    else { g.beginPath(); g.ellipse(x, ey, 10, 15 + 2 * joy, 0, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); }
  };
  if (side) { eye(cx + 78); brow(cx + 76, 1); } else { eye(cx - 42); eye(cx + 42); brow(cx - 44, -1); brow(cx + 44, 1); }

  // walrus moustache + mouth
  const my = cy + 48 - 6 * look;
  if (side) {
    g.beginPath(); g.ellipse(cx + 104, my, 44, 20, 0.15, 0, Math.PI * 2); fillStroke(g, HAIR, 7);
    g.beginPath(); g.moveTo(cx + 78, my + 30); g.quadraticCurveTo(cx + 96, my + 36, cx + 112, my + 28); g.lineWidth = 6; g.strokeStyle = INK; g.stroke();
  } else {
    if (joy > 0.05) { // open delighted mouth under the moustache
      g.beginPath(); g.ellipse(cx, my + 34, 26 * joy + 6, 22 * joy + 4, 0, 0, Math.PI); fillStroke(g, "#7a2b2b", 6);
    } else { g.beginPath(); g.moveTo(cx - 16, my + 32); g.quadraticCurveTo(cx, my + 38, cx + 16, my + 32); g.lineWidth = 6; g.strokeStyle = INK; g.stroke(); }
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(cx + sx * 38, my + 4 - joy * 4, 44, 20, sx * (0.25 + 0.15 * joy), 0, Math.PI * 2); fillStroke(g, HAIR, 7); }
  }
};

const torso = (g: G, cx: number, top: number, hip: number, side: boolean) => {
  const sw = side ? 62 : 84, hw = side ? 70 : 92;
  // shirt
  g.beginPath(); g.moveTo(cx - sw, top + 14); g.quadraticCurveTo(cx, top - 8, cx + sw, top + 14);
  g.lineTo(cx + hw, hip); g.lineTo(cx - hw, hip); g.closePath(); fillStroke(g, SHIRT);
  g.save(); g.clip(); g.fillStyle = SHIRT_SHADE; g.fillRect(cx - hw - 5, top, side ? 40 : 46, hip - top + 5); g.restore();
  // apron (front panel)
  const ax0 = side ? cx + 6 : cx - 64, ax1 = side ? cx + hw + 6 : cx + 64;
  g.beginPath(); g.moveTo(ax0 + (side ? 18 : 12), top + 36); g.lineTo(ax1 - (side ? 4 : 12), top + 36);
  g.lineTo(ax1 + 4, hip + 70); g.lineTo(ax0 - 4, hip + 70); g.closePath(); fillStroke(g, APRON);
  g.save(); g.clip(); g.fillStyle = APRON_SHADE; g.fillRect(ax0 - 10, top + 30, 26, hip - top + 60); g.restore();
  // pocket + wrench
  const px = side ? cx + 46 : cx + 10, py = top + 132;
  g.beginPath(); g.rect(px - 28, py, 56, 40); fillStroke(g, APRON_SHADE, 6);
  g.beginPath(); g.moveTo(px + 8, py + 4); g.lineTo(px + 18, py - 46); g.lineWidth = 10; g.strokeStyle = WRENCH; g.lineCap = "round"; g.stroke();
  g.beginPath(); g.arc(px + 19, py - 52, 12, 0.6, Math.PI * 2 - 0.6); g.lineWidth = 8; g.strokeStyle = WRENCH; g.stroke();
  // neckerchief
  g.beginPath(); g.moveTo(cx - (side ? 34 : 50), top + 6); g.quadraticCurveTo(cx, top + 34, cx + (side ? 50 : 50), top + 6);
  g.lineTo(cx + (side ? 40 : 14), top + 56); g.lineTo(cx + (side ? 18 : -14), top + 56); g.closePath(); fillStroke(g, SCARF, 7);
};

/** Draw the inventor for a given state into a 600x1000 canvas context (already cleared). */
export const drawInventor = (g: G, st: InventorState) => {
  const side = st.mode === "side";
  const cx = 300;
  const walk = st.walkAmt;
  const ph = st.phase;
  const LEG_T = 132, LEG_S = 126; // thigh, shin (design px)
  // squash on turn
  const sq = st.turnSquash * 0.06;
  g.save();
  g.translate(cx, SOLE_Y); g.scale(1 + sq, 1 - sq); g.translate(-cx, -SOLE_Y);

  if (side) {
    // gait: two legs half a cycle apart. Hip angle swings; knee bends during swing phase.
    const legs = [0, Math.PI].map((o) => {
      const p = ph + o;
      const hipA = 0.42 * Math.sin(p) * walk; // + forward (toward +x)
      const swing = Math.max(0, Math.cos(p)) * walk; // knee bend when leg moves forward
      const kneeA = hipA - 0.75 * swing;
      return { hipA, kneeA, foot: 0 };
    });
    // find hip height so the lowest foot touches the sole line (natural bob)
    const footY = (l: { hipA: number; kneeA: number }) => LEG_T * Math.cos(l.hipA) + LEG_S * Math.cos(l.kneeA);
    const maxDrop = Math.max(...legs.map(footY));
    const hipY = SOLE_Y - 12 - maxDrop;
    const lean = 0.06 * walk; // lean into the walk
    const hipX = cx - 8;
    const topY = hipY - 210;
    // far arm (behind torso), drawn first
    const armA = (o: number) => -0.55 * Math.sin(ph + o) * walk;
    const shoulder: [number, number] = [hipX + 10 + Math.sin(lean) * 210, topY + 30];
    const arm = (a: number, back: boolean) => {
      const e: [number, number] = [shoulder[0] + Math.sin(a) * 92, shoulder[1] + Math.cos(a) * 92];
      const h: [number, number] = [e[0] + Math.sin(a + 0.35) * 86, e[1] + Math.cos(a + 0.35) * 86];
      limb(g, [shoulder, e, h], back ? 13 : 15); dot(g, h[0], h[1], back ? 13 : 15, LIMB);
    };
    arm(armA(0), true);
    // legs: far leg first (darker), then near
    legs.forEach((l, i) => {
      const k: [number, number] = [hipX + Math.sin(l.hipA) * LEG_T, hipY + Math.cos(l.hipA) * LEG_T];
      const a: [number, number] = [k[0] + Math.sin(l.kneeA) * LEG_S, k[1] + Math.cos(l.kneeA) * LEG_S];
      g.save(); if (i === 0) g.globalAlpha = 0.9;
      limb(g, [[hipX, hipY], k, a], i === 0 ? 14 : 16);
      boot(g, a[0], a[1] + 8, 1, Math.max(-0.35, Math.min(0.35, l.kneeA * 0.5)));
      g.restore();
    });
    g.save(); g.translate(hipX, hipY); g.rotate(lean); g.translate(-hipX, -hipY);
    torso(g, hipX, topY, hipY + 6, true);
    drawHead(g, hipX + 18, topY - 150, st, true);
    g.restore();
    arm(armA(Math.PI), false);
  } else {
    const hipY = SOLE_Y - 14 - LEG_T - LEG_S + 6;
    const topY = hipY - 210;
    const open = st.delight;
    // legs, slightly apart
    for (const sx of [-1, 1]) {
      const hx = cx + sx * 34, fx = cx + sx * 58;
      limb(g, [[hx, hipY], [cx + sx * 46, hipY + LEG_T], [fx, SOLE_Y - 18]], 16);
      boot(g, fx, SOLE_Y - 10, sx, 0);
    }
    torso(g, cx, topY, hipY + 6, false);
    // arms: hang, then open outward in delight; right hand rises toward the goggles strap
    for (const sx of [-1, 1]) {
      const sh: [number, number] = [cx + sx * 78, topY + 26];
      const raise = sx > 0 ? open * 1.0 : open * 0.55;
      const a1 = sx * (0.18 + 0.7 * raise);
      const e: [number, number] = [sh[0] + Math.sin(a1) * 92, sh[1] + Math.cos(a1) * 92];
      const a2 = a1 + sx * (0.2 + 1.2 * raise);
      const h: [number, number] = [e[0] + Math.sin(a2) * 84, e[1] + Math.cos(a2) * 84];
      limb(g, [sh, e, h], 15); dot(g, h[0], h[1], 15, LIMB);
    }
    drawHead(g, cx, topY - 152, st, false);
  }
  g.restore();
};
