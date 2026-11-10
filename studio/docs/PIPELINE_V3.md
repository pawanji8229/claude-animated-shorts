# TwistFrame Lab — Pipeline V3 (experimental)

Branch: `experimental/pipeline-v3`. London Bridge V2 and the approved Reopening benchmark are untouched. Every legacy
production renders exactly as before unless a pipeline flag is passed.

## 1. Setup (fresh cloud session or computer)

```bash
git clone --branch experimental/pipeline-v3 https://github.com/pawanji8229/claude-animated-shorts
cd claude-animated-shorts/studio
npm ci                        # Remotion 4.0.541, three 0.180, R3F 9, glTF-Transform 4.5
npx tsc --noEmit -p .         # must print nothing
bash pipeline/setup.sh        # python venv (audio analysis, mixing, QC)
```

- **Library files.** The optimised CC0 library is committed: `public/lib`, about 80 MB, every file under 6 MB. A clone is ready to render.
- **Raw downloads.** `assets_src/` holds the raw downloads. It is git-ignored and only needed to re-optimise. Rebuild it with `pipeline/assets/fetch_polyhaven.py` (needs network access to `api.polyhaven.com` and `dl.polyhaven.org`).

## 2. Where the time goes (measured; full numbers in `benchmarks/BENCHMARKS.md`)

- **The bottleneck is CPU WebGL.** No GPU exists here or on GitHub-hosted runners. Chromium's WebGL runs on SwiftShader (`--gl=swangle`); the other GL backends cannot create a WebGL context.
- **SwiftShader already uses every core** for a single tab, so concurrency 1 is fastest. Each extra tab slows the machine: on the close-up, 6.7 s/frame at 1 tab rises to 7.7, 8.9 and 9.7 s/frame at 2, 3 and 4 tabs.
- **The legacy double render.** The old `RenderAfterMount` drew every frame's scene and post-processing twice. That cost 1.5–1.8×.
- **Small overheads.** Remotion, Chromium, screenshot and encode overhead is about 0.1 s/frame. Bundling takes 2–3 s when cached. Neither is a bottleneck.
- **Shader compilation.** It costs 15–110 s once per browser tab, for each scene type. The fast renderer keeps one tab alive for the whole job.

## 3. Rendering

```bash
# Profile A: quick test (360x640): selected frames / short ranges to check story actions and motion
node pipeline/render_fast.mjs --comp <Comp> --frames 0-59 --profile quick --out out/quick.mp4
# Profile B: full story preview (540x960): whole film, approve timing / transitions / storytelling
node pipeline/render_fast.mjs --comp <Comp> --frames 0-1770 --profile story --audio productions/<id>/audio/mix.wav --out out/story.mp4
# Profile C: final production (1080x1920, 30 fps)
node pipeline/render_fast.mjs --comp <Comp> --frames 0-1770 --profile final --audio productions/<id>/audio/mix.wav --out out/final.mp4 --resume
```

- **What `render_fast.mjs` does.**
  - One bundle and one browser for every batch.
  - `__singleRender`, so each frame is drawn once.
  - Concurrency 1.
  - Atomic batch files (`.partial.mp4` is renamed only when the batch is complete), so an interrupted job never loses finished batches. `--resume` skips them.
  - Stream-copy join, with the narration-first mix muxed once.
- **Legacy productions.** Pass `--legacy-double-render` to reproduce a legacy production bit for bit. The default single render is verified identical, or within 1/255, on London Bridge frames.

## 4. Parallel rendering on GitHub Actions (from your phone)

- **The workflow.** `.github/workflows/render-matrix.yml` is manual only and never runs on ordinary pushes.
  - It splits the frame range across N free GitHub runners. Each runner has 4 vCPUs and 16 GB, and the repository is public, so the minutes are free.
  - Every chunk is uploaded as its own artifact. The chunks are joined, the audio muxed, and frame count plus black and frozen frames checked.
  - The result is uploaded as the `final-*` artifact, kept for 14 days. Failed chunks keep their finished batches as `partial-batches-*`, and "Re-run failed jobs" re-renders only the failures.
- **Start a render from the GitHub app.** Open `studio/render-request.json` on the `experimental/pipeline-v3` branch, edit it (composition, frames, workers, profile, audio) and commit. Then open Actions → the run → Artifacts → `final-…` to download the MP4.
- **Manual dispatch.** The "Run workflow" button only appears once the workflow file is on the default branch, which this upgrade does not change.

## 5. Asset library (`src/lib/library/`)

| API | use |
|---|---|
| `<Model id pos rot height lodFrom>` | any library model; LOD1 beyond `quality().lodNear` |
| `<Instanced id items>` + `scatter(seed,n,rect,gap)` | many copies, 1 draw call per material |
| `<Building bays floors seed rotY>` | apartment fronts assembled from the 147-piece modular facade kit, with a solid brick volume and roof |
| `<KitPart id match>` | one variant from a pack (`/^fire_hydrant(_cap_0\d\|_chain)?$/`, rusty bin, crate a/b, a single rock) |
| `<Pier n>` / `<Fence n>` | chained wooden pier sections, chain-link fence with posts |
| `<Ground tex size tile>` / `<PbrBox tex size pos tile>` / `usePbr(tex)` | CC0 PBR surfaces at real-world tiling |
| `<HdriEnvironment id background>` | HDRI image-based lighting and sky |
| `<Water t size normalTex>` | deterministic swell, HDRI reflections, no extra reflection render |
| procedural originals (`productions/london-bridge/assets.tsx`) | `Truck5`, `Excavator5`, `TruckCrane`, `MixerTruck`, `CargoShip`, `QuayCrane`, `GraniteBlock` with real pivots |

- **Inventory.** `assets/registry.json` records origin, licence, authors, triangle counts and bounds for each asset.
- **Visual QA.** `assets/contact_sheet.png` shows every model next to a 1.7 m character for scale. Regenerate it with `node pipeline/assets/contact_sheet.mjs`.
- **Quality rules.** See `assets/QUALITY_STANDARD.md`.

## 6. Validation before a final render (Phase 7)

| check | tool |
|---|---|
| pops, cuts, frozen runs outside declared dissolves | `python3 pipeline/validate_motion.py story.mp4 out/ --transitions a-b,... --expected <flash frames>` (contact sheet of every flag for human review) |
| primitive placeholders, triangles, draw calls | render with `inputProps.__audit = true`; `[audit]` lines list untextured primitives covering more than 4 % of the frame |
| crowd independence | `npx tsx scripts/check-crowd.ts <crowds.ts>` |
| narration-first mix, word margins, loop audio and video | `bash pipeline/make_video.sh qc <id>` (`qc.py --loop`) |
| determinism | `node pipeline/bench/determinism.mjs` renders frames forward and reversed for comparison |
| detail at full resolution | render critical stills at scale 1 and look at them; automated checks alone are not enough |
