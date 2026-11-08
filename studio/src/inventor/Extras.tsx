// v2 set dressing + effects for the 10 s shot: control box & lever, ignition sparks, copper pipes, pinned
// blueprints, wall clock, braided rug, coat rack, cables, toolbox, foreground parallax (hanging chain, crate).
import React, { useMemo } from "react";
import * as THREE from "three";
import { Box, Cyl, Ink, useMaterials } from "./Workshop";
import { BENCH, DOOR, ROOM, WINDOW } from "./timeline";
import { DOME_POS, IGNITE, LEVER_POS } from "./timeline10";
import { rng } from "../lib/math";

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

const blueprint = (seed: number) => canvasTex(512, 384, (g) => {
  const r = rng(seed);
  g.fillStyle = "#24508a"; g.fillRect(0, 0, 512, 384);
  g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 1;
  for (let x = 0; x < 512; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 384); g.stroke(); }
  for (let y = 0; y < 384; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.strokeStyle = "rgba(235,245,255,0.9)"; g.lineWidth = 3;
  // an original machine sketch: gears, a dome, dimension lines
  const gear = (x: number, y: number, R: number, n: number) => {
    g.beginPath();
    for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? R : R * 0.82; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.stroke(); g.beginPath(); g.arc(x, y, R * 0.25, 0, Math.PI * 2); g.stroke();
  };
  gear(150 + r() * 30, 200, 70, 12); gear(260, 150 + r() * 20, 42, 9);
  g.beginPath(); g.arc(380, 220, 60, Math.PI, 0); g.lineTo(440, 300); g.lineTo(320, 300); g.closePath(); g.stroke();
  g.lineWidth = 1.5; g.beginPath(); g.moveTo(60, 340); g.lineTo(460, 340); g.stroke();
  g.font = "bold 22px DejaVu Sans, sans-serif"; g.fillStyle = "rgba(235,245,255,0.85)"; g.fillText("NIGHT-LIGHT ENGINE  No." + (3 + seed), 40, 40);
});

const rugTex = () => canvasTex(512, 512, (g) => {
  const cols = ["#6a3528", "#9c7a44", "#3e4f5c", "#7f4a2e", "#b39a70"];
  for (let i = 0; i < 18; i++) {
    g.beginPath(); g.arc(256, 256, 250 - i * 13.5, 0, Math.PI * 2); g.fillStyle = cols[i % cols.length]; g.fill();
    g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 2; g.stroke();
  }
});

/** Deterministic ignition sparks: ballistic arcs from the dome, stretched streaks, cooling colour. */
const Sparks: React.FC<{ f: number }> = ({ f }) => {
  const N = 90;
  const seeds = useMemo(() => { const r = rng(42); return Array.from({ length: N }, () => ({ t0: r() * 18, a: r() * Math.PI * 2, up: 1.2 + r() * 1.8, sp: 0.6 + r() * 1.4, life: 10 + r() * 14 })); }, []);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const pos = new Float32Array(N * 6), col = new Float32Array(N * 6);
  const g = 9.8;
  seeds.forEach((s, i) => {
    const age = (f - IGNITE - s.t0) / 30;
    let alive = age > 0 && age * 30 < s.life;
    const p = (tt: number): [number, number, number] => [
      DOME_POS[0] + Math.cos(s.a) * s.sp * tt,
      DOME_POS[1] + 0.05 + s.up * tt - 0.5 * g * tt * tt,
      DOME_POS[2] + Math.sin(s.a) * s.sp * tt * 0.6 + 0.08,
    ];
    const a = p(Math.max(0, age)), b = p(Math.max(0, age - 0.035));
    if (a[1] < BENCH.h) alive = false;
    const heat = alive ? 1 - (age * 30) / s.life : 0;
    pos.set([...a, ...b], i * 6);
    const c = [3.2 * heat, (1.9 * heat) ** 1.2, 0.6 * heat * heat];
    col.set([...c, ...c.map((v) => v * 0.3)], i * 6);
  });
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  if (f < IGNITE) return null;
  return (
    <group>
      <lineSegments geometry={geo}><lineBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></lineSegments>
      <points geometry={geo}><pointsMaterial vertexColors size={0.022} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></points>
    </group>
  );
};

const Pipe: React.FC<{ a: [number, number, number]; b: [number, number, number]; m: THREE.Material; r?: number }> = ({ a, b, m, r = 0.035 }) => {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const len = va.distanceTo(vb);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return (
    <group>
      <mesh position={mid} quaternion={q} material={m} castShadow receiveShadow><cylinderGeometry args={[r, r, len, 14]} /><Ink k={0.8} /></mesh>
      <mesh position={va} material={m}><sphereGeometry args={[r * 1.5, 12, 8]} /></mesh>
      <mesh position={vb} material={m}><sphereGeometry args={[r * 1.5, 12, 8]} /></mesh>
    </group>
  );
};

export const Extras: React.FC<{ f: number; lever: number }> = ({ f, lever }) => {
  const m = useMaterials();
  const bp = useMemo(() => [blueprint(1), blueprint(2)].map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })), []);
  const coat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5b3b28", roughness: 0.9 }), []);
  const rug = useMemo(() => new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1 }), []);
  const clockFace = useMemo(() => new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g) => {
    g.fillStyle = "#efe4c8"; g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#2a1d26"; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 100 - 4, 128 - Math.cos(a) * 100 - 10, 8, 20); }
  }), roughness: 0.6 }), []);
  const zb = ROOM.zBack;
  const sec = (f / 30) * (Math.PI * 2 / 60) + 1.2;
  const leverA = 0.25 * lever; // upright -> pulled toward Odo
  const r = rng(7);
  return (
    <group>
      {/* floor-standing brass lever (railway-switch style) wired to the contraption */}
      <group position={LEVER_POS}>
        <Box p={[0, 0.07, 0]} s={[0.34, 0.14, 0.22]} mat={m.iron} />
        <Box p={[0, 0.15, 0]} s={[0.26, 0.03, 0.12]} mat={m.brass} />
        <mesh position={[0.12, 0.1, 0.112]}><circleGeometry args={[0.022, 16]} /><meshBasicMaterial color={lever > 0.5 ? [0.4, 3, 0.8] : [2.6, 0.3, 0.2]} toneMapped={false} /></mesh>
        <group position={[0, 0.14, 0]} rotation={[0, 0, leverA]}>
          <Cyl p={[0, 0.35, 0]} rt={0.014} rb={0.02} h={0.7} mat={m.steel} seg={10} />
          <mesh position={[0, 0.71, 0]} material={m.red} castShadow><sphereGeometry args={[0.04, 16, 12]} /><Ink k={0.8} /></mesh>
        </group>
        <Pipe a={[0.17, 0.05, -0.05]} b={[0.45, 0.05, -0.6]} m={m.cord} r={0.014} />
        <Pipe a={[0.45, 0.05, -0.6]} b={[0.5, BENCH.h, -0.62]} m={m.cord} r={0.014} />
      </group>
      <Sparks f={f} />
      {/* copper pipes along the back wall and up to the ceiling */}
      <Pipe a={[ROOM.x1 - 0.35, 0.35, zb + 0.14]} b={[ROOM.x1 - 0.35, ROOM.h - 0.3, zb + 0.14]} m={m.copper} />
      <Pipe a={[ROOM.x1 - 0.35, 2.95, zb + 0.14]} b={[0.25, 2.95, zb + 0.14]} m={m.copper} />
      <Pipe a={[0.25, 2.95, zb + 0.14]} b={[0.25, 2.2, zb + 0.14]} m={m.copper} />
      <Cyl p={[0.25, 2.12, zb + 0.16]} rt={0.09} rb={0.09} h={0.05} r={[Math.PI / 2, 0, 0]} mat={m.brass} />
      {/* blueprints pinned between window and door */}
      <mesh position={[WINDOW.x + 0.05, 0.92, zb + 0.1]} rotation={[0, 0, 0.03]} material={bp[0]}><planeGeometry args={[0.62, 0.46]} /></mesh>
      <mesh position={[DOOR.x + 1.0, 2.55, zb + 0.1]} rotation={[0, 0, -0.05]} material={bp[1]}><planeGeometry args={[0.5, 0.38]} /></mesh>
      <mesh position={[WINDOW.x + 0.05, 1.12, zb + 0.105]} material={m.red}><sphereGeometry args={[0.015, 8, 6]} /></mesh>
      {/* wall clock above the window (second hand ticks) */}
      <group position={[WINDOW.x, 2.85, zb + 0.12]}>
        <mesh material={m.door} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.05, 32]} /><Ink /></mesh>
        <mesh position={[0, 0, 0.027]} material={clockFace}><circleGeometry args={[0.17, 32]} /></mesh>
        <mesh position={[0, 0, 0.035]} rotation={[0, 0, -2.1]}><planeGeometry args={[0.016, 0.2]} /><meshBasicMaterial color="#2a1d26" /></mesh>
        <mesh position={[0, 0, 0.037]} rotation={[0, 0, -Math.floor(sec * 60 / (Math.PI * 2)) * (Math.PI * 2 / 60)]}><planeGeometry args={[0.006, 0.28]} /><meshBasicMaterial color="#9e3a2c" /></mesh>
      </group>
      {/* braided rug under the work area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.6, 0.006, -1.75]} scale={[1.6, 1.0, 1]} material={rug} receiveShadow><circleGeometry args={[1, 48]} /></mesh>
      {/* coat rack with a long coat and hat by the door */}
      <group position={[DOOR.x + 0.95, 0, zb + 0.35]}>
        <Cyl p={[0, 0.95, 0]} rt={0.025} rb={0.03} h={1.9} mat={m.benchDark} seg={10} />
        <Cyl p={[0, 0.03, 0]} rt={0.2} rb={0.22} h={0.06} mat={m.benchDark} />
        <mesh position={[0.04, 1.42, 0.07]} scale={[1, 1, 0.55]} material={coat} castShadow><capsuleGeometry args={[0.12, 0.55, 6, 14]} /><Ink /></mesh>
        <mesh position={[0.04, 1.78, 0.07]} rotation={[0, 0, Math.PI / 2]} material={m.scarf}><capsuleGeometry args={[0.04, 0.16, 4, 8]} /></mesh>
        <group position={[0, 1.93, 0]}>
          <Cyl p={[0, 0, 0]} rt={0.15} rb={0.15} h={0.02} mat={m.iron} />
          <Cyl p={[0, 0.08, 0]} rt={0.09} rb={0.1} h={0.14} mat={m.iron} />
        </group>
      </group>
      {/* toolbox, oil can and loose cogs on the floor near the bench */}
      <Box p={[2.55, 0.14, -2.3]} s={[0.5, 0.28, 0.26]} r={[0, -0.3, 0]} mat={m.red} />
      <Box p={[2.55, 0.3, -2.3]} s={[0.3, 0.04, 0.04]} r={[0, -0.3, 0]} mat={m.iron} />
      <Cyl p={[2.15, 0.1, -1.9]} rt={0.06} rb={0.08} h={0.2} mat={m.copper} seg={14} />
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[1.6 + r() * 0.8, 0.012, -1.4 - r() * 0.5]} rotation={[-Math.PI / 2, 0, r() * 6]} material={m.brass}><torusGeometry args={[0.05 + r() * 0.03, 0.012, 6, 12]} /></mesh>
      ))}
      {/* foreground parallax for the tracking shot: hanging chain + crate with jars, near the lens path */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-0.55, 3.55 - i * 0.075, 0.05]} rotation={[0, i % 2 ? Math.PI / 2 : 0, 0]} material={m.iron}><torusGeometry args={[0.03, 0.009, 6, 10]} /></mesh>
      ))}
      <mesh position={[-0.55, 2.47, 0.05]} material={m.iron}><torusGeometry args={[0.06, 0.016, 8, 16, Math.PI * 1.5]} /></mesh>
      <Box p={[0.35, 0.28, -0.25]} s={[0.56, 0.56, 0.5]} r={[0, 0.3, 0]} mat={m.door} />
      <Cyl p={[0.3, 0.68, -0.25]} rt={0.09} rb={0.1} h={0.24} mat={m.glassG} seg={16} />
      <Cyl p={[0.48, 0.64, -0.18]} rt={0.06} rb={0.06} h={0.16} mat={m.glassA} seg={14} />
    </group>
  );
};
