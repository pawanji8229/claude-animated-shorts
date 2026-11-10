import React from "react";
import { AbsoluteFill, Composition, useCurrentFrame } from "remotion";
import { LibraryShowcase, ShowcaseShot, SHOWCASE_FRAMES, SHOT, XF } from "./showcase/LibraryShowcase";
import { AssetViewer } from "./showcase/AssetViewer";
const BenchBlank: React.FC = () => { const f = useCurrentFrame(); return <AbsoluteFill style={{ background: `hsl(${f % 360},40%,50%)` }} />; };
import { InventorWalkIn, inventorSchema } from "./inventor/InventorWalkIn";
import { DURATION, FPS } from "./inventor/timeline";
import { NightShift10, nightShiftSchema } from "./inventor/NightShift10";
import { DURATION10 } from "./inventor/timeline10";
import { Sheet2D } from "./previews/Sheet2D";
import { Hall10 } from "./hall/Hall10";
import { Take10 } from "./hall/Take10";
import { LondonBridgeFilm } from "./desert/LondonBridgeFilm";
import { ReopeningFilm } from "./productions/reopening/Film";
import { LondonBridgeFull } from "./productions/london-bridge/Film";
import { FILM_FRAMES as LB_FULL_FRAMES } from "./productions/london-bridge/timeline";
import { FILM_FRAMES as REOPENING_FRAMES } from "./productions/reopening/scene";
import { FILM_FRAMES } from "./desert/desertHook";
import { DUR_TAKE } from "./hall/take10";
import { DUR_H10 } from "./hall/timelineHall10";
import { Previews, Previews4, previewSchema } from "./previews/Previews";

const defaults = {};

export const RemotionRoot: React.FC = () => (
  <>
    {/* Final 9:16 delivery size */}
    <Composition id="InventorWalkIn" component={InventorWalkIn} schema={inventorSchema} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={defaults} />
    {/* Low-res preview: rendered natively at 540x960 (cheaper than --scale on CPU-only runners) */}
    <Composition id="InventorWalkInPreview" component={InventorWalkIn} schema={inventorSchema} durationInFrames={DURATION} fps={FPS} width={540} height={960} defaultProps={defaults} />
    {/* v2 quality test: 10 s, full post stack. Final-size twin for later. */}
    <Composition id="NightShift10Preview" component={NightShift10} schema={nightShiftSchema} durationInFrames={DURATION10} fps={FPS} width={540} height={960} defaultProps={{ post: true }} />
    <Composition id="NightShift10" component={NightShift10} schema={nightShiftSchema} durationInFrames={DURATION10} fps={FPS} width={1080} height={1920} defaultProps={{ post: true }} />
    {/* v3 approval frames (1080x1920, no on-screen text) */}
    <Composition id="PreviewCharacter" component={Previews} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "character" as const }} />
    <Composition id="PreviewEnvironment" component={Previews} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "environment" as const }} />
    <Composition id="PreviewComposite" component={Previews} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "composite" as const }} />
    <Composition id="Preview4Portrait" component={Previews4} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "portrait4" as const }} />
    <Composition id="Preview4FullBody" component={Previews4} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "character4" as const }} />
    <Composition id="Preview4InScene" component={Previews4} schema={previewSchema} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ mode: "composite4" as const }} />
    {/* v4: "Night Errand" 10 s, Odo v4 in the Long Workshop (no on-screen text) */}
    <Composition id="NightErrand10Preview" component={Hall10} durationInFrames={DUR_H10} fps={FPS} width={540} height={960} />
    <Composition id="NightErrand10" component={Hall10} durationInFrames={DUR_H10} fps={FPS} width={1080} height={1920} />
    {/* v5: "The Awkward Encounter" — one continuous take, no cuts, no text */}
    <Composition id="AwkwardTake10Preview" component={Take10} durationInFrames={DUR_TAKE} fps={FPS} width={540} height={960} />
    <Composition id="V5PreviewEnvironment" component={Take10} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ envOnly: true }} />
    <Composition id="V5PreviewCringe" component={Take10} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ frameOverride: 226 }} />
    <Composition id="V5PreviewFinal" component={Take10} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ frameOverride: 284 }} />
    <Composition id="AwkwardTake10" component={Take10} durationInFrames={DUR_TAKE} fps={FPS} width={1080} height={1920} />
    {/* London Bridge film: one composition, rendered in frame-range batches; audio muxed after render */}
    <Composition id="LondonBridgePreview" component={LondonBridgeFilm} durationInFrames={FILM_FRAMES} fps={FPS} width={540} height={960} />
    <Composition id="LondonBridge" component={LondonBridgeFilm} durationInFrames={FILM_FRAMES} fps={FPS} width={1080} height={1920} />
    <Composition id="LBPreviewBridge" component={LondonBridgeFilm} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ envOnly: true, frameOverride: 200, camOverride: { pos: [-0.6, 2.2, 13.8] as [number, number, number], look: [-6.4, 4.6, 4.5] as [number, number, number], fov: 44, focus: 11 } }} />
    <Composition id="LBPreviewCar" component={LondonBridgeFilm} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ envOnly: true, frameOverride: 90, camOverride: { pos: [-4.3, 1.25, 9.4] as [number, number, number], look: [-10.7, 0.66, 7.85] as [number, number, number], fov: 47, focus: 5.6 } }} />
    <Composition id="LBPreviewEnvironment" component={LondonBridgeFilm} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ envOnly: true, frameOverride: 200, camOverride: { pos: [16, 8, 52] as [number, number, number], look: [-2, 5, 0] as [number, number, number], fov: 50, focus: 50 } }} />
    <Composition id="LBPreviewHal" component={LondonBridgeFilm} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ frameOverride: 146 }} />
    {/* voice-to-video test production "reopening" (291 frames = 9.6914 s narration) */}
    <Composition id="ReopeningPreview" component={ReopeningFilm} durationInFrames={REOPENING_FRAMES} fps={FPS} width={540} height={960} />
    <Composition id="Reopening" component={ReopeningFilm} durationInFrames={REOPENING_FRAMES} fps={FPS} width={1080} height={1920} />
    <Composition id="Sheet2D" component={Sheet2D} durationInFrames={1} fps={FPS} width={3000} height={2200} />
      <Composition id="LondonBridgeFullPreview" component={LondonBridgeFull} durationInFrames={LB_FULL_FRAMES} fps={30} width={540} height={960} />
    <Composition id="LondonBridgeFull" component={LondonBridgeFull} durationInFrames={LB_FULL_FRAMES} fps={30} width={1080} height={1920} />
    {/* pipeline v3: CC0 library showcase / benchmark film (5 shot types + dissolves) and single shots */}
    <Composition id="LibraryShowcase" component={LibraryShowcase} durationInFrames={SHOWCASE_FRAMES} fps={30} width={1080} height={1920} />
    {[0, 1, 2, 3, 4].map((i) => <Composition key={i} id={`ShowcaseShot${i}`} component={ShowcaseShot} durationInFrames={SHOT + XF} fps={30} width={1080} height={1920} defaultProps={{ shot: i }} />)}
    <Composition id="AssetViewer" component={AssetViewer} durationInFrames={1} fps={30} width={720} height={720} defaultProps={{ id: "Barrel_01" }} />
    {/* pipeline/bench: per-frame Remotion+Chromium overhead with no 3D at all */}
    <Composition id="BenchBlank" component={BenchBlank} durationInFrames={300} fps={30} width={1080} height={1920} />
  </>
);
