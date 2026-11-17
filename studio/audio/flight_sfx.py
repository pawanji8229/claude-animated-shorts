# Procedural sounds for "The World's Shortest Scheduled Flight" (flight). Own numpy/scipy synthesis, no recordings.
# Aircraft: twin flat-six piston engines with two-blade props (blade-pass ~ 2 x rev/s, firing ~ 3 x rev/s per engine,
# the two engines slightly detuned so they beat), exterior / cabin / distant drones, starter crank -> catch -> idle,
# taxi (idle + tyres on gravel), take-off power, touchdown chirp, roll-out on grass, spin-down with cooling ticks.
# Cabin: lap-belt latch click, belt webbing slide, seat creak, bag set down, light aluminium aircraft door.
# Outdoors: gravel / grass footsteps (left + right variants), windsock flutter, oystercatcher pipe, distant sheep,
# beds for the airfield (coastal wind, grass, far surf, larks), altitude wind, comic accents (brow pluck, watch tick).
import numpy as np
from dsp import SR, ns, tt, lp, hp, bp, colored, smooth_noise, fades, modal, phase, st


def _engine(n, r, rev, k_fire=1.0, k_blade=1.0, rough=0.25, detune=0.012):
    """two engines (stereo-ish pair returned as mono sum): rev = revolutions per second array (len n)"""
    y = np.zeros(n)
    for e in range(2):
        rv = rev * (1 + (detune if e else -detune) * 0.5) * (1 + 0.004 * smooth_noise(n, r, 0.7))
        bpf, fire = 2 * rv, 3 * rv                                   # blade-pass, firing frequency
        jit = 1 + rough * 0.06 * smooth_noise(n, r, 9)
        tone = np.zeros(n)
        for h, a in [(1, 1.0), (2, 0.55), (3, 0.32), (4, 0.2), (5, 0.12), (6, 0.07)]: tone += a * np.sin(phase(bpf * h * jit) + r.uniform(0, 6.28))
        fir = np.zeros(n)
        for h, a in [(1, 0.7), (2, 0.4), (3, 0.25), (4, 0.15)]: fir += a * np.sin(phase(fire * h) + r.uniform(0, 6.28))
        # exhaust bark: firing-rate amplitude modulation of a noise band
        bark = bp(colored(n, r, 0.6), 120, 900) * (0.6 + 0.4 * np.sin(phase(fire)))
        y += k_blade * tone * 0.5 + k_fire * fir * 0.35 + bark * 0.5 * k_fire
    return y


def _drone(dur, r, rpsv, cutoff, air=0.3, rattle=0.0):
    n = ns(dur); out = np.zeros((2, n)); rev = np.full(n, rpsv)
    eng = lp(_engine(n, r, rev), cutoff, 2)
    for ch in range(2):
        wind = bp(colored(n, r, 0.8), 150, 3000) * (0.6 + 0.4 * smooth_noise(n, r, 0.6)) * air
        x = eng * (0.9 + 0.1 * ch) + wind
        if rattle > 0:
            for at in np.arange(0, dur, 0.06):
                if r.random() < 0.18: i = ns(at + r.uniform(0, 0.05)); L = min(ns(0.012), n - i); x[i:i + L] += bp(colored(L, r, 0.0), 1500, 6000) * np.exp(-np.arange(L) / (SR * 0.002)) * rattle * r.uniform(0.3, 1)
        out[ch] = x
    return out


def ext_cruise_bed(dur, r):
    """alongside the aircraft in flight: twin prop drone (blade-pass ~76 Hz), airflow rush"""
    return _drone(dur, r, 38.0, 2400, air=0.55)


def int_cruise_bed(dur, r):
    """inside the small cabin: the same engines muffled through the skin, low hum, vent hiss, tiny panel rattles"""
    x = _drone(dur, r, 38.0, 650, air=0.18, rattle=0.25)
    n = x.shape[1]
    for ch in range(2): x[ch] += hp(colored(n, r, 0.1), 3000, 2) * 0.04 + lp(colored(n, r, 1.5), 90, 2) * 0.6
    return x


def aerial_bed(dur, r):
    """high above the sound: altitude wind + a faint distant prop drone"""
    n = ns(dur); out = np.zeros((2, n)); far = lp(_engine(n, r, np.full(n, 38.0), k_fire=0.5), 500, 2) * 0.12
    for ch in range(2): out[ch] = lp(colored(n, r, 1.0), 900, 2) * (0.5 + 0.5 * smooth_noise(n, r, 0.25)) * 0.9 + far
    return out


def approach_bed(dur, r):
    """alongside on approach: lower power (blade-pass ~68 Hz), gusty wind"""
    x = _drone(dur, r, 34.0, 2000, air=0.7); n = x.shape[1]
    g = 0.7 + 0.3 * smooth_noise(n, r, 0.5)
    return x * g[None, :]


def airfield_bed(dur, r):
    """island airfield, engines off: steady coastal wind, grass rustle, far surf on the rocks, skylark trills, a far gull"""
    n = ns(dur); out = np.zeros((2, n))
    for ch in range(2):
        wind = lp(colored(n, r, 1.0), 700, 2) * (0.55 + 0.45 * smooth_noise(n, r, 0.18)) * 0.9
        grass = hp(colored(n, r, 0.3), 2200, 2) * 0.05 * (0.4 + 0.6 * smooth_noise(n, r, 0.35))
        surf = lp(colored(n, r, 1.4), 260, 2) * (0.6 + 0.4 * np.sin(2 * np.pi * np.arange(n) / SR / 7.3 + ch)) * 0.5
        out[ch] = wind + grass + surf
    for at in np.arange(0.5, dur, 1.6):                              # skylark: fast high warbles, far off
        if r.random() < 0.5:
            L = ns(r.uniform(0.4, 0.9)); i = ns(at + r.uniform(0, 0.8))
            if i + L >= n: continue
            tl = np.arange(L) / SR; f = 3800 + 900 * np.sin(2 * np.pi * r.uniform(14, 22) * tl) + 500 * np.sin(2 * np.pi * 3 * tl)
            out[int(r.integers(0, 2)), i:i + L] += np.sin(phase(f)) * np.sin(np.pi * tl / tl[-1]) * 0.03 * (0.5 + 0.5 * (np.sin(2 * np.pi * 31 * tl) > 0))
    return out


def eng_start(r, far=False):
    """starter whine + cranking chuffs (~0.45 s), a couple of coughs, catch, rising to idle (~2.4 s)"""
    d = 2.6; n = ns(d); t = np.arange(n) / SR
    rev = np.interp(t, [0, 0.45, 0.6, 0.75, 1.3, 2.6], [2.5, 3.0, 4.0, 9.0, 16.5, 16.5])
    eng = lp(_engine(n, r, rev, k_fire=1.3, k_blade=0.6, rough=0.8, detune=0.0) * 0.5, 1800, 2)
    eng *= np.clip((t - 0.45) / 0.15, 0, 1) * 0.9 + 0.1
    whine = np.sin(phase(np.interp(t, [0, 0.5, 0.7], [600, 900, 300]))) * np.exp(-np.maximum(0, t - 0.55) * 12) * 0.12
    crank = np.zeros(n)
    for at in np.arange(0.04, 0.5, 1 / 7.0):
        i = ns(at); L = min(ns(0.06), n - i); crank[i:i + L] += lp(colored(L, r, 0.8), 600, 2) * np.exp(-np.arange(L) / (SR * 0.02)) * 0.6
    for at in (0.52, 0.63, 0.7):                                       # coughs as it catches
        i = ns(at + r.uniform(0, 0.02)); L = min(ns(0.09), n - i); crank[i:i + L] += lp(colored(L, r, 0.4), 1200, 2) * np.exp(-np.arange(L) / (SR * 0.025)) * 1.2
    y = eng + whine + crank
    if far: y = lp(y, 900, 2) * 0.7
    return fades(y, 0.01, 0.2)


def taxi(r):
    """idle engines + light tyre rumble on gravel and a squeak of the nose wheel turning (2.4 s)"""
    d = 2.4; n = ns(d); t = np.arange(n) / SR
    eng = lp(_engine(n, r, np.full(n, 17.0) * (1 + 0.03 * np.clip(t / 0.8, 0, 1))), 1500, 2) * 0.5
    tyre = lp(colored(n, r, 0.9), 400, 2) * np.clip(t / 0.6, 0, 1) * 0.5 + bp(colored(n, r, 0.2), 1500, 5000) * 0.05 * (r.random(n) < 0.02)
    sq = np.sin(phase(np.full(n, 1400.0) * (1 + 0.05 * np.sin(2 * np.pi * 6 * t)))) * np.exp(-((t - 0.9) / 0.15) ** 2) * 0.06
    return fades(eng + tyre + sq, 0.15, 0.3)


def takeoff(r):
    """power up: props bite (blade-pass rising 34 -> 80 Hz), deep roar, gravel rush under the wheels then airborne (5.2 s)"""
    d = 5.2; n = ns(d); t = np.arange(n) / SR
    rev = np.interp(t, [0, 0.6, 1.2, 5.2], [17, 34, 40, 40])
    eng = _engine(n, r, rev, k_fire=1.2, k_blade=1.1, rough=0.4)
    eng = lp(eng, 2600, 2) * np.interp(t, [0, 0.8, 4.2, 5.2], [0.35, 1.0, 0.9, 0.6])
    roll = lp(colored(n, r, 0.7), 800, 2) * np.interp(t, [0, 0.4, 1.5, 1.6, 5.2], [0.2, 0.6, 0.9, 0.0, 0.0])   # wheels leave the ground at ~1.5 s
    grit = hp(colored(n, r, 0.0), 2500, 2) * (r.random(n) < 0.01) * np.interp(t, [0, 1.5, 1.55], [0.3, 0.6, 0.0])
    air = bp(colored(n, r, 0.6), 300, 3000) * np.interp(t, [0, 2, 5.2], [0.05, 0.35, 0.45])
    return fades(eng * 0.6 + roll + grit + air, 0.08, 0.4)


def touchdown(r):
    """main wheels touch: two quick tyre chirps + a soft suspension thump"""
    d = 0.8; n = ns(d); y = np.zeros(n)
    for k, at in enumerate([0.0, 0.07]):
        i = ns(at); L = min(ns(0.12), n - i); tl = np.arange(L) / SR
        y[i:i + L] += (np.sin(phase(np.full(L, r.uniform(900, 1300)))) * 0.4 + bp(colored(L, r, 0.0), 700, 3500)) * np.exp(-tl / 0.03) * (0.8 if k == 0 else 0.55)
    i = ns(0.02); L = min(ns(0.25), n - i); y[i:i + L] += lp(colored(L, r, 1.5), 140, 2) * np.exp(-np.arange(L) / (SR * 0.06)) * 1.6
    return fades(y, 0.001, 0.1)


def rollout(r):
    """roll-out on grass: tyre rumble, power back to idle, a little brake (3.0 s)"""
    d = 3.0; n = ns(d); t = np.arange(n) / SR
    eng = lp(_engine(n, r, np.interp(t, [0, 0.8, 3.0], [34, 17, 15])), 1600, 2) * np.interp(t, [0, 3], [0.6, 0.35])
    rum = lp(colored(n, r, 1.0), 300, 2) * np.interp(t, [0, 3], [1.0, 0.35]) + bp(colored(n, r, 0.3), 400, 2000) * np.interp(t, [0, 3], [0.15, 0.03])
    return fades(eng * 0.6 + rum * 0.6, 0.02, 0.4)


def spin_down(r):
    """mixture cut: engines run down, props windmill to a stop (two last chuffs), cooling ticks (3.4 s)"""
    d = 3.4; n = ns(d); t = np.arange(n) / SR
    rev = np.interp(t, [0, 0.6, 2.4, 3.4], [9, 4, 0.6, 0.0])
    eng = lp(_engine(n, r, np.maximum(rev, 0.05), k_fire=0.7, rough=0.9), 900, 2) * np.interp(t, [0, 1.5, 2.8], [0.6, 0.25, 0.0])
    y = eng
    for at in (2.5, 2.75):
        i = ns(at); L = min(ns(0.08), n - i); y[i:i + L] += lp(colored(L, r, 0.6), 500, 2) * np.exp(-np.arange(L) / (SR * 0.02)) * 0.4
    for at in np.arange(2.8, 3.35, 0.13):
        i = ns(at + r.uniform(0, 0.05)); L = min(ns(0.006), n - i); y[i:i + L] += hp(colored(L, r, 0.0), 3000, 2) * 0.12
    return fades(y, 0.01, 0.1)


def ac_door(r, close=False):
    """light aluminium aircraft door: latch clack, hinge, a hollow panel boom (close) or a soft swing (open)"""
    d = 0.7; n = ns(d); y = np.zeros(n)
    lat = modal(0.12, [(r.uniform(2300, 2700), 0.04, 0.6), (r.uniform(4100, 4600), 0.025, 0.4)], r)
    if close:
        i = ns(0.1); L = min(ns(0.3), n - i); y[i:i + L] += lp(colored(L, r, 1.0), 400, 2) * np.exp(-np.arange(L) / (SR * 0.05)) * 1.2
        y[i:i + len(lat)] += lat[: n - i] * 0.9
    else:
        y[:len(lat)] += lat * 0.8; L = ns(0.45); y[ns(0.08):ns(0.08) + L] += bp(colored(L, r, 0.5), 300, 1800) * np.sin(np.pi * np.arange(L) / L) * 0.15
    return fades(y, 0.001, 0.08)


def belt_click(r):
    """lap-belt latch: metal tongue slides in + a crisp double click"""
    d = 0.25; n = ns(d); y = np.zeros(n)
    L = ns(0.06); y[:L] += bp(colored(L, r, 0.0), 2000, 7000) * np.linspace(0.1, 0.3, L)
    for at, a in [(0.065, 1.0), (0.08, 0.6)]:
        c = modal(0.06, [(r.uniform(3200, 3700), 0.01, a), (r.uniform(6400, 7200), 0.006, a * 0.5)], r); i = ns(at); y[i:i + len(c)] += c[: n - i]
    return fades(y, 0.001, 0.03)


def belt_slide(r):
    """webbing pulled through the buckle"""
    d = 0.35; n = ns(d); tl = np.arange(n) / SR
    return fades(bp(colored(n, r, 0.3), 1200, 6000) * np.sin(np.pi * tl / d) * 0.25, 0.01, 0.05)


def seat_creak(r):
    """vinyl/fabric bench takes his weight: a soft squeak + a low thump"""
    d = 0.45; n = ns(d); tl = np.arange(n) / SR
    sq = np.sin(phase(np.full(n, r.uniform(380, 520)) * (1 + 0.15 * tl / d))) * np.exp(-((tl - 0.15) / 0.07) ** 2) * 0.15
    th = lp(colored(n, r, 1.5), 160, 2) * np.exp(-tl / 0.05) * 0.8
    return fades(sq + th + bp(colored(n, r, 0.2), 500, 3000) * np.exp(-tl / 0.08) * 0.1, 0.002, 0.05)


def bag_set(r):
    """a small soft bag set down on the floor"""
    d = 0.4; n = ns(d); tl = np.arange(n) / SR
    return fades(lp(colored(n, r, 1.2), 600, 2) * np.exp(-tl / 0.05) * 0.8 + bp(colored(n, r, 0.3), 800, 4000) * np.exp(-tl / 0.12) * 0.12, 0.002, 0.05)


def step(r, surface="gravel", foot=0):
    """gravel: heel crunch (granular burst) + rolling toe crunch; grass: soft swish + muted thump"""
    d = 0.32; n = ns(d); y = np.zeros(n); w = r.uniform(0.85, 1.1)
    if surface == "gravel":
        for at, a, L0 in [(0.0, 1.0, 0.07), (r.uniform(0.07, 0.11), 0.6, 0.09)]:
            i = ns(at); L = min(ns(L0), n - i); g = (r.random(L) < 0.08) * r.uniform(0.3, 1, L)
            y[i:i + L] += bp(g * colored(L, r, 0.0), 1000, 6500) * np.exp(-np.arange(L) / (SR * L0 * 0.45)) * a * 1.6
            y[i:i + L] += lp(colored(L, r, 1.2), 300 + 80 * foot, 2) * np.exp(-np.arange(L) / (SR * 0.015)) * a * 0.6
    else:
        L = ns(0.18); y[:L] += bp(colored(L, r, 0.4), 900, 5000) * np.sin(np.pi * np.arange(L) / L) ** 1.2 * 0.35
        L2 = ns(0.06); y[:L2] += lp(colored(L2, r, 1.5), 220, 2) * np.exp(-np.arange(L2) / (SR * 0.012)) * 0.7
    return fades(y * w, 0.001, 0.05)


def windsock(r):
    """fabric sock flutter in a gust (1.6 s)"""
    d = 1.6; n = ns(d); tl = np.arange(n) / SR
    fl = (0.5 + 0.5 * np.sin(2 * np.pi * r.uniform(9, 13) * tl)) ** 3
    return fades(bp(colored(n, r, 0.4), 300, 2500) * fl * np.sin(np.pi * tl / d) * 0.4, 0.05, 0.2)


def oystercatcher(r):
    """shore bird: loud piping 'kleep' calls (3-4)"""
    d = 1.0; n = ns(d); y = np.zeros(n)
    for k in range(int(r.integers(3, 5))):
        i = ns(k * r.uniform(0.17, 0.22)); L = ns(0.09)
        if i + L > n: break
        tl = np.arange(L) / SR; f = 3100 + 700 * np.sin(np.pi * tl / 0.09)
        y[i:i + L] += (np.sin(phase(f)) + 0.3 * np.sin(phase(f * 2))) * np.sin(np.pi * tl / 0.09) ** 1.2
    return fades(lp(y, 6000, 2) * 0.3, 0.003, 0.05)


def sheep(r):
    """distant ewe bleat"""
    d = 0.9; n = ns(d); tl = np.arange(n) / SR
    f0 = r.uniform(300, 380) * (1 + 0.04 * np.sin(2 * np.pi * 7 * tl))
    v = np.zeros(n)
    for h, a in [(1, 1), (2, 0.6), (3, 0.5), (4, 0.3), (5, 0.2)]: v += a * np.sin(phase(f0 * h))
    v *= (0.6 + 0.4 * np.sin(2 * np.pi * 22 * tl) ** 2) * np.sin(np.pi * tl / d) ** 0.7
    return fades(lp(bp(v, 300, 3000), 2200, 2) * 0.25, 0.02, 0.1)


def brow_pluck(r):
    """tiny comic pluck for eyebrows shooting up (very short, soft)"""
    d = 0.25; tl = tt(d); f = 700 * (1 + 0.6 * np.exp(-tl / 0.05))
    return fades(np.sin(phase(f)) * np.exp(-tl / 0.06) * 0.3, 0.001, 0.03)


def watch_tick(r):
    """wristwatch: three quick ticks"""
    d = 0.5; n = ns(d); y = np.zeros(n)
    for at in (0.0, 0.16, 0.32):
        c = modal(0.03, [(r.uniform(4200, 4800), 0.005, 1.0)], r); i = ns(at); y[i:i + len(c)] += c[: n - i]
    return y * 0.3


def double_take(r):
    """quick rising 'zip' for a double-take (soft, short)"""
    d = 0.18; tl = tt(d); f = 500 + 2200 * (tl / d) ** 2
    return fades(np.sin(phase(f)) * np.sin(np.pi * tl / d) * 0.2, 0.002, 0.02)


def air_swell(r):
    """the air outside the window as the camera passes through (soft wind swell, no whoosh)"""
    d = 1.6; n = ns(d); tl = np.arange(n) / SR
    return fades(lp(colored(n, r, 0.9), 1400, 2) * np.sin(np.pi * tl / d) ** 2 * 0.6, 0.05, 0.2)
