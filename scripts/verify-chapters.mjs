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
  // Phase B1: the v2 save, chapter-block ids in play order (Chapter 1 is campaign-01..06, Chapter 2 campaign-11..16).
  await page.evaluate(clears=>{const order=[1,2,3,4,5,6,11,12,13,14,15,16].map(n=>'campaign-'+String(n).padStart(2,'0'));localStorage.setItem('kingdom-clash.campaign.v2',JSON.stringify({version:1,levels:Object.fromEntries(order.slice(0,clears).map(id=>[id,{clears:1}]))}));},clears);
  await page.reload();await active('MainMenu');
 }
 const saved=()=>page.evaluate(()=>localStorage.getItem('kingdom-clash.campaign.v2'));
 const views=()=>page.evaluate(()=>window.kingdomGame.scene.getScene('ChapterSelect').views.map(v=>({state:v.state,completed:v.completed,released:v.released,total:v.total,complete:v.complete,missions:v.missions.map(m=>m.state)})));
 async function chapters(){await tap('MainMenu','campaignButton');await active('ChapterSelect');}
 await open();const initial=await saved();await chapters();let v=await views();
 check(v[0].state==='available'&&v[0].completed===0&&v[0].total===6,'Fresh progress opens Chapter 1 with 0/6');
 check(v[0].released===6&&v[0].missions.slice(1).every(s=>s==='locked'),'All six missions registered; Missions 2–6 start locked');
 check(v[1].state==='locked'&&v[1].released===6&&v[1].completed===0&&v[1].total===6&&v[1].missions.every(s=>s==='locked'),'Chapter 2 is released but locked until Chapter 1 Mission 6 is cleared; its six missions are all registered');
 check(v[2].state==='coming-soon'&&v[2].released===0&&v[2].completed===0&&v[2].total===6,'Chapter 3 remains coming soon: six slots, none released');
 check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('ChapterSelect');return s.chapterButtons.size===1&&[...s.unavailableCards.values()].every(h=>!h.input); }),'Fresh save: only Chapter 1 is interactive; the locked Chapter 2 and coming-soon Chapter 3 cards have no targets');
 const cardTexts=()=>page.evaluate(()=>[...window.kingdomGame.scene.getScene('ChapterSelect').cards.list].filter(o=>o.type==='Text').map(o=>o.text));
 {
  const t=await cardTexts(),hits=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('ChapterSelect');return[...s.chapterButtons.values(),...s.unavailableCards.values()].map(h=>{const b=h.getBounds();return[Math.round(b.width),Math.round(b.height)];});});
  check(['CHAPTER 1','The First War','0/6','CHAPTER 2','The Burning Frontier','Complete Chapter 1','CHAPTER 3','The Frozen Crown','COMING SOON'].every(x=>t.includes(x)),'Each poster shows only CHAPTER N, its title and one state row (0/6, a lock hint, or Coming Soon)');
  check(!t.some(x=>/SELECT CHAPTER|released|pending|AVAILABLE|LOCKED|COMPLETE|Defend the green|desert canyons|snowy pine/.test(x)),'Narrative paragraphs, release counts, repeated status text and SELECT CHAPTER buttons are gone');
  check(hits.length===3&&hits.every(([w,h])=>w===280&&h===336),'The whole 280×336 poster is the target of every card, including the inert ones');
 }
 for(const [width,height] of [[960,540],[1280,720],[1366,768],[1920,1080],[844,390]]){
  await page.setViewportSize({width,height});await frames();
  check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('ChapterSelect'),inside=o=>{const b=o.getBounds();return b.left>=0&&b.right<=960&&b.top>=0&&b.bottom<=540;};return [s.backButton,s.fullBattleButton,...s.chapterButtons.values()].every(inside);}),`Chapter actions fit ${width}×${height}`);
  await page.screenshot({path:`${root}/chapters-${width}x${height}.png`});
 }
 await page.setViewportSize({width:960,height:540});await frames();
 await tap('ChapterSelect','chapterButtons','first-war');await active('CampaignSelect');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('CampaignSelect').levelButtons.has('campaign-01')),'Chapter 1 opens mission selection');
 await tap('CampaignSelect','backButton');await active('ChapterSelect');await tap('ChapterSelect','backButton');await active('MainMenu');
 check(await saved()===initial,'Navigation and chapter views leave the save unchanged');
 await tap('MainMenu','continueButton');await active('MissionBriefing');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-01'),'Fresh Continue shortcut still opens the Mission 1 briefing');
 await open(2);await chapters();v=await views();check(v[0].completed===2&&v[0].missions[2]==='available','Partial completion derives from ProgressStore');
 await tap('ChapterSelect','backButton');await active('MainMenu');await tap('MainMenu','continueButton');await active('MissionBriefing');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-03'),'Partial Continue shortcut still opens next briefing');
 await open();await chapters();const released=(await views())[0].released;
 await open(released);await chapters();v=await views();check(v[0].completed===6&&released===6&&v[0].complete&&v[0].state==='available','Six clears complete Chapter 1 and keep it replayable');
 await page.screenshot({path:`${root}/chapters-all-released-complete.png`});
 check(await (async()=>{const t=await cardTexts();return t.includes('Complete')&&t.includes('0/6')&&!t.includes('Complete Chapter 1');})(),'A cleared chapter shows Complete; the next chapter becomes the current one with its 0/6 pips and no lock hint');
 check(v[1].state==='available'&&v[1].released===6&&v[1].completed===0&&v[1].missions[0]==='available'&&v[1].missions.slice(1).every(s=>s==='locked')&&v[2].state==='coming-soon','Clearing Chapter 1 unlocks Chapter 2 Mission 1; Missions 2 to 6 wait locked and Chapter 3 stays coming soon');
 check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('ChapterSelect');return s.chapterButtons.size===2&&s.chapterButtons.has('burning-frontier')&&!s.chapterButtons.has('frozen-crown');}),'Chapter 2 becomes interactive after Chapter 1 Mission 6; Chapter 3 does not');
 await tap('ChapterSelect','chapterButtons','burning-frontier');await active('CampaignSelect');
 check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect');return JSON.stringify([...s.levelButtons.keys()])===JSON.stringify(['campaign-11'])&&s.pendingCards.size===0&&s.lockedCards.size===5&&!s.levelButtons.has('campaign-12');}),'Chapter 2 grid: only Mission 1 is selectable; Missions 2 to 6 are locked');
 await tap('CampaignSelect','backButton');await active('ChapterSelect');
 const fullSave=await saved();await tap('ChapterSelect','fullBattleButton');await active('MissionBriefing');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='full-battle'),'Chapter Full Battle preserves legacy briefing route');
 await tap('MissionBriefing','startButton');await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 check(await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;return b.launch.mode==='campaign'&&b.campaignLevel.id==='full-battle'&&s.setup.encounterId==='extended'&&s.setup.mission===null&&s.setup.encounter.defenders.length===8&&s.setup.encounter.continuous&&!!s.setup.keepDefense.red;}),'Legacy Full Battle remains extended, armed, eight towers, endless waves');
 check(await saved()===fullSave,'Full Battle launch does not write campaign progress');
 // Both released chapters cleared: Chapter 3 stays coming soon and Continue is up to date, never a Chapter 3 briefing.
 await open(12);await chapters();v=await views();
 check(v[0].complete&&v[1].complete&&v[1].completed===6&&v[2].state==='coming-soon'&&v[2].missions.every(s=>s==='pending')&&await page.evaluate(()=>!window.kingdomGame.scene.getScene('ChapterSelect').chapterButtons.has('frozen-crown')),'Clearing Chapter 2 completes it and leaves Chapter 3 coming soon and non-interactive');
 await tap('ChapterSelect','backButton');await active('MainMenu');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MainMenu').continueState==='up-to-date'),'With both released chapters cleared, Continue is up to date');
 await tap('MainMenu','continueButton');await active('CampaignSelect');check(!(await page.evaluate(()=>window.kingdomGame.scene.isActive('MissionBriefing'))),'Up-to-date Continue opens the mission grid, never a Chapter 3 briefing');
 // A pre-redesign v1 save (old Levels 1-10, all of old Chapter 1) is converted once into v2; v1 itself is never written.
 await page.goto(url);await active('MainMenu');
 const v1=JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:10},(_,i)=>['campaign-'+String(i+1).padStart(2,'0'),{clears:1}]))});
 await page.evaluate(v1=>{localStorage.removeItem('kingdom-clash.campaign.v2');localStorage.setItem('kingdom-clash.campaign.v1',v1);},v1);await page.reload();await active('MainMenu');await chapters();v=await views();
 check(v[0].complete&&v[1].state==='available'&&v[1].missions[0]==='available','A v1 save with old Levels 1-10 maps to a complete six-mission Chapter 1 and opens Chapter 2');
 check(await page.evaluate(()=>localStorage.getItem('kingdom-clash.campaign.v1'))===v1&&Object.keys(JSON.parse(await saved()).levels).join()==='campaign-01,campaign-02,campaign-03,campaign-04,campaign-05,campaign-06','The v1 save is untouched and the derived v2 save holds the six Chapter 1 missions');
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
 // More than three chapters: five placeholder chapters join the live list (in the page only; nothing is saved) and the row becomes a horizontal scroller.
 await open();await page.evaluate(async()=>{
  const {campaignChapters}=await import('/src/data/campaignChapters.ts'),{campaignRules,levelId}=await import('/src/data/campaign.ts');
  for(let n=4;n<=8;n++)campaignChapters.push({id:'extra-'+n,number:n,title:'Extra Chapter '+n,subtitle:'x',narrative:'x',release:'coming-soon',artwork:'kingdom',slots:Array.from({length:campaignRules.chapterMissions},(_,i)=>{const levelNumber=(n-1)*campaignRules.chapterBlock+i+1;return{localNumber:i+1,levelNumber,levelId:levelId(levelNumber)};})});
 });
 await tap('MainMenu','campaignButton');await active('ChapterSelect');await frames();
 const row=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('ChapterSelect');return{n:s.views.length,scroll:s.scroll,min:s.minScroll,x:s.cards.x,active:s.scene.isActive('ChapterSelect'),enabled:[...s.chapterButtons.values()].map(h=>h.input.enabled)};});
 let r=await row();
 check(r.n===8&&r.min===-1500&&r.scroll===0&&r.x===0,'Eight chapters: the row starts at the current chapter and can scroll 1500 px');
 await page.screenshot({path:`${root}/chapters-8-start.png`});
 // A drag that starts on the open Chapter 1 poster scrolls the row and must not open the chapter.
 const from=await page.evaluate(()=>{const g=window.kingdomGame,b=g.scene.getScene('ChapterSelect').chapterButtons.get('first-war').getBounds(),c=g.canvas.getBoundingClientRect();return{x:c.x+b.centerX*c.width/960,y:c.y+b.centerY*c.height/540,k:c.width/960};});
 await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(from.x-140*from.k,from.y,{steps:6});await page.mouse.up();await frames();r=await row();
 check(r.active&&r.scroll<=-100&&r.x===r.scroll,'Dragging sideways scrolls the row and releasing on a poster does not open it');
 check(r.enabled.every(e=>e===false),'A poster that is partly clipped has its input disabled');
 await page.mouse.move(from.x,from.y);await page.mouse.wheel(0,4000);await frames();await page.mouse.wheel(0,4000);await frames();r=await row();
 check(r.scroll===r.min&&r.active,'The mouse wheel reaches the end of the row and stops there');
 await page.screenshot({path:`${root}/chapters-8-end.png`});
 await page.mouse.wheel(0,-9000);await frames();await page.mouse.wheel(0,-9000);await frames();r=await row();
 check(r.scroll===0&&r.enabled.every(e=>e===true),'Scrolling back restores the first three posters and the open one becomes tappable again');
 await tap('ChapterSelect','chapterButtons','first-war');await active('CampaignSelect');check(true,'With eight chapters a plain tap on the current poster still opens its Mission Select');
 check(errors.length===0,'No browser, console or asset errors');
}catch(e){errors.push(e.stack||String(e));console.error(e);process.exitCode=1;}
finally{
 if(browser)await browser.close();await server.close();
 await writeFile(`${root}/report.json`,JSON.stringify({checks,errors,passed:checks.filter(c=>c.passed).length,total:checks.length},null,2));
}
