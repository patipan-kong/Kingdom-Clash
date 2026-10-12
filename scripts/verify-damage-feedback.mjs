import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {clickGame} from './browser-coordinates.mjs';
const root='test-results/phase2d-b1';await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
async function painted(){const f=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(f=>window.kingdomGame.loop.frame>f+1,f);}
async function load(encounter='extended'){await page.goto((process.env.PROTOTYPE_URL||'http://127.0.0.1:5185/')+'?encounter='+encounter);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.getScene('Battle').damageArt);await painted();}
// Freeze simulation clock, not presentation, to inspect short effects deterministically.
async function fixture(){return page.evaluate(()=>{
 const g=window.kingdomGame,b=g.scene.getScene('Battle'),h=g.scene.getScene('HUD'),s=b.simulation;
 b.clearDamageFeedback();h.combatNotice.setVisible(false);s.clearInput();s.state.skills.zones=[];s.state.spawnedWaves=12;s.spawnQueue.length=0;
 s.state.units={guardian:s.hero};const tower=s.state.structures['red-tower-front-center'];s.state.structures={[tower.id]:tower};
 Object.assign(s.hero,{x:1300,y:600,hp:1200,shield:undefined,protectionTick:0,statuses:[]});tower.readyTick=0;
 s.b1Advance??=s.advance.bind(s);s.advance=()=>{};b.syncUnits();b.cameras.main.stopFollow().setScroll(960,150);
 return {id:tower.id,x:tower.x,y:tower.y};
 });}
async function strike(){return page.evaluate(()=>{
 const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,t=Object.values(s.state.structures)[0];t.readyTick=s.clock.tick;s.b1Advance(1000/30+.1);
 const events=s.drainEvents();for(const e of events){b.presentCombatEvent(e);b.game.events.emit('simulation-event',e);}b.drawDamageFeedback();
 return {events,hp:s.hero.hp,traces:b.damageFeedback.traces.length,impact:b.damageFeedback.impactUntil>b.elapsed};
 });}
async function state(){return page.evaluate(()=>{const g=window.kingdomGame,b=g.scene.getScene('Battle'),h=g.scene.getScene('HUD');return {traces:b.damageFeedback.traces.length,impact:b.damageFeedback.impactUntil>b.elapsed,art:b.damageArt.commandBuffer.length,range:b.selectedRange.commandBuffer.length,notice:h.combatNotice.text,visible:h.combatNotice.visible,pulse:h.impactUntil>h.elapsed,texts:[...b.guardianDamageTexts].map(t=>t.text)};});}
try{
 await load();const initialListeners=await page.evaluate(()=>window.kingdomGame.events.listenerCount('tower-danger'));let t=await fixture(),r=await strike();
 check(r.events.some(e=>e.type==='attack'&&e.targetId==='guardian')&&r.events.some(e=>e.type==='damage'&&e.sourceId===t.id&&e.amount>0)&&r.traces===1&&r.impact&&r.hp<1200,'Real authoritative hostile tower attack and damage create connection and hit accent');
 await painted();let a=await state();check(a.notice==='Tower attacking you'&&a.visible&&a.pulse,'Existing combat slot and HP pulse show confirmed danger');
 await page.evaluate(()=>window.kingdomGame.events.emit('cast-feedback','No legal target at aim'));await page.evaluate(()=>window.kingdomGame.events.emit('tower-danger'));a=await state();check(a.notice==='No target at aim','Tower warning cannot overwrite direct rejection');
 await page.evaluate(()=>{const g=window.kingdomGame;g.events.emit('cast-feedback','Cast cancelled');g.events.emit('tower-danger');g.events.emit('simulation-event',{type:'cast-accepted',skill:'bash'});});a=await state();check(a.notice==='Cast cancelled','Cancellation has priority over tower warning and routine cast confirmation');
 await page.waitForFunction(()=>{const b=window.kingdomGame.scene.getScene("Battle"),h=window.kingdomGame.scene.getScene("HUD");return b.damageFeedback.traces.length===0&&b.damageFeedback.impactUntil<=b.elapsed&&h.impactUntil<=h.elapsed;});a=await state();check(a.traces===0&&!a.impact&&!a.pulse&&a.art===0,'Connection, accent and pulse expire naturally');
 t=await fixture();await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.state.skills.zones=[{id:'fixture',sourceId:s.hero.id,sourceLife:s.hero.lifeId,x:s.hero.x,y:s.hero.y,expiresTick:s.clock.tick+300,armor:0,shield:999,granted:[]}];s.hero.shield={remaining:999,expiresTick:s.clock.tick+300,zoneId:'fixture'};});r=await strike();a=await state();check(r.events.some(e=>e.type==='damage'&&e.amount===0&&e.absorbed>0)&&r.hp===1200&&!r.impact&&!a.pulse&&a.texts.length===0&&r.traces===1,'Actual fully absorbed tower hit has connection but no HP loss pulse or -0');
 await fixture();await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,t=Object.values(s.state.structures)[0];s.state.units['blue-fixture']={...s.hero,id:'blue-fixture',kind:'minion-blue',x:t.x-65,y:t.y,hp:240,maxHp:240,radius:12,speed:0,range:18,damage:0};});r=await strike();check(r.events.some(e=>e.type==='attack'&&e.targetId==='blue-fixture')&&r.traces===0&&!r.impact,'Actual tower targeting allied minion does not attribute Guardian damage');
 await fixture();await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,t=Object.values(s.state.structures)[0];t.team='blue';s.state.units['red-fixture']={...s.hero,id:'red-fixture',kind:'minion-red',team:'red',x:t.x-65,y:t.y,hp:240,maxHp:240,radius:12,speed:0,range:18,damage:0};});r=await strike();check(r.events.some(e=>e.type==='attack'&&e.targetId==='red-fixture')&&r.traces===0&&!r.impact,'Actual allied tower attack uses original feedback without hostile Guardian warning');
 await load();t=await fixture();await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;const minion={...s.hero,id:'red-fixture',kind:'minion-red',team:'red',x:1330,y:600,damage:8};s.state.units[minion.id]=minion;s.hit(minion,s.hero);});await painted();a=await state();check(a.traces===0&&a.impact&&a.pulse&&!a.visible,'Actual minion damage uses local hit feedback without tower trace or warning');
 await fixture();await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,t=Object.values(s.state.structures)[0];s.hit(t,s.hero);delete s.state.structures[t.id];});await painted();a=await state();check(a.traces===0&&a.impact&&!a.visible,'Positive damage with disappeared source retains generic impact without inventing tower identity');
 await load();t=await fixture();await strike();await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(true));a=await state();check(a.traces===0&&!a.pulse&&a.art===0&&a.range===0&&!a.visible&&a.texts.length===0,'Pause clears attribution, range, HP pulse, Guardian numbers and tower notice');await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').setPause(false));
 t=await fixture();await strike();await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;s.hit(Object.values(s.state.structures)[0],s.hero,99999,'direct');});await painted();a=await state();check(a.traces===0&&!a.impact&&!a.pulse&&!a.visible&&a.texts.length===0,'Real Guardian death clears damage feedback');
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;s.hero.respawnTick=s.clock.tick+1;s.b1Advance(1000/30+.1);});await painted();a=await state();check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').hero.hp>0)&&a.art===0&&!a.visible,'Actual respawn has no stale damage marks');
 await load();
 for(const size of [{width:844,height:390},{width:960,height:540}]){
  await page.setViewportSize(size);await painted();t=await fixture();
  // Exercise the existing artwork pointer handler (no new selection system).
  await page.evaluate(id=>{const b=window.kingdomGame.scene.getScene('Battle'),art=b.visuals.get(id).list.find(o=>o.type==='Image');art.emit('pointerdown',{},0,0,{stopPropagation(){}});},t.id);await painted();
  check(await page.evaluate(id=>{const b=window.kingdomGame.scene.getScene('Battle');return b.inspectedTower?.id===id&&b.selectedRange.commandBuffer.length>0&&!b.selectedRange.input;},t.id),size.width+'x'+size.height+': existing tower inspection shows one non-interactive authoritative range');
  await strike();await painted();const layout=await page.evaluate(()=>{
   const g=window.kingdomGame,b=g.scene.getScene('Battle'),h=g.scene.getScene('HUD'),notice=h.combatNotice.getBounds(),overlap=(a,c)=>a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top;
   const objects=[h.joystickHit,h.skillOpen,h.pauseButton.hit,...h.abilities.map(a=>a.hit),...h.utilities.flatMap(a=>[a.hit,a.label]),...h.abilities.slice(0,4).map(a=>a.nameLabel),h.attackLabel];
   const clear=notice.top>=h.topHudBottom&&objects.every(o=>!overlap(notice,o.getBounds()))&&notice.left>=0&&notice.right<=960;
   return {clear,world:!b.damageArt.input&&!b.selectedRange.input&&b.damageArt.scrollFactorX===1&&b.damageArt.scrollFactorY===1&&b.damageArt.depth<2700&&b.selectedRange.depth<2700,keeps:[...b.keepHealth.values()].every(o=>o.container.depth===2700),shortcuts:h.abilities.every(a=>!a.keyLabel&&!a.rankPips)};
  });check(layout.clear&&layout.world&&layout.keeps&&layout.shortcuts,size.width+'x'+size.height+': notices clear controls; world cues below protected Keep HP and unchanged A2 HUD');
  await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');b.cameras.main.setScroll(940,210);b.drawDamageFeedback();});check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').selectedRange.scrollFactorX===1),size.width+'x'+size.height+': selected boundary remains world-attached during camera movement');
  await page.evaluate(()=>{const g=window.kingdomGame,b=g.scene.getScene('Battle');g.events.emit('inspect',{id:'guardian',name:'Guardian',hp:'1200',footprint:{radius:20}});});check((await state()).range===0,size.width+'x'+size.height+': selection change clears boundary');
  await page.evaluate(id=>{const g=window.kingdomGame,b=g.scene.getScene('Battle');g.events.emit('inspect',{id,name:'Archer Tower',hp:'650',footprint:{columns:1,rows:1}});b.elapsed+=4001;b.drawDamageFeedback();},t.id);check((await state()).range===0,size.width+'x'+size.height+': inspected range expires after four seconds');
 }
 t=await fixture();await page.evaluate(id=>{const g=window.kingdomGame,b=g.scene.getScene('Battle');g.events.emit('inspect',{id,name:'Archer Tower',hp:'650',footprint:{columns:1,rows:1}});delete b.simulation.state.structures[id];b.drawDamageFeedback();},t.id);check((await state()).range===0,'Destroyed selected tower clears boundary');
 await load();await fixture();await strike();await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');window.oldB1=b.simulation;b.simulation.hit(b.hero,b.simulation.state.bases['red-base'],99999,'direct');b.simulation.b1Advance(1000/30+.1);});await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await clickGame(page,480,350);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').simulation!==window.oldB1);await painted();a=await state();check(a.traces===0&&a.art===0&&a.range===0&&!a.pulse&&!a.visible&&await page.evaluate(()=>window.kingdomGame.events.listenerCount('tower-danger'))===initialListeners,'UI Restart clears feedback and preserves listener count');
 await load('prototype');a=await state();check(a.traces===0&&a.art===0&&a.range===0&&!a.visible&&await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.encounter.id)==='prototype','Encounter switching clears previous danger presentation');
 // One representative real strike, hold the completed render frame for a stable image.
 await page.setViewportSize({width:844,height:390});await load();t=await fixture();await strike();
 await page.evaluate(()=>new Promise(resolve=>window.kingdomGame.events.once('postrender',()=>{window.kingdomGame.loop.sleep();resolve();})));
 check(errors.length===0,'No browser console or page errors');
 await mkdir('docs/phase2d-b1',{recursive:true});if(process.env.CAPTURE_SCREENSHOT!=='0')await page.screenshot({path:'docs/phase2d-b1/guardian-damage-844x390.png'});
 await page.evaluate(()=>window.kingdomGame.loop.wake());
}catch(e){errors.push(e.stack||String(e));console.error(e);}finally{await browser.close();await writeFile(root+'/verification.json',JSON.stringify({checks,errors,fixtures:'Isolated authoritative simulation strikes/damage, shield and respawn fixtures; existing inspection pointer handler; UI Restart and encounter reload. Simulation advancement held between strikes only for effect inspection; input remains accepted. Single screenshot holds completed render, not a paused-game screenshot.'},null,2));}
if(errors.length)process.exitCode=1;
