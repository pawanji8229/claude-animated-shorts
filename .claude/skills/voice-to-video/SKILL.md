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
bash $P/make_video.sh audio  <id> src/productions/<id>/scene.ts       # AUTOMATED: crowd check, events -> stems, narration-priority mix, cue sheet, mix_report
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
- Reuse library: characters `src/char/odo5.ts` (+ CardSprite face-glow mask; optional `camera`, `headRoll`, `bodyRoll`),
  crowd behaviour `src/char/crowdLife.ts` (personas, clips, derived sound events, flashes), post `src/lib/Post.tsx` (SSAO, DOF, bloom,
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

## 4b. Crowd & background-character rules (MANDATORY for every crowd, any size)
- Build crowds with `src/char/crowdLife.ts`: one `Persona` per person (stable seed, own idle stance —
  rest/clasp/behind/hip/pockets —, own breathing + sway rates as integer cycles per loop, temperament, mood, eyes) and an
  INDIVIDUAL clip schedule. Worked example: `src/productions/reopening/scene.ts` (`PERSONAS`).
- **NO SYNCHRONISED CROWD ANIMATION.** Never drive several people with one curve, one sine or one timeline, and never
  "offset the same animation by a few frames". Each person gets different clips, start times, durations, holds,
  amplitudes and reaction delays. Typical mix: some clap in short bursts, some chat (head turned to a neighbour,
  irregular syllables, small hand gesture) and laugh/nod, some watch the landmark, one waves briefly, some fix a hat or
  lapel, some just stand and breathe, some react LATE to the main action.
- Photographers follow the full sequence per person: notice -> look at the subject -> reach for the camera (dominant
  hand first, other hand a few frames later) -> raise -> settle/aim (small drift) -> press (2-frame dip) -> wind on the
  film -> second shot or lower (some check the camera) -> let it hang on the strap -> idle. Different photographers
  start at clearly different times; some shoot early, some late, most people never photograph. Not every shot flashes.
- Flashes: brief (peak on the shutter frame, gone after 3 frames), small, from that person's camera position, one
  always-mounted fill light moved to whoever fires (no light add/remove). Never two flashes within 8 frames.
- Place people so nobody who performs an action is hidden behind the hero at the moment of the action (check stills
  at each action frame along the camera path; swap who stands where rather than retime the story).
- Every crowd sound is derived from the same clips (`personEvents`): shutter on the press frame, flash pop only on
  flash shots, film advance on the wind-on, one soft clap per palm contact, quiet cloth on gestures. No disconnected
  or mass-synchronised shutter/clap sounds.
- Gate: `scripts/check-crowd.ts` runs automatically in `make_video.sh audio` for any scene that exports `PERSONAS`
  (max pairwise hand-motion correlation ≤ 0.6, never > half the crowd gesturing in one frame, shutters ≥ 6 frames
  apart, flashes ≥ 8 apart, camera raises ≥ 10 apart, not everyone photographs, and — when the scene exports `camAt`,
  `CROWD`, `HAL` — every photographer on screen and unobstructed at each shutter frame, so no shutter is heard from an
  unseen camera). Fix the schedules or positions if it fails; keep the whole crowd inside the strip the camera sees.
- Then inspect CONSECUTIVE frames around every photography event (raise, press, flash, lower) in the encoded video.

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
- Per-instance variation (seeded). Rich detail is welcome (hundreds of cues in a long video) but NEVER at the expense
  of narration clarity: **the narrator is always the clearest sound.**
- Narration-priority mix (`audio/mix_events.py`, settings in `twistframe.config.json` audio.mix):
  - levels are set RELATIVE to the narration: event peaks in dB under the narration peak (`REL` table), beds in LU
    under the narration loudness. Starting points: footsteps −10…−12, shutters −15 (short, subtle), flash −23, film
    advance −25, cloth −23…−28, soft claps −23, major effects (car, door, impact) −6…−9; ambience beds −23…−30 LU,
    crowd murmur −28 LU, music −21 LU (≈ 20–25 dB under speech after ducking). Adjust by measuring the result.
  - crowds are a QUIET, DISTANT murmur + individually triggered soft claps. No shouting, screaming, "woo!" or
    repetitive cheering loops; `cheer`/`crowd_ooh` only for a rare, story-critical beat, at −27 dB or lower.
  - smooth ducking under speech (60 ms attack, 600 ms release; sfx −4, crowd −8, ambience −6, music −10 dB);
    backgrounds come back gently in pauses; no sudden jumps.
  - word masking guard: every ASR word must stay ≥ 15 dB above all other layers in the 300–4000 Hz speech band;
    the mixer measures each word and pulls the background down around any word that fails (smooth ramps), logging
    every cut in `mix_report.json`. If a sound still masks a word, lower or remove that sound.
  - one master gain (≤ 2 dB of transparent peak limiting on the voice), −16 LUFS, ≤ −1 dBTP. Narration timing,
    content and tone are never edited.
- Deliver stems: narration (untouched), sfx, crowd, ambience, music, mix + cue sheet (frame, times, source, stem,
  level re narration, pan) + `mix_report.json` (measured stem levels vs narration, per-word margins, guard cuts).
- Intelligibility check before delivery: QC fails if the worst word margin < 12 dB or the crowd stem is louder than
  −18 LU re narration; also listen-check the phrase with the densest effects.

## 7. QC & reporting
- `qc.py` hard checks: codec/size/fps, frame count = narration frames, duration, black frames, single-frame glitches
  (a frame unlike both neighbours), clipping, sync (cross-correlation), narration intelligibility (worst word margin)
  and crowd level (from `mix_report.json`). Soft: freezes, loudness, loop metrics. Then Claude inspects the contact sheet + key stills for: ears,
  head/torso join, hands/feet, geometry artifacts, lighting, detail, camera feel — and says honestly what is weak.
- Final report: what was automated vs authored, timings, QC table, ⚠ transcript words, known weaknesses, links to files.
- Deliver with SendUserFile: final MP4, stems/cue-sheet ZIP, backup ZIP.

## 8. Explicit invocation (if auto-activation does not trigger)
`/voice-to-video MAKE VIDEO FOR PAWAN` (with the audio attached), or say: "Use the voice-to-video skill on the attached audio."
