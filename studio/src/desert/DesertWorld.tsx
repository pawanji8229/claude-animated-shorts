// Arizona desert set for "London Bridge in the Desert": golden hour, dunes, a dry cracked river channel under a
// procedural five-arch granite bridge (Rennie-style elliptical arches, voussoir rings, cutwaters, cornice,
// balustrade, lamp posts), layered mesas, saguaros, prickly pears, rocks, grass, a dead tree with a vulture,
// a 1960s convertible, fence posts, tumbleweeds and drifting dust. All procedural.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Ink } from "../inventor/Workshop";
import { cactusTex, cloudTex, graniteTex, mudTex, sandTex, skyTex, softGlow, strataTex } from "./desertTextures";
import { rng } from "../lib/math";
import { Bridge2 } from "./Bridge";
import { Car60 } from "./Car60";
import { DesertDetail } from "./DesertDetail";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MeshReflectorMaterial } from "@react-three/drei";
import { PIER_X, ARCH_C, BRIDGE_LEN as BRIDGE_LEN2, BR2 } from "./Bridge";

/** Water filling the dug channel (opening day): reflective, slightly green-blue; edge meets the banks at y=-0.62. */
const ChannelWater: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]} receiveShadow>
    <planeGeometry args={[14.6, 320]} />
    <MeshReflectorMaterial color="#3f93a8" roughness={0.92} metalness={0.05} mirror={0.45} blur={[300, 90]} resolution={512} mixBlur={0.9} mixStrength={1.6} mixContrast={1.05} depthScale={0.3} minDepthThreshold={0.4} maxDepthThreshold={1.2} />
  </mesh>
);
/** Pennant bunting sagging between the parapet pedestals + small flags on the lamp standards (periodic sway). */
const Bunting: React.FC<{ t: number }> = ({ t }) => {
  const posts = useMemo(() => PIER_X.concat(ARCH_C, [-BRIDGE_LEN2 / 2 + 0.6, BRIDGE_LEN2 / 2 - 0.6]).sort((a, b) => a - b), []);
  const cols = useMemo(() => ["#d8402f", "#f2c230", "#2f7fc1", "#f4efe2", "#3aa56a"].map((c) => new THREE.Color(c)), []);
  const mesh = useMemo(() => {
    const tri = new THREE.BufferGeometry(); tri.setAttribute("position", new THREE.Float32BufferAttribute([-0.13, 0, 0, 0.13, 0, 0, 0, -0.32, 0], 3)); tri.computeVertexNormals();
    const m = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), 600); m.castShadow = true; return m;
  }, []);
  const o = new THREE.Object3D(); let k = 0;
  for (const sz of [-1, 1]) for (let i = 0; i < posts.length - 1; i++) {
    const x0 = posts[i], x1 = posts[i + 1], n = Math.max(4, Math.round((x1 - x0) / 0.42));
    for (let j = 1; j < n && k < 600; j++) {
      const u = j / n, x = x0 + (x1 - x0) * u, sag = 0.7 * 4 * u * (1 - u);
      o.position.set(x, BR2.deck + 1.25 - sag, sz * (BR2.width / 2 - 0.25));
      o.rotation.set(0.25 * Math.sin(2 * Math.PI * (2 * t) + x * 0.7), sz > 0 ? 0 : Math.PI, 0); o.updateMatrix();
      mesh.setMatrixAt(k, o.matrix); mesh.setColorAt(k, cols[(i * 7 + j) % cols.length]); k++;
    }
  }
  mesh.count = k; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return (
    <group>
      <primitive object={mesh} />
      {PIER_X.map((x) => [-1, 1].map((sz) => (
        <group key={`${x}${sz}`} position={[x, BR2.deck + 1.27 + 3.9, sz * (BR2.width / 2 - 0.25)]} rotation={[0, 0.3 * Math.sin(2 * Math.PI * 3 * t + x), 0]}>
          <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.015, 0.015, 0.7, 6]} /><meshStandardMaterial color="#d9d4c8" metalness={0.5} roughness={0.4} /></mesh>
          <mesh position={[0.32, 0.55, 0]} rotation={[0, 0.2 * Math.sin(2 * Math.PI * 4 * t + x), 0]}><planeGeometry args={[0.6, 0.34]} /><meshStandardMaterial color={x > 0 ? "#d8402f" : "#2f7fc1"} side={THREE.DoubleSide} roughness={0.8} /></mesh>
        </group>
      )))}
    </group>
  );
};

/** The sun disc/glow live on their own layer: the main camera enables it, the water reflection camera does not
 *  (prevents a blown-out sun glint in the channel water). */
export const SUN_LAYER = 1;
export const BR = { deck: 8.4, width: 9, chanHalf: 5, chanBank: 9.5, chanDepth: 1.6 };
// spans (m) left -> right, central span crosses the dry channel
const SPANS = [7, 8.5, 10, 8.5, 7], PIER = 2.4, ABUT = 4.5, RISE = [4.6, 5.4, 6.3, 5.4, 4.6];
export const BRIDGE_LEN = SPANS.reduce((a, b) => a + b, 0) + PIER * (SPANS.length - 1) + ABUT * 2;
export const archCenters = (() => { let x = -BRIDGE_LEN / 2 + ABUT; return SPANS.map((s) => { const c = x + s / 2; x += s + PIER; return c; }); })();

/** Ground height: flat work area, dry channel along z, rolling dunes further out. */
export const groundY = (x: number, z: number) => {
  const ax = Math.abs(x);
  const chan = ax < BR.chanHalf ? -BR.chanDepth : ax < BR.chanBank ? -BR.chanDepth * (1 - (ax - BR.chanHalf) / (BR.chanBank - BR.chanHalf)) ** 1.6 * 1 : 0;
  const d = Math.hypot(x, z * 0.7);
  const dune = (Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.038) * 2.6 + Math.sin(x * 0.11 + z * 0.07) * 0.9 + Math.sin(z * 0.17 - x * 0.05) * 0.4);
  const k = Math.min(1, Math.max(0, (d - 18) / 40));
  return chan + Math.max(0, dune + 1.2) * k * (ax > BR.chanBank ? 1 : 0);
};

const useMats = () => useMemo(() => {
  const sand = sandTex(); sand.repeat.set(36, 36);
  const mud = mudTex(); mud.repeat.set(5, 140);
  const gran = graniteTex(); gran.repeat.set(0.09, 0.14);
  const granR = graniteTex(); granR.repeat.set(0.25, 0.25);
  const strata = strataTex(); strata.repeat.set(0.03, 0.025);
  const cac = cactusTex(); cac.repeat.set(1, 2);
  const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
  return {
    sand: std({ map: sand, bumpMap: sand, bumpScale: 2.2, color: "#ffe9d0" }),
    mud: std({ map: mud, bumpMap: mud, bumpScale: 3, color: "#f2dcc4" }),
    granite: std({ map: gran, bumpMap: gran, bumpScale: 2.0, color: "#f4ece0" }),
    graniteDark: std({ map: granR, bumpMap: granR, bumpScale: 2.0, color: "#cfc4b6" }),
    strata: std({ map: strata, color: "#ffffff" }),
    cactus: std({ map: cac, bumpMap: cac, bumpScale: 2, color: "#ffffff", roughness: 0.7 }),
    pear: std({ color: "#5d8a45", roughness: 0.7 }), bloom: std({ color: "#f05a7e", emissive: "#a01a3a", emissiveIntensity: 0.25 }),
    rock: std({ color: "#b0703f", roughness: 0.95 }), rockDark: std({ color: "#7d4a2a", roughness: 0.95 }),
    grass: std({ color: "#c9a85a", roughness: 1, side: THREE.DoubleSide }), wood: std({ color: "#6b4a30" }), woodGrey: std({ color: "#8d7a66" }),
    iron: std({ color: "#2c2d33", metalness: 0.5, roughness: 0.5 }), lampGlass: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.8, 1.0), toneMapped: false }),
    carRed: std({ color: "#c2352b", roughness: 0.25, metalness: 0.35 }), carCream: std({ color: "#f1e6cf", roughness: 0.3, metalness: 0.2 }),
    chrome: std({ color: "#e8eef4", metalness: 1, roughness: 0.12 }), tyre: std({ color: "#1b1b1f", roughness: 0.8 }), glass: new THREE.MeshStandardMaterial({ color: "#bfe3ff", transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 }),
    leather: std({ color: "#7a2a22", roughness: 0.5 }), bone: std({ color: "#efe6d2", roughness: 0.8 }), vulture: std({ color: "#2a2228", roughness: 0.8 }), vultureHead: std({ color: "#c9584a" }),
    sky: new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, toneMapped: false, fog: false, depthWrite: false }),
  };
}, []);
type M = ReturnType<typeof useMats>;

// ---------------- bridge ----------------
const Bridge: React.FC<{ m: M }> = ({ m }) => {
  const { body, rings, cutwaters } = useMemo(() => {
    const L = BRIDGE_LEN, x0 = -L / 2, x1 = L / 2;
    const s = new THREE.Shape();
    s.moveTo(x0, 0);
    archCenters.forEach((c, i) => {
      const a = SPANS[i] / 2, b = RISE[i], yb = i === 2 ? -BR.chanDepth : 0;
      if (i === 2) s.lineTo(c - a, 0);
      s.lineTo(c - a, yb);
      for (let k = 0; k <= 32; k++) { const t = Math.PI - (k / 32) * Math.PI; s.lineTo(c + a * Math.cos(t), yb + (b - yb * 0) * Math.sin(t) + (i === 2 ? 0 : 0)); }
      if (i === 2) s.lineTo(c + a, 0);
    });
    s.lineTo(x1, 0); s.lineTo(x1, BR.deck); s.lineTo(x0, BR.deck); s.closePath();
    const body = new THREE.ExtrudeGeometry(s, { depth: BR.width, bevelEnabled: false });
    body.translate(0, 0, -BR.width / 2);
    const rings = archCenters.map((c, i) => {
      const a = SPANS[i] / 2, b = RISE[i], yb = i === 2 ? -BR.chanDepth : 0, w = 0.75;
      const r = new THREE.Shape();
      r.moveTo(c - a - w, yb);
      for (let k = 0; k <= 32; k++) { const t = Math.PI - (k / 32) * Math.PI; r.lineTo(c + (a + w) * Math.cos(t), yb + (b + w) * Math.sin(t)); }
      r.lineTo(c + a, yb);
      for (let k = 0; k <= 32; k++) { const t = (k / 32) * Math.PI; r.lineTo(c + a * Math.cos(t), yb + b * Math.sin(t)); }
      r.closePath();
      const g = new THREE.ExtrudeGeometry(r, { depth: BR.width + 0.24, bevelEnabled: false }); g.translate(0, 0, -BR.width / 2 - 0.12);
      return g;
    });
    const tri = new THREE.Shape(); tri.moveTo(-PIER / 2, 0); tri.lineTo(PIER / 2, 0); tri.lineTo(0, 1.7); tri.closePath();
    const cw = new THREE.ExtrudeGeometry(tri, { depth: 5.2, bevelEnabled: false }); cw.rotateX(-Math.PI / 2);
    return { body, rings, cutwaters: cw };
  }, []);
  const piers = archCenters.slice(0, -1).map((c, i) => c + SPANS[i] / 2 + PIER / 2);
  const baluster = useMemo(() => {
    const pts = [[0.0, 0], [0.09, 0], [0.09, 0.06], [0.05, 0.12], [0.1, 0.32], [0.05, 0.55], [0.07, 0.62], [0.07, 0.66], [0, 0.66]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 10);
  }, []);
  const balInst = useMemo(() => {
    const L = BRIDGE_LEN - 1, n = Math.floor(L / 0.36), mesh = new THREE.InstancedMesh(baluster, m.granite, n * 2);
    const o = new THREE.Object3D(); let k = 0;
    for (const z of [-BR.width / 2 + 0.25, BR.width / 2 - 0.25]) for (let i = 0; i < n; i++) { o.position.set(-L / 2 + i * 0.36, BR.deck + 0.2, z); o.updateMatrix(); mesh.setMatrixAt(k++, o.matrix); }
    mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
  }, [baluster, m.granite]);
  return (
    <group>
      <mesh geometry={body} material={m.granite} castShadow receiveShadow><Ink k={1.1} /></mesh>
      {rings.map((g, i) => <mesh key={i} geometry={g} material={m.graniteDark} castShadow receiveShadow><Ink k={0.9} /></mesh>)}
      {piers.map((x, i) => (
        <group key={i}>
          {[-1, 1].map((sz) => (
            <group key={sz}>
              <mesh geometry={cutwaters} material={m.graniteDark} position={[x, i === 1 || i === 2 ? -BR.chanDepth : 0, sz * BR.width / 2]} rotation={[0, sz > 0 ? 0 : Math.PI, 0]} castShadow receiveShadow><Ink /></mesh>
              <mesh position={[x, (BR.deck - 0.6 + 5.2) / 2, sz * (BR.width / 2 + 0.18)]} material={m.granite} castShadow receiveShadow><boxGeometry args={[PIER * 0.7, BR.deck - 0.6 - 5.2, 0.36]} /><Ink /></mesh>
            </group>
          ))}
        </group>
      ))}
      {/* cornice + parapet rails */}
      <mesh position={[0, BR.deck - 0.35, 0]} material={m.graniteDark} castShadow receiveShadow><boxGeometry args={[BRIDGE_LEN + 0.4, 0.5, BR.width + 0.5]} /><Ink /></mesh>
      {[-1, 1].map((sz) => (
        <group key={sz}>
          <mesh position={[0, BR.deck + 0.1, sz * (BR.width / 2 - 0.25)]} material={m.granite} castShadow receiveShadow><boxGeometry args={[BRIDGE_LEN, 0.2, 0.5]} /><Ink /></mesh>
          <mesh position={[0, BR.deck + 0.95, sz * (BR.width / 2 - 0.25)]} material={m.granite} castShadow receiveShadow><boxGeometry args={[BRIDGE_LEN, 0.18, 0.46]} /><Ink /></mesh>
          {archCenters.concat(piers).map((x, i) => (
            <group key={i} position={[x, BR.deck, sz * (BR.width / 2 - 0.25)]}>
              <mesh position={[0, 0.6, 0]} material={m.graniteDark} castShadow><boxGeometry args={[0.6, 1.2, 0.6]} /><Ink /></mesh>
              {i >= archCenters.length && (<>
                <mesh position={[0, 2.2, 0]} material={m.iron} castShadow><cylinderGeometry args={[0.06, 0.09, 2.2, 10]} /></mesh>
                <mesh position={[0, 3.45, 0]} material={m.iron}><coneGeometry args={[0.24, 0.3, 6]} /></mesh>
                <mesh position={[0, 3.2, 0]} material={m.lampGlass}><boxGeometry args={[0.26, 0.32, 0.26]} /></mesh>
              </>)}
            </group>
          ))}
        </group>
      ))}
      <primitive object={balInst} />
      {/* road deck */}
      <mesh position={[0, BR.deck + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[BRIDGE_LEN, BR.width - 1]} /><meshStandardMaterial color="#6b625a" roughness={0.9} /></mesh>
    </group>
  );
};

// ---------------- ground, channel, sky, mesas ----------------
const Ground: React.FC<{ m: M }> = ({ m }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(320, 320, 420, 420); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)));
    g.computeVertexNormals(); return g;
  }, []);
  return (
    <group>
      <mesh geometry={geo} material={m.sand} receiveShadow />
      <mesh position={[0, -BR.chanDepth + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.mud} receiveShadow><planeGeometry args={[BR.chanHalf * 2, 320]} /></mesh>
    </group>
  );
};

const Mesas: React.FC<{ m: M }> = ({ m }) => {
  const geos = useMemo(() => {
    const r = rng(8);
    return Array.from({ length: 9 }, (_, i) => {
      const w = 30 + r() * 60, h = 18 + r() * 40, s = new THREE.Shape();
      s.moveTo(-w / 2 - 14, 0); s.lineTo(-w / 2 - 3, h * 0.35); s.lineTo(-w / 2, h * 0.9); s.lineTo(-w / 2 + 4, h);
      for (let k = 1; k < 6; k++) s.lineTo(-w / 2 + (k / 6) * w, h + (r() - 0.5) * 2);
      s.lineTo(w / 2 - 4, h); s.lineTo(w / 2, h * 0.88); s.lineTo(w / 2 + 3, h * 0.35); s.lineTo(w / 2 + 16, 0); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 14 + r() * 20, bevelEnabled: false });
      const x = (i - 4) * 70 + (r() - 0.5) * 40, z = -150 - r() * 60;
      return { g, pos: [x, -0.5, z] as [number, number, number], rot: (r() - 0.5) * 0.4 };
    });
  }, []);
  return <group>{geos.map((o, i) => <mesh key={i} geometry={o.g} material={m.strata} position={o.pos} rotation={[0, o.rot, 0]} />)}</group>;
};

const Sky: React.FC<{ m: M; sunDir: THREE.Vector3 }> = ({ m, sunDir }) => {
  const sun = useMemo(() => softGlow("rgba(255,240,210,1)", "rgba(255,170,90,0)"), []);
  const clouds = useMemo(() => [cloudTex(1), cloudTex(2), cloudTex(3)], []);
  const sp = sunDir.clone().multiplyScalar(380);
  const r = rng(12);
  return (
    <group>
      <mesh material={m.sky}><sphereGeometry args={[420, 32, 16]} /></mesh>
      <sprite position={sp} scale={[70, 70, 1]} layers={SUN_LAYER}><spriteMaterial map={sun} transparent opacity={0.45} fog={false} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
      <mesh position={sp.clone().multiplyScalar(0.98)} layers={SUN_LAYER}><sphereGeometry args={[9, 20, 14]} /><meshBasicMaterial color={[1.9, 1.6, 1.2]} toneMapped={false} fog={false} /></mesh>
      {Array.from({ length: 10 }, (_, i) => {
        const a = -1.2 + i * 0.26 + r() * 0.1, d = 330, y = 60 + r() * 70;
        return <sprite key={i} position={[Math.sin(a) * d, y, -Math.cos(a) * d]} scale={[110 + r() * 80, 45 + r() * 25, 1]}><spriteMaterial map={clouds[i % 3]} transparent fog={false} depthWrite={false} opacity={0.9} /></sprite>;
      })}
    </group>
  );
};

// ---------------- props ----------------
const Saguaro: React.FC<{ m: M; p: [number, number, number]; h: number; arms: number; seed: number }> = ({ m, p, h, arms, seed }) => {
  const r = rng(seed);
  return (
    <group position={p}>
      <mesh position={[0, h / 2, 0]} material={m.cactus} castShadow><capsuleGeometry args={[0.32, h - 0.6, 6, 14]} /><Ink /></mesh>
      {Array.from({ length: arms }, (_, k) => {
        const side = k % 2 ? 1 : -1, y = h * (0.35 + r() * 0.3), up = 1 + r() * 1.4;
        return (
          <group key={k} position={[0, y, 0]} rotation={[0, r() * 6, 0]}>
            <mesh position={[side * 0.55, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.cactus} castShadow><capsuleGeometry args={[0.2, 0.7, 4, 10]} /><Ink k={0.8} /></mesh>
            <mesh position={[side * 0.95, up / 2, 0]} material={m.cactus} castShadow><capsuleGeometry args={[0.2, up, 4, 10]} /><Ink k={0.8} /></mesh>
          </group>
        );
      })}
    </group>
  );
};
const PricklyPear: React.FC<{ m: M; p: [number, number, number]; seed: number }> = ({ m, p, seed }) => {
  const r = rng(seed);
  const pads = Array.from({ length: 7 }, (_, k) => ({ x: (r() - 0.5) * 0.9, y: 0.25 + r() * 0.8, z: (r() - 0.5) * 0.5, rz: (r() - 0.5) * 1.2, ry: r() * 3, s: 0.6 + r() * 0.5, bloom: r() < 0.3 }));
  return (
    <group position={p}>
      {pads.map((q, k) => (
        <group key={k} position={[q.x, q.y, q.z]} rotation={[0, q.ry, q.rz]}>
          <mesh scale={[0.32 * q.s, 0.42 * q.s, 0.07]} material={m.pear} castShadow><sphereGeometry args={[1, 14, 10]} /><Ink k={0.7} /></mesh>
          {q.bloom && <mesh position={[0, 0.42 * q.s, 0]} material={m.bloom}><sphereGeometry args={[0.07, 8, 6]} /></mesh>}
        </group>
      ))}
    </group>
  );
};
const Car: React.FC<{ m: M; p: [number, number, number]; ry: number }> = ({ m, p, ry }) => (
  <group position={p} rotation={[0, ry, 0]}>
    <mesh position={[0, 0.62, 0]} material={m.carRed} castShadow receiveShadow><boxGeometry args={[4.6, 0.55, 1.8]} /><Ink /></mesh>
    <mesh position={[0, 0.98, 0]} material={m.carCream} castShadow><boxGeometry args={[4.4, 0.18, 1.75]} /></mesh>
    <mesh position={[-2.05, 0.95, 0]} rotation={[0, 0, 0.15]} material={m.carRed} castShadow><boxGeometry args={[0.6, 0.25, 1.7]} /></mesh>
    <mesh position={[0.35, 1.25, 0]} rotation={[0, 0, -0.5]} material={m.glass}><boxGeometry args={[0.04, 0.55, 1.6]} /></mesh>
    {[-1.4, 1.5].map((x) => <mesh key={x} position={[x, 0.86, 0]} material={m.leather}><boxGeometry args={[0.7, 0.25, 1.5]} /></mesh>)}
    {[-2.35, 2.35].map((x) => <mesh key={x} position={[x, 0.45, 0]} material={m.chrome}><boxGeometry args={[0.12, 0.16, 1.9]} /></mesh>)}
    {[[-1.5, -0.9], [-1.5, 0.9], [1.5, -0.9], [1.5, 0.9]].map(([x, z], i) => (
      <group key={i} position={[x, 0.36, z]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.tyre} castShadow><cylinderGeometry args={[0.36, 0.36, 0.24, 20]} /><Ink k={0.8} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, Math.sign(z) * 0.125]} material={m.carCream}><cylinderGeometry args={[0.22, 0.22, 0.01, 18]} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, Math.sign(z) * 0.13]} material={m.chrome}><cylinderGeometry args={[0.11, 0.11, 0.01, 14]} /></mesh>
      </group>
    ))}
    {[-0.55, 0.55].map((z) => <mesh key={z} position={[2.33, 0.68, z]} material={m.lampGlass}><sphereGeometry args={[0.1, 10, 8]} /></mesh>)}
  </group>
);

const Tumbleweed: React.FC<{ m: M; p: [number, number, number]; spin: number; seed: number; s?: number }> = ({ m, p, spin, seed, s = 1 }) => {
  const geo = useMemo(() => {
    const r = rng(seed), parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 60; k++) {
      const a = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(0.42 + r() * 0.08);
      const b = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(0.42 + r() * 0.08);
      parts.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, a.clone().add(b).multiplyScalar(0.5 * (0.5 + r() * 0.4)), b), 8, 0.011, 4, false));
    }
    return mergeGeometries(parts);
  }, [seed]);
  return <group position={p} scale={s}><mesh geometry={geo} rotation={[spin, spin * 0.3, 0]} castShadow><meshStandardMaterial color="#9a7444" roughness={1} /></mesh></group>;
};

const DeadTree: React.FC<{ m: M; p: [number, number, number]; f: number }> = ({ m, p, f }) => (
  <group position={p}>
    <mesh position={[0, 1.6, 0]} rotation={[0, 0, 0.08]} material={m.woodGrey} castShadow><cylinderGeometry args={[0.12, 0.22, 3.2, 8]} /><Ink /></mesh>
    <mesh position={[0.5, 2.9, 0]} rotation={[0, 0, -0.9]} material={m.woodGrey} castShadow><cylinderGeometry args={[0.05, 0.1, 1.5, 6]} /></mesh>
    <mesh position={[-0.45, 2.5, 0.1]} rotation={[0.2, 0, 1.0]} material={m.woodGrey} castShadow><cylinderGeometry args={[0.05, 0.09, 1.2, 6]} /></mesh>
    <group position={[0.95, 3.38, 0]} rotation={[0, -0.6, Math.sin(f * 0.07) * 0.03]}>
      <mesh scale={[0.35, 0.28, 0.25]} material={m.vulture}><sphereGeometry args={[1, 12, 8]} /><Ink k={0.8} /></mesh>
      <mesh position={[0.32, 0.2, 0]} material={m.vultureHead}><sphereGeometry args={[0.09, 10, 8]} /></mesh>
      <mesh position={[-0.35, -0.05, 0]} rotation={[0, 0, 0.5]} scale={[0.3, 0.06, 0.2]} material={m.vulture}><sphereGeometry args={[1, 8, 6]} /></mesh>
    </group>
  </group>
);

export type CarState = { pos: [number, number, number]; ry: number; spin: number; brake: number };
export type DesertProps = { f: number; shadowRes: number; tumble: { p: [number, number, number]; spin: number }[]; pebble?: [number, number, number] | null; car?: CarState; carPath?: [number, number][];
  /** opening-day variant: water in the dug channel, festive bunting, no construction leftovers; `loopT` 0..1 drives periodic motion */
  water?: boolean; festive?: boolean; leftovers?: boolean; loopT?: number;
  /** extra rectangles [x0, x1, z0, z1] kept free of scattered props (e.g. around a production's camera) */
  clearZones?: [number, number, number, number][] };

/** areas kept clear for the action, the bridge footprint and the channel floor */
export const avoidZone = (x: number, z: number) => (Math.abs(x) < 31 && Math.abs(z) < 6) || (Math.abs(x) < BR.chanBank && z > -60) || (x > -14 && x < -5 && z > 5.5 && z < 13) || (x < -8 && z > 7 && z < 14);
export const DesertWorld: React.FC<DesertProps> = ({ f, shadowRes, tumble, pebble, car, carPath = [], water = false, festive = false, leftovers = true, loopT = 0, clearZones = [] }) => {
  const zonesKey = JSON.stringify(clearZones);
  const avoid = useMemo(() => (x: number, z: number) => avoidZone(x, z) || clearZones.some(([a, b, c, d]) => x > a && x < b && z > c && z < d), [zonesKey]); // eslint-disable-line
  const m = useMats();
  const sunDir = useMemo(() => new THREE.Vector3(0.35, 0.16, -1).normalize(), []);
  const sunTarget = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, 0, 4); return o; }, []);
  const props = useMemo(() => {
    const r = rng(21), list: { kind: string; p: [number, number, number]; s: number; seed: number }[] = [];
    const ok = (x: number, z: number) => !(Math.abs(x) < 9 && z > -8 && z < 14) && Math.abs(x) > BR.chanBank + 1;
    for (let i = 0; i < 160; i++) {
      const x = (r() - 0.5) * 150, z = 30 - r() * 150;
      if (!ok(x, z) || clearZones.some(([a, b, c, d]) => x > a && x < b && z > c && z < d)) continue;
      const k = r(); const y = groundY(x, z);
      list.push({ kind: k < 0.16 ? "saguaro" : k < 0.3 ? "pear" : k < 0.62 ? "rock" : "grass", p: [x, y, z], s: 0.6 + r() * 0.9, seed: i });
    }
    return list;
  }, []);
  const grass = useMemo(() => {
    const blades = props.filter((q) => q.kind === "grass"), mesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.55, 3), m.grass, blades.length * 9);
    const o = new THREE.Object3D(), r = rng(5); let k = 0;
    for (const b of blades) for (let j = 0; j < 9; j++) { o.position.set(b.p[0] + (r() - 0.5) * 0.4, b.p[1] + 0.25 * b.s, b.p[2] + (r() - 0.5) * 0.4); o.rotation.set((r() - 0.5) * 0.7, r() * 3, (r() - 0.5) * 0.7); o.scale.setScalar(b.s); o.updateMatrix(); mesh.setMatrixAt(k++, o.matrix); }
    mesh.castShadow = true; return mesh;
  }, [props, m.grass]);
  // close-in hero dressing (hand placed around the action area)
  const hero: { kind: string; p: [number, number, number]; s: number; seed: number }[] = [
    { kind: "saguaro", p: [-15, 0, 4], s: 1, seed: 101 }, { kind: "saguaro", p: [16, 0, -6], s: 1.2, seed: 102 }, { kind: "saguaro", p: [-26, 0, -14], s: 1.3, seed: 103 },
    { kind: "pear", p: [-13.5, 0, 10.5], s: 1, seed: 104 }, { kind: "pear", p: [9.5, 0, 6], s: 1, seed: 105 }, { kind: "rock", p: [-12.5, 0, 5.2], s: 0.9, seed: 106 },
    { kind: "rock", p: [8.2, 0, 10.5], s: 1.2, seed: 107 }, { kind: "rock", p: [-3.2, -BR.chanDepth, 9], s: 0.6, seed: 108 }, { kind: "rock", p: [2.6, -BR.chanDepth, 6.5], s: 0.45, seed: 109 },
  ];
  const all = props.concat(hero);
  // dust motes in the low sun
  const dust = useMemo(() => { const r = rng(9); return Array.from({ length: 500 }, () => [(r() - 0.5) * 40, r() * 9, 18 - r() * 30, r()] as const); }, []);
  const dgeo = useMemo(() => new THREE.BufferGeometry(), []);
  const dp = new Float32Array(dust.length * 3);
  dust.forEach(([x, y, z, ph], i) => { dp[i * 3] = x + ((f * 0.02 + ph * 30) % 40) - 20 + 20; dp[i * 3 + 1] = y + Math.sin(f * 0.03 + ph * 9) * 0.3; dp[i * 3 + 2] = z; });
  dgeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  return (
    <group>
      <Sky m={m} sunDir={sunDir} />
      <Ground m={m} />
      <Mesas m={m} />
      <Bridge2 />
      <DesertDetail f={f} gy={groundY} avoid={avoid} carPath={carPath} leftovers={leftovers} />
      {water && <ChannelWater />}
      {festive && <Bunting t={loopT} />}
      {all.map((q, i) => q.kind === "saguaro" ? <Saguaro key={i} m={m} p={q.p} h={3 + q.s * 2.6} arms={1 + (q.seed % 3)} seed={q.seed} />
        : q.kind === "pear" ? <PricklyPear key={i} m={m} p={q.p} seed={q.seed} />
        : q.kind === "rock" ? <mesh key={i} position={[q.p[0], q.p[1] + 0.2 * q.s, q.p[2]]} scale={[q.s * 0.9, q.s * 0.55, q.s * 0.75]} rotation={[0, q.seed, 0]} material={q.seed % 2 ? m.rock : m.rockDark} castShadow receiveShadow><dodecahedronGeometry args={[0.6, 0]} /><Ink k={0.8} /></mesh>
        : null)}
      <primitive object={grass} />
      {car && <group position={car.pos} rotation={[0, car.ry, 0]}><Car60 wheelSpin={car.spin} brake={car.brake} /></group>}
      <DeadTree m={m} p={[12.5, 0, 3]} f={f} />
      {/* fence posts with sagging wire */}
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-19 + (i % 2) * 0.1, 0.55, 14 - i * 4]} rotation={[0, 0, (i % 3 - 1) * 0.08]} material={m.wood} castShadow><cylinderGeometry args={[0.07, 0.09, 1.1, 6]} /><Ink k={0.7} /></mesh>)}
      {/* cattle skull on the bank */}
      <group position={[6.2, 0.06, 8.2]} rotation={[0, -0.6, 0]}>
        <mesh scale={[0.25, 0.14, 0.32]} material={m.bone}><sphereGeometry args={[1, 10, 8]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.3, 0.08, -0.1]} rotation={[0, 0, s * 1.1]} material={m.bone}><coneGeometry args={[0.05, 0.4, 6]} /></mesh>)}
      </group>
      {tumble.map((t, i) => <Tumbleweed key={i} m={m} p={t.p} spin={t.spin} seed={40 + i} s={i ? 0.8 : 1} />)}
      {pebble && <mesh position={pebble} material={m.rockDark} castShadow><dodecahedronGeometry args={[0.06, 0]} /></mesh>}
      <points geometry={dgeo}><pointsMaterial color="#ffe0b0" size={0.035} transparent opacity={0.65} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></points>
      {/* golden-hour key (low sun behind the bridge -> long shadows toward camera) */}
      <primitive object={sunTarget} />
      <directionalLight position={sunDir.clone().multiplyScalar(80).toArray()} target={sunTarget} color="#ffc68e" intensity={3.1} castShadow
        shadow-mapSize={[shadowRes, shadowRes]} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={30} shadow-camera-bottom={-30} shadow-camera-near={1} shadow-camera-far={200} shadow-bias={-0.0005} shadow-normalBias={0.04} />
      <hemisphereLight args={["#86aee6", "#c27a46", 0.85]} />
    </group>
  );
};
