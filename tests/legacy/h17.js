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


const out=[];const J="()=>{cam.far=9000;cam.updateProjectionMatrix();scene.fog.near=900;scene.fog.far=5000;warp(%d,%d,0)}";
for(const [n,back,hh,ty] of [['Corner Salon for Men',26,7,4],['Al-Husun Historic Church Tower',60,22,18],['Al-Saraya Museum Fortress Walls',70,24,5],['Central Bank of Jordan - Irbid Branch',55,14,6]]){const p=S.PLACES.find(q=>q.name===n);const a=S.snapAny(p.x,p.z);let dx=a.px-p.x,dz=a.pz-p.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
 out.push({name:'n_'+n.split(' ')[0].toLowerCase(),cam:[p.x+dx*(l+back*.5)+dz*back*.5,hh,p.z+dz*(l+back*.5)-dx*back*.5,p.x,ty,p.z,62],js:J.replace('%d',Math.round(p.x)).replace('%d',Math.round(p.z)),wait:500})}
require('fs').writeFileSync('plan_n.json',JSON.stringify(out));console.log(out.map(o=>o.name+' '+o.cam.map(Math.round)).join('\n'));
