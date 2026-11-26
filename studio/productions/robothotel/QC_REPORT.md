# Robot Hotel: QC report

**Final:** `render/final.mp4`
- 1080×1920, 30 fps, H.264 + AAC
- 1679 frames = narration, 55.95 s
- one continuous camera, seamless loop

## Automatic QC (`make_video.sh qc`): all PASS

| check | result |
|---|---|
| frames = narration | 1679 / 1679 |
| black frames, single-frame glitches, freezes | 0 / 0 / 0 |
| loudness / true peak | −16.5 LUFS / −1.1 dBTP |
| sync | 0 ms |
| worst word margin | 15.1 dB (6.4 dB before the guard; 21 automatic guard cuts) |
| loop: last vs first frame | mean diff 12.9 (limit 18; benchmark target 6–8) |
| loop: audio | no click |
| loop: ambience | +3.7 dB step |

## Mix (`audio/mix_report.json`)
- **Cues:** 205, all derived from the picture timeline.
- **Stems, re narration:** sfx −21.4 LU, ambience −32.3 LU, music −33.1 LU. No crowd stem.
- **Recorded layer:** Kenney CC0 and Mixkit (raw Mixkit files not committed), listed with sources in `SAMPLES.md`.
- **Synthesised sounds:** the snores and servo whirs, labelled as such.

## Visual inspection

Each of the 12 render batches was inspected as a contact sheet, plus the joined film's contact sheet and the loop seam.

**Character rules:** no ears; head/torso join clean; walks follow travel; costumes constant; no captions.

**Defects found in batches and fixed before the final:**
1. **Duplicate suitcase at check-in.** It is now lifted, tilted and set on the porter's deck.
2. **A guest passing about 1 m from the lens.** A blocking pass now keeps everyone at least 1.02 m from the camera.
3. **The camera grazing a charging alcove on the way to the corridor.** It is re-routed.
4. **The camera hitting the open room door twice**, on the way in and on the way out of room 101. The door opens earlier, and the exit path stays clear of the leaf.
5. **The concierge hidden behind the guest.** The guest now stands beside it.
6. **The employee walking into the camera in the room.** His route is shifted.
7. **The manager still at the desk at the loop seam.** He now walks off to the lounge before the seam.
8. **A 0.2 m zoom pop at the loop seam.** The pull-out now lands within 3 cm of the opening framing (loop diff 17.1 → 12.9).

**Known weaknesses (honest):**
- **Weaker than the approved Reopening benchmark** in atmosphere:
  - flatter, brighter interior lighting;
  - fewer background people (two lounge guests);
  - simpler surfaces.

  The character finish, glow and acting style match the benchmark.
- **Wide shot (≈ 300–380):** the "futuristic lobby" crane-up stays on the reception rather than showing the whole lobby.
- **Small details:** the unplugging (≈ 1270) and the manager's facepalm (≈ 1460) are small or at the frame edge. The workforce power-down (≈ 100–140) is subtle at phone size.
- **Raptors:** their legs are simple tubes (hidden behind the counter in every shot).
- **Room door pass (≈ 960–975):** the camera passes close to the door jamb for a few frames, intentionally, as a wipe into the room.
- **Loop seam:** the robots wheeled away in 2019 are back in their alcoves at frame 0. Those alcoves are not visible from the exterior seam framing.
- **Render cost:** about 5 s per frame at 1080p on this 4-core CPU container.

## Transcript (ASR, corrected for planning; the narration itself is untouched)

| line | ASR heard | read as |
|---|---|---|
| 3 | "were" (⚠) | "were" |
| 4 | "he stayed at this hotel want to" | "The hotel wanted to" |
| 6 | "it entered as robots to help with perception luggage and get services" | "it introduced robots to help with reception, luggage and guest services" |
| 14 | "a good dinner robs people of all they were sleeping" | "it would wake people up while they were sleeping" |
| 15 | "it took" (0.45 s) | ⚠ uncertain; treated as a short interjection ("Oops") |
| 17 | "for" (⚠) | "were" |
