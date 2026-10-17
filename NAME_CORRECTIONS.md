# Name corrections (v40, 2026-10-17)

Every in-game place was checked against OpenStreetMap (Overpass, OSM base 2026-10-17 08:23 UTC). A change was made only when a
source supports it. Where sources disagree, or no source exists, the record is listed here and in `manifest/unresolved_places.json`,
and **nothing was guessed**. Old names stay searchable (aliases), so nothing a player used to type stops working.

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
