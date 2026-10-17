# Car assets and specifications (v41, 2026-10-17)

The game has 217 car models (`PORS` in `07a_cars.js`: name, listed top speed, listed 0–100 time, length, width, height, body type, colour).
This file covers (1) what 3D models the cars use and what licensed alternatives exist, and (2) where every handling and durability number
comes from. Short version: **the meshes are the game's own procedural shapes, and every physical number except the dimensions, top speed and
0–100 (pre-existing game data, not re-verified) is a labelled gameplay estimate.** No manufacturer specification was invented.

## 1. 3D models

### Current models (in the game)

Procedural meshes generated in code (`mkPorsche` in `07a_cars.js`): body, glass, lights, wheels and per-car proportions from the
L/W/H data, plus per-car visual themes (`07a4_carvis.js`). They are **approximations**, not exact models of any make. Parts are tagged
(body/glass/lights/tyres/rims) so damage can dent them, break the right light and crack the right glass. Panels cannot detach.

### Licensed alternatives found (`manifest/car_model_candidates.json`, `tools/sketchfab_search.py`)

The public Sketchfab search API (no account needed) was queried for every car (2026-10-17, downloadable models, sorted by likes). A result
counts as a candidate only when its title contains the make and every distinctive word of the model name.

| | Cars |
|---|---|
| Searched | 217 |
| At least one title match | 189 |
| At least one match under a licence usable here (CC0 / CC BY / CC BY-SA) | **176** |
| No match | 28 (e.g. Porsche 550 Spyder, 912, 914, Lamborghini Huracán, Ferrari Dino 246 GT, Kia K5 Hybrid, Kia K3 EV, BYD Qin Plus, MG 4 EV) |

Licences seen among matches: CC BY 560, CC BY-NC-SA 263, CC BY-NC 69, Sketchfab Free Standard 32, CC BY-NC-ND 10, CC BY-SA 8,
CC BY-ND 1. NC licences are non-commercial only; ND forbids the mesh changes that damage needs; Standard does not allow redistribution in an
open game.

**Nothing was downloaded or bundled, for four reasons:**
1. **Account:** Sketchfab downloads need the owner's account (OAuth), per the [Download API guidelines](https://sketchfab.com/developers/download-api/guidelines).
2. **Size:** the usable candidates have a median GLB of **17.5 MB and 256k triangles** (e.g. "2022 Toyota Hilux" 41.6 MB / 983k triangles;
   "FREE 1975 Porsche 911 (930) Turbo" 74.2 MB). The whole game is one 4.2 MB offline HTML file; 176 such models would be about 3 GB. Using them
   needs an asset-loading architecture (separate files, a host, GLTFLoader, LOD meshes for phones), which changes the single-file, no-new-host
   rule (owner decision).
3. **Identity:** titles are the uploaders' own claims. Generations differ (the best Focus RS match is a "Mk II", the Mustang GT match a "Shelby
   GT500"), so each candidate needs a human check before it could be called that car.
4. **Brands:** a CC licence covers the mesh, not the car maker's trademarks or trade dress (owner decision).

Each candidate in the manifest carries title, model URL, author, author URL, licence, suitability, triangle count and download size.

## 2. Handling specifications (Realistic mode, `07g_drive.js`, `manifest/car_powertrain.json`)

| Quantity | Source | Status |
|---|---|---|
| Top speed, 0–100 time | `PORS` (game data since v19–v31) | **not re-verified**; used as calibration targets |
| Length, width, height | `PORS` | game data |
| Mass | body-type density × L × W × H (`carSpec`), + 75 kg driver | **estimate** |
| Drivetrain | 182 cars: layout commonly published for the model name (`DRV_DOC`; variant-dependent names flagged, e.g. 911, Taycan, Zeekr 001); 35: body-type default | doc / **estimate** |
| Engine position, weight split, CG height, wheelbase, track | from engine position and dimensions | **estimate** |
| Redline, gear count, shift time | body type (race 9,000 rpm / 6 gears / 0.12 s … pickup 6,000 rpm); 4–7 gears by top speed; EV single speed | **estimate** |
| Gear ratios | top gear reaches redline at 1.02 × top speed, first gear at 23–36 % of it, geometric spacing | **estimate** |
| Torque curve | one generic petrol shape; EV constant torque, then constant power | **generic**, not per engine |
| Peak torque, drag area | **solved** per car so that it reaches the listed 0–100 and top speed (`ptCalib`) | estimate (calibrated) |
| Speed limiter | where the drag needed to hold the listed top speed would be implausible (> 1.15 × body-type Cd × area): 126 cars | estimate |
| Tyre μ | body type (0.85–1.3), raised only where the listed 0–100 would otherwise be impossible (47 cars, capped at 1.7) | **estimate** |
| Spring frequency / damping | body type (SUV/pickup 1.25–1.3 Hz … race 2.8 Hz; ζ 0.32–0.55) | **estimate** |
| Braking | 0.8 g (SUV/pickup), 1.0 g, 1.1 g (race) × surface × brake damage (v37) | estimate |

**Calibration result** (`node tests/handling_test.js dist/irbid-drive.html manifest/car_powertrain.json`): 210 of 217 cars reach their
listed 0–100 within 5 % (median error 0.7 %); top speed within 5.3 % for every car. Outliers are grip-limited, where the listed time needs more
traction than the estimated tyres give: Porsche Mission X 2.67 s vs 2.2 s, Ferrari 812 / 12Cilindri / Monza SP1 about 3.05 s vs 2.9 s, Fiesta ST
6.93 s vs 6.5 s, Ford Puma 7.3 s vs 6.7 s, Chevrolet Spark 11.8 s vs 12.5 s. Cars with a listed top speed ≤ 105 km/h (Ford Model T 68 km/h) are
calibrated to 80 % of top speed, because a 0–100 time cannot exist for them.

As a sanity check only (not used as data), solved peak torques land near commonly quoted figures for several cars: Fiesta ST 260 Nm,
Focus RS 426 Nm, Toyota Corolla 164 Nm, Tesla Model 3 406 Nm.

In-game 0–100 runs on the start road (which has a grade): Focus RS 4.8 s (listed 4.7), Tesla Model 3 5.9 s (5.8), Toyota Hilux 11.0 s (10.5).

## 3. Durability profiles (`carSpec`, `manifest/cars.json`)

Per car: durability index, crush stiffness per face (front/rear/side, Campbell linear crush coefficients by body type, scaled by durability),
scratch/light/glass thresholds, component durability (engine, cooling, transmission, driveline, steering, suspension), tyre wear and heat
factors. All **estimates**; there is no manufacturer crash-test data in the game. See `DAMAGE_AND_TIRE_WEAR_REPORT.md`.

## 4. Controls kept

Keyboard (W/S/A/D/Space, arrows), touch pads and the Logitech G29 (analog throttle/brake/steer, force feedback, button bindings) work in
both handling modes. `tests/wheel_test.py` passes 30/30 with Arcade and with Realistic handling. Vehicle selection, the unlock wheel, rarity
and upgrade prices are unchanged; upgrades scale torque (Acceleration) and gearing/drag (Speed) in Realistic mode.

## 5. v42 status

Unchanged since v41: no licensed model was downloaded, for the same four reasons (account, size versus the single-file build, identity checks,
trademarks). The candidate list (`manifest/car_model_candidates.json`) and the powertrain table (`manifest/car_powertrain.json`) are the asset manifest.
v42 adds per-part **repair prices** (gameplay estimates, × rarity tier; see `DAMAGE_AND_TIRE_WEAR_REPORT.md` §10). No car specification was added or changed.

## v43 status (2026-10-17)

Unchanged since v42. No licensed car model was added: every candidate (`manifest/car_model_candidates.json`, 176 of 217 cars with a CC BY
Sketchfab candidate) still needs the owner's Sketchfab account, a licence and trademark decision, and a change to the single-file rule
(GLB files are separate assets). All 217 cars use the procedural mesh sized to the car's dimensions; it is **not** the real car's shape.
Dimensions, top speed and 0–100 are the game's own data; mass, torque, drag and durability are labelled estimates.
