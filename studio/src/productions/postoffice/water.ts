// Water as a participating medium for the whole Hideaway set (above and below the surface, one model):
//   * every fogged material (terrain, coral, post office, fish, character cards, props) gets a per-fragment WATER
//     MEDIUM pass instead of distance fog: light reaching a point under water is filtered by its depth (red dies
//     first), animated caustics play over everything below the surface (stronger in the shallows), and the part of
//     the eye ray that runs through water absorbs + in-scatters with per-channel coefficients (clear tropical water,
//     ~25 m visibility). It is exact for a camera above, below or straddling the surface (the ray's wet segment is
//     solved analytically), so the camera can rise through the surface in one move.
//   * the medium is switched on per scene by a sentinel Fog (near = -1, far = time in s, colour = scatter colour);
//     any other production's linear fog takes the untouched original code path, so earlier films render identically.
import * as THREE from "three";

const MEDIUM_GLSL = /* glsl */ `
varying vec3 vWaterW;
float wCaus(vec2 p, float t) {
  vec2 q = mod(p, 6.2831853) - 250.0; vec2 i = q; float c = 1.0; const float inten = 0.005;
  for (int n = 0; n < 4; n++) { float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = q + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(q.x / (sin(i.x + tt) / inten), q.y / (cos(i.y + tt) / inten))); }
  c /= 4.0; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.0);
}
vec3 waterMedium(vec3 col, vec3 P, float t, vec3 scatter) {
  vec3 C = cameraPosition; float L = length(P - C), dy = P.y - C.y, f;
  if (C.y < 0.0 && P.y < 0.0) f = 1.0; else if (C.y >= 0.0 && P.y >= 0.0) f = 0.0;
  else { float tc = clamp(-C.y / (abs(dy) < 1e-4 ? 1e-4 : dy), 0.0, 1.0); f = C.y < 0.0 ? tc : 1.0 - tc; }
  float Lw = L * f;
  if (P.y < 0.0) {
    float dep = -P.y;
    col *= exp(-vec3(0.13, 0.032, 0.022) * dep);                                   // downwelling sunlight filtered by depth
    vec2 cp = P.xz * 1.05 + vec2(P.y * 0.3, 0.0);
    float c1 = wCaus(cp, t * 0.6), c2 = wCaus(cp * 0.47 + 3.1, t * 0.43 + 2.0);
    float cz = c1 * 0.65 + c2 * 0.55;
    float k = 2.1 * exp(-dep * 0.1) * smoothstep(0.02, 0.35, dep);
    col *= 1.0 + k * (cz - 0.22) * vec3(0.95, 1.0, 1.0);
  }
  vec3 sig = vec3(0.17, 0.05, 0.04);
  vec3 tr = exp(-sig * Lw);
  float deep = max(-P.y, -C.y);
  vec3 sc = scatter * mix(1.0, 0.6, smoothstep(2.0, 20.0, deep));
  col = col * tr + sc * (1.0 - tr);
  float La = L - Lw; float hz = 1.0 - exp(-La * 0.00022);                           // aerial perspective above the water
  return mix(col, vec3(0.74, 0.85, 0.94), hz * 0.85);
}
`;
let patched = false;
export const patchWaterChunks = () => {
  if (patched) return; patched = true;
  const C = THREE.ShaderChunk as unknown as Record<string, string>;
  C.fog_pars_vertex = `#ifdef USE_FOG\n\tvarying float vFogDepth;\n\tvarying vec3 vWaterW;\n#endif`;
  C.fog_vertex = `#ifdef USE_FOG\n\tvFogDepth = - mvPosition.z;\n\tvWaterW = (inverse(viewMatrix) * mvPosition).xyz;\n#endif`;
  C.fog_pars_fragment = `#ifdef USE_FOG\n\tuniform vec3 fogColor;\n\tvarying float vFogDepth;\n\t#ifdef FOG_EXP2\n\t\tuniform float fogDensity;\n\t#else\n\t\tuniform float fogNear;\n\t\tuniform float fogFar;\n${MEDIUM_GLSL}\n\t#endif\n#endif`;
  C.fog_fragment = `#ifdef USE_FOG\n\t#ifdef FOG_EXP2\n\t\tfloat fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );\n\t\tgl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );\n\t#else\n\t\tif ( fogNear < -0.5 ) { gl_FragColor.rgb = waterMedium( gl_FragColor.rgb, vWaterW, fogFar, fogColor ); }\n\t\telse { float fogFactor = smoothstep( fogNear, fogFar, vFogDepth ); gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor ); }\n\t#endif\n#endif`;
};
patchWaterChunks();

/** the sentinel fog that turns the medium on: colour = in-scatter colour of the water, far = time (s) for caustics */
export const SCATTER = new THREE.Color("#2a8fb6");
export const mediumFog = (t: number, scatter: THREE.Color = SCATTER) => { const f = new THREE.Fog(scatter, -1, t); return f; };
/** same model in JS (camera clearance, card legibility checks) */
export const SIGMA = [0.28, 0.068, 0.05];

/** shared GLSL helpers for the custom shaders (sky dome / surface / rays / snow) */
export const SKY_GLSL = /* glsl */ `
uniform vec3 uSun;
vec3 skyCol(vec3 d) {
  float h = clamp(d.y, -0.2, 1.0);
  vec3 zen = vec3(0.18, 0.42, 0.78), hor = vec3(0.70, 0.84, 0.95), low = vec3(0.55, 0.66, 0.72);
  vec3 c = mix(hor, zen, pow(max(h, 0.0), 0.55)); c = mix(low, c, smoothstep(-0.2, 0.02, h));
  float s = max(dot(d, uSun), 0.0); c += vec3(1.0, 0.92, 0.75) * (pow(s, 10.0) * 0.18 + pow(s, 600.0) * 18.0);
  return c * 1.25;
}
vec3 deepCol(vec3 d, vec3 scatter) { // looking through open water from a camera below the surface
  float u = d.y; vec3 up = scatter * 1.65 + vec3(0.02, 0.06, 0.06), mid = scatter * 0.9, dn = scatter * 0.28;
  vec3 c = mix(mid, up, smoothstep(0.0, 0.85, u)); c = mix(dn, c, smoothstep(-0.75, 0.05, u));
  return c;
}`;
