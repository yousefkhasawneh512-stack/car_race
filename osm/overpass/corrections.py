"""Local, evidence-backed corrections applied by build.py to the GAME's copy of the OSM places (v43 accuracy audit).
Nothing here edits OpenStreetMap. Every change is logged into manifest/name_review.json ('applied') with its evidence and confidence,
and the suspected upstream OSM errors are listed in manifest/osm_upstream_issues.json for a reviewed, on-the-ground OSM edit.
Audit ids (CAT-001, OSM-001, ...) refer to the owner's irbid-place-database-issues.csv.
Rules are conservative: a record is changed only when its own name contradicts its tags in an unambiguous way, or a cited source says so.
Anything that cannot be settled from a source stays as mapped and goes to the review list (PLACE_REVIEW.csv)."""
import re
MOE='Ministry of Education school list 2018 (osm/official/moe_schools_2018.xlsx, opendata.gov.jo/dataset/data-of-schools-162-2018)'
MUN='Greater Irbid Municipality heritage list (irbid.gov.jo/?page_id=6711, read 2026-10-17)'
# ---- per-record overrides (OSM id -> change). 'set' replaces fields, 'alias' adds searchable names, 'drop_alias' removes alias keys,
# 'exclude' keeps the record in the manifest but out of the game. conf: high | medium | low ----
OVERRIDES={
 'osm:n4346249699':{'audit':'CAT-001','set':{'kind':'civic','category':'Utility (power station, by name)'},'conf':'medium',
   'why':'name "محطة توليد كهرباء أربد" = Irbid electricity generating station; the only tag is shop=outdoor (camping/outdoor goods), which contradicts it. Shown as a utility; exact facility unverified.'},
 'osm:n4178791194':{'audit':'CAT-004','set':{'category':'Housing / apartments (by name; OSM says motel)'},'conf':'medium',
   'why':'name "الطرزي للاسكان 2" = "Al-Tarazi Housing 2" (a housing project name); OSM tourism=motel. Not shown as a motel; real use unverified.'},
 'osm:n4228235389':{'audit':'CAT-005','set':{'kind':'civic','category':"Officers' club (OSM says hotel; lodging unverified)"},'conf':'medium',
   'why':'name "نادي ضباط الشمال" = North Officers\' Club; OSM tourism=hotel. Shown as a club; whether it also offers rooms is not verified.'},
 'osm:w1150288656':{'audit':'CAT-003','set':{'category':'Beauty / cosmetic clinic (unverified)'},'conf':'medium',
   'why':'name "عيادة شلبي" = Shalabi Clinic; OSM shop=beauty. Both fit a cosmetic clinic; kept in the beauty group, labelled as a clinic, flagged for a local check.'},
 'osm:n798858301':{'audit':'CAT-006','exclude':True,'conf':'medium',
   'why':'"حكما / Hakama" is the village name (name:de/fr, int_name and is_in come from a gazetteer import of the village) on a node tagged place_of_worship 0.8 km from the OSM village node. Not shown as a mosque named "Hakama"; the village stays searchable. A mosque may exist there: unverified.'},
 'osm:n9648242752':{'audit':'NAME-001','set':{'name_en':'Arabella Mall'},'alias':['Arbila Mall','أرابيلا مول'],'conf':'high',
   'why':'official site arabellamall.jo spells it Arabella Mall / أرابيلا مول; its map pin (32.5384089, 35.8621412) is 34 m from this OSM node. OSM spelling "Arbila Mall" kept as an alias.'},
 'osm:n7282077301':{'audit':'OSM-002','set':{'kind':'dukkan','category':'Shoes (OSM says hospital)'},'drop_alias':['brand'],'conf':'high',
   'why':'name "الحذاء الإيطالي" = "The Italian Shoe"; OSM amenity=hospital + brand=Payless ShoeSource (an editor preset). A shoe shop, not a hospital.'},
 'osm:w1380644968':{'audit':'OSM-004','set':{'category':'Church (Latin / Roman Catholic, by name)'},'conf':'high',
   'why':'name "Latin Church" next to the Latin Patriarchate school; never a mosque. Denomination not tagged in OSM; taken from the name only.'},
 # heritage names from the municipal list, added as search aliases to the OSM feature that IS that building (same name, same denomination)
 'osm:w696141882':{'audit':'GAP-011','alias':['كنيسة الروم الأرثوذكس'],'conf':'high','why':'OSM "Greek Orthodox Church" (religion=christian) on Tell Irbid = municipal list "كنيسة الروم الأرثوذكس". Not the Greek Catholic church (node 7285033997), which stays separate.'},
 'osm:w696141883':{'audit':'heritage','alias':['مسجد اربد الكبير','الجامع الكبير'],'conf':'high','why':'OSM "Irbid Great Mosque" = municipal list "مسجد اربد الكبير".'},
 'osm:w696141881':{'audit':'heritage','alias':['دار السرايا'],'conf':'high','why':'OSM "Irbid Archaeological Museum / متحف سرايا إربد" = municipal list "دار السرايا".'},
 'osm:w1173930235':{'audit':'GAP-006','alias':['منزل عرار','بيت عرار'],'conf':'high','why':'OSM "Arar House / بيت عرار الثقافي" = municipal list "منزل عرار" and Visit Jordan "Beit Arar".'},
 'osm:w1173930712':{'audit':'heritage','alias':['بيت النابلسي'],'conf':'high','why':'OSM Nabulsi House = municipal list "بيت النابلسي".'},
 'osm:n5606766135':{'audit':'OSM-001','alias':['حكما الاساسية للبنات'],'conf':'high','why':'MoE 2018 lists "حكما الاساسية للبنات" (girls = اناث); the OSM node has only a name, no tags.'},
 # names from Wikidata (CC0; query 2026-10-18, 15 km around Irbid) for the OSM feature at the same spot. Aliases only: display names unchanged
 'osm:w779487084':{'audit':'wikidata','alias':['Museum of Jordanian Heritage','متحف التراث الأردني'],'conf':'medium',
   'why':'Wikidata Q12238591 "Museum of Jordanian Heritage / متحف التراث الأردني" (Yarmouk University) is 27 m from this OSM museum, which is only named "Historical Museum". No other museum within 80 m.'},
 'osm:w696139408':{'audit':'wikidata','alias':['كابيتولياس'],'conf':'high','why':'Wikidata Q1226916 Capitolias (ar label كابيتولياس) is 4 m from this OSM archaeological site in Beit Ras.'},
 'osm:w706369062':{'audit':'wikidata','alias':['حدائق الملك عبدالله الثاني','King Abdullah II Gardens'],'conf':'medium',
   'why':'Wikidata Q22687456 "حدائق الملك عبدالله الثاني" (park) is 185 m from this OSM park centre; same name, no other park of that name nearby. Park extent not checked.'},
}
# ---- name-vs-tag conflict rules: (name regex, kinds it overrides, new kind, new category). Applied only when the record's kind is in the
# listed set, i.e. the tags say something the name clearly contradicts (a school tagged as a hospital, etc.) ----
NAME_KIND=[
 (r'^(مدرسة|مدرسه)\s', {'hospital','poi','medical','dukkan','civic'}, 'school','School (by name)'),
 (r'^مركز صحي', {'hospital','poi'}, 'medical','Health centre'),
 (r'^مؤسسة\s', {'landmark'}, 'poi','Business (by name; OSM tag does not fit)'),
 (r'^بلدية\s', {'hospital','poi'}, 'civic','Municipality'),
 (r'^(مسجد|جامع)\s', {'hospital','poi','dukkan','food','school'}, 'mosque','Mosque (by name)'),
 (r'^كنيسة\s', {'hospital','poi','dukkan','mosque'}, 'church','Church (by name)'),
 (r'للسياحة والسفر|سياحة وسفر', {'gym'}, 'dukkan','Travel agency (by name)'),
 # v44: in Jordanian usage كراج is a bus / taxi stand (also a car garage); OSM has several tagged tourism=caravan_site
 (r'^كراج\s', {'poi'}, 'transport','Bus / taxi stand (كراج, by name; OSM says caravan site)'),
]
NAME_KIND=[(re.compile(a),b,c,d) for a,b,c,d in NAME_KIND]
PLACEHOLDER=re.compile(r'^\s*(no ?name|بدون اسم|لا يوجد)\b|^\s*(trees|play area|محلات تجاري[ةه]|صالات تجارية|مخازن تجارية للإيجار|معارض ومكاتب للإيجار)\s*$',re.I)   # placeholders and plain descriptions ("shops", "warehouses for rent") are not names
# ---- official heritage list (municipality) -> what the game/OSM has. status: osm (feature id) | landmark (hand-built, merged) | absent ----
HERITAGE=[
 ('تل إربد القديم','Old Tell Irbid','absent','No OSM outline for the tell. The Saraya, Great Mosque, Orthodox church, old municipality and Arar/Nabulsi houses all stand on it; not drawn as a separate area (no source geometry).'),
 ('سور إربد','Old Irbid Wall','absent','No OSM or official geometry; largely lost. Not drawn.'),
 ('بيت علي خلقي الشرايري','Ali Khalqi Al-Sharairi House','absent','Only a street of that name is mapped (OSM ways 101814644 etc.); the house is not. Not placed.'),
 ('بيت النابلسي','Nabulsi House','landmark:osm:w1173930712','Hand-built landmark on the OSM footprint (1 m, tests/lmchk.js).'),
 ('بيت محمود جمعة','Mahmoud Jumaa House','absent','Not in OSM. Not placed.'),
 ('بيت الجودة','Al-Joudah House','absent','Not in OSM (not the Al-Joud Hotel, osm:n4788897120). Not placed.'),
 ('منزل عرار','Arar House (Beit Arar)','landmark:osm:w1173930235','Hand-built landmark on the OSM footprint (2 m).'),
 ('بيت أبو رجيع وسعيد جمعة','Abu Rujai and Saeed Jumaa House','absent','Not in OSM. Not placed.'),
 ('مدرسة إربد التجهيزية (الرشيدية) / مدرسة حسن كامل الصباح','Rashidiya / Hasan Kamel Al-Sabbah School','absent','MoE 2018: "حسن كامل الصباح الثانويه الشاملة للبنين", حي التل, street حسن كامل الصباح (no coordinates). Not in OSM. Not placed.'),
 ('مدرسة وصفي التل الثانوية الشاملة (الصناعية)','Wasfi Al-Tal Comprehensive Secondary School','absent','MoE 2018: "وصفي التل الثانويه الشاملة للبنين", حي التل, شارع الشرطة (no coordinates). The OSM "وصفي التل" (way 1042579410) is a mosque 5.5 km south, unrelated. Not placed.'),
 ('الجامع الغربي (المملوكي)','Western (Mamluk) Mosque / Abu Dhar Al-Ghifari','absent','Petra: now called Abu Dhar Al-Ghifari, west of the Great Mosque. The only OSM "ابو ذر الغفاري" (node 7508280382) is 7.4 km north: a different mosque, NOT moved or renamed. Not placed.'),
 ('مسجد إربد الكبير','Irbid Great Mosque','osm:w696141883','OSM building; municipal name added as alias.'),
 ('كنيسة الروم الأرثوذكس','Greek Orthodox Church','osm:w696141882','OSM building (christian); municipal name added as alias. The Greek Catholic church (node 7285033997) is separate.'),
 ('مبنى بلدية إربد القديم','Old Irbid Municipality Building','candidate:osm:w1173930713','OSM "Irbid Municipality Building" (townhall) stands on the tell beside the Saraya; that it is the OLD building is likely but unverified, so no alias added.'),
 ('دار السرايا','Dar As-Saraya','landmark:osm:w696141881','Hand-built landmark on the OSM footprint (3 m).'),
 ('برج المراقبة','Watch Tower','absent','Not in OSM. Not placed.'),
 ('متحف عرار','Arar Museum','candidate:osm:w1173930235','Possibly the museum inside Beit Arar; not confirmed, so not merged and not added.'),
 ('متحف بلدية إربد (المتحف الشعبي سابقاً)','Irbid Municipal Museum','absent','Not in OSM. Not placed.'),
 ('سوق الصاغة القديم','Old Goldsmiths\' Market','absent','Not in OSM; an area, not a point. Not placed.'),
 ('مقاما الشيخ خليل التميمي والشيخ عوض الهامي','Shrines of Sheikh Khalil Al-Tamimi and Sheikh Awad Al-Hami','absent','Not in OSM (only a street/shops named الهامي). Not placed.'),
 ('بوابير الطحين','Historic flour mills','absent','Not in OSM. Not placed.'),
 ('مضافة آل التل','Al-Tal Family Guesthouse','absent','Not in OSM. Not placed.'),
 ('مضافة آل سعد البطاينة','Al-Saad Al-Batayneh Guesthouse','absent','Not in OSM. Not placed.'),
 ('خان حدو','Khan Hadu','absent','Not in OSM. Not placed.'),
 ('قصر الملكة مصباح','Queen Misbah Palace','absent','Listed as heritage "in memory"; not in OSM. Not placed.'),
 ('سوق التجارية القديم','Old Commercial Market','absent','Listed "in memory"; an area. Not placed.'),
 ('ساحة الأفراح','Celebrations Square','absent','Listed "in memory". OSM has a neighbourhood "حي الافراح" (node 7548472329) and a street "الأفراح"; not proven to be the square. Not placed.'),
]
# ---- businesses checked against their own sites (not in OSM -> not placed until a verified point is added to osm/manual/verified_places.json) ----
BUSINESS=[
 ('Arabella Mall','in OSM (node 9648242752) + hand-built landmark','arabellamall.jo map pin 32.5384089, 35.8621412 is 34 m from the OSM node; English name corrected.'),
 ('Irbid Mall Center (اربد مول سنتر)','absent','irbidmallgrand.com: opened 6 Sep 2006, "west of the university". Its map link resolves to a Google place id only; no coordinate published, nothing in OSM. Not placed.'),
 ('Irbid Mall Grand (اربد مول جراند)','absent','irbidmallgrand.com: eastern entrance of Irbid, "Sari Al-Nasser street, Aydoun" / Petra street. No coordinate published, nothing in OSM. Not placed.'),
 ('Irbid Mall Hypermarket','absent','a section inside Irbid Mall (official site); the game has no interiors. Not placed.'),
 ('Irbid City Centre (إربد سيتي سنتر)','absent','Wikipedia gives about 32.5355, 35.8650 but its address text is wrong (Hong Kong "Nathan Road") and operating status is unconfirmed; nothing in OSM. Not placed.'),
]
