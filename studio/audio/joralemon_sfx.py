# Procedural sounds for "The House That Isn't Really a House" (joralemon), own numpy/scipy synthesis, no recordings:
# modern street (car pass: tyre roar + soft engine with a Doppler sweep; bicycle freewheel ticks; dog paws + tag
# jingle; leaf rustle), machinery (ventilation fan hum with blade-pass tone, fan spin-up), subway (train rumble with
# wheel-joint clacks, 1907 train with a brighter clatter), story accents (soft mystery accent, era "shimmer",
# comic rejection "nope" slide). Beds: brooklyn (distant traffic + birds + leaves), parlour (room tone + clock tick +
# fire crackle), works1907 (distant city + far hammering), tunnel (low drone). All levels are set by the mixer.
import numpy as np
from dsp import SR, ns, tt, lp, hp, bp, colored, smooth_noise, fades, modal, phase


def car_pass(r, d=3.6):
    """modern car passing: broadband tyre noise + soft engine hum, level + pitch sweep peaking mid-way"""
    n = ns(d); t = np.arange(n) / SR; u = t / d
    env = 1 / (1 + ((u - 0.5) / 0.13) ** 2); dop = 1 + 0.06 * np.tanh((0.5 - u) / 0.08)
    tyre = bp(colored(n, r, 0.6), 200, 2200) * env
    eng = (np.sin(phase(np.full(n, r.uniform(55, 75)) * dop)) + 0.4 * np.sin(phase(np.full(n, r.uniform(110, 150)) * dop))) * env * 0.25
    return fades((tyre * 0.8 + eng) * 0.5, 0.3, 0.4)


def bike_tick(r, d=1.4):
    """bicycle freewheel: fast soft ticks + tyre hiss"""
    n = ns(d); y = bp(colored(n, r, 0.0), 1500, 5000) * 0.03
    for at in np.arange(0, d, 1 / r.uniform(16, 22)):
        i = ns(at); L = min(ns(0.006), n - i); y[i:i + L] += np.exp(-np.arange(L) / (SR * 0.0012)) * 0.35 * r.uniform(0.6, 1)
    return fades(hp(y, 1800, 2), 0.05, 0.3)


def dog_paws(r):
    """four quick paw taps on paving + a little tag jingle"""
    d = 0.5; n = ns(d); y = np.zeros(n)
    for k, at in enumerate([0.0, 0.07, 0.19, 0.26]):
        i = ns(at + r.uniform(0, 0.01)); L = min(ns(0.03), n - i); y[i:i + L] += bp(colored(L, r, 0.0), 600, 3500) * np.exp(-np.arange(L) / (SR * 0.006)) * r.uniform(0.5, 1)
    tag = modal(0.35, [(r.uniform(5200, 5600), 0.2, 0.08), (r.uniform(7300, 7900), 0.12, 0.05)], r)
    y[ns(0.12):ns(0.12) + len(tag)] += tag[: n - ns(0.12)]
    return fades(y * 0.6, 0.001, 0.05)


def fan_hum(r, d=4.0):
    """large ventilation fan: low motor hum + blade-pass tone + airy rush"""
    n = ns(d); t = np.arange(n) / SR
    bpf = r.uniform(38, 46)
    y = 0.6 * np.sin(phase(np.full(n, 60.0))) + 0.4 * np.sin(phase(np.full(n, bpf))) * (1 + 0.3 * np.sin(2 * np.pi * 0.7 * t))
    y += lp(colored(n, r, 0.8), 900, 2) * 0.5
    return fades(lp(y, 1200, 2) * 0.4, 0.6, 0.8)


def fan_spinup(r, d=2.2):
    """the fan starts: rising whirr"""
    n = ns(d); u = np.arange(n) / n
    f = 8 + 34 * u ** 1.6
    y = np.sin(phase(f * 4)) * 0.25 + bp(colored(n, r, 0.5), 300, 2400) * u * 0.6
    return fades(y * (0.3 + 0.7 * u) * 0.45, 0.05, 0.3)


def train_rumble(r, d=4.5, old=False):
    """subway train under the street: deep rumble + rhythmic wheel-joint clacks (brighter + rattlier for 1907)"""
    n = ns(d); t = np.arange(n) / SR; u = t / d
    env = np.sin(np.pi * np.clip(u, 0, 1)) ** 0.7
    y = lp(colored(n, r, 1.4), 160 if not old else 260, 2) * 1.3 + np.sin(phase(np.full(n, 31.0))) * 0.3
    for at in np.arange(r.uniform(0, 0.2), d, 0.42):
        for dt in (0.0, 0.11):
            i = ns(at + dt); L = min(ns(0.05), n - i)
            if L > 0: y[i:i + L] += bp(colored(L, r, 0.3), 250, 1800 if not old else 3200) * np.exp(-np.arange(L) / (SR * 0.012)) * 0.9
    return fades(y * env * 0.4, 0.4, 0.6)


def train_old(r): return train_rumble(r, 4.0, True)


def time_shimmer(r, d=1.6):
    """era dissolve: soft rising glassy shimmer (several detuned sine partials with a swell)"""
    n = ns(d); u = np.arange(n) / n; y = np.zeros(n)
    for k, f0 in enumerate([880, 1320, 1760, 2640]):
        y += np.sin(phase(f0 * (1 + 0.03 * u) * r.uniform(0.995, 1.005))) * (0.4 / (k + 1))
    return fades(y * np.sin(np.pi * u) ** 1.5 * 0.35, 0.05, 0.2)


def mystery_accent(r, d=1.8):
    """subtle mysterious accent: two soft low plucks (minor second) under a breathy swell"""
    n = ns(d); y = np.zeros(n)
    for at, f in [(0.0, 196.0), (0.32, 207.65)]:
        m = modal(1.2, [(f, 1.0, 0.6), (f * 2.01, 0.35, 0.3), (f * 3.02, 0.12, 0.15)], r); i = ns(at); y[i:i + len(m)] += m[: n - i]
    y += lp(colored(n, r, 0.5), 700, 2) * np.sin(np.pi * np.arange(n) / n) * 0.15
    return fades(y * 0.4, 0.005, 0.4)


def reject_buzz(r):
    """comic rejection: short descending 'nope' slide with a soft buzz"""
    d = 0.55; n = ns(d); u = np.arange(n) / n
    f = 420 * (1 - 0.45 * u)
    y = np.sign(np.sin(phase(f))) * 0.25 + np.sin(phase(f * 0.5)) * 0.4
    return fades(lp(y, 1800, 2) * (1 - u) ** 0.6 * 0.4, 0.005, 0.08)


def leaves(r, d=2.0):
    """a gust through the plane trees"""
    n = ns(d); env = np.sin(np.pi * np.arange(n) / n) ** 1.2
    return fades(hp(colored(n, r, 0.2), 1500, 2) * (0.6 + 0.4 * smooth_noise(n, r, 6)) * env * 0.25, 0.2, 0.3)


def _birds(out, dur, r, every=2.3, lvl=0.04):
    n = out.shape[1]
    for at in np.arange(r.uniform(0.3, 1.5), dur, every * r.uniform(0.7, 1.3)):
        i = ns(at); L = min(ns(0.12), n - i); tl = np.arange(L) / SR
        c = np.sin(phase(3600 + 1500 * np.sin(2 * np.pi * r.uniform(12, 22) * tl))) * np.exp(-tl / 0.04) * lvl
        out[int(r.integers(0, 2)), i:i + L] += c


def brooklyn_bed(dur, r):
    """today's quiet residential street: distant traffic hum, leaves, birds"""
    n = ns(dur); out = np.zeros((2, n))
    for ch in range(2): out[ch] = lp(colored(n, r, 1.2), 300, 2) * (0.7 + 0.3 * smooth_noise(n, r, 0.15)) * 0.45 + hp(colored(n, r, 0.2), 2500, 2) * 0.03 * (0.5 + 0.5 * smooth_noise(n, r, 0.4))
    _birds(out, dur, r); return out


def parlour_bed(dur, r):
    """1847 parlour: warm room tone, mantel clock tick, soft fire crackle"""
    n = ns(dur); out = np.zeros((2, n))
    for ch in range(2): out[ch] = lp(colored(n, r, 1.0), 700, 2) * 0.25
    for at in np.arange(0.0, dur, 0.5):
        i = ns(at); L = min(ns(0.02), n - i); out[:, i:i + L] += bp(colored(L, r, 0.0), 2000, 6000) * np.exp(-np.arange(L) / (SR * 0.003)) * 0.12
    for at in np.arange(0.0, dur, 0.09):
        if r.random() < 0.35:
            i = ns(at + r.uniform(0, 0.08)); L = min(ns(0.01), n - i); out[int(r.integers(0, 2)), i:i + L] += hp(colored(L, r, 0.0), 1500, 2) * r.uniform(0.05, 0.2)
    return out


def works_bed(dur, r):
    """1907 street works: distant city rumble, far hammering, a few birds"""
    n = ns(dur); out = np.zeros((2, n))
    for ch in range(2): out[ch] = lp(colored(n, r, 1.3), 350, 2) * 0.45
    for at in np.arange(r.uniform(0.2, 0.8), dur, 0.85):
        i = ns(at); L = min(ns(0.15), n - i); out[int(r.integers(0, 2)), i:i + L] += lp(modal(0.15, [(r.uniform(900, 1300), 0.3, 0.05)], r)[:L], 2500, 2) * 0.5
    _birds(out, dur, r, 3.1, 0.03); return out


def tunnel_bed(dur, r):
    """underground: low drone + air movement"""
    n = ns(dur); out = np.zeros((2, n))
    for ch in range(2): out[ch] = lp(colored(n, r, 1.6), 140, 2) * 0.9 + bp(colored(n, r, 0.4), 200, 900) * 0.15 * (0.6 + 0.4 * smooth_noise(n, r, 0.3))
    return out
