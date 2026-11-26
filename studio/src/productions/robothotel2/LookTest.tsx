// Look-development stills for the reference ("cartoon 3D") style: same set, new renderer + lighting + framing.
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ToonSet, type Look, type TCam } from "./ToonSet";
import { Toon } from "../centennial/chars";
import { HERO } from "../centennial/chars";
import { useHotelReady } from "../robothotel/assets";
import { useTexReady } from "../short3/tex";
import { Building, HotelLights, RAPTOR_AT, RAPTOR_SCALE } from "../robothotel/hotel";
import { Raptor, RAPTOR_REST, Porter } from "../robothotel/robots";
import { stand, ft, A } from "../mailrail/actors";
import { REST_L } from "../../char/odo5";
import type { V3 } from "../../lib/math";

export const LOBBY_LOOK: Look = {
  bg: "#1a1410", sky: "#fff1dc", ground: "#4a3424", hemi: 0.42, env: 0.5,
  sun: { dir: [0.75, 0.55, 0.35], color: "#ffd59a", i: 3.6, at: [-1.5, 0, -10.5], size: 7 },
  rim: { dir: [-0.4, 0.5, -1], color: "#7fd8ff", i: 1.6 },
  exposure: 1.02, bloom: 0.5, threshold: 1.35, saturation: 1.38, contrast: 1.16, warmCool: 0.7, vignette: 0.38, ink: 0.95,
};
const cam = (pos: V3, look: V3, fov: number, dof = 0.35): TCam => ({ pos, look, fov, dof });
const VIEWS: TCam[] = [
  cam([-0.2, 1.5, -6.9], [-1.5, 1.2, -11.4], 58),          // medium two-shot: hero + raptor (the reference's typical framing)
  cam([-1.0, 1.45, -8.4], [-1.6, 1.3, -10.3], 50, 0.5),   // close-up on the hero (head ~40% of frame width)
  cam([-1.9, 1.3, -8.9], [-3.0, 1.95, -12.3], 54, 0.45),      // low-ish close on the roaring raptor
];
export const LOOK_N = VIEWS.length;
export const LookTest: React.FC = () => {
  const f = useCurrentFrame(), r0 = useTexReady(), r1 = useHotelReady(); if (!r0 || !r1) return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  const c = VIEWS[f % VIEWS.length];
  const hero = stand({ c: HERO, seed: 7, face: ft([[0, f === 2 ? "hugeShock" : f === 1 ? "doubleTake" : "delighted"]]), armL: () => REST_L, armR: () => A([110, -150], "open", 1, 2.4, [90, -50]) }, [-1.6, 0, -10.25], 30);
  return <ToonSet c={c} m={LOBBY_LOOK} f={f} world={({ hi, cam: cp }) => <>
    <Building doors={0} door101={0} show={{ ext: false, lobby: true, cor: false, room: false }} woodFloor />
    <HotelLights lobby={1} cor={0} room={0} />
    <Raptor s={{ ...RAPTOR_REST, headPitch: 0.45, jaw: 0.95, armL: 0.7, armR: 0.7, bow: -0.25, headYaw: 0.4 }} v={0} p={RAPTOR_AT[0]} sc={RAPTOR_SCALE} />
    <Raptor s={{ ...RAPTOR_REST, headYaw: -0.3 }} v={1} p={RAPTOR_AT[1]} sc={RAPTOR_SCALE} />
    <Porter s={{ err: 0, face: "eyes", wheel: 0, load: true }} p={[1.2, 0, -9.4]} ry={-1.2} />
    <Toon p={hero} cam={cp} hi={hi} />
  </>} />;
};
