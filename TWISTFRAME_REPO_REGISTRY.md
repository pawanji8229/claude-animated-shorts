# TwistFrame Lab: registry of the 13 recommended repositories

**Branch:** `experimental/twistframe-all-repos`, created from `render/twistframe-original` @ `47b5b02`.
**Audit date:** 2026-11-20.

Every repository below was verified on GitHub. The small repositories were shallow-cloned into a scratch folder and read; no code from them was executed.

## Branches left untouched (SHA at audit time)

| Branch | SHA |
|---|---|
| `main` | `f17db0f` |
| `twistframe-original-restored` | `19d3d2c` |
| `render/twistframe-original` | `47b5b02` |
| `experimental/pipeline-v3` | `670f4bd` |

## Isolation rules followed

- The render install `studio/package.json` / `package-lock.json` is **unchanged**. New tools live in their own package, `tools/tf-ext/`, with a separate install, so the cloud renderer's `npm ci` is byte-identical.
- No global Claude settings or skills were touched; the project skill `.claude/skills/voice-to-video` is unchanged.
- Packages were installed with `--ignore-scripts`, pinned exact.
- No React, Three.js, Remotion or React Three Fiber versions changed:
  - three `0.180.0`
  - react / react-dom `19.2.0`
  - @react-three/fiber `9.8.2`
  - @react-three/drei `10.7.6`
  - @react-three/postprocessing `3.2.2`
  - postprocessing `6.39.6`
  - remotion / @remotion/three / @remotion/cli `4.0.541`

| # | Repository | License | Status | Pinned version | What it gives TwistFrame | Notes / blockers |
|---|---|---|---|---|---|---|
| 1 | [pmndrs/drei](https://github.com/pmndrs/drei) | MIT | **Already present** (in use) | `@react-three/drei` **10.7.6** | Already used for `MeshReflectorMaterial` (real reflections on wet / glossy floors) in 4 approved scenes. Other helpers (`ContactShadows`, `Instances`, `Sky`, `Sparkles`, `Clouds`) are available for new scenes. | Not upgraded to 10.7.9, so the approved render stays reproducible. Helpers that animate on the wall clock (`CameraShake`, `Float`, `useFrame` controls) must not be used: Remotion seeks frames, so they would differ per cloud chunk. Camera choreography stays on `camPath` (monotone cubic + Gaussian smoothing), which is deterministic. |
| 2 | [pmndrs/react-postprocessing](https://github.com/pmndrs/react-postprocessing) | MIT | **Already present** (installed, unused) | `@react-three/postprocessing` **3.2.2** | Ready if a future scene needs an effect the TwistFrame post chain lacks (e.g. chromatic aberration, SMAA). | The approved look comes from TwistFrame's own `src/lib/Post.tsx` (SSAO, DOF, bloom, warm/cool grade). It is **not** replaced; swapping it would change the approved grade. |
| 3 | [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | MIT | **Installed** (isolated tool) | `@gltf-transform/core` / `functions` / `extensions` **4.5.1**, `meshoptimizer` **1.3.0** | `tools/tf-ext/optimize-gltf.mjs`: lossless clean-up of imported 3D models (dedup / prune / weld into one GLB), plus optional error-bounded simplification for **distant background props only**. Keeps textures at full resolution. | Tested on Poly Haven `wooden_picnic_table` and `boulder_01`: bounds unchanged and triangles unchanged in lossless mode. These assets were already optimal, so the gain is for newly imported models. `--simplify 0.25` on the boulder: 66,122 → 54,146 triangles. It pulls in `sharp` (image library), which is why it lives outside `studio/`. |
| 4 | [pmndrs/react-three-rapier](https://github.com/pmndrs/react-three-rapier) | MIT | **Integrated via its engine** (offline bake) | `@dimforge/rapier3d-compat` **0.19.2** (Apache-2.0; the exact engine version react-three-rapier 2.2.0 pins) | `tools/tf-ext/bake-physics.mjs` simulates rigid bodies once (240 Hz fixed step) and stores a pose per frame. `studio/src/lib/enhance/baked.ts` plays it back as a pure function of the frame: natural tumbling props, debris, falling objects, knocked-over cones. | The React wrapper itself is **not** used at render time: it steps physics on the wall clock, so out-of-order frames and parallel cloud chunks would disagree. The baked approach is deterministic: two bakes are byte-identical (tested). |
| 5 | [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | Remotion License (free for individuals and companies of up to 3 people) | **Already present** (core) | `remotion` **4.0.541** | The video engine itself. | Kept at the approved version (4.0.545 exists). An upgrade would need its own benchmark. |
| 6 | [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | MIT | **Already present** (core) | `@react-three/fiber` **9.8.2** | The React ↔ three.js engine every TwistFrame scene is built on. | Already the latest; no change. |
| 7 | [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | Zlib | **Already present** (peer of #2) | `postprocessing` **6.39.6** | Effect library behind #2. | Peer range `three >= 0.168 < 0.188`, so it is compatible with three 0.180. Not used by the approved chain. |
| 8 | [jstrait/city-tour](https://github.com/jstrait/city-tour) | MIT | **Reference only** | (its own three **0.162** app) | Ideas for procedural road grids, building heights and street networks. | It is a standalone browser app with its own renderer, controls and three 0.162; mixing it in would add a second three.js. TwistFrame's own building generator (`short3/Neighbours.tsx`) already makes detailed period blocks. Ideas can be ported by hand later. |
| 9 | [nirholas/three-ws-motion](https://github.com/nirholas/three-ws-motion) | Apache-2.0 | **Reference only** (incompatible with the approved design) | `@three-ws/motion` 0.1.0 (not installed) | Text-to-motion for **3D skinned skeletons**. | TwistFrame characters are approved **2D odo5 cards** (no ears, face glow), animated by `pose5` + `faceTrack`. A 3D skeleton system would mean replacing the approved character design, which is forbidden. Its repo ships `CLAUDE.md` / `AGENTS.md` instruction files; these were treated as data and not followed. |
| 10 | [nguyencongnamit/threejs-ocean](https://github.com/nguyencongnamit/threejs-ocean) | — | **Unavailable** | — | — | `git ls-remote` asks for credentials (private, renamed or deleted). The GitHub user exists but has only one public repository (`ssh-mcp`). Nothing to install; the ocean need is covered by #11. |
| 11 | [skywalkerqqq/water-three-js](https://github.com/skywalkerqqq/water-three-js) | MIT | **Partly integrated** (ported module) + reference | port of `src/Ocean.js` `_gerstner` / `surfaceSample` | `studio/src/lib/enhance/gerstner.ts`: a deterministic spectral Gerstner ocean (dispersion, choppiness, analytic normals, visible-surface inversion) plus `floatPose()` for boats bobbing realistically. | The app itself (three **0.185**, Vite, SSR reflections, sand simulation) stays reference-only: a second three.js version would conflict. Tests: deterministic, unit normals, 1.9 cm/frame change, significant height as specified. The approved post-office sea shaders are not replaced. |
| 12 | [jhonatan98rios/Procedural-cyberpunk-city](https://github.com/jhonatan98rios/Procedural-cyberpunk-city) | **No license** (all rights reserved) | **Reference only** (legally blocked) | — | — | Without a license its code may not be copied or adapted. It is also a Next.js 16 app on three 0.185, and its cyberpunk style does not fit the approved period look. Only the link is kept. |
| 13 | [jsantell/THREE.IK](https://github.com/jsantell/THREE.IK) | MIT | **Reference only** | `three-ik` 0.1.0 (not installed) | FABRIK inverse kinematics for 3D bone chains. | Abandoned since 2018 (last commit 2021). TwistFrame's cards already have a camera-space 2D arm IK (`aimArm` with reach clamping, fixed in TL #7). It could later drive 3D machinery such as crane arms, but it is not needed now. |

## Totals

| Status | Count | Repositories |
|---|---|---|
| Already present | 5 | #1, #2, #5, #6, #7 |
| Newly installed (isolated tools) | 2 | #3, #4 (engine) |
| Ported module | 1 | #11 |
| Reference only | 4 | #8, #9, #12, #13 |
| Unavailable | 1 | #10 |

## Test results (2026-11-20)

| Test | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | pass |
| Dependency check | Render install unchanged; core versions as listed above; 0 vulnerabilities reported for `tools/tf-ext` |
| Approved files against `render/twistframe-original` | No diff in `studio/pipeline`, the package files, `.github`, `.claude`, `src/char`, `src/lib/Post.tsx`, `src/productions/centennial`, `productions/` or `references/`. The only change is 2 added lines in `src/Root.tsx` (registers `EnhanceTest`). |
| Approved TL #7 frame 45 rendered on this branch vs the approved render | PSNR 45.2 dB, SSIM 0.98. The PNG vs CRF-17 H.264 difference is the same as measured for the approved cloud benchmark. |
| `optimize-gltf.mjs` | Lossless on Poly Haven assets (bounds and triangles unchanged); `--simplify` works |
| `bake-physics.mjs` | Deterministic (two runs byte-identical); realistic 1 kg cones tip, roll and settle within 1–3 s |
| `gerstner.ts` | Deterministic; unit normals; heights within ±0.6 m for 0.6 m significant wave height |
| **EnhanceTest, 5 s native 1080×1920** | 150/150 frames, 30 fps, H.264, no black frames or single-frame glitches (max frame diff 5.8); **718 s render on this 4-core machine**; peak memory of the render processes **2.8 GB** |

## How to use the optional enhancements with MAKE VIDEO

All of them are opt-in. A video that does not import them renders exactly as before.

- **Physics props (falling, tumbling, knocked-over objects):**
  1. Describe the bodies in a `scene.json`.
  2. Run `node tools/tf-ext/bake-physics.mjs scene.json src/productions/<id>/physics.baked.json`, after `cd tools/tf-ext && npm ci --ignore-scripts` once.
  3. In the scene, place each object with `bakedPose(bake, id, frame)` from `src/lib/enhance/baked.ts`. Worked example: `src/productions/enhance-test/`.
  4. Commit the baked JSON. The cloud renderer needs no extra install.
- **Realistic sea / boats:** import `oceanSpec`, `oceanSurface` and `floatPose` from `src/lib/enhance/gerstner.ts`. Bob hulls with `floatPose(spec, x, z, frame / 30, hullLength)`, or displace a sea plane per frame.
- **Imported 3D models:** run `node tools/tf-ext/optimize-gltf.mjs model.gltf public/<id>/models/model.glb` (lossless). Add `--simplify 0.5` only for far-background props.
- **Reflections / extra effects:** drei `MeshReflectorMaterial` (already used) and `@react-three/postprocessing` effects are available. Avoid any helper that animates on the wall clock.
- **Asking for them:** say e.g. "MAKE VIDEO … use baked physics for the falling crates" or "… Gerstner sea for the boat scenes". Claude adds them as above, renders a short test, and compares it with the approved benchmark first.

## Unresolved items

1. `nguyencongnamit/threejs-ocean` is unavailable.
2. `Procedural-cyberpunk-city` has no license (code cannot be used).
3. `three-ws-motion` (3D skeletons) is incompatible with the approved 2D characters.
4. `city-tour` and `water-three-js` are full apps on other three.js versions: ideas can be ported, the apps cannot be mixed in.
5. The test scene is a component test, not a production scene: its environment is sparser than a finished TwistFrame shot.
