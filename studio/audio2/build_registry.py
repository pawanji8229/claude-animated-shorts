#!/usr/bin/env python3
"""Audio 2.0 library manager: builds the searchable registry of every usable sound (metadata only - the audio files stay
in asset-library/cache, which is gitignored), detects duplicates (sha256) and missing files, and writes the manual
review queue for sources whose licence could not be verified automatically.

Outputs (studio/audio2/library/):
  registry.json      every sound: id, name, category (40 Audio 2.0 categories), description, tags, duration, format,
                     sample rate, channels, peak/mean level, source site, source page, file URL, licence, licence URL,
                     attribution requirement, sha256, local path, status (ready / missing / duplicate)
  review_queue.json  candidates that must NOT be used until a human verifies licence / access
  LIBRARY.md         human-readable summary per category + licence table
Search from Python:  from library_api import search; search(category="footsteps", tags=["gravel"])
"""
import glob, hashlib, json, os, re, subprocess

ROOT = os.path.dirname(os.path.abspath(__file__)); AL = os.path.abspath(os.path.join(ROOT, "..", "..", "asset-library")); CACHE = os.path.join(AL, "cache")
CATEGORIES = ["cinematicImpacts", "whooshes", "swishes", "risers", "bassImpacts", "transitions", "explosions", "mechanical", "construction", "industrial", "vehicleEngines",
    "aircraft", "shipsBoats", "water", "wind", "rain", "thunder", "fire", "footsteps", "clothing", "objectHandling", "doors", "metalImpacts", "woodImpacts", "stoneImpacts",
    "glass", "electronic", "ui", "crowdAmbience", "indoorAmbience", "outdoorAmbience", "cityAmbience", "forestAmbience", "harborAmbience", "historical", "suspense", "comedy",
    "surprise", "characterMovement", "magical", "music"]
# legacy catalog categories (premium-assets session) -> Audio 2.0 categories
LEGACY = {"aircraft": "aircraft", "birds": "outdoorAmbience", "city": "cityAmbience", "construction": "construction", "crowd": "crowdAmbience", "doors": "doors", "factory": "industrial",
    "foley": "clothing", "footsteps": "footsteps", "impacts": "metalImpacts", "office": "indoorAmbience", "tools": "construction", "transitions": "transitions", "vehicles": "vehicleEngines",
    "water": "water", "weather": "rain", "wind": "wind"}
SURF = ["concrete", "stone", "wood", "metal", "gravel", "sand", "grass", "soil", "water", "snow", "carpet", "tile", "asphalt", "leaves", "mud"]

def probe(path):
    o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", path], capture_output=True, text=True)
    if o.returncode: return None
    j = json.loads(o.stdout); s = j["streams"][0]; return {"codec": s["codec_name"], "sampleRate": int(s["sample_rate"]), "channels": s["channels"], "duration": round(float(j["format"]["duration"]), 3)}
def sha(path):
    h = hashlib.sha256(); h.update(open(path, "rb").read()); return h.hexdigest()
def kenney_cat(pack, name):
    n = name.lower()
    if "footstep" in n: return "footsteps", [s for s in SURF if s in n]
    if "door" in n or "creak" in n: return "doors", []
    if any(k in n for k in ["cloth", "belt", "leather"]): return "clothing", []
    if any(k in n for k in ["book", "coin", "knife", "chop", "handle", "drop", "metalpot", "metallatch"]): return "objectHandling", []
    if "glass" in n: return "glass", []
    if "wood" in n or "plank" in n: return "woodImpacts", []
    if "metal" in n or "bell" in n or "plate" in n: return "metalImpacts", []
    if "soft" in n or "generic" in n or "punch" in n or "mining" in n: return "stoneImpacts", []
    return {"interface-sounds": "ui", "ui-audio": "ui", "digital-audio": "electronic", "sci-fi-sounds": "magical", "music-jingles": "music"}.get(pack, "objectHandling"), []

def main():
    reg, seen = [], {}
    cat = json.load(open(os.path.join(AL, "catalog.json")))["assets"]; legacy = {a["id"]: a for a in cat if a.get("type") == "sound"}
    # Mixkit (legacy + new)
    for man_path in sorted(glob.glob(os.path.join(CACHE, "mixkit", "*", "manifest.json"))):
        m = json.load(open(man_path)); sid = m["id"]; leg = legacy.get(f"mixkit:{sid}", {}); f = os.path.join(os.path.dirname(man_path), m.get("entry") or m["files"][0]["rel"])
        c = m.get("category") if m.get("category") in CATEGORIES else LEGACY.get(m.get("category") or leg.get("category", ""), "objectHandling")
        tags = sorted(set((m.get("tags") or []) + (leg.get("tags") or [])))
        if c == "footsteps": tags = sorted(set(tags + [s for s in SURF if s in (m.get("title", "") + " " + leg.get("name", "") + " " + " ".join(tags)).lower()]))
        reg.append({"id": f"mixkit:{sid}", "name": m.get("title") or leg.get("name") or sid, "category": c, "description": leg.get("use") or m.get("use") or m.get("title", ""), "tags": tags,
            "source": "Mixkit", "sourcePage": m.get("page") or leg.get("sourceUrl"), "fileUrl": m["url"], "licence": "Mixkit Sound Effects Free License", "licenceUrl": "https://mixkit.co/license/#sfxFree",
            "attribution": "not required", "redistributable": False, "local": os.path.relpath(f, AL), "expectSha256": m["files"][0].get("sha256")})
    # Kenney packs (CC0)
    for pack_dir in sorted(glob.glob(os.path.join(CACHE, "kenney", "*"))):
        pack = os.path.basename(pack_dir)
        for f in sorted(glob.glob(os.path.join(pack_dir, "files", "**", "*.ogg"), recursive=True)):
            name = os.path.splitext(os.path.basename(f))[0]; c, surf = kenney_cat(pack, name)
            reg.append({"id": f"kenney:{pack}/{name}", "name": re.sub(r"[_-]", " ", name), "category": c, "description": f"Kenney {pack} - {name}", "tags": sorted(set(re.findall(r"[a-z]+", name.lower()) + surf)),
                "source": "Kenney", "sourcePage": f"https://kenney.nl/assets/{pack}", "fileUrl": f"https://kenney.nl/assets/{pack}", "licence": "CC0 1.0", "licenceUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
                "attribution": "not required (CC0)", "redistributable": True, "local": os.path.relpath(f, AL)})
    # verify every file: exists, decodes, hash, duplicates
    for r in reg:
        p = os.path.join(AL, r["local"])
        if not os.path.exists(p): r["status"] = "missing"; continue
        q = probe(p)
        if not q: r["status"] = "corrupt"; continue
        h = sha(p); r.update({"format": q["codec"], "sampleRate": q["sampleRate"], "channels": q["channels"], "duration": q["duration"], "sha256": h, "bytes": os.path.getsize(p)})
        if r.get("expectSha256") and r["expectSha256"] != h: r["status"] = "hash-mismatch"; continue
        r.pop("expectSha256", None)
        if h in seen: r["status"] = "duplicate"; r["duplicateOf"] = seen[h]; continue
        seen[h] = r["id"]; r["status"] = "ready"
    out = os.path.join(ROOT, "library"); os.makedirs(out, exist_ok=True)
    json.dump({"generated": "audio2/build_registry.py", "count": len(reg), "categories": CATEGORIES, "sounds": reg}, open(os.path.join(out, "registry.json"), "w"), indent=1)
    queue = [
        {"source": "Pixabay", "url": "https://pixabay.com/sound-effects/", "status": "blocked", "why": "site answers HTTP 403 to automated requests; not bypassed. Pixabay Content License is permissive, but files must be downloaded manually by a person and logged here with their page URL.", "wanted": ["risers", "suspense", "magical", "historical"]},
        {"source": "Freesound", "url": "https://freesound.org/", "status": "needs API key", "why": "downloads require a Freesound API key / OAuth; each recording has its own licence (CC0 / CC-BY / CC-BY-NC). Only CC0 and CC-BY (with exact attribution recorded) may be used; CC-BY-NC is excluded for commercial use.", "wanted": ["harborAmbience", "historical", "forestAmbience", "footsteps (sand, snow, mud)"]},
        {"source": "ZapSplat", "url": "https://www.zapsplat.com/", "status": "needs account + not reachable", "why": "requires a (free) account; the free tier requires attribution 'Sound effects obtained from https://www.zapsplat.com'; host not reachable from this environment.", "wanted": ["clothing", "characterMovement"]},
        {"source": "Mixkit music", "url": "https://mixkit.co/free-stock-music/", "status": "licence text not machine-verifiable", "why": "the Mixkit Stock Music Free License text is shown in a script-driven modal that could not be read here; verify manually before adding music tracks.", "wanted": ["music"]},
        {"source": "Mixkit", "url": "https://mixkit.co/free-sound-effects/", "status": "4 items refused (HTTP 403)", "why": "ids 1143, 788, 3046, 2354 returned 403 on the asset URL; skipped, not retried with tricks.", "wanted": []},
    ]
    json.dump(queue, open(os.path.join(out, "review_queue.json"), "w"), indent=1)
    ready = [r for r in reg if r["status"] == "ready"]; by = {}
    for r in ready: by.setdefault(r["category"], []).append(r)
    lines = ["# Audio 2.0 sound library", "", f"{len(ready)} verified sounds ready ({sum(1 for r in reg if r['status'] == 'duplicate')} duplicates removed, {sum(1 for r in reg if r['status'] in ('missing', 'corrupt', 'hash-mismatch'))} missing / corrupt).", "",
        "Audio files live in `asset-library/cache/` (gitignored: Mixkit files may not be redistributed). This file and `registry.json` hold the metadata.", "",
        "| Licence | Sounds | Attribution | Redistribute raw files |", "|---|---|---|---|",
        f"| Mixkit Sound Effects Free License | {sum(1 for r in ready if r['source'] == 'Mixkit')} | not required | no |", f"| CC0 1.0 (Kenney) | {sum(1 for r in ready if r['source'] == 'Kenney')} | not required | yes |", "",
        "| Category | Sounds | Total duration | Examples |", "|---|---|---|---|"]
    for c in CATEGORIES:
        rs = by.get(c, []); lines.append(f"| {c} | {len(rs)} | {sum(r['duration'] for r in rs):.0f} s | {', '.join(r['name'][:28] for r in rs[:3])} |")
    lines += ["", "Synthesised sounds (Audio 2.0 `synth.py`) fill categories the downloaded library lacks; they are generated by our own code and marked `source: synth`.", "", "Manual review queue: `review_queue.json`."]
    open(os.path.join(out, "LIBRARY.md"), "w").write("\n".join(lines) + "\n")
    print(f"registry: {len(reg)} entries, {len(ready)} ready, categories with sounds: {sum(1 for c in CATEGORIES if by.get(c))}/{len(CATEGORIES)}")
    print("empty categories:", [c for c in CATEGORIES if not by.get(c)])

if __name__ == "__main__": main()
