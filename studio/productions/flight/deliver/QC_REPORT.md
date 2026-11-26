# The World's Shortest Scheduled Flight — QC report

Final: `shortest_flight_1080x1920.mp4` — native 1080×1920, 30 fps, H.264 + AAC, 1511 frames / 50.367 s (narration 50.364 s), ~100 MB.
Original TwistFrame Lab stack (Remotion + three.js, odo5 characters). No V3, no GitHub, no captions, narration untouched.

## Automatic QC (pipeline/qc.py --loop): PASS
| Check | Result |
|---|---|
| Codec / size / fps | H.264, AAC, 1080×1920, 30 fps |
| Frame count = narration | 1511 = 1511 |
| Black frames / single-frame glitches / freezes | 0 / 0 / 0 |
| Loudness / true peak | −16.1 LUFS / −1.0 dBTP |
| Narration sync | 0 ms offset |
| Intelligibility | worst word margin 15.0 dB (target ≥ 12; 10 automatic guard cuts, max 7.8 dB, all in the engine/take-off passage) |
| Loop: last ≈ first frame | mean abs diff 2.1 (limit 18) |
| Loop: audio click / ambience step | max step 0.079 / −0.7 dB |

## Mix
SFX stem −19.5 LU and ambience −29.0 LU under the narration; no crowd, no music. 79 animation-derived events (cue sheet: `audio/cue_sheet.csv`): engine start, taxi, take-off, touchdown, roll-out, spin-down, doors, belts, seat creaks, footsteps on gravel/grass, windsock, oystercatchers, sheep, cabin acting accents. All effects are synthesised.

## Corrections made in this pass
1. Diagonal main-gear brace removed — the hero window in the opening is unobstructed.
2. Wing underside: stronger ground-bounce fill; and a real bug fixed — the flap/aileron outline was self-intersecting, so those surfaces rendered solid black. They are now lit, painted surfaces.
3. Aerials re-aimed: the aircraft and its shadow stay centred in the vertical frame with Papa Westray ahead; whitecaps thinned.
4. Wingtip strobe softened (it produced a bloom blob).

## Visual review (contact sheet + full-res stills)
Checked: opening window shot, cabin MCUs, aerials, Westray boarding/taxi/take-off, approach, montage, touchdown, arrival door, loop dissolve. Characters earless, heads joined to torsos, face glow without blow-out.

## Known weaknesses (honest)
- In the highest aerial (≈15–17 s) the aircraft is small — readable on a phone, but a small subject.
- Opacity dissolves (cabin ↔ exterior, montage) briefly show a ghosted face over the aircraft by design.
- The flight time shown is one ~90 s example; the narration's "sometimes even shorter" is respected, it is not claimed every flight takes 90 s.
- The video ends mid-sentence ("Because on this route…") and loops back to the opening, as requested.
