# Pipeline V3 — measured benchmarks (2026-11-10)

## Hardware and method

**Hardware.** Every number below was measured, not estimated, unless marked "estimate".
- This cloud machine: 4 vCPU Intel Xeon at 2.1 GHz, 15.7 GB RAM, **no GPU** (no `/dev/dri`, no NVIDIA driver).
- GitHub-hosted `ubuntu-latest` runners: 4 vCPU, 16 GB, no GPU.

**Software.** Remotion 4.0.541, three 0.180, Chromium headless shell with `--gl=swangle` (WebGL on SwiftShader).

**Method.**
- Profiler: `pipeline/bench/profile.mjs`, one bundle and one browser, timing each stage.
- GPU-stage timing: Post's opt-in `[bench]` logs, synchronised with a 1-pixel readback. `gl.finish()` does not wait under SwiftShader.
- Test scenes: London Bridge V2 frames (rendered to scratch only; the delivered MP4 is untouched, SHA-256 `e322418b…`) and the new `LibraryShowcase`.

## 1. Where the time goes (Phase 1)

| stage | measured |
|---|---|
| voiceover analysis (`make_video.sh init`: ffprobe, pauses, ASR) | 24 s for the 59 s narration |
| sound design and narration-first mix (`make_video.sh audio`) | 32 s |
| full QC with loop checks (`qc.py --loop`, 1771 frames) | 62 s |
| webpack bundle | 2.4–18 s (cached / cold) |
| browser start and composition select | 0.6–1.5 s |
| Remotion and Chromium per-frame overhead (screenshot, plumbing, no 3D) | 0.07–0.11 s/frame |
| shader compilation and asset load, first frame of each scene per tab | 15–110 s, once |
| **3D frame rendering at 1080×1920 (SwiftShader)** | **1.7–10 s/frame, the bottleneck** |
| close-up frame split (London Bridge 690) | scene pass 2.5 s, shadow update 0.1–0.9 s, post 0.6 s, done **twice** per frame (legacy) |

- **Encoding** runs inside the same pass. Blank frames at 1080×1920 cost about 0.1 s/frame, so it is not a bottleneck.
- **Verdict.** The bottleneck is CPU-based WebGL rasterisation. Encoding, Chromium overhead and the audio and QC stages are not bottlenecks.

## 2. Renderer settings

**Concurrency** (London Bridge close-up 700–723 and vehicles 1100–1123, effective s/frame including warm-up):

| tabs | close-up | vehicles |
|---|---|---|
| **1** | **6.72** | **5.33** |
| 2 | 7.67 | 6.12 |
| 3 | 8.88 | 7.25 |
| 4 | 9.72 | 7.99 |

SwiftShader already spreads one tab over all 4 cores, so more tabs only add contention and extra shader warm-ups. **Use 1 per machine and parallelise across machines.**

**OpenGL backends.**
- `swangle` works.
- `swiftshader`, `angle`, `egl` and `vulkan` all fail with "A WebGL context could not be created", because there is no GPU. No flag creates one.

**Legacy double render.** The old `RenderAfterMount` drew each frame twice, because `@remotion/three` already advances once.

| scene (steady-state s/frame) | double (legacy) | single (`__singleRender`) | speedup |
|---|---|---|---|
| close-up | 8.86 | 5.88 | 1.51× |
| water and ship | 2.77 | 1.54 | 1.80× |
| crowd | 10.23 | 6.80 | 1.50× |
| transition (two worlds) | 10.76 | 6.78 | 1.59× |

- **Pixel check:** close-up and water are bit-identical.
- **Reflector lag.** The crowd and transition differed slightly because `MeshReflectorMaterial` built its mirror camera from a stale camera matrix. After the fix (camera matrices synced before the reflector pass in single-render mode) the crowd is bit-identical, and the transition differs by at most 1/255 in a few pixels.
- **Render order:** rendering showcase frames in reverse order gives bit-identical frames.

**Resolution profiles.** Remotion's `--scale` alone saved **nothing**: identical s/frame at 1, 0.5 and 0.25, because R3F clamps the device pixel ratio to at least 1. V3 sets the WebGL drawing buffer per profile (`quality().dpr`).

| showcase scene, median s/frame | C final 1080×1920 | B story 540×960 | A quick 270×480 |
|---|---|---|---|
| close-up | 3.63 | 1.38 (2.6× faster) | 0.72 (5.0× faster) |
| water and ship | 2.10 | 0.92 (2.3× faster) | 0.54 (3.9× faster) |

## 3. Controlled before/after test (Phase 8)

Same 60 frames (London Bridge 1100–1159, 1080×1920), same machine, end to end including bundling and browser start:

| | old pipeline (`render_batches.mjs`) | V3 (`render_fast.mjs`) |
|---|---|---|
| wall time | 570 s (9.50 s/frame) | 332 s (5.54 s/frame) |
| peak RAM in use | 2.72 GB | 1.94 GB |
| output | 60 frames | 60 frames, **bit-identical** (SSIM 1.000000, PSNR ∞) |

**Measured speedup: 1.72×**, from the single render, one bundle and browser for the whole job, and no per-batch process start-up.

## 4. GitHub Actions matrix rendering (Phase 5)

**Repository.** `pawanji8229/claude-animated-shorts` is **public**: an earlier 150 s run billed 0 minutes. Standard runners are therefore free with no minute cap, up to 20 concurrent jobs.

**Test film.** `LibraryShowcase15`: 462 frames (15.4 s) at 1080×1920, 30 fps, final profile.

| run | workers / chunks | runner render times | end-to-end wall time | result |
|---|---|---|---|---|
| #1 | 2 / 2 | 25.4 and 27.7 min (231 frames each) | 38.5 min, including a 9 min apt mirror stall | 462 frames, verified |
| #2 | 4 / 4 | 17.1, 10.5, 5.0, 14.0 min (unbalanced: scene costs differ) | **20.8 min** | 462 frames, validator PASS |
| #3 | 4 / 8 (balanced queue) | see below | see below | see below |

- **Verified:** artifact SHA-256 matches GitHub's digest, 462 frames, 1080×1920, 30 fps. `validate_motion.py` found 0 cuts and 0 freezes.
- **Run #1 found a real flaw:** a 6-frame excavator swing. It was fixed and run #2 passed.
- **Throughput:** about 6.1 s of runner time per frame for this content.

## 5. Estimated time for a full 59 s Short (1771 frames)

Rendering estimates come from the measured rates; authoring time is the uncertain part.

| step | V2 (measured) | V3 local | V3 on 8 GitHub runners (estimate from runs #2 and #3) |
|---|---|---|---|
| analysis, sound and mix, QC | about 2 min | about 2 min | about 2 min |
| story preview (B, full film) | rendered at full cost | about 40 min (1.3 s/frame) | about 8–10 min |
| final render (C) | about 4.7 h (9.5 s/frame) | about 2.7 h (5.5 s/frame) for London Bridge-type scenes; 1.5–2 h for library scenes | **about 25–30 min** (1771 × 6.1 s / 8 + setup) |
| total for London Bridge V2 | about 8 h including fixes and re-renders | | |

- **Render time:** the 1–2 hour target is achievable **for rendering** with 8 parallel runners.
- **Authoring time:** writing a new storyboard and scene code with the library still takes real time (estimate 30–60 min for a simple Short). Repeated fix-and-re-render cycles now use profile A or B, not full finals.
- **Hardware:** a real GPU (a GPU cloud VM or a self-hosted runner with an NVIDIA card) would be the next big step. WebGL on a GPU is typically tens of times faster than SwiftShader. It was not available here, so it was not measured.

## 6. Quality: before and after (see `comparisons/`)

- **Clearly better:** city street (assembled brick apartment fronts, PBR asphalt and kerbs, HDRI sunset, trees, lamps, car), harbour (CC0 sailing ship, chained wooden pier, crates, barrel, lifebuoy, HDRI-lit water), construction ground (gravel PBR, real props, sky), crowd plaza ground and backdrop.
- **Same as before:** the hero construction machines. `Truck5`, `Excavator5` and `TruckCrane` are still the procedural models, and the scene audit flags them (untextured boxes covering up to 20 % of the frame). Poly Haven has no CC0 trucks or excavators.
- **Close-up:** after relighting it reads well, with a real brick wall, a wooden table and props. The first version was too dark; that was fixed and re-checked.
- **Scene audit, fully loaded:**

  | scene | triangles | textures | placeholder flags |
  |---|---|---|---|
  | close-up | 90k | 51 | 0 |
  | city | 581k | 72 | 0 |
  | vehicles | 364k | 54 | 6 (the procedural machines) |
  | water and ship | 210k | 52 | 0 |
  | crowd | 140k | 76 | 0 |
