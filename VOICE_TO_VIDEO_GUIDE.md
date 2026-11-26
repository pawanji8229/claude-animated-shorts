# TwistFrame Lab — Voice-to-Video Guide (Android-friendly)

## The one command
Attach your MP3/WAV (and optionally a `.txt` with the exact words) in this Claude Code project and type:

```
MAKE VIDEO FOR PAWAN
```
If the skill does not activate on its own, type: `/voice-to-video MAKE VIDEO FOR PAWAN`
(or: "Use the voice-to-video skill on the attached audio").

Tip: attaching your script as a text file removes all transcription guesswork (ASR here is offline PocketSphinx).

## What happens
| step | who | what you get |
|---|---|---|
| 1 analyse | script `make_video.sh init` | exact duration/frames, phrases + pauses, transcript with ⚠ uncertain words |
| 2 story & facts | Claude | `STORYBOARD.md` (every narration beat → shot), `SOURCE_NOTES.md` for factual topics |
| 3 world, characters, camera, acting | Claude (writes scene code from the reusable library) | original scenes in the TwistFrame style |
| 4 sound design | script `make_video.sh audio` | event-driven SFX, loop-safe ambience, optional music, ducked mix, stems, cue sheet |
| 5 test | script `make_video.sh test` | 2-second test render checked automatically |
| 6 render | script `make_video.sh render` | all frames in resumable batches, joined without breaks, narration muxed |
| 7 QC | script `make_video.sh qc` + Claude's visual review | `QC_REPORT.md`, contact sheet, loop-boundary test clip |
| 8 delivery | Claude | MP4, audio stems + cue sheet ZIP, project backup ZIP |

## Honest limits (read once)
- **Creative steps are not a fixed template.** Each new topic needs new storyboard and usually new environments/props;
  Claude writes that code each time (reusing characters, post-processing, worlds, sound generators). That is the
  slowest part and depends on Claude's session time.
- **Render time on this CPU-only cloud machine:** detailed scenes take ~4–6 s per frame at 540×960 (+~40 s per batch).
  A 60 s Short (1,800 frames) ≈ 2–3 h at preview size; 1080×1920 is roughly 4× longer. Renders are resumable in
  batches; if the session stops, say "continue the render" and finished batches are reused.
- **Sound effects are procedurally synthesised** (no recorded libraries are reachable here). They are designed and
  synced carefully but are not field recordings. Licensed recordings you provide can replace any cue.
- **Seamless loops** depend on the words: visuals and ambience are always made loop-friendly; the voice is never cut
  or reordered to force a loop — if the sentence does not loop, the report says so.
- **Quality:** automatic QC checks the encoded file objectively; aesthetic quality is judged by Claude looking at real
  frames and is reported honestly, never auto-"approved".
- GitHub is not used (account suspended). Everything stays in the session; you download ZIP backups.

## Your approved quality reference
The 9.7 s Reopening Short you approved is saved in `references/benchmarks/reopening_v2_approved/`. Every new video is
built and checked against it (look, movement, crowd life, narration-first sound, seamless loop).

## Voice clarity and crowds (always on)
- Your narration is always the clearest sound. Every effect is set relative to your voice, backgrounds dip smoothly
  while you speak, and the mixer checks every single word: if anything masks a word it is turned down around that word.
  QC fails the video if any word is less than 12 dB clear or the crowd gets loud.
- Crowds are quiet, distant murmur and soft individual claps — no shouting or "woo" loops.
- Crowd members move independently: each has their own timing, stance, expression and activity. Photographers each go
  through notice → raise → aim → shoot → lower at different moments; shutter clicks and flashes come only from a visible
  shot. An automatic check rejects synchronised crowds before rendering.

## Writing loop-friendly narration (optional)
End on a line that leads back into your first line, e.g. last line "...and that's why…" + first line "...a man bought
a bridge". Keep a 0.3–0.6 s breath at the very end. Claude will never edit your recording to do this.

## Restoring in a NEW Claude session
1. Start a Claude Code session and attach the latest `twistframe-backup-*.zip`.
2. Say: **"Restore TwistFrame Lab from the attached ZIP and run setup."**
   Claude will: `unzip` it, `cd claude-animated-shorts`, run `bash studio/pipeline/setup.sh`, and read
   `.claude/skills/voice-to-video/SKILL.md` + `PROJECT_HANDOFF.md`.
3. Then attach your voiceover and type **MAKE VIDEO FOR PAWAN**.
(Skills auto-load only when the project folder is the session's working folder; otherwise Claude reads the skill
file explicitly — the result is the same.)
