> **2026-11-06 update:** After Gemini wrote this report, all five source videos were uploaded and visually frame-sampled in ChatGPT, and their metadata/audio digital levels were verified. This file preserves the *original secondary report*, including outdated status phrases and unverified sound/rigging assertions. For corrected findings follow `OBSERVED_VIDEO_STYLE.md`, `VIDEO_MANIFEST.md`, and `MASTER_STYLE_BIBLE.md`.

# Gemini Reference Analysis — supplied by user

> STATUS: Secondary AI report, **not yet independently verified against source MP4s**. Five videos are represented below even though an earlier plan discussed seven. **[corrected]** There are five source videos; any later mention of "seven" is stale. Preserve original timestamps/claims as hypotheses and verify against frames and audio before using as facts. Style references must lead to ORIGINAL characters, stories, props and music, not copies of an existing channel.

## Cross-video visual language (Gemini's interpretations)

- **Characters**: simplified pill/bean-like heads, compact capsule torsos, thin cylindrical or card-like arms and legs, minimal eyes and brows, exaggerated silhouette and poses. Report claims `1.5:1 head-to-body ratio` but the definition is ambiguous; do NOT use as a calibrated measurement. Distinguish the upstream template's **2D camera-facing cards in a 3D world** from actual volumetric 3D character meshes. Choose after testing the output look.
- **World/objects**: low-to-medium-poly background geometry, clean bevels, a handful of carefully modeled high-detail hero props. Set dressing scales with scene context rather than random clutter.
- **Materials**: mostly smooth matte skin/clothing (`roughness ≈ 0.4–0.6` is a starting *test range*, not measured truth), metal and glass with stronger highlights, wood with restrained grain and variation. Avoid assuming shaders or specific rendering engine from footage.
- **Lighting**: primary motivated light + soft fill + occasional restrained rim light; deepen corners through ambient occlusion rather than crushed exposure. Lighting changes by story setting.
- **Animation**: readable silhouettes, carefully eased arm/head movement, short reaction beats, motion with visual cause and effect, eye and brow acting. Source inferred IK/rigging and `easeInOutCubic` without evidence: treat as candidate implementations.
- **Cameras**: vertical 9:16, cinematic establishing / mid / close framing, push-ins and tracking; focus on subject; lens equivalents are subjective approximations.
- **Editing**: immediate first-seconds hook, ~2.8–4 s average shots according to report, then vary shot length for tension and explanation. Align visual beats to narration; do not blindly copy any original shot sequence.
- **Sound**: focused narrator, scene-specific ambience, precise foreground SFX, varied dynamics, deliberate silence and music ducking. The report does not provide verified loudness measurements or genuine extracted audio, so do not claim it does.
- **Typography conflict**: Gemini describes bold white/yellow kinetic captions but the original upstream `SKILL.md` explicitly says **no captions**. **[corrected]** Frame sampling showed white captions with a dark outline (not yellow). Resolution in this repo: the `studio/` compositions expose a `captions` prop (default `true`, matching the reference *format*); the upstream bridge pipeline keeps its no-captions rule.

## Video-by-video notes (from Gemini; editorially reorganized)

### V01 — Inventor / nighttime workshop (38 s)
- **Characters**: pill-like heads, simplified expressions, geometric hair; small props and quiet acting.
- **Scene**: stools, tables, metal balls/plates, warm workshop/sepia; beveled hero props.
- **Lighting/colors**: tungsten cone, dark corners, amber highlight `#FFD700`, muted character blue `#2A52BE` (verify colors visually).
- **Camera/cuts**: close-to-medium 35 mm-like shots; timed push-ins, estimated ~3.5 s per shot; storyboard spans 0–03, 03–10, 10–18, 18–31, 31–38 seconds.
- **Audio**: narration over light room tone, metallic clanks and transition swishes; time notes at 0–10 and 20–30 seconds are estimates.
- **Transferable concept**: a single key light and tactile micro-SFX can make simple geometry cinematic.

### V02 — Neon arcade street (44 s)
- **Characters**: themed uniforms and simple proportion system; body sway in walk cycles.
- **Scene**: neon alley, detailed arcade machines, signs and counter surfaces.
- **Lighting/colors**: deep blue fill `#1A2B4C`, magenta `#FF007F`, cyan `#00FFFF`, warm window accents. Bright emissives need highlight control.
- **Camera/cuts**: low-angle wide tracking and corridor movement; estimated ~2.8 s/shot; time windows 0–02, 02–05, 05–10, 10–14, 14–26, 26–44 seconds.
- **Audio**: layered arcade machines, chimes, street sound, counter click; verify actual timings from source audio.
- **Transferable concept**: combine vivid emissive set dressing with darker ambient fill without losing silhouettes.

### V03 — Historical sailing ship and storm (64 s)
- **Characters**: simplified historical clothing and hats; balancing gestures responding to motion.
- **Scene**: detailed ship deck, rigging ropes, steering wheel, sea surface, rain and foam.
- **Lighting/colors**: moonlit blue `#2C4A6F`, amber lantern `#FFA500`, mahogany `#5C2C16`, restrained gold `#FFD700`.
- **Camera/cuts**: crane sweeps, low waterline drama, over-the-shoulder views; estimated ~4 seconds/shot; macro detail inserts.
- **Audio**: timber creaks, water, rainfall and pour sounds; timing claims must be source-audited.
- **Transferable concept**: world dynamics, environmental SFX and carefully framed movement sell scale without requiring photoreal meshes.

### V04 — Corporate isolation-room story (60 s)
- **Characters**: office attire, subtle expressions, slouched/rigid body language.
- **Scene**: cubicles, corridors, clocks, filing cabinets, fluorescent panels, plain rooms.
- **Lighting/colors**: clinical overhead `#F4F4F9`, institutional green `#8FB393`, muted gray-blue offices, dim desk light.
- **Camera/cuts**: corridor follow shots, slow revealing push-ins, orthographic graphic inserts; estimated ~3.2 seconds/shot.
- **Audio**: office bed, ticks, clicks and intentional silence; claimed timing segments need verification.
- **Transferable concept**: atmosphere can emerge from controlled repetition, emptiness and sound subtraction.

### V05 — Stylized Western-town explainer (60 s)
- **Characters**: simplified period silhouettes, hats and accessories.
- **Scene**: dusty street, wooden storefronts, saloon, clocks, weathered wood and leather finishes.
- **Lighting/colors**: sandy tans `#C2B280`, rust reds `#8B0000`, sky blue `#4A90E2`, warm interior / cool exterior contrast.
- **Camera/cuts**: dramatic low angles, restrained orbits, close-up insert shots; estimated ~3 seconds/shot.
- **Audio**: footsteps, saloon room tone, clock chimes and mechanical punctuation. Do not reuse original sound recordings.
- **Transferable concept**: readable silhouettes and precise inset-camera explanation shots make a stylized story feel polished.

## Working technical settings — hypotheses to test, NOT observed measurements

| Feature | Starting test | Caution |
|---|---|---|
| Format | 1080x1920, 30fps, 9:16 | Preview at 540x960 for CPU budget |
| Character | rounded heads, simple eyes and brows | No fixed head ratio before screenshot comparison |
| Skin roughness | 0.45–0.65 | Adjust under actual key light |
| Polished metal | roughness 0.15–0.30, metalness 0.85–1.0 | Needs environment/light reflections |
| Tonemapping | ACES Filmic **or** upstream NEUTRAL preset | Compare; don't mix assumptions blindly. **[corrected]** three.js has `NeutralToneMapping` since r162; the studio uses it (three 0.180). |
| Shadows | PCF soft on hero objects, contact shadow | Watch artifacts and GPU-less memory |
| Head gestures | cubic ease or Remotion spring | Deterministic on frame; never wall-clock |
| Camera movement | glides + intentional cuts | Avoid no-movement hold if frozen-frame QA flags |
| Stylized outlines | optional; use existing bridge's outlined world if hybrid | Never universally force black inverted-hull outlines. **[corrected]** drei `<Outlines screenspace>` produced large black shards whenever geometry was behind/near the camera (no clip.w guard). The studio uses its own guarded hull: `studio/src/lib/Ink.tsx`. |
| Caption mode | **[corrected]** ON by default for the reference *format* (observed white + dark outline), OFF for upstream bridge-mode jobs | `captions` prop in `studio/` |

### Example syntax correction

```js
const springConfig = { damping: 12, stiffness: 120, mass: 0.8 };
```

### Unknowns requiring actual references
- Exact true geometry, precise head/body ratios, light intensities, 3D rigging method, render engine, motion curve data, music provenance and measured voice loudness.
- Whether the supplied seven videos share the same style — this report has only five.
- The original source videos are not currently present in this package.

## Creative safety and copyright
Use the references privately for broad artistic education. Create distinct character silhouettes, original narratives, different camera choreography, newly made/licensed audio and original models. Never upload other creators' original MP4s, stills, music or raw report attachments to a public repository. If private materials are used with a cloud service, review its data and retention settings first.
