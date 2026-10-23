// Irbid Drive (Roblox): copy the finished Roblox project into a separate output folder (+ a zip), for the owner to open in Studio or share.
// Never writes inside roblox/. Run make_roblox.js first.  node tools/package_roblox.js [outDir]   (default: ~/Downloads/IrbidDrive_Roblox_Project)
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process');
const R=path.join(__dirname,'..','roblox'),OUT=path.resolve(process.argv[2]||path.join(os.homedir(),'Downloads','IrbidDrive_Roblox_Project'));
if(OUT.startsWith(path.resolve(R)))throw Error('the output folder must be outside roblox/');
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const cp=(a,b)=>fs.cpSync(path.join(R,a),path.join(OUT,b||a),{recursive:true});
for(const f of['IrbidDrive.rbxlx','default.project.json','README.md','CAR_NAMES.md','CONVERSION_PROGRESS.md','src','shared','data','catalog','audio','tests'])cp(f);
// the reports sit at the top of the package
for(const f of fs.readdirSync(path.join(R,'docs')))if(f.endsWith('.md'))cp(path.join('docs',f),f);
let n=0,bytes=0;(function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f),s=fs.statSync(p);if(s.isDirectory())walk(p);else{n++;bytes+=s.size}}})(OUT);
console.log('package',OUT,n,'files',(bytes/1e6).toFixed(1),'MB');
// zip next to the folder (Windows 10+ tar and Linux / macOS zip both write .zip)
const Z=OUT+'.zip';fs.rmSync(Z,{force:true});
const r=process.platform==='win32'?spawnSync('tar',['-a','-c','-f',Z,'-C',path.dirname(OUT),path.basename(OUT)],{encoding:'utf8'}):spawnSync('zip',['-qr',Z,path.basename(OUT)],{cwd:path.dirname(OUT),encoding:'utf8'});
if(r.status!==0)throw Error('zip failed: '+(r.stderr||r.error));
console.log('zip',Z,(fs.statSync(Z).size/1e6).toFixed(1),'MB');
