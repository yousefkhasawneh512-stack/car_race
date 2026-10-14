const NEARLBL=[],LBLM=new Map();
const T=THREE,R=(a,b)=>a+Math.random()*(b-a),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),cl=(v,a,b)=>Math.max(a,Math.min(b,v));
// ---- 1080p HD display lock: the supplied initialize1080pGameDisplay block, adapted. The game canvas is WebGL (three.js owns its buffer), so the 1920x1080 buffer is set through the renderer and a 2D context is never requested on it;
// the 2D canvases that really exist (minimap, wheel, label textures) get imageSmoothingEnabled=false through crisp2d(), re-applied every frame for the minimap ----
const DISP={w:1920,h:1080};
function crisp2d(c){if(!c)return c;c.imageSmoothingEnabled=false;c.webkitImageSmoothingEnabled=false;c.mozImageSmoothingEnabled=false;c.msImageSmoothingEnabled=false;return c}
const ren=new T.WebGLRenderer({antialias:true});ren.shadowMap.enabled=true;document.body.appendChild(ren.domElement);ren.domElement.id='game';
function initialize1080pGameDisplay(canvasElementId){
 const canvas=document.getElementById(canvasElementId)||ren.domElement;
 // 1. internal drawing buffer forced to absolute 1080p (pixel ratio locked to 1 so buffer = exactly 1920x1080)
 ren.setPixelRatio(1);ren.setSize(DISP.w,DISP.h,false);
 // 2. CSS: always 16:9, scaled to fit the window (letterboxed, centred) so the picture is never stretched
 const st=canvas.style;st.position='fixed';st.left='50%';st.top='50%';st.transform='translate(-50%,-50%)';st.maxWidth='100%';st.aspectRatio='16 / 9';st.backgroundColor='#1e2023';
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
