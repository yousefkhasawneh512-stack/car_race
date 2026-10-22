# Irbid Drive → Roblox: conversion progress

This file is the persistent checklist for the Roblox conversion. It is updated after every stage. **When resuming, read this file
first, then verify the state with the commands under "How to verify" (never assume planned work is done).**

- Original game: `src/parts/*.js` → `dist/irbid-drive.html` (web, three.js r128). **Never modified by the Roblox work.**
- Roblox project: `roblox/` (Luau sources in `roblox/src`, generated data in `roblox/data` + `roblox/shared`, place file `roblox/IrbidDrive.rbxlx`).
- Generator: `node tools/make_roblox.js dist/irbid-drive.html` (reads the REAL web build headless and exports its data and per-car numbers).
- Backups: git tag `backup/roblox-3.1` (= commit `bd98d91`, the state before this conversion round) and a verified full-history bundle
  `C:\Users\youse\IrbidDrive-backups\car_race-bd98d91-2026-10-22.bundle` (`git bundle verify` OK). Web rollback tags `backup/v41`…`backup/v49`.
- The zip `Downloads\irbid-drive-v46-FULL.zip` is an OLDER snapshot (v46) of this same repository. This repository is v49 + Roblox 3.1,
  so the conversion works from the repository, not from the zip (nothing in the zip is newer; it has no `roblox/` folder).

## Current stage

| Stage | Status |
|---|---|
| A. Inspect + feature inventory | done (2026-10-22): this file, section "Feature inventory" |
| B. Backup + separate workspace | done: tag + bundle above; all Roblox work stays in `roblox/` and `tools/make_roblox.js` |
| C. Architecture + compatibility problems | done: sections "Architecture" and "Compatibility problems" |
| D. Foundation opens | partly verified: the place file loads in the headless engine stand-in; the owner's Studio run (v3.1 fixes) found and fixed visual bugs. **No Studio run by Claude** (see Blockers) |
| E. Map | converted in v1–v3.1 (3.5 km around the start) |
| F. Vehicles | in progress (this round): full 217-car roster |
| G. Physics + controls | in progress (this round): pure physics module, Realistic handling, gearbox, assists, gamepad / wheel |
| H. UI / camera / audio / visuals | in progress (this round) |
| I. Remaining gameplay | in progress (this round) |
| J–L | after I |

## Tools on this PC (checked 2026-10-22)

| Tool | State |
|---|---|
| Node 24, Python 3.15 + Playwright | installed |
| Luau CLI (`luau.exe`, `luau-analyze.exe`) | not on PATH; a copy downloaded from github.com/luau-lang/luau releases is used from the session scratch dir |
| Roblox Studio | **installed** (`%LOCALAPPDATA%\Roblox\Versions\version-d5b31acfb7154957`), includes `StudioMCP.exe` (Studio's MCP bridge) |
| Studio automation | `StudioMCP.exe --stdio` answers MCP `initialize`, but lists **0 tools** unless a signed-in Studio with its MCP server enabled is running. A Studio started from Claude's sandboxed shell cannot sign in (`TlsVerificationFail`: the sandbox's network proxy), so it must be started by the owner (see Blockers) |
| Rojo | not installed (not needed: the generator writes the place file; `default.project.json` is there for Rojo users) |
| Logitech G29 | **not connected** (only the G HUB virtual devices are present), so wheel input cannot be verified on this PC today |

## Architecture (Roblox)

- **Server** (`ServerScriptService`): `WorldBuilder` builds the map from `ServerStorage.IrbidData` (roads, buildings, ground parts, signs,
  sites); `GameServer` starts `Game/*` (saving in a DataStore, car building / spawning, payouts with server-side checks, garage, upgrades,
  wheel, fines, day/night, Robux items).
- **Client** (`StarterPlayerScripts`): `Main.client` runs one frame loop; `Client/*` modules (one job each). The player's car is a
  kinematic body moved by the device every frame with the web game's own physics (exactly like the web game: there is no physics engine
  in the web game either). Traffic, rivals and police are simulated on each device (the web game's AI code).
- **Shared** (`ReplicatedStorage`): `Config`, `Modules/Road` (graph, routing), `IrbidShared/*` (generated data: graph, places, rules,
  heights, cars).
- Coordinates: the web game's metres (x east, z south, heading `h` with forward (sin h, cos h)), relative to the start point; 3 studs per metre.

## Compatibility problems (web → Roblox)

| Problem | Decision |
|---|---|
| JavaScript / three.js do not run in Roblox | every system rewritten in Luau; numbers and formulas taken from the web source; generated data from the real build |
| Web map is 29 × 24 km (one HTML file); a Roblox place this big is too heavy | 3.5 km radius around the start (17,818 road pieces, 14,527 buildings) |
| Web cars carry real brand / model names | Roblox removes experiences that use trademarks without permission → generic names (`Config.CARS[i].name`); `roblox/CAR_NAMES.md` maps each to the web car (documentation only, not shown in game) |
| Web audio is synthesised with Web Audio oscillators | Roblox has no oscillator / sample-generation API for game scripts → see the audio row in the inventory |
| G29 in the web game: Gamepad API + WebHID (force feedback) | Roblox exposes only gamepads (XInput-style) through `UserInputService`; no HID access, no force feedback for wheels → see the G29 row |
| `localStorage` settings | DataStore (progress, server-side) + per-player settings saved with the progress |
| Single player (web) | Roblox servers are multiplayer: each player has their own car; payouts are checked on the server |

## Feature inventory (web v49 → Roblox)

Status words: **CV** converted and verified (an automated check ran) · **CU** converted, not fully verified · **PC** partially converted ·
**NC** not converted (reason given) · **BL** blocked by a technical / external limit. "Verified" here means the headless engine stand-in
(`roblox/tests`) or a pure-Luau equivalence test against the web build, never a Studio run (none was possible for Claude).

| Feature (web source) | Roblox | Status | Evidence / notes |
|---|---|---|---|
| Real OSM roads, widths, one-ways, limits, names (03a, 04) | `World/Roads`, `Modules/Road` | CV | scenario: all road pieces, graph loaded, routing |
| Real OSM buildings (03b, 03e) | `World/Buildings` | CV | scenario: all buildings; 2,744 pieces trimmed from carriageways |
| SRTM terrain (03d, 12c) | `World/Terrain` (tilted parts) | CV | scenario: ground under TH, roads not buried |
| Places + search (03c, 06l, 11b) | `Search`, `Gps` | CV | 1,048 places in 3.5 km |
| Hand-built 3D landmarks, campuses, trees, lamps, signs (06b–06j) | labels + signs only | PC | see stage H/E work below |
| Arcade physics (`updP`) | `Drive` | CV | scenario (0-100, braking, grip, slope, ramps) |
| Realistic handling (07g `ptDyn`, `ptAccel`, `ptBody`) | — | NC → this round | |
| Automatic / manual gearbox (07g, 11c) | — | NC → this round | |
| ABS / TC / ESC (07g) | — | NC → this round | |
| Tyre temperature / brake fade (07g SIMX) | — | NC → this round | |
| Speed bumps quarter-car (07c) | `SpeedBumps` | CV | |
| Traffic lights (05b) | `Signals` | CV | |
| Traffic AI (09_ai) | `Traffic` | CV | |
| Laws + fines (10) | `Laws`, `Game/Fines` | CV | |
| Drift points (10) | `DriftScore`, `Game/Drift` | CV | |
| Upgrades (07b, 08c) | `TuneShop`, `Game/Upgrades` | CV | |
| Car-unlock wheel (08a) | `CarWheel`, `Game/Wheel` | CV | |
| 217 cars, 5 rarity tiers (07a, 07a0) | 22 cars | PC → this round | |
| Car visuals (07a4 `mkPorsche`) | box body + cabin | PC → this round | |
| Races (11) | `Race` | CV | |
| Duels (11) | `Duel` | CV (flaky check) | random traffic: 19.5 m of 20 m in one run |
| Bank heist + police (08b) | `Heist`, `Police` | CV | |
| Landmark tour (K), ramps (J), clock (T), reset (F) | `Extras` | CV | |
| GPS + minimap + street names (11b, 12) | `Nav`, `Gps`, `Minimap`, `StreetName` | CV | |
| Search category chips, saved places (11b v49) | — | NC → this round | |
| Day/night + headlights (02b) | `Game/DayNight` | CV | |
| Weather + Irbid local clock (12f) | — | NC → this round | |
| Damage Off/Cosmetic/Full, dents, parts (07c, 07h) | — | NC → this round | |
| Tyre wear, burnouts (07d) | — | NC → this round | |
| Breakable world objects (07e) | — | NC | needs the props first (stage H/E) |
| Diagnostics panel (07f) | — | NC → this round | |
| Repair bay (08d) | — | NC → this round | |
| Driving school (11d) | — | NC → this round | |
| Auto-drive (11c) | — | NC → this round | |
| Road reputation + rival memory (11c) | — | NC → this round | |
| Pause / settings menu (12e) | — | NC → this round | |
| Cameras chase / cockpit / bonnet / bumper (12) | chase / far / free | PC → this round | |
| Engine / tyre / world audio, synthesised (12d) | optional sound ID | PC → this round | |
| Keyboard controls | `Controls` | CV | web keys |
| Touch pads (10b) | `Controls` | CV | `TOUCH=1` run |
| G29 / gamepad (10c) | thumbstick only | PC → this round | |
| Save / load (07b) | `Game/PlayerData` (DataStore) | CV | stand-in DataStore |
| Multiplayer | Roblox servers | CU | players see each other's cars; AI is per device; payouts server-checked |
| Robux items | `Game/Purchases` | CU | IDs empty until the owner creates them |
| OSM attribution | `InfoLine` | CV | |

## Test log

| Date | Run | Result |
|---|---|---|
| 2026-10-22 | baseline `node roblox/tests/run.js luau.exe` on `bd98d91` | 99 / 100 (FAIL: the duel rival drives the road ahead, 19.5 m of 20; random traffic, known flaky) — 457 s |

## Blockers (need the owner)

1. **Studio run.** Claude cannot sign in to Studio from its sandbox. To let Claude test in Studio: open Roblox Studio yourself, open
   `roblox/IrbidDrive.rbxlx`, and turn on the Studio MCP server (Studio: *Assistant* → settings (⋯) → *MCP servers* / "Enable Studio as MCP
   server"; the wording changes between Studio versions). Then tell Claude; it talks to Studio through `StudioMCP.exe`.
2. **G29.** Not connected to this PC; Roblox reads only gamepads. See the G29 notes in `roblox/README.md`.
3. **Audio assets.** Roblox plays only uploaded audio assets; uploading needs the owner's account.
4. **Robux IDs, publishing.** Owner's account only.

## How to verify (resume here)

```
node tools/make_roblox.js dist/irbid-drive.html          # regenerate (after ANY change in roblox/src)
node roblox/tests/run.js <luau.exe>                       # headless play-through (~8 min)
<luau-analyze.exe> roblox/src                             # static analysis (only Roblox globals unknown)
```
