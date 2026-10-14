# Irbid Drive

An open-world 3D driving sandbox set in Irbid, Jordan, built on real map data. The streets, building footprints and
places come from OpenStreetMap, and the terrain comes from NASA SRTM elevation data. Drive in traffic, drift for points, race,
rob the bank, and navigate the city. The whole game is one self-contained HTML file (Three.js r128 + WebGL, no framework,
no backend).

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
| M | search places / turn-by-turn directions |
| I | vehicle damage mode: Off / Cosmetic / Full |
| J / K | stunt ramps / landmark tour teleport |
| T / F | +1 hour / reset to start |
| V | racing-wheel setup (Logitech G29, with force feedback via WebHID in Chromium) |

On touch devices, on-screen pads appear (steer left/right, brake, gas, drift).

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
pip install playwright && python -m playwright install chromium
python tests/drive_pw.py dist/irbid-drive.html    # real-browser check
```

Map data is generated from the inputs in `osm/` (`osm/gen_world.py`, `osm/bld/conv.py`, `osm/bld/pois.py`,
`osm/terrain/gen_terrain.py`). Never edit the generated `src/parts/03a`–`03d` files by hand.

More detail for contributors:
- `CLAUDE.md`: architecture, constraints and the test baseline.
- `PLAN.md`: roadmap.
- `CHANGELOG.md`: version history.
- `AUDIT_REPORT.md`: realism/accuracy audit.

## Accuracy notes

- Road centrelines, building footprints and places are real OpenStreetMap data. Road widths and speed limits are typical
  values for each road class unless OSM tags them. Building heights are mostly estimated, and OSM coverage of Irbid is incomplete.
- The terrain uses a 1 km SRTM grid, so narrow valleys are smoothed out.
- The speed bumps are **estimated** positions near mapped schools, clinics and parks, not surveyed locations.
- Car durability, handling and economy values are gameplay balance, not real-world data.

## Data attribution

- Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the Open Database
  License (ODbL). Building and place data come from a BBBike extract of OSM.
- Elevation: NASA SRTM v3 (1 arc-second), retrieved via the OpenTopoData API.
- [Three.js](https://threejs.org) r128 (MIT).
