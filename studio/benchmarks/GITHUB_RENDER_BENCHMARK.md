# GitHub render pipeline: benchmark (2026-11-20)

## 1. Cloud run: blocked by the GitHub account, not by the workflow

The branch `render/twistframe-original` was pushed three times:
- with `studio/render-request.json` (benchmark: Centennial, frames 0-59, 2 runners);
- with a changed request;
- with a minimal one-line `actions-ping.yml` job.

**GitHub started no run for any of them.** No workflow from this repository has been registered since 2026-11-10; the last run was V3 run #5. Even the ping job did not start, so GitHub Actions is currently not starting jobs for this account or repository. This fits the account suspension noted earlier in the project. It is not a workflow error: a broken workflow still produces a failed run.

**When Actions works again**, any commit to `.github/workflows/actions-ping.yml` or `studio/render-request.json` on a `render/**` branch starts a run.

## 2. Same steps on the Claude Code machine (exact emulation)

Steps run, exactly as in the workflow:
1. `split_ranges.mjs 0-59 2`
2. `render_batches.mjs --batch 40 --resume` per chunk
3. concat stream-copy join
4. mix.wav muxed once
5. `qc.py --partial`

| | result |
|---|---|
| Chunks | 0-29: 118 s, 30-59: 109 s (about 3.8 s/frame for this macro shot; heavier scenes about 9 s/frame) |
| Output | 1080x1920, 30 fps, **60/60 frames**, H.264 + AAC |
| QC | all PASS: no black frames, glitches or freezes; 0 ms sync; worst word margin 15.5 dB; −1.2 dBTP |
| Fidelity against the approved full render (`b_00000-00099`) | **PSNR 48.3 dB, SSIM 0.990**: visually identical. The residual is encoder noise from separate encodes; same code, same style. |

## Expected cloud cost for a full 53 s video (1607 frames, 8 runners)

- **Render work:** about 1607 × 9 s ≈ 4 runner-hours, split into 16 chunks of about 100 frames.
- **Wall-clock:** about 35–45 min, including about 3 min of setup per job.
- **Price:** free on a public repository, and within the 2,000 free minutes per month on a private one.
