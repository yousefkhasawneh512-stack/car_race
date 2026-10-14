// physics audit harness: loads the real build, drives updP() with scripted inputs on open flat ground
const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};
global.localStorage={getItem:()=>null,setItem(){}};
const html=fs.readFileSync(process.argv[2]||'dist/irbid-drive.html','utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={updP,keys,PORS,applyTune,setPlayerCar,P,warp,drift,traffic,bots,heist,groundH,tune,RMULT};';
(0,eval)(js);
(0,eval)('colB=function(){return false};redLight=function(){};wrongWay=function(){return false};fine=function(){}');
const S=global.__s,P=S.P;S.traffic.length=0;S.bots.length=0;S.heist.cops.length=0;
const out={};
function reset(i,tuneLv){S.setPlayerCar(i);P.x=-8500;P.z=0;P.h=0;P.vx=P.vz=P.vy=0;P.y=P.pgh=S.groundH(P.x,P.z);P.gnd=true;P.pitch=0}
function sim(i,dtf,seq){reset(i);let tt=0,o={t100:null,t200:null,vmax:0,d100:null};const k=S.keys;let dist=0,v=0;
  const step=dtf;for(let n=0;n<seq.maxT/step;n++){const s=seq.input(tt,v);k.KeyW=s.w;k.KeyS=s.s;k.Space=s.hb;k.KeyA=k.KeyD=false;S.updP(step,false);tt+=step;v=Math.hypot(P.vx,P.vz)*3.6;dist+=Math.hypot(P.vx,P.vz)*step;
   if(o.t100===null&&v>=100){o.t100=tt;o.d100=dist}if(o.t200===null&&v>=200)o.t200=tt;o.vmax=Math.max(o.vmax,v);if(seq.stop&&seq.stop(tt,v))break}
  o.t=tt;o.dist=dist;o.v=v;return o}
const accel={maxT:90,input:()=>({w:true,s:false,hb:false})};
const names=['Ford Focus RS','Porsche 911','Lamborghini Aventador','Ford Model T','Ferrari F40'];
global.__x={S,sim,accel,reset};
module.exports={S,sim,accel,reset};
if(require.main===module){
 const rows=[];
 for(let i=0;i<S.PORS.length;i++){const m=S.PORS[i];const a=sim(i,1/60,accel);
   rows.push([m[0],m[1],m[2],+(a.t100||0).toFixed(2),+a.vmax.toFixed(0)]);}
 fs.writeFileSync(require('path').join(require('os').tmpdir(),'phys_rows.json'),JSON.stringify(rows));
 const dev=rows.map(r=>r[3]/r[2]);dev.sort((a,b)=>a-b);
 console.log('models',rows.length,'0-100 sim/spec ratio min/median/max',dev[0].toFixed(2),dev[dev.length>>1].toFixed(2),dev[dev.length-1].toFixed(2));
 const vr=rows.map(r=>r[4]/r[1]).sort((a,b)=>a-b);console.log('vmax(90s)/spec top ratio min/med/max',vr[0].toFixed(2),vr[vr.length>>1].toFixed(2),vr[vr.length-1].toFixed(2));
 console.log(rows.filter(r=>names.includes(r[0])||/Focus|Model T|911$|Aventador$/.test(r[0])).map(r=>r.join(' | ')).join('\n'));
}
