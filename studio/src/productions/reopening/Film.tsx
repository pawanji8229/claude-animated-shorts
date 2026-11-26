// Production "reopening": opening day of London Bridge in the Arizona desert — one continuous, seamlessly looping take.
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Post } from "../../lib/Post";
import { InkCtx, Ink } from "../../inventor/Workshop";
import { CardSprite } from "../../char/CardSprite";
import { drawOdo5, headCenterPx5, cameraPx5, W5, H5, SOLE5, PX5 } from "../../char/odo5";
import { glow } from "../../hall/hallTextures";
import { DesertWorld } from "../../desert/DesertWorld";
import { V3 } from "../../lib/math";
import { HAL, CROWD, camAt, halPose, crowdPose, crowdFlash, boatsAt, confettiAt, balloonOffset, loopT } from "./scene";

const Rig: React.FC<{ f: number }> = ({ f }) => {
  const { camera, scene, gl } = useThree();
  const env = useMemo(() => { const pm = new THREE.PMREMGenerator(gl); const t = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return t; }, [gl]);
  useLayoutEffect(() => {
    scene.environment = env; scene.environmentIntensity = 0.25; scene.background = new THREE.Color("#e9b88f"); scene.fog = new THREE.Fog("#efbb8c", 45, 300);
    const c = camAt(f), cam = camera as THREE.PerspectiveCamera; // sun layer (1) left off: the low sun through the far arch bloomed out the right edge
    cam.position.set(...c.pos); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = 0.1; cam.far = 900; cam.updateProjectionMatrix();
  });
  return null;
};
const RenderAfterMount: React.FC<{ f: number }> = ({ f }) => { const advance = useThree((s) => s.advance); useEffect(() => { advance(performance.now()); }, [f, advance]); return null; };

const headWorld = (pos: V3, cam: V3, px: [number, number], cardH: number, push = 0): V3 => {
  const yaw = Math.atan2(cam[0] - pos[0], cam[2] - pos[2]), s = cardH / H5;
  const lx = (px[0] - W5 / 2) * s, ly = (SOLE5 - px[1]) * s;
  return [pos[0] + Math.cos(yaw) * lx + Math.sin(yaw) * push, pos[1] + ly, pos[2] - Math.sin(yaw) * lx + Math.cos(yaw) * push];
};

/** Original small 1970s runabout: bevelled pointed hull, red stripe, windscreen, seats, outboard motor, pennant, wake. */
const Boat: React.FC<{ hue: number; f: number }> = ({ hue, f }) => {
  const hull = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-1.6, -0.75); s.lineTo(0.9, -0.75); s.quadraticCurveTo(1.9, -0.4, 2.3, 0); s.quadraticCurveTo(1.9, 0.4, 0.9, 0.75); s.lineTo(-1.6, 0.75); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.55, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3 }); g.rotateX(-Math.PI / 2); g.translate(0, -0.2, 0); return g;
  }, []);
  const col = ["#f3efe6", "#e9d8a6", "#d9e8f0"][hue], stripe = ["#c8452f", "#2f7fc1", "#3aa56a"][hue];
  const foam = useMemo(() => glow("rgba(255,255,255,0.75)", "rgba(255,255,255,0)"), []);
  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh geometry={hull} castShadow receiveShadow><meshStandardMaterial color={col} roughness={0.35} metalness={0.05} /><Ink k={0.8} /></mesh>
      <mesh position={[0.2, 0.18, 0]}><boxGeometry args={[3.2, 0.07, 1.62]} /><meshStandardMaterial color={stripe} roughness={0.4} /></mesh>
      <mesh position={[0.1, 0.42, 0]}><boxGeometry args={[2.4, 0.04, 1.3]} /><meshStandardMaterial color="#7a5a3c" roughness={0.6} /></mesh>
      <mesh position={[0.75, 0.62, 0]} rotation={[0, 0, 0.5]}><planeGeometry args={[0.45, 1.3]} /><meshPhysicalMaterial color="#cfe9ff" transparent opacity={0.35} roughness={0.02} side={THREE.DoubleSide} /></mesh>
      {[-0.2, -0.9].map((x) => <mesh key={x} position={[x, 0.6, 0]}><boxGeometry args={[0.45, 0.3, 1.1]} /><meshStandardMaterial color="#efe1c4" roughness={0.6} /></mesh>)}
      <group position={[-1.75, 0.3, 0]}>
        <mesh><boxGeometry args={[0.32, 0.5, 0.3]} /><meshStandardMaterial color="#26272c" metalness={0.4} roughness={0.4} /></mesh>
        <mesh position={[0, -0.55, 0]}><cylinderGeometry args={[0.05, 0.05, 0.7, 8]} /><meshStandardMaterial color="#3a3b40" /></mesh>
      </group>
      <mesh position={[2.1, 0.75, 0]} rotation={[0, 0, 0.2 * Math.sin(f * 0.6)]}><planeGeometry args={[0.35, 0.22]} /><meshStandardMaterial color={stripe} side={THREE.DoubleSide} /></mesh>
      {[0, 1, 2, 3, 4].map((k) => <sprite key={k} position={[-2.0 - k * 0.9, -0.15, (k % 2 ? 1 : -1) * 0.25 * k]} scale={[1.2 + k * 0.5, 0.5 + k * 0.2, 1]}><spriteMaterial map={foam} transparent opacity={0.6 - k * 0.1} depthWrite={false} /></sprite>)}
    </group>
  );
};

export const ReopeningFilm: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const hi = height >= 1500, k = height / 1920, t = loopT(f);
  const c = camAt(f);
  const halo = useMemo(() => glow("rgba(255,236,205,0.9)", "rgba(255,210,160,0)"), []);
  const flashTex = useMemo(() => glow("rgba(255,255,255,1)", "rgba(200,230,255,0)"), []);
  const confettiGeo = useMemo(() => new THREE.BufferGeometry(), []);
  const conf = confettiAt(f); const cp = new Float32Array(conf.length * 3), cc = new Float32Array(conf.length * 3);
  const palette = [[0.85, 0.25, 0.18], [0.95, 0.76, 0.19], [0.18, 0.5, 0.76], [0.23, 0.65, 0.42], [0.95, 0.94, 0.9]];
  conf.forEach((p, i) => { cp.set(p, i * 3); cc.set(palette[i % 5], i * 3); });
  confettiGeo.setAttribute("position", new THREE.BufferAttribute(cp, 3)); confettiGeo.setAttribute("color", new THREE.BufferAttribute(cc, 3));
  const hp = halPose(f), hHead = headWorld(HAL, c.pos, headCenterPx5(hp), 1.55, -0.05);
  const BAL: V3 = [-12.9, 0, 13.4];
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a120c" }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: c.fov, position: c.pos, near: 0.1, far: 900 }}>
        <Rig f={f} />
        <InkCtx.Provider value={2.8 * k}>
          <DesertWorld f={f} shadowRes={hi ? 4096 : 2048} tumble={[]} water festive leftovers={false} loopT={t} clearZones={[[-15, -5, 14.2, 26]]} />
          {boatsAt(f).map((b) => <group key={b.hue} position={b.pos} scale={b.scale}><Boat hue={b.hue} f={f} /></group>)}
          {/* podium with bunting skirt */}
          <group position={[-12.2, groundY0(-12.2, 12.8), 12.8]} rotation={[0, 0.5, 0]}>
            <mesh position={[0, 0.35, 0]} castShadow receiveShadow><boxGeometry args={[1.6, 0.7, 1.0]} /><meshStandardMaterial color="#7a4e2c" roughness={0.7} /><Ink /></mesh>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <mesh key={i} position={[-0.69 + i * 0.23, 0.48, 0.505]}><planeGeometry args={[0.23, 0.36]} /><meshStandardMaterial color={["#d8402f", "#f4efe2", "#2f7fc1"][i % 3]} /></mesh>)}
          </group>
          {/* balloon cluster tied by the podium */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const o = balloonOffset(i, f), a = (i / 8) * Math.PI * 2, p: V3 = [BAL[0] + Math.cos(a) * 0.35 + o[0], 2.6 + (i % 3) * 0.35 + o[1], BAL[2] + Math.sin(a) * 0.3 + o[2]];
            return (
              <group key={i}>
                <mesh position={p} scale={[1, 1.18, 1]} castShadow><sphereGeometry args={[0.24, 18, 14]} /><meshPhysicalMaterial color={["#d8402f", "#f2c230", "#2f7fc1", "#3aa56a"][i % 4]} roughness={0.25} clearcoat={1} /><Ink k={0.6} /></mesh>
                <mesh position={[(p[0] + BAL[0]) / 2, (p[1] - 0.28 + 0.9) / 2, (p[2] + BAL[2]) / 2]}><cylinderGeometry args={[0.004, 0.004, p[1] - 1.2, 3]} /><meshBasicMaterial color="#eeeeee" /></mesh>
              </group>
            );
          })}
          <points geometry={confettiGeo}><pointsMaterial vertexColors size={0.06} /></points>
          {/* crowd (earless odo5 rig, costume variants) with cameras + flash bulbs */}
          {CROWD.map((m, i) => {
            const pz = crowdPose(i, f), fl = crowdFlash(i, f), cam = pz.camera ? headWorld(m.pos, c.pos, cameraPx5(pz), m.h, 0.14) : null;
            return (
              <group key={i}>
                <CardSprite W={W5} H={H5} sole={SOLE5} cardH={m.h} pos={m.pos} camPos={c.pos} texScale={hi ? 1.4 : 0.9} albedo={0.82} fill={0.7} fillColor="#fff2e2" contact={0.8} draw={(g) => drawOdo5(g, pz)} drawMask={(g) => drawOdo5(g, pz, true)} />
                {/* brief, subtle flash from THIS person's camera (only on their own flash shots) */}
                {fl > 0 && cam && <sprite position={cam} scale={[0.16 * fl + 0.05, 0.16 * fl + 0.05, 1]}><spriteMaterial map={flashTex} transparent opacity={0.45 * fl} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>}
              </group>
            );
          })}
          {/* ONE always-mounted flash fill light, moved to whoever is firing (no light add/remove -> no shader recompiles) */}
          {(() => { let best = 0, at: V3 = [HAL[0], HAL[1] + 1.4, HAL[2] + 1]; CROWD.forEach((m, i) => { const fl = crowdFlash(i, f); if (fl > best) { const pz = crowdPose(i, f); best = fl; const w = headWorld(m.pos, c.pos, cameraPx5(pz), m.h, 0.14); at = [w[0], w[1], w[2] + 0.25]; } });
            return <pointLight position={at} color="#f4f8ff" intensity={1.4 * best} distance={4.5} decay={2} />; })()}
          {/* Hal + face glow + flash fill */}
          <pointLight position={[HAL[0] + 0.8, HAL[1] + 1.9, HAL[2] + 2.2]} color="#ffd2a0" intensity={4.5} distance={6} decay={1.7} />
          <CardSprite W={W5} H={H5} sole={SOLE5} cardH={1.55} pos={HAL} camPos={c.pos} texScale={hi ? 2 : 1.3} albedo={0.82} fill={0.82} fillColor="#fff2e2" contact={0.9} draw={(g) => drawOdo5(g, hp)} drawMask={(g) => drawOdo5(g, hp, true)} />
          <sprite position={hHead} scale={[0.95, 0.95, 1]}><spriteMaterial map={halo} transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
        </InkCtx.Provider>
        <Post params={{ focusDist: c.focus, focusRange: 4.5, maxBlur: 0.2, bloom: 0.75, threshold: 1.6, exposure: 1.0, vignette: 0.55, ss: hi ? 1 : 2, contrast: 1.15, saturation: 1.1, lift: 0.012, warmCool: 0.8, ao: 0.6, aoRadius: 0.6 }} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
import { groundY as groundY0 } from "../../desert/DesertWorld";
void PX5;
