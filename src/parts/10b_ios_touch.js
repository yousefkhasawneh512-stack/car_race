// ---- iOS / touch compatibility: the supplied iOSBypassEngine, wired into the real car input. Armed on touch devices only (PC: nothing is created or listened to).
// Touch zones in 1920x1080 canvas coordinates (bottom band): steer left / steer right / brake / gas as supplied, plus a DRIFT (handbrake) pad above GAS because the game needs Space to drift. Drawn on the mobile overlay (#hud2d) so the player can see them. ----
const iOSBypassEngine={
 armed:false,
 initAppleFix:function(canvasElement){
  if(!TuningShopInterface.isMobileDevice()){console.log("PC Environment Detected: iOS touch driving pads not armed.");return}
  const MPC=MobilePCInputController;
  // 1. kill native swipe-to-scroll / selection / zoom / callout gestures on the game area
  canvasElement.style.touchAction="none";canvasElement.style.webkitUserSelect="none";canvasElement.style.userSelect="none";canvasElement.style.webkitTouchCallout="none";
  try{document.getElementById('map').style.pointerEvents='none'}catch(e){}            // the minimap must not swallow the left steering pad
  document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});   // Safari pinch-zoom
  // 2. map native touch lists (multitouch) to 1920x1080 game vector inputs; getBoundingClientRect() is in CSS pixels, so Retina (2x/3x) scaling cancels out
  const processAppleTouches=(e)=>{
   e.preventDefault();   // blocks iOS bounce-scroll / synthetic mouse events
   const rect=canvasElement.getBoundingClientRect();let isLeft=false,isRight=false,isGas=false,isBrake=false,isDrift=false;
   for(let i=0;i<e.touches.length;i++){const t=e.touches[i],tx=((t.clientX-rect.left)/rect.width)*DISP.w,ty=((t.clientY-rect.top)/rect.height)*DISP.h;
    if(tx<400&&ty>700)isLeft=true;if(tx>=400&&tx<800&&ty>700)isRight=true;if(tx>1500&&ty>700)isGas=true;if(tx>1200&&tx<=1500&&ty>700)isBrake=true;
    if(tx>1500&&ty>440&&ty<=700)isDrift=true}
   MPC.steeringAngle=isLeft?-1:(isRight?1:0);MPC.isAccelerating=isGas;MPC.isBraking=isBrake;MPC.isHandbrake=isDrift};
  const release=()=>{MPC.steeringAngle=0;MPC.isAccelerating=false;MPC.isBraking=false;MPC.isHandbrake=false};
  canvasElement.addEventListener("touchstart",processAppleTouches,{passive:false});
  canvasElement.addEventListener("touchmove",processAppleTouches,{passive:false});
  canvasElement.addEventListener("touchend",(e)=>{if(e.touches.length===0)release();else processAppleTouches(e)},{passive:false});
  canvasElement.addEventListener("touchcancel",release,{passive:false});               // iOS system gestures cancel touches: never leave a pedal stuck
  document.addEventListener('visibilitychange',release);addEventListener('blur',release);
  this.armed=true;console.log("iOS touch engine armed: steer/gas/brake/drift pads active.")},
 // pad overlay (called by TuningShopInterface.tick whenever pad state or shop state changes)
 drawPads:function(ctx){if(!this.armed)return;const M=MobilePCInputController;
  const pads=[['◀ LEFT',0,700,400,1080,M.steeringAngle<0],['RIGHT ▶',400,700,800,1080,M.steeringAngle>0],['BRAKE',1200,700,1500,1080,M.isBraking],['GAS',1500,700,1920,1080,M.isAccelerating],['DRIFT',1500,440,1920,700,M.isHandbrake]];
  ctx.save();ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="bold 34px monospace";
  for(const[n,x0,y0,x1,y1,on]of pads){const x=x0+16,y=y0+16,w=x1-x0-32,h=y1-y0-32,col=n==='GAS'?'#3cff9a':n==='BRAKE'?'#ff5a5a':n==='DRIFT'?'#ffd24a':'#4aa3ff';
   ctx.fillStyle=on?'rgba(255,255,255,0.34)':'rgba(20,22,26,0.28)';ctx.strokeStyle=col;ctx.globalAlpha=on?1:.75;ctx.lineWidth=on?5:3;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);
   ctx.globalAlpha=on?1:.85;ctx.fillStyle="#fff";ctx.fillText(n,x+w/2,y+h/2)}
  ctx.restore()}};
iOSBypassEngine.initAppleFix(ren.domElement);
