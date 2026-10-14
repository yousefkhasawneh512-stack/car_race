const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=f=>{};global.setTimeout=()=>{};
const html=fs.readFileSync(process.argv[2]||'new.html','utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={BLDD,PLACES,MALL};';
(0,eval)(js);const S=global.__s;
const pairs=[['Arabella Mall',/^Arabella Mall/],['Dar As Saraya Ottoman Museum',/Archaeological Museum/],["Arar's Cultural House (Beit Arar)",/^Arar House/],['The Nabulsi House (Beit Al-Nabulsi)',/^Nabulsi House/],['Eimar Irbid Park',/Emaar Irbid Park/],['Nissan Irbid Showroom',/^Nissan$/],['Irbid Clock Memorial Square',/Clock Tower Square/]];
for(const [pn,re] of pairs){const p=S.PLACES.find(q=>q.name===pn),r=S.BLDD.n.find(n=>re.test(n[2]));console.log(pn.padEnd(38),p?[p.x|0,p.z|0]:'-','real',r?[r[0]|0,r[1]|0]:'-','dist m',p&&r?Math.round(Math.hypot(p.x-r[0],p.z-r[1])):'-')}
console.log('MALL',JSON.stringify(S.MALL))
