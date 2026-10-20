# Irbid Drive for Roblox (starter version)

A Roblox version of Irbid Drive built from the **same real map data** as the web game: OpenStreetMap roads (with their widths) and
buildings, plus NASA SRTM terrain heights, for 2.5 km around the web game's start point in Al-Balad. Players drive and drift, drift points
turn into cash, cash buys cars, and progress is saved.

It is **not** a 1:1 copy: Roblox runs Luau scripts in Roblox Studio, so the web game's code cannot run there. The driving uses the web game's
Arcade handling formulas, rewritten in Luau. Traffic, races, the heist, damage, weather, the driving school and the 217-car list are not in
this version yet.

**Status: untested in Roblox Studio** (there is no Studio on the PC where it was made). The scripts pass a Lua syntax check and the place file is
valid XML. Expect to fix small things on the first run in Studio.

## Open it

1. Install Roblox Studio (free) and sign in.
2. Open `roblox/IrbidDrive.rbxlx` (File → Open from File).
3. Press **Play**. The server builds the map first (about 10,000 road pieces and 9,600 buildings; it takes a few seconds), then you spawn in your car.

Controls: W/S or the thumbstick = gas / brake and reverse, A/D = steer, Space or the DRIFT button = handbrake, F or "Reset car" = reset,
"Garage" = cars.

## Publish it and earn Robux

1. In Studio: **File → Publish to Roblox**, name it, then in **Game Settings → Security** turn on **Enable Studio Access to API Services**
   (needed for saving).
2. In the **Creator Dashboard** (create.roblox.com) open the experience → **Monetization**:
   - **Passes**: create "VIP" (double drift cash + the Super V10 car) and set its price.
   - **Developer Products**: create "5,000 cash" and "25,000 cash" and set their prices.
3. Copy each numeric ID into `roblox/src/ReplicatedStorage/Config.lua` (`GAMEPASS_VIP`, `PRODUCT_CASH_SMALL`, `PRODUCT_CASH_BIG`), run
   `node tools/make_roblox.js dist/irbid-drive.html` again, reopen the place and publish. (Or edit `ReplicatedStorage.Config` in Studio directly.)
4. Set the experience to Public when you are ready.

Roblox's own rules decide how Robux become real money (**Developer Exchange / DevEx**). Read the current DevEx terms on Roblox's site before
you plan on it: they include an age minimum, a verified account, a minimum Robux balance and good standing. Roblox keeps a share of every
sale. None of this was set up for you, and nothing was published.

## Rules to keep

- **Keep the OpenStreetMap credit** shown at the bottom of the screen ("Map data © OpenStreetMap contributors (ODbL)"). The ODbL licence
  requires it.
- **Car names are generic on purpose** ("Hot Hatch RS", not the brand). Real car brands are trademarks, and Roblox removes experiences that
  use them without permission. The speeds come from the web game's car data.

## Files

| Path | What it is |
|---|---|
| `IrbidDrive.rbxlx` | The place file (all scripts and map data). Generated, do not edit by hand |
| `src/` | The Luau code: `WorldBuilder` (map), `GameServer` (cash, cars, saving, purchases), `CarClient` (driving, HUD, garage), `Config` |
| `data/`, `build/` | Generated map data and config (also used by `default.project.json` if you use Rojo) |

Regenerate everything with `node tools/make_roblox.js dist/irbid-drive.html [radius_m]` from the repo root (default radius 2500 m).
