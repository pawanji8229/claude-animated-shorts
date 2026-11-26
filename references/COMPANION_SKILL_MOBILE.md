> **Reference copy** of the consolidated "mobile" skill shipped in `claude_cinematic_shorts_GITHUB_SAFE_with_5_script_studies.zip`.
> It is NOT the active skill: the active skill is the original upstream `SKILL.md` (preserved) plus the appended
> "Mobile cinematic reference override" section. Corrections from `references/REFERENCE_CORRECTIONS.md` are applied
> inline and marked **[corrected]**. Original frontmatter: `name: cinematic-animated-shorts-mobile`, `version: 2.1-script-study`.


# Cinematic Animated Shorts — Android + Claude Code

> **Adapted companion skill** based on the public `mromidev/claude-animated-shorts` design and the user's Gemini notes. This is a new consolidated, self-contained working skill, not an exact copy of the upstream SKILL.md. If using the upstream repository, prefer APPENDING `SKILL_ADDENDUM.md` to its existing `SKILL.md` using the included merge script so the original instructions, code references, and look values are preserved.
>
> **Reference status**: 5 uploaded MP4s were directly sampled visually and their technical video/audio metadata inspected. Five user-provided narration transcripts have also been studied for writing structure; one of those is unrelated to the fifth MP4. Verified findings are in `references/OBSERVED_VIDEO_STYLE.md`; Gemini claims of exact sound effects and animation techniques remain provisional. MP4s are kept private, not embedded in `SKILL.md`.

## 0. Nonnegotiable constraints
- User works on **Android phone only**; Claude Code cloud and GitHub Actions are the intended computing environment. No local PC, paid video API or proprietary animation software is presumed.
- **Original content only**: references guide generic aesthetics, not verbatim scripts, characters, specific shots, exact music, logos or audio.
- Never publish reference MP4s or their extracted frames in a public repository. Use private storage where necessary and maintain a manifest of authorized/owned material.
- Do not assume Gemini's narrative about tools used by the original creator is correct. Report confidence and visually observed evidence. Refer to `references/GEMINI_REFERENCE_ANALYSIS.md`.
- Check real repository structure before proposing file names/commands. The upstream repository is a **skill + templates**, not necessarily a complete executable project or cloud workflow.
- Do not say a render, commit, deployment, pull request, or audio analysis succeeded unless it was actually performed and verified.
- Prefer **small preview then production**: stills → 6–12 second animation → 30–60 second Short.
- Do not reproduce risky mechanical details or harmful acts from reference narratives merely because they appear in the references.

## 1. Style direction and evidence
**Overall look (confirmed in source frame samples)**: predominantly **outlined, planar-looking round faces and simplified narrow-bodied characters in perspective-rich, detail-heavy 2.5D/3D-looking sets**, with bold black linework, expressive minimal facial marks, setting-specific cinematic lighting, white/dark-outlined captions in the reference cuts, and clear foreground/background depth. Realistic lighting does **not** mean actual human photorealism.

**Important visual mode distinction**:
1. **HYBRID_2_5D (recommended and directly supported by inspected reference appearance)**: upstream `templates/bridge/` uses illustrated, camera-facing character cards in a 3D world. Keep the planar faces / thin limbs from samples but create original silhouettes and sets. Verify with preview stills.
2. **TRUE_3D (higher complexity)**: actual volumetric 3D characters with geometric heads, torsos, rigs/pose controls and materials. Use only when still-frame and motion validation support the desired aesthetics.

Never confuse these modes. Generate comparison stills before choosing. Do not state that the reference creators used a specific renderer, rig or software unless sourced.

### Five analyzed visual profiles
- **Workshop/Inventor** — sepia/charcoal set, warm tungsten key, blue character accent, minimal warm material specular highlights, intimate push-ins, small tactile metal sound events.
- **Neon street/Arcade** — cool blue ambience with cyan-magenta emissives, layered arcade props, tracking street camera and machine tones.
- **Sailing ship/Storm** — moonlit blue with amber lanterns, wooden ship detail, water motion, atmospheric particles and storm ambience.
- **Corporate office** — mint-gray cubicles, white overhead panels, stiff posing, slow corridor cameras and strategically quiet soundscape.
- **Western-town** — sand, rust, sunlit wood, blue sky, theatrical low angles, readable accessory silhouettes and environmental atmosphere.

Direct visual observations and verified file/audio metadata are in `references/OBSERVED_VIDEO_STYLE.md` and `references/VIDEO_MANIFEST.md`. Reusable instructions are in `references/MASTER_STYLE_BIBLE.md`. The earlier Gemini report remains *secondary*, and its guessed HEX colors/rigging/SFX cannot be treated as confirmed.

## 2. Production brief and default settings
- Platform: original YouTube Short, **9:16**, English unless user chooses otherwise.
- Final: 1080 x 1920 at 30fps, MP4 (H.264 + AAC), consistent safe margins; optional 1440 x 2560 upscale only if the render can support it.
- Preview: still frames at 540 x 960; initial animated QA at 6–12 seconds.
- Captions: inspected samples visibly show white captions with dark stroke/shadow; default `CAPTIONS=true` for the style-adapted project, but leave `CAPTIONS=false` for the original upstream no-caption mode or user preference.
- Voice: conversational, energetic but controlled; original voice recording or licensed TTS. Record clean audio, align with text. Do not assume Claude's paid plan supplies free TTS.
- Mix: voice clearly dominant; original/licensed music under voice, sound effects matched to events, no clipping. Avoid unverified fixed gain values.
- Renderer: match Remotion/Three dependency versions. **[corrected]** For GPU-less Ubuntu, `--gl=swangle` (ANGLE on SwiftShader) is now **verified** for this repo's `studio/` project with Remotion 4.0.541 + three 0.180 (stills, 540x960 MP4 and a 1080x1920 still rendered headless). It is set in `studio/remotion.config.ts`.
- Timelines: expressions and positions must depend on `useCurrentFrame`, `interpolate`, or deterministic derived frame values; avoid wall-clock, nondeterministic physics and random motion.

## 3. Mandatory video workflow (stop gates)
1. **Reference intake**: five MP4s were received, frame-sampled and technically checked; see `references/VIDEO_MANIFEST.md` and `references/OBSERVED_VIDEO_STYLE.md`. Source MP4s and contact sheets are private, NOT in the public-ready kit and NOT automatically accessible in Claude Code. Transcription or critical listening of SFX has not been performed; any future direct-source analysis must explicitly confirm access.
2. **Reference synthesis**: begin with the now-existing `references/MASTER_STYLE_BIBLE.md` and `references/OBSERVED_VIDEO_STYLE.md`; produce project-specific `CHARACTER_DESIGN.md`, `LIGHTING_PRESETS.md`, `CAMERA_MOTION.md` and `SOUND_DESIGN.md`. Use the Gemini report only as a secondary hypothesis. Normalize conflicts across references.
3. **Original topic & factual research**: select a visualizable original topic; create sources/fact-check notes; no unverifiable historical claims.
4. **Script**: compelling opening within 2–3 seconds, clear stakes, sequential visual cause/effect, concise narration and satisfying closing; align length to natural speech.
5. **Shot plan**: timeline table with shot ID, start/end seconds, narration phrases, character pose, scene elements, camera position/look/fov, light preset, action and audio cues. Avoid copying source shots.
6. **Assets/characters**: original reusable cast, distinct models, original/CC0 textures, consistent proportions; verify rights and avoid broken external asset URLs.
7. **Three.js / Remotion implementation**: complete functioning project; use upstream `templates/bridge` as an optional code base, not a fictitious executable npm package. **[corrected]** A working project now exists in `studio/` (see `studio/README.md`).
8. **Preview stills**: 3 diverse shots (character CU, full-body world, dramatic lighting). Compare only broad measured features and readability; fix clipping, deformed limbs, flat lighting, wrong palettes and missing shadows.
9. **Motion test**: 6–12 seconds, 540x960, 30 fps, deterministic frames, no camera clipping, credible action and continuity.
10. **Voice, SFX, score**: voice.wav/voice.mp3 and timecodes, cue sheet, original/licensed SFX and score; duck music under speech, avoid clipping, check rights.
11. **Final cloud render**: use a verified GitHub Actions workflow at `.github/workflows/render-video.yml`; manual `workflow_dispatch`, correct dependency install, efficient caching, pinned major actions, upload artifact v4. Test a short clip before final. Do not embed private references in artifacts.
12. **QA and delivery**: export, decode/verify duration/FPS/resolution/audio, inspect key frames and transitions, scan for blank/frozen frames, visual glitches, no copyrighted assets, produce final MP4 and optional title/description/thumbnail directions.

## 4. Quality priorities
1. Consistent original **2.5D planar-faced, heavy-outlined character silhouettes** > raw polygon count or human realism.
2. Light that produces depth and contact shadows > excessive post-processing.
3. Detailed **hero prop**, coherent set design and intentional foreground > lots of random props.
4. Motivated smooth camera movement > constant zooming.
5. Audio synchronized with meaningful action > overwhelming music and SFX.
6. Avoid unintended AI-looking artifacts: changing faces, hand anatomy glitches, shadows that jump, objects teleporting, letters morphing, inconsistent scale and repeated stock movements.

## 5. Technical guidance
- Candidate material ranges: skin roughness 0.45–0.65; metallic hero props metalness 0.85–1.0, roughness 0.15–0.30. These are starting parameters only.
- Camera defaults: 35mm-equivalent perspective for medium shots, wider establishing shots and tighter inserts; physically approximate rather than forcing real lens conversion.
- Key-fill-rim lighting with scene-specific warm/cool presets, ambient occlusion where practical, balanced shadow bias; test softness on small preview renders.
- Avoid using `ACESFilmicToneMapping` on top of a pre-existing NEUTRAL-tone and grade system without A/B comparison.
- Optional toon outlines must not accidentally outline 2D card layers twice.
- Correct syntax: `const springConfig = { damping: 12, stiffness: 120, mass: 0.8 };`.
- Scenes should be lightweight enough for CPU-based cloud runners; split videos into segments or simplify expensive effects if necessary.

## 6. Required outputs per new video
`SOURCE_NOTES.md`, `SCRIPT.md`, `STORYBOARD.md`, `CHARACTERS.md`, `SHOT_LIST.csv`, `AUDIO_CUES.md`, preview PNGs, compiled render project, `QA_REPORT.md`, final MP4, and upload metadata.

## 7. Inspected references, evidence precedence, and accessibility
1. `references/MASTER_STYLE_BIBLE.md` — verified production rules; follow first.
2. `references/OBSERVED_VIDEO_STYLE.md` — direct sampled-frame observations, audio level metadata, and honest unknowns.
3. `references/VIDEO_MANIFEST.md` — actual five received MP4 filenames, duration, dimensions, hashes and private location.
4. `references/SCRIPT_NARRATIVE_ANALYSIS.md` — five user-provided narration examples analyzed for hook, tension, pacing, explanation and payoff; **does not contain or license verbatim reference scripts**. Note railroad narration is NOT the Western MP4.
5. `references/GEMINI_REFERENCE_ANALYSIS.md` — prior Gemini hypothesis; superseded where contradictory.
6. `ALL_CLAUDE_PROMPTS.md` — complete production prompt pack.

The source MP4s are not inside text files, and cannot be played by Claude Code unless uploaded to its own authorized, private filesystem. If only the Markdown files are present, state that only the textual reference observations are accessible.

## 8. Prompt index
Complete copy/paste prompts for preparation, references, story ideation, factual research, scripting, shot planning, modeling, building, previewing, sound, rendering, fixing errors, QA and publishing are in `ALL_CLAUDE_PROMPTS.md`. For reference-derived storytelling analysis and originality checks use prompts **20–23**.

## 9. Narration structure informed by five examples
Read `references/SCRIPT_NARRATIVE_ANALYSIS.md` before drafting scripts. Derive only broad writing methods: immediate visually legible mystery, a human objection, escalating causal beats, one fact-checked explanatory mechanism, and a complete payoff. Use original sentences, scenes and topics, not substitutions into the supplied dialogue. The fifth narration is about rail expansion, while the fifth MP4 is a Western tale; do not conflate them. Two supplied texts break off before their intended endings. All unusual factual premises must be independently checked before publication. Music markers in user-supplied text are not timestamps for a usable audio track.
