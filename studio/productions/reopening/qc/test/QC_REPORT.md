# QC report

file: `test.mp4` — **PASS (automatic checks) — visual review still required**

| check | result | detail |
|---|---|---|
| video codec H.264 | ✅ | h264 |
| audio track AAC | ✅ | aac |
| 9:16 resolution | ✅ | 540x960 |
| 30 fps | ✅ | 30.0 |
| frame count = narration frames | ✅ | 60 vs 60 |
| duration = narration | ✅ | video 2.000s vs narration 9.691s |
| audio duration matches video | ✅ | audio 2.000s |
| no black frames | ✅ | 0 black runs [] |
| no frozen/duplicated runs (soft) | ✅ | 0 freeze(s) at [] |
| loudness near target (soft) | ✅ | I=-14.8 LUFS (target -16.0) |
| no clipping (true peak <= -1 dBTP) | ✅ | TP=-2.1 dBTP |
| narration in sync (|offset| <= 1 frame) | ✅ | offset 0 ms |

## Mandatory visual inspection (not automatable)
- [ ] character has NO ears in every view
- [ ] head/torso join clean, no floating parts
- [ ] hands/fingers/elbows plausible; feet planted (no slide)
- [ ] bridge/architecture: no stretching, z-fighting, flicker or popping
- [ ] environment detail & lighting vs style bible
- [ ] camera continuity feel (no perceived jumps)
- [ ] sound events match visible actions

Artifacts: `contact_sheet.png`
