# short3 — "The Office That Moved" storyboard

**Format.**
- 1564 frames = 52.11 s at 30 fps, 1080×1920.
- Original odo5 characters: earless, head overlapping the body, face glow, brush outlines.
- Original renderer: Remotion and three.js, Post, ink, the legacy render path.
- No captions. In-world signage only ("TELEPHONE CO.").

**Two connected sets, joined only by opacity dissolves.**
- **EXT, a 1930 city block.** Brick and limestone eight-storey office block, street, sidewalks, lampposts, telephone poles and wires, trees, a background skyline, workers' equipment.
- **INT, the switchboard floor inside that building.** Long switchboard, operators with headsets, desks, phones, filing cabinets, tall windows with the street outside. When the building moves, the view outside the windows creeps.

**World layout (EXT).** The street runs along x and the building faces the street (+z).
- Original footprint is centred at the origin.
- Move 1: slide back about 16 m (−z).
- Move 2: rotate 90° about the footprint centre.
- Move 3: slide about 30 m sideways (−x).
- The new headquarters footprint (stakes and rope, later steel columns) covers the original site.

## Beats (frames = narration phrase times)

| # | frames | narration | what we SEE (beginning → middle → end) | set / camera | sounds |
|---|---|---|---|---|---|
| 1 | 0–113 | "This is the story of an office building that moved while people worked inside." | INT: an operator (Ada) answers a call at the switchboard and plugs a cord. Behind her, the window view slides slowly. The camera drifts back along the switchboard, showing other operators working. | INT, slow dolly back | switchboard buzz, cord plug clicks, soft phone ring, room tone |
| 2 | 113–241 | "And the craziest part… most of them could barely tell it was moving." | Dissolve (113–135) to EXT. The whole building creeps on rollers while workers turn jacks; the camera rises along the facade past windows. In one window a clerk calmly sips coffee and the cup barely ripples; he notices nothing. | EXT, crane up along the facade | roller creak, jack ratchets, distant street, coffee clink |
| 3 | 259–433 | "You see, back in 1930, the Indiana Bell Telephone Company needed space for a bigger headquarters." | Clean dissolve back in time (241–259): the building stands at its original spot on a sunny 1930 street, with pedestrians and a tram bell in the distance. Hal-style executive Mr. Brightwater (bowler costume) walks onto the sidewalk, unrolls a blueprint of a much larger building and holds it up proudly. | EXT, street level, slow push | footsteps on stone, paper unroll, distant streetcar bell |
| 4 | 449–487 | "But… there was a problem." | He lowers the blueprint, looks from it to the building and cringes (freeze, squint, sweat). | EXT, push on him | soft "uh-oh" sting, synthesised and subtle |
| 5 | 501–630 | "An enormous building was standing exactly where they wanted to expand." | The camera cranes up to reveal workers' stakes and rope marking the new footprint on the ground. The rope runs straight into the old building's walls. | EXT, crane up and over | rope creak, wind |
| 6 | 648–695 | "So instead of demolishing it…" | A wrecking-ball crane rolls in along the street and its ball sways. Brightwater waves both arms ("no!"); the crane stops and backs away. | EXT, wide | crane engine, chain sway, brakes |
| 7 | 707–778 | "…engineers decided to move the whole thing." | An engineer (workerB with a hard hat) unrolls plans on a trestle and points from the building to the new spot. A lightbulb moment, and Brightwater's grin returns. | EXT, street level | paper, idea ding |
| 8 | 791–860 | "…with hundreds of employees still inside." | The camera tracks along the facade: every lit window has different people working (typing, phoning, filing, chatting), each independent. | EXT, lateral track | typewriters, phones, faint chatter (quiet) |
| 9 | 880–957 | "First, workers carefully supported the building…" | Workers carry and stack timber cribbing. Steel beams slide under the base, and rollers and screw jacks are set in a row. | EXT, low near the base | timber thuds, steel clank, footsteps |
| 10 | 971–1090 | "…then special moving equipment slowly shifted the enormous structure." | Workers push long bars on the screw jacks in turn, the rollers turn and the whole building creeps forward. Flexible hoses and cables trail from the base. | EXT, low, moving with the building | jack ratchets, roller creak, timber groan |
| 11 | 1108–1213 | "They moved it sideways, turned it ninety degrees, and moved it again." | A high aerial with time compressed by a sun and shadow sweep: the building slides back, rotates 90° on its pivot, then slides sideways into its new spot. Rollers and cribbing follow. | EXT, high aerial orbit | deep rumble, ratchets |
| 12 | 1230–1319 | "Meanwhile, employees continued answering telephone calls." | Dissolve (1213–1235) into INT: a row of operators plug cords and answer calls, and a clerk walks a memo past. Through the window, the street slides by slowly. | INT, dolly along the switchboard | rings, plugs, quiet voices |
| 13 | 1334–1447 | "And after the move was finished, the building stood in its new position." | Dissolve (1322–1340) to EXT, golden afternoon. The building rests on its new foundation and workers pull the last rollers out. The first steel columns of the new HQ rise on the old site. | EXT, wide, slow orbit | steel clang, roller drag |
| 14 | 1459–1515 | "…without the company having to shut down." | Employees cross the wooden gangway into the building; the lights are on. Brightwater stands at the door and tips his bowler. | EXT, street level | footsteps on planks, door, warm room tone |
| 15 | 1528–1563 | "…which is how all…" | Dissolve (1530–1563) into INT, back to exactly the opening shot of Ada at the switchboard. The loop is seamless and the narration's last words lead into the first. | INT = frame 0 | room tone continues; no sting at the seam |

## Rules applied

- Nobody pops in. Every worker, crane and pedestrian walks or drives in and out on screen. The building's position is continuous between beats.
  - **Exception:** the opacity dissolve at beat 3 goes back in time, from "moving" to "before". It is one clear dissolve; nothing else changes inside a shot.
- **Crowds** (window workers, operators, pedestrians) use `crowdLife` personas. Every person has an individual schedule, so nobody moves in sync with anyone else.
- **Sound** is event-driven from the same animation data and mixed narration-first: every word at least 15 dB above everything else in the speech band.
- **Loop:** the last 33 frames dissolve into the exact frame-0 shot, with loop-safe ambience and room tone.
