#!/usr/bin/env python3
"""Search Sketchfab (public API, no account) for a downloadable model of every car in the game -> manifest/car_model_candidates.json
usage: python tools/sketchfab_search.py   (needs manifest/cars.json from tools/gen_car_manifest.js; stdlib only)
NOTHING is downloaded. Downloads need the owner's Sketchfab account (OAuth), and bundling GLB files conflicts with the single-file build.
A candidate is listed only when its title contains the make AND every distinctive word of the model name. Licence suitability for this game:
  CC0 / CC-BY / CC-BY-SA: usable with attribution (SA: the model's derivative must stay SA)
  CC-BY-NC*: non-commercial only;  *-ND: no derivatives (incompatible with mesh splitting for damage);  Standard/Editorial: not for this use
Brand names and car designs can be trademarks/trade dress: a licence for the mesh is not a licence for the brand (owner decision)."""
import json,os,re,time,urllib.request,urllib.parse
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
UA='IrbidDrive-asset-audit/1.0 (search only; github.com/yousefkhasawneh512-stack/car_race)'
cars=json.load(open(os.path.join(ROOT,'manifest','cars.json'),encoding='utf-8'))['cars']
OK={'cc0':'usable (CC0)','by':'usable with attribution (CC BY)','by-sa':'usable with attribution, share-alike (CC BY-SA)','by-nc':'non-commercial only','by-nc-sa':'non-commercial only, share-alike',
    'by-nd':'no derivatives: cannot be split/deformed for damage','by-nc-nd':'non-commercial, no derivatives','st':'Sketchfab Standard: not for redistribution in an open game','ed':'editorial only'}
LBL={"cc0": "cc0", "public domain": "cc0", "cc attribution": "by", "cc attribution-sharealike": "by-sa", "cc attribution-noncommercial": "by-nc", "cc attribution-noncommercial-sharealike": "by-nc-sa", "cc attribution-noderivs": "by-nd", "cc attribution-noncommercial-noderivs": "by-nc-nd", "free standard": "st", "standard": "st", "editorial": "ed"}
STOP={'the','and','ev','hybrid','series','class','drift','spec','mk','gen'}
def words(s):return[w for w in re.split(r'[^a-z0-9]+',s.lower()) if w and w not in STOP]
def get(q):
    url='https://api.sketchfab.com/v3/search?'+urllib.parse.urlencode({'type':'models','q':q,'downloadable':'true','count':24,'sort_by':'-likeCount'})
    for a in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':UA}),timeout=40) as r:return json.loads(r.read())
        except Exception as e:time.sleep(8*(a+1))
    return{}
out=[];n=0
for c in cars:
    name=c['name'];w=words(name);make=w[0] if w else ''
    d=get(name);time.sleep(1.1);cand=[]
    for m in d.get('results',[]):
        t=m.get('name','');tw=set(words(t))
        if make not in tw or not all(x in tw or any(y.startswith(x) for y in tw) for x in w[1:]):continue
        lic=((m.get('license') or {}).get('slug') or (m.get('license') or {}).get('label') or '?').lower()
        lic=LBL.get(lic,lic)
        arch=m.get('archives') or {};glb=arch.get('glb') or arch.get('gltf') or {}
        cand.append({'title':t,'url':m.get('viewerUrl'),'author':(m.get('user') or {}).get('displayName'),'author_url':(m.get('user') or {}).get('profileUrl'),
          'licence':lic,'suitability':OK.get(lic,'check licence page'),'faces':m.get('faceCount'),'vertices':m.get('vertexCount'),'glb_bytes':glb.get('size'),'published':m.get('publishedAt','')[:10]})
    best=[x for x in cand if x['licence'] in('cc0','by','by-sa')]
    out.append({'car':name,'candidates':cand[:6],'usable_licence_candidates':len(best),'status':'candidate found (not downloaded)' if best else 'no suitably licensed match found' if cand else 'no match found'})
    n+=1
    if n%20==0:print(n,'cars searched',flush=True)
summ={'searched':len(out),'with_usable_licence':sum(1 for o in out if o['usable_licence_candidates']),'with_any_match':sum(1 for o in out if o['candidates'])}
json.dump({'generated_by':'tools/sketchfab_search.py','retrieved':time.strftime('%Y-%m-%d'),'note':'search results only; nothing downloaded or bundled; titles are the uploaders\' own claims, not verified models',
  'summary':summ,'cars':out},open(os.path.join(ROOT,'manifest','car_model_candidates.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(json.dumps(summ))
