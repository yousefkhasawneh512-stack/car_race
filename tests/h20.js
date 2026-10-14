const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={setPlayerCar,rarityIdx,RMULT,RARN,TIERS,drift,buyPart,price,keys,RTIER,planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp,PACK_FAIL,PACK_OK,LAZYL,DZONES,PACK_LIST,driftZoneAt,navLabels,NEARLBL,GEN_FAIL,maximumIrbidPlaces};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};
const idx=n=>S.PORS.findIndex(m=>m[0]===n);
// 1) multipliers per car
for(const n of['Ford Focus RS','Toyota Corolla','Toyota AE86 Trueno','Dodge Charger','Tesla Model 3','Mazda RX-7 FD3S','Porsche 911','Lamborghini Urus','Nissan GT-R R35','Ford Mustang GT','Ferrari LaFerrari','Ford Fiesta ST'])S.setPlayerCar(idx(n)),console.log(n.padEnd(22),S.RARN[P.rt],'×'+P.rm);
// 2) score loop: same car, same inputs, multiplier 1 vs table values -> drift pts accumulated
function drive(rm){S.setPlayerCar(idx('Ford Focus RS'));P.rm=rm;S.drift.pts=0;S.drift.t=0;S.drift.off=0;S.drift.total=0;S.warp(5450,-120+108-0,-Math.PI/2);P.x=5450-0;P.z=-120+108;P.h=-Math.PI/2;
 const ks=S.keys;for(const k in ks)ks[k]=0;let peak=0;
 for(let f=0;f<420;f++){ks.KeyW=1;ks.ArrowUp=1;if(f>140){ks.KeyA=f%2?1:0;ks.Space=f>160?1:0}run(1);peak=Math.max(peak,S.drift.pts+S.drift.total)}
 for(const k in ks)ks[k]=0;run(90);return [S.drift.total,peak]}
const base=drive(1);console.log('rm 1.0 total',Math.round(base[0]));
for(const rm of[1.2,1.5,2,3]){const r=drive(rm);console.log('rm',rm,'total',Math.round(r[0]),'ratio',(r[0]/base[0]).toFixed(2))}
// 3) wheel odds / pools
console.log('wheel',S.TIERS.map(t=>t[0]+' '+(t[1]*100)+'% n='+t[3].length).join(' | '));
// 4) classification of the sports catalogue (not in the DB)
const out={};S.PORS.forEach((m,i)=>{const t=S.rarityIdx(i);(out[S.RARN[t]]=out[S.RARN[t]]||[]).push(m[0])});for(const k in out)console.log(k,out[k].length);
console.log('sports catalogue sample:',S.PORS.slice(0,S.NRACE).map(m=>m[0]+':'+S.RARN[S.rarityIdx(S.PORS.indexOf(m))][0]).join(', '));
// 5) shop still doubles
S.setPlayerCar(idx('Ford Focus RS'));S.drift.total=1e6;const pr=[0,1,2,3].map(i=>[1,2,3,4,5].map(c=>S.price(i,c-1)));console.log('prices',JSON.stringify(pr));
