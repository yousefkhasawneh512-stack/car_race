const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp,PACK_FAIL,PACK_OK,LAZYL,DZONES,PACK_LIST,driftZoneAt,navLabels,NEARLBL,GEN_FAIL,maximumIrbidPlaces};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};
const seen={};S.EDGES.forEach(e=>{});
const R=new Map();for(const e of S.EDGES){const r=R.get(e.name)||{n:e.name,k:e.kind,w:e.w,x0:1e9,x1:-1e9,z0:1e9,z1:-1e9,len:0};e.pts.forEach(p=>{r.x0=Math.min(r.x0,p[0]);r.x1=Math.max(r.x1,p[0]);r.z0=Math.min(r.z0,p[1]);r.z1=Math.max(r.z1,p[1])});r.len+=e.len;R.set(e.name,r)}
for(const r of R.values())if(r.k==='local'||r.k==='alley'||r.k==='main'||r.k==='petra'||r.k==='arch')console.log(r.n.padEnd(28),r.k.padEnd(6),'w'+r.w,'x',Math.round(r.x0),Math.round(r.x1),'z',Math.round(r.z0),Math.round(r.z1),'len',Math.round(r.len));
const pl=n=>{const p=S.PLACES.find(q=>q.name===n);return p?[Math.round(p.x),Math.round(p.z)]:null};
console.log('clock',pl('Clock Tower'),'souq',pl('Souq Al-Balad'),'saraya',pl('Al-Saraya Museum Fortress Walls'),'park',pl('Wasfi Al-Tal Park'),'ccp',pl('Irbid City Center'));
console.log('T263',JSON.stringify(S.NODES.T263&&[S.NODES.T263.x,S.NODES.T263.z]),'CIRC',JSON.stringify(S.CIRC&&S.CIRC.map(c=>[c.name||c[0],Math.round(c.x||c[1]),Math.round(c.z||c[2])]).slice(0,12)));
