import os
import sys
from playwright.sync_api import sync_playwright
SP=os.environ.get('SP',os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # repo root: node_modules/three + screenshots
THREE=open(SP+'/node_modules/three/build/three.min.js','rb').read()
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':800,'height':450});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.add_init_script("window.__NOAQ=1");pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+__import__('os').path.abspath(sys.argv[1]),timeout=200000);pg.wait_for_timeout(8000)
    for name,js in [('start',"()=>{warp(START.x,START.z,START.h)}"),('balad',"()=>{warp(...RA.balad,0)}"),('yu',"()=>{warp(...YUC,0)}"),('highway',"()=>{warp(PLACES.find(p=>p.name==='Jadara University').x,PLACES.find(p=>p.name==='Jadara University').z,0)}")]:
        pg.evaluate(js);pg.wait_for_timeout(3000)
        r=pg.evaluate("()=>{ren.info.autoReset=false;ren.info.reset();POST.comp.render();const i=ren.info.render;const o={calls:i.calls,tris:i.triangles};ren.info.autoReset=true;return o}")
        print(name,r,flush=True)
    print('errs',errs)
    b.close()
