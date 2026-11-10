// short3 EXT: a 1930 American city block at midday -> late afternoon. The 8-storey brick & limestone telephone-company
// office block (real recessed windows with lit rooms + people working inside), rusticated granite base, cornice with
// dentils, entrance with canopy + in-world sign, flagpole; street with streetcar rails, kerbs, paving, cast-iron lamps,
// telephone poles + wires, trees, neighbouring buildings, cleared lot behind; the move: timber cribbing, steel I-beams,
// rollers, screw jacks with bars, flexible service lines; stakes + rope of the new HQ footprint; wrecking-ball crawler
// crane; rising steel frame of the new HQ. Original designs. No text except the in-world sign.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Post } from "../../lib/Post";
import { InkCtx, Ink } from "../../inventor/Workshop";
import { V3, rng, smooth, lerp } from "../../lib/math";
import { SetRig, RenderAfterMount, Toon, TAU } from "../london-bridge/common";
import { Rod, struts, latticePairs } from "../london-bridge/assets";
import { BW, BD, FLOORS, FLOOR_H, BASE_H, BH, SIDEWALK, STREET, FAR_WALK, NEW_HQ, T, bldAt, sunAt } from "./world";
import * as TL from "./timeline";

// ---------------------------------------------------------------- textures (deterministic canvas)
const cnv = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 1, srgb = true) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; draw(g, rng(seed));
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
};
/** running-bond brick, ~ 0.25 x 0.08 m courses; one tile = 1 m x 1 m */
const brickTex = (base: [number, number, number], seed: number) => cnv(512, 512, (g, r) => {
  g.fillStyle = "#b9ab98"; g.fillRect(0, 0, 512, 512);                                         // mortar
  const rows = 12, bh = 512 / rows;
  for (let j = 0; j < rows; j++) { const off = j % 2 ? 64 : 0; for (let i = -1; i < 5; i++) { const x = i * 128 + off;
    const [h, s, l] = base; g.fillStyle = `hsl(${h + (r() - 0.5) * 8},${s + (r() - 0.5) * 12}%,${l + (r() - 0.5) * 12}%)`; g.fillRect(x + 3, j * bh + 3, 122, bh - 5);
    for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,230,200" : "30,15,10"},${0.05 + r() * 0.08})`; g.fillRect(x + 3 + r() * 118, j * bh + 3 + r() * (bh - 8), 3 + r() * 6, 2); } } }
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(20,12,8,0.10)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); // soot
}, seed);
const stoneTex = (l: number, seed: number, joints = true) => cnv(512, 512, (g, r) => {
  g.fillStyle = `hsl(38,14%,${l}%)`; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,250,240" : "40,35,30"},${r() * 0.07})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  if (joints) { g.strokeStyle = "rgba(60,50,40,0.35)"; g.lineWidth = 3; for (let y = 0; y < 512; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); } for (let y = 0; y < 512; y += 128) for (let x = (y / 128) % 2 ? 128 : 0; x < 512; x += 256) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 128); g.stroke(); } }
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "rgba(0,0,0,0.0)"); gr.addColorStop(1, "rgba(40,30,20,0.12)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
}, seed);
const asphaltTex = () => cnv(512, 512, (g, r) => {
  g.fillStyle = "#4b4a48"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) { const v = 50 + r() * 50; g.fillStyle = `rgba(${v},${v},${v - 4},${0.18 + r() * 0.2})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 6; i++) { g.strokeStyle = "rgba(20,20,20,0.35)"; g.lineWidth = 1.5; g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 70; y += (r() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); } // cracks
}, 41);
const pavingTex = () => cnv(512, 512, (g, r) => {
  g.fillStyle = "#77736c"; g.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const l = 56 + r() * 10; g.fillStyle = `hsl(36,6%,${l}%)`; g.fillRect(i * 128 + 3, j * 128 + 3, 122, 122); for (let k = 0; k < 260; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.06})`; g.fillRect(i * 128 + r() * 122, j * 128 + r() * 122, 2, 2); } }
}, 9);
const dirtTex = () => cnv(512, 512, (g, r) => {
  g.fillStyle = "#7d6a52"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 18000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "210,190,160" : "50,38,26"},${r() * 0.14})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3); }
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(150,140,125,${0.3 + r() * 0.4})`; g.beginPath(); g.arc(r() * 512, r() * 512, 2 + r() * 5, 0, TAU); g.fill(); } // gravel
}, 43);
const timberTex = () => cnv(256, 256, (g, r) => {
  g.fillStyle = "#9a7650"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? "70,45,25" : "200,160,110"},${0.15 + r() * 0.25})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * 256; g.moveTo(0, y); g.bezierCurveTo(80, y + (r() - 0.5) * 10, 170, y + (r() - 0.5) * 10, 256, y + (r() - 0.5) * 6); g.stroke(); }
}, 45);
const skyTex = () => cnv(16, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#3d78c8"); gr.addColorStop(0.45, "#7fb0e4"); gr.addColorStop(0.62, "#c9def0"); gr.addColorStop(0.7, "#eee6d6"); gr.addColorStop(1, "#d8cdb8"); g.fillStyle = gr; g.fillRect(0, 0, 16, 512); }, 1);
const signTex = () => cnv(1024, 160, (g) => {
  g.fillStyle = "#1d2a24"; g.fillRect(0, 0, 1024, 160); g.strokeStyle = "#c9a85a"; g.lineWidth = 8; g.strokeRect(10, 10, 1004, 140);
  g.font = "bold 92px Georgia, serif"; g.fillStyle = "#e8cf86"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TELEPHONE CO.", 512, 84);   // in-world sign
}, 3);
const facadeFar = (seed: number, brick: string, lit: number) => cnv(512, 512, (g, r) => {   // neighbour buildings (painted windows)
  g.fillStyle = brick; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,240,220" : "20,10,6"},${0.04 + r() * 0.06})`; g.fillRect(r() * 512, r() * 512, 6 + r() * 8, 3); }
  for (let fl = 0; fl < 4; fl++) { g.fillStyle = "rgba(240,228,205,0.5)"; g.fillRect(0, fl * 128 + 118, 512, 6);
    for (let k = 0; k < 4; k++) { const x = 28 + k * 124, y = fl * 128 + 26; g.fillStyle = "#e3d8c2"; g.fillRect(x - 6, y - 8, 76, 92); const on = r() < lit;
      g.fillStyle = on ? `hsl(${200 + r() * 20},${18 + r() * 10}%,${46 + r() * 12}%)` : "#36404c"; g.fillRect(x, y, 64, 78); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x + 4, y + 4, 20, 34);
      g.fillStyle = "#e3d8c2"; g.fillRect(x + 30, y, 4, 78); g.fillRect(x, y + 36, 64, 4); } }
}, seed);

const useMats = () => useMemo(() => {
  const tile = (t: THREE.Texture, rx: number, ry: number) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
  const brick = brickTex([14, 46, 36], 61), stone = stoneTex(76, 62), granite = stoneTex(52, 63);
  return {
    tile, brick, stone, granite,
    brickM: new THREE.MeshStandardMaterial({ map: brick, roughness: 0.92 }),
    stoneM: new THREE.MeshStandardMaterial({ map: stone, roughness: 0.85 }),
    trim: new THREE.MeshStandardMaterial({ color: "#d9cfbb", roughness: 0.82 }),
    graniteM: new THREE.MeshStandardMaterial({ map: granite, roughness: 0.8 }),
    room: new THREE.MeshStandardMaterial({ color: "#5c4a38", roughness: 0.95 }),
    roomWall: new THREE.MeshStandardMaterial({ color: "#c9b48e", roughness: 0.9 }),
    ceilLight: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.7, 1.3) }),
    sash: new THREE.MeshStandardMaterial({ color: "#2f3a33", roughness: 0.6 }),
    glassRefl: new THREE.MeshStandardMaterial({ color: "#a9c4d8", roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.16, depthWrite: false }),
    asphalt: new THREE.MeshStandardMaterial({ map: tile(asphaltTex(), 10, 3), roughness: 0.95 }),
    roof: new THREE.MeshStandardMaterial({ map: tile(asphaltTex(), 2, 2), color: "#7a6f66", roughness: 1 }),
    paving: new THREE.MeshStandardMaterial({ map: pavingTex(), roughness: 0.9 }),
    curb: new THREE.MeshStandardMaterial({ map: stoneTex(64, 64), roughness: 0.85 }),
    dirt: new THREE.MeshStandardMaterial({ map: tile(dirtTex(), 6, 6), roughness: 1 }),
    rail: new THREE.MeshStandardMaterial({ color: "#6e6a66", metalness: 0.7, roughness: 0.35 }),
    iron: new THREE.MeshStandardMaterial({ color: "#1f2224", metalness: 0.5, roughness: 0.5 }),
    steel: new THREE.MeshStandardMaterial({ color: "#52575c", metalness: 0.55, roughness: 0.45 }),
    redSteel: new THREE.MeshStandardMaterial({ color: "#8b3a26", roughness: 0.6, metalness: 0.3 }),
    timber: new THREE.MeshStandardMaterial({ map: timberTex(), roughness: 0.9 }),
    pole: new THREE.MeshStandardMaterial({ color: "#5a4632", roughness: 0.9 }),
    wire: new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.7 }),
    glassLamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.45, 1.1) }),
    bark: new THREE.MeshStandardMaterial({ color: "#5a4634", roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: "#5d7f3e", roughness: 0.9 }),
    leaf2: new THREE.MeshStandardMaterial({ color: "#6f8f45", roughness: 0.9 }),
    hose: new THREE.MeshStandardMaterial({ color: "#2b2b2b", roughness: 0.7 }),
    rope: new THREE.MeshStandardMaterial({ color: "#d8c79a", roughness: 0.9 }),
    stake: new THREE.MeshStandardMaterial({ color: "#c8a46c", roughness: 0.9 }),
    flag: new THREE.MeshStandardMaterial({ color: "#b8302a", roughness: 0.8, side: THREE.DoubleSide }),
    canopy: new THREE.MeshStandardMaterial({ color: "#2e4a3e", roughness: 0.7 }),
    sign: new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.6, emissive: new THREE.Color("#3a3220"), emissiveIntensity: 0.4 }),
    door: new THREE.MeshStandardMaterial({ color: "#3d2a1c", roughness: 0.6 }),
    brass: new THREE.MeshStandardMaterial({ color: "#b8913f", metalness: 0.8, roughness: 0.35 }),
    crane: new THREE.MeshStandardMaterial({ color: "#c9952e", roughness: 0.55, metalness: 0.2 }),
    craneDark: new THREE.MeshStandardMaterial({ color: "#3b3a36", roughness: 0.6, metalness: 0.3 }),
    ball: new THREE.MeshStandardMaterial({ color: "#2a2a2a", metalness: 0.6, roughness: 0.4 }),
    paper: new THREE.MeshStandardMaterial({ color: "#e8dcc0", roughness: 0.9 }),
    sky: new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide, fog: false, depthWrite: false }),
    far: [facadeFar(31, "#7a4f3e", 0.4), facadeFar(32, "#8e7a63", 0.3), facadeFar(33, "#5e4a43", 0.5), facadeFar(34, "#9a8f7c", 0.3)].map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 })),
  };
}, []);
type Mats = ReturnType<typeof useMats>;

// ---------------------------------------------------------------- the office block (local coords: centre of footprint, y=0 at grade, front = +z)
const BAYS = 7, BAYW = BW / BAYS, WIN_W = 1.55, WIN_H = 2.45, SILL = 0.6;
export const windowLocal = (floor: number, bay: number): V3 => [-BW / 2 + BAYW * (bay + 0.5), BASE_H + floor * FLOOR_H + 0.9, BD / 2]; // sill centre on the front face
const OfficeBlock: React.FC<{ m: Mats; f: number; lift: number }> = ({ m, f, lift }) => {
  const parts = useMemo(() => {
    const brickF = new THREE.MeshStandardMaterial({ map: m.tile(m.brick, BW, 1), roughness: 0.92 }), brickSide = new THREE.MeshStandardMaterial({ map: m.tile(m.brick, BD, FLOORS * FLOOR_H), roughness: 0.92 }), brickBack = new THREE.MeshStandardMaterial({ map: m.tile(m.brick, BW, FLOORS * FLOOR_H), roughness: 0.92 });
    const pierM = new THREE.MeshStandardMaterial({ map: m.tile(m.brick, BAYW - WIN_W, WIN_H), roughness: 0.92 });
    const stoneBase = new THREE.MeshStandardMaterial({ map: m.tile(m.stone, BW / 2, 1.2), roughness: 0.85 }), graniteB = new THREE.MeshStandardMaterial({ map: m.tile(m.granite, BW / 2, 0.6), roughness: 0.8 });
    // side/back walls: painted window grid on brick (canvas) so the building reads from every side after it turns
    const sideTex = cnv(1024, 1024, (g, r) => { const img = m.brick.image as HTMLCanvasElement; for (let y = 0; y < 1024; y += 128) for (let x = 0; x < 1024; x += 128) g.drawImage(img, x, y, 128, 128);
      for (let fl = 0; fl < 8; fl++) for (let k = 0; k < 6; k++) { const x = 40 + k * 164, y = 1024 - (fl + 1) * 124 + 22; g.fillStyle = "#d9cfbb"; g.fillRect(x - 8, y - 6, 92, 92); const on = r() < 0.7;
        g.fillStyle = on ? `hsl(${36 + r() * 10},${55 + r() * 20}%,${54 + r() * 12}%)` : "#2b333d"; g.fillRect(x, y, 76, 80); g.fillStyle = "#2f3a33"; g.fillRect(x + 36, y, 4, 80); g.fillRect(x, y + 38, 76, 4); } }, 66);
    const sideM = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.92 });
    return { brickF, brickSide, brickBack, pierM, stoneBase, graniteB, sideM };
  }, [m]);
  const zF = BD / 2;
  const floorsY = Array.from({ length: FLOORS }, (_, i) => BASE_H + i * FLOOR_H);
  return (
    <group position={[0, lift, 0]}>
      {/* granite plinth + rusticated limestone ground storey */}
      <mesh position={[0, BASE_H / 2, 0]} material={parts.graniteB} castShadow receiveShadow><boxGeometry args={[BW + 0.3, BASE_H, BD + 0.3]} /><Ink k={0.8} /></mesh>
      {/* side + back walls (painted windows), front built from real piers/spandrels below */}
      <mesh position={[0, BASE_H + (FLOORS * FLOOR_H) / 2, -1.4]} material={[parts.sideM, parts.sideM, parts.brickBack, parts.brickBack, parts.brickBack, parts.sideM]} castShadow receiveShadow><boxGeometry args={[BW, FLOORS * FLOOR_H, BD - 2.8]} /><Ink k={1.0} /></mesh>
      {/* side walls of the front room strip (so the rooms are closed boxes) */}
      {[-1, 1].map((sx) => <mesh key={sx} position={[sx * (BW / 2 - 0.05), BASE_H + (FLOORS * FLOOR_H) / 2, zF - 1.4]} material={parts.sideM} castShadow><boxGeometry args={[0.1, FLOORS * FLOOR_H, 2.8]} /></mesh>)}
      {/* interior volume seen through the front windows: floor slabs, warm back wall, ceiling lights */}
      <mesh position={[0, BASE_H + (FLOORS * FLOOR_H) / 2, zF - 2.6]} material={m.roomWall}><boxGeometry args={[BW - 0.6, FLOORS * FLOOR_H, 0.2]} /></mesh>
      {floorsY.map((y, i) => <group key={i}>
        <mesh position={[0, y + 0.05, zF - 1.3]} material={m.room} receiveShadow><boxGeometry args={[BW - 0.6, 0.1, 2.6]} /></mesh>
        <mesh position={[0, y + FLOOR_H - 0.1, zF - 1.3]} material={m.room}><boxGeometry args={[BW - 0.6, 0.2, 2.6]} /></mesh>
        {Array.from({ length: BAYS }, (_, b) => <mesh key={b} position={[-BW / 2 + BAYW * (b + 0.5), y + FLOOR_H - 0.22, zF - 1.6]} material={m.ceilLight}><boxGeometry args={[0.9, 0.05, 0.25]} /></mesh>)}
        {/* desks + cabinets inside each bay (read through the glass) */}
        {Array.from({ length: BAYS }, (_, b) => <group key={`d${b}`} position={[-BW / 2 + BAYW * (b + 0.5), y, zF - 1.9]}>
          <mesh position={[0.35 * ((b % 2) * 2 - 1), 0.42, 0]} material={m.door}><boxGeometry args={[1.1, 0.06, 0.6]} /></mesh>
          <mesh position={[-0.9 * ((b % 2) * 2 - 1), 0.65, -0.35]} material={m.steel}><boxGeometry args={[0.45, 1.3, 0.45]} /></mesh>
        </group>)}
      </group>)}
      {/* front facade: spandrels + piers around real window openings, stone sills/lintels, sashes */}
      {floorsY.map((y, i) => <group key={`f${i}`}>
        <mesh position={[0, y + SILL / 2, zF + 0.1]} material={parts.brickF} castShadow receiveShadow><boxGeometry args={[BW, SILL, 0.4]} /><Ink k={0.9} /></mesh>
        <mesh position={[0, y + SILL + WIN_H + (FLOOR_H - SILL - WIN_H) / 2, zF + 0.1]} material={parts.brickF} castShadow receiveShadow><boxGeometry args={[BW, FLOOR_H - SILL - WIN_H, 0.4]} /><Ink k={0.9} /></mesh>
        {Array.from({ length: BAYS + 1 }, (_, k) => <mesh key={k} position={[-BW / 2 + k * BAYW + (k === 0 ? (BAYW - WIN_W) / 4 : k === BAYS ? -(BAYW - WIN_W) / 4 : 0), y + SILL + WIN_H / 2, zF + 0.1]} material={parts.pierM} castShadow receiveShadow><boxGeometry args={[k === 0 || k === BAYS ? (BAYW - WIN_W) / 2 : BAYW - WIN_W, WIN_H, 0.4]} /><Ink k={0.8} /></mesh>)}
        {Array.from({ length: BAYS }, (_, b) => { const x = -BW / 2 + BAYW * (b + 0.5); return <group key={`w${b}`} position={[x, y + SILL, zF + 0.1]}>
          <mesh position={[0, -0.05, 0.12]} material={m.trim} castShadow><boxGeometry args={[WIN_W + 0.25, 0.12, 0.4]} /><Ink k={0.6} /></mesh>                {/* sill */}
          <mesh position={[0, WIN_H + 0.12, 0.08]} material={m.trim} castShadow><boxGeometry args={[WIN_W + 0.35, 0.24, 0.42]} /><Ink k={0.6} /></mesh>        {/* lintel */}
          <mesh position={[0, WIN_H / 2, -0.12]} material={m.sash}><boxGeometry args={[0.06, WIN_H, 0.06]} /></mesh>
          <mesh position={[0, WIN_H * 0.55, -0.12]} material={m.sash}><boxGeometry args={[WIN_W, 0.07, 0.06]} /></mesh>
          {[-1, 1].map((s) => <mesh key={s} position={[s * WIN_W / 2, WIN_H / 2, -0.12]} material={m.sash}><boxGeometry args={[0.07, WIN_H, 0.07]} /></mesh>)}
          <mesh position={[0, WIN_H / 2, -0.14]} material={m.glassRefl}><planeGeometry args={[WIN_W, WIN_H]} /></mesh>
        </group>; })}
      </group>)}
      {/* ground storey: rusticated stone band, entrance with canopy + sign, brass lamps */}
      <mesh position={[0, BASE_H + 0.45, zF + 0.32]} material={parts.stoneBase} castShadow><boxGeometry args={[BW + 0.2, 0.9, 0.2]} /><Ink k={0.7} /></mesh>
      <mesh position={[0, BASE_H + 1.7, zF + 1.3]} material={m.canopy} castShadow><boxGeometry args={[4.6, 0.16, 2.2]} /><Ink k={0.8} /></mesh>
      {[-2.1, 2.1].map((x) => <mesh key={x} position={[x, BASE_H + 0.85, zF + 2.3]} material={m.brass}><cylinderGeometry args={[0.035, 0.035, 1.7, 8]} /></mesh>)}
      <mesh position={[0, BASE_H + 2.35, zF + 0.34]} material={m.sign}><boxGeometry args={[4.4, 0.69, 0.08]} /></mesh>
      {/* entrance: double doors in a stone surround */}
      <mesh position={[0, 0.95, zF + 0.32]} material={m.trim} castShadow><boxGeometry args={[2.9, 1.9, 0.16]} /><Ink k={0.6} /></mesh>
      {[-0.62, 0.62].map((x) => <group key={x}><mesh position={[x, 0.9, zF + 0.42]} material={m.door}><boxGeometry args={[1.1, 1.75, 0.06]} /><Ink k={0.5} /></mesh>
        <mesh position={[x, 1.2, zF + 0.46]} material={m.glassRefl}><planeGeometry args={[0.7, 0.8]} /></mesh>
        <mesh position={[x * 0.25, 0.95, zF + 0.47]} material={m.brass}><boxGeometry args={[0.04, 0.3, 0.04]} /></mesh></group>)}
      {/* shop windows either side of the entrance */}
      {[-8.5, -4.6, 4.6, 8.5].map((x) => <group key={x} position={[x, 0, zF + 0.32]}>
        <mesh position={[0, 0.98, 0]} material={m.trim} castShadow><boxGeometry args={[2.6, 1.3, 0.12]} /><Ink k={0.5} /></mesh>
        <mesh position={[0, 0.98, 0.07]} material={m.sash}><boxGeometry args={[2.3, 1.05, 0.04]} /></mesh>
        <mesh position={[0, 0.98, 0.1]} material={m.glassRefl}><planeGeometry args={[2.2, 0.98]} /></mesh>
        <mesh position={[0, 1.02, 0.095]} material={m.ceilLight}><planeGeometry args={[1.9, 0.1]} /></mesh>
      </group>)}
      <mesh position={[0, BASE_H + 0.0, zF + 0.6]} material={parts.graniteB}><boxGeometry args={[3.2, 0.3, 1.2]} /></mesh>
      {/* corner quoins */}
      {[-1, 1].flatMap((s) => Array.from({ length: 16 }, (_, k) => <mesh key={`${s}${k}`} position={[s * (BW / 2 - 0.25), BASE_H + 0.9 + k * 1.75 + ((k % 2) * 0.2), zF + 0.33]} material={m.trim} castShadow><boxGeometry args={[k % 2 ? 0.7 : 1.0, 0.8, 0.12]} /></mesh>))}
      {/* cornice + dentils + parapet */}
      <mesh position={[0, BH + 0.35, 0.2]} material={m.trim} castShadow receiveShadow><boxGeometry args={[BW + 1.4, 0.7, BD + 1.2]} /><Ink k={1.0} /></mesh>
      <mesh position={[0, BH - 0.05, zF + 0.55]} material={m.trim}><boxGeometry args={[BW + 0.9, 0.18, 0.5]} /></mesh>
      {Array.from({ length: 44 }, (_, k) => <mesh key={`dn${k}`} position={[-BW / 2 - 0.35 + k * ((BW + 0.7) / 43), BH - 0.25, zF + 0.62]} material={m.trim}><boxGeometry args={[0.18, 0.22, 0.25]} /></mesh>)}
      <mesh position={[0, BH + 1.05, 0]} material={parts.brickF} castShadow><boxGeometry args={[BW + 0.4, 0.8, BD + 0.4]} /><Ink k={0.9} /></mesh>
      <mesh position={[0, BH + 1.5, 0]} material={m.trim}><boxGeometry args={[BW + 0.6, 0.12, BD + 0.6]} /></mesh>
      {/* rooftop: water tank on legs + elevator house + flagpole with a waving flag */}
      <group position={[-6, BH + 1.5, -3]}>
        {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b], k) => <mesh key={k} position={[a * 1.2, 1.4, b * 1.2]} material={m.iron}><boxGeometry args={[0.15, 2.8, 0.15]} /></mesh>)}
        <mesh position={[0, 4.0, 0]} material={m.timber} castShadow><cylinderGeometry args={[1.8, 1.8, 2.6, 20]} /><Ink k={0.8} /></mesh>
        <mesh position={[0, 5.7, 0]} material={m.iron} castShadow><coneGeometry args={[1.95, 0.9, 20]} /></mesh>
      </group>
      <mesh position={[6, BH + 2.9, -4]} material={parts.brickBack} castShadow><boxGeometry args={[4, 2.8, 3.4]} /><Ink k={0.8} /></mesh>
      <group position={[0, BH + 1.6, zF - 0.6]}>
        <mesh position={[0, 3.2, 0]} material={m.trim}><cylinderGeometry args={[0.05, 0.08, 6.4, 8]} /></mesh>
        <mesh position={[0, 6.45, 0]} material={m.brass}><sphereGeometry args={[0.12, 10, 8]} /></mesh>
        <Flag f={f} m={m} />
      </group>
    </group>
  );
};
const Flag: React.FC<{ f: number; m: Mats }> = ({ f, m }) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(2.0, 1.2, 16, 6), []);
  const p = geo.attributes.position as THREE.BufferAttribute, base = useMemo(() => Float32Array.from(p.array as Float32Array), [p]);
  for (let i = 0; i < p.count; i++) { const x = base[i * 3] + 1.0, y = base[i * 3 + 1]; p.setXYZ(i, x, y, Math.sin(x * 2.4 - f * 0.22) * 0.12 * x + Math.sin(y * 3 + f * 0.13) * 0.03); }
  p.needsUpdate = true; geo.computeVertexNormals();
  return <mesh geometry={geo} material={m.flag} position={[0, 5.6, 0]} castShadow />;
};

// ---------------------------------------------------------------- the moving equipment (local to the building)
/** timber cribbing, steel I-beams, rollers, screw jacks, service lines. `build` 0..1 = how much the crew has placed. */
const MoveRig: React.FC<{ m: Mats; f: number; build: number; rollAngle: number }> = ({ m, f, build, rollAngle }) => {
  const cribs = useMemo(() => { const r = rng(7), out: { p: V3; ry: number; n: number }[] = []; for (let i = 0; i < 12; i++) out.push({ p: [-BW / 2 + 1 + i * ((BW - 2) / 11), 0, BD / 2 + 0.9 + r() * 0.2], ry: (r() - 0.5) * 0.08, n: 3 + Math.floor(r() * 2) }); return out; }, []);
  const shown = Math.floor(build * cribs.length + 0.001);
  return (
    <group>
      {/* steel I-beams running under the base (visible ends) */}
      {build > 0.35 && Array.from({ length: 6 }, (_, k) => <group key={k} position={[-BW / 2 + 2 + k * ((BW - 4) / 5), 0.42, 0]}>
        <mesh material={m.redSteel} castShadow><boxGeometry args={[0.35, 0.06, BD + 1.6]} /></mesh>
        <mesh position={[0, -0.2, 0]} material={m.redSteel} castShadow><boxGeometry args={[0.35, 0.06, BD + 1.6]} /></mesh>
        <mesh position={[0, -0.1, 0]} material={m.redSteel}><boxGeometry args={[0.05, 0.22, BD + 1.6]} /><Ink k={0.5} /></mesh>
      </group>)}
      {/* rollers (rotate with the travelled distance) */}
      {build > 0.55 && Array.from({ length: 10 }, (_, k) => <mesh key={`r${k}`} position={[-BW / 2 + 1.5 + k * ((BW - 3) / 9), 0.12, BD / 2 + 0.55]} rotation={[rollAngle, 0, Math.PI / 2]} material={m.steel} castShadow><cylinderGeometry args={[0.12, 0.12, 1.0, 14]} /><Ink k={0.5} /></mesh>)}
      {/* timber cribs (crossed layers) placed one by one */}
      {cribs.slice(0, shown).map((c, i) => <group key={`c${i}`} position={c.p} rotation={[0, c.ry, 0]}>
        {Array.from({ length: c.n }, (_, l) => <group key={l} position={[0, 0.1 + l * 0.2, 0]} rotation={[0, l % 2 ? Math.PI / 2 : 0, 0]}>
          {[-0.3, 0.3].map((o) => <mesh key={o} position={[o, 0, 0]} material={m.timber} castShadow receiveShadow><boxGeometry args={[0.2, 0.18, 1.1]} /><Ink k={0.5} /></mesh>)}
        </group>)}
      </group>)}
      {/* screw jacks with long bars, braced against the cribbing at the front edge */}
      {build > 0.8 && Array.from({ length: 6 }, (_, k) => { const x = -BW / 2 + 2.5 + k * ((BW - 5) / 5), turn = f * 0.06 + k * 1.3;
        return <group key={`j${k}`} position={[x, 0, BD / 2 + 2.2]}>
          <mesh position={[0, 0.25, 0]} material={m.iron} castShadow><cylinderGeometry args={[0.18, 0.24, 0.5, 12]} /><Ink k={0.6} /></mesh>
          <mesh position={[0, 0.25, -0.75]} rotation={[Math.PI / 2, 0, 0]} material={m.steel}><cylinderGeometry args={[0.06, 0.06, 1.3, 10]} /></mesh>
          <group position={[0, 0.25, 0]} rotation={[0, TL.jackTurn(k, f) + turn * 0, 0]}><mesh rotation={[0, 0, Math.PI / 2]} material={m.iron} castShadow><cylinderGeometry args={[0.03, 0.03, 2.2, 8]} /></mesh></group>
        </group>; })}
      {/* flexible service lines (water, gas, phone cables) snaking from the base to the street mains */}
      {build > 0.9 && [[-8, 0.10, 0.09], [-5, 0.13, 0.07], [7, 0.11, 0.06]].map(([x, r, s], k) => <ServiceLine key={k} x={x} r={r} sag={s} m={m} />)}
    </group>
  );
};
const ServiceLine: React.FC<{ x: number; r: number; sag: number; m: Mats }> = ({ x, r, m }) => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.9, BD / 2 + 0.2), new THREE.Vector3(x + 0.6, 0.2, BD / 2 + 1.5), new THREE.Vector3(x + 0.2, 0.06, BD / 2 + 3.2), new THREE.Vector3(x - 0.5, 0.06, BD / 2 + 4.6)]), 32, r, 8), [x, r]);
  return <mesh geometry={geo} material={m.hose} castShadow><Ink k={0.5} /></mesh>;
};

// ---------------------------------------------------------------- street furniture
const Lamp: React.FC<{ p: V3; m: Mats }> = ({ p, m }) => (
  <group position={p}>
    <mesh position={[0, 0.3, 0]} material={m.iron} castShadow><cylinderGeometry args={[0.16, 0.22, 0.6, 10]} /><Ink k={0.7} /></mesh>
    <mesh position={[0, 2.2, 0]} material={m.iron} castShadow><cylinderGeometry args={[0.055, 0.08, 3.4, 12]} /><Ink k={0.6} /></mesh>
    {[0, 1, 2].map((k) => <mesh key={k} position={[0, 1.0 + k * 0.8, 0]} material={m.iron}><torusGeometry args={[0.08, 0.016, 6, 12]} /></mesh>)}
    <mesh position={[0, 4.15, 0]} material={m.glassLamp}><sphereGeometry args={[0.24, 14, 10]} /></mesh>
    <mesh position={[0, 4.45, 0]} material={m.iron} castShadow><coneGeometry args={[0.2, 0.22, 10]} /></mesh>
  </group>
);
const PhonePole: React.FC<{ p: V3; m: Mats }> = ({ p, m }) => (
  <group position={p}>
    <mesh position={[0, 4.5, 0]} material={m.pole} castShadow><cylinderGeometry args={[0.13, 0.17, 9, 10]} /><Ink k={0.7} /></mesh>
    {[8.2, 7.4].map((y) => <group key={y} position={[0, y, 0]}>
      <mesh material={m.pole} castShadow><boxGeometry args={[0.12, 0.12, 2.4]} /><Ink k={0.5} /></mesh>
      {[-1.05, -0.6, -0.2, 0.2, 0.6, 1.05].map((z) => <mesh key={z} position={[0, 0.12, z]} material={m.trim}><cylinderGeometry args={[0.03, 0.04, 0.12, 6]} /></mesh>)}
    </group>)}
  </group>
);
const Tree: React.FC<{ p: V3; s: number; m: Mats; f: number; seed: number }> = ({ p, s, m, f, seed }) => {
  const sway = Math.sin(f * 0.045 + seed) * 0.03;
  return (<group position={p} scale={s}>
    <mesh position={[0, 1.6, 0]} material={m.bark} castShadow><cylinderGeometry args={[0.13, 0.2, 3.2, 8]} /><Ink k={0.7} /></mesh>
    <group position={[0, 3.2, 0]} rotation={[sway, 0, sway * 0.7]}>
      {[[0, 1.0, 0, 1.4, 0], [0.8, 0.6, 0.3, 1.0, 1], [-0.7, 0.7, -0.2, 1.05, 1], [0.2, 1.7, -0.3, 0.9, 0], [-0.3, 0.4, 0.7, 0.85, 1]].map(([x, y, z, r, k], i) => <mesh key={i} position={[x, y, z]} material={k ? m.leaf2 : m.leaf} castShadow><icosahedronGeometry args={[r, 1]} /><Ink k={0.8} /></mesh>)}
    </group>
  </group>);
};
/** seeded rooftop clutter per neighbour building: water tank, chimneys, a skylight / stair house */
const roofBits = (i: number, s: V3): { t: "tank" | "chimney" | "sky"; p: V3 }[] => { const r = rng(400 + i), top = s[1] / 2, out: { t: "tank" | "chimney" | "sky"; p: V3 }[] = [];
  const at = (): V3 => [(r() - 0.5) * (s[0] - 3), top, (r() - 0.5) * (s[2] - 3)];
  if (r() < 0.5) out.push({ t: "tank", p: at() }); out.push({ t: "sky", p: at() }); for (let k = 0, n = 1 + Math.floor(r() * 3); k < n; k++) out.push({ t: "chimney", p: at() }); return out; };
const Neighbours: React.FC<{ m: Mats }> = ({ m }) => {
  const B = useMemo(() => { const r = rng(91), list: { p: V3; s: V3; mi: number }[] = [];
    for (let x = -70; x < 80;) { const w = 8 + r() * 10, h = 12 + r() * 18, d = 12; list.push({ p: [x + w / 2, h / 2, FAR_WALK[1] + 0.5 + d / 2], s: [w, h, d], mi: Math.floor(r() * 4) }); x += w + 0.3; }   // across the street
    for (let x = BW / 2 + 9; x < 80;) { const w = 9 + r() * 8, h = 10 + r() * 14, d = 16; list.push({ p: [x + w / 2, h / 2, 0], s: [w, h, d], mi: Math.floor(r() * 4) }); x += w + 0.3; }      // same side, right of the lot
    for (let x = -90; x < 80; x += 14) { const h = 14 + r() * 30; list.push({ p: [x, h / 2, -70 - r() * 30], s: [12, h, 12], mi: Math.floor(r() * 4) }); }                           // skyline behind
    return list; }, []);
  return <group>{B.map((b, i) => { const mat = m.far[b.mi]; return <group key={i} position={b.p}>
    <mesh material={mat} castShadow receiveShadow><boxGeometry args={b.s} /><Ink k={0.9} /></mesh>
    {/* tar roof (not a flat cream lid: seen from the crane-up / aerial) + stone coping parapet + rooftop clutter */}
    <mesh position={[0, b.s[1] / 2 + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.roof} receiveShadow><planeGeometry args={[b.s[0] - 0.1, b.s[2] - 0.1]} /></mesh>
    {[[0, b.s[2] / 2, b.s[0] + 0.3, 0.3], [0, -b.s[2] / 2, b.s[0] + 0.3, 0.3], [b.s[0] / 2, 0, 0.3, b.s[2]], [-b.s[0] / 2, 0, 0.3, b.s[2]]].map(([x, z, w, d], k) =>
      <mesh key={k} position={[x, b.s[1] / 2 + 0.45, z]} material={m.trim} castShadow><boxGeometry args={[w, 0.9, d]} /><Ink k={0.5} /></mesh>)}
    {roofBits(i, b.s).map((q, k) => q.t === "tank"
      ? <group key={k} position={q.p}><mesh position={[0, 1.6, 0]} material={m.timber} castShadow><cylinderGeometry args={[1.1, 1.1, 2.0, 14]} /><Ink k={0.6} /></mesh>
          <mesh position={[0, 2.85, 0]} material={m.craneDark} castShadow><coneGeometry args={[1.25, 0.6, 14]} /></mesh>
          {[[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].map(([lx, lz], j) => <mesh key={j} position={[lx, 0.3, lz]} material={m.iron}><boxGeometry args={[0.1, 0.6, 0.1]} /></mesh>)}</group>
      : q.t === "chimney" ? <mesh key={k} position={[q.p[0], q.p[1] + 0.9, q.p[2]]} material={mat} castShadow><boxGeometry args={[0.9, 1.8, 0.9]} /><Ink k={0.6} /></mesh>
      : <group key={k} position={q.p}><mesh position={[0, 0.5, 0]} material={m.trim} castShadow><boxGeometry args={[2.2, 1.0, 1.6]} /><Ink k={0.6} /></mesh>
          <mesh position={[0, 1.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.glassRefl}><planeGeometry args={[1.9, 1.3]} /></mesh></group>)}
  </group>; })}</group>;
};

// ---------------------------------------------------------------- wrecking-ball crawler crane (original design)
const WreckCrane: React.FC<{ m: Mats; x: number; swing: number; f: number }> = ({ m, x, swing, f }) => {
  const boom = useMemo(() => struts(latticePairs(15, 0.9, 0.9, 14, 0.5), 0.045, m.crane), [m]);
  const ang = 0.95, tip: V3 = [Math.cos(ang) * 15, 2.6 + Math.sin(ang) * 15, 0];
  const L = 9.5, bx = tip[0] + Math.sin(swing) * L, by = tip[1] - Math.cos(swing) * L;
  return (<group position={[x, 0, (STREET[0] + STREET[1]) / 2]} rotation={[0, Math.PI, 0]}>
    {[-1, 1].map((s) => <group key={s} position={[0, 0.55, s * 1.25]}>
      <mesh material={m.craneDark} castShadow><boxGeometry args={[4.6, 1.0, 0.7]} /><Ink k={0.8} /></mesh>
      {Array.from({ length: 22 }, (_, k) => <mesh key={k} position={[-2.25 + ((k * 0.42 + x * 0.6) % 4.5 + 4.5) % 4.5, 0.52, 0]} material={m.iron}><boxGeometry args={[0.16, 0.06, 0.74]} /></mesh>)}
    </group>)}
    <mesh position={[0.2, 1.8, 0]} material={m.crane} castShadow><boxGeometry args={[3.2, 1.6, 2.4]} /><Ink k={0.9} /></mesh>
    <mesh position={[-1.1, 3.0, 0]} material={m.crane} castShadow><boxGeometry args={[1.4, 1.2, 1.8]} /><Ink k={0.8} /></mesh>
    <mesh position={[-1.1, 3.05, 0.91]} material={m.glassRefl}><planeGeometry args={[1.0, 0.6]} /></mesh>
    <mesh position={[1.3, 3.2, 0.6]} material={m.craneDark}><cylinderGeometry args={[0.12, 0.12, 1.6, 8]} /></mesh>
    <group position={[1.0, 2.6, 0]} rotation={[0, 0, ang]}><primitive object={boom} /></group>
    <Rod a={tip} b={[bx, by, 0]} r={0.025} m={m.iron} shadow={false} />
    <mesh position={[bx, by - 0.55, 0]} material={m.ball} castShadow><sphereGeometry args={[0.6, 20, 14]} /><Ink k={0.7} /></mesh>
  </group>);
};

// ---------------------------------------------------------------- the set
export const ExtSet: React.FC<{ from: number; worldMin?: number }> = ({ from, worldMin }) => {
  const f = useCurrentFrame() + from, wf = Math.max(f, worldMin ?? -1e9);   // wf = world time (a time-dissolve layer can start later than the camera)
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920;
  const c = TL.camExt(f);
  const m = useMats();
  const b = bldAt(wf), rig = TL.rigBuild(wf), lift = rig > 0.5 ? 0.62 : 0;
  const sun = sunAt(wf), sunPos: V3 = [lerp(-30, -70, sun), lerp(70, 34, sun), lerp(55, 30, sun)];
  const people = TL.extPeople(wf, c.pos), win = TL.windowPeople(wf);
  const cr = TL.craneAt(wf), hq = TL.hqRise(wf), stakes = TL.stakesOn(wf);
  const toBld = (lp: V3): V3 => { const cs = Math.cos(b.ry), sn = Math.sin(b.ry); return [b.p[0] + lp[0] * cs + lp[2] * sn, lp[1] + lift, b.p[2] - lp[0] * sn + lp[2] * cs]; };
  const lamps = useMemo(() => [-36, -18, 0, 18, 36].map((x) => [x, 0.16, SIDEWALK[1] - 0.6] as V3), []);
  const poles = useMemo(() => [-45, -15, 15, 45].map((x) => [x, 0.16, SIDEWALK[1] - 0.25] as V3), []);
  const trees = useMemo(() => [-27, -9, 9, 27, 45].map((x, i) => ({ p: [x, 0.16, FAR_WALK[0] + 2.0] as V3, s: 1.0 + (i % 3) * 0.12, seed: i * 1.7 })), []);
  const wires = useMemo(() => { const out: [V3, V3][] = []; for (let i = 0; i < poles.length - 1; i++) for (const z of [-1.05, -0.6, 0.6, 1.05]) for (const y of [8.32, 7.52]) out.push([[poles[i][0], y + 0.16, poles[i][2] + z], [poles[i + 1][0], y + 0.16, poles[i + 1][2] + z]]); return out; }, [poles]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#7fb0e4" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.1, far: 1400 }}>
        <SetRig c={c} bg="#9ec3e6" fog={["#c6d3dc", 60, 420]} env={0.32} />
        <InkCtx.Provider value={2.8 * k}>
          <mesh material={m.sky}><sphereGeometry args={[900, 32, 16]} /></mesh>
          <hemisphereLight args={["#cfe0ff", "#8a7358", 1.05]} />
          <directionalLight position={sunPos} color={new THREE.Color().lerpColors(new THREE.Color("#fff2dc"), new THREE.Color("#ffc68a"), sun)} intensity={2.7} castShadow
            shadow-mapSize={[hi ? 4096 : 2048, hi ? 4096 : 2048]} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} shadow-camera-far={300} shadow-bias={-0.0004} />
          {/* ground: cleared dirt lot (behind/left), sidewalk, kerb, asphalt street with streetcar rails, far sidewalk */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-20, 0, -14]} material={m.dirt} receiveShadow><planeGeometry args={[90, 60]} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, (SIDEWALK[0] + SIDEWALK[1]) / 2 - 1]} material={m.paving} receiveShadow><planeGeometry args={[160, SIDEWALK[1] - SIDEWALK[0] + 2]} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, (STREET[0] + STREET[1]) / 2]} material={m.asphalt} receiveShadow><planeGeometry args={[160, STREET[1] - STREET[0]]} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, (FAR_WALK[0] + FAR_WALK[1]) / 2]} material={m.paving} receiveShadow><planeGeometry args={[160, FAR_WALK[1] - FAR_WALK[0]]} /></mesh>
          {[STREET[0], STREET[1]].map((z) => <mesh key={z} position={[0, 0.08, z]} material={m.curb} castShadow receiveShadow><boxGeometry args={[160, 0.16, 0.3]} /></mesh>)}
          {[-0.72, 0.72].map((o) => <mesh key={o} position={[0, 0.03, (STREET[0] + STREET[1]) / 2 + 1.8 + o]} material={m.rail}><boxGeometry args={[160, 0.04, 0.08]} /></mesh>)}
          <Neighbours m={m} />
          {lamps.map((p, i) => <Lamp key={i} p={p} m={m} />)}
          {poles.map((p, i) => <PhonePole key={`p${i}`} p={p} m={m} />)}
          {wires.map(([a, bb], i) => <Rod key={`w${i}`} a={a} b={[(a[0] + bb[0]) / 2, a[1] - 0.35, a[2]]} r={0.012} m={m.wire} shadow={false} />)}
          {wires.map(([a, bb], i) => <Rod key={`v${i}`} a={[(a[0] + bb[0]) / 2, a[1] - 0.35, a[2]]} b={bb} r={0.012} m={m.wire} shadow={false} />)}
          {trees.map((t, i) => <Tree key={i} p={t.p} s={t.s} m={m} f={f} seed={t.seed} />)}
          {/* the office block + its moving rig, positioned by the move path */}
          <group position={[b.p[0], 0, b.p[2]]} rotation={[0, b.ry, 0]}>
            <OfficeBlock m={m} f={f} lift={lift} />
            {rig > 0 && <MoveRig m={m} f={wf} build={rig} rollAngle={TL.rollerAngle(wf)} />}
          </group>
          {/* window workers (crowd cards inside the lit rooms, behind the sash plane) */}
          {win.map((w, i) => <Toon key={`win${i}`} pose={w.pose} pos={toBld(w.local)} cam={c.pos} h={w.h} hi={hi} halo={0.08} />)}
          {/* footprint of the planned new HQ: stakes + rope at knee height, running straight through the old walls */}
          {stakes > 0 && <group>{TL.stakePoints().map((p, i, a) => { const q = a[(i + 1) % a.length]; const vis = i / a.length < stakes; return vis ? <group key={i}>
            <mesh position={[p[0], 0.45, p[2]]} material={m.stake} castShadow><boxGeometry args={[0.07, 0.9, 0.07]} /><Ink k={0.5} /></mesh>
            <Rod a={[p[0], 0.75, p[2]]} b={[q[0], 0.75, q[2]]} r={0.012} m={m.rope} shadow={false} />
          </group> : null; })}</group>}
          {/* new HQ steel frame rising on the old site */}
          {hq > 0 && <group>{TL.hqColumns().map((p, i) => { const h = Math.max(0.01, hq * 11 - (i % 3) * 1.5); return <group key={i} position={p}>
            <mesh position={[0, h / 2, 0]} material={m.redSteel} castShadow><boxGeometry args={[0.35, h, 0.35]} /><Ink k={0.6} /></mesh>
          </group>; })}
            {hq > 0.6 && [-12, 0, 12].map((x) => <mesh key={x} position={[x * 0.5, 7.6, (NEW_HQ.z0 + NEW_HQ.z1) / 2]} material={m.redSteel} castShadow><boxGeometry args={[0.3, 0.45, NEW_HQ.z1 - NEW_HQ.z0]} /><Ink k={0.6} /></mesh>)}
          </group>}
          {cr.on && <WreckCrane m={m} x={cr.x} swing={cr.swing} f={f} />}
          {/* engineer's trestle with plans */}
          {TL.trestleOn(wf) && <group position={TL.TRESTLE}>
            {[-0.6, 0.6].map((x) => <mesh key={x} position={[x, 0.45, 0]} material={m.timber} castShadow><boxGeometry args={[0.08, 0.9, 0.7]} /></mesh>)}
            <mesh position={[0, 0.92, 0]} material={m.timber} castShadow><boxGeometry args={[1.6, 0.05, 0.8]} /><Ink k={0.6} /></mesh>
            <mesh position={[0, 0.955, 0]} rotation={[-Math.PI / 2, 0, 0]} material={TL.planMat(m.paper)}><planeGeometry args={[1.4, 0.7]} /></mesh>
          </group>}
          {/* wooden gangway to the entrance at the new position */}
          {TL.gangwayOn(wf) && <group position={toBld([0, 0, BD / 2 + 2.3])} rotation={[0, b.ry, 0]}>
            <mesh position={[0, 0.35, 0]} rotation={[0.18, 0, 0]} material={m.timber} castShadow receiveShadow><boxGeometry args={[2.2, 0.12, 4.0]} /><Ink k={0.6} /></mesh>
            {[-1.05, 1.05].map((x) => <mesh key={x} position={[x, 0.95, 0]} rotation={[0.18, 0, 0]} material={m.timber}><boxGeometry args={[0.06, 0.06, 4.0]} /></mesh>)}
          </group>}
          {TL.blueprintAt(wf, c.pos) && (() => { const bp = TL.blueprintAt(wf, c.pos)!; return <mesh position={bp.p} rotation={[0, bp.ry, 0]} material={TL.planMat(m.paper)} castShadow><planeGeometry args={[bp.w, 0.5]} /><Ink k={0.4} /></mesh>; })()}
          {/* people on the ground */}
          {people.map((p, i) => <Toon key={i} pose={p.pose} pos={p.pos} cam={c.pos} h={p.h} hi={hi} light={p.light ?? 0} halo={p.halo ?? 0.12} flip={p.flip} />)}
        </InkCtx.Provider>
        <Post params={{ focusDist: c.focus, focusRange: 6, maxBlur: 0.18, bloom: 0.6, threshold: 1.7, exposure: 1.05, vignette: 0.5, ss: hi ? 1 : 2, contrast: 1.12, saturation: 1.08, lift: 0.012, warmCool: 0.6, ao: 0.6, aoRadius: 0.6 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
export { smooth };
