// London, dusk (film frames 340-984): the old granite bridge over the Thames (same Bridge2 geometry as Arizona, sooted),
// the new concrete bridge rising beside it with scaffold + tower crane, granite embankments with cast-iron lamps,
// plane trees and benches, Victorian terraces and warehouses, a hazy original skyline, barges, gulls, the quay derrick
// and the 1960s cargo ship that takes the numbered blocks. No text anywhere except chalk numbers ON the stones.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { MeshReflectorMaterial } from "@react-three/drei";
import { Post } from "../../lib/Post";
import { InkCtx } from "../../inventor/Workshop";
import { Ink } from "../../inventor/Workshop";
import { Bridge2, BRIDGE_LEN, PIER_X } from "../../desert/Bridge";
import { cameraPx5 } from "../../char/odo5";
import { V3, rng, smooth } from "../../lib/math";
import { SetRig, RenderAfterMount, Toon, cardWorld, TAU } from "./common";
import * as L from "./londonTimeline";

const cnv = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 1) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; draw(g, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
};
const facade = (seed: number, brick: string, lit: number) => cnv(512, 512, (g, r) => {
  g.fillStyle = brick; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,240,220" : "20,10,6"},${0.04 + r() * 0.06})`; g.fillRect(r() * 512, r() * 512, 6 + r() * 8, 3); }
  for (let fl = 0; fl < 4; fl++) {
    g.fillStyle = "rgba(240,228,205,0.55)"; g.fillRect(0, fl * 128 + 118, 512, 6);           // string course
    for (let k = 0; k < 4; k++) {
      const x = 28 + k * 124, y = fl * 128 + 30; const on = r() < lit;
      g.fillStyle = "#e9dfcb"; g.fillRect(x - 6, y - 8, 76, 92);                                 // stone surround
      g.fillStyle = on ? `hsl(${36 + r() * 10},${70 + r() * 20}%,${58 + r() * 14}%)` : "#2a3140"; g.fillRect(x, y, 64, 78);
      g.fillStyle = "#e9dfcb"; g.fillRect(x + 30, y, 4, 78); g.fillRect(x, y + 36, 64, 4);       // sash bars
      if (on) { const gr = g.createRadialGradient(x + 32, y + 40, 4, x + 32, y + 40, 60); gr.addColorStop(0, "rgba(255,200,120,0.35)"); gr.addColorStop(1, "rgba(255,200,120,0)"); g.fillStyle = gr; g.fillRect(x - 30, y - 20, 124, 120); }
    }
  }
}, seed);
const paving = () => cnv(512, 512, (g, r) => {
  g.fillStyle = "#8d8780"; g.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { const l = 48 + r() * 12; g.fillStyle = `hsl(30,6%,${l}%)`; g.fillRect(i * 128 + (j % 2) * 64 + 3, j * 64 + 3, 122, 58); for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(i * 128 + (j % 2) * 64 + r() * 122, j * 64 + r() * 58, 3, 3); } }
}, 9);
const wallTex = () => cnv(512, 512, (g, r) => {
  for (let j = 0; j < 8; j++) { let x = -r() * 80; while (x < 512) { const w = 70 + r() * 70; g.fillStyle = `hsl(${30 + r() * 10},${6 + r() * 6}%,${36 + r() * 12}%)`; g.fillRect(x, j * 64, w, 64); g.fillStyle = "rgba(20,16,12,0.6)"; g.fillRect(x, j * 64, 4, 64); x += w; } g.fillStyle = "rgba(20,16,12,0.6)"; g.fillRect(0, j * 64, 512, 4); }
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.7, "rgba(30,40,30,0.1)"); gr.addColorStop(1, "rgba(30,50,40,0.55)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); // tide line + algae
}, 11);
const duskSky = () => cnv(16, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#1d2a4f"); gr.addColorStop(0.42, "#47507c"); gr.addColorStop(0.62, "#9a7c96"); gr.addColorStop(0.74, "#e8a27a"); gr.addColorStop(0.8, "#f4c38e"); gr.addColorStop(1, "#8f8da0"); g.fillStyle = gr; g.fillRect(0, 0, 16, 512); }, 3);
const blueprintTex = () => cnv(512, 320, (g, r) => {
  g.fillStyle = "#1f4f8f"; g.fillRect(0, 0, 512, 320); g.strokeStyle = "rgba(220,235,255,0.25)"; g.lineWidth = 1;
  for (let x = 0; x < 512; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 320); g.stroke(); } for (let y = 0; y < 320; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.strokeStyle = "rgba(235,245,255,0.95)"; g.lineWidth = 3; g.strokeRect(14, 14, 484, 292);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { if (r() < 0.25) continue; g.strokeRect(60 + i * 64, 50 + j * 56, 46, 38); }           // empty town blocks
  g.lineWidth = 6; g.beginPath(); g.moveTo(30, 270); g.bezierCurveTo(160, 230, 300, 300, 490, 250); g.stroke();                      // future channel (dashed)
  g.setLineDash([10, 8]); g.lineWidth = 2; g.beginPath(); g.arc(420, 90, 30, 0, TAU); g.stroke(); g.setLineDash([]);              // circled empty site
}, 21);
const chalkNumbers = (n: number) => cnv(256, 128, (g, r) => {
  g.fillStyle = "#8f8578"; g.fillRect(0, 0, 256, 128); for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.1})`; g.fillRect(r() * 256, r() * 128, 2, 2); }
  g.font = "bold 64px Georgia, serif"; g.fillStyle = "rgba(250,248,240,0.92)"; g.textAlign = "center"; g.textBaseline = "middle"; g.save(); g.translate(128, 66); g.rotate((r() - 0.5) * 0.12); g.fillText(String(n), 0, 0); g.restore(); // in-world chalk marking on the stone
}, 100 + n);

const Buildings: React.FC = () => {
  const B = useMemo(() => {
    const r = rng(77), mats = [facade(31, "#7a4f3e", 0.45), facade(32, "#8e7a63", 0.35), facade(33, "#5e4a43", 0.55), facade(34, "#9a8f7c", 0.3)].map((t) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 }));
    const roof = new THREE.MeshStandardMaterial({ color: "#3a3d48", roughness: 0.8 }), trim = new THREE.MeshStandardMaterial({ color: "#d8cdb8", roughness: 0.85 });
    const list: { p: V3; s: V3; m: THREE.Material; mansard: boolean }[] = [];
    for (const side of [-1, 1]) for (let z = -110; z < 120; ) {
      const w = 7 + r() * 9, h = 9 + r() * 12, d = 9 + r() * 6, x = side * (BANKX2 + 6 + r() * 3 + d / 2);
      if (!(side < 0 && z > -6 && z < 30 && false)) list.push({ p: [x, L.Y0 + h / 2, z + w / 2], s: [d, h, w], m: mats[Math.floor(r() * 4)], mansard: r() < 0.4 });
      z += w + 0.4;
    }
    for (const b of list) { const t = (b.m as THREE.MeshStandardMaterial).map!; t.repeat.set(1, 1); }
    return { list, roof, trim };
  }, []);
  return (<group>{B.list.map((b, i) => (
    <group key={i} position={b.p}>
      <mesh material={b.m} castShadow receiveShadow><boxGeometry args={b.s} /><Ink k={0.9} /></mesh>
      <mesh position={[0, b.s[1] / 2 + 0.15, 0]} material={B.trim}><boxGeometry args={[b.s[0] + 0.4, 0.3, b.s[2] + 0.4]} /></mesh>
      {b.mansard ? <mesh position={[0, b.s[1] / 2 + 1.3, 0]} material={B.roof} castShadow><cylinderGeometry args={[b.s[2] * 0.36, b.s[2] * 0.55, 2.2, 4, 1]} /><Ink k={0.7} /></mesh> : null}
      {[0, 1].map((k) => <mesh key={k} position={[(k - 0.5) * b.s[0] * 0.5, b.s[1] / 2 + 1.2, (k ? 1 : -1) * b.s[2] * 0.3]} material={B.roof} castShadow><boxGeometry args={[0.7, 1.8, 1.2]} /></mesh>)}
    </group>))}</group>);
};
const BANKX2 = 40; // building line behind the promenade
const Skyline: React.FC = () => {
  const m = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3e4763", roughness: 1 }), []);
  const items = useMemo(() => { const r = rng(5); return Array.from({ length: 34 }, (_, i) => ({ x: -160 + i * 10 + r() * 6, z: -190 - r() * 60, h: 12 + r() * 26, w: 6 + r() * 8, kind: r() < 0.12 ? "dome" : r() < 0.25 ? "spire" : "box" })); }, []);
  return (<group>{items.map((s, i) => (
    <group key={i} position={[s.x, L.Y0, s.z]}>
      <mesh position={[0, s.h / 2, 0]} material={m}><boxGeometry args={[s.w, s.h, s.w]} /></mesh>
      {s.kind === "dome" && <><mesh position={[0, s.h + 3, 0]} material={m}><cylinderGeometry args={[s.w * 0.45, s.w * 0.45, 6, 16]} /></mesh><mesh position={[0, s.h + 6, 0]} material={m}><sphereGeometry args={[s.w * 0.48, 20, 10, 0, TAU, 0, Math.PI / 2]} /></mesh><mesh position={[0, s.h + 11, 0]} material={m}><coneGeometry args={[0.6, 4, 8]} /></mesh></>}
      {s.kind === "spire" && <mesh position={[0, s.h + 9, 0]} material={m}><coneGeometry args={[s.w * 0.35, 18, 8]} /></mesh>}
    </group>))}</group>);
};
const Lamp: React.FC<{ p: V3; iron: THREE.Material; glass: THREE.Material }> = ({ p, iron, glass }) => (
  <group position={p}>
    <mesh position={[0, 0.3, 0]} material={iron} castShadow><cylinderGeometry args={[0.16, 0.22, 0.6, 10]} /><Ink k={0.7} /></mesh>
    <mesh position={[0, 1.9, 0]} material={iron} castShadow><cylinderGeometry args={[0.055, 0.08, 2.8, 12]} /><Ink k={0.6} /></mesh>
    {[0, 1, 2].map((k) => <mesh key={k} position={[0, 1.0 + k * 0.7, 0]} material={iron}><torusGeometry args={[0.08, 0.016, 6, 12]} /></mesh>)}
    <mesh position={[0, 3.55, 0]} material={glass}><cylinderGeometry args={[0.2, 0.15, 0.46, 6]} /></mesh>
    <mesh position={[0, 3.88, 0]} material={iron} castShadow><coneGeometry args={[0.27, 0.26, 6]} /><Ink k={0.6} /></mesh>
  </group>
);
const Tree: React.FC<{ p: V3; s: number; m: { bark: THREE.Material; leaf: THREE.Material } }> = ({ p, s, m }) => (
  <group position={p} scale={s}>
    <mesh position={[0, 1.6, 0]} material={m.bark} castShadow><cylinderGeometry args={[0.16, 0.24, 3.2, 8]} /><Ink k={0.7} /></mesh>
    {[[0, 4.2, 0, 1.7], [0.9, 3.7, 0.3, 1.2], [-0.8, 3.8, -0.2, 1.25], [0.2, 5.0, -0.4, 1.1], [-0.3, 3.4, 0.8, 1.0]].map(([x, y, z, r], k) => <mesh key={k} position={[x, y, z]} material={m.leaf} castShadow><icosahedronGeometry args={[r, 1]} /><Ink k={0.8} /></mesh>)}
  </group>
);
/** 1960s cargo ship (original design): black hull + red boot-top, white bridge house, funnel, masts, derricks, open hold */
export const Ship: React.FC<{ blocks: number }> = ({ blocks }) => {
  const g = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-9, -2.2); s.lineTo(6, -2.2); s.quadraticCurveTo(10.5, -1.2, 11.5, 0); s.quadraticCurveTo(10.5, 1.2, 6, 2.2); s.lineTo(-9, 2.2); s.quadraticCurveTo(-10.2, 1.4, -10.2, 0); s.quadraticCurveTo(-10.2, -1.4, -9, -2.2);
    const hull = new THREE.ExtrudeGeometry(s, { depth: 2.6, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 }); hull.rotateX(-Math.PI / 2); hull.translate(0, -1.2, 0);
    return { hull, black: new THREE.MeshStandardMaterial({ color: "#1d1e22", roughness: 0.6 }), red: new THREE.MeshStandardMaterial({ color: "#9b2a22", roughness: 0.7 }), white: new THREE.MeshStandardMaterial({ color: "#ece6da", roughness: 0.7 }), deck: new THREE.MeshStandardMaterial({ color: "#7d5a3c", roughness: 0.9 }), funnel: new THREE.MeshStandardMaterial({ color: "#c9852e", roughness: 0.6 }), stone: new THREE.MeshStandardMaterial({ color: "#a39684", roughness: 0.9 }), win: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 0.8), toneMapped: false }) };
  }, []);
  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={g.hull} material={g.black} castShadow receiveShadow><Ink k={1.0} /></mesh>
      <mesh position={[0.5, -0.9, 0]} material={g.red}><boxGeometry args={[19.6, 0.5, 4.5]} /></mesh>
      <mesh position={[0.5, 1.42, 0]} material={g.deck} receiveShadow><boxGeometry args={[19.4, 0.06, 4.2]} /></mesh>
      <group position={[-6.5, 1.45, 0]}>
        <mesh position={[0, 1.1, 0]} material={g.white} castShadow><boxGeometry args={[3.6, 2.2, 3.8]} /><Ink k={0.8} /></mesh>
        <mesh position={[0.3, 2.7, 0]} material={g.white} castShadow><boxGeometry args={[2.6, 1.0, 4.2]} /><Ink k={0.8} /></mesh>
        {[-1.2, -0.4, 0.4, 1.2].map((z) => <mesh key={z} position={[1.62, 2.75, z]} material={g.win}><boxGeometry args={[0.04, 0.35, 0.5]} /></mesh>)}
        <mesh position={[-1.2, 3.8, 0]} material={g.funnel} castShadow><cylinderGeometry args={[0.55, 0.7, 2.2, 14]} /><Ink k={0.7} /></mesh>
        <mesh position={[-1.2, 4.9, 0]} material={g.black}><cylinderGeometry args={[0.57, 0.57, 0.3, 14]} /></mesh>
      </group>
      {[[-1.5, 0], [5.0, 0]].map(([x], k) => <group key={k} position={[x, 1.45, 0]}>
        <mesh position={[0, 3, 0]} material={g.black} castShadow><cylinderGeometry args={[0.1, 0.13, 6, 8]} /><Ink k={0.5} /></mesh>
        <mesh position={[1.3, 1.6, 0]} rotation={[0, 0, -1.0]} material={g.black}><cylinderGeometry args={[0.06, 0.08, 3.2, 6]} /></mesh>
        <mesh position={[1.6, 0.35, 0]} material={g.deck} castShadow><boxGeometry args={[2.6, 0.5, 3.2]} /><Ink k={0.6} /></mesh>
      </group>)}
      {/* numbered blocks in the open hold */}
      {Array.from({ length: blocks }, (_, i) => <mesh key={i} position={[2.4 + (i % 4) * 0.9, 1.75 + Math.floor(i / 8) * 0.55, -0.8 + (Math.floor(i / 4) % 2) * 1.6]} material={g.stone} castShadow><boxGeometry args={[0.8, 0.5, 0.6]} /><Ink k={0.5} /></mesh>)}
    </group>
  );
};

export const LondonSet: React.FC<{ from: number }> = ({ from }) => {
  const f = useCurrentFrame() + from;
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920;
  const c = L.camLondon(f, L.halLondonVisible(f) && f < 790 ? [L.halLondonAt(f)[0], L.Y0 + 1.1, L.halLondonAt(f)[2]] : undefined);
  const M = useMemo(() => {
    const pv = paving(); pv.repeat.set(12, 60); const wt = wallTex(); wt.repeat.set(30, 1);
    return {
      pave: new THREE.MeshStandardMaterial({ map: pv, roughness: 0.85 }), wall: new THREE.MeshStandardMaterial({ map: wt, roughness: 0.9 }),
      cope: new THREE.MeshStandardMaterial({ color: "#b4aa9a", roughness: 0.85 }), iron: new THREE.MeshStandardMaterial({ color: "#1e2126", metalness: 0.5, roughness: 0.5 }),
      glass: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.85, 1.1), toneMapped: false }), bark: new THREE.MeshStandardMaterial({ color: "#5d4a3a", roughness: 0.95 }),
      leaf: new THREE.MeshStandardMaterial({ color: "#3f5a35", roughness: 0.9 }), wood: new THREE.MeshStandardMaterial({ color: "#6e4a2e", roughness: 0.85 }),
      concrete: new THREE.MeshStandardMaterial({ color: "#a7a49c", roughness: 0.95 }), scaffold: new THREE.MeshStandardMaterial({ color: "#8a8f96", metalness: 0.6, roughness: 0.45 }),
      crane: new THREE.MeshStandardMaterial({ color: "#d7a123", roughness: 0.6 }), sky: new THREE.MeshBasicMaterial({ map: duskSky(), side: THREE.BackSide, fog: false, depthWrite: false }),
      sun: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.7), fog: false, toneMapped: false }), bp: new THREE.MeshStandardMaterial({ map: blueprintTex(), roughness: 0.8, side: THREE.DoubleSide }),
      paper: new THREE.MeshStandardMaterial({ color: "#efe7d4", roughness: 0.9 }), money: new THREE.MeshStandardMaterial({ color: "#5b8a5a", roughness: 0.8 }),
      stone: new THREE.MeshStandardMaterial({ color: "#a39684", roughness: 0.9 }), barge: new THREE.MeshStandardMaterial({ color: "#3a2a22", roughness: 0.8 }),
      numbered: Array.from({ length: 14 }, (_, i) => new THREE.MeshStandardMaterial({ map: chalkNumbers(1031 + i * 7 + (i % 3) * 113), roughness: 0.9 })),
    };
  }, []);
  const scaffold = useMemo(() => { // new bridge works scaffold: instanced tubes on the concrete piers
    const geo = new THREE.CylinderGeometry(0.05, 0.05, 1, 5), m = new THREE.InstancedMesh(geo, M.scaffold, 900), o = new THREE.Object3D(); let n = 0;
    for (const px of [-20, -6, 8, 22]) for (let lv = 0; lv < 6; lv++) for (let i = 0; i < 6; i++) {
      if (n > 880) break;
      const x = px - 2 + i * 0.8, y = L.RIVER_Y + lv * 1.3;
      o.position.set(x, y + 0.65, -22.5); o.rotation.set(0, 0, 0); o.scale.set(1, 1.3, 1); o.updateMatrix(); m.setMatrixAt(n++, o.matrix);
      o.position.set(x + 0.4, y + 1.3, -22.5); o.rotation.set(0, 0, Math.PI / 2); o.scale.set(1, 0.8, 1); o.updateMatrix(); m.setMatrixAt(n++, o.matrix);
      o.position.set(x, y + 0.65, -27.5); o.rotation.set(0, 0, 0); o.scale.set(1, 1.3, 1); o.updateMatrix(); m.setMatrixAt(n++, o.matrix);
    }
    m.count = n; m.castShadow = true; return m;
  }, [M]);
  const gulls = useMemo(() => { const tri = new THREE.BufferGeometry(); tri.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, 0, 0, 0, 0, 0.12, 0, 0.06, -0.1, 0.5, 0, 0, 0, 0, 0.12, 0, 0.06, -0.1], 3)); tri.computeVertexNormals(); const m = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ color: "#f4f2ee", side: THREE.DoubleSide }), 10); return m; }, []);
  { const o = new THREE.Object3D(); for (let i = 0; i < 10; i++) { const a = f * 0.012 + i * 0.63, r = 14 + i * 2.3; o.position.set(-14 + Math.cos(a) * r, 14 + (i % 4) * 2.5 + Math.sin(f * 0.05 + i) * 0.6, 8 + Math.sin(a) * r * 0.6); o.rotation.set(0, -a, 0); const fl = Math.sin(f * 0.45 + i * 1.7) * 0.6; o.scale.set(1.2, 1 + fl, 1.2); o.updateMatrix(); gulls.setMatrixAt(i, o.matrix); } gulls.instanceMatrix.needsUpdate = true; }

  const h = L.halLondonAt(f), hp = L.halLondonPose(f), bp = L.blueprintAt(f), cr = L.craneAt(f), ship = L.shipAt(f);
  const bpCenter = cardWorld(h, c.pos, [300, 520], 1.55, 0.25);
  const camYaw = Math.atan2(c.pos[0] - h[0], c.pos[2] - h[2]);
  const boomTip: V3 = [L.CRANE[0] + Math.cos(cr.yaw) * 7.5, L.Y0 + 9.6, L.CRANE[2] - Math.sin(cr.yaw) * 7.5];
  const blocksInHold = 9 + (cr.released ? 1 : 0);
  const clerk = L.clerkAt(f), cp = L.clerkPose(f), lecIn = L.lecternIn(f);
  return (
    <AbsoluteFill style={{ backgroundColor: "#1d2a4f" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.1, far: 1400 }}>
        <SetRig c={c} bg="#47507c" fog={["#7d7f9a", 40, 330]} env={0.22} />
        <InkCtx.Provider value={2.8 * k}>
          <mesh material={M.sky}><sphereGeometry args={[900, 32, 16]} /></mesh>
          <mesh position={[-60, 38, -800]} material={M.sun}><sphereGeometry args={[9, 20, 14]} /></mesh>
          <hemisphereLight args={["#aab4e6", "#8a6a4e", 1.15]} />
          <directionalLight position={[40, 30, 60]} color="#9fb0ff" intensity={0.35} />
          <directionalLight position={[-60, 40, -120]} color="#ffb07a" intensity={2.6} castShadow shadow-mapSize={[hi ? 4096 : 2048, hi ? 4096 : 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-camera-far={300} shadow-bias={-0.0004} />
          {/* river + embankments */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, L.RIVER_Y, 0]}><planeGeometry args={[L.BANK_X * 2, 700]} />
            <MeshReflectorMaterial color="#3b5560" roughness={0.92} metalness={0.05} mirror={0.4} blur={[300, 90]} resolution={512} mixBlur={0.9} mixStrength={1.4} mixContrast={1.05} depthScale={0.3} minDepthThreshold={0.4} maxDepthThreshold={1.2} /></mesh>
          {[-1, 1].map((s) => <group key={s}>
            <mesh position={[s * (L.BANK_X + 0.5), L.Y0 / 2 - 1, 0]} material={M.wall} receiveShadow><boxGeometry args={[1, L.Y0 + 2, 700]} /><Ink k={0.8} /></mesh>
            <mesh position={[s * (L.BANK_X + 20), L.Y0 - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.pave} receiveShadow><planeGeometry args={[40, 700]} /></mesh>
            <mesh position={[s * (L.BANK_X + 0.35), L.Y0 + 0.5, 0]} material={M.cope} castShadow receiveShadow><boxGeometry args={[0.5, 1.0, 700]} /><Ink k={0.9} /></mesh>
            {Array.from({ length: 26 }, (_, i) => -90 + i * 7).filter((z) => Math.abs(z) > 6).map((z) => <Lamp key={z} p={[s * (L.BANK_X + 0.35), L.Y0 + 1.0, z]} iron={M.iron} glass={M.glass} />)}
            {Array.from({ length: 20 }, (_, i) => -90 + i * 9.5).filter((z) => Math.abs(z) > 7 && !(s < 0 && z > -2 && z < 75)).map((z, i) => <Tree key={z} p={[s * (L.BANK_X + 7.5), L.Y0, z]} s={0.9 + (i % 3) * 0.12} m={M} />)}
          </group>)}
          <pointLight position={[-L.BANK_X - 0.35, L.Y0 + 4.5, 15]} color="#ffc98a" intensity={10} distance={13} decay={1.6} />
          <pointLight position={[-36, L.Y0 + 4.2, 9]} color="#ffc98a" intensity={8} distance={11} decay={1.6} />
          <pointLight position={[-L.BANK_X - 0.35, L.Y0 + 4.5, 26]} color="#ffc98a" intensity={8} distance={12} decay={1.6} />
          {/* benches */}
          {[[-36.5, 19.5], [-36.5, -8]].map(([x, z], i) => <group key={i} position={[x, L.Y0, z]}><mesh position={[0, 0.45, 0]} material={M.wood} castShadow><boxGeometry args={[0.5, 0.08, 1.8]} /><Ink k={0.6} /></mesh><mesh position={[-0.22, 0.75, 0]} material={M.wood} castShadow><boxGeometry args={[0.06, 0.5, 1.8]} /></mesh>{[-0.75, 0.75].map((dz) => <mesh key={dz} position={[0, 0.22, dz]} material={M.iron}><boxGeometry args={[0.5, 0.44, 0.06]} /></mesh>)}</group>)}
          {/* the old bridge (sooted London granite) */}
          <Bridge2 tint="#c8c3bd" glow={1.1} />
          {/* the new bridge works upstream: concrete piers, partial deck, scaffold, tower crane */}
          {[-20, -6, 8, 22].map((x) => <mesh key={x} position={[x, L.RIVER_Y + 3.5, -25]} material={M.concrete} castShadow receiveShadow><boxGeometry args={[3, 7, 6]} /><Ink k={0.8} /></mesh>)}
          <mesh position={[-13, L.RIVER_Y + 7.4, -25]} material={M.concrete} castShadow><boxGeometry args={[17, 0.8, 6.6]} /><Ink k={0.8} /></mesh>
          <primitive object={scaffold} />
          <group position={[1, L.RIVER_Y, -31]} rotation={[0, f * 0.003, 0]}>
            <mesh position={[0, 14, 0]} material={M.crane} castShadow><boxGeometry args={[1.2, 28, 1.2]} /><Ink k={0.6} /></mesh>
            <mesh position={[6, 27.6, 0]} material={M.crane} castShadow><boxGeometry args={[22, 0.9, 0.9]} /><Ink k={0.6} /></mesh>
            <mesh position={[-4.5, 27, 0]} material={M.concrete}><boxGeometry args={[2.4, 2, 1.6]} /></mesh>
            <mesh position={[13, 21.5, 0]} material={M.iron}><cylinderGeometry args={[0.03, 0.03, 12, 4]} /></mesh>
          </group>
          <Buildings />
          <Skyline />
          {/* barges drifting downstream */}
          {[0, 1].map((i) => { const z = -120 + ((f * 0.05 + i * 90) % 220); return <group key={i} position={[8 + i * 7, L.RIVER_Y + 0.3, z]}><mesh material={M.barge} castShadow><boxGeometry args={[3.2, 0.9, 11]} /><Ink k={0.7} /></mesh><mesh position={[0, 0.6, -1]} material={M.stone}><boxGeometry args={[2.4, 0.5, 6]} /></mesh><mesh position={[0, 1.0, 4.4]} material={M.paper}><boxGeometry args={[1.6, 1.2, 1.6]} /></mesh></group>; })}
          <primitive object={gulls} />
          {/* numbered block stacks under the north abutment (dismantling) + at the quay */}
          {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[-38.6 + (i % 5) * 0.95, L.Y0 + 0.28 + Math.floor(i / 10) * 0.56, 5.6 + (Math.floor(i / 5) % 2) * -0.8]} rotation={[0, 0.03 * (i % 3), 0]} material={[M.stone, M.stone, M.stone, M.stone, M.numbered[i], M.stone]} castShadow receiveShadow><boxGeometry args={[0.85, 0.55, 0.6]} /><Ink k={0.5} /></mesh>)}
          {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[L.STACK[0] + (i % 3) * 0.9, L.Y0 + 0.28 + Math.floor(i / 3) * 0.56, L.STACK[2]]} material={[M.stone, M.stone, M.stone, M.stone, M.numbered[(i + 5) % 14], M.stone]} castShadow><boxGeometry args={[0.85, 0.55, 0.6]} /><Ink k={0.5} /></mesh>)}
          {/* scaffold on the north span (being dismantled) */}
          {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[-26 + i * 1.1, 6.5, 5.0]} material={M.scaffold}><cylinderGeometry args={[0.05, 0.05, 4.6, 5]} /></mesh>)}
          <mesh position={[-21, 8.8, 5.0]} rotation={[0, 0, Math.PI / 2]} material={M.scaffold}><cylinderGeometry args={[0.05, 0.05, 11, 5]} /></mesh>
          {/* quay derrick crane */}
          <group position={L.CRANE}>
            <mesh position={[0, 4.8, 0]} material={M.crane} castShadow><boxGeometry args={[0.6, 9.6, 0.6]} /><Ink k={0.6} /></mesh>
            <group position={[0, 9.4, 0]} rotation={[0, cr.yaw, 0]}><mesh position={[3.75, 0.2, 0]} rotation={[0, 0, 0.05]} material={M.crane} castShadow><boxGeometry args={[7.5, 0.35, 0.35]} /><Ink k={0.6} /></mesh></group>
          </group>
          <mesh position={[boomTip[0], (boomTip[1] + cr.hookY) / 2, boomTip[2]]} material={M.iron}><cylinderGeometry args={[0.025, 0.025, Math.max(0.1, boomTip[1] - cr.hookY), 4]} /></mesh>
          {cr.carrying && <mesh position={[boomTip[0], cr.hookY - 0.35, boomTip[2]]} material={[M.stone, M.stone, M.stone, M.stone, M.numbered[3], M.stone]} castShadow><boxGeometry args={[0.85, 0.55, 0.6]} /><Ink k={0.5} /></mesh>}
          <group position={ship}><Ship blocks={blocksInHold} /></group>
          {/* lectern + cheque + stamp pad + money crate (cheque scene) */}
          {lecIn > 0.001 && <group position={[L.LECTERN[0] - (1 - lecIn) * 4, L.Y0, L.LECTERN[2]]}>
            <mesh position={[0, 0.55, 0]} material={M.wood} castShadow><boxGeometry args={[0.18, 1.1, 0.18]} /><Ink k={0.6} /></mesh>
            <mesh position={[0, 1.12, 0]} rotation={[0.35, 0, 0]} material={M.wood} castShadow><boxGeometry args={[0.8, 0.06, 0.55]} /><Ink k={0.6} /></mesh>
            <mesh position={[0, 1.16, 0.02]} rotation={[0.35, 0, 0]} material={M.paper}><boxGeometry args={[0.62, 0.012, 0.3]} /></mesh>
          </group>}
          {f >= 700 && f < 900 && <group position={[L.crateX(f), L.Y0, L.CRATE_Z]}><mesh position={[0, 0.3, 0]} material={M.wood} castShadow><boxGeometry args={[0.8, 0.6, 0.55]} /><Ink k={0.6} /></mesh>{[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} position={[-0.27 + (i % 3) * 0.27, 0.64, -0.12 + Math.floor(i / 3) * 0.24]} material={M.money}><boxGeometry args={[0.22, 0.08, 0.18]} /></mesh>)}</group>}
          {/* people */}
          {L.LONDON_PEOPLE.map((p, i) => L.londonPeopleVisible(i, f) && <Toon key={i} pose={L.londonPersonPose(i, f)} pos={p.pos} cam={c.pos} h={p.h} hi={hi} halo={0.1} />)}
          {f >= 596 && f < 985 && <Toon pose={cp} pos={clerk} cam={c.pos} h={1.5} hi={hi} light={0} halo={0.1} />}
          {L.halLondonVisible(f) && <Toon pose={hp} pos={h} cam={c.pos} hi={hi} light={4} />}
          {/* blueprint between Hal's hands (unrolls), rolled tube afterwards */}
          {bp.open > 0.01 && <mesh position={bpCenter} rotation={[-0.15 + 0.15 * bp.show, camYaw, 0]} scale={[bp.open, 1, 1]} material={M.bp}><planeGeometry args={[0.62, 0.4]} /></mesh>}
          {L.ideaSpark(f) > 0.01 && <sprite position={cardWorld(h, c.pos, [380, 150], 1.55, 0.2)} scale={[0.25 * L.ideaSpark(f), 0.25 * L.ideaSpark(f), 1]}><spriteMaterial color={new THREE.Color(2.2, 1.9, 1.2)} transparent opacity={0.7 * L.ideaSpark(f)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>}
        </InkCtx.Provider>
        <Post params={{ focusDist: c.focus, focusRange: 4, maxBlur: 0.2, bloom: 0.75, threshold: 1.6, exposure: 1.3, vignette: 0.55, ss: hi ? 1 : 2, contrast: 1.12, saturation: 1.08, lift: 0.015, warmCool: 0.5, ao: 0.6, aoRadius: 0.6 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
void cameraPx5; void PIER_X; void BRIDGE_LEN; void smooth;
