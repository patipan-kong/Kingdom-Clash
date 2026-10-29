import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import assert from 'node:assert/strict';

// Result-popup navigation: Next Mission after a Victory, Back to Chapter Select after a chapter's last mission, Retry after a Defeat.
// One browser, one page, sequential real-scene checks; each case seeds a v2 save and ends the match through the Simulation's own finish().
const KEY='kingdom-clash.campaign.v2';
const server=await createServer({server:{host:'127.0.0.1',port:0}});
let browser,page;const errors=[];
const check=(ok,name)=>{assert.ok(ok,name);console.log('PASS '+name);};
const save=n=>JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:n},(_,i)=>[`campaign-0${i+1}`,{clears:1}]))});
try{
 await server.listen();const port=server.httpServer.address().port;
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 for(const [width,height] of [[960,540],[740,360]]){
  page=await browser.newPage({viewport:{width,height}});page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(60000);
  page.on('pageerror',e=>errors.push(e.message));
  const active=n=>page.waitForFunction(n=>window.kingdomGame?.scene.isActive(n),n);
  const ready=()=>page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing');
  const tap=async hit=>{const p=await page.evaluate(hit=>{const g=window.kingdomGame,b=g.scene.getScene('HUD')[hit].getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},hit);await page.mouse.click(p.x,p.y);await page.waitForTimeout(250);};
  const open=async(clears,levelId)=>{
   await page.goto(`http://127.0.0.1:${port}/`);await active('MainMenu');
   await page.evaluate(([k,v])=>localStorage.setItem(k,v),[KEY,save(clears)]);
   await page.evaluate(id=>window.kingdomGame.scene.getScene('MainMenu').scene.start('Battle',{mode:'campaign',levelId:id}),levelId);await ready();
  };
  // Mirrors Battle's own victory path: the Simulation ends, Battle records progress, the HUD builds the result popup.
  const end=async outcome=>{await page.evaluate(o=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.finish(o,o==='victory'?'objectives-complete':'azure-keep-destroyed',s.clock.tick);},outcome);await page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await page.waitForTimeout(300);};
  const buttons=()=>page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),b=h.campaignResultBounds;
   const vis=[['restartHit'],['nextHit'],['chapterHit'],['levelSelectHit'],['mainMenuHit']].map(([k])=>[k,h[k].visible,h[k].getData('label').text,h[k].getBounds()]).filter(x=>x[1]);
   return{visible:Object.fromEntries(vis.map(x=>[x[0],x[2]])),inside:vis.every(x=>x[3].x>=b.x&&x[3].right<=b.x+b.width&&x[3].bottom<=b.y+b.height+1),canvasOk:vis.every(x=>x[3].x>=0&&x[3].right<=960&&x[3].bottom<=540),overlap:vis.some((a,i)=>vis.some((c,j)=>j>i&&a[3].centerY===c[3].centerY&&(a[3].x<c[3].right&&c[3].x<a[3].right)))};});
  const level=()=>page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').campaignLevel?.id);
  const tag=`${width}x${height}`;
  // Mission 1 → Next Mission opens Mission 2 directly, with the clear saved first.
  await open(0,'campaign-01');await end('victory');let b=await buttons();
  check(b.visible.nextHit==='NEXT MISSION'&&b.visible.restartHit==='REPLAY'&&!('chapterHit' in b.visible),`${tag} Mission 1 victory leads with NEXT MISSION and keeps REPLAY (${JSON.stringify(b.visible)})`);
  check(b.inside&&b.canvasOk,`${tag} victory buttons stay inside the panel and the canvas`);
  check(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).levels['campaign-01']?.clears===1,KEY),`${tag} the clear is saved before navigating`);
  await tap('nextHit');await ready();
  check(await level()==='campaign-02','Next Mission starts campaign-02 directly');
  // Replay on victory restarts the same mission.
  await end('victory');await tap('restartHit');await ready();check(await level()==='campaign-02',`${tag} Replay restarts the same mission`);
  // Mission 5 → Mission 6.
  await open(4,'campaign-05');await end('victory');b=await buttons();
  check(b.visible.nextHit==='NEXT MISSION',`${tag} Mission 5 victory offers NEXT MISSION`);await tap('nextHit');await ready();check(await level()==='campaign-06',`${tag} Next Mission starts campaign-06`);
  // Mission 6 → Back to Chapter Select, never Chapter 2.
  await open(5,'campaign-06');await end('victory');b=await buttons();
  check(b.visible.chapterHit==='BACK TO CHAPTER SELECT'&&!('nextHit' in b.visible)&&b.visible.restartHit==='REPLAY',`${tag} Mission 6 victory leads with BACK TO CHAPTER SELECT (${JSON.stringify(b.visible)})`);
  check(b.inside&&b.canvasOk&&!b.overlap,`${tag} final-mission buttons fit`);
  await tap('chapterHit');await active('ChapterSelect');
  check(await page.evaluate(()=>!window.kingdomGame.scene.isActive('Battle')&&!window.kingdomGame.scene.isActive('HUD')),`${tag} Chapter Select opens with no match running (not Chapter 2)`);
  // Defeat keeps Retry as primary and restarts the same mission.
  await open(2,'campaign-03');await end('defeat');b=await buttons();
  check(b.visible.restartHit==='RETRY'&&!('nextHit' in b.visible)&&!('chapterHit' in b.visible),`${tag} defeat keeps RETRY as the only primary action (${JSON.stringify(b.visible)})`);
  await tap('restartHit');await ready();check(await level()==='campaign-03',`${tag} Retry restarts the same mission`);
  // Replaying an old mission never reaches a locked one: Mission 1 with only Mission 1 cleared offers Mission 2 (unlocked); a fresh Mission 1 win unlocks it first.
  await open(1,'campaign-02');await end('victory');b=await buttons();
  check(b.visible.nextHit==='NEXT MISSION',`${tag} Mission 2 victory offers Mission 3 once its clear is recorded`);
  await page.close();
 }
 check(errors.length===0,'No page errors');
}finally{await browser?.close();await server.close();}
