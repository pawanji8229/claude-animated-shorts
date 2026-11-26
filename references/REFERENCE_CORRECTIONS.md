# Corrections to the reference kit (integration log)

Source: `claude_cinematic_shorts_GITHUB_SAFE_with_5_script_studies.zip` (text only, no video). Each fix is also marked
**[corrected]** inline in the affected file. "Verified" below means tested in this repository's `studio/` project.

| # | File(s) | Original claim / problem | Correction | Basis |
|---|---|---|---|---|
| 1 | GEMINI report, OBSERVED, addendum | `springConfig { damping.12, ... }` (invalid JS) | `const springConfig = { damping: 12, stiffness: 120, mass: 0.8 };` used as `spring({ frame, fps, config: springConfig })` | JS syntax / Remotion API |
| 2 | Companion skill §2, addendum, prompt 12 | `--gl=swangle` "may work" on GPU-less Ubuntu | **Verified**: renders this repo's Three.js scene headless (stills, 540x960 MP4, 1080x1920 still) with Remotion 4.0.541, three 0.180. Set in `studio/remotion.config.ts` and the workflow | Local headless test (no GPU) |
| 3 | Companion skill §3.7, kit README | "Render workflow not yet built"; upstream has no npm project | `studio/` project + `.github/workflows/render-video.yml` now exist | This PR |
| 4 | GEMINI report table | Captions OFF by default; yellow kinetic captions | Observed format is white text with dark outline. `captions` prop defaults to `true` for studio jobs; the upstream bridge pipeline keeps "no captions" | OBSERVED + MASTER docs |
| 5 | GEMINI report table | Outlines via inverted hull, no caveat | drei `<Outlines screenspace>` throws large black shards when geometry is behind/near the lens (the offset is multiplied by clip.w with no guard). Use `studio/src/lib/Ink.tsx` (guarded, smoothed hull normals) | Seen in the first test stills, fixed and re-rendered |
| 6 | GEMINI report table | "ACES or NEUTRAL" | three.js has had `NeutralToneMapping` since r162. The studio uses it, which matches the upstream NEUTRAL grade | three.js source |
| 7 | MASTER bible | Final 1080x1920 | Conflicts with upstream bridge rule (2K 1440x2560). Studio default = 1080x1920; 2K only on request | Upstream SKILL.md |
| 8 | OBSERVED, MASTER | Levels given as mean/peak dBFS | Mean dBFS is not loudness. Master to LUFS (EBU R128/BS.1770, about -14 LUFS integrated per upstream bible) and check true peak in dBTP | Audio standards |
| 9 | SCRIPT analysis (storm oil) | Implies storm oil is a dramatization | The practice is historically documented (Franklin 1774, later seamanship guidance). It damps short waves and whitecaps but does not flatten swell. Cite sources | History of science |
| 10 | SCRIPT analysis (rail) | "engineered stress management" (vague) | CWR is laid/destressed at a chosen stress-free (neutral) temperature and restrained by ties, anchors and ballast | Rail engineering practice |
| 11 | GEMINI report | Mentions "seven" videos | Five videos only | Manifest |
| 12 | Prompt 17 | "what the original MP4s are inaccessible to you" | "that the original MP4s are inaccessible to you" | Grammar |
| 13 | (new) | Remotion version check | Remotion 4.0.541 requires `zod` **exactly 4.6.7**. With 3.22.3 it prints a version-mismatch warning | Remotion CLI output |

## Not changed, flagged for the owner
- The upstream repo already contains `references/frames/` and `references/sheets/` (frames from a third-party channel). The upstream `SKILL.md` itself calls them private study material. They came from upstream and this integration did not add them. Decide whether your public fork should keep them.
- `references/VIDEO_MANIFEST.md` lists the original download filenames and SHA-256 hashes of the five private MP4s (text only, no media). No MP4 or extracted frame from them is in this repository.
- Head/body ratio ("1.5:1"), lens equivalents, HEX values and SFX timings in the Gemini report remain **unverified hypotheses**.
