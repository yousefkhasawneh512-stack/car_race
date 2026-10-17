// ---- facade layer: every ordinary building is an instanced box whose walls/roof are drawn by a procedural facade shader
// (bays, windows, frames, sills, arches, balconies, stone coursing, shopfronts, roller shutters, AC units, parapets, night lights).
// Style codes: 1 old-town stone row house, 2 shopfront block, 3 apartment block, 4 house, 5 villa, 6 institutional ribbon, 7 garage/industrial, 8 office
const FACU={uFacNight:{value:0}};
const FACQ=(typeof navigator!=='undefined'&&/Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent))?0:1;   // 0 = lite shader on phones
const FACI=[];
const FAC_DECL=`#define FACQ ${FACQ}
uniform float uFacNight;
varying vec3 vFL;flat varying vec3 vFS;flat varying vec3 vFN;flat varying vec4 vFT;
float fH1(float n){return fract(sin(n*127.1)*43758.5453);}
float fH2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float fIn(float v,float a,float b,float w){return smoothstep(a-w,a+w,v)-smoothstep(b-w,b+w,v);}
void facPat(float gd,inout vec3 col,out float gl,out vec3 em,out float ht){
 gl=0.;em=vec3(0.);ht=0.;
 float sty=vFT.x,sd=vFT.y,fr=vFT.z,vr=vFT.w;vec3 N=normalize(vFN);
 float H=vFS.y,hv=(vFL.y+.5)*H;
 float aw=clamp(max(max(fwidth(vFL.x*vFS.x),fwidth(vFL.z*vFS.z)),fwidth(hv))*1.3,.012,.6);
 float blur=smoothstep(.05,.35,aw);
 #define FS(v,per) mix(step(.5,fract((v)/(per))),.5,smoothstep(.1,.35,aw/(per)))
 int s=int(sty+.5);
 if(N.y>.5){
  vec2 q=vec2(vFL.x*vFS.x,vFL.z*vFS.z);float ed=min(.5*vFS.x-abs(q.x),.5*vFS.z-abs(q.y));
  float isP=1.-smoothstep(.2,.2+aw,ed);
  vec3 rc=mix(vec3(.47,.46,.44),vec3(.30,.30,.31),step(.55,fract(sd*7.3)))*(.86+.28*fH2(floor(q/1.7)+sd*9.));
  if((s==4||s==5)&&vr>.5){float tl=FS(q.x,.34);rc=vec3(.56,.27,.19)*(.82+.3*mix(fH2(floor(q/.34)),.5,blur))*(.86+.14*tl);}
  col=mix(rc,col*1.06,isP);ht=isP*.22;return;}
 if(N.y<-.5)return;
 bool fb=abs(N.z)>.5;
 float u=fb?vFL.x*vFS.x:vFL.z*vFS.z;float W=fb?vFS.x:vFS.z;
 float isFront=(fb&&N.z*fr>0.)?1.:0.;float isBack=(fb&&isFront<.5)?1.:0.;
 float uu=u+.5*W;
 float bw=3.3,fh=3.1,g0=3.3,Wm=1.25,Hm=1.5,Sm=.95;float stone=0.;
 if(s==1){bw=3.2;fh=3.1;g0=3.4;Wm=1.0;Hm=1.55;Sm=.9;stone=1.;}
 else if(s==2){bw=3.0;fh=3.1;g0=vr>0.?vr+1.2:4.2;Wm=1.4;Hm=1.45;Sm=.9;}
 else if(s==3){bw=3.6;fh=3.15;g0=3.6;Wm=1.5;Hm=1.55;Sm=.85;stone=.75;}
 else if(s==4){bw=3.8;fh=3.0;g0=3.0;Wm=1.2;Hm=1.4;Sm=.9;stone=.5;}
 else if(s==5){bw=4.2;fh=3.3;g0=3.4;Wm=1.4;Hm=1.9;Sm=.8;stone=.7;}
 else if(s==6){bw=2.3;fh=3.4;g0=3.4;Wm=1.7;Hm=1.55;Sm=1.0;}
 else if(s==7){bw=3.4;fh=3.4;g0=4.4;Wm=1.0;Hm=.6;Sm=2.5;}
 else {bw=2.8;fh=3.5;g0=3.5;Wm=1.9;Hm=1.6;Sm=1.05;}
 float n=max(1.,floor(W/bw+.5));float bwr=W/n;float iu=floor(uu/bwr);float fu=uu/bwr-iu;float x=(fu-.5)*bwr;
 float special=(s==2||s==7)?1.:0.;
 float onG=step(hv,g0);
 float fi=onG>.5?0.:1.+floor((hv-g0)/fh);
 float y=onG>.5?hv:(hv-g0)-(fi-1.)*fh;
 float wh=fH2(vec2(iu*1.7+sd*57.,fi*3.1+sd*13.));
 float topc=step(hv,H-.45);
 float winOn=(isFront>.5?1.:(isBack>.5?step(.35,wh):((s==1)?0.:step(.6,wh))))*topc;
 // balcony bay (apartments, villas) turns the window into a French door with a railing
 float bal=0.;
 if((s==3||s==5)&&fi>=1.&&isFront>.5)bal=step(.32,fH2(vec2(iu*9.1+sd*5.,fi*2.+1.)));
 float Sm2=bal>.5?.12:Sm,Hm2=bal>.5?2.15:Hm;
 // door bay on the ground floor (front only)
 float di=(s==1)?floor(fH1(sd*11.)*n):floor(n*.5);
 float isDoorBay=(onG>.5&&isFront>.5&&iu==di&&(s==1||s==3||s==4||s==5))?1.:0.;
 float winPlain=winOn*(1.-isDoorBay);
 // ---------- wall surface ----------
 vec3 wall=col*.9;
 if(stone>0.){
  float near=(1.-smoothstep(22.,60.,gd))*(1.-smoothstep(.06,.2,aw/.28));
  float cy=hv/.28;float ci=floor(cy);float off=fH1(ci+sd*7.)*.9;float cx=(uu+off)/.74;float bi=floor(cx);
  float mort=max(1.-smoothstep(0.,.08,fract(cy)),1.-smoothstep(0.,.05,fract(cx)));
  float tn=fH2(vec2(bi,ci+sd*3.))-.5;
  wall*=1.-near*stone*(.20*mort-tn*.16);ht-=near*stone*mort*.012;
  if(s==1){float quo=step(W*.5-.5,abs(u));wall=mix(wall,wall*(.78+.3*FS(hv,.7)),quo*near);}
 }
 float stk=gN2(vec2(uu*.7+sd*40.,hv*.05));wall*=1.-.10*smoothstep(.55,.9,stk)*(1.-blur);
 wall*=1.-.30*(1.-smoothstep(0.,1.3,hv));
 if(hv<.5)wall*=.8;
 if(s==3&&onG>.5)wall=mix(wall,wall*vec3(.88,.84,.78),.6);
 if(s==7){float rib=FS(uu,.24);wall=mix(wall,wall*(.82+.18*rib),step(1.2,hv)*(1.-blur));if(hv<1.2)wall*=.8;}
 if(s==6||s==8){float band=fIn(hv,g0-.25,g0+.05,aw)+fIn(hv-g0,fh-.25,fh+.05,aw);wall=mix(wall,wall*.86,clamp(band,0.,1.));}
 col=wall;
 // ---------- floor lines ----------
 if(fi>=1.&&special<.5){float fl=fIn(y,-.05,.17,aw);col=mix(col,col*1.1,fl);ht+=fl*.05;}
 // ---------- windows ----------
 float wm=0.;vec3 inner=vec3(0.);float curt=0.,blind=0.,shut=0.;
 if(winPlain>.01&&(onG<.5||special<.5)){
  float yy=y;
  float ar=Wm*.5,wtop=Sm2+Hm2;
  float inX=1.-smoothstep(Wm*.5-aw,Wm*.5+aw,abs(x));
  float upper=wtop;
  if(s==1||s==5){float ax=min(abs(x),ar);float ay=wtop-ar+sqrt(max(ar*ar-ax*ax,0.));upper=(yy>wtop-ar)?ay:wtop+1.;}
  float inY=fIn(yy,Sm2,upper,aw);
  wm=inX*inY*winPlain;
  float fw=.09;
  float inX2=1.-smoothstep(Wm*.5+fw-aw,Wm*.5+fw+aw,abs(x));
  float outr=inX2*fIn(yy,Sm2-fw,upper+fw,aw)*winPlain;
  float frame=clamp(outr-wm,0.,1.);
  float sur=0.;
  if(s==1||s==5){float inX3=1.-smoothstep(Wm*.5+.2-aw,Wm*.5+.2+aw,abs(x));sur=clamp(inX3*fIn(yy,Sm2-.2,upper+.2,aw)*winPlain-outr,0.,1.);}
  float sill=fIn(yy,Sm2-.13,Sm2-.02,aw)*(1.-smoothstep(Wm*.5+.14-aw,Wm*.5+.14+aw,abs(x)))*winPlain;
  vec3 gcol=vec3(.10,.15,.20)*(.8+.5*wh);
  curt=step(wh,.24);blind=step(.24,wh)*step(wh,.38);shut=(s==1||s==4)?step(.8,wh):0.;
  inner=gcol;
  inner=mix(inner,vec3(.60,.52,.40)*(.55+.5*fH1(iu+fi*7.)),curt*.85);
  inner=mix(inner,vec3(.50,.50,.46)*(.6+.4*FS(yy,.111)),blind);
  vec3 shc=mix(vec3(.17,.30,.21),vec3(.34,.20,.12),step(.5,fH1(sd*5.)))*(.78+.22*FS(yy,.077));
  inner=mix(inner,shc,shut);
  vec3 fc=mix(vec3(.84,.84,.82),vec3(.27,.21,.17),step(.6,fH1(sd*9.+iu*0.)));
  col=mix(col,col*1.16+.02,sur);col=mix(col,vec3(.78,.74,.66),sill);
  col=mix(col,fc,frame*(1.-blur*.4));col=mix(col,inner,wm);
  ht+=-.09*wm+.03*sur+.07*sill;
  gl=wm*(1.-curt*.9)*(1.-shut);
  // night light behind the glass
  float lit=step(.56,fH2(vec2(iu*2.3+sd*31.,fi*4.7+3.)));
  vec3 lc=mix(vec3(1.,.78,.46),vec3(.72,.86,1.),step(.82,fH1(iu*5.+fi*3.+sd)));
  em+=lc*(.5+.5*fH1(iu*5.+fi))*lit*wm*(1.-shut)*(1.-blind*.5);
  // AC condenser on the wall beside some windows
  #if FACQ
  if(wh>.55&&wh<.78&&s!=6&&s!=7&&isFront>.5){float acx=1.-smoothstep(.33-aw,.33+aw,abs(x-(Wm*.5+.62)));float acy=fIn(yy,Sm2,Sm2+.5,aw);float ac=acx*acy*winPlain;
   col=mix(col,vec3(.80,.81,.80)*(.9+.2*FS(yy,.071)),ac);ht+=ac*.2;}
  #endif
  // balcony slab + railing
  if(bal>.5){float bx=1.-smoothstep(bwr*.46-aw,bwr*.46+aw,abs(x));
   float slab=fIn(yy,-.04,.18,aw)*bx;float rail=fIn(yy,.18,1.02,aw)*bx;float bars=mix(step(.36,fract(x/.13)),.6,smoothstep(.1,.35,aw/.13));
   float hand=fIn(yy,.95,1.04,aw)*bx;
   col=mix(col,wall*.9+.05,slab);col=mix(col,vec3(.16,.16,.18),clamp(rail*bars*.8+hand,0.,1.));ht+=slab*.2+rail*bars*.1;}
 }
 // ---------- ground-floor specials ----------
 if(onG>.5&&isFront>.5&&special<.5&&isDoorBay>.5){
  float dw=(s==1)?.78:.6;float dtop=(s==1||s==5)?2.1:2.3;
  float dm=(1.-smoothstep(dw-aw,dw+aw,abs(x)))*fIn(hv,-1.,dtop,aw);
  if(s==1||s==5){float ax=min(abs(x),dw);float arc=dtop-dw+sqrt(max(dw*dw-ax*ax,0.));dm=(1.-smoothstep(dw-aw,dw+aw,abs(x)))*fIn(hv,-1.,(hv>dtop-dw)?arc:dtop+1.,aw);}
  vec3 dc=(s==3)?vec3(.06,.09,.12):mix(vec3(.30,.18,.10),vec3(.86,.85,.82),step(.7,fH1(sd*3.)))*(.85+.15*FS(x,.143));
  col=mix(col,dc,dm);ht-=dm*.12;if(s==3)gl=max(gl,dm*.8);
  float stp=fIn(hv,.0,.18,aw)*(1.-smoothstep(dw+.2-aw,dw+.2+aw,abs(x)));col=mix(col,vec3(.55),stp);
  em+=vec3(1.,.8,.5)*dm*step(.5,fH1(sd*13.))*(s==3?1.:.0)*.6;
 }
 if(s==2&&onG>.5&&(isFront>.5)){
  float gt=vr>0.?vr:3.0;
  float sfX=1.-smoothstep(W*.5-.3-aw,W*.5-.3+aw,abs(u));
  float sf=sfX*fIn(hv,.28,gt,aw);
  float n2=max(2.,floor(W/1.8));float pw=W/n2;float mull=1.-smoothstep(.025,.025+aw,abs(fract(uu/pw+.5)-.5)*pw);
  float dpos=(fH1(sd*3.)-.5)*max(W-3.,0.);float dr=(1.-smoothstep(.55-aw,.55+aw,abs(u-dpos)))*fIn(hv,-1.,2.4,aw);
  float closed=step(.76,sd);
  vec3 interior=vec3(.10,.13,.14)+vec3(.20,.17,.12)*FS(hv+.1,.476)*fIn(hv,.5,2.6,.05)*(.6+.8*mix(fH2(floor(vec2(uu*2.,hv*2.))),.5,blur));
  vec3 shutC=vec3(.52,.53,.50)*(.78+.22*FS(hv,.071));
  vec3 fc2=mix(vec3(.25,.26,.28),vec3(.78,.78,.76),step(.5,fH1(sd*21.)));
  col=mix(col,closed>.5?shutC:interior,sf);
  col=mix(col,fc2,clamp(sf*mull+sf*dr*.0,0.,1.)*(1.-closed)*(1.-blur*.5));
  col=mix(col,vec3(.12,.13,.14),dr*(1.-closed)*sf);
  ht+=-.1*sf*(1.-closed)+.04*mull*sf;
  gl=max(gl,sf*(1.-closed)*.85);
  float shopLit=step(.12,fH1(sd*17.))*(1.-closed);
  em+=mix(vec3(1.,.82,.55),vec3(.8,.92,1.),step(.6,fH1(sd*29.)))*sf*shopLit*(1.-mull*.7)*(.7+.3*mix(fH2(floor(vec2(uu*1.5,hv*1.5))),.5,blur))*1.15;
  // fascia band above the glass
  float fas=fIn(hv,gt,g0-.05,aw)*sfX;col=mix(col,col*.78,fas*.6);ht+=fas*.05;
 }
 if(s==7&&onG>.5&&isFront>.5){
  float rn=max(1.,floor(W/3.6));float rw=W/rn;float rx=(fract(uu/rw)-.5)*rw;float ri=floor(uu/rw);
  float open=step(.45,fH2(vec2(ri,sd*9.)));
  float rm=(1.-smoothstep(1.45-aw,1.45+aw,abs(rx)))*fIn(hv,-1.,3.2,aw)*open;
  vec3 rc2=mix(vec3(.44,.47,.52),vec3(.72,.30,.22),step(.5,fH1(sd*4.+ri)))*(.78+.22*FS(hv,.143));
  col=mix(col,rc2,rm);ht-=.07*rm;
 }
}
`;
const facMat=GFX.on?gfxPatch(gfxReg(new T.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:0,envMapIntensity:.6})),'fac'):null;
// one facade box: x,y(centre),z,ry,sx,sy,sz,colour, style, front sign (local z of the street side), variant (glass top for style 2, else random)
function bldF(x,y,z,ry,sx,sy,sz,col,sty,fr,vr){if(GFX.on&&facMat)FACI.push([x,y,z,ry,sx,sy,sz,col,sty,Math.random(),fr,vr===undefined?Math.random():vr]);else BOXI.push([x,y,z,ry,sx,sy,sz,col])}
function instF(items){if(!items.length||!facMat)return;chunkBy(items,(L,cx,cz)=>{const g=new T.BoxGeometry(1,1,1);g.boundingSphere=BS;const at=new Float32Array(L.length*4),m=new T.InstancedMesh(g,facMat,L.length);m.frustumCulled=true;
 L.forEach((p,i)=>{o3.position.set(p[0]-cx,p[1],p[2]-cz);o3.rotation.set(0,p[3]||0,0);o3.scale.set(p[4]||1,p[5]||1,p[6]||1);o3.updateMatrix();m.setMatrixAt(i,o3.matrix);m.setColorAt(i,tc.setHex(p[7]));at[i*4]=p[8];at[i*4+1]=p[9];at[i*4+2]=p[10];at[i*4+3]=p[11]});
 g.setAttribute('aSty',new T.InstancedBufferAttribute(at,4));m.position.set(cx,0,cz);m.castShadow=true;m.receiveShadow=true;scene.add(m)})}
