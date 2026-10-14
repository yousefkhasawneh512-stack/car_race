require('./hbase.js');
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)global.cb(global.t+=16.667)};
run(120);const l=S.LM.find(l=>l[0]==='Al-Balad souks');S.warp(l[1],l[2],0);S.startRace();run(60*150);
const b=S.bots.find(b=>b.prog===1)||S.bots[0];const i=S.bots.indexOf(b);
console.log('bot',i,'pos',b.x.toFixed(1),b.z.toFixed(1),'h',b.h.toFixed(2),'v',b.v.toFixed(2),'pi',b.pi,'prog',b.prog,'fin',b.fin);
for(let k=-2;k<6;k++){const p=b.P[b.pi+k];if(p)console.log(' path',b.pi+k,p.map(x=>x.toFixed(1)).join(','))}
const cars=S.traffic.filter(c=>Math.hypot(c.x-b.x,c.z-b.z)<30);cars.forEach(c=>console.log(' traffic',c.x.toFixed(1),c.z.toFixed(1),'v',c.v.toFixed(1),'hold',c.hold.toFixed(1)));
console.log('P',P.x.toFixed(0),P.z.toFixed(0),'dist to Q center',Math.hypot(b.x-S.CIRC[1].x,b.z-S.CIRC[1].z).toFixed(1));
