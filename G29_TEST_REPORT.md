# Logitech G29 test report (v42, 2026-10-17)

**Bottom line:** every result below comes from automated tests with a **simulated** G29: a mock Gamepad API pad and a mock WebHID device in
Chromium (`tests/wheel_test.py`). **No physical G29 was connected in this environment**, so real hardware behaviour has not been tested:
- axis numbering on your OS and driver;
- pedal noise;
- whether G HUB holds the device;
- real force-feedback feel.

## 1. How the wheel is read (`src/parts/10c_wheel.js`)

| Item | Implementation |
|---|---|
| API | Browser [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API), polled once per frame from `updP` (`WH.poll`) |
| Detection | `gamepadconnected` / `gamepaddisconnected` events plus a 1 s rescan; a device counts as a wheel by id (Logitech vendor 046d, G29/G27/G25/G920/G923, "wheel"), or because you chose it in setup (v42: "Other controllers seen → Use …") |
| Steering | any axis (detected: turn the wheel right and hold); inversion detected automatically; range 270–900°; steering lock; dead zone |
| Pedals (v42) | **Calibrate** first measures the pedal **released** (averaged for 0.4 s), then **fully pressed**. Separate axes, reversed axes and **combined pedals** (throttle and brake on one axis, opposite directions) all work. Each pedal has a dead zone at both ends (0–15 %, default 3 %). If an axis later reads past its calibrated released end, that end moves; this covers browsers that report 0 until a pedal is first touched. |
| Clutch (v42) | can be calibrated and is shown live. **It is not used by the driving model**, because both handling modes use an automatic gearbox. |
| Buttons | bindable to handbrake, camera, reset, race, cars, wheel spin, rob, shop, +1 h, tour, Esc |
| Into the car | `updP` ORs wheel input with the keyboard and touch pads: analog throttle scales drive force (Arcade) or engine torque (Realistic), analog brake scales braking, and steering sets the steering angle |
| Force feedback | WebHID with the Logitech constant-force protocol: centring spring, self-aligning pull, kerb rumble and impact jolts. Falls back to gamepad rumble. |
| Live readings (setup, key V) | steering %, throttle %, brake %, clutch % with bars; the raw value of every axis; which axis is mapped to what (and "combined pedal axis" when it applies) |
| Diagnostics (key O) | one line showing the wheel name with live steer, throttle and brake, or "none detected" / "gamepad access blocked" |
| Messages | No Gamepad API: "use Chrome or Edge on a desktop". Blocked by an embedded page: "open the game in its own tab". No wheel: a yellow "readings below are not live" with hints (turn the wheel or press a button; close G HUB profiles). Values show "–" and nothing is applied to the car. |
| Settings | own localStorage key `irbid-wheel` (the `irbid-save` game save is not touched) |

## 2. Automated results

`python tests/wheel_test.py dist/irbid-drive.html` gave **40 / 40 PASS** (2026-10-17, v42 build):

| Group | Checks |
|---|---|
| Detection | wheel detected by id; setup screen opens on first run; WebHID force feedback auto-connects |
| FFB init | autocenter off, 900° range, stop command sent |
| Steering axis | detected; inverted axis detected |
| Pedal calibration (v42) | asks for released pedals first, then the full press; throttle axis 2 and brake axis 3 with the correct released/pressed ends |
| Buttons | binding works; a wheel button closes setup; a bound button toggles the camera |
| Throttle → car | 50 % pedal gives about half the speed gain of 100 % in 1 s |
| Brake → car | a light brake slows less than a hard brake (from 108 km/h) |
| Steering → car | right turns right, left turns left, more lock gives more yaw |
| Handbrake | the bound button holds the handbrake |
| Force feedback | centring opposes the wheel angle; neutral at centre; pull toward a slide; collision jolt; test pulse; menus release the wheel; auto-detect flips a reversed motor, then confirms; blur sends stop |
| Other inputs | keyboard throttle and steering still work with the wheel connected; touch pads still drive |
| v42 live readings | setup shows "input live" and the throttle at exactly 50 % at half travel |
| v42 clutch | calibrates on its own axis; reads 50 % at half travel |
| v42 combined pedals | throttle and brake calibrate on the same axis; 60 % each way reads throttle 0.6 / brake 0, then brake 0.6 / throttle 0 |
| v42 released-end correction | calibrated rest 0, real rest +1: corrected to +1 and half travel reads 50 % |
| v42 dead zone | a 2 % resting deflection reads 0 |
| v42 disconnect | input marked not live, pedals 0, setup says "No wheel detected", readings show "–"; reconnect detected |
| Storage | settings stored under `irbid-wheel` only |

`python tests/wheel_test.py dist/irbid-drive.html blocked` also passes: when the page blocks the Gamepad API, the game keeps running, the
state is flagged "blocked" and there are no page errors.

## 3. Not tested (needs the real device)

- A physical G29 on Windows, macOS or Linux, its actual axis numbers, and real pedal noise.
- WebHID force feedback on real hardware. The 7-byte constant-force report follows the open-source Linux `lg4ff` driver but was only checked against a mock.
- G29 PlayStation/PC mode switch, G HUB interference, and Firefox/Safari (no WebHID; Gamepad API support varies).

To test it yourself:
1. Open `irbid-drive.html` in Chrome or Edge in its own tab.
2. Press **V**.
3. Turn the wheel and check the live bars and the "raw axes" line.
4. Calibrate the pedals.
5. Press **Connect force feedback**, then **Auto-detect direction**.

## v43 (2026-10-17)

No wheel code changed. `wheel_test` 40/40 and `blocked` 2/2 on the v43 build. One run under heavy machine load failed the centring
check by 1 unit (121 vs < 120) and passed when rerun alone (also 40/40 on v42): a timing-sensitive check, noted in FINAL_TEST_REPORT.md.
**Still no physical G29 test.**
