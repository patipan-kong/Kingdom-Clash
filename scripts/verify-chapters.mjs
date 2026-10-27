import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

const root=process.env.CHAPTER_EVIDENCE_ROOT||'test-results/chapters';await mkdir(root,{recursive:true});
const server=await createServer({root:resolve('.'),server:{host:'127.0.0.1',port:0,strictPort:false}});
let browser;const checks=[],errors=[];
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
try{
 await server.listen();const address=server.httpServer.address(),url=`http://127.0.0.1:${address.port}/`;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:960,height:540}});page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const active=name=>page.waitForFunction(name=>window.kingdomGame?.scene.isActive(name),name);
 const frames=async()=>{const n=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(n=>window.kingdomGame.loop.frame>n+2,n);};
 async function tap(scene,property,key){
  const pt=await page.evaluate(({scene,property,key})=>{const g=window.kingdomGame,s=g.scene.getScene(scene),o=key?s[property].get(key):s[property],b=o.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},{scene,property,key});
  await page.mouse.click(pt.x,pt.y);await frames();
 }
 async function open(clears=0){
  await page.goto(url);await active('MainMenu');
  await page.evaluate(clears=>{localStorage.setItem('kingdom-clash.campaign.v1',JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>['campaign-'+String(i+1).padStart(2,'0'),{clears:1}]))}));},clears);
  await page.reload();await active('MainMenu');
 }
 const saved=()=>page.evaluate(()=>localStorage.getItem('kingdom-clash.campaign.v1'));
 const views=()=>page.evaluate(()=>window.kingdomGame.scene.getScene('ChapterSelect').views.map(v=>({state:v.state,completed:v.completed,released:v.released,total:v.total,complete:v.complete,missions:v.missions.map(m=>m.state)})));
 async function chapters(){await tap('MainMenu','campaignButton');await active('ChapterSelect');}
 await open();const initial=await saved();await chapters();let v=await views();
 check(v[0].state==='available'&&v[0].completed===0&&v[0].total===10,'Fresh progress opens Chapter 1 with 0/10');
 check(v[0].released===10&&v[0].missions.slice(1).every(s=>s==='locked'),'All ten missions registered; Levels 2–10 start locked');
 check(v[1].state==='locked'&&v[1].released===9&&v[1].completed===0&&v[1].missions.slice(0,9).every(s=>s==='locked')&&v[1].missions.slice(9).every(s=>s==='pending'),'Chapter 2 is released but locked until Level 10 is cleared; Level 20 is pending');
 check(v[2].state==='coming-soon'&&v[2].released===0&&v[2].completed===0,'Chapter 3 remains coming soon with no released missions');
 check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('ChapterSelect');return s.chapterButtons.size===1&&[...s.unavailableCards.values()].every(h=>!h.input); }),'Fresh save: only Chapter 1 is interactive; the locked Chapter 2 and coming-soon Chapter 3 cards have no targets');
 for(const [width,height] of [[960,540],[1280,720],[1366,768],[1920,1080],[844,390]]){
  await page.setViewportSize({width,height});await frames();
  check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('ChapterSelect'),inside=o=>{const b=o.getBounds();return b.left>=0&&b.right<=960&&b.top>=0&&b.bottom<=540;};return [s.backButton,s.fullBattleButton,...s.chapterButtons.values()].every(inside);}),`Chapter actions fit ${width}×${height}`);
  await page.screenshot({path:`${root}/chapters-${width}x${height}.png`});
 }
 await page.setViewportSize({width:960,height:540});await frames();
 await tap('ChapterSelect','chapterButtons','first-war');await active('CampaignSelect');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('CampaignSelect').levelButtons.has('campaign-01')),'Chapter 1 opens mission selection');
 await tap('CampaignSelect','backButton');await active('ChapterSelect');await tap('ChapterSelect','backButton');await active('MainMenu');
 check(await saved()===initial,'Navigation and chapter views leave v1 save unchanged');
 await tap('MainMenu','continueButton');await active('MissionBriefing');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-01'),'Fresh Continue shortcut still opens Level 1 briefing');
 await open(2);await chapters();v=await views();check(v[0].completed===2&&v[0].missions[2]==='available','Partial completion derives from ProgressStore');
 await tap('ChapterSelect','backButton');await active('MainMenu');await tap('MainMenu','continueButton');await active('MissionBriefing');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-03'),'Partial Continue shortcut still opens next briefing');
 await open();await chapters();const released=(await views())[0].released;
 await open(released);await chapters();v=await views();check(v[0].completed===10&&released===10&&v[0].complete&&v[0].state==='available','Ten clears complete Chapter 1 and keep it replayable');
 await page.screenshot({path:`${root}/chapters-all-released-complete.png`});
 check(v[1].state==='available'&&v[1].released===9&&v[1].completed===0&&v[1].missions[0]==='available'&&v[1].missions.slice(1,9).every(s=>s==='locked')&&v[1].missions.slice(9).every(s=>s==='pending')&&v[2].state==='coming-soon','Ten Chapter 1 clears unlock Chapter 2 Level 11; Levels 12 to 19 wait locked and Level 20 stays pending and Chapter 3 stays coming soon');
 check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('ChapterSelect');return s.chapterButtons.size===2&&s.chapterButtons.has('burning-frontier')&&!s.chapterButtons.has('frozen-crown');}),'Chapter 2 becomes interactive after Level 10; Chapter 3 does not');
 await tap('ChapterSelect','chapterButtons','burning-frontier');await active('CampaignSelect');
 check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect');return JSON.stringify([...s.levelButtons.keys()])===JSON.stringify(['campaign-11'])&&s.pendingCards.size===1&&s.lockedCards.size===8&&!s.levelButtons.has('campaign-12');}),'Chapter 2 grid: only Level 11 is selectable; Levels 12 to 19 are locked; Level 20 pending');
 await tap('CampaignSelect','backButton');await active('ChapterSelect');
 const fullSave=await saved();await tap('ChapterSelect','fullBattleButton');await active('MissionBriefing');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='full-battle'),'Chapter Full Battle preserves legacy briefing route');
 await tap('MissionBriefing','startButton');await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 check(await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;return b.launch.mode==='campaign'&&b.campaignLevel.id==='full-battle'&&s.setup.encounterId==='extended'&&s.setup.mission===null&&s.setup.encounter.defenders.length===8&&s.setup.encounter.continuous&&!!s.setup.keepDefense.red;}),'Legacy Full Battle remains extended, armed, eight towers, endless waves');
 check(await saved()===fullSave,'Full Battle launch does not write campaign progress');
 await open();const quickSave=await saved();await tap('MainMenu','quickPlayButton');await page.waitForFunction(()=>window.visualReady);
 check(await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return b.launch.mode==='quick'&&b.campaignLevel===null&&b.simulation.setup.encounterId==='extended'&&b.simulation.setup.mission===null;}),'Main Menu Quick Play launch remains unchanged');
 check(await saved()===quickSave,'Quick Play leaves save unchanged');
 await open();await chapters();
 const baseline=await page.evaluate(()=>{const g=window.kingdomGame,s=g.scene.getScene('ChapterSelect');return{wheel:s.input.listenerCount('wheel'),resize:g.scale.listenerCount('resize')};});
 for(let i=0;i<6;i++){
  await tap('ChapterSelect','backButton');await active('MainMenu');
  check(await page.evaluate(()=>window.kingdomGame.scene.getScene('ChapterSelect').input.listenerCount('wheel')===0),'Chapter shutdown removes wheel handler '+(i+1));
  await chapters();
 }
 check(await page.evaluate(b=>{const g=window.kingdomGame,s=g.scene.getScene('ChapterSelect');return s.input.listenerCount('wheel')===b.wheel&&g.scale.listenerCount('resize')===b.resize;},baseline),'Repeated entry has no duplicate wheel/resize handlers');
 check(await page.evaluate(()=>!window.kingdomGame.scene.isActive('Battle')&&!window.kingdomGame.scene.isActive('HUD')),'Chapter browsing leaves no active Battle/HUD');
 check(errors.length===0,'No browser, console or asset errors');
}catch(e){errors.push(e.stack||String(e));console.error(e);process.exitCode=1;}
finally{
 if(browser)await browser.close();await server.close();
 await writeFile(`${root}/report.json`,JSON.stringify({checks,errors,passed:checks.filter(c=>c.passed).length,total:checks.length},null,2));
}
