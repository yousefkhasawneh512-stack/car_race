#!/usr/bin/env python3
"""Find REAL, licensed photographs of the game's named places on Wikimedia Commons -> manifest/photos.json
usage: python osm/photos/commons.py   (project root; stdlib only; needs manifest/places.json and the h21 place dump of the
current build: node tests/h21.js dist/irbid-drive.html osm/photos/places_ingame.json)
A file is accepted only when BOTH hold: (1) it is geotagged within RADIUS m of the place (Commons geosearch), and (2) its title or
one of its categories contains a distinctive word of that place's name (generic words like mosque/school/Irbid do not count).
Licence, author and attribution come from the file's own extmetadata. Wikidata P18 images of OSM-tagged items are added the same way.
Everything else is 'no verified photo'. Photos are REFERENCE material: the game does not download or display them (single offline file)."""
import json,os,re,sys,time,urllib.request,urllib.parse,unicodedata
H=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.abspath(os.path.join(H,'..','..'));sys.path.insert(0,os.path.join(ROOT,'osm','overpass'))
from proj import xz2ll
API='https://commons.wikimedia.org/w/api.php';WD='https://www.wikidata.org/w/api.php'
UA='IrbidDrive-photo-audit/1.0 (offline research script; github.com/yousefkhasawneh512-stack/car_race)'
RADIUS=150
def get(url,params):
    q=url+'?'+urllib.parse.urlencode(dict(params,format='json',formatversion=2))
    for a in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(q,headers={'User-Agent':UA}),timeout=25) as r:return json.loads(r.read())
        except Exception as e:time.sleep(5*(a+1))
    return {}
GEN=set('mosque masjid jami school university college hospital park street circle square mall irbid jordan the of and al el center centre city new old building house museum garden اربد إربد مسجد جامع مدرسة مدرسه جامعة جامعه مستشفى حديقة حديقه دوار شارع مركز الأساسية الاساسية الثانوية الشاملة للبنين للبنات بنين بنات'.split())
AR=re.compile('[ً-ٰٟـ]')
def toks(s):
    s=unicodedata.normalize('NFKC',s or '').lower();s=AR.sub('',s)
    for a,b in(('أ','ا'),('إ','ا'),('آ','ا'),('ة','ه'),('ى','ي')):s=s.replace(a,b)
    s=re.sub(r'^(al|el)-','',s)
    out=set()
    for w in re.split(r'[^\w؀-ۿ]+',s):
        w=re.sub(r'^(al|el)','',w) if len(w)>5 and re.match(r'^(al|el)[a-z]',w) else w
        if w.startswith('ال') and len(w)>4:w=w[2:]
        if len(w)>=4 and w not in GEN:out.add(w)
    return out
# places: hand-built landmarks + OSM places of 'photo-worthy' kinds
places=[]
pm=json.load(open(os.path.join(ROOT,'manifest','places.json'),encoding='utf-8'))['places']
KINDS={'mosque','church','school','hospital','museum','landmark','park','mall','civic','gym'}
for r in pm:
    if r['name'] and r['kind'] in KINDS:places.append({'id':r['id'],'name':r['name'],'name_en':r.get('name_en',''),'lat':r['lat'],'lon':r['lon'],'kind':r['kind'],'wikidata':r['tags'].get('wikidata')})
ig=os.path.join(H,'places_ingame.json')
if os.path.exists(ig):
    seen={(p['name'],round(p['lat'],3),round(p['lon'],3)) for p in places}
    for row in json.load(open(ig,encoding='utf-8')):
        name,x,z,kind=row[0],row[1]/100,row[2]/100,row[3]
        la,lo=xz2ll(x,z)
        if any(abs(la-s[1])<.002 and abs(lo-s[2])<.002 and s[0]==name for s in seen):continue
        if kind in('drift',) or name in('Bank','Pharmacy','Mosque','School'):continue
        places.append({'id':'game:'+name,'name':name,'name_en':'','lat':round(la,6),'lon':round(lo,6),'kind':kind,'wikidata':None})
print('places to check',len(places),flush=True)
cand={};per={}
from concurrent.futures import ThreadPoolExecutor
def geo(p):   # 3 polite workers (Commons API etiquette: low concurrency, identifying User-Agent)
    d=get(API,{'action':'query','list':'geosearch','gscoord':'%f|%f'%(p['lat'],p['lon']),'gsradius':RADIUS,'gsnamespace':6,'gslimit':50})
    return p['id'],[(g['title'],g['dist']) for g in d.get('query',{}).get('geosearch',[])]
with ThreadPoolExecutor(3) as ex:
    for i,(pid,hits) in enumerate(ex.map(geo,places)):
        per[pid]=hits
        for t,dist in hits:cand.setdefault(t,[]).append((pid,dist))
        if i%50==0:print(i,len(cand),flush=True)
# Wikidata P18 for OSM items tagged with wikidata
wd={}
for p in places:
    if p['wikidata']:
        e=get(WD,{'action':'wbgetentities','ids':p['wikidata'],'props':'claims|labels','languages':'en|ar'}).get('entities',{}).get(p['wikidata'],{})
        for c in e.get('claims',{}).get('P18',[]):
            v=c.get('mainsnak',{}).get('datavalue',{}).get('value')
            if v:wd.setdefault(p['id'],[]).append('File:'+v)
titles=list(set(cand)|{t for v in wd.values() for t in v})
meta={}
for k in range(0,len(titles),40):
    b=titles[k:k+40]
    d=get(API,{'action':'query','titles':'|'.join(b),'prop':'imageinfo|categories','iiprop':'url|extmetadata|size|mime','iiurlwidth':640,'cllimit':'max','clshow':'!hidden'})
    for pg in d.get('query',{}).get('pages',[]):
        ii=(pg.get('imageinfo') or [{}])[0];em=ii.get('extmetadata',{})
        meta[pg['title']]={'cats':[c['title'][9:] for c in pg.get('categories',[])],'url':ii.get('descriptionurl'),'thumb':ii.get('thumburl'),'mime':ii.get('mime'),
          'licence':em.get('LicenseShortName',{}).get('value'),'licence_url':em.get('LicenseUrl',{}).get('value'),'artist':re.sub('<[^>]+>','',em.get('Artist',{}).get('value','')).strip(),
          'credit':re.sub('<[^>]+>','',em.get('Credit',{}).get('value','')).strip()[:200],'usage_terms':em.get('UsageTerms',{}).get('value'),'restrictions':em.get('Restrictions',{}).get('value',''),
          'attribution_required':em.get('AttributionRequired',{}).get('value'),'date':re.sub('<[^>]+>','',em.get('DateTimeOriginal',{}).get('value',''))[:40]}
    time.sleep(.3)
FREE=re.compile(r'^(CC0|CC BY(-SA)? \d|Public domain|PD|CC-BY|CC-BY-SA)',re.I)
photos=[];status={}
byid={p['id']:p for p in places}
for p in places:
    pt=toks(p['name'])|toks(p['name_en'])
    acc=[]
    for t,dist in per.get(p['id'],[]):
        m=meta.get(t)
        if not m or not (m['mime'] or '').startswith('image/'):continue
        tt=toks(t[5:].rsplit('.',1)[0]);ct=set().union(*[toks(c) for c in m['cats']]) if m['cats'] else set()
        match=pt&(tt|ct)
        if match:acc.append((t,dist,sorted(match),'title' if pt&tt else 'category'))
    for t in wd.get(p['id'],[]):
        if t in meta:acc.append((t,None,['wikidata P18'],'wikidata'))
    if not acc:status[p['id']]='no verified photo';continue
    status[p['id']]='verified photo'
    for t,dist,match,how in acc[:3]:
        m=meta[t];lic_ok=bool(m['licence'] and FREE.match(m['licence']))
        photos.append({'place_id':p['id'],'place_name':p['name'],'lat':p['lat'],'lon':p['lon'],'file':t,'source_url':m['url'],'thumbnail':m['thumb'],
          'creator':m['artist'],'credit':m['credit'],'licence':m['licence'],'licence_url':m['licence_url'],'restrictions':m['restrictions'],
          'redistributable':lic_ok,'distance_m':dist,'match':how,'matched_words':match,
          'confidence':'high' if how in('title','wikidata') and (dist is None or dist<80) else 'medium',
          'use':'reference only (not bundled or displayed in the game)'})
json.dump({'generated_by':'osm/photos/commons.py','retrieved':time.strftime('%Y-%m-%d'),'radius_m':RADIUS,
  'rule':'geotagged within radius AND distinctive name word in title/category (or Wikidata P18 of the OSM-linked item)',
  'places_checked':len(places),'places_with_verified_photo':sum(1 for v in status.values() if v=='verified photo'),
  'photos':photos,'no_photo':sorted(k for k,v in status.items() if v!='verified photo')},open(os.path.join(ROOT,'manifest','photos.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('checked',len(places),'with verified photo',sum(1 for v in status.values() if v=='verified photo'),'photos',len(photos),'candidate files near places',len(cand))
