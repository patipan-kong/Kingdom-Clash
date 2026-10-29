import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {campaignFrames,clickCampaignControl} from './campaign-browser-helpers.mjs';

// One browser, one page, sequential real-scene checks. No extended regression suites.
const root=process.env.ROUTING_EVIDENCE_ROOT||'test-results/campaign-routing';await mkdir(root,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:0}});
let browser,page;const checks=[],errors=[];let port;
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
try{
 await server.listen();port=server.httpServer.address().port;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 page=await browser.newPage({viewport:{width:960,height:540}});page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(60000);
 await page.addInitScript(()=>{window.routingWrites=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){window.routingWrites++;return set.apply(this,args);};});
 page.on('pageerror',e=>errors.push(e.message));
 const active=n=>page.waitForFunction(n=>window.kingdomGame?.scene.isActive(n),n);
 const tap=async(scene,prop,key)=>{const p=await page.evaluate(({scene,prop,key})=>{const g=window.kingdomGame,s=g.scene.getScene(scene),o=key===undefined?s[prop]:s[prop].get(key),b=o.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},{scene,prop,key});await page.mouse.click(p.x,p.y);await campaignFrames(page);};
 const state=()=>page.evaluate(()=>{const g=window.kingdomGame,s=g.scene.getScene('CampaignSelect');return{chapter:s.chapterId,selected:s.selectedLevelId,recommended:s.missions.filter(m=>m.recommended).map(m=>m.id),done:s.missions.filter(m=>m.state==='completed').map(m=>m.id),writes:window.routingWrites};});
 async function start(){await tap('MissionBriefing','startButton');await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));}
 async function finish(victory=false){
  const outcome=await page.evaluate(victory=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,dt=1000/30+.01;
   if(victory){let n=0;while(!s.ended&&n++<40000){s.advance(dt);const mark=s.events.length;for(const u of Object.values(s.state.units).filter(u=>u.team==='red'&&u.hp>0)){u.protectionTick=0;s.hit(s.hero,u,240,'direct');}s.mission.evaluate(s.clock.tick,s.events.slice(mark));}}
   else{s.hit({...s.hero,id:'routing-raider',team:'red',kind:'minion-red'},s.state.bases['blue-base'],1e9,'direct');for(let i=0;i<5&&!s.ended;i++)s.advance(dt);}
   return s.outcome?.outcome;
  },victory);assert.equal(outcome,victory?'victory':'defeat');
  await page.evaluate(()=>window.kingdomGame.scene.resume('Battle'));await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);
 }
 async function grid(){await tap('MainMenu','campaignButton');await active('ChapterSelect');await tap('ChapterSelect','chapterButtons','first-war');await active('CampaignSelect');}
 await page.goto(`http://127.0.0.1:${port}/`);await active('MainMenu');
 // Continue first, before the grid scene has ever run.
 await tap('MainMenu','continueButton');await active('MissionBriefing');await tap('MissionBriefing','backButton');await active('CampaignSelect');
 check((await state()).selected==='campaign-01','Fresh Continue → Briefing Back resolves Chapter 1 without prior grid');
 await clickCampaignControl(page,'backButton');await active('ChapterSelect');await tap('ChapterSelect','backButton');await active('MainMenu');await grid();
 await clickCampaignControl(page,'levelButtons','campaign-01');await active('MissionBriefing');await start();await finish(true);
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').progressResult?.recorded),'Real victory records authoritative progression before results');
 await tap('HUD','levelSelectHit');await active('CampaignSelect');let s=await state();
 check(s.selected==='campaign-01'&&s.done.includes('campaign-01')&&s.recommended.join()==='campaign-02'&&s.writes===1,'Victory return keeps played selection, refreshes unlock and writes only victory');
 await clickCampaignControl(page,'levelButtons','campaign-01');await active('MissionBriefing');await start();await finish();
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').resultTitle.text==='DEFEAT'),'Completed mission replay can defeat normally');
 await tap('HUD','restartHit');await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.getScene('Battle').simulation.state.match.phase==='playing');
 check(await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return b.launch.returnTo.data.selectedLevelId==='campaign-01'&&b.campaignLevel.id==='campaign-01';}),'Retry retains mission and explicit return context');
 await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));await finish();await tap('HUD','levelSelectHit');await active('CampaignSelect');
 s=await state();check(s.selected==='campaign-01'&&s.recommended.join()==='campaign-02'&&s.writes===1,'Defeat/retry return preserves clears and recommendation without save writes');
 const counts=await page.evaluate(()=>{const g=window.kingdomGame,s=g.scene.getScene('CampaignSelect');return{resize:g.scale.listenerCount('resize'),input:['wheel','pointerdown','pointermove','pointerup'].map(n=>s.input.listenerCount(n)),events:g.events.eventNames().map(n=>[String(n),g.events.listenerCount(n)]).sort()};});
 for(let i=0;i<3;i++){await clickCampaignControl(page,'levelButtons','campaign-01');await active('MissionBriefing');await tap('MissionBriefing','backButton');await active('CampaignSelect');}
 check(await page.evaluate(c=>{const g=window.kingdomGame,s=g.scene.getScene('CampaignSelect');return c.resize===g.scale.listenerCount('resize')&&JSON.stringify(c.input)===JSON.stringify(['wheel','pointerdown','pointermove','pointerup'].map(n=>s.input.listenerCount(n)))&&JSON.stringify(c.events)===JSON.stringify(g.events.eventNames().map(n=>[String(n),g.events.listenerCount(n)]).sort());},counts),'Repeated briefing/grid navigation has stable handler counts');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('CampaignSelect').fullBattleButton===undefined),'Mission Select has no Full Battle entry; it lives on Chapter Select and the Main Menu');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('CampaignSelect').focusId==='campaign-01'),'Returning from a Briefing marks the mission just opened for the steel-blue focus ring');
 await clickCampaignControl(page,'backButton');await active('ChapterSelect');await tap('ChapterSelect','fullBattleButton');await active('MissionBriefing');await tap('MissionBriefing','backButton');await active('ChapterSelect');check(true,'Full Battle entered from Chapters returns to Chapters');
 await tap('ChapterSelect','fullBattleButton');await active('MissionBriefing');await start();await finish();await tap('HUD','levelSelectHit');await active('ChapterSelect');check(true,'Full Battle results return to Chapters without joining story progression');
 await tap('ChapterSelect','backButton');await active('MainMenu');await tap('MainMenu','continueButton');await active('MissionBriefing');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-02'),'Continue after victory targets newly unlocked mission');
 await tap('MissionBriefing','backButton');await active('CampaignSelect');check((await state()).selected==='campaign-02','Continue Back overrides stale replay selection with its own mission');
 for(const [scene,id] of [['MissionBriefing','invalid'],['MissionBriefing','campaign-05'],['Battle','invalid'],['Battle','campaign-05']]){
  await page.evaluate(({scene,id})=>window.kingdomGame.scene.getScene('CampaignSelect').scene.start(scene,scene==='Battle'?{mode:'campaign',levelId:id}:{levelId:id}),{scene,id});await active('CampaignSelect');
  check(await page.evaluate(()=>!window.kingdomGame.scene.isActive('Battle')&&!window.kingdomGame.scene.isActive('HUD')),`${scene} rejects ${id} without running a match`);
 }
 check((await state()).writes===1,'All browsing, defeats, retries, guards and Full Battle add no save writes');
 check(errors.length===0,'No page errors in focused routing checks');
 await page.screenshot({path:`${root}/return-grid.png`});
}catch(e){errors.push(e.stack||String(e));console.error(e);process.exitCode=1;}
finally{
 try{if(browser)await browser.close();}finally{await server.close();}
 await writeFile(`${root}/report.json`,JSON.stringify({checks,errors,port,browserClosed:!browser?.isConnected(),serverClosed:!server.httpServer?.listening},null,2));
 console.log('CLEANUP browserClosed='+!browser?.isConnected()+' serverClosed='+!server.httpServer?.listening);
}
