// Irbid Drive -> Roblox: the web game's SYNTHESISED sounds (12d_audio.js) rendered offline into ONE audio file (a sound atlas), because
// Roblox cannot synthesise audio from scripts (it has no oscillators or sample buffers) and limits audio uploads per month. Run from the
// repo root:  node tools/make_roblox_audio.js dist/irbid-drive.html
// Writes roblox/audio/IrbidDriveSounds.wav (mono, 22,050 Hz, 16-bit) and roblox/audio/AudioAtlas.lua (where each sound starts, how long it
// is, its base pitch; tools/make_roblox.js packs it into ReplicatedStorage.IrbidShared). The game plays each part with Sound.PlaybackRegion / LoopRegion and moves pitch and volume per frame like the web
// game (Client/CarAudio). Upload the WAV once (Creator Dashboard or Studio's Asset Manager) and put its ID in Config.AUDIO_ATLAS_ID.
// Contents, all from the web game's code:
//  - engine voice per engine layout (cylinders, bank layout, aspiration; 27 layouts used by the 217 cars): one 720-degree cycle of exhaust
//    pulses (engCycle, the web game's own function), as a band-limited periodic wave (normalised like a Web Audio PeriodicWave), played
//    at 3,000 rpm (25 Hz), then the web game's soft clip tanh(2.2 x) at full load (pre-gain 1.35) and at no load (0.45): 48 whole cycles
//    each, so they loop without a seam. The web game also varies each car a little inside its layout (a hash of the name): one variation
//    per layout here.
//  - the noise beds (filtered white / brown noise with the Web Audio biquad formulas): tyre squeal band, gravel, wind, road roll,
//    intake, rain, wet hiss, blow-off, overrun pops; the tones: tyre-squeal tone, turbo whistle, supercharger whine, EV motor,
//    starter motor, the player's horn (two square waves through a tanh clip and a band-pass), a traffic horn; the one-shots: crash,
//    glass, bump thump (the web game's exact formulas); the traffic car's engine voice (the web game's I4 cycle).
const fs=require('fs'),path=require('path');global.THREE=require(path.resolve('node_modules/three'));
const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
THREE.WebGLRenderer=class{constructor(){this.domElement={style:{},insertAdjacentElement(){}};this.shadowMap={}}setPixelRatio(){}setSize(){}render(){}};
const el=()=>({getContext:()=>new Proxy(noop,{get:(t,k)=>k==='measureText'?(q=>({width:String(q).length*14})):t[k]}),appendChild(){},remove(){},style:{},dataset:{},setAttribute(){},addEventListener(){},focus(){},blur(){},select(){},value:'',children:[],classList:{add(){},remove(){},toggle(){}},set innerHTML(v){},get innerHTML(){return''},querySelector:()=>el(),querySelectorAll:()=>[]});
global.document={getElementById:el,createElement:el,body:{appendChild(){}},head:{appendChild(){}}};global.window=global;
global.addEventListener=()=>{};global.innerWidth=1280;global.innerHeight=720;global.devicePixelRatio=1;
global.performance={now:()=>0};global.requestAnimationFrame=()=>{};global.setTimeout=()=>{};
const LS={};global.localStorage={getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=String(v)}};
const cl0=console.log;console.log=()=>{};
const html=fs.readFileSync(process.argv[2]||'dist/irbid-drive.html','utf8');
(0,eval)(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]+';global.__s={PORS,engProfile,engCycle}');
const S=global.__s,SR=22050;
// a deterministic noise source (the web game uses Math.random; a fixed seed keeps the file the same on every run)
let seed=20251022;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
// ---- Web Audio's biquad filters (the Audio EQ Cookbook formulas the spec uses) ----
function biquad(type,f,Q){const w=2*Math.PI*f/SR,c=Math.cos(w),s=Math.sin(w),a=s/(2*Q);let b0,b1,b2,a0,a1,a2;
 if(type==='lowpass'){b0=(1-c)/2;b1=1-c;b2=(1-c)/2}else if(type==='highpass'){b0=(1+c)/2;b1=-(1+c);b2=(1+c)/2}else{b0=a;b1=0;b2=-a}
 a0=1+a;a1=-2*c;a2=1-a;let x1=0,x2=0,y1=0,y2=0;return x=>{const y=(b0*x+b1*x1+b2*x2-a1*y1-a2*y2)/a0;x2=x1;x1=x;y2=y1;y1=y;return y}}
// Web Audio's lowpass / highpass Q is in dB (resonance); band-pass Q is the plain quality factor
const lpQ=qdb=>Math.pow(10,qdb/20);
const white=()=>rnd()*2-1;
function brownGen(){let l=0;return()=>{l=(l+.02*white())/1.02;return l*3.5}}
// a noise bed of `sec` seconds whose last 0.25 s is cross-faded into its start, so it loops without a click
function bed(sec,gen){const n=Math.round(sec*SR),xf=Math.round(.25*SR),buf=new Float32Array(n+xf);for(let i=0;i<n+xf;i++)buf[i]=gen();
 const out=new Float32Array(n);for(let i=0;i<n;i++)out[i]=buf[i];for(let i=0;i<xf;i++){const k=i/xf;out[i]=buf[i]*k+buf[n+i]*(1-k)}return out}
// band-limited oscillators (sums of harmonics below the Nyquist frequency, as Web Audio's oscillators are band-limited)
function osc(type,f,n,ph){const out=new Float32Array(n),H=Math.floor((SR/2-1)/f);for(let i=0;i<n;i++){const t=i/SR;let y=0;
  if(type==='sine')y=Math.sin(2*Math.PI*f*t);
  else for(let k=1;k<=H;k++){const s=Math.sin(2*Math.PI*k*f*t);if(type==='square'){if(k&1)y+=4/Math.PI*s/k}else if(type==='sawtooth')y+=2/Math.PI*(k&1?1:-1)*s/k;else if(type==='triangle'){if(k&1)y+=8/(Math.PI*Math.PI)*((k-1)/2&1?-1:1)*s/(k*k)}}
  out[i]=y}return out}
// ---- the engine voice of one layout ----
function engineWave(e){const c=S.engCycle(e,128),N=882*48,f=25,w=new Float32Array(882);let pk=0;   // one cycle at 25 Hz = 882 samples
 for(let j=0;j<882;j++){const ph=2*Math.PI*j/882;let y=0;for(let k=1;k<=128;k++)y+=c.re[k]*Math.cos(k*ph)+c.im[k]*Math.sin(k*ph);w[j]=y;pk=Math.max(pk,Math.abs(y))}
 for(let j=0;j<882;j++)w[j]/=pk||1;   // a Web Audio PeriodicWave is normalised to a peak of 1
 const mk=pre=>{const o=new Float32Array(N),k=Math.tanh(2.2);for(let i=0;i<N;i++)o[i]=Math.tanh(2.2*Math.max(-1,Math.min(1,pre*w[i%882])))/k;return o};
 return{on:mk(1.35),off:mk(.45),f}}
// ---- what goes into the atlas ----
const parts=[];const add=(name,data,o)=>parts.push(Object.assign({name,data},o||{}));
const codes=new Map();S.PORS.forEach((m,i)=>{const e=S.engProfile(i);if(e.ev)return;const k=e.lay+e.cyl+e.asp;if(!codes.has(k))codes.set(k,{lay:e.lay,cyl:e.cyl,asp:e.asp,n:0});codes.get(k).n++});
for(const[k,c]of[...codes].sort()){let h=2166136261;for(const ch of k){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}
 const w=engineWave({lay:c.lay,cyl:c.cyl,asp:c.asp,seed:h,ev:false});add('eng_'+k+'_on',w.on,{loop:true,rpm:3000});add('eng_'+k+'_off',w.off,{loop:true,rpm:3000})}
// the traffic car voice: the web game's I4 cycle with its fixed seed (12345), 64 harmonics
{const c=S.engCycle({lay:'I',cyl:4,asp:'n',seed:12345},64),N=882*48,w=new Float32Array(882);let pk=0;for(let j=0;j<882;j++){const ph=2*Math.PI*j/882;let y=0;for(let k=1;k<=64;k++)y+=c.re[k]*Math.cos(k*ph)+c.im[k]*Math.sin(k*ph);w[j]=y;pk=Math.max(pk,Math.abs(y))}
 const lp=biquad('lowpass',700,lpQ(1)),o=new Float32Array(N);for(let i=0;i<N*2;i++){const v=lp(w[i%882]/pk);if(i>=N)o[i-N]=v}add('traffic',o,{loop:true,rpm:3000})}
// noise beds at the web game's centre frequencies (the game moves the pitch with PlaybackSpeed where the web game moves the filter)
const bp=(f,Q,g)=>{const b=biquad('bandpass',f,Q);return()=>b(g())};
add('squeal',bed(2,bp(1000,7,white)),{loop:true,hz:1000});
add('gravel',bed(2,bp(1400,.8,white)),{loop:true,hz:1400});
add('wind',bed(3,bp(500,.6,white)),{loop:true,hz:500});
{const bg=brownGen(),l=biquad('lowpass',250,lpQ(.7));add('road',bed(3,()=>l(bg())),{loop:true,hz:250})}
add('intake',bed(2,bp(300,1.2,white)),{loop:true,hz:300});
{const h=biquad('highpass',900,lpQ(.5)),l=biquad('lowpass',7000,lpQ(.5));add('rain',bed(3,()=>l(h(white()))),{loop:true})}
add('wethiss',bed(2,bp(2400,.7,white)),{loop:true,hz:2400});
// one-shot noise bursts for the blow-off valve and overrun pops (the web game opens a gain on the band for a few tens of ms)
{const b=biquad('bandpass',2600,1.5),n=Math.round(.35*SR),o=new Float32Array(n);for(let i=0;i<n;i++){const t=i/SR;o[i]=b(white())*Math.exp(-t/.12)*(t<.03?1:1)}add('blowoff',o)}
{const b=biquad('bandpass',420,2),n=Math.round(.12*SR),o=new Float32Array(n);for(let i=0;i<n;i++){const t=i/SR;o[i]=b(white())*(t<.01?1:Math.exp(-(t-.01)/.02))}add('pop',o)}
// tones: 2 s each, whole cycles (seamless loops)
{const n=2*SR,a=osc('triangle',1050,n);add('squealtone',a,{loop:true,hz:1050})}
add('turbo',osc('sine',3000,2*SR),{loop:true,hz:3000});
add('super',osc('triangle',800,2*SR),{loop:true,hz:800});
{const n=2*SR,a=osc('sine',400,n),b=osc('triangle',1200,n),o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=a[i]+.25*b[i];add('ev',o,{loop:true,hz:400})}
{const n=2*SR,a=osc('sawtooth',150,n),l=biquad('lowpass',900,lpQ(1)),o=new Float32Array(n);for(let i=0;i<n*2;i++){const v=l(a[i%n]);if(i>=n)o[i-n]=v}add('starter',o,{loop:true,hz:150})}
// the player's horn: square 405 + 508 Hz -> tanh(3 x) -> band-pass 900 Hz (Q 0.8)
{const n=2*SR,a=osc('square',405,n),b=osc('square',508,n),f=biquad('bandpass',900,.8),o=new Float32Array(n);for(let i=0;i<n*2;i++){const v=f(Math.tanh(3*(a[i%n]+b[i%n])));if(i>=n)o[i-n]=v}add('horn',o,{loop:true})}
// a traffic horn (square 370 + 465 Hz; the game sets the distance low-pass and the pitch factor per car)
{const n=2*SR,a=osc('square',370,n),b=osc('square',465,n),o=new Float32Array(n);for(let i=0;i<n;i++)o[i]=(a[i]+b[i])*.5;add('trafhorn',o,{loop:true})}
// the impact one-shots, the web game's exact formulas (audBufs)
const mkShot=(len,fn)=>{const n=Math.floor(SR*len),o=new Float32Array(n);for(let j=0;j<n;j++)o[j]=fn(j/SR);return o};
{let lp=0;add('crash',mkShot(.8,t=>{lp+=(white()-lp)*.25;return(lp*1.4+.5*Math.sin(2*Math.PI*83*t)*Math.exp(-t*9)+.3*Math.sin(2*Math.PI*211*t+Math.sin(t*40))*Math.exp(-t*6))*Math.exp(-t*5.5)*(t<.004?t/.004:1)}))}
add('glass',mkShot(.6,t=>white()*Math.exp(-t*7)*(.4+.6*(Math.sin(2*Math.PI*3100*t)>.6?1:0))*(t<.002?t/.002:1)*.8));
add('thump',mkShot(.3,t=>Math.sin(2*Math.PI*(55+30*Math.exp(-t*20))*t)*Math.exp(-t*14)+white()*.25*Math.exp(-t*60)));
// ---- normalise each part to a common peak (the game sets the web game's levels as volumes), lay them out with 0.1 s gaps ----
const GAP=Math.round(.1*SR);let total=GAP;for(const p of parts){let pk=0;for(const v of p.data)pk=Math.max(pk,Math.abs(v));p.gain=pk>0?.9/pk:1;p.peak=pk;p.start=total;total+=p.data.length+GAP}
const pcm=new Int16Array(total);for(const p of parts)for(let i=0;i<p.data.length;i++)pcm[p.start+i]=Math.round(Math.max(-1,Math.min(1,p.data[i]*p.gain))*32767);
const wav=Buffer.alloc(44+pcm.length*2);wav.write('RIFF',0);wav.writeUInt32LE(36+pcm.length*2,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
wav.writeUInt32LE(SR,24);wav.writeUInt32LE(SR*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length*2,40);Buffer.from(pcm.buffer).copy(wav,44);
const OUT=path.resolve('roblox','audio');fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(OUT,'IrbidDriveSounds.wav'),wav);
// the index: start / length in seconds, loop flag, base rpm or centre frequency, and the level the part was normalised by (the game
// multiplies its volumes by `level` so the web game's relative loudness is kept)
const lua='-- Generated by tools/make_roblox_audio.js (do not edit): where each sound is in roblox/audio/IrbidDriveSounds.wav.\n'+
 '-- start, len (s), loop, rpm (engine voices: the rpm they were rendered at), hz (the centre frequency or tone), level (1 / the gain applied)\nreturn {\n'+
 parts.map(p=>`\t${p.name} = { start = ${(p.start/SR).toFixed(6)}, len = ${(p.data.length/SR).toFixed(6)}, loop = ${!!p.loop}${p.rpm?', rpm = '+p.rpm:''}${p.hz?', hz = '+p.hz:''}, level = ${(1/p.gain).toPrecision(6)} },`).join('\n')+
 '\n\tsampleRate = '+SR+',\n\tseconds = '+(total/SR).toFixed(3)+',\n}\n';
fs.writeFileSync(path.join(OUT,'AudioAtlas.lua'),lua);
cl0('sounds',parts.length,'(engine layouts',codes.size+')','·',(total/SR).toFixed(1),'s ·',(wav.length/1e6).toFixed(2),'MB ->',path.join(OUT,'IrbidDriveSounds.wav'));
