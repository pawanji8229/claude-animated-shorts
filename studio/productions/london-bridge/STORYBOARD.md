# Storyboard — ONE continuous take, 1771 frames (59.01 s) @ 30 fps, 9:16

## The connected world (why there are no cuts)
The whole film is one camera move over a single, connected, stylised **"journey world"** built along the −z axis,
like a giant miniature diorama of the route the bridge travelled:

```
 z:   +10 ........ 0 ........ −70 ............................................ −230 ........ −300
      [ ARIZONA DESERT + Lake Havasu site ] [ PACIFIC strip ][ PANAMA CANAL locks ][ ATLANTIC ][ LONDON: Thames, old bridge, docks ]
```

- The hook (0–10 s) opens in the desert at the finished bridge with no river.
- "You see…" (10 s) the camera cranes up and **flies continuously** along the world (no teleport; the route is
  compressed in scale, with atmospheric haze and a whoosh) to London.
- The story then **travels back** with the stones: London docks → ship → ocean → Panama locks → desert, so the
  camera ends where it began (bookend), still in the same take.
- Lighting is continuous along the path: cool foggy London dusk → open-sea blue hour → warm Panama haze → Arizona
  golden hour, blended by position (no instant changes).

## Characters (all original, approved v5 style: glowing round head overlapping a pill torso, brush outlines,
meme-awkward faces, consistent costumes)
- **Hal Brightwater** — the businessman: cream wide-brim hat, tan 1960s suit, brown skinny tie, white shirt,
  pencil moustache, salesman grin that slides into cringe. Present in every act.
- **Crew** (from Act 3): hard hats + overalls, 3 colour variants; same rig, different costumes.
- **London clerk** (Act 2, cameo): bowler hat, round glasses, umbrella.

## Beat sheet (frames inclusive; every narration beat has a visual action)
| frames | time | narration | picture (continuous camera) | key sounds |
|---|---|---|---|---|
| 0–53 | 0.0–1.8 | "In 1968," | Low dolly over cracked desert sand at golden hour toward a huge stone bridge silhouette; heat shimmer, dust motes; a tumbleweed rolls through foreground | desert wind bed, tumbleweed rustle, distant hawk |
| 54–155 | 1.8–5.2 | "a businessman bought an entire bridge from London" | Hal strolls in on the sand, stops, sweeps his arm up "ta-da" at the bridge, smug grin, pats a fat wallet | sand footsteps (synced to contacts), fabric swish on the gesture, wallet pat, coin clinks |
| 156–225 | 5.2–7.5 | "and shipped it to the middle of the desert." | Camera keeps rising and pulling back to reveal the whole five-arch bridge alone in an empty desert, saguaros, mesas | wide wind swell, gentle whoosh on the reveal, far hawk |
| 226–309 | 7.5–10.3 | "But there wasn't even a river waiting for it." | Camera drifts down under the arch: dry cracked riverbed. Hal leans over the parapet, looks down, freeze → cringe (squint, yikes grin, sweat); a tumbleweed rolls under the arch; a pebble drops and clacks on dry ground | pebble drop + clack, tumbleweed rustle, cartoon "gulp", wind |
| 310–452 | 10.3–15.1 | "You see, London was replacing its old bridge, and an American businessman" | Camera cranes up into the sky and flies continuously along the journey world (desert → sea → canal → sea) and descends into foggy London dusk: the old bridge over the Thames with a newer bridge under construction beside it | big whoosh + wind rush, sea pass-by, then Big-ben-like (original) distant chime, river lapping, gulls, city murmur |
| 453–627 | 15.1–20.9 | "was building a new city in Arizona. / But he needed something that would make people actually want to visit." | On the London embankment Hal unrolls a blueprint of an empty desert town; he mimes "nobody comes" with a yawn; looks up, sees the old bridge, lightbulb-eyes moment | paper unroll/rustle, yawn, fabric, "ding" of the idea (soft), river |
| 628–773 | 20.9–25.8 | "So he spent 2.46 million dollars buying London Bridge." | He signs a giant cheque on a lectern held by the London clerk; a crate of money is handed over; clerk tips bowler hat | pen scratch, stamp thunk, cash register-like ring (synthesised), coins |
| 774–920 | 25.8–30.7 | "Workers carefully numbered…took the bridge apart," | Camera dollies along the dismantling site: workers chalk numbers onto granite blocks (painted digits on the stone props are in-world markings), a crane lifts blocks | chalk scratches, hammer/chisel taps, crane winch + chain, stone thuds |
| 921–1070 | 30.7–35.7 | "and loaded the stones onto ships. / Across the ocean, through the Panama Canal," | A cargo ship loaded with numbered blocks departs; camera follows it out to sea, then through canal lock gates that open | ship horn, waves, hull creak, lock gate motor + water rush |
| 1071–1138 | 35.7–37.9 | "and finally arrived in Arizona." | Ship → trucks: the blocks roll across the desert to the site where we began | truck engine, gravel, brakes hiss |
| 1139–1272 | 37.9–42.4 | "Then construction crews rebuilt the bridge around a modern concrete structure." | Time-lapse feel inside the take: concrete core rises, granite blocks slot on, scaffolding comes down | concrete mixer, block thuds, wrench ratchets, scaffold clatter |
| 1273–1399 | 42.4–46.6 | "But there was still one problem. / There was no river." | Same framing as the hook (callback); Hal under the dry arch, cringe face returns | wind, tumbleweed, cartoon gulp |
| 1400–1488 | 46.6–49.6 | "So they dug an entire channel underneath it." | Excavators dig; water rushes in under the arches and fills the channel | excavator engine + bucket scrape, water rush, splash |
| 1489–1637 | 49.6–54.6 | "And in 1971, London Bridge reopened in the Arizona desert." | Opening day: ribbon, crowd, boats on the new channel, balloons, flash bulbs | crowd cheer, applause, brass-band-like stab (original), camera flashes |
| 1638–1770 | 54.6–59.0 | "Because he wasn't just buying a bridge. He was buying the world's attention." | Camera rises over the crowd; the frame fills with tourists, cameras and flashes pointed at Hal, who gives his awkward thumbs-up; final rise to the whole glowing bridge at dusk | crowd swell, shutter clicks, music resolve |

## Batch plan (rendering)
| batch | frames | content |
|---|---|---|
| **A (this review)** | **0–299** | desert hook (approval test) |
| B | 300–629 | flight to London + embankment |
| C | 630–1070 | cheque, dismantling, ship, canal |
| D | 1071–1488 | arrival, rebuild, no-river callback, digging |
| E | 1489–1770 | reopening + finale |
Each batch is rendered from the same Remotion composition with `--frames=a-b`, so characters, lights and camera
are identical; batches are concatenated losslessly (same codec settings) and the master audio is muxed once.
