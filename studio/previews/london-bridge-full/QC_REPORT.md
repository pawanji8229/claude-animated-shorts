# London Bridge in the Desert: v2 full film, final QC report

**File:** `london_bridge_full_1080x1920.mp4` (v2; replaces the rejected v1, which is kept in `out/twistframe-backup-london-bridge.zip`)
**Format:** 1080×1920, 30 fps, H.264 + AAC 320k, 1771 frames, 59.03 s
**Narration:** the original voiceover (59.011 s), unedited, from frame 0 to the last frame. The audio is the narration-first mix.
**Verdict:** all 19 automatic checks PASS on the assembled file. The hands-on review of the finished MP4 is below.

## How it was rendered

- **Resumed, not restarted.** The film is 12 batches of 150 frames.
- **Five batches reused**, each verified first:
  - `0–149`, `150–299` and `1500–1649`: their source did not change.
  - `450–599` and `600–749`: the London set did change, so ten fresh 1080p frames were rendered and compared with the stored batches. Every frame matched within H.264 noise: mean difference ≤ 1.5/255, and no pixel off by more than 35.
- **Seven batches re-rendered**, because their source changed:
  - `300–449`: the aerial now shows the new cargo. The comparison failed at frame 440, with 2.4 % of pixels changed.
  - `750–899` and `900–1049`: the loading.
  - `1050–1199`: the lock and the trucks.
  - `1200–1349`: the scaffold.
  - `1350–1499` and `1650–1770`: never finished before the interruption.
- **Jobs:** three background jobs, each well under the 2-hour limit. Each batch was saved as soon as it finished.
- **Frame check:** every batch was frame-counted before joining. They total 0–1770 = **1771 frames**.

## Automatic checks (`pipeline/qc.py --loop`, run on the final file)

| check | result | detail |
|---|---|---|
| H.264 / AAC | ✅ | h264 + aac |
| 1080×1920, 30 fps | ✅ | |
| frame count = narration | ✅ | 1771 vs 1771 |
| duration = narration | ✅ | 59.033 s vs 59.011 s |
| black frames | ✅ | 0 |
| single-frame glitches (every frame scanned) | ✅ | 0 |
| frozen / duplicated runs | ✅ | 0 |
| loudness | ✅ | −16.6 LUFS (target −16, tolerance 1.5) |
| true peak | ✅ | −1.3 dBTP. **The first assembly failed at −0.6 dBTP:** AAC encoding overshoots. I re-muxed the same mix at 320 kbps with a 0.4 dB trim. The video stream was copied unchanged. |
| narration sync | ✅ | 0 ms offset |
| every word audible | ✅ | worst word 15.3 dB above the background in the speech band (target ≥ 12) |
| crowd under narration | ✅ | −33.9 LU (limit −18) |
| loop: last ≈ first frame | ✅ | mean difference 0.3 (limit 18) |
| loop: no audio click | ✅ | max sample step 0.012 |
| loop: ambience continuous | ✅ | −1.2 dB at the seam |

The crowd-independence check also passed (6/6). The approved Reopening benchmark is untouched: SHA-256 `198933eb…bdcdbd66182`.

## Hands-on review of the finished MP4

Frames were pulled from the final file: one every second for the whole film, and every 4th frame through each transition.

**Opacity transitions.** All six are smooth cross-dissolves. None has a blank or opaque frame, a camera jump or a pop.

| frames | dissolve |
|---|---|
| 344–368 | hook arch and Hal → London aerial |
| 972–996 | departing ship → the same ship on the ocean |
| 1010–1026 | ocean → lock (new). The ship stays matched; the dissolve stands for the passage of time. |
| 1052–1076 | lock → Arizona road. The trucks are already driving. |
| 1481–1499 | flooded channel → approved Reopening, matched camera |
| 1747–1770 | Reopening → frame 0, the loop |

**Entrances and exits.** Nothing pops in or out on screen:
- The seller walks in, and so do the dismantling crew.
- The quay truck drives along the quay and parks.
- The ship casts off and its mooring lines are hauled in.
- The Arizona trucks drive in and park.
- The crew walk off.
- Hal walks in, then walks out facing his direction of travel.
- The excavators drive in and climb out.

**Machines, water and construction.**
- **Quay crane:** slews, hooks, lifts and sets down block 1263 inside the open hold. The camera rises over the quay wall to show this.
- **Ocean:** stable wake and ripples, with no flicker.
- **Lock:** the chamber boils as it fills. The ship rises about 2.8 m behind the closed lower gates while the lower pool stays low. The upper gates then swing open.
- **Truck crane:** cycles blocks from the stack into the facing.
- **Excavators:** dig, the spoil piles grow, and the water floods in behind them.

**Characters.** All earless, with outlines and glow. The Reopening crowd and its photographers are unchanged from the approved version.

**Captions.** No captions, text overlays or watermarks.

## Fixes in this round (v2.1)

1. **Arizona scaffold:** it no longer sinks.
   - It now stands only on the outer spans, which keeps the excavator channel clear. It remains standing through the whole rebuild.
   - It is struck at frame 1340, while the camera is held tight on Hal under the arch. I checked frames 1300–1398: the outer spans are not in shot.
2. **Panama lock:** it now visibly works. The chamber fills with boiling culvert water, the ship rises from deep in the chamber, and the upper mitre gates open.
3. **Cargo operation:** it is now bigger.
   - Block 1263 is still loaded on screen.
   - A second stack of 15 numbered blocks waits on the quay.
   - A flatbed truck brings 6 more blocks along the quay (frames 788–850).
   - Both holds of the ship carry cargo, and the same cargo appears in the ocean and lock shots.

## Remaining known limitations

- **One crane cycle.** Only block 1263 is lifted end to end. The other blocks are shown already stacked, delivered by truck, or already in the holds.
- **Scaffold struck off-screen.** We never see the poles being taken down: the camera is on Hal when it happens.
- **Lock is condensed.** The lift happens in about 1 s and the ship passes through a single lock chamber. The mules sit beside the ship and do not haul it.
- **Kinematics, not physics.** All machinery is keyframed.
- **Simple distant elements.** The London skyline and the rain-forest hills are deliberately low-detail silhouettes.
- **Sound.** All sound effects are synthesized originals, not recordings.
- **Delivery.** Nothing was pushed to GitHub. Everything is committed locally and stored in the backup ZIP.

## Files in this folder

- `london_bridge_full_1080x1920.mp4`: the final film (v2)
- `loop_boundary_test.mp4`: the last 2 s followed by the first 2 s
- `contact_sheet.png`: 24 frames across the film
- `comparisons/old_vs_new_f*.png`: the rejected v1 (left) and v2 (right) at frames 360, 727, 812, 940, 1040, 1100, 1200 and 1440
- `london_bridge_audio_stems.zip`: narration, sfx, crowd, ambience, the mix, the cue sheet and the mix report
