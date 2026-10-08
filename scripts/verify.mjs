import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const errors=[],runtimeErrors=[],requests=[],checks=[];const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true});
const runtimeError=value=>{errors.push(value);runtimeErrors.push(value);};
page.on('pageerror',e=>runtimeError(e.message));page.on('console',m=>{if(m.type()==='error')runtimeError(m.text());});page.on('response',r=>{if(r.status()>=400)runtimeError(`${r.status()} ${r.url()}`);});page.on('request',r=>requests.push(r.url()));
const url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5173/';
function check(ok,name){checks.push({name,passed:ok});if(!ok)errors.push(name);}
const state=()=>page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),h=window.kingdomGame.scene.getScene('HUD'),c=b.cameras.main;return {hero:{x:b.hero.x,y:b.hero.y},camera:{x:c.scrollX,y:c.scrollY,width:c.width,height:c.height},world:b.getCameraWorld(),casts:b.castCount,paused:h.paused,abilities:h.abilities.map(a=>({id:a.id,x:a.x,y:a.y,radius:a.visibleRadius,hitRadius:a.hitRadius,remaining:a.remaining,pressed:a.pressed,disabled:a.disabled})),utilities:h.utilities.map(a=>({id:a.id,x:a.x,y:a.y,radius:a.visibleRadius,hitRadius:a.hitRadius,pressed:a.pressed,disabled:a.disabled,activations:a.activations})),mapFrame:h.mapFrame,map:{x:h.mapHero.x,y:h.mapHero.y}};});
async function layoutCheck(size){
 const result=await page.evaluate(()=>{
  const h=window.kingdomGame.scene.getScene('HUD'),r=document.querySelector('canvas').getBoundingClientRect(),scale=r.height/540;
  const bottom=[...h.utilities,...h.abilities];
  const controls=[{x:104,y:447,hitRadius:65},...bottom,{x:770,y:46,hitRadius:34}];
  const pairs=controls.every((a,i)=>controls.slice(i+1).every(b=>Math.hypot(a.x-b.x,a.y-b.y)>a.hitRadius+b.hitRadius));
  const visible=bottom.every((a,i)=>bottom.slice(i+1).every(b=>Math.hypot(a.x-b.x,a.y-b.y)>a.visibleRadius*(1+5/a.radius)+b.visibleRadius*(1+5/b.radius)));
  const inside=controls.every(a=>a.x-a.hitRadius>=0&&a.y-a.hitRadius>=0&&a.x+a.hitRadius<=960&&a.y+a.hitRadius<=540);
  const f=h.mapFrame;
  return {pairs,visible,inside,circular:bottom.every(a=>a.hit.input.hitArea.type===0&&a.hit.input.hitArea.radius===a.hitRadius),targets:bottom.map(a=>({id:a.id,x:a.x,y:a.y,visibleDiameterCss:a.visibleRadius*2*scale,hitDiameterCss:a.hitRadius*2*scale})),utilityPx:Math.min(...h.utilities.map(a=>a.hitRadius*2*scale)),combatPx:Math.min(...h.abilities.map(a=>a.hitRadius*2*scale)),pausePx:68*scale,portraitPx:68*scale,aligned:h.utilities.every(a=>a.x===h.utilities[0].x)&&Math.abs((h.utilities[1].y-h.utilities[0].y)-(h.utilities[2].y-h.utilities[1].y))<.001,rightHand:bottom.every(a=>a.x-a.hitRadius>480),hierarchy:h.abilities[4].visibleRadius>h.abilities[3].visibleRadius&&h.utilities.every(a=>a.visibleRadius/h.abilities[0].visibleRadius>=.65&&a.visibleRadius/h.abilities[0].visibleRadius<=.75),gesture:bottom.every(a=>(540-a.y-a.hitRadius)*scale>=24-.01),
   top:12+256<336&&336+288<770-34&&770+34<f.x-4&&f.x+f.width+4===952&&f.y-4===12};
 });
 check(result.pairs&&result.visible&&result.inside&&result.aligned&&result.top&&result.circular,`${size}: aligned controls, explicit circular hit areas, no overlapping bounds`);
 check(Math.min(result.utilityPx,result.combatPx)>=48-.01,`${size}: all combat and utility targets meet 48 CSS px`);
 check(result.rightHand&&result.hierarchy&&result.gesture,`${size}: right-thumb controls, dominant Attack, 70% utilities and 24 CSS px bottom gesture inset`);
 return result;
}
await page.goto(url);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));await page.waitForTimeout(700);await mkdir('docs/screenshots',{recursive:true});
await page.screenshot({path:'docs/screenshots/battlefield-960x540.png'});
const desktopLayout=await layoutCheck('960×540');
const initial=await state();check(initial.camera.width<1920&&initial.camera.height<1152*.72,'Closer viewport covers part of the full map');
const [bash,taunt,charge,zone,attack]=initial.abilities,[build,shop]=initial.utilities;
await page.keyboard.down('d');await page.waitForTimeout(550);await page.keyboard.up('d');await page.waitForTimeout(400);const moved=await state();check(moved.hero.x>initial.hero.x&&moved.camera.x>initial.camera.x,'Camera follows moving Guardian');
check(Math.abs(moved.map.x-(812+moved.hero.x/1920*136))<.1&&Math.abs(moved.map.y-(16+moved.hero.y/1152*82))<.1,'Minimap hero coordinates map to logical world');
const boundaryResults=[];
const terrainChecks=await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return {water:b.setHeroPosition(960,430),bridge:b.setHeroPosition(960,590),tower:b.setHeroPosition(620,495),tree:b.setHeroPosition(120,160)};});
check(!terrainChecks.water&&terrainChecks.bridge&&!terrainChecks.tower&&!terrainChecks.tree,'Terrain and independent structure/scenery footprints reject blocked positions');
for(const [x,y] of [[25,25],[1895,25],[25,1127],[1895,1127]]){const valid=await page.evaluate(([x,y])=>window.kingdomGame.scene.getScene('Battle').setHeroPosition(x,y),[x,y]);await page.waitForTimeout(450);const s=await state();boundaryResults.push({x,y,valid,camera:s.camera});check(valid&&s.camera.x>=-.01&&s.camera.y>=-.01&&s.camera.x+s.camera.width<=1920.01&&s.camera.y+s.camera.height<=1152*.72+.01,`Camera clamped at world corner ${x},${y}`);}
await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').setHeroPosition(820,590));await page.waitForTimeout(450);
await page.mouse.click(937,54);await page.waitForTimeout(150);const mapLook=await state();check(mapLook.camera.x>600,'Minimap tap shifts bounded camera overview');await page.mouse.click(43,44);await page.waitForTimeout(450);check((await state()).camera.x<600,'Portrait tap returns to Guardian following');
// Pressed, cooldown and unavailable states are presentation-only.
await page.mouse.move(bash.x,bash.y);await page.mouse.down();check((await state()).abilities[0].pressed,'Skill pressed state');await page.screenshot({path:'docs/screenshots/pressed-960x540.png'});await page.mouse.up();await page.waitForTimeout(70);const cast=await state();check(cast.casts>0&&cast.abilities[0].remaining>0,'Skill activation starts presentation cooldown');await page.screenshot({path:'docs/screenshots/skill-preview-960x540.png'});
await page.mouse.click(bash.x,bash.y);check((await state()).casts===cast.casts,'Cooldown blocks repeated visual activation');
await page.mouse.click(770,46);const paused=await state();await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');const held=await state();check(held.hero.x===paused.hero.x&&held.abilities.every(a=>a.disabled)&&held.utilities.every(a=>a.disabled)&&held.abilities[0].remaining===paused.abilities[0].remaining,'Pause disables combat/utility controls and freezes movement/cooldown');await page.screenshot({path:'docs/screenshots/disabled-960x540.png'});await page.mouse.click(480,300);
// Utility state, release-outside and cancellation must never open a panel.
await page.mouse.move(build.x,build.y);await page.mouse.down();check((await state()).utilities[0].pressed,'Utility pressed state');
await page.mouse.move(590,430);await page.mouse.up();check(!(await state()).utilities[0].pressed&&(await state()).utilities[0].activations===0,'Utility outside release cancels activation');
await page.mouse.move(shop.x,shop.y);await page.mouse.down();await page.evaluate(()=>window.dispatchEvent(new Event('pointercancel')));await page.mouse.up();check(!(await state()).utilities[1].pressed&&(await state()).utilities[1].activations===0,'Utility pointer cancellation clears press without activation');
// Independent touch ownership: movement + two ability presses, release separately.
const cdp=await page.context().newCDPSession(page);const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts});
await touch('touchStart',[{x:104,y:447,id:1}]);await touch('touchMove',[{x:138,y:447,id:1}]);const touchBefore=await state();
await touch('touchStart',[{x:138,y:447,id:1},{x:taunt.x,y:taunt.y,id:2},{x:charge.x,y:charge.y,id:3}]);await page.waitForTimeout(200);const touchHeld=await state();check(touchHeld.hero.x>touchBefore.hero.x&&touchHeld.abilities[1].pressed&&touchHeld.abilities[2].pressed,'Three-pointer joystick plus two pressed skills');
await touch('touchEnd',[]);await page.waitForTimeout(70);const touchSkills=await state();check(touchSkills.abilities[1].remaining>0&&touchSkills.abilities[2].remaining>0&&!touchSkills.abilities[1].pressed&&!touchSkills.abilities[2].pressed,'Multitouch release activates both skill previews');
await touch('touchStart',[{x:104,y:447,id:1}]);await touch('touchMove',[{x:138,y:447,id:1}]);await touch('touchCancel',[]);await page.waitForTimeout(80);const cancelled=await state();await page.waitForTimeout(100);check((await state()).hero.x===cancelled.hero.x,'Touch cancel releases joystick');
await page.mouse.click(build.x,build.y);await page.mouse.click(345,388);await page.mouse.click(550,309);await page.screenshot({path:'docs/screenshots/footprints-960x540.png'});
await page.evaluate(()=>window.kingdomGame.events.emit('grid',false));
await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').setHeroPosition(820,590));await page.waitForTimeout(450);
await page.reload();await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));await page.waitForTimeout(300);
await page.setViewportSize({width:844,height:390});await page.waitForTimeout(350);const mobileLayout=await layoutCheck('844×390'),targetCss=mobileLayout.combatPx;await page.screenshot({path:'docs/screenshots/mobile-844x390.png'});
// Convert logical control coordinates through the actual FIT canvas for mobile touches.
const rect=await page.locator('canvas').boundingBox();const point=(x,y,id)=>({x:rect.x+x/960*rect.width,y:rect.y+y/540*rect.height,id});
const mobileControls=await state(),mb=mobileControls.utilities[0],ma=mobileControls.abilities[4];
await touch('touchStart',[point(104,447,1)]);await touch('touchMove',[point(138,447,1)]);const mobileBefore=await state();
await touch('touchStart',[point(138,447,1),point(mb.x,mb.y,2),point(ma.x,ma.y,3)]);await page.waitForTimeout(180);const mobileHeld=await state();
check(mobileHeld.hero.x>mobileBefore.hero.x&&mobileHeld.utilities[0].pressed&&mobileHeld.abilities[4].pressed,'844×390 joystick + utility + Attack retain independent touch ownership');
await touch('touchCancel',[]);const mobileCancel=await state();await page.waitForTimeout(100);
check(mobileCancel.utilities.every(a=>!a.pressed&&a.activations===0)&&mobileCancel.abilities.every(a=>!a.pressed)&&mobileCancel.casts===0&&(await state()).hero.x===mobileCancel.hero.x,'844×390 touch cancellation clears joystick/utility/Attack without activation');
for(const button of mobileControls.utilities){
 const mode=button.id.toUpperCase();
 await page.mouse.click(point(button.x+button.hitRadius-2,button.y,0).x,point(button.x+button.hitRadius-2,button.y,0).y);
 check(await page.evaluate(mode=>{const h=window.kingdomGame.scene.getScene('HUD');return h.utilityPanel.visible&&h.utilityTitle.text.startsWith(mode);},mode),`${mode} expanded invisible target opens existing preview panel`);
 await page.mouse.click(point(550,309,0).x,point(550,309,0).y);
}
// Simulate unequal device safe-area insets around the canvas; production CSS uses env().
await page.evaluate(()=>{document.getElementById('game').style.inset='12px 32px 8px 44px';window.kingdomGame.scale.refresh();});await page.waitForTimeout(200);
const safe=await page.locator('canvas').boundingBox();check(safe.x>=44-.1&&safe.y>=12-.1&&safe.x+safe.width<=844-32+.1&&safe.y+safe.height<=390-8+.1,'Canvas and HUD remain inside simulated asymmetric safe-area insets');
await page.evaluate(()=>{document.getElementById('game').style.inset='';window.kingdomGame.scale.refresh();});
const smallLayouts=[];
for(const [width,height] of [[667,320],[568,320]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(250);smallLayouts.push(await layoutCheck(`${width}×${height}`));
 await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').setHeroPosition(820,590));
 const s=await state(),r=await page.locator('canvas').boundingBox(),a=s.abilities[4];
 const pt=(x,y,id)=>({x:r.x+x/960*r.width,y:r.y+y/540*r.height,id});
 await touch('touchStart',[pt(104,447,1)]);await touch('touchMove',[pt(138,447,1)]);const beforeSmall=await state();
 await touch('touchStart',[pt(138,447,1),pt(a.x,a.y,2)]);await page.waitForTimeout(120);const heldSmall=await state();
 check(heldSmall.hero.x>beforeSmall.hero.x&&heldSmall.abilities[4].pressed,`${width}×${height}: joystick and Attack work together`);
 await touch('touchMove',[pt(138,447,1),pt(480,240,2)]);await touch('touchEnd',[]);const releasedSmall=await state();
 check(!releasedSmall.abilities[4].pressed&&releasedSmall.casts===heldSmall.casts,`${width}×${height}: outside release cancels Attack`);
}
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);check(await page.locator('#rotate').isVisible()&&(await state()).paused,'Portrait guard pauses');
check(requests.every(u=>u.startsWith('http://127.0.0.1')||u.startsWith('blob:http://127.0.0.1')||u.startsWith('data:')),'No external runtime requests');
check(runtimeErrors.length===0,'No missing assets or console errors');
const report={url,passed:errors.length===0,errors,checks,initial,moved,boundaryResults,touchMovement:{before:touchBefore.hero,after:touchHeld.hero},touchSkills,mobileControlCssPixels:targetCss,desktopLayout,mobileLayout,smallLayouts};await writeFile(url.includes('4173')?'docs/verification-production.json':'docs/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({url,passed:report.passed,errors,checks,desktopLayout,mobileLayout,smallLayouts},null,2));await browser.close();if(errors.length)process.exit(1);
