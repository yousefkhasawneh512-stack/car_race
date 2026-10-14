const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={PLACES,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};
let nIM=0,nInst=0,nM=0;S.scene.traverse(o=>{nM++;if(o.isInstancedMesh){nIM++;nInst+=o.count}});
console.log('build ms',Date.now()-t0,'| scene nodes',nM,'| instanced meshes',nIM,'| instances',nInst);
console.log('houses by tag',JSON.stringify(S.HOUSES.reduce((a,h)=>(a[h.tag]=(a[h.tag]||0)+1,a),{})),'total',S.HOUSES.length,'| colliders cells',S.COL.size);
run(300);console.log('300 frames finite:',[P.x,P.y,P.z].every(Number.isFinite),'start at',Math.round(P.x),Math.round(P.z),'street',S.streetName(),'|',S.distName(P.x,P.z));
const at=(x,z)=>{P.x=x;P.z=z;S.roadAt(x,z,0);return S.streetName()||S.distName(x,z)};
console.log(S.LM.map(l=>l[0]+' -> '+(()=>{P.x=l[1];P.z=l[2];P.y=0;const r=S.roadAt(l[1],l[2],6);return (r?r.e.name+' d='+r.d.toFixed(1):'OFF ROAD')+' | '+S.distName(l[1],l[2])})()).join('\n'));

const TS=S.TRAFFIC_SPAWN;
// 1) pure roll statistics per rule
for(const z in TS.spawn_rules){const c=[0,0,0,0,0];for(let i=0;i<60000;i++)c[S.rollTraffic(z).tier]++;console.log('roll',z.padEnd(22),c.map(v=>(v/600).toFixed(1)).join(' / '),'expected',TS.spawn_rules[z].map(v=>(v*100).toFixed(0)).join(' / '))}
// 2) in the world: respawn traffic while the player sits in different places, tally by zone of the spawn point
const tally={};const names=S.TPOOL.map(a=>new Set(a));
let badTier=0;
const PL=n=>{const p=S.PLACES.find(q=>q.name===n||q.name.startsWith(n));return p?[p.x,p.z]:[0,0]};
for(const [nm,[x,z]] of [['Al-Balad',PL('Irbid Clock')],['University St',PL('Oxygen Gym')],['Petra St',PL('Eimar Irbid Park')],['Aidun',PL('Aidun')],['Thalatheen',PL('Power House Gym')],['Arabella',PL('Arabella')],['JUST',PL('Jordan University of Science')],['Jadara',PL('Jadara')],['INU',PL('Irbid National')]]){S.warp(x,z,0);
 for(let k=0;k<12;k++)for(const c of S.traffic){S.respawn(c);if(c.x>9e4)continue;const t=tally[c.zone]||(tally[c.zone]=[0,0,0,0,0]);t[c.tier]++;if(!names[c.tier].has(c.idx))badTier++;if(!c.m.parent)badTier+=1000}}
for(const z in tally){const t=tally[z],n=t.reduce((a,b)=>a+b,0);console.log('world',z.padEnd(22),'n='+String(n).padStart(5),t.map(v=>(100*v/n).toFixed(1)).join(' / '),'rule',(TS.spawn_rules[z]||[]).map(v=>(v*100).toFixed(0)).join(' / '))}
console.log('tier/model mismatches',badTier,'| distinct meshes cached',S.MESHC.size,'| scene nodes',(()=>{let n=0;S.scene.traverse(()=>n++);return n})());
// 3) sample list of rare models actually driving after a warm-up run in Petra
S.warp(...PL('Eimar Irbid Park'),0);for(const c of S.traffic)S.respawn(c);run(600);console.log('petra sample',S.traffic.slice(0,24).map(c=>S.PORS[c.idx][0].replace(/^(Toyota|Hyundai|Kia|Nissan) /,'')+'['+'CUREL'[c.tier]+']').join(', '));
console.log('traffic positions finite',S.traffic.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.z)));
