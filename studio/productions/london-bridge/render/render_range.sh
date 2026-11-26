#!/bin/bash
# Resumable partial render: renders only missing 150-frame batches inside the given ranges (each job stays well under 2 h).
cd "$(dirname "$0")/../../.."
for r in "$@"; do node pipeline/render_batches.mjs --comp LondonBridgeFull --frames "$r" --batch 150 --out productions/london-bridge/render/partial.mp4 --resume || exit 1; done
echo RANGE_DONE "$@"
