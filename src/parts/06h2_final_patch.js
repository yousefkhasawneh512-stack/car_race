// ---- final missing-places patch: the five requested places. Four already exist as hand-anchored landmarks (06g2_lm.js / 06f_pois.js) and are left exactly where they are;
// the one that was missing (Vogo Cafe) is built here, AFTER the seeded generators, on University Street beside MK Mart. No PR() call, so no procedural coordinate moves. ----
const final_missing_places_patch=[
 {id:"vogo_cafe",name:"Vogo Cafe",zone:"University Street Corridor",type:"Premium Neon Student Lounge & Cafe",description:"A high-density glowing social hub positioned right along the main student strip, heavily illuminated with custom cyan wireframe fixtures."},
 {id:"dar_as_saraya_museum",name:"Dar As Saraya Ottoman Museum",zone:"Al-Balad Old Core / Top of Irbid Hill",type:"Historical Ottoman Citadel Landmark",description:"Built originally as an Ottoman castle and prison in 1886. Features heritage stone archways and sharp 3D vector-edge brick layouts."},
 {id:"irbid_clock_tower_square",name:"Clock Tower Square",zone:"Downtown Market Center",type:"Central Roundabout & Tower Monument",description:"The absolute landmark focal point of the historic old town, serving as a complex radial intersection grid node."},
 {id:"eimar_irbid_park",name:"Emaar Irbid Park",zone:"Northern Residential Districts",type:"Premium Public Green Space Arena",description:"Clean municipal park layout featuring sharp neon perimeter vector borders and concrete walkways."},
 {id:"summit_international_academy",name:"Summit International Academy",zone:"Al-Husn Street Sector",type:"Private Institutional Multi-Building Campus",description:"A prominent private secondary education complex providing a highly recognizable architectural grid asset."}];
const FMP_OK=[],FMP_SKIP=[],FMP_FAIL=[];
const VOGO_N=GFX.on?new T.MeshBasicMaterial({color:new T.Color(.1,2.4,2.8)}):BMB(0x19e6ff);
function wireCube(g,x,y,z,s){const h=s/2,t=.06;for(const a of[-h,h])for(const b of[-h,h]){BX(g,s,t,t,VOGO_N,x,y+a,z+b);BX(g,t,s,t,VOGO_N,x+a,y,z+b);BX(g,t,t,s,VOGO_N,x+a,y+b,z)}}
function buildVogoCafe(it){const w=16,d=12,set=12;let S;
 const anchors=[790,560,1000,300].concat(Array.from({length:15},(_,i)=>100+i*90).sort((a,b)=>Math.abs(a-790)-Math.abs(b-790))).map(t=>['University Street',...U(t)]);
 try{S=siteTry(anchors,w,d,set,{pad:1.2})}catch(e){S=siteTry(anchors,12,10,8,{pad:1})}
 const g=S.g,N=VOGO_N,front=-d/2;
 BX(g,w,7,d,0x1b2027,0,3.5,0);BX(g,w+.2,.5,d+.2,0x2a3039,0,.25,0);                                          // body + plinth
 BX(g,12.6,3.6,.1,0x0b3a46,0,2.4,front+.1);BX(g,13,4.2,.4,GLM,0,2.4,front-.12);                              // lit interior panel behind the glass front
 for(const zz of[.6,1.8,3])BX(g,12,.1,.1,N,0,4.3,front+zz);                    // interior ceiling light rows
 BX(g,w+.8,.5,d+.8,0x0d1014,0,7.25,0);for(const k of[-1,1]){BX(g,w+.8,.1,.1,N,0,7.55,k*(d/2+.4));BX(g,.1,.1,d+.8,N,k*(w/2+.4),7.55,0)}   // roof slab + neon outline
 for(const k of[-1,1])BX(g,.1,7,.1,N,k*w/2,3.5,front-.05);BX(g,w,.08,.1,N,0,.3,front-.05);                  // wireframe corner edges + base strip
 BX(g,w,.25,3.6,0x0d1014,0,4.95,front-1.8);BX(g,w,.08,.08,N,0,4.95,front-3.6);for(const k of[-1,1]){CY(g,.1,.1,4.9,0x14171c,k*(w/2-.5),2.45,front-3.3,6);addPos(S,k*(w/2-.5),front-3.3,.5)}   // canopy
 BX(g,w+2,.12,6,0x6d7078,0,.07,front-3);BX(g,w+2,.06,.1,N,0,.14,front-6);                                    // terrace + neon kerb
 for(let i=0;i<4;i++){const tx=-6+i*4;CY(g,.7,.7,.08,0xe8eaed,tx,1,front-3.2,12);CY(g,.07,.07,1,0x2a2d33,tx,.5,front-3.2,6);for(const k of[-1,1]){CY(g,.3,.3,.5,0x18c8e0,tx+k*1.1,.3,front-3.2,8)}}
 for(const x of[-5,0,5])wireCube(g,x,4.2,front-2.2,.8);                                                       // hanging cyan wireframe fixtures
 const px=w/2+3,pz=front-2;BX(g,1.4,11,1.2,0x14171c,px,5.5,pz);for(const k of[-1,1])BX(g,.08,11,.08,N,px+k*.72,5.5,pz-.62);BX(g,1.6,.1,.1,N,px,11.1,pz-.62);addPos(S,px,pz,1.2);   // roadside pylon
 signAt(g,'VOGO CAFE',px,12.6,pz-.9,18);signAt(g,'VOGO CAFE',0,6.2,front-.9,15);signAt(g,'NEON STUDENT LOUNGE',0,5.4,front-.9,10);
 const p=poiAt(S,it.name,{r:24,kind:'cafe',tag:it.zone,sub:it.type+' · '+it.zone,tour:false});p.alias='vogo cafe student lounge neon coffee';SPAWNKEEP.push([S.cx,S.cz,20]);return S}
const FMP_BUILD={vogo_cafe:buildVogoCafe};
function runFinalPatch(){for(const it of final_missing_places_patch){
 if(PLACES.some(p=>p.name===it.name)){FMP_SKIP.push(it.name);continue}      // already hardcoded in its zone: never duplicated or moved
 if(REALP&&/^(vogo_|summit_)/.test(it.id)){FMP_SKIP.push(it.name);continue}   // v35: not in OSM; the real "Vogo" restaurant is a registered real place
 try{const b=FMP_BUILD[it.id];if(!b)throw new Error('no builder');b(it);FMP_OK.push(it.name)}catch(e){FMP_FAIL.push(it.name+': '+(e&&e.message||e))}}}
runFinalPatch();
