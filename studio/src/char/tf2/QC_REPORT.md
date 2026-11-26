# TwistFrame Character 2.0: QC, test and performance report

**Branches:**
- `experimental/character-evolution-2.0` (isolated experimental branch)
- mirrored on the designated development branch `claude/cinematic-animation-setup-tb5a49`

No approved production branch and no `main` was touched. Module: `studio/src/char/tf2/` (API and architecture in `README.md`).

## Safe implementation (Part 20)
| Step | Done |
|---|---|
| Inspect the current architecture | `odo5.ts` (Canvas2D card, parametric pose, side-view walk keys, mitten hands), `expr.ts` (discrete-shape face library), `actors.ts` (walker, 2D arm aim), `PoToon`/`CardSprite` (lit billboard plus glow mask), `centennial/Set` (lighting/post). |
| Back up the approved character system | `approved-character-backup.zip`: the baseline-commit versions of odo3/4/5, CardSprite, crowdLife, expr, PoToon chars, Ink, Workshop, the original MAKE VIDEO skill and the approved benchmark. |
| Isolated experimental branch | `experimental/character-evolution-2.0`. |
| Baseline hashes | `BASELINE_HASHES.md`: 14 approved files plus the benchmark folder, all byte-identical after the upgrade. |
| Design, then implement incrementally | 15 single-responsibility modules (see `README.md`), built and tested module by module. |
| Unit and integration tests | `scripts/test-tf2.ts`: **29 / 29 pass**. |
| Visual test outputs | Contact sheets (7 pages), motion reel (32 segments, 4 min), 3D lit-card clip, comparison sheets. |
| Compare against the approved original | `compare_*.png` (8 expression pairs + walk cycle, side by side). |
| Measure rendering performance | See the performance table below. |
| Existing scenes stay compatible | The approved benchmark frame renders **pixel-identical** (max difference 0) from the baseline commit and from the TF2 branch. |
| Document the API | `README.md`. |
| Must not touch | The approved character, finished videos, approved production branches, the MAKE VIDEO skill, the camera system, global settings and the brother's projects: none were modified. No full video render was started and no assets were published. |

**Correction made during this work:** an early commit appended a short "Character 2.0" note to the MAKE VIDEO skill file before Part 20 arrived. Part 20 forbids modifying that skill without authorization, so the note was **reverted**. The file is byte-identical to the baseline again (see `BASELINE_HASHES.md`).

## Automated tests
- **Unit and integration tests:** `npx tsx scripts/test-tf2.ts` — 29 passed, 0 failed.
  - IK bone lengths: error 8e-14 px over 500 random targets, including unreachable ones.
  - Head over torso: at least 85 px under every extreme head and spine combination (requirement 70).
  - All face channels are clamped, and face blends are continuous (largest step 0.0145 per 1 % of blend).
  - Exactly 30 emotions, each with face, body, gesture and description. Intensity is monotonic, and cartoon extras stay off at level 2 and appear at level 5. Blends lie between their parts, and all 8 blends exist.
  - All 30 faces are measurably distinct (minimum pairwise distance 0.33).
  - The stance foot moves back exactly as far as the body moves forward (slip under 0.01 px). 15 gaits, and running has a flight phase.
  - Blinks are deterministic and occasional; saccades are small.
  - The mouth is closed in pauses and closes for M/B/P.
  - Head moves are bounded; every emotion gesture has a pose.
  - An idle character never drifts in 10 s; evaluation is deterministic.
  - Walk actions arrive exactly at their targets; a walk with turns slides 0.17 cm.
- **Lab-reel diagnostics:** `npx tsx scripts/check-tf2.ts` — every segment passes every hard check (`DIAGNOSTICS.txt`).
  - Covers neck gap, bone lengths, floor penetration and NaN on every frame.
  - World foot slide while planted: straight walks 0.0–0.4 cm, turning while walking 0.17 cm, stumble 0.15 cm, runs at most 0.3 cm.
- **Temporal check of the full reel:** 7,335 frames, 0 one-frame spikes. The largest frame-to-frame change outside the intended cuts between test segments is 3.3 / 255.

## Performance (software WebGL, this cloud machine)
| Measurement | Approved odo5 | Character 2.0 |
|---|---|---|
| Render 150 frames × 12 animated characters (1080×1920), run 1 | 81.5 s | **65.0 s** |
| Render 150 frames × 12 animated characters (1080×1920), run 2 | 84.2 s | **65.9 s** |
| Planner + solver per character per frame (node) | — | **0.086 ms** |

Character 2.0 draws about 20 % faster: its shapes are simpler, and it has fewer large shadow paths than odo5's layered side-view drawing. The planner cost is negligible. No new dependencies were added, the module is deterministic, and it runs in the existing cloud workflow unchanged.

## Comparison with the approved original (`compare_*.png`)
- **Same identity:** card size, round glowing head over the pill torso, goggles, silver curls, teal shirt with collar and buttons, mustard belt, brush ink. No ears and no neck gap.
- **Better:**
  - The face is larger and more legible.
  - Eyes have independent lids: crescent smiling eyes, squeezes, side-eye to the corner.
  - Brows are fuller, and the mouth is a continuous shape (no snapping between mouth types).
  - Emotions drive posture and gestures, not just the face.
  - The body turns through every angle, and the arms are real IK arms with elbows.
  - Hands have five digits.
  - The walk is driven by distance with world-planted feet, arm swing with elbow follow-through, heel-to-toe contacts and a passing-pose lift.
- **Found by comparison and fixed:**
  - In full profile the new face nearly vanished. It now follows the approved side view's convention: a readable eye and mouth on the facing side.
  - The walking arm swing was too small and is now on a par with the approved walk.
  - The approved character's comedic wobbly mouth was missing. It was added for confusion, nervousness, embarrassment and uncertainty.
  - The cringe grin was enlarged, and the rest hands were reduced.

## Defects found by visual inspection and fixed (all rounds)
| # | Found | Fix |
|---|---|---|
| 1 | Features too small; emotions read alike | Enlarged eyes, brows and mouth; stronger ranges |
| 2 | Happy eyes not crescent-shaped | Curved lower lid lifted by the cheeks |
| 3 | Turning while walking slid the feet 9 cm | Planted feet anchored in the world (0.17 cm) |
| 4 | Stumble catch step flagged as sliding | Marked as a step; blends back into the gait |
| 5 | Far eye became a sliver in three-quarter views | Far-side features fade earlier |
| 6 | Arm swing could lock straight | Soft-elbow clamp |
| 7 | Push target fixed in the world | Target relative to the body; crate drawn at the hands |
| 8 | Seat taller than the hips | Correct test seat |
| 9 | Fingers unreadable | Larger hands (then trimmed after comparison) |
| 10 | Profile face nearly empty | Profile convention for features |
| 11 | Arm swing too small versus approved | Swing amplitudes raised |
| 12 | Wobbly-mouth comedy missing | New continuous `wobble` mouth channel |

## Honest limitations
- **Not yet used in a film.** It is opt-in per production. odo5 stays the default until you choose to switch, and no full video render was started (Part 20).
- **Goggles and brows:** on the goggled hero, very high brows (shock, surprise) overlap the goggle lenses. This matches the approved design.
- **Gestures toward the camera** foreshorten, as on any card character. Gestures are authored to read sideways.
- **Run and sprint:** the knee reaches near full extension at the very end of the stride for a frame or two. Bone length is always preserved.
- **Hats and props:** hats use one continuous design that narrows with yaw. odo5's in-card tools (hammer, cup, and so on) are not ported; props are held in 3D through `handWorld2`.
- **The benchmark still:** the approved benchmark frame re-renders identically from before and after this upgrade. Both renders differ slightly from the stored still (2.6 % of pixels by more than 16 levels). That difference predates the upgrade and comes from earlier shared-code changes or the rendering environment, not from Character 2.0.
