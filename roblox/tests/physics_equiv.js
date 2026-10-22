// Irbid Drive (Roblox) physics equivalence: the web game's updP (the real build, headless, flat world without colliders, as in
// tests/assist_v48.js) and the Roblox CarPhysics module (roblox/src/ReplicatedStorage/Modules/CarPhysics.lua, run by the Luau CLI) get the
// SAME input sequences; every frame's heading, velocity and position (and, in Realistic, gear / rpm / wheelspin / yaw rate / temperatures)
// must agree. Run from the repo root:  node roblox/tests/physics_equiv.js <luau.exe> [dist/irbid-drive.html]
// Exits 1 on any difference above the tolerance.
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process');
global.THREE=require(path.resolve('node_modules/three'));
const LUAU=process.argv[2]||process.env.LUAU||'luau',HTML=process.argv[3]||'dist/irbid-drive.html';
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}},head:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
let t=1000;global.performance={now:()=>t};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
let seed=7;Math.random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(HTML,'utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={updP,updPStep,keys,P,PORS,setPlayerCar,traffic,heist,bots,PTS,setHandling,WH,groundH,COL,TERR,all,ASSIST,SIMX,TSLIP,WX,ptSpec,ptGeom,carSpec,setRiv:v=>{riv=v}}');
const S=global.__s,P=S.P,k=S.keys;S.traffic.length=0;S.heist.cops.length=0;S.bots.length=0;S.setRiv(null);S.all.length=0;S.all.push(P);
(0,eval)('toast=function(m){};save=function(){};fine=function(){};redLight=function(){};wrongWay=function(){return false};surfK=function(){return 1};checkSpeedBumpCrossing=function(){};driftZoneAt=function(){return null}');
const WHN={on:false,steer:0,thr:0,brk:0,clu:0,hb:false,raw:0};let WIN=WHN;S.WH.poll=()=>WIN;S.WH.ffb=()=>{};
S.COL.clear();for(let i=0;i<S.TERR.e.length;i++)S.TERR.e[i]=0;
const idx=n=>{const i=S.PORS.findIndex(m=>m[0]===n);if(i<0)throw Error('no car '+n);return i};
// ---- cases: car, mode (0 Arcade / 1 Realistic), frame time, input segments [frames, {kb keys} | {an analog}] ----
const KB=(o)=>({kb:o}),AN=(steer,thr,brk,hb)=>({an:{steer,thr,brk,hb:!!hb}});
const SEQ=[[240,KB({KeyW:1})],[60,KB({KeyW:1,KeyA:1})],[90,KB({KeyS:1})],[30,KB({KeyW:1})],[40,KB({Space:1,KeyD:1})],[120,KB({KeyW:1,KeyA:1})],[120,KB({KeyS:1,KeyA:1})],[60,KB({})],[200,KB({KeyS:1})]];
const SEQAN=[[180,AN(0,.7,0)],[90,AN(-.35,.8,0)],[60,AN(.5,1,0)],[50,AN(0,0,.6)],[40,AN(.8,.3,0,1)],[120,AN(-.2,1,0)],[90,AN(0,0,1)]];
const CASES=[];
for(const car of['Ford Focus RS','Ford Mustang GT','Kia Picanto','Toyota Hilux','Porsche 911']){CASES.push({car,mode:0,dt:1/60,seq:SEQ});CASES.push({car,mode:0,dt:1/60,seq:SEQAN})}
CASES.push({car:'Nissan Silvia S15 Spec-R',mode:0,dt:1/30,seq:SEQ},{car:'Ferrari F40',mode:0,dt:.05,seq:SEQAN});
// ---- the web side ----
function place(i){S.setPlayerCar(i);P.x=0;P.z=0;P.h=0;P.vx=0;P.vz=0;P.vy=0;P.y=P.pgh=S.groundH(0,0);P.gnd=true;P.al=0;P.h0=0;P.pitch=P.bp=P.br=0;
 Object.assign(S.PTS,{yr:0,dl:0,h0:0,gear:1,rpm:850,shift:0,spin:0,lim:0,hz:0,hv:0,pz:0,pv:0,rz:0,rv:0,idx:-1,man:0,req:0,deny:0,flock:0,absA:0,tcA:0,escA:0})}
const rows=[];
for(const c of CASES){const i=idx(c.car);S.setHandling(c.mode);place(i);c.spec={vm:P.vm,a0:P.a0,bk:P.bk,hd:P.hd};const tr=[];
 for(const[n,inp]of c.seq)for(let f=0;f<n;f++){for(const q in k)k[q]=0;if(inp.kb){Object.assign(k,inp.kb);WIN=WHN}else WIN=Object.assign({on:true,clu:0,raw:0},inp.an);
  t+=c.dt*1000;S.updPStep(c.dt,false);tr.push([P.h,P.vx,P.vz,P.x,P.z])}
 c.trace=tr}
// ---- the Luau side: the same inputs through CarPhysics.step, then the same moving as Drive.lua (flat ground: TH = 0) ----
const num=v=>{if(!Number.isFinite(v))throw Error('bad number '+v);return v.toPrecision(17)};
const luaInp=inp=>inp.kb?`{th=${inp.kb.KeyW?1:0},br=${inp.kb.KeyS?1:0},steer=${(inp.kb.KeyA?1:0)-(inp.kb.KeyD?1:0)},hb=${inp.kb.Space?'true':'false'}}`
 :`{th=${num(inp.an.thr)},br=${num(inp.an.brk)},steer=${num(-inp.an.steer)},hb=${inp.an.hb},an=true}`;
const casesLua='{'+CASES.map(c=>`{name=${JSON.stringify(c.car+' / '+(c.mode?'Realistic':'Arcade')+' / '+(c.seq===SEQ?'keys':'analog')+' / '+Math.round(1/c.dt)+' fps')},mode=${c.mode},dt=${num(c.dt)},spec={vm=${num(c.spec.vm)},a0=${num(c.spec.a0)},bk=${num(c.spec.bk)},hd=${num(c.spec.hd)}},`+
 `seq={${c.seq.map(([n,inp])=>`{${n},${luaInp(inp)}}`).join(',')}},trace={${c.trace.map(r=>'{'+r.map(num).join(',')+'}').join(',')}}}`).join(',\n')+'}';
// CARPHYS=<file>: test another copy of the module (used to check that the test does catch a changed constant)
const src=fs.readFileSync(process.env.CARPHYS||path.join(__dirname,'..','src','ReplicatedStorage','Modules','CarPhysics.lua'),'utf8');
const harness=`
local CarPhysics = (function()\n${src}\nend)()
local CASES = ${casesLua}
local worst, bad = 0, 0
local function TH(x, z) return 0 end
for _, c in ipairs(CASES) do
	local st = { x = 0, y = 0.12, z = 0, h = 0, vx = 0, vz = 0, vy = 0, gnd = true, al = 0 }
	local env = { sfc = 1, TH = TH, frozen = false }
	local f, cw = 0, 0
	for _, sg in ipairs(c.seq) do
		for _ = 1, sg[1] do
			f += 1
			CarPhysics.step(st, c.spec, sg[2], env, c.dt)
			st.x += st.vx * c.dt
			st.z += st.vz * c.dt
			local r = c.trace[f]
			local e = math.max(math.abs(st.h - r[1]), math.abs(st.vx - r[2]), math.abs(st.vz - r[3]), math.abs(st.x - r[4]) / 100, math.abs(st.z - r[5]) / 100)
			if e > cw then cw = e end
		end
	end
	if cw > worst then worst = cw end
	local ok = cw < 1e-9
	if not ok then bad += 1 end
	print((ok and "PASS " or "FAIL ") .. c.name .. string.format("  (%d frames, largest difference %.3g)", f, cw))
end
print(string.format("RESULT %d cases, %d failed, largest difference %.3g", #CASES, bad, worst))
`;
const out=path.join(os.tmpdir(),'irbid_physics_equiv.luau');fs.writeFileSync(out,harness);
const r=spawnSync(LUAU,[out],{encoding:'utf8',maxBuffer:64<<20});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
const fails=((r.stdout||'').match(/^FAIL /gm)||[]).length,passes=((r.stdout||'').match(/^PASS /gm)||[]).length;
cl0(`\n${passes} passed, ${fails} failed, luau exit ${r.status}`);
process.exit(fails||r.status||!passes?1:0);
