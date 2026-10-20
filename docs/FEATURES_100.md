# The 100 additional features: status (v49, 2026-10-20)

Status words follow the brief: **COMPLETE AND TESTED**, **IMPLEMENTED BUT UNTESTED**, **PARTIALLY IMPLEMENTED**, **BLOCKED**, **NOT STARTED**.
"Tested" means an automated test that ran in this repository (named in the Evidence column) or a recorded browser run. Each row was checked
against the code (`src/parts/`) on 2026-10-20, not taken from memory. v48 additions are marked **(v48)**, v49 additions **(v49)**.

**Totals (counted from the table):** COMPLETE AND TESTED 40 · IMPLEMENTED BUT UNTESTED 3 · PARTIALLY IMPLEMENTED 22 · BLOCKED 16 · NOT STARTED 19.

## Realistic world (1–10)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 1 | Road-surface variety | PARTIALLY IMPLEMENTED | Asphalt, track, kerbs, sidewalks and off-road grip (`surfK` heuristic). OSM `surface` tags are not imported. |
| 2 | Road markings | COMPLETE AND TESTED | Lane lines, centre lines, zebra crossings (`05a_roads`); `world_v44_pw` screenshots |
| 3 | Regional road-sign library | PARTIALLY IMPLEMENTED | Speed, stop and name signs (`06i_infra`, `SIGN_PLATES`). Not a full Jordanian sign set. |
| 4 | Streetlights | COMPLETE AND TESTED | `streetLight` class (breakable, lit at night); `damage_test`, `realism_test` |
| 5 | Sidewalks, curbs and ramps | PARTIALLY IMPLEMENTED | Sidewalks and kerbs on every road. No kerb ramps. |
| 6 | Parking areas and spaces | NOT STARTED | OSM `amenity=parking` is not imported. Only the school's parking bay (v48). |
| 7 | Building entrances and paths | NOT STARTED | Footprints are rectangles without doors. |
| 8 | Landmark silhouettes and locations | COMPLETE AND TESTED | ~23 hand-built landmarks on their OSM points; `lmchk`, `place_audit` (33) |
| 9 | Terrain transitions and elevation | COMPLETE AND TESTED | SRTM terrain pass, slope physics; `terr_check`, `dyn_check` |
| 10 | Map accuracy inspector | PARTIALLY IMPLEMENTED | Offline: `PLACE_REVIEW.csv`, `manifest/name_review.json`, `unresolved_places.json`. No in-game inspector panel. |

## Vehicle handling (11–20)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 11 | Vehicle-specific steering | COMPLETE AND TESTED | Wheelbase, tyre and mass per car (`ptSpec`/`ptDyn`); `drift_v45` (per-car checks) |
| 12 | Suspension movement | COMPLETE AND TESTED | `ptBody` pitch/roll/heave, quarter-car on bumps; `damage_v44` bump sweep |
| 13 | Weight transfer | COMPLETE AND TESTED | Longitudinal load transfer in `ptDyn`/`ptShare`; `drift_v45` |
| 14 | Tyre temperature (optional) | COMPLETE AND TESTED | **(v49)** Pause menu option, Realistic only, off by default. One temperature for all four tyres (no per-wheel model); grip peaks at 90 °C. `assist_v49`, `v49_pw`. Coefficients are estimates. |
| 15 | Tyre pressure tuning | NOT STARTED | |
| 16 | Brake fade (optional) | COMPLETE AND TESTED | **(v49)** Pause menu option, Realistic only, off by default. Brake force fades above 400 °C to 60 % at 700 °C. `assist_v49` (8 stops from 140 km/h: 73.7 m → 104.7 m), `v49_pw`. Estimates. |
| 17 | Differential configurations | PARTIALLY IMPLEMENTED | FWD / RWD / AWD drive splits per car. No limited-slip or open-differential choice. |
| 18 | Drivetrain tuning | PARTIALLY IMPLEMENTED | Shop upgrades (speed, acceleration, handling) change the physics. No gear-ratio tuning. |
| 19 | Configurable vehicle assistance | COMPLETE AND TESTED **(v48)** | ABS, traction control and stability control toggles (Realistic); `assist_v48` (defaults identical to v47, lock, spin, slip) and `v48_pw` |
| 20 | Repeatable handling test facility | COMPLETE AND TESTED | `handling_test`, `drift_v45`, `assist_v48` (scripted inputs, flat test world). It is a test harness, not an in-game track. |

## Cockpit and audio (21–30)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 21 | Interactive cockpit instruments | NOT STARTED | HUD speed, gear and rpm only. No modelled dashboard. |
| 22 | Functional mirrors | NOT STARTED | |
| 23 | Vehicle-specific camera positions | COMPLETE AND TESTED **(v48)** | Chase, cockpit, bonnet and bumper views sized per car; `v48_pw` |
| 24 | Dynamic engine audio | COMPLETE AND TESTED | 35 synthesised layouts driven by rpm and throttle; `audio_v45`, `audio_v45_pw` |
| 25 | Doppler effect | NOT STARTED | |
| 26 | Spatial audio | PARTIALLY IMPLEMENTED | Positional traffic horns (StereoPanner plus distance), nearest-traffic voice. Not full 3D panning for everything. |
| 27 | Road-noise variation | COMPLETE AND TESTED | Speed and surface road noise, gravel crunch, wet hiss; `audio_v45_pw` |
| 28 | Interior vs exterior sound | IMPLEMENTED BUT UNTESTED | The cockpit view muffles outside sound (low-pass). No test asserts it. |
| 29 | Customizable audio mixer | COMPLETE AND TESTED | Master, engine, effects and ambient sliders plus mute; `pause_v45_pw` |
| 30 | Accessibility audio cues | NOT STARTED | |

## Living city (31–40)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 31 | Time-dependent traffic density | COMPLETE AND TESTED | **(v49)** Traffic option "By time of day": a typical weekday curve (estimate, not Irbid counts); cars are parked or returned only > 250 m from the player. `assist_v49`, `v49_pw`. |
| 32 | AI parking behaviour | NOT STARTED | |
| 33 | Emergency-service traffic | PARTIALLY IMPLEMENTED | Police only, during the bank heist. |
| 34 | Configurable traffic-light phases | PARTIALLY IMPLEMENTED | 60 s cycle with 4 offset groups (`05b_decor`); `signals_test`. Not configurable in the UI. |
| 35 | Junction queue management | COMPLETE AND TESTED | AI waits at red, keeps gaps, never enters on red; `signals_test` |
| 36 | Temporary road closures | NOT STARTED | |
| 37 | Construction zones | NOT STARTED | |
| 38 | Environmental ambience | PARTIALLY IMPLEMENTED | Wind, traffic and rain sound. No city ambience bed. |
| 39 | Vegetation variety | PARTIALLY IMPLEMENTED | Several tree and shrub types (`06j_veg`). Not species-accurate. |
| 40 | Independent world-activity settings | PARTIALLY IMPLEMENTED | Traffic density, weather and clock (v46/v47). Nothing for pedestrians (none exist). |

## Weather (41–50)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 41 | Weather presets | COMPLETE AND TESTED | Auto, clear, cloudy, rain; `v46_pw`, `assist_v46` |
| 42 | Wet-road reflections | COMPLETE AND TESTED | Roughness, envMap and colour respond to wetness; `v46_pw` |
| 43 | Puddles | NOT STARTED | |
| 44 | Wind effects | NOT STARTED | Wind sound only. No wind on cars or trees. |
| 45 | Adjustable fog quality | PARTIALLY IMPLEMENTED | Fog distance follows weather and quality presets. No separate fog slider. |
| 46 | Cloud and sky variation | COMPLETE AND TESTED | Sky shader cloud cover; `v46_pw` |
| 47 | Sun position from simulated time | COMPLETE AND TESTED | Day/night cycle and Irbid local clock; `v46_pw` |
| 48 | Headlight visibility | PARTIALLY IMPLEMENTED | Player spotlight at night, car lamp meshes. Traffic headlights do not light the road. |
| 49 | Smooth weather transitions | COMPLETE AND TESTED | Eased cover and rain; `v46_pw` |
| 50 | Offline weather presets | COMPLETE AND TESTED | No network needed (JMD climate table); `v47` offline run |

## Navigation (51–60)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 51 | Landmark search | COMPLETE AND TESTED | M search over 1,729 places and streets; `v46_pw` (search box), `playtest_v45_pw` |
| 52 | Arabic and English search | IMPLEMENTED BUT UNTESTED | Names are normalised in both scripts (`normN(name+nameAr)`). No Arabic-query test yet. |
| 53 | Place-category filters | COMPLETE AND TESTED | **(v49)** 11 chips above the search results (food, shops, health, schools, worship, sights, car, parks and sport, banks, civic and bus, areas). `assist_v49`, `v49_pw` (real clicks). |
| 54 | Saved destinations | COMPLETE AND TESTED | **(v49)** ☆/★ on each result (up to 20, places or streets), listed first in the empty search box. `irbid-drive-fav-v1`. `assist_v49`, `v49_pw`. |
| 55 | Route alternatives | NOT STARTED | One shortest route. |
| 56 | Navigation preferences | NOT STARTED | |
| 57 | Distance and arrival time | COMPLETE AND TESTED | Remaining metres and minutes, turn list; `playtest_v45_pw` |
| 58 | Map source information | PARTIALLY IMPLEMENTED | Every place has an OSM id and source in data and manifests; not shown in the search UI. |
| 59 | Uncertain-data warnings | PARTIALLY IMPLEMENTED | Estimated speed bumps are labelled in the attribution line; no per-place warning. |
| 60 | Community correction reports | BLOCKED | Needs a server or form to receive reports (hosting decision). |

## Multiplayer (61–70)

All **BLOCKED**: there is no game server, hosting or account. Public servers need paid hosting chosen by the owner; private rooms need at
least a signalling server. The brief requires a test with two real network clients, which cannot happen without one.
`docs/MULTIPLAYER_PLAN.md` describes the design and its costs.

| # | Feature | Status |
|---|---|---|
| 61 | Server-region selection | BLOCKED |
| 62 | Connection-quality indicator | BLOCKED |
| 63 | Private-session permissions | BLOCKED |
| 64 | Reconnection | BLOCKED |
| 65 | Server-browser filters | BLOCKED |
| 66 | Privacy-aware player status | BLOCKED |
| 67 | Host migration | BLOCKED |
| 68 | Server-side fair-play validation | BLOCKED |
| 69 | Community moderation | BLOCKED |
| 70 | Private event creation | BLOCKED |

## Gameplay (71–80)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 71 | Free-roam challenges | PARTIALLY IMPLEMENTED | Drift points, landmark tour, bank heist, duels. |
| 72 | Checkpoint races | COMPLETE AND TESTED | Circuits and point-to-point against 3 bots; `h2`, race checks |
| 73 | Parking challenges | COMPLETE AND TESTED **(v48)** | Driving-school lesson 5 (reverse parking); `assist_v48` |
| 74 | Fuel and maintenance | PARTIALLY IMPLEMENTED | Maintenance: damage, tyre wear and paid repairs. No fuel. |
| 75 | Vehicle test drives | NOT STARTED | Cars are won on the wheel, not tried first. |
| 76 | Garage comparison | NOT STARTED | |
| 77 | Player statistics | PARTIALLY IMPLEMENTED | Fines, spending, drift points, rival record, school best scores. No statistics screen. |
| 78 | Replayable driving lessons | COMPLETE AND TESTED **(v48)** | 5 lessons on real streets with scoring, retry and saved best; `assist_v48` (11 lesson checks), `v48_pw` |
| 79 | Custom race settings | NOT STARTED | |
| 80 | Cosmetic rewards | PARTIALLY IMPLEMENTED | Car unlock wheel with rarity tiers. No paint or wheel cosmetics. |

## Assets and reliability (81–90)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 81 | Asset manifest (versions, sizes, licences, checksums) | COMPLETE AND TESTED | `assets/manifests/` (289 entries, sha256); `validate-assets.js` in `check.py` |
| 82 | Asset validation | COMPLETE AND TESTED | `scripts/validate-assets.js` |
| 83 | Model compression | BLOCKED | No external model files exist (all procedural). Needs licensed models first. |
| 84 | Texture optimisation | BLOCKED | Same: textures are generated at load. |
| 85 | Level of detail | COMPLETE AND TESTED | LOD radii per chunk (`lodTick`), presets 0.7× / 1× / 1.3×; `v47_pw` |
| 86 | Instanced rendering | COMPLETE AND TESTED | `instO`/`instF` chunked InstancedMesh; `boot` (3,709 instance groups) |
| 87 | Visibility culling | COMPLETE AND TESTED | Chunk-sphere frustum culling; `dc2` draw-call check |
| 88 | Progressive asset loading | NOT STARTED | The city is built at load (single file). |
| 89 | Safe cache invalidation | BLOCKED | Needs a hosted build with versioned files (no host yet). |
| 90 | Privacy-conscious error reports | PARTIALLY IMPLEMENTED | On-screen error banner (v47); nothing is sent anywhere (needs a server). |

## Accessibility and release (91–100)

| # | Feature | Status | Evidence / notes |
|---|---|---|---|
| 91 | Control remapping | PARTIALLY IMPLEMENTED | G29 / gamepad buttons are rebindable (V). The keyboard is fixed. |
| 92 | Sensitivity and dead zones | COMPLETE AND TESTED | Wheel dead zone, curve, smoothing, centre offset; `wheel_test` (43) |
| 93 | Subtitles and captions | IMPLEMENTED BUT UNTESTED | Every instruction and event is on-screen text (toasts, instructor panel). There is no spoken audio to caption. |
| 94 | Readable UI and text size | COMPLETE AND TESTED **(v48)** | Text size 90 / 100 / 120 / 140 %; `v48_pw` |
| 95 | Reduced motion | COMPLETE AND TESTED **(v48)** | No speed zoom or motion blur; follows the OS setting by default; `v48_pw` |
| 96 | Localisation framework | NOT STARTED | Place and street names are bilingual; the UI is English only. |
| 97 | Automated regression tests | COMPLETE AND TESTED | `tools/check.py --full` (~50 checks) |
| 98 | Repeatable performance benchmarks | COMPLETE AND TESTED | `perf_v47_pw.py`, `cpu_prof_pw.py` |
| 99 | Dev / test / production channels | BLOCKED | Needs hosting. Today: git `main`, the artifact link, and `dist/last-good`. |
| 100 | Update recovery dashboard | BLOCKED | Needs the hosted update system (Part 10). Git tags `backup/v45…v48` are the rollback points. |
