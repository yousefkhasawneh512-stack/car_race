const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={SMK,PXP,GLR,fxBlur,fxTick,tl,drift,setPlayerCar,rarityIdx,RMULT,RARN,TIERS,drift,buyPart,price,keys,RTIER,planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp,PACK_FAIL,PACK_OK,LAZYL,DZONES,PACK_LIST,driftZoneAt,navLabels,NEARLBL,GEN_FAIL,maximumIrbidPlaces};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};
const idx=n=>S.PORS.findIndex(m=>m[0]===n);S.setPlayerCar(idx('Ford Focus RS'));

const ks=S.keys;
function runDrift(secs){S.warp(5450,-120+108,-Math.PI/2);P.x=5450;P.z=-12;P.h=-Math.PI/2;for(const k in ks)ks[k]=0;let maxS=0,maxG=0,maxScale=0,blurMax=0,sizes=[];
 for(let f=0;f<secs*60;f++){ks.KeyW=1;ks.ArrowUp=1;if(f>140){ks.KeyA=f%2?1:0;ks.Space=f>160?1:0}run(1);const vis=S.SMK.filter(s=>s.visible);maxS=Math.max(maxS,vis.length);maxG=Math.max(maxG,S.GLR.filter(g=>g.visible).length);blurMax=Math.max(blurMax,+S.fxBlur.style.opacity||0);if(vis.length)maxScale=Math.max(maxScale,...vis.map(s=>s.scale.x));if(f%60===0)sizes.push([f/60,+(S.drift.t).toFixed(1),vis.length,+(vis.length?Math.max(...vis.map(s=>s.scale.x)):0).toFixed(2)])}
 return{maxS,maxG,maxScale:+maxScale.toFixed(2),blurMax:+blurMax.toFixed(2),sizes}}
const r=runDrift(9);console.log(JSON.stringify(r));
// no drift: straight driving
S.warp(5450,-120+108,-Math.PI/2);for(const k in ks)ks[k]=0;let sm=0;for(let f=0;f<200;f++){ks.KeyW=1;run(1);sm=Math.max(sm,S.SMK.filter(s=>s.visible).length)}console.log('smoke when not drifting',sm,'speed',Math.round(Math.hypot(P.vx,P.vz)*3.6),'blur',S.fxBlur.style.opacity);
// blur threshold scales with upgrades
for(const lv of[[0,0],[5,5]]){const t=S.tl();t[0]=lv[0];t[1]=lv[1];console.log('levels',lv,'thr m/s',(26*(1+.05*lv[0])*(1+.06*lv[1])).toFixed(1))}
function fast(lv){const t=S.tl();t[0]=lv;t[1]=lv;S.warp(1000,-200,Math.PI/2);for(const k in ks)ks[k]=0;let bm=0,vm=0;for(let f=0;f<60*25;f++){ks.KeyW=1;ks.ArrowUp=1;run(1);const v=Math.hypot(P.vx,P.vz);vm=Math.max(vm,v);bm=Math.max(bm,+S.fxBlur.style.opacity||0)}return[Math.round(vm*3.6)+' km/h','blur max '+bm]}
console.log('lvl0',fast(0));console.log('lvl5',fast(5));
