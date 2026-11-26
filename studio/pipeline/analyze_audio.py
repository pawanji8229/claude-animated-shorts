#!/usr/bin/env python3
"""TwistFrame Lab — narration analysis (Phase 2).
Usage: analyze_audio.py <audio.mp3|wav> <outdir> [--transcript corrected.txt] [--fps 30]
Writes outdir/analysis.json and outdir/TRANSCRIPT.md. Never edits the audio. Never invents words:
uncertain ASR words are flagged; a supplied transcript always wins for wording (timing still comes from the audio).
"""
import argparse, json, math, os, re, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument("audio"); ap.add_argument("outdir"); ap.add_argument("--transcript"); ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--silence-db", type=float, default=-35); ap.add_argument("--min-pause", type=float, default=0.25)
a = ap.parse_args()
if not os.path.isfile(a.audio):
    sys.exit(f"BLOCKER: audio file not found: {a.audio}")
os.makedirs(a.outdir, exist_ok=True)

probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", a.audio], capture_output=True, text=True, check=True).stdout)
st = next(s for s in probe["streams"] if s["codec_type"] == "audio")
dur = float(probe["format"]["duration"]); frames = math.ceil(dur * a.fps - 1e-6)

# pauses
log = subprocess.run(["ffmpeg", "-hide_banner", "-i", a.audio, "-af", f"silencedetect=noise={a.silence_db}dB:d={a.min_pause}", "-f", "null", "-"], capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]; ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
pauses = [(s, e) for s, e in zip(starts, ends) if e > s]
cuts = [0.0] + [(s + e) / 2 for s, e in pauses if 0.3 < (s + e) / 2 < dur - 0.3] + [dur]

# speech recognition (offline PocketSphinx; optional)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.audio, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
asr_ok = True
try:
    from pocketsphinx import Decoder
    dec = Decoder()
except Exception as e:  # tool unavailable -> report, do not invent
    asr_ok = False; asr_err = str(e)

phrases = []
for i, (t0, t1) in enumerate(zip(cuts[:-1], cuts[1:])):
    # trim leading/trailing silence of this phrase using the detected pauses
    s0 = max([e for s, e in pauses if t0 - 0.01 <= e <= t1] + [t0]); s1 = min([s for s, e in pauses if t0 <= s <= t1 + 0.01] + [t1])
    if s1 <= s0: s0, s1 = t0, t1
    words, text, conf, alt_text = [], "", None, ""
    if asr_ok:
        seg = raw[int(t0 * 16000) * 2:int(t1 * 16000) * 2]
        dec.start_utt(); dec.process_raw(seg, full_utt=True); dec.end_utt()
        h = dec.hyp(); text = h.hypstr if h else ""
        for sgm in dec.seg():
            w = sgm.word
            if w.startswith("<") or w.startswith("[") or w in ("<s>", "</s>", "<sil>"): continue
            p = math.exp(max(-50, sgm.prob / 10000.0)) if hasattr(sgm, "prob") else None
            words.append({"word": re.sub(r"\(\d+\)$", "", w), "t0": round(t0 + sgm.start_frame / 100, 3), "t1": round(t0 + sgm.end_frame / 100, 3), "p": round(p, 3) if p is not None else None})
        # consensus check (PocketSphinx 5 gives no real posteriors): decode again on the trimmed span; words the two
        # decodings disagree on are flagged uncertain
        seg2 = raw[int(max(0, s0 - 0.12) * 16000) * 2:int(min(dur, s1 + 0.12) * 16000) * 2]
        dec.start_utt(); dec.process_raw(seg2, full_utt=True); dec.end_utt()
        h2 = dec.hyp(); alt = (h2.hypstr if h2 else "").split()
        import difflib
        A = [w["word"] for w in words]; sm = difflib.SequenceMatcher(a=A, b=alt)
        agree = set()
        for blk in sm.get_matching_blocks():
            for k in range(blk.a, blk.a + blk.size): agree.add(k)
        for k, w in enumerate(words): w["p"] = 1.0 if k in agree else 0.0
        conf = round(len(agree) / max(1, len(words)), 3); alt_text = " ".join(alt)
    phrases.append({"index": i + 1, "start": round(s0, 3), "end": round(s1, 3), "startFrame": int(round(s0 * a.fps)), "endFrame": min(frames - 1, int(round(s1 * a.fps))),
                    "asr": text, "asr_alt": alt_text if asr_ok else "", "asr_words": words, "asr_agreement": conf, "uncertain": [w["word"] for w in words if w["p"] is not None and w["p"] < 0.35]})

# supplied transcript: distribute its words over the phrases in proportion to ASR word counts / durations
if a.transcript:
    # anchor the user's words to recognised words (difflib), so each user word lands in the phrase where it was
    # actually spoken; unmatched words follow their neighbours. Wording always comes from the user's transcript.
    import difflib
    norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())
    user = open(a.transcript, encoding="utf-8").read().split()
    asr_seq, asr_ph = [], []
    for k, p in enumerate(phrases):
        for w in p["asr"].split(): asr_seq.append(norm(w)); asr_ph.append(k)
    owner = [None] * len(user)
    sm = difflib.SequenceMatcher(a=[norm(w) for w in user], b=asr_seq, autojunk=False)
    for blk in sm.get_matching_blocks():
        for j in range(blk.size): owner[blk.a + j] = asr_ph[blk.b + j]
    nxt = None
    for i in range(len(user) - 1, -1, -1):  # leading unmatched words -> next anchor
        if owner[i] is None and nxt is not None and all(o is None for o in owner[:i]): owner[i] = nxt
        nxt = owner[i] if owner[i] is not None else nxt
    # gaps between anchors in DIFFERENT phrases: split at the user's punctuation (end of clause -> next phrase)
    anchored = [i for i, o in enumerate(owner) if o is not None]
    for i0, i1 in zip(anchored, anchored[1:]):
        if i1 - i0 > 1 and owner[i0] != owner[i1]:
            cut = i0
            for j in range(i0, i1):
                if re.search(r"[,.;:!?]$", user[j]): cut = j
            for j in range(i0 + 1, i1): owner[j] = owner[i0] if j <= cut else owner[i1]
    last = 0
    for i in range(len(user)):  # remaining gaps -> previous anchor (never move backwards)
        owner[i] = max(last, owner[i]) if owner[i] is not None else last; last = owner[i]
    for k, p in enumerate(phrases):
        p["text"] = " ".join(w for w, o in zip(user, owner) if o == k); p["text_source"] = "user transcript (anchored to ASR timing)"
else:
    for p in phrases: p["text"] = p["asr"]; p["text_source"] = "ASR (unconfirmed)" if asr_ok else "UNAVAILABLE"

out = {"audio": os.path.abspath(a.audio), "codec": st.get("codec_name"), "sample_rate": int(st.get("sample_rate", 0)), "channels": st.get("channels"),
       "bit_rate": probe["format"].get("bit_rate"), "duration": round(dur, 4), "fps": a.fps, "frames": frames,
       "pauses": [{"start": round(s, 3), "end": round(e, 3)} for s, e in pauses], "phrases": phrases,
       "asr_engine": "pocketsphinx (offline)" if asr_ok else f"none ({asr_err})"}
json.dump(out, open(os.path.join(a.outdir, "analysis.json"), "w"), indent=1)
with open(os.path.join(a.outdir, "TRANSCRIPT.md"), "w") as fh:
    fh.write(f"# Narration analysis\n\n- file: `{os.path.basename(a.audio)}` ({out['codec']}, {out['sample_rate']} Hz, {out['channels']} ch)\n- **duration {dur:.4f} s = {frames} frames @ {a.fps} fps** (master clock; narration is never edited)\n- ASR: {out['asr_engine']}; wording source: {'user transcript' if a.transcript else 'ASR — CONFIRM ⚠ lines'}\n\n")
    fh.write("| # | start | end | frames | text | flags |\n|---|---|---|---|---|---|\n")
    for p in phrases:
        flag = (f"⚠ uncertain: {', '.join(p['uncertain'])} (alt: \"{p['asr_alt']}\")") if p["uncertain"] and not a.transcript else ""
        fh.write(f"| {p['index']} | {p['start']:.2f} | {p['end']:.2f} | {p['startFrame']}–{p['endFrame']} | {p['text']} | {flag} |\n")
print(f"duration={dur:.4f}s frames={frames} phrases={len(phrases)} asr={'ok' if asr_ok else 'unavailable'} -> {a.outdir}")
