const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={route,CIRC,LIT,NETD,WX0,WX1,WZ0,WZ1,LM2_FAIL,LM2_OK,getFines:()=>fines,planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp,PACK_FAIL,PACK_OK,LAZYL,DZONES,PACK_LIST,driftZoneAt,navLabels,GEN_FAIL,maximumIrbidPlaces,NEARLBL};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};
const E=S.EDGES,N=S.NODES,ids=Object.keys(N);
const km=k=>E.filter(k).reduce((s,e)=>s+e.len,0)/1000;
console.log('nodes',ids.length,'edges',E.length,'total km',km(()=>1).toFixed(0));
const hw={};E.forEach(e=>{hw[e.hw]=hw[e.hw]||[0,0,0];hw[e.hw][0]++;hw[e.hw][1]+=e.len/1000;hw[e.hw][2]+=e.w});
console.log(Object.entries(hw).map(([k,v])=>k+': '+v[0]+' edges '+v[1].toFixed(0)+' km medianW~'+(v[2]/v[0]).toFixed(1)).join('\n'));
console.log('one-way edges',E.filter(e=>e.ow).length,'bridges',E.filter(e=>e.br).length,'tunnels',E.filter(e=>e.tn).length,'ring edges',E.filter(e=>e.rb).length,'roundabouts(clustered)',S.CIRC.length,'signalised junctions',S.LIT.length);
// weak components
const par={};const find=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x]}return x};ids.forEach(i=>par[i]=i);E.forEach(e=>{par[find(e.a)]=find(e.b)});
const cs={};ids.forEach(i=>{const r=find(i);cs[r]=(cs[r]||0)+1});const sizes=Object.values(cs).sort((a,b)=>b-a);
console.log('weak components',sizes.length,'largest',sizes[0],'('+(100*sizes[0]/ids.length).toFixed(1)+'%)','next',sizes.slice(1,6).join(','));
const big=Object.keys(cs).find(r=>cs[r]===sizes[0]);const inBig=ids.filter(i=>find(i)===big);
console.log('dead ends (deg 1) in main network',inBig.filter(i=>N[i].deg===1).length,'| isolated pieces edges outside main',E.filter(e=>find(e.a)!==big).length);
// routing success among random nodes of the main component
let ok=0,fail=0,sumR=0;const R=(n)=>Math.floor(Math.random()*n);const near=inBig.filter(i=>Math.hypot(N[i].x+66,N[i].z+622)<6000);
for(let k=0;k<400;k++){const a=near[R(near.length)],b=near[R(near.length)];if(a===b)continue;const r=S.route(a,b);if(r){ok++;sumR+=r.reduce((s,t)=>s+t.e.len,0)/Math.max(1,Math.hypot(N[a].x-N[b].x,N[a].z-N[b].z))}else fail++}
console.log('random routes within 6 km of Al-Balad: ok',ok,'unroutable',fail,'(one-way sinks/sources) avg detour factor',(sumR/ok).toFixed(2));
// geometry: sharp joins at edge ends (angle between consecutive edges through degree-2 nodes) and sharp interior bends
let sharp=0,bends=0;const tang=(e,end)=>{const p=e.pts,n=p.length,a=end?p[n-1]:p[0],b=end?p[Math.max(0,n-2)]:p[Math.min(n-1,1)],l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return[(b[0]-a[0])/l,(b[1]-a[1])/l]};
for(const id of ids){const nd=N[id];if(nd.deg!==2)continue;const [e1,e2]=nd.inn;if(e1.rb||e2.rb)continue;const t1=tang(e1,e1.b===id?1:0),t2=tang(e2,e2.b===id?1:0);if(t1[0]*t2[0]+t1[1]*t2[1]>.5)sharp++}
E.forEach(e=>{for(let i=1;i<e.pts.length-1;i++){const a=e.pts[i-1],b=e.pts[i],c=e.pts[i+1],l1=Math.hypot(b[0]-a[0],b[1]-a[1]),l2=Math.hypot(c[0]-b[0],c[1]-b[1]);if(l1<3||l2<3)continue;if(((b[0]-a[0])*(c[0]-b[0])+(b[1]-a[1])*(c[1]-b[1]))/(l1*l2)<-.3)bends++}});
console.log('degree-2 joins turning >60deg (hairpins at way joins)',sharp,'| interior bends >107deg between >=3 m arms',bends);
// extent
let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;E.forEach(e=>e.pts.forEach(p=>{x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1])}));
console.log('extent x',x0|0,x1|0,'z',z0|0,z1|0,'=',((x1-x0)/1000).toFixed(1)+' x '+((z1-z0)/1000).toFixed(1)+' km | window',S.WX0|0,S.WX1|0,S.WZ0|0,S.WZ1|0);
// widths
console.log('widths m: motorway/trunk/primary/secondary/tertiary/residential/service',['motorway','trunk','primary','secondary','tertiary','residential','service'].map(h=>{const L=E.filter(e=>e.hw===h).map(e=>e.w).sort((a,b)=>a-b);return L.length?L[L.length>>1]:'-'}).join('/'));
