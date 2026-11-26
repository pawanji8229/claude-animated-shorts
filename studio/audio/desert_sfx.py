# Procedural sound effects for "London Bridge in the Desert" (own numpy/scipy synthesis, no third-party recordings).
# Every generator takes a seeded RNG so each instance varies in pitch, timing and colour (no obvious loops).
import numpy as np
from dsp import SR, ns, tt, lp, hp, bp, colored, smooth_noise, fades, modal, phase, shape
from sfx_gen import clink, whoosh


def step_sand(r, weight=1.0):
    """sand footstep: soft low thump + granular crunch of grains + short drag"""
    d = 0.32; t = tt(d); n = len(t)
    thump = np.sin(phase(r.uniform(70, 95) * (1 + 0.3 * np.exp(-t / 0.012)))) * np.exp(-t / 0.035) * 0.55
    grains = np.zeros(n)
    k = int(r.uniform(140, 220) * weight)
    for _ in range(k):
        i = int(min(n - 1, abs(r.normal(0.03, 0.035)) * SR))
        grains[i] += r.uniform(0.2, 1.0) * (1 if r.random() < 0.5 else -1)
    crunch = bp(grains, r.uniform(900, 1400), r.uniform(4500, 6500), 2) * np.exp(-t / 0.06) * 1.6
    drag = bp(colored(n, r, 0.4), 500, 3000, 1) * np.clip(t / 0.03, 0, 1) * np.exp(-t / 0.08) * 0.18
    return fades((thump + crunch + drag) * weight, 0.001, 0.05)


def turn_scuff(r):
    d = 0.35; t = tt(d); n = len(t)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    st_ = np.zeros(n); sb = step_sand(r, 0.5)[:n]; st_[:len(sb)] = sb
    return fades(bp(colored(n, r, 0.3), 700, 5000, 2) * env * 0.5 + st_ * 0.6, 0.002, 0.05)


def fabric_swish(r, big=False):
    d = 0.42 if big else 0.28; t = tt(d); n = len(t)
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** (1.4 if big else 2.0)
    body = bp(colored(n, r, 0.8), 350, 2500, 2) * (0.6 if big else 0.35)
    air = bp(colored(n, r, 0.2), 2500, 7500, 2) * (0.35 if big else 0.25)
    return fades((body + air) * env, 0.004, 0.04)


def wallet_pat(r):
    d = 0.16; t = tt(d); n = len(t)
    thud = lp(colored(n, r, 1.0), 900, 2) * np.exp(-t / 0.018) * 1.2
    slap = bp(r.standard_normal(n), 1200, 5000, 2) * np.exp(-t / 0.004) * 0.5
    return fades(thud + slap, 0.0005, 0.03)


def coin_jingle(r):
    out = np.zeros(ns(0.35))
    for _ in range(int(r.integers(3, 6))):
        c = clink(r, f0=r.uniform(2600, 5200), dur=0.12, bright=0.8) * r.uniform(0.25, 0.6)
        i = ns(r.uniform(0, 0.18)); out[i:i + len(c)] += c[: len(out) - i]
    return fades(out, 0.001, 0.05)


def pebble_whistle(r):
    """quiet cartoon falling whistle (tasteful, low level)"""
    d = 0.72; t = tt(d)
    f = 1900 * (1 - 0.45 * (t / d) ** 1.3)
    env = np.clip(t / 0.08, 0, 1) * np.clip((d - t) / 0.1, 0, 1)
    return fades(np.sin(phase(f)) * env * 0.25 + bp(colored(len(t), r, 0.3), 1500, 4000, 1) * env * 0.02, 0.01, 0.05)


def pebble_clack(r):
    """small stone hitting baked mud: hard click, short ring, dust hiss, two tiny bounces"""
    d = 0.9; out = np.zeros(ns(d))
    for k, (at, a) in enumerate([(0.0, 1.0), (0.17, 0.35), (0.27, 0.15)]):
        click = modal(0.12, [(r.uniform(2200, 2900), 1.0, 0.012), (r.uniform(4200, 5200), 0.5, 0.006), (r.uniform(900, 1300), 0.4, 0.02)], r)
        t = tt(0.12); click += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.0012) * 0.8
        i = ns(at); out[i:i + len(click)] += click[: len(out) - i] * a
    t = tt(d); out += bp(colored(len(t), r, 0.2), 1500, 7000, 1) * np.exp(-t / 0.12) * 0.12
    return fades(out, 0.0005, 0.08)


def freeze_tick(r):
    d = 0.18; t = tt(d)
    y = modal(d, [(r.uniform(820, 900), 1.0, 0.03), (r.uniform(1900, 2100), 0.4, 0.015)], r)
    return fades(y * 0.7, 0.0005, 0.04)


def gulp(r):
    """cartoon gulp: throat blip with falling pitch + wet click"""
    d = 0.32; t = tt(d)
    f0 = 260 * (1 - 0.45 * t / d)
    voice = np.sin(phase(f0)) + 0.5 * np.sin(phase(f0 * 2.02)) + 0.25 * np.sin(phase(f0 * 3.1))
    env = np.clip(t / 0.02, 0, 1) * np.exp(-t / 0.09)
    click = bp(r.standard_normal(len(t)), 600, 3000, 2) * np.exp(-np.maximum(t - 0.11, 0) / 0.006) * (t > 0.11) * 0.6
    return fades(lp(voice * env, 1800, 2) * 0.5 + click, 0.002, 0.05)


def hawk(r):
    """distant red-tailed-hawk-like screech: harsh descending glide (synthesised, then distance-filtered)"""
    d = 1.35; t = tt(d)
    f = 2900 - 1300 * (t / d) ** 0.7 + 60 * np.sin(phase(np.full(len(t), 23.0)))
    tone = np.sin(phase(f)) + 0.35 * np.sin(phase(f * 1.98)) + 0.2 * np.sin(phase(f * 3.03))
    rough = bp(colored(len(t), r, 0.1), 1500, 4500, 2) * 0.6
    env = np.clip(t / 0.06, 0, 1) * (1 - (t / d)) ** 1.5
    return fades(lp((tone * 0.7 + rough) * env, 3800, 2) * 0.5, 0.01, 0.15)


def tumble_roll(r, dur, bumps_hz):
    """dry tumbleweed rolling: brittle twig crackle modulated by its rotation + soft sand brush"""
    n = ns(dur); t = np.arange(n) / SR
    clicks = np.zeros(n)
    rate = 140.0
    k = 0.0
    while k < dur:
        i = int(k * SR)
        if i >= n: break
        clicks[i] += r.uniform(0.2, 1.0) * (1 if r.random() < 0.5 else -1)
        k += r.exponential(1.0 / rate)
    bump = 0.55 + 0.45 * np.abs(np.sin(np.pi * bumps_hz * t)) ** 3
    crackle = bp(clicks, 1800, 8000, 2) * bump * 1.1
    brush = bp(colored(n, r, 0.5), 400, 2500, 1) * bump * 0.12
    return crackle + brush


def vulture_flap(r):
    out = np.zeros(ns(0.7))
    for k in range(2):
        d = 0.22; t = tt(d)
        w = lp(colored(len(t), r, 0.9), 900, 2) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2 * 0.8
        i = ns(0.28 * k); out[i:i + len(w)] += w
    return fades(out, 0.003, 0.05)


def whoosh_reveal(r):
    return whoosh(1.9, r, peak=0.75, f_lo=180, f_hi=1100, width=1.1, tail=0.55, air=0.08) * 0.8


def desert_wind(dur, r):
    """continuous stereo desert wind with slow gusts and sand hiss"""
    n = ns(dur); out = np.zeros((2, n))
    g = 0.55 + 0.45 * smooth_noise(n, r, 0.12)
    for ch in range(2):
        low = lp(colored(n, r, 1.2), 420, 2) * g
        whistle = bp(colored(n, r, 0.6), 600, 1500, 2) * g ** 3 * 0.25
        hiss = bp(colored(n, r, 0.1), 3500, 9000, 1) * g ** 2 * 0.05
        out[ch] = low + whistle + hiss
    return out


def cicadas(dur, r):
    n = ns(dur); t = np.arange(n) / SR; out = np.zeros((2, n))
    for ch in range(2):
        car = np.sin(phase(np.full(n, r.uniform(5600, 6400))))
        am = 0.5 + 0.5 * np.sin(phase(np.full(n, r.uniform(38, 46))))
        swell = 0.4 + 0.6 * smooth_noise(n, r, 0.08)
        out[ch] = car * am * swell * 0.04
    return out


def pluck(f, dur, r, bright=0.5):
    """Karplus-Strong plucked string (guitar-ish)"""
    n = ns(dur); N = max(2, int(SR / f)); buf = r.uniform(-1, 1, N) * 0.5; out = np.zeros(n)
    buf = lp(buf, 1500 + 4000 * bright, 1)
    for i in range(n):
        out[i] = buf[i % N]
        buf[i % N] = 0.996 * 0.5 * (buf[i % N] + buf[(i + 1) % N])
    return fades(out, 0.001, 0.2)


def desert_guitar(dur, r):
    """sparse, warm plucked motif (A minor / western), very low level — under narration only as colour"""
    n = ns(dur); out = np.zeros((2, n))
    A2, C3, E3, G3, A3, B3, C4, E4 = 110.0, 130.81, 164.81, 196.0, 220.0, 246.94, 261.63, 329.63
    seq = [(0.4, A2), (1.0, E3), (1.6, A3), (2.2, C4), (3.4, G3), (4.0, B3), (4.6, E4), (6.0, A2), (6.6, E3), (7.2, C4), (8.6, A3), (9.2, E3)]
    period = 10.4  # the motif repeats for any duration
    seq = [(at + k * period, f) for k in range(int(dur // period) + 1) for at, f in seq]
    for at, f in seq:
        if at >= dur: continue
        p = pluck(f, 2.2, r, 0.35) * 0.35
        i = ns(at); m = min(len(p), n - i)
        pan_ = r.uniform(-0.3, 0.3)
        out[0, i:i + m] += p[:m] * (1 - pan_) * 0.7
        out[1, i:i + m] += p[:m] * (1 + pan_) * 0.7
    return out


# ---------------- car (1960s V8) ----------------
def car_arrive(r, dur=1.45, decel=1.2):
    """V8 approaching on gravel and decelerating: firing pulses (rpm falls), exhaust burble, tyre crunch tied to speed,
    approach swell (distance) — synthesised, then softened so it sits like a real recording at distance."""
    n = ns(dur); t = np.arange(n) / SR
    speed = np.clip(1 - (t / decel) ** 1.6, 0, 1)            # 1 -> 0 as it parks
    rpm = 650 + 1500 * speed                                  # idle 650 rpm
    fire = rpm / 60 * 4                                       # V8: 4 firings per rev
    ph = np.cumsum(fire) / SR
    pulses = np.sin(2 * np.pi * ph) ** 9 * np.sign(np.sin(2 * np.pi * ph))
    burble = lp(pulses + 0.35 * r.standard_normal(n) * (0.4 + 0.6 * speed), 380, 2)
    rumble = lp(colored(n, r, 1.4), 90, 2) * (0.6 + 0.6 * speed)
    gravel = np.zeros(n); k = 0.0
    while k < dur:
        i = int(k * SR)
        if i >= n: break
        gravel[i] += r.uniform(0.2, 1.0) * (1 if r.random() < 0.5 else -1)
        k += r.exponential(1.0 / (60 + 900 * speed[min(i, n - 1)]))
    crunch = bp(gravel, 900, 6000, 2) * (speed ** 0.7) * 1.2
    approach = np.clip(t / 0.35, 0, 1) ** 1.5
    return fades((burble * 0.9 + rumble * 0.8 + crunch) * approach, 0.05, 0.08)


def engine_idle_off(r, dur=1.2):
    n = ns(dur); t = np.arange(n) / SR
    rpm = 650 * np.clip(1 - (t / 0.55) ** 2, 0, 1)
    ph = np.cumsum(rpm / 60 * 4) / SR
    y = lp(np.sin(2 * np.pi * ph) ** 7, 300, 2) * np.clip(1 - t / 0.6, 0, 1)
    shudder = lp(r.standard_normal(n), 120, 2) * np.exp(-((t - 0.5) / 0.08) ** 2) * 0.8
    ticks = np.zeros(n)
    for at in (0.75, 0.98, 1.12):
        c = modal(0.05, [(r.uniform(2600, 3400), 1.0, 0.004)], r); i = ns(at); ticks[i:i + len(c)] += c[: n - i] * 0.15
    return fades(y * 0.8 + shudder + ticks, 0.01, 0.1)


def brake_squeak(r):
    d = 0.5; t = tt(d)
    f = r.uniform(2100, 2500) * (1 + 0.04 * np.sin(2 * np.pi * 9 * t))
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return fades(np.sin(phase(f)) * env * 0.25, 0.02, 0.08)


def door_open(r):
    d = 0.5; out = np.zeros(ns(d))
    latch = modal(0.08, [(r.uniform(1600, 2000), 1.0, 0.008), (r.uniform(3500, 4200), 0.6, 0.004)], r); out[: len(latch)] += latch * 0.8
    t = tt(0.4); hinge = bp(colored(len(t), r, 0.6), 500, 2200, 2) * np.sin(np.pi * np.clip(t / 0.4, 0, 1)) * 0.15
    i = ns(0.06); out[i:i + len(hinge)] += hinge[: len(out) - i]
    return fades(out, 0.001, 0.05)


def door_close(r):
    d = 0.7; t = tt(d)
    body = np.sin(phase(r.uniform(85, 110) * (1 + 0.5 * np.exp(-t / 0.01)))) * np.exp(-t / 0.08)
    panel = modal(d, [(r.uniform(180, 240), 0.6, 0.06), (r.uniform(420, 520), 0.4, 0.04), (r.uniform(900, 1100), 0.2, 0.02)], r)
    latch = np.zeros(len(t)); c = modal(0.06, [(r.uniform(2400, 3000), 1.0, 0.006)], r); i = ns(0.012); latch[i:i + len(c)] += c[: len(t) - i]
    return fades(body * 0.9 + panel + latch * 0.6, 0.001, 0.1)
