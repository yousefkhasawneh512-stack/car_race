// ---- Forza-style look: Levant colour grade, drift tyre smoke, wet-asphalt glare streaks, peripheral speed blur (rendering only) ----
{const f='contrast(1.15) saturate(1.1) sepia(.06)';ren.domElement.style.filter=f;try{mp.filter='contrast(1.15) saturate(1.1)'}catch(e){}}
// radial speed blur: backdrop blur(1px) over everything except a clear ellipse around the player car (HUD sits above it)
const fxBlur=document.createElement('div');fxBlur.id='fxblur';
{const m='radial-gradient(ellipse 36% 40% at 50% 70%,transparent 50%,#000 100%)';fxBlur.style.cssText='position:fixed;inset:0;pointer-events:none;opacity:0;backdrop-filter:blur(1px);-webkit-backdrop-filter:blur(1px);-webkit-mask-image:'+m+';mask-image:'+m;ren.domElement.insertAdjacentElement('afterend',fxBlur)}
// soft cloud texture (white, alpha falloff) tinted rgba(240,240,240,.4) per particle
const SMK_TEX=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,2,32,32,31);g.addColorStop(0,'rgba(255,255,255,.85)');g.addColorStop(.45,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new T.CanvasTexture(c)})();
const SMK=[],SMN=150,PXP=[],PXN=360;let smI=0,smAcc=0,pxI=0,pxAcc=0,pxAlt=1;
for(let i=0;i<SMN;i++){const s=new T.Sprite(new T.SpriteMaterial({map:SMK_TEX,color:0xf0f0f0,transparent:true,opacity:0,depthWrite:false}));s.visible=false;s.userData={age:9,life:1,s0:1,vx:0,vy:0,vz:0,o:.4};scene.add(s);SMK.push(s)}
// per-car exhaust pixels (additive, shape = the car's own pattern: square or cross)
for(let i=0;i<PXN;i++){const s=new T.Sprite(new T.SpriteMaterial({map:PXT.sq,color:0xffffff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));s.visible=false;s.userData={age:9,life:1,s0:1,vx:0,vy:0,vz:0,o:.8,sp:0};scene.add(s);PXP.push(s)}
// glare streaks laid along the tyre tracks while drifting (additive white = sun reflection on glossy asphalt)
const GLR=[],GLN=80;let glI=0,glT=0;const glPrev=[null,null],glGeo=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
for(let i=0;i<GLN;i++){const m=new T.Mesh(glGeo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-14,polygonOffsetUnits:-14,fog:false}));m.visible=false;m.userData={age:9,life:1.4};m.frustumCulled=false;scene.add(m);GLR.push(m)}
// tyre skid marks burned into the asphalt while drifting / hard braking (black translucent quads under the glare layer, fade over ~30 s)
const SKD=[],SKN=220;let skI=0,skT=0;const skPrev=[null,null];
for(let i=0;i<SKN;i++){const m=new T.Mesh(glGeo,new T.MeshBasicMaterial({color:0x050505,transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-12,polygonOffsetUnits:-12}));m.visible=false;m.userData={age:9,life:30,o:.5};m.frustumCulled=false;scene.add(m);SKD.push(m)}
let fxK=0;
function fxTick(dt){neonTick(clock);const vx=P.vx,vz=P.vz,v=Math.hypot(vx,vz),mdl=PORS[P.idx]||PORS[0],L=mdl[3],W=mdl[4],sh=Math.sin(P.h),ch=Math.cos(P.h);
 const sliding=P.gnd&&drift.t>0&&drift.off===0&&v>8&&!race.cd;
 // rear wheel positions (forward = (sin h, cos h); side = (cos h, -sin h))
 const rx=P.x-sh*L*.32,rz=P.z-ch*L*.32,sx=ch,sz=-sh,hw=W*.42;
 const cv=carV(P.idx),ex=cv.exhaustParticles,cc=carCols(P.idx),cross=ex.shapePattern.charAt(0)==='K';
 if(sliding){const grow=Math.min(1,drift.t/3.2),bk=.25,gy=groundH(P.x,P.z)+.35;smAcc+=dt*18;pxAcc+=dt*ex.maxStreamParticles;
  // soft grey tyre-smoke volume (lightly tinted by the car's primary neon)
  while(smAcc>=1){smAcc-=1;for(const sd of[-1,1]){const s=SMK[smI=(smI+1)%SMN],u=s.userData;u.age=0;u.life=1.3+1.5*grow+Math.random()*.4;u.s0=1.1+2.4*grow+Math.random()*.5;s.material.color.setRGB(.94,.94,.94).lerp(cc.c1,.22);u.o=.4;
    u.vx=-vx*.12+(Math.random()-.5)*1.4+sx*sd*.9;u.vz=-vz*.12+(Math.random()-.5)*1.4+sz*sd*.9;u.vy=.7+Math.random()*.8;
    s.position.set(rx-sh*bk+sx*sd*hw+(Math.random()-.5)*.4,gy,rz-ch*bk+sz*sd*hw+(Math.random()-.5)*.4);s.visible=true;s.scale.set(u.s0*.5,u.s0*.5,1)}}
  // the car's own exhaust stream: maxStreamParticles per second, pixelSize, alphaFadeRate, shapePattern and dual neon colours all come from its profile
  while(pxAcc>=1){pxAcc-=1;pxAlt=-pxAlt;const sd=pxAlt,s=PXP[pxI=(pxI+1)%PXN],u=s.userData,m=s.material;u.age=0;u.o=.7;u.life=Math.min(2.4,1.6*.85/(ex.alphaFadeRate*60))*(.85+Math.random()*.3);
   m.map=cross?PXT.cr:PXT.sq;m.color.copy(Math.random()<.6?cc.c1:cc.c2).multiplyScalar(1.25);u.s0=ex.pixelSize*(.16+.05*grow)*(.8+Math.random()*.4);
   const sc=cross?1.7:.6;u.vx=-vx*(cross?.05:.2)+(Math.random()-.5)*sc*2+sx*sd*(cross?1.8:.7);u.vz=-vz*(cross?.05:.2)+(Math.random()-.5)*sc*2+sz*sd*(cross?1.8:.7);u.vy=cross?.9+Math.random()*1.6:.25+Math.random()*.5;
   u.sp=cross?(Math.random()<.5?-1:1)*(2+Math.random()*4):0;m.rotation=cross?Math.random()*6.283:(Math.random()<.5?0:.785);
   s.position.set(rx-sh*bk+sx*sd*hw+(Math.random()-.5)*.3,gy-.1,rz-ch*bk+sz*sd*hw+(Math.random()-.5)*.3);s.visible=true;s.scale.set(u.s0,u.s0,1)}}
 for(const s of SMK){const u=s.userData;if(!s.visible)continue;u.age+=dt;const k=u.age/u.life;if(k>=1){s.visible=false;continue}
  s.position.x+=u.vx*dt;s.position.z+=u.vz*dt;s.position.y+=u.vy*dt;u.vx*=1-.8*dt;u.vz*=1-.8*dt;u.vy*=1-.5*dt;
  const z=u.s0*(.5+k*2.1);s.scale.set(z,z,1);const cd=s.position.distanceTo(cam.position);s.material.opacity=u.o*Math.pow(1-k,1.2)*Math.min(1,Math.max(.12,(cd-6)/14))}
 for(const s of PXP){const u=s.userData;if(!s.visible)continue;u.age+=dt;const k=u.age/u.life;if(k>=1){s.visible=false;continue}
  s.position.x+=u.vx*dt;s.position.z+=u.vz*dt;s.position.y+=u.vy*dt;u.vx*=1-1.2*dt;u.vz*=1-1.2*dt;u.vy*=1-.6*dt;s.material.rotation+=u.sp*dt;
  const z=u.s0*(1+.35*k),cd=s.position.distanceTo(cam.position);s.scale.set(z,z,1);s.material.opacity=u.o*(1-k)*Math.min(1,Math.max(.1,(cd-5)/12))}
 // glare streaks along the tyre tracks
 glT+=dt;if(sliding){if(glT>.04){glT=0;[-1,1].forEach((sd,i)=>{const ex=rx+sx*sd*W*.5,ez=rz+sz*sd*W*.5,pr=glPrev[i];
   if(pr){const dx=ex-pr[0],dz=ez-pr[1],l=Math.hypot(dx,dz);if(l>.15&&l<8){const m=GLR[glI=(glI+1)%GLN],u=m.userData;u.age=0;u.life=1.1+Math.min(1.2,drift.t*.4);m.material.color.copy(cc.c2).lerp(WHT,.4);m.position.set((ex+pr[0])/2,groundH(ex,ez)+.1,(ez+pr[1])/2);m.rotation.y=Math.atan2(dx,dz);m.scale.set(.2+Math.min(.25,drift.t*.08),1,l*1.15);m.visible=true}}
   glPrev[i]=[ex,ez]})}}else{glPrev[0]=glPrev[1]=null}
 for(const m of GLR){if(!m.visible)continue;const u=m.userData;u.age+=dt;const k=u.age/u.life;if(k>=1){m.visible=false;continue}m.material.opacity=.85*Math.pow(1-k,1.6)}
 // skid marks (only on road surface)
  skT+=dt;{const brk=P.gnd&&(typeof keys!=='undefined')&&(keys.KeyS||keys.ArrowDown||MobilePCInputController.isBraking)&&(vx*sh+vz*ch)>12,mk=P.gnd&&onRoad()&&(sliding||brk);
  if(mk){if(skT>.045){skT=0;[-1,1].forEach((sd,i)=>{const ex=rx+sx*sd*hw,ez=rz+sz*sd*hw,pr=skPrev[i];
   if(pr){const dx=ex-pr[0],dz=ez-pr[1],l=Math.hypot(dx,dz);if(l>.2&&l<8){const m=SKD[skI=(skI+1)%SKN],u=m.userData;u.age=0;u.life=26+Math.random()*8;u.o=sliding?.55:.38;m.position.set((ex+pr[0])/2,groundH(ex,ez)+.06,(ez+pr[1])/2);m.rotation.y=Math.atan2(dx,dz);m.scale.set(.27,1,l*1.12);m.visible=true}}
   skPrev[i]=[ex,ez]})}}else{skPrev[0]=skPrev[1]=null}}
 for(const m of SKD){if(!m.visible)continue;const u=m.userData;u.age+=dt;const k=u.age/u.life;if(k>=1){m.visible=false;continue}m.material.opacity=u.o*Math.min(1,u.age*4)*Math.min(1,(1-k)*3)}
 // peripheral blur only above the speed baseline, which scales with the Speed and Acceleration upgrade levels
 const t=tl(),thr=26*(1+.05*t[0])*(1+.06*t[1]),want=cl((v-thr)/14,0,1);fxK+=(want-fxK)*Math.min(1,dt*4);fxBlur.style.opacity=fxK<.02?0:fxK.toFixed(3)}
