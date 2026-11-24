// Stage2: one camera's view of one moment, rendered with Camera 2.0 (RenderCam) + Lighting 2.0 (LightSpec) + Post2.
// The CentSet pattern (approved) with the new systems plugged in; CentSet itself is untouched. Stack two Stage2 layers
// with opacity for the established dissolve transition.
import React, { useLayoutEffect } from "react";
import * as THREE from "three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { InkCtx } from "../../../inventor/Workshop";
import { RenderAfterMount } from "../../../productions/london-bridge/common";
import { Post2 } from "./Post2";
import { Light2Rig, Practicals, Weather } from "./Light2";
import { PROFILES, QUALITY, type Quality } from "./presets";
import { whiteBalance, toHex, type LightSpec } from "./model";
import type { RenderCam, V3 } from "../cam/core";

const CamRig: React.FC<{ c: RenderCam }> = ({ c }) => {
  const { camera } = useThree();
  useLayoutEffect(() => { const cam = camera as THREE.PerspectiveCamera; cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); if (c.roll) cam.rotateZ(c.roll); /* dutch: roll about the view axis */ cam.fov = c.fov; cam.near = 0.03; cam.far = 3000; cam.updateProjectionMatrix(); });
  return null;
};
export type Stage2Props = { cam: RenderCam; light: LightSpec; f: number; quality?: Quality; world: (ctx: { hi: boolean; cam: V3; light: LightSpec; quality: Quality }) => React.ReactNode;
  /** the shot's focus point for the shadow frustum and the practical-light choice (stable for the whole shot) */
  focus?: V3; shadowSize?: number; weatherFx?: boolean; opacity?: number };
export const Stage2: React.FC<Stage2Props> = ({ cam, light, f, quality = "BALANCED", world, focus, shadowSize, weatherFx = true, opacity = 1 }) => {
  const { width, height } = useVideoConfig(); const hi = height >= 1500, k = height / 1920, Q = QUALITY[quality], pr = PROFILES[light.profile] ?? PROFILES.documentary;
  const fo: V3 = focus ?? cam.look;
  const post = { focusDist: cam.focus, focusRange: cam.focusRange, maxBlur: cam.dof, bloom: pr.bloom, threshold: Math.max(1.5, pr.threshold), exposure: light.exposure, vignette: pr.vignette,
    ss: hi ? Q.ssFinal : Q.ssPreview, contrast: pr.contrast, saturation: pr.saturation, lift: pr.lift, warmCool: pr.warmCool, ao: Q.aoStrength, aoRadius: 0.45, aoSamples: Q.aoSamples,
    fog: Q.postFog && light.fog.density > 0 ? { color: light.fog.color, density: light.fog.density, heightBase: light.fog.heightBase, heightFalloff: light.fog.heightFalloff, start: light.fog.start, sunColor: light.key.color, sunScatter: light.fog.sunScatter, skyFog: light.fog.skyFog } : undefined,
    sunDir: light.key.dir, godRays: Q.godRaySamples > 0 && light.godRays > 0 ? { strength: light.godRays * 0.9, samples: Q.godRaySamples, decay: 0.965, color: light.key.color } : undefined,
    wb: whiteBalance(light.whiteK), gain: pr.gain, gamma: pr.gamma };
  return (
    <AbsoluteFill style={{ backgroundColor: toHex(light.background), opacity }}>
      <ThreeCanvas width={width} height={height} shadows={{ type: THREE.PCFSoftShadowMap }} gl={{ antialias: false, toneMapping: THREE.NoToneMapping, preserveDrawingBuffer: true }} camera={{ fov: cam.fov, position: cam.pos, near: 0.03, far: 3000 }}>
        <CamRig c={cam} />
        <InkCtx.Provider value={2.4 * k}>
          <Light2Rig spec={light} quality={quality} focus={fo} shadowSize={shadowSize} />
          <Practicals list={light.practicals} focus={fo} quality={quality} f={f} />
          {weatherFx && (light.weather === "rain" || light.weather === "storm") && <Weather kind="rain" f={f} center={cam.pos} />}
          {weatherFx && light.weather === "snow" && <Weather kind="snow" f={f} center={cam.pos} />}
          {weatherFx && light.dust > 0.2 && <Weather kind="dust" f={f} center={[fo[0], 0.2, fo[2]]} count={Math.round(120 + 220 * light.dust)} />}
          {world({ hi, cam: cam.pos, light, quality })}
        </InkCtx.Provider>
        <Post2 params={post} />
        <RenderAfterMount f={f} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
