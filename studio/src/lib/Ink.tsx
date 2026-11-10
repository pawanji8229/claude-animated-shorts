// Inverted-hull ink outline with constant SCREEN-SPACE width (px), safe near the camera.
// Why not drei <Outlines>: its screen-space offset multiplies by clip.w with no guard, so any vertex behind or very
// near the lens throws huge black shards across the frame (seen in the first test stills). Here:
//  - hull normals are smoothed (creased at `angle`) so box corners stay closed,
//  - the offset is skipped for vertices with clip.w below a small epsilon,
//  - width is given in output px and the caller scales it with resolution.
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const cache = new WeakMap<THREE.BufferGeometry, THREE.BufferGeometry>();
const hullOf = (g: THREE.BufferGeometry, angle: number) => {
  let h = cache.get(g);
  if (!h) {
    const src = g.index ? g.toNonIndexed() : g;
    h = toCreasedNormals(src, angle);
    cache.set(g, h);
  }
  return h;
};

const vert = /* glsl */ `
uniform float thickness;
uniform vec2 size;
void main() {
  vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vec2 d = (projectionMatrix * vec4(n, 0.0)).xy;
  float l = length(d);
  if (clip.w > 0.05 && l > 1e-5) clip.xy += (d / l) * thickness / size * clip.w * 2.0;
  gl_Position = clip;
  #include <logdepthbuf_vertex>
}`;
const frag = /* glsl */ `
uniform vec3 color;
void main() { gl_FragColor = vec4(color, 1.0); }`;

export const InkHull: React.FC<{ px: number; color?: string; angle?: number }> = ({ px, color = "#0b0a0c", angle = Math.PI }) => {
  const ref = useRef<THREE.Mesh>(null);
  const size = useThree((s) => s.size);
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      uniforms: { thickness: { value: px }, size: { value: new THREE.Vector2(1, 1) }, color: { value: new THREE.Color(color) } },
      vertexShader: vert, fragmentShader: frag, side: THREE.BackSide, toneMapped: false,
    }),
    [color],
  );
  mat.uniforms.thickness.value = px;
  mat.uniforms.size.value.set(size.width, size.height);
  useLayoutEffect(() => {
    const m = ref.current; if (!m) return;
    const parent = m.parent as THREE.Mesh | null;
    if (parent?.geometry) m.geometry = hullOf(parent.geometry, angle);
  });
  return <mesh ref={ref} material={mat} castShadow={false} receiveShadow={false} raycast={() => null} />;
};
