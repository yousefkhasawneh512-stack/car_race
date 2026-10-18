#!/usr/bin/env python3
"""Overpass raw data -> geographic manifest + dataset report (+ optional in-game POI part).
usage: python osm/overpass/build.py [--game]     (from the project root; needs raw/*.json from fetch.py; xlrd/openpyxl for the official lists)
Outputs
  manifest/places.json          every POI-type feature in the playable window, de-duplicated, with OSM id, lat/lon, game x/z, category,
                                source, retrieval time, in-game status, photo reference and flags (tracked in git: the game already shows these)
  manifest/geo_summary.json     counts by category, building tag coverage, coverage grid, official-list cross-check
  manifest/DATASET_REPORT.md    the human-readable report
  osm/overpass/out/buildings_manifest.csv   one row per OSM building (id, centroid, game x/z, building/levels/height/roof tags,
                                in the in-game footprint extract or not). Local only (owner: raw OSM data is not published).
  --game: src/parts/03c_poi_data.js regenerated from the de-duplicated NAMED places (same row format + OSM id). Not run by default.
Nothing is invented: unnamed features stay unnamed, features without geometry are counted and skipped, official names without
coordinates are never placed."""
import json,os,sys,re,math,collections,csv,unicodedata
H=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.abspath(os.path.join(H,'..','..'));sys.path.insert(0,H)
from proj import ll2xz
import corrections as CX
raw=lambda k:json.load(open(os.path.join(H,'raw',k+'.json'),encoding='utf-8'))
P,B,HW=raw('pois'),raw('buildings'),raw('highways')
# v44: the 'named' layer (fetch.py) adds named features outside the POI tag families; merged by OSM id
if os.path.exists(os.path.join(H,'raw','named.json')):
    _seen={(e['type'],e['id']) for e in P['elements']};_add=[e for e in raw('named')['elements'] if (e['type'],e['id']) not in _seen];P['elements']+=_add;print('named layer: +%d features'%len(_add))
WIN=P['window_game_m'];STAMP=P['osm3s']['timestamp_osm_base']
# ---------- classification: (game kind, category label). Game kinds are the ones 06l_real_pois.js / 06f know. ----------
SHOP_FOOD={'bakery':'Bakery','pastry':'Pastry shop','confectionery':'Sweets','ice_cream':'Ice cream'}
SHOP_MED={'optician':'Optician','chemist':'Pharmacy','medical_supply':'Medical supplies'}
SHOP_AUTO={'car_repair':'Car repair','car_parts':'Car parts','tyres':'Tyres','motorcycle':'Motorcycles'}
SHOP_BARB={'hairdresser':'Hairdresser / barber','barber':'Barber','beauty':'Beauty salon','cosmetics':'Cosmetics'}
AMEN={'restaurant':('food','Restaurant'),'fast_food':('food','Fast food'),'food_court':('food','Food court'),'ice_cream':('food','Ice cream'),'cafe':('cafe','Cafe'),
 'pharmacy':('medical','Pharmacy'),'clinic':('medical','Clinic'),'dentist':('medical','Dentist'),'doctors':('medical','Doctor'),'hospital':('hospital','Hospital'),'veterinary':('medical','Veterinary'),
 'fuel':('auto','Fuel station'),'car_wash':('auto','Car wash'),'car_rental':('dealer','Car rental'),'bank':('bank','Bank'),'atm':('bank','ATM'),'bureau_de_change':('bank','Exchange'),
 'school':('school','School'),'kindergarten':('school','Kindergarten'),'college':('school','College'),'university':('school','University'),'library':('civic','Library'),'training':('school','Training centre'),'language_school':('school','Language school'),'driving_school':('school','Driving school'),
 'marketplace':('dukkan','Market'),'townhall':('civic','Town hall'),'police':('civic','Police'),'post_office':('civic','Post office'),'community_centre':('civic','Community centre'),'courthouse':('civic','Court'),'fire_station':('civic','Fire station'),
 'social_facility':('civic','Social facility'),'public_building':('civic','Public building'),'bus_station':('poi','Bus station'),'taxi':('poi','Taxi stand'),'parking':('poi','Parking'),'events_venue':('poi','Events venue'),'theatre':('poi','Theatre'),'cinema':('poi','Cinema'),'arts_centre':('museum','Arts centre'),
 'place_of_worship':None}
LEIS={'amusement_arcade':('park','Amusement arcade'),'dance':('poi','Dance / events hall'),'sports_hall':('gym','Sports hall'),'nature_reserve':('park','Nature reserve'),'fitness_centre':('gym','Gym'),'sports_centre':('gym','Sports centre'),'stadium':('gym','Stadium'),'pitch':('gym','Sports pitch'),'swimming_pool':('gym','Swimming pool'),'park':('park','Park'),'playground':('park','Playground'),'garden':('park','Garden')}
TOUR={'camp_site':('poi','Camp site'),'caravan_site':('poi','Caravan site'),'hotel':('poi','Hotel'),'hostel':('poi','Hostel'),'guest_house':('poi','Guest house'),'motel':('poi','Motel'),'apartment':('poi','Holiday apartment'),'museum':('museum','Museum'),'attraction':('landmark','Attraction'),'viewpoint':('landmark','Viewpoint'),'artwork':('landmark','Artwork')}
def classify(t):
    a=t.get('amenity');rel=t.get('religion','');nm=t.get('name','')+' '+t.get('name:en','')
    if a=='place_of_worship' or t.get('building') in('mosque','church'):
        # untagged religion counts as a mosque only if the name does not say church (the old pipeline listed 'Latin Church' as a mosque)
        if rel=='christian' or t.get('building')=='church' or (not rel and re.search(r'church|كنيس',nm,re.I)):return('church','Church')
        if rel in('muslim','') or t.get('building')=='mosque':return('mosque','Mosque')
        return('poi','Place of worship')
    if t.get('education')=='school' or t.get('building')=='school':return('school','School')
    if t.get('building') in('university','college','kindergarten'):return('school',t['building'].capitalize())
    if t.get('building')=='hospital':return('hospital','Hospital')
    if a in AMEN and AMEN[a]:return AMEN[a]
    s=t.get('shop')
    if s:
        s=s.split(';')[0].strip()
        for tb,k in((SHOP_FOOD,'food'),(SHOP_MED,'medical'),(SHOP_AUTO,'auto'),(SHOP_BARB,'barber')):
            if s in tb:return(k,tb[s])
        if s in('supermarket',):return('grocery','Supermarket')
        if s=='mall':return('mall','Mall')
        if s in('coffee','tea'):return('cafe','Coffee shop')
        if s=='car':return('dealer','Car dealer')
        if s in('pet','pet_grooming'):return('pet','Pet shop')
        return('dukkan',s.replace('_',' ').capitalize() if s!='yes' else 'Shop')
    l=t.get('leisure')
    if l in LEIS:return LEIS[l]
    if t.get('sport'):return('gym','Sport: '+t['sport'].split(';')[0])
    tr=t.get('tourism')
    if tr in TOUR:return TOUR[tr]
    if t.get('historic'):return('landmark','Historic: '+t['historic'].replace('_',' '))
    if t.get('healthcare'):return('medical','Healthcare: '+t['healthcare'])
    if t.get('office'):return('civic' if t['office'] in('government','diplomatic','ngo') else 'poi','Office: '+t['office'].replace('_',' '))
    if t.get('craft'):return('auto' if t['craft']=='car_repair' else 'dukkan','Craft: '+t['craft'].replace('_',' '))
    if t.get('highway')=='bus_stop' or t.get('public_transport'):return('transport','Bus stop / transport')
    if t.get('place'):return('place','Place: '+t['place'])
    if 'addr:housenumber' in t:return('address','Address point')
    if a:return('poi',a.replace('_',' ').capitalize())
    # v44 named non-POI features. Private homes are never listed (building=house/apartments/... are not fetched; names that say house/villa skipped)
    nt=t.get('natural');mm=t.get('man_made');lu=t.get('landuse');bd=t.get('building')
    if nt in('peak','hill'):return('place','Hill / peak')
    if nt=='spring':return('place','Spring')
    if nt in('wood',):return('park','Wood')
    if nt in('bare_rock','cliff','valley'):return('place','Natural: '+nt.replace('_',' '))
    if mm in('works',):return('poi','Factory / works')
    if mm in('water_works','water_tower','reservoir_covered'):return('civic','Water works')
    if mm=='watermill':return('landmark','Watermill')
    if mm=='tower':return('landmark','Tower')
    if lu=='cemetery' or t.get('amenity')=='grave_yard':return('poi','Cemetery')
    if lu=='religious':return('poi','Religious grounds')
    if lu in('residential','orchard','retail','commercial','industrial'):return('place',{'residential':'Residential area','orchard':'Orchard (named)','retail':'Retail area','commercial':'Commercial area','industrial':'Industrial area'}[lu])
    # a named building is listed only when its name says what it is (club, college, factory...): names of people (often private homes) are not
    if bd and bd not in('house','detached','residential','apartments','terrace','bungalow','semidetached_house','hut','shed','garage','garages','roof','farm','annexe','cabin','static_caravan','houseboat','stilt_house','dormitory') and BLD_OK.search(t.get('name','')+' '+t.get('name:en','')) and not BLD_NO.search(t.get('name','')):
        return('poi','Named building'+('' if bd=='yes' else ': '+bd.replace('_',' ')))
    # a node with a name and nothing that says what it is (common for shops here, and for 'Wasfi AlTal square'): kept, never given a made-up category
    if t.get('name') and all(k.split(':')[0] in NAMEISH for k in t):return('poi','Named point (no category tag)')
    return None
BLD_OK=re.compile(r'مركز|نادي|كلية|مجمع|دائرة|ديوان|مضافة|مظافة|مبنى|مصنع|مؤسسة|شركة|مدرسة|جامعة|مستشفى|سوق|مول|قاعة|قاعات|صالة|صالات|معرض|مكتب|بوابة|بنك|فندق|مسجد|جامع|كنيسة|محطة|مستودع|مطبعة|مختبر|عيادة|صيدلية|بلدية|محكمة|وزارة|مديرية|جمعية|اتحاد|نقابة|متحف|مكتبة|ملعب|(center|centre|club|college|faculty|building|factory|office|mall|hall|gate|works|company|hotel|school|hospital|market|station|bank|library|museum|stadium|fuel)',re.I)
BLD_NO=re.compile(r'المخابرات|عسكري|الجيش|military|army|intelligence|سجن|prison|^\s*(منزل|فيلا|فلة|villa|house)\b|^\s*(مسجد|جامع|مبنى|building)\s*$',re.I)   # security sites, residences, bare generic words
NAMEISH={'name','name_1','official_name','alt_name','old_name','short_name','int_name','loc_name','addr','phone','contact','website','opening_hours','note','description','source','fixme','email','check_date'}
# ---------- names ----------
AR_DIAC=re.compile('[ً-ٰٟـ]')
def norm(s):
    s=unicodedata.normalize('NFKC',s or '').lower();s=AR_DIAC.sub('',s)
    for a,b in(('أ','ا'),('إ','ا'),('آ','ا'),('ة','ه'),('ى','ي'),('ؤ','و'),('ئ','ي')):s=s.replace(a,b)
    s=re.sub(r'\b(مسجد|جامع|مدرسه|المدرسه|روضه|mosque|masjid|school)\b','',s)
    s=re.sub(r'[^\w؀-ۿ]+',' ',s);return ' '.join(s.split())
NV=('name:ar','name:en','official_name','official_name:en','official_name:ar','alt_name','alt_name:en','alt_name:ar','old_name','old_name:en','short_name','loc_name','int_name','brand','brand:en','brand:ar')
LAT=re.compile(r'[A-Za-z]');ARB=re.compile(r'[؀-ۿ]')
MIX=re.compile(r"^\s*([A-Za-z0-9][A-Za-z0-9 '&.,_-]*?)\s+([؀-ۿ][؀-ۿ0-9 ً-ْ-]*?)\s*$|^\s*([؀-ۿ][؀-ۿ0-9 ً-ْ-]*?)\s+([A-Za-z][A-Za-z0-9 '&.,_-]*?)\s*$")
GENERIC={norm(w) for w in('mosque','masjid','pharmacy','school','bakery','supermarket','market','restaurant','cafe','shop','store','clinic','bank','salon','barber','مسجد','جامع','صيدلية','مدرسة','مخبز','سوبرماركت','بقالة','مطعم','كافيه','محل','عيادة','بنك','صالون','حلاق','دكان','مول')}
CORR=[];REVIEW=[]
# consonant skeletons: an Arabic word and its Latin transliteration reduce to the same letters (vowels, alif/waw/ya, the article dropped)
ASK=dict(zip('بتثجحخدذرزسشصضطظغفقكلمنهـ','bttjhkddrssssdtsgfkklmnh'))
TRW={'mosque':'مسجد','masjid':'مسجد','school':'مدرسة','park':'حديقة','mall':'مول','market':'سوق','pharmacy':'صيدلية','bakery':'مخبز','stores':'ستورز','store':'ستور'}
def ask(w):
    w=re.sub('^(ال|لل)','',w);return ''.join(ASK.get(c,'') for c in w)
def lsk(w):
    w=w.lower();w=re.sub('^(al|el)(?=[a-z]{3})','',w)
    for a,b in(('ph','f'),('th','t'),('sh','s'),('kh','k'),('gh','g'),('ch','s'),('q','k'),('c','k'),('v','f'),('p','b'),('x','ks'),('z','s'),('j','j'),('g','j')):w=w.replace(a,b)
    return re.sub('[^a-z]','',re.sub('[aeiouwy]','',w))
def same_name(lat,ar):
    lt=[w for w in re.split(r'[^A-Za-z]+',lat) if w and w.lower() not in('al','el','the')];at=[w for w in ar.split() if w]
    if not lt or not at:return False
    ak={ask(w) for w in at}|{ask(w) for w in at}
    ok=lambda w:(w.lower() in TRW and TRW[w.lower()] in at) or (lsk(w) and lsk(w) in ak)
    used=set(at);mat=lambda a:any((l.lower() in TRW and TRW[l.lower()]==a) or (ask(a) and ask(a)==lsk(l)) for l in lt)
    return all(ok(w) for w in lt) and all(mat(a) for a in at)
def clean(rec):
    # rule-based, logged name fixes only (whitespace; an Arabic+Latin name with no name:en split into name/name_en). Everything else is flagged, never guessed.
    nm=rec['name']
    if nm and (';' in nm or CX.PLACEHOLDER.match(nm)):
        parts=[q.strip() for q in nm.split(';') if q.strip()];keep=[q for q in parts if not CX.PLACEHOLDER.match(q)]
        rule=('placeholder text ("no name") is not a name' if len(keep)<len(parts) else '')+('; ' if len(keep)<len(parts) and len(parts)>1 else '')+('several values in one name tag (";"): the first is the name, the others become search aliases' if len(parts)>1 else '' if len(keep)<len(parts) else 'stray ";" removed')
        CORR.append({'id':rec['id'],'field':'name','from':nm,'to':keep[0] if keep else '','rule':rule,'conf':'high' if not keep or len(keep)==len(parts) else 'medium'})
        for i,q in enumerate(keep[1:]):rec['names']['alias:split%d'%i]=q
        rec['name']=nm=keep[0] if keep else ''
        if not keep:rec['flags'].append('unnamed');rec['flags'].append('placeholder name removed')
        elif len(keep)<len(parts):rec['flags'].append('placeholder part removed');REVIEW.append({'id':rec['id'],'name':nm,'issue':'the name tag also held placeholder text ("'+parts[0]+'"); the remaining name is unverified'})
    n2=re.sub(r'\s+',' ',nm).strip()
    if n2!=nm:CORR.append({'id':rec['id'],'field':'name','from':nm,'to':n2,'rule':'whitespace'});rec['name']=nm=n2
    m=MIX.match(nm) if nm and not rec['name_en'] else None
    if m:
        lat,ar=(m.group(1),m.group(2)) if m.group(1) else (m.group(4),m.group(3))
        if same_name(lat,ar):
            CORR.append({'id':rec['id'],'field':'name/name_en','from':nm,'to':[ar.strip(),lat.strip()],'rule':'one name tag held the Arabic and the Latin spelling of the same name (every word matches by transliteration); split, the game shows the Latin one as it does for name:en'})
            rec['name'],rec['name_en']=ar.strip(),lat.strip();nm=rec['name'];rec['flags'].append('name split from mixed-script tag')
        else:REVIEW.append({'id':rec['id'],'name':nm,'issue':'Arabic and Latin text in one name that are NOT the same name (brand + description?); left as mapped'})
    if nm and norm(nm) in GENERIC:rec['flags'].append('generic name');REVIEW.append({'id':rec['id'],'name':nm,'issue':'name is only a category word; the real business name is unknown'})
    if nm and re.search(r'\d{7,}',nm.replace(' ','')):rec['flags'].append('phone number in name');REVIEW.append({'id':rec['id'],'name':nm,'issue':'name contains a phone number'})
    if nm and LAT.search(nm) and not ARB.search(nm) and nm==nm.lower() and len(nm)>3:rec['flags'].append('lower-case name');REVIEW.append({'id':rec['id'],'name':nm,'issue':'all lower-case Latin name (style only; not changed without a source)'})
    en=rec['names'].get('name:en','')
    if en and nm and LAT.search(nm) and not ARB.search(nm) and norm(en)!=norm(nm):REVIEW.append({'id':rec['id'],'name':nm,'issue':'name and name:en are both Latin and differ: '+en})
def pos(e):
    if e['type']=='node':return e.get('lat'),e.get('lon')
    c=e.get('center') or {};return c.get('lat'),c.get('lon')
# ---------- POIs ----------
recs=[];nogeo=0;skipped=collections.Counter()
for e in P['elements']:
    t=e.get('tags',{});k=classify(t)
    if not k:skipped['unclassified']+=1;continue
    la,lo=pos(e)
    if la is None:nogeo+=1;continue
    x,z=ll2xz(la,lo)
    if not(WIN[0]<=x<=WIN[1] and WIN[2]<=z<=WIN[3]):skipped['outside window']+=1;continue
    nm=t.get('name') or t.get('name:ar') or t.get('name:en') or ''
    recs.append({'id':'osm:'+e['type'][0]+str(e['id']),'osm_type':e['type'],'osm_id':e['id'],'name':nm,'name_en':t.get('name:en','') if t.get('name:en','')!=nm else '',
      'kind':k[0],'category':k[1],'lat':round(la,7),'lon':round(lo,7),'x':round(x,1),'z':round(z,1),'geometry':'point' if e['type']=='node' else e['type']+' centre',
      'tags':{q:t[q] for q in('amenity','shop','leisure','tourism','historic','healthcare','education','religion','denomination','building','wikidata','wikipedia','wikimedia_commons','image','website','addr:street','addr:housenumber','addr:city','opening_hours','operator','isced:level') if q in t},
      'names':{q:t[q] for q in NV if q in t},
      'source':'OpenStreetMap (Overpass API)','retrieved':STAMP,'flags':[] if nm else ['unnamed']})
    clean(recs[-1])
# ---------- v43 local corrections (osm/overpass/corrections.py): name-vs-tag conflicts, preset brands, per-record overrides ----------
UPSTREAM=[]
def bsk(s):return lsk(re.sub(r'[^A-Za-z]','',s))
def brand_fits(r,b):
    hay=norm(r['name']+' '+(r['name_en'] or ''));bw=[w for w in norm(b).split() if len(w)>=3]
    if (bw and all(w in hay.split() for w in bw)) or norm(b).replace(' ','') in hay.replace(' ',''):return True
    if ARB.search(b):return norm(b) in hay
    k=bsk(b);return bool(k) and any(ask(w)==k or lsk(w)==k for w in hay.split())
for r in recs:
    t0=(r['kind'],r['category'])
    for rx,frm,k,c in CX.NAME_KIND:
        if r['name'] and rx.search(r['name']) and r['kind'] in frm:
            CORR.append({'id':r['id'],'field':'kind/category','from':list(t0),'to':[k,c],'rule':'the name says '+c.split(' (')[0].lower()+', the OSM tags say '+t0[1].lower()+'; the name wins (local game copy only)','conf':'high'})
            UPSTREAM.append({'id':r['id'],'name':r['name'],'osm_tags_say':t0[1],'name_says':c,'suggested_check':'verify on site, then fix the OSM tags through the normal OSM editing process'})
            r['kind'],r['category']=k,c;r['flags'].append('category from name (tags conflict)');break
    # fuel stations and ATMs: the brand IS the operator (JO Petrol, a bank), so it stays even when the station name differs
    for bk in [q for q in('brand','brand:en','brand:ar') if q in r['names'] and r['category'] not in('Fuel station','ATM')]:
        b=r['names'][bk]
        if not brand_fits(r,b):
            del r['names'][bk];r['flags'].append('preset brand dropped')
            CORR.append({'id':r['id'],'field':'alias '+bk,'from':b,'to':'','rule':'brand tag does not match the name (an editor preset, e.g. a local shop tagged "'+b+'"); not used as a search alias','conf':'high'})
            UPSTREAM.append({'id':r['id'],'name':r['name'],'osm_tags_say':bk+'='+b,'name_says':r['name'],'suggested_check':'brand tag looks like an editor preset; remove it in OSM if the shop is not that chain'})
    o=CX.OVERRIDES.get(r['id'])
    if o:
        for f,v in o.get('set',{}).items():CORR.append({'id':r['id'],'field':f,'from':r.get(f),'to':v,'rule':o['audit']+': '+o['why'],'conf':o['conf']});r[f]=v
        for i,a in enumerate(o.get('alias',[])):r['names']['alias:audit%d'%i]=a
        if o.get('alias'):CORR.append({'id':r['id'],'field':'aliases','from':'','to':o['alias'],'rule':o['audit']+': '+o['why'],'conf':o['conf']})
        for bk in o.get('drop_alias',[]):r['names'].pop(bk,None)
        if o.get('exclude'):r['exclude']=True;r['flags'].append('kept out of the game (audit)');CORR.append({'id':r['id'],'field':'in_game','from':True,'to':False,'rule':o['audit']+': '+o['why'],'conf':o['conf']})
        r['audit']=o['audit']
        if o['conf']!='high':REVIEW.append({'id':r['id'],'name':r['name'],'issue':o['audit']+' (changed, confidence '+o['conf']+'): '+o['why']})
# de-duplication: (1) same OSM object is unique already; (2) same kind + same normalized name within 80 m -> one place (prefer the
# polygon, it carries the footprint); (3) an UNNAMED mosque/school node within 40 m of a same-kind polygon -> the node marks that building.
# Different names are never merged, however close (neighbouring shops stay separate).
def key2(r):return(round(r['x']/80),round(r['z']/80))
grid=collections.defaultdict(list)
for i,r in enumerate(recs):grid[key2(r)].append(i)
dead=set();dups=[]
order=sorted(range(len(recs)),key=lambda i:(recs[i]['osm_type']=='node',recs[i]['osm_id']))
for i in order:
    if i in dead:continue
    a=recs[i];ax,az=key2(a);na=norm(a['name'])
    for gx in(ax-1,ax,ax+1):
        for gz in(az-1,az,az+1):
            for j in grid[(gx,gz)]:
                if j==i or j in dead:continue
                b=recs[j]
                if b['kind']!=a['kind'] or b['osm_type']!='node':continue
                d=math.hypot(a['x']-b['x'],a['z']-b['z']);nb=norm(b['name'])
                same=(na and nb and na==nb and d<80) or (not nb and a['kind'] in('mosque','school') and a['osm_type']!='node' and d<40)
                if same:dead.add(j);a.setdefault('merged',[]).append(b['id']);dups.append([a['id'],b['id'],round(d,1),b['name']])
places=[r for i,r in enumerate(recs) if i not in dead]
# ---------- review only (never merged automatically): one name on several features, and same-name pairs of different kinds ----------
byname=collections.defaultdict(list)
for r in places:
    if r['name'] and r['kind'] not in('place','address','transport') and norm(r['name']) not in GENERIC:byname[(norm(r['name']),r['kind'])].append(r)
SAMENAME=[]
for (n,k),L in byname.items():
    if len(L)<2:continue
    far=max(math.hypot(a['x']-b['x'],a['z']-b['z']) for a in L for b in L)
    if k in('school','hospital','civic','museum','church') or len(L)>=3:
        SAMENAME.append({'name':L[0]['name'],'kind':k,'ids':[r['id'] for r in L],'spread_m':round(far)})
        for r in L:REVIEW.append({'id':r['id'],'name':r['name'],'issue':'%d separate OSM features carry this %s name (up to %d m apart); at most one may be the named facility, or they are branches. Not merged.'%(len(L),k,far)})
for i,a in enumerate(places):
    if not a['name']:continue
    for b in places[i+1:]:
        if b['name'] and b['kind']!=a['kind'] and norm(a['name'])==norm(b['name']) and math.hypot(a['x']-b['x'],a['z']-b['z'])<40:
            REVIEW.append({'id':b['id'],'name':b['name'],'issue':'same name as %s (%s, %s) %d m away but a different kind (%s): a business inside another, or one feature mapped twice. Not merged.'%(a['id'],a['name'],a['kind'],math.hypot(a['x']-b['x'],a['z']-b['z']),b['kind'])})
# ---------- owner-verified points (osm/manual/verified_places.json): the only way to add a place OSM does not have. Each entry needs a source. ----------
MANUAL=[]
mp=os.path.join(ROOT,'osm','manual','verified_places.json')
if os.path.exists(mp):
    for q in json.load(open(mp,encoding='utf-8')).get('places',[]):
        if not(q.get('lat') and q.get('lon') and q.get('name') and q.get('source_url') and q.get('verified_by')):print('manual place skipped (needs name, lat, lon, source_url, verified_by):',q.get('name'));continue
        x,z=ll2xz(q['lat'],q['lon'])
        r={'id':'manual:'+re.sub(r'\W+','-',q.get('name_en') or q['name']).strip('-').lower(),'osm_type':'manual','osm_id':'','name':q['name'],'name_en':q.get('name_en',''),'kind':q['kind'],'category':q['category'],
           'lat':q['lat'],'lon':q['lon'],'x':round(x,1),'z':round(z,1),'geometry':'point (manually verified)','tags':{},'names':{'alias:%d'%i:a for i,a in enumerate(q.get('aliases',[]))},
           'source':q['source_url'],'retrieved':q.get('verified_on',''),'flags':['manual (owner-verified)'],'verified_by':q['verified_by']}
        places.append(r);MANUAL.append(r['id'])
# ---------- hand-built landmarks that ARE an OSM feature (same facility, checked by name + footprint; NAME_CORRECTIONS.md). The game shows the
# landmark (model + label) and adds the OSM names to its search aliases instead of a second label. Everything else is a separate place, however close.
LANDMARK_OSM={'osm:w696141881':'Dar As Saraya Ottoman Museum','osm:w1173930235':"Arar's Cultural House (Beit Arar)",'osm:w1173930712':'The Nabulsi House (Beit Al-Nabulsi)',
 'osm:w1173940939':'Clock Tower Square','osm:n2450661245':'Wasfi Al-Tal Square','osm:w468735683':'Emaar Irbid Park','osm:n9648242752':'Arabella Mall',
 'osm:n3255400345':'Sameh Mall','osm:n4579615689':'MK Super Market','osm:n5549599194':'Nissan Irbid Showroom','osm:w101717092':'Al-Hassan Stadium',
 'osm:n13574046361':'Al-Hassan Sports City (Madinat Al-Hasan)','osm:w237116926':'Irbid National University','osm:w237116986':'Jadara University',
 'osm:w105641867':'Yarmouk University','osm:w237088320':'Jordan University of Science & Technology (JUST)','osm:w402029495':'King Abdullah University Hospital'}
for r in places:
    if r['id'] in LANDMARK_OSM:r['in_game_as']=LANDMARK_OSM[r['id']]
# ---------- in-game status: real places the current build shows (POID rows, 1 decimetre grid) ----------
poid_src=open(os.path.join(ROOT,'src','parts','03c_poi_data.js'),encoding='utf-8').read()
POID=json.loads(re.search(r'const POID=(\[.*?\]);\n',poid_src,re.S).group(1))
pg=collections.defaultdict(list)
for q in POID:pg[(round(q[0]/10/60),round(q[1]/10/60))].append(q)
def in_game(r):
    gx,gz=round(r['x']/60),round(r['z']/60);nr=norm(r['name'])
    for dx in(-1,0,1):
        for dz in(-1,0,1):
            for q in pg[(gx+dx,gz+dz)]:
                if math.hypot(q[0]/10-r['x'],q[1]/10-r['z'])<60 and (norm(q[3])==nr or (q[4] and norm(q[4])==norm(r['name_en'] or r['name']))):return True
    return False
GAME_IDS={q[6] for q in POID if len(q)>6}
for r in places:r['in_game']=bool(r['name']) and not r.get('exclude') and (r['id'] in GAME_IDS or r['id'] in LANDMARK_OSM or in_game(r))
# ---------- photos (manifest/photos.json, built separately by osm/photos/commons.py) ----------
ph={}
pf=os.path.join(ROOT,'manifest','photos.json')
if os.path.exists(pf):
    for q in json.load(open(pf,encoding='utf-8')).get('photos',[]):
        if q.get('place_id'):ph.setdefault(q['place_id'],[]).append(q['file'])
for r in places:
    r['photo']=ph.get(r['id'],[])
    r['confidence']='osm-mapped' if r['name'] else 'osm-mapped (no name tag)'
# ---------- buildings ----------
cover=json.loads(re.search(r'cover:(\[\[.*?\]\])',open(os.path.join(ROOT,'src','parts','03b_bld_data.js'),encoding='utf-8').read(1200)).group(1))
cx=[c[0] for c in cover];cz=[c[1] for c in cover];CX0,CX1,CZ0,CZ1=min(cx),max(cx),min(cz),max(cz)
btags=collections.Counter();bcount=0;inc=0;rows=[];levels=height=roof=named=addr=0;cells=collections.Counter()
for e in B['elements']:
    la,lo=pos(e)
    if la is None:nogeo+=1;continue
    x,z=ll2xz(la,lo)
    if not(WIN[0]<=x<=WIN[1] and WIN[2]<=z<=WIN[3]):continue
    t=e.get('tags',{});bcount+=1;btags[t.get('building','yes')]+=1;inside=CX0<=x<=CX1 and CZ0<=z<=CZ1;inc+=inside
    levels+='building:levels' in t;height+='height' in t;roof+=('roof:shape' in t or 'roof:levels' in t);named+='name' in t;addr+='addr:housenumber' in t or 'addr:street' in t
    cells[(int((x-WIN[0])//2000),int((z-WIN[2])//2000))]+=1
    rows.append(['osm:'+e['type'][0]+str(e['id']),round(la,7),round(lo,7),round(x,1),round(z,1),t.get('building',''),t.get('building:levels',''),t.get('height',''),t.get('roof:shape',''),t.get('name',''),'extract' if inside else 'outside-extract (procedural in game)'])
os.makedirs(os.path.join(H,'out'),exist_ok=True)
with open(os.path.join(H,'out','buildings_manifest.csv'),'w',newline='',encoding='utf-8') as f:
    w=csv.writer(f);w.writerow(['id','lat','lon','x','z','building','levels','height','roof_shape','name','game_status']);w.writerows(rows)
# highways: tag coverage (feeds roadmap item 1)
hwt=collections.Counter();hwn=len(HW['elements'])
for e in HW['elements']:
    for q in('name','surface','lanes','maxspeed','width','oneway','bridge','tunnel','lit'):hwt[q]+=q in e.get('tags',{})
# ---------- official lists (no coordinates): name cross-check only ----------
def official():
    out={}
    try:
        import xlrd,openpyxl
    except ImportError:return{'error':'xlrd/openpyxl not installed'}
    od=os.path.join(ROOT,'osm','official')
    names=[]
    for fn,hdr,col in(('awqaf_irbid_mosques_1.xls',6,2),('awqaf_irbid_mosques_2.xls',1,1)):
        p=os.path.join(od,fn)
        if not os.path.exists(p):continue
        sh=xlrd.open_workbook(p).sheet_by_index(0)
        for r in range(hdr,sh.nrows):
            v=str(sh.cell_value(r,col)).strip()
            if v:names.append(v)
    osm_m={norm(r['name']) for r in places if r['kind']=='mosque' and r['name']}
    nn=[norm(v.split('/')[0]) for v in names];hit=sum(1 for v in nn if v and v in osm_m)
    out['mosques']={'official_rows':len(names),'unique_normalized_names':len(set(nn)),'name_matches_in_osm_window':hit,
        'note':'Awqaf Irbid directorate lists (whole directorates, incl. villages outside the play area). No coordinates; matching is by name only and generic names (e.g. Abu Bakr Al-Siddiq) can match a different mosque, so this is an upper bound, never used to place anything.'}
    p=os.path.join(od,'moe_schools_2018.xlsx')
    if os.path.exists(p):
        ws=openpyxl.load_workbook(p,read_only=True).worksheets[0];rows_=list(ws.iter_rows(values_only=True));hd=rows_[0]
        gi=hd.index('المحافظة');ni=hd.index('اسم المؤسسة');li=hd.index('اللواء')
        irb=[r for r in rows_[1:] if r[gi] and 'اربد' in str(r[gi]).replace('إ','ا')]
        dist=collections.Counter(str(r[li]).strip() for r in irb)
        osm_s={norm(r['name']) for r in places if r['kind']=='school' and r['name']}
        hit=sum(1 for r in irb if norm(str(r[ni])) in osm_s)
        out['schools']={'official_rows_irbid_governorate':len(irb),'by_district':dict(dist.most_common()),'name_matches_in_osm_window':hit,
          'note':'Ministry of Education list dated 2018 (published 2018, re-listed 2025): Irbid governorate, all districts, no coordinates. Name match is an upper bound.'}
    return out
OFF=official()
# ---------- summary ----------
kinds=collections.Counter(r['kind'] for r in places);named_p=sum(1 for r in places if r['name'])
mos=[r for r in places if r['kind']=='mosque'];sch=[r for r in places if r['kind']=='school' and r['category']=='School']
edu=collections.Counter(r['category'] for r in places if r['kind']=='school')
pcell=collections.Counter((int((r['x']-WIN[0])//2000),int((r['z']-WIN[2])//2000)) for r in places if r['kind'] not in('address','transport'))
sparse=[{'cell_x_m':[WIN[0]+c[0]*2000,WIN[0]+c[0]*2000+2000],'cell_z_m':[WIN[2]+c[1]*2000,WIN[2]+c[1]*2000+2000],'buildings':n,'pois':pcell.get(c,0)} for c,n in cells.most_common() if n>=300 and pcell.get(c,0)<n/150]
summary={'retrieved':STAMP,'window_game_m':WIN,'bbox_lat_lon':P['bbox'],
 'pois':{'raw_elements':len(P['elements']),'classified':len(recs),'duplicates_merged':len(dups),'unique':len(places),'named':named_p,'unnamed':len(places)-named_p,'by_kind':dict(kinds.most_common()),
   'mosques':{'unique':len(mos),'named':sum(1 for r in mos if r['name'])},'schools':{'unique':len(sch),'named':sum(1 for r in sch if r['name'])},'education_by_category':dict(edu),
   'with_wikidata':sum(1 for r in places if 'wikidata' in r['tags']),'with_commons_or_image':sum(1 for r in places if 'wikimedia_commons' in r['tags'] or 'image' in r['tags']),
   'in_current_game':sum(1 for r in places if r['in_game'])},
 'buildings':{'osm_in_window':bcount,'in_game_extract_rectangle':inc,'outside_extract':bcount-inc,'by_building_tag':dict(btags.most_common(25)),'with_levels':levels,'with_height':height,'with_roof_tags':roof,'with_name':named,'with_address':addr},
 'highways':{'ways':hwn,'tag_coverage':dict(hwt)},'missing_geometry':nogeo,'skipped':dict(skipped),
 'records_total':{'pois_unique':len(places),'buildings':bcount,'highway_ways':hwn,'sum':len(places)+bcount+hwn},
 'poi_sparse_cells_2km':sparse[:15],'official_cross_check':OFF}
os.makedirs(os.path.join(ROOT,'manifest'),exist_ok=True)
json.dump({'generated_by':'osm/overpass/build.py','licence':'ODbL 1.0, (c) OpenStreetMap contributors','retrieved':STAMP,'count':len(places),'places':places},open(os.path.join(ROOT,'manifest','places.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=0)
json.dump(summary,open(os.path.join(ROOT,'manifest','geo_summary.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump(dups,open(os.path.join(H,'out','duplicates.json'),'w',encoding='utf-8'),ensure_ascii=False)
json.dump({'generated_by':'osm/overpass/build.py','retrieved':STAMP,'applied':CORR,'needs_review':REVIEW},open(os.path.join(ROOT,'manifest','name_review.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('name fixes applied',len(CORR),'flagged for review',len(REVIEW),'manual places',len(MANUAL))
json.dump({'generated_by':'osm/overpass/build.py (v43)','note':'Suspected errors in OpenStreetMap itself. The game corrects its own copy; OSM is NOT edited automatically. Check each on site before editing OSM.','issues':UPSTREAM},
  open(os.path.join(ROOT,'manifest','osm_upstream_issues.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump({'generated_by':'osm/overpass/build.py (v43) from osm/overpass/corrections.py','source':CX.MUN,'heritage':[{'name_ar':a,'name_en':b,'status':c,'note':d} for a,b,c,d in CX.HERITAGE],
  'businesses':[{'name':a,'status':b,'note':c} for a,b,c in CX.BUSINESS],'same_name_groups':SAMENAME},open(os.path.join(ROOT,'manifest','heritage_check.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
# ---------- unresolved / uncertain places (for review; nothing here is placed or renamed on a guess) ----------
LANDMARK_ISSUES=[
 {'place':'Wasfi Al-Tal Park','issue':'no OSM feature of this name; park polygon and name come from the original game','status':'kept, marked "name not in OSM (unverified)" in search'},
 {'place':'Museum of Jordanian Heritage','issue':'real museum at Yarmouk University, but OSM has no point for it; position is a campus offset','status':'kept, marked "position estimated"'},
 {'place':'Souq Al-Balad','issue':'generic name for the downtown market streets; no single OSM feature','status':'kept, marked "position estimated"'},
 {'place':'University Circle / Al-Qubbah Circle / Al-Thaqafah Circle','issue':'hand-assigned roundabout names; the OSM roundabouts there are unnamed','status':'unverified; names kept (race/teleport menu strings)'},
 {'place':'King Abdullah University Hospital','issue':'OSM tags the hospital building at JUST as "King Abdullah II Hospital" (way 402029495); its official name is King Abdullah University Hospital','status':'marker moved to the OSM building; game name kept; OSM name searchable; conflict to report upstream'},
 {'place':'Arabella Mall','issue':'OSM node 9648242752 spells it "Arbila Mall / اربيلا مول"','status':'game spelling kept, OSM spelling searchable; needs a local check'},
 {'place':'Irbid National University','issue':'OSM way 237116926 is named "Irbed National University" (spelling)','status':'game spelling kept; OSM spelling searchable'},
 {'place':'Sameh Mall','issue':'the old game name claimed a "Thaqafah Circle Branch"; OSM only says سامح مول and the nearest roundabouts are unnamed','status':'renamed to the OSM name'},
 {'place':'The Nabulsi House','issue':'the old sign said "1922"; no source in this project supports a date','status':'date removed'},
 {'place':'Bank (heist), Apex Drift Customs, Al-Hassan Drift Zone','issue':'gameplay locations, not real businesses','status':'kept (game mechanics); not counted as real places'},
 {'place':'Speed bumps (90)','issue':'estimated positions near schools/clinics/parks, not surveyed','status':'unchanged; owner decision pending (PLAN.md)'}]
json.dump({'generated_by':'osm/overpass/build.py','retrieved':STAMP,'landmarks':LANDMARK_ISSUES,
  'names_needing_review':REVIEW,'unnamed_pois_kept_unnamed':sum(1 for r in places if not r['name']),
  'official_lists_without_coordinates':{k:v for k,v in OFF.items()}},open(os.path.join(ROOT,'manifest','unresolved_places.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(json.dumps({k:summary[k] for k in('pois','buildings','records_total')},ensure_ascii=False)[:1500])
print('official',json.dumps(OFF,ensure_ascii=False)[:800])
# ---------- optional: regenerate the in-game POI part ----------
if '--game' in sys.argv:
    G={'food','cafe','medical','hospital','auto','dealer','bank','school','dukkan','civic','gym','park','poi','museum','landmark','mosque','church','grocery','mall','barber','pet','transport','place'}
    AREA={'Place: neighbourhood','Place: suburb','Place: quarter','Place: village','Place: town','Place: city','Place: hamlet','Place: locality','Hill / peak','Spring','Residential area','Industrial area','Commercial area'}
    rows_g=[]
    for r in places:
        if not r['name'] or r.get('exclude') or r['kind'] not in G or r['category'] in('ATM','Taxi stand'):continue
        if r['kind']=='place' and r['category'] not in AREA:continue          # plots, region/state outlines; squares are landmarks
        # v44: a named landuse area that repeats a village / neighbourhood name within 3 km is the same place: not listed twice
        if r['category'] in('Residential area','Industrial area','Commercial area') and any(q is not r and q['kind']=='place' and q['category'].startswith('Place:') and norm(q['name'])==norm(r['name']) and math.hypot(q['x']-r['x'],q['z']-r['z'])<3000 for q in places):continue
        if r['kind']=='park' and re.search(r'استراحة|Trees|Circle|دوار',r['name']):continue
        if r['category'] in('Residential area','Industrial area','Commercial area') and any(q[2]=='area' and norm(q[3])==norm(r['name']) and math.hypot(q[0]/10-r['x'],q[1]/10-r['z'])<3000 for q in rows_g):continue
        al=' '.join(dict.fromkeys(v for k,v in r['names'].items() if k!='name:en' and v and v!=r['name'] and v!=r['name_en']))
        rows_g.append([round(r['x']*10),round(r['z']*10),'area' if r['kind']=='place' else r['kind'],r['name'],r['name_en'],r['category'].replace('Place: ',''),r['id'],al])
    # rows the previous build had keep their OLD order (RLP() below is a first-match lookup that seeds landmarks); new rows follow by OSM id
    rank={}
    for i,q in enumerate(POID):rank.setdefault((q[3],round(q[0]/100),round(q[1]/100)),i)
    def rk(q):
        for dx in(-1,0,1):
            for dz in(-1,0,1):
                i=rank.get((q[3],round(q[0]/100)+dx,round(q[1]/100)+dz))
                if i is not None:return(0,i,'')
        return(1,0,q[6])
    rows_g.sort(key=rk)
    CALM=[]
    tcp=os.path.join(H,'raw','traffic_calming.json')
    if os.path.exists(tcp):
        for e in json.load(open(tcp,encoding='utf-8'))['elements']:
            la,lo=pos(e)
            if la is None:continue
            x,z=ll2xz(la,lo);t=e.get('tags',{})
            if WIN[0]<=x<=WIN[1] and WIN[2]<=z<=WIN[3]:CALM.append([round(x*10),round(z*10),t.get('traffic_calming') or t.get('highway'),'osm:'+e['type'][0]+str(e['id'])])
    kept=sum(1 for q in rows_g if rk(q)[0]==0)
    js=('// GENERATED by osm/overpass/build.py --game from OpenStreetMap via the Overpass API ('+STAMP+'), ODbL (c) OpenStreetMap contributors. POID rows: [x*10 m, z*10 m, kind, name, nameEn, category label, OSM id, other verified names (name:ar/official/alt/old/brand)]. Do not hand-edit.\n'
        '// Rows that existed in the previous build keep their order, because RLP() (landmark seeding) takes the first match.\n'
        'const POID='+json.dumps(rows_g,ensure_ascii=False,separators=(',',':'))+';\n'
        'const RLP=(re,fb)=>{const q=POID.find(n=>re.test(n[3])||re.test(n[4]));return q?[q[0]/10,q[1]/10]:fb};\n'
        '// OSM traffic calming (traffic_calming=* and speed cameras) in the window: [x*10, z*10, type, OSM id]. Mapped, not estimated.\n'
        'const OSM_CALM='+json.dumps(CALM,separators=(',',':'))+';\n'
        '// OSM features that are the same facility as a hand-built landmark (osm/overpass/build.py LANDMARK_OSM): merged into that landmark, not labelled twice\n'
        'const POID_LM='+json.dumps(LANDMARK_OSM,ensure_ascii=False,separators=(',',':'))+';\n')
    open(os.path.join(ROOT,'src','parts','03c_poi_data.js'),'w',encoding='utf-8',newline='\n').write(js);print('wrote 03c_poi_data.js rows',len(rows_g),'kept from previous build',kept,'of',len(POID))
