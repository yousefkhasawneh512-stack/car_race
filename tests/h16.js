const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={getFines:()=>fines,planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};

const SC=S.SC,DZR=S.DZR;
function drive(x,z,h,v,sec){S.warp(x,z,h);P.vx=Math.sin(h)*v;P.vz=Math.cos(h)*v;const f0=S.getFines();for(let i=0;i<sec*60;i++){cb(t+=16.667);if(i%30===0){P.vx=Math.sin(P.h)*v;P.vz=Math.cos(P.h)*v}}return S.getFines()-f0}
// Petra Street control: should be fined at 60 m/s
const f1=drive(2500,-250,Math.PI/2,45,3);console.log('Petra Street 162 km/h fines gained',f1);
// drift ring: same speed, no fines
const f2=drive(SC[0]-DZR,SC[1]-60,0,45,1.5);console.log('Drift ring 162 km/h fines gained',f2,'inDrift',S.inDrift(P.x,P.z),'player near',Math.round(P.x),Math.round(P.z));
// ring drivable by traffic? count traffic ever on drift edges
let onDrift=0;S.warp(SC[0],SC[1]-DZR-300,0);for(let i=0;i<60*20;i++){cb(t+=16.667);S.traffic.forEach(c=>{const r=S.roadAt(c.x,c.z,0);if(r&&r.e.kind==='drift')onDrift++})}console.log('traffic samples on drift edges',onDrift);
