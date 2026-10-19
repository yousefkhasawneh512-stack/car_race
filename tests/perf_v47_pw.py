"""v47 workload check in real Chromium: what the quality presets and traffic density actually change.
1) Render cost per preset: gfxRender called back to back (12 frames after 3 warm-up frames) at the start view, for Low / Auto(High) / Ultra.
   Under SwiftShader (software GL) this is CPU rasterisation, so it scales with pixels and draw calls. It shows the RELATIVE cost of the
   presets; it is NOT a GPU frame time for any real graphics card.
2) Traffic simulation cost: traffic.forEach(updTraffic) timed over 300 steps of 1/60 s at High (80) and Low (28) density.
usage: python tests/perf_v47_pw.py dist/irbid-drive.html   -> one JSON line + a table"""
import sys,os,json
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE=open(ROOT+'/node_modules/three/build/three.min.js','rb').read()
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg=b.new_page(viewport={'width':1280,'height':720});pg.add_init_script("window.__NOAQ=1")
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.goto('file://'+os.path.abspath(sys.argv[1]),timeout=300000);pg.wait_for_function("typeof platLine==='function'",timeout=300000);pg.wait_for_timeout(3000)
    ev=lambda s:pg.evaluate("()=>{"+s+"}")
    ev("warp(START.x,START.z,START.h);hour=11;PAUSE.on=true")   # the loop idles while paused; we drive frames by hand
    out={}
    for q in ['low','auto','ultra']:
        out[q]=ev("""GQ.q='%s';gqApply();lodTick();for(let i=0;i<3;i++)gfxRender();const ri=ren.info;ri.autoReset=false;ri.reset();const gl=ren.getContext(),px=new Uint8Array(4);
         const t0=performance.now();for(let i=0;i<12;i++){gfxRender();gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px)}const ms=(performance.now()-t0)/12;
         const r={ms:+ms.toFixed(1),calls:Math.round(ri.render.calls/12),tris:Math.round(ri.render.triangles/12),buf:ren.domElement.width+'x'+ren.domElement.height,post:POST.on};ri.autoReset=true;return r"""%q)
    ev("GQ.q='auto';gqApply()")
    for t in ['high','low']:
        out['traffic_'+t]=ev("""GQ.t='%s';trApply();const dt=1/60;for(let i=0;i<30;i++)traffic.forEach(c=>updTraffic(c,dt));const t0=performance.now();for(let i=0;i<300;i++)traffic.forEach(c=>updTraffic(c,dt));
         return{ms_per_step:+((performance.now()-t0)/300).toFixed(3),active:TRAFALL.filter(c=>!c.park).length}"""%t)
    ev("GQ.t='high';trApply();PAUSE.on=false")
    b.close()
print(json.dumps(out))
for q in ['low','auto','ultra']:print('%-6s buffer %-10s post %-5s %5.1f ms/frame  %5d draws  %8d tris'%(q,out[q]['buf'],out[q]['post'],out[q]['ms'],out[q]['calls'],out[q]['tris']))
for t in ['high','low']:print('traffic %-5s %2d cars  %.3f ms per simulation step'%(t,out['traffic_'+t]['active'],out['traffic_'+t]['ms_per_step']))
