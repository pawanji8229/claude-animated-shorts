# TwistFrame Lab: making videos with GitHub (no PC needed)

This branch, `render/twistframe-original`, is the original approved TwistFrame Lab system. The animation code is unchanged:
- earless odo5 characters with face glow;
- detailed 3D sets;
- the narration-first mix;
- `.claude/skills/voice-to-video` and `references/benchmarks/reopening_v2_approved/`.

It adds a cloud renderer, `.github/workflows/twistframe-render.yml`. It renders the same compositions with the same renderer and encoder settings as the approved local pipeline (`render_batches.mjs`, H.264 CRF 17, `--gl=swangle`), split across free GitHub runners.

## What it does

1. **plan:** reads `studio/render-request.json` and splits the frames into chunks (about 2 per runner).
2. **render:** runs up to `workers` free runners at once. Each chunk is rendered in resumable 40-frame batches and uploaded as soon as it finishes.
3. **assemble:**
   - joins the chunks losslessly;
   - adds the narration mix once (`productions/<id>/audio/mix.wav`);
   - runs the QC: frame count, black / frozen / one-frame glitches, loudness, clipping, narration sync and clarity, and the loop check with `"qc": "full"`.
4. **release:** puts the MP4, contact sheet and QC report on a GitHub **Release**. Open the repo, go to **Releases**, then download, from any phone browser or the GitHub app.

## If something fails

Open **Actions**, pick the run, then **Re-run failed jobs**:
- Finished chunks are kept (artifacts).
- A failed chunk restores its finished batches and continues from there.

## Making a new video (from your phone)

1. **Start in Claude.** In the Claude app, open Claude Code on this repository, attach the voiceover and say **MAKE VIDEO** (with any brief).
2. **Claude builds the video:**
   - analyses the narration;
   - writes the storyboard;
   - builds the scenes;
   - checks stills and motion tests for characters, camera, lighting and sound;
   - makes the narration-first mix;
   - commits everything, including `productions/<id>/audio/mix.wav`, to a `render/...` branch.
3. **Claude starts the render** by committing `studio/render-request.json` on that branch, for example:
   ```json
   { "production": "myvideo", "composition": "MyVideo", "frames": "all", "workers": 8, "audio": "mix", "qc": "full", "release": true }
   ```
   You can also start or restart a render yourself. In the GitHub app or browser: open the branch, open `studio/render-request.json`, tap the pencil, edit, then **Commit**.
4. **Wait for the run.** Open **Actions** and watch "TwistFrame render". A full 50-second video takes about the time of its slowest chunk plus setup (see `studio/benchmarks/GITHUB_RENDER_BENCHMARK.md`).
5. **Download.** Open **Releases**, find the newest "TwistFrame: …", and tap the `.mp4`.

## Cost and limits

- It only uses **standard GitHub-hosted runners** (`ubuntu-latest`). There are no paid runner types and no other services.
- A **public** repository has free unlimited standard-runner minutes.
- A **private** repository on the Free plan has 2,000 included minutes per month. GitHub stops jobs at the limit unless you have set a spending limit above $0, which is off by default, so nothing is charged without your consent.
- A full 1607-frame video costs about 1607 × (seconds per frame) ÷ 60 runner-minutes, plus about 3 minutes of setup per job.
- At most 8 runners are used at once.
- Release files must be under 2 GB (a 50 s 1080×1920 video is about 100 MB).

## What must be in Git for a cloud render

- The production's source.
- `productions/<id>/analysis/analysis.json`, `input/narration.mp3` and `audio/mix.wav`. Mix WAVs are normally excluded locally, so add them with `git add -f`.
- Any textures or models it uses under `studio/public/`.
- Exception: `studio/public/flight/` (the Orkney flight production) is **not** in Git, so that production cannot render in the cloud until its assets are added.
