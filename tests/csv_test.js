const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={FMP_OK,FMP_SKIP,FMP_FAIL,planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,CSVP,CSVG,csvNear,csvDots,snapAny,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp,PACK_FAIL,PACK_OK,LAZYL,DZONES,PACK_LIST,driftZoneAt,navLabels,NEARLBL,GEN_FAIL,maximumIrbidPlaces};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};

const pts=JSON.parse(require('fs').readFileSync('csv_pts.json','utf8')).slice(1);let bad=0;
console.log('CSVP',S.CSVP.length,'PLACES',S.PLACES.length);
S.CSVP.forEach((p,i)=>{if(Math.abs(p.x-pts[i][2])>.06||Math.abs(p.z-pts[i][3])>.06)bad++});console.log('coord mismatches',bad);
console.log('sample',S.CSVP[0].name,S.CSVP[0].sub,'|',S.CSVP[5].name,'|',S.CSVP[S.CSVP.length-1].name);
let nf=0,nr=0,far=0,maxd=0;const R=[];for(let i=0;i<S.CSVP.length;i+=37)R.push(S.CSVP[i]);
for(const p of R){const sr=S.snapAny(p.x,p.z);if(!sr){nf++;continue}maxd=Math.max(maxd,sr.d);
 const q=S.navSearch(p.name);if(!q.length||q[0].it.n!==p.name){nr++;continue}
 const d=S.navResolve(q[0].it);let pl=null;try{pl=S.planRoute(S.START.x,S.START.z,d,Math.sin(S.START.h),Math.cos(S.START.h))}catch(e){}if(!pl)far++}
console.log('sampled',R.length,'no road snap',nf,'search miss',nr,'route fail',far,'max snap dist',maxd.toFixed(0));
const nm=S.CSVP.find(p=>p.kind==='gym'&&p.name.endsWith('#12'));console.log('search gym #12 ->',S.navSearch('irbid gym node 12').slice(0,2).map(o=>o.it.n+' @'+o.it.x+','+o.it.z));
for(const q of['barber','dry cleaning','tech shop','stadium','pet care','mall','supermarket','dukkan','corner salon']){console.log(q.padEnd(14),S.navSearch(q).slice(0,3).map(o=>o.it.n).join(' | '))}
const c=S.CSVP[1234];S.warp(c.x,c.z,0);run(5);S.P.x=c.x;S.P.z=c.z;run(3);console.log('standing on',c.name,'-> poiNear',S.poiNear()&&S.poiNear().name);
let t1=process.hrtime.bigint();for(let i=0;i<2000;i++)S.csvNear(c.x,c.z,25);console.log('csvNear us',Number(process.hrtime.bigint()-t1)/2000/1e3);
let n=0;const mp={fillRect(){n++},set fillStyle(v){}};t1=process.hrtime.bigint();for(let i=0;i<200;i++)S.csvDots(mp,x=>75+(x-S.P.x)*150/700,z=>75+(z-S.P.z)*150/700);console.log('csvDots us',Number(process.hrtime.bigint()-t1)/200/1e3,'dots',n/200);
