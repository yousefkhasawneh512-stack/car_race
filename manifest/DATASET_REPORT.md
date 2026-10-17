# Irbid Drive: geographic dataset report

Generated from `manifest/geo_summary.json` (`osm/overpass/build.py`). Retrieved 2026-10-17, OSM base 08:23 UTC (POIs) / 08:39 UTC (building outlines). v40 update; v39 numbers in git history.
Boundary: the game's playable window, i.e. the road network's own window (`osm/net_stats.json`): x −9,408…19,757 m,
z −7,782…16,630 m (29.2 × 24.4 km), lat 32.39986–32.62013, lon 35.74976–36.06051. It is derived from project data, not guessed.

## Totals: genuine records in the window

| Layer | Records | Source |
|---|---|---|
| Unique POIs (amenities, shops, leisure, tourism, historic, health, offices, crafts, education, transport, places, address points) | **2,160** | OSM / Overpass |
| Building footprints | **46,142** | OSM / Overpass |
| Highway ways | **14,546** | OSM / Overpass |
| **Total** | **62,848** | |

The 10,000-record target is met by real data, mainly buildings. **POIs alone are 2,160**: OpenStreetMap simply does not have
10,000 mapped points of interest in Irbid. Nothing was invented to raise the count.

## POIs

- Raw Overpass elements 2,307 (v40 also asks for name-only nodes) → classified 2,222 (78 unclassifiable, 7 outside the window) → **62 duplicates merged** → **2,160 unique**.
- Named 1,666, unnamed 494 (kept, flagged `unnamed`, never given a made-up name).
- By kind: shops 484, mosques 211, food 199, other named points 186, education 175, place names 168, cafés 125, medical 100, groceries 77,
  sport 76, parks 66, historic/attractions 51, banks 47, barbers 45, hospitals 43, auto 39, civic 33, malls 13, transport 9,
  car dealers 4, churches 3, museums 3, address-only points 2, pet 1.
- **De-duplication rules:** (1) the OSM object id is unique; (2) same kind + same normalized name (Arabic letter variants, diacritics,
  the words mosque/school removed) within 80 m → one record (the polygon wins, because it carries the footprint); (3) an *unnamed*
  mosque/school node within 40 m of a same-kind polygon → the node marks that building. **Different names are never merged**,
  however close they are, so neighbouring shops stay separate. All 62 merges are listed locally in `osm/overpass/out/duplicates.json`.
- Missing geometry: 0 (Overpass `out center` gives every way/relation a centre). Note: for polygons that centre is the
  **bounding-box centre**, not the area centroid that the old BBBike pipeline used, so 54 places moved by 1–9 m (a few shops by
  50–75 m, where mappers moved them). Landmarks did not move.
- In the game (v40): **1,659 places**: 1,636 OSM places (147 of them neighbourhoods/villages, searchable only), 16 OSM rows merged into their
  hand-built landmark by OSM id, plus the landmarks (see `PLACE_IMPORT_REPORT.md`). 1,653 of the 1,666 named OSM places are in the game. (v39b: 1,473.)
  36 old rows no longer exist in OSM under the same name and place (deleted, renamed or re-tagged), for example a wedding hall,
  several shops and three mosque entries.

### Mosques

- `amenity=place_of_worship` + `religion=muslim`, plus `building=mosque`, plus place_of_worship without a religion tag unless the name
  says church. **211 unique** (161 named). Churches 3. (The old pipeline listed "Latin Church" as a mosque; this is fixed.)
- Ministry of Awqaf lists for the Irbid directorates: 778 rows, 477 distinct normalized names, **no coordinates**. 254 rows' names
  also occur among the OSM mosques in the window. That is an *upper bound*: generic names (Abu Bakr Al-Siddiq, Omar Bin Al-Khattab…)
  repeat across villages, and the lists cover whole directorates beyond the play area. Unmatched official mosques are **not placed**
  (there is no location to place them at).

### Schools

- `amenity=school`, `education=school`, `building=school`: **146 unique school sites** (100 named), plus 18 universities,
  3 colleges, 5 libraries, 2 driving schools and 1 kindergarten.
- Ministry of Education 2018 list: **1,358 schools in Irbid governorate** (Qasabat Irbid 488, Bani Obeid 202, Ramtha 155,
  Koura 143, Bani Kenanah 124, …), **no coordinates**. Only 30 names match OSM schools in the window.
- **Conclusion: schools are heavily under-mapped in OpenStreetMap.** The real fix is mapping them in OSM (survey or licensed
  imagery), then re-running the pipeline. The game cannot place schools it has no coordinates for.

## Buildings

- 46,142 OSM buildings in the window. **19,551 lie inside the BBBike building extract rectangle** that `03b` was built from (19,959
  pieces placed in game). **26,591 lie outside it** (JUST, Jadara, INU, Ramtha road, outer villages), where the game still uses
  procedural buildings until v40. **Since v40 they are in the game** (`03e_bld_out.js`, 26,432 buildings / 28,153 rectangle pieces from
  the Overpass outlines, `osm/bld/conv_overpass.py`; 47,001 pieces placed in total).
- Tag coverage is thin: `building=yes` 44,833 (97 %), house 837, greenhouse 134, residential 100, apartments 77, school 49, …;
  `building:levels` 860, `height` 213, roof tags 0, names 231, addresses 42. Most heights in game are therefore **estimated**.
- In game, footprints are minimum rotated rectangles (one or more pieces per building), not exact outlines.

## Roads (tag coverage among 14,546 ways)

name 588 · oneway 2,109 · surface 195 · bridge 79 · tunnel 33 · maxspeed 12 · lanes 8 · width 0 · lit 0.
Speed limits and widths in game are class defaults (unverified) wherever OSM has no tag, which is almost everywhere.

## Areas with incomplete data (2 km cells with many buildings but almost no POIs)

| Cell x (m) | Cell z (m) | Buildings | POIs |
|---|---|---|---|
| −7,408…−5,408 | 12,218…14,218 | 1,389 | 8 |
| 4,592…6,592 | 218…2,218 | 1,218 | 1 |
| 18,592…20,592 | 8,218…10,218 | 741 | 0 |
| −5,408…−3,408 | −3,782…−1,782 | 662 | 1 |
| −3,408…−1,408 | 218…2,218 | 650 | 4 |
| 4,592…6,592 | 12,218…14,218 | 607 | 0 |
| 4,592…6,592 | 4,218…6,218 | 515 | 3 |
| 16,592…18,592 | −3,782…−1,782 | 438 | 1 |

(Game metres: +x east, +z south of Al-Balad. The full list is in `geo_summary.json` → `poi_sparse_cells_2km`.)

## Freshness

| Layer | Date |
|---|---|
| POIs / building and road tag statistics | Overpass, 2026-10-17 |
| Building geometry in game | BBBike extract 2026-10-10 (inside the rectangle) + Overpass 2026-10-17 (outside) |
| Road geometry in game | OSM highways, 2026-10 (v33) |
| Terrain | SRTM v3 (2000 mission), 1 km grid |
| Official lists | Awqaf 2023 (updated 2025), MoE 2018 |

## Files

- `manifest/places.json`: every unique POI with stable id (`osm:n123` / `osm:w123`), OSM type/id, name, `name_en`, kind, category, lat/lon,
  game x/z (same projection as the roads; Python and JS agree to < 1 µm), geometry type, selected tags (incl. wikidata/website),
  source, retrieval time, `in_game`, `photo` (Commons file names, if verified; 6 records after the 2026-10-16 photo run), `confidence`, `flags`.
- `osm/overpass/out/buildings_manifest.csv` (**local only**, not published by owner decision): id, lat/lon, x/z, building, levels, height,
  roof, name, in-extract or not.
- Regenerate: `python osm/overpass/fetch.py` → `python osm/overpass/build.py [--game]`. The game never queries Overpass at runtime.
