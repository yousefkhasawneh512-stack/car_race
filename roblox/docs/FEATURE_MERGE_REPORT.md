# Feature merge report (Roblox 4.4, 2026-10-24)

## 1. What was supplied and what was found

The brief asked to merge Irbid Drive with "a second driving game". Every candidate on this PC was opened and checked:

| Candidate | What it really is | Technology | Used? |
|---|---|---|---|
| `car_race/` (this repository, web v49 + Roblox 4.3) | **Irbid Drive, newest and most complete**: the web game `src/parts/*.js` → `dist/irbid-drive.html` and its Roblox port `roblox/` | HTML / JavaScript / three.js r128; Roblox Luau | the source of truth |
| `Downloads\IrbidDrive_Roblox_Starter_Pack (1).zip` (and the identical `(2)`, `(3)`, plain copies, 4,945 bytes each) | 4 small starter Luau modules + 2 notes: `VehicleTuning`, `VehicleDamage`, `MapVisualConfig`, `ApplyMapVisualPreset`. No map, no car, no controller (its own README says so) | Luau | `MapVisualConfig` merged (graphics presets); the rest mapped below |
| `Downloads\IrbidDrive-Roblox.rbxlx` (Studio-saved, 2026-10-23 00:50) | an older export of this same port: all 81 scripts are identical to commit `bd98d91` (Roblox 3.1), so it holds no Studio edits | Roblox place | nothing newer to take |
| `Downloads\IrbidDrive-Roblox-v4.3\`, `IrbidDrive-v4.3.rbxlx`, `IrbidDrive-Roblox-v4.3.zip` | the 4.3 release package of this repository | Roblox place | superseded by 4.4 |
| `Downloads\car_race\`, `irbid-drive-v44/v45/v46*` folders and zips | older snapshots of this same repository (web v44–v46, no newer files) | HTML / JS | nothing newer to take (`CONVERSION_PROGRESS.md` records the same check for v46) |
| `Downloads\irbid_drive_roblox_ready_package (1)\` | prompts, data guides and `build_car_database.py` | text / Python | already used in 4.3 (the car encyclopedia) |
| `Downloads\Roblox Game Ideas\` (20 places, 4–9 KB each) | 20 separate mini-game prototypes (horror, simulators, arenas, "Speed Legends: Slipstream" = a running game where Steps raise WalkSpeed) | Roblox places | not driving games. Nothing here fits a car game, so none of it was merged |
| `Downloads\the-kingdom.html` | a separate web game ("The Kingdom") | HTML | not a driving game |

**No separate second driving game exists on this PC.** If there is one elsewhere (another folder, drive or account), it can be merged the same
way. Until then, "both games" means Irbid Drive plus the starter pack.

## 2. Starter pack → Irbid Drive

| Starter module | Decision | Why |
|---|---|---|
| `MapVisualConfig.lua` (Low / Medium / High / Ultra: shadows, brightness, environment light, fog, effects) | **merged** as `Modules/GraphicsPresets.lua` + `Client/Graphics.lua` + 4 settings rows | the port had no graphics presets. Shadows, environment diffuse / specular and effects are used with the starter's values. Brightness is not set (Client/Weather owns it every frame for clouds, rain and night), and FogEnd is not set (the port's Atmosphere replaces Roblox's fog). Added: draw distance (prop LOD radius), rain density, colour grading + bloom, sun rays on Ultra |
| `ApplyMapVisualPreset.server.lua` | **replaced** by the device-side `Client/Graphics` | a server script sets Lighting for every player at once. Each player needs their own preset for their own device, and Lighting set by a device's script applies to that device only |
| `VehicleTuning.lua` (5 classes: mass, engine force, brake force, grip, suspension) | **not merged** (would be a second, competing tuning source) | the port already has per-car numbers for all 217 cars, exported from the web game (`Config.CARS`, `CarPhysics`), and proven equal to the web physics (`physics_equiv`, 40 cases). The starter's class numbers are generic guesses |
| `VehicleDamage.lua` (body / engine / suspension / brakes / 4 tyres, one impact formula, repair) | **not merged** (its own notes say: do not create a competing system) | `Modules/Damage` already covers all of it and more: 6 zones, dents, glass, lamps, rims, punctures, per-wheel tread / temperature, 6 mechanical systems, per-part paid repairs. It is proven equal to the web game (`damage_equiv`, 92 checks). Every starter field maps onto it: body → zones, engine → engine, suspension → susp[1..4], brakes → brakes, tires FL..RR → wheels[1..4] |

## 3. Feature map (source → Roblox → status → test)

Status: **CV** converted + verified by an automated test · **CU** converted, look / feel not verified (needs Studio) · **BL** blocked by a platform
limit · **NC** not converted. The complete inventory (60 rows) is in `CONVERSION_PROGRESS.md`. The brief's priorities:

| Brief item | Source | Roblox | Status | Test |
|---|---|---|---|---|
| Irbid map, real roads | OSM → web `03a`, `04_graph` | `World/Roads`, `Modules/Road` (3.5 km radius) | CV | scenario: road pieces, graph, routing |
| Buildings | OSM `03b`, `03e` | `World/Buildings` | CV | scenario |
| Terrain / elevation | SRTM `03d`, `12c` | `World/Terrain` | CV | scenario: ground under the height field, roads not buried |
| Landmarks | web `06b`… | `World/Landmarks` (625 parts) | CU | scenario: built; look not seen |
| Places, search, GPS, minimap | `03c`, `11b`, `12` | `Search`, `Gps`, `Minimap`, `StreetName` | CV | scenario |
| Vehicles, selection, spawning | `07a`, `07a0`, garage | `Config.CARS` (217), `Game/Spawner`, `CarBuilder`, `Client/Garage` | CV | scenario |
| Car shapes | `07a mkPorsche` | `Modules/CarBody` | CU | scenario: profile; look not seen |
| Lighting, sky, weather, day / night | `02b`, `12f` | `World/Sky`, `Client/Weather`, `Game/DayNight`, `Game/Weather` | CV logic / CU look | scenario: rain, wet road, drying, clock |
| **Graphics presets (new 4.4)** | starter `MapVisualConfig` | `Modules/GraphicsPresets`, `Client/Graphics` | CV logic / CU look | `graphics_presets.luau` 20 checks; scenario 5 checks |
| Steering, accel, gears, brakes, handbrake, drift | web `updP`, `07g` | `Modules/CarPhysics`, `Client/Drive`, `Handling` | CV | `physics_equiv` 40 cases (Arcade + Realistic, gearbox, ABS / TC / ESC, wet, tyre temp, brake fade) |
| Suspension / bumps | `07c` quarter-car | `SpeedBumps`, `Bump` | CV | scenario + `damage_equiv` |
| Collisions | `colB`, `07e` | `Modules/Objects`, `Client/RoadsideObjects`, building rays | CV | `objects_equiv` (24,883 colliders, 790 hits) |
| Visible damage | `07c`, `07h` | `Modules/Damage`, `CarDamage`, `CarDamageFx` (dent patches, cracks, loose parts) | CV rules / CU look | `damage_equiv` 92; scenario |
| Tyre wear + punctures | `07d` | `Modules/Damage` | CV | `damage_equiv` driving cases |
| Engine problems | `07c` mechanical | `Modules/Damage` + diagnostics (O) | CV | `damage_equiv` |
| Repair garage | `08d` | `Game/DamageStore` (server prices + charges), `TuneShop` | CV | scenario: 12 items paid exactly, only at the garage |
| G29 | `10c` (Gamepad API + WebHID) | `Client/Gamepad` (gamepad through Steam Input / x360ce) | CU / **BL** for force feedback | scenario: simulated pad, both steering directions turn the car |
| Keyboard, touch, gamepad | `10`, `10b` | `Controls`, `Gamepad` | CV | scenario + `TOUCH=1` |
| Traffic lights | `05b` | `Signals` | CV | scenario |
| Speed bumps | `07c` | `SpeedBumps` | CV | scenario |
| Head / brake lights | `07a4` | `CarBody` light lines, SpotLights at night | CU | scenario |
| Driving practice | `11d` school | `School` (5 lessons) | CV | scenario: lessons 1 and 2 passed |
| Settings, remapping | `12e`, wheel setup | `SettingsMenu`, `SettingsSchema` (server-checked) | CV | scenario |
| Saving | `07b` localStorage | `Game/PlayerData` (DataStore, retries) | CV | stand-in DataStore |
| Multiplayer | (single player) | Roblox servers, server-checked payouts / repairs / settings | CU | not tested with two real clients |
| Traffic AI | `09_ai` | `Traffic` (per device) | CV | scenario |
| Races, duels, heist, police, tour | `11`, `08b` | `Race`, `Duel`, `Heist`, `Police`, `Extras` | CV | scenario |
| Sound | `12d` (Web Audio synthesis) | sound atlas + `CarAudio` | CU / **BL** until uploaded | `audio_atlas` |

## 4. Omitted, and the closest alternative

| Brief item | Why not | What there is instead |
|---|---|---|
| BeamNG-style soft-body deformation | Roblox cannot deform meshes at run time | localized visual damage from parts: dent patches per zone, glass cracks, hanging / lost bumpers, mirrors, doors, bent rims, smoke |
| Force feedback | Roblox exposes no FFB / HID API | rumble on impacts (if the mapping layer passes it on) |
| Ray-traced reflections | not in Roblox | Future lighting, EnvironmentSpecularScale (High 0.45, Ultra 0.6), wet-road Reflectance |
| Forza Horizon assets / look | proprietary, not used | an original warm-afternoon grade, bloom, sun rays, haze |
| Generated fill buildings, rooftop details, facade textures | next round (`CONVERSION_PROGRESS.md`) | real OSM buildings only |
| Instance streaming (StreamingEnabled) | each device's physics ray-tests the whole map; turning streaming on would let rays miss unloaded walls | the props / trees stream by distance on each device (draw distance setting); roads and buildings are static parts |
| Server-authoritative car physics | the car is a kinematic body driven by the device (the web physics runs at 240 Hz sub-steps on the device) | the server checks everything that pays or costs: drift banking, race / heist rewards, fines, repairs, purchases, settings; damage records can only get worse from a device |
