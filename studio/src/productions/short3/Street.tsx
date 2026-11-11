// short3 street + site (static, merged): ground surfaces with real kerbs (no coplanar overlaps), streetcar track in
// granite setts, overhead trolley wire on span wires, cast-iron lamps, telephone poles, hydrants, manholes, storm
// drains, mailbox, fire-alarm post, police call box, litter bins, newsstand, street sign, trees in iron guards,
// small litter; the cleared lot: site hoarding with posters and a gate, timber + brick stacks, barrels, sawhorse
// barricades with lamps, site hut with stovepipe, wheelbarrow, gravel heaps. Far skyline blocks (tiled facades).
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "./kit";
import { AM, archMats, signTex, pick } from "./archKit";
import { posterMat, buildNeighbour } from "./Neighbours";
import { SIDEWALK, STREET, FAR_WALK } from "./world";
import { V3, rng } from "../../lib/math";

export const TRACK_Z = (STREET[0] + STREET[1]) / 2 + 1.8, WIRE_Y = 6.2;
export const NEAR_POLES = [-45, -15, 15, 45].map((x) => [x, 0.16, SIDEWALK[1] - 0.35] as V3);
export const FAR_POLES = [-45, -15, 15, 45].map((x) => [x, 0.16, FAR_WALK[0] + 0.35] as V3);
export const LAMPS: V3[] = [...[-36, -18, 0, 18, 36].map((x) => [x, 0.16, SIDEWALK[1] - 0.7] as V3), ...[-27, -9, 9, 27].map((x) => [x, 0.16, FAR_WALK[0] + 0.7] as V3)];
export const TIMBER_STACK: V3 = [-16.5, 0, 6.2];

const lampPost = (k: Kit, M: AM, p: V3) => {
  const [x, y, z] = p; k.lathe(M.castIron, [[0, 0], [0.26, 0], [0.26, 0.1], [0.2, 0.18], [0.17, 0.55], [0.1, 0.7], [0.07, 0.9], [0, 0.9]], [x, y, z], 16);
  k.cyl(M.castIron, 0.055, 0.075, 3.3, [x, y + 2.5, z], [0, 0, 0], 12); for (const h of [1.2, 2.1, 3.0]) k.torus(M.castIron, 0.075, 0.018, [x, y + h, z], [Math.PI / 2, 0, 0]);
  k.lathe(M.castIron, [[0, 0], [0.13, 0], [0.1, 0.12], [0.06, 0.2], [0, 0.2]], [x, y + 4.12, z], 12);
  k.sphere(M.lamp, 0.24, [x, y + 4.55, z], [1, 1.25, 1], { ink: 0.5 }); k.lathe(M.castIron, [[0, 0], [0.12, 0], [0.04, 0.16], [0, 0.22]], [x, y + 4.82, z], 12);
  k.rod(M.castIron, [x - 0.35, y + 3.7, z], [x + 0.35, y + 3.7, z], 0.02, 6);   // ladder bar
};
const telePole = (k: Kit, M: AM, p: V3, wire: boolean) => {
  const [x, y, z] = p; k.cyl(M.timberDk, 0.13, 0.17, 9.2, [x, y + 4.6, z], [0, 0, 0], 10);
  for (const h of [8.5, 7.7]) { k.span(M.timberDk, [x - 0.06, y + h - 0.06, z - 1.25], [x + 0.06, y + h + 0.06, z + 1.25]); for (const dz of [-1.1, -0.66, -0.22, 0.22, 0.66, 1.1]) { k.cyl(M.copperGreen, 0.035, 0.045, 0.14, [x, y + h + 0.13, z + dz], [0, 0, 0], 8, { ink: 0.3 }); k.rod(M.timberDk, [x, y + h + 0.06, z + dz], [x, y + h + 0.08, z + dz], 0.015, 5, { ink: false }); } k.rod(M.ironPaint, [x, y + h - 0.6, z], [x, y + h - 0.06, z - 0.8], 0.015, 5, { ink: false }); k.rod(M.ironPaint, [x, y + h - 0.6, z], [x, y + h - 0.06, z + 0.8], 0.015, 5, { ink: false }); }
  for (let s = 0; s < 10; s++) k.rod(M.ironPaint, [x, y + 2.4 + s * 0.45, z], [x + 0.22, y + 2.4 + s * 0.45, z], 0.012, 5, { ink: false });   // step bolts
  if (wire) k.rod(M.ironPaint, [x, y + WIRE_Y + 0.3, z], [x, y + WIRE_Y + 0.25, TRACK_Z], 0.012, 5, { ink: false });
};
const hydrant = (k: Kit, M: AM, p: V3) => { const [x, y, z] = p;
  k.lathe(M.red, [[0, 0], [0.17, 0], [0.17, 0.06], [0.12, 0.1], [0.12, 0.62], [0.15, 0.66], [0.15, 0.72], [0.1, 0.8], [0.05, 0.88], [0, 0.9]], [x, y, z], 16);
  for (const s of [-1, 1]) k.cyl(M.red, 0.05, 0.05, 0.18, [x + s * 0.18, y + 0.5, z], [0, 0, Math.PI / 2], 10); k.cyl(M.red, 0.07, 0.07, 0.16, [x, y + 0.48, z + 0.17], [Math.PI / 2, 0, 0], 10);
  k.cyl(M.brass, 0.03, 0.03, 0.05, [x, y + 0.92, z], [0, 0, 0], 6, { ink: false });
};
const manhole = (k: Kit, M: AM, x: number, z: number, y = 0.02) => { k.cyl(M.castIron, 0.38, 0.38, 0.012, [x, y + 0.005, z], [0, 0, 0], 24, { ink: 0.3 }); for (let i = -2; i <= 2; i++) k.span(M.castIron, [x - 0.3, y + 0.011, z + i * 0.12 - 0.015], [x + 0.3, y + 0.016, z + i * 0.12 + 0.015], { ink: false }); };
const drain = (k: Kit, M: AM, x: number, z: number, dir: number) => { k.span(M.castIron, [x - 0.45, 0.02, z - 0.02 * dir], [x + 0.45, 0.028, z + 0.32 * dir], { ink: 0.3 }); for (let i = 0; i < 8; i++) k.span(M.black, [x - 0.4 + i * 0.11, 0.028, z + 0.03 * dir], [x - 0.36 + i * 0.11, 0.03, z + 0.28 * dir], { ink: false }); };
const bin = (k: Kit, M: AM, p: V3) => { const [x, y, z] = p; k.cyl(M.ironPaint, 0.26, 0.22, 0.75, [x, y + 0.38, z], [0, 0, 0], 14); k.cyl(M.ironPaint, 0.28, 0.28, 0.05, [x, y + 0.78, z], [0, 0, 0], 14); k.sphere(M.ironPaint, 0.05, [x, y + 0.83, z]); for (const h of [0.2, 0.55]) k.torus(M.ironPaint, 0.25, 0.012, [x, y + h, z], [Math.PI / 2, 0, 0]); };
const litterA = new THREE.MeshStandardMaterial({ color: "#b8ae98", roughness: 0.95 }), litterB = new THREE.MeshStandardMaterial({ color: "#8f8676", roughness: 0.95 });
const litter = (k: Kit, M: AM, r: () => number, x0: number, x1: number, z0: number, z1: number, y: number, n: number) => { for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); k.plane(pick(r, [litterA, litterB, M.canvasTarp]), 0.14 + r() * 0.12, 0.1 + r() * 0.1, [x, y + 0.004 + r() * 0.003, z], [-Math.PI / 2, 0, r() * 6]); } };
const tree = (k: Kit, M: AM, p: V3, s: number) => { const [x, y, z] = p;
  k.span(M.castIron, [x - 0.7, y + 0.003, z - 0.7], [x + 0.7, y + 0.012, z + 0.7], { ink: 0.3 }); for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.rod(M.castIron, [x + a * 0.35, y, z + b * 0.35], [x + a * 0.35, y + 1.2, z + b * 0.35], 0.012, 5, { ink: false });
  for (const h of [0.6, 1.2]) for (const [a, b, c, d] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) k.rod(M.castIron, [x + a * 0.35, y + h, z + b * 0.35], [x + c * 0.35, y + h, z + d * 0.35], 0.01, 5, { ink: false });
  k.cyl(M.timberDk, 0.1 * s, 0.16 * s, 3.4 * s, [x, y + 1.7 * s, z], [0, 0, 0], 8); for (const [a, b] of [[0.5, 0.3], [-0.5, 0.6], [0.2, -0.6]]) k.rod(M.timberDk, [x, y + 2.6 * s, z], [x + a * s, y + 3.6 * s, z + b * s], 0.05 * s, 6);
};

/** static street + site kit */
export const useStreetKit = () => once("streetKit", () => {
  const M = archMats(), k = new Kit(), r = rng(77), X0 = -95, X1 = 95;
  // ground: lot (gravel) behind the near sidewalk; near sidewalk + kerb; street; far sidewalk + kerb; ground beyond
  k.span(M.gravel, [X0, -0.2, -60], [X1, 0.0, SIDEWALK[0] - 0.02], { ink: false, cast: false });
  k.span(M.paving, [X0, -0.2, SIDEWALK[0] - 0.02], [X1, 0.16, SIDEWALK[1] - 0.3], { ink: false, cast: false });
  k.span(M.granite, [X0, -0.2, SIDEWALK[1] - 0.3], [X1, 0.165, SIDEWALK[1]], { ink: false });
  k.span(M.asphalt, [X0, -0.3, STREET[0]], [X1, 0.02, STREET[1]], { ink: false, cast: false });
  k.span(M.setts, [X0, -0.3, TRACK_Z - 1.15], [X1, 0.026, TRACK_Z + 1.15], { ink: false, cast: false });
  for (const o of [-0.72, 0.72]) { k.span(M.rust, [X0, 0.026, TRACK_Z + o - 0.04], [X1, 0.04, TRACK_Z + o - 0.01], { ink: false }); k.span(M.rust, [X0, 0.026, TRACK_Z + o + 0.01], [X1, 0.034, TRACK_Z + o + 0.04], { ink: false }); }
  k.span(M.granite, [X0, -0.2, STREET[1]], [X1, 0.165, STREET[1] + 0.3], { ink: false });
  k.span(M.paving, [X0, -0.2, STREET[1] + 0.3], [X1, 0.16, FAR_WALK[1] + 30], { ink: false, cast: false });
  // painted lane edge lines (worn) — period cities had few markings: a faded centre line + crossing stripes
  const lineM = new THREE.MeshStandardMaterial({ color: "#cfc6b0", roughness: 0.9, transparent: true, opacity: 0.55 });
  for (let x = X0; x < X1; x += 6) k.span(lineM, [x, 0.02, STREET[0] + 3.2 - 0.05], [x + 2.6, 0.023, STREET[0] + 3.2 + 0.05], { ink: false, cast: false });
  // poles, wires, trolley wire, lamps
  NEAR_POLES.forEach((p) => telePole(k, M, p, true)); FAR_POLES.forEach((p) => telePole(k, M, p, true));
  for (const poles of [NEAR_POLES, FAR_POLES]) for (let i = 0; i < poles.length - 1; i++) for (const dz of [-1.1, -0.66, 0.66, 1.1]) for (const h of [8.63, 7.83]) {
    const a: V3 = [poles[i][0], h + 0.16, poles[i][2] + dz], b: V3 = [poles[i + 1][0], h + 0.16, poles[i + 1][2] + dz], n = 8;
    for (let s = 0; s < n; s++) { const t0 = s / n, t1 = (s + 1) / n, sag = (t: number) => -0.45 * 4 * t * (1 - t); k.rod(M.black, [a[0] + (b[0] - a[0]) * t0, a[1] + sag(t0), a[2]], [a[0] + (b[0] - a[0]) * t1, a[1] + sag(t1), a[2]], 0.01, 4, { ink: false, cast: false }); } }
  k.rod(M.black, [X0, WIRE_Y + 0.16, TRACK_Z], [X1, WIRE_Y + 0.16, TRACK_Z], 0.014, 5, { ink: false, cast: false });
  LAMPS.forEach((p) => lampPost(k, M, p));
  // street sign on the first lamp, hydrants, manholes, drains, mailbox, fire-alarm post, police call box, bins, newsstand
  const sgn = new THREE.MeshStandardMaterial({ map: signTex("MERIDIAN ST", "#1f2a3a", "#f2ead2", 512, 110, "Arial, sans-serif", "#f2ead2"), roughness: 0.5 });
  k.plane(sgn, 0.9, 0.2, [LAMPS[1][0], 3.35, LAMPS[1][2] + 0.03], [0, 0, 0], { uv01: true }); k.plane(sgn, 0.9, 0.2, [LAMPS[1][0], 3.35, LAMPS[1][2] - 0.03], [0, Math.PI, 0], { uv01: true });
  hydrant(k, M, [-8.0, 0.16, SIDEWALK[1] - 0.6]); hydrant(k, M, [31, 0.16, FAR_WALK[0] + 0.6]);
  for (const [x, z] of [[-30, STREET[0] + 2.6], [4, STREET[0] + 5.2], [38, STREET[0] + 2.4], [-60, STREET[0] + 5]]) manhole(k, M, x, z);
  for (const x of [-52, -22, 12, 52]) drain(k, M, x, STREET[0] + 0.01, 1); for (const x of [-40, 0, 40]) drain(k, M, x, STREET[1] - 0.01, -1);
  for (const [x, z] of [[-10, SIDEWALK[0] + 0.6], [22, SIDEWALK[0] + 0.7]]) { k.span(M.castIron, [x - 0.5, 0.16, z - 0.4], [x + 0.5, 0.168, z + 0.4], { ink: 0.3 }); for (let i = 0; i < 5; i++) k.span(M.black, [x - 0.45, 0.168, z - 0.32 + i * 0.16], [x + 0.45, 0.17, z - 0.3 + i * 0.16], { ink: false }); }   // cellar doors (steel)
  const mb: V3 = [-4.6, 0.16, SIDEWALK[1] - 0.8]; for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.span(M.green, [mb[0] + a * 0.22 - 0.03, 0.16, mb[2] + b * 0.18 - 0.03], [mb[0] + a * 0.22 + 0.03, 0.75, mb[2] + b * 0.18 + 0.03]);
  k.span(M.green, [mb[0] - 0.27, 0.75, mb[2] - 0.23], [mb[0] + 0.27, 1.25, mb[2] + 0.23]); k.cyl(M.green, 0.23, 0.23, 0.54, [mb[0], 1.25, mb[2]], [0, 0, Math.PI / 2], 16); k.span(M.black, [mb[0] - 0.15, 1.15, mb[2] + 0.235], [mb[0] + 0.15, 1.19, mb[2] + 0.25], { ink: false });
  const fa: V3 = [-20, 0.16, SIDEWALK[1] - 0.7]; k.cyl(M.red, 0.07, 0.1, 2.2, [fa[0], 1.26, fa[2]], [0, 0, 0], 10); k.span(M.red, [fa[0] - 0.16, 1.3, fa[2] - 0.12], [fa[0] + 0.16, 1.75, fa[2] + 0.12]); k.sphere(M.lampDim, 0.12, [fa[0], 2.5, fa[2]]);
  const pb: V3 = [24, 0.16, FAR_WALK[0] + 0.8]; k.cyl(M.frameGreen, 0.2, 0.25, 1.9, [pb[0], 1.11, pb[2]], [0, 0, 0], 12); k.span(M.frameGreen, [pb[0] - 0.26, 1.4, pb[2] - 0.26], [pb[0] + 0.26, 2.0, pb[2] + 0.26]); k.lathe(M.frameGreen, [[0, 0], [0.3, 0], [0.12, 0.3], [0, 0.34]], [pb[0], 2.0, pb[2]], 12); k.sphere(M.red, 0.07, [pb[0], 2.38, pb[2]]);
  for (const p of [[-17, 0.16, SIDEWALK[1] - 0.9], [19, 0.16, SIDEWALK[1] - 0.9], [-6, 0.16, FAR_WALK[0] + 0.9], [34, 0.16, FAR_WALK[0] + 0.9]] as V3[]) bin(k, M, p);
  const ns: V3 = [-3, 0.16, FAR_WALK[0] + 1.6]; k.span(M.frameGreen, [ns[0] - 1.0, 0.16, ns[2] - 0.5], [ns[0] + 1.0, 1.0, ns[2] + 0.5]); k.span(M.frameGreen, [ns[0] - 1.1, 2.2, ns[2] - 0.65], [ns[0] + 1.1, 2.3, ns[2] + 0.7]); for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.span(M.frameGreen, [ns[0] + a * 0.98 - 0.04, 1.0, ns[2] + b * 0.48 - 0.04], [ns[0] + a * 0.98 + 0.04, 2.2, ns[2] + b * 0.48 + 0.04]);
  for (let i = 0; i < 9; i++) k.span(pick(r, [M.paper, M.cream]), [ns[0] - 0.9 + i * 0.2, 1.0, ns[2] - 0.45], [ns[0] - 0.75 + i * 0.2, 1.06 + r() * 0.04, ns[2] - 0.1], { ink: false });
  for (const x of [-27, -9, 9, 27, 45]) tree(k, M, [x, 0.16, FAR_WALK[0] + 2.0], 1 + r() * 0.15);
  litter(k, M, r, -60, 60, SIDEWALK[0] + 0.5, SIDEWALK[1] - 0.6, 0.16, 9); litter(k, M, r, -60, 60, STREET[0] + 0.05, STREET[0] + 0.4, 0.02, 10); litter(k, M, r, -60, 60, FAR_WALK[0] + 0.4, FAR_WALK[1] - 0.4, 0.16, 7);
  // ---- the cleared lot: hoarding along the sidewalk (gate at x -24..-18), posters
  const hz = SIDEWALK[0] - 0.25;
  for (const [a, b] of [[-64, -24.2], [-17.8, -13.4]]) { k.span(M.timber, [a, 0.0, hz - 0.04], [b, 2.4, hz + 0.02]); for (let x = a + 0.2; x < b; x += 2.4) k.span(M.timberDk, [x - 0.06, 0, hz - 0.18], [x + 0.06, 2.5, hz - 0.04]); k.span(M.timberDk, [a, 2.38, hz - 0.08], [b, 2.48, hz + 0.05]); }
  for (let i = 0; i < 12; i++) { const x = -62 + i * 3.4 + (i > 10 ? 6 : 0); if (x > -25 && x < -17) continue; k.plane(posterMat(i), 0.85, 1.2, [x, 1.35 + (i % 2) * 0.1, hz + 0.03], [0, 0, (r() - 0.5) * 0.04], { uv01: true }); }
  for (const x of [-24.2, -17.8]) k.span(M.timberDk, [x - 0.12, 0, hz - 0.12], [x + 0.12, 2.9, hz + 0.12]);
  // site materials (well clear of the move path)
  const stack = (p: V3, n: number, L: number) => { for (let l = 0; l < n; l++) for (let j = 0; j < 5 - (l % 2); j++) k.span(M.timber, [p[0] - L / 2, p[1] + l * 0.22, p[2] - 1.0 + j * 0.42 + (l % 2) * 0.21], [p[0] + L / 2, p[1] + l * 0.22 + 0.2, p[2] - 1.0 + j * 0.42 + (l % 2) * 0.21 + 0.2]); for (const x of [-L / 2 + 0.4, L / 2 - 0.4]) k.span(M.timberDk, [p[0] + x - 0.06, p[1] - 0.12, p[2] - 1.2], [p[0] + x + 0.06, p[1], p[2] + 1.0]); };
  stack([TIMBER_STACK[0], 0.12, TIMBER_STACK[2]], 4, 3.8); stack([-50, 0.12, -6], 5, 4.2); stack([4, 0.12, -38], 6, 4.5);
  for (const [bx, bz] of [[-46, 2], [-44, -2.5], [9, -36]]) { k.span(M.timberDk, [bx - 0.6, 0, bz - 0.6], [bx + 0.6, 0.12, bz + 0.6]); for (let l = 0; l < 6; l++) for (let j = 0; j < 3; j++) for (let q = 0; q < 2; q++) k.span(M.brickB, [bx - 0.55 + q * 0.56, 0.12 + l * 0.075, bz - 0.55 + j * 0.37], [bx - 0.01 + q * 0.56, 0.19 + l * 0.075, bz - 0.2 + j * 0.37], { ink: false }); }
  for (const [x, z] of [[-48, 6], [-47.3, 6.6], [-12.5, -10], [14, -30]]) { k.cyl(M.ironPaint, 0.3, 0.3, 0.88, [x, 0.44, z], [0, 0, 0], 14); for (const h of [0.15, 0.73]) k.torus(M.rust, 0.305, 0.02, [x, h, z], [Math.PI / 2, 0, 0]); }
  const horse = (x: number, z: number, ry: number) => { const g = new Kit(), stripe = M.cream; g.span(stripe, [-1.1, 0.95, -0.05], [1.1, 1.13, 0.05]); for (let s = -1; s <= 1; s += 0.5) g.span(M.red, [s - 0.12, 0.952, 0.05], [s + 0.12, 1.128, 0.054], { ink: false }); for (const s of [-1, 1]) for (const d of [-1, 1]) g.rod(M.timber, [s * 0.9, 1.0, 0], [s * 1.0, 0, d * 0.35], 0.035, 6); g.sphere(M.lampDim, 0.07, [0.8, 1.22, 0]); k.merge(g, [x, 0, z], [0, ry, 0]); };
  horse(-20.5, SIDEWALK[0] + 0.9, 0); horse(-14.5, 10.4, 0.2); horse(-52, 8.0, 0);
  // site hut with stovepipe (smoke is animated separately), wheelbarrow, gravel heaps, tool chest
  const ht: V3 = [-56, 0, -2]; k.span(M.timber, [ht[0] - 2, 0, ht[2] - 1.5], [ht[0] + 2, 2.4, ht[2] + 1.5]); k.ext(M.roofTar, [[-2.3, 0], [2.3, 0], [2.3, 0.1], [-2.3, 0.7]], 3.4, [ht[0], 2.4, ht[2]]);
  k.span(M.frameBrown, [ht[0] - 0.4, 0, ht[2] + 1.5], [ht[0] + 0.4, 2.0, ht[2] + 1.55]); k.plane(M.glass, 0.8, 0.6, [ht[0] + 1.2, 1.5, ht[2] + 1.52]); k.cyl(M.castIron, 0.09, 0.09, 1.4, [ht[0] + 1.4, 3.3, ht[2] - 0.6], [0, 0, 0], 10);
  const wb = new Kit(); wb.ext(M.ironPaint, [[-0.45, 0.15], [0.45, 0.15], [0.6, 0.55], [-0.6, 0.55]], 0.6, [0, 0.2, 0]); wb.cyl(M.rubber, 0.2, 0.2, 0.08, [0.75, 0.2, 0], [Math.PI / 2, 0, 0], 14); for (const s of [-1, 1]) wb.rod(M.timberDk, [0.75, 0.2, s * 0.08], [-1.0, 0.65, s * 0.3], 0.03, 6); k.merge(wb, [-45, 0, 5.2], [0, 0.6, 0]);
  for (const [x, z, R] of [[-58, 4, 2.2], [16, -34, 2.6], [-8, -40, 1.8]]) k.lathe(M.gravel, [[0, 0], [R, 0], [R * 0.5, R * 0.35], [0, R * 0.45]], [x, 0, z], 18, [0, 0, 0], { ink: 0.4 });
  k.span(M.frameGreen, [-49, 0, 7.6], [-47.8, 0.6, 8.2]); k.span(M.brass, [-48.5, 0.45, 8.2], [-48.3, 0.5, 8.22], { ink: false });
  return k;
});

/** distant blocks: lite versions of the real building generator (3D frames + glass, no rooms), never stretched */
export const Skyline: React.FC = () => {
  const B = once("skyline", () => { const r = rng(31), out: { kit: Kit; p: V3; ry: number }[] = [];
    const row = (z: number, ry: number, x0: number, x1: number, hmin: number, hmax: number, seed: number) => { let x = x0, i = 0; while (x < x1) { const w = 10 + Math.floor(r() * 4) * 2, fl = Math.round(hmin + r() * (hmax - hmin));
      const b = buildNeighbour({ w, floors: fl, fh: 3.4 + r() * 0.4, brick: pick(r, ["brickB", "brickC", "brickD", "brickE"] as const), trim: r() < 0.6 ? "stone" : "paint", paint: pick(r, ["#5a4a3a", "#6b6b5e", "#7a6a52"]), frame: pick(r, ["frameGreen", "frameCream", "frameWhite"] as const),
        wins: Math.max(2, Math.round(w / 2.6)), lintel: pick(r, ["stone", "arch", "hood"] as const), cornice: pick(r, ["metal", "stone", "corbel"] as const), shop: null, fire: false, tank: r() < 0.5, depth: 12, seed: seed + i, lite: true });
      out.push({ kit: b.kit, p: [ry ? x + w : x, 0, z], ry }); x += w + (r() < 0.2 ? 3 : 0); i++; } };
    row(FAR_WALK[1] + 26, Math.PI, -110, 110, 5, 11, 2000); row(-66, 0, -110, 90, 4, 10, 3000);
    return out; });
  return <>{B.map((b, i) => <group key={i} position={b.p} rotation={[0, b.ry, 0]}><KitMesh kit={b.kit} inkScale={0.7} /></group>)}</>;
};
export const StreetStatic: React.FC = () => { const kit = useStreetKit(); return <KitMesh kit={kit} />; };
