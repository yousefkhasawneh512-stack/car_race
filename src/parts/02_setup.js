const NEARLBL=[],LBLM=new Map();
const T=THREE,R=(a,b)=>a+Math.random()*(b-a),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),cl=(v,a,b)=>Math.max(a,Math.min(b,v));
// ---- 1080p HD display lock: the supplied initialize1080pGameDisplay block, adapted. The game canvas is WebGL (three.js owns its buffer), so the 1920x1080 buffer is set through the renderer and a 2D context is never requested on it;
// the 2D canvases that really exist (minimap, wheel, label textures) get imageSmoothingEnabled=false through crisp2d(), re-applied every frame for the minimap ----
const DISP={w:1920,h:1080};
function crisp2d(c){if(!c)return c;c.imageSmoothingEnabled=false;c.webkitImageSmoothingEnabled=false;c.mozImageSmoothingEnabled=false;c.msImageSmoothingEnabled=false;return c}
// v47: no WebGL (blocked, disabled hardware acceleration, very old device) = a readable message instead of a blank page; three r128 throws here
function noGL(e){try{const d=document.createElement('div');d.id='nogl';d.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#0b0e13;color:#e8edf5;font:16px/1.5 system-ui,sans-serif;padding:24px;text-align:center';
 d.innerHTML='<div style="max-width:560px"><h2 style="margin:0 0 10px">Irbid Drive needs 3D graphics (WebGL)</h2>This browser could not start WebGL'+(e&&e.message?' ('+String(e.message).replace(/[<>&]/g,'')+')':'')+'.<br><br>Turn on hardware acceleration in the browser settings, update the graphics driver, or try a current Chrome, Edge, Firefox or Safari. Your saved progress is kept.</div>';
 const b=document.getElementById('boot');if(b)b.remove();document.body.appendChild(d)}catch(x){}}
const ren=(()=>{try{return new T.WebGLRenderer({antialias:true})}catch(e){noGL(e);throw e}})();ren.shadowMap.enabled=true;document.body.appendChild(ren.domElement);ren.domElement.id='game';
function initialize1080pGameDisplay(canvasElementId){
 const canvas=document.getElementById(canvasElementId)||ren.domElement;
 // 1. internal drawing buffer forced to absolute 1080p (pixel ratio locked to 1 so buffer = exactly 1920x1080)
 ren.setPixelRatio(1);ren.setSize(DISP.w,DISP.h,false);
 // 2. CSS: always 16:9, scaled to fit the window (letterboxed, centred) so the picture is never stretched
 const st=canvas.style;st.position='fixed';st.left='50%';st.top='50%';st.transform='translate(-50%,-50%)';st.maxWidth='100%';st.aspectRatio='16 / 9';st.backgroundColor='#1e2023';st.zIndex='0';   // v45: explicit layer 0; the HUD (.h, #map) sits on layer 3 (positioned canvas appended after the HUD used to paint over it)
 const fit=()=>{if(!(innerWidth>0&&innerHeight>0)){st.width='100%';st.height='auto';return}const k=Math.min(innerWidth/DISP.w,innerHeight/DISP.h);st.width=(DISP.w*k)+'px';st.height=(DISP.h*k)+'px'};fit();addEventListener('resize',fit);
 // 3. razor-sharp pixel sprites: smoothing is disabled on every 2D context via crisp2d(); pixel textures use NearestFilter
 console.log("Canvas Engine successfully locked to absolute 1080p HD resolution (1920x1080) with sharp pixel styling!");
 return{canvas,ctx:null,gl:ren.getContext&&ren.getContext(),fit};
}
const DISPLAY=initialize1080pGameDisplay('game');
const scene=new T.Scene(),cam=new T.PerspectiveCamera(65,DISP.w/DISP.h,.5,1100);
const sky=new T.Color(0x8ec5ee);scene.background=sky;scene.fog=new T.Fog(0x8ec5ee,150,900);scene.fog.color=sky;
const hemi=new T.HemisphereLight(0xffffff,0x6b5a3c,.6);scene.add(hemi);
const sun=new T.DirectionalLight(0xfff2d6,1.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
const sc=sun.shadow.camera;sc.left=sc.bottom=-110;sc.right=sc.top=110;sc.near=1;sc.far=900;scene.add(sun,sun.target);
const disc=new T.Mesh(new T.SphereGeometry(40,16,12),new T.MeshBasicMaterial({color:0xfff3b0,fog:false}));scene.add(disc);
const head=new T.SpotLight(0xfff0cc,0,80,.55,.5);scene.add(head,head.target);
// v45: snapshot "was a menu open when this Esc arrived?" in the FIRST key listener. Wheel buttons dispatch synthetic keys on window itself, where
// listeners run in registration order: a menu that closes on Esc would already have set ui=false before the pause menu (12e) looks.
let ESC_PRE=false;addEventListener('keydown',e=>{if(e.code==='Escape')try{ESC_PRE=!!ui||(typeof diagOpen!=='undefined'&&!!diagOpen)||document.getElementById('whz')?.style.display==='flex'}catch(x){ESC_PRE=false}},true);
