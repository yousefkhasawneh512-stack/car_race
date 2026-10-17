#!/usr/bin/env python3
"""manifest/places.json + name_review.json + unresolved_places.json -> PLACE_REVIEW.csv (one row per place record, plus the hand-built
landmarks that have an open issue). Stdlib only; run after osm/overpass/build.py. Columns:
  id, osm_type, osm_id, name, name_en, name_ar, other_names, kind, category, lat, lon, x, z, geometry, in_game, source, retrieved,
  confidence, flags, review_status, review_note
review_status: ok | corrected (name changed by a rule, see NAME_CORRECTIONS.md) | needs_review (open name issue) | unnamed (kept unnamed,
not shown as a labelled place) | landmark_issue (hand-built landmark with an open position/name issue)."""
import csv,json,os
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
M=lambda f:json.load(open(os.path.join(ROOT,'manifest',f),encoding='utf-8'))
P=M('places.json');NR=M('name_review.json');U=M('unresolved_places.json')
app={};[app.setdefault(a['id'],[]).append(a) for a in NR['applied']]
rev={r['id']:r['issue'] for r in NR['needs_review']}
cols=['id','osm_type','osm_id','name','name_en','name_ar','other_names','kind','category','lat','lon','x','z','geometry','in_game','source','retrieved','confidence','flags','review_status','review_note']
rows=[];cnt={}
for p in P['places']:
    nm=p.get('names') or {};oth='; '.join(k+'='+v for k,v in nm.items() if k not in('name:en','name:ar'))
    if p['id'] in app:st='corrected';note=' | '.join(a['rule'].split(';')[0]+': '+json.dumps(a['from'],ensure_ascii=False)+' -> '+json.dumps(a['to'],ensure_ascii=False) for a in app[p['id']])
    elif p['id'] in rev:st='needs_review';note=rev[p['id']]
    elif 'unnamed' in p['flags']:st='unnamed';note='no name tag in OSM; no name invented'
    else:st='ok';note=''
    cnt[st]=cnt.get(st,0)+1
    rows.append([p['id'],p.get('osm_type',''),p.get('osm_id',''),p.get('name',''),p.get('name_en','') or nm.get('name:en',''),nm.get('name:ar',''),oth,p.get('kind',''),p.get('category',''),
      p.get('lat',''),p.get('lon',''),p.get('x',''),p.get('z',''),p.get('geometry',''),p.get('in_game',''),p.get('source',''),p.get('retrieved',''),p.get('confidence',''),';'.join(p.get('flags',[])),st,note])
for l in U.get('landmarks',[]):
    cnt['landmark_issue']=cnt.get('landmark_issue',0)+1
    rows.append(['landmark:'+l['place'],'','',l['place'],'','','','landmark','hand-built landmark','','','','','','True','original game (see PLACE_IMPORT_REPORT.md)','','unverified','', 'landmark_issue',l['issue']+' -> '+l['status']])
with open(os.path.join(ROOT,'PLACE_REVIEW.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f);w.writerow(cols);w.writerows(rows)
print(len(rows),'rows',cnt)
