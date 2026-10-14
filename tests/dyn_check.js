const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};global.localStorage={getItem:()=>null,setItem(){}};
const html=fs.readFileSync(process.argv[2]||'dist/irbid-drive.html','utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={scene,TH,groundH,P,traffic,bots,warp,keys,SHOWCARS,START,roadAt};';
(0,eval)(js);const S=global.__s;
for(let i=0;i<180;i++)cb(t+=16.667);
let bad=0,n=0,mx=0;for(const c of S.traffic){n++;const d=c.m.position.y-S.TH(c.m.position.x,c.m.position.z);mx=Math.max(mx,Math.abs(d));if(Math.abs(d)>1){bad++;if(bad<6)console.log('traffic off',c.m.position.x|0,c.m.position.z|0,d.toFixed(1))}}
console.log('traffic',n,'bad',bad,'max',mx.toFixed(2));
console.log('P',S.P.x|0,S.P.y.toFixed(2),'groundH',S.groundH(S.P.x,S.P.z).toFixed(2));
