require('./hbase.js');
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)global.cb(global.t+=16.667)};
run(120);const l=S.LM.find(l=>l[0]==='Al-Balad souks');
for(let trial=0;trial<8;trial++){S.race.s='idle';S.warp(l[1],l[2],0);S.startRace();let f=0,hit=false;
 for(f=0;f<60*40&&!hit;f++){run(1);S.bots.forEach((b,i)=>{if(!hit&&S.race.s==='run'&&b.v<.5&&f>60*8){hit=true;const x=b.x,z=b.z;console.log('trial',trial,'bot',i,'stuck t=',(f/60).toFixed(1),'pos',x.toFixed(1),z.toFixed(1),'v',b.v.toFixed(2),'h',b.h.toFixed(2));
  const L=S.COL.get((Math.floor(x/100)+100)*1000+(Math.floor(z/100)+100))||[];L.filter(a=>{if(a.r!==undefined)return Math.hypot(x-a.x,z-a.z)<a.r+8;const dx=x-a.x,dz=z-a.z,lx=dx*a.c-dz*a.s,lz=dx*a.s+dz*a.c,cx=Math.max(-a.hw,Math.min(a.hw,lx)),cz=Math.max(-a.hd,Math.min(a.hd,lz));return Math.hypot(lx-cx,lz-cz)<8}).forEach(a=>console.log('   col',JSON.stringify({x:+a.x.toFixed(1),z:+a.z.toFixed(1),hw:a.hw&&+a.hw.toFixed(1),hd:a.hd&&+a.hd.toFixed(1),rot:+Math.atan2(a.s||0,a.c||1).toFixed(2),r:a.r})));
  const r=S.roadAt(x,z,6);console.log('   road',r&&r.e.name,r&&r.d.toFixed(1),'path pt',b.P[b.pi].map(v=>v.toFixed(1)).join(','),'next',b.P[b.pi+1].map(v=>v.toFixed(1)).join(','));
  S.traffic.filter(c=>Math.hypot(c.x-x,c.z-z)<18).forEach(c=>console.log('   traffic',c.x.toFixed(1),c.z.toFixed(1),'v',c.v.toFixed(1)))}})}
 if(!hit)console.log('trial',trial,'ok')}
