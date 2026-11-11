// short3 architecture toolkit: materials (CC0 PBR scans + painted finishes), canvas textures (in-world signs, awning
// canvas, posters), wall-with-openings builder, detailed double-hung window unit, rooms, fire escape, drainpipe.
// Everything is built into a Kit (merged per material). Face-local convention: wall face plane z = 0, outside = +z,
// wall body z in [-T, 0], x along the face, y up from grade.
import * as THREE from "three";
import { Kit } from "./kit";
import { pbr } from "./tex";
import { V3, rng } from "../../lib/math";

// ---------------------------------------------------------------- materials
const std = (color: string, rough = 0.7, metal = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
const cnv = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 1) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; draw(g, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
/** in-world sign board: painted letters on a coloured board with a lined border (no screen text) */
export const signTex = (text: string, bg: string, fg: string, w = 1024, h = 160, font = "Georgia, serif", border = "#c9a85a") => cnv(w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = border; g.lineWidth = h * 0.05; g.strokeRect(h * 0.07, h * 0.07, w - h * 0.14, h * 0.86);
  g.font = `bold ${Math.round(h * 0.56)}px ${font}`; g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
  const m = g.measureText(text).width, sx = Math.min(1, (w * 0.86) / m); g.save(); g.translate(w / 2, h * 0.54); g.scale(sx, 1); g.fillText(text, 0, 0); g.restore();
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},0.04)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 1); }
});
/** striped awning canvas (vertical stripes, faded towards the top, slight dirt) */
export const awningTex = (a: string, b: string, seed: number) => cnv(256, 256, (g, r) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 32, 0, 32, 256); }
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(255,250,235,0.18)"); gr.addColorStop(1, "rgba(40,30,20,0.12)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,240" : "30,20,10"},${r() * 0.06})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
}, seed);
/** painted "ghost sign" on a brick side wall (faded white letters) */
export const ghostTex = (l1: string, l2: string) => cnv(1024, 512, (g) => {
  g.clearRect(0, 0, 1024, 512); g.fillStyle = "rgba(240,232,210,0.55)"; g.font = "bold 150px Georgia, serif"; g.textAlign = "center"; g.fillText(l1, 512, 210);
  g.font = "bold 92px Georgia, serif"; g.fillText(l2, 512, 360); g.strokeStyle = "rgba(240,232,210,0.5)"; g.lineWidth = 10; g.strokeRect(40, 40, 944, 432);
  g.globalCompositeOperation = "destination-out"; for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.5})`; g.fillRect(Math.random() * 1024, Math.random() * 512, 6, 3); }
});
/** poster for the site hoarding */
export const posterTex = (seed: number) => cnv(256, 360, (g, r) => {
  const hue = Math.floor(r() * 360); g.fillStyle = `hsl(${hue},35%,78%)`; g.fillRect(0, 0, 256, 360);
  g.fillStyle = `hsl(${(hue + 180) % 360},45%,32%)`; g.fillRect(20, 20, 216, 150); g.fillStyle = "#f4ead2"; g.beginPath(); g.arc(128, 95, 45, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#2a2622"; g.font = "bold 44px Georgia, serif"; g.textAlign = "center"; g.fillText(["SALE", "CIRCUS", "DANCE", "COCOA", "SOAP", "RADIO"][Math.floor(r() * 6)], 128, 230);
  g.font = "24px Georgia, serif"; g.fillText(["SATURDAY", "TONIGHT", "5 CENTS", "NEW!"][Math.floor(r() * 4)], 128, 280);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,240" : "60,40,20"},${r() * 0.08})`; g.fillRect(r() * 256, r() * 360, 3, 2); }
}, seed);
/** barber pole spiral */
export const barberTex = () => cnv(64, 256, (g) => { g.fillStyle = "#f4f0e6"; g.fillRect(0, 0, 64, 256); for (let i = -4; i < 12; i++) { g.fillStyle = i % 2 ? "#b8282a" : "#24408a"; g.beginPath(); g.moveTo(0, i * 32); g.lineTo(64, i * 32 - 40); g.lineTo(64, i * 32 - 24); g.lineTo(0, i * 32 + 16); g.fill(); } });

let MATS: ReturnType<typeof makeMats> | null = null;
const makeMats = () => ({
  // masonry (CC0 scans, UVs in metres)
  brick: pbr("red_brick_03", { normal: 1.1, bright: 1.45 }),
  brickB: pbr("large_red_bricks", { normal: 1.1, color: "#e8d6c8" }),
  brickC: pbr("factory_brick", { normal: 1.1 }),
  brickD: pbr("dark_brick_wall", { normal: 1.1, color: "#d8cfc6" }),
  brickE: pbr("brick_wall_006", { normal: 1.0, scale: 0.7 }),
  sand: pbr("concrete_pavement", { color: "#fbf1de", scale: 0.42, normal: 0.8, bright: 1.38 }),          // dressed limestone (rusticated courses)
  sandTrim: pbr("concrete_pavement", { color: "#fff7e8", scale: 0.6, normal: 0.55, bright: 1.48 }),       // smooth limestone dressings
  granite: pbr("concrete_pavement", { color: "#a7a6a2", scale: 0.35, normal: 1.0, bright: 1.25 }),         // grey granite plinth
  // ground
  paving: pbr("concrete_pavement", { normal: 0.9, color: "#f2ede4", bright: 1.3 }),
  setts: pbr("concrete_pavement", { normal: 1.2, color: "#a9a59c", scale: 0.25, bright: 1.15 }),
  asphalt: pbr("asphalt_01", { normal: 0.8, color: "#e4e0da", bright: 1.2 }),
  gravel: pbr("gravel_road", { normal: 1.0 }),
  roofTar: pbr("tarred_gravel", { normal: 1.0, color: "#d0c8c0" }),
  // wood + metal
  timber: pbr("old_planks_02", { normal: 1.0, color: "#e4cdb0", scale: 0.6 }),
  timberDk: pbr("dark_wood", { normal: 0.8, scale: 0.5 }),
  rust: pbr("rusty_metal_02", { normal: 0.8, color: "#9a948e", metal: 0.4, rough: 0.9 }),
  ironPaint: pbr("rusty_painted_metal", { color: "#585450", normal: 0.6, metal: 0.3, scale: 0.5 }),
  redSteel: pbr("rusty_painted_metal", { color: "#d07a62", normal: 0.7, metal: 0.25, scale: 0.6 }),
  // interiors (fake bounce light so rooms read warm through the glass)
  floorWood: pbr("old_wood_floor", { scale: 0.4, emissive: "map", ei: 0.22 }),
  plaster: pbr("beige_wall_001", { color: "#efe2c8", scale: 0.6, emissive: "map", ei: 0.28 }),
  plasterB: pbr("beige_wall_001", { color: "#d9e2d2", scale: 0.6, emissive: "map", ei: 0.26 }),
  plasterC: pbr("beige_wall_001", { color: "#ead6c6", scale: 0.6, emissive: "map", ei: 0.26 }),
  ceiling: pbr("beige_wall_001", { color: "#f4e6cc", scale: 0.8, emissive: "map", ei: 0.24 }),
  wainscot: pbr("dark_wood", { scale: 0.4, emissive: "map", ei: 0.18 }),
  furn: pbr("dark_wood", { scale: 0.3, color: "#c79a6e", emissive: "map", ei: 0.2 }),
  // painted / plain finishes
  frameGreen: std("#24342c", 0.55), frameCream: std("#e8dfcb", 0.6), frameBrown: std("#4a3020", 0.55), frameWhite: std("#f2efe6", 0.55),
  glass: new THREE.MeshPhysicalMaterial({ color: "#d8e6ee", roughness: 0.03, metalness: 0.05, transparent: true, opacity: 0.22, envMapIntensity: 1.6, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.02 }),
  glassDark: new THREE.MeshPhysicalMaterial({ color: "#3a4650", roughness: 0.06, metalness: 0.2, envMapIntensity: 1.3, clearcoat: 1 }),
  frosted: new THREE.MeshStandardMaterial({ color: "#e9eef0", roughness: 0.4, transparent: true, opacity: 0.55, emissive: new THREE.Color("#fff2dc"), emissiveIntensity: 0.25, depthWrite: false }),
  blind: std("#e9dcbb", 0.9, 0, { side: THREE.DoubleSide, emissive: new THREE.Color("#ffe4b8"), emissiveIntensity: 0.12 }),
  blindGreen: std("#5f7a5a", 0.9, 0, { side: THREE.DoubleSide, emissive: new THREE.Color("#c8e0b0"), emissiveIntensity: 0.06 }),
  curtain: std("#a8423a", 0.95, 0, { side: THREE.DoubleSide, emissive: new THREE.Color("#ff9070"), emissiveIntensity: 0.08 }),
  curtainB: std("#c9b36a", 0.95, 0, { side: THREE.DoubleSide, emissive: new THREE.Color("#ffe090"), emissiveIntensity: 0.08 }),
  bronze: std("#6e4c2a", 0.32, 0.85), brass: std("#c49a42", 0.28, 0.9), castIron: std("#26292a", 0.55, 0.5), black: std("#151516", 0.5, 0.2),
  chrome: std("#e9edf0", 0.1, 1), rubber: std("#1c1c1e", 0.85), copperGreen: std("#5f8a78", 0.6, 0.3),
  lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.85, 1.35), toneMapped: false }),
  lampDim: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.1, 0.8), toneMapped: false }),
  red: std("#b3241e", 0.5, 0.1), green: std("#2f5a3a", 0.6), cream: std("#efe6cf", 0.7), paper: std("#f1e9d6", 0.9, 0, { emissive: new THREE.Color("#fff3dc"), emissiveIntensity: 0.12 }),
  canvasTarp: std("#b9a77f", 0.95),
});
/** shared architectural materials (call only after useTexReady() is true) */
export const archMats = () => (MATS ??= makeMats());
export type AM = ReturnType<typeof makeMats>;

// ---------------------------------------------------------------- walls with rectangular openings
export type Rect = { x0: number; x1: number; y0: number; y1: number };
/** solid wall x0..x1, y0..y1, depth zb..zf, minus the rects (holes run through). Built from butting boxes (no overlap). */
export const wallRect = (k: Kit, mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, zb: number, zf: number, holes: Rect[] = [], opt: { ink?: number | false } = {}) => {
  const hs = holes.filter((h) => h.y1 > y0 && h.y0 < y1 && h.x1 > x0 && h.x0 < x1);
  const ys = [...new Set([y0, y1, ...hs.flatMap((h) => [Math.max(y0, h.y0), Math.min(y1, h.y1)])])].sort((a, b) => a - b);
  for (let i = 0; i < ys.length - 1; i++) {
    const ya = ys[i], yb = ys[i + 1]; if (yb - ya < 1e-4) continue;
    const cut = hs.filter((h) => h.y0 <= ya + 1e-6 && h.y1 >= yb - 1e-6).map((h) => [Math.max(x0, h.x0), Math.min(x1, h.x1)] as [number, number]).sort((a, b) => a[0] - b[0]);
    let x = x0; for (const [a, b] of cut) { if (a - x > 1e-4) k.span(mat, [x, ya, zb], [a, yb, zf], opt); x = Math.max(x, b); }
    if (x1 - x > 1e-4) k.span(mat, [x, ya, zb], [x1, yb, zf], opt);
  }
};
/** rusticated ashlar: courses of height ch with recessed joints (dz), same holes */
export const rusticated = (k: Kit, mat: THREE.Material, x0: number, x1: number, y0: number, y1: number, zb: number, zf: number, holes: Rect[], ch = 0.5, joint = 0.05, dz = 0.03) => {
  for (let y = y0; y < y1 - 1e-4; y += ch) { const ya = y, yb = Math.min(y1, y + ch - joint); wallRect(k, mat, x0, x1, ya, yb, zb, zf, holes, { ink: false }); if (yb < Math.min(y1, y + ch)) wallRect(k, mat, x0, x1, yb, Math.min(y1, y + ch), zb, zf - dz, holes, { ink: false }); }
};

// ---------------------------------------------------------------- windows
export type WinStyle = { frame: THREE.Material; panes: 1 | 2 | 3; blind: number; blindMat?: THREE.Material; open: number; curtain?: THREE.Material; dark?: boolean };
/** detailed double-hung window in an opening (cx, y0 = opening bottom, w x h) of a wall whose face is z = 0 */
export const windowUnit = (k: Kit, M: AM, cx: number, y0: number, w: number, h: number, s: WinStyle, depth = 0.17) => {
  const zf = -depth, F = s.frame, xa = cx - w / 2, xb = cx + w / 2;
  // outer frame (jambs + head + sub-sill) sits inside the reveal, 1 cm clear of the reveal faces
  k.span(F, [xa + 0.01, y0 + 0.02, zf - 0.06], [xa + 0.09, y0 + h - 0.01, zf + 0.05]); k.span(F, [xb - 0.09, y0 + 0.02, zf - 0.06], [xb - 0.01, y0 + h - 0.01, zf + 0.05]);
  k.span(F, [xa + 0.01, y0 + h - 0.1, zf - 0.06], [xb - 0.01, y0 + h - 0.01, zf + 0.05]);
  k.span(F, [xa + 0.01, y0 + 0.02, zf - 0.06], [xb - 0.01, y0 + 0.08, zf + 0.07]);
  const iw = w - 0.18, x0 = cx - iw / 2, ya = y0 + 0.08, yt = y0 + h - 0.1, ih = yt - ya, half = ih / 2;
  const sash = (yb0: number, yb1: number, z: number) => {
    k.span(F, [x0, yb0, z - 0.022], [x0 + 0.05, yb1, z + 0.022]); k.span(F, [x0 + iw - 0.05, yb0, z - 0.022], [x0 + iw, yb1, z + 0.022]);
    k.span(F, [x0 + 0.05, yb1 - 0.05, z - 0.022], [x0 + iw - 0.05, yb1, z + 0.022]); k.span(F, [x0 + 0.05, yb0, z - 0.022], [x0 + iw - 0.05, yb0 + 0.065, z + 0.022]);
    for (let p = 1; p < s.panes; p++) { const x = x0 + (iw * p) / s.panes; k.span(F, [x - 0.013, yb0 + 0.065, z - 0.014], [x + 0.013, yb1 - 0.05, z + 0.014]); }
    k.plane(s.dark ? M.glassDark : M.glass, iw - 0.1, yb1 - yb0 - 0.115, [cx, (yb0 + 0.065 + yb1 - 0.05) / 2, z], [0, 0, 0]);
  };
  const lift = s.open * half * 0.85;
  sash(ya + half - 0.02, yt, zf + 0.025);                      // upper sash (outer track)
  sash(ya + lift, ya + lift + half + 0.02, zf - 0.025);        // lower sash (inner track), raised when open
  // meeting-rail sash lock
  if (s.open < 0.05) k.span(M.brass, [cx - 0.04, ya + half - 0.005, zf - 0.05], [cx + 0.04, ya + half + 0.02, zf - 0.045], { ink: false });
  // roller blind (cloth down to `blind`) + pull ring, or curtains
  if (s.blind > 0.02) { const bl = Math.min(0.95, s.blind) * ih; k.plane(s.blindMat ?? M.blind, iw - 0.04, bl, [cx, yt - bl / 2, zf - 0.075]); k.span(M.timberDk, [x0 + 0.02, yt - bl - 0.03, zf - 0.09], [x0 + iw - 0.02, yt - bl, zf - 0.07], { ink: false }); k.torus(M.brass, 0.025, 0.006, [cx, yt - bl - 0.06, zf - 0.08], [0, 0, 0], Math.PI * 2, { ink: false }); }
  if (s.curtain) for (const sd of [-1, 1]) k.plane(s.curtain, iw * 0.22, ih * 0.98, [cx + sd * iw * 0.38, ya + ih / 2, zf - 0.11]);
};

// ---------------------------------------------------------------- rooms (seen through windows)
/** one office bay: floor, ceiling, back wall with wainscot + picture rail, furniture. Local: window wall at z = 0, room depth D into -z. */
export const officeBay = (k: Kit, M: AM, x0: number, x1: number, y: number, H: number, D: number, seed: number, opts: { partitionL?: boolean; back?: boolean; wall?: THREE.Material } = {}) => {
  const r = rng(seed), cx = (x0 + x1) / 2, wallM = opts.wall ?? [M.plaster, M.plasterB, M.plasterC][Math.floor(r() * 3)];
  k.span(M.floorWood, [x0, y - 0.05, -D], [x1, y + 0.02, -0.02], { ink: false });
  k.span(M.ceiling, [x0, y + H - 0.32, -D], [x1, y + H - 0.3, -0.02], { ink: false });
  if (opts.back !== false) { k.span(wallM, [x0, y + 0.02, -D - 0.1], [x1, y + H - 0.32, -D], { ink: false }); k.span(M.wainscot, [x0, y + 0.02, -D], [x1, y + 1.0, -D + 0.03], { ink: false }); k.span(M.wainscot, [x0, y + 2.35, -D], [x1, y + 2.4, -D + 0.025], { ink: false }); }
  // glazed office partition (wood dado + frosted glass) on the left edge
  if (opts.partitionL) { k.span(M.wainscot, [x0, y + 0.02, -D], [x0 + 0.06, y + 1.05, -0.35], { ink: false }); k.span(M.wainscot, [x0, y + 1.05, -D], [x0 + 0.06, y + 1.12, -0.35], { ink: false }); k.plane(M.frosted, D - 0.35, H - 1.5, [x0 + 0.03, y + 1.12 + (H - 1.5) / 2, -(D + 0.35) / 2], [0, Math.PI / 2, 0]); k.span(M.wainscot, [x0, y + H - 0.4, -D], [x0 + 0.06, y + H - 0.32, -0.35], { ink: false }); }
  // pendant light
  k.rod(M.black, [cx, y + H - 0.32, -D * 0.5], [cx, y + H - 0.85, -D * 0.5], 0.008, 6, { ink: false }); k.sphere(M.lamp, 0.13, [cx, y + H - 0.95, -D * 0.5], [1, 0.8, 1], { ink: false });
  // furniture
  const deskX = cx + (r() - 0.5) * (x1 - x0 - 1.4) * 0.5, dz = -D * (0.5 + r() * 0.15);
  k.span(M.furn, [deskX - 0.65, y + 0.72, dz - 0.38], [deskX + 0.65, y + 0.77, dz + 0.38], { ink: false });
  k.span(M.furn, [deskX - 0.62, y + 0.02, dz - 0.35], [deskX - 0.2, y + 0.72, dz + 0.33], { ink: false });
  k.span(M.furn, [deskX + 0.55, y + 0.02, dz - 0.35], [deskX + 0.6, y + 0.72, dz + 0.33], { ink: false });
  const item = r();
  if (item < 0.4) { k.span(M.black, [deskX - 0.18, y + 0.77, dz - 0.15], [deskX + 0.18, y + 0.92, dz + 0.12], { ink: false }); k.span(M.paper, [deskX - 0.12, y + 0.9, dz - 0.16], [deskX + 0.12, y + 1.08, dz - 0.14], { ink: false }); }   // typewriter + sheet
  else if (item < 0.75) { k.cyl(M.black, 0.07, 0.09, 0.05, [deskX + 0.3, y + 0.8, dz], [0, 0, 0], 12, { ink: false }); k.span(M.black, [deskX + 0.2, y + 0.86, dz - 0.03], [deskX + 0.4, y + 0.9, dz + 0.03], { ink: false }); }                 // desk telephone
  else { k.span(M.paper, [deskX - 0.3, y + 0.77, dz - 0.2], [deskX + 0.1, y + 0.83, dz + 0.1], { ink: false }); }                                                                                                         // ledgers
  k.cyl(M.green, 0.05, 0.12, 0.09, [deskX - 0.4, y + 1.12, dz - 0.2], [0, 0, 0], 12, { ink: false }); k.rod(M.brass, [deskX - 0.4, y + 0.77, dz - 0.2], [deskX - 0.4, y + 1.08, dz - 0.2], 0.01, 6, { ink: false }); k.sphere(M.lampDim, 0.035, [deskX - 0.4, y + 1.07, dz - 0.2], [1, 1, 1], { ink: false });
  // chair
  const chx = deskX + 0.05, chz = dz + 0.65; k.span(M.furn, [chx - 0.22, y + 0.45, chz - 0.2], [chx + 0.22, y + 0.5, chz + 0.2], { ink: false }); k.span(M.furn, [chx - 0.22, y + 0.5, chz + 0.17], [chx + 0.22, y + 0.95, chz + 0.21], { ink: false });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.span(M.furn, [chx + a * 0.19 - 0.02, y + 0.02, chz + b * 0.17 - 0.02], [chx + a * 0.19 + 0.02, y + 0.45, chz + b * 0.17 + 0.02], { ink: false });
  // filing cabinet or bookcase against the back wall, wall clock / picture
  if (r() < 0.6) { const fx = x0 + 0.5 + r() * (x1 - x0 - 1.2); k.span(M.furn, [fx - 0.25, y + 0.02, -D + 0.02], [fx + 0.25, y + 1.35, -D + 0.62], { ink: false }); for (let d = 0; d < 4; d++) k.span(M.brass, [fx - 0.06, y + 0.25 + d * 0.32, -D + 0.62], [fx + 0.06, y + 0.28 + d * 0.32, -D + 0.64], { ink: false }); }
  else { const fx = x0 + 0.6 + r() * (x1 - x0 - 1.4); k.span(M.furn, [fx - 0.5, y + 0.02, -D + 0.02], [fx + 0.5, y + 1.9, -D + 0.38], { ink: false }); for (let s = 0; s < 5; s++) for (let b = 0; b < 7; b++) { const c = [M.red, M.green, M.frameBrown, M.cream][(s + b * 3 + seed) % 4]; k.span(c, [fx - 0.46 + b * 0.13, y + 0.06 + s * 0.37, -D + 0.08], [fx - 0.36 + b * 0.13, y + 0.32 + s * 0.37, -D + 0.34], { ink: false }); } }
  if (r() < 0.5) { k.cyl(M.cream, 0.17, 0.17, 0.03, [x1 - 0.7, y + 2.65, -D + 0.02], [Math.PI / 2, 0, 0], 16, { ink: false }); k.torus(M.frameBrown, 0.17, 0.02, [x1 - 0.7, y + 2.65, -D + 0.04], [0, 0, 0], Math.PI * 2, { ink: false }); }
  else { k.span(M.frameBrown, [cx - 0.35, y + 1.55, -D + 0.01], [cx + 0.35, y + 2.05, -D + 0.04], { ink: false }); k.span([M.plasterB, M.curtainB, M.green][Math.floor(r() * 3)], [cx - 0.3, y + 1.6, -D + 0.04], [cx + 0.3, y + 2.0, -D + 0.05], { ink: false }); }
};

// ---------------------------------------------------------------- iron fire escape (face-local; platforms in front of window columns)
export const fireEscape = (k: Kit, M: AM, xa: number, xb: number, floorsY: number[], depth = 1.15) => {
  const I = M.ironPaint;
  floorsY.forEach((y, i) => {
    // grating platform: frame + slats
    k.span(I, [xa, y - 0.06, 0.04], [xb, y, 0.08]); k.span(I, [xa, y - 0.06, depth - 0.04], [xb, y, depth]);
    for (let x = xa; x <= xb + 1e-3; x += (xb - xa) / Math.round((xb - xa) / 0.6)) k.span(I, [x - 0.02, y - 0.06, 0.08], [x + 0.02, y - 0.01, depth - 0.04]);
    for (let z = 0.16; z < depth - 0.05; z += 0.075) k.span(I, [xa + 0.02, y - 0.03, z - 0.012], [xb - 0.02, y - 0.005, z + 0.012], { ink: false });
    // railing: top rail, mid rail, balusters
    k.span(I, [xa, y + 0.98, depth - 0.03], [xb, y + 1.02, depth + 0.01]); k.span(I, [xa, y + 0.5, depth - 0.025], [xb, y + 0.53, depth]);
    for (const x of [xa, xb]) k.span(I, [x - 0.02, y + 0.98, 0.08], [x + 0.02, y + 1.02, depth]);
    for (let x = xa; x <= xb + 1e-3; x += 0.13) k.rod(I, [x, y, depth - 0.015], [x, y + 0.98, depth - 0.015], 0.008, 5, { ink: false });
    for (const x of [xa, xb]) for (let z = 0.2; z < depth; z += 0.13) k.rod(I, [x, y, z], [x, y + 0.98, z], 0.008, 5, { ink: false });
    // brackets under the platform into the wall
    for (const x of [xa + 0.2, (xa + xb) / 2, xb - 0.2]) k.rod(I, [x, y - 0.75, 0.02], [x, y - 0.06, depth - 0.1], 0.02, 6);
    // stair to the next platform (alternating direction), with treads + handrail
    if (i < floorsY.length - 1) {
      const y1 = floorsY[i + 1], dir = i % 2 ? 1 : -1, xs = dir > 0 ? xa + 0.25 : xb - 0.25, xe = xs + dir * Math.min(3.0, (xb - xa) * 0.62), zc = depth * 0.55;
      for (const zz of [zc - 0.32, zc + 0.32]) k.rod(I, [xs, y, zz], [xe, y1, zz], 0.025, 6);
      const n = Math.round((y1 - y) / 0.22); for (let s = 1; s < n; s++) { const t = s / n; k.span(I, [xs + (xe - xs) * t - 0.1, y + (y1 - y) * t - 0.015, zc - 0.32], [xs + (xe - xs) * t + 0.1, y + (y1 - y) * t + 0.01, zc + 0.32], { ink: false }); }
      k.rod(I, [xs, y + 0.9, zc + 0.36], [xe, y1 + 0.9, zc + 0.36], 0.015, 6, { ink: false });
    }
  });
  // drop ladder below the lowest platform (raised, counterweighted)
  const y0 = floorsY[0], lx = xb - 0.6; for (const x of [lx - 0.22, lx + 0.22]) k.rod(I, [x, y0 - 2.4, depth - 0.2], [x, y0 + 0.2, depth - 0.2], 0.018, 6);
  for (let y = y0 - 2.3; y < y0; y += 0.3) k.rod(I, [lx - 0.22, y, depth - 0.2], [lx + 0.22, y, depth - 0.2], 0.012, 5, { ink: false });
};

// ---------------------------------------------------------------- cast-iron downpipe with hopper head, brackets, shoe
export const downpipe = (k: Kit, M: AM, x: number, yTop: number, z = 0.11) => {
  k.cyl(M.castIron, 0.065, 0.065, yTop - 0.4, [x, (yTop + 0.2) / 2 + 0.02, z], [0, 0, 0], 10);
  k.span(M.castIron, [x - 0.2, yTop - 0.35, z - 0.12], [x + 0.2, yTop, z + 0.16]); k.span(M.castIron, [x - 0.24, yTop - 0.05, z - 0.12], [x + 0.24, yTop + 0.03, z + 0.2]);
  for (let y = 1.2; y < yTop - 0.6; y += 2.4) k.span(M.castIron, [x - 0.09, y, z - 0.11], [x + 0.09, y + 0.07, z + 0.08]);
  k.cyl(M.castIron, 0.065, 0.075, 0.35, [x, 0.36, z + 0.12], [Math.PI / 4, 0, 0], 10);
};

/** generic seeded variation helpers */
export const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];
export type { V3 };
