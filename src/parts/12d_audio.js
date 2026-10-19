// ---- v45: engine + world audio. Web Audio only, fully SYNTHESISED at run time: no recordings, no audio files, no network (nothing to license).
// Engine layout per car (cylinders, bank layout, aspiration, hybrid) comes from ENG_DOC: the commonly published engine family of that model
// (general knowledge, NOT cited per car; '?' = the game does not say which variant, the commonest/most recent one is used). Missing cars fall
// back to an estimate from body type + top speed (src 'estimate'). From the layout, ONE engine cycle (720 deg crank) of exhaust pulses is built
// (firing intervals, per-bank amplitude: cross-plane V8 burble, flat-plane rasp, unequal-length boxer rumble, rotary, diesel knock), a small
// per-car variation is hashed from the name, and the cycle becomes a PeriodicWave played at rpm/120 Hz. RPM, gear, load, wheelspin come from
// the Realistic gearbox (PTS) or, in Arcade, from a sound-only gearbox on the same per-car ratios. Nodes are built ONCE on the first user
// gesture (autoplay policy); per frame only AudioParams move. These are generated approximations, not recordings of the real cars.
const ENG_DOC=(()=>{const o={},add=(s,pre)=>s.split('|').forEach(e=>{const[n,c]=e.split(':');o[(pre||'')+n]=c});
 add('550 Spyder:F4n|911:F6t|912:F4n|914:F4n|924:I4n|928:V8n|944:I4n|959:F6t|968:I4n|Boxster:F4t?|Cayman:F4t?|Carrera GT:V10n|Cayenne:V6t?|Panamera:V8t?|Macan:V6t?|918 Spyder:V8n+|Taycan:E|904 GTS:F4n|906:F6n|917:F12n|935:F6t|956:F6t|962:F6t|Mission X:E|Cayenne Turbo:V8t','Porsche ');
 add('Miura:V12n|Countach:V12n|Diablo:V12n|Murciélago:V12n|Aventador:V12n|Revuelto:V12n+|350 GT:V12n|400 GT:V12n|Islero:V12n|Espada:V12n|Jarama:V12n|Urraco:V8n|Silhouette:V8n|Jalpa:V8n|LM002:V12n|Gallardo:V10n|Huracán:V10n|Temerario:P8t+|Urus:V8t|Sesto Elemento:V10n|Reventón:V12n|Veneno:V12n|Centenario:V12n|Sián FKP 37:V12n+|Countach LPI 800-4:V12n+','Lamborghini ');
 add('Model T:I4n|Model A:I4n|Mustang:V8n?|GT40:V8n|GT:V6t|Thunderbird:V8n|Escort:I4n|Focus:I4n?|Fiesta:I3t?|F-150:V8n?|Bronco:V6t?|Taurus:V6n|Crown Victoria:V8n|Sierra:I4n|Capri:V6n?|Cortina:I4n|Mondeo:I4n?|Falcon:I6n|Fairlane:V8n|Galaxie:V8n|Explorer:V6n?|Expedition:V6t|Ranger:I4d?|Maverick:I4t?|Puma:I3t|Focus RS:I4t|Fiesta ST:I3t?|Mustang GT:V8n|Taurus SHO:V6t|F-150 Raptor:V6t|Fusion Hybrid:I4n+|Escape Hybrid:I4n+','Ford ');
 add('125 S:V12n|250 GTO:V12n|250 GT California Spyder:V12n|Testarossa:F12n|F40:P8t|F50:V12n|Enzo:V12n|LaFerrari:V12n+|Dino 246 GT:V6n|365 GTB/4 Daytona:V12n|288 GTO:P8t|458 Italia:P8n|488 GTB:P8t|F8 Tributo:P8t|296 GTB:V6t+|SF90 Stradale:P8t+|Roma:P8t|Portofino:P8t|812 Superfast:V12n|12Cilindri:V12n|Purosangue:V12n|Monza SP1:V12n|Daytona SP3:V12n|FXX-K:V12n+|599 GTB Fiorano:V12n|360 Modena:P8n|488 Spider:P8t|F8 Spider:P8t|SF90 Spider:P8t+','Ferrari ');
 add('Toyota Prius:I4n+|Toyota Camry Hybrid:I4n+|Toyota Corolla:I4n?|Toyota Yaris:I4n?|Toyota Hilux:I4d?|Toyota RAV4 Hybrid:I4n+|Hyundai Avante:I4n|Hyundai Elantra:I4n|Hyundai Accent:I4n|Hyundai Sonata Hybrid:I4n+|Hyundai Ioniq Hybrid:I4n+|Hyundai Tucson:I4n?|Hyundai Santa Fe:I4n?|Kia Sephia:I4n|Kia Picanto:I3n?|Kia Cerato:I4n|Kia Forte:I4n|Kia Optima:I4n|Kia K5 Hybrid:I4n+|Kia Niro:I4n+|Kia Sportage:I4n?|Kia K3 EV:E|Nissan Sunny:I4n|Nissan Altima:I4n|Nissan Leaf EV:E|Chevrolet Spark:I4n?|Mitsubishi Lancer:I4n|Mitsubishi L200:I4d|Volkswagen ID.4:E|Volkswagen ID.6:E|BYD Song Plus EV:E|BYD Qin Plus:I4n+?|Changan Eado EV:E|Changan Alsvin:I4n|Geely Geometry C:E|MG 4 EV:E|MG 5:I4n');
 add('Mercedes-Benz E-Class W211:V6n?|Mercedes-Benz C-Class W203:I4s?|BMW 3 Series E46:I6n?|BMW 5 Series E60:I6n?|Honda Civic:I4n?|Honda Accord:I4n?|Peugeot 206:I4n|Opel Astra:I4n?|GMC Envoy:I6n|Toyota Land Cruiser LC200:V8n?|Toyota Prado:V6n?|Toyota Highlander Hybrid:V6n+?|Lexus RX Hybrid:V6n+?|Kia Sorento:V6n?|Hyundai Palisade:V6n|Nissan Patrol:V8n|Nissan Rogue:I4n|Dodge Charger:V8n?|Dodge Challenger:V8n?|Chevrolet Tahoe:V8n|Jeep Grand Cherokee:V6n?|Tesla Model 3:E|Tesla Model Y:E|BMW X5:I6t?|Audi A4:I4t?|Audi A6:V6t?|Mercedes-Benz S-Class W221:V8n?|Range Rover Sport:V8s?|Land Rover Defender:I6t?|BYD Han EV:E|BYD Seal:E|Zeekr 001:E|Hongqi HS5:I4t|GAC Emkoo:I4t?|Mazda 3:I4n?|Subaru Impreza:U4n?|Renault Duster:I4n?|Suzuki Swift:I4n?|Skoda Octavia:I4t?|Volkswagen Golf Mk7:I4t?|Seat Leon:I4t?|Fiat 500:I4n?');
 add('Mercedes-AMG G63:V8t|Mercedes-AMG GT:V8t|BMW M3 G80:I6t|BMW M4 G82:I6t|BMW i8:I3t+|Audi R8 V10:V10n|Maserati Ghibli:V6t?|Aston Martin Vantage:V8t|Bentley Continental GT:W12t?|Rolls-Royce Ghost:V12t|Rolls-Royce Cullinan:V12t|Chevrolet Corvette C8:V8n|Lotus Emira:V6s?|Nissan GT-R R35:V6t|Toyota Supra Mk5:I6t|Alfa Romeo Giulia Quadrifoglio:V6t|Classic Mercedes 280SEL W108:I6n|BMW E36 M3 (Drift Spec):I6n|Mazda MX-5 Miata NA:I4n|Ford Mustang Foxbody:V8n|Toyota AE86 Trueno:I4n|Nissan 350Z (Z33):V6n|Subaru BRZ / Toyota GT86:U4n|Nissan Silvia S15 Spec-R:I4t|Nissan Skyline GT-R R34 (RWD):I6t|Mazda RX-7 FD3S:R2t|Toyota Supra JZA80:I6t');
 return o})();
const AUD_LUX=/Rolls-Royce|Bentley|S-Class|Range Rover|Lexus|Hongqi/,AUD_LVL={r:1,m:.9,q:.9,c:.8,o:.8,h:.7,s:.68,p:.62,v:.6},AUD_LPF={r:5200,m:3800,q:3800,c:3000,o:3000,h:2400,s:2000,p:1700,v:1700};
const ENGP=new Map();
function engProfile(i){let e=ENGP.get(i);if(e)return e;const m=PORS[i]||PORS[0],n=m[0],cs=carSpec(i),s=ptSpec(i);let c=ENG_DOC[n],src='published layout (general knowledge, not cited per car)';
 if(c&&c.endsWith('?')){c=c.slice(0,-1);src='published layout, variant not specified by the game'}
 if(!c){src='estimate (body type + top speed)';c=cs.ev?'E':m[6]==='r'?'F6t':m[1]<170?'I4n':m[1]<230?'I4t':m[1]<280?'V6t':m[1]<320?'V8t':'V12n'}
 if(cs.ev&&c!=='E'){c='E';src='electric (carSpec)'}
 const hyb=c.endsWith('+'),cc=hyb?c.slice(0,-1):c,ev=cc==='E',lay=ev?'E':cc[0],cyl=ev?0:parseInt(cc.slice(1)),asp=ev?'e':cc[cc.length-1];
 let hs=2166136261;for(let k=0;k<n.length;k++){hs^=n.charCodeAt(k);hs=Math.imul(hs,16777619)>>>0}
 e={i,name:n,code:c,src,lay,cyl,asp,hyb,ev,seed:hs,red:s.red,idle:s.idle||850,kind:m[6],lux:AUD_LUX.test(n),lvl:(AUD_LVL[m[6]]||.7)*(AUD_LUX.test(n)?.6:1),lpf:(AUD_LPF[m[6]]||2400)*(AUD_LUX.test(n)?.55:asp==='d'?1.1:1),wave:null,coef:null};
 ENGP.set(i,e);return e}
// one engine cycle of exhaust pulses -> Fourier coefficients (real, imag) for a PeriodicWave; deterministic per car
function engCycle(e,H){H=H||128;const N=1024,x=new Float32Array(N);if(e.ev)return null;let r=e.seed;const rnd=()=>{r=Math.imul(r^r>>>15,2246822507)>>>0;r=Math.imul(r^r>>>13,3266489909)>>>0;return((r^r>>>16)>>>0)/4294967296};
 const n=e.lay==='R'?4:e.cyl,ev0=720/n,P=[];   // rotary: shaft rpm, one pulse per rotor per shaft turn -> 2 rotors = 4 pulses per 720 deg
 if(e.lay==='V'&&n===8){const ord=[0,1,1,0,1,0,0,1];for(let k=0;k<8;k++)P.push([k*90,ord[k]])}   // cross-plane V8: 1-8-4-3-6-5-7-2, bank pattern L R R L R L L R
 else for(let k=0;k<n;k++)P.push([k*ev0,(e.lay==='V'||e.lay==='P'||e.lay==='F'||e.lay==='U'||e.lay==='W')?k&1:0]);
 const bankA=[1,e.lay==='V'&&n===8?.72:e.lay==='U'?.66:e.lay==='P'?.86:.93],shift=e.lay==='U'?14:0,t1=e.lay==='R'?7:e.asp==='t'?16:e.asp==='d'?12:13,fr=e.lay==='R'?.16:.09+.03*rnd();
 for(const[a0,b]of P){const amp=bankA[b]*(1+.09*(rnd()-.5)),ph=a0+(b?shift:0)+3*(rnd()-.5);
  for(let j=0;j<N;j++){let t=(j/N*720-ph+720)%720;if(t>ev0*2.4)continue;const u=t/t1;let y=u*Math.exp(1-u)+.38*Math.exp(-t/(t1*2.2))*Math.sin(2*Math.PI*t*fr);if(e.asp==='d'&&t<2.5)y+=.7*(1-t/2.5);x[j]+=amp*y}}
 let mean=0;for(let j=0;j<N;j++)mean+=x[j]/N;const re=new Float32Array(H+1),im=new Float32Array(H+1);
 for(let k=1;k<=H;k++){let a=0,b=0;const w=2*Math.PI*k/N;for(let j=0;j<N;j++){const v=x[j]-mean;a+=v*Math.cos(w*j);b+=v*Math.sin(w*j)}const roll=1/(1+Math.pow(k/(e.lay==='R'?90:60),2));re[k]=a/N*roll;im[k]=b/N*roll}
 return{re,im}}
// ---- settings (separate key, like the other v39+ settings) ----
const ASTORE='irbid-drive-audio-v1',AUD={master:.8,engine:.9,fx:.8,amb:.6,mute:false};
try{const o=JSON.parse(localStorage.getItem(ASTORE)||'{}');for(const k of['master','engine','fx','amb'])if(Number.isFinite(o[k]))AUD[k]=cl(o[k],0,1);if(typeof o.mute==='boolean')AUD.mute=o.mute}catch(e){}
function audSave(){try{localStorage.setItem(ASTORE,JSON.stringify(AUD))}catch(e){}}
const AU={ctx:null,ok:typeof(window.AudioContext||window.webkitAudioContext)==='function',state:'locked',err:'',n:{},cur:-1,ag:{gear:1,rpm:850},sw:{ph:'start',t:0},lastG:1,dip:0,pops:0,traf:null,trT:0,hits:0,hitT:0,frame:0,nodes:0};
const audHint=document.createElement('div');audHint.id='audHint';audHint.style.cssText='position:fixed;left:50%;bottom:30px;transform:translateX(-50%);background:rgba(0,0,0,.6);color:#fff;font:13px system-ui,sans-serif;padding:4px 10px;border-radius:6px;pointer-events:none;z-index:30';
audHint.textContent=AU.ok?'🔇 Click or press any key to turn on sound (L = mute)':'🔇 This browser has no Web Audio: the game runs without sound';try{document.body.appendChild(audHint)}catch(e){}
function audBus(ctx,g,dst){const x=ctx.createGain();x.gain.value=g;x.connect(dst);AU.nodes++;return x}
function audNoise(ctx,brown){const L=ctx.sampleRate*2,b=ctx.createBuffer(1,L,ctx.sampleRate),d=b.getChannelData(0);let l=0;for(let j=0;j<L;j++){const w=Math.random()*2-1;if(brown){l=(l+.02*w)/1.02;d[j]=l*3.5}else d[j]=w}const s=ctx.createBufferSource();s.buffer=b;s.loop=true;s.start();AU.nodes++;return s}
function audFilt(ctx,type,f,q,src,dst){const x=ctx.createBiquadFilter();x.type=type;x.frequency.value=f;x.Q.value=q;src.connect(x);if(dst)x.connect(dst);AU.nodes++;return x}
function audOsc(ctx,type,f,dst){const o=ctx.createOscillator();o.type=type;o.frequency.value=f;o.connect(dst);o.start();AU.nodes++;return o}
// one-shot impact buffers (built once): metal crunch, glass, bump thump
function audBufs(ctx){const sr=ctx.sampleRate,mk=(len,fn)=>{const b=ctx.createBuffer(1,Math.floor(sr*len),sr),d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=fn(j/sr);return b};
 let lp=0;const crash=mk(.8,t=>{lp+=(Math.random()*2-1-lp)*.25;return(lp*1.4+.5*Math.sin(2*Math.PI*83*t)*Math.exp(-t*9)+.3*Math.sin(2*Math.PI*211*t+Math.sin(t*40))*Math.exp(-t*6))*Math.exp(-t*5.5)*(t<.004?t/.004:1)});
 const glass=mk(.6,t=>(Math.random()*2-1)*Math.exp(-t*7)*(.4+.6*(Math.sin(2*Math.PI*3100*t)>.6?1:0))*(t<.002?t/.002:1)*.8);
 const thump=mk(.3,t=>(Math.sin(2*Math.PI*(55+30*Math.exp(-t*20))*t)*Math.exp(-t*14)+(Math.random()*2-1)*.25*Math.exp(-t*60)));
 return{crash,glass,thump}}
function audInit(){if(AU.ctx||!AU.ok)return;try{const C=window.AudioContext||window.webkitAudioContext,ctx=AU.ctx=new C({latencyHint:'interactive'}),n=AU.n;
 n.comp=ctx.createDynamicsCompressor();n.comp.threshold.value=-10;n.comp.knee.value=8;n.comp.ratio.value=6;n.comp.connect(ctx.destination);
 n.master=audBus(ctx,0,n.comp);n.lp=audFilt(ctx,'lowpass',18000,.5,{connect(){}},n.master);n.eng=audBus(ctx,AUD.engine,n.lp);n.fx=audBus(ctx,AUD.fx,n.lp);n.amb=audBus(ctx,AUD.amb,n.lp);
 // engine voice: two copies of the per-car wave (slight detune = cycle-to-cycle variation) -> pre-gain -> soft clip -> load-dependent low-pass -> level
 n.eg=audBus(ctx,0,n.eng);n.elp=audFilt(ctx,'lowpass',2000,1.4,{connect(){}},n.eg);n.sh=ctx.createWaveShaper();{const k=new Float32Array(1024);for(let j=0;j<1024;j++){const x=j/511.5-1;k[j]=Math.tanh(2.2*x)/Math.tanh(2.2)}n.sh.curve=k}n.sh.connect(n.elp);
 n.pre=audBus(ctx,.6,n.sh);n.oA=audOsc(ctx,'sine',30,n.pre);n.gB=audBus(ctx,.32,n.pre);n.oB=audOsc(ctx,'sine',30,n.gB);
 n.white=audNoise(ctx,false);n.brown=audNoise(ctx,true);
 n.gIn=audBus(ctx,0,n.eng);n.fIn=audFilt(ctx,'bandpass',300,1.2,n.white,n.gIn);                       // intake / induction roar
 n.gT=audBus(ctx,0,n.eng);n.oT=audOsc(ctx,'sine',3000,n.gT);                                          // turbo whistle
 n.gBov=audBus(ctx,0,n.eng);audFilt(ctx,'bandpass',2600,1.5,n.white,n.gBov);                         // blow-off / wastegate chuff
 n.gS=audBus(ctx,0,n.eng);n.oS=audOsc(ctx,'triangle',800,n.gS);                                       // supercharger whine
 n.gE=audBus(ctx,0,n.eng);n.oE1=audOsc(ctx,'sine',400,n.gE);n.gE2=audBus(ctx,.25,n.gE);n.oE2=audOsc(ctx,'triangle',1200,n.gE2);   // EV motor / inverter
 n.gSt=audBus(ctx,0,n.eng);n.oSt=audOsc(ctx,'sawtooth',150,audFilt(ctx,'lowpass',900,1,{connect(){}},n.gSt));   // starter motor
 n.gPop=audBus(ctx,0,n.eng);audFilt(ctx,'bandpass',420,2,n.white,n.gPop);                            // overrun pops
 n.gSq=audBus(ctx,0,n.fx);n.fSq=audFilt(ctx,'bandpass',1000,7,n.white,n.gSq);n.gSqT=audBus(ctx,0,n.fx);n.oSq=audOsc(ctx,'triangle',1050,n.gSqT);   // tyre squeal (noise band + tone)
 n.gGr=audBus(ctx,0,n.fx);n.fGr=audFilt(ctx,'bandpass',1400,.8,n.white,n.gGr);                     // gravel / unpaved crunch
 n.gW=audBus(ctx,0,n.amb);n.fW=audFilt(ctx,'bandpass',500,.6,n.white,n.gW);                          // wind
 n.gR=audBus(ctx,0,n.amb);n.fR=audFilt(ctx,'lowpass',250,.7,n.brown,n.gR);                           // tyre roll / road noise
 n.gTr=audBus(ctx,0,n.amb);n.oTr=audOsc(ctx,'sine',20,audFilt(ctx,'lowpass',700,1,{connect(){}},n.gTr));   // nearest traffic car
 {const e={lay:'I',cyl:4,asp:'n',seed:12345},c=engCycle(e,64);n.oTr.setPeriodicWave(ctx.createPeriodicWave(c.re,c.im))}
 // v46: rain on the roof/road + wet-tyre hiss, and the player's horn (dual-tone ~400/500 Hz, a common electric horn pair; synthesised)
 n.gRn=audBus(ctx,0,n.amb);audFilt(ctx,'lowpass',7000,.5,audFilt(ctx,'highpass',900,.5,n.white),n.gRn);n.gWt=audBus(ctx,0,n.amb);n.fWt=audFilt(ctx,'bandpass',2400,.7,n.white,n.gWt);
 n.gHn=audBus(ctx,0,n.fx);{const hf=audFilt(ctx,'bandpass',900,.8,{connect(){}},n.gHn),hs=ctx.createWaveShaper();{const k=new Float32Array(256);for(let j=0;j<256;j++){const x=j/127.5-1;k[j]=Math.tanh(3*x)}hs.curve=k}hs.connect(hf);audOsc(ctx,'square',405,hs);audOsc(ctx,'square',508,hs)}
 n.buf=audBufs(ctx);AU.state=ctx.state;AU.cur=-1;audApply();
 ctx.onstatechange=()=>{AU.state=ctx.state;audHintUpd()}}catch(e){AU.ok=false;AU.err=String(e);AU.ctx=null}audHintUpd()}
function audHintUpd(){if(typeof PAUSE!=='undefined'&&PAUSE.on){audHint.style.display='none';return}const run=AU.ctx&&AU.ctx.state==='running';audHint.style.display=run&&!AUD.mute?'none':'';if(!AU.ok)audHint.textContent='🔇 Sound unavailable in this browser'+(AU.err?' ('+AU.err.slice(0,60)+')':'');else if(AUD.mute)audHint.textContent='🔇 Muted (L)';else if(!run)audHint.textContent='🔇 Click or press any key to turn on sound (L = mute)';if(AUD.mute&&run){audHint.style.display='';clearTimeout(AU.hT);AU.hT=setTimeout(()=>{if(AUD.mute)audHint.style.display='none'},2500)}}
function audUnlock(){if(!AU.ok)return;if(!AU.ctx)audInit();if(AU.ctx&&AU.ctx.state!=='running'&&!(typeof PAUSE!=='undefined'&&PAUSE.on))AU.ctx.resume().then(audHintUpd,e=>{AU.err=String(e);audHintUpd()})}
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,audUnlock,{capture:true,passive:true}));
function audApply(){if(!AU.ctx)return;const n=AU.n,t=AU.ctx.currentTime;n.master.gain.setTargetAtTime(AUD.mute?0:AUD.master*.8,t,.05);n.eng.gain.setTargetAtTime(AUD.engine,t,.05);n.fx.gain.setTargetAtTime(AUD.fx,t,.05);n.amb.gain.setTargetAtTime(AUD.amb,t,.05)}
function audSet(k,v){if(k==='mute')AUD.mute=!!v;else if(k in AUD)AUD[k]=cl(+v||0,0,1);audSave();audApply();audHintUpd()}
addEventListener('keydown',e=>{if(e.code==='KeyL'&&!e.repeat&&!(e.target&&e.target.tagName==='INPUT')){audSet('mute',!AUD.mute);toast(AUD.mute?'Sound muted (L)':'Sound on (L)')}});
// a new car: fade the old engine out (shutdown), swap the wave, then crank + start the new one
function audCar(i){if(!AU.ctx)return;const e=engProfile(i);if(!e.ev&&!e.wave){const c=e.coef||(e.coef=engCycle(e));e.wave=AU.ctx.createPeriodicWave(c.re,c.im)}
 if(e.wave){AU.n.oA.setPeriodicWave(e.wave);AU.n.oB.setPeriodicWave(e.wave)}AU.cur=i;AU.sw={ph:'start',t0:AU.ctx.currentTime,t:0};AU.ag={gear:1,rpm:e.idle};AU.lastG=1;
 if(ENGP.size>40)for(const[k,v]of ENGP)if(k!==i&&v.wave){v.wave=null;break}}   // keep at most ~40 waves alive (each ~1 KB of coefficients)
// sound-only gearbox for Arcade (Arcade physics has no gears): same per-car ratios as Realistic, upshift near redline under throttle
function audRpm(e,v,th){const s=ptSpec(P.idx||0),m=PORS[P.idx||0],kv=Math.max(.3,P.vm/(m[1]/3.6*.98));if(handlingMode)return[PTS.rpm,PTS.gear,PTS.spin,PTS.shift>0];
 const g=AU.ag;if(e.ev){g.gear=1;g.rpm=Math.max(0,ptGear(s,v,1)/kv);return[g.rpm,1,TSLIP.spin,false]}
 let r=ptGear(s,v,g.gear)/kv;if(g.gear<s.ng&&r>=s.red*(th>.6?.95:.62)){g.gear++;g.sh=s.shiftT;r=ptGear(s,v,g.gear)/kv}else if(g.gear>1&&ptGear(s,v,g.gear-1)/kv<s.red*(th>.6?.85:.5)&&r<s.red*(th>.6?.55:.3))g.gear--;
 g.sh=Math.max(0,(g.sh||0)-1/60);r=Math.max(r,v<6&&g.gear===1?s.idle+(s.red*.45-s.idle)*th*cl(v/6+.4,0,1):s.idle);if(TSLIP.spin>.2)r=Math.max(r,s.red*(.6+.35*TSLIP.spin));
 g.rpm+=(Math.min(r,s.red)-g.rpm)*.25;return[g.rpm,g.gear,TSLIP.spin,g.sh>0]}
function audTick(dt){if(!AU.ctx||AU.ctx.state!=='running')return;const n=AU.n,ctx=AU.ctx,t=ctx.currentTime,T=(p,v,c)=>p.setTargetAtTime(v,t,c||.03);
 if(AU.cur<0)audCar(P.idx);else if(AU.cur!==P.idx&&AU.sw.ph!=='stop')AU.sw={ph:'stop',t0:t,t:0};if(AU.sw.ph==='stop'&&t-AU.sw.t0>.35)audCar(P.idx);const e=engProfile(AU.cur),v=Math.hypot(P.vx,P.vz),th=INP.th,br=INP.br,paused=typeof PAUSE!=='undefined'&&PAUSE.on;AU.frame++;
 let[rpm,gear,spin,shifting]=audRpm(e,v,th);const red=e.red,idle=e.idle;
 // start-up sequence: crank (starter whine, slow uneven firing), flare above idle, settle
 const sw=AU.sw;sw.t=t-sw.t0;let crank=0,lvlK=1;if(sw.ph==='stop'){const k=Math.max(0,1-sw.t/.35);rpm=idle*k;lvlK=k;spin=0}else if(sw.ph==='start'){if(e.ev){lvlK=Math.min(1,sw.t/.6);if(sw.t>.6)sw.ph='run'}else if(sw.t<.55){crank=1;rpm=230+50*Math.sin(sw.t*55);lvlK=.35}else if(sw.t<1.5){rpm=Math.max(rpm,idle*(1+.7*Math.exp(-(sw.t-.6)*5)*(sw.t<.7?(sw.t-.55)/.15:1)))}else sw.ph='run'}
 // damage: low engine health (Full mode) -> misfires; dead engine -> silence
 const dr=typeof damageMode!=='undefined'&&damageMode===2&&typeof currentDamageRecord==='function'?currentDamageRecord():null,eh=dr?dr.engine:100,mis=eh<35&&Math.random()<(35-eh)/120;
 const lim=!e.ev&&rpm>=red*.975&&th>.5,gate=lim?((AU.frame>>1)&1?1:.2):1,load=cl(th*(.6+.4*(1-v/Math.max(10,P.vm)))+(spin>.2?.3:0),0,1);
 if(gear!==AU.lastG){if(gear>AU.lastG&&th>.3){AU.dip=.14;if(e.asp==='t'){n.gBov.gain.setValueAtTime(.05,t);n.gBov.gain.setTargetAtTime(0,t+.02,.05)}}AU.lastG=gear}AU.dip=Math.max(0,AU.dip-dt);
 const hybEV=e.hyb&&v<6&&th<.5&&sw.ph==='run';   // hybrids creep on the motor at low speed with light throttle
 if(!e.ev){const f=rpm/120;T(n.oA.frequency,f,.012);T(n.oB.frequency,f*1.004,.012);
  const lv=e.lvl*(hybEV?0:1)*gate*(mis?.15:1)*(AU.dip>0?.4:1)*lvlK*(eh<=0?0:1)*(paused?0:1);T(n.eg.gain,lv*(.32+.68*load)*(.55+.45*rpm/red),.025);
  T(n.pre.gain,.45+.9*load,.04);T(n.elp.frequency,Math.min(16000,e.lpf*(.45+.9*load)*(.7+.6*rpm/red)),.04);
  T(n.gIn.gain,.07*th*rpm/red*e.lvl,.05);T(n.fIn.frequency,150+rpm*.12,.05);
  const boost=e.asp==='t'?cl((rpm/red-.3)/.5,0,1)*th:0;AU.boost=(AU.boost||0)+(boost-(AU.boost||0))*Math.min(1,dt*(boost>(AU.boost||0)?2.2:6));
  T(n.gT.gain,.012*AU.boost*AU.boost,.05);T(n.oT.frequency,2600+5200*AU.boost,.08);
  if(e.asp==='t'&&th<.15&&AU.boost>.45&&!AU.bov){AU.bov=1;n.gBov.gain.setValueAtTime(.09*AU.boost,t);n.gBov.gain.setTargetAtTime(0,t+.03,.12)}if(th>.3)AU.bov=0;
  T(n.gS.gain,e.asp==='s'?.02*th*rpm/red:0,.05);T(n.oS.frequency,rpm*.23,.03);
  // overrun pops / crackle (sporty petrol cars only)
  if(th<.05&&rpm>red*.5&&!e.lux&&e.asp!=='d'&&'rmqco'.includes(e.kind)&&Math.random()<.05){n.gPop.gain.setValueAtTime(.2*e.lvl*Math.random(),t);n.gPop.gain.setTargetAtTime(0,t+.01,.02)}
 }else T(n.eg.gain,0,.05);
 T(n.gSt.gain,crank?.05:0,.02);
 // EV whine (also hybrids in EV mode)
 const evOn=e.ev||hybEV,mr=e.ev?rpm:v*60;T(n.gE.gain,evOn?(.012+.05*load)*lvlK*Math.min(1,.15+mr/4000):0,.05);T(n.oE1.frequency,40+mr*.11,.03);T(n.oE2.frequency,600+mr*.33,.03);
 // tyres: squeal on pavement from the slip state (Realistic: tyre slip angles; Arcade: body slip), gravel off-road
 const paved=surfK()>=1,sl=cl(Math.max(TSLIP.r,TSLIP.f*.8,spin*.9,TSLIP.lock,br>.8&&v>8?.25:0),0,1.6),sq=P.gnd&&(v>2||spin>.2)?Math.min(1,sl):0;
 T(n.gSq.gain,paved?.22*sq:0,.04);T(n.gSqT.gain,paved?.045*sq*sq:0,.04);T(n.fSq.frequency,900+260*sl,.05);T(n.oSq.frequency,(980+220*sl)*(1+.015*Math.sin(t*33)),.02);
 T(n.gGr.gain,!paved&&P.gnd?Math.min(.25,v/40)*(.4+sq):0,.06);
 T(n.gW.gain,.32*Math.pow(Math.min(1.4,v/45),2),.1);T(n.fW.frequency,350+v*14,.1);T(n.gR.gain,P.gnd?Math.min(.35,v/30*.22)*(paved?1:1.7):0,.08);T(n.fR.frequency,160+v*7,.1);
 if(typeof WX!=='undefined'){T(n.gRn.gain,.16*WX.rain,.3);T(n.gWt.gain,P.gnd?.12*WX.wet*Math.min(1,v/25):0,.1);T(n.fWt.frequency,1800+v*25,.2)}
 T(n.lp.frequency,camMode===1?2600:18000,.1);   // cockpit view: muffled outside sound
 // nearest moving traffic car (refreshed 6x a second, O(traffic))
 if((AU.trT-=dt)<=0){AU.trT=.16;let b=null,bd=1600;for(const c of traffic){const d=(c.x-P.x)*(c.x-P.x)+(c.z-P.z)*(c.z-P.z);if(d<bd){bd=d;b=c}}AU.traf=b;AU.trD=Math.sqrt(bd)}
 const tc=AU.traf;T(n.gTr.gain,tc?.18*Math.min(1,6/Math.max(6,AU.trD))*(.3+Math.min(1,(tc.v||0)/12)):0,.15);if(tc)T(n.oTr.frequency,(850+(tc.v||0)*110)/120,.1)}
function audHorn(on){if(!AU.ctx||AU.ctx.state!=='running')return;const g=AU.n.gHn.gain,t=AU.ctx.currentTime;g.cancelScheduledValues(t);g.setTargetAtTime(on?.16:0,t,on?.008:.03)}
// traffic horns: one-shot, panned left/right from the camera and quieter with distance (1/(1+d/8)), duller far away
function audHornAt(x,z,dur,pt){if(!AU.ctx||AU.ctx.state!=='running')return;const ctx=AU.ctx,t=ctx.currentTime,dx=x-cam.position.x,dz=z-cam.position.z,d=Math.hypot(dx,dz);if(d>120)return;
 const fx=Math.sin(P.h),fz=Math.cos(P.h),side=(dx*-fz+dz*fx)/(d||1),g=ctx.createGain(),f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=Math.max(700,5000/(1+d/15));
 const pn=ctx.createStereoPanner?ctx.createStereoPanner():null;g.gain.value=0;g.gain.setTargetAtTime(.22/(1+d/8),t,.01);g.gain.setTargetAtTime(0,t+dur,.03);g.connect(f);if(pn){pn.pan.value=cl(side,-1,1)*.8;f.connect(pn);pn.connect(AU.n.fx)}else f.connect(AU.n.fx);
 const os=[370*pt,465*pt].map(fr=>{const o=ctx.createOscillator();o.type='square';o.frequency.value=fr;o.connect(g);o.start(t);o.stop(t+dur+.3);return o});os[0].onended=()=>{try{g.disconnect();f.disconnect();if(pn)pn.disconnect()}catch(e){}}}
// impacts (one-shot sources are the Web Audio way: each is released after it ends); rate-limited
function audHit(kind,lvl){if(!AU.ctx||AU.ctx.state!=='running'||lvl<=.02)return;const now=AU.ctx.currentTime;if(now-AU.hitT<.06)return;AU.hitT=now;AU.hits++;
 const s=AU.ctx.createBufferSource(),g=AU.ctx.createGain();s.buffer=AU.n.buf[kind]||AU.n.buf.crash;s.playbackRate.value=.85+Math.random()*.3;g.gain.value=Math.min(1.2,lvl);s.connect(g);g.connect(AU.n.fx);s.onended=()=>{try{g.disconnect()}catch(e){}};s.start()}
{const r0=registerPlayerImpact;registerPlayerImpact=function(v,o,nx,nz){const out=r0.apply(this,arguments);try{if(v>1.5){audHit('crash',Math.min(1,v/22));if(v>11)audHit('glass',.5)}}catch(e){}return out}}
if(typeof registerSpeedBumpImpact==='function'){const b0=registerSpeedBumpImpact;registerSpeedBumpImpact=function(speed,sev){const out=b0.apply(this,arguments);try{audHit('thump',.25+.5*Math.min(1,sev||0))}catch(e){}return out}}
