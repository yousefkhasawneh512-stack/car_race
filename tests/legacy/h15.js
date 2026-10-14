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
const want=['Nissan Irbid Showroom','Bergesh Cars Shop','Grand Omaya Restaurant','Sicilia Restaurant','Summit International Academy','Irbid City Center','Arabella Mall'];
for(const n of want){const p=S.PLACES.find(q=>q.name===n);const a=S.snapAny(p.ax??p.x,p.az??p.z);let dx=a.px-p.x,dz=a.pz-p.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;const back=n==='Irbid City Center'||n==='Arabella Mall'?l+95:l+34,hh=n==='Irbid City Center'?45:16;
 out.push({name:'p_'+n.split(' ')[0].toLowerCase()+(n.includes('Mall')?'mall':''),cam:[p.x+dx*back+dz*8,hh,p.z+dz*back-dx*8,p.x,(n==='Irbid City Center'?35:5),p.z,62],js:J.replace('%d',Math.round(p.x)).replace('%d',Math.round(p.z)),wait:500})}
for(const k of ['barber','pet']){const p=S.PLACES.find(q=>q.kind===k);const a=S.snapAny(p.x,p.z);let dx=a.px-p.x,dz=a.pz-p.z;const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;
 out.push({name:'p_'+k,cam:[p.x+dx*(l+11)+dz*3,4.2,p.z+dz*(l+11)-dx*3,p.x,3,p.z,60],js:J.replace('%d',Math.round(p.x)).replace('%d',Math.round(p.z)),wait:500})}
const SC=S.SC;out.push({name:'p_stadium_air',cam:[SC[0]+30,230,SC[1]-250,SC[0],0,SC[1],62],js:J.replace('%d',SC[0]).replace('%d',SC[1]),wait:500});
out.push({name:'p_drift_ring',cam:[SC[0],9,SC[1]-S.DZR-60,SC[0],5,SC[1]-S.DZR+20,70],js:J.replace('%d',SC[0]).replace('%d',SC[1]),wait:500});
require('fs').writeFileSync('plan_p.json',JSON.stringify(out));console.log(out.map(o=>o.name+' '+o.cam.map(Math.round)).join('\n'));
