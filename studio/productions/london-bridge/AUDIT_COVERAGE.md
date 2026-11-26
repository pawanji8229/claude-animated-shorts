# London Bridge — Stage A audit: narration-to-visual coverage (v1 film, REJECTED)

Source audited: `london_bridge_full_1080x1920.mp4` (v1), frames sampled every 15 frames plus consecutive frames at every
world boundary, the source in `src/productions/london-bridge/`, `STORYBOARD.md`, and `analysis/analysis.json`
(20 phrases from the voiceover). Times are seconds and frames at 30 fps.

## Global defects in v1

| # | defect | where (frames) | cause in code |
|---|---|---|---|
| G1 | **Transitions are opaque fog/haze/dust curtains.** The screen goes blank for about 0.5 s, then a different world appears. These read as wipes, not cinema. | 344–368, 976–994, 1054–1074, 1469–1487, 1756–14 | `Veil.tsx` opaque canvas; worlds swap at the peak |
| G2 | **Placeholder vehicles.** Excavators are yellow boxes on black bars. Trucks are boxes with cylinder wheels. The ship is an extruded slab with box derricks. The mixer is boxes with a cylinder. | 1064–1290, 1392–1480 (excavators), 860–1063 (ship) | `DesertWorks.tsx` `Truck`/`Excavator`; `LondonSet.tsx` `Ship` |
| G3 | **Granite blocks are plain boxes.** No bevel, one flat colour, numbers only on a grey card face. | 773–1260 | `boxGeometry` + `chalkNumbers` |
| G4 | **Water is flat.** The Thames is a blurred flat mirror. The ocean is vertex-coloured with random per-frame spray points (flicker). The canal is flat. There is no wake around hulls. | 356–984, 985–1063 | `MeshReflectorMaterial` without normals; `SeaSet` spray uses `rng(f)` |
| G5 | **Objects pop in and out.** London: promenade people vanish at 800, workers appear at 760, a money crate appears at 700, the lectern slides in by itself. Works: scaffold, mobile crane, mixer, block stack and crew all appear at 1120; trucks vanish at 1160; Hal appears at 1262; the crew vanishes at 1285; excavators and dirt piles appear at 1392. | as listed | `f >= … &&` visibility toggles |
| G6 | **Lock and canal are primitive.** White slabs, box locomotives, box houses, icosahedron hills. | 1020–1063 | `SeaSet.tsx` |

## Coverage, phrase by phrase

Legend: ✅ adequate · ⚠ weak · ❌ missing/wrong

| # | time (s) / frames | narration | v1 shows | should show | status v1 | v2 fix |
|---|---|---|---|---|---|---|
| 1 | 0.00–1.54 / 0–46 | "In 1968," | dust curtain (0–14), then desert bridge establishing | establishing bridge in the desert | ⚠ blank start (loop veil) | cross-dissolve loop; frame 0 is a clean image |
| 2 | 1.80–4.72 / 54–141 | "a businessman bought an entire bridge from London" | Hal's car arrives, ta-da reveal | (approved hook) | ✅ | unchanged |
| 3 | 5.20–6.96 / 156–208 | "and shipped it to the middle of the desert." | reveal of bridge in empty desert | (approved hook) | ✅ | unchanged |
| 4 | 7.52–9.62 / 225–288 | "But there wasn't even a river waiting for it." | dry riverbed, Hal cringes | (approved hook) | ✅ | unchanged |
| 5 | 10.33–14.55 / 310–436 | "You see, London was replacing its old bridge, and an American businessman" | crane to clouds, fog curtain, aerial London; Hal walks on embankment | old bridge + new bridge works, Hal arrives | ⚠ transition is a blank curtain | **cross-dissolve** hook sky → London aerial, matched upward/downward camera |
| 6 | 15.10–17.08 / 452–512 | "was building a new city in Arizona." | Hal unrolls blueprint | blueprint of the new city | ✅ | keep |
| 7 | 17.34–20.32 / 520–609 | "But he needed something that would make people actually want to visit." | blueprint, yawn, lightbulb | keep | ✅ | keep |
| 8 | 20.94–25.21 / 628–756 | "So he spent 2.46 million dollars buying London Bridge." | lectern slides in by itself; clerk walks in; Hal "signs" (pen wiggles, cheque not readable); money crate pops in | seller and buyer complete a clear transaction: cheque written, handed over, legible amount, deed handed back, handshake | ❌ transaction unreadable, props pop | **rebuilt**: seller walks in with the deed; Hal writes a cheque (pen); camera pushes in on a legible $2,460,000 cheque in the seller's hand; deed with red seal handed to Hal; handshake; no popping props |
| 9 | 25.79–30.36 / 773–910 | "Workers carefully numbered more than ten thousand granite blocks, took the bridge apart," | workers pop in beside a plain wall; grey boxes with small numbers; no dismantling visible | numbered granite blocks; workers chalking numbers; the bridge visibly coming apart | ❌ | **rebuilt**: workers walk in; detailed bevelled granite blocks with large chalk numbers; close-up chalking; the old bridge parapet visibly lowered (clip) with scaffold; blocks stacked |
| 10 | 30.71–32.31 / 921–969 | "and loaded the stones onto ships." | a block appears on a hook (no slinging), a stick boom swings; box ship; no workers involved | the full loading process | ❌ | **rebuilt** 840–968: crane slews over the stack, slings secured by workers, lift, travel, lowering into the hold, deck hand guides it, hatch party; ship departs |
| 11 | 32.83–35.35 / 984–1060 | "Across the ocean, through the Panama Canal," | fog curtain; box ship on vertex-coloured swell; slab lock walls | ocean passage with believable water and wake, then canal locks | ⚠ | **new ship**, **new ocean shading** (normal-mapped ripples, depth colour, stable wake/foam), detailed lock walls, gates, mules, control houses; **cross-dissolve** following the ship |
| 12 | 35.69–37.46 / 1070–1123 | "and finally arrived in Arizona." | haze curtain; box trucks with square dust | trucks drive the blocks into the site | ⚠ | **cross-dissolve**; **new 1960s trucks** drive in and park (no vanishing); soft dust |
| 13 | 37.98–41.85 / 1139–1255 | "Then construction crews rebuilt the bridge around a modern concrete structure." | facing rises over core (good), but crane, scaffold, crew pop in at 1120 | site already in place when the world opens, truck crane placing blocks | ⚠ | site present from world start; **new truck crane** with lattice boom; crew present; mixer detailed |
| 14 | 42.43–44.40 / 1272–1331 | "But there was still one problem." | Hal pops in at 1262, proud ta-da | Hal walks into place | ⚠ | Hal **walks in**; crew walk off |
| 15 | 44.94–46.08 / 1348–1382 | "There was no river." | Hal freezes / cringe, tumbleweed | keep | ✅ | keep (crew no longer vanish behind him) |
| 16 | 46.65–49.12 / 1399–1473 | "So they dug an entire channel underneath it." | box excavators pop in at 1392, dig, flood | excavators drive in, dig, spoil piles grow, water released, machines retreat | ❌ | **new excavators** (tracks, rollers, cab, hydraulics, bucket teeth) drive in, dig, spoil piles grow, retreat ahead of the water |
| 17–20 | 49.63–59.01 / 1488–1770 | "And in 1971, London Bridge reopened … the world's attention." | approved Reopening scene | approved | ✅ | **unchanged**; entered by a **matched cross-dissolve** (same camera position), loop exit by cross-dissolve to the opening image |

## Required assets (v2)
granite block (bevelled, colour-varied, chalk-numbered) · 1960s cargo ship (lofted hull, sheer, boot-topping, bulwark
railings, hatches/holds, king-posts + derricks + rigging, bridge house with windows, funnel, lifeboats, portholes) · quay
crane (lattice jib, portal, cab, hook block, slings) · 1960s flatbed truck (hood, fenders, grille, lamps, glass, dual rear
wheels, stake bed, chains) · tracked excavator (track shoes, rollers, sprocket/idler, slewing house, cab glass, counterweight,
boom/stick/bucket with hydraulic cylinders, teeth) · truck crane (lattice boom, outriggers) · mixer truck · water shading
(river, ocean, canal) with wakes · cheque + deed props.

## Transition plan (v2)
| boundary | type | window | match |
|---|---|---|---|
| hook → London | cross-dissolve | 344–368 | both cameras in the sky (hook rising, London descending) |
| London → sea | cross-dissolve | 972–996 | both cameras follow the departing ship from behind-left |
| sea → Arizona | cross-dissolve | 1052–1076 | ship's blocks → truck's blocks, both moving forward |
| Arizona → Reopening | matched cross-dissolve | 1481–1498 | works camera lands exactly on the Reopening opening camera |
| end → start (loop) | cross-dissolve | 1747–1770 | Reopening → the opening desert bridge image (frame 0) |
