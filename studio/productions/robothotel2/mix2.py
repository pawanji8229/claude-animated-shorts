# ROBOT HOTEL (reference style) soundtrack: punchy, continuous, loud (about -14 LUFS, low LRA), like the reference
# Shorts. Every cue is tied to an on-screen event or a cut in src/productions/robothotel2/Film2.tsx (frame numbers
# below). Layers:
#   narration  untouched (one uniform gain, transparent peak limiting only)
#   music      ORIGINAL, synthesised here: bouncy marimba / pizzicato-bass / light drums groove in C major, a bumbling
#              minor variation once "the problems started", a music-box lullaby in the bedroom, a stinger on the
#              wake-up, and a resolved outro; sidechain-ducked under the voice
#   sfx        whooshes on every whip pan and dissolve, robot servo/beeps, power-downs + metal clatter, the raptor
#              roar (synthesised), cartoon boings, alarm, sparks, snores (synthesised), page flips, bonks...
#              sources: Kenney CC0 packs (sci-fi, interface, digital, impact, rpg) and Mixkit (free licence, raw
#              files never committed) + synthesised cues (described as synthesised, not recordings)
#   ambience   exterior suburb + birds, lobby murmur + room tone, corridor tone, night room tone
# usage: .venv/bin/python studio/productions/robothotel2/mix2.py
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "studio", "audio"))
from dsp import SR, ns, tt, dbg, rng, lp, hp, bp, place, pan, st, integrated, true_peak, read_wav, write_wav, shelf, peq  # noqa: E402

FPS = 30
FRAMES = 1679
DUR = FRAMES / FPS
N = ns(DUR)
OUT = os.path.join(HERE, "audio")
os.makedirs(OUT, exist_ok=True)
CACHE = os.path.join(ROOT, "asset-library", "cache")
KEN = os.path.join(CACHE, "kenney")
fr = lambda f: f / FPS  # noqa: E731


# ---------------------------------------------------------------- sample loading (decoded with ffmpeg, cached)
_lib = {}


def load(path):
    if path in _lib:
        return _lib[path]
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True)
    x = np.frombuffer(p.stdout, "<f4").astype(np.float64).reshape(-1, 2).T.copy()
    pk = np.max(np.abs(x)) or 1.0
    _lib[path] = x / pk  # peak-normalised: every cue level below is in dBFS of its peak
    return _lib[path]


def ken(pack, name):
    return load(os.path.join(KEN, pack, "files", "Audio", name))


def mix(mid):
    return load(os.path.join(CACHE, "mixkit", str(mid), f"{mid}.wav"))


def seg(x, t0, dur, fin=0.01, fout=0.05):
    a, b = ns(t0), min(x.shape[1], ns(t0 + dur))
    y = x[:, a:b].copy()
    n = y.shape[1]
    e = np.ones(n)
    k = min(n, ns(fin)); e[:k] = np.linspace(0, 1, k)
    k = min(n, ns(fout)); e[n - k:] *= np.linspace(1, 0, k)
    return y * e


def pitch(x, ratio):
    """resample (varispeed) by ratio > 1 = higher + shorter"""
    n = x.shape[1]
    m = int(n / ratio)
    idx = np.arange(m) * ratio
    return np.stack([np.interp(idx, np.arange(n), ch) for ch in x])


def peak_t(x):
    e = np.abs(x).sum(0)
    return int(np.argmax(e)) / SR


# ---------------------------------------------------------------- synthesised cues
def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


def roar(dur=1.25, seed=3):
    """synthesised dinosaur roar: a rough low glottal saw (jittered, falling pitch) through vocal-tract formants plus
    breathy filtered noise, with a fast growl tremolo"""
    r = rng(seed); t = tt(dur); n = len(t)
    f0 = 95 - 35 * (t / dur) + 6 * np.sin(2 * np.pi * 5.3 * t) + 4 * np.cumsum(r.normal(0, 1, n)) / np.sqrt(n) * 3
    ph = np.cumsum(f0) / SR
    saw = 2 * (ph % 1) - 1
    noise = r.normal(0, 1, n)
    src = 0.7 * saw + 0.5 * lp(noise, 2500)
    form = bp(src, 180, 420) * 1.0 + bp(src, 550, 1100) * 0.9 + bp(src, 1500, 2600) * 0.45 + bp(noise, 2500, 6000) * 0.12
    growl = 0.65 + 0.35 * np.sin(2 * np.pi * 31 * t + 0.7 * np.sin(2 * np.pi * 3 * t))
    e = np.minimum(1, t / 0.12) * np.clip((dur - t) / 0.45, 0, 1) ** 1.5
    y = np.tanh(2.2 * form * growl * e)
    y = lp(y, 5000) + 0.6 * lp(np.tanh(3 * saw * e), 160)  # chest
    return pan(y / np.max(np.abs(y)), -0.15)


def boing(dur=0.55, f0=260, seed=1):
    t = tt(dur)
    f = f0 * (1 + 0.45 * np.exp(-t / 0.08) * np.sin(2 * np.pi * 14 * t)) * (1 + 0.6 * np.exp(-t / 0.05))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.004, 0.18)
    return st(y)


def pop(dur=0.12, f0=600):
    t = tt(dur); f = f0 * np.exp(-t / 0.03) + 180
    return st(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), 0.002, 0.03))


def snore(dur=0.85, seed=2):
    r = rng(seed); t = tt(dur); n = len(t)
    rattle = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 28 * t + 0.4 * np.sin(2 * np.pi * 3 * t)))
    y = bp(r.normal(0, 1, n), 110, 700) * (0.35 + 0.65 * rattle)
    y = y + 0.5 * bp(np.sin(2 * np.pi * np.cumsum(70 + 10 * t) / SR) * rattle, 60, 400)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.4
    y = y * e
    return st(y / np.max(np.abs(y)))


def scratch(dur=0.45):
    """synthesised record scratch: noisy band sweeping up then down fast"""
    r = rng(9); t = tt(dur); n = len(t)
    fc = 400 + 2600 * np.abs(np.sin(np.pi * t / dur * 1.5))
    x = r.normal(0, 1, n)
    y = np.zeros(n); blk = 480
    for i in range(0, n, blk):
        c = fc[i]
        y[i:i + blk] = bp(x[i:i + blk + 2048], c * 0.7, c * 1.3)[:len(y[i:i + blk])]
    return st(y * env_ad(n, 0.01, 0.2) / np.max(np.abs(y)))


def beepvox(notes, step=0.09, wave_="sq"):
    """robot 'talk': a quick run of square-wave beeps (synthesised)"""
    out = np.zeros(ns(step * len(notes) + 0.1))
    for i, f in enumerate(notes):
        t = tt(step * 0.85)
        w = np.sign(np.sin(2 * np.pi * f * t)) if wave_ == "sq" else np.sin(2 * np.pi * f * t)
        y = lp(w, 3500) * env_ad(len(t), 0.004, step * 0.5)
        a = ns(i * step); out[a:a + len(y)] += y
    return st(out / np.max(np.abs(out)))


def hover(dur, f0=95, seed=4):
    """floating robot's hover hum (synthesised): a soft electric whine + air"""
    r = rng(seed); t = tt(dur); n = len(t)
    y = 0.6 * np.sin(2 * np.pi * f0 * t) + 0.25 * np.sin(2 * np.pi * f0 * 2.02 * t) + 0.1 * np.sin(2 * np.pi * f0 * 7.9 * t)
    y += 0.25 * bp(r.normal(0, 1, n), 800, 3000)
    e = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.2)
    return st(y * e / 1.2)


def rumble_roll(dur, seed=5):
    r = rng(seed); t = tt(dur); n = len(t)
    y = lp(r.normal(0, 1, n), 300) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t)) + 0.2 * bp(r.normal(0, 1, n), 2000, 5000) * (r.random(n) > 0.995)
    e = np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.4)
    return st(y * e / np.max(np.abs(y)))


def roomtone(dur, seed, lo=60, hi=900, hum=0.0):
    r = rng(seed); t = tt(dur); n = len(t)
    y = bp(r.normal(0, 1, n), lo, hi) + hum * np.sin(2 * np.pi * 60 * t)
    return np.stack([y, np.roll(y, 1337)]) / np.max(np.abs(y))


# ---------------------------------------------------------------- music (original composition, synthesised)
BPM = 120.0
BEAT = 60 / BPM
NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name, octv):
    return 440.0 * 2 ** ((NOTE[name] + 12 * (octv + 1) - 69) / 12)


def marimba(f, dur=0.5, amp=1.0):
    t = tt(dur)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.28) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.05) + 0.08 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / 0.015)
    return amp * y * np.minimum(1, t / 0.002)


def musicbox(f, dur=1.2, amp=1.0):
    t = tt(dur)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.6) + 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.3) + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.08)
    return amp * y * np.minimum(1, t / 0.002)


def pluckbass(f, dur=0.35, amp=1.0):
    t = tt(dur); ph = (f * t) % 1
    y = lp(2 * ph - 1, 900) * np.exp(-t / 0.12) + 0.6 * np.sin(2 * np.pi * f * t) * np.exp(-t / 0.2)
    return amp * y * np.minimum(1, t / 0.003)


def tuba(f, dur=0.3, amp=1.0):
    t = tt(dur); ph = (f * t) % 1
    y = lp(2 * ph - 1, 500) * np.minimum(1, t / 0.02) * np.exp(-t / 0.18)
    return amp * np.tanh(2 * y)


def kick(amp=1.0):
    t = tt(0.3); f = 45 + 90 * np.exp(-t / 0.035)
    return amp * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12)


def snare(r, amp=1.0):
    t = tt(0.2)
    return amp * (0.7 * bp(r.normal(0, 1, len(t)), 1500, 7000) * np.exp(-t / 0.06) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04))


def hat(r, amp=1.0):
    t = tt(0.05)
    return amp * hp(r.normal(0, 1, len(t)), 7000) * np.exp(-t / 0.012)


def clap_(r, amp=1.0):
    t = tt(0.15); n = len(t)
    e = np.exp(-t / 0.05) * (1 + 0.8 * ((t % 0.011) < 0.004) * (t < 0.035))
    return amp * bp(r.normal(0, 1, n), 900, 4000) * e


CH_MAJ = [("C", ["C", "E", "G"]), ("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("G", ["G", "B", "D"])]
CH_MIN = [("A", ["A", "C", "E"]), ("F", ["F", "A", "C"]), ("D", ["D", "F", "A"]), ("E", ["E", "G#", "B"])]
# 2-bar marimba motif (8th-note grid, 16 steps): index into chord tones (+3 = octave up), None = rest
MOTIF = [0, None, 1, 2, None, 3, 2, None, 1, None, 0, 1, 2, None, 4, None]
MOTIF_B = [3, 2, None, 1, 0, None, 1, None, 2, 3, None, 4, 3, None, None, None]


def tone_of(ch, idx, base_oct=5):
    tones = ch[1]
    o, i = divmod(idx, 3)
    nm = tones[i]
    # keep the chord voicing ascending
    root_i = NOTE[ch[1][0]]
    oc = base_oct + o + (1 if NOTE[nm] < root_i else 0)
    return hz(nm, oc)


def groove(buf, t0, t1, chords, seed, style="bright", gain=1.0):
    """fill [t0, t1) of the stereo bus with the groove; one chord per bar (4 beats)"""
    r = rng(seed)
    bar = 4 * BEAT
    nb = int(np.ceil((t1 - t0) / bar))
    for b in range(nb):
        tb = t0 + b * bar
        ch = chords[b % len(chords)]
        motif = MOTIF if (b // 2) % 2 == 0 else MOTIF_B
        half = b % 2
        for s in range(8):
            ts = tb + s * BEAT / 2
            if ts >= t1:
                break
            idx = motif[half * 8 + s]
            if idx is not None:
                f = tone_of(ch, idx, 5 if style != "lullaby" else 6)
                note = musicbox(f, 1.0, 0.5) if style == "lullaby" else marimba(f, 0.6, 0.55 if s % 2 == 0 else 0.42)
                place(buf, pan(note, 0.25 if s % 2 else -0.15), ts, gain)
        root = hz(ch[0], 2)
        if style == "bright":
            for k, (bt, f) in enumerate([(0, root), (1.5, root), (2, root * 1.5), (3, root * 2 if b % 2 else root * 1.5)]):
                place(buf, pluckbass(f, 0.3, 0.9), tb + bt * BEAT, gain)
            for k in range(4):
                if tb + k * BEAT >= t1:
                    break
                if k in (0, 2):
                    place(buf, kick(0.8), tb + k * BEAT, gain)
                else:
                    place(buf, pan(clap_(r, 0.45), 0.1), tb + k * BEAT, gain)
                for hh in (0, 0.5):
                    place(buf, pan(hat(r, 0.16 if hh else 0.1), 0.35), tb + (k + hh) * BEAT, gain)
        elif style == "bumble":  # comic 'problems' variation: staccato tuba on the beat, off-beat snare ticks
            for k in range(4):
                tk = tb + k * BEAT
                if tk >= t1:
                    break
                f = root if k % 2 == 0 else root * (1.5 if k == 1 else 1.335)
                place(buf, tuba(f, 0.22, 0.9), tk, gain)
                if k % 2:
                    place(buf, pan(snare(r, 0.35), 0.1), tk, gain)
                place(buf, kick(0.55), tk, gain) if k == 0 else None
                place(buf, pan(hat(r, 0.12), 0.35), tk + BEAT / 2, gain)
        elif style == "lullaby":
            place(buf, pan(musicbox(root * 2, 2.0, 0.35), -0.3), tb, gain)


def stinger(amp=1.0):
    """orchestral-ish hit (synthesised): low boom + bright chord stab"""
    t = tt(1.4)
    y = kick(1.0)
    y = np.pad(y, (0, len(t) - len(y)))
    for f in (hz("C", 4), hz("E", 4), hz("G", 4), hz("C", 5)):
        ph = (f * t) % 1
        y += 0.25 * lp(2 * ph - 1, 3000) * np.exp(-t / 0.35)
    return st(amp * y / np.max(np.abs(y)))


# ---------------------------------------------------------------- the score (times in film frames)
SHOT_A = [0, 42, 82, 140, 182, 222, 268, 330, 384, 476, 520, 566, 612, 702, 762, 846, 932, 1004, 1104, 1200, 1226, 1334, 1424, 1508, 1560, 1646]
WHIPS = [82, 268, 476, 612, 846, 1226, 1508]      # shot starts entered with a whip pan (prev.out == whip)
DISSOLVES = [932, 1646]                           # shot starts entered with a dissolve
CUTS = [a for a in SHOT_A[1:] if a not in WHIPS + DISSOLVES]

music = np.zeros((2, N))
groove(music, 0, fr(702), CH_MAJ, 11, "bright")
groove(music, fr(712), fr(932), CH_MIN, 12, "bumble")
groove(music, fr(932), fr(1104), [("C", ["C", "E", "G"]), ("A", ["A", "C", "E"])], 13, "lullaby", 0.8)
groove(music, fr(1226), fr(1560), CH_MIN, 14, "bumble")
groove(music, fr(1560), DUR + 2, CH_MAJ, 15, "bright")
place(music, stinger(0.9), fr(1104))
place(music, stinger(0.7), fr(702))
music = lp(music, 9000)

sfx = np.zeros((2, N))
cues = []


def cue(name, x, f, db, p=0.0, align_peak=False):
    """place sample x at film frame f (peak-aligned if asked), level in dBFS-of-peak"""
    t = fr(f) - (peak_t(x) if align_peak else 0)
    if x.shape[0] == 2 and p:
        x = x * np.array([[np.sqrt(1 - p) if p > 0 else 1], [np.sqrt(1 + p) if p < 0 else 1]])
    place(sfx, x, t, dbg(db))
    cues.append({"frame": f, "time": round(fr(f), 3), "cue": name, "db": db})


# transitions: whoosh peaks on the cut
woosh = [mix(1489), mix(1474), mix(1482)]
for i, f in enumerate(WHIPS):
    cue("whip whoosh", woosh[i % 3], f, -10, align_peak=True)
for f in DISSOLVES:
    cue("dissolve swoosh", seg(mix(163), 0, 3.0, 0.3, 0.8), f - 30, -16)
for f in CUTS:
    cue("cut accent", pitch(ken("impact-sounds", "impactSoft_medium_001.ogg"), 1.2), f, -24)

# 1-2 exterior: hero arrives, robots welcome (servo + beeps), wave
for k, f in enumerate(range(4, 42, 9)):
    cue("step pavement", ken("impact-sounds", f"footstep_concrete_00{k % 5}.ogg"), f, -24)
cue("welcome chime", ken("interface-sounds", "confirmation_002.ogg"), 46, -14)
cue("robot beeps", beepvox([880, 1175, 988, 1319]), 52, -18, 0.3)
cue("servo whirr", ken("sci-fi-sounds", "computerNoise_001.ogg"), 60, -20, -0.3)
# 3 workforce topples: power-down then metal clatter
for k, tf in enumerate([92, 104, 116, 128]):
    cue("power down", ken("digital-audio", ["phaserDown1.ogg", "phaserDown2.ogg", "phaserDown3.ogg", "lowDown.ogg"][k]), tf, -14)
    cue("robot falls (metal)", ken("impact-sounds", f"impactMetal_heavy_00{k}.ogg"), tf + 9, -8)
    cue("clatter", ken("impact-sounds", f"impactPlate_heavy_00{k}.ogg"), tf + 11, -16)
# 4 walk to reception
for k, f in enumerate(range(146, 182, 9)):
    cue("step wood", ken("impact-sounds", f"footstep_wood_00{k % 5}.ogg"), f, -20)
cue("desk bell", ken("impact-sounds", "impactBell_heavy_002.ogg"), 172, -18)
# 5 ROAR
cue("raptor roar (synth)", roar(), 188, -3)
cue("roar sub hit", st(kick(1.0)), 188, -8)
# 6 double take
cue("cartoon boing", boing(0.5, 240), 224, -10)
cue("eye pop", pop(), 240, -12)
cue("pop", pop(0.1, 900), 244, -14)
# 7 lobby reveal: shimmer + hover
cue("reveal shimmer", ken("digital-audio", "powerUp2.ogg"), 272, -16)
cue("hover pass", hover(1.8, 110), 280, -20, 0.4)
# 8 kiosk glows
cue("kiosk chime", ken("interface-sounds", "maximize_006.ogg"), 336, -14)
cue("kiosk beeps", beepvox([1319, 1568, 1760]), 352, -18)
# 9 bored employee, porter zips past
cue("zip past (hover)", hover(1.2, 140, 7), 415, -12, 0.2)
cue("zip whoosh", woosh[0], 430, -18, align_peak=True)
cue("coffee sip", ken("rpg-audio", "cloth2.ogg"), 445, -24)
# 10 key card + sniff
cue("card slide", ken("rpg-audio", "handleSmallLeather.ogg"), 488, -14)
cue("card tap", ken("interface-sounds", "click_003.ogg"), 506, -14)
cue("raptor snort (synth)", pitch(snore(0.4, 8), 1.6), 494, -16)
# 11 porter carries suitcase
cue("hover hum", hover(1.55, 90), 520, -18)
cue("suitcase rattle", ken("rpg-audio", "beltHandle2.ogg"), 534, -20)
# 12 kiosk greets hero
cue("hello beeps", beepvox([988, 1319, 1175, 1568, 1319], 0.08), 572, -14)
# 13 delight sparkle
cue("sparkle jingle", ken("music-jingles", "Pizzicato jingles/jingles_PIZZI04.ogg"), 616, -16)
cue("magic shimmer", ken("digital-audio", "powerUp7.ogg"), 640, -18)
# 14 problems: record scratch, alarm, suitcase drop
cue("record scratch (synth)", scratch(), 700, -6)
for k in range(5):
    cue("alarm whoop", ken("digital-audio", "phaserUp3.ogg"), 706 + 11 * k, -16)
cue("glitch", ken("interface-sounds", "glitch_002.ogg"), 708, -12)
cue("suitcase drop", ken("impact-sounds", "impactPlate_heavy_002.ogg"), 719, -6)
cue("suitcase thud", ken("impact-sounds", "impactSoft_heavy_001.ogg"), 719, -8)
# 15 kiosk can't answer
cue("question", ken("interface-sounds", "question_002.ogg"), 772, -16)
for k in range(4):
    cue("processing tick", ken("interface-sounds", "tick_002.ogg"), 790 + 6 * k, -20)
cue("error buzz", ken("interface-sounds", "error_006.ogg"), 818, -10)
# 16 corridor: hover, bonk bonk, panic run
cue("hover (corridor)", hover(1.2, 100), 846, -18, 0.3)
cue("bonk", ken("impact-sounds", "impactMetal_medium_000.ogg"), 880, -8)
cue("bonk boing", boing(0.35, 330), 881, -14)
cue("bonk 2", ken("impact-sounds", "impactMetal_medium_003.ogg"), 892, -10)
for k, f in enumerate(range(850, 930, 7)):
    cue("panic steps", ken("impact-sounds", f"footstep_carpet_00{k % 5}.ogg"), f, -18)
# 17-18 night: snores, the bot 'answers' each snore
for c in range(4):
    f0 = 960 + 60 * c if c == 0 else 1004 + 60 * (c - 1) + 27
    cue("snore (synth)", snore(0.75, 20 + c), f0, -10)
for c in range(2):
    cue("bot listens", ken("interface-sounds", "toggle_002.ogg"), 1004 + 60 * c + 34, -16)
    cue("bot chirp", beepvox([1568, 1760], 0.07), 1004 + 60 * c + 40, -18)
# 19 full blast wake-up
cue("robot BLAST beeps", beepvox([1319, 1568, 1976, 1568, 2093, 1760], 0.07), 1105, -4)
cue("robot power up", ken("digital-audio", "powerUp10.ogg"), 1106, -8)
cue("jolt boing", boing(0.6, 200), 1114, -6)
cue("bed springs", ken("rpg-audio", "creak2.ogg"), 1116, -12)
# 20 oops
cue("innocent blink", ken("interface-sounds", "pluck_001.ogg"), 1206, -12)
cue("oops beep", beepvox([1568, 1175], 0.12, "sin"), 1212, -14)
# 21 technician: sparks + wrench, Ken runs
for f in range(1226, 1334):
    if f % 11 == 0:
        cue("spark", seg(mix(824), 0.0, 0.25), f, -16, 0.3)
cue("wrench", seg(mix(853), 0.5, 2.5), 1240, -20, 0.3)
for k, f in enumerate(range(1240, 1330, 7)):
    cue("running steps", ken("impact-sounds", f"footstep_wood_00{k % 5}.ogg"), f, -20, -0.3)
# 22 manager facepalm
cue("facepalm slap", ken("impact-sounds", "impactPunch_medium_001.ogg"), 1372, -8)
cue("sigh down", ken("digital-audio", "lowDown.ogg"), 1376, -22)
cue("suitcase set down", ken("impact-sounds", "impactSoft_heavy_003.ogg"), 1350, -16)
# 23 passport upside down
cue("raptor hmm (synth)", pitch(snore(0.5, 30), 0.8), 1440, -16)
cue("passport flip", ken("rpg-audio", "bookFlip2.ogg"), 1470, -10)
cue("realisation ding", ken("interface-sounds", "bong_001.ogg"), 1474, -16)
# 24 calendar 2019
cue("page flip", ken("rpg-audio", "bookFlip1.ogg"), 1516, -8)
cue("calendar hit", stinger(0.8), 1530, -12)
# 25 robots wheeled out, raptor sleeps
cue("dolly rolling", rumble_roll(2.8), 1562, -14)
cue("power down", ken("digital-audio", "phaserDown2.ogg"), 1600, -16)
cue("raptor yawn (synth)", pitch(roar(0.9, 6), 0.75), 1606, -18)
# 26 outro
cue("bright button", ken("interface-sounds", "confirmation_004.ogg"), 1650, -18)

# ---------------------------------------------------------------- ambience beds per scene
amb = np.zeros((2, N))


def bed(x, f0, f1, db, fade=0.25):
    t0, t1 = fr(f0), fr(f1)
    n = ns(t1 - t0)
    if x.shape[1] < n:
        x = np.tile(x, (1, n // x.shape[1] + 1))
    y = x[:, :n].copy()
    k = ns(fade); e = np.ones(n); e[:k] = np.linspace(0, 1, k); e[-k:] = np.linspace(1, 0, k)
    place(amb, y * e, t0, dbg(db))


ext = mix(371)
lobby = mix(444)
bed(seg(ext, 5, 4), 0, 82, -20)
bed(seg(lobby, 10, 25) * 0.6 + 0.4 * roomtone(25, 1, 80, 600), 82, 846, -26)
bed(roomtone(4, 2, 50, 400, 0.2), 846, 932, -28)
bed(roomtone(9, 3, 40, 300) * 0.5 + 0.5 * seg(mix(1060), 0, 9), 932, 1226, -28)
bed(seg(lobby, 40, 12) * 0.6 + 0.4 * roomtone(12, 4, 80, 600), 1226, 1646, -26)
bed(seg(ext, 30, 2), 1646, FRAMES, -20)

# ---------------------------------------------------------------- narration + mix
nar, sr = read_wav(os.path.join(ROOT, "studio", "productions", "robothotel", "audio", "narration_full_48k.wav"))
assert sr == SR
nar = st(nar)[:, :N]
nar = np.pad(nar, ((0, 0), (0, N - nar.shape[1])))
# voice envelope -> sidechain duck (60 ms attack, 500 ms release)
env = np.abs(nar).mean(0)
w = ns(0.03)
env = np.convolve(env, np.ones(w) / w, "same")
on = (env > dbg(-38)).astype(float)
duck = np.zeros(N); g = 0.0; aa = np.exp(-1 / (0.06 * SR)); rr = np.exp(-1 / (0.5 * SR))
for i in range(0, N, 64):
    target = on[i]
    c = aa if target > g else rr
    g = target + (g - target) * c ** 64
    duck[i:i + 64] = g


def db_gain(db):
    return dbg(db)


music_g = (1 - duck) * dbg(-2) + duck * dbg(-11)       # music sits right under the voice, swells in the gaps
sfx_g = (1 - duck) * 1.0 + duck * dbg(-3)
amb_g = (1 - duck) * 1.0 + duck * dbg(-4)

# relative levels: measure then set (music bed ~ -17 LU under the voice when ducked, sfx punchy)
L_n = integrated(nar)
music_s = music * dbg(L_n - integrated(music) - 6) * music_g
sfx_s = sfx * dbg(-9.0)
sfx_s *= sfx_g
amb_s = amb * amb_g
nar_s = nar.copy()

# glue: gentle bus compression on music + sfx (soft knee tanh saturation as a fast peak control)
def soft(x, drive=1.4):
    return np.tanh(drive * x) / np.tanh(drive)


bus = soft(music_s * 0.9 + sfx_s * 0.9 + amb_s, 1.2)
pre = nar_s + bus

# loudness: one gain to -14 LUFS, then a lookahead peak limiter at -1 dBTP
TARGET = -14.0
pre *= dbg(TARGET - integrated(pre))


def limiter(x, ceil_db=-1.2, look=0.005, rel=0.08):
    c = dbg(ceil_db)
    pk = np.max(np.abs(x), 0)
    need = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    L = ns(look)
    # lookahead min filter
    from scipy.ndimage import minimum_filter1d
    gmin = minimum_filter1d(need, size=2 * L + 1)
    gr = np.empty_like(gmin); g = 1.0; r = np.exp(-1 / (rel * SR))
    for i in range(len(gmin)):
        g = gmin[i] if gmin[i] < g else gmin[i] + (g - gmin[i]) * r
        gr[i] = g
    return x * gr, 20 * np.log10(gr.min())


out, gr_min = limiter(pre)
out *= dbg(TARGET - integrated(out))
out, gr2 = limiter(out)

write_wav(os.path.join(OUT, "mix.wav"), out)
write_wav(os.path.join(OUT, "music.wav"), music_s)
write_wav(os.path.join(OUT, "sfx.wav"), sfx_s)
write_wav(os.path.join(OUT, "ambience.wav"), amb_s)
write_wav(os.path.join(OUT, "narration.wav"), nar)
rep = {"integrated_lufs": round(integrated(out), 2), "true_peak_dbtp": round(float(true_peak(out)), 2),
       "limiter_max_gr_db": round(min(gr_min, gr2), 2), "music_re_voice_lu": round(integrated(music_s) - integrated(nar_s), 1),
       "sfx_re_voice_lu": round(integrated(sfx_s) - integrated(nar_s), 1), "cues": len(cues)}
json.dump({"report": rep, "cues": cues}, open(os.path.join(OUT, "mix_report.json"), "w"), indent=1)
with open(os.path.join(OUT, "cue_sheet.csv"), "w") as fcsv:
    fcsv.write("frame,time_s,cue,level_dbfs\n")
    for c in sorted(cues, key=lambda c: c["frame"]):
        fcsv.write(f'{c["frame"]},{c["time"]},{c["cue"]},{c["db"]}\n')
print(json.dumps(rep))
