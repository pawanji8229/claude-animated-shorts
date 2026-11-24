"""Audio 2.0 automatic audio director: scene timeline -> audio timeline (every cue carries the reason it exists).

Input scene JSON (exported from the TwistFrame scene code: Character 2.0 foot contacts + actions, Camera 2.0 shot
plan, World 2.0 sound sources, narration words, story emotion):
  {"fps":30, "frames":N, "environment":"harbor", "ambience":[{"f":0,"env":"harbor"}],
   "footsteps":[{"f":..,"surface":"concrete","speed":1.2,"pos":[x,y,z]}],         # listener-relative positions
   "actions":[{"f":..,"kind":"reach|push|grab|door|gesture|turn|jump|land|sit","pos":[..],"material":"wood"}],
   "shots":[{"f0":..,"f1":..,"preset":"giantStructureReveal","kind":"structure","emotion":"grandeur","importance":0.9,"dissolve":false}],
   "sources":[{"id":"tug","loop":"shipEngine","radius":40,"gainDb":-16,"track":[[f,x,y,z],...]}],
   "narration":{"words":[{"word":..,"t0":..,"t1":..}]}, "music":[{"f":0,"mood":"curious"}], "seed":7}
Rules (restraint first): footsteps only on real contacts (none while standing); cloth only on gestures/turns; a camera
move gets sound only when it is a REVEAL or a DISSOLVE transition (never an orbit or a tracking move); at most one
cinematic accent per 4 s; loud accents never land on a word (moved to the nearest pause within 0.4 s, else dropped);
world sources play only while within their audible radius; ambience layers crossfade over 2 s at environment changes.
"""
import json, math
import numpy as np
from engine import ev, search, Chooser, registry, onset, step_onsets
from music import score

LOOP_MAP = {"shipEngine": ("shipsBoats", ["engine", "boat", "ship", "motor"]), "excavatorEngine": ("construction", ["excavator", "machine", "engine"]), "dozerEngine": ("construction", ["engine", "machine"]),
    "truckIdle": ("vehicleEngines", ["truck", "engine", "idle"]), "carIdle": ("vehicleEngines", ["car", "engine"]), "vanIdle": ("vehicleEngines", ["engine", "car"]), "busIdle": ("vehicleEngines", ["bus", "engine"]),
    "forkliftMotor": ("vehicleEngines", ["engine", "motor"]), "motorbike": ("vehicleEngines", ["motorcycle", "engine"]), "trainIdle": ("vehicleEngines", ["train"]), "generatorHum": ("industrial", ["hum", "generator", "machine"]),
    "electricHum": ("electronic", ["hum", "electric", "electricity"]), "lampHum": ("electronic", ["hum", "electric"]), "acHum": ("industrial", ["hum", "fan", "air"]), "fanHum": ("industrial", ["fan", "hum"]),
    "machineRun": ("industrial", ["machine", "factory"]), "conveyorRun": ("mechanical", ["machine", "conveyor"]), "mixerDrum": ("construction", ["mixer", "concrete", "machine"]), "fridgeHum": ("indoorAmbience", ["hum", "fridge"]),
    "clockTick": ("mechanical", ["clock", "tick"]), "leaves": ("wind", ["leaves", "wind", "trees"]), "boatCreak": ("shipsBoats", ["boat", "creak", "rope"])}
AMB = {"city": [("cityAmbience", ["city", "traffic", "street"]), ("outdoorAmbience", ["bird"])], "street": [("cityAmbience", ["city", "traffic"])], "construction": [("construction", ["construction", "site", "drill"]), ("cityAmbience", ["city"])],
    "harbor": [("harborAmbience", ["ocean", "sea", "harbor", "port"]), ("water", ["waves", "water"])], "waterfront": [("water", ["waves", "water"]), ("outdoorAmbience", ["bird", "seagull"])],
    "factory": [("industrial", ["factory", "machine", "hum"])], "warehouse": [("industrial", ["hum", "factory"])], "interior": [("indoorAmbience", ["room", "office", "home"])],
    "historicTown": [("outdoorAmbience", ["bird", "nature"]), ("cityAmbience", ["city"])], "countryside": [("outdoorAmbience", ["bird", "nature", "meadow"]), ("forestAmbience", ["forest"])],
    "station": [("indoorAmbience", ["station", "public", "hall"]), ("crowdAmbience", ["crowd"])], "forest": [("forestAmbience", ["forest"]), ("wind", ["wind"])]}
REVEALS = {"giantStructureReveal", "epicScaleReveal", "aerialEnvironmentReveal", "mysteryReveal", "objectDetailReveal", "environmentalEstablishing"}
SURF_SYNTH = {"sand": "stepSand", "snow": "stepSnow", "mud": "stepMud", "water": "stepWater", "soil": "stepMud"}
SURF_TAGS = {"concrete": ["concrete"], "stone": ["concrete", "stone"], "tile": ["concrete", "tile"], "asphalt": ["concrete", "asphalt", "street"], "wood": ["wood"], "metal": ["metal"], "gravel": ["gravel"], "grass": ["grass"], "carpet": ["carpet"]}

def _in_word(t, words, pad=0.05): return any(w["t0"] - pad <= t <= w["t1"] + pad for w in words)
def _nearest_pause(t, words, maxd=0.4):
    for d in np.arange(0, maxd + 1e-6, 0.02):
        for c in (t - d, t + d):
            if c >= 0 and not _in_word(c, words): return float(c)
    return None
def _bed_candidates(cat, tags, min_dur=6.0):
    c = search(cat, tags, (min_dur, 600)); return c or search(cat, (), (min_dur, 600)) or search(cat)
def direct(scene, include_music=True):
    fps, N = scene.get("fps", 30), scene["frames"]; dur = N / fps; seed = scene.get("seed", 7); ch = Chooser(seed); words = scene.get("narration", {}).get("words", [])
    out, notes = [], []
    # ---- ambience beds (layered, looped seamlessly, crossfaded at environment changes)
    amb = scene["ambience"] if "ambience" in scene else [{"f": 0, "env": scene.get("environment", "street")}]
    for i, a in enumerate(amb):
        t0, t1 = a["f"] / fps, (amb[i + 1]["f"] / fps if i + 1 < len(amb) else dur); xf = 2.0
        for k, (cat, tags) in enumerate(AMB.get(a["env"], AMB["street"])):
            sid = ch.pick(f"bed-{cat}", _bed_candidates(cat, tags))
            if not sid: notes.append(f"no ambience for {cat}"); continue
            L = (t1 - t0) + (xf if i + 1 < len(amb) else 0) + (xf if i > 0 else 0); st0 = max(0.0, t0 - (xf if i > 0 else 0))
            out.append(ev(st0, sid, "ambience", gain_db=-20 - 6 * k, loop_dur=L, fade_in=xf if i > 0 else 1.0, fade_out=xf if i + 1 < len(amb) else 1.5, why=f"{a['env']} ambience layer {k + 1} ({cat})"))
    # ---- footsteps: one per real foot contact, surface-aware, varied, distance + pan from the listener
    for s in scene.get("footsteps", []):
        surf = s.get("surface", "concrete"); t = s["f"] / fps
        if surf in SURF_SYNTH: sid = f"synth:{SURF_SYNTH[surf]}#{int(s['f'])}"
        else: sid = ch.pick(f"step-{surf}", search("footsteps", SURF_TAGS.get(surf, [surf]), (0, 60))) or ch.pick("step-any", search("footsteps", ["concrete"], (0, 3)))
        if not sid: continue
        spd = s.get("speed", 1.2); r = np.random.default_rng(seed * 7919 + s["f"]); g = -14 + 4 * min(1.5, spd / 1.4) - 2 + r.uniform(-1.5, 1.5)
        ons = [0.0] if sid.startswith("synth:") else step_onsets(sid); o = ons[int(r.integers(0, len(ons)))]   # one step cut at its transient (walking takes hold many)
        out.append(ev(t, sid, "character", gain_db=g, pos=s.get("pos"), rate=1 + r.uniform(-0.04, 0.04), fade_in=0.002, fade_out=0.08, trim=(o, o + 0.42), reverb=0.15, why=f"foot contact on {surf} (frame {s['f']})"))
    # ---- character actions: cloth on gestures / turns, object handling on contact frames
    for a in scene.get("actions", []):
        t, k = a["f"] / fps, a["kind"]; pos = a.get("pos")
        if k in ("gesture", "turn"): out.append(ev(t, ch.pick("cloth", search("clothing")) or f"synth:rustle#{a['f']}", "character", gain_db=-24, pos=pos, why=f"cloth movement on {k}"))
        elif k in ("reach", "push", "grab", "place"):
            mat = a.get("material", "wood"); cand = search({"wood": "woodImpacts", "metal": "metalImpacts", "glass": "glass", "stone": "stoneImpacts"}.get(mat, "objectHandling"), [mat], (0, 2.5)) or search("objectHandling")
            out.append(ev(t, ch.pick(f"handle-{mat}", cand), "character", gain_db=-16, pos=pos, trim=(0, 2.0), reverb=0.2, why=f"hand contact with a {mat} object ({k})"))
        elif k == "door": out.append(ev(t, ch.pick("door", search("doors")), "sfx", gain_db=-12, pos=pos, trim=(0, 3), reverb=0.25, why="door opens"))
        elif k == "land": out.append(ev(t, ch.pick("land", search("footsteps", SURF_TAGS.get(a.get("surface", "concrete"), []))), "character", gain_db=-9, pos=pos, why="landing from a jump"))
    # ---- camera: only reveals and dissolves are sonified; one accent per 4 s; never on top of a word
    last_accent = -99.0
    for s in scene.get("shots", []):
        t0, t1 = s["f0"] / fps, s["f1"] / fps; imp = s.get("importance", 0.6)
        if s.get("dissolve") and t0 - last_accent > 4:
            tw = t0 - 0.45; out.append(ev(max(0, tw), ch.pick("whoosh", search("whooshes") + search("transitions", [], (0, 3))) or f"synth:whoosh#{s['f0']}", "sfx", gain_db=-20, trim=(0, 2.5), why=f"soft transition under the dissolve into '{s.get('preset')}'")); last_accent = t0
        if s.get("preset") in REVEALS and imp >= 0.6 and t0 - last_accent > 4:
            peak = t0 + min(2.8, (t1 - t0) * 0.6); rd = min(3.2, peak - t0 + 0.4); out.append(ev(peak - rd, f"synth:riser#{s['f0']}", "sfx", gain_db=-24 + 4 * imp, trim=(3.2 - rd, None), fade_in=0.4, why=f"swell into the reveal ({s.get('preset')})"))
            if imp >= 0.8:
                tp = peak if not _in_word(peak, words) else _nearest_pause(peak, words)
                if tp is None: notes.append(f"reveal accent at {peak:.2f}s dropped: it would cover a word")
                else: out.append(ev(tp, f"synth:{'subBoom' if s.get('emotion') == 'grandeur' else 'accent'}#{s['f0']}", "sfx", gain_db=-18, reverb=0.3, why=f"reveal lands ({s.get('emotion', 'neutral')}), placed in a speech pause"))
            last_accent = peak
        if s.get("kind") == "surprise" and t0 - last_accent > 4:
            tp = _nearest_pause(t0, words) if _in_word(t0, words) else t0
            if tp is not None: out.append(ev(tp, f"synth:reverseSwell#{s['f0']}", "sfx", gain_db=-22, fade_out=0.1, trim=(0, 1.55), why="surprise beat: short reversed swell into the push-in")); last_accent = tp
    # ---- world sources: spatialised loops while within their radius (gain + pan automation from the tracked path)
    for src in scene.get("sources", []):
        cat, tags = LOOP_MAP.get(src["loop"], ("industrial", [])); sid = ch.pick(f"loop-{src['loop']}", search(cat, tags, (2, 600)) or search(cat, (), (2, 600)))
        if not sid: notes.append(f"no loop for {src['loop']}"); continue
        tr = src["track"]; rad = src.get("radius", 20); dists = [math.hypot(x, z) for _, x, _, z in tr]
        audible = [(f, d) for (f, *_), d in zip(tr, dists) if d <= rad]
        if not audible: notes.append(f"{src['id']} never within {rad} m: silent"); continue
        f0, f1 = audible[0][0], audible[-1][0]; t0, t1 = f0 / fps, f1 / fps
        auto = [((f - f0) / fps, src.get("gainDb", -18) - 20 * math.log10(max(1.0, d / 3.0))) for (f, x, y, z), d in zip(tr, dists) if f0 <= f <= f1]
        pans = [((f - f0) / fps, float(np.clip(x / max(1.0, d), -0.9, 0.9))) for (f, x, y, z), d in zip(tr, dists) if f0 <= f <= f1]
        out.append(ev(t0, sid, "sfx", gain_db=0, loop_dur=max(0.5, t1 - t0), auto=auto, pan_auto=pans, fade_in=0.8, fade_out=0.8, reverb=0.1, why=f"{src['id']} ({src['loop']}) audible from {t0:.1f}s to {t1:.1f}s, level follows distance"))
    music = None
    if include_music and scene.get("music"):
        plan = [(m["f"] / fps, m["mood"]) for m in scene["music"]]; music = score(plan, dur, seed); notes.append(f"score: {' -> '.join(m for _, m in plan)} (original generative score)")
    return out, music, notes

def density_report(events, dur):
    """cues per second and the busiest second (restraint check)"""
    ts = sorted(e["t"] for e in events if e["bus"] in ("sfx", "character")); per = np.bincount(np.array(ts, int), minlength=int(dur) + 1) if ts else np.zeros(1)
    return {"cues": len(ts), "perSecond": round(len(ts) / max(dur, 1e-6), 2), "busiestSecond": int(per.max())}
