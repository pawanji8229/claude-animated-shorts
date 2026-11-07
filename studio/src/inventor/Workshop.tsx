// The workshop set: perspective-rich, inked 3D environment with a few detailed hero props.
// Ink = InkHull (../lib/Ink.tsx: inverted hull, screen-space px so line weight stays constant with distance, like the
// verified look target "nearly constant line width"). Character cards are never outlined by this pass.
import React, { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { InkHull } from "../lib/Ink";
import { BENCH, BULB, DOOR, ROOM, WINDOW, bulbSway, domeGlow } from "./timeline";
import { floorTexture, nightTexture, wallTexture, woodTexture, coneAlpha, radial } from "./textures";
import { rng } from "../lib/math";

/** Ink width in screen px, scaled with output height (3.2 px at 1920 tall). */
export const InkCtx = createContext(3.2);
const INK = "#0b0a0c";

const Ink: React.FC<{ angle?: number; k?: number }> = ({ angle = Math.PI, k = 1 }) => {
  const px = useContext(InkCtx);
  return <InkHull px={px * k} color={INK} angle={angle} />;
};

type BoxProps = { p: [number, number, number]; s: [number, number, number]; r?: [number, number, number]; mat: THREE.Material; ink?: boolean; cast?: boolean; receive?: boolean };
const Box: React.FC<BoxProps> = ({ p, s, r, mat, ink = true, cast = true, receive = true }) => (
  <mesh position={p} rotation={r} material={mat} castShadow={cast} receiveShadow={receive}>
    <boxGeometry args={s} />
    {ink && <Ink />}
  </mesh>
);
const Cyl: React.FC<{ p: [number, number, number]; rt: number; rb: number; h: number; mat: THREE.Material; seg?: number; r?: [number, number, number]; ink?: boolean }> = ({ p, rt, rb, h, mat, seg = 24, r, ink = true }) => (
  <mesh position={p} rotation={r} material={mat} castShadow receiveShadow>
    <cylinderGeometry args={[rt, rb, h, seg]} />
    {ink && <Ink />}
  </mesh>
);

const gearGeometry = (teeth: number, ro: number, ri: number, hole: number, depth: number) => {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 4 === 1 || i % 4 === 2 ? ro : ri;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
};

const useMaterials = () =>
  useMemo(() => {
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0, ...o });
    const floorMap = floorTexture();
    const wallMap = wallTexture();
    return {
      floor: std({ map: floorMap, roughness: 0.75 }),
      wall: std({ map: wallMap }),
      wallPlain: std({ color: "#6f5b3f" }),
      ceiling: std({ color: "#2a1c14" }),
      beam: std({ map: woodTexture(9, 24, 24) }),
      trim: std({ color: "#3b2414" }),
      door: std({ map: woodTexture(13, 18, 30) }),
      bench: std({ map: woodTexture(5, 32, 46) }),
      benchDark: std({ map: woodTexture(6, 24, 28) }),
      brass: std({ color: "#c7973c", metalness: 0.6, roughness: 0.42 }),
      copper: std({ color: "#b5643a", metalness: 0.8, roughness: 0.35 }),
      iron: std({ color: "#3d3f45", metalness: 0.6, roughness: 0.5 }),
      steel: std({ color: "#9aa3ad", metalness: 0.7, roughness: 0.35 }),
      red: std({ color: "#9e3a2c" }),
      teal: std({ color: "#2d6f6a" }),
      cream: std({ color: "#e6d6b4" }),
      book1: std({ color: "#7d2f2a" }), book2: std({ color: "#2c4d6e" }), book3: std({ color: "#6b6a2c" }), book4: std({ color: "#a2702c" }),
      glassG: new THREE.MeshStandardMaterial({ color: "#7fc4a0", transparent: true, opacity: 0.55, roughness: 0.15 }),
      glassA: new THREE.MeshStandardMaterial({ color: "#e0a64a", transparent: true, opacity: 0.6, roughness: 0.15 }),
      glassB: new THREE.MeshStandardMaterial({ color: "#7ea6d8", transparent: true, opacity: 0.55, roughness: 0.15 }),
      night: new THREE.MeshBasicMaterial({ map: nightTexture(), toneMapped: false }),
      peg: std({ color: "#5a4128" }),
      shade: std({ color: "#2f4b3f", metalness: 0.4, roughness: 0.45, side: THREE.DoubleSide }),
      cord: std({ color: "#111" }),
    };
  }, []);

/** Back wall with real openings for the door and the window (built from boxes around the holes). */
const BackWall: React.FC<{ m: ReturnType<typeof useMaterials> }> = ({ m }) => {
  const z = ROOM.zBack, t = 0.18, H = ROOM.h;
  const dL = DOOR.x - DOOR.w / 2, dR = DOOR.x + DOOR.w / 2;
  const wL = WINDOW.x - WINDOW.w / 2, wR = WINDOW.x + WINDOW.w / 2, wB = WINDOW.y - WINDOW.h / 2, wT = WINDOW.y + WINDOW.h / 2;
  // each wall piece gets the wall texture mapped in world space, so the plaster/wainscot lines up across holes
  const Wt = ROOM.x1 - ROOM.x0;
  const seg = (x0: number, x1: number, y0: number, y1: number, k: string) => {
    const mat = m.wall.clone();
    const tex = m.wall.map!.clone();
    tex.repeat.set(((x1 - x0) / Wt) * 2, (y1 - y0) / H);
    tex.offset.set(((x0 - ROOM.x0) / Wt) * 2, y0 / H);
    tex.needsUpdate = true;
    mat.map = tex;
    return (
      <mesh key={k} position={[(x0 + x1) / 2, (y0 + y1) / 2, z]} material={mat} receiveShadow>
        <boxGeometry args={[x1 - x0, y1 - y0, t]} />
      </mesh>
    );
  };
  return (
    <group>
      {seg(ROOM.x0, dL, 0, H, "a")}
      {seg(dL, dR, DOOR.h, H, "b")}
      {seg(dR, wL, 0, H, "c")}
      {seg(wL, wR, 0, wB, "d")}
      {seg(wL, wR, wT, H, "e")}
      {seg(wR, ROOM.x1, 0, H, "f")}
      {/* door frame */}
      <Box p={[dL - 0.05, DOOR.h / 2, z + 0.1]} s={[0.1, DOOR.h + 0.1, 0.06]} mat={m.trim} />
      <Box p={[dR + 0.05, DOOR.h / 2, z + 0.1]} s={[0.1, DOOR.h + 0.1, 0.06]} mat={m.trim} />
      <Box p={[DOOR.x, DOOR.h + 0.07, z + 0.1]} s={[DOOR.w + 0.3, 0.14, 0.08]} mat={m.trim} />
      {/* window frame, mullions, sill */}
      <Box p={[WINDOW.x, wB - 0.04, z + 0.14]} s={[WINDOW.w + 0.26, 0.08, 0.2]} mat={m.trim} />
      <Box p={[WINDOW.x, wT + 0.04, z + 0.1]} s={[WINDOW.w + 0.16, 0.08, 0.06]} mat={m.trim} />
      <Box p={[wL - 0.04, WINDOW.y, z + 0.1]} s={[0.08, WINDOW.h + 0.1, 0.06]} mat={m.trim} />
      <Box p={[wR + 0.04, WINDOW.y, z + 0.1]} s={[0.08, WINDOW.h + 0.1, 0.06]} mat={m.trim} />
      <Box p={[WINDOW.x, WINDOW.y, z]} s={[0.05, WINDOW.h, 0.05]} mat={m.trim} />
      <Box p={[WINDOW.x, WINDOW.y, z]} s={[WINDOW.w, 0.05, 0.05]} mat={m.trim} />
      {/* night outside, seen through both openings */}
      <mesh position={[-1.4, 1.6, z - 1.1]} material={m.night}><planeGeometry args={[6.5, 4.2]} /></mesh>
      {/* outside ground strip beyond the door */}
      <mesh position={[DOOR.x, 0.001, z - 0.6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.4, 1.2]} /><meshStandardMaterial color="#1c2a45" /></mesh>
    </group>
  );
};

const Door: React.FC<{ m: ReturnType<typeof useMaterials>; open: number }> = ({ m, open }) => {
  const hingeX = DOOR.x - DOOR.w / 2 + 0.02;
  return (
    <group position={[hingeX, 0, ROOM.zBack + 0.05]} rotation={[0, open, 0]}>
      <Box p={[DOOR.w / 2 - 0.02, DOOR.h / 2, 0]} s={[DOOR.w - 0.06, DOOR.h - 0.04, 0.06]} mat={m.door} />
      <Box p={[DOOR.w / 2, DOOR.h * 0.72, 0.04]} s={[DOOR.w * 0.7, DOOR.h * 0.3, 0.02]} mat={m.benchDark} />
      <Box p={[DOOR.w / 2, DOOR.h * 0.3, 0.04]} s={[DOOR.w * 0.7, DOOR.h * 0.36, 0.02]} mat={m.benchDark} />
      <mesh position={[DOOR.w - 0.14, 1.0, 0.07]} material={m.brass}><sphereGeometry args={[0.04, 12, 8]} /></mesh>
    </group>
  );
};

const Shelf: React.FC<{ m: ReturnType<typeof useMaterials>; x: number }> = ({ m, x }) => {
  const z = ROOM.zBack + 0.24;
  const r = rng(91);
  const items: React.ReactNode[] = [];
  const levels = [0.55, 1.15, 1.75, 2.35];
  levels.forEach((y, li) => {
    items.push(<Box key={`s${li}`} p={[x, y, z]} s={[1.1, 0.05, 0.4]} mat={m.benchDark} />);
    let cx = x - 0.48;
    while (cx < x + 0.46) {
      const kind = r();
      if (kind < 0.45) {
        const h = 0.18 + r() * 0.12, w = 0.04 + r() * 0.03;
        const mats = [m.book1, m.book2, m.book3, m.book4];
        items.push(<Box key={`b${li}${cx}`} p={[cx + w / 2, y + 0.025 + h / 2, z]} s={[w, h, 0.22]} r={[0, 0, r() < 0.15 ? 0.2 : 0]} mat={mats[Math.floor(r() * 4)]} />);
        cx += w + 0.005;
      } else if (kind < 0.8) {
        const rr = 0.045 + r() * 0.03, h = 0.12 + r() * 0.1;
        const mats = [m.glassG, m.glassA, m.glassB];
        items.push(<Cyl key={`j${li}${cx}`} p={[cx + rr, y + 0.025 + h / 2, z]} rt={rr * 0.9} rb={rr} h={h} mat={mats[Math.floor(r() * 3)]} seg={14} />);
        items.push(<Cyl key={`l${li}${cx}`} p={[cx + rr, y + 0.025 + h + 0.015, z]} rt={rr * 0.7} rb={rr * 0.7} h={0.03} mat={m.copper} seg={14} ink={false} />);
        cx += rr * 2 + 0.03;
      } else {
        items.push(<Box key={`c${li}${cx}`} p={[cx + 0.08, y + 0.08, z]} s={[0.16, 0.11, 0.24]} mat={m.red} />);
        cx += 0.2;
      }
    }
  });
  return (
    <group>
      <Box p={[x - 0.56, 1.35, z]} s={[0.05, 2.7, 0.42]} mat={m.benchDark} />
      <Box p={[x + 0.56, 1.35, z]} s={[0.05, 2.7, 0.42]} mat={m.benchDark} />
      {items}
    </group>
  );
};

/** Hero prop: brass "night-light engine" — gear train, copper coil and a glass dome with a glowing filament. */
const Contraption: React.FC<{ m: ReturnType<typeof useMaterials>; f: number }> = ({ m, f }) => {
  const g1 = useMemo(() => gearGeometry(14, 0.17, 0.145, 0.03, 0.035), []);
  const g2 = useMemo(() => gearGeometry(9, 0.11, 0.09, 0.025, 0.035), []);
  const glow = domeGlow(f);
  const filament = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb347"), toneMapped: false }), []);
  filament.color.setRGB(1.0 * glow, 0.62 * glow, 0.22 * glow);
  const rot = (f / 30) * 0.9;
  const y0 = BENCH.h;
  return (
    <group position={[BENCH.x - 0.35, y0, BENCH.z + 0.05]}>
      <Box p={[0, 0.06, 0]} s={[0.7, 0.12, 0.42]} mat={m.benchDark} />
      <Cyl p={[0.18, 0.3, 0]} rt={0.09} rb={0.11} h={0.36} mat={m.brass} />
      <mesh position={[0.18, 0.52, 0]} material={m.glassB}><sphereGeometry args={[0.13, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[0.18, 0.56, 0]} material={filament}><torusKnotGeometry args={[0.035, 0.008, 48, 6, 2, 5]} /></mesh>
      <pointLight position={[0.18, 0.6, 0.05]} color="#ffaa55" intensity={0.6 * glow} distance={2.2} decay={2} />
      <mesh position={[-0.16, 0.32, 0.08]} rotation={[0, 0, rot]} material={m.brass} castShadow><primitive object={g1} attach="geometry" /><Ink k={0.8} /></mesh>
      <mesh position={[0.04, 0.2, 0.1]} rotation={[0, 0, -rot * (14 / 9) + 0.2]} material={m.copper} castShadow><primitive object={g2} attach="geometry" /><Ink k={0.8} /></mesh>
      <mesh position={[-0.16, 0.32, 0.04]} rotation={[Math.PI / 2, 0, 0]} material={m.iron}><cylinderGeometry args={[0.02, 0.02, 0.1, 10]} /></mesh>
      {/* copper coil */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[-0.26, 0.16 + i * 0.035, -0.1]} rotation={[Math.PI / 2, 0, 0]} material={m.copper}><torusGeometry args={[0.06, 0.012, 6, 20]} /></mesh>
      ))}
      <Box p={[-0.26, 0.24, -0.1]} s={[0.03, 0.22, 0.03]} mat={m.iron} />
    </group>
  );
};

const Bench: React.FC<{ m: ReturnType<typeof useMaterials>; f: number }> = ({ m, f }) => {
  const { x, z, w, d, h } = BENCH;
  return (
    <group>
      <Box p={[x, h - 0.04, z]} s={[w, 0.08, d]} mat={m.bench} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Box key={i} p={[x + sx * (w / 2 - 0.08), (h - 0.08) / 2, z + sz * (d / 2 - 0.08)]} s={[0.09, h - 0.08, 0.09]} mat={m.benchDark} />
      ))}
      <Box p={[x, 0.22, z]} s={[w - 0.2, 0.05, d - 0.12]} mat={m.benchDark} />
      {/* crates and parts on the lower shelf */}
      <Box p={[x - 0.7, 0.36, z]} s={[0.42, 0.24, 0.4]} mat={m.door} />
      <Box p={[x + 0.6, 0.33, z + 0.05]} s={[0.36, 0.18, 0.32]} mat={m.teal} />
      {/* vice */}
      <Box p={[x + 1.0, h + 0.07, z + 0.3]} s={[0.22, 0.14, 0.16]} mat={m.iron} />
      <Cyl p={[x + 1.0, h + 0.07, z + 0.46]} rt={0.015} rb={0.015} h={0.26} r={[Math.PI / 2, 0, 0]} mat={m.steel} seg={8} />
      {/* scattered tools and paper plans */}
      <mesh position={[x + 0.45, h + 0.003, z + 0.18]} rotation={[-Math.PI / 2, 0, 0.25]} receiveShadow><planeGeometry args={[0.42, 0.3]} /><meshStandardMaterial color="#e9dfc4" /></mesh>
      <Box p={[x + 0.5, h + 0.012, z + 0.2]} s={[0.24, 0.018, 0.04]} r={[0, 0.6, 0]} mat={m.steel} />
      <Cyl p={[x + 0.2, h + 0.08, z - 0.2]} rt={0.05} rb={0.05} h={0.16} mat={m.cream} seg={14} />
      <Contraption m={m} f={f} />
      {/* pegboard with tools above the bench */}
      <Box p={[x + 0.55, 1.65, ROOM.zBack + 0.12]} s={[1.3, 0.85, 0.04]} mat={m.peg} />
      <Box p={[x + 0.25, 1.68, ROOM.zBack + 0.16]} s={[0.05, 0.5, 0.03]} mat={m.steel} />
      <Box p={[x + 0.25, 1.92, ROOM.zBack + 0.16]} s={[0.14, 0.06, 0.03]} mat={m.steel} />
      <Box p={[x + 0.55, 1.62, ROOM.zBack + 0.16]} s={[0.04, 0.42, 0.03]} mat={m.door} />
      <Box p={[x + 0.55, 1.85, ROOM.zBack + 0.16]} s={[0.2, 0.08, 0.05]} mat={m.iron} />
      <mesh position={[x + 0.88, 1.66, ROOM.zBack + 0.17]} material={m.red} castShadow><torusGeometry args={[0.1, 0.025, 8, 20, Math.PI * 1.6]} /><Ink /></mesh>
    </group>
  );
};

const Lamp: React.FC<{ m: ReturnType<typeof useMaterials>; f: number; shadowRes: number }> = ({ m, f, shadowRes }) => {
  const sway = bulbSway(f);
  const cordLen = ROOM.h - BULB[1];
  const alpha = useMemo(() => coneAlpha(), []);
  const glowTex = useMemo(() => radial("rgba(255,200,120,1)", "rgba(255,160,60,0)"), []);
  const target = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, -3, 0); return o; }, []);
  return (
    <group position={[BULB[0], ROOM.h, BULB[2]]} rotation={[sway * 0.5, 0, sway]}>
      <mesh position={[0, -cordLen / 2, 0]} material={m.cord}><cylinderGeometry args={[0.008, 0.008, cordLen, 6]} /></mesh>
      <group position={[0, -cordLen, 0]}>
        <mesh material={m.shade} castShadow><coneGeometry args={[0.26, 0.2, 28, 1, true]} /><Ink /></mesh>
        <mesh position={[0, 0.06, 0]} material={m.brass}><cylinderGeometry args={[0.04, 0.05, 0.1, 12]} /></mesh>
        <mesh position={[0, -0.07, 0]}><sphereGeometry args={[0.07, 20, 14]} /><meshBasicMaterial color={[3.2, 2.2, 1.2]} toneMapped={false} /></mesh>
        {/* soft halo sprite */}
        <sprite position={[0, -0.08, 0]} scale={[0.9, 0.9, 1]}><spriteMaterial map={glowTex} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.85} /></sprite>
        {/* visible light cone */}
        <mesh position={[0, -1.25, 0]}><cylinderGeometry args={[0.22, 1.3, 2.4, 40, 1, true]} /><meshBasicMaterial color="#ffb96b" alphaMap={alpha} transparent opacity={0.09} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
        <primitive object={target} />
        <spotLight
          position={[0, -0.08, 0]} target={target} color="#ffb067" intensity={34} distance={9} decay={2}
          angle={0.95} penumbra={0.65} castShadow shadow-mapSize={[shadowRes, shadowRes]} shadow-bias={-0.0004} shadow-normalBias={0.02}
        />
        <pointLight position={[0, -0.1, 0]} color="#ff9e57" intensity={4.5} distance={8} decay={1.6} />
      </group>
    </group>
  );
};

/** Deterministic dust motes drifting inside the light cone. */
const Dust: React.FC<{ f: number }> = ({ f }) => {
  const base = useMemo(() => { const r = rng(5); return Array.from({ length: 70 }, () => [r() * 2 - 1, r(), r() * 2 - 1, r()] as const); }, []);
  const geo = useMemo(() => new THREE.BufferGeometry(), []);
  const pos = new Float32Array(base.length * 3);
  base.forEach(([a, b, c, ph], i) => {
    const y = 0.3 + ((b + f * 0.0016) % 1) * 2.1;
    const rad = 0.2 + (1 - y / 2.6) * 0.9;
    pos[i * 3] = BULB[0] + a * rad * 0.8 + 0.05 * Math.sin(f * 0.03 + ph * 6);
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = BULB[2] + c * rad * 0.8;
  });
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return <points geometry={geo}><pointsMaterial color="#ffd9a0" size={0.018} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} /></points>;
};

export const Workshop: React.FC<{ f: number; doorOpen: number; shadowRes: number }> = ({ f, doorOpen, shadowRes }) => {
  const m = useMaterials();
  const gearBig = useMemo(() => gearGeometry(18, 0.42, 0.37, 0.08, 0.05), []);
  const W = ROOM.x1 - ROOM.x0, D = ROOM.zFront - ROOM.zBack;
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (ROOM.zBack + ROOM.zFront) / 2]} material={m.floor} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      <BackWall m={m} />
      {/* side walls */}
      <mesh position={[ROOM.x0, ROOM.h / 2, (ROOM.zBack + ROOM.zFront) / 2]} rotation={[0, Math.PI / 2, 0]} material={m.wall} receiveShadow><planeGeometry args={[D, ROOM.h]} /></mesh>
      <mesh position={[ROOM.x1, ROOM.h / 2, (ROOM.zBack + ROOM.zFront) / 2]} rotation={[0, -Math.PI / 2, 0]} material={m.wall} receiveShadow><planeGeometry args={[D, ROOM.h]} /></mesh>
      {/* ceiling + beams */}
      <mesh position={[0, ROOM.h, (ROOM.zBack + ROOM.zFront) / 2]} rotation={[Math.PI / 2, 0, 0]} material={m.ceiling}><planeGeometry args={[W, D]} /></mesh>
      {[-2.6, -0.4, 1.9].map((z) => <Box key={z} p={[0, ROOM.h - 0.12, z]} s={[W, 0.22, 0.2]} mat={m.beam} cast={false} ink={false} />)}
      {/* corner posts */}
      <Box p={[ROOM.x0 + 0.1, ROOM.h / 2, ROOM.zBack + 0.1]} s={[0.2, ROOM.h, 0.2]} mat={m.beam} />
      <Box p={[ROOM.x1 - 0.1, ROOM.h / 2, ROOM.zBack + 0.1]} s={[0.2, ROOM.h, 0.2]} mat={m.beam} />
      <Door m={m} open={doorOpen} />
      <Shelf m={m} x={-3.55} />
      <Bench m={m} f={f} />
      {/* decorative wall gear between window and bench */}
      <mesh position={[0.62, 2.55, ROOM.zBack + 0.13]} rotation={[0, 0, f * 0.004]} material={m.brass} castShadow><primitive object={gearBig} attach="geometry" /><Ink /></mesh>
      {/* stool, crates, barrel: mid-ground dressing clustered around the action, path kept clear */}
      <group position={[2.85, 0, -1.25]}>
        <Cyl p={[0, 0.62, 0]} rt={0.2} rb={0.2} h={0.06} mat={m.bench} />
        {[0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2; return <Cyl key={i} p={[Math.cos(a) * 0.13, 0.3, Math.sin(a) * 0.13]} rt={0.02} rb={0.025} h={0.6} mat={m.benchDark} seg={8} r={[Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]} />; })}
      </group>
      <Box p={[-3.45, 0.3, -1.55]} s={[0.62, 0.6, 0.6]} r={[0, 0.25, 0]} mat={m.door} />
      <Box p={[-3.4, 0.78, -1.5]} s={[0.42, 0.36, 0.42]} r={[0, -0.2, 0]} mat={m.bench} />
      <Cyl p={[-3.3, 1.05, -1.5]} rt={0.07} rb={0.08} h={0.18} mat={m.glassA} seg={14} />
      <Cyl p={[3.55, 0.45, -2.9]} rt={0.3} rb={0.34} h={0.9} mat={m.door} />
      <Cyl p={[3.55, 0.92, -2.9]} rt={0.31} rb={0.31} h={0.05} mat={m.iron} />
      <Lamp m={m} f={f} shadowRes={shadowRes} />
      <Dust f={f} />
    </group>
  );
};
