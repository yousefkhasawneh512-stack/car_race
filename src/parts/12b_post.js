// ---- Forza-style graphics layer 2: multisampled HDR post chain = bloom -> filmic Levant grade + vignette + grain + radial speed blur (rendering only) ----
const POST={on:false,comp:null,bloom:null,fin:null,bad:0,t0:0,ema:.016};
const GRADE={uniforms:{tDiffuse:{value:null},uBlur:{value:0},uCar:{value:new T.Vector2(.5,.35)},uAsp:{value:1.6},uTime:{value:0},uNight:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float uBlur,uAsp,uTime,uNight;uniform vec2 uCar;varying vec2 vUv;
float hs(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}
void main(){vec2 uv=vUv,d=uv-uCar;vec3 c;
 // peripheral radial blur: only outside an ellipse around the player car, only when uBlur>0 (speed above the upgrade-scaled baseline)
 float m=uBlur*smoothstep(.17,.60,length(d*vec2(uAsp,1.)*vec2(.62,1.)));
 if(m>.003){vec2 dir=-d*m*.010;vec3 s=vec3(0.);for(int i=0;i<8;i++){s+=texture2D(tDiffuse,uv+dir*(float(i)/7.)).rgb;}c=s/8.;}else c=texture2D(tDiffuse,uv).rgb;
 // filmic shoulder: untouched below .8, soft roll-off for HDR highlights (sun, lamps, glass glints)
 vec3 hi=max(c-.8,0.);c=min(c,vec3(.8))+.2*(1.-exp(-hi/.2));
 // Levant summer grade: +contrast, +saturation, teal-ish shade / sun-baked warm light
 c=(c-.5)*1.14+.5;c=max(c,0.);float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,1.12);
 c*=mix(vec3(.955,.99,1.045),vec3(1.055,1.005,.925),smoothstep(.12,.78,l));
 c=mix(c,c*vec3(.92,.97,1.12),uNight*.5);
 float v=smoothstep(1.12,.30,length((uv-.5)*vec2(uAsp*.82,1.)));c*=mix(.70,1.,v);
 c+=(hs(uv*1280.+uTime*61.)-.5)*.016;
 gl_FragColor=vec4(c,1.);}`};
(function(){if(!GFX.on)return;try{
 const w=DISP.w,h=DISP.h,pr=1;let hdr=false;
 try{hdr=!!(ren.extensions.has('EXT_color_buffer_float')||ren.extensions.has('EXT_color_buffer_half_float'))}catch(e){}
 const mk=hd=>new T.WebGLMultisampleRenderTarget(w*pr,h*pr,{type:hd?T.HalfFloatType:T.UnsignedByteType,format:T.RGBAFormat,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
 const rt0=mk(hdr);try{rt0.samples=Math.min(4,ren.getContext().getParameter(ren.getContext().MAX_SAMPLES)||4)}catch(e){}const comp=new T.EffectComposer(ren,rt0);comp.setPixelRatio&&comp.setPixelRatio(pr);comp.setSize(w,h);
 const rp=new T.RenderPass(scene,cam),bl=new T.UnrealBloomPass(new T.Vector2(w/2,h/2),.42,.55,hdr?1.1:.92),fin=new T.ShaderPass(GRADE);
 comp.addPass(rp);comp.addPass(bl);comp.addPass(fin);POST.comp=comp;POST.bloom=bl;POST.fin=fin;POST.on=true;POST.hdr=hdr;
 ren.domElement.style.filter='';fxBlur.style.display='none';
}catch(e){POST.on=false;POST.err=String(e)}})();
const pv=new T.Vector3();
function postLegacy(){POST.on=false;ren.domElement.style.filter='contrast(1.15) saturate(1.1) sepia(.06)';fxBlur.style.display=''}
function gfxRender(){
 if(!POST.on){ren.render(scene,cam);return}
 const now=performance.now(),dtm=(now-POST.t0)/1000;POST.t0=now;
 pv.set(P.x,P.y+.9,P.z).project(cam);GRADE.uniforms.uCar.value.set(pv.x*.5+.5,pv.y*.5+.5);
 GRADE.uniforms.uAsp.value=DISP.w/DISP.h;GRADE.uniforms.uBlur.value=fxK<.02||A11Y.rm?0:fxK;GRADE.uniforms.uTime.value=clock%100;
 GRADE.uniforms.uNight.value=1-SKYU.uDay.value;
 if(POST.hdr){winMat.emissive.multiplyScalar(1.45);glassMat.emissive.copy(winMat.emissive);if(facMat)FACU.uFacNight.value*=1.45}
 try{POST.comp.render()}catch(e){POST.err=String(e);postLegacy();ren.render(scene,cam);return}
 // adaptive quality: if the frame time stays high, drop bloom first, then the whole post chain (CSS grade fallback)
 if(!window.__NOAQ&&dtm<.5){POST.ema+=(dtm-POST.ema)*.05;if(POST.ema>.036)POST.bad++;else POST.bad=Math.max(0,POST.bad-2);
  if(POST.bad>150){POST.bad=0;if(POST.bloom.enabled!==false){POST.bloom.enabled=false}else postLegacy()}}}
