import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
let checks=0;
const check=(ok,label)=>{assert.ok(ok,label);checks++;console.log('PASS '+label);};
for(const channel of ['chrome','msedge']){
 const browser=await chromium.launch({channel,headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 try{for(const mobile of [false,true])for(const [width,height] of [[844,390],[960,540]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?3:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));const name=`${channel} ${mobile?'touch DPR3':'mouse DPR1'} ${width}x${height}`;
  await page.goto(process.env.PROTOTYPE_URL||'http://127.0.0.1:5187/?encounter=extended');
  await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD').utilities?.length===3);
  await page.waitForFunction(()=>{const g=window.kingdomGame,r=g.canvas.getBoundingClientRect(),b=g.scale.canvasBounds;return r.height>0&&Math.abs(r.x-b.x)<1&&Math.abs(r.width-b.width)<1;});
  async function press(kind,id){const pt=await page.evaluate(({kind,id})=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),object=kind==='utility'?h.utilities.find(u=>u.id===id).hit:kind==='shop'?h.shop.buttons.get(id).hit:h.buildHits[id],b=object.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},{kind,id});if(mobile)await page.touchscreen.tap(pt.x,pt.y);else await page.mouse.click(pt.x,pt.y);await page.waitForTimeout(80);}
  const state=()=>page.evaluate(()=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),s=g.scene.getScene('Battle').simulation;return{shop:h.shop.visible,build:h.utilityPanel.visible,kind:h.buildKind,mode:h.utilityMode,scale:s.clock.timeScale,paused:s.clock.paused,activations:h.utilities.map(u=>u.activations),slots:s.state.inventory.slots.filter(Boolean).length,gold:s.state.gold,view:h.shop.model.view};});
  await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').setHeroPosition(450,600));
  await press('utility','shop');let s=await state();check(s.shop&&!s.build&&s.scale===.25&&s.activations[1]===1,name+' one tap opens Shop once');
  check(await page.evaluate(()=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),r=g.canvas.getBoundingClientRect(),f=h.shop.bounds,scale=r.height/540,buttons=[...h.shop.buttons.values()].filter(b=>b.hit.visible);const css=getComputedStyle(g.canvas);return h.shop.container.visible&&h.shop.container.alpha===1&&h.shop.container.depth===600&&css.display!=='none'&&css.visibility==='visible'&&document.elementFromPoint(r.x+f.x*scale,r.y+f.y*scale)===g.canvas&&f.y>=h.topHudBottom&&(540-f.y-f.height)*scale>=23.9&&buttons.every(b=>{const q=b.hit.getBounds();return q.width*scale>=47.9&&q.height*scale>=47.9&&q.left>=f.x-.1&&q.right<=f.x+f.width+.1&&q.top>=f.y-.1&&q.bottom<=f.y+f.height+.1;});}),name+' Shop computed bounds, depth, canvas visibility and 48px targets');
  await press('shop','iron-sword');await page.waitForFunction(()=>!window.kingdomGame.scene.getScene('HUD').shop.model.pending);s=await state();check(s.slots===1&&s.gold===50,name+' product touch purchases exactly one Sword');
  await press('shop','equipment');check((await state()).view==='equipment',name+' Equipment navigation receives input');
  await press('shop','close');s=await state();check(!s.shop&&s.scale===1,name+' Close restores normal timeScale');
  await press('utility','build');s=await state();check(s.build&&!s.shop&&s.scale===.25&&s.activations[0]===1,name+' one tap opens Build once');
  check(await page.evaluate(()=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),r=g.canvas.getBoundingClientRect(),scale=r.height/540;return h.utilityPanel.visible&&h.utilityPanel.alpha===1&&h.utilityPanel.depth===100&&h.buildHits.every(hit=>{const b=hit.getBounds();return b.width*scale>=47.9&&b.height*scale>=47.9&&b.left>=0&&b.right<=960&&b.top>=h.topHudBottom&&(540-b.bottom)*scale>=23.9;});}),name+' Build computed bounds, depth and 48px targets');
  await press('build',0);check((await state()).kind==='wall',name+' Build Wall selection receives input');
  await press('build',3);s=await state();check(!s.build&&s.scale===1,name+' Build Cancel closes without construction');
  await press('utility','build');await press('utility','shop');s=await state();check(s.shop&&!s.build&&s.scale===.25,name+' Build to Shop preserves exclusive quarter-speed mode');
  await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(true));s=await state();check(s.paused&&!s.shop&&!s.build,name+' Pause freezes and closes panels');await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(false));check(!(await state()).paused&&(await state()).scale===1,name+' Resume restores normal speed');
  if(mobile){
   const cdp=await page.context().newCDPSession(page),points=await page.evaluate(()=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),r=g.canvas.getBoundingClientRect(),j=h.controls.joystick,u=h.utilities.find(u=>u.id==='shop'),point=(x,y,id)=>({x:r.x+x*r.width/960,y:r.y+y*r.height/540,id});return[point(j.x+20,j.y,1),point(u.x,u.y,2)];});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});await page.waitForTimeout(60);check(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').stickPointer!==null),name+' joystick owns a live touch');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await page.waitForTimeout(60);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(80);check(await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return h.shop.visible&&h.stickPointer===null;}),name+' second touch opens Shop and safely releases joystick');await cdp.detach();await press('shop','close');
   // Rotate and apply safe insets without introducing extension-specific transforms.
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);check((await state()).paused,name+' portrait freezes');await page.setViewportSize({width,height});await page.evaluate(()=>{const e=document.getElementById('game');for(const [key,value] of Object.entries({left:32,right:12,top:8,bottom:12}))e.style.setProperty('--safe-'+key,value+'px');});await page.waitForTimeout(200);await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(false));await press('utility','shop');check((await state()).shop,name+' landscape return with safe insets opens Shop');await press('shop','close');
  }
  check(errors.length===0,name+' no browser errors');await page.close();
 }}finally{await browser.close();}
}
console.log(`PASS ${checks} focused popup checks; exact simulator extension and physical devices not tested`);
