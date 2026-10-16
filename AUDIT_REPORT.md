# Irbid Drive: v39 audit (realistic cars, damage, tyres, map data). 2026-10-16

What the project was, what changed, what is real, what is estimated, and what is still missing. The previous (v37) realism audit is
`docs/AUDIT_v37.md`. Test evidence is in `TEST_REPORT.md`; sources and licences are in `DATA_SOURCES_AND_LICENCES.md`.

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
