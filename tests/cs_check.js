const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={FMP_OK,FMP_SKIP,FMP_FAIL,planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,obb,occFree,inPark,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp,PACK_FAIL,PACK_OK,LAZYL,DZONES,PACK_LIST,driftZoneAt,navLabels,NEARLBL,GEN_FAIL,maximumIrbidPlaces};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};

const pts=JSON.parse(require('fs').readFileSync('csv_pts.json','utf8'));let road=0,bld=0,out=0,park=0,near=0,ok=0;const dd=[];
for(const [c,z,x,zz] of pts){if(x<-3400||x>8400||zz<-2600||zz>5600){out++;continue}
 const r=S.roadAt(x,zz,80);const d=r?r.d:999;dd.push(d);const rw=r?r.e.road.w/2:0;const onR=r&&d<rw+1;if(onR)road++;
 const inB=!S.occFree(S.obb(x,zz,2,2,0),0);if(inB)bld++;if(S.inPark&&S.inPark(x,zz,1))park++;if(!onR&&!inB)ok++;}
dd.sort((a,b)=>a-b);console.log('points',pts.length,'out',out,'onRoad',road,'inBuilding',bld,'inPark',park,'clear',ok,'dist road med',dd[dd.length>>1].toFixed(0),'p90',dd[Math.floor(dd.length*.9)].toFixed(0),'>80m',dd.filter(v=>v>=80).length);
