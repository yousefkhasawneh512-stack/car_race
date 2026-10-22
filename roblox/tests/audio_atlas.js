// Irbid Drive (Roblox) sound atlas check (roblox/audio/IrbidDriveSounds.wav + roblox/shared/AudioAtlas.lua, from tools/make_roblox_audio.js).
// Run from the repo root:  node roblox/tests/audio_atlas.js     Exits 1 on failure.
// Checks: a valid WAV; every part inside the file, separated by silence; every engine voice repeats exactly every 882 samples (25 Hz at
// 3,000 rpm: a seamless loop), the full-load voice is harsher (clipped) than the no-load one, and the 27 engine layouts are 27 different
// waveforms (cross-plane V8, flat-plane, boxer, rotary, diesel... sound different, as in the web game); the noise loops have no seam;
// the tones are at their frequency; the one-shots fade out.
const fs=require('fs'),path=require('path');
const R=path.join(__dirname,'..'),wav=fs.readFileSync(path.join(R,'audio','IrbidDriveSounds.wav')),lua=fs.readFileSync(path.join(R,'shared','AudioAtlas.lua'),'utf8');
let fail=0;const ok=(c,m,v)=>{console.log((c?'PASS ':'FAIL ')+m+(v!==undefined?'  ('+v+')':''));if(!c)fail++};
ok(wav.toString('ascii',0,4)==='RIFF'&&wav.toString('ascii',8,12)==='WAVE'&&wav.readUInt16LE(20)===1&&wav.readUInt16LE(22)===1&&wav.readUInt16LE(34)===16,'WAV header: PCM, mono, 16-bit',wav.readUInt32LE(24)+' Hz');
const SR=wav.readUInt32LE(24),n=wav.readUInt32LE(40)/2,pcm=new Int16Array(wav.buffer,wav.byteOffset+44,n),x=i=>pcm[i]/32767;
const parts={};for(const m of lua.matchAll(/^\t(\w+) = \{ start = ([\d.]+), len = ([\d.]+), loop = (true|false)(?:, rpm = (\d+))?(?:, hz = (\d+))?, level = ([\d.e+-]+) \},$/gm))
 parts[m[1]]={start:Math.round(+m[2]*SR),len:Math.round(+m[3]*SR),loop:m[4]==='true',rpm:+m[5]||0,hz:+m[6]||0,level:+m[7]};
const names=Object.keys(parts);ok(names.length>=70,'atlas index',names.length+' sounds, '+(n/SR).toFixed(1)+' s');
let inside=true,quiet=true;const sorted=names.map(k=>parts[k]).sort((a,b)=>a.start-b.start);
for(let i=0;i<sorted.length;i++){const p=sorted[i];if(p.start<0||p.start+p.len>n)inside=false;const gapEnd=i+1<sorted.length?sorted[i+1].start:n;for(let j=p.start+p.len+2;j<gapEnd-2;j++)if(pcm[j]!==0){quiet=false;break}}
ok(inside&&quiet,'every part inside the file, silence between parts');
const eng=names.filter(k=>/^eng_.*_on$/.test(k));
let seam=0,period=0,harsh=0;const sig=new Set();
for(const k of eng){const p=parts[k],q=parts[k.replace('_on','_off')];
 // exact period: sample j equals sample j + 882 everywhere
 let d=0;for(let j=0;j<p.len-882;j++)d=Math.max(d,Math.abs(pcm[p.start+j]-pcm[p.start+j+882]));if(d<=1)period++;
 // seam: the last sample flows into the first (same as any other step)
 const step=Math.abs(pcm[p.start]-pcm[p.start+p.len-1]);let mx=0;for(let j=1;j<882;j++)mx=Math.max(mx,Math.abs(pcm[p.start+j]-pcm[p.start+j-1]));if(step<=mx+1)seam++;
 // full load is clipped harder: crest factor (peak / RMS) lower than at no load
 const cf=s=>{let pk=0,ss=0;for(let j=0;j<882;j++){const v=pcm[s.start+j];pk=Math.max(pk,Math.abs(v));ss+=v*v}return pk/Math.sqrt(ss/882)};if(cf(p)<cf(q))harsh++;
 // a coarse signature of the waveform (16 points of one cycle)
 const sgn=[];for(let j=0;j<16;j++)sgn.push(Math.round(pcm[p.start+j*55]/2048));sig.add(sgn.join(','))}
ok(eng.length===27,'27 engine layouts, a full-load and a no-load voice each',eng.map(k=>k.slice(4,-3)).join(' '));
ok(period===eng.length,'engine voices repeat exactly every 882 samples (25 Hz at 3,000 rpm)',period+' of '+eng.length);
ok(seam===eng.length,'engine loops have no seam',seam+' of '+eng.length);
ok(harsh===eng.length,'full-load voice clipped harder than no-load',harsh+' of '+eng.length);
ok(sig.size===eng.length,'every engine layout has its own waveform',sig.size+' different of '+eng.length);
// noise loops: the step across the loop point is no bigger than the steps inside
let nseam=0,nloops=0;for(const k of['squeal','gravel','wind','road','intake','rain','wethiss']){const p=parts[k];if(!p)continue;nloops++;let mx=0;for(let j=1;j<p.len;j++)mx=Math.max(mx,Math.abs(pcm[p.start+j]-pcm[p.start+j-1]));if(Math.abs(pcm[p.start]-pcm[p.start+p.len-1])<=mx)nseam++}
ok(nloops===7&&nseam===7,'noise loops have no seam',nseam+' of '+nloops);
// tones: zero crossings per second = 2 x frequency
const zc=p=>{let c=0;for(let j=1;j<p.len;j++)if((pcm[p.start+j-1]<0)!==(pcm[p.start+j]<0))c++;return c/(p.len/SR)/2};
const tones=[['turbo',3000],['super',800],['squealtone',1050],['starter',150]].map(([k,f])=>[k,f,zc(parts[k])]);
ok(tones.every(([,f,z])=>Math.abs(z-f)/f<.03),'tones at their frequency',tones.map(([k,f,z])=>k+' '+z.toFixed(0)+'/'+f).join(', '));
// one-shots: the last tenth is much quieter than the first
const fade=p=>{const e=(a,b)=>{let s=0;for(let j=a;j<b;j++)s+=x(p.start+j)**2;return s/(b-a)};return e(p.len*.9|0,p.len)/(e(0,p.len*.1|0)||1)};
ok(['crash','glass','thump','blowoff','pop'].every(k=>parts[k]&&!parts[k].loop&&fade(parts[k])<.05),'one-shots fade out',['crash','glass','thump','blowoff','pop'].map(k=>k+' '+fade(parts[k]).toExponential(1)).join(', '));
console.log(`\n${fail?'FAILED':'ALL PASSED'} (${fail} failed)`);process.exit(fail?1:0);
