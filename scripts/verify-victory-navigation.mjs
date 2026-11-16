import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

// Result-popup navigation after a Victory: Next Mission inside a chapter, Next Chapter after a chapter's Mission 6 (C1-C4), Campaign
// Complete after C5M6; each continue button opens the next mission's BRIEFING, never the battle. Replay and Missions stay secondary,
// Defeat keeps Retry. One browser, real scenes; each case seeds a v2 save and ends the match through the Simulation's own finish().
const KEY='kingdom-clash.campaign.v2',SHOTS='docs/screenshots/victory-next';
const server=await createServer({server:{host:'127.0.0.1',port:0}});
let browser,page;const errors=[];
const check=(ok,name,info)=>{assert.ok(ok,name+(info!==undefined?` ${JSON.stringify(info)}`:''));console.log('PASS '+name);};
const chapter=c=>Array.from({length:6},(_,i)=>`campaign-${String((c-1)*10+i+1).padStart(2,'0')}`);
const all=[1,2,3,4,5].flatMap(chapter),before=id=>all.slice(0,all.indexOf(id));
const save=ids=>JSON.stringify({version:1,levels:Object.fromEntries(ids.map(id=>[id,{clears:1}]))});
try{
 await server.listen();const port=server.httpServer.address().port;await mkdir(SHOTS,{recursive:true});
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 for(const [width,height] of [[960,540],[844,390],[780,360]]){
  page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));
  const active=n=>page.waitForFunction(n=>window.kingdomGame?.scene.isActive(n),n);
  const ready=()=>page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing');
  const tapAt=async(scene,hit)=>{const p=await page.evaluate(([scene,hit])=>{const g=window.kingdomGame,b=g.scene.getScene(scene)[hit].getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},[scene,hit]);await page.mouse.click(p.x,p.y);await page.waitForTimeout(250);};
  const tap=hit=>tapAt('HUD',hit);
  const open=async(clears,levelId)=>{
   await page.goto(`http://127.0.0.1:${port}/`);await active('MainMenu');
   await page.evaluate(([k,v])=>localStorage.setItem(k,v),[KEY,save(clears)]);
   await page.evaluate(id=>window.kingdomGame.scene.getScene('MainMenu').scene.start('Battle',{mode:'campaign',levelId:id}),levelId);await ready();
  };
  // Mirrors Battle's own victory path: the Simulation ends, Battle records progress, the HUD builds the result popup.
  const end=async outcome=>{await page.evaluate(o=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.finish(o,o==='victory'?'objectives-complete':'azure-keep-destroyed',s.clock.tick);},outcome);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await page.waitForTimeout(300);};
  const buttons=()=>page.evaluate(()=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),b=h.campaignResultBounds,k=g.canvas.getBoundingClientRect().height/540;
   const vis=['restartHit','nextHit','chapterHit','levelSelectHit','mainMenuHit'].map(k=>[k,h[k].visible,h[k].getData('label'),h[k].getBounds()]).filter(x=>x[1]);
   const lb=vis.map(x=>x[2].getBounds());
   return{visible:Object.fromEntries(vis.map(x=>[x[0],x[2].text])),inside:vis.every(x=>x[3].x>=b.x&&x[3].right<=b.x+b.width&&x[3].bottom<=b.y+b.height+1),
    canvasOk:vis.every(x=>x[3].x>=0&&x[3].right<=960&&x[3].y>=0&&x[3].bottom<=540),labelsFit:vis.every((x,i)=>lb[i].width<=x[3].width-4),
    overlap:vis.some((a,i)=>vis.some((c,j)=>j>i&&a[3].x<c[3].right&&c[3].x<a[3].right&&a[3].y<c[3].bottom&&c[3].y<a[3].bottom)),
    minCss:Math.min(...vis.map(x=>Math.min(x[3].width,x[3].height)*k))};});
  const briefing=()=>page.evaluate(()=>{const g=window.kingdomGame,s=g.scene.getScene('MissionBriefing');return{active:g.scene.isActive('MissionBriefing'),battle:g.scene.isActive('Battle')||g.scene.isActive('HUD'),levelId:s.levelId,returnTo:s.returnTo};});
  const saved=id=>page.evaluate(([k,id])=>JSON.parse(localStorage.getItem(k)).levels[id]?.clears??0,[KEY,id]);
  const tag=`${width}x${height}`;
  const fits=(b,what)=>{check(b.inside&&b.canvasOk&&!b.overlap&&b.labelsFit,`${tag} ${what}: buttons inside the panel and canvas, no overlap, labels fit`,b);check(b.minCss>=44,`${tag} ${what}: touch targets >= 44 CSS px`,b.minCss);};

  // C1M1 -> Next Mission -> C1M2 briefing (not the battle); Start Battle from there plays C1M2.
  await open([],'campaign-01');await end('victory');let b=await buttons();
  check(b.visible.nextHit==='NEXT MISSION'&&b.visible.restartHit==='REPLAY'&&b.visible.levelSelectHit==='MISSIONS'&&!('chapterHit' in b.visible),`${tag} C1M1 victory leads with NEXT MISSION; REPLAY and MISSIONS secondary`,b.visible);
  fits(b,'C1M1 victory');check(await saved('campaign-01')===1,`${tag} the clear is saved before navigating`);
  await tap('nextHit');await active('MissionBriefing');let br=await briefing();
  check(br.levelId==='campaign-02'&&!br.battle,`${tag} Next Mission opens the C1M2 briefing with no match running`,br);
  check(br.returnTo.scene==='CampaignSelect'&&br.returnTo.data.chapterId==='first-war',`${tag} the briefing's Back returns to Chapter 1 missions`,br.returnTo);
  if(width===960){await tapAt('MissionBriefing','startButton');await ready();check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').campaignLevel.id)==='campaign-02','Start Battle from that briefing plays C1M2');
   await end('victory');await tap('restartHit');await ready();check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').campaignLevel.id)==='campaign-02','Replay restarts the same mission');}
  // Mission 5 -> Mission 6.
  await open(before('campaign-05'),'campaign-05');await end('victory');b=await buttons();check(b.visible.nextHit==='NEXT MISSION',`${tag} C1M5 offers NEXT MISSION`,b.visible);
  await tap('nextHit');await active('MissionBriefing');check((await briefing()).levelId==='campaign-06',`${tag} C1M5 -> C1M6 briefing`);
  // Chapter boundaries: Mission 6 of C1-C4 -> Next Chapter -> next chapter's Mission 1 briefing.
  for(const [c,next,chapterId] of [[1,'campaign-11','burning-frontier'],[2,'campaign-21','frozen-crown'],[3,'campaign-31','conquered-lands'],[4,'campaign-41','rise-of-the-heroes']]){
   const last=chapter(c)[5];await open(before(last),last);await end('victory');b=await buttons();
   check(b.visible.nextHit==='NEXT CHAPTER'&&b.visible.restartHit==='REPLAY'&&b.visible.levelSelectHit==='MISSIONS'&&!('chapterHit' in b.visible),`${tag} C${c}M6 victory leads with NEXT CHAPTER`,b.visible);
   if(c===1){fits(b,'C1M6 victory');await page.screenshot({path:`${SHOTS}/next-chapter-${tag}.png`});}
   await tap('nextHit');await active('MissionBriefing');br=await briefing();
   check(br.levelId===next&&!br.battle&&br.returnTo.data?.chapterId===chapterId,`${tag} Next Chapter opens the ${next} briefing (Chapter ${c+1})`,br);
   check(await saved(last)===1,`${tag} C${c}M6 clear saved`);
  }
  // C5M5 -> C5M6.
  await open(before('campaign-45'),'campaign-45');await end('victory');b=await buttons();check(b.visible.nextHit==='NEXT MISSION',`${tag} C5M5 offers NEXT MISSION`,b.visible);
  await tap('nextHit');await active('MissionBriefing');check((await briefing()).levelId==='campaign-46',`${tag} C5M5 -> C5M6 briefing`);
  // C5M6 finale -> Campaign Complete -> Chapter Select; no next mission anywhere.
  await open(before('campaign-46'),'campaign-46');await end('victory');b=await buttons();
  check(b.visible.chapterHit==='CAMPAIGN COMPLETE'&&!('nextHit' in b.visible)&&b.visible.restartHit==='REPLAY'&&b.visible.levelSelectHit==='MISSIONS',`${tag} C5M6 victory leads with CAMPAIGN COMPLETE`,b.visible);
  fits(b,'C5M6 victory');await page.screenshot({path:`${SHOTS}/campaign-complete-${tag}.png`});
  check(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').resultNext)===null,`${tag} the finale has no next target`);
  check(await saved('campaign-46')===1,`${tag} C5M6 clear saved`);
  await tap('chapterHit');await active('ChapterSelect');
  check(await page.evaluate(()=>!window.kingdomGame.scene.isActive('Battle')&&!window.kingdomGame.scene.isActive('HUD')&&!window.kingdomGame.scene.isActive('MissionBriefing')),`${tag} Campaign Complete returns to Chapter Select with no match running`);
  // Replays on a finished campaign keep the same pattern and never lose progress.
  await open(all,'campaign-06');await end('victory');b=await buttons();check(b.visible.nextHit==='NEXT CHAPTER',`${tag} replayed C1M6 still offers NEXT CHAPTER`,b.visible);
  await tap('nextHit');await active('MissionBriefing');check((await briefing()).levelId==='campaign-11',`${tag} replayed C1M6 -> C2M1 briefing`);
  check(await saved('campaign-06')===2&&await saved('campaign-46')===1,`${tag} the replay adds a clear and keeps the rest of the save`);
  if(width===960){await open(all,'campaign-46');await end('victory');b=await buttons();check(b.visible.chapterHit==='CAMPAIGN COMPLETE','a replayed C5M6 is still CAMPAIGN COMPLETE',b.visible);}
  // Missions stays the secondary way back to the cleared mission's chapter.
  await open(before('campaign-13'),'campaign-13');await end('victory');await tap('levelSelectHit');await active('CampaignSelect');
  check(await page.evaluate(()=>window.kingdomGame.scene.getScene('CampaignSelect').chapterId)==='burning-frontier',`${tag} MISSIONS returns to the Chapter 2 mission list`);
  // Defeat keeps Retry as the primary action and restarts the same mission.
  await open(before('campaign-03'),'campaign-03');await end('defeat');b=await buttons();
  check(b.visible.restartHit==='RETRY'&&!('nextHit' in b.visible)&&!('chapterHit' in b.visible),`${tag} defeat keeps RETRY as the only primary action`,b.visible);
  await tap('restartHit');await ready();check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').campaignLevel.id)==='campaign-03',`${tag} Retry restarts the same mission`);
  await page.close();
 }
 check(errors.length===0,'No page errors',errors);
}finally{await browser?.close();await server.close();}
