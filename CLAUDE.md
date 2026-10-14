# CLAUDE.md — Irbid Drive

Permanent project context for Claude Code sessions. **The current game is the reference implementation.** Read
"Important Constraints" and "Instructions for Claude" before touching anything.

> Status: v37 = v36 + real SRTM terrain + audit-driven physics fixes (see the v37 note). Before: v35 = v33 real OSM streets + v34 real OSM building footprints + v35 real OSM shops/places (see the v35, v34 and v33 notes). `dist/irbid-drive.html` is the published build. Facts below marked v1-v32 describe the OLD hand-authored map where they mention streets/coordinates; the v33 note overrides them.

---

> **v37 REAL TERRAIN + PHYSICS AUDIT FIXES (owner request: full realism/accuracy audit):**
> - **Terrain** (was completely flat, `hillH=()=>0`): `osm/terrain/srtm_1km.json` = SRTM v3 1 arc-second (~30 m) heights from the OpenTopoData public API (`srtm30m`, NASA/USGS; retrieved 2026-10-13), sampled on a 1 km grid (31x26 points, request coordinates rounded to 0.001 deg); `osm/terrain/gen_terrain.py` -> `src/parts/03d_terrain_data.js` (GENERATED, `TERR`). `03_world_data.js`: `terrRaw` (Catmull-Rom bicubic) and `TH(x,z)=terrRaw-T0` (Al-Balad origin = 0 m; real elevation there ~570 m; map spans ~240-1120 m). `groundH = TH + .12 (+ ramps)`.
> - Architecture = **flat-frame authoring + one terrain pass**: every generator still builds at y=0; `12c_terrain.js` `applyTerrain()` (called once at the end of `12_hud_loop.js`, before the loop) lifts the static world: per-instance matrices of InstancedMeshes (ground-standing boxes >=12 m2 get a skirt down to the lowest footprint corner), every vertex of identity-transform merged meshes (road ribbons, sidewalks, wires), and `position.y` of other top-level objects. Skipped: player/traffic/bots/cops/showcar meshes, beacons, nav dots, sky dome, `gnd`. Dynamic code uses `TH()` directly (never `hillH`, which stays 0). Anything that creates world objects AFTER the pass must add `TH(x,z)` itself (labels in `11b_nav.js` do). `05a_roads.js`: ground follows TH (`GDROP` .08, analytic normals), `ribbonE` cuts segments to <=30 m (`RSUB`) so roads follow the slope.
> - Limits: 1 km sampling cannot resolve narrow wadis/cuts; SRTM is a surface model (vegetation/buildings); rigid landmark groups and big meshes are lifted as one piece (may float/sink a little at slope edges); max road grade 31.9% (west escarpment); only a 4 km radius of Al-Balad is mostly <12%.
> - **Physics (priority 3)**, `10_laws_player.js` `updP` + `07b_tune.js` `applyTune`: braking is now `P.bk` = 9.81 m/s2 x (suv/pickup 0.8, race 1.1, others 1.0) x surface factor (was a flat 16 m/s2 = 1.63 g); reverse accel 3.5 m/s2 (was 8) and the 2x throttle-in-reverse is capped by `P.bk`; **slope gravity** `-g*sin(grade)` along the heading (rolls on grades >=15% with no input; brake/handbrake hold it; stunt ramps are excluded because they come from `RAMPS`, not TH); `surfK()` traction factor (1 paved road / drift pad, .75 `track`, .9 urban ground off-network, .65 open ground; **heuristic, no OSM `surface` tag is carried in the network data**); cosmetic body pitch (`P.bp`) and roll (`P.br`) from longitudinal accel / yaw-rate x speed (visual only). Economy, drift scoring, save format, HUD strings unchanged. Check: `node tests/phys_brake.js dist/irbid-drive.html` (100-0 km/h 36.3/36.5/36.9 m at dt 1/30, 1/60, 1/120), `tests/phys_audit.js`, `tests/terr_check.js`, `tests/dyn_check.js`, `tests/slope_stats.js`, `tests/drive_pw.py` (real browser).
> - Still NOT modelled (no per-car data to do it honestly): mass/CoM, torque curves, gears/RPM, suspension, lateral grip by surface, tyre model.

> **v22 addition (rendering only):** `src/parts/07a4_carvis.js` is the per-car visual engine (`generateUniqueCarStats` -> `finalizedUniqueVehicles`, lookup `carV(idx)`): name-hashed dual HSL neon pair (unique hue per model), light-line layout, a 10,000-pixel (100x100) detail sheet per car drawn on body decals (side/top/front/rear; the underglow footprint is kept as data but no longer rendered) and drift-exhaust profile (count/s, pixelSize, alphaFadeRate, square vs cross). `12a_fx.js` reads it for the drift stream. Its `physics` block is generated but **not applied**. `PORS` actually holds 217 models (earlier text saying 136 was wrong). Check with `node tests/uq.js dist/irbid-drive.html`.

> **v24 display lock:** the WebGL canvas (`#game`) is forced to a 1920x1080 buffer (pixel ratio 1) by `initialize1080pGameDisplay` in `02_setup.js`; composer/bloom/camera aspect use `DISP`; window size only re-fits the 16:9 canvas via CSS (letterboxed). `crisp2d()` sets imageSmoothingEnabled=false on the 2D canvases (minimap every frame, wheel, labels). Check with `python3 tests/disp.py dist/irbid-drive.html`.

> **v25 place patch (approved by owner):** `src/parts/06h2_final_patch.js` (runs after `06h_gen.js`, no `PR()` calls) holds `final_missing_places_patch`. Four of its five places already existed and are skipped; **Vogo Cafe** (University Street, beside MK Mart) is new, so `PLACES` is now 1,244 = the original 1,243 (unchanged coordinates) + Vogo Cafe. Check with `node tests/h21.js` and `node tests/vg.js dist/irbid-drive.html`.

> **v26 shop access:** `TuningShopInterface` (08c_shop.js). Touch devices only: a TUNE CAR / CLOSE SHOP button on a 1920x1080 2D overlay (`#hud2d`); PC: no overlay/listener, keyboard `U` or `P` (P also closes). Same `openShop()`/`closeShop()` (14 m proximity rule) for both. Check with `python3 tests/shopt.py dist/irbid-drive.html`.

> **v27 touch driving:** `10b_ios_touch.js` (`iOSBypassEngine`) is armed on touch devices only. Pads in 1920x1080 canvas coords (bottom band): LEFT x<400, RIGHT 400-800, BRAKE 1200-1500, GAS >1500, plus DRIFT/handbrake pad (x>1500, y 440-700). They feed `MobilePCInputController` (declared in `10_laws_player.js`), which `updP` ORs with the keyboard. Canvas has `touch-action:none`; viewport is non-scalable; minimap ignores pointers on touch. Check with `python3 tests/ios.py dist/irbid-drive.html` (emulated multitouch; not a real iPhone).

> **v30 shop placement (owner request: "put each place in the correct spot, not random"):** the 990 generated "Spot #N" businesses (`06h_gen.js`) are now fitted to their type instead of scattered: `GEN_FIT` (business type -> districts/streets, e.g. car showrooms on Petra St / the Amman-Irbid highway, auto parts + hardware + pet supplies on Thalatheen St / Hakama, cafes/shawarma/electronics/gyms on University St, dukkans/barbers/bakeries in Al-Balad, Al-Hai, Barha, Nuzha, Aidun) via `genFit(type,spotNo)` (no `PR()` draws; same seeded call order). `06g_pack.js`: new `/student strip/` zone rule, `packSite` accepts `fbr` (per-type fallback street list). `06h2_final_patch.js` (Vogo Cafe) now runs **before** `06h_gen.js` so University Street frontage is reserved for it (build order changed). Named landmarks/places keep their coordinates (check: `node tests/h21b.js dist/irbid-drive.html out.json` also prints `FMP`/`GEN_FAIL`; `node tests/gen_fit.js dist/irbid-drive.html x.json` checks no generated shop sits on a road and lists streets per type). Honest limit: the 990 businesses are fictional filler (no real coordinates exist for them) and the map is hand-authored, not georeferenced - no real OSM data is reachable from the sandbox. `build.py` now uses paths relative to the project folder.

> **v31 CSV place nodes (owner file `irbid_complete_all_places_map.csv`, 7,500 rows: Place_ID, Name, Category, Latitude, Longitude, Sector_Zone):** `src/parts/06k_csv_places.js` (after `06j_veg.js`). 7,499 rows are generic filler ("Irbid Mall Node #N" etc., 10 categories, 4 rectangular zones, uniformly scattered); the one named row, *Corner salon for men*, already exists in the game (Corner Salon for Men at 693,87) and is skipped - the CSV would put it ~2.2 km south, so its coordinates were NOT applied. Lat/lon -> game metres uses a two-anchor similarity fit (Irbid 32.55N 35.85E -> Al-Balad (180,-20); Yarmouk University 32.5375N 35.85556E -> (861.2,1492.0); scale 1.12, rotation 3.6 deg); the converted metres are baked in as `CSVD` ([catIdx*4+zoneIdx, x*10, z*10] triples). Names are rebuilt as `Irbid <Category> Node #<n>` (n counts per category in Place_ID order; Barbershop starts at 2 because row 1 used #1).
> - Kept OUT of `PLACES` (still 1,244, so the per-frame PLACES loops did not grow): `CSVP` list + `CSVG` 200 m spatial grid. Hooks: `navIndex` (search/route; flagged `g:1` so real places rank first), `poiNear` (`csvNear`, only when no real place is near; generic so no toast), `drawMap` (`csvDots`, 2x2 px dots, grid lookup, ~85 us/frame), and one coloured roadside sign + pole per place (instanced, LOD 230 m, no colliders; signs on the carriageway are moved to the verge, registry coordinates stay exact). New nav keywords `cleaner`, `tech`. v32: signs that fell inside a building footprint or on a carriageway (842) are nudged to the nearest clear spot (`p.sx/p.sz` = sign position; `p.x/p.z` stay exact); audit with `node tests/place_audit.js dist/irbid-drive.html` (expects 0 signs in buildings/on roads; the game's own 1,244 places: 0 out of bounds, only Bank and Yarmouk University anchors on a road, Al-Hassan Stadium/Medeenat Al-Hasan share one site).
> - Honest limits: ~64% of the points are >80 m from any game road (the game's streets do not cover the CSV rectangles), 404 land on a road and 437 inside an existing building footprint; nav routes to the nearest road (max ~960 m). Coordinates depend on my anchor fit - they are not verified real locations. Check: `node tests/csv_test.js dist/irbid-drive.html` (expects CSVP 7499, PLACES 1244, 0 coordinate mismatches, no route failures; needs `csv_pts.json` next to it) and `node tests/cs_check.js` (on-road/in-building stats).

> **v35 REAL OSM SHOPS / PLACES (owner request: "fix all shops ... make distance accurate"):** the ~1,200 invented shops (990 "Spot #N" generated + the 200 pack shops "Dukkan Unit n", "Cafe Link n", ... + invented gyms, "M Market" x4, C-Town, Irbid Mall Hypermarket, Bergesh, Grand Omaya, Sicilia, Al-Balad barbers / Thalatheen pet shops, Corner Salon) are no longer built (`REALP=true` in `06a_fabric.js`: `packShop`/`gymBuild`/`placeShops` return early, the hand-built shop blocks in `06f_pois.js` are `if(!REALP)`, `runLandmarks` filters those ids). PR() order of everything that is still built is unchanged (all skipped calls were last).
> - Real data: `osm/bld/pois.py` (BBBike gpkg, `points` + `multipolygons` with shop/amenity/leisure/tourism tags; name:en when tagged) -> `bb/pois.json` -> `src/parts/03c_poi_data.js` (GENERATED): `POID=[[x*10,z*10,kind,name,nameEn,categoryLabel]...]` (1,018 rows: 367 shops, 158 food, 102 cafes, 85 mosques, 68 medical, 60 supermarkets, 40 schools, 32 barbers, 19 banks, ...) + `RLP(re,fb)` real coordinate lookup (used to put MK Mart and Sameh Mall at their real OSM spots via `'@'` sites).
> - `src/parts/06l_real_pois.js` (after `06k`): registers each POID row as a PLACE (`p.real=true`, `p.alias` = other spelling + category, `ax/az` = nearest road point, `sub` = category + street) unless a kept landmark of the same kind is within 80 m (any kind 42 m). Label (`p.lbl` + `LAZYL`) on the front of the real building that contains the point (`rbAt` index built in `placeReal`), else floating at 5.5 m; labels in one spot stack upward. No new buildings. Names are mostly Arabic (rendered by the canvas label); search matches Arabic, the English alias and category keywords (`NKW`). PLACES is now ~1,000 real + ~36 hand-built landmarks (was 1,244 invented).
> - `06c_campus.js`: generated faculty blocks are skipped where the real extract already has >=2 buildings (`realCnt`).
> - Kept as game venues (not real shops, legacy positions): Irbid City Center + HyperMax, EcoCharge, Al-Hasan Mosque Square, cultural center, football cage, drift lot, Vogo Cafe (owner request), church tower / fortress walls / central bank (hand-built landmarks).
> - Honest limits: only ~39% of OSM POI nodes fall inside a mapped building footprint (OSM building coverage is partial, POI nodes are approximate); search/nav distance = straight line to the real point, route distance = road route to the nearest road point; shops that exist in reality but are not in OSM are absent; the 7,499 CSV nodes (`06k`) are still fictional filler. Tests: `tests/h24.js`/`vg.js`/`h14.js` were pointed at names that still exist (`bad 2` in h24/vg = the deliberately removed M Market / C-Town searches).

> - **v35b (follow-up, owner: "fix it"):** the remaining invented venues are also gone under `REALP`: Irbid City Center + HyperMax (`06f` block / `hypermax_` landmark), the five custom pack venues (EcoCharge, Al-Hasan Mosque Square, cultural center, football cage, drift overflow lot; `runPack` skips `CUSTOM`), Al-Husun church tower, Al-Saraya fortress walls, Central Bank branch, Summit International Academy, Tariq Park, Vogo Cafe (`06h2` skips `vogo_`/`summit_`; the real OSM "vogo..." restaurant is searchable as "Vogo Cafe" via alias), and the 7,499 fictional CSV nodes (`06k`: `REALP` makes `CSVP` empty, no signs/dots; `tests/csv_test.js` no longer applies). Wasfi At Tal Square is seeded at its real OSM point (`RLP`). `pois.py` also exports named OSM parks (14, kind `park`). What remains hand-built: real-seeded landmarks (Dar As-Saraya, Beit Arar, Nabulsi House, Clock Tower, Souq, Eimar/Wasfi parks, Wasfi square, Arabella, Nissan, MK, Sameh, stadium/drift zone, campuses, hospital) plus the two game-mechanic places (Bank for the heist, Apex Drift Customs). PLACES = ~1,038.

> **v34 REAL OSM BUILDING FOOTPRINTS (owner request: buildings were not where they really are):** source = owner-supplied BBBike GeoPackage extract (`osm/bld/irbid.gpkg`, lon 35.809-35.89 / lat 32.476-32.624, OSM data timestamp 2026-10-10, ODbL (c) OpenStreetMap contributors). `osm/bld/conv.py` (sqlite3 + shapely + pyproj, same tmerc as `LL2XZ`) turns `multipolygons` `building=*` into oriented-rectangle pieces (L/U shapes split into several boxes) -> `bld.json` -> `src/parts/03b_bld_data.js` (GENERATED, never hand-edit): `BLDD={cover,p:[x*10,z*10,w*10,d*10,ang*100,h*2,tc|8=continuation]...,n:[[x,z,name,building,amenity,shop,tourism,historic]...]}` + `RL(regex,fallback)` = real centroid of a named OSM feature. 19,640 buildings (738 with building:levels, 187 with height); other heights = deterministic estimate by type/area/density.
> - `06d_fabric_driver.js` `placeReal()` (late stage, after all places/landmarks, before generated hub loops): places each piece through `addBld`/FACI (style by tags/area/density, colours generated), skips pieces overlapping roads (min half-width 2.4 m, pad .4, tunnels skipped), landmarks/occupied cells, stadium/park/mall/drift-circle areas; shrinks (1..0.6) to clear roads. 19,238 pieces placed; `styleFor` returns null inside `inCover` (extract rectangle) so generated fabric only fills OUTSIDE the extract. No `PR()` use.
> - Landmarks use `RL()` real seeds: new `'@'` pseudo-street in `siteBeside` = `siteNear` at the real seed (Dar As-Saraya, Beit Arar, Nabulsi House, Eimar Park, Nissan, Clock Tower/Souq via `CLKG/SOUQG`). Arabella Mall is built from its real OSM footprint (`MALL.x/z/r/ang/k`); fallback = old procedural block. PLACES still 1,244 (coordinates of non-OSM-backed places unchanged from v33).
> - Perf (SwiftShader draw calls, 4 viewpoints): v33 1.5-2.3k calls / 1.15-1.22 M tris -> v34 2.5-2.9k calls / 1.52-1.57 M tris.
> - Honest limits: OSM coverage is incomplete (empty blocks where buildings are unmapped); footprints are rectangles, roofs flat; heights/styles/colours mostly generated; ~1,000 pieces dropped (conflicts) and ~3,400 shrunk; YU/YUS campuses keep procedural `campusFill` blocks; shops/filler/CSV nodes still fictional positions; outside the extract (JUST, Jadara, INU, far edges) buildings are still generated. Tests: `tests/place_audit.js` (0 CSV signs on roads, 2 of 7,499 inside buildings; its old "oob" bounds check is stale), `tests/lmchk.js`, `tests/cov.js`, `tests/dc.py` (draw calls).

> **v33 REAL OSM STREET NETWORK (owner request: "REPLACE THE GRID WITH REAL IRBID ROAD GEOMETRY"):** the hand-authored road list (`RDS`, `CIRC`, old node ids like `J_BU`) is gone. `src/parts/03a_net_data.js` (GENERATED, never hand-edit; `NETD`/`NETE`) is packed by `osm/gen_world.py` + `osm/net.py` from OpenStreetMap `highway=*` ways (Overpass, bbox 32.45-32.60 N / 35.75-35.95 E, split into north/east/south/highways files in `osm/`, ODbL, (c) OpenStreetMap contributors; the attribution overlay `#osmcr` must stay in `01_head.html`).
> - Network: 26,083 nodes / 37,371 edges / 4,608 km, 29.2 x 24.4 km extent, 99.4 % in one connected component, 7,615 one-way edges, 142 roundabouts, 177 traffic signals (14 OSM-mapped + inferred at junctions with >=3 arterial arms), bridges/tunnels keep topology (drawn on one level via layer order). 587 map gaps <=3 m were repaired. Edge fields: `{id,name,nameAr,w,lim,ow,kind,hw,a,b,pts,cum,len,nx,nz,br,tn,ly,rb,fz,hub,hd,mx,mz}`; widths and speed limits are class-typical unless OSM tags them (not surveyed). Terrain is flat (no elevation data).
> - Projection: local transverse Mercator, WGS84, k=1, origin 32.55 N / 35.85 E; `x = easting, z = -northing` (+x east, +z south). JS `LL2XZ` (03_world_data.js) equals pyproj to <1 cm (checked at 5 points). CSV place nodes (`06k`) are re-projected with the same transform (their real lat/lon now land where OSM says, no anchor fit).
> - Files: `03a_net_data.js` (data), `03b_bld_data.js` (v34 building data), `03c_poi_data.js` (v35 real place data), `06l_real_pois.js` (v35 place registration), `03_world_data.js` (decode, anchors `RA`, `YUC/JC/HC/INC`, polygons `inPoly`), `04_graph.js` (nodes/edges/HASH/`roadAt`/`roadNear`/heap `route`/`nearNode`), `04b_streets.js` (University axis `UL/uvOf`, street ROLES: legacy street names `VSD` -> real edges, `nearestOn`), `04c_budget.js` (`O2N`/`O` old->real similarity seed, density grid, detail budget `fz`/`hub`/`hd`, `freeSite`, `PARK`, `MALL`, `noBuild`, `distName`/`distDisp`, ZR_* zone predicates), `05a_roads.js` (ribbons from real polylines, chunked by 800 m/layer).
> - Detail budget (performance): HUBS Al-Balad 2000 / YU 1500 / Andalus 1100 / Aydun 900 / Sinaa 700 / JUST 800 / Jadara 500 / INU 500 m; `e.fz` 0-3 gates sidewalks, lights, poles, signs, trees, scrub; buildings are generated along real roads per hub with caps (`06d_fabric_driver.js`), NOT OSM footprints. Load ~11-12 s headless.
> - Legacy content (landmarks, POIs, pack/gen shops, campuses, bank, garage, races) keeps its names/HUD strings but is re-anchored: old seed coordinate -> `O()` -> snapped onto a real road of the named role (`siteBeside`, fallback `siteNear`). So PLACES = 1,244 but their coordinates are NEW (constraint 1 no longer applies; the OWNER AUTHORISED replacing the network). Stand-in mapping of legacy names onto real roads: Palestine St, Baghdad St -> Al-Hashemi, Petra St -> King Hussein east, Thalatheen -> Abd Alhameed Sharaf, University axis, etc. Wasfi Al-Tal Park is drawn at the nearest free rectangle (OSM polygon is 29x18 m); Arabella Mall at the nearest free ground (scaled `k`); the drift pad is an asphalt ring at the real stadium polygon.
> - Fixed along the way: endpoint normal bug in `04_graph.js` (unnormalised arms collapsed ribbon ends and put guardrail colliders on the road centre; bots crawled), race start index (`11_race.js` D0 path), nav/tp anchors for Park and Mall, tour stops (`10_laws_player.js` use `O()`/`PARK`/`MALL`).
> - Tests (new/adapted): `node tests/val_net.js dist/irbid-drive.html` (network validation), `tests/boot.js`, `tests/dups.js`, `tests/tour.js` (all tour stops on roads, expects 0 off-road), h2/h12/h13/h14/h20/h24/h25/vg/csv_test pass. Known: heist test now ends in a bust because cops really catch a parked player; 2-3 of 80 traffic cars may be 1-3 m beyond the carriageway edge while turning at junctions.
> - Honest limits: roads are real OSM geometry, but widths/limits are typical, no elevation, buildings are generated (not OSM footprints), filler shops (990 Spot #N + CSV nodes) are fictional positions, ~3,000 edges carry names (mostly Arabic), legacy named streets are mapped onto stand-in real roads, summit/church landmarks land in real Husn (~7 km south). Do not claim 1:1 for anything but the road centrelines.

# Project Overview

**Irbid Drive** is a single-player, open-world 3D driving sandbox set in a hand-authored 1:1 model of Irbid, Jordan
(roughly 11,800 m × 8,200 m of playable area, ~91 km of road, 1,243 places of interest).

There is no win/lose condition. The player free-roams in traffic, earns money and "drift points", and spends them:

- **Drift points** (score from sliding the car) are spent in the **Apex Drift Customs** shop on per-car upgrades.
- **JD balance** (Jordanian dinar, from the law-fine system and bank-heist loot) is spent on a **wheel spin** that unlocks
  cars. Cars have a rarity tier whose multiplier boosts drift-point earnings.
- Side activities: street races on real road circuits (vs 3 bots), one-on-one duels against traffic cars, a bank heist with a
  police chase, a landmark tour, stunt ramps, a drift zone, and a search / turn-by-turn navigation system.

The game is delivered as **one self-contained HTML file** (published as a claude.ai Artifact; an SEO copy exists for a
standalone site). It has no backend and no network calls except loading Three.js from a CDN.

# Technology Stack

Confirmed by inspection (not assumed):

| Layer | What is actually used |
|---|---|
| Language | Plain **JavaScript (ES2020+)**, no TypeScript, no modules, no transpiling |
| Markup/CSS | One `<style>` block + static HTML overlay elements in `01_head.html` |
| 3D engine | **Three.js r128** (`three.min.js` from `cdnjs.cloudflare.com`), WebGL, `MeshLambertMaterial` (24 uses) + one `MeshPhongMaterial` (road layers) |
| 2D canvas | Only two: the 150×150 **minimap** (`#map`) and the wheel-spin canvas (`#wc`) |
| Framework | None (no React/Phaser/etc.) |
| Persistence | `localStorage`, key `irbid-save` |
| Audio | **None** (no AudioContext / Audio / sound files) |
| Image / font assets | **None** — all geometry, textures and signs are procedural (canvas textures, boxes, instanced meshes) |
| Network / backend | None |
| Build | Hand-rolled `build.py` concatenating source parts in a fixed order into one HTML file |
| Tests | Ad-hoc Node scripts running the built HTML under a stubbed DOM + three.js (`three@0.128.0` from npm), plus Playwright (Python) screenshot scripts |

Language mix in the repo: ~29 JS "part" files, 1 HTML head, Python build/screenshot scripts, Node test scripts.

> **v28 city realism pass (visual only, geography untouched):** four new/extended layers, all `Math.random`-based so no `PR()` consumer moved (verify with `node tests/h21.js`).
> - `02c_facade.js` (after `02b_sky.js`): facade shader `bldF`/`instF` (+`FACI`). Per-instance `aSty` = (style, seed, frontSign, variant). Styles: 1 old-town stone, 2 shopfront, 3 apartment, 4 house, 5 villa, 6 institutional, 7 garage/industrial, 8 office. Paints parapets, stone courses/quoins, arched/rect windows, sills, shutters/blinds, AC units, balconies, floor lines, doors, shop glass, roller shutters, fascia, night-lit windows (`FACU.uFacNight`). `FACQ=0` = lite path on mobile UA. Without GFX it falls back to plain boxes + window quads.
> - `05a_roads.js`: `instO(g,mat,items,shadow,R,CS)` — optional `R` registers the chunk for distance LOD (`lodReg`/`lodTick`, called every frame); `CS` = chunk size (geometry is cloned when CS!=600). Ground carries an `aU` urban attribute (`urbanK`) for town vs field/rock tinting. Keep dependent props on the same LOD radius (poles/arms/lamp heads 420, trunks/leaves 420) so nothing floats.
> - `06i_infra.js` (after `06d_fabric_driver.js`): kerbed sidewalks (300 m cells), zebra/stop lines/arrows, street lights (+night pools, `lampTick`), utility poles + sagging wires, atlas signs (`SGA`), guardrails with colliders, manholes, bus shelters, alley wires, roundabout planting, dumpsters; `FURN` spatial hash (`furnAdd`/`furnNear`) keeps trees clear of furniture.
> - `06j_veg.js`: urban/rural land-use grid (`urbanK`), tree species system (`CANP`, `treeSp`), street trees, olive groves, pines/scrub/limestone rocks, verge scrub. Elevation is deliberately unchanged (only Jadara hill; all places are authored at y=0).
> - Constraints for later work: no `PR()` use in these parts; no per-frame allocation; new props must go through `instO` with an LOD radius; test visually with `tests/snap.py` (captures via `page.screenshot`; the camera override hooks `POST.comp.render`, not `ren.render`, because the HDR composer renders to targets first).
> - Known honest limits: no real OSM/building footprints are available offline, so buildings keep their authored footprints/heights and gain per-building style, colour, materials and detail; hand-built landmarks got materials/stone coursing, not new geometry.

> **v29 racing-wheel support (Logitech G29 + force feedback):** `src/parts/10c_wheel.js` (after `10b_ios_touch.js`; globals `WH`, `WHN`). `updP` calls `WH.poll(dt)` (analog `steer/thr/brk` + handbrake) and `WH.ffb(dt,frozen)`; keyboard and touch values win/stay identical (`thA`/`brA` are 1 for keys; wheel steering is used only when no key steers; steering is a yaw-rate input, so `st=-steer`).
> - Input = Gamepad API. Steering axis, pedal axes and button bindings are set in the in-game setup screen (**key V**, auto-opens the first time a wheel is detected) because OS/browsers number G29 axes differently; bindings dispatch the same synthetic `keydown`/`keyup` the keyboard uses (so every action keeps one code path). Settings are stored under their own `localStorage['irbid-wheel']` (the `irbid-save` format is untouched).
> - Force feedback = WebHID (Chromium desktop, one click on "Connect force feedback"; reconnects automatically after the first grant). Protocol from the open-source Linux `lg4ff` driver: 7-byte reports `0x11 0x08 b 0x80` (slot-1 constant force, `b=128` neutral), `0x13` stop, `0xf5` autocenter off, `0xf8 0x81 lo hi` range. Forces: speed-weighted centring spring, self-aligning pull toward the slide, off-road rumble, collision/landing jolts; zero in menus/countdown; stop on blur/pagehide/disconnect. "Auto-detect direction" pulses the wheel and flips `ffInv` if the wheel moved the wrong way. Fallback: gamepad `vibrationActuator` rumble. 
> - Honest limits: written from protocol knowledge, **not tested on a physical G29** (only against a mock gamepad + mock HID device: `python3 tests/wheel_test.py dist/irbid-drive.html`, 29 checks; `blocked` arg tests a page where the Gamepad API is denied). WebHID/Gamepad access may be denied inside a cross-origin iframe (artifact view) -> open the standalone page/tab. Force polarity, G HUB exclusivity and the G29 PS3/PC mode switch are the likely real-hardware failure points.
> - Test harness note: headless Chromium here does not tick `requestAnimationFrame` reliably and `gfxRender()` costs seconds per frame, so `wheel_test.py` replaces RAF with a manual stepper, stubs `THREE.WebGLRenderer.prototype.render` and `gfxRender`.

# Project Structure

```
irbid-drive-project/
├─ CLAUDE.md, PLAN.md           this context + the refactor plan
├─ build.py                     concatenates src/parts in a fixed ORDER -> dist/irbid-drive.html
├─ package.json                 only devDependency: three@0.128.0 (needed by the Node tests)
├─ src/parts/                   THE SOURCE (one file per concern; order matters, see build.py)
│   01_head.html                <head>, all CSS, all overlay DOM (HUD, shop, wheel, nav), CDN <script>, opens <script>
│   02_setup.js                 renderer, scene, camera, fog, sun/hemi lights, headlights, helper fns (R, wrap, cl)
│   03_world_data.js            hand-authored road network (RDS), circles/roundabouts (CIRC), world constants
│   04_graph.js                 road graph: densify, nodes, spatial hash HASH, roadAt(), route() (Dijkstra), nearNode()
│   05a_roads.js                terrain height (hillH/groundH), merged road ribbons by layer, road colours (KC), instancing helpers
│   05b_decor.js                colliders (COL/colB), traffic lights (LIT), junction markings
│   06a_fabric.js               building "fabric": addPlace/addBld/facade/windows/trees, PLACES registry, colour palettes, occupancy grid
│   06b_landmarks.js            roadSpot(); bank, garage/shop (Apex Drift Customs), start position, key landmarks
│   06c_campus.js               university campuses (Yarmouk, JUST, Jadara)
│   06e_markers.js              INU campus + highway exit terminal, Jadara gates, interchange gantries, Hakama trucking zone
│   06f_pois.js                 100+ hand-placed POIs (salons, shops, venues), showcars, poiAt/poi placement helpers
│   06g_pack.js                 200-place "expansion pack" + gyms + drift zone data (DZONES), seeded PRNG `PR`, placement
│   06g2_lm.js                  16 heritage/supermarket landmark builders (Dar As-Saraya, Beit Arar, MK Mart, Sameh Mall, ...)
│   06h_gen.js                  1,050-place procedural generator (seeded)
│   06d_fabric_driver.js        runs the house/fabric generation (random per load); houseNear()
│   07a0_mat.js                 shared wheel geometry/material used by car meshes
│   07a_cars.js                 PORS = 136 car models [name, topKmh, 0-100s, len, wid, hgt, kind, colour]; mkPorsche() mesh builder
│   07a2_traffic.js             5-tier rarity system (RT/RARN/RMULT/RCH), traffic zones & spawn rules, TPOOL, carMesh
│   07a3_showcars.js            static display/parked cars (colliders always; meshes only within ~300 m)
│   07p_player.js               player object P (1 line)
│   07b_tune.js                 drift{}, tune/owned/cur/fines/spent, localStorage load + save(), PARTS, price(), applyTune(), car select
│   08a_wheel.js                wheel-spin UI + roll logic (tiers from RT); declares `let ui`
│   08b_heist.js                bank heist + cop AI
│   08c_shop.js                 Apex Drift Customs UI, buyPart(), open/close (U key)
│   09_ai.js                    agents on the road graph: traffic[], bots[], path following (updTraffic/updBot/pathFromTravs)
│   10_laws_player.js           fines/laws, wrong-way/red-light/speed detection, teleports, keyboard input, updP() PHYSICS
│   11_race.js                  CIRCUITS, races, duels, rank, race state machine updRace()
│   11b_nav.js                  place index/search, route planning, turn-by-turn UI, POI proximity, label recycling (LAZYL)
│   01b_post_lib.js             minified three r128 examples: EffectComposer, RenderPass, ShaderPass, UnrealBloomPass (+CopyShader, LuminosityHighPass)
│   02c_facade.js               procedural facade shader + `bldF`/`instF` (v28)
│   10c_wheel.js                Logitech G29 / racing-wheel input, setup screen (V) and WebHID force feedback (v29)
│   06i_infra.js                sidewalks, crossings, street lights, poles/wires, signs, guardrails, furniture (v28)
│   06j_veg.js                  land-use tint, tree species, groves, scrub, rocks (v28)
│   06k_csv_places.js           7,499 CSV place nodes: CSVP/CSVG grid, signs, csvNear/csvDots (v31)
│   02b_sky.js                  GFX switch (WebGL2 only; ?gfx=0 disables), procedural sky dome + clouds + stars, reflection env map (CubeCamera→PMREM), world-space asphalt/wall/ground detail shaders (gfxPatch), PBR/clear-coat car paint
│   12a_fx.js                   visual effects: tyre smoke, wet-glare streaks, skid marks, speed-blur strength (fxK); CSS-filter grade only as fallback
│   12b_post.js                 HDR multisampled post chain: bloom → filmic Levant grade + vignette + grain + radial speed blur; adaptive quality fallback
│   12_hud_loop.js              minimap drawing, HUD text, day/night, camera, MAIN LOOP (requestAnimationFrame)
├─ dist/irbid-drive.html        build output (215,725 chars, 1,504 lines) = the shipped game
├─ tests/                       Node + Playwright verification scripts (see Development Commands)
│   val.js                      road-graph validation (no DOM needed)
│   hbase.js, h2.js, h12 ... h25  headless smoke/regression scripts (stubbed DOM, run the real build)
│   legacy/                     older one-off debug scripts (unmaintained)
│   snap.py, shot.py, fx.py, ui2.py   Playwright screenshot scripts (hard-coded paths, see Known Issues)
│   roads.json                  exported road data for plotting
└─ (outside repo) irbid-drive-site/{index.html,robots.txt,sitemap.xml}   SEO copy of the game, regenerated by script
```

> Filenames are only roughly aligned with content (e.g. `07p_player.js` is one line; the save/tune/price logic is in
> `07b_tune.js`). Always grep for a symbol instead of trusting a filename.

# Game Architecture

**One script, one global scope.** `build.py` concatenates all parts into one `<script>`; every `const`/`let`/`function`
(~320 top-level declarations) is a global visible to later parts. There are no imports; **file order in `build.py` is the
dependency graph.** Three ordering facts that have bitten before:

1. `12a_fx.js` must precede `12_hud_loop.js` (the loop calls `fxTick`).
2. `06d_fabric_driver.js` runs *after* `06h_gen.js` (houses are placed around the 1,000+ places).
3. `08a_wheel.js` declares `let ui`, which the `08c_shop.js` and `10_laws_player.js` handlers read (works because handlers only fire after load).

**Layers (conceptual; not enforced by code):**

1. *World data* — `03_world_data.js` (roads, circles, constants). Coordinates are metres: **+x east, +z south** (north = −z).
2. *Graph/queries* — `04_graph.js`: `EDGES`, `NODES`, spatial `HASH`, `roadAt(x,z,r)` (nearest road segment + lane info), `route(a,b)`.
3. *World building* — `05*`–`06*`: builds Three.js meshes once at load (merged road ribbons by layer, `InstancedMesh` for
   props, chunked by 600 m). Places register themselves in `PLACES` (name, x, z, kind, sub).
4. *Entities* — `07*`: car meshes (`mkPorsche`, `setModel`), player `P`, rarity/traffic spawn tables.
5. *Agents* — `09_ai.js`: road-following agents (80 traffic cars, 3 race bots, police) with path arrays `P/C/Lm/Mk`.
6. *Rules* — `10_laws_player.js` (physics + fines), `11_race.js`, `08b_heist.js`, `08a/08c` (economy sinks).
7. *UI* — HTML overlays in `01_head.html`, minimap + HUD in `12_hud_loop.js`, nav UI in `11b_nav.js`.
8. *Loop* — `loop(now)` in `12_hud_loop.js` ties everything together every animation frame.

**Communication** is by direct function call and shared globals (`P`, `drift`, `tune`, `fines`, `spent`, `race`, `heist`,
`NAV`, `traffic`, `bots`, `PLACES`, `ui`, `keys`, `hour`, `clock`). There is no event bus, no state container.

**Main loop order** (`loop`): dt clamp (4–50 ms) → clock/time-of-day → sky/sun/light colours → traffic lights →
`traffic.forEach(updTraffic)` → `updP` (player physics, collisions, fines) → `updHeist` → `updRace` → `poiNear` →
`navTick` → `navLabels` → `showCarsTick` → `fxTick` → camera → HUD innerHTML → `drawMap` → `ren.render`.

# Core Game Mechanics

**Controls** (keyboard; touch devices also get on-screen pads, see v27 note):
`W/S` or `↑/↓` gas/brake-reverse · `A/D` or `←/→` steer · `Space` handbrake (drift) · `C` camera (chase/hood) ·
`T` +1 hour · `F` reset to start · `R` start race (nearest circuit) or duel a nearby car (cancels if running) ·
`J` stunt-ramp teleport · `K` landmark-tour teleport · `G` wheel spin · `E` rob bank (near bank) ·
`U` or `P` Apex Drift Customs (near shop) · `N`/`B` cycle owned cars · `M` focus map/search box · `V` racing-wheel setup · `Esc` closes modals.

**Driving physics** (`updP`, arcade, semi-Euler): forward/lateral velocity decomposition; engine accel falls off with
`(v/vmax)^2.5`; brake 16 m/s²; lateral grip damping `exp(-k·dt)` with lower grip on handbrake or throttle+steer;
gravity 9.81 with terrain height `groundH`; airborne steering ×0.2; collisions with static colliders (`colB`), traffic
(radius 3.4 m, bounce + 30 JD fine), bots/cops (soft push). Map bounds x∈[−3400, 8400], z∈[−2600, 5600] (hard clamp).
Camera FOV widens with speed (65° + up to 20°).

**Drift scoring:** while grounded, speed > 8 m/s and slip angle > `0.22 − 0.012·extraDriftLevel`, per second adds
`slip · speed · 8 · (1 + min(4, driftTime/3)) · (1 + 0.2·extraDriftLvl) · rarityMultiplier`. Points bank into
`drift.total` after a 0.7 s break if > 40 pts; hitting a collider loses the combo ("Drift lost").

**Rarity (5 tiers):** Common ×1.0 / Uncommon ×1.2 / Rare ×1.5 / Epic ×2.0 / Legendary ×3.0 (drift multiplier).
Wheel odds 50/35/10/4/1 %. Traffic spawn odds depend on the traffic zone (City_Center_Mall, Campus_Zone,
Petra_Street_Highway, Aidun_Suburb, Thalatheen_Beltway, …) via `TRAFFIC_SPAWN`.

**Economy:**
- Upgrade parts (5 levels each): Speed (+5% top speed, base 1,500), Acceleration (+6%, 1,200), Handling (+7%, 800),
  Extra Drift Points (+20%, 3,000). **Price doubles per upgrade** (`base · 2^currentLevel`). Paid in drift points.
- Wheel spin costs **10,000 JD**; a duplicate car refunds 5,000 JD.
- Starter car: **Ford Focus RS** (common).
- Balance = `fines − spent` (see Known Issues: fines currently *increase* the balance).

**Law enforcement (fines, JD):** speeding 15 (when > limit+10 km/h; limit is per road) · against traffic 20 · red light 50 ·
traffic collision 30. **No fines and no limit inside the Drift Zone** (rect/circle zones in `DZONES`).

**Races/duels:** 3 circuits (Al-Balad Circuit 2 laps, Thalatheen Run, Petra Sprint) follow the road graph; 3 bots; checkpoint
radius 28 m; states `idle → count → run → done`. Duel: race a traffic car to a destination, win radius 18 m.

**Bank heist:** `E` near bank → 120 s chase, 4–8 cops (speed 85% of player), caught if a cop is within 7 m for 2.5 s
(−up to 50 JD) or survive for +500 JD; 180 s cooldown.

**World systems:** day/night (24 h in 960 s, i.e. 40 s per hour), sun/shadows, fog, headlights at night, lit windows,
traffic lights (`LIT`), one-way rings, roundabouts, hills (Jadara hill), highways, ramps.

**Navigation (`11b_nav.js`):** fuzzy search over `PLACES` (+ street names, alias tokens, categories such as grocery/heritage),
Dijkstra route over the road graph, turn-by-turn banner, blue route on the minimap, floating POI labels (recycled `LAZYL`).

**Not present:** start screen, pause, game over, restart, levels, lives, health/damage, timers beyond the race/heist, sound.

# Game State

State lives in **module-level globals** (no store):

| State | Where | Notes |
|---|---|---|
| Player kinematics | `P` {x,z,y,vx,vz,vy,h,gnd,idx,rt,rm,vm,a0,hd,dr,prog,m} | `vm/a0/hd/dr` recomputed by `applyTune()` |
| Drift | `drift` {pts,t,off,total} | `total` is the spendable bank (persisted as `dt`) |
| Progress | `tune{carName:[spd,acc,hnd,drift]}`, `owned[]`, `cur`, `fines`, `spent` | persisted |
| Race | `race.s` ∈ idle/count/run/done, `race.kind` ('' / 'duel') | |
| Heist | `heist.s` ∈ idle/chase, `heist.t/cool/cops[]/catch` | |
| Modal UI | `ui` (boolean) | `true` while wheel/shop open; blocks `keys` |
| Nav | `NAV` {on, pts, j, dest, …} | |
| World clock | `hour`, `clock` | not persisted; each load starts at the same hour |
| Cameras | `camMode` 0/1 | |
| Agents | `traffic[]` (80), `bots[]` (3), `heist.cops[]`, `all[]` | each has `x,z,h,v` + path arrays |

**Save format** (`localStorage['irbid-save']`, JSON): `{fines, spent, owned[], cur, dt, tune}`. `save()` is called on every
purchase, fine, spin, drift bank and heist end. Load validates `owned` against `PORS`. There is no schema version.

# Rendering

- One `THREE.WebGLRenderer` (antialias, pixel ratio ≤ 2, PCF shadows from a 2048² directional sun that follows the player,
  shadow frustum ±110 m). `PerspectiveCamera` near 0.5 / far 1100, fog 150–900.
- World geometry is built once: road layers merged per kind into `BufferGeometry` with vertex colours
  (`KC` colour map; layer 8 = lane markings; `polygonOffset` per layer to avoid z-fighting); props via `InstancedMesh`
  chunked into 600 m cells with a bounding sphere; buildings are boxes with canvas-texture facades/window rows
  (`facade`, `winRow`); named landmarks have dedicated builders (`06b`, `06g2`).
- Cars: procedural box/cylinder models per `PORS` entry (`mkPorsche`), cached per model (`MESHC`).
- Colour/post: `12a_fx.js` — CSS `filter: contrast(1.15) saturate(1.1) sepia(.06)` on the renderer canvas (Levant grade);
  pooled sprite tyre smoke (240 sprites, `rgba(240,240,240,.4)` max); additive glare quads along tyre tracks while drifting;
  speed blur = masked `backdrop-filter: blur(1px)` overlay above 26 m/s · (1+.05·speedLvl) · (1+.06·accelLvl).
- HUD: absolutely positioned HTML (`#top`, `#spd`, `#drift`, `#race`, `#heist`, `#toast`, `#nav*`, `#shop`, `#wheel`);
  `#top` and `#spd` innerHTML are rewritten every frame. Minimap = 2D canvas redrawn every frame (roads, traffic dots, POIs,
  route, arrow).
- No sprites/atlases/images: everything is generated in code.

# Assets

There are **no external assets**. No images, audio, fonts, or models. Colours/palettes are constants in code (`KC`, `MC`, `PKC`,
`YEL`, `LIME`, `SHOPC`, `SIGNC`, `TCOL`, …). The only external resource is Three.js r128 from cdnjs.

# Development Commands

```bash
# build the single-file game (no dependencies; Python 3)
python3 build.py                     # -> dist/irbid-drive.html

# test dependencies (Node >= 18)
npm install                          # installs three@0.128.0 (used by the headless tests)

# fast headless checks (stubbed DOM; pass the build path)
node tests/val.js                                    # road-graph validation (expects "issues 0", 142/142 reachable)
node tests/h2.js  dist/irbid-drive.html              # houses, races, duel, heist smoke (all finite, states reach end)
node tests/h12.js dist/irbid-drive.html              # traffic spawn trials
node tests/h13.js dist/irbid-drive.html              # rarity tier stats per traffic zone (mismatches must be 0)
node tests/h14.js dist/irbid-drive.html              # navigation routes ("bad 1" for JUST is pre-existing)
node tests/h16.js dist/irbid-drive.html              # drift-zone fines (one sampling check is flaky)
node tests/h20.js dist/irbid-drive.html              # rarity multiplier, wheel, upgrade prices 1500/3000/6000/12000/24000 ...
node tests/h24.js dist/irbid-drive.html              # nav search / "Passing:" labels, expects "bad 0"
node tests/h25.js dist/irbid-drive.html              # fx: smoke / glare / speed-blur thresholds
node tests/h21.js dist/irbid-drive.html out.json     # dump all PLACES coordinates (identity check between builds)

# screenshots (Playwright + Chromium/SwiftShader; ~2 fps so force state, don't drive) — paths are hard-coded, edit first
python3 tests/fx.py    # real-browser shots incl. CSS filters; tests/snap.py uses window.__img (does NOT capture CSS filters)

# run the game
open dist/irbid-drive.html           # any modern browser, needs internet for the Three.js CDN
```

There is no lint, no formatter, no CI, no `npm test`. Deployment = publish `dist/irbid-drive.html` as an Artifact (the
standalone `irbid-drive-site/index.html` is derived from it by a regex script that swaps `<title>` for an SEO head
and inserts a `<noscript>` block; the site URL is still the placeholder `YOUR-SITE-URL`).

# Coding Conventions

(Existing patterns — follow them until the rebuild changes them.)

- Terse, dense JS: single-letter/short names (`P`, `T`, `R`, `cl`, `wl`, `hh`, `mp`), many statements per line, long
  one-liners (up to ~1,300 chars). Arrow helpers for math. Few comments; section banners `// ---- name ----`.
- Coordinates in metres, +x east, +z south; heading `h` with forward = `(sin h, cos h)`, right = `(cos h, −sin h)`.
- World built at load; per-frame work is limited to agents, lights, HUD, minimap.
- Data tables are inline arrays/objects (e.g. `PORS`, `CIRCUITS`, `RDS`, `TRAFFIC_SPAWN`, `EXPANSION_PACK`).
- Place registration goes through `addPlace`/`lm2Place`/`packSite`; seeded `PR()` PRNG for deterministic placement
  (pack + generator); `Math.random()` for runtime variety.
- Large feature modules are added as a new `NN_name.js` part and appended in `build.py`'s `order`.
- Persistent state changes call `save()`; UI modals set `ui=true` and clear `keys`.

# Important Constraints

These must survive any refactor (they are the product):

1. **Geography = real OSM network (v33).** The owner replaced the hand-authored streets with OpenStreetMap geometry. Do not hand-edit `03a_net_data.js` or invent/move streets; regenerate it from `osm/` data. Place coordinates changed legitimately in v33 (re-anchored on real roads); from v33 on, `tests/h21.js` identity is checked against the v33 build, not v32. Named landmarks must stay on a real road of their role.
2. **Seeded generators stay deterministic:** `PR` seed `20250611` and the call order of `runPack`/`runLandmarks`/`runGen`
   decide every procedural coordinate. Reordering calls or adding a `PR()` call before them silently moves places.
3. **Economy math unchanged:** upgrade price `base·2^level` (1,500 / 1,200 / 800 / 3,000; 5 levels); wheel 10,000 JD with
   50/35/10/4/1 % odds and 50 % duplicate refund; drift formula and rarity multipliers ×1.0/1.2/1.5/2.0/3.0 (`P.rm`);
   fines 15/20/50/30 JD; heist +500 / −50.
4. **Save compatibility:** `localStorage['irbid-save']` shape `{fines, spent, owned, cur, dt, tune}` must keep loading.
5. **Starter car** Ford Focus RS; 136-model `PORS` list, rarity assignment (`rarityIdx`) and spawn tables unchanged.
6. **Physics feel** (`updP`) — grip, drift thresholds, acceleration curve, camera — unchanged unless approved.
7. **Controls and HUD strings** (including real names displayed when passing landmarks) unchanged.
8. **Single-file deliverable:** the shipped artifact must remain one HTML file that works offline except for the Three.js CDN
   (r128; do not upgrade Three.js as part of a refactor — later versions changed materials/lighting/colour management).
9. **Allowed script origins for the artifact host:** cdnjs.cloudflare.com (Three.js). Don't add other external hosts.
10. **Performance floor:** the world draws 4,000+ scene nodes with 1,243 places on the minimap; do not add per-frame
    allocations or O(n_places) work per frame.

# Known Issues / Technical Debt

Documented, **not fixed** (see PLAN.md for when each is addressed).

Structure & maintainability
- ~320 top-level globals in one scope; implicit dependency order (`build.py` `order`); files are not self-contained.
- Dense one-liners (max line 1,293 chars; whole game = 1,504 lines / 215 K chars): hard to read, review, diff or debug.
- File/name drift (e.g. `07p_player.js` is a single line; save/tune/price live in `07b_tune.js`); `06d_fabric_driver` runs after `06h_gen`.
- Duplicated colour maps for road kinds (`KC` in 3D, `MC` for minimap, `PKC` for POI kinds); duplicated builders in `06g_pack.js`
  and `06g2_lm.js` (benches, lamps, logos); mesh-building helpers copy-pasted per landmark.
- Hard-coded magic numbers everywhere (collision radius 3.4, grip rates, fine amounts, spawn radii, 40 s/hour, map bounds…),
  with `LIMIT=50` etc. defined at the *end* of files.
- Mixed responsibilities: `10_laws_player.js` holds laws + physics + keyboard input + teleports; `12_hud_loop.js` holds minimap,
  HUD, lighting, camera and the loop.

State & logic
- State is scattered globals; save/load logic and `save()` calls sprinkled through gameplay; no schema versioning.
- No explicit game-state machine (only `race.s`, `heist.s`, `ui`); no pause/start/game-over; no fixed timestep (dt clamped
  4–50 ms), physics partly frame-rate dependent (e.g. `P.vy=(gh−pgh)/dt`).
- **Economy semantic quirk:** `fine()` does `fines += amount` and the displayed balance is `fines − spent`, so a fine
  *raises* the balance ("earn money by breaking laws") while a heist bust *lowers* it. May be intentional design; preserve
  until the owner says otherwise.
- Wheel `ui` flag is declared in `08a_wheel.js` but read from `10_laws_player.js` (TDZ-sensitive ordering).
- Non-determinism: `Math.random` used for fabric houses, barbers/pet shops, traffic spawns, wheel rolls, race bot selection →
  not reproducible; tests must tolerate it.

Performance
- Per frame: HUD `innerHTML` rebuilt twice (`#top`, `#spd`); `drawMap` iterates all `EDGES` in range **and all 1,243 `PLACES`**
  each frame; `new T.Vector3` allocated each frame for the camera lerp; ~80 traffic agents updated with per-agent array work.
- CSS `filter` on the WebGL canvas and `backdrop-filter` overlay cost GPU on weak devices; headless SwiftShader runs ~2 fps.
- Shadow map 2048² re-rendered every frame (`groundTo()` only moves the ground plane when the 100 m grid cell changes — fine).

Testing & tooling
- ~40 ad-hoc scripts; no assertions framework; outputs are eyeballed. Known pre-existing: `h14` "bad 1" for the JUST route;
  `h16` "traffic samples on drift edges" is flaky. Playwright scripts hard-code `/tmp/...scratchpad` paths.
- `tests/legacy/*` and the old `c.js` city prototype are dead/unmaintained.
- The SEO copy duplicates the entire game and is rebuilt by regex (fragile; one publish already shipped the stale build).
- Three.js loaded from CDN without SRI/version pinning beyond `r128` in the URL; no offline mode.

Potential bugs / risks
- 24 road dead-ends (expected stubs) are reported by `val.js`; confirm they are intended.
- Saves from older builds could contain car names no longer in `PORS` (handled by filtering); `tune` entries for removed cars persist.
- Touch devices: no controls at all (keyboard only).
- Place-label recycling (`LAZYL`) and POI labels create DOM/canvas textures at runtime; verify for leaks on long sessions.

# Instructions for Claude

1. **Read this file and PLAN.md first.** The existing game is the reference; do not redesign gameplay.
2. **No big-bang rewrites.** Work in small, verifiable steps; keep `dist/irbid-drive.html` buildable and playable after every step.
3. Before changing code, state which Constraint(s) it touches. Anything that alters behaviour must be listed in PLAN.md
   under "Approved behaviour changes" and approved by the owner first.
4. After any change: `python3 build.py`, run `val.js`, `h2`, `h13`, `h20`, `h24` (and `h21` place-identity compare against the
   previous build). Report failures honestly; don't mask pre-existing ones (listed above).
5. For visual changes use a real browser (Playwright `page.screenshot`), because headless Node tests have no renderer and
   `window.__img` captures miss CSS filters. Force game state instead of driving (SwiftShader ≈ 2 fps).
6. Never reorder `PR()` consumers or the `runLandmarks/runPack/runGen` sequence; never add `PR()` calls before them.
7. Don't upgrade Three.js, don't add npm runtime dependencies, don't add network calls.
8. Prefer extracting/renaming over rewriting; keep behaviour-neutral refactors in separate commits from behaviour changes.
9. Keep deploy details: publish `dist/irbid-drive.html` to the existing Artifact URL (same file path ⇒ same URL); regenerate
   the SEO copy after each build; verify the output file really contains the new code (grep) before publishing.
10. Keep replies concise; update this file when architecture, commands or constraints change.
