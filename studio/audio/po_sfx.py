# Procedural sounds for "The Underwater Post Office" (postoffice). Own numpy/scipy synthesis, no recordings.
# Two acoustic worlds:
#   UNDER WATER  everything low-passed / band-limited (water kills highs, sound arrives "close" and muffled), a reef
#                bed of surf heard through the water (slow 6-9 s swells), snapping-shrimp crackle (the real sound of a
#                living reef), faint current hiss; regulator exhalations (bubble trains), snorkellers' small bubbles,
#                fin strokes (soft pressure whooshes), the plastic card handed over, the embosser (lever creak, ram clunk,
#                crunch of the die), the ink-stamp box sliding, the mail bag, the tank settling on the sand.
#   ABOVE WATER  waves lapping on coral sand, trade wind in the palms, tropical birds (whistles + chatter), the outboard
#                idle, A-frame winch + rope creak, hammer, fibreglass roof set down, kiosk card flicks, flag flutter,
#                the room tone of the Port Vila sorting room + ceiling fan, rubber date-stamp + card dropped in a bag.
# Transitions: the camera dipping under / breaking the surface (muffle sweep + bubbles / splash).
import numpy as np
from dsp import SR, ns, tt, lp, hp, bp, colored, smooth_noise, fades, modal, phase, st, reson


def uw(x, f=1400, q=0.0):
    """make a dry sound read as heard under water: strong low-pass, slight low-mid body, tiny detuned double"""
    y = lp(x, f, 4) + 0.3 * lp(x, 380, 2)
    d = int(0.004 * SR); y2 = np.zeros_like(y); y2[d:] = y[:-d]
    return y + 0.25 * y2


def _env(n, a=0.005, d=0.2, shape=2.0):
    t = np.arange(n) / SR; return np.clip(t / a, 0, 1) * np.exp(-t / d) ** shape


# ---------------------------------------------------------------- beds
def reef_bed(dur, r):
    n = ns(dur); t = tt(dur)
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 7.3 + r.uniform(0, 6)) * np.sin(2 * np.pi * t / 11.1 + 1.3)
    rumble = lp(colored(n, r, 1.6), 220, 3) * swell * 2.2
    hiss = bp(colored(n, r, 0.8), 300, 1400) * (0.25 + 0.1 * smooth_noise(n, r, 0.3))
    # snapping shrimp: dense random clicks (Poisson ~ 120/s), each a 1-3 ms broadband tick, band-limited by the water
    crack = np.zeros(n); k = r.poisson(130 * dur)
    for p in r.integers(0, n - 200, k): L = r.integers(30, 120); crack[p:p + L] += r.uniform(-1, 1) * np.exp(-np.arange(L) / (L * 0.25)) * r.uniform(0.2, 1.0) ** 2
    crack = bp(crack, 1800, 7000, 2) * 0.55
    distant = lp(colored(n, r, 2.0), 90, 2) * 1.2
    L = rumble + hiss + crack + distant; R = lp(colored(n, r, 1.6), 220, 3) * swell * 2.0 + hiss * 0.9 + np.roll(crack, 377) + distant
    return np.stack([L, R]) * 0.5


def beach_bed(dur, r):
    n = ns(dur); t = tt(dur); out = np.zeros((2, n))
    # waves: each wave = a swelling roar that breaks then fizzes out over the sand, every 6-9 s (two layers, different spacing)
    for lay in range(2):
        tc = r.uniform(0, 3)
        while tc < dur:
            L = r.uniform(3.5, 5.5); a, b = ns(tc), min(n, ns(tc + L)); m = b - a
            if m > 10:
                u = np.linspace(0, 1, m); env = np.clip(u / 0.35, 0, 1) ** 1.5 * np.exp(-np.clip(u - 0.35, 0, None) * 3.4)
                x = bp(colored(m, r, 0.6), 250 + lay * 120, 5200) * env + lp(colored(m, r, 1.5), 300) * env * 0.6
                p = r.uniform(-0.5, 0.5); out[0, a:b] += x * (0.5 + p * 0.5) * 0.6; out[1, a:b] += x * (0.5 - p * 0.5) * 0.6
            tc += r.uniform(6, 9)
    wind = bp(colored(n, r, 1.0), 400, 3000) * (0.12 + 0.1 * smooth_noise(n, r, 0.25))      # palm rustle
    out += np.stack([wind, np.roll(wind, 911)])
    # tropical birds: sparse whistles / chatter
    tb = r.uniform(0.5, 2)
    while tb < dur - 1:
        x = bird(r); a = ns(tb); b = min(n, a + len(x)); p = r.uniform(-0.8, 0.8); g = r.uniform(0.15, 0.35)
        out[0, a:b] += x[:b - a] * g * (0.5 + p * 0.5); out[1, a:b] += x[:b - a] * g * (0.5 - p * 0.5); tb += r.uniform(1.4, 4.5)
    return out


def surface_bed(dur, r):
    n = ns(dur); t = tt(dur)
    slosh = bp(colored(n, r, 0.8), 200, 2500) * (0.3 + 0.25 * np.sin(2 * np.pi * t / 2.7) ** 2 + 0.1 * smooth_noise(n, r, 0.8))
    wind = bp(colored(n, r, 1.0), 300, 2500) * (0.1 + 0.08 * smooth_noise(n, r, 0.3))
    b = beach_bed(dur, r) * 0.45
    return b + np.stack([slosh + wind, np.roll(slosh, 733) + wind])


def room_bed(dur, r):
    n = ns(dur); t = tt(dur)
    tone = lp(colored(n, r, 1.2), 500) * 0.2
    fan = (np.sin(phase(np.full(n, 3.1))) * 0.5 + 0.5) * bp(colored(n, r, 0.5), 200, 900) * 0.12 + np.sin(2 * np.pi * 96 * t) * 0.01
    street = lp(colored(n, r, 1.4), 700) * 0.1 * (0.6 + 0.4 * smooth_noise(n, r, 0.2))
    return np.stack([tone + fan + street, tone + fan * 0.9 + np.roll(street, 1531)])


# ---------------------------------------------------------------- above water events
def bird(r):
    kind = r.integers(0, 3); d = r.uniform(0.25, 0.7); n = ns(d); t = np.arange(n) / SR
    if kind == 0:   # rising whistle pair
        f = np.concatenate([np.linspace(1800, 2900, n // 2), np.linspace(2200, 3300, n - n // 2)]) * r.uniform(0.9, 1.1)
        x = np.sin(phase(f)) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7
    elif kind == 1:  # chatter (myna-like): quick buzzy syllables
        x = np.zeros(n)
        for k in range(int(d / 0.06)):
            a = ns(k * 0.06); m = ns(0.045); f = r.uniform(1500, 3500); s = np.sin(phase(np.full(m, f) * (1 + 0.15 * np.sin(np.arange(m) / SR * 2 * np.pi * 70)))) * np.sin(np.linspace(0, np.pi, m))
            x[a:a + m] += s[:max(0, min(m, n - a))] if a < n else 0
    else:            # soft dove-like coo
        f = np.full(n, r.uniform(500, 650)) * (1 - 0.08 * t / d); x = np.sin(phase(f)) * np.sin(np.pi * np.clip(t / d, 0, 1)) + 0.3 * np.sin(phase(f * 2)) * np.sin(np.pi * np.clip(t / d, 0, 1))
    return hp(x, 300)


def outboard_idle(r, dur=3.0):
    n = ns(dur); f = 14 * (1 + 0.02 * smooth_noise(n, r, 1.5)); y = np.zeros(n)
    for h, a in [(1, 1), (2, 0.6), (3, 0.4), (4, 0.25), (6, 0.15)]: y += a * np.sin(phase(f * h))
    y = y * (0.7 + 0.3 * np.sin(phase(f))) + bp(colored(n, r, 0.5), 200, 2500) * 0.3
    return fades(lp(y, 2500) * np.clip(np.arange(n) / ns(0.4), 0, 1), 0.01, 0.6)


def winch(r):
    d = 1.6; n = ns(d); t = tt(d); f = 55 + 10 * t
    gear = np.sin(phase(f * 6)) * 0.3 + bp(colored(n, r, 0.3), 600, 3000) * 0.4
    clicks = np.zeros(n)
    for k in range(int(d * 9)): a = ns(k / 9 + r.uniform(0, 0.01)); clicks[a:a + 200] += np.exp(-np.arange(200) / 30) * r.uniform(0.5, 1)
    return fades((gear + bp(clicks, 1500, 6000)) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.3, 0.02, 0.2)


def rope_creak(r):
    d = 0.7; n = ns(d); f = np.linspace(180, 260, n) * r.uniform(0.9, 1.1); x = np.sign(np.sin(phase(f))) * bp(colored(n, r, 0.4), 300, 2000)
    return fades(bp(x, 250, 1800) * np.sin(np.linspace(0, np.pi, n)) ** 0.6, 0.02, 0.1)


def roof_set(r):
    n = ns(0.9); x = modal(0.9, [(130, 1.0, 0.5), (210, 0.6, 0.35), (390, 0.3, 0.2), (760, 0.15, 0.1)], r) * 1.0
    thud = lp(colored(n, r, 1.0), 300) * _env(n, 0.002, 0.08)
    return fades(x * _env(n, 0.002, 0.3) + thud * 1.5, 0.001, 0.2)


def card_flick(r):
    n = ns(0.18); x = bp(colored(n, r, 0.2), 1500, 9000) * _env(n, 0.001, 0.03) + modal(0.18, [(2400, 0.4, 0.04), (3900, 0.2, 0.03)], r) * _env(n, 0.001, 0.05)
    return fades(x, 0.0005, 0.05)


def card_slide(r):
    d = 0.45; n = ns(d); x = bp(colored(n, r, 0.3), 1200, 7000) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.8 * (0.7 + 0.3 * smooth_noise(n, r, 30))
    return fades(x, 0.005, 0.05)


def flag_flutter(r):
    d = 1.4; n = ns(d); x = bp(colored(n, r, 0.4), 300, 3000) * (0.5 + 0.5 * np.abs(np.sin(phase(np.full(n, 7.0 + r.uniform(-1, 1))))))
    return fades(x * np.sin(np.pi * np.linspace(0, 1, n)), 0.05, 0.3)


def splash_entry(r):
    d = 1.3; n = ns(d); t = tt(d)
    body = bp(colored(n, r, 0.5), 300, 6000) * np.exp(-t / 0.18)
    drops = np.zeros(n)
    for k in range(40): a = ns(r.uniform(0.05, 0.9)); m = ns(0.03); drops[a:a + m] += np.sin(phase(np.linspace(1200, 3000, m) * r.uniform(0.7, 1.3))) * np.exp(-np.arange(m) / (m * 0.2)) * r.uniform(0.1, 0.4)
    return fades(body + drops + lp(colored(n, r, 1.5), 250) * np.exp(-t / 0.3), 0.002, 0.2)


def wade(r):
    d = 0.45; n = ns(d); t = tt(d); x = bp(colored(n, r, 0.6), 250, 3500) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return fades(x, 0.01, 0.1)


def fin_flap(r):   # fins slapping the wet sand (comic, soft)
    n = ns(0.16); x = bp(colored(n, r, 0.3), 400, 3500) * _env(n, 0.001, 0.025) + lp(colored(n, r, 1.0), 300) * _env(n, 0.001, 0.02)
    return fades(x, 0.0005, 0.04)


def surface_break(r):   # the camera rising out of the water: muffled gurgle sweeping open into air + slosh
    d = 1.2; n = ns(d); t = tt(d); x = colored(n, r, 0.6)
    lo = lp(x, 900) * (1 - np.clip(t / 0.6, 0, 1)); hi = bp(x, 800, 7000) * np.clip((t - 0.35) / 0.4, 0, 1) * np.exp(-np.clip(t - 0.75, 0, None) / 0.3)
    return fades((lo + hi * 0.8) * 0.9 + _bubble_train(d, r, 25, 500, 1600) * 0.5 * (1 - np.clip(t / 0.7, 0, 1)), 0.01, 0.2)


def dip_under(r):       # the camera going under: splash-hush then everything closes in
    d = 1.0; n = ns(d); t = tt(d); x = colored(n, r, 0.6)
    hi = bp(x, 800, 7000) * np.exp(-t / 0.12); lo = lp(x, 700) * np.clip(t / 0.25, 0, 1) * np.exp(-t / 0.5)
    return fades(hi * 0.8 + lo + _bubble_train(d, r, 30, 400, 1400) * 0.5, 0.005, 0.2)


def stamp_ink(r):       # rubber date stamp on the counter (above water)
    n = ns(0.3); thump = lp(colored(n, r, 1.0), 400) * _env(n, 0.001, 0.03); rub = bp(colored(n, r, 0.4), 500, 3000) * _env(n, 0.001, 0.02)
    return fades(thump * 1.4 + rub * 0.5 + modal(0.3, [(220, 0.4, 0.06), (540, 0.2, 0.04)], r) * _env(n, 0.001, 0.08), 0.0005, 0.1)


def drop_in_bag(r):
    n = ns(0.5); t = tt(0.5); x = bp(colored(n, r, 0.4), 300, 4000) * (np.exp(-t / 0.06) + 0.4 * np.exp(-np.clip(t - 0.08, 0, None) / 0.12) * (t > 0.08))
    return fades(x, 0.001, 0.1)


def bag_rustle(r, under=False):
    d = 0.8; n = ns(d); x = bp(colored(n, r, 0.3), 500, 6000) * (0.4 + 0.6 * np.abs(smooth_noise(n, r, 14))) * np.sin(np.pi * np.linspace(0, 1, n))
    clip = modal(0.1, [(1900, 0.6, 0.02), (3100, 0.3, 0.015)], r); x[ns(0.55):ns(0.55) + len(clip)] += clip * 0.8
    x = fades(x, 0.01, 0.1); return uw(x, 1300) if under else x


# ---------------------------------------------------------------- under water events
def _bubble_train(d, r, count, f0, f1):
    n = ns(d); y = np.zeros(n)
    for k in range(count):
        a = ns(r.uniform(0, d * 0.85)); L = ns(r.uniform(0.02, 0.07)); f = r.uniform(f0, f1)
        tt_ = np.arange(L) / SR; s = np.sin(2 * np.pi * f * tt_ * (1 + 1.8 * tt_ / max(tt_[-1], 1e-4))) * np.exp(-tt_ / (L / SR * 0.35))   # Minnaert resonance, pitch rising as it detaches
        y[a:a + L] += s[:max(0, min(L, n - a))] * r.uniform(0.3, 1.0)
    return y


def regulator(r):       # exhalation: dense bubble train + breathy rush, then the bubbles trail off
    d = 1.6; n = ns(d); t = tt(d)
    rush = bp(colored(n, r, 0.6), 200, 1500) * np.clip(t / 0.08, 0, 1) * np.exp(-np.clip(t - 0.5, 0, None) / 0.25)
    b = _bubble_train(d, r, 70, 180, 900) * (1 - np.clip((t - 0.9) / 0.6, 0, 1))
    return fades(uw(rush * 0.5 + b, 1500), 0.01, 0.2)


def bubbles_small(r):
    d = 0.6; return fades(uw(_bubble_train(d, r, 7, 500, 1600), 2200), 0.002, 0.1)


def fin_kick(r):        # a fin stroke heard close under water: soft low pressure swoosh
    d = 0.42; n = ns(d); t = tt(d); x = lp(colored(n, r, 1.2), 500) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return fades(uw(x, 700), 0.01, 0.05)


def card_uw(r):         # plastic card handled under water (muffled tick + flex)
    n = ns(0.22); x = modal(0.22, [(1700, 0.5, 0.03), (2600, 0.3, 0.02)], r) * _env(n, 0.001, 0.04) + bp(colored(n, r, 0.3), 600, 3000) * _env(n, 0.002, 0.05) * 0.6
    return fades(uw(x, 1800), 0.0005, 0.05)


def emboss_press(r):    # lever creak down, ram clunk, die crunch, hold
    d = 1.1; n = ns(d); t = tt(d)
    creak = bp(np.sign(np.sin(phase(np.linspace(140, 210, n)))) * colored(n, r, 0.2), 300, 1600) * np.clip(t / 0.3, 0, 1) * (t < 0.42)
    clunk = np.zeros(n); a = ns(0.42); m = ns(0.5); clunk[a:a + m] = modal(0.5, [(310, 1.0, 0.12), (720, 0.5, 0.07), (1650, 0.25, 0.03)], r)[:m] * _env(m, 0.001, 0.12)
    crunch = np.zeros(n); m2 = ns(0.09); crunch[a:a + m2] = bp(colored(m2, r, 0.2), 900, 5000) * _env(m2, 0.001, 0.03)
    return fades(uw(creak * 0.6 + clunk * 1.2 + crunch * 0.9, 1700), 0.005, 0.15)


def emboss_release(r):
    n = ns(0.5); x = modal(0.5, [(420, 0.6, 0.08), (900, 0.3, 0.05)], r) * _env(n, 0.001, 0.09) + bp(np.sign(np.sin(phase(np.linspace(220, 160, n)))) * colored(n, r, 0.2), 300, 1500) * 0.2
    return fades(uw(x, 1700), 0.003, 0.1)


def box_slide_uw(r):
    d = 0.6; n = ns(d); x = bp(colored(n, r, 0.3), 300, 2400) * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7 * (0.6 + 0.4 * smooth_noise(n, r, 25))
    return fades(uw(x, 1500), 0.01, 0.06)


def pen_scratch_uw(r):
    d = 0.9; n = ns(d); x = bp(colored(n, r, 0.1), 900, 4000) * (0.4 + 0.6 * np.abs(np.sin(phase(np.full(n, 6.0)))))
    return fades(uw(x, 2000) * 0.8, 0.01, 0.1)


def paper_soak(r):      # soft fizzing / wet sag as the paper soaks (very quiet)
    d = 2.5; n = ns(d); t = tt(d); x = bp(colored(n, r, 0.3), 500, 2500) * (0.3 + 0.7 * np.clip(t / 1.2, 0, 1)) * (0.5 + 0.5 * smooth_noise(n, r, 4))
    return fades(uw(x, 1600) * 0.6, 0.3, 0.6)


def tank_settle(r):     # the tank lands in the sand: deep thud + sand hiss + hull ring
    d = 1.6; n = ns(d); t = tt(d)
    thud = lp(colored(n, r, 1.5), 160, 3) * _env(n, 0.003, 0.18) * 2.5
    sand = bp(colored(n, r, 0.4), 300, 1800) * np.exp(-t / 0.5) * 0.4
    ring = modal(d, [(95, 0.5, 0.5), (170, 0.3, 0.35), (310, 0.15, 0.2)], r) * _env(n, 0.003, 0.5)
    return fades(uw(thud + sand + ring, 900), 0.002, 0.3)


def tank_descend(r):    # rope creaks + hollow hull resonance as it is lowered (under water)
    d = 2.4; n = ns(d); t = tt(d)
    hull = bp(colored(n, r, 1.0), 60, 400) * (0.5 + 0.5 * smooth_noise(n, r, 0.8)) * 0.8
    creaks = np.zeros(n)
    for k in range(4): a = ns(0.3 + k * 0.5 + r.uniform(0, 0.15)); c = rope_creak(r); creaks[a:a + len(c)] += c[:max(0, min(len(c), n - a))] * 0.5
    return fades(uw(hull + creaks, 1200), 0.3, 0.4)


def surface_emerge(r):  # worker's head breaking the surface (above-water mic): splashy gurgle + regulator out
    d = 0.9; n = ns(d); t = tt(d); x = bp(colored(n, r, 0.5), 300, 5000) * np.exp(-t / 0.15) + _bubble_train(d, r, 12, 600, 1800) * 0.3
    return fades(x, 0.003, 0.2)


def idea_pop(r):        # comic accent: bright soft "pop" (the owner's idea)
    n = ns(0.35); t = tt(0.35); f = 700 * (1 + 2.5 * np.clip(t / 0.05, 0, 1))
    return fades(np.sin(phase(f)) * _env(n, 0.002, 0.08) + 0.4 * np.sin(phase(f * 2)) * _env(n, 0.002, 0.05), 0.001, 0.1)
