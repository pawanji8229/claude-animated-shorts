# Android-only Claude Cinematic Shorts — Updated With Five Script Studies

## What changed
- **NEW:** Five user-supplied narration examples (storm-oil ship, Japanese workplace isolation, hypnagogia, Pachinko, railroad heat expansion) have been analyzed for storytelling structure in `references/SCRIPT_NARRATIVE_ANALYSIS.md`. They are **not reproduced verbatim** in this public-repo-safe kit.
- The fifth supplied *script* is about rail joints, whereas the fifth supplied *MP4* is a Western revolver story. Do not mix them up. Script examples 1 and 5 stop mid-sentence.
- Prompt pack expanded to **24 prompts (00–23)**; prompts 20–23 cover script study, original beat design, narration, and originality/fact-check QA.
- Five user-provided vertical MP4 files are **now received** and verified as 720x1280 / 30 fps with AAC audio.
- Their **actual frame samples were visually examined**, and clip metadata / mixed-track digital volume levels were measured. See `references/OBSERVED_VIDEO_STYLE.md` and `references/VIDEO_MANIFEST.md`.
- Key correction: characters in these sources mostly **look 2D/flat and bold-outlined, composited against richly layered 2.5D/3D-looking environments**. A fully 3D realistic human rig is NOT the best default.
- Visible captions in these samples are predominantly white with dark outline/shadow, not universally golden-yellow.
- The Gemini report remains included as **secondary unverified analysis**. Exact original software, rigs, shaders, sound effects, spoken voice and cut intervals cannot be confirmed from screenshots/metadata alone.

## Which download is which?
1. **GitHub-safe text kit** (small ZIP): Updated `SKILL.md` (independent consolidated skill), `SKILL_ADDENDUM.md` (recommended addition preserving original repo's skill), `ALL_CLAUDE_PROMPTS.md` (now 24 prompts indexed 00–23), `references/MASTER_STYLE_BIBLE.md`, `references/OBSERVED_VIDEO_STYLE.md`, `references/VIDEO_MANIFEST.md`, `references/GEMINI_REFERENCE_ANALYSIS.md`, NEW `references/SCRIPT_NARRATIVE_ANALYSIS.md`, and merge script. Contains NO actual video files or captured source frames.
2. **Private reference archive** (larger ZIP): same kit PLUS the five user-provided MP4 files under `private_reference_videos/video_1.mp4` through `video_5.mp4`, plus sampled private contact sheets. Intended for personal/private reference use only. DO NOT upload it to a public GitHub repository.

## Start with Claude Code using Android
1. Open your own fork of the original project: https://github.com/mromidev/claude-animated-shorts . If you have an existing fork, preserve the upstream skill, templates and configuration.
2. Download/extract the small **GitHub-safe ZIP** on Android. Upload the updated markdown files into your fork. Recommended: use `SKILL_ADDENDUM.md` and ask Claude Code to merge it into existing SKILL.md WITHOUT replacing/deleting upstream rules.
3. Connect your fork to Claude Code at https://claude.ai/code and run prompt **00** in `ALL_CLAUDE_PROMPTS.md`. The text reports (including script analysis) are accessible if committed.
4. Run prompt **17** (style audit), **20** (script study), **21–23** (original script), then **18** (original character system), followed by prompts **06–14** for a test video. Never skip the 3 preview stills and 8–12 s proof render.
5. Your chosen final 30–45 second topic can use prompt **19** as an overview but should not bypass approval gates.

## If you want Claude Code to inspect all five MP4 files itself
The source uploads in ChatGPT DO NOT automatically appear in Claude Code. A public GitHub fork is not the place to host these clips. Create or use a separately permissioned private working repository/storage compatible with your Claude Code setup, and make sure its access is explicitly granted before asking Claude to read the files. Private GitHub Actions runs may be subject to usage limits. If you don't have access, using the text analysis plus private screenshots in Claude chat is a practical alternative.

## File format and video production reality
`SKILL.md` is Markdown instructions; it cannot physically contain MP4 binary video. Even with your paid Claude plan, video rendering relies on compatible executable code and cloud compute. A Remotion/Three.js GitHub Actions render is *not yet built or tested in this kit*. The current deliverable is a detailed analyzed skill+prompt+reference pack, not a working output video.

> **Update (integration into this repo):** a working Remotion + Three.js + React Three Fiber project now lives in `studio/`, with a GitHub Actions workflow in `.github/workflows/render-video.yml`. See `studio/README.md` and `docs/ANDROID_RENDER_GUIDE.md`.
