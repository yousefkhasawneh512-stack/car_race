"""v47 in real Chromium (built game): loading screen removed after the first frame, graphics presets that change the real workload
(Low = 1280x720 buffer + no post, Ultra = 4096 shadow map + longer detail range, Auto restores 1920x1080), traffic density (parked cars
hidden and not simulated, restored cars respawn out of sight), WebGL context loss + restore (pause, message, rendering resumes), the
no-WebGL message, the error banner, the pause-menu traffic + device rows and their storage, no page errors.
usage: python tests/v47_pw.py dist/irbid-drive.html   (screenshots -> docs/screenshots/v47/, or SP)
Exits 1 on failure."""
import sys,os
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
OUT=os.environ.get('SP',ROOT+'/docs/screenshots/v47');os.makedirs(OUT,exist_ok=True)
URL='file://'+os.path.abspath(sys.argv[1])
fail=0
def ok(c,m,v=''):
    global fail
    print(('PASS ' if c else 'FAIL ')+m+(('  ['+str(v)+']') if v!='' else ''));fail+=0 if c else 1
ARGS=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required']
with sync_playwright() as p:
    b=p.chromium.launch(args=ARGS)
    pg=b.new_page(viewport={'width':1280,'height':720});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
    pg.add_init_script("window.__NOAQ=1")
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto(URL,timeout=300000)
    pg.wait_for_function("typeof platLine==='function'&&typeof loop==='function'",timeout=300000);pg.wait_for_timeout(2500)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    ok(ev("return !document.getElementById('boot')"),'loading screen removed after the first frame')
    ev("warp(START.x,START.z,START.h);hour=11")
    # ---- graphics presets ----
    ev("GQ.q='low';gqApply()");pg.wait_for_timeout(1500)
    lo=ev("return{w:ren.domElement.width,h:ren.domElement.height,post:POST.on,sh:sun.shadow.mapSize.x,r:LODL[0].r2/GQ.base.lod[0],css:ren.domElement.style.width}")
    pg.screenshot(path=OUT+'/quality_low.png')
    ok(lo['w']==1280 and lo['h']==720 and not lo['post'] and lo['sh']==1024 and abs(lo['r']-.49)<1e-6,'Low: 1280x720 buffer, no post chain, 1024 shadows, 0.7x detail range',lo)
    ev("GQ.q='ultra';gqApply()");pg.wait_for_timeout(1500)
    ul=ev("return{w:ren.domElement.width,h:ren.domElement.height,post:POST.on,cw:POST.comp?POST.comp.renderTarget1.width:0,bloom:POST.bloom?POST.bloom.enabled:null,r:LODL[0].r2/GQ.base.lod[0]}")
    pg.screenshot(path=OUT+'/quality_ultra.png')
    ok(ul['w']==2560 and ul['h']==1440 and ul['post'] and ul['cw']==2560 and abs(ul['r']-1.69)<1e-6,'Ultra: 2560x1440 buffer and post chain (supersampled), bloom, 1.3x detail range',ul)
    ev("GQ.q='auto';gqApply()");pg.wait_for_timeout(500)
    au=ev("return{w:ren.domElement.width,cw:POST.comp?POST.comp.renderTarget1.width:0,sh:sun.shadow.mapSize.x,base:GQ.base.sh,r:LODL[0].r2/GQ.base.lod[0]}")
    ok(au['w']==1920 and au['cw']==1920 and au['sh']==au['base'] and abs(au['r']-1)<1e-6,'Auto restores the v46 settings (1920x1080, start shadow map, 1x range)',au)
    # ---- traffic density ----
    ev("GQ.t='low';trApply()");pg.wait_for_timeout(1500)
    t=ev("const a=TRAFALL.filter(c=>!c.park),k=TRAFALL.filter(c=>c.park);const x=k.map(c=>c.x);return{act:a.length,park:k.length,hid:k.every(c=>!c.m.visible),far:x.every(v=>v===2e5)}")
    ok(t['act']==28 and t['park']==52 and t['hid'] and t['far'],'Low traffic: 28 cars simulated, 52 parked (hidden, not updated)',t)
    ev("GQ.t='high';trApply()");pg.wait_for_timeout(1500)
    t=ev("let mn=1e9;for(const c of TRAFALL)if(!c.park&&c.x<9e4)mn=Math.min(mn,Math.hypot(c.x-P.x,c.z-P.z));return{act:TRAFALL.filter(c=>!c.park).length,vis:TRAFALL.filter(c=>c.m.visible).length,ok:TRAFALL.every(c=>isFinite(c.x)&&isFinite(c.z)),mn:Math.round(mn)}")
    ok(t['act']==80 and t['ok'],'High traffic: all 80 cars back (restored cars respawn 200+ m away, out of sight)',t)
    # ---- pause menu rows ----
    pg.mouse.click(640,360);pg.keyboard.press('Escape');pg.wait_for_timeout(400)
    txt=ev("return pauseEl.textContent");ok('Traffic' in txt and 'This device: WebGL' in txt and 'Ultra' in txt,'pause menu: Ultra preset, traffic density, device report',ev("return pauseEl.querySelector('[data-i=\"plat\"]').textContent"))
    pg.select_option('#pauseMenu [data-s="tr"]','medium');pg.wait_for_timeout(200)
    s=ev("return{t:GQ.t,act:TRAFALL.filter(c=>!c.park).length,st:localStorage.getItem('irbid-drive-gfx-v1')}");ok(s['t']=='medium' and s['act']==52 and '"t":"medium"' in (s['st'] or ''),'traffic chosen in the menu is applied and stored',s)
    pg.screenshot(path=OUT+'/pause_v47.png')
    pg.select_option('#pauseMenu [data-s="tr"]','high');pg.keyboard.press('Escape');pg.wait_for_timeout(500)
    # ---- WebGL context loss / restore ----
    ev("window.__lc=ren.getContext().getExtension('WEBGL_lose_context');window.__lc.loseContext()");pg.wait_for_timeout(1200)
    l=ev("return{lost:ren.getContext().isContextLost(),ov:GLX.el.style.display,pause:PAUSE.on}");pg.screenshot(path=OUT+'/context_lost.png')
    ok(l['lost'] and l['ov']=='flex' and l['pause'],'context lost: game paused, message shown',l)
    ev("window.__lc.restoreContext()");pg.wait_for_timeout(4000)
    r=ev("return{lost:ren.getContext().isContextLost(),ov:GLX.el.style.display,pause:PAUSE.on,n:GLX.n}")
    pg.screenshot(path=OUT+'/context_restored.png')
    # read the pixels in the same task as a render (no preserveDrawingBuffer); POST off for the read so the default framebuffer holds the frame
    px=ev("const po=POST.on;POST.on=false;ren.render(scene,cam);const gl=ren.getContext(),W=gl.drawingBufferWidth,H=gl.drawingBufferHeight,d=new Uint8Array(W*H*4);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,d);POST.on=po;let s=0,v=0,n=0;for(let i=0;i<d.length;i+=4*97){const l=(d[i]+d[i+1]+d[i+2])/3;s+=l;v+=l*l;n++}const m=s/n;return{mean:Math.round(m),sd:Math.round(Math.sqrt(v/n-m*m))}")
    ok(not r['lost'] and r['ov']=='none' and not r['pause'],'context restored: message gone, game resumes',r)
    ok(px['mean']>30 and px['sd']>8,'after the restore the scene is drawn again (not a blank canvas)',px)
    ok(not errs,'no page errors',errs[:3])
    # ---- error banner ----
    ev("setTimeout(()=>{throw new Error('v47 banner check')},0)");pg.wait_for_timeout(500)
    e=ev("const b=document.getElementById('errBan');return{d:b.style.display,t:b.textContent}")
    ok(e['d']=='block' and 'v47 banner check' in e['t'],'an uncaught error shows the error banner',e['t'][:90])
    pg.close()
    # ---- no WebGL at all ----
    pg=b.new_page(viewport={'width':1280,'height':720})
    pg.add_init_script("const g=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:g.call(this,t,...a)}")
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto(URL,timeout=300000);pg.wait_for_timeout(3000)
    n=pg.evaluate("()=>{const d=document.getElementById('nogl');return{shown:!!d,t:d?d.textContent:'',boot:!!document.getElementById('boot')}}")
    pg.screenshot(path=OUT+'/no_webgl.png')
    ok(n['shown'] and 'WebGL' in n['t'] and not n['boot'],'no WebGL: a readable message instead of a blank page',n['t'][:80])
    b.close()
print('v47_pw: '+('all passed' if not fail else str(fail)+' FAILED'));sys.exit(1 if fail else 0)
