# Platform support (v47, 2026-10-19)

The game is one HTML file (`dist/irbid-drive.html`, needs cdnjs for three.js r128) or its offline copy (`tools/make_offline.py`, no network).
It runs wherever a browser has WebGL 1 or 2. Nothing is installed.

## What was actually tested

| Platform | How | Result |
|---|---|---|
| Chromium (Chrome / Edge engine), Windows | Playwright Chromium, SwiftShader software GL, all v38–v47 browser tests | see `docs/TEST_REPORT.md` |
| Firefox engine, Windows | Playwright Firefox (`tests/xbrowser_pw.py`) | see `docs/TEST_REPORT.md` |
| WebKit (Safari's engine), Windows | Playwright WebKit 27.2 (`tests/xbrowser_pw.py`) | see `docs/TEST_REPORT.md` |
| iPhone 13 / iPad (gen 7) | Playwright WebKit device emulation (viewport, touch, mobile UA) | see `docs/TEST_REPORT.md` |
| Android (Pixel 7) | Playwright Chromium device emulation | see `docs/TEST_REPORT.md` |
| Real Safari on macOS, real iPhone, iPad, Android phones, Linux, macOS | **not tested** (no such devices here) | unverified |
| Logitech G29 | **not tested** with the real wheel | unverified |

Emulation checks engine compatibility, layout and touch handling. It does not check real-device speed, memory, thermal throttling,
iOS audio policies or Safari UI bars. Playwright's WebKit on Windows has **no Web Audio**; the game detects that and runs silently with a
notice. Real Safari has Web Audio (`webkitAudioContext` is also handled).

## Robustness built in (v47 unless noted)

- **No WebGL:** a readable message (`#nogl`) instead of a blank page. Tested by blocking WebGL in Chromium.
- **three.js failed to load** (online copy while offline, or cdnjs blocked): message pointing to the offline copy (`#nolib`, v45).
- **WebGL context lost** (GPU reset, driver update, mobile memory pressure): the game pauses with a message and resumes when the browser restores the
  context; three r128 re-uploads its resources. Tested with `WEBGL_lose_context` (lose and restore, then the scene is drawn again).
- **Uncaught errors:** a short banner (`#errBan`) instead of silent failure.
- **Loading screen** while the city is built.
- **Portrait phones:** a "turn your phone sideways" hint (the touch pads are laid out for landscape).
- **Feature detection:** Web Audio, Gamepad API, `Intl` time zones, `localStorage` (every read and write in try/catch), touch (`pointer:coarse`),
  `deviceMemory`. The pause menu shows what the device offers.
- **Inputs:** keyboard, mouse, touch pads (touch devices only), Gamepad API wheels (G29 mapping, rebindable).
- **Screens:** 16:9 letterboxed canvas; HUD uses safe-area insets; Low quality renders 1280x720 for weak GPUs; traffic density for weak CPUs.

Recommended on phones: Quality **Low**, Traffic **Low** (the pause menu suggests this on touch devices).

## Android and iOS apps (Capacitor 8)

`app/` is a Capacitor 8.5 project that wraps the **offline** single file. The game code is not changed, and there are no native plugins.

```bash
python build.py && python tools/make_app_www.py   # app/www/index.html = offline build (git-ignored)
cd app && npm install                            # @capacitor/core, cli, android, ios 8.x
npx cap sync                                     # copies www into android/ and ios/
npx cap open android                             # Android Studio: Run, or Build > Generate Signed Bundle
npx cap open ios                                 # Xcode on a Mac: Run, or Product > Archive
```

Requirements (from the [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup), read 2026-10-19):
- **All:** Node.js 22 or newer (this PC: Node 24).
- **Android:** Android Studio 2025.2.1 or newer (it brings its own JDK), Android SDK Platforms API 24 or newer. **Not installed on this PC.** Installing
  means accepting Google's SDK licence, which is the owner's decision. So no APK has been built here.
- **iOS:** macOS with Xcode 26.0 or newer and the command-line tools. The project uses Swift Package Manager (Capacitor 8 default). **Cannot be built on Windows.**
- **Publishing:** a Google Play developer account and an Apple Developer Program membership (both paid, owner's accounts). Nothing has been submitted,
  and no store approval exists.

App id `com.yousefkhasawneh.irbiddrive` (change it in `app/capacitor.config.json` before the first store upload; it cannot change afterwards).

## macOS / Windows / Linux desktop

The browser game already runs on all three. A packaged desktop app (Electron or Tauri) would add only a window around the same file; not done,
because a browser bookmark or the offline HTML file gives the same result without a second toolchain.
