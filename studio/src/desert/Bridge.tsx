// Rebuilt London Bridge (Rennie-style, five elliptical granite arches) with STABLE, correctly mapped masonry.
// Fixes vs the first pass:
//  - UVs: facade = world x/y; arch soffits + pier sides = (depth, arc-length) so courses follow the curve with
//    no stretching; every block/box uses world-scale box projection (no per-face 0..1 stretch).
//  - No coplanar surfaces (the old full-depth voussoir rings z-fought the soffit -> stripes). Rings are now thin
//    facade bands offset outward; pilasters/cutwaters/cornice overlap only inside solid volume.
//  - Detail: radial voussoirs + keystones, rusticated pier bases, cutwaters with stone caps, string course,
//    dentilled cornice, pedestals + balusters + coping, ornate lamp standards, asphalt road with granite kerbs.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Ink } from "../inventor/Workshop";
import { rng } from "../lib/math";

export const BR2 = { deck: 8.4, width: 9, chanDepth: 1.6 };
export const SPANS = [7, 8.5, 10, 8.5, 7], PIER = 2.4, ABUT = 4.5, RISE = [4.6, 5.4, 6.3, 5.4, 4.6];
export const BRIDGE_LEN = SPANS.reduce((a, b) => a + b, 0) + PIER * (SPANS.length - 1) + ABUT * 2;
export const ARCH_C = (() => { let x = -BRIDGE_LEN / 2 + ABUT; return SPANS.map((s) => { const c = x + s / 2; x += s + PIER; return c; }); })();
export const PIER_X = ARCH_C.slice(0, -1).map((c, i) => c + SPANS[i] / 2 + PIER / 2);
const baseY = (i: number) => (i === 2 ? -BR2.chanDepth : 0);

// ---------------- textures ----------------
const canvas = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed: number) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!, rng(seed)); return c;
};
const toTex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 16; return t; };
/** Granite ashlar: 8 courses per tile (tile = 4 m -> 0.5 m courses), staggered blocks, chisel texture, bevelled joints,
 *  weathering streaks and lichen. One tile = TILE metres in world UV space. */
export const TILE = 4.0;
const granite = (seed: number, base: number) => canvas(2048, 2048, (g, r) => {
  const rows = 8, rh = 2048 / rows;
  for (let j = 0; j < rows; j++) {
    let x = -r() * 300;
    while (x < 2048) {
      const w = 330 + r() * 360, l = base + r() * 12, hue = 28 + r() * 16;
      g.fillStyle = `hsl(${hue},${7 + r() * 9}%,${l}%)`; g.fillRect(x, j * rh, w, rh);
      for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "20,16,12"},${0.04 + r() * 0.09})`; g.fillRect(x + r() * w, j * rh + r() * rh, 1 + r() * 2.5, 1 + r() * 2.5); }
      for (let k = 0; k < 14; k++) { g.strokeStyle = `rgba(40,34,28,${0.06 + r() * 0.08})`; g.lineWidth = 1; const yy = j * rh + 10 + r() * (rh - 20); g.beginPath(); g.moveTo(x + 8, yy); g.lineTo(x + w - 8, yy + (r() - 0.5) * 6); g.stroke(); } // tooling lines
      const gr = g.createLinearGradient(0, j * rh, 0, (j + 1) * rh); gr.addColorStop(0, "rgba(255,244,228,0.16)"); gr.addColorStop(0.15, "rgba(255,244,228,0)"); gr.addColorStop(0.85, "rgba(20,14,8,0)"); gr.addColorStop(1, "rgba(20,14,8,0.28)");
      g.fillStyle = gr; g.fillRect(x, j * rh, w, rh);
      if (r() < 0.3) { const sx = x + r() * w; const s2 = g.createLinearGradient(0, j * rh, 0, j * rh + rh * 2); s2.addColorStop(0, "rgba(70,55,35,0.22)"); s2.addColorStop(1, "rgba(70,55,35,0)"); g.fillStyle = s2; g.fillRect(sx, j * rh, 14 + r() * 30, rh * 2); } // rain streak
      if (r() < 0.12) { g.fillStyle = `rgba(${150 + r() * 40},${150 + r() * 30},90,0.25)`; for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(x + r() * w, j * rh + r() * rh, 2 + r() * 7, 0, Math.PI * 2); g.fill(); } } // lichen
      g.fillStyle = "#3e352d"; g.fillRect(x, j * rh, 7, rh); g.fillStyle = "rgba(255,240,220,0.18)"; g.fillRect(x + 7, j * rh, 3, rh);
      x += w;
    }
    g.fillStyle = "#3e352d"; g.fillRect(0, j * rh, 2048, 7); g.fillStyle = "rgba(255,240,220,0.15)"; g.fillRect(0, j * rh + 7, 2048, 3);
  }
}, seed);
/** Voussoir band: 7 tapered blocks per tile across u, radial in v (inner edge v=0 -> outer v=1). */
const voussoir = () => canvas(1024, 256, (g, r) => {
  for (let k = 0; k < 7; k++) {
    const x = (k / 7) * 1024, w = 1024 / 7, l = 44 + r() * 14;
    g.fillStyle = `hsl(${26 + r() * 14},${8 + r() * 8}%,${l}%)`; g.fillRect(x, 0, w, 256);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "20,16,12"},${0.05 + r() * 0.08})`; g.fillRect(x + r() * w, r() * 256, 2, 2); }
    const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, "rgba(255,240,220,0.18)"); gr.addColorStop(0.2, "rgba(0,0,0,0)"); gr.addColorStop(0.85, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(20,12,6,0.3)");
    g.fillStyle = gr; g.fillRect(x, 0, w, 256);
    g.fillStyle = "#352c25"; g.fillRect(x, 0, 6, 256);
  }
  g.fillStyle = "#352c25"; g.fillRect(0, 0, 1024, 6); g.fillRect(0, 250, 1024, 6);
}, 77);
const asphalt = () => canvas(512, 512, (g, r) => {
  g.fillStyle = "#4e4a46"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { const v = 50 + r() * 70; g.fillStyle = `rgba(${v},${v - 3},${v - 6},0.5)`; g.fillRect(r() * 512, r() * 512, 1.5, 1.5); }
  g.strokeStyle = "rgba(20,18,16,0.5)"; g.lineWidth = 1.5; for (let i = 0; i < 12; i++) { g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
}, 78);

// ---------------- UV helpers ----------------
/** World-scale box projection for any (non-indexed preferred) geometry with normals. */
export const boxUV = (geo: THREE.BufferGeometry, tile = TILE, off: THREE.Vector3 = new THREE.Vector3()) => {
  const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + off.x, y = p.getY(i) + off.y, z = p.getZ(i) + off.z, ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v; if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); return g;
};

/** Main body: one closed elevation outline (no holes) extruded through the width, with arc-length side-wall UVs. */
const bodyGeometry = () => {
  const L = BRIDGE_LEN, x0 = -L / 2, x1 = L / 2;
  // piers beside the dry channel stand on the sloping banks: their footings go down to the channel floor
  const pierBottom = (k: number) => (k === 1 || k === 2 ? -BR2.chanDepth : 0);
  const pts: THREE.Vector2[] = [new THREE.Vector2(x0, 0)];
  const push = (x: number, y: number) => { const l = pts[pts.length - 1]; if (Math.abs(l.x - x) > 1e-4 || Math.abs(l.y - y) > 1e-4) pts.push(new THREE.Vector2(x, y)); };
  ARCH_C.forEach((c, i) => {
    const a = SPANS[i] / 2, b = RISE[i], yb = baseY(i);
    push(c - a, i === 0 ? 0 : pierBottom(i - 1));
    push(c - a, yb);
    for (let k = 1; k < 48; k++) { const t = Math.PI - (k / 48) * Math.PI; push(c + a * Math.cos(t), yb + b * Math.sin(t)); }
    push(c + a, yb);
    push(c + a, i === ARCH_C.length - 1 ? 0 : pierBottom(i));
  });
  push(x1, 0); push(x1, BR2.deck); push(x0, BR2.deck);
  const arc = new Map<string, number>(); let s = 0;
  const key = (x: number, y: number) => `${x.toFixed(3)},${y.toFixed(3)}`;
  pts.forEach((p, i) => { if (i) s += p.distanceTo(pts[i - 1]); if (!arc.has(key(p.x, p.y))) arc.set(key(p.x, p.y), s); });
  const shape = new THREE.Shape(pts);
  const V = (v: number[], i: number) => [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]];
  const uvGen = {
    generateTopUV: (_g: THREE.ExtrudeGeometry, v: number[], a: number, b: number, c: number) => [a, b, c].map((i) => { const [x, y] = V(v, i); return new THREE.Vector2(x / TILE, y / TILE); }),
    generateSideWallUV: (_g: THREE.ExtrudeGeometry, v: number[], a: number, b: number, c: number, d: number) => [a, b, c, d].map((i) => { const [x, y, z] = V(v, i); return new THREE.Vector2(z / TILE, (arc.get(key(x, y)) ?? x + y) / TILE); }),
  };
  const g = new THREE.ExtrudeGeometry(shape, { depth: BR2.width, bevelEnabled: false, curveSegments: 1, UVGenerator: uvGen as unknown as THREE.UVGenerator });
  g.translate(0, 0, -BR2.width / 2);
  return g;
};

/** Thin voussoir band on one facade: inner = intrados ellipse, outer = +w; UV u = arc length (blocks), v = radial. */
const ringGeometry = (i: number, w: number, thick: number) => {
  const c = ARCH_C[i], a = SPANS[i] / 2, b = RISE[i], yb = baseY(i), n = 64;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const inner = (t: number) => [c + a * Math.cos(t), yb + b * Math.sin(t)], outer = (t: number) => [c + (a + w) * Math.cos(t), yb + (b + w) * Math.sin(t)];
  let s = 0, prev = inner(Math.PI);
  const blocks = Math.round((Math.PI * (a + b)) / 2 / 0.62); // ~0.62 m voussoirs
  for (let k = 0; k <= n; k++) {
    const t = Math.PI - (k / n) * Math.PI, pi = inner(t), po = outer(t);
    if (k) s += Math.hypot(pi[0] - prev[0], pi[1] - prev[1]); prev = pi;
    const u = (k / n) * blocks / 7;
    for (const z of [0, thick]) { pos.push(pi[0], pi[1], z, po[0], po[1], z); uv.push(u, 0, u, 1, u, 0, u, 1); }
  }
  for (let k = 0; k < n; k++) {
    const A = k * 4, B = (k + 1) * 4; // per step: [in z0, out z0, in z1, out z1]
    idx.push(A + 2, A + 3, B + 3, A + 2, B + 3, B + 2); // front face (z = thick)
    idx.push(A + 1, A + 3, B + 3, A + 1, B + 3, B + 1); // outer edge
    idx.push(A, B, B + 2, A, B + 2, A + 2); // inner edge (soffit lip)
  }
  const gi = new THREE.BufferGeometry(); gi.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); gi.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); gi.setIndex(idx);
  const g = gi.toNonIndexed(); g.computeVertexNormals(); // flat per-face normals (front face, outer edge, lip)
  void s; return g;
};

/** optional (all default off -> identical to the approved renders): `clipY` shows only stone below that height
 *  (rebuild progress), `tint` multiplies the stone colour (soot), `concrete` renders the plain concrete core. */
export const Bridge2: React.FC<{ glow?: number; clipY?: number; tint?: string; concrete?: boolean }> = ({ glow = 1, clipY, tint, concrete }) => {
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 100), []);
  const R = useMemo(() => {
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, ...o });
    const gA = toTex(granite(41, 50)), gB = toTex(granite(42, 44)), vs = toTex(voussoir()), as = toTex(asphalt()); as.repeat.set(1 / 4, 1 / 4);
    const mats = {
      wall: std({ map: gA, bumpMap: gA, bumpScale: 2.5 }),
      dark: std({ map: gB, bumpMap: gB, bumpScale: 2.5, color: "#e6ddd2" }),
      vous: std({ map: vs, bumpMap: vs, bumpScale: 3, side: THREE.DoubleSide }),
      road: std({ map: as, roughness: 0.95 }),
      iron: std({ color: "#25262b", metalness: 0.55, roughness: 0.45 }),
      lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2 * glow, 1.7 * glow, 1.0 * glow), toneMapped: false }),
    };
    if (concrete) { const cc = std({ color: "#a9a59d", roughness: 0.95 }); mats.wall = cc; mats.dark = cc; mats.vous = std({ color: "#9d9991", roughness: 0.95, side: THREE.DoubleSide }); }
    if (tint) for (const m of [mats.wall, mats.dark, mats.vous]) m.color.multiply(new THREE.Color(tint));
    if (clipY !== undefined) for (const m of Object.values(mats)) m.clippingPlanes = [plane];
    const body = bodyGeometry();
    const rings = ARCH_C.flatMap((_, i) => [-1, 1].map((sz) => ({ g: ringGeometry(i, 0.82, 0.14), sz })));
    // pier pilasters, rusticated bases, cutwaters + caps (box-projected UVs, all overlap only inside solid stone)
    const tri = new THREE.Shape(); tri.moveTo(-PIER / 2 - 0.1, 0); tri.lineTo(PIER / 2 + 0.1, 0); tri.lineTo(0, 1.9); tri.closePath();
    const cw = new THREE.ExtrudeGeometry(tri, { depth: 5.0, bevelEnabled: false }); cw.rotateX(-Math.PI / 2);
    const capS = new THREE.Shape(); capS.moveTo(-PIER / 2 - 0.25, 0); capS.lineTo(PIER / 2 + 0.25, 0); capS.lineTo(0, 2.15); capS.closePath();
    const cap = new THREE.ExtrudeGeometry(capS, { depth: 0.4, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 }); cap.rotateX(-Math.PI / 2);
    const pieces: { g: THREE.BufferGeometry; m: THREE.Material; p: [number, number, number]; r?: [number, number, number]; ink?: number }[] = [];
    PIER_X.forEach((x, i) => {
      const yb = i === 1 || i === 2 ? -BR2.chanDepth : 0;
      for (const sz of [-1, 1]) {
        const zf = sz * BR2.width / 2;
        pieces.push({ g: boxUV(cw.clone(), TILE, new THREE.Vector3(x, yb, zf)), m: mats.dark, p: [x, yb, zf], r: [0, sz > 0 ? 0 : Math.PI, 0], ink: 1 });
        pieces.push({ g: boxUV(cap.clone(), TILE), m: mats.dark, p: [x, yb + 5.0, zf], r: [0, sz > 0 ? 0 : Math.PI, 0], ink: 1 });
        const pilH = BR2.deck - 0.75 - (yb + 5.4);
        pieces.push({ g: boxUV(new THREE.BoxGeometry(PIER * 0.78, pilH, 0.5), TILE, new THREE.Vector3(x, yb + 5.4 + pilH / 2, zf)), m: mats.wall, p: [x, yb + 5.4 + pilH / 2, zf + sz * 0.2], ink: 1 });
      }
      // rusticated base course around the pier
      pieces.push({ g: boxUV(new THREE.BoxGeometry(PIER + 0.3, 0.7, BR2.width + 0.3), TILE * 0.5, new THREE.Vector3(x, yb + 0.35, 0)), m: mats.dark, p: [x, yb + 0.35, 0], ink: 1 });
    });
    // abutment ends + wing walls
    for (const sx of [-1, 1]) {
      const x = sx * (BRIDGE_LEN / 2 + 1.6);
      pieces.push({ g: boxUV(new THREE.BoxGeometry(3.2, BR2.deck + 0.2, BR2.width + 1.2), TILE, new THREE.Vector3(x, BR2.deck / 2, 0)), m: mats.wall, p: [x, BR2.deck / 2 - 0.1, 0], ink: 1 });
    }
    // string course + cornice
    for (const sz of [-1, 1]) {
      pieces.push({ g: boxUV(new THREE.BoxGeometry(BRIDGE_LEN, 0.28, 0.3), TILE, new THREE.Vector3(0, BR2.deck - 1.1, sz * BR2.width / 2)), m: mats.dark, p: [0, BR2.deck - 1.1, sz * (BR2.width / 2 + 0.1)], ink: 1 });
    }
    pieces.push({ g: boxUV(new THREE.BoxGeometry(BRIDGE_LEN + 0.6, 0.42, BR2.width + 0.9), TILE), m: mats.dark, p: [0, BR2.deck - 0.25, 0], ink: 1.1 });
    // pedestals over piers / crowns, coping rail, base rail (both sides)
    const pedX = PIER_X.concat(ARCH_C, [-BRIDGE_LEN / 2 + 0.6, BRIDGE_LEN / 2 - 0.6]);
    for (const sz of [-1, 1]) {
      const z = sz * (BR2.width / 2 - 0.25);
      pieces.push({ g: boxUV(new THREE.BoxGeometry(BRIDGE_LEN, 0.22, 0.56), TILE), m: mats.wall, p: [0, BR2.deck + 0.11, z], ink: 1 });
      pieces.push({ g: boxUV(new THREE.BoxGeometry(BRIDGE_LEN, 0.16, 0.6), TILE), m: mats.dark, p: [0, BR2.deck + 1.02, z], ink: 1 });
      pedX.forEach((x) => {
        pieces.push({ g: boxUV(new THREE.BoxGeometry(0.72, 1.1, 0.72), TILE), m: mats.dark, p: [x, BR2.deck + 0.6, z], ink: 1 });
        pieces.push({ g: boxUV(new THREE.BoxGeometry(0.86, 0.14, 0.86), TILE), m: mats.wall, p: [x, BR2.deck + 1.2, z], ink: 1 });
      });
    }
    // kerbs
    for (const sz of [-1, 1]) pieces.push({ g: boxUV(new THREE.BoxGeometry(BRIDGE_LEN, 0.18, 1.1), TILE), m: mats.dark, p: [0, BR2.deck + 0.09, sz * (BR2.width / 2 - 1.05)] });
    return { mats, body, rings, pieces, pedX };
  }, [glow, concrete, tint, clipY === undefined]);
  plane.constant = clipY ?? 100;
  // instanced dentils under the cornice + balusters
  const inst = useMemo(() => {
    const out: THREE.InstancedMesh[] = [];
    const dent = new THREE.InstancedMesh(boxUV(new THREE.BoxGeometry(0.18, 0.2, 0.22), 1), R.mats.dark, Math.floor(BRIDGE_LEN / 0.42) * 2);
    const o = new THREE.Object3D(); let k = 0;
    for (const sz of [-1, 1]) for (let x = -BRIDGE_LEN / 2 + 0.3; x < BRIDGE_LEN / 2 - 0.3 && k < dent.count; x += 0.42) { o.position.set(x, BR2.deck - 0.55, sz * (BR2.width / 2 + 0.3)); o.updateMatrix(); dent.setMatrixAt(k++, o.matrix); }
    dent.count = k; dent.castShadow = true; out.push(dent);
    const prof = [[0, 0], [0.1, 0], [0.1, 0.05], [0.055, 0.1], [0.06, 0.14], [0.11, 0.34], [0.05, 0.56], [0.075, 0.62], [0.075, 0.68], [0, 0.68]].map(([x, y]) => new THREE.Vector2(x, y));
    const bal = new THREE.InstancedMesh(new THREE.LatheGeometry(prof, 12), R.mats.wall, 400);
    k = 0;
    for (const sz of [-1, 1]) {
      const z = sz * (BR2.width / 2 - 0.25);
      for (let x = -BRIDGE_LEN / 2 + 0.6; x < BRIDGE_LEN / 2 - 0.6 && k < 400; x += 0.34) {
        if (R.pedX.some((px) => Math.abs(px - x) < 0.5)) continue;
        o.position.set(x, BR2.deck + 0.22, z); o.updateMatrix(); bal.setMatrixAt(k++, o.matrix);
      }
    }
    bal.count = k; bal.castShadow = true; out.push(bal);
    return out;
  }, [R]);
  return (
    <group>
      <mesh geometry={R.body} material={R.mats.wall} castShadow receiveShadow><Ink k={1.1} /></mesh>
      {R.rings.map(({ g, sz }, i) => (
        <mesh key={i} geometry={g} material={R.mats.vous} position={[0, 0, sz > 0 ? BR2.width / 2 + 0.004 : -BR2.width / 2 - 0.004]} scale={[1, 1, sz]} castShadow receiveShadow />
      ))}
      {/* keystones */}
      {ARCH_C.map((c, i) => [-1, 1].map((sz) => <mesh key={`${i}${sz}`} position={[c, baseY(i) + RISE[i] + 0.45, sz * (BR2.width / 2 + 0.2)]} material={R.mats.dark} castShadow><boxGeometry args={[0.55, 1.05, 0.3]} /><Ink /></mesh>))}
      {R.pieces.map((q, i) => <mesh key={i} geometry={q.g} material={q.m} position={q.p} rotation={q.r} castShadow receiveShadow>{q.ink ? <Ink k={q.ink} /> : null}</mesh>)}
      {inst.map((m, i) => <primitive key={i} object={m} />)}
      {/* lamp standards on the pier pedestals */}
      {PIER_X.map((x) => [-1, 1].map((sz) => (
        <group key={`${x}${sz}`} position={[x, BR2.deck + 1.27, sz * (BR2.width / 2 - 0.25)]}>
          <mesh position={[0, 0.25, 0]} material={R.mats.iron} castShadow><cylinderGeometry args={[0.16, 0.22, 0.5, 12]} /><Ink k={0.8} /></mesh>
          <mesh position={[0, 1.6, 0]} material={R.mats.iron} castShadow><cylinderGeometry args={[0.06, 0.09, 2.3, 16]} /><Ink k={0.7} /></mesh>
          {[0, 1, 2, 3].map((k) => <mesh key={k} position={[0, 0.9 + k * 0.6, 0]} material={R.mats.iron}><torusGeometry args={[0.085, 0.018, 6, 14]} /></mesh>)}
          <mesh position={[0, 2.85, 0]} material={R.mats.iron}><cylinderGeometry args={[0.2, 0.12, 0.12, 8]} /></mesh>
          <mesh position={[0, 3.12, 0]} material={R.mats.lamp}><cylinderGeometry args={[0.2, 0.16, 0.44, 6]} /></mesh>
          {[0, 1, 2, 3, 4, 5].map((k) => { const a = (k / 6) * Math.PI * 2; return <mesh key={k} position={[Math.cos(a) * 0.19, 3.12, Math.sin(a) * 0.19]} material={R.mats.iron}><boxGeometry args={[0.025, 0.46, 0.025]} /></mesh>; })}
          <mesh position={[0, 3.45, 0]} material={R.mats.iron} castShadow><coneGeometry args={[0.27, 0.26, 6]} /><Ink k={0.7} /></mesh>
          <mesh position={[0, 3.66, 0]} material={R.mats.iron}><sphereGeometry args={[0.05, 8, 6]} /></mesh>
        </group>
      )))}
      <mesh position={[0, BR2.deck + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={R.mats.road} receiveShadow><planeGeometry args={[BRIDGE_LEN, BR2.width - 2.6]} /></mesh>
      {/* stone underside of the arches is the body soffit itself — nothing coplanar with it */}
    </group>
  );
};
