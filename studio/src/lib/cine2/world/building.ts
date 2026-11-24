// World 2.0 procedural buildings: shops, cafes, restaurants, houses, apartments, offices, warehouses and historic
// terraces built from a few parameters. Every facade gets real depth and detail: window frames + recessed glass, lit
// windows at night, doors with frames, cornices / string courses, shopfronts with awnings and sign boards, balconies,
// downpipes + gutters, AC units, roof parapets, chimneys, vents and water tanks. All parts merge per material.
import { G, part, pick, type Part, type Lod, type V3 } from "./kit";
import { rng } from "../../math";

export type BuildingStyle = "shop" | "cafe" | "restaurant" | "house" | "apartment" | "office" | "warehouse" | "historic";
export type BuildingSpec = { w: number; d: number; floors: number; style: BuildingStyle; seed: number; era: number; floorH?: number; color?: string; roof?: "flat" | "gable"; night?: boolean; /** fraction of windows lit at night */ lit?: number };
const WALL: Record<BuildingStyle, string[]> = { shop: ["#c8b8a0", "#a85a42", "#d8ccb4", "#8a9aa0"], cafe: ["#e8dcc4", "#c8a878", "#8aa08a"], restaurant: ["#9a4a3a", "#d8c8a8", "#5a4a3a"], house: ["#d8ccb4", "#c8a888", "#e8e0cc", "#a8b0a0"], apartment: ["#c8b8a0", "#9a6a52", "#b8a890", "#d0c8b8"], office: ["#a8acb0", "#8a9098", "#c8c4bc"], warehouse: ["#8a5a42", "#7a7a72", "#9a8a72"], historic: ["#c8b090", "#a89070", "#b8a080", "#d8c8a8"] };
export const building = (b: BuildingSpec, l: Lod): Part[] => {
  const r = rng(b.seed * 9973 + 7), fh = b.floorH ?? (b.style === "warehouse" ? 5 : b.style === "office" ? 3.4 : 3.1), H = b.floors * fh, out: Part[] = [];
  const wallC = b.color ?? pick(WALL[b.style], b.seed), brick = b.style === "warehouse" || b.style === "historic" || (b.style === "apartment" && b.seed % 2 === 0) || b.style === "restaurant";
  const wallS = brick ? "brick" : b.style === "office" ? "concrete" : "plaster";
  out.push(part(G.boxOn(b.w, H, b.d, 0, -b.d / 2), wallS, wallC));   // body: front face at z = 0
  const modern = b.era >= 1950, groundShop = b.style === "shop" || b.style === "cafe" || b.style === "restaurant" || (b.style === "apartment" && b.seed % 3 === 0) || (b.style === "historic" && b.seed % 2 === 1);
  // windows
  const winW = b.style === "office" ? 1.6 : b.style === "warehouse" ? 2.2 : 1.0, winH = b.style === "office" ? 1.9 : b.style === "warehouse" ? 1.4 : 1.45, bays = Math.max(1, Math.floor(b.w / (winW + (b.style === "office" ? 0.6 : 1.3))));
  const frameC = b.style === "historic" ? "#e8e4d8" : modern ? "#3a3e42" : "#e8e4d8", glassLit = "#ffd89a";
  for (let f = groundShop ? 1 : 0; f < b.floors; f++) for (let i = 0; i < bays; i++) {
    const x = -b.w / 2 + (b.w / bays) * (i + 0.5), y = f * fh + fh * 0.5 + (f === 0 ? 0.1 : 0), lit = b.night && r() < (b.lit ?? 0.45);
    out.push(part(G.box(winW, winH, 0.05, [x, y, -0.09]), lit ? "emissive" : "glass", lit ? pick(["#ffd89a", "#ffe8c0", "#f8f0e0"], i + f) : "#3a4650", lit ? { em: glassLit, emI: 0.9 + r() * 0.6 } : { tag: "glass" }));
    if (l < 2) { out.push(part(G.box(winW + 0.16, 0.1, 0.16, [x, y - winH / 2 - 0.05, 0.02]), "stone", "#d8d0c0"), part(G.box(winW + 0.12, 0.08, 0.14, [x, y + winH / 2 + 0.04, -0.01]), wallS, wallC));
      out.push(part(G.box(0.06, winH, 0.1, [x - winW / 2, y, -0.03]), "paintedMetal", frameC), part(G.box(0.06, winH, 0.1, [x + winW / 2, y, -0.03]), "paintedMetal", frameC), part(G.box(winW, 0.05, 0.08, [x, y + (b.style === "historic" ? 0.15 : 0), -0.04]), "paintedMetal", frameC));
      if (l === 0 && b.style !== "office" && b.style !== "warehouse") out.push(part(G.box(0.04, winH, 0.07, [x, y, -0.05]), "paintedMetal", frameC)); }
    // balconies (apartments) and AC units (modern) on some bays
    if (l < 2 && b.style === "apartment" && f > 0 && (i + f) % 2 === 0) { out.push(part(G.boxOn(winW + 0.6, 0.12, 0.9, x, 0.45, f * fh - 0.05), "concrete", "#b8b4aa"), part(G.box(winW + 0.6, 0.9, 0.03, [x, f * fh + 0.5, 0.9]), "paintedMetal", "#2a2e32")); }
    if (l < 2 && modern && b.style !== "historic" && (i * 3 + f * 5 + b.seed) % 7 === 0) out.push(part(G.box(0.8, 0.55, 0.32, [x + winW / 2 + 0.5, y - 0.5, 0.16]), "paintedMetal", "#d8d8d2"));
  }
  // ground floor: shopfront or door
  if (groundShop) {
    const sw = Math.min(b.w - 1.2, 7), awC = pick(["#2a5a3a", "#8a1e1a", "#1e3a5a", "#c8a050", "#5a2a4a"], b.seed);
    out.push(part(G.box(sw, 2.4, 0.05, [0, 1.6, -0.12]), b.night ? "emissive" : "glass", b.night ? "#ffe0b0" : "#4a5660", b.night ? { em: "#ffd8a0", emI: 1.3 } : { tag: "glass" }));
    out.push(part(G.box(sw + 0.3, 0.2, 0.18, [0, 0.2, 0.02]), "stone", "#5a5650"), part(G.box(sw + 0.3, 0.7, 0.22, [0, 3.2, 0.05]), "paintedMetal", awC));   // stall riser + fascia / sign board
    if (l < 2) { out.push(part(G.box(sw * 0.6, 0.3, 0.02, [0, 3.2, 0.17]), "paintedMetal", "#f2ead8")); for (let k = 0; k <= 3; k++) out.push(part(G.box(0.07, 2.4, 0.1, [-sw / 2 + (sw / 3) * k, 1.6, -0.08]), "paintedMetal", frameC)); }
    if (b.style !== "shop" || b.seed % 2 === 0) out.push(part(G.box(sw + 0.4, 0.06, 1.4, [0, 2.75, 0.62], [0.32, 0, 0]), "fabric", awC));   // awning
  } else {
    const dx = b.style === "house" ? -b.w / 4 : 0; out.push(part(G.box(1.1, 2.3, 0.08, [dx, 1.15, -0.06]), "wood", pick(["#3a2a1e", "#1e3a2a", "#2a2e4a", "#6a2a1e"], b.seed)));
    if (l < 2) out.push(part(G.box(1.4, 0.15, 0.25, [dx, 2.4, 0.05]), "stone", "#d8d0c0"), part(G.boxOn(1.6, 0.16, 0.5, dx, 0.25), "stone", "#a8a49a"));
  }
  // horizontal detail: string course + cornice / parapet
  if (l < 2 && b.floors > 1) out.push(part(G.box(b.w + 0.1, 0.18, 0.12, [0, fh, 0.03]), "stone", "#d8d0c0"));
  if (b.roof === "gable" || b.style === "house") {
    out.push(part(G.extrude([[-b.w / 2 - 0.3, 0], [b.w / 2 + 0.3, 0], [0, Math.min(3.5, b.w * 0.35)]], b.d + 0.4, [0, H, -b.d / 2], [0, 0, 0]), "stone", pick(["#5a3a32", "#4a4a4e", "#6a4a3a"], b.seed)));
    if (l < 2) out.push(part(G.boxOn(0.6, 1.6, 0.6, b.w / 4, -b.d / 2, H + 0.6), "brick", "#7a4a3a"));
  } else {
    out.push(part(G.box(b.w + 0.25, 0.35, 0.3, [0, H - 0.1, 0.05]), b.style === "historic" ? "stone" : wallS, b.style === "historic" ? "#d8d0c0" : wallC), part(G.boxOn(b.w, 0.6, 0.2, 0, -0.1, H), wallS, wallC));
    if (l < 2) { const rr = rng(b.seed + 3); if (modern) { out.push(part(G.boxOn(1.6, 1.0, 1.2, (rr() - 0.5) * b.w * 0.5, -b.d * 0.5, H), "paintedMetal", "#c8c8c4")); if (b.style === "apartment" || b.style === "office") out.push(part(G.cyl(0.9, 0.9, 1.8, [b.w * 0.3, H + 1.6, -b.d * 0.6], undefined, l), "wood", "#6a5a4a")); }
      out.push(part(G.cyl(0.12, 0.12, 0.6, [-b.w * 0.3, H + 0.3, -b.d * 0.4], undefined, l, 8), "metal", "#8a8e92")); if (!modern) out.push(part(G.boxOn(0.7, 1.4, 0.5, b.w * 0.32, -b.d * 0.7, H), "brick", "#7a4a3a")); }
  }
  // downpipe + gutter
  if (l < 2) out.push(part(G.cyl(0.05, 0.05, H, [b.w / 2 - 0.15, H / 2, 0.1], undefined, l, 6), "paintedMetal", "#3a3e40"));
  if (l < 2 && b.style === "warehouse") out.push(part(G.box(Math.min(5, b.w * 0.4), 4.4, 0.08, [b.w * 0.15, 2.2, 0.0]), "paintedMetal", "#6a7a7a"));
  return out;
};
/** footprint of a placed building (front face on the street line) for collision / camera */
export const buildingBox = (b: BuildingSpec, at: V3, ry: number) => { const H = b.floors * (b.floorH ?? (b.style === "warehouse" ? 5 : b.style === "office" ? 3.4 : 3.1)); return { w: b.w, d: b.d, h: H + (b.roof === "gable" || b.style === "house" ? 3 : 0.6), at, ry }; };
