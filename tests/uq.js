const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const file=process.argv[2]||'new.html';
const html=fs.readFileSync(file,'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__v={CARV,PORS,finalizedUniqueVehicles,gameCarList,carVisMats,addNeon,scene,rarityIdx};';
(0,eval)(js);const V=global.__v;
const hues=new Set(),keys=new Set(),tri=new Set(),shp={};let n=0;
for(const v of V.CARV){n++;hues.add(v.hue[0]);keys.add(v.footprint.key);tri.add(v.hue[0]+'|'+v.graphics.pixelWidth+'x'+v.graphics.pixelHeight);shp[v.exhaustParticles.shapePattern]=(shp[v.exhaustParticles.shapePattern]||0)+1}
console.log('cars',n,'unique primary hues',hues.size,'unique footprint matrices',keys.size,'unique hue+WxH',tri.size,'WxH combos',new Set(V.CARV.map(v=>v.graphics.spriteDimensions)).size,JSON.stringify(shp));
const c={};for(const t in V.gameCarList)c[t]=V.gameCarList[t].length;console.log('tier counts',JSON.stringify(c),'particles/s by tier',[...new Set(V.CARV.map(v=>v.tier+':'+v.exhaustParticles.maxStreamParticles))].join(' '));
// every model can build its meshes
let ok=0;for(let i=0;i<V.PORS.length;i++){const g=new THREE.Group();V.addNeon(g,i,i%2==0);ok+=g.children.length>0}console.log('addNeon ok',ok,'/',V.PORS.length);
const a=V.CARV[0];console.log(a.model,a.graphics.primaryColor,a.graphics.accentGlowColor,a.graphics.spriteDimensions,a.exhaustParticles.shapePattern);
