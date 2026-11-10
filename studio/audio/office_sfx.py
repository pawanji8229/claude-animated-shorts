# Procedural sounds for "The Office That Moved" (short3), own numpy/scipy synthesis, no recordings:
# 1930 office (twin-bell telephone ring, cord plug / unplug, switchboard key click, typewriter burst, coffee cup clink,
# office door), the move (roller creak, screw-jack ratchet pull, timber crib thud, steel I-beam clank, deep building
# groan), street (streetcar bell, crawler-crane engine + track clatter, wooden gangway steps, rope creak), comic
# beats reuse the shared library (freeze sting, idea ding, paper). Beds: city1930 (distant traffic + streetcar hum +
# birds), office (room tone + muffled far typewriters). Music: office_piano (original, sparse soft piano + brushes).
import numpy as np
from dsp import SR, ns, tt, lp, hp, bp, colored, smooth_noise, fades, modal, phase, pan
from crowd_sfx import crowd_murmur


def phone_ring(r):
    """1930 desk-set ringer: two gongs struck by a 20 Hz clapper, ~0.9 s burst"""
    d = 1.0; n = ns(d); t = np.arange(n) / SR; y = np.zeros(n)
    for k, at in enumerate(np.arange(0.0, 0.85, 1 / 20.0)):
        i = ns(at); L = min(ns(0.25), n - i); tl = np.arange(L) / SR; g = 0.9 if k % 2 else 1.0
        f0 = 1180 if k % 2 else 1340
        y[i:i + L] += g * (np.sin(phase(np.full(L, f0))) + 0.5 * np.sin(phase(np.full(L, f0 * 2.76))) + 0.25 * np.sin(phase(np.full(L, f0 * 5.4)))) * np.exp(-tl / 0.09)
    return fades(bp(y, 600, 7000, 1) * 0.18 * np.clip((d - t) / 0.12, 0, 1), 0.001, 0.05)


def plug_click(r):
    d = 0.12; t = tt(d); n = len(t)
    y = hp(r.standard_normal(n), 2500) * np.exp(-t / 0.004) + 0.5 * modal(d, [(r.uniform(2400, 2900), 0.5, 0.012), (r.uniform(5200, 6100), 0.3, 0.006)], r)
    return fades(y * 0.45, 0.0003, 0.02)


def key_click(r):
    d = 0.08; t = tt(d); n = len(t)
    return fades((hp(r.standard_normal(n), 3000) * np.exp(-t / 0.003) + 0.4 * modal(d, [(r.uniform(3400, 3900), 0.5, 0.008)], r)) * 0.35, 0.0003, 0.015)


def typewriter(r):
    """a short burst of typing: 6-11 key strikes at uneven intervals, each a type-bar slap + body thunk"""
    d = 1.4; n = ns(d); y = np.zeros(n); at = 0.02
    while at < d - 0.12:
        i = ns(at); L = min(ns(0.06), n - i); tl = np.arange(L) / SR
        y[i:i + L] += (bp(r.standard_normal(L), 1500, 7000, 1) * np.exp(-tl / 0.006) + 0.6 * modal(0.06, [(r.uniform(180, 240), 0.8, 0.02)], r)[:L]) * r.uniform(0.6, 1.0)
        at += r.uniform(0.07, 0.17)
    return fades(y * 0.35, 0.001, 0.05)


def coffee_clink(r):
    d = 0.6; t = tt(d)
    return fades(modal(d, [(r.uniform(2900, 3200), 1.0, 0.22), (r.uniform(4700, 5200), 0.5, 0.12), (r.uniform(7800, 8400), 0.25, 0.06)], r) * 0.25, 0.0005, 0.1)


def office_door(r):
    d = 0.9; t = tt(d); n = len(t)
    latch = hp(r.standard_normal(n), 2000) * np.exp(-t / 0.01) * 0.5
    swing = bp(colored(n, r, 0.6), 200, 1200, 1) * np.sin(np.pi * np.clip(t / 0.7, 0, 1)) * 0.2
    thud = lp(r.standard_normal(n), 300, 2) * np.exp(-np.maximum(t - 0.7, 0) / 0.04) * (t > 0.7) * 0.8
    return fades(latch + swing + thud, 0.001, 0.08)


def roller_creak(r, d=2.2):
    """steel rollers under load: low grinding rumble + slow irregular creaks"""
    n = ns(d); t = np.arange(n) / SR
    rum = lp(colored(n, r, 1.2), 160, 2) * (0.7 + 0.3 * smooth_noise(n, r, 2))
    fc = 260 + 90 * smooth_noise(n, r, 0.8)
    creak = np.sin(phase(fc)) * np.clip(smooth_noise(n, r, 3) - 0.3, 0, 1) * 0.35
    return fades(lp(rum + bp(creak, 150, 1600, 1), 2200, 2) * np.clip(t / 0.3, 0, 1) * 0.5, 0.05, 0.4)


def jack_pull(r):
    """screw jack: bar pull (ratchet pawl clicks) + iron thread groan"""
    d = 0.6; n = ns(d); y = np.zeros(n)
    for k in range(5):
        i = ns(0.02 + k * 0.1); L = min(ns(0.02), n - i); tl = np.arange(L) / SR
        y[i:i + L] += hp(r.standard_normal(L), 2200) * np.exp(-tl / 0.003) + 0.4 * np.sin(phase(np.full(L, 2600.0))) * np.exp(-tl / 0.004)
    t = np.arange(n) / SR; groan = np.sin(phase(110 + 30 * t)) * np.sin(np.pi * t / d) * 0.15
    return fades((y * 0.45 + lp(groan, 600, 2)), 0.001, 0.05)


def timber_thud(r):
    d = 0.4; t = tt(d); n = len(t)
    y = lp(r.standard_normal(n), 900, 2) * np.exp(-t / 0.025) + modal(d, [(r.uniform(95, 130), 1.0, 0.07), (r.uniform(260, 320), 0.4, 0.04)], r)
    return fades(y * 0.6, 0.0005, 0.06)


def steel_clank(r):
    d = 1.1; t = tt(d); n = len(t)
    hit = hp(r.standard_normal(n), 1200) * np.exp(-t / 0.006) * 0.6
    ring = modal(d, [(r.uniform(420, 470), 1.0, 0.5), (r.uniform(1180, 1260), 0.6, 0.35), (r.uniform(2300, 2500), 0.35, 0.2)], r)
    return fades((hit + ring) * 0.35, 0.0005, 0.15)


def building_groan(r, d=2.6):
    """deep, slow structural groan as 11,000 tons start to move"""
    n = ns(d); t = np.arange(n) / SR
    f = 42 + 10 * smooth_noise(n, r, 0.5)
    y = np.sin(phase(f)) + 0.5 * np.sin(phase(f * 2.03)) + 0.3 * lp(colored(n, r, 1.0), 120, 2)
    return fades(lp(y, 300, 2) * np.sin(np.pi * t / d) ** 0.8 * 0.45, 0.2, 0.5)


def streetcar_bell(r):
    d = 1.2; t = tt(d)
    y = np.zeros(len(t))
    for at in (0.0, 0.32):
        i = ns(at); L = len(t) - i; tl = np.arange(L) / SR
        y[i:] += (np.sin(phase(np.full(L, 960.0))) + 0.6 * np.sin(phase(np.full(L, 2650.0))) + 0.3 * np.sin(phase(np.full(L, 4100.0)))) * np.exp(-tl / 0.35)
    return fades(lp(y, 5000, 2) * 0.2, 0.0005, 0.1)


def crawler_crane(r, d=3.4):
    """1930 crawler crane: chuffing engine, track clatter tied to speed, approach + recede"""
    n = ns(d); t = np.arange(n) / SR
    rpm = 9 + 2 * np.sin(2 * np.pi * t / d)
    eng = np.sign(np.sin(phase(np.full(n, 0) + rpm * 4))) * 0.25 + lp(colored(n, r, 0.8), 400, 2) * 0.4
    clatter = np.zeros(n)
    for at in np.arange(0, d, 0.09):
        i = ns(at); L = min(ns(0.03), n - i); tl = np.arange(L) / SR; clatter[i:i + L] += hp(r.standard_normal(L), 1500) * np.exp(-tl / 0.005) * r.uniform(0.3, 0.7)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.6
    return fades(lp(eng + clatter * 0.4, 3500, 2) * env * 0.45, 0.1, 0.3)


def plank_step(r):
    d = 0.18; t = tt(d); n = len(t)
    return fades((lp(r.standard_normal(n), 1200, 2) * np.exp(-t / 0.02) + 0.6 * modal(d, [(r.uniform(160, 220), 0.8, 0.05)], r)) * 0.55, 0.0005, 0.04)


def rope_creak(r):
    d = 0.8; n = ns(d); t = np.arange(n) / SR
    return fades(bp(np.sin(phase(320 + 120 * smooth_noise(n, r, 4))) * np.clip(smooth_noise(n, r, 6), 0, 1), 200, 2500, 1) * 0.15, 0.02, 0.1)


# ---------------- beds + music ----------------
def city1930_bed(dur, r):
    """distant 1930 downtown: low traffic rumble, faint streetcar hum, murmur, sparrows"""
    n = ns(dur); out = np.zeros((2, n))
    for ch in range(2):
        out[ch] = lp(colored(n, r, 1.3), 350, 2) * (0.6 + 0.4 * smooth_noise(n, r, 0.2)) * 0.5 + np.sin(phase(np.full(n, 120.0 + ch))) * 0.01
    out += crowd_murmur(dur, r, talkers=5) * 0.18
    for at in np.arange(r.uniform(0.5, 2.0), dur, 2.7):                                  # sparrow chirps
        i = ns(at); L = min(ns(0.08), n - i); tl = np.arange(L) / SR
        c = np.sin(phase(4200 + 1800 * np.sin(2 * np.pi * 18 * tl))) * np.exp(-tl / 0.03) * 0.05
        out[int(r.integers(0, 2)), i:i + L] += c
    return out


def office_bed(dur, r):
    """room tone + muffled far typewriters and voices (never intelligible)"""
    n = ns(dur); out = np.zeros((2, n))
    for ch in range(2): out[ch] = lp(colored(n, r, 1.0), 900, 2) * 0.35
    for at in np.arange(r.uniform(0.2, 1.0), dur, 1.9):
        tw = typewriter(r); i = ns(at); m = min(len(tw), n - i); out[int(r.integers(0, 2)), i:i + m] += lp(tw[:m], 1500, 2) * 0.25
    out += crowd_murmur(dur, r, talkers=3) * 0.1
    return out


def _piano(f, dur, r, vel=0.5):
    n = ns(dur); t = np.arange(n) / SR
    y = sum((0.6 ** k) * np.sin(phase(np.full(n, f * (k + 1) * (1 + 0.0004 * k * k)))) * np.exp(-t / (1.8 / (k + 1))) for k in range(6))
    y += hp(r.standard_normal(n), 3000) * np.exp(-t / 0.004) * 0.05
    return y * vel


def office_piano(dur, r):
    """original sparse, warm 1930s-style piano (gentle swing chords + soft brush) - colour only, far under narration"""
    n = ns(dur); out = np.zeros((2, n))
    C, E, G, A, D, F, B = 261.63, 329.63, 392.0, 440.0, 293.66, 349.23, 246.94
    bar = 2.4; prog = [(C / 2, [E, G, A]), (A / 2, [C, E, G]), (D / 2, [F, A, C * 2]), (G / 2, [B, D * 2, F])]
    k = 0
    for start in np.arange(0, dur, bar):
        root, chord = prog[k % 4]; k += 1
        for beat, notes, vel in [(0.0, [root], 0.45), (0.6, chord, 0.22), (1.2, [root * 1.5], 0.35), (1.8, chord, 0.2)]:
            at = start + beat + (0.08 if beat in (0.6, 1.8) else 0.0)            # swung off-beats
            if at >= dur: continue
            for nf in notes:
                p = _piano(nf, 1.6, r, vel * r.uniform(0.85, 1.0)); i = ns(at); m = min(len(p), n - i)
                pn = r.uniform(-0.3, 0.3); out[0, i:i + m] += p[:m] * (1 - pn) * 0.5; out[1, i:i + m] += p[:m] * (1 + pn) * 0.5
        for b in np.arange(0, bar, bar / 8):                                     # brushes
            at = start + b; i = ns(at); L = min(ns(0.12), n - i)
            if L <= 0: continue
            tl = np.arange(L) / SR; br = bp(r.standard_normal(L), 3000, 9000, 1) * np.exp(-tl / 0.05) * (0.05 if int(b / (bar / 8)) % 2 else 0.03)
            out[:, i:i + L] += br
    return lp(out, 6000, 2) * 0.6
