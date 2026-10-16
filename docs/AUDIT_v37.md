# Irbid Drive — realism & accuracy audit (v36 -> v37), checked 2026-10-13

Everything below was measured on the actual project (headless Node harness running the built HTML, plus Chromium/SwiftShader screenshots). Not tested: real phones, real GPUs, a physical racing wheel.

## A. Stack (verified)
Plain JS, one global scope, Three.js r128 (CDN), single HTML built by `build.py` from `src/parts/*`. No Unity. No `assets/map.osm` / `mapLoader.js`: the map is OSM data packed by `osm/gen_world.py`+`osm/net.py` into `03a_net_data.js` (roads), `03b_bld_data.js` (buildings), `03c_poi_data.js` (places). Roads are real triangle ribbons (not LineMaterial lines), drawn in world space, driven by an edge graph (`04_graph.js`).

## B. Top verified inaccuracies (evidence -> status)
| # | Finding | Evidence | Status in v37 |
|---|---|---|---|
| 1 | Terrain was completely flat | `hillH=()=>0`, `groundH`=0.12 everywhere; SRTM shows 242-1119 m across the map, Al-Balad->west escarpment drop ~300 m | **Fixed** (SRTM terrain, 1 km grid) |
| 2 | Braking 16 m/s2 = 1.63 g (real road cars ~0.8-1.1 g) | `updP` constant; 100->0 km/h in 1.7 s | **Fixed** (0.8/1.0/1.1 g by body kind; 100->0 = 36.5 m) |
| 3 | Reverse acceleration 8 m/s2 plus 2x throttle term in reverse | `updP` | **Fixed** (3.5 m/s2, throttle term capped by braking limit) |
| 4 | No gravity on slopes | no slope term in `updP` | **Fixed** (needed once terrain exists) |
| 5 | No traction difference between surfaces | none in `updP`; 203 `surface=unpaved` ways, 238 km tracks | **Partly fixed**: heuristic factor (track .75, urban ground .9, open ground .65); real `surface` tag is not in the packed data |
| 6 | No body pitch/roll from acceleration or cornering | only terrain pitch | **Fixed (visual only)** |
| 7 | Road widths are class defaults | OSM `width` on 0 of 17,244 ways | Not fixable without surveyed data; **unverified** |
| 8 | Lane counts mostly defaulted | `lanes` on 12 of 17,244 ways | **unverified** |
| 9 | Speed limits mostly class defaults | `maxspeed` on 18 of 17,244 ways; 40-60 urban / 80 rural / 120 highway only backed by a low-authority blog | **unverified** |
| 10 | 167 of 177 traffic signals are inferred, not mapped | 10 are OSM `highway=traffic_signals` | Open (kept, documented) |
| 11 | 96.5 % of ways have no name | OSM tag coverage | OSM limitation |
| 12 | Bridges/tunnels drawn at one level | `br/tn` flags only keep topology | Open |
| 13 | Dar As-Saraya placed 76 m from its OSM seed; Nabulsi House 36 m, Clock square 35 m, Nissan 47 m | `tests/lmchk.js` | Open (snapped to a road site) |
| 14 | OSM building coverage is partial | 19,640 footprints; only 738 have levels, 187 height; heights/colours/styles generated | Documented limit |
| 15 | Footprints are rectangles, flat roofs | `conv.py` | Documented limit |
| 16 | No gears/RPM/torque curve/mass/suspension | `updP` is a single-speed arcade model | Open (no per-car source data; not invented) |
| 17 | Lateral grip is not surface dependent | `ls*=exp(-k dt)` | Open (would let players farm drift points off-road) |
| 18 | Terrain-related: world objects authored at y=0 would float/sink | generators hard-code y | **Handled** by a single terrain pass (see C) |
| 19 | Elevation of roads/bridges relative to ground | none | **Fixed** for ground-level roads; bridge/tunnel decks still follow the ground |
| 20 | 0-100 km/h calibration | median sim/spec ratio 1.10; Focus RS 5.0 s | Reasonable; other models only spot-checked |

Verified OK: roads are real surfaces, projection equals pyproj within 1 cm at 5 points, 99.4 % of the network is one connected component, 400/400 random routes within 6 km succeed, attribution overlay present.

## C. What changed (before -> after)
* **Terrain.** Before: flat. After: `TH(x,z)` from SRTM v3 (1 arc-second, NASA/USGS, via OpenTopoData `srtm30m`, retrieved 2026-10-13), 1 km grid, bicubic. Ground, road ribbons (cut to <=30 m), sidewalks, wires, instanced props and buildings (with foundation skirts) are lifted by one pass (`12c_terrain.js`, ~0.5 s at load). Player, traffic, bots, cops, nav markers use `TH` live. Result: Yarmouk ~581 m, stadium ~589 m, JUST ~565 m absolute; 55 % of road length < 2 % grade, max 31.9 %.
* **Physics.** See B-2..B-6. Frame-rate independence: 100->0 km/h = 36.3 / 36.5 / 36.9 m at 30 / 60 / 120 Hz; Focus RS 0-100 = 5.00 / 5.00 / 4.99 s. Uphill 17 % 0-100 = 6.9 s vs 5.0 s flat; downhill 3.8 s. Car on a 17 % grade rolls with no input and is held by the handbrake.
* **Attribution:** OSM overlay kept, "terrain: NASA SRTM" added.

## D. Sources
* SRTM via OpenTopoData: https://api.opentopodata.org/v1/srtm30m , https://www.opentopodata.org/datasets/srtm/
* USGS SRTM fact sheet (vertical accuracy spec <16 m 90 %, surface model): https://pubs.usgs.gov/fs/2005/3068/report.pdf
* Braking/acceleration reference ranges: https://copradar.com/chapts/references/acceleration.html (typical road-car deceleration); speed limits blog https://driverabroad.com/?p=528 (low authority, unverified)
* OSM: https://www.openstreetmap.org/copyright , https://wiki.openstreetmap.org/wiki/Key:highway , https://wiki.openstreetmap.org/wiki/Limitations
* No Jordanian official source for speed limits, widths or elevations was found/accessible from this environment.

## E. Tests actually run (all on the v37 build)
`val_net` (network), `boot`, `h2` (races, duel, heist, 20 s drive), `h13`, `h20` (economy/prices unchanged), `h24` ("bad 6", identical to v36), `h25`, `h14` ("bad 2", as before), `tour` (27 stops, 0 off-road), `place_audit`, `lmchk`, `terr_check` (0 off-terrain groups), `dyn_check` (80 traffic cars on terrain, max 0.12 m error), `slope_stats`, `phys_brake` (new), `phys_audit`, real-browser start + drive (`drive_pw.py`, no page errors), draw calls v36 vs v37 at 4 viewpoints: 2512/2299/2346/2318 -> 2563/2449/2437/2202 calls, triangles ~1.31 M -> ~1.32 M.
Also run on v37 in Chromium (emulated touch, mock wheel): `wheel_test` 30/30, `ios` (touch pads drive, no errors), `shopt` (TUNE CAR button opens/closes, no errors), `disp` (1920x1080 buffer locked). Not run: a real iPhone/Android/GPU or a physical G29.

## F. Remaining limits / next steps (priority order)
1. Carry OSM `surface`, `lanes`, `maxspeed`, `width` tags into the network data so surface traction and widths use evidence where it exists.
2. Denser terrain sampling (e.g. 250 m) with a licensed DEM tile download done outside the sandbox; resolves wadis and cuts.
3. Bridge/tunnel decks at real heights (needs `layer`/`bridge:structure` and ramp profiles).
4. Landmark snap errors (Dar As-Saraya 76 m): place the landmark at the OSM seed and move the road-site only for the label/nav anchor.
5. Per-car physics only from manufacturer data (mass, power, gearing); then a simple gear/RPM model.
6. Verify the landmark list against imagery (Mapillary / on-site) before changing any facade.
7. Test on real iPhone/Android hardware.
