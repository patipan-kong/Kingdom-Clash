import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer,preview} from 'vite';

const production=process.argv.includes('production');
const server=production
 ?await preview({preview:{host:'127.0.0.1',port:0}})
 :await createServer({server:{host:'127.0.0.1',port:0}});
const key='kingdom-clash.interstitial.v1';
const progressKey='kingdom-clash.campaign.v2';
const title='INTERSTITIAL AD — DEV MOCK';
let browser;
try{
 if(!production)await server.listen();
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:960,height:540}});
 page.setDefaultTimeout(20000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.stack));
 const active=scene=>page.waitForFunction(scene=>window.kingdomGame?.scene.isActive(scene),scene);
 const ready=()=>page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation.state.match.phase==='playing');
 const home=async()=>{
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await active('MainMenu');
 };
 const battle=async(levelId,debug=false)=>{
  await page.evaluate(({levelId,debug})=>{
   window.kingdomGame.scene.getScene('MainMenu').scene.start('Battle',{mode:'campaign',levelId,debug});
  },{levelId,debug});
  await ready();
 };
 const end=async(outcome='victory')=>{
  await page.evaluate(outcome=>{
   const sim=window.kingdomGame.scene.getScene('Battle').simulation;
   sim.finish(outcome,outcome==='victory'?'objectives-complete':'azure-keep-destroyed',sim.clock.tick);
  },outcome);
  await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);
 };
 const click=async hit=>{
  const [x,y]=await page.evaluate(hit=>{
   const g=window.kingdomGame,h=g.scene.getScene('HUD')[hit].getBounds(),r=g.canvas.getBoundingClientRect();
   return [r.x+h.centerX*r.width/960,r.y+h.centerY*r.height/540];
  },hit);
  await page.mouse.click(x,y);
 };
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const mock=()=>page.evaluate(title=>window.kingdomGame.scene.getScene('HUD').children.list.some(o=>o.text===title),title);
 const briefing=async(id,chapter)=>{
  await active('MissionBriefing');
  const dest=await page.evaluate(()=>{
   const g=window.kingdomGame,s=g.scene.getScene('MissionBriefing');
   return [s.levelId,s.returnTo.data.chapterId,g.scene.isActive('Battle'),g.scene.isActive('HUD')];
  });
  assert.deepEqual(dest,[id,chapter,false,false]);
 };
 const seed=async(lastShown)=>page.evaluate(({key,lastShown})=>{
  localStorage.setItem(key,JSON.stringify({count:2,lastShown}));
 },{key,lastShown});
 const seedProgress=ids=>page.evaluate(({progressKey,ids})=>{
  localStorage.setItem(progressKey,JSON.stringify({version:1,levels:Object.fromEntries(ids.map(id=>[id,{clears:1}]))}));
 },{progressKey,ids});

 await home();
 if(production){
  await seed(null);
  await battle('campaign-01');await end();await click('nextHit');
  await briefing('campaign-02','first-war');
  assert.equal(await mock(),false);
  assert.deepEqual(await state(),{count:2,lastShown:null});
 }else{
  await battle('campaign-01');await end('defeat');
  assert.equal(await state(),null);
  await click('restartHit');await ready();await end();
  assert.deepEqual(await state(),{count:1,lastShown:null});
  await home();await battle('campaign-01');await end();
  assert.equal((await state()).count,1);
  await home();await battle('campaign-02',true);await end();
  assert.equal((await state()).count,1);
  await home();await battle('campaign-02');await end();await click('nextHit');
  await briefing('campaign-03','first-war');
  assert.deepEqual(await state(),{count:2,lastShown:null});
  await home();await battle('campaign-03');await end();
  // Re-enter the action in the same frame to verify the placement guard.
  await page.evaluate(()=>{
   const hud=window.kingdomGame.scene.getScene('HUD');
   hud.openNextBriefing();hud.openNextBriefing();
  });
  assert.equal(await mock(),true);
  assert.equal(await page.evaluate(title=>window.kingdomGame.scene.getScene('HUD').children.list.filter(o=>o.text===title).length,title),1);
  await page.mouse.dblclick(480,329);
  await briefing('campaign-04','first-war');
  const shown=(await state()).lastShown;
  assert.ok(shown>0);

  await seed(shown);await home();await battle('campaign-04');await end();await click('nextHit');
  await briefing('campaign-05','first-war');
  assert.deepEqual(await state(),{count:0,lastShown:shown});

  await seed(shown-600001);
  await seedProgress(['campaign-01','campaign-02','campaign-03','campaign-04','campaign-05']);
  await home();await battle('campaign-06');await end();await click('nextHit');
  assert.equal(await mock(),true);
  await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').children.list.some(o=>o.text==='Continuing in 2s'));
  await briefing('campaign-11','burning-frontier');

  await seed(null);await home();await battle('campaign-11');await end();await click('nextHit');
  assert.equal(await mock(),true);
  await page.evaluate(()=>{
   const scenes=window.kingdomGame.scene;
   scenes.stop('Battle');scenes.stop('HUD');scenes.start('MainMenu');
  });
  await page.waitForTimeout(3200);
  assert.equal(await page.evaluate(()=>window.kingdomGame.scene.isActive('MissionBriefing')),false);
 }
 assert.deepEqual(errors,[]);
 console.log(`PASS interstitial ${production?'production isolation':'frequency, persistence, Skip, countdown, routing and shutdown'}`);
}finally{
 await browser?.close();
 if(production)await new Promise(resolve=>server.httpServer.close(resolve));
 else await server.close();
}
