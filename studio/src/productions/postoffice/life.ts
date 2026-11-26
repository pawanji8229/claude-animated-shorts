// Who lives where: the standing fish population of the patch reefs round the office (shared by every underwater layer,
// so the same fish are in the same places whenever we come back). Each school has its own centre path and pace.
import type { School } from "./fish";
import { BOMMIES } from "./reef";
import { height, PO } from "./geo";
import type { V3 } from "../../lib/math";

const over = (x: number, z: number, up: number) => height(x, z) + up;
const loop = (cx: number, cz: number, rx: number, rz: number, w: number, up: number, ph = 0) => (t: number): V3 => { const x = cx + Math.cos(t * w + ph) * rx, z = cz + Math.sin(t * w + ph) * rz; return [x, over(x, z, up), z]; };
const still = (x: number, z: number, up: number) => (): V3 => [x, over(x, z, up), z];
export const REEF_SCHOOLS: School[] = [
  // chromis clouds hovering over branching coral on several bommies
  ...[0, 1, 4, 6, 8, 12].map((b, k): School => ({ sp: "chromis", n: 26 + (k % 3) * 8, centre: still(BOMMIES[b].x, BOMMIES[b].z, 0.9 + (k % 2) * 0.3), radius: [BOMMIES[b].r * 0.55, 0.45, BOMMIES[b].r * 0.55], size: [0.8, 1.2], speed: 1.0, seed: 10 + k * 7, hover: true, minY: 0.35 })),
  // sergeant majors round the office (they follow snorkellers here)
  { sp: "sergeant", n: 22, centre: loop(PO.x + 0.5, PO.z + 1.2, 2.2, 1.6, 0.11, 1.6), radius: [2.6, 0.7, 2.2], size: [0.85, 1.15], speed: 1.0, seed: 101 },
  // convict surgeonfish grazing school, drifting across the sand flats
  { sp: "convict", n: 18, centre: loop(-4, 8, 9, 6, 0.045, 0.6, 1.0), radius: [2.2, 0.35, 1.6], size: [0.85, 1.1], speed: 0.8, seed: 131, minY: 0.3 },
  // Moorish idols + butterflyfish pairs (each pair its own loop)
  { sp: "idol", n: 2, centre: loop(5.5, 3.5, 2.6, 1.8, 0.16, 0.9, 0.4), radius: [0.35, 0.15, 0.3], size: [0.95, 1.05], speed: 0.9, seed: 151 },
  { sp: "butterfly", n: 2, centre: loop(-5.5, 4.0, 1.9, 1.5, -0.2, 0.7, 2.0), radius: [0.25, 0.12, 0.25], size: [0.9, 1.0], speed: 0.9, seed: 161 },
  { sp: "butterfly", n: 2, centre: loop(6.8, -3.2, 1.6, 1.4, 0.18, 0.6, 1.2), radius: [0.25, 0.12, 0.25], size: [0.9, 1.0], speed: 0.9, seed: 171 },
  { sp: "butterfly", n: 2, centre: loop(1.5, 9.5, 2.2, 1.6, -0.15, 0.8, 3.1), radius: [0.25, 0.12, 0.25], size: [0.95, 1.05], speed: 0.9, seed: 181 },
  // anemonefish: tight to their anemones (placed at runtime by the reef layout: nearest anemone to the office)
  // parrotfish roaming between bommies
  { sp: "parrot", n: 1, centre: loop(0, 6, 11, 7, 0.07, 0.9, 0.0), radius: [0.4, 0.2, 0.4], size: [1, 1], speed: 0.6, seed: 191 },
  { sp: "parrot", n: 1, centre: loop(-3, -2, 9, 8, -0.06, 1.1, 2.5), radius: [0.4, 0.2, 0.4], size: [0.85, 0.85], speed: 0.6, seed: 197 },
  // fusiliers passing mid-water
  { sp: "fusilier", n: 40, centre: loop(0, 4, 16, 11, 0.06, 1.9, 4.2), radius: [2.4, 0.6, 1.4], size: [0.85, 1.15], speed: 1.2, seed: 211, minY: 1.2 },
  // cleaner wrasse at the bommies
  ...[1, 3, 5].map((b, k): School => ({ sp: "wrasse", n: 2, centre: still(BOMMIES[b].x + 0.5, BOMMIES[b].z, 0.5), radius: [0.6, 0.25, 0.6], size: [0.9, 1.1], speed: 1.4, seed: 231 + k })),
];
