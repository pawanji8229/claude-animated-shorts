# Audio 2.0 (`studio/audio2`)

Audio 2.0 is a separate system. The approved pipeline (`studio/audio/*.py`, `mix_events.py`) is unchanged; Audio 2.0 only imports its DSP kit (`dsp.py`).

| File | What it does |
|---|---|
| `acquire.py` | Legal, curated acquisition workflow (detailed below). |
| `build_registry.py` | Builds `library/registry.json` (detailed below), plus `library/LIBRARY.md` and `library/review_queue.json`. |
| `engine.py` | Loading, search, selection and the narration-first mixer (detailed below). |
| `synth.py` | 16 original synthesised sounds (marked `synth:`): riser, whoosh, swish, sub boom, cinematic impact, drone, reverse swell, tension, accent, pop, cloth rustle, and footsteps on sand, snow, mud and water. |
| `music.py` | Original generative score, so all rights are ours (detailed below). |
| `narration.py` | Validates the voiceover (decode, sample rate, channels, duration, loudness, true peak, clipping, DC offset), detects silences and takes word timings from the existing ASR analysis. The narration is never edited: only an optional uniform gain, plus an optional 70 Hz high-pass if explicitly asked. |
| `director.py` | Automatic sound placement (detailed below). |
| `mix_demo.py` | Production entry point: scene JSON → cues → stems + mix + AAC + mux + cue sheet + `mix_report.json`. |
| `lab.py` | 14 audio lab demos (MP3 + WAV) and `lab_report.json`. |
| `test_audio2.py` | 28 automated tests. |

## Acquisition (`acquire.py`)

| Source | Status | Notes |
|---|---|---|
| **Mixkit** sound effects | **229 downloaded** | Mixkit Sound Effects Free License: commercial use inside our videos, no attribution. Raw files may NOT be redistributed, so they stay in the gitignored `asset-library/cache/` and only metadata is committed. Downloaded at 1 request per second, 3 per category, over 90 category pages. 4 items returned HTTP 403 and were skipped (not retried). |
| **Kenney** packs | **5 downloaded** | CC0: interface-sounds, ui-audio, digital-audio, sci-fi-sounds, music-jingles. |
| **Pixabay** | Review queue | Returns HTTP 403 to automated clients. Not bypassed. |
| **Freesound** | Review queue | Needs an API key, and each recording has its own licence. |
| **ZapSplat** | Review queue | Needs an account and attribution, and isn't reachable from this environment. |
| **Mixkit music** | Review queue | The licence text could not be machine-verified. |

## Registry (`build_registry.py`)
- **874 verified sounds** across 41 categories (3 duplicates removed by sha256).
- Each entry records: name, category, description, tags, duration, format, sample rate, channels, source site, source page, file URL, licence, licence URL, attribution, sha256, local path and status.
- Missing, corrupt and hash-mismatched files are detected.

## Engine (`engine.py`)
- **Loading:** registry loading with an `.npy` cache; search by category, tags and duration.
- **Anti-repetition:** a deterministic `Chooser` never picks the same file twice in a row.
- **Single steps from walking takes:** `step_onsets` cuts single footsteps out of walking recordings (a different step each time).
- **Events:** each event has trim, fades, gain plus breakpoint automation, pan or a pan curve, 3D position (distance attenuation + air absorption), playback rate, a seamless loop, a reverb send per environment (synthetic room impulse responses) and a `why`.
- **Mixer** (`mix`), narration-first:
  1. Every bus is levelled relative to the narration: beds in LU under it, events by loudest moment.
  2. Sidechain ducking from the narration envelope (60 ms attack, 600 ms release).
  3. Bus high-pass EQ and gentle bus compression.
  4. Iterative per-word speech-band masking guard: every word stays at least 15 dB above everything else.
  5. One master gain to −16 LUFS, then a 4× oversampled true-peak limiter at −1.5 dBTP (AAC overshoot headroom).
  6. Reports LUFS, true peak, clipping, per-word margins and every guard cut.

## Music (`music.py`)
- Original generative score: 12 moods (curious, mysterious, educational, historical, adventurous, dramatic, emotional, suspenseful, exciting, lighthearted, comedic, calm).
- Layers: pad, Karplus-Strong pluck, bass, bell and light percussion.
- Sections end on bar boundaries and crossfade, with no abrupt endings.
- Loop-point detection.

## Director (`director.py`)
Input is a scene JSON (see the docstring). Output is a cue list where every cue has a reason. The rules:
- **Footsteps:** one per real foot contact, surface-aware, nothing while standing.
- **Cloth:** only on gestures and turns.
- **Object handling:** sound by material.
- **Camera:** sound only for reveals (riser, plus an accent if important) and dissolves (a soft transition). Orbit, follow and tracking moves stay silent. At most one accent per 4 s, and never on top of a word.
- **World sources:** played only within their audible radius, with distance-driven gain and pan curves.
- **Ambience:** layered beds per environment, crossfading over 2 s.
- **Music:** moods from the scene.

## Use in a production
1. Export the scene JSON from the scene code (template: `scripts/export-demo-audio.ts`).
2. Run:
   ```
   python audio2/mix_demo.py scene.json productions/<id>/audio2 render.mp4 \
     --narration productions/<id>/input/narration.mp3 --analysis productions/<id>/analysis/analysis.json
   ```

## Measured (from the lab)
- Narration mix: −16.17 LUFS, −1.5 dBTP, worst word margin 15.1 dB.
- AAC export: duration identical, loudness change 0.03 LU, true peak −1.35 dBTP.
- Render speed: about 0.1 × real time (a 24 s mix renders in about 2.5 s).
- Old-style repeats (same footstep file twice in a row): 39 of 40 steps, versus 0 with Audio 2.0.
- Sparse SFX-only demos measure −17 to −23 LUFS: the true-peak ceiling wins over the loudness target when there is no continuous programme (by design).
