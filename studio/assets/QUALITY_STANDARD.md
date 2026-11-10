# TwistFrame Lab — visual quality standard for 3D assets (pipeline v3)

The look stays the same: approved earless 2D cartoon characters on camera-facing cards, inside detailed, cinematically
lit 3D worlds, with ink outlines and glowing faces. This standard covers the **3D world**.

## 1. Where every asset comes from

| source | licence | what it is used for |
|---|---|---|
| Poly Haven (polyhaven.com) | CC0-1.0 | props, furniture, structures, facades, ships, rocks, plants, PBR texture sets, HDRI skies |
| `@pmndrs/assets` (npm) | CC0-1.0 | small HDRIs and tileable normal maps (optional) |
| TwistFrame originals (procedural three.js in `src/productions/*/assets.tsx`) | ours | trucks, excavator, truck crane, mixer, cargo ship, quay crane, granite blocks: articulated machines with real pivots |

- Every third-party file is listed in `assets/registry.json` with its page URL, authors, licence, original and optimised triangle counts, file size and bounds.
- Never add an asset without a registry entry. Never copy assets whose licence is unknown or that require permission.

## 2. Requirements for an asset in shot

1. **Silhouette.** It must read as the real object at thumbnail size, with no box standing in for a vehicle, building or machine. The scene audit (`__audit`) flags untextured primitives covering more than 4 % of the frame.
2. **Proportions.** Use real-world metres. Poly Haven models are already metric. Use `height=` only to match a specific real object.
3. **Materials.** Use PBR textures (colour, normal, roughness or ARM) or a believable procedural material.
   - Large areas (ground, walls, roads) always get a texture set with real-size tiling (`Ground tile=`, `PbrBox tile=`).
   - No large flat single-colour surfaces close to camera.
4. **Ground contact.** The object sits on the ground and casts and receives shadows. The shadow camera covers the shot area (`<Sun span>`). Never leave a floating object or a missing contact shadow.
5. **Close-ups.** Use the full-detail model and 1024 px textures, and keep DOF focus on the subject.
6. **Background.** Objects beyond `quality().lodNear` metres use the LOD1 mesh (about 25 % of the triangles, 512 px textures). Repeated objects (barrels, rocks, trees, lamps) use `<Instanced>`, which costs one draw call per material.
7. **Animation.** Articulated parts rotate about real pivots, for example the excavator boom, stick and bucket, the crane slew and luff, and wheel spin linked to distance travelled. Every motion is a pure function of the frame number, with no state carried between frames.
8. **Triangle budgets after optimisation** (`pipeline/assets/optimize_library.mjs`):

   | type | budget (triangles) |
   |---|---|
   | ships | 60k |
   | buildings and structures | 50k |
   | trees | 45k |
   | props and furniture | 15k |
   | rocks and ground cover | 12k |

   Photoscanned foliage over 1M triangles (Poly Haven grasses and pine/fir trees) is not used directly.

## 3. Optimisation rules (measured, see `benchmarks/`)

- **One render per frame.** Set `__singleRender` in every new production. The legacy double render costs 1.5–1.8×.
- **Shared geometry and materials.** `Model` clones only the node tree, `usePbr` caches materials, and the loaders cache per tab.
- **Shadow maps sized to the shot** (`quality().shadowMap`), with tight shadow-camera bounds instead of huge maps.
- **No planar reflection pass.** Water reflects the HDRI through `scene.environment`. A `MeshReflectorMaterial` renders the whole scene a second time.
- **No per-frame rebuilds.** Heavy objects belong in `useMemo`. Only genuinely animated vertices (water) update per frame.
- **WebP textures, at most 1024 px.** No 4k or 8k maps in a 1080×1920 vertical frame.
