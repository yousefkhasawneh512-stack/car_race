import os
from playwright.sync_api import sync_playwright
SP=os.environ.get('SP',os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # repo root: node_modules/three + screenshots
THREE=open(SP+'/node_modules/three/build/three.min.js','rb').read()
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--enable-webgl'])
    pg=b.new_page(viewport={'width':1000,'height':560})
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+SP+'/new.html');pg.wait_for_timeout(4000)
    # plain street, wet-look asphalt + grade
    pg.evaluate("()=>{warp(760,-146,Math.PI/2)}");pg.wait_for_timeout(5000);pg.screenshot(path=SP+'/fx_street.png')
    # forced drift: sliding state, then pump the particle step
    pg.evaluate("""()=>{warp(760,-146,Math.PI/2);P.gnd=true;drift.t=3.2;drift.off=0;drift.pts=50;window.__d=setInterval(()=>{P.vx=Math.sin(P.h)*16+Math.cos(P.h)*10;P.vz=Math.cos(P.h)*16-Math.sin(P.h)*10;drift.t=3.2;drift.off=0;drift.pts=50;for(let i=0;i<3;i++){P.x+=Math.sin(P.h)*.9;P.z+=Math.cos(P.h)*.9;fxTick(.05)}},120)}""")
    pg.wait_for_timeout(6000);pg.screenshot(path=SP+'/fx_drift.png')
    print(pg.evaluate("()=>({smoke:SMK.filter(s=>s.visible).length,glare:GLR.filter(g=>g.visible).length,maxs:Math.max(...SMK.filter(s=>s.visible).map(s=>s.scale.x))})"))
    pg.evaluate("()=>{clearInterval(window.__d);drift.pts=0;drift.t=0;window.__v=setInterval(()=>{const f=[Math.sin(P.h),Math.cos(P.h)];P.vx=f[0]*52;P.vz=f[1]*52},60)}")
    pg.wait_for_timeout(3000);pg.screenshot(path=SP+'/fx_speed.png')
    print(pg.evaluate("()=>({blur:fxBlur.style.opacity,filter:ren.domElement.style.filter})"),errs)
    b.close()
