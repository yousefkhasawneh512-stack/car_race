// ---- v46: weather + Irbid local time. SIMULATED weather (no network, no live data): in Auto, the chance of a rainy day each month comes from
// the Jordan Meteorological Department climate table for Irbid (1985-2018: precipitation days per month), read from the Asia/Amman calendar.
// How much of a rainy day it actually rains (45%), how often dry days are cloudy, and drying time are estimates. Visuals: cloud cover, grey
// sky and light, shorter fog in rain, rain streaks, darker glossier roads. Physics: only Realistic handling feels the wet road (peak tyre grip
// x0.72 when fully wet; published wet/dry peak friction ratios are ~0.6-0.8, see V46_REPORT.md). Arcade physics never changes (off_trace).
const WSTORE='irbid-drive-weather-v1',WX_CLIM=[11.3,10.6,9.4,4.6,2,.2,0,0,.2,3.2,6,9.6],WX_MD=[31,28.25,31,30,31,30,31,31,30,31,30,31],
 WX_MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
const WX={mode:'auto',clock:'game',st:'clear',cov:0,rain:0,wet:0,mu:1,tc:0,tr:0,next:0,blk:0,day:false,lw:-1,lh:null,lt:0,mon:0};
try{const o=JSON.parse(localStorage.getItem(WSTORE)||'{}');if(['auto','clear','cloudy','rain'].includes(o.mode))WX.mode=o.mode;if(o.clock==='local')WX.clock='local'}catch(e){}
function wxSave(){try{localStorage.setItem(WSTORE,JSON.stringify({mode:WX.mode,clock:WX.clock}))}catch(e){}}
let WX_FMT=null;try{WX_FMT=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Amman',hourCycle:'h23',hour:'numeric',minute:'numeric',second:'numeric',month:'numeric'})}catch(e){}
// Jordan has kept UTC+3 all year since late 2022; that is the fallback when the browser has no time-zone data
function ammanNow(){const d=new Date();try{if(WX_FMT){const p=WX_FMT.formatToParts(d),g=t=>+(p.find(x=>x.type===t)||{value:0}).value;return{h:(g('hour')%24)+g('minute')/60+g('second')/3600,m:cl(g('month')-1,0,11)}}}catch(e){}const u=new Date(d.getTime()+108e5);return{h:u.getUTCHours()+u.getUTCMinutes()/60,m:u.getUTCMonth()}}
WX.mon=ammanNow().m;
function wxHour(h,dt){if(WX.clock!=='local')return(h+dt/40)%24;WX.lt-=dt;if(WX.lt<=0||WX.lh===null){WX.lt=1;const a=ammanNow();WX.lh=a.h;WX.mon=a.m}else WX.lh=(WX.lh+dt/3600)%24;return WX.lh}
function wxPick(st){WX.st=st;WX.tc=st==='rain'?.95:st==='cloudy'?.55:.06*Math.random();WX.tr=st==='rain'?.55+.45*Math.random():0}
// Auto: a new "day" every 8 blocks of 3 game hours (one block = 2 real minutes); a rainy day rains in ~45% of its blocks (estimate)
function wxRoll(){if(WX.blk%8===0){const p=WX_CLIM[WX.mon]/WX_MD[WX.mon];WX.day=Math.random()<p}WX.blk++;const p=WX_CLIM[WX.mon]/WX_MD[WX.mon];
 wxPick(WX.day?(Math.random()<.45?'rain':'cloudy'):Math.random()<Math.min(.45,p*2+.06)?'cloudy':'clear')}
function wxSet(k,v){if(k==='mode'){WX.mode=v;WX.next=0;if(v!=='auto')wxPick(v)}else if(k==='clock'){WX.clock=v;WX.lh=null}wxSave()}
// rain streaks: one LineSegments draw, positions wrapped around the camera in the vertex shader (no per-frame JS work per drop)
const WX_N=1800,wxU={uC:{value:new T.Vector3()},uT:{value:0},uA:{value:0}};
const wxRainM=(()=>{const g=new T.BufferGeometry(),a=new Float32Array(WX_N*8),p=new Float32Array(WX_N*6);for(let i=0;i<WX_N;i++){const x=Math.random(),y=Math.random(),z=Math.random(),s=.7+.6*Math.random();a.set([x,y,z,0,x,y,z,s],i*8)}
 g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('aD',new T.BufferAttribute(a,4));
 const m=new T.ShaderMaterial({uniforms:wxU,transparent:true,depthWrite:false,fog:false,
  vertexShader:'uniform vec3 uC;uniform float uT;attribute vec4 aD;varying float vA;void main(){vec3 b=vec3(64.,24.,64.);vec3 w;w.x=uC.x+mod(aD.x*b.x-uC.x+.5*b.x,b.x)-.5*b.x;w.z=uC.z+mod(aD.z*b.z-uC.z+.5*b.z,b.z)-.5*b.z;w.y=uC.y-8.+mod(aD.y*b.y-uT*15.,b.y);float e=step(.01,aD.w);w.y-=e*.75*aD.w;w.x+=e*.12;vA=1.-e*.6;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}',
  fragmentShader:'uniform float uA;varying float vA;void main(){gl_FragColor=vec4(.72,.76,.82,.42*uA*vA);}'});
 const o=new T.LineSegments(g,m);o.frustumCulled=false;o.visible=false;o.renderOrder=5;scene.add(o);return o})();
const WXG=new T.Color(),WXZ=new T.Color(0x6f7880),WXF={n:scene.fog.near,f:scene.fog.far};
function wxTick(dt,el){if(PAUSE.on)return;if(WX.mode==='auto'){if((WX.next-=dt)<=0){WX.next=120;wxRoll()}}else if(WX.st!==WX.mode)wxPick(WX.mode);
 const k=Math.min(1,dt/20);WX.cov+=(WX.tc-WX.cov)*k;WX.rain+=(WX.tr-WX.rain)*Math.min(1,dt/12);if(WX.rain<.003)WX.rain=0;
 WX.wet=WX.rain>.08?Math.min(1,WX.wet+dt*WX.rain/40):Math.max(0,WX.wet-dt/240);WX.mu=1-.28*WX.wet;
 const c=WX.cov;if(c>.002){const dayF=cl(el*4+.2,0,1);WXG.setRGB(.6,.64,.68).multiplyScalar(.08+.92*dayF);sky.lerp(WXG,c*.65);if(GFX.on){SKYU.uZen.value.lerp(WXZ.setRGB(.42,.47,.52).multiplyScalar(.06+.94*dayF),c*.7)}sun.intensity*=1-.75*c;hemi.intensity*=1-.15*c}
 if(GFX.on)SKYU.uCov.value=c;scene.fog.near=WXF.n*(1-.6*WX.rain);scene.fog.far=WXF.f*(1-.5*WX.rain-.12*c);
 if(Math.abs(WX.wet-WX.lw)>.02){WX.lw=WX.wet;for(const m of roadMats){const u=m.userData;if(u.r0===undefined){u.r0=m.roughness;u.e0=m.envMapIntensity||0}m.roughness=u.r0*(1-.6*WX.wet);m.envMapIntensity=u.e0*(1+1.6*WX.wet);m.color.setScalar(1-.22*WX.wet)}}
 wxRainM.visible=WX.rain>.02;if(wxRainM.visible){wxU.uC.value.copy(cam.position);wxU.uT.value=clock;wxU.uA.value=Math.min(1,WX.rain*1.3)}}
function wxLine(){const n=WX_CLIM[WX.mon];return(WX.mode==='auto'?'Auto (Irbid seasons)':'Chosen: '+WX.mode)+' · now '+(WX.rain>.08?'raining':WX.cov>.3?'cloudy':'clear')+(WX.mode!=='auto'&&WX.st!==(WX.rain>.08?'rain':WX.cov>.3?'cloudy':'clear')?' (changing)':'')+' · road '+(WX.wet>.05?'wet '+Math.round(WX.wet*100)+'%'+(handlingMode?' (grip −'+Math.round((1-WX.mu)*100)+'%)':' (grip unchanged in Arcade)'):'dry')+
 ' · simulated, not live: '+WX_MON[WX.mon]+' averages '+n+' rain days in Irbid (JMD 1985–2018)'}
addEventListener('keydown',e=>{if(e.code==='KeyT'&&!ui&&WX.clock==='local'){WX.clock='game';wxSave();toast('Clock: game time (T moves it on)')}});
