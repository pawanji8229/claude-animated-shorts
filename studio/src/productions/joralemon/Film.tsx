// joralemon film: one composition (1466 frames). One camera for the whole film; the world switches era by opacity
// cross-dissolves between two Sets rendered from the SAME camera (no cuts, no wipes, no text).
//   NOW 0-514 | 1847 486-588 | 1907 566-1074 | NOW 1050-end (loops to frame 0)
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { useTexReady } from "../short3/tex";
import { JSet } from "./Set";
import { camAt } from "./timeline";
import { XF, FILM_FRAMES } from "./world";

const Fade: React.FC<{ o: number; children: React.ReactNode }> = ({ o, children }) => <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
const span = (a: number, b: number) => ({ from: a, durationInFrames: b - a });
const xf = (a: number, b: number, f: number) => { const t = Math.min(1, Math.max(0, (f - a + 1) / (b - a))); return t * t * (3 - 2 * t); };
const Layer: React.FC<{ era: "now" | "1847" | "1907"; from: number }> = ({ era, from }) => { const f = useCurrentFrame() + from; return <JSet era={era} camAt={camAt} frameOverride={f} />; };
export const JoralemonFilm: React.FC = () => {
  const f = useCurrentFrame(); const ready = useTexReady();
  if (!ready) return <AbsoluteFill style={{ backgroundColor: "#a9c7e6" }} />;
  return (
    <AbsoluteFill style={{ backgroundColor: "#a9c7e6" }}>
      <Sequence {...span(0, XF.home[1])} layout="none"><Layer era="now" from={0} /></Sequence>
      <Sequence {...span(XF.home[0], XF.works[1])} layout="none"><Fade o={xf(XF.home[0], XF.home[1], f)}><Layer era="1847" from={XF.home[0]} /></Fade></Sequence>
      <Sequence {...span(XF.works[0], XF.now[1])} layout="none"><Fade o={xf(XF.works[0], XF.works[1], f)}><Layer era="1907" from={XF.works[0]} /></Fade></Sequence>
      <Sequence {...span(XF.now[0], FILM_FRAMES)} layout="none"><Fade o={xf(XF.now[0], XF.now[1], f)}><Layer era="now" from={XF.now[0]} /></Fade></Sequence>
    </AbsoluteFill>
  );
};
