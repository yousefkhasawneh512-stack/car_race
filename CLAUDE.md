# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Irbid Drive** is a single-player open-world 3D driving sandbox on a real-data model of Irbid, Jordan: OpenStreetMap streets,
buildings and places, plus SRTM terrain. Players free-roam in traffic, earn drift points (spent on upgrades) and JD (spent on
a car-unlock wheel), and play races, duels, a bank heist, a landmark tour and navigation. There is no win/lose state.
**The current game is the reference implementation:** don't redesign gameplay.

Companion files (read before non-trivial work):
- `docs/FEATURES_100.md` (v48: status of the brief's 100 features, checked against the code) and `docs/MULTIPLAYER_PLAN.md` (multiplayer, content
  updates, public release, ray tracing: what is blocked and why).
- `docs/` (v47): `PROJECT_AUDIT.md` (dependency map, findings), `DEVELOPMENT_PLAN.md` (workflow, status per brief phase, next steps), `TEST_REPORT.md`,
  `PERFORMANCE_REPORT.md`, `ASSET_SOURCES_AND_LICENSES.md` (licence research; rules for adding assets), `KNOWN_ISSUES.md`, `PLATFORM_SUPPORT.md` (browsers, Capacitor apps).
- `V46_REPORT.md` (v46: manual gearbox + paddles, horn, auto-drive, road reputation / rival memory, simulated weather + Irbid local clock,
  two fine-rule bug fixes; tests, limits) + `docs/screenshots/v46/`.
- `V45_REPORT.md` (v45: Realistic tyre model + drift, synthesised engine audio, pause/settings/quality, save validation, HUD layering fix, G29 additions;
  baseline vs after, tests, perf, limits) + `docs/screenshots/v45/` (incl. the real-input playtest log).
- `V44_REPORT.md` (v44: visible component damage, materials, speed bumps, signals, places; tests, perf, limits) + `docs/REALISM_RESEARCH.md` (46 sources actually used) + `docs/screenshots/v44/`.
- `BUILDING_LANDMARK_REPORT.md` + `FINAL_TEST_REPORT.md` (v43 accuracy audit; per-issue status in AUDIT_REPORT.md).
- `PLAN.md`: approved behaviour changes, the realism roadmap, the on-hold refactor plan, expected pre-existing test results.
- `CHANGELOG.md`: per-version notes v22–v41 (history, honest limits, tests added per feature).
- `AUDIT_REPORT.md`: v39 audit (damage/tyre/object systems, map data, photos, car assets; what is real vs estimated). The v37 audit is `docs/AUDIT_v37.md`.
- `DATA_SOURCES_AND_LICENCES.md`, `manifest/` (cars, places, photos, world objects, `DATASET_REPORT.md`, `name_review.json`,
  `unresolved_places.json`), `TEST_REPORT.md`, `PLACE_IMPORT_REPORT.md` + `NAME_CORRECTIONS.md` (v40 place audit) + `PLACE_REVIEW.csv` (`tools/place_review_csv.py`), `G29_TEST_REPORT.md` (v42), `CAR_ASSETS_AND_SPECS.md`,
  `DAMAGE_AND_TIRE_WEAR_REPORT.md`, `ROAD_AND_TERRAIN_REPORT.md` (v41).
- `REALISM_FEATURES.md`: player-facing description of damage modes, tyres, diagnostics.

## Commands

```bash
python3 build.py                      # concatenate src/parts -> dist/irbid-drive.html (prints chars/lines)
npm install                           # only devDependency: three@0.128.0, needed by the Node tests
node tests/<name>.js dist/irbid-drive.html          # run one headless check (stubbed DOM + real three r128)
python3 tests/<name>.py dist/irbid-drive.html       # Playwright/Chromium check (needs `pip install playwright`)
```

- This Windows machine has no `python3` on PATH. Python is at `%LOCALAPPDATA%\Programs\Python\Python315\python.exe`
  (has playwright, xlrd, openpyxl; no pyproj/shapely, so `osm/bld/*.py` cannot run here). Node v24 is installed.
  `build.py` writes UTF-8 + LF explicitly, so a Windows build matches a Linux one byte for byte (check with `git diff --stat dist/`).
- **Git** (installed 2026-10-14, `C:\Program Files\Git\cmd`, branch `main`, remote `origin` =
  https://github.com/yousefkhasawneh512-stack/car_race.git). **The owner wants GitHub kept up to date: after every verified
  commit, `git push`.** Never force-push. Keep behaviour changes and refactors in separate commits.
  Keep `README.md` (public-facing) in sync when controls, commands or features change. `core.autocrlf=false`. The repo is in OneDrive: if `git add` fails
  with "Permission denied" on `.git/objects`, it's a sync lock, so just retry. History starts with v37 (import) → v38 as supplied → v38 review fixes.
- No lint, formatter, CI or `npm test`. Test output is mostly eyeballed (counts, `bad N`, `issues 0`).
- **After any change:** build, then run at least `val_net`, `boot`, `h2`, `h13`, `h20`, `h24`, plus the feature's own
  checks (listed per version in `CHANGELOG.md`, e.g. `phys_brake`, `terr_check`, `dyn_check` for physics/terrain). For place
  changes, dump coordinates with `node tests/h21.js dist/irbid-drive.html out.json` before and after and diff.
  Also run `realism_test` (29 checks), `place_audit.py` (33 checks, Python: every place correction of the v43 audit), `damage_test` (59 checks: zones, modes, per-car durability, tyres, burnouts, objects,
  switching, diagnostics, paid per-part repairs, full inspection) and `off_trace` (damage Off: the collider-free physics hash must equal v38's; the with-world hash is only
  reported, it changes whenever buildings near the start move); all exit 1 on failure. Visual: `damage_pw.py` (11 checks incl. the repair bay), `damage_v44_pw.py` / `world_v44_pw.py` (v44 screenshots into `docs/screenshots/v44/`).
  v44: `damage_v44` (29 checks: component parts, glass cracks, detachment, contact area, flat tyre + rims, persistence, repair, bump speed sweep,
  environment materials) and `signals_test` (12: sequence, conflicts, lamps, head placement, AI waits at red / never enters on red; random traffic,
  so it can vary run to run) from a scratch dir (signals) or the repo root (damage_v44). `perf_pw.py` (load time, heap, draw calls, frame time). `damage_test`, `realism_test`, `off_trace`, `handling_test` and `bld_check` load three from `node_modules`, so run them from the repo root. Wheel: `wheel_test.py` (40 checks; also run with arg `blocked`). Landmarks vs OSM: `lmchk`.
  Realistic handling: `handling_test` (writes the per-car powertrain table if given a 2nd arg: `manifest/car_powertrain.json`). Buildings vs OSM: `bld_check`.
  v45: `drift_v45` (23: steering both modes incl. analog wheel path, tyre model, countersteer, power over/understeer, load transfer, per-car, grip,
  random frame times, 60/30/20 fps), `audio_v45` (10, Node: engine table, harmonics, per-car waveforms), `save_v45` (9), all from the repo root;
  Playwright: `audio_v45_pw` (12), `pause_v45_pw` (12), `playtest_v45_pw` (21, real keyboard/mouse on the built game; arg `offline` for the
  offline copy: zero requests), `cpu_prof_pw` (JS ms/frame per subsystem with rendering stubbed + render-submit ms; arg `click` starts audio).
  `damage_v44_pw` / `world_v44_pw` ALWAYS write into `docs/screenshots/v44/` (they ignore `SP`): after a regression run, `git checkout -- docs/screenshots/v44`
  unless you mean to refresh that evidence. `pause_v45_pw` / `playtest_v45_pw` honour `SP` for screenshots only. The older Playwright scripts (`wheel_test`,
  `damage_pw`, `dc2`, `disp`, `ios`, `shopt`, `drive_pw`) use `SP` as the REPO ROOT (node_modules), so never point it at a scratch dir for them.
  v46: `assist_v46` (Node, repo root: manual gearbox, weather grip + climate table, Amman clock, reputation/rivals, saved wheel layout migration,
  auto-drive on a real 1.4 km route in both modes + at a red light) and `v46_pw.py` (Playwright: weather visuals, pause rows, local clock,
  auto-drive via the real search box, takeover, horn, E shift; screenshots into `docs/screenshots/v46/`, honours `SP`). `wheel_test` 43 checks.
  Offline copy: `python tools/make_offline.py` -> `dist/irbid-drive-offline.html` (three r128 inlined, git-ignored).
  v47: **`python tools/check.py`** (quick: parts exist + parse, build, head-script guard, hosts, attribution, JSON, asset manifests, core Node checks;
  `--full` adds every Node and Playwright check incl. `xbrowser_pw`; report `.check/report.md`; on success copies the build to `dist/last-good/`).
  v48: `assist_v48` (Node, repo root, 19) and `v48_pw.py` (12, screenshots `docs/screenshots/v48/`, honours `SP`); both are in `check.py`.
  v49: `assist_v49` (Node, repo root, 30; needs tag `backup/v48`) and `v49_pw.py` (12, `docs/screenshots/v49/`, honours `SP`); both in `check.py`.
  Roblox (`roblox/`, Luau, separate from the web build): `node tools/make_roblox.js dist/irbid-drive.html` regenerates `roblox/data`, `roblox/shared`
  and `roblox/IrbidDrive.rbxlx` from the build + `roblox/src` (rerun after ANY change in `roblox/src`; the place file embeds the sources).
  Test: `node roblox/tests/run.js <luau.exe>` (official Luau CLI, github.com/luau-lang/luau releases; not installed on PATH) plays the place
  file in `roblox/tests/rbxmock.luau` (no physics/rendering; 75 checks). `luau-analyze` on `roblox/src`: only Roblox globals are unknown.
  `v47_pw.py` (15: presets, traffic density, pause rows, context loss/restore, error banner, no-WebGL; screenshots `docs/screenshots/v47/`, honours `SP`),
  `xbrowser_pw.py` (Chromium/Firefox/WebKit + iPhone/iPad/Pixel emulation; needs `python -m playwright install firefox webkit`; one browser per case,
  WebKit lost its software-GL context on the 4th page of one process), `perf_v47_pw.py` (preset render cost, traffic cost). Assets:
  `node tools/gen_asset_manifests.js dist/irbid-drive.html` then `node scripts/validate-assets.js` (fails when a file changed without regenerating).
  App: `python tools/make_app_www.py` then `cd app && npx cap sync` (Capacitor 8; `app/www` and the copied `public/` folders are git-ignored).
  Expected results (v44, 2026-10-19): `h24` "bad 6", `vg` "bad 9" (searches for removed invented shops), `h14` "bad 2", `h21` places
  1729 (laz 1531), `tour` 0 off-road, `dyn_check` bad 0, `h16` fines 0, `lmchk` every landmark <= 5 m. `dc2` (draw calls) 540–1,060; the start view varies with random traffic (990–1,210 seen on both v43b and v44; with traffic hidden v43b 459–470, v44 451–459). `boot`/`h2`/`h13`/race/traffic output varies
  run to run (`Math.random`), so compare their shape, not their numbers.
  Broken or obsolete scripts (they fail the same way on v37): `val` (pre-OSM graph; use `val_net`), `csv_test`/`cs_check`
  (CSV nodes removed in v35b), `gen_fit`/`h18` (removed shops/places), `llchk` (expects `new.html`), `dups` (needs npm `acorn`).
  Node tests write output files into the current directory, so run them from a scratch dir (but `terr_check` must run from the repo root).
- Playwright: `pip install playwright` then `python -m playwright install chromium`. Scripts take the build path **relative to
  the repo root** (`tests\disp.py dist/irbid-drive.html`), resolve `node_modules/three` and write screenshots there (`SP` env
  overrides). Passing on v38: `disp`, `ios`, `shopt`, `wheel_test`, `dc2`, `drive_pw`. `dc`/`ui2`/`fx` hard-code `new.html`.
- Visual checks need a real browser (`page.screenshot`). Headless SwiftShader runs ~2 fps and RAF ticks unreliably, so
  force game state instead of driving (see `tests/wheel_test.py` for a manual RAF stepper).
- `osm/` holds the data pipelines that GENERATE `src/parts/03a`–`03d` (`gen_world.py`+`net.py` → `03a_net_data.js`,
  `bld/conv.py` → `03b_bld_data.js` (BBBike extract rectangle), `overpass/fetch.py buildings_geom`+`bld/conv_overpass.py` → `03e_bld_out.js`
  (`BLDO`: every OSM building outside that rectangle; pure Python, no shapely), `overpass/fetch.py`+`overpass/build.py --game` → `03c_poi_data.js` (since v39; `bld/pois.py` is the
  old BBBike route), `terrain/gen_terrain.py` → `03d_terrain_data.js`). `overpass/build.py` also writes `manifest/places.json` and
  `geo_summary.json`, `name_review.json`, `unresolved_places.json`; it keeps previous POID rows in their old order because `RLP()` seeds
  landmarks by first match. Its `LANDMARK_OSM` (-> `POID_LM` in 03c) says which OSM ids ARE a hand-built landmark (merged, not labelled twice).
  `fetch.py` caches raw layers for 30 days (`--refresh` forces a download).
  `fetch.py named` (v44) adds named non-POI features (peaks, springs, works, cemeteries, named areas, named non-residential buildings; dwellings,
  person-only names and security sites are never imported).
  **Place corrections (v43) live in `osm/overpass/corrections.py`** (name-vs-tag rules, per-OSM-id overrides with evidence + confidence, the heritage/mall
  cross-check); every change is logged in `manifest/name_review.json`. Never fix a place by hand-editing 03c. A place OSM lacks enters only through
  `osm/manual/verified_places.json` (tracked; needs lat/lon, `source_url`, `verified_by`). Google Maps coordinates are not a source.
  `osm/overpass/proj.py` is the game projection in Python. `osm/photos/commons.py` then `osm/photos/openverse.py` → `manifest/photos.json`;
  `tools/gen_car_manifest.js` → `manifest/cars.json` + `world_objects.json` (generated from the build; never hand-edit).
  Never hand-edit those five parts; change the pipeline and regenerate. **Raw OSM/SRTM input files (`osm/**/*.json`,
  `*.gpkg`, `osm/official/*.xls*`, `osm/overpass/out/`) are local-only and git-ignored. The owner does not want them published; never commit them.** The scripts are tracked.

## Architecture

**One script, one global scope.** `build.py` writes `01_head.html` (all CSS + overlay DOM + the three.js CDN `<script>`,
then opens `<script>`), followed by every part in its `order` list, into one HTML file. There are no modules or imports. Every
top-level `const`/`let`/`function` is a global visible to later parts, so **the `order` list in `build.py` is the dependency
graph**. Grep for a symbol rather than trusting filenames (e.g. save/load/tuning live in `07b_tune.js`, and `07p_player.js` is one line).
Current order and roles:

| Stage | Parts | Role |
|---|---|---|
| Engine | `01b_post_lib`, `02_setup`, `02b_sky`, `02c_facade` | three r128 post-processing libs, renderer (fixed 1920x1080 buffer, `DISP`), sky/GFX switch, facade shader |
| Data (generated) | `03a_net_data`, `03b_bld_data`, `03e_bld_out`, `03c_poi_data`, `03d_terrain_data` | `NETD/NETE` roads, `BLDD` footprints + `RL()`, `BLDO` footprints outside the extract, `POID` places + `RLP()` + `POID_LM`, `TERR` heights |
| World math | `03_world_data`, `04_graph`, `04b_streets`, `04c_budget` | `LL2XZ` projection, `TH()` terrain; graph `EDGES/NODES/HASH`, `roadAt`/`roadNear`/`route`; legacy street-role mapping; detail budget / zones |
| World build (flat frame) | `05a_roads`, `05b_decor`, `06a`…`06l` | road ribbons, colliders `COL`/`addCol`/`colB`, buildings (`placeReal`), landmarks, campuses, infra, vegetation, `PLACES` registry |
| Entities | `07a0`, `07a_cars`, `07a2_traffic`, `07a4_carvis`, `07a3_showcars`, `07p_player`, `07b_tune`, `07c_realism`, `07d_tyres`, `07e_objects`, `07f_diag`, `07g_drive`, `07h_dmgparts` | `PORS` (217 models), rarity, player `P`, save/tune/`applyTune`, damage (`carSpec`, impacts, dents), per-wheel tyres + burnouts, world-object classes, diagnostics panel |
| Rules / UI | `08a_wheel`, `08b_heist`, `08c_shop`, `08d_repair`, `09_ai`, `10_laws_player`, `10b_ios_touch`, `10c_wheel`, `11_race`, `11b_nav`, `11c_assist`, `11d_school` | economy, heist/cops, traffic/bot agents, **`updP` physics** + fines + keyboard, touch pads, G29 wheel, races, search/nav, manual gearbox / horn / auto-drive / road reputation + rival memory, driving school |
| Frame | `12a_fx`, `12d_audio`, `12b_post`, `12c_terrain`, `12e_pause`, `12f_weather`, `12g_platform`, `12_hud_loop` | effects, Web Audio (engine/tyres/world, synthesised), HDR bloom/grade chain, the terrain pass, pause/settings/quality presets/traffic density/frame meter, simulated weather + Irbid local clock, WebGL context loss + device report + loading-screen removal, minimap/HUD/camera and the **main loop** |

Order facts that have broken things before: `06h2_final_patch` runs before `06h_gen`, and `06d_fabric_driver` runs after it.
`12a_fx` must precede `12_hud_loop`. `08a_wheel` declares `let ui`, which earlier-defined handlers read at runtime. `07c_realism`
wraps `setPlayerCar` (a function declaration in `07b_tune`), so it must load after it. `07c` runs code at load that may call into
`07f` (`updateDamageButton`); that call is gated by `diagReady` because `07f`'s consts are still in their temporal dead zone then.

**Flat-frame authoring + one terrain pass (v37). This is the rule most likely to bite.** Every world generator builds at y=0.
At the end of `12_hud_loop.js`, `applyTerrain()` (`12c_terrain.js`) runs once before the loop starts and lifts the static scene
by `TH(x,z)`:
- per-instance matrices of every `InstancedMesh` (big ground boxes get a skirt down to the lowest corner);
- every vertex of identity-transform merged meshes (roads, sidewalks, wires);
- `position.y` of every other top-level scene child.

It skips the player, traffic, bots, cops and showcar meshes, beacons, nav dots, the sky dome, `gnd` and invisible
non-instanced objects. Consequences:
- Code that adds world objects **at load** must author at flat y. Adding `TH()` itself double-lifts the object; this was the v38 speed-bump bug.
- Code that creates objects **after** the pass, or moves them per frame, must add `TH(x,z)` itself, or read the
  already-lifted instance matrix (`getMatrixAt`) plus the mesh's `position.y`. `hillH()` is a legacy stub that always returns 0.
- `groundH = TH + .12` (+ stunt ramps) is what the physics uses.

**Coordinates:** metres, local transverse Mercator at 32.55 N / 35.85 E. **+x = east, +z = south.** Heading `h` has forward
`(sin h, cos h)`. The origin (Al-Balad) is elevation 0 in `TH`.

**Main loop** (`loop` in `12_hud_loop.js`): dt clamp → clock/time of day → sky/lights → traffic lights → `updTraffic` →
`updPStep(dt,frozen)` (= one `updP`; Realistic splits frames > 1/60 s) → `updHeist` → `updRace` → `poiNear` → `navTick` → `navLabels` → `showCarsTick` → `fxTick` → `damageTick` → `audTick` → `assistTick` →
camera → HUD `innerHTML` → `drawMap` → `gfxRender`. Communication is through shared globals (`P`, `drift`, `tune`, `fines`,
`spent`, `race`, `heist`, `NAV`, `traffic`, `bots`, `PLACES`, `ui`, `keys`, `clock`). There is no event bus or store.

**Input:** keyboard (`keys`), touch pads (`MobilePCInputController`, touch devices only) and the G29 wheel (`WH.poll`) are ORed
inside `updP`. The touch pads and the shop overlay use 1920x1080 canvas coordinates. Wheel button bindings dispatch synthetic
`keydown`/`keyup` events, so each action keeps one code path.

**Places:** `PLACES` holds ~1,640 real OSM places (`06l_real_pois`, `p.real=true`; 147 of them `kind:'area'` neighbourhoods/villages,
searchable only) plus ~23 hand-built landmarks seeded at real OSM points via `RL()`/`RLP()` and the `'@'` pseudo-street in `siteBeside`.
Heritage houses use `siteReal()` (06g2: built on their BLDD footprint, scaled with `S.kx/S.kz`); the clock tower uses `CLK_SITE` (06b).
Landmark markers sit on the OSM point (`06l` moves them when > 15 m off, unless `p.onReal`). `REALP=true` (`06a_fabric.js`) disables every
invented shop/venue builder. The early-return guards keep the `PR()` call order intact, so don't delete them.

**Storage:** `irbid-save` (`{fines,spent,owned,cur,dt,tune}`, `07b_tune.js`) is the only one that matters for compatibility.
`irbid-wheel` (G29 setup incl. pedal/clutch calibration, `pdz` dead zone, chosen `dev`), `irbid-drive-realism-v1` (damage mode + per-car condition) and `irbid-drive-handling-v1` (0 Arcade / 1 Realistic)
are separate keys on purpose. v45 adds `irbid-drive-audio-v1` (volumes, mute), `irbid-drive-gfx-v1` (quality, frame meter), and
`irbid-save-prev` (last good save at load) / `irbid-save-corrupt` (an unparsable save, kept before anything can overwrite it). `irbid-save` gains
only an `sv:1` marker; its values are validated on load (`07b`).

**Handling (v41, tyre model v45, `07g_drive.js`):** v45 replaced `ptLat`/`ptSteer` with `ptDyn` (two-axle slip-angle tyre model, load transfer,
friction circle, locked-rear handbrake, yaw inertia, 240 Hz sub-steps, kinematic blend < 6 m/s; Realistic skips the Arcade heading/lateral lines in `updP`)
and `slipTick` fills `TSLIP` (smoke/squeal/audio only) in both modes. `INP` carries throttle/brake to the audio.  key H, `handlingMode` 0 Arcade (default) / 1 Realistic. Every Realistic term in `updP` is behind
`handlingMode` (`ptAccel` replaces the arcade accel/friction lines, `ptLat`/`ptSteer` scale lateral decay/steering, `ptBody` overrides body
pitch/roll/heave, `ptBump` replaces the bump hop). Arcade must stay identical to v38 (`off_trace`). `ptSpec(i)` solves peak torque and drag
area from the PORS 0-100 and top speed (cached); all its numbers are estimates. 07f calls `ptSpec` at runtime only (07g loads after it).

**Damage (v39, `07c`–`07f`):** mode Off/Cosmetic/Full (key `I`, `#damageBtn`; diagnostics key `O`), **default Off = physics identical to
v37/v38, proved by `tests/off_trace.js`; keep it that way** (every new `updP` term is neutral when `damageMode===0`: `dfx.lat=1`,
`dfx.pull=0`, `burnoutState` false, `tyreStep` returns). `registerPlayerImpact(v,collider,nx,nz)` is called from `colB` (when `o===P`)
and from the traffic/bot code in `updP`; it returns the speed the car loses when the object GAVE WAY (broke/shoved), and `colB` then
skips the bounce. `n` points from the obstacle to the car. Mesh frame: +x = car's LEFT, +z = forward; wheels FL,FR,RL,RR = 0..3.
`carSpec(i)` is the per-car profile (cached); records are per car NAME, schema `v:2`, v38 records migrate in `migrateRecord` (new fields such as wheel `km`/`tmax` are filled by `Object.assign(newWheel(),…)`).
v44 `07h_dmgparts` builds tagged parts on the PLAYER mesh only (`dpEnsure`: bumpers bf/br, mirrors ml/mr, hood/trunk lids, door skins dl/dr) and draws
glass cracks from stored origins (`s.cracks[pane]=[[u,v,sev]]`), bent rims (`s.rims`), torn-off debris (`DP_DEBRIS`); its hooks in 07c are gated by
`dpReady` (07h consts are in their TDZ while 07c loads). `DFX.roll` (flat-tyre rolling resistance) is the only v44 `updP` term, 0 unless Full.
Repairs: `repairItems`/`repairPart`/`payRepair` (`08d`; ids `p:<part>`, `rim:<j>` added in v44); `repairCurrentCar` is a free full reset kept for tests only.
`damageEffects()` fills the shared `DFX`. Mesh parts are tagged in `mkPorsche` (`userData.part` body/glass/hl/tl/tyre/rim). Object
classes live in `OBJ_CLASS` (`07e`); breakables use `breakAt` = speed for a 1,500 kg car (energy-based); attached instances use keys
`<key>/arm|/head|/pool|/xf`, sign plates are in `SIGN_PLATES` (merged-mesh vertex range); instances are registered by `instO`
item slot `p[8]`. Speed bumps (always on, even with damage Off): 2 from OSM `traffic_calming` (`OSM_CALM`, `estimated:false`), the rest
**estimated** positions near OSM schools/clinics/parks, not survey data. Whether to keep them is an open owner decision (`PLAN.md`).
v44: one merged profile mesh (`SB_MESH`, flat-frame, draped by the terrain pass) and `bumpAt(x,z)` (50 m hash) give the same surface; `checkSpeedBumpCrossing`
runs a per-axle quarter-car (`SUSP`) and `bumpVisual` (from `damageTick`) applies heave/pitch/wheel travel/vibration to the mesh only.
**Signals (v44, `05b_decor`):** `light(axis, junction)` with a 60 s cycle and 4 offset groups (`nd.sgo`); axis `'i'` = link inside a split junction
(always green). `SIGNALS`/`SIG_SKIPPED` list every junction with its source; lamps are one InstancedMesh recoloured by `sigTick()` on phase change.
Traffic AI measures junction distance with `pathProg()` (09_ai). `tools/gen_signal_manifest.js` writes `manifest/signals.json` + `speed_bumps.json`.

## Constraints (the product; get owner approval in `PLAN.md` → "Approved behaviour changes" before altering)

1. **Geography is real data.** Don't invent, move or hand-edit streets, buildings or POIs. Regenerate from `osm/`. Named
   landmarks must stay on a real road of their role. Mark anything not backed by evidence as estimated/unverified, in code and in the UI.
2. **Seeded generators stay deterministic.** `PR` (seed `20250611`, `06g_pack.js`) and the call order of
   `runPack`/`runLandmarks`/`runGen` decide procedural coordinates. Never add `PR()` calls before them or reorder them.
   New visual layers use `Math.random`.
3. **Economy unchanged.** Upgrade price `base·2^level` (Speed 1,500 / Accel 1,200 / Handling 800 / Extra Drift 3,000; 5 levels).
   Repairs (v42, approved) cost JD per part in the Apex Drift Customs repair bay (`08d_repair.js`, estimates; × rarity tier).
   Wheel 10,000 JD, odds 50/35/10/4/1 %, 5,000 JD duplicate refund. Rarity drift multipliers ×1.0/1.2/1.5/2.0/3.0. Fines
   15/20/50/30 JD. Heist +500 / −50. Quirk to preserve: `fine()` *adds* to `fines` and balance = `fines − spent`, so fines raise the balance.
4. **Save compatibility.** The `irbid-save` shape must keep loading; there is no schema version.
5. Starter car Ford Focus RS. Don't change the `PORS` list, `rarityIdx` or spawn tables.
6. **Physics feel** (`updP`: grip, drift thresholds, accel curve, camera) only changes with approval. v37 braking/slope/surface
   values are documented in `CHANGELOG.md`.
7. Controls and HUD strings, including landmark names in "Passing:", stay unchanged.
8. **Single-file deliverable.** `dist/irbid-drive.html` works offline except for three.js **r128** from `cdnjs.cloudflare.com`.
   Don't upgrade three.js, add hosts, add runtime npm deps or add network calls. Keep the OSM attribution `#osmcr`.
9. **Performance.** No per-frame allocation and no O(places) per-frame work. New props go through `instO(...,R)` with an LOD
   radius matching their dependent props.

## Conventions

- Match the existing terse style: short names, dense one-liners, few comments, section banners `// ---- name ----`.
- New features are a new `NN_name.js` part added to `build.py`'s `order` at the right dependency point.
  Optional cross-part hooks are guarded with `typeof fn==='function'`.
- Persistent changes call `save()`. Modals set `ui=true`, which blocks `keys`.
- Before changing code, say which constraint it touches. Keep behaviour-neutral refactors separate from behaviour changes.
- Report test results honestly, including pre-existing failures and anything you couldn't run.
- **Deploy:** publish `dist/irbid-drive.html` to the existing Artifact (same file path ⇒ same URL), after grepping the build
  for the new code. An SEO copy (`irbid-drive-site/`, outside this repo) is derived from it by regex and must be regenerated.
- When architecture, commands or constraints change, update this file. Put the history in `CHANGELOG.md`, not here.

## Open issues worth knowing

- **Layering (v45):** the canvas is `z-index:0`, the HUD (`.h`, `#map`) 3, damage/repair buttons 4, menus 5+, pause 50. Before v45 the HUD was
  painted under the canvas (since v24). Keep new HUD elements on layer 3+.
- **Esc / wheel Back:** menus that close on Esc must not also open the pause menu. `ESC_PRE` (02_setup, the FIRST key listener) snapshots whether
  a menu was open; wheel buttons dispatch synthetic keys on `window`, where listeners run in registration order. While paused, the loop still polls
  the wheel (`WH.poll`) so its Back button can resume.

- **Head scripts (v47):** ~45 Node tests/tools extract the game with `/<script>\n([\s\S]*?)<\/script>/` (first match). Any other inline script must
  NOT start with `<script>` + newline (the v47 error-banner script starts `<script>(function`). `tools/check.py` fails if this breaks.
- **v48:** `ASSIST` (07g, `irbid-drive-assist-v1`): ABS / TC / ESC, Realistic only. Defaults reproduce v47 exactly (`assist_v48` compares a Realistic
  trajectory hash against `git show backup/v47:dist/irbid-drive.html`). Driving school `11d_school.js` (`irbid-drive-school-v1`, `schoolTick`
  after `assistTick`); `A11Y` (12e, `irbid-drive-a11y-v1`) is read by the loop (FOV) and 12b (blur) at run time only. `camMode` 0-3 (1 = cockpit,
  which the audio low-pass keys on). **Top-level names are shared by ALL parts:** `ASTORE` was already taken by 12d (audio); `check.py`
  parses the whole script to catch this.
- **v49:** `SIMX` (07g, `irbid-drive-sim-v1`): optional tyre temperature / brake fade. `SIMX.gk` multiplies `sfc` and `SIMX.bk` multiplies `bkEff`
  in `updP`, both ONLY when `handlingMode`, and both are exactly 1 when the options are off (`assist_v49` compares a Realistic trace with
  `backup/v48`). `simxTick` runs inside `updP` after `slipTick` (Realistic only). Traffic option `auto` (12e `trDen`/`TPROF`, `trAutoTick` from the loop
  after `schoolTick`; `trApply(true)` never parks a car within 250 m). Search (11b): `NAVF` (`cat` chip filter checked in `navSearch`, `fav` list in
  `irbid-drive-fav-v1`); the results box now starts with a `.ncat` chip row, so select result rows with `.nr`, not `navRes.children`.
- **v47 settings:** `irbid-drive-gfx-v1` gains `t` (traffic density high/medium/low). Low quality = 1280x720 buffer, Ultra = 2560x1440 (the composer is
  resized too); defaults (Auto, High traffic) = v46. Parked traffic cars have `c.park`, sit at 2e5 and are skipped by the `updTraffic` wrapper.
- **Inline comments in dense one-liners:** a `//` comment added mid-line comments out the REST of that line (v46 lost `const toastEl` this way;
  Node tests that stub `toast` did not notice). Put new comments on their own line, then run `new Function(src)` on each changed part.
- **v46 storage keys:** `irbid-drive-gearbox-v1` ('1' manual), `irbid-drive-weather-v1` ({mode,clock}), `irbid-drive-rep-v1` ({v,road,riv,log}).
  Wet grip (`WX.mu`) multiplies `sfc` in `updP` ONLY when `handlingMode`; auto-drive feeds `updP` through the wheel-input object (`apInput`), so
  with it off and the gearbox on Automatic `updP` is unchanged (`off_trace`).
- Test DOM stubs need `dataset`, `setAttribute`, `window` and `document.body.appendChild` (07f appends its panel).
- Chunked InstancedMeshes (`instO`, `instF`) are frustum-culled against their chunk sphere (`BS`, 520 m; `CS*.72+30` for small chunks). three
  r128 creates InstancedMesh with `frustumCulled=false`; the terrain pass turns culling off again for a chunk whose instances spread > 440 m.
- No licensed 3D car models: Sketchfab downloads need the owner's account and a licence/trademark decision, and GLBs conflict with
  the single-file rule. Photos in `manifest/photos.json` are reference-only (showing them would add a network host).
- The attribution line is long on phones and overlaps the GAS pad. Damage durability numbers are balance estimates.
- Not modelled: mass/CoM, torque curves, gears, suspension, a tyre model, OSM `surface` tags (`surfK()` is a heuristic).
- 1 km SRTM sampling misses narrow wadis. Rigid landmark groups may float or sink slightly at slope edges.
- OSM coverage is partial (empty blocks, rectangle footprints, generated heights).
  Since v40 the 26,432 real OSM buildings outside the BBBike rectangle are placed too (`03e`); generated fabric only fills where OSM has
  no building within ~50 m. Footprints are still rectangles (1–8 pieces per building) and most heights are estimates.
  Schools are badly under-mapped in OSM (146 in the play area vs 1,358 on the MoE list for the governorate).
