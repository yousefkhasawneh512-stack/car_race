// v45 save-data checks: node tests/save_v45.js dist/irbid-drive.html  (each case boots the game with a prepared localStorage)
// A v44 save loads unchanged; numeric strings / NaN / negative junk are repaired; unknown cars and bad tune levels are dropped; a save that does
// not parse is copied to irbid-save-corrupt (never silently lost) and the game starts fresh; the written save keeps the old shape (+ sv marker).
const fs=require('fs');global.THREE=require(require('path').resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(process.argv[2],'utf8'),code=html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
let fail=0;const ok=(c,m,v)=>{cl0((c?'PASS ':'FAIL ')+m+(v!==undefined?'  ['+v+']':''));if(!c)fail++};
function boot(raw){const LS={};if(raw!==null)LS['irbid-save']=raw;global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};let seed=7;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 (0,eval)(code+';global.__s={get fines(){return fines},get spent(){return spent},get owned(){return owned},get cur(){return cur},get tune(){return tune},drift,save,fine,saveNote}');return{S:global.__s,LS}}
const v44={fines:1234,spent:200,owned:['Ford Focus RS','Porsche 911'],cur:'Porsche 911',dt:5678,tune:{'Porsche 911':[2,1,0,3]}};
{const{S,LS}=boot(JSON.stringify(v44));ok(S.fines===1234&&S.spent===200&&S.owned.join()==='Ford Focus RS,Porsche 911'&&S.cur==='Porsche 911'&&S.drift.total===5678&&S.tune['Porsche 911'].join()==='2,1,0,3','a v44 save loads unchanged');
 S.save();const w=JSON.parse(LS['irbid-save']);ok(w.fines===1234&&w.owned.length===2&&w.tune['Porsche 911'].join()==='2,1,0,3'&&w.sv===1,'written save keeps the v44 shape (+ sv marker)');ok(LS['irbid-save-prev']===JSON.stringify(v44),'previous good save kept as irbid-save-prev')}
{const{S}=boot(JSON.stringify({fines:'100',spent:'x',owned:['Porsche 911','Nope 9000',5,'Porsche 911'],cur:'Nope 9000',dt:'NaN',tune:{'Porsche 911':[9,'2',-3,1.6],'Nope':[1,1,1,1],'Ford Focus RS':'bad'}}));
 ok(S.fines===100&&typeof S.fines==='number'&&S.spent===0&&S.drift.total===0,'numeric strings repaired, junk numbers reset','fines '+JSON.stringify(S.fines)+' spent '+S.spent+' dt '+S.drift.total);
 ok(S.owned.join()==='Porsche 911'&&S.cur==='Porsche 911','unknown / duplicate / non-string cars dropped, current car falls back to an owned one',S.owned.join()+' / '+S.cur);
 ok(JSON.stringify(S.tune)==='{"Porsche 911":[5,2,0,2]}','tune levels clamped to integers 0-5, unknown cars and non-arrays dropped',JSON.stringify(S.tune));
 const f0=S.fines;S.fine('x',15,'t',0);ok(S.fines===f0+15,'fines add as numbers after repair (no "10015")',S.fines)}
{const bad='{"fines":12,"owned":["Porsche 9';const{S,LS}=boot(bad);ok(LS['irbid-save-corrupt']===bad&&S.owned.join()==='Ford Focus RS'&&S.fines===0&&/unreadable/.test(S.saveNote),'unparsable save: copied to irbid-save-corrupt, fresh start, player told',S.saveNote)}
{const{S}=boot(null);ok(S.owned.join()==='Ford Focus RS'&&S.cur==='Ford Focus RS'&&S.fines===0&&!S.saveNote,'no save: new game with the Ford Focus RS')}
cl0(fail?'save_v45: '+fail+' FAILED':'save_v45: all passed');process.exit(fail?1:0);
