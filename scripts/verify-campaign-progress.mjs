import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openCampaignBriefing,revealCampaignSlot,scrollCampaignTo} from './campaign-browser-helpers.mjs';

// S5: persistent campaign progress, sequential unlocking and Start/Continue Campaign in the browser.
// Every scenario runs in its own browser context, so LocalStorage always starts exactly as the scenario seeds it. Real touch and wheel input
// drives the menus; battle outcomes come from the real Simulation advanced in the page (as verify-campaign-levels does).
const root=process.env.PROGRESS_EVIDENCE_ROOT||'test-results/campaign-progress';await mkdir(root,{recursive:true});
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:5210/';
// Phase B1: progress lives under the v2 key with chapter-block ids (Chapter 1 is campaign-01..06, Chapter 2 campaign-11..16); the v1 key is only read once to derive it.
const KEY='kingdom-clash.campaign.v2',V1='kingdom-clash.campaign.v1';
const launchBrowser=()=>chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:process.env.CAMPAIGN_HEADLESS!=='0',args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let browser,ctx,page,contextsInBrowser=0;const checks=[],errors=[],evidence={};
const scenario=process.env.PROGRESS_SCENARIO||'all';
assert.ok(['all','mobile-hud'].includes(scenario),'Unknown campaign-progress scenario');
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
const frames=async(n=3)=>{const f=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(([f,n])=>window.kingdomGame.loop.frame>=f+n,[f,n]);};
const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:20000});
const saveOf=(...n)=>JSON.stringify({version:1,levels:Object.fromEntries(n.map(i=>[`campaign-${String(i).padStart(2,'0')}`,{clears:1}]))});
// init: JS run before the page's own scripts. seed: the LocalStorage value planted once per tab (a reload keeps what the game wrote).
async function open({seed=null,init='',viewport={width:960,height:540},url=base}={}){
 if(ctx){await ctx.close();ctx=undefined;}
 // Each open() is already an isolated fixture. Bound Chromium lifetime too: the long
 // regression can exhaust its network buffers after many Vite page/context loads.
 if(!browser||contextsInBrowser>=6){if(browser)await browser.close();browser=await launchBrowser();contextsInBrowser=0;}
 contextsInBrowser++;
 ctx=await browser.newContext({viewport,hasTouch:true});page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+' '+r.status());});
 page.on('requestfailed',r=>errors.push(`${r.failure()?.errorText} ${r.url()}`));
 await page.addInitScript(({seed,init,KEY})=>{try{if(init)new Function(init)();if(seed!==null&&!sessionStorage.getItem('seeded'))localStorage.setItem(KEY,seed);sessionStorage.setItem('seeded','1');}catch{}},{seed,init,KEY});
 await page.goto(url);await wait(()=>window.kingdomGame?.scene?.isActive('MainMenu')||window.kingdomGame?.scene?.isActive('Battle'));
}
const stored=()=>page.evaluate(KEY=>{try{return localStorage.getItem(KEY);}catch{return 'THROWS';}},KEY);
const canvasPoint=async(b)=>page.evaluate(b=>{const r=window.kingdomGame.canvas.getBoundingClientRect();return{x:r.x+b.x*r.width/960,y:r.y+b.y*r.height/540};},b);
async function tapExpr(expr){const b=await page.evaluate(expr=>{const g=window.kingdomGame,o=new Function('g','return '+expr)(g),b=o.getBounds();return{x:b.centerX,y:b.centerY};},expr);const p=await canvasPoint(b);await page.touchscreen.tap(p.x,p.y);await frames();}
const tap=(scene,property,key)=>tapExpr(`g.scene.getScene('${scene}').${property}${key===undefined?'':`.get('${key}')`}`);
const active=name=>page.evaluate(name=>window.kingdomGame.scene.isActive(name),name);
const snap=name=>page.screenshot({path:`${root}/${name}.png`});
const select=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect'),vis=(o)=>{const b=o.getBounds();return b.top>=s.clip.top&&b.bottom<=s.clip.bottom;};
 return{open:[...s.levelButtons.keys()],locked:[...s.lockedCards.keys()],lockedInput:[...s.lockedCards.values()].map(h=>!!h.input),enabled:[...s.levelButtons.entries()].map(([id,h])=>[id,h.input.enabled,vis(h)]),
  texts:[...s.cards.list,...s.children.list].filter(o=>o.type==='Text').map(o=>o.text),fullBattle:!!s.fullBattleButton.input?.enabled,pending:[...s.pendingCards.keys()],warning:s.warning?.text??null,clip:s.clip,scroll:s.scroll};});
async function toSelect(){await tap('MainMenu','campaignButton');await wait(()=>window.kingdomGame.scene.isActive('ChapterSelect'));await tap('ChapterSelect','chapterButtons','first-war');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));}
async function reveal(id,map='levelButtons'){await revealCampaignSlot(page,id,map);}
async function briefing(id){await openCampaignBriefing(page,id,'touch');}
async function selectToMain(){await tap('CampaignSelect','backButton');await wait(()=>window.kingdomGame.scene.isActive('ChapterSelect'));await tap('ChapterSelect','backButton');await wait(()=>window.kingdomGame.scene.isActive('MainMenu'));}
async function start(){await tap('MissionBriefing','startButton');await wait(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD')?.missionView);await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));}
const menu=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('MainMenu');return{state:s.continueState,texts:s.children.list.filter(o=>o.type==='Text').map(o=>o.text)};});
// Winning Mission 1 (Hold the Ford) means defeating five waves: every raider is struck each tick until the Simulation ends the match.
const winByWaves=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,DT=1000/30+.01;let n=0;while(!s.ended&&n++<40000){s.advance(DT);const mark=s.events.length;for(const m of Object.values(s.state.units).filter(u=>u.team==='red'&&u.hp>0)){m.protectionTick=0;s.hit(s.hero,m,240,'direct');}s.mission.evaluate(s.clock.tick,s.events.slice(mark));}return{ended:s.ended,outcome:s.outcome?.outcome};});
const destroy=ids=>page.evaluate(ids=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;for(const id of ids){const t=s.state.structures[id];if(t){t.protectionTick=0;s.hit(s.hero,t,1e9,'direct');}}s.mission.evaluate(s.clock.tick,s.drainEvents());for(let i=0;i<7&&!s.ended;i++)s.advance(1000/30+.01);},ids);
const keepHit=amount=>page.evaluate(amount=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hit({...s.hero,id:'raider',team:'red',kind:'minion-red'},s.state.bases['blue-base'],amount,'direct');for(let i=0;i<3&&!s.ended;i++)s.advance(1000/30+.01);},amount);
const killRedKeep=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,b=s.state.bases['red-base'];b.protectionTick=0;s.hit(s.hero,b,1e9,'direct');for(let i=0;i<7&&!s.ended;i++)s.advance(1000/30+.01);});
const result=async()=>{await page.evaluate(()=>window.kingdomGame.scene.resume('Battle'));await wait(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await frames(6);return page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return{title:h.resultTitle.text,detail:h.resultDetail.text,level:h.campaignResultLevel.text,key:(()=>{try{return localStorage.getItem('kingdom-clash.campaign.v2');}catch{return 'THROWS';}})()};});};
const toResultSelect=async()=>{await tapExpr(`g.scene.getScene('HUD').levelSelectHit`);await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));await frames(4);};
const clears=raw=>raw&&raw!=='THROWS'?Object.fromEntries(Object.entries(JSON.parse(raw).levels).map(([k,v])=>[k,v.clears])):null;
const count=()=>checks.length;
const wedge=['red-tower-front-center','red-tower-rear-north','red-tower-rear-south'],gate=['red-tower-keep-north','red-tower-keep-south'];
// S6B: ends the running campaign match through the Simulation's own (only) finish path, as a Victory.
const forceWin=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.finish('victory','objectives-complete',s.clock.tick);});
// The objective HUD as drawn: visible row texts, their CSS size and containment, and whether the panel is clear of the touch controls.
const hudRows=async()=>{await frames(6);return page.evaluate(()=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),k=g.canvas.getBoundingClientRect().height/540,f=h.missionBounds;
 const circle=o=>({left:o.x-o.hitRadius,right:o.x+o.hitRadius,top:o.y-o.hitRadius,bottom:o.y+o.hitRadius}),overlap=b=>f.x<b.right&&f.x+f.width>b.left&&f.y<b.bottom&&f.y+f.height>b.top;
 const rows=h.missionRows.filter(r=>r.visible).map(r=>{const b=r.getBounds();return{t:r.text,css:parseFloat(r.style.fontSize)*k,inside:b.left>=f.x-.5&&b.right<=f.x+f.width+.5&&b.top>=f.y-.5&&b.bottom<=f.y+f.height+.5};});
 return{rows,heading:h.missionHeading.text,collapsed:h.missionCollapsed,panel:{x:f.x,y:f.y,w:f.width,h:f.height},onScreen:f.x>=0&&f.y>=0&&f.x+f.width<=960&&f.y+f.height<=540,
  clear:[h.joystickHit.getBounds(),...h.abilities.map(circle),...h.utilities.map(circle)].every(b=>!overlap(b))};});};
// Every expected [label, counter] is a visible row inside the panel, or (collapsed beside a popup) the first is the heading.
const objectiveRows=(hud,want)=>hud.collapsed?hud.heading===want[0][0]:want.every(([label,n])=>hud.rows.some(x=>x.t.includes(label)&&x.t.includes(n)&&x.inside));

try{
 if(scenario==='all'){
 // ---- 1. Fresh player ----
 await open();
 check(await stored()===null,'A fresh browser has no saved progress and loading the menu does not write one');
 let m=await menu();check(m.state==='start'&&m.texts.includes('START CAMPAIGN')&&m.texts.some(t=>t.includes('Chapter 1 · Mission 1 — Hold the Ford')),'Fresh player: Main Menu offers START CAMPAIGN naming Chapter 1 · Mission 1');
 check(m.texts.includes('CAMPAIGN')&&m.texts.includes('FULL BATTLE / QUICK PLAY'),'The existing CAMPAIGN and FULL BATTLE / QUICK PLAY buttons remain');
 await toSelect();let s=await select();
 check(JSON.stringify(s.open)===JSON.stringify(['campaign-01'])&&s.fullBattle&&JSON.stringify(s.locked)===JSON.stringify(['campaign-02','campaign-03','campaign-04','campaign-05','campaign-06']),'Fresh save: Mission 1 and separate Full Battle are open; Missions 2-6 are locked');
 check(s.lockedInput.every(v=>!v),'Locked cards have no input at all');
 check(s.texts.includes('LOCKED · CLEAR 01')&&s.texts.includes('LOCKED · CLEAR 05')&&s.texts.filter(t=>t.startsWith('LOCKED')).length===5,'Locked tiles state their prerequisite and have no selection action');
 check(s.texts.includes('FULL BATTLE · ALWAYS AVAILABLE')&&!s.texts.some(t=>t.includes('COMPLETED')),'Full Battle is labelled FULL BATTLE · ALWAYS AVAILABLE and nothing is marked completed');
 check(s.warning===null,'A normal fresh save shows no storage warning');
 await snap('select-fresh-top');
 // Scrolling must not re-enable a locked card, and a tap on a visible locked card does nothing.
 await scrollCampaignTo(page,'end');s=await select();await snap('select-fresh-end');
 check(s.lockedInput.every(v=>!v)&&s.fullBattle&&s.enabled.every(e=>e[1]===e[2]),'After scrolling, locked tiles remain inert; Full Battle stays available and tile input matches visibility');
 await scrollCampaignTo(page,'start');
 for(const id of ['campaign-02','campaign-04','campaign-06']){await reveal(id,'lockedCards');await tap('CampaignSelect','lockedCards',id);check(await active('CampaignSelect')&&!(await active('MissionBriefing')),`Tapping locked ${id} does nothing`);}
 // Direct scene navigation cannot skip a lock.
 for(const [scene,data,label] of [['MissionBriefing',{levelId:'campaign-02'},'Mission Briefing Mission 2'],['MissionBriefing',{levelId:'campaign-99'},'Mission Briefing unknown level'],['MissionBriefing',undefined,'Mission Briefing without data'],['MissionBriefing',{levelId:'campaign-06'},'Mission Briefing Chapter 1 Mission 6'],['MissionBriefing',{levelId:'campaign-11'},'Mission Briefing Chapter 2 Mission 1'],['MissionBriefing',{levelId:'campaign-21'},'Mission Briefing Chapter 3 Mission 1 (not released)'],
  ['Battle',{mode:'campaign',levelId:'campaign-03'},'Battle Chapter 1 Mission 3'],['Battle',{mode:'campaign',levelId:'campaign-05'},'Battle Chapter 1 Mission 5'],['Battle',{mode:'campaign',levelId:'campaign-08'},'Battle retired id campaign-08'],['Battle',{mode:'campaign',levelId:'campaign-10'},'Battle retired id campaign-10'],['Battle',{mode:'campaign',levelId:'campaign-22'},'Battle Chapter 3 Mission 2 (not released)'],['Battle',{mode:'campaign',levelId:'campaign-99'},'Battle unknown level']]){
  await page.evaluate(([scene,data])=>window.kingdomGame.scene.start(scene,data),[scene,data]);
  await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));await page.waitForTimeout(250);
  const st=await page.evaluate(()=>{const g=window.kingdomGame;return{select:g.scene.isActive('CampaignSelect'),brief:g.scene.isActive('MissionBriefing'),battle:g.scene.isActive('Battle'),hud:g.scene.isActive('HUD')};});
  check(st.select&&!st.brief&&!st.battle&&!st.hud,`Direct start of ${label} redirects to Campaign Select with no battle created`);
 }
 check(await stored()===null&&errors.length===0,'The blocked redirects wrote nothing and raised no errors');
 // Quick Play never records.
 await page.evaluate(()=>window.kingdomGame.scene.start('MainMenu'));await wait(()=>window.kingdomGame.scene.isActive('MainMenu'));
 await tap('MainMenu','quickPlayButton');await wait(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').campaignLevel===null&&window.kingdomGame.scene.getScene('Battle').launch.mode==='quick'),'Quick Play starts with no campaign level');
 await killRedKeep();let r=await result();check(r.title==='VICTORY'&&r.key===null&&!/unlocked|Mission completed|up to date/i.test(r.detail),'A Quick Play Victory records nothing and shows no campaign message');

 // ---- 2. Mission 1 Victory, reload, Continue, replay ----
 await open();await toSelect();await briefing('campaign-01');await start();
 const won=await winByWaves();check(won.ended&&won.outcome==='victory','Mission 1 reaches an authoritative Victory');
 r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Chapter 1 · Mission 2 unlocked'),'The Victory screen says "Chapter 1 · Mission 2 unlocked"');
 check(JSON.stringify(clears(r.key))===JSON.stringify({'campaign-01':1}),'Progress was already saved when the Victory screen appeared: {campaign-01: 1 clear}');
 // A repeated match-end for the same match records nothing more.
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');b.recordMatchEnd();b.recordMatchEnd();b.simulation.events.push({type:'match-end',outcome:'victory',tick:b.simulation.clock.tick});});await page.waitForTimeout(300);
 check(JSON.stringify(clears(await stored()))===JSON.stringify({'campaign-01':1}),'Duplicate match-end delivery records exactly one clear');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').resultDetail.text.includes('Chapter 1 · Mission 2 unlocked')),'Duplicate match-end delivery leaves the unlock message unchanged');
 await snap('victory-level-1');
 await toResultSelect();s=await select();
 check(JSON.stringify(s.open)===JSON.stringify(['campaign-01','campaign-02'])&&s.fullBattle&&s.locked[0]==='campaign-03'&&s.locked.length===4,'After Mission 1: Mission 2 is unlocked and Mission 3 stays locked');
 check(s.texts.includes('✓ COMPLETED · REPLAY')&&s.texts.filter(t=>t.includes('COMPLETED')).length===1,'Mission 1 shows completed/replay, and only Mission 1');
 await snap('select-after-level-1');
 await page.reload();await wait(()=>window.kingdomGame?.scene?.isActive('MainMenu'));
 check(JSON.stringify(clears(await stored()))===JSON.stringify({'campaign-01':1}),'Reload keeps the saved progress');
 m=await menu();check(m.state==='continue'&&m.texts.includes('CONTINUE CAMPAIGN')&&m.texts.some(t=>t.includes('Chapter 1 · Mission 2 — Fortify the Crossing')),'After reload the Main Menu offers CONTINUE CAMPAIGN naming Chapter 1 · Mission 2');
 await snap('menu-continue');
 await tap('MainMenu','continueButton');await wait(()=>window.kingdomGame.scene.isActive('MissionBriefing'));
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId)==='campaign-02'&&!(await active('Battle')),'Continue opens the Mission 2 Briefing and does not start a battle');
 await tap('MissionBriefing','backButton');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));s=await select();
 check(s.locked.includes('campaign-03')&&!s.open.includes('campaign-03'),'After reload Mission 3 is still locked');
 await page.evaluate(()=>window.kingdomGame.scene.start('Battle',{mode:'campaign',levelId:'campaign-03'}));await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));await page.waitForTimeout(250);
 check(!(await active('Battle'))&&!(await active('HUD')),'After reload a direct start of locked Mission 3 still redirects');
 // Replay Mission 1.
 await briefing('campaign-01');await start();await winByWaves();r=await result();
 check(JSON.stringify(clears(r.key))===JSON.stringify({'campaign-01':2}),'Replaying Mission 1 adds a clear and keeps progress');
 check(r.detail.includes('Mission completed')&&!r.detail.includes('unlocked'),'A Mission 1 replay says "Mission completed", not "Mission 2 unlocked"');
 await toResultSelect();s=await select();check(s.open.includes('campaign-02')&&s.locked.length===4,'Replay leaves Mission 2 unlocked and Missions 3-6 locked');

 // ---- 3. Defeat, Retry and Quit never record ----
 await open();await toSelect();await briefing('campaign-01');await start();
 await keepHit(1e9);r=await result();
 check(r.title==='DEFEAT'&&r.key===null&&!/unlocked|Mission completed|up to date/i.test(r.detail),'Defeat records nothing and shows no campaign message');
 await tapExpr(`g.scene.getScene('HUD').restartHit`);await wait(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD')?.missionView&&!window.kingdomGame.scene.getScene('HUD').results.visible);
 check(await stored()===null&&await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.tick)<120,'Retry starts a fresh match and records nothing');
 await open();await toSelect();await briefing('campaign-01');await start();await page.evaluate(()=>window.kingdomGame.scene.resume('Battle'));
 await page.evaluate(()=>window.kingdomGame.events.emit('request-pause'));await frames(4);
 await tapExpr(`g.scene.getScene('HUD').pauseButtons.find(b=>b.id==='levelSelect').hit`);await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));
 check(await stored()===null,'Pause → Level Select (quit) records nothing');
 await briefing('campaign-01');await start();await page.evaluate(()=>window.kingdomGame.scene.resume('Battle'));await page.evaluate(()=>window.kingdomGame.events.emit('request-pause'));await frames(4);
 await tapExpr(`g.scene.getScene('HUD').pauseButtons.find(b=>b.id==='mainMenu').hit`);await wait(()=>window.kingdomGame.scene.isActive('MainMenu'));
 check(await stored()===null&&(await menu()).state==='start','Pause → Main Menu (quit) records nothing and the menu still says START CAMPAIGN');

 // ---- 4. Staged development fixture never records ----
 await open({url:base+'?campaignFixture=staged'});
 await wait(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));
 await destroy(['red-tower-front-north','red-tower-front-center']);r=await result();
 check(r.title==='VICTORY'&&r.key===null&&!/unlocked|Mission completed|up to date/i.test(r.detail),'The staged fixture can win but never records campaign progress or shows a campaign message');

 // ---- 5. Corrupt, newer-version and unavailable storage ----
 await open({seed:'{garbage'});m=await menu();
 check(m.state==='start'&&errors.length===0,'A malformed save recovers to a fresh, playable menu without errors');
 await toSelect();await briefing('campaign-01');await start();await winByWaves();r=await result();
 check(JSON.stringify(clears(r.key))===JSON.stringify({'campaign-01':1}),'The next Victory replaces the malformed save with a valid one');
 const future=JSON.stringify({version:2,levels:{'campaign-01':{clears:7}},stars:{'campaign-01':3}});
 await open({seed:future});await toSelect();s=await select();
 check(s.warning==="Progress can't be saved in this browser."&&s.open.length===1&&s.fullBattle,'A newer-version save is not read as progress and the storage warning shows');
 await briefing('campaign-01');await start();await winByWaves();r=await result();
 check(r.key===future,'A newer-version save is not overwritten by Victory');
 await toResultSelect();s=await select();check(s.open.includes('campaign-02')&&s.warning!==null,'Progress continues in memory for the session (Mission 2 unlocked) with the warning shown');
 await snap('select-newer-version');
 await open({init:`Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}});`});
 check(await stored()==='THROWS'&&(await menu()).state==='start','With localStorage blocked the game still reaches a playable menu');
 await toSelect();s=await select();check(s.warning!==null&&s.open.includes('campaign-01'),'Blocked storage: warning shown, Mission 1 playable');
 await briefing('campaign-01');await start();await winByWaves();r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Chapter 1 · Mission 2 unlocked'),'Blocked storage: Victory still unlocks Mission 2 for the session');
 await toResultSelect();s=await select();check(s.open.includes('campaign-02')&&s.warning!==null,'Blocked storage: session progress persists across scenes');
 await selectToMain();m=await menu();
 check(m.state==='continue'&&m.texts.some(t=>t.includes('Chapter 1 · Mission 2')),'Blocked storage: Continue Campaign targets Mission 2 in the same session');
 await open({init:`Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};`});
 await toSelect();await briefing('campaign-01');await start();await winByWaves();r=await result();check(r.detail.includes('Chapter 1 · Mission 2 unlocked'),'A first clear whose write fails still says "Mission 2 unlocked"');await toResultSelect();s=await select();
 check(r.title==='VICTORY'&&s.open.includes('campaign-02')&&s.warning!==null,'A failing write keeps session progress and shows the warning');
 await briefing('campaign-01');await start();await winByWaves();r=await result();
 check(r.detail.includes('Mission completed')&&!r.detail.includes('unlocked'),'After a failed write the next clear in the session is a replay ("Mission completed")');
 check(errors.length===0,'No page errors from any storage failure');

 // ---- 6. Out-of-order and unknown ids ----
 await open({seed:saveOf(3,5)});await toSelect();s=await select();
 check(JSON.stringify(s.open)===JSON.stringify(['campaign-01'])&&s.fullBattle&&!s.texts.some(t=>t.includes('COMPLETED')),'A save with only Missions 3 and 5 unlocks nothing');
 await open({seed:JSON.stringify({version:1,levels:{'campaign-01':{clears:1},'campaign-12':{clears:1},'campaign-20':{clears:4}}})});await toSelect();s=await select();
 check(JSON.stringify(s.open)===JSON.stringify(['campaign-01','campaign-02'])&&s.fullBattle&&s.texts.filter(t=>t==='✓ COMPLETED · REPLAY').length===1,'An out-of-order Chapter 2 id and a retired campaign-20 entry do not unlock anything extra');

 // ---- 7. Chapter 1 Missions 3 → 6, Chapter 2, up to date and the Chapter 3 gate ----
 // Six-mission Chapter 1 (Phase B2A) is old Levels 1, 2, 4, 7, 9 and 10 with their checklist rows trimmed: Fortify the Crossing, The Southern Battery, The Killing Ground,
 // The Lone Vanguard and The Crimson Keep. Their gameplay is covered headless (tests/chapter1-redesign.cjs, tests/campaign-level-*.cjs).
 await open({seed:saveOf(1,2)});m=await menu();check(m.state==='continue'&&m.texts.some(t=>t.includes('Chapter 1 · Mission 3 — The Southern Battery')),'With Missions 1-2 done, Continue targets Mission 3 (The Southern Battery)');
 await toSelect();await briefing('campaign-03');await start();
 await destroy(['red-tower-front-south','red-tower-rear-south']);r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Chapter 1 · Mission 4 unlocked')&&!r.detail.includes('up to date'),'Completing Mission 3 says "Chapter 1 · Mission 4 unlocked"');
 check(r.level==='Chapter 1 · Mission 3 — The Southern Battery','The Victory screen names "Chapter 1 · Mission 3 — The Southern Battery"');
 check(JSON.stringify(clears(r.key))===JSON.stringify({'campaign-01':1,'campaign-02':1,'campaign-03':1}),'Completing Mission 3 saves Mission 3 and nothing else');
 await toResultSelect();s=await select();check(s.open.includes('campaign-04')&&JSON.stringify(s.locked)===JSON.stringify(['campaign-05','campaign-06']),'After Mission 3: Mission 4 is unlocked; Missions 5 and 6 stay locked');
 await open({seed:saveOf(1,2,3)});m=await menu();check(m.state==='continue'&&m.texts.includes('CONTINUE CAMPAIGN')&&m.texts.some(t=>t.includes('Chapter 1 · Mission 4 — The Killing Ground')),'A Missions 1-3 save offers CONTINUE CAMPAIGN naming Mission 4');
 await tap('MainMenu','continueButton');await wait(()=>window.kingdomGame.scene.isActive('MissionBriefing'));
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId)==='campaign-04','Continue opens the Mission 4 Briefing');
 await start();let hud=await hudRows();
 check(hud.heading==='Defeat 6 Crimson waves'&&hud.rows.some(x=>x.t.includes('0/6')),`Mission 4 HUD lists its single objective with its counter (${JSON.stringify(hud.rows.map(x=>x.t))})`);
 // Mission 4 needs six defended waves, which a played Guardian produces; its mission is proven headless (tests/chapter1-redesign.cjs).
 // Here the Simulation's own finish() ends the match as a Victory so the progression path is exercised.
 await forceWin();r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Chapter 1 · Mission 5 unlocked')&&clears(r.key)['campaign-04']===1,'Clearing Mission 4 says "Chapter 1 · Mission 5 unlocked" and saves it');
 await toResultSelect();s=await select();check(s.open.includes('campaign-05')&&JSON.stringify(s.locked)===JSON.stringify(['campaign-06']),'After Mission 4: Mission 5 is unlocked; Mission 6 stays locked');
 // ---- Mission 5: The Lone Vanguard ----
 await briefing('campaign-05');await start();hud=await hudRows();
 check(hud.heading==='Destroy the 3 wedge towers'&&hud.rows.some(x=>x.t.includes('0/3')),`Mission 5 HUD lists the wedge as its only objective at 0 (${hud.heading} | ${JSON.stringify(hud.rows.map(x=>x.t))})`);
 await destroy(wedge.slice(0,2));hud=await hudRows();
 check(hud.rows.some(x=>x.t.includes('2/3'))&&!(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.ended)),`With two wedge towers down the row reads 2/3 and the match goes on (${JSON.stringify(hud.rows.map(x=>x.t))})`);
 await snap('mission-5-wedge-two-down');
 await destroy(wedge.slice(2));
 const van=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return{ended:s.ended,outcome:s.outcome?.outcome,reason:s.outcome?.reason};});
 check(van.ended&&van.outcome==='victory'&&van.reason==='objectives-complete',`The third wedge tower wins Mission 5 with no other objective (${JSON.stringify(van)})`);
 r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Chapter 1 · Mission 6 unlocked')&&!r.detail.includes('up to date')&&clears(r.key)['campaign-05']===1&&Object.keys(JSON.parse(r.key).levels).length===5,'Completing Mission 5 says "Chapter 1 · Mission 6 unlocked" and saves it');
 await toResultSelect();s=await select();check(s.locked.length===0&&s.open.includes('campaign-06'),'After Mission 5: the finale, Mission 6, is unlocked and nothing is locked');
 // ---- Mission 6 (finale): The Crimson Keep ----
 await briefing('campaign-06');await start();hud=await hudRows();
 const l10=[['Destroy the 2 gate towers','0/2'],['Destroy the Crimson Keep','0/1']];
 check(hud.heading==='Destroy the 2 gate towers'&&objectiveRows(hud,l10),`Mission 6 HUD is headed by the gate towers and lists the locked Keep objective (${hud.heading} | ${JSON.stringify(hud.rows.map(x=>x.t))})`);
 await killRedKeep();let st10=await page.evaluate(()=>{const sim=window.kingdomGame.scene.getScene('Battle').simulation;return{ended:sim.ended,phase:sim.missionStatus().activePhase};});
 check(!st10.ended&&st10.phase==='gates','The Crimson Keep destroyed first does not win and does not skip the gates');
 hud=await hudRows();await snap('mission-6-keep-down');
 await destroy(gate);const sg=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;return{ended:s.ended,outcome:s.outcome?.outcome,reason:s.outcome?.reason};});
 check(sg.ended&&sg.outcome==='victory'&&sg.reason==='objectives-complete',`The second gate tower completes the gates phase and, the Crimson Keep already down, wins with no tower-building row (${JSON.stringify(sg)})`);
 r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Chapter 2 · Mission 1 unlocked')&&!r.detail.includes('up to date')&&clears(r.key)['campaign-06']===1&&JSON.stringify(Object.keys(JSON.parse(r.key).levels))===JSON.stringify(['campaign-01','campaign-02','campaign-03','campaign-04','campaign-05','campaign-06']),'Completing the Chapter 1 finale says "Chapter 2 · Mission 1 unlocked" and saves exactly the six Chapter 1 missions');
 await toResultSelect();await briefing('campaign-06');await start();await destroy(gate);await killRedKeep();r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Mission completed')&&!r.detail.includes('up to date')&&JSON.parse(r.key).levels['campaign-06'].clears===2,'Replaying Mission 6 says "Mission completed" and counts a second clear');
 await toResultSelect();s=await select();check(s.locked.length===0&&s.pending.length===0&&s.fullBattle&&s.texts.filter(t=>t==='✓ COMPLETED · REPLAY').length===6&&s.texts.includes('FINALE · MISSION 06'),'All six Chapter 1 missions show ✓ COMPLETED, Mission 6 is the finale; Full Battle is not marked');
 await selectToMain();m=await menu();
 check(m.state==='continue'&&m.texts.some(t=>t.includes('Chapter 2 · Mission 1 — Canyon Pass'))&&!m.texts.includes('CAMPAIGN UP TO DATE'),'With Chapter 1 done the Main Menu Continue targets Chapter 2 · Mission 1 — Canyon Pass, not up to date');
 await snap('menu-continue-chapter-2');
 await tap('MainMenu','continueButton');await wait(()=>window.kingdomGame.scene.isActive('MissionBriefing'));check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-11'),'Continue opens the Chapter 2 Mission 1 briefing, never Full Battle');
 await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').scene.start('MainMenu'));await wait(()=>window.kingdomGame.scene.isActive('MainMenu'));
 // Both released chapters cleared: up to date. The unreleased Chapter 3 is never a Continue target and cannot be opened.
 await open({seed:saveOf(1,2,3,4,5,6,11,12,13,14,15,16,21,22)});m=await menu();
 check(m.state==='up-to-date'&&m.texts.includes('CAMPAIGN UP TO DATE')&&m.texts.includes('12 missions complete')&&!m.texts.some(t=>t.includes('Chapter 3')),'With Chapters 1 and 2 cleared (and stray Chapter 3 ids saved) the campaign is up to date; Continue never names Chapter 3');
 await tap('MainMenu','continueButton');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));check(!(await active('MissionBriefing')),'Up-to-date Continue opens the mission grid, not a briefing');
 await page.evaluate(()=>window.kingdomGame.scene.start('MissionBriefing',{levelId:'campaign-21'}));await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));
 check(!(await active('MissionBriefing'))&&!(await active('Battle')),'A direct Chapter 3 briefing is refused even with both released chapters cleared');
 await tap('CampaignSelect','backButton');await wait(()=>window.kingdomGame.scene.isActive('ChapterSelect'));
 check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('ChapterSelect'),v=s.views;return v[2].state==='coming-soon'&&v[2].missions.every(m=>m.state==='pending')&&!s.chapterButtons.has('frozen-crown')&&v[1].complete;}),'Chapter Select keeps Chapter 3 coming soon after Chapter 2 is complete');
 // A pre-redesign v1 save (old Levels 1-7) is converted once into v2 and left untouched. Thresholds are unchanged: Mission 4 (The Killing Ground, old Level 7) still needs 8.
 const legacy=JSON.stringify({version:1,levels:Object.fromEntries([1,2,3,4,5,6,7].map(n=>['campaign-0'+n,{clears:1}]))});
 await open({init:`if(!sessionStorage.getItem('v1'))localStorage.setItem('${V1}',${JSON.stringify(legacy)});sessionStorage.setItem('v1','1');`});m=await menu();
 check(m.state==='continue'&&m.texts.some(t=>t.includes('Chapter 1 · Mission 4 — The Killing Ground')),'A v1 save with old Levels 1-7 continues at Chapter 1 · Mission 4 (the Mission 3 threshold, old 5, is the last it reaches)');
 check(JSON.stringify(clears(await stored()))===JSON.stringify({'campaign-01':1,'campaign-02':1,'campaign-03':1})&&await page.evaluate(V1=>localStorage.getItem(V1),V1)===legacy,'The v2 save is derived from v1 (Missions 1-3) and the v1 save is untouched');
 await page.reload();await wait(()=>window.kingdomGame?.scene?.isActive('MainMenu'));check(await page.evaluate(V1=>localStorage.getItem(V1),V1)===legacy,'Reloading never writes v1');
// Full Battle stays playable on its own and records nothing.
 await open();await toSelect();await briefing('full-battle');await start();
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').campaignLevel.id)==='full-battle','Full Battle starts from a fresh save without clearing Chapter 1');
 await killRedKeep();r=await result();check(r.title==='VICTORY'&&r.key===null&&!/unlocked|Mission completed|up to date/i.test(r.detail),'A Full Battle Victory records nothing and shows no campaign message');
 await toResultSelect();
 check(await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect');return s.chapterId==='first-war'&&s.selectedLevelId==='campaign-01'&&s.missions.filter(m=>m.recommended).map(m=>m.id).join()==='campaign-01';}),'Full Battle Victory returns to its source grid and preserves the selected/recommended story mission');
 await tap('CampaignSelect','backButton');await wait(()=>window.kingdomGame.scene.isActive('ChapterSelect'));
 check(await page.evaluate(()=>{const v=window.kingdomGame.scene.getScene('ChapterSelect').views;return v.every(c=>c.completed===0)&&v[1].state==='locked'&&v[1].released===6&&v[2].state==='coming-soon';}),'Full Battle gives no Chapter 1 or Chapter 2 completion credit; Chapter 2 stays locked');
 await tap('ChapterSelect','backButton');await wait(()=>window.kingdomGame.scene.isActive('MainMenu'));await tap('MainMenu','continueButton');await wait(()=>window.kingdomGame.scene.isActive('MissionBriefing'));
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId==='campaign-01')&&await stored()===null,'Full Battle leaves Continue on Mission 1 and navigation writes no save');
 await open({url:base+'?encounter=extended'});await wait(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').campaignLevel===null),'?encounter= still launches Quick Play directly');

 // ---- 8. Layout at desktop and mobile landscape ----
 for(const [w,h] of [[960,540],[844,390],[740,360]]){
  const tag=`${w}x${h}`;await open({seed:saveOf(1,2),viewport:{width:w,height:h}});
  const lay=await page.evaluate(()=>{const g=window.kingdomGame,sc=g.canvas.getBoundingClientRect().height/540,s=g.scene.getScene('MainMenu');
   const hits=s.children.list.filter(o=>o.type==='Rectangle'&&o.input).map(o=>o.getBounds()),texts=s.children.list.filter(o=>o.type==='Text').map(o=>({t:o.text,css:parseFloat(o.style.fontSize)*sc,b:o.getBounds()}));
   return{sc,hits:hits.map(b=>({top:b.top,bottom:b.bottom,h:b.height*sc})),texts:texts.map(x=>({t:x.t,css:x.css,l:x.b.left,r:x.b.right,top:x.b.top,bottom:x.b.bottom}))};});
  const hs=lay.hits.sort((a,b)=>a.top-b.top);
  check(hs.length===3&&hs[0].bottom<=hs[1].top+.5&&hs[1].bottom<=hs[2].top+.5&&hs.every(x=>x.h>=44),`${tag}: Main Menu has three non-overlapping buttons with touch targets ≥ 44 CSS px`);
  check(lay.texts.every(t=>t.css>=11&&t.l>=0&&t.r<=960&&t.bottom<=540),`${tag}: Main Menu text is ≥ 11 CSS px and on screen (smallest ${Math.min(...lay.texts.map(t=>t.css)).toFixed(1)})`);
  const footer=lay.texts.find(t=>t.t.startsWith('Campaign missions'));check(footer.top>=hs[2].bottom-1&&footer.bottom<=470,`${tag}: footer sits below the last button inside the panel`);
  await snap(`menu-${tag}`);
  await toSelect();
  const sel=await page.evaluate(()=>{const g=window.kingdomGame,sc=g.canvas.getBoundingClientRect().height/540,s=g.scene.getScene('CampaignSelect'),mask=s.clip,back=s.backButton.getBounds();
   const cards=s.cards.list.filter(o=>o.type==='Text').map(o=>({t:o.text,css:parseFloat(o.style.fontSize)*sc,b:o.getBounds()})).filter(x=>x.b.top>=mask.top&&x.b.bottom<=mask.bottom);
   return{cards:cards.map(x=>({t:x.t,css:x.css,l:x.b.left,r:x.b.right,top:x.b.top,bottom:x.b.bottom})),back:{l:back.left,r:back.right,top:back.top},warn:s.warning?s.warning.getBounds():null};});
  const tags=sel.cards.filter(c=>c.t.includes('COMPLETED')||c.t.includes('LOCKED')||c.t.includes('PENDING')||c.t.includes('NEXT MISSION')),diffs=sel.cards.filter(c=>/^(INTRODUCTORY|STANDARD|FULL-BATTLE)$/.test(c.t));
  const clash=tags.some(tg=>diffs.some(d=>Math.abs(d.top-tg.top)<14&&tg.r>d.l-6&&tg.l<d.r));
  check(tags.length>=1&&!clash&&tags.every(c=>c.css>=10.9)&&sel.cards.every(c=>c.r<=960),`${tag}: Campaign Select status tags are visible, readable and do not collide with the difficulty label`);
  await scrollCampaignTo(page,'end');await snap(`select-end-${tag}`);
  const end=await select();check(end.fullBattle&&end.enabled.every(e=>e[1]===e[2])&&end.lockedInput.every(v=>!v),`${tag}: scrolled to the end, separate Full Battle is tappable and locked cards remain inert`);
 }
 {
  const [w,h]=[740,360];await open({init:`Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}});`,viewport:{width:w,height:h}});await toSelect();
  const wb=await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect'),a=s.warning.getBounds(),b=s.backButton.getBounds();return{wl:a.left,wr:a.right,wt:a.top,wb:a.bottom,br:b.right,bt:b.top,css:parseFloat(s.warning.style.fontSize)*window.kingdomGame.canvas.getBoundingClientRect().height/540};});
  check(wb.wl>=wb.br&&wb.wr<=960&&wb.css>=10.5,'740x360: the storage warning sits beside the Back button, on screen and readable');await snap('select-warning-740x360');
 }
 for(const [w,h] of [[960,540],[844,390],[740,360]]){
  const tag=`${w}x${h}`;await open({seed:saveOf(),viewport:{width:w,height:h}});await toSelect();await briefing('campaign-01');await start();await winByWaves();r=await result();
  const lay=await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),b=h.campaignResultBounds,hits=[h.restartHit,h.levelSelectHit,h.mainMenuHit].map(x=>x.getBounds()),d=h.resultDetail.getBounds();return{b,hits:hits.map(x=>({l:x.left,r:x.right,t:x.top,bt:x.bottom})),d:{b:d.bottom,l:d.left,r:d.right},css:parseFloat(h.resultDetail.style.fontSize)*window.kingdomGame.canvas.getBoundingClientRect().height/540};});
  check(lay.b.x>=0&&lay.b.x+lay.b.width<=960&&lay.b.y>=0&&lay.b.y+lay.b.height<=540,`${tag}: Victory panel with the unlock line fits the screen`);
  check(lay.hits[0].t>=lay.d.b-1&&lay.hits.every(x=>x.t>=lay.b.y&&x.bt<=lay.b.y+lay.b.height+1)&&lay.d.l>=lay.b.x&&lay.d.r<=lay.b.x+lay.b.width,`${tag}: the unlock line stays inside the panel and above the buttons`);
  await snap(`victory-${tag}`);
 }
 }
 // ---- 9. Chapter 1 Missions 4-6 objective HUD at mobile landscape (old Levels 7 and 8 are retired from the campaign) ----
 const expected={'campaign-04':[['Defeat 6 Crimson waves','0/6']],
  'campaign-05':[['Destroy the 3 wedge towers','0/3']],'campaign-06':[['Destroy the 2 gate towers','0/2'],['Destroy the Crimson Keep','0/1']]};
 for(const [id,want] of Object.entries(expected)){
  await open({seed:saveOf(1,2,3,4,5),viewport:{width:844,height:390}});await toSelect();await briefing(id);await start();const hud=await hudRows();
  const ok=want.length>1?objectiveRows(hud,want):hud.heading===want[0][0]&&hud.rows.some(x=>x.t.includes(want[0][1]));
  check(ok&&hud.onScreen&&hud.clear&&hud.rows.every(x=>x.inside&&x.css>=10.9),`844x390: ${id} objective panel shows its objectives and counters, readable (≥ 10.9 CSS px), on screen and clear of the touch controls (${JSON.stringify(hud.rows.map(x=>[x.t,+x.css.toFixed(1)]))}${hud.collapsed?' collapsed':''})`);
  await snap(`hud-${id}-844x390`);
 }
 check(errors.length===0,'No browser errors in the whole run');
}finally{
 evidence.errors=errors;evidence.checks=checks;await writeFile(`${root}/report.json`,JSON.stringify(evidence,null,1));
 try{if(ctx)await ctx.close();}finally{if(browser)await browser.close();}
}
console.log(`\n${checks.filter(c=>c.passed).length}/${checks.length} checks passed`);
