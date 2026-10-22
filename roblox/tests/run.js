// Irbid Drive (Roblox) headless test: loads roblox/IrbidDrive.rbxlx into the Luau engine stand-in (tests/rbxmock.luau) and plays
// tests/scenario.luau (server + one player: map, car, driving by GPS, drift, traffic, races, heist, shop, wheel, garage, saving).
// Needs the Luau command-line tools (https://github.com/luau-lang/luau/releases): luau.exe path in env LUAU or as the 1st argument.
//   node roblox/tests/run.js [path/to/luau(.exe)] [place.rbxlx]
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process');
const LUAU=process.argv[2]||process.env.LUAU||'luau',PLACE=process.argv[3]||path.join(__dirname,'..','IrbidDrive.rbxlx');
const xml=fs.readFileSync(PLACE,'utf8');
// ---- parse the place file (the subset tools/make_roblox.js writes) ----
const dec=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const re=/<Item class="([^"]+)" referent="[^"]*">|<\/Item>|<string name="Name">([^<]*)<\/string>|<bool name="([^"]+)">(true|false)<\/bool>|<ProtectedString name="Source"><!\[CDATA\[([\s\S]*?)\]\]><\/ProtectedString>/g;
const root={kids:[]},stack=[root];let m;
while((m=re.exec(xml))){const top=stack[stack.length-1];
 if(m[1]){const it={cls:m[1],name:m[1],props:{},kids:[]};top.kids.push(it);stack.push(it)}
 else if(m[0]==='</Item>')stack.pop();
 else if(m[2]!==undefined)top.name=dec(m[2]);
 else if(m[3])top.props[m[3]]=m[4]==='true';
 else if(m[5]!==undefined)top.src=m[5]}
if(stack.length!==1)throw Error('unbalanced place file');
const longStr=s=>{let eq='';while(s.includes(']'+eq+']'))eq+='=';return'['+eq+'['+'\n'+s+']'+eq+']'};
const lua=it=>'{cls='+JSON.stringify(it.cls)+',name='+JSON.stringify(it.name)+(Object.keys(it.props).length?',props={'+Object.entries(it.props).map(([k,v])=>k+'='+v).join(',')+'}':'')+
 (it.src!==undefined?',src='+longStr(it.src):'')+',kids={'+it.kids.map(lua).join(',')+'}}';
const mock=fs.readFileSync(path.join(__dirname,'rbxmock.luau'),'utf8'),scen=fs.readFileSync(process.env.SCEN||path.join(__dirname,'scenario.luau'),'utf8');
const bundle='local M = (function()\n'+mock+'\nend)()\n'+root.kids.map(k=>'M.build('+lua(k)+', game)\n').join('')+
 // NOTERRAIN=1: a place whose Workspace has no Terrain (the game must then build its ground from parts)
 (process.env.NOTERRAIN?'M.workspace.Terrain:Destroy()\nprint("(test without Terrain)")\n':'')+
 // TOUCH=1: a phone / tablet (the on-screen pads instead of the keyboard)
 (process.env.TOUCH?'game:GetService("UserInputService").TouchEnabled = true\nprint("(test on a touch device)")\n':'')+'\n'+scen;
const out=path.join(os.tmpdir(),'irbid_roblox_bundle.luau');fs.writeFileSync(out,bundle);
const t0=Date.now(),r=spawnSync(LUAU,[out],{encoding:'utf8',maxBuffer:64<<20});
process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
const fails=((r.stdout||'').match(/^FAIL /gm)||[]).length,passes=((r.stdout||'').match(/^PASS /gm)||[]).length;
console.log(`\n${passes} passed, ${fails} failed, luau exit ${r.status} (${((Date.now()-t0)/1000).toFixed(1)} s real time)`);
process.exit(fails||r.status||!passes?1:0);
