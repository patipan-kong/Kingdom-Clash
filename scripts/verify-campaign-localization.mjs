import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {campaignFrames,clickCampaignControl} from './campaign-browser-helpers.mjs';

const server=await createServer({server:{host:'127.0.0.1',port:0}});
let browser;
try{
 await server.listen();
 const url=`http://127.0.0.1:${server.httpServer.address().port}/`;
 const {campaign}=await server.ssrLoadModule('/src/data/campaignLevels.ts');
 const {campaignChapters}=await server.ssrLoadModule('/src/data/campaignChapters.ts');
 const {chapterContent,missionContent}=await server.ssrLoadModule('/src/i18n/campaignContent.ts');
 const {chapterDisplay,missionDisplay,objectiveLabel,objectiveLabels}=await server.ssrLoadModule('/src/i18n/campaign.ts');
 const {messages}=await server.ssrLoadModule('/src/i18n/messages.ts');
 const {translate}=await server.ssrLoadModule('/src/i18n/index.ts');
 const chapters=campaignChapters.filter(chapter=>chapter.release==='available');
 const ids=chapters.flatMap(chapter=>chapter.slots.map(slot=>slot.levelId));
 const levels=ids.map(id=>campaign.get(id));
 assert.equal(chapters.length,5);
 assert.equal(levels.length,30);
 assert.deepEqual(Object.keys(chapterContent).sort(),chapters.map(chapter=>chapter.id).sort());
 assert.deepEqual(Object.keys(missionContent).sort(),[...ids].sort());
 assert.deepEqual(Object.keys(objectiveLabels).sort(),[...ids].sort());
 const fields=['title','description','briefing','strategy'];
 for(const chapter of chapters){
  for(const field of ['title','subtitle','narrative']){
   assert.equal(chapterDisplay(chapter,'en')[field],chapter[field]);
   for(const locale of ['th','ja'])assert.ok(chapterDisplay(chapter,locale)[field]&&chapterDisplay(chapter,locale)[field]!==chapter[field],`${chapter.id}:${locale}:${field}`);
  }
 }
 let objectives=0;
 for(const level of levels){
  assert.equal(missionDisplay(level.id,level.display,'en'),level.display);
  const keys=[];
  for(const phase of level.mission.phases)for(const objective of phase.objectives){
   const id=`${phase.id}/${objective.id}`;
   keys.push(id);
   assert.ok(objectiveLabels[level.id][id],`${level.id}:${id}`);
   assert.equal(objectiveLabel(level.id,phase.id,objective,'en'),objective.display.label);
   for(const locale of ['th','ja']){
    const label=objectiveLabel(level.id,phase.id,objective,locale);
    assert.ok(label&&label!==objective.display.label&&!label.includes('{'),`${level.id}:${id}:${locale}`);
   }
   objectives++;
  }
  assert.deepEqual(Object.keys(objectiveLabels[level.id]).sort(),keys.sort());
  for(const locale of ['th','ja']){
   const display=missionDisplay(level.id,level.display,locale);
   for(const field of fields)assert.ok(display[field]&&display[field]!==level.display[field],`${level.id}:${locale}:${field}`);
   assert.equal(display.difficulty,level.display.difficulty);
  }
 }
 assert.equal(objectives,48);
 const tokens=value=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
 for(const [key,[en,th,ja]] of Object.entries(messages)){
  assert.deepEqual(tokens(th),tokens(en),`${key}:th placeholders`);
  assert.deepEqual(tokens(ja),tokens(en),`${key}:ja placeholders`);
 }
 const legacy=campaign.get('full-battle');
 assert.equal(missionDisplay(legacy.id,legacy.display,'th'),legacy.display);
 const original=messages.buildTowers[2];
 try{
  delete messages.buildTowers[2];
  const phase=campaign.get('campaign-02').mission.phases[0];
  assert.equal(objectiveLabel('campaign-02',phase.id,phase.objectives[0],'ja'),'Complete 2 Archer Towers');
  assert.equal(translate('buildTowers','ja',{count:2}),'Build 2 Archer Towers');
 }finally{messages.buildTowers[2]=original;}
 console.log('PASS 5 chapters, 30 missions, 48 objectives, placeholder parity and English fallback');

 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const progressKey='kingdom-clash.campaign.v2';
 const save=JSON.stringify({version:1,levels:Object.fromEntries(ids.slice(0,-1).map(id=>[id,{clears:1}]))});
 for(const locale of ['en','th','ja']){
  const viewport=locale==='en'?{width:960,height:540}:{width:780,height:360};
  const page=await browser.newPage({viewport});
  page.setDefaultTimeout(25000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(locale=>localStorage.setItem('kingdom-clash.locale.v1',locale),locale);
  await page.goto(url);
  const active=scene=>page.waitForFunction(scene=>window.kingdomGame?.scene.isActive(scene),scene);
  const click=(scene,property,key)=>clickCampaignControl(page,property,key,'mouse',scene);
  await active('MainMenu');
  await click('MainMenu','campaignButton');await active('ChapterSelect');
  assert.deepEqual(await page.evaluate(()=>Array.from(window.kingdomGame.scene.getScene('ChapterSelect').chapterButtons.keys())),['first-war']);
  await click('ChapterSelect','backButton');await active('MainMenu');
  await page.evaluate(([key,save])=>localStorage.setItem(key,save),[progressKey,save]);
  const long=[...levels].sort((a,b)=>{
   const length=level=>{const d=missionDisplay(level.id,level.display,locale);return d.briefing.length+d.strategy.length;};
   return length(b)-length(a);
  }).slice(0,3).map(level=>level.id);
  for(const chapter of chapters){
   await click('MainMenu','campaignButton');await active('ChapterSelect');
   // Use the scene's existing scroll bounds to expose posters on either end of the row.
   await page.evaluate(id=>{
    const scene=window.kingdomGame.scene.getScene('ChapterSelect');
    const i=scene.views.findIndex(view=>view.chapter.id===id);
    scene.setScroll(-i*300);
   },chapter.id);
   await click('ChapterSelect','chapterButtons',chapter.id);await active('CampaignSelect');
   const expected=chapter.slots.map(slot=>missionDisplay(slot.levelId,campaign.get(slot.levelId).display,locale).title);
   const layout=await page.evaluate(expected=>{
    const s=window.kingdomGame.scene.getScene('CampaignSelect');
    const kind=s.chapterId==='conquered-lands'?'map':s.chapterId==='rise-of-the-heroes'?'hero':'grid';
    const labels=kind==='map'?s.conquestMap.labels:kind==='hero'?s.heroCampaignView.labels:null;
    const objects=labels?Array.from(labels.values()):s.cards.list;
    return {titles:s.missions.map(m=>m.title),visible:expected.every(name=>objects.some(o=>{
     if(o.text!==name)return false;
     const b=o.getBounds();return b.left>=0&&b.right<=960&&b.top>=0&&b.bottom<=540;
    })),kind};
   },expected);
   assert.deepEqual(layout.titles,expected);
   assert.ok(layout.visible,`${locale} ${chapter.id}: mission labels inside canvas`);
   for(const id of new Set([chapter.slots[0].levelId,...chapter.slots.map(slot=>slot.levelId).filter(id=>long.includes(id)||id==='campaign-46')])){
    await click('CampaignSelect','levelButtons',id);
    if(layout.kind==='map'){
     const p=await page.evaluate(()=>{
      const g=window.kingdomGame,b=g.scene.getScene('CampaignSelect').conquestMap.briefingButton.getBounds(),r=g.canvas.getBoundingClientRect();
      return {x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};
     });
     await page.mouse.click(p.x,p.y);
    }
    await active('MissionBriefing');await campaignFrames(page);
    const compact=id==='campaign-46'&&locale!=='en';
    if(compact){
     await page.setViewportSize({width:568,height:260});
     await campaignFrames(page);
     await page.evaluate(()=>{
      const scene=window.kingdomGame.scene.getScene('MissionBriefing');
      scene.scene.restart({levelId:scene.levelId,returnTo:scene.returnTo});
     });
     await campaignFrames(page);
    }
    const level=campaign.get(id),display=missionDisplay(id,level.display,locale);
    const copy=[display.title,display.briefing,...level.mission.phases.flatMap(phase=>phase.objectives.map(objective=>`◆  ${objectiveLabel(id,phase.id,objective,locale)}`)),translate('tip',locale,{text:display.strategy})];
    const measured=await page.evaluate(copy=>{
     const game=window.kingdomGame,s=game.scene.getScene('MissionBriefing');
     const texts=s.content.list.filter(o=>o.type==='Text');
     const bounds=texts.map(o=>o.getBounds());
     const b=s.startButton.getBounds(),r=game.canvas.getBoundingClientRect();
     const footer=s.children.list.find(o=>o.type==='Text'&&o.x===b.centerX&&o.y===b.centerY)?.getBounds();
     return {
      has:copy.every(c=>texts.some(o=>o.text===c)),
      fits:bounds.every((a,i)=>a.left>=s.clip.left&&a.right<=s.clip.right+.5&&(i===0||a.top>=bounds[i-1].bottom-.5)),
      footer:footer&&footer.left>=b.left&&footer.right<=b.right&&footer.top>=b.top&&footer.bottom<=b.bottom,
      min:s.minScroll,x:r.x+r.width/2,y:r.y+(s.clip.top+s.clip.bottom)/2*r.height/540,
     };
    },copy);
    assert.ok(measured.has&&measured.fits&&measured.footer,`${locale} ${id}: ${JSON.stringify(measured)}`);
    if(compact)assert.ok(measured.min<0,`${locale} finale exercises scrolling at 568×260`);
    if(measured.min<0){
     await page.mouse.move(measured.x,measured.y);await page.mouse.wheel(0,1500);
     await page.waitForFunction(()=>{const s=window.kingdomGame.scene.getScene('MissionBriefing');return s.scroll===s.minScroll;});
     const endVisible=await page.evaluate(()=>{
      const s=window.kingdomGame.scene.getScene('MissionBriefing');
      const tip=s.content.list.filter(o=>o.type==='Text').at(-1).getBounds();
      return tip.bottom<=s.clip.bottom+.5;
     });
     assert.ok(endVisible,`${locale} ${id}: scroll reaches the end of the strategy`);
    }
    if(compact){await page.setViewportSize(viewport);await campaignFrames(page);}
    await click('MissionBriefing','backButton');await active('CampaignSelect');
   }
   await click('CampaignSelect','backButton');await active('ChapterSelect');
   await click('ChapterSelect','backButton');await active('MainMenu');
  }
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),progressKey),save);
  assert.deepEqual(errors,[]);
  await page.close();
  console.log(`PASS ${locale}: five chapters, map and hero selections, longest briefings, and preserved Campaign save`);
 }
}finally{
 await browser?.close();
 await server.close();
}
