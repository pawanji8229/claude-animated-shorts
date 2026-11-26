// flight world props: sky dome + drifting cumulus, the two island airfields (terminal buildings, fire shed, windsocks
// streaming in the easterly, runway edge markers, boundary fences, signs, a parked car), farms (harled houses with
// slate roofs, steadings, sheds), grazing sheep and seabirds (gulls / fulmars wheeling over the cliffs and the sound).
import React, { useMemo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import places from "./data/places.json";
import { Kit, KitMesh, once } from "../short3/kit";
import { cnv, decalTex, fMats } from "./mats";
import { rng, V3 } from "../../lib/math";

export const WRY = places.WRY, PPW = places.PPW;
export const WIND: V3 = [-0.94, 0, -0.34];          // the air moves toward -x (wind FROM the east-north-east)

// ---------------------------------------------------------------- sky + clouds
const skyTex = () => cnv(16, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#4f86c6"); gr.addColorStop(0.32, "#7fa9d6"); gr.addColorStop(0.47, "#bcd2e4"); gr.addColorStop(0.5, "#dfe7ea"); gr.addColorStop(0.53, "#c9d4d8"); gr.addColorStop(1, "#8d9aa0");
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512); }, 1, true, false);
const cloudTex = (seed: number) => cnv(512, 256, (g, r) => { g.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 70; i++) { const x = 90 + r() * 330, y = 150 - Math.pow(r(), 0.7) * 95 * Math.sin(((x - 60) / 400) * Math.PI), rad = 26 + r() * 46;
    const gr = g.createRadialGradient(x, y - rad * 0.25, rad * 0.1, x, y, rad); gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.6, "rgba(246,247,250,0.75)"); gr.addColorStop(1, "rgba(235,238,244,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill(); }
  const sh = g.createLinearGradient(0, 110, 0, 190); sh.addColorStop(0, "rgba(160,170,185,0)"); sh.addColorStop(1, "rgba(150,160,175,0.55)"); g.globalCompositeOperation = "source-atop"; g.fillStyle = sh; g.fillRect(0, 0, 512, 256);
}, seed, true, false);
const CLOUDS = (() => { const r = rng(77); return Array.from({ length: 34 }, (_, i) => ({ p: [-9000 + r() * 19000, 650 + r() * 700, -9000 + r() * 19000] as V3, s: 500 + r() * 900, t: i % 4 })); })();
export const Sky: React.FC<{ t: number }> = ({ t }) => {
  const M = useMemo(() => once("flightSky", () => ({ sky: new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false, depthWrite: false }),
    clouds: [0, 1, 2, 3].map((k) => new THREE.SpriteMaterial({ map: cloudTex(30 + k), transparent: true, depthWrite: false, fog: true, opacity: 0.92 })) })), []);
  return (<group>
    <mesh material={M.sky} renderOrder={-10}><sphereGeometry args={[30000, 32, 24]} /></mesh>
    {CLOUDS.map((c, i) => <sprite key={i} position={[c.p[0] + WIND[0] * t * 3, c.p[1], c.p[2] + WIND[2] * t * 3]} scale={[c.s * 2, c.s, 1]} material={M.clouds[c.t]} />)}
  </group>);
};

// ---------------------------------------------------------------- buildings
const gableHouse = (K: Kit, m: ReturnType<typeof fMats>, L: number, W: number, H: number, opt: { door?: THREE.Material; chim?: boolean; dormers?: number; storeys?: number } = {}) => {
  K.box(m.harl, [L, H, W], [0, H / 2, 0]);
  const rise = W * 0.42, slope = Math.atan2(rise, W / 2), rl = Math.hypot(W / 2, rise) + 0.25;
  for (const s of [-1, 1]) K.box(m.slate, [L + 0.3, 0.12, rl], [0, H + rise / 2 + 0.02, s * (W / 4 + 0.04)], [s * slope, 0, 0]);
  K.ext(m.harl, [[-W / 2, 0], [W / 2, 0], [0, rise]], 0.02, [0, 0, 0], [0, 0, 0]);   // (gable infill drawn by the ext below)
  for (const s of [-1, 1]) K.ext(m.harl, [[-W / 2, H], [W / 2, H], [0, H + rise]], 0.2, [s * (L / 2 - 0.1), 0, 0], [0, Math.PI / 2, 0]);
  K.box(m.slateDark, [L + 0.32, 0.16, 0.22], [0, H + rise + 0.04, 0]);
  if (opt.chim) for (const s of [-1, 1]) { K.box(m.harlShade, [0.6, 1.3, 0.9], [s * (L / 2 - 0.3), H + rise + 0.25, 0]); K.cyl(m.corrRust, 0.09, 0.09, 0.35, [s * (L / 2 - 0.3), H + rise + 1.05, 0.15]); }
  const nw = Math.max(2, Math.round(L / 2.6));
  for (let i = 0; i < nw; i++) { const x = -L / 2 + (i + 0.5) * (L / nw); if (opt.door && i === Math.floor(nw / 2)) { K.box(opt.door, [0.95, 2.05, 0.08], [x, 1.03, W / 2 + 0.03]); K.box(m.frame, [1.1, 0.1, 0.1], [x, 2.1, W / 2 + 0.04]); continue; }
    K.box(m.winDark, [0.85, 1.1, 0.06], [x, 1.55, W / 2 + 0.02], [0, 0, 0], { ink: 0.4 }); K.box(m.frame, [0.95, 0.08, 0.1], [x, 0.98, W / 2 + 0.05]); K.box(m.frame, [0.06, 1.1, 0.08], [x, 1.55, W / 2 + 0.04]);
    K.box(m.winDark, [0.85, 1.1, 0.06], [x, 1.55, -W / 2 - 0.02], [0, 0, 0], { ink: 0.4 }); }
  for (let i = 0; i < (opt.dormers ?? 0); i++) { const x = -L / 2 + (i + 0.5) * (L / (opt.dormers ?? 1)); K.box(m.harl, [1.3, 1.2, 1.2], [x, H + 0.55, W / 2 - 0.55]); K.box(m.winDark, [0.8, 0.8, 0.05], [x, H + 0.5, W / 2 + 0.06]); K.box(m.slate, [1.5, 0.1, 1.5], [x, H + 1.2, W / 2 - 0.5], [0.25, 0, 0]); }
};
const shed = (K: Kit, m: ReturnType<typeof fMats>, L: number, W: number, H: number, wall: THREE.Material, roof: THREE.Material) => {
  K.box(wall, [L, H, W], [0, H / 2, 0]); const rise = W * 0.18, slope = Math.atan2(rise, W / 2), rl = Math.hypot(W / 2, rise) + 0.2;
  for (const s of [-1, 1]) K.box(roof, [L + 0.3, 0.08, rl], [0, H + rise / 2, s * W / 4], [s * slope, 0, 0]);
  for (const s of [-1, 1]) K.ext(wall, [[-W / 2, H], [W / 2, H], [0, H + rise]], 0.12, [s * (L / 2 - 0.06), 0, 0], [0, Math.PI / 2, 0]);
};
const FARM_KITS = () => once("farmKits", () => { const m = fMats();
  return [0, 1, 2, 3].map((v) => { const K = new Kit(), r = rng(500 + v);
    const hk = new Kit(); gableHouse(hk, m, 9 + v * 0.8, 6, 3.0 + (v % 2) * 2.2, { door: v % 2 ? m.doorBlue : m.doorRed, chim: true, dormers: v % 2 ? 0 : 2 });
    K.merge(hk);
    const sk = new Kit(); shed(sk, m, 16 + r() * 8, 7, 3.2, v % 2 ? m.stone : m.harlShade, v === 3 ? m.corrRust : m.slate); K.merge(sk, [2, 0, -12], [0, 0.04, 0]);
    const sk2 = new Kit(); shed(sk2, m, 10, 8, 4.2, m.corrugated, m.corrugated); K.merge(sk2, [-12, 0, -9], [0, Math.PI / 2, 0]);
    // garden dyke
    K.box(m.stone, [16, 1.0, 0.5], [0, 0.5, 7.5]); K.box(m.stone, [0.5, 1.0, 7], [-8, 0.5, 4]);
    return K; }); });
export const Farms: React.FC<{ near: V3 }> = ({ near }) => { const kits = FARM_KITS();
  return <>{places.farms.map((f, i) => { const d = Math.hypot(f.x - near[0], f.z - near[2]); if (d > 9000) return null;
    return <group key={i} position={[f.x, f.y - 0.05, f.z]} rotation={[0, -f.rot, 0]}><KitMesh kit={kits[f.v]} inkScale={d > 1500 ? 0 : 1} /></group>; })}</>;
};

// ---------------------------------------------------------------- airfields
const signTex = (t: string) => decalTex(t, "#1f2a3a", 1024, 160, "bold 96px Arial");
const windsockKit = () => { const m = fMats(), K = new Kit(); K.cyl(m.windsockPole, 0.05, 0.07, 6.2, [0, 3.1, 0], [0, 0, 0], 10); K.torus(m.windsockPole, 0.33, 0.025, [0, 6.0, 0], [0, Math.PI / 2, 0]); K.cyl(m.concrete, 0.6, 0.7, 0.25, [0, 0.12, 0]); return K; };
const sockGeo = once("sockGeo", () => { const g = new THREE.CylinderGeometry(0.33, 0.14, 3.2, 20, 10, true); g.rotateZ(Math.PI / 2); g.translate(-1.6, 0, 0); return g; });
/** windsock: pivots at the frame, streams downwind; length-wise flutter ripples */
export const Windsock: React.FC<{ p: V3; t: number; strength?: number }> = ({ p, t, strength = 0.85 }) => {
  const m = fMats(); const kit = useMemo(() => once("wsKit", windsockKit), []);
  const geo = useMemo(() => { const g = sockGeo.clone(); g.setAttribute("p0", (g.attributes.position as THREE.BufferAttribute).clone()); return g; }, []);
  const P = geo.attributes.position as THREE.BufferAttribute, P0 = geo.getAttribute("p0") as THREE.BufferAttribute;
  const gust = strength + 0.08 * Math.sin(t * 1.3) + 0.05 * Math.sin(t * 3.7 + 1);
  for (let i = 0; i < P.count; i++) { const x = P0.getX(i), u = -x / 3.2; const sag = (1 - gust) * 1.4 * u * u;
    P.setXYZ(i, x, P0.getY(i) - sag + Math.sin(t * 9 + u * 7) * 0.06 * u, P0.getZ(i) + Math.sin(t * 7.3 + u * 5) * 0.09 * u); }
  P.needsUpdate = true; geo.computeVertexNormals();
  const yaw = Math.atan2(-WIND[2], WIND[0]) + 0.08 * Math.sin(t * 0.9);
  const bands = useMemo(() => { const tx = cnv(256, 32, (g) => { for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? "#f4f2ec" : "#ff6a1a"; g.fillRect(i * 256 / 5, 0, 256 / 5, 32); } }, 1, true, false);
    return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.85, side: THREE.DoubleSide }); }, []);
  void m;
  return (<group position={p}><KitMesh kit={kit} /><group position={[0, 6.0, 0]} rotation={[0, yaw + Math.PI, 0]}><mesh geometry={geo} material={bands} castShadow /></group></group>);
};
const airfieldKit = (which: "wry" | "ppw") => once(`af_${which}`, () => { const m = fMats(), K = new Kit(), R = which === "wry" ? WRY : PPW, y = R.elev;
  // runway edge markers (low white boards every 45 m both sides) + threshold boards
  for (let x = R.x0; x <= R.x1 + 0.1; x += 45) for (const s of [-1, 1]) K.box(m.markerWhite, [1.6, 0.35, 0.25], [x, y + 0.18, R.z + s * (R.w / 2 + 2.5)], [0, 0, 0], { ink: 0.4 });
  for (const xe of [R.x0, R.x1]) for (let k = -3; k <= 3; k++) K.box(m.markerWhite, [0.3, 0.32, 1.4], [xe, y + 0.16, R.z + k * 2.6], [0, 0, 0], { ink: 0.4 });
  // boundary fences (post + 3 wires) along both long sides, 60 m off the centreline
  for (const s of [-1, 1]) { const zf = R.z + s * 62; for (let x = R.x0 - 40; x <= R.x1 + 30; x += 4) K.box(m.post, [0.1, 1.2, 0.1], [x, y + 0.6, zf], [0, 0, 0], { ink: 0.3 });
    for (const h of [0.45, 0.8, 1.1]) K.rod(m.wire, [R.x0 - 40, y + h, zf], [R.x1 + 30, y + h, zf], 0.006, 3, { ink: false, cast: false }); }
  if (which === "wry") {
    // terminal (harled, slate), fire + rescue shed (corrugated, roller door), fuel bowser pad, sign, car
    const T = new Kit(); gableHouse(T, m, 13, 7, 3.0, { door: m.doorBlue, chim: false }); K.merge(T, [80, y, -104]);
    K.box(m.signBoard, [6.2, 0.9, 0.08], [80, y + 4.35, -100.4 + 0.1], [0, 0, 0], { ink: 0.4 });
    const S = new Kit(); shed(S, m, 12, 9, 4.8, m.corrugated, m.corrugated); S.box(m.doorRed, [4.2, 3.8, 0.08], [0, 1.9, 4.53]); K.merge(S, [112, y, -101]);
    K.box(m.concrete, [10, 0.12, 6], [56, y + 0.06, -86]);
  } else {
    const T = new Kit(); gableHouse(T, m, 8, 5.5, 2.8, { door: m.doorRed, chim: false }); K.merge(T, [2700, y, -238]);
    K.box(m.signBoard, [6.4, 0.9, 0.08], [2700, y + 3.95, -234.9], [0, 0, 0], { ink: 0.4 });
    const S = new Kit(); shed(S, m, 9, 7, 3.8, m.corrugated, m.corrugated); S.box(m.doorRed, [3.6, 3.0, 0.08], [0, 1.5, 3.53]); K.merge(S, [2724, y, -240]);
  }
  return K; });
const CarK = () => once("carKit", () => { const m = fMats(), K = new Kit();
  K.box(m.car, [4.1, 0.75, 1.75], [0, 0.62, 0]); K.box(m.car, [2.2, 0.62, 1.6], [-0.25, 1.28, 0]); K.box(m.winDark, [2.05, 0.5, 1.63], [-0.25, 1.3, 0], [0, 0, 0], { ink: false });
  for (const sx of [-1.35, 1.3]) for (const sz of [-0.8, 0.8]) K.cyl(m.tire, 0.32, 0.32, 0.24, [sx, 0.32, sz], [Math.PI / 2, 0, 0], 16);
  return K; });
export const Airfield: React.FC<{ which: "wry" | "ppw"; t: number }> = ({ which, t }) => {
  const K = airfieldKit(which), R = which === "wry" ? WRY : PPW, y = R.elev;
  const sign = useMemo(() => new THREE.MeshBasicMaterial({ map: signTex(which === "wry" ? "WESTRAY" : "PAPA WESTRAY"), transparent: true, polygonOffset: true, polygonOffsetFactor: -2 }), [which]);
  return (<group>
    <KitMesh kit={K} />
    {which === "wry" ? <mesh position={[80, y + 4.35, -100.25]} material={sign}><planeGeometry args={[6.0, 0.8]} /></mesh> : <mesh position={[2700, y + 3.95, -234.8]} material={sign}><planeGeometry args={[6.2, 0.8]} /></mesh>}
    <Windsock p={which === "wry" ? [240, y, -40] : [3010, y, -192]} t={t} />
    {which === "wry" && <group position={[40, y, -96]} rotation={[0, 0.2, 0]}><KitMesh kit={CarK()} /></group>}
  </group>);
};

// ---------------------------------------------------------------- sheep (instanced; each grazes on its own rhythm)
export const Sheep: React.FC<{ t: number; near: V3 }> = ({ t, near }) => {
  const m = fMats(); const body = useRef<THREE.InstancedMesh>(null), head = useRef<THREE.InstancedMesh>(null), legs = useRef<THREE.InstancedMesh>(null);
  const S = places.sheep.filter((s) => Math.hypot(s.x - near[0], s.z - near[2]) < 1600);
  const geo = useMemo(() => ({ body: new THREE.SphereGeometry(0.5, 14, 10), head: new THREE.SphereGeometry(0.17, 10, 8), leg: new THREE.CylinderGeometry(0.045, 0.04, 0.5, 6) }), []);
  useLayoutEffect(() => { const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
    S.forEach((s, i) => { const r = rng(s.s), ph = r() * 50, graze = 0.5 + 0.5 * Math.sin(t * (0.25 + r() * 0.3) + ph) > 0.35 ? 1 : 0, nod = Math.sin(t * 3 + ph) * 0.04 * graze, yaw = s.rot + Math.sin(t * 0.07 + ph) * 0.4;
      const c = Math.cos(yaw), sn = Math.sin(yaw), at = (lx: number, ly: number, lz: number) => V.set(s.x + lx * c + lz * sn, s.y + ly, s.z - lx * sn + lz * c);
      body.current!.setMatrixAt(i, M.compose(at(0, 0.62, 0).clone(), Q.setFromEuler(E.set(0, yaw, 0)), Sc.set(1.5, 0.95, 1.0)));
      head.current!.setMatrixAt(i, M.compose(at(0.78, 0.62 + 0.18 * (1 - graze) - 0.32 * graze + nod, 0).clone(), Q.setFromEuler(E.set(0, yaw, -0.5 * graze)), Sc.set(1.5, 1, 1)));
      [[0.4, 0.22], [0.4, -0.22], [-0.4, 0.22], [-0.4, -0.22]].forEach(([lx, lz], k) => legs.current!.setMatrixAt(i * 4 + k, M.compose(at(lx, 0.25, lz).clone(), Q.identity(), Sc.set(1, 1, 1))));
    });
    for (const r of [body, head, legs]) { r.current!.instanceMatrix.needsUpdate = true; r.current!.computeBoundingSphere(); } });
  if (!S.length) return null;
  return (<group>
    <instancedMesh ref={body} args={[geo.body, m.sheepWool, S.length]} castShadow receiveShadow />
    <instancedMesh ref={head} args={[geo.head, m.sheepFace, S.length]} castShadow />
    <instancedMesh ref={legs} args={[geo.leg, m.sheepFace, S.length * 4]} castShadow />
  </group>);
};

// ---------------------------------------------------------------- seabirds (instanced; gulls flap + glide, fulmars glide stiff-winged)
type Bird = { c: V3; r: number; w: number; ph: number; kind: 0 | 1; bob: number };
export const BIRDS: Bird[] = (() => { const r = rng(91), B: Bird[] = [];
  const flock = (cx: number, cy: number, cz: number, n: number, rad: number, kind: 0 | 1) => { for (let i = 0; i < n; i++) B.push({ c: [cx + (r() - 0.5) * rad, cy + r() * 25, cz + (r() - 0.5) * rad], r: 14 + r() * 40, w: (0.25 + r() * 0.35) * (r() < 0.5 ? -1 : 1), ph: r() * 6.28, kind, bob: r() * 6 }); };
  flock(380, 18, -60, 10, 240, 0); flock(420, 30, 300, 6, 200, 1); flock(2230, 22, -150, 8, 260, 0); flock(1300, 40, -100, 7, 600, 0); flock(900, 60, 0, 5, 500, 1);
  flock(150, 22, -140, 5, 200, 0); flock(2800, 26, -350, 6, 280, 0); flock(2150, 14, 400, 5, 200, 1);
  return B; })();
export const birdAt = (b: Bird, t: number) => { const a = b.ph + t * b.w; return { p: [b.c[0] + Math.cos(a) * b.r, b.c[1] + Math.sin(t * 0.5 + b.bob) * 3, b.c[2] + Math.sin(a) * b.r] as V3, yaw: -a - Math.sign(b.w) * Math.PI / 2 }; };
export const Birds: React.FC<{ t: number }> = ({ t }) => {
  const m = fMats(); const bodyR = useRef<THREE.InstancedMesh>(null), wingR = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => { const w = new THREE.BufferGeometry(); w.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0.18, 0, 0.12, -0.1, 0, 0.72, 0, 0, 0, -0.1, 0, 0.72, -0.28, 0, 0.18], 3)); w.computeVertexNormals();
    return { body: new THREE.CapsuleGeometry(0.075, 0.32, 4, 8).rotateZ(Math.PI / 2), wing: w }; }, []);
  const wingMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9ced3", roughness: 0.7, side: THREE.DoubleSide }), []);
  useLayoutEffect(() => { const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1);
    BIRDS.forEach((b, i) => { const { p, yaw } = birdAt(b, t), bank = -Math.sign(b.w) * 0.35, flap = b.kind === 0 ? (Math.sin(t * 11 + b.ph * 3) * 0.5 + 0.1) * (Math.sin(t * 0.6 + b.ph) > -0.2 ? 1 : 0.15) : Math.sin(t * 2 + b.ph) * 0.06;
      bodyR.current!.setMatrixAt(i, M.compose(V.set(...p).clone(), Q.setFromEuler(E.set(bank, yaw, 0, "YXZ")), S1));
      for (const s of [0, 1]) wingR.current!.setMatrixAt(i * 2 + s, M.compose(V.set(...p).clone(), Q.setFromEuler(E.set(bank + (s ? -1 : 1) * flap, yaw, 0, "YXZ")), new THREE.Vector3(1, 1, s ? -1 : 1))); });
    for (const r of [bodyR, wingR]) { r.current!.instanceMatrix.needsUpdate = true; r.current!.computeBoundingSphere(); } });
  return (<group><instancedMesh ref={bodyR} args={[geo.body, m.birdWhite, BIRDS.length]} castShadow /><instancedMesh ref={wingR} args={[geo.wing, wingMat, BIRDS.length * 2]} castShadow /></group>);
};
