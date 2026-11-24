# TwistFrame Cinematic Systems 2.0: Report

**Branch:** `experimental/cinematic-systems-2.0`, built on `experimental/character-evolution-2.0` at commit `0430852`. **Not merged** into any production branch: merging needs your explicit approval.

**Safety status (checked after the last change):**
- Every protected branch is at its original commit:
  - main
  - twistframe-original-restored
  - render/twistframe-original
  - experimental/pipeline-v3
  - render/twistframe-boeing*
- The 27 hashed production files are unchanged: Post, CentSet, enhance/*, CardSprite, odo5, audio/*.py, SKILL.md files, the London Bridge common file and others.
- `references/benchmarks/reopening_v2_approved/` is unchanged.
- Nothing was published.
- No raw Mixkit file is in git.

All four systems are **opt-in**. No approved production imports them, and an existing video renders exactly as before.

## Tests (all automated, all passing)

| Suite | Command | Result |
|---|---|---|
| Camera 2.0 | `npx tsx scripts/test-cam2.ts` | 78 / 78 |
| World 2.0 | `npx tsx scripts/test-world2.ts` | 44 / 44 |
| Lighting 2.0 continuity | `npx tsx scripts/test-light2.ts` | 74 / 74 |
| Audio 2.0 | `python audio2/test_audio2.py` | 28 / 28 |
| Character 2.0 (regression) | `npx tsx scripts/test-tf2.ts` | 35 / 35 |

## Defects found by inspecting the lab renders, and fixed

1. **Camera inside a machine.**
   - **Problem:** the "cinematic partial orbit" passed through the excavator. Shot sizes are defined on the human figure, so a medium-wide orbit of a 6.5 m machine put the lens 0.5 m from it.
   - **Fix:** presets never crop a vehicle, structure or large object tighter than FULL.
2. **Edge of the set visible.**
   - **Problem:** the epic scale reveal rose high enough to show the end of the ground.
   - **Fix:** exterior sets now get an outskirts ground that reaches the horizon.
3. **Lighting pops at dusk.**
   - **Problem:** in the time-lapse clip, street lamps switched on in one frame (a 22.7/255 jump in average luminance). Exposure and the moon key also jumped at two more frames.
   - **Fix:**
     - `natural()` now cross-fades the day and night rigs, and exposure and the colour grade blend continuously.
     - Night lamps and lit windows fade in.
   - **Result:** the largest single-frame step is now 2.1/255. `test-light2.ts` guards against regressions.
4. **Giant-structure reveal too close.**
   - **Problem:** the camera stood about 1.4 m from the 14 m-wide concrete frame, under its first slab.
   - **Fix:**
     - The stand-off is now measured beyond the subject's half-width.
     - See-through clutter (scaffold, fence) within 6 m of the lens now counts as 85 % blocking instead of 50 %, so the director rejects shots where it fills the frame.
     - The demo keeps its orbit opening; its camera path was checked to be identical.
5. **Blocked World lab views.**
   - **Problems:**
     - A quay-crane leg filled three harbour views.
     - The street's wide view sat inside a building.
     - The wide views of the interiors looked at the room from outside.
   - **Fix:**
     - The lab cameras are now chosen by `labCam()`, which checks every view against 3D obstacle boxes and keeps interior cameras inside the room.
     - The crane was moved off the sightline.
     - A test covers all 60 views.

## CAMERA 2.0 (`src/lib/cine2/cam/`)

**Implemented and tested:**
- **Virtual lens:**
  - real focal lengths for 9:16 (35 mm ≈ 56.6° vertical);
  - thin-lens depth of field with blur capped so the subject is never soft;
  - rack focus.
- **Movement:** 27 moves with speed, easing, explicit acceleration/deceleration (trapezoid), intensity, zoom, focus, roll and deterministic handheld.
- **Framing:** 8 shot sizes, 5 vertical and 5 horizontal angles, the 180° rule and dutch angles. A 9:16 framing solver puts the eye line on the upper third and keeps bodies inside the Shorts safe area, and a composition score rates each frame.
- **Collision:** push-out with clearance, ground limit, line-of-sight scoring.
- **Presets and director:**
  - 13 presets, each with its own build logic.
  - A director that turns beats into shots. It scores composition, visibility, clearance, continuity and variety, and records a `why` for every shot.
  - Transitions are sized by travel, turn and zoom limits; opacity dissolves are used only where a move is impossible.
- **Character 2.0 bridge** (`beatsFromScript`): walk, stop, point, look, emotion and reach each become camera beats.
- **QC:** checks for jumps, jitter, speed and acceleration spikes, rotation jolts, focal jumps, focus hunting, clipping, subject leaving the frame or safe area, movement during holds and dutch overuse. The QC itself is tested: it detects 8 kinds of planted defect.

**Lab:**

| Deliverable | What it shows |
|---|---|
| `camera/C2CamMoves.mp4` | 8 demos (sheet: `moves_sheet.png`) |
| `camera/angles_sheet.png` | 16 angle and lens stills with safe-area guides |
| `camera/old_vs_new.mp4` | The same beats with the old keyframed camera and the new director |
| `camera/campath.png` | Path visualisation. The new camera peaks at about 1.4 m/s with much lower acceleration, vs 5.4 m/s for the old one |

**Approximate or limited:**
- Characters are flat cards. Bird's-eye and worm's-eye shots of a character are capped at about ±35°; structures get the full range.
- Collision uses boxes, spheres and cylinders rather than true meshes.
- Obstacles must be supplied (from World 2.0 or by hand).

**Weak spots seen in the renders:**
- The forced "giant structure reveal" lab demo (one preset, no choice) still looks through the scaffold in front of the frame. In a real plan the director now rejects that shot (line of sight 15 %); the demo picked the orbit instead.
- The follow camera mostly shows the hero's back, which reads as an empty head on the flat card. The director prefers three-quarter angles elsewhere.

**Not done:**
- No production video has been made with Camera 2.0 yet.
- The integration demo is the only real scene.

**Activation:** see `src/lib/cine2/README.md` → Quick start. In short:
1. Build beats from the narration timeline, or with `C.beatsFromScript(tf2Script, ...)`.
2. Call `C.direct(beats, subjects, { env: { obstacles } })`.
3. Render each frame from `C.layers(plan, f)` with `Stage2`.

## LIGHTING 2.0 (`src/lib/cine2/light/`)

**Implemented and tested:**
- Sun and moon from hour, latitude and day; Kelvin colour; 9 weather modifiers.
- 25 presets, 14 camera-relative setups, 20 colour profiles.
- 4 quality profiles (LOW, BALANCED, HIGH, CINEMATIC).
- Stable texel-snapped soft shadows.
- SSAO with a configurable sample count; LOW uses contact shadows instead.
- Height and distance fog with sun in-scatter; screen-space god rays.
- Practical lights: every lamp gets an emissive source and a ground pool, and only the most important N get real lights, chosen per shot.
- Materials: 20 surface types with wetness and triplanar variation.
- Water with Gerstner waves.
- TF2 card lighting with a consistent face glow.
- A lighting director with reasons for each choice and sequence continuity.
- Time-lapse and doorway transitions, continuous and tested.

**Lab:**

| Deliverable | What it shows |
|---|---|
| `lighting/lightlab_sheet.png` | 34 demos, including old vs new |
| `lighting/C2LightMove.mp4` | Time-lapse flicker test, before and after the fix |

**Benchmarks:** 1080×1920, seconds per frame on this CPU-only container (software WebGL, no GPU assumed):

| Pipeline | s/frame |
|---|---|
| Old approved pipeline | 1.96 |
| LOW | 2.72 |
| BALANCED | 3.35 |
| HIGH | 3.05 |
| CINEMATIC | 3.30 |

HIGH and CINEMATIC cost more only when the sun is in frame (god rays). It wasn't in the benchmark shot, so those numbers are within noise of BALANCED.

**Approximations (stated honestly):**
- No global illumination: bounce is a directional fill.
- Fog is post-process from depth, not volumetric.
- God rays are screen-space.
- Water reflects only the environment map.
- Rim light on a flat card is an additive glow.
- No HDRI is bundled. The system accepts a CC0 HDRI from the Model Vault, otherwise it uses a procedural room environment.

**Weak spots seen in the renders:**
- The harbour and fog lab frames are dominated by the container ship close to the camera.
- The character lighting setups differ little on a flat card.
- Sodium street-lamp pools on wet or dark asphalt read strongly orange at dusk.

## WORLD 2.0 (`src/lib/cine2/world/`)

**Implemented and tested:**
- **Objects:** 132 original procedural object types, each with 3 LODs, real size, era, environment, solidity, light, audio and animation metadata.
- **Buildings:** procedural buildings with full facades.
- **Environments:** 10 recipes, each with population rules, movers, walkers and birds:
  - city street, construction site, harbour, factory, historic town;
  - residential interior, countryside, railway station, warehouse, waterfront.
- **Placement engine:**
  - edge, scatter, cluster, hero and row rules;
  - oriented footprints with vertical ranges, so stacking works;
  - no objects inside buildings, on roads or on vehicle lanes;
  - camera-aware, era- and environment-consistent;
  - 4 density levels;
  - LOD and visibility decided once per shot, never per frame.
- **Life:** vehicles with stop/go physics and rolling wheels, birds, smoke and steam, moving machine rigs.
- **Audio metadata** for Audio 2.0, and the surface under the foot for footsteps.
- **Validation:** checks for floating objects, overlaps, scale, era, required story details, density, duplicates, camera obstruction, cost and vehicle paths.

**Lab:**
- `world/world_sheet.png`: rows are the modes (populated, basic, wide, detail, rich, night); columns are the 10 environments.
- `world/basic_vs_populated.png`: each environment before and after population.

**Weak spots seen in the renders:**
- Some "detail" views frame very little: a wall corner in the historic town, and plant leaves too close in the interior.
- The harbour populated view is mostly the ship's hull.
- The construction site at night used an indoor factory preset (brown sky). Fixed: it now uses city night.

**Limitations:**
- Everything is procedural, low-poly geometry. It's clean and consistent but stylised, not photoreal.
- Model Vault (Poly Haven CC0) counterparts are mapped, but the labs use the procedural versions.
- Countryside terrain is a heightfield. Interiors are box shells.

## AUDIO 2.0 (`studio/audio2/`)

**Sound library (quality over quantity, every file with source and licence):**
- **874 verified sounds** in 41 categories:
  - 554 CC0 from Kenney;
  - 320 Mixkit (Sound Effects Free License);
  - 3 duplicates removed by sha256.
- Each entry records: source page, file URL, licence, licence URL, attribution, sha256, duration, format and status. The registry and `LIBRARY.md` are committed. Raw Mixkit files stay in the gitignored cache because their licence forbids redistribution.
- **Honest gap:** the library is uneven.
  - Strong: UI (150), music jingles (86), electronic and magical sounds (143), footsteps (48), metal, stone and wood impacts (100), object handling (42), vehicles (29).
  - Thin: whooshes (2), forest ambience (2), explosions (3), swishes (4).
  - 16 original synthesised sounds cover risers, whooshes, impacts, drones, and footsteps on sand, snow, mud and water. They are labelled `synth:` and never presented as recordings.

**Review queue** (not downloaded, nothing bypassed):

| Source | Why it's in the queue |
|---|---|
| Pixabay | HTTP 403 to automated clients |
| Freesound | Needs an API key, and each recording has its own licence |
| ZapSplat | Needs an account and attribution; unreachable from here |
| Mixkit music | The licence couldn't be machine-verified |
| 4 Mixkit items | Returned HTTP 403 |

**Implemented and tested:**
- Engine: search, anti-repetition chooser, single footsteps cut from walking takes, events with automation, 3D position with distance and air absorption, seamless loops, reverb per environment.
- Narration-first mixer:
  - levels relative to the narration and sidechain ducking;
  - a per-word masking guard that keeps every word at least 15 dB above everything else;
  - −16 LUFS with a −1.5 dBTP true-peak limiter.
- Narration validation; the voice is never edited.
- Original generative score with 12 moods.
- Automatic sound director: every cue has a reason, and camera moves are silent unless they are reveals or dissolves.
- Export: stems, mix, AAC and mux, plus a cue sheet and `mix_report.json`.

**Lab** (`audio/`): 15 MP3 + WAV demos and `lab_report.json`. Measured:
- narration mix −16.17 LUFS, −1.5 dBTP;
- worst word margin 15.1 dB;
- AAC round-trip 0.03 LU change;
- same-file footstep repeats: 39 of 40 with the old approach vs 0 now.

**Integration demo** (`demo/demo_with_audio.mp4`): all four systems together, with the soundtrack built automatically from the scene data:
- 31 gravel footsteps from real foot contacts;
- machine loops tracked relative to the camera;
- a riser on the reveal.

**Needs your approval or external services:**
- A Freesound API key, if you want curated Freesound recordings; each file needs its own licence check.
- Any paid library (not used).

**Untested:**
- Audio 2.0 has not been run on a real narrated production. The labs use a synthetic narration test and the existing ASR word timings.
- Spatial audio is stereo only, with no binaural or surround output.

## How to activate in a future TwistFrame video
1. Check out this branch, or merge it after approval.
2. Follow `src/lib/cine2/README.md` → Quick start. The working template is `lab/Demo.tsx` + `scripts/export-demo-audio.ts`.
3. Run the audio step:
   ```
   python audio2/mix_demo.py scene.json productions/<id>/audio2 render.mp4 --narration <voice> --analysis <analysis.json>
   ```
4. The MAKE VIDEO skill is unchanged. Using 2.0 in it is a deliberate, separate step that needs your approval.

## Changed files (vs `0430852`)
63 files, all additions except two small edits:
- `src/Root.tsx`: lab compositions registered.
- `src/char/tf2/planner.ts`: a new exported `charPath` helper.

The new files are under `src/lib/cine2/`, `audio2/`, plus the scripts `test-cam2.ts`, `test-world2.ts`, `test-light2.ts` and `export-demo-audio.ts`. Full list: `git diff --name-status 0430852 HEAD`.
