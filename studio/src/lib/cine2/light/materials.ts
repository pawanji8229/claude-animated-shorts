// Lighting 2.0 material response library: physically sensible PBR parameters per surface type (roughness, metalness,
// env reflection, albedo range), seeded procedural variation maps (albedo + roughness breakup, grime, edge wear) so
// surfaces never look like flat plastic, and a wetness modifier (darker albedo, lower roughness, stronger reflections)
// that weather drives. Materials are cached and shared (one material per type+variant) to keep draw state small.
import * as THREE from "three";
import { rng } from "../../math";

export type Surface = "concrete" | "stone" | "brick" | "wood" | "metal" | "paintedMetal" | "rust" | "glass" | "water" | "asphalt" | "soil" | "sand" | "vegetation" | "fabric" | "plastic" | "rubber" | "plaster" | "tile" | "gravel" | "emissive";
type Def = { color: string; rough: number; metal: number; env: number; vary: number; grime: number; noiseScale: number; transparent?: boolean; opacity?: number; note: string };
/** measured-albedo-style defaults (sRGB colours, roughness / metalness) per surface */
export const SURFACES: Record<Surface, Def> = {
  concrete: { color: "#9a968e", rough: 0.88, metal: 0, env: 0.6, vary: 0.18, grime: 0.35, noiseScale: 3, note: "matte, broad tonal breakup, never shiny" },
  stone: { color: "#8c8478", rough: 0.82, metal: 0, env: 0.6, vary: 0.22, grime: 0.3, noiseScale: 2, note: "slightly smoother than concrete, warm variation" },
  brick: { color: "#8a4a36", rough: 0.86, metal: 0, env: 0.5, vary: 0.25, grime: 0.3, noiseScale: 6, note: "per-brick colour variation, mortar darker" },
  wood: { color: "#7a5a3c", rough: 0.7, metal: 0, env: 0.6, vary: 0.2, grime: 0.2, noiseScale: 8, note: "grain-direction streaks, satin" },
  metal: { color: "#a4a8ac", rough: 0.38, metal: 1, env: 1, vary: 0.12, grime: 0.25, noiseScale: 4, note: "metallic needs env reflections to read; roughness breakup avoids a flat mirror" },
  paintedMetal: { color: "#3d5e6e", rough: 0.5, metal: 0.15, env: 0.8, vary: 0.12, grime: 0.35, noiseScale: 4, note: "paint over metal: low metalness, chipped edges" },
  rust: { color: "#7a4128", rough: 0.9, metal: 0.25, env: 0.5, vary: 0.3, grime: 0.2, noiseScale: 5, note: "rough, warm, blotchy" },
  glass: { color: "#cfe0e8", rough: 0.06, metal: 0, env: 1.2, vary: 0.04, grime: 0.15, noiseScale: 2, transparent: true, opacity: 0.32, note: "low roughness, strong env reflection, some opacity so it reads as glass (not a hole)" },
  water: { color: "#2e5662", rough: 0.08, metal: 0, env: 1.1, vary: 0.1, grime: 0, noiseScale: 1, note: "dark body colour, bright reflections; use WaterSurface for waves + glints" },
  asphalt: { color: "#3e3d3b", rough: 0.9, metal: 0, env: 0.5, vary: 0.15, grime: 0.25, noiseScale: 10, note: "dark, matte; wetness makes it reflective" },
  soil: { color: "#5e4a36", rough: 0.95, metal: 0, env: 0.4, vary: 0.25, grime: 0.1, noiseScale: 4, note: "very matte, warm" },
  sand: { color: "#cdb38a", rough: 0.93, metal: 0, env: 0.5, vary: 0.12, grime: 0.05, noiseScale: 6, note: "bright, matte, fine variation" },
  vegetation: { color: "#4e6e34", rough: 0.75, metal: 0, env: 0.4, vary: 0.25, grime: 0, noiseScale: 3, note: "saturated but not neon; varied hue" },
  fabric: { color: "#6a5a4a", rough: 0.95, metal: 0, env: 0.3, vary: 0.1, grime: 0.15, noiseScale: 12, note: "sheen-free matte" },
  plastic: { color: "#c8443a", rough: 0.45, metal: 0, env: 0.7, vary: 0.06, grime: 0.15, noiseScale: 3, note: "smooth but not glossy" },
  rubber: { color: "#222222", rough: 0.85, metal: 0, env: 0.3, vary: 0.05, grime: 0.1, noiseScale: 3, note: "tyres, fenders, cable" },
  plaster: { color: "#d6cfc2", rough: 0.9, metal: 0, env: 0.5, vary: 0.1, grime: 0.3, noiseScale: 2, note: "light walls with subtle staining" },
  tile: { color: "#b9b4aa", rough: 0.4, metal: 0, env: 0.8, vary: 0.08, grime: 0.2, noiseScale: 8, note: "glazed: moderate sheen" },
  gravel: { color: "#85807a", rough: 0.95, metal: 0, env: 0.4, vary: 0.3, grime: 0.1, noiseScale: 16, note: "noisy, matte" },
  emissive: { color: "#ffe8c0", rough: 0.6, metal: 0, env: 0.2, vary: 0, grime: 0, noiseScale: 1, note: "self-lit (lamps, windows, screens)" },
};
const texCache = new Map<string, THREE.CanvasTexture>();
/** seeded variation map: R,G,B = broad tonal breakup, fine roughness noise, grime (darker toward the bottom / edges) */
export const variationTexture = (seed: number, scale: number, size = 128) => {
  const k = `${seed}:${scale}:${size}`; const hit = texCache.get(k); if (hit) return hit;
  const c = typeof document !== "undefined" ? document.createElement("canvas") : null; if (!c) return null as unknown as THREE.CanvasTexture;
  c.width = c.height = size; const g = c.getContext("2d")!, img = g.createImageData(size, size), r = rng(seed * 7919 + 13);
  const grid = (n: number) => { const a = Array.from({ length: (n + 1) * (n + 1) }, () => r()); return (x: number, y: number) => { const fx = x * n, fy = y * n, ix = Math.floor(fx) % n, iy = Math.floor(fy) % n, tx = fx - Math.floor(fx), ty = fy - Math.floor(fy), s = (t: number) => t * t * (3 - 2 * t);
    const at = (i: number, j: number) => a[((j % n) * (n + 1)) + (i % n)]; return at(ix, iy) * (1 - s(tx)) * (1 - s(ty)) + at(ix + 1, iy) * s(tx) * (1 - s(ty)) + at(ix, iy + 1) * (1 - s(tx)) * s(ty) + at(ix + 1, iy + 1) * s(tx) * s(ty); }; };
  const n1 = grid(Math.max(2, Math.round(scale))), n2 = grid(Math.max(4, Math.round(scale * 4))), n3 = grid(Math.max(8, Math.round(scale * 12)));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const u = x / size, v = y / size, i = (y * size + x) * 4;
    img.data[i] = 255 * (0.55 * n1(u, v) + 0.45 * n2(u, v)); img.data[i + 1] = 255 * n3(u, v); img.data[i + 2] = 255 * Math.min(1, Math.pow(v, 2.2) * 0.8 + 0.4 * n2(u + 0.37, v)); img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; texCache.set(k, t); return t;
};
const matCache = new Map<string, THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial>();
/**
 * A shared, lit material for a surface type. `variant` picks a deterministic colour / roughness variation (0..n), `wet`
 * 0..1 applies the wetness response, `tint` multiplies the base colour. Variation is applied in the shader from the
 * seeded variation map (albedo breakup + roughness noise + grime), so one material covers a whole family of objects.
 */
export const surfaceMaterial = (s: Surface, o: { variant?: number; wet?: number; tint?: string; emissive?: string; emissiveIntensity?: number; repeat?: number } = {}) => {
  const d = SURFACES[s], v = o.variant ?? 0, wet = Math.round((o.wet ?? 0) * 10) / 10, key = `${s}|${v}|${wet}|${o.tint ?? ""}|${o.emissive ?? ""}|${o.emissiveIntensity ?? ""}|${o.repeat ?? 1}`;
  const hit = matCache.get(key); if (hit) return hit;
  const r = rng(v * 131 + s.length * 17)(), base = new THREE.Color(o.tint ?? d.color).multiplyScalar(1 + (r - 0.5) * d.vary);
  // wetness: darker albedo (water fills pores), much lower roughness, stronger reflections (porous surfaces darken most)
  const porous = d.metal < 0.5 && !d.transparent ? 1 : 0.3; base.multiplyScalar(1 - 0.35 * wet * porous);
  const rough = Math.max(0.05, d.rough * (1 - 0.72 * wet) * (1 + (r - 0.5) * 0.12));
  const P = { color: base, roughness: rough, metalness: d.metal, envMapIntensity: d.env * (1 + 0.8 * wet), transparent: !!d.transparent, opacity: d.opacity ?? 1, depthWrite: !d.transparent,
    emissive: new THREE.Color(o.emissive ?? (s === "emissive" ? d.color : "#000000")), emissiveIntensity: o.emissiveIntensity ?? (s === "emissive" ? 2.2 : 0) };
  const m = s === "glass" || s === "water" ? new THREE.MeshPhysicalMaterial({ ...P, clearcoat: 0.3, clearcoatRoughness: 0.1, ior: 1.33 }) : new THREE.MeshStandardMaterial(P);
  const vt = variationTexture(v + s.length * 7, d.noiseScale); const rep = o.repeat ?? 1;
  if (vt && d.vary > 0) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.varTex = { value: vt }; sh.uniforms.varAmt = { value: d.vary }; sh.uniforms.grimeAmt = { value: d.grime }; sh.uniforms.varRep = { value: rep };
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWorldP; varying vec3 vWorldN;").replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWorldN = normalize(mat3(modelMatrix) * objectNormal);");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D varTex; uniform float varAmt; uniform float grimeAmt; uniform float varRep; varying vec3 vWorldP; varying vec3 vWorldN;\nvec3 triVar(vec3 p, vec3 n){ vec3 w = abs(n); w /= (w.x + w.y + w.z + 1e-4); return texture2D(varTex, p.yz * 0.25 * varRep).rgb * w.x + texture2D(varTex, p.xz * 0.25 * varRep).rgb * w.y + texture2D(varTex, p.xy * 0.25 * varRep).rgb * w.z; }")
        .replace("#include <map_fragment>", "#include <map_fragment>\nvec3 vv = triVar(vWorldP, vWorldN); diffuseColor.rgb *= 1.0 + (vv.r - 0.5) * 2.0 * varAmt; diffuseColor.rgb *= 1.0 - grimeAmt * 0.35 * smoothstep(0.55, 1.0, vv.b) * clamp(1.0 - vWorldP.y * 0.25, 0.0, 1.0);")
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * (0.85 + 0.3 * vv.g), 0.04, 1.0);");
    };
    m.customProgramCacheKey = () => `tf-surface-${s}`;
  }
  matCache.set(key, m); return m;
};
/** albedo sanity range per surface (linear luminance) - used by Lighting QC to flag 'unexpected material brightness' */
export const albedoRange = (s: Surface): [number, number] => (s === "emissive" ? [0, 10] : s === "sand" || s === "plaster" ? [0.25, 0.75] : s === "asphalt" || s === "rubber" ? [0.01, 0.12] : [0.02, 0.7]);
