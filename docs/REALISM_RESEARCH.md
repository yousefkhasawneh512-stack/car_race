# Realism research log (v44, 2026-10-19)

Sources **actually opened and used** for the v44 work (visible vehicle damage, environment materials, speed bumps, traffic signals, places).
Each entry says what the source says (as read) and which code decision it supports. Access date for all: **2026-10-18/19**.

**Count: 46 sources used.** The owner's brief asked for 200. That number was not reached: only sources that were opened, read and
applied are listed, and nothing is padded. Pages that could not be read (403/404/redirect walls) or gave no usable content are listed
separately at the end and are **not** counted. The project's earlier data sources (OSM extracts, SRTM, Arabella/Irbid Mall sites, Wikidata
cross-check of v43b, ...) are documented in `DATA_SOURCES_AND_LICENCES.md` and are not re-counted here.

Honest limits that follow from the sources: no source gives Irbid-specific signal timing, speed-bump geometry or locations, per-model crash
behaviour for the 217 game cars, or break thresholds for street trees / garden walls. Those values in the code are **gameplay estimates**,
labelled as such, and chosen to be consistent with the physics relations below (energy ~ v², bending strength ~ d³, quarter-car dynamics).

## A. Rendering and browser engineering (three.js r128, Web APIs)

| ID | Title / issuer | URL | Finding used | Code decision |
|---|---|---|---|---|
| R01 | BufferGeometry, three.js docs | https://threejs.org/docs/pages/BufferGeometry.html | Recompute normals and bounding sphere after editing vertex positions; `dispose()` frees GPU memory | `dpBend` / `dpDoor` (07h) rewrite positions from an immutable base copy, then `computeVertexNormals()`; dents keep `computeBoundingSphere()` (07c) |
| R02 | BufferAttribute, three.js docs | https://threejs.org/docs/pages/BufferAttribute.html | `needsUpdate=true` re-sends a changed array to the GPU | bonnet / boot / door panels and dents set `position.needsUpdate` |
| R03 | InstancedMesh, three.js docs | https://threejs.org/docs/pages/InstancedMesh.html | One draw call for many instances; `setColorAt` + `instanceColor.needsUpdate`; whole batch is culled together | all signal lamps are ONE InstancedMesh with per-lamp colour, updated only when a phase changes (`sigTick`, 05b); global mesh with culling off |
| R04 | CanvasTexture, three.js docs | https://threejs.org/docs/pages/CanvasTexture.html | Canvas textures upload on creation; redraw needs `needsUpdate` | glass-crack, scratch and wall-scrape textures are drawn once per state on a canvas (`dpCrackTex`, `dpScratchMat`, `wallDecals`) |
| R05 | Material, three.js docs | https://threejs.org/docs/pages/Material.html | `polygonOffset` is meant for decals on surfaces; `depthWrite:false` for layered transparent overlays | crack / scratch / wall decals use polygonOffset and no depth write, so they sit on the pane or wall without z-fighting |
| R06 | Object3D, three.js docs | https://threejs.org/docs/pages/Object3D.html | `getWorldPosition`, recursive `clone`, `userData` for custom data | torn-off bumpers / mirrors are cloned at their world position into the scene (`dpDetach`); parts tagged via `userData.part` |
| R07 | WebGL best practices, MDN | https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices | Batch draw calls into fewer, larger calls; budget GPU memory | all 90 speed bumps are one merged mesh (was ~880 small meshes); new car parts only on the player car (+10 draw calls), measured in `perf_pw.py` |
| R08 | Window.requestAnimationFrame, MDN | https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame | Advance by elapsed time, not by frame count (refresh rates differ) | the bump suspension integrates with the frame `dt` in sub-steps sampled along the travelled path |
| R09 | Performance.now, MDN | https://developer.mozilla.org/en-US/docs/Web/API/Performance/now | Monotonic high-resolution ms clock | load-time measurement in `tests/perf_pw.py` |
| R10 | Typed arrays, MDN | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays | Fixed-format binary arrays used by WebGL | undamaged panel vertices are kept in a `Float32Array` base and every deformation starts from it (no cumulative drift) |
| R11 | Memory management, MDN | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management | Allocation in hot loops adds GC work; reuse objects | per-frame code (`bumpVisual`, `sigTick`, `dpTick`) reuses objects; debris and decals are pooled (48 debris, 16 wall marks, 8 detached parts) |
| R12 | Canvas API, MDN | https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API | 2D drawing API for programmatic graphics | procedural crack patterns (radial + ring cracks, tempered-glass crazing) |
| R13 | glTF 2.0 specification, Khronos | https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html | Runtime 3D asset format (GLB = JSON + binary) | not used: an external GLB per car would break the single-file rule and needs per-model licences; damage stays on the procedural meshes |
| R14 | Rapier JS rigid bodies | https://rapier.rs/docs/user_guides/javascript/rigid_bodies/ | Dynamic/kinematic bodies, automatic mass from colliders, CCD | not adopted: it would add a WASM dependency and replace the approved arcade controller (`off_trace` must stay identical to v38); bounded custom physics instead |

## B. Vehicle damage and crash physics

| ID | Title / issuer | URL | Finding used | Code decision |
|---|---|---|---|---|
| V01 | Kinetic energy, Wikipedia | https://en.wikipedia.org/wiki/Kinetic_energy | E = ½mv²; energy grows with the square of speed | every break / bend test compares ½·m·v² with the object's break energy; heavier cars break objects sooner at the same speed |
| V02 | Crumple zone, Wikipedia | https://en.wikipedia.org/wiki/Crumple_zone | Front/rear crush zones absorb crash energy; a UK study put 65 % of impact damage at the front, 25 % at the rear, 5 % per side | damage is concentrated where the car is hit; bumpers and bonnet / boot lid take frontal / rear crush, the cabin (doors) only side hits |
| V03 | Laminated glass, Wikipedia | https://en.wikipedia.org/wiki/Laminated_glass | Laminated glass cracks in a spider-web of radial + concentric cracks and stays bonded; used for windscreens | windscreen cracks grow from a stored origin (radial + ring cracks) and the pane stays in place |
| V04 | Tempered glass, Wikipedia | https://en.wikipedia.org/wiki/Tempered_glass | Tempered glass shatters into small granular pieces; used for side / rear windows | side and rear windows craze over the whole pane once they fail; bus-shelter panels break out with glass debris |
| V05 | Guard rail, Wikipedia | https://en.wikipedia.org/wiki/Guard_rail | W-beam rails are designed to deflect, absorb energy through rail and posts, and redirect the vehicle | guardrail impacts deflect the rail instance (up to 0.45 m) and lower the car's equivalent barrier speed (×0.8) |
| V06 | Section modulus, Wikipedia | https://en.wikipedia.org/wiki/Section_modulus | Solid circular section: S = πd³/32; yield moment M = S·σ | tree snap speed scales as (d / 0.30 m)^1.5, i.e. break energy ∝ d³ (07e `treeBreakV`) |
| V07 | Masonry, Wikipedia | https://en.wikipedia.org/wiki/Masonry | Very low tensile vs compressive strength; units loosely joined by mortar, poor lateral resistance. (It does NOT list poor impact resistance.) | garden walls crack first and collapse once accumulated energy reaches a break energy; that threshold (10–13 m/s for 1,500 kg) is a labelled estimate |
| V08 | Rolling resistance, Wikipedia | https://en.wikipedia.org/wiki/Rolling_resistance | Car tyres on asphalt C_rr ≈ 0.007–0.015; lower pressure raises rolling resistance (no figure given) | a flat tyre adds a rolling-resistance deceleration (`DFX.roll`, 0.45 m/s² per flat = several times a healthy tyre; estimate) |
| V09 | Unsprung mass, Wikipedia | https://en.wikipedia.org/wiki/Unsprung_mass | Lighter unsprung mass follows short bumps better; heavier wheels lose contact (wheel hop) | on a bump the wheel can drop back only at a limited rate (`WDROP`), so at speed it leaves the far side and the body keeps the upward kick |
| V10 | Car suspension, Wikipedia | https://en.wikipedia.org/wiki/Car_suspension | Natural frequency set by ride rate and sprung mass; travel = droop to bump; race cars run stiffer springs; rubber bump stops (no figures) | per-body-type suspension frequency (07g `PT_FN`, 1.2–2.8 Hz estimates) and travel to bump stop (5 / 7.5 / 11 cm) |
| V11 | NHTSA / IIHS / Euro NCAP test pages | https://www.iihs.org/ratings/about-our-tests | IIHS runs small-overlap front, moderate-overlap front and side tests (the page lists test types; speeds on sub-pages that could not be read) | used only to confirm that crash ratings are per-model test results: **no** rating is turned into a game threshold |

## C. Traffic signals and speed bumps

| ID | Title / issuer | URL | Finding used | Code decision |
|---|---|---|---|---|
| T01 | MUTCD 2009 Part 4D, FHWA | https://mutcd.fhwa.dot.gov/htm/2009/part4/part4d.htm | 4D.09: red sections above yellow above green (vertical); 4D.26: yellow change interval 3–6 s, red clearance ≤ 6 s | 3-aspect vertical heads, red on top; amber 3 s and a 3 s all-red clearance (a US reference used as general practice, not a Jordanian rule) |
| T02 | Traffic light, Wikipedia | https://en.wikipedia.org/wiki/Traffic_light | Standard green → amber → red; all-red stage between conflicting phases; red+amber is a UK-style variant | cycle green → amber → red with an all-red clearance; no red+amber phase |
| T03 | Vienna Convention on Road Signs and Signals, Wikipedia | https://en.wikipedia.org/wiki/Vienna_Convention_on_Road_Signs_and_Signals | Defines signal meanings; Jordan is **not** listed as a party | the code claims no Jordan-specific signal standard; the head design is generic |
| T04 | Awad (2014), Drivers' behavior at signalized intersections operating with flashing green, Civil and Environmental Research 6(1), IISTE | https://iiste.org/Journals/index.php/CER/article/view/10346 | 34 of 105 signalised intersections in Greater Amman ran flashing green, adopted without guidelines | flashing green is not modelled (its use in Irbid is undocumented) |
| T05 | Tag:highway=traffic_signals, OSM wiki | https://wiki.openstreetmap.org/wiki/Tag:highway%3Dtraffic_signals | Signals are mapped on the junction node or on each incoming way at the stop line | OSM signal nodes within 40 m of a junction mark it as a real signal; split junctions share one controller |
| T06 | Speed bump, Wikipedia | https://en.wikipedia.org/wiki/Speed_bump | Bump: 8–10 cm high, ≤ 0.3 m long, 10–15 km/h; hump: 8–10 cm, 3.7–4.3 m long, 25–30 km/h | OSM `hump` = 3.7 m × 75 mm; the 0.9 m profile used for OSM `bump`/estimated bumps is an estimate between the two definitions |
| T07 | Tag:traffic_calming=bump, OSM wiki | https://wiki.openstreetmap.org/wiki/Tag:traffic_calming%3Dbump | A bump is ~30 cm or shorter in the travel direction; a hump is longer | profile chosen from the OSM tag; only 2 bumps are mapped in the play area |

## D. Places and map data

| ID | Title / issuer | URL | Finding used | Code decision |
|---|---|---|---|---|
| P01 | OpenStreetMap copyright and licence | https://www.openstreetmap.org/copyright | Attribution required; derived databases share-alike (ODbL) | `#osmcr` attribution kept; raw extracts stay local (owner rule) |
| P02 | Overpass QL, OSM wiki | https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL | Bounding box order (S,W,N,E), `nwr`, `out center`, regex tag filters | new `named` layer query in `osm/overpass/fetch.py` |
| P03 | Overpass API (overpass-api.de) | https://overpass-api.de/api/interpreter | Live queries, OSM base 2026-10-18 21:14 / 22:25 UTC: 10 traffic-signal nodes, 2 traffic-calming features, 1,933 named non-road objects in the window | signal / bump inventory; the upper bound for new places |
| P04 | Key:building, OSM wiki | https://wiki.openstreetmap.org/wiki/Key:building | Dwelling values: house, detached, apartments, residential, terrace, bungalow, semidetached_house, farm, annexe, cabin, ... | none of these is imported as a place (privacy); only named non-residential buildings whose name says what they are |
| P05 | Tag:tourism=caravan_site, OSM wiki | https://wiki.openstreetmap.org/wiki/Tag:tourism%3Dcaravan_site | A place to stay overnight in a caravan / RV | the 7 "كراج" features tagged caravan_site are shown as bus/taxi stands by name (tag conflict flagged for review) |
| P06 | Tag:natural=peak, OSM wiki | https://wiki.openstreetmap.org/wiki/Tag:natural%3Dpeak | Summit node of a hill or mountain | 15 named peaks added as searchable areas |
| P07 | Tag:landuse=cemetery, OSM wiki | https://wiki.openstreetmap.org/wiki/Tag:landuse%3Dcemetery | Area for burials, separate from a religious site | named cemeteries added as places |
| P08 | Nominatim usage policy, OSMF | https://operations.osmfoundation.org/policies/nominatim/ | Max 1 request/s; no bulk / systematic POI downloads | Nominatim not used; data comes from Overpass |
| P09 | Data of schools [2018], Ministry of Education (opendata.gov.jo) | https://opendata.gov.jo/dataset/data-of-schools-162-2018 | One XLSX, 2018, "Open Jordanian License"; no coordinates stated | name cross-check only; nothing placed from it; "Al-Ghasoor" not in the list |
| P10 | Mosques [2023], Ministry of Awqaf (opendata.gov.jo) | https://opendata.gov.jo/en/dataset/mosques-2483-2023 | Two Irbid XLS files, updated 16 Jul 2025 | name cross-check only (no coordinates) |
| P11 | Heritage list, Greater Irbid Municipality | https://irbid.gov.jo/?page_id=6711 | 27 named heritage sites; no addresses or coordinates | unchanged: absent sites not placed (no coordinates) |
| P12 | Wikidata Query Service (SPARQL, items within 15 km) | https://query.wikidata.org/sparql | 241 items with coordinates (v43b) | search aliases + landmark position check (v43b); no new places from it |
| P13 | Sketchfab licences | https://sketchfab.com/licenses | Standard / Editorial licences restrict redistribution | no third-party car models embedded |
| P14 | Reusing content outside Wikimedia, Commons | https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia | Credit author, name the licence, link if required | photos stay reference-only (`manifest/photos.json`) |

## Consulted but NOT counted (no usable content or not reachable)

| URL | Result |
|---|---|
| https://threejs.org/manual/en/how-to-dispose-of-objects.html and .../optimize-lots-of-objects.html (and their GitHub raw copies) | 404 |
| https://www.ecfr.gov/... (FMVSS 205 glazing) | redirect to a bot wall; not read (glazing behaviour taken from V03/V04 instead) |
| https://highways.dot.gov/... (FHWA clear zones, trees) | 403 |
| https://www.nhtsa.gov/research-data/crashworthiness | 403 |
| https://www.euroncap.com/en/for-engineers/protocols/ | page lists categories only |
| https://www.sae.org/publications/technical-papers/content/740565/ | page body not delivered (Campbell 1974 is still the crush model reference in 07c, from earlier work) |
| https://tsrgd.co.uk/pdf/tal/1996/tal-2-96.pdf (UK TAL 2/96 road humps) | compressed PDF, not readable by the fetch tool |
| https://en.wikipedia.org/wiki/Quarter_car_model | 404 |
| https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/queries/examples | truncated before the relevant example |
| https://mail.walkinginfo.org/pedsafe/pedsafe_curb1_CM_NUM_24/ (FHWA PEDSAFE, speed humps 75–100 mm, 3.7 m) | seen only as a search-result summary, not opened: not counted |
| Searches for "مدرسة الغصور إربد" and "Pikaboo Irbid Jordan" | no result identifying either place |
