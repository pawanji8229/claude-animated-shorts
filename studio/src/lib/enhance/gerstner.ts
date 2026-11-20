// Optional enhancement (off unless a scene imports it): deterministic spectral Gerstner ocean.
// Adapted from skywalkerqqq/water-three-js (MIT, (c) 2026 skywalkerqqq), src/Ocean.js `_gerstner()` + `surfaceSample()`:
// a sum of Gerstner waves with deep-water dispersion (w = sqrt(g k)) and choppy horizontal displacement. Here it is a
// pure function of (x, z, t) with a fixed seeded spectrum, so frame N always gives the same surface (Remotion seeks
// frames out of order and the cloud renderer splits videos across machines). Use it for hull bobbing / buoys / any CPU
// surface query, or to displace a plane per frame. The approved TwistFrame sea shaders are NOT replaced.
export type Wave = { dx: number; dz: number; k: number; A: number; phase: number };
export type OceanSpec = { waves: Wave[]; choppy: number; speed: number; level: number };
const G = 9.81;
const hash = (i: number, s: number) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
/** a wind-sea spectrum: `n` waves from swell (peakWavelength) down to chop, spread around windDir (radians) */
export const oceanSpec = (o: { n?: number; peakWavelength?: number; height?: number; windDir?: number; spread?: number; choppy?: number; speed?: number; level?: number; seed?: number } = {}): OceanSpec => {
  const n = o.n ?? 24, L0 = o.peakWavelength ?? 18, H = o.height ?? 0.6, dir = o.windDir ?? 0, spread = o.spread ?? 0.6, seed = o.seed ?? 1;
  const waves: Wave[] = []; let m0 = 0;
  for (let i = 0; i < n; i++) { const L = L0 * Math.pow(0.78, i), k = (2 * Math.PI) / L, a = Math.pow(0.82, i);
    const sp = spread * (0.45 + 0.9 * Math.min(1.2, i / n * 2)), ang = dir + (hash(i, seed) * 2 - 1) * sp;
    waves.push({ dx: Math.cos(ang), dz: Math.sin(ang), k, A: a, phase: hash(i, seed + 9.1) * Math.PI * 2 }); m0 += 0.5 * a * a; }
  const scale = H / (4 * Math.sqrt(m0)); for (const w of waves) w.A *= scale;          // significant wave height = H
  return { waves, choppy: o.choppy ?? 0.6, speed: o.speed ?? 1, level: o.level ?? 0 };
};
export type OceanSample = { dx: number; dz: number; h: number; nx: number; ny: number; nz: number };
/** Gerstner sample at a REST position (x, z): horizontal displacement, height and analytic normal */
export const gerstner = (S: OceanSpec, x: number, z: number, t: number): OceanSample => {
  const n = Math.max(S.waves.length, 1); let px = 0, py = 0, pz = 0, nx = 0, ny = 1, nz = 0;
  for (const w of S.waves) { if (w.A <= 1e-6) continue;
    const Q = S.choppy / Math.max(w.k * w.A * n, 1e-3), arg = w.k * (w.dx * x + w.dz * z) + t * Math.sqrt(G * w.k) * S.speed + w.phase;
    const s = Math.sin(arg), c = Math.cos(arg), WA = w.k * w.A;
    px += Q * w.A * w.dx * c; pz += Q * w.A * w.dz * c; py += w.A * s; nx -= w.dx * WA * c; nz -= w.dz * WA * c; ny -= Q * WA * s; }
  const inv = 1 / Math.hypot(nx, ny, nz);
  return { dx: px, dz: pz, h: S.level + py, nx: nx * inv, ny: ny * inv, nz: nz * inv };
};
/** height + normal of the VISIBLE surface above world (x, z): inverts the horizontal displacement (fixed-point) */
export const oceanSurface = (S: OceanSpec, x: number, z: number, t: number): OceanSample => {
  let rx = x, rz = z, o = gerstner(S, rx, rz, t);
  for (let it = 0; it < 4; it++) { rx = x - o.dx; rz = z - o.dz; o = gerstner(S, rx, rz, t); }
  return o;
};
/** a floating body: heave from the surface height, pitch / roll from the surface normal (eased by hull size) */
export const floatPose = (S: OceanSpec, x: number, z: number, t: number, hull = 1): { y: number; pitch: number; roll: number } => {
  const avg = (fx: number, fz: number) => oceanSurface(S, x + fx * hull, z + fz * hull, t);
  const c = oceanSurface(S, x, z, t), f = avg(0.5, 0), b = avg(-0.5, 0), l = avg(0, 0.5), r = avg(0, -0.5);
  return { y: (c.h * 2 + f.h + b.h + l.h + r.h) / 6, pitch: Math.atan2(f.h - b.h, hull), roll: Math.atan2(l.h - r.h, hull) };
};
