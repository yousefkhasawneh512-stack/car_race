#!/usr/bin/env python3
"""Fetch every mapped feature inside the game's playable window from the OpenStreetMap Overpass API (ODbL).
usage: python osm/overpass/fetch.py [--refresh] [pois|buildings|highways ...]   (from the project root; stdlib only)
Cached: a layer whose raw file is younger than MAX_AGE days is NOT downloaded again unless --refresh is given (be kind to the
public Overpass instance). Failures back off and retry; a failed layer keeps its previous raw file.
Writes raw/pois.json, raw/buildings.json, raw/highways.json (local only: osm/**/*.json is git-ignored by owner decision).
The window is the road network's own window (osm/net_stats.json "win", game metres), converted to lat/lon with the game's projection.
Run it offline-of-the-game: the shipped HTML never calls Overpass."""
import json,os,sys,time,urllib.request,urllib.parse
H=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,H)
from proj import xz2ll
URL='https://overpass-api.de/api/interpreter';UA='IrbidDrive-data-pipeline/1.0 (offline build step; github.com/yousefkhasawneh512-stack/car_race)'
win=json.load(open(os.path.join(H,'..','net_stats.json')))['win']
cs=[xz2ll(x,z) for x in win[:2] for z in win[2:]];S=min(c[0] for c in cs);N=max(c[0] for c in cs);W=min(c[1] for c in cs);E=max(c[1] for c in cs)
bb='%.5f,%.5f,%.5f,%.5f'%(S,W,N,E)
Q={
 # every POI-type tag family, plus mosque/school buildings (newer education=school tagging included)
 'pois':'[out:json][timeout:300];(nwr["amenity"]({b});nwr["shop"]({b});nwr["leisure"]({b});nwr["tourism"]({b});nwr["historic"]({b});nwr["healthcare"]({b});nwr["office"]({b});nwr["craft"]({b});nwr["education"]({b});nwr["public_transport"]({b});nwr["highway"="bus_stop"]({b});nwr["building"~"^(mosque|school|university|college|kindergarten|hospital|church)$"]({b});nwr["place"]({b});nwr["sport"]({b});node["addr:housenumber"]({b});node["name"]({b}););out center tags qt;',
 'buildings':'[out:json][timeout:600];(way["building"]({b});relation["building"]({b}););out center tags qt;',
 'highways':'[out:json][timeout:300];way["highway"]({b});out tags qt;',
 # footprint outlines (lat/lon rings) for osm/bld/conv_overpass.py -> 03e (buildings outside the old BBBike extract). Big: run on its own.
 'traffic_calming':'[out:json][timeout:120];(nwr["traffic_calming"]({b});node["highway"="speed_camera"]({b}););out center tags qt;',
 'buildings_geom':'[out:json][timeout:900][maxsize:1073741824];way["building"]({b});out geom tags qt;'}
os.makedirs(os.path.join(H,'raw'),exist_ok=True)
MAX_AGE=30;args=[a for a in sys.argv[1:] if not a.startswith('--')];refresh='--refresh' in sys.argv
for k,q in Q.items():
    if args and k not in args:continue
    rp=os.path.join(H,'raw',k+'.json')
    if not refresh and os.path.exists(rp) and time.time()-os.path.getmtime(rp)<MAX_AGE*86400:print(k,'cached (use --refresh to download again)');continue
    data=urllib.parse.urlencode({'data':q.format(b=bb)}).encode()
    t=time.time()
    for attempt in range(6):   # the public instance answers 429/502/504 under load: back off and retry
        try:
            req=urllib.request.Request(URL,data=data,headers={'User-Agent':UA})
            with urllib.request.urlopen(req,timeout=900) as r:body=r.read()
            break
        except Exception as e:
            print(k,'attempt',attempt+1,'failed:',e);time.sleep(30*(attempt+1))
    else:print(k,'Overpass unavailable, keeping the previous raw file');continue
    d=json.loads(body);d['bbox']=[S,W,N,E];d['window_game_m']=win
    json.dump(d,open(rp+'.tmp','w',encoding='utf-8'),ensure_ascii=False);os.replace(rp+'.tmp',rp)   # atomic: a crash never leaves a half file
    print(k,len(d['elements']),'elements',round(len(body)/1e6,1),'MB',round(time.time()-t),'s osm_base',d['osm3s']['timestamp_osm_base'])
    time.sleep(5)
