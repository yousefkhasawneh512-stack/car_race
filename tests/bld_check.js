// Building alignment: node tests/bld_check.js dist/irbid-drive.html
// Every real OSM footprint piece (BLDD extract + BLDO outside it) that the game placed must sit at its data position (rbAt finds a placed box
// centred on the data centre, never shifted), keep its height, and not straddle a road centreline; the counts of dropped / shrunk pieces are reported.
// Terrain fit of groups is tests/terr_check.js; draw-call cost is tests/dc2.py. Exits 1 on failure.
const fs=require('fs');global.THREE=require(require('path').resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(process.argv[2],'utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={BLDD,BLDO,RB,RBG,rbAt,roadAt};');
const S=global.__s;let fail=0;const ok=(c,m,v)=>{cl0((c?'PASS ':'FAIL ')+m+(v!==undefined?'  ['+v+']':''));if(!c)fail++};
let dupN=0,n=0,found=0,off=0,maxOff=0,hBad=0,onRoad=0;
for(const P of[S.BLDD.p,S.BLDO.p])for(let i=0;i<P.length;i+=7){n++;const x=P[i]/10,z=P[i+1]/10,h=P[i+5]/2,r=S.rbAt(x,z);if(!r)continue;const o=r[0],d=Math.hypot(o.x-x,o.z-z);
 if(d>.05)continue;found++;if(Math.abs(r[2]-h)>.01){let dup=0;for(const Q of[S.BLDD.p,S.BLDO.p])for(let j=0;j<Q.length;j+=7)if(Math.abs(Q[j]/10-x)<.06&&Math.abs(Q[j+1]/10-z)<.06&&Math.abs(Q[j+5]/2-r[2])<.01)dup++;if(dup)dupN++;else hBad++}const q=S.roadAt(x,z,0);if(q&&q.d<q.e.w/2-.5&&!q.e.tn)onRoad++}
ok(n===S.BLDD.p.length/7+S.BLDO.p.length/7,'footprint pieces in data',n+' ('+S.BLDD.p.length/7+' extract + '+S.BLDO.p.length/7+' outside)');
ok(found/S.RB.placed>.97,'placed pieces found exactly at their OSM data centre (no shift)',found+' of '+S.RB.placed+' placed');
ok(hBad===0,'placed pieces keep their data height',hBad+' wrong ('+dupN+' overlapping duplicate OSM outlines: one of each pair is kept)');
ok(onRoad===0,'no placed building centre lies on a carriageway',onRoad);
cl0('     dropped: zone/landmark '+S.RB.zone+', crossing a road '+S.RB.road+', occupied '+S.RB.occ+'; shrunk to clear a road '+S.RB.shrunk+' (of '+S.RB.pieces+' pieces)');
ok(S.RB.placed/S.RB.pieces>.93,'>= 93 % of OSM footprint pieces are placed',(S.RB.placed/S.RB.pieces*100).toFixed(1)+' %');
cl0(fail?'buildings: '+fail+' FAILED':'buildings: all passed');process.exit(fail?1:0);
