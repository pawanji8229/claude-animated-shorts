// Procedural PBR texture + UV helpers for original TwistFrame models (runs in the browser page with three.js).
// Every material gets a colour map + a tangent-space normal map (derived from the same height field by central
// differences) + a roughness map, all tileable, so surfaces are never flat colour. UVs are in METRES (box mapping), so
// a texture tile covers a known real-world size at any object scale.
import * as THREE from "three";
export const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
/** tileable value noise on an n x n grid (periodic) */
function noise(n, cells, seed) { const r = rng(seed), g = Array.from({ length: cells * cells }, r), out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const fx = (x / n) * cells, fy = (y / n) * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, s = (t) => t * t * (3 - 2 * t);
    const at = (i, j) => g[((j % cells) + cells) % cells * cells + ((i % cells) + cells) % cells]; const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    out[y * n + x] = (a + (b - a) * s(tx)) + ((c + (d - c) * s(tx)) - (a + (b - a) * s(tx))) * s(ty); } return out; }
export const fbm = (n, seed, oct = [[4, 0.5], [8, 0.25], [16, 0.15], [32, 0.1]]) => { const out = new Float32Array(n * n); oct.forEach(([c, w], i) => { const f = noise(n, c, seed + i * 101); for (let k = 0; k < out.length; k++) out[k] += f[k] * w; }); return out; };
function canvasOf(n, fn) { const c = document.createElement("canvas"); c.width = c.height = n; const g = c.getContext("2d"), img = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const [r, gg, b] = fn(i % n, Math.floor(i / n), i); img.data.set([r, gg, b, 255], i * 4); } g.putImageData(img, 0, 0); return c; }
const tex = (c, srgb, mime = "image/jpeg") => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.userData.mimeType = mime; return t; };
/** build a PBR material from a height field + colour + roughness functions; strength = normal depth */
export function pbr(name, n, height, colour, rough, { strength = 2, metalness = 0, side = THREE.FrontSide } = {}) {
  const h = (x, y) => height[((y + n) % n) * n + ((x + n) % n)];
  const map = canvasOf(n, (x, y, i) => colour(x, y, i)), nor = canvasOf(n, (x, y) => { const dx = (h(x + 1, y) - h(x - 1, y)) * strength, dy = (h(x, y + 1) - h(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1);
    return [(-dx / l * 0.5 + 0.5) * 255, (dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255]; }), rgh = canvasOf(n, (x, y, i) => { const v = Math.max(0, Math.min(1, rough(x, y, i))) * 255; return [0, v, metalness * 255]; });
  const m = new THREE.MeshStandardMaterial({ name, map: tex(map, true), normalMap: tex(nor, false), roughnessMap: tex(rgh, false), metalnessMap: metalness ? tex(rgh, false) : null, roughness: 1, metalness: metalness ? 1 : 0, side });
  return m;
}
/** metre-based box UVs for any BufferGeometry: each face projects along its dominant normal axis; tile = metres per texture repeat */
export function boxUV(geo, tile = 1) { const p = geo.attributes.position, nrm = geo.attributes.normal ?? (geo.computeVertexNormals(), geo.attributes.normal), uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const [u, v] = ax >= ay && ax >= az ? [z, y] : ay >= az ? [x, z] : [x, y]; uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile; }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); return geo; }
