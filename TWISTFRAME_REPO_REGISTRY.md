# TwistFrame Lab: registry of the 23 evaluated repositories

**Branch:** `experimental/twistframe-all-repos`, created from `render/twistframe-original` @ `47b5b02`.
**Audit dates:** 2026-11-20 (repos 1–13), 2026-11-22 (repos 14–23 + re-verification of 1–13).

Every repository below was verified on GitHub. The small repositories were shallow-cloned into a scratch folder and read; no code from them was executed.

## Branches left untouched (SHA at audit time; re-checked 2026-11-22: unchanged, plus `render/twistframe-boeing` `2f6a178`)

| Branch | SHA |
|---|---|
| `main` | `f17db0f` |
| `twistframe-original-restored` | `19d3d2c` |
| `render/twistframe-original` | `47b5b02` |
| `experimental/pipeline-v3` | `670f4bd` |

## Isolation rules followed

- The render install `studio/package.json` / `package-lock.json` is **unchanged**. New tools live in their own package, `tools/tf-ext/`, with a separate install, so the cloud renderer's `npm ci` is byte-identical.
- No global Claude settings or skills were touched; the project skill `.claude/skills/voice-to-video` is unchanged.
- Packages were installed with `--ignore-scripts`, pinned exact. No repository scripts (`.sh`, `npm run`, Blender add-ons) were executed; repos were cloned shallow into a scratch folder for reading only.
- Agent instruction files found in repos (`AGENTS.md`, `CLAUDE.md`, `llms.txt`) were treated as data and not followed.
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
| 1 | [pmndrs/drei](https://github.com/pmndrs/drei) | MIT | **Already present** (in use) | `@react-three/drei` **10.7.6** | Already used for `MeshReflectorMaterial` (real reflections on wet / glossy floors) in 4 approved scenes. Other helpers (`ContactShadows`, `Instances`, `Sky`, `Sparkles`, `Clouds`) are available for new scenes. | Re-verified 2026-11-22: latest is 10.7.9. Not upgraded, so the approved render stays reproducible. Helpers that animate on the wall clock (`CameraShake`, `Float`, `useFrame` controls) must not be used: Remotion seeks frames, so they would differ per cloud chunk. Camera choreography stays on `camPath` (monotone cubic + Gaussian smoothing), which is deterministic. |
| 2 | [pmndrs/react-postprocessing](https://github.com/pmndrs/react-postprocessing) | MIT | **Already present** (installed, unused) | `@react-three/postprocessing` **3.2.2** | Ready if a future scene needs an effect the TwistFrame post chain lacks (e.g. chromatic aberration, SMAA). | The approved look comes from TwistFrame's own `src/lib/Post.tsx` (SSAO, DOF, bloom, warm/cool grade). It is **not** replaced; swapping it would change the approved grade. |
| 3 | [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | MIT | **Installed** (isolated tool) + new `inspect-gltf.mjs` | `@gltf-transform/core` / `functions` / `extensions` **4.5.1**, `meshoptimizer` **1.3.0** | `tools/tf-ext/optimize-gltf.mjs`: lossless clean-up of imported 3D models (dedup / prune / weld into one GLB), plus optional error-bounded simplification for **distant background props only**. Keeps textures at full resolution. | Tested on Poly Haven `wooden_picnic_table` and `boulder_01`: bounds unchanged and triangles unchanged in lossless mode. These assets were already optimal, so the gain is for newly imported models. `--simplify 0.25` on the boulder: 66,122 → 54,146 triangles. It pulls in `sharp` (image library), which is why it lives outside `studio/`. |
| 4 | [pmndrs/react-three-rapier](https://github.com/pmndrs/react-three-rapier) | MIT | **Integrated via its engine** (offline bake) | `@dimforge/rapier3d-compat` **0.19.2** (Apache-2.0; the exact engine version react-three-rapier 2.2.0 pins) | `tools/tf-ext/bake-physics.mjs` simulates rigid bodies once (240 Hz fixed step) and stores a pose per frame. `studio/src/lib/enhance/baked.ts` plays it back as a pure function of the frame: natural tumbling props, debris, falling objects, knocked-over cones. | The React wrapper itself is **not** used at render time: it steps physics on the wall clock, so out-of-order frames and parallel cloud chunks would disagree. The baked approach is deterministic: two bakes are byte-identical (tested). |
| 5 | [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | Remotion License (free for individuals and companies of up to 3 people) | **Already present** (core) | `remotion` **4.0.541** | The video engine itself. | Kept at the approved version (re-verified 2026-11-22: 4.0.545 is the latest). An upgrade would need its own benchmark. |
| 6 | [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber) | MIT | **Already present** (core) | `@react-three/fiber` **9.8.2** | The React ↔ three.js engine every TwistFrame scene is built on. | Already the latest; no change. |
| 7 | [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | Zlib | **Already present** (peer of #2) | `postprocessing` **6.39.6** | Effect library behind #2. | Peer range `three >= 0.168 < 0.188`, so it is compatible with three 0.180. Not used by the approved chain. |
| 8 | [jstrait/city-tour](https://github.com/jstrait/city-tour) | MIT | **Reference only** | (its own three **0.162** app) | Ideas for procedural road grids, building heights and street networks. | It is a standalone browser app with its own renderer, controls and three 0.162; mixing it in would add a second three.js. TwistFrame's own building generator (`short3/Neighbours.tsx`) already makes detailed period blocks. Ideas can be ported by hand later. |
| 9 | [nirholas/three-ws-motion](https://github.com/nirholas/three-ws-motion) | Apache-2.0 | **Reference only** (incompatible with the approved design) | `@three-ws/motion` 0.1.0 (not installed) | Text-to-motion for **3D skinned skeletons**. | TwistFrame characters are approved **2D odo5 cards** (no ears, face glow), animated by `pose5` + `faceTrack`. A 3D skeleton system would mean replacing the approved character design, which is forbidden. Its repo ships `CLAUDE.md` / `AGENTS.md` instruction files; these were treated as data and not followed. |
| 10 | [nguyencongnamit/threejs-ocean](https://github.com/nguyencongnamit/threejs-ocean) | — | **Unavailable** | — | — | `git ls-remote` asks for credentials (private, renamed or deleted). The GitHub user exists but has only one public repository (`ssh-mcp`). Nothing to install; the ocean need is covered by #11. |
| 11 | [skywalkerqqq/water-three-js](https://github.com/skywalkerqqq/water-three-js) | MIT | **Partly integrated** (ported module) + reference | port of `src/Ocean.js` `_gerstner` / `surfaceSample` | `studio/src/lib/enhance/gerstner.ts`: a deterministic spectral Gerstner ocean (dispersion, choppiness, analytic normals, visible-surface inversion) plus `floatPose()` for boats bobbing realistically. | The app itself (three **0.185**, Vite, SSR reflections, sand simulation) stays reference-only: a second three.js version would conflict. Tests: deterministic, unit normals, 1.9 cm/frame change, significant height as specified. The approved post-office sea shaders are not replaced. |
| 12 | [jhonatan98rios/Procedural-cyberpunk-city](https://github.com/jhonatan98rios/Procedural-cyberpunk-city) | **No license** (all rights reserved) | **Reference only** (legally blocked) | — | — | Without a license its code may not be copied or adapted. It is also a Next.js 16 app on three 0.185, and its cyberpunk style does not fit the approved period look. Only the link is kept. |
| 13 | [jsantell/THREE.IK](https://github.com/jsantell/THREE.IK) | MIT | **Reference only** (method re-implemented) | `three-ik` 0.1.0 (not installed) | FABRIK inverse kinematics for 3D bone chains. | Abandoned since 2018 (last commit 2021). TwistFrame's cards already have a camera-space 2D arm IK (`aimArm` with reach clamping, fixed in TL #7). It could later drive 3D machinery such as crane arms, but it is not needed now. **2026-11-22:** its FABRIK method is now re-implemented (own code, plus an exact two-bone solver) in `src/lib/enhance/ik3d.ts` for machinery such as cranes, derricks, excavators and landing gear; the package itself is still not installed. |
| 14 | [gokayfem/video-to-blender](https://github.com/gokayfem/video-to-blender) | MIT | **Reference only** | — | An agent skill that builds Blender Geometry/Shader Nodes from a reference video (e.g. a procedural storybook street). Useful later as a guide for building modular house/street kits. | Needs Blender, which is not installed (installing it globally is not allowed). It is itself a *skill* for coding agents; installing it would change the skill setup, which is forbidden. Its `AGENTS.md` was read as data and not followed. |
| 15 | [wsparcie/procedural_buildings](https://github.com/wsparcie/procedural_buildings) | MIT | **Reference only** | — | Blender 3.6 Geometry-Nodes presets: factory, tenement, block of flats, skyscraper. A factory preset could become a GLB background asset. | Ships only `.blend` files (needs Blender 3.6, not installed). The route, if wanted later: export GLB in Blender on your own machine, then run `inspect-gltf` → `pack-gltf` here. Alpha status. |
| 16 | [zeux/meshoptimizer](https://github.com/zeux/meshoptimizer) | MIT | **Installed** (isolated tools) | `meshoptimizer` **1.3.0** (JS/WASM simplifier, used by `optimize-gltf.mjs`), `gltfpack` **1.3.0** (WASM CLI, new) | `tools/tf-ext/pack-gltf.mjs`, two presets. **hero**: vertex-cache/overdraw reordering only, no quantisation or simplification, so it looks identical. **background**: error-bounded simplification with locked borders. | The C++ library is not compiled (not needed; the official WASM builds cover it). Texture recompression (KTX2/WebP) is deliberately **off** so the approved look is unchanged. |
| 17 | [achrefelouafi/BuildingGeneratorThreeJS](https://github.com/achrefelouafi/BuildingGeneratorThreeJS) | MIT (code) | **Reference only** | (own three **0.185** + Vite app) | A procedural Hong Kong high-rise generator (192-part instanced kit, placement rules ported from a 592-node Blender graph). Ideas for façade-module placement. | A second three.js version would conflict with the approved **0.180**. Its `kit.glb` comes from a Sketchfab model whose licence is **not stated** in the repo, so the assets are not used. Its style (modern HK towers) also does not suit period scenes. |
| 18 | [pmndrs/react-three-examples](https://github.com/pmndrs/react-three-examples) | MIT | **Reference only** | (R3F **10 alpha**, drei **11 alpha**, three **0.185**, WebGPU) | 268 three.js examples rebuilt in R3F: a cookbook to port techniques by hand (water, instancing, CSG, BVH, lighting). | Built on pre-release R3F 10 / drei 11 and WebGPU. Installing it would upgrade React-Three-Fiber and three past the approved versions. Copy techniques only, and keep them deterministic. `AGENTS.md`/`CLAUDE.md` were read as data and not followed. |
| 19 | [bijoor/wadi](https://github.com/bijoor/wadi) | MIT | **Reference only** (ideas used) | — | A parametric home designer (its own `.wdl` design language → 3D model + plans). Its parametric approach informed `src/lib/enhance/cityPlan.ts` (own code). | It is a hosted web app (Cloudflare `wrangler`), not a library; running it would mean a separate service. `AGENTS.md`/`CLAUDE.md` were read as data and not followed. |
| 20 | [alexderbin/sketch3d-blender-architecture](https://github.com/alexderbin/sketch3d-blender-architecture) | MIT | **Reference only** | — | A Python + Blender 5.2 generator for castles, cathedrals, temples and medieval towns (plan → masses, face roles). Good for historic-architecture topics later. | Needs Blender 5.2 + Python 3.13 with numpy/scipy/opencv/openexr (not installed; installing globally is not allowed). The route: generate in Blender on your machine, export GLB, then optimise here. |
| 21 | [dottyboy/BlenderLevelArchitect](https://github.com/dottyboy/BlenderLevelArchitect) | **GPL-3.0** | **Reference only** (licence-restricted) | — | A WFC-style room/corridor/stair solver for game levels in Blender. | GPL-3.0: copying its code into TwistFrame (MIT) would force the GPL on the project, so no code is used. It also needs Blender, and dungeon-style game levels do not suit the documentary look. Its shell scripts were **not** run. |
| 22 | [goldfire/howler.js](https://github.com/goldfire/howler.js) | MIT | **Installed** (isolated tool, review only) | `howler` **2.2.4** | `tools/tf-ext/audio-sprite.mjs` turns a production's `cue_sheet.csv` into a howler sprite map over the rendered stems, so single cues can be auditioned in a browser review page (tested: 316 Boeing cues). | **Never used for the render.** howler plays on the wall clock; the production mix stays the frame-accurate offline mixer (`audio/mix_events.py`). |
| 23 | [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js) | MIT | **Installed** (isolated tool, reserved) | `tone` **15.1.22** (latest stable on npm; deps `standardized-audio-context` 25.3.x, `tslib`) | Reserved for browser-side music sketching with `Tone.Offline`, which renders deterministically into a buffer. A sketch would be exported to WAV and fed to the mixer as a music bed. | Needs a Web Audio context (browser). No live playback in the pipeline; the existing procedural music beds stay the default. Upstream repo shows 15.5.x in development, but npm stable is 15.1.22 (pinned). |

## Totals (23)

| Status | Count | Repositories |
|---|---|---|
| Already present in the render install | 5 | #1 drei, #2 react-postprocessing, #5 remotion, #6 react-three-fiber, #7 postprocessing |
| Installed, isolated tools (`tools/tf-ext`) | 5 | #3 glTF-Transform, #4 Rapier engine (offline bake), #16 meshoptimizer + gltfpack, #22 howler, #23 Tone |
| Ported / re-implemented as an optional module | 3 | #11 Gerstner ocean, #13 IK method (`ik3d.ts`), #19 parametric ideas (`cityPlan.ts`) |
| Reference only | 9 | #8, #9, #12, #14, #15, #17, #18, #20, #21 |
| Unavailable | 1 | #10 |

## Exact installed versions

- **Render install, `studio/`: unchanged.** three `0.180.0`, react / react-dom `19.2.0`, @react-three/fiber `9.8.2`, @react-three/drei `10.7.6`, @react-three/postprocessing `3.2.2`, postprocessing `6.39.6`, remotion / @remotion/three `4.0.541`.
- **Isolated tools, `tools/tf-ext/`** (separate `package.json` + lock, `--ignore-scripts`, exact pins): @gltf-transform/core / functions / extensions `4.5.1`, meshoptimizer `1.3.0`, gltfpack `1.3.0`, @dimforge/rapier3d-compat `0.19.2`, howler `2.2.4`, tone `15.1.22`.
- **Licences in `tools/tf-ext`:** MIT ×23, Apache-2.0 ×5, ISC, 0BSD. **LGPL-3.0** libvips binaries come in through `sharp` (needed by glTF-Transform for texture reads). They are dynamically linked prebuilt binaries in an internal tool, not shipped in videos. `npm audit`: 0 vulnerabilities.

## Optional modules (prepared, NOT active in the approved pipeline; no production scene imports them)

| Capability | Module | Source |
|---|---|---|
| Cinematic camera movement | `studio/src/lib/enhance/cinecam.ts`: dolly / dolly-zoom, truck, crane, orbit (loop-safe), over-the-edge scale reveal, seeded loop-periodic handheld, `speedReport` spike check. Outputs keys for the existing deterministic `camPath`. | own code |
| Lighting + post | `studio/src/lib/enhance/lightingPresets.ts`: 7 tested `Mood` presets (golden hour, overcast, midday, tungsten interior, factory hall, blue hour, aerial) + `mixMood` for time-of-day changes. Uses the approved post chain only; bloom threshold ≥ 1.5. | own code (approved chain) |
| Architectural environments | `studio/src/lib/enhance/cityPlan.ts`: seeded street blocks + lots with frontage, storeys falling off from a centre, parks/shops, `lotsIn` exclusion zones. | own code; ideas from #8, #19 |
| Vehicle / aircraft assets | `tools/tf-ext/inspect-gltf.mjs` (real size, up axis, triangles, materials, textures, suggested scale to a known length) → `optimize-gltf.mjs` (lossless) / `pack-gltf.mjs` (hero / background) | #3, #16 |
| Realistic water | `studio/src/lib/enhance/gerstner.ts` (spectral Gerstner + `floatPose`) | #11 |
| Character animation + IK | `studio/src/lib/enhance/ik3d.ts`: two-bone + FABRIK for **machinery and props only**. Characters keep the approved odo5 cards and `aimArm`; character design unchanged. | #13 method |
| Physics props | `tools/tf-ext/bake-physics.mjs` + `studio/src/lib/enhance/baked.ts` | #4 |
| Geometry / texture optimisation | `optimize-gltf.mjs`, `pack-gltf.mjs` (textures kept at full quality) | #3, #16 |
| Audio management | `tools/tf-ext/audio-sprite.mjs` (cue-sheet → howler sprite for reviewing cues); Tone.js reserved for `Tone.Offline` music sketches → WAV → mixer bed. The offline python mixer stays the production path. | #22, #23 |

## Verification without rendering (2026-11-22)

| Check | Result |
|---|---|
| TypeScript `tsc --noEmit` (studio) | pass |
| `npx tsx scripts/test-enhance.ts` | 13/13 pass: camera keys, loop-safe orbit, `camPath` smoothness (no speed/accel spikes), deterministic handheld, presets + blend, city plan determinism / containment / no overlaps, two-bone exactness + clamping, FABRIK lengths, aim angles, Gerstner determinism |
| `cd tools/tf-ext && node test-tools.mjs <cue_sheet.csv>` | 7/7 pass: glTF size in metres + scale suggestion; gltfpack hero keeps triangles + bounds; background 2048 → 1024 triangles with bounds kept; quoted-CSV sprite builder; 316 real Boeing cues; tone + howler resolve |
| Dependency check | `studio/package.json` + `package-lock.json`: no diff; core versions as above; `npm audit` (tf-ext) 0 vulnerabilities |
| Licence check | Done for all 23 repos and for every installed package (see above) |
| Isolation | SHA-256 of `.claude/skills/voice-to-video`, `.github` workflows, studio package files and the approved benchmark identical before and after; protected branch SHAs unchanged; `~/.claude` settings and skills untouched |
| Video rendering | **none.** No previews, stills, frames, MP4 or GitHub Actions render jobs. |

(The 2026-11-20 results for the first 13 repositories, including the EnhanceTest render from that phase, are kept in git history at commit `006d02f`.)

## How to use the optional enhancements later (only when you ask for them)

- Camera: `import { overEdge, orbit, speedReport } from "../../lib/enhance/cinecam"`, then pass the keys to `camPath(keys, 9)`.
- Lighting: `MOODS.x = LIGHTING.goldenHour` (or `mixMood(a, b, t)`) in a scene's mood table.
- City: `planCity({ size, block, street, lotW, depth, seed })`, then feed the lots to the house generator.
- Imported models: `node tools/tf-ext/inspect-gltf.mjs m.glb --length 22.66`, then `optimize-gltf.mjs`, then `pack-gltf.mjs --preset hero|background`.
- Machinery IK: `twoBone(root, a, b, target, pole)` / `fabrik(joints, target)`.
- Audio review: `node tools/tf-ext/audio-sprite.mjs productions/<id>/audio/cue_sheet.csv sprite.json`.
- Physics and water: as described in the 2026-11-20 section (bake-physics → `bakedPose`; `oceanSpec` / `floatPose`).

Every enhancement is opt-in. A video that does not import one renders exactly as before. Before any production use, Claude renders a short test and compares it with the approved benchmark, but only after you ask.

## Unresolved items / blockers

1. #10 `nguyencongnamit/threejs-ocean` is unavailable (private or deleted).
2. #12 has no licence (code cannot be used); #21 is GPL-3.0 (code not copied).
3. #14, #15, #20, #21 need **Blender**, which is not installed. The safe route is Blender on your own machine → GLB → `inspect-gltf` / `pack-gltf` here.
4. #8, #11, #17, #18 are apps on other three.js versions (0.162 / 0.185, R3F 10 alpha). Techniques can be ported by hand; the apps cannot be mixed in.
5. #9 (3D skeleton motion) is incompatible with the approved 2D characters.
6. #17's building kit has no stated asset licence.
7. Tone.js needs a browser Web Audio context, so it is reserved and not wired into the pipeline.
8. This branch was made before the Boeing production, so the Boeing files are on `render/twistframe-boeing`, not here. Nothing was merged in either direction.
