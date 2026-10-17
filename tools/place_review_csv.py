#!/usr/bin/env python3
"""manifest/places.json + name_review.json + unresolved_places.json -> PLACE_REVIEW.csv (one row per place record, plus the hand-built
landmarks that have an open issue, the municipal heritage sites / malls checked in v43 (manifest/heritage_check.json) and the suspected
upstream OSM errors (manifest/osm_upstream_issues.json)). Stdlib only; run after osm/overpass/build.py. Columns:
  id, osm_type, osm_id, name, name_en, name_ar, other_names, kind, category, lat, lon, x, z, geometry, in_game, source, retrieved,
  confidence, flags, review_status, review_note
review_status: ok | corrected (name changed by a rule, see NAME_CORRECTIONS.md) | needs_review (open name issue) | unnamed (kept unnamed,
not shown as a labelled place) | landmark_issue (hand-built landmark with an open position/name issue) | heritage_* / business_* (official list vs OSM/game) |
osm_upstream (the game corrected its copy; OSM itself still needs a checked edit). review_note also carries the audit id (CAT-001...)."""
import csv,json,os
ROOT=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..'))
M=lambda f:json.load(open(os.path.join(ROOT,'manifest',f),encoding='utf-8'))
P=M('places.json');NR=M('name_review.json');U=M('unresolved_places.json');HC=M('heritage_check.json');UP=M('osm_upstream_issues.json')
app={};[app.setdefault(a['id'],[]).append(a) for a in NR['applied']]
rev={}
for r in NR['needs_review']:rev[r['id']]=(rev[r['id']]+' || ' if r['id'] in rev else '')+r['issue']
cols=['id','osm_type','osm_id','name','name_en','name_ar','other_names','kind','category','lat','lon','x','z','geometry','in_game','source','retrieved','confidence','flags','review_status','review_note']
rows=[];cnt={}
for p in P['places']:
    nm=p.get('names') or {};oth='; '.join(k+'='+v for k,v in nm.items() if k not in('name:en','name:ar'))
    if p['id'] in app:
        st='corrected';note=' | '.join(a['field']+': '+json.dumps(a['from'],ensure_ascii=False)+' -> '+json.dumps(a['to'],ensure_ascii=False)+' ['+(a.get('conf') or 'rule')+'] '+a['rule'][:160] for a in app[p['id']])
        if p['id'] in rev:st='corrected_needs_review';note+=' || OPEN: '+rev[p['id']]
    elif p['id'] in rev:st='needs_review';note=rev[p['id']]
    elif 'unnamed' in p['flags']:st='unnamed';note='no name tag in OSM; no name invented'
    else:st='ok';note=''
    cnt[st]=cnt.get(st,0)+1
    rows.append([p['id'],p.get('osm_type',''),p.get('osm_id',''),p.get('name',''),p.get('name_en','') or nm.get('name:en',''),nm.get('name:ar',''),oth,p.get('kind',''),p.get('category',''),
      p.get('lat',''),p.get('lon',''),p.get('x',''),p.get('z',''),p.get('geometry',''),p.get('in_game',''),p.get('source',''),p.get('retrieved',''),p.get('confidence',''),';'.join(p.get('flags',[])),st,note])
for l in U.get('landmarks',[]):
    cnt['landmark_issue']=cnt.get('landmark_issue',0)+1
    rows.append(['landmark:'+l['place'],'','',l['place'],'','','','landmark','hand-built landmark','','','','','','True','original game (see PLACE_IMPORT_REPORT.md)','','unverified','', 'landmark_issue',l['issue']+' -> '+l['status']])
E=['']*16
for h in HC['heritage']:
    st='heritage_'+h['status'].split(':')[0];cnt[st]=cnt.get(st,0)+1
    rows.append(['heritage:'+h['name_en'],'','',h['name_ar'],h['name_en'],h['name_ar'],'','heritage','municipal heritage list',*['']*4,'',str(h['status'].startswith(('osm','landmark'))),'irbid.gov.jo/?page_id=6711','2026-10-17','official list','',st,h['note']])
for b in HC['businesses']:
    st='business_'+('present' if b['status'].startswith('in OSM') else 'absent');cnt[st]=cnt.get(st,0)+1
    rows.append(['business:'+b['name'],'','',b['name'],'','','','mall','checked against the business site',*['']*4,'',str(st=='business_present'),'official website','2026-10-17','','',st,b['note']])
for u in UP['issues']:
    cnt['osm_upstream']=cnt.get('osm_upstream',0)+1
    rows.append([u['id'],'','',u['name'],'','','','','',*['']*4,'','','OpenStreetMap','','','', 'osm_upstream','OSM says '+u['osm_tags_say']+'; name says '+u['name_says']+'. '+u['suggested_check']])
with open(os.path.join(ROOT,'PLACE_REVIEW.csv'),'w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f);w.writerow(cols);w.writerows(rows)
print(len(rows),'rows',cnt)
