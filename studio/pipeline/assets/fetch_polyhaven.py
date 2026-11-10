#!/usr/bin/env python3
"""TwistFrame Lab — fetch CC0 assets from Poly Haven (https://polyhaven.com, all assets CC0-1.0).
Downloads 1k glTF models / PBR texture sets / HDRIs into assets_src/ (git-ignored raw downloads), verifies MD5 where
the API provides it, and records origin + license + authors in assets/registry.json (merged, never overwritten).
Usage: fetch_polyhaven.py models id1 id2 ... | textures id ... | hdris id ...   [--res 1k]
"""
import hashlib, json, os, sys, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC, REG = os.path.join(ROOT, "assets_src"), os.path.join(ROOT, "assets", "registry.json")
API = "https://api.polyhaven.com"
UA = {"User-Agent": "TwistFrameLab-asset-fetcher/1.0"}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r: return r.read()
def jget(url): return json.loads(get(url))
def save(url, path, md5=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and (md5 is None or hashlib.md5(open(path, "rb").read()).hexdigest() == md5): return
    data = get(url)
    if md5 and hashlib.md5(data).hexdigest() != md5: raise SystemExit(f"MD5 mismatch {url}")
    open(path, "wb").write(data)
def main():
    kind, ids = sys.argv[1], [a for a in sys.argv[2:] if not a.startswith("--")]
    res = sys.argv[sys.argv.index("--res") + 1] if "--res" in sys.argv else "1k"
    reg = json.load(open(REG)) if os.path.exists(REG) else {"_doc": "Origin and license of every third-party asset in the TwistFrame library.", "assets": {}}
    for aid in ids:
        info, files = jget(f"{API}/info/{aid}"), jget(f"{API}/files/{aid}")
        entry = {"type": kind[:-1], "source": "Poly Haven", "page": f"https://polyhaven.com/a/{aid}", "license": "CC0-1.0",
                 "authors": list(info.get("authors", {}).keys()), "name": info.get("name"), "categories": info.get("categories", []), "resolution": res}
        if kind == "models":
            g = files["gltf"][res]["gltf"]; d = os.path.join(SRC, "models", aid)
            save(g["url"], os.path.join(d, os.path.basename(g["url"])), g.get("md5"))
            for rel, f in g["include"].items(): save(f["url"], os.path.join(d, rel), f.get("md5"))
            entry.update(polycountOriginal=info.get("polycount"), dimensionsMm=info.get("dimensions"), raw=os.path.relpath(d, ROOT))
        elif kind == "textures":
            d = os.path.join(SRC, "textures", aid); maps = {}
            for key, short in [("Diffuse", "diff"), ("nor_gl", "nor"), ("Rough", "rough"), ("arm", "arm")]:
                if key in files and res in files[key]:
                    f = files[key][res]["jpg"]; p = os.path.join(d, f"{short}.jpg"); save(f["url"], p, f.get("md5")); maps[short] = os.path.relpath(p, ROOT)
            entry.update(maps=maps, dimensionsMm=info.get("dimensions"))
        elif kind == "hdris":
            f = files["hdri"][res]["hdr"]; p = os.path.join(SRC, "hdri", f"{aid}_{res}.hdr"); save(f["url"], p, f.get("md5"))
            entry.update(raw=os.path.relpath(p, ROOT))
        reg["assets"][aid] = {**reg["assets"].get(aid, {}), **entry}
        print("ok", kind, aid)
    os.makedirs(os.path.dirname(REG), exist_ok=True); json.dump(reg, open(REG, "w"), indent=1, sort_keys=True)
if __name__ == "__main__": main()
