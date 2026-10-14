const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={FMP_OK,FMP_SKIP,FMP_FAIL,planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp,PACK_FAIL,PACK_OK,LAZYL,DZONES,PACK_LIST,driftZoneAt,navLabels,NEARLBL,GEN_FAIL,maximumIrbidPlaces};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};
const fsx=require('fs');
const gp=S.PLACES.filter(p=>/\(Spot #/.test(p.name));let onRoad=0,far=0,byT={},ex=[];
for(const p of gp){const r=S.roadAt(p.x,p.z,60);const d=r&&(r.d!==undefined?r.d:r.dist);if(r&&d<r.e.road.w/2+3){onRoad++;if(ex.length<5)ex.push(p.name)}
 const t=p.name.replace(/ (Al-|Abu |Arafa)?.*\(Spot.*/,'');const st=(r&&(r.name||r.n))||'?';const k=p.sub.split(' · ')[0]+' @ '+st;byT[k]=(byT[k]||0)+1}
const ds=gp.map(p=>{const r=S.roadAt(p.x,p.z,80);return r?r.d:99}).sort((a,b)=>a-b);console.log('dist to centreline min/med/max',ds[0].toFixed(1),ds[ds.length>>1].toFixed(1),ds[ds.length-1].toFixed(1));console.log('generated',gp.length,'onRoad',onRoad,ex.join('|'));
const rr=S.roadAt(gp[0].x,gp[0].z,60);console.log(Object.keys(rr),rr.d,rr.dist,rr.t);
const byType={};for(const p of gp){const r=S.roadAt(p.x,p.z,80);const st=(r&&r.e&&r.e.road.name)||'?';const ty=p.name.split(' (Spot')[0].replace(/ (Al-[A-Za-z]+|Abu [A-Za-z]+|Arafa|Hamdan|[A-Z][a-z]+)$/,'');(byType[ty]=byType[ty]||{})[st]=(byType[ty][st]||0)+1}
for(const [k,v] of Object.entries(byType)){console.log(k.padEnd(28),Object.entries(v).sort((a,b)=>b[1]-a[1]).slice(0,4).map(e=>e.join(':')).join(', '))}
