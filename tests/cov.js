const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=f=>{};global.setTimeout=()=>{};
const html=fs.readFileSync(process.argv[2]||'new.html','utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={RA,YUC,JC,HC,INC,HUBS,inCover,COL,PLACES,OCC,BLDD,roadAt,onRoadFoot,BOXI,FACI,distName,inPoly,POLYS,MALL,PARK,SC,DZR,NETD};';
(0,eval)(js);const S=global.__s;
console.log('RA',JSON.stringify(S.RA));console.log('hubs',S.HUBS.map(h=>[h[0].map(Math.round),h[1],S.inCover(h[0][0],h[0][1])]).join(' | '));
console.log('polys',Object.keys(S.POLYS).join(','));
for(const k of Object.keys(S.POLYS)){const q=S.POLYS[k];let cx=0,cz=0;q.forEach(p=>{cx+=p[0];cz+=p[1]});console.log(k,Math.round(cx/q.length),Math.round(cz/q.length),'cover',S.inCover(cx/q.length,cz/q.length))}
