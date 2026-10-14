require('./hbase.js');
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)global.cb(global.t+=16.667)};
run(120);S.warp(S.START.x,S.START.z,S.START.h);S.keys.KeyW=1;
for(let s=0;s<14;s++){run(60);const r=S.roadAt(P.x,P.z,6);const near=S.traffic.filter(c=>Math.hypot(c.x-P.x,c.z-P.z)<14).length;console.log(s+1,'x',P.x.toFixed(0),'z',P.z.toFixed(0),'v',(Math.hypot(P.vx,P.vz)*3.6).toFixed(0),'h',P.h.toFixed(2),r?r.e.name+' d='+r.d.toFixed(1)+' side='+r.side.toFixed(1):'off','nearCars',near,'fines',S.fines())}
