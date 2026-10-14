require('./hbase.js');
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)global.cb(global.t+=16.667)};
run(120);const l=S.LM.find(l=>l[0]==='Al-Balad souks');
for(let trial=0;trial<6;trial++){S.race.s='idle';S.warp(l[1],l[2],0);S.startRace();const slow=[0,0,0];let found=false;
 for(let f=0;f<60*150&&!found;f++){run(1);S.bots.forEach((b,i)=>{if(b.v<1.5&&S.race.s==='run')slow[i]++;else slow[i]=0;if(slow[i]===180&&!found){found=true;
   console.log('trial',trial,'bot',i,'STUCK at t=',(f/60).toFixed(0),'s pos',b.x.toFixed(1),b.z.toFixed(1),'h',b.h.toFixed(2),'v',b.v.toFixed(2),'pi',b.pi,'prog',b.prog,'cap',b.vm.toFixed(1),'skill',b.skill);
   for(let k=-1;k<5;k++){const p=b.P[b.pi+k];if(p)console.log('  path',b.pi+k,p.map(x=>x.toFixed(1)).join(','),'d',Math.hypot(p[0]-b.x,p[1]-b.z).toFixed(1))}
   const hit={x:b.x,z:b.z,v:5};console.log('  colB at pos:',S.colB(hit),'moved',(hit.x-b.x).toFixed(2),(hit.z-b.z).toFixed(2));
   S.traffic.filter(c=>Math.hypot(c.x-b.x,c.z-b.z)<25).forEach(c=>console.log('  traffic',c.x.toFixed(1),c.z.toFixed(1),'v',c.v.toFixed(1)))}})}
 if(!found)console.log('trial',trial,'no stuck bots')}
