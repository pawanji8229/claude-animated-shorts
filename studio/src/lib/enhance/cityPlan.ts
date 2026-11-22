// Optional enhancement (off unless a scene imports it): deterministic street-block + lot planning for detailed
// architectural environments. Own code; the ideas (recursive block splitting, height falling off with distance from a
// centre, street hierarchy) follow jstrait/city-tour (MIT) and wadi's parametric approach (MIT), without their apps.
// Output is plain data (blocks, lots with frontage direction and a height class) that an existing generator such as
// boeing/town.tsx `addHouse` or short3 `Neighbours` turns into geometry. Seeded => the same city in every cloud chunk.
import { rng } from "../math";

export type Rect = { x0: number; z0: number; x1: number; z1: number };
export type Lot = Rect & { cx: number; cz: number; w: number; d: number; ry: number; storeys: number; use: "house" | "shop" | "industrial" | "park" };
export type CityPlan = { blocks: Rect[]; streetsX: number[]; streetsZ: number[]; lots: Lot[] };
export type CityOpts = { size: [number, number]; block: [number, number]; street: number; lotW: [number, number]; depth: number; centre?: [number, number]; maxStoreys?: number; parkChance?: number; seed: number };

/** a grid of street blocks with jittered spacing, then lots along both long sides of each block */
export const planCity = (o: CityOpts): CityPlan => {
  const r = rng(o.seed), [W, D] = o.size, cx = o.centre?.[0] ?? 0, cz = o.centre?.[1] ?? 0, maxS = o.maxStoreys ?? 3;
  const lines = (L: number, b: number) => { const out = [-L / 2]; while (out[out.length - 1] < L / 2 - b * 0.6) out.push(out[out.length - 1] + b * (0.85 + r() * 0.3)); out[out.length - 1] = L / 2; return out; };
  const xs = lines(W, o.block[0]), zs = lines(D, o.block[1]), blocks: Rect[] = [], lots: Lot[] = [], hs = o.street / 2;
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const b: Rect = { x0: xs[i] + hs, x1: xs[i + 1] - hs, z0: zs[j] + hs, z1: zs[j + 1] - hs }; if (b.x1 - b.x0 < 6 || b.z1 - b.z0 < 6) continue; blocks.push(b);
    const park = r() < (o.parkChance ?? 0.05);
    for (const side of [-1, 1]) { // lots front onto the z-streets on both sides of the block
      let x = b.x0; const dep = Math.min(o.depth, (b.z1 - b.z0) / 2);
      while (x < b.x1 - o.lotW[0] * 0.8) { const w = Math.min(b.x1 - x, o.lotW[0] + r() * (o.lotW[1] - o.lotW[0]));
        const zF = side < 0 ? b.z0 : b.z1, zB = zF - side * dep, lcx = x + w / 2, lcz = (zF + zB) / 2;
        const dist = Math.hypot(lcx - cx, lcz - cz) / Math.hypot(W / 2, D / 2), storeys = Math.max(1, Math.round(1 + (maxS - 1) * Math.max(0, 1 - dist) ** 1.5 + (r() - 0.5) * 0.8));
        lots.push({ x0: x, x1: x + w, z0: Math.min(zF, zB), z1: Math.max(zF, zB), cx: lcx, cz: lcz, w, d: dep, ry: side < 0 ? Math.PI : 0, storeys: park ? 0 : storeys, use: park ? "park" : storeys >= 3 && r() < 0.5 ? "shop" : "house" });
        x += w; } } }
  return { blocks, streetsX: xs, streetsZ: zs, lots };
};
/** lots whose centre lies inside a rectangle (e.g. excluded for a hero building or a construction site) */
export const lotsIn = (p: CityPlan, rc: Rect) => p.lots.filter((l) => l.cx >= rc.x0 && l.cx <= rc.x1 && l.cz >= rc.z0 && l.cz <= rc.z1);
