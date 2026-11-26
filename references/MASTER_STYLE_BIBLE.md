# MASTER STYLE BIBLE — Verified v2 (Text-only safe to put in code repository)

This file overrides provisional stylistic assumptions in Gemini's report wherever they conflict with directly observed user-supplied frames. Refer to `references/OBSERVED_VIDEO_STYLE.md` and `references/VIDEO_MANIFEST.md` for evidence/uncertainties.

## Identity: original 2.5D cinema, not photoreal people
- **Preferred character mode: HYBRID_2_5D.** Build fully original, flat-illustrated or planar-layered face/character components within dynamic perspective-rich Three.js environments. Fake volume via layered hair, shoulder/body thickness, subtle surface shading, 3D shadows and contact points. Avoid obvious billboard swivel artifacts.
- Use legible circle/oval faces and slim simplified bodies **without cloning exact reference face, line proportions, eye layout or costume**. Keep a stable master character model sheet and identifiable silhouette across scenes. Test frontal, 3/4 and side views; any camera facing behavior must be intentional.
- **Secondary optional mode: FULL_3D_TOON**, an original volumetric mesh option. Require side-by-side comparison stills with hybrid before enabling; more 3D polygons do not automatically mean closer reference similarity.

## Rendering & composition
- 9:16 vertical; source reference videos confirmed 720x1280 at 30fps; target final 1080x1920 at 30fps; preview 540x960. **[corrected]** This conflicts with the upstream bridge rule (final 2K 1440x2560, `--scale 1.3333`). Default for `studio/` jobs is 1080x1920; use 2K only if the user asks for the bridge spec and the runner time allows.
- Three layers: meaningful detailed foreground, hero action in middleground, deep background with architectural perspective. Keep high-resolution edges on character contours and silhouettes.
- One motivated light source per dramatic scene: warm practical lamp, blue street ambience plus warm doorway, daylight/overcast sea, clinical ceiling panels, warm wooden indoor sconces. Add soft fill/rim only for legibility.
- Rich env props with perspective: floor grids/wood planks, arcade rows, ship rigging or desks, with bevels and subtle varied materials. Original hero props only.
- Lighting presets are **starting test values**; no claims about physically measured RGB, lux, ACES mode or material roughness from original videos.
- Keep environmental atmosphere (fog/rain/particles) lightweight and optional for CPU GitHub Actions; use fake depth layers when heavy shaders fail.

## Animation & editing
- All motion deterministic from Remotion `useCurrentFrame()` and `interpolate`/`spring`, synchronized to shot timestamps. Use original expressions, a small number of expressive poses, deliberate zoom/dolly/orbit and coherent orientation.
- Structure hook in first 1–3 seconds, alternate medium and establishing and close details, match beats to a distinct visual action. Do not reproduce the source sequence, audio, characters or wording.
- Use screen-safe captions **ON by default when matching the format of the user-provided samples**, typically white text with dark outline/shadow; configurable `CAPTIONS=false` for upstream no-caption jobs. Do not apply universal yellow text; this was not confirmed by observed frames.

## Sound
- Five provided MP4 files contain AAC audio. Only overall audio amplitude was measured programmatically; musical genre, voice timbre, literal SFX and timecode cues remain **unverified** and must not be presented as first-hand audio findings.
- New productions require original/licensed voice, SFX and score. Define narration words/timing, background scene bed, punctual action SFX, transitions and final mix in `AUDIO_CUES.md`. Verify levels and that speech is audible, not just raw peak numbers. **[corrected]** Measure integrated loudness in LUFS and true peak in dBTP, not mean dBFS.
- Do not extract or re-use reference audio tracks or imitate a specific creator’s narrator voice.

## QA gates
1. README, dependency scripts, selected mode, source/factual notes, and license check.
2. Original character turnaround images; inspect outline consistency, line weight, face, limbs and camera billboarding.
3. 3 scene stills; inspect 3D perspective, grounded character shadows, hero props, environment and lighting quality.
4. 6–12 sec low-resolution animation; verify camera and pose interpolation between frames, sound/captions aligned.
5. Full MP4 after successful preview only; metadata check dimensions, FPS, duration, audio codec; no raw references in build output.

## Claude Code accessibility rule
The uploaded five MP4 files **are in this ChatGPT conversation and the user's local/private package; they are NOT automatically mounted into Claude Code.** If the project repository contains only `.md` reports, Claude Code must say it is using provided observations, not direct analysis of source videos. Users can provide additional data via private allowed storage, but should never upload copyrighted references into a public fork.


## Narration and narrative structure (added from five supplied text examples)
The user's five voiceover examples have been analyzed at an **abstract craft level** in `references/SCRIPT_NARRATIVE_ANALYSIS.md`. For new Shorts, favor an immediate visual contradiction, relatable human reaction, progressive cause-and-effect, a clearly animated and fact-checked mechanism, and a complete, novel payoff. Ensure scene cut timing follows intelligible narration rather than cloning another video's cut sequence. Textual `[music]` markers are editorial placeholders, not instructions to reuse original music. Detailed claims in the supplied scripts are not verified; always research before production.
