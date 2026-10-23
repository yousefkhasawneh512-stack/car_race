# Irbid Drive for Roblox: read this first

This folder is the complete Roblox project of **Irbid Drive** (version 4.4, 2026-10-24): the open-world driving game on the real map of
Irbid, Jordan, ported from the web game (`dist/irbid-drive.html`, HTML + three.js) to native Roblox Luau. One game, one car controller,
one input path, one damage system.

## Play it in 3 steps

1. Install **Roblox Studio** and sign in.
2. **File → Open from File →** `IrbidDrive.rbxlx` (in this folder).
3. Press **▶ Play** (F5). The server builds the map when the game starts: about 18,000 road pieces, 14,500 buildings and the terrain.
   That can take a while in Studio. Then you are seated in your car and the clock starts at 15:00.

Optional, once:
- **Sound:** upload `audio/IrbidDriveSounds.wav` and put its asset ID in `ReplicatedStorage.Config.AUDIO_ATLAS_ID` (see `BUILD_AND_IMPORT.md`).
  Until then the game is silent.
- **Saving in Studio:** Game Settings → Security → *Enable Studio Access to API Services*.

## Controls

W / S or the left stick / triggers: gas, brake and reverse · A / D: steer · Space: handbrake (drift) · C: camera · F: back to the start ·
R: race or duel · M: GPS · G: car wheel · V: garage · U / P: tuning shop + repair bay · I: damage mode · O: diagnostics · H: Arcade /
Realistic · Q / E: gears (manual) · Z: auto-drive · X: horn · L: mute · **Y: settings** (Roblox keeps Esc for its own menu).
Phones and tablets get on-screen pads. Gamepads work directly. A Logitech G29 works through Steam Input or x360ce (see `BUILD_AND_IMPORT.md`).

## New in 4.4

Graphics quality presets **Auto / Low / Medium / High / Ultra** (Settings, key Y), plus manual Shadows, Colour grading + bloom and
Draw distance. The place uses Roblox's *Future* lighting. Values come from the starter pack you supplied (`MapVisualConfig.lua`).

## The other documents

| File | What it says |
|---|---|
| `BUILD_AND_IMPORT.md` | Exact steps: open the place file, or rebuild it from source (Node), or sync with Rojo; sound upload; G29 set-up; publishing |
| `FEATURE_MERGE_REPORT.md` | What came from where (web game, starter pack, other projects found on the PC), the Roblox replacement of each feature, status |
| `BUG_FIX_REPORT.md` | Bugs found during the conversion, cause, fix and test |
| `MAP_DATA_AND_SOURCES.md` | OpenStreetMap / SRTM sources and licences, the coordinate conversion, what the map covers and what it does not |
| `ASSET_MANIFEST.md` | Every asset the game needs, where it comes from, its licence, and what is missing |
| `TEST_REPORT.md` | Every test that ran, with results, and what still needs a manual test in Studio |
| `README.md`, `CONVERSION_PROGRESS.md` | The project's full README and the conversion checklist (feature inventory and test log) |

## Honest status

Every system was ported and tested **headless**: a Luau stand-in for the Roblox engine plays the place file through, and the physics, damage
and roadside objects match the web game number for number. **Claude has not run the game in Roblox Studio**, because Studio could not sign in
from its sandbox. Still to check in Studio: the look, the sound, the camera feel, performance on phones, and two-player multiplayer.
`TEST_REPORT.md` lists what to check by hand.
