# Name corrections (v40, v43 audit 2026-10-17)

Every in-game place was checked against OpenStreetMap (Overpass, OSM base 2026-10-17 08:23 UTC). A change was made only when a
source supports it. Where sources disagree, or no source exists, the record is listed here and in `manifest/unresolved_places.json`,
and **nothing was guessed**. Old names stay searchable (aliases), so nothing a player used to type stops working.

## v43 accuracy audit (2026-10-17)

Applied by `osm/overpass/build.py` from `osm/overpass/corrections.py` and logged in `manifest/name_review.json` (each entry: field, old, new, rule/evidence, confidence).
These change only the **game's copy**. OpenStreetMap itself is not edited; the suspected OSM errors are in `manifest/osm_upstream_issues.json` (58) for a checked, on-site edit.
Audit ids refer to the owner's `irbid-place-database-issues.csv`. Coordinates are unchanged for every record in this section (no position was moved).

### A. Audit items (per record)

| Audit | OSM id | Record | Change | Evidence | Confidence |
|---|---|---|---|---|---|
| CAT-001 | osm:n4346249699 | محطة توليد كهرباء أربد (Utility (power station, by name), 1469 / 1686 m) | kind → civic; category → Utility (power station, by name) | name "محطة توليد كهرباء أربد" = Irbid electricity generating station; the only tag is shop=outdoor (camping/outdoor goods), which contradicts it. Shown as a utility; exact facility unverified. | medium |
| CAT-004 | osm:n4178791194 | الطرزي للاسكان 2 (Housing / apartments (by name; OSM says motel), 2715 / -1534 m) | category → Housing / apartments (by name; OSM says motel) | name "الطرزي للاسكان 2" = "Al-Tarazi Housing 2" (a housing project name); OSM tourism=motel. Not shown as a motel; real use unverified. | medium |
| CAT-005 | osm:n4228235389 | نادي ضباط الشمال (Officers' club (OSM says hotel; lodging unverified), 1325 / -198 m) | kind → civic; category → Officers' club (OSM says hotel; lodging unverified) | name "نادي ضباط الشمال" = North Officers' Club; OSM tourism=hotel. Shown as a club; whether it also offers rooms is not verified. | medium |
| CAT-003 | osm:w1150288656 | عيادة شلبي (Beauty / cosmetic clinic (unverified), 2606 / 2294 m) | category → Beauty / cosmetic clinic (unverified) | name "عيادة شلبي" = Shalabi Clinic; OSM shop=beauty. Both fit a cosmetic clinic; kept in the beauty group, labelled as a clinic, flagged for a local check. | medium |
| CAT-006 | osm:n798858301 | حكما (Mosque, 3390 / -4991 m) | kept out of the game (stays in the manifest) | "حكما / Hakama" is the village name (name:de/fr, int_name and is_in come from a gazetteer import of the village) on a node tagged place_of_worship 0.8 km from the OSM village node. Not shown as a mosque named "Hakama"; the village stays searchable. A mosque may exist there: unverified. | medium |
| NAME-001 | osm:n9648242752 | اربيلا مول (Mall, 1114 / 1307 m) | name_en → Arabella Mall; aliases + Arbila Mall, أرابيلا مول | official site arabellamall.jo spells it Arabella Mall / أرابيلا مول; its map pin (32.5384089, 35.8621412) is 34 m from this OSM node. OSM spelling "Arbila Mall" kept as an alias. | high |
| OSM-002 | osm:n7282077301 | الحذاء الإيطالي (Shoes (OSM says hospital), 1186 / 1716 m) | kind → dukkan; category → Shoes (OSM says hospital); alias removed: brand | name "الحذاء الإيطالي" = "The Italian Shoe"; OSM amenity=hospital + brand=Payless ShoeSource (an editor preset). A shoe shop, not a hospital. | high |
| OSM-004 | osm:w1380644968 | Latin Church (Church (Latin / Roman Catholic, by name), 3035 / 7103 m) | category → Church (Latin / Roman Catholic, by name) | name "Latin Church" next to the Latin Patriarchate school; never a mosque. Denomination not tagged in OSM; taken from the name only. | high |
| GAP-011 | osm:w696141882 | Greek Orthodox Church (Church, -286 / -842 m) | aliases + كنيسة الروم الأرثوذكس | OSM "Greek Orthodox Church" (religion=christian) on Tell Irbid = municipal list "كنيسة الروم الأرثوذكس". Not the Greek Catholic church (node 7285033997), which stays separate. | high |
| heritage | osm:w696141883 | Irbid Great Mosque (Mosque, -180 / -630 m) | aliases + مسجد اربد الكبير, الجامع الكبير | OSM "Irbid Great Mosque" = municipal list "مسجد اربد الكبير". | high |
| heritage | osm:w696141881 | Irbid Archaeological Museum (Museum, -186 / -865 m) | aliases + دار السرايا | OSM "Irbid Archaeological Museum / متحف سرايا إربد" = municipal list "دار السرايا". | high |
| GAP-006 | osm:w1173930235 | Arar House (Historic: building, -315 / -844 m) | aliases + منزل عرار, بيت عرار | OSM "Arar House / بيت عرار الثقافي" = municipal list "منزل عرار" and Visit Jordan "Beit Arar". | high |
| heritage | osm:w1173930712 | Nabulsi House (Historic: building, -449 / -871 m) | aliases + بيت النابلسي | OSM Nabulsi House = municipal list "بيت النابلسي". | high |
| OSM-001 | osm:n5606766135 | مدرسه حكما الاساسيه للاناث (School (by name), 3083 / -4551 m) | aliases + حكما الاساسية للبنات | MoE 2018 lists "حكما الاساسية للبنات" (girls = اناث); the OSM node has only a name, no tags. | high |

### B. Name contradicts the tags (rule; high confidence: the name states what the place is)

| OSM id | Name | OSM tags said | Game now |
|---|---|---|---|
| osm:n5606753002 | مركز صحي راسون | Hospital | Health centre |
| osm:n5606667153 | مدرسة زوبيا الاساسية للبنين | Hospital | School (by name) |
| osm:n5606667147 | مركز صحي زوبيا | Hospital | Health centre |
| osm:n5606667150 | بلدية زوبيا | Hospital | Municipality |
| osm:n5606667156 | مدرسة زوبيا الثانوية للبنات | Hospital | School (by name) |
| osm:n5606667152 | مدرسة زوبيا الثانوية للبنين | Hospital | School (by name) |
| osm:n5606740202 | مركز صحي دير يوسف | Hospital | Health centre |
| osm:n5606771826 |  | Hospital | Health centre |
| osm:n13477569166 | مدرسة أكاديمية القمة الدولية | Office: educational institution | School (by name) |
| osm:n5606637254 | مركز صحي الصريح | Hospital | Health centre |
| osm:n13476996350 | مدرسة عمار بن ياسر الأساسية للبنين | Office: educational institution | School (by name) |
| osm:n5606732707 | مركز صحي كفريوبا الشامل | Hospital | Health centre |
| osm:n9592824073 |  | Hospital | Health centre |
| osm:n7390377610 | مركز صحي زحر | Hospital | Health centre |
| osm:n7468749889 |  | Hospital | Health centre |
| osm:n7284778606 | المستوى للسياحة والسفر | Sports centre | Travel agency (by name) |
| osm:n7284664788 | الأمل للسياحة والسفر | Sports centre | Travel agency (by name) |
| osm:n5606628584 | مركز صحي حنينا | Hospital | Health centre |
| osm:n5606628597 |  | Hospital | Health centre |
| osm:n10315720419 | مركز صحي فوعرا | Hospital | Health centre |
| osm:n5606496742 | مركز صحي سال | Hospital | Health centre |
| osm:n5606766135 | مدرسه حكما الاساسيه للاناث | Named point (no category tag) | School (by name) |
| osm:w1042041062 | مركز صحي كفرعان | Hospital | Health centre |

### C. Placeholder text and several names in one tag

| OSM id | Old name | New name | Rule |
|---|---|---|---|
| osm:n7282024382 | `مجوهرات الزعبي;lilas` | مجوهرات الزعبي | several values in one name tag (";"): the first is the name, the others become search aliases (high) |
| osm:n7281820692 | `عادل;روعة` | عادل | several values in one name tag (";"): the first is the name, the others become search aliases (high) |
| osm:n7281820697 | `pretty;كراميش 2` | pretty | several values in one name tag (";"): the first is the name, the others become search aliases (high) |
| osm:n7284859502 | `No name` | (unnamed: not labelled) | placeholder text ("no name") is not a name (high) |
| osm:n7284992368 | `no name fation and more;بلعاوي` | بلعاوي | placeholder text ("no name") is not a name; several values in one name tag (";"): the first is the name, the others become search aliases (medium) |
| osm:n7291701817 | `fire snack;طعميه` | fire snack | several values in one name tag (";"): the first is the name, the others become search aliases (high) |
| osm:n9644930915 | `دولما;كروش و روس` | دولما | several values in one name tag (";"): the first is the name, the others become search aliases (high) |
| osm:n9644972219 | `مطعم الفدين للبخاري;TiK ToK` | مطعم الفدين للبخاري | several values in one name tag (";"): the first is the name, the others become search aliases (high) |
| osm:n9644972225 | `;شعبان مول` | شعبان مول | stray ";" removed (high) |
| osm:n9647821338 | `No Comment;Oppo` | No Comment | several values in one name tag (";"): the first is the name, the others become search aliases (high) |
| osm:n9644930916 | `شيري كيك;Classic` | شيري كيك | several values in one name tag (";"): the first is the name, the others become search aliases (high) |
| osm:n9644972217 | `flREFLY;قهوة عرب` | flREFLY | several values in one name tag (";"): the first is the name, the others become search aliases (high) |
| osm:n9644972224 | `دجاج عصفور;للمأكولات البحرية الطازجه` | دجاج عصفور | several values in one name tag (";"): the first is the name, the others become search aliases (high) |

The other values stay searchable as aliases. Two records merged with an existing same-name neighbour after the split (`pretty` 3.3 m, `دولما` 10.2 m; `osm/overpass/out/duplicates.json`).

### D. Editor-preset brand tags removed from search aliases

Many shops here were mapped with an iD preset that added an international chain's `brand` (e.g. Arab Bank tagged "Capital Bank", phone shops tagged "T-Mobile"). A brand is kept only when all its words are in the name. Fuel stations and ATMs keep theirs (the brand is the operator, e.g. JO Petrol).

| OSM id | Name | Brand removed |
|---|---|---|
| osm:n7282160273 | Donuts factory | Dunkin' Donuts |
| osm:n7282160284 | ' Donuts house | Dunkin' Donuts |
| osm:n7282321887 | ابو حصوه | Spar |
| osm:n7282322886 | بيت البيتزاء الايطالي | PizzaExpress |
| osm:n7282322895 | البنك العربي | Capital Bank |
| osm:n7282053331 |  | Payless ShoeSource |
| osm:n7281792538 | أقساط | Mobil Mart |
| osm:n7281792541 | Maxx mobile | Mobil Mart |
| osm:n7281792550 | الحريري | Mobil Mart |
| osm:n7281814229 | uni zone | Mobil Mart |
| osm:n7281814231 | me and you | Mobil Mart |
| osm:n7281825402 | coffe house | Hard Rock Cafe |
| osm:n7281825413 | بنك الاتحاد | Access Bank |
| osm:n7281825416 | alrayan | Hard Rock Cafe |
| osm:n7284296558 | nadeen optics center | Opticalia |
| osm:n7284339515 | T10 Market | Simply Market |
| osm:n7284362996 | florence | Opticalia |
| osm:n7287570353 | كرم | T-Mobile |
| osm:n7287602294 | أبراج الرياضة | Intersport |
| osm:n9648242756 | السيفوي | Market Basket |
| osm:n7284778606 | المستوى للسياحة والسفر | iFLY |
| osm:n7284080063 | Samsung | T-Mobile |
| osm:n7284664788 | الأمل للسياحة والسفر | iFLY |
| osm:n7284692417 | Lz MarkEt | Simply Market |
| osm:n7284869268 | ميرامار | Dress Barn |
| osm:n9647899732 | Al_ARABE COFFEE | Coffee Lab |
| osm:n7284585074 |  | Church b |
| osm:n7284938841 | البنك الأردني الكويتي | mBank |
| osm:n7284942471 | omer sky | Simply Market |
| osm:n7284991600 |  | Simply Market |
| osm:n7287654981 | البيروتي للبصريات | Optical Center |
| osm:n7287730171 | لوريت | Turkish Airlines |
| osm:n7282049979 |  | The Body Shop |
| osm:n7282077301 | الحذاء الإيطالي | Payless ShoeSource |
| osm:w1391017489 | Supercharger Al Noaymah, Jordan | Tesla Supercharger |

### E. Checked and NOT changed (no source settles them)

| Audit | Record | Finding |
|---|---|---|
| NAME-002 | `Hashim Pipers Mosqe` (osm:n6623036477, 1382 / -2017 m) | OSM has only this English name; no Arabic name and no match in the two Awqaf Irbid lists (searched هاشم). Kept as mapped, flagged. Not guessed. |
| NAME-005/006/007 | `coffe house`, `Lunsh Box`, `Elffel. T. Towen` (University St cluster) | Likely typos, but the shop signs are unverified, so spelling kept. `coffe house` lost its preset alias "Hard Rock Cafe". |
| CAT-007 | `الكردي` (osm:n7480332269) and `معجنات الكردي` (osm:n7284896688), 58 m apart | Different names, both fast food. No evidence either is "أسواق الكردي الاستهلاكية" (a supermarket). Both kept, separate. |
| DUP-001/002/003/005/006 | ابواب العلم (4 nodes), الصالحين, عمر بن الخطاب, tik tok, Alta Moda | Already merged by the v40 de-duplication (same normalized name and kind; 1.6–15.2 m). The other same-name mosques are 1–10 km apart: different mosques. |
| DUP-004 | `شعبان مول` mall (osm:n9645113835) + supermarket (osm:n9644972225), 12.8 m | Stray ";" removed. Kept as two places (a mall and a 24/7 supermarket); not merged without evidence they are one. |
| DUP-007 | `مدرسة الامير حسن الثانوية للبنين` on 4 OSM buildings (ways 1068635484, 1337602841, 1337602864, 1337609603; up to 464 m apart) | MoE 2018 lists ONE such school in Qasabat Irbid ("الامير الحسن الثانويه الشاملة للبنين", حي القصيلة); all four buildings are in/near Al-Qusayla. At most one is that school; which one is unknown. All kept, flagged (also `مدرسه سال الاساسيه المختلطه`, 2 buildings 549 m). Same for `Omar Fakr al-Schalabi School` (2 buildings, 613 m; MoE: one school, حي المنارة). |
| OSM-003 | `مركز صحي حنينا` and the other `مركز صحي` (14 were tagged hospital; all 16 are medical now) | Shown as Health centre (Ministry of Health primary centres), not Hospital. |

## v40 corrections

## 1. Hand-built landmarks (the names shown in "Passing:")

| Old game name | New game name | Evidence | Position change |
|---|---|---|---|
| Irbid Clock Memorial Square | **Clock Tower Square** | OSM way 1173940939 `name=Clock Tower Square`, `name:ar=دوار الساعة`. "Memorial" is in no source | tower moved 36 m into the real square (the median between the two carriageways of Faddel Aldalgamouni St) |
| Wasfi At Tal Square | **Wasfi Al-Tal Square** | OSM node 2450661245 `Wasfi AlTal square`; road way 30100044 `ميدان وصفي التل` / `Wasfe Altal square`; game already spells the street "Wasfi Al-Tal" | marker moved **681 m** to the real square. The old position was a fallback estimate, because the importer skipped name-only OSM points (fixed) |
| Eimar Irbid Park | **Emaar Irbid Park** | OSM way 468735683 `Emaar Irbid Park` | marker 19 m onto the OSM park |
| MK Mart / Supermarket | **MK Super Market** | OSM node 4579615689 `name:en=MK Super Market`, `name=MK سوبرماركت` | marker 46 m onto the OSM point |
| Sameh Mall (Thaqafah Circle Branch) | **Sameh Mall** | OSM node 3255400345 `سامح مول`. The "Thaqafah Circle Branch" claim is unsupported (the nearby roundabouts are unnamed in OSM) | marker 34 m onto the OSM point |
| Al-Hassan Stadium Sports Complex | **Al-Hassan Stadium** | OSM way 101717092 `ملعب الحسن` / `Al-Hassan Stadium` | none (0 m) |
| Medeenat Al-Hasan (Al-Hassan Sports City) | **Al-Hassan Sports City (Madinat Al-Hasan)** | OSM node 13574046361 `مدينة الحسن الرياضيه`; "Medeenat" was a non-standard transliteration | none |
| The Nabulsi House: sign "THE NABULSI HOUSE · 1922", type "1920s Architectural Monument" | sign **THE NABULSI HOUSE**, type "Historic Building" | OSM way 1173930712 `historic=building`, description "Historic building maintained by the Irbid municipality". No source here gives 1922 | model moved 37 m onto the real building |
| Dar As Saraya Ottoman Museum | unchanged | OSM way 696141881 names the building "Irbid Archaeological Museum" (the museum housed in the Saraya); now an alias | model moved **76 m** onto the real building. Before, the real footprint also stood at the real spot as a plain box (a visual duplicate) |
| Arar's Cultural House (Beit Arar) | unchanged | OSM way 1173930235 `Arar House`, `name:ar` added as alias | model moved 18 m onto the real building |
| King Abdullah University Hospital | unchanged (official hospital name) | OSM way 402029495, `building=hospital` at JUST, tagged "King Abdullah II Hospital". **Conflict, see below** | marker moved **1.19 km** from a formula point to the real building |
| Arabella Mall | unchanged | OSM node 9648242752 spells "Arbila Mall / اربيلا مول". **Conflict, see below** | none (the model already stands on the real mall footprint) |
| Nissan Irbid Showroom | unchanged | OSM node 5549599194 `Nissan` (car dealer) | marker 47 m onto the OSM point |
| Irbid National University, Jadara University, Yarmouk University, JUST | unchanged | OSM ways 237116926, 237116986, 105641867, 237088320 (the OSM rows are now merged, not shown twice) | none |

## 2. OSM records: rule-based fixes (`osm/overpass/build.py`, logged in `manifest/name_review.json` → `applied`)

Only two rules are applied automatically. Both are reversible and logged:

1. **Whitespace** (double or trailing spaces): 4 names, e.g. `مدرسه زحر  الاساسيه للبنين` → `مدرسه زحر الاساسيه للبنين`.
2. **One `name` tag holding the Arabic and the Latin spelling of the same name**, with no `name:en`. Split into `name` / `name_en`, and
   the game shows the Latin one, as it does for every `name:en`. A split is made **only when every word of both parts matches by
   consonant transliteration** (or is a known pair such as mosque/مسجد, park/حديقة, mall/مول). 7 records:

| OSM id | Mapped name | Arabic | Latin |
|---|---|---|---|
| n9648242756 | Safeway السيفوي | السيفوي | Safeway |
| n9648242752 | Arbila Mall  اربيلا مول | اربيلا مول | Arbila Mall |
| n9646482500 | الفلمنكي Al falamanki | الفلمنكي | Al falamanki |
| n9986133423, w1090247380 | Orabi Stores عرابي ستورز | عرابي ستورز | Orabi Stores |
| w1223151497 | Al Zaitawi Mosque مسجد الزيتاوي | مسجد الزيتاوي | Al Zaitawi Mosque |
| w1223151498 | حديقة الورود Alworood Park | حديقة الورود | Alworood Park |

The first, looser version of rule 2 would also have split `canon للأحبار والطابعات` ("canon" + "for inks and printers"). That is a
brand plus a description, not two spellings of one name, so the transliteration check was added. These 7 are **left as mapped and
listed for review**: `canon للأحبار والطابعات`, `سند Top fation`, `فرشات evosleep`, `سوبر ماركت Zain`, `MASA آلمنيوم`,
`الاردنية السعودية للتوظيف J.S.R`, `The Family Hub محطة العائلة`.

Every other verified name variant OSM has (`name:ar`, `official_name`, `alt_name`, `old_name`, `short_name`, `brand` …) is now kept in
`manifest/places.json` (`names`) and is searchable in game (POID column 8).

## 3. Flagged, not changed (no source to correct them from)

- **9 generic names**: the name is only a category word (`مسجد` ×2, `مدرسة`/`مدرسه`, `مطعم` ×2, `بقالة`, `pharmacy`, `Pharmacy`). The real
  business name is unknown. They stay as mapped (the game shows "Pharmacy" etc.) and need a survey.
- **2 Latin names whose `name:en` differs**: `M. S Resident` / `M. S Residency`; `sal` / `Bushra`.
- **113 all-lower-case Latin names** (`mini coffee`, `city market`, `the college mosque` …). This is style only, and they were not
  re-capitalised without a source.
- **Name conflicts with official names:** "King Abdullah II Hospital" (OSM) vs King Abdullah University Hospital; "Arbila" (OSM) vs
  Arabella; "Irbed National University" (OSM) vs Irbid National University. The game keeps the official or common spelling and makes
  the OSM spelling searchable. The OSM tags themselves should be corrected upstream by a mapper who can verify them locally.
- **Unverified names** (no OSM feature): Wasfi Al-Tal Park (marked "name not in OSM (unverified)" in search), and the hand-named roundabouts
  University Circle, Al-Qubbah Circle and Al-Thaqafah Circle (the OSM roundabouts there are unnamed). **Estimated positions**: Museum of
  Jordanian Heritage and Souq Al-Balad (marked "position estimated").

## 4. Not done

- Names were not checked against the Greater Irbid Municipality site, Visit Jordan or the Department of Antiquities: those sites have
  no machine-readable place lists with coordinates. They can confirm a spelling by hand, but not a location.
- Official mosque/school lists (Awqaf 2023, MoE 2018) were used for name cross-checks only. They have no coordinates, so no official
  name was attached to an OSM feature by name similarity alone (generic names such as "Abu Bakr Al-Siddiq" repeat across villages).
