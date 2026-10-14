const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp,PACK_FAIL,PACK_OK,LAZYL,DZONES,PACK_LIST,driftZoneAt,navLabels,NEARLBL,GEN_FAIL,maximumIrbidPlaces};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};
S.warp(S.START.x,S.START.z,S.START.h);run(30);
let bad=0;
for(const q of['oxygen','power house','gold','champion','iron body','glow','ecocharge','corner salon','shawerma reem','turbo garage','mosque','auditorium','football cage','overflow lot','pharmacy','post office','sweet house 3','supermarket box 4','school facility block 2','irbid city center','gym','charging','dealer']){
 const r=S.navSearch(q);if(!r.length){console.log('NO SEARCH',q);bad++;continue}
 const d=S.navResolve(r[0].it),pl=S.planRoute(S.START.x,S.START.z,d,Math.sin(S.START.h),Math.cos(S.START.h));console.log(q.padEnd(22),'->',r.slice(0,3).map(x=>x.it.name||x.it.n).join(' | '),'| route',pl?(pl.total/1000).toFixed(2)+'km':'NONE');if(!pl)bad++}
// passing + lazy label
const pick=['Oxygen Gym','EcoCharge Station Irbid','Corner Salon for Men','Shawerma Reem Irbid','Yarmouk Stadium Overflow Lot'];
for(const n of pick){const p=S.PLACES.find(q=>q.name===n);S.warp(p.tp?p.tp[0]:p.x,p.tp?p.tp[1]:p.z,0);run(5);P.x=p.x;P.z=p.z+ (p.r*.5);run(3);
 const np=S.poiNear();const lz=S.LAZYL.find(l=>l.sp&&l.lbl.t===n.toUpperCase());S.navLabels();const lz2=S.LAZYL.find(l=>l.sp&&l.lbl.t===n.toUpperCase());
 console.log('at',n,'-> passing',np&&np.name,'| lazy label',lz2?'rendered':'(custom sign)', '| inDrift',S.inDrift(P.x,P.z))}
console.log('lazy sprites now',S.LAZYL.filter(l=>l.sp).length,'/',S.LAZYL.length,'bad',bad);
