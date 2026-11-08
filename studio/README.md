# Studio: Remotion + Three.js + React Three Fiber

A runnable project for original 2.5D cinematic shorts: flat, bold-outlined cartoon characters (Canvas2D cards) inside lit,
inked 3D sets. All motion is frame-deterministic (`useCurrentFrame`), so any frame renders identically in any tab or runner.

## Compositions
| ID | Size | Length | Use |
|---|---|---|---|
| `InventorWalkInPreview` | 540x960 | 5 s / 150 f @ 30 fps | Cheap preview and CI smoke render |
| `InventorWalkIn` | 1080x1920 | 5 s / 150 f @ 30 fps | Final 9:16 delivery |
| `NightShift10Preview` | 540x960 | 10 s / 300 f @ 30 fps | **v2 quality test** (5 shots, custom post pipeline) |
| `NightShift10` | 1080x1920 | 10 s / 300 f @ 30 fps | Same, final size (not yet rendered in full) |

Props: `captions` (bool, default `true`) and `caption` (string). Example: `--props='{"captions":false}'`.

## Shot: "Inventor walks into the workshop"
Original character **Odo Fennick**: lightbulb-shaped head, brass goggles, silver tufts, walrus moustache, teal shirt, rust apron.
- 0–24 f: the door swings open on a blue moonlit night.
- 10–112 f: he walks in (planted side-view gait on an arc-length path) while the camera glides from the wide to a tracking shot.
- 116 f: he turns to camera (squash).
- 121–150 f: he looks up at the pendant lamp, delighted, and the brass contraption's dome flares.
- Lighting: warm tungsten spot plus point light from the pendant (with shadows), a visible light cone and dust motes, cool moonlight through the door and window, low warm hemisphere fill, NEUTRAL tone mapping and a CSS vignette.

## v2: "The Night Shift" (10 s quality test)
- **Story beats** (`src/inventor/timeline10.ts`):
  - S1: the door opens and Odo shakes off the cold and glances around.
  - S2: a tracking shot with foreground parallax as he crosses the room.
  - S3: he looks up, has an idea and lowers his goggles.
  - S4: insert of his hand pulling the floor lever, using two-bone IK so the hand stays on the knob.
  - S5: the contraption ignites (sparks, flare, gears spin up, lamp flicker, impact shake) and he turns to us, delighted.
- **Character v2:**
  - sleeves and skin hands, so the arms read in profile;
  - an apron with shoulder strap and back bow;
  - secondary motion: head bob and tilt, apron sway, moustache bounce;
  - breathing, glances, idea finger, goggles-down with flare glints.
- **Set v2** (`Extras.tsx`): copper pipes, blueprints, ticking clock, braided rug, coat rack, toolbox, cogs, hanging chain, foreground crate, floor lever and spark particles.
- **Post** (`src/lib/Post.tsx`):
  - HDR scene target at 2× supersampling, then depth-buffer depth of field (half/quarter-res blur), a 5-level bloom pyramid, Khronos PBR Neutral tone map, warm/cool split grade and vignette.
  - Written in-house because `@react-three/postprocessing` produced an empty/black frame under Remotion's `frameloop="never"` with SwiftShader.
  - `RenderAfterMount` (last child of the canvas) forces one more `advance()` after all priority `useFrame` hooks have mounted.
- Props: `captions` (bool) and `post` (bool; `false` gives the plain renderer with no post pipeline).

## Files
- `src/inventor/timeline.ts`: beats, walk path, character state, camera keys.
- `src/inventor/inventorDraw.ts`: character drawing (side and front views, blink, expressions).
- `src/inventor/Inventor.tsx`: lit billboard card, shadow caster, contact blob.
- `src/inventor/Workshop.tsx`: set, props, lamp, lights.
- `src/inventor/textures.ts`: seeded procedural painted textures (no external assets).
- `src/lib/Ink.tsx`: guarded screen-space ink outline.
- `src/lib/Caption.tsx`: captions.

## Commands (run inside `studio/`)
```bash
npm ci
npx remotion browser ensure          # downloads Chrome Headless Shell (needs remotion.media access)
npm run typecheck
npm run stills                       # 3 PNG stills -> out/stills (frames 8,70,140)
npm run render:preview               # out/inventor_walkin_540x960.mp4
npm run render:final                 # out/inventor_walkin_1080x1920.mp4
npx remotion render src/index.ts NightShift10Preview out/nightshift_10s_540x960.mp4 --codec=h264 --crf=17
```
Without network access to remotion.media, point at an installed headless shell:
`BROWSER=/path/chrome-headless-shell npm run stills` or pass `--browser-executable=...` to `remotion render`.

`previews/` holds the committed test outputs (3 stills + the 540x960 MP4) rendered from this exact code.
