# Irbid Drive for Roblox

A Roblox Studio project of Irbid Drive, written in Luau and built from the **same real map data** as the web game, covering 2.5 km around the web game's start point in Al-Balad:
- OpenStreetMap roads (with their widths, one-way streets, speed limits and street names)
- 10,577 OpenStreetMap buildings
- NASA SRTM terrain heights
- 650 real places

**The file to open:** `IrbidDrive.rbxlx` (one file holds every script and all the data).

It is not a 1:1 copy, because Roblox runs Luau, not the web game's JavaScript. Every system below was rewritten for Roblox, using the web game's own numbers wherever it has them.

## What is in it

| Feature | How it works in Roblox |
|---|---|
| Driving | The web game's Arcade handling (speed, acceleration, braking and steering formulas). Ground and wall ray tests against the map. Bumps with AI cars and other players |
| Drifting | The web formula: angle × speed × combo, × the car's rarity, × the Extra Drift Points upgrade. Points go to a drift bank, and each point also pays 0.25 cash (VIP ×2) |
| 22 cars, 5 rarity tiers | Stats come from the web game's cars. Names are generic, with no brands. Bought in the garage or won on the wheel |
| Apex Drift Customs | Speed / Acceleration / Handling / Extra Drift Points, priced base × 2^level (1,500 / 1,200 / 800 / 3,000), 5 levels each, paid with drift points. Only at the orange pad (U), and saved per car |
| Car wheel | 10,000 cash per spin. Tier odds 50 / 35 / 10 / 4 / 1 %, and a duplicate refunds 5,000 (K) |
| Traffic | 22 AI cars per player on the real road graph: right-hand lane, speed limits, slowing for bends and for the car ahead, random turns at junctions |
| Street races | The web game's circuits (Al-Balad Circuit, Thalatheen Run) against 3 rivals. Countdown, checkpoint beam, live position. Pays 1,000 / 500 / 250 / 100 (R) |
| Bank heist | Rob the bank (E at the red pad), then survive the police for 2:00. Escaping pays +500; getting caught (2.5 s next to a police car) costs up to 50. The bank then closes for 3:00 |
| GPS | Search the 650 places (N), with a route over the real roads that respects one-way streets. Dots on the road, distance left, and a new route if you leave it |
| Minimap | Roads within 260 m, turning with the car. Shows the bank, shop, race starts, GPS route, traffic and police |
| HUD | Street name, clock, cash, drift bank, speed, drift combo, mission line |
| Day and night | One in-game day every 24 minutes, with headlights at night |
| Saving | Cash, drift bank, cars, current car and upgrades per car (DataStore) |
| Money (Robux) | VIP game pass and two cash packs, switched off until you add your own IDs (see below) |

Controls:
- **W/S** or the thumbstick: gas and brake/reverse
- **A/D**: steer
- **Space** or the **DRIFT** button: handbrake
- **F**: reset onto the nearest road
- **C**: camera
- **G**: garage
- **K**: wheel
- **N**: GPS
- **R**: race
- **E**: rob the bank
- **U**: tuning shop

Phones and tablets get on-screen buttons for everything.

Each device simulates its own traffic, race rivals and police, so other players don't see the same AI cars. Players do see each other's cars.

## Open and test it

1. Install Roblox Studio (free) and sign in.
2. **File → Open from File →** `IrbidDrive.rbxlx`.
3. Press **Play**. The server builds the map first (about 10,000 road pieces, 10,600 buildings and 12,600 terrain tiles), which takes a few seconds. Then you spawn in your car.
4. To test saving in Studio, open **Game Settings → Security → Enable Studio Access to API Services**.

**Status:** this has not been run in Roblox Studio yet. The PC where it was made has no Studio. What has been checked:
- Every script passes the official Luau analyzer (`luau-analyze`).
- The place file is valid XML.
- `tests/run.js` loads this exact place file into a headless stand-in for the Roblox engine and plays through: map, car, driving a GPS route, 0–100 and braking, drifting, traffic, both race outcomes, both heist outcomes, the shop, the wheel, the garage, the GPS search, the minimap, reset, the clock, and saving and loading. It passes 75 of 75 checks.

The stand-in has no physics or rendering, so expect small fixes on the first run in Studio: camera feel, seat behaviour, how heavy the map is on phones.

## Publish it and earn Robux

1. In Studio: **File → Publish to Roblox**.
2. In the **Creator Dashboard** (create.roblox.com), open the experience → **Monetization**:
   - **Passes**: create "VIP" (double drift cash + the Super V10 car) and set a price.
   - **Developer Products**: create "5,000 cash" and "25,000 cash" and set prices.
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
