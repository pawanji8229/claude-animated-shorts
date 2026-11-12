# Procedural crowd / ceremony / waterside sounds for TwistFrame productions (own numpy/scipy synthesis,
# no third-party recordings): 1960s-70s camera shutter + film advance, flash-bulb pop, group cheer, crowd "ooh",
# small motor boat passing, continuous ceremony crowd bed. Every generator takes a seeded RNG (no two instances alike).
import numpy as np
from dsp import SR, ns, tt, lp, hp, bp, colored, smooth_noise, fades, modal, phase, pan, reson
from sfx_gen import hurrah, applause, babble, vox, vowel_track, _track, water_bed


def shutter(r, advance=True):
    """mechanical SLR: mirror slap + shutter curtain clack (+ optional thumb film-advance ratchet)"""
    d = 0.42; t = tt(d); n = len(t); y = np.zeros(n)
    for t0, a, fc in [(0.0, 1.0, 2400), (r.uniform(0.018, 0.03), 0.8, 3600)]:
        k = ns(t0); L = n - k; tl = np.arange(L) / SR
        y[k:] += a * bp(r.standard_normal(L), fc * 0.5, fc * 1.6, 2) * np.exp(-tl / 0.006)
        y[k:] += a * 0.5 * modal(L / SR, [(r.uniform(900, 1100), 1.0, 0.012), (r.uniform(2600, 3000), 0.6, 0.008)], r)
    for i in range(5 if advance else 0):  # advance lever ratchet
        k = ns(0.17 + i * r.uniform(0.028, 0.036)); L = min(ns(0.02), n - k)
        if L <= 0: break
        tl = np.arange(L) / SR; y[k:k + L] += 0.25 * hp(r.standard_normal(L), 3000) * np.exp(-tl / 0.003)
    return fades(y * 0.6, 0.0005, 0.03)


def flash_pop(r):
    """flash bulb: short bright 'fzt' pop with a glassy tick and a soft electrical whine tail"""
    d = 0.35; t = tt(d); n = len(t)
    pop = bp(r.standard_normal(n), 1200, 7000, 2) * np.exp(-t / 0.012)
    tick = modal(d, [(r.uniform(4200, 4800), 0.5, 0.02), (r.uniform(6800, 7400), 0.3, 0.012)], r)
    whine = np.sin(phase(np.full(n, r.uniform(7800, 8600)) * (1 - 0.15 * t / d))) * np.exp(-t / 0.09) * 0.05
    return fades(pop * 0.7 + tick * 0.5 + whine, 0.0003, 0.05)


def cheer(r, people=14, dur=2.4):
    """stereo group cheer: staggered individual hurrahs/heys (formant voices) over a burst of applause"""
    n = ns(dur); out = np.zeros((2, n))
    for p in range(people):
        man = r.uniform() < 0.6
        x = hurrah(r, r.uniform(100, 150) if man else r.uniform(185, 260), r.uniform(0.95, 1.05) if man else r.uniform(1.12, 1.22))
        k = ns(r.uniform(0.0, 0.5)); L = min(len(x), n - k)
        out[:, k:k + L] += pan(x[:L], r.uniform(-0.85, 0.85)) * r.uniform(0.35, 0.8)
    t = np.arange(n) / SR
    env = np.clip(t / 0.15, 0, 1) * np.clip((dur - t) / 1.1, 0, 1) ** 1.3
    out += applause(dur, r, people=22, env=env) * 0.55
    return out * 0.5


def crowd_ooh(r, people=12, dur=1.3):
    """impressed crowd 'oooh' rising then falling (each voice its own pitch, onset and vibrato)"""
    n = ns(dur); out = np.zeros((2, n))
    for p in range(people):
        man = r.uniform() < 0.6
        base = r.uniform(105, 150) if man else r.uniform(190, 250)
        d = r.uniform(0.75, 1.1); m = ns(d); t = np.arange(m) / SR
        f0 = base * _track(m, [(0, 1.0), (d * 0.45, 1.22), (d, 0.92)], t) * (1 + 0.012 * np.sin(phase(np.full(m, r.uniform(4.5, 6.0)))))
        forms = vowel_track(m, [(0, "u"), (d * 0.5, "o"), (d, "u")])
        amp = np.clip(t / 0.18, 0, 1) * np.clip((d - t) / 0.3, 0, 1)
        x = vox(f0, forms, amp, r, r.uniform(0.95, 1.05) if man else r.uniform(1.12, 1.2), tilt=1.2, breath=0.3)
        k = ns(r.uniform(0, 0.18)); L = min(m, n - k)
        out[:, k:k + L] += pan(x[:L], r.uniform(-0.8, 0.8)) * r.uniform(0.4, 0.8)
    return fades(out * 0.45, 0.01, 0.1)


def boat_pass(r, dur=6.0):
    """small outboard boat passing under the bridge: putter engine with Doppler pitch bend, hull slap, pan L->R"""
    n = ns(dur); t = np.arange(n) / SR; u = t / dur
    prox = np.exp(-((u - 0.5) / 0.22) ** 2)                      # loudest as it passes
    dop = 1 + 0.06 * np.tanh((0.5 - u) * 5)                      # pitch drops as it passes
    f = r.uniform(17, 21) * dop                                  # firing rate
    ph = phase(f); pulse = np.maximum(0, np.sin(ph)) ** 6
    body = lp(pulse + 0.4 * colored(n, r, 1.0) * pulse, 900, 2)
    body = body + 0.5 * reson(body, 160 * dop.mean(), 4)
    slap = bp(colored(n, r, 0.5), 300, 1800, 1) * (0.5 + 0.5 * smooth_noise(n, r, 1.6)) * 0.25
    mono = (body * 0.6 + slap) * prox * (0.3 + 0.7 * prox)
    th = (np.clip(-0.8 + 1.6 * u, -1, 1) + 1) * np.pi / 4
    return fades(np.stack([mono * np.cos(th), mono * np.sin(th)]) * np.sqrt(2) * 0.6, 0.2, 0.6)


def crowd_bed(dur, r):
    """continuous ceremony crowd: many distant talkers + occasional scattered claps + river under the bridge"""
    n = ns(dur); out = np.zeros((2, n))
    for p in range(10):
        man = r.uniform() < 0.6
        x = babble(dur, r, r.uniform(100, 145) if man else r.uniform(185, 240), r.uniform(0.95, 1.05) if man else r.uniform(1.12, 1.2), active=0.6)
        out += pan(lp(x, 2800, 2), r.uniform(-0.9, 0.9)) * r.uniform(0.25, 0.5)
    env = 0.25 + 0.75 * np.clip(smooth_noise(n, r, 0.15), 0, 1)
    out += applause(dur, r, people=6, env=env) * 0.12
    w = water_bed(dur, r, close=0.4)
    out += (w if np.ndim(w) == 2 else np.stack([w, w])) * 0.35
    return out


def film_advance(r):
    """thumb lever winding on the film: 4-6 tiny ratchet ticks + lever spring return"""
    d = 0.3; n = ns(d); y = np.zeros(n); k0 = 0
    for i in range(int(r.integers(4, 7))):
        k = ns(0.01 + i * r.uniform(0.026, 0.034)); L = min(ns(0.018), n - k)
        if L <= 0: break
        tl = np.arange(L) / SR; y[k:k + L] += r.uniform(0.6, 1.0) * hp(r.standard_normal(L), 2800) * np.exp(-tl / 0.0025)
    k = ns(0.24); L = n - k; tl = np.arange(L) / SR
    y[k:] += 0.5 * bp(r.standard_normal(L), 1500, 5000, 2) * np.exp(-tl / 0.004)
    return fades(y * 0.5, 0.0005, 0.02)


def clap_soft(r):
    """one person's single soft clap (cupped/flat palms vary)"""
    d = 0.09; t = tt(d); n = len(t)
    fc = r.uniform(900, 2200); cup = r.uniform(0.0, 0.7)
    y = reson(r.standard_normal(n), fc, 1.3) * np.exp(-t / r.uniform(0.005, 0.009))
    y += cup * reson(r.standard_normal(n), r.uniform(380, 650), 4) * np.exp(-t / 0.012)
    return fades(y * 0.5, 0.0003, 0.02)


def cloth_soft(r):
    """quiet clothing rustle (sleeve / jacket) for small arm movements"""
    d = r.uniform(0.25, 0.45); t = tt(d); n = len(t)
    e = np.sin(np.pi * t / d) ** 1.5 * (0.7 + 0.3 * smooth_noise(n, r, 18))
    return fades(bp(colored(n, r, 0.4), 700, 5000, 1) * e * 0.3, 0.01, 0.05)


def crowd_murmur(dur, r, talkers=12):
    """gentle, distant crowd murmur: many quiet talkers, low-passed for distance, no shouting/cheering"""
    n = ns(dur); out = np.zeros((2, n))
    for p in range(talkers):
        man = r.uniform() < 0.6
        x = babble(dur, r, r.uniform(100, 140) if man else r.uniform(185, 230), r.uniform(0.95, 1.05) if man else r.uniform(1.12, 1.2), rate=3.6, active=0.55)
        out += pan(lp(x, 1900, 2), r.uniform(-0.9, 0.9)) * r.uniform(0.2, 0.45)
    return out * (0.85 + 0.15 * smooth_noise(n, r, 0.2))[None, :]


def river_bed(dur, r):
    w = water_bed(dur, r, close=0.4)
    return w if np.ndim(w) == 2 else np.stack([w, w])
