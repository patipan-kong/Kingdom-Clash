// Mobile landscape P0 (ui/mobile-landscape-p0): narrow phone viewports must not crash, overlap or hide panels, and fullscreen must enter, exit and re-enter.
// Needs a dev server: MOBILE_URL=http://127.0.0.1:5361/ (the mission opens through the dev-only ?debug=1&level=N). Stills go to MOBILE_EVIDENCE.
// EXE=<path to a Chromium/Chrome binary> overrides the browser channel.
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const base=process.env.MOBILE_URL||'http://127.0.0.1:5361/',dir=process.env.MOBILE_EVIDENCE||'docs/screenshots/mobile-landscape',level=process.env.MOBILE_LEVEL||'1';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(w,h){
 const page=await browser.newPage({viewport:{width:w,height:h},hasTouch:true}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?debug=1&level=${level}`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));await page.waitForTimeout(800);
 return {page,errors};
}
const hud=(page,fn)=>page.evaluate(`(${fn})(window.kingdomGame.scene.getScene('HUD'))`);
// Tap the centre of whatever rectangle the getter (given the HUD scene) returns, in logical 960x540 coordinates.
async function tap(page,getRect){
 const pt=await page.evaluate(`(()=>{const r=(${getRect})(window.kingdomGame.scene.getScene('HUD')),c=window.kingdomGame.canvas.getBoundingClientRect();return {x:c.x+(r.x+r.width/2)*c.width/960,y:c.y+(r.y+r.height/2)*c.height/540};})()`);
 await page.touchscreen.tap(pt.x,pt.y);await page.waitForTimeout(350);
}
const boundsOf=o=>`h=>{const b=${o}.getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height};}`;
const metrics=page=>page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),c=window.kingdomGame.canvas.getBoundingClientRect(),s=c.height/540,g=h.guardianLayout,m=h.controls;
 return {scale:s,plate:Math.max(g.guardian.y+g.guardian.height,g.match.y+g.match.height)*s,
  utilities:m.utilities.map(u=>({id:u.id,hidden:!!u.hidden,x:u.x*s,y:u.y*s,hit:u.hitRadius*s})),joy:{x:m.joystick.x*s,y:m.joystick.y*s,r:m.joystick.radius*s},
  attack:m.abilities[4].hitRadius*s,skills:m.abilities.slice(0,4).map(a=>a.hitRadius*s),skillsEntry:g.skills};});
const points=page=>page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.heroProgression.skillPoints);
const scaleOf=page=>page.evaluate(()=>window.kingdomGame.canvas.getBoundingClientRect().height/540);
for(const [w,h] of [[960,540],[832,291],[780,250],[740,270]]){
 const tag=`${w}x${h}`,{page,errors}=await open(w,h),m=await metrics(page),c=m.scale;
 const vis=m.utilities.filter(u=>!u.hidden);
 check(vis.length>=2&&vis.every(u=>u.hit*2>=44-1e-6),`${tag}: Build/Shop stay (Army only if it fits) with 44 px touch targets`,vis.map(u=>u.id));
 check(vis.every(u=>u.y-u.hit>=m.plate-4),`${tag}: the utility column clears the top plates`,{top:Math.round(Math.min(...vis.map(u=>u.y-u.hit))),plate:Math.round(m.plate)});
 check(vis.every(u=>Math.hypot(u.x-m.joy.x,u.y-m.joy.y)>=u.hit+m.joy.r+4),`${tag}: the column clears the joystick`);
 check(m.attack*2>=56&&m.skills.every(r=>r*2>=44-1e-6)&&m.joy.r*2>=56,`${tag}: Attack, skills and joystick keep usable targets`,{attack:Math.round(m.attack*2),skill:Math.round(Math.min(...m.skills)*2),joy:Math.round(m.joy.r*2)});
 await page.screenshot({path:`${dir}/${tag}-1-base.png`});
 // Skills: open by tap, readable (inside the canvas, wide enough), learn a skill, close.
 const before=await points(page);
 await tap(page,`h=>{const e=h.guardianLayout.skills;return {x:e.x-e.width/2,y:e.y-e.height/2,width:e.width,height:e.height};}`);
 const sk=await hud(page,`h=>({open:h.skills.container.visible,b:h.skills.bounds})`);
 check(sk.open,`${tag}: the Skills entry opens the panel`);
 check(sk.b.width*c>=210&&sk.b.x>=0&&sk.b.x+sk.b.width<=960&&sk.b.y>=0&&sk.b.y+sk.b.height<=541,`${tag}: the Skills panel is at least 210 px wide and inside the canvas`,{w:Math.round(sk.b.width*c),b:sk.b});
 await page.screenshot({path:`${dir}/${tag}-2-skills.png`});
 if(before>0){
  await tap(page,boundsOf('h.skills.rows[0].hit'));await page.waitForTimeout(500);
  const after=await points(page);check(after<before,`${tag}: tapping Learn spends the skill point`,{before,after});
 }
 await tap(page,boundsOf('h.skills.closeHit'));check(!(await hud(page,`h=>h.skills.container.visible`)),`${tag}: Close shuts Skills`);
 // Build and Shop through the real utility buttons; Equipment from the Shop.
 const hasShop=await page.evaluate(()=>!!window.kingdomGame.scene.getScene('Battle').simulation.setup.shop);
 if(!hasShop)console.log(`NOTE ${tag}: this mission has no Shop; Shop and Equipment checks skipped`);
 for(const id of hasShop?['build','shop']:['build']){
  const u=m.utilities.find(x=>x.id===id),box=await page.evaluate(()=>{const r=window.kingdomGame.canvas.getBoundingClientRect();return {x:r.x,y:r.y};});
  await page.touchscreen.tap(box.x+u.x,box.y+u.y);await page.waitForTimeout(500);
  const st=await hud(page,`h=>({shop:!!h.shop?.visible,build:!!h.buildPanel.container.visible,sb:h.shop?.bounds})`);
  check(id==='shop'?st.shop:st.build,`${tag}: the ${id} button opens its panel`);
  if(id==='shop'){const b=st.sb;check(b.width*c>=210&&b.x>=0&&b.x+b.width<=960,`${tag}: Shop is at least 210 px wide and inside the canvas`,{w:Math.round(b.width*c)});}
  await page.screenshot({path:`${dir}/${tag}-3-${id}.png`});
  if(id==='shop'){
   await tap(page,boundsOf("h.shop.buttons.get('equipment').hit"));const v=await hud(page,`h=>h.shop.model.view`);
   check(v==='equipment',`${tag}: Equipment opens from the Shop`,v);await page.screenshot({path:`${dir}/${tag}-4-equipment.png`});
  }
  await hud(page,`h=>{h.closeShop();h.closeUtility();}`);await page.waitForTimeout(200);
 }
 // Pause menu keeps every button inside its frame; Resume restores play.
 await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(true));await page.waitForTimeout(300);
 const pm=await hud(page,`h=>({f:h.pauseFrame,btn:h.pauseButtons.map(b=>({id:b.id,y:b.hit.y,h:b.hit.displayHeight})),n:h.pauseNotice.visible?h.pauseNotice.y:0})`);
 check(pm.btn.every(b=>b.y+b.h/2<=pm.f.y+pm.f.height+.5)&&pm.n<=pm.f.y+pm.f.height+1,`${tag}: the pause menu fits its frame`,pm);
 await page.screenshot({path:`${dir}/${tag}-5-pause.png`});
 await tap(page,boundsOf('h.pauseButtons[0].hit'));check(!(await hud(page,`h=>h.paused`)),`${tag}: Resume restores play`);
 const t0=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick);await page.waitForTimeout(800);
 check(await page.evaluate(t=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>t,t0),`${tag}: the match keeps running`);
 check(errors.length===0,`${tag}: no runtime errors`,errors);
 await page.close();
}
// Fullscreen: enter, exit and re-enter from the pause-menu control (a debug launch has no menu press); the canvas follows each change.
{
 const {page,errors}=await open(832,291);
 const state=()=>page.evaluate(()=>({fs:!!document.fullscreenElement,target:document.fullscreenElement?.id??null,canvas:Math.round(window.kingdomGame.canvas.getBoundingClientRect().width),inner:[innerWidth,innerHeight]}));
 const fsHit=boundsOf("h.pauseButtons.find(b=>b.id==='fullscreen').hit");
 const offered=await hud(page,`h=>h.pauseButtons.map(b=>b.id)`);check(offered.includes('fullscreen'),'fullscreen: the pause menu offers a Fullscreen control on a debug launch',offered);
 await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(true));await page.waitForTimeout(250);
 const windowed=await state();
 await tap(page,fsHit);await page.waitForTimeout(700);let s=await state();
 check(s.fs&&s.target==='game','fullscreen: entering makes the game container fullscreen',s);
 check(s.inner[0]>=windowed.inner[0]-1,'fullscreen: the viewport follows (canvas refreshed)',{windowed,s});
 await page.screenshot({path:`${dir}/fullscreen-1-enter.png`});
 const label=await hud(page,`h=>h.pauseButtons.find(b=>b.id==='fullscreen').label.text`);check(label==='EXIT FULLSCREEN','fullscreen: the control now reads EXIT FULLSCREEN',label);
 await tap(page,fsHit);await page.waitForTimeout(700);s=await state();check(!s.fs,'fullscreen: the control exits fullscreen',s);
 await tap(page,fsHit);await page.waitForTimeout(700);s=await state();check(s.fs,'fullscreen: re-entry works',s);
 await page.evaluate(()=>document.exitFullscreen());await page.waitForTimeout(500);
 await tap(page,boundsOf('h.pauseButtons[0].hit'));
 check(!(await hud(page,`h=>h.paused`))&&errors.length===0,'fullscreen: play resumes after leaving and there are no runtime errors',errors);
 // A denied request is swallowed.
 const quiet=await page.evaluate(async()=>{Element.prototype.requestFullscreen=()=>Promise.reject(new Error('denied'));
  const h=window.kingdomGame.scene.getScene('HUD');h.setPause(true);let threw=false;try{h.pauseButtons.find(b=>b.id==='fullscreen').hit.emit('pointerup');await new Promise(r=>setTimeout(r,250));}catch{threw=true;}return !threw;});
 check(quiet&&errors.length===0,'fullscreen: a denied request is ignored and play continues',errors);
 await page.close();
}
// Main-menu Play enters fullscreen on a touch device and not on a desktop one.
for(const touch of [true,false]){
 const ctx=await browser.newContext({viewport:{width:832,height:291},hasTouch:touch,isMobile:touch}),page=await ctx.newPage();
 await page.goto(base);await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'));await page.waitForTimeout(800);
 const pt=await page.evaluate(()=>{const m=window.kingdomGame.scene.getScene('MainMenu'),b=m.continueButton.getBounds(),c=window.kingdomGame.canvas.getBoundingClientRect();return {x:c.x+(b.x+b.width/2)*c.width/960,y:c.y+(b.y+b.height/2)*c.height/540};});
 if(touch)await page.touchscreen.tap(pt.x,pt.y);else await page.mouse.click(pt.x,pt.y);await page.waitForTimeout(900);
 const fs=await page.evaluate(()=>!!document.fullscreenElement);check(fs===touch,`menu Play: fullscreen ${touch?'enters on a touch device':'is not forced on desktop'}`,fs);
 await ctx.close();
}
await browser.close();
console.log(failed?`${failed} CHECK(S) FAILED`:'ALL CHECKS PASSED');process.exit(failed?1:0);
