import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {campaignFrames,clickCampaignControl,revealCampaignSlot} from './campaign-browser-helpers.mjs';

const root=process.env.SELECTION_EVIDENCE_ROOT||'test-results/campaign-selection';await mkdir(root,{recursive:true});
const server=await createServer({root:resolve('.'),server:{host:'127.0.0.1',port:5198,strictPort:false}});
let browser,page;const checks=[],errors=[];
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
try{
 await server.listen();const address=server.httpServer.address(),url=`http://127.0.0.1:${address.port}/`;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 page=await browser.newPage({viewport:{width:960,height:540}});page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(60000);
 await page.addInitScript(()=>{window.selectionWrites=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){window.selectionWrites++;return set.apply(this,args);};});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const active=name=>page.waitForFunction(name=>window.kingdomGame?.scene.isActive(name),name);
 const saved=()=>page.evaluate(()=>localStorage.getItem('kingdom-clash.campaign.v2')); // Phase B1: the v2 save; Chapter 1 is campaign-01..06
 async function tap(scene,prop,key){const p=await page.evaluate(({scene,prop,key})=>{const g=window.kingdomGame,s=g.scene.getScene(scene),o=key===undefined?s[prop]:s[prop].get(key),b=o.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},{scene,prop,key});await page.mouse.click(p.x,p.y);await campaignFrames(page);}
 async function open(clears=0){await page.goto(url);await active('MainMenu');await page.evaluate(clears=>{if(!clears)localStorage.removeItem('kingdom-clash.campaign.v2');else localStorage.setItem('kingdom-clash.campaign.v2',JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:clears},(_,i)=>['campaign-'+String(i+1).padStart(2,'0'),{clears:1}]))}));},clears);await page.reload();await active('MainMenu');}
 async function grid(){await tap('MainMenu','campaignButton');await active('ChapterSelect');await tap('ChapterSelect','chapterButtons','first-war');await active('CampaignSelect');}
 const state=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect');return{selected:s.selectedLevelId,chapter:s.chapterId,slots:[...s.slotCards.keys()],open:[...s.levelButtons.keys()],locked:[...s.lockedCards.keys()],pending:[...s.pendingCards.keys()],recommended:s.missions.filter(m=>m.recommended).map(m=>m.id),focus:s.focusId,badges:s.missions.map(m=>m.badge),inert:[...s.lockedCards.values(),...s.pendingCards.values()].every(h=>!h.input)};});
 const measure=()=>page.evaluate(()=>{
  const s=window.kingdomGame.scene.getScene('CampaignSelect'),k=window.kingdomGame.canvas.getBoundingClientRect().height/540,inside=b=>b.left>=-.5&&b.top>=-.5&&b.right<=960.5&&b.bottom<=540.5;
  const visible=o=>{const b=o.getBounds();return b.top>=s.clip.top&&b.bottom<=s.clip.bottom;};
  const texts=[...s.children.list.filter(o=>o.type==='Text'&&o.visible&&o.text),...s.cards.list.filter(o=>o.type==='Text'&&o.visible&&o.text&&visible(o))];
  const overlaps=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
  const collisions=texts.flatMap((a,i)=>texts.slice(i+1).filter(b=>overlaps(a.getBounds(),b.getBounds())).map(b=>`${a.text} / ${b.text}`));
  const hits=[s.backButton,...s.levelButtons.values()].filter(h=>h.input?.enabled).map(h=>h.getBounds());
  return{minScroll:s.minScroll,cardHeight:s.layout.slots[0].height,collisions,textsInside:texts.every(t=>inside(t.getBounds())),controlsInside:hits.every(inside),hitOverlap:hits.some((a,i)=>hits.slice(i+1).some(b=>overlaps(a,b))),minCss:Math.min(...texts.map(t=>parseFloat(t.style.fontSize)*k)),positions:[...s.slotCards.values()].map(h=>{const b=h.getBounds();return{x:b.x,y:b.y};})};
 });
 await open();await grid();let s=await state();
 check(s.chapter==='first-war'&&s.slots.length===6&&!s.slots.includes('campaign-07')&&!s.slots.includes('full-battle'),'Chapter-aware grid contains exactly six story slots');
 check(s.selected==='campaign-01'&&s.recommended.join()==='campaign-01'&&s.open.join()==='campaign-01'&&s.badges[0]==='PLAY'&&s.badges.slice(1).every(b=>!b),'Fresh save recommends the only available mission: it alone carries the PLAY badge');
 check(s.inert&&s.pending.length===0&&s.locked.length===5&&s.locked.includes('campaign-06'),'All six missions registered; locked missions have no input');
 const before=await saved();await clickCampaignControl(page,'levelButtons','campaign-01');await active('MissionBriefing');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-01'),'One tap on an available mission opens its Briefing directly (no detail panel, no separate Briefing button)');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').children.list.some(o=>o.type==='Text'&&o.text==='BACK TO MISSIONS')),'The Briefing opened from a mission grid offers BACK TO MISSIONS');
 await tap('MissionBriefing','backButton');await active('CampaignSelect');
 check((await state()).focus==='campaign-01'&&(await state()).selected==='campaign-01','Returning from the Briefing restores the opened mission as the selection');
 for(const id of ['campaign-02','campaign-06']){await revealCampaignSlot(page,id,'slotCards');await clickCampaignControl(page,'slotCards',id);check((await state()).selected==='campaign-01'&&await page.evaluate(()=>window.kingdomGame.scene.isActive('CampaignSelect')),`Inert ${id} cannot select or launch`);}
 check(await saved()===before&&await page.evaluate(()=>window.selectionWrites===0),'Fresh browsing and briefing review write no save');
 await clickCampaignControl(page,'backButton');await active('ChapterSelect');check(true,'Grid Back returns to ChapterSelect');
 await tap('ChapterSelect','backButton');await active('MainMenu');await tap('MainMenu','continueButton');await active('MissionBriefing');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-01'),'Fresh Continue shortcut remains direct to briefing');
 await open(2);await grid();s=await state();
 check(s.recommended.join()==='campaign-03'&&s.selected==='campaign-03'&&s.open.length===3,'Partial save recommends the next authoritative mission');
 for(const [width,height] of [[960,540],[1280,720],[1920,1080],[844,390]]){
  await page.setViewportSize({width,height});await campaignFrames(page,5);const m=await measure();
  check(m.textsInside&&m.controlsInside&&!m.hitOverlap&&m.collisions.length===0,`No clipped or overlapping text/controls at ${width}×${height}${m.collisions.length?' '+m.collisions.join('; '):''}`);
  check(m.minCss>=(width===844?10.9:9.5),`Text is readable at ${width}×${height}`);
  check(new Set(m.positions.map(p=>Math.round(p.x))).size===3&&new Set(m.positions.map(p=>Math.round(p.y))).size===2&&m.minScroll===0,`${width}×${height} presents a 3×2 mission grid with no scrolling`);
  check(m.cardHeight===150,`${width}×${height} uses 150 px mission cards (two rows fit the clip)`);
  await page.screenshot({path:`${root}/grid-${width}x${height}.png`});
 }
 // Every slot, including locked ones and the finale, is fully visible on a phone in landscape without scrolling.
 for(const id of (await state()).slots)check(await page.evaluate(id=>{const s=window.kingdomGame.scene.getScene('CampaignSelect'),b=s.slotCards.get(id).getBounds();return s.scroll===0&&b.top>=s.clip.top&&b.bottom<=s.clip.bottom;},id),`Small landscape shows ${id} without scrolling`);
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('CampaignSelect').missions.map(m=>m.finale).join()==='false,false,false,false,false,true'),'Mission 6 is the chapter finale');
 await page.screenshot({path:`${root}/grid-finale-844x390.png`});
 check((await state()).inert,'Scrolling never enables locked or pending slots');
 await revealCampaignSlot(page,'campaign-01');const selectedBefore=(await state()).selected;
 const drag=await page.evaluate(()=>{const g=window.kingdomGame,s=g.scene.getScene('CampaignSelect'),b=s.levelButtons.get('campaign-01').getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540,dy:22*r.height/540};});
 await page.mouse.move(drag.x,drag.y);await page.mouse.down();await page.mouse.move(drag.x,drag.y+drag.dy,{steps:5});await page.mouse.up();await campaignFrames(page);
 check((await state()).selected===selectedBefore&&await page.evaluate(()=>window.kingdomGame.scene.isActive('CampaignSelect')),'Drag release cannot select or launch a mission');
 check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect');return [...s.levelButtons.values()].every(h=>{const b=h.getBounds(),visible=b.top>=s.clip.top&&b.bottom<=s.clip.bottom;return h.input.enabled===visible;});}),'Partially clipped tile input matches full visibility');
 await revealCampaignSlot(page,'campaign-01');await clickCampaignControl(page,'levelButtons','campaign-01');await active('MissionBriefing');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-01'),'A completed mission opens its replay Briefing with one tap');
 await tap('MissionBriefing','backButton');await active('CampaignSelect');s=await state();
 check(s.selected==='campaign-01'&&s.focus==='campaign-01'&&s.recommended.join()==='campaign-03'&&s.badges.join()===',,PLAY,,,','Returning from a replay focuses Mission 1 while the PLAY badge and recommendation stay on Mission 3');
 await open(6);await grid();s=await state();check(s.open.length===6&&s.recommended.length===0&&s.pending.length===0&&await page.evaluate(()=>window.kingdomGame.scene.getScene('CampaignSelect').missions.every(m=>m.state==='completed')),'All six completed missions remain replayable with no pending slots or recommendation');
 await page.screenshot({path:`${root}/grid-all-released-complete.png`});
 await page.setViewportSize({width:960,height:540});await campaignFrames(page);await open(2);await grid();
 const stableSave=await saved(),counts=await page.evaluate(()=>{const g=window.kingdomGame,s=g.scene.getScene('CampaignSelect');return{input:['wheel','pointerdown','pointermove','pointerup'].map(n=>s.input.listenerCount(n)),resize:g.scale.listenerCount('resize')};});
 for(let i=0;i<5;i++){
  await clickCampaignControl(page,'backButton');await active('ChapterSelect');check(await page.evaluate(()=>['wheel','pointerdown','pointermove','pointerup'].every(n=>window.kingdomGame.scene.getScene('CampaignSelect').input.listenerCount(n)===0)),`Shutdown removes grid handlers ${i+1}`);
  await tap('ChapterSelect','chapterButtons','first-war');await active('CampaignSelect');
 }
 check(await page.evaluate(c=>{const g=window.kingdomGame,s=g.scene.getScene('CampaignSelect');return JSON.stringify(['wheel','pointerdown','pointermove','pointerup'].map(n=>s.input.listenerCount(n)))===JSON.stringify(c.input)&&g.scale.listenerCount('resize')===c.resize;},counts),'Repeated navigation has no duplicate input/resize handlers');
 check(await saved()===stableSave&&await page.evaluate(()=>window.selectionWrites===0),'Repeated chapter navigation writes no save');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('CampaignSelect').fullBattleButton===undefined),'Mission Select has no Full Battle entry');
 await clickCampaignControl(page,'backButton');await active('ChapterSelect');await clickCampaignControl(page,'fullBattleButton',undefined,'mouse','ChapterSelect');await active('MissionBriefing');check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='full-battle'),'Chapter Select Full Battle preserves the legacy briefing route');
 await tap('MissionBriefing','startButton');await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 check(await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;return b.campaignLevel.id==='full-battle'&&s.setup.mission===null&&s.setup.encounter.continuous&&s.setup.encounter.defenders.length===8&&!!s.setup.keepDefense.red;}),'Full Battle remains armed, endless and unchanged');
 check(await saved()===stableSave,'Full Battle launch does not write campaign progress');
 await open(2);await tap('MainMenu','continueButton');await active('MissionBriefing');check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-03'),'Partial Continue still opens recommended briefing directly');
 await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').scene.start('CampaignSelect',{chapterId:'burning-frontier'}));await active('ChapterSelect');check(true,'Direct navigation cannot open an unavailable chapter');
 await open();await page.evaluate(()=>window.kingdomGame.scene.getScene('MainMenu').scene.start('MissionBriefing',{levelId:'campaign-05'}));await active('CampaignSelect');check(true,'Existing locked briefing guard remains effective');
 check(errors.length===0,'No browser, console or HTTP errors');
}catch(e){errors.push(e.stack||String(e));console.error(e);if(page)await page.screenshot({path:`${root}/failure.png`,fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{if(browser)await browser.close();await server.close();await writeFile(`${root}/report.json`,JSON.stringify({checks,errors,passed:checks.filter(c=>c.passed).length,total:checks.length},null,2));}
