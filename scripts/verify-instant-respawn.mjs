import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {clickCampaignControl} from './campaign-browser-helpers.mjs';

// Pass `production` with PROTOTYPE_URL pointing to a local preview of the built game.
const production=process.argv[2]==='production';
const url=process.env.PROTOTYPE_URL||(production?'http://127.0.0.1:4173/':'http://127.0.0.1:5173/');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});
 page.setDefaultTimeout(20000);
 const active=name=>page.waitForFunction(name=>window.kingdomGame?.scene.isActive(name),name);
 const tap=(scene,property)=>clickCampaignControl(page,property,undefined,'touch',scene);
 const button=()=>page.evaluate(()=>{
  const hud=window.kingdomGame.scene.getScene('HUD'),button=hud.respawnNow;
  return {exists:!!button,labelExists:hud.children.list.some(o=>o.type==='Text'&&o.text==='RESPAWN NOW'),visible:!!button?.hit.visible,enabled:!!button?.hit.input.enabled,countdown:hud.hpText.text};
 });
 const kill=()=>page.evaluate(()=>{
  const sim=window.kingdomGame.scene.getScene('Battle').simulation;
  sim.state.units={guardian:sim.hero};
  sim.spawnQueue.length=0;
  sim.hero.protectionTick=sim.clock.tick;
  sim.hit({...sim.hero,id:'test-raider',team:'red'},sim.hero,1e9,'direct');
  return sim.hero.respawnTick;
 });
 const dead=()=>page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').hpText.text.startsWith('Revive '));
 const alive=()=>page.waitForFunction(()=>{
  const g=window.kingdomGame,sim=g.scene.getScene('Battle').simulation;
  return sim.hero.hp===sim.hero.maxHp&&!g.scene.getScene('HUD').hpText.text.startsWith('Revive ');
 });
 await page.goto(url,{waitUntil:'domcontentloaded'});await active('MainMenu');
 await tap('MainMenu','continueButton');await active('MissionBriefing');
 await tap('MissionBriefing','startButton');await active('HUD');await alive();
 assert.equal((await button()).visible,false);
 const deadline=await kill();await dead();

 if(production){
  const state=await button();
  assert.match(state.countdown,/^Revive \d+s$/);
  assert.equal(state.exists,false);assert.equal(state.labelExists,false);
  await alive();
  console.log('PASS production shows the normal countdown and revives without a RESPAWN NOW control');
 }else{
  const {countdown,...control}=await button();
  assert.match(countdown,/^Revive \d+s$/);
  assert.deepEqual(control,{exists:true,labelExists:true,visible:true,enabled:true});
  await page.keyboard.press('Space');await page.waitForFunction(()=>{
   const hud=window.kingdomGame.scene.getScene('HUD');
   return hud.paused&&!hud.respawnNow.hit.input.enabled;
  });
  assert.equal((await button()).visible,false);
  await tap('HUD','pauseResume');
  await tap('HUD','skillOpen');assert.equal((await button()).enabled,false);
  await tap('HUD','skillClose');assert.equal((await button()).enabled,true);

  const point=await page.evaluate(()=>{
   const game=window.kingdomGame,hit=game.scene.getScene('HUD').respawnNow.hit;
   const bounds=hit.getBounds(),canvas=game.canvas.getBoundingClientRect();
   return {x:canvas.left+bounds.centerX*canvas.width/960,y:canvas.top+bounds.centerY*canvas.height/540,height:bounds.height*canvas.height/540};
  });
  assert.ok(point.height>=43.9,'The button retains a 44 px touch target');
  await page.evaluate(()=>window.kingdomGame.events.emit('focus-map',1400,500));
  assert.equal(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').following),false);
  await page.touchscreen.tap(point.x,point.y);await alive();
  assert.ok(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick)<deadline);
  await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').following);
  assert.equal((await button()).visible,false);assert.equal((await button()).enabled,false);
  console.log('PASS development button respects pause and Skills, and revival resumes camera follow before the natural deadline');

  await kill();await dead();assert.equal((await button()).enabled,true);
  await page.evaluate(()=>{window.kingdomGame.scene.getScene('Battle').simulation.state.bases['blue-base'].hp=0;});
  await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);
  assert.equal((await button()).visible,false);assert.equal((await button()).enabled,false);
  await tap('HUD','mainMenuHit');await active('MainMenu');
  assert.equal(await page.evaluate(()=>window.kingdomGame.scene.isActive('HUD')),false);
  console.log('PASS development control disappears when the battle ends and the HUD shuts down');
 }
}finally{await browser.close();}
