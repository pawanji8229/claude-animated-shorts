// "London Bridge in the Desert" — the complete 59 s film as ONE composition (1771 frames).
// Worlds are mounted only around their frame ranges (Sequence = frame offset + unmount); the switches sit inside
// opaque atmospheric veils while the camera keeps moving, so the take never cuts. No on-screen text.
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { LondonBridgeFilm } from "../../desert/LondonBridgeFilm";
import { ReopeningFilm } from "../reopening/Film";
import { Veil } from "./Veil";
import { FILM_FRAMES, SW, VEILS } from "./timeline";
import { LondonSet } from "./LondonSet";
import { SeaSet } from "./SeaSet";
import { DesertWorks } from "./DesertWorks";

export const LondonBridgeFull: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a120c" }}>
      <Sequence from={0} durationInFrames={SW.london} layout="none"><LondonBridgeFilm maxFrame={SW.london + 10} /></Sequence>
      <Sequence from={SW.london} durationInFrames={SW.sea - SW.london} layout="none"><LondonSet from={SW.london} /></Sequence>
      <Sequence from={SW.sea} durationInFrames={SW.works - SW.sea} layout="none"><SeaSet from={SW.sea} /></Sequence>
      <Sequence from={SW.works} durationInFrames={SW.reopen - SW.works} layout="none"><DesertWorks from={SW.works} /></Sequence>
      <Sequence from={SW.reopen} durationInFrames={FILM_FRAMES - SW.reopen} layout="none"><ReopeningFilm /></Sequence>
      <Veil f={f} veils={VEILS} loopFrames={FILM_FRAMES} />
    </AbsoluteFill>
  );
};
