# TwistFrame Lab generic event-driven sound design + mix (generalised from the London Bridge Act 1 mixer).
# Usage: python mix_events.py <narration.mp3|wav> <events.json> <outdir> [duration_s|full] [--ambience desert|room|sea|none]
#                              [--music desert_guitar|none] [--loop]
# --loop makes ambience/music circular (tail crossfaded into head) so the end of the video flows into its start.
# Writes: narration.wav (untouched narration, 48 kHz), sfx.wav, ambience.wav, music.wav, mix.wav,
#         cue_sheet.csv + cue_sheet.md (every placed sound with frame, time, level, pan, fades, layer).
import json, subprocess, sys, os, csv
import numpy as np
from dsp import SR, ns, rng, pan, st, place, make_ir, convolve_st, write_wav, read_wav, integrated, true_peak, lp
import desert_sfx as S

import argparse
_ap = argparse.ArgumentParser(); _ap.add_argument("narration"); _ap.add_argument("events"); _ap.add_argument("outdir"); _ap.add_argument("duration", nargs="?", default="full")
_ap.add_argument("--ambience", default="desert"); _ap.add_argument("--music", default="desert_guitar"); _ap.add_argument("--loop", action="store_true")
_A = _ap.parse_args()
mp3, evp, out = _A.narration, _A.events, _A.outdir
if _A.duration == "full":
    DUR = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3], capture_output=True, text=True, check=True).stdout.strip())
else:
    DUR = float(_A.duration)
FPS = 30
os.makedirs(out, exist_ok=True)
N = ns(DUR)

# ---- narration: decode only (no edits, no gain change); master clock ----
wav_full = os.path.join(out, "narration_full_48k.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s24le", wav_full], check=True)
vo_full, _ = read_wav(wav_full)
vo = np.zeros((2, N)); m = min(N, vo_full.shape[1]); vo[:, :m] = vo_full[:, :m]

# ---- speech-aware ducking envelope ----
win = ns(0.02); rms = np.sqrt(np.convolve(vo[0] ** 2, np.ones(win) / win, mode="same"))
mask = (rms > 10 ** (-38 / 20)).astype(float)
att, rel = 0.07, 0.4; env = np.zeros(N); a1, a2 = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); v = 0.0
for i in range(N):
    tgt = mask[i]; v = (a1 if tgt > v else a2) * v + (1 - (a1 if tgt > v else a2)) * tgt; env[i] = v
duck = lambda depth_db: 10 ** (depth_db * env / 20)

ev = json.load(open(evp))["events"]
sfx = np.zeros((2, N)); amb = np.zeros((2, N)); mus = np.zeros((2, N)); verb_send = np.zeros((2, N))
rows = []
LEVEL = {  # dB, layer, source description
    "step_sand": (-15, "FG", "Hal's shoes on sand (procedural grain crunch + thump)"),
    "turn_scuff": (-19, "FG", "foot reposition on sand"),
    "fabric_swish_big": (-17, "FG", "suit sleeves sweep (ta-da)"), "fabric_swish": (-22, "FG", "suit fabric movement"),
    "wallet_pat": (-16, "FG", "hand pats leather wallet in chest pocket"), "coin_jingle": (-25, "FG", "coins in wallet"),
    "whoosh_reveal": (-19, "FG", "camera rise / pull-back reveal"), "pebble_whistle": (-31, "FG", "pebble falling (cartoon whistle, subtle)"),
    "pebble_clack": (-12, "FG", "pebble hits baked mud + bounces + dust"), "freeze_sting": (-27, "FG", "comic freeze tick"),
    "gulp": (-18, "FG", "Hal's nervous gulp"), "hawk": (-29, "BG", "distant hawk cry"),
    "tumble_roll_1": (-21, "FG", "tumbleweed rolling across foreground"), "tumble_roll_2": (-25, "BG", "tumbleweed rolling away under the arch"),
    "vulture_flap": (-31, "BG", "vulture wing shuffle"),
    "car_arrive": (-14, "FG", "1960s convertible V8 approaching on gravel, decelerating"), "brake_squeak": (-27, "FG", "brakes squeak at the stop"),
    "engine_off": (-19, "FG", "ignition off: engine shudder + cooling ticks"), "door_open": (-21, "FG", "car door latch + hinge"), "door_close": (-15, "FG", "car door shuts"),
}
r0 = rng(2026)
for k, e in enumerate(ev):
    f, kind = e["frame"], e["kind"]; t0 = f / FPS
    if t0 >= DUR: continue
    r = rng(1000 + k * 7 + f)
    db, layer, desc = LEVEL.get(kind, (-24, "FG", kind))
    jitter_db = r.uniform(-1.5, 1.5)
    p = float(e.get("x", 0.0))
    if kind == "step_sand": x = S.step_sand(r, r.uniform(0.85, 1.1))
    elif kind == "turn_scuff": x = S.turn_scuff(r)
    elif kind == "fabric_swish_big": x = S.fabric_swish(r, True)
    elif kind == "fabric_swish": x = S.fabric_swish(r, False)
    elif kind == "wallet_pat": x = S.wallet_pat(r)
    elif kind == "coin_jingle": x = S.coin_jingle(r)
    elif kind == "whoosh_reveal": x = S.whoosh_reveal(r); t0 -= 0.6
    elif kind == "pebble_whistle": x = S.pebble_whistle(r)
    elif kind == "pebble_clack": x = S.pebble_clack(r)
    elif kind == "freeze_sting": x = S.freeze_tick(r)
    elif kind == "gulp": x = S.gulp(r)
    elif kind == "hawk": x = S.hawk(r)
    elif kind == "vulture_flap": x = S.vulture_flap(r)
    elif kind == "car_arrive": x = S.car_arrive(r); p = -0.6
    elif kind == "brake_squeak": x = S.brake_squeak(r)
    elif kind == "engine_off": x = S.engine_idle_off(r)
    elif kind == "door_open": x = S.door_open(r)
    elif kind == "door_close": x = S.door_close(r)
    elif kind.startswith("tumble_roll"):
        dur = 3.4 if kind.endswith("1") else 3.0
        x = S.tumble_roll(r, dur, 1.4 if kind.endswith("1") else 1.1)
        n = len(x); tt_ = np.linspace(0, 1, n)
        if kind.endswith("1"): pp = -0.9 + 1.8 * tt_; g = np.sin(np.pi * np.clip(tt_ * 1.05, 0, 1)) ** 0.6
        else: pp = 0.1 - 0.15 * tt_; g = np.clip(tt_ / 0.15, 0, 1) * (1 - tt_) ** 1.4
        th = (np.clip(pp, -1, 1) + 1) * np.pi / 4
        stx = np.stack([x * g * np.cos(th), x * g * np.sin(th)]) * np.sqrt(2)
        gain = 10 ** ((db + jitter_db) / 20); place(sfx, stx, t0, gain); place(verb_send, stx, t0, gain * 0.3)
        rows.append([f, f"{t0:.3f}", f"{t0 + n / SR:.3f}", desc, kind, f"{db + jitter_db:.1f}", "moving L->R" if kind.endswith("1") else "C, receding", "0.15 s", "0.6 s", layer])
        continue
    else: continue
    gain = 10 ** ((db + jitter_db) / 20)
    sx = pan(x, p)
    if kind == "hawk": sx = st(lp(x, 2600, 2)) * 0.9; sx = pan(lp(x, 2600, 2), p)
    place(sfx, sx, t0, gain)
    place(verb_send, sx, t0, gain * (0.5 if layer == "BG" else 0.22))
    rows.append([f, f"{t0:.3f}", f"{t0 + len(x) / SR:.3f}", desc, kind, f"{db + jitter_db:.1f}", f"{p:+.2f}", "built-in (≈2-10 ms)", "built-in (≈30-150 ms)", layer])

# open-air reverb with a slap from the bridge face (~55 ms) — subtle
ir = make_ir(0.65, 7, early=[(0.055, 0.6, 0.2), (0.11, 0.3, -0.3)], hf=1.4)
sfx += convolve_st(verb_send, ir) * 0.25

# ---- continuous ambience (never cuts) ----
XF = 1.2 if _A.loop else 0.0  # seconds of tail crossfaded into the head for a seamless loop
def bed(gen, seed):
    x = gen(DUR + XF, rng(seed))
    if XF > 0:  # circular: the extra tail is equal-power crossfaded over the first XF seconds
        k = ns(XF); w = np.sin(np.linspace(0, np.pi / 2, k)) ** 2
        head = x[:, :k] * w + x[:, N:N + k] * (1 - w); x = x[:, :N].copy(); x[:, :k] = head
    return x[:, :N]
if _A.ambience == "desert":
    amb += bed(S.desert_wind, 11) * 10 ** (-25 / 20); amb += bed(S.cicadas, 12) * 10 ** (-8 / 20)
    rows.append([0, "0.000", f"{DUR:.3f}", "desert wind bed with gusts + sand hiss (continuous, loop-safe)" if XF else "desert wind bed with gusts + sand hiss (continuous)", "ambience_wind", "-25.0", "stereo wide", "—" if XF else "0.5 s", "—", "BG"])
    rows.append([0, "0.000", f"{DUR:.3f}", "faint cicadas (continuous)", "ambience_cicadas", "-36.0", "stereo wide", "—", "—", "BG"])
elif _A.ambience == "room":
    from sfx_gen import breeze
    amb += bed(lambda d, r: breeze(d, r, level=0.5, bright=500), 14) * 10 ** (-30 / 20)
    rows.append([0, "0.000", f"{DUR:.3f}", "interior room tone (continuous)", "ambience_room", "-30.0", "stereo", "—", "—", "BG"])
elif _A.ambience == "sea":
    from sfx_gen import water_bed
    amb += bed(lambda d, r: np.stack([water_bed(d, r), water_bed(d, r)]) if np.ndim(water_bed(1.0, r)) == 1 else water_bed(d, r), 15) * 10 ** (-24 / 20)
    rows.append([0, "0.000", f"{DUR:.3f}", "sea / water bed (continuous)", "ambience_sea", "-24.0", "stereo", "—", "—", "BG"])
if _A.music == "desert_guitar":
    mus += bed(S.desert_guitar, 13) * 10 ** (-17 / 20)
    rows.append([0, "0.400", f"{DUR:.3f}", "sparse plucked desert guitar motif (original, Karplus-Strong)", "music", "-17 (pre-duck)", "slight random pan", "—", "—", "BG music"])
if not _A.loop:  # a loop must not fade from silence at the start
    fade = np.clip(np.arange(N) / ns(0.5), 0, 1); amb *= fade; mus *= fade
amb_d, mus_d, sfx_d = amb * duck(-7), mus * duck(-8), sfx * duck(-2)
mix = vo + sfx_d + amb_d + mus_d
pk = np.max(np.abs(mix))
if pk > 0.95:  # protect from clipping without touching the narration level: scale only the non-narration bed
    bed = sfx_d + amb_d + mus_d; mix = vo + bed * min(1.0, (0.95 - np.max(np.abs(vo))) / max(1e-6, np.max(np.abs(bed))))
# master: ONE uniform gain on the finished mix (narration timing/content untouched; its balance vs the bed unchanged)
I0, TP0 = integrated(mix), true_peak(mix)
# gain is set from the NARRATION (keep its peaks <= -1.5 dBFS), then a look-ahead brickwall limiter catches SFX peaks
MASTER_DB = min(-16.0 - I0, -1.5 - true_peak(vo))
master = mix * 10 ** (MASTER_DB / 20)
def limiter(x, ceil_db=-1.0, look=0.003, rel=0.08):
    from scipy.ndimage import maximum_filter1d
    ceil = 10 ** (ceil_db / 20); pk = np.max(np.abs(x), axis=0)
    need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    L = ns(look); need = -maximum_filter1d(-need, size=2 * L + 1)  # min over the look-ahead window
    g = np.empty_like(need); a = np.exp(-1 / (rel * SR)); v = 1.0
    for i in range(len(need)): v = need[i] if need[i] < v else a * v + (1 - a) * need[i]; g[i] = v
    return x * g[None, :]
master = limiter(master, -1.2)
for name, x in [("narration.wav", vo), ("sfx.wav", sfx_d), ("ambience.wav", amb_d), ("music.wav", mus_d), ("mix_premaster.wav", mix), ("mix.wav", master)]:
    write_wav(os.path.join(out, name), x)

with open(os.path.join(out, "cue_sheet.csv"), "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["trigger_frame", "start_s", "end_s", "source / responsible object", "generator", "level_dB", "stereo_pos", "fade_in", "fade_out", "layer"]); w.writerows(rows)
with open(os.path.join(out, "cue_sheet.md"), "w") as fh:
    fh.write(f"# Sound cue sheet (0–{DUR:.2f} s; loop-safe beds: {bool(XF)})\n\nMaster: one uniform gain of {MASTER_DB:+.1f} dB on the finished mix (target −16 LUFS, ≤ −1 dBTP); stems are delivered pre-master.\n\nAll effects are procedurally synthesised in `studio/audio/desert_sfx.py` (no third-party recordings). Levels are pre-ducking; ambience −7 dB, music −8 dB and SFX −2 dB under narration.\n\n")
    fh.write("| frame | start s | end s | source / object | generator | level dB | pan | fade in | fade out | layer |\n|---|---|---|---|---|---|---|---|---|---|\n")
    for rr in sorted(rows, key=lambda z: float(z[1])): fh.write("| " + " | ".join(str(c) for c in rr) + " |\n")
print(f"events placed: {len(rows)}  narration I={integrated(vo):.1f} LUFS | pre-master mix I={I0:.1f} LUFS TP={TP0:.1f} dBTP | master gain {MASTER_DB:+.1f} dB -> I={integrated(master):.1f} LUFS TP={true_peak(master):.1f} dBTP")
