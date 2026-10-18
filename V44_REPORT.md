# Irbid Drive v44: implementation report (2026-10-19)

Brief: the owner's "MASTER IMPLEMENTATION TASK" (FH4-inspired visible damage, destruction by material, real Irbid data, signals, speed bumps,
7× detail, 200 sources). This is an **original procedural implementation** for the existing three.js r128 engine. No Forza code or assets.

## 1. Project and checkpoint

- Active project: `C:\Users\youse\OneDrive\Documents\car_race` (git `main`, GitHub `yousefkhasawneh512-stack/car_race`). It was the newest copy
  (v43b). `Downloads\irbid-drive-v42-complete\irbid-drive-v42` is an older v42 export and was not used.
- Backup before any change: git tag **`backup/v43b`** (pushed). Work was committed in 4 verified parts plus documentation.

**Files changed:**
- **New:**
  - `src/parts/07h_dmgparts.js`;
  - tests `damage_v44.js`, `signals_test.js`, `damage_v44_pw.py`, `world_v44_pw.py` and `perf_pw.py`;
  - `tools/gen_signal_manifest.js`;
  - `manifest/signals.json` and `manifest/speed_bumps.json`;
  - `docs/REALISM_RESEARCH.md` and `docs/screenshots/v44/*.png`.
- **Edited, game code:** `05b_decor.js` (signals), `06a_fabric.js`, `06i_infra.js` and `06j_veg.js` (instance keys), `07c_realism.js` (records, bumps, hooks), `07e_objects.js` (materials), `08d_repair.js`, `09_ai.js`, `10_laws_player.js`, `12_hud_loop.js` and `build.py`.
- **Edited, place pipeline:** `osm/overpass/fetch.py`, `build.py` and `corrections.py`, plus the regenerated `03c_poi_data.js` and manifests.
- **Edited, tests:** `damage_test`, `damage_pw`, `handling_test`, `realism_test` and `place_audit`.
- **Edited, docs:** CHANGELOG, CLAUDE.md, README, PLAN.md and DATA_SOURCES_AND_LICENCES.md.

## 2. Visible vehicle damage (working; evidence: screenshots 0–7 in `docs/screenshots/v44/`)

All 217 car models are built by one generator (`mkPorsche`), so **100 % of models** get every feature below on the player's car. Traffic cars do
not show damage (unchanged; listed as a limitation).

| Feature | What you see | Evidence |
|---|---|---|
| Body dents | mesh deformation at the contact point; poles/trees make narrower, deeper dents than walls | `damage_v44` "pole dent…", screenshot 1 |
| Front / rear bumper | scuff → cracked/bent → hanging on one side → torn off; the torn part lies on the road (max 8, 90 s) | screenshots 1, 3 |
| Bonnet / boot lid | buckled crease, rear edge lifted (vertex deformation, not a decal) | test "bonnet panel vertices are actually displaced" (max lift 0.125 m) |
| Doors | door skin bowed inward around the hit, slightly ajar | screenshot 4 |
| Mirrors | fold, then snap off (side hits, scrapes) | test "left side…" (ml 1.00) |
| Windscreen | laminated: spider-web crack grows from the stored impact point; repeated hits grow the same crack | screenshots 1, 2 |
| Side / rear windows | tempered: crack, then the whole pane crazes | screenshot 4 |
| Lights | dark housing + cracked lens | screenshot 1 |
| Tyres | flat: squashed + bulging sidewall; shredded when the carcass fails | screenshot 6 |
| Rims | bent: oval + wobble when driving; vibration in Full | test "FL rim" |
| Paint | textured scratch strips on the damaged zones | screenshots 1, 4 |
| Engine | smoke / overheating (existing v39 system) | `damage_test` |

**Effects on driving (Full mode):**
- engine and radiator damage, with overheating and limp mode;
- brakes, steering, suspension per corner and alignment pull (all existing);
- new: a flat tyre adds rolling resistance (110 → 74 km/h after 6 s of full throttle in the test);
- new: bent rims add pull, vibration and grip loss.

**Repairs:** the repair bay lists 8 more parts and 4 rims (the full inspection now has 42 rows). Repair restores meshes, materials, glass, tyres, records and mechanics (test "repair all…", screenshot 7).

**Persistence:** damage survives car switches and page reloads (tests).

**Physics:** Damage Off physics is still byte-identical to v38 (`off_trace` hash b4f220ee…).

## 3. Environment destruction by material

| Object | Material behaviour | Threshold (1,500 kg car, all **estimates**) |
|---|---|---|
| Street lights, utility poles, signs (v39) | bend, then snap and fall | energy based (unchanged) |
| Trees (~18,100–18,500 keyed; procedural tree count varies per load) | wood: canopy shakes, leaves and bark fly; slim trunks are felled (trunk + canopy fall). The snap speed scales with trunk diameter^1.5 (break energy ∝ d³) | 97 km/h for the slimmest (0.28 m) trunk; the thick ones are effectively rigid (up to ~760 km/h) |
| Garden walls (masonry) | crack mark, then collapse into rubble; damage accumulates over hits | 36–47 km/h |
| Bus shelters | tempered glass panel shatters; the steel frame stays | > 14 km/h |
| Guardrails | W-beam deflects (up to 0.45 m) and absorbs energy (car crush × 0.8) | always |
| Buildings / walls | rigid; local scrape / crack mark + dust; never demolished | > 22 km/h |
| Dumpsters | shoved / tipped (v39) | momentum |

Evidence:
- **Tests:** `damage_v44` "thick tree…", "slim tree… accumulated damage fells it", "garden wall…", "bus shelter…", "guardrail…", "building wall…".
- **Screenshots:** 12 (tree), 13 (wall), 14 (shelter).

High-speed hit on a rigid wall: at 108 km/h the front-left panels drop to 13 %, and the engine and cooling to 0 % (test).

## 4. Speed bumps and traffic signals

**Speed bumps (fixed).** Before v44, each bump was 6–12 flat boxes and the car only got a small vertical kick. Now:
- **Geometry:** one merged, terrain-draped mesh with a cos² profile, and `bumpAt()` gives the wheels the identical surface (max offset 1.4 cm).
- **Suspension:** a per-axle quarter-car uses each car's suspension frequency, damping, wheelbase and suspension travel.
- **Response:** body heave and pitch, wheel travel in the arches and a short chassis vibration. Bottoming out damages that axle in Cosmetic/Full.

Measured at 15 km/h:
- heave 2.9–5.1 cm and no damage on all three cars;
- jolt (wheel compression speed) 0.05–1.4 m/s;
- no hop.

At 80 km/h on the 0.9 m bump:
- jolt 5.2–5.6 m/s;
- suspension damage of 0.9–5 % (race car worst, SUV least);
- no launch (hop 0).

The 3.7 m OSM hump is gentler than the 0.9 m bump at every speed.

Locations: 2 bumps are mapped in OSM (fresh Overpass query, 2026-10-18), and the other 88 are **estimated** near schools, clinics and parks (unchanged).

**Traffic signals.**
- **Bug fixed in the AI:** cars could believe they were already in the junction while waiting at a red stop line, and drove through.
- **Heads:** three-lamp heads (red on top), facing their approach just past the stop line.
- **Timing:** a 60 s cycle with 24 s green, 3 s amber and a 3 s all-red clearance, in 4 offset groups, with one controller per split junction.
- **Sites:** 17 junctions instead of 177 signalised nodes. 3 are OSM-mapped and 14 are estimated major crossroads; 4 have too little room for stop lines and are not modelled (1 of them is OSM-mapped).
- **Results:** `signals_test` 12/12 (0 conflicting greens, every head shows the correct lamp). In 6-minute simulations cars wait at red, and none entered on red in repeated runs. Screenshots 8 and 9 show the same junction 28 s apart, with the axes swapped.
- **Hardware design:** generic. No verified photo of Irbid signal hardware was available, and Jordan is not a Vienna Convention party.

## 5. Places and schools

| Metric | Result |
|---|---|
| Unique real places added | **74** (1,655 → 1,729 in game; POID rows 1,648 → 1,722) |
| Verified schools added | **0** |
| Target +10,000 places | **not reachable**: OSM has 1,933 named non-road objects in the whole play window (Overpass, 2026-10-18), and the game already had 1,655 |
| Al-Ghasoor school | not in OSM, not in the 2018 MoE list (searched غصور / غسور), and no web result: **not added** |
| Pikaboo | not found anywhere: **not added** |
| Smile | 3 OSM shops named "smile" (clothes, shoes), already in the game |

Composition of the +74:
- 21 named institutional buildings (colleges, clubs, diwans, service departments);
- 15 hills/peaks and 7 springs, added as searchable areas;
- 7 "كراج" bus/taxi stands (OSM tagged them as caravan sites);
- named areas, camp sites, works, cemeteries, water works, halls, an arcade and a nature reserve.

Excluded on purpose:
- every OSM dwelling type (house, apartments, villa and others);
- buildings named only after people;
- security sites;
- plain descriptions such as "shops for rent".

Deduplication: same-kind same-name rows within 20 m — 0 (`place_audit` 33/33). Every row is inside the window with finite coordinates.

## 6. Sources

**46 distinct sources were actually opened and used** (`docs/REALISM_RESEARCH.md`, each with a finding and the code decision it supports). The
target of 200 was **not** met. The pages that could not be read are listed there and not counted.

## 7. "7× detail"

A sevenfold improvement was **not** achieved, and no such claim is made. Measured changes:

| Metric | Before | After | Ratio |
|---|---|---|---|
| Independently damageable visible items per car | 19 (body, 6 scratch zones, 4 lamps, 4 panes, 4 tyres) | 31 (+2 bumpers, 2 mirrors, bonnet, boot, 2 doors, 4 rims) | 1.6× |
| Glass damage | 1 decal per pane | crack pattern from up to 3 stored impact points per pane, laminated vs tempered | — |
| Object types with a material response | 4 | 9 | 2.25× |
| Speed-bump meshes | ~880 boxes (90 bumps) | 1 merged profile mesh | draw calls ↓ |
| Signal head | 1 cube per approach | housing + 3 lamps + pole + stop line | — |

The work focused on vehicle parts, physical interaction and correct data rather than raw polygon counts. No new facades, shadows, reflections or weather were added in v44.

## 8. Tests run (final build)

| Test | Result |
|---|---|
| `off_trace` | PASS, identical to v38 |
| `damage_test` | all passed (59) |
| `damage_v44` | **29/29** (new) |
| `realism_test` | all passed |
| `handling_test` | all passed |
| `bld_check` | all passed |
| `place_audit.py` | 33/33 |
| `signals_test` | 12/12 (new; traffic is random, repeated runs 0 red entries after the fixes) |
| `val_net` | 400 routes ok, 0 unroutable |
| `h24` / `vg` / `h14` | bad 6 / bad 9 / bad 2 (expected pre-existing) |
| `h21` | places 1729 (laz 1531) |
| `tour` | 0 off-road |
| `dyn_check` | bad 0 |
| `h16` | fines 0 |
| `lmchk` | every landmark ≤ 5 m |
| `h2`, `h13`, `h20` | finite / prices unchanged |
| `damage_pw.py` | all passed |
| `damage_v44_pw.py` | all passed (new, screenshots) |
| `world_v44_pw.py` | all passed (new, screenshots) |
| `disp`, `ios`, `shopt` | no errors |
| `drive_pw` | no page errors; the WebGL "context lost / GPU stall" console lines are identical on v43b (SwiftShader) |
| `wheel_test` | 39/40 twice, 40/40 once. The failing check ("centring force", 120–121 vs < 120) also fails on v43b, so it is a pre-existing borderline threshold, not a regression |
| `wheel_test blocked` | 2/2 |
| `dc2` | start 1,141 · balad 966 · Yarmouk 952 · highway 593 draw calls, no errors |

**Visual tests:** the screenshots were taken in headless Chromium (SwiftShader) and inspected.

**Not done:**
- no live play by a person;
- no physical G29 wheel test;
- no phone test.

SwiftShader renders about 1 frame per second, so the screenshots use forced game states and are not a video of driving.

## 9. Performance (Chromium + SwiftShader software GL; compare builds, not absolute fps)

| | v43b | v44 |
|---|---|---|
| Load to first frame | 4.47 s | 4.42–4.69 s |
| JS heap after load | 700 MB | 734–737 MB (+~35 MB: instance keys for ~18k trees, walls, rails) |
| Draw calls, start view, traffic hidden | 459–470 | 451–459 |
| Player car draw calls | 47 | 57 |
| Mean frame time (software GL) | 1.10 s | 1.21–1.24 s (noise level on SwiftShader) |
| Console / page errors | 0 | 0 |

No measurement was possible on the owner's Lenovo LOQ GPU from here, so real fps on that machine is untested.

## 10. Not finished / limitations

- Traffic and bot cars show no damage; only the player's car has the new parts.
- The damage is procedural: no crash-structure simulation and no per-model manufacturer data. All durability numbers are estimates.
- Speed-bump positions (88 of 90) and signal sites (14 of 17) are estimated, and signal timing is not Irbid controller data.
- No real-world geometry was found for Irbid bumps. The 0.9 m profile sits between the OSM/Wikipedia "bump" (≤ 0.3 m) and "hump" (3.7 m) definitions.
- Buildings are never demolished, by design: only surface marks.
- The +10,000 places, 100 schools, 200 sources and 7× detail targets were not met (sections 5–7 explain why).
