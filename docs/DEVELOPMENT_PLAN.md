# Development plan and workflow (v47)

## Everyday workflow

1. `python build.py` builds `dist/irbid-drive.html` from `src/parts/` (order in `build.py`).
2. `python tools/check.py` runs the quick check (~3 min): working tree, every part exists and parses, build, the test-harness script guard, run-time hosts
   (cdnjs only), OSM attribution, JSON, asset manifests, and the core Node checks (`off_trace`, `val_net`, `boot`, `h2`, `h13`, `h20`, `h24`, `assist_v46`).
3. `python tools/check.py --full` adds every Node and Playwright check (~30–40 min), including `v47_pw`. It never publishes or commits.
4. When everything passes, the check copies the build to `dist/last-good/` (git-ignored), so the last working build survives a later broken one.
   Git tags (`backup/v45`, `backup/v46`, …) are the long-term checkpoints.
5. Commit, then `git push` (owner rule), then publish `dist/irbid-drive.html` to the same artifact URL.
6. Asset changes: `node tools/gen_asset_manifests.js dist/irbid-drive.html`, then `node scripts/validate-assets.js`.
7. App: `python tools/make_app_www.py`, then `cd app && npx cap sync` (see `docs/PLATFORM_SUPPORT.md`).
8. Cross-browser: `python tests/xbrowser_pw.py dist/irbid-drive.html` (Chromium, Firefox, WebKit, plus phone and tablet emulation). It needs
   `python -m playwright install firefox webkit` once.

Rules kept from `CLAUDE.md`: Arcade physics stays identical to v38 (`off_trace`); the single-file and offline deliverable stays; no new run-time
hosts; the economy and save shape are unchanged; behaviour changes need owner approval in `PLAN.md`.

## Status against the v47 brief (phases 1–10)

| Phase | Done in v47 | Already present (earlier versions) | Not done, and why |
|---|---|---|---|
| 1 Inspect | `docs/PROJECT_AUDIT.md` (dependency map, initial state, findings); tag `backup/v46` | | |
| 2 Workflow | `tools/check.py` (quick/full, report, last-good build), these docs | 40+ tests | |
| 3 Platforms | No-WebGL message, error banner, loading screen, context loss/restore, device report, control fonts; Capacitor 8 `app/` with `android/` and `ios/`; tested in Chromium, Firefox, WebKit, iPhone/iPad/Pixel emulation | Touch pads, G29, keyboard, safe areas, 16:9 letterbox | APK/IPA builds: no Android SDK on this PC (licence acceptance) and no Mac. Store publishing needs owner accounts |
| 4 Assets | `assets/manifests/` (289 entries, licence fields, size, SHA-256), generator, `scripts/validate-assets.js` | `manifest/` (cars, places, photos, objects) | Moving the game to separate asset files conflicts with the single-file rule; the game has no binary assets yet, so the manifests describe what is generated |
| 5 Vehicle sources | Licence research (`docs/ASSET_SOURCES_AND_LICENSES.md`), acquisition rules, evaluation checklist | Sketchfab search of all 217 cars (v39) | No downloads: owner account, licence and trademark decision, size budget |
| 6 Physics | | Realistic mode: torque curves, gears and manual gearbox, drivetrains, mass, CdA, rolling resistance, slip-angle tyre model with load transfer and friction circle, handbrake, burnouts, wet grip, surface grip, 240 Hz sub-steps, NaN guards, per-car data (`manifest/car_powertrain.json`) | Arcade is frozen to v38 by owner rule |
| 7 Audio | | Synthesised per-layout engine voices (RPM and throttle driven, harmonics, turbo layer, cockpit low-pass), tyres, gravel/road, wind, impacts, rain, horns (positional), mute and volumes, autoplay-safe start, one shared traffic voice | Recordings need Freesound login and per-sound licence checks |
| 8 Irbid | | OSM roads, 30k+ buildings, 1,729 places with sources and review status, SRTM terrain, signals, attribution | |
| 9 Traffic | Density setting (80/52/28) | Road-graph following, signals, spacing, curve slowing, respawn when stuck, reputation, horns | |
| 10 Graphics | Presets now change the workload: Low 1280x720 without post; Ultra 2560x1440 supersampled with 1.3x detail range | Auto, High, Medium; sky, shadows, bloom, facade shader, weather, day/night | |

The brief was cut off in Phase 10 ("MED…"); later phases were not received.

## Next steps, in order of value

1. Owner decisions: car models (licence, trademark, budget) and engine recordings (Freesound account), then wire them through `assets/manifests/`.
2. Android: install Android Studio (accept its licence yourself), run `npx cap sync` and `npx cap run android`, and test on a phone.
3. Phone performance: measure Low quality with Low traffic on a real mid-range phone; consider a lower default on touch devices.
4. A Poly Haven CC0 asphalt texture (inlined) to replace the plain road colour, if the size budget allows.
