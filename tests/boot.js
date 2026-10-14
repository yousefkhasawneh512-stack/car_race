const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
global.localStorage={getItem:()=>null,setItem(){}};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={FACI,BOXI,WINI,P,PLACES,EDGES,NODES,START,BANK,SHOP,CIRC,LIT,traffic,bots,scene,distName,roadAt,HOUSES,COL,CSVP,RDS,VSBY,STR,PARK,MALL,CCP,SC,RAMP0,DZONES,GEN_FAIL,PACK_FAIL,LM2_FAIL,FMP_FAIL,lampN:()=>lampN};';
const t0=Date.now();
try{(0,eval)(js)}catch(e){console.log('BOOT ERROR',e&&e.stack||e);process.exit(1)}
const S=global.__s;let nM=0,nIM=0,nInst=0;S.scene.traverse(o=>{nM++;if(o.isInstancedMesh){nIM++;nInst+=o.count}});
console.log('build ms',Date.now()-t0,'| nodes',nM,'| instanced meshes',nIM,'| instances',nInst,'| places',S.PLACES.length,'| houses',S.HOUSES.length);
for(let i=0;i<120;i++)cb(t+=16.667);
console.log('120 frames ok; P',Math.round(S.P.x),Math.round(S.P.z),'traffic',S.traffic.length,'bots',S.bots.length);
console.log('FACI',S.FACI.length,'BOXI',S.BOXI.length,'WINI',S.WINI.length);console.log('fails: gen',S.GEN_FAIL.length,'pack',S.PACK_FAIL.length,'lm2',S.LM2_FAIL.length,'fmp',S.FMP_FAIL.length);
console.log((S.GEN_FAIL.concat(S.PACK_FAIL,S.LM2_FAIL,S.FMP_FAIL)).slice(0,12).join('\n'));
{const g=new Map();S.scene.traverse(o=>{if(o.isInstancedMesh){const k=o.geometry.type+':'+o.geometry.attributes.position.count+':'+(o.material.type)+':'+(o.material.color?o.material.color.getHexString():'v');const a=g.get(k)||[0,0];a[0]++;a[1]+=o.count;g.set(k,a)}});
 console.log([...g.entries()].sort((a,b)=>b[1][1]-a[1][1]).slice(0,14).map(([k,v])=>k+' meshes '+v[0]+' inst '+v[1]).join('\n'))}
fs.writeFileSync('places_new.json',JSON.stringify(S.PLACES.map(p=>[p.name,Math.round(p.x),Math.round(p.z),p.kind])));
