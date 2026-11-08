---
name: voice-to-video
description: TwistFrame Lab voice-to-video production. Use when the user attaches an MP3/WAV voiceover and says "MAKE VIDEO", "MAKE VIDEO FOR PAWAN", "make a TwistFrame video", or asks to turn narration into a cinematic 2.5D Short. Runs the full pipeline in the existing claude-animated-shorts project: audio analysis -> storyboard -> original scene code (2D characters in detailed 3D worlds) -> event-driven sound design -> batch render -> QC -> seamless-loop check -> MP4 + backup.
---

# TwistFrame Lab — voice-to-video skill

Project: `claude-animated-shorts/` (Remotion 4 + three.js + R3F in `studio/`). Config: `studio/twistframe.config.json`.
Full human guide: `VOICE_TO_VIDEO_GUIDE.md`. State of the project: `PROJECT_HANDOFF.md`.

## 0. Ground rules (never break)
- Do NOT use GitHub / GitHub Actions while the user's account is suspended. Commit locally only; deliver ZIPs.
- The narration is the master clock: never trim, speed, pitch, re-order or rewrite it. Only one uniform master gain.
- No captions, subtitles, text overlays, watermarks, logos, end cards or black frames. In-world signage only.
- Original characters/stories/sounds. Reference material is style guidance only. Synthesised SFX must be described as
  synthesised, never as field recordings.
- Never claim a render/QC/delivery that did not happen. If blocked, say exactly what blocks it.
- Check rendered frames (contact sheets, stills), not just code, before calling anything finished.

## 1. Start (new session or after restore)
1. If the project is missing, ask for the latest backup ZIP, unzip it into the working directory.
2. `bash studio/pipeline/setup.sh` (node deps, `.venv` with numpy/scipy/pocketsphinx, headless browser, typecheck).
3. Read: this file, `studio/twistframe.config.json`, `PROJECT_HANDOFF.md`, `references/MASTER_STYLE_BIBLE.md`,
   `references/SCRIPT_NARRATIVE_ANALYSIS.md`, the original root `SKILL.md`.

## 2. Pipeline (stages are scripts; Claude authors the creative middle)
```
P=studio/pipeline
bash $P/make_video.sh init   <id> <voice.mp3|wav> [transcript.txt]   # AUTOMATED: ffprobe, pauses, ASR, uncertainty flags
#   CLAUDE: productions/<id>/STORYBOARD.md (+ SOURCE_NOTES.md for facts) and the scene code (see §3)
bash $P/make_video.sh audio  <id> src/productions/<id>/scene.ts       # AUTOMATED: events -> SFX/ambience/music stems, ducked mix, cue sheet
bash $P/make_video.sh test   <id> <PreviewComposition> 0-59           # AUTOMATED: 2 batches, join, mux, objective QC
bash $P/make_video.sh render <id> <Composition>                       # AUTOMATED: all frames in resumable batches + mux
bash $P/make_video.sh qc     <id>                                     # AUTOMATED: full QC + loop-boundary test clip
bash $P/make_video.sh backup <id>                                     # AUTOMATED: project ZIP + ASSET_MANIFEST.md
```
If the transcript has ⚠ uncertain words and the user gave no transcript, use the most plausible reading for planning,
list the ⚠ lines in the report, and do not stop unless a word changes the story meaning.
After `test` passes its objective checks, continue to `render` without asking (Phase 11). Stop only for missing inputs,
tool failures needing the user, or changes to the voiceover/creative direction.

## 3. Scene authoring contract (what Claude writes per video)
- `src/productions/<id>/scene.ts`: pure functions of the frame — camera (keyframes -> monotone cubic -> Gaussian low-pass,
  see `src/desert/desertHook.ts`), character poses (odo5 rig: `pose5`, `COSTUME`, `ARM` presets), props in motion, and
  `soundEvents()` derived from the same animation data (foot contacts from gait phase, gestures, impacts). Export `FPS`,
  `FILM_FRAMES` (= analysis.frames), `soundEvents`.
- `src/productions/<id>/Film.tsx`: composition (pattern: `src/desert/LondonBridgeFilm.tsx`), register preview (540x960)
  and final (1080x1920) ids in `src/Root.tsx` with `durationInFrames = analysis.frames`.
- Reuse library: characters `src/char/odo5.ts` (+ CardSprite face-glow mask), post `src/lib/Post.tsx` (SSAO, DOF, bloom,
  grade), ink `src/lib/Ink.tsx`, worlds `src/desert/*` (desert, bridge, 1960s car, detail layer), `src/hall/*` (workshop
  hall + clutter), audio generators `studio/audio/desert_sfx.py` (desert/car/character), `crowd_sfx.py` (camera
  shutter, flash pop, cheer, crowd ooh, boat pass, crowd bed) + `sfx_gen.py`. Extend the library; do not fork it.
- Worked loop example: `src/productions/reopening/` (orbiting camera whose aim tracks the hero, integer-frequency
  periodic motion so frame N == frame 0, boats spaced one loop apart, event list built from the same data).
- `productions/<id>/production.json` picks the sound beds: `{"ambience": "desert|crowd|room|sea|none",
  "music": "desert_guitar|none", "composition": "<Preview>", "loop": true}`. Unknown event kinds are skipped by the
  mixer — add a generator + `LEVEL` entry in `audio/mix_events.py` for every new kind (check the cue sheet count).
- Run `npx tsx scripts/check-camera.ts`-style checks for the new camera (0 intersections, no speed spikes).
- Render 4+ stills across the loop (not only the key beats) before `test`: check the hero stays in frame at every
  phase of the camera sway, and look for HDR hot spots (a low sun glinting off glossy water/metal blooms into a
  white blob — fix with rougher materials or by moving the light, never by hiding the problem in the grade).

## 4. Locked visual rules
- Flat 2D illustrated characters (Canvas2D cards) in perspective-rich, detailed, motivated 3D worlds.
- **NO EARS** on stylised humans, ever (side hair stays inside the head silhouette). Head overlaps the pill torso: no gap.
- Brush outlines: variable width (thin top-left, heavy bottom-right), tapered strokes.
- Face-only glow mask (CardSprite `drawMask`, fill 0.8–0.95) + soft halo; never blown out (bloom threshold ≥ 1.5).
- Expressive brows/eyes/mouth; awkward/cringe meme beats when the story suits (freeze -> squint + yikes + sweat + blush).
- Walk: gait driven by on-screen travel (no foot slide), heel-strike/toe-off, hip dip, torso squash/tilt, opposite arm
  swing with elbow follow-through and wrist drag, lagging head bob. Open hands = fingers continue the forearm (rot ≈ 0).
- Costumes/geometry identical for the whole video.
- Environments: period-correct, story-motivated detail; proper UVs (world-scale/arc-length), no coplanar faces
  (z-fighting), contact shadows + SSAO, wind-driven secondary motion, background life. No primitive placeholders for
  hero objects.

## 5. Camera & loop rules
- ONE continuous take: no cuts/teleports; connected geography; smooth accel/decel; camera never inside meshes.
- Batches are frame ranges of the SAME composition (identical encoder settings) -> lossless join; audio muxed once.
- Seamless loop: plan the last ~1 s to return to the opening camera position/direction/velocity, lighting and pose;
  ambience/music are rendered loop-safe (`--loop`, tail crossfaded into head) and SFX that run past the last frame
  are wrapped onto the start (pre-rolls before frame 0 wrap to the end). Do not alter the voice to force a loop;
  if the words do not loop, keep the story and report it. QC writes `loop_boundary_test.mp4` + metrics.

## 6. Sound rules
- Event-driven, frame-accurate cues from the animation (never place sounds without a visible cause).
- Surface-specific footsteps only on foot contact; cloth, hands, props, vehicles, machinery, weather, ambience layers.
- Per-instance variation (seeded). Ducking under speech (amb −7, music −8, SFX −2 dB). One master gain set from the
  narration's loudness/peak + look-ahead limiter (−16 LUFS target, ≤ −1 dBTP).
- Deliver stems: narration (untouched), sfx, ambience, music, mix + cue sheet (frame, times, source, level, pan, fades, FG/BG).

## 7. QC & reporting
- `qc.py` hard checks: codec/size/fps, frame count = narration frames, duration, black frames, clipping, sync (cross-
  correlation). Soft: freezes, loudness, loop metrics. Then Claude inspects the contact sheet + key stills for: ears,
  head/torso join, hands/feet, geometry artifacts, lighting, detail, camera feel — and says honestly what is weak.
- Final report: what was automated vs authored, timings, QC table, ⚠ transcript words, known weaknesses, links to files.
- Deliver with SendUserFile: final MP4, stems/cue-sheet ZIP, backup ZIP.

## 8. Explicit invocation (if auto-activation does not trigger)
`/voice-to-video MAKE VIDEO FOR PAWAN` (with the audio attached), or say: "Use the voice-to-video skill on the attached audio."
