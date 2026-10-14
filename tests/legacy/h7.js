require('./hbase.js');
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)global.cb(global.t+=16.667)};
run(120);const l=S.LM.find(l=>l[0]==='Al-Balad souks');S.warp(l[1],l[2],0);S.startRace();console.log('circuit',S.race.c.n,'cps',S.race.total,S.race.cpPos.map(p=>p.map(Math.round).join(',')).join(' '));
for(let s=0;s<14;s++){run(60*10);const off=S.bots.map(b=>{const r=S.roadAt(b.x,b.z,8);return r?r.d.toFixed(1):'OFF'});console.log((s+1)*10+'s',S.race.s,'prog',S.bots.map(b=>b.prog).join('/'),'fin',S.bots.map(b=>b.fin?1:0).join(''),'kmh',S.bots.map(b=>Math.round(b.v*3.6)).join('/'),'roadD',off.join('/'),'pos',S.bots.map(b=>Math.round(b.x)+','+Math.round(b.z)).join(' | '))}
