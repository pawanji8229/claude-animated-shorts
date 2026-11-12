# TwistFrame Lab — original production system (restored)

Branch `twistframe-original-restored` is the original TwistFrame Lab system **exactly as it was before the V3
experiments**. It was created from `twistframe-london-bridge-v2` (commit `3cd472e`), and only this note was added.

## What is active

- **The original MAKE VIDEO skill:** `.claude/skills/voice-to-video/SKILL.md`, plus the root `SKILL.md`. Both are unchanged.
- **The original rendering:** Remotion 4.0.541 + three.js + R3F, with the original post pipeline, camera rigs and RenderAfterMount (the approved render behaviour).
- **The original characters:** earless odo5 cards, face glow, expressions and gestures (`src/char/odo5.ts`), plus crowd life (`src/char/crowdLife.ts`).
- **The original audio:** event-driven sound design and the narration-first mixer (`audio/`, `pipeline/`).
- **The original sets and productions:** desert world, London Bridge, the Reopening benchmark, the workshop hall and more.

## What is NOT here

The V3 experiments are absent: the CC0 asset library, the showcase scenes, `render_fast`, the quality profiles, the single-render flag, the matrix workflow and the V3 skill text. They remain archived, untouched, on the separate branch `experimental/pipeline-v3`, which this branch does not use.

## Verification (2026-11-10)

| check | result |
|---|---|
| fresh clone, `npm ci` | OK (312 packages) |
| `npx tsc --noEmit` | OK |
| approved Reopening `studio/previews/reopening/twistframe_reopening_loop_540x960.mp4` | SHA-256 `198933eb2ef336d5e1b67ab9e306aa85fd55b301d20624bd6f99dbdcdbd66182` (byte-identical) |
| Reopening frames 124 and 230 re-rendered to scratch with this pipeline | match the approved video to within H.264 noise (mean 2.1/255; a fresh encode of the same frame differs by 2.5) |
| `qc.py --loop` on the approved Reopening (read-only) | 18/18 pass: sync 0 ms, worst word +15.5 dB, crowd −34 LU, loop OK |
| crowd independence check | PASS |
| Python audio and QC tools | compile OK |

## How to make a video (original workflow)

1. **Send the voiceover.** Attach the MP3 or WAV and say **"MAKE VIDEO FOR PAWAN"**. The skill does the rest.
2. **What Claude runs, from `studio/`:**

```bash
bash pipeline/setup.sh                                   # first time in a new session
bash pipeline/make_video.sh init   <id> <voice.mp3>      # analysis of the voiceover
#   Claude writes the storyboard and the scene code (original characters, sets, camera, sounds)
bash pipeline/make_video.sh audio  <id> src/productions/<id>/scene.ts   # narration-first mix
bash pipeline/make_video.sh test   <id> <PreviewComposition> 0-59      # short test render + QC
bash pipeline/make_video.sh render <id> <Composition>                  # full render, resumable batches
bash pipeline/make_video.sh qc     <id>                                # full QC + loop test
bash pipeline/make_video.sh backup <id>                                # project ZIP
```

3. **Quality first.** A 59 s Short at 1080×1920 takes several hours to render on this machine, at about 6–10 s per frame. That is expected: quality comes before speed.
4. **The benchmark.** Every new video is compared with the approved Reopening benchmark (`references/benchmarks/reopening_v2_approved/`) before delivery.
