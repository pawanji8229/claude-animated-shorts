// joralemon row houses: an 1840s Brooklyn Heights Greek Revival row-house front, built into Kits (merged per material,
// UVs in metres -> true brick scale). House-local: centred on x = 0, front face z = 0 (outside +z), y = world height.
//   brownstone basement (rusticated) + water table, brick upper storeys, stone lintels + sills, 6-over-6 sashes,
//   Greek Revival doorway (pilasters, entablature, transom), dentilled wooden cornice, stoop with cheek walls + iron
//   railings, areaway with iron fence on a stone curb, basement windows with grilles, chimneys.
// mode "home": painted sashes, curtains/lace, lit rooms (built separately, see rooms()); mode "vent": No. 58 today -
// windows, muntins, frames AND lintels jet black, black glass, black steel door with a grille, brass "58".
// Rule against z-fighting: touching parts never share a plane facing the same way (offsets >= 1-2 cm).
import * as THREE from "three";
import { Kit } from "../short3/kit";
import { wallRect, type Rect } from "../short3/archKit";
import { rng } from "../../lib/math";
import { JM } from "./mats";
import { SW_Y, AREA_Y, PF, AREA_Z } from "./world";

export type HouseSpec = {
  w: number; storeys: 3 | 4; brick: keyof JM; base: "brownstone" | "brick"; trim: "brownstone" | "cream" | "black";
  sash: keyof JM; door: keyof JM; cornice: keyof JM; stoop: "L" | "R"; mode: "home" | "vent"; seed: number; allStone?: boolean;
  shutters?: keyof JM | null; curtain?: keyof JM; lit?: number;
};
export const STOREYS = [3.5, 3.2, 2.8, 2.6];
export const levels = (s: HouseSpec) => { const fl = [PF]; for (let i = 1; i < s.storeys; i++) fl.push(fl[i - 1] + STOREYS[i - 1]); return { fl, eave: fl[s.storeys - 1] + STOREYS[s.storeys - 1] }; };
/** window size per floor (w, h, sill height above floor) */
export const WIN = [[1.05, 2.75, 0.35], [1.0, 2.15, 0.5], [0.95, 1.75, 0.45], [0.9, 1.45, 0.4]] as const;
export const bays = (w: number) => { const m = Math.min(1.15, w * 0.18); return [-w / 2 + m + 0.1, 0, w / 2 - m - 0.1].map((x, i) => (i === 1 ? (x + 0.05) : x)); };
export const doorBay = (s: HouseSpec) => (s.stoop === "L" ? 0 : 2);
export const stoopSpan = (s: HouseSpec, bx: number[]) => { const c = bx[doorBay(s)]; return { x0: c - 0.95, x1: c + 0.95 }; };
const STOOP_Z = 3.05, NSTEP = 10, RISE = (PF - SW_Y) / NSTEP, TREAD = 0.25;

/** 6-over-6 double-hung window in an opening (cx, y0 = opening bottom, w x h), wall face z = 0 */
export const sash6 = (k: Kit, frame: THREE.Material, glass: THREE.Material, cx: number, y0: number, w: number, h: number, cols = 3, rows = 2, open = 0, set = 0.13) => {
  const zf = -set, xa = cx - w / 2, xb = cx + w / 2;
  k.span(frame, [xa + 0.01, y0 + 0.04, zf - 0.06], [xa + 0.08, y0 + h - 0.08, zf + 0.04]); k.span(frame, [xb - 0.08, y0 + 0.04, zf - 0.06], [xb - 0.01, y0 + h - 0.08, zf + 0.04]);
  k.span(frame, [xa + 0.01, y0 + h - 0.08, zf - 0.06], [xb - 0.01, y0 + h - 0.01, zf + 0.04]); k.span(frame, [xa + 0.01, y0 + 0.03, zf - 0.06], [xb - 0.01, y0 + 0.08, zf + 0.055]);
  const iw = w - 0.16, x0 = cx - iw / 2, ya = y0 + 0.08, yt = y0 + h - 0.08, half = (yt - ya) / 2;
  const sash = (b0: number, b1: number, z: number) => {
    k.span(frame, [x0, b0, z - 0.02], [x0 + 0.045, b1, z + 0.02]); k.span(frame, [x0 + iw - 0.045, b0, z - 0.02], [x0 + iw, b1, z + 0.02]);
    k.span(frame, [x0 + 0.045, b1 - 0.045, z - 0.02], [x0 + iw - 0.045, b1, z + 0.02]); k.span(frame, [x0 + 0.045, b0, z - 0.02], [x0 + iw - 0.045, b0 + 0.06, z + 0.02]);
    const gx0 = x0 + 0.045, gx1 = x0 + iw - 0.045, gy0 = b0 + 0.06, gy1 = b1 - 0.045;
    for (let c = 1; c < cols; c++) { const x = gx0 + ((gx1 - gx0) * c) / cols; k.span(frame, [x - 0.011, gy0, z - 0.013], [x + 0.011, gy1, z + 0.013], { ink: false }); }
    for (let r = 1; r < rows; r++) { const y = gy0 + ((gy1 - gy0) * r) / rows; k.span(frame, [gx0, y - 0.011, z - 0.013], [gx1, y + 0.011, z + 0.013], { ink: false }); }
    k.plane(glass, gx1 - gx0, gy1 - gy0, [cx, (gy0 + gy1) / 2, z], [0, 0, 0]);
  };
  const lift = open * half * 0.85;
  sash(ya + half - 0.02, yt, zf + 0.022);
  sash(ya + lift, ya + lift + half + 0.02, zf - 0.022);
  return { inner: zf - 0.07, ya, yt, iw };
};

/** the front of one row house (+ stoop, areaway, ironwork, cornice, chimneys). `wrap` swaps materials (cutaway clones). */
export const buildFront = (M: JM, s: HouseSpec) => {
  const k = new Kit(), r = rng(s.seed), { fl, eave } = levels(s), bx = bays(s.w), w2 = s.w / 2, T = 0.42, db = doorBay(s);
  const vent = s.mode === "vent";
  const brick = M[s.brick] as THREE.Material, stone = s.allStone ? M.brownstone : M.brownstone;
  const trimM: THREE.Material = vent ? M.ventBlack : s.trim === "cream" ? M.corniceCream : s.trim === "black" ? M.sashBlack : M.brownstoneSm;
  const frame: THREE.Material = vent ? M.ventBlack : (M[s.sash] as THREE.Material), glass: THREE.Material = vent ? M.glassBlack : M.glass;
  const top = eave;
  // ---- openings
  const winRects: (Rect & { fi: number; cx: number })[] = [];
  for (let fi = 0; fi < s.storeys; fi++) { const [ww, hh, so] = WIN[fi]; for (let b = 0; b < 3; b++) { if (fi === 0 && b === db) continue; const y0 = fl[fi] + so; winRects.push({ x0: bx[b] - ww / 2, x1: bx[b] + ww / 2, y0, y1: y0 + hh, fi, cx: bx[b] }); } }
  const door: Rect = { x0: bx[db] - 0.64, x1: bx[db] + 0.64, y0: PF, y1: PF + 3.0 };
  const baseWins: Rect[] = [0, 1, 2].filter((b) => b !== db).map((b) => ({ x0: bx[b] - 0.5, x1: bx[b] + 0.5, y0: AREA_Y + 0.75, y1: PF - 0.45 }));
  const underDoor: Rect = { x0: bx[db] - 0.45, x1: bx[db] + 0.45, y0: AREA_Y, y1: AREA_Y + 1.95 };
  // ---- walls: brownstone basement (rusticated courses) + water table, brick (or stone) above
  const yb = PF - 0.06;
  for (let y = AREA_Y - 0.12, i = 0; y < yb - 1e-3; y += 0.42, i++) { const y1 = Math.min(yb, y + 0.42); wallRect(k, stone, -w2, w2, y, y1 - 0.035, -T, 0, [...baseWins, underDoor], { ink: false }); if (y1 - 0.035 > y) wallRect(k, stone, -w2, w2, y1 - 0.035, y1, -T, -0.025, [...baseWins, underDoor], { ink: false }); }
  wallRect(k, s.allStone ? M.brownstoneSm : brick, -w2, w2, yb, top, -T, 0, [...winRects, door]);
  k.span(stone, [-w2, yb - 0.02, 0.005], [w2, yb + 0.16, 0.06]);     // water table
  // party-wall edge strips (separate the houses visually; 1 cm proud)
  for (const sx of [-1, 1]) k.span(s.allStone ? M.brownstone : brick, [sx * w2 - (sx > 0 ? 0.06 : 0), yb + 0.16, 0.0], [sx * w2 + (sx < 0 ? 0.06 : 0), top, 0.012], { ink: 0.5 });
  // ---- lintels + sills (+ shutters) + sashes
  for (const o of winRects) { const ww = o.x1 - o.x0;
    k.span(trimM, [o.x0 - 0.13, o.y1, 0.004], [o.x1 + 0.13, o.y1 + 0.3, 0.065]); k.span(trimM, [o.x0 - 0.16, o.y1 + 0.3, 0.004], [o.x1 + 0.16, o.y1 + 0.34, 0.085], { ink: 0.5 });
    k.span(vent ? M.ventBlack : stone, [o.x0 - 0.08, o.y0 - 0.09, -0.14], [o.x1 + 0.08, o.y0 + 0.02, 0.07]);
    const open = !vent && r() < 0.12 ? 0.3 : 0;
    sash6(k, frame, glass, o.cx, o.y0 + 0.02, ww, o.y1 - o.y0 - 0.02, o.fi === 0 ? 3 : 3, 2, open);
    if (s.shutters && !vent) for (const sd of [-1, 1]) { const sx = sd < 0 ? o.x0 - 0.02 - ww / 2 : o.x1 + 0.02, sw = ww / 2; k.span(M[s.shutters] as THREE.Material, [sx, o.y0 + 0.04, 0.012], [sx + sw, o.y1 - 0.02, 0.045]);
      for (let y = o.y0 + 0.15; y < o.y1 - 0.1; y += 0.07) k.span(M[s.shutters] as THREE.Material, [sx + 0.05, y, 0.045], [sx + sw - 0.05, y + 0.025, 0.06], { ink: false }); }
  }
  // basement windows: sills, iron grilles, sashes
  for (const o of baseWins) { sash6(k, frame, glass, (o.x0 + o.x1) / 2, o.y0, o.x1 - o.x0, o.y1 - o.y0, 2, 2, 0, 0.12);
    k.span(stone, [o.x0 - 0.06, o.y0 - 0.08, -0.12], [o.x1 + 0.06, o.y0 + 0.02, 0.07]);
    for (let x = o.x0 + 0.08; x < o.x1 - 0.04; x += 0.11) k.rod(M.wrought, [x, o.y0 + 0.02, 0.1], [x, o.y1 + 0.02, 0.1], 0.012, 6, { ink: false });
    for (const y of [o.y0 + 0.2, o.y1 - 0.12]) k.span(M.wrought, [o.x0, y - 0.015, 0.085], [o.x1, y + 0.015, 0.115], { ink: false }); }
  // ---- doorway: Greek Revival surround (pilasters + entablature), recessed door, transom
  const dc = bx[db], surround = vent ? M.ventBlack : s.trim === "cream" ? M.corniceCream : M.brownstoneSm;
  for (const sd of [-1, 1]) { const x = dc + sd * 0.74; k.span(surround, [x - 0.12, PF, 0.005], [x + 0.12, PF + 3.05, 0.11]); k.span(surround, [x - 0.15, PF, 0.005], [x + 0.15, PF + 0.14, 0.13], { ink: 0.5 }); k.span(surround, [x - 0.15, PF + 2.92, 0.005], [x + 0.15, PF + 3.05, 0.13], { ink: 0.5 }); }
  k.span(surround, [dc - 0.95, PF + 3.05, 0.005], [dc + 0.95, PF + 3.45, 0.12]); k.span(surround, [dc - 1.02, PF + 3.45, 0.005], [dc + 1.02, PF + 3.55, 0.2]);
  const dz = -0.3; // door set back in the reveal
  for (const sd of [-1, 1]) k.span(vent ? M.ventBlack : (M[s.door] as THREE.Material), [dc + sd * 0.6 - 0.05, PF, dz - 0.08], [dc + sd * 0.6 + 0.05, PF + 3.0, dz + 0.03]);   // door frame jambs (no light gap)
  if (vent) { // black steel door: flush leaf, stiles, a small grille, heavy lock box, kick plate, brass 58 on the transom panel
    k.span(M.ventSteel, [dc - 0.55, PF + 0.02, dz - 0.05], [dc + 0.55, PF + 2.4, dz]); for (const sd of [-1, 1]) k.span(M.ventSteel, [dc + sd * 0.55 - (sd > 0 ? 0.08 : 0), PF + 0.02, dz], [dc + sd * 0.55 + (sd < 0 ? 0.08 : 0), PF + 2.4, dz + 0.02]);
    k.span(M.ventSteel, [dc - 0.47, PF + 1.15, dz], [dc + 0.47, PF + 1.21, dz + 0.02]);
    k.span(M.grate, [dc - 0.17, PF + 1.5, dz + 0.001], [dc + 0.17, PF + 1.84, dz + 0.02]); for (let i = 0; i < 6; i++) k.rod(M.ventBlack, [dc - 0.14 + i * 0.056, PF + 1.5, dz + 0.03], [dc - 0.14 + i * 0.056, PF + 1.84, dz + 0.03], 0.009, 5, { ink: false });
    k.span(M.ventSteel, [dc + 0.28, PF + 1.0, dz], [dc + 0.44, PF + 1.32, dz + 0.07]); k.cyl(M.galv, 0.03, 0.03, 0.05, [dc + 0.36, PF + 1.2, dz + 0.09], [Math.PI / 2, 0, 0], 10, { ink: false });
    k.span(M.galv, [dc - 0.5, PF + 0.02, dz + 0.001], [dc + 0.5, PF + 0.3, dz + 0.012], { ink: false });
    k.span(M.ventBlack, [dc - 0.62, PF + 2.4, dz - 0.04], [dc + 0.62, PF + 3.0, dz - 0.01]);   // transom panel (blanked)
  } else { // painted wooden door with raised panels, brass knob + knocker, glazed transom with muntins
    const D = M[s.door] as THREE.Material; k.span(D, [dc - 0.55, PF + 0.02, dz - 0.05], [dc + 0.55, PF + 2.4, dz]);
    for (const [y0, y1] of [[0.15, 1.0], [1.2, 2.25]]) for (const sd of [-1, 1]) k.span(D, [dc + sd * 0.27 - 0.2, PF + y0, dz], [dc + sd * 0.27 + 0.2, PF + y1, dz + 0.025]);
    k.sphere(M.brass, 0.035, [dc + 0.42, PF + 1.1, dz + 0.05]); k.torus(M.brass, 0.06, 0.012, [dc, PF + 1.55, dz + 0.04], [0, 0, 0]);
    k.span(D, [dc - 0.62, PF + 2.4, dz - 0.04], [dc + 0.62, PF + 2.47, dz + 0.01]);
    k.plane(M.glass, 1.15, 0.5, [dc, PF + 2.72, dz - 0.02], [0, 0, 0]); for (let i = 1; i < 5; i++) k.span(D, [dc - 0.575 + i * 0.23 - 0.012, PF + 2.47, dz - 0.03], [dc - 0.575 + i * 0.23 + 0.012, PF + 2.97, dz - 0.01], { ink: false });
  }
  // ---- cornice: frieze board, dentil course, bed moulding, projecting crown
  const C = vent ? M.ventBlack : (M[s.cornice] as THREE.Material);
  k.span(C, [-w2, top, 0.005], [w2, top + 0.42, 0.1]); for (let x = -w2 + 0.08; x < w2 - 0.05; x += 0.17) k.span(C, [x, top + 0.42, 0.1], [x + 0.08, top + 0.52, 0.2], { ink: 0.4 });
  k.span(C, [-w2, top + 0.52, 0.005], [w2, top + 0.6, 0.26]); k.span(C, [-w2, top + 0.6, 0.005], [w2, top + 0.78, 0.48]);
  // roof parapet + chimneys (on the party walls)
  k.span(M.roofTar, [-w2, top - 0.2, -13], [w2, top + 0.52, -0.43], { ink: false });
  for (const sx of [-1, 1]) if (r() < 0.8) { const cz = -2.5 - r() * 7; k.span(s.allStone ? M.brickBrown : brick, [sx * w2 - 0.45, top, cz - 0.9], [sx * w2 + 0.45, top + 2.1 + r() * 0.6, cz + 0.9]); k.span(M.brownstoneSm, [sx * w2 - 0.5, top + 2.0, cz - 0.95], [sx * w2 + 0.5, top + 2.12, cz + 0.95], { ink: 0.4 }); }
  // ---- stoop: stepped brownstone with cheek walls + iron railings
  const st = stoopSpan(s, bx);
  for (let i = 0; i < NSTEP; i++) { const yt = SW_Y + (i + 1) * RISE, z1 = STOOP_Z - i * TREAD; k.span(M.brownstone, [st.x0 + 0.02, AREA_Y, 0.01], [st.x1 - 0.02, yt, z1], { ink: 0.5 }); k.span(M.brownstoneSm, [st.x0 + 0.02, yt - 0.02, z1 - 0.01], [st.x1 - 0.02, yt + 0.012, z1 + 0.035], { ink: false }); }
  const cheek: [number, number][] = [[0.01, AREA_Y], [STOOP_Z + 0.05, AREA_Y], [STOOP_Z + 0.05, SW_Y + 0.45], [0.75, PF + 0.4], [0.01, PF + 0.4]];
  for (const x of [st.x0 - 0.1, st.x1 + 0.1]) k.ext(M.brownstone, cheek.map(([z, y]) => [z, y]), 0.2, [x, 0, 0], [0, Math.PI / 2, 0]);
  for (const x of [st.x0 - 0.1, st.x1 + 0.1]) {
    const a: [number, number, number] = [x, SW_Y + 1.35, STOOP_Z - 0.15], b: [number, number, number] = [x, PF + 1.35, 0.7];
    k.rod(M.wrought, a, b, 0.025, 8); k.rod(M.wrought, [x, PF + 1.35, 0.7], [x, PF + 1.35, 0.15], 0.025, 8);
    for (let t = 0; t <= 1.0001; t += 1 / 14) { const z = a[2] + (b[2] - a[2]) * t, yb2 = SW_Y + 0.45 + (PF + 0.4 - SW_Y - 0.45) * Math.min(1, Math.max(0, (STOOP_Z + 0.05 - z) / (STOOP_Z + 0.05 - 0.75))); k.rod(M.wrought, [x, yb2, z], [x, a[1] + (b[1] - a[1]) * t, z], 0.01, 5, { ink: false }); }
    k.cyl(M.wrought, 0.05, 0.06, 1.0, [x, SW_Y + 0.95, STOOP_Z - 0.12], [0, 0, 0], 10); k.sphere(M.wrought, 0.07, [x, SW_Y + 1.5, STOOP_Z - 0.12]);
    k.torus(M.wrought, 0.13, 0.016, [x, SW_Y + 1.25, STOOP_Z - 0.3], [0, Math.PI / 2, 0], Math.PI * 1.4, { ink: false });
  }
  // ---- areaway: floor, curb + retaining wall, spear-topped iron fence (both sides of the stoop), gate
  const segs: [number, number][] = [[-w2 + 0.02, st.x0 - 0.22], [st.x1 + 0.22, w2 - 0.02]].filter(([a, b]) => b - a > 0.3) as [number, number][];
  k.span(M.concrete, [-w2, AREA_Y - 0.1, 0.0], [w2, AREA_Y, AREA_Z], { ink: false });
  for (const [a, b] of segs) {
    k.span(M.brownstone, [a, AREA_Y - 0.1, AREA_Z], [b, SW_Y + 0.22, AREA_Z + 0.25]);
    for (let x = a + 0.06; x < b - 0.03; x += 0.12) { k.rod(M.wrought, [x, SW_Y + 0.22, AREA_Z + 0.12], [x, SW_Y + 1.12, AREA_Z + 0.12], 0.011, 5, { ink: false }); k.add(M.wrought, new THREE.ConeGeometry(0.025, 0.09, 6), [x, SW_Y + 1.17, AREA_Z + 0.12]); }
    for (const y of [SW_Y + 0.3, SW_Y + 1.0]) k.span(M.wrought, [a, y - 0.018, AREA_Z + 0.1], [b, y + 0.018, AREA_Z + 0.14]);
    for (const x of [a, b]) { k.span(M.wrought, [x - 0.04, SW_Y + 0.22, AREA_Z + 0.08], [x + 0.04, SW_Y + 1.25, AREA_Z + 0.16]); k.sphere(M.wrought, 0.05, [x, SW_Y + 1.3, AREA_Z + 0.12]); }
  }
  // side returns of the areaway (between neighbours) + retaining wall under the stoop gap
  return { kit: k, bx, st, fl, eave, door, winRects };
};

/** lit rooms behind the windows (home mode): floor, ceiling, back wall with wallpaper, picture rail, lamp, curtains/lace */
export const buildRooms = (M: JM, s: HouseSpec, skipParlour = false) => {
  const k = new Kit(), r = rng(s.seed + 50), { fl } = levels(s), bx = bays(s.w), w2 = s.w / 2, db = doorBay(s);
  const papers = [M.paperA, M.paperB, M.paperC];
  for (let fi = 0; fi < s.storeys; fi++) { if (fi === 0 && skipParlour) continue; const y = fl[fi], H = STOREYS[fi], D = 4.2, paper = papers[Math.floor(r() * 3)];
    k.span(M.floorWood, [-w2 + 0.05, y - 0.06, -D], [w2 - 0.05, y + 0.0, -0.43], { ink: false });
    k.span(M.ceiling, [-w2 + 0.05, y + H - 0.25, -D], [w2 - 0.05, y + H - 0.2, -0.43], { ink: false });
    k.span(paper, [-w2 + 0.05, y, -D - 0.08], [w2 - 0.05, y + H - 0.25, -D], { ink: false });
    for (const sx of [-1, 1]) k.span(paper, [sx * (w2 - 0.05) - (sx > 0 ? 0.06 : 0), y, -D], [sx * (w2 - 0.05) + (sx < 0 ? 0.06 : 0), y + H - 0.25, -0.43], { ink: false });
    k.span(M.wainscot, [-w2 + 0.05, y, -D + 0.0], [w2 - 0.05, y + 0.9, -D + 0.03], { ink: false });
    // furniture silhouettes + a lamp + framed pictures
    const fx = (r() - 0.5) * (s.w - 2.2); k.span(M.furn, [fx - 0.7, y, -D + 0.05], [fx + 0.7, y + 0.85, -D + 0.6], { ink: false });
    k.span(M.frameBrown, [fx - 0.4, y + 1.5, -D + 0.005], [fx + 0.4, y + 2.1, -D + 0.04], { ink: false }); k.span(papers[(fi + 1) % 3], [fx - 0.34, y + 1.56, -D + 0.04], [fx + 0.34, y + 2.04, -D + 0.05], { ink: false });
    const lx = fx + (r() < 0.5 ? -0.95 : 0.95); k.rod(M.brass, [lx, y + 0.85, -D + 0.35], [lx, y + 1.45, -D + 0.35], 0.015, 6, { ink: false }); k.cyl(M.drapeGold, 0.12, 0.22, 0.25, [lx, y + 1.55, -D + 0.35], [0, 0, 0], 12, { ink: false }); k.sphere(M.roomLamp, 0.06, [lx, y + 1.45, -D + 0.35], [1, 1, 1], { ink: false });
    if (r() < 0.6) { const px2 = -fx * 0.6; k.cyl(M.brownstone, 0.14, 0.11, 0.25, [px2, y + 0.13, -D + 0.5], [0, 0, 0], 10, { ink: false }); k.sphere(M.leafA, 0.32, [px2, y + 0.55, -D + 0.5], [1, 1.2, 1], { ink: false }); }
    // curtains / lace per window
    for (let b = 0; b < 3; b++) { if (fi === 0 && b === db) continue; const [ww, hh, so] = WIN[fi], y0 = y + so;
      k.plane(M.lace, ww - 0.2, hh - 0.25, [bx[b], y0 + hh / 2, -0.27], [0, 0, 0]);
      const dr = (M[s.curtain ?? "drapeRed"] as THREE.Material); for (const sd of [-1, 1]) k.span(dr, [bx[b] + sd * (ww / 2 - 0.05) - 0.12, y0 - 0.05, -0.36], [bx[b] + sd * (ww / 2 - 0.05) + 0.12, y0 + hh + 0.2, -0.3], { ink: false });
      k.rod(M.brass, [bx[b] - ww / 2 - 0.15, y0 + hh + 0.22, -0.33], [bx[b] + ww / 2 + 0.15, y0 + hh + 0.22, -0.33], 0.015, 6, { ink: false }); }
  }
  return k;
};
