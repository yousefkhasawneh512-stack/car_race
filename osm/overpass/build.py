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
raw=lambda k:json.load(open(os.path.join(H,'raw',k+'.json'),encoding='utf-8'))
P,B,HW=raw('pois'),raw('buildings'),raw('highways')
WIN=P['window_game_m'];STAMP=P['osm3s']['timestamp_osm_base']
# ---------- classification: (game kind, category label). Game kinds are the ones 06l_real_pois.js / 06f know. ----------
SHOP_FOOD={'bakery':'Bakery','pastry':'Pastry shop','confectionery':'Sweets','ice_cream':'Ice cream'}
SHOP_MED={'optician':'Optician','chemist':'Pharmacy','medical_supply':'Medical supplies'}
SHOP_AUTO={'car_repair':'Car repair','car_parts':'Car parts','tyres':'Tyres','motorcycle':'Motorcycles'}
SHOP_BARB={'hairdresser':'Hairdresser / barber','barber':'Barber','beauty':'Beauty salon','cosmetics':'Cosmetics'}
AMEN={'restaurant':('food','Restaurant'),'fast_food':('food','Fast food'),'food_court':('food','Food court'),'ice_cream':('food','Ice cream'),'cafe':('cafe','Cafe'),
 'pharmacy':('medical','Pharmacy'),'clinic':('medical','Clinic'),'dentist':('medical','Dentist'),'doctors':('medical','Doctor'),'hospital':('hospital','Hospital'),'veterinary':('medical','Veterinary'),
 'fuel':('auto','Fuel station'),'car_wash':('auto','Car wash'),'car_rental':('dealer','Car rental'),'bank':('bank','Bank'),'atm':('bank','ATM'),'bureau_de_change':('bank','Exchange'),
 'school':('school','School'),'kindergarten':('school','Kindergarten'),'college':('school','College'),'university':('school','University'),'library':('school','Library'),'training':('school','Training centre'),'language_school':('school','Language school'),'driving_school':('school','Driving school'),
 'marketplace':('dukkan','Market'),'townhall':('civic','Town hall'),'police':('civic','Police'),'post_office':('civic','Post office'),'community_centre':('civic','Community centre'),'courthouse':('civic','Court'),'fire_station':('civic','Fire station'),
 'social_facility':('civic','Social facility'),'public_building':('civic','Public building'),'bus_station':('poi','Bus station'),'taxi':('poi','Taxi stand'),'parking':('poi','Parking'),'events_venue':('poi','Events venue'),'theatre':('poi','Theatre'),'cinema':('poi','Cinema'),'arts_centre':('museum','Arts centre'),
 'place_of_worship':None}
LEIS={'fitness_centre':('gym','Gym'),'sports_centre':('gym','Sports centre'),'stadium':('gym','Stadium'),'pitch':('gym','Sports pitch'),'swimming_pool':('gym','Swimming pool'),'park':('park','Park'),'playground':('park','Playground'),'garden':('park','Garden')}
TOUR={'hotel':('poi','Hotel'),'hostel':('poi','Hostel'),'guest_house':('poi','Guest house'),'motel':('poi','Motel'),'apartment':('poi','Holiday apartment'),'museum':('museum','Museum'),'attraction':('landmark','Attraction'),'viewpoint':('landmark','Viewpoint'),'artwork':('landmark','Artwork')}
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
    return None
# ---------- names ----------
AR_DIAC=re.compile('[ً-ٰٟـ]')
def norm(s):
    s=unicodedata.normalize('NFKC',s or '').lower();s=AR_DIAC.sub('',s)
    for a,b in(('أ','ا'),('إ','ا'),('آ','ا'),('ة','ه'),('ى','ي'),('ؤ','و'),('ئ','ي')):s=s.replace(a,b)
    s=re.sub(r'\b(مسجد|جامع|مدرسه|المدرسه|روضه|mosque|masjid|school)\b','',s)
    s=re.sub(r'[^\w؀-ۿ]+',' ',s);return ' '.join(s.split())
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
      'source':'OpenStreetMap (Overpass API)','retrieved':STAMP,'flags':[] if nm else ['unnamed']})
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
# ---------- in-game status: real places the current build shows (POID rows, 1 decimetre grid) ----------
poid_src=open(os.path.join(ROOT,'src','parts','03c_poi_data.js'),encoding='utf-8').read()
POID=json.loads(re.search(r'const POID=(\[.*\]);',poid_src,re.S).group(1))
pg=collections.defaultdict(list)
for q in POID:pg[(round(q[0]/10/60),round(q[1]/10/60))].append(q)
def in_game(r):
    gx,gz=round(r['x']/60),round(r['z']/60);nr=norm(r['name'])
    for dx in(-1,0,1):
        for dz in(-1,0,1):
            for q in pg[(gx+dx,gz+dz)]:
                if math.hypot(q[0]/10-r['x'],q[1]/10-r['z'])<60 and (norm(q[3])==nr or (q[4] and norm(q[4])==norm(r['name_en'] or r['name']))):return True
    return False
for r in places:r['in_game']=bool(r['name']) and in_game(r)
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
print(json.dumps({k:summary[k] for k in('pois','buildings','records_total')},ensure_ascii=False)[:1500])
print('official',json.dumps(OFF,ensure_ascii=False)[:800])
# ---------- optional: regenerate the in-game POI part ----------
if '--game' in sys.argv:
    G={'food','cafe','medical','hospital','auto','dealer','bank','school','dukkan','civic','gym','park','poi','museum','landmark','mosque','church','grocery','mall','barber','pet'}
    rows_g=[]
    for r in places:
        if not r['name'] or r['kind'] not in G or r['category'] in('ATM','Parking','Sports pitch','Playground','Taxi stand'):continue
        if r['kind']=='park' and re.search(r'استراحة|Trees|مدينة الحسن|Circle|دوار',r['name']):continue
        rows_g.append([round(r['x']*10),round(r['z']*10),r['kind'],r['name'],r['name_en'],r['category'],r['id']])
    # rows the previous build had keep their OLD order (RLP() below is a first-match lookup that seeds landmarks); new rows follow by OSM id
    rank={}
    for i,q in enumerate(POID):rank.setdefault((q[3],round(q[0]/100),round(q[1]/100)),i)
    def rk(q):
        for dx in(-1,0,1):
            for dz in(-1,0,1):
                i=rank.get((q[3],round(q[0]/100)+dx,round(q[1]/100)+dz))
                if i is not None:return(0,i,'')
        return(1,0,q[6])
    rows_g.sort(key=rk);kept=sum(1 for q in rows_g if rk(q)[0]==0)
    js=('// GENERATED by osm/overpass/build.py --game from OpenStreetMap via the Overpass API ('+STAMP+'), ODbL (c) OpenStreetMap contributors. POID rows: [x*10 m, z*10 m, kind, name, nameEn, category label, OSM id]. Do not hand-edit.\n'
        '// Rows that existed in the previous build keep their order, because RLP() (landmark seeding) takes the first match.\n'
        'const POID='+json.dumps(rows_g,ensure_ascii=False,separators=(',',':'))+';\n'
        'const RLP=(re,fb)=>{const q=POID.find(n=>re.test(n[3])||re.test(n[4]));return q?[q[0]/10,q[1]/10]:fb};\n')
    open(os.path.join(ROOT,'src','parts','03c_poi_data.js'),'w',encoding='utf-8',newline='\n').write(js);print('wrote 03c_poi_data.js rows',len(rows_g),'kept from previous build',kept,'of',len(POID))
