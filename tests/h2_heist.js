const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={LM2_FAIL,LM2_OK,getFines:()=>fines,planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp,PACK_FAIL,PACK_OK,LAZYL,DZONES,PACK_LIST,driftZoneAt,navLabels,GEN_FAIL,maximumIrbidPlaces,NEARLBL};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};
let nIM=0,nInst=0,nM=0;S.scene.traverse(o=>{nM++;if(o.isInstancedMesh){nIM++;nInst+=o.count}});
console.log('build ms',Date.now()-t0,'| scene nodes',nM,'| instanced meshes',nIM,'| instances',nInst);
console.log('houses by tag',JSON.stringify(S.HOUSES.reduce((a,h)=>(a[h.tag]=(a[h.tag]||0)+1,a),{})),'total',S.HOUSES.length,'| colliders cells',S.COL.size);
run(300);console.log('300 frames finite:',[P.x,P.y,P.z].every(Number.isFinite),'start at',Math.round(P.x),Math.round(P.z),'street',S.streetName(),'|',S.distName(P.x,P.z));
const at=(x,z)=>{P.x=x;P.z=z;S.roadAt(x,z,0);return S.streetName()||S.distName(x,z)};
console.log(S.LM.map(l=>l[0]+' -> '+(()=>{P.x=l[1];P.z=l[2];P.y=0;const r=S.roadAt(l[1],l[2],6);return (r?r.e.name+' d='+r.d.toFixed(1):'OFF ROAD')+' | '+S.distName(l[1],l[2])})()).join('\n'));
// traffic sanity after warm-up
S.warp(S.START.x,S.START.z,S.START.h);run(60*30);
let on=0,bad=0,spd=0;S.traffic.forEach(c=>{if(!(Number.isFinite(c.x)&&Number.isFinite(c.z)))bad++;const r=S.roadAt(c.x,c.z,3);if(r&&r.d<=r.e.w/2+1)on++;spd+=c.v});
console.log('traffic',S.traffic.length,'on-road',on,'nonfinite',bad,'avg speed km/h',(spd/S.traffic.length*3.6).toFixed(1),'parked-offscreen',S.traffic.filter(c=>c.x>9e4).length);
// drive east on Baghdad Street for 20 s
S.warp(S.START.x,S.START.z,S.START.h);S.keys.KeyW=1;let x0=P.x;run(60*20);S.keys.KeyW=0;
const ri=S.roadAt(P.x,P.z,6);console.log('drive 20 s: dx',Math.round(P.x-x0),'speed',Math.round(Math.hypot(P.vx,P.vz)*3.6),'finite',[P.x,P.y,P.z].every(Number.isFinite),'on',ri&&ri.e.name,'fines',S.fines());
// collisions
S.warp(S.START.x,S.START.z,S.START.h);
const c1=S.CIRC[0];const o={x:c1.x+4,z:c1.z,vx:-5,vz:0};console.log('monument hit',S.colB(o));
let blds=0;for(const [k,L] of S.COL)blds+=L.length;console.log('collider refs',blds);
// race circuits
for(const nm of ['A','B','C']){const pos={A:[...S.LM.find(l=>l[0]==='Al-Balad souks').slice(1,3)],B:[...S.LM.find(l=>l[0]==='Abd Al-Hameed Sharaf Street').slice(1,3)],C:[...S.LM.find(l=>l[0]==='King Hussein Street (east)').slice(1,3)]}[nm];
 S.warp(pos[0],pos[1],0);S.startRace();const c=S.race.c;run(60*5);const a0=S.bots.map(b=>Math.round(b.v*3.6));run(60*40);
 console.log('race',c&&c.n,'state',S.race.s,'total cps',S.race.total,'| bots kmh',a0.join('/'),'->',S.bots.map(b=>Math.round(b.v*3.6)+'kmh prog'+b.prog+(Number.isFinite(b.x)?'':' NaN')).join(' | '));
 S.race.s='idle';}
// duel
S.warp(...[S.START.x,S.START.z,S.START.h]);run(60);S.traffic[0].x=P.x+3;S.traffic[0].z=P.z+1;const nc=S.nearCar();console.log('near car',!!nc);if(nc){S.startDuel(nc);run(60*20);const rv=S.riv();console.log('duel state',S.race.s,'rival v',rv&&Math.round(rv.v*3.6),'finite',rv&&Number.isFinite(rv.x))}
// heist probe
S.race.s='idle';S.warp(S.BANK.x,S.BANK.z,0);S.heist.cool=0;run(5);S.tryRob();console.log('start',S.heist.s,S.heist.cops.length);
for(let k=0;k<12;k++){S.warp(S.BANK.x,S.BANK.z,0);run(60*2);console.log(k*2+2,'s',S.heist.s,'cops',S.heist.cops.length,'catch',S.heist.catch&&S.heist.catch.toFixed?S.heist.catch.toFixed(1):S.heist.catch,'dists',S.heist.cops.map(c=>Math.round(Math.hypot(c.x-P.x,c.z-P.z))).join(','),'fines',S.fines())}
