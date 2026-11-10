# QC report

file: `final.mp4` — **PASS (automatic checks) — visual review still required**

| check | result | detail |
|---|---|---|
| video codec H.264 | ✅ | h264 |
| audio track AAC | ✅ | aac |
| 9:16 resolution | ✅ | 540x960 |
| 30 fps | ✅ | 30.0 |
| frame count = narration frames | ✅ | 291 vs 291 |
| duration = narration | ✅ | video 9.700s vs narration 9.691s |
| audio duration matches video | ✅ | audio 9.691s |
| no black frames | ✅ | 0 black runs [] |
| no single-frame glitches | ✅ | 0 at frames [] |
| no frozen/duplicated runs (soft) | ✅ | 0 freeze(s) at [] |
| loudness near target (soft) | ✅ | I=-16.2 LUFS (target -16.0) |
| no clipping (true peak <= -1 dBTP) | ✅ | TP=-1.1 dBTP |
| narration in sync (|offset| <= 1 frame) | ✅ | offset 0 ms |
| narration intelligible (every word above background) | ✅ | worst word margin 15.5 dB in speech band (target >= 12.0; 1 automatic guard cuts) |
| crowd stays quiet under narration | ✅ | crowd -34.0 LU re narration (limit -18.0) |
| loop: last frame ~ first frame (soft) | ✅ | mean abs diff 6.3 (limit 18) |
| loop: no audio click at boundary (soft) | ✅ | max sample step 0.004 |
| loop: ambience level continuous (soft) | ✅ | level change +2.7 dB |

## Mandatory visual inspection (not automatable)
- [ ] character has NO ears in every view
- [ ] head/torso join clean, no floating parts
- [ ] hands/fingers/elbows plausible; feet planted (no slide)
- [ ] bridge/architecture: no stretching, z-fighting, flicker or popping
- [ ] environment detail & lighting vs style bible
- [ ] camera continuity feel (no perceived jumps)
- [ ] sound events match visible actions

Artifacts: `contact_sheet.png`, `loop_boundary_test.mp4`
