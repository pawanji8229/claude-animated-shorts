# TwistFrame Character 2.0 (`src/char/tf2`)

The upgraded character system is a **separate, opt-in module**. The approved `odo5` character, the approved benchmark (`references/benchmarks/reopening_v2_approved`) and every finished production still render exactly as before, because nothing in `odo5`, `CardSprite`, `expr.ts` or any production was changed.

## Identity rules: enforced by construction, then verified
| Rule | Enforcement | Verification |
|---|---|---|
| No ears | No ear geometry exists. Hair under a hat is clipped inside the head ellipse; hats sit on top; nothing is drawn outside the sides of the head. | Structural rule, plus visual review of the contact sheets. |
| No head-body gap | The head pivots 30 px **inside** the torso overlap, and its rotation is clamped. | `checkFrame` requires an overlap of at least 70 px on every frame. |
| Stable head shape | The silhouette is a constant ellipse (150 × 143 px). Expressions move features, never the head. | Constant in `draw.ts`. |
| No limb stretching | Two-bone IK with fixed bone lengths; reach is clamped to 99.5 %. | `checkFrame` checks bone lengths to 0.5 px. |
| No floating or sliding feet | Gait is driven by distance. Planted feet are anchored in the world and pivot when the character turns. | `checkScript` measures world slide during stance (all lab walks: 0–0.4 cm). |
| No flicker | Every face channel is continuous: no shape switching. Everything is deterministic from `(frame, seed)`. | Flicker scan plus consecutive-frame review of the lab reel. |

## Architecture (one responsibility per file)
| # | Responsibility | File |
|---|---|---|
| 1 | Character appearance and geometry (renderer, glow mask) | `draw.ts` |
| 2 | Facial feature controller (continuous rig incl. the comedic `wobble` mouth; blending, clamping) | `face.ts` |
| 3 | Eye and eyebrow controller: gaze, saccades, blinks | `face.ts`, `idle.ts` (blink, saccade), `draw.ts` (eyes, brows on the face shell) |
| 4 | Mouth and lip-sync (visemes from ASR word timings) | `lipsync.ts`, mouth in `draw.ts` |
| 5 | Emotion engine (30 emotions, intensity 0–5, blending; face, body and gesture) | `emotion.ts` |
| 6 | Body pose controller and solver (3D skeleton, IK, constraints) | `body.ts`, `rig.ts` |
| 7 | Walking and locomotion (15 gait styles, run, jump) | `locomotion.ts` |
| 8 | Hand and finger controller (curl per finger, ripple blends) | `hands.ts` |
| 9 | Head movement controller (nod, shake, tilt, quick turn, over the shoulder, and more) | `head.ts` |
| 10 | Idle animation (breathing, weight shift, micro motion) | `idle.ts` |
| 11 | Object interaction (reach with lean/bend, grip point, world to body) | `interact.ts` |
| 12 | Animation blending (layered arm/hand blends, envelopes, emotion cross-fades) | `gestures.ts`, `planner.ts` |
| 13 | Narration timing integration | `lipsync.ts` (words), `Script.actions` (frames) |
| 14 | Character-action planner (purposeful actions; layer priorities) | `planner.ts` |
| 15 | Validation and diagnostics | `validate.ts`, `scripts/check-tf2.ts` |
| — | 3D film integration (lit card, glow, halo, hand world positions) | `Toon2.tsx` |
| — | Test scenes | `lab/CharLab.tsx` (`TF2Sheet`, `TF2Motion`), `lab/Stage3D.tsx` (`TF2Stage3D`) |

### The 3D skeleton on a 2D card
The character is still a brush-inked card, but its joints live in a 3D body space. They are projected with the character's **yaw relative to the camera**. That one model gives front, three-quarter, profile and back views, turning while walking, walking backwards and looking over the shoulder.

Facial features sit on a curved *face shell*. They slide across the head and shrink to nothing at the edge instead of popping.

### Layer priorities (in `planner.ts`)
| Part | Lowest | | | Highest |
|---|---|---|---|---|
| Legs / root | stand + idle | locomotion | jump / sit / kneel / bend / push | |
| Spine | emotion posture + breathing | locomotion lean | action lean (reach, bend, push) | |
| Arms | rest + gait swing | emotion gesture (only while standing) | explicit gesture | interaction (reach / hold) |
| Head | emotion bias + idle | head moves | look-at (eyes lead, head follows, body twists beyond about 0.9 rad) | |
| Face | emotion blend | speech (mouth only) | blink (lids only) | |

## Using it in a production
```ts
import { evaluate, type Script } from "../../char/tf2";
import { Toon2 } from "../../char/tf2/Toon2";
const hero: Script = { id: "hero", seed: 7, costume: HERO, start: [0, 0], facing: Math.PI / 2,
  actions: [
    { kind: "walk", f0: 30, f1: 110, to: [2, 0], style: "confident" },          // walks only because the story needs it
    { kind: "look", f0: 115, f1: 170, at: [3, 1, 0] },                          // looks at the train
    { kind: "gesture", f0: 120, f1: 165, g: "point", dir: [1, 0.1, 0.3] },
    { kind: "speak", f0: 180, f1: 260, words },                                  // words = analysis.json asr_words
  ],
  emotions: [{ f: 0, mix: [{ e: "curiosity", level: 2 }] }, { f: 118, mix: [{ e: "shock", level: 4 }], ease: 3 }],
};
// in the world: const fr = evaluate(hero, f, cam.pos); <Toon2 p={{ fr, costume: HERO, t: f }} cam={cam.pos} hi={hi} />
```

**Emotions:**
- **The 30:** happiness, excitement, curiosity, confusion, disbelief, shock, fear, nervousness, embarrassment, frustration, anger, sadness, disappointment, suspicion, sarcasm, confidence, pride, boredom, sleepiness, surprise, awkwardness, relief, determination, concentration, amusement, disgust, uncertainty, excitedFear, confusedDisbelief, cringe.
- **Intensity:** levels 0–5, fractional allowed. Cartoon extras (sweat, blush, tears, anger vein, gloom) appear only from about level 3.5.
- **Blending:** `mix: [{ e, level, w }]`. The `BLENDS` table holds the combinations from the brief.

**Gaits:** normal, slow, fast, confident, nervous, tired, hesitant, sneaky, angry, excited, sad, curious, jog, run and sprint. Any of them can be walked backwards (`backwards: true`).

**Gestures:** point, wave, clap, shrug, facepalm, thumbsUp, thumbsDown, palmsUp, handOnHip, handsOnHips, armsCrossed, handsTogether, chinThink, chinRest, fidget, rubNeck, coverMouth, excitedFists, hugSelf, handOnChest, pushAway, scratchHead, count (1–5), behindBack, spread, handsUp, handsUpSmall and fists.

**Head moves:** nod, strongNod, shake, tilt, doubleTilt, slowTurn, quickTurn, overShoulder, confused, suspicious, lower, raise, lookUp and lookDown.

**Hands:** relaxed, open, flat, fist, point, thumbsUp, thumbsDown, palmUp, grip, pinch, wave, claw, and one to five.

## Testing
```
npx tsx scripts/test-tf2.ts                         # 29 unit + integration tests (exit 1 on failure)
npx tsx scripts/check-tf2.ts                        # geometric diagnostics over the whole lab reel (exit 1 on failure)
npx remotion render src/index.ts TF2Sheet ...       # contact-sheet pages (emotions L4/L5, ladders, blends, hands, turns, gestures)
npx remotion render src/index.ts TF2Motion ...      # motion reel (walks, runs, jumps, gestures, head, interaction, dialogue, ...)
npx remotion render src/index.ts TF2Stage3D ...     # lit 3D card + glow next to the approved odo5 card
npx remotion render src/index.ts TF2Compare ...     # approved odo5 vs Character 2.0 (expressions + walk cycle)
npx remotion render src/index.ts TF2PerfOld|TF2PerfNew ...   # performance benchmark (12 animated characters, time each)
```

See also `QC_REPORT.md` (tests, performance, comparison, limitations), `BASELINE_HASHES.md` (the approved files are untouched) and `DIAGNOSTICS.txt`.
