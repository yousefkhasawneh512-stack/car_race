#!/usr/bin/env python3
"""v43 place-accuracy regression test: checks the IN-GAME place rows (POID in the built HTML) against every correction of the
owner's audit (irbid-place-database-issues.csv) plus generic data checks. Stdlib only.
usage: python tests/place_audit.py dist/irbid-drive.html      exit 1 on failure"""
import json,re,sys,math,os,collections
h=open(sys.argv[1] if len(sys.argv)>1 else 'dist/irbid-drive.html',encoding='utf-8').read()
POID=json.loads(re.search(r'const POID=(\[.*?\]);\n',h,re.S).group(1))
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
by={q[6]:q for q in POID};bad=0
def ck(name,ok,info=''):
    global bad
    print(('PASS ' if ok else 'FAIL ')+name+(' · '+str(info) if info else ''));bad+=not ok
txt=lambda q:' '.join(str(v) for v in(q[3],q[4],q[7] if len(q)>7 else ''))
ck('every row has finite coordinates, a kind and a name',all(math.isfinite(q[0]) and math.isfinite(q[1]) and q[2] and q[3] for q in POID),len(POID))
ck('OSM ids are unique',len(by)==len(POID))
# CAT-001..006
ck('CAT-001 power station is not a shop',by['osm:n4346249699'][2]=='civic' and 'power' in by['osm:n4346249699'][5])
ck('CAT-002 libraries are not schools',all(q[2]!='school' for q in POID if q[5]=='Library') and by['osm:w1076653937'][2]=='civic')
ck('CAT-003 Shalabi clinic labelled as a clinic (unverified)','clinic' in by['osm:w1150288656'][5])
ck('CAT-004 housing project not shown as a motel','Motel'!=by['osm:n4178791194'][5] and 'Housing' in by['osm:n4178791194'][5])
ck('CAT-005 officers\' club not shown as a hotel',"club" in by['osm:n4228235389'][5])
ck('CAT-006 village-name node not shown as a mosque','osm:n798858301' not in by and any(q[3]=='حكما' and q[2]=='area' for q in POID))
# names
ck('NAME-001 Arabella Mall English name, OSM spelling kept as alias',by['osm:n9648242752'][4]=='Arabella Mall' and 'Arbila Mall' in by['osm:n9648242752'][7])
ck('NAME-003 "No name" is not shown as a name',not any(re.match(r'(?i)no ?name',q[3]) for q in POID))
ck('NAME-004 placeholder part removed from "no name fation and more;بلعاوي"',by['osm:n7284992368'][3]=='بلعاوي')
ck('no displayed name holds several ";" values',not any(';' in q[3] for q in POID),[q[3] for q in POID if ';' in q[3]][:3])
ck('DUP-004 leading ";" removed from شعبان مول; mall and supermarket kept separate',by['osm:n9644972225'][3]=='شعبان مول' and by['osm:n9645113835'][2]=='mall' and by['osm:n9644972225'][2]=='grocery')
ck('DUP-005 "مطعم الفدين للبخاري;TiK ToK" split; the TiK Tok cafe stays separate',by['osm:n9644972219'][3]=='مطعم الفدين للبخاري' and 'TiK ToK' in by['osm:n9644972219'][7] and 'osm:n9644983789' in by)
# OSM-001..004 and the generic name-vs-tag rule
for i in('osm:n5606667153','osm:n5606667156','osm:n5606667152','osm:n5606766135'):ck('OSM-001 '+by[i][3]+' is a school',by[i][2]=='school')
ck('OSM-002 الحذاء الإيطالي is a shoe shop, not a hospital',by['osm:n7282077301'][2]=='dukkan')
ck('OSM-003 health centres (مركز صحي) are not hospitals',all(q[2]=='medical' for q in POID if q[3].startswith('مركز صحي')),sum(1 for q in POID if q[3].startswith('مركز صحي')))
ck('OSM-004 Latin Church is a church',by['osm:w1380644968'][2]=='church')
ck('no "hospital" row named as a school, municipality or health centre',not [q[3] for q in POID if q[2]=='hospital' and re.match(r'(مدرسة|مدرسه|بلدية|مركز صحي)',q[3])])
ck('travel agencies are not sports centres',not [q[3] for q in POID if q[2]=='gym' and re.search('للسياحة والسفر',q[3])])
PRESET=['Hard Rock Cafe','Payless','T-Mobile','Mobil Mart','iFLY','Access Bank','Turkish Airlines','Dress Barn','mBank','Opticalia','Simply Market','Intersport','PizzaExpress']
ck('editor-preset chain brands are not search aliases of local shops',not [q[3] for q in POID for b in PRESET if b in (q[7] if len(q)>7 else '') and b.lower() not in (q[3]+' '+q[4]).lower()])
ck('fuel stations keep their operator brand (JO Petrol)','JO Petrol' in by['osm:n4280768316'][7])
# heritage list aliases
ck('heritage: Greek Orthodox church has the municipal name, Greek Catholic church separate','كنيسة الروم الأرثوذكس' in by['osm:w696141882'][7] and by['osm:n7285033997'][2]=='church')
ck('wikidata names: Museum of Jordanian Heritage, Capitolias (ar), King Abdullah II Gardens are search aliases; display names unchanged',
   'Museum of Jordanian Heritage' in by['osm:w779487084'][7] and 'كابيتولياس' in by['osm:w696139408'][7] and 'حدائق الملك عبدالله الثاني' in by['osm:w706369062'][7]
   and by['osm:w779487084'][3]=='Historical Museum')
# v44 named-feature layer: named buildings only when the name says what the building is; no residences / security sites; كراج = transport
import re as _re
nb=[q for q in POID if q[5].startswith('Named building')]
ck('v44: named buildings are institutions/businesses by name (no residences, no person-only names, no security sites)',len(nb)>5 and all(_re.search(r'مركز|نادي|كلية|مجمع|دائرة|ديوان|مضافة|مظافة|مبنى|مصنع|مؤسسة|شركة|مدرس|جامع|مستشفى|سوق|مول|قاع|صال|معرض|مكتب|بوابة|بنك|فندق|مسجد|كنيسة|محطة|مستودع|بيت الطالبة|الامن|center|centre|club|college|building|factory|office|mall|hall|gate|works|fuel',q[3]+' '+q[4],_re.I) for q in nb) and not any(_re.match(r'\s*(منزل|فيلا)',q[3]) for q in nb) and not any('المخابرات' in q[3] for q in POID),str(len(nb))+' named buildings')
ck('v44: every "كراج" stand is a transport place (OSM caravan_site tag overridden by name)',all(q[2]=='transport' for q in POID if q[3].startswith('كراج ')) and sum(1 for q in POID if q[3].startswith('كراج '))>=7)
ck('v44: hills, springs and named areas are searchable areas (no map label), no area repeats a village name',all(q[2]=='area' for q in POID if q[5] in('Hill / peak','Spring','Residential area')) and sum(1 for q in POID if q[3]=='Kufr Yuba')<=1)
# duplicates: same kind + same name rows closer than 20 m would be a missed merge
g=collections.defaultdict(list);dd=[]
for q in POID:g[(q[2],q[3])].append(q)
for k,L in g.items():
    for i,a in enumerate(L):
        for b in L[i+1:]:
            if math.hypot(a[0]-b[0],a[1]-b[1])/10<20:dd.append(k[1])
ck('no same-kind same-name rows within 20 m',not dd,dd[:5])
# manifests written by the importer
hc=json.load(open(os.path.join(ROOT,'manifest','heritage_check.json'),encoding='utf-8'))
ck('heritage cross-check covers the 27 municipal sites and 5 businesses',len(hc['heritage'])==27 and len(hc['businesses'])==5)
nr=json.load(open(os.path.join(ROOT,'manifest','name_review.json'),encoding='utf-8'))
ck('every applied correction has a rule and a confidence',all(c.get('rule') for c in nr['applied']) and all(c.get('conf') for c in nr['applied'] if c['rule']!='whitespace' and not c['rule'].startswith('one name tag')))
print('place audit: '+('all passed' if not bad else str(bad)+' FAILED'));sys.exit(1 if bad else 0)
