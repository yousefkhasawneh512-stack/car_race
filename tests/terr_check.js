// terrain conformance audit: every scene object must sit on the terrain (hillH). Usage: node tests/terr_check.js dist/irbid-drive.html
const fs=require('fs');global.THREE=require('three');
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},set textContent(v){}});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};let cb;global.requestAnimationFrame=f=>{cb=f};global.setTimeout=()=>{};global.localStorage={getItem:()=>null,setItem(){}};
const _M=THREE.Mesh,_IM=THREE.InstancedMesh;
THREE.Mesh=class extends _M{constructor(...a){super(...a);this.userData.__st=new Error().stack}};
THREE.InstancedMesh=class extends _IM{constructor(...a){super(...a);this.userData.__st=new Error().stack}};
const html=fs.readFileSync(process.argv[2]||'dist/irbid-drive.html','utf8');
const js=html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+'\n;global.__s={scene,TH,groundH,gnd:typeof gnd!=="undefined"?gnd:null,gp:typeof gp!=="undefined"?gp:null,PLACES,START,P,traffic};';
(0,eval)(js);
const S=global.__s,T=THREE;const rel=[];
const groups={};const SRC=[];
function add(name,d,x,z,o){if(x>9900&&z>9900&&x<10100&&z<10100)return;const g=groups[name]||(groups[name]={n:0,sum:0,min:1e9,max:-1e9,bad:0,ex:null});g.n++;g.sum+=d;if(d<g.min)g.min=d;if(d>g.max){g.max=d}
  if(Math.abs(S.TH(x,z))>12&&(d<-4||d>90)){g.bad++;if(!g.ex){g.ex=[Math.round(x),Math.round(z),+d.toFixed(1)];g.st=o&&o.userData&&o.userData.__st}}}
const v=new T.Vector3(),m4=new T.Matrix4();
S.scene.updateMatrixWorld(true);
S.scene.traverse(o=>{
  if(o===S.gnd)return;
  if(o.isInstancedMesh){const key='INST '+o.geometry.type+':'+(o.geometry.attributes.position.count)+' '+(o.material.type)+(o.material.color?' #'+o.material.color.getHexString():'');
    for(let i=0;i<o.count;i++){o.getMatrixAt(i,m4);m4.premultiply(o.matrixWorld);v.setFromMatrixPosition(m4);add(key,v.y-S.TH(v.x,v.z),v.x,v.z,o)}}
  else if(o.isMesh&&o.geometry&&o.geometry.attributes.position){const p=o.geometry.attributes.position,key='MESH '+o.geometry.type+':'+p.count+' '+o.material.type;
    const step=Math.max(1,Math.floor(p.count/400));for(let i=0;i<p.count;i+=step){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);add(key,v.y-S.TH(v.x,v.z),v.x,v.z,o)}}
});

const rows=Object.entries(groups).map(([k,g])=>[k,g.n,+(g.sum/g.n).toFixed(2),+g.min.toFixed(1),+g.max.toFixed(1),g.bad,g.ex,g.st]);
const SRCL=js.split('\n');const PARTS=fs.readdirSync('src/parts').filter(f=>f.endsWith('.js')).map(f=>[f,fs.readFileSync('src/parts/'+f,'utf8')]);
function where(st){if(!st)return'?';const out=[];for(const ln of st.split('\n').slice(1)){const m=ln.match(/at (\S+) .*<anonymous>:(\d+):\d+\)/)||ln.match(/at (\S+) .*:(\d+):\d+/);if(!m||/three|node_modules|node:/.test(ln))continue;const src=SRCL[+m[2]-1]||'';const key=src.trim().slice(0,70);let f='?';for(const [fn,txt] of PARTS)if(key&&txt.includes(key)){f=fn;break}out.push(m[1]+'@'+f);if(out.length>=3)break}return out.join(' < ')}
rows.sort((a,b)=>b[5]-a[5]);if(process.env.DBG)console.log(String(rows[0][7]).split("\n").slice(0,8).join("\n"));
console.log('groups',rows.length,'| groups with off-terrain items:',rows.filter(r=>r[5]>0).length);
for(const r of rows.filter(r=>r[5]>0).slice(0,40))console.log(r[5]+'/'+r[1],'meanΔ',r[2],'min',r[3],'max',r[4],'e.g.',JSON.stringify(r[6]),r[0].slice(0,70),'<=',where(r[7]));
// ground vs terrain
const gp=S.gp;let mx=0;for(let i=0;i<gp.count;i+=37){const x=S.gnd.position.x+gp.getX(i),z=S.gnd.position.z+gp.getZ(i);mx=Math.max(mx,Math.abs(gp.getY(i)-(S.TH(x,z)-.08)))}
console.log('ground mesh max |y-(hillH-.08)|',mx.toFixed(3));
// player/start
console.log('START',JSON.stringify(S.START),'terrain at start',S.TH(S.START.x,S.START.z).toFixed(2),'| P.y',S.P.y.toFixed(2),'groundH',S.groundH(S.P.x,S.P.z).toFixed(2));
let lo=1e9,hi=-1e9;for(const p of S.PLACES){const h=S.TH(p.x,p.z);lo=Math.min(lo,h);hi=Math.max(hi,h)}console.log('PLACES terrain range m',lo.toFixed(0),hi.toFixed(0));
{let a=0,b=0;S.scene.traverse(o=>{if(o.isMesh){a++;if(o.userData.__st)b++}});console.log('meshes',a,'with stack',b)}
