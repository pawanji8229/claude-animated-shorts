// joralemon underground (ILLUSTRATIVE cutaway diagram): earth as a sliced block (soil strata on the section faces),
// the shaft under No. 58's front rooms (concrete lining, zig-zag emergency stair, landings, cage lamps, cables, the exit
// door at the bottom onto the tunnel bench), the Joralemon Street Tunnel (cast-iron rings, invert, ballast, ties, rails,
// third rail, cable brackets, lights, signal), the 1907 tunnelling shield + crew, trains (1907 wooden cars, modern
// silver cars) and airflow streaks drawn up the shaft through the fans. Only rendered while the ground is cut away.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { V3, rng } from "../../lib/math";
import { jMats, JM } from "./mats";
import { TUN, CUT_Z, SHAFT, AREA_Y, VOID } from "./world";
import { Lining1907 } from "./subway";

const RE = TUN.r + 0.35, Y_RAIL = TUN.y - TUN.r + 0.95, ZT = TUN.z;
const arc = (cz: number, cy: number, R: number, a0: number, a1: number, n = 28): [number, number][] => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cz + Math.cos(a) * R, cy + Math.sin(a) * R]; });
const deg = (d: number) => (d * Math.PI) / 180;
/** UVs from world position (metres): faces facing x -> (z, y), facing z -> (x, y), facing y -> (x, z); v = 1 + y / 26 (strata by depth) */
const worldUV = (g: THREE.BufferGeometry) => { g.computeVertexNormals(); const P = g.attributes.position, N = g.attributes.normal, uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), nx = Math.abs(N.getX(i)), ny = Math.abs(N.getY(i)), nz = Math.abs(N.getZ(i));
    const u = ny > nx && ny > nz ? x : nx > nz ? z : x, v = ny > nx && ny > nz ? z / 26 : 1 + y / 26; uv[i * 2] = u / 8; uv[i * 2 + 1] = v; }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); };
/** earth block as extruded (z,y) profiles along x (shape u = -z so the extrusion maps to +x after a +90deg yaw) */
const earthKit = () => once("earth", () => { const M = jMats(), k = new Kit(), YT = -0.62, YB = -28;
  const dzF = CUT_Z - ZT, dyF = Math.sqrt(RE * RE - dzF * dzF), aF = Math.atan2(dyF, dzF);
  const full: [number, number][] = [[-16, YT], [CUT_Z, YT], [CUT_Z, TUN.y + dyF], ...arc(ZT, TUN.y, RE, aF, Math.PI * 2 - aF), [CUT_Z, TUN.y - dyF], [CUT_Z, YB], [-16, YB]];
  const dzS = Math.sqrt(RE * RE - (SHAFT.y0 - TUN.y) ** 2), aS = Math.atan2(SHAFT.y0 - TUN.y, -dzS);
  const mid: [number, number][] = [[-16, YT], [SHAFT.z0, YT], [SHAFT.z0, SHAFT.y0], [ZT - dzS, SHAFT.y0], ...arc(ZT, TUN.y, RE, aS, Math.PI * 2 - aF), [CUT_Z, TUN.y - dyF], [CUT_Z, YB], [-16, YB]];
  const side: [number, number][] = [[CUT_Z, YT], [VOID.z1 + 3, YT], [VOID.z1 + 3, YB], [CUT_Z, YB], [CUT_Z, TUN.y - dyF], ...arc(ZT, TUN.y, RE, -aF, aF).reverse().reverse(), [CUT_Z, TUN.y + dyF]];
  const put = (pts: [number, number][], x0: number, x1: number) => {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y))), { depth: x1 - x0, bevelEnabled: false, curveSegments: 12 });
    g.translate(0, 0, -(x1 - x0) / 2); g.rotateY(Math.PI / 2); g.translate((x0 + x1) / 2, 0, 0); worldUV(g); k.add(M.strata, g, [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: 0.6, cast: false }); };
  put(full, -60, SHAFT.x0); put(mid, SHAFT.x0, SHAFT.x1); put(full, SHAFT.x1, 60);
  put(side, -60, VOID.x0); put(side, VOID.x1, 60);
  { const g = new THREE.BoxGeometry(VOID.x1 - VOID.x0, VOID.y0 - YB, VOID.z1 + 3 - CUT_Z); g.translate((VOID.x0 + VOID.x1) / 2, (VOID.y0 + YB) / 2, (VOID.z1 + 3 + CUT_Z) / 2); worldUV(g); k.add(M.strata, g, [0, 0, 0], [0, 0, 0], [1, 1, 1], { ink: false, cast: false }); }
  return k; });
/** tunnel lining rings (cast iron, flanged) over x0..x1, the half behind the section plane; track + services */
const RING = 0.61;
const ironDS = () => once("ironDS", () => { const m = jMats().tunnelIron.clone(); m.side = THREE.DoubleSide; return m; });
const ringKit = () => once("ring", () => { const M = jMats(), k = new Kit(), a0 = deg(60), a1 = deg(300);
  const g = new THREE.CylinderGeometry(TUN.r + 0.12, TUN.r + 0.12, RING - 0.02, 36, 1, true, a0, a1 - a0); g.scale(-1, 1, 1);
  k.add(ironDS(), g, [0, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], { ink: false, cast: false });
  const fl = new THREE.TorusGeometry(TUN.r + 0.02, 0.07, 6, 36, a1 - a0); k.add(M.tunnelIron, fl, [RING / 2 - 0.02, 0, 0], [0, Math.PI / 2, a0 - Math.PI], [1, 1, 1], { ink: 0.3, cast: false });
  return k; });
const trackKit = () => once("track", () => { const M = jMats(), k = new Kit(), L0 = -60, L1 = 60;
  const yb = TUN.y - TUN.r + 0.55; k.span(M.concrete, [L0, TUN.y - TUN.r - 0.2, ZT - 2.4], [L1, yb, ZT + 2.4], { ink: false, cast: false });
  k.span(M.ballast, [L0, yb, ZT - 1.4], [L1, yb + 0.18, ZT + 1.4], { ink: false, cast: false });
  for (let x = L0; x < L1; x += 0.65) k.span(M.timberDk, [x - 0.12, yb + 0.16, ZT - 1.25], [x + 0.12, yb + 0.3, ZT + 1.25], { ink: false, cast: false });
  for (const o of [-0.72, 0.72]) { k.span(M.galv, [L0, yb + 0.3, ZT + o - 0.04], [L1, yb + 0.44, ZT + o + 0.04], { ink: 0.3, cast: false }); }
  k.span(M.machDark, [L0, yb + 0.3, ZT - 1.65], [L1, yb + 0.48, ZT - 1.5], { ink: 0.3 }); k.span(M.cream, [L0, yb + 0.5, ZT - 1.72], [L1, yb + 0.54, ZT - 1.45], { ink: false });   // third rail + cover board
  // bench walkway on the back side + cable brackets + lights
  k.span(M.concrete, [L0, yb, ZT - 2.6], [L1, yb + 0.9, ZT - 1.85], { ink: 0.4 });
  for (let x = L0; x < L1; x += 2.4) { k.span(M.galv, [x, TUN.y + 0.4, ZT - TUN.r + 0.15], [x + 0.05, TUN.y + 0.45, ZT - TUN.r + 0.6], { ink: false }); }
  for (let c = 0; c < 4; c++) k.cyl(M.machDark, 0.04, 0.04, L1 - L0, [0, TUN.y + 0.5 + c * 0.11, ZT - TUN.r + 0.45], [0, 0, Math.PI / 2], 6, { ink: false });
  for (let x = L0 + 3; x < L1; x += 6) { k.span(M.machDark, [x - 0.15, TUN.y + 1.5, ZT - TUN.r + 0.25], [x + 0.15, TUN.y + 1.7, ZT - TUN.r + 0.35], { ink: false }); k.sphere(M.cageLamp, 0.07, [x, TUN.y + 1.45, ZT - TUN.r + 0.32], [1, 1, 1], { ink: false }); }
  k.cyl(M.machDark, 0.05, 0.05, 2.2, [-12, yb + 1.1, ZT - 1.95], [0, 0, 0], 8); k.span(M.machDark, [-12.2, yb + 2.1, ZT - 2.0], [-11.8, yb + 2.7, ZT - 1.8]); k.sphere(M.signalRed, 0.07, [-12, yb + 2.5, ZT - 1.78], [1, 1, 1], { ink: false });
  return k; });
/** shaft lining, emergency stair, landings, lamps, cables, exit door (house-local == world here: No. 58 at x = 0) */
const shaftKit = () => once("shaft", () => { const M = jMats(), k = new Kit(), x0 = SHAFT.x0, x1 = SHAFT.x1, z0 = SHAFT.z0, yb = SHAFT.y0;
  k.span(M.concrete, [x0, yb, z0 - 0.08], [x1, AREA_Y, z0 + 0.02], { ink: false }); for (const x of [x0, x1]) k.span(M.concrete, [x - 0.02, yb, z0], [x + 0.06 * Math.sign(x), AREA_Y, CUT_Z], { ink: 0.4 });
  for (let y = yb + 1.5; y < AREA_Y; y += 1.5) k.span(M.concrete, [x0, y, z0 + 0.02], [x1, y + 0.12, z0 + 0.1], { ink: false });
  // zig-zag stair against the back wall: flights of 2.6 m rise alternating direction, landings at each end
  const n = Math.floor((AREA_Y - yb - 0.5) / 2.6); for (let i = 0; i < n; i++) { const ya = AREA_Y - i * 2.6, yb2 = ya - 2.6, dir = i % 2 ? 1 : -1, xa = dir > 0 ? x0 + 0.9 : x1 - 0.9, xb = xa + dir * 2.4;
    for (const z of [z0 + 0.15, z0 + 1.05]) k.rod(M.machDark, [xa, ya, z], [xb, yb2, z], 0.04, 6);
    const st = 14; for (let s = 1; s < st; s++) { const t = s / st; k.span(M.grate, [xa + (xb - xa) * t - 0.12, ya + (yb2 - ya) * t - 0.03, z0 + 0.18], [xa + (xb - xa) * t + 0.12, ya + (yb2 - ya) * t, z0 + 1.02], { ink: false }); }
    k.rod(M.safety, [xa, ya + 0.95, z0 + 1.1], [xb, yb2 + 0.95, z0 + 1.1], 0.022, 6);
    const lx = dir > 0 ? x1 - 0.55 : x0 + 0.55; k.span(M.grate, [lx - 0.5, yb2 - 0.06, z0 + 0.1], [lx + 0.5, yb2, z0 + 1.2]); k.rod(M.safety, [lx - 0.5, yb2 + 1.0, z0 + 1.2], [lx + 0.5, yb2 + 1.0, z0 + 1.2], 0.022, 6);
    k.sphere(M.cageLamp, 0.07, [lx, yb2 + 2.2, z0 + 0.15], [1, 1.2, 1], { ink: false }); k.cyl(M.machDark, 0.1, 0.04, 0.1, [lx, yb2 + 2.3, z0 + 0.15], [0, 0, 0], 10); }
  for (let c = 0; c < 3; c++) k.cyl(M.machDark, 0.035, 0.035, AREA_Y - yb, [x0 + 0.12 + c * 0.09, (AREA_Y + yb) / 2, z0 + 0.12], [0, 0, 0], 6, { ink: false });
  // bottom: short passage floor to the tunnel bench + the emergency exit door (steel, wired glass panel, panic bar)
  k.span(M.concrete, [x0, yb - 0.4, z0], [x1, yb, ZT - TUN.r + 0.2], { ink: false }); k.span(M.machGreen, [-0.55, yb, z0 + 0.02], [0.55, yb + 2.1, z0 + 0.09]); k.span(M.glass, [-0.2, yb + 1.3, z0 + 0.091], [0.2, yb + 1.75, z0 + 0.095], { ink: false });
  k.span(M.galv, [-0.45, yb + 1.0, z0 + 0.1], [0.45, yb + 1.06, z0 + 0.16], { ink: false }); k.span(M.safety, [-0.65, yb + 2.1, z0 + 0.02], [0.65, yb + 2.25, z0 + 0.12]);
  k.sphere(M.signalRed, 0.06, [0.0, yb + 2.45, z0 + 0.12], [3, 1, 1], { ink: false });
  return k; });
export const UnderStatic: React.FC<{ front: number; era: "1907" | "now" }> = ({ front, era }) => { const ring = ringKit();
  const xs = useMemo(() => { const a: number[] = []; for (let x = -60; x < 60; x += RING) a.push(x); return a; }, []);
  return (<group>
    <KitMesh kit={earthKit()} />
    {era === "1907" ? <Lining1907 front={front} f={0} /> : <>{xs.filter((x) => x < front).map((x) => <group key={x} position={[x + RING / 2, TUN.y, ZT]}><KitMesh kit={ring} /></group>)}<KitMesh kit={trackKit()} /></>}
    {era === "now" && <KitMesh kit={shaftKit()} />}
    {[-24, -12, 0, 12, 24].map((x) => <pointLight key={x} position={[x, TUN.y + 1.2, ZT - 0.5]} color="#ffd9a0" intensity={7} distance={14} decay={1.3} />)}
    <pointLight position={[0, -8, 1]} color="#ffe6c0" intensity={7} distance={14} decay={1.4} />
    {[[-9, -9, 12], [9, -12, 12], [0, -20, 13], [0, -4, 10]].map((p, i) => <pointLight key={i} position={p as V3} color="#cfdcff" intensity={9} distance={22} decay={1.3} />)}
  </group>);
};
/** the tunnelling shield (1907): cylinder with cutting edge, hood, hydraulic rams, working platforms, lamps */
const shieldKit = () => once("shield", () => { const M = jMats(), k = new Kit();
  { const g = new THREE.CylinderGeometry(TUN.r + 0.25, TUN.r + 0.25, 3.0, 40, 1, true, deg(60), deg(240)); g.scale(-1, 1, 1); k.add(ironDS(), g, [1.5, 0, 0], [0, 0, Math.PI / 2], [1, 1, 1], { ink: 0.5 }); }
  k.ext(M.machGrey, [[TUN.r * 0.5, TUN.r * 0.87], ...arc(0, 0, TUN.r + 0.2, deg(60), deg(300), 30).map(([a, b]) => [-a, b] as [number, number]), [TUN.r * 0.5, -TUN.r * 0.87]], 0.12, [1.9, 0, 0], [0, Math.PI / 2, 0], 0, {}, [arc(0.6, 0.6, 1.0, 0, Math.PI * 2, 20), arc(1.4, -1.6, 0.6, 0, Math.PI * 2, 16)]);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; k.cyl(M.galv, 0.09, 0.09, 1.6, [0.5, Math.sin(a) * (TUN.r - 0.1), Math.cos(a) * (TUN.r - 0.1)], [0, 0, Math.PI / 2], 8); }
  k.span(M.timber, [-0.5, -1.0, -1.6], [1.8, -0.9, 1.6]); k.sphere(M.lampDim, 0.12, [0.6, 1.4, 0.9], [1, 1, 1], { ink: false });
  return k; });
export const Shield: React.FC<{ x: number }> = ({ x }) => <group position={[x, TUN.y, ZT]}><KitMesh kit={shieldKit()} /></group>;

// ---------------------------------------------------------------- trains (original designs)
const carKit = (era: "1907" | "now") => once(`car${era}`, () => { const M = jMats(), k = new Kit(), L = 15.4, W = 2.7, H = 3.55;
  const body = era === "now" ? M.trainSilver : M.trainWood, win = era === "now" ? M.roomLamp : M.lampDim;
  k.span(body, [-L / 2, 0.95, -W / 2], [L / 2, 0.95 + H - 0.45, W / 2]);
  if (era === "now") { k.span(body, [-L / 2 + 0.1, 0.95 + H - 0.45, -W / 2 + 0.1], [L / 2 - 0.1, 0.95 + H - 0.25, W / 2 - 0.1]); k.span(M.doorBlue, [-L / 2, 2.4, -W / 2 - 0.005], [L / 2, 2.55, W / 2 + 0.005], { ink: false }); }
  else { k.span(M.trainGreen, [-L / 2, 0.95 + H - 0.45, -W / 2 - 0.05], [L / 2, 0.95 + H - 0.38, W / 2 + 0.05]); k.span(body, [-L / 2 + 0.3, 0.95 + H - 0.38, -W / 2 + 0.55], [L / 2 - 0.3, 0.95 + H - 0.05, W / 2 - 0.55]);
    for (let x = -L / 2 + 0.8; x < L / 2 - 0.6; x += 0.7) for (const s of [-1, 1]) k.span(win, [x, 0.95 + H - 0.33, s * (W / 2 - 0.55) - 0.01], [x + 0.4, 0.95 + H - 0.12, s * (W / 2 - 0.55) + 0.01], { ink: false }); }
  // windows (lit interior), doors, underframe, bogies, couplers
  for (let x = -L / 2 + 1.2; x < L / 2 - 1.0; x += 1.3) for (const s of [-1, 1]) k.span(win, [x, 1.9, s * W / 2 - 0.01], [x + 0.85, 2.85, s * W / 2 + 0.01], { ink: false });
  for (const dx of [-4.6, 0, 4.6]) for (const s of [-1, 1]) k.span(era === "now" ? M.galv : M.doorBrown, [dx - 0.6, 1.0, s * W / 2 - 0.015], [dx + 0.6, 3.1, s * W / 2 + 0.015], { ink: 0.3 });
  k.span(M.machDark, [-L / 2 + 0.3, 0.55, -W / 2 + 0.2], [L / 2 - 0.3, 0.95, W / 2 - 0.2], { ink: false });
  for (const bx of [-L / 2 + 2.3, L / 2 - 2.3]) { k.span(M.machDark, [bx - 1.2, 0.2, -1.2], [bx + 1.2, 0.6, 1.2]); for (const wx of [-0.8, 0.8]) for (const s of [-1, 1]) k.cyl(M.machDark, 0.42, 0.42, 0.12, [bx + wx, 0.42, s * 0.72], [Math.PI / 2, 0, 0], 16); }
  for (const s of [-1, 1]) { k.span(M.machDark, [s * L / 2 - (s > 0 ? 0 : 0.4), 0.8, -0.15], [s * L / 2 + (s > 0 ? 0.4 : 0), 1.0, 0.15]); k.span(body, [s * L / 2 - (s > 0 ? 0.02 : 0), 0.95, -W / 2], [s * L / 2 + (s < 0 ? 0.02 : 0), 0.95 + H - 0.45, W / 2], { ink: 0.6 }); }
  k.sphere(M.headlight, 0.12, [L / 2 + 0.02, 1.6, 0.8], [0.5, 1, 1], { ink: false }); k.sphere(M.headlight, 0.12, [L / 2 + 0.02, 1.6, -0.8], [0.5, 1, 1], { ink: false });
  return k; });
export const CAR_L = 15.8;
/** train of n cars, head at x (moving -x if dir < 0) */
export const Train: React.FC<{ x: number; era: "1907" | "now"; n?: number; dir?: 1 | -1 }> = ({ x, era, n = 4, dir = 1 }) => (
  <group position={[x, Y_RAIL - 0.95 + 0.44, ZT]} rotation={[0, dir > 0 ? 0 : Math.PI, 0]}>{Array.from({ length: n }, (_, i) => <group key={i} position={[-(i + 0.5) * CAR_L, 0, 0]}><KitMesh kit={carKit(era)} /></group>)}
    <pointLight position={[CAR_L * 0.1, 2.0, 0]} color="#fff4d8" intensity={6} distance={14} decay={1.5} /></group>);

// ---------------------------------------------------------------- airflow (streaks drawn from the tunnel up the shaft, through the fans, up the duct)
const AIR: V3[] = [[-14, TUN.y + 0.4, ZT - 0.4], [-4, TUN.y + 0.7, ZT - 1.6], [2.8, -18.3, 3.2], [1.2, -18.6, 1.2], [0, -17.4, -1.8], [0, -9, -2.1], [0.2, AREA_Y + 0.6, -2.4], [0, 3.2, -5.2], [0, 3.6, -8.6], [0, 9, -8.2], [0, 13.5, -8.2]];
const airPath = (() => { const c = new THREE.CatmullRomCurve3(AIR.map((p) => new THREE.Vector3(...p)), false, "centripetal"); return c; })();
/** soft wisp: alpha fades along the length and across the width (reads as moving air, not as a hard line) */
const wispTex = () => once("wispTex", () => { const c = document.createElement("canvas"); c.width = 32; c.height = 256; const g = c.getContext("2d")!;
  for (let y = 0; y < 256; y++) { const v = Math.sin((y / 255) * Math.PI) ** 1.6; const grd = g.createLinearGradient(0, 0, 32, 0); grd.addColorStop(0, "rgba(255,255,255,0)"); grd.addColorStop(0.5, `rgba(255,255,255,${v})`); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, y, 32, 1); }
  return new THREE.CanvasTexture(c); });
const streakMat = (i = 0) => once("streak" + i, () => new THREE.MeshBasicMaterial({ color: "#cfeeff", map: wispTex(), transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
export const Airflow: React.FC<{ f: number; amt: number; cam?: V3 }> = ({ f, amt, cam }) => { const geo = useMemo(() => new THREE.PlaneGeometry(0.12, 1.5), []);
  if (amt <= 0.01) return null; const r = rng(3);
  return <>{Array.from({ length: 30 }, (_, i) => { const lane = r(), off: V3 = [(r() - 0.5) * 1.6, (r() - 0.5) * 0.8, (r() - 0.5) * 1.2]; const u = ((f * 0.0065 + i / 30) % 1);
    const p = airPath.getPointAt(u), t = airPath.getTangentAt(u); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), t);
    const fade = Math.min(1, u * 8, (1 - u) * 8) * amt; void lane;
    const dc = cam ? Math.hypot(p.x + off[0] - cam[0], p.y + off[1] - cam[1], p.z + off[2] - cam[2]) : 9, near = Math.min(1, Math.max(0, (dc - 1.8) / 1.6)), m = streakMat(i); m.opacity = 0.13 * near;   // fade out (never pop) near the lens
    return <mesh key={i} geometry={geo} material={m} position={[p.x + off[0], p.y + off[1], p.z + off[2]]} quaternion={q} scale={[1, 0.6 + fade * 0.6, 1]} visible={fade * near > 0.03} />; })}</>;
};
export { Y_RAIL };
