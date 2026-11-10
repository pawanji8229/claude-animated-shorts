# TwistFrame Lab generic event-driven sound design + NARRATION-PRIORITY mix.
# Usage: python mix_events.py <narration.mp3|wav> <events.json> <outdir> [duration_s|full]
#            [--ambience desert|crowd|room|sea|none] [--music desert_guitar|none] [--loop] [--analysis analysis.json]
# Principles (see .claude/skills/voice-to-video/SKILL.md §6):
#  * the narration is the reference: every layer is set RELATIVE to it (event peaks vs narration peak, beds by loudness)
#  * layers duck under speech (smooth attack/release) and come back in pauses
#  * word-level masking guard: in the speech band (300-4000 Hz) every word must stay >= MIN_MARGIN dB above everything
#    else; where it does not, all background layers are pulled down around that word (smooth ramps)
#  * narration is never edited (timing, content, tone); one uniform master gain + true-peak limiter on the finished mix
#  * --loop: beds are circular (tail crossfaded into head); SFX tails past the end wrap onto the start
# Writes stems narration/sfx/crowd/ambience/music + mix.wav, cue_sheet.csv/.md, mix_report.json (measured balance,
# per-word margins, every guard adjustment).
import json, subprocess, os, csv, argparse
import numpy as np
from dsp import SR, ns, rng, pan, st, place, make_ir, convolve_st, write_wav, read_wav, integrated, true_peak, lp, bp
import desert_sfx as S
import crowd_sfx as C
import london_sfx as LS

ap = argparse.ArgumentParser(); ap.add_argument("narration"); ap.add_argument("events"); ap.add_argument("outdir"); ap.add_argument("duration", nargs="?", default="full")
ap.add_argument("--ambience", default="desert"); ap.add_argument("--music", default="desert_guitar"); ap.add_argument("--loop", action="store_true")
ap.add_argument("--analysis", default=None)
ap.add_argument("--ambience-timeline", default=None, help='JSON [[frame, preset], ...] crossfaded at each switch (overrides --ambience)')
A = ap.parse_args()
CFG = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "twistframe.config.json")))["audio"]
MIX = CFG.get("mix", {})
MIN_MARGIN = MIX.get("minWordMarginDb", 15.0)
DUCK = MIX.get("duckDb", {"sfx": -4, "crowd": -8, "ambience": -6, "music": -10})
mp3, evp, out = A.narration, A.events, A.outdir
DUR = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3], capture_output=True, text=True, check=True).stdout.strip()) if A.duration == "full" else float(A.duration)
FPS = 30
os.makedirs(out, exist_ok=True)
N = ns(DUR)
db = lambda x: 10 ** (x / 20)

# ---- narration: decode only (no edits, no gain change); master clock and level reference ----
wav_full = os.path.join(out, "narration_full_48k.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s24le", wav_full], check=True)
vo_full, _ = read_wav(wav_full)
vo = np.zeros((2, N)); m = min(N, vo_full.shape[1]); vo[:, :m] = vo_full[:, :m]
NPK = float(np.max(np.abs(vo))) + 1e-9          # narration sample peak (event levels are relative to it)
NI = integrated(vo)                               # narration loudness (bed levels are relative to it)

# ---- speech envelope for ducking (smooth: 60 ms attack, 600 ms release -> no pumping, backgrounds return in pauses) ----
win = ns(0.02); rms = np.sqrt(np.convolve(vo[0] ** 2, np.ones(win) / win, mode="same"))
mask = (rms > NPK * db(-32)).astype(float)
a1, a2 = np.exp(-1 / (0.06 * SR)), np.exp(-1 / (0.6 * SR)); env = np.zeros(N); v = 0.0
for i in range(N):
    k = a1 if mask[i] > v else a2; v = k * v + (1 - k) * mask[i]; env[i] = v
duck = lambda depth_db: 10 ** (depth_db * env / 20)

# ---- event levels: dB of the event's PEAK relative to the narration peak; stem; description ----
REL = {
    "step_sand": (-14, "sfx", "shoes on sand"), "turn_scuff": (-16, "sfx", "foot reposition on sand"),
    "fabric_swish_big": (-20, "sfx", "suit sleeves sweep"), "fabric_swish": (-25, "sfx", "suit fabric movement"), "cloth_soft": (-31, "sfx", "quiet clothing rustle"),
    "wallet_pat": (-14, "sfx", "hand pats leather wallet"), "coin_jingle": (-22, "sfx", "coins in wallet"),
    "whoosh_reveal": (-18, "sfx", "camera rise / reveal"), "pebble_whistle": (-26, "sfx", "pebble falling (subtle whistle)"),
    "pebble_clack": (-12, "sfx", "pebble hits baked mud"), "freeze_sting": (-21, "sfx", "comic freeze tick"),
    "gulp": (-18, "sfx", "nervous gulp"), "hawk": (-23, "sfx", "distant hawk cry"),
    "tumble_roll_1": (-14, "sfx", "tumbleweed rolling across foreground"), "tumble_roll_2": (-20, "sfx", "tumbleweed rolling away"),
    "vulture_flap": (-24, "sfx", "vulture wing shuffle"),
    "car_arrive": (-6, "sfx", "1960s convertible V8 approaching, decelerating"), "brake_squeak": (-18, "sfx", "brakes squeak"),
    "engine_off": (-15, "sfx", "ignition off + cooling ticks"), "door_open": (-16, "sfx", "car door latch + hinge"), "door_close": (-12, "sfx", "car door shuts"),
    "shutter": (-15, "sfx", "SLR shutter (mirror slap + curtain)"), "film_advance": (-25, "sfx", "thumb winds on the film"),
    "flash_pop": (-23, "sfx", "flashcube / flash gun pop"), "boat_pass": (-18, "sfx", "small motor boat passing (Doppler)"),
    "step_stone": (-15, "sfx", "shoes on stone paving"), "paper_unroll": (-20, "sfx", "blueprint unrolls"), "paper_rustle": (-24, "sfx", "paper rustle"),
    "yawn": (-18, "sfx", "Hal's yawn (synthesised voice, wordless)"), "idea_ding": (-20, "sfx", "soft idea bell"), "pen_scratch": (-24, "sfx", "pen on cheque"),
    "stamp_thunk": (-12, "sfx", "rubber stamp thunk"), "crate_slide": (-18, "sfx", "wooden crate slides"), "register_ring": (-22, "sfx", "cash-register ding (synth)"),
    "bell_chime": (-24, "sfx", "distant city clock bell (original)"), "gull": (-25, "sfx", "gull cry"), "chalk_scratch": (-24, "sfx", "chalk on granite"),
    "hammer_hit": (-17, "sfx", "hammer strike"), "ratchet": (-24, "sfx", "wrench ratchet"), "shovel_dig": (-18, "sfx", "shovel bites soil"),
    "crane_winch": (-22, "sfx", "crane winch motor"), "chain_rattle": (-20, "sfx", "lifting chain"), "stone_thud": (-15, "sfx", "granite block set down"),
    "ship_horn": (-17, "sfx", "cargo ship horn"), "ship_engine": (-22, "sfx", "ship diesel thump"), "bow_splash": (-22, "sfx", "bow splash"),
    "lock_gate": (-22, "sfx", "lock gate motors + clunk"), "water_rush": (-20, "sfx", "rushing water"), "splash_big": (-17, "sfx", "flood front splash"),
    "truck_pass": (-18, "sfx", "1960s diesel flatbed passing"), "air_brake": (-22, "sfx", "air brake hiss"), "concrete_mixer": (-24, "sfx", "concrete mixer drum"),
    "scaffold_clatter": (-20, "sfx", "scaffold poles clatter"), "excavator": (-18, "sfx", "excavator diesel + hydraulics"), "bucket_scrape": (-19, "sfx", "bucket scrapes the channel bed"),
    "dirt_dump": (-20, "sfx", "soil dumped on the bank"), "wind_gust": (-16, "sfx", "desert dust gust"),
    "clap_soft": (-23, "crowd", "single soft clap"), "cheer": (-27, "crowd", "distant crowd cheer"), "crowd_ooh": (-29, "crowd", "distant crowd 'ooh'"),
}
GEN = {
    "step_sand": lambda r: S.step_sand(r, r.uniform(0.85, 1.1)), "turn_scuff": S.turn_scuff,
    "fabric_swish_big": lambda r: S.fabric_swish(r, True), "fabric_swish": lambda r: S.fabric_swish(r, False), "cloth_soft": C.cloth_soft,
    "wallet_pat": S.wallet_pat, "coin_jingle": S.coin_jingle, "whoosh_reveal": S.whoosh_reveal, "pebble_whistle": S.pebble_whistle,
    "pebble_clack": S.pebble_clack, "freeze_sting": S.freeze_tick, "gulp": S.gulp, "hawk": lambda r: lp(S.hawk(r), 2600, 2), "vulture_flap": S.vulture_flap,
    "car_arrive": S.car_arrive, "brake_squeak": S.brake_squeak, "engine_off": S.engine_idle_off, "door_open": S.door_open, "door_close": S.door_close,
    "shutter": lambda r: C.shutter(r, advance=False), "film_advance": C.film_advance, "flash_pop": C.flash_pop, "boat_pass": C.boat_pass,
    **{k: getattr(LS, k) for k in ["step_stone", "paper_unroll", "paper_rustle", "yawn", "idea_ding", "pen_scratch", "stamp_thunk", "crate_slide", "register_ring", "bell_chime",
        "gull", "chalk_scratch", "hammer_hit", "ratchet", "shovel_dig", "crane_winch", "chain_rattle", "stone_thud", "ship_horn", "ship_engine", "bow_splash", "lock_gate",
        "water_rush", "splash_big", "truck_pass", "air_brake", "concrete_mixer", "scaffold_clatter", "excavator", "bucket_scrape", "dirt_dump", "wind_gust"]},
    "clap_soft": C.clap_soft, "cheer": lambda r: C.cheer(r, people=8), "crowd_ooh": C.crowd_ooh,
}
OFFSET = {"whoosh_reveal": -0.6, "boat_pass": -2.0, "truck_pass": -1.5, "wind_gust": -0.8}   # generator pre-rolls (s) so the peak lands on the event frame
FIXED_PAN = {"car_arrive": -0.6}

ev = json.load(open(evp))["events"]
TAILPAD = ns(8.0)
stems = {k: np.zeros((2, N + TAILPAD)) for k in ("sfx", "crowd")}; verb = np.zeros((2, N + TAILPAD))
rows, skipped = [], {}
for k, e in enumerate(ev):
    f, kind = e["frame"], e["kind"]; t0 = f / FPS + OFFSET.get(kind, 0.0)
    if f / FPS >= DUR: continue
    r = rng(1000 + k * 7 + f)
    if kind.startswith("tumble_roll"):
        one = kind.endswith("1"); x = S.tumble_roll(r, 3.4 if one else 3.0, 1.4 if one else 1.1); n = len(x); u = np.linspace(0, 1, n)
        pp = -0.9 + 1.8 * u if one else 0.1 - 0.15 * u; g = np.sin(np.pi * np.clip(u * 1.05, 0, 1)) ** 0.6 if one else np.clip(u / 0.15, 0, 1) * (1 - u) ** 1.4
        th = (np.clip(pp, -1, 1) + 1) * np.pi / 4; x = np.stack([x * g * np.cos(th), x * g * np.sin(th)]) * np.sqrt(2); p_desc = "moving"
    elif kind in GEN:
        x = GEN[kind](r); p = float(FIXED_PAN.get(kind, e.get("x", 0.0))); x = x if np.ndim(x) == 2 else pan(x, p); p_desc = f"{p:+.2f}"
    else:
        skipped[kind] = skipped.get(kind, 0) + 1; continue
    rel, stem, desc = REL.get(kind, (-24, "sfx", kind))
    rel += float(r.uniform(-1.5, 1.5)) + 20 * np.log10(float(np.clip(e.get("gain", 1.0), 0.05, 1.0)))  # seeded per-instance variation
    gain = NPK * db(rel) / (float(np.max(np.abs(x))) + 1e-9)       # event peak sits `rel` dB under the narration peak
    if t0 < 0 and A.loop: t0 += DUR
    place(stems[stem], x, t0, gain); place(verb, x, t0, gain * 0.2)
    rows.append([f, f"{t0:.3f}", f"{t0 + x.shape[-1] / SR:.3f}", e.get("note") or desc, kind, stem, f"{rel:+.1f} dB re narration peak", p_desc])
ir = make_ir(0.65, 7, early=[(0.055, 0.6, 0.2), (0.11, 0.3, -0.3)], hf=1.4)
stems["sfx"] += convolve_st(verb, ir)[:, :N + TAILPAD] * 0.2
for k in stems:
    if A.loop: kk = min(TAILPAD, N); stems[k][:, :kk] += stems[k][:, N:N + kk]
    stems[k] = stems[k][:, :N]

# ---- continuous beds: loudness set RELATIVE to the narration (LU), loop-safe ----
XF = 1.2 if A.loop else 0.0
def bed(gen, seed, rel_lu):
    x = gen(DUR + XF, rng(seed))
    if XF > 0:
        k = ns(XF); w = np.sin(np.linspace(0, np.pi / 2, k)) ** 2
        head = x[:, :k] * w + x[:, N:N + k] * (1 - w); x = x[:, :N].copy(); x[:, :k] = head
    x = x[:, :N]; return x * db(NI + rel_lu - integrated(x))
amb = np.zeros((2, N)); mus = np.zeros((2, N))
def bedrow(desc, gen, rel): rows.append([0, "0.000", f"{DUR:.3f}", desc + (" (continuous, loop-safe)" if XF else " (continuous)"), gen, "bed", f"{rel:+.0f} LU re narration", "stereo wide"])
def amb_preset(name):
    """returns (ambience stereo, crowd stereo) beds for one preset over the whole duration"""
    a = np.zeros((2, N)); cr = np.zeros((2, N))
    if name == "desert": a += bed(S.desert_wind, 11, -23) + bed(S.cicadas, 12, -31)
    elif name == "crowd": cr += bed(C.crowd_murmur, 16, -28); a += bed(C.river_bed, 17, -25) + bed(S.desert_wind, 11, -30)
    elif name == "london": a += bed(LS.london_bed, 18, -24)
    elif name == "sea": a += bed(LS.sea_bed, 19, -22)
    elif name == "room":
        from sfx_gen import breeze; a += bed(lambda d, r: st(breeze(d, r, level=0.5, bright=500)), 14, -26)
    return a, cr
if A.ambience_timeline:
    TL = json.loads(A.ambience_timeline); XFS = ns(0.5)
    cache = {}
    for i, (fr, name) in enumerate(TL):
        if name not in cache: cache[name] = amb_preset(name)
        a0 = ns(fr / FPS); a1 = ns(TL[i + 1][0] / FPS) if i + 1 < len(TL) else N
        w = np.zeros(N); w[max(0, a0 - XFS):min(N, a1 + XFS)] = 1.0
        if i > 0: w[max(0, a0 - XFS):min(N, a0 + XFS)] = np.sin(np.linspace(0, np.pi / 2, min(N, a0 + XFS) - max(0, a0 - XFS))) ** 2
        if i + 1 < len(TL): w[max(0, a1 - XFS):min(N, a1 + XFS)] = np.cos(np.linspace(0, np.pi / 2, min(N, a1 + XFS) - max(0, a1 - XFS))) ** 2
        amb += cache[name][0] * w[None, :]; stems["crowd"] += cache[name][1] * w[None, :]
        rows.append([fr, f"{fr / FPS:.3f}", f"{(TL[i + 1][0] / FPS if i + 1 < len(TL) else DUR):.3f}", f"ambience segment: {name} (0.5 s equal-power crossfades)", f"ambience_{name}", "bed", "see preset", "stereo wide"])
elif A.ambience == "desert":
    amb += bed(S.desert_wind, 11, -23); amb += bed(S.cicadas, 12, -31); bedrow("desert wind + sand hiss", "desert_wind", -23); bedrow("faint cicadas", "cicadas", -31)
elif A.ambience == "crowd":
    stems["crowd"] += bed(C.crowd_murmur, 16, -28); amb += bed(C.river_bed, 17, -25); amb += bed(S.desert_wind, 11, -30)
    bedrow("gentle distant crowd murmur (no shouting)", "crowd_murmur", -28); bedrow("river lapping under the bridge", "river_bed", -25); bedrow("light desert wind", "desert_wind", -30)
elif A.ambience == "room":
    from sfx_gen import breeze
    amb += bed(lambda d, r: st(breeze(d, r, level=0.5, bright=500)), 14, -26); bedrow("interior room tone", "room_tone", -26)
elif A.ambience == "sea":
    amb += bed(C.river_bed, 15, -21); bedrow("sea / water bed", "water_bed", -21)
if A.music == "desert_guitar":
    mus += bed(S.desert_guitar, 13, -21); bedrow("sparse plucked desert guitar motif (original)", "music", -21)
if not A.loop:
    fade = np.clip(np.arange(N) / ns(0.5), 0, 1); amb *= fade; mus *= fade; stems["crowd"] *= fade

# ---- ducking under speech ----
L = {"sfx": stems["sfx"] * duck(DUCK["sfx"]), "crowd": stems["crowd"] * duck(DUCK["crowd"]), "ambience": amb * duck(DUCK["ambience"]), "music": mus * duck(DUCK["music"])}

# ---- word-level masking guard (speech band) ----
words = []
anp = A.analysis or os.path.join(os.path.dirname(os.path.abspath(evp)), "analysis", "analysis.json")
if os.path.exists(anp):
    for ph in json.load(open(anp)).get("phrases", []):
        for w in ph.get("asr_words", []): words.append((w["word"], float(w["t0"]), float(w["t1"])))
def band(x): return bp(x.mean(0), 300, 4000, 2)
vb = band(vo)
def margins(beds):
    bb = band(sum(beds.values())); res = []
    for w, t0, t1 in words:
        a, b = ns(max(0, t0 - 0.03)), ns(min(DUR, t1 + 0.03))
        if b <= a: continue
        en, eb = np.mean(vb[a:b] ** 2), np.mean(bb[a:b] ** 2) + 1e-12; res.append((w, t0, t1, 10 * np.log10(en / eb + 1e-12)))
    return res
before = margins(L); adjustments = []
for it in range(3):
    ms = margins(L); att = np.zeros(N)
    for w, t0, t1, mg in ms:
        if mg < MIN_MARGIN:
            need = MIN_MARGIN - mg + 1.0; a, b = ns(max(0, t0 - 0.08)), ns(min(DUR, t1 + 0.08)); att[a:b] = np.maximum(att[a:b], need)
            adjustments.append({"pass": it + 1, "word": w, "t0": t0, "t1": t1, "margin_db": round(mg, 1), "cut_db": round(need, 1)})
    if not att.any(): break
    hw = np.hanning(ns(0.12)); hw /= hw.sum(); att = np.maximum(att, np.convolve(att, hw, "same"))   # smooth ramps, never less than needed
    g = 10 ** (-att / 20)
    for k in L: L[k] = L[k] * g[None, :]
after = margins(L)

bedsum = sum(L.values()); mix = vo + bedsum
I0 = integrated(mix)
# gain from the loudness target, capped so narration peaks need at most `peakLimitAllowanceDb` of (transparent) limiting
MASTER_DB = min(CFG["targetLufs"] - I0, CFG.get("narrationPeakMaxDb", -1.5) + MIX.get("peakLimitAllowanceDb", 2.0) - true_peak(vo))
master = mix * db(MASTER_DB)
def limiter(x, ceil_db=-1.0, look=0.003, rel=0.08):
    from scipy.ndimage import maximum_filter1d
    ceil = db(ceil_db); pk = np.max(np.abs(x), axis=0); need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    Lk = ns(look); need = -maximum_filter1d(-need, size=2 * Lk + 1); g = np.empty_like(need); a = np.exp(-1 / (rel * SR)); v = 1.0
    for i in range(len(need)): v = need[i] if need[i] < v else a * v + (1 - a) * need[i]; g[i] = v
    return x * g[None, :]
master = limiter(master, CFG.get("ceilingDbtp", -1.2))
for name, x in [("narration.wav", vo), ("sfx.wav", L["sfx"]), ("crowd.wav", L["crowd"]), ("ambience.wav", L["ambience"]), ("music.wav", L["music"]), ("mix_premaster.wav", mix), ("mix.wav", master)]:
    write_wav(os.path.join(out, name), x)

# ---- measured balance report ----
def rel_lu(x): return None if np.max(np.abs(x)) < 1e-7 else round(integrated(x) - NI, 1)
speech = env > 0.5
def speech_ratio(x):  # bed short-term level during speech vs narration (speech band)
    if not speech.any() or np.max(np.abs(x)) < 1e-7: return None
    xb = band(x); return round(10 * np.log10(np.mean(xb[speech] ** 2) / (np.mean(vb[speech] ** 2) + 1e-12) + 1e-12), 1)
rep = {"narration_lufs": round(NI, 1), "master_gain_db": round(MASTER_DB, 1), "final_lufs": round(integrated(master), 1), "final_true_peak_dbtp": round(true_peak(master), 1),
       "stems_lu_re_narration": {k: rel_lu(v) for k, v in L.items()}, "stems_speechband_db_re_narration_during_speech": {k: speech_ratio(v) for k, v in L.items()},
       "min_word_margin_target_db": MIN_MARGIN, "words": len(words),
       "min_word_margin_before_db": round(min([m[3] for m in before]), 1) if before else None, "min_word_margin_after_db": round(min([m[3] for m in after]), 1) if after else None,
       "word_margins_after": [{"word": w, "t0": t0, "margin_db": round(mg, 1)} for w, t0, t1, mg in after], "guard_adjustments": adjustments,
       "events_placed": len(rows), "skipped_unknown_kinds": skipped, "ducking_db": DUCK}
json.dump(rep, open(os.path.join(out, "mix_report.json"), "w"), indent=1)

with open(os.path.join(out, "cue_sheet.csv"), "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["trigger_frame", "start_s", "end_s", "source / responsible object", "generator", "stem", "level", "pan"]); w.writerows(rows)
with open(os.path.join(out, "cue_sheet.md"), "w") as fh:
    fh.write(f"# Sound cue sheet (0–{DUR:.2f} s; loop-safe: {bool(XF)})\n\n")
    fh.write(f"Narration-priority mix. Narration {NI:.1f} LUFS is the reference; event levels are peak dB under the narration peak, beds are LU under the narration loudness. "
             f"Ducking under speech: {DUCK}. Word masking guard: every word ≥ {MIN_MARGIN:.0f} dB above all other layers in the 300–4000 Hz speech band "
             f"(worst word before guard {rep['min_word_margin_before_db']} dB, after {rep['min_word_margin_after_db']} dB; {len(adjustments)} guard cuts). "
             f"Master {MASTER_DB:+.1f} dB → {rep['final_lufs']} LUFS, {rep['final_true_peak_dbtp']} dBTP.\n\n")
    fh.write(f"Measured stem loudness vs narration (LU): {rep['stems_lu_re_narration']}\n\nAll effects are procedurally synthesised in `studio/audio/` (no third-party recordings).\n\n")
    fh.write("| frame | start s | end s | source / object | generator | stem | level | pan |\n|---|---|---|---|---|---|---|---|\n")
    for rr in sorted(rows, key=lambda z: float(z[1])): fh.write("| " + " | ".join(str(c) for c in rr) + " |\n")
print(f"events placed: {len(rows)} (skipped unknown kinds: {skipped}) | narration {NI:.1f} LUFS | stems LU re narration {rep['stems_lu_re_narration']} | "
      f"worst word margin {rep['min_word_margin_before_db']} -> {rep['min_word_margin_after_db']} dB ({len(adjustments)} guard cuts) | master {MASTER_DB:+.1f} dB -> {rep['final_lufs']} LUFS {rep['final_true_peak_dbtp']} dBTP")
