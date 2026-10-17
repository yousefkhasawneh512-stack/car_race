# Irbid Drive

An open-world 3D driving sandbox set in Irbid, Jordan, built on real map data. The streets, building footprints and
places come from OpenStreetMap, and the terrain comes from NASA SRTM elevation data. Drive in traffic, drift for points, race,
rob the bank, and navigate the city. The whole game is one self-contained HTML file (Three.js r128 + WebGL, no framework,
no backend).

**Author:** Yousef Khasawneh

> **AI-generated code:** the source code in this repository was written with AI assistance (Anthropic's Claude), under
> the author's direction and review. It is a hobby project, not production software.

![screenshot](docs/screenshot.png)

## Play

Open `dist/irbid-drive.html` in a modern desktop or mobile browser. An internet connection is needed the first time, because
Three.js loads from cdnjs. The world takes a few seconds to build.

| Key | Action |
|---|---|
| W / S or ↑ / ↓ | gas / brake + reverse |
| A / D or ← / → | steer |
| Space | handbrake (drift) |
| C | camera (chase / hood) |
| R | start a race at the nearest circuit, or duel the car next to you |
| E | rob the bank (when near it) |
| U or P | Apex Drift Customs upgrade shop (when near it) |
| G | wheel spin (unlock cars with JD) |
| N / B | cycle owned cars |
| M | search places, neighbourhoods and streets / turn-by-turn directions |
| H | handling: Arcade (default) / Realistic (engine, gears, traction, suspension) |
| I | vehicle damage mode: Off / Cosmetic / Full |
| O | vehicle diagnostics: damage report, per-wheel tyres, repair |
| J / K | stunt ramps / landmark tour teleport |
| T / F | +1 hour / reset to start |
| V | racing-wheel setup (Logitech G29, with force feedback via WebHID in Chromium) |

On touch devices, on-screen pads appear (steer left/right, brake, gas, drift).

**Vehicle damage** (button top-right or **I**; each car keeps its own damage, saved in the browser):

| Mode | What happens |
|---|---|
| **Off** (default) | Nothing is recorded. The car drives exactly as in earlier versions. Roadside objects are solid. |
| **Cosmetic** | Dents where you hit, broken lights, cracked glass, scuffs, tyre wear tracked. Performance is never reduced. Signs and poles can bend or break; dumpsters get shoved. |
| **Full** | Everything above, plus mechanical damage: engine/radiator (overheating), transmission, driveline, steering, brakes, suspension per corner, wheel alignment (the car pulls), worn/overheated/punctured tyres lose grip. Hard landings damage the suspension. |

- **Diagnostics (O):** every component with its condition and effect, a top-down body map, and a card per wheel (tread,
  carcass, temperature, grip, load, slip, wear by cause). "Repair all" and "Replace tyres" are free.
- **Burnout** (Cosmetic/Full): throttle + brake at a standstill (front-wheel drive: throttle + handbrake). It only works if the car
  has the power to overcome its driven wheels' grip, so strong rear-drive cars can, all-wheel drive and weak cars can't. Burnouts and
  drifts heat and wear the tyres that are actually spinning or sliding.
- Car masses, layouts and strengths are **gameplay estimates** (see `manifest/cars.json`); there is no crash-test data.

**Gameplay:**
- **Drift points** come from sliding the car and buy per-car upgrades (speed, acceleration, handling, extra drift).
- **JD** comes from the fine system and bank-heist loot and pays for the car-unlock wheel. There are 217 car models in 5 rarity tiers.
- **Progress** is saved in the browser's `localStorage`.

## Develop

The source is split into parts under `src/parts/`. `build.py` concatenates them in a fixed order into
`dist/irbid-drive.html`, and that order is also the dependency order.

```bash
python build.py                                   # -> dist/irbid-drive.html
npm install                                       # three@0.128.0, used by the headless tests
node tests/boot.js dist/irbid-drive.html          # one headless check (stubbed DOM, real three.js)
node tests/realism_test.js dist/irbid-drive.html  # damage / breakable poles / speed bumps (PASS/FAIL)
node tests/damage_test.js dist/irbid-drive.html   # localized damage, modes, tyres, burnouts, objects (50 checks)
node tests/off_trace.js dist/irbid-drive.html     # damage Off = identical physics to v38
pip install playwright && python -m playwright install chromium
python tests/drive_pw.py dist/irbid-drive.html    # real-browser check
python tests/damage_pw.py dist/irbid-drive.html   # real-browser damage screenshots
```

The game's map data is already baked into `src/parts/03a`–`03d`, so building and playing need nothing else. The raw
OpenStreetMap/SRTM input files are **not included in this repository**. Only the converter scripts are
(`osm/gen_world.py`, `osm/net.py`, `osm/bld/conv.py`, `osm/overpass/*.py`, `osm/terrain/gen_terrain.py`). Places are refreshed
with `python osm/overpass/fetch.py` (downloads from the Overpass API) then `python osm/overpass/build.py --game`. Never edit the generated `src/parts/03a`–`03d` files by hand.

More detail for contributors:
- `CLAUDE.md`: architecture, constraints and the test baseline.
- `PLAN.md`: roadmap.
- `CHANGELOG.md`: version history.
- `AUDIT_REPORT.md`: v39 audit (what changed, what is real, what is estimated, what is missing).
- `DATA_SOURCES_AND_LICENCES.md`, `manifest/`: data sources, licences, car / place / photo / object manifests.

## Accuracy notes

- Road centrelines, building footprints and places are real OpenStreetMap data. Road widths and speed limits are typical
  values for each road class unless OSM tags them. Building heights are mostly estimated, and OSM coverage of Irbid is incomplete.
- About 1,660 searchable places (shops, mosques, schools, landmarks, neighbourhoods, villages) and about 46,000 real buildings across the
  whole map. Where OSM has no buildings, simple generated ones fill in. Landmarks stand at their OSM positions; see
  `PLACE_IMPORT_REPORT.md` and `NAME_CORRECTIONS.md` for what was checked, corrected and is still uncertain.
- The terrain uses a 1 km SRTM grid, so narrow valleys are smoothed out.
- The speed bumps are **estimated** positions near mapped schools, clinics and parks, not surveyed locations.
- Car durability, masses, handling and economy values are gameplay balance, not real-world data. The cars are simple
  procedural shapes sized to each car, not licensed 3D models.
- Schools are under-mapped in OSM: the Ministry of Education lists 1,358 schools in Irbid governorate; OSM maps 146 in the play area.

## Data attribution

- Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the Open Database
  License (ODbL). Building data come from a BBBike extract of OSM (2026-10-10) and the Overpass API (2026-10-17, outside that extract); places from the Overpass API (2026-10-17).
- Elevation: NASA SRTM v3 (1 arc-second), retrieved via the OpenTopoData API.
- [Three.js](https://threejs.org) r128 (MIT).
