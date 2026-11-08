#!/usr/bin/env bash
# TwistFrame Lab — voice-to-video orchestrator. Stages are idempotent; run them in order.
#   make_video.sh init    <id> <audio.mp3|wav> [transcript.txt]   -> productions/<id>/ + analysis (TRANSCRIPT.md)
#   (Claude: write STORYBOARD.md, SOURCE_NOTES.md, scene module src/productions/<id>/scene.ts + composition)
#   make_video.sh audio   <id> <sceneModule.ts>                     -> events.json, stems, mix.wav, cue sheet
#   make_video.sh test    <id> <CompositionId> [frames=0-59]        -> short test render + QC (objective checks)
#   make_video.sh render  <id> <CompositionId>                      -> all frames in batches, joined, audio muxed
#   make_video.sh qc      <id>                                      -> full QC incl. loop boundary test
#   make_video.sh backup  <id>                                      -> project ZIP + asset manifest
set -euo pipefail
STUDIO="$(cd "$(dirname "$0")/.." && pwd)"; ROOT="$(cd "$STUDIO/.." && pwd)"; PY="$ROOT/.venv/bin/python"
[ -x "$PY" ] || PY="$(command -v python3)"
stage="$1"; id="$2"; P="$STUDIO/productions/$id"; cd "$STUDIO"
case "$stage" in
  init)
    audio="$3"; [ -f "$audio" ] || { echo "BLOCKER: audio not found: $audio"; exit 2; }
    mkdir -p "$P/input" "$P/analysis" "$P/audio" "$P/render" "$P/qc"
    ext="${audio##*.}"; cp "$audio" "$P/input/narration.$ext"
    [ -n "${4:-}" ] && cp "$4" "$P/input/transcript.txt"
    "$PY" pipeline/analyze_audio.py "$P/input/narration.$ext" "$P/analysis" ${4:+--transcript "$P/input/transcript.txt"}
    cat "$P/analysis/TRANSCRIPT.md"
    echo; echo "NEXT (Claude): storyboard + scene module for $id, then: make_video.sh audio $id <sceneModule.ts>";;
  audio)
    mod="$3"; nar=$(ls "$P"/input/narration.* | head -1)
    npx tsx scripts/export-events.ts "$mod" "$P/events.json"
    amb=$(node -e "console.log(require('./twistframe.config.json').audio.ambiencePreset)"); mus=$(node -e "console.log(require('./twistframe.config.json').audio.musicPreset)")
    [ -f "$P/production.json" ] && amb=$(node -e "console.log(require('$P/production.json').ambience ?? '$amb')") && mus=$(node -e "console.log(require('$P/production.json').music ?? '$mus')")
    (cd audio && "$PY" mix_events.py "$nar" "$P/events.json" "$P/audio" full --ambience "$amb" --music "$mus" --loop);;
  test)
    comp="$3"; fr="${4:-0-59}"; nar=$(ls "$P"/input/narration.* | head -1)
    node pipeline/render_batches.mjs --comp "$comp" --frames "$fr" --batch 30 --out "$P/render/test.mp4" --audio "$P/audio/mix.wav"
    "$PY" pipeline/qc.py "$P/render/test.mp4" "$P/analysis/analysis.json" "$nar" "$P/qc/test" --partial || true;;
  render)
    comp="$3"; n=$(node -e "console.log(require('$P/analysis/analysis.json').frames)")
    node pipeline/render_batches.mjs --comp "$comp" --frames "0-$((n-1))" --out "$P/render/final.mp4" --audio "$P/audio/mix.wav" --resume;;
  qc)
    nar=$(ls "$P"/input/narration.* | head -1)
    "$PY" pipeline/qc.py "$P/render/final.mp4" "$P/analysis/analysis.json" "$nar" "$P/qc/final" --loop;;
  backup)
    "$PY" pipeline/backup.py "$STUDIO/out/twistframe-backup-$id.zip";;
  *) echo "unknown stage $stage"; exit 2;;
esac
