# Buildings and landmarks report (v43, 2026-10-17)

How accurate the game's buildings and landmarks are, what each one is based on, and what is still estimated. Sources: OpenStreetMap
(Overpass, OSM base 2026-10-17 08:23 UTC), the Greater Irbid Municipality heritage list (irbid.gov.jo/?page_id=6711, read 2026-10-17),
Wikimedia Commons / Openverse photo search (`manifest/photos.json`). Machine-readable: `manifest/heritage_check.json`, `manifest/places.json`.

## 1. Buildings

| Item | Value | Status |
|---|---|---|
| OSM buildings in the play window | 46,142 | all placed (19,551 inside the BBBike extract, `03b`; 26,591 outside it, `03e`, since v40) |
| with `building:levels` | 860 (1.9 %) | heights from levels × 3.2 m |
| with `height` | 213 (0.5 %) | real height |
| with roof tags | 0 | **every roof shape is generated** |
| with a name | 231 | |
| footprint shape | minimum rotated rectangles, L/U shapes split into up to 8 pieces | **estimate.** Irregular outlines are approximated, not reproduced exactly (not changed in v43, see §5) |
| heights without tags | generated from building type and area | **estimate**, labelled in `osm/overpass/out/buildings_manifest.csv` (local only) |
| facades | shader facades by style class (5 classes), not per-building | **generic**. No photo facades; two real buildings of the same class look alike |
| fill where OSM has no building | procedural fabric only where OSM has no building within ~50 m | procedural, never named |

Unnamed footprints are kept: a missing name tag is not a missing building.

## 2. Hand-built landmarks: position, model and photo coverage

Positions measured by `tests/lmchk.js` on the v43 build (distance between the in-game landmark and its OSM feature).

| Landmark | OSM feature | Offset | Model | Verified photo (reference only) |
|---|---|---|---|---|
| Dar As-Saraya (Irbid Archaeological Museum) | way 696141881 | **3 m** | hand-modelled Ottoman courtyard, built on the real footprint (`siteReal`) | 1 (CC BY 2.0, name match only, medium) |
| Arar House (Beit Arar) | way 1173930235 | **2 m** | hand-modelled, on the real footprint | 3 (CC BY 4.0, high) |
| The Nabulsi House | way 1173930712 (2 pieces) | **1 m** | hand-modelled, on the real footprint | 3 (CC BY-SA 4.0, high) |
| Clock Tower Square | way 1173940939 | **0 m** | tower model in the real median (scaled to its 6.9 m width) | none found |
| Wasfi Al-Tal Square | node 2450661245 | marker on the node; plaza model on the nearest free plot (53 m) | generic plaza | none found |
| Arabella Mall | node 9648242752 | **3 m** to the mall building; official pin 34 m from the OSM node | generic mall block | none found |
| Emaar Irbid Park | way 468735683 | **5 m** | generic park | none found |
| Nissan Irbid Showroom | node 5549599194 | **0 m** | generic showroom | none found |
| Sameh Mall, MK Super Market | nodes 3255400345, 4579615689 | marker on the node | generic | none found |
| Yarmouk, JUST, Jadara, INU, KAUH | OSM campus/building ways | on the OSM feature | real OSM buildings + generated campus blocks only where OSM has none | Yarmouk 1 (medium) |

**None of the landmark models is a verified photo-realistic reconstruction.** They are simplified models placed on the real footprint;
details (windows, materials, ornament) are illustrative. Photos in `manifest/photos.json` (28 photos for 13 of 1,535 checked places, all
CC licences recorded with creator and URL) are reference only: showing them would add a network host, which the single-file rule forbids.

The reported offsets (Dar As-Saraya 76 m, Nabulsi 37 m, Clock Tower 36 m, Nissan 47 m) were fixed in v40 by moving each landmark onto its
OSM footprint or point. No position was set by a hand-tuned offset. v43 re-measured them (table above).

## 2b. Independent check against Wikidata (v43b, 2026-10-18)

A Wikidata SPARQL query (CC0; every item with coordinates within 15 km of Irbid, 241 rows) gives a second, independent position for some features.
Distance from the Wikidata point to the OSM feature the game uses:

| Feature | Wikidata | Distance |
|---|---|---|
| Irbid Archaeological Museum (Dar As-Saraya) | Q12238575 | 1 m |
| Nabulsi House | Q140552193 | 6 m |
| Beit Arar (The Cultural House of Arrar) | Q136447975 | 24 m |
| Al-Hassan Stadium | Q4117207 | 26 m |
| Yarmouk University | Q240784 | 21 m |
| Capitolias (Beit Ras) | Q1226916 | 4 m |
| "Historical Museum" = Museum of Jordanian Heritage | Q12238591 | 27 m (names added as search aliases) |
| King Abdullah II Park = حدائق الملك عبدالله الثاني | Q22687456 | 185 m to the park centre (alias added, medium) |

Candidate not placed: **Abu al-Darda shrine (مقام أبي الدرداء)**, Wikidata Q20424481 at 32.590131, 35.79359, inside the play area, nothing in OSM
within 378 m. A Wikidata coordinate has no stated survey source, so it needs an owner check before going into `osm/manual/verified_places.json`.

## 3. Municipal heritage list vs the game (27 sites)

| Site | Status in the game | Evidence / note |
|---|---|---|
| مسجد إربد الكبير · Irbid Great Mosque | **present** (OSM way 696141883) | municipal name added as a search alias |
| كنيسة الروم الأرثوذكس · Greek Orthodox Church | **present** (OSM way 696141882, religion=christian) | alias added. The Greek **Catholic** church (node 7285033997) is a different church and stays separate |
| دار السرايا · Dar As-Saraya | **landmark** | alias added |
| منزل عرار · Arar House | **landmark** | aliases منزل عرار, بيت عرار |
| بيت النابلسي · Nabulsi House | **landmark** | alias added |
| مبنى بلدية إربد القديم · Old Municipality Building | candidate: OSM "Irbid Municipality Building" (way 1173930713) on the tell beside the Saraya | likely, not confirmed: no alias added |
| متحف عرار · Arar Museum | candidate: Beit Arar | not confirmed as the same facility: nothing added |
| الجامع الغربي (المملوكي) · Western Mamluk Mosque | **absent** | Petra: now named Abu Dhar Al-Ghifari, west of the Great Mosque. The only OSM "ابو ذر الغفاري" (node 7508280382) is **7.4 km north**: a different mosque. Not moved, not renamed |
| مدرسة حسن كامل الصباح (الرشيدية) | **absent** | MoE 2018 lists it (حي التل, street حسن كامل الصباح) without coordinates; not in OSM |
| مدرسة وصفي التل الثانوية الشاملة | **absent** | MoE 2018 lists it (حي التل, شارع الشرطة) without coordinates. OSM "وصفي التل" (way 1042579410) is a mosque 5.5 km south |
| تل إربد القديم · Old Tell Irbid | absent as a named area | no outline in OSM or the municipal page; the buildings on it are in the game |
| سور إربد · Old Irbid Wall | absent | no geometry anywhere |
| بيت علي خلقي الشرايري | absent | only a street of that name is mapped |
| بيت محمود جمعة, بيت الجودة, بيت أبو رجيع وسعيد جمعة | absent | not in OSM (بيت الجودة is not the Al-Joud Hotel) |
| برج المراقبة, متحف بلدية إربد, سوق الصاغة القديم, مقاما الشيخ خليل التميمي والشيخ عوض الهامي, بوابير الطحين, مضافة آل التل, مضافة آل سعد البطاينة, خان حدو | absent | not in OSM; the municipal page gives no addresses |
| قصر الملكة مصباح, سوق التجارية القديم, ساحة الأفراح | absent | listed as heritage "in memory"; OSM has a neighbourhood "حي الافراح", not proven to be the square |

**Nothing absent was placed.** The municipal page lists names only (no address, no map). The game will show a site once it has a
verified point: add it to `osm/manual/verified_places.json` (name, kind, category, lat, lon, `source_url`, `verified_by`), or map it in
OSM, and rerun `python osm/overpass/build.py --game`.

## 4. Malls checked against their own websites

| Mall | Status | Note |
|---|---|---|
| Arabella Mall | present | English name corrected from the OSM "Arbila Mall"; official map pin 34 m from the OSM node |
| Irbid Mall Center | absent | the official site gives a description only ("west of the university", opened 6 Sep 2006); its map link resolves to a Google place id with no coordinate |
| Irbid Mall Grand | absent | official site: eastern entrance, "Sari Al-Nasser street, Aydoun". No coordinate. Not merged with Mall Center |
| Irbid Mall Hypermarket | absent | a section inside Irbid Mall; the game has no interiors |
| Irbid City Centre | absent | Wikipedia ≈ 32.5355, 35.8650, but its address text is wrong and the operating status is unconfirmed |

Coordinates were **not** taken from Google Maps (its terms forbid extracting them, and the pages only returned a default map centre).

## 5. Not done (and why)

- **Exact irregular footprints.** Buildings use rotated rectangles (1–8 pieces). Extruding the true OSM polygons would need a new
  triangulating geometry path, a matching collider shape and a draw-call/perf pass on phones. Planned, not started.
- **Per-building facades and real roof shapes.** OSM has no roof tags here and only 213 heights. Generic facades stay.
- **Landmark photo facades / licensed 3D landmark models.** Would add network hosts or large assets (single-file rule; see CAR_ASSETS_AND_SPECS §5).
- **Bridge decks at real heights** (ROAD_AND_TERRAIN_REPORT).
