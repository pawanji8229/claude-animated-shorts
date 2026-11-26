#!/usr/bin/env python3
"""Robot Hotel: prepare the recorded sample layer (48 kHz stereo WAV) in productions/robothotel/audio/samples/.
Sources (local asset cache, licences recorded in each cache manifest):
  k_*   Kenney CC0 packs (impact-sounds, interface-sounds, digital-audio, sci-fi-sounds)
  mk*   Mixkit Sound Effects Free License (use in our videos; raw files are never committed or redistributed)
  syn_* ORIGINAL synthesised sounds (described as synthesised, never as recordings): snore, servo whir.
The samples folder is gitignored; SAMPLES.md (committed) lists every file with its source + licence."""
import os, subprocess, json, glob
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "audio", "samples"); CACHE = os.path.join(HERE, "..", "..", "..", "asset-library", "cache")
os.makedirs(OUT, exist_ok=True); SR = 48000
def conv(src, dst):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", os.path.join(OUT, dst)], check=True)
rows = []
K = {  # kenney pack -> basenames
    "impact-sounds": [f"footstep_concrete_00{i}" for i in range(5)] + [f"footstep_carpet_00{i}" for i in range(5)] + [f"footstep_wood_00{i}" for i in range(5)]
        + ["impactPlate_light_000", "impactPlate_light_001", "impactSoft_medium_000", "impactSoft_medium_001", "impactSoft_heavy_000", "impactPlank_medium_000", "impactPlank_medium_001", "impactPlank_medium_002",
           "impactMetal_light_000", "impactMetal_light_001", "impactGeneric_light_000", "impactBell_heavy_000"],
    "interface-sounds": ["error_002", "error_004", "error_006", "question_001", "question_002", "question_003", "confirmation_001", "confirmation_002", "glitch_001", "glitch_002", "glitch_003", "switch_001", "switch_002", "toggle_001", "drop_001", "scratch_001"],
    "digital-audio": ["pepSound1", "pepSound2", "pepSound3", "pepSound4", "powerUp2", "powerUp7", "lowDown", "zapThreeToneDown", "zapThreeToneUp", "threeTone1", "twoTone1", "phaserDown1", "phaserUp2", "highUp", "lowRandom"],
    "sci-fi-sounds": ["computerNoise_000", "computerNoise_001", "forceField_000", "forceField_001", "engineCircular_000", "doorOpen_000", "doorClose_000", "spaceEngineSmall_000"],
}
for pack, names in K.items():
    for n in names:
        src = glob.glob(os.path.join(CACHE, "kenney", pack, "files", "**", n + ".ogg"), recursive=True)
        if not src: print("missing", pack, n); continue
        conv(src[0], f"k_{n}.wav"); rows.append((f"k_{n}.wav", f"Kenney {pack} / {n}.ogg", "CC0 1.0"))
MK = {"1523": "heavy sliding door", "309": "dragon growl (raptor roar)", "2981": "people indoors ambience", "2465": "urban ambient", "3080": "cinematic room tone", "988": "alarm clock beep",
      "933": "bell notification", "473": "cartoon failure piano", "2595": "small electric glitch", "2594": "electric buzz glitch", "1059": "tick tock clock", "2842": "door key in lock", "182": "door", "201": "door", "1131": "mechanical tool click", "1530": "paper slide"}
for i, what in MK.items():
    w = glob.glob(os.path.join(CACHE, "mixkit", i, "*.wav")) + glob.glob(os.path.join(CACHE, "mixkit", i, "*.mp3"))
    if not w: print("missing mixkit", i); continue
    m = json.load(open(os.path.join(CACHE, "mixkit", i, "manifest.json"))); conv(w[0], f"mk{i}.wav"); rows.append((f"mk{i}.wav", f"Mixkit #{i} {m.get('title') or what} ({m.get('page', '')})", "Mixkit Sound Effects Free License"))

# ---- ORIGINAL synthesised sounds
rng = np.random.default_rng(42)
def bp(x, lo, hi, o=2): b, a = butter(o, [lo / (SR / 2), hi / (SR / 2)], "band"); return lfilter(b, a, x)
def lp(x, hi, o=2): b, a = butter(o, hi / (SR / 2)); return lfilter(b, a, x)
def save(name, x, note):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9; st = np.stack([x, x], 1); wavfile.write(os.path.join(OUT, name), SR, (st * 32767).astype(np.int16)); rows.append((name, note, "original (synthesised)"))
for k in range(4):   # snore: a 1.3-1.6 s inhale with a soft-palate flutter (25-38 Hz pulse train) through a nasal resonance, then a breathy exhale
    d1 = 1.3 + 0.1 * k; n1 = int(d1 * SR); t = np.arange(n1) / SR; env = np.sin(np.pi * np.clip(t / d1, 0, 1)) ** 1.4
    rate = 27 + 3 * k + 6 * np.sin(np.pi * t / d1); ph = np.cumsum(rate) / SR; flutter = (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * ph))) * (0.6 + 0.4 * np.sin(2 * np.pi * ph * 2))
    noise = rng.standard_normal(n1); inh = bp(noise * flutter, 90, 700) * 1.0 + bp(noise, 400, 2400) * 0.12; inh = lp(inh, 1600) * env
    d2 = 1.0; n2 = int(d2 * SR); t2 = np.arange(n2) / SR; ex = bp(rng.standard_normal(n2), 300, 2600) * (np.sin(np.pi * t2 / d2) ** 2) * 0.25
    save(f"syn_snore{k}.wav", np.concatenate([inh, np.zeros(int(0.15 * SR)), ex]), "synthesised snore (noise through a fluttering nasal band-pass + breathy exhale)")
for k in range(3):   # servo whir: two detuned saws through a gentle band-pass with a pitch glide
    d = 0.45 + 0.15 * k; n = int(d * SR); t = np.arange(n) / SR; f0 = 180 + 60 * k + 90 * (t / d); ph = np.cumsum(f0) / SR
    x = ((ph % 1) * 2 - 1) + 0.6 * (((ph * 1.007) % 1) * 2 - 1); x = bp(x, 150, 2200) * np.sin(np.pi * t / d) ** 0.6
    save(f"syn_servo{k}.wav", x, "synthesised servo motor whir")
with open(os.path.join(HERE, "SAMPLES.md"), "w") as fh:
    fh.write("# Robot Hotel: sample layer (audio/samples, not committed)\n\n| file | source | licence |\n|---|---|---|\n")
    for r in rows: fh.write(f"| {r[0]} | {r[1]} | {r[2]} |\n")
print(len(rows), "samples ->", OUT)
