// flight materials: aircraft paint (white / navy / teal, gently weathered), glass, rubber, metal, prop finishes, cabin
// trim (leatherette liner, blue bench fabric, carpet), cockpit panel with drawn gauges, airfield buildings (harl,
// slate, corrugated steel), and the loader for the extra CC0 ground scans (grass / coast / rock) used by the terrain.
import * as THREE from "three";
import { continueRender, delayRender, staticFile } from "remotion";
import { useEffect, useState } from "react";
import { rng } from "../../lib/math";

export const cnv = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 1, srgb = true, repeat = true) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; draw(g, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};

// ---------------------------------------------------------------- image loading (ground scans + generated terrain textures)
const IMG = new Map<string, HTMLImageElement>();
const BIN = new Map<string, Float32Array>();
export const SCANS = { grass: "aerial_grass_rock", coast: "coast_sand_rocks_02", rock: "rocky_terrain_02" } as const;
const IMAGES = [
  ...Object.values(SCANS).flatMap((n) => ["diff", "nor_gl"].map((m) => `tex/${n}_${m}.jpg`)),
  ...["outer", "mid", "wry", "ppw"].flatMap((l) => [`flight/ground_${l}.png`, `flight/shore_${l}.png`]),
];
const BINS = ["outer", "mid", "wry", "ppw"].map((l) => `flight/terrain_${l}.bin`);
let loading: Promise<void> | null = null;
const loadAll = () => loading ??= Promise.all([
  ...IMAGES.map((p) => new Promise<void>((res, rej) => { const im = new Image(); im.onload = () => { IMG.set(p, im); res(); }; im.onerror = () => rej(new Error(p)); im.src = staticFile(p); })),
  ...BINS.map((p) => fetch(staticFile(p)).then((r) => r.arrayBuffer()).then((b) => { BIN.set(p, new Float32Array(b)); })),
]).then(() => undefined);
export const useFlightReady = () => {
  const [ready, set] = useState(IMG.size === IMAGES.length && BIN.size === BINS.length);
  useEffect(() => { if (ready) return; const h = delayRender("flight assets", { timeoutInMilliseconds: 240000 }); loadAll().then(() => { set(true); continueRender(h); }); }, [ready]);
  return ready;
};
export const img = (p: string) => { const im = IMG.get(p); if (!im) throw new Error(`not loaded: ${p}`); return im; };
export const heights = (lvl: string) => { const b = BIN.get(`flight/terrain_${lvl}.bin`); if (!b) throw new Error(`not loaded: ${lvl}`); return b; };
const TX = new Map<string, THREE.Texture>();
export const imgTex = (p: string, srgb = true, repeat = false) => {
  let t = TX.get(p); if (t) return t; t = new THREE.Texture(img(p)); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (p.startsWith("flight/")) t.flipY = false;   // generated maps: row 0 = z0 (our UV v = 0)
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; else { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; }
  t.needsUpdate = true; TX.set(p, t); return t;
};

// ---------------------------------------------------------------- aircraft
const grime = (seed: number, streak = 1) => cnv(512, 512, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${90 + r() * 40},${84 + r() * 40},${76 + r() * 30},${0.015 + r() * 0.035})`; const x = r() * 512, y = r() * 512; g.fillRect(x, y, 1 + r() * 3, 1 + r() * 3); }
  for (let i = 0; i < 70 * streak; i++) { const x = r() * 512, y = r() * 512, l = 20 + r() * 90; const gr = g.createLinearGradient(x, y, x - l, y + r() * 6); gr.addColorStop(0, `rgba(70,62,52,${0.04 + r() * 0.07})`); gr.addColorStop(1, "rgba(70,62,52,0)"); g.strokeStyle = gr; g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x - l, y + (r() - 0.5) * 8); g.stroke(); }
  // faint rivet rows (every ~40 px = ~0.23 m at 3 m/tile)
  for (let y = 18; y < 512; y += 43) for (let x = 0; x < 512; x += 9) { g.fillStyle = "rgba(60,60,60,0.07)"; g.fillRect(x, y, 2, 2); }
}, seed);
const paint = (color: string, seed: number, rough = 0.36, cc = 0.35) => {
  const t = grime(seed); t.repeat.set(1 / 3, 1 / 3);
  return new THREE.MeshPhysicalMaterial({ color, map: t, roughness: rough, metalness: 0.05, clearcoat: cc, clearcoatRoughness: 0.25, envMapIntensity: 0.9 });
};
const std = (color: string, rough = 0.6, metal = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });

/** prop disc: soft blurred blade sweep + a faint tip ring (alpha), seen when the prop is at speed */
const propDiscTex = () => cnv(256, 256, (g) => {
  g.clearRect(0, 0, 256, 256); const c = 128;
  const gr = g.createRadialGradient(c, c, 14, c, c, 127); gr.addColorStop(0, "rgba(30,30,32,0.0)"); gr.addColorStop(0.15, "rgba(30,30,32,0.1)"); gr.addColorStop(0.8, "rgba(36,36,38,0.07)"); gr.addColorStop(0.9, "rgba(210,180,40,0.09)"); gr.addColorStop(0.96, "rgba(230,230,220,0.05)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(c, c, 127, 0, Math.PI * 2); g.fill();
}, 3, true, false);

/** cockpit panel face: two flight-instrument six-packs + engine gauges + radio stack (drawn) */
const panelTex = () => cnv(1024, 256, (g, r) => {
  g.fillStyle = "#1c1d20"; g.fillRect(0, 0, 1024, 256);
  const gauge = (x: number, y: number, rad: number, k: number) => {
    g.fillStyle = "#0b0b0c"; g.beginPath(); g.arc(x, y, rad + 4, 0, Math.PI * 2); g.fill(); g.fillStyle = "#121314"; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#e8e6df"; g.lineWidth = 2; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * rad * 0.82, y + Math.sin(a) * rad * 0.82); g.lineTo(x + Math.cos(a) * rad * 0.95, y + Math.sin(a) * rad * 0.95); g.stroke(); }
    if (k === 1) { g.fillStyle = "#4a7bb8"; g.beginPath(); g.arc(x, y, rad * 0.78, Math.PI, 0); g.fill(); g.fillStyle = "#7a5332"; g.beginPath(); g.arc(x, y, rad * 0.78, 0, Math.PI); g.fill(); g.strokeStyle = "#f2c230"; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x + 20, y); g.stroke(); }
    const a = r() * Math.PI * 2; g.strokeStyle = "#f4f2ea"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * rad * 0.75, y + Math.sin(a) * rad * 0.75); g.stroke();
  };
  for (const ox of [40, 640]) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) gauge(ox + 50 + i * 100, 70 + j * 100, 40, i === 1 && j === 0 ? 1 : 0);
  for (let i = 0; i < 4; i++) gauge(380 + (i % 2) * 70, 60 + Math.floor(i / 2) * 75, 28, 0);
  g.fillStyle = "#0e0f11"; g.fillRect(520, 20, 110, 220); for (let i = 0; i < 5; i++) { g.fillStyle = "#26282c"; g.fillRect(526, 28 + i * 42, 98, 34); g.fillStyle = "#59ff88"; g.globalAlpha = 0.65; g.fillRect(540, 40 + i * 42, 40, 10); g.globalAlpha = 1; }
}, 7, true, false);

/** woven bench fabric (navy with a fine tweed fleck) */
const fabricTex = () => { const t = cnv(256, 256, (g, r) => { g.fillStyle = "#2e3f63"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) { const v = r(); g.fillStyle = v < 0.1 ? "rgba(120,140,190,0.35)" : v < 0.2 ? "rgba(10,14,30,0.35)" : "rgba(0,0,0,0)"; g.fillRect(x, y, 2, 2); } }, 13); t.repeat.set(1 / 0.12, 1 / 0.12); return t; };
const carpetTex = () => { const t = cnv(256, 256, (g, r) => { g.fillStyle = "#4b4f57"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},0.06)`; g.fillRect(r() * 256, r() * 256, 2, 2); } }, 17); t.repeat.set(1 / 0.4, 1 / 0.4); return t; };
const linerTex = () => { const t = cnv(256, 256, (g, r) => { g.fillStyle = "#d9d1c0"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "80,70,60"},0.05)`; g.beginPath(); g.arc(r() * 256, r() * 256, 1 + r() * 1.5, 0, 6.3); g.fill(); } }, 19); t.repeat.set(1 / 0.5, 1 / 0.5); return t; };
/** fictional registration + small door placard, drawn as an alpha decal */
export const decalTex = (text: string, color = "#1d2a44", w = 512, h = 128, font = "bold 96px Arial") => cnv(w, h, (g) => { g.clearRect(0, 0, w, h); g.fillStyle = color; g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + 4); }, 1, true, false);
/** exhaust soot streak (alpha), for the nacelle sides and the wing underside */
const sootTex = () => cnv(256, 64, (g, r) => { g.clearRect(0, 0, 256, 64); for (let i = 0; i < 260; i++) { const y = 32 + (r() - 0.5) * 30 * (0.3 + (256 - (i % 256)) / 256), x = r() * 256; g.fillStyle = `rgba(30,26,22,${0.03 + r() * 0.05 * (1 - x / 300)})`; g.beginPath(); g.ellipse(x, y, 18, 3 + r() * 5, 0, 0, 6.3); g.fill(); } }, 23, true, false);

/** fuselage livery painted in the shader from the aircraft-local position (smooth, anti-aliased cheat line that sweeps
 *  up at the tail; grey belly). `off` = the geometry's offset from aircraft-local space (doors are built about their hinge). */
const LIV = new Map<string, THREE.MeshPhysicalMaterial>();
export const livery = (off: [number, number, number] = [0, 0, 0]) => {
  const key = off.join(","); let mm = LIV.get(key); if (mm) return mm;
  const t = grime(1); t.repeat.set(1 / 3, 1 / 3);
  mm = new THREE.MeshPhysicalMaterial({ color: "#ffffff", map: t, roughness: 0.36, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 0.9 });
  const U = { uOff: { value: new THREE.Vector3(...off) }, cW: { value: new THREE.Color("#f1f1ec") }, cN: { value: new THREE.Color("#1f2f52") }, cT: { value: new THREE.Color("#21a3a0") }, cB: { value: new THREE.Color("#c4c8cb") } };
  mm.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform vec3 uOff; varying vec3 vL;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvL = position + uOff;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform vec3 cW, cN, cT, cB; varying vec3 vL;
float smk(float a, float b, float x){ float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
float cheatY(float x){ return 1.04 + 0.42 * smk(-2.4, -5.4, x) - 0.12 * smk(3.2, 5.0, x); }
float yBot(float x){ if (x <= -2.7) return 0.55 + 1.02 * pow(clamp((-2.7 - x) / 2.92, 0.0, 1.0), 1.25); if (x >= 3.3) return 0.62 + 0.25 * pow(clamp((x - 3.3) / 2.05, 0.0, 1.0), 1.8); return 0.55 + 0.07 * smk(3.0, 5.0, x); }
float band(float y, float a, float b, float w){ return smoothstep(a - w, a + w, y) * (1.0 - smoothstep(b - w, b + w, y)); }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
{ float c = cheatY(vL.x), w = max(fwidth(vL.y) * 0.8, 0.002);
  vec3 col = cW; col = mix(col, cT, band(vL.y, c - 0.075, c - 0.035, w)); col = mix(col, cN, band(vL.y, c, c + 0.1, w));
  col = mix(col, cB, 1.0 - smoothstep(yBot(vL.x) + 0.16 - w, yBot(vL.x) + 0.16 + w, vL.y));
  diffuseColor.rgb *= col; }`);
  };
  mm.customProgramCacheKey = () => `livery_${key}`; LIV.set(key, mm); return mm;
};

let MATS: ReturnType<typeof make> | null = null;
const make = () => ({
  white: paint("#f1f1ec", 1), whiteDoor: paint("#efefe9", 2), navy: paint("#1f2f52", 3, 0.32, 0.45), teal: paint("#1f8a8c", 4, 0.32, 0.45), belly: paint("#c9ccce", 5, 0.45, 0.2),
  stripeTeal: paint("#21a3a0", 6, 0.32, 0.45),
  glass: new THREE.MeshPhysicalMaterial({ color: "#7d93a0", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false, side: THREE.DoubleSide }),
  rubber: std("#1d1e21", 0.8), seal: std("#2a2b2f", 0.7), gap: std("#16171a", 0.9),
  metal: std("#b9bcc0", 0.35, 0.85), darkMetal: std("#4a4d52", 0.45, 0.7), chrome: std("#dfe3e6", 0.15, 1.0),
  tire: std("#1b1b1d", 0.92), hub: std("#d2d4d6", 0.4, 0.6), strut: paint("#e9e9e4", 7, 0.4, 0.2),
  propBlack: std("#121214", 0.55, 0.2), propTip: std("#f0c419", 0.5), spinner: paint("#e8e8e3", 8, 0.3, 0.6),
  propDisc: new THREE.MeshBasicMaterial({ map: propDiscTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 1 }),
  intake: std("#0f1012", 0.9), exhaust: std("#3b3631", 0.6, 0.6),
  navRed: std("#ff2a1a", 0.3, 0, { emissive: new THREE.Color("#ff2010"), emissiveIntensity: 2.2 }), navGreen: std("#29ff6a", 0.3, 0, { emissive: new THREE.Color("#20ff60"), emissiveIntensity: 2.2 }),
  navWhite: std("#ffffff", 0.3, 0, { emissive: new THREE.Color("#ffffff"), emissiveIntensity: 2.0 }), beacon: std("#ff2a1a", 0.3, 0, { emissive: new THREE.Color("#ff1a0a"), emissiveIntensity: 0.4 }),
  strobe: std("#ffffff", 0.3, 0, { emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.3 }), lens: std("#e8eef2", 0.1, 0, { transparent: true, opacity: 0.6 }),
  liner: std("#ffffff", 0.75, 0, { map: linerTex() }), linerDark: std("#8f8778", 0.8), carpet: std("#ffffff", 0.95, 0, { map: carpetTex() }),
  fabric: std("#ffffff", 0.95, 0, { map: fabricTex() }), seatFrame: std("#33353a", 0.6, 0.4), belt: std("#5a5e66", 0.85), buckle: std("#cfd3d6", 0.25, 0.9),
  panel: std("#ffffff", 0.7, 0, { map: panelTex(), emissive: new THREE.Color("#ffffff"), emissiveMap: null, emissiveIntensity: 0 }), panelBody: std("#232428", 0.7), yoke: std("#2a2a2e", 0.5, 0.2),
  soot: new THREE.MeshBasicMaterial({ map: sootTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: "#ffffff" }),
  reg: new THREE.MeshBasicMaterial({ map: decalTex("G-TWFL"), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  // airfield + farm buildings
  harl: std("#e9e6dc", 0.92), harlShade: std("#d4d0c4", 0.95), slate: std("#545a62", 0.75, 0.05), slateDark: std("#3f444b", 0.78), stone: std("#8c877b", 0.95),
  frame: std("#f4f2ea", 0.6), doorBlue: std("#2c4a6e", 0.5), doorRed: std("#8a2b23", 0.5), winDark: std("#1d2328", 0.15, 0.2, { envMapIntensity: 1.6 }),
  corrugated: std("#7b8187", 0.55, 0.6), corrRust: std("#8d6a52", 0.75, 0.3), concrete: std("#a8a59c", 0.92), post: std("#7a6a55", 0.9), wire: std("#5d6066", 0.5, 0.6),
  windsockPole: std("#e8e8e2", 0.5, 0.3), sockOrange: std("#ff6a1a", 0.8, 0, { side: THREE.DoubleSide }), sockWhite: std("#f4f2ec", 0.8, 0, { side: THREE.DoubleSide }),
  markerWhite: std("#f2f2ee", 0.6), signBoard: std("#f4f2ea", 0.6), car: std("#7d1f22", 0.35, 0.3), carDark: std("#202226", 0.5, 0.3),
  sheepWool: std("#e7e2d4", 0.95), sheepFace: std("#24211f", 0.8), birdWhite: std("#f4f4f0", 0.7), birdGrey: std("#9aa1a8", 0.7), birdDark: std("#2c2e31", 0.7),
});
export const fMats = () => (MATS ??= make());
