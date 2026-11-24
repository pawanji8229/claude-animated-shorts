"""Audio 2.0 engine: deterministic, frame-accurate timeline rendering + professional narration-first mixing.

  library      registry-backed loading (ffmpeg decode -> 48 kHz stereo float, cached as .npy), search, duplicate-safe
  choose       intelligent, deterministic selection with anti-repetition (never the same file twice in a row per
               category, round-robin over the best tag matches, seeded variation)
  Event        one sound on the timeline: start, trim, fades, gain + automation, pan / 3D position, distance,
               playback-rate (pitch) variation, loop length, bus, reverb send, the reason it exists ('why')
  render       events -> buses (character, sfx, ambience, music) with spatialisation: distance attenuation,
               air absorption (low-pass grows with distance), constant-power pan, environment reverb (synthetic IRs)
  mix          narration-first mix: sidechain ducking from the narration envelope (smooth attack / release), per-bus
               high-pass EQ, gentle bus compression, per-word masking guard in the speech band, one master gain to the
               loudness target, true-peak limiter; measures integrated LUFS, true peak, clipping, per-word margins
Everything is deterministic: the same timeline renders bit-identical audio.
"""
import hashlib, json, os, subprocess, sys
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "audio"))
from dsp import SR, ns, dbg, pan as cpan, st, make_ir, convolve_st, integrated, true_peak, write_wav, read_wav, lp, hp, bp, momentary_max  # noqa: E402

AL = os.path.abspath(os.path.join(HERE, "..", "..", "asset-library"))
CACHE = os.path.join(HERE, ".cache"); os.makedirs(CACHE, exist_ok=True)
_REG = None
def registry():
    global _REG
    if _REG is None: _REG = {s["id"]: s for s in json.load(open(os.path.join(HERE, "library", "registry.json")))["sounds"] if s["status"] == "ready"}
    return _REG
_MEM = {}
def load(sid):
    """registry id -> float32 stereo (2, n) at 48 kHz (decoded once, cached on disk as .npy and in memory)"""
    if sid in _MEM: return _MEM[sid]
    if sid.startswith("synth:"):
        from synth import SYNTH; name, _, seed = sid[6:].partition("#"); x = st(SYNTH[name](int(seed or 0))); _MEM[sid] = x; return x
    r = registry()[sid]; cp = os.path.join(CACHE, hashlib.sha1(sid.encode()).hexdigest() + ".npy")
    if os.path.exists(cp): x = np.load(cp)
    else:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(AL, r["local"]), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
        x = np.frombuffer(raw, "<f4").reshape(-1, 2).T.copy(); np.save(cp, x)
    _MEM[sid] = x; return x

_ONS = {}
def onset(sid, thr_db=-30.0):
    """seconds of leading silence before the first transient (so a cue lands exactly on its frame)"""
    if sid not in _ONS:
        x = np.abs(load(sid)).max(axis=0); pk = x.max() + 1e-12; i = int(np.argmax(x > pk * 10 ** (thr_db / 20))); _ONS[sid] = max(0.0, i / SR - 0.002)
    return _ONS[sid]
_STEPS = {}
def step_onsets(sid, min_gap=0.28):
    """transient times inside a recording (individual footsteps in a walking take), strongest-first spacing rule"""
    if sid not in _STEPS:
        x = np.abs(load(sid)).max(axis=0); h = int(0.005 * SR); nb = len(x) // h; e = x[:nb * h].reshape(nb, h).max(axis=1); thr = e.max() * 0.25; out = []
        for i in range(1, nb - 1):
            if e[i] > thr and e[i] >= e[i - 1] and e[i] >= e[i + 1] and e[i - 1] < e[i] * 0.9 and (not out or i * 0.005 - out[-1] >= min_gap): out.append(i * 0.005)
        # start each step a few ms before its peak, at the rise
        _STEPS[sid] = [max(0.0, o - 0.012) for o in out] or [onset(sid)]
    return _STEPS[sid]
def search(category=None, tags=(), dur=(0, 1e9), source=None):
    out = []
    for s in registry().values():
        if category and s["category"] != category: continue
        if source and s["source"] != source: continue
        if not (dur[0] <= s.get("duration", 0) <= dur[1]): continue
        score = sum(1 for t in tags if t in s["tags"] or t in s["name"].lower())
        if tags and score == 0: continue
        out.append((score, s["id"]))
    return [sid for _, sid in sorted(out, key=lambda x: (-x[0], x[1]))]

class Chooser:
    """deterministic anti-repetition: keeps a history per key; picks among the top-N candidates in a seeded rotation,
    never repeating the last `avoid` picks (unless only one candidate exists)"""
    def __init__(self, seed=0, avoid=2): self.seed, self.avoid, self.hist = seed, avoid, {}
    def pick(self, key, cands, top=6):
        if not cands: return None
        pool = cands[:max(1, min(top, len(cands)))]; h = self.hist.setdefault(key, [])
        rot = int(hashlib.md5(f"{self.seed}|{key}|{len(h)}".encode()).hexdigest(), 16)
        for k in range(len(pool)):
            c = pool[(rot + k) % len(pool)]
            if c not in h[-self.avoid:] or len(pool) == 1: h.append(c); return c
        h.append(pool[0]); return pool[0]
    def repeats(self):
        return sum(1 for h in self.hist.values() for a, b in zip(h, h[1:]) if a == b)

# ---------------------------------------------------------------- events + rendering
BUSES = ("character", "sfx", "ambience", "music")
def ev(t, sound, bus="sfx", gain_db=0.0, pan=0.0, pos=None, dist=None, fade_in=0.004, fade_out=0.03, trim=(0.0, None), rate=1.0, loop_dur=None, auto=None, reverb=0.0, why="", **extra):
    """auto: [(t_rel, db)] breakpoint gain automation (linear-in-dB, interpolated per sample); pos: per-event fixed 3D
    position relative to the listener [x right, y up, z forward] (overrides pan/dist)"""
    return {"t": float(t), "sound": sound, "bus": bus, "gain_db": gain_db, "pan": pan, "pos": pos, "dist": dist, "fade_in": fade_in, "fade_out": fade_out, "trim": list(trim), "rate": rate, "loop_dur": loop_dur, "auto": auto, "reverb": reverb, "why": why, **extra}

def _resample(x, rate):
    if abs(rate - 1) < 1e-4: return x
    up, down = 1000, int(round(1000 * rate)); return signal.resample_poly(x, up, down, axis=-1)
def _loop(x, n, xf=0.25):
    """seamless loop to n samples: equal-power crossfade of the tail into the head"""
    if x.shape[1] >= n: return x[:, :n]
    k = min(ns(xf), x.shape[1] // 3); body = x[:, :x.shape[1] - k].copy(); body[:, :k] = body[:, :k] * np.sin(np.linspace(0, np.pi / 2, k)) + x[:, -k:] * np.cos(np.linspace(0, np.pi / 2, k))
    reps = int(np.ceil(n / body.shape[1])) + 1; return np.tile(body, (1, reps))[:, :n]
def spatial(pos):
    """listener-relative position -> (pan, distance attenuation dB, air low-pass Hz)"""
    x, y, z = pos; d = max(0.5, float(np.hypot(np.hypot(x, y), z))); az = np.arctan2(x, max(1e-3, z) if z > 0 else z)
    p = float(np.clip(np.sin(az), -1, 1)) * (0.85 if d > 2 else 0.6)
    att = -20 * np.log10(max(1.0, d / 2.0)); air = 20000 * np.exp(-max(0, d - 10) / 90); return p, att, air
def render_event(e, n_total):
    x = load(e["sound"]); t0, t1 = e["trim"]; a = ns(t0); b = x.shape[1] if t1 is None else min(x.shape[1], ns(t1)); y = x[:, a:b]
    y = _resample(y, e["rate"])
    if e.get("loop_dur"): y = _loop(y, ns(e["loop_dur"]))
    n = y.shape[1]
    if n == 0: return None, 0
    fi, fo = min(n // 2, ns(e["fade_in"])), min(n // 2, ns(e["fade_out"])); env = np.ones(n)
    if fi: env[:fi] = np.sin(np.linspace(0, np.pi / 2, fi)) ** 2
    if fo: env[-fo:] = np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    g = dbg(e["gain_db"]) * env
    if e.get("auto"):
        tp = np.array([p[0] for p in e["auto"]]) * SR; gp = np.array([p[1] for p in e["auto"]]); g = g * dbg(np.interp(np.arange(n), tp, gp))
    pn, air = e["pan"], None
    if e.get("pos") is not None:
        pn, att, air = spatial(e["pos"]); g = g * dbg(att)
    elif e.get("dist"): g = g * dbg(-20 * np.log10(max(1.0, e["dist"] / 2.0))); air = 20000 * np.exp(-max(0, e["dist"] - 10) / 90)
    mono = y.mean(axis=0)
    if air and air < 16000: mono = lp(mono, max(800.0, air), 1)
    if e.get("pan_auto"):   # moving source: per-sample constant-power pan from breakpoints [(t_rel, pan)]
        tp = np.array([p[0] for p in e["pan_auto"]]) * SR; pp = np.clip(np.interp(np.arange(n), tp, [p[1] for p in e["pan_auto"]]), -1, 1); th = (pp + 1) * np.pi / 4
        return np.stack([mono * g * np.cos(th), mono * g * np.sin(th)]) * np.sqrt(2), ns(e["t"])
    side = (y[0] - y[1]) * 0.5 * (1 - abs(pn))   # keep some original stereo width for centred ambiences
    out = cpan(mono * g, pn) + np.stack([side * g, -side * g]); return out, ns(e["t"])

ENV_IR = {"street": (0.9, 1.3), "city": (1.1, 1.2), "construction": (0.7, 1.4), "harbor": (0.6, 1.6), "factory": (2.4, 0.9), "warehouse": (2.8, 0.9), "interior": (0.45, 1.5), "historicTown": (1.0, 1.2),
          "countryside": (0.3, 2.0), "station": (2.0, 1.0), "waterfront": (0.5, 1.8), "tunnel": (3.2, 0.8), "forest": (0.4, 1.8)}
_IRS = {}
def render(events, dur, environment="street"):
    """events -> dict of stereo buses (2, N). Reverb: one shared IR per environment, fed by each event's send."""
    N = ns(dur); bus = {b: np.zeros((2, N)) for b in BUSES}; send = np.zeros((2, N))
    for e in sorted(events, key=lambda e: (e["t"], e["sound"])):
        y, i = render_event(e, N)
        if y is None: continue
        a, b = max(0, i), min(N, i + y.shape[1])
        if b <= a: continue
        bus[e["bus"]][:, a:b] += y[:, a - i:b - i]
        if e.get("reverb"): send[:, a:b] += y[:, a - i:b - i] * e["reverb"]
    if np.abs(send).max() > 0:
        rt, hf = ENV_IR.get(environment, (1.0, 1.2)); key = (environment, rt)
        if key not in _IRS: _IRS[key] = make_ir(rt, 1234, hf=hf)
        bus["sfx"] += convolve_st(send, _IRS[key]) * 0.35
    return bus

# ---------------------------------------------------------------- mixer
def envelope(x, attack=0.06, release=0.6, hop=0.01):
    """smoothed speech-presence envelope 0..1 from a (narration) signal (block RMS -> gate -> attack/release)"""
    m = st(x).mean(axis=0); h = ns(hop); nb = len(m) // h; r = np.sqrt(np.mean(m[:nb * h].reshape(nb, h) ** 2, axis=1) + 1e-12)
    lvl = 20 * np.log10(r); thr = np.percentile(lvl, 90) - 30; gate = (lvl > thr).astype(float)
    out = np.zeros(nb); a, rl = np.exp(-hop / attack), np.exp(-hop / release); v = 0.0
    for k in range(nb): tgt = gate[k]; v = tgt + (v - tgt) * (a if tgt > v else rl); out[k] = v
    return np.interp(np.arange(len(m)), np.arange(nb) * h + h / 2, out)
def compress(x, thr_db=-18, ratio=2.0, attack=0.01, release=0.15):
    """gentle feed-forward RMS compressor (bus glue; never squashes)"""
    m = np.abs(st(x)).max(axis=0); h = ns(0.005); nb = max(1, len(m) // h); r = m[:nb * h].reshape(nb, h).max(axis=1)
    lvl = 20 * np.log10(r + 1e-9); gr = np.minimum(0, (thr_db - lvl) * (1 - 1 / ratio)); out = np.zeros(nb); v = 0.0; a, rl = np.exp(-0.005 / attack), np.exp(-0.005 / release)
    for k in range(nb): v = gr[k] + (v - gr[k]) * (a if gr[k] < v else rl); out[k] = v
    return x * dbg(np.interp(np.arange(x.shape[1]), np.arange(nb) * h, out))
def limiter(x, ceiling_db=-1.0, look=0.005, release=0.08):
    """look-ahead peak limiter on the 4x-oversampled peak estimate (true-peak safe)"""
    c = dbg(ceiling_db); up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(axis=0); pk = up.reshape(-1, 4).max(axis=1)[:x.shape[1]]
    need = np.minimum(1.0, c / np.maximum(pk, 1e-9)); L = ns(look)
    # min over the look-ahead window (sliding minimum via erosion), then smooth release
    from scipy.ndimage import minimum_filter1d
    gmin = minimum_filter1d(need, size=2 * L + 1, mode="nearest"); B = 32; nb = int(np.ceil(len(gmin) / B)); gb = np.pad(gmin, (0, nb * B - len(gmin)), constant_values=1).reshape(nb, B).min(axis=1)
    out = np.empty(nb); v = 1.0; rl = np.exp(-B / (release * SR))
    for i in range(nb): v = gb[i] if gb[i] < v else gb[i] + (v - gb[i]) * rl; out[i] = v
    g = np.minimum(gmin, np.repeat(out, B)[:len(gmin)])   # attack is instant on the look-ahead minimum, release smooth
    return x * g
def word_margins(narr, rest, words):
    """speech-band (300-4000 Hz) level of each word: narration vs everything else (dB)"""
    nb, rb = bp(st(narr).mean(axis=0), 300, 4000), bp(st(rest).mean(axis=0), 300, 4000); out = []
    for w in words:
        a, b = ns(w["t0"]), ns(w["t1"])
        if b - a < ns(0.04): continue
        en, er = np.sqrt(np.mean(nb[a:b] ** 2) + 1e-12), np.sqrt(np.mean(rb[a:b] ** 2) + 1e-12); out.append({"word": w["word"], "t0": w["t0"], "margin": float(20 * np.log10(en / er))})
    return out
REL = {"ambience": ("int", -24.0), "music": ("int", -20.0), "sfx": ("mom", -7.0), "character": ("mom", -9.0)}
def mix(buses, narration=None, words=(), target_lufs=-16.0, ceiling_db=-1.5, duck=None, min_margin=15.0, eq=True, rel=None):
    """narration-first mix. Returns (mix, stems, report). rel: per-bus level relative to the narration
    ('int' = integrated LU under the narration loudness, 'mom' = loudest-moment dB under the narration's loudest moment)"""
    rel = REL if rel is None else rel
    duck = duck or {"character": -3, "sfx": -4, "ambience": -6, "music": -10}
    N = next(iter(buses.values())).shape[1]; stems = {k: v.copy() for k, v in buses.items()}
    if eq: stems["sfx"] = hp(stems["sfx"], 40); stems["ambience"] = hp(stems["ambience"], 60); stems["music"] = hp(stems["music"], 45); stems["character"] = hp(stems["character"], 60)
    stems["sfx"] = compress(stems["sfx"]); stems["music"] = compress(stems["music"], -22, 1.6)
    rep = {"duck": duck, "guard": [], "relative": rel}
    # level every layer RELATIVE to the narration (the narration is the reference; it is never changed):
    # beds by integrated loudness (LU under the narration), event buses by their loudest moment (dB under its peak)
    if narration is not None: nref = st(narration); Ln, Lm = integrated(nref), momentary_max(nref)
    else: Ln, Lm = -20.0, -12.0
    for k, (mode, off) in rel.items():
        x = stems[k]
        if np.abs(x).max() < 1e-7: continue
        cur = integrated(x) if mode == "int" else momentary_max(x)
        if np.isfinite(cur): stems[k] = x * dbg((Ln if mode == "int" else Lm) + off - cur)
    if narration is not None:
        nar = st(narration)[:, :N]; nar = np.pad(nar, ((0, 0), (0, N - nar.shape[1]))); spk = envelope(nar)
        for k, d in duck.items(): stems[k] = stems[k] * dbg(d * spk)
        stems["narration"] = nar
        # masking guard: pull every background layer down around words that are not clear enough (smooth ramps);
        # iterated (re-measure after each pass) because a cut changes the masking of neighbouring words
        mg0 = None
        for _pass in range(3):
            rest = sum(stems[k] for k in BUSES); mg = word_margins(nar, rest, words); mg0 = mg0 or mg; gcurve = np.zeros(N); hit = False
            for m in mg:
                if m["margin"] < min_margin:
                    hit = True; cut = min(20.0, min_margin - m["margin"] + 1.5); a, b = ns(m["t0"] - 0.1), ns(m["t0"] + 0.7); gcurve[max(0, a):min(N, b)] = np.minimum(gcurve[max(0, a):min(N, b)], -cut); rep["guard"].append({"word": m["word"], "t": m["t0"], "cutDb": round(cut, 1), "pass": _pass})
            if not hit: break
            k = signal.windows.hann(ns(0.12)); k /= k.sum(); gcurve = np.minimum(gcurve, signal.fftconvolve(gcurve, k, mode="same"))
            for kb in BUSES: stems[kb] = stems[kb] * dbg(gcurve)
        mg = mg0
        rep["wordMarginsBefore"] = [round(m["margin"], 1) for m in mg]
    full = sum(stems.values()); li = integrated(full); g = dbg(target_lufs - li) if np.isfinite(li) else 1.0
    stems = {k: v * g for k, v in stems.items()}; full = limiter(full * g, ceiling_db)
    after = word_margins(stems["narration"], sum(stems[k] for k in BUSES), words) if narration is not None else []
    rep.update({"integratedLufs": round(float(integrated(full)), 2), "truePeakDb": round(float(true_peak(full)), 2), "clippedSamples": int((np.abs(full) >= 0.999).sum()), "masterGainDb": round(20 * np.log10(g), 2),
        "worstWordMarginDb": round(min([m["margin"] for m in after]), 1) if after else None, "wordsBelowMargin": sum(1 for m in after if m["margin"] < min_margin),
        "stemLufs": {k: (round(float(integrated(v)), 1) if np.abs(v).max() > 1e-6 else None) for k, v in stems.items()}})
    return full, stems, rep

def export(path_wav, x, aac=None, video=None, out_mp4=None):
    """24-bit WAV; optional AAC (.m4a) and mux onto a video (audio trimmed/padded to the video length)"""
    write_wav(path_wav, x)
    if aac: subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path_wav, "-c:a", "aac", "-b:a", "256k", aac], check=True)
    if video and out_mp4: subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-i", path_wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", out_mp4], check=True)
def mp3(path_wav, path_mp3):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path_wav, "-c:a", "libmp3lame", "-q:a", "2", path_mp3], check=True)
