"""CPU time per frame by subsystem in real Chromium (wraps the loop's global functions with performance.now()).
Phase 1: the game loop runs with gfxRender stubbed out (so SwiftShader does not throttle it to ~1 fps) for [seconds], driving at ~70 km/h with 80
traffic cars: mean ms per frame of every simulation/UI function = the JS cost a real machine pays on top of rendering.
Phase 2: gfxRender called 12 times back to back at the start view = CPU time to SUBMIT a frame (scene traversal, culling, uniforms, ~1,000 draw
calls). Under SwiftShader this includes software rasterisation, so it is an upper bound; GPU time on real hardware is NOT measured here.
usage: python tests/cpu_prof_pw.py dist/irbid-drive.html [seconds] [click]. 'click' = one real mouse click first (starts v45 audio, so audTick is measured
with sound running). Prints one JSON line."""
import sys,os,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
SEC=float(sys.argv[2]) if len(sys.argv)>2 else 10
FN=['audTick','fpsTick','sigTick','updTraffic','updP','updHeist','updRace','poiNear','navTick','navLabels','showCarsTick','fxTick','damageTick','drawMap','gfxRender','lodTick','lampTick','gfxSky','groundTo']
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1280,'height':720});errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.add_init_script("window.__NOAQ=1;const R=window.requestAnimationFrame;window.__lt=[];window.requestAnimationFrame=f=>R(t=>{const a=performance.now();f(t);window.__lt.push(performance.now()-a)})")
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+os.path.abspath(sys.argv[1]),timeout=300000)
    pg.wait_for_function("typeof loop==='function'&&window.__lt.length>5",timeout=300000);pg.wait_for_timeout(3000)
    if 'click' in sys.argv[3:]:pg.mouse.click(640,360);pg.wait_for_timeout(500)
    pg.evaluate("""FN=>{window.__pf={};for(const n of FN){const f=window[n];if(typeof f!=='function')continue;window.__pf[n]=0;window[n]=function(){const a=performance.now();const r=f.apply(this,arguments);window.__pf[n]+=performance.now()-a;return r}}
      window.__gr=window.gfxRender;window.gfxRender=function(){};warp(START.x,START.z,START.h);hour=12;P.vx=Math.sin(P.h)*20;P.vz=Math.cos(P.h)*20;keys.KeyW=1;setTimeout(()=>{for(const k in window.__pf)window.__pf[k]=0;window.__lt=[]},1500)}""",FN)
    pg.wait_for_timeout(1500+SEC*1000)
    r=pg.evaluate("()=>{const n=window.__lt.length,o={};for(const k in window.__pf)if(k!=='gfxRender')o[k]=+(window.__pf[k]/n).toFixed(3);const a=[...window.__lt].sort((x,y)=>x-y),lt=a.reduce((x,y)=>x+y,0)/n;keys.KeyW=0;"
 "warp(START.x,START.z,START.h);const g=window.__gr;g();g();const t0=performance.now();for(let i=0;i<12;i++)g();const rs=(performance.now()-t0)/12;"
 "return{frames:n,js_loop_ms_mean:+lt.toFixed(2),js_loop_ms_p99:+a[Math.floor(n*.99)].toFixed(2),render_submit_ms:+rs.toFixed(2),fn:o,traffic:traffic.length,audio:typeof AU!=='undefined'&&AU.ctx?AU.ctx.state:'none'}}")
    r['errors']=errs[:3];print(json.dumps(r));b.close()
