const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
const html=fs.readFileSync(process.argv[2],'utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={MALLx:()=>MALL,LM,roadAt,P,START,PLACES,RA,JC,HC,INC,YUC,PARK,MALL};';
(0,eval)(js);const S=global.__s;let bad=0;
for(const l of S.LM){const r=S.roadAt(l[1],l[2],6);const d=Math.hypot(l[1]-S.RA.balad[0],l[2]-S.RA.balad[1]);console.log(l[0].padEnd(44),'on road',!!r,'dist from Balad km',(d/1000).toFixed(1));if(!r)bad++}
console.log('MALL',JSON.stringify(S.MALLx()),JSON.stringify(S.PLACES.find(p=>p.name==='Arabella Mall')));console.log('tour stops',S.LM.length,'off-road',bad);
