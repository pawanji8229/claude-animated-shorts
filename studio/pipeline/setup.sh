#!/usr/bin/env bash
# TwistFrame Lab — one-step environment restore (idempotent). Run from anywhere: bash studio/pipeline/setup.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; STUDIO="$ROOT/studio"
echo "== TwistFrame setup in $ROOT"
command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null || { echo "BLOCKER: ffmpeg/ffprobe missing (apt-get install -y ffmpeg)"; exit 1; }
command -v node >/dev/null || { echo "BLOCKER: node missing"; exit 1; }
cd "$STUDIO" && npm ci --no-audit --no-fund >/dev/null && echo "node deps ok"
if [ ! -x "$ROOT/.venv/bin/python" ]; then python3 -m venv "$ROOT/.venv"; fi
"$ROOT/.venv/bin/pip" install -q -r "$STUDIO/pipeline/requirements.txt" && echo "python deps ok"
B=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | head -1 || true)
if [ -n "$B" ]; then echo "headless browser: $B"; else (cd "$STUDIO" && npx remotion browser ensure) || echo "WARNING: no headless browser — rendering will fail until one is available"; fi
cd "$STUDIO" && npx tsc --noEmit && echo "typecheck ok"
echo "== setup complete"
