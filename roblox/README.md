# Irbid Drive for Roblox

A Roblox Studio port of the Irbid Drive web game, written in Luau. It is built from the **same real map data** and covers 3.5 km around the web game's start point in Al-Balad:
- 17,818 OpenStreetMap road pieces (with their widths, one-way streets, speed limits and street names)
- 14,527 OpenStreetMap buildings
- NASA SRTM terrain: one block per 25 m cell of the web game's height grid, tilted to the slope and kept 0.3 m under the road surface (so the roads are never buried)
- 1,048 real places
- 37 signalised junctions
- 40 speed bumps
- the drift zone, the stunt ramps and 21 landmark-tour stops
- the web game's hand-built landmarks (625 parts) and its street furniture and trees (73,733 props and 835 road-sign plates: street lights, utility poles, signs, guardrails,
  bus stops, dumpsters, roundabout islands, trees, cypresses, bushes), drawn near the player as the web game does
- **all 217 cars** of the web game, each with its own numbers

**The file to open:** `IrbidDrive.rbxlx` (one file holds every script and all the data). Progress, the feature list and the test log: `CONVERSION_PROGRESS.md`.

Roblox runs Luau, not the web game's JavaScript, so every system was rewritten. Where the web game has a rule or a number, the Roblox version uses the same one. The driving physics and the damage system are checked **number for number** against the web build (see "Tests"). The web game's map is 29 × 24 km, which is too big for one Roblox place, so only the 3.5 km around the start is included.

## What is in it (the web game's rules)

| Feature | How it works |
|---|---|
| Driving: Arcade (default) | The web game's Arcade handling, line for line: steering, acceleration curve, brakes, the handbrake drift, rolling and air drag. Grip depends on the surface (road or drift zone 1, unpaved track 0.75, built-up ground 0.9, open ground 0.65). Gravity pulls along slopes. The car follows the web game's ground height (terrain plus ramps) and flies where the ground drops away |
| Driving: Realistic (H) | The web game's Realistic model, line for line: engine torque curve, automatic or manual gearbox (Q / E), traction limit with load transfer, aero drag and rolling resistance, engine braking, a two-axle slip-angle tyre model, a sprung body. ABS, traction control, stability control, optional tyre temperature and brake fade (settings). Wet roads lower the grip. Long frames are split into 1/60 s steps. All numbers are the web game's estimates per car |
| Vehicle damage (I) | Off (default) / Cosmetic / Full, the web game's rules: localised impacts by contact point and crush depth, dents, bumpers that crack, hang and tear off, mirrors, bonnet, boot lid, doors, glass cracks, broken lamps, bent rims, flat tyres. Full adds engine, radiator (overheating), gearbox, driveline, steering, brakes, suspension per corner, alignment (the car pulls), tyre grip. Hard landings and speed bumps taken too fast hurt the suspension. Per-wheel tyre model: load, slip, heat, wear, punctures, burnouts (strong rear-drive cars can, weak or all-wheel-drive cars can't) |
| Roadside objects | The web game's street lights, utility poles, road signs, dumpsters, guardrails, trees, roundabout islands and landmark walls are solid. With damage Cosmetic or Full they react as in the web game: lights, poles and signs bend, then snap and fall along your path (a stump stays); trees shake and shed leaves (only slim trunks fall); dumpsters are shoved, slide, turn and may tip; guardrails deflect; walls get scrape marks; debris flies. With damage Off everything is rigid. Heavier cars break things sooner (energy based). All thresholds are the web game's estimates |
| Car encyclopedia (Settings → 📖, ℹ in the garage) | 30,511 real-world car versions (134 makes) from the open vehicle-makes-models database (ODbL): search by name, filter by brand, fuel, drivetrain, gearbox, era, power, top speed and 0–100, sort, 25 per page; each version's source figures ("Unknown" when the source has none, "suspect source value" when implausible) and labelled game estimates. ℹ next to a garage car shows the linked real-world version (171 of 217 cars; same make and model, nearest top speed and 0–100). Browse only: no 3D models, not drivable, the game cars keep their own numbers. See `catalog/README.md` |
| Graphics (Settings, key Y) | Quality Auto / Low / Medium / High / Ultra (Auto follows Roblox's own graphics slider; values from the owner's starter pack, 2026-10-24): shadows, how much the sky lights and reflects on surfaces (Ultra: paint and wet roads reflect most), colour grading + bloom (High, Ultra), sun rays (Ultra), how far street furniture and trees are drawn (60 / 80 / 100 / 130 % of the web distance) and rain density. Manual rows override the preset: Shadows, Colour grading + bloom, Draw distance (50–150 %). The place uses Future lighting. Each player's choice applies to their own device only |
| Diagnostics (O) | Every component with its condition and effect, body zones, every tyre (tread, carcass, temperature, grip, load, slip, wear by cause, distance) and the last impacts |
| Repair bay | At Apex Drift Customs (U / P there; the 🔧 Repair button routes you there): each damaged part with its price in JD (the web game's prices × the car's rarity), Repair all, and a full inspection of all 42 parts. The server prices and charges every repair |
| Speed bumps | The web game's quarter-car suspension: heave, pitch, a short hop when crossed fast. Two are mapped in OpenStreetMap; the rest are estimated positions, as in the web game |
| Traffic lights | Real signalised junctions. 60 s cycle: 24 s green, 3 s amber, then red; the two directions are half a cycle apart, in 4 timing groups. Every player sees the same lights |
| Traffic | 80 AI cars on the real roads, in the right-hand lane. The car models come in the web game's mix for each street (old Al-Balad mostly common cars, Petra Street and the mall area more expensive ones), with the web game's paints. They cruise at the street limit times a factor that depends on the car's rarity, slow down for bends, stop at red lights, slow to 8 m/s near roundabouts and keep 6.5 m behind the car ahead |
| Laws and fines | Speeding (more than 10 km/h over the limit, after 1.5 s): 15 JD. Driving against traffic: 20 JD. Red light: 50 JD. Hitting traffic: 30 JD. Each fine has the web game's cool-down. As in the web game, a fine **adds** JD to your balance, which pays for the wheel. No fines in the drift zone |
| Drifting | The web formula: angle × speed × combo × rarity × the Extra Drift Points upgrade. Points go to the drift bank. Roblox only: each point also pays 0.25 JD (VIP ×2) |
| Apex Drift Customs (U) | Speed / Acceleration / Handling / Extra Drift Points, priced base × 2^level (1,500 / 1,200 / 800 / 3,000), 5 levels each, paid with drift points, saved per car |
| Car wheel (G) | 10,000 JD per spin. Tier odds 50 / 35 / 10 / 4 / 1 %, then one car of the web wheel's list for that slice. A duplicate refunds 5,000 |
| Car shapes | The web game's shape for each car: its body type's side profile (blocks and wedges), glass house, roof, wing on race cars, lamps, wheels with rims, and the car's own neon light lines in its two colours (traffic from Uncommon up, rivals and your car). Police drive the white Crown-Victoria-type car with a light bar |
| 217 cars, 5 rarity tiers | Every web car with its own top speed, acceleration, brakes, handling, size, body type, paint, engine layout and Realistic / damage data. Names are generic (no brands; `CAR_NAMES.md` lists the web car behind each). N / B switch between your cars. Roblox only: the garage (V) sells them |
| Street races (R) | The web game's circuits (Al-Balad Circuit, Thalatheen Run) against its three named racers (Samer, Layth, Omar) in cars of the sports catalogue. Countdown, checkpoint beam, live position. Roblox only: pays 1,000 / 500 / 250 / 100 |
| Duels (R next to a traffic car) | A driver from the sports catalogue lines up on your left and you both race 720 m up the road to a beam. First there wins (no money, as in the web game) |
| Bank heist (E at the bank) | Survive the police for 2:00. Police route through the real streets and box you in. Escaping pays +500; being caught (2.5 s next to a police car) costs up to 50. The bank then closes for 3:00 |
| Landmark tour (K), stunt ramps (J) | The web game's tour stops and its three ramps |
| Weather | Simulated, not live, as in the web game: Auto follows the Jordan Meteorological Department's rain days per month for Irbid (one roll per server), or pick Clear / Cloudy / Rain. Clouds, a greyer sky, a shorter view, rain streaks, darker shinier roads; the road dries in about 4 minutes. Only Realistic handling feels the wet road |
| Clock (T) | Starts at 15:00 and runs an hour every 40 s (shared by the server). T adds an hour. Or Irbid's real local time (UTC+3) on your device. Headlights at night |
| Cameras (C) | The web game's chase, cockpit, bonnet and bumper views, placed for each car; field of view widens with speed. Roblox only: a free orbit camera |
| Sound | The web game's synthesised sounds (27 engine layouts, turbo, supercharger, EV motor, tyre squeal, gravel, wind, road, rain, horn, crashes), rendered into one sound file that you upload once (see below). Pitch and volume follow the web game's rules every frame. Volumes and mute (L) in the settings |
| Settings (Y or ⚙) | The web game's pause-menu options: handling, gearbox, ABS, TC, ESC, tyre temperature, brake fade, damage, weather, clock, camera, volumes, mute, and the gamepad / racing-wheel setup. Saved with your progress on the server |
| Gamepad / racing wheel | Triggers or a stick for the pedals, a stick for steering, with the web game's processing (invert, centre offset, sensitivity, dead zone, response curve, smoothing), pedal dead zone, rebindable buttons, rumble on impacts. See "Logitech G29" |
| GPS (M), minimap | Search the real places, filter by 11 categories (food, shops, health, schools, worship, sights, car, parks and sport, banks, civic and bus, areas), save up to 20 places (☆). Routes respect one-way streets. The minimap shows roads, sites, the route, traffic and police |
| Auto-drive (Z) | Follows the GPS route with the same car physics: keeps right, keeps to each street's limit, stops at red lights and for cars ahead, slows for curves, stops at the destination. Any input takes control back; it gives up when blocked for 6 s. A simple rule-based driver |
| Road reputation | 0–100, starts at 70: hitting traffic −6, red light −4, wrong way −2, speeding −1; +1 per 45 s of clean driving. Low reputation: traffic keeps a longer gap behind you and honks sooner. The three racers remember wins, losses and hits and get a little faster or slower |
| Driving school | Five lessons on real streets near the start (start and stop, emergency stop, speed limit, traffic light, reverse parking), scored 0–100 with the real fine rules; best scores saved. In the settings menu |
| Traffic density | High / Medium / Low, or by time of day (a weekday curve, an estimate; never parks a car near you) |
| Text size | 90 / 100 / 120 / 140 % |
| Saving, Robux | JD, drift bank, cars, upgrades per car, settings and the damage of every car are saved. The VIP pass and JD packs are off until you add your own IDs |

Controls:
- **W/S** or the thumbstick: gas and brake/reverse; **A/D**: steer; **Space**: handbrake
- Gamepad: **RT / LT** gas / brake, left stick steer, **A** handbrake, **RB / LB** shift up / down, **Y** camera, **X** horn, **B** race, **R3** start, **L3** tour, d-pad: up GPS, down settings, right / left next / previous car (all rebindable)
- Phones and tablets: the web game's touch pads (◀ ▶ steer, GAS, BRAKE, DRIFT) plus the menu buttons
- **F**: back to the start · **C**: camera · **G**: car wheel · **N / B**: next / previous car · **M**: GPS · **K**: landmark tour · **J**: stunt ramps · **T**: +1 hour · **R**: race or duel
- **E**: rob the bank (next to it); elsewhere shift up · **Q**: shift down · **H**: Arcade / Realistic · **I**: damage mode · **O**: diagnostics · **Z**: auto-drive
- **U** or **P**: tuning shop and repair bay · **X**: horn · **L**: mute · **V**: garage · **Y**: settings (Roblox keeps Esc for its own menu)

Each device simulates its own traffic, race rivals and police, so other players don't see the same AI cars. Players do see each other's cars (damage is shown on your own device only). On phones, lower `Config.TRAFFIC_CARS` if the game is slow.

## Sound: upload one file

Roblox scripts cannot create sound (there are no oscillators), and audio uploads are limited per month, so all of the web game's sounds are rendered into **one** file:

1. `node tools/make_roblox_audio.js dist/irbid-drive.html` (already done: `roblox/audio/IrbidDriveSounds.wav`, 146 s, 6.5 MB, 74 sounds).
2. Upload `roblox/audio/IrbidDriveSounds.wav`: Creator Dashboard → Development Items → Audio → Upload, or in Studio: View → Asset Manager → Bulk Import. Roblox reviews it (a few minutes).
3. Copy its numeric asset ID into `src/ReplicatedStorage/Config.lua` → `Config.AUDIO_ATLAS_ID`, then `node tools/make_roblox.js dist/irbid-drive.html` again (or edit `ReplicatedStorage.Config` in Studio).

With the ID at 0 the game is silent and everything else works.

## Logitech G29

Roblox reads **gamepads only** (sticks, triggers, buttons). It cannot open HID devices, so it cannot see a G29 directly and cannot drive its force-feedback motor. To use a G29:

- **Steam Input** (start Roblox through Steam as a non-Steam game) or **x360ce** can present the wheel as an Xbox controller: map the steering to the left stick X and the pedals to the triggers (or to one stick's Y axis: "Gamepad pedals" in the setup).
- In the game: ⚙ Settings → 🎮 Gamepad / racing wheel setup. A full turn of the wheel arrives as ±1, so raise "Steering sensitivity" to get the web game's 540° lock out of the G29's 900° (sensitivity 900/540 ≈ 1.7, so 17), lower the dead zone to 1–2 %, and use the live readings to check steering both ways and both pedals.
- Force feedback: not available in Roblox. The pad rumble on impacts is used instead (if the mapping layer passes it on).
- **Not verified on a real G29**: no wheel was connected while this was built. The processing is tested with simulated gamepad input.

## Open and test it

1. Install Roblox Studio (free) and sign in.
2. **File → Open from File →** `IrbidDrive.rbxlx`.
3. Press **▶ Play**. The server builds the map first (about 18,000 road pieces, 14,500 buildings and about 65,000 ground parts), which takes a while. Then you spawn in your car and the clock starts at 15:00.
4. To test saving in Studio, open **Game Settings → Security → Enable Studio Access to API Services**.

**Status:** not yet played by Claude in Roblox Studio (the owner's first Studio run found the visual bugs fixed in version 3.1). What has been checked:
- Every script passes the official Luau analyzer (`luau-analyze`).
- `tests/physics_equiv.js`: the Roblox physics against the web build on 40 driving cases, every frame (Arcade and Realistic, 14 cars, assists, temperatures, wet road, manual gearbox, 60 / 30 / 20 fps): equal to 4e-13.
- `tests/damage_equiv.js`: the Roblox damage against the web build on 92 checks (impacts, landings, speed bumps, overheating, effects, repair prices, inspection, and driving with Full damage in both handling modes): equal to 1e-13.
- `tests/objects_equiv.js`: the exported roadside colliders against the web build's (24,883, to 1 cm), the collision test on 1,500 cars, and the object rules on 790 hits (bending, breaking, falling trees, deflecting rails, sliding dumpsters): equal to 1e-14.
- `tests/catalog_test.js`: the car encyclopedia's data against the source database (all 30,511 versions, 640,731 values: equal, no missing value shown as 0), plus search, filters, sorting, paging limits, a sedan / sports car / pickup / EV / pre-1930 car / car with missing figures, a suspect value, and the 217 garage links.
- `tests/audio_atlas.js`: the sound file (seamless loops, 27 different engine voices, tones at their frequency).
- `tests/run.js` loads this exact place file into a headless stand-in for the Roblox engine and plays through every feature above (also as a touch device and without Terrain). The checks are listed in `tests/scenario.luau`.

The stand-in has no rendering, physics engine or real input devices, so the look of the damage and the weather, the camera feel, the sound, the gamepad and speed on phones still need a real Studio test. If something fails in Studio, **View → Output** shows the error.

**Not ported yet** (see `CONVERSION_PROGRESS.md`): the web game's textures (facade and car detail drawn on canvases), the generated buildings that fill streets where OpenStreetMap has none, and the rooftop details.

## Publish it and earn Robux

1. In Studio: **File → Publish to Roblox**.
2. In the **Creator Dashboard** (create.roblox.com), open the experience → **Monetization**:
   - **Passes**: create "VIP" (double drift cash + the Super V10 car) and set a price.
   - **Developer Products**: create "5,000 JD" and "25,000 JD" and set prices.
3. Put each numeric ID into `src/ReplicatedStorage/Config.lua` (`GAMEPASS_VIP`, `PRODUCT_CASH_SMALL`, `PRODUCT_CASH_BIG`) and run `node tools/make_roblox.js dist/irbid-drive.html` again. Or edit `ReplicatedStorage.Config` directly in Studio. Then publish again.
4. Set the experience to Public when you are ready.

Roblox's own rules decide how Robux become real money (**Developer Exchange / DevEx**). Read the current DevEx terms on Roblox's site first: they include an age minimum, a verified account, a minimum Robux balance and good standing. Roblox keeps a share of every sale. None of this has been set up for you, and nothing has been published.

## Rules to keep

- **Keep the OpenStreetMap credit** at the bottom of the screen ("Map data © OpenStreetMap contributors (ODbL)"). The ODbL licence requires it.
- **Car names stay generic** ("Hot Hatch RS", "German Coupe 300"), not the brand. Real car brands are trademarks, and Roblox removes experiences that use them without permission. `CAR_NAMES.md` (documentation only) maps each generic name to the web car. **Exception (owner's decision, 2026-10-23):** the browse-only car encyclopedia shows real makes and models, and ℹ in the garage names the real car a game car is linked to. That carries the same moderation risk; to remove it, delete `catalog/*.lua` and regenerate (the game then says the catalogue is not installed).
- **Keep the vehicle data credit** (Settings → © Credits & licences, and the line under every encyclopedia page). The vehicle database is ODbL: the changed copy in `catalog/` stays published with the source (`catalog/LICENSE-DATA.md`).
- The map is real data. Where a real building footprint reached into a road (the roads use the web game's widths), the exporter cut it back from the road side: 3,200 pieces were trimmed and 82 too thin to keep were dropped.
- Weather is simulated, not live; car masses, damage, prices and Realistic-handling numbers are the web game's gameplay estimates.

## Files

| Path | What it is |
|---|---|
| `IrbidDrive.rbxlx` | The place file (all scripts and data). Generated, so don't edit it by hand |
| `src/ReplicatedStorage/Config.lua` | Settings and prices (the sound and Robux IDs go here) |
| `src/ReplicatedStorage/Modules/` | Shared and pure (no Roblox services, so the plain Luau CLI can test them): `CarPhysics` (Arcade + Realistic), `Damage` (damage, tyres, repairs), `Objects` (roadside objects), `Catalog` (the car encyclopedia's search), `Road` (graph, routing), `SettingsSchema` |
| `src/ServerScriptService/WorldBuilder.server.lua` | Builds the map, one module per part in `World/` |
| `src/ServerScriptService/GameServer.server.lua` | Starts the server modules in `Game/` (saving, cars, payouts, settings, weather, damage store and repairs, ...) |
| `src/StarterPlayerScripts/Main.client.lua` + `Client/*.lua` | The device's frame loop; one job per file (driving, handling, gamepad, camera, sound, damage and its looks, diagnostics, weather, traffic, missions, navigation, menus) |
| `data/`, `shared/` | Generated map and car data (server-only / sent to devices) |
| `audio/` | The sound file to upload and its index (`tools/make_roblox_audio.js`) |
| `CAR_NAMES.md` | Generic name → web car (documentation only) |
| `catalog/` | The vehicle catalogue (generated by `tools/vehicle_catalog/make_roblox_catalog.py`; `README.md` = source, counts, rebuild; `LICENSE-DATA.md` = ODbL notice; `CAR_LINKS.md` = garage car → catalogue version) |
| `CONVERSION_PROGRESS.md` | The conversion checklist, feature inventory and test log |
| `default.project.json` | For Rojo users (`rojo serve` / `rojo build`) |
| `docs/` | The hand-over documents: `README_FIRST`, `BUILD_AND_IMPORT`, `FEATURE_MERGE_REPORT`, `BUG_FIX_REPORT`, `MAP_DATA_AND_SOURCES`, `ASSET_MANIFEST`, `TEST_REPORT`. `node tools/package_roblox.js` copies the project and these into `Downloads\IrbidDrive_Roblox_Project` (+ zip) |
| `tests/` | `run.js` + `rbxmock.luau` + `scenario.luau` (headless play-through), `physics_equiv.js`, `damage_equiv.js`, `objects_equiv.js`, `catalog_test.js`, `audio_atlas.js` |

Regenerate: `node tools/make_roblox.js dist/irbid-drive.html [radius_m]` from the repo root (after any change in `src/`), and `node tools/make_roblox_audio.js dist/irbid-drive.html` for the sound file.

Tests (from the repo root; the Luau CLI from https://github.com/luau-lang/luau/releases):
```
node roblox/tests/physics_equiv.js <luau.exe>      # physics vs the web build (40 cases)
node roblox/tests/damage_equiv.js <luau.exe>       # damage vs the web build (92 checks)
node roblox/tests/objects_equiv.js <luau.exe>      # roadside colliders + object rules vs the web build
node roblox/tests/catalog_test.js <luau.exe> [db.json]   # the car encyclopedia (and its data vs the source database)
node roblox/tests/audio_atlas.js                   # the sound file
node roblox/tests/run.js <luau.exe>                # the play-through (~8 min); TOUCH=1, NOTERRAIN=1 variants
```
