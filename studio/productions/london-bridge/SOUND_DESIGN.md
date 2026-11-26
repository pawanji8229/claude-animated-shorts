# Sound design — "London Bridge in the Desert"

## Principles
- **Narration is the master clock** (59.0106 s, 1771 frames). It is decoded to 48 kHz and never edited, stretched or
  rebalanced. The final master applies one uniform gain to the whole mix (target ≈ −16 LUFS, ≤ −1 dBTP).
- **Animation-triggered**: cue frames come from the same TypeScript that drives the picture
  (`src/desert/desertHook.ts → hookSoundEvents()`, exported by `scripts/export-events.ts`). Footsteps are emitted
  exactly where the gait phase crosses a heel strike — never while a foot is in the air.
- **Variation**: every instance is synthesised with its own seed (pitch, grain count, colour, ±1.5 dB), so no sample
  repeats identically.
- **Layers**: FG (character + object interactions), BG (distant life), continuous ambience (never cuts — the take
  is continuous), optional subtle music. Ambience −7 dB / music −8 dB / SFX −2 dB under speech (speech-aware ducking,
  70 ms attack, 400 ms release). Open-air reverb with a slap off the bridge face (~55 ms) on SFX sends.
- **Honesty about sources**: ALL effects are procedurally synthesised (`studio/audio/desert_sfx.py`, plus the
  upstream `sfx_gen.py` / `dsp.py` kit). No recorded sample libraries are reachable from this environment, so
  footsteps, fabric and nature sounds are synthesised approximations, not field recordings. If you want recorded
  CC0 assets (e.g. from a library you download on your phone), they can be dropped in and the cue sheet re-used.

## Act-by-act sound plan (detailed cue sheets are generated per batch)
| act | frames | foreground (synced to actions) | background / ambience | music |
|---|---|---|---|---|
| 1 desert hook | 0–309 | sand footsteps, turn scuff, suit swishes (ta-da), wallet pats + coin jingles, pebble whistle + clack + bounces, freeze tick, gulp, reveal whoosh, tumbleweeds (panned along their paths) | desert wind with gusts + sand hiss, faint cicadas, distant hawk ×2, vulture flap | sparse plucked desert guitar (ducked) |
| 2 flight + London | 310–627 | crane-up whoosh, wind rush over sea, gull pass-bys, footsteps on stone embankment, blueprint unroll/rustle, yawn, idea "ding" (soft) | Thames lapping, gulls, distant traffic/city murmur, original clock chime, light rain on stone | soft strings pad (ducked) |
| 3 purchase + dismantling | 628–920 | pen scratch, stamp thunk, cash-register ring, coin clinks, chalk scratches per numbered block, chisel/hammer taps, crane winch + chain rattle, stone thuds, workers' footsteps on gravel | site murmur, river, gulls | rhythmic light percussion |
| 4 shipping | 921–1138 | ship horn, hull creaks, rope stretch, wave slaps, lock-gate motor + gear clunks, water rush, truck engines, gravel crunch, air-brake hiss | open-sea wind, waves, canal machinery hum, desert wind returns | travelling motif |
| 5 rebuild + no river | 1139–1399 | concrete mixer, block thuds, wrench ratchets, scaffold clatter, footsteps on planks; callback: tumbleweed, gulp | site ambience → desert wind | motif pauses for the joke |
| 6 channel + reopening | 1400–1637 | excavator engine + bucket scrapes, water rush + splash, ribbon snip, balloon pops, flash-bulb pops, boat motors | crowd murmur → cheer + applause, band stabs (original) | brass-band style (original) |
| 7 finale | 1638–1770 | shutter clicks + flashes aimed at Hal, crowd swell, final whoosh on the rise | crowd, evening desert | resolve |

## Deliverables per batch / final
`narration.wav` (untouched), `sfx.wav`, `ambience.wav`, `music.wav`, `mix_premaster.wav`, `mix.wav` (mastered),
`cue_sheet.csv` + `cue_sheet.md` (frame, start/end, source/object, generator, level, pan, fades, FG/BG).
