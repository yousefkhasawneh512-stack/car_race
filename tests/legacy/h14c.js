const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};

const names=['Corner Salon for Men','Al-Husun Historic Church Tower','Al-Saraya Museum Fortress Walls','Central Bank of Jordan - Irbid Branch'];
S.warp(S.START.x,S.START.z,S.START.h);run(30);
let bad=0;
for(const n of names){const it=S.navSearch(n)[0];if(!it){console.log('NO SEARCH',n);bad++;continue}const d=S.navResolve(it.it);const t=Date.now();const r=S.planRoute(P.x,P.z,d,Math.sin(P.h),Math.cos(P.h));if(!r){console.log('NO ROUTE',n);bad++;continue}
 const st=r.steps.length,straight=Math.hypot(d.x-P.x,d.z-P.z);console.log(n.padEnd(46),'route',(r.total/1000).toFixed(2),'km straight',(straight/1000).toFixed(2),'steps',st,(Date.now()-t)+'ms');
 if(r.total<straight-60){console.log('  SHORTER THAN STRAIGHT?!');bad++}}
console.log('search husun:',S.navSearch('husun').map(x=>x.it.n).join(' | '));console.log('search salon:',S.navSearch('salon').slice(0,3).map(x=>x.it.n).join(' | '));console.log('bad',bad);
