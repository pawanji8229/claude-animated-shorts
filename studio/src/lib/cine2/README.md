# TwistFrame Cinematic Systems 2.0 (`src/lib/cine2`, `audio2/`)

Four opt-in systems: Camera 2.0, Lighting 2.0, World 2.0 and Audio 2.0. No approved production imports them.
CentSet, Post, odo5, the approved videos, the benchmark and the MAKE VIDEO skill are unchanged.

- **Branch:** `experimental/cinematic-systems-2.0`, built on `experimental/character-evolution-2.0` (TF2).
- **Environment:** software WebGL (SwiftShader / ANGLE) through Remotion + React Three Fiber, 30 fps, 9:16.
- **Determinism:** everything is deterministic. Every value is a pure function of the frame, so any frame can be rendered alone in any render chunk.

## Quick start: using the systems in a new production
```tsx
import * as C from "src/lib/cine2/cam";                                  // Camera 2.0
import { lightScene, LIGHT_PRESETS } from "src/lib/cine2/light";          // Lighting 2.0
import { Stage2 } from "src/lib/cine2/light/Stage2";                       //   renderer (CentSet + Post2)
import { buildWorld } from "src/lib/cine2/world";                         // World 2.0
import { World2, worldPracticals } from "src/lib/cine2/world/World2";
import { worldObstacles } from "src/lib/cine2/lab/labSet";

const { recipe, world } = buildWorld("harbor", "STANDARD", seed, { samples: [camGuess], subject });
const plan = C.direct(beats /* from the narration timeline or C.beatsFromScript(tf2Script, ...) */, subjects,
                      { env: { obstacles: worldObstacles(world), ground: () => 0 } });
const light = lightScene({ id: "s1", location: "harbor", hour: 17.5, subjectKind: "character", emotion: "curiosity" }).spec;
// per frame:
C.layers(plan, f).map(({ cam, opacity }) => <Stage2 cam={C.toRender(cam)} light={{ ...light, practicals: worldPracticals(world, light) }}
  f={f} quality="BALANCED" opacity={opacity} world={({ hi, light }) => <World2 recipe={recipe} world={world} f={f} cam={cam.pos} shot={shotSamples} light={light} hi={hi} />} />)
```
Audio: export a scene JSON (`scripts/export-demo-audio.ts` is the template), then run:
```
python audio2/mix_demo.py scene.json outdir video.mp4 --narration voice.mp3 --analysis analysis.json
```
The working example of all four systems together is `lab/Demo.tsx` with `scripts/export-demo-audio.ts`.

## Camera 2.0 (`cam/`)

| File | What it does |
|---|---|
| `core.ts` | Vector maths, camera state (position, aim, focal mm, focus m, f-stop, roll) and the virtual lens. Focal ↔ FOV uses a 9:16 frame with full-frame diagonal, so 35 mm means 35 mm. Includes thin-lens depth of field, blur capped at 0.32 with the subject depth always in focus, 10 easing curves (incl. `cine`, `settle`, `launch`, `land`), a continuous-acceleration trapezoid profile with explicit accel/decel, and deterministic handheld noise. |
| `moves.ts` | 27 moves. Each takes f0/f1 or a speed, easing or accel/decel, intensity, focal (zoom), aperture, focus target or rack, roll and handheld. |
| `frame.ts` | 8 shot sizes, 5 vertical and 5 horizontal angles, side choice (180° rule), dutch. The 9:16 framing solver puts the eye line on the upper third and full-body shots inside the Shorts safe area. Composition score covers safe area, thirds, look room, hierarchy and size. |
| `collide.ts` | Obstacles (boxes, spheres, cylinders) and ground height. Smooth push-out with clearance (no kinks). Line-of-sight visibility: see-through obstacles count half, or 85 % within 6 m of the lens, where they fill the frame. |
| `presets.ts` | 13 presets, each with real parameters and its own build logic. |
| `director.ts` | Beats → shots, with explained choices. Continuity-aware transitions are sized by travel, turn and zoom limits. In-scene blends; opacity dissolves for scene changes or impossible moves. Global low-pass for jitter reduction. `segmentCams` and `shotList` helpers. |
| `tf2.ts` | Character 2.0 → camera beats. Tiny beats are merged so the camera doesn't chase small movements. |
| `qc.ts` | Automated checks (listed below). |

**Moves:** dolly, slowPush, dramaticPush, pullBackReveal, track, sideTrack, follow, actionFollow, orbit, arc, circular, crane up/down, pedestal, pan, tilt, truck, parallax, approach, depart, fgReveal (foreground-to-background with rack focus), passAround, aerial, establishing, hold (breathing), POV, plus a handheld layer.

**Presets:** documentaryCinematic, epicScaleReveal, historicalDocumentary, mysteryReveal, dramaticCloseup, giantStructureReveal, smoothFollow, cinematicOrbit, environmentalEstablishing, actionTracking, emotionalCharacter, objectDetailReveal, aerialEnvironmentReveal.

**How the director chooses a shot:**
1. Beat kind + emotion gives an ordered list of candidate presets.
2. Each candidate is built and scored over its duration:
   - 9:16 composition;
   - line of sight through the real set;
   - camera clearance;
   - continuity with the previous camera (angle continuity: same subject → same side, the size changes);
   - variety (never the same preset 3× in a row).
3. The best candidate is kept. Every shot's `why` explains the choice.

**Character 2.0 integration** (`beatsFromScript`):
- walk → follow or track;
- stop → settle;
- point → reveal the pointed-at place;
- look at → attention;
- emotion level ≥ 4 → push-in on the face;
- reach / push → two-shot.

**QC checks:** jumps, jitter (acceleration reversals), speed and acceleration spikes, rotation speed and jolts, focal-length jumps, rapid focus reversals (focus hunting), invalid coordinates, clipping into geometry, subject leaving the frame or the safe area, movement during holds, dutch overuse.

**Non-human subjects:** shot sizes are defined on the human figure, so a preset never crops a vehicle, structure or large object tighter than FULL. Without this, an MWS orbit of an excavator put the lens inside the machine.

**Known limitation:** characters are 2D cards. Bird's-eye and worm's-eye angles on a character are capped to about ±35° (structures get the full range).

## Lighting 2.0 (`light/`)

| File | What it does |
|---|---|
| `model.ts` | Linear-light colour and Kelvin colour temperature. Sun position from hour, latitude and day; sun colour, strength and sky colours from elevation; moon. The `LightSpec`: key, sky, ambient floor, image-based lighting (room environment or a CC0 library HDRI), fill/rim/bounce extras, height fog and atmosphere, god rays, dust, exposure, colour profile, white balance, wetness, weather, practicals, character parameters. Smooth linear-light blending between specs (`mixSpec`). |
| `presets.ts` | `natural()` time-of-day light; 9 weather modifiers; **25 presets**; **14 lighting setups** relative to the camera; **20 colour profiles**; **4 quality profiles**. |
| `Post2.tsx` | A copy of the approved Post. Adds height + distance fog with atmospheric perspective and sun in-scatter (from depth), sky-masked screen-space god rays, a configurable SSAO sample count (0 / 8 / 12 / 16), partial white balance and gain/gamma. |
| `Light2.tsx` | Light rig with a texel-snapped stable shadow frustum and bias tied to the shadow-map texel. Practicals: emissive source plus additive ground light pool for every lamp; real lights only for the N most important, chosen per shot so they never pop. Also LightShaft, ContactShadow (the LOW-profile substitute for AO), deterministic Weather (rain, snow, dust), WaterSurface (Gerstner waves, env reflections, glints) and Puddle. |
| `materials.ts` | 20 surface types with plausible roughness, metalness, env response and albedo. Seeded triplanar variation (albedo breakup, roughness noise, grime). Wetness response. Shared materials. |
| `director.ts` | Location, hour, weather, emotion and subject → spec with reasons. Sequence continuity: adjacent scenes differ by at most 1/3 stop and 400 K. Time-lapse and doorway transitions. Character assist for low-angle shots (a small face-fill boost, not auto-exposure). |
| `Toon2Lit.tsx` | The TF2 card lit by the spec: albedo, consistent warm-white face glow (0.7–0.95) with 15 % environment tint, and a rim/back-glow approximation. |
| `Stage2.tsx` | CentSet-style frame using Camera 2.0, Lighting 2.0 and Post2. |
| `qc.ts` | Spec validation and lighting-transition stability (`lightStability`). |

**Continuity:** `natural()` is continuous in time. The day (sun) and night (moon) rigs cross-fade, exposure and the colour grade blend (`profileW`), and night practicals and lit windows fade in with a continuous `nightLevel` instead of switching on in one frame. `scripts/test-light2.ts` guards this.

**Presets:** cinematicDocumentary, goldenHour, beautifulSunrise, brightDaylight, overcastDaylight, dramaticSunset, blueHour, moonlitNight, cityNight, industrialFactory, constructionSite, historicalArchitecture, interiorWarm, interiorCold, foggyEnvironment, rainyStreet, stormyAtmosphere, desertSunlight, forestLighting, harborShips, tunnelLighting, dramaticCharacter, objectPresentation, cinematicSilhouette, epicEnvironmentReveal.

**Setups:** three-point, key/fill/rim, dramatic side, backlight, silhouette, soft frontal, window, top, low-key, high-key, warm/cool, architectural, industrial, documentary.

**What each technique really is (real-time, baked or approximate):**

| Real-time | Approximate |
|---|---|
| Directional / hemisphere / ambient / point / spot lights | God rays: screen-space radial blur |
| PCF soft shadow maps | Fog: computed in post from depth, not volumetric |
| Image-based lighting: PMREM room environment or library HDRI | Light pools and light shafts: additive geometry |
| Screen-space AO | Rim light on a flat card: additive glow |
| | Water reflections: environment map only, no planar reflection |

There is **no global illumination.** Bounce light is a directional "bounce" fill.

**Quality profiles,** measured at 1080×1920, one frame per process, the same populated city shot:

| Profile | Seconds per frame |
|---|---|
| Approved pipeline (old) | 1.96 |
| LOW | 2.72 |
| BALANCED | 3.35 |
| HIGH | 3.05 |
| CINEMATIC | 3.30 |

HIGH and CINEMATIC only add cost where the sun is in frame (god rays) and in shadow-map resolution. In this shot the sun was outside the frame, so their times are within measurement noise of BALANCED.

## World 2.0 (`world/`)

| File | What it does |
|---|---|
| `kit.ts` | Geometry DSL in metres, object definitions, merge-by-material. |
| `objects/street.ts`, `objects/works.ts` | **132 original procedural object types** with 3 LODs each. Categories: street furniture, vehicles, vegetation, construction (machines with moving rigs), harbour, industrial, interiors (living room / kitchen / office / public), station, nature, micro-detail. Each has era, environments, real size, placement type, solidity, light emitter, audio metadata, animation and an optional Model Vault (Poly Haven CC0) counterpart. |
| `building.ts` | Procedural shops, cafes, restaurants, houses, apartments, offices, warehouses and historic buildings with full facade detail. |
| `place.ts` | Placement engine, density levels and per-shot visibility/LOD (detailed below). |
| `recipes.ts` | 10 environments, each with base set, population rules, movers, walkers, birds, light preset and ambience: city street, construction site, harbour, factory, historic town, residential interior, countryside, railway station, warehouse, waterfront. |
| `life.ts` | Vehicles with stop/acceleration physics and wheel roll by arc length; walkers as TF2 scripts; birds; audio sources. |
| `World2.tsx` | Renderer: outskirts ground to the horizon for exterior sets, instancing, shared materials, moving rigs, rolling wheels, bobbing boats, smoke/steam, birds, walkers, contact shadows at LOW. |
| `validate.ts` | Automated checks (listed below). |

**Placement engine** (`place.ts`):
- Rule types: along edges (curbs, facades, quay edges, walls), scatter in areas, clusters around a work area, hero `at` placements and rows.
- Collision uses oriented footprints with vertical ranges, so stacking works.
- Nothing is placed inside buildings, on roadways or on vehicle lanes. Trunk-only footprints let canopies overhang.
- Camera-aware: rejects objects that would block the sight line to the subject.
- Era and environment consistency enforced; deterministic seeds.
- Density levels: MINIMAL, STANDARD, RICH, CINEMATIC. Micro-detail is placed only near the camera path.
- Per-shot visibility and LOD: decided once per shot from the shot's camera samples, never per frame, so nothing pops.

**Validation checks:** floating or sunken objects, overlaps, objects inside buildings, scale, missing materials or geometry, era and environment consistency, required environmental details per environment (storytelling), excessive density, empty scenes, duplicates, camera obstruction, triangle and draw-call cost, vehicle paths through objects.

## Audio 2.0 (`audio2/`)
See `audio2/README.md`.

## Labs and tests

| Command | Result |
|---|---|
| `npx tsx scripts/test-cam2.ts` | 78 tests |
| `npx tsx scripts/test-world2.ts` | 44 tests (incl. all 60 World lab cameras: outside geometry, clear line of sight) |
| `npx tsx scripts/test-light2.ts` | 74 tests: time-lapse and doorway transitions have no single-frame pops |
| `python audio2/test_audio2.py` | 28 tests |

**Lab compositions** (`src/Root.tsx`):

| Composition | Content |
|---|---|
| C2Smoke | One frame per lighting preset |
| C2World | 10 environments × 6 modes |
| C2CamMoves | Movement demos |
| C2CamAngles | Angles, sizes and lenses with safe-area guides |
| C2CamOld / C2CamNew | Old vs new camera, same beats |
| C2CamPath | Path-visualisation tool |
| C2LightLab | 34 lighting demos, incl. old vs new |
| C2LightMove | Stability clip |
| C2BenchOld / C2BenchNew | Performance benchmarks |
| C2Demo | Integration demo |
