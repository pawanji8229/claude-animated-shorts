// short3 INT: the switchboard floor inside the moving building. Six operators (independent call rhythms) behind a low
// 1930 cord board (keyshelf with cord pairs + lamps, sloped jack field, cords that arc up when plugged), wood floor,
// plaster walls with wainscot, three tall windows whose street view slides as the building creeps, pendant lights,
// wall clock, filing cabinets, coat stand, plant. A clerk walks a memo past during "meanwhile". No text.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { Post } from "../../lib/Post";
import { InkCtx, Ink } from "../../inventor/Workshop";
import { V3, rng, smooth, lerp } from "../../lib/math";
import { SetRig, RenderAfterMount, Toon, TAU } from "../london-bridge/common";
import { pose5, COSTUME } from "../../char/odo5";
import { bldAt } from "./world";
import * as TL from "./timeline";

const cnv = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 1) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d")!; draw(g, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
};
const planks = () => cnv(512, 512, (g, r) => { for (let i = 0; i < 8; i++) { let y = 0; while (y < 512) { const l = 120 + r() * 220; g.fillStyle = `hsl(${26 + r() * 8},${38 + r() * 12}%,${28 + r() * 10}%)`; g.fillRect(i * 64, y, 62, l); for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,220,170" : "40,20,10"},0.08)`; g.fillRect(i * 64 + r() * 60, y + r() * l, 1.5, 20 + r() * 40); } g.fillStyle = "rgba(20,10,5,0.7)"; g.fillRect(i * 64, y + l - 2, 62, 2); y += l; } g.fillStyle = "rgba(20,10,5,0.7)"; g.fillRect(i * 64 + 62, 0, 2, 512); } }, 71);
const plaster = () => cnv(256, 256, (g, r) => { g.fillStyle = "#d9c9a6"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,250,235" : "120,100,70"},${r() * 0.06})`; g.fillRect(r() * 256, r() * 256, 2, 2); } }, 72);
const streetView = () => cnv(2048, 768, (g, r) => {                                   // what the windows see: buildings across a street, in midday haze
  const gr = g.createLinearGradient(0, 0, 0, 768); gr.addColorStop(0, "#9ec3e6"); gr.addColorStop(0.6, "#d6e3ec"); gr.addColorStop(1, "#cfc6b4"); g.fillStyle = gr; g.fillRect(0, 0, 2048, 768);
  let x = 0; while (x < 2048) { const w = 140 + r() * 220, h = 260 + r() * 380, base = ["#8a5f4a", "#9b8a72", "#6e5650", "#a89a84"][Math.floor(r() * 4)];
    g.fillStyle = base; g.fillRect(x, 768 - h, w, h); g.fillStyle = "rgba(240,230,210,0.5)"; g.fillRect(x, 768 - h, w, 10);
    for (let yy = 768 - h + 30; yy < 700; yy += 46) for (let xx = x + 14; xx < x + w - 24; xx += 34) { g.fillStyle = r() < 0.3 ? "#e8d6a8" : "#4d5866"; g.fillRect(xx, yy, 18, 26); }
    x += w + 6; }
  g.fillStyle = "rgba(200,210,220,0.25)"; g.fillRect(0, 0, 2048, 768);                     // haze
}, 73);

export const IntSet: React.FC<{ from: number }> = ({ from }) => {
  const f = useCurrentFrame() + from;
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920;
  const c = TL.camInt(f < 0 ? 1564 + f : f);   // negative frames = the loop pre-roll that flows into frame 0
  const M = useMemo(() => {
    const fl = planks(); fl.repeat.set(4, 2.5);
    const sv = streetView(); sv.wrapS = THREE.RepeatWrapping;
    return {
      floor: new THREE.MeshStandardMaterial({ map: fl, roughness: 0.6 }),
      wall: new THREE.MeshStandardMaterial({ map: plaster(), roughness: 0.95 }),
      wains: new THREE.MeshStandardMaterial({ color: "#5a3a22", roughness: 0.55 }),
      wood: new THREE.MeshStandardMaterial({ color: "#6b4426", roughness: 0.5 }),
      woodDark: new THREE.MeshStandardMaterial({ color: "#3d2616", roughness: 0.55 }),
      panel: new THREE.MeshStandardMaterial({ color: "#1d1d1b", roughness: 0.6 }),
      brass: new THREE.MeshStandardMaterial({ color: "#c09a4a", metalness: 0.8, roughness: 0.3 }),
      cord: new THREE.MeshStandardMaterial({ color: "#2a1c14", roughness: 0.6 }),
      lampOn: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.6) }), lampOff: new THREE.MeshStandardMaterial({ color: "#5a4a30", roughness: 0.4 }),
      view: new THREE.MeshBasicMaterial({ map: sv, toneMapped: true }), frame: new THREE.MeshStandardMaterial({ color: "#e8e0cc", roughness: 0.6 }),
      pendant: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.75, 1.3) }), steel: new THREE.MeshStandardMaterial({ color: "#6a6e66", metalness: 0.4, roughness: 0.5 }),
      clockFace: new THREE.MeshStandardMaterial({ color: "#f2ead8", roughness: 0.5 }), black: new THREE.MeshStandardMaterial({ color: "#151515" }),
      leaf: new THREE.MeshStandardMaterial({ color: "#4e7a3a", roughness: 0.9 }), pot: new THREE.MeshStandardMaterial({ color: "#a0583a", roughness: 0.8 }),
    };
  }, []);
  // window view slides with the building's travel (and creeps in the hook)
  const b = bldAt(f); M.view.map!.offset.x = (-(b.p[2]) * 0.02 + b.p[0] * 0.02) % 1;
  const ops = TL.OPS_X.map((x, i) => ({ x, ...TL.opAt(i, f) }));
  const memo = f >= 1236 && f < 1330 ? smooth(1236, 1320, f) : -1;                     // clerk crossing behind the operators
  const memoPose = pose5({ costume: { ...COSTUME.clerk, hat: null }, view: "side", gait: (f - 1236) * 0.045, walk: memo >= 0 ? 1 : 0, stride: 0.72, lean: 0.04, armR: { hand: [40, 60], elbow: [60, 90], shape: "grip", rot: 0.2, bend: 1 } });
  const clockA = (f / 30) * (TAU / 60);
  return (
    <AbsoluteFill style={{ backgroundColor: "#2a2018" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.05, far: 200 }}>
        <SetRig c={c} bg="#2a2018" fog={["#3a2e22", 14, 40]} env={0.35} />
        <InkCtx.Provider value={2.8 * k}>
          <hemisphereLight args={["#ffe9c8", "#5a4632", 0.9]} />
          <directionalLight position={[-3, 5, -6]} color="#fff2dc" intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={6} shadow-camera-bottom={-4} shadow-bias={-0.0004} />
          {[-3, 0, 3].map((x) => <pointLight key={x} position={[x, 3.1, 1.2]} color="#ffd9a6" intensity={4.5} distance={7} decay={1.6} />)}
          {/* room */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.5]} material={M.floor} receiveShadow><planeGeometry args={[16, 10]} /></mesh>
          <mesh position={[0, 0.5, -1.8]} material={M.wall} receiveShadow><boxGeometry args={[16, 1.0, 0.1]} /></mesh>
          <mesh position={[0, 3.45, -1.8]} material={M.wall} receiveShadow><boxGeometry args={[16, 0.7, 0.1]} /></mesh>
          {[-6.2, -1.8, 1.8, 6.2].map((x, i) => <mesh key={x} position={[x, 2.05, -1.8]} material={M.wall} receiveShadow><boxGeometry args={[i === 0 || i === 3 ? 3.6 : 1.8, 2.1, 0.1]} /></mesh>)}
          <mesh position={[0, 0.5, -1.72]} material={M.wains}><boxGeometry args={[16, 1.0, 0.06]} /></mesh>
          <mesh position={[0, 1.02, -1.68]} material={M.woodDark}><boxGeometry args={[16, 0.06, 0.1]} /></mesh>
          <mesh position={[0, 3.8, 1.5]} rotation={[Math.PI / 2, 0, 0]} material={M.wall}><planeGeometry args={[16, 10]} /></mesh>
          {/* three tall windows with the moving street view behind them */}
          {[-3.6, 0, 3.6].map((x, i) => <group key={x} position={[x, 2.05, -1.78]}>
            <mesh position={[0, 0, -0.6]} material={M.view}><planeGeometry args={[2.6, 2.4]} /></mesh>
            {[-0.85, 0.85].map((s) => <mesh key={s} position={[s, 0, 0]} material={M.frame} castShadow><boxGeometry args={[0.1, 2.1, 0.14]} /><Ink k={0.5} /></mesh>)}
            {[-1.05, 0, 1.05].map((y) => <mesh key={y} position={[0, y, 0]} material={M.frame}><boxGeometry args={[1.8, 0.08, 0.14]} /></mesh>)}
            <mesh position={[0, 0, 0.02]} material={M.frame}><boxGeometry args={[0.05, 2.1, 0.08]} /></mesh>
            <mesh position={[0, -1.14, 0.12]} material={M.wood}><boxGeometry args={[2.0, 0.06, 0.3]} /></mesh>
            {i === 1 && <mesh position={[0.5, -1.03, 0.14]} material={M.pot}><cylinderGeometry args={[0.09, 0.07, 0.16, 12]} /></mesh>}
          </group>)}
          {/* the hole behind the windows (so the view plane is the only thing seen) */}
          <mesh position={[0, 2.05, -2.6]} material={M.view}><planeGeometry args={[16, 3]} /></mesh>
          {/* wall clock (time passing) */}
          <group position={[5.6, 2.9, -1.72]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={M.woodDark}><cylinderGeometry args={[0.32, 0.32, 0.06, 28]} /></mesh>
            <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]} material={M.clockFace}><cylinderGeometry args={[0.27, 0.27, 0.02, 28]} /></mesh>
            {[clockA, clockA * 12].map((a, i) => <mesh key={i} position={[Math.sin(a) * (i ? 0.1 : 0.08), Math.cos(a) * (i ? 0.1 : 0.08), 0.06]} rotation={[0, 0, -a]} material={M.black}><boxGeometry args={[0.015, i ? 0.2 : 0.15, 0.01]} /></mesh>)}
          </group>
          {/* filing cabinets, coat stand, plant */}
          {[-6.4, -5.8].map((x) => <mesh key={x} position={[x, 0.7, -1.4]} material={M.steel} castShadow><boxGeometry args={[0.55, 1.4, 0.6]} /><Ink k={0.6} /></mesh>)}
          <group position={[6.2, 0, -1.2]}><mesh position={[0, 0.9, 0]} material={M.woodDark}><cylinderGeometry args={[0.03, 0.05, 1.8, 8]} /></mesh><mesh position={[0, 0.02, 0]} material={M.woodDark}><cylinderGeometry args={[0.25, 0.25, 0.04, 12]} /></mesh></group>
          <group position={[-6.6, 0, 0.4]}><mesh position={[0, 0.25, 0]} material={M.pot} castShadow><cylinderGeometry args={[0.25, 0.2, 0.5, 14]} /></mesh>{[0, 1, 2, 3].map((j) => <mesh key={j} position={[Math.cos(j * 1.6) * 0.18, 0.75 + j * 0.12, Math.sin(j * 1.6) * 0.18]} material={M.leaf} castShadow><icosahedronGeometry args={[0.28, 1]} /></mesh>)}</group>
          {/* pendant lights */}
          {[-3, 0, 3].map((x) => <group key={x} position={[x, 3.8, 1.0]}><mesh position={[0, -0.4, 0]} material={M.black}><cylinderGeometry args={[0.01, 0.01, 0.8, 6]} /></mesh><mesh position={[0, -0.85, 0]} material={M.brass}><coneGeometry args={[0.28, 0.2, 18, 1, true]} /></mesh><mesh position={[0, -0.9, 0]} material={M.pendant}><sphereGeometry args={[0.1, 12, 8]} /></mesh></group>)}
          {/* operators (cards) behind the low cord board */}
          {ops.map((o, i) => <Toon key={i} pose={o.pose} pos={[o.x, 0.02, -0.4]} cam={c.pos} h={1.5} hi={hi} light={i === 0 ? 3.5 : 1.2} halo={i === 0 ? 0.14 : 0.1} />)}
          {/* memo clerk crossing behind them */}
          {memo >= 0 && <Toon pose={memoPose} pos={[lerp(-7, 7, memo), 0, -1.15]} cam={c.pos} h={1.55} hi={hi} halo={0.08} />}
          {/* the cord board: cabinet, sloped keyshelf with cord pairs + lamps, upright jack field facing the operators */}
          <group position={[0, 0, 0.35]}>
            <mesh position={[0, 0.38, 0]} material={M.wood} castShadow receiveShadow><boxGeometry args={[11, 0.76, 0.7]} /><Ink k={0.8} /></mesh>
            <mesh position={[0, 0.79, -0.05]} rotation={[-0.18, 0, 0]} material={M.woodDark} castShadow><boxGeometry args={[11, 0.06, 0.6]} /><Ink k={0.6} /></mesh>
            {TL.OPS_X.map((x, i) => <group key={i} position={[x, 0.83, -0.05]}>
              {Array.from({ length: 6 }, (_, j) => <group key={j} position={[-0.42 + j * 0.17, 0, 0]}>
                <mesh position={[0, 0.03, 0.1]} material={M.brass}><cylinderGeometry args={[0.018, 0.018, 0.06, 8]} /></mesh>
                <mesh position={[0, 0.03, -0.12]} material={(ops[i].ring && j === i % 6) || (ops[i].plugged && j === (i + 2) % 6) ? M.lampOn : M.lampOff}><sphereGeometry args={[0.02, 8, 6]} /></mesh>
              </group>)}
              {/* plugged cord arcs up to the jack field */}
              {ops[i].plugged && <Cord from={[-0.1, 0.05, 0.1]} to={[0.12, 0.1, 0.33]} m={M.cord} />}
            </group>)}
            <mesh position={[0, 0.9, 0.3]} rotation={[-0.5, 0, 0]} material={M.panel} castShadow><boxGeometry args={[11, 0.26, 0.06]} /><Ink k={0.7} /></mesh>
            {TL.OPS_X.flatMap((x) => Array.from({ length: 12 }, (_, j) => <mesh key={`${x}${j}`} position={[x - 0.55 + j * 0.1, 0.94, 0.3]} rotation={[-0.5, 0, 0]} material={M.brass}><cylinderGeometry args={[0.012, 0.012, 0.02, 6]} /></mesh>))}
          </group>
        </InkCtx.Provider>
        <Post params={{ focusDist: c.focus, focusRange: 1.4, maxBlur: 0.22, bloom: 0.7, threshold: 1.6, exposure: 1.1, vignette: 0.55, ss: hi ? 1 : 2, contrast: 1.12, saturation: 1.06, lift: 0.015, warmCool: 0.7, ao: 0.6, aoRadius: 0.4 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
const Cord: React.FC<{ from: V3; to: V3; m: THREE.Material }> = ({ from, to, m }) => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(...from), new THREE.Vector3((from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 0.25, (from[2] + to[2]) / 2), new THREE.Vector3(...to)]), 16, 0.008, 6), [from, to]);
  return <mesh geometry={geo} material={m} />;
};
