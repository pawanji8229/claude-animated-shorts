# London Bridge v2 — narration-to-visual coverage and repair list

Companion to `AUDIT_COVERAGE.md` (the Stage A audit of the rejected v1). Every "v2 shows" entry below was checked on
rendered frames (540×960 stills and the Stage D motion clips in `render/motion/`), not just in code. Frames at 30 fps.

## Coverage, phrase by phrase (v2)

| # | frames | narration | v2 shows | assets | transition | status |
|---|---|---|---|---|---|---|
| 1 | 0–46 | "In 1968," | desert bridge establishing; frame 0 is a clean image (no veil) | approved hook | loop dissolve in from the end | ✅ |
| 2–4 | 54–288 | "a businessman bought … no river waiting for it." | approved hook, unchanged | approved | — | ✅ unchanged |
| 5 | 310–436 | "London was replacing its old bridge…" | crane up into the sky **cross-dissolves** (344–368) into the descending London aerial: old bridge, new-bridge works, ship at the quay; Hal walks in | London set | cross-dissolve | ✅ |
| 6–7 | 452–609 | "building a new city … want to visit." | blueprint, yawn, lightbulb (kept) | — | — | ✅ |
| 8 | 628–756 | "spent 2.46 million dollars buying London Bridge" | seller walks in with the deed; Hal writes in a cheque book (pen); tears the cheque, hands it across; **push-in on the cheque: "$2,460,000.00", 1968**; seller's eyes widen; pockets it; handshake; deed with red seal handed to Hal, who raises it | cheque + deed props, book | — | ✅ |
| 9 | 773–910 | "Workers carefully numbered … took the bridge apart," | 4 workers walk in; close-up chalking numbers on bevelled granite blocks (1172, 1224…); reveal of the old bridge with scaffold, its parapet/deck visibly lowered (776–852); numbered blocks stacked on the quay | granite blocks, scaffold, tower crane | camera move | ✅ |
| 10 | 921–969 | "and loaded the stones onto ships." | full loading cycle 790–976 (see below); a flatbed truck brings 6 more numbered blocks along the quay (788–850); a second stack of 15 waits; both holds carry cargo; ship casts off and departs at 958 | quay crane, cargo ship, Truck5, mooring lines | — | ✅ |
| 11 | 984–1060 | "Across the ocean, through the Panama Canal," | **cross-dissolve 972–996** following the ship; ocean with normal-mapped ripples, depth colour, bow wave, V-wake and prop wash; **dissolve 1010–1026** into a working lock: the ship sits deep in the chamber behind closed lower gates, culverts boil, the water and ship rise ~2.8 m (1020–1048) above the low downstream pool, upper mitre gates swing open (1048–1062) and the ship moves out; mules on rails, control houses, rainforest | ship, ocean shader, lock | cross-dissolves | ✅ |
| 12 | 1070–1123 | "and finally arrived in Arizona." | **cross-dissolve 1052–1076**: three 1960s flatbed trucks loaded with numbered blocks are already on the road as the desert appears, drive in with soft dust and park | Truck5 | cross-dissolve | ✅ (repaired again after Stage D) |
| 13 | 1139–1255 | "rebuilt the bridge around a modern concrete structure." | the dark concrete core stands bare; truck crane (lattice boom, outriggers) lifts blocks from the stack and sets them into the facing, which rises over the core; mixer truck turning; crew at work | TruckCrane, MixerTruck | — | ✅ |
| 14 | 1272–1331 | "But there was still one problem." | crew walk off (1252–1302); Hal **walks in** (1236–1268) proud; scaffold on the outer spans stays standing (struck at 1340 while the camera is tight on Hal, not in shot) | — | — | ✅ |
| 15 | 1348–1382 | "There was no river." | Hal cringes under the dry arch | — | — | ✅ |
| 16 | 1399–1473 | "So they dug an entire channel underneath it." | Hal slinks out (facing his walking direction); two tracked excavators drive in along the channel, dig (spoil piles grow), climb out up the bank; water floods in | Excavator5 | — | ✅ |
| 17–20 | 1488–1770 | "And in 1971 … the world's attention." | approved Reopening, **unchanged**; entered by a matched cross-dissolve (1481–1499); the loop exits by cross-dissolving to frame 0 (1747–1770) | approved | cross-dissolves | ✅ |

## The 8 loading steps (frames)

| step | frames | what is on screen |
|---|---|---|
| 1 prepare | 790–836 | loaders stand at the numbered stack on the quay; the ship is moored with bow/stern lines, hold 1 open |
| 2 machinery positions | 790–836 | quay crane slews over the stack |
| 3 secure | 836–866 | hook block lowered; four slings to the block corners |
| 4 lift | 866–892 | block 1263 lifted clear of the stack |
| 5 travel | 892–936 | crane slews toward the ship; the block rotates to the hold's alignment |
| 6 lower into hold | 924–946 | camera rises over the quay wall and looks into the open hold as the block is set down beside the cargo already there |
| 7 workers finish | 944–962 | slings released, deck hand works and waves; mooring lines hauled in (948–962); hook rises |
| 8 ship departs | 952–996 | horn, engine; the ship pulls away with a growing foam wake; dissolve to the ocean |

## Timestamped list of repaired scenes (v1 → v2)

| frames | v1 defect | repair | verified on |
|---|---|---|---|
| 0–14, 1747–1770 | loop through an opaque dust curtain | cross-dissolve from the Reopening to a frozen frame 0 | `loop_end`, `loop_start` clips |
| 344–368 | opaque cloud curtain | cross-dissolve, both cameras in the sky | `t1_hook_to_london` clip |
| 600–790 | lectern slides in; unreadable signing; money crate pops in | the seller walks in; cheque book and pen; legible $2,460,000.00 cheque close-up; deed and handshake; no prop pops | `purchase` clip |
| 740–852 | workers pop in; plain boxes; no dismantling | workers walk in; bevelled, speckled, chalk-numbered granite; close-up chalking; bridge parapet lowered behind scaffold | `dismantle_loading_departure` clip |
| 790–976 | block appears on hook; box ship; stick boom | lattice quay crane with slings; lofted cargo ship (holds, derricks, rigging, superstructure, funnel, lifeboats); full 8-step cycle; camera into the hold | `dismantle_loading_departure` clip + stills 930–954 |
| 972–996 | opaque sea fog | cross-dissolve following the ship | `dismantle_loading_departure` clip |
| 985–1063 | flat vertex-coloured sea, flickering spray, slab lock | ripple-normal ocean with stable wake/foam, deterministic spray; detailed lock | `sea_lock_to_arizona` clip |
| 1010–1064 | static lock background | working lock: filling, ship rises, upper gates open | final MP4 + stills 1004–1060 |
| 1238–1340 | scaffold sinks into the ground | scaffold only on outer spans, stays upright, struck off-screen at 1340 | final MP4 + stills 1268–1484 |
| 788–946 | cargo operation looked thin | quay truck delivery, second stack, hold-2 cargo | final MP4 |
| 1052–1076 | opaque heat haze; trucks enter late | cross-dissolve; trucks already on the road during the dissolve | stills 1064–1110 (after the Stage D fix) |
| 1064–1290 | box trucks; trucks vanish at 1160; crane/scaffold/mixer/crew pop in at 1120 | detailed trucks drive in and park; site present from the start; truck crane cycles; mixer detailed | `trucks_crane` clip |
| 1236–1302 | Hal pops in at 1262; crew vanish at 1285 | Hal walks in; crew walk off | `hal_crew_exit` clip |
| 1392–1480 | box excavators pop in | tracked excavators drive in, dig, climb out | `excavators_to_reopening` clip |
| 1469–1487 | opaque river spray | matched cross-dissolve onto the Reopening camera | `excavators_to_reopening` clip |

## Known limitations (not hidden)

- **One crane cycle.** Only block 1263 is lifted end to end. The other blocks are shown already stacked, delivered by
  truck, or already in the holds.
- **Scaffold struck off-screen.** We never see the poles being taken down: the camera is on Hal when it happens.
- **Lock is condensed.** The lift takes about 1 s and the ship passes through a single chamber. The mules sit beside
  the ship and do not haul it.
- **No physics.** All machinery is keyframed kinematics, not a physics simulation.
- **Synthesized sound.** All sound effects are synthesized originals, not recordings.
