# Map data and sources

The Roblox map is not hand-built. `tools/make_roblox.js` runs the real web build (`dist/irbid-drive.html`) headless and exports its map
data, so the Roblox world contains the same streets, buildings, places and heights as the web game. The full source list, with retrieval
dates and every cross-check, is in the repository's `DATA_SOURCES_AND_LICENCES.md`. The data under the map:

| Data | Source | Licence | In the Roblox game |
|---|---|---|---|
| Streets: geometry, junctions, roundabouts, widths, one-ways, speed limits, names | OpenStreetMap (2026-10) | ODbL 1.0, © OpenStreetMap contributors | 17,818 road pieces + the road graph (routing, GPS, AI) |
| Building footprints | OpenStreetMap (BBBike extract 2026-10-10 + Overpass 2026-10-17) | ODbL 1.0 | 14,527 buildings within 3.5 km of the start (cut back where a footprint reached into a road: 3,200 trimmed, 82 dropped) |
| Places: shops, schools, mosques, fuel stations, landmarks, neighbourhoods | OpenStreetMap via Overpass (2026-10-16 / 18) + the v43 name corrections (`osm/overpass/corrections.py`) | ODbL 1.0 | 1,048 searchable places in the play area |
| Terrain heights | NASA SRTM v3, 1 arc-second, via OpenTopoData | public domain | height grid + the ground parts / Terrain |
| Traffic signals, speed bumps | OSM signal / traffic-calming nodes + the web game's rules | ODbL 1.0 | 37 signal junctions. Speed bumps: 2 from OSM, the rest are **estimated** positions near schools / clinics / parks (marked as estimates in the web code) |

**Attribution:** "Map data © OpenStreetMap contributors (ODbL) · terrain NASA SRTM" is on screen at all times (`Client/InfoLine`) and in
Settings → © Credits & licences. Keep it. The ODbL requires it, and a public derivative database must be shared under the ODbL.

## Coordinate conversion

1. **Latitude / longitude → metres** (web `LL2XZ`, Python twin `osm/overpass/proj.py`): a local transverse Mercator projection centred at
   32.55° N, 35.85° E (Al-Balad). **+x = east, +z = south**, in metres. Heights: SRTM metres, with Al-Balad = 0.
2. **Metres → Roblox studs** (`make_roblox.js`, `Config.SCALE`): positions are taken relative to the game's start point and multiplied by
   **3 studs per metre**. Roblox's +X = east, +Z = south, +Y = up (the same handedness, so no axis flip). Car heading `h` has forward
   (sin h, cos h) in x / z, as in the web game.
3. **Play area:** a 3.5 km radius around the start (the web map is 29 × 24 km). Bigger would exceed sensible part counts for one place.

The physics works in metres (the web formulas unchanged) and multiplies by `SCALE` only when it places the car.

## Coverage limits (what is not exact)

- OSM coverage of Irbid is partial: some blocks have no buildings, many footprints are simplified to rectangles (1–8 pieces per building),
  and most **building heights are estimates** (OSM has few `height` / `building:levels` tags).
- Schools are under-mapped in OSM (146 in the play area vs 1,358 on the Ministry of Education list for the governorate). Missing schools are
  not invented.
- 1 km SRTM sampling misses narrow wadis. Some landmark groups float or sink slightly at slope edges.
- The generated "fill" buildings the web game adds where OSM has none, the rooftop details and the facade textures are **not ported yet**.
- Hand-built landmarks are approximations of the real buildings (boxes, cylinders, wedges), placed at their real OSM points.
- Places from OSM keep their OSM names (with the v43 corrections). No business was invented, and no Google Maps coordinates were used.
- Weather is **simulated** from Irbid's monthly rain-day averages (Jordan Meteorological Department 1985–2018), not live.

## Expanding the map

Map data and rendering are separate: `roblox/data` (server-only roads, buildings, landmarks) and `roblox/shared` (graph, places, heights, props,
colliders) are generated. The builders in `ServerScriptService/World/*` and `Client/Props` only read them. To change the area, change the radius
`R` in `make_roblox.js` (part counts grow with the square of the radius) and regenerate. To add real data, extend the `osm/` pipeline of the web
game first. Never hand-edit the generated files.
