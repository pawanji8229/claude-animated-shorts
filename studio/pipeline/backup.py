#!/usr/bin/env python3
"""TwistFrame Lab — full source/project backup ZIP + SHA-256 asset manifest.
Usage: backup.py <out.zip> [--with-renders]   (run from anywhere)
Excludes node_modules, .venv, .git, render batches and scratch output; includes skills, docs, source, productions
(analysis, audio stems, cue sheets, final MP4s if --with-renders), previews, references."""
import hashlib, os, sys, zipfile, datetime
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
out = os.path.abspath(sys.argv[1]); renders = "--with-renders" in sys.argv
SKIP_DIRS = {"node_modules", ".venv", ".git", "__pycache__", "batches", ".remotion"}
def skip(rel):
    parts = rel.split(os.sep)
    if any(p in SKIP_DIRS for p in parts): return True
    if rel.startswith(os.path.join("studio", "out")) and not renders: return True
    if rel.endswith(".zip"): return True
    if rel.endswith(".mp4") and not renders and "previews" not in parts: return True
    return False
rows = []
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for d, dn, fn in os.walk(ROOT):
        dn[:] = [x for x in dn if x not in SKIP_DIRS]
        for f in fn:
            p = os.path.join(d, f); rel = os.path.relpath(p, ROOT)
            if skip(rel) or p == out: continue
            h = hashlib.sha256(open(p, "rb").read()).hexdigest(); rows.append((rel, os.path.getsize(p), h))
            z.write(p, os.path.join("claude-animated-shorts", rel))
    man = f"# Asset manifest\n\nGenerated {datetime.datetime.now(datetime.timezone.utc).isoformat()} — {len(rows)} files.\n\n| path | bytes | sha256 |\n|---|---|---|\n" + "".join(f"| {r} | {s} | {h[:16]}… |\n" for r, s, h in sorted(rows))
    z.writestr("claude-animated-shorts/ASSET_MANIFEST.md", man)
open(os.path.join(ROOT, "ASSET_MANIFEST.md"), "w").write(man)
print(f"backup {out}: {len(rows)} files, {os.path.getsize(out)/1e6:.1f} MB")
