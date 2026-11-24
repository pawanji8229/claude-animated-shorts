"""Audio 2.0 narration processing: validation, measurement, timing. The narration is NEVER edited (no trimming,
speed, pitch or content change). The only optional processing is one uniform gain (and, if explicitly asked, a 70 Hz
rumble high-pass); both are reported."""
import json, os, subprocess, sys
import numpy as np
from engine import SR, integrated, true_peak
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", "audio"))
from dsp import hp  # noqa: E402

def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<f4").reshape(-1, 2).T.astype(np.float64)
def validate(path):
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", path], capture_output=True, text=True)
    if p.returncode: return {"ok": False, "error": "cannot decode"}
    j = json.loads(p.stdout); x = load(path); m = x.mean(axis=0)
    return {"ok": True, "codec": j["streams"][0]["codec_name"], "sampleRate": int(j["streams"][0]["sample_rate"]), "channels": j["streams"][0]["channels"], "duration": float(j["format"]["duration"]),
            "integratedLufs": round(float(integrated(x)), 2), "truePeakDb": round(float(true_peak(x)), 2), "clipped": int((np.abs(x) >= 0.999).sum()), "dcOffset": round(float(m.mean()), 5)}
def silences(x, min_len=0.25, thr_rel=-35):
    """pauses: windows quieter than (90th-percentile level + thr_rel) for at least min_len seconds"""
    m = x.mean(axis=0); h = int(SR * 0.01); nb = len(m) // h; lv = 20 * np.log10(np.sqrt(np.mean(m[:nb * h].reshape(nb, h) ** 2, axis=1)) + 1e-9); thr = np.percentile(lv, 90) + thr_rel
    q = lv < thr; out = []; s = None
    for i, v in enumerate(list(q) + [False]):
        if v and s is None: s = i
        if not v and s is not None:
            if (i - s) * 0.01 >= min_len: out.append({"start": round(s * 0.01, 2), "end": round(i * 0.01, 2)})
            s = None
    return out
def words_from_analysis(path):
    """word timings from the existing TwistFrame analysis (offline ASR); words are timing only - never re-written"""
    a = json.load(open(path)); return [w for ph in a.get("phrases", []) for w in ph.get("asr_words", [])]
def prepare(x, gain_db=0.0, rumble_hp=False):
    y = x * 10 ** (gain_db / 20); return (hp(y, 70) if rumble_hp else y), {"gainDb": gain_db, "highPass70Hz": rumble_hp, "edited": False}
