// short3 "The Office That Moved" — one composition, 1564 frames (52.11 s). Two sets (EXT city block, INT switchboard)
// joined only by true opacity cross-dissolves (both layers render across the window; no curtains, no cuts):
//   INT 0-135 -> EXT hook (building mid-move) -> time-dissolve 241-259 to 1930 (same camera, world rewinds) -> EXT story
//   -> INT 1213-1340 "meanwhile" -> EXT finished move -> INT 1528-1563 (dissolve complete by 1552), which plays frames -36..-1 of the INT timeline
//   so its motion flows straight into frame 0 (seamless loop, no freeze, no black frame). No on-screen text.
import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { ExtSet } from "./ExtSet";
import { IntSet } from "./IntSet";
import { FILM_FRAMES } from "./world";
import { useTexReady } from "./tex";

const Fade: React.FC<{ o: number; children: React.ReactNode }> = ({ o, children }) => <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
const span = (a: number, b: number) => ({ from: a, durationInFrames: b - a });
const xf = (a: number, b: number, f: number) => { const t = Math.min(1, Math.max(0, (f - a + 1) / (b - a))); return t * t * (3 - 2 * t); };
export { XF } from "./world";
import { XF } from "./world";

export const Short3Film: React.FC = () => {
  const f = useCurrentFrame(); const ready = useTexReady();
  if (!ready) return <AbsoluteFill style={{ backgroundColor: "#2a2018" }} />;
  return (
    <AbsoluteFill style={{ backgroundColor: "#2a2018" }}>
      <Sequence {...span(0, XF.intExt[1])} layout="none"><IntSet from={0} /></Sequence>
      <Sequence {...span(XF.intExt[0], XF.past[1])} layout="none"><Fade o={xf(XF.intExt[0], XF.intExt[1], f)}><ExtSet from={XF.intExt[0]} /></Fade></Sequence>
      <Sequence {...span(XF.past[0], XF.extInt[1])} layout="none"><Fade o={xf(XF.past[0], XF.past[1], f)}><ExtSet from={XF.past[0]} worldMin={XF.past[1]} /></Fade></Sequence>
      <Sequence {...span(XF.extInt[0], XF.intExt2[1])} layout="none"><Fade o={xf(XF.extInt[0], XF.extInt[1], f)}><IntSet from={XF.extInt[0]} /></Fade></Sequence>
      <Sequence {...span(XF.intExt2[0], FILM_FRAMES)} layout="none"><Fade o={xf(XF.intExt2[0], XF.intExt2[1], f)}><ExtSet from={XF.intExt2[0]} /></Fade></Sequence>
      <Sequence {...span(XF.loop[0], FILM_FRAMES)} layout="none"><Fade o={xf(XF.loop[0], XF.loop[1], f)}><IntSet from={XF.loop[0] - FILM_FRAMES} /></Fade></Sequence>
    </AbsoluteFill>
  );
};
