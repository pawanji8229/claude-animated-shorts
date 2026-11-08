# Reopening v2 — QC report (crowd + audio correction)

Encoded file: `twistframe_reopening_loop_540x960.mp4` (540×960, 30 fps, 291 frames, 9.70 s). Every item below was checked on the encoded video or the measured mix.

## Issues you reported → status

| issue | fix | verified by | result |
|---|---|---|---|
| Crowd cheering overpowered the narrator | cheers/“woo”/“ooh” voices removed; quiet distant murmur (−28 LU) + individually triggered soft claps; narration-priority mixer (levels relative to the voice, smooth ducking, per-word masking guard) | `mix_report.json` measurement + QC | crowd stem **−34.0 LU** below narration (was ≈ +3 LU above it: ~37 dB quieter); worst word **15.5 dB** clear of all background in the speech band (target ≥ 15, QC limit 12) |
| Photographers moved/clicked in sync | each of 5 photographers has own notice → reach → raise → aim → shoot → wind-on → lower timing, elbows, holds; 5 of 10 people never photograph | `check-crowd.ts` + consecutive-frame strips around all 10 shots | raises start at frames 29, 104, 155, 190, 215, 242; 10 shutters ≥ 10 frames apart; 5 flashes ≥ 13 frames apart |
| Robotic crowd | per-person personas (stance, breathing/sway rates, mood, temperament) + individual clips: claps, chatting pair, laughs, nods, a wave, hat/lapel adjust, looking at the bridge, pointing, late reactions | `check-crowd.ts` | max hand-motion correlation between any two people **0.35** (limit 0.6); never more than 5/10 gesturing at once |
| Shutter sounds not tied to visible action | every shutter/flash/film-advance/clap/cloth sound is derived from that person's animation clip | events.json + visibility gate | 10 shutters, each from a photographer verified on screen and unobstructed at that frame |

## Automatic QC (encoded MP4)

- PASS video codec H.264 — h264
- PASS audio track AAC — aac
- PASS 9:16 resolution — 540x960
- PASS 30 fps — 30.0
- PASS frame count = narration frames — 291 vs 291
- PASS duration = narration — video 9.700s vs narration 9.691s
- PASS audio duration matches video — audio 9.691s
- PASS no black frames — 0 black runs []
- PASS no single-frame glitches — 0 at frames []
- PASS no frozen/duplicated runs — 0 freeze(s) at []
- PASS loudness near target — I=-16.2 LUFS (target -16.0)
- PASS no clipping (true peak <= -1 dBTP) — TP=-1.1 dBTP
- PASS narration in sync (|offset| <= 1 frame) — offset 0 ms
- PASS narration intelligible (every word above background) — worst word margin 15.5 dB in speech band (target >= 12.0; 1 automatic guard cuts)
- PASS crowd stays quiet under narration — crowd -34.0 LU re narration (limit -18.0)
- PASS loop: last frame ~ first frame — mean abs diff 6.3 (limit 18)
- PASS loop: no audio click at boundary — max sample step 0.004
- PASS loop: ambience level continuous — level change +2.7 dB

## Crowd check

```
PASS hand motion not synchronised (max pairwise correlation <= 0.6) — max r = 0.35 (people 7 & 8)
PASS never most of the crowd gesturing at once — max 5/10 people moving arms in one frame (frame 239)
PASS shutters individually timed (>= 6 frames apart) — 10 shutters at 44, 58, 124, 172, 188, 206, 216, 229, 246, 258 (min gap 10)
PASS no simultaneous flashes (>= 8 frames apart) — 5 flashes at 44, 124, 188, 216, 229 (min gap 13)
PASS camera raises start at different times (>= 10 frames apart) — raise starts 29, 104, 155, 190, 215, 242
PASS some people do not photograph — 5/10 photographers
PASS every photographer visible at their shutter moment — f44 p1 x=0.65 | f58 p1 x=0.64 | f124 p3 x=0.51 | f229 p5 x=0.70 | f246 p5 x=0.71 | f172 p7 x=0.14 | f188 p7 x=0.15 | f258 p7 x=0.12 | f206 p9 x=0.25 | f216 p9 x=0.25
```

## Mix balance (measured)

- Narration -23.1 LUFS (reference). Final -16.1 LUFS, -1.1 dBTP.
- Stem loudness vs narration (LU): {'sfx': -22.1, 'crowd': -34.0, 'ambience': -29.2, 'music': None}
- Stems vs narration during speech, 300–4000 Hz (dB): {'sfx': -23.5, 'crowd': -34.0, 'ambience': -33.0, 'music': None}
- Worst word margin before guard 14.3 dB → after 15.5 dB; guard cuts: [{'pass': 1, 'word': 'he', 't0': 7.463, 't1': 7.653, 'margin_db': 14.3, 'cut_db': 1.7}]

## Visual inspection (by Claude, on the encoded frames)

- Consecutive frames around all 10 shots (−12, −4, 0, +1, +3, +9): cameras rise in both hands, hands grip the camera sides, straps visible, no hand/camera intersections seen; flash lasts one bright frame then fades over two more.
- Every character earless, no captions/text, continuous camera, no black/glitch/missing characters (also automatic).
- Loop: frames 288–291 → 1–3 continuous; `loop_boundary_test.mp4` provided.

## Honest notes

- Sound effects are synthesised (no recordings). Listening was not possible for me; balance was verified by measurement — please listen on your phone and tell me if any layer should move.
- The flash fill briefly brightens the photographer's face for 1–2 frames; it is intentional but can be reduced further.
- Characters stay fairly small in frame (wide shot of the bridge).
