# Verified private reference video manifest

**Status: ALL 5 source MP4 files received and technically checked.** Actual frame samples were inspected for visual properties; audio track existence and level were measured, but audio was **not transcribed or listened to for individual sound effects**.

Do NOT upload these source MP4s or their contact sheets to a public GitHub repository. They are supplied for private analysis. The public-project bundle includes only written observations.

| ID | Video | Duration | Resolution | FPS | Audio codec | Mean / peak dBFS |
|---|---|---:|---|---|---|---|
| V01 | Your Brain’s Secret Idea Zone | 39.07s | 720×1280 | 30/1 | aac | -18.8 / -1.7 |
| V02 | The Window That Breaks Japan’s Gambling Law | 45.03s | 720×1280 | 30/1 | aac | -17.5 / -0.4 |
| V03 | Why Sailors Carried Storm Oil | 64.57s | 720×1280 | 30/1 | aac | -16.9 / -0.4 |
| V04 | The Job Nobody Wants in Japan | 60.50s | 720×1280 | 30/1 | aac | -17.0 / -0.8 |
| V05 | Why Cowboys Never Load Six Bullets | 60.97s | 720×1280 | 30/1 | aac | -16.9 / -0.3 |

## Verified file mapping

- **V01**: `vidssave.com Your Brain's Secret Idea Zone 720P.mp4` — SHA256 `a647fd792557c502d4128d94c9485b8d2cec18cf67cab765b691ba045a571d74`; expected private relative path: `private_reference_videos/video_1.mp4`.
- **V02**: `vidssave.com The Window That Breaks Japan's Gambling Law 720P.mp4` — SHA256 `37c7aa2b1dbf2b4f12e28c1bc97f91631bb1fe753ac0e91a2244d73536eb9a3a`; expected private relative path: `private_reference_videos/video_2.mp4`.
- **V03**: `vidssave.com Why Sailors Carried Storm Oil 720P.mp4` — SHA256 `8f9f15074ef2243fda3d240b9c04834ba3e626213f92db108df55925949c5e67`; expected private relative path: `private_reference_videos/video_3.mp4`.
- **V04**: `vidssave.com The Job Nobody Wants in Japan 720P.mp4` — SHA256 `172ed34b004ae48e76248e0fecd53c4ec8c5a95ccb4fc1b57094939276136878`; expected private relative path: `private_reference_videos/video_4.mp4`.
- **V05**: `vidssave.com Why Cowboys Never Load Six Bullets 720P.mp4` — SHA256 `bfc4cd61b3be1ad55afe9dc033638713e44ee733de6fda52447e052f3ce60136`; expected private relative path: `private_reference_videos/video_5.mp4`.

## Accessible to Claude Code?

Not automatically. The five MP4s arrived in the ChatGPT conversation, NOT in your Claude Code cloud filesystem. A GitHub-hosted Claude Code project sees only files actually uploaded to its connected repository or a separately authorized source. **Do not assume Claude can read the MP4s merely because they are named in SKILL.md.**

For public GitHub projects, use the text-only analysis and prompts. If direct video study by Claude Code is essential, first create a separately controlled **private** working repository, check access and usage limits, then upload the originals privately; do not upload them to a public fork. You can also provide selected reference screenshots to a private Claude conversation and attach the text analysis.

## Verification limits

- Visual observations are based on sampled video frames (not exhaustive shot-by-shot viewing); do not assert exact average cut duration, camera trajectories, rigs, renderer or polygon counts.
- Audio metadata and overall digital levels were measured; exact musical cues, sound identities, voice timbre and SFX timestamps from Gemini are **unverified** until someone actually listens.
- Source stories, branded models, screen-captured original frames, narration and soundtracks are not to be re-used in produced Shorts.
