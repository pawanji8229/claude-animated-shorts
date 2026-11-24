#!/usr/bin/env python3
"""Audio 2.0 production entry point: scene JSON (+ optional narration) -> directed cue list -> stems + mix -> mux.
Usage: python mix_demo.py scene.json outdir [video.mp4] [--narration file --analysis analysis.json]"""
import argparse, json, os, time
import numpy as np
from engine import render, mix, export, mp3, SR
from director import direct, density_report
import narration as NA

ap = argparse.ArgumentParser(); ap.add_argument("scene"); ap.add_argument("outdir"); ap.add_argument("video", nargs="?"); ap.add_argument("--narration"); ap.add_argument("--analysis"); A = ap.parse_args()
os.makedirs(A.outdir, exist_ok=True); sc = json.load(open(A.scene)); dur = sc["frames"] / sc.get("fps", 30); t0 = time.time()
narr = words = None
if A.narration:
    narr = NA.load(A.narration)[:, :int(dur * SR)]; words = NA.words_from_analysis(A.analysis) if A.analysis else []; sc.setdefault("narration", {})["words"] = words
events, music, notes = direct(sc); b = render(events, dur, sc.get("environment", "street"))
if music is not None: b["music"] += music[:, :b["music"].shape[1]]
full, stems, rep = mix(b, narr, words or [])
for k, v in stems.items(): export(os.path.join(A.outdir, f"stem_{k}.wav"), v)
wav = os.path.join(A.outdir, "mix.wav"); export(wav, full, aac=os.path.join(A.outdir, "mix.m4a"), video=A.video, out_mp4=os.path.join(A.outdir, "demo_with_audio.mp4") if A.video else None); mp3(wav, os.path.join(A.outdir, "mix.mp3"))
with open(os.path.join(A.outdir, "cue_sheet.md"), "w") as fh:
    fh.write("| time | frame | bus | sound | why |\n|---|---|---|---|---|\n")
    for e in sorted(events, key=lambda e: e["t"]): fh.write(f"| {e['t']:.2f} | {round(e['t'] * sc.get('fps', 30))} | {e['bus']} | {e['sound']} | {e['why']} |\n")
rep.update({"cues": len(events), "density": density_report(events, dur), "notes": notes, "renderSeconds": round(time.time() - t0, 2), "durationSeconds": dur})
json.dump(rep, open(os.path.join(A.outdir, "mix_report.json"), "w"), indent=1); print(json.dumps({k: rep[k] for k in ("integratedLufs", "truePeakDb", "clippedSamples", "cues", "density", "renderSeconds")}))
