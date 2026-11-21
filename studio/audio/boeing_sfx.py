# Procedural sounds for "The Fake Neighborhood Above Boeing's Factory" (boeing). Own numpy/scipy synthesis, no
# recordings (all synthesised). Narration first: everything here is mixed well under the voice.
#   factory     pneumatic rivet-gun bursts (with bucking-bar ring), metal tool clinks, sliding hangar-door rumble,
#               a steel-wheeled shop cart rolling, a 1940s truck idling/stopping
#   rooftop     timber hammer blows, hand saw strokes, canvas stretched/flapping, paint roller on tar paper, the
#               derrick's hand winch + ratchet, a bundle of lumber set down, a feather-tree rustle
#   office      a tiny model tree / model house set on the table (small wooden tick), paper slide, a soft idea chime
#   accents     soft air whooshes for the big camera moves (subtle, low), the roof dissolve shimmer
#   beds        factory_floor (big hall: ventilation roar, compressors, distant rivet guns, metal clanks, carts),
#               roof_day (wind on an open roof, gulls + sparrows, distant factory hum under the roof, far city),
#               street1942 (period traffic, factory hum through the doors, birds), aerial_high (high wind + a far
#               propeller drone), office1942 (room tone, ticking clock, faint factory through the window)
import numpy as np
from dsp import SR, ns, tt, lp, hp, bp, colored, smooth_noise, fades, modal, phase, st


def _e(t, a, d):
    return np.clip(t / max(a, 1e-4), 0, 1) * np.exp(-t / d)


def _env(t, pts):
    xs, ys = zip(*pts); return np.interp(t, xs, ys)


# ---------------------------------------------------------------- factory
def rivet_burst(r):
    """pneumatic rivet gun: a 0.5-1.1 s burst of ~22 Hz hammer blows with metallic ring + air hiss"""
    d = r.uniform(0.5, 1.1); n = ns(d + 0.4); y = np.zeros(n); rate = r.uniform(19, 25)
    for k in range(int(d * rate)):
        i = max(0, ns(k / rate + r.uniform(-0.002, 0.002))); L = ns(0.05)
        if i + L >= n: break
        hit = modal(0.05, [(r.uniform(1800, 2300), 0.6, 0.012), (r.uniform(3900, 4600), 0.35, 0.008), (r.uniform(700, 900), 0.4, 0.02)], r)[:L]
        y[i:i + L] += hit * r.uniform(0.75, 1.0)
    hiss = bp(r.standard_normal(n), 2500, 9000, 1) * 0.05 * np.clip((d + 0.05 - np.arange(n) / SR) / 0.05, 0, 1)
    return fades(y + hiss, 0.002, 0.08)


def tool_clink(r):
    """a wrench / bucking bar set down on steel"""
    d = 0.5; return fades(modal(d, [(r.uniform(2400, 3000), 0.6, 0.06), (r.uniform(5200, 6100), 0.3, 0.03), (r.uniform(900, 1200), 0.3, 0.05)], r), 0.0005, 0.1)


def hangar_door(r):
    """a big steel door leaf rolling on its track: low rumble with wheel ticks, a clank at the stop"""
    d = 3.2; n = ns(d); t = np.arange(n) / SR
    rum = lp(colored(n, r, 1.6), 180, 2) * 0.6 * _env(t, [(0, 0), (0.4, 1), (2.6, 1), (2.8, 0.2), (3.2, 0)])
    tick = np.zeros(n)
    for at in np.arange(0.3, 2.7, 0.21): i = ns(at + r.uniform(-0.02, 0.02)); L = ns(0.03); tick[i:i + L] += modal(0.03, [(r.uniform(600, 800), 0.2, 0.01)], r)[:L]
    stop = np.zeros(n); i = ns(2.75); L = ns(0.4); stop[i:i + L] = modal(0.4, [(180, 0.8, 0.12), (420, 0.4, 0.06), (1300, 0.2, 0.03)], r)[:L]
    return st(fades(rum + tick + stop * 0.8, 0.02, 0.2))


def cart_roll(r):
    """steel-wheeled shop cart rolling over concrete joints"""
    d = 2.4; n = ns(d); t = np.arange(n) / SR; base = bp(colored(n, r, 1.0), 150, 1200, 1) * 0.25
    bumps = np.zeros(n)
    for at in np.arange(0.2, d - 0.2, 0.42): i = ns(at); L = ns(0.06); bumps[i:i + L] += modal(0.06, [(r.uniform(220, 300), 0.6, 0.02), (r.uniform(900, 1100), 0.2, 0.01)], r)[:L]
    return st(fades((base + bumps) * _env(t, [(0, 0), (0.3, 1), (d - 0.4, 1), (d, 0)]), 0.02, 0.2))


def truck42(r):
    """1940s petrol truck rolling in, slowing, idling: low 6-cylinder burble, gear whine, brake squeal at the stop"""
    d = 4.5; n = ns(d); t = np.arange(n) / SR; f0 = _env(t, [(0, 34), (2.8, 26), (3.4, 17), (d, 16)]) * (1 + 0.03 * smooth_noise(n, r, 0.8))
    eng = sum((0.9 / k) * np.sin(phase(f0 * k)) for k in range(1, 9)) * (1 + 0.3 * np.sin(phase(f0 * 0.5)))
    eng = lp(eng, 700, 2) * 0.32 + lp(colored(n, r, 1.5), 250, 2) * 0.1
    tyre = bp(colored(n, r, 1.0), 200, 1400, 1) * 0.08 * _env(t, [(0, 1), (3.3, 0.6), (3.5, 0)])
    sq = np.sin(phase(np.full(n, 2600.0) * (1 + 0.012 * smooth_noise(n, r, 7)))) * _env(t, [(0, 0), (2.9, 0), (3.1, 0.02), (3.45, 0)])
    return st(fades((eng + tyre + sq) * _env(t, [(0, 0.4), (0.8, 1), (d, 0.8)]), 0.05, 0.3))


# ---------------------------------------------------------------- rooftop construction
def hammer_wood(r):
    """framing hammer on a timber stud: thud + woody knock"""
    d = 0.35; return fades(modal(d, [(r.uniform(320, 420), 0.8, 0.03), (r.uniform(900, 1200), 0.5, 0.015), (r.uniform(2400, 2900), 0.25, 0.006)], r) + bp(r.standard_normal(ns(d)), 600, 4000, 1) * _e(tt(d), 0.0005, 0.008) * 0.4, 0.0005, 0.06)


def saw_stroke(r):
    """one push + pull of a hand saw through a board"""
    d = 0.9; n = ns(d); t = np.arange(n) / SR; strokes = np.abs(np.sin(np.pi * t / 0.45)) ** 1.5
    teeth = bp(r.standard_normal(n), 1500, 7000, 2) * (1 + 0.5 * np.sin(2 * np.pi * 85 * t)) * 0.4
    return fades(teeth * strokes, 0.01, 0.05)


def canvas_flap(r):
    """canvas sheet pulled taut / flapping as it is stretched over the frame"""
    d = 0.8; n = ns(d); t = np.arange(n) / SR; y = bp(colored(n, r, 0.8), 200, 3500, 1) * _env(t, [(0, 0), (0.06, 1), (0.25, 0.5), (0.35, 0.9), (0.8, 0)])
    return fades(y * 0.5, 0.005, 0.1)


def paint_roll(r):
    """paint roller rolling on the tar-paper road: soft sticky squish"""
    d = 1.4; n = ns(d); t = np.arange(n) / SR; y = bp(colored(n, r, 0.6), 400, 3000, 1) * (0.6 + 0.4 * np.sin(2 * np.pi * 3.2 * t) ** 2) * _env(t, [(0, 0), (0.2, 1), (1.2, 1), (1.4, 0)])
    return fades(y * 0.35, 0.01, 0.1)


def winch_ratchet(r):
    """the derrick's hand winch: pawl clicks + rope creak"""
    d = 2.6; n = ns(d); y = np.zeros(n)
    for at in np.arange(0.05, d - 0.1, 0.13 + r.uniform(-0.01, 0.01)): i = ns(at); L = ns(0.03); y[i:i + L] += modal(0.03, [(r.uniform(2800, 3300), 0.4, 0.006), (r.uniform(1100, 1300), 0.2, 0.008)], r)[:L]
    creak = bp(np.sign(np.sin(phase(np.full(n, 180.0) * (1 + 0.1 * smooth_noise(n, r, 2))))), 400, 2000, 1) * 0.02 * (smooth_noise(n, r, 1.5) > 0.3)
    return fades(y + creak, 0.01, 0.1)


def bundle_land(r):
    """a bundle of lumber set down on the roof deck"""
    d = 0.7; return fades(modal(d, [(r.uniform(90, 130), 1.0, 0.09), (r.uniform(300, 380), 0.5, 0.04), (r.uniform(800, 1000), 0.25, 0.02)], r) + bp(r.standard_normal(ns(d)), 300, 3000, 1) * _e(tt(d), 0.001, 0.03) * 0.3, 0.001, 0.15)


def board_pick(r):
    """a board lifted off the pile (wood scrape + knock)"""
    d = 0.6; n = ns(d); t = np.arange(n) / SR; scrape = bp(colored(n, r, 0.5), 500, 4000, 1) * _env(t, [(0, 0), (0.05, 0.6), (0.3, 0.3), (0.4, 0)])
    return fades(scrape * 0.4 + modal(d, [(r.uniform(500, 650), 0.4, 0.02)], r) * 0.5, 0.003, 0.1)


# ---------------------------------------------------------------- office
def model_tick(r):
    """a tiny model tree / house set down on the model board"""
    d = 0.25; return fades(modal(d, [(r.uniform(1700, 2200), 0.5, 0.012), (r.uniform(4200, 5000), 0.2, 0.006)], r), 0.0003, 0.05)


def paper_slide(r):
    d = 0.7; n = ns(d); t = np.arange(n) / SR; return fades(bp(colored(n, r, 0.3), 1200, 8000, 1) * _env(t, [(0, 0), (0.1, 0.5), (0.5, 0.3), (0.7, 0)]) * 0.3, 0.01, 0.1)


def soft_whoosh(r):
    """a soft, low air whoosh for a big camera move (pre-rolled so the peak lands on the cue)"""
    d = 1.6; n = ns(d); t = np.arange(n) / SR; f = _env(t, [(0, 300), (1.0, 1400), (1.6, 500)])
    y = np.zeros(n); x = colored(n, r, 1.0)
    for i0 in range(0, n, 2048):
        i1 = min(n, i0 + 2048); y[i0:i1] = bp(x[max(0, i0 - 512):i1], float(f[i0]) * 0.5, float(f[i0]) * 1.6, 1)[-(i1 - i0):]
    return st(fades(y * _env(t, [(0, 0), (1.0, 1), (1.6, 0)]) * 0.5, 0.05, 0.2))


def reveal_shimmer(r):
    """the roof dissolving away: a slow airy swell with soft high partials (no sci-fi)"""
    d = 2.6; n = ns(d); t = np.arange(n) / SR; air = bp(colored(n, r, 0.8), 800, 6000, 1) * _env(t, [(0, 0), (1.4, 0.6), (2.6, 0)])
    tone = sum(np.sin(phase(np.full(n, f))) * a for f, a in [(880, 0.02), (1320, 0.012), (1760, 0.008)]) * _env(t, [(0, 0), (1.2, 1), (2.6, 0)])
    return st(fades(air * 0.4 + tone, 0.05, 0.3))


# ---------------------------------------------------------------- beds
def _gulls(n, r, rate=0.12):
    y = np.zeros(n)
    for _ in range(r.poisson(rate * n / SR)):
        i = r.integers(0, max(1, n - ns(1.2))); m = r.integers(2, 4)
        for k in range(m):
            L = ns(r.uniform(0.18, 0.3)); j = i + k * ns(r.uniform(0.25, 0.35))
            if j + L >= n: break
            tl = np.arange(L) / SR; f = np.interp(tl, [0, tl[-1] * 0.3, tl[-1]], [1500, 2100, 1300]) * r.uniform(0.85, 1.1)
            y[j:j + L] += bp(np.sign(np.sin(phase(f))) * 0.3 + np.sin(phase(f)), 900, 4000, 1) * np.sin(np.pi * tl / tl[-1]) * 0.02
    return y


def _sparrows(n, r, rate=0.5):
    y = np.zeros(n)
    for _ in range(r.poisson(rate * n / SR)):
        i = r.integers(0, max(1, n - ns(0.6))); m = r.integers(2, 6)
        for k in range(m):
            L = ns(r.uniform(0.04, 0.09)); j = i + k * ns(r.uniform(0.06, 0.11)); f0 = r.uniform(3500, 5200)
            if j + L >= n: break
            tl = np.arange(L) / SR; y[j:j + L] += np.sin(phase(np.linspace(f0, f0 * r.uniform(0.75, 1.25), L))) * np.sin(np.pi * tl / tl[-1]) * 0.04
    return y


def _wind(n, r, level=1.0, bright=900):
    return bp(colored(n, r, 1.3), 60, bright, 1) * 0.3 * (0.55 + 0.45 * smooth_noise(n, r, 0.12)) * level


def _far_rivets(n, r, rate=0.6, level=1.0):
    y = np.zeros(n)
    for _ in range(r.poisson(rate * n / SR)):
        b = rivet_burst(r)[:n]; i = r.integers(0, max(1, n - len(b) + 1)); y[i:i + len(b)] += b * r.uniform(0.3, 1.0)
    return lp(y, 2600, 2) * 0.25 * level


def _clanks(n, r, rate=0.25):
    y = np.zeros(n)
    for _ in range(r.poisson(rate * n / SR)):
        b = tool_clink(r)[:n]; i = r.integers(0, max(1, n - len(b) + 1)); y[i:i + len(b)] += b * r.uniform(0.2, 0.6)
    return lp(y, 3500, 2) * 0.3


def _machine(n, r):
    t = np.arange(n) / SR
    comp = sum(np.sin(phase(np.full(n, f))) * a for f, a in [(58, 0.03), (116, 0.015), (174, 0.006)]) * (1 + 0.15 * np.sin(2 * np.pi * 0.9 * t))
    vent = lp(colored(n, r, 1.1), 1200, 2) * 0.18
    return comp + vent


def factory_floor(d, r):
    n = ns(d); return np.stack([_machine(n, r) + _far_rivets(n, r) + _clanks(n, r), _machine(n, r) + _far_rivets(n, r) + _clanks(n, r)])


def roof_day(d, r):
    n = ns(d); under = lambda: lp(_machine(n, r) + _far_rivets(n, r, 0.4), 500, 2) * 0.35
    return np.stack([_wind(n, r) + _gulls(n, r) + _sparrows(n, r, 0.35) + under(), _wind(n, r) + _gulls(n, r) + _sparrows(n, r, 0.35) + under()])


def street1942(d, r):
    n = ns(d); traffic = lambda: lp(colored(n, r, 1.8), 400, 2) * 0.22 + bp(colored(n, r, 1.0), 300, 1500, 1) * 0.04 * (0.6 + 0.4 * smooth_noise(n, r, 0.15))
    plant = lambda: lp(_machine(n, r) + _far_rivets(n, r, 0.8) + _clanks(n, r, 0.3), 1800, 2) * 0.5
    return np.stack([traffic() + plant() + _sparrows(n, r, 0.3), traffic() + plant() + _sparrows(n, r, 0.3)])


def aerial_high(d, r):
    n = ns(d); t = np.arange(n) / SR; drone = lp(sum(np.sin(phase(np.full(n, 92.0 * k) * (1 + 0.01 * np.sin(2 * np.pi * 0.07 * t)))) / k for k in range(1, 6)), 600, 2) * 0.03 * (0.5 + 0.5 * np.sin(2 * np.pi * t / max(d, 1)) ** 2)
    return np.stack([_wind(n, r, 1.2, 1400) + drone, _wind(n, r, 1.2, 1400) + drone * 0.8])


def office1942(d, r):
    n = ns(d); room = lambda: lp(colored(n, r, 1.3), 700, 2) * 0.12
    clock = np.zeros(n)
    for k, at in enumerate(np.arange(0.2, d, 1.0)):
        i = ns(at); L = ns(0.04)
        if i + L < n: clock[i:i + L] += modal(0.04, [(2100 if k % 2 else 2500, 0.03, 0.006)], r)[:L]
    plant = lp(_machine(n, r) + _far_rivets(n, r, 0.5), 400, 2) * 0.25
    return np.stack([room() + clock + plant, room() + np.roll(clock, 40) + plant])
