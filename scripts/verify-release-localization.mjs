import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {createServer,preview} from 'vite';
import {campaignFrames,clickCampaignControl} from './campaign-browser-helpers.mjs';

const source=await createServer({server:{host:'127.0.0.1',port:0,ws:false}});
const evidence='test-results/release-localization';
let server,browser;
try{
 const {messages}=await source.ssrLoadModule('/src/i18n/messages.ts');
 const {translate}=await source.ssrLoadModule('/src/i18n/index.ts');
 const {interactionRejection}=await source.ssrLoadModule('/src/i18n/interaction.ts');
 const {campaign}=await source.ssrLoadModule('/src/data/campaignLevels.ts');
 const tokens=value=>[...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
 for(const [key,[en,th,ja]] of Object.entries(messages)){
  assert.ok(en&&th&&ja,key);
  assert.deepEqual(tokens(th),tokens(en),key+' TH');
  assert.deepEqual(tokens(ja),tokens(en),key+' JA');
 }
 assert.equal(interactionRejection('Unknown canonical reason'),'Unknown canonical reason');
 console.log('PASS '+Object.keys(messages).length+' message rows complete with matching placeholders');
 const save=JSON.stringify({version:1,levels:Object.fromEntries(campaign.list()
  .filter(level=>level.number<34&&level.id.startsWith('campaign-')).map(level=>[level.id,{clears:1}]))});
 const earned=JSON.stringify({version:1,unlocked:{'ballista-recovered':1767225600000},bestTimes:{'campaign-32':1800}});
 server=await preview({preview:{host:'127.0.0.1',port:0}});
 const url='http://127.0.0.1:'+server.httpServer.address().port;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 await mkdir(evidence,{recursive:true});

 for(const locale of ['en','th','ja'])for(const [width,height] of [[960,540],[780,360],[568,260]]){
  const tag=locale+'-'+width+'x'+height,input=height===540?'mouse':'touch';
  if(process.env.PHASE5_CASE&&!tag.startsWith(process.env.PHASE5_CASE))continue;
  const page=await browser.newPage({viewport:{width,height},hasTouch:input==='touch'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.setDefaultTimeout(20000);
  await page.addInitScript(({locale,save,earned})=>{
   if(sessionStorage.seeded)return;
   localStorage.setItem('kingdom-clash.locale.v1',locale);
   localStorage.setItem('kingdom-clash.campaign.v2',save);
   localStorage.setItem('kingdom-clash.achievements.v1',earned);
   sessionStorage.seeded='1';
  },{locale,save,earned});
  const tr=(key,params)=>translate(key,locale,params);
  const active=scene=>page.waitForFunction(scene=>window.kingdomGame?.scene.isActive(scene),scene);
  const click=(scene,property,key)=>clickCampaignControl(page,property,key,input,scene);
  const screenshot=name=>page.screenshot({path:evidence+'/'+tag+'-'+name+'.png'});
  await page.goto(url);
  try{
   await active('MainMenu');
   assert.equal(await page.title(),tr('documentTitle'));
   assert.equal(await page.locator('canvas').getAttribute('aria-label'),tr('canvasLabel'));
   await click('MainMenu','achievementsButton');
   await active('Achievements');
   const cards=await page.evaluate(()=>{
    const g=window.kingdomGame,s=g.scene.getScene('Achievements'),k=g.canvas.getBoundingClientRect().height/540;
    const back=s.backButton.getBounds(),replay=s.replayButtons.get('ballista-recovered').getBounds();
    const cardText=s.cards.list.filter(o=>o.type==='Text');
    const boxes=cardText.map(o=>o.getBounds());
    return {counter:s.counter.text,title:s.children.list.find(o=>o.type==='Text').text,
     texts:cardText.map(o=>o.text),lines:cardText.flatMap(o=>o.getWrappedText()),
     fits:back.bottom<=540&&back.height*k>=44&&replay.height*k>=43.9&&replay.top>=s.listTop&&replay.bottom<=s.listBottom
      &&boxes.every(b=>b.left>=0&&b.right<=960)&&boxes.every((b,i)=>boxes.slice(i+1).every(c=>b.right<=c.left||b.bottom<=c.top||c.right<=b.left||c.bottom<=b.top))};
   });
   assert.equal(cards.title,tr('achievements'));
   assert.equal(cards.counter,tr('achievementCount',{count:1,total:3}));
   for(const key of ['achievementBallista','achievementBallistaDescription','achievementWarCart','achievementBarracks','achievementLocked'])
    assert.ok(cards.texts.some(text=>text.includes(tr(key))),key);
   assert.ok(cards.lines.some(text=>text.includes(tr('achievementBestTime',{time:'1:00'}))),JSON.stringify(cards.lines));
   assert.ok(cards.fits,JSON.stringify(cards));
   await screenshot('achievements');
   await click('Achievements','replayButtons','ballista-recovered');
   await active('MissionBriefing');
   assert.equal(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId),'campaign-32');
   assert.equal(await page.evaluate(()=>localStorage.getItem('kingdom-clash.achievements.v1')),earned);
   await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').scene.restart({levelId:'campaign-34'}));
   await page.waitForFunction(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-34');
   await click('MissionBriefing','startButton');
   await active('HUD');
   await page.evaluate(()=>{window.hud=window.kingdomGame.scene.getScene('HUD');window.battle=window.kingdomGame.scene.getScene('Battle');});
   const tap=async (expression,fraction=.5)=>{
    const point=await page.evaluate(({expression,fraction})=>{
     const b=eval(expression).getBounds(),r=window.kingdomGame.canvas.getBoundingClientRect();
     return {x:r.x+(b.left+b.width*fraction)*r.width/960,y:r.y+b.centerY*r.height/540};
    },{expression,fraction});
    if(input==='touch')await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);
    await campaignFrames(page);
   };
   await tap('hud.pauseButton.hit');
   await tap("hud.pauseButtons.find(b=>b.id==='audio').hit");
   const audio=await page.evaluate(()=>{
    const panel=hud.audioSettings,k=window.kingdomGame.canvas.getBoundingClientRect().height/540;
    const controls=[panel.muteHit,...panel.sliders.map(row=>row.hit),panel.backHit].map(o=>o.getBounds());
    const labels=panel.root.list.filter(o=>o.type==='Text').sort((a,b)=>a.y-b.y);
    return {visible:panel.visible,tick:battle.simulation.clock.tick,texts:labels.map(o=>o.text),fonts:labels.map(o=>o.style.fontFamily),
     fits:controls.every((b,i)=>b.width*k>=44&&b.height*k>=43.9&&b.left>=0&&b.right<=960&&b.top>=0&&b.bottom<=540&&(!i||controls[i-1].bottom<=b.top))
      &&labels.every((o,i)=>{const b=o.getBounds();return b.left>=panel.bounds.x&&b.right<=panel.bounds.x+panel.bounds.width&&b.top>=panel.bounds.y&&b.bottom<=panel.bounds.y+panel.bounds.height&&labels.slice(i+1).every(c=>b.bottom<=c.getBounds().top);})};
   });
   assert.ok(audio.visible&&audio.fits,JSON.stringify(audio));
   for(const key of ['audioSettings','audioMuteOff','back'])assert.ok(audio.texts.includes(tr(key)),key);
   if(locale!=='en'){
    const name=locale==='th'?'Noto Sans Thai':'Noto Sans JP';
    assert.ok(audio.fonts.every(font=>font.includes(name)));
    assert.ok(await page.evaluate(name=>[...document.fonts].some(font=>font.family.includes(name)&&font.status==='loaded'),name));
   }
   await tap('hud.audioSettings.muteHit');
   await tap('hud.audioSettings.sliders[0].hit',.2);
   await tap('hud.audioSettings.sliders[1].hit',.8);
   const changed=await page.evaluate(()=>({settings:battle.audio.settings,tick:battle.simulation.clock.tick,labels:hud.audioSettings.root.list.filter(o=>o.type==='Text').map(o=>o.text)}));
   assert.equal(changed.tick,audio.tick);
   assert.deepEqual([changed.settings.muted,changed.settings.music,changed.settings.sfx],[true,.2,.8]);
   for(const label of [tr('audioMuteOn'),tr('audioMusicVolume',{percent:20}),tr('audioSfxVolume',{percent:80})])assert.ok(changed.labels.includes(label),label);
   await screenshot('audio');
   await tap('hud.audioSettings.backHit');
   assert.ok(await page.evaluate(()=>hud.overlay.visible&&!hud.audioSettings.visible));
   await tap("hud.pauseButtons.find(b=>b.id==='resume').hit");
   assert.ok(await page.evaluate(()=>!hud.paused));
   // The simulation's normal match-end handler saves both repairs and feeds the result screen.
   await page.evaluate(()=>{
    battle.warCartRepaired=true;battle.eliteBarracksRepaired=true;
    battle.simulation.finish('victory','objectives-complete',battle.simulation.clock.tick);
   });
   await page.waitForFunction(()=>hud.results.visible);
   const result=await page.evaluate(()=>{
    const frame=hud.campaignResultBounds;
    const k=window.kingdomGame.canvas.getBoundingClientRect().height/540;
    const rows=[hud.resultTitle,hud.campaignResultLevel,hud.resultDetail].map(o=>o.getBounds());
    const primary=hud.nextHit.getBounds(),secondary=hud.restartHit.getBounds();
    return {detail:hud.resultDetail.text,frame,rows,
     fit:frame.y>=0&&frame.y+frame.height<=540&&primary.height*k>=43.9&&primary.bottom<=secondary.top+.1
      &&rows.every((b,i)=>!i||rows[i-1].bottom<=b.top+1),
     earned:JSON.parse(localStorage.getItem('kingdom-clash.achievements.v1')).unlocked};
   });
   const titles=[tr('achievementWarCart'),tr('achievementBarracks')].join(' · ');
   assert.ok(result.detail.includes(tr('achievementNewMultiple',{titles})),result.detail);
   assert.ok(result.fit,JSON.stringify(result));
   assert.equal(Object.keys(result.earned).length,3);
   await screenshot('unlocks');
   await page.reload();
   await active('MainMenu');
   assert.equal(await page.evaluate(()=>document.documentElement.lang),locale);
   await click('MainMenu','achievementsButton');
   await active('Achievements');
   assert.equal(await page.evaluate(()=>window.kingdomGame.scene.getScene('Achievements').counter.text),tr('achievementCount',{count:3,total:3}));
   await click('Achievements','backButton');
   await active('MainMenu');
   assert.deepEqual(errors,[]);
   console.log('PASS '+tag+' achievements, audio, touch geometry, two unlock notices, replay and persisted saves');
  }finally{await page.close();}
 }
}finally{
 await browser?.close();
 await server?.close();
 await source.close();
}
