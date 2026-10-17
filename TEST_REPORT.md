# Test report: v39 (damage, tyres, world objects, map data). 2026-10-16

Machine: Windows 11, Node v24.20.0, Python 3.15 + Playwright 1.64 (Chromium, SwiftShader software GL). All commands run from the
repo root unless noted (Node harness tests were run from a scratch directory because they write output files).
Build: `python build.py` → `dist/irbid-drive.html` 3,374,297 chars / 3,216 lines.

## v42 (master repair: repair bay, G29, tyre state, place review), 2026-10-17, build 4,245,300 chars

| Test | Result |
|---|---|
| `val_net` | 400/400 routable, avg detour 1.30 |
| `boot`, `h2`, `h13`, `h20` | run clean; same shape as v41 (prices table unchanged) |
| `h24` / `vg` / `h14` | bad 6 / bad 9 / bad 2 (expected, unchanged) |
| `h21` | places 1659, laz 1489 (unchanged) |
| `tour` / `dyn_check` / `h16` | 0 off-road / bad 0 / fines 0 |
| `lmchk` | landmarks at their OSM points (0 m) |
| `terr_check` | runs; terrain range −243…466 m |
| `phys_brake` | handbrake hold 0.00 km/h; 0–100 uphill 6.85 s / downhill 3.80 s |
| `realism_test` | all passed (29) |
| `damage_test` | **58/58** (new: 7 repair-bay checks; diagnostics now point to the garage) |
| `off_trace` | Off + Arcade physics identical to v38; world hash 67ecbca6 (unchanged from v41) |
| `handling_test` | all passed |
| `bld_check` | all passed (95.9 % of footprint pieces placed) |
| `wheel_test.py` | **40/40** (new: released-then-pressed calibration, live readouts, clutch, combined pedals, released-end correction, dead zone, disconnect/reconnect); `blocked` 2/2 |
| `damage_pw.py` | **10/10** (repair bay listed, tyre FL repaired alone and charged, Repair all, "No damage recorded") |
| `shopt`, `disp`, `ios`, `drive_pw` | pass, no page errors |
| `dc2` | 473–1,036 draw calls |

All hardware results are **simulated** (mock Gamepad/WebHID). No physical G29, phone or tablet was tested.

## v41 (Phase 2: handling, traffic calming, audits), 2026-10-17, build 4,235,847 chars

All on the final v41 build (`runall`: Node from a scratch directory, Playwright from the repo root).

| Test | Result |
|---|---|
| **`handling_test`** (new) | **all pass**: powertrain solved for 217/217 cars; 0–100 within 10 % for 216 (within 5 % for 210, median 0.7 %); top speed within 5.3 % for all; default Arcade; Focus RS / Fiesta ST / Mustang GT / 911 / Model 3 / Hilux shift through gears (EV single speed), never above redline, in-game 0–100 within the start-road tolerance; launch spin AWD 0.00, FWD 1.00, RWD 0.82; RWD turns in harder under power, FWD less (understeer); coasting −0.76 m/s per s at 136 km/h; braking 0.98 g; 90 bumps, 2 from OSM; hop 0.00 m/s at 30 km/h, 0.32 at 70 (Arcade 0.49); body heave 2.5 / 5.3 cm; suspension damage once per crossing, none repeated |
| **`bld_check`** (new) | **all pass**: 48,997 footprint pieces; 46,928 of 47,001 placed pieces exactly at their OSM centre with their data height (31 duplicate outlines); 0 on a carriageway; 95.9 % placed |
| `off_trace` | physics (collider-free) hash = v38; world hash unchanged from v40 |
| `damage_test` / `realism_test` | 50/50 / 29/29 |
| `h21` / `h24` / `vg` / `h14` | 1,659 places / bad 6 / bad 9 / bad 2 (all = v40) |
| `val_net`, `boot`, `h2`, `h13`, `h16`, `h20`, `tour`, `dyn_check`, `terr_check` | as v40 (400/400 routes, 0 mismatches, fines 0, prices unchanged, 0 off-road, traffic bad 0, 0 groups off terrain) |
| `phys_brake` (Arcade) | Focus RS 0–100 4.99 s, vmax 245.4 (= v38) |
| `wheel_test` (G29 mock) | 30/30 in Arcade **and** 30/30 with Realistic handling on |
| `disp`, `ios`, `shopt`, `drive_pw`, `damage_pw`, `dc2` | pass, no page errors |

Browser check of Realistic mode (Chromium screenshot, inspected): H switches the mode; the HUD shows "G4 · 3900 rpm"; the diagnostics panel shows
"6 gears, redline 6500 · peak torque 426 Nm · tyre μ 0.95 · limited at 266 km/h · springs 1.5 Hz (all estimates …)" for the Focus RS.
Not tested: phones, a physical G29, feel of Realistic handling over long drives (only scripted runs).

## v40 (Phase 1: real map and places), 2026-10-17, build 4,225,808 chars

All run on the final v40 build. Node suites from a scratch directory, Playwright from the repo root.

| Test | v39c | v40 |
|---|---|---|
| `val_net` | 400 ok, 0 unroutable | same |
| `boot` | build 3.9 s, 465k instances | build 4.6 s, 831k instances (2.4× real buildings) |
| `h2` / `h13` / `h20` / `h16` | finite / 0 mismatches / unchanged / fines 0 | same |
| `h14` | bad 2 | bad 2 |
| `h21` places | 1,473 | **1,659** (laz 1,489) |
| `h24` / `vg` | bad 6 / bad 9 | **bad 6 / bad 9** (test names updated to the corrected landmark names; old names stay searchable) |
| `tour` / `dyn_check` / `terr_check` | 0 off-road / bad 0 / 0 groups off terrain | same |
| `phys_brake` | Focus RS 0–100 4.99 s, vmax 245.4 | identical |
| `realism_test` / `damage_test` | 29/29 / 50/50 | 29/29 / 50/50 |
| `off_trace` | hash = v38 | **physics (collider-free) hash = v38** (`b4f220ee…`, checked on v38, v39c and v40); the with-world hash changed because the clock tower, heritage houses and new buildings near the start are at their real positions. The test now checks both |
| `lmchk` | Dar As-Saraya 76 m, Nabulsi 37 m, Clock 36 m, Arar 16 m, Nissan 47 m | **all ≤ 5 m** |
| `dc2` draw calls / triangles | 2,110–2,577 / 1.26–1.33 M | **538–1,060 / 83k–281k** (view-culling fix) |
| `disp`, `ios`, `shopt`, `wheel_test` 30/30, `drive_pw`, `damage_pw` 7/7 | pass | pass, no page errors |

Visual checks (Chromium screenshots, inspected): Dar As-Saraya, Beit Nabulsi and Beit Arar on their real footprints; the clock tower in the
square median; JUST and Jadara show real OSM buildings instead of generated blocks; the same downtown and JUST views before/after show no
geometry lost to culling. Not tested: phones (frame rate with the extra buildings), G29 hardware.

## v39: New tests

### `node tests/damage_test.js dist/irbid-drive.html`: 50/50 PASS

| Area | Checks (measured values) |
|---|---|
| Save migration | v38 record → v2: zones from body (61), wheels from tyres (70) |
| Off mode | 72 km/h wall hit records nothing |
| Severity | 8 km/h nudge: nothing; 14 km/h: 10.9 % over both front zones; 50 km/h: 66.3 % |
| Localization | front-left hit: fl 63.6 / fr 88.2, rear and left side 100, IMPACT zone fl/front; left headlight only; dent moves front vertices up to 0.22 m, rear vertices 0.000 m; broken headlight material swapped. Right-side hit: right 45 %, left 100 %; right windows cracked only |
| Modes | Cosmetic: no mechanical damage, multipliers 1, 0–100 time unchanged. Full 90 km/h frontal: engine 0, radiator 0, front suspension 0, rear suspension 100 |
| Location-aware internals | Porsche 911 (rear engine): rear hit engine 26 %, front hit engine 100 %; FL wheel strike: FL suspension 65 %, toe −1.18°, pull −0.014 rad/s; door hit leaves all wheels intact |
| Per-car durability | same 54 km/h hit: F-150 51.7, Focus RS 72.5, Porsche 917 103.1 (zone-% lost); 217 distinct profiles; Focus RS AWD, Fiesta ST FWD, Mustang GT RWD, 911 rear engine; car-to-car 28.2 vs wall 72.5 |
| Burnouts | Mustang GT throttle+brake 3 s: car held (0.00 m/s), rear wear 1.02 %, fronts 0.000 %, rear 108 °C vs front 25 °C; 30 s: 20.6 %; Fiesta ST: foot brake no burnout, handbrake burnout front 0.41 %, rear 0.000 %; Focus RS AWD: no burnout; Model T: too weak; Off: no burnout, no wear |
| Drift / normal wear | 10 s power slide: FL 0.00 / FR 0.73 / RL 1.18 / RR 16.67 %; 2 s launch 0.27 % (driven rears); 51 s ordinary driving ≤ 0.18 % |
| Grip effects | 3 % tread: Cosmetic grip 1, Full grip 0.71 / lateral 0.71; puncture: lower grip than a bald tyre, pull > 0, vibration > 0, top speed ≤ 62 % |
| Landings | 9 m/s: suspension + underbody damaged; 4 m/s: nothing |
| Repairs / switching | Replace tyres keeps body damage; Repair all restores everything; switching Focus → Fiesta carries nothing over; back to Focus restores its damage and dents; persisted per car name |
| World objects | every collider classifies (rigid 51,685 · breakable 12,985 · movable 693 entries); sign bends at 11 km/h, knocks down at 29 km/h (car loses 0.8 m/s), plate collapsed; street light bends at 36 km/h; 2,500 kg breaks a pole at 36 km/h where 1,500 kg does not; broken street light hides its arm; dumpster shoved 6.3 m along the hit and collider re-added; wall and tree rigid |
| UI | diagnostics HTML lists components, zones, four tyres, repair |

### `node tests/off_trace.js dist/irbid-drive.html`: PASS

Damage Off, scripted throttle / steer / brake / handbrake / throttle+brake on Focus RS, Porsche 911, Fiesta ST and Aventador,
2,760 frames. SHA-1 `b48ea933…` is **identical on the v38 build and the v39 build**: with damage Off, physics is unchanged.

### `python tests/damage_pw.py dist/irbid-drive.html`: 7/7 PASS (real Chromium)

Full mode active; front-left + right-side crash recorded (fl 5.8 %, r 45 %, 2 dents, left headlight broken, right glass cracked);
body tessellated (19,158 vertices) and dented; diagnostics shows components and tyres; dashboard warning `⚠ TYRE FL PUNCTURED`; repair
restores; no page errors. Screenshots were inspected: the crushed front-left corner, broken left headlight, scuffs, low punctured
FL wheel, cracked side glass, and the diagnostics panel all render.

### `node tests/realism_test.js dist/irbid-drive.html`: 29/29 PASS

One assertion was updated deliberately: the Full-mode multiplier floors changed from v38's (top speed ≥ 0.48 …) to v39's
(≥ 0.40 …), because a wrecked car with a dead engine and two punctures now cannot reach 100 km/h.

## Regression suite (expected values from `CLAUDE.md`)

| Test | v38 baseline | v39a (vehicle) | v39b (+ map data) |
|---|---|---|---|
| `val_net` | 400 routes ok, 0 unroutable | same | same |
| `boot` | runs | runs | runs |
| `h2` races/duel/heist | finite | finite | finite |
| `h13` traffic tiers | 0 mismatches | 0 | 0 |
| `h20` rarity / prices | 59/45/34/31…, prices unchanged | same | same |
| `h21` places | 1038 | 1038, **byte-identical dump** | **1473** (first 60 entries incl. all hand-built landmarks unchanged) |
| `h24` | bad 6 | bad 6 | bad 6 |
| `vg` | bad 9 | bad 9 | bad 9 |
| `tour` | 27 stops, 0 off-road | same | same |
| `dyn_check` | traffic bad 0 | 0 | 0 |
| `phys_brake` | Focus RS 0–100 4.99 s, vmax 245.4 | identical | – |
| `h16` fines | 0 | 0 | 0 |
| `terr_check` | runs | runs | runs |

## Browser suite (Playwright, existing scripts)

Run on the final v39b build (`python tests/<name>.py dist/irbid-drive.html`):

| Script | Result |
|---|---|
| `disp` | 1920×1080 buffer at three window sizes, aspect 1.7778: same as v38 |
| `ios` | touch pads: gas+left/right, drift pad, brake, cancel all drive; no page errors |
| `shopt` | shop opens only near Apex Drift Customs, desktop and mobile; no errors |
| `wheel_test` | **30/30 PASS**: G29 detection, calibration, button binding, force-feedback direction, keyboard and touch still drive with the wheel idle (mock gamepad + WebHID) |
| `dc2` | 2,275–2,581 draw calls, 1.26–1.32 M triangles at four spots; no errors |
| `drive_pw` | keyboard throttle and brake drive the car on terrain (SwiftShader runs ~2 fps, so speeds are low; same as v38); no page errors |
| `damage_pw` | 7/7 PASS (above) |

## Not tested

- Real Android / iPhone devices and frame rate on them (only desktop Chromium with software GL).
- Logitech G29 hardware (`wheel_test.py` uses a mocked gamepad + WebHID device).
- Visual quality of dents on every one of the 217 body shapes (checked on the Focus RS).
- Long play sessions (save size growth with many damaged cars: each record is about 2 KB plus dents).
