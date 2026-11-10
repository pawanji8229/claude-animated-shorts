// Self-contained post pipeline for headless/software-GL rendering in Remotion.
// Why not @react-three/postprocessing: under @remotion/three's "frameloop=never" + SwiftShader its scene pass came
// out empty (transparent) in every configuration we tried, so the composited frame was black.
//
// Steps (all linear HDR until the final pass):
//   1. scene -> HalfFloat target at `ss`x supersampling, with a depth texture
//   2. DOF: half- and quarter-res blurred copies; circle of confusion from linear depth vs focus distance
//   3. Bloom: soft-threshold bright pass + 5-level downsample/blur pyramid
//   4. Composite: DOF mix + bloom -> exposure -> Khronos PBR Neutral tone map -> warm/cool split grade ->
//      vignette -> sRGB encode, drawn to the canvas (box-downsampled from the supersampled target = clean AA).
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { getInputProps } from "remotion";
import { SINGLE_RENDER } from "./renderFlags";

// Opt-in profiling (pipeline/bench): pass inputProps {__bench: true}. Times each GPU stage with gl.finish() and logs
// "[bench] {...}" to the browser console. Without the prop nothing changes (no finish() stalls, no extra renders).
const BENCH = (() => { try { return !!(getInputProps() as { __bench?: boolean }).__bench; } catch { return false; } })();

export type PostParams = {
  focusDist: number; // world units from camera
  focusRange: number; // in-focus depth band (world units)
  maxBlur: number; // 0..1 strength of the background/foreground blur
  bloom: number; // bloom intensity
  threshold: number; // HDR luminance where bloom starts
  exposure: number;
  vignette: number;
  ss: number; // supersampling factor for the scene target
  contrast?: number; // filmic S-curve strength around mid-grey (1 = none)
  saturation?: number;
  lift?: number; // black level lift (keeps shadow detail)
  warmCool?: number; // strength of the warm-highlight / cool-shadow split (0..1)
  ao?: number; // screen-space ambient occlusion strength (0 = off)
  aoRadius?: number; // AO radius in metres
};

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BLUR = /* glsl */ `
uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
void main(){
  vec4 c = texture2D(tex, vUv) * 0.2270270270;
  c += texture2D(tex, vUv + dir * 1.3846153846) * 0.3162162162;
  c += texture2D(tex, vUv - dir * 1.3846153846) * 0.3162162162;
  c += texture2D(tex, vUv + dir * 3.2307692308) * 0.0702702703;
  c += texture2D(tex, vUv - dir * 3.2307692308) * 0.0702702703;
  gl_FragColor = c;
}`;

const DOWN = /* glsl */ `
uniform sampler2D tex; uniform vec2 texel; uniform float threshold; uniform float bright; varying vec2 vUv;
// NaN/Inf/negative guard: one bad HDR pixel would otherwise be smeared into dark blocks by the blur/bloom pyramid
vec3 sane(vec3 v){ bool ok = v.r < 6e4 && v.g < 6e4 && v.b < 6e4 && v.r >= 0.0 && v.g >= 0.0 && v.b >= 0.0; return ok ? v : vec3(0.0); }
void main(){
  vec4 a = texture2D(tex, vUv + texel * vec2(-1.0,-1.0));
  vec4 b = texture2D(tex, vUv + texel * vec2( 1.0,-1.0));
  vec4 c = texture2D(tex, vUv + texel * vec2(-1.0, 1.0));
  vec4 d = texture2D(tex, vUv + texel * vec2( 1.0, 1.0));
  vec3 col = (sane(a.rgb) + sane(b.rgb) + sane(c.rgb) + sane(d.rgb)) * 0.25;
  if (bright > 0.5) {
    float l = max(col.r, max(col.g, col.b));
    float knee = threshold * 0.5;
    float soft = clamp(l - threshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 1e-4);
    float w = max(soft, l - threshold) / max(l, 1e-4);
    col *= w;
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const COMPOSITE = /* glsl */ `
uniform sampler2D sharp; uniform sampler2D depthTex; uniform sampler2D half1; uniform sampler2D quarter;
uniform sampler2D b0; uniform sampler2D b1; uniform sampler2D b2; uniform sampler2D b3; uniform sampler2D b4;
uniform vec2 sharpTexel;
uniform float cNear; uniform float cFar; uniform float focusDist; uniform float focusRange; uniform float maxBlur;
uniform float bloom; uniform float exposure; uniform float vignette; uniform float aspect;
uniform float contrast; uniform float saturation; uniform float lift; uniform float warmCool;
uniform float aoStrength; uniform float aoRadius; uniform float projScale;
varying vec2 vUv;
float linDepth(float d){ float z = d * 2.0 - 1.0; return (2.0 * cNear * cFar) / (cFar + cNear - z * (cFar - cNear)); }
vec3 neutral(vec3 color){
  const float sc = 0.8 - 0.04; const float desat = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= off;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < sc) return color;
  const float d = 1.0 - sc;
  float np = 1.0 - d * d / (peak + d - sc);
  color *= np / peak;
  float g = 1.0 - 1.0 / (desat * (peak - np) + 1.0);
  return mix(color, vec3(np), g);
}
vec3 sane(vec3 v){ bool ok = v.r < 6e4 && v.g < 6e4 && v.b < 6e4 && v.r >= 0.0 && v.g >= 0.0 && v.b >= 0.0; return ok ? v : vec3(0.0); }
vec3 toSRGB(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  // 2x2 box resolve of the supersampled target (clean anti-aliasing)
  vec3 s = (sane(texture2D(sharp, vUv + sharpTexel * vec2(-0.5,-0.5)).rgb) + sane(texture2D(sharp, vUv + sharpTexel * vec2(0.5,-0.5)).rgb)
          + sane(texture2D(sharp, vUv + sharpTexel * vec2(-0.5, 0.5)).rgb) + sane(texture2D(sharp, vUv + sharpTexel * vec2(0.5, 0.5)).rgb)) * 0.25;
  // circle of confusion (use the nearest depth of a small neighbourhood so in-focus edges stay crisp)
  float z = linDepth(texture2D(depthTex, vUv).r);
  float coc = clamp((abs(z - focusDist) - focusRange * 0.5) / (focusDist * 0.9 + 0.5), 0.0, 1.0) * maxBlur;
  vec3 h = texture2D(half1, vUv).rgb, q = texture2D(quarter, vUv).rgb;
  vec3 col = coc < 0.5 ? mix(s, h, coc * 2.0) : mix(h, q, (coc - 0.5) * 2.0);
  // depth-only SSAO: 12 spiral samples, radius in metres projected to pixels, range-checked (no halos)
  if (aoStrength > 0.0) {
    float occ = 0.0;
    float rpx = clamp(aoRadius * projScale / max(z, 0.3), 2.0, 60.0);
    float jitter = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      float ang = fi * 2.39996 + jitter, rr = (fi + 1.0) / 12.0;
      vec2 o = vec2(cos(ang), sin(ang)) * rpx * rr * sharpTexel * 2.0;
      float zs = linDepth(texture2D(depthTex, vUv + o).r);
      float d = z - zs;
      occ += clamp(d / (aoRadius * 0.5), 0.0, 1.0) * (1.0 - smoothstep(aoRadius, aoRadius * 3.0, d));
    }
    col *= 1.0 - aoStrength * (occ / 12.0);
  }
  // bloom pyramid
  vec3 bl = texture2D(b0, vUv).rgb * 0.5 + texture2D(b1, vUv).rgb * 0.6 + texture2D(b2, vUv).rgb * 0.7
          + texture2D(b3, vUv).rgb * 0.8 + texture2D(b4, vUv).rgb * 0.9;
  col += bl * bloom * 0.3;
  col *= exposure;
  col = neutral(col);
  // split grade: cool the shadows a touch, warm the highlights (motivated tungsten vs moonlight)
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, mix(col * vec3(0.9, 0.96, 1.14), col * vec3(1.06, 1.0, 0.9), smoothstep(0.08, 0.65, lum)), warmCool);
  // filmic contrast (S-curve in a perceptual-ish domain), saturation, black lift
  vec3 pc = pow(max(col, 0.0), vec3(1.0 / 2.2));
  pc = clamp(0.5 + (pc - 0.5) * contrast, 0.0, 1.0);
  pc = mix(pc, smoothstep(0.0, 1.0, pc), (contrast - 1.0) * 0.8);
  col = pow(pc, vec3(2.2));
  float l2 = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(l2), col, saturation), 0.0);
  col = lift + col * (1.0 - lift);
  // vignette
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0) * 1.15;
  col *= mix(1.0, smoothstep(0.95, 0.25, length(p)), vignette);
  gl_FragColor = vec4(toSRGB(col), 1.0);
}`;

const makeRT = (w: number, h: number, depth = false) => {
  const rt = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: depth, colorSpace: THREE.LinearSRGBColorSpace,
  });
  if (depth) { rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.type = THREE.UnsignedIntType; }
  return rt;
};

export const Post: React.FC<{ params: PostParams }> = ({ params }) => {
  const { gl, scene, camera, size } = useThree(); const dpr = useThree((st) => st.viewport.dpr);
  // render targets follow the real drawing buffer (CSS size x dpr), so lower-dpr previews really render fewer pixels
  const W = Math.round(size.width * dpr), H = Math.round(size.height * dpr), ss = params.ss;
  if (BENCH) (window as unknown as { __postBody: number }).__postBody = performance.now();
  const res = useMemo(() => {
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const qScene = new THREE.Scene();
    const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(quadGeo); quad.frustumCulled = false; qScene.add(quad);
    const mat = (frag: string, uniforms: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
    const sceneRT = makeRT(W * ss, H * ss, true);
    const half = [makeRT(W / 2, H / 2), makeRT(W / 2, H / 2)];
    const quarter = [makeRT(W / 4, H / 4), makeRT(W / 4, H / 4)];
    const pyr = [2, 4, 8, 16, 32].map((d) => [makeRT(Math.ceil(W / d), Math.ceil(H / d)), makeRT(Math.ceil(W / d), Math.ceil(H / d))]);
    const blur = mat(BLUR, { tex: { value: null }, dir: { value: new THREE.Vector2() } });
    const down = mat(DOWN, { tex: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 1 }, bright: { value: 0 } });
    const comp = mat(COMPOSITE, {
      sharp: { value: null }, depthTex: { value: null }, half1: { value: null }, quarter: { value: null },
      b0: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, b4: { value: null },
      sharpTexel: { value: new THREE.Vector2() }, cNear: { value: 0.05 }, cFar: { value: 40 }, focusDist: { value: 3 }, focusRange: { value: 1 },
      maxBlur: { value: 0.6 }, bloom: { value: 1 }, exposure: { value: 1 }, vignette: { value: 0.5 }, aspect: { value: W / H },
      contrast: { value: 1 }, saturation: { value: 1 }, lift: { value: 0 }, warmCool: { value: 1 },
      aoStrength: { value: 0 }, aoRadius: { value: 0.5 }, projScale: { value: 500 },
    });
    return { qScene, qCam, quad, sceneRT, half, quarter, pyr, blur, down, comp };
  }, [W, H, ss]);
  useEffect(() => () => { [res.sceneRT, ...res.half, ...res.quarter, ...res.pyr.flat()].forEach((r) => r.dispose()); }, [res]);

  // Single-render determinism: camera rigs move the camera in a layout effect, but its matrixWorld is only refreshed
  // inside gl.render(). MeshReflectorMaterial builds its mirror camera in a priority-0 useFrame BEFORE that, so with one
  // render per frame the reflection used last frame's camera (the legacy double render hid this). Refresh it first.
  useFrame(() => { if (SINGLE_RENDER) { camera.updateMatrixWorld(); scene.updateMatrixWorld(); } }, -1);
  useFrame(() => {
    const { qScene, qCam, quad, sceneRT, half, quarter, pyr, blur, down, comp } = res;
    const pass = (m: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) => { quad.material = m; gl.setRenderTarget(target); gl.render(qScene, qCam); };
    const blurInto = (src: THREE.WebGLRenderTarget, tmp: THREE.WebGLRenderTarget, radius: number) => {
      blur.uniforms.tex.value = src.texture; blur.uniforms.dir.value.set(radius / src.width, 0); pass(blur, tmp);
      blur.uniforms.tex.value = tmp.texture; blur.uniforms.dir.value.set(0, radius / src.height); pass(blur, src);
    };
    const downInto = (src: THREE.WebGLRenderTarget, dst: THREE.WebGLRenderTarget, bright: boolean) => {
      down.uniforms.tex.value = src.texture; down.uniforms.texel.value.set(0.5 / src.width, 0.5 / src.height);
      down.uniforms.bright.value = bright ? 1 : 0; down.uniforms.threshold.value = params.threshold; pass(down, dst);
    };
    const prevTM = gl.toneMapping; gl.toneMapping = THREE.NoToneMapping;
    gl.autoClear = true;
    // 1. scene
    const ctx = gl.getContext(), now = () => performance.now(), px = new Uint8Array(4);
    const sync = () => { ctx.readPixels(0, 0, 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, px); };   // readback forces the deferred software-GPU work to complete (finish() does not under SwiftShader)
    let tb0 = 0, tb1 = 0, tb2 = 0;
    if (BENCH) { gl.setRenderTarget(null); sync(); tb0 = now(); }
    gl.setRenderTarget(sceneRT); gl.clear(); gl.render(scene, camera);
    if (BENCH) {
      gl.setRenderTarget(null); sync(); tb1 = now();
      const calls = gl.info.render.calls, tris = gl.info.render.triangles, au = gl.shadowMap.autoUpdate;
      gl.shadowMap.autoUpdate = false; gl.setRenderTarget(sceneRT); gl.clear(); gl.render(scene, camera); gl.shadowMap.autoUpdate = au;   // same image, shadow maps reused
      gl.setRenderTarget(null); sync(); tb2 = now();
      (window as unknown as { __benchStage: object }).__benchStage = { calls, tris };
    }
    // 2. DOF blur levels
    downInto(sceneRT, half[0], false); blurInto(half[0], half[1], 1.2);
    downInto(half[0], quarter[0], false); blurInto(quarter[0], quarter[1], 1.6); blurInto(quarter[0], quarter[1], 1.6);
    // 3. bloom pyramid
    downInto(sceneRT, pyr[0][0], true); blurInto(pyr[0][0], pyr[0][1], 1);
    for (let i = 1; i < pyr.length; i++) { downInto(pyr[i - 1][0], pyr[i][0], false); blurInto(pyr[i][0], pyr[i][1], 1); }
    // 4. composite
    const cam = camera as THREE.PerspectiveCamera;
    const u = comp.uniforms;
    u.sharp.value = sceneRT.texture; u.depthTex.value = sceneRT.depthTexture; u.half1.value = half[0].texture; u.quarter.value = quarter[0].texture;
    u.b0.value = pyr[0][0].texture; u.b1.value = pyr[1][0].texture; u.b2.value = pyr[2][0].texture; u.b3.value = pyr[3][0].texture; u.b4.value = pyr[4][0].texture;
    u.sharpTexel.value.set(1 / sceneRT.width, 1 / sceneRT.height);
    u.cNear.value = cam.near; u.cFar.value = cam.far;
    u.focusDist.value = params.focusDist; u.focusRange.value = params.focusRange; u.maxBlur.value = params.maxBlur;
    u.bloom.value = params.bloom; u.exposure.value = params.exposure; u.vignette.value = params.vignette;
    u.aoStrength.value = params.ao ?? 0; u.aoRadius.value = params.aoRadius ?? 0.5;
    u.projScale.value = (H * ss) / (2 * Math.tan(((cam.fov ?? 50) * Math.PI) / 360));
    u.contrast.value = params.contrast ?? 1; u.saturation.value = params.saturation ?? 1; u.lift.value = params.lift ?? 0; u.warmCool.value = params.warmCool ?? 1;
    pass(comp, null);
    gl.toneMapping = prevTM;
    if (BENCH) { sync(); const t3 = now(); const st = (window as unknown as { __benchStage: { calls: number; tris: number } }).__benchStage;
      const mem = gl.info.memory, prog = gl.info.programs?.length ?? -1, w = window as unknown as { __postBody?: number; __lastPostEnd?: number };
      const sincePrev = w.__lastPostEnd ? +(t3 - w.__lastPostEnd).toFixed(0) : null; w.__lastPostEnd = t3;
      console.log("[bench] " + JSON.stringify({ bodyToFrame: w.__postBody ? +(tb0 - w.__postBody).toFixed(1) : null, sincePrevCanvasEnd: sincePrev, programs: prog, textures: mem.textures, geometries: mem.geometries, sceneWithShadows: +(tb1 - tb0).toFixed(1), sceneNoShadowUpdate: +(tb2 - tb1).toFixed(1), post: +(t3 - tb2).toFixed(1), ss, W, H, calls: st.calls, tris: st.tris })); }
  }, 1);
  return null;
};
