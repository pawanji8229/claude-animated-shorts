// Original 1960s-style American convertible (generic design, no brand marks), modelled procedurally for close-ups:
// bevelled extruded body sections (lower body, hood, rear deck, tailfins, door panels) around an open cockpit,
// tufted bench seats, dashboard + gauges, steering wheel, raked windshield with chrome frame, grille with chrome
// bars, quad headlights in chrome bezels, wraparound bumpers, side trim, door handles, mirror, hood ornament,
// tail lights, whitewall tyres with hubcaps/spinners in shadowed wheel wells, clearcoat two-tone paint.
// Local frame: +x = front, +y = up, +z = left side; wheels touch y = 0. Length ~5.3 m.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Ink } from "../inventor/Workshop";

const W = 2.0, HW = W / 2;
const ext = (pts: [number, number][], depth: number, bevel = 0.06) => {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 16 });
  g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g;
};
const smoothProfile = (ctrl: [number, number][], n = 10): [number, number][] => {
  const c = new THREE.SplineCurve(ctrl.map(([x, y]) => new THREE.Vector2(x, y)));
  return c.getPoints(ctrl.length * n).map((p) => [p.x, p.y] as [number, number]);
};

export const Car60: React.FC<{ wheelSpin?: number; brake?: number }> = ({ wheelSpin = 0, brake = 0 }) => {
  const M = useMemo(() => ({
    paint: new THREE.MeshPhysicalMaterial({ color: "#b3302a", roughness: 0.32, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 }),
    cream: new THREE.MeshPhysicalMaterial({ color: "#efe3c7", roughness: 0.35, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#f2f5f8", metalness: 1, roughness: 0.08 }),
    dark: new THREE.MeshStandardMaterial({ color: "#141417", roughness: 0.6 }),
    tyre: new THREE.MeshStandardMaterial({ color: "#1a1a1d", roughness: 0.85 }),
    white: new THREE.MeshStandardMaterial({ color: "#f3f1ea", roughness: 0.5 }),
    leather: new THREE.MeshStandardMaterial({ color: "#efe1c4", roughness: 0.55 }),
    leatherDk: new THREE.MeshStandardMaterial({ color: "#c9b48c", roughness: 0.6 }),
    carpet: new THREE.MeshStandardMaterial({ color: "#5a1d1a", roughness: 0.95 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#cfe9ff", transparent: true, opacity: 0.28, roughness: 0.02, metalness: 0, clearcoat: 1 }),
    lens: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.2), toneMapped: false }),
    tail: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4 + brake * 2, 0.15, 0.1), toneMapped: false }),
    gauge: new THREE.MeshStandardMaterial({ color: "#f3ead6", roughness: 0.4 }),
  }), [brake]);
  const G = useMemo(() => {
    const lower = ext(smoothProfile([[-2.62, 0.34], [-2.66, 0.6], [-2.5, 0.68], [0, 0.68], [2.45, 0.66], [2.62, 0.56], [2.6, 0.34], [1.8, 0.3], [-1.8, 0.3]]), W - 0.16, 0.08);
    const hood = ext(smoothProfile([[0.55, 0.66], [0.6, 0.84], [1.6, 0.86], [2.5, 0.79], [2.58, 0.68]]), W - 0.24, 0.06);
    const deck = ext(smoothProfile([[-2.6, 0.66], [-2.62, 0.8], [-2.1, 0.85], [-1.45, 0.84], [-1.4, 0.66]]), W - 0.36, 0.06);
    const fin = ext([[-2.68, 0.66], [-2.7, 1.02], [-2.45, 1.0], [-1.55, 0.86], [-1.5, 0.7]], 0.12, 0.03);
    const door = ext(smoothProfile([[-1.45, 0.66], [-1.42, 0.88], [0, 0.9], [0.62, 0.88], [0.6, 0.66]]), 0.1, 0.03);
    const bumper = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.95, 0, -0.55], [-0.6, 0, -0.05], [0, 0, 0], [0.6, 0, -0.05], [0.95, 0, -0.55]].map(([z, y, x]) => new THREE.Vector3(x, y, z * 1.08))), 40, 0.07, 10, false);
    const tyre = new THREE.TorusGeometry(0.29, 0.12, 14, 36);
    const wall = new THREE.TorusGeometry(0.27, 0.035, 8, 36);
    return { lower, hood, deck, fin, door, bumper, tyre, wall };
  }, []);
  const wheels: [number, number][] = [[1.62, 1], [1.62, -1], [-1.58, 1], [-1.58, -1]];
  return (
    <group>
      {/* body sections */}
      <mesh geometry={G.lower} material={M.paint} castShadow receiveShadow><Ink k={1.0} /></mesh>
      <mesh geometry={G.hood} material={M.paint} castShadow receiveShadow><Ink k={0.9} /></mesh>
      <mesh geometry={G.deck} material={M.cream} castShadow receiveShadow><Ink k={0.9} /></mesh>
      {[-1, 1].map((s) => <mesh key={`f${s}`} geometry={G.fin} material={M.cream} position={[0, 0, s * (HW - 0.14)]} castShadow><Ink k={0.8} /></mesh>)}
      {[-1, 1].map((s) => <mesh key={`d${s}`} geometry={G.door} material={M.paint} position={[0, 0, s * (HW - 0.1)]} castShadow><Ink k={0.8} /></mesh>)}
      {/* cream contrast sweep + chrome side trim */}
      {[-1, 1].map((s) => (
        <group key={`t${s}`}>
          <mesh position={[0.2, 0.5, s * (HW + 0.005)]} scale={[1, 1, s]}><boxGeometry args={[4.6, 0.08, 0.02]} /><meshStandardMaterial color="#efe3c7" roughness={0.4} /></mesh>
          <mesh position={[0.2, 0.57, s * (HW + 0.012)]} material={M.chrome}><boxGeometry args={[4.9, 0.025, 0.02]} /></mesh>
          <mesh position={[0.15, 0.8, s * (HW - 0.02)]} rotation={[0, 0, Math.PI / 2]} material={M.chrome}><capsuleGeometry args={[0.018, 0.14, 4, 8]} /></mesh>{/* door handle */}
          <mesh position={[-1.43, 0.62, s * (HW + 0.004)]} material={M.dark}><boxGeometry args={[0.012, 0.32, 0.004]} /></mesh>{/* door shut-line */}
          <mesh position={[0.6, 0.62, s * (HW + 0.004)]} material={M.dark}><boxGeometry args={[0.012, 0.3, 0.004]} /></mesh>
        </group>
      ))}
      {/* wheel wells (shadowed recesses) + wheels */}
      {wheels.map(([x, s], i) => (
        <group key={i} position={[x, 0.41, s * (HW - 0.1)]}>
          {/* wheel arch: thin dark ring on the body side, the tyre stays visible inside it */}
          <mesh position={[0, 0, s * 0.105]}><ringGeometry args={[0.43, 0.5, 32, 1, 0, Math.PI]} /><meshStandardMaterial color="#0b0b0d" side={THREE.DoubleSide} roughness={0.8} /></mesh>
          <group rotation={[0, 0, -wheelSpin]}>
            <mesh geometry={G.tyre} material={M.tyre} castShadow><Ink k={0.7} /></mesh>
            <mesh geometry={G.wall} material={M.white} position={[0, 0, s * 0.09]} />
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, s * 0.07]} material={M.cream}><cylinderGeometry args={[0.2, 0.2, 0.04, 28]} /></mesh>
            <mesh rotation={[s * Math.PI / 2, 0, 0]} position={[0, 0, s * 0.11]} material={M.chrome}><coneGeometry args={[0.15, 0.08, 28]} /></mesh>
            {[0, 1, 2].map((k) => <mesh key={k} rotation={[0, 0, (k / 3) * Math.PI]} position={[0, 0, s * 0.15]} material={M.chrome}><boxGeometry args={[0.24, 0.02, 0.02]} /></mesh>)}
          </group>
        </group>
      ))}
      {/* open cockpit: carpet tub, bench seats with tufting, dashboard, steering wheel */}
      <mesh position={[-0.42, 0.62, 0]} material={M.carpet}><boxGeometry args={[2.0, 0.06, W - 0.4]} /></mesh>
      {[[-0.22, 0.86], [-1.1, 0.82]].map(([x, h], i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, 0.74, 0]} material={M.leather} castShadow><boxGeometry args={[0.55, 0.18, W - 0.5]} /></mesh>
          <mesh position={[-0.24, h, 0]} rotation={[0, 0, 0.12]} material={M.leather} castShadow><capsuleGeometry args={[0.09, W - 0.62, 6, 12]} /></mesh>
          <mesh position={[-0.24, h, 0]} rotation={[Math.PI / 2, 0, 0.12]} material={M.leather}><capsuleGeometry args={[0.1, W - 0.68, 6, 12]} /></mesh>
          {Array.from({ length: 5 }, (_, k) => <mesh key={k} position={[-0.17, h + 0.02, -0.6 + k * 0.3]} material={M.leatherDk}><sphereGeometry args={[0.018, 6, 4]} /></mesh>)}
        </group>
      ))}
      <mesh position={[0.52, 0.86, 0]} rotation={[0, 0, -0.25]} material={M.paint} castShadow><boxGeometry args={[0.18, 0.16, W - 0.3]} /></mesh>
      {[-0.35, 0, 0.35].map((z, k) => (
        <group key={k} position={[0.44, 0.89, z + 0.25]} rotation={[0, Math.PI / 2, 0.3]}>
          <mesh material={M.chrome}><torusGeometry args={[0.045, 0.008, 6, 16]} /></mesh>
          <mesh material={M.gauge}><circleGeometry args={[0.04, 16]} /></mesh>
        </group>
      ))}
      <group position={[0.22, 0.98, 0.42]} rotation={[0, 0, -1.0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={M.cream}><torusGeometry args={[0.19, 0.015, 8, 28]} /></mesh>
        {[0, 1, 2].map((k) => <mesh key={k} rotation={[0, (k / 3) * Math.PI * 2, 0]} position={[0, 0, 0]} material={M.chrome}><boxGeometry args={[0.36, 0.012, 0.012]} /></mesh>)}
        <mesh position={[0, -0.18, 0]} material={M.dark}><cylinderGeometry args={[0.02, 0.025, 0.36, 8]} /></mesh>
      </group>
      {/* windshield: chrome frame + glass */}
      <group position={[0.66, 0.88, 0]} rotation={[0, 0, 0.6]}>
        {[-1, 1].map((s) => <mesh key={s} position={[0, 0.25, s * (HW - 0.2)]} material={M.chrome}><cylinderGeometry args={[0.022, 0.022, 0.52, 8]} /></mesh>)}
        <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={M.chrome}><cylinderGeometry args={[0.02, 0.02, W - 0.38, 8]} /></mesh>
        <mesh position={[0, 0.25, 0]} rotation={[0, Math.PI / 2, 0]} material={M.glass}><planeGeometry args={[W - 0.42, 0.5]} /></mesh>
      </group>
      {/* side mirror */}
      <group position={[0.62, 0.95, HW - 0.06]}>
        <mesh position={[0, 0.04, 0]} material={M.chrome}><cylinderGeometry args={[0.01, 0.012, 0.1, 6]} /></mesh>
        <mesh position={[0, 0.1, 0.02]} rotation={[0, 0.3, Math.PI / 2]} material={M.chrome}><cylinderGeometry args={[0.055, 0.055, 0.02, 16]} /></mesh>
      </group>
      {/* front: grille with chrome bars, quad headlights, parking lights, bumper, hood ornament */}
      {/* front fittings sit ON the bevelled nose (body surface reaches x ~2.70) */}
      <mesh position={[2.705, 0.52, 0]} material={M.dark}><boxGeometry args={[0.03, 0.22, W - 0.62]} /></mesh>
      <mesh position={[2.712, 0.52, 0]} material={M.chrome}><boxGeometry args={[0.02, 0.26, 0.03]} /></mesh>
      {[-1, 1].map((sg) => <mesh key={`gs${sg}`} position={[2.712, 0.52, sg * (W - 0.62) / 2]} material={M.chrome}><boxGeometry args={[0.025, 0.26, 0.03]} /></mesh>)}
      {[0.635, 0.405].map((y) => <mesh key={`gb${y}`} position={[2.712, y, 0]} material={M.chrome}><boxGeometry args={[0.025, 0.03, W - 0.58]} /></mesh>)}
      {Array.from({ length: 7 }, (_, k) => <mesh key={k} position={[2.72, 0.44 + k * 0.03, 0]} material={M.chrome}><boxGeometry args={[0.015, 0.01, W - 0.66]} /></mesh>)}
      {Array.from({ length: 9 }, (_, k) => <mesh key={`v${k}`} position={[2.722, 0.52, -0.6 + k * 0.15]} material={M.chrome}><boxGeometry args={[0.012, 0.2, 0.01]} /></mesh>)}
      {[-1, 1].map((sg) => [0.78, 0.56].map((z, k) => (
        <group key={`${sg}${k}`} position={[2.69, 0.72, sg * z]}>
          <mesh rotation={[0, Math.PI / 2, 0]} material={M.chrome}><torusGeometry args={[0.07, 0.016, 8, 22]} /></mesh>
          <mesh rotation={[0, Math.PI / 2, 0]} position={[0.012, 0, 0]} material={M.lens}><circleGeometry args={[0.062, 20]} /></mesh>
          <mesh rotation={[0, Math.PI / 2, 0]} position={[0.005, 0.025, 0]} material={M.chrome}><torusGeometry args={[0.08, 0.012, 6, 16, Math.PI]} /></mesh>
        </group>
      )))}
      {[-1, 1].map((sg) => <mesh key={`pk${sg}`} position={[2.72, 0.36, sg * 0.62]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.025, 0.12, 4, 8]} /><meshBasicMaterial color={[1.6, 1.0, 0.4]} toneMapped={false} /></mesh>)}
      <mesh position={[2.84, 0.32, 0]} material={M.chrome} geometry={G.bumper} castShadow />
      <mesh position={[2.45, 0.92, 0]} rotation={[0, 0, -0.3]} material={M.chrome}><coneGeometry args={[0.025, 0.22, 8]} /></mesh>
      {/* rear: bumper, tail lights in fins, blank plate */}
      <mesh position={[-2.86, 0.32, 0]} rotation={[0, Math.PI, 0]} material={M.chrome} geometry={G.bumper} castShadow />
      {[-1, 1].map((s) => <mesh key={s} position={[-2.75, 0.88, s * (HW - 0.14)]} rotation={[0, 0, Math.PI / 2]} material={M.tail}><capsuleGeometry args={[0.035, 0.18, 4, 10]} /></mesh>)}
      <mesh position={[-2.745, 0.48, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.32, 0.16]} /><meshStandardMaterial color="#e9d8a6" roughness={0.5} /></mesh>
      {/* soft contact shadow under the car */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[6.0, 2.6]} /><meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} alphaMap={contactAlpha()} /></mesh>
    </group>
  );
};

let _ca: THREE.Texture | null = null;
const contactAlpha = () => {
  if (_ca) return _ca;
  const c = document.createElement("canvas"); c.width = 256; c.height = 128; const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(128, 64, 10, 128, 64, 128); gr.addColorStop(0, "#fff"); gr.addColorStop(0.55, "#999"); gr.addColorStop(1, "#000");
  g.fillStyle = "#000"; g.fillRect(0, 0, 256, 128); g.save(); g.scale(1, 0.5); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.restore();
  _ca = new THREE.CanvasTexture(c); return _ca;
};
