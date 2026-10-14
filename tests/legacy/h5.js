require('./hbase.js');
const S=global.__s;
for(const [x,z] of [[689.6,-121.4],[-285,-195],[-447,-28.7]]){const L=S.COL.get((Math.floor(x/100)+100)*1000+(Math.floor(z/100)+100))||[];
const hits=L.filter(a=>{if(a.r!==undefined)return Math.hypot(x-a.x,z-a.z)<a.r+4;const dx=x-a.x,dz=z-a.z,lx=dx*a.c-dz*a.s,lz=dx*a.s+dz*a.c,cx=Math.max(-a.hw,Math.min(a.hw,lx)),cz=Math.max(-a.hd,Math.min(a.hd,lz));return Math.hypot(lx-cx,lz-cz)<4});
console.log('at',x,z,'colliders within 4m:',hits.length);hits.forEach(a=>console.log('  ',JSON.stringify({x:+a.x.toFixed(1),z:+a.z.toFixed(1),hw:a.hw&&+a.hw.toFixed(1),hd:a.hd&&+a.hd.toFixed(1),rot:+Math.atan2(a.s||0,a.c||1).toFixed(2),r:a.r})));
const r=S.roadAt(x,z,6);console.log('  road',r&&r.e.name,r&&r.d.toFixed(1),r&&r.e.w)}
