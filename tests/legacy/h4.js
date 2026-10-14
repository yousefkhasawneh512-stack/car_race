require('./hbase.js');
const NODES=global.__s.NODES;const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)global.cb(global.t+=16.667)};
run(120);S.warp(S.START.x,S.START.z,S.START.h);S.keys.KeyW=1;run(60*5);
const cars=S.traffic.filter(c=>Math.hypot(c.x-P.x,c.z-P.z)<20);
cars.forEach(c=>{const nd=c.Mk.filter(m=>m.i>=c.pi).slice(0,3).map(m=>m.id+'@'+Math.round(c.C[m.i]-c.C[c.pi])+(NODES[m.id]&&NODES[m.id].lit?'L':''));console.log('car',c.x.toFixed(1),c.z.toFixed(1),'h',c.h.toFixed(2),'v',c.v.toFixed(2),'hold',c.hold.toFixed(1),'stuck',c.stuck.toFixed(1),'pi',c.pi,'/',c.P.length,'lim',c.Lm[c.pi],nd.join(' '),'model',c.m&&c.m.children.length)});
console.log('player',P.x.toFixed(1),P.z.toFixed(1),P.h.toFixed(2),Math.hypot(P.vx,P.vz).toFixed(1));
