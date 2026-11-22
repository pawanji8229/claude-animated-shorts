# TwistFrame premium asset + sound library (optional, OFF by default)

Branch: `experimental/twistframe-premium-assets`, based on `experimental/twistframe-all-repos`. Built 2026-11-22.
**No video, frame or preview was rendered** to build or test it. No production scene imports it. The approved
renderer, the MAKE VIDEO skill and the existing videos are unchanged.

## What is in it

| Type | Ready (downloaded + verified + inspected) | Catalog-only (researched, needs your account) | Size on disk |
|---|---|---|---|
| 3D models | **94** (Poly Haven, CC0): architecture, street, interiors, factory, tools, nature, 3 vehicles | **29** (Sketchfab, CC-BY / CC-BY-SA / CC0): aircraft, 1940s vehicles, rail, construction machines, houses | 584 MB |
| PBR materials | **42** (30 Poly Haven 2k glTF bundles + 12 ambientCG 2K zips, CC0) | — | 623 MB (+ extracted ambientCG copies) |
| HDRI environments | **12** (Poly Haven 2k .hdr, CC0) | — | 71 MB |
| Sounds | **273** (92 Mixkit full-quality WAV + 181 Kenney CC0 OGG) | Freesound (needs an API key) | 592 MB |

- Full inventory with sizes, triangle counts, maps and licences: [`CATALOG.md`](CATALOG.md) and [`SOUND_LIBRARY.md`](SOUND_LIBRARY.md).
- Machine-readable, searchable catalogue: [`catalog.json`](catalog.json).
- Per-asset inspection results: [`quality-report.json`](quality-report.json).
- Boeing shortlist: [`BOEING_ASSET_SHORTLIST.md`](BOEING_ASSET_SHORTLIST.md).

**Binaries live in `asset-library/cache/`, which is gitignored**, because the GitHub repository is public:
- CC0 files could be committed, but ~1.9 GB of binaries would bloat every clone.
- Mixkit sounds must not be redistributed on their own.

`fetch-all.mjs` / `fetch-sounds.mjs` rebuild the cache on any machine and verify every file against the recorded hashes.

## Research summary (Phase 2)

| Source | What it offers | Licence | Used? |
|---|---|---|---|
| **Poly Haven** | Photoscanned CC0 models, 1k–8k PBR textures, HDRIs, with a public API and **md5 for every file** | CC0 | **Yes: primary source** (94 models, 30 materials, 12 HDRIs) |
| **ambientCG** | CC0 PBR materials (colour, normal, roughness, AO, displacement, metalness, opacity) with an API | CC0 | **Yes**: 12 materials Poly Haven lacks (wire mesh, plywood, bare aluminium, catwalk grating, leaf cards…) |
| **Kenney** | CC0 game packs; the 3D kits are stylised low-poly | CC0 | **Audio only** (Impact Sounds, RPG Audio). The 3D vehicles are toy-like, which the brief excludes. |
| **Sketchfab** | The largest choice of period vehicles, aircraft and buildings; mixed quality | per model (CC0 / BY / BY-SA / BY-NC / BY-ND…) | **Catalogued**: 29 curated models, only CC0/BY/BY-SA (NC and ND excluded). Downloading needs **your free Sketchfab account token**; not bypassed. |
| **BlenderKit** | Large library inside Blender | Royalty-free (own licence); free tier needs an account + the Blender add-on | Not used: needs login + Blender (not installed; no global installs allowed) |
| **Fab (Epic)** | Free monthly assets, Quixel Megascans | Fab Standard Licence; Epic login | Not used: needs login; many assets are Unreal-format |
| **CGTrader** | Free + paid models | Per model; login needed | Not used: needs login |
| **Freesound** | Huge CC library | Per sound: CC0 / CC-BY / CC-BY-NC | Not downloaded: every API call needs **your free API key** |
| **Pixabay sound effects** | Free SFX | Pixabay Content Licence | Not used: the site blocks automated access (Cloudflare 403) and has no audio API; **not bypassed** |
| **Mixkit** | Curated free SFX, full-quality WAV, no login | Mixkit Sound Effects Free License: free use in commercial and personal projects, no attribution, **no redistribution of the raw files** | **Yes**: 92 sounds |

Network: this environment's network policy was extended (with your approval) to the hosts above. Nothing paid was enabled.

## Licence rules applied

- **CC0** (Poly Haven, ambientCG, Kenney): use anywhere, no attribution (a credit is still kind).
- **Mixkit**: fine inside any video, including monetised ones, without attribution. Never publish the raw files or commit them to the public repo, which is why they stay in the cache.
- **Sketchfab CC-BY / BY-SA**: credit required. `catalog.json` carries a ready attribution line for each model. Add it to the video description when one is used. BY-SA also requires sharing adaptations of the model under the same licence.
- **Excluded**: NonCommercial (NC), NoDerivatives (ND), unlicensed and paywalled assets.
- The Mixkit licence page renders its terms in a pop-up, so the full text could not be archived statically. Please re-read <https://mixkit.co/license/#sfxFree> once before publishing.

## Quality findings (Phase 8; static checks only)

- All 94 models are valid glTF with every referenced file present. Every textured primitive has UVs and every primitive has normals.
- Every model has 1k PBR textures (base, normal, ARM). The extensions used (`KHR_materials_specular/ior/transmission/emissive_strength/clearcoat`, `KHR_texture_transform`) are all supported by the approved three r180.
- **Flags:**
  - `steel_frame_shelves_01` is exported at **10× scale**. `prepare.mjs` fixes it automatically (2.14 m tall).
  - `jacaranda_tree` has **3.86 M triangles**. Use it as a hero tree, or LODs (prepare `--lods`: 964k / 193k). Leaf-card trees simplify poorly; for distant trees, instance the lighter `fir_sapling` / `pine_sapling_small` / Sketchfab oak instead.
  - A few plants have axis-swapped stated dimensions. This is informational only; their real size is plausible.
  - `vintage_grandfather_clock_01`: one material has no normal map.
- PBR materials: 30/30 Poly Haven bundles have base + normal + ARM; 12/12 ambientCG zips pass `unzip -t` and include colour + NormalGL + roughness (plus AO / displacement / metalness / opacity where relevant).
- HDRIs: 12/12 valid Radiance files, 2048×1024.
- Sounds: 273/273 decode (WAV 16/24-bit 44.1 kHz stereo; OGG Vorbis 44.1/48 kHz). Peak levels are recorded; 22 recordings peak near 0 dBFS. The mixer normalises every event relative to the narration anyway.
- Integrity: **855 downloaded files re-hashed** against the manifests written at download time (all match).

## Gaps (honest)

- **No free, downloadable, licence-clean 1940s vehicles or aircraft** on Poly Haven, ambientCG or Kenney. The good ones (B-17, 1940s cars and trucks, bus, Willys jeep, boxcar, D8 tractor) are on Sketchfab under CC-BY and need your token.
- No CC0 **burlap** or **chicken-wire-with-feathers** material exists. Use ambientCG `Fence003` (wire mesh with opacity), with feathers/foliage as alpha cards.
- No recorded **WWII propeller aircraft** sound in the free sources reached. Keep the synthesised drone or add a Freesound recording with your key.
- Poly Haven has building **façade modules**, not complete period houses. Complete houses (Craftsman bungalow) are Sketchfab CC-BY.

## How to activate in a future MAKE VIDEO project

Everything is opt-in. Nothing changes until a scene imports it.

1. One-time setup on a new machine: `cd tools/tf-ext && npm ci --ignore-scripts`, then:
   ```
   node assets/fetch-all.mjs
   node assets/fetch-sounds.mjs
   node assets/inspect-library.mjs
   node assets/build-catalog.mjs
   ```
2. Find assets:
   - `node assets/search.mjs --type model --era 1940s --setting factory`
   - `--type sound --category footsteps --tag concrete`
   - `--boeing`
3. Prepare a model for the scene. This applies scale and orientation correction, base-centre origin, lossless clean-up and optional LODs, and caches the result:
   ```
   node assets/prepare.mjs polyhaven:overhead_crane --out ../../studio/public/library/overhead_crane [--lods 0.4,0.1] [--lod-texture 512]
   ```
4. Use it in the scene:
   ```tsx
   import { LibraryModel, LibraryInstances, useLibraryHdri } from "../../lib/enhance/libraryModel";
   <LibraryModel file="library/overhead_crane/overhead_crane.glb" position={[0, 9, 0]} camPos={c.pos}
     lods={[{ file: "library/overhead_crane/overhead_crane_lod1.glb", from: 60 }]} />
   ```
   Use `LibraryInstances` for rows of repeated props, and `useLibraryHdri("library/hdri/x.hdr")` for image-based lighting.
5. Materials: copy a Poly Haven bundle's textures, or an ambientCG zip's `*_Color/NormalGL/Roughness`, into `public/library/…` and build a `MeshStandardMaterial` with metre-based UV repeat. This matches the kit system's metre UVs.
6. Sounds: run `node assets/match-sounds.mjs studio/productions/<id>/events.json` to get recorded candidates per cue kind. Mixkit/Kenney files can then be registered as additional generators in the mixer, which is the existing additive way to add sounds. The narration and existing soundtracks are never edited.
7. Before any final render, Claude renders a short test and compares it with the approved benchmark, but only after you ask.
8. Commit only the **prepared CC0 / CC-BY** files a production actually uses (for the cloud renderer). Never commit Mixkit raw files. Credit CC-BY models in the video description using the catalogue's attribution line.

## Files (extension, isolated in `tools/tf-ext/assets`, nothing in the render install)

| File | What it does |
|---|---|
| `fetch.mjs` / `fetch-all.mjs` / `fetch-sounds.mjs` | Integrity-checked downloads |
| `selection.mjs` / `sound-selection.mjs` / `sketchfab-shortlist.mjs` | Curated lists with era / setting / style tags |
| `inspect-library.mjs` | Static quality inspection → `quality-report.json` |
| `build-catalog.mjs` / `gen-docs.mjs` | `catalog.json` + inventories |
| `search.mjs` | Search |
| `prepare.mjs` | Import / scale / orient / optimise / LOD / cache |
| `match-sounds.mjs` | Cue → sound suggestions |
| `test-assets.mjs` | Non-rendering tests |
| `studio/src/lib/enhance/libraryModel.tsx` | Remotion-safe GLB/HDRI loading with deterministic LOD + instancing (not imported by any scene) |
