"""Audio 2.0 background score: an original, deterministic generative score (rights are ours - no third-party music),
12 moods, sections with smooth crossfades, phrase-aligned endings (never cut mid-bar), loop-point detection.

Each mood fixes tempo, mode, chord progression, instrumentation (soft pad, plucked arpeggio, round bass, light
percussion, bell motif) and density. The music is mixed under the narration by the Audio 2.0 mixer (sidechain duck)."""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "audio"))
from dsp import SR, ns, rng, lp, hp  # noqa: E402

MODES = {"major": [0, 2, 4, 5, 7, 9, 11], "minor": [0, 2, 3, 5, 7, 8, 10], "dorian": [0, 2, 3, 5, 7, 9, 10], "lydian": [0, 2, 4, 6, 7, 9, 11], "phrygian": [0, 1, 3, 5, 7, 8, 10]}
# mood: tempo, root (MIDI), mode, progression (scale degrees), layers, density 0..1, swing
MOODS = {
    "curious": (96, 57, "dorian", [0, 3, 4, 3], ["pad", "pluck", "bass", "bell"], 0.55, 0.0),
    "mysterious": (72, 50, "phrygian", [0, 1, 0, 6], ["pad", "bass", "bell"], 0.35, 0.0),
    "educational": (100, 60, "major", [0, 4, 5, 3], ["pad", "pluck", "bass", "perc"], 0.55, 0.0),
    "historical": (84, 55, "dorian", [0, 6, 3, 4], ["pad", "pluck", "bass"], 0.45, 0.0),
    "adventurous": (112, 57, "lydian", [0, 1, 4, 5], ["pad", "pluck", "bass", "perc", "bell"], 0.75, 0.0),
    "dramatic": (80, 50, "minor", [0, 5, 2, 6], ["pad", "bass", "perc"], 0.6, 0.0),
    "emotional": (70, 57, "major", [0, 5, 3, 4], ["pad", "pluck", "bass"], 0.4, 0.0),
    "suspenseful": (66, 48, "minor", [0, 0, 1, 0], ["pad", "bass", "perc"], 0.35, 0.0),
    "exciting": (124, 57, "minor", [0, 5, 6, 4], ["pad", "pluck", "bass", "perc"], 0.85, 0.0),
    "lighthearted": (108, 62, "major", [0, 3, 4, 0], ["pluck", "bass", "perc", "bell"], 0.65, 0.12),
    "comedic": (116, 60, "major", [0, 4, 0, 4], ["pluck", "bass", "perc", "bell"], 0.7, 0.18),
    "calm": (64, 55, "major", [0, 3, 0, 4], ["pad", "bell"], 0.3, 0.0),
}
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
def _chord(root, mode, deg):
    sc = MODES[mode]; return [root + sc[(deg + k) % 7] + 12 * ((deg + k) // 7) for k in (0, 2, 4)]
def _pad(f, dur, r):
    t = np.arange(ns(dur)) / SR; x = sum(np.sin(2 * np.pi * f * (1 + d) * t + r.uniform(0, 6)) for d in (-0.003, 0, 0.004)) + 0.3 * np.sin(4 * np.pi * f * t)
    a = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.5); return lp(x * a, 2200, 1) * 0.12
def _pluck(f, dur, r):
    from scipy.signal import lfilter   # Karplus-Strong string as a recursive filter (vectorised)
    n = ns(dur); p = max(2, int(SR / f)); exc = np.zeros(n); exc[:p] = r.uniform(-1, 1, p); a = np.zeros(p + 2); a[0] = 1; a[p] = -0.498; a[p + 1] = -0.498
    return lfilter([1.0], a, exc) * 0.22
def _bass(f, dur, r):
    t = np.arange(ns(dur)) / SR; return np.tanh(1.5 * np.sin(2 * np.pi * f * t)) * np.exp(-t * 1.8) * 0.28
def _bell(f, dur, r):
    t = np.arange(ns(dur)) / SR; return sum(np.sin(2 * np.pi * f * m * t) * np.exp(-t * (2 + 2 * k)) / (k + 1) for k, m in enumerate([1, 2.76, 5.4])) * 0.07
def _kick(r): t = np.arange(ns(0.3)) / SR; return np.sin(2 * np.pi * np.cumsum(50 + 90 * np.exp(-t * 30)) / SR) * np.exp(-t * 12) * 0.4
def _hat(r): t = np.arange(ns(0.08)) / SR; return hp(r.standard_normal(len(t)), 7000) * np.exp(-t * 60) * 0.06
def section(mood, bars, seed=0):
    """render `bars` bars of a mood (4/4); returns stereo (2, n) and the bar length in seconds"""
    tempo, root, mode, prog, layers, dens, swing = MOODS[mood]; r = rng(seed * 101 + len(mood)); beat = 60 / tempo; bar = 4 * beat; N = ns(bars * bar + 2.0)
    L, R = np.zeros(N), np.zeros(N)
    def put(x, t, p=0.0):
        i = ns(t); a, b = i, min(N, i + len(x));
        if b > a: L[a:b] += x[:b - a] * np.cos((p + 1) * np.pi / 4) * 1.41; R[a:b] += x[:b - a] * np.sin((p + 1) * np.pi / 4) * 1.41
    for b in range(bars):
        ch = _chord(root, mode, prog[b % len(prog)]); t0 = b * bar
        if "pad" in layers:
            for k, m in enumerate(ch): put(_pad(hz(m + 12), bar + 0.4, r), t0, (k - 1) * 0.4)
        if "bass" in layers:
            for k in range(2 if dens > 0.5 else 1): put(_bass(hz(ch[0] - 12), bar / 2, r), t0 + k * bar / 2)
        if "pluck" in layers:
            steps = 8 if dens > 0.6 else 4
            for k in range(steps):
                if r.random() < 0.15 * (1 - dens): continue
                m = ch[k % 3] + (12 if (k // 3) % 2 else 0) + 12; sw = swing * beat / 2 if k % 2 else 0; put(_pluck(hz(m), 0.7, r), t0 + k * bar / steps + sw, 0.5 * np.sin(k))
        if "bell" in layers and b % 2 == 0: put(_bell(hz(ch[2] + 24), 2.5, r), t0 + beat * (2 if b % 4 == 0 else 3), -0.3)
        if "perc" in layers:
            for k in range(4):
                if k % 2 == 0 or dens > 0.7: put(_kick(r), t0 + k * beat)
                put(_hat(r), t0 + k * beat + beat / 2 + (swing * beat / 2), 0.3)
    x = np.stack([L, R]); return x / max(1e-9, np.abs(x).max()) * 0.6, bar
def score(plan, dur, seed=0, xfade=2.0):
    """plan: [(t_start_s, mood), ...] -> stereo score of `dur` seconds. Each section is rendered to whole bars, ends on a
    phrase boundary with a fade, and crossfades into the next (equal power), so there are no abrupt starts or stops."""
    N = ns(dur); out = np.zeros((2, N)); plan = sorted(plan) + [(dur, None)]
    for (t0, mood), (t1, _) in zip(plan, plan[1:]):
        tempo = MOODS[mood][0]; bar = 240 / tempo; bars = max(2, int(np.ceil((t1 - t0 + xfade) / bar))); x, _ = section(mood, bars, seed + int(t0 * 10))
        L = min(x.shape[1], ns(t1 - t0 + xfade)); x = x[:, :L].copy(); fi, fo = ns(xfade if t0 > 0 else 0.8), ns(xfade if t1 < dur else 2.5)
        x[:, :fi] *= np.sin(np.linspace(0, np.pi / 2, fi)) if fi else 1; x[:, -fo:] *= np.cos(np.linspace(0, np.pi / 2, fo))
        a = ns(max(0, t0 - (xfade / 2 if t0 > 0 else 0))); b = min(N, a + L); out[:, a:b] += x[:, :b - a]
    return out
def loop_point(x, bar_s, search_bars=(4, 16)):
    """best seamless loop length (in bars): maximum normalised correlation between the head and the material one loop later"""
    m = x.mean(axis=0); best = (None, -1)
    for nb in range(search_bars[0], search_bars[1] + 1):
        L = ns(nb * bar_s); w = ns(min(2.0, bar_s))
        if L + w > len(m): break
        a, b = m[:w], m[L:L + w]; c = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))
        if c > best[1]: best = (nb, c)
    return {"bars": best[0], "seconds": best[0] * bar_s if best[0] else None, "correlation": round(best[1], 3)}
