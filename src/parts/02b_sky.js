// ---- Forza-style graphics layer 1: procedural sky dome + clouds + stars, PMREM reflection environment, world-space material detail (rendering only; no gameplay data) ----
const GFX={on:false,env:null,envT:-99,q:2,mats:[]};
try{const gl=ren.getContext&&ren.getContext();GFX.on=!!(gl&&ren.capabilities&&ren.capabilities.isWebGL2)&&!(typeof location!=='undefined'&&/[?&]gfx=0/.test(location.search))}catch(e){GFX.on=false}
const GFXNOISE=`
float gH(vec3 p){p=mod(p,64.);p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
float gN3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(gH(i),gH(i+vec3(1,0,0)),f.x),mix(gH(i+vec3(0,1,0)),gH(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(gH(i+vec3(0,0,1)),gH(i+vec3(1,0,1)),f.x),mix(gH(i+vec3(0,1,1)),gH(i+vec3(1,1,1)),f.x),f.y),f.z);}
float gN2(vec2 p){return gN3(vec3(p,3.7));}
float gFbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*gN2(p);p=p*2.03+vec2(17.1,9.2);a*=.5;}return s;}
`;
const SKYU={uZen:{value:new T.Color(0x3a78c8)},uHor:{value:sky},uGnd:{value:new T.Color(0xb3a371)},uSun:{value:new T.Vector3(0,1,0)},uSunC:{value:new T.Color(1,.95,.8)},uDay:{value:1},uTime:{value:0},uCov:{value:0}};
const SKYM=new T.ShaderMaterial({uniforms:SKYU,side:T.BackSide,depthWrite:false,depthTest:false,fog:false,
 vertexShader:'varying vec3 vD;void main(){vD=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
 fragmentShader:'uniform vec3 uZen,uHor,uGnd,uSun,uSunC;uniform float uDay,uTime,uCov;varying vec3 vD;'+GFXNOISE+`
void main(){vec3 d=normalize(vD);float y=d.y;
 vec3 col=mix(uHor,uZen,pow(clamp(y,0.,1.),.5));
 float hz=exp(-abs(y)*9.);float sd=max(dot(d,normalize(uSun)),0.);
 col+=uSunC*hz*(.06+.30*pow(sd,6.))*uDay;                       // horizon haze brighter toward the sun
 if(y<0.)col=mix(uHor,uGnd,smoothstep(0.,.18,-y));
 col+=uSunC*(pow(sd,900.)*6.+pow(sd,60.)*.55+pow(sd,7.)*.10)*(.25+.75*uDay);   // sun disc + glow
 if(y>0.){vec2 p=d.xz/(y+.16)*1.7+vec2(uTime*.010,uTime*.004);float n=gFbm(p),n2=gFbm(p+normalize(uSun.xz+.001)*.09);
  float cov=smoothstep(.50-.46*uCov,.74-.3*uCov,n),fade=smoothstep(.0,.22,y);float lit=clamp(1.-(n2-n)*3.2,.55,1.15);
  vec3 cc=mix(uHor*.9+.18,vec3(1.),.65)*lit;cc=mix(cc,cc*uSunC*1.15,.5);cc*=(.12+.88*uDay)*(1.-.42*uCov);
  col=mix(col,cc,cov*fade*.9);
  float st=step(.9972,gH(floor(d*230.)))*smoothstep(.45,.0,uDay)*smoothstep(.05,.3,y)*(1.-cov);col+=vec3(st);}
 gl_FragColor=vec4(col,1.);}`});
const dome=new T.Mesh(new T.SphereGeometry(1,32,20),SKYM);dome.scale.setScalar(1000);dome.renderOrder=-1000;dome.frustumCulled=false;
const envScene=new T.Scene(),envDome=new T.Mesh(dome.geometry,SKYM);envDome.scale.setScalar(50);envDome.frustumCulled=false;envScene.add(envDome);
let pmrem=null,envCRT=null,envCC=null;
const gfxEnvBuild=()=>{envCC.update(ren,envScene);return pmrem.fromCubemap(envCRT.texture)};
if(GFX.on){try{pmrem=new T.PMREMGenerator(ren);scene.background=null;scene.add(dome);disc.material.visible=false;
  envCRT=new T.WebGLCubeRenderTarget(256,{type:T.HalfFloatType,format:T.RGBAFormat});envCC=new T.CubeCamera(.1,100,envCRT);GFX.env=gfxEnvBuild();ren.shadowMap.type=T.PCFSoftShadowMap;{const mx=ren.capabilities.maxTextureSize||2048;const ms=Math.min(4096,mx);sun.shadow.mapSize.set(ms,ms)}sun.shadow.bias=-.0003;sun.shadow.normalBias=.35}catch(e){GFX.on=false}}
// called every frame from the main loop: el = sin(sun elevation), (sx,sy,sz) = direction of the visible sun
function gfxSky(el,sx,sy,sz,t){if(!GFX.on)return;const U=SKYU;
 if(el>.3)U.uZen.value.set(0x3a78c8);else if(el>0)U.uZen.value.set(0x4a4f8c).lerp(tmpZ.set(0x3a78c8),el/.3);else U.uZen.value.set(0x02040c).lerp(tmpZ.set(0x4a4f8c),Math.max(0,(el+.15)/.15));
 const dayF=cl(el*4+.2,0,1);U.uDay.value=dayF;U.uGnd.value.set(0xb3a371).multiplyScalar(.12+.88*dayF);
 U.uSun.value.set(sx,sy,sz).normalize();U.uSunC.value.set(1,.52,.2).lerp(tmpZ.set(1,.96,.84),cl(el/.35,0,1));U.uTime.value=t;
 dome.position.copy(cam.position);
 if(t-GFX.envT>14){GFX.envT=t;try{const old=GFX.env;GFX.env=gfxEnvBuild();for(const m of GFX.mats)m.envMap=GFX.env.texture;if(old)old.dispose()}catch(e){}}
 const ei=.35+.65*dayF;scene.userData.ei=ei}
const tmpZ=new T.Color();
// world-space procedural detail injected into stock materials (no UVs needed, works with merged and instanced meshes)
function gfxPatch(mat,kind){if(!GFX.on)return mat;
 mat.onBeforeCompile=sh=>{
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vGW;varying vec3 vGN;')
   .replace('#include <project_vertex>',`#include <project_vertex>
   vec4 gw4=vec4(transformed,1.);vec3 gn3=objectNormal;
   #ifdef USE_INSTANCING
   gw4=instanceMatrix*gw4;gn3=mat3(instanceMatrix)*gn3;
   #endif
   vGW=(modelMatrix*gw4).xyz;vGN=normalize(mat3(modelMatrix)*gn3);
   ${kind==='fac'?'vFL=position;vFN=normal;vFT=aSty;vFS=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));':''}`);
  if(kind==='ground')sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aU;varying float vU;').replace('#include <project_vertex>','#include <project_vertex>\nvU=aU;');
  if(kind==='pave')sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 aPv;varying vec2 vPv;').replace('#include <project_vertex>','#include <project_vertex>\nvPv=aPv;');
  if(kind==='fac')sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aSty;varying vec3 vFL;flat varying vec3 vFS;flat varying vec3 vFN;flat varying vec4 vFT;');
  let det;
  if(kind==='road')det=`
   float gd=length(vViewPosition),gf=smoothstep(70.,8.,gd);vec2 q=vGW.xz;
   float g1=gN2(q*.9),g2=gN2(q*7.),g3=gN2(q*34.),g4=gN2(q*.11);
   diffuseColor.rgb*=.90+.18*g1+.10*(g2-.5)+.14*(g3-.5)*gf;
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.06,1.03,.97),smoothstep(.45,.8,g4)*.6);`;
  else if(kind==='mark')det=`
   float gd=length(vViewPosition),gf=smoothstep(70.,8.,gd);vec2 q=vGW.xz;float g2=gN2(q*9.),g3=gN2(q*40.);
   diffuseColor.rgb*=.80+.2*smoothstep(.12,.7,g2)-.10*(g3-.5)*gf;`;
  else if(kind==='ground')det=`
   float gd=length(vViewPosition),gf=smoothstep(120.,10.,gd);vec2 q=vGW.xz;
   float a=gN2(q*.018),b=gN2(q*.3),c=gN2(q*2.6),d=gN2(q*19.),pb=step(.935,gN2(q*55.));
   float nu=1.-vU;
   float fld=smoothstep(.50,.64,gN2(q*.0045+3.7))*nu,red=smoothstep(.55,.7,gN2(q*.011+11.))*nu*(1.-fld),roc=smoothstep(.62,.76,gN2(q*.02+21.))*nu*(1.-fld);
   vec3 dc=diffuseColor.rgb;
   dc=mix(dc,vec3(.46,.50,.26),fld*(.55+.3*gN2(q*.09)));dc=mix(dc,vec3(.58,.40,.29),red*.55);dc=mix(dc,vec3(.62,.60,.54),roc*.6);
   float tuft=step(.78,gN2(q*3.4))*nu*gf;dc=mix(dc,dc*vec3(.78,.86,.55),tuft*.6);
   dc*=(.86+.22*a+.10*(b-.5)+.10*(c-.5)+.07*(d-.5)*gf)*(1.-.20*pb*gf);
   dc=mix(dc,dc*vec3(1.05,.98,.9),a*.4);
   diffuseColor.rgb=dc;`;
  else if(kind==='leaf')det=`
   float gd=length(vViewPosition),gf=smoothstep(60.,6.,gd);vec3 wp=vGW;float a=gN3(wp*1.4),b=gN3(wp*6.3);
   float sh=.62+.5*(vGN.y*.5+.5);diffuseColor.rgb*=(.72+.5*a+.22*(b-.5)*gf)*sh;
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.12,1.1,.8),smoothstep(.55,.9,b)*.5*gf);`;
  else det=`
   float gd=length(vViewPosition),gf=smoothstep(90.,6.,gd);vec3 wp=vGW;float up=step(.6,vGN.y);
   float a=gN3(wp*vec3(.35,.28,.35)),b=gN3(wp*5.),c=gN3(wp*23.);
   float st=gN2(vec2((wp.x+wp.z)*1.9,wp.y*.09));
   float tone=.90+.20*a+.08*(b-.5)+.08*(c-.5)*gf;tone*=1.-.12*smoothstep(.55,.9,st)*(1.-up);
   vec3 ro=vec3(dot(diffuseColor.rgb,vec3(.33)))*.86*(.9+.2*b);
   diffuseColor.rgb=mix(diffuseColor.rgb*tone,ro*tone,up*.55);`;
  if(kind==='stone')det+=`
   {float gfs=smoothstep(55.,6.,gd);if(abs(vGN.y)<.5&&gfs>.01){vec2 tg=vec2(-vGN.z,vGN.x);float hz=dot(vGW.xz,tg);float cy=vGW.y/.32,ci=floor(cy);float off=gH(vec3(ci,7.,3.))*.9;float cx=(hz+off)/.8;
     float mort=max(1.-smoothstep(0.,.08,fract(cy)),1.-smoothstep(0.,.05,fract(cx)));float tn=gH(vec3(floor(cx),ci,1.))-.5;diffuseColor.rgb*=1.-gfs*(.24*mort-tn*.2);}}`;
  if(kind==='pave')det+=`
   {float gf2=smoothstep(55.,8.,gd);vec2 pv=vPv;
    if(pv.y>=0.){vec2 g=abs(fract(pv/.5)-.5);float jl=smoothstep(.455,.5,max(g.x,g.y));float tn=gH(vec3(floor(pv/.5),1.));
     diffuseColor.rgb*=(.9+.2*tn)*(1.-.32*jl*gf2);float cb=1.-smoothstep(.14,.2,pv.y);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.74,.73,.70),cb);}
    diffuseColor.rgb*=.92+.12*gN2(vGW.xz*.4);}`;
  if(kind==='fac'){det+=`
   float fGl=0.,fHt=0.;vec3 fEm=vec3(0.);facPat(gd,diffuseColor.rgb,fGl,fEm,fHt);`;sh.uniforms.uFacNight=FACU.uFacNight}
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vGW;varying vec3 vGN;\n'+GFXNOISE+(kind==='fac'?FAC_DECL:'')+(kind==='pave'?'varying vec2 vPv;':'')+(kind==='ground'?'varying float vU;':''))
   .replace('#include <color_fragment>','#include <color_fragment>\n'+det);
  if(kind==='road'||kind==='ground'||kind==='wall'||kind==='stone'){
   const am=kind==='road'?.015:kind==='ground'?.028:.02;
   const hgt=kind==='road'?'gN2(vGW.xz*34.)*.6+gN2(vGW.xz*7.)*.4':kind==='ground'?'gN2(vGW.xz*12.)*.6+gN2(vGW.xz*2.6)*.4':'gN3(vGW*14.)*.6+gN3(vGW*5.)*.4';
   sh.fragmentShader=sh.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   {float gb=smoothstep(40.,5.,length(vViewPosition))*${am};
    if(gb>.0005){vec3 sp=-vViewPosition,dpx=dFdx(sp),dpy=dFdy(sp);float hh=${hgt};float hx=dFdx(hh),hy=dFdy(hh);
     vec3 gq1=cross(dpy,normal),gq2=cross(normal,dpx);float gq3=dot(dpx,gq1);vec3 gq4=sign(gq3)*(hx*gq1+hy*gq2);
     normal=normalize(abs(gq3)*normal-gb*gq4);}}`);
  }
  if(kind==='fac'){sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.06,fGl);')
   .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.6,fGl);')
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=fEm*uFacNight;')
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   {float gb=smoothstep(45.,6.,length(vViewPosition))*.8;
    if(gb>.01){vec3 sp=-vViewPosition,dpx=dFdx(sp),dpy=dFdy(sp);float hx=dFdx(fHt),hy=dFdy(fHt);
     vec3 gq1=cross(dpy,normal),gq2=cross(normal,dpx);float gq3=dot(dpx,gq1);vec3 gq4=sign(gq3)*(hx*gq1+hy*gq2);
     normal=normalize(abs(gq3)*normal-gb*gq4);}}`)}
  if(kind==='road'){sh.fragmentShader=sh.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   {vec2 q2=vGW.xz;float rr=gN2(q2*5.)*.5+gN2(q2*.9)*.5;roughnessFactor=clamp(roughnessFactor+(rr-.5)*.45,.12,.95);
    float wet=smoothstep(.60,.80,gN2(q2*.13+4.))*.55;roughnessFactor=mix(roughnessFactor,.1,wet);}`)}
 };
 mat.customProgramCacheKey=()=>'gfx_'+kind;return mat}

// PBR stand-ins for the old per-vertex Lambert materials (per-pixel light + sky reflections); fall back to the old material when GFX is off
const gfxReg=m=>{m.envMap=GFX.env.texture;GFX.mats.push(m);return m};
const gfxStd=(o,kind)=>GFX.on?gfxPatch(gfxReg(new T.MeshStandardMaterial(o)),kind):null;
// car paint: clear-coated metallic (hero cars) / glossy metallic (traffic); old Lambert when GFX is off
const carPaint=(c,hero)=>!GFX.on?new T.MeshLambertMaterial({color:c}):hero?gfxReg(new T.MeshPhysicalMaterial({color:c,metalness:.55,roughness:.3,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.1})):gfxReg(new T.MeshStandardMaterial({color:c,metalness:.5,roughness:.36,envMapIntensity:1}));
