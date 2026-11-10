#!/usr/bin/env python3
"""TwistFrame Lab — automatic QC of the ENCODED video (Phase 10).
Usage: qc.py <final.mp4> <analysis.json> <narration audio> <outdir> [--loop]
Checks the rendered file itself: container/codec/size/fps, frame count + duration vs narration, black frames,
frozen/duplicated runs, loudness/true peak/clipping, narration sync (cross-correlation against the original voice),
loop boundary (visual + audio continuity, plus an end->start test clip), and writes a contact sheet for visual review.
Aesthetic quality (ears, hands, detail, style) is NOT auto-judged: it is listed for mandatory visual inspection.
Exit code 1 if a hard check fails."""
import json, os, re, subprocess, sys
import numpy as np

mp4, anp, voice, outd = sys.argv[1:5]; LOOP = "--loop" in sys.argv
cfg = json.load(open(os.path.join(os.path.dirname(__file__), "..", "twistframe.config.json")))
an = json.load(open(anp)); os.makedirs(outd, exist_ok=True)
FPS = cfg["video"]["fps"]; R = {"file": mp4, "checks": []}
def chk(name, ok, detail, hard=True): R["checks"].append({"check": name, "pass": bool(ok), "hard": hard, "detail": detail})
def run(*a): return subprocess.run(list(a), capture_output=True, text=True)

pr = json.loads(run("ffprobe", "-v", "error", "-count_frames", "-print_format", "json", "-show_streams", "-show_format", mp4).stdout)
v = next(s for s in pr["streams"] if s["codec_type"] == "video"); a = next((s for s in pr["streams"] if s["codec_type"] == "audio"), None)
nf = int(v.get("nb_read_frames", v.get("nb_frames", 0))); fr = eval(v["r_frame_rate"]); vd = float(v.get("duration", pr["format"]["duration"]))
chk("video codec H.264", v["codec_name"] == "h264", v["codec_name"])
chk("audio track AAC", a is not None and a["codec_name"] == "aac", a["codec_name"] if a else "missing")
chk("9:16 resolution", v["width"] * 16 == v["height"] * 9, f"{v['width']}x{v['height']}")
chk("30 fps", abs(fr - FPS) < 1e-3, str(fr))
exp = an["frames"] if "--partial" not in sys.argv else nf
chk("frame count = narration frames", abs(nf - exp) <= cfg["qc"]["durationToleranceFrames"], f"{nf} vs {exp}")
chk("duration = narration", abs(vd - an["duration"]) <= 1.5 / FPS or "--partial" in sys.argv, f"video {vd:.3f}s vs narration {an['duration']:.3f}s")
if a: chk("audio duration matches video", abs(float(a.get("duration", vd)) - vd) < 0.05, f"audio {float(a.get('duration', 0)):.3f}s")

bl = run("ffmpeg", "-hide_banner", "-i", mp4, "-vf", "blackdetect=d=0.03:pix_th=0.06", "-an", "-f", "null", "-").stderr
blacks = re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", bl)
chk("no black frames", len(blacks) <= cfg["qc"]["maxBlackFrames"], f"{len(blacks)} black runs {blacks[:5]}")
fz = run("ffmpeg", "-hide_banner", "-i", mp4, "-vf", f"freezedetect=n=0.0008:d={cfg['qc']['freezeMinSeconds']}", "-an", "-f", "null", "-").stderr
freezes = re.findall(r"freeze_start: ([\d.]+)", fz)
# single-frame glitches (a frame that differs from BOTH neighbours far more than they differ from each other),
# e.g. a NaN pixel smeared into blocks by the post blur, a texture that failed to upload, a one-frame pop
_raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-vf", "scale=90:160", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
_fr = np.frombuffer(_raw, np.uint8).astype(float).reshape(-1, 160 * 90)
glitches = []
for i in range(1, len(_fr) - 1):
    dp, dn, dpn = [np.abs(x - y).mean() for x, y in ((_fr[i], _fr[i - 1]), (_fr[i], _fr[i + 1]), (_fr[i - 1], _fr[i + 1]))]
    if min(dp, dn) > max(8.0, 4.0 * dpn): glitches.append(i)
chk("no single-frame glitches", not glitches, f"{len(glitches)} at frames {glitches[:10]}")
chk("no frozen/duplicated runs", not freezes, f"{len(freezes)} freeze(s) at {freezes[:6]}", hard=False)

if a:
    eb = run("ffmpeg", "-nostats", "-i", mp4, "-af", "ebur128=peak=true", "-vn", "-f", "null", "-").stderr
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", eb)[-1]); TP = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", eb)[-1])
    chk("loudness near target", abs(I - cfg["audio"]["targetLufs"]) <= cfg["qc"]["lufsTolerance"], f"I={I} LUFS (target {cfg['audio']['targetLufs']})", hard=False)
    chk("no clipping (true peak <= -1 dBTP)", TP <= -0.9, f"TP={TP} dBTP")
    # narration sync: cross-correlate onset envelopes of the final mix and the original narration (first 20 s)
    def env(path, secs=20):
        x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-t", str(secs), "-ac", "1", "-ar", "8000", "-f", "f32le", "-"], capture_output=True).stdout, np.float32)
        w = 80; e = np.sqrt(np.convolve(x ** 2, np.ones(w) / w, "same"))[::w]; return (e - e.mean()) / (e.std() + 1e-9)
    e1, e2 = env(mp4), env(voice); n = min(len(e1), len(e2))
    lags = range(-30, 31); cc = [np.dot(e1[max(0, l):n + min(0, l)], e2[max(0, -l):n - max(0, l)]) for l in lags]
    lag_ms = (list(lags)[int(np.argmax(cc))]) * 10
    chk("narration in sync (|offset| <= 1 frame)", abs(lag_ms) <= 1000 / FPS, f"offset {lag_ms} ms")

# narration priority (from the mixer's measured report, if present): every word clear of the background, crowd quiet
_mr = os.path.join(os.path.dirname(os.path.abspath(anp)), "..", "audio", "mix_report.json")
if os.path.exists(_mr):
    M = json.load(open(_mr)); q = cfg["qc"]
    if M.get("min_word_margin_after_db") is not None:
        chk("narration intelligible (every word above background)", M["min_word_margin_after_db"] >= q.get("minWordMarginDb", 12), f"worst word margin {M['min_word_margin_after_db']} dB in speech band (target >= {q.get('minWordMarginDb', 12)}; {len(M.get('guard_adjustments', []))} automatic guard cuts)")
    cr = (M.get("stems_lu_re_narration") or {}).get("crowd")
    if cr is not None: chk("crowd stays quiet under narration", cr <= q.get("maxCrowdLuReNarration", -18), f"crowd {cr} LU re narration (limit {q.get('maxCrowdLuReNarration', -18)})")
    if M.get("skipped_unknown_kinds"): chk("all sound events have generators", False, f"skipped {M['skipped_unknown_kinds']}")

if LOOP:
    T = cfg["qc"]["loopBoundarySeconds"]; tmp = os.path.join(outd, "_lb")
    os.makedirs(tmp, exist_ok=True)
    run("ffmpeg", "-v", "error", "-y", "-sseof", f"-{T}", "-i", mp4, "-c:v", "libx264", "-crf", "16", "-c:a", "aac", os.path.join(tmp, "end.mp4"))
    run("ffmpeg", "-v", "error", "-y", "-t", str(T), "-i", mp4, "-c:v", "libx264", "-crf", "16", "-c:a", "aac", os.path.join(tmp, "start.mp4"))
    open(os.path.join(tmp, "l.txt"), "w").write(f"file 'end.mp4'\nfile 'start.mp4'\n")
    run("ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "l.txt"), "-c", "copy", os.path.join(outd, "loop_boundary_test.mp4"))
    def frame(path, sel):
        return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"{sel},scale=180:320", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout, np.uint8).astype(float)
    first = frame(mp4, "select=eq(n\\,0)"); last = subprocess.run(["ffmpeg", "-v", "error", "-sseof", "-0.05", "-i", mp4, "-vf", "scale=180:320", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    last = np.frombuffer(last, np.uint8).astype(float); md = float(np.mean(np.abs(first - last))) if len(first) == len(last) else 255
    chk("loop: last frame ~ first frame", md <= cfg["qc"]["loopMaxMeanDiff"], f"mean abs diff {md:.1f} (limit {cfg['qc']['loopMaxMeanDiff']})", hard=False)
    au = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(outd, "loop_boundary_test.mp4"), "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], capture_output=True).stdout, np.float32)
    j = int(T * 48000); seg = au[j - 2400:j + 2400]
    step = float(np.max(np.abs(np.diff(seg)))) if len(seg) > 10 else 0; rms_a = float(np.sqrt(np.mean(au[j - 4800:j] ** 2) + 1e-12)); rms_b = float(np.sqrt(np.mean(au[j:j + 4800] ** 2) + 1e-12))
    chk("loop: no audio click at boundary", step < 0.25, f"max sample step {step:.3f}", hard=False)
    chk("loop: ambience level continuous", abs(20 * np.log10(rms_b / rms_a)) < 6, f"level change {20*np.log10(rms_b/rms_a):+.1f} dB", hard=False)

run("ffmpeg", "-v", "error", "-y", "-i", mp4, "-vf", f"select='not(mod(n\\,{max(1, nf // 24)}))',scale=180:320,tile=8x3", "-frames:v", "1", os.path.join(outd, "contact_sheet.png"))
R["manual_visual_inspection_required"] = ["character has NO ears in every view", "head/torso join clean, no floating parts", "hands/fingers/elbows plausible; feet planted (no slide)",
    "bridge/architecture: no stretching, z-fighting, flicker or popping", "environment detail & lighting vs style bible", "camera continuity feel (no perceived jumps)", "sound events match visible actions"]
hard_fail = [c for c in R["checks"] if c["hard"] and not c["pass"]]
R["result"] = "FAIL" if hard_fail else "PASS (automatic checks) — visual review still required"
json.dump(R, open(os.path.join(outd, "qc.json"), "w"), indent=1)
with open(os.path.join(outd, "QC_REPORT.md"), "w") as fh:
    fh.write(f"# QC report\n\nfile: `{os.path.basename(mp4)}` — **{R['result']}**\n\n| check | result | detail |\n|---|---|---|\n")
    for c in R["checks"]: fh.write(f"| {c['check']}{'' if c['hard'] else ' (soft)'} | {'✅' if c['pass'] else '❌'} | {c['detail']} |\n")
    fh.write("\n## Mandatory visual inspection (not automatable)\n" + "".join(f"- [ ] {x}\n" for x in R["manual_visual_inspection_required"]) + "\nArtifacts: `contact_sheet.png`" + (", `loop_boundary_test.mp4`" if LOOP else "") + "\n")
print(R["result"]); [print(("PASS " if c["pass"] else "FAIL ") + c["check"] + " — " + c["detail"]) for c in R["checks"]]
sys.exit(1 if hard_fail else 0)
