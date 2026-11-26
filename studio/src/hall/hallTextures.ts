// Seeded Canvas2D textures for the long workshop hall (no external assets; identical in every render tab).
import * as THREE from "three";
import { rng } from "../lib/math";

const cnv = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed: number) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d")!, rng(seed)); return c;
};
const tex = (c: HTMLCanvasElement, rx = 1, ry = 1, srgb = true) => {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
};
const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

/** Polished dark oak planks running along the hall (long axis = texture v). */
export const hallFloor = (rx: number, ry: number) => tex(cnv(1024, 2048, (g, r) => {
  const cols = 8, w = 1024 / cols;
  for (let i = 0; i < cols; i++) {
    let y = -r() * 600;
    while (y < 2048) {
      const h = 500 + r() * 700;
      g.fillStyle = hsl(22 + r() * 8, 38 + r() * 10, 17 + r() * 7); g.fillRect(i * w, y, w, h);
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = `rgba(10,4,2,${0.08 + r() * 0.12})`; g.lineWidth = 1 + r() * 2.5;
        const x = i * w + 4 + r() * (w - 8);
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + (r() - 0.5) * 10, y + h * 0.3, x + (r() - 0.5) * 10, y + h * 0.7, x, y + h); g.stroke();
      }
      g.fillStyle = "rgba(255,220,180,0.035)"; g.fillRect(i * w + w * 0.15, y, w * 0.2, h); // waxed sheen strip
      g.fillStyle = "#080302"; g.fillRect(i * w, y, w, 4);
      y += h;
    }
    g.fillStyle = "#080302"; g.fillRect(i * w, 0, 4, 2048);
  }
}, 101), rx, ry);

/** Runner rug: deep teal field, gold lozenge lattice, oxblood border — original pattern. */
export const runnerRug = (ry: number) => tex(cnv(512, 1024, (g) => {
  g.fillStyle = "#123b3d"; g.fillRect(0, 0, 512, 1024);
  g.fillStyle = "#6b1f22"; g.fillRect(0, 0, 60, 1024); g.fillRect(452, 0, 60, 1024);
  g.fillStyle = "#c9973c"; g.fillRect(60, 0, 10, 1024); g.fillRect(442, 0, 10, 1024); g.fillRect(18, 0, 6, 1024); g.fillRect(488, 0, 6, 1024);
  for (let y = 0; y < 1024; y += 64) { g.fillStyle = "#c9973c"; g.beginPath(); g.moveTo(30, y + 16); g.lineTo(42, y + 32); g.lineTo(30, y + 48); g.lineTo(18, y + 32); g.fill(); g.beginPath(); g.moveTo(482, y + 16); g.lineTo(494, y + 32); g.lineTo(482, y + 48); g.lineTo(470, y + 32); g.fill(); }
  for (let y = -64; y < 1024 + 64; y += 128) for (let x = 70; x < 450; x += 124) {
    const cx = x + 62, cy = y + 64;
    g.strokeStyle = "#c9973c"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(cx, cy - 58); g.lineTo(cx + 58, cy); g.lineTo(cx, cy + 58); g.lineTo(cx - 58, cy); g.closePath(); g.stroke();
    g.fillStyle = "#1d5a58"; g.beginPath(); g.moveTo(cx, cy - 30); g.lineTo(cx + 30, cy); g.lineTo(cx, cy + 30); g.lineTo(cx - 30, cy); g.fill();
    g.fillStyle = "#e0b25a"; g.beginPath(); g.arc(cx, cy, 8, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = "rgba(0,0,0,0.12)"; for (let i = 0; i < 3000; i++) g.fillRect((i * 97) % 512, (i * 233) % 1024, 2, 2);
}, 7), 1, ry);

/** Upper wall: muted plum-grey plaster with faint damask; lower: dark panelled wainscot. */
export const hallWall = (rx: number) => tex(cnv(1024, 1024, (g, r) => {
  g.fillStyle = "#5d5266"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,240,230" : "20,10,30"},${0.012 + r() * 0.02})`; g.beginPath(); g.ellipse(r() * 1024, r() * 700, 8 + r() * 36, 6 + r() * 26, r() * 3, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = "rgba(40,30,55,0.25)"; g.lineWidth = 3;
  for (let x = 64; x < 1024; x += 128) for (let y = 64; y < 680; y += 128) { g.beginPath(); g.moveTo(x, y - 26); g.quadraticCurveTo(x + 22, y, x, y + 26); g.quadraticCurveTo(x - 22, y, x, y - 26); g.stroke(); }
  const y0 = 700;
  g.fillStyle = "#2a1a14"; g.fillRect(0, y0, 1024, 324);
  for (let x = 0; x < 1024; x += 256) {
    g.fillStyle = "#3a2419"; g.fillRect(x + 22, y0 + 40, 212, 250);
    g.strokeStyle = "#140b07"; g.lineWidth = 6; g.strokeRect(x + 22, y0 + 40, 212, 250);
    g.strokeStyle = "rgba(255,210,170,0.08)"; g.lineWidth = 3; g.strokeRect(x + 34, y0 + 52, 188, 226);
  }
  g.fillStyle = "#4a2d1c"; g.fillRect(0, y0 - 16, 1024, 22); g.fillStyle = "#120806"; g.fillRect(0, y0 - 18, 1024, 4); g.fillRect(0, y0 + 6, 1024, 4);
}, 202), rx, 1);

/** Moonlit night seen through the tall windows: gradient sky, moon glow, distant rooftops with a few lit windows. */
export const nightSky = () => tex(cnv(1024, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#070b24"); gr.addColorStop(0.6, "#1d2a63"); gr.addColorStop(1, "#43407e");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; g.fillRect(r() * 1024, r() * 600, 2, 2); }
  const m = g.createRadialGradient(700, 230, 10, 700, 230, 260); m.addColorStop(0, "rgba(220,230,255,0.95)"); m.addColorStop(0.12, "rgba(160,180,255,0.4)"); m.addColorStop(1, "rgba(80,90,200,0)");
  g.fillStyle = m; g.fillRect(0, 0, 1024, 1024); g.fillStyle = "#f2f4ff"; g.beginPath(); g.arc(700, 230, 46, 0, Math.PI * 2); g.fill();
  let x = 0; while (x < 1024) { const w = 50 + r() * 110, h = 140 + r() * 260; g.fillStyle = "#0b0d26"; g.fillRect(x, 1024 - h, w, h);
    for (let k = 0; k < 4; k++) if (r() < 0.35) { g.fillStyle = "rgba(255,190,100,0.9)"; g.fillRect(x + 8 + r() * (w - 20), 1024 - h + 20 + r() * (h - 40), 10, 14); }
    x += w + 4; }
}, 303), 1, 1);

/** Warm interior glow behind the far doorway. */
export const warmGlow = () => tex(cnv(256, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#ffcf7a"); gr.addColorStop(0.7, "#ff9a3c"); gr.addColorStop(1, "#b54a1c");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "rgba(90,40,10,0.5)"; for (let y = 60; y < 512; y += 90) g.fillRect(30, y, 196, 10); // shelves silhouettes
}, 9), 1, 1);

/** Generic soft radial for glows/pools. */
export const glow = (inner: string, outer: string) => {
  const c = cnv(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }, 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

/** Vertical fade used for light shafts and lamp cones (white top -> black bottom), linear (alpha map). */
export const fadeV = () => {
  const c = cnv(4, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#fff"); gr.addColorStop(0.5, "#777"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); }, 1);
  return new THREE.CanvasTexture(c);
};

/** Drawer-front wood for cabinets. */
export const cabinetWood = () => tex(cnv(512, 512, (g, r) => {
  g.fillStyle = "#4a2c1b"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 60; k++) { g.strokeStyle = `rgba(20,8,3,${0.1 + r() * 0.15})`; g.lineWidth = 1 + r() * 2; const y = r() * 512; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + (r() - 0.5) * 16, 340, y + (r() - 0.5) * 16, 512, y); g.stroke(); }
}, 404), 1, 1);
