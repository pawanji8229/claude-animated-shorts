// Dense environmental storytelling for the desert (all procedural, instanced where repeated):
// gravel & pebbles, hero rocks with contact shadows, wind-swaying grass (vertex shader), creosote/brittlebush
// shrubs, barrel cacti, ocotillo, cholla, layered hazy mountain ridges, height haze, dust devil, low windblown
// dust, circling birds, tyre tracks from the car, and construction leftovers from the rebuild (pallet of numbered
// spare granite blocks, wheelbarrow, striped sawhorses, survey tripod + theodolite, rope coil, crate, tarp, shovel).
import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Ink } from "../inventor/Workshop";
import { rng } from "../lib/math";
import { softGlow } from "./desertTextures";

type GY = (x: number, z: number) => number;
const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });

/** Wind sway injected into a standard material (instanced). Amount grows with height above the instance base. */
const swayMat = (base: THREE.MeshStandardMaterial, uTime: { value: number }, amp = 0.12) => {
  base.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uTime;").replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
       float h = max(position.y, 0.0);
       float w = sin(uTime * 1.7 + ip.x * 0.35 + ip.z * 0.21) * 0.6 + sin(uTime * 3.1 + ip.x * 0.9) * 0.25 + 0.35;
       transformed.x += w * h * h * ${amp.toFixed(3)} * 6.0;
       transformed.z += w * h * h * ${amp.toFixed(3)} * 2.0;`,
    );
  };
  base.customProgramCacheKey = () => `sway${amp}`;
  return base;
};

const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, seed = 1) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!, rng(seed));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};

export const DesertDetail: React.FC<{ f: number; gy: GY; avoid: (x: number, z: number) => boolean; carPath: [number, number][] }> = ({ f, gy, avoid, carPath }) => {
  const uTime = useMemo(() => ({ value: 0 }), []);
  uTime.value = f / 30;
  const M = useMemo(() => {
    const blockTex = canvasTex(256, 256, (g, r) => {
      g.fillStyle = "#a69c8f"; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "20,16,12"},${0.05 + r() * 0.1})`; g.fillRect(r() * 256, r() * 256, 2, 2); }
      g.fillStyle = "#c8452f"; g.font = "bold 64px DejaVu Sans, sans-serif"; g.fillText(String(1000 + Math.floor(r() * 9000)), 30, 150); // painted stone number (in-world marking)
      g.strokeStyle = "#5a4d42"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248);
    }, 5);
    const track = canvasTex(64, 512, (g, r) => {
      g.clearRect(0, 0, 64, 512);
      for (let y = 0; y < 512; y += 12) { g.fillStyle = `rgba(80,45,20,${0.35 + r() * 0.15})`; g.fillRect(8, y, 20, 7); g.fillRect(36, y + 6, 20, 7); }
    }, 6);
    return {
      gravel: std({ color: "#ffffff", roughness: 0.95, flatShading: true }),
      rock: std({ color: "#b06c3c", roughness: 0.95, flatShading: true }), rockDark: std({ color: "#7a4628", roughness: 0.95, flatShading: true }),
      grass: swayMat(std({ color: "#cfae62", side: THREE.DoubleSide, roughness: 1 }), uTime, 0.12),
      shrub: swayMat(std({ color: "#6f7d3c", roughness: 0.9 }), uTime, 0.03), flower: std({ color: "#f2c230", emissive: "#6a4a00", emissiveIntensity: 0.2 }),
      barrel: std({ color: "#5f8a3e", roughness: 0.75 }), spine: std({ color: "#e8d27a" }), ocotillo: std({ color: "#6a5a3c" }), ocoTip: std({ color: "#e0432f", emissive: "#601010", emissiveIntensity: 0.3 }),
      cholla: std({ color: "#9aae6a", roughness: 0.8 }),
      wood: std({ color: "#8a6440" }), woodDk: std({ color: "#5c3f26" }), stripeW: std({ color: "#efe9dc" }), stripeR: std({ color: "#c43a2c" }),
      iron: std({ color: "#32343a", metalness: 0.5, roughness: 0.5 }), brass: std({ color: "#c9a04a", metalness: 0.8, roughness: 0.3 }),
      tarp: std({ color: "#5d6b4a", roughness: 0.95 }), rope: std({ color: "#b5955f" }), block: std({ map: blockTex, roughness: 0.9 }),
      blockPlain: std({ color: "#a69c8f", roughness: 0.9 }), green: std({ color: "#3f6b46", metalness: 0.3, roughness: 0.5 }),
      track: new THREE.MeshBasicMaterial({ map: track, transparent: true, depthWrite: false, opacity: 0.85 }),
      shadow: new THREE.MeshBasicMaterial({ map: softGlow("rgba(30,15,5,0.75)", "rgba(30,15,5,0)"), transparent: true, depthWrite: false }),
      dust: new THREE.SpriteMaterial({ map: softGlow("rgba(235,190,140,0.28)", "rgba(235,190,140,0)"), transparent: true, depthWrite: false }),
      bird: std({ color: "#241e22", side: THREE.DoubleSide }),
    };
  }, [uTime]);

  const inst = useMemo(() => {
    const r = rng(77), out: THREE.Object3D[] = [], o = new THREE.Object3D(), col = new THREE.Color();
    // gravel + pebbles
    const gGeo = new THREE.DodecahedronGeometry(0.05, 0), gravel = new THREE.InstancedMesh(gGeo, M.gravel, 2600);
    let k = 0;
    for (let i = 0; k < 2600 && i < 9000; i++) {
      const near = i % 3 !== 0, x = near ? (r() - 0.5) * 44 : (r() - 0.5) * 120, z = near ? 52 - r() * 66 : 56 - r() * 136;
      if (Math.abs(x) < 11 && z < 5.2 && z > -5.2) continue; // not inside the bridge footprint
      const s = 0.4 + r() * r() * 2.4;
      o.position.set(x, gy(x, z) + 0.02 * s, z); o.rotation.set(r() * 6, r() * 6, r() * 6); o.scale.set(s, s * (0.5 + r() * 0.4), s); o.updateMatrix(); gravel.setMatrixAt(k, o.matrix);
      col.setHSL(0.06 + r() * 0.04, 0.35 + r() * 0.2, 0.32 + r() * 0.25); gravel.setColorAt(k++, col);
    }
    gravel.count = k; gravel.receiveShadow = true; gravel.castShadow = true; out.push(gravel);
    // grass tufts (7 blades each)
    const blade = new THREE.PlaneGeometry(0.035, 0.5, 1, 3); blade.translate(0, 0.25, 0);
    const pos = blade.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setX(i, pos.getX(i) * (1 - y / 0.55)); }
    const grass = new THREE.InstancedMesh(blade, M.grass, 4200); k = 0;
    for (let t = 0; t < 600 && k < 4200; t++) {
      const x = (r() - 0.5) * 70, z = 54 - r() * 100; if (avoid(x, z)) continue;
      const s = 0.6 + r() * 0.9;
      for (let b = 0; b < 7 && k < 4200; b++) { o.position.set(x + (r() - 0.5) * 0.25, gy(x, z), z + (r() - 0.5) * 0.25); o.rotation.set((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6); o.scale.set(s, s * (0.7 + r() * 0.6), s); o.updateMatrix(); grass.setMatrixAt(k++, o.matrix); }
    }
    grass.count = k; grass.castShadow = true; out.push(grass);
    // shrubs (clustered icosahedra) + yellow blossoms
    const sGeo = new THREE.IcosahedronGeometry(0.18, 0), shrubs = new THREE.InstancedMesh(sGeo, M.shrub, 1400), blossoms = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 5, 4), M.flower, 500);
    k = 0; let kb = 0;
    for (let t = 0; t < 90; t++) {
      const x = (r() - 0.5) * 90, z = 54 - r() * 118; if (avoid(x, z)) continue;
      const s = 0.7 + r() * 0.8, y0 = gy(x, z);
      for (let b = 0; b < 14 && k < 1400; b++) { o.position.set(x + (r() - 0.5) * 0.7 * s, y0 + 0.1 + r() * 0.45 * s, z + (r() - 0.5) * 0.7 * s); o.rotation.set(r() * 6, r() * 6, 0); o.scale.setScalar(s * (0.6 + r() * 0.6)); o.updateMatrix(); shrubs.setMatrixAt(k++, o.matrix); }
      if (r() < 0.5) for (let b = 0; b < 8 && kb < 500; b++) { o.position.set(x + (r() - 0.5) * 0.7 * s, y0 + 0.3 + r() * 0.4 * s, z + (r() - 0.5) * 0.7 * s); o.scale.setScalar(1); o.updateMatrix(); blossoms.setMatrixAt(kb++, o.matrix); }
    }
    shrubs.count = k; blossoms.count = kb; shrubs.castShadow = true; out.push(shrubs, blossoms);
    return out;
  }, [M, gy, avoid]);

  // hero rocks + cacti variety + contact shadows (individual, inked)
  const hero = useMemo(() => {
    const r = rng(31), list: { kind: string; x: number; z: number; s: number; seed: number }[] = [];
    for (let i = 0; i < 320 && list.length < 100; i++) {
      const x = (r() - 0.5) * 80, z = 54 - r() * 110; if (avoid(x, z)) continue;
      const k = r(); list.push({ kind: k < 0.45 ? "rock" : k < 0.65 ? "barrel" : k < 0.82 ? "ocotillo" : "cholla", x, z, s: 0.6 + r() * 0.9, seed: i });
    }
    return list;
  }, [avoid]);

  const tumbleGeo = useMemo(() => {
    const r = rng(9), parts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 46; k++) {
      const a = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(0.42);
      const b = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(0.42);
      const m = a.clone().add(b).multiplyScalar(0.5).multiplyScalar(0.6 + r() * 0.3);
      parts.push(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 8, 0.008, 4, false));
    }
    return mergeGeometries(parts);
  }, []);
  void tumbleGeo;

  // mountain ridges (3 hazy layers, pre-tinted, unaffected by fog)
  const ridges = useMemo(() => [
    { d: 230, h: 38, col: "#c98e6a", seed: 1 }, { d: 290, h: 55, col: "#b48a8c", seed: 2 }, { d: 360, h: 70, col: "#9f93ad", seed: 3 },
  ].map(({ d, h, col, seed }) => {
    const r = rng(seed), s = new THREE.Shape(); s.moveTo(-500, -20);
    for (let x = -500; x <= 500; x += 18) s.lineTo(x, h * (0.35 + 0.65 * Math.abs(Math.sin(x * 0.006 + seed) * Math.cos(x * 0.013 + seed * 2))) + r() * h * 0.12);
    s.lineTo(500, -20); s.closePath();
    return { g: new THREE.ShapeGeometry(s), d, col };
  }), []);

  // dust devil + low drifting dust + birds
  const devil = useMemo(() => { const r = rng(3); return Array.from({ length: 46 }, () => [r(), r(), r()] as const); }, []);
  const drift = useMemo(() => { const r = rng(4); return Array.from({ length: 26 }, () => [r() * 60 - 30, 0.3 + r() * 1.2, 18 - r() * 40, r()] as const); }, []);

  const shadow = (x: number, z: number, sx: number, sz: number) => <mesh key={`sh${x},${z}`} position={[x, gy(x, z) + 0.015, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[sx, sz, 1]} material={M.shadow}><planeGeometry args={[1, 1]} /></mesh>;

  return (
    <group>
      {inst.map((m, i) => <primitive key={i} object={m} />)}
      {hero.map((q) => {
        const y = gy(q.x, q.z), key = `h${q.seed}`;
        if (q.kind === "rock") return <group key={key}>{shadow(q.x + 0.15, q.z + 0.2, 1.3 * q.s, 1.0 * q.s)}<mesh position={[q.x, y + 0.18 * q.s, q.z]} rotation={[q.seed, q.seed * 2, 0]} scale={[q.s, q.s * 0.6, q.s * 0.8]} material={q.seed % 2 ? M.rock : M.rockDark} castShadow receiveShadow><dodecahedronGeometry args={[0.45, 1]} /><Ink k={0.8} /></mesh></group>;
        if (q.kind === "barrel") return (
          <group key={key}>{shadow(q.x, q.z, 0.9 * q.s, 0.9 * q.s)}<group position={[q.x, y, q.z]}>
            <mesh position={[0, 0.3 * q.s, 0]} scale={[0.32 * q.s, 0.38 * q.s, 0.32 * q.s]} material={M.barrel} castShadow><sphereGeometry args={[1, 18, 12]} /><Ink k={0.7} /></mesh>
            {Array.from({ length: 6 }, (_, k) => <mesh key={k} position={[Math.cos(k) * 0.12 * q.s, 0.62 * q.s, Math.sin(k) * 0.12 * q.s]} material={M.ocoTip}><sphereGeometry args={[0.04, 6, 4]} /></mesh>)}
          </group></group>
        );
        if (q.kind === "ocotillo") return (
          <group key={key} position={[q.x, y, q.z]}>
            {Array.from({ length: 9 }, (_, k) => {
              const a = (k / 9) * Math.PI * 2, lean = 0.12 + (k % 3) * 0.08, L = (2.2 + (k % 4) * 0.4) * q.s;
              return <group key={k} rotation={[Math.sin(a) * lean, 0, -Math.cos(a) * lean]}><mesh position={[0, L / 2, 0]} material={M.ocotillo} castShadow><cylinderGeometry args={[0.018, 0.035, L, 5]} /></mesh><mesh position={[0, L + 0.06, 0]} material={M.ocoTip}><coneGeometry args={[0.035, 0.18, 5]} /></mesh></group>;
            })}
          </group>
        );
        return (
          <group key={key} position={[q.x, y, q.z]}>
            <mesh position={[0, 0.45 * q.s, 0]} material={M.cholla} castShadow><capsuleGeometry args={[0.08 * q.s, 0.7 * q.s, 4, 8]} /><Ink k={0.6} /></mesh>
            {[0, 1, 2, 3].map((k) => <mesh key={k} position={[Math.cos(k * 1.7) * 0.18 * q.s, (0.6 + k * 0.12) * q.s, Math.sin(k * 1.7) * 0.18 * q.s]} rotation={[Math.sin(k * 1.7) * 0.9, 0, -Math.cos(k * 1.7) * 0.9]} material={M.cholla}><capsuleGeometry args={[0.06 * q.s, 0.3 * q.s, 4, 8]} /></mesh>)}
          </group>
        );
      })}
      {/* tyre tracks along the car's approach */}
      {carPath.slice(0, -1).map(([x0, z0], i) => {
        const [x1, z1] = carPath[i + 1], len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
        return [-0.82, 0.82].map((o) => {
          const cx = (x0 + x1) / 2 + Math.cos(ang) * o, cz = (z0 + z1) / 2 - Math.sin(ang) * o;
          return <mesh key={`${i}${o}`} position={[cx, gy(cx, cz) + 0.01, cz]} rotation={[-Math.PI / 2, 0, ang]} material={M.track}><planeGeometry args={[0.32, len + 0.05]} /></mesh>;
        });
      })}
      {/* construction leftovers by the right abutment */}
      {shadow(10.8, 7.2, 2.8, 2.2)}{shadow(13.4, 9.0, 1.6, 1.0)}{shadow(14.6, 7.8, 2.2, 1.6)}{shadow(9.4, 9.6, 1.0, 1.0)}
      <group position={[10.8, gy(10.8, 7.2), 7.2]} rotation={[0, -0.4, 0]}>
        <mesh position={[0, 0.08, 0]} material={M.woodDk} castShadow receiveShadow><boxGeometry args={[1.6, 0.16, 1.2]} /><Ink k={0.8} /></mesh>
        {[[-0.4, 0.38, -0.28], [0.42, 0.38, -0.28], [-0.4, 0.38, 0.3], [0.42, 0.38, 0.3], [0.02, 0.78, 0]].map((p, i) => <mesh key={i} position={p as [number, number, number]} rotation={[0, i * 0.05, 0]} material={i % 2 ? M.block : M.blockPlain} castShadow receiveShadow><boxGeometry args={[0.78, 0.44, 0.56]} /><Ink k={0.8} /></mesh>)}
      </group>
      <group position={[13.4, gy(13.4, 9.0), 9.0]} rotation={[0, 0.6, 0]}>
        {/* wheelbarrow */}
        <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0.12]} material={M.green} castShadow><cylinderGeometry args={[0.42, 0.25, 0.36, 4, 1, true]} /><Ink k={0.7} /></mesh>
        <mesh position={[0.55, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.iron}><torusGeometry args={[0.2, 0.06, 8, 18]} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[-0.45, 0.45, s * 0.22]} rotation={[0, 0, 1.25]} material={M.wood}><cylinderGeometry args={[0.025, 0.025, 1.3, 6]} /></mesh>)}
      </group>
      {[[8.6, 11.5, 0.2], [15.2, 6.4, -0.5]].map(([x, z, ry], i) => (
        <group key={`saw${i}`} position={[x, gy(x, z), z]} rotation={[0, ry, 0]}>
          {[0, 1, 2, 3, 4].map((k) => <mesh key={k} position={[-0.6 + k * 0.3, 0.95, 0]} material={k % 2 ? M.stripeR : M.stripeW} castShadow><boxGeometry args={[0.3, 0.2, 0.05]} /></mesh>)}
          {[-1, 1].map((s) => [-1, 1].map((t) => <mesh key={`${s}${t}`} position={[s * 0.6, 0.46, t * 0.18]} rotation={[t * 0.35, 0, 0]} material={M.wood} castShadow><boxGeometry args={[0.06, 0.95, 0.06]} /></mesh>))}
        </group>
      ))}
      <group position={[16.5, gy(16.5, 10.5), 10.5]}>
        {/* survey tripod + theodolite */}
        {[0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return <mesh key={k} position={[Math.cos(a) * 0.22, 0.62, Math.sin(a) * 0.22]} rotation={[Math.sin(a) * 0.32, 0, -Math.cos(a) * 0.32]} material={M.wood} castShadow><cylinderGeometry args={[0.02, 0.03, 1.3, 6]} /></mesh>; })}
        <mesh position={[0, 1.3, 0]} material={M.brass} castShadow><cylinderGeometry args={[0.09, 0.11, 0.12, 12]} /><Ink k={0.6} /></mesh>
        <mesh position={[0, 1.44, 0]} rotation={[0, 0, Math.PI / 2]} material={M.green}><cylinderGeometry args={[0.05, 0.06, 0.32, 12]} /></mesh>
      </group>
      <mesh position={[12.2, gy(12.2, 5.6) + 0.1, 5.6]} rotation={[Math.PI / 2, 0, 0]} material={M.rope} castShadow><torusGeometry args={[0.28, 0.06, 6, 22]} /></mesh>
      <mesh position={[14.6, gy(14.6, 7.8) + 0.25, 7.8]} scale={[1.4, 0.45, 1.0]} material={M.tarp} castShadow receiveShadow><sphereGeometry args={[0.7, 12, 8]} /><Ink k={0.7} /></mesh>
      <mesh position={[9.4, gy(9.4, 9.6) + 0.3, 9.6]} rotation={[0, 0.3, 0]} material={M.wood} castShadow><boxGeometry args={[0.6, 0.6, 0.6]} /><Ink k={0.7} /></mesh>
      <group position={[11.6, gy(11.6, 9.9), 9.9]} rotation={[0.1, 0.8, 0.35]}><mesh position={[0, 0.55, 0]} material={M.wood} castShadow><cylinderGeometry args={[0.02, 0.02, 1.1, 6]} /></mesh><mesh position={[0, 0.02, 0]} material={M.iron}><boxGeometry args={[0.22, 0.04, 0.28]} /></mesh></group>
      {/* distant ridges */}
      {ridges.map((rd, i) => <mesh key={`r${i}`} geometry={rd.g} position={[0, -2, -rd.d]}><meshBasicMaterial color={rd.col} fog={false} toneMapped={false} /></mesh>)}
      {/* low height haze bands */}
      {[120, 180].map((d, i) => <mesh key={`hz${i}`} position={[0, 6, -d]}><planeGeometry args={[900, 24]} /><meshBasicMaterial color="#f5c69a" transparent opacity={0.18} depthWrite={false} fog={false} /></mesh>)}
      {/* dust devil far right */}
      {devil.map(([a, b, c], i) => {
        const t = ((b + f * 0.006) % 1), ang = a * Math.PI * 2 + f * 0.09, rad = 0.6 + t * 2.4;
        return <sprite key={`dv${i}`} material={M.dust} position={[38 + Math.cos(ang) * rad, t * 16, -46 + Math.sin(ang) * rad]} scale={[2 + t * 3, 2 + t * 3, 1]} />;
      })}
      {/* windblown ground dust */}
      {drift.map(([x, y, z, ph], i) => { const xx = ((x + f * 0.09 * (0.6 + ph) + 30) % 60) - 30; return <sprite key={`dr${i}`} material={M.dust} position={[xx, gy(xx, z) + y * 0.5, z]} scale={[3 + ph * 3, 0.6 + ph, 1]} />; })}
      {/* circling birds */}
      {[0, 1, 2].map((i) => {
        const a = f * 0.012 + i * 2.1, flap = Math.sin(f * 0.5 + i) * 0.6;
        return (
          <group key={`b${i}`} position={[18 + Math.cos(a) * (9 + i * 3), 34 + i * 3, -22 + Math.sin(a) * (9 + i * 3)]} rotation={[0, -a, 0]}>
            {[-1, 1].map((s) => <mesh key={s} rotation={[0, 0, s * (0.2 + flap)]} position={[0, 0, s * 0.35]} material={M.bird}><planeGeometry args={[0.35, 0.7]} /></mesh>)}
          </group>
        );
      })}
    </group>
  );
};
