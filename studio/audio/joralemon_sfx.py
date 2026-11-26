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


# ================================================================ upgrade (maximum-quality pass): subway, birds, street, works
from dsp import st, pan, make_ir, convolve_st, curve
_TIR = {}
def _tunnel(x, wet=0.4, rt=2.4):
    """cast-iron tube reverb (long, dark, with early slaps off the lining)"""
    if rt not in _TIR: _TIR[rt] = make_ir(rt, 77, early=[(0.028, 0.55, -0.45), (0.061, 0.4, 0.5), (0.11, 0.25, -0.2)], hf=1.7)
    y = st(x); return y + convolve_st(y, _TIR[rt]) * wet


def train_now_pass(r, d=4.8):
    """today's train, timed to the picture (t = 0 at film frame 1232): approaches from 24 m (headlights), passes the
    walkway camera at t = 1.6 s, cars rush by until the camera slips back through the exit door (t = 2.6), then the
    sound is muffled by the adit and the shaft as the camera rises (lowpass + level), gone by t = 4.6 s.
    Layers: deep rumble, wheel-on-rail roar, traction-motor whine following speed (Doppler before the pass, falling
    pitch while braking), car-body rattle; long tunnel reverb."""
    n = ns(d); t = np.arange(n) / SR
    env = curve(n, [(0, 0.22), (1.0, 0.55), (1.45, 0.92), (1.6, 1.0), (2.55, 1.0), (2.85, 0.62), (3.3, 0.36), (3.7, 0.2), (4.3, 0.07), (d, 0.0)])
    bright = curve(n, [(0, 0.35), (1.5, 1.0), (2.6, 1.0), (2.9, 0.45), (3.4, 0.15), (d, 0.08)])
    speed = curve(n, [(0, 12.6), (1.73, 12.6), (3.0, 9.0), (d, 9.0)])
    dop = np.where(t < 1.6, 1.037, curve(n, [(1.6, 1.01), (2.4, 0.985), (d, 0.985)]))
    rumble = lp(colored(n, r, 1.5), 140, 2) * 1.6 + np.sin(phase(np.full(n, 34.0))) * 0.35
    roar = bp(colored(n, r, 0.6), 420, 2600) * (0.4 + 0.6 * smooth_noise(n, r, 3.0))
    fw = speed * 58 * dop
    whine = sum(np.sin(phase(fw * h)) * a for h, a in [(1, 0.5), (2, 0.22), (3.02, 0.1)]) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.1 * t))
    rattle = bp(colored(n, r, 0.2), 1800, 5200) * smooth_noise(n, r, 14) * 0.35
    y = rumble * env + (roar * 0.9 + whine * 0.32 + rattle) * env * bright
    muff = lp(y, 380, 2); y = y * bright + muff * (1 - bright) * 1.4
    return fades(_tunnel(y * 0.5, 0.45), 0.2, 0.4)


def rail_clack(r):
    """one wheelset over a rail joint: double metallic clack + body thump, in the tube"""
    d = 0.45; n = ns(d); y = np.zeros(n)
    for at, g in [(0.0, 1.0), (r.uniform(0.055, 0.075), 0.8)]:
        i = ns(at); L = min(ns(0.06), n - i); tl = np.arange(L) / SR
        y[i:i + L] += bp(colored(L, r, 0.2), 300, 4200) * np.exp(-tl / 0.008) * g + np.sin(2 * np.pi * r.uniform(1050, 1300) * tl) * np.exp(-tl / 0.02) * 0.4 * g
    y += lp(colored(n, r, 1.0), 120, 2) * np.exp(-np.arange(n) / (SR * 0.06)) * 0.6
    return fades(_tunnel(y * 0.6, 0.35, 1.6), 0.001, 0.1)


def brake_squeal(r, d=2.2):
    """gentle disc/tread brake squeal while the train slows (flutters, never piercing - mixed low)"""
    n = ns(d); u = np.arange(n) / n; f0 = r.uniform(2700, 3100) * (1 - 0.06 * u)
    y = np.sin(phase(f0 * (1 + 0.004 * np.sin(2 * np.pi * 7 * u * d)))) * (0.5 + 0.5 * smooth_noise(n, r, 5)) * np.sin(np.pi * u) ** 0.8
    return fades(_tunnel(lp(y, 4000, 2) * 0.3, 0.5), 0.2, 0.4)


def air_rush(r, d=2.4):
    """piston wind pushed up the shaft by the train: a swelling, gusting rush (rises in pitch with the camera)"""
    n = ns(d); u = np.arange(n) / n
    y = colored(n, r, 0.5); y = bp(y, 180, 2400) * (0.45 + 0.55 * smooth_noise(n, r, 4)); lo, hi = lp(y, 700, 2), y; y = lo * (1 - u) + hi * u
    return fades(st(y * np.sin(np.pi * u) ** 1.2 * 0.5), 0.15, 0.4)


def tunnel_drip(r):
    """a single water drip onto the invert, echoing down the tube"""
    d = 0.12; n = ns(d); tl = np.arange(n) / SR; f = r.uniform(1400, 2200) * (1 + 1.4 * tl / d)
    y = np.sin(phase(f)) * np.exp(-tl / 0.012)
    return fades(_tunnel(np.concatenate([y, np.zeros(ns(0.6))]) * 0.4, 0.7, 2.4), 0.001, 0.3)


def sign_hum(r, d=1.6):
    """the EXIT lamp's faint mains buzz"""
    n = ns(d); y = sum(np.sin(phase(np.full(n, 120.0 * h))) * a for h, a in [(1, 0.5), (2, 0.25), (3, 0.15), (5, 0.08)])
    return fades(y * 0.25, 0.3, 0.4)


def pigeon_takeoff(r, birds=1):
    """a pigeon bursting off the ground: two or three loud wing claps, then a fast whirring flutter that fades upward"""
    d = 1.3; n = ns(d); y = np.zeros(n)
    for k in range(r.integers(2, 4)):
        i = ns(k * r.uniform(0.05, 0.08)); L = min(ns(0.03), n - i); y[i:i + L] += bp(colored(L, r, 0.0), 500, 5000) * np.exp(-np.arange(L) / (SR * 0.005)) * (1.0 - 0.2 * k)
    u = np.arange(n) / n; am = 0.5 + 0.5 * np.sin(2 * np.pi * r.uniform(8.5, 10.5) * np.arange(n) / SR)
    y += bp(colored(n, r, 0.3), 300, 3000) * am ** 2 * np.clip(u / 0.08, 0, 1) * (1 - u) ** 1.6 * 0.6
    return fades(y * 0.6, 0.001, 0.2)


def pigeon_flutter(r):
    """landing: a short flutter, wings braking, a last clap"""
    d = 0.7; n = ns(d); u = np.arange(n) / n; am = 0.5 + 0.5 * np.sin(2 * np.pi * 9.5 * np.arange(n) / SR)
    y = bp(colored(n, r, 0.3), 300, 2800) * am ** 2 * np.sin(np.pi * u) * 0.6
    i = ns(0.55); L = min(ns(0.03), n - i); y[i:i + L] += bp(colored(L, r, 0.0), 500, 4500) * np.exp(-np.arange(L) / (SR * 0.005)) * 0.7
    return fades(y, 0.02, 0.1)


def pigeon_coo(r):
    """a soft 'coo-roo' (voiced, gliding, throaty)"""
    d = 0.95; n = ns(d); y = np.zeros(n)
    for at, L0, f0 in [(0.0, 0.32, r.uniform(380, 420)), (0.38, 0.5, r.uniform(330, 360))]:
        i = ns(at); L = min(ns(L0), n - i); tl = np.arange(L) / SR; f = f0 * (1 - 0.12 * tl / L0) * (1 + 0.02 * np.sin(2 * np.pi * 22 * tl))
        y[i:i + L] += (np.sin(phase(f)) + 0.35 * np.sin(phase(f * 2))) * np.sin(np.pi * tl / L0) ** 1.2
    return fades(lp(y, 900, 2) * 0.35, 0.02, 0.1)


def parcel_thud(r):
    """a cardboard parcel set down on stone"""
    d = 0.3; n = ns(d); tl = np.arange(n) / SR
    y = lp(colored(n, r, 0.6), 900, 2) * np.exp(-tl / 0.025) + np.sin(2 * np.pi * r.uniform(110, 140) * tl) * np.exp(-tl / 0.04) * 0.6
    return fades(y * 0.6, 0.001, 0.05)


def hazard_tick(r):
    """the van's hazard relay (one click)"""
    d = 0.05; n = ns(d); y = bp(colored(n, r, 0.0), 1500, 6000) * np.exp(-np.arange(n) / (SR * 0.002))
    return fades(y * 0.3, 0.0005, 0.01)


def far_horn(r):
    """a distant car horn two streets away (two short toots, softened by distance)"""
    d = 1.0; n = ns(d); y = np.zeros(n)
    for at, L0 in [(0.0, 0.16), (0.24, 0.3)]:
        i = ns(at); L = min(ns(L0), n - i); tl = np.arange(L) / SR
        y[i:i + L] += (np.sign(np.sin(2 * np.pi * 415 * tl)) * 0.5 + np.sign(np.sin(2 * np.pi * 520 * tl)) * 0.5) * np.sin(np.pi * tl / L0) ** 0.3
    y = lp(y, 1300, 2); y = y + np.concatenate([np.zeros(ns(0.09)), y[:-ns(0.09)]]) * 0.35
    return fades(y * 0.3, 0.01, 0.2)


def shield_hiss(r):
    """1907 tunnelling shield: hydraulic rams push (hiss + strain) and a heavy clunk"""
    d = 1.3; n = ns(d); u = np.arange(n) / n
    y = hp(colored(n, r, 0.1), 1800, 2) * np.sin(np.pi * u) ** 0.6 * 0.35 + lp(colored(n, r, 1.3), 160, 2) * 0.5 * u
    i = ns(1.0); L = n - i; y[i:] += lp(colored(L, r, 0.8), 400, 2) * np.exp(-np.arange(L) / (SR * 0.05)) * 1.2
    return fades(y * 0.5, 0.05, 0.1)


def ring_clank(r):
    """a cast-iron ring segment swung into place and bolted: big metallic clank"""
    m = modal(1.1, [(r.uniform(280, 320), 1.0, 0.35), (r.uniform(780, 860), 0.6, 0.25), (r.uniform(1400, 1520), 0.35, 0.15), (2310, 0.2, 0.08)], r)
    return fades(m * 0.5 + bp(colored(len(m), r, 0.2), 600, 5000) * np.exp(-np.arange(len(m)) / (SR * 0.01)) * 0.5, 0.001, 0.2)


def muck_cart(r, d=1.6):
    """the muck car's iron wheels rolling on the temporary track (rumble + rhythmic rail clicks)"""
    n = ns(d); u = np.arange(n) / n; y = lp(colored(n, r, 1.2), 300, 2) * 0.5
    for at in np.arange(0.1, d, 0.38):
        i = ns(at); L = min(ns(0.04), n - i); y[i:i + L] += bp(colored(L, r, 0.2), 600, 3500) * np.exp(-np.arange(L) / (SR * 0.006)) * 0.6
    return fades(y * np.sin(np.pi * u) ** 0.5 * 0.6, 0.1, 0.2)


# ---------------------------------------------------------------- footsteps (rebuilt): leather/rubber soles, per surface
def shoe_step(r, surface="concrete", foot=0, weight=1.0):
    """one natural footstep = heel contact (a short, bright, dry tick with a little dull weight underneath, no tonal
    'boom') + the sole rolling down 45-90 ms later (soft gritty scuff) + an occasional faint toe-off scrape.
    foot 0/1 gives each foot its own slight colour so left/right alternate naturally; every instance is varied
    (timing, brightness, heel/sole balance, grit). surface: concrete (sidewalk), wood (parlour boards),
    tunnel (concrete walkway inside the tube: short slap + small cast-iron reverb)."""
    d = 0.24; n = ns(d); t = np.arange(n) / SR; y = np.zeros(n)
    bright = r.uniform(0.85, 1.15) * (1.06 if foot else 0.95)
    # heel: 2-4 ms click (filtered noise) + a very low, very short weight thump (lowpassed noise, not a resonance)
    hl = ns(0.03); th = np.arange(hl) / SR
    click = bp(r.standard_normal(hl), 1400 * bright, 6500 * bright, 2) * np.exp(-th / r.uniform(0.0022, 0.0035))
    thump = lp(r.standard_normal(hl), r.uniform(260, 380), 2) * np.exp(-th / r.uniform(0.007, 0.011)) * r.uniform(0.35, 0.55) * weight
    y[:hl] += click + thump
    # sole roll: soft scuff with grit, raised-cosine envelope
    s0 = r.uniform(0.045, 0.085) * (1.0 + 0.08 * (foot - 0.5)); sl = ns(r.uniform(0.035, 0.06)); i0 = ns(s0)
    env = np.sin(np.pi * np.arange(sl) / sl) ** 1.5
    scuff = bp(colored(sl, r, 0.3), 900 * bright, 5500 * bright, 1) * env * r.uniform(0.18, 0.32)
    grit = (r.random(sl) < 0.004) * r.uniform(-1, 1, sl); grit = hp(grit, 2500, 2) * env * 0.5
    y[i0:i0 + sl] += scuff + grit
    if r.random() < 0.35:                                           # toe-off scrape (sometimes)
        tl = ns(0.04); j = min(n - tl, i0 + sl + ns(r.uniform(0.01, 0.03)))
        y[j:j + tl] += bp(colored(tl, r, 0.2), 2000, 7000, 1) * np.hanning(tl) * r.uniform(0.05, 0.1)
    if surface == "wood":                                           # boards: a damped knock in the low mids + rare faint creak
        knock = modal(0.06, [(r.uniform(320, 420), 0.5, 0.012), (r.uniform(650, 820), 0.3, 0.008)], r)
        y[:len(knock)] += knock * 0.35 * weight; y = lp(y, 7000, 2)
        if r.random() < 0.2:
            cl = ns(0.12); f0 = r.uniform(500, 700); y[ns(0.06):ns(0.06) + cl] += np.sin(phase(np.full(cl, f0) * (1 + 0.05 * np.linspace(0, 1, cl)))) * np.hanning(cl) * 0.025
    y = fades(y, 0.0004, 0.03)
    if surface == "tunnel":
        return _tunnel(y * 0.9, wet=0.22, rt=1.5)
    return y
