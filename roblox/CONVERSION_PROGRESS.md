# Irbid Drive → Roblox: conversion progress

This file is the persistent checklist for the Roblox conversion. It is updated after every stage. **When resuming, read this file
first, then verify the state with the commands under "How to verify" (never assume planned work is done).**

- Original game: `src/parts/*.js` → `dist/irbid-drive.html` (web, three.js r128). **Never modified by the Roblox work.**
- Roblox project: `roblox/` (Luau sources in `roblox/src`, generated data in `roblox/data` + `roblox/shared`, sound in `roblox/audio`, place file
  `roblox/IrbidDrive.rbxlx`).
- Generators: `node tools/make_roblox.js dist/irbid-drive.html` (reads the REAL web build headless and exports its data and per-car numbers),
  `node tools/make_roblox_audio.js dist/irbid-drive.html` (renders the web game's synthesised sounds into one file).
- Backups: git tag `backup/roblox-3.1` (= commit `bd98d91`, the state before this conversion round, pushed) and a verified full-history bundle
  `C:\Users\youse\IrbidDrive-backups\car_race-bd98d91-2026-10-22.bundle` (`git bundle verify` OK). Web rollback tags `backup/v41`…`backup/v49`.
- The zip `Downloads\irbid-drive-v46-FULL.zip` is an OLDER snapshot (v46) of this same repository. This repository is v49 + Roblox, so the
  conversion works from the repository, not from the zip (nothing in the zip is newer; it has no `roblox/` folder).

## Current stage (2026-10-22, Roblox version 4)

| Stage | Status |
|---|---|
| A. Inspect + feature inventory | done: section "Feature inventory" |
| B. Backup + separate workspace | done: tag + bundle above; all Roblox work stays in `roblox/`, `tools/make_roblox*.js` |
| C. Architecture + compatibility problems | done: sections "Architecture" and "Compatibility problems" |
| D. Foundation opens | the place file loads in the headless engine stand-in; the owner's Studio run (v3.1) found visual bugs that were fixed. **No Studio run by Claude** (Blockers 1) |
| E. Map | converted (3.5 km around the start); v4.1: the hand-built landmarks and the street furniture / trees. Not yet: generated fill buildings, rooftop details |
| F. Vehicles | 217 cars with the web numbers; v4.1: the web car shapes and light lines |
| G. Physics + controls | Arcade + Realistic + assists + gearbox: verified against the web build; gamepad / wheel input: converted (no hardware) |
| H. UI / camera / audio / visuals | settings menu, cameras, HUD gear line, weather visuals, sound (needs the upload), damage looks: converted |
| I. Remaining gameplay | all web gameplay systems converted (v4.1: school, auto-drive, reputation, chips / saved places, traffic density, text size). Not yet: breakable roadside objects |
| J–L | integration tests run after every stage (Test log); final Studio validation needs Blocker 1 |

## Tools on this PC (checked 2026-10-22)

| Tool | State |
|---|---|
| Node 24, Python 3.15 + Playwright | installed |
| Luau CLI (`luau.exe`, `luau-analyze.exe`) | not on PATH; a copy downloaded from github.com/luau-lang/luau releases is used from the session scratch dir |
| Roblox Studio | **installed** (`%LOCALAPPDATA%\Roblox\Versions\version-d5b31acfb7154957`), includes `StudioMCP.exe` (Studio's MCP bridge) |
| Studio automation | `StudioMCP.exe --stdio` answers MCP `initialize`, but lists **0 tools** unless a signed-in Studio with its MCP server enabled is running. A Studio started from Claude's sandboxed shell cannot sign in (`TlsVerificationFail`: the sandbox's network proxy), so it must be started by the owner (Blockers 1) |
| Rojo | not installed (not needed: the generator writes the place file; `default.project.json` is there for Rojo users) |
| Logitech G29 | **not connected** (only the G HUB virtual devices are present), so wheel input cannot be verified on this PC today |

## Architecture (Roblox)

- **Server** (`ServerScriptService`): `WorldBuilder` builds the map from `ServerStorage.IrbidData`; `GameServer` starts `Game/*` (saving in a
  DataStore, car building / spawning, payouts with server-side checks, garage, upgrades, wheel, fines, settings, day/night, shared Auto weather,
  damage records + paid repairs, Robux items).
- **Client** (`StarterPlayerScripts`): `Main.client` runs one frame loop; `Client/*` modules (one job each). The player's car is a kinematic body
  moved by the device every frame with the web game's own physics (the web game has no physics engine either). Traffic, rivals and police are
  simulated on each device (the web game's AI code).
- **Shared** (`ReplicatedStorage`): `Config`; PURE modules (no Roblox services, testable with the Luau CLI next to the web build): `Modules/CarPhysics`,
  `Modules/Damage`, `Modules/Road`, `Modules/SettingsSchema`; generated data in `IrbidShared/*` (graph, places, rules, heights, cars, sound index).
- Coordinates: the web game's metres (x east, z south, heading `h` with forward (sin h, cos h)), relative to the start point; 3 studs per metre.
  Car models face -Z with +X = the car's right (web mesh: +x left, +z forward).

## Compatibility problems (web → Roblox) and decisions

| Problem | Decision |
|---|---|
| JavaScript / three.js do not run in Roblox | every system rewritten in Luau; numbers and formulas from the web source; data from the real build; physics and damage proven equal by equivalence tests |
| Web map is 29 × 24 km | 3.5 km radius around the start |
| Web cars carry real brand / model names | Roblox removes experiences that use trademarks without permission → generic names (origin + body + top speed, first 22 kept); `roblox/CAR_NAMES.md` maps them |
| Web audio is synthesised with Web Audio oscillators | Roblox has no oscillator / sample API (checked in Studio's API docs: no generator class, no editable audio) and limits uploads per month → the web sounds rendered offline into ONE file, played by regions; the owner uploads it once |
| G29 in the web game: Gamepad API + WebHID (force feedback) | Roblox exposes only gamepads; no HID, no force feedback → Steam Input / x360ce mapping + the web game's processing + rumble |
| Esc = the web game's pause menu | Roblox reserves Esc → settings on Y and a ⚙ button |
| `localStorage` settings and damage | saved with the progress on the server (settings checked against a schema; damage records only get worse from a device) |
| Single player (web) | multiplayer servers: shared clock and Auto weather; each player's settings, camera, damage looks and AI are on their own device |
| Mesh deformation (dents), canvas textures (cracks, scratches) | Roblox cannot deform meshes or draw textures at run time → parts (shaded dent patches, crack lines, scratch strips) |

## Feature inventory (web v49 → Roblox v4)

Status words: **CV** converted and verified (an automated check ran) · **CU** converted, not fully verified · **PC** partially converted ·
**NC** not converted (reason given) · **BL** blocked by a technical / external limit. "Verified" means the headless engine stand-in
(`roblox/tests/run.js`) or a pure-Luau equivalence test against the web build, never a Studio run (none was possible for Claude).

| Feature (web source) | Roblox | Status | Evidence / notes |
|---|---|---|---|
| Real OSM roads, widths, one-ways, limits, names (03a, 04) | `World/Roads`, `Modules/Road` | CV | scenario: all road pieces, graph, routing |
| Real OSM buildings (03b, 03e) | `World/Buildings` | CV | scenario: all buildings |
| SRTM terrain (03d, 12c) | `World/Terrain` (tilted parts) | CV | scenario: ground under TH, roads not buried |
| Places + search (03c, 06l, 11b) | `Search`, `Gps` | CV | 1,048 places |
| Search category chips, saved places (11b v49) | `Search`, `Game/Settings` (SaveFav) | CV | scenario: Worship chip lists only mosques / churches; ☆ saved by the server, listed first |
| Hand-built 3D landmarks (06b, 06c, 06g2, 06i groups) | `World/Landmarks` (625 parts, exported mesh by mesh) | CU | scenario: every part built; shapes approximated (cones, extrusions → boxes), no textures; not seen in Studio |
| Street furniture + vegetation (05b, 06i, 06j instanced props) | `Client/Props` (73,091 props, web LOD radius per family) | CU | scenario: lamps / poles / trees near the car, removed behind; not seen in Studio |
| Breakable / movable roadside objects (07e) | buildings and cars only | PC | the props exist now but do not collide (next round) |
| Arcade physics (`updP`) | `Modules/CarPhysics` | CV | `physics_equiv` (equal to 4e-13) + scenario |
| Realistic handling (07g) | `Modules/CarPhysics` | CV | `physics_equiv` 28 Realistic cases; scenario 0-100 4.8 s vs listed 4.7 s |
| Automatic / manual gearbox, Q / E, refused downshift (07g, 11c) | `Handling` | CV | `physics_equiv` manual cases; scenario E / Q |
| ABS / TC / ESC (07g v48) | `Modules/CarPhysics` | CV | `physics_equiv` |
| Tyre temperature / brake fade (07g v49) | `Modules/CarPhysics` | CV | `physics_equiv` (tyres 146 °C, brakes 700 °C) |
| Wet-road grip (12f, Realistic only) | `Weather` → physics | CV | `physics_equiv` wet case; scenario grip x0.81 |
| Speed bumps quarter-car (07c) | `SpeedBumps` | CV | + the bump-stop severity for damage |
| Traffic lights (05b) | `Signals` | CV | |
| Traffic AI (09_ai) | `Traffic` | CV | models per traffic zone and web paints: scenario (84 % common in Al-Balad, web 84 %) |
| Traffic density High / Medium / Low / by time of day (12e v47, v49) | `TrafficDensity`, `Traffic.density` | CV | scenario: Low 35 %, by the hour, 250 m rule |
| Laws + fines (10) | `Laws`, `Game/Fines` | CV | |
| Drift points (10) | `DriftScore`, `Game/Drift` | CV | |
| Upgrades (07b, 08c) | `TuneShop`, `Game/Upgrades` | CV | |
| Car-unlock wheel (08a) | `CarWheel`, `Game/Wheel` | CV | web lists per slice; odds 49.8 / 35.1 / 10.2 / 3.9 / 0.9 % in 20,000 rolls |
| 217 cars, 5 rarity tiers (07a, 07a0) | `Config.CARS` (generated) | CV | scenario: 217, names unique without brands, numbers per car |
| Car shapes (07a `mkPorsche`, 07a4 light lines) | `Modules/CarBody` | CU | scenario: profile pieces, every wedge corner on the web profile, the web size, light lines by tier; Roblox's wedge geometry assumed (Studio look needed); no detail texture |
| Races (11) | `Race` | CV | rivals from the sports catalogue |
| Duels (11) | `Duel` | CV | check now relative to the rival's own acceleration |
| Bank heist + police (08b) | `Heist`, `Police` | CV | |
| Landmark tour (K), ramps (J), clock (T), reset (F) | `Extras` | CV | |
| GPS + minimap + street names (11b, 12) | `Nav`, `Gps`, `Minimap`, `StreetName` | CV | |
| Day/night + headlights (02b) | `Game/DayNight`, `Weather` | CV | |
| Weather Auto / Clear / Cloudy / Rain (12f) | `Game/Weather`, `Weather` | CV | scenario (rain, wet road, drying, line); visuals not seen in Studio. Web bug fixed in the port (rain never starts in the web build) |
| Irbid local clock (12f) | `Weather` | CV | scenario |
| Damage Off / Cosmetic / Full: impacts, zones, dents, parts, glass, lamps, rims, mechanical (07c, 07h) | `Modules/Damage`, `CarDamage` | CV | `damage_equiv` 92 checks (equal to 1e-13); scenario: wall hit, effects, server store |
| Tyre model, wear, punctures, burnouts (07d) | `Modules/Damage`, `CarDamage` | CV | `damage_equiv` driving cases; scenario slide wear |
| Damage looks (07c, 07h visuals) | `CarDamageFx` | CU | built from parts; scenario checks dents / bumper; not seen in Studio |
| Diagnostics panel (07f) | `Diagnostics` | CV | scenario |
| Repair bay, prices, inspection (08d) | `TuneShop`, `Game/DamageStore` | CV | scenario: 12 items, paid exactly; `damage_equiv` prices |
| Driving school (11d) | `School`, `Game/Settings` (SaveSchool) | CV | scenario: lessons 1 and 2 driven and passed, result card, best scores saved |
| Auto-drive (11c) | `AutoDrive` | CV | scenario: 355 m route driven to "arrived"; takeover by input |
| Road reputation + rival memory (11c) | `Reputation`, `Game/Settings` (SaveRep) | CV | scenario: fines, gap, saved; named racers with the web skills |
| Pause / settings menu (12e) | `SettingsMenu`, `Settings`, `Game/Settings` | CV | scenario: rows, saved by the server and with the progress |
| Cameras chase / cockpit / bonnet / bumper (12, v48) | `Camera` | CU | the web numbers; camera feel not seen in Studio |
| Accessibility: text size, reduced motion (12e v48) | `Accessibility`, `Camera` | CV | scenario: text size 140 % |
| Engine / tyre / world audio (12d) | `CarAudio` + the sound atlas | CU | `audio_atlas` (11 checks), scenario (pitch, voices, squeal, horn, crash, mute, muffle); **BL** until the owner uploads the file; not heard in Studio |
| Keyboard controls | `Controls` | CV | web keys (+ Y settings, Esc kept by Roblox) |
| Touch pads (10b) | `Controls` | CV | `TOUCH=1` run |
| G29 / gamepad (10c) | `Gamepad`, setup panel | CU | scenario with simulated gamepad input (gas, brake, both steering directions, dead zone, sensitivity, curve, invert, centre, buttons, rumble, unplug); **BL** for a real G29 (no hardware; Roblox needs Steam Input / x360ce; no force feedback) |
| Save / load (07b) | `Game/PlayerData` (DataStore) | CV | stand-in DataStore: progress, settings, damage |
| Multiplayer | Roblox servers | CU | players see each other's cars; payouts, settings, damage and repairs checked on the server; not tested with two real clients |
| Robux items | `Game/Purchases` | CU | IDs empty until the owner creates them |
| OSM attribution | `InfoLine` | CV | |

## Test log

| Date | Run | Result |
|---|---|---|
| 2026-10-22 | baseline `run.js` on `bd98d91` | 99 / 100 (the duel distance check, random traffic) |
| 2026-10-22 | physics refactor (`ba1b7be`): `run.js` | 99 / 100 (same flaky check) · `physics_equiv` 12 / 12 (4e-13); a 1 % change in one constant fails all 12 |
| 2026-10-22 | roster + Realistic + settings: `run.js` | 115 / 115 |
| 2026-10-22 | + gamepad, cameras, weather, sound: `run.js` | 139 / 139 · `TOUCH=1` 141 / 141 · `NOTERRAIN=1` 137 / 139 (Auto weather rained during the run: the checks now start in Clear weather) |
| 2026-10-22 | `physics_equiv` (Arcade + Realistic, 40 cases) | 40 / 40 + 6 / 6 web-trace sanity checks, largest difference 3.8e-13 |
| 2026-10-22 | `damage_equiv` | 92 / 92, largest difference 1.3e-13 (first run: driving cases off by 1e-8 → the web game's Float32Array wheel loads, reproduced) |
| 2026-10-22 | `audio_atlas` | 11 / 11 |
| 2026-10-22 | + car shapes, landmarks, props, reputation, auto-drive, school, chips, density, text size (v4.1): `run.js` / `TOUCH=1` / `NOTERRAIN=1` | 174/174, touch 175/176 (the slide check failed once: a random traffic car blocked the test road, 1,763 rpm instead of 4,590; the test now clears the road first, then the sound block passed 24/24 on touch and on desktop; the full touch run was not repeated), no Terrain 174/174; physics_equiv 40/40, damage_equiv 92/92, audio_atlas 11/11 |
| 2026-10-22 | + damage, diagnostics, repair bay (Roblox v4): `run.js` / `TOUCH=1` / `NOTERRAIN=1` | 152 / 152 · 154 / 154 · 152 / 152 (401 s, 384 s, 387 s; three runs in parallel) |

## Known problems / limits

- Damage looks, weather visuals, cameras, sound, gamepad: converted and checked headless only; their look / feel needs a Studio run.
- Damage is drawn on the owner's device only (other players see the car undamaged).
- The web game's per-car engine-sound variation inside a layout (a hash of the car name) is one variation per layout here; the two detuned
  oscillators are two sounds summed after the soft clip (the web game sums before it); the load / rpm low-pass is an equaliser approximation.
- Rain streaks use the built-in square particle texture stretched along the fall direction (no uploaded texture).
- The web game's own rain bug (rain never starts) is fixed only in the port.

## Blockers (need the owner)

1. **Studio run.** Claude cannot sign in to Studio from its sandbox. To let Claude test in Studio: open Roblox Studio yourself, open
   `roblox/IrbidDrive.rbxlx`, turn on Studio's MCP server (Studio: *Assistant* → ⋯ → *MCP servers* / "Enable Studio as MCP server"; the wording
   changes between Studio versions), press Play, and tell Claude. Claude then talks to Studio through `StudioMCP.exe` (checked: it answers).
2. **Sound.** Upload `roblox/audio/IrbidDriveSounds.wav` once and put its ID in `Config.AUDIO_ATLAS_ID` (`roblox/README.md`, "Sound").
3. **G29.** Not connected to this PC; Roblox reads only gamepads (Steam Input / x360ce). See `roblox/README.md`, "Logitech G29".
4. **Robux IDs, publishing.** Owner's account only.

## Next round (in this order)

1. Collisions for the landmarks and the props, then the web game's breakable / movable objects (07e: street lights, utility poles, signs,
   trees, dumpsters, guardrails), with the damage system's object rules (Damage.impact takes the obstacle class already).
2. The generated buildings (06a / 06d / 06h) where OpenStreetMap has none, and the rooftop details (tanks, solar panels, antennas).
3. A Studio pass (Blocker 1): the look of the cars, landmarks, props, damage, weather; the sound after the upload; performance on a phone.

## How to verify (resume here)

```
node tools/make_roblox.js dist/irbid-drive.html          # regenerate (after ANY change in roblox/src)
node tools/make_roblox_audio.js dist/irbid-drive.html    # the sound file (only when the web audio or the tool changes)
node roblox/tests/physics_equiv.js <luau.exe>             # physics vs the web build
node roblox/tests/damage_equiv.js <luau.exe>              # damage vs the web build
node roblox/tests/audio_atlas.js                          # the sound file
node roblox/tests/run.js <luau.exe>                       # headless play-through (~8 min); also TOUCH=1, NOTERRAIN=1
<luau-analyze.exe> roblox/src                             # static analysis (only Roblox globals unknown)
```
