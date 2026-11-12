// joralemon materials: reuses short3's CC0 scans + finishes (archMats) and adds the Brooklyn Heights palette:
// brownstone, black-painted vent joinery + black glass (with sky reflections), painted doors, wallpaper, lace curtains,
// bluestone sidewalk flags, soil strata for the underground cutaway, machinery paints, the blue "design preview" ghost.
import * as THREE from "three";
import { archMats } from "../short3/archKit";
import { pbr } from "../short3/tex";
import { rng } from "../../lib/math";

const std = (color: string, rough = 0.7, metal = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const cnv = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 1, repeat = true) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; draw(g, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
/** damask-style wallpaper (UVs in metres -> tile 0.53 m) */
const wallpaper = (bg: string, fg: string, seed: number) => { const t = cnv(256, 256, (g, r) => {
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256); g.strokeStyle = fg; g.fillStyle = fg; g.lineWidth = 3;
  for (const [cx, cy] of [[64, 64], [192, 192]]) { g.beginPath(); g.ellipse(cx, cy, 26, 42, 0, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.ellipse(cx, cy, 9, 16, 0, 0, Math.PI * 2); g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx, cy - 46); g.quadraticCurveTo(cx + s * 40, cy - 60, cx + s * 30, cy - 20); g.stroke(); } }
  for (let x = 0; x < 256; x += 32) { g.fillStyle = fg; g.globalAlpha = 0.25; g.fillRect(x, 0, 2, 256); g.globalAlpha = 1; }
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,250,230" : "60,40,20"},0.04)`; g.fillRect(r() * 256, r() * 256, 2, 2); }
}, seed); t.repeat.set(1 / 0.53, 1 / 0.53); return t; };
/** lace curtain (alpha) */
const lace = () => cnv(128, 256, (g) => { g.clearRect(0, 0, 128, 256); g.fillStyle = "rgba(250,246,236,0.78)"; g.fillRect(0, 0, 128, 256);
  g.globalCompositeOperation = "destination-out"; for (let y = 8; y < 256; y += 16) for (let x = 8; x < 128; x += 16) { g.beginPath(); g.arc(x + ((y / 16) % 2) * 8, y, 4.5, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = "source-over"; g.strokeStyle = "rgba(255,255,250,0.9)"; g.lineWidth = 2; for (let x = 0; x < 128; x += 21) { g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 6, 128, x, 256); g.stroke(); } }, 3, false);
/** soil strata for the cutaway section faces: topsoil, fill, glacial till with boulders, sand, grey rock (UV metres; v = depth) */
const strata = () => { const t = cnv(512, 1024, (g, r) => {
  const bands: [number, string][] = [[0, "#4a3626"], [0.06, "#6b4a32"], [0.2, "#8a6a48"], [0.45, "#9c8662"], [0.62, "#7d7466"], [0.8, "#5f6066"], [1, "#55565c"]];
  const gr = g.createLinearGradient(0, 0, 0, 1024); for (const [s, c] of bands) gr.addColorStop(s, c); g.fillStyle = gr; g.fillRect(0, 0, 512, 1024);
  for (let i = 0; i < 26000; i++) { const y = r() * 1024; g.fillStyle = `rgba(${r() < 0.5 ? "255,240,210" : "30,20,10"},${0.05 + r() * 0.1})`; g.fillRect(r() * 512, y, 1 + r() * 3, 1 + r() * 2); }
  for (let i = 0; i < 90; i++) { const x = r() * 512, y = 260 + r() * 520, s = 1.5 + r() * 3; const v = 120 + r() * 25; g.fillStyle = `rgb(${v},${v - 6},${v - 12})`; g.beginPath(); g.ellipse(x, y, s, s * 0.7, r() * 3, 0, Math.PI * 2); g.fill(); g.strokeStyle = "rgba(20,15,10,0.45)"; g.lineWidth = 1; g.stroke(); }
  for (let k = 0; k < 7; k++) { const y0 = [60, 200, 330, 460, 640, 820, 930][k]; g.strokeStyle = "rgba(30,22,14,0.35)"; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= 512; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.02 + k) * 8 + Math.sin(x * 0.07 + k * 2) * 3); g.stroke(); }
}, 9); t.wrapT = THREE.ClampToEdgeWrapping; return t; };

let MATS: ReturnType<typeof make> | null = null;
const make = () => { const A = archMats();
  return { ...A,
    brownstone: pbr("concrete_pavement", { color: "#b08670", scale: 0.45, normal: 0.9, bright: 1.22 }),
    brownstoneSm: pbr("concrete_pavement", { color: "#b89078", scale: 0.7, normal: 0.6, bright: 1.25 }),
    bluestone: pbr("concrete_pavement", { color: "#c8ccd2", scale: 0.85, normal: 1.0, bright: 1.12 }),
    brickRed: pbr("red_brick_03", { normal: 1.1, bright: 1.35 }),
    brickWarm: pbr("large_red_bricks", { normal: 1.1, color: "#f0d2c0" }),
    brickDeep: pbr("dark_brick_wall", { normal: 1.1, color: "#e8c8b8" }),
    brickBrown: pbr("brick_wall_006", { normal: 1.0, scale: 0.7, color: "#d8b8a0" }),
    // No. 58 today: everything black, glass permanently shut (glossy black, sky reflections from the environment map)
    ventBlack: std("#121214", 0.42, 0.25), ventSteel: std("#18191b", 0.5, 0.6),
    glassBlack: new THREE.MeshPhysicalMaterial({ color: "#07080a", roughness: 0.05, metalness: 0.1, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.03 }),
    // painted joinery of the homes
    sashWhite: std("#f1ece0", 0.55), sashCream: std("#e6dcc4", 0.6), sashGreen: std("#2c3d32", 0.55), sashBlack: std("#202022", 0.5),
    doorGreen: std("#24402f", 0.45), doorRed: std("#6e1f1a", 0.45), doorBrown: std("#4a2e1c", 0.4), doorBlue: std("#22324a", 0.45),
    corniceCream: std("#e8e0cc", 0.65), corniceBrown: std("#4a3426", 0.6), corniceGrey: std("#7d7a72", 0.6),
    wrought: std("#1a1a1b", 0.45, 0.55),
    lace: new THREE.MeshStandardMaterial({ map: lace(), transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false, emissive: new THREE.Color("#fff4dc"), emissiveIntensity: 0.18 }),
    drapeRed: std("#7a2a24", 0.95, 0, { side: THREE.DoubleSide }), drapeGreen: std("#3e5a3a", 0.95, 0, { side: THREE.DoubleSide }), drapeGold: std("#b48a3a", 0.9, 0, { side: THREE.DoubleSide }),
    paperA: new THREE.MeshStandardMaterial({ map: wallpaper("#6e2a2a", "#8e4a3a", 1), roughness: 0.9, emissive: new THREE.Color("#ffd9b0"), emissiveIntensity: 0.12, emissiveMap: null }),
    paperB: new THREE.MeshStandardMaterial({ map: wallpaper("#3c5a48", "#56785e", 2), roughness: 0.9, emissive: new THREE.Color("#ffd9b0"), emissiveIntensity: 0.1 }),
    paperC: new THREE.MeshStandardMaterial({ map: wallpaper("#c9b48a", "#a8915f", 3), roughness: 0.9, emissive: new THREE.Color("#ffe4c0"), emissiveIntensity: 0.12 }),
    roomLamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.6, 1.1), toneMapped: false }),
    strata: new THREE.MeshStandardMaterial({ map: strata(), roughness: 1, color: "#ffffff" }),
    // machinery
    machGrey: std("#7d858a", 0.5, 0.55), machGreen: std("#3f6a5a", 0.55, 0.35), machYellow: std("#d8a52a", 0.55, 0.2), machDark: std("#2a2e31", 0.6, 0.5),
    galv: std("#a9b0b4", 0.38, 0.85), cabinet: std("#8a9a8e", 0.5, 0.3), safety: std("#e0b020", 0.5, 0.1), grate: std("#3a3d40", 0.55, 0.7),
    tunnelIron: std("#7a7068", 0.62, 0.45), concrete: pbr("concrete_pavement", { color: "#b8b4ac", scale: 0.6, normal: 0.8 }), ballast: pbr("gravel_road", { color: "#9a948c", normal: 1.0 }),
    trainSilver: std("#c9cdd2", 0.28, 0.85), trainWood: std("#5e2e1e", 0.5, 0.05), trainGreen: std("#2e4a36", 0.5, 0.1),
    signalRed: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.3, 0.2), toneMapped: false }),
    cageLamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.3, 1.7), toneMapped: false }),
    ghost: new THREE.MeshBasicMaterial({ color: "#6ab4ff", transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false }),
    ghostLine: new THREE.MeshBasicMaterial({ color: "#bfe3ff", transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }),
    leafA: std("#4f7a36", 0.85), leafB: std("#6a8f3e", 0.85), bark: std("#8a8274", 0.9),
    soilTop: std("#4a3a2a", 1),
    carGlass: new THREE.MeshPhysicalMaterial({ color: "#1d2630", roughness: 0.06, metalness: 0.1, envMapIntensity: 1.8, clearcoat: 1, transparent: true, opacity: 0.88 }),
    tyre: std("#1b1b1d", 0.9), rim: std("#b8bcc0", 0.3, 0.9), plastic: std("#26272a", 0.6), headlight: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.55, 1.4), toneMapped: false }),
    tail: std("#7a1414", 0.3, 0.1, { emissive: new THREE.Color("#ff2a1a"), emissiveIntensity: 0.25 }),
  };
};
export const jMats = () => (MATS ??= make());
export type JM = ReturnType<typeof make>;
const PAINT = new Map<string, THREE.MeshPhysicalMaterial>();
/** glossy car paint (clearcoat) */
export const carPaint = (c: string) => { let m = PAINT.get(c); if (!m) { m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 }); PAINT.set(c, m); } return m; };
