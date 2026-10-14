const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={FMP_OK,FMP_SKIP,FMP_FAIL,planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,obb,occFree,CSVP,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp,PACK_FAIL,PACK_OK,LAZYL,DZONES,PACK_LIST,driftZoneAt,navLabels,NEARLBL,GEN_FAIL,maximumIrbidPlaces};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};

const PL=S.PLACES;let onRoad=[],oob=[],dup=[],hasTp=0;
for(const p of PL){if(p.x<-3400||p.x>8400||p.z<-2600||p.z>5600)oob.push(p.name);
 const r=S.roadAt(p.x,p.z,40);if(r&&r.d<(r.e.w||r.e.road&&r.e.road.w||8)/2&&!/Circuit|Square|Roundabout|Ring|Zone|Park|Highway|Exit|Gate|Interchange|Stadium/i.test(p.name))onRoad.push([p.name,Math.round(p.x),Math.round(p.z),(r.e.name||""),+r.d.toFixed(1)])}
const g=new Map();for(const p of PL){const k=Math.round(p.x/4)+','+Math.round(p.z/4);(g.get(k)||g.set(k,[]).get(k)).push(p)}
for(const L of g.values())if(L.length>1)dup.push(L.map(p=>p.name+'@'+Math.round(p.x)+','+Math.round(p.z)).join(' || '));
console.log('places',PL.length,'oob',oob.length,'onRoad',onRoad.length,'sameCell',dup.length);
console.log(onRoad.slice(0,40).map(a=>a.join(' ')).join(String.fromCharCode(10)));console.log('--dups');console.log(dup.slice(0,40).join(String.fromCharCode(10)));
let ins=0,rd=0;for(const p of S.CSVP){const o=!S.occFree(S.obb(p.sx,p.sz,1.6,1.6,0),0);if(o)ins++;const q=S.roadAt(p.sx,p.sz,40);if(q&&q.d<(q.e.w||8)/2)rd++;}console.log('csv signs inside building',ins,'on road',rd,'moved',S.CSVP.filter(p=>Math.hypot(p.sx-p.x,p.sz-p.z)>.5).length);
