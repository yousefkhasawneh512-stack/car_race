# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Irbid Drive** is a single-player open-world 3D driving sandbox on a real-data model of Irbid, Jordan: OpenStreetMap streets,
buildings and places, plus SRTM terrain. Players free-roam in traffic, earn drift points (spent on upgrades) and JD (spent on
a car-unlock wheel), and play races, duels, a bank heist, a landmark tour and navigation. There is no win/lose state.
**The current game is the reference implementation:** don't redesign gameplay.

Companion files (read before non-trivial work):
- `PLAN.md`: approved behaviour changes, the realism roadmap, the on-hold refactor plan, expected pre-existing test results.
- `CHANGELOG.md`: per-version notes v22–v38 (history, honest limits, tests added per feature).
- `AUDIT_REPORT.md`: v37 realism/accuracy audit (evidence, sources, remaining limits).
- `REALISM_FEATURES.md`: player-facing description of the v38 damage / speed-bump features.

## Commands

```bash
python3 build.py                      # concatenate src/parts -> dist/irbid-drive.html (prints chars/lines)
npm install                           # only devDependency: three@0.128.0, needed by the Node tests
node tests/<name>.js dist/irbid-drive.html          # run one headless check (stubbed DOM + real three r128)
python3 tests/<name>.py dist/irbid-drive.html       # Playwright/Chromium check (needs `pip install playwright`)
```

- This Windows machine has no `python3`/`node` on PATH. Python is at
  `%LOCALAPPDATA%\Programs\Python\Python315\python.exe`. Node must be installed before any `tests/*.js` can run.
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
  Also run `realism_test` (29 PASS/FAIL checks for v38 damage/poles/bumps; exits 1 on failure).
  Expected results, identical on v37 and v38 (measured 2026-10-14): `h24` "bad 6", `vg` "bad 9" (searches for removed invented
  shops), `h21` places 1038, `tour` 0 off-road, `dyn_check` bad 0, `h16` fines 0. `boot`/`h2`/`h13`/race/traffic output varies
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
  `bld/conv.py` → `03b_bld_data.js`, `bld/pois.py` → `03c_poi_data.js`, `terrain/gen_terrain.py` → `03d_terrain_data.js`).
  Never hand-edit those four parts; change the pipeline and regenerate.

## Architecture

**One script, one global scope.** `build.py` writes `01_head.html` (all CSS + overlay DOM + the three.js CDN `<script>`,
then opens `<script>`), followed by every part in its `order` list, into one HTML file. There are no modules or imports. Every
top-level `const`/`let`/`function` is a global visible to later parts, so **the `order` list in `build.py` is the dependency
graph**. Grep for a symbol rather than trusting filenames (e.g. save/load/tuning live in `07b_tune.js`, and `07p_player.js` is one line).
Current order and roles:

| Stage | Parts | Role |
|---|---|---|
| Engine | `01b_post_lib`, `02_setup`, `02b_sky`, `02c_facade` | three r128 post-processing libs, renderer (fixed 1920x1080 buffer, `DISP`), sky/GFX switch, facade shader |
| Data (generated) | `03a_net_data`, `03b_bld_data`, `03c_poi_data`, `03d_terrain_data` | `NETD/NETE` roads, `BLDD` footprints + `RL()`, `POID` places + `RLP()`, `TERR` heights |
| World math | `03_world_data`, `04_graph`, `04b_streets`, `04c_budget` | `LL2XZ` projection, `TH()` terrain; graph `EDGES/NODES/HASH`, `roadAt`/`roadNear`/`route`; legacy street-role mapping; detail budget / zones |
| World build (flat frame) | `05a_roads`, `05b_decor`, `06a`…`06l` | road ribbons, colliders `COL`/`addCol`/`colB`, buildings (`placeReal`), landmarks, campuses, infra, vegetation, `PLACES` registry |
| Entities | `07a0`, `07a_cars`, `07a2_traffic`, `07a4_carvis`, `07a3_showcars`, `07p_player`, `07b_tune`, `07c_realism` | `PORS` (217 models), rarity, player `P`, save/tune/`applyTune`, damage system |
| Rules / UI | `08a_wheel`, `08b_heist`, `08c_shop`, `09_ai`, `10_laws_player`, `10b_ios_touch`, `10c_wheel`, `11_race`, `11b_nav` | economy, heist/cops, traffic/bot agents, **`updP` physics** + fines + keyboard, touch pads, G29 wheel, races, search/nav |
| Frame | `12a_fx`, `12b_post`, `12c_terrain`, `12_hud_loop` | effects, HDR bloom/grade chain, the terrain pass, minimap/HUD/camera and the **main loop** |

Order facts that have broken things before: `06h2_final_patch` runs before `06h_gen`, and `06d_fabric_driver` runs after it.
`12a_fx` must precede `12_hud_loop`. `08a_wheel` declares `let ui`, which earlier-defined handlers read at runtime. `07c_realism`
wraps `setPlayerCar` (a function declaration in `07b_tune`), so it must load after it.

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
`updP(dt,frozen)` → `updHeist` → `updRace` → `poiNear` → `navTick` → `navLabels` → `showCarsTick` → `fxTick` → `damageTick` →
camera → HUD `innerHTML` → `drawMap` → `gfxRender`. Communication is through shared globals (`P`, `drift`, `tune`, `fines`,
`spent`, `race`, `heist`, `NAV`, `traffic`, `bots`, `PLACES`, `ui`, `keys`, `clock`). There is no event bus or store.

**Input:** keyboard (`keys`), touch pads (`MobilePCInputController`, touch devices only) and the G29 wheel (`WH.poll`) are ORed
inside `updP`. The touch pads and the shop overlay use 1920x1080 canvas coordinates. Wheel button bindings dispatch synthetic
`keydown`/`keyup` events, so each action keeps one code path.

**Places:** `PLACES` holds ~1,000 real OSM POIs (`06l_real_pois`, `p.real=true`) plus ~36 hand-built landmarks seeded at real
OSM points via `RL()`/`RLP()` and the `'@'` pseudo-street in `siteBeside`. `REALP=true` (`06a_fabric.js`) disables every
invented shop/venue builder. The early-return guards keep the `PR()` call order intact, so don't delete them.

**Storage:** `irbid-save` (`{fines,spent,owned,cur,dt,tune}`, `07b_tune.js`) is the only one that matters for compatibility.
`irbid-wheel` (G29 setup) and `irbid-drive-realism-v1` (damage mode + per-car condition) are separate keys on purpose.

**Damage (v38, `07c_realism.js`):** mode Off/Cosmetic/Full (key `I`, `#damageBtn`), **default Off = physics identical to
v37**. `registerPlayerImpact` is called from `colB` (when `o===P`) and from the traffic/bot collision code in `updP`.
`damageEffects()` returns a shared multiplier object that `updP` reads. Breakable poles/street lights are colliders with
`breakable/breakAt/visualKey`, removed with `removeCol`; the instance is hidden via `DESTRUCTIBLE_INSTANCES`, filled by
`instO` item slot `p[8]`. Speed bumps (always on, even with damage Off) are **estimated** positions near OSM
schools/clinics/parks, not survey data. Whether to keep them is an open owner decision (`PLAN.md`).

## Constraints (the product; get owner approval in `PLAN.md` → "Approved behaviour changes" before altering)

1. **Geography is real data.** Don't invent, move or hand-edit streets, buildings or POIs. Regenerate from `osm/`. Named
   landmarks must stay on a real road of their role. Mark anything not backed by evidence as estimated/unverified, in code and in the UI.
2. **Seeded generators stay deterministic.** `PR` (seed `20250611`, `06g_pack.js`) and the call order of
   `runPack`/`runLandmarks`/`runGen` decide procedural coordinates. Never add `PR()` calls before them or reorder them.
   New visual layers use `Math.random`.
3. **Economy unchanged.** Upgrade price `base·2^level` (Speed 1,500 / Accel 1,200 / Handling 800 / Extra Drift 3,000; 5 levels).
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

- **v38 has no automated test** and was merged without running any (no Node here). Write `tests/realism_test.js` next.
  Test DOM stubs will need `dataset`, `setAttribute` and `window`.
- The attribution line is long on phones and overlaps the GAS pad. Damage durability numbers are balance estimates.
- Not modelled: mass/CoM, torque curves, gears, suspension, a tyre model, OSM `surface` tags (`surfK()` is a heuristic).
- 1 km SRTM sampling misses narrow wadis. Rigid landmark groups may float or sink slightly at slope edges.
- OSM coverage is partial (empty blocks, rectangle footprints, generated heights). Outside the building extract
  (JUST, Jadara, INU) buildings are still procedural.
