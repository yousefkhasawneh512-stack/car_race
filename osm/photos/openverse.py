#!/usr/bin/env python3
"""Second photo source: Openverse (https://api.openverse.org/v1/, anonymous, rate-limited) for the IMPORTANT named places only
(landmarks, museums, historic sites, universities, hospitals, malls, parks and named mosques), added to manifest/photos.json.
usage: python osm/photos/openverse.py   (after commons.py; stdlib only)
Openverse results almost never carry coordinates, so the rule is stricter on words: accepted only when the title or tags contain a
DISTINCTIVE word of the place name (same tokeniser as commons.py) AND 'Irbid'/'اربد'. Such a match is 'medium' confidence at best
(name evidence, no location evidence) and is marked so. Files that are Wikimedia Commons mirrors are skipped (commons.py covers them).
Only licences that allow reuse with attribution are kept (CC0, PDM, CC BY, CC BY-SA); NC/ND are recorded as rejected."""
import json,os,re,sys,time,urllib.request,urllib.parse
H=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.abspath(os.path.join(H,'..','..'));sys.path.insert(0,H)
UA='IrbidDrive-photo-audit/1.0 (offline research script; github.com/yousefkhasawneh512-stack/car_race)'
import importlib.util
spec=importlib.util.spec_from_file_location('cm',os.path.join(H,'commons.py'))
src=open(os.path.join(H,'commons.py'),encoding='utf-8').read();toks_src=src[src.index('GEN=set('):src.index('# places:')]
ns={'re':re,'unicodedata':__import__('unicodedata')};exec(toks_src,ns);toks=ns['toks']
pm=json.load(open(os.path.join(ROOT,'manifest','places.json'),encoding='utf-8'))['places']
IMP={'museum','landmark','hospital','mall','park','church'}
places=[r for r in pm if r['name'] and (r['kind'] in IMP or r.get('in_game_as') or r['category'] in('University','College') or (r['kind']=='mosque' and toks(r['name'])))]
seen=set();P=[]
for r in places:
    k=r.get('in_game_as') or r['name']
    if k in seen:continue
    seen.add(k);P.append(r)
print('important places',len(P),flush=True)
def get(q,page):
    url='https://api.openverse.org/v1/images/?'+urllib.parse.urlencode({'q':q,'page_size':20,'page':page})
    for a in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=60) as r:return json.loads(r.read())
        except Exception as e:time.sleep(10*(a+1))
    return {}
# Openverse holds only a few hundred images that mention Irbid at all, so download that whole corpus once (about 15 requests)
# and match it locally, instead of one slow search per place.
corpus={}
for q in('Irbid','Irbed','اربد','إربد'):
    pg=1
    while True:
        d=get(q,pg);R=d.get('results',[])
        for it in R:corpus[it['id']]=it
        print(q,'page',pg,len(R),'corpus',len(corpus),flush=True)
        if not R or pg>=d.get('page_count',0):break
        pg+=1;time.sleep(1.5)
OK=re.compile(r'^(cc0|pdm|by|by-sa)$');IRB=re.compile(r'irbid|irbed|اربد|إربد',re.I)
found=[];rejected=[];checked=0;mirrors=sum(1 for it in corpus.values() if 'wikimedia' in (it.get('foreign_landing_url') or '')+(it.get('source') or ''))
for r in P:
    name=r.get('in_game_as') or r['name_en'] or r['name'];pt=toks(name)|toks(r['name'])|toks(r['name_en'])
    if not pt:continue
    checked+=1
    for it in corpus.values():
        if 'wikimedia' in (it.get('source') or '') or 'wikimedia' in (it.get('foreign_landing_url') or ''):continue
        text=(it.get('title') or '')+' '+' '.join(t.get('name','') for t in it.get('tags') or [])
        m=pt&toks(text)
        if not m or not IRB.search(text):continue
        e={'place_id':r['id'],'place_name':name,'lat':r['lat'],'lon':r['lon'],'file':it.get('title'),'source_url':it.get('foreign_landing_url'),'thumbnail':it.get('thumbnail'),
           'creator':it.get('creator'),'licence':('CC '+(it.get('license') or '').upper()+' '+(it.get('license_version') or '')).strip(),'licence_url':it.get('license_url'),
           'provider':it.get('provider'),'distance_m':None,'match':'openverse title/tags','matched_words':sorted(m),'confidence':'medium (name match, no coordinates)',
           'redistributable':bool(OK.match(it.get('license') or '')),'use':'reference only (not bundled or displayed in the game)','source':'Openverse'}
        (found if e['redistributable'] else rejected).append(e)
print('corpus',len(corpus),'commons mirrors skipped',mirrors)
pf=os.path.join(ROOT,'manifest','photos.json');ph=json.load(open(pf,encoding='utf-8'))
ph['photos']=[q for q in ph['photos'] if q.get('source')!='Openverse']+found
ph['openverse']={'retrieved':time.strftime('%Y-%m-%d'),'places_checked':checked,'corpus_images_mentioning_irbid':len(corpus),'commons_mirrors_skipped':mirrors,'accepted':len(found),'rejected_licence':[{'place':q['place_name'],'file':q['file'],'licence':q['licence']} for q in rejected],
  'rule':'distinctive name word AND Irbid in title/tags; Commons mirrors skipped; CC0/PDM/CC BY/CC BY-SA only'}
withp={q['place_id'] for q in ph['photos']};ph['places_with_verified_photo']=len(withp);ph['no_photo']=sorted(set(ph['no_photo'])-withp)
json.dump(ph,open(pf,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('checked',checked,'accepted',len(found),'rejected (licence)',len(rejected),'places with any photo',len(withp))
