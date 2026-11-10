#!/usr/bin/env python3
"""TwistFrame Lab — Phase 7 motion validation on a (story-preview) MP4.
Finds objects that POP into or out of existence: frames where one region of the picture changes abruptly relative to
the motion around it, outside the declared opacity transitions. Also flags frozen runs and hard cuts.
Method: frames are decoded at 180x320 grey; for every frame the per-cell (6x8 grid) mean absolute difference to the
previous frame is computed. A POP is a cell whose change exceeds max(abs_thresh, k * its own median change over the
surrounding +-8 frames). A CUT is a whole-frame change > cut_thresh outside transitions. Writes a JSON report and a
contact sheet (before/after pairs) for every flagged frame so a human can confirm or dismiss it.
Usage: validate_motion.py video.mp4 out_dir [--transitions 344-368,972-996] [--expected 44,124] [--k 6] [--abs 18]
"""
import json, os, subprocess, sys
import numpy as np
W, H, GX, GY = 180, 320, 6, 8
def frames(path):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(W * H)
        if len(b) < W * H: break
        yield np.frombuffer(b, np.uint8).reshape(H, W).astype(np.float32)
def main():
    vid, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    opt = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
    trans = [tuple(map(int, r.split("-"))) for r in opt("--transitions", "").split(",") if r]
    expected = {int(x) for x in opt("--expected", "").split(",") if x}   # deliberate instant events (camera flashes, lightning)
    k, absT, cutT = float(opt("--k", 6)), float(opt("--abs", 18)), float(opt("--cut", 40))
    cells, whole, prev, keep = [], [], None, []
    for i, f in enumerate(frames(vid)):
        if prev is not None:
            d = np.abs(f - prev); cells.append(d.reshape(GY, H // GY, GX, W // GX).mean(axis=(1, 3))); whole.append(float(d.mean()))
        else: cells.append(np.zeros((GY, GX), np.float32)); whole.append(0.0)
        keep.append(f[::2, ::2]); prev = f
    C, Wh = np.stack(cells), np.array(whole); n = len(Wh)
    in_tr = lambda i: any(a - 1 <= i <= b + 1 for a, b in trans)
    pops, cuts, freezes, run = [], [], [], 0
    for i in range(1, n):
        lo, hi = max(1, i - 8), min(n, i + 9); ctx = np.delete(C[lo:hi], i - lo, axis=0)
        med = np.median(ctx, axis=0) if len(ctx) else np.zeros((GY, GX))
        spike = (C[i] > np.maximum(absT, k * (med + 0.5)))
        if spike.any() and not in_tr(i) and not any(abs(i - e) <= 1 for e in expected):
            ys, xs = np.nonzero(spike); pops.append({"frame": i, "cells": [[int(x), int(y)] for y, x in zip(ys, xs)][:8], "peak": round(float(C[i].max()), 1)})
        if Wh[i] > cutT and not in_tr(i): cuts.append({"frame": i, "change": round(float(Wh[i]), 1)})
        run = run + 1 if Wh[i] < 0.02 else 0
        if run == 15: freezes.append({"from": i - 14})
    rep = {"video": vid, "frames": n, "transitions": trans, "pops": pops, "cuts": cuts, "freezes": freezes,
           "verdict": "PASS" if not (pops or cuts or freezes) else "REVIEW", "note": "flags are candidates: confirm each one on the contact sheet"}
    json.dump(rep, open(os.path.join(out, "motion_report.json"), "w"), indent=1)
    flagged = sorted({p["frame"] for p in pops} | {c["frame"] for c in cuts})[:24]
    if flagged:
        from PIL import Image
        tiles = [np.concatenate([keep[f - 1], np.full((H // 2, 4), 255, np.float32), keep[f]], axis=1) for f in flagged]
        Image.fromarray(np.concatenate(tiles, axis=0).astype(np.uint8)).save(os.path.join(out, "motion_flags.png"))
    print(json.dumps({k2: (len(v) if isinstance(v, list) else v) for k2, v in rep.items() if k2 in ("frames", "pops", "cuts", "freezes", "verdict")}))
if __name__ == "__main__": main()
