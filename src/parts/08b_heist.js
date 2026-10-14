// ---- bank heist ----
const heist={s:'idle',t:0,cops:[],catch:0,cool:0},heistEl=document.getElementById('heist'),lbR=new T.MeshBasicMaterial({color:0xff2020}),lbB=new T.MeshBasicMaterial({color:0x2060ff});
function mkCop(){const g=mkPorsche(PORS.findIndex(m=>m[0]==='Ford Crown Victoria'),1,0xf4f4f4),a=new T.Mesh(new T.BoxGeometry(.5,.14,.3),lbR),b=new T.Mesh(new T.BoxGeometry(.5,.14,.3),lbB);a.position.set(-.35,1.52,0);b.position.set(.35,1.52,0);g.add(a,b);return g}
function spawnCop(){const s=pickSeg(220,460);if(!s)return;const p=s.e.pts[s.i],c={x:p[0],z:p[1],h:Math.atan2(P.x-p[0],P.z-p[1]),v:0,prog:0,fin:false,skill:1,rad:1.3,vm:20,a0:6,cop:true,model:'Police',m:mkCop(),P:[],C:[],Lm:[],Mk:[],pi:0,th:0,direct:false};
 c.m.position.set(c.x,TH(c.x,c.z)+.12,c.z);heist.cops.push(c);all.push(c)}
function copThink(c,dt){if(Math.hypot(P.x-c.x,P.z-c.z)<28){c.direct=true;c.tx=P.x+P.vx*.4;c.tz=P.z+P.vz*.4;return}
 c.direct=false;c.th-=dt;if(c.th>0&&c.P.length>1&&c.pi<c.P.length-4)return;c.th=.8;
 const s=roadAt(c.x,c.z,14);if(!s){c.direct=true;c.tx=P.x;c.tz=P.z;return}
 const e=s.e,fwd=Math.sin(c.h)*s.tx+Math.cos(c.h)*s.tz,d=e.ow?1:(fwd>=0?1:-1),nodeAhead=d>0?e.b:e.a,tgt=nearNode(P.x+P.vx*1.2,P.z+P.vz*1.2),trs=[{e,d}];
 if(tgt&&tgt.id!==nodeAhead){const r=route(nodeAhead,tgt.id);if(r)trs.push(...r)}pathFromTravs(c,trs,d>0?s.i+1:e.pts.length-1-s.i)}
function tryRob(){if(ui||heist.s!=='idle'||Math.hypot(P.x-BANK.x,P.z-BANK.z)>14)return;if(race.s!=='idle'){toast('Finish the race first');return}if(clock<heist.cool){toast('The bank is closed for now');return}
 heist.s='chase';heist.t=120;heist.catch=0;toast('🚨 Bank robbed! Stay away from the police for 2:00')}
function endHeist(ok){heist.cops.forEach(c=>{scene.remove(c.m);const i=all.indexOf(c);if(i>=0)all.splice(i,1)});heist.cops=[];heist.s='idle';heist.cool=clock+180;
 if(ok){spent-=500;toast('Escaped! +500 JD — spend it on a wheel spin')}else{const l=Math.min(50,Math.max(0,fines-spent));spent+=l;P.vx*=.2;P.vz*=.2;toast('Busted! −'+l+' JD')}save()}
function updHeist(dt){const f=Math.floor(clock*6)%2;lbR.color.setHex(f?0xff2020:0x300000);lbB.color.setHex(f?0x000030:0x2060ff);if(heist.s!=='chase')return;heist.t-=dt;
 if(heist.cops.length<Math.min(8,4+Math.floor((120-heist.t)/25)))spawnCop();let near=false;
 for(const c of heist.cops){c.vm=P.vm*.85;c.a0=P.a0*.85;copThink(c,dt);updBot(c,dt);if(Math.hypot(c.x-P.x,c.z-P.z)<7)near=true}
 heist.catch=near?heist.catch+dt:Math.max(0,heist.catch-dt*2);if(heist.catch>=2.5)endHeist(false);else if(heist.t<=0)endHeist(true)}
function heistHud(){if(heist.s==='chase'){const m=Math.floor(heist.t/60),sc=Math.floor(heist.t%60);return '🚨 ROBBERY — survive '+m+':'+String(sc).padStart(2,'0')+' · cops '+heist.cops.length+' · caught '+Math.round(heist.catch/2.5*100)+'%'}
 if(heist.s==='idle'&&!ui&&Math.hypot(P.x-BANK.x,P.z-BANK.z)<14)return clock<heist.cool?'Bank closed — come back later':'Press E to rob the bank';return(!ui&&Math.hypot(P.x-SHOP.x,P.z-SHOP.z)<14)?'Press U for Apex Drift Customs':''}
