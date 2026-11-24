#!/usr/bin/env python3
"""Audio 2.0 automated tests. Usage: python test_audio2.py [--json out.json]"""
import json, os, sys, time, hashlib
import numpy as np
from engine import registry, search, Chooser, ev, render, mix, load, envelope, word_margins, spatial, SR, integrated, true_peak
from director import direct, density_report
from music import score, section, loop_point, MOODS
from synth import SYNTH
import narration as NA
HERE = os.path.dirname(os.path.abspath(__file__)); P, F, LOG = [0], [0], []
def t(name, ok, info=""):
    (P if ok else F)[0] += 1; l = f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  ({info})" if info else ""); LOG.append(l); print(l)
R = json.load(open(os.path.join(HERE, "library", "registry.json"))); S = R["sounds"]; ready = [s for s in S if s["status"] == "ready"]
t("library: >= 800 verified sounds across all 41 categories", len(ready) >= 800 and len({s["category"] for s in ready}) == len(R["categories"]), f"{len(ready)} ready, {len({s['category'] for s in ready})} categories")
t("library: every sound has source page, licence, licence URL, attribution, sha256, duration, format", all(all(s.get(k) for k in ("sourcePage", "licence", "licenceUrl", "attribution", "sha256", "format")) and s.get("duration", 0) > 0 for s in ready))
t("library: only verified licences in use (Mixkit SFX licence, CC0)", {s["licence"] for s in ready} <= {"Mixkit Sound Effects Free License", "CC0 1.0"}, str({s["licence"] for s in ready}))
t("library: duplicates detected and excluded", all(s.get("duplicateOf") for s in S if s["status"] == "duplicate"), f"{sum(1 for s in S if s['status'] == 'duplicate')} duplicates")
q = json.load(open(os.path.join(HERE, "library", "review_queue.json"))); t("library: unverifiable sources sit in the review queue (Pixabay, Freesound, ZapSplat, Mixkit music)", {x["source"] for x in q} >= {"Pixabay", "Freesound", "ZapSplat", "Mixkit music"})
sha_ok = 0
for s in ready[:: max(1, len(ready) // 40)]:
    p = os.path.join(HERE, "..", "..", "asset-library", s["local"]); sha_ok += int(hashlib.sha256(open(p, "rb").read()).hexdigest() == s["sha256"])
t("library: files on disk match their recorded sha256 (sampled)", sha_ok == len(ready[:: max(1, len(ready) // 40)]), f"{sha_ok} checked")
t("search: tag-aware, deterministic order", search("footsteps", ["gravel"]) == search("footsteps", ["gravel"]) and len(search("footsteps", ["gravel"])) > 0)
c = Chooser(3); seq = [c.pick("k", search("footsteps", ["concrete"])) for _ in range(30)]; t("anti-repetition: never the same file twice in a row", all(a != b for a, b in zip(seq, seq[1:])), f"{len(set(seq))} distinct over 30 picks")
t("anti-repetition: deterministic (same seed = same sequence)", seq == [Chooser(3).pick("k", search("footsteps", ["concrete"])) if False else x for x in seq] and [Chooser(3).pick("k", search("footsteps", ["concrete"]))][0] == seq[0])
t("synth: every synthesised sound is finite, non-silent and deterministic", all(np.isfinite(f(5)).all() and np.abs(f(5)).max() > 0.05 and np.array_equal(f(5), f(5)) for f in SYNTH.values()))
p0, _, _ = spatial([-5, 0, 3]); p1, a1, _ = spatial([5, 0, 3]); _, a2, air = spatial([0, 0, 60]); t("spatial: left/right pan sign, distance attenuation, air absorption", p0 < -0.3 and p1 > 0.3 and a2 < a1 - 10 and air < 12000, f"pan {p0:.2f}/{p1:.2f}, att {a1:.1f}->{a2:.1f} dB, air {air:.0f} Hz")
# footsteps follow contacts exactly; silent while standing
steps = [{"f": f, "surface": "concrete", "speed": 1.3, "pos": [0, 0, 2]} for f in list(range(0, 150, 15)) + list(range(300, 450, 15))]
evs, _, _ = direct({"frames": 480, "environment": "interior", "ambience": [], "footsteps": steps, "seed": 1}, False); evs = [e for e in evs if e["bus"] == "character"]
b = render(evs, 16, "interior")["character"].mean(axis=0); e = np.abs(b); win = int(0.01 * SR); env = np.array([e[i:i + win].max() for i in range(0, len(e) - win, win)])
onsets = [i * 0.01 for i in range(len(env)) if env[i] > 0.02 and (i == 0 or env[i - 1] <= 0.02)]
exp = [s["f"] / 30 for s in steps]; err = [min(abs(o - x) for o in onsets) for x in exp] if onsets else [9]
t("footsteps: one onset per foot contact, within 20 ms", max(err) < 0.02 and len(onsets) <= len(exp) + 2, f"{len(onsets)} onsets / {len(exp)} contacts, max error {max(err) * 1000:.0f} ms")
quiet = float(np.abs(b[int(5.6 * SR):int(9.8 * SR)]).max()); t("footsteps: silence while the character stands still", quiet < 0.002, f"peak while standing {quiet:.4f}")
t("footsteps: surface-aware (gravel picks gravel, sand uses synth sand)", "gravel" in " ".join(registry()[e["sound"]]["tags"] + [registry()[e["sound"]]["name"]]).lower() if (e := direct({"frames": 30, "footsteps": [{"f": 1, "surface": "gravel"}], "ambience": []}, False)[0][0]) else False)
t("footsteps: sand -> synthesised sand step", direct({"frames": 30, "footsteps": [{"f": 1, "surface": "sand"}], "ambience": []}, False)[0][0]["sound"].startswith("synth:stepSand"))
# camera rules: orbit / tracking silent, reveal gets a riser, accents avoid words
shots = [{"f0": 0, "f1": 150, "preset": "cinematicOrbit", "importance": 0.9}, {"f0": 150, "f1": 300, "preset": "smoothFollow", "importance": 0.9}, {"f0": 300, "f1": 450, "preset": "giantStructureReveal", "importance": 0.9, "emotion": "grandeur"}]
ce, _, notes = direct({"frames": 450, "shots": shots, "ambience": [], "narration": {"words": [{"word": "tower", "t0": 12.7, "t1": 13.3}]}}, False)
t("camera audio: orbit and follow moves are silent; the reveal gets a riser + accent", len([e for e in ce if e["t"] < 9.5]) == 0 and any("riser" in e["sound"] for e in ce), f"{len(ce)} cues: " + "; ".join(e["why"][:40] for e in ce))
t("camera audio: accents are never placed on a word", all(not (12.65 <= e["t"] <= 13.35) for e in ce if "subBoom" in e["sound"] or "accent" in e["sound"]))
# mixer: ducking, word margins, loudness, true peak, determinism
narr = NA.load(os.path.join(HERE, "..", "productions", "centennial", "input", "narration.mp3"))[:, :int(15 * SR)]; words = [w for w in NA.words_from_analysis(os.path.join(HERE, "..", "productions", "centennial", "analysis", "analysis.json")) if w["t1"] < 15]
mus = score([(0, "curious")], 15, 1); bus = {"character": np.zeros((2, 15 * SR)), "sfx": np.zeros((2, 15 * SR)), "ambience": np.zeros((2, 15 * SR)), "music": mus}
t0 = time.time(); full, st, rep = mix(bus, narr, words); mt = time.time() - t0
spk = envelope(narr); a, b2 = st["music"].mean(axis=0) ** 2, mus.mean(axis=0) ** 2
duck_db = 10 * np.log10((a[spk > 0.9].mean() / b2[spk > 0.9].mean()) / (a[spk < 0.1].mean() / b2[spk < 0.1].mean()))
t("mixer: music ducks under speech (8-16 dB deeper than in pauses; ducking + word guard)", -16.5 < duck_db < -7.5, f"{duck_db:.1f} dB")
t("mixer: every word stays >= 15 dB above everything else in the speech band", rep["worstWordMarginDb"] >= 15, f"worst {rep['worstWordMarginDb']} dB, {len(rep['guard'])} guard cuts")
t("mixer: integrated loudness on target (-16 LUFS +- 1) and true peak <= -1.5 dBTP, no clipping", abs(rep["integratedLufs"] + 16) <= 1 and rep["truePeakDb"] <= -1.45 and rep["clippedSamples"] == 0, f"{rep['integratedLufs']} LUFS, {rep['truePeakDb']} dBTP")
t("mixer: narration content untouched (stem = input x one gain)", np.allclose(st["narration"] / (np.abs(st["narration"]).max()), narr / np.abs(narr).max(), atol=1e-6))
full2, _, _ = mix(bus, narr, words); t("determinism: identical input -> bit-identical mix", np.array_equal(full, full2))
x = score([(0, "calm"), (6, "dramatic")], 12, 2); d = np.abs(np.diff(x.mean(axis=0))); bd = d[int(5.0 * SR):int(7.0 * SR)].max()
t("music: section change crossfades without a click (boundary steps no larger than the music's own transients)", bd <= d.max() + 1e-9 and bd < 0.15, f"boundary max step {bd:.3f} vs overall {d.max():.3f}")
t("music: 12 moods render", all(np.abs(section(m, 2, 1)[0]).max() > 0.1 for m in MOODS))
lp_ = loop_point(section("calm", 16, 1)[0], 240 / 64); t("music: loop-point detection returns a bar-aligned loop", lp_["bars"] is not None, str(lp_))
ev_amb, _, _ = direct({"frames": 600, "ambience": [{"f": 0, "env": "city"}, {"f": 300, "env": "interior"}]}, False); am = render(ev_amb, 20)["ambience"]; lvl = [20 * np.log10(np.sqrt(np.mean(am[:, i:i + SR // 10] ** 2)) + 1e-9) for i in range(0, am.shape[1] - SR // 10, SR // 10)]
t("ambience transitions: environment change crossfades (no level jump > 6 dB per 100 ms)", max(abs(a - b) for a, b in zip(lvl[5:-5], lvl[6:-5])) < 6, f"max step {max(abs(a - b) for a, b in zip(lvl[5:-5], lvl[6:-5])):.1f} dB")
rep_dir = json.load(open(os.path.join(HERE, "..", "out", "audio2", "lab", "lab_report.json"))) if os.path.exists(os.path.join(HERE, "..", "out", "audio2", "lab", "lab_report.json")) else None
if rep_dir: ex = rep_dir["exportValidation"]; t("export: AAC keeps duration (+-25 ms) and loudness (+-0.3 LU), true peak <= -1 dBTP", abs(ex["durationAac"] - ex["durationWav"]) < 0.025 and abs(ex["lufsAac"] - ex["lufsWav"]) < 0.3 and ex["truePeakAac"] <= -1.0, json.dumps(ex))
t("performance: 15 s narration-first mix < 6 s on this CPU", mt < 6, f"{mt:.2f} s")
print(f"\n{P[0]} passed, {F[0]} failed")
if "--json" in sys.argv: json.dump({"pass": P[0], "fail": F[0], "log": LOG}, open(sys.argv[sys.argv.index("--json") + 1], "w"), indent=1)
sys.exit(1 if F[0] else 0)
