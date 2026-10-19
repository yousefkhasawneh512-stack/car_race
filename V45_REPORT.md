# Irbid Drive v45 — report

Date 2026-10-19. Starting point: v44 (`backup/v44` tag, pushed). Owner requests covered: (1) vehicle-specific drift physics, tyre grip,
countersteer, weight transfer, smoke and squeal; (2) engine sounds for every car; (3) 60 fps at 1080p on an RTX 3050 Laptop (6 GB);
(4) the "V44 ULTIMATE FULL-PROJECT REPAIR" task (Parts 1–21) and the two follow-ups (fix verified bugs with root cause first; test the
actual built game in a browser). Owner decision during the session: the new drift physics goes into **Realistic mode only** (key H);
Arcade stays identical to v38.

## A. Summary

- **Realistic handling now has a real tyre model.** Each axle has a slip angle and a saturating grip curve; braking and acceleration move load
  between the axles; drive and brake force use up side grip (friction circle); the handbrake locks the rear; the car has yaw inertia. Drifts start
  with the handbrake or power (rear-drive), countersteer catches them, too much steer + throttle spins the car, and every car behaves differently
  because mass, weight split, wheelbase, centre-of-gravity height, drivetrain and tyre grip differ. Arcade is untouched.
- **Every car has its own engine sound**, generated in the browser from its engine layout (217 cars, 35 distinct configurations). No recordings
  are used, so nothing needed licensing; the sounds are approximations, not the real cars. Tyre squeal follows the actual tyre slip.
- **Pause / settings menu (Esc):** volumes, mute, graphics quality presets, a frame-time meter so the owner can measure fps on the RTX 3050.
- **Bugs fixed** (root causes in section C): the HUD (speed, top bar, minimap) had been hidden under the 3D view since v24; sign backs showed
  mirrored text; corrupt saves were silently overwritten and numeric strings corrupted fines; plus three bugs introduced and caught during this
  session (wheel Back button + pause, wheel buttons dead while paused, a meter crash in test stubs).
- **CPU per frame** for the game logic went from 2.79/2.74 ms to 1.72/1.90 ms (two runs each, same route, 80 traffic cars; measured in
  software-rendered Chromium). Rendering cost was not changed and **60 fps on the RTX 3050 was not measured** (no access to that GPU).

## B. Files changed

| File | Why |
|---|---|
| `src/parts/07g_drive.js` | `ptDyn` two-axle tyre model, `ptGeom`, `TSLIP` + `slipTick` (slip for smoke/squeal/audio), `INP`, `updPStep` (Realistic sub-steps); removed `ptLat`/`ptSteer` |
| `src/parts/10_laws_player.js` | Realistic path calls `ptDyn` instead of the Arcade heading/lateral lines (Arcade lines unchanged, `off_trace`); fills `INP` and `TSLIP` |
| `src/parts/12d_audio.js` (new) | engine table `ENG_DOC` (217 cars), exhaust-pulse PeriodicWave per car, engine/turbo/supercharger/EV/hybrid/diesel/rotary voices, limiter, shifts, pops, start/shutdown, misfire, tyre squeal, gravel, wind, road, traffic, impacts, volumes, mute (L), autoplay hint |
| `src/parts/12e_pause.js` (new) | pause/settings menu, quality presets, frame-time meter, `lodTick` only after 3 m camera travel, HUD write cache, hidden-tab audio suspend, save-repair notice |
| `src/parts/12_hud_loop.js` | pause branch (polls wheel buttons), `fpsTick`, `updPStep`, `audTick`, reused camera vector, `hudCache()` |
| `src/parts/02_setup.js` | canvas `z-index:0`; `ESC_PRE` first key listener |
| `src/parts/01_head.html` | HUD `.h` / `#map` on layer 3; `#top` max width; `#spd` raised |
| `src/parts/07b_tune.js` | save validation, `irbid-save-corrupt`, `irbid-save-prev`, `sv:1` marker |
| `src/parts/10c_wheel.js` | G29 centre offset, response curve, smoothing (setup screen V) |
| `src/parts/06i_infra.js`, `07e_objects.js` | sign plates: front face + plain metal back (8 vertices; bend/hide code updated) |
| `build.py` | `12d_audio`, `12e_pause` in the order list |
| `tools/make_offline.py` (new) | offline copy with three r128 inlined |
| tests (new) | `drift_v45.js`, `audio_v45.js`, `save_v45.js`, `audio_v45_pw.py`, `pause_v45_pw.py`, `playtest_v45_pw.py`, `cpu_prof_pw.py` |
| tests (edited) | `handling_test.js` (drivetrain-balance check, reason in C), `wheel_test.py` (+ Back pauses/resumes) |
| docs | this report, `CHANGELOG.md` v45, `CLAUDE.md`, `README.md`, `PLAN.md` (approved changes), `docs/screenshots/v45/` |

## C. Bugs fixed (original behaviour → cause → repair → verification)

1. **HUD invisible (since v24).** The speed, the top information bar, the drift/race text and the minimap existed and updated but were never
   seen. Cause: `initialize1080pGameDisplay` made the canvas `position:fixed` and it is appended to `<body>` after the HUD; all had
   `z-index:auto`, so DOM order put the canvas on top. Repair: canvas layer 0, HUD layer 3 (buttons 4, menus 5+). Verified: screenshot
   `docs/screenshots/v45/hud_visible.png` (v44 screenshots in `docs/screenshots/v44/` show no HUD), playtest check 1b.
2. **Mirrored text on sign backs.** Cause: one `DoubleSide` textured plate. Repair: front face + a plain grey back with the same outline
   (alpha from the atlas); the hit/bend/hide code moves all 8 vertices. Verified: screenshot, `damage_test`/`damage_v44` (sign bending) pass.
3. **Save data.** A save that did not parse was replaced by defaults on the next `save()` (progress lost); a numeric string such as `"100"`
   turned `fines+=15` into `"10015"`. Repair: unparsable save copied to `irbid-save-corrupt` first, player told; values validated (finite numbers,
   tune levels integers 0–5, known cars, de-duplicated); last good save kept as `irbid-save-prev`. Same shape, so older builds still load it.
   Verified: `save_v45` 9/9.
4. **Realistic drift at low frame rates** (found by the playtest). At 20 fps one 50 ms physics step per frame evaluated grip, steering and engine
   force too rarely; a manoeuvre that recovers at 60 fps could end in a spin. Repair: `updPStep` splits frames longer than 1/60 s into equal steps
   (Realistic only). Verified: `drift_v45` "same input at 60/30/20 fps: recovered every time". Investigation note: the first hypotheses (terrain,
   airborne frames) were checked and rejected; a remaining sensitivity is physical (the manoeuvre is at the edge of a spin).
5. **Introduced and fixed in this session** (caught by `wheel_test`, 17/40 → 41/41): (a) the wheel's Back button closing the setup also opened
   the pause menu — wheel buttons dispatch synthetic keys on `window`, where listeners run in registration order, so the setup had already set
   `ui=false`; fixed with an `ESC_PRE` snapshot in the first key listener. (b) wheel buttons were not read while paused (polling lives in `updP`), so
   a wheel user could not resume; the paused loop now polls the wheel. (c) the frame meter crashed on renderers without `info` (Node stubs).
6. **Per-frame waste** (performance, behaviour-neutral): 24,476 LOD distance checks every frame even with a still camera; HUD `innerHTML` rewritten
   every frame; a `Vector3` allocated per frame for the camera. See E.

`handling_test` change, with reason: two checks compared Realistic launch yaw with Arcade's (`RWD ... turns in at least as hard as Arcade`). They
were tied to the removed `ptSteer` multiplier; Arcade's low-speed turn rate is faster than real steering geometry allows, so the comparison no
longer describes oversteer. Replaced by the physical statement "the rear (RWD) / front (FWD) axle works harder while launching with steer".

## D. Tests

Automated, Node (stubbed DOM + real three r128): `off_trace` PASS (collider-free hash identical to v38), `realism_test` all, `damage_test` all,
`damage_v44` all, `handling_test` all, `drift_v45` 23/23, `audio_v45` 10/10, `save_v45` 9/9, `signals_test` 12/12, `val_net`, `boot`, `h2`, `h13`,
`h20` normal output; expected pre-existing values unchanged: `h24` bad 6, `vg` bad 9, `h14` bad 2, `h21` places 1729 (laz 1531), `tour` 0 off-road,
`dyn_check` bad 0, `lmchk` (every landmark <= 5 m); `place_audit.py` all passed.

Browser (Playwright, Chromium, SwiftShader software GL): `wheel_test` 41/41 (simulated G29: axes, pedals incl. combined axis, buttons, WebHID force
commands with a mock device, disconnect/reconnect; + `blocked` variant), `damage_pw`, `damage_v44_pw`, `world_v44_pw`, `audio_v45_pw` 12/12 (real
click unlocks audio, engine pitch = rpm/120, mute silences the output, volume sliders, node count constant while driving, car switch shutdown →
crank → idle, impacts rate-limited, pause suspends), `pause_v45_pw` 12/12, `dc2`, `disp`, `ios`, `shopt`, `drive_pw` (its WebGL "context lost"
console lines are the same on v43b/v44: SwiftShader).

**Real-browser playtest** (`playtest_v45_pw.py`, built game, real keyboard/mouse events): start, click enables sound, saved car selected, W
accelerates (63 km/h in 3 s), S brakes, A/D steer opposite ways, reverse, H → Realistic, handbrake drift (slip 0.38 rad, drift points), countersteer
recovery, crash into a building in Full damage (body 87 %, crash sound), Apex Drift Customs U → "Repair all" (car restored, JD charged), Esc pause
(W does nothing) and resume, graphics quality change, navigation search "Yarmouk University" + Enter (2.2 km road route), N switches owned car,
reload restores car/owned/settings, 0 page errors, 0 console errors, only three.js r128 requested. The same playtest on the **offline copy**: all
pass with **zero network requests**. Log: `docs/screenshots/v45/playtest_log.txt`; screenshots `playtest_*.png`.
Limit: SwiftShader draws ~1–2 fps, so while driving the playtest replaces `gfxRender` with a no-op (simulation and input path unchanged) and draws
again for each screenshot. It is not a substitute for a person playing on a real GPU.

**Not tested:** a physical Logitech G29 (all wheel tests use a simulated gamepad and a mock HID device), a phone, the RTX 3050 (or any real GPU),
audio heard by a person (output was measured with an AnalyserNode, nobody listened), Safari/Firefox.

## E. Performance

Conditions: Windows 11, Chromium (Playwright) with SwiftShader software GL, 1280×720 window, game buffer 1920×1080, start view, 80 traffic cars,
driving at ~70 km/h. `tests/cpu_prof_pw.py`: phase 1 runs the real loop for 20 s with rendering stubbed (≈1,200 frames) and times every
subsystem; phase 2 times 12 back-to-back `gfxRender` calls (CPU submit + software raster: an upper bound, not a GPU figure).

| | v44 | v45 |
|---|---|---|
| JS loop, mean ms/frame (2 runs) | 2.79 / 2.74 | 1.72 / 1.90 (1.94 with audio running) |
| JS loop, 99th percentile ms | 6.1 / 6.4 | 4.2 / 4.1 (5.1 with audio) |
| `lodTick` ms/frame | 0.96 | 0.06 |
| `audTick` ms/frame (sound on) | – | 0.06 |
| render submit ms (SwiftShader) | 11.7–14.0 | 11.7–14.0 (unchanged; not claimed) |
| draw calls / triangles, start view | ~970–1,070 / 235–260 k | same |

60 fps at 1080p on the RTX 3050: **not verified.** What is known: the game's own JavaScript costs ~2 ms per frame; three.js submits ~1,000 draw
calls per frame (scene ~33,600 meshes, ~9,000 visible); the GPU load is 1920×1080 with 4× MSAA HDR, bloom, a 4096² PCF-soft shadow map and an
environment cube refreshed every 14 s. To check on the laptop: Esc → "Show frame-time meter" (fps, mean and 99th-percentile frame time, draw calls).
If it is below 60: Medium (no bloom, 2048 shadows), then Low (no post chain, 1024 shadows, 0.7× detail range). Auto keeps the v40 behaviour
(drops bloom, then post-processing, if frames stay slow). The likely remaining bottleneck is CPU-side draw-call submission, not the GPU.

## F. Build

- Online build: `C:\Users\youse\OneDrive\Documents\car_race\dist\irbid-drive.html` (verified present; three.js r128 from cdnjs).
- Offline copy: `dist\irbid-drive-offline.html` (`python tools/make_offline.py`; three.js inlined; git-ignored).
- Fallback: git tag `backup/v44` (and `backup/v43b`); every v45 part is a separate pushed commit.

## G. Remaining issues (priority order)

1. P2 — 60 fps on the RTX 3050 unmeasured; draw calls (~1,000) are the main CPU cost; no merged-mesh / batching pass was done.
2. P2 — Engine sounds are synthesised approximations; the engine layouts come from general knowledge (58 cars "variant not specified by the
   game"), not per-car citations. No licensed recordings were added.
3. P2 — Realistic handling is a simplified tyre model with estimated coefficients (one generic curve, body-type peak slip, no per-wheel model,
   no differential model, combined slip only through a friction circle per axle). Arcade drift is unchanged by request.
4. P2 — Car visuals (Part 8: proportions, interiors, materials) were **not** changed in v45.
5. P2 — Map/geography (Part 10): no new data or projection changes; the existing checks (`val_net`, `lmchk`, `h21`, `tour`, `place_audit`) pass.
6. P3 — Traffic AI (Part 11) unchanged since v44 (signals fix); traffic cars have one shared engine voice (nearest car), not one each.
7. P3 — No fixed-timestep accumulator for Arcade (it must stay v38-identical); Realistic uses bounded sub-steps instead.
8. P3 — The long HUD help line is still dense on small screens; touch layout not re-checked on a phone.

## H. Manual test instructions

1. Open `dist/irbid-drive.html` (or the offline copy) in Chrome or Edge on the laptop. Click once: the engine starts (crank, then idle).
2. Steering: hold W, then A / D. H switches to Realistic; at speed, Space + A starts a slide; steer D into it and straighten to catch it.
3. G29: press V. Detect the steering axis, set the centre with the wheel straight, calibrate throttle/brake (and clutch), bind buttons, press
   "Connect force feedback" (Chrome/Edge, game in its own tab), "Test ◀ / ▶", "Auto-detect direction". Close with the Back button; press Back again
   to pause and once more to resume. Check that turning the wheel left turns the car left.
4. Audio: Esc → volume sliders; L mutes. Try a V8 (Ford Mustang GT), a flat-six (Porsche 911), a rotary (Mazda RX-7 FD3S), a diesel (Toyota
   Hilux) and an EV (Tesla Model 3) with N/B after unlocking them.
5. Damage: I until "Full", hit a wall; O shows the diagnostics; drive to Apex Drift Customs (Repair button routes you), U → Repair.
6. Map: M → type a place → Enter for a route; K tours landmarks.
7. Performance: Esc → Show frame-time meter; try Auto/High/Medium/Low.

## I. Next steps (highest value)

1. Measure on the RTX 3050 with the frame meter and, if needed, cut draw calls (merge static props per chunk, fewer shadow casters).
2. Per-wheel tyre forces and a limited-slip differential in Realistic mode; tune per car with the owner driving.
3. Licensed engine recordings (CC0/CC-BY, verified per file) for a few signature cars, layered over the synthesis.
4. Car model quality pass (silhouettes, wheel arches, interiors) for the most-driven cars.
5. Test with the physical G29 and a phone; fix what that reveals.

## J. Final honesty check

- Not tested: physical G29, real GPU frame rate, phone/touch, human listening, Safari/Firefox.
- Assumptions: engine layouts per car (general knowledge), all tyre/handling coefficients, the audio synthesis model.
- Partial: Part 8 (car visuals) not done; Part 10/11 only re-verified, not improved; quality presets do not change resolution (the 1080p buffer is
  an owner constraint); no Arcade fixed timestep (owner constraint: Arcade identical to v38).
- No authentic engine sounds, no claim of real-world accuracy beyond what the existing data checks prove.

## Part 20 checklist

| Item | Status / evidence |
|---|---|
| Existing project preserved, backup | yes: tag `backup/v44`, separate commits |
| Canonical source + build | `src/parts/*` → `build.py` → `dist/irbid-drive.html` |
| Startup failures | none found; playtest 0 page/console errors |
| Steering traced end to end, left/right tested | keyboard, touch, analog wheel path: `drift_v45`, `wheel_test`, playtest 6 |
| Acceleration / braking | playtest 4–5, `handling_test`, `phys_brake` (v41) |
| Physics stability | `drift_v45` random 4–50 ms frames, 7 cars, finite + bounded; 60/30/20 fps |
| Drifting and grip | `drift_v45`, playtest 8 |
| Damage and repair, settings preserved | `damage_test`, `damage_v44`, playtest 9–10; Off/Cosmetic/Full unchanged |
| Audio init, volume, missing support | `audio_v45_pw`, `audio_v45` (no Web Audio = no crash) |
| G29 limitations documented | yes (sections D, G, H) — physical wheel untested |
| Coordinates / roads / navigation | `val_net`, `lmchk`, `h21`, `tour`, playtest 13 — unchanged data |
| Place provenance | unchanged (`place_audit`) |
| Vehicle visuals improved | **no** |
| Traffic checked | `h13`, `dyn_check`, `signals_test` |
| Performance vs baseline | section E (CPU only) |
| Memory / cleanup | audio nodes constant; impact sources released on end; particle pools fixed size (unchanged) |
| UI controls | playtest, `pause_v45_pw`, `shopt`, `ios`, `disp` |
| Save compatibility | `save_v45` (v44 save loads unchanged) |
| Offline build | `make_offline.py`; playtest offline, 0 requests |
| Attribution | `#osmcr` unchanged; three.js licence header kept in the offline copy |
| Real browser tests | yes (software GL) |
