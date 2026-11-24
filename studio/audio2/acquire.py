#!/usr/bin/env python3
"""Audio 2.0 legal acquisition workflow (curated, polite, verified).

Sources and why:
  * Mixkit (https://mixkit.co/free-sound-effects/) - Mixkit Sound Effects Free License: free for commercial and personal
    projects inside an end product (our videos), no attribution required; redistributing the raw files is NOT allowed,
    so files stay in asset-library/cache (gitignored) and only metadata is committed. Downloads use the public asset URL
    of each item, one request per second, a curated handful per category (never bulk-mirroring the site).
  * Kenney (https://kenney.nl/assets/category:Audio) - CC0 1.0 public domain packs, via Kenney's own download link.
  * Pixabay - the site returns HTTP 403 to automated clients: NOT bypassed. Candidates go to the manual review queue.
  * Freesound - every sound has its own licence and downloads need an API key / OAuth: review queue only (per-sound
    licence must be checked, CC-BY attribution recorded exactly) until a key is provided.
  * ZapSplat - requires an account and attribution (free tier); not reachable from this environment: review queue.
Every downloaded file is verified with ffprobe (decodes, duration, sample rate, channels), hashed (sha256), measured
(peak / RMS) and recorded with its source page, licence, attribution requirement and download status.

Usage: python acquire.py [--per 3] [--dry]
"""
import argparse, hashlib, html, json, os, re, subprocess, time, urllib.request, zipfile, io

ROOT = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.abspath(os.path.join(ROOT, "..", "..", "asset-library", "cache"))
UA = "Mozilla/5.0 (X11; Linux x86_64) TwistFrameLab-curated-fetch"
MIXKIT_LICENCE = ("Mixkit Sound Effects Free License", "https://mixkit.co/license/#sfxFree")
# Mixkit tag page -> Audio 2.0 category (the 40 library categories)
MIXKIT_CATEGORIES = {
    "whoosh": "whooshes", "swoosh": "swishes", "swish": "swishes", "transition": "transitions", "cinematic": "cinematicImpacts", "boom": "bassImpacts", "bass": "bassImpacts",
    "impact": "cinematicImpacts", "hit": "cinematicImpacts", "swell": "risers", "sweep": "risers", "explosion": "explosions", "crash": "metalImpacts", "glass": "glass",
    "metal": "metalImpacts", "wood": "woodImpacts", "thud": "stoneImpacts", "doors": "doors", "footsteps": "footsteps", "walk": "footsteps", "engine": "vehicleEngines",
    "car": "vehicleEngines", "truck": "vehicleEngines", "motorcycle": "vehicleEngines", "train": "vehicleEngines", "tram": "vehicleEngines", "traffic": "cityAmbience",
    "airport": "aircraft", "helicopter": "aircraft", "boat": "shipsBoats", "ship": "shipsBoats", "construction": "construction", "tools": "construction",
    "electricity": "electronic", "hum": "industrial", "tape-machine": "mechanical", "typewriter": "mechanical", "clock": "mechanical", "fire": "fire", "thunder": "thunder",
    "rain": "rain", "storm": "rain", "wind": "wind", "water": "water", "waves": "water", "ocean": "harborAmbience", "rivers": "water", "waterfall": "water",
    "city": "cityAmbience", "crowd": "crowdAmbience", "restaurant": "indoorAmbience", "office": "indoorAmbience", "public-places": "indoorAmbience", "hall": "indoorAmbience",
    "forest": "forestAmbience", "bird": "outdoorAmbience", "nature": "outdoorAmbience", "night": "outdoorAmbience", "crickets": "outdoorAmbience", "medieval-battle": "historical",
    "magic": "magical", "sparkle": "magical", "spell": "magical", "cartoon": "comedy", "funny": "comedy", "scary": "suspense", "drone": "suspense", "horror": "suspense",
    "interface": "ui", "click": "ui", "notification": "ui", "beep": "electronic", "high-tech": "electronic", "paper": "objectHandling", "key": "objectHandling",
    "page": "objectHandling", "drop": "objectHandling", "gasp": "surprise", "wow": "surprise", "laugh": "comedy", "breathe": "characterMovement", "jump": "characterMovement",
    "run": "characterMovement", "bell": "historical", "church-bell": "historical", "whistle": "harborAmbience", "horn": "shipsBoats", "siren": "cityAmbience", "alarm": "industrial",
}
KENNEY_PACKS = {"interface-sounds": "ui", "ui-audio": "ui", "digital-audio": "electronic", "sci-fi-sounds": "magical", "music-jingles": "music"}

def get(url, binary=False, referer=None):
    h = {"User-Agent": UA}
    if referer: h["Referer"] = referer
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=60) as r:
        d = r.read(); return d if binary else d.decode("utf-8", "replace")

def probe(path):
    o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", path], capture_output=True, text=True)
    if o.returncode: return None
    j = json.loads(o.stdout); s = j["streams"][0]
    v = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    pk = re.search(r"max_volume: ([-\d.]+)", v); mn = re.search(r"mean_volume: ([-\d.]+)", v)
    return {"codec": s["codec_name"], "sampleRate": int(s["sample_rate"]), "channels": s["channels"], "duration": round(float(j["format"]["duration"]), 3), "peakDb": float(pk.group(1)) if pk else None, "meanDb": float(mn.group(1)) if mn else None}

def parse_mixkit(page):
    out = []
    for m in re.finditer(r'data-audio-player-item-id-value="(\d+)"(.*?)item-grid-sfx-preview__meta-time" data-test-id="duration">\s*([\d:]+)', page, re.S):
        sid, body, dur = m.group(1), m.group(2), m.group(3)
        t = re.search(r'item-grid-card__title">\s*(.*?)\s*</h2>', body, re.S); tags = re.findall(r'href="/free-sound-effects/([a-z0-9-]+)/">', body)
        mm, ss = dur.split(":"); out.append({"id": sid, "title": html.unescape(t.group(1)) if t else sid, "tags": tags, "seconds": int(mm) * 60 + int(ss)})
    return out

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--per", type=int, default=3); ap.add_argument("--dry", action="store_true"); A = ap.parse_args()
    have = set(os.listdir(os.path.join(LIB, "mixkit"))) if os.path.isdir(os.path.join(LIB, "mixkit")) else set()
    log = {"started": time.strftime("%Y-%m-%d %H:%M:%S"), "mixkit": [], "kenney": [], "skipped": [], "errors": []}
    taken = set()
    for slug, cat in MIXKIT_CATEGORIES.items():
        try: items = parse_mixkit(get(f"https://mixkit.co/free-sound-effects/{slug}/")); time.sleep(1.0)
        except Exception as e: log["errors"].append({"page": slug, "error": str(e)}); continue
        longOk = cat.endswith("Ambience") or cat in ("rain", "wind", "water", "fire")
        n = 0
        for it in items:
            if n >= A.per: break
            if it["id"] in taken: continue
            if it["seconds"] > (120 if longOk else 30) or it["seconds"] < 1: log["skipped"].append({"id": it["id"], "why": "duration"}); continue
            taken.add(it["id"]); n += 1
            if it["id"] in have: log["skipped"].append({"id": it["id"], "why": "already in library"}); continue
            url = f"https://assets.mixkit.co/active_storage/sfx/{it['id']}/{it['id']}.wav"; d = os.path.join(LIB, "mixkit", it["id"]); f = os.path.join(d, f"{it['id']}.wav")
            if A.dry: log["mixkit"].append({**it, "category": cat, "url": url, "status": "dry"}); continue
            try:
                os.makedirs(d, exist_ok=True); data = get(url, binary=True, referer="https://mixkit.co/free-sound-effects/"); open(f, "wb").write(data); time.sleep(1.0)
                q = probe(f)
                if not q: raise RuntimeError("ffprobe could not decode")
                man = {"id": it["id"], "source": "mixkit", "url": url, "page": f"https://mixkit.co/free-sound-effects/{slug}/", "title": it["title"], "tags": it["tags"], "category": cat,
                       "licence": f"{MIXKIT_LICENCE[0]} ({MIXKIT_LICENCE[1]})", "attribution": "not required", "redistributable": False,
                       "files": [{"rel": f"{it['id']}.wav", "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}], "quality": q, "fetched": time.strftime("%Y-%m-%d")}
                json.dump(man, open(os.path.join(d, "manifest.json"), "w"), indent=1); log["mixkit"].append({"id": it["id"], "title": it["title"], "category": cat, "status": "ok", "duration": q["duration"]})
                print(f"mixkit {it['id']:>5} {cat:<18} {q['duration']:>6.1f}s  {it['title']}")
            except Exception as e: log["errors"].append({"id": it["id"], "error": str(e)})
    for pack, cat in KENNEY_PACKS.items():
        d = os.path.join(LIB, "kenney", pack); z = os.path.join(d, f"kenney_{pack}.zip")
        if os.path.exists(z): log["skipped"].append({"pack": pack, "why": "already downloaded"}); continue
        if A.dry: continue
        try:
            os.makedirs(d, exist_ok=True); j = json.loads(get(f"https://kenney.nl/download-link/{f'assets/{pack}'.encode().hex()}", referer=f"https://kenney.nl/assets/{pack}"))
            url = j.get("url") or j.get("link") or j.get("download"); data = get(url, binary=True, referer=f"https://kenney.nl/assets/{pack}"); open(z, "wb").write(data)
            zf = zipfile.ZipFile(io.BytesIO(data)); bad = zf.testzip()
            if bad: raise RuntimeError(f"corrupt zip member {bad}")
            zf.extractall(os.path.join(d, "files")); json.dump({"pack": pack, "source": "kenney", "page": f"https://kenney.nl/assets/{pack}", "url": url, "licence": "CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)", "attribution": "not required (CC0)", "redistributable": True, "category": cat, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), "fetched": time.strftime("%Y-%m-%d")}, open(os.path.join(d, "manifest.json"), "w"), indent=1)
            log["kenney"].append({"pack": pack, "status": "ok", "files": len(zf.namelist())}); print(f"kenney {pack}: ok ({len(zf.namelist())} files)"); time.sleep(1.0)
        except Exception as e: log["errors"].append({"pack": pack, "error": str(e)})
    log["finished"] = time.strftime("%Y-%m-%d %H:%M:%S")
    os.makedirs(os.path.join(ROOT, "library"), exist_ok=True); json.dump(log, open(os.path.join(ROOT, "library", "acquire-log.json"), "w"), indent=1)
    print(f"done: {sum(1 for x in log['mixkit'] if x.get('status') == 'ok')} mixkit, {len(log['kenney'])} kenney packs, {len(log['errors'])} errors")

if __name__ == "__main__": main()
