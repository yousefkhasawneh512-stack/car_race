import sys, json, math
from playwright.sync_api import sync_playwright
SP='/tmp/claude-0/-home-claude/7976de04-c6f1-5f2c-9216-6abb7f58f2b5/scratchpad'
THREE=open(SP+'/node_modules/three/build/three.min.js','rb').read()
HTML='file:///mnt/user-data/outputs/irbid-drive.html'
plan=json.loads(sys.argv[1])  # list of shots
logs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--enable-webgl'])
    pg=b.new_page(viewport={'width':640,'height':360})
    pg.on('console',lambda m:logs.append(m.type+': '+m.text[:200]))
    pg.on('pageerror',lambda e:logs.append('PAGEERROR: '+str(e)[:300]))
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto(HTML)
    pg.wait_for_timeout(4000)
    pg.evaluate("""()=>{window.__f=0;(function c(){window.__f++;requestAnimationFrame(c)})();const r=ren.render.bind(ren);ren.render=(s,c)=>{const o=window.__cam;if(o){c.position.set(o[0],o[1],o[2]);c.lookAt(o[3],o[4],o[5]);c.fov=o[6]||50;c.updateProjectionMatrix()}r(s,c)}}""")
    pg.evaluate("()=>{ren.shadowMap.enabled=false;sun.castShadow=false;scene.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true)}})}")
    pg.wait_for_timeout(3000)
    print('frames in ~3s:',pg.evaluate('window.__f'),flush=True)
    for sh in plan:
        name=sh['name']
        pg.evaluate("()=>{window.__cam=null}")
        js=sh.get('js')
        if js: pg.evaluate(js)
        pg.wait_for_timeout(sh.get('wait',2500))
        if sh.get('orbit'):
            o=sh['orbit']  # [fwd, right, up, lookfwd, lookup, fov]
            st=pg.evaluate("()=>({x:P.x,y:P.y,z:P.z,h:P.h})")
            fx,fz=math.sin(st['h']),math.cos(st['h']);rx,rz=-math.cos(st['h']),math.sin(st['h'])
            cam=[st['x']+fx*o[0]+rx*o[1],st['y']+o[2],st['z']+fz*o[0]+rz*o[1],st['x']+fx*o[3],st['y']+o[4],st['z']+fz*o[3],o[5]]
            pg.evaluate("c=>{window.__cam=c}",cam)
            pg.wait_for_timeout(2500)
        pg.screenshot(path=f"{SP}/{name}.png",timeout=120000)
        print('shot',name,flush=True)
    print('hud:',pg.evaluate("()=>document.getElementById('top').innerText.replace(/\\n/g,' | ')"))
    b.close()
print('\n'.join(logs[:25]))
