# Mail Rail: QC report (v1.1, release `video-mailrail-0-1800-run5.1`)

File: `mailrail_0-1800.mp4`. H.264 + AAC, native 1080×1920, 30 fps, 1801 frames (60.033 s against 60.029 s narration).
Rendered on GitHub Actions (16 parallel chunks) from `render/twistframe-mailrail` @ 9d59fc0.

## Automatic checks (cloud qc.py): 16/16 PASS
- **Format:** codec, resolution and fps correct; frame count equals the narration frame count; audio duration equals video duration.
- **Picture:** 0 black frames, 0 single-frame glitches, 0 frozen runs.
- **Loudness:** −16.1 LUFS, true peak −1.0 dBTP.
- **Sync:** narration offset 0 ms.
- **Loop:** first and last frame mean difference 10.8 (limit 18), no audio click, ambience continuous.
- **Narration:** never edited. Its worst word stays 15.3 dB clear of every effect after the mixer's guard cuts (7 cuts). Sound-effect stem −21 LU, ambience −30.8 LU, music −32.7 LU, each relative to the narration.

## Visual review (by eye, not automated)
- **Flicker scan on six 10 s segments (540 px).** The high-scoring frames are 195–198 (beside the train in the station), 826–840 (entering Mount Pleasant), 1018–1068 (the tunnel ride: rings, lamps and sleepers streaming past) and 1668–1676 (the pull-out). I inspected the consecutive frames of each cluster at full resolution. All of it is continuous motion of fine detail, with no pops, flashes, z-fighting or one-frame changes.
- **Section switches.** At frame 858 (into the station) and frame 1648 (out of it), the difference to the neighbouring frames is the same as ordinary camera motion, and nothing appears or disappears.
- **Loop seam.** Frames 1799, 1800, 0 and 1 are continuous.
- **Train.** Wheel treads sit on the rail heads; flanges run inside them; there is no floating and no jitter. The body float is at most 2.5 mm and smooth. Each wheel has a single balance mark, so the spin never strobes backwards. The tunnel rings are spaced irregularly, so there is no wagon-wheel effect while the camera tracks the train.
- **Bags.** Each loaded bag lands in its container and stays: the fill count steps exactly on the landing frame, with no doubled or popping bags. Unloaded bags are lifted out, placed on the belt and ride up into the vault opening.
- **Characters.** The approved earless TwistFrame cards, with face glow and outlines. Walkers' steps are driven by the distance they travel; no one wanders. Cringe beats:
  - Liverpool Street platform: idea → frozen smile → embarrassed → awkward grin.
  - The street: worried → side-eye at the horn → panic → disbelief → cringe.
  - The closure: confused → huge shock → disbelief → deadpan.

## Fixed after v1 (`video-mailrail-0-1800-run4.1`)
1. The hero sat at the left edge in the street shot; he is now centred.
2. The descent frames showed mostly soil; they now show street, section and train together.
3. The hanging lamps had a duplicate emissive bulb; it is removed.

## Known limitations (honest)
- **Compressed geography.** The railway is about 6.5 m deep instead of about 21 m, and the stations are closer together, so both levels fit in 9:16. This is documented in `SOURCE_NOTES.md`.
- **Train motor sound.** It is a recorded industrial machine hum (Mixkit), because no licensed electric mail-train recording was available. Rail clacks, brake squeals and tunnel air are generated from the train's actual axle positions and speed.
- **Section view.** The cut-away ground is a stylised museum-model convention, not a literal view.
- **Background vehicles.** These are the earlier 1930s TwistFrame car and lorry models, recoloured. There is no double-decker bus.
