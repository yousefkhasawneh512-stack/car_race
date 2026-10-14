import json
def js(extra,dist,hh):
    return ("const p=PLACES.find(q=>q.name==='Vogo Cafe');warp(p.tp[0],p.tp[1],p.tp[2]);clearInterval(window.__iv);window.__iv=setInterval(()=>{P.vx=0;P.vz=0},50);%s"
    "if(!window.__rr){window.__rr=ren.render.bind(ren)}window.__cf=(c)=>{const dx=p.tp[0]-p.x,dz=p.tp[1]-p.z,l=Math.hypot(dx,dz);c.position.set(p.x+dx/l*(%s),%s,p.z+dz/l*(%s));c.lookAt(p.x,3.5,p.z);c.fov=55;c.updateProjectionMatrix();c.updateMatrixWorld()};ren.render=(s,c)=>{if(c===cam&&window.__cf)window.__cf(c);window.__rr(s,c)};"%(extra,dist,hh,dist))
print(json.dumps([["v_day",js('',34,7)],["v_night",js('clock+=300;',34,7)],["v_close",js('',22,4)]]))
