import React from "react";
import { Composition } from "remotion";
import { InventorWalkIn, inventorSchema } from "./inventor/InventorWalkIn";
import { DURATION, FPS } from "./inventor/timeline";
import { NightShift10, nightShiftSchema } from "./inventor/NightShift10";
import { DURATION10 } from "./inventor/timeline10";
import { Sheet2D } from "./previews/Sheet2D";
import { Hall10 } from "./hall/Hall10";
import { Take10 } from "./hall/Take10";
import { LondonBridgeFilm } from "./desert/LondonBridgeFilm";
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
    <Composition id="LBPreviewCar" component={LondonBridgeFilm} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ envOnly: true, frameOverride: 90, camOverride: { pos: [-7.2, 1.15, 13.6] as [number, number, number], look: [-11.2, 0.75, 8.6] as [number, number, number], fov: 38, focus: 6.4 } }} />
    <Composition id="LBPreviewEnvironment" component={LondonBridgeFilm} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ envOnly: true, frameOverride: 200, camOverride: { pos: [16, 8, 52] as [number, number, number], look: [-2, 5, 0] as [number, number, number], fov: 50, focus: 50 } }} />
    <Composition id="LBPreviewHal" component={LondonBridgeFilm} durationInFrames={1} fps={FPS} width={1080} height={1920} defaultProps={{ frameOverride: 146 }} />
    <Composition id="Sheet2D" component={Sheet2D} durationInFrames={1} fps={FPS} width={3000} height={2200} />
  </>
);
