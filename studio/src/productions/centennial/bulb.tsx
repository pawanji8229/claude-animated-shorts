// The Centennial Light (Shelby Electric Co., late 1890s): a hand-blown pear-shaped glass envelope with its sealed tip
// ("pip"), a looped + coiled CARBON filament on lead-in wires from a glass stem, an anchor wire, a brass screw base in a
// brass socket, hanging from a twisted cloth cord. It glows DIMLY (about 4 W today): a small orange-gold filament,
// a faint inner haze in the glass and a modest warm pool of light — never a bright modern lamp. glow = 0 -> off.
// Local frame: socket top at the origin, the bulb hangs down -y. Real size: glass about 15 cm long, 6.8 cm across.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Kit, KitMesh, once } from "../short3/kit";
import { cm } from "./mats";
import { glow as glowTex } from "../../hall/hallTextures";
import { rng, type V3 } from "../../lib/math";

// glass envelope profile (radius, y): neck at the base, widest a little below the middle, then the drawn tip + pip
const GLASS: [number, number][] = [[0.0128, -0.021], [0.0142, -0.028], [0.0188, -0.038], [0.0252, -0.05], [0.0302, -0.064], [0.0331, -0.08], [0.0338, -0.093], [0.0322, -0.108],
  [0.0278, -0.122], [0.0212, -0.134], [0.0136, -0.1435], [0.0068, -0.1495], [0.0034, -0.1525], [0.0026, -0.1565], [0.0014, -0.1592], [0.0, -0.1598]];
export const BULB_LEN = 0.22;           // socket top -> tip
export const FIL_C: V3 = [0, -0.083, 0]; // filament centre (local)

/** faint glass imperfections: wavy streaks + seeds (bubbles), used as a roughness/alpha variation */
const streakTex = () => once("cbStreak", () => { const c = document.createElement("canvas"); c.width = 256; c.height = 512; const g = c.getContext("2d")!, r = rng(19);
  g.fillStyle = "#808080"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 46; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${r() < 0.5 ? 255 : 0},${0.05 + r() * 0.08})`; g.lineWidth = 1 + r() * 3; const x = r() * 256; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 9, y); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * 256, r() * 512, 1 + r() * 2, 1.5 + r() * 2.5, 0, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; });

/** the carbon filament: a tall loop with one twisted coil at the bottom (Shelby's looped filament), on two leads */
const filamentCurve = () => { const pts: THREE.Vector3[] = [];
  const top = -0.058, bot = -0.112, hw = 0.0105;
  for (let i = 0; i <= 80; i++) { const s = i / 80, a = s * Math.PI * 2; // around the loop
    const x = -Math.sin(a) * hw * (0.9 + 0.1 * Math.cos(a)), y = top + (bot - top) * (1 - Math.cos(a)) / 2; let z = 0;
    // a coil where the loop turns at the bottom
    const coil = Math.exp(-Math.pow((s - 0.5) / 0.11, 2)); const ca = s * Math.PI * 2 * 7;
    const xx = x + Math.cos(ca) * 0.0044 * coil; z = Math.sin(ca) * 0.0044 * coil;
    pts.push(new THREE.Vector3(xx, y, z)); }
  pts[0].x = -0.0016; pts[pts.length - 1].x = 0.0016; return pts; };

const bulbKit = () => once("cbBulb", () => { const M = cm(), k = new Kit();
  // brass screw base: thread rings (sinusoidal radius) between the socket rim and the glass neck
  const thread: [number, number][] = []; for (let i = 0; i <= 40; i++) { const y = -0.0005 - (i / 40) * 0.02; thread.push([0.0132 + 0.0011 * Math.sin(i * 0.95), y]); }
  k.lathe(M.brass, thread, [0, 0, 0], 28, [0, 0, 0], { ink: false });
  k.lathe(M.ebonite, [[0.0122, -0.0206], [0.0128, -0.0216], [0.0126, -0.0226]], [0, 0, 0], 24, [0, 0, 0], { ink: false });
  // brass socket: rolled rim, knurled band, shell, domed cap, cord bushing
  k.torus(M.brassDark, 0.0172, 0.0016, [0, 0.0015, 0], [Math.PI / 2, 0, 0], Math.PI * 2, { ink: false });
  k.lathe(M.brass, [[0.0168, 0.001], [0.0174, 0.004], [0.0176, 0.03], [0.0172, 0.044], [0.0158, 0.05], [0.013, 0.056], [0.0088, 0.0605], [0.0062, 0.0625]], [0, 0, 0], 32, [0, 0, 0], { ink: 0.35 });
  for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; k.box(M.brassDark, [0.0012, 0.009, 0.0016], [Math.cos(a) * 0.0177, 0.035, Math.sin(a) * 0.0177], [0, -a, 0], { ink: false }); }
  k.torus(M.brassDark, 0.0177, 0.0009, [0, 0.0305, 0], [Math.PI / 2, 0, 0], Math.PI * 2, { ink: false });
  k.cyl(M.brassDark, 0.0052, 0.0062, 0.008, [0, 0.0665, 0], [0, 0, 0], 16, { ink: false });
  // glass stem (press) + lead-in wires + anchor wire, all inside the envelope
  k.lathe(M.glass, [[0.0098, -0.021], [0.0062, -0.03], [0.0042, -0.042], [0.0036, -0.05], [0.0046, -0.0535], [0.0, -0.0545]], [0, 0, 0], 16, [0, 0, 0], { ink: false });
  for (const s of [-1, 1]) k.rod(M.nickel, [s * 0.0016, -0.03, 0], [s * 0.0016, -0.0585, 0], 0.00028, 5, { ink: false });
  k.rod(M.nickel, [0, -0.054, 0], [0, -0.108, 0.0045], 0.00022, 4, { ink: false });
  return k; });

/** glass envelope: a dedicated shader so the bulb's own (inside) light cannot flood the glass. Clear glass reads by
 *  its Fresnel rims, two soft window-highlight streaks (reflected key + fill), faint imperfections (streaks, seeds)
 *  and, when lit, only a faint warm inner haze near the filament. */
export const glassShader = () => once("cbGlassMat", () => new THREE.ShaderMaterial({
  uniforms: { uGlow: { value: 1 }, uStreak: { value: streakTex() }, uKey: { value: new THREE.Vector3(-0.55, 0.45, 0.7).normalize() }, uKeyCol: { value: new THREE.Color(1.0, 0.95, 0.88) }, uRim: { value: 0.55 } },
  vertexShader: `varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying float vY;
    void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vY = position.y; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float uGlow; uniform sampler2D uStreak; uniform vec3 uKey; uniform vec3 uKeyCol; uniform float uRim; varying vec3 vN; varying vec3 vW; varying vec2 vUv; varying float vY;
    void main(){ vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); if (!gl_FrontFacing) n = -n; float ndv = clamp(dot(n, v), 0.0, 1.0);
      float fr = pow(1.0 - ndv, 3.0); vec3 r = reflect(-v, n);
      float key = pow(max(dot(r, uKey), 0.0), 60.0) * 2.4 + pow(max(dot(r, uKey), 0.0), 8.0) * 0.18;
      vec3 fill = normalize(vec3(0.7, 0.15, 0.5)); float f2 = pow(max(dot(r, fill), 0.0), 40.0) * 0.9;
      float st = texture2D(uStreak, vUv * vec2(3.0, 1.5)).r - 0.5;
      vec3 env = mix(vec3(0.05, 0.05, 0.06), vec3(0.22, 0.24, 0.27), clamp(r.y * 0.5 + 0.5, 0.0, 1.0));
      vec3 col = env * fr * 1.2 + uKeyCol * (key + f2) * (0.6 + 0.4 * fr);
      // faint warm haze inside, strongest around the filament height, a touch on the rims (light scattering in the glass)
      float hz = exp(-pow((vY + 0.083) / 0.045, 2.0));
      col += vec3(1.0, 0.52, 0.18) * uGlow * (0.05 * hz + 0.12 * fr);
      float a = clamp(0.035 + fr * uRim + (key + f2) * 0.5 + st * 0.06 + uGlow * 0.03 * hz, 0.0, 0.9);
      gl_FragColor = vec4(col / max(a, 0.02) * min(a, 1.0), a); }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide }));
const glassGeo = () => once("cbGlassGeo", () => { const c = new THREE.SplineCurve(GLASS.map(([x, y]) => new THREE.Vector2(x, y))); const pts = c.getSpacedPoints(110); pts[pts.length - 1].x = 0; return new THREE.LatheGeometry(pts, 72); });
const filGeo = () => once("cbFilGeo", () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(filamentCurve()), 420, 0.00085, 6, false));
/** twisted two-conductor cloth cord from the socket top up `len` metres */
const cordGeo = (len: number) => once(`cbCord${len.toFixed(3)}`, () => { const gs: THREE.BufferGeometry[] = [];
  for (const ph of [0, Math.PI]) { const pts: THREE.Vector3[] = []; const n = Math.max(40, Math.round(len / 0.004)); for (let i = 0; i <= n; i++) { const y = 0.062 + (i / n) * len, a = ph + (y / 0.022) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 0.0028, y, Math.sin(a) * 0.0028)); }
    gs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.0029, 6, false)); }
  return gs; });
const cordMat = () => once("cbCordMat", () => new THREE.MeshStandardMaterial({ color: "#3a2a1e", roughness: 0.92 }));

/** warm emissive colour of the filament for a glow level (HDR, just above the bloom threshold when fully on) */
export const filColor = (glow: number) => { const g = Math.max(0, glow); return new THREE.Color(0.06 + 2.6 * g, 0.03 + 1.05 * g, 0.012 + 0.26 * g); };

export type BulbProps = { p: V3; drop: number; glow: number; light?: number; halo?: number; hi?: boolean; shadow?: boolean };
/** the Centennial Light hanging from a ceiling point p (cord length `drop` to the socket top) */
export const CentennialLight: React.FC<BulbProps> = ({ p, drop, glow, light = 1, halo = 1, shadow = false }) => {
  const filMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []); filMat.color.copy(filColor(glow));
  const gm = glassShader(); const haloT = useMemo(() => glowTex("rgba(255,196,120,0.9)", "rgba(255,150,60,0)"), []);
  gm.uniforms.uGlow.value = glow;
  const top = drop + 0.062;
  return (<group position={[p[0], p[1] - top, p[2]]}>
    {cordGeo(drop).map((g, i) => <mesh key={i} geometry={g} material={cordMat()} castShadow />)}
    <KitMesh kit={bulbKit()} />
    <mesh geometry={filGeo()} material={filMat} />
    <mesh geometry={glassGeo()} material={gm} renderOrder={5} />
    {glow > 0.01 && <>
      <pointLight position={[0, -0.27, 0]} color="#ffae62" intensity={1.6 * glow * light} distance={9} decay={1.6} castShadow={shadow} shadow-mapSize-width={512} shadow-mapSize-height={512} shadow-bias={-0.002} />
      {halo > 0 && <>
        <sprite position={FIL_C} scale={[0.09, 0.11, 1]} renderOrder={6}><spriteMaterial map={haloT} transparent opacity={0.16 * glow * halo} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
        <sprite position={FIL_C} scale={[0.7, 0.75, 1]} renderOrder={6}><spriteMaterial map={haloT} transparent opacity={0.05 * glow * halo} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
      </>}
    </>}
  </group>);
};
/** world position of the filament for a bulb hung at p with cord `drop` */
export const filamentAt = (p: V3, drop: number): V3 => [p[0], p[1] - drop - 0.062 + FIL_C[1], p[2]];

/** dust motes drifting in the air around a point (macro shots): tiny soft specks, brighter near the glow */
export const Dust: React.FC<{ at: V3; t: number; n?: number; size?: V3; glow: number; seed?: number }> = ({ at, t, n = 90, size = [0.6, 0.5, 0.6], glow, seed = 7 }) => {
  const tex = useMemo(() => glowTex("rgba(255,240,220,1)", "rgba(255,220,180,0)"), []);
  const pts = useMemo(() => { const r = rng(seed); return Array.from({ length: n }, () => ({ o: [r() - 0.5, r() - 0.5, r() - 0.5], v: [(r() - 0.5) * 0.012, -0.004 - r() * 0.008, (r() - 0.5) * 0.012], s: 0.0012 + r() * 0.0024, ph: r() * 6.28 })); }, [n, seed]);
  return <>{pts.map((q, i) => { const wrap = (x: number) => ((x % 1) + 1.5) % 1 - 0.5;
    const x = wrap(q.o[0] + q.v[0] * t + Math.sin(t * 0.4 + q.ph) * 0.01) * size[0], y = wrap(q.o[1] + q.v[1] * t) * size[1], z = wrap(q.o[2] + q.v[2] * t + Math.cos(t * 0.33 + q.ph) * 0.01) * size[2];
    const d = Math.hypot(x, y, z), lit = 0.25 + glow * 0.9 * Math.exp(-d * d * 18);
    return <sprite key={i} position={[at[0] + x, at[1] + y, at[2] + z]} scale={[q.s, q.s, 1]}><spriteMaterial map={tex} transparent opacity={Math.min(1, lit) * 0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>; })}</>;
};
