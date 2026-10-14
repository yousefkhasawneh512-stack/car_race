// ---- garage shop (drift points; price doubles per upgrade) ----
const shopEl=document.getElementById('shop'),shopBody=document.getElementById('shopbody'),shopPts=document.getElementById('shoppts'),fmt=n=>n.toLocaleString('en-US');
function buyPart(i){const t=tl(),c=price(i,t[i]);if(t[i]>=MAXL||drift.total<c)return false;drift.total-=c;t[i]++;applyTune();save();return true}
function renderShop(){const t=tl();shopPts.textContent='Your Bank: '+fmt(drift.total)+' drift points · '+cur+' ['+RARN[P.rt]+' ×'+P.rm.toFixed(1)+' drift pts]';shopBody.innerHTML='';
 PARTS.forEach((pt,i)=>{const c=price(i,t[i]),mx=t[i]>=MAXL,row=document.createElement('div');row.className='row';
  row.innerHTML='<div><b>'+pt[0]+' '+pt[2]+'</b> · Level '+(t[i]+1)+(mx?' (MAX)':'')+'<br><small>'+pt[1]+(mx?'':' · Next upgrade: '+fmt(c)+' pts')+'</small></div>';
  const b=document.createElement('button');b.textContent=mx?'MAX':'Upgrade · '+fmt(c);b.disabled=mx||drift.total<c;b.onclick=()=>{buyPart(i);renderShop()};row.appendChild(b);shopBody.appendChild(row)})}
function openShop(){if(ui||Math.hypot(P.x-SHOP.x,P.z-SHOP.z)>14)return;ui=true;for(const k in keys)keys[k]=0;unfocus();renderShop();shopEl.style.display='flex'}
function closeShop(){if(shopEl.style.display!=='flex')return;ui=false;shopEl.style.display='none';unfocus()}
document.getElementById('shopx').onclick=closeShop;
// ---- shop access: the supplied TuningShopInterface, adapted. Mobile/touch devices get an on-screen TUNE CAR / CLOSE SHOP button (drawn on a 1920x1080 2D overlay, because the game canvas itself is WebGL);
// PC devices get no overlay, no listener and no button at all and use the keyboard (U or P near the garage). Both paths open the same openShop()/closeShop(), so the proximity rule and shop prices are unchanged. ----
const TuningShopInterface={
 isOpen:false,buttonBox:{x:860,y:30,width:200,height:60},ctx:null,overlay:null,dirty:true,
 // strict hardware flag: true only on touch systems
 isMobileDevice:function(){return(typeof window!=='undefined'&&('ontouchstart' in window))||(typeof navigator!=='undefined'&&((navigator.maxTouchPoints>0)||(navigator.msMaxTouchPoints>0)))},
 init:function(canvasElement){
  // SECURITY BLOCK: on a PC nothing is created and no touch listener is registered
  if(!this.isMobileDevice()){console.log("PC Environment Detected: Disabling on-screen shop touch boundaries.");return}
  console.log("Mobile Environment Confirmed: Active shop tap zones armed.");
  const ov=document.createElement('canvas');ov.id='hud2d';ov.width=DISP.w;ov.height=DISP.h;
  ov.style.cssText='position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:6';
  const sync=()=>{ov.style.width=canvasElement.style.width;ov.style.height=canvasElement.style.height};sync();addEventListener('resize',sync);
  canvasElement.insertAdjacentElement('afterend',ov);this.overlay=ov;this.ctx=crisp2d(ov.getContext('2d'));
  // mobile-only tap detection, in 1920x1080 game-canvas coordinates (capture phase on the document so the button also works over the open shop panel)
  document.addEventListener('touchstart',e=>{if(!e.touches||!e.touches.length)return;const rect=canvasElement.getBoundingClientRect(),
    px=((e.touches[0].clientX-rect.left)/rect.width)*DISP.w,py=((e.touches[0].clientY-rect.top)/rect.height)*DISP.h,b=this.buttonBox;
   if(px>=b.x&&px<=b.x+b.width&&py>=b.y&&py<=b.y+b.height)this.toggleShopMenu()},{passive:true,capture:true});
  this.dirty=true},
 toggleShopMenu:function(){
  if(shopEl.style.display==='flex')closeShop();                                    // open -> close
  else if(!ui){if(Math.hypot(P.x-SHOP.x,P.z-SHOP.z)>14)toast('🔧 Drive to Apex Drift Customs to tune your car');else openShop()}   // wheel not open
  this.isOpen=shopEl.style.display==='flex';this.dirty=true},
 drawHUDButton:function(ctx){
  // STOPS DRAWING: on a PC this returns instantly
  if(!this.isMobileDevice())return;
  ctx.save();ctx.shadowColor="#ff00bb";ctx.shadowBlur=this.isOpen?15:6;ctx.fillStyle=this.isOpen?"rgba(255, 0, 187, 0.4)":"rgba(30, 32, 35, 0.85)";ctx.strokeStyle="#ff00bb";ctx.lineWidth=3;
  ctx.fillRect(this.buttonBox.x,this.buttonBox.y,this.buttonBox.width,this.buttonBox.height);ctx.strokeRect(this.buttonBox.x,this.buttonBox.y,this.buttonBox.width,this.buttonBox.height);
  ctx.shadowBlur=0;ctx.fillStyle="#ffffff";ctx.font="bold 20px monospace";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(this.isOpen?"CLOSE SHOP":"TUNE CAR",this.buttonBox.x+(this.buttonBox.width/2),this.buttonBox.y+(this.buttonBox.height/2));ctx.restore()},
 // per frame: redraw the overlay only when the shop opens/closes (shop can also be closed by Esc or its own X)
 tick:function(){if(!this.ctx)return;const o=shopEl.style.display==='flex',sg=MobilePCInputController.sig();if(o!==this.isOpen||this.dirty||sg!==this.sg){this.isOpen=o;this.dirty=false;this.sg=sg;this.ctx.clearRect(0,0,DISP.w,DISP.h);iOSBypassEngine.drawPads(this.ctx);this.drawHUDButton(this.ctx)}}};
TuningShopInterface.init(ren.domElement);
