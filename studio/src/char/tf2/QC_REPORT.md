# TwistFrame Character 2.0: QC report

**Branch:** `claude/cinematic-animation-setup-tb5a49`. Module: `studio/src/char/tf2/` (see its README).

**Safety:** the upgrade is a new, opt-in module.
- `odo5.ts`, `CardSprite.tsx`, `expr.ts`, every production and the approved benchmark are byte-for-byte unchanged (`git diff` checked), so finished films and the benchmark reproduce exactly.
- No new dependencies.
- The rig is deterministic from (frame, seed), so it is safe for the parallel cloud renders.

## What was built (Parts 1–17)
- **Identity kept:**
  - Same 600×1000 card, size, round glowing head over a pill torso, brush ink, goggles, silver curls and costume system.
  - No ears: no ear geometry exists, hair stays inside the head, hats sit on top.
  - No head-body gap: the head pivots inside the torso overlap and its rotation is clamped.
- **3D skeleton on the card:** joints live in 3D body space and are projected with yaw relative to the camera. That gives front, three-quarter, profile and back views, turning while walking, walking backwards and looking over the shoulder.
- **Face:** fully continuous channels, so nothing switches shape mid-blend.
  - **Eyes:** independent per eye, with upper lid, cheek-raised lower lid (crescent happy eyes), pupil size, sclera scale and catch-light sparkle.
  - **Brows:** height, inner, outer and arch, per brow.
  - **Mouth:** a parametric curve with width, jaw, corner lift, asymmetry, pucker, teeth, clench, upper lip and tongue.
  - **Extras:** blush, sweat, tears, anger vein, gloom.
  - **Turns:** features slide across a curved face shell and fade at the edge.
- **Emotion engine:** 30 emotions, each a coordinated face + body (lean, slump, shoulders, head bias, chest, tension, idle energy, blink rate, gaze aversion, knee bend) + gesture.
  - Intensity runs 0–5 on a non-linear scale; cartoon extras appear only from about 3.5.
  - Weighted blends; the 8 blends from the brief are included.
- **Body:** IK arms and legs with fixed bone lengths and natural elbow and knee poles. Pelvis drop and twist, spine lean, bend, twist, slump, chest and squash, plus shoulder shrugs.
- **Locomotion:** driven by distance, so planted feet never slide.
  - **Gaits (15):** normal, slow, fast, confident, nervous, tired, hesitant, sneaky, angry, excited, sad, curious, jog, run, sprint.
  - **Movement modifiers:** backwards for any gait; turning while walking, with feet anchored in the world so they pivot instead of sliding; natural stops.
  - **Other actions:** jump (anticipation, launch, tuck, landing absorb), hops, stumble and recover, sit and stand, kneel, bend.
- **Hands:** four fingers and a thumb, each with its own curl, plus spread, thumb abduction and palm facing. 17 shapes: relaxed, open, flat, fist, point, thumbs up and down, palm up, grip, pinch, wave, claw, and one to five. Opening and closing ripples through the fingers.
- **Gestures (28):** anticipation, action, a living hold and an eased release.
- **Head moves (14).**
- **Idle:** breathing, weight shift, micro head motion, saccades. Blinks vary in interval and duration, with occasional double blinks and slow or fast blinking by mood.
- **Lip-sync:** visemes from the pipeline's `asr_words` with coarticulation. The mouth moves only inside `speak` actions.
- **Interaction:** reach with lean and bend when needed, clamped so arms never stretch; a grip point for held props; push and pull with a staggered stance.
- **Planner:** purposeful actions with clear layer priorities per body part. A character with nothing to do stands still with subtle idle motion, and walking happens only inside a walk action.
- **3D integration:** `Toon2` uses the same lit `CardSprite`, glow mask and halo as the approved characters. `handWorld2` was verified to land exactly on the drawn hand.

## Tests run (Part 18)
| Test | Result |
|---|---|
| Geometric diagnostics over the whole lab reel (`scripts/check-tf2.ts`, 32 segments, 7,335 frames). Covers the head-body overlap (at least 70 px), bone lengths (to 0.5 px), floor penetration and NaN. | All pass |
| World foot slide while planted, straight walks (12 styles + backwards) | 0.00–0.37 cm |
| World foot slide while planted, turning while walking | 0.17 cm (was 9.2 cm before anchoring) |
| World foot slide while planted, stumble | 0.15 cm |
| World foot slide while planted, run, jog and sprint | ≤ 0.3 cm |
| One-frame spikes across all 7,335 frames of the reel (a frame unlike both neighbours, excluding intended cuts between test segments) | 0 |
| Largest frame-to-frame change outside cuts | 3.3 / 255 (ordinary fast motion) |
| Contact sheets, inspected by eye: 30 emotions at levels 4 and 5, intensity ladders (6 emotions × 0–5), blends, hands, 12-angle turn sweep, 15 gestures | See `sheet_*.png` |
| Motion reel, inspected by eye, including consecutive-frame strips of the walk cycle, sprint, lip-sync and an emotion transition | See `tf2_motion.mp4` |
| 3D lit-card test next to the approved odo5 card | See `tf2_stage3d.mp4` |

## Defects found by inspection and fixed
1. **Facial features too small** for the big head, so emotions read alike. Eyes, brows and mouth were enlarged, expression ranges strengthened, and the side-eye now reaches the corner.
2. **Happy eyes didn't form crescents.** Added a curved lower lid that bulges up with the cheeks, and stronger cheek raise for happiness, pride, amusement and relief.
3. **Turning while walking slid the feet (9 cm).** Planted feet are now anchored in the world and pivot (0.17 cm).
4. **The stumble's catch step was flagged as sliding.** It is now marked as a deliberate step and blends back into the gait.
5. **A far eye became a thin sliver** in three-quarter views. Far-side features now fade and shrink out earlier.
6. **The walking arm swing could lock straight.** The swing is clamped to keep a soft elbow.
7. **The push target was fixed in the world** while the character moved. It is now relative to the body, and the lab crate is drawn at the hands.
8. **The sit test seat was taller than the character's hips.** The test now uses a seat the character can sit on.
9. **The hands were too small to read the fingers.** Hands enlarged by 1.32×.

## Honest limitations
- **Not yet used in a film.** Productions opt in per film; the approved `odo5` path remains the default until you choose to switch.
- **Goggles and brows:** on the hero costume, very high brows (shock, surprise) overlap the goggle lenses. This matches the approved hero design, but brows are a little less legible at level 5.
- **Front-view gestures:** arms reaching straight toward the camera foreshorten, as on any card character. Gestures are authored to read sideways.
- **Running:** on the light frames of the lab test, the run and sprint cycles still clamp the knee near full extension at the very end of the stride (counted as "leg overreach (clamped)" in the diagnostics). Length is preserved, but the leg looks straight for a frame or two.
- **Hats and props:** hats use a continuous front design that narrows with yaw, with no separate side-view hat drawing. In-card held tools from odo5 (hammer, cup, and so on) are not ported; props are held in 3D via `handWorld2`.
- **The lab is a 2D stage.** Scale is approximate, and the labels on the test pages are for testing only. No film output has text.
