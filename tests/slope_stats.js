const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=f=>{};global.setTimeout=()=>{};global.localStorage={getItem:()=>null,setItem(){}};
const html=fs.readFileSync(process.argv[2]||'dist/irbid-drive.html','utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={TH,EDGES,PLACES,RA};';
(0,eval)(js);const S=global.__s;
const bins=[2,4,6,8,10,12,15,20,30],cnt=new Array(bins.length+1).fill(0);let tot=0,mx=0;const core=new Array(bins.length+1).fill(0);let totc=0;
for(const e of S.EDGES){for(let u=0;u+10<=e.len;u+=10){const a=S.TH(...ep(e,u)),b=S.TH(...ep(e,u+10));const g=Math.abs(b-a)/10*100;let k=0;while(k<bins.length&&g>bins[k])k++;cnt[k]+=10;tot+=10;mx=Math.max(mx,g);
  const p=ep(e,u);if(Math.hypot(p[0]-100,p[1]-100)<6000){core[k]+=10;totc+=10}}}
function ep(e,u){let lo=0;while(lo<e.cum.length-2&&e.cum[lo+1]<u)lo++;const t=(u-e.cum[lo])/((e.cum[lo+1]-e.cum[lo])||1);return[e.pts[lo][0]+(e.pts[lo+1][0]-e.pts[lo][0])*t,e.pts[lo][1]+(e.pts[lo+1][1]-e.pts[lo][1])*t]}
const lab=(c,T)=>bins.map((b,i)=>(i?bins[i-1]:0)+'-'+b+'%: '+(100*c[i]/T).toFixed(1)).concat(['>'+bins[bins.length-1]+'%: '+(100*c[bins.length]/T).toFixed(2)]).join(' | ');
console.log('ALL roads',(tot/1000).toFixed(0),'km; grade distribution (% of length):',lab(cnt,tot),'| max grade',mx.toFixed(1)+'%');
console.log('within 6 km of Al-Balad',(totc/1000).toFixed(0),'km:',lab(core,totc));
// terrain stats at key places
const names=['Irbid','Yarmouk','JUST','Jordan University of Science','Hospital','Stadium','Wasfi'];
for(const n of names){const p=S.PLACES.find(q=>new RegExp(n,'i').test(q.name));if(p)console.log(p.name,Math.round(p.x),Math.round(p.z),'TH',S.TH(p.x,p.z).toFixed(1),'(abs elevation ~'+(S.TH(p.x,p.z)+569.6).toFixed(0)+' m)')}
