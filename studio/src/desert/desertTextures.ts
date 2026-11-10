// Seeded Canvas2D textures for the Arizona desert set (no external assets).
import * as THREE from "three";
import { rng } from "../lib/math";

const cnv = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed: number) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!, rng(seed)); return c;
};
const tex = (c: HTMLCanvasElement, rx = 1, ry = 1, srgb = true) => {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8; return t;
};

/** Warm sand with wind ripples, pebbles and colour drift. */
export const sandTex = () => tex(cnv(1024, 1024, (g, r) => {
  g.fillStyle = "#d9a066"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,214,160" : "150,90,45"},${0.05 + r() * 0.07})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 30 + r() * 160, 20 + r() * 90, r() * 3, 0, Math.PI * 2); g.fill(); }
  for (let y = 0; y < 1024; y += 9 + r() * 6) { // ripples
    g.strokeStyle = `rgba(120,70,30,${0.06 + r() * 0.06})`; g.lineWidth = 2;
    g.beginPath(); for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + Math.sin(x * 0.02 + y) * 4 + Math.sin(x * 0.007) * 6); g.stroke();
    g.strokeStyle = `rgba(255,230,190,${0.05 + r() * 0.05})`; g.beginPath(); for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y + 2 + Math.sin(x * 0.02 + y) * 4 + Math.sin(x * 0.007) * 6); g.stroke();
  }
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${90 + r() * 80},${60 + r() * 40},${30 + r() * 30},${0.4 + r() * 0.5})`; g.fillRect(r() * 1024, r() * 1024, 1 + r() * 3, 1 + r() * 2); }
}, 31), 8, 8);

/** Cracked dry riverbed mud (polygonal cracks). */
export const mudTex = () => tex(cnv(1024, 1024, (g, r) => {
  g.fillStyle = "#b9875a"; g.fillRect(0, 0, 1024, 1024);
  const pts: [number, number][] = Array.from({ length: 140 }, () => [r() * 1024, r() * 1024]);
  // crude Voronoi by sampling: draw cell tints
  for (let y = 0; y < 1024; y += 8) for (let x = 0; x < 1024; x += 8) {
    let best = 1e9, k = 0; for (let i = 0; i < pts.length; i++) { const d = (pts[i][0] - x) ** 2 + (pts[i][1] - y) ** 2; if (d < best) { best = d; k = i; } }
    g.fillStyle = `rgba(${k % 2 ? "255,220,180" : "90,55,30"},${0.04 + (k % 5) * 0.012})`; g.fillRect(x, y, 8, 8);
  }
  g.strokeStyle = "rgba(55,30,15,0.85)"; g.lineCap = "round";
  for (const [x, y] of pts) { // cracks from each seed to 3 nearest
    const near = pts.map((p, i) => [i, (p[0] - x) ** 2 + (p[1] - y) ** 2] as const).sort((a, b) => a[1] - b[1]).slice(1, 4);
    for (const [i] of near) { g.lineWidth = 2 + r() * 3; g.beginPath(); g.moveTo(x, y); const mx = (x + pts[i][0]) / 2 + (r() - 0.5) * 20, my = (y + pts[i][1]) / 2 + (r() - 0.5) * 20; g.quadraticCurveTo(mx, my, pts[i][0], pts[i][1]); g.stroke(); }
  }
}, 32), 3, 6);

/** Weathered grey granite ashlar blocks (for the bridge). */
export const graniteTex = () => tex(cnv(1024, 1024, (g, r) => {
  g.fillStyle = "#a59c90"; g.fillRect(0, 0, 1024, 1024);
  const rows = 12, rh = 1024 / rows;
  for (let j = 0; j < rows; j++) {
    let x = j % 2 ? -60 : 0;
    while (x < 1024) {
      const w = 110 + r() * 90, l = 52 + r() * 14, hue = 30 + r() * 15;
      g.fillStyle = `hsl(${hue},${8 + r() * 8}%,${l}%)`; g.fillRect(x, j * rh, w, rh);
      for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "30,25,20"},${0.06 + r() * 0.1})`; g.fillRect(x + r() * w, j * rh + r() * rh, 2, 2); }
      const gr = g.createLinearGradient(0, j * rh, 0, (j + 1) * rh); gr.addColorStop(0, "rgba(255,240,220,0.10)"); gr.addColorStop(1, "rgba(30,20,10,0.18)");
      g.fillStyle = gr; g.fillRect(x, j * rh, w, rh);
      if (r() < 0.25) { g.fillStyle = "rgba(90,70,40,0.18)"; g.beginPath(); g.ellipse(x + r() * w, j * rh + rh, 30, 18, 0, Math.PI, 0); g.fill(); } // weather stain
      g.fillStyle = "#4a4038"; g.fillRect(x, j * rh, 4, rh);
      x += w;
    }
    g.fillStyle = "#4a4038"; g.fillRect(0, j * rh, 1024, 4);
  }
}, 33), 1, 1);

/** Layered sandstone strata for mesas/buttes. */
export const strataTex = () => tex(cnv(512, 1024, (g, r) => {
  let y = 0;
  while (y < 1024) { const h = 20 + r() * 60; const l = 38 + r() * 18; g.fillStyle = `hsl(${14 + r() * 14},${45 + r() * 15}%,${l}%)`; g.fillRect(0, y, 512, h); g.fillStyle = "rgba(40,15,5,0.25)"; g.fillRect(0, y + h - 3, 512, 3); y += h; }
  for (let i = 0; i < 90; i++) { g.strokeStyle = "rgba(40,15,5,0.25)"; g.lineWidth = 1 + r() * 2; const x = r() * 512; g.beginPath(); g.moveTo(x, r() * 1024); g.lineTo(x + (r() - 0.5) * 30, r() * 1024); g.stroke(); }
}, 34), 1, 1);

/** Saguaro skin with vertical ribs and spine dots. */
export const cactusTex = () => tex(cnv(256, 256, (g, r) => {
  g.fillStyle = "#4f7a3c"; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) { g.fillStyle = "rgba(20,45,15,0.55)"; g.fillRect(x, 0, 4, 256); g.fillStyle = "rgba(170,210,120,0.25)"; g.fillRect(x + 7, 0, 3, 256); }
  for (let i = 0; i < 300; i++) { g.fillStyle = "rgba(240,230,200,0.8)"; g.fillRect(Math.floor(r() * 16) * 16 + 4, r() * 256, 2, 2); }
}, 35), 1, 2);

/** Golden-hour sky: deep blue top -> peach horizon (sky dome uses this as a vertical gradient). */
export const skyTex = () => tex(cnv(16, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#2f5f9e"); gr.addColorStop(0.45, "#6f9fd0"); gr.addColorStop(0.72, "#e9c3a0"); gr.addColorStop(0.86, "#ffb27a"); gr.addColorStop(1, "#ff9a5c");
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
}, 36), 1, 1);

export const softGlow = (inner: string, outer: string) => {
  const c = cnv(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }, 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

/** Painted cartoon cloud (soft lobes, warm underside). */
export const cloudTex = (seed: number) => {
  const c = cnv(512, 256, (g, r) => {
    for (let i = 0; i < 9; i++) {
      const x = 90 + r() * 330, y = 120 + (r() - 0.5) * 50, rad = 50 + r() * 60;
      const gr = g.createRadialGradient(x, y - rad * 0.3, rad * 0.2, x, y, rad);
      gr.addColorStop(0, "rgba(255,248,240,0.95)"); gr.addColorStop(0.7, "rgba(255,214,180,0.85)"); gr.addColorStop(1, "rgba(255,190,150,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
  }, seed);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};
