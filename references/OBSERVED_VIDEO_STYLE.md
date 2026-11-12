# Observed Reference Style — Five User-Supplied MP4s

**Evidence standard:** This report is based on frame samples viewed directly from the 5 uploaded MP4 files, plus programmatically verified file/audio metadata. Specific audio events attributed by Gemini are *not independently confirmed by listening*. Sampled frames are the evidence, not a proof of original animation techniques. Source frames stay out of the GitHub-safe package.

## Key correction to Gemini’s report

**The most consistent apparent look is 2.5D/hybrid illustration in dimensional environments, NOT fully photorealistic volumetric human characters.** The faces often read as **flat, off-white circular/oval discs with dark outlines, sparse black eyes/brows/mouths**, accompanied by **narrow colored torsos and extremely thin dark arms and legs**. Backgrounds depict perspective-rich rooms, props, streets and ships with stylized, sometimes rendered-looking textures and lighting. The precise compositing/rigging method cannot be established from MP4 frames.

In the five sampled clips, **on-screen narration captions are typically white with a dark stroke/shadow**, near the lower middle. Gemini’s claim that white-and-yellow kinetic subtitles are a universal signature is not supported by these samples. Preserve a configurable captions switch; do not enforce yellow. The original public project may default to no captions, but **the reference footage actually contains captions**.

## Observations by video

### V01 — Your Brain’s Secret Idea Zone (39.07 seconds)
- **Observed character:** oversized off-white round face, brown simplified hair cap, thick dark face contour, blue narrow capsule-like shirt, long thin dark limbs, minimal changing eyebrows and mouth.
- **Observed set:** nearly black small room, single overhead hanging bulb with visible pool of light, circular patterned floor, wooden stools, small metallic bowls/balls; later an illustrated blue brain/body graphic and a warm library-like scene.
- **Lighting / palette:** dark charcoal-brown shadows and amber incandescent highlights; muted blue protagonist contrasts against warm brown flooring. Darkness is motivated by the single bulb.
- **Composition:** close-ups and wider figures alternate; clear center subject and a few emphasized hero props. Selected samples at 0.3, 2, 5, 8, 12, 17, 22, 28, 35 seconds.
- **Audio:** AAC exists. Measured mean -18.8 dBFS, sample peak -1.7 dBFS for full mixed track. Claims about metal clank and voice cadence come from Gemini, not verified listening.

### V02 — The Window That Breaks Japan’s Gambling Law (45.03 seconds)
- **Observed character:** flat-disc expressive faces and dark line bodies, small accessories (jackets, hair, uniforms). Character layer reads flatter than arcade environment.
- **Observed sets:** tall narrow neon alley, interior arcade rows with bright perspective pattern carpet and machine repetition, prize counter, late-night storefront window.
- **Lighting / palette:** cool midnight blue/purple alley with warm emissive windows; bright cream overhead interior light and high-saturation reds, yellows and signage in arcade.
- **Composition:** doorway reveals, corridor vanishing points and two-person counter compositions; selected frames at 0.3, 2, 5, 8, 12, 17, 22, 28, 35, 42 seconds.
- **Audio:** AAC; mean -17.5 dBFS, peak -0.4 dBFS for mixed track. Gemini’s named arcade sounds not independently verified.

### V03 — Why Sailors Carried Storm Oil (64.57 seconds)
- **Observed characters:** outlined, round-faced sailors and pirates; minimal two-dimensional face details with distinctive hats and costume colors.
- **Observed sets:** vividly painted wooden ship rails and planks, mast, ropes, portholes, wheel; bright saturated blue sea and simplified foam; later darker night-storm palette, rain lines and large stylized waves.
- **Lighting / palette:** bright cyan/blue daytime followed by deep blue-violet storm, with warm orange or yellow ship accents; more **cartoon-stylized** than the Gemini description of physically realistic water.
- **Composition:** foreground interactions on the ship deck switch to wider boat/sea establishing shots and inset object close-ups; selected 0.3, 2, 5, 8, 12, 17, 22, 28, 35, 42, 50, 58 seconds.
- **Audio:** AAC; mean -16.9 dBFS, peak -0.4 dBFS. Gemini’s specific sound cues require listening confirmation.

### V04 — The Job Nobody Wants in Japan (60.50 seconds)
- **Observed character:** broad circle face with heavy dark edge, slim torso/line limbs; office figures differentiated with tie, ID tag, hair, clothing hue. Facial shapes shift subtly.
- **Observed sets:** vivid blue flooring, light office ceiling grid, pale mint-green tiled room, compact desk and analog clock, corridor and door, later dim interior warmed by isolated wall sconces.
- **Lighting / palette:** fluorescent-like cool whites and saturated blues in office, pale mint walls with blocks of warm light, blue shadows and yellow-orange accents near final door.
- **Composition:** wide office interiors paired with closer character reaction shots; some samples show transition/motion blur, especially midcuts; selected 0.3, 2, 5, 8, 12, 17, 22, 28, 35, 42, 50, 58 seconds.
- **Audio:** AAC; mean -17.0 dBFS, peak -0.8 dBFS. Specific ticking and office room tone unverified by listening.

### V05 — Why Cowboys Never Load Six Bullets (60.97 seconds)
- **Observed character:** circular white faces with thick dark contour and simple black features; Western silhouettes chiefly through hats, neckwear, jackets, accessories and facial hair.
- **Observed sets:** richly dressed warm wooden saloon with repeating bottles and lamps, stylized Western main street with bright sky and flags, inserts of diagrammatic objects; some frames have strong foreground blur/depth separation.
- **Lighting / palette:** glowing amber/brown practical interior light, brightly exposed sandy yellow/orange outdoors, blue sky; distinct warm/cool environment switches.
- **Composition:** medium hero shot, two-character staging, street-wide character shot, close insert and return shot; selected 0.3, 2, 5, 8, 12, 17, 22, 28, 35, 42, 50, 58 seconds.
- **Audio:** AAC; mean -16.9 dBFS, peak -0.3 dBFS. Named mechanical/impact effects from Gemini remain unverified.

## Cross-video shared production direction (observed)

1. **2.5D character treatment:** bold outlined flat-looking heads/faces, simple readable emotional poses, thin limbs. Start with illustrated sprites/cards/flat meshes or layered billboards in a detailed 3D scene, not fully detailed human character meshes.
2. **Perspective-rich worldbuilding:** detailed floors, walls, railings, props, textures and strategic foreground objects, while human/animal characters stay dramatically simplified.
3. **Clear cinematic lighting:** single warm practical for intimate scenes; cool/neon versus warm windows at night; saturated daylight vs dark storm; clinical cool office versus isolated warm sconces.
4. **Accessible, color-coherent design:** backgrounds change palette with genre, characters stay legible through outline and separation from set.
5. **Narration captions visually present:** short white words with black edge near bottom-center in extracted frames; exact fonts and timing not independently measured. Toggle ON when targeting this *format*, with an OFF override if the project's original instructions conflict.
6. **Vertical storytelling:** 720×1280, 30 fps in all five uploaded source files. Target final 1080×1920 30 fps, preview 540×960.
7. **Audio:** all five have mixed AAC audio; per-track dBFS values are metadata-based and are not recommended target mastering levels. **[corrected]** "Mean dBFS" (e.g. ffmpeg `volumedetect`) is an unweighted sample average, not loudness. Master to an integrated-loudness target in LUFS (EBU R128 / ITU-R BS.1770, e.g. ffmpeg `loudnorm`); the upstream style bible measured about -14 LUFS integrated, with sample peaks kept below about -1 dBTP. Narration characteristics and exact SFX need listening-based verification before claiming them as facts.

## Practical target to reproduce a similar degree of polish WITHOUT copying material

- **Characters**: create an ORIGINAL character family: distinct head contour, different hair/eye layout and wardrobe choices from the originals, but retain general flat/readable silhouette principles; test head-to-body proportions visually rather than enshrining an unmeasured `1.5:1` claim.
- **Worlds**: use real camera perspective, depth ordering, modeled props, richly shaded floors and walls, texture variation and foreground/background layers. A few hero objects matter more than polygon count.
- **Light**: scene-specific key/fill/rim arrangement with visible motivated source, contact shadows and controlled glow. Compare 3 stills before animating.
- **Cameras**: original push/dolly/tracking/low-angle approaches; verify camera paths with stills and no subject clipping.
- **Compositing**: ensure characters receive appropriately consistent environment light/shadow and do not appear pasted on; maintain clear black outline width at smartphone size.
- **Sound**: write an original cue sheet; use own recordings/licensed SFX and clear narration, then check audio sync and perceived balance rather than matching the source’s exact waveform.
- **Quality gate**: require an original character close-up, a full-body scene, and a complex lit environment still before a 10-second low-resolution render.

## Unverified / do not overstate

True 3D rig versus 2D or 2.5D cutout, real renderer, engine, shader choice, poly count, actual material roughness/metalness, exact focal length, sound identity, lip sync algorithm, exact cut timings and causality of some frames are all **unknown** from this limited inspection. Gemini’s `springConfig { damping.12, ... }` snippet also has invalid syntax; change to `const springConfig = { damping: 12, stiffness: 120, mass: 0.8 };` — in Remotion pass it as `spring({ frame, fps, config: springConfig })`.
