# London Bridge in the Desert: full film, final QC report

**File:** `london_bridge_full_1080x1920.mp4`
**Format:** 1080×1920, 30 fps, H.264 + AAC, 1771 frames, 59.03 s
**Narration:** the original `c1.mp3` (59.0106 s), unedited. It runs from frame 0 to the last frame.

**Verdict:** PASS. All 19 automatic checks passed, and the visual review below was done by hand.

## Automatic checks (`pipeline/qc.py --loop`, run on the final assembled file)

| check | result | detail |
|---|---|---|
| codec / audio | ✅ | h264 + aac |
| 9:16 at 1080×1920, 30 fps | ✅ | 1080x1920, 30.0 |
| frame count = narration | ✅ | 1771 vs 1771 |
| duration = narration | ✅ | 59.033 s vs 59.011 s |
| black frames | ✅ | 0 |
| single-frame glitches (every frame scanned) | ✅ | 0 |
| frozen / duplicated runs | ✅ | 0 |
| loudness | ✅ | −16.2 LUFS (target −16) |
| true peak | ✅ | −1.1 dBTP |
| narration sync | ✅ | 0 ms offset |
| every word audible over the background | ✅ | worst word 15.3 dB above the background in the speech band (target ≥ 12). The mixer made 35 small, smooth level dips to guarantee this. |
| crowd level | ✅ | −33.9 LU relative to the narration (limit −18) |
| loop: last frame ≈ first frame | ✅ | mean absolute difference 1.4 (limit 18) |
| loop: no audio click | ✅ | max sample step 0.019 |
| loop: ambience continuous | ✅ | −1.2 dB change at the seam |

## Visual review (consecutive frames inspected)

**World transitions.** Each was reviewed frame by frame. The camera never cuts: it moves through an atmospheric veil while the world behind it changes.

| frames | transition | what you see |
|---|---|---|
| 340–372 | desert → **cloud** → London | crane up from the arch; London dusk river with the old and new bridge |
| 976–994 | London → **sea fog** → ocean / Panama | |
| 1054–1074 | canal lock → **heat haze** → Arizona works | |
| 1469–1487 | flooding channel → **river spray** → approved Reopening | the Reopening is unchanged |
| 1756–1770 → 0–14 | **desert dust gust** at the loop seam | the end fades into the same gust that frame 0 emerges from, onto the desert bridge |

**Defect found and fixed.** Frames 1064–1159 had truck dust trails drawn as hard-edged square sprites.
- The sprites now use the same soft radial texture as the approved desert dust.
- Only batch 1050–1199 was re-rendered. The final file was re-assembled and fully re-checked.

**Characters.**
- Hal, the clerk, the London workers, the Arizona crew and the Reopening crowd are earless in every reviewed frame.
- Heads join the bodies with no gap, and each face has a subtle glow.

**Crowds.**
- The crowd-independence check passed (max hand correlation 0.55).
- The Reopening crowd and its photographers are unchanged from the approved benchmark.

**Benchmark untouched.** `approved_reopening_540x960.mp4` SHA-256 is still `198933eb…bdcdbd66182`.

## Honest notes

- **No camera cuts.** The four world changes are atmospheric pass-throughs, each opaque for a few frames.
- **Phrases.** The voiceover analysis finds 20 spoken phrases, not 21.
- **Sound.** All sound effects and ambiences are synthesized originals, not recordings.
- **London skyline.** The distant skyline in the aerial London shot is deliberately simple: low-detail silhouettes.
- **Captions.** There are no captions, text overlays or watermarks.
- **Delivery.** Nothing was pushed to GitHub. Everything is committed locally and stored in the backup ZIP.

## Files in this folder

- `london_bridge_full_1080x1920.mp4` is the final film.
- `loop_boundary_test.mp4` plays the last 2 s and then the first 2 s, to show the seam.
- `contact_sheet.png` shows 24 frames across the film.
- `london_bridge_audio_stems.zip` holds the narration, sfx, crowd, ambience, the mix, the cue sheet and `mix_report.json`.
