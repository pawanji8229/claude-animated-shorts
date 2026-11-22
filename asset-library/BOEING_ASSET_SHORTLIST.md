# Boeing fake-neighbourhood video: asset shortlist (preparation only; the Boeing production is NOT modified)

Historical guide: the production's `SOURCE_NOTES.md` on `render/twistframe-boeing` (99% Invisible "Prop Town", Cascade PBS
Mossback's Northwest, Warfare History Network, Flying magazine). Plant 2's rooftop "town" (about 1944–46) was **not built from
ordinary full-size houses**. It was a lightweight stage set built to read correctly from the air:
- canvas stretched over light timber frames;
- burlap-over-chicken-wire shrubs;
- chicken-wire trees with feathers;
- painted streets.

So rooftop assets must be **light, hollow, prop-like**. Real full-size houses belong only in the surrounding city.

Legend: **R** = ready in the library (CC0, verified); **S** = Sketchfab CC-BY candidate (needs your token + attribution); **G** = gap.

## 1. Rooftop camouflage structures (the hero of the story)

| Need | Asset | Status | How |
|---|---|---|---|
| Canvas house walls / roofs | `polyhaven:white_planks_clean`, `polyhaven:weathered_plank_siding` (painted look), ambientCG `Fabric*` was not suitable | R | Keep the current procedural canvas-over-frame houses (they are correctly hollow), but re-skin them with these PBR maps |
| Light timber framing + bracing | `polyhaven:roof_planks`, `ambientcg:Wood089` (plywood) | R | PBR wood on the existing frame geometry |
| Chicken-wire trees / shrubs | `ambientcg:Fence003` (wire mesh, colour + opacity + normal) + `ambientcg:Leaf001` leaf alpha cards | R | Mesh shell with the wire texture plus scattered feather/leaf cards; instanced |
| Burlap shrubs | — | G | No CC0 burlap found. Use a coarse fabric look built from `Fence003` normal + an earth colour, or add one later |
| Painted fake streets on the roof | `polyhaven:tarred_gravel` (tar-and-gravel roof deck), `ambientcg:Gravel043`, `ambientcg:Asphalt033` | R | Roof deck = tarred gravel; painted roads = asphalt with the current paint stripes |
| Lawn paint / fake grass | `ambientcg:Grass004`, `polyhaven:sparse_grass` | R | Flat painted lawns: use the colour/roughness only (no displacement) |

## 2. 1940s Seattle architecture (real city around the plant)

| Need | Asset | Status |
|---|---|---|
| Brick factory / warehouse façades | `polyhaven:modular_factory_facade` (doors, windows, garage door, trim), `polyhaven:factory_brick`, `polyhaven:red_brick_03` | R |
| Apartment blocks | `polyhaven:modular_urban_apartments_facade`, `polyhaven:modular_fire_escape`, `polyhaven:modular_metal_gutter` | R |
| Craftsman bungalow (typical Seattle house) | `sketchfab:47926c5c6e1f47df81571e60d513d14b`, "Craftsman Bungalow" by RCE (364k faces; LOD for distance) | S |
| Clapboard siding, roofing | `polyhaven:weathered_plank_siding`, `polyhaven:roof_slates_02`, `polyhaven:grey_roof_tiles`, `ambientcg:RoofingTiles014B` | R |
| Streets, sidewalks, brick streets | `polyhaven:asphalt_02`, `polyhaven:worn_asphalt`, `polyhaven:brick_pavement`, `polyhaven:smooth_concrete_floor` | R |
| Street furniture | `polyhaven:modular_electricity_poles`, `modular_electric_cables`, `street_lamp_01`, `fire_hydrant`, `water_manhole_cover`, `metal_trash_can`, `modular_chainlink_fence` | R |
| Sky / light | `polyhaven:overcast_soil_puresky` (Pacific-Northwest overcast), `kloofendal_48d_partly_cloudy_puresky`, `cloud_layers` (aerials) | R |

## 3. Aircraft factory interior (Plant 2)

| Need | Asset | Status |
|---|---|---|
| Overhead gantry crane | `polyhaven:overhead_crane` (90k tris, 12.5 m) | R |
| Machinery | `polyhaven:old_drill_press`, `old_military_compressor`, `portable_welding_cart`, `power_box_01`; Sketchfab "Abandoned Lathe" (466k, scan) | R / S |
| Benches, carts, storage | `polyhaven:tool_cart`, `industrial_storage_cart`, `worn_metal_rack`, `metal_toolbox`, `metal_tool_chest`, `bench_vice_01`; Sketchfab "Old Work Bench" | R / S |
| Hand tools for workers' props | `polyhaven:adjustable_wrench`, `pipe_wrench`, `wooden_hammer_01`, `handsaw_wood`, `measuring_tape_01`, `small_oil_can_01` | R |
| Pipes, ducts, cables | `polyhaven:modular_industrial_pipes_01`, `modular_pipes`, `modular_airduct_circular_01`, `modular_electric_cables` | R |
| Industrial lights | `polyhaven:hanging_industrial_lamp`, `caged_hanging_light`, `industrial_pipe_lamp` (1930s style; **not** `mounted_fluorescent_lights`, which are 1950s) | R |
| Containers | `polyhaven:Barrel_01`, `barrel_03`, `cardboard_box_01` | R |
| Floors / metal | `polyhaven:hangar_concrete_floor`, `concrete_floor_worn_001`, `ambientcg:MetalWalkway010`, `ambientcg:Metal049A` (bare aluminium for B-17 skins), `polyhaven:metal_plate` | R |
| Interior light | `polyhaven:autoshop_01` HDRI (industrial interior) | R |

## 4. Boeing-era aircraft

| Need | Asset | Status |
|---|---|---|
| B-17 Flying Fortress (hero) | `sketchfab:927f07f6ddcf470ab0387ce5829024d5`, "Boeing B-17 Flying Fortress" by helijah, 394k faces, CC-BY | S |
| B-17 (line copies) | `sketchfab:15d99f2396f7464cb2fb4098f2c234af`, "B17" by manilov.ap, 77k faces, CC-BY | S |
| Boeing 247D (Boeing airliner, 1933) | `sketchfab:d18128eeb6fb4ecbaba65c45cd414ffb` by helijah, CC-BY | S |
| Note | The current procedural B-17 (`boeing/b17.tsx`) stays the default. A Sketchfab B-17 would replace it only after your approval and a test still. | |

## 5. Vintage vehicles + rail (Marginal Way, rail spur)

| Need | Asset | Status |
|---|---|---|
| 1940s fire truck | `sketchfab:9548e406e29e49e18a7ea39a4de1111d`, "FREE 1940s US Fire Truck (American LaFrance)" by robinmikart | S |
| Military truck | `sketchfab:74d0770c6b06489f97c8d65fd42c37c7`, "Chevrolet WB 30 CWT Truck" by artfletch (995k faces, needs LOD) | S |
| Cars | `sketchfab:e3a9b187643c4bbb84c485b1dd2a53a3` (1938/39 sedan), `sketchfab:f9d327ad3f984899808dbbc845a10506` (1948 Mercury-style), both by robinmikart | S |
| City bus | `sketchfab:3c9c813fedba4f5caf3fe8cefee1bd0c`, "FREE 1940s City Bus (White Motor Co.)" by robinmikart | S |
| Jeep | `sketchfab:80c3dd34239a402f83e09cd93fe0c6a7`, "Willys Jeep US Army" by jeandiz | S |
| Boxcar | `sketchfab:3d2fbeed83494547a0a38db053eb4ff3`, "Union Pacific Railroad Car" by azadbal | S |
| Construction | `sketchfab:b26ce56081304c1988ec7490e439d882`, "D8 Tractor" by artfletch; `polyhaven:wooden_ladder`, `ladder_sectioned_01`; current procedural derrick stays | S / R |

## 6. Vegetation + wildlife

| Need | Asset | Status |
|---|---|---|
| Real street trees (city, not roof) | `polyhaven:fir_sapling`, `pine_sapling_small` (instance), `jacaranda_tree` (hero only; LODs) | R |
| Shrubs, flowers, grass clumps | `polyhaven:shrub_01`, `periwinkle_plant`, `dandelion_01`, `grass_bermuda_01` | R |
| Gulls / pigeons | `sketchfab:f3fa166ff6bd4ffe8133f6f6eed74d64` (seagull, 224k), `sketchfab:ddd5ef4a94eb4159937a9de25c45697c` (pigeon, 7k) | S |

## 7. Sound (matched against the Boeing cue list by `match-sounds.mjs`: 18 of 22 cue kinds have recorded candidates)

| Cue | Recorded candidates |
|---|---|
| Footsteps on concrete / gravel roof | `kenney:impact-sounds/footstep_concrete_*`, `kenney:rpg-audio/footstep*`, `mixkit:1274` (gravel) |
| Framing hammers, saw, lumber, canvas | `mixkit:830`, `mixkit:827`, `kenney:impact-sounds/impactPlank_medium_*`, `kenney:rpg-audio/cloth*` |
| Rivet guns, metal | `mixkit:798` (light hammering on metal), `mixkit:2980`; keep the synthesised rivet bursts as the main layer |
| Hangar door | `mixkit:200`, `mixkit:1534` |
| 1940s truck | `mixkit:1620`, `mixkit:1621`, `mixkit:1626` (modern recordings: use under the synthesised period engine) |
| Office | `mixkit:1372` (typewriter), `mixkit:1060` (clock), `kenney:rpg-audio/bookFlip*` (paper) |
| Rooftop wind, gulls | `mixkit:1267`, `mixkit:2658`, `mixkit:1188` |
| Transitions | `mixkit:1474`, `mixkit:1486`, `mixkit:1482` |
| WWII propeller aircraft | **gap**: keep the synthesised drone (or a Freesound recording with your key) |

## To unlock the Sketchfab items

Create or sign in to a free Sketchfab account and copy your API token (Settings → Password & API). Give it to me through the secure credential form; I never see the value. I can then download the S items above, verify and inspect them, and add their attribution lines.
