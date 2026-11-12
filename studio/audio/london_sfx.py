# Procedural sounds for the London Bridge journey (own numpy/scipy synthesis, no third-party recordings):
# London (stone footsteps, paper, yawn, pen, stamp, crate, register ding, clock bell, gulls), dismantling (chalk,
# ratchet, crane winch, stone thud), ship (horn, engine, bow splash), canal (lock gate motor, water rush), Arizona
# works (truck pass, air brake, concrete mixer, scaffold clatter, excavator, bucket scrape, dirt dump, shovel), wind gust.
# Ambience beds: london_bed (river + distant city), sea_bed. Every generator takes a seeded RNG.
import numpy as np
from dsp import SR, ns, tt, lp, hp, bp, colored, smooth_noise, fades, modal, phase, reson, pan
from sfx_gen import hammer_hit as _hammer, rattle, splash_big as _splash, whoosh, water_bed, vox, vowel_track, _track
from crowd_sfx import crowd_murmur


def step_stone(r):
    d = 0.16; t = tt(d); n = len(t)
    heel = bp(r.standard_normal(n), 300, 2500, 2) * np.exp(-t / 0.012) + 0.6 * modal(d, [(r.uniform(140, 190), 1.0, 0.03)], r)
    grit = hp(r.standard_normal(n), 3000) * np.exp(-np.maximum(t - 0.02, 0) / 0.02) * 0.15
    return fades((heel + grit) * 0.6, 0.0005, 0.03)


def paper_unroll(r):
    d = 0.7; t = tt(d); n = len(t)
    crackle = bp(colored(n, r, 0.2), 1500, 7000, 1) * (0.4 + 0.6 * np.abs(smooth_noise(n, r, 25)))
    return fades(crackle * np.sin(np.pi * t / d) ** 0.7 * 0.5, 0.01, 0.08)


def paper_rustle(r):
    d = 0.35; t = tt(d); n = len(t)
    return fades(bp(colored(n, r, 0.3), 1200, 6000, 1) * np.abs(smooth_noise(n, r, 30)) * np.sin(np.pi * t / d) * 0.5, 0.005, 0.05)


def yawn(r):
    d = 1.15; n = ns(d); t = np.arange(n) / SR
    f0 = 140 * _track(n, [(0, 1.25), (0.25, 1.55), (0.7, 1.1), (d, 0.8)], t)
    forms = vowel_track(n, [(0, "a"), (0.4, "A"), (0.8, "o"), (d, "u")])
    amp = np.clip(t / 0.12, 0, 1) * np.clip((d - t) / 0.35, 0, 1)
    return fades(vox(f0, forms, amp, r, 1.0, tilt=1.2, breath=0.55) * 0.6, 0.01, 0.1)


def idea_ding(r):
    d = 1.2; return fades(modal(d, [(1318.5, 1.0, 0.5), (2637, 0.35, 0.25), (3956, 0.12, 0.12)], r) * 0.35, 0.001, 0.2)


def pen_scratch(r):
    d = 0.14; t = tt(d); n = len(t)
    return fades(bp(r.standard_normal(n), 2500, 8000, 2) * (0.5 + 0.5 * np.abs(np.sin(phase(np.full(n, 38.0))))) * 0.35, 0.003, 0.03)


def stamp_thunk(r):
    d = 0.3; t = tt(d); n = len(t)
    y = lp(r.standard_normal(n), 900, 2) * np.exp(-t / 0.018) + 0.8 * modal(d, [(r.uniform(95, 120), 1.0, 0.06), (260, 0.3, 0.03)], r)
    return fades(y * 0.7, 0.0005, 0.05)


def crate_slide(r):
    d = 0.75; t = tt(d); n = len(t)
    scrape = bp(colored(n, r, 0.6), 200, 2500, 1) * (0.6 + 0.4 * smooth_noise(n, r, 14)) * np.sin(np.pi * t / d) ** 0.5
    return fades(scrape * 0.45, 0.02, 0.1)


def register_ring(r):
    d = 0.9; return fades(modal(d, [(2093, 1.0, 0.35), (2637, 0.6, 0.3), (4186, 0.2, 0.15)], r) * 0.3, 0.001, 0.2)


def bell_chime(r):
    """distant tower clock bell (original): two strikes, inharmonic partials, long decay, distance-filtered"""
    d = 3.6; n = ns(d); out = np.zeros(n)
    for k, t0 in enumerate([0.0, 1.5]):
        f = [392, 311.1][k]; seg = modal(d - t0, [(f * 0.5, 0.6, 1.6), (f, 1.0, 1.2), (f * 1.19, 0.5, 0.9), (f * 1.56, 0.35, 0.7), (f * 2.0, 0.3, 0.6), (f * 2.74, 0.15, 0.4)], r)
        i = ns(t0); out[i:i + len(seg)] += seg[: n - i]
    return fades(lp(out, 2400, 2) * 0.35, 0.002, 0.4)


def gull(r):
    d = 0.9; n = ns(d); t = np.arange(n) / SR; out = np.zeros(n)
    for k in range(int(r.integers(2, 4))):
        t0 = k * r.uniform(0.22, 0.3); L = ns(0.22); i = ns(t0)
        if i + L > n: break
        tl = np.arange(L) / SR; f = 1500 + 900 * np.sin(np.pi * tl / 0.22) ** 0.7
        y = np.sin(phase(f)) + 0.4 * np.sin(phase(f * 2.01)) + 0.25 * bp(r.standard_normal(L), 1500, 4000, 1)
        out[i:i + L] += y * np.sin(np.pi * tl / 0.22) ** 1.5
    return fades(lp(out, 4500, 2) * 0.25, 0.005, 0.05)


def chalk_scratch(r):
    d = r.uniform(0.18, 0.3); t = tt(d); n = len(t)
    return fades(bp(r.standard_normal(n), 2000, 7000, 2) * (0.4 + 0.6 * np.abs(smooth_noise(n, r, 40))) * np.sin(np.pi * t / d) * 0.4, 0.004, 0.03)


def hammer_hit(r):
    return _hammer(r, r.uniform(0.6, 1.0))


def ratchet(r):
    d = 0.18; n = ns(d); y = np.zeros(n)
    for k in range(4):
        i = ns(0.005 + k * 0.04); L = min(ns(0.015), n - i); tl = np.arange(L) / SR
        y[i:i + L] += hp(r.standard_normal(L), 2500) * np.exp(-tl / 0.003) + 0.4 * np.sin(phase(np.full(L, 3200.0))) * np.exp(-tl / 0.004)
    return fades(y * 0.4, 0.0005, 0.02)


def shovel_dig(r):
    d = 0.45; t = tt(d); n = len(t)
    bite = bp(r.standard_normal(n), 400, 4000, 1) * np.exp(-t / 0.06) + 0.5 * modal(d, [(r.uniform(900, 1200), 0.6, 0.05)], r)
    return fades(bite * 0.5, 0.001, 0.08)


def crane_winch(r):
    d = 1.6; n = ns(d); t = np.arange(n) / SR
    f = 95 + 70 * np.clip(t / 0.5, 0, 1) - 20 * np.clip((t - 1.2) / 0.4, 0, 1)
    motor = np.sign(np.sin(phase(f))) * 0.3 + 0.5 * np.sin(phase(f * 2)) + 0.3 * np.sin(phase(f * 4.03))
    whine = 0.15 * np.sin(phase(f * 11.0))
    return fades(lp(motor + whine, 2000, 2) * np.clip(t / 0.15, 0, 1) * np.clip((d - t) / 0.3, 0, 1) * 0.35, 0.02, 0.2)


def chain_rattle(r):
    return rattle(1.0, r, density=22.0, heavy=True)


def stone_thud(r):
    d = 0.5; t = tt(d); n = len(t)
    y = lp(r.standard_normal(n), 500, 2) * np.exp(-t / 0.035) + modal(d, [(r.uniform(55, 70), 1.0, 0.12), (140, 0.4, 0.06)], r)
    grit = bp(r.standard_normal(n), 1500, 5000, 1) * np.exp(-np.maximum(t - 0.01, 0) / 0.05) * 0.15
    return fades((y + grit) * 0.7, 0.0005, 0.08)


def ship_horn(r):
    d = 2.2; n = ns(d); t = np.arange(n) / SR
    f0 = 110 * (1 + 0.004 * np.sin(phase(np.full(n, 5.0))))
    y = sum(np.sin(phase(f0 * k)) / k ** 0.8 for k in range(1, 9))
    env = np.clip(t / 0.12, 0, 1) * np.clip((d - t) / 0.45, 0, 1)
    return fades(lp(y * env, 1800, 2) * 0.22, 0.01, 0.3)


def ship_engine(r, d=3.0):
    n = ns(d); t = np.arange(n) / SR; f = 9.5 * (1 + 0.02 * smooth_noise(n, r, 0.5))
    thump = np.maximum(0, np.sin(phase(f))) ** 8
    body = lp(thump + 0.3 * colored(n, r, 1.2) * thump, 400, 2)
    return fades(body * np.clip(t / 0.6, 0, 1) * np.clip((d - t) / 0.8, 0, 1) * 0.8, 0.1, 0.4)


def bow_splash(r):
    d = 1.0; t = tt(d); n = len(t)
    y = bp(colored(n, r, 0.4), 300, 5000, 1) * np.exp(-t / 0.25) * (0.5 + 0.5 * smooth_noise(n, r, 8))
    return fades(y * 0.5, 0.01, 0.2)


def lock_gate(r):
    d = 2.6; n = ns(d); t = np.arange(n) / SR
    hum = 0.5 * np.sin(phase(np.full(n, 58.0))) + 0.25 * np.sin(phase(np.full(n, 116.0)))
    gear = bp(r.standard_normal(n), 400, 1500, 2) * (0.5 + 0.5 * np.sign(np.sin(phase(np.full(n, 6.0)))))
    clunk = np.zeros(n); i = ns(0.05); c = stone_thud(r) * 0.6; clunk[i:i + len(c)] += c[: n - i]
    return fades((hum + gear * 0.3) * np.clip(t / 0.3, 0, 1) * np.clip((d - t) / 0.5, 0, 1) * 0.3 + clunk, 0.01, 0.3)


def water_rush(r, d=2.8):
    n = ns(d); t = np.arange(n) / SR
    y = bp(colored(n, r, 0.5), 150, 6000, 1) * (0.6 + 0.4 * smooth_noise(n, r, 3))
    return fades(y * np.clip(t / 0.4, 0, 1) * np.clip((d - t) / 0.9, 0, 1) * 0.6, 0.05, 0.4)


def splash_big(r):
    return _splash(r)


def truck_pass(r, d=3.4):
    """1960s diesel flatbed passing: engine harmonics with Doppler + tyre/gravel noise, pan L->R"""
    n = ns(d); t = np.arange(n) / SR; u = t / d
    prox = np.exp(-((u - 0.45) / 0.22) ** 2); dop = 1 + 0.05 * np.tanh((0.45 - u) * 6)
    f = 32 * dop; eng = sum(np.sin(phase(f * k)) / k for k in range(1, 7)) + 0.4 * colored(n, r, 1.3)
    gravel = bp(colored(n, r, 0.3), 800, 6000, 1) * (0.6 + 0.4 * np.abs(smooth_noise(n, r, 20))) * 0.5
    mono = lp(eng, 1500, 2) * 0.5 + gravel
    mono *= prox * (0.3 + 0.7 * prox)
    th = (np.clip(-0.8 + 1.6 * u, -1, 1) + 1) * np.pi / 4
    return fades(np.stack([mono * np.cos(th), mono * np.sin(th)]) * np.sqrt(2) * 0.5, 0.2, 0.5)


def air_brake(r):
    d = 0.9; t = tt(d); n = len(t)
    return fades(hp(colored(n, r, 0.1), 2500) * np.exp(-t / 0.35) * 0.4, 0.002, 0.15)


def concrete_mixer(r, d=4.0):
    n = ns(d); t = np.arange(n) / SR
    drum = lp(colored(n, r, 1.0), 300, 2) * (0.6 + 0.4 * np.sin(phase(np.full(n, 0.6))))
    gravel = bp(colored(n, r, 0.4), 500, 3000, 1) * (0.5 + 0.5 * np.abs(np.sin(phase(np.full(n, 1.2))))) * 0.4
    eng = 0.3 * np.sin(phase(np.full(n, 46.0))) + 0.15 * np.sin(phase(np.full(n, 92.0)))
    return fades((drum + gravel + eng) * np.clip(t / 0.6, 0, 1) * np.clip((d - t) / 1.0, 0, 1) * 0.5, 0.1, 0.5)


def scaffold_clatter(r):
    d = 0.8; n = ns(d); y = np.zeros(n)
    for k in range(int(r.integers(4, 8))):
        i = ns(r.uniform(0, 0.5)); s = modal(0.3, [(r.uniform(600, 900), 1.0, 0.08), (r.uniform(1800, 2600), 0.6, 0.05), (r.uniform(3500, 4500), 0.3, 0.03)], r) * r.uniform(0.3, 1.0)
        L = min(len(s), n - i); y[i:i + L] += s[:L]
    return fades(y * 0.35, 0.001, 0.1)


def excavator(r, d=3.2):
    n = ns(d); t = np.arange(n) / SR; f = 38 * (1 + 0.12 * smooth_noise(n, r, 0.8))
    eng = sum(np.sin(phase(f * k)) / k ** 0.9 for k in range(1, 8)) + 0.5 * colored(n, r, 1.2)
    hyd = 0.12 * np.sin(phase(np.full(n, 620.0) * (1 + 0.1 * smooth_noise(n, r, 1.5))))
    return fades(lp(eng, 1400, 2) * 0.45 * np.clip(t / 0.4, 0, 1) * np.clip((d - t) / 0.8, 0, 1) + hyd * np.clip(t / 0.4, 0, 1) * np.clip((d - t) / 0.8, 0, 1), 0.1, 0.4)


def bucket_scrape(r):
    d = 0.7; t = tt(d); n = len(t)
    return fades(bp(colored(n, r, 0.5), 300, 3500, 1) * (0.5 + 0.5 * np.abs(smooth_noise(n, r, 16))) * np.sin(np.pi * t / d) ** 0.6 * 0.5, 0.01, 0.1)


def dirt_dump(r):
    d = 0.9; t = tt(d); n = len(t)
    return fades(lp(colored(n, r, 0.8), 2500, 2) * np.exp(-t / 0.3) * (0.5 + 0.5 * smooth_noise(n, r, 12)) * 0.6, 0.005, 0.15)


def wind_gust(r):
    d = 1.6; t = tt(d); n = len(t)
    return fades(bp(colored(n, r, 0.9), 200, 3000, 1) * np.sin(np.pi * t / d) ** 1.5 * 0.6 + 0.4 * whoosh(d, r, peak=0.5, f_lo=200, f_hi=1500)[:n], 0.05, 0.3)


# ---------- ambience beds (stereo) ----------
def london_bed(dur, r):
    """Thames at dusk: river lapping on the embankment + very distant city murmur + light wind"""
    w = water_bed(dur, r, close=0.5); w = w if np.ndim(w) == 2 else np.stack([w, w])
    city = crowd_murmur(dur, r, talkers=6) * 0.25
    n = ns(dur); traffic = np.stack([lp(colored(n, r, 1.4), 300, 2), lp(colored(n, r, 1.4), 300, 2)]) * 0.15
    return w * 0.8 + city + traffic


def sea_bed(dur, r):
    n = ns(dur); out = np.zeros((2, n))
    for ch in range(2):
        g = 0.5 + 0.5 * np.abs(smooth_noise(n, r, 0.25))
        out[ch] = lp(colored(n, r, 0.9), 1800, 2) * g + bp(colored(n, r, 0.3), 2000, 7000, 1) * g ** 3 * 0.2
    return out * 0.6
