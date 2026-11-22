# TwistFrame Model Vault ↔ MAKE VIDEO integration (optional, OFF by default)

Branch: `experimental/twistframe-model-vault` (based on `experimental/twistframe-premium-assets`). Built 2026-11-22.
No video was rendered. The approved renderer, the MAKE VIDEO skill and completed videos are unchanged.

## 1. What the website actually offers (inspected 2026-11-22)

Site: <https://twistframe-model-vault.pawanji8229.chatgpt.site/>

| Feature | Finding |
|---|---|
| Models | **2,501 catalogue entries**: Architecture 361, Nature 325, Interiors & Props 325, Road Vehicles 270, Industrial 260, People & Animals 215, Infrastructure 210, Air/Sea/Rail 165, museum scans 25, plus finer sub-categories |
| Where files live | The vault is an **index**. Files are served by their publishers: tevy.dev 902, Innerscene 594, Poly Haven 522, Rail Island 242, 3dassets.dev 117, Smithsonian 105, GitHub/Hugging Face 19 |
| Licences | CC0 1.0 2,482 · CC BY 4.0 18 · CC BY-SA 4.0 1 (with author + source on every entry) |
| Formats | GLB 1,712 · glTF 522 · "Procedural JS (publisher page exports GLB)" 242 · OBJ ZIP 25. In the browser, any GLB can also be repacked as glTF + BIN (ZIP) |
| Search / filter | Text search, category chips, sort (featured / A–Z / Z–A), "Saved" list (stored in the browser) |
| Previews | One preview image per entry (`/previews/<id>.webp` or the publisher's image) |
| Machine-readable | `/catalog.json` ("Claude index"), `/all-files.json` (download URLs + credits), `/entries/<id>.json`, `/api/models` (community uploads, public JSON) |
| **Upload (bottom of the page)** | "Creator studio → **Publish a model**". It requires **Sign in with ChatGPT**. Form fields:<br>• Model title (≤ 80)<br>• Public creator name (≤ 50)<br>• Description (≤ 280, optional)<br>• **self-contained GLB ≤ 16 MiB**<br>• **JPG/PNG preview ≤ 2 MiB**<br>• Licence: CC0 1.0 / CC BY 4.0 / CC BY-SA 4.0<br>• A rights checkbox<br>The form sends `POST /api/models` with your signed-in session. Owners can **Unpublish**. |
| Upload API for scripts | **None.** There is no API key or token; uploads need the ChatGPT sign-in session in a browser. Community list at inspection time: **0 submissions**. |
| Category / tags on upload | Not offered by the form, so the key terms go into the title and description, written naturally |

## 2. How MAKE VIDEO uses it (vault first)

```
VOICEOVER → story analysis → shot list (objects per scene, camera distance, era, real size)
  → node tools/tf-ext/vault/select.mjs shots.json --out selection.json
       1. search the Model Vault FIRST (name + synonyms; the main noun must be in the name; avoid-words; licence filter)
       2. also consider the local premium library (asset-library/catalog.json)
       3. download the top candidates (publisher URL, verified: GLB magic/version/length, declared size, sha256)
       4. evaluate each (quality.mjs) FOR ITS CAMERA DISTANCE: geometry detail, texture resolution, PBR coverage,
          UVs/normals, real-world size, decoders needed, renderer compatibility
       5. pick the best score ≥ 55, or mark the object "create"
  → prepare (asset manager: scale/orientation/LOD/cache) → scene → render (only when you ask)
  → original models created on the way → publication bundle (needs your approval)
```

The evaluator scores per distance:
- **hero** (close-up) asks for 40k+ triangles, 2k textures and full PBR;
- **far** accepts light meshes;
- poor or wrong models are never chosen just because they exist.

Tested on 4 needs:

| Need | Result | Score |
|---|---|---|
| Aircraft hangar | vault #45 "Aircraft Hangar" (tevy) | 78 |
| Brick factory | library façade | 88; the vault's Innerscene factory came in at 72 |
| Street lamp | vault #2156 | 88 |
| Rooftop camouflage house | nothing suitable, so **create** | — |

## 3. Missing-model creation workflow

`node tools/tf-ext/vault/create/runner.mjs <model> --out <dir>` runs these steps:
1. Builds the model in headless Chromium with three.js (the project's own r180).
2. Generates **procedural PBR textures**: colour, a normal map derived from the same height field, and roughness, all tileable, with **metre-based UVs**.
3. Merges meshes per material **inside each named part**, so the parts stay separate and movable.
4. Exports a binary **GLB** with the official GLTFExporter.
5. Renders a **product preview** (image-based lighting, soft shadows, front and back views). This is a still image for the vault listing, not video.

A new model is one file in `vault/create/models/` exporting `build()`.

**First original model: "1940s Rooftop Camouflage Prop House — Canvas & Timber Stage Set"**
- Historically guided by the Boeing source notes: painted canvas over a timber stud frame, a canvas roof painted as shingles and sagging between the rafters (real geometry), painted door/windows/shutters with real 3D trim, battens, and an **open braced back**.
- 16k triangles, 11 meshes, 9 PBR materials at 2K, 8.8 × 5.0 × 9.1 m, Y-up, 4.0 MiB.
- Parts: Frame, CanvasWalls, CanvasRoof, PaintedDetails, Chimney, LawnMat.
- Scores: mid 80 "excellent", hero 55 "usable". It is honest: this light stage-set prop is not a close-up hero asset.

## 4. Publishing workflow (nothing goes public without your approval)

1. `node tools/tf-ext/vault/publish.mjs prepare <slug>` runs these checks:
   - registry entry and metadata (title ≤ 80, not generic; description ≤ 280; allowed licence; original or redistributable);
   - GLB integrity, ≤ 16 MiB; preview ≤ 2 MiB;
   - static quality (UVs, normals, extensions);
   - **duplicate detection**: name similarity against all 2,501 entries and community uploads, the exact file hash, and a geometry fingerprint against the registry.

   It writes `asset-library/publish/<slug>/`: `model.glb`, the preview, and `FORM.txt` with the exact field values.
2. **Upload**, which needs your signed-in browser:
   - **Manual (works today):** open the site, scroll to the **bottom → Publish a model**, sign in with ChatGPT, and copy the fields from `FORM.txt`.
   - **Browser automation (optional, later):** if you connect your own computer to a Claude session (Claude in Chrome / built-in browser) where you are signed in, Claude can fill and submit the same form. That needs your explicit authorisation, never a pasted password, cookie or token.
3. `node tools/tf-ext/vault/publish.mjs verify <slug>` checks the public `/api/models` list for the title and downloads the public file to confirm its **sha256 matches**. Only then is the registry status set to `published`.

### Authorising automatic publishing later

After the first upload is verified, you can say, for example:
> "I authorise automatic publication of new original TwistFrame models to my Model Vault under CC BY 4.0 as 'TwistFrame Lab', through my signed-in browser."

Claude records that in `asset-library/vault-registry.json` (`autoPublish`). Later bundles that pass every check are then submitted through your browser session and verified. You can revoke this at any time. Third-party models are never uploaded unless their licence allows redistribution, and they are never credited as ours.

## 5. Files

| File | Role |
|---|---|
| `tools/tf-ext/vault/client.mjs` | Index, community list, verified downloads (curl, proxy-aware) |
| `tools/tf-ext/vault/quality.mjs` | Static quality metrics + distance-aware scoring (meshopt decoding supported) |
| `tools/tf-ext/vault/select.mjs` | Automatic asset selection (vault first, then library; "create" when nothing is good enough) |
| `tools/tf-ext/vault/create/` | Original-model builder (runner, page, PBR helpers, `models/*.js`) + preview generator |
| `tools/tf-ext/vault/metadata.mjs` | Title / description generator + validator matching the site form |
| `tools/tf-ext/vault/duplicates.mjs` | Duplicate detection (name, file hash, geometry) |
| `tools/tf-ext/vault/publish.mjs` | Prepare / verify / status; `asset-library/vault-registry.json` = model + licence registry |
| `tools/tf-ext/vault/test-vault.mjs` | Tests (read-only against the public site) |

The original model's GLB and preview files are kept **out of the public git repository** (gitignored) until you approve publication. The generator code can rebuild them exactly.

## 6. Known limitations

- Each publisher host must be allowed in the environment's network settings. tevy.dev, Innerscene (+ files.innerscene.com), Poly Haven, Rail Island, 3dassets.dev, Smithsonian, GitHub and Hugging Face are allowed now. Hugging Face downloads redirect to an LFS CDN that is still blocked.
- "Procedural JS" entries (Rail Island, 242) export GLB only through the publisher's web page, so they are not automatically downloadable.
- Some vault GLBs use meshopt + KTX2/Basis textures. The evaluator reads them, but the scene loader needs a KTX2 decoder for those textures, or a decompression step in prepare. The evaluator flags this.
- The vault's own category labels mix two schemes (8 broad groups + detailed paths). Selection relies on names, synonyms and categories together.
