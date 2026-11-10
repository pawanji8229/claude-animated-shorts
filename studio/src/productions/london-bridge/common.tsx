// Shared pieces for the London Bridge worlds: camera rig, smooth camera paths, character cards (earless odo5 with the
// approved face glow + halo + face key light), and the frame-accurate canvas render trigger.
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { CardSprite } from "../../char/CardSprite";
import { drawOdo5, headCenterPx5, W5, H5, SOLE5, type Odo5Pose } from "../../char/odo5";
import { glow } from "../../hall/hallTextures";
import { V3 } from "../../lib/math";

export type Cam = { pos: V3; look: V3; fov: number; focus: number };
export const TAU = Math.PI * 2;

export const SetRig: React.FC<{ c: Cam; bg: string; fog: [string, number, number]; env?: number; clip?: boolean }> = ({ c, bg, fog, env = 0.25, clip }) => {
  const { camera, scene, gl } = useThree();
  const envTex = useMemo(() => { const pm = new THREE.PMREMGenerator(gl); const t = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return t; }, [gl]);
  useLayoutEffect(() => {
    scene.environment = envTex; scene.environmentIntensity = env;
    scene.background = new THREE.Color(bg); scene.fog = new THREE.Fog(fog[0], fog[1], fog[2]);
    gl.localClippingEnabled = !!clip;
    const cam = camera as THREE.PerspectiveCamera; cam.layers.enable(1);
    cam.position.set(...c.pos); cam.lookAt(...c.look); cam.fov = c.fov; cam.near = 0.1; cam.far = 1400; cam.updateProjectionMatrix();
  });
  return null;
};
export const RenderAfterMount: React.FC<{ f: number }> = ({ f }) => { const advance = useThree((s) => s.advance); useEffect(() => { advance(performance.now()); }, [f, advance]); return null; };

/** card-px point -> world (cards face the camera around the vertical axis) */
export const cardWorld = (pos: V3, cam: V3, px: [number, number], cardH: number, push = 0): V3 => {
  const yaw = Math.atan2(cam[0] - pos[0], cam[2] - pos[2]), s = cardH / H5;
  const lx = (px[0] - W5 / 2) * s, ly = (SOLE5 - px[1]) * s;
  return [pos[0] + Math.cos(yaw) * lx + Math.sin(yaw) * push, pos[1] + ly, pos[2] - Math.sin(yaw) * lx + Math.cos(yaw) * push];
};

/** optional horizontal mirror of a card drawing (a side-view walker heading screen-left) */
const mirror = (g: CanvasRenderingContext2D, on: boolean | undefined, draw: () => void) => { if (!on) return draw(); g.save(); g.translate(W5, 0); g.scale(-1, 1); draw(); g.restore(); };
/** one earless odo5 character card + approved face glow (mask fill), halo sprite, optional warm face key */
export const Toon: React.FC<{ pose: Odo5Pose; pos: V3; cam: V3; h?: number; hi: boolean; light?: number; keyColor?: string; halo?: number; flip?: boolean }> = ({ pose, pos, cam, h = 1.55, hi, light = 0, keyColor = "#ffd2a0", halo = 0.14, flip }) => {
  const haloTex = useMemo(() => glow("rgba(255,236,205,0.9)", "rgba(255,210,160,0)"), []);
  const hc = headCenterPx5(pose), head = cardWorld(pos, cam, flip ? [W5 - hc[0], hc[1]] : hc, h, -0.05);
  return (
    <group>
      {light > 0 && <pointLight position={[pos[0] + 0.7, pos[1] + 1.8, pos[2] + 2.0]} color={keyColor} intensity={light} distance={6} decay={1.7} />}
      <CardSprite W={W5} H={H5} sole={SOLE5} cardH={h} pos={pos} camPos={cam} texScale={hi ? 1.6 : 1.1} albedo={0.82} fill={0.8} fillColor="#fff2e2" contact={0.85}
        draw={(g) => mirror(g, flip, () => drawOdo5(g, pose))} drawMask={(g) => mirror(g, flip, () => drawOdo5(g, pose, true))} />
      {halo > 0 && <sprite position={head} scale={[0.95 * h / 1.55, 0.95 * h / 1.55, 1]}><spriteMaterial map={haloTex} transparent opacity={halo} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>}
    </group>
  );
};

// ---------- camera paths: keys -> monotone cubic (no overshoot) per channel -> light Gaussian smoothing ----------
export type CamKey = { f: number; pos: V3; look: V3; fov: number };
const monotone = (xs: number[], ys: number[]) => {
  const n = xs.length, d: number[] = [], m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; } }
  return (x: number) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]); if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let i = 0; while (i < n - 2 && xs[i + 1] <= x) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h;
    return (2 * t ** 3 - 3 * t ** 2 + 1) * ys[i] + (t ** 3 - 2 * t ** 2 + t) * h * m[i] + (-2 * t ** 3 + 3 * t ** 2) * ys[i + 1] + (t ** 3 - t ** 2) * h * m[i + 1];
  };
};
export const camPath = (keys: CamKey[], sigma = 6) => {
  const xs = keys.map((k) => k.f);
  const ch = [0, 1, 2].map((j) => monotone(xs, keys.map((k) => k.pos[j]))).concat([0, 1, 2].map((j) => monotone(xs, keys.map((k) => k.look[j]))), [monotone(xs, keys.map((k) => k.fov))]);
  const R = Math.ceil(sigma * 2.5), w = Array.from({ length: 2 * R + 1 }, (_, i) => Math.exp(-(((i - R) / sigma) ** 2) / 2)), ws = w.reduce((a, b) => a + b, 0);
  return (f: number, focusAt?: V3): Cam => {
    const v = ch.map((fn) => w.reduce((s, wi, i) => s + wi * fn(f + i - R), 0) / ws);
    const pos: V3 = [v[0], v[1], v[2]], look: V3 = [v[3], v[4], v[5]];
    const ft = focusAt ?? look;
    return { pos, look, fov: v[6], focus: Math.hypot(ft[0] - pos[0], ft[1] - pos[1], ft[2] - pos[2]) };
  };
};
