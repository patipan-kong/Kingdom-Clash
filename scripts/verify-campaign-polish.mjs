import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openCampaignBriefing} from './campaign-browser-helpers.mjs';

// S3.2 browser checks: shared menu backdrop, Victory/Defeat dressing and Pause navigation, on real Phaser scenes backed by a real Simulation.
const root=process.env.CAMPAIGN_EVIDENCE_ROOT||'test-results/campaign-polish';await mkdir(root,{recursive:true});
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:5210/';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:process.env.CAMPAIGN_HEADLESS!=='0',args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true});const checks=[],errors=[],evidence={};
// Missions 2-6 are locked on a fresh save; this suite opens them directly, so it starts from a v2 save with all six Chapter 1 missions completed (set once per tab).
await page.addInitScript(()=>{try{if(!sessionStorage.getItem('seeded'))localStorage.setItem('kingdom-clash.campaign.v2',JSON.stringify({version:1,levels:Object.fromEntries([1,2,3,4,5,6].map(n=>['campaign-'+String(n).padStart(2,'0'),{clears:1}]))}));sessionStorage.setItem('seeded','1');}catch{}window.__writes=0;window.__w0=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(...a){window.__writes++;return set.apply(this,a);};});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+' '+r.status());});
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
const frames=async(n=3)=>{const f=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(([f,n])=>window.kingdomGame.loop.frame>=f+n,[f,n]);};
// Tap the centre of any Phaser object found by an expression evaluated in the page (real touch input through the canvas).
async function tapExpr(expr){const pt=await page.evaluate(expr=>{const g=window.kingdomGame,o=new Function('g','return '+expr)(g),b=o.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},expr);await page.touchscreen.tap(pt.x,pt.y);await frames();}
const scene=n=>`g.scene.getScene('${n}')`;
const tap=(sceneName,prop,key)=>tapExpr(key===undefined?`${scene(sceneName)}.${prop}`:`${scene(sceneName)}.${prop}.get('${key}')`);
const active=name=>page.evaluate(name=>window.kingdomGame.scene.isActive(name),name);
const snap=name=>page.screenshot({path:`${root}/${name}.png`});
const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:20000});
const main=async()=>{await page.goto(base);await wait(()=>window.kingdomGame?.scene?.isActive('MainMenu'));await page.evaluate(()=>{window.matchEnds=[];window.kingdomGame.events.on('simulation-event',e=>{if(e.type==='match-end')window.matchEnds.push(e);});});};
const campaign=async()=>{await tap('MainMenu','campaignButton');await wait(()=>window.kingdomGame.scene.isActive('ChapterSelect'));await tap('ChapterSelect','chapterButtons','first-war');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));};
const briefing=async id=>openCampaignBriefing(page,id,'touch');
const start=async()=>{await tap('MissionBriefing','startButton');await wait(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD')?.missionView);};
const quick=async()=>{await tap('MainMenu','quickPlayButton');await wait(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD')?.pauseButtons?.length);};
// 'store' in the checks below = LocalStorage writes since the last pause: pausing, resuming and quitting must save nothing (a Victory earlier in the run legitimately does).
const pauseBattle=async()=>{await page.evaluate(()=>{window.__w0=window.__writes;});await tapExpr(`${scene('HUD')}.pauseButton.hit`);await wait(()=>window.kingdomGame.scene.getScene('HUD').paused);};
const pauseButton=id=>tapExpr(`${scene('HUD')}.pauseButtons.find(b=>b.id==='${id}').hit`);
const listeners=()=>page.evaluate(()=>{const e=window.kingdomGame.events,count=n=>e.listenerCount(n);return{cast:count('cast'),sim:count('simulation-event')-1,pause:count('pause-visual'),stick:count('stick'),huds:window.kingdomGame.scene.scenes.filter(s=>s.sys.config.key==='HUD'||s.scene.key==='HUD').length};});
const sim=()=>page.evaluate(()=>{const g=window.kingdomGame,s=g.scene.getScene('Battle').simulation,h=g.scene.getScene('HUD');return{matchId:s.state.inventory.matchId,tick:s.clock.tick,ended:s.ended,gold:s.state.inventory.gold??null,state:JSON.stringify(s.state),waves:s.state.spawnedWaves,hp:s.state.bases['blue-base'].hp,progress:h?.missionView?.rows[0]?.progress??null,paused:h?.paused,overlay:h?.overlay?.visible,timeScale:g.scene.getScene('Battle').tweens.timeScale};});
async function advanceTo(tick){await page.evaluate(tick=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;while(s.clock.tick<tick&&!s.ended)s.advance(1000/30+.01);},tick);await frames(8);}
async function destroy(ids){await page.evaluate(ids=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;for(const id of ids){const target=s.state.units[id]??s.state.structures[id]??s.state.bases[id];if(target)s.hit(s.hero,target,1e9,'direct');}if(s.mission)s.mission.evaluate(s.clock.tick,s.drainEvents());for(let i=0;i<7&&!s.ended;i++)s.advance(1000/30+.01);},ids);await frames(8);}
// Text and button measurements of a menu scene, in CSS pixels.
const measure=name=>page.evaluate(name=>{const g=window.kingdomGame,s=g.scene.getScene(name),r=g.canvas.getBoundingClientRect(),k=r.height/540,texts=s.children.list.filter(o=>o.type==='Text'&&o.visible);
 const inside=b=>b.left>=-.5&&b.top>=-.5&&b.right<=960.5&&b.bottom<=540.5;
 const back=s.children.list.filter(o=>o.type==='TileSprite'||o.type==='Image').map(o=>o.name||o.texture.key);
 const hits=s.children.list.filter(o=>o.type==='Rectangle'&&o.input).map(o=>({w:o.getBounds().width*k,h:o.getBounds().height*k}));
 return{backdrop:[...new Set(back)].sort(),textsInside:texts.every(t=>inside(t.getBounds())),minFont:Math.min(...texts.map(t=>parseFloat(t.style.fontSize)*k)),titleFont:Math.max(...texts.map(t=>parseFloat(t.style.fontSize)*k)),minHit:Math.min(...hits.map(h=>Math.min(h.w,h.h))),hitCount:hits.length,canvas:{w:r.width,h:r.height}};},name);
const backdropKeys=['base-blue','base-red','bridge','menu-grass','menu-water','trees'];
async function menus(tag){
 await page.goto(base);await wait(()=>window.kingdomGame?.scene?.isActive('MainMenu'));await frames(6);await snap(`main-menu-${tag}`);const a=await measure('MainMenu');
 await campaign();await frames(6);await snap(`campaign-select-${tag}`);const b=await measure('CampaignSelect');
 await briefing('campaign-03');await frames(6);await snap(`briefing-${tag}`);const c=await measure('MissionBriefing'); // Against the Tide, Chapter 1 Mission 3 (old Level 8)
 evidence['menus-'+tag]={main:a,select:b,briefing:c};
 for(const [n,m] of [['Main Menu',a],['Campaign Select',b],['Mission Briefing',c]]){
  check(JSON.stringify(m.backdrop)===JSON.stringify(backdropKeys),`${tag}: ${n} uses the shared battlefield backdrop (grass, river, bridge, Keeps, trees)`);
  check(m.textsInside&&m.minHit>=44,`${tag}: ${n} text is inside the viewport and every button is at least 44 CSS px`);
 }
 return {a,b,c};
}

try{
 // 1-3. Shared backdrop and readability, desktop and mobile.
 const desk=await menus('desktop');check(desk.a.minFont>=11&&desk.b.minFont>=9.5&&desk.c.minFont>=10,'desktop: menu fonts are readable (>= 9.5 CSS px, titles larger)');
 await page.setViewportSize({width:844,height:390});const mob=await menus('mobile');check(mob.a.minFont>=7&&mob.a.titleFont>=28,'mobile: Main Menu text scales with the canvas and the title stays large');
 await page.setViewportSize({width:960,height:540});

 // Victory and Defeat dressing (Against the Tide, Chapter 1 Mission 3), desktop and mobile.
 await main();await campaign();await briefing('campaign-03');await start();await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));
 await destroy(['red-tower-front-north','red-tower-front-center','red-tower-front-south']);await page.evaluate(()=>window.kingdomGame.scene.resume('Battle'));await wait(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await frames(6);
 const modal=()=>page.evaluate(()=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),k=g.canvas.getBoundingClientRect().height/540,f=h.campaignResultBounds,texts=h.results.list.filter(o=>o.type==='Text'&&o.visible&&o.text),ov=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5,bs=texts.map(t=>t.getBounds());
  const top=f.y,p=n=>n/k,detail=h.resultDetail,prog=h.campaignResultProgress,old=p(94)+detail.height+p(17)+p(24)+prog.height+p(32)+p(55)+p(38);
  return{title:h.resultTitle.text,color:h.resultTitle.style.color,frame:f,old,inView:f.y>=0&&f.y+f.height<=540&&f.x>=0&&f.x+f.width<=960,
   textInside:bs.every(b=>b.left>=f.x&&b.right<=f.x+f.width&&b.top>=f.y&&b.bottom<=f.y+f.height),separate:bs.every((a,i)=>bs.slice(i+1).every(b=>!ov(a,b))),
   captions:h.resultCaptions.map(c=>c.text),buttons:[h.nextHit,h.chapterHit,h.restartHit,h.levelSelectHit,h.mainMenuHit].filter(o=>o.visible).map(o=>({label:o.getData('label').text,w:o.getBounds().width*k,h:o.getBounds().height*k})),
   texts:texts.map(t=>t.text),accent:h.resultAccent.commandBuffer.length>0};});
 let m=await modal();await snap('victory-desktop');evidence.victoryDesktop=m;
 check(m.title==='VICTORY'&&m.color==='#ffe4a0'&&m.accent,'Victory modal has the gold title and emblem/corner accents');
 check(m.captions.join('|')==='MATCH STATISTICS|MISSION OBJECTIVES'&&m.texts.some(t=>/Battle time/.test(t))&&m.texts.some(t=>/3\/3 complete/.test(t)),'Victory modal separates match statistics from mission objectives and keeps all information');
 check(m.inView&&m.textInside&&m.separate,'Victory modal fits its panel, the viewport and has no overlapping text (desktop)');
 check(m.frame.height<=m.old+1,`Victory modal is not larger than before (${m.frame.height.toFixed(1)} vs ${m.old.toFixed(1)} game px)`);
 check(m.buttons.map(b=>b.label).join('|')==='NEXT MISSION|REPLAY|MISSIONS|MAIN MENU'&&m.buttons.every(b=>b.h>=47.5&&b.w>=47.5),'A won mission leads with Next Mission; Replay, Missions and Main Menu are secondary; all targets >= 48px');
 await page.setViewportSize({width:844,height:390});await frames(8);m=await modal();await snap('victory-mobile');evidence.victoryMobile=m;
 check(m.inView&&m.textInside&&m.separate&&m.buttons.every(b=>b.h>=44),'Victory modal stays inside the panel and viewport with no overlap on mobile');
 await page.setViewportSize({width:960,height:540});await frames(8);
 await tap('HUD','restartHit');await wait(()=>window.kingdomGame.scene.getScene('HUD').missionView?.rows[0].progress===0&&!window.kingdomGame.scene.getScene('Battle').simulation.ended);
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hit({...s.hero,id:'failure-raider',team:'red',kind:'minion-red'},s.state.bases['blue-base'],1501,'direct');s.advance(1000/30+.01);});
 await wait(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await frames(6);m=await modal();await snap('defeat-desktop');evidence.defeatDesktop=m;
 check(m.title==='DEFEAT'&&m.color==='#ffaea4'&&m.accent&&m.inView&&m.textInside&&m.separate,'Defeat modal has the muted red title, accents and a clean layout');
 check(m.texts.some(t=>/below the required minimum/.test(t)),'Defeat keeps the correct outcome reason');
 await page.setViewportSize({width:844,height:390});await frames(8);await snap('defeat-mobile');m=await modal();check(m.inView&&m.textInside&&m.separate,'Defeat modal fits on mobile');await page.setViewportSize({width:960,height:540});await frames(8);
 // Quick Play result.
 await main();await quick();await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));await destroy(['red-base']);await page.evaluate(()=>window.kingdomGame.scene.resume('Battle'));await wait(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await frames(6);await snap('quickplay-victory');
 check(await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return h.resultTitle.text==='VICTORY'&&h.resultDetail.text.includes('Crimson Keep destroyed')&&h.restartHit.getData('label').text==='RESTART MATCH';}),'Quick Play result keeps its original wording and gains the same accents');

 // 4-7, 10-12. Campaign pause navigation.
 await main();await campaign();await briefing('campaign-01');await start();const baseline=await listeners();
 await wait(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>300);await pauseBattle();await frames(4);await snap('pause-campaign-desktop');
 const labels=await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').pauseButtons.map(b=>b.label.text));check(labels.join('|')==='RESUME BATTLE|MISSIONS|MAIN MENU','Campaign Pause offers Resume, Missions and Main Menu');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').overlay.list.some(o=>o.type==='Text'&&o.text==='Leaving this battle will discard current progress.')),'Pause shows the discard-progress notice');
 const p1=await sim();await page.waitForTimeout(500);const p2=await sim();check(p1.paused&&p1.tick===p2.tick&&p1.state===p2.state,'Pause freezes the Simulation completely (tick and full state identical)');
 await pauseButton('resume');await wait(()=>!window.kingdomGame.scene.getScene('HUD').paused);await page.waitForTimeout(400);const r1=await sim();
 check(r1.matchId===p1.matchId&&r1.tick>p2.tick&&!r1.overlay&&r1.timeScale===1&&!r1.ended,'Resume continues the same Simulation (same match id, tick advances, overlay closed)');
 check(r1.waves>=p1.waves&&r1.hp===p1.hp&&r1.progress>=p1.progress,'Resume preserves wave progress, Keep HP and objective progress');
 await pauseBattle();const before=await sim();await pauseButton('levelSelect');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));await frames(4);
 let after=await page.evaluate(()=>{const g=window.kingdomGame;return{battle:g.scene.isActive('Battle'),hud:g.scene.isActive('HUD'),visual:window.visualReady,ends:window.matchEnds.length,store:window.__writes-window.__w0};});
 check(after.battle===false&&after.hud===false&&after.ends===0&&after.store===0&&(await listeners()).cast===0,'Pause → Level Select stops Battle and HUD, releases their listeners, records no victory and saves nothing');
 await snap('after-pause-level-select');
 await briefing('campaign-01');await start();const fresh=await sim(),l2=await listeners();
 check(fresh.tick<60&&fresh.waves===0&&fresh.progress===0&&fresh.hp===3000&&!fresh.paused&&fresh.state!==before.state,'Returning to the Campaign starts a fresh Level 1 match');
 check(l2.cast===baseline.cast&&l2.sim===baseline.sim&&l2.pause===baseline.pause&&l2.stick===baseline.stick&&l2.huds===1,'Re-entering Battle does not duplicate listeners or HUD instances');
 await wait(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>120);await pauseBattle();await pauseButton('mainMenu');await wait(()=>window.kingdomGame.scene.isActive('MainMenu'));await frames(4);
 after=await page.evaluate(()=>{const g=window.kingdomGame;return{battle:g.scene.isActive('Battle'),hud:g.scene.isActive('HUD'),ends:window.matchEnds.length,store:window.__writes-window.__w0};});
 check(after.battle===false&&after.hud===false&&after.ends===0&&after.store===0&&(await listeners()).cast===0,'Pause → Main Menu cleans up the battle without recording a victory');
 await snap('after-pause-main-menu');

 // 8-9. Quick Play pause navigation.
 await quick();const q0=await listeners();await wait(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>120);await pauseBattle();await frames(4);await snap('pause-quickplay-desktop');
 check((await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').pauseButtons.map(b=>b.label.text))).join('|')==='RESUME BATTLE|RESTART BATTLE|MAIN MENU','Quick Play Pause offers Resume, Restart Battle and Main Menu');
 const q1=await sim();await pauseButton('restart');await wait(([id])=>{const b=window.kingdomGame.scene.getScene('Battle'),h=window.kingdomGame.scene.getScene('HUD');return window.visualReady&&b.simulation.state.inventory.matchId!==id&&h.pauseButtons?.length&&!h.paused;},[q1.matchId]);await frames(4);
 const q2=await sim(),ql=await listeners();
 check(q2.matchId!==q1.matchId&&q2.tick<60&&!q2.paused&&q2.timeScale===1&&q2.hp===3000&&await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');return !b.campaignLevel&&b.simulation.state.encounter.id==='extended'&&b.simulation.missionStatus()===null;}),'Quick Play Restart starts a fresh original Full Battle (no mission, not routed through Campaign)');
 check(ql.cast===q0.cast&&ql.sim===q0.sim&&ql.pause===q0.pause&&ql.huds===1,'Quick Play Restart does not duplicate listeners or HUD instances');
 await wait(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>90);await pauseBattle();await pauseButton('resume');await wait(()=>!window.kingdomGame.scene.getScene('HUD').paused);
 await pauseBattle();await pauseButton('mainMenu');await wait(()=>window.kingdomGame.scene.isActive('MainMenu'));await frames(4);
 after=await page.evaluate(()=>{const g=window.kingdomGame;return{battle:g.scene.isActive('Battle'),hud:g.scene.isActive('HUD'),ends:window.matchEnds.length,store:window.__writes-window.__w0};});
 check(after.battle===false&&after.hud===false&&after.ends===0&&after.store===0&&(await listeners()).cast===0,'Quick Play Pause → Main Menu leaves no battle, no listeners and no false victory');

 // Mobile Pause screenshots.
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(400);await frames(6);await quick();await wait(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>60);await pauseBattle();await frames(6);await snap('pause-quickplay-mobile');
 const pm=await page.evaluate(()=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),k=g.canvas.getBoundingClientRect().height/540,f=h.pauseFrame,texts=h.overlay.list.filter(o=>o.type==='Text');return{inView:f.y>=0&&f.y+f.height<=540,textInside:texts.every(t=>{const b=t.getBounds();return b.left>=f.x&&b.right<=f.x+f.width&&b.top>=f.y&&b.bottom<=f.y+f.height;}),targets:h.pauseButtons.map(b=>[b.hit.getBounds().width*k,b.hit.getBounds().height*k]),notice:parseFloat(h.pauseNotice.style.fontSize)*k};});
 evidence.pauseMobile=pm;check(pm.inView&&pm.textInside&&pm.targets.every(([w,h])=>h>=44&&w>=44),'Pause menu fits and keeps >= 44px targets on mobile');
 await page.setViewportSize({width:960,height:540});
 evidence.listeners=await listeners();
 check(errors.length===0,'No browser page, console or HTTP errors');
}catch(e){errors.push(e.stack||String(e));try{await snap('failure');}catch{}}
const report={checks,passed:checks.filter(c=>c.passed).length,total:checks.length,errors,evidence};await writeFile(`${root}/report.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({passed:report.passed,total:report.total,errors,evidenceRoot:root},null,2));if(errors.length||report.passed!==report.total)process.exit(1);
