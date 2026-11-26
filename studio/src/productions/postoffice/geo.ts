// Hideaway Island geography (metres; water surface y = 0; +x east, +z south). One analytic height function shared by the
// terrain mesh, the surface shader's shore-depth texture, prop placement and the camera clearance checks.
// The island is an irregular ellipse whose south beach faces the post office; the bed shelves gently to ~3.2 m at the
// office (≈50 m out), stays sandy with patch reefs to ~62 m, then drops off the reef edge to 20+ m.
export const ISLAND = { cx: 10, cz: -190, rx: 190, rz: 140 };
export const PO = { x: 0, z: 0, y: -3.17, r: 1.12, rot: 0.18 };   // post office tank (base centre), counter faces +z rotated by rot

const fr = (x: number) => x - Math.floor(x);
const h2 = (x: number, y: number) => fr(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
const vn = (x: number, y: number) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
  return (h2(i, j) * (1 - a) + h2(i + 1, j) * a) * (1 - b) + (h2(i, j + 1) * (1 - a) + h2(i + 1, j + 1) * a) * b; };
export const fbm = (x: number, y: number, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vn(x * f, y * f); f *= 2.03; a *= 0.5; } return s; };
export const noise2 = vn;

/** signed distance to the island shore (m): negative on land */
export const shoreDist = (x: number, z: number) => {
  const dx = x - ISLAND.cx, dz = z - ISLAND.cz, ang = Math.atan2(dz, dx);
  const wob = 1 + 0.05 * Math.sin(ang * 3 + 0.7) + 0.03 * Math.sin(ang * 7 + 2.1) + 0.035 * (fbm(Math.cos(ang) * 2 + 5, Math.sin(ang) * 2 + 5) - 0.5);
  const r = Math.hypot(dx / ISLAND.rx, dz / ISLAND.rz) / wob, dist = Math.hypot(dx, dz);
  return (r - 1) * dist / Math.max(r, 1e-3);
};
const sat = (x: number) => Math.min(1, Math.max(0, x));
const ss = (a: number, b: number, x: number) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** ground / seabed height at (x, z) */
export const height = (x: number, z: number) => {
  const d = shoreDist(x, z);
  let y: number;
  if (d < 0) {   // land: wet beach -> dry beach -> berm -> vegetated interior (gentle hills)
    const k = -d; y = Math.min(k, 14) * 0.115 + ss(14, 24, k) * 1.0 + ss(24, 90, k) * (1.6 + 3.2 * fbm(x / 60 + 3, z / 60 + 1)) + 0.15 * (fbm(x / 9, z / 9) - 0.5) * ss(10, 30, k);
  } else {       // water: shelf -> sandy flat with patch reefs -> reef edge drop-off
    y = -(3.3 * (1 - Math.exp(-d / 15)) + Math.max(0, d - 62) * 0.19 + ss(62, 80, d) * 0.6);
    y += (fbm(x / 7 + 11, z / 7 - 4) - 0.5) * 0.35 * ss(4, 20, d) + (fbm(x / 23, z / 23) - 0.5) * 0.5 * ss(10, 40, d);
    y = Math.max(y, -26);
  }
  // the post office pad: a flattened sand patch around the tank
  const pr = Math.hypot(x - PO.x, z - PO.z); y = y + (PO.y - y) * (1 - ss(2.2, 5.5, pr));
  return y;
};
/** finite-difference normal */
export const normalAt = (x: number, z: number, e = 0.25): [number, number, number] => {
  const hx = height(x + e, z) - height(x - e, z), hz = height(x, z + e) - height(x, z - e); const l = Math.hypot(hx, 2 * e, hz); return [-hx / l, (2 * e) / l, -hz / l]; };
export const SUN_DIR: [number, number, number] = (() => { const v = [0.36, 0.84, 0.42], l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l] as [number, number, number]; })();
