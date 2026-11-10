// Pipeline-level render flags passed as Remotion inputProps (never change visuals unless a flag says so).
//   __singleRender: skip the legacy RenderAfterMount advance. @remotion/three already advances the R3F loop on every
//                   frame change, so the legacy component made every frame render its whole scene + post TWICE.
//                   Measured on London Bridge frames: identical pixels, ~half the GPU time (see pipeline/bench).
import { getInputProps } from "remotion";
const props = (() => { try { return getInputProps() as Record<string, unknown>; } catch { return {}; } })();
export const SINGLE_RENDER = !!props.__singleRender;
