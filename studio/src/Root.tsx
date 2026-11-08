import React from "react";
import { Composition } from "remotion";
import { InventorWalkIn, inventorSchema } from "./inventor/InventorWalkIn";
import { DURATION, FPS } from "./inventor/timeline";
import { NightShift10, nightShiftSchema } from "./inventor/NightShift10";
import { DURATION10 } from "./inventor/timeline10";

const defaults = { captions: true, caption: "Midnight. The workshop is awake." };

export const RemotionRoot: React.FC = () => (
  <>
    {/* Final 9:16 delivery size */}
    <Composition id="InventorWalkIn" component={InventorWalkIn} schema={inventorSchema} durationInFrames={DURATION} fps={FPS} width={1080} height={1920} defaultProps={defaults} />
    {/* Low-res preview: rendered natively at 540x960 (cheaper than --scale on CPU-only runners) */}
    <Composition id="InventorWalkInPreview" component={InventorWalkIn} schema={inventorSchema} durationInFrames={DURATION} fps={FPS} width={540} height={960} defaultProps={defaults} />
    {/* v2 quality test: 10 s, full post stack. Final-size twin for later. */}
    <Composition id="NightShift10Preview" component={NightShift10} schema={nightShiftSchema} durationInFrames={DURATION10} fps={FPS} width={540} height={960} defaultProps={{ captions: true, post: true }} />
    <Composition id="NightShift10" component={NightShift10} schema={nightShiftSchema} durationInFrames={DURATION10} fps={FPS} width={1080} height={1920} defaultProps={{ captions: true, post: true }} />
  </>
);
