// ---- v47: platform robustness: loading screen, WebGL context loss / restore, feature report ----
// Context loss happens when a phone or laptop GPU resets, a driver updates, or the browser reclaims memory from a background tab. three r128
// listens for the same events and rebuilds its GL state on restore (programs, buffers and textures re-upload on the next draw); this part
// pauses the game while the context is gone, tells the player, and resumes it afterwards.
const GLX={lost:0,n:0,el:null};
GLX.el=document.createElement('div');GLX.el.id='glLost';GLX.el.style.cssText='position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.7);color:#eee;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px';
GLX.el.innerHTML='<div style="max-width:520px"><h2 style="margin:0 0 8px">Graphics paused</h2>The browser reset the 3D graphics (the GPU was busy, asleep or out of memory). The game is paused and will continue by itself when the graphics come back.<br><br><small style="opacity:.7">If it stays on this screen, reload the page: your progress is saved.</small></div>';
try{document.body.appendChild(GLX.el)}catch(e){}
try{const cv=ren.domElement;if(cv&&cv.addEventListener){
 cv.addEventListener('webglcontextlost',e=>{e.preventDefault();GLX.lost=1;GLX.n++;GLX.el.style.display='flex';if(typeof pauseToggle==='function'&&!PAUSE.on){GLX.paused=1;PAUSE.on=true;ui=true;for(const k in keys)keys[k]=0;if(AU.ctx&&AU.ctx.state==='running')AU.ctx.suspend()}},false);
 cv.addEventListener('webglcontextrestored',()=>{GLX.lost=0;GLX.el.style.display='none';
  if(GLX.paused){GLX.paused=0;PAUSE.on=false;ui=false;if(AU.ctx&&!document.hidden)AU.ctx.resume().catch(()=>{})}toast('Graphics restored')},false)}}catch(e){}
// what this browser offers (shown in the pause menu; useful when a player reports a problem)
const PLAT=(()=>{const o={gl2:false,maxTex:0,audio:false,pad:false,touch:false,tz:false,mem:0};try{o.gl2=!!(ren.capabilities&&ren.capabilities.isWebGL2);o.maxTex=ren.capabilities&&ren.capabilities.maxTextureSize||0}catch(e){}
 try{o.audio=!!(window.AudioContext||window.webkitAudioContext)}catch(e){}try{o.pad=typeof navigator!=='undefined'&&typeof navigator.getGamepads==='function'}catch(e){}
 try{o.touch=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches}catch(e){}try{o.tz=!!Intl.DateTimeFormat().resolvedOptions().timeZone}catch(e){}try{o.mem=navigator.deviceMemory||0}catch(e){}return o})();
function platLine(){const p=PLAT;return'This device: WebGL '+(p.gl2?'2':'1')+' · max texture '+p.maxTex+' · sound '+(p.audio?'yes':'no')+' · controllers '+(p.pad?'yes':'no')+' · touch '+(p.touch?'yes':'no')+(p.mem?' · ~'+p.mem+' GB RAM':'')+(GLX.n?' · graphics reset '+GLX.n+'x':'')+
 (p.touch&&GQ.q!=='low'?' · tip: Low quality + Low traffic run best on phones':'')}
// the loading screen goes once the first frame is drawn (the world is built synchronously before this point)
try{requestAnimationFrame(()=>{const b=document.getElementById('boot');if(b)b.remove()})}catch(e){}
