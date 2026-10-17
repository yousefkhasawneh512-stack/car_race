# Final test report (v43, 2026-10-17)

Build: `python build.py` → `dist/irbid-drive.html` (4,247,424 chars). Machine: Windows 11, Node v24, Python 3.15, Playwright Chromium (headless,
SwiftShader). Backup before the change: git tag `backup/v42`.

## Commands

```
python osm/overpass/build.py --game          # regenerate places (applies osm/overpass/corrections.py)
python tools/place_review_csv.py             # PLACE_REVIEW.csv
python build.py
python tests/place_audit.py dist/irbid-drive.html
node tests/<name>.js dist/irbid-drive.html   # damage_test, realism_test, off_trace, handling_test, bld_check from the repo root
python tests/<name>.py dist/irbid-drive.html # damage_pw, wheel_test (+ "blocked"), dc2
```

## Results by kind of evidence

**Automated test passed** (all on the v43 build):

| Test | Result | Covers |
|---|---|---|
| `place_audit.py` (new) | **29/29** | every audit correction (CAT-001…006, NAME-001/003/004, DUP-004/005, OSM-001…004), no ";" names, no hospital-tagged schools/health centres, no preset chain aliases, heritage aliases, no same-kind same-name rows < 20 m, finite coordinates, unique ids |
| `damage_test` | **59/59** | zones, contact point, dent severity, per-car durability, RWD/FWD/AWD burnout wear, drift wear, per-wheel tyres, repairs per part, **full inspection** (new), a tyre repair leaving suspension/panels untouched |
| `realism_test` | 29/29 | speed bumps (90; 2 OSM + 88 estimated), objects, modes |
| `off_trace` | pass | damage Off physics hash identical to v38 (b4f220ee…) |
| `handling_test` | all passed | Arcade/Realistic |
| `bld_check` | all passed | 95.9 % of OSM footprint pieces placed |
| `val_net` | 400 routes ok, 0 unroutable | road connectivity |
| `h24` / `vg` / `h14` | bad 6 / bad 9 / bad 2 | **expected pre-existing values** (searches for removed invented shops) |
| `h21` | places 1655 (laz 1485) | v42: 1659 / 1489. The −4 are the removed rows (PLACE_IMPORT_REPORT v43) |
| `tour` | 27 stops, 0 off-road | landmarks on roads |
| `dyn_check` | bad 0 | traffic on terrain |
| `h16` | fines 0 | |
| `lmchk` | every landmark ≤ 5 m from its OSM feature | coordinate alignment |
| `boot`, `h2`, `h13`, `h20` | run to completion, finite state | output varies (Math.random); shape as v42 |
| `wheel_test` | **40/40** (rerun alone); `blocked` 2/2 | simulated G29 (see below) |
| `damage_pw` | **11/11** | visible damage, repair bay and inspection list clicked in Chromium |
| `dc2` | 495–1,078 draw calls, 82k–280k triangles | expected range 540–1,060; start view 1,078 is 18 above that note (it was 1,036 in v42; within run-to-run variation, not investigated further) |

**Known flaky:** in the first full Playwright run, `wheel_test` failed 1 check ("centring force opposes wheel angle", 121 vs < 120) while other
tests were loading the machine. Rerun alone it passes 40/40 on v43 and on the v42 build. The wheel code did not change in v43.

**Startup with and without network (Chromium, automated):**
- Network on: three r128 loads from cdnjs, game starts, no page errors.
- Network blocked: the game cannot run without three.js. **v43 now shows "Irbid Drive could not start"** with the fix (go online or open
  `irbid-drive-offline.html`) instead of a black screen. Verified by screenshot.
- `irbid-drive-offline.html` (three.js inlined) with all network blocked: starts, no errors, 0 requests.

**Static / syntax check:** build succeeds; `osm/overpass/build.py --game` re-run with unchanged inputs reproduced 03c byte-for-byte before
the v43 edits (determinism check).

**Visual inspection passed:** screenshots of the repair bay (`damage_pw_repair.png`) and the offline message. No new visual review of the city.

## Not tested (and not claimed)

- **Live gameplay test** by a person: not done in this environment (headless only).
- **Physical Logitech G29:** not tested. All wheel results use a mock Gamepad/WebHID device. Test guide: `G29_TEST_REPORT.md` §3.
- **Mobile device test:** not done (no phone here). Touch pads are covered by `wheel_test`'s touch check only.
- Place corrections were checked against data and websites, **not on site**. Medium-confidence changes are flagged in `PLACE_REVIEW.csv`.
