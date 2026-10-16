# Test report: v39 (damage, tyres, world objects, map data). 2026-10-16

Machine: Windows 11, Node v24.20.0, Python 3.15 + Playwright 1.64 (Chromium, SwiftShader software GL). All commands run from the
repo root unless noted (Node harness tests were run from a scratch directory because they write output files).
Build: `python build.py` → `dist/irbid-drive.html` 3,374,297 chars / 3,216 lines.

## New tests

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
