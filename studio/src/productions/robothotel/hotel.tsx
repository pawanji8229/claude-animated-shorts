// ORIGINAL: the Robot Hotel building (one connected set, world metres, y up, entrance facade on z = 0, street at z > 0):
//   EXTERIOR  pavement + road, glass ground floor with automatic sliding doors, canopy + sign, tiled upper floors with
//             lit windows, planters
//   LOBBY     x -9..9, z -14..0, ceiling 5.0: marble floor, hinoki back wall with a backlit logo panel, light strips,
//             reception counter (two raptor stations), robot-workforce charging alcoves (right wall), lounge (CC0 Poly
//             Haven sofa / chairs / tables / plants), staff office door, corridor mouth
//   CORRIDOR  x 9..26, z -12.4..-10.2, ceiling 2.8: patterned carpet, oak dado, numbered doors, downlights
//   ROOM 101  x 14.5..20.5, z -18.5..-12.4: herringbone parquet, bed across the view (headboard on the west wall),
//             nightstand, desk, armchair, night window
// Static geometry is merged per material (short3 Kit). Only the sliding doors and room-101 door move.
import React from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { pm, Instances, Model } from "./assets";
import type { V3 } from "../../lib/math";

export const LOBBY = { x0: -9, x1: 9, z0: -14, z1: 0, h: 5.0 };
export const COR = { x0: 9, x1: 20, z0: -12.4, z1: -10.2, h: 2.8 };
export const ROOM = { x0: 9.6, x1: 15.6, z0: -18.5, z1: -12.4, h: 2.8 };
export const DOOR101 = { x: 12.5, w: 0.95 };
export const DESK = { x0: -4.6, x1: 1.6, z: -11.2, h: 1.08, d: 0.75 };          // reception counter (front face at z + d/2)
export const RAPTOR_AT: V3[] = [[-3.0, 0.22, -12.25], [0.0, 0.22, -12.25]];
export const RAPTOR_SCALE = 1.22;              // the two raptor receptionists
export const ALCOVES = [-2.2, -3.7, -5.2, -6.7, -8.2, -9.7].map((z) => [8.55, 0, z] as V3);   // workforce robots (face -x)
export const CONCIERGE_AT: V3 = [6.9, 0, -8.6];
export const OFFICE_DOOR: V3 = [5.2, 0, -13.9];
export const BED = { x0: 9.6, x1: 11.75, z: -15.75, w: 1.7, top: 0.58 };
export const NIGHTSTAND: V3 = [9.92, 0, -17.0];
export const DOORS = { n: [15.5, 18.4], s: [11.0, 14.5, 18.0] };                         // other room doors (north / south walls)
const T = 0.2;                                                                       // wall thickness

// ---------------------------------------------------------------- canvas textures (deterministic: no random noise)
const canvasTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => once(key, () => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });
/** original hotel logo: a friendly robot head in a rounded square */
const drawLogo = (g: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) => { g.strokeStyle = col; g.fillStyle = col; g.lineWidth = s * 0.07;
  g.beginPath(); g.roundRect(x - s / 2, y - s / 2, s, s, s * 0.22); g.stroke(); g.beginPath(); g.roundRect(x - s * 0.3, y - s * 0.2, s * 0.6, s * 0.42, s * 0.1); g.stroke();
  for (const d of [-1, 1]) { g.beginPath(); g.arc(x + d * s * 0.12, y, s * 0.055, 0, Math.PI * 2); g.fill(); } g.beginPath(); g.moveTo(x, y - s * 0.2); g.lineTo(x, y - s * 0.33); g.stroke(); g.beginPath(); g.arc(x, y - s * 0.36, s * 0.04, 0, Math.PI * 2); g.fill(); };
const signTexH = () => canvasTex("rhSign", 1024, 200, (g) => { g.fillStyle = "#14171c"; g.fillRect(0, 0, 1024, 200); drawLogo(g, 110, 100, 120, "#7fe8ff");
  g.font = "bold 104px Helvetica, Arial, sans-serif"; g.fillStyle = "#f4f2ec"; g.textBaseline = "middle"; g.fillText("ROBOT HOTEL", 200, 106); });
const logoTex = () => canvasTex("rhLogo", 512, 512, (g) => { g.fillStyle = "#000"; g.fillRect(0, 0, 512, 512); drawLogo(g, 256, 256, 300, "#bff4ff"); });
export const plateTex = (n: string) => canvasTex(`rhPlate${n}`, 256, 128, (g) => { g.fillStyle = "#2a2a2e"; g.fillRect(0, 0, 256, 128); g.font = "bold 84px Helvetica, Arial, sans-serif"; g.fillStyle = "#e8d7a8"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n, 128, 68); });
const calendarTex = () => canvasTex("rhCal", 256, 320, (g) => { g.fillStyle = "#f6f4ee"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#c3262c"; g.fillRect(0, 0, 256, 70);
  g.fillStyle = "#fff"; g.font = "bold 50px Helvetica, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("2019", 128, 38);
  g.fillStyle = "#555"; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) g.fillRect(16 + c * 33, 96 + r * 42, 22, 26); });
const nightTex = () => canvasTex("rhNight", 512, 340, (g) => { const gr = g.createLinearGradient(0, 0, 0, 340); gr.addColorStop(0, "#0a1230"); gr.addColorStop(1, "#24306a"); g.fillStyle = gr; g.fillRect(0, 0, 512, 340);
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) { const x = i * 20 + r() * 6, w = 14 + r() * 10, h = 60 + r() * 150; g.fillStyle = "#0b0e1c"; g.fillRect(x, 340 - h, w, h); for (let j = 0; j < 14; j++) if (r() < 0.35) { g.fillStyle = r() < 0.5 ? "#ffd890" : "#ffe9b8"; g.fillRect(x + 2 + r() * (w - 5), 340 - h + 4 + r() * (h - 8), 2.5, 3); } }
  g.fillStyle = "#f4f0e0"; g.beginPath(); g.arc(410, 64, 16, 0, Math.PI * 2); g.fill(); });
const streetTex = () => canvasTex("rhStreetBack", 1024, 512, (g) => { g.fillStyle = "#cfd8e0"; g.fillRect(0, 0, 1024, 512); let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 14; i++) { const x = i * 76, w = 70, h = 180 + r() * 300; g.fillStyle = ["#b8bcc4", "#a8aeb8", "#c4beb4", "#9aa2ac"][i % 4]; g.fillRect(x, 512 - h, w, h); g.fillStyle = "rgba(60,80,100,0.45)";
    for (let y = 512 - h + 14; y < 500; y += 24) for (let xx = x + 8; xx < x + w - 10; xx += 16) g.fillRect(xx, y, 9, 13); } });

// ---------------------------------------------------------------- materials
const M = {
  marble: () => once("rhStoneFloor", () => { const t = canvasTex("rhStoneTex", 512, 512, (g) => { g.fillStyle = "#e9e4da"; g.fillRect(0, 0, 512, 512);
      let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 18; i++) { g.strokeStyle = `rgba(150,140,128,${0.05 + r() * 0.08})`; g.lineWidth = 1 + r() * 2; g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 140; y += (r() - 0.3) * 90; g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 4; i++) { g.fillStyle = `rgba(255,255,255,${0.04 + 0.03 * (i % 2)})`; g.fillRect((i % 2) * 256, Math.floor(i / 2) * 256, 256, 256); }
      g.fillStyle = "#b8b0a2"; for (const q of [0, 256]) { g.fillRect(q, 0, 3, 512); g.fillRect(0, q, 512, 3); } });
    const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(1 / 2.4, 1 / 2.4); c.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({ map: c, roughness: 0.28, clearcoat: 0.35, clearcoatRoughness: 0.2 }); }), terrazzo: () => pm("terrazzo", 1.6, { tint: "#efece6" }), hinoki: () => pm("hinoki", 1.4, { tint: "#e8cfa8" }),
  cedar: () => pm("cedar", 1.2, { tint: "#c49a6a" }), parquet: () => pm("parquet", 1.2, { tint: "#d8b48a" }), plaster: () => pm("plaster", 2.2, { tint: "#ebe7df", noColor: true, rough: 0.9, normal: 0.5 }),
  plasterIn: () => pm("plaster", 2.2, { tint: "#f2efe8", side: THREE.BackSide }), carpet: () => pm("jacquard", 0.9, { tint: "#7a3a4a" }), pavers: () => pm("pavers", 1.6, { tint: "#c8c6c0" }),
  road: () => pm("pavers", 3.0, { tint: "#5a5c60" }), facade: () => pm("facade", 2.4, { tint: "#e6e2da" }), leather: () => pm("leather", 0.6, { tint: "#f4f2ee" }), velvet: () => pm("velvet", 0.8, { tint: "#2f5a6a" }),
  glass: () => once("rhGlass", () => new THREE.MeshPhysicalMaterial({ color: "#c8dce4", roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.18, envMapIntensity: 1.4, depthWrite: false })),
  frame: () => once("rhFrame", () => new THREE.MeshStandardMaterial({ color: "#2a2d33", roughness: 0.35, metalness: 0.7 })),
  steel: () => once("rhSteel", () => new THREE.MeshStandardMaterial({ color: "#b8bcc2", roughness: 0.25, metalness: 0.9 })),
  white: () => once("rhWhiteLac", () => new THREE.MeshPhysicalMaterial({ color: "#f6f5f2", roughness: 0.3, clearcoat: 0.5 })),
  strip: () => once("rhStrip", () => new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#fff4e0", emissiveIntensity: 2.4, roughness: 0.4 })),
  cyan: () => once("rhCyanStrip", () => new THREE.MeshStandardMaterial({ color: "#bff4ff", emissive: "#5fd8ff", emissiveIntensity: 1.8, roughness: 0.4 })),
  win: () => once("rhWinLit", () => new THREE.MeshStandardMaterial({ color: "#fff0d0", emissive: "#ffd9a0", emissiveIntensity: 0.55, roughness: 0.2 })),
  winDark: () => once("rhWinDark", () => new THREE.MeshStandardMaterial({ color: "#3a4a58", roughness: 0.1, metalness: 0.4 })),
  sign: () => once("rhSignM", () => new THREE.MeshStandardMaterial({ map: signTexH(), emissiveMap: signTexH(), emissive: "#ffffff", emissiveIntensity: 0.7, roughness: 0.4 })),
  logo: () => once("rhLogoM", () => new THREE.MeshStandardMaterial({ color: "#000", emissiveMap: logoTex(), emissive: "#ffffff", emissiveIntensity: 1.6, transparent: true, alphaMap: logoTex(), depthWrite: false })),
  cal: () => once("rhCalM", () => new THREE.MeshStandardMaterial({ map: calendarTex(), roughness: 0.6 })),
  night: () => once("rhNightM", () => new THREE.MeshStandardMaterial({ map: nightTex(), emissiveMap: nightTex(), emissive: "#ffffff", emissiveIntensity: 0.9, roughness: 0.2 })),
  back: () => once("rhStreetM", () => new THREE.MeshStandardMaterial({ map: streetTex(), roughness: 0.9 })),
  ceil: () => once("rhCeil", () => new THREE.MeshStandardMaterial({ color: "#f4f2ee", roughness: 0.92 })),
  door: () => pm("cedar", 0.9, { tint: "#8a6a4a" }), linen: () => once("rhLinen", () => new THREE.MeshStandardMaterial({ color: "#f4f2ec", roughness: 0.85 })),
  duvet: () => once("rhDuvet", () => new THREE.MeshStandardMaterial({ color: "#e9eef2", roughness: 0.9 })), throw: () => pm("velvet", 0.6, { tint: "#355a6e" }),
  rug: () => pm("velvet", 1.2, { tint: "#8a8478" }), black: () => once("rhBlackM", () => new THREE.MeshStandardMaterial({ color: "#1c1e22", roughness: 0.5 })),
  brass: () => once("rhBrass", () => new THREE.MeshStandardMaterial({ color: "#c9a040", roughness: 0.3, metalness: 0.9 })),
  planter: () => once("rhPlanter", () => new THREE.MeshStandardMaterial({ color: "#3a3e44", roughness: 0.6 })),
  soil: () => once("rhSoil", () => new THREE.MeshStandardMaterial({ color: "#3a2a1e", roughness: 1 })),
};

// ---------------------------------------------------------------- EXTERIOR
const exterior = () => once("rhExterior", () => { const k = new Kit();
  k.box(M.pavers(), [60, 0.15, 7], [0, -0.075 + 0.0, 3.5]); k.box(M.road(), [60, 0.12, 14], [0, -0.14, 14]);                     // pavement + road
  k.box(M.pavers(), [60, 0.2, 1.2], [0, 0.03, 7.6], [0, 0, 0], { ink: 0.4 });                                                  // kerb strip
  for (let x = -27; x < 30; x += 3) k.box(once("rhRoadLine", () => new THREE.MeshStandardMaterial({ color: "#e8e6dc", roughness: 0.6 })), [1.6, 0.01, 0.12], [x, -0.075, 14], [0, 0, 0], { ink: false });
  // facade above the glass ground floor (floors 2-4) with window bands; returns at the ends
  const F = M.facade(); k.span(F, [-16, 4.6, -T], [16, 14.2, 0.0]); k.span(F, [-16, 0, -T], [-8.3, 4.6, 0.0]); k.span(F, [8.3, 0, -T], [16, 4.6, 0.0]);
  for (let fl = 0; fl < 3; fl++) for (let i = 0; i < 9; i++) { const x = -13.6 + i * 3.4, y = 5.6 + fl * 2.9; k.box(i % 3 === 1 && fl === 1 ? M.winDark() : M.win(), [2.2, 1.6, 0.04], [x, y + 0.8, 0.03]);
    k.box(M.frame(), [2.3, 0.08, 0.12], [x, y - 0.02, 0.06]); k.box(M.frame(), [2.3, 0.06, 0.08], [x, y + 1.62, 0.04]); k.box(M.frame(), [0.05, 1.6, 0.06], [x, y + 0.8, 0.06]); }
  k.box(M.frame(), [32.2, 0.3, 0.3], [0, 14.35, 0.05]);
  // glass ground floor: mullions + transom (door opening x -1.25..1.25 has its own sliding panels)
  for (const x of [-8.2, -6.0, -3.8, -1.3, 1.3, 3.8, 6.0, 8.2]) k.box(M.frame(), [0.09, 4.6, 0.14], [x, 2.3, 0]);
  k.box(M.frame(), [16.6, 0.12, 0.16], [0, 4.55, 0]); k.box(M.frame(), [16.6, 0.1, 0.16], [0, 0.05, 0]); k.box(M.frame(), [2.6, 0.12, 0.16], [0, 2.6, 0]);
  for (const [a, b] of [[-8.2, -1.3], [1.3, 8.2]]) k.box(M.glass(), [b - a, 4.4, 0.02], [(a + b) / 2, 2.3, 0], [0, 0, 0], { ink: false, cast: false });
  k.box(M.glass(), [2.5, 1.9, 0.02], [0, 3.55, 0], [0, 0, 0], { ink: false, cast: false });
  // canopy + sign
  k.box(once("rhCanopy", () => new THREE.MeshStandardMaterial({ color: "#2a2d33", roughness: 0.4, metalness: 0.5 })), [7.4, 0.32, 3.0], [0, 4.85, 1.5]);
  k.box(M.strip(), [6.8, 0.02, 0.06], [0, 4.68, 2.85], [0, 0, 0], { ink: false });
  for (const x of [-2.4, 0, 2.4]) k.cyl(M.strip(), 0.07, 0.07, 0.02, [x, 4.68, 1.4], [0, 0, 0], 16, { ink: false });
  k.plane(M.sign(), 5.2, 1.02, [0, 5.55, 2.99], [0, 0, 0], { uv01: true }); k.box(M.frame(), [5.36, 1.16, 0.08], [0, 5.55, 2.94]);
  // planters with plants either side of the entrance, bollards, a bench
  for (const x of [-3.4, 3.4, -10.5, 10.5]) { k.box(M.planter(), [1.3, 0.6, 1.3], [x, 0.3, 1.4]); k.box(M.soil(), [1.18, 0.02, 1.18], [x, 0.59, 1.4], [0, 0, 0], { ink: false }); }
  for (const x of [-6, -5, 5, 6]) k.cyl(M.frame(), 0.08, 0.09, 0.8, [x, 0.4, 6.3], [0, 0, 0], 16);
  // the street behind the camera is never seen; far side of the road: a backdrop of buildings (seen only in the reflection-free glass? no: only at the start, low on frame edges)
  k.plane(M.back(), 80, 30, [0, 14.8, 26], [0, Math.PI, 0], { uv01: true });
  return k; });
export const EXT_PLANTS: { name: "plant1" | "pachira"; p: V3; s: number; ry: number }[] = [{ name: "plant1", p: [-3.4, 0.6, 1.4], s: 1.2, ry: 0.4 }, { name: "plant1", p: [3.4, 0.6, 1.4], s: 1.2, ry: 2.1 }, { name: "plant1", p: [-10.5, 0.6, 1.4], s: 1.1, ry: 1.2 }, { name: "plant1", p: [10.5, 0.6, 1.4], s: 1.1, ry: 3.0 }];

// ---------------------------------------------------------------- LOBBY
const lobby = (wood = false) => once(wood ? "rhLobbyWood" : "rhLobby", () => { const k = new Kit(), L = LOBBY, P = M.plaster();
  k.box(wood ? once("rhParquetMatte", () => { const m = pm("parquet", 1.5, { tint: "#c8905a" }).clone(); m.roughnessMap = null; m.roughness = 0.72; return m; }) : M.marble(), [L.x1 - L.x0, 0.1, L.z1 - L.z0], [0, -0.05, (L.z0 + L.z1) / 2], [0, 0, 0], { ink: false });
  k.box(M.rug(), [4.6, 0.012, 4.2], [-6.0, 0.006, -5.6], [0, 0, 0], { ink: false });
  k.box(M.ceil(), [L.x1 - L.x0 + 0.4, 0.2, L.z1 - L.z0 + 0.2], [0, L.h + 0.1, (L.z0 + L.z1) / 2], [0, 0, 0], { ink: false, cast: false });   // ceiling
  // ceiling light strips (diagonal-free, along z) + a cyan "future" cove around the room
  for (const x of [-6, -3, 0, 3, 6]) k.box(M.strip(), [0.12, 0.03, 12.4], [x, L.h - 0.015, -7.0], [0, 0, 0], { ink: false, cast: false });
  k.box(M.cyan(), [L.x1 - L.x0 - 0.3, 0.04, 0.05], [0, L.h - 0.3, L.z0 + 0.22], [0, 0, 0], { ink: false, cast: false });
  // back wall: hinoki slats over a dark wall, backlit logo panel above the counter
  k.span(M.black(), [L.x0, 0, L.z0 - T], [L.x1, L.h, L.z0]);
  for (let x = L.x0 + 0.1; x < L.x1 - 0.05; x += 0.16) k.box(M.hinoki(), [0.1, L.h - 0.1, 0.06], [x + 0.05, L.h / 2, L.z0 + 0.04], [0, 0, 0], { ink: false });
  k.box(M.frame(), [3.4, 1.9, 0.06], [-1.5, 3.25, L.z0 + 0.1]); k.plane(M.logo(), 1.8, 1.8, [-1.5, 3.25, L.z0 + 0.14], [0, 0, 0], { uv01: true });
  // office door (back wall, right)
  k.box(M.door(), [1.0, 2.2, 0.06], [OFFICE_DOOR[0], 1.1, L.z0 + 0.1]); k.box(M.frame(), [1.14, 2.28, 0.05], [OFFICE_DOOR[0], 1.14, L.z0 + 0.075]); k.box(M.brass(), [0.03, 0.2, 0.05], [OFFICE_DOOR[0] - 0.38, 1.05, L.z0 + 0.15]);
  // left wall (plaster, wood skirting) with framed pictures
  k.span(P, [L.x0 - T, 0, L.z0], [L.x0, L.h, L.z1]); k.span(M.cedar(), [L.x0, 0, L.z0], [L.x0 + 0.03, 0.15, L.z1]);
  // right wall with the corridor opening (z -12.4..-10.2, h 2.8) and 6 lit charging alcoves (recessed 0.5 m)
  k.span(P, [L.x1, 0, -10.2], [L.x1 + T, L.h, L.z1]); k.span(P, [L.x1, 0, L.z0], [L.x1 + T, L.h, -12.4]); k.span(P, [L.x1, 2.8, -12.4], [L.x1 + T, L.h, -10.2]);
  for (const a of ALCOVES) { const z = a[2]; k.span(M.black(), [L.x1 - 0.5, 0, z - 0.62], [L.x1 - 0.02, 1.9, z - 0.6]); k.span(M.black(), [L.x1 - 0.5, 0, z + 0.6], [L.x1 - 0.02, 1.9, z + 0.62]);
    k.span(M.white(), [L.x1 - 0.5, 1.9, z - 0.62], [L.x1 - 0.02, 1.94, z + 0.62]); k.box(M.cyan(), [0.02, 1.6, 1.0], [L.x1 - 0.015, 1.0, z], [0, 0, 0], { ink: false });
    k.cyl(M.frame(), 0.3, 0.3, 0.03, [L.x1 - 0.32, 0.015, z], [0, 0, 0], 24); }
  // front: interior side of the glass wall is the exterior kit; a dark threshold mat inside the doors
  k.box(M.black(), [2.6, 0.012, 1.8], [0, 0.006, -1.0], [0, 0, 0], { ink: false });
  // reception counter: white lacquer front, oak top, steel kick, cyan light line
  const D = DESK, cx = (D.x0 + D.x1) / 2, w = D.x1 - D.x0;
  k.box(M.white(), [w, D.h - 0.06, D.d], [cx, (D.h - 0.06) / 2, D.z]); k.box(M.hinoki(), [w + 0.1, 0.06, D.d + 0.12], [cx, D.h - 0.03, D.z + 0.02]);
  k.box(M.steel(), [w - 0.04, 0.1, D.d - 0.04], [cx, 0.05, D.z + 0.01]); k.box(M.cyan(), [w - 0.2, 0.025, 0.02], [cx, D.h - 0.2, D.z + D.d / 2 + 0.006], [0, 0, 0], { ink: false });
  // desk props: key-card tray, bell, calendar "2019", a tablet stand, a small vase spot
  k.box(M.black(), [0.3, 0.03, 0.18], [-1.6, D.h + 0.015, D.z + 0.12]); for (let i = 0; i < 4; i++) k.box(M.brass(), [0.085, 0.004, 0.054], [-1.66 + i * 0.04, D.h + 0.034, D.z + 0.12]);
  k.cyl(M.brass(), 0.05, 0.06, 0.04, [-0.5, D.h + 0.02, D.z + 0.2], [0, 0, 0], 20); k.sphere(M.brass(), 0.045, [-0.5, D.h + 0.05, D.z + 0.2], [1, 0.6, 1]);
  k.add(M.cal(), new THREE.PlaneGeometry(0.16, 0.2), [0.9, D.h + 0.11, D.z + 0.12], [-0.25, -0.2, 0], [1, 1, 1], { ink: false }); k.box(M.black(), [0.17, 0.02, 0.1], [0.9, D.h + 0.01, D.z + 0.08]);
  k.box(M.black(), [0.3, 0.2, 0.02], [-3.9, D.h + 0.14, D.z + 0.05], [-0.4, 0.3, 0]);
  k.box(M.black(), [w - 0.2, 0.22, 1.1], [cx, 0.11, D.z - D.d / 2 - 0.6]);                                   // staff riser behind the counter
  // columns
  for (const [x, z] of [[-4.5, -1.2]]) { k.cyl(M.white(), 0.32, 0.32, L.h, [x, L.h / 2, z], [0, 0, 0], 28); k.cyl(M.cyan(), 0.325, 0.325, 0.04, [x, 2.6, z], [0, 0, 0], 28, { ink: false }); }
  return k; });
export const LOBBY_FURN: { name: Parameters<typeof Model>[0]["name"]; p: V3; ry?: number; s?: number }[] = [
  { name: "sofa1", p: [-6.6, 0.012, -7.2], ry: Math.PI / 2 }, { name: "lounge", p: [-4.6, 0.012, -4.4], ry: -Math.PI * 0.85 }, { name: "lounge", p: [-6.2, 0.012, -3.9], ry: Math.PI * 0.9 },
  { name: "ctable", p: [-5.6, 0.012, -6.0], ry: 0 }, { name: "pillows", p: [-6.75, 0.46, -7.2], ry: Math.PI / 2, s: 0.95 }, { name: "vase", p: [-5.6, 0.4, -6.0] },
  { name: "plant1", p: [-8.3, 0.012, -9.6], s: 1.3 }, { name: "plant1", p: [-8.3, 0.012, -1.0], s: 1.25, ry: 1.3 }, { name: "plant2", p: [3.0, DESK.h, -11.3], s: 0.5 },
  { name: "rtable", p: [-6.4, 0.012, -11.6], s: 0.75 }, { name: "barchair", p: [-7.1, 0.012, -11.2] }, { name: "barchair", p: [-5.7, 0.012, -12.0], ry: 2.2 },
  { name: "cabinet", p: [-8.62, 0.012, -5.6], ry: Math.PI / 2, s: 0.9 }, { name: "plant4", p: [-8.6, 0.62, -6.4] }, { name: "plant4", p: [-8.6, 0.62, -4.8], ry: 1 },
  { name: "plant1", p: [7.8, 0.012, -12.9], s: 1.2, ry: 2.4 }, { name: "side", p: [-3.6, 0.012, -2.2] }, { name: "plant2", p: [-3.6, 0.56, -2.2], s: 0.7 },
];

// ---------------------------------------------------------------- CORRIDOR + ROOM 101
const doorLeaf = (k: Kit, x: number, z: number, face: 1 | -1, num: string) => { const C = M.door();
  k.box(C, [0.95, 2.1, 0.05], [x, 1.05, z + face * 0.03]); k.box(M.frame(), [1.09, 2.18, 0.04], [x, 1.09, z + face * 0.012]);
  k.box(M.brass(), [0.12, 0.03, 0.05], [x - 0.33, 1.02, z + face * 0.07]);
  k.add(once(`rhPlateM${num}`, () => new THREE.MeshStandardMaterial({ map: plateTex(num), roughness: 0.4 })), new THREE.PlaneGeometry(0.22, 0.11), [x + 0.75, 1.5, z + face * 0.012], [0, face > 0 ? 0 : Math.PI, 0], [1, 1, 1], { ink: false }); };
const corridor = () => once("rhCorridor", () => { const k = new Kit(), C = COR, P = M.plaster();
  k.box(M.carpet(), [C.x1 - C.x0, 0.06, C.z1 - C.z0], [(C.x0 + C.x1) / 2, -0.03, (C.z0 + C.z1) / 2], [0, 0, 0], { ink: false });
  k.box(P, [C.x1 - C.x0, 0.15, C.z1 - C.z0 + 0.4], [(C.x0 + C.x1) / 2, C.h + 0.075, (C.z0 + C.z1) / 2], [0, 0, 0], { ink: false, cast: false });
  for (let x = C.x0 + 1.5; x < C.x1; x += 3) k.cyl(M.strip(), 0.08, 0.08, 0.02, [x, C.h - 0.01, (C.z0 + C.z1) / 2], [0, 0, 0], 16, { ink: false, cast: false });
  // north wall with the room-101 door opening; south wall
  const dx0 = DOOR101.x - DOOR101.w / 2 - 0.07, dx1 = DOOR101.x + DOOR101.w / 2 + 0.07;
  k.span(P, [C.x0, 0, C.z0 - T], [dx0, C.h, C.z0]); k.span(P, [dx1, 0, C.z0 - T], [C.x1, C.h, C.z0]); k.span(P, [dx0, 2.18, C.z0 - T], [dx1, C.h, C.z0]);
  k.span(P, [C.x0, 0, C.z1], [C.x1, C.h, C.z1 + T]); k.span(P, [C.x1, 0, C.z0], [C.x1 + T, C.h, C.z1]);
  k.box(M.frame(), [0.07, 2.18, T + 0.04], [dx0 + 0.035, 1.09, C.z0 - T / 2]); k.box(M.frame(), [0.07, 2.18, T + 0.04], [dx1 - 0.035, 1.09, C.z0 - T / 2]); k.box(M.frame(), [dx1 - dx0, 0.07, T + 0.04], [DOOR101.x, 2.16, C.z0 - T / 2]);
  k.add(once("rhPlateM101", () => new THREE.MeshStandardMaterial({ map: plateTex("101"), roughness: 0.4 })), new THREE.PlaneGeometry(0.22, 0.11), [DOOR101.x + 0.75, 1.5, C.z0 + 0.012], [0, 0, 0], [1, 1, 1], { ink: false });
  // oak dado rail + skirting both sides
  for (const [z, s] of [[C.z0, 1], [C.z1, -1]] as const) { k.box(M.cedar(), [C.x1 - C.x0, 0.06, 0.03], [(C.x0 + C.x1) / 2, 0.95, z + s * 0.015], [0, 0, 0], { ink: 0.4 }); k.box(M.cedar(), [C.x1 - C.x0, 0.12, 0.02], [(C.x0 + C.x1) / 2, 0.06, z + s * 0.01], [0, 0, 0], { ink: false }); }
  DOORS.n.forEach((x, i) => doorLeaf(k, x, C.z0, 1, ["103", "105"][i])); DOORS.s.forEach((x, i) => doorLeaf(k, x, C.z1, -1, ["102", "104", "106"][i]));
  k.box(M.night(), [0.04, 1.4, 1.4], [C.x1 - 0.02, 1.5, (C.z0 + C.z1) / 2]);                                                       // end window
  return k; });
const room = () => once("rhRoom", () => { const k = new Kit(), R = ROOM, P = M.plaster();
  k.box(M.parquet(), [R.x1 - R.x0, 0.06, R.z1 - R.z0], [(R.x0 + R.x1) / 2, -0.03, (R.z0 + R.z1) / 2], [0, 0, 0], { ink: false });
  k.box(P, [R.x1 - R.x0 + 0.4, 0.15, R.z1 - R.z0 + 0.2], [(R.x0 + R.x1) / 2, R.h + 0.075, (R.z0 + R.z1) / 2], [0, 0, 0], { ink: false, cast: false });
  // walls (north wall has the window), west wall behind the bed: cedar panelling
  const wx0 = 11.4, wx1 = 13.8, wy0 = 0.9, wy1 = 2.4;
  k.span(P, [R.x0, 0, R.z0 - T], [wx0, R.h, R.z0]); k.span(P, [wx1, 0, R.z0 - T], [R.x1, R.h, R.z0]); k.span(P, [wx0, 0, R.z0 - T], [wx1, wy0, R.z0]); k.span(P, [wx0, wy1, R.z0 - T], [wx1, R.h, R.z0]);
  k.box(M.night(), [wx1 - wx0, wy1 - wy0, 0.02], [(wx0 + wx1) / 2, (wy0 + wy1) / 2, R.z0 - 0.12]); k.box(M.frame(), [wx1 - wx0 + 0.1, 0.08, 0.2], [(wx0 + wx1) / 2, wy0 - 0.04, R.z0 + 0.04]);
  for (const x of [wx0, (wx0 + wx1) / 2, wx1]) k.box(M.frame(), [0.06, wy1 - wy0, 0.08], [x, (wy0 + wy1) / 2, R.z0 - 0.06]);
  k.span(P, [R.x0 - T, 0, R.z0], [R.x0, R.h, R.z1]); k.span(P, [R.x1, 0, R.z0], [R.x1 + T, R.h, R.z1]);
  for (let z = R.z0 + 0.05; z < R.z1 - 0.1; z += 0.2) k.box(M.cedar(), [0.04, 1.5, 0.17], [R.x0 + 0.02, 0.75 + 0.3, z + 0.1], [0, 0, 0], { ink: false });
  // curtains either side of the window
  for (const x of [wx0 - 0.25, wx1 + 0.25]) for (let i = 0; i < 6; i++) k.cyl(M.throw(), 0.045, 0.045, 2.5, [x - 0.18 + i * 0.07, 1.3, R.z0 + 0.12 + (i % 2) * 0.03], [0, 0, 0], 8, { ink: false });
  // bed (headboard on the west wall, long axis +x): base, mattress, headboard, pillows; duvet is a separate piece (scene)
  const B = BED, zc = B.z;
  k.box(M.cedar(), [B.x1 - B.x0, 0.3, B.w + 0.1], [(B.x0 + B.x1) / 2 + 0.05, 0.15, zc]); k.box(M.linen(), [B.x1 - B.x0 - 0.06, 0.26, B.w], [(B.x0 + B.x1) / 2 + 0.04, 0.43, zc]);
  k.box(M.velvet(), [0.12, 1.1, B.w + 0.5], [B.x0 + 0.08, 0.55, zc]);
  for (const s of [-1, 1]) k.box(M.linen(), [0.42, 0.14, 0.66], [B.x0 + 0.42, 0.62, zc + s * 0.4], [0, 0, 0.25], { ink: 0.4 });
  // desk on the east wall
  k.box(M.cedar(), [0.6, 0.04, 1.4], [R.x1 - 0.32, 0.76, -15.2]); for (const z of [-15.85, -14.55]) k.box(M.frame(), [0.5, 0.74, 0.03], [R.x1 - 0.32, 0.37, z]);
  k.box(M.black(), [0.04, 0.6, 1.0], [R.x1 - 0.04, 1.45, -15.2]);                                                     // wall TV
  // inside face of the door wall (south wall, opening at DOOR101)
  const dx0 = DOOR101.x - DOOR101.w / 2 - 0.07, dx1 = DOOR101.x + DOOR101.w / 2 + 0.07; void dx0; void dx1;
  return k; });
export const ROOM_FURN: { name: Parameters<typeof Model>[0]["name"]; p: V3; ry?: number; s?: number }[] = [
  { name: "side", p: [NIGHTSTAND[0] + 0.12, 0, NIGHTSTAND[2]], ry: Math.PI / 2 }, { name: "clock", p: [NIGHTSTAND[0] + 0.2, 0.45, NIGHTSTAND[2] + 0.12], ry: Math.PI / 2 },
  { name: "armchair", p: [14.8, 0, -17.7], ry: -Math.PI * 0.75 }, { name: "desklamp", p: [15.2, 0.78, -15.7], ry: -Math.PI / 2 }, { name: "plant2", p: [15.1, 0, -13.1], s: 0.9 },
  { name: "frame", p: [15.2, 0.78, -14.7], ry: -Math.PI / 2 },
];

// ---------------------------------------------------------------- moving parts
/** automatic sliding doors: two glass leaves, open 0..1 */
export const SlidingDoors: React.FC<{ open: number }> = ({ open }) => { const o = Math.min(1, Math.max(0, open)) * 1.18;
  return <>{[-1, 1].map((s) => <group key={s} position={[s * (0.62 + o), 1.3, 0.04]}>
    <mesh material={M.glass()} renderOrder={2}><boxGeometry args={[1.22, 2.5, 0.02]} /></mesh>
    <mesh position={[0, 1.27, 0]} material={M.frame()}><boxGeometry args={[1.24, 0.05, 0.05]} /></mesh><mesh position={[0, -1.25, 0]} material={M.frame()}><boxGeometry args={[1.24, 0.05, 0.05]} /></mesh>
    <mesh position={[-s * 0.6, 0, 0]} material={M.frame()}><boxGeometry args={[0.05, 2.5, 0.05]} /></mesh></group>)}</>;
};
/** room-101 door leaf, hinged on its +x edge, swinging into the room (open 0..1) */
export const Door101: React.FC<{ open: number }> = ({ open }) =>
  <group position={[DOOR101.x + DOOR101.w / 2, 0, COR.z0 - 0.03]} rotation={[0, -open * 1.75, 0]}>
    <mesh position={[-DOOR101.w / 2, 1.05, 0]} material={M.door()} castShadow receiveShadow><boxGeometry args={[DOOR101.w, 2.1, 0.05]} /></mesh>
    <mesh position={[-DOOR101.w + 0.12, 1.02, 0.04]} material={M.brass()}><boxGeometry args={[0.12, 0.03, 0.04]} /></mesh></group>;
/** duvet: covers the sleeper below the chest; `lift` raises its head end as the guest sits up */
export const Duvet: React.FC<{ lift: number }> = ({ lift }) => { const B = BED, len = B.x1 - B.x0 - 0.62;
  return <group position={[B.x1 - 0.02, B.top + 0.02, B.z]}>
    <mesh position={[-len / 2, 0.09, 0]} material={M.duvet()} castShadow receiveShadow scale={[1, 1, 1]}><boxGeometry args={[len, 0.18, B.w + 0.06]} /></mesh>
    <mesh position={[-len / 2, -0.08, B.w / 2 + 0.04]} material={M.duvet()}><boxGeometry args={[len, 0.34, 0.04]} /></mesh>
    <mesh position={[-len - 0.1, 0.12 + lift * 0.15, 0]} rotation={[0, 0, lift * 0.5]} material={M.duvet()}><boxGeometry args={[0.3, 0.12, B.w + 0.04]} /></mesh>
    <mesh position={[-len * 0.35, 0.185, 0]} material={M.throw()}><boxGeometry args={[0.55, 0.02, B.w + 0.08]} /></mesh></group>;
};

// ---------------------------------------------------------------- the whole building
export const Building: React.FC<{ doors: number; door101: number; show: { ext: boolean; lobby: boolean; cor: boolean; room: boolean }; woodFloor?: boolean }> = ({ doors, door101, show, woodFloor }) => <>
  {show.ext && <><KitMesh kit={exterior()} /><Instances name="plant1" items={EXT_PLANTS.map((p) => ({ p: p.p, ry: p.ry, s: p.s }))} /></>}
  <SlidingDoors open={doors} />
  {show.lobby && <><KitMesh kit={lobby(woodFloor)} />{LOBBY_FURN.map((m, i) => <Model key={i} name={m.name} p={m.p} ry={m.ry} s={m.s} />)}</>}
  {show.cor && <KitMesh kit={corridor()} />}
  <Door101 open={door101} />
  {show.room && <><KitMesh kit={room()} />{ROOM_FURN.map((m, i) => <Model key={i} name={m.name} p={m.p} ry={m.ry} s={m.s} />)}</>}
</>;

// ---------------------------------------------------------------- practical lights (no shadows; the sun/moon key casts them)
export const HotelLights: React.FC<{ lobby: number; cor: number; room: number }> = ({ lobby, cor, room }) => <>
  {lobby > 0.01 && [[-3, -5], [3, -9]].map(([x, z], i) => <pointLight key={`l${i}`} position={[x, 4.4, z]} intensity={13 * lobby} distance={16} decay={1.5} color="#ffe6c4" />)}
  {cor > 0.01 && [11.5, 16.5].map((x, i) => <pointLight key={`c${i}`} position={[x, 2.5, -11.3]} intensity={4 * cor} distance={7} decay={1.6} color="#ffe2b8" />)}
  {room > 0.01 && <pointLight position={[14.5, 1.4, -15.6]} intensity={1.2 * room} distance={5} decay={1.8} color="#ffdcaa" />}
</>;
