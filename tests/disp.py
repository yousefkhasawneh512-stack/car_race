import os
import sys
from playwright.sync_api import sync_playwright
SP=os.environ.get('SP',os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # repo root: node_modules/three + screenshots
THREE=open(SP+'/node_modules/three/build/three.min.js','rb').read()
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--enable-webgl'])
    pg=b.new_page(viewport={'width':1000,'height':560});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.on('console',lambda m:errs.append(m.text[:300]) if m.type in('error','log') else None)
    pg.add_init_script("window.__NOAQ=1")
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+SP+'/'+(sys.argv[1] if len(sys.argv)>1 else 'new.html'));pg.wait_for_timeout(6000)
    q="()=>{const c=document.getElementById('game'),r=c.getBoundingClientRect();return {buf:[c.width,c.height],css:[Math.round(r.width),Math.round(r.height),Math.round(r.left),Math.round(r.top)],pr:ren.getPixelRatio(),camAsp:+cam.aspect.toFixed(4),mapSmooth:mp.imageSmoothingEnabled,gfx:GFX.on,post:POST.on,hasDisplay:typeof initialize1080pGameDisplay,ctx2d:null}}"
    print('1000x560',pg.evaluate(q))
    pg.screenshot(path=SP+'/d_1000x560.png',timeout=90000)
    for w,h in[(1000,800),(1600,500)]:
        pg.set_viewport_size({'width':w,'height':h});pg.wait_for_timeout(2500);print(w,h,pg.evaluate(q));pg.screenshot(path=SP+'/d_%dx%d.png'%(w,h),timeout=90000)
    open(SP+'/errs.txt','w').write('\n'.join(errs));b.close()
