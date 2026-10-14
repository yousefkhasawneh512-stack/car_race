import sys, json, math, base64, time
from playwright.sync_api import sync_playwright
SP=os.environ.get('SP',os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # repo root: node_modules/three + screenshots
THREE=open(SP+'/node_modules/three/build/three.min.js','rb').read()
import os
HTML=os.environ.get('HTML','file:///'+os.path.join(SP,'dist','irbid-drive.html').replace(os.sep,'/'))
plan=json.load(open(sys.argv[1]))
W,H=int(sys.argv[2]) if len(sys.argv)>2 else 800,int(sys.argv[3]) if len(sys.argv)>3 else 450
logs=[]
with sync_playwright() as p:
    b=p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox','--enable-webgl'])
    pg=b.new_page(viewport={'width':W,'height':H})
    pg.on('console',lambda m:logs.append(m.type+': '+m.text[:200]))
    pg.on('pageerror',lambda e:logs.append('PAGEERROR: '+str(e)[:300]))
    pg.route('https://cdnjs.cloudflare.com/**',lambda r:r.fulfill(body=THREE,content_type='application/javascript'))
    pg.add_init_script('window.__NOAQ=1');pg.goto(HTML)
    pg.wait_for_timeout(3000)
    pg.evaluate("""()=>{window.__f=0;const ap=()=>{window.__f++;const o=window.__cam;if(o){cam.position.set(o[0],o[1],o[2]);cam.lookAt(o[3],o[4],o[5]);cam.fov=o[6]||50;cam.updateProjectionMatrix()}};const cr=POST.comp.render.bind(POST.comp);POST.comp.render=(...a)=>{ap();return cr(...a)};const r=ren.render.bind(ren);ren.render=(s,c)=>{if(!POST.on)ap();return r(s,c)}}""")
    pg.wait_for_timeout(2000)
    for sh in plan:
        name=sh['name'];T0=time.time();F0=pg.evaluate('window.__f')
        pg.evaluate("()=>{window.__cam=null;window.__img=null}")
        if sh.get('js'): pg.evaluate(sh['js'])
        pg.wait_for_timeout(sh.get('wait',300))
        if sh.get('orbit'):
            o=sh['orbit']
            st=pg.evaluate("()=>({x:P.x,y:P.y,z:P.z,h:P.h})")
            fx,fz=math.sin(st['h']),math.cos(st['h']);rx,rz=-math.cos(st['h']),math.sin(st['h'])
            cam=[st['x']+fx*o[0]+rx*o[1],st['y']+o[2],st['z']+fz*o[0]+rz*o[1],st['x']+fx*o[3],st['y']+o[4],st['z']+fz*o[3],o[5]]
        else:
            cam=sh.get('cam')
        pg.evaluate("c=>{window.__cam=c}",cam)
        F1=pg.evaluate('window.__f');t0=time.time()
        while time.time()-t0<90 and pg.evaluate('window.__f')-F1<4: pg.wait_for_timeout(400)
        pg.screenshot(path=f"{SP}/{name}.png",timeout=120000)
        for pr in sh.get('probe',[]):
            r=pg.evaluate('''([px,py,W,H])=>{const rc=new THREE.Raycaster(),v=new THREE.Vector2(px/W*2-1,-(py/H)*2+1);cam.updateMatrixWorld();rc.setFromCamera(v,cam);const hs=rc.intersectObjects(scene.children,true).filter(h=>h.object.visible).slice(0,3);return hs.map(h=>{const o=h.object;let info='';if(o.isInstancedMesh&&h.instanceId!==undefined){const m=new THREE.Matrix4();o.getMatrixAt(h.instanceId,m);const p=new THREE.Vector3().setFromMatrixPosition(m).add(o.position);const sc=new THREE.Vector3().setFromMatrixScale(m);info=' inst@'+p.toArray().map(x=>x.toFixed(1))+' sc'+sc.toArray().map(x=>x.toFixed(1))+' n='+o.count+' geo='+o.geometry.type}return o.type+' d='+h.distance.toFixed(0)+' pt'+h.point.toArray().map(x=>x.toFixed(1))+info})}''',[pr[0],pr[1],W,H])
            print('probe',pr,r,flush=True)
        for pr in sh.get('near',[]):
            r=pg.evaluate('''([px,py,W,H])=>{cam.updateMatrixWorld();const out=[],v=new THREE.Vector3(),m=new THREE.Matrix4(),pv=cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse);scene.traverse(o=>{if(!o.isInstancedMesh||!o.visible)return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);v.setFromMatrixPosition(m).add(o.position);const sc=new THREE.Vector3().setFromMatrixScale(m);const y0=v.y;const t=v.clone().applyMatrix4(pv);if(t.z>1||t.z<-1)continue;const sx=(t.x+1)/2*W,sy=(1-t.y)/2*H;if(Math.abs(sx-px)<14&&Math.abs(sy-py)<60){out.push(o.geometry.type+' c'+(o.material.color?o.material.color.getHexString():'?')+' @'+v.toArray().map(x=>x.toFixed(1))+' sc'+sc.toArray().map(x=>x.toFixed(1))+' px'+sx.toFixed(0)+','+sy.toFixed(0))}}});return out.slice(0,12)}''',[pr[0],pr[1],W,H])
            print('near',pr,r,flush=True)
        print('saved',name,'%.1fs'%(time.time()-T0),flush=True)
    b.close()
print('\n'.join(logs[:25]),flush=True)
print('ALLDONE',flush=True)
