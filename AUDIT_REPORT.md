# Irbid Drive: audit (v39 systems, v42 master-repair status, v43 accuracy audit). Updated 2026-10-17

What the project was, what changed, what is real, what is estimated, and what is still missing. The previous (v37) realism audit is
`docs/AUDIT_v37.md`. Test evidence is in `TEST_REPORT.md` and `FINAL_TEST_REPORT.md`; sources and licences are in `DATA_SOURCES_AND_LICENCES.md`.

## v43 accuracy audit: every issue of `irbid-place-database-issues.csv` (2026-10-17)

Backup: git tag `backup/v42` (commit 2d44088). The CSV was written against an older 1,027-row POI table; each issue was re-checked
against the current data (1,652 OSM places, OSM base 2026-10-17) and the official sources. Details and evidence: `NAME_CORRECTIONS.md`
(v43 section), `BUILDING_LANDMARK_REPORT.md`, `PLACE_REVIEW.csv`. Tested by `tests/place_audit.py` (29 checks).

| Id | Sev. | Status | What was done / why not |
|---|---|---|---|
| CAT-001 power station as shop | High | **Fixed** (medium) | shown as "Utility (power station, by name)"; OSM tag shop=outdoor contradicts the name. Facility not verified on site |
| CAT-002 library as school | High | **Fixed** (high) | all OSM libraries are civic "Library", not schools (5 records). It is Yarmouk University's library (operator tag) |
| CAT-003 Shalabi clinic as salon | High | **Relabelled** (medium) | "Beauty / cosmetic clinic (unverified)": name says clinic, tag says beauty; both fit a cosmetic clinic |
| CAT-004 housing as motel | Med | **Relabelled** (medium) | "Housing / apartments (by name; OSM says motel)" |
| CAT-005 officers' club as hotel | Med | **Relabelled** (medium) | "Officers' club (OSM says hotel; lodging unverified)" |
| CAT-006 Hakama as mosque | Med | **Fixed** (medium) | gazetteer village node tagged place_of_worship: kept out of the game; the village (area) stays searchable |
| CAT-007 الكردي | Med | **Checked, unchanged** | different names, 58 m apart; no evidence of the supermarket. Both kept |
| NAME-001 Arbila → Arabella | Med | **Fixed** (high) | official site + its map pin 34 m from the OSM node; OSM spelling is an alias |
| NAME-002 Hashim Pipers Mosqe | Med | **Open** | no Arabic name in OSM, no match in the Awqaf lists. Not guessed; flagged |
| NAME-003 "No name" | Med | **Fixed** (high) | placeholder removed: not labelled in game (rule applies to any "no name") |
| NAME-004 "no name fation and more;بلعاوي" | Med | **Fixed** (medium) | placeholder part removed, name "بلعاوي" flagged unverified. 12 ";" names in all were split (first = name, others = aliases) |
| NAME-005/006/007 spellings | Low | **Open** | signs unverified; spelling kept. "coffe house" lost a wrong "Hard Rock Cafe" alias |
| DUP-001 ابواب العلم | High | **Already merged** (v40, 2.5–8.2 m, 4 nodes); MoE lists the school (175523) |
| DUP-002 / DUP-003 الصالحين, عمر بن الخطاب | High | **Already merged** (v40, 3.8 m / 1.6 m). Other same-name mosques are km apart: different mosques |
| DUP-004 شعبان مول | Med | **Fixed** stray ";"; mall and supermarket kept separate (12.8 m, different tags) |
| DUP-005 / DUP-006 TiK Tok, Alta Moda | Low | **Already merged** (15.2 m / 9 m); the restaurant node "مطعم الفدين للبخاري;TiK ToK" split |
| DUP-007 Prince Hassan school ×4 | High | **Open, flagged** | MoE: one such school (Al-Qusayla); 4 OSM buildings up to 464 m apart. Which is right is unknown; none moved |
| OSM-001 Zubiya schools as hospital | Med | **Fixed** (high) | rule: name says school, tag says hospital → school. Also بلدية زوبيا → municipality, Hakama girls' school (MoE alias) |
| OSM-002 الحذاء الإيطالي hospital | Low | **Fixed** (high) | it WAS still a hospital in the game; now a shoe shop, "Payless" alias removed |
| OSM-003 health centres as hospital | Low | **Fixed** (high) | 14 "مركز صحي" records tagged hospital → Health centre (all 16 "مركز صحي" are now medical) |
| OSM-004 Latin Church | Low | **Confirmed** church; denomination (Latin/Roman Catholic) from the name |
| GAP-001…024 heritage list | Med–High | **Cross-checked** | 5 present (2 OSM + 3 landmarks, municipal names added as aliases), 2 candidates, 20 absent: **not placed** (no coordinates anywhere). Workflow: `osm/manual/verified_places.json` |
| GAP-010 Mamluk mosque | High | **Open** | the only OSM Abu Dhar mosque is 7.4 km north: not the historic one; not moved |
| GAP-025…028 Irbid Mall ×2, City Centre, Hypermarket | High | **Open** | no published coordinates, nothing in OSM; Google coordinates not used |
| DATA-001 schools vs MoE | High | **Compared by name** | the 2018 list has no coordinates: names only (30 matches); nothing placed from it |
| DATA-002 mosques vs Awqaf | High | **Compared by name** | 778 rows, no coordinates; 255 name matches (upper bound) |
| DATA-003 unverified POIs | High | **Unchanged** | every POI now carries its OSM id; 196 review flags in `name_review.json` |
| (new) preset brands | Med | **Fixed** (high) | 35 local shops carried an international chain's `brand` from an editor preset (Arab Bank as "Capital Bank", "T-Mobile", "iFLY" travel agencies shown as **sports centres**). Removed from aliases; agencies reclassified |
| (new) importer bug | — | **Fixed** | `build.py` could not re-read 03c (greedy POID regex) |

In-game effect: 4 rows removed (Hakama "mosque", "No name", 2 genuine duplicates found after splitting ";" names), 68 rows changed,
0 rows moved. Places 1,659 → 1,655 (`h21`). 58 suspected OSM errors are listed in `manifest/osm_upstream_issues.json` (OSM not edited).

Phases 4–12 of the v43 prompt: landmark offsets re-measured (all ≤ 5 m, `lmchk`); repair bay gained a **full inspection** list (every
part with its condition, undamaged parts "OK · no charge"); damage, tyres, G29 and car assets are unchanged since v42 (see their reports).
Not done: irregular footprints, landmark photo facades, licensed car/landmark models, bridge decks, physical G29 and phone tests.

## 0. v42 master-repair status (2026-10-17)

The status below was measured on the v42 build: backup tag `backup-v41`; tests in `TEST_REPORT.md` (v42 section). "Done" means it is implemented and covered by an
automated test. "Simulated" means it was tested with mocks only.

**Source of truth.** The files that power the game are `src/parts/*` and `build.py`, which produce `dist/irbid-drive.html`. `osm/` and `tools/` generate the
data parts. `tests/` holds the test harnesses, some of them obsolete (listed in CLAUDE.md).

**Other copies found.** `Downloads/irbid-drive-updated*.zip/html` are byte-identical to git v38. `irbid-drive-source.zip` is a v38-era snapshot. Both are older
than the current project and were not merged.

| Phase | Status |
|---|---|
| 1 Inspect / back up | Done. Projection, origin, units, terrain and colliders are documented in CLAUDE.md. |
| 2 Place database | Done in v40; re-verified in v42 (places 1,659).<br>Added `PLACE_REVIEW.csv`: 2,171 rows with review status.<br>The official school and mosque lists have no coordinates (PLACE_IMPORT_REPORT §5), so they could only be compared, not imported.<br>10,000 *named* places are not supported by the data; ~46,000 buildings are counted separately. |
| 3 Coordinates / roads | Done in v40/v41 (ROAD_AND_TERRAIN_REPORT).<br>One projection is used for everything.<br>Widths, lanes and speeds are estimates where OSM has no tag.<br>2 real OSM traffic-calming bumps; 88 labelled estimates.<br>Not done: bridge decks at real heights. |
| 4 Buildings / landmarks | Partly done. Real footprints and heights (tagged or estimated).<br>Heritage houses stand on their OSM footprints.<br>Photos are reference-only, which would otherwise add a network host.<br>No new landmark models or photo facades. |
| 5 Car models / specs | Partly done. 217 cars inventoried; Sketchfab candidates for 176 of them.<br>Nothing downloaded: needs an account, a licence/trademark decision and a change to the single-file rule.<br>All physical specs are labelled estimates (CAR_ASSETS_AND_SPECS). |
| 6 Localized damage | Done in v39.<br>Contact point, normal and normal speed, with a once-per-contact guard.<br>Dents, scuffs, lights and glass on the struck side.<br>Per-zone repair removes only that zone's dents.<br>Not done: detachable panels. |
| 7 Durability / mechanical | Done in v39. Per-car profiles; components engine, cooling, transmission, driveline, steering, brakes and suspension ×4; three modes. |
| 8 Per-wheel tyres | Done in v39, extended in v42.<br>Per wheel: tread, carcass, temperature (+ peak), load, longitudinal and lateral slip, spinning flag, surface grip, km, wear by cause.<br>RWD, FWD and AWD burnouts; drift wear on the sliding wheels.<br>A puncture differs from a worn tyre. |
| 9 G29 | Extended in v42.<br>Detect and disconnect; released/pressed calibration; combined pedals; clutch (display only); dead zones; live readings; clear messages.<br>Tested **simulated only** (G29_TEST_REPORT). |
| 10 Repair garage | Done in v42.<br>The Apex Drift Customs repair bay prices and repairs each part separately from the JD balance.<br>Prices are estimates (owner-approved economy change, PLAN.md). |
| 11 World objects | Done in v39. Breakable, bendable, movable and rigid classes, energy-based. |
| 12 Data / perf / tests | Done. Manifests, frustum culling (v40), the test suite. Real phones and a real G29 are untested. |

## 1. Starting point (v38, commit a852390, tag `v38-backup-before-v39`)

- **Engine:** one HTML file. Vanilla JS concatenated from `src/parts/*` by `build.py`, rendering with three.js r128 (WebGL) from
  cdnjs. There is **no physics engine**: driving is the hand-written arcade integrator `updP` (`10_laws_player.js`), and collisions
  use circle/box colliders in a 100 m hash (`COL`, `colB` in `05b_decor.js`). The v39 work integrates with these and adds no
  separate physics library.
- **Cars:** 217 entries in `PORS` (name, top speed, 0–100 time, L/W/H, body type, colour). Every car is the same procedural mesh
  generator (`mkPorsche`: an extruded side profile, a glass block, 2+2 light boxes, 4 cylinder wheels) sized to its dimensions.
  There are no 3D model assets.
- **Damage (v38):** Off/Cosmetic/Full. There were five whole-car percentages (body/engine/tyres/suspension/brakes); every hit
  reduced them regardless of where it landed. "Visual damage" meant a few dark boxes stuck on the sides. Utility poles and street
  lights broke at a fixed speed; a broken street light left its arm and lamp floating in the air.
- **Tyres:** one whole-car tyre number that wore slowly above 110 km/h. There were no wheels, slip, temperature, drivetrain or burnouts.
- **Map:** real OSM roads (26k nodes) and 19.6k real building footprints (BBBike extract, central Irbid only), about 1,000 named OSM
  places, SRTM terrain, ~36 hand-built landmarks. G29 wheel support, touch pads, races, heist, shop and navigation.

## 2. What changed

### 2.1 Per-car profiles (`carSpec`, `07c_realism.js`; table `manifest/cars.json`)

Each of the 217 cars gets: mass, drivetrain, engine position, EV / air-cooled flags, front weight share, CG height, wheelbase,
track, crush stiffness for front/rear/side, scratch/light/glass thresholds, component durability (engine, cooling, transmission,
driveline, steering, suspension, brakes) and tyre wear/heat sensitivity. No two of the 217 profiles are identical.

| Field | Source |
|---|---|
| Dimensions, top speed, 0–100 | existing game data (not re-verified) |
| Drivetrain | **documented layout for 181 names** (flagged `doc`; names covering several versions, e.g. "Porsche 911", are flagged *variant-dependent*); 36 by body type (`est`) |
| Engine position | documented for the rear/mid-engined list, otherwise body type |
| Mass | **estimate** = L×W×H × body-type density, loosely calibrated on a few published kerb weights; clamped 500–3,300 kg |
| Crush stiffness / thresholds / durability | **gameplay estimates.** Crush uses the linear relation v = b0 + b1·C (Campbell, SAE 740565) with typical coefficients: frontal ≈ 0.9 km/h per cm (≈ 53 cm at 56 km/h), side ≈ 1.0 (≈ 28 cm at 32 km/h, the order of the Euro NCAP pole test), scaled per body type and per car |

**No manufacturer crash-test data is used or claimed.**

### 2.2 Localized external damage

`registerPlayerImpact(v, collider, nx, nz)` receives the **normal closing speed** and the **contact normal** from `colB`, or from the
car-to-car code in `updP`. From them it computes:
- the **contact point** on the car's outline (mesh-local) and the **face** hit (front/rear/left/right);
- the **equivalent barrier speed**: rigid = closing speed; another car = energy shared by mass (`v·√(m₂ / 2(m₁+m₂))`, traffic mass
  1,400 kg estimate); an object that breaks = only the energy it absorbed. This is speed *along the normal*, not total speed, so glancing
  scrapes count little;
- **crush depth** for that face, and **zone damage** weighted by distance from the contact point (front-left, front-right, left side,
  right side, rear-left, rear-right; roof and underbody). A front-left hit leaves the rear zones and the right side untouched (tested);
- a **dent**: the player car's body and glass are tessellated once (~19k vertices, player only) and vertices near the contact point are
  pushed inward along the hit direction with a smooth falloff. Dents are stored per car (max 16, merged when close) and re-applied after
  switching or reloading;
- **lights** on the hit side break (material swap), **glass** cracks on the hit face (decals: windscreen, rear screen, that side's windows,
  side glass only for cabin-section hits), and **scuffs** are drawn on damaged zones;
- one hit per contact interval (0.48 s / 2.8 m), so pressing against a wall does not stack damage frame after frame.

Not supported by the procedural mesh: separate detachable panels (bumper/door/hood falling off). Dents deform the generic shape.

### 2.3 Internal damage and the three modes

| | Off | Cosmetic | Full |
|---|---|---|---|
| Record anything | no | visual zones, dents, lights, glass, tyre wear | everything |
| Driving changes | **none: byte-identical to v38** (`off_trace` hash) | none | progressive |

Full mode, by location of the hit: radiator behind the front bumper (air-cooled cars: at the engine) → **engine temperature** rises
under throttle, with limp mode above 112 °C, engine wear above 125 °C and smoke. Engine damage for front-engined cars from deep front
crush, and for rear/mid-engined cars from rear crush. Transmission, driveline (also from hard landings), steering rack, brakes,
**suspension per corner**, and **alignment per wheel** (toe → the car pulls). Effects are smooth functions with documented floors
(top speed ≥ 40 %, acceleration ≥ 30 %, steering ≥ 45 %, grip ≥ 35 %, brakes ≥ 50 %, lateral grip ≥ 45 %). New `updP` terms:
lateral grip (`dfx.lat`), pull (`dfx.pull`), and visual vibration. Hard landings (> 5.5 m/s vertical) damage the suspension and underbody.

**Diagnostics (key O):** a body map, each component with its % and severity word (OK/minor/moderate/severe/failed), the effect
computed from the same formulas the physics uses, a card per wheel, recent impacts with barrier-equivalent speed, and Repair all /
Replace tyres (free, so the economy is unchanged). Warning lights appear under the Damage button.
Damage is stored per car **name** in `irbid-drive-realism-v1` (schema v2; v38 records migrate automatically; a migration bug found by
the new test was fixed before commit). Switching cars never carries damage over (tested).

### 2.4 Per-wheel tyres, burnouts, drifting (`07d_tyres.js`)

Every frame, for each wheel: **load** (static split + longitudinal and lateral weight transfer from CG height, wheelbase and track),
**longitudinal slip** (drive force beyond traction for the driven wheels, burnout spin, handbrake lock, ABS-limited braking slip),
**lateral slip** (rear: sideslip + yaw × half wheelbase; fronts reduced while counter-steering a slide, an estimate), and **slip power**
→ **temperature** (heating vs convection, extra loss above 150 °C) → **tread wear** (∝ power², × temperature factor, ×1.6 off-road)
plus tiny rolling wear → **carcass** damage when bald or above 230 °C → **puncture / blow-out**. Wear is logged by cause (burnout, slide,
spin, lock, road).

**Burnout** = throttle + brake (or handbrake) below 2.5 m/s, *if* the drivetrain can overpower the driven wheels' grip plus whatever holds
them (foot brake front-biased 68/32; handbrake rear only). The outcome differs per car, as tested:

| Car | Throttle + brake | Throttle + handbrake |
|---|---|---|
| Mustang GT (RWD) | burnout: rear tyres only, 108 °C after 3 s | – |
| Fiesta ST (FWD) | no (the brakes hold the driven fronts) | burnout: front tyres only |
| Focus RS (AWD) | no | – |
| Model T | too weak | – |

Calibration (from `damage_test`): 3 s burnout ≈ 1 % rear tread; 30 s ≈ 21 %; 2 s launch 0.27 %; 51 s of ordinary driving < 0.2 %;
a 10 s full-lock power slide wears the loaded outside rear most (≈ 17 %) and the unloaded inside front least.
Grip effect (Full only): tread below 50 %, temperature above 110 °C, carcass below 60 %; a puncture is a separate, much worse state
(grip 0.35, pull, vibration, top speed ≤ 62 %).
**Honest limit:** this is a slip *estimator* on top of the arcade model. There is no wheel spin integration and no Pacejka curve, and the
underlying handling is not changed per car (that would alter the approved physics feel). Different cars do behave differently
through mass, drivetrain, weight split, tyre durability and burnout capability.

### 2.5 World objects (`07e_objects.js`, `manifest/world_objects.json`)

Every collider now has a class: **rigid** (walls/buildings 23.9k, trees 18.5k, guardrails 8.7k, bus shelters, monuments, structures),
**breakable** (street lights 3,709, utility poles 7,497, **road signs 1,782**, new), **movable** (dumpsters 696, new), **vehicle**, and
**traversable** (speed bumps). Breakables bend above a fraction of their break **energy** (½·m·v², so heavier cars break them sooner),
then snap. The pole falls along the car's direction of travel with a few pooled debris pieces, the collider is removed, and the
lamp arm, head and light pool or the sign plate go with it (this fixes the v38 floating lamps). The car keeps the speed the broken
object did not absorb. Dumpsters are shoved by momentum exchange, slide with friction, may tip, and their collider returns where they
stop. Rigid objects never move or vanish. Only active in Cosmetic/Full; with damage Off every object is as solid as in v38.
Not modelled: guardrail deformation, shelter glass breakage, fences/barriers as separate props (they do not exist as props).

### 2.6 Map data (`osm/overpass/*`, `manifest/places.json`, `manifest/DATASET_REPORT.md`)

- New pipeline: the boundary comes from the road network's own window. Overpass fetches POIs, buildings and highway tags; the Python
  projection is identical to the game's (< 1 µm).
- **62,829 genuine records in the window**: 2,141 unique POIs, 46,142 buildings, 14,546 highway ways. POIs alone cannot reach 10,000:
  OSM does not have that many in Irbid, and none were invented.
- Mosques 211 (tagging: place_of_worship + religion, building=mosque). Schools 146 (amenity/education/building), plus universities,
  colleges and kindergartens. 62 duplicates merged by rule; different names are never merged.
- Official lists (Awqaf 2023 mosques, MoE 2018 schools) have **no coordinates**: they were used only to measure coverage. **Schools
  are under-mapped in OSM: 146 mapped vs 1,358 on the MoE list for the governorate.**
- In game: **places 1,038 → 1,473** (+102 schools, +82 mosques, +27 hospitals, …), landmarks unchanged (RLP order preserved),
  "Latin Church" fixed (was classed as a mosque).
- Not done: the 26,591 OSM buildings outside the building extract are still procedural in game; footprints are still minimum
  rectangles; roof/height tags are almost absent in OSM (213 heights, 0 roof shapes).

### 2.7 Photos (`osm/photos/commons.py`, `manifest/photos.json`)

See section 4.

### 2.8 Car models

**Not changed.** No licensed 3D model was downloaded. Reasons:
1. Sketchfab downloads (incl. the Download API) need the owner's account and token.
2. Each model needs a human check of accuracy (proportions, wheel positions, lights) and a licence that allows redistribution in this
   game. CC0 / CC BY are fine; NC rules out monetisation; ND forbids splitting the mesh into damage regions. A public probe of the
   Sketchfab search API for "Ford Focus RS" returned NC, NC-SA and CC BY candidates, so suitable licences exist for some cars.
3. Real car brands are trademarks. Using recognizable branded models is the owner's decision.
4. Constraint 8 (one offline HTML file): 217 GLBs at 1–10 MB each would be 0.2–2 GB. Shipping models would need a separate asset
   folder with lazy loading and LOD. That is an architecture change for the owner to approve.

`manifest/cars.json` lists every car with `model.asset = procedural` and `verification = approximation`, plus all damage and tyre
parameters. The damage system already works on part regions of the procedural mesh (body, glass, each light, each wheel), so a
future GLB only needs the same `userData.part` tags.

## 3. Constraints kept

Seeded generators untouched (no `PR()` change). Economy unchanged (repairs free, prices/odds/fines identical). `irbid-save` shape
untouched. PORS list, rarity and spawn tables unchanged. **Physics with damage Off is identical** (2,760-frame trace, 4 cars, same SHA-1 as
v38). Single file, no new runtime hosts or network calls. No per-frame allocation in the new per-frame code (pooled sparks/debris,
shared `DFX`, typed arrays for tyre state). HUD strings unchanged; damage toasts gained the zone name.

## 4. Photos

`osm/photos/commons.py` checked **1,535 places**: OSM mosques, churches, schools, hospitals, museums, parks, malls and civic places,
plus every named in-game place. **Wikimedia Commons** was the source. A file counts only when it is geotagged within 150 m of the
place **and** a distinctive word of the place's name appears in its title or category. Generic words like "mosque", "school" or
"Irbid" do not count.

- **12 places have a verified photo (27 photo entries).** They are Yarmouk University, JUST, Arar House (two records),
  Nabulsi House (two records), Capitolias (Beit Ras), King Abdullah II Park, Irbid Clock Memorial Square and Dar As Saraya Museum.
  Matches: 24 by title, 3 by category. Confidence: 20 high, 7 medium. The JUST file is a campus tree photo 146 m from the
  centre point. It is real but only medium confidence.
- **Licences:** CC BY-SA 4.0 ×19, CC BY 3.0 ×5, CC BY 4.0 ×3. All permit redistribution with attribution, and CC BY-SA adds
  share-alike. Creator, licence URL and source page are stored per entry.
- **1,523 places have no verified photo** (listed in `no_photo`). Commons has only 257 geotagged files anywhere near the checked
  places, and most show unrelated scenes. No mosque or school has a verified photo.
- **v40, Openverse:** it holds 718 images mentioning Irbid (347 are Commons mirrors). 1 more photo was accepted (Flickr "Irbid Archaeological
  Museum", CC BY 2.0, medium confidence: name match, no coordinates); 85 name matches were rejected for NC/ND licences.
- OSM `image=` tags in the area link to Facebook, postimg and ibb with no licence, so they were rejected. Mapillary was not used
  (needs a token).
- **Use:** reference only. The game does not download or show these photos (single offline file, no new hosts).

## 5. What is still missing (honest list)

| Item | Status | Needs |
|---|---|---|
| Licensed 3D car models | none | owner account + per-model licence/trademark review + asset-loading architecture |
| Detachable panels | not supported by the procedural mesh | real models with separate panels |
| Full tyre physics (wheel rotation, Pacejka) and per-car base handling | not done (estimator only) | owner approval: changes physics feel / drift scoring |
| Real buildings outside the extract (26,591), real outlines, heights | not done | pipeline + performance work (`placeReal` with LOD/merging) |
| Schools/mosques without coordinates | cannot be placed | OSM mapping |
| Photos shown in game / photo-based facades | not done | asset folder or owner approval for a host; per-building modelling |
| Mapillary | not used | access token |
| Real-device tests (Android, iPhone, G29 hardware) | not run | devices |
| Speed bumps | still estimated positions | owner decision (PLAN.md) |
