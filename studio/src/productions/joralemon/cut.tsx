// joralemon cutaways: materials that dissolve with a soft travelling edge (and their ink outlines with them).
//  FACADE (No. 58 front + roof): above world-y uCutY the surface fades to a faint ghost (uGhost), so the exterior stays
//    readable and aligned while the interior shows; a thin light line marks the moving edge.
//  GROUND (street slab, sidewalk, No. 58's basement floor): inside the cutaway box it fades with a soft border.
// Materials are clones of the normal ones (same maps), so a cut surface looks identical while uncut.
import React, { useMemo } from "react";
import * as THREE from "three";
import { InkHull, type InkFade } from "../../lib/Ink";
import { InkCtx } from "../../inventor/Workshop";
import { Kit } from "../short3/kit";
import { VOID, SHAFT } from "./world";

export const CUT = {
  uCutY: { value: 99 }, uSoft: { value: 0.9 }, uGhost: { value: 0.08 },
  uGround: { value: 0 }, uBox: { value: new THREE.Vector4(VOID.x0, VOID.x1, SHAFT.z0 - 0.5, VOID.z1) },
};
const DECL = `uniform float uCutY; uniform float uSoft; uniform float uGhost; uniform float uGround; uniform vec4 uBox;
float cutFacade(vec3 w){ float s = 1.0 - smoothstep(uCutY - uSoft, uCutY + uSoft, w.y); return mix(uGhost, 1.0, s); }
float cutGround(vec3 w){ float ix = min(w.x - uBox.x, uBox.y - w.x), iz = min(w.z - uBox.z, uBox.w - w.z); float inside = smoothstep(-0.6, 0.8, min(ix, iz)); return 1.0 - 0.9 * uGround * inside; }
float edgeLine(vec3 w){ return exp(-pow((w.y - uCutY) / 0.05, 2.0)); }`;
export type CutKind = "facade" | "ground";

const CACHE = new Map<string, THREE.Material>();
/** a cut-capable clone of a material (shared per source material + kind) */
export const cutMat = (m: THREE.Material, kind: CutKind): THREE.Material => {
  const key = `${m.uuid}|${kind}`; let c = CACHE.get(key); if (c) return c;
  c = m.clone(); const fn = kind === "facade" ? "cutFacade" : "cutGround";
  c.transparent = true; (c as THREE.MeshStandardMaterial).depthWrite = !(m as THREE.MeshStandardMaterial).transparent;
  c.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, CUT);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWc;").replace("#include <project_vertex>", "#include <project_vertex>\nvWc = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vWc;\n${DECL}`)
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>\n  float ca = ${fn}(vWc); gl_FragColor.a *= ca;${kind === "facade" ? "\n  if (uCutY < 20.0 && uCutY > -3.0) gl_FragColor.rgb += vec3(1.0, 0.8, 0.5) * edgeLine(vWc) * 0.0;" : ""}`);
  };
  c.customProgramCacheKey = () => `cut-${kind}-${m.type}`;
  CACHE.set(key, c); return c;
};
const FADES: Record<CutKind, InkFade> = {
  facade: { uniforms: CUT as unknown as Record<string, THREE.IUniform>, decl: DECL, alpha: "cutFacade(vW) * cutFacade(vW)" },
  ground: { uniforms: CUT as unknown as Record<string, THREE.IUniform>, decl: DECL, alpha: "cutGround(vW)" },
};
/** render a built kit with cut-capable materials + fading ink */
export const CutKitMesh: React.FC<{ kit: Kit; kind: CutKind; inkScale?: number; order?: number }> = ({ kit, kind, inkScale = 1, order = 2 }) => {
  const parts = useMemo(() => kit.build().map((p) => ({ ...p, mat: cutMat(p.mat, kind) })), [kit, kind]);
  const px = React.useContext(InkCtx);
  return <>{parts.map((p, i) => <mesh key={i} geometry={p.geo} material={p.mat} castShadow={p.opt.cast ?? true} receiveShadow={p.opt.receive ?? true} renderOrder={order}>
    {p.opt.ink !== false && <InkHull px={px * (p.opt.ink ?? 0.7) * inkScale} fade={FADES[kind]} />}
  </mesh>)}</>;
};
/** set the cut uniforms for this frame (call during render, before the canvas draws) */
export const setCut = (cutY: number, ground: number) => { CUT.uCutY.value = cutY; CUT.uGround.value = ground; };
