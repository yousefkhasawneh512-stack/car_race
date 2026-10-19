# Known issues and limits (v47, 2026-10-19)

## Needs the owner (cannot be done safely without you)

- **Real car models.** The 217 cars are generic procedural bodies. Licensed models need your Sketchfab or CGTrader account, a licence and
  trademark decision, and a size budget (typical free models are 25–74 MB). See `docs/ASSET_SOURCES_AND_LICENSES.md`.
- **Recorded engine sounds.** Freesound needs your login to download, and each sound needs a CC0 or CC BY check. Until then the engine is synthesised.
- **Android / iOS app builds.** `app/` is ready (Capacitor 8), but this PC has no Android SDK or JDK (installing it means accepting Google's
  SDK licence), and iOS needs a Mac with Xcode 26+. Store publishing needs your developer accounts. See `docs/PLATFORM_SUPPORT.md`.
- **Live weather** (Open-Meteo): it would add a network host, and its terms are yours to accept. Weather is simulated from the JMD climate table.
- **Speed bumps near schools and clinics** are estimated positions (open decision in `PLAN.md`).

## Not verified on real hardware

- Logitech G29 (paddles, horn and auto-drive buttons: numbers can differ; rebind with V).
- 60 fps at 1080p on the RTX 3050 (headless tests use a software renderer; see `docs/PERFORMANCE_REPORT.md`).
- Real iPhone, iPad and Android phones. Only Playwright's WebKit and Chromium device emulation were run.
- Real Safari on macOS (Playwright's WebKit build on Windows is the same engine, not the same browser).

## Game limits

- The whole city is built at load (no streaming); loading takes several seconds on phones. LOD radii and chunk culling keep the frame cost bounded.
- Auto-drive follows rules: no overtaking, lane changes or give-way at unsignalled junctions.
- Traffic is rule-based along the road graph. Distant cars use the same simple model as near ones (cost measured in `docs/PERFORMANCE_REPORT.md`); the v47 density setting lowers the count.
- Footprints are rectangles; most building heights are estimates; OSM coverage is partial (schools badly under-mapped).
- The attribution line overlaps the GAS pad on narrow phones.
- Headless Chromium (SwiftShader) loses and restores the WebGL context once at startup; the game recovers. Not seen on a real GPU yet.
- `npm audit` in `app/`: 3 moderate issues in the build-time Capacitor CLI (`uuid` via `xcode`); not shipped in the app.

## Added in v48

- The cockpit view has no dashboard or interior (the procedural cars have none); you see the bonnet from the driver's eye height.
- Driving-school lessons pick the nearest suitable street to the start; the streets found today are unnamed 40 km/h streets 80 m to 1.6 km away.
  The traffic-light lesson's light follows the normal 60 s cycle, so you may arrive on green. Pedestrians (none exist) and give-way at unsignalled
  junctions are not part of the lessons.
- Driver assists apply only in Realistic handling (Arcade has no tyre model to assist).
- Multiplayer, in-game content updates, admin publishing and public hosting are blocked on infrastructure (`docs/MULTIPLAYER_PLAN.md`).
