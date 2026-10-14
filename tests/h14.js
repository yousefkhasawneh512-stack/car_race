const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={planRoute,navStart,navClear,NAV,navTick,navSearch,navGo,navResolve,snapAny,poiNear,inDrift,warp,PLACES,SHOWCARS,BREG,distName,SC,DZR,respawn,carMesh,MESHC,TRAFFIC_SPAWN,trafficZone,rollTraffic,TPOOL,PORS,NRACE,INC,P,CIRC,LM,streetName,colB,traffic,scene,cam,startRace,startDuel,race,bots,tryRob,heist,BANK,SHOP,START,updTraffic,keys,roadAt,NODES,EDGES,HOUSES,distName,hillH,groundH,riv:()=>riv,nearCar,toast,fines:()=>fines,spent:()=>spent,setF:v=>{fines=v},respawn,LIT,all,UL,uvOf,COL,houseNear,warp};';
const t0=Date.now();(0,eval)(js);
const S=global.__s,P=S.P,run=n=>{for(let i=0;i<n;i++)cb(t+=16.667)};

const names=['Arabella Mall','Arabella Mall','Al-Hassan Stadium Sports Complex','Al-Hassan Drift Zone','Wasfi Al-Tal Park','Al-Balad Local Barber & Hair Salon','Thalatheen Street Pet Supplies','Yarmouk University','Museum of Jordanian Heritage','Irbid National University','King Abdullah University Hospital','Jordan University of Science & Technology (JUST)','Jadara University','Apex Drift Customs','Bank'];
S.warp(S.START.x,S.START.z,S.START.h);run(30);
let bad=0;
for(const n of names){const it=S.navSearch(n)[0];if(!it){console.log('NO SEARCH',n);bad++;continue}const d=S.navResolve(it.it);const t=Date.now();const r=S.planRoute(P.x,P.z,d,Math.sin(P.h),Math.cos(P.h));if(!r){console.log('NO ROUTE',n);bad++;continue}
 const st=r.steps.length,straight=Math.hypot(d.x-P.x,d.z-P.z);console.log(n.padEnd(46),'route',(r.total/1000).toFixed(2),'km straight',(straight/1000).toFixed(2),'steps',st,(Date.now()-t)+'ms');
 if(r.total<straight-60){console.log('  SHORTER THAN STRAIGHT?!');bad++}}
// sample steps
const r=S.planRoute(P.x,P.z,S.navResolve(S.navSearch('Arabella Mall')[0].it),Math.sin(P.h),Math.cos(P.h));console.log(r.steps.map(x=>x.gl+' '+x.txt+' @'+Math.round(x.s)).join('\n'));
const r2=S.planRoute(P.x,P.z,S.navResolve(S.navSearch('Al-Hassan Stadium')[0].it),Math.sin(P.h),Math.cos(P.h));console.log('--- stadium');console.log(r2.steps.map(x=>x.gl+' '+x.txt+' @'+Math.round(x.s)).join('\n'));
// street search + 'wasfi at tal'
console.log('search "wasfi at-tal":',S.navSearch('wasfi at-tal').map(x=>x.it.n).join(' | '));
console.log('search "sicil":',S.navSearch('sicil').map(x=>x.it.n).join(' | '));
console.log('search "":',S.navSearch('').map(x=>x.it.n).join(' | '));
console.log('search "mall":',S.navSearch('mall').map(x=>x.it.n).join(' | '));
// drive-follow test: teleport along route, expect arrival
for(const n of ['Sameh Mall (Thaqafah Circle Branch)','Arabella Mall','Al-Hassan Stadium']){S.warp(S.START.x,S.START.z,S.START.h);run(5);S.navClear();S.navGo(n);const N=S.NAV;let arrived=false,i=0;
 for(let s=0;s<N.total+10&&!arrived;s+=14){const q=(function(){let j=0;while(j<N.cum.length-2&&N.cum[j+1]<s)j++;const t=(s-N.cum[j])/((N.cum[j+1]-N.cum[j])||1);return[N.pts[j][0]+(N.pts[j+1][0]-N.pts[j][0])*t,N.pts[j][1]+(N.pts[j+1][1]-N.pts[j][1])*t]})();
  P.x=q[0];P.z=q[1];P.vx=P.vz=0;run(2);if(!N.on){arrived=true}i++}
 console.log('follow',n,'arrived',arrived,'on',N.on)}
// off-route reroute
S.warp(S.START.x,S.START.z,S.START.h);run(5);S.navClear();S.navGo('Sameh Mall (Thaqafah Circle Branch)');const tot0=S.NAV.total;P.x+=300;P.z+=300;run(60*4);console.log('reroute: on',S.NAV.on,'total',Math.round(tot0),'->',Math.round(S.NAV.total));
console.log('bad',bad);
