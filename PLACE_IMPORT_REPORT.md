# Place import report: v40 (Phase 1, real map and place data), 2026-10-17

Backup before the change: git tag `v39c-backup-before-phase1` (v38 original: `v38-backup-before-v39`).
Source: OpenStreetMap via the Overpass API, OSM base **2026-10-17 08:23 UTC** (POIs) and **08:39 UTC** (building outlines), ODbL.
Playable boundary: the road network's own window, x −9,408…19,757 m, z −7,782…16,630 m (29.2 × 24.4 km; lat 32.39986–32.62013,
lon 35.74976–36.06051). Production files: `dist/irbid-drive.html`, built from `src/parts/03c_poi_data.js` (places), `03b_bld_data.js` +
**new `03e_bld_out.js`** (buildings), `03a_net_data.js` (roads, unchanged) by `build.py`. Test fixtures were not touched as data.

## 1. Counts before → after

### In the game

| | v39c (before) | v40 (after) | Change |
|---|---|---|---|
| Places in search / "Passing:" (`h21`) | 1,473 | **1,659** | +186 |
| Real OSM places shown | 1,450 | **1,636** | +186 |
| …of which labelled on the map | 1,450 | 1,489 | +39 |
| …of which neighbourhoods / villages / localities (searchable, no label) | 0 | 147 | +147 |
| OSM rows dropped by the 42 m "landmark already there" rule | 18 (7 of them different, real places) | 0 (16 merged by OSM id, see §3) | |
| Hand-built landmarks | 23 | 23 (names corrected, positions fixed) | |
| Real OSM building pieces placed | 19,959 | **47,001** | +27,042 |
| Generated (procedural) buildings | 1,565 | 1,329 (only where OSM has no building within ~50 m) | −236 |

### By kind (in-game places)

| Kind | Before | After | | Kind | Before | After |
|---|---|---|---|---|---|---|
| Shops (dukkan) | 405 | 405 | | Sports (gym, pitches) | 18 | 29 (+11 pitches) |
| Food | 171 | 172 | | Banks | 21 | 23 (+Cairo Bank, Jordan Kuwait Bank) |
| **Mosques** | 160 | **161** (+مسجد نوح القضاة) | | Parks / playgrounds | 14 | 16 |
| **Schools / education** | 126 | **124** | | Bus stations / transport | 0 | 4 |
| Cafés | 111 | 111 | | Churches | 2 | 3 (+Greek Orthodox Church) |
| Medical | 86 | 87 | | **Neighbourhoods / villages** | 0 | **147** |
| Groceries | 71 | 71 | | Other named points | 88 | 107 |
| Hospitals | 35 | 34 | | | | |

Schools −2 and hospitals −1 are **duplicates removed**, not places lost. The OSM rows for JUST, Yarmouk University and "King Abdullah II
Hospital" used to be shown a second time next to the hand-built landmark; they are now merged into it. **No school, mosque or shop was
added from a non-OSM source**: the official lists have no coordinates (§5).

### Source data in the window

| Layer | Records | Note |
|---|---|---|
| Raw POI-type elements | 2,307 (was 2,234) | now also name-only nodes (`node["name"]`) |
| Classified → unique after de-duplication | 2,222 → **2,160** | 62 duplicates merged (same kind + same normalised name within 80 m, or an unnamed mosque/school node inside its polygon) |
| Named / unnamed | 1,666 / 494 | unnamed ones stay unnamed (never given a made-up name) |
| Named places in the game | 1,653 of 1,666 | the 13 left out: plots, region/state outlines, an ATM, an address-only point, rest-area parks |
| Building outlines | 46,217 ways (45,915 in the window, 0 without geometry) | 19,483 inside the BBBike extract (already in game), **26,432 outside → 03e** |
| Highway ways | 14,546 | road geometry unchanged in v40 |
| **Total genuine records** | **≈ 62,850** | the 10,000 target is met by real data, mostly buildings. **POIs alone are 2,160**: OSM does not have 10,000 points of interest here, and none were invented |

## 2. What was wrong, and what changed

1. **Overly broad de-duplication** (`06l_real_pois.js`): every OSM place within 42 m of a landmark, or within 80 m when of the same kind, was
   dropped. It removed real neighbours: Cairo Bank (17 m from the clock), the Greek Orthodox Church (19 m from Beit Arar), mosque
   نوح القضاة (19 m from the Yarmouk marker), Jordan Kuwait Bank, an optician and two shops near the Museum of Jordanian Heritage. Now an OSM
   row is merged only when its **OSM id** is listed as that landmark (`LANDMARK_OSM` in `osm/overpass/build.py` → `POID_LM`). Shops in one building
   stay separate (their labels stack, as before). The pipeline's own de-duplication never merges different names.
2. **Name-only OSM points were not imported.** Many shops here are mapped as a node with only a `name`, and so is "Wasfi AlTal square". The
   query now includes them; they are categorised "Named point (no category tag)", never with an invented category.
3. **Neighbourhoods, villages, bus stations, pitches and playgrounds** were filtered out of the game. They are in now. Areas are searchable only
   (`kind:'area'`, radius 150 m, which keeps them out of "Passing:").
4. **Buildings outside the extract.** v35 used a BBBike extract rectangle (x ±3.85 km, z ±8.2 km). JUST, Jadara, INU, the Ramtha road and the
   villages had only generated buildings. `osm/bld/conv_overpass.py` converts the Overpass outlines with the same rules as `conv.py`
   (minimum rotated rectangles, L/U shapes split into up to 8 pieces, same height rules) in pure Python with the game's projection.
   Generated fabric and generated campus blocks now appear only where OSM has no building nearby.
5. **Landmark positions** (the reported offsets):

| Landmark | Before | After | How |
|---|---|---|---|
| Dar As-Saraya Ottoman Museum | model 76 m from the real museum; the real footprint stood at the real spot as a plain box (visual duplicate) | **3 m** | `siteReal()`: model built on the real OSM footprint (`Irbid Archaeological Museum`, way 696141881), scaled to it |
| The Nabulsi House | 37 m; the model pushed the real footprint out | **1 m** | `siteReal()` on way 1173930712 (2-piece footprint) |
| Irbid Clock Tower Square | 36 m north of the square, 14 m off a legacy street line | **0 m** | `CLK_SITE`: the tower stands in the real square (way 1173940939, the median between the two carriageways; 6.9 m clearance, so the plaza is scaled down and the kiosks/benches dropped) |
| Arar's Cultural House | 18 m | **2 m** | `siteReal()` on way 1173930235 |
| Wasfi Al-Tal Square | **681 m** off (fallback estimate) | marker on node 2450661245 | the importer now finds the node; the plaza model stands on the nearest free plot (53 m), the marker is at the real square |
| King Abdullah University Hospital | formula point 1.19 km from the hospital | on OSM way 402029495 | `RLP` |
| MK, Nissan, Sameh, Emaar | 19–47 m | on the OSM point | markers moved (models stay on their plots) |

   Nothing was moved by a guessed offset: every new position is an OSM coordinate or footprint. `tests/lmchk.js`: all checked landmarks are
   within 5 m of their OSM feature.
6. **Performance fix found on the way:** three r128 creates `InstancedMesh` with view-culling off, so every building chunk in the city was drawn
   every frame. Chunks are now culled against their bounding sphere. With 2.4× more buildings the game draws **540–1,060 draw calls and
   83k–281k triangles** (v39: 2,110–2,577 calls, 1.26–1.33 M triangles; `tests/dc2.py`). Screenshots of the same views before/after show no
   missing geometry.

## 3. Hand-built landmarks ↔ OSM (merged by id, `LANDMARK_OSM`)

Dar As Saraya Ottoman Museum ↔ w696141881 · Arar's Cultural House ↔ w1173930235 · The Nabulsi House ↔ w1173930712 · Clock Tower Square ↔ w1173940939 ·
Wasfi Al-Tal Square ↔ n2450661245 · Emaar Irbid Park ↔ w468735683 · Arabella Mall ↔ n9648242752 · Sameh Mall ↔ n3255400345 · MK Super Market ↔
n4579615689 · Nissan Irbid Showroom ↔ n5549599194 · Al-Hassan Stadium ↔ w101717092 · Al-Hassan Sports City ↔ n13574046361 · Irbid National University
↔ w237116926 · Jadara University ↔ w237116986 · Yarmouk University ↔ w105641867 · JUST ↔ w237088320 · King Abdullah University Hospital ↔ w402029495.
Each landmark keeps its model and label, and gains the OSM names as search aliases.

## 4. Repeatable importer

```
python osm/overpass/fetch.py [--refresh] [pois|buildings|highways|buildings_geom]   # cached 30 days, retries with back-off, atomic writes, keeps the old file on failure
python osm/overpass/build.py --game          # classify, de-duplicate, name rules, manifests; --game regenerates 03c (old rows keep their order)
python osm/bld/conv_overpass.py              # outlines outside the extract -> 03e
python osm/photos/commons.py; python osm/photos/openverse.py; python osm/overpass/build.py   # photos -> manifest, then refs into places.json
python build.py
```
Re-running is idempotent: records are keyed by OSM id, so nothing duplicates, and hand-built landmarks are never replaced (they live in
`06g2`/`06b`/`06f`). Raw downloads stay local (`osm/**/*.json`, git-ignored by owner decision). The game never calls Overpass.

## 5. Schools and mosques against the official lists

- Ministry of Awqaf 2023 (Irbid directorates): 778 rows, **no coordinates**. 254 names also occur among OSM mosques in the window. That is an
  upper bound, because generic names repeat across villages. Unmatched official mosques are **not placed**: there is nowhere true to put them.
- Ministry of Education 2018: 1,358 schools in Irbid governorate, **no coordinates**; 30 name matches. OSM has 146 school sites in the window.
  **Schools are badly under-mapped in OSM**; the fix is mapping them (survey/licensed imagery), then re-running the importer.

## 6. Photographs

- Wikimedia Commons (`commons.py`, rule: geotagged within 150 m AND a distinctive name word in title/category): **12 places, 27 photos**.
- Openverse (`openverse.py`): Openverse indexes only **718 images mentioning Irbid**. 347 of them are Commons mirrors (skipped), and in the
  rest, 86 matched an important place by name. **1 was accepted** (Flickr "Irbid Archaeological Museum", CC BY 2.0 → Dar As-Saraya). **85
  were rejected for their licence** (75 CC BY-NC-ND, 6 BY-NC, 4 BY-NC-SA), mostly Tell Johfiyeh and Yarmouk University photos. Openverse
  items have no coordinates, so the accepted one is "medium" confidence (name evidence only).
- Mapillary: not used (needs an access token). OSM `image=` tags: Facebook/postimg/ibb links with no licence, unusable.
- **No mosque or school has a verified photo.** All photos are reference only; the game does not download or show them.

## 7. Unresolved / uncertain

`manifest/unresolved_places.json` (generated) lists 11 landmark issues, 131 names needing review and 494 unnamed POIs kept unnamed.
Highlights: Wasfi Al-Tal Park (name not in OSM), the Museum of Jordanian Heritage and Souq Al-Balad (positions estimated), three
hand-named roundabouts (unnamed in OSM), OSM-vs-official name conflicts (KAUH, Arabella/Arbila, Irbid/Irbed National University), generic
names ("مسجد", "Pharmacy"), and the estimated speed bumps. See `NAME_CORRECTIONS.md`.

## 8. Tests (real results, 2026-10-17, final build)

`val_net` 400/400 routes · `boot` ok (build 4.6 s, was 3.9 s) · `h2` races/duel/heist finite · `h13` 0 mismatches · `h14` bad 2 (= before) ·
`h16` fines 0 · `h20` odds and prices unchanged · `h24` **bad 6** (= before) · `vg` **bad 9** (= before) · `h21` 1,659 places · `tour` 27 stops,
0 off-road · `dyn_check` bad 0 · `phys_brake` Focus RS 0–100 4.99 s (= before) · `terr_check` 0 groups off terrain · `realism_test` 29/29 ·
`damage_test` 50/50 · `off_trace` physics hash = v38 (with-world hash changed, expected, see CHANGELOG) · `lmchk` all ≤ 5 m.
Playwright (Chromium, software GL): `disp`, `ios`, `shopt`, `wheel_test` 30/30, `dc2`, `drive_pw`, `damage_pw` 7/7, all without page errors.
Not tested: real phones (frame rate with 2.4× buildings), G29 hardware.

Before/after coordinate diff (`h21` dumps): apart from the landmark moves in §2 and the renamed rows, **no existing place moved**.

## 9. v42 review file and comparison (2026-10-17)

- `PLACE_REVIEW.csv` (generated by `tools/place_review_csv.py` from `manifest/places.json`, `name_review.json` and `unresolved_places.json`) has one row
  per place record. Each row carries OSM type/id, name, `name:en`, `name:ar`, other name tags (int_name, brand, alt_name, official_name), kind, category,
  lat/lon, game x/z, in-game flag, source, retrieval time, confidence, flags and a review status:

  | Status | Rows |
  |---|---|
  | ok | 1,531 |
  | unnamed (no name tag; kept unnamed, nothing invented) | 494 |
  | needs review (category-word names, lower-case, …) | 125 |
  | corrected by a rule (see NAME_CORRECTIONS.md) | 10 |
  | hand-built landmark with an open issue | 11 |
  | **total** | **2,171** |

- The counts were re-measured on the v42 build, not copied: `h21` places 1659 (laz 1489), the same as v40/v41. No place data changed in v42, and
  the Overpass cache (retrieved 2026-10-17) was reused (30-day cache).
- `Downloads/irbid-drive-place-name-review.csv` (an outside review of an older snapshot: 1,111 rows, flags only, no corrected names) was cross-checked
  against the current data:

  | Match | Rows |
  |---|---|
  | same OSM id | 198 |
  | same name within 60 m | 893 |
  | same name elsewhere | 4 |
  | not in the current OSM place data | 16 |

  Nothing was imported from it, because it contains no new source evidence.
- The 10,000-feature target: the window has 2,160 OSM place records (1,666 named) plus about 46,000 building footprints (counted separately). Named
  businesses and POIs in OSM here number in the low thousands, so 10,000 genuine named places is **not** supported by the available data, and none
  were invented to reach it.
