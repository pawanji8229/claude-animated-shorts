// joralemon street life + small details (today unless noted): flower window boxes with trailing plants on the
// neighbours, rubbish cans by the areaways, hairline cracks + stains in the bluestone, kerb storm drains, a green
// street-name blade + ONE WAY + no-parking signs (in-world signage), bikes at the rack, the delivery van's flashing
// hazards and its courier carrying parcels to a stoop and back, pigeons + sky birds (fauna.ts).
import React from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { V3, rng, smooth, lerp } from "../../lib/math";
import { jMats } from "./mats";
import { ROW } from "./street";
import { bays, doorBay, levels, WIN } from "./rowhouse";
import { SW_Y, SIDEWALK, AREA_Z, PARK_N, STREET, FAR_WALK, FILM_FRAMES, PF } from "./world";
import { Bike } from "./vehicles";
import { Bird3D } from "./fauna3d";
import { pigeonsAt, lampPigeon, skyBirdsAt } from "./fauna";
import { pose5, COSTUME, REST_L, type Odo5Pose } from "../../char/odo5";
import { FACES, withFace } from "../short3/expr";
import type { Placed } from "./timeline";

const std = (c: string, r = 0.7, m = 0, e: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...e });
const signTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const LM = () => once("lifeMats", () => ({
  box: std("#5a3a26", 0.8), boxGreen: std("#2f4a36", 0.6), soil: std("#3a2a1e", 1), leaf: std("#4a7a34", 0.85), leaf2: std("#6a9a40", 0.85), ivy: std("#3a6a2e", 0.85),
  red: std("#c8322a", 0.6), white: std("#f2efe6", 0.6), pink: std("#e07a9a", 0.6), yellow: std("#e8c040", 0.6),
  can: std("#3b3e42", 0.55, 0.1), canG: std("#4a5a4a", 0.55, 0.1), crack: std("#2a2826", 1), stain: new THREE.MeshStandardMaterial({ color: "#5a5a58", roughness: 1, transparent: true, opacity: 0.35, depthWrite: false }),
  grate: std("#2a2a2c", 0.5, 0.7), slot: std("#0c0c0c", 1), pole: std("#7d8387", 0.45, 0.7),
  green: new THREE.MeshStandardMaterial({ map: signTex(512, 96, (g) => { g.fillStyle = "#1f6a3e"; g.fillRect(0, 0, 512, 96); g.strokeStyle = "#f4f4ee"; g.lineWidth = 5; g.strokeRect(6, 6, 500, 84); g.fillStyle = "#f4f4ee"; g.font = "bold 56px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("JORALEMON ST", 256, 52); }), roughness: 0.45, metalness: 0.2 }),
  oneway: new THREE.MeshStandardMaterial({ map: signTex(512, 160, (g) => { g.fillStyle = "#111"; g.fillRect(0, 0, 512, 160); g.fillStyle = "#f4f4f0"; g.beginPath(); g.moveTo(20, 50); g.lineTo(380, 50); g.lineTo(380, 18); g.lineTo(492, 80); g.lineTo(380, 142); g.lineTo(380, 110); g.lineTo(20, 110); g.closePath(); g.fill(); g.fillStyle = "#111"; g.font = "bold 46px sans-serif"; g.textBaseline = "middle"; g.fillText("ONE WAY", 60, 82); }), roughness: 0.45, metalness: 0.2 }),
  nopark: new THREE.MeshStandardMaterial({ map: signTex(192, 288, (g) => { g.fillStyle = "#f6f4ee"; g.fillRect(0, 0, 192, 288); g.strokeStyle = "#b8231c"; g.lineWidth = 6; g.strokeRect(5, 5, 182, 278); g.fillStyle = "#b8231c"; g.font = "bold 40px sans-serif"; g.textAlign = "center"; g.fillText("NO", 96, 60); g.fillText("PARKING", 96, 104);
    g.font = "bold 30px sans-serif"; g.fillText("8AM-6PM", 96, 160); g.fillText("MON-FRI", 96, 200); g.beginPath(); g.moveTo(40, 248); g.lineTo(150, 248); g.lineTo(130, 232); g.moveTo(150, 248); g.lineTo(130, 264); g.stroke(); }), roughness: 0.45, metalness: 0.2 }),
  hazard: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.7, 0.25), toneMapped: false }), hazardOff: std("#7a4a12", 0.4, 0.2),
  parcel: std("#b88a56", 0.9), tape: std("#d9c9a0", 0.6),
}));
// ---------------------------------------------------------------- static detail kit
const detailKit = () => once("jDetail", () => { const L = LM(), M = jMats(), k = new Kit(), r = rng(616);
  ROW.forEach((p, idx) => { if (p.side < 0 || Math.abs(p.x) < 3.3) return; const s = p.s, bx = bays(s.w), db = doorBay(s), { fl } = levels(s), win = WIN[0];
    // window boxes (about half the houses, parlour + sometimes the 2nd floor); trailing ivy + flowers in each
    if (r() < 0.6) for (const [fi, wv] of [[0, win], ...(r() < 0.4 ? [[1, WIN[1]] as const] : [])] as const) for (let i = 0; i < 3; i++) { if (i === db && fi === 0) continue;
      const cx = p.x + bx[i], y = fl[fi] + wv[2] - 0.02, wd = wv[0] * 0.5 + 0.06, mat = r() < 0.5 ? L.box : L.boxGreen, fl2 = [L.red, L.white, L.pink, L.yellow][Math.floor(r() * 4)];
      k.span(mat, [cx - wd, y - 0.24, 0.06], [cx + wd, y - 0.02, 0.34], { ink: 0.5 }); k.span(L.soil, [cx - wd + 0.03, y - 0.03, 0.09], [cx + wd - 0.03, y - 0.015, 0.31], { ink: false });
      for (let j = 0; j < 7; j++) { const x = cx - wd + 0.08 + (j / 6) * (wd * 2 - 0.16); k.sphere(r() < 0.5 ? L.leaf : L.leaf2, 0.07 + r() * 0.03, [x, y + 0.03, 0.2 + (r() - 0.5) * 0.1], [1, 0.8, 1], { ink: false });
        if (r() < 0.7) k.sphere(fl2, 0.025, [x + (r() - 0.5) * 0.05, y + 0.1 + r() * 0.05, 0.22 + (r() - 0.5) * 0.12], [1, 1, 1], { ink: false });
        if (r() < 0.45) for (let t = 0; t < 4; t++) k.sphere(L.ivy, 0.03, [x + (r() - 0.5) * 0.04, y - 0.28 - t * 0.07, 0.35], [1, 1, 0.7], { ink: false }); } }
    // rubbish cans by the areaway, beside the stoop
    if (r() < 0.65) { const ax = p.x + bx[(db + 1) % 3] + 0.25; for (let c = 0; c < 1 + Math.floor(r() * 2); c++) { const x = ax + c * 0.62, mat = r() < 0.6 ? L.can : L.canG;
      k.lathe(mat, [[0, 0], [0.25, 0], [0.27, 0.05], [0.28, 0.82], [0.3, 0.86], [0.3, 0.92], [0.12, 0.98], [0, 0.98]], [x, SW_Y, AREA_Z + 0.55], 18);
      for (const sgn of [-1, 1]) k.span(mat, [x + sgn * 0.3 - 0.02, SW_Y + 0.62, AREA_Z + 0.5], [x + sgn * 0.3 + 0.02, SW_Y + 0.66, AREA_Z + 0.6], { ink: false }); } }
    void idx; });
  // hairline cracks + damp stains on the bluestone (north sidewalk, near the camera's usual ground)
  for (let i = 0; i < 26; i++) { let x = -14 + r() * 26, z = AREA_Z + 0.4 + r() * 2.4, a = r() * Math.PI; const n = 3 + Math.floor(r() * 4);
    for (let j = 0; j < n; j++) { const L2 = 0.08 + r() * 0.14, x2 = x + Math.cos(a) * L2, z2 = z + Math.sin(a) * L2; k.add(L.crack, new THREE.BoxGeometry(L2, 0.002, 0.006), [(x + x2) / 2, SW_Y + 0.0015, (z + z2) / 2], [0, -a, 0], [1, 1, 1], { ink: false, cast: false }); x = x2; z = z2; a += (r() - 0.5) * 1.2; } }
  for (let i = 0; i < 9; i++) k.add(L.stain, new THREE.CircleGeometry(0.25 + r() * 0.35, 18), [-12 + r() * 24, SW_Y + 0.003, AREA_Z + 0.6 + r() * 2.2], [-Math.PI / 2, 0, 0], [1, 0.6 + r() * 0.5, 1], { ink: false, cast: false });
  // kerb storm drains (grate in the gutter + inlet slot in the kerb face)
  for (const x of [-12.5, 6.8, 24]) { k.span(L.grate, [x - 0.45, 0.002, STREET[0] + 0.02], [x + 0.45, 0.012, STREET[0] + 0.5], { ink: 0.3, cast: false }); for (let b = 0; b < 8; b++) k.span(L.slot, [x - 0.4 + b * 0.105, 0.0125, STREET[0] + 0.06], [x - 0.36 + b * 0.105, 0.0135, STREET[0] + 0.46], { ink: false, cast: false });
    k.span(L.slot, [x - 0.5, 0.02, STREET[0] - 0.012], [x + 0.5, 0.11, STREET[0] + 0.002], { ink: false, cast: false }); }
  // signs: street-name blade (corner post), ONE WAY, no-parking
  { const x = -38, z = SIDEWALK[1] - 0.45; k.cyl(L.pole, 0.035, 0.035, 3.4, [x, SW_Y + 1.7, z], [0, 0, 0], 10); k.span(L.green, [x - 0.62, SW_Y + 3.28, z - 0.015], [x + 0.62, SW_Y + 3.52, z + 0.015]); k.span(L.green, [x - 0.015, SW_Y + 3.0, z - 0.62], [x + 0.015, SW_Y + 3.24, z + 0.62]);
    k.span(L.oneway, [x - 0.45, SW_Y + 2.5, z - 0.012], [x + 0.45, SW_Y + 2.78, z + 0.012]); }
  for (const x of [-21, 15.5]) k.span(L.nopark, [x - 0.17, SW_Y + 2.05, SIDEWALK[1] - 0.43], [x + 0.17, SW_Y + 2.56, SIDEWALK[1] - 0.425], { ink: 0.3 });
  { const x = 30, z = STREET[1] + 0.4; k.cyl(L.pole, 0.03, 0.03, 2.9, [x, SW_Y + 1.45, z], [0, 0, 0], 8); k.span(L.oneway, [x - 0.45, SW_Y + 2.45, z - 0.012], [x + 0.45, SW_Y + 2.73, z + 0.012]); }
  void M; void FAR_WALK; void PF;
  return k; });
// ---------------------------------------------------------------- courier from the parked van (x 15.4): to No. 62's stoop and back, periodic
const VAN_X = 15.4, N = FILM_FRAMES;
const COURIER = { ...COSTUME.workerA, hat: null, apron: false, goggles: false, pal: { ...(COSTUME.workerA.pal ?? {}), shirt: "#6a4a2a", shirtShade: "#4f361e", hair: "#2a2220" } } as const;
const NO60 = ROW.find((p) => p.side > 0 && p.x > 3) ?? ROW[0], DROP_X = NO60.x + bays(NO60.s.w)[(doorBay(NO60.s) + 2) % 3];
const routeAt = (u: number): { x: number; z: number; carry: boolean; walk: number; dir: number } => { // u in [0, 733): out 0-150, drop 150-200, back 200-350, in the van 350-733
  const P0 = [VAN_X - 3.0, PARK_N - 0.2], P1 = [VAN_X - 3.0, SIDEWALK[1] - 0.6], P2 = [DROP_X, AREA_Z + 0.5];
  const seg = (a: number[], b: number[], t: number) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  if (u < 40) { const t = smooth(0, 40, u), p = seg(P0, P1, t); return { x: p[0], z: p[1], carry: true, walk: 1, dir: -1 }; }
  if (u < 150) { const t = smooth(40, 150, u), p = seg(P1, P2, t); return { x: p[0], z: p[1], carry: true, walk: 1, dir: -1 }; }
  if (u < 200) return { x: P2[0], z: P2[1], carry: u < 172, walk: 0, dir: -1 };
  if (u < 310) { const t = smooth(200, 310, u), p = seg(P2, P1, t); return { x: p[0], z: p[1], carry: false, walk: 1, dir: 1 }; }
  if (u < 350) { const t = smooth(310, 350, u), p = seg(P1, P0, t); return { x: p[0], z: p[1], carry: false, walk: 1, dir: 1 }; }
  return { x: P0[0], z: P0[1] + 0.6, carry: false, walk: 0, dir: 1 }; };
export const courierAt = (f: number, nowOn: boolean): (Placed & { parcel?: V3 }) | null => { if (!nowOn) return null; const u = ((f - 1100) % 733 + 733) % 733; if (u >= 350) return null;
  const s = routeAt(u), s2 = routeAt(u + 1), d = Math.hypot(s2.x - s.x, s2.z - s.z), gait = ROUTE_D[Math.floor(u)] / 0.72;
  const bend = u >= 150 && u < 200 ? Math.sin(((u - 150) / 50) * Math.PI) : 0;
  const pose: Odo5Pose = withFace(pose5({ costume: COURIER, view: d > 0.002 ? "side" : "front", gait, walk: d > 0.002 ? 1 : 0, stride: 0.72, lean: bend * 0.35,
    armL: s.carry ? { hand: [-40, 40], elbow: [-70, 80], shape: "grip", rot: 0, bend: -1 } : REST_L, armR: s.carry ? { hand: [40, 40], elbow: [70, 80], shape: "grip", rot: 0, bend: 1 } : { hand: [34, 194], shape: "relaxed", bend: 1, rot: -0.15 }, blink: ((f + 17) % 67) < 3 }), FACES[bend > 0.3 ? "focused" : "content"], f, 71);
  return { pose, pos: [s.x, SW_Y - (Math.hypot(s.z - PARK_N, 0) < 0.4 ? SW_Y : 0), s.z], h: 1.48, flip: s.dir < 0, halo: 0.1, parcel: s.carry ? [s.x + (s.dir < 0 ? -0.05 : 0.05), SW_Y + 0.82 - bend * 0.2, lerp(s.z + 0.12, AREA_Z - 0.1, smooth(156, 172, u))] : (u < 200 ? [DROP_X, lerp(SW_Y + 0.62, -0.6, smooth(172, 184, u)), AREA_Z - 0.45] : undefined) }; };
const ROUTE_D: number[] = (() => { const a = [0]; for (let u = 1; u <= 351; u++) { const p = routeAt(u - 1), q = routeAt(u); a.push(a[u - 1] + Math.hypot(q.x - p.x, q.z - p.z)); } return a; })();
const parcelKit = () => once("parcel", () => { const L = LM(), k = new Kit(); k.span(L.parcel, [-0.22, -0.14, -0.16], [0.22, 0.14, 0.16], { ink: 0.6 }); k.span(L.tape, [-0.225, 0.13, -0.03], [0.225, 0.145, 0.03], { ink: false }); return k; });
// ---------------------------------------------------------------- the component the Set mounts (today)
export const StreetLife: React.FC<{ f: number; nowOn: boolean; toon: (p: Placed | null, key: string) => React.ReactNode }> = ({ f, nowOn, toon }) => {
  const L = LM(), blink = Math.floor(f / 11) % 2 === 0, c = courierAt(f, nowOn);
  // delivered parcel stays on the stoop until the courier's next run collects... (it is delivered; it vanishes off-screen while the camera is elsewhere)
  return (<group>
    <KitMesh kit={detailKit()} />
    {[-17.95, -17.05].map((x, i) => <group key={i} position={[x, SW_Y, SIDEWALK[1] - 0.9]} rotation={[0, Math.PI / 2 + i * 0.08, 0]}><Bike spin={0} /></group>)}
    {[[VAN_X + 1.62, 1.0, PARK_N - 0.92], [VAN_X + 1.62, 1.0, PARK_N + 0.92], [VAN_X - 2.57, 1.05, PARK_N - 0.92], [VAN_X - 2.57, 1.05, PARK_N + 0.92]].map((p, i) =>
      <mesh key={i} position={p as V3} material={blink ? L.hazard : L.hazardOff}><boxGeometry args={[0.06, 0.08, 0.14]} /></mesh>)}
    {c && toon(c, "courier")}
    {c?.parcel && <group position={c.parcel}><KitMesh kit={parcelKit()} /></group>}
    {pigeonsAt(f).map((b, i) => <Bird3D key={`pg${i}`} b={b} />)}
    <Bird3D b={lampPigeon(f)} />
    {skyBirdsAt(f).map((b, i) => <Bird3D key={`sb${i}`} b={b} dark />)}
  </group>);
};
