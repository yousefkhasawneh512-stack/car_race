const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>noop,appendChild(){},remove(){},style:{},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const html=fs.readFileSync('/mnt/user-data/outputs/irbid-drive.html','utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={P,CIRC,LM,streetName,colB,AB,traffic,scene,cam,startRace,race,bots,tryRob,heist,BANK,updTraffic,isC,keys,rd,setF:v=>{fines=v},bal:()=>fines-spent};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};
let nIM=0,nInst=0;S.scene.traverse(o=>{if(o.isInstancedMesh){nIM++;nInst+=o.count}});
console.log('build ms',Date.now()-t0,'| scene objects',S.scene.children.length,'| instanced meshes',nIM,'| instances',nInst);
run(300);console.log('300 frames finite:',[P.x,P.y,P.z].every(Number.isFinite));
// visible-chunk estimate at start (camera far 1100 + chunk radius 520)
let vis=0,visI=0;S.scene.traverse(o=>{if(o.isInstancedMesh&&Math.hypot(o.position.x-P.x,o.position.z-P.z)<1100+520){vis++;visI+=o.count}});console.log('instanced meshes in range at start:',vis,'instances:',visI);
// street names
const at=(x,z)=>{P.x=x;P.z=z;return S.streetName()};
const probes=[[0,-600],[0,1900],[300,3.5],[-300,-400],[-100,150],[-50,100],[800,-500],[1000,200],[-500,800],[300,800],[50,1500],[0,1500],[0,800],[-300,0],[800,-100],[350,600],[2000,2000],[-60,0]];
console.log(probes.map(p=>'('+p+') '+at(p[0],p[1])).join('\n'));
// landmark list sanity: names near each landmark
console.log('landmarks:',S.LM.map(l=>l[0]+' -> '+at(l[1],l[2])).join(' | '));
// collisions
P.x=-50;P.z=3.5;
const hit=(x,z)=>S.colB({x,z,vx:-5,vz:0});
const c1=S.CIRC[1];console.log('monument hit',hit(c1[0]+1.5,c1[1]));
console.log('campus wall hit (x=11,z=450)',hit(11,450),'| side road open (x=11,z=400)',!hit(11,400),'| main gate road open (x=11,z=800)',!hit(11,800));
console.log('campus building hit',hit(350+19,1050),'| empty campus lawn free',!hit(350+40,1050+40));
// traffic slows near circles
P.x=0;P.z=1400;P.vx=P.vz=0;const c=S.traffic[0];c.axis='z';c.road=0;c.dir=1;c.s=1470;c.lane=-3.5;c.v=13;c.hold=0;c.x=-3.5;c.z=1470;
const others=S.traffic.filter(o=>o!==c);others.forEach(o=>{o.x=9e4;o.z=9e4;o.s=9e4});
for(let i=0;i<50;i++){S.updTraffic(c,1/60);}
console.log('car near circle: speed after 50 steps (m/s)',c.v.toFixed(2),'(cap 8)');
// ordinary drive on University Street (northbound) for 20 s
P.x=3.5;P.z=1400;P.h=Math.PI;P.vx=P.vz=P.vy=0;S.keys.KeyW=1;let z0=P.z;run(60*20);S.keys.KeyW=0;
console.log('drive north 20 s: dz',Math.round(P.z-z0),'speed kmh',Math.round(Math.hypot(P.vx,P.vz)*3.6),'finite',[P.x,P.y,P.z].every(Number.isFinite),'street:',S.streetName());
// race
P.x=-50;P.z=3.5;P.h=Math.PI/2;P.vx=P.vz=P.vy=0;S.startRace();run(900);console.log('race:',S.race.s,S.bots.map(b=>b.model+':'+Math.round(b.v*3.6)+(Number.isFinite(b.x)?'':':NaN')).join(' | '));
S.race.s='idle';
// heist
P.x=S.BANK.x;P.z=S.BANK.z;P.vx=P.vz=0;S.heist.cool=0;run(5);S.tryRob();const st0=S.heist.s;run(60*20);console.log('heist started:',st0,'| after 20 s still chasing:',S.heist.s,'| cops',S.heist.cops.length,'| all cop positions finite',S.heist.cops.every(k=>Number.isFinite(k.x)&&Number.isFinite(k.z)));
console.log('player finite at end',[P.x,P.y,P.z].every(Number.isFinite));
