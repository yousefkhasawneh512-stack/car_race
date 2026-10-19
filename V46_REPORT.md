# V46 REPORT — gears, horn, auto-drive, traffic memory, weather and local time

Request: "IRBID DRIVE — MASTER RESEARCH, AUTONOMOUS IMPLEMENTATION AND PERMISSION ADDENDUM" (2026-10-19), read together with the v44/v45
master prompt. Backup before any change: git tag `backup/v45` (pushed). Everything below was built on top of v45; nothing was removed.

## A. What was already done (v45) and what this addendum added

The v45 work (Realistic tyre model and drift, synthesised engine audio for 217 cars, pause/settings/quality, save validation, the HUD layering
fix, G29 centre/curve/smoothing) is in `V45_REPORT.md`. The addendum asked for items v45 did not cover, and v46 adds them:

| Addendum item | v46 |
|---|---|
| "Map Q to downshift and E to upshift", paddle shifters | Manual gearbox in Realistic handling: Q / E and the G29 paddles (new default buttons) |
| Horns, collision sounds, distance falloff, camera-dependent audio | Player horn (X); traffic horns with stereo pan, distance gain and distance low-pass; rain + wet-tyre audio. Collision sounds and the cockpit-view filter already existed (v45) |
| Bots remember interactions, bounded persistent reputation, predictable rules | Road reputation (traffic) + rival memory (named racers), fixed documented rules, saved, bounded |
| Automatic driving on the road network, same physics, never teleport | Auto-drive (Z) along the navigation route, through the same `updP` |
| Weather, local time, seasons; wet grip from the tyre model | Simulated weather from the JMD climate table for Irbid; wet grip in Realistic only; Irbid local clock |
| Live G29 diagnostic view; "steering detected but the car does not turn" | Already present (setup screen V: live steering/throttle/brake/clutch bars, raw axes; v42 fix + tests). Re-verified by `wheel_test` |
| Test the built game in a browser | `v46_pw.py` + all earlier Playwright checks, see E |

Not done (and why) is in section H.

## B. Research used (only sources that changed a number in the code)

| Source | Used for |
|---|---|
| Jordan Meteorological Department, "Weather Information for Irbid", climate table 1985–2018 (as cited on en.wikipedia.org/wiki/Irbid) | Rain days per month: Jan 11.3, Feb 10.6, Mar 9.4, Apr 4.6, May 2.0, Jun 0.2, Jul 0, Aug 0, Sep 0.2, Oct 3.2, Nov 6.0, Dec 9.6 |
| hpwizard.com tyre friction table (dry asphalt 0.8–0.9, wet 0.5–0.7); B. Persson et al., "Rubber friction on wet and dry road surfaces: the sealing effect" (arXiv cond-mat/0502495: ~20–30 % lower friction when wet) | Wet grip factor 0.72 at a fully wet road (a ratio inside the published 0.6–0.8 range; an estimate, not a measurement for any tyre) |
| MDN Intl.DateTimeFormat (timeZone option) | Irbid local time via `Asia/Amman`; fallback UTC+3 (Jordan has kept UTC+3 all year since late 2022) |
| MDN Web Audio: StereoPannerNode, BiquadFilterNode, one-shot sources | Traffic horns (pan, distance gain, distance low-pass), node clean-up on `ended` |
| MDN Gamepad API (button indices are browser/device specific) | Paddle defaults are only defaults; every action stays rebindable in V |

## C. Changed files

| File | Change |
|---|---|
| `src/parts/11c_assist.js` (new) | gearbox preference + Q/E, horn, road reputation + rival memory, auto-drive (`apInput`, `apProg`, `apPt`), AUTO badge |
| `src/parts/12f_weather.js` (new) | weather state, climate table, rain streaks, sky/fog/light/road effects, Amman clock, `wxLine` |
| `src/parts/07g_drive.js` | manual gear requests, over-rev refusal, limiter cut in Manual, HUD `M<gear>` |
| `src/parts/10_laws_player.js` | Q/E keys; auto-drive input hook (`wi`); wet grip in Realistic; **speeding / red-light bug fixes** |
| `src/parts/10c_wheel.js` | new bindable actions (shift up/down, horn hold, auto-drive), new defaults, saved-layout migration |
| `src/parts/09_ai.js` | following gap behind the player from reputation (`REPG.gap`, 6.5 m unless reputation < 50) |
| `src/parts/11b_nav.js` | route `legs` kept on `NAV` (posted limit + signal per leg for auto-drive) |
| `src/parts/12d_audio.js` | horn, traffic horns, rain, wet-tyre hiss |
| `src/parts/12e_pause.js` | gearbox button, reputation line, weather + clock selectors, key list |
| `src/parts/02b_sky.js` | cloud-cover uniform `uCov` (0 = the v45 sky, unchanged) |
| `src/parts/12_hud_loop.js` | calls `wxHour`, `wxTick`, `assistTick` |
| `build.py` | order: `11c_assist` after `11b_nav`, `12f_weather` after `12e_pause` |
| tests | `assist_v46.js` (new, 32 checks), `v46_pw.py` (new), `wheel_test.py` (+2 checks; handbrake button 5 -> 6 because the defaults changed) |
| docs | this report, `CHANGELOG.md`, `CLAUDE.md`, `README.md`, `PLAN.md` (approved changes) |

No new library, asset, network host or runtime dependency. All sounds are synthesised (nothing to license).

## D. Root causes of the bugs fixed

1. **Speeding fines while crossing junctions** (pre-existing). The speed limit comes from the nearest road (`roadAt`). In a junction the nearest
   road is often the cross street, so a car at 56 km/h on a 60 km/h road was fined as "speeding" against the side street's 40 km/h. Found by the
   auto-drive test (39–43 frames per 1.4 km route). Fix: a limit counts only after the car has been on that road for 1.5 s (`LIMT`).
2. **Red lights not enforced on most of the map** (pre-existing since v37). `redLight()` required `P.y < 1.5`, written as "not airborne" before
   terrain existed. Since v37 `P.y` is the absolute height, so the rule only worked where the ground is within 1.5 m of Al-Balad's level. Found
   while testing auto-drive at a red light. Fix: height above the ground, `P.y - TH(x,z) < 1.5`.
3. **Introduced and fixed during this work** (reported for honesty): three edits put a `//` comment in the middle of a dense one-line statement,
   which commented out the rest of that line. One of them removed `const toastEl`, which would have crashed the game at the first message;
   `audio_v45` caught it (the other Node tests stub `toast`). All changed parts are now syntax-checked one by one, and CLAUDE.md warns about it.
4. **Auto-drive circling at the start** (found in testing, before release): progress was measured as the nearest route POINT, and route points
   can be 40 m apart, so the steering target stayed next to the car. Now the car is projected onto the route segment (`apProg`).
5. **Auto-drive creeping over the stop line** (found in testing): with a zero target speed it released the brake inside a 0.8 m/s dead band.
   It now holds the brake while waiting, and stops 13.5 m before the junction node because the red-light rule watches a 12 m circle.

## E. Tests

All run on the final build (2026-10-19, this Windows machine; Node 24, Chromium via Playwright with SwiftShader).

**New, `assist_v46.js` (Node, real world: roads, buildings, terrain; 32/32 pass).** Selected results:
- A v45 wheel layout keeps handbrake 5 / camera 4; shift actions stay unbound, horn / auto-drive take free buttons 10 / 11.
- Manual gearbox: held at the limiter in 1st (7,200/7,200 rpm, +0.2 km/h in 2 s), E 1st->2nd, Q 4th->3rd, downshift refused at 198 km/h,
  E at the bank still robs, Arcade only explains; Automatic still shifts (reaches 5th).
- Wet road (Realistic): 80->0 km/h in 24.2 m dry vs 31.3 m wet; Arcade 23.334 m both (identical).
- Climate: July never rains (4,000 blocks); January 16.3 % of blocks rainy (expected 11.3/31 x 45 % = 16.4 %), October 3.6 %.
- Reputation 70 -> 64 for a traffic hit (cooldown respected), bounded at 0 with a 12 m following gap, +1 after 45 s clean, saved, log capped at 20;
  rivals record results; a rival beaten 5 times races at skill 1.024 (base 1.00).
- Auto-drive on a real 1,366 m route from the start: arrives and stops in both modes (Arcade 115 s, Realistic 113 s), 0 teleports,
  max 5.6 m / 4.9 m from the route centre line, 0 fines. At a signalled junction with a red light: stops, enters on green, 0 red-light fines
  (both modes). A steering key hands control back.

**New, `v46_pw.py` (Chromium, the built game; 15/15 pass):** rain streaks only in rain; rain sky blue-red 0.38 -> 0.19, brightness 2.26 -> 2.05,
fog 900 -> 392 m; wet road roughness 0.50 -> 0.20; weather labelled "simulated, not live" with the JMD source; pause menu rows; weather and
clock stored; local clock = Amman time (16.049 vs 16.051 h); route set by typing "Irbid Park" in the real search box (M) -> 3,048 m route;
Z starts auto-drive and the badge shows; the car moves by itself (4.2 m: headless Chromium runs ~2 frames/s, so only ~2 s of game time);
a held A key takes over; X horn on while held (gain 0.16), off on release; E in Realistic shifts 1 -> 2 and the HUD shows `M2`;
no page errors, no network requests. Screenshots: `docs/screenshots/v46/` (weather_clear, weather_rain, pause_v46, autodrive).

**Regression (unchanged results):** `off_trace` collider-free hash identical to v38 (and the with-world hash unchanged); `realism_test`,
`damage_test`, `damage_v44`, `handling_test`, `drift_v45` (23), `audio_v45` (10), `save_v45` (9), `signals_test`: all pass. `h24` bad 6, `vg` bad 9,
`h14` bad 2, `h21` 1,729 places (laz 1,531), `tour` 0 off-road, `h16` 0, `dyn_check` ok, `lmchk` ok, `val_net`/`boot`/`h2`/`h13`/`h20` same shape
as v45 (all the expected pre-existing values in CLAUDE.md). Playwright: `damage_pw`, `damage_v44_pw`, `world_v44_pw`, `audio_v45_pw`, `pause_v45_pw`,
`dc2`, `disp`, `ios`, `shopt`, `drive_pw` (no errors), `wheel_test` 43/43 (+ paddles shift up/down, horn button held/released) and the
`blocked` variant, `place_audit` all pass. `playtest_v45_pw` (21 real keyboard/mouse checks): 21/21 when run alone and 21/21 on the offline copy
with zero network requests. In the full parallel run, while other Chromium tests were running on the same CPU, one check failed once
("9. driving into a building damages the car": the car did not reach the wall in the time allowed at the lower frame rate); it passed on
both re-runs. Not run: anything on real G29 hardware, a phone, or the owner's RTX 3050.

## F. Performance

No new per-frame allocation. Per frame: auto-drive (only when on) walks the route legs and the 84 cars once per physics step; reputation scans
traffic every 0.25 s; weather updates a few colours and fog values and touches the road materials only when wetness changes by 2 %; rain is
one extra draw call (1,800 line segments positioned in the vertex shader). Not measured on the owner's RTX 3050; the frame-time meter (Esc) shows it.

## G. How to test by hand

1. Esc → Weather: **Rain**. The sky greys, rain falls, roads darken over ~40 s. Press H (Realistic) and brake hard from 80 km/h: it stops later
   than with Weather: Clear. Esc → Clock: **Irbid local time**: the sun follows the real time of day.
2. Press H (Realistic), drive, press **E** / **Q** (or the wheel paddles): the HUD shows `M2`, `M3`… Hold the revs at the limiter in 1st: no
   more acceleration. Try Q at high speed: "Downshift refused". Esc → Gearbox switches back to Automatic.
3. Press **M**, choose a destination, then **Z**: the blue AUTO badge shows the target speed and why (limit, curve, red light, car ahead,
   arriving). Touch any steering/gas/brake key to take over.
4. Hold **X** for the horn. Hit a traffic car: it honks (from its side). Stop in front of traffic: the car behind honks after a while.
5. Esc shows the road reputation and, after a race (R), each rival's record.
6. G29: the right paddle shifts up, the left shifts down (Realistic). If your wheel reports different button numbers, rebind them in V.

## H. Limits and what was not done

- **Weather is simulated, not live.** Open-Meteo was not added: it would add a network host (constraint 8: single file, no network calls) and its
  terms of use are for the owner to accept. The game shows "simulated, not live" in the menu. How much of a rainy day it rains (45 %), the cloudy
  chance on dry days, and wetting/drying times are estimates. Temperature is not used for grip (as the addendum asks).
- **Wet grip affects Realistic handling only.** Arcade physics must stay identical to v38 (`off_trace`), so Arcade looks wet but grips the same.
- **Auto-drive** is a rule-based driver: it does not change lanes, overtake, yield at unsignalled junctions or roundabouts to crossing traffic,
  or avoid pedestrians (none exist). It can be blocked and then gives up after 6 s. It was tested in Node on real routes and in Chromium, not
  over long drives at full frame rate.
- **Reputation** is a set of fixed rules, not learning. Traffic cars are anonymous and respawn, so "traffic remembers" means the road
  reputation as a whole, not individual drivers. Duel opponents (random traffic models) are not remembered; the three named racers are.
- **G29**: paddle button numbers (4 right, 5 left) are the commonly reported Chrome layout; the owner's real wheel has still not been tested.
  Force feedback claims are unchanged from v42 (WebHID, not verified on hardware).
- **Horn and rain sounds** are synthesised approximations, not recordings of any car.
- **Two fine-rule bug fixes change gameplay**: red lights are now enforced everywhere (previously only near Al-Balad's level), and crossing a
  slower side street is no longer a speeding fine. Fine amounts are unchanged.
- Not re-done in v46: car model visuals, map data, traffic AI beyond the following gap and horns (v45 report).
