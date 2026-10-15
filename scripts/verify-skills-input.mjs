import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const checks=[],errors=[],check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
for(const channel of ['chrome','msedge']){
 const browser=await chromium.launch({channel,headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 try{for(const touch of [false,true]){
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?3:1}),name=channel+(touch?' touch DPR3':' mouse DPR1');page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.PROTOTYPE_URL||'http://127.0.0.1:5198/?encounter=extended');await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD').skills);await page.waitForTimeout(180);
  const point=control=>page.evaluate(control=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),o=control==='open'?h.skillOpen:control==='close'?h.skillClose:control==='next'?h.skills.next:h.skillButtons[h.skills.model.selected].hit,r=o.getBounds(),c=g.canvas.getBoundingClientRect();return{x:c.x+r.centerX*c.width/960,y:c.y+r.centerY*c.height/540};},control);
  const tap=async control=>{const p=await point(control);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);await page.waitForTimeout(100);};
  await tap('open');check(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').skillPanel.visible),name+' opens once');
  const pt=await point('learn');await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.mouse.move(10,120);await page.mouse.up();await page.waitForTimeout(100);check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.heroProgression.skillPoints===1),name+' release outside does not allocate');
  await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.evaluate(()=>window.kingdomGame.canvas.dispatchEvent(new TouchEvent('touchcancel',{bubbles:true,cancelable:true,touches:[],targetTouches:[],changedTouches:[]})));await page.mouse.up();await page.waitForTimeout(100);check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.heroProgression.skillPoints===1),name+' touchcancel clears owned press');
  await tap('learn');await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.heroProgression.ranks.bash===1);check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.heroProgression.skillPoints===0),name+' one tap learns and spends once');
  for(let i=0;i<4;i++)await tap('next');check(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').skills.rows[window.kingdomGame.scene.getScene('HUD').skills.model.selected].skill==='fortitude'),name+' all five skills reachable with touch navigation');
  await tap('close');check(await page.evaluate(()=>!window.kingdomGame.scene.getScene('HUD').skillPanel.visible&&window.kingdomGame.scene.getScene('Battle').simulation.clock.timeScale===1),name+' close restores access at normal speed');await page.close();
 }}catch(e){errors.push(e.stack||String(e));}finally{await browser.close();}
}
await mkdir('docs/ui-v042-skills-slice4',{recursive:true});await writeFile('docs/ui-v042-skills-slice4/input-verification.json',JSON.stringify({checks,errors},null,2));console.log(`${checks.filter(c=>c.passed).length}/${checks.length} Skills input checks`);if(errors.length)process.exitCode=1;
