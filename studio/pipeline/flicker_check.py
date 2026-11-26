#!/usr/bin/env python3
"""TwistFrame Lab — temporal flicker / popping detector for rendered clips.
Usage: python pipeline/flicker_check.py clip.mp4 out_dir
For every interior frame t it compares f[t] with the average of its neighbours f[t-1], f[t+1] in 8x8-pixel blocks.
Smooth motion changes pixels steadily (f[t] ~ mean of neighbours); z-fighting, popping geometry or one-frame glitches
make a block jump away from BOTH neighbours. A block is "flickering" when that jump is large AND larger than the block's
own frame-to-frame motion (so fast camera moves are not reported). Writes flicker_report.json + a heat-map PNG
(where in the frame flicker happened over the clip, overlaid on the middle frame)."""
import json, os, subprocess, sys
import numpy as np

src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", src], capture_output=True, text=True, check=True).stdout.strip().split(",")
W, H = int(probe[0]), int(probe[1])
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
B = 8; hb, wb = H // B, W // B
blk = lambda a: a[: hb * B, : wb * B].reshape(hb, B, wb, B).mean(axis=(1, 3))
G = np.stack([blk(f) for f in F])
def shift_est(a, b):
    """global translation (dy, dx) that maps a onto b (phase correlation, integer px at full res)"""
    A, Bf = np.fft.fft2(a - a.mean()), np.fft.fft2(b - b.mean()); R = A.conj() * Bf; R /= np.abs(R) + 1e-9
    c = np.fft.ifft2(R).real; dy, dx = np.unravel_index(np.argmax(c), c.shape)
    if dy > a.shape[0] // 2: dy -= a.shape[0]
    if dx > a.shape[1] // 2: dx -= a.shape[1]
    return int(dy), int(dx)
def warp(img, dy, dx):
    o = np.roll(np.roll(img, dy, 0), dx, 1)
    if dy > 0: o[:dy] = np.nan
    if dy < 0: o[dy:] = np.nan
    if dx > 0: o[:, :dx] = np.nan
    if dx < 0: o[:, dx:] = np.nan
    return o
def blkn(a): return np.nanmean(a[: hb * B, : wb * B].reshape(hb, B, wb, B), axis=(1, 3))
heat = np.zeros((hb, wb)); per = []
for t in range(1, len(G) - 1):
    # align both neighbours to frame t (global camera motion), then look for blocks that toggle away from both
    s0, s1 = shift_est(F[t - 1], F[t]), shift_est(F[t + 1], F[t])
    with np.errstate(all="ignore"):
        Gm, Gp = blkn(warp(F[t - 1], *s0)), blkn(warp(F[t + 1], *s1))
    Gt = G[t]; valid = ~(np.isnan(Gm) | np.isnan(Gp)); Gm = np.nan_to_num(Gm); Gp = np.nan_to_num(Gp)
    d0, d1 = np.abs(Gt - Gm), np.abs(Gt - Gp)   # frame t vs each motion-aligned neighbour
    span = np.abs(Gp - Gm)                                        # the aligned neighbours vs each other
    bad = valid & (np.minimum(d0, d1) > 8.0) & (np.minimum(d0, d1) > 2.0 * span + 3.0)   # t toggles away and back: flicker/pop
    heat += bad; per.append(int(bad.sum()))
per = np.array(per)
rep = {"clip": src, "frames": int(len(G)), "blocks_per_frame": int(hb * wb), "flicker_blocks_total": int(per.sum()),
       "frames_with_flicker": int((per > 0).sum()), "worst_frames": [[int(i + 1), int(per[i])] for i in np.argsort(-per)[:8] if per[i] > 0],
       "verdict": "clean" if per.max(initial=0) <= 3 else "inspect"}
json.dump(rep, open(os.path.join(out, "flicker_report.json"), "w"), indent=1)
# heat-map overlay on the middle frame
mid = F[len(F) // 2]; hm = np.kron(np.minimum(heat / max(1, heat.max()), 1), np.ones((B, B)))
rgb = np.stack([mid] * 3, -1)[: hb * B, : wb * B] * 0.6; rgb[..., 0] = np.minimum(255, rgb[..., 0] + hm * 255)
p = os.path.join(out, "flicker_heat.ppm"); open(p, "wb").write(b"P6 %d %d 255\n" % (wb * B, hb * B) + rgb.astype(np.uint8).tobytes())
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p, os.path.join(out, "flicker_heat.png")], check=True); os.remove(p)
print(json.dumps(rep))
