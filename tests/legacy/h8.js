require('./hbase.js');
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)global.cb(global.t+=16.667)};
run(120);const l=S.LM.find(l=>l[0]==='Al-Balad souks');S.warp(l[1],l[2],0);S.startRace();run(60*57);
const b=S.bots[0];console.log('cpIdx',b.cpIdx.join(','),'pathlen',b.P.length);
for(let k=0;k<14;k++){run(30);const p=b.P[b.pi];console.log('t',k,'pos',b.x.toFixed(1),b.z.toFixed(1),'h',b.h.toFixed(2),'v',b.v.toFixed(1),'pi',b.pi,'pt',p.map(x=>x.toFixed(1)).join(','),'dist',Math.hypot(p[0]-b.x,p[1]-b.z).toFixed(1),'prog',b.prog,'aim',b.P[Math.min(b.pi+3,b.P.length-1)].map(x=>x.toFixed(0)).join(','))}
