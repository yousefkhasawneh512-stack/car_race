# Build and import

There are three ways in. Pick one.

## A. Open the ready place file (no tools needed)

1. Roblox Studio → **File → Open from File →** `IrbidDrive.rbxlx`.
2. Press **▶ Play**. Wait for the map to build (the edit view shows only a sign saying "Press Play"; the map is built by `WorldBuilder` at run time).
3. **File → Save to Roblox As…** when you want it in your account.

## B. Rebuild the place file from source (after changing any `.lua` file)

Needs Node.js 18+ and the web build `dist/irbid-drive.html` from the `car_race` repository (the generator reads the map, cars and rules
from the real web build).

```
cd car_race
node tools/make_roblox.js dist/irbid-drive.html          # writes roblox/IrbidDrive.rbxlx, roblox/data, roblox/shared
node tools/make_roblox_audio.js dist/irbid-drive.html    # only if the sounds changed: roblox/audio/IrbidDriveSounds.wav
```

`make_roblox.js` empties `roblox/data` and `roblox/shared` on every run, so never keep hand-made files there.

## C. Rojo (optional)

`default.project.json` maps the same tree: `src/` + `shared/` (ReplicatedStorage.IrbidShared) + `catalog/` (ReplicatedStorage.IrbidCatalog) +
`data/` (ServerStorage.IrbidData). It also sets Workspace streaming off and Lighting Technology Future.

```
rojo build default.project.json -o IrbidDrive.rbxlx      # or: rojo serve, then connect from the Rojo plugin in Studio
```

Rojo was **not** installed on the build PC, so this route was not tested. The generator (B) is the tested route, and both produce the same tree.

## Where things are in Studio

| Studio location | Contents |
|---|---|
| ReplicatedStorage.Config | settings, prices, the sound ID, Robux IDs |
| ReplicatedStorage.Modules | pure shared modules: CarPhysics, Damage, Objects, Road, Catalog, SettingsSchema, GraphicsPresets |
| ReplicatedStorage.IrbidShared | generated data the devices need (road graph, places, heights, props, colliders, cars, sound index) |
| ReplicatedStorage.IrbidCatalog | the browse-only car encyclopedia data |
| ReplicatedStorage.Remotes | created by the server at start (every remote is checked on the server) |
| ServerStorage.IrbidData | generated map data for the server only (roads, buildings, landmarks) |
| ServerScriptService.WorldBuilder + World/* | builds the map |
| ServerScriptService.GameServer + Game/* | saving (DataStore), car spawning, payouts, garage, upgrades, wheel, fines, weather, damage records, repairs |
| StarterPlayer.StarterPlayerScripts.Main + Client/* | the device's frame loop: driving, input, camera, HUD, menus, traffic, missions, sound, damage looks, graphics |

## Sound (once)

1. Upload `audio/IrbidDriveSounds.wav`: Creator Dashboard → Development Items → Audio → Upload, or in Studio: View → Asset Manager → Bulk Import.
2. Put the numeric ID in `src/ReplicatedStorage/Config.lua` → `AUDIO_ATLAS_ID` and rebuild (B), or edit ReplicatedStorage.Config in Studio.

## Logitech G29

Roblox reads gamepads only. It has no HID access and no force feedback. Steam Input (add Roblox as a non-Steam game) or x360ce can present
the G29 as an Xbox controller: put the steering on the left stick X and the pedals on the triggers (or on one stick's Y axis). In the game,
Settings (Y) → *Gamepad / racing wheel setup* shows live readings. Check that the steering moves both ways and both pedals register, then
set Steering sensitivity to 17 (900° wheel → the game's 540° lock) and the dead zone to 1–2 %. Impacts make the pad rumble if the mapping
layer passes rumble on. **Not tested on a real G29** (none was connected).

## Publish

Studio: File → Publish to Roblox. Robux pass / product IDs go in Config (`GAMEPASS_VIP`, `PRODUCT_CASH_SMALL`, `PRODUCT_CASH_BIG`). They are empty
until you create them in the Creator Dashboard. Nothing has been published for you.

## Rollback

Every version is a git commit in `car_race` (pushed to GitHub). Before this round: commit `9b0fa38` (Roblox 4.3). Earlier backups: tag
`backup/roblox-3.1`, and the bundle `C:\Users\youse\IrbidDrive-backups\car_race-bd98d91-2026-10-22.bundle`.
