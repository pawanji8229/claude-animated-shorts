# Procedural sounds for "The Light Bulb That Has Been Glowing Since 1901" (centennial). Own numpy/scipy synthesis,
# no recordings. Everything quiet and natural (narration first), nothing cartoonish:
#   the bulb    filament "tink" + faint electrical hum swell when it lights, the brief buzzing flicker + soft snap of
#               an ordinary bulb burning out, brass threads squeaking as a bulb is screwed in, the hum stopping when
#               the Centennial goes dark (2013), the relight
#   1901 house  wooden stepladder creaks, match strike + flare + lantern chimney clink, canvas hose being coiled, rag
#               polishing brass, the wall clock in the bed
#   1976 move   wire-cutter snip of the cord, padded box lid closing, the cab-forward diesel tracking alongside
#               (engine + gearbox whine + tyre roar), arrival (decel), steel rolling-ladder steps, flashlight click,
#               power-box door latch
#   beds        firehouse1901 (wooden hall tone, sparrows outside, distant hoof-less street life, clock), street1901
#               (breeze, sparrows, far voices), night1901 (crickets, a far dog, lantern hiss, clock), firehouse_mid
#               (hall tone + distant traffic), street1976 (traffic), s6_dusk / s6_night / s6_day (HVAC hum + fridge-like
#               electrical hum, distant road, crickets at night, birds by day), s6_ext (road + birds)
import numpy as np
from dsp import SR, ns, tt, lp, hp, bp, colored, smooth_noise, fades, modal, phase, st


def _e(t, a, d):
    return np.clip(t / max(a, 1e-4), 0, 1) * np.exp(-t / d)


# ---------------------------------------------------------------- the bulb
def filament_on(r):
    """a lamp coming on: tiny metallic tink + soft 60 Hz hum swell that settles low"""
    d = 1.4; t = tt(d); n = len(t)
    tink = modal(d, [(r.uniform(4200, 4700), 0.5, 0.025), (r.uniform(7600, 8200), 0.25, 0.012)], r)
    hum = (np.sin(phase(np.full(n, 120.0))) + 0.4 * np.sin(phase(np.full(n, 240.0))) + 0.15 * np.sin(phase(np.full(n, 360.0)))) * np.clip(t / 0.08, 0, 1) * (0.25 + 0.75 * np.exp(-t / 0.35))
    return fades(tink * 0.4 + hum * 0.05, 0.0005, 0.3)


def bulb_burnout(r):
    """an ordinary bulb failing: a short buzzing flicker (irregular 60-120 Hz bursts) and a soft filament snap"""
    d = 0.9; t = tt(d); n = len(t)
    gate = (smooth_noise(n, r, 25) > -0.1).astype(float) * np.clip((0.55 - t) / 0.05, 0, 1)
    buzz = bp(np.sign(np.sin(phase(np.full(n, 120.0)))) * 0.5 + colored(n, r, 0.5) * 0.3, 200, 3000, 1) * gate * 0.12
    i = ns(0.55); snap = np.zeros(n); L = ns(0.05); snap[i:i + L] = hp(r.standard_normal(L), 2500) * np.exp(-np.arange(L) / (0.006 * SR)) * 0.35
    ring = np.zeros(n); ring[i:] = modal(d - 0.55, [(r.uniform(3100, 3500), 0.12, 0.05), (r.uniform(5900, 6400), 0.06, 0.03)], r)[: n - i]
    return fades(buzz + snap + ring, 0.002, 0.08)


def screw_bulb(r):
    """brass base threading into a socket: 4-6 small squeaky ticks with a glassy undertone"""
    d = 1.2; n = ns(d); y = np.zeros(n); at = 0.03
    while at < d - 0.15:
        i = ns(at); L = ns(0.09); tl = np.arange(L) / SR
        sq = np.sin(phase(np.linspace(r.uniform(1800, 2200), r.uniform(2500, 3000), L))) * np.exp(-tl / 0.03) * 0.25
        y[i:i + L] += sq + bp(r.standard_normal(L), 3000, 9000, 1) * np.exp(-tl / 0.006) * 0.2
        at += r.uniform(0.16, 0.26)
    return fades(y * 0.6, 0.001, 0.05)


def bulb_dark(r):
    """the Centennial goes dark (power supply fails): a dull relay tick, the hum dropping away"""
    d = 0.9; t = tt(d); n = len(t)
    tick = hp(r.standard_normal(n), 1500) * np.exp(-t / 0.004) * 0.4 + modal(d, [(r.uniform(900, 1100), 0.25, 0.03)], r)
    hum = (np.sin(phase(np.full(n, 120.0))) + 0.4 * np.sin(phase(np.full(n, 240.0)))) * np.exp(-t / 0.12) * 0.05
    return fades(tick + hum, 0.0005, 0.1)


# ---------------------------------------------------------------- 1901 house
def ladder_creak(r):
    """wooden stepladder taking weight: a low woody creak + leg scrape"""
    d = 0.7; t = tt(d); n = len(t)
    f = np.linspace(r.uniform(240, 300), r.uniform(170, 210), n) * (1 + 0.04 * smooth_noise(n, r, 9))
    cr = bp(np.sign(np.sin(phase(f))) * 0.5, 150, 1800, 1) * np.sin(np.pi * np.clip(t / 0.45, 0, 1)) ** 2 * 0.16
    scrape = bp(colored(n, r, 0.5), 600, 3500, 1) * _e(t, 0.01, 0.08) * 0.08
    return fades(cr + scrape, 0.005, 0.08)


def match_strike(r):
    """match struck on a box, flares, lantern wick catches; glass chimney set back with a clink"""
    d = 1.7; t = tt(d); n = len(t)
    strike = bp(colored(n, r, 0.3), 1500, 9000, 1) * curve_env(t, [(0, 0), (0.02, 1), (0.16, 0.6), (0.22, 0)]) * 0.35
    flare = bp(colored(n, r, 1.0), 200, 3000, 1) * curve_env(t, [(0.15, 0), (0.25, 1), (0.6, 0.35), (1.1, 0.1), (1.7, 0.05)]) * 0.22
    clink = np.zeros(n); i = ns(1.2); clink[i:] = modal(d - 1.2, [(r.uniform(2400, 2700), 0.3, 0.12), (r.uniform(5300, 5800), 0.15, 0.06)], r)[: n - i]
    return fades(strike + flare + clink, 0.001, 0.1)


def curve_env(t, pts):
    return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])


def hose_coil(r):
    """canvas hose flopped and coiled: soft fabric thumps + rustle"""
    d = 1.6; n = ns(d); y = bp(colored(n, r, 0.8), 150, 2500, 1) * (0.25 + 0.2 * smooth_noise(n, r, 3)) * 0.12
    for at in np.arange(0.1, d - 0.2, r.uniform(0.35, 0.5)):
        i = ns(at); L = ns(0.12); y[i:i + L] += lp(r.standard_normal(L), 400, 2) * np.exp(-np.arange(L) / (0.025 * SR)) * 0.35
    return fades(y, 0.01, 0.1)


def polish_rag(r):
    """rag rubbed on brass: rhythmic soft squeaky swishes"""
    d = 1.8; t = tt(d); n = len(t)
    env = (0.5 + 0.5 * np.sin(2 * np.pi * 2.6 * t)) ** 2
    return fades(bp(colored(n, r, 0.2), 1500, 7000, 1) * env * 0.1, 0.02, 0.1)


def lantern_hiss(r, d=2.0):
    n = ns(d); return bp(colored(n, r, 0.6), 2000, 6000, 1) * 0.02 * (0.8 + 0.2 * smooth_noise(n, r, 4))


# ---------------------------------------------------------------- 1976 move + 2013
def cord_snip(r):
    """wire cutters through a cloth cord: crunch + steel snap"""
    d = 0.4; t = tt(d); n = len(t)
    crunch = bp(r.standard_normal(n), 1200, 6000, 1) * _e(t, 0.002, 0.02) * 0.45
    snap = modal(d, [(r.uniform(3800, 4300), 0.25, 0.03), (r.uniform(6900, 7400), 0.15, 0.015)], r)
    return fades(crunch + snap, 0.0005, 0.05)


def box_lid(r):
    """padded wooden box lid closing: soft woody thump + latch"""
    d = 0.6; t = tt(d); n = len(t)
    thump = lp(r.standard_normal(n), 500, 2) * _e(t, 0.002, 0.03) * 0.8 + modal(d, [(r.uniform(180, 230), 0.4, 0.05)], r)
    latch = np.zeros(n); i = ns(0.25); L = ns(0.05); latch[i:i + L] = hp(r.standard_normal(L), 2500) * np.exp(-np.arange(L) / (0.004 * SR)) * 0.4
    return fades(thump * 0.6 + latch, 0.0005, 0.08)


def engine76(r, d=3.0):
    """cab-forward diesel pumper rolling past at walking pace: low engine harmonics, gearbox whine, tyre roar"""
    n = ns(d); t = np.arange(n) / SR; f0 = 38 * (1 + 0.04 * smooth_noise(n, r, 0.5))
    eng = sum((0.9 / k) * np.sin(phase(f0 * k)) for k in range(1, 9)) * (1 + 0.25 * np.sin(phase(f0 / 2)))
    eng = lp(eng, 900, 2) * 0.35 + lp(colored(n, r, 1.4), 300, 2) * 0.15
    whine = np.sin(phase(np.full(n, 640.0) * (1 + 0.02 * smooth_noise(n, r, 1)))) * 0.012
    tyre = bp(colored(n, r, 1.0), 200, 1500, 1) * 0.08
    y = (eng + whine + tyre) * np.clip(t / 0.4, 0, 1) * np.clip((d - t) / 0.4, 0, 1)
    return st(fades(y, 0.01, 0.2))


def engine_arrive(r):
    """diesel slowing to a stop: revs falling, brake squeal hint, engine to idle"""
    d = 3.2; n = ns(d); t = np.arange(n) / SR; f0 = np.interp(t, [0, 2.2, 3.2], [52, 30, 28])
    eng = sum((0.9 / k) * np.sin(phase(f0 * k)) for k in range(1, 8)); eng = lp(eng, 800, 2) * 0.33
    sq = np.sin(phase(np.full(n, 2300.0) * (1 + 0.01 * smooth_noise(n, r, 6)))) * curve_env(t, [(0, 0), (1.9, 0), (2.1, 0.03), (2.4, 0)])
    hiss = np.zeros(n); i = ns(2.5); L = ns(0.4); hiss[i:i + L] = bp(r.standard_normal(L), 2000, 8000, 1) * np.exp(-np.arange(L) / (0.12 * SR)) * 0.12
    return st(fades((eng + sq + hiss) * np.clip(t / 0.3, 0, 1), 0.01, 0.3))


def ladder_steel(r):
    """foot on a steel rolling-ladder step: dull clang with a ringing tail"""
    d = 0.5; t = tt(d); n = len(t)
    return fades(lp(r.standard_normal(n), 900, 2) * _e(t, 0.001, 0.02) * 0.5 + modal(d, [(r.uniform(620, 700), 0.18, 0.08), (r.uniform(1500, 1650), 0.1, 0.05), (r.uniform(2900, 3200), 0.05, 0.03)], r), 0.0005, 0.05)


def flashlight_click(r):
    d = 0.1; t = tt(d); n = len(t)
    return fades(hp(r.standard_normal(n), 2500) * np.exp(-t / 0.003) * 0.4 + modal(d, [(r.uniform(2800, 3300), 0.25, 0.01)], r), 0.0003, 0.02)


def box_latch(r):
    """grey power-supply box door: latch click + small hinge creak"""
    d = 0.55; t = tt(d); n = len(t)
    click = hp(r.standard_normal(n), 2000) * np.exp(-t / 0.005) * 0.4
    hinge = np.sin(phase(np.linspace(1300, 900, n))) * curve_env(t, [(0, 0), (0.08, 0), (0.15, 0.06), (0.4, 0)])
    return fades(click + hinge, 0.0005, 0.06)


def cord_unroll(r):
    """extension cord pulled off a coil and dropped on the floor"""
    d = 1.0; t = tt(d); n = len(t)
    rub = bp(colored(n, r, 0.6), 300, 3000, 1) * curve_env(t, [(0, 0), (0.05, 1), (0.6, 0.6), (0.75, 0)]) * 0.12
    flop = np.zeros(n); i = ns(0.75); L = ns(0.15); flop[i:i + L] = lp(r.standard_normal(L), 500, 2) * np.exp(-np.arange(L) / (0.03 * SR)) * 0.35
    return fades(rub + flop, 0.005, 0.08)


# ---------------------------------------------------------------- beds (stereo, loop-safe by the mixer)
def _hall(n, r, bright=900):
    return lp(colored(n, r, 1.3), bright, 2) * 0.22 + bp(colored(n, r, 0.6), 200, 2400, 1) * 0.03


def _sparrows(n, r, rate=0.5):
    y = np.zeros(n)
    for _ in range(r.poisson(rate * n / SR)):
        i = r.integers(0, n - ns(0.6)); m = r.integers(2, 6)
        for k in range(m):
            L = ns(r.uniform(0.04, 0.09)); j = i + k * ns(r.uniform(0.06, 0.11)); f0 = r.uniform(3500, 5200)
            if j + L >= n: break
            tl = np.arange(L) / SR; y[j:j + L] += np.sin(phase(np.linspace(f0, f0 * r.uniform(0.75, 1.25), L))) * np.sin(np.pi * tl / tl[-1]) * 0.05
    return y


def _clock(n, r, rate=1.0):
    y = np.zeros(n)
    for k, at in enumerate(np.arange(0.2, n / SR, 1 / rate)):
        i = ns(at); L = ns(0.04)
        if i + L < n: y[i:i + L] += modal(0.04, [(2100 if k % 2 else 2500, 0.03, 0.006)], r)[:L]
    return y


def _crickets(n, r):
    y = np.zeros(n); t = np.arange(n) / SR
    for _ in range(5):
        f = r.uniform(3800, 4800); rate = r.uniform(14, 20); ph = r.uniform(0, 6)
        gate = (np.sin(2 * np.pi * rate * t + ph) > 0.3).astype(float) * (np.sin(2 * np.pi * r.uniform(0.3, 0.7) * t + ph) > -0.2)
        y += np.sin(phase(np.full(n, f))) * lp(gate, 200, 1) * 0.012
    return y


def _traffic(n, r, level=1.0):
    return (lp(colored(n, r, 1.8), 400, 2) * 0.25 + bp(colored(n, r, 1.0), 300, 1500, 1) * 0.04 * (0.6 + 0.4 * smooth_noise(n, r, 0.15))) * level


def _hum(n, r):
    t = np.arange(n) / SR
    return (np.sin(phase(np.full(n, 120.0))) * 0.012 + np.sin(phase(np.full(n, 240.0))) * 0.006) * (1 + 0.1 * np.sin(2 * np.pi * 0.2 * t)) + lp(colored(n, r, 1.0), 600, 2) * 0.06


def firehouse1901(d, r):
    n = ns(d); L = _hall(n, r) + _sparrows(n, r, 0.35) * 0.6 + _clock(n, r); R = _hall(n, r) + _sparrows(n, r, 0.35) * 0.6 + np.roll(_clock(n, r), 40)
    return np.stack([L, R])


def street1901(d, r):
    n = ns(d); w = lambda: bp(colored(n, r, 1.2), 150, 1800, 1) * 0.07 * (0.6 + 0.4 * smooth_noise(n, r, 0.2))
    return np.stack([w() + _sparrows(n, r, 0.9), w() + _sparrows(n, r, 0.9)])


def night1901(d, r):
    n = ns(d); dog = np.zeros(n); i = ns(min(d - 1, 1.3))
    for k in range(2):
        L = ns(0.18); j = i + k * ns(0.32); tl = np.arange(L) / SR; dog[j:j + L] += bp(np.sign(np.sin(phase(np.linspace(520, 380, L)))), 300, 1600, 1) * np.sin(np.pi * tl / tl[-1]) * 0.012
    L = _hall(n, r, 700) * 0.6 + _crickets(n, r) + _clock(n, r) + lantern_hiss(r, d); R = _hall(n, r, 700) * 0.6 + _crickets(n, r) + np.roll(_clock(n, r), 40) + dog * 0.6
    return np.stack([L + dog * 0.4, R])


def firehouse_mid(d, r):
    n = ns(d); return np.stack([_hall(n, r) + _traffic(n, r, 0.6) + _clock(n, r) * 0.7, _hall(n, r) + _traffic(n, r, 0.6)])


def street1976(d, r):
    n = ns(d); return np.stack([_traffic(n, r, 1.4) + _sparrows(n, r, 0.3) * 0.5, _traffic(n, r, 1.4)])


def s6_dusk(d, r):
    n = ns(d); return np.stack([_hum(n, r) + _traffic(n, r, 0.4) + _crickets(n, r) * 0.4, _hum(n, r) + _traffic(n, r, 0.4) + _crickets(n, r) * 0.4])


def s6_night(d, r):
    n = ns(d); return np.stack([_hum(n, r) * 0.8 + _crickets(n, r) * 0.7 + _traffic(n, r, 0.2), _hum(n, r) * 0.8 + _crickets(n, r) * 0.7])


def s6_day(d, r):
    n = ns(d); return np.stack([_hum(n, r) + _traffic(n, r, 0.6) + _sparrows(n, r, 0.4) * 0.5, _hum(n, r) + _traffic(n, r, 0.6) + _sparrows(n, r, 0.4) * 0.5])


def s6_ext(d, r):
    n = ns(d); return np.stack([_traffic(n, r, 1.2) + _sparrows(n, r, 0.6), _traffic(n, r, 1.2) + _sparrows(n, r, 0.6)])
