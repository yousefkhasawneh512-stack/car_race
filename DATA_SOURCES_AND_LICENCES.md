# Data sources and licences

Every external source the game or its pipelines use, what was taken, the licence, and the obligations. "Bundled" means the data
ships inside `dist/irbid-drive.html`; "reference" means it was used to check or document the game but is not distributed with it.

## Map and geography

| Source | Used for | Retrieved | Licence | Bundled? | Obligations |
|---|---|---|---|---|---|
| OpenStreetMap: road network (`osm/irbid_osm_highways.json`, via `osm/gen_world.py`, `osm/net.py`) | streets, junctions, roundabouts, campus/park polygons → `03a` | 2026-10 (v33) | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) | yes (derived) | attribution (on-screen `#osmcr` + README); share-alike for a *public derivative database* |
| OpenStreetMap via [BBBike extract](https://extract.bbbike.org/) (`osm/bld/irbid.gpkg`) | building footprints → `03b` (19,959 placed) | 2026-10-10 | ODbL 1.0 | yes (derived) | as above |
| OpenStreetMap via [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) (`osm/overpass/fetch.py`) | all POIs, buildings and highway tags inside the playable window → `03c` (1,468 named places), `manifest/places.json`, `geo_summary.json` | 2026-10-16 (OSM base 17:40 UTC) | ODbL 1.0 | `03c` yes; manifests in the repo | as above. The public Overpass instance is used once per pipeline run, never by the game |
| OpenStreetMap via Overpass, building outlines (`fetch.py buildings_geom` → `osm/bld/conv_overpass.py`) | 26,432 real buildings outside the BBBike extract → `03e_bld_out.js` (v40) | 2026-10-17 (OSM base 08:39 UTC) | ODbL 1.0 | yes (derived rectangles; heights mostly estimated) | as above |
| OpenStreetMap via Overpass, traffic calming (`fetch.py traffic_calming`) | 2 `traffic_calming` nodes placed as real speed bumps, 3 speed cameras recorded (`OSM_CALM` in 03c) (v41) | 2026-10-17 | ODbL 1.0 | yes | as above |
| NASA SRTM v3 1 arc-second via [OpenTopoData](https://www.opentopodata.org/) | terrain heights → `03d` | 2026-10 (v37) | SRTM: public domain (U.S. Government work, NASA/USGS) | yes | none required; credited |
| Ministry of Awqaf, [Mosques 2023](https://opendata.gov.jo/en/dataset/mosques-2483-2023) (two Irbid XLS lists, 778 rows) | name cross-check of OSM mosques (no coordinates in the data) | 2026-10-16 | "Open Jordanian License" ([Jordanian Open Government Data Licence](https://opendata.gov.jo/en/pages/jordanian-open-government-data-license)); portal marks it Open Definition-conformant | **no** (local only, `osm/official/`) | if ever redistributed: credit the Ministry of Awqaf and the Open Government Data Portal |
| Ministry of Education, [Data of schools 2018](https://opendata.gov.jo/en/dataset/data-of-schools-162-2018) (XLSX, 1,358 Irbid-governorate rows) | name cross-check of OSM schools, coverage report (no coordinates) | 2026-10-16 | "Open Jordanian License" (the dataset page's licence link points to a social-media page, so the exact terms **could not be verified**) | **no** | treat as reference only until the licence text is confirmed |
| Ministry of Awqaf [historic mosques list](https://awqaf.gov.jo/AR/List/المساجد_التاريخية_والمقامات), Ministry of Education site, catalogue of heritage mosques of Irbid governorate | named by the owner as sources | **not used** | not checked | no | these pages have no machine-readable coordinates; nothing from them is in the game |
| [Greater Irbid Municipality](https://irbid.gov.jo/), [Visit Jordan: Irbid](https://international.visitjordan.com/wheretogo/irbid/), [Department of Antiquities](https://doa.gov.jo/) | named by the owner (v40) | **not fetched** | site terms not reviewed | no | no machine-readable place lists with coordinates are known; useful only for manual spelling checks (none were made from them) |

**Not done / not available:** Mapillary street imagery needs an API access token (none available), and its imagery is CC BY-SA,
which would need its own attribution. It was not used. **Openverse** (`osm/photos/openverse.py`, v40,
[API](https://api.openverse.org/v1/), anonymous) was queried once for every image mentioning Irbid (718; 347 are Commons mirrors, which were skipped):
1 photo accepted (CC BY 2.0, Flickr), 85 name matches rejected because their licence is NC or ND.

### Review file (v42)

`PLACE_REVIEW.csv` is derived from the OSM data above (ODbL; keep the attribution if you redistribute it). Repair prices in the game are
gameplay estimates; no workshop price source was used.

## Photographs (`manifest/photos.json`)

Wikimedia Commons files found by `osm/photos/commons.py` (API: `https://commons.wikimedia.org/w/api.php`). Each entry carries its
own creator, licence short name, licence URL and source page, as published in the file's metadata. **No photo is bundled or shown
in the game.** They are reference material for future facade work. If any is ever displayed, it must carry its listed attribution,
and share-alike licences (CC BY-SA) apply to the displayed image.
OSM `image=` tags in this area point to Facebook Messenger attachments, postimg.cc and ibb.co with no licence information. They are
**unusable** and were ignored.

## Car models and car data (`manifest/cars.json`)

| Item | Source | Licence |
|---|---|---|
| 3D car meshes | generated in code (`07a_cars.js`), project's own | project code |
| Car names, top speed, 0–100, dimensions (`PORS`) | pre-existing game data (v19–v31), not re-verified | game data; real names are trademarks of their owners, used descriptively |
| Mass, weight split, crush stiffness, thresholds, component durability | **gameplay estimates** computed in `07c_realism.js` | project code |
| Drivetrain and engine position "doc" | layouts commonly published for these model names (general knowledge, not re-verified against manufacturer documents; variant-dependent names are flagged) | facts, not copyrightable |
| Crush model | linear crush relation v = b0 + b1·C after K. Campbell, *Energy basis for collision severity*, SAE 740565 (1974); coefficients are typical ranges, not per-model data | method only |
| Licensed model candidates | [Sketchfab public search API](https://sketchfab.com/developers) (`tools/sketchfab_search.py`, 2026-10-17): 176 of 217 cars have a CC BY candidate (`manifest/car_model_candidates.json`, with author and licence per model) | search results only; nothing downloaded |
| Handling numbers (`manifest/car_powertrain.json`) | **gameplay estimates** solved in `07g_drive.js` from the game's own top speed / 0–100 | project code |

**Licensed 3D models:** none were downloaded or bundled. Sketchfab ([licences](https://sketchfab.com/licenses),
[Download API guidelines](https://sketchfab.com/developers/download-api/guidelines)) requires the owner's account for downloads. Each
model also needs (a) a licence that allows redistribution in this game (CC0 / CC BY; NC is non-commercial only; ND forbids the
mesh splitting that damage needs), (b) a decision on brand/trademark use, and (c) a size budget compatible with the
single-file, offline build. See `AUDIT_REPORT.md` → "Car models".

## Software

| Library | Version | Licence | How |
|---|---|---|---|
| [three.js](https://threejs.org) | r128 | MIT | loaded from cdnjs.cloudflare.com at runtime |
| three.js post-processing examples (EffectComposer, UnrealBloomPass, …) | r128 | MIT | inlined in `01b_post_lib.js` |
| Playwright | 1.64 | Apache-2.0 | tests only |
| xlrd / openpyxl | latest | BSD / MIT | pipeline only (reading the official spreadsheets) |

## Attribution text used in the game

`Map data © OpenStreetMap contributors (ODbL) · terrain: NASA SRTM · speed-bump estimates near schools/clinics` (element `#osmcr`,
always visible). Keep it.
