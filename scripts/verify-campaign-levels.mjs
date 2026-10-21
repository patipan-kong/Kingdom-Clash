import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openCampaignBriefing,scrollCampaignTo} from './campaign-browser-helpers.mjs';

// Campaign Levels 2-4 plus the ten-mission chapter grid, clipping and input at desktop and small landscape sizes.
// Real touch, wheel and drag input drives the menus. Battle outcomes are produced by the real Simulation advanced in the page; raiders and
// towers are struck through Simulation.hit only where waiting for a human-speed fight is impractical, exactly as verify-campaign-ui does.
const root=process.env.LEVELS_EVIDENCE_ROOT||'test-results/campaign-levels';await mkdir(root,{recursive:true});
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:5210/';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:process.env.CAMPAIGN_HEADLESS!=='0',args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true});const checks=[],errors=[],evidence={};
// Levels 2-10 are locked on a fresh save; this suite opens them directly, so it starts from a save with Levels 1-10 completed (set once per tab).
await page.addInitScript(()=>{try{if(!sessionStorage.getItem('seeded'))localStorage.setItem('kingdom-clash.campaign.v1',JSON.stringify({version:1,levels:Object.fromEntries([1,2,3,4,5,6,7,8,9,10].map(n=>['campaign-'+String(n).padStart(2,'0'),{clears:1}]))}));sessionStorage.setItem('seeded','1');}catch{}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+' '+r.status());});
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
const frames=async(n=3)=>{const f=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(([f,n])=>window.kingdomGame.loop.frame>=f+n,[f,n]);};
const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:20000});
const canvasPoint=async(b)=>page.evaluate(b=>{const r=window.kingdomGame.canvas.getBoundingClientRect();return{x:r.x+b.x*r.width/960,y:r.y+b.y*r.height/540,r:{x:r.x,y:r.y,w:r.width,h:r.height}};},b);
async function tapExpr(expr){const b=await page.evaluate(expr=>{const g=window.kingdomGame,o=new Function('g','return '+expr)(g),b=o.getBounds();return{x:b.centerX,y:b.centerY};},expr);const p=await canvasPoint(b);await page.touchscreen.tap(p.x,p.y);await frames();}
async function tap(scene,property,key){const b=await page.evaluate(({scene,property,key})=>{const s=window.kingdomGame.scene.getScene(scene),o=key===undefined?s[property]:s[property].get(key),b=o.getBounds();return{x:b.centerX,y:b.centerY};},{scene,property,key});const p=await canvasPoint(b);await page.touchscreen.tap(p.x,p.y);await frames();}
const active=name=>page.evaluate(name=>window.kingdomGame.scene.isActive(name),name);
const snap=name=>page.screenshot({path:`${root}/${name}.png`});
const select=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect');return{scroll:s.scroll,min:s.minScroll,clip:s.clip,masked:!!s.cards.mask,back:s.backButton.getBounds().top,selected:s.selectedLevelId,fullBattle:!!s.fullBattleButton.input?.enabled,
 hits:[...s.levelButtons.entries()].map(([id,h])=>{const b=h.getBounds();return{id,top:b.top,bottom:b.bottom,cx:b.centerX,cy:b.centerY,enabled:h.input.enabled,fully:b.top>=s.clip.top&&b.bottom<=s.clip.bottom};})};});
async function main(){await page.goto(base);await wait(()=>window.kingdomGame?.scene?.isActive('MainMenu'));}
async function toSelect(){await tap('MainMenu','campaignButton');await wait(()=>window.kingdomGame.scene.isActive('ChapterSelect'));await tap('ChapterSelect','chapterButtons','first-war');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));}
async function briefing(id){await openCampaignBriefing(page,id,'touch');}
async function start(){await tap('MissionBriefing','startButton');await wait(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD')?.missionView);await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));}
const texts=scene=>page.evaluate(scene=>window.kingdomGame.scene.getScene(scene).children.list.filter(o=>o.type==='Text').map(o=>o.text).join('\n'),scene);
const hud=()=>page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;return{rows:h.missionView.rows.map(r=>[r.id,r.label,r.progress,r.target,r.state]),rowText:h.missionRows.filter(r=>r.visible).map(r=>r.text),keep:h.missionKeep.text,min:h.missionView.azure.minimum,
 res:[s.state.gold,s.state.wood,s.state.iron],level:s.state.heroProgression.level,defenders:Object.values(s.state.structures).filter(x=>x.team==='red').map(x=>x.id).sort(),number:b.campaignLevel.number,matchId:s.state.inventory.matchId,shop:s.setup.shop,tick:s.clock.tick};});
// Advances the live Simulation in the page. kill: 'tower' | 'guardian' | null strikes every living raider each tick with the given source; stop(s) ends the loop.
const run=(args)=>page.evaluate(({kill,until,max})=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,DT=1000/30+.01,towers=()=>Object.values(s.state.structures).filter(b=>b.team==='blue'&&b.kind==='tower');
 const stop=new Function('s',`return (${until})`);let n=0;
 while(!s.ended&&n++<max&&!stop(s)){s.advance(DT);if(kill){const mark=s.events.length,src=kill==='tower'?towers()[0]:s.hero;for(const m of Object.values(s.state.units).filter(u=>u.team==='red'&&u.hp>0)){m.protectionTick=0;s.hit(src,m,240,'direct');}s.mission.evaluate(s.clock.tick,s.events.slice(mark));}}
 return {tick:s.clock.tick,ended:s.ended};},args);
const place=(cells,tag='a')=>page.evaluate(({cells,tag})=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;cells.forEach(([c,r],i)=>s.send({type:'place',requestId:'ui'+tag+i,kind:'tower',col:c,row:r}));},{cells,tag});
const destroy=ids=>page.evaluate(ids=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;for(const id of ids){const t=s.state.structures[id];if(t){t.protectionTick=0;s.hit(s.hero,t,1e9,'direct');}}s.mission.evaluate(s.clock.tick,s.drainEvents());for(let i=0;i<7&&!s.ended;i++)s.advance(1000/30+.01);},ids);
const keepHit=amount=>page.evaluate(amount=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hit({...s.hero,id:'raider',team:'red',kind:'minion-red'},s.state.bases['blue-base'],amount,'direct');for(let i=0;i<3&&!s.ended;i++)s.advance(1000/30+.01);},amount);
const result=async()=>{await page.evaluate(()=>window.kingdomGame.scene.resume('Battle'));await wait(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await frames(6);return page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return{title:h.resultTitle.text,detail:h.resultDetail.text,level:h.campaignResultLevel.text,progress:h.campaignResultProgress.text,stats:h.campaignResultStats.text};});};

// Starting resources plus the income of the ticks already played: Wood +1/15 and Iron +1/120 per tick, Gold none.
const fresh=h=>h.res[0]===250&&Math.abs(h.res[1]-(180+h.tick/15))<.6&&Math.abs(h.res[2]-(30+h.tick/120))<.6;
const L=[
 {n:2,id:'campaign-02',title:'Fortify the Crossing',labels:['Complete 3 Archer Towers','Archer Towers deal 1200 damage','Defeat 6 Crimson waves'],defeat:'Azure Keep destroyed.',defenders:[],shop:false},
 {n:3,id:'campaign-03',title:'Strike the Outpost',labels:['Reach Guardian level 3','Destroy the Southern Outpost'],defeat:'Azure Keep destroyed.',defenders:['red-tower-rear-south'],shop:true},
 {n:4,id:'campaign-04',title:'The Broken Line',labels:['Keep 2 Archer Towers standing','Defeat 2 Crimson waves','Destroy the South Battery'],defeat:'Azure Keep HP falls below 50% (exactly 50% is safe).',defenders:['red-tower-front-south','red-tower-rear-south'],shop:true},
];
try{
 // ---- Ten-mission chapter grid: clipping and input only scroll where the viewport requires it ----
 const storyIds=Array.from({length:10},(_,i)=>'campaign-'+String(i+1).padStart(2,'0'));
 for(const [tag,vp] of [['desktop',{width:960,height:540}],['mobile',{width:844,height:390}],['mobile-small',{width:740,height:360}]]){
  await page.setViewportSize(vp);await main();await toSelect();await frames(6);
  let s=await select();
  check(JSON.stringify(s.hits.map(h=>h.id))===JSON.stringify(storyIds)&&s.fullBattle,tag+': ten replayable story slots and a separate Full Battle action');
  check(s.masked&&s.clip.bottom<=s.back+.5,tag+': mission grid is masked above navigation');
  check(s.hits.every(h=>h.enabled===h.fully),tag+': tile input matches full visibility');
  await snap('select-top-'+tag);
  if(s.min<0){
   // Use an actually clipped tile and touch its visible portion: it must neither select nor launch.
   const clipped=s.hits.find(h=>h.top<s.clip.bottom&&h.bottom>s.clip.bottom);
   check(!!clipped&&!clipped.enabled,tag+': a partially visible mission has disabled input');
   const p=await canvasPoint({x:clipped.cx,y:(Math.max(clipped.top,s.clip.top)+s.clip.bottom)/2}),before=s.selected;
   await page.touchscreen.tap(p.x,p.y);await frames(3);s=await select();
   check(s.selected===before&&await active('CampaignSelect')&&!(await active('MissionBriefing')),tag+': touching the clipped tile changes nothing');
   await scrollCampaignTo(page,'end');s=await select();
   check(s.scroll===s.min&&s.hits.find(h=>h.id==='campaign-10').enabled&&!s.hits[0].enabled&&s.fullBattle,tag+': measured wheel input reaches the finale, disables clipped tiles and leaves Full Battle reachable');
   await snap('select-end-'+tag);await scrollCampaignTo(page,'start');
   // A swipe starts on a different mission from the current selection; release must not select it.
   const start=await canvasPoint(await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('CampaignSelect').levelButtons.get('campaign-01').getBounds();return{x:b.centerX,y:b.centerY};})),selectedBefore=(await select()).selected;
   const cdp=await page.context().newCDPSession(page),touch=(type,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:start.x,y}]});
   try{await touch('touchStart',start.y);for(let i=1;i<=8;i++)await touch('touchMove',start.y-i*start.r.h/540*14);await touch('touchEnd');}finally{await cdp.detach();}
   await frames(4);s=await select();
   check(s.scroll<0&&s.selected===selectedBefore&&await active('CampaignSelect')&&!(await active('MissionBriefing')),tag+': drag scrolls without selecting or launching on release');
  }else{
   check(s.hits.every(h=>h.enabled&&h.fully),tag+': all ten missions fit without scrolling');
   await scrollCampaignTo(page,'end');check((await select()).scroll===0,tag+': desktop requires no artificial list scrolling');
  }
  await tap('CampaignSelect','backButton');await wait(()=>window.kingdomGame.scene.isActive('ChapterSelect'));
  await tap('ChapterSelect','backButton');await wait(()=>window.kingdomGame.scene.isActive('MainMenu'));
  check(true,tag+': grid Back returns through Chapters to Main Menu');
  await toSelect();
  for(const id of [...storyIds,'full-battle']){
   await briefing(id);const got=await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId);
   check(got===id,tag+': deliberate touch Briefing opens '+id);
   await tap('MissionBriefing','backButton');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));
  }
 }
 await page.setViewportSize({width:960,height:540});

 // ---- Briefing, live objectives, victory, defeat and retry for Levels 2-4 ----
 for(const lv of L){
  await main();await toSelect();await briefing(lv.id);
  const t=await texts('MissionBriefing');
  check(t.includes(lv.title)&&lv.labels.every(l=>t.includes(l))&&t.includes(lv.defeat)&&t.includes('TIP'),`Level ${lv.n} briefing shows its title, every objective, the defeat condition and a tip`);await snap(`level-${lv.n}-briefing`);
  await start();let h=await hud();
  check(h.number===lv.n&&fresh(h)&&h.level===1&&JSON.stringify(h.defenders)===JSON.stringify(lv.defenders)&&h.shop===lv.shop,`Level ${lv.n} starts with 250/180/30, a level 1 Guardian, ${lv.defenders.length} Crimson tower(s) and the Shop ${lv.shop?'open':'closed'}`);
  check(lv.labels.every((l,i)=>h.rows[i][1]===l)&&h.rowText.length>=lv.labels.length,`Level ${lv.n} HUD lists the objectives in order`);
  await snap(`level-${lv.n}-start`);
  if(lv.n===2){
   check(h.rows.every(r=>r[2]===0&&r[4]==='active'),'Level 2: all three objectives are active at 0');
   await place([[12,10],[12,14]]);await run({kill:null,until:'s.clock.tick>=320',max:400});await frames(6);h=await hud();check(h.rows[0][2]===2&&h.rows[0][4]==='active'&&h.res[1]<30+h.tick/15,'Level 2: the starting Wood pays for two towers at once; the third has to wait');
   await run({kill:null,until:'s.clock.tick>=910',max:700});await place([[9,9]],'b');await run({kill:null,until:'s.clock.tick>=1100',max:300});await frames(6);h=await hud();check(h.rows[0][2]===3&&h.rows[0][4]==='complete','Level 2: income pays for the third tower about 30 s in, completing the construction objective');
   await run({kill:'tower',until:'s.mission.wavesDefeated>=2',max:4000});await frames(6);h=await hud();check(h.rows[1][2]>0&&h.rows[2][2]>=2,'Level 2: tower damage and defeated waves rise as towers kill raiders');await snap('level-2-live-progress');
   await run({kill:'tower',until:'false',max:6000});
  }
  if(lv.n===3){
   check(h.rows[0][4]==='active'&&h.rows[1][4]==='locked'&&h.min===null,'Level 3: the strike objective is locked behind reaching level 3');
   await run({kill:null,until:'s.clock.tick>=330',max:400});await run({kill:'guardian',until:'s.state.heroProgression.level>=3',max:3000});await frames(6);h=await hud();
   check(h.level>=3&&h.rows[0][4]==='complete'&&h.rows[1][4]==='active','Level 3: reaching level 3 completes muster and unlocks the strike');await snap('level-3-strike-unlocked');
   await destroy(['red-tower-rear-south']);
  }
  if(lv.n===4){
   check(h.rows[0][4]==='active'&&h.rows[1][4]==='active'&&h.rows[2][4]==='locked'&&h.min===1500&&h.keep.includes('Min 50% (≥ safe)'),'Level 4: rebuild objectives are active, the battery is locked and the 50% minimum is shown');
   await place([[12,10],[12,14]]);await run({kill:null,until:'s.clock.tick>=320',max:400});await run({kill:'guardian',until:'s.mission.wavesDefeated>=2',max:4000});await frames(6);h=await hud();
   check(h.rows[0][4]==='complete'&&h.rows[1][4]==='complete'&&h.rows[2][4]==='active','Level 4: finishing the rebuild unlocks the break phase');await snap('level-4-break-unlocked');
   await destroy(['red-tower-front-south']);await frames(4);h=await hud();check(h.rows[2][2]===1&&h.rows[2][3]===2,'Level 4: one battery tower down reads 1/2');await destroy(['red-tower-rear-south']);
  }
  let r=await result();
  check(r.title==='VICTORY'&&r.level.includes(`Level ${lv.n} — ${lv.title}`)&&r.detail.includes('All mission objectives completed')&&/complete/.test(r.progress),`Level ${lv.n} victory names the level, the reason and the final progress`);await snap(`level-${lv.n}-victory`);
  evidence[`level${lv.n}Victory`]=r;
  // Retry from the result screen resets the match.
  const before=(await hud()).matchId;await tap('HUD','restartHit');await wait(id=>window.kingdomGame.scene.getScene('Battle').simulation.state.inventory.matchId!==id&&window.kingdomGame.scene.getScene('HUD').missionView,before);await frames(6);
  await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));h=await hud();
  check(fresh(h)&&h.level===1&&h.rows.every(x=>x[2]===(x[0]==='level'?1:0))&&JSON.stringify(h.defenders)===JSON.stringify(lv.defenders)&&h.tick<60,`Level ${lv.n} Retry starts a fresh match with the starting resources, no progress and the original defenders`);
  // Defeat.
  await keepHit(lv.n===4?1501:3000);r=await result();
  check(r.title==='DEFEAT'&&r.level.includes(`Level ${lv.n}`)&&r.detail.includes(lv.n===4?'fell below the required minimum HP':'Azure Keep was destroyed'),`Level ${lv.n} defeat shows the right reason`);await snap(`level-${lv.n}-defeat`);evidence[`level${lv.n}Defeat`]=r;
  await tap('HUD','levelSelectHit');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));
  check(await page.evaluate(()=>!window.kingdomGame.scene.isActive('HUD')&&!window.kingdomGame.scene.isActive('Battle')),`Level ${lv.n} result Level Select leaves no stale scenes`);
 }
 // Pause navigation from a new level.
 await main();await toSelect();await briefing('campaign-03');await tap('MissionBriefing','startButton');await wait(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD')?.pauseButtons?.length);
 await tapExpr("g.scene.getScene('HUD').pauseButton.hit");await wait(()=>window.kingdomGame.scene.getScene('HUD').paused);
 await tapExpr("g.scene.getScene('HUD').pauseButtons.find(b=>b.id==='levelSelect').hit");await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));
 check(await page.evaluate(()=>!window.kingdomGame.scene.isActive('Battle')),'Pause → Level Select from Level 3 returns to its chapter grid with the battle discarded');
 // Mobile briefings of the new levels stay inside the canvas.
 await page.setViewportSize({width:844,height:390});
 for(const lv of L){await main();await toSelect();await briefing(lv.id);await frames(4);await snap(`level-${lv.n}-briefing-mobile`);
  const ok=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('MissionBriefing');return s.children.list.filter(o=>o.type==='Text').every(o=>{const b=o.getBounds();return b.left>=0&&b.top>=0&&b.right<=960&&b.bottom<=540;})&&s.startButton.getBounds().bottom<=540;});
  check(ok,`Level ${lv.n} mobile briefing fits inside the canvas`);}
 check(errors.length===0,'No browser page, console or HTTP errors');
}catch(e){errors.push(e.stack||String(e));try{await snap('failure');}catch{}}
const report={checks,passed:checks.filter(c=>c.passed).length,total:checks.length,errors,evidence};await writeFile(`${root}/report.json`,JSON.stringify(report,null,2));await browser.close();
console.log(JSON.stringify({passed:report.passed,total:report.total,errors:errors.length,evidenceRoot:root},null,2));if(errors.length||!checks.length)process.exit(1);
