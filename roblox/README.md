# Irbid Drive for Roblox

A Roblox Studio port of the Irbid Drive web game, written in Luau. It is built from the **same real map data** and covers 3.5 km around the web game's start point in Al-Balad:
- 17,818 OpenStreetMap road pieces (with their widths, one-way streets, speed limits and street names)
- 14,527 OpenStreetMap buildings
- NASA SRTM terrain (25 m tiles, solid down to the lowest neighbour, so there are no holes)
- 1,048 real places
- 37 signalised junctions
- 40 speed bumps
- the drift zone, the stunt ramps and 21 landmark-tour stops

**The file to open:** `IrbidDrive.rbxlx` (one file holds every script and all the data).

Roblox runs Luau, not the web game's JavaScript, so every system was rewritten. Where the web game has a rule or a number, the Roblox version uses the same one. The web game's map is 29 × 24 km, which is too big for one Roblox place, so only the 3.5 km around the start is included.

## What is in it (the web game's rules)

| Feature | How it works |
|---|---|
| Driving | The web game's Arcade handling, line for line: steering, acceleration curve, brakes, the handbrake drift, rolling and air drag. Grip depends on the surface (road or drift zone 1, unpaved track 0.75, built-up ground 0.9, open ground 0.65). Gravity pulls along slopes. The car follows the web game's ground height (terrain plus ramps) and flies where the ground drops away |
| Speed bumps | The web game's quarter-car suspension: heave, pitch, a short hop when crossed fast. Two are mapped in OpenStreetMap; the rest are estimated positions, as in the web game |
| Traffic lights | Real signalised junctions. 60 s cycle: 24 s green, 3 s amber, then red; the two directions are half a cycle apart, in 4 timing groups. Every player sees the same lights |
| Traffic | 80 AI cars on the real roads, in the right-hand lane. They cruise at the street limit times a factor that depends on the car's rarity, slow down for bends, stop at red lights, slow to 8 m/s near roundabouts and keep 6.5 m behind the car ahead. At junctions they pick a road by its kind, width and straightness |
| Laws and fines | Speeding (more than 10 km/h over the limit, after 1.5 s): 15 JD. Driving against traffic: 20 JD. Red light: 50 JD. Hitting traffic: 30 JD. Each fine has the web game's cool-down. As in the web game, a fine **adds** JD to your balance, which pays for the wheel. No fines in the drift zone |
| Drifting | The web formula: angle × speed × combo × rarity × the Extra Drift Points upgrade. Points go to the drift bank. Roblox only: each point also pays 0.25 JD (VIP ×2) |
| Apex Drift Customs (U) | Speed / Acceleration / Handling / Extra Drift Points, priced base × 2^level (1,500 / 1,200 / 800 / 3,000), 5 levels each, paid with drift points, saved per car |
| Car wheel (G) | 10,000 JD per spin. Tier odds 50 / 35 / 10 / 4 / 1 %. A duplicate refunds 5,000 |
| 22 cars, 5 rarity tiers | Stats, sizes and suspension come from the web game's cars. Names are generic, with no brands. N / B switch between your cars. Roblox only: the garage (V) sells them |
| Street races (R) | The web game's circuits (Al-Balad Circuit, Thalatheen Run) against 3 rivals on its grid. Countdown, checkpoint beam, live position. Roblox only: pays 1,000 / 500 / 250 / 100 |
| Duels (R next to a traffic car) | Its driver lines up on your left and you both race 720 m up the road to a beam. First there wins (no money, as in the web game) |
| Bank heist (E at the bank) | Survive the police for 2:00. Police route through the real streets and box you in. Escaping pays +500; being caught (2.5 s next to a police car) costs up to 50. The bank then closes for 3:00 |
| Landmark tour (K), stunt ramps (J) | The web game's tour stops and its three ramps |
| Clock (T) | Starts at 15:00 and runs an hour every 40 s. T adds an hour. Headlights at night |
| GPS (M), minimap | Search the real places. Routes respect one-way streets. The minimap shows roads, sites, the route, traffic and police |
| Saving, Robux | JD, drift bank, cars and upgrades per car are saved. The VIP pass and JD packs are off until you add your own IDs |

Controls:
- **W/S** or the thumbstick: gas and brake/reverse
- **A/D**: steer
- **Space** or the **DRIFT** button: handbrake
- **F**: back to the start
- **C**: camera
- **G**: car wheel
- **N / B**: next / previous car
- **M**: GPS
- **K**: landmark tour
- **J**: stunt ramps
- **T**: +1 hour
- **R**: race or duel
- **E**: rob the bank
- **U**: tuning shop
- **X**: horn (needs `Config.HORN_SOUND_ID`)
- **V**: garage

Phones and tablets get on-screen buttons.

Each device simulates its own traffic, race rivals and police, so other players don't see the same AI cars. Players do see each other's cars. On phones, lower `Config.TRAFFIC_CARS` if the game is slow.

**Not ported yet** (each is a large system in the web game):
- Realistic handling: tyre model, manual gearbox, ABS / TC / ESC, tyre temperature and brake fade
- Damage and tyre wear
- Weather
- The driving school
- Auto-drive (Z) and road reputation
- The 217-car list (Roblox has 22 cars with generic names)
- The hand-built 3D landmarks, trees and street lamps
- The synthesised engine audio
- The pause / settings menu
- Steering wheel support (G29)

## Open and test it

1. Install Roblox Studio (free) and sign in.
2. **File → Open from File →** `IrbidDrive.rbxlx`.
3. Press **▶ Play**. The server builds the map first (about 18,000 road pieces, 14,500 buildings and 65,000 terrain tiles), which takes a while. Then you spawn in your car.
4. To test saving in Studio, open **Game Settings → Security → Enable Studio Access to API Services**.

**Status:** this version has not been run in Roblox Studio yet. What has been checked:
- Every script passes the official Luau analyzer (`luau-analyze`).
- The place file is valid XML.
- `tests/run.js` loads this exact place file into a headless stand-in for the Roblox engine and plays through every feature above. The checks are listed in `tests/scenario.luau`.

The stand-in has no physics or rendering, so the camera feel, seat behaviour and speed on phones still need a real Studio test. If something fails in Studio, **View → Output** shows the error.

## Publish it and earn Robux

1. In Studio: **File → Publish to Roblox**.
2. In the **Creator Dashboard** (create.roblox.com), open the experience → **Monetization**:
   - **Passes**: create "VIP" (double drift cash + the Super V10 car) and set a price.
   - **Developer Products**: create "5,000 JD" and "25,000 JD" and set prices.
3. Put each numeric ID into `src/ReplicatedStorage/Config.lua` (`GAMEPASS_VIP`, `PRODUCT_CASH_SMALL`, `PRODUCT_CASH_BIG`) and run `node tools/make_roblox.js dist/irbid-drive.html` again. Or edit `ReplicatedStorage.Config` directly in Studio. Then publish again.
4. Set the experience to Public when you are ready.

Optional: `Config.ENGINE_SOUND_ID` takes the ID of a Roblox audio asset you have the rights to use (0 means no engine sound).

Roblox's own rules decide how Robux become real money (**Developer Exchange / DevEx**). Read the current DevEx terms on Roblox's site first: they include an age minimum, a verified account, a minimum Robux balance and good standing. Roblox keeps a share of every sale. None of this has been set up for you, and nothing has been published.

## Rules to keep

- **Keep the OpenStreetMap credit** at the bottom of the screen ("Map data © OpenStreetMap contributors (ODbL)"). The ODbL licence requires it.
- **Car names stay generic** ("Hot Hatch RS", not the brand). Real car brands are trademarks, and Roblox removes experiences that use them without permission.
- The map is real data. Where a real building footprint reached into a road (the roads use the web game's widths), the exporter cut it back from the road side: 2,744 pieces were trimmed and 77 too thin to keep were dropped.

## Files

| Path | What it is |
|---|---|
| `IrbidDrive.rbxlx` | The place file (all scripts and data). Generated, so don't edit it by hand |
| `src/ReplicatedStorage/Config.lua` | Settings and prices (Robux IDs go here) |
| `src/ReplicatedStorage/Modules/Road.lua` | Road graph: parsing, nearest road, routing, paths, speed caps |
| `src/ServerScriptService/WorldBuilder.server.lua` | Builds the map, one module per part in `World/`: `MapData`, `Sky`, `Terrain`, `Roads`, `Buildings`, `Signs`, `Sites`, `Spawn` |
| `src/ServerScriptService/GameServer.server.lua` | Starts the server modules in `Game/`: `Remotes`, `PlayerData` (saving), `CarBuilder`, `Spawner`, `Sessions`, `Drift`, `Sites`, `Garage`, `Upgrades`, `Wheel`, `Shop`, `RaceRewards`, `HeistRewards`, `Missions`, `Purchases` (Robux), `DayNight` |
| `src/StarterPlayerScripts/Main.client.lua` | The device's frame loop |
| `src/StarterPlayerScripts/Client/*.lua` | One job per file. Car: `Drive`, `Ground`, `Bump`, `DriftScore`, `CarSpec`, `CarFx`, `Camera`, `Controls`. World: `Traffic`. Missions: `Race`, `Heist`, `Police`, `Missions`. Navigation: `Gps`, `Search`, `Minimap`, `StreetName`, `Nav`. Menus: `Garage`, `TuneShop`, `CarWheel`, `CarInfo`, `Menus`. Screen: `Hud`, `InfoLine`. Shared: `State` |
| `data/`, `shared/` | Generated map data (server-only / sent to devices) |
| `default.project.json` | For Rojo users (`rojo serve` / `rojo build`) |
| `tests/` | Headless test: `rbxmock.luau` (engine stand-in), `scenario.luau` (play-through), `run.js` (runner) |

Regenerate: `node tools/make_roblox.js dist/irbid-drive.html [radius_m]` from the repo root (default radius 2,500 m).

Test: `node roblox/tests/run.js path/to/luau.exe` (the Luau CLI from https://github.com/luau-lang/luau/releases). It takes about a minute.
