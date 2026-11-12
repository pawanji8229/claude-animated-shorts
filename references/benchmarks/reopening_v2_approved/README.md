# APPROVED BENCHMARK — Reopening v2 (TwistFrame Lab quality reference)

Approved by the user on 2026-11-09: "APPROVED! I am completely satisfied with this version. This is now my official
TwistFrame Lab quality reference."  **Do not modify or re-render this production.** New videos are compared against it.

- Video: `approved_reopening_540x960.mp4` (540×960, 30 fps, 291 frames, 9.70 s) — SHA-256 `198933eb2ef336d5e1b67ab9e306aa85fd55b301d20624bd6f99dbdcdbd66182`
- Source at approval: commit `9fb221e` — scene `studio/src/productions/reopening/scene.ts`, film
  `studio/src/productions/reopening/Film.tsx`, crowd system `studio/src/char/crowdLife.ts`, narration-first mixer
  `studio/audio/mix_events.py`, settings `studio/twistframe.config.json`.
- Measured: final -16.1 LUFS / -1.1 dBTP; stems vs narration {'sfx': -22.1, 'crowd': -34.0, 'ambience': -29.2, 'music': None} LU;
  worst word 15.5 dB clear of all background; crowd check all PASS (max hand correlation 0.35,
  5/10 photographers, 10 shutters ≥ 10 frames apart, 5 flashes ≥ 13 apart, every photographer visible).
- Reference stills `stills/` (frames 0, 50, 124, 190, 230, 258), `contact_sheet.png`, `loop_boundary_test.mp4`,
  `QC_REPORT.md`, `cue_sheet.md`, `mix_report.json`, `crowd_check.txt`, machine-readable `benchmark.json`.

## What this benchmark fixes in place (every future MAKE VIDEO)
- Look: earless odo5 2D characters (brush outlines, expressive faces, subtle face-only glow), detailed motivated 3D
  environment with SSAO/DOF/bloom grade, warm cinematic light, no captions or text, one smooth continuous camera.
- Life: independent crowd personas and staggered photography (crowdLife), sounds derived from visible actions.
- Sound: narration-first mix — rich but controlled effects, quiet distant crowd, smooth ducking, per-word guard.
- Loop: seamless end→start (picture, ambience, wrapped SFX tails).

## Must match or beat
- worst word margin >= 15 dB (QC hard limit 12)
- crowd stem <= -28 LU re narration (QC hard limit -18)
- final -16 +/-1 LUFS, <= -1 dBTP
- check-crowd all PASS (corr <= 0.6, flashes >= 8 frames apart, every photographer visible)
- no single-frame glitches, black frames or freezes
- loop frame diff <= ~6-8 when the story loops (limit 18)
- visual: earless odo5 characters, subtle face glow, brush outlines, detailed lit 3D world, one continuous smooth camera, no captions/text
