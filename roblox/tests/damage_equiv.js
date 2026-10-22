// Irbid Drive (Roblox) damage equivalence: the web game's damage, tyres and repairs (07c / 07d / 07h / 08d / 07f, the real build, headless)
// against the Roblox module (roblox/src/ReplicatedStorage/Modules/Damage.lua + CarPhysics.lua, run by the Luau CLI), on the SAME events:
//  A. impacts on walls and cars from every side and speed, a repeated contact, landings, speed bumps, engine overheating, in Cosmetic and
//     Full, on several cars: the whole damage record, the driving effects, the repair items with their prices and the full inspection
//  B. driving in Full mode (Arcade and Realistic, flat world): burnouts, slides, braking, impacts during the drive: tyre heat / wear /
//     punctures and the damage effects feeding back into the physics, every frame.
// The Luau side takes each car's numbers from the EXPORTED data (roblox/shared/Meta.lua). Run from the repo root after tools/make_roblox.js:
//   node roblox/tests/damage_equiv.js <luau.exe> [dist/irbid-drive.html]          Exits 1 on any difference.
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
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={updP,updPStep,keys,P,PORS,setPlayerCar,traffic,heist,bots,PTS,setHandling,WH,groundH,COL,TERR,all,ASSIST,SIMX,TSLIP,WX,'+
 'registerPlayerImpact,registerLanding,registerSpeedBumpImpact,damageEffects,currentDamageRecord,repairItems,repairPart,inspectRows,TYS,tyreReset,setMode:v=>{damageMode=v},setClock:v=>{clock=v},'+
 'clearRecords:()=>{for(const k in damageRecords)delete damageRecords[k]},setRiv:v=>{riv=v},engTick:(dt)=>damageTick(dt)}');
const S=global.__s,P=S.P,k=S.keys;S.traffic.length=0;S.heist.cops.length=0;S.bots.length=0;S.setRiv(null);S.all.length=0;S.all.push(P);
(0,eval)('toast=function(m){};save=function(){};fine=function(){};redLight=function(){};wrongWay=function(){return false};surfK=function(){return 1};checkSpeedBumpCrossing=function(){};driftZoneAt=function(){return null};diagTick=function(){};objectsTick=function(){};bumpVisual=function(){};dpTick=function(){}');
const WHN={on:false,steer:0,thr:0,brk:0,clu:0,hb:false,raw:0};S.WH.poll=()=>WHN;S.WH.ffb=()=>{};
S.COL.clear();for(let i=0;i<S.TERR.e.length;i++)S.TERR.e[i]=0;
const RIX=new Map();for(const m of fs.readFileSync(path.join(__dirname,'..','CAR_NAMES.md'),'utf8').matchAll(/^\| (\d+) \| [^|]+ \| ([^|]+) \|/gm))RIX.set(m[2].trim(),+m[1]);
const idx=n=>{const i=S.PORS.findIndex(m=>m[0]===n);if(i<0||!RIX.has(n))throw Error('no car '+n);return i};
function place(i,h){S.setPlayerCar(i);P.x=0;P.z=0;P.h=h||0;P.vx=0;P.vz=0;P.vy=0;P.y=P.pgh=S.groundH(0,0);P.gnd=true;P.al=0;P.h0=0;P.pitch=P.bp=P.br=0;
 Object.assign(S.PTS,{yr:0,dl:0,h0:0,gear:1,rpm:850,shift:0,spin:0,lim:0,hz:0,hv:0,pz:0,pv:0,rz:0,rv:0,idx:-1,man:0,req:0,deny:0,flock:0,absA:0,tcA:0,escA:0});
 Object.assign(S.TSLIP,{f:0,r:0,lock:0,spin:0,sa:0,af:0,ar:0});Object.assign(S.SIMX,{tt:false,bf:false,tT:24,bT:24,gk:1,bk:1});S.tyreReset()}
// a plain copy of the web record with the fields both sides keep
const rec=()=>{const s=S.currentDamageRecord(),o=JSON.parse(JSON.stringify(s));delete o._ok;return o};
const dfx=()=>{const f=S.damageEffects();return{maxSpeed:f.maxSpeed,accel:f.accel,steering:f.steering,grip:f.grip,brakes:f.brakes,lat:f.lat,pull:f.pull,vib:f.vib,limp:f.limp,roll:f.roll}};
// ---- A. events ----
const OB={wall:{type:'solid',hw:6,hd:6},car:{type:'vehicle'},post:{type:'structure',r:.3}};
function events(){const E=[];let tt=10;const ang=[0,.4,1.1,1.6,2.3,3.14,-.8,-1.6,-2.6];
 for(const[ai,a]of ang.entries()){for(const v of[3.5,8,14,22]){tt+=1;const h=.3*ai,nx=Math.sin(a),nz=Math.cos(a);E.push({k:'hit',v,ob:['wall','car','post'][(ai+Math.round(v))%3],nx,nz,x:ai*3+v,z:-ai*2,h,vx:-nx*v+Math.cos(h)*2,vz:-nz*v-Math.sin(h)*2,t:tt})}}
 E.push({k:'hit',v:12,ob:'wall',nx:1,nz:0,x:0,z:0,h:0,vx:-12,vz:0,t:tt+1},{k:'hit',v:12,ob:'wall',nx:1,nz:0,x:.5,z:0,h:0,vx:-12,vz:0,t:tt+1.2});   // the same contact: counted once
 E.push({k:'land',vy:-7,t:tt+3},{k:'land',vy:-13,t:tt+4},{k:'bump',speed:14,sev:.6,axle:0},{k:'bump',speed:20,sev:1.6,axle:1},{k:'bump',speed:25,sev:2.6,axle:0},{k:'eng',thr:1,secs:40},{k:'eng',thr:0,secs:20});
 return E}
const EV=events();
const CARS=['Ford Focus RS','Ford Mustang GT','Kia Picanto','Porsche 911','Porsche 550 Spyder','Toyota Hilux','Tesla Model 3','Ferrari F40'];
const A=[];
for(const car of CARS)for(const mode of[1,2]){const i=idx(car);S.clearRecords();S.setMode(mode);place(i);
 for(const e of EV){if(e.k==='hit'){S.setClock(e.t);P.x=e.x;P.z=e.z;P.h=e.h;P.vx=e.vx;P.vz=e.vz;S.registerPlayerImpact(e.v,OB[e.ob],e.nx,e.nz)}
  else if(e.k==='land'){S.setClock(e.t);S.registerLanding(e.vy)}else if(e.k==='bump')S.registerSpeedBumpImpact(e.speed,e.sev,e.axle);
  else if(e.k==='eng'){S.TYS.thr=e.thr;P.gnd=true;P.vx=P.vz=0;for(let f=0;f<e.secs*10;f++)S.engTick(.1)}}
 const items=S.repairItems().map(q=>({id:q.id,grp:q.grp,label:q.label,cond:q.cond,eff:q.eff,price:q.price}));const insp=S.inspectRows().map(q=>({id:q.id,cond:q.cond,price:q.price}));
 const r=rec(),fx=dfx();
 // one repair each kind, then the record again
 const rids=['z:fl','li:0','gl:0','p:bf','c:engine','s:0','t:0','rim:0'];for(const id of rids)S.repairPart(id);
 A.push({car,mode,rix:RIX.get(car),rec:r,fx,items,insp,rids,after:rec()})}
// ---- B. driving in Full mode ----
const KB=o=>({kb:o});
const DRV=[[60,KB({KeyW:1,KeyS:1})],[240,KB({KeyW:1})],[80,KB({KeyW:1,KeyA:1})],[60,KB({Space:1,KeyA:1})],[90,KB({KeyS:1})],[120,KB({KeyW:1,KeyD:1}),'hit'],[60,KB({KeyW:1,Space:1})],[150,KB({KeyW:1,KeyA:1})],[120,KB({KeyS:1})],[90,KB({KeyW:1,KeyS:1})]];
const B=[];
for(const[car,mode]of[['Ford Mustang GT',0],['Ford Mustang GT',1],['Kia Picanto',0],['Porsche 911',1],['Ford Focus RS',1],['Nissan Silvia S15 Spec-R',0]]){
 const i=idx(car);S.clearRecords();S.setMode(2);S.setHandling(mode);place(i);const tr=[];let f=0;
 for(const[n,inp,ev]of DRV)for(let q=0;q<n;q++){for(const kk in k)k[kk]=0;Object.assign(k,inp.kb);f++;
  if(ev==='hit'&&q===40){S.setClock(f/60+100);S.registerPlayerImpact(Math.hypot(P.vx,P.vz)*.6,OB.wall,-Math.sin(P.h),-Math.cos(P.h))}
  S.setClock(f/60+100);t+=1000/60;S.updPStep(1/60,false);const s=S.currentDamageRecord(),W=s.wheels;
  tr.push([P.h,P.vx,P.vz,P.x,P.z,W[0].tread,W[2].tread,W[0].temp,W[3].temp,W[2].health,S.TYS.burn?1:0])}
 B.push({car,mode,rix:RIX.get(car),trace:tr,rec:rec()})}
// ---- to Lua ----
const num=v=>{if(!Number.isFinite(v))throw Error('bad number '+v);return v.toPrecision(17)};
function lua(v){if(Array.isArray(v))return'{'+v.map(lua).join(',')+'}';if(v===null||v===undefined)return'nil';if(typeof v==='object')return'{'+Object.entries(v).map(([q,x])=>'['+JSON.stringify(q)+']='+lua(x)).join(',')+'}';
 if(typeof v==='string')return JSON.stringify(v);if(typeof v==='boolean')return String(v);return num(v)}
const luaInp=inp=>`{th=${inp.kb.KeyW?1:0},br=${inp.kb.KeyS?1:0},steer=${(inp.kb.KeyA?1:0)-(inp.kb.KeyD?1:0)},hb=${inp.kb.Space?'true':'false'}}`;
const caseA=A.map(c=>`{name=${JSON.stringify(c.car+' / '+(c.mode===2?'Full':'Cosmetic'))},mode=${c.mode},ci=${c.rix},rec=${lua(c.rec)},fx=${lua(c.fx)},items=${lua(c.items)},insp=${lua(c.insp)},rids=${lua(c.rids)},after=${lua(c.after)}}`).join(',\n');
const caseB=B.map(c=>`{name=${JSON.stringify(c.car+' / '+(c.mode?'Realistic':'Arcade')+' / Full damage, driving')},mode=${c.mode},ci=${c.rix},rec=${lua(c.rec)},trace={${c.trace.map(r=>'{'+r.map(num).join(',')+'}').join(',')}}}`).join(',\n');
const src=f=>fs.readFileSync(path.join(__dirname,'..','src','ReplicatedStorage','Modules',f),'utf8');
const harness=`
local Damage = (function()\n${src('Damage.lua')}\nend)()
local CarPhysics = (function()\n${src('CarPhysics.lua')}\nend)()
local Meta = (function()\n${fs.readFileSync(path.join(__dirname,'..','shared','Meta.lua'),'utf8')}\nend)()
local EV = ${lua(EV)}
local OB = { wall = { type = "solid", hw = 6, hd = 6 }, car = { type = "vehicle" }, post = { type = "structure", r = 0.3 } }
local DRV = {${DRV.map(([n,inp,ev])=>`{${n},${luaInp(inp)}${ev?',"'+ev+'"':''}}`).join(',')}}
local CA = {${caseA}}
local CB = {${caseB}}
local bad, worst = 0, 0
local DBG = ${process.env.DMGDBG?'true':'false'}
-- deep compare: numbers to 1e-9 (relative above 1), the rest exactly; the web record's arrays are 0-based -> Lua 1-based
local function cmp(a, b, path, out)
	if type(a) == "number" and type(b) == "number" then
		local e = math.abs(a - b) / math.max(1, math.abs(b))
		if e > out.e then out.e, out.at = e, path end
		return
	end
	if type(a) ~= type(b) then
		out.e, out.at = math.huge, path .. " (" .. type(a) .. " vs " .. type(b) .. ")"
		return
	end
	if type(a) == "table" then
		for k2, v in pairs(b) do cmp(a[k2], v, path .. "." .. tostring(k2), out) end
		for k2 in pairs(a) do
			if b[k2] == nil then out.e, out.at = math.huge, path .. "." .. tostring(k2) .. " (extra)" end
		end
		return
	end
	if a ~= b then out.e, out.at = math.huge, path .. " (" .. tostring(a) .. " vs " .. tostring(b) .. ")" end
end
local function report(name, out)
	if out.e > worst then worst = out.e end
	local ok = out.e < 1e-9
	if not ok then bad += 1 end
	print((ok and "PASS " or "FAIL ") .. name .. string.format("  (largest difference %.3g%s)", out.e, out.e > 0 and (" at " .. tostring(out.at)) or ""))
end
-- the Luau record without the fields the web game does not keep (none) and with the web game's names
local function plain(s)
	local o = table.clone(s)
	return o
end
for _, c in ipairs(CA) do
	local car = Meta.cars[c.ci]
	local s = Damage.newRecord(car)
	for _, e in ipairs(EV) do
		if e.k == "hit" then
			Damage.impact(s, car, c.mode, { v = e.v, ob = OB[e.ob], nx = e.nx, nz = e.nz, x = e.x, z = e.z, h = e.h, vx = e.vx, vz = e.vz, t = e.t })
		elseif e.k == "land" then
			Damage.landing(s, car, c.mode, e.vy, e.t)
		elseif e.k == "bump" then
			Damage.speedBump(s, car, c.mode, e.speed, e.sev, e.axle)
		elseif e.k == "eng" then
			for _ = 1, e.secs * 10 do Damage.engineTick(s, c.mode, e.thr, 0.1) end
		end
	end
	local out = { e = 0 }
	cmp(plain(s), c.rec, "record", out)
	report(c.name .. ": record after " .. #EV .. " events", out)
	out = { e = 0 }
	local F = Damage.effects(s, car, c.mode, {})
	cmp(F, c.fx, "effects", out)
	report(c.name .. ": driving effects", out)
	out = { e = 0 }
	cmp(Damage.repairItems(s, car), c.items, "items", out)
	report(c.name .. ": repair items and prices (" .. #c.items .. ")", out)
	out = { e = 0 }
	local ins = {}
	for i, q in ipairs(Damage.inspectRows(s, car)) do ins[i] = { id = q.id, cond = q.cond, price = q.price } end
	cmp(ins, c.insp, "inspection", out)
	report(c.name .. ": full inspection (" .. #c.insp .. " parts)", out)
	for _, id in ipairs(c.rids) do Damage.repairPart(s, car, id) end
	out = { e = 0 }
	cmp(plain(s), c.after, "repaired", out)
	report(c.name .. ": record after one repair of each kind", out)
end
local function TH() return 0 end
for _, c in ipairs(CB) do
	local car = Meta.cars[c.ci]
	local spec = { vm = car.vm, a0 = car.a0, bk = car.bk, hd = car.hd, ci = c.ci, pt = car.pt }
	local st = { x = 0, y = 0.12, z = 0, h = 0, vx = 0, vz = 0, vy = 0, gnd = true, al = 0 }
	local env = CarPhysics.newState()
	env.sfc, env.TH, env.frozen, env.mode = 1, TH, false, c.mode
	local s = Damage.newRecord(car)
	local T = Damage.newTyreState()
	local F = {}
	env.dfx = F
	env.burnout = function(th, thA, br, brA, hb, fs)
		return Damage.burnoutState(T, car, 2, th, thA, br, brA, hb, fs, { gnd = st.gnd, bk = spec.bk, a0 = spec.a0 }, 1, F.accel)
	end
	local f, out = 0, { e = 0 }
	local SC = { 1, 1, 1, 100, 100, 100, 100, 100, 100, 100, 1 }
	for _, sg in ipairs(DRV) do
		for q = 1, sg[1] do
			f += 1
			if sg[3] == "hit" and q == 41 then
				local v = math.sqrt(st.vx ^ 2 + st.vz ^ 2) * 0.6
				Damage.impact(s, car, 2, { v = v, ob = OB.wall, nx = -math.sin(st.h), nz = -math.cos(st.h), x = st.x, z = st.z, h = st.h, vx = st.vx, vz = st.vz, t = f / 60 + 100 })
			end
			local inp = sg[2]
			local n = CarPhysics.substeps(c.mode, 1 / 60)
			for _ = 1, n do
				Damage.effects(s, car, 2, F)
				local fs, ls = CarPhysics.step(st, spec, inp, env, 1 / 60 / n)
				Damage.tyreStep(T, s, car, 2, 1 / 60 / n, inp.th, inp.br, inp.hb, fs, ls, false, { gnd = st.gnd, h = st.h, al = st.al, a0 = spec.a0, vm = spec.vm, bk = spec.bk }, 1)
				st.x += st.vx / 60 / n
				st.z += st.vz / 60 / n
				if c.mode == 1 then CarPhysics.body(st, spec, env, 1 / 60 / n, false, fs) end
			end
			local W = s.wheels
			local mine = { st.h, st.vx, st.vz, st.x, st.z, W[1].tread, W[3].tread, W[1].temp, W[4].temp, W[3].health, T.burn and 1 or 0 }
			local r = c.trace[f]
			local fe = 0
			for qq = 1, #mine do
				local e = math.abs(mine[qq] - r[qq]) / SC[qq]
				if e > fe then fe = e end
				if e > out.e then out.e, out.at = e, "frame " .. f .. " field " .. qq end
			end
			-- how the difference grows: the first frame above 1e-13, then every 100 frames (a logic error jumps; rounding grows smoothly)
			if fe > 1e-13 and not out.first then out.first = f .. ":" .. string.format("%.2g", fe) end
			if DBG and f <= 2 then
				for qq = 1, #mine do print(string.format("    f%d field %d  luau %.17g  web %.17g", f, qq, mine[qq], r[qq])) end
			end
			if f % 100 == 0 then out.grow = (out.grow or "") .. string.format(" %d:%.1g", f, out.e) end
		end
	end
	print("  growth " .. tostring(out.first) .. " |" .. tostring(out.grow))
	report(c.name .. ": " .. f .. " frames (heading, velocity, position, tread, temperature, carcass, burnout)", out)
	out = { e = 0 }
	cmp(plain(s), c.rec, "record", out)
	report(c.name .. ": record after the drive", out)
end
print(string.format("RESULT %d failed, largest difference %.3g", bad, worst))
`;
const out=path.join(os.tmpdir(),'irbid_damage_equiv.luau');fs.writeFileSync(out,harness);
const r=spawnSync(LUAU,[out],{encoding:'utf8',maxBuffer:64<<20});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
// the cases must exercise what they claim (dents, torn parts, cracks, punctures, burnout, mechanical damage, overheating)
const F2=A.filter(c=>c.mode===2),bT=B.some(c=>c.trace.some(r=>r[10]===1));
const sanity=[['dents, torn-off parts, cracked glass, broken lights recorded',A.every(c=>c.rec.dents.length>0&&Object.values(c.rec.parts).some(v=>v>=1)&&c.rec.cracks.some(L=>L.length)&&c.rec.lights.some(Boolean))],
 ['Full mode: engine / suspension / steering damage and a puncture',F2.every(c=>c.rec.engine<100&&c.rec.susp.some(v=>v<100)&&c.rec.steer<100&&c.rec.wheels.some(w=>w.punct))],
 ['Cosmetic mode: no mechanical damage',A.filter(c=>c.mode===1).every(c=>c.rec.engine===100&&c.rec.steer===100&&c.rec.susp.every(v=>v===100))],
 ['engine overheats with a broken radiator',F2.some(c=>c.rec.engTemp>100)],['a burnout happens and tyres wear and heat while driving',bT&&B.every(c=>c.rec.wheels.some(w=>w.tread<100&&w.tmax>30))],
 ['the repeated contact is counted once',A.every(c=>c.rec.impacts===EV.filter(e=>e.k==='hit').length-1)]];
let sb=0;for(const[n,ok]of sanity){cl0((ok?'PASS ':'FAIL ')+'(web) '+n);if(!ok)sb++}
const fails=((r.stdout||'').match(/^FAIL /gm)||[]).length+sb,passes=((r.stdout||'').match(/^PASS /gm)||[]).length;
cl0(`\n${passes} passed, ${fails} failed, luau exit ${r.status}`);
process.exit(fails||r.status||!passes?1:0);
