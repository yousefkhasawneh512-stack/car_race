require('./hbase.js');
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)global.cb(global.t+=16.667)};
run(120);const l=S.LM.find(l=>l[0]==='Al-Balad souks');
for(let trial=0;trial<4;trial++){S.race.s='idle';S.warp(l[1],l[2],0);S.startRace();let stuck=null;const hist=[[],[],[]];
 for(let s=0;s<160;s+=5){run(300);S.bots.forEach((b,i)=>{hist[i].push([b.x,b.z,b.prog,b.pi])})}
 const summ=S.bots.map((b,i)=>{const h=hist[i],last=h.slice(-8);const cx=last.reduce((a,p)=>a+p[0],0)/8,cz=last.reduce((a,p)=>a+p[1],0)/8,spread=Math.max(...last.map(p=>Math.hypot(p[0]-cx,p[1]-cz))),pi0=last[0][3],pi1=last[7][3];return 'prog'+b.prog+(b.fin?'F':'')+' pi'+pi0+'->'+pi1+' spread'+Math.round(spread)});
 console.log('trial',trial,summ.join(' | '))}
