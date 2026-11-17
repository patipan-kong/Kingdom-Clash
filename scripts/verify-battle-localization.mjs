import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createServer,preview} from 'vite';
import {campaignFrames,clickCampaignControl} from './campaign-browser-helpers.mjs';

const source=await createServer({server:{host:'127.0.0.1',port:0,ws:false}});
let server,browser;
const root='test-results/battle-localization';
const saveKey='kingdom-clash.campaign.v2';
try{
 const {campaign}=await source.ssrLoadModule('/src/data/campaignLevels.ts');
 const {missionDisplay,objectiveLabel}=await source.ssrLoadModule('/src/i18n/campaign.ts');
 const {battleMessages}=await source.ssrLoadModule('/src/i18n/battleMessages.ts');
 const {translate}=await source.ssrLoadModule('/src/i18n/index.ts');
 const corrected=['campaign-03','campaign-04','campaign-06','campaign-11','campaign-12','campaign-13','campaign-14','campaign-15','campaign-16'];
 for(const id of corrected){
  const level=campaign.get(id);
  assert.equal(level.mission.failure,undefined,id);
  for(const [locale,phrase] of [['en','Azure Keep is destroyed'],['th','ป้อมอาซูร์ถูกทำลาย'],['ja','アズール砦が破壊される']]){
   const display=missionDisplay(id,level.display,locale);
   assert.ok(display.briefing.includes(phrase),id+' '+locale);
   assert.doesNotMatch(display.briefing,/(50|60)%/,id+' '+locale);
  }
 }
 const threshold=campaign.get('campaign-21');
 assert.equal(threshold.mission.failure.azureKeepHpBelow,.5);
 for(const locale of ['en','th','ja'])assert.match(missionDisplay(threshold.id,threshold.display,locale).briefing,/50%/);
 const tokens=value=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
 for(const [key,[en,th,ja]] of Object.entries(battleMessages)){
  assert.ok(en&&th&&ja,key);
  assert.deepEqual(tokens(th),tokens(en),key+' TH');
  assert.deepEqual(tokens(ja),tokens(en),key+' JA');
 }
 const japanese=battleMessages.battleRevive[2];
 try{
  delete battleMessages.battleRevive[2];
  assert.equal(translate('battleRevive','ja',{seconds:12}),'Revive 12s');
 }finally{battleMessages.battleRevive[2]=japanese;}
 console.log('PASS nine briefing corrections, retained Chapter 3 threshold, '+Object.keys(battleMessages).length+' Battle translations, placeholder parity and English fallback');

 server=await preview({preview:{host:'127.0.0.1',port:0}});
 const url='http://127.0.0.1:'+server.httpServer.address().port;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 await mkdir(root,{recursive:true});
 for(const {locale,viewport,font} of [
  {locale:'en',viewport:{width:960,height:540},font:'Arial'},
  {locale:'th',viewport:{width:568,height:260},font:'Noto Sans Thai'},
  {locale:'ja',viewport:{width:568,height:260},font:'Noto Sans JP'},
 ]){
  const mobile=locale!=='en';
  const page=await browser.newPage({viewport,hasTouch:mobile});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.setDefaultTimeout(20000);
  const save=async ids=>page.evaluate(({ids,saveKey})=>{
   localStorage.setItem(saveKey,JSON.stringify({version:1,levels:Object.fromEntries(ids.map(id=>[id,{clears:1}]))}));
  },{ids,saveKey});
  await page.addInitScript(locale=>localStorage.setItem('kingdom-clash.locale.v1',locale),locale);
  await page.goto(url);
  const tr=(key,params)=>translate(key,locale,params);
  const active=scene=>page.waitForFunction(scene=>window.kingdomGame?.scene.isActive(scene),scene);
  const read=(property)=>page.evaluate(property=>window.kingdomGame.scene.getScene('HUD')[property].text,property);
  const snapshot=name=>page.screenshot({path:root+'/'+locale+'-'+name+'.png'});
  const click=(scene,property)=>clickCampaignControl(page,property,undefined,mobile?'touch':'mouse',scene);
  const open=async levelId=>{
   await page.evaluate(levelId=>window.kingdomGame.scene.getScene('MainMenu').scene.start('MissionBriefing',{levelId}),levelId);
   await page.waitForFunction(levelId=>window.kingdomGame.scene.isActive('MissionBriefing')&&window.kingdomGame.scene.getScene('MissionBriefing').levelId===levelId,levelId);
  };
  const battle=async()=>{await click('MissionBriefing','startButton');await active('Battle');await active('HUD');await campaignFrames(page);};
  const finish=async outcome=>{
   await page.evaluate(outcome=>{
    const sim=window.kingdomGame.scene.getScene('Battle').simulation;
    if(outcome==='defeat')sim.state.bases['blue-base'].hp=0;
    else sim.finish('victory','objectives-complete',sim.clock.tick);
   },outcome);
   await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);
   assert.equal(await read('resultTitle'),tr(outcome==='defeat'?'battleDefeat':'battleVictory'));
   const geometry=await page.evaluate(()=>{
    const h=window.kingdomGame.scene.getScene('HUD'),frame=h.campaignResultBounds;
    const actions=[h.nextHit,h.restartHit,h.chapterHit,h.levelSelectHit,h.mainMenuHit].filter(hit=>hit.visible);
    const primary=actions.find(hit=>hit.y===Math.min(...actions.map(hit=>hit.y)));
    const labelsFit=actions.every(hit=>{
     const b=hit.getBounds();
     return b.left>=0&&b.top>=0&&b.right<=960&&b.bottom<=540;
    });
    return {frame,labelsFit,progressClearsButton:h.campaignResultProgress.getBounds().bottom<primary.y-primary.height/2+5};
   });
   assert.ok(geometry.frame.y>=0&&geometry.frame.y+geometry.frame.height<=540&&geometry.labelsFit&&geometry.progressClearsButton,locale+' result '+JSON.stringify(geometry));
  };
  const bounds=async (property,child)=>{
   const metric=await page.evaluate(({property,child})=>{
    const h=window.kingdomGame.scene.getScene('HUD'),o=h[property];
    const text=child==='label'?o.getData('label'):o;
    if(!text.visible)return null;
    const b=text.getBounds(),target=child==='label'?o.getBounds():{left:0,top:0,right:960,bottom:540};
    const pixels=text.context.getImageData(0,0,text.canvas.width,text.canvas.height).data;
    return {text:text.text,font:text.style.fontFamily,drawn:pixels.some((value,i)=>i%4===3&&value>0),
     fits:b.left>=target.left-.5&&b.top>=target.top-.5&&b.right<=target.right+.5&&b.bottom<=target.bottom+.5};
   },{property,child});
   assert.ok(metric?.drawn&&metric.fits&&metric.font.includes(font),locale+' '+property+' '+JSON.stringify(metric));
   return metric.text;
  };

  await active('MainMenu');
  if(mobile)assert.ok(await page.evaluate(font=>[...document.fonts].some(f=>f.family.replaceAll('"','')===font&&f.status==='loaded'),font));
  await open('campaign-01');
  const level=campaign.get('campaign-01'),phase=level.mission.phases[0];
  const objective=objectiveLabel(level.id,phase.id,phase.objectives[0],locale);
  assert.ok(await page.evaluate(label=>window.kingdomGame.scene.getScene('MissionBriefing').content.list.some(o=>o.text==='◆  '+label),objective));
  await battle();
  assert.equal(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').missionView.rows[0].label),objective);
  assert.equal((await bounds('waveText')).replace(/\s/g,''),tr('battleObjective',{label:objective,progress:0,target:5}).replace(/\s/g,''));
  const guardian=await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return [h.levelText.text,h.skillEntryCaption.text];});
  assert.deepEqual(guardian,[tr('battleLevel',{level:1}),tr('battleSkills')]);
  const feedback=await page.evaluate(()=>{
   const g=window.kingdomGame,h=g.scene.getScene('HUD');
   const notice=()=>({text:h.combatNotice.text,visible:h.combatNotice.visible,until:h.combatNoticeUntil});
   g.events.emit('tower-danger');
   const tower=notice();
   g.events.emit('guardian-feedback-clear');
   const cleared=notice();
   g.events.emit('tower-danger');
   const repeated=notice();
   g.events.emit('cast-feedback','No legal target in range / line of sight');
   const rejection=notice();
   g.events.emit('tower-danger');
   g.events.emit('guardian-feedback-clear');
   return {tower,cleared,repeated,rejection,afterClear:notice()};
  });
  assert.equal(feedback.tower.text,tr('battleTowerDanger'));
  assert.equal(feedback.tower.visible,true);
  assert.deepEqual(feedback.cleared,{...feedback.tower,visible:false},locale+' tower notice clears');
  assert.deepEqual(feedback.repeated,feedback.cleared,locale+' tower repeat remains suppressed');
  assert.equal(feedback.rejection.text,tr('battleNoReach'));
  assert.equal(feedback.rejection.visible,true);
  assert.deepEqual(feedback.afterClear,feedback.rejection,locale+' higher-priority notice survives with the same timeout');
  await page.evaluate(()=>{
   const g=window.kingdomGame,s=g.scene.getScene('Battle').simulation;
   s.hero.hp=0;s.hero.respawnTick=s.clock.tick+12*30;
   s.state.encounter.alliedBaseHitTick=s.clock.tick;
   g.events.emit('cast-feedback','No legal target in range / line of sight');
  });
  await campaignFrames(page);
  assert.equal(await bounds('hpText'),tr('battleRevive',{seconds:12}));
  assert.equal(await bounds('combatNotice'),tr('battleNoReach'));
  assert.equal((await bounds('waveText')).replace(/\n/g,''),tr('battleThreatAttack'));
  assert.equal(await bounds('keepLabel'),tr('battleAzureUpper'));
  if(mobile)assert.ok(await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),m=h.guardianLayout.match;return h.keepLabel.getBounds().left>m.x+m.width&&h.combatNotice.getBounds().top>m.y+m.height;}));
  await snapshot('battle');

  await page.keyboard.press('Space');
  await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').overlay.visible);
  assert.equal(await read('pauseTitle'),tr('battlePauseTitle'));
  assert.equal(await read('pauseLabel'),tr('battleResume'));
  await snapshot('pause');
  await click('HUD','pauseResume');
  await page.waitForFunction(()=>!window.kingdomGame.scene.getScene('HUD').paused);

  await finish('victory');
  assert.equal(await bounds('nextHit','label'),tr('battleNextMission'));
  assert.ok((await bounds('campaignResultProgress')).includes(objective));
  assert.ok((await bounds('resultDetail')).includes(tr('battleMissionUnlocked',{mission:tr('battleMissionNumber',{chapter:1,mission:2})})));
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).levels['campaign-01'].clears,saveKey),1);
  await snapshot('victory');
  await click('HUD','nextHit');
  await page.waitForFunction(()=>window.kingdomGame.scene.isActive('MissionBriefing')&&window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-02');
  await battle();
  await finish('defeat');
  assert.equal(await bounds('restartHit','label'),tr('battleRetry'));
  assert.equal(await bounds('resultDetail'),tr('battleOutcomeAzure'));
  await snapshot('defeat');
  await click('HUD','restartHit');
  await page.waitForFunction(()=>{
   const g=window.kingdomGame,b=g.scene.getScene('Battle'),h=g.scene.getScene('HUD');
   return g.scene.isActive('Battle')&&b.campaignLevel.id==='campaign-02'&&!b.simulation.ended&&!h.results.visible;
  });
  assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).levels['campaign-02'],saveKey),undefined);

  const ids=campaign.list().filter(l=>l.chapter<=5&&l.id.startsWith('campaign-')).map(l=>l.id);
  await save(ids.slice(0,5));
  await page.reload();await active('MainMenu');await open('campaign-06');await battle();await finish('victory');
  assert.equal(await bounds('nextHit','label'),tr('battleNextChapter'));
  await click('HUD','nextHit');
  await page.waitForFunction(()=>window.kingdomGame.scene.isActive('MissionBriefing')&&window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-11');

  await save(ids.slice(0,-1));
  await page.reload();await active('MainMenu');await open('campaign-31');await battle();
  assert.equal((await read('waveText')).replace(/\s/g,''),tr('battleCapture',{name:tr('battleCampForest')}).replace(/\s/g,''));
  const names=await page.evaluate(()=>{
   const g=window.kingdomGame,b=g.scene.getScene('Battle');
   return b.postTexts.filter(o=>o.visible&&o.text).map(o=>({text:o.text,font:o.style.fontFamily}));
  });
  assert.ok(names.some(o=>o.text.includes(mobile?tr('battleCampForest'):'FOREST CAMP')&&(mobile?o.font.includes(font):true)),JSON.stringify(names));
  await snapshot('world');

  await page.reload();await active('MainMenu');await open('campaign-21');await battle();await finish('victory');
  assert.ok((await bounds('campaignResultProgress')).split('\n').length===3);
  assert.equal(await bounds('nextHit','label'),tr('battleNextMission'));
  await snapshot('three-objectives');

  await page.reload();await active('MainMenu');await open('campaign-46');await battle();await finish('victory');
  assert.equal(await bounds('chapterHit','label'),tr('battleCampaignComplete'));
  assert.ok((await bounds('resultDetail')).includes(tr('battleAllComplete')));
  await click('HUD','chapterHit');await active('ChapterSelect');
  await page.evaluate(()=>window.kingdomGame.scene.getScene('ChapterSelect').scene.start('Battle',{mode:'quick',encounter:'extended'}));
  await active('Battle');await active('HUD');
  await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').teaching==='orientation');
  assert.equal(await read('toast'),tr('battleOrientation'));
  await page.evaluate(()=>{
   const s=window.kingdomGame.scene.getScene('Battle').simulation;
   s.hero.statuses=[{type:'slow',sourceId:'probe',sourceLife:'probe',startTick:s.clock.tick,expiresTick:s.clock.tick+300,magnitude:.2}];
  });
  await page.waitForFunction(()=>window.kingdomGame.scene.getScene('Battle').statusTexts.get('guardian')?.visible);
  assert.equal(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').statusTexts.get('guardian').text),tr('battleSlow'));
  assert.deepEqual(errors,[]);
  await page.close();
  console.log('PASS '+locale+' '+viewport.width+'×'+viewport.height+' — objective/font bounds, feedback, pause/resume, Victory routing, Defeat/Retry, conquest/status labels, contextual guidance, Campaign Complete and saves');
 }
}finally{
 await browser?.close();
 await new Promise(resolve=>server?server.httpServer.close(resolve):resolve());
 await source.close();
}
