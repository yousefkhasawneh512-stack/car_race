# PLAN.md — Refactor / rebuild of Irbid Drive

Companion to `CLAUDE.md`. Last updated 2026-10-14 (published build **v38**).

> **Status:** the structural refactor below (Phases 1-7) has **not** been started and stays on hold until the owner approves it. Since this plan was written (v19) the owner instead asked for feature/accuracy work, which is logged in "Done since v19" and "Approved behaviour changes". The next planned work is the **Accuracy & Realism Roadmap**; the refactor phases are kept as the long-term option and must be re-baselined first (see the note under Phase 1).

# Goal

Turn the current single-file, global-scope, one-liner codebase into a clean, modular, testable project **without changing
what the game does**. The shipped game stays one self-contained HTML file; gameplay, economy, physics feel, map geography,
save compatibility and visuals stay exactly as they are today. The current build (`dist/irbid-drive.html`, Artifact **v38**; it was v19 when this plan was first written) is the
**reference implementation**: when in doubt, the old behaviour wins.

Success = a reviewer can open any module, understand it in minutes, change a constant in one place, and run automated checks
that prove the rebuilt game matches the reference.

# Current State (v38)

- ~45 concatenated source parts -> one ~2,870-line / 3.27 MB script in one global scope; most of the size is generated data
  (`03a` roads, `03b` buildings, `03c` places, `03d` terrain). Still order-dependent, still ~320+ globals.
- Vanilla JS + Three.js r128 (CDN) + WebGL; no framework, no assets, no audio, no backend. Storage: `localStorage['irbid-save']`
  (unchanged shape) + `irbid-wheel` (G29 setup) + `irbid-drive-realism-v1` (damage mode and per-car condition).
- **World = real data:** OSM street network (26k nodes / 4,608 km), OSM building footprints (19.6k), OSM places/POIs (~1,000 real +
  ~36 hand-built landmarks), SRTM terrain (1 km grid, bicubic). Invented shops and CSV nodes were removed (v35/v35b).
- Content: 217 `PORS` car models (the old "136" figure was wrong), 5 rarity tiers, races/duels/heist/wheel/shop/nav, drift zone, day/night,
  per-car visuals, racing-wheel + touch input, optional vehicle damage, breakable poles, estimated speed bumps.
- Physics (v37): braking 0.8-1.1 g by body kind, reverse 3.5 m/s2, slope gravity, surface traction (heuristic), cosmetic body pitch/roll.
- Tests: ~45 Node/Playwright scripts, no assertion framework/CI/git. Pre-existing known results: `h24` "bad 6", `h14` "bad 2" (removed
  invented shops), `h16` flaky sample. New: `phys_brake`, `terr_check`, `dyn_check`, `slope_stats`, `drive_pw`. (`realism_test`/`realism_pw` were cited for v38 but never existed on disk; still to be written.)
- Known debt: see `CLAUDE.md -> Known Issues` and `AUDIT_REPORT.md`.

# Done since v19 (owner-requested; each has a note in CLAUDE.md)

| Ver | What |
|---|---|
| v22 | per-car visual engine (`07a4_carvis`), exhaust/drift stream |
| v24-v27 | 1080p display lock; place patch; shop access and touch driving pads |
| v28 | city realism pass (facade shader, infra, vegetation) |
| v29 | Logitech G29 wheel + force feedback (untested on hardware) |
| v30-v31 | shop placement by type; CSV place nodes (later removed) |
| v33 | real OSM street network replaces the hand-authored grid |
| v34 | real OSM building footprints |
| v35/35b | real OSM shops/places; invented venues removed |
| v36 | published OSM-based build |
| v37 | real SRTM terrain (flat-frame authoring + one terrain pass `12c_terrain.js`); physics fixes from the accuracy audit; `AUDIT_REPORT.md` |
| v38 | vehicle damage (Off/Cosmetic/Full), breakable poles/streetlights, estimated speed bumps (supplied by owner, reviewed and fixed: bump double terrain lift, pole height on hills, Lambert warnings, per-frame allocation) |

# Accuracy & Realism Roadmap (next work, priority order; source: `AUDIT_REPORT.md`)

Each item needs evidence before a change, a test, and a CLAUDE.md note. Unverified facts stay marked unverified.

1. **Carry real OSM tags into the network data** (`osm/net.py`, `gen_world.py`): `surface`, `lanes`, `maxspeed`, `width`, `oneway`,
   `bridge`/`tunnel`/`layer`. Then drive widths, limits and `surfK()` traction from evidence instead of class defaults.
   (OSM today: `width` 0 / `lanes` 12 / `maxspeed` 18 of 17,244 ways, so expect small gains; mark the rest unverified.)
2. **Speed bumps decision (owner):** the 50-90 bumps are *estimated*, not surveyed. Options: (a) keep, (b) gate behind the damage/realism
   setting, (c) remove until real `traffic_calming` data exists. Needs an owner answer.
3. **Denser terrain** (250 m grid or a licensed DEM tile processed offline), to resolve wadis and cuts; re-run `terr_check`/`slope_stats`.
4. **Bridges/tunnels at real heights** (deck profile + ramps) instead of ground level.
5. **Done in v40:** **Landmark placement:** put landmarks at their OSM seed (Dar As-Saraya is 76 m off, Nabulsi House 36 m, Clock Square 35 m, Nissan 47 m);
   keep the road-snapped point only as the nav anchor. Verify the landmark checklist against imagery before changing any facade.
6. **Per-car physics from manufacturer data only** (mass, power, gearing); then a simple gear/RPM and lateral-grip-by-surface model.
   Lateral grip off-road changes drift scoring, so it needs owner approval (economy constraint).
7. **Mobile:** shorten the attribution line on phones (it overlaps the GAS pad); test on a real iPhone/Android; measure frame rate on devices.
8. **Real signals/signage:** replace the 167 inferred traffic signals only where OSM or another source supports it.
9. **Re-baseline before any refactor:** re-record golden data (places, graph hash, economy, physics traces including terrain and damage Off)
   from the v38 build.

# Target Architecture

Keep the technology (vanilla JS, Three.js r128 global, no framework). Change the *shape*:

```
src/
  main.js                    bootstrap: build world → create game → start loop
  config/                    ALL tunables: physics.js, economy.js (prices, fines, wheel odds), world.js (bounds, time scale),
                             traffic.js (spawn tables), fx.js, controls.js
  data/                      pure data (no code): roads.js, circuits.js, cars.js (PORS), rarity.js, places/*.js (pack, landmarks,
                             generator inputs), palettes.js
  core/                      rng.js (seeded PR, injectable Math.random), math.js, loop.js (fixed-step update + render),
                             events.js (tiny pub/sub), state.js (single state object + selectors), save.js (versioned storage)
  world/                     graph.js (roads, hash, route), terrain.js, roads-mesh.js, buildings.js, landmarks/*.js,
                             places.js (registry), traffic-lights.js, colliders.js, daynight.js
  entities/                  car-models.js, player.js, traffic.js, bots.js, cops.js, agent-path.js
  systems/                   input.js, physics.js (updP), drift.js, laws.js, race.js, heist.js, economy.js (shop+wheel), nav.js
  render/                    renderer.js, camera.js, fx.js (grade/smoke/glare/blur), minimap.js, labels.js
  ui/                        hud.js, shop.js, wheel.js, nav-panel.js, toast.js  (+ styles.css)
  index.html                 shell with the overlay DOM
tests/
  golden/                    recorded reference data from the current build (places, road graph hash, economy table, traces)
  unit/ integration/ visual/ headless harness (one shared DOM/three stub) + Playwright
tools/
  build.mjs                  esbuild (IIFE, `THREE` as external global) → dist/irbid-drive.html (single file, inline JS/CSS)
  publish-notes.md
```

Principles:
1. **ES modules in source, one classic script out.** esbuild bundles to a single inline IIFE; Three.js stays an external
   `THREE` global from the same CDN (r128) — no engine upgrade.
2. **One state object** (`state.js`) with named slices (player, drift, economy, race, heist, nav, ui, world clock); systems read/write
   through it; save/load serialises a versioned subset and still reads the legacy `irbid-save` shape.
3. **Config separated from logic**: every magic number moves to `config/*` with its current value and a name.
4. **Systems** have `update(dt, state)`; render code never mutates game state; UI listens to events/state instead of being
   called from deep inside gameplay.
5. **Determinism hooks**: injectable RNG (seeded in tests, `Math.random` in production), so tests are repeatable while
   production randomness is unchanged.
6. **Order independence**: dependencies are explicit imports; the only ordered step is the documented world-build sequence
   (`runLandmarks → runPack → runGen → houses`), kept in one function with a comment explaining why.
7. Plain JS + JSDoc types (no TypeScript migration unless the owner asks).

# Approved behaviour changes

Approved by the owner (explicit requests) and now part of the reference behaviour:
- v33 real OSM street network replaces the hand-authored map (place coordinates changed; `h21` identity is checked against v33+).
- v34/v35 real OSM buildings and places; invented shops, venues and CSV nodes removed.
- v37 real terrain (heights, slope gravity) and physics corrections (braking 0.8-1.1 g, reverse 3.5 m/s2, surface traction heuristic,
  cosmetic body motion), requested through the realism/accuracy audit. Economy, drift scoring, save format and HUD strings unchanged.
- v38 optional vehicle damage (default Off), breakable poles, estimated speed bumps.
- v39 (owner request 2026-10-16, "realistic cars, damage physics, tyre wear"): localized damage by contact point / body zone with mesh
  dents, per-car durability profiles, internal components (engine, cooling, transmission, driveline, steering, brakes, per-corner
  suspension, alignment), per-wheel tyre load/slip/heat/wear, drivetrain-dependent burnouts, energy-based breakable/bendable/movable
  roadside objects, diagnostics panel. **Damage Off stays byte-identical to v37/v38 physics** (`tests/off_trace.js`); burnouts, pull,
  lateral-grip loss and object give-way only exist in Cosmetic/Full. Repairs stay free (economy unchanged).
- v40 (owner request 2026-10-17, "Phase 1: fix the real map and all place data"; this request also approves changing landmark names
  shown in "Passing:", an exception to constraint 7): landmark names corrected to their OSM names (Clock Tower Square, Wasfi Al-Tal
  Square, Emaar Irbid Park, MK Super Market, Sameh Mall, Al-Hassan Stadium, Al-Hassan Sports City; old names stay searchable); Dar
  As-Saraya, Beit Arar and Beit Nabulsi built ON their real OSM footprints; the clock tower in the real square; landmark markers at their
  OSM points; the 42 m "landmark already there" rule replaced by OSM-id identity (POID_LM); neighbourhoods/villages, bus stations,
  pitches, playgrounds and name-only OSM points added (1,473 -> 1,659 places); 26,432 real OSM buildings outside the old extract
  replace generated filler (JUST, Jadara, INU, villages); chunked InstancedMeshes are frustum-culled (three r128 default was off).
  Physics with damage Off is unchanged (`off_trace` collider-free hash = v38); the with-world trace changed because buildings moved.
- v41 (owner request 2026-10-17, "Phase 2: realistic cars, buildings, roads, physics and damage"): a **Realistic handling** mode (key H:
  engine torque, gears, traction by drivetrain, drag, engine braking, spring-damper body, suspension-absorbed bumps). It is opt-in: Arcade stays
  the default and identical to v38, so drift scoring and the existing feel are unchanged unless the player switches. OSM traffic calming
  placed as real bumps. HUD gains gear/rpm in Realistic only.
- v42 (owner request 2026-10-17, "complete master repair and realism upgrade", Phase 10): **repairs cost JD** (an economy change to
  constraint 3). The Apex Drift Customs shop gains a repair bay that prices and repairs each part separately (body zones, lights, glass,
  engine, cooling, transmission, driveline, steering, brakes, suspension per corner, tyres per wheel) and charges the JD balance (adds to
  `spent`). The free "Repair all / Replace tyres" buttons in diagnostics are removed; the Repair button routes to the garage. Prices are
  gameplay estimates (base + per-% loss, × rarity tier 1/1.25/1.6/2.1/2.8). All other prices, odds and fines are unchanged. The G29 setup
  gains released/pressed pedal calibration, combined pedals, clutch display, pedal dead zone and live readings (input handling only).

Still needs approval before implementing: a fixed-timestep physics loop, lateral grip by surface (affects drift scoring), removing or
gating the estimated speed bumps, any pause/start/audio features, and the refactor phases below.

---
- v44 (owner request 2026-10-19, "MASTER IMPLEMENTATION TASK": FH4-inspired visible damage, destruction by material, signals, speed bumps,
  real places): visible bumpers/mirrors/lids/doors/glass cracks/rims with detachment (player car), material-based object damage (trees, garden
  walls, shelter glass, guardrails, building surface marks), physical speed bumps with a per-axle quarter-car response (all modes, as before:
  bumps were always on), rebuilt signals (3-aspect heads, 60 s cycle, 17 junctions instead of 177 nodes: 3 OSM + 14 estimated), the AI
  stop-line distance fix, flat-tyre rolling resistance in Full, +74 OSM places. Damage Off physics stays identical to v38 (`off_trace`).
- v45 (owner request 2026-10-19: vehicle-specific drift physics, engine sounds for every car, 60 fps at 1080p on an RTX 3050 laptop, then the
  "V44 ULTIMATE FULL-PROJECT REPAIR" task; owner chose "Realistic mode only" for the drift physics): Realistic handling uses the two-axle tyre
  model (`ptDyn`) and sub-steps long frames; Arcade unchanged (`off_trace`). Synthesised engine/world audio (new, on by default after the first
  gesture; L mutes). Esc opens a pause menu (Esc used to do nothing outside menus). Graphics quality presets (Auto = previous behaviour). HUD now
  drawn above the canvas (it was hidden since v24: a bug fix, but players will see the HUD again). Sign backs are plain metal.

# Phase 1 – Baseline and Documentation

**Objective:** make the reference game reproducible and capture its behaviour as machine-checkable golden data *before* any
code moves.

**Tasks**
1. Initialise git; commit the current sources, `dist/irbid-drive.html`, tests, CLAUDE.md, PLAN.md as the baseline tag `ref-v19`.
2. Pin tooling: Node ≥ 18, `three@0.128.0` in package.json, `npm test` runs the stable scripts; make every test take the build
   path and exit non-zero on failure; fix hard-coded paths in Playwright scripts (use relative paths / env vars).
3. Create one shared headless harness (`tests/harness.js`) replacing the copy-pasted stub header in each `h*.js`.
4. Record **golden data** from the reference build: (a) all `PLACES` [name,x,z,kind] minus the random barber/pet/house entries;
   (b) a hash of road graph (`EDGES`, `NODES`), `CIRC`, `LIT`, `DZONES`; (c) economy tables (prices ×5 levels, wheel odds,
   fines, rarity multipliers, `PORS` 136 rows + rarity per model); (d) traffic-zone spawn tables; (e) a deterministic physics
   trace (scripted inputs, fixed dt, seeded RNG) of position/velocity/drift points over ~30 s for 4 scenarios (straight,
   slalom drift, handbrake, collision); (f) nav route results (distance/steps) for ~20 origin→destination pairs.
5. Capture reference screenshots (day/dusk/night; street, drift with smoke, HUD, shop, wheel, nav, minimap) using forced state.
6. Write `docs/behaviour.md`: one page of observed behaviour per feature, citing the golden files.
7. Triage pre-existing test oddities (`h14` JUST route "bad 1", flaky `h16` sample) and record them as known baselines.

**Re-baseline note (2026-10-14):** the numbers above (136 cars, 1,243 places, hand-authored roads) are from v19. Capture golden data from the v38 build instead (217 cars, ~1,038 places, OSM network/buildings, terrain, physics traces on flat and sloped ground, damage Off).

**Files likely to change:** package.json, tests/*, new `tests/golden/*`, docs/, `.gitignore`. **No `src/` logic changes.**

**Risks:** hidden non-determinism (Math.random) makes traces flaky → seed/stub RNG in the harness; golden data captured from the
wrong build → capture from `dist/irbid-drive.html` and assert it is byte-identical to the published artifact.

**Verification:** run the golden capture twice → identical output; `npm test` green on the untouched reference.

**Completion criteria:** git baseline tagged; `npm test` passes; golden files + screenshots + behaviour doc committed;
owner has reviewed the behaviour doc.

---

# Phase 2 – Project Structure

**Objective:** introduce the new folder layout and an ES-module build while the game still behaves identically.

**Tasks**
1. Add `tools/build.mjs` (esbuild, IIFE, `THREE` external) producing the single-file HTML with the same head/DOM/CSS.
2. Move CSS and overlay DOM into `src/index.html` + `src/ui/styles.css` verbatim.
3. Mechanically convert each existing part into an ES module **without altering logic**: wrap in a module, export what other
   parts use, import what it needs (generated from the current `build.py` order and a symbol-usage scan). Keep names for now.
4. Keep the legacy `build.py` output as the comparison oracle until Phase 6.
5. Keep the SEO-copy generator as an explicit `tools/build-site.mjs` (replaces the fragile regex script).

**Files likely to change:** everything moves; `build.py` → `tools/build.mjs`; new `package.json` scripts.

**Risks:** hidden global coupling (implicit globals, TDZ ordering such as `ui`) breaks at import time; module-scope `let` semantics
differ from script-scope; bundle size/perf differences.

**Verification:** `npm run build`; golden place/graph/economy tests green; diff of runtime behaviour via the Phase-1 traces;
screenshots within tolerance; bundle opens offline (except CDN) and plays.

**Completion criteria:** game runs from the modular source; all Phase-1 checks green; no logic edits in the diff (review by
`git diff -M` showing moves + import/export lines only).

---

# Phase 3 – Core Game Engine / Logic

**Objective:** separate state, update logic, rendering, input and config.

**Tasks**
1. `core/state.js`: one state object replacing the scattered globals (`P`, `drift`, `tune`, `fines`, `spent`, `owned`, `cur`, `race`,
   `heist`, `NAV`, `ui`, `hour`, `clock`, `camMode`); provide accessors; migrate usages gradually (adapter getters first).
2. `core/save.js`: versioned save with migration from legacy `{fines,spent,owned,cur,dt,tune}`; save only on a debounced schedule
   or key events (behaviour-neutral: same data, same triggers where user-visible).
3. `config/*`: extract magic numbers with identical values; add a test that imports the config and compares to golden values.
4. `core/loop.js`: keep variable dt (same clamp 4–50 ms) first; evaluate a fixed-step accumulator **only as an approved change**.
5. `systems/input.js` (keys → intent object), `systems/physics.js` (`updP` split into drive, drift, collision, terrain, camera
   inputs), `systems/laws.js`, with the same maths and call order.
6. `render/` split from `12_hud_loop.js`: renderer/camera/day-night/minimap/HUD separated from the loop; HUD updates only when text
   changes (behaviour-neutral optimisation).
7. `core/rng.js`: injectable RNG; production passes `Math.random`; seeded `PR` preserved with the same seed and call order.

**Files likely to change:** `07*`, `10_laws_player`, `12_hud_loop`, `02_setup`, new `core/*`, `config/*`, `systems/*`, `render/*`.

**Risks:** subtle physics drift (order of operations, float differences); changing call order of seeded PRNG moves places; HUD
text diffs; save-compat regression.

**Verification:** deterministic physics traces equal to golden within 1e-9 (or exactly); economy/price/rarity tests; save-load
round-trip with a fixture of a real legacy save; places identity test; manual 10-minute drive checklist.

**Completion criteria:** no cross-module mutation of foreign state except through the state module; config holds every tunable;
all golden tests green; `P.rm` multiplier, upgrade doubling and drift formula untouched in the diff.

---

# Phase 4 – Game Mechanics Migration

**Objective:** move each gameplay mechanic into its own system module, one at a time, proving equivalence after each move.

**Order (lowest risk first):** (1) economy: shop + wheel + rarity; (2) laws/fines; (3) drift scoring; (4) races/duels;
(5) heist + cops; (6) traffic/bot agents + path following; (7) nav/search; (8) world builders (roads, buildings, landmarks, packs,
generator, fabric); (9) fx.

**Tasks (per mechanic):** extract to `systems/*` or `world/*` with a small public API; replace global reads with state/config;
add unit tests from the golden data; run the whole suite; commit separately.

**Files likely to change:** `08*`, `09_ai`, `10_laws_player`, `11_race`, `11b_nav`, `06*`, `07a2_traffic`, `12a_fx`.

**Risks:** world builders (`06*`) are order- and RNG-sensitive: any change can move a place; agent AI is timing-sensitive;
nav label recycling and DOM leaks; fx stacking/perf.

**Verification:** per-mechanic golden tests (price table, fines, drift trace, race checkpoints & finish ranking with seeded
bots, heist timeline, traffic tier statistics `h13`, nav routes/search `h14/h18/h24`, fx thresholds `h25`); full place-identity
check after each `06*` move; screenshot diffs.

**Completion criteria:** every mechanic lives in its own module with tests; legacy parts no longer used by the bundle.

---

# Phase 5 – UI and Assets

**Objective:** clean up HUD, menus, minimap, nav panel, shop/wheel UI and procedural assets while keeping what the player sees.

**Tasks**
1. UI modules (`ui/hud.js`, `shop.js`, `wheel.js`, `nav-panel.js`, `toast.js`) with event-driven updates; remove per-frame
   `innerHTML` rebuilds (update on change).
2. Minimap: cache static layers (roads, POIs) into an offscreen canvas and redraw only deltas (same visuals), removing the
   per-frame iteration over all 1,243 places.
3. Centralise palettes (road colours for 3D/minimap/POI kinds) into `data/palettes.js`; de-duplicate landmark builders
   (benches, lamps, logos) into shared helpers with identical output.
4. Asset pipeline for procedural textures (facades, labels): cached factory with explicit disposal.
5. Document controls and HUD strings; keep text identical.
6. (Optional, requires approval) pause/start screen, touch controls, audio — **not** part of the parity rebuild.

**Files likely to change:** `01_head.html`, `12_hud_loop`, `11b_nav`, `06g*`, `06f_pois`, `06a_fabric`, new `ui/*`, `render/minimap.js`.

**Risks:** visual regressions (fonts/spacing/z-index), z-order of overlays vs `fxblur`, memory leaks from textures/labels.

**Verification:** Playwright screenshots vs Phase-1 references (tolerance diff); DOM text snapshot of HUD for scripted states; memory
check over a long scripted session (texture/DOM node counts stable).

**Completion criteria:** UI parity confirmed on all reference screenshots; per-frame DOM writes only on change; minimap cost
reduced with identical pixels (within tolerance).

---

# Phase 6 – Testing and Verification

**Objective:** prove the rebuilt game matches the reference and lock that in.

**Tasks**
1. Convert ad-hoc scripts into a real suite (Node test runner or Vitest): unit (math, economy, rarity, fines), integration
   (headless world build, races, duel, heist, nav), snapshot (places, graph, tables), visual (Playwright).
2. Side-by-side parity runner: load the reference build and the rebuilt build in the same harness, drive both with identical
   scripted input and seeded RNG, assert equal state traces and equal place registries.
3. Performance budget: load time, frame time (headless proxy), draw calls, scene nodes ≤ reference + 5 %.
4. Browser matrix smoke test (Chromium, Firefox, WebKit via Playwright) at desktop and phone viewport.
5. Save-compat tests with real legacy save files (several tune/owned combinations).
6. Manual acceptance checklist for the owner (drive, drift, shop upgrade doubling, wheel, race, duel, heist, nav, map, day/night).

**Files likely to change:** `tests/*`, CI config, `docs/`.

**Risks:** flaky non-deterministic checks; visual tests brittle across GPUs (use SwiftShader/tolerances); false confidence if the
parity runner shares code with the new build.

**Verification:** parity runner green; full suite green twice in a row; owner signs off the manual checklist.

**Completion criteria:** all automated suites green in CI; zero unexplained diffs vs reference; sign-off recorded.

---

# Phase 7 – Cleanup

**Objective:** remove everything obsolete and leave a tidy, documented repo.

**Tasks**
1. Delete the legacy `build.py`, concatenated parts, `tests/legacy/*`, the old `c.js` prototype, dead helpers and debug code.
2. Remove unused data/duplicates found by a symbol-usage scan; keep a changelog of removals.
3. Run a formatter/linter (Prettier + ESLint) with a minimal ruleset; fix only mechanical issues.
4. Update `CLAUDE.md` (new structure, commands, constraints) and write README + `docs/architecture.md`.
5. Publish: build → regenerate SEO copy → publish the single file to the existing Artifact URL; tag release.

**Files likely to change:** repo-wide deletions, docs, config.

**Risks:** deleting something still referenced indirectly (string-based lookups such as POI kinds, car names); formatter noise
hiding real changes.

**Verification:** full suite + parity runner after every deletion batch; bundle size and scene-node counts compared to Phase 6.

**Completion criteria:** no dead files; lints clean; docs current; final parity run green; release published and tagged.

---

# Cross-cutting rules

- One logical change per commit; behaviour-neutral refactors never mixed with behaviour changes.
- After every step: build, run golden + unit tests, compare place registry, take screenshots if rendering was touched.
- Never reorder or add seeded-RNG calls ahead of world generation; never move a place, street, intersection, traffic pool or landmark.
- Never upgrade Three.js, add runtime dependencies, or add network calls without approval.
- Record every discovered oddity (e.g. fines increasing the balance) in `CLAUDE.md` and ask the owner before "fixing" it.
