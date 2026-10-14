# PLAN.md — Refactor / rebuild of Irbid Drive

Companion to `CLAUDE.md`. **Do not start implementing until this plan is reviewed and approved.**

# Goal

Turn the current single-file, global-scope, one-liner codebase into a clean, modular, testable project **without changing
what the game does**. The shipped game stays one self-contained HTML file; gameplay, economy, physics feel, map geography,
save compatibility and visuals stay exactly as they are today. The current build (`dist/irbid-drive.html`, Artifact v19) is the
**reference implementation**: when in doubt, the old behaviour wins.

Success = a reviewer can open any module, understand it in minutes, change a constant in one place, and run automated checks
that prove the rebuilt game matches the reference.

# Current State

- 29 concatenated source parts → one 1,504-line / 215 K-char script in one global scope (~320 globals, order-dependent).
- Vanilla JS + Three.js r128 (CDN) + WebGL; no framework, no assets, no audio, no backend; `localStorage['irbid-save']` only.
- Content: 136 car models in 5 rarity tiers, 1,243 places, ~91 km of hand-authored roads, 80 traffic cars + 3 bots + police,
  races, duels, heist, wheel, upgrade shop, nav/search, drift zone, day/night, Forza-style fx.
- Tests: ~12 useful ad-hoc Node scripts (stubbed DOM) + Playwright screenshot scripts; no assertions framework/CI/git history.
- Known debt: see `CLAUDE.md → Known Issues`. Notable: global state, dense one-liners, magic numbers, per-frame HUD/minimap
  work, duplicated colour maps/landmark builders, non-deterministic `Math.random` in places.

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

None yet. (Any proposal goes here and needs the owner's explicit approval before it is implemented.)

---

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
