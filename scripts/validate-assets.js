// Validates assets/manifests/*.json: required fields, unique ids, licence fields, files exist, size + sha256 match, ODbL attribution present
// in the build, and reports large files in the repository. Exits 1 on any error.
// usage (repo root): node scripts/validate-assets.js [dist/irbid-drive.html]
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execSync}=require('child_process');
const DIR='assets/manifests',BUILD=process.argv[2]||'dist/irbid-drive.html';
const REQ=['id','category','display_name','source_url','creator','license_name','license_url','required_attribution','original_filename','local_destination',
 'file_format','file_size_bytes','sha256','commercial_use','modification','redistribution','verified','performance_tier','known_restrictions'];
const BOOL=['commercial_use','modification','redistribution','verified'];
let err=0,warn=0,n=0;const ids=new Set(),E=m=>{err++;console.log('ERROR '+m)},W=m=>{warn++;console.log('WARN  '+m)};
if(!fs.existsSync(DIR)){E(DIR+' missing (run node tools/gen_asset_manifests.js)');process.exit(1)}
const build=fs.existsSync(BUILD)?fs.readFileSync(BUILD,'utf8'):'';if(!build)W('build '+BUILD+' not found: attribution check skipped');
for(const f of fs.readdirSync(DIR).filter(f=>f.endsWith('.json'))){let j;try{j=JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'))}catch(e){E(f+': invalid JSON '+e.message);continue}
 if(!Array.isArray(j.assets)){E(f+': no assets array');continue}
 for(const a of j.assets){n++;const at=f+' '+(a.id||'?');
  for(const k of REQ)if(!(k in a))E(at+': missing field '+k);
  for(const k of BOOL)if(typeof a[k]!=='boolean')E(at+': '+k+' must be true/false');
  if(ids.has(a.id))E(at+': duplicate id');ids.add(a.id);
  if(!a.license_name)E(at+': no licence');
  if(a.license_name&&!/^Project code/.test(a.license_name)&&!a.license_url)E(at+': third-party asset without licence URL');
  if(a.license_name&&!/^Project code/.test(a.license_name)&&!a.source_url)E(at+': third-party asset without source URL');
  if(a.commercial_use===false||a.redistribution===false)W(at+': not cleared for commercial use / redistribution');
  if(!a.verified)W(at+': not verified');
  const p=String(a.local_destination||'').split(' ')[0];
  if(!p||!fs.existsSync(p)){E(at+': file missing: '+p);continue}
  const b=fs.readFileSync(p);if(a.file_size_bytes!==b.length)E(at+': size '+b.length+' != manifest '+a.file_size_bytes+' (re-run the generator)');
  if(a.sha256&&crypto.createHash('sha256').update(b).digest('hex')!==a.sha256)E(at+': sha256 mismatch (file changed; re-run the generator)');
  if(build&&/ODbL/.test(a.license_name)&&!/id="osmcr"[^>]*>Map data © <a href="https:\/\/www\.openstreetmap\.org\/copyright"/.test(build))E(at+': ODbL attribution (#osmcr) missing from the build');}}
// large tracked files (the single-file build is expected to be large; anything else over 1 MB is listed for review)
try{const big=execSync('git ls-files -z',{encoding:'utf8',maxBuffer:64<<20}).split('\0').filter(Boolean).map(p=>{try{return[p,fs.statSync(p).size]}catch(e){return[p,0]}}).filter(x=>x[1]>1<<20).sort((a,b)=>b[1]-a[1]);
 console.log('tracked files over 1 MB: '+big.map(([p,s])=>p+' '+(s/1048576).toFixed(1)+' MB').join(', '))}catch(e){W('git not available: large-file report skipped')}
console.log('validate-assets: '+n+' assets, '+err+' errors, '+warn+' warnings');process.exit(err?1:0);
