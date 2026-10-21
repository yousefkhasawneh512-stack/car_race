# CHANGELOG — Irbid Drive

Per-version notes moved out of CLAUDE.md (2026-10-14), oldest first. Each entry is kept as written at the time;
later entries override earlier ones where they disagree (e.g. v33 replaced the hand-authored map, v35b removed the CSV nodes).
Versions before v22 are summarised in PLAN.md ("Done since v19").

## v22

**v22 addition (rendering only):** `src/parts/07a4_carvis.js` is the per-car visual engine (`generateUniqueCarStats` -> `finalizedUniqueVehicles`, lookup `carV(idx)`): name-hashed dual HSL neon pair (unique hue per model), light-line layout, a 10,000-pixel (100x100) detail sheet per car drawn on body decals (side/top/front/rear; the underglow footprint is kept as data but no longer rendered) and drift-exhaust profile (count/s, pixelSize, alphaFadeRate, square vs cross). `12a_fx.js` reads it for the drift stream. Its `physics` block is generated but **not applied**. `PORS` actually holds 217 models (earlier text saying 136 was wrong). Check with `node tests/uq.js dist/irbid-drive.html`.

## v24

**v24 display lock:** the WebGL canvas (`#game`) is forced to a 1920x1080 buffer (pixel ratio 1) by `initialize1080pGameDisplay` in `02_setup.js`; composer/bloom/camera aspect use `DISP`; window size only re-fits the 16:9 canvas via CSS (letterboxed). `crisp2d()` sets imageSmoothingEnabled=false on the 2D canvases (minimap every frame, wheel, labels). Check with `python3 tests/disp.py dist/irbid-drive.html`.

## v25

**v25 place patch (approved by owner):** `src/parts/06h2_final_patch.js` (runs after `06h_gen.js`, no `PR()` calls) holds `final_missing_places_patch`. Four of its five places already existed and are skipped; **Vogo Cafe** (University Street, beside MK Mart) is new, so `PLACES` is now 1,244 = the original 1,243 (unchanged coordinates) + Vogo Cafe. Check with `node tests/h21.js` and `node tests/vg.js dist/irbid-drive.html`.

## v26

**v26 shop access:** `TuningShopInterface` (08c_shop.js). Touch devices only: a TUNE CAR / CLOSE SHOP button on a 1920x1080 2D overlay (`#hud2d`); PC: no overlay/listener, keyboard `U` or `P` (P also closes). Same `openShop()`/`closeShop()` (14 m proximity rule) for both. Check with `python3 tests/shopt.py dist/irbid-drive.html`.

## v27

**v27 touch driving:** `10b_ios_touch.js` (`iOSBypassEngine`) is armed on touch devices only. Pads in 1920x1080 canvas coords (bottom band): LEFT x<400, RIGHT 400-800, BRAKE 1200-1500, GAS >1500, plus DRIFT/handbrake pad (x>1500, y 440-700). They feed `MobilePCInputController` (declared in `10_laws_player.js`), which `updP` ORs with the keyboard. Canvas has `touch-action:none`; viewport is non-scalable; minimap ignores pointers on touch. Check with `python3 tests/ios.py dist/irbid-drive.html` (emulated multitouch; not a real iPhone).

## v28

**v28 city realism pass (visual only, geography untouched):** four new/extended layers, all `Math.random`-based so no `PR()` consumer moved (verify with `node tests/h21.js`).
- `02c_facade.js` (after `02b_sky.js`): facade shader `bldF`/`instF` (+`FACI`). Per-instance `aSty` = (style, seed, frontSign, variant). Styles: 1 old-town stone, 2 shopfront, 3 apartment, 4 house, 5 villa, 6 institutional, 7 garage/industrial, 8 office. Paints parapets, stone courses/quoins, arched/rect windows, sills, shutters/blinds, AC units, balconies, floor lines, doors, shop glass, roller shutters, fascia, night-lit windows (`FACU.uFacNight`). `FACQ=0` = lite path on mobile UA. Without GFX it falls back to plain boxes + window quads.
- `05a_roads.js`: `instO(g,mat,items,shadow,R,CS)` — optional `R` registers the chunk for distance LOD (`lodReg`/`lodTick`, called every frame); `CS` = chunk size (geometry is cloned when CS!=600). Ground carries an `aU` urban attribute (`urbanK`) for town vs field/rock tinting. Keep dependent props on the same LOD radius (poles/arms/lamp heads 420, trunks/leaves 420) so nothing floats.
- `06i_infra.js` (after `06d_fabric_driver.js`): kerbed sidewalks (300 m cells), zebra/stop lines/arrows, street lights (+night pools, `lampTick`), utility poles + sagging wires, atlas signs (`SGA`), guardrails with colliders, manholes, bus shelters, alley wires, roundabout planting, dumpsters; `FURN` spatial hash (`furnAdd`/`furnNear`) keeps trees clear of furniture.
- `06j_veg.js`: urban/rural land-use grid (`urbanK`), tree species system (`CANP`, `treeSp`), street trees, olive groves, pines/scrub/limestone rocks, verge scrub. Elevation is deliberately unchanged (only Jadara hill; all places are authored at y=0).
- Constraints for later work: no `PR()` use in these parts; no per-frame allocation; new props must go through `instO` with an LOD radius; test visually with `tests/snap.py` (captures via `page.screenshot`; the camera override hooks `POST.comp.render`, not `ren.render`, because the HDR composer renders to targets first).
- Known honest limits: no real OSM/building footprints are available offline, so buildings keep their authored footprints/heights and gain per-building style, colour, materials and detail; hand-built landmarks got materials/stone coursing, not new geometry.

## v29

**v29 racing-wheel support (Logitech G29 + force feedback):** `src/parts/10c_wheel.js` (after `10b_ios_touch.js`; globals `WH`, `WHN`). `updP` calls `WH.poll(dt)` (analog `steer/thr/brk` + handbrake) and `WH.ffb(dt,frozen)`; keyboard and touch values win/stay identical (`thA`/`brA` are 1 for keys; wheel steering is used only when no key steers; steering is a yaw-rate input, so `st=-steer`).
- Input = Gamepad API. Steering axis, pedal axes and button bindings are set in the in-game setup screen (**key V**, auto-opens the first time a wheel is detected) because OS/browsers number G29 axes differently; bindings dispatch the same synthetic `keydown`/`keyup` the keyboard uses (so every action keeps one code path). Settings are stored under their own `localStorage['irbid-wheel']` (the `irbid-save` format is untouched).
- Force feedback = WebHID (Chromium desktop, one click on "Connect force feedback"; reconnects automatically after the first grant). Protocol from the open-source Linux `lg4ff` driver: 7-byte reports `0x11 0x08 b 0x80` (slot-1 constant force, `b=128` neutral), `0x13` stop, `0xf5` autocenter off, `0xf8 0x81 lo hi` range. Forces: speed-weighted centring spring, self-aligning pull toward the slide, off-road rumble, collision/landing jolts; zero in menus/countdown; stop on blur/pagehide/disconnect. "Auto-detect direction" pulses the wheel and flips `ffInv` if the wheel moved the wrong way. Fallback: gamepad `vibrationActuator` rumble. 
- Honest limits: written from protocol knowledge, **not tested on a physical G29** (only against a mock gamepad + mock HID device: `python3 tests/wheel_test.py dist/irbid-drive.html`, 29 checks; `blocked` arg tests a page where the Gamepad API is denied). WebHID/Gamepad access may be denied inside a cross-origin iframe (artifact view) -> open the standalone page/tab. Force polarity, G HUB exclusivity and the G29 PS3/PC mode switch are the likely real-hardware failure points.
- Test harness note: headless Chromium here does not tick `requestAnimationFrame` reliably and `gfxRender()` costs seconds per frame, so `wheel_test.py` replaces RAF with a manual stepper, stubs `THREE.WebGLRenderer.prototype.render` and `gfxRender`.

## v30

**v30 shop placement (owner request: "put each place in the correct spot, not random"):** the 990 generated "Spot #N" businesses (`06h_gen.js`) are now fitted to their type instead of scattered: `GEN_FIT` (business type -> districts/streets, e.g. car showrooms on Petra St / the Amman-Irbid highway, auto parts + hardware + pet supplies on Thalatheen St / Hakama, cafes/shawarma/electronics/gyms on University St, dukkans/barbers/bakeries in Al-Balad, Al-Hai, Barha, Nuzha, Aidun) via `genFit(type,spotNo)` (no `PR()` draws; same seeded call order). `06g_pack.js`: new `/student strip/` zone rule, `packSite` accepts `fbr` (per-type fallback street list). `06h2_final_patch.js` (Vogo Cafe) now runs **before** `06h_gen.js` so University Street frontage is reserved for it (build order changed). Named landmarks/places keep their coordinates (check: `node tests/h21b.js dist/irbid-drive.html out.json` also prints `FMP`/`GEN_FAIL`; `node tests/gen_fit.js dist/irbid-drive.html x.json` checks no generated shop sits on a road and lists streets per type). Honest limit: the 990 businesses are fictional filler (no real coordinates exist for them) and the map is hand-authored, not georeferenced - no real OSM data is reachable from the sandbox. `build.py` now uses paths relative to the project folder.

## v31

**v31 CSV place nodes (owner file `irbid_complete_all_places_map.csv`, 7,500 rows: Place_ID, Name, Category, Latitude, Longitude, Sector_Zone):** `src/parts/06k_csv_places.js` (after `06j_veg.js`). 7,499 rows are generic filler ("Irbid Mall Node #N" etc., 10 categories, 4 rectangular zones, uniformly scattered); the one named row, *Corner salon for men*, already exists in the game (Corner Salon for Men at 693,87) and is skipped - the CSV would put it ~2.2 km south, so its coordinates were NOT applied. Lat/lon -> game metres uses a two-anchor similarity fit (Irbid 32.55N 35.85E -> Al-Balad (180,-20); Yarmouk University 32.5375N 35.85556E -> (861.2,1492.0); scale 1.12, rotation 3.6 deg); the converted metres are baked in as `CSVD` ([catIdx*4+zoneIdx, x*10, z*10] triples). Names are rebuilt as `Irbid <Category> Node #<n>` (n counts per category in Place_ID order; Barbershop starts at 2 because row 1 used #1).
- Kept OUT of `PLACES` (still 1,244, so the per-frame PLACES loops did not grow): `CSVP` list + `CSVG` 200 m spatial grid. Hooks: `navIndex` (search/route; flagged `g:1` so real places rank first), `poiNear` (`csvNear`, only when no real place is near; generic so no toast), `drawMap` (`csvDots`, 2x2 px dots, grid lookup, ~85 us/frame), and one coloured roadside sign + pole per place (instanced, LOD 230 m, no colliders; signs on the carriageway are moved to the verge, registry coordinates stay exact). New nav keywords `cleaner`, `tech`. v32: signs that fell inside a building footprint or on a carriageway (842) are nudged to the nearest clear spot (`p.sx/p.sz` = sign position; `p.x/p.z` stay exact); audit with `node tests/place_audit.js dist/irbid-drive.html` (expects 0 signs in buildings/on roads; the game's own 1,244 places: 0 out of bounds, only Bank and Yarmouk University anchors on a road, Al-Hassan Stadium/Medeenat Al-Hasan share one site).
- Honest limits: ~64% of the points are >80 m from any game road (the game's streets do not cover the CSV rectangles), 404 land on a road and 437 inside an existing building footprint; nav routes to the nearest road (max ~960 m). Coordinates depend on my anchor fit - they are not verified real locations. Check: `node tests/csv_test.js dist/irbid-drive.html` (expects CSVP 7499, PLACES 1244, 0 coordinate mismatches, no route failures; needs `csv_pts.json` next to it) and `node tests/cs_check.js` (on-road/in-building stats).

## v33

**v33 REAL OSM STREET NETWORK (owner request: "REPLACE THE GRID WITH REAL IRBID ROAD GEOMETRY"):** the hand-authored road list (`RDS`, `CIRC`, old node ids like `J_BU`) is gone. `src/parts/03a_net_data.js` (GENERATED, never hand-edit; `NETD`/`NETE`) is packed by `osm/gen_world.py` + `osm/net.py` from OpenStreetMap `highway=*` ways (Overpass, bbox 32.45-32.60 N / 35.75-35.95 E, split into north/east/south/highways files in `osm/`, ODbL, (c) OpenStreetMap contributors; the attribution overlay `#osmcr` must stay in `01_head.html`).
- Network: 26,083 nodes / 37,371 edges / 4,608 km, 29.2 x 24.4 km extent, 99.4 % in one connected component, 7,615 one-way edges, 142 roundabouts, 177 traffic signals (14 OSM-mapped + inferred at junctions with >=3 arterial arms), bridges/tunnels keep topology (drawn on one level via layer order). 587 map gaps <=3 m were repaired. Edge fields: `{id,name,nameAr,w,lim,ow,kind,hw,a,b,pts,cum,len,nx,nz,br,tn,ly,rb,fz,hub,hd,mx,mz}`; widths and speed limits are class-typical unless OSM tags them (not surveyed). Terrain is flat (no elevation data).
- Projection: local transverse Mercator, WGS84, k=1, origin 32.55 N / 35.85 E; `x = easting, z = -northing` (+x east, +z south). JS `LL2XZ` (03_world_data.js) equals pyproj to <1 cm (checked at 5 points). CSV place nodes (`06k`) are re-projected with the same transform (their real lat/lon now land where OSM says, no anchor fit).
- Files: `03a_net_data.js` (data), `03b_bld_data.js` (v34 building data), `03c_poi_data.js` (v35 real place data), `06l_real_pois.js` (v35 place registration), `03_world_data.js` (decode, anchors `RA`, `YUC/JC/HC/INC`, polygons `inPoly`), `04_graph.js` (nodes/edges/HASH/`roadAt`/`roadNear`/heap `route`/`nearNode`), `04b_streets.js` (University axis `UL/uvOf`, street ROLES: legacy street names `VSD` -> real edges, `nearestOn`), `04c_budget.js` (`O2N`/`O` old->real similarity seed, density grid, detail budget `fz`/`hub`/`hd`, `freeSite`, `PARK`, `MALL`, `noBuild`, `distName`/`distDisp`, ZR_* zone predicates), `05a_roads.js` (ribbons from real polylines, chunked by 800 m/layer).
- Detail budget (performance): HUBS Al-Balad 2000 / YU 1500 / Andalus 1100 / Aydun 900 / Sinaa 700 / JUST 800 / Jadara 500 / INU 500 m; `e.fz` 0-3 gates sidewalks, lights, poles, signs, trees, scrub; buildings are generated along real roads per hub with caps (`06d_fabric_driver.js`), NOT OSM footprints. Load ~11-12 s headless.
- Legacy content (landmarks, POIs, pack/gen shops, campuses, bank, garage, races) keeps its names/HUD strings but is re-anchored: old seed coordinate -> `O()` -> snapped onto a real road of the named role (`siteBeside`, fallback `siteNear`). So PLACES = 1,244 but their coordinates are NEW (constraint 1 no longer applies; the OWNER AUTHORISED replacing the network). Stand-in mapping of legacy names onto real roads: Palestine St, Baghdad St -> Al-Hashemi, Petra St -> King Hussein east, Thalatheen -> Abd Alhameed Sharaf, University axis, etc. Wasfi Al-Tal Park is drawn at the nearest free rectangle (OSM polygon is 29x18 m); Arabella Mall at the nearest free ground (scaled `k`); the drift pad is an asphalt ring at the real stadium polygon.
- Fixed along the way: endpoint normal bug in `04_graph.js` (unnormalised arms collapsed ribbon ends and put guardrail colliders on the road centre; bots crawled), race start index (`11_race.js` D0 path), nav/tp anchors for Park and Mall, tour stops (`10_laws_player.js` use `O()`/`PARK`/`MALL`).
- Tests (new/adapted): `node tests/val_net.js dist/irbid-drive.html` (network validation), `tests/boot.js`, `tests/dups.js`, `tests/tour.js` (all tour stops on roads, expects 0 off-road), h2/h12/h13/h14/h20/h24/h25/vg/csv_test pass. Known: heist test now ends in a bust because cops really catch a parked player; 2-3 of 80 traffic cars may be 1-3 m beyond the carriageway edge while turning at junctions.
- Honest limits: roads are real OSM geometry, but widths/limits are typical, no elevation, buildings are generated (not OSM footprints), filler shops (990 Spot #N + CSV nodes) are fictional positions, ~3,000 edges carry names (mostly Arabic), legacy named streets are mapped onto stand-in real roads, summit/church landmarks land in real Husn (~7 km south). Do not claim 1:1 for anything but the road centrelines.

## v34

**v34 REAL OSM BUILDING FOOTPRINTS (owner request: buildings were not where they really are):** source = owner-supplied BBBike GeoPackage extract (`osm/bld/irbid.gpkg`, lon 35.809-35.89 / lat 32.476-32.624, OSM data timestamp 2026-10-10, ODbL (c) OpenStreetMap contributors). `osm/bld/conv.py` (sqlite3 + shapely + pyproj, same tmerc as `LL2XZ`) turns `multipolygons` `building=*` into oriented-rectangle pieces (L/U shapes split into several boxes) -> `bld.json` -> `src/parts/03b_bld_data.js` (GENERATED, never hand-edit): `BLDD={cover,p:[x*10,z*10,w*10,d*10,ang*100,h*2,tc|8=continuation]...,n:[[x,z,name,building,amenity,shop,tourism,historic]...]}` + `RL(regex,fallback)` = real centroid of a named OSM feature. 19,640 buildings (738 with building:levels, 187 with height); other heights = deterministic estimate by type/area/density.
- `06d_fabric_driver.js` `placeReal()` (late stage, after all places/landmarks, before generated hub loops): places each piece through `addBld`/FACI (style by tags/area/density, colours generated), skips pieces overlapping roads (min half-width 2.4 m, pad .4, tunnels skipped), landmarks/occupied cells, stadium/park/mall/drift-circle areas; shrinks (1..0.6) to clear roads. 19,238 pieces placed; `styleFor` returns null inside `inCover` (extract rectangle) so generated fabric only fills OUTSIDE the extract. No `PR()` use.
- Landmarks use `RL()` real seeds: new `'@'` pseudo-street in `siteBeside` = `siteNear` at the real seed (Dar As-Saraya, Beit Arar, Nabulsi House, Eimar Park, Nissan, Clock Tower/Souq via `CLKG/SOUQG`). Arabella Mall is built from its real OSM footprint (`MALL.x/z/r/ang/k`); fallback = old procedural block. PLACES still 1,244 (coordinates of non-OSM-backed places unchanged from v33).
- Perf (SwiftShader draw calls, 4 viewpoints): v33 1.5-2.3k calls / 1.15-1.22 M tris -> v34 2.5-2.9k calls / 1.52-1.57 M tris.
- Honest limits: OSM coverage is incomplete (empty blocks where buildings are unmapped); footprints are rectangles, roofs flat; heights/styles/colours mostly generated; ~1,000 pieces dropped (conflicts) and ~3,400 shrunk; YU/YUS campuses keep procedural `campusFill` blocks; shops/filler/CSV nodes still fictional positions; outside the extract (JUST, Jadara, INU, far edges) buildings are still generated. Tests: `tests/place_audit.js` (0 CSV signs on roads, 2 of 7,499 inside buildings; its old "oob" bounds check is stale), `tests/lmchk.js`, `tests/cov.js`, `tests/dc.py` (draw calls).

## v35

**v35 REAL OSM SHOPS / PLACES (owner request: "fix all shops ... make distance accurate"):** the ~1,200 invented shops (990 "Spot #N" generated + the 200 pack shops "Dukkan Unit n", "Cafe Link n", ... + invented gyms, "M Market" x4, C-Town, Irbid Mall Hypermarket, Bergesh, Grand Omaya, Sicilia, Al-Balad barbers / Thalatheen pet shops, Corner Salon) are no longer built (`REALP=true` in `06a_fabric.js`: `packShop`/`gymBuild`/`placeShops` return early, the hand-built shop blocks in `06f_pois.js` are `if(!REALP)`, `runLandmarks` filters those ids). PR() order of everything that is still built is unchanged (all skipped calls were last).
- Real data: `osm/bld/pois.py` (BBBike gpkg, `points` + `multipolygons` with shop/amenity/leisure/tourism tags; name:en when tagged) -> `bb/pois.json` -> `src/parts/03c_poi_data.js` (GENERATED): `POID=[[x*10,z*10,kind,name,nameEn,categoryLabel]...]` (1,018 rows: 367 shops, 158 food, 102 cafes, 85 mosques, 68 medical, 60 supermarkets, 40 schools, 32 barbers, 19 banks, ...) + `RLP(re,fb)` real coordinate lookup (used to put MK Mart and Sameh Mall at their real OSM spots via `'@'` sites).
- `src/parts/06l_real_pois.js` (after `06k`): registers each POID row as a PLACE (`p.real=true`, `p.alias` = other spelling + category, `ax/az` = nearest road point, `sub` = category + street) unless a kept landmark of the same kind is within 80 m (any kind 42 m). Label (`p.lbl` + `LAZYL`) on the front of the real building that contains the point (`rbAt` index built in `placeReal`), else floating at 5.5 m; labels in one spot stack upward. No new buildings. Names are mostly Arabic (rendered by the canvas label); search matches Arabic, the English alias and category keywords (`NKW`). PLACES is now ~1,000 real + ~36 hand-built landmarks (was 1,244 invented).
- `06c_campus.js`: generated faculty blocks are skipped where the real extract already has >=2 buildings (`realCnt`).
- Kept as game venues (not real shops, legacy positions): Irbid City Center + HyperMax, EcoCharge, Al-Hasan Mosque Square, cultural center, football cage, drift lot, Vogo Cafe (owner request), church tower / fortress walls / central bank (hand-built landmarks).
- Honest limits: only ~39% of OSM POI nodes fall inside a mapped building footprint (OSM building coverage is partial, POI nodes are approximate); search/nav distance = straight line to the real point, route distance = road route to the nearest road point; shops that exist in reality but are not in OSM are absent; the 7,499 CSV nodes (`06k`) are still fictional filler. Tests: `tests/h24.js`/`vg.js`/`h14.js` were pointed at names that still exist (`bad 2` in h24/vg = the deliberately removed M Market / C-Town searches).

## v35b

- **v35b (follow-up, owner: "fix it"):** the remaining invented venues are also gone under `REALP`: Irbid City Center + HyperMax (`06f` block / `hypermax_` landmark), the five custom pack venues (EcoCharge, Al-Hasan Mosque Square, cultural center, football cage, drift overflow lot; `runPack` skips `CUSTOM`), Al-Husun church tower, Al-Saraya fortress walls, Central Bank branch, Summit International Academy, Tariq Park, Vogo Cafe (`06h2` skips `vogo_`/`summit_`; the real OSM "vogo..." restaurant is searchable as "Vogo Cafe" via alias), and the 7,499 fictional CSV nodes (`06k`: `REALP` makes `CSVP` empty, no signs/dots; `tests/csv_test.js` no longer applies). Wasfi At Tal Square is seeded at its real OSM point (`RLP`). `pois.py` also exports named OSM parks (14, kind `park`). What remains hand-built: real-seeded landmarks (Dar As-Saraya, Beit Arar, Nabulsi House, Clock Tower, Souq, Eimar/Wasfi parks, Wasfi square, Arabella, Nissan, MK, Sameh, stadium/drift zone, campuses, hospital) plus the two game-mechanic places (Bank for the heist, Apex Drift Customs). PLACES = ~1,038.

## v37

**v37 REAL TERRAIN + PHYSICS AUDIT FIXES (owner request: full realism/accuracy audit):**
- **Terrain** (was completely flat, `hillH=()=>0`): `osm/terrain/srtm_1km.json` = SRTM v3 1 arc-second (~30 m) heights from the OpenTopoData public API (`srtm30m`, NASA/USGS; retrieved 2026-10-13), sampled on a 1 km grid (31x26 points, request coordinates rounded to 0.001 deg); `osm/terrain/gen_terrain.py` -> `src/parts/03d_terrain_data.js` (GENERATED, `TERR`). `03_world_data.js`: `terrRaw` (Catmull-Rom bicubic) and `TH(x,z)=terrRaw-T0` (Al-Balad origin = 0 m; real elevation there ~570 m; map spans ~240-1120 m). `groundH = TH + .12 (+ ramps)`.
- Architecture = **flat-frame authoring + one terrain pass**: every generator still builds at y=0; `12c_terrain.js` `applyTerrain()` (called once at the end of `12_hud_loop.js`, before the loop) lifts the static world: per-instance matrices of InstancedMeshes (ground-standing boxes >=12 m2 get a skirt down to the lowest footprint corner), every vertex of identity-transform merged meshes (road ribbons, sidewalks, wires), and `position.y` of other top-level objects. Skipped: player/traffic/bots/cops/showcar meshes, beacons, nav dots, sky dome, `gnd`. Dynamic code uses `TH()` directly (never `hillH`, which stays 0). Anything that creates world objects AFTER the pass must add `TH(x,z)` itself (labels in `11b_nav.js` do). `05a_roads.js`: ground follows TH (`GDROP` .08, analytic normals), `ribbonE` cuts segments to <=30 m (`RSUB`) so roads follow the slope.
- Limits: 1 km sampling cannot resolve narrow wadis/cuts; SRTM is a surface model (vegetation/buildings); rigid landmark groups and big meshes are lifted as one piece (may float/sink a little at slope edges); max road grade 31.9% (west escarpment); only a 4 km radius of Al-Balad is mostly <12%.
- **Physics (priority 3)**, `10_laws_player.js` `updP` + `07b_tune.js` `applyTune`: braking is now `P.bk` = 9.81 m/s2 x (suv/pickup 0.8, race 1.1, others 1.0) x surface factor (was a flat 16 m/s2 = 1.63 g); reverse accel 3.5 m/s2 (was 8) and the 2x throttle-in-reverse is capped by `P.bk`; **slope gravity** `-g*sin(grade)` along the heading (rolls on grades >=15% with no input; brake/handbrake hold it; stunt ramps are excluded because they come from `RAMPS`, not TH); `surfK()` traction factor (1 paved road / drift pad, .75 `track`, .9 urban ground off-network, .65 open ground; **heuristic, no OSM `surface` tag is carried in the network data**); cosmetic body pitch (`P.bp`) and roll (`P.br`) from longitudinal accel / yaw-rate x speed (visual only). Economy, drift scoring, save format, HUD strings unchanged. Check: `node tests/phys_brake.js dist/irbid-drive.html` (100-0 km/h 36.3/36.5/36.9 m at dt 1/30, 1/60, 1/120), `tests/phys_audit.js`, `tests/terr_check.js`, `tests/dyn_check.js`, `tests/slope_stats.js`, `tests/drive_pw.py` (real browser).
- Still NOT modelled (no per-car data to do it honestly): mass/CoM, torque curves, gears/RPM, suspension, lateral grip by surface, tyre model.

## v38

**v38 VEHICLE REALISM ADDITIONS (supplied as `irbid-drive-updated.zip`; reviewed, fixed and merged):** `src/parts/07c_realism.js` (after `07b_tune.js`; see `REALISM_FEATURES.md`). Damage mode Off/Cosmetic/Full (button `#damageBtn`, key **I**, `#repairBtn`; own localStorage key `irbid-drive-realism-v1`, `irbid-save` untouched; **default Off = physics identical to v37**), per-car body/engine/tyre/suspension/brake condition (relative durability, NOT crash-test data), overlay scratches (no mesh deformation), sparks/smoke, breakable utility poles (12.5 m/s) and street lights (17 m/s) via `DESTRUCTIBLE_INSTANCES` (`05a`), `removeCol` + `type/breakable` colliders (`05b`, `06i`), `damageEffects()` multipliers read by `updP`, and up to 90 (currently 50) **estimated** speed bumps near OSM schools/clinics/parks on local/service roads (**gameplay estimates, not surveyed; OSM has no `traffic_calming` here**; always present, even with damage Off; disclosed in the on-screen attribution).
- Fixes made during review: speed-bump meshes were authored at `TH()+.05` and then lifted a second time by `applyTerrain()` (up to 129 m off the ground) -> now authored at y=.05 in the flat frame; broken poles used the authored flat-frame y (sank/floated on hills) -> now read the live instance matrix and the pivot uses the lifted base; `roughness` removed from Lambert materials (r128 warning spam); `damageEffects()` returns a shared object (no per-frame allocation).
- ~~Test: `tests/realism_test.js`, `tests/realism_pw.py`~~ — **correction 2026-10-14:** these tests (and the stub changes for `dataset`/`setAttribute`/`window`) never existed on disk, and the review fixes above were not in the source either. The zip was actually merged on 2026-10-14 (source copied from `Downloads\irbid-drive-source\irbid-drive-project`, the 9 changed files from the zip overlaid, then the four fixes above applied to `07c_realism.js`). Built with `build.py` (3,271,379 chars; `build.py` now forces UTF-8/LF so a Windows build matches the Linux one). Tracked in git from here on. **No headless/browser test was run** (no Node on that machine); realism tests are still to be written.
- Open: bumps are invented positions (conflicts with the evidence-only rule of the audit; consider gating them or replacing with real `traffic_calming` data); attribution line is long on phones and overlaps the GAS pad; durability numbers are balance estimates.

## v39 (2026-10-16)

Owner request "realistic cars, damage physics, tyre wear, accurate Irbid map". Approved in `PLAN.md`. Full write-up: `AUDIT_REPORT.md`.
- **v39a vehicle realism** (`07c_realism` rewritten, new `07d_tyres`, `07e_objects`, `07f_diag`; hooks in `07a_cars` (part tags),
  `05a` (`SIGN_PLATES`), `05b` (`colB` give-way), `06i`/`06j` (collider types + instance keys), `10_laws_player` (`updP`: `dfx.lat`,
  `dfx.pull`, burnout hold, `tyreStep`)):
  - per-car profile `carSpec(i)`: mass (estimate from L×W×H×body-type density), drivetrain (documented for 181 of 217 names, rest by body type),
    engine position, weight split, CG height, Campbell-style crush stiffness, thresholds, component/tyre durability;
  - impacts: contact point on the car outline → zone weights (fl/fr/l/r/rl/rr + roof/underbody), equivalent barrier speed
    (vehicle: mass-shared energy; breakable: energy absorbed), crush cm, mesh dents (player body tessellated on first dent, stored
    per car), lights by side, glass by face, components by location (engine position, radiator, wheels within reach), landings;
  - Full-mode effects: power/top speed/accel/steering/brakes, lateral grip (`dfx.lat`), pull (toe + puncture), vibration,
    engine temperature with limp mode, smoke; all floors documented; Cosmetic = visual only; Off = untouched (proved by `off_trace`);
  - tyres per wheel: load transfer, longitudinal/lateral slip, heat, tread, carcass, puncture/blow-out, wear by cause; burnouts
    (throttle + brake / handbrake at standstill) only when power beats traction + brake hold for that drivetrain;
  - world objects: `OBJ_CLASS` rigid/breakable/movable/vehicle/traversable; energy-based bend → break; signs now breakable;
    dumpsters shoved/tipped; broken street lights also hide arm, head and light pool (v38 left them floating); pooled debris/sparks;
  - diagnostics panel (key **O**, button), dashboard warnings, free "Repair all" / "Replace tyres"; v38 saves migrate.
  - Tests: `damage_test.js` (50), `damage_pw.py` (Playwright, screenshots), `off_trace.js` (hash identical to v38); `realism_test`
    bounds updated to the v39 floors.
- **v39b map data** (`osm/overpass/*`): Overpass fetch of the whole playable window (the network's own window), classification incl.
  `education=school` / `building=mosque`, de-duplication, official Awqaf/MoE lists cross-checked by name only (no coordinates),
  `manifest/places.json` + `geo_summary.json`; `03c` regenerated: **places 1038 → 1473** (+102 schools, +82 mosques, +27 hospitals…),
  previous rows keep order so `RLP()` landmark seeds are unchanged; "Latin Church" no longer classed as a mosque.
  Baselines after v39b: `h21` places 1473 (laz 1450), `h24` bad 6, `vg` bad 9, `tour` 0 off-road, `dyn_check` bad 0, `h16` fines 0.
- **v39c manifests/docs**: `manifest/cars.json` + `world_objects.json` (generated from the build by `tools/gen_car_manifest.js`),
  `manifest/photos.json` (`osm/photos/commons.py`), `AUDIT_REPORT.md` (v37 audit moved to `docs/AUDIT_v37.md`),
  `DATA_SOURCES_AND_LICENCES.md`, `manifest/DATASET_REPORT.md`, `TEST_REPORT.md`.
- Not done: licensed 3D car models (none downloaded), real building outlines / buildings outside the extract, photos shown in game.

## v40 (2026-10-17): Phase 1, real map and place data

Owner request "Phase 1: fix the real map and all place data" (approval recorded in PLAN.md, including landmark name changes in "Passing:").
Backup tag `v39c-backup-before-phase1`. Details: `PLACE_IMPORT_REPORT.md`, `NAME_CORRECTIONS.md`.
- **Places 1,473 -> 1,659.** `06l_real_pois.js`: the "anything within 42 m (80 m same kind) of a landmark is skipped" rule is gone. An OSM row is
  merged into a hand-built landmark only when `POID_LM` (OSM id -> landmark, `osm/overpass/build.py` `LANDMARK_OSM`) says it is the same facility.
  7 real neighbours come back (Cairo Bank at the Clock Tower, Greek Orthodox Church beside Beit Arar, mosque نوح القضاة at Yarmouk, Jordan Kuwait
  Bank, an optician, a food truck, امنية). New: 147 neighbourhoods/villages/localities (`kind:'area'`: searchable, no label, r 150 so never "Passing:"),
  4 bus stations, 11 sports pitches, 1 playground, and name-only OSM points (`fetch.py` now asks `node["name"]`, which is how "Wasfi AlTal square"
  is mapped). POID rows gained column 8 (other verified names: `name:ar`, `official_name`, `alt_name`, `old_name`, `brand` …), all searchable.
- **Names:** landmark names corrected to their OSM names; the old ones are aliases. OSM names: whitespace fixes, plus a split of one tag holding
  Arabic + Latin spellings of the same name (transliteration-checked; 7 records); 131 others flagged in `manifest/name_review.json`, not changed.
- **Positions:** `siteReal()` (06g2) builds Dar As-Saraya, Beit Arar and Beit Nabulsi ON their BLDD footprint (model scaled via `S.kx/S.kz`,
  honoured by `wl()` and `wallC()`). `CLK_SITE` (06b) puts the clock tower in the real square median (plaza scaled to the 6.9 m clearance,
  kiosks/benches dropped). Landmark markers move to the OSM point when > 15 m off (Wasfi Al-Tal Square 681 m, KAUH 1.19 km, MK 46 m,
  Nissan 47 m, Sameh 34 m, Emaar 19 m), except campuses and models already on their real footprint (`p.onReal`, Arabella).
- **Buildings:** `osm/bld/conv_overpass.py` (pure-Python port of `conv.py`, game projection) -> `03e_bld_out.js` (`BLDO`, 26,432 buildings /
  28,153 pieces outside the BBBike extract). `placeReal` places BLDD + BLDO (47,001 pieces placed, was 19,959). Generated fabric and generated
  campus blocks only fill where no real building lies within ~50 m (`realCnt`).
- **Performance:** chunked InstancedMeshes now `frustumCulled=true` against their chunk sphere (three r128 creates them with culling off,
  so every building chunk in the city was drawn every frame). `dc2`: 540–1,060 draw calls, 83k–281k triangles (v39: 2,110–2,577 calls, 1.26–1.33 M).
  Build size 3.40 -> 4.23 MB.
- **Importer:** `fetch.py` caches raw layers for 30 days (`--refresh` to force), writes atomically, keeps the old file on failure;
  `build.py` writes `manifest/name_review.json` and `manifest/unresolved_places.json`; Openverse photo pass `osm/photos/openverse.py`.
- Tests: `off_trace` now checks a collider-free hash (pure physics, = v38) and reports the with-world hash separately (it changes when buildings
  near the start move). Test scripts use the new landmark names. Baselines after v40: `h21` places 1659 (laz 1489), `h24` bad 6, `vg` bad 9,
  `h14` bad 2, `tour` 0 off-road, `dyn_check` bad 0, `h16` fines 0, `lmchk` all landmarks <= 5 m from their OSM point.

## v41 (2026-10-17): Phase 2, realistic handling, real traffic calming, car-model search, audits

Owner request "Phase 2: realistic cars, buildings, roads, physics and damage" (approval in PLAN.md). Backup tag `v40-backup-before-phase2`.
- **Handling mode (key H, `07g_drive.js`):** Arcade (default) = v38 physics, unchanged (`off_trace`). Realistic = generic engine torque curve
  (EV: constant torque then constant power), automatic gearbox (4–7 gears by top speed/body type; EV single speed; shift times), traction limit
  μ·g·(driven-axle load incl. longitudinal transfer), drag + rolling resistance, engine braking, speed limiter where the listed top speed is below
  what the power gives (126 cars), wheelspin → RWD power oversteer (`ptLat`) / FWD understeer (`ptSteer`), sprung body (pitch/roll/heave
  spring-dampers, 1.2–2.8 Hz by body type), bumps absorbed by the suspension (`ptBump`). Per-car peak torque and drag area are SOLVED (`ptCalib`)
  so each car reaches the game's own listed 0–100 and top speed; tyre μ is raised only where the listed 0–100 needs it (cap 1.7).
  All values are estimates (`manifest/car_powertrain.json`). HUD shows gear/rpm in Realistic; diagnostics show the powertrain numbers.
- **Speed bumps:** OSM traffic calming (`fetch.py traffic_calming` → `OSM_CALM` in 03c): 2 real bumps placed first (`estimated:false`), 88
  estimates as before. OSM's 3 speed cameras are recorded, not placed.
- **Car models:** `tools/sketchfab_search.py` searched Sketchfab's public API for every car → `manifest/car_model_candidates.json`
  (search only, nothing downloaded or bundled).
- Tests: `tests/handling_test.js` (calibration for all 217 cars, gears/redline, launch by drivetrain, under/oversteer, braking, coasting, bump hop
  and suspension, damage once per crossing), `tests/bld_check.js` (building footprints at their OSM centres and heights). `wheel_test` also run
  with Realistic handling on (30/30).
- Docs: `CAR_ASSETS_AND_SPECS.md`, `DAMAGE_AND_TIRE_WEAR_REPORT.md`, `ROAD_AND_TERRAIN_REPORT.md`, `REALISM_FEATURES.md` (handling section).
- Not done: licensed 3D car models (account + licence/trademark decision + single-file conflict), bridge decks at real heights, denser terrain,
  OSM surface grip, new landmark models or lighting changes, real-device tests.

## v42 (2026-10-17): master repair: paid per-part repair bay, G29 calibration, tyre state, place review

Owner request "Irbid Drive: complete master repair and realism upgrade" (approval in PLAN.md). Backup tag `backup-v41` (pushed).
- **Comparison with other copies:** `Downloads/irbid-drive-updated*.zip/html` are byte-identical to git v38 (`24a84ae`). `irbid-drive-source.zip` is
  a v38-era snapshot (between v38 and the v38 review fixes). Both are superseded by v39–v41, so nothing was merged. `Downloads/irbid-drive-place-name-review.csv`
  (1,111 rows from an older snapshot, flags only, no corrections) was cross-checked: 198 rows have the same OSM id in the current data, 893 the same name within
  60 m, 4 the same name elsewhere, and 16 are not in the current OSM place data.
- **Repair bay (`08d_repair.js`, new; hooked into `renderShop`):** `repairItems()` lists damaged parts with condition, effect (the diagnostics
  wording) and a JD price; `repairPart(id)` fixes one item (`z:<zone>` also removes the dents nearest that zone, `li:`/`gl:` one light/window,
  `c:<component>`, `s:<corner>` + alignment, `t:<wheel>`); `payRepair(ids)` charges `spent` only when the balance covers the whole order.
  Diagnostics' free buttons are replaced by a route to the garage (`garageGo`). `repairCurrentCar()` stays as an internal full reset (tests).
- **G29 (`10c_wheel.js`):** two-step pedal calibration (released value averaged 0.4 s, then full press); brake may share the throttle axis
  (combined pedals); clutch axis (display only, automatic gearbox); pedal dead zone slider; a released end that the axis later passes is moved
  (browsers that report 0 until first touch); live % readouts and raw axes; "Other controllers seen → Use" for pads whose id is not
  recognised; clear "no Gamepad API / blocked / no wheel (not live)" messages. Diagnostics show the wheel status line.
- **Tyres:** each wheel also keeps the distance driven on it (`km`) and its peak temperature (`tmax`); diagnostics label slip as longitudinal / lateral, flag
  spinning or locked wheels and show the surface grip.
- **Places:** `tools/place_review_csv.py` → `PLACE_REVIEW.csv` (2,171 rows: 1,531 ok, 494 unnamed (kept unnamed), 125 needs review,
  10 corrected, 11 landmark issues). No place data changed (`h21` places 1659, same as v41).
- Tests: `damage_test` 58/58 (7 new repair-bay checks), `wheel_test` 40/40 (10 new), `damage_pw` 10/10 (repair bay clicked in Chromium),
  everything else unchanged from v41 (see TEST_REPORT.md). New doc `G29_TEST_REPORT.md`.
- Not done: licensed 3D car models, new landmark models/photo facades, bridge decks, denser terrain, real G29 hardware test, real-device tests.

## v43 (2026-10-17): place accuracy audit (owner's `irbid-place-database-issues.csv`), full repair inspection

Owner request "Irbid Drive: complete accuracy audit and repair". Backup tag `backup/v42`. Every CSV issue re-checked against the current data and
the official sources; per-issue status in AUDIT_REPORT.md (v43 table).
- **Importer (`osm/overpass/build.py` + new `corrections.py`):** fixed the POID read-back regex (it swallowed `OSM_CALM` and crashed);
  libraries are civic, not schools; placeholder names ("no name") are dropped; a name tag with several ";" values keeps the first as the
  name and the rest as aliases; a name that states what the place is (مدرسة/مركز صحي/بلدية/مسجد/كنيسة/travel agency) overrides contradicting
  tags (23 records: Zubiya schools and 14 health centres were "Hospital", travel agencies were "Sports centre"); editor-preset `brand` tags
  that do not match the name are not used as aliases (35; fuel stations and ATMs exempt); per-record overrides with evidence and confidence
  (CAT-001…006, NAME-001, OSM-002/004, heritage aliases). Outputs `manifest/heritage_check.json` (27 municipal heritage sites + 5 malls) and
  `manifest/osm_upstream_issues.json` (58 suspected OSM errors; OSM is not edited). Same-name groups and same-name pairs of different kinds
  are flagged, never merged. New owner-verified import file `osm/manual/verified_places.json` (empty; needs a source and a verifier per entry).
- **Places:** 4 rows removed (Hakama "mosque", "No name", 2 duplicates revealed by the ";" split), 68 changed, 0 moved, 0 added (no candidate
  had a usable coordinate). `h21` places 1659 → 1655 (laz 1489 → 1485). Estimated speed bumps re-derived from the corrected kinds (still 90).
- **Repair bay:** "Full inspection" list in the Apex Drift Customs shop: all 30 parts (8 body zones, 4 lights, 4 windows, engine, cooling,
  gearbox, driveline, steering, brakes, 4 suspension corners, 4 tyres) with condition; damaged ones keep their own Repair button, the rest
  show "OK · no charge" (`inspectRows()` in `08d_repair.js`).
- **Offline start:** if three.js cannot load from cdnjs (no network), the page shows "Irbid Drive could not start" with the fix (go online or
  open the offline copy with three.js inlined) instead of a black screen (`01_head.html`).
- Docs: new `BUILDING_LANDMARK_REPORT.md`, `FINAL_TEST_REPORT.md`; NAME_CORRECTIONS, PLACE_IMPORT_REPORT, PLACE_REVIEW.csv (2,259 rows),
  AUDIT_REPORT, DATA_SOURCES updated.
- Tests: new `tests/place_audit.py` (29 checks); `damage_test` 59 (inspection list; a tyre repair leaves suspension untouched);
  `damage_pw` +1 (inspection list in Chromium). Everything else as v42.
- Not done: irregular building footprints, landmark photo facades, licensed car/landmark models, bridge decks, physical G29 and phone tests.

## v43b (2026-10-18)

The owner re-supplied the v43 audit files (`irbid-place-database-audit.md`, `irbid-place-database-issues.csv`, byte-identical to the v43 CSV,
and `irbid-drive-changes-after-artifact.md`, which describes damage/garage/G29/speed-bump work already in v39–v42). Every CSV issue already
has a v43 status (AUDIT_REPORT.md). New this time: a **Wikidata** cross-check (CC0, items within 15 km of Irbid).
- Independent position check: Dar As-Saraya 1 m, Nabulsi House 6 m, Beit Arar 24 m, Al-Hassan Stadium 26 m, Yarmouk 21 m, Capitolias 4 m from their Wikidata points.
- Search aliases (`corrections.py`, audit id `wikidata`): "Museum of Jordanian Heritage / متحف التراث الأردني" on OSM "Historical Museum" (27 m, medium),
  "كابيتولياس" on Capitolias (4 m, high), "حدائق الملك عبدالله الثاني / King Abdullah II Gardens" on King Abdullah II Park (185 m, medium). Display names and coordinates unchanged (`h21` identical).
- Not placed: Abu al-Darda shrine (Wikidata Q20424481, 32.590131 35.79359; nothing in OSM within 378 m), Irbid City Centre (Wikidata Q138025302 = the same rounded point as Wikipedia).
  Wikidata found nothing for the Mamluk mosque, Tell Irbid, the heritage houses or Irbid Mall.
- Tests: `place_audit.py` 30/30 (new alias check), in-game search finds all 5 new names, `damage_test`, `realism_test`, `off_trace` (identical to v38), `val_net` 400/0, `h24` bad 6, `lmchk` unchanged.

## v44 (2026-10-19): visible component damage, material-based destruction, physical speed bumps, rebuilt traffic signals, +74 places

Owner request: "IRBID DRIVE — MASTER IMPLEMENTATION TASK" (FH4-inspired visible damage, destruction by material, real Irbid data, signals,
speed bumps, sources). Original procedural implementation; no third-party code or assets. Backup: git tag `backup/v43b`. Report: `V44_REPORT.md`,
sources: `docs/REALISM_RESEARCH.md` (46 sources actually used, not 200), screenshots: `docs/screenshots/v44/`.
- **Vehicle parts (new `07h_dmgparts.js`, player car only):** tagged front/rear bumpers, mirrors, bonnet and boot lids, door skins on every car the
  player drives (all 217 models share `mkPorsche`, so 100 % of models get them). Bumpers scuff (paint), crack/bend, hang, and tear off as world
  debris that stays on the road; mirrors fold and snap off; bonnet/boot buckle (vertex crease from an immutable base); doors bow inward.
  Glass: per-pane crack ORIGINS stored in the record (laminated windscreen grows spider-web cracks at the hit point; tempered side/rear glass
  crazes over the pane). Lamps get a cracked lens. Flat tyres squash with a bulging sidewall; rims bend (visible wobble + vibration). Textured paint
  scratches replace the old grey boxes. Contact area matters: a pole/tree makes a narrower, deeper dent than a wall. Damage → driving (Full):
  flat tyre rolling resistance (`DFX.roll`, the only new `updP` term, 0 unless Full + flat), bent rims add pull/vibration/grip loss. Record v2
  gains `parts`, `cracks`, `rims` (old saves migrate by filling fields). Repair bay lists 8 parts + 4 rims (inspection 30 → 42 rows).
- **Environment by material (07e):** trees (wood; snap speed ∝ trunk diameter^1.5, i.e. energy ∝ d³: 97 km/h for the slimmest 0.28 m trunk, rigid
  in practice for the rest; canopy shake, leaves/bark, felled trunk+canopy), masonry garden walls (crack mark, collapse into rubble), bus-shelter
  tempered glass (shatters, frame stays), W-beam guardrails (deflect up to 0.45 m, car crush ×0.8), building walls (local scrape/crack decal, never
  demolished). Objects accumulate damage (`o.dmg`). Trees, garden walls, rails and shelter glass got instance keys (no PR() calls added).
- **Speed bumps:** one merged, terrain-draped profile mesh (cos² cross-section; OSM hump 3.7 m × 75 mm, OSM bump/estimated 0.9 m × 75 mm) replaces
  ~880 box meshes; `bumpAt()` gives the same surface to the wheels. Per-axle quarter-car (per-car fn/ζ from 07g, wheelbase from carSpec, travel
  by body type, tyre drop limit) drives body heave/pitch, wheel travel and a short chassis vibration; bottoming / harsh compression damages that
  axle (Cosmetic/Full). Locations unchanged (2 OSM + 88 estimated); `manifest/speed_bumps.json`.
- **Traffic signals:** 3-aspect heads (red top) facing their approach just past the stop line, lamps lit per state (one InstancedMesh, recoloured on
  phase change only); cycle 60 s (green 24, amber 3, all-red 3) with 4 offset groups; one controller per split junction; approaches < 16 m have no
  stop line; junctions with < 2 usable approaches are not signalised. 177 nodes → 17 junctions (3 OSM-mapped, 14 estimated major crossroads;
  4 not modelled incl. 1 OSM). `manifest/signals.json`. Note: v43 heads did change colour, but as one cube per axis, all junctions in step.
- **AI fix:** traffic measured junction distance from its next path point (up to 9 m ahead), so cars at a red stop line could believe they
  were in the junction and drive through. Now `pathProg()` (projection, or straight-line remainder on corner cuts). 0 red-light entries in
  repeated 6-minute simulations.
- **Places:** new Overpass `named` layer (peaks, springs, works, cemeteries, named areas, named non-residential buildings) and tags for camp/caravan
  sites, arcades, dance/sports halls, nature reserves; "كراج" stands as transport. Residences (all OSM dwelling building values, names starting
  منزل/فيلا), person-only names, security sites and plain descriptions are excluded. 1,648 → 1,722 POID rows; in-game places 1,655 → 1,729
  (+74). Verified schools added: 0 (none with coordinates in any reachable source). Al-Ghasoor school and Pikaboo: not found; Smile = 3 OSM shops
  (already present). OSM has 1,933 named non-road objects in the whole window, so +10,000 is not reachable from OSM.
- Tests added: `damage_v44.js` (29 checks incl. bump speed sweep + materials), `signals_test.js` (12), `damage_v44_pw.py`, `world_v44_pw.py`,
  `perf_pw.py`; `place_audit.py` 30 → 33; `damage_test` inspection 42 rows; `handling_test`/`realism_test` bump checks rewritten for the profile model.
  `off_trace` unchanged (identical to v38).

## v45 (2026-10-19): Realistic tyre model + drift, synthesised engine audio, pause/settings, quality presets, save validation
- **Realistic handling (`07g` `ptDyn`)**: the v41 multipliers (`ptLat`/`ptSteer`) are replaced by a two-axle tyre model: slip angle per axle,
  saturating lateral curve `cap*sin(1.4*atan(B*a))` (peak slip angle by body type), normal load = static split + longitudinal transfer
  (`m*ax*hcg/wb`) + aero downforce estimate (race/supercar), friction circle per axle (drive/brake force eats side grip: RWD power oversteer, FWD
  power understeer), locked-rear handbrake (sliding friction opposite the rear contact velocity), yaw inertia `m(L²+W²)/13`, rotating-frame
  coupling; 240 Hz sub-steps (max 12/frame); blends to the kinematic model below 2–6 m/s. Keyboard steering ramps (4 rad/s, 6 rad/s back to
  centre / countersteer); wheel input is direct. Arcade is untouched (`off_trace` identical to v38). `TSLIP` (slip state for smoke/squeal) is filled
  in both modes (Arcade: body slip angle), never read by physics.
- **Audio (`12d_audio.js`, new)**: Web Audio, fully synthesised (no recordings/files/network). `ENG_DOC`: engine layout of all 217 cars (cylinders,
  bank layout, aspiration, hybrid; 58 marked "variant not specified by the game"). Per car, one 720° cycle of exhaust pulses (firing intervals,
  cross-plane V8 bank pattern, flat-plane, unequal-length boxer, rotary, diesel knock, hashed per-car variation) → PeriodicWave at rpm/120.
  RPM/gear from `PTS` (Realistic) or a sound-only gearbox on the same ratios (Arcade). Turbo whistle + blow-off, supercharger whine, EV and hybrid
  motor whine, limiter, shift dip, overrun pops (sporty petrol only), crank/start and shutdown on car change, misfires at low engine health (Full),
  tyre squeal from `TSLIP`, gravel, wind, road, nearest traffic car, impacts (crash/glass/bump thump). Nodes built once on the first user gesture;
  volumes Master/Engine/Effects/Ambient + mute (key **L**) under `irbid-drive-audio-v1`.
- **Pause / settings (`12e_pause.js`, new)**: Esc (or the wheel's Back button) pauses everything (simulation, timers, audio) and shows sound
  sliders, graphics quality (Auto = v40 adaptive, High, Medium = no bloom + 2048 shadows, Low = no post chain + 1024 shadows + 0.7× detail
  range; key `irbid-drive-gfx-v1`), a frame-time meter (fps, mean/99th-percentile frame time, draw calls), handling and damage toggles. Esc that
  closes another menu never also opens the pause menu. A hidden tab suspends audio.
- **Performance (behaviour-neutral)**: `lodTick` (24,476 distance checks) only runs after the camera moved 3 m; HUD `innerHTML` written only
  when the text changed; the camera lerp target is reused instead of allocated per frame.
- **G29 (`10c`)**: steering centre offset ("Set centre"), response curve (1–2.5) and optional smoothing (0–150 ms) in the setup screen (V).
- **Save (`07b`)**: same `irbid-save` shape (+ `sv:1` marker); values validated (finite numbers, tune levels 0–5 integers, known cars only); an
  unparsable save is copied to `irbid-save-corrupt` before anything can overwrite it; the last good save is kept as `irbid-save-prev`.
- **Signs**: plates had DoubleSide text (mirrored from behind); now a front face + a plain metal back with the same outline.
- Tests added: `drift_v45.js` (23), `audio_v45.js` (10), `save_v45.js` (9), `audio_v45_pw.py` (12), `pause_v45_pw.py` (12), `cpu_prof_pw.py`.
  `handling_test`: the "turns in at least as hard as Arcade" checks were tied to the removed multipliers; replaced by which axle works harder.
- **Bugs found by the real-browser playtest and the wheel test (part 4)**: the HUD (top bar, speed, minimap, drift/race text) was painted under
  the 3D canvas since v24 (the 1080p display lock made the canvas `position:fixed` and it is appended after the HUD; equal `z-index:auto` =>
  DOM order); canvas is now layer 0, HUD layer 3. The wheel's Back button closing the setup also opened the new pause menu (synthetic Esc on
  `window` runs listeners in registration order) -> `ESC_PRE` snapshot in the first key listener. Wheel buttons were not read while paused (polling
  lives in `updP`) -> the paused loop polls the wheel. `fpsTick` crashed on renderers without `info` (Node stubs). Realistic mode: frames longer
  than 1/60 s are split into equal physics steps (`updPStep`). HUD help line kept clear of the Damage button; speed lifted off the attribution.
- `tools/make_offline.py`: offline copy with three r128 inlined (`dist/irbid-drive-offline.html`, git-ignored); `playtest_v45_pw ... offline`
  passes with zero network requests. `wheel_test` 41 checks (+ Back button pauses / resumes).

## v46

Owner request 2026-10-19 ("MASTER RESEARCH, AUTONOMOUS IMPLEMENTATION AND PERMISSION ADDENDUM"). Full report: `V46_REPORT.md`.
- **Manual gearbox (Realistic, `07g` + `11c_assist.js` new)**: `PTS.man`/`PTS.req`; Q down, E up (E still robs the bank when standing at it), wheel
  paddles. The first Q/E switches Automatic -> Manual; the Esc menu switches back (`irbid-drive-gearbox-v1`). A downshift that would put the engine
  above 103 % of the redline is refused; at the redline in Manual the drive force is cut (limiter). HUD `M3` instead of `G3`. Arcade: Q/E only
  explain that gears are Realistic-only. EVs/single-speed: no shifting.
- **G29 defaults (`10c`)**: right paddle (4) shift up, left paddle (5) shift down, handbrake 6, camera 7, horn 10 (held), auto-drive 11. A layout
  saved by an earlier version keeps its buttons; new actions only take buttons it does not use. Button numbers are the commonly reported Chrome
  layout of the G29; not verified on the owner's hardware.
- **Horn (X)**: synthesised dual-tone horn (~405/508 Hz square pair, shaped, band-passed). A traffic car still sitting after a knock moves off.
- **Auto-drive (Z)**: follows `NAV.pts` (pure pursuit on a point 7 m + 0.45 s ahead, offset into the right-hand lane like traffic), speed from
  the route legs' posted limits (braking 2.5 m/s² for lower limits ahead), curvature (3 m/s² lateral x wet grip), red/amber lights (stops
  13.5 m before the junction node: the red-light rule watches a 12 m circle), cars ahead, heading error, the destination. Feeds `updP` as a
  wheel-input object, so it uses the player's physics in both handling modes; never moves the car directly. Any steering/gas/brake/handbrake
  input hands back control; gives up when blocked for 6 s; off in races and heists. `planRoute` now returns its `legs` (`NAV.legs`).
- **Road reputation + rival memory**: 0-100 (start 70): -6 hit traffic, -4 red light, -2 wrong way, -1 speeding (counted only when the fine
  actually applies), +1 per 45 s of clean driving above 15 km/h. Below 50, traffic behind the player keeps 6.5 -> 12 m (`REPG.gap`, `09_ai`);
  blocked drivers behind a stopped player honk after 6 / 3 / 1.5 s (not while their own light is red); a car you hit honks (positional,
  `audHornAt`: stereo pan + 1/(1+d/8) + distance low-pass). Samer/Layth/Omar remember races, wins, losses, hits; next race skill
  `base + clamp((wins-losses)*.004, -.02, .03) (+.01 after 3 hits)`, bounded .94-1.05. Saved in `irbid-drive-rep-v1`, validated, log capped at 20.
- **Weather + clock (`12f_weather.js` new)**: simulated. Auto: per "day" (8 blocks of 3 game hours), rain-day chance = JMD Irbid precipitation
  days / days in the month (Asia/Amman month); a rainy day rains in 45 % of its blocks (estimate). Cloud cover (sky shader `uCov`), grey sky and
  zenith, dimmer sun, shorter fog in rain, 1,800 rain streaks (one LineSegments, wrapped round the camera in the vertex shader), wetting and
  drying (estimates), darker/glossier road materials. Realistic grip x(1 - .28 x wet); Arcade unchanged. Clock: game time (default) or
  Irbid local time (Intl Asia/Amman; fallback UTC+3); T switches back to game time. Rain and wet-tyre hiss audio. Live weather not added.
- **Bug fixes (fines)**: (1) speeding was fined while crossing a junction of a slower side street (the nearest road at the junction is the cross
  street); a limit now counts after 1.5 s on that road. (2) the red-light rule tested the absolute `P.y < 1.5` (a pre-terrain "not airborne"
  check), so since v37 no red light was enforced anywhere above Al-Balad's level; it now tests the height above the ground.
- Tests: `assist_v46.js` (Node), `v46_pw.py` (Playwright), `wheel_test` +2 (paddles, horn; handbrake button moved to 6 with the new defaults).

## v47

Owner brief 2026-10-19 ("PROJECT: IRBID DRIVE … phases 1-10"; the paste ended in Phase 10). Audit, workflow, platforms, assets. New
options only: with the defaults (Auto quality, High traffic) the game plays exactly as v46 (`off_trace` hashes unchanged).
- **Platform robustness:** `02_setup` shows `#nogl` when three cannot create a WebGL context (it used to leave a blank page); `01_head` adds a
  loading screen (`#boot`, removed on the first frame by `12g`), an error banner (`#errBan`, uncaught errors and rejections, at most 3) and a
  portrait-phone hint (`#rotHint`, CSS only); buttons and inputs inherit the page font (WebKit showed serif). New `12g_platform.js`: on
  `webglcontextlost` it pauses the game with a message and resumes on `webglcontextrestored` (three r128 rebuilds its GL state); `PLAT` and
  `platLine()` give a device report in the pause menu.
- **Head-script trap:** the Node tests and tools find the game script with `/<script>\n/`, so the new head script starts `<script>(function…`.
  `tools/check.py` guards this.
- **Graphics presets (`12e`):** Low renders a 1280x720 buffer (plus the v45 settings: no post, 1024 shadows, 0.7x detail range); new **Ultra**
  renders 2560x1440 with the post chain resized (supersampled) and 1.3x detail range. Auto, High and Medium are unchanged. High already used 4096 shadows.
- **Traffic density (`12e`):** High 80 (v46) / Medium 52 / Low 28. Parked cars are hidden, not updated (`updTraffic` wrapper) and moved to
  2e5; restored cars respawn 200+ m away. Stored in `irbid-drive-gfx-v1` as `t`.
- **Assets:** `assets/manifests/{vehicles,audio,environment,textures,code}.json` (289 entries: licence, attribution, size, SHA-256, rights,
  verified, tier, restrictions), generated by `tools/gen_asset_manifests.js` from the build; `scripts/validate-assets.js` checks them.
  Licence research for Poly Haven, Sketchfab, CGTrader and Freesound: `docs/ASSET_SOURCES_AND_LICENSES.md`. Nothing downloaded.
- **Workflow:** `tools/check.py` (quick / `--full`, report in `.check/report.md`, last good build in `dist/last-good/`).
- **Apps:** `app/` Capacitor 8.5 (Android and iOS projects generated, SPM), `tools/make_app_www.py`. Not built: no Android SDK here, no Mac.
- **Docs:** `docs/PROJECT_AUDIT.md`, `DEVELOPMENT_PLAN.md`, `TEST_REPORT.md`, `PERFORMANCE_REPORT.md`, `ASSET_SOURCES_AND_LICENSES.md`,
  `KNOWN_ISSUES.md`, `PLATFORM_SUPPORT.md`, `CHANGELOG.md` (a pointer here).
- **Tests:** `v47_pw.py` (15: presets, traffic, pause rows, context loss/restore with a pixel check, error banner, no-WebGL), `xbrowser_pw.py`
  (Chromium, Firefox, WebKit desktop; WebKit iPhone landscape, portrait and iPad; Chromium Pixel 7), `perf_v47_pw.py` (preset and traffic cost).

## v48

Owner brief 2026-10-20 ("THE COMPLETE MASTER DEVELOPMENT PROMPT", Parts 1-19 and 100 features). Checklist: `docs/FEATURES_100.md`.
Blocked parts: `docs/MULTIPLAYER_PLAN.md`.
- **Driving school (`11d_school.js`, new):** 5 lessons (start and stop, emergency stop, speed limit, traffic light, reverse parking) on real
  OSM streets found near the start (`schFind`: straight, two-way, 6+ m wide, 30-70 km/h; the light lesson ends at a signalised junction).
  The player drives with the normal controller; instructor panel, penalties (speed, lane side, hits via the fine wrapper, red light via
  `last.red`), score 0-100, result card (Retry / Next / Close), best scores in `irbid-drive-school-v1`. Markers are added after the terrain pass.
- **Driver assists (Realistic, `07g` + the `updP` brake line):** ABS (default on = v47 braking; off: demand above 0.92·mu·g locks the wheels,
  0.8·mu·g sliding, front side grip ×0.15), traction control (caps drive force at 0.97 of the limit), stability control (yaw rate pulled toward
  the kinematic rate, throttle ×0.3 while active). `irbid-drive-assist-v1`. The HUD shows LOCKED / ABS / TC / ESC when active.
- **Cameras:** C cycles chase / cockpit / bonnet / bumper; positions come from the car's length and height (the cockpit view was a fixed 1.5 m).
- **Accessibility (`12e`):** text size 90-140 % (CSS zoom on the HUD and menus), reduced motion (no speed FOV zoom, no post motion blur;
  defaults to `prefers-reduced-motion`). `irbid-drive-a11y-v1`.
- **Bug caught before release:** `ASTORE` (assists) clashed with the audio part's `ASTORE`; the whole game would not have started. Renamed
  `ASSTORE`; `tools/check.py` now parses the WHOLE game script too (per-part checks cannot see cross-part duplicates).
- **Tests:** `assist_v48` (19: the defaults' Realistic trace equals v47's, ABS lock and steering, TC spin, ESC slip, Arcade unaffected, 5 lessons
  pass and fail by the rules, saving), `v48_pw` (12: cameras, menu rows, a lesson started by a real click, result card, retry, text size, reduced motion).

## v49

Continues the v48 list of not-started features that need no accounts (`docs/FEATURES_100.md` #14, #16, #31, #53, #54). Every change is an
OPTION or an addition to the search list: with the defaults the game plays exactly as v48 (`assist_v49` compares a Realistic trace with
`backup/v48`; `off_trace` unchanged).
- **Tyre temperature and brake fade (`07g` `SIMX`, two factors in the `updP` sfc / bkEff lines):** Realistic only, both off by default (factors
  exactly 1). One temperature for all tyres: heated by cornering / traction work, rolling and slip, cooled toward the air (lower when the road
  is wet); grip ×0.92 cold, 1.0 at 90 °C, down to ×0.85 overheated. One brake temperature: braking energy heats it (~215 °C for a stop from 140
  km/h), airflow cools it; above 400 °C the brake force fades to 60 % at 700 °C. HUD shows both (and FADE). `irbid-drive-sim-v1`. All estimates.
- **Traffic "By time of day" (`12e`):** density follows the hour (`TPROF`, a generic weekday curve, not Irbid counts: 30 % at night, 100 % at
  08:00 and 14:00-16:00). Checked every 5 s (`trAutoTick` from the loop); a car within 250 m of the player is never parked.
- **Search (`11b`):** 11 category chips above the results filter by place kind (also with a typed query; empty query = nearest of that kind).
  ☆ / ★ on each result saves up to 20 places or streets (`irbid-drive-fav-v1`); the empty search box lists them first. Arrow keys skip the chips.
- **Tests:** `assist_v49` (30: v48 trace with options off, tyre warm-up / cooling / overheat, brake fade over 8 stops and recovery, Arcade
  unaffected, saving, traffic by hour and the 250 m rule, chips, saved places), `v49_pw` (12: real clicks on chips, ☆ and a saved place,
  pause-menu rows and storage, HUD temperatures). Both are in `tools/check.py`.

## Roblox version 2 (2026-10-21)

`roblox/` becomes a complete Roblox Studio project (Luau); the web game is unchanged. `tools/make_roblox.js` now also exports the road
graph (5,972 edges inside the 2.5 km map: one-way, limit, street name, width; 3,903 junctions), 650 OSM places, the bank and tuning-shop
sites, the two circuits that fit the map (routed by the web game's own `route()`), rarity tiers and 22 cars with generic names; it packs
every file of `roblox/src` by folder (Rojo naming) into `IrbidDrive.rbxlx` with `Workspace.StreamingEnabled = false`.
- **Gameplay, rewritten in Luau with the web game's numbers:** Arcade driving + drift formula (rarity, Extra Drift upgrade), Apex Drift
  Customs upgrades (base x 2^level, drift points, at the shop only, per car), car wheel (10,000; 50/35/10/4/1 %; duplicate refund 5,000),
  bank heist (2:00, +500 / up to -50, 3:00 closed), street races vs 3 rivals (Roblox-only cash rewards 1,000/500/250/100), traffic on the
  real graph (right-hand lane, limits, bends, following), GPS over the real places with one-way routing, minimap, street names, day/night
  with headlights, saving per car. The server checks every payout (drift rate cap, race minimum time, heist distance / duration).
- **Buildings vs roads:** roads are drawn at the web game's widths, so 2,744 real footprint pieces that reached into a carriageway are cut
  back from the road side (77 too thin are dropped); the old rule (centre near a road -> drop 1,032) let large footprints block streets.
- **Bugs found by the headless test before any Studio run:** ground ray only 60 m long (a teleport onto higher ground would have dropped the
  car under the map), the car spawned unanchored before its device took it over (now anchored until `CarReady`), GPS progress measured
  by point index (dots and distance could start 40 m behind the car; now `Road.project`), police overshooting and circling instead of
  boxing the player in.
- **Tests:** `roblox/tests/run.js` loads the place file into `rbxmock.luau` (an engine stand-in run by the official Luau CLI: instances,
  CFrame/Vector3, ray tests against the real parts and terrain blocks, remotes, DataStore, a 60 fps scheduler) and plays `scenario.luau`:
  75 checks (map, spawn, GPS drive of 1.1 km, 0-100 / braking, drift + server caps, traffic, races, heist both ways, shop, wheel, garage,
  search, minimap, reset, clock, save / load). 75/75 in three runs. Not run in Roblox Studio (none on this PC).
