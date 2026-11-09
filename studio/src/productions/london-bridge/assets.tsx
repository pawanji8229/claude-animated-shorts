// London Bridge v2 asset library (original designs, built in code — no third-party models).
// Story assets that were primitives in v1: granite blocks (bevelled, colour-varied, chalk-numbered), the 1960s cargo
// ship (lofted hull with sheer, boot-topping, bulwarks, open holds, derricks + rigging, bridge house, funnel, lifeboats),
// the quay portal crane (lattice jib, slewing cab, hook block, slings), the 1960s flatbed truck / truck crane / mixer
// (hood, fenders, grille, lamps, glass, dual rear wheels, stake bed, chains, lattice boom, outriggers), the tracked
// excavator (track shoes on a stadium path, rollers, sprocket/idler, slewing house, counterweight, glass cab, boom/stick/
// bucket with hydraulic cylinders and teeth), plus water helpers (tileable ripple normals, foam wake). Everything is a
// pure function of its props, so every frame is deterministic.
import React, { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Ink } from "../../inventor/Workshop";
import { V3, rng } from "../../lib/math";

const TAU = Math.PI * 2;
export const cnv = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 1, srgb = true) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; draw(g, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
};
const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
const once = <T,>(fn: () => T) => { let v: T | undefined; return () => (v ??= fn()); };

// ---------------------------------------------------------------- rods + lattice
const UP = new THREE.Vector3(0, 1, 0);
export const Rod: React.FC<{ a: V3; b: V3; r: number; m: THREE.Material; seg?: number; ink?: number; shadow?: boolean }> = ({ a, b, r, m, seg = 8, ink, shadow = true }) => {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length();
  if (len < 1e-4) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.multiplyScalar(1 / len));
  return <mesh position={va.add(vb).multiplyScalar(0.5)} quaternion={q} material={m} castShadow={shadow}><cylinderGeometry args={[r, r, len, seg]} />{ink ? <Ink k={ink} /> : null}</mesh>;
};
const strutGeo = new THREE.CylinderGeometry(1, 1, 1, 6);
/** InstancedMesh of round struts between point pairs (rigid; animate the parent group) */
export const struts = (pairs: [V3, V3][], r: number, m: THREE.Material) => {
  const mesh = new THREE.InstancedMesh(strutGeo, m, pairs.length), o = new THREE.Object3D(), a = new THREE.Vector3(), b = new THREE.Vector3();
  pairs.forEach(([p, q], i) => { a.set(...p); b.set(...q); const d = b.clone().sub(a), l = d.length(); o.position.copy(a).add(b).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(UP, d.normalize()); o.scale.set(r, l, r); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); });
  mesh.castShadow = true; return mesh;
};
/** box-section lattice boom along +x (0..len), section w (z) x h (y), tapering to `tip` at the end */
export const latticePairs = (len: number, w: number, h: number, n: number, tip = 0.45): [V3, V3][] => {
  const P: [V3, V3][] = [], c = (i: number) => { const t = i / n, s = 1 - (1 - tip) * t; return { x: t * len, y: (h / 2) * s, z: (w / 2) * s }; };
  for (let i = 0; i <= n; i++) {
    const A = c(i), cs: V3[] = [[A.x, A.y, A.z], [A.x, A.y, -A.z], [A.x, -A.y, -A.z], [A.x, -A.y, A.z]];
    for (let k = 0; k < 4; k++) P.push([cs[k], cs[(k + 1) % 4]]);                                   // battens
    if (i < n) { const B = c(i + 1), cn: V3[] = [[B.x, B.y, B.z], [B.x, B.y, -B.z], [B.x, -B.y, -B.z], [B.x, -B.y, B.z]];
      for (let k = 0; k < 4; k++) { P.push([cs[k], cn[k]]); P.push([i % 2 ? cs[k] : cs[(k + 1) % 4], i % 2 ? cn[(k + 1) % 4] : cn[k]]); } } // chords + zig-zag lacing
  }
  return P;
};

// ---------------------------------------------------------------- granite blocks
export const BLOCK: V3 = [1.0, 0.6, 0.7];
const blockGeo = once(() => new RoundedBoxGeometry(BLOCK[0], BLOCK[1], BLOCK[2], 2, 0.05));
const GRANITE = ["#a59a8b", "#9c9387", "#ab9d90", "#968b80", "#a89f95"];
const graniteTex = (seed: number, base: string) => cnv(256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "60,50,45" : "235,225,210"},0.05)`; g.beginPath(); g.ellipse(r() * 256, r() * 256, 20 + r() * 40, 10 + r() * 30, r() * 3, 0, TAU); g.fill(); }
  for (let i = 0; i < 5200; i++) { const k = r(); g.fillStyle = k < 0.42 ? `rgba(30,26,24,${0.35 + r() * 0.4})` : k < 0.8 ? `rgba(240,236,228,${0.3 + r() * 0.4})` : `rgba(170,110,95,${0.3 + r() * 0.3})`; const s = 1 + r() * 2.2; g.fillRect(r() * 256, r() * 256, s, s); }
  const e = g.createLinearGradient(0, 0, 0, 256); e.addColorStop(0, "rgba(0,0,0,0.12)"); e.addColorStop(0.12, "rgba(0,0,0,0)"); e.addColorStop(0.88, "rgba(0,0,0,0)"); e.addColorStop(1, "rgba(0,0,0,0.18)"); g.fillStyle = e; g.fillRect(0, 0, 256, 256); // weathered arrises
}, seed);
const graniteBump = once(() => cnv(256, 256, (g, r) => { g.fillStyle = "#808080"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 9000; i++) { const v = Math.floor(90 + r() * 90); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 2.5, 1 + r() * 2.5); } }, 77, false));
const sideMats = once(() => GRANITE.map((c, i) => std({ map: graniteTex(300 + i, c), bumpMap: graniteBump(), bumpScale: 1.4, roughness: 0.88 })));
/** chalk number painted on a granite face (in-world marking, as on the real dismantled stones) */
const numberTex = (n: number) => cnv(256, 160, (g, r) => {
  const base = GRANITE[n % GRANITE.length]; const src = (graniteTex(300 + (n % GRANITE.length), base).image as HTMLCanvasElement);
  g.drawImage(src, 0, 0, 256, 160);
  g.font = "bold 76px Georgia, 'DejaVu Serif', serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.save(); g.translate(128, 84); g.rotate((r() - 0.5) * 0.1);
  for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(250,248,240,${0.16 + r() * 0.1})`; g.fillText(String(n), (r() - 0.5) * 3, (r() - 0.5) * 3); } // chalky, dry strokes
  g.strokeStyle = "rgba(250,248,240,0.55)"; g.lineWidth = 3; g.beginPath(); g.moveTo(-70, 40); g.lineTo(70, 36); g.stroke(); // underline tick
  g.restore();
}, 900 + n);
const matCache = new Map<number, THREE.Material[]>();
export const blockMats = (n: number) => {
  let m = matCache.get(n); if (m) return m;
  const s = sideMats()[n % GRANITE.length], num = std({ map: numberTex(n), bumpMap: graniteBump(), bumpScale: 1.2, roughness: 0.86 });
  m = [num, s, s, s, num, s]; matCache.set(n, m); return m;      // +x and +z faces carry the number
};
export const GraniteBlock: React.FC<{ n: number; p: V3; ry?: number; s?: number; ink?: number }> = ({ n, p, ry = 0, s = 1, ink = 0.45 }) => (
  <mesh geometry={blockGeo()} material={blockMats(n)} position={p} rotation={[0, ry, 0]} scale={s} castShadow receiveShadow>{ink ? <Ink k={ink} /> : null}</mesh>
);

// ---------------------------------------------------------------- water helpers
/** tileable ripple normal map (sum of integer-frequency waves -> seamless), linear colour space */
export const rippleNormal = once(() => {
  const N = 256, hgt = new Float32Array(N * N), r = rng(42), waves = Array.from({ length: 14 }, () => ({ kx: Math.floor(1 + r() * 9) * (r() < 0.5 ? -1 : 1), ky: Math.floor(1 + r() * 9), a: 0.4 + r(), ph: r() * TAU }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (const w of waves) v += (w.a / Math.hypot(w.kx, w.ky)) * Math.sin(TAU * (w.kx * x + w.ky * y) / N + w.ph); hgt[y * N + x] = v; }
  const c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d")!, img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (hgt[y * N + ((x + 1) % N)] - hgt[y * N + ((x - 1 + N) % N)]) * 5, dy = (hgt[((y + 1) % N) * N + x] - hgt[((y - 1 + N) % N) * N + x]) * 5, l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; return t;
});
const foamTex = once(() => cnv(256, 512, (g, r) => {
  g.clearRect(0, 0, 256, 512);
  for (let i = 0; i < 1600; i++) { const y = r() * 512, t = y / 512, spread = 0.04 + t * 0.44, side = r() < 0.5 ? -1 : 1, x = 128 + side * (spread * 128 * (0.75 + r() * 0.35)) + (r() - 0.5) * 18 * (0.3 + t);
    g.fillStyle = `rgba(255,255,255,${(0.1 + r() * 0.3) * (1 - t * 0.85)})`; g.beginPath(); g.ellipse(x, y, 2 + r() * 6 * (1 + t), 1 + r() * 3, r() * 3, 0, TAU); g.fill(); }
  for (let i = 0; i < 700; i++) { const y = r() * 512, t = y / 512; g.fillStyle = `rgba(255,255,255,${(0.05 + r() * 0.12) * (1 - t)})`; g.beginPath(); g.ellipse(128 + (r() - 0.5) * 60 * (0.4 + t), y, 3 + r() * 8, 2 + r() * 4, 0, 0, TAU); g.fill(); } // prop wash
}, 61));
/** foam wake behind a hull heading +z (world), anchored at the stern. `travel` scrolls the foam so it stays put in the
 *  water while the ship moves. `k` = intensity (speed). Lies flat at y=0 of its parent. */
export const FoamWake: React.FC<{ len: number; width: number; travel: number; k: number }> = ({ len, width, travel, k }) => {
  const m = useMemo(() => new THREE.MeshBasicMaterial({ map: foamTex().clone(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: true, color: new THREE.Color(0.92, 0.95, 0.96) }), []);
  m.map!.wrapS = THREE.ClampToEdgeWrapping; m.map!.wrapT = THREE.RepeatWrapping; m.map!.offset.set(0, -travel / len); m.map!.needsUpdate = true; m.opacity = Math.min(1, k);
  return k > 0.01 ? <mesh position={[0, 0.02, -len / 2]} rotation={[-Math.PI / 2, 0, 0]} material={m}><planeGeometry args={[width, len]} /></mesh> : null;
};

// ---------------------------------------------------------------- cargo ship
const SHIP = { aft: -10.2, fwd: 11.6, beam: 2.25 };
export const shipHalfBeam = (x: number) => {
  if (x > 4) { const t = Math.min(1, (x - 4) / (SHIP.fwd - 4)); return Math.max(0.03, SHIP.beam * Math.pow(1 - t * t, 0.62)); }
  if (x < -6.5) { const t = Math.min(1, (-6.5 - x) / (-6.5 - SHIP.aft)); return SHIP.beam * (1 - 0.42 * t * t); }
  return SHIP.beam;
};
export const shipDeckY = (x: number) => 1.45 + 0.95 * Math.max(0, (x - 3) / 8.6) ** 2 + 0.35 * Math.max(0, (-6 - x) / 4.2) ** 2;
const keelY = (x: number) => -1.3 + 1.6 * Math.max(0, (x - 7) / 4.6) ** 2 + 0.85 * Math.max(0, (-8.4 - x) / 1.8) ** 2;
/** hold openings (ship-local x range, half-width) and floor height */
export const HOLDS = [{ x0: 1.5, x1: 7.0, hw: 1.3 }, { x0: -4.6, x1: -0.1, hw: 1.3 }], HOLD_FLOOR = -0.45;
const buildHull = () => {
  const xs: number[] = []; for (let i = 0; i <= 64; i++) { const u = i / 64; xs.push(SHIP.aft + (SHIP.fwd - SHIP.aft) * (0.5 - 0.5 * Math.cos(Math.PI * u))); }
  const ring = (x: number) => {
    const w = shipHalfBeam(x), d = shipDeckY(x), k = keelY(x), rb = Math.min(0.62, w * 0.42, (d - k) * 0.3), fl = 0.03 + 0.16 * Math.max(0, (x - 4) / 7.6);
    const half: [number, number][] = [[0, k], [(w - rb) * 0.5, k], [w - rb, k]];
    for (let j = 1; j <= 5; j++) { const a = (j / 5) * (Math.PI / 2); half.push([w - rb + Math.sin(a) * rb, k + rb - Math.cos(a) * rb]); }
    for (let j = 1; j <= 6; j++) { const t = j / 6; half.push([w * (1 + fl * t * t), k + rb + (d - k - rb) * t]); }
    const pts: [number, number][] = []; for (let j = half.length - 1; j >= 1; j--) pts.push([-half[j][0], half[j][1]]); for (const p of half) pts.push(p);
    return pts;
  };
  const R = xs.map(ring), M = R[0].length, pos: number[] = [], col: number[] = [], idx: number[] = [];
  const red = new THREE.Color("#8a2a22"), white = new THREE.Color("#e8e4da"), black = new THREE.Color("#1c1d21");
  xs.forEach((x, i) => R[i].forEach(([z, y]) => { pos.push(x, y, z); const c = y < -0.02 ? red : y < 0.1 ? white : y > shipDeckY(x) - 0.16 && y < shipDeckY(x) - 0.08 ? white : black; col.push(c.r, c.g, c.b); }));
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = (i + 1) * M + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const cx = pos.length / 3; pos.push(SHIP.aft, (keelY(SHIP.aft) + shipDeckY(SHIP.aft)) / 2, 0); col.push(black.r, black.g, black.b);   // transom cap
  for (let j = 0; j < M - 1; j++) idx.push(cx, j + 1, j);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  // deck with hold openings
  const sh = new THREE.Shape(); const ex: number[] = []; for (let x = SHIP.aft + 0.05; x <= SHIP.fwd - 0.05; x += 0.25) ex.push(x);
  sh.moveTo(ex[0], -shipHalfBeam(ex[0]) + 0.04); for (const x of ex) sh.lineTo(x, -shipHalfBeam(x) + 0.04); for (let i = ex.length - 1; i >= 0; i--) sh.lineTo(ex[i], shipHalfBeam(ex[i]) - 0.04);
  for (const H of HOLDS) { const h = new THREE.Path(); h.moveTo(H.x0, -H.hw); h.lineTo(H.x0, H.hw); h.lineTo(H.x1, H.hw); h.lineTo(H.x1, -H.hw); h.closePath(); sh.holes.push(h); }
  const deck = new THREE.ShapeGeometry(sh, 4); const dp = deck.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < dp.count; i++) { const x = dp.getX(i), z = dp.getY(i); dp.setXYZ(i, x, shipDeckY(x) + 0.01, z); } deck.computeVertexNormals();
  // bulwarks: strip along each deck edge
  const bw = (s: number) => { const p: number[] = [], id: number[] = []; const bx = ex.filter((x) => x > -9.7);
    bx.forEach((x, i) => { const z = s * (shipHalfBeam(x) * (1 + 0.03 + 0.16 * Math.max(0, (x - 4) / 7.6))), y = shipDeckY(x), hh = 0.5 + 0.35 * Math.max(0, (x - 8) / 3.6); p.push(x, y, z, x, y + hh, z); if (i) { const a = (i - 1) * 2; id.push(a, a + 2, a + 1, a + 2, a + 3, a + 1); } });
    const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); gg.setIndex(id); gg.computeVertexNormals(); return gg; };
  return { hull: g, deck, bwP: bw(-1), bwS: bw(1) };
};
const shipGeo = once(buildHull);
const deckTex = once(() => cnv(256, 256, (g, r) => { for (let j = 0; j < 16; j++) { g.fillStyle = `hsl(28,${28 + r() * 10}%,${30 + r() * 8}%)`; g.fillRect(0, j * 16, 256, 16); g.fillStyle = "rgba(20,12,6,0.6)"; g.fillRect(0, j * 16, 256, 1.5); for (let k = 0; k < 3; k++) g.fillRect(r() * 256, j * 16, 1.5, 16); } }, 13));
const shipMats = once(() => {
  const dt = deckTex(); dt.repeat.set(6, 1);
  return {
    hull: std({ vertexColors: true, roughness: 0.55, metalness: 0.15, side: THREE.DoubleSide }), deck: std({ map: dt, roughness: 0.9, side: THREE.DoubleSide }),
    black: std({ color: "#1c1d21", roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide }), white: std({ color: "#ebe6dc", roughness: 0.6 }),
    coaming: std({ color: "#3f4a47", roughness: 0.7, metalness: 0.2 }), hold: std({ color: "#2a2724", roughness: 1 }), tarp: std({ color: "#4d5a43", roughness: 0.95 }),
    funnel: std({ color: "#c9852e", roughness: 0.55 }), band: std({ color: "#9b2a22", roughness: 0.6 }), mast: std({ color: "#d9cdb5", roughness: 0.6 }),
    rig: std({ color: "#2b2b2b", roughness: 0.8 }), glass: std({ color: "#1f2c3a", roughness: 0.12, metalness: 0.6 }),
    lit: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.2, 0.75), toneMapped: false }), boat: std({ color: "#e86a1e", roughness: 0.6 }),
    red: new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 0.2, 0.15), toneMapped: false }), green: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2, 0.4), toneMapped: false }),
  };
});
const RAIL = (x0: number, x1: number, y: (x: number) => number, z: (x: number) => number, m: THREE.Material, step = 0.7, h = 0.9): [V3, V3][] => {
  const P: [V3, V3][] = []; let prev: V3 | null = null;
  for (let x = x0; x <= x1 + 1e-6; x += step) { const b: V3 = [x, y(x), z(x)], t: V3 = [x, y(x) + h, z(x)], mid: V3 = [x, y(x) + h * 0.5, z(x)]; P.push([b, t]); if (prev) { P.push([[prev[0], prev[1] + h, prev[2]], t]); P.push([[prev[0], prev[1] + h * 0.5, prev[2]], mid]); } prev = b; }
  void m; return P;
};
/** 1960s general-cargo ship, original design. Local +x = bow, waterline y=0; the group is turned so bow -> world +z.
 *  `cargo` = granite blocks in the forward hold (London loading adds one at a time); `open` shows open holds. */
export const CargoShip: React.FC<{ cargo: number; open: boolean; lights?: number }> = ({ cargo, open, lights = 1 }) => {
  const G = shipGeo(), m = shipMats();
  const rigging = useMemo(() => {
    const top1: V3 = [0.6, shipDeckY(0.6) + 7.2, 0], top2: V3 = [8.4, shipDeckY(8.4) + 6.2, 0], bow: V3 = [11.4, shipDeckY(11.4) + 0.5, 0], stern: V3 = [-6.0, shipDeckY(-6) + 4.6, 0];
    const P: [V3, V3][] = [[top1, top2], [top2, bow], [top1, stern]];
    for (const s of [-1, 1]) { P.push([top1, [0.0, shipDeckY(0) + 0.5, s * 2.15]], [top1, [1.3, shipDeckY(1.3) + 0.5, s * 2.15]], [top2, [8.0, shipDeckY(8) + 0.5, s * shipHalfBeam(8) * 1.08]]); }
    // derricks: booms + topping lifts + falls
    const booms: [V3, V3][] = [[[1.1, shipDeckY(1.1) + 1.2, 0.35], [5.4, shipDeckY(5.4) + 3.4, 0.35]], [[0.1, shipDeckY(0.1) + 1.2, -0.35], [-3.6, shipDeckY(-3.6) + 3.0, -0.35]], [[7.9, shipDeckY(7.9) + 1.1, 0], [3.8, shipDeckY(3.8) + 2.8, -0.6]]];
    for (const [b, t] of booms) P.push([t, b[0] < 3 && t[0] < 3 ? top1 : t[0] > 3 && b[0] > 7 ? top2 : top1]);
    const railP: [V3, V3][] = [];
    for (const s of [-1, 1]) railP.push(...RAIL(-9.2, -5.9, () => shipDeckY(-7) + 2.6, () => s * 1.9, m.white, 0.55, 0.85));          // boat-deck rails
    return { lines: struts(P, 0.016, m.rig), booms: struts(booms, 0.09, m.mast), rails: struts(railP, 0.025, m.white) };
  }, [m]);
  const ports = useMemo(() => { const P: { p: V3; s: number }[] = []; for (const s of [-1, 1]) for (let x = -9.3; x <= -6.1; x += 0.55) P.push({ p: [x, shipDeckY(x) - 0.48, s * (shipHalfBeam(x) * 1.035 + 0.01)], s }); for (const s of [-1, 1]) for (let x = 8.9; x <= 10.4; x += 0.5) P.push({ p: [x, shipDeckY(x) - 0.45, s * (shipHalfBeam(x) * (1.03 + 0.16 * (x - 4) / 7.6 * 0.6) + 0.01)], s }); return P; }, []);
  const sx = -7.6, sy = shipDeckY(-7.6);
  const blocks = Array.from({ length: cargo }, (_, i) => { const H = HOLDS[0], col = i % 4, row = Math.floor(i / 4) % 3, lay = Math.floor(i / 12); return { n: 1031 + i * 17, p: [H.x0 + 0.75 + col * 1.25, HOLD_FLOOR + 0.3 + lay * 0.6, -0.8 + row * 0.8] as V3 }; });
  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={G.hull} material={m.hull} castShadow receiveShadow><Ink k={1.0} /></mesh>
      <mesh geometry={G.deck} material={m.deck} receiveShadow />
      <mesh geometry={G.bwP} material={m.black} castShadow /><mesh geometry={G.bwS} material={m.black} castShadow />
      {/* holds: coamings, dark interiors, tarpaulin covers when closed */}
      {HOLDS.map((H, i) => { const cx = (H.x0 + H.x1) / 2, L = H.x1 - H.x0, y = shipDeckY(cx); return <group key={i}>
        {[[cx, H.hw, L + 0.16, 0.08], [cx, -H.hw, L + 0.16, 0.08]].map(([x, z, l, t], k) => <mesh key={k} position={[x, y + 0.25, z]} material={m.coaming} castShadow><boxGeometry args={[l, 0.5, t]} /><Ink k={0.5} /></mesh>)}
        {[H.x0, H.x1].map((x, k) => <mesh key={`e${k}`} position={[x, y + 0.25, 0]} material={m.coaming} castShadow><boxGeometry args={[0.08, 0.5, H.hw * 2]} /><Ink k={0.5} /></mesh>)}
        {open ? <>
          <mesh position={[cx, HOLD_FLOOR, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.hold} receiveShadow><planeGeometry args={[L, H.hw * 2]} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[cx, (HOLD_FLOOR + y) / 2, s * H.hw]} material={m.hold}><boxGeometry args={[L, y - HOLD_FLOOR, 0.04]} /></mesh>)}
          {[H.x0, H.x1].map((x) => <mesh key={x} position={[x, (HOLD_FLOOR + y) / 2, 0]} material={m.hold}><boxGeometry args={[0.04, y - HOLD_FLOOR, H.hw * 2]} /></mesh>)}
          <group position={[H.x0 - 0.75, y + 0.12, 0]}>{[0, 1, 2, 3].map((k) => <mesh key={k} position={[0, k * 0.09, 0]} material={m.coaming} castShadow><boxGeometry args={[0.9, 0.08, H.hw * 2 - 0.2]} /></mesh>)}</group>
        </> : <>
          <mesh position={[cx, y + 0.56, 0]} material={m.tarp} castShadow><boxGeometry args={[L + 0.1, 0.14, H.hw * 2 + 0.1]} /><Ink k={0.5} /></mesh>
          {Array.from({ length: Math.floor(L / 0.9) }, (_, k) => <mesh key={k} position={[H.x0 + 0.45 + k * 0.9, y + 0.64, 0]} material={m.coaming}><boxGeometry args={[0.06, 0.04, H.hw * 2 + 0.14]} /></mesh>)}
        </>}
      </group>; })}
      {blocks.map((b, i) => <GraniteBlock key={i} n={b.n} p={b.p} ink={0.35} />)}
      {/* masts, king-post, derricks, rigging */}
      <mesh position={[0.6, shipDeckY(0.6) + 3.6, 0]} material={m.mast} castShadow><cylinderGeometry args={[0.1, 0.16, 7.2, 10]} /><Ink k={0.5} /></mesh>
      <mesh position={[0.6, shipDeckY(0.6) + 5.4, 0]} material={m.mast}><boxGeometry args={[0.12, 0.12, 2.0]} /></mesh>
      <mesh position={[8.4, shipDeckY(8.4) + 3.1, 0]} material={m.mast} castShadow><cylinderGeometry args={[0.09, 0.14, 6.2, 10]} /><Ink k={0.5} /></mesh>
      <mesh position={[0.6, shipDeckY(0.6) + 0.6, 0]} material={m.mast} castShadow><boxGeometry args={[0.7, 1.2, 1.2]} /><Ink k={0.5} /></mesh>
      <primitive object={rigging.lines} /><primitive object={rigging.booms} />
      {/* windlass + bitts + ventilators */}
      <mesh position={[10.0, shipDeckY(10) + 0.3, 0]} material={m.black} castShadow><boxGeometry args={[0.7, 0.5, 1.4]} /><Ink k={0.4} /></mesh>
      {[[-5.2, 1.3], [-5.2, -1.3], [9.6, 0.9], [9.6, -0.9]].map(([x, z], k) => <group key={k} position={[x, shipDeckY(x), z]}><mesh position={[0, 0.22, 0]} material={m.black}><cylinderGeometry args={[0.1, 0.1, 0.44, 8]} /></mesh><mesh position={[0, 0.22, 0.25 * Math.sign(z)]} material={m.black}><cylinderGeometry args={[0.1, 0.1, 0.44, 8]} /></mesh></group>)}
      {[[-1.2, 1.5], [-1.2, -1.5], [8.0, 1.0]].map(([x, z], k) => <group key={`v${k}`} position={[x, shipDeckY(x), z]}><mesh position={[0, 0.45, 0]} material={m.white}><cylinderGeometry args={[0.13, 0.13, 0.9, 10]} /></mesh><mesh position={[0.08, 0.95, 0]} rotation={[0, 0, -0.6]} material={m.white}><cylinderGeometry args={[0.22, 0.13, 0.28, 10]} /></mesh></group>)}
      {/* superstructure aft: house, boat deck, wheelhouse with window band, wings, funnel, lifeboats */}
      <group position={[sx, sy, 0]}>
        <mesh position={[0, 0.75, 0]} material={m.white} castShadow receiveShadow><boxGeometry args={[3.4, 1.5, 3.7]} /><Ink k={0.8} /></mesh>
        <mesh position={[0.3, 1.95, 0]} material={m.white} castShadow><boxGeometry args={[2.7, 0.9, 3.1]} /><Ink k={0.7} /></mesh>
        <mesh position={[0.75, 2.95, 0]} material={m.white} castShadow><boxGeometry args={[1.7, 1.1, 4.4]} /><Ink k={0.7} /></mesh>
        <mesh position={[0.75, 3.55, 0]} material={m.white}><boxGeometry args={[1.9, 0.1, 4.6]} /></mesh>
        <mesh position={[1.62, 3.05, 0]} material={m.glass}><boxGeometry args={[0.04, 0.45, 3.9]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[0.75, 3.05, s * 2.21]} material={m.glass}><boxGeometry args={[1.3, 0.45, 0.04]} /></mesh>)}
        {[-1.1, -0.4, 0.3, 1.0].map((x, k) => [-1, 1].map((s) => <mesh key={`${k}${s}`} position={[x, 0.95, s * 1.86]} material={(k + (s > 0 ? 1 : 0)) % 2 && lights > 0.5 ? m.lit : m.glass}><boxGeometry args={[0.38, 0.32, 0.03]} /></mesh>))}
        {[-0.7, 0.0, 0.7].map((z) => <mesh key={z} position={[1.71, 0.95, z]} material={m.glass}><boxGeometry args={[0.03, 0.32, 0.4]} /></mesh>)}
        <mesh position={[0.75, 3.75, 0]} material={m.mast}><cylinderGeometry args={[0.05, 0.05, 1.6, 6]} /></mesh>
        <mesh position={[0.75, 4.5, 0]} material={m.black}><boxGeometry args={[0.1, 0.06, 0.9]} /></mesh>
        <mesh position={[0.75, 3.15, 2.3]} material={m.green}><boxGeometry args={[0.12, 0.12, 0.08]} /></mesh>
        <mesh position={[0.75, 3.15, -2.3]} material={m.red}><boxGeometry args={[0.12, 0.12, 0.08]} /></mesh>
        <group position={[-1.0, 2.4, 0]} rotation={[0, 0, 0.12]}>
          <mesh position={[0, 1.1, 0]} scale={[1, 1, 0.72]} material={m.funnel} castShadow><cylinderGeometry args={[0.62, 0.7, 2.2, 20]} /><Ink k={0.7} /></mesh>
          <mesh position={[0, 1.35, 0]} scale={[1, 1, 0.72]} material={m.band}><cylinderGeometry args={[0.64, 0.66, 0.35, 20]} /></mesh>
          <mesh position={[0, 2.1, 0]} scale={[1, 1, 0.72]} material={m.black}><cylinderGeometry args={[0.61, 0.62, 0.3, 20]} /></mesh>
        </group>
        {[-1, 1].map((s) => <group key={s} position={[-0.3, 2.65, s * 1.75]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={m.white} castShadow><capsuleGeometry args={[0.27, 1.5, 4, 10]} /><Ink k={0.5} /></mesh>
          <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.9]} material={m.boat}><capsuleGeometry args={[0.2, 1.3, 4, 10]} /></mesh>
          {[-0.75, 0.75].map((x) => <mesh key={x} position={[x, 0.15, s * 0.1]} rotation={[s * 0.4, 0, 0]} material={m.black}><cylinderGeometry args={[0.03, 0.03, 0.9, 5]} /></mesh>)}
        </group>)}
      </group>
      <primitive object={rigging.rails} />
      {ports.map((p, i) => <mesh key={i} position={p.p} rotation={[Math.PI / 2, 0, 0]} material={i % 3 === 0 && lights > 0.5 ? m.lit : m.glass}><cylinderGeometry args={[0.09, 0.09, 0.03, 10]} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={`a${s}`} position={[10.6, shipDeckY(10.6) - 0.7, s * (shipHalfBeam(10.6) * 1.13 + 0.02)]} rotation={[Math.PI / 2, 0, 0]} material={m.black}><cylinderGeometry args={[0.2, 0.2, 0.06, 12]} /></mesh>)}
    </group>
  );
};

// ---------------------------------------------------------------- quay portal crane (London)
const craneMats = once(() => ({ y: std({ color: "#d39a1f", roughness: 0.55, metalness: 0.15 }), d: std({ color: "#2a2b30", roughness: 0.6, metalness: 0.3 }), w: std({ color: "#e8e1d2", roughness: 0.7 }), glass: std({ color: "#1f2c3a", roughness: 0.15, metalness: 0.5 }), rope: std({ color: "#1b1b1b", roughness: 0.7 }), hookY: std({ color: "#e0b020", roughness: 0.5 }) }));
export type CraneState = { yaw: number; radius: number; hookY: number; load: "none" | "slung" | "slack"; swing: number; blockRy?: number };
export const QUAY = { legH: 6.0, pivotH: 7.4, jib: 10.0 };
/** jib luff angle for a given radius (level-luffing: hook radius = jib * cos(angle)) */
export const jibAngle = (R: number) => Math.acos(Math.min(0.98, Math.max(0.2, R / QUAY.jib)));
export const tipOf = (base: V3, s: CraneState): V3 => { const a = jibAngle(s.radius), r = QUAY.jib * Math.cos(a) + 0.8; return [base[0] + Math.cos(s.yaw) * r, base[1] + QUAY.pivotH + QUAY.jib * Math.sin(a), base[2] - Math.sin(s.yaw) * r]; };
export const QuayCrane: React.FC<{ base: V3; s: CraneState; blockN: number }> = ({ base, s, blockN }) => {
  const m = craneMats();
  const jib = useMemo(() => struts(latticePairs(QUAY.jib, 0.8, 0.8, 14, 0.4), 0.035, m.y), [m]);
  const legs = useMemo(() => { const P: [V3, V3][] = []; const H = QUAY.legH, c: V3[] = [[1.6, 0, 1.6], [1.6, 0, -1.6], [-1.6, 0, -1.6], [-1.6, 0, 1.6]], t = (p: V3): V3 => [p[0] * 0.45, H, p[2] * 0.45];
    c.forEach((p, i) => { P.push([p, t(p)]); const q = c[(i + 1) % 4]; for (let k = 0; k < 3; k++) { const u0 = k / 3, u1 = (k + 1) / 3, a: V3 = [p[0] + (t(p)[0] - p[0]) * u0, H * u0, p[2] + (t(p)[2] - p[2]) * u0], b: V3 = [q[0] + (t(q)[0] - q[0]) * u1, H * u1, q[2] + (t(q)[2] - q[2]) * u1]; P.push([a, b]); P.push([a, [q[0] + (t(q)[0] - q[0]) * u0, H * u0, q[2] + (t(q)[2] - q[2]) * u0]]); } });
    return struts(P, 0.05, m.y); }, [m]);
  const a = jibAngle(s.radius), tip = tipOf(base, s);
  const hook: V3 = [tip[0] + s.swing * Math.cos(s.yaw + Math.PI / 2) * 0.3, s.hookY, tip[2] - s.swing * Math.sin(s.yaw + Math.PI / 2) * 0.3];
  const blockC: V3 = [hook[0], hook[1] - 1.05 - BLOCK[1] / 2, hook[2]];
  const bry = s.blockRy ?? s.yaw;
  const corners: V3[] = [[-0.38, 0, -0.24], [0.38, 0, -0.24], [0.38, 0, 0.24], [-0.38, 0, 0.24]].map(([x, , z]) => { const c = Math.cos(-bry), sn = Math.sin(-bry); return [blockC[0] + x * c - z * sn, blockC[1] + BLOCK[1] / 2 + 0.02, blockC[2] + x * sn + z * c] as V3; });
  return (
    <group>
      <group position={base}>
        <primitive object={legs} />
        {[[1.6, 1.6], [1.6, -1.6], [-1.6, -1.6], [-1.6, 1.6]].map(([x, z], k) => <mesh key={k} position={[x, 0.25, z]} material={m.d} castShadow><boxGeometry args={[0.6, 0.5, 0.9]} /><Ink k={0.5} /></mesh>)}
        <mesh position={[0, QUAY.legH + 0.15, 0]} material={m.y} castShadow><cylinderGeometry args={[1.2, 1.2, 0.3, 24]} /><Ink k={0.6} /></mesh>
        <group position={[0, QUAY.legH + 0.3, 0]} rotation={[0, s.yaw, 0]}>
          <mesh position={[-0.4, 0.9, 0]} material={m.y} castShadow receiveShadow><boxGeometry args={[2.8, 1.8, 2.0]} /><Ink k={0.8} /></mesh>
          <mesh position={[-0.4, 1.85, 0]} material={m.d}><boxGeometry args={[2.9, 0.12, 2.1]} /></mesh>
          <mesh position={[1.25, 1.0, 0.65]} material={m.w} castShadow><boxGeometry args={[0.9, 1.3, 0.75]} /><Ink k={0.6} /></mesh>
          <mesh position={[1.71, 1.15, 0.65]} material={m.glass}><boxGeometry args={[0.03, 0.7, 0.6]} /></mesh>
          <mesh position={[1.25, 1.15, 1.03]} material={m.glass}><boxGeometry args={[0.6, 0.6, 0.03]} /></mesh>
          <mesh position={[-1.95, 0.6, 0]} material={m.d} castShadow><boxGeometry args={[0.7, 1.2, 1.8]} /><Ink k={0.6} /></mesh>
          <Rod a={[-0.9, 1.8, 0.6]} b={[-0.2, 4.2, 0]} r={0.08} m={m.y} /><Rod a={[-0.9, 1.8, -0.6]} b={[-0.2, 4.2, 0]} r={0.08} m={m.y} /><Rod a={[0.5, 1.8, 0]} b={[-0.2, 4.2, 0]} r={0.08} m={m.y} />
          <group position={[0.8, QUAY.pivotH - QUAY.legH - 0.3, 0]} rotation={[0, 0, a]}><primitive object={jib} /><mesh position={[QUAY.jib, 0, 0]} material={m.d}><cylinderGeometry args={[0.25, 0.25, 0.3, 14]} /></mesh></group>
          <Rod a={[-0.2, 4.2, 0]} b={[0.8 + QUAY.jib * Math.cos(a) * 0.62, QUAY.pivotH - QUAY.legH - 0.3 + QUAY.jib * Math.sin(a) * 0.62, 0]} r={0.025} m={m.rope} />
        </group>
      </group>
      <Rod a={tip} b={[hook[0], hook[1] + 0.35, hook[2]]} r={0.022} m={m.rope} shadow={false} />
      <mesh position={[hook[0], hook[1] + 0.2, hook[2]]} rotation={[0, s.yaw, 0]} material={m.hookY} castShadow><boxGeometry args={[0.3, 0.42, 0.22]} /><Ink k={0.5} /></mesh>
      <mesh position={[hook[0], hook[1] - 0.12, hook[2]]} rotation={[Math.PI / 2, 0, s.yaw]} material={m.d}><torusGeometry args={[0.1, 0.03, 6, 12, 4.4]} /></mesh>
      {s.load !== "none" && <>
        {corners.map((c, k) => <Rod key={k} a={[hook[0], hook[1] - 0.15, hook[2]]} b={s.load === "slung" ? c : [c[0] + (c[0] - hook[0]) * 0.15, c[1] + 0.25, c[2] + (c[2] - hook[2]) * 0.15]} r={0.014} m={m.rope} shadow={false} />)}
      </>}
      {s.load === "slung" && <GraniteBlock n={blockN} p={blockC} ry={bry} />}
    </group>
  );
};

// ---------------------------------------------------------------- 1960s trucks (+x forward), truck crane, mixer
const truckMats = once(() => ({
  cab: ["#b8452f", "#2f5f8f", "#d9a12a"].map((c) => std({ color: c, roughness: 0.42, metalness: 0.25 })),
  chrome: std({ color: "#d6d8dc", roughness: 0.18, metalness: 0.95 }), dark: std({ color: "#232428", roughness: 0.6, metalness: 0.3 }),
  tyre: std({ color: "#1b1b1d", roughness: 0.92 }), glass: std({ color: "#1e2a36", roughness: 0.08, metalness: 0.6 }),
  lamp: std({ color: "#fff2cc", emissive: "#ffe0a0", emissiveIntensity: 0.35, roughness: 0.2 }), tail: std({ color: "#b0201a", emissive: "#801010", emissiveIntensity: 0.4 }),
  wood: std({ map: deckTex(), roughness: 0.85 }), drum: std({ color: "#e6e1d6", roughness: 0.5, metalness: 0.2 }), yellow: std({ color: "#e0a91f", roughness: 0.5, metalness: 0.15 }),
  chain: std({ color: "#3a3b3e", roughness: 0.5, metalness: 0.8 }), rust: std({ color: "#7a4a2e", roughness: 0.9 }),
}));
const hoodGeo = once(() => new RoundedBoxGeometry(1.55, 0.82, 1.22, 3, 0.2)), cabGeo = once(() => new RoundedBoxGeometry(1.3, 1.32, 2.0, 3, 0.14));
export const Wheel5: React.FC<{ p: V3; spin: number; dual?: boolean }> = ({ p, spin, dual }) => {
  const m = truckMats();
  return (
    <group position={p} rotation={[0, 0, -spin]}>
      {(dual ? [-0.15, 0.15] : [0]).map((dz) => <mesh key={dz} position={[0, 0, dz]} material={m.tyre} castShadow><torusGeometry args={[0.33, 0.13, 10, 22]} /><Ink k={0.6} /></mesh>)}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={m.chrome}><cylinderGeometry args={[0.22, 0.24, dual ? 0.42 : 0.24, 16]} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((k) => <mesh key={k} position={[Math.cos(k * TAU / 6) * 0.13, Math.sin(k * TAU / 6) * 0.13, dual ? 0.22 : 0.13]} rotation={[Math.PI / 2, 0, 0]} material={m.dark}><cylinderGeometry args={[0.025, 0.025, 0.04, 6]} /></mesh>)}
    </group>
  );
};
/** cab + hood + chassis + front axle (shared by every 1960s truck body); +x forward, ground y=0 */
const TruckFront: React.FC<{ c: number; spin: number }> = ({ c, spin }) => {
  const m = truckMats(), paint = m.cab[c % 3];
  return (
    <group>
      {[-0.42, 0.42].map((z) => <mesh key={z} position={[-0.9, 0.62, z]} material={m.dark} castShadow><boxGeometry args={[7.2, 0.2, 0.1]} /></mesh>)}
      <mesh geometry={cabGeo()} position={[1.2, 1.55, 0]} material={paint} castShadow receiveShadow><Ink k={0.8} /></mesh>
      <mesh geometry={hoodGeo()} position={[2.62, 1.27, 0]} material={paint} castShadow><Ink k={0.8} /></mesh>
      {[-1, 1].map((s) => <group key={s}>
        <mesh position={[1.89, 1.86, s * 0.47]} rotation={[0, s * 0.14, 0]} material={m.glass}><boxGeometry args={[0.04, 0.52, 0.84]} /></mesh>
        <mesh position={[1.35, 1.86, s * 1.005]} material={m.glass}><boxGeometry args={[0.72, 0.5, 0.02]} /></mesh>
        <mesh position={[0.92, 1.4, s * 1.005]} material={m.dark}><boxGeometry args={[0.02, 0.9, 0.012]} /></mesh>
        <mesh position={[1.62, 1.55, s * 1.01]} material={m.chrome}><boxGeometry args={[0.12, 0.04, 0.02]} /></mesh>
        <mesh position={[2.75, 0.68, s * 0.83]} rotation={[Math.PI / 2, 0, 0]} material={paint} castShadow><cylinderGeometry args={[0.58, 0.58, 0.42, 18, 1, true, Math.PI / 2, Math.PI]} /><Ink k={0.6} /></mesh>
        <mesh position={[1.25, 0.72, s * 0.98]} material={m.dark} castShadow><boxGeometry args={[1.2, 0.05, 0.3]} /></mesh>
        <group position={[3.32, 1.08, s * 0.8]}><mesh rotation={[0, 0, Math.PI / 2]} material={m.chrome}><cylinderGeometry args={[0.15, 0.13, 0.12, 16]} /></mesh><mesh position={[0.065, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.lamp}><cylinderGeometry args={[0.12, 0.12, 0.02, 16]} /></mesh></group>
        <Rod a={[1.85, 1.75, s * 1.0]} b={[1.95, 1.9, s * 1.32]} r={0.015} m={m.chrome} /><mesh position={[1.95, 1.98, s * 1.33]} material={m.chrome}><boxGeometry args={[0.04, 0.24, 0.14]} /></mesh>
      </group>)}
      <mesh position={[3.41, 1.24, 0]} material={m.chrome}><boxGeometry args={[0.06, 0.66, 0.92]} /></mesh>
      {[-0.33, -0.2, -0.07, 0.07, 0.2, 0.33].map((z) => <mesh key={z} position={[3.44, 1.24, z]} material={m.dark}><boxGeometry args={[0.02, 0.56, 0.06]} /></mesh>)}
      <mesh position={[3.6, 0.72, 0]} material={m.chrome} castShadow><boxGeometry args={[0.14, 0.18, 2.1]} /><Ink k={0.4} /></mesh>
      {[-0.3, 0, 0.3].map((z) => <mesh key={z} position={[1.3, 2.24, z]} material={m.lamp}><boxGeometry args={[0.08, 0.05, 0.1]} /></mesh>)}
      <mesh position={[0.48, 2.1, 0.92]} material={m.chrome}><cylinderGeometry args={[0.06, 0.06, 1.7, 10]} /></mesh>
      <mesh position={[0.48, 2.97, 0.92]} rotation={[0, 0, 0.5]} material={m.chrome}><cylinderGeometry args={[0.07, 0.07, 0.03, 10]} /></mesh>
      <mesh position={[0.3, 0.72, -0.82]} rotation={[0, 0, Math.PI / 2]} material={m.chrome} castShadow><cylinderGeometry args={[0.24, 0.24, 0.95, 16]} /></mesh>
      {[-1, 1].map((s) => <Wheel5 key={s} p={[2.75, 0.46, s * 0.86]} spin={spin} />)}
    </group>
  );
};
/** 1960s long-nose flatbed with stake sides, chained numbered granite blocks */
export const Truck5: React.FC<{ c: number; spin: number; cargo: number[] }> = ({ c, spin, cargo }) => {
  const m = truckMats();
  const stakes = useMemo(() => { const P: [V3, V3][] = []; for (const s of [-1, 1]) for (let x = -4.0; x <= 0.1; x += 0.7) P.push([[x, 1.05, s * 1.06], [x, 1.62, s * 1.06]]); for (let z = -1; z <= 1.01; z += 0.4) P.push([[0.3, 1.05, z], [0.3, 2.15, z]]); P.push([[0.3, 2.15, -1.05], [0.3, 2.15, 1.05]], [[0.3, 1.6, -1.05], [0.3, 1.6, 1.05]]); return struts(P, 0.035, m.dark); }, [m]);
  return (
    <group>
      <TruckFront c={c} spin={spin} />
      <mesh position={[-1.9, 0.98, 0]} material={m.wood} castShadow receiveShadow><boxGeometry args={[4.7, 0.14, 2.2]} /><Ink k={0.7} /></mesh>
      {[-1, 1].map((s) => <mesh key={s} position={[-1.9, 0.92, s * 1.1]} material={m.dark}><boxGeometry args={[4.7, 0.16, 0.06]} /></mesh>)}
      <primitive object={stakes} />
      {[-1, 1].map((s) => <group key={s}><Wheel5 p={[-2.35, 0.46, s * 0.9]} spin={spin} dual /><Wheel5 p={[-3.45, 0.46, s * 0.9]} spin={spin} dual /><mesh position={[-4.05, 0.55, s * 0.9]} material={m.tyre}><boxGeometry args={[0.04, 0.5, 0.5]} /></mesh><mesh position={[-4.27, 0.95, s * 0.95]} material={m.tail}><boxGeometry args={[0.04, 0.1, 0.16]} /></mesh></group>)}
      {cargo.map((n, k) => <GraniteBlock key={k} n={n} p={[-3.55 + (k % 3) * 1.12, 1.35 + Math.floor(k / 6) * 0.6, k % 6 < 3 ? -0.45 : 0.45]} ink={0.4} />)}
      {cargo.length > 0 && [-3.0, -0.95].map((x) => <group key={x}><Rod a={[x, 1.0, -1.1]} b={[x, 1.72, -0.85]} r={0.022} m={m.chain} /><Rod a={[x, 1.72, -0.85]} b={[x, 1.72, 0.85]} r={0.022} m={m.chain} /><Rod a={[x, 1.72, 0.85]} b={[x, 1.0, 1.1]} r={0.022} m={m.chain} /></group>)}
    </group>
  );
};
/** truck crane: 4-axle carrier, outriggers, slewing cab, lattice boom, hook block + slung block */
export const TruckCrane: React.FC<{ yaw: number; hookDrop: number; carrying: boolean; blockN: number; luff?: number; blockSpin?: number }> = ({ yaw, hookDrop, carrying, blockN, luff = 0.95, blockSpin = 0 }) => {
  const m = truckMats(), L = 12.6;
  const boom = useMemo(() => struts(latticePairs(L, 0.75, 0.75, 16, 0.45), 0.03, m.yellow), [m]);
  const tipL: V3 = [0.9 + Math.cos(luff) * L, 2.7 + Math.sin(luff) * L, 0];
  return (
    <group>
      <TruckFront c={2} spin={0} />
      <mesh position={[-2.0, 1.02, 0]} material={m.yellow} castShadow receiveShadow><boxGeometry args={[5.2, 0.5, 2.1]} /><Ink k={0.7} /></mesh>
      {[-1, 1].map((s) => <group key={s}>{[-1.2, -2.3, -3.6].map((x) => <Wheel5 key={x} p={[x, 0.46, s * 0.9]} spin={0} dual />)}
        {[0.1, -4.3].map((x) => <group key={x}><mesh position={[x, 0.9, s * 1.7]} material={m.yellow} castShadow><boxGeometry args={[0.3, 0.25, 1.6]} /></mesh><mesh position={[x, 0.45, s * 2.45]} material={m.dark}><cylinderGeometry args={[0.08, 0.08, 0.9, 8]} /></mesh><mesh position={[x, 0.04, s * 2.45]} material={m.dark}><cylinderGeometry args={[0.3, 0.3, 0.08, 12]} /></mesh></group>)}
      </group>)}
      <group position={[-2.0, 1.3, 0]} rotation={[0, yaw, 0]}>
        <mesh position={[0, 0.1, 0]} material={m.dark}><cylinderGeometry args={[0.9, 0.9, 0.2, 20]} /></mesh>
        <mesh position={[-0.5, 0.75, 0]} material={m.yellow} castShadow><boxGeometry args={[2.6, 1.1, 1.9]} /><Ink k={0.7} /></mesh>
        <mesh position={[1.05, 0.95, -0.78]} material={m.yellow} castShadow><boxGeometry args={[0.9, 1.4, 0.7]} /><Ink k={0.6} /></mesh>
        <mesh position={[1.51, 1.1, -0.78]} material={m.glass}><boxGeometry args={[0.03, 0.75, 0.55]} /></mesh>
        <mesh position={[-1.9, 0.6, 0]} material={m.dark} castShadow><boxGeometry args={[0.5, 0.9, 1.7]} /></mesh>
        <group position={[0.9, 1.4, 0]} rotation={[0, 0, luff]}><primitive object={boom} /></group>
        <Rod a={[-0.8, 1.4, 0]} b={[0.9 + Math.cos(luff) * L * 0.55, 1.4 + Math.sin(luff) * L * 0.55, 0]} r={0.025} m={m.dark} />
        <Rod a={[tipL[0], tipL[1] - 1.3, 0]} b={[tipL[0], tipL[1] - 1.3 - hookDrop, 0]} r={0.02} m={m.dark} shadow={false} />
        <mesh position={[tipL[0], tipL[1] - 1.3 - hookDrop - 0.15, 0]} material={m.yellow} castShadow><boxGeometry args={[0.26, 0.36, 0.2]} /></mesh>
        {carrying && <>{[[-0.38, -0.24], [0.38, -0.24], [0.38, 0.24], [-0.38, 0.24]].map(([x, z], k) => { const cs = Math.cos(blockSpin), sn = Math.sin(blockSpin); return <Rod key={k} a={[tipL[0], tipL[1] - 1.3 - hookDrop - 0.3, 0]} b={[tipL[0] + x * cs + z * sn, tipL[1] - 1.3 - hookDrop - 1.25, -x * sn + z * cs]} r={0.012} m={m.dark} shadow={false} />; })}
          <GraniteBlock n={blockN} p={[tipL[0], tipL[1] - 1.3 - hookDrop - 1.55, 0]} ry={blockSpin} /></>}
      </group>
    </group>
  );
};
const drumGeo = once(() => { const pts = [[0, -1.7], [0.55, -1.6], [1.05, -1.0], [1.18, 0.0], [1.0, 0.9], [0.55, 1.5], [0.45, 1.75]].map(([r, y]) => new THREE.Vector2(r, y)); return new THREE.LatheGeometry(pts, 28); });
export const MixerTruck: React.FC<{ drum: number; spin: number; c?: number }> = ({ drum, spin, c = 0 }) => {
  const m = truckMats();
  return (
    <group>
      <TruckFront c={c} spin={spin} />
      {[-1, 1].map((s) => <group key={s}><Wheel5 p={[-2.2, 0.46, s * 0.9]} spin={spin} dual /><Wheel5 p={[-3.3, 0.46, s * 0.9]} spin={spin} dual /></group>)}
      <group position={[-1.6, 2.0, 0]} rotation={[0, 0, Math.PI / 2 - 0.22]}>
        <group rotation={[0, drum, 0]}><mesh geometry={drumGeo()} material={m.drum} castShadow><Ink k={0.7} /></mesh>
          {[0, 1, 2, 3, 4].map((k) => <mesh key={k} position={[0, -1.2 + k * 0.6, 0]} rotation={[Math.PI / 2, 0, k * 1.3]} material={m.cab[(c + 1) % 3]}><torusGeometry args={[1.1 - Math.abs(k - 2) * 0.12, 0.05, 6, 20, 2.4]} /></mesh>)}</group>
      </group>
      <mesh position={[-4.0, 2.1, 0]} rotation={[0, 0, -0.6]} material={m.dark} castShadow><boxGeometry args={[0.9, 0.18, 0.5]} /></mesh>
      <mesh position={[0.2, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.chrome}><cylinderGeometry args={[0.3, 0.3, 1.4, 14]} /></mesh>
      <mesh position={[-1.6, 0.85, 0]} material={m.dark}><boxGeometry args={[4.2, 0.3, 1.4]} /></mesh>
    </group>
  );
};

// ---------------------------------------------------------------- tracked excavator (+x forward)
export type ExcQ = { yaw: number; boom: number; stick: number; bucket: number; track: number };
const excMats = once(() => ({ y: std({ color: "#e3ac1c", roughness: 0.5, metalness: 0.12 }), d: std({ color: "#26272b", roughness: 0.7, metalness: 0.3 }), steel: std({ color: "#5d6066", roughness: 0.5, metalness: 0.6 }), chrome: std({ color: "#d9dce0", roughness: 0.15, metalness: 0.95 }), glass: std({ color: "#1d2b38", roughness: 0.08, metalness: 0.5 }), lamp: std({ color: "#fff3d0", emissive: "#ffe2a8", emissiveIntensity: 0.6 }), hose: std({ color: "#111214", roughness: 0.8 }) }));
const TRK = { L: 3.0, r: 0.41, yTop: 0.86, yBot: 0.05 };
const shoeGeo = once(() => new THREE.BoxGeometry(0.19, 0.07, 0.62));
const bucketGeo = once(() => { const s = new THREE.Shape(); s.moveTo(0, 0.12); s.quadraticCurveTo(-0.25, -0.2, -0.05, -0.62); s.quadraticCurveTo(0.25, -0.86, 0.78, -0.62); s.lineTo(0.7, -0.52); s.quadraticCurveTo(0.25, -0.72, 0.05, -0.55); s.quadraticCurveTo(-0.12, -0.2, 0.12, 0.06); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.86, bevelEnabled: false }); g.translate(0, 0, -0.43); return g; });
const P2 = (o: [number, number], a: number, l: number): [number, number] => [o[0] + Math.cos(a) * l, o[1] + Math.sin(a) * l];
export const Excavator5: React.FC<{ q: ExcQ }> = ({ q }) => {
  const m = excMats();
  const shoes = useMemo(() => [-1, 1].map(() => { const im = new THREE.InstancedMesh(shoeGeo(), m.d, 46); im.castShadow = true; return im; }), [m]);
  { const per = 2 * TRK.L + 2 * Math.PI * TRK.r, n = 46, sp = per / n, o = new THREE.Object3D(), cy = (TRK.yTop + TRK.yBot) / 2;
    shoes.forEach((im, si) => { for (let i = 0; i < n; i++) { let s = ((i * sp + q.track) % per + per) % per; let x: number, y: number, a: number;
      if (s < TRK.L) { x = TRK.L / 2 - s; y = TRK.yTop; a = Math.PI; } else if ((s -= TRK.L) < Math.PI * TRK.r) { const t = s / TRK.r; x = -TRK.L / 2 - Math.sin(t) * TRK.r; y = cy + Math.cos(t) * TRK.r; a = Math.PI + t; }
      else if ((s -= Math.PI * TRK.r) < TRK.L) { x = -TRK.L / 2 + s; y = TRK.yBot; a = 0; } else { s -= TRK.L; const t = s / TRK.r; x = TRK.L / 2 + Math.sin(t) * TRK.r; y = cy - Math.cos(t) * TRK.r; a = t; }
      o.position.set(x, y, (si ? 1 : -1) * 1.05); o.rotation.set(0, 0, a); o.updateMatrix(); im.setMatrixAt(i, o.matrix); } im.instanceMatrix.needsUpdate = true; }); }
  // planar kinematics in the upper's (x,y) plane, boom at z=+0.35
  const p0: [number, number] = [0.75, 0.95], a1 = q.boom, p1 = P2(p0, a1, 2.3), a2 = a1 - 0.78, p2 = P2(p1, a2, 2.2), b = a2 - q.stick, p3 = P2(p2, b, 2.0), c = b - q.bucket;
  const z = 0.35, V = (p: [number, number], dz = 0): V3 => [p[0], p[1], z + dz];
  const nUp = (a: number, d: number): [number, number] => [-Math.sin(a) * d, Math.cos(a) * d];
  const add = (p: [number, number], d: [number, number]): [number, number] => [p[0] + d[0], p[1] + d[1]];
  const bc0: [number, number] = [1.3, 0.35], bc1 = add(P2(p0, a1, 1.35), nUp(a1, -0.28));
  const sc0 = add(P2(p0, a1, 1.7), nUp(a1, 0.32)), sc1 = add(P2(p2, b, -0.55), nUp(b, 0.08));
  const kc0 = add(P2(p2, b, 0.45), nUp(b, 0.22)), kc1 = add(p3, [Math.cos(c + 1.9) * 0.38, Math.sin(c + 1.9) * 0.38]);
  const Cyl: React.FC<{ a: [number, number]; e: [number, number]; dz?: number; r?: number }> = ({ a, e, dz = 0, r = 0.085 }) => { const mid: [number, number] = [a[0] + (e[0] - a[0]) * 0.58, a[1] + (e[1] - a[1]) * 0.58]; return <><Rod a={V(a, dz)} b={V(mid, dz)} r={r} m={m.y} ink={0.4} /><Rod a={V(mid, dz)} b={V(e, dz)} r={r * 0.55} m={m.chrome} /></>; };
  const Seg: React.FC<{ a: [number, number]; e: [number, number]; h: number; w: number }> = ({ a, e, h, w }) => { const l = Math.hypot(e[0] - a[0], e[1] - a[1]); return <mesh position={V([(a[0] + e[0]) / 2, (a[1] + e[1]) / 2])} rotation={[0, 0, Math.atan2(e[1] - a[1], e[0] - a[0])]} material={m.y} castShadow><boxGeometry args={[l + 0.1, h, w]} /><Ink k={0.6} /></mesh>; };
  return (
    <group>
      {[-1, 1].map((s) => <group key={s} position={[0, 0, s * 1.05]}>
        <mesh position={[0, 0.46, 0]} material={m.d} castShadow><boxGeometry args={[2.9, 0.42, 0.42]} /><Ink k={0.6} /></mesh>
        {[-TRK.L / 2, TRK.L / 2].map((x, k) => <mesh key={x} position={[x, (TRK.yTop + TRK.yBot) / 2, 0]} rotation={[Math.PI / 2, 0, 0]} material={k ? m.steel : m.d}><cylinderGeometry args={[0.35, 0.35, 0.46, k ? 18 : 10]} /></mesh>)}
        {[-1.0, -0.5, 0, 0.5, 1.0].map((x) => <mesh key={x} position={[x, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.steel}><cylinderGeometry args={[0.13, 0.13, 0.5, 10]} /></mesh>)}
        {[-0.6, 0.6].map((x) => <mesh key={x} position={[x, 0.74, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.steel}><cylinderGeometry args={[0.08, 0.08, 0.36, 8]} /></mesh>)}
      </group>)}
      <primitive object={shoes[0]} /><primitive object={shoes[1]} />
      <mesh position={[0, 0.62, 0]} material={m.d}><boxGeometry args={[1.4, 0.35, 1.7]} /></mesh>
      <mesh position={[0, 0.88, 0]} material={m.steel}><cylinderGeometry args={[0.85, 0.85, 0.16, 24]} /></mesh>
      <group position={[0, 0.96, 0]} rotation={[0, q.yaw, 0]}>
        <mesh position={[-0.25, 0.14, 0]} material={m.d} castShadow><boxGeometry args={[3.0, 0.22, 2.3]} /></mesh>
        <mesh position={[-0.95, 0.68, 0.1]} material={m.y} castShadow receiveShadow><boxGeometry args={[1.5, 0.86, 2.1]} /><Ink k={0.8} /></mesh>
        {[0, 1, 2, 3, 4].map((k) => <mesh key={k} position={[-1.35 + k * 0.2, 0.7, 1.16]} material={m.d}><boxGeometry args={[0.08, 0.5, 0.02]} /></mesh>)}
        <mesh position={[-1.95, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.55, 1, 1]} material={m.y} castShadow><cylinderGeometry args={[0.75, 0.75, 2.25, 20, 1, false, Math.PI, Math.PI]} /><Ink k={0.7} /></mesh>
        <mesh position={[-1.1, 1.35, 0.7]} material={m.chrome}><cylinderGeometry args={[0.06, 0.06, 0.55, 10]} /></mesh>
        <group position={[0.42, 0.25, -0.6]}>
          <mesh position={[0, 0.66, 0]} material={m.y} castShadow><boxGeometry args={[1.0, 1.3, 0.92]} /><Ink k={0.7} /></mesh>
          <mesh position={[0.51, 0.78, 0]} material={m.glass}><boxGeometry args={[0.03, 0.85, 0.74]} /></mesh>
          <mesh position={[0.05, 0.85, -0.47]} material={m.glass}><boxGeometry args={[0.8, 0.62, 0.03]} /></mesh>
          <mesh position={[0.05, 0.85, 0.47]} material={m.glass}><boxGeometry args={[0.8, 0.62, 0.03]} /></mesh>
          <mesh position={[0.35, 1.35, 0]} material={m.lamp}><boxGeometry args={[0.1, 0.08, 0.18]} /></mesh>
        </group>
        <Rod a={[-1.6, 1.1, 1.15]} b={[0.1, 1.1, 1.15]} r={0.02} m={m.y} /><Rod a={[-1.6, 0.25, 1.15]} b={[-1.6, 1.1, 1.15]} r={0.02} m={m.y} /><Rod a={[0.1, 0.25, 1.15]} b={[0.1, 1.1, 1.15]} r={0.02} m={m.y} />
        <mesh position={[p0[0], p0[1] - 0.2, z]} material={m.y} castShadow><boxGeometry args={[0.7, 0.6, 0.55]} /><Ink k={0.5} /></mesh>
        <Seg a={p0} e={p1} h={0.48} w={0.4} /><Seg a={p1} e={p2} h={0.4} w={0.38} />
        <Seg a={P2(p2, b, -0.55)} e={p3} h={0.32} w={0.3} />
        {[-0.22, 0.22].map((dz) => <Cyl key={dz} a={bc0} e={bc1} dz={dz} r={0.08} />)}
        <Cyl a={sc0} e={sc1} r={0.075} /><Cyl a={kc0} e={kc1} r={0.06} />
        <Rod a={V(add(p0, [0.1, 0.25]), 0.22)} b={V(add(p1, nUp(a1, 0.26)), 0.22)} r={0.022} m={m.hose} /><Rod a={V(add(p1, nUp(a1, 0.26)), 0.22)} b={V(add(p2, nUp(a2, 0.22)), 0.22)} r={0.022} m={m.hose} />
        <mesh position={V(add(p1, nUp(a1, 0.3)), -0.2)} material={m.lamp}><boxGeometry args={[0.12, 0.1, 0.1]} /></mesh>
        <group position={V(p3)} rotation={[0, 0, c]}><mesh geometry={bucketGeo()} material={m.d} castShadow><Ink k={0.5} /></mesh>
          {[-0.32, -0.16, 0, 0.16, 0.32].map((tz) => <mesh key={tz} position={[0.83, -0.6, tz]} rotation={[0, 0, -1.9]} material={m.steel}><coneGeometry args={[0.05, 0.18, 6]} /></mesh>)}</group>
      </group>
    </group>
  );
};
