import sys,os
from playwright.sync_api import sync_playwright
SP=os.environ.get('SP',os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # repo root: node_modules/three + screenshots
THREE=open(SP+'/node_modules/three/build/three.min.js','rb').read() if os.path.exists(SP+'/node_modules/three/build/three.min.js') else open(SP+'/w/node_modules/three/build/three.min.js','rb').read()
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':800,'height':450});errs=[];logs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]));pg.on('console',lambda m:logs.append(m.text[:160]) if m.type in('error','warning') else None)
    pg.add_init_script("window.__NOAQ=1");pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+os.path.abspath(sys.argv[1]),timeout=300000);pg.wait_for_timeout(6000)
    t=pg.evaluate("()=>({y:P.y,g:groundH(P.x,P.z),start:[START.x,START.z]})");print('start',t)
    pg.evaluate("()=>{warp(START.x,START.z,START.h);keys.KeyW=1}");
    for i in range(6):
        pg.wait_for_timeout(4000)
        print(pg.evaluate("()=>({x:Math.round(P.x),z:Math.round(P.z),y:+P.y.toFixed(1),gh:+groundH(P.x,P.z).toFixed(1),v:Math.round(Math.hypot(P.vx,P.vz)*3.6),pitch:+P.pitch.toFixed(3),bp:+P.bp.toFixed(3),br:+P.br.toFixed(3),gnd:P.gnd})"))
    pg.evaluate("()=>{keys.KeyW=0;keys.KeyS=1}");pg.wait_for_timeout(5000)
    print('braking',pg.evaluate("()=>({v:Math.round(Math.hypot(P.vx,P.vz)*3.6),bp:+P.bp.toFixed(3)})"))
    pg.screenshot(path=SP+'/drive_pw.png')
    print('errs',errs,'console',logs[:6]);b.close()
