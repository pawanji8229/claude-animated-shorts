// "London Bridge in the Desert" — the complete 59 s film as ONE composition (1771 frames), v2.
// Worlds are mounted around their frame ranges (Sequence = frame offset + unmount). Every change of location is a true
// opacity cross-dissolve: both worlds render simultaneously across the window and the incoming one eases in while both
// cameras keep moving in matched directions (no curtains, no cuts, no camera teleport). The works -> Reopening dissolve
// is camera-matched (the works camera lands exactly on the Reopening opening camera). The loop end dissolves into the
// frozen opening image, so the last frame equals frame 0. No on-screen text.
import React from "react";
import { AbsoluteFill, Freeze, Sequence, useCurrentFrame } from "remotion";
import { LondonBridgeFilm } from "../../desert/LondonBridgeFilm";
import { ReopeningFilm } from "../reopening/Film";
import { FILM_FRAMES, REOPEN_FROM, XF, xfade } from "./timeline";
import { LondonSet } from "./LondonSet";
import { SeaSet } from "./SeaSet";
import { DesertWorks } from "./DesertWorks";

const Fade: React.FC<{ o: number; children: React.ReactNode }> = ({ o, children }) => <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
const span = (a: number, b: number) => ({ from: a, durationInFrames: b - a });

export const LondonBridgeFull: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a120c" }}>
      <Sequence {...span(0, XF.hookLondon[1])} layout="none"><LondonBridgeFilm maxFrame={XF.hookLondon[1] + 4} /></Sequence>
      <Sequence {...span(XF.hookLondon[0], XF.londonSea[1])} layout="none"><Fade o={xfade(XF.hookLondon, f)}><LondonSet from={XF.hookLondon[0]} /></Fade></Sequence>
      <Sequence {...span(XF.londonSea[0], XF.seaWorks[1])} layout="none"><Fade o={xfade(XF.londonSea, f)}><SeaSet from={XF.londonSea[0]} /></Fade></Sequence>
      <Sequence {...span(REOPEN_FROM, FILM_FRAMES)} layout="none"><ReopeningFilm /></Sequence>
      <Sequence {...span(XF.seaWorks[0], XF.worksReopen[1])} layout="none"><Fade o={xfade(XF.seaWorks, f) * (1 - xfade(XF.worksReopen, f))}><DesertWorks from={XF.seaWorks[0]} /></Fade></Sequence>
      <Sequence {...span(XF.loop[0], FILM_FRAMES)} layout="none"><Freeze frame={0}><Fade o={xfade(XF.loop, f)}><LondonBridgeFilm /></Fade></Freeze></Sequence>
    </AbsoluteFill>
  );
};
