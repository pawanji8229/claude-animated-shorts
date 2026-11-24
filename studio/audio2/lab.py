#!/usr/bin/env python3
"""Audio 2.0 laboratory: renders 14 playable demos (WAV + MP3) and a report with measurements + the cue lists.
Usage: python lab.py [outdir]   (default studio/out/audio2/lab)"""
import json, os, sys, time
import numpy as np
from engine import render, mix, ev, search, Chooser, export, mp3, integrated, true_peak, SR
from director import direct, density_report
from music import score, section, loop_point
import narration as NA

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "out", "audio2", "lab"); os.makedirs(OUT, exist_ok=True)
NARR = os.path.join(HERE, "..", "productions", "centennial", "input", "narration.mp3"); ANAL = os.path.join(HERE, "..", "productions", "centennial", "analysis", "analysis.json")
REPORT = {"generated": time.strftime("%Y-%m-%d %H:%M"), "demos": []}
def finish(name, title, events, dur, env="street", music=None, narr=None, words=(), notes=(), mixopts=None):
    t0 = time.time(); b = render(events, dur, env)
    if music is not None: b["music"] += np.pad(music, ((0, 0), (0, max(0, b["music"].shape[1] - music.shape[1]))))[:, :b["music"].shape[1]] * 0.5
    full, stems, rep = mix(b, narr, list(words), **(mixopts or {})); wav = os.path.join(OUT, f"{name}.wav"); export(wav, full); mp3(wav, os.path.join(OUT, f"{name}.mp3"))
    d = {"file": f"{name}.mp3", "title": title, "seconds": round(dur, 1), "renderSec": round(time.time() - t0, 2), "lufs": rep["integratedLufs"], "truePeak": rep["truePeakDb"], "clipped": rep["clippedSamples"],
         "worstWordMarginDb": rep.get("worstWordMarginDb"), "guardCuts": len(rep.get("guard", [])), "density": density_report(events, dur), "notes": list(notes),
         "cues": [{"t": round(e["t"], 2), "sound": e["sound"], "bus": e["bus"], "why": e["why"]} for e in sorted(events, key=lambda e: e["t"])][:80]}
    REPORT["demos"].append(d); print(f"{name:<28} {dur:5.1f}s  LUFS {rep['integratedLufs']:6.1f}  TP {rep['truePeakDb']:5.1f}  cues {d['density']['cues']}  ({d['renderSec']}s)"); return full, rep

FPS = 30
def walk(f0, f1, surface, pos=(0, 0, 3), period=15, speed=1.3):
    return [{"f": f, "surface": surface, "speed": speed, "pos": [pos[0] + (0.15 if (f // period) % 2 else -0.15), 0, pos[2]]} for f in range(f0, f1, period)]
# 1 surface-aware footsteps (with stops: silence while standing)
steps = walk(0, 90, "concrete") + walk(120, 210, "wood") + walk(240, 330, "gravel") + walk(360, 450, "grass") + walk(480, 570, "metal") + walk(600, 690, "sand") + walk(720, 780, "water")
ev1, _, n1 = direct({"frames": 810, "environment": "street", "ambience": [{"f": 0, "env": "interior"}], "footsteps": steps, "seed": 3}, False)
finish("01_footsteps_surfaces", "Footsteps: concrete, wood, gravel, grass, metal, sand (synth), water (synth) - standing pauses are silent", ev1, 27, "interior", notes=n1)
# 2 construction ambience with a moving excavator + generator
src = [{"id": "excavator", "loop": "excavatorEngine", "radius": 30, "gainDb": -12, "track": [[f, 8 - f * 0.04, 0, 6 + f * 0.01] for f in range(0, 600, 10)]}, {"id": "generator", "loop": "generatorHum", "radius": 15, "gainDb": -18, "track": [[f, -4, 0, 5] for f in range(0, 600, 30)]}]
ev2, _, n2 = direct({"frames": 600, "environment": "construction", "ambience": [{"f": 0, "env": "construction"}], "sources": src, "footsteps": walk(60, 300, "gravel"), "seed": 4}, False)
finish("02_construction_site", "Construction site: layered ambience, excavator passing left->right, generator hum, gravel footsteps", ev2, 20, "construction", notes=n2)
# 3 industrial machinery
src3 = [{"id": "machines", "loop": "machineRun", "radius": 20, "gainDb": -14, "track": [[f, -3, 0, 4] for f in range(0, 540, 30)]}, {"id": "conveyor", "loop": "conveyorRun", "radius": 14, "gainDb": -16, "track": [[f, 4, 0, 3] for f in range(0, 540, 30)]}, {"id": "fan", "loop": "fanHum", "radius": 10, "gainDb": -20, "track": [[f, 0, 3, 6] for f in range(0, 540, 30)]}]
ev3, _, n3 = direct({"frames": 540, "environment": "factory", "ambience": [{"f": 0, "env": "factory"}], "sources": src3, "footsteps": walk(30, 240, "metal"), "actions": [{"f": 300, "kind": "reach", "material": "metal", "pos": [0.3, 0, 1]}], "seed": 5}, False)
finish("03_industrial_machinery", "Factory hall: machines left, conveyor right, fan overhead, steel walkway footsteps, metal handling", ev3, 18, "factory", notes=n3)
# 4 ship + harbour with a tug passing (distance + pan sweep)
src4 = [{"id": "tug", "loop": "shipEngine", "radius": 60, "gainDb": -10, "track": [[f, -50 + f * 0.12, 0, 20] for f in range(0, 840, 10)]}, {"id": "boat", "loop": "boatCreak", "radius": 12, "gainDb": -24, "track": [[f, 3, 0, 4] for f in range(0, 840, 30)]}]
ev4, _, n4 = direct({"frames": 840, "environment": "harbor", "ambience": [{"f": 0, "env": "harbor"}], "sources": src4, "seed": 6}, False)
finish("04_ship_harbor", "Harbour: water + gulls bed, a tug crossing left->right (engine level follows distance), moored boat creaks", ev4, 28, "harbor", notes=n4)
# 5 city
src5 = [{"id": f"car{i}", "loop": "carIdle", "radius": 40, "gainDb": -12, "track": [[f, (-40 + (f - i * 150) * 0.33) * (1 if i % 2 else -1), 0, 6 + 2 * (i % 2)] for f in range(0, 900, 5)]} for i in range(4)]
ev5, _, n5 = direct({"frames": 900, "environment": "city", "ambience": [{"f": 0, "env": "city"}], "sources": src5, "footsteps": walk(100, 500, "asphalt"), "seed": 8}, False)
finish("05_city_street", "City street: traffic bed, four cars passing in both directions, pedestrian footsteps", ev5, 30, "city", notes=n5)
# 6 indoor
ev6, _, n6 = direct({"frames": 600, "environment": "interior", "ambience": [{"f": 0, "env": "interior"}], "sources": [{"id": "fridge", "loop": "fridgeHum", "radius": 6, "gainDb": -26, "track": [[f, 2, 0, 3] for f in range(0, 600, 30)]}, {"id": "clock", "loop": "clockTick", "radius": 6, "gainDb": -24, "track": [[f, -2, 1, 2] for f in range(0, 600, 30)]}],
    "footsteps": walk(60, 210, "wood"), "actions": [{"f": 240, "kind": "door", "pos": [1, 0, 3]}, {"f": 330, "kind": "grab", "material": "glass", "pos": [0.2, 0, 1]}], "seed": 9}, False)
finish("06_indoor", "Interior: room tone, fridge hum, wall clock, wooden floor footsteps, a door, a glass picked up", ev6, 20, "interior", notes=n6)
# 7 cinematic impacts
ch = Chooser(11); ev7 = [ev(1.0 + i * 3.0, s, "sfx", gain_db=-8, why=w) for i, (s, w) in enumerate([("synth:cineImpact#1", "synth cinematic impact"), ("synth:subBoom#2", "synth sub boom"), (ch.pick("ci", search("cinematicImpacts")), "library cinematic hit"), (ch.pick("bi", search("bassImpacts")), "library bass impact"), ("synth:reverseSwell#5", "reverse swell"), ("synth:accent#6", "bell accent (importance)")])]
finish("07_cinematic_impacts", "Cinematic impacts, booms, reverse swell, accent - spaced, controlled", ev7, 19)
# 8 whooshes + transitions (only on dissolves/reveals by rule; here showcased)
ev8 = [ev(0.8, "synth:riser#1", "sfx", gain_db=-14, why="riser into a reveal"), ev(4.0, "synth:subBoom#2", "sfx", gain_db=-14, why="reveal lands"), ev(7.0, "synth:whoosh#3", "sfx", gain_db=-12, why="synth whoosh (dissolve)"), ev(9.0, "synth:swish#4", "sfx", gain_db=-12, why="swish"),
       ev(11.0, ch.pick("w", search("whooshes") + search("swishes")), "sfx", gain_db=-12, why="library whoosh"), ev(13.0, ch.pick("t", search("transitions")), "sfx", gain_db=-12, why="library transition")]
finish("08_whoosh_transitions", "Riser -> reveal, whooshes and transitions (used only for dissolves / reveals in productions)", ev8, 16)
# 9 character interactions
act = [{"f": 30, "kind": "gesture"}, {"f": 90, "kind": "reach", "material": "wood", "pos": [0.4, 0, 1]}, {"f": 150, "kind": "grab", "material": "metal", "pos": [0.2, 0, 1]}, {"f": 210, "kind": "door", "pos": [-1, 0, 2]}, {"f": 280, "kind": "turn"}, {"f": 330, "kind": "place", "material": "glass", "pos": [0.3, 0, 1]}, {"f": 400, "kind": "land", "surface": "wood"}]
ev9, _, n9 = direct({"frames": 450, "environment": "interior", "ambience": [{"f": 0, "env": "interior"}], "actions": act, "footsteps": walk(220, 280, "wood"), "seed": 12}, False)
finish("09_character_interactions", "Character: cloth on a gesture, wooden box, metal tool, door, turn, glass set down, jump landing", ev9, 15, "interior", notes=n9)
# 10 narration + music, 11 ducking A/B
narr = NA.load(NARR)[:, : int(24 * SR)]; words = [w for w in NA.words_from_analysis(ANAL) if w["t1"] < 24]
mus = score([(0, "curious"), (12, "historical")], 24, 3)
ev10, _, n10 = direct({"frames": 720, "environment": "street", "ambience": [{"f": 0, "env": "historicTown"}], "footsteps": walk(300, 520, "stone"), "seed": 13}, False)
finish("10_narration_music_mix", "Narration (existing Centennial voiceover, untouched) + generative score (curious -> historical) + ambience + footsteps, narration-first mix", ev10, 24, "historicTown", music=mus, narr=narr, words=words, notes=n10)
finish("11a_ducking_OFF", "Same mix WITHOUT ducking or masking guard (for comparison)", ev10, 24, "historicTown", music=mus * 2.2, narr=narr, words=words, mixopts={"duck": {"character": 0, "sfx": 0, "ambience": 0, "music": 0}, "min_margin": -99})
finish("11b_ducking_ON", "Same mix WITH sidechain ducking + per-word masking guard", ev10, 24, "historicTown", music=mus * 2.2, narr=narr, words=words)
# 12 stereo positioning: a source orbiting the listener
orb = [[f, 6 * np.sin(f / 300 * 2 * np.pi), 0, 6 * np.cos(f / 300 * 2 * np.pi) + 0.01] for f in range(0, 600, 5)]
ev12, _, _ = direct({"frames": 600, "environment": "countryside", "ambience": [{"f": 0, "env": "countryside"}], "sources": [{"id": "orbit", "loop": "generatorHum", "radius": 20, "gainDb": -10, "track": orb}], "seed": 14}, False)
finish("12_stereo_positioning", "Stereo positioning: an engine circling the listener (front -> right -> behind -> left)", ev12, 20, "countryside")
# 13 old vs new: old approach = one fixed file per kind, fixed level, no spatialisation, no anti-repetition, no ducking
one = search("footsteps", ["concrete"])[0]; old_ev = [ev(s["f"] / FPS, one, "character", gain_db=-10, why="old: same file every step") for s in walk(0, 600, "concrete")] + [ev(0, search("cityAmbience")[0], "ambience", gain_db=-14, loop_dur=20, why="old: single bed")]
finish("13a_old_approach", "OLD approach: the same footstep file every step at a fixed level, one flat bed, no ducking / spatialisation", old_ev, 20, "city", mixopts={"duck": {"character": 0, "sfx": 0, "ambience": 0, "music": 0}, "min_margin": -99})
new_ev, _, _ = direct({"frames": 600, "environment": "city", "ambience": [{"f": 0, "env": "city"}], "footsteps": walk(0, 600, "concrete"), "sources": src5[:2], "seed": 15}, False)
finish("13b_new_approach", "NEW Audio 2.0: varied footsteps (anti-repetition, pitch / level variation, position), layered ambience, spatial cars", new_ev, 20, "city")
REPORT["oldVsNewRepeats"] = {"old": sum(1 for a, b in zip(old_ev, old_ev[1:]) if a["sound"] == b["sound"] and a["bus"] == "character"), "new": sum(1 for a, b in zip([e for e in new_ev if e["bus"] == "character"], [e for e in new_ev if e["bus"] == "character"][1:]) if a["sound"] == b["sound"])}
# 14 export validation: AAC export + re-measure
wav = os.path.join(OUT, "10_narration_music_mix.wav"); aac = os.path.join(OUT, "14_export_validation.m4a"); export(wav + ".tmp.wav", NA.load(wav)[:, :], aac=aac); os.remove(wav + ".tmp.wav")
dec = NA.load(aac); src_ = NA.load(wav); n = min(dec.shape[1], src_.shape[1])
REPORT["exportValidation"] = {"aac": os.path.basename(aac), "lufsWav": round(float(integrated(src_)), 2), "lufsAac": round(float(integrated(dec[:, :n])), 2), "truePeakAac": round(float(true_peak(dec)), 2), "durationWav": round(src_.shape[1] / SR, 3), "durationAac": round(dec.shape[1] / SR, 3), "sampleRate": SR}
REPORT["loopPoint"] = loop_point(section("calm", 16, 1)[0], 240 / 64)
json.dump(REPORT, open(os.path.join(OUT, "lab_report.json"), "w"), indent=1)
print(json.dumps(REPORT["exportValidation"]), REPORT["oldVsNewRepeats"])
