// Procedural hand-painted textures (Canvas2D, seeded => identical in every render tab). No external assets.
import * as THREE from "three";
import { rng } from "../lib/math";

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  return { c, g: c.getContext("2d")! };
};
const toTex = (c: HTMLCanvasElement, rx = 1, ry = 1) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.anisotropy = 8; return t;
};
const hsl = (h: number, s: number, l: number) => `hsl(${h},${s}%,${l}%)`;

/** Warm worn floor planks with near-black seams and soft grain. */
export const floorTexture = () => {
  const { c, g } = canvas(1024, 1024); const r = rng(11);
  const rows = 8, ph = 1024 / rows;
  for (let i = 0; i < rows; i++) {
    let x = -r() * 300;
    while (x < 1024) {
      const w = 260 + r() * 260;
      g.fillStyle = hsl(26 + r() * 8, 42 + r() * 10, 30 + r() * 9); g.fillRect(x, i * ph, w, ph);
      for (let k = 0; k < 9; k++) { // grain
        g.strokeStyle = `rgba(40,20,8,${0.08 + r() * 0.1})`; g.lineWidth = 1 + r() * 2;
        const y = i * ph + 6 + r() * (ph - 12);
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + w * 0.3, y + (r() - 0.5) * 8, x + w * 0.6, y + (r() - 0.5) * 8, x + w, y); g.stroke();
      }
      if (r() < 0.35) { g.fillStyle = "rgba(30,14,6,0.35)"; g.beginPath(); g.ellipse(x + r() * w, i * ph + ph / 2, 7, 4, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#140a06"; g.fillRect(x, i * ph, 4, ph); // butt seam
      x += w;
    }
    g.fillStyle = "#140a06"; g.fillRect(0, i * ph, 1024, 5); // long seam
  }
  return toTex(c, 3, 3);
};

/** Plaster wall: muted olive-ochre with soft mottling; wainscot boards on the lower band. */
export const wallTexture = () => {
  const { c, g } = canvas(1024, 1024); const r = rng(23);
  g.fillStyle = "#7d6a4c"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? "255,240,210" : "60,40,20"},${0.012 + r() * 0.022})`;
    g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 10 + r() * 40, 8 + r() * 30, r() * 3, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 60; i++) { // hairline plaster cracks
    g.strokeStyle = `rgba(40,25,10,${0.08 + r() * 0.08})`; g.lineWidth = 1;
    let x = r() * 1024, y = r() * 700; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 40; y += r() * 25; g.lineTo(x, y); } g.stroke();
  }
  // wainscot (lower 30%)
  const y0 = 1024 * 0.7;
  for (let x = 0; x < 1024; x += 64) {
    g.fillStyle = hsl(22, 38, 24 + r() * 6); g.fillRect(x, y0, 64, 1024 - y0);
    g.fillStyle = "#170c07"; g.fillRect(x, y0, 4, 1024 - y0);
  }
  g.fillStyle = "#3b2414"; g.fillRect(0, y0 - 18, 1024, 22); // dado rail
  g.fillStyle = "#170c07"; g.fillRect(0, y0 - 20, 1024, 4); g.fillRect(0, y0 + 2, 1024, 3);
  return toTex(c, 2, 1);
};

/** Bench top / generic warm wood. */
export const woodTexture = (seed = 5, hue = 30, light = 42) => {
  const { c, g } = canvas(512, 512); const r = rng(seed);
  g.fillStyle = hsl(hue, 45, light); g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 70; k++) {
    g.strokeStyle = `rgba(60,30,10,${0.06 + r() * 0.12})`; g.lineWidth = 1 + r() * 3;
    const y = r() * 512; g.beginPath(); g.moveTo(0, y);
    g.bezierCurveTo(170, y + (r() - 0.5) * 20, 340, y + (r() - 0.5) * 20, 512, y + (r() - 0.5) * 10); g.stroke();
  }
  return toTex(c);
};

/** Night sky seen through the window and door: deep blue with a moon glow and a few stars. */
export const nightTexture = () => {
  const { c, g } = canvas(512, 512); const r = rng(77);
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#0d1a3d"); gr.addColorStop(1, "#2c4f86");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const mg = g.createRadialGradient(360, 150, 10, 360, 150, 170); mg.addColorStop(0, "rgba(210,225,255,0.9)"); mg.addColorStop(0.15, "rgba(170,195,245,0.45)"); mg.addColorStop(1, "rgba(120,150,220,0)");
  g.fillStyle = mg; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#eef3ff"; g.beginPath(); g.arc(360, 150, 30, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; g.fillRect(r() * 512, r() * 300, 2, 2); }
  // distant rooftops silhouette
  g.fillStyle = "#0a1128"; let x = 0;
  while (x < 512) { const w = 40 + r() * 70, h = 60 + r() * 90; g.fillRect(x, 512 - h, w, h); if (r() < 0.5) { g.fillStyle = "rgba(255,190,90,0.85)"; g.fillRect(x + w * 0.3, 512 - h + 18, 8, 10); g.fillStyle = "#0a1128"; } x += w; }
  const t = toTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
};

/** Vertical alpha gradient for the light cone (bright at the bulb, fading toward the floor). */
export const coneAlpha = () => {
  const { c, g } = canvas(4, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#fff"); gr.addColorStop(0.55, "#666"); gr.addColorStop(1, "#000");
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); return t;
};

/** Soft radial blob (contact shadows, glows). */
export const radial = (inner = "rgba(0,0,0,1)", outer = "rgba(0,0,0,0)") => {
  const { c, g } = canvas(256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
