// Dense set dressing for the Long Workshop ("max out the detail" pass). Everything is procedural and seeded.
//  - bench-top clutter in every bay (hammer, wrenches, screwdrivers, mug, inkwell + quill, paper stacks, spring,
//    desk clock, oil can, magnifier, bolts, rolled blueprint, small boxes)
//  - copper wall pipes with brackets, hand-wheel valves and pressure gauges; framed blueprints and wall clocks
//  - string lights strung across the hall, hanging chains with pulley blocks
//  - floor storytelling: snaking cables, oil stains, sawdust drifts, toolboxes, buckets, scattered gears/bolts
//  - dust motes drifting in the pendant light
import React, { useMemo } from "react";
import * as THREE from "three";
import { Ink } from "../inventor/Workshop";
import { HALL, bayZ, PENDANT_X, PENDANT_Y } from "./LongHall";
import { glow } from "./hallTextures";
import { rng } from "../lib/math";

const mk = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...o });
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
const useMats = () => useMemo(() => {
  const gauge = canvasTex(128, 128, (g) => {
    g.fillStyle = "#f2ead6"; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#2a1d26"; g.lineWidth = 3; for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5; g.beginPath(); g.moveTo(64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); g.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); g.stroke(); }
    g.strokeStyle = "#b8352a"; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 52, Math.PI * 1.95, Math.PI * 2.25); g.stroke();
    g.strokeStyle = "#1a1418"; g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(-0.6) * 44, 64 + Math.sin(-0.6) * 44); g.stroke();
  });
  const blueprint = (seed: number) => canvasTex(256, 192, (g) => {
    const r = rng(seed); g.fillStyle = "#24508a"; g.fillRect(0, 0, 256, 192);
    g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 1; for (let x = 0; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 192); g.stroke(); } for (let y = 0; y < 192; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    g.strokeStyle = "rgba(235,245,255,0.9)"; g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const cx = 40 + r() * 170, cy = 40 + r() * 110, R = 14 + r() * 26, n = 8 + Math.floor(r() * 8); g.beginPath(); for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? R : R * 0.8; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.stroke(); }
    g.beginPath(); g.moveTo(20, 170); g.lineTo(236, 170); g.stroke();
  });
  const stain = canvasTex(128, 128, (g) => { const r = rng(3); for (let i = 0; i < 9; i++) { const gr = g.createRadialGradient(64 + (r() - 0.5) * 50, 64 + (r() - 0.5) * 50, 0, 64, 64, 30 + r() * 30); gr.addColorStop(0, "rgba(8,5,3,0.35)"); gr.addColorStop(1, "rgba(8,5,3,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); } });
  const dust = canvasTex(128, 128, (g) => { const r = rng(4); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(214,180,120,${0.25 + r() * 0.4})`; const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * 60; g.fillRect(64 + Math.cos(a) * d, 64 + Math.sin(a) * d * 0.6, 1.5 + r() * 2, 1.5); } });
  return {
    steel: mk({ color: "#a7b0ba", metalness: 0.8, roughness: 0.28 }), iron: mk({ color: "#33353c", metalness: 0.6, roughness: 0.45 }),
    brass: mk({ color: "#cfa045", metalness: 0.8, roughness: 0.3 }), copper: mk({ color: "#c06a3c", metalness: 0.8, roughness: 0.3 }),
    wood: mk({ color: "#6e4428", roughness: 0.7 }), woodL: mk({ color: "#a9763f", roughness: 0.65 }), red: mk({ color: "#a8312a", roughness: 0.45 }),
    teal: mk({ color: "#2d6f6a", roughness: 0.5 }), cream: mk({ color: "#efe3c8", roughness: 0.6 }), paper: mk({ color: "#f1e7cf", roughness: 0.95 }),
    paper2: mk({ color: "#e2d3ae", roughness: 0.95 }), ink: mk({ color: "#151018", roughness: 0.2 }), glassG: new THREE.MeshStandardMaterial({ color: "#7fc49a", transparent: true, opacity: 0.55, roughness: 0.05 }),
    blue: mk({ color: "#3a5f9a", roughness: 0.8 }), rubber: mk({ color: "#1a1a1e", roughness: 0.8 }), feather: mk({ color: "#f3efe6", roughness: 0.9, side: THREE.DoubleSide }),
    gauge: mk({ map: gauge, roughness: 0.3 }), bp: [blueprint(11), blueprint(12), blueprint(13)].map((t) => mk({ map: t, roughness: 0.9 })),
    frame: mk({ color: "#3a2416", roughness: 0.55 }), stain: new THREE.MeshBasicMaterial({ map: stain, transparent: true, depthWrite: false }),
    dust: new THREE.MeshBasicMaterial({ map: dust, transparent: true, depthWrite: false }),
    bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.4, 1.2), toneMapped: false }),
    wire: mk({ color: "#14100e", roughness: 0.7 }),
  };
}, []);
type M = ReturnType<typeof useMats>;

const Box: React.FC<{ p: [number, number, number]; s: [number, number, number]; r?: [number, number, number]; m: THREE.Material; ink?: boolean }> = ({ p, s, r, m, ink = false }) => (
  <mesh position={p} rotation={r} material={m} castShadow receiveShadow><boxGeometry args={s} />{ink && <Ink k={0.7} />}</mesh>);
const Cyl: React.FC<{ p: [number, number, number]; rt: number; rb: number; h: number; m: THREE.Material; r?: [number, number, number]; seg?: number; ink?: boolean }> = ({ p, rt, rb, h, m, r, seg = 14, ink = false }) => (
  <mesh position={p} rotation={r} material={m} castShadow receiveShadow><cylinderGeometry args={[rt, rb, h, seg]} />{ink && <Ink k={0.7} />}</mesh>);

const Tube: React.FC<{ pts: [number, number, number][]; r: number; m: THREE.Material; seg?: number }> = ({ pts, r, m, seg = 40 }) => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 6, false), [pts, r, seg]);
  return <mesh geometry={geo} material={m} castShadow receiveShadow />;
};

// ---------- bench clutter ----------
const Clutter: React.FC<{ m: M; i: number; f: number }> = ({ m, i, f }) => {
  const z = bayZ(i), top = 0.92, x = -1.86;
  const r = rng(900 + i * 7);
  const items: React.ReactNode[] = [];
  const spot = (dz: number, dx = 0) => [x + dx + (r() - 0.5) * 0.12, top, z + dz] as const;
  // hammer
  { const [hx, hy, hz] = spot(0.75, 0.12); const a = r() * 3;
    items.push(<group key="h" position={[hx, hy + 0.015, hz]} rotation={[0, a, 0]}><Cyl p={[0, 0, 0]} rt={0.012} rb={0.014} h={0.26} m={m.woodL} r={[0, 0, Math.PI / 2]} /><Box p={[0.13, 0.005, 0]} s={[0.04, 0.035, 0.09]} m={m.iron} ink /></group>); }
  // wrench + screwdriver
  { const [wx, wy, wz] = spot(0.35, 0.2); items.push(<group key="w" position={[wx, wy + 0.006, wz]} rotation={[0, r() * 3, 0]}><Box p={[0, 0, 0]} s={[0.17, 0.01, 0.022]} m={m.steel} /><mesh position={[0.095, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.steel}><torusGeometry args={[0.022, 0.008, 6, 14, Math.PI * 1.5]} /></mesh></group>); }
  { const [sx, sy, sz] = spot(-0.25, 0.22); items.push(<group key="s" position={[sx, sy + 0.012, sz]} rotation={[0, r() * 3, Math.PI / 2]}><Cyl p={[0, 0.06, 0]} rt={0.015} rb={0.013} h={0.08} m={i % 2 ? m.red : m.teal} /><Cyl p={[0, -0.03, 0]} rt={0.004} rb={0.004} h={0.11} m={m.steel} seg={6} /></group>); }
  // mug with steam-less coffee
  { const [mx, my, mz] = spot(-0.82, 0.1); items.push(<group key="m" position={[mx, my, mz]}><Cyl p={[0, 0.05, 0]} rt={0.038} rb={0.034} h={0.1} m={i % 3 === 0 ? m.cream : i % 3 === 1 ? m.blue : m.red} ink /><mesh position={[0.045, 0.05, 0]} material={m.cream}><torusGeometry args={[0.022, 0.007, 6, 12]} /></mesh><mesh position={[0, 0.095, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.032, 16]} /><meshStandardMaterial color="#3a1f12" roughness={0.2} /></mesh></group>); }
  // inkwell + quill
  { const [ix, iy, iz] = spot(0.05, -0.18); items.push(<group key="i" position={[ix, iy, iz]}><Cyl p={[0, 0.025, 0]} rt={0.025} rb={0.032} h={0.05} m={m.ink} /><mesh position={[0.02, 0.1, 0]} rotation={[0, 0, -0.35]} material={m.feather}><planeGeometry args={[0.025, 0.16]} /></mesh></group>); }
  // paper stack
  { const [px, py, pz] = spot(-0.5, 0.16); items.push(<group key="p" position={[px, py, pz]}>{[0, 1, 2, 3, 4].map((k) => <Box key={k} p={[0, 0.003 + k * 0.004, 0]} s={[0.21, 0.003, 0.28]} r={[0, (r() - 0.5) * 0.25, 0]} m={k % 2 ? m.paper : m.paper2} />)}</group>); }
  // spring
  { const [sx, sy, sz] = spot(0.55, -0.2); const pts: [number, number, number][] = []; for (let k = 0; k <= 80; k++) { const a = (k / 80) * Math.PI * 2 * 7; pts.push([Math.cos(a) * 0.022, 0.006 + (k / 80) * 0.09, Math.sin(a) * 0.022]); } items.push(<group key="sp" position={[sx, sy, sz]}><Tube pts={pts} r={0.0035} m={m.steel} seg={160} /></group>); }
  // desk clock or oil can (alternating)
  if (i % 2 === 0) { const [cx, cy, cz] = spot(-0.95, -0.22); items.push(<group key="c" position={[cx, cy, cz]} rotation={[0, Math.PI / 2 + 0.3, 0]}><Cyl p={[0, 0.06, 0]} rt={0.05} rb={0.05} h={0.03} r={[Math.PI / 2, 0, 0]} m={m.brass} ink /><mesh position={[0, 0.06, 0.016]}><circleGeometry args={[0.042, 20]} /><meshStandardMaterial color="#f3ead6" /></mesh><mesh position={[0, 0.06, 0.018]} rotation={[0, 0, -(f / 30) * 0.2]}><planeGeometry args={[0.004, 0.036]} /><meshBasicMaterial color="#222" /></mesh>{[-1, 1].map((s) => <Cyl key={s} p={[s * 0.03, 0.012, 0]} rt={0.008} rb={0.008} h={0.025} m={m.brass} seg={8} />)}</group>); }
  else { const [ox, oy, oz] = spot(-0.95, -0.22); items.push(<group key="o" position={[ox, oy, oz]}><Cyl p={[0, 0.045, 0]} rt={0.045} rb={0.055} h={0.09} m={m.copper} ink /><mesh position={[0.05, 0.11, 0]} rotation={[0, 0, -0.9]} material={m.copper}><coneGeometry args={[0.009, 0.12, 8]} /></mesh></group>); }
  // magnifier
  { const [gx, gy, gz] = spot(0.95, -0.15); items.push(<group key="g" position={[gx, gy + 0.008, gz]} rotation={[-Math.PI / 2, 0, r() * 3]}><mesh material={m.brass}><torusGeometry args={[0.04, 0.006, 6, 20]} /></mesh><mesh material={m.glassG}><circleGeometry args={[0.038, 20]} /></mesh><Cyl p={[0, -0.08, 0]} rt={0.008} rb={0.009} h={0.08} m={m.wood} seg={8} /></group>); }
  // bolts & nuts
  for (let k = 0; k < 7; k++) { const [bx, by, bz] = spot((r() - 0.5) * 1.6, (r() - 0.5) * 0.4); items.push(<Cyl key={`b${k}`} p={[bx, by + 0.006, bz]} rt={0.01} rb={0.01} h={0.012} m={k % 2 ? m.brass : m.steel} seg={6} />); }
  // rolled blueprint + small boxes
  { const [rx, ry, rz] = spot(0.18, 0.3); items.push(<Cyl key="rb" p={[rx, ry + 0.025, rz]} rt={0.025} rb={0.025} h={0.42} r={[Math.PI / 2, 0, 0.2]} m={m.blue} />); }
  { const [bx, by, bz] = spot(-0.05, 0.33); items.push(<Box key="bx" p={[bx, by + 0.04, bz]} s={[0.1, 0.08, 0.12]} r={[0, 0.4, 0]} m={m.wood} ink />, <Box key="bx2" p={[bx + 0.01, by + 0.1, bz + 0.01]} s={[0.07, 0.04, 0.08]} r={[0, -0.2, 0]} m={m.red} />); }
  return <group>{items}</group>;
};

// ---------- wall pipes, valves, gauges, frames, clocks (left wall above the shelves) ----------
const WallKit: React.FC<{ m: M; f: number }> = ({ m, f }) => {
  const x = HALL.x0 + 0.1, L = HALL.zFront - HALL.zFar, zc = (HALL.zFront + HALL.zFar) / 2;
  return (
    <group>
      {[2.62, 2.78].map((y, k) => <Cyl key={y} p={[x + k * 0.02, y, zc]} rt={0.035 - k * 0.008} rb={0.035 - k * 0.008} h={L} r={[Math.PI / 2, 0, 0]} m={k ? m.brass : m.copper} seg={12} />)}
      {Array.from({ length: HALL.bays * 2 }, (_, k) => { const z = bayZ(0) + 1.3 - k * (HALL.bay / 2); return <Box key={k} p={[x - 0.04, 2.7, z]} s={[0.08, 0.26, 0.04]} m={m.iron} />; })}
      {Array.from({ length: HALL.bays }, (_, i) => {
        const z = bayZ(i);
        return (
          <group key={i}>
            {/* valve + vertical drop + gauge */}
            <Cyl p={[x, 2.33, z + 0.55]} rt={0.025} rb={0.025} h={0.6} m={m.copper} seg={10} />
            <group position={[x + 0.07, 2.25, z + 0.55]} rotation={[0, Math.PI / 2, (f / 30) * 0.05 * (i % 2 ? 1 : -1)]}>
              <mesh material={m.red}><torusGeometry args={[0.07, 0.012, 6, 18]} /></mesh>
              {[0, 1, 2].map((k) => <mesh key={k} rotation={[0, 0, (k / 3) * Math.PI]} material={m.red}><boxGeometry args={[0.14, 0.012, 0.012]} /></mesh>)}
            </group>
            <group position={[x + 0.05, 2.62, z - 0.45]} rotation={[0, Math.PI / 2, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={m.brass}><cylinderGeometry args={[0.075, 0.075, 0.04, 24]} /><Ink k={0.7} /></mesh>
              <mesh position={[0, 0, 0.021]} material={m.gauge}><circleGeometry args={[0.065, 24]} /></mesh>
            </group>
            {/* framed blueprint / clock alternating, high on the wall */}
            {i % 2 === 0 ? (
              <group position={[x + 0.03, 3.2, z + 0.1]} rotation={[0, Math.PI / 2, (i % 4 ? 0.03 : -0.04)]}>
                <Box p={[0, 0, -0.01]} s={[0.66, 0.5, 0.03]} m={m.frame} ink />
                <mesh position={[0, 0, 0.007]} material={m.bp[i % 3]}><planeGeometry args={[0.58, 0.42]} /></mesh>
              </group>
            ) : (
              <group position={[x + 0.03, 3.2, z + 0.1]} rotation={[0, Math.PI / 2, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} material={m.wood}><cylinderGeometry args={[0.22, 0.22, 0.05, 32]} /><Ink k={0.7} /></mesh>
                <mesh position={[0, 0, 0.027]}><circleGeometry args={[0.19, 32]} /><meshStandardMaterial color="#efe3c8" /></mesh>
                <mesh position={[0, 0, 0.032]} rotation={[0, 0, -1.2 - i]}><planeGeometry args={[0.014, 0.2]} /><meshBasicMaterial color="#2a1d26" /></mesh>
                <mesh position={[0, 0, 0.034]} rotation={[0, 0, -(f / 30) * (Math.PI / 30) * 6]}><planeGeometry args={[0.006, 0.3]} /><meshBasicMaterial color="#9e3a2c" /></mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
};

// ---------- string lights + hanging chains ----------
const StringLights: React.FC<{ m: M }> = ({ m }) => {
  const halo = useMemo(() => glow("rgba(255,205,130,1)", "rgba(255,150,60,0)"), []);
  return (
    <group>
      {[0, 2, 4, 6].map((i) => {
        const z = bayZ(i) + 0.9, x0 = HALL.x0 + 0.2, x1 = HALL.x1 - 0.2, y0 = 3.75, sag = 0.55;
        const pts: [number, number, number][] = Array.from({ length: 13 }, (_, k) => { const t = k / 12; return [x0 + (x1 - x0) * t, y0 - sag * 4 * t * (1 - t), z + Math.sin(t * Math.PI) * 0.25]; });
        return (
          <group key={i}>
            <Tube pts={pts} r={0.006} m={m.wire} seg={40} />
            {pts.slice(1, -1).map((p, k) => (
              <group key={k} position={[p[0], p[1] - 0.05, p[2]]}>
                <mesh material={m.bulb}><sphereGeometry args={[0.022, 8, 6]} /></mesh>
                <sprite scale={[0.22, 0.22, 1]}><spriteMaterial map={halo} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
              </group>
            ))}
          </group>
        );
      })}
      {[1, 3, 5].map((i) => {
        const z = bayZ(i) - 0.9, x = 1.15;
        return (
          <group key={`c${i}`}>
            {Array.from({ length: 16 }, (_, k) => <mesh key={k} position={[x, 3.95 - k * 0.07, z]} rotation={[0, k % 2 ? Math.PI / 2 : 0, 0]} material={m.iron}><torusGeometry args={[0.026, 0.008, 6, 10]} /></mesh>)}
            <Box p={[x, 2.75, z]} s={[0.12, 0.16, 0.08]} m={m.wood} ink />
            <mesh position={[x, 2.75, z + 0.045]} material={m.iron}><cylinderGeometry args={[0.05, 0.05, 0.02, 16]} /></mesh>
            <mesh position={[x, 2.58, z]} material={m.steel}><torusGeometry args={[0.05, 0.012, 6, 14, Math.PI * 1.3]} /></mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------- floor ----------
const FloorKit: React.FC<{ m: M }> = ({ m }) => {
  const r = rng(77);
  return (
    <group>
      {Array.from({ length: HALL.bays }, (_, i) => {
        const z = bayZ(i);
        const cable: [number, number, number][] = [[-1.62, 0.92, z - 0.1], [-1.55, 0.4, z - 0.15], [-1.4, 0.015, z - 0.3], [-1.0, 0.015, z - 0.6 + (r() - 0.5) * 0.3], [-0.85, 0.015, z - 1.1], [-1.3, 0.015, z - 1.3]];
        return (
          <group key={i}>
            <Tube pts={cable} r={0.01} m={m.rubber} seg={30} />
            <mesh position={[-1.1 + (r() - 0.5) * 0.3, 0.003, z + (r() - 0.5) * 1.2]} rotation={[-Math.PI / 2, 0, r() * 6]} material={m.stain}><planeGeometry args={[0.7, 0.5]} /></mesh>
            <mesh position={[-1.6, 0.004, z + 0.2]} rotation={[-Math.PI / 2, 0, r() * 6]} material={m.dust}><planeGeometry args={[0.9, 0.7]} /></mesh>
            {i % 3 === 1 && (
              <group position={[-1.05, 0, z + 0.85]} rotation={[0, r(), 0]}>
                <Box p={[0, 0.12, 0]} s={[0.44, 0.24, 0.22]} m={m.red} ink />
                <Box p={[0, 0.26, 0]} s={[0.26, 0.03, 0.03]} m={m.iron} />
              </group>
            )}
            {i % 3 === 2 && (
              <group position={[-1.0, 0, z - 0.95]}>
                <Cyl p={[0, 0.14, 0]} rt={0.13} rb={0.11} h={0.28} m={m.iron} seg={18} ink />
                <mesh position={[0, 0.3, 0]} rotation={[0.3, 0, 0]} material={m.steel}><torusGeometry args={[0.12, 0.006, 6, 18, Math.PI]} /></mesh>
              </group>
            )}
            {Array.from({ length: 4 }, (_, k) => <mesh key={k} position={[-0.9 + (r() - 0.5) * 0.7, 0.01, z + (r() - 0.5) * 2]} rotation={[-Math.PI / 2, 0, r() * 6]} material={k % 2 ? m.brass : m.steel}><torusGeometry args={[0.03 + r() * 0.03, 0.009, 6, 10]} /></mesh>)}
          </group>
        );
      })}
    </group>
  );
};

/** Dust motes drifting through the pendant cones (deterministic). */
const Motes: React.FC<{ f: number }> = ({ f }) => {
  const base = useMemo(() => { const r = rng(55); return Array.from({ length: 360 }, () => [r(), r(), r(), r(), Math.floor(r() * 4)] as const); }, []);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const pos = new Float32Array(base.length * 3);
  base.forEach(([a, b, c, ph, bay], i) => {
    const y = 0.25 + ((b + f * 0.0011 + ph * 0.3) % 1) * 2.5, rad = 0.15 + (1 - y / 2.9) * 0.8;
    const ang = a * Math.PI * 2 + f * 0.004 * (ph - 0.5);
    pos[i * 3] = PENDANT_X + Math.cos(ang) * rad * Math.sqrt(c) + 0.04 * Math.sin(f * 0.02 + ph * 9);
    pos[i * 3 + 1] = y; pos[i * 3 + 2] = bayZ(bay) + 0.15 + Math.sin(ang) * rad * Math.sqrt(c);
  });
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return <points geometry={geo}><pointsMaterial color="#ffd9a8" size={0.012} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></points>;
};

export const HallDetail: React.FC<{ f: number }> = ({ f }) => {
  const m = useMats();
  return (
    <group>
      {Array.from({ length: HALL.bays }, (_, i) => <Clutter key={i} m={m} i={i} f={f} />)}
      <WallKit m={m} f={f} />
      <StringLights m={m} />
      <FloorKit m={m} />
      <Motes f={f} />
    </group>
  );
};
void PENDANT_Y;
