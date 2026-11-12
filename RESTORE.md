# Restoring the TwistFrame Lab project

Branch `twistframe-london-bridge-v2` holds the complete source history, through London Bridge v2.1. It includes:
- the MAKE VIDEO skill
- scripts and pipeline
- characters and animation assets
- configuration
- audio stems
- the approved Reopening reference

## 1. Get the source

```bash
git clone --branch twistframe-london-bridge-v2 https://github.com/pawanji8229/claude-animated-shorts
cd claude-animated-shorts/studio
npm ci                          # Remotion + three.js toolchain
npx tsc --noEmit -p .           # sanity check (passes on a fresh clone)
bash pipeline/setup.sh          # python venv for audio analysis, mixing and QC
```

## 2. What is in Git and what is not

| item | where | SHA-256 |
|---|---|---|
| MAKE VIDEO skill | `.claude/skills/voice-to-video/SKILL.md` and the original `SKILL.md` | — |
| Approved Reopening reference (9.7 s, 540×960) | `studio/previews/reopening/twistframe_reopening_loop_540x960.mp4` (in Git) | `198933eb2ef336d5e1b67ab9e306aa85fd55b301d20624bd6f99dbdcdbd66182` |
| London Bridge v2 final film (1080×1920, 130 MB) | **not in Git** (over GitHub's 100 MB file limit) | `e322418bb43edad50ba7add8ef3c76fdeb8d6bd215896b2e7181a71f599361c4` |
| London Bridge audio stems ZIP | **not in Git** (the WAV stems themselves are in `studio/productions/london-bridge/audio/`) | `7f8786bc86d71abe41ada8183f5f04dfc9dd725865a6f7896d1b08abfc5dfb8f` |
| Full project backup ZIP (401 MB) | **not in Git** | `bbc2d4935acc3e3e5572e845dd5ed1b4616bc70a3ddb4e72315e3e7de9d98ab2` |

The large files were delivered as downloads:
- the final MP4;
- the backup ZIP, in two parts. Rejoin them with `cat twistframe-backup-london-bridge-v2.zip.part00 twistframe-backup-london-bridge-v2.zip.part01 > twistframe-backup-london-bridge-v2.zip`.

Check each file with `sha256sum` against the table above.

## 3. Re-render the London Bridge film from source (if the MP4 is lost)

```bash
cd studio
bash pipeline/make_video.sh audio london-bridge src/productions/london-bridge/scene.ts   # narration-first mix
bash productions/london-bridge/render/render_range.sh 0-599 600-1199                     # resumable 150-frame batches
bash productions/london-bridge/render/render_range.sh 1200-1770
bash pipeline/make_video.sh render london-bridge LondonBridgeFull                         # joins batches + muxes audio
bash pipeline/make_video.sh qc london-bridge                                              # automatic QC
```

- **Speed.** Rendering takes about 6–8 s per 1080p frame on 4 cores, roughly 3.5 h in total. Keep each job under 2 h.
- **Determinism.** The renders are deterministic.
- **Loudness.** If QC reports true peak above −1 dBTP after AAC encoding, re-mux the audio as `previews/london-bridge-full/QC_REPORT.md` describes: 320 kbps with a −0.4 dB trim.

## 4. Rules kept in this repository

- No private reference videos (`private_reference_videos/` is git-ignored).
- No captions, text overlays or watermarks in films.
- Large renders stay out of ordinary Git commits.
