// Lighting 2.0 renderer components (React Three Fiber, Remotion-safe, frame-pure):
//   <Light2Rig>     the scene lighting from a LightSpec: sky hemisphere + ambient floor + one shadowed key (sun / moon)
//                   with a STABLE shadow frustum (texel-snapped, so camera moves never make shadows shimmer), motivated
//                   fill / rim / bounce directionals, procedural room env or a library HDRI for image-based lighting.
//   <Practicals>    environmental light sources: every practical gets an emissive source + an additive ground light
//                   pool (no light cost); only the `budget` most important get a real point / spot light (chosen per SHOT
//                   from a fixed focus point, never per frame, so lights never pop during a move).
//   <LightShaft>    volumetric-style light shaft (window / skylight / headlight beam) as an additive gradient volume.
//   <ContactShadow> soft grounding blob (the LOW-profile substitute for SSAO under props / vehicles / machines).
//   <Weather>       deterministic rain streaks, snow, dust motes (instanced; positions are a pure function of the frame).
//   <WaterSurface>  Gerstner-wave water with depth tint, env reflections and animated sun glints (no extra passes).
//   <Puddle>        wet-ground reflective decal.
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useLibraryHdri } from "../../enhance/libraryModel";
import { toHex, type LightSpec, type Practical, type V3, type RGB } from "./model";
import { QUALITY, type Quality } from "./presets";

const col = (c: RGB) => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace);
const envCache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();
const roomEnv = (gl: THREE.WebGLRenderer) => { let t = envCache.get(gl); if (!t) { const pm = new THREE.PMREMGenerator(gl); t = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); envCache.set(gl, t); } return t; };

/** HDRI loader component (only mounted when the spec asks for one, so no load cost otherwise) */
const HdriEnv: React.FC<{ file: string; intensity: number; rotation: number }> = ({ file, intensity, rotation }) => {
  const tex = useLibraryHdri(file), { scene } = useThree();
  useLayoutEffect(() => { if (!tex) return; scene.environment = tex; scene.environmentIntensity = intensity; scene.environmentRotation = new THREE.Euler(0, rotation, 0); });
  return null;
};
export const Light2Rig: React.FC<{ spec: LightSpec; quality?: Quality; focus: V3; shadowSize?: number }> = ({ spec, quality = "BALANCED", focus, shadowSize = 14 }) => {
  const { scene, gl } = useThree(); const Q = QUALITY[quality];
  const sun = useMemo(() => { const l = new THREE.DirectionalLight("#ffffff", 1); l.castShadow = true; return l; }, []);
  useLayoutEffect(() => {
    if (spec.env.source === "room") { scene.environment = roomEnv(gl); scene.environmentIntensity = spec.env.intensity; scene.environmentRotation = new THREE.Euler(0, spec.env.rotation, 0); }
    scene.background = col(spec.background); scene.fog = null;   // fog is rendered by Post2 (height + atmospheric perspective)
    gl.shadowMap.enabled = spec.key.shadow; gl.shadowMap.type = Q.shadowType === "basic" ? THREE.BasicShadowMap : Q.shadowType === "pcf" ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  });
  // stable shadow frustum: centred on the shot's focus point, snapped to whole shadow-map texels in light space
  const D = 150, d = new THREE.Vector3(...spec.key.dir).normalize(), size = shadowSize, map = Q.shadowMap, texel = (2 * size) / map;
  const lightRot = new THREE.Matrix4().lookAt(new THREE.Vector3(0, 0, 0), d.clone().negate(), new THREE.Vector3(0, 1, 0)), inv = lightRot.clone().invert();
  const fl = new THREE.Vector3(...focus).applyMatrix4(inv); fl.x = Math.round(fl.x / texel) * texel; fl.y = Math.round(fl.y / texel) * texel; const at = fl.applyMatrix4(lightRot);
  sun.color.copy(col(spec.key.color)); sun.intensity = spec.key.intensity; sun.castShadow = spec.key.shadow;
  sun.position.set(at.x + d.x * D, at.y + d.y * D, at.z + d.z * D); sun.target.position.copy(at); sun.target.updateMatrixWorld();
  const sc = sun.shadow.camera as THREE.OrthographicCamera; sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 1; sc.far = D * 2; sc.updateProjectionMatrix();
  sun.shadow.mapSize.set(map, map); sun.shadow.radius = Math.min(8, 1 + spec.key.softness);
  // bias from texel size: acne-free without peter-panning (normal bias scales with the frustum; constant bias tiny)
  sun.shadow.bias = -0.00012 * (2048 / map); sun.shadow.normalBias = Math.max(0.012, texel * 0.9);
  return (<>
    {spec.env.source === "hdri" && spec.env.hdri && <HdriEnv file={spec.env.hdri} intensity={spec.env.intensity} rotation={spec.env.rotation} />}
    <hemisphereLight args={[col(spec.sky.top), col(spec.sky.bottom), spec.sky.intensity]} />
    <ambientLight color={col(spec.sky.top)} intensity={spec.ambient} />
    {spec.key.intensity > 0.001 && <><primitive object={sun} /><primitive object={sun.target} /></>}
    {spec.extras.filter((e) => e.intensity > 0.001).map((e, i) => <directionalLight key={i} color={col(e.color)} intensity={e.intensity} position={[focus[0] + e.dir[0] * 50, focus[1] + e.dir[1] * 50, focus[2] + e.dir[2] * 50]} />)}
  </>);
};

// ---------------------------------------------------------------- practicals
const radialTex = (() => { let t: THREE.CanvasTexture | null = null; return () => { if (t) return t; const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); t = new THREE.CanvasTexture(c); return t; }; })();
/** choose which practicals get REAL lights: importance-weighted inverse distance to the shot focus (stable per shot) */
export const chooseReal = (ps: Practical[], focus: V3, budget: number) => [...ps].map((p) => ({ p, s: (p.importance ?? 0.5) * p.lumens / (1 + Math.hypot(p.pos[0] - focus[0], p.pos[1] - focus[1], p.pos[2] - focus[2]) ** 2 / (p.range * p.range)) }))
  .sort((a, b) => b.s - a.s || a.p.id.localeCompare(b.p.id)).slice(0, budget).map((x) => x.p.id);
/** practical flicker: deterministic, gentle (candles / fire / failing tubes only); amplitude <= 15 % */
export const flickerAt = (p: Practical, f: number) => { if (!p.flicker) return 1; const s = p.id.length * 1.37, t = f / 30; return 1 - p.flicker * 0.15 * (0.5 + 0.5 * (0.6 * Math.sin(t * 9.1 + s) + 0.4 * Math.sin(t * 23.7 + s * 2.1))); };
export const Practicals: React.FC<{ list: Practical[]; focus: V3; quality?: Quality; f: number; groundY?: number; exposure?: number }> = ({ list, focus, quality = "BALANCED", f, groundY = 0.01 }) => {
  const real = useMemo(() => new Set(chooseReal(list, focus, QUALITY[quality].practicalBudget)), [list, focus[0], focus[1], focus[2], quality]);
  return (<group>{list.map((p) => { const k = flickerAt(p, f) * (p.level ?? 1), I = (p.lumens / 800) * k, c = col(p.color), r = p.poolRadius ?? p.range * 0.45;
    return (<group key={p.id}>
      {/* the visible source: small emissive bulb / panel (bloom picks it up above the threshold) */}
      {p.kind !== "window" && p.kind !== "screen" && <mesh position={p.pos}><sphereGeometry args={[p.kind === "candle" ? 0.02 : 0.07, 10, 8]} /><meshBasicMaterial color={c.clone().multiplyScalar(2.5 * k + 0.5)} toneMapped={false} /></mesh>}
      {/* ground light pool: additive, zero lighting cost, softly falls off */}
      {p.kind !== "screen" && p.pos[1] > groundY + 0.2 && <mesh position={[p.pos[0], groundY, p.pos[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={[r * 2, r * 2, 1]} renderOrder={2}><planeGeometry args={[1, 1]} /><meshBasicMaterial map={radialTex()} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} blending={THREE.AdditiveBlending} color={c.clone().multiplyScalar(Math.min(1.2, 0.35 * I))} toneMapped={false} /></mesh>}
      {real.has(p.id) && (p.dir ? <spotLight position={p.pos} color={c} intensity={I * 18} distance={p.range} angle={p.angle ?? 0.9} penumbra={0.7} decay={2} target-position={[p.pos[0] + p.dir[0], p.pos[1] + p.dir[1], p.pos[2] + p.dir[2]]} />
        : <pointLight position={p.pos} color={c} intensity={I * 10} distance={p.range} decay={2} />)}
    </group>); })}</group>);
};

// ---------------------------------------------------------------- light shafts, contact shadows
const shaftTex = (() => { let t: THREE.CanvasTexture | null = null; return () => { if (t) return t; const c = document.createElement("canvas"); c.width = 16; c.height = 128; const g = c.getContext("2d")!, gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 16, 128); const h = g.createLinearGradient(0, 0, 16, 0); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.5, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = h; g.fillRect(0, 0, 16, 128); t = new THREE.CanvasTexture(c); return t; }; })();
/** additive light shaft from `from` along `dir`, `len` long, widening from w0 to w1; `strength` <= 0.25 keeps it subtle */
export const LightShaft: React.FC<{ from: V3; dir: V3; len: number; w0: number; w1: number; color: RGB; strength?: number }> = ({ from, dir, len, w0, w1, color, strength = 0.12 }) => {
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(...dir).normalize()), [dir[0], dir[1], dir[2]]);
  const mid: V3 = [from[0] + dir[0] * len * 0.5, from[1] + dir[1] * len * 0.5, from[2] + dir[2] * len * 0.5];
  return (<mesh position={mid} quaternion={q} renderOrder={3}><cylinderGeometry args={[w0 / 2, w1 / 2, len, 20, 1, true]} /><meshBasicMaterial map={shaftTex()} color={col(color).multiplyScalar(strength)} transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} toneMapped={false} /></mesh>);
};
const blobTex = (() => { let t: THREE.CanvasTexture | null = null; return () => { if (t) return t; const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d")!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(10,8,6,0.85)"); gr.addColorStop(0.6, "rgba(10,8,6,0.35)"); gr.addColorStop(1, "rgba(10,8,6,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); t = new THREE.CanvasTexture(c); return t; }; })();
const blobMats = new Map<number, THREE.MeshBasicMaterial>();
const blobMat = (o: number) => { const k = Math.round(o * 20) / 20; let m = blobMats.get(k); if (!m) { m = new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, opacity: k / 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }); blobMats.set(k, m); } return m; };
/** soft contact shadow under an object footprint (w x d metres): grounds props when SSAO is off or too subtle */
export const ContactShadow: React.FC<{ at: V3; w: number; d: number; rot?: number; opacity?: number }> = ({ at, w, d, rot = 0, opacity = 0.55 }) =>
  <mesh position={[at[0], at[1] + 0.004, at[2]]} rotation={[-Math.PI / 2, 0, rot]} scale={[w * 1.25, d * 1.25, 1]} renderOrder={1}><planeGeometry args={[1, 1]} /><primitive object={blobMat(opacity)} attach="material" /></mesh>;

// ---------------------------------------------------------------- weather particles (deterministic)
const hash = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
/** rain / snow / dust around `center` (an R-metre box), positions are pure functions of (index, frame) */
export const Weather: React.FC<{ kind: "rain" | "snow" | "dust"; f: number; center: V3; count?: number; R?: number; color?: RGB }> = ({ kind, f, center, count = kind === "rain" ? 1400 : kind === "snow" ? 900 : 260, R = kind === "dust" ? 4 : 14, color }) => {
  const mesh = useMemo(() => { const g = kind === "rain" ? new THREE.PlaneGeometry(0.012, 0.5) : new THREE.PlaneGeometry(kind === "snow" ? 0.03 : 0.012, kind === "snow" ? 0.03 : 0.012);
    const m = new THREE.MeshBasicMaterial({ color: col(color ?? (kind === "rain" ? [0.6, 0.65, 0.72] : kind === "snow" ? [0.95, 0.96, 0.98] : [1, 0.86, 0.62])), transparent: true, opacity: kind === "rain" ? 0.28 : kind === "snow" ? 0.85 : 0.5, depthWrite: false, blending: kind === "dust" ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide, toneMapped: kind !== "dust" });
    const im = new THREE.InstancedMesh(g, m, count); im.frustumCulled = false; return im; }, [kind, count]);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), t = f / 30;
  for (let i = 0; i < count; i++) {
    const speed = kind === "rain" ? 9 + 3 * hash(i, 1) : kind === "snow" ? 0.8 + 0.4 * hash(i, 1) : 0.05, H = kind === "dust" ? 3 : 12;
    const y = ((hash(i, 2) * H - t * speed) % H + H) % H, sway = kind === "snow" ? Math.sin(t * 0.9 + i) * 0.25 : kind === "dust" ? Math.sin(t * 0.3 + i * 1.3) * 0.4 : 0;
    p.set(center[0] + (hash(i, 3) - 0.5) * 2 * R + sway, center[1] + y - (kind === "dust" ? 0 : 1), center[2] + (hash(i, 4) - 0.5) * 2 * R + (kind === "dust" ? Math.cos(t * 0.27 + i) * 0.3 : 0));
    q.setFromEuler(new THREE.Euler(0, hash(i, 5) * Math.PI, kind === "rain" ? 0.08 : 0)); M.compose(p, q, s); mesh.setMatrixAt(i, M);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ---------------------------------------------------------------- water + puddles
/** Gerstner-wave water: vertex waves (2 octaves), body colour by view angle (fresnel via env), glints from low roughness */
export const WaterSurface: React.FC<{ size: [number, number]; at?: V3; f: number; deep?: string; shallow?: string; amp?: number; seg?: number; wet?: number }> = ({ size, at = [0, 0, 0], f, deep = "#123c48", shallow = "#2f6e72", amp = 0.12, seg = 96 }) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(size[0], size[1], seg, Math.round((seg * size[1]) / size[0])).rotateX(-Math.PI / 2), [size[0], size[1], seg]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: deep, roughness: 0.07, metalness: 0, envMapIntensity: 1.15, clearcoat: 0.6, clearcoatRoughness: 0.06, sheen: 0.2, sheenColor: new THREE.Color(shallow) }), [deep, shallow]);
  const t = f / 30, P = geo.attributes.position.array as Float32Array, waves = [[0.9, 0.35, 7.5, 0.5], [-0.4, 0.92, 3.6, 0.3], [0.6, -0.8, 1.7, 0.15]];
  for (let i = 0; i < P.length; i += 3) { const x = base[i], z = base[i + 2]; let dx = 0, dy = 0, dz = 0;
    for (const [wx, wz, L, a] of waves) { const k = (2 * Math.PI) / L, c = Math.sqrt(9.8 / k), ph = k * (wx * x + wz * z - c * t), A = amp * a; dx += wx * A * 0.6 * Math.cos(ph); dz += wz * A * 0.6 * Math.cos(ph); dy += A * Math.sin(ph); }
    P[i] = x + dx; P[i + 1] = dy; P[i + 2] = z + dz; }
  geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  return <mesh geometry={geo} material={mat} position={at} receiveShadow />;
};
/** a puddle: thin, very smooth dark decal that mirrors the environment / sky */
export const Puddle: React.FC<{ at: V3; r: number; sx?: number; rot?: number }> = ({ at, r, sx = 1.4, rot = 0 }) =>
  <mesh position={[at[0], at[1] + 0.006, at[2]]} rotation={[-Math.PI / 2, 0, rot]} scale={[sx, 1, 1]} receiveShadow><circleGeometry args={[r, 28]} /><meshPhysicalMaterial color="#1e2226" roughness={0.03} metalness={0} envMapIntensity={1.4} clearcoat={1} clearcoatRoughness={0.02} polygonOffset polygonOffsetFactor={-1} /></mesh>;
export { toHex };
