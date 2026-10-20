# Test report (v49, 2026-10-20)

Produced on this PC (Windows 11, Node 24, Python 3.15, Playwright Chromium with SwiftShader, plus Firefox and WebKit 27.2). Nothing is reported
that was not run. Not tested: real phones, tablets, Mac, Linux, Logitech G29 hardware, real-GPU frame rates, and multiplayer (no server exists).

## v49 full check: `python tools/check.py --full` → 54 of 54 passed

New: `assist_v49` (30 checks) and `v49_pw` (12). Measured in `assist_v49`: options off give the same Realistic trace as v48 (9d480eb32cd8);
tyres 24 °C → grip 92 %, 60 s of full-lock cornering at 58 km/h → 103 °C; 8 stops from 140 km/h with brake fade: 73.7 m → 104.7 m (brakes 546 °C).
Copied from `.check/report.md`:

2026-10-20 08:24 · full · 2220 s · build sha256 4dfd4e99fd9c0816

| Check | Result | Detail |
|---|---|---|
| git working tree readable | PASS | 11 changed/untracked paths |
| every part in build.py exists | PASS |  |
| syntax of all 62 parts | PASS |  |
| build | PASS | 4383675 chars 4200 lines |
| game script extractable by the test harness | PASS | 1 match(es) |
| whole game script parses (no duplicate top-level names) | PASS | ok |
| run-time hosts = cdnjs only | PASS | cdnjs.cloudflare.com |
| OpenStreetMap attribution in the build | PASS |  |
| JSON files parse | PASS |  |
| asset manifests | PASS | validate-assets: 289 assets, 0 errors, 0 warnings |
| node off_trace | PASS | same world trace 67ecbca6e3d8d90ac7ccc4c4f47b1ef663a1cc02 |
| node val_net | PASS | widths m: motorway/trunk/primary/secondary/tertiary/residential/service -/9/9/8.5/7.5/8/5.5 |
| node boot | PASS | BufferGeometry:4:MeshBasicMaterial:ffffff meshes 690 inst 3709 |
| node h2 | PASS | player finite at end true |
| node h13 | PASS | traffic positions finite true |
| node h20 | PASS | prices [[1500,3000,6000,12000,24000],[1200,2400,4800,9600,19200],[800,1600,3200,6400,12800],[3000,6000,12000,24000,48000]] |
| node h24 | PASS | bad 6 |
| node assist_v46 | PASS | assist_v46: all passed |
| node assist_v48 | PASS | assist_v48: all passed |
| node assist_v49 | PASS | assist_v49: all passed |
| node realism_test | PASS | realism: all passed |
| node damage_test | PASS | damage: all passed |
| node damage_v44 | PASS | damage v44: all passed |
| node handling_test | PASS | handling: all passed |
| node drift_v45 | PASS | drift_v45: all passed |
| node audio_v45 | PASS | audio_v45: all passed |
| node save_v45 | PASS | save_v45: all passed |
| node dyn_check | PASS | P -135 -11.62 groundH -11.62 |
| node h16 | PASS | traffic samples on drift edges 0 |
| node tour | PASS | tour stops 27 off-road 0 |
| node lmchk | PASS | MALL {"x":1161,"z":1291.2,"r":29,"ang":0.11,"k":1} |
| node signals_test | PASS | signals: all passed |
| node vg | PASS | bad 9 |
| node h14 | PASS | bad 2 |
| node h21 (places) | PASS | places 1729 houses 100 laz 1531 |
| browser v49_pw | PASS | v49_pw: all passed |
| browser v48_pw | PASS | v48_pw: all passed |
| browser v47_pw | PASS | v47_pw: all passed |
| browser xbrowser_pw | PASS | xbrowser_pw: all passed (chromium/desktop, chromium/android, firefox/desktop, webkit/desktop, webkit/iphone, webkit/iphone_portrait, webkit/ipad) |
| browser v46_pw | PASS | v46_pw: all passed |
| browser damage_pw | PASS | damage_pw: all passed |
| browser damage_v44_pw | PASS | damage_v44_pw: all passed |
| browser world_v44_pw | PASS | world_v44_pw: all passed |
| browser audio_v45_pw | PASS | audio_v45_pw: all passed |
| browser pause_v45_pw | PASS | pause_v45_pw: all passed |
| browser playtest_v45_pw | PASS | playtest_v45_pw: all passed |
| browser dc2 | PASS | errs [] |
| browser disp | PASS | 1600 500 {'buf': [1920, 1080], 'css': [889, 500, 356, 0], 'pr': 1, 'camAsp': 1.7778, 'mapSmooth': False, 'gfx': True, 'post': True, 'hasDisplay': 'function', 'ctx2d': None} |
| browser ios | PASS | scrollY [0, 0, False] errs [] |
| browser shopt | PASS |  errs [] |
| browser drive_pw | PASS | errs [] console ['WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost', '[.WebGL-0x4b1413820c00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels', '[.WebGL |
| browser place_audit | PASS | place audit: all passed |
| browser wheel_test  | PASS | {"passed": 43, "total": 43} |
| browser wheel_test blocked | PASS | {"blocked gamepad API is survived": true, "no page errors": true} |

**54 of 54 passed.**

## v48 full check: `python tools/check.py --full` → 52 of 52 passed

The table is copied unchanged from `.check/report.md`:

2026-10-20 01:02 · full · 1856 s · build sha256 efe5d337b055f91b

| Check | Result | Detail |
|---|---|---|
| git working tree readable | PASS | 14 changed/untracked paths |
| every part in build.py exists | PASS |  |
| syntax of all 62 parts | PASS |  |
| build | PASS | 4377288 chars 4165 lines |
| game script extractable by the test harness | PASS | 1 match(es) |
| whole game script parses (no duplicate top-level names) | PASS | ok |
| run-time hosts = cdnjs only | PASS | cdnjs.cloudflare.com |
| OpenStreetMap attribution in the build | PASS |  |
| JSON files parse | PASS |  |
| asset manifests | PASS | validate-assets: 289 assets, 0 errors, 0 warnings |
| node off_trace | PASS | same world trace 67ecbca6e3d8d90ac7ccc4c4f47b1ef663a1cc02 |
| node val_net | PASS | widths m: motorway/trunk/primary/secondary/tertiary/residential/service -/9/9/8.5/7.5/8/5.5 |
| node boot | PASS | BufferGeometry:4:MeshBasicMaterial:ffffff meshes 690 inst 3709 |
| node h2 | PASS | player finite at end true |
| node h13 | PASS | traffic positions finite true |
| node h20 | PASS | prices [[1500,3000,6000,12000,24000],[1200,2400,4800,9600,19200],[800,1600,3200,6400,12800],[3000,6000,12000,24000,48000]] |
| node h24 | PASS | bad 6 |
| node assist_v46 | PASS | assist_v46: all passed |
| node assist_v48 | PASS | assist_v48: all passed |
| node realism_test | PASS | realism: all passed |
| node damage_test | PASS | damage: all passed |
| node damage_v44 | PASS | damage v44: all passed |
| node handling_test | PASS | handling: all passed |
| node drift_v45 | PASS | drift_v45: all passed |
| node audio_v45 | PASS | audio_v45: all passed |
| node save_v45 | PASS | save_v45: all passed |
| node dyn_check | PASS | P -135 -11.62 groundH -11.62 |
| node h16 | PASS | traffic samples on drift edges 0 |
| node tour | PASS | tour stops 27 off-road 0 |
| node lmchk | PASS | MALL {"x":1161,"z":1291.2,"r":29,"ang":0.11,"k":1} |
| node signals_test | PASS | signals: all passed |
| node vg | PASS | bad 9 |
| node h14 | PASS | bad 2 |
| node h21 (places) | PASS | places 1729 houses 100 laz 1531 |
| browser v48_pw | PASS | v48_pw: all passed |
| browser v47_pw | PASS | v47_pw: all passed |
| browser xbrowser_pw | PASS | xbrowser_pw: all passed (chromium/desktop, chromium/android, firefox/desktop, webkit/desktop, webkit/iphone, webkit/iphone_portrait, webkit/ipad) |
| browser v46_pw | PASS | v46_pw: all passed |
| browser damage_pw | PASS | damage_pw: all passed |
| browser damage_v44_pw | PASS | damage_v44_pw: all passed |
| browser world_v44_pw | PASS | world_v44_pw: all passed |
| browser audio_v45_pw | PASS | audio_v45_pw: all passed |
| browser pause_v45_pw | PASS | pause_v45_pw: all passed |
| browser playtest_v45_pw | PASS | playtest_v45_pw: all passed |
| browser dc2 | PASS | errs [] |
| browser disp | PASS | 1600 500 {'buf': [1920, 1080], 'css': [889, 500, 356, 0], 'pr': 1, 'camAsp': 1.7778, 'mapSmooth': False, 'gfx': True, 'post': True, 'hasDisplay': 'function', 'ctx2d': None} |
| browser ios | PASS | scrollY [0, 0, False] errs [] |
| browser shopt | PASS |  errs [] |
| browser drive_pw | PASS | errs [] console ['WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost', '[.WebGL-0x39fc001eae00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels', '[.WebGL |
| browser place_audit | PASS | place audit: all passed |
| browser wheel_test  | PASS | {"passed": 43, "total": 43} |
| browser wheel_test blocked | PASS | {"blocked gamepad API is survived": true, "no page errors": true} |

**52 of 52 passed.**

New in v48: `assist_v48` (19 checks; the defaults' Realistic trajectory hash equals the v47 build's) and `v48_pw` (12 checks), plus the
whole-script parse check. Found before release: the assists' `ASTORE` name clashed with the audio part, which would have stopped the whole
game from loading (renamed; now guarded).

---

## v47 report (2026-10-19)

Every result below was produced on this PC (Windows 11, Node 24, Python 3.15, Playwright Chromium with SwiftShader software GL, plus
Playwright Firefox and WebKit 27.2). Nothing is reported that was not run. Real devices were **not** tested: no phone, tablet, Mac,
Linux PC or Logitech G29 is connected, and there is no real-GPU frame-rate run (see `docs/KNOWN_ISSUES.md`).

## Full check: `python tools/check.py --full` → 49 of 49 passed

The table is copied unchanged from `.check/report.md`:

2026-10-19 23:41 · full · 1799 s · build sha256 6d9dd14b93774017

| Check | Result | Detail |
|---|---|---|
| git working tree readable | PASS | 23 changed/untracked paths |
| every part in build.py exists | PASS |  |
| syntax of all 61 parts | PASS |  |
| build | PASS | 4359748 chars 4051 lines |
| game script extractable by the test harness | PASS | 1 match(es) |
| run-time hosts = cdnjs only | PASS | cdnjs.cloudflare.com |
| OpenStreetMap attribution in the build | PASS |  |
| JSON files parse | PASS |  |
| asset manifests | PASS | validate-assets: 289 assets, 0 errors, 0 warnings |
| node off_trace | PASS | same world trace 67ecbca6e3d8d90ac7ccc4c4f47b1ef663a1cc02 |
| node val_net | PASS | widths m: motorway/trunk/primary/secondary/tertiary/residential/service -/9/9/8.5/7.5/8/5.5 |
| node boot | PASS | BufferGeometry:4:MeshBasicMaterial:ffffff meshes 690 inst 3709 |
| node h2 | PASS | player finite at end true |
| node h13 | PASS | traffic positions finite true |
| node h20 | PASS | prices [[1500,3000,6000,12000,24000],[1200,2400,4800,9600,19200],[800,1600,3200,6400,12800],[3000,6000,12000,24000,48000]] |
| node h24 | PASS | bad 6 |
| node assist_v46 | PASS | assist_v46: all passed |
| node realism_test | PASS | realism: all passed |
| node damage_test | PASS | damage: all passed |
| node damage_v44 | PASS | damage v44: all passed |
| node handling_test | PASS | handling: all passed |
| node drift_v45 | PASS | drift_v45: all passed |
| node audio_v45 | PASS | audio_v45: all passed |
| node save_v45 | PASS | save_v45: all passed |
| node dyn_check | PASS | P -135 -11.62 groundH -11.62 |
| node h16 | PASS | traffic samples on drift edges 0 |
| node tour | PASS | tour stops 27 off-road 0 |
| node lmchk | PASS | MALL {"x":1161,"z":1291.2,"r":29,"ang":0.11,"k":1} |
| node signals_test | PASS | signals: all passed |
| node vg | PASS | bad 9 |
| node h14 | PASS | bad 2 |
| node h21 (places) | PASS | places 1729 houses 100 laz 1531 |
| browser v47_pw | PASS | v47_pw: all passed |
| browser xbrowser_pw | PASS | xbrowser_pw: all passed (chromium/desktop, chromium/android, firefox/desktop, webkit/desktop, webkit/iphone, webkit/iphone_portrait, webkit/ipad) |
| browser v46_pw | PASS | v46_pw: all passed |
| browser damage_pw | PASS | damage_pw: all passed |
| browser damage_v44_pw | PASS | damage_v44_pw: all passed |
| browser world_v44_pw | PASS | world_v44_pw: all passed |
| browser audio_v45_pw | PASS | audio_v45_pw: all passed |
| browser pause_v45_pw | PASS | pause_v45_pw: all passed |
| browser playtest_v45_pw | PASS | playtest_v45_pw: all passed |
| browser dc2 | PASS | errs [] |
| browser disp | PASS | 1600 500 {'buf': [1920, 1080], 'css': [889, 500, 356, 0], 'pr': 1, 'camAsp': 1.7778, 'mapSmooth': False, 'gfx': True, 'post': True, 'hasDisplay': 'function', 'ctx2d': None} |
| browser ios | PASS | scrollY [0, 0, False] errs [] |
| browser shopt | PASS |  errs [] |
| browser drive_pw | PASS | errs [] console ['WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost', '[.WebGL-0x5914001eac00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels', '[.WebGL |
| browser place_audit | PASS | place audit: all passed |
| browser wheel_test  | PASS | {"passed": 43, "total": 43} |
| browser wheel_test blocked | PASS | {"blocked gamepad API is survived": true, "no page errors": true} |

**49 of 49 passed.**

`off_trace`: the collider-free physics hash equals v38's (Arcade and damage Off unchanged). Expected pre-existing values hold: `h24` bad 6,
`vg` bad 9, `h14` bad 2, `h21` 1,729 places, `tour` 0 off-road, `h16` 0.

## Found and fixed while testing (v47)

| Found by | Problem | Fix |
|---|---|---|
| `tools/gen_asset_manifests.js` | The new error-banner script in the head started with `<script>` + newline, so every Node test and tool would have loaded the 1 KB banner script instead of the game | The script starts `<script>(function`; `check.py` now fails on this |
| `scripts/validate-assets.js` | Engine ids clashed (`V8n` vs `V8n+`) | Ids encode special characters |
| `v47_pw` (Ultra) | High already uses 4096 shadows, so "Ultra = 4096 shadows" would have changed nothing | Ultra renders 2560x1440 instead (measured 1.6x the cost of High) |
| `xbrowser_pw` (WebKit) | Buttons and inputs fell back to a serif font | `button,input,select{font-family:inherit}` |
| `xbrowser_pw` (iPhone portrait) | In portrait the search box covers the BRAKE and GAS pads | Portrait touch devices show a "turn your phone sideways" hint |
| `xbrowser_pw` (iPad, 4th WebKit page) | Software GL context lost and never restored; the new handler paused the game correctly | The test uses one browser per case. On a real device the pause message would show; reload recovers |

## Test-tool notes (not game bugs)

- Headless Chromium (SwiftShader) loses and restores the WebGL context once during startup in every run (`graphics reset 1x`). The game recovers.
- Playwright WebKit on Windows has no Web Audio (the game shows its "runs without sound" notice), and its phone emulation reports touch coordinates
  scaled by 0.8. The test measures that scale with a probe tap and compensates.
- `--full` takes ~30 minutes because SwiftShader renders at a few frames per second; driving checks wait for game time, not wall-clock time.

Screenshots: `docs/screenshots/v47/` (quality Low/Ultra, pause menu, context lost/restored, no-WebGL, each browser and device).
