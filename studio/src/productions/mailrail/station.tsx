// ORIGINAL: Post Office Railway station chamber (25 ft class): a brick-lined vault over two tracks with a loading platform
// on each side, glazed-tile dado, cast-iron ribs, hanging enamel lamps, mail chutes from the sorting office above,
// a belt conveyor (unloading station), lift gates, enamel name boards, staff notices, a wall clock and a year calendar.
// Local frame = tunnel frame (x along, y = 0 rail top, tunnel axis z = 0, tracks z = ±0.55). Station spans x 0..L.
// Platform edges stand 4 cm off the train's widest part; platform top (0.62) is at container-rim height for loading.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, once } from "../short3/kit";
import { signTex } from "../short3/archKit";
import { pm } from "./pbr";
import { MKit } from "./cutaway";
import { R_TUN, AXIS, TRACK_Z } from "./tunnel";
import { TrackOnly } from "./tunnel";
import { Instances, type Place } from "./models";
import { BagRack, type BagPlace } from "./mailbag";
import { rng, type V3 } from "../../lib/math";

export const RS = 3.6, SAX = 1.4, PLAT_Y = 0.62, EDGE = 1.04, ST_L = 30;
const SM = {
  vault: () => once("mrVault", () => pm("plaster", 1.6, { tint: "#ece6d8", side: THREE.BackSide })),
  tiles: () => once("mrTilesW", () => pm("tiles", 1.2, { tint: "#f2efe6", side: THREE.BackSide })),
  tilesB: () => once("mrTilesB", () => pm("tiles", 1.2, { tint: "#6f8a6a", side: THREE.BackSide })),
  rib: () => once("mrRib", () => pm("rust", 0.8, { tint: "#5a5a58", metal: 0.4 })),
  plat: () => once("mrPlat", () => pm("paving", 1.2, { tint: "#b8b2a6" })),
  platSide: () => once("mrPlatSide", () => pm("concrete", 1.4, { tint: "#a8a296" })),
  edge: () => once("mrEdge", () => new THREE.MeshStandardMaterial({ color: "#e8e2c8", roughness: 0.6 })),
  brick: () => once("mrBrickR", () => pm("brickR", 1.6, { tint: "#c8b0a0" })),
  wood: () => once("mrWood", () => pm("oak", 0.9, { tint: "#8a6a4a" })),
  steel: () => once("mrStSteel", () => pm("rust", 0.6, { tint: "#7a7874", metal: 0.6 })),
  chute: () => once("mrChute", () => new THREE.MeshStandardMaterial({ color: "#8a8c88", metalness: 0.8, roughness: 0.35 })),
  belt: () => once("mrBelt", () => new THREE.MeshStandardMaterial({ color: "#2a2826", roughness: 0.85 })),
  brass: () => once("mrStBrass", () => new THREE.MeshStandardMaterial({ color: "#b89048", metalness: 0.9, roughness: 0.35 })),
  green: () => once("mrStGreen", () => new THREE.MeshStandardMaterial({ color: "#3e5a44", roughness: 0.55 })),
  red: () => once("mrStRed", () => new THREE.MeshStandardMaterial({ color: "#a8201b", roughness: 0.45 })),
  bulb: () => once("mrStBulb", () => new THREE.MeshStandardMaterial({ color: "#fff4dc", emissive: "#ffdca0", emissiveIntensity: 2.4 })),
  dark: () => once("mrStDark", () => new THREE.MeshStandardMaterial({ color: "#0c0b0a", roughness: 1 })),
};
const signMat = (key: string, text: string, bg: string, fg: string, w = 1024, h = 160) => once(`mrSign${key}`, () => new THREE.MeshStandardMaterial({ map: signTex(text, bg, fg, w, h, "Georgia, serif", "#e8d8a8"), roughness: 0.35 }));
/** wall y at angle a on the chamber circle */
const wall = (a: number, inset = 0): [number, number] => [SAX + Math.sin(a) * (RS - inset), Math.cos(a) * (RS - inset)];
const angAtY = (y: number, side: number) => { const s = Math.asin((y - SAX) / RS); return side > 0 ? s : Math.PI - s; };   // angle on side z>0 / z<0

export type StationId = "A" | "B";
const stationKit = (id: StationId) => once(`mrStation${id}`, () => { const k = new Kit(), L = ST_L;
  // vault skin: tiles below the dado (y < 2.4 on each side), plaster above; 3 m cast-iron ribs
  const aLo = angAtY(PLAT_Y - 0.05, 1), aDado = angAtY(2.4, 1);
  const skin = (a0: number, a1: number, mat: THREE.Material) => { const g = new THREE.CylinderGeometry(RS, RS, L, 64, 1, true, a0, a1 - a0); g.rotateZ(-Math.PI / 2);
    const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (a1 - a0) * RS, uv.getY(i) * L); k.add(mat, g, [L / 2, SAX, 0], [0, 0, 0], [1, 1, 1], { ink: false, cast: false }); };
  // CylinderGeometry theta is measured from +z toward +x around y; after rotateZ(-90deg) the circle lies in the y-z plane:
  // y = -r sin(theta), z = r cos(theta). Our wall angle a has y = r sin(a), z = r cos(a), so theta = -a.
  const band = (a0: number, a1: number, m: THREE.Material) => skin(-a1, -a0, m);
  band(aLo, aDado, SM.tiles()); band(Math.PI - aDado, Math.PI - aLo, SM.tiles());
  band(aDado, Math.PI - aDado, SM.vault());
  for (const s of [1, -1]) { const a0 = s > 0 ? aDado : Math.PI - aDado - 0.04, a1 = a0 + 0.04; band(a0, a1, SM.tilesB()); }       // green dado band (overlaps by an inset, below)
  for (let x = 1.5; x < L; x += 3) {                                                                                              // ribs over the vault
    const prof = [[RS + 0.02, -0.06], [RS - 0.12, -0.06], [RS - 0.12, 0.06], [RS + 0.02, 0.06]].map(([a, b]) => new THREE.Vector2(a, b));
    const g = new THREE.LatheGeometry(prof, 48, -(Math.PI - aDado), Math.PI - 2 * aDado); g.rotateZ(-Math.PI / 2); k.add(SM.rib(), g, [x, SAX, 0], [0, 0, 0], [1, 1, 1], { ink: 0.35, cast: false }); }
  // platforms: paved top, concrete face, painted coping, bricked back wall below the tiles
  for (const s of [1, -1]) { const zEdge = s * EDGE, zWall = s * (Math.cos(aLo) * RS + 0.05), zc = (zEdge + zWall) / 2, w = Math.abs(zWall - zEdge);
    k.box(SM.plat(), [L, 0.1, w], [L / 2, PLAT_Y - 0.05, zc], [0, 0, 0], { ink: false });
    k.box(SM.platSide(), [L, PLAT_Y + 0.17, 0.3], [L / 2, (PLAT_Y - 0.17) / 2 - 0.05, zEdge + s * 0.15], [0, 0, 0], { ink: 0.4 });
    k.box(SM.edge(), [L, 0.022, 0.16], [L / 2, PLAT_Y + 0.011, zEdge + s * 0.08], [0, 0, 0], { ink: false });
    k.box(SM.platSide(), [L, PLAT_Y + 0.2, w - 0.3], [L / 2, (PLAT_Y - 0.2) / 2 - 0.1, zc + s * 0.15], [0, 0, 0], { ink: false, cast: false });
    for (let x = 2; x < L; x += 4) k.box(SM.dark(), [0.5, 0.25, 0.02], [x, 0.2, zEdge + s * 0.001 - s * 0.012], [0, 0, 0], { ink: false });   // refuge recesses under the edge (shadow gaps)
  }
  k.box(pm("concrete", 2, { tint: "#8a867c" }), [L, 0.06, 2 * EDGE + 0.02], [L / 2, -0.15, 0], [0, 0, 0], { ink: false, cast: false });  // trackbed between platforms
  // end headwalls with the tunnel mouths
  for (const e of [0, L]) { const sh = new THREE.Shape(); sh.absarc(0, SAX, RS + 0.05, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(0, AXIS, R_TUN + 0.02, 0, Math.PI * 2, true); sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false, curveSegments: 48 }); g.translate(0, 0, -0.2); g.rotateY(Math.PI / 2);
    k.add(SM.brick(), g, [e + (e === 0 ? -0.2 : 0.2), 0, 0], [0, 0, 0], [1, 1, 1], { ink: 0.5, cast: false });
    const ring = new THREE.TorusGeometry(R_TUN + 0.12, 0.1, 8, 48); ring.rotateY(Math.PI / 2); k.add(pm("stucco", 1, { tint: "#e0d8c4" }), ring, [e + (e === 0 ? 0.02 : -0.02), AXIS, 0], [0, 0, 0], [1, 1, 1], { ink: 0.4, cast: false }); }
  // name boards (enamel) on the back wall of each platform + staff notices
  const name = id === "A" ? "MOUNT PLEASANT" : "LIVERPOOL STREET";
  for (const s of [1, -1]) { const [y, z] = wall(s > 0 ? angAtY(1.75, 1) : angAtY(1.75, -1), 0.08);
    for (const x of [6, 18]) { k.box(SM.dark(), [2.6, 0.5, 0.04], [x, y, z], [s > 0 ? -0.1 : 0.1, 0, 0], { ink: 0.4 });
      k.plane(signMat(`n${id}`, name, "#a8201b", "#f4ecd8"), 2.5, 0.4, [x, y, z - s * 0.025], [s > 0 ? -0.1 : 0.1, s > 0 ? Math.PI : 0, 0], { uv01: true, cast: false }); }
    k.plane(signMat("np", "STAFF ONLY • NO PASSENGERS", "#1d2a40", "#f0e8d0", 1024, 128), 1.6, 0.2, [12, y + 0.2, z - s * 0.03], [s > 0 ? -0.1 : 0.1, s > 0 ? Math.PI : 0, 0], { uv01: true, cast: false });
    k.plane(signMat("nk", "KEEP CLEAR OF THE TRACK", "#f0e8d0", "#a8201b", 1024, 128), 1.4, 0.18, [24, y - 0.15, z - s * 0.03], [s > 0 ? -0.1 : 0.1, s > 0 ? Math.PI : 0, 0], { uv01: true, cast: false }); }
  // lamp cables + ceiling roses along both platforms
  for (const s of [1, -1]) for (let x = 2.5; x < L; x += 5) { const [y, z] = wall(Math.PI / 2 - s * 0.55, 0.05); k.cyl(SM.steel(), 0.07, 0.09, 0.05, [x, y - 0.02, z], [0, 0, 0], 12, { ink: false, cast: false }); }
  // a cable trunking along the vault crown
  k.box(SM.steel(), [L, 0.08, 0.14], [L / 2, SAX + RS - 0.16, 0], [0, 0, 0], { ink: false, cast: false });
  // lift gates on platform A's back wall (station A: mail lift to the sorting office), cage lattice in brass
  const lx = id === "A" ? 23 : 4, [ly, lz] = wall(angAtY(1.6, -1), 0.02);
  k.box(SM.dark(), [1.8, 2.0, 0.3], [lx, PLAT_Y + 1.0, lz + 0.12], [0, 0, 0], { ink: 0.5 });
  for (let i = 0; i <= 9; i++) k.box(SM.brass(), [0.02, 1.9, 0.02], [lx - 0.85 + i * 0.19, PLAT_Y + 0.98, lz + 0.3], [0, 0, 0], { ink: false });
  for (let i = 0; i < 6; i++) k.box(SM.brass(), [1.7, 0.02, 0.02], [lx, PLAT_Y + 0.1 + i * 0.36, lz + 0.3], [0, 0, 0], { ink: false });
  void ly;
  return k; });

/** mail chutes (station A): inclined steel troughs from openings in the vault down to receiving tables on platform A */
const chuteKit = () => once("mrChutes", () => { const k = new Kit();
  for (const x0 of [8, 14]) { const top: V3 = [x0 - 1.6, 4.3, -2.2], bot: V3 = [x0 + 0.6, PLAT_Y + 0.95, -2.0], len = Math.hypot(bot[0] - top[0], bot[1] - top[1]), ang = Math.atan2(bot[1] - top[1], bot[0] - top[0]);
    const mid: V3 = [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, (top[2] + bot[2]) / 2];
    k.box(SM.chute(), [len, 0.02, 0.62], mid, [0, 0, ang], { ink: 0.4 });
    for (const s of [1, -1]) k.box(SM.chute(), [len, 0.22, 0.02], [mid[0], mid[1] + 0.1, mid[2] + s * 0.31], [0, 0, ang], { ink: 0.4 });
    k.box(SM.dark(), [1.1, 0.06, 0.8], [top[0] - 0.3, wall(Math.PI / 2 + 0.6)[0] - 0.05, -2.1], [0, 0, 0], { ink: 0.3 });                      // opening in the vault
    k.box(SM.wood(), [1.3, 0.06, 0.9], [bot[0] + 0.75, PLAT_Y + 0.82, -2.0], [0, 0, 0], { ink: 0.5 });                                         // receiving table
    for (const dx of [-0.55, 0.55]) for (const dz of [-0.38, 0.38]) k.box(SM.wood(), [0.06, 0.8, 0.06], [bot[0] + 0.75 + dx, PLAT_Y + 0.4, -2.0 + dz], [0, 0, 0], { ink: false });
    for (const f of [0.15, 0.55, 0.9]) { const p: V3 = [top[0] + (bot[0] - top[0]) * f, top[1] + (bot[1] - top[1]) * f, -2.2]; k.rod(SM.steel(), [p[0], p[1], -2.2], [p[0], p[1] + (f < 0.5 ? 0.9 : PLAT_Y - p[1] + 0.0), -2.2], 0.02, 6, { ink: false }); } }
  return k; });
/** belt conveyor (station B): from platform A up through the vault to the sorting office; rollers + side frames */
export const CONV = { x0: 9, x1: 15.5, y0: PLAT_Y + 0.85, y1: 4.6, z: -2.25 };
const conveyorKit = () => once("mrConveyor", () => { const k = new Kit(), { x0, x1, y0, y1, z } = CONV, len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
  const mid: V3 = [(x0 + x1) / 2, (y0 + y1) / 2, z];
  k.box(SM.belt(), [len, 0.03, 0.55], mid, [0, 0, ang], { ink: 0.4 });
  for (const s of [1, -1]) { k.box(SM.green(), [len, 0.16, 0.04], [mid[0], mid[1] - 0.02, z + s * 0.31], [0, 0, ang], { ink: 0.4 }); }
  for (const f of [0.08, 0.4, 0.72]) { const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f; for (const s of [1, -1]) k.box(SM.green(), [0.06, y - PLAT_Y, 0.06], [x, (y + PLAT_Y) / 2, z + s * 0.3], [0, 0, 0], { ink: false }); }
  k.box(SM.green(), [1.0, 0.7, 0.8], [x0 - 0.3, PLAT_Y + 0.35, z], [0, 0, 0], { ink: 0.5 });                         // drive housing / feed table
  k.box(SM.dark(), [1.0, 0.06, 0.9], [x1 + 0.2, wall(Math.PI / 2 + 0.62)[0] - 0.04, z], [0, 0, 0], { ink: 0.3 });   // opening in the vault
  return k; });
/** belt surface slats that move (gives the belt visible motion); t = belt travel in metres */
export const BeltSlats: React.FC<{ t: number }> = ({ t }) => { const { x0, x1, y0, y1, z } = CONV, len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0), N = 22, gap = len / N;
  return <>{Array.from({ length: N }, (_, i) => { const d = ((i * gap + t) % len + len) % len, f = d / len; return <mesh key={i} position={[x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + 0.02, z]} rotation={[0, 0, ang]} material={SM.steel()}><boxGeometry args={[0.03, 0.012, 0.5]} /></mesh>; })}</>; };

/** clock + calendar on platform A's wall (they tell the passing of time in scene H) */
const CLOCK_X = 9.6;
export const StationClock: React.FC<{ hours: number; year: number }> = ({ hours, year }) => { const [y, z] = wall(angAtY(2.95, -1), 0.12), m = (hours % 1) * Math.PI * 2, h = (hours / 12 % 1) * Math.PI * 2;
  const face = useMemo(() => once("mrClockFace", () => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d")!; g.fillStyle = "#f4efe2"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.fillStyle = "#1a1a1a";
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 112 : 100; g.save(); g.translate(128, 128); g.rotate(a); g.fillRect(-1.5, -122, 3, 122 - r0); g.restore(); }
    g.font = "bold 26px Georgia"; g.textAlign = "center"; g.textBaseline = "middle"; for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(String(i), 128 + Math.sin(a) * 84, 128 - Math.cos(a) * 84); }
    g.font = "bold 14px Georgia"; g.fillText("G.P.O.", 128, 170); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.3 }); }), []);
  const cal = useMemo(() => new THREE.MeshStandardMaterial({ map: signTex(String(year), "#f4efe2", "#1a1a1a", 256, 192, "Georgia, serif", "#a8201b"), roughness: 0.6 }), [year]);
  const tilt = 0.44;    // wall slope at this height (faces the platform)
  return <group position={[CLOCK_X, y, z]} rotation={[tilt, 0, 0]}>
    <mesh rotation={[Math.PI / 2, 0, 0]} material={SM.dark()}><cylinderGeometry args={[0.36, 0.36, 0.08, 40]} /></mesh>
    <mesh position={[0, 0, 0.042]} material={face}><circleGeometry args={[0.32, 40]} /></mesh>
    <mesh position={[0, 0, 0.05]} rotation={[0, 0, -h]} material={SM.dark()}><boxGeometry args={[0.03, 0.18, 0.006]} /></mesh>
    <mesh position={[0, 0, 0.056]} rotation={[0, 0, -m]} material={SM.dark()}><boxGeometry args={[0.018, 0.27, 0.006]} /></mesh>
    <group position={[1.2, -0.05, 0.0]}><mesh material={SM.wood()}><boxGeometry args={[0.5, 0.42, 0.03]} /></mesh><mesh position={[0, 0, 0.017]} material={cal}><planeGeometry args={[0.44, 0.33]} /></mesh></group>
  </group>; };

/** platform dressing (fixed data): sack trucks, carts, crates, mailbag piles; side -1 = platform A (in the cut half) */
const dressing = (id: StationId) => { const r = rng(id === "A" ? 11 : 23), side = -1, zA = side * 2.2;
  const truck: Place[] = [], cart: Place[] = [], crate: Place[] = [], bags: BagPlace[] = [];
  for (const x of id === "A" ? [3.5, 21.5, 27] : [2.8, 19, 26.5]) truck.push({ p: [x, PLAT_Y, zA - 0.5], ry: 0.3 + r() });
  for (const x of id === "A" ? [5.2, 25] : [21.5]) cart.push({ p: [x, PLAT_Y, zA - 0.3], ry: Math.PI / 2 + (r() - 0.5) * 0.2 });
  for (const x of [1.5, 28.5]) crate.push({ p: [x, PLAT_Y, zA - 0.6], ry: r() });
  const pile = (x: number, n: number) => { for (let i = 0; i < n; i++) bags.push({ p: [x + (i % 4) * 0.36 - 0.5 + r() * 0.06, PLAT_Y + Math.floor(i / 4) * 0.32, zA - 0.75 + (Math.floor(i / 2) % 2) * 0.3], ry: r() * 6, v: i % 3, s: 0.78, tilt: Math.floor(i / 4) > 0 ? 1.2 : (r() - 0.5) * 0.2 }); };
  if (id === "A") { pile(17.5, 10); pile(26, 6); } else { pile(5.5, 8); pile(24.5, 7); }
  return { truck, cart, crate, bags };
};
const DRESS = { A: dressing("A"), B: dressing("B") };
/** the whole station at its tunnel-frame origin. `far` = also draw the far (z > 0) platform's props (interior shots) */
export const Station: React.FC<{ id: StationId; far: boolean; belt?: number; clock?: { hours: number; year: number } }> = ({ id, far, belt = 0, clock }) => {
  const kits = useMemo(() => [stationKit(id), ...(id === "A" ? [chuteKit()] : [conveyorKit()])], [id]); const D = DRESS[id];
  return <>
    {kits.map((k, i) => <MKit key={i} kit={k} />)}
    <TrackOnly len={ST_L} id={`st${id}`} />
    <Instances name="sacktruck" items={D.truck} /><Instances name="cart" items={D.cart} /><Instances name="crate" items={D.crate} />
    <BagRack bags={D.bags} />
    <Instances name="lamp_hang" items={LAMPS} shadows={false} />
    {LAMPS.map((l, i) => <mesh key={i} position={[l.p[0], l.p[1] + 0.12, l.p[2]]} material={SM.bulb()}><sphereGeometry args={[0.07, 12, 8]} /></mesh>)}
    {id === "B" && <BeltSlats t={belt} />}
    {clock && <StationClock {...clock} />}
    {far && <group />}
  </>;
};
/** hanging lamps: one row over each platform (bulb ~0.12 above the shade origin) */
export const LAMPS: Place[] = [-1, 1].flatMap((s) => [2.5, 7.5, 12.5, 17.5, 22.5, 27.5].map((x) => ({ p: [x, 3.0, s * 2.0] as V3 })));
/** fixed station lights (never move -> no popping); k scales intensity (era / closure), warm -> cool with `cool` */
export const StationLights: React.FC<{ k?: number; cool?: number }> = ({ k = 1, cool = 0 }) => { const col = new THREE.Color("#ffd49a").lerp(new THREE.Color("#e8f0ff"), cool);
  return <>{[5, 15, 25].map((x) => <pointLight key={x} position={[x, 2.9, -1.2]} intensity={5.5 * k} distance={16} decay={1.3} color={col} />)}
    {[10, 20].map((x) => <pointLight key={`b${x}`} position={[x, 2.9, 1.6]} intensity={3 * k} distance={14} decay={1.4} color={col} />)}</>; };
export { TRACK_Z };
