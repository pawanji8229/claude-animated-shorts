# ALL CLAUDE PROMPTS — CINEMATIC MOBILE SHORTS

Use these in order, but skip stages already completed. Replace bracketed placeholders. Run prompts inside **Claude Code connected to your fork** unless the prompt is simple ideation. Record results and only continue when the prior step is verified. Five MP4 reference videos **were uploaded to ChatGPT and inspected visually**. However, they are NOT automatically accessible within Claude Code; the Markdown style report and manifest are GitHub-safe substitutes for the public-repo workflow.

## 00 — Start Claude Code on the fork

```text
You are my mobile-only cinematic 3D Shorts production engineer. I have Android only, a paid Claude subscription, and a fork of the `mromidev/claude-animated-shorts` repository. Inspect every file in the repo before changing code. Read SKILL.md, references/MASTER_STYLE_BIBLE.md, references/SCRIPT_NARRATIVE_ANALYSIS.md, references/OBSERVED_VIDEO_STYLE.md, references/GEMINI_REFERENCE_ANALYSIS.md, references/VIDEO_MANIFEST.md and ALL_CLAUDE_PROMPTS.md. Identify what currently runs, what is missing, whether the upstream template uses 2D character cards, and what is required for a true 3D option. Provide a file-by-file build plan and choose a minimal runnable quality test. Preserve all existing upstream files. The five source MP4s are private, and were uploaded to ChatGPT, not automatically to Claude Code. Never claim direct MP4 access unless separately granted; use the verified text observations otherwise.
```

## 01 — Reference verification: reports first; MP4s only if actually accessible

```text
First read references/OBSERVED_VIDEO_STYLE.md, references/VIDEO_MANIFEST.md and references/MASTER_STYLE_BIBLE.md. Five user MP4s were inspected in ChatGPT, but MAY NOT exist in this Claude Code environment. If the MP4 files are actually accessible through a connected private repository, analyze them directly; otherwise report that only the text findings are available. For each accessible MP4: determine actual duration, FPS, frames and audio metadata; sample frames at consistent timestamps and scene cuts; produce a contact sheet; write shot-by-shot timestamps; study silhouette/proportions, geometry, materials, palettes, lighting, camera paths, motion, voice texture, music density and sound effects. Separate direct observations, inferences and unknowns. Critically compare the results to references/GEMINI_REFERENCE_ANALYSIS.md and correct errors. Use broad artistic principles to make original work; do not copy original scripts, music, characters, shots or exact assets. Keep raw reference MP4s outside the public GitHub repository.
```

## 02 — Complete a verified style bible

```text
Refine the existing references/MASTER_STYLE_BIBLE.md using the direct sampled-frame observations in references/OBSERVED_VIDEO_STYLE.md, the verified metadata and the Gemini secondary analysis. Build a consistent style vocabulary for original animation: character anatomy and face sheet, silhouettes, materials and shader examples, lighting setups, color palettes by setting, cinematography, 3D environment density, sound design, editing rhythm, narration and title-card policy. Provide a confidence rating for each proposed parameter. Reference footage visibly includes mostly white captions with dark outlines; set captions ON for reference-style format with an OFF switch for upstream no-caption mode. Use HYBRID_2_5D illustrated characters in perspective-rich environments as primary; compare with fully modeled toon 3D only as an optional alternative. Include practical Three.js and Remotion implementation instructions, not just adjectives.
```

## 03 — Generate 20 original Shorts ideas

```text
Using the verified style bible and `references/SCRIPT_NARRATIVE_ANALYSIS.md` for broad storytelling techniques only, generate 20 ORIGINAL, factual and visually engaging 30–60 second YouTube Shorts ideas appropriate for general audiences. Each should have: clickable title, one-sentence hook, documented historical/scientific claim (if a factual claim), visual set pieces, primary 3D environment, recommended light preset, complexity level (easy/medium/hard) and audience payoff. Avoid retelling or reproducing any of the five reference stories. Rank the top 5 by clarity of animation and production feasibility on a GPU-less cloud renderer. Do not fabricate citations.
```

## 04 — Fact-check selected topic

```text
Chosen title: [INSERT TITLE]. Research the historical/scientific topic using trustworthy accessible sources. Output SOURCES.md with source URLs, publication details, claims supported, uncertainty and corrections. Identify the visualizable cause-and-effect sequence, and flag anecdotes or numbers that cannot be verified. Do not invent quotes or facts. End with a short script brief using only substantiated claims.
```

## 05 — Write the original narration script

```text
Read references/SCRIPT_NARRATIVE_ANALYSIS.md, then write an ORIGINAL [45]-second English narrated YouTube Short from SOURCES.md and the chosen story brief. Target a conversational [140–165] words per minute (adjust length to actual voice speed). Structure: 0–3s attention hook, 3–12s premise, 12–30s escalation and visually legible mechanism, 30–42s surprising resolution, final few seconds memorable closing. Include estimated duration, word count, and [BEAT] cues for visual/audio events. Use no copyrighted lines, repeated dialogue, parallel plot sequences or direct adaptations from my references. Produce SCRIPT_BRIEF.md, SCRIPT_BEATS.csv and SCRIPT.md; include citations in research notes (not spoken audio). Validate all claims and finish the story rather than following incomplete source narrations.
```

## 06 — Scene-by-scene visual blueprint

```text
Turn the approved SCRIPT.md into STORYBOARD.md and SHOT_LIST.csv. Use one row per shot with: ID, in/out time, exact narration phrase, visible characters, pose and blocking, background/set dressing, hero prop, key/fill/rim lighting, palette, camera rig (pos/look/fov), movement easing, focus/DOF, transition type and sound cue. Add two preview-frame timestamps per important scene. Maintain continuity of objects, costume, sky direction, floor contact and geography across cuts. Use scene durations of ~2–5 seconds where appropriate, varying by meaning. Keep the visuals original.
```

## 07 — Design an original reusable character system

```text
Build a reusable and original character system following references/MASTER_STYLE_BIBLE.md. Default to HYBRID_2_5D outlined flat-style character faces/figures in a dimensional environment, because this appearance was directly observed in all five MP4 samples. Only test TRUE_3D character meshes if justified by side-by-side preview quality. Create a stable original face design, layered hair, torso/limb system, walk, idle, turn, point, think, surprise and blink states, carefully controlling billboard rotation and contact shadows. Avoid generic bean meshes with no personality; include distinct accessories and material choices. Produce character front/side/three-quarter preview stills, shadow/contact tests and a five-second pose cycle. Fix any shape drift or limb clipping.
```

## 08 — Build detailed 3D environments

```text
For each approved storyboard scene, build original, visually rich but resource-conscious Three.js environments. Use believable proportions, hero-prop detail, set dressing clustered at focal areas, readable foreground/midground/background, bevels, wood/metals that respond to light and an appropriate genre palette. Prefer procedurally generated or clearly licensed assets. Verify object collisions, camera sightlines, contact shadows, fog and draw cost. Produce three scene preview stills before animating.
```

## 09 — Cinematic camera, lighting and motion

```text
Implement smooth frame-deterministic camera controllers and animation in Remotion. Use useCurrentFrame for all motion. Support push-in, tracking, dolly, crane, intentional hard cuts, selective DOF and motivated subtle shake. Use lighting presets from the style bible, preserve subject eye-light and shadows, and avoid overexposure or muddy silhouettes. For every shot provide a preview still at start, middle and end to verify framing. Do not rely on Date.now(), nondeterministic random motion or browser interactions.
```

## 10 — Create first low-resolution animation test

```text
Build the first 8–12 second preview animation using approved scenes. Use 540x960, 30fps, silent or temporary original audio. Confirm it is a runnable Remotion composition, not a static mockup. Run typecheck/build, render preview MP4 with a supported CPU GL backend, and export first/middle/last stills. If rendering fails, show precise error logs, diagnose dependencies, fix issues, rerun, and distinguish tested results from suggestions. Do not proceed to the full video until I review this preview.
```

## 11 — Narration, sound effects and music

```text
Using approved SCRIPT.md and SHOT_LIST.csv, produce AUDIO_CUES.md with exact timecodes, narration phrases, ambience beds, foreground sound events, transition cues and musical emotional arc. Generate original sound effects and music where code synthesis is practical; otherwise specify properly licensed assets and their source/license. Do not imitate or extract the audio tracks or narrator voice of the reference videos. Produce aligned voice timing (`words.json`), voice.wav/mix.wav if feasible, and clearly mark missing TTS or assets. Mix so the voice stays legible, soften music under speech, avoid digital clipping, and verify sync at key frames.
```

## 12 — Make a GitHub Actions render workflow

```text
Make my fork runnable entirely from Android using GitHub Actions. Check actual package scripts, lockfile and Remotion version; do NOT assume the original repo is a complete npm app. Create .github/workflows/render-video.yml using workflow_dispatch and inputs for composition, quality (preview/final), and optionally frame range. Use supported Node version, `npm ci` where lockfile exists, ffmpeg/Chromium setup if required, `--gl=swangle` for Remotion 4 on GPU-less Ubuntu (verified for `studio/`; already in `.github/workflows/render-video.yml`), cache dependencies and use actions/upload-artifact@v4. Keep final MP4 in the artifact, exclude reference videos. Run a short preview job and report outcomes before merging. Open a pull request into MY fork, not upstream. Explain Android UI clicks to launch and retrieve artifact.
```

## 13 — Final video render and export

```text
The script, previews and audio are approved. Render all shots at 1080x1920, 30fps in H.264 MP4 with AAC audio, matching timing exactly. Split heavy renders into segments if cloud memory/time is insufficient, and join without visible timing gaps. Verify that final output exists, probes as a valid file, has right dimensions/duration/FPS/audio and no broken links or missing textures. Upload as a GitHub Actions artifact for Android download. Do not claim delivery if an actual MP4 was not rendered.
```

## 14 — Quality assurance and fixes

```text
Audit final video systematically: every cut, camera framing, character consistency, hands and props, missing geometry, texture stretching, shadow changes, color continuity, overly dark scenes, audio sync, sudden loudness, blank or frozen frames, caption safe margins if captions enabled, and actual historical/scientific accuracy. Produce QA_REPORT.md ranked by severity with exact frame/time, suspected source file, proposed patch, and render-test steps. Repair confirmed faults, rerender only changed segments when supported, and verify again.
```

## 15 — YouTube publishing package

```text
Create original YouTube Shorts metadata from the actual finished original video: five short accurate titles, two descriptions, a relevant keyword set, an optional non-clickbait on-screen title and a pinned-comment question. Avoid making unsupported claims. Suggest a thumbnail frame using existing original video frames. Do not reproduce reference creators' titles, names or branded visuals. Keep final upload under my control.
```

## 16 — Resume after Claude usage limit / long session

```text
Read all project files, especially SKILL.md, references/MASTER_STYLE_BIBLE.md, SCRIPT.md, SHOT_LIST.csv, QA_REPORT.md and CHANGELOG.md. Summarize what is actually complete (with file paths/commits), what tests passed, what is missing, and the single next best action. Continue from the latest verified state, do not rewrite files unnecessarily, and do not fabricate previous renders. Work in my fork and open PRs rather than changing upstream.
```


## 17 — Audit the source-derived visual style before starting

```text
Inspect references/OBSERVED_VIDEO_STYLE.md, references/MASTER_STYLE_BIBLE.md, and references/VIDEO_MANIFEST.md. Explain what visual properties were observed directly from sampled video frames, what audio measurements were computed, what claims came from Gemini without independent proof, and that the original MP4s are inaccessible to you. Summarize the 2.5D design system with ORIGINAL flat-outlined expressive faces and thin limbs inside detailed perspective-rich dimensional sets. Produce a prioritized gap list before building assets. Never claim to have watched source videos from this Claude Code session unless you have actual access.
```

## 18 — Make an original reusable 2.5D character library

```text
Using the verified master style bible, create 3 DISTINCT original illustrated/planar character models for a real-time Three.js environment. Define master shape/face rules, layers, hair, torso, limbs, eye/brow/mouth states, wardrobe, poses, direction-turn strategy, shadow casting, and a stable depth-aware billboarding solution. The designs must not reproduce characters from the references. Render front, 3/4, profile, full-body with ground contact, and the same character in warm and cool environments. Fix outline thickness, eye consistency, floating feet and clipping, then render a 5-second deterministic animation. Compare HYBRID_2_5D against TRUE_3D_TOON on visual fidelity and compute budget, without claiming the originals were built using any particular method.
```

## 19 — Story-to-video master command

```text
Produce ONE new and fully original 30–45 second 9:16 educational Short from this topic: [TOPIC]. Follow SKILL.md and references/MASTER_STYLE_BIBLE.md. Work in phases: 1) verify story facts and links, 2) create narration script and pacing, 3) create original storyboard/shot table, 4) choose original stable 2.5D character designs, 5) produce detailed perspective-rich world assets, 6) create camera/lighting plan, 7) create timecoded narration/SFX/caption cue sheet, 8) render 3 preview stills and 8–12 second low-res motion test, 9) wait for explicit preview approval before the full render, 10) export final MP4 via the verified GitHub Actions workflow and perform visual/audio QA. Do not use source video footage/audio/characters or recycle their exact scenes. If rendering tools or source files are inaccessible, explain that precisely.
```


## 20 — Study the five script examples without copying

```text
Read references/SCRIPT_NARRATIVE_ANALYSIS.md and the relevant style files. Treat the five supplied narrations as storytelling reference examples, not reliable source evidence or templates to copy. Summarize their shared techniques: immediate hook, human reaction, escalating surprise, a distinct shift to a fact-checked mechanism, emotional cadence, sound punctuation and satisfying original ending. Identify the fifth-script/fifth-MP4 mismatch and two incomplete source transcripts. Draft NARRATIVE_RULES.md with a practical quality checklist. Avoid verbatim reference lines, identical scene order and narrator imitation.
```

## 21 — Produce an original story beat sheet

```text
TOPIC: [INSERT NEW TOPIC]
TARGET: [30, 45 OR 60] seconds
AUDIENCE: General YouTube Shorts audience

Read NARRATIVE_RULES.md and references/SCRIPT_NARRATIVE_ANALYSIS.md. First verify the story premise using credible sources and save SOURCE_NOTES.md. Then design a new and distinctly original narrative: intriguing visual hook, human perspective or tension, 2–4 original escalating revelations, one accurate mechanism/explanation, and a clear closing payoff. Do not reuse the five reference stories, famous lines or specific shot sequences. Output SCRIPT_BRIEF.md and SCRIPT_BEATS.csv with timing estimates, visual proof ideas, and audio cue intentions. Flag any unsupported claim rather than adding dramatic misinformation.
```

## 22 — Write and refine the original narration

```text
Using SOURCE_NOTES.md, SCRIPT_BRIEF.md and SCRIPT_BEATS.csv, write THREE genuinely different original hooks and choose the strongest that remains factually accurate. Write the full voiceover at a natural conversational speed for [45] seconds, then read it aloud virtually using estimated word count and pauses. Keep sentences clear, cinematic and vivid without overusing stock phrases. Write fresh dialogue only when it is fictionalized/clearly dramatized or historically sourced. Mark [PAUSE], [SFX: proposed original sound], [MUSIC: original/licensed mood] rather than copying audio from any reference. Provide word count, estimated reading time and a complete ending. Save to SCRIPT.md, with citations in SOURCE_NOTES.md rather than the spoken script.
```

## 23 — Script originality, accuracy, and synchronization audit

```text
Review SCRIPT.md against SOURCE_NOTES.md and references/SCRIPT_NARRATIVE_ANALYSIS.md. Check every factual claim and exaggerated number, narrator flow, exact story duration, hook clarity, escalating beats, mechanism explanation and complete payoff. Verify the new narration does not recreate the source scripts' dialogue, plot order or signature moments. Make a timestamped beat table that maps each line to a proposed original shot and audio cue. Rewrite weak lines and save SCRIPT_ORIGINALITY_AND_FACT_CHECK.md. Only proceed to storyboarding after the script passes these checks.
```
