# Test report (Roblox 4.4, 2026-10-24)

Machine: the owner's Windows 11 PC, Node 24, official Luau CLI (`luau.exe` / `luau-analyze.exe` from github.com/luau-lang/luau releases).
**Roblox Studio was not run by Claude** (it cannot sign in from Claude's sandbox), so nothing below is a Studio result.

## What ran, and the results

| Test | What it proves | Result |
|---|---|---|
| `node roblox/tests/run.js luau.exe` | loads **this exact place file** into a headless Luau stand-in for the Roblox engine (server + one player) and plays through every feature: map build, spawn, driving by keys / pad / GPS, drift banking, traffic, signals, speed bumps, races, duel, heist, police, garage, wheel, tuning shop, damage + repairs, diagnostics, school, auto-drive, weather, sound calls, settings, **graphics presets**, saving / loading, **DataStore outage** | **206 / 206 passed** (942 s; 1,168 simulated seconds, 31,952 ray tests) |
| same, `TOUCH=1` (phone / tablet: on-screen pads) | the same on a touch device | **208 / 208 passed** |
| same, `NOTERRAIN=1` (a place without a Terrain object) | the game builds its ground from parts | **206 / 206 passed** |
| same, before the save fix was added | the graphics checks on their own | 203 / 203 passed |
| `node roblox/tests/physics_equiv.js` | Roblox `CarPhysics` = the web game's physics, every frame, 40 driving cases (Arcade + Realistic, gearbox, ABS / TC / ESC, wet road, tyre temperature, brake fade, 60 / 30 / 20 fps) | **40 / 40** |
| `node roblox/tests/damage_equiv.js` | Roblox `Damage` = the web damage, tyres, repair prices | **92 / 92** |
| `node roblox/tests/objects_equiv.js` | the 24,883 roadside colliders and the object rules = the web build's | **10 / 10** |
| `node roblox/tests/catalog_test.js` | the car encyclopedia | **27 / 27** (the row-by-row source comparison needs the downloaded database, which is not on disk this time: not run) |
| `node roblox/tests/audio_atlas.js` | the sound file | **all passed** |
| `luau roblox/tests/graphics_presets.luau` (new) | the presets module: Auto from Roblox's quality slider, overrides, draw distance, ordering | **20 / 20** |
| `luau-analyze` on every changed file | syntax / types | no findings except Roblox globals the CLI does not know (expected) |
| `make_roblox.js` regeneration | `data/` and `shared/` identical to 4.3 (only scripts changed) | confirmed (`git status`: no changes there) |

New scenario checks this round (all passed in all three runs):
- graphics Auto = High (shadows, grading, no sun rays, props at the web distance) · Low (no shadows / grading, props 60 %: 685 → 432
  drawn near the car, lighter rain) · Ultra (sun rays, specular 0.6, props 130 %: 1,206) · manual rows override the preset · the settings reach the server
- load failed 3 times → fresh session marked SaveOff · that session does not overwrite the real progress (20,102 JD kept) · one failed read is retried

The new save checks were **not** run against the old code. The old `load` gave the fresh 500 JD session without a SaveOff flag, and the old
`save` wrote it over the record, so both new checks would fail there. That conclusion comes from reading the code; it was not run.

## The brief's 15 test items

| # | Item | Status |
|---|---|---|
| 1 | Opens in Roblox Studio | **manual**: the place file loads in the stand-in. The owner opened earlier versions in Studio (v3.1) |
| 2 | Main menu loads | confirmed headless (HUD, menus, settings). Look: manual |
| 3 | Map loads, correct coordinates | confirmed headless (roads, buildings, ground under the height field, GPS routes on the real graph) |
| 4 | Spawn a vehicle | confirmed headless |
| 5 | Accelerate, turn, brake, reverse, recover | confirmed headless + physics equal to the web game |
| 6 | Keyboard + controller | confirmed headless (simulated keys and pad). Real devices: manual |
| 7 | G29 | **not tested** (no wheel connected). The processing is tested with simulated pad input |
| 8 | Collisions | confirmed headless (walls, buildings, roadside objects, traffic) |
| 9 | Damage visible in the world | logic confirmed headless (parts created, moved, removed). **Look: manual** |
| 10 | Tyre condition affects handling | confirmed (`damage_equiv` driving cases) |
| 11 | Repair garage restores the car | confirmed headless (paid per item, only at the garage, record repaired) |
| 12 | Traffic lights + speed bumps | confirmed headless |
| 13 | Vehicle selection + settings | confirmed headless |
| 14 | Multiplayer + persistence safety | single player + stand-in DataStore confirmed, outage included. **Two real clients: manual** |
| 15 | No script errors / missing references | "no script errors at the end" passes in all three runs |

## Known limits of these tests

- The stand-in has no renderer, no physics engine, no real input devices and no network. Visual results, frame rate, sound and the feel of the
  camera / car are not measured. **No performance numbers exist for Roblox.**
- Traffic and rival placement is random (`math.random`), so counts in the details differ run to run. Earlier rounds saw rare flaky checks
  (`CONVERSION_PROGRESS.md`, Test log). None failed this round.
- Lighting.Technology Future is written into the place file. The stand-in does not read it.

## Manual test checklist (Studio, about 20 minutes)

1. Open `IrbidDrive.rbxlx`, press Play, and wait for the map. Check: no red errors in View → Output; you sit in a car on a road at 15:00.
2. Drive W / A / S / D, Space (drift), F (reset). Check: the car turns both ways, brakes, reverses, and does not sink into roads.
3. Y → Graphics quality: switch Low → Ultra. Check: shadows go and return, the image gets warmer and glowier on High / Ultra, and trees and
   poles appear further away on Ultra. Note the frame rate (Shift+F5) on Low and on Ultra.
4. I (damage Full), hit a wall at 60 km/h. Check: visible dents and cracks on that side; O shows the damage; drive to Apex Drift Customs, U, Repair all.
5. Settings → Weather: Rain. Check: rain streaks, darker and shinier road.
6. Gamepad / G29 (through Steam Input / x360ce): Y → Gamepad setup. Check: the live readout follows the wheel both ways and both pedals; the car turns.
7. Test → Clients and Servers, 2 players. Check: both cars visible to each other; each player's money is separate.
8. Enable API Services, earn some JD, stop and Play again. Check: the money is still there.
9. Upload the sound (`BUILD_AND_IMPORT.md`) and check engine, tyres, crash and horn.
10. Phone: Studio's device emulator, or a published private test on a phone. Check the touch pads and the frame rate on Low.
