// The street in front of the old station, dressed per era: 1901 dirt road + raised board sidewalk + hitching posts,
// later asphalt + concrete curbs. Commercial blocks either side (the short3 1880-1925 generator, own specs), a side
// yard with a picket fence beside the station, a wooden power pole whose service drop feeds the firehouse (electric
// light was new in 1901), a street lamp per era, and a painted Livermore Valley backdrop (golden hills, oaks).
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { archMats } from "../short3/archKit";
import { buildNeighbour, type NSpec } from "../short3/Neighbours";
import { cm } from "./mats";
import { OLD, ERA_N, type Era } from "./oldStation";
import { rng, type V3 } from "../../lib/math";

export const ST = { walk: 3.0, road0: 3.0, road1: 13.0, far: 16.0 };
type Shop = NonNullable<NSpec["shop"]>;
const SH = (text: string, bg: string, fg: string, aw: [string, string] | null, goods: string[]): Shop => ({ text, bg, fg, aw, goods });
const SHOPS: Shop[] = [SH("HARDWARE & TINWARE", "#22283a", "#e9d9a0", ["#2e3d6b", "#e8dfc8"], ["#6b6f74", "#8a5a3a", "#3a4a5a", "#b8862e"]), SH("DRUGS", "#1f3b2c", "#f2e2a8", ["#2f6b44", "#efe6cf"], ["#c9d6e0", "#7aa3c4", "#b23a2e", "#efe6cf"]),
  SH("GENERAL MERCHANDISE", "#3a2418", "#f0dcae", ["#8a3a2a", "#efe2c4"], ["#d2462e", "#e3b43a", "#6aa24a", "#efe6cf"]), SH("BAKERY", "#5a1f1c", "#f6e6c0", ["#b22a24", "#f3ecdc"], ["#d6a25a", "#c48a44", "#e9cf9a"]),
  SH("HOTEL", "#4a1418", "#f2d690", null, []), SH("SADDLERY", "#2b2b2b", "#e2c27a", ["#8a6a2a", "#efe6cf"], ["#3a2418", "#5a3a22", "#8a5a3a"]), SH("BANK", "#1b1b1b", "#e2c886", null, []), SH("GROCERIES", "#264028", "#f2e8c4", ["#3f7a3c", "#f1ead8"], ["#d2462e", "#e3b43a", "#6aa24a"])];
const spec = (seed: number, w: number, floors: number, shop: Shop | null, o: Partial<NSpec> = {}): NSpec => { const r = rng(seed);
  return { w, floors, fh: 3.4 + r() * 0.3, brick: (["brickB", "brickC", "brickD", "brickE"] as const)[Math.floor(r() * 4)], trim: r() < 0.5 ? "stone" : "paint", paint: ["#e9dcc0", "#d8c9a6", "#c9b48a"][Math.floor(r() * 3)],
    frame: (["frameGreen", "frameCream", "frameBrown"] as const)[Math.floor(r() * 3)], wins: Math.max(2, Math.round(w / 2.8)), lintel: (["stone", "arch", "hood"] as const)[Math.floor(r() * 3)],
    cornice: (["metal", "stone", "corbel"] as const)[Math.floor(r() * 3)], shop, fire: false, tank: false, depth: 12, seed, ...o }; };
/** [x of the left edge, width, floors, shop] for the near side (fronts face +z at z = 0) and the far side (face -z) */
const NEAR: [number, number, number, number][] = [[-29.0, 12.0, 2, 5], [-17.0, 11.5, 2, 0], [9.0, 10.5, 2, 2], [19.5, 12.0, 3, 4]];
const FAR: [number, number, number, number][] = [[-40, 10.5, 2, 6], [-29.5, 12, 3, 1], [-17.5, 9.5, 2, 3], [-8, 11, 2, 7], [3, 12.5, 3, 4], [15.5, 10, 2, 2], [25.5, 12, 2, 0]];
const buildings = () => once("ctBuildings", () => { const out: { kit: Kit; p: V3; ry: number }[] = [];
  NEAR.forEach(([x, w, fl, sh], i) => out.push({ kit: buildNeighbour(spec(700 + i, w, fl, SHOPS[sh])).kit, p: [x, 0, 0], ry: 0 }));
  FAR.forEach(([x, w, fl, sh], i) => out.push({ kit: buildNeighbour(spec(800 + i, w, fl, SHOPS[sh])).kit, p: [x + w, 0, ST.far], ry: Math.PI }));
  return out; });

/** ground: road, sidewalks/boardwalks, curbs, side yard, fence, hitching posts (era) */
const groundKit = (era: Era) => once(`ctGround${era}`, () => { const M = cm(), A = archMats(), k = new Kit(), old = ERA_N[era] <= 1;
  k.span(old ? M.dirt : M.asphalt, [-80, -0.2, ST.road0], [80, -0.1, ST.road1], { ink: false });
  if (old) { // raised board sidewalks on joists, edge kicker boards, hitching posts with rails
    for (const [z0, z1] of [[0, ST.walk], [ST.road1, ST.far + 0.2]] as [number, number][]) { k.span(M.dirt, [-80, -0.2, z0], [80, -0.1, z1], { ink: false });
      for (let x = -60; x < 60; x += 0.16) k.span(M.boards, [x, 0.06, z0 + 0.02], [x + 0.145, 0.1, z1 - 0.02], { ink: false });
      k.span(M.timber, [-60, -0.1, (z0 > 1 ? z0 : z1) - 0.08], [60, 0.1, (z0 > 1 ? z0 : z1)], { ink: 0.3 }); }
    for (const x of [-12, -9.5, 11, 13.5, -24, 24]) { k.box(M.wood, [0.14, 1.1, 0.14], [x, 0.45, ST.walk + 0.25]); k.box(M.wood, [0.14, 1.1, 0.14], [x + 1.8, 0.45, ST.walk + 0.25]); k.box(M.wood, [2.0, 0.09, 0.09], [x + 0.9, 0.95, ST.walk + 0.25]); }
  } else { // concrete sidewalks with granite curbs
    for (const [z0, z1, c] of [[0, ST.walk, ST.walk], [ST.road1, ST.far + 0.2, ST.road1]] as [number, number, number][]) { k.span(A.paving, [-80, -0.2, z0], [80, 0.04, z1], { ink: false }); k.span(A.granite, [-80, -0.2, c - 0.12], [80, 0.06, c + 0.12], { ink: 0.3 }); }
  }
  // side yard beside the station: packed earth, picket fence + gate, a lean-to woodshed against the neighbour
  k.span(M.dirt, [OLD.W / 2, -0.15, -14], [9.0, -0.05, 0], { ink: false });
  for (let x = OLD.W / 2 + 0.1; x < 9.0; x += 0.14) if (x < 6.6 || x > 7.8) k.ext(M.clapTrim, [[0, 0], [0.08, 0], [0.08, 0.95], [0.04, 1.03], [0, 0.95]], 0.025, [x, 0, -0.05]);
  for (const y of [0.25, 0.8]) k.span(M.clapTrim, [OLD.W / 2, y, -0.1], [9.0, y + 0.08, -0.075]);
  k.span(M.timber, [6.9, 0, -9], [8.9, 2.4, -6], { ink: 0.5 }); k.box(M.joist, [2.3, 0.08, 3.4], [7.9, 2.5, -7.5], [0.18, 0, 0]);
  return k; });

/** wooden power pole with crossarms + glass insulators; wires along the street and a service drop to the firehouse */
const POLE: V3 = [7.4, 0, 2.4];
const poleKit = () => once("ctPole", () => { const M = cm(), k = new Kit(), [x, , z] = POLE;
  k.cyl(M.joist, 0.13, 0.17, 9.6, [x, 4.7, z], [0, 0, 0], 12);
  for (const y of [8.6, 7.8]) { k.box(M.timber, [0.1, 0.12, 2.4], [x, y, z]); for (const dz of [-1.05, -0.55, 0.55, 1.05]) { k.rod(M.castIron, [x, y + 0.06, z + dz], [x, y + 0.16, z + dz], 0.012, 5, { ink: false }); k.lathe(M.glass, [[0, 0], [0.045, 0], [0.05, 0.05], [0.03, 0.1], [0, 0.11]], [x, y + 0.14, z + dz], 10, [0, 0, 0], { ink: false }); } }
  for (const s of [-1, 1]) k.rod(M.castIron, [x, 8.6 - 0.4, z + s * 0.02], [x, 8.6, z + s * 0.6], 0.02, 5, { ink: false });
  for (let y = 1.0; y < 6; y += 0.42) k.rod(M.castIron, [x - 0.13, y, z], [x - 0.3, y, z], 0.015, 4, { ink: false });
  return k; });
const sag = (a: V3, b: V3, d: number, n = 24) => new THREE.CatmullRomCurve3(Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - d * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t); }));
const wiresGeo = () => once("ctWires", () => { const [x, , z] = POLE, gs: THREE.BufferGeometry[] = [];
  for (const y of [8.75, 7.95]) for (const dz of [-1.05, -0.55, 0.55, 1.05]) for (const xb of [x - 42, x + 42]) gs.push(new THREE.TubeGeometry(sag([x, y, z + dz], [xb, y, z + dz], 0.55), 40, 0.007, 4, false));
  gs.push(new THREE.TubeGeometry(sag([x, 7.95, z - 1.05], [OLD.W / 2 - 0.6, 7.6, 0.15], 0.25), 30, 0.008, 4, false));
  gs.push(new THREE.TubeGeometry(sag([x, 7.95, z - 0.55], [OLD.W / 2 - 0.9, 7.6, 0.15], 0.25), 30, 0.008, 4, false));
  return gs; });
/** street lamp: 1901 gas-style lantern on a fluted post, later an electric globe on a cast-iron standard */
const lampKit = (old: boolean) => once(`ctLamp${old}`, () => { const M = cm(), k = new Kit();
  k.lathe(M.castIron, [[0, 0], [0.18, 0], [0.18, 0.12], [0.12, 0.3], [0.08, 0.5], [0.06, 2.9], [0.09, 3.0], [0, 3.02]], [0, 0, 0], 16);
  if (old) { k.box(M.castIron, [0.5, 0.05, 0.05], [0, 2.75, 0]); k.lathe(M.castIron, [[0, 0], [0.14, 0], [0.22, 0.08], [0.22, 0.12], [0, 0.12]], [0, 3.0, 0], 4); k.lathe(M.glass, [[0.13, 0], [0.2, 0.45], [0.05, 0.47]], [0, 3.1, 0], 4, [0, 0, 0], { ink: false });
    k.add(M.castIron, new THREE.ConeGeometry(0.28, 0.25, 4), [0, 3.68, 0], [0, Math.PI / 4, 0]); k.sphere(M.castIron, 0.05, [0, 3.84, 0]); }
  else { k.sphere(M.porcelain, 0.26, [0, 3.25, 0]); k.cyl(M.castIron, 0.1, 0.12, 0.08, [0, 3.02, 0]); }
  return k; });
const hillsTex = () => once("ctHills", () => { const c = document.createElement("canvas"); c.width = 2048; c.height = 512; const g = c.getContext("2d")!, r = rng(5);
  const sky = g.createLinearGradient(0, 0, 0, 512); sky.addColorStop(0, "rgba(0,0,0,0)"); g.fillStyle = sky; g.fillRect(0, 0, 2048, 512);
  const ridge = (base: number, amp: number, col: string, f: number) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, 512); for (let x = 0; x <= 2048; x += 8) g.lineTo(x, base - amp * (0.55 * Math.sin(x * f + 1) + 0.3 * Math.sin(x * f * 2.7 + 2) + 0.15 * Math.sin(x * f * 6.1))); g.lineTo(2048, 512); g.fill(); };
  ridge(300, 90, "#b9b49a", 0.003); ridge(360, 70, "#cdb47a", 0.005); ridge(420, 50, "#c9a660", 0.008);
  for (let i = 0; i < 70; i++) { const x = r() * 2048, y = 330 + r() * 150, s = 6 + r() * 12; g.fillStyle = r() < 0.5 ? "#5d6a3a" : "#4f5a32"; g.beginPath(); g.ellipse(x, y, s * 1.3, s, 0, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; });

export const OldStreet: React.FC<{ era: Era }> = ({ era }) => {
  const M = cm(), B = buildings(), old = ERA_N[era] <= 1;
  const hillM = useMemo(() => new THREE.MeshBasicMaterial({ map: hillsTex(), transparent: true, fog: false, depthWrite: false }), []);
  const wireM = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2622", roughness: 0.6, metalness: 0.4 }), []);
  return <>
    {B.map((b, i) => <group key={i} position={b.p} rotation={[0, b.ry, 0]}><KitMesh kit={b.kit} /></group>)}
    <KitMesh kit={groundKit(era)} />
    <KitMesh kit={poleKit()} />
    {wiresGeo().map((g, i) => <mesh key={i} geometry={g} material={wireM} />)}
    {[[-7.5, 2.6], [17.5, 2.6], [-20, ST.road1 + 0.4], [8, ST.road1 + 0.4]].map(([x, z], i) => <group key={i} position={[x, old ? 0.08 : 0.04, z]}><KitMesh kit={lampKit(old)} /></group>)}
    {[[0, 260, Math.PI], [0, -260, 0]].map(([x, z, ry], i) => <mesh key={i} position={[x, 22, z]} rotation={[0, ry, 0]} material={hillM} renderOrder={-1}><planeGeometry args={[1400, 200]} /></mesh>)}
    {void M}
  </>;
};
