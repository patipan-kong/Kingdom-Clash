import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// S5: persistent campaign progress, sequential unlocking and Start/Continue Campaign in the browser.
// Every scenario runs in its own browser context, so LocalStorage always starts exactly as the scenario seeds it. Real touch and wheel input
// drives the menus; battle outcomes come from the real Simulation advanced in the page (as verify-campaign-levels does).
const root=process.env.PROGRESS_EVIDENCE_ROOT||'test-results/campaign-progress';await mkdir(root,{recursive:true});
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:5210/';
const KEY='kingdom-clash.campaign.v1';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:process.env.CAMPAIGN_HEADLESS!=='0',args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let ctx,page;const checks=[],errors=[],evidence={};
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
const frames=async(n=3)=>{const f=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(([f,n])=>window.kingdomGame.loop.frame>=f+n,[f,n]);};
const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:20000});
const saveOf=(...n)=>JSON.stringify({version:1,levels:Object.fromEntries(n.map(i=>[`campaign-${String(i).padStart(2,'0')}`,{clears:1}]))});
// init: JS run before the page's own scripts. seed: the LocalStorage value planted once per tab (a reload keeps what the game wrote).
async function open({seed=null,init='',viewport={width:960,height:540},url=base}={}){
 if(ctx)await ctx.close();
 ctx=await browser.newContext({viewport,hasTouch:true});page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(r.url()+' '+r.status());});
 await page.addInitScript(({seed,init,KEY})=>{try{if(init)new Function(init)();if(seed!==null&&!sessionStorage.getItem('seeded'))localStorage.setItem(KEY,seed);sessionStorage.setItem('seeded','1');}catch{}},{seed,init,KEY});
 await page.goto(url);await wait(()=>window.kingdomGame?.scene?.isActive('MainMenu')||window.kingdomGame?.scene?.isActive('Battle'));
}
const stored=()=>page.evaluate(KEY=>{try{return localStorage.getItem(KEY);}catch{return 'THROWS';}},KEY);
const canvasPoint=async(b)=>page.evaluate(b=>{const r=window.kingdomGame.canvas.getBoundingClientRect();return{x:r.x+b.x*r.width/960,y:r.y+b.y*r.height/540};},b);
async function tapExpr(expr){const b=await page.evaluate(expr=>{const g=window.kingdomGame,o=new Function('g','return '+expr)(g),b=o.getBounds();return{x:b.centerX,y:b.centerY};},expr);const p=await canvasPoint(b);await page.touchscreen.tap(p.x,p.y);await frames();}
const tap=(scene,property,key)=>tapExpr(`g.scene.getScene('${scene}').${property}${key===undefined?'':`.get('${key}')`}`);
const active=name=>page.evaluate(name=>window.kingdomGame.scene.isActive(name),name);
const snap=name=>page.screenshot({path:`${root}/${name}.png`});
async function wheel(dy){const p=await canvasPoint({x:480,y:270});await page.mouse.move(p.x,p.y);await page.mouse.wheel(0,dy);await frames(4);}
const select=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('CampaignSelect'),vis=(o)=>{const b=o.getBounds();return b.top>=s.clip.top&&b.bottom<=s.clip.bottom;};
 return{open:[...s.levelButtons.keys()],locked:[...s.lockedCards.keys()],lockedInput:[...s.lockedCards.values()].map(h=>!!h.input),enabled:[...s.levelButtons.entries()].map(([id,h])=>[id,h.input.enabled,vis(h)]),
  texts:s.cards.list.filter(o=>o.type==='Text').map(o=>o.text),warning:s.warning?.text??null,clip:s.clip,scroll:s.scroll};});
async function toSelect(){await tap('MainMenu','campaignButton');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));}
async function reveal(id,map='levelButtons'){for(let i=0;i<14;i++){const f=await page.evaluate(({id,map})=>{const s=window.kingdomGame.scene.getScene('CampaignSelect'),b=s[map].get(id).getBounds();return{ok:b.top>=s.clip.top&&b.bottom<=s.clip.bottom,down:b.bottom>s.clip.bottom};},{id,map});if(f.ok)return;await wheel(f.down?160:-160);}throw new Error('cannot reveal '+id);}
async function briefing(id){await reveal(id);await tap('CampaignSelect','levelButtons',id);await wait(()=>window.kingdomGame.scene.isActive('MissionBriefing'));}
async function start(){await tap('MissionBriefing','startButton');await wait(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD')?.missionView);await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));}
const menu=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('MainMenu');return{state:s.continueState,texts:s.children.list.filter(o=>o.type==='Text').map(o=>o.text)};});
// Winning Level 1 means defeating five waves: every raider is struck each tick until the Simulation ends the match.
const winByWaves=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,DT=1000/30+.01;let n=0;while(!s.ended&&n++<40000){s.advance(DT);const mark=s.events.length;for(const m of Object.values(s.state.units).filter(u=>u.team==='red'&&u.hp>0)){m.protectionTick=0;s.hit(s.hero,m,240,'direct');}s.mission.evaluate(s.clock.tick,s.events.slice(mark));}return{ended:s.ended,outcome:s.outcome?.outcome};});
const destroy=ids=>page.evaluate(ids=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;for(const id of ids){const t=s.state.structures[id];if(t){t.protectionTick=0;s.hit(s.hero,t,1e9,'direct');}}s.mission.evaluate(s.clock.tick,s.drainEvents());for(let i=0;i<7&&!s.ended;i++)s.advance(1000/30+.01);},ids);
const keepHit=amount=>page.evaluate(amount=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hit({...s.hero,id:'raider',team:'red',kind:'minion-red'},s.state.bases['blue-base'],amount,'direct');for(let i=0;i<3&&!s.ended;i++)s.advance(1000/30+.01);},amount);
const killRedKeep=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,b=s.state.bases['red-base'];b.protectionTick=0;s.hit(s.hero,b,1e9,'direct');for(let i=0;i<7&&!s.ended;i++)s.advance(1000/30+.01);});
const result=async()=>{await page.evaluate(()=>window.kingdomGame.scene.resume('Battle'));await wait(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await frames(6);return page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return{title:h.resultTitle.text,detail:h.resultDetail.text,level:h.campaignResultLevel.text,key:(()=>{try{return localStorage.getItem('kingdom-clash.campaign.v1');}catch{return 'THROWS';}})()};});};
const toResultSelect=async()=>{await tapExpr(`g.scene.getScene('HUD').levelSelectHit`);await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));await frames(4);};
const clears=raw=>raw&&raw!=='THROWS'?Object.fromEntries(Object.entries(JSON.parse(raw).levels).map(([k,v])=>[k,v.clears])):null;
const count=()=>checks.length;
const wedge=['red-tower-front-center','red-tower-rear-north','red-tower-rear-south'],gate=['red-tower-keep-north','red-tower-keep-south'];
// S6B: ends the running campaign match through the Simulation's own (only) finish path, as a Victory.
const forceWin=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.finish('victory','objectives-complete',s.clock.tick);});
// S6B Level 8: plays the tide phase for real: places two Archer Towers as Wood and Iron allow (player commands) and strikes every raider each
// tick until the tide's waves are defeated, then stops as the break phase opens (or the match ends, when the front is already down). Allied minions
// are struck down too: with every raider gone at once they would otherwise walk unopposed into the Crimson line (not representative of play)
// and break towers this check means to leave standing. Neither removal touches a mission counter (only Crimson waves and Azure towers count).
const playTide=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,DT=1000/30+.01,cells=[[12,10],[12,14],[9,9],[9,15]],red=s.state.bases['red-base'];let n=0,req=0;
 const sweep=()=>{for(const m of Object.values(s.state.units).filter(u=>u.kind==='minion-red'||u.kind==='minion-blue').filter(u=>u.hp>0)){m.protectionTick=0;s.hit(m.team==='red'?s.hero:red,m,240,'direct');}};
 while(!s.ended&&s.mission.phase===0&&n++<20000){
  const built=Object.values(s.state.structures).filter(b=>b.team==='blue'&&b.kind==='tower').length;
  if(built<2&&s.state.wood>=80&&s.state.iron>=10){const c=cells.find(([c,r])=>s.placementReason('tower',c,r)==='');if(c)s.send({type:'place',requestId:'tide'+(++req),kind:'tower',col:c[0],row:c[1]});}
  const pre=s.events.length;sweep();s.mission.evaluate(s.clock.tick,s.events.slice(pre));if(s.ended||s.mission.phase!==0)break;
  s.advance(DT);const mark=s.events.length;sweep();s.mission.evaluate(s.clock.tick,s.events.slice(mark));}
 // This helper evaluates the mission outside Simulation.step, so a mission it completes is declared by the Simulation's own end check on the next step.
 const tideTick=s.clock.tick;for(let i=0;i<3&&!s.ended&&s.mission.complete;i++)s.advance(DT);
 const fell=ids=>ids.filter(id=>!s.state.structures['red-tower-'+id]).length,down=fell(['keep-north','keep-south','front-north','front-center','front-south']),front=fell(['front-north','front-center','front-south']);
 return{ended:s.ended,outcome:s.outcome?.outcome,reason:s.outcome?.reason,phase:s.missionStatus().activePhase,waves:s.mission.wavesDefeated,down,front,seconds:tideTick/30,declaredAfter:s.outcome?s.outcome.tick-tideTick:null};});
// S6D Level 9: plays a Guardian who stays at the Keep, raises two Archer Towers and Charges raiders as they close in (player commands only), until the
// match ends. Counts the Crimson slows the Simulation reports and reads the mission counter back.
const playVanguard=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,DT=1000/30+.01,cells=[[12,10],[12,14],[9,9],[9,15]],K={x:330,y:600};let n=0,req=0,slows=0;
 s.send({type:'learn',requestId:'v'+(++req),skill:'charge'});
 while(!s.ended&&n++<20000){
  const st=s.state,h=s.hero,t=s.clock.tick,built=Object.values(st.structures).filter(b=>b.team==='blue'&&b.kind==='tower').length;
  if(t%15===0&&built<2&&st.wood>=80&&st.iron>=10){const c=cells.find(([c,r])=>s.placementReason('tower',c,r)==='');if(c)s.send({type:'place',requestId:'vt'+(++req),kind:'tower',col:c[0],row:c[1]});}
  if(st.heroProgression.skillPoints>0&&!st.heroProgression.ranks.bash)s.send({type:'learn',requestId:'v'+(++req),skill:'bash'});
  const foe=Object.values(st.units).filter(u=>u.team==='red'&&u.hp>0&&Math.hypot(u.x-K.x,u.y-K.y)<520).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0],goal=foe??{x:540,y:600},d=Math.hypot(goal.x-h.x,goal.y-h.y);
  s.send({type:'move',...(d>(foe?70:30)?{x:(goal.x-h.x)/d,y:(goal.y-h.y)/d}:{x:0,y:0})});s.send({type:'attack'});
  if(foe&&t%10===0&&h.hp>0&&st.heroProgression.ranks.charge&&s.remaining('charge')===0&&!st.skills.cast&&d<130)s.send({type:'cast',skill:'charge',requestId:'vc'+(++req),direction:{x:(foe.x-h.x)/d,y:(foe.y-h.y)/d}});
  const mark=s.events.length;s.advance(DT);for(const e of s.events.slice(mark))if(e.type==='status'&&e.status==='slow'&&e.id.startsWith('red-'))slows++;
 }
 return{ended:s.ended,outcome:s.outcome?.outcome,reason:s.outcome?.reason,slows,counter:s.missionStatus().objectives.find(o=>o.id==='slows').progress,seconds:+(s.clock.tick/30).toFixed(1),keep:Math.round(s.state.bases['blue-base'].hp)};});
// S6D Level 10: places the two Archer Towers as player commands and advances until they stand (or the match ends).
const buildTowers=()=>page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,DT=1000/30+.01,cells=[[12,10],[12,14],[9,9],[9,15]];let n=0,req=0;
 while(!s.ended&&n++<1500){
  const built=Object.values(s.state.structures).filter(b=>b.team==='blue'&&b.kind==='tower').length;
  if(n%15===1&&built<2&&s.state.wood>=80&&s.state.iron>=10){const c=cells.find(([c,r])=>s.placementReason('tower',c,r)==='');if(c)s.send({type:'place',requestId:'bt'+(++req),kind:'tower',col:c[0],row:c[1]});}
  s.advance(DT);}
 for(let i=0;i<3&&!s.ended&&s.mission.complete;i++)s.advance(DT);
 return{ended:s.ended,outcome:s.outcome?.outcome,reason:s.outcome?.reason,phase:s.missionStatus().activePhase,towers:s.missionStatus().objectives.find(o=>o.id==='towers').progress,seconds:+(s.clock.tick/30).toFixed(1)};});
// The objective HUD as drawn: visible row texts, their CSS size and containment, and whether the panel is clear of the touch controls.
const hudRows=async()=>{await frames(6);return page.evaluate(()=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),k=g.canvas.getBoundingClientRect().height/540,f=h.missionBounds;
 const circle=o=>({left:o.x-o.hitRadius,right:o.x+o.hitRadius,top:o.y-o.hitRadius,bottom:o.y+o.hitRadius}),overlap=b=>f.x<b.right&&f.x+f.width>b.left&&f.y<b.bottom&&f.y+f.height>b.top;
 const rows=h.missionRows.filter(r=>r.visible).map(r=>{const b=r.getBounds();return{t:r.text,css:parseFloat(r.style.fontSize)*k,inside:b.left>=f.x-.5&&b.right<=f.x+f.width+.5&&b.top>=f.y-.5&&b.bottom<=f.y+f.height+.5};});
 return{rows,heading:h.missionHeading.text,collapsed:h.missionCollapsed,panel:{x:f.x,y:f.y,w:f.width,h:f.height},onScreen:f.x>=0&&f.y>=0&&f.x+f.width<=960&&f.y+f.height<=540,
  clear:[h.joystickHit.getBounds(),...h.abilities.map(circle),...h.utilities.map(circle)].every(b=>!overlap(b))};});};
// Every expected [label, counter] is a visible row inside the panel, or (collapsed beside a popup) the first is the heading.
const objectiveRows=(hud,want)=>hud.collapsed?hud.heading===want[0][0]:want.every(([label,n])=>hud.rows.some(x=>x.t.includes(label)&&x.t.includes(n)&&x.inside));

try{
 // ---- 1. Fresh player ----
 await open();
 check(await stored()===null,'A fresh browser has no saved progress and loading the menu does not write one');
 let m=await menu();check(m.state==='start'&&m.texts.includes('START CAMPAIGN')&&m.texts.some(t=>t.includes('Level 1 — Hold the Ford')),'Fresh player: Main Menu offers START CAMPAIGN naming Level 1');
 check(m.texts.includes('CAMPAIGN')&&m.texts.includes('FULL BATTLE / QUICK PLAY'),'The existing CAMPAIGN and FULL BATTLE / QUICK PLAY buttons remain');
 await toSelect();let s=await select();
 check(JSON.stringify(s.open)===JSON.stringify(['campaign-01','campaign-20'])&&JSON.stringify(s.locked)===JSON.stringify(['campaign-02','campaign-03','campaign-04','campaign-05','campaign-06','campaign-07','campaign-08','campaign-09','campaign-10']),'Fresh save: Level 1 and Full Battle are open; Levels 2-10 are locked');
 check(s.lockedInput.every(v=>!v),'Locked cards have no input at all');
 check(s.texts.includes('LOCKED — complete Level 1')&&s.texts.includes('LOCKED — complete Level 9')&&s.texts.filter(t=>t==='LOCKED').length===9,'Locked cards read "LOCKED — complete Level N" with a LOCKED button');
 check(s.texts.includes('FULL BATTLE · ALWAYS AVAILABLE')&&!s.texts.some(t=>t.includes('COMPLETED')),'Level 20 is labelled FULL BATTLE · ALWAYS AVAILABLE and nothing is marked completed');
 check(s.warning===null,'A normal fresh save shows no storage warning');
 await snap('select-fresh-top');
 // Scrolling must not re-enable a locked card, and a tap on a visible locked card does nothing.
 await wheel(4000);s=await select();await snap('select-fresh-end');
 check(s.lockedInput.every(v=>!v)&&s.enabled.find(e=>e[0]==='campaign-20')[1]===true&&s.enabled.find(e=>e[0]==='campaign-01')[1]===false,'After scrolling, locked cards still have no input; the visible Level 20 button is enabled and the hidden Level 1 button is not');
 await wheel(-4000);
 for(const id of ['campaign-02','campaign-05','campaign-08','campaign-10']){await reveal(id,'lockedCards');await tap('CampaignSelect','lockedCards',id);check(await active('CampaignSelect')&&!(await active('MissionBriefing')),`Tapping locked ${id} does nothing`);}
 // Direct scene navigation cannot skip a lock.
 for(const [scene,data,label] of [['MissionBriefing',{levelId:'campaign-02'},'Mission Briefing Level 2'],['MissionBriefing',{levelId:'campaign-99'},'Mission Briefing unknown level'],['MissionBriefing',undefined,'Mission Briefing without data'],['MissionBriefing',{levelId:'campaign-06'},'Mission Briefing Level 6'],
  ['Battle',{mode:'campaign',levelId:'campaign-03'},'Battle Level 3'],['Battle',{mode:'campaign',levelId:'campaign-05'},'Battle Level 5'],['Battle',{mode:'campaign',levelId:'campaign-08'},'Battle Level 8'],['Battle',{mode:'campaign',levelId:'campaign-10'},'Battle Level 10'],['Battle',{mode:'campaign',levelId:'campaign-99'},'Battle unknown level']]){
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
 await killRedKeep();let r=await result();check(r.title==='VICTORY'&&r.key===null&&!/unlocked|Level completed|up to date/i.test(r.detail),'A Quick Play Victory records nothing and shows no campaign message');

 // ---- 2. Level 1 Victory, reload, Continue, replay ----
 await open();await toSelect();await briefing('campaign-01');await start();
 const won=await winByWaves();check(won.ended&&won.outcome==='victory','Level 1 reaches an authoritative Victory');
 r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Level 2 unlocked'),'The Victory screen says "Level 2 unlocked"');
 check(JSON.stringify(clears(r.key))===JSON.stringify({'campaign-01':1}),'Progress was already saved when the Victory screen appeared: {campaign-01: 1 clear}');
 // A repeated match-end for the same match records nothing more.
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle');b.recordMatchEnd();b.recordMatchEnd();b.simulation.events.push({type:'match-end',outcome:'victory',tick:b.simulation.clock.tick});});await page.waitForTimeout(300);
 check(JSON.stringify(clears(await stored()))===JSON.stringify({'campaign-01':1}),'Duplicate match-end delivery records exactly one clear');
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').resultDetail.text.includes('Level 2 unlocked')),'Duplicate match-end delivery leaves the message "Level 2 unlocked" unchanged');
 await snap('victory-level-1');
 await toResultSelect();s=await select();
 check(JSON.stringify(s.open)===JSON.stringify(['campaign-01','campaign-02','campaign-20'])&&s.locked[0]==='campaign-03'&&s.locked.length===8,'After Level 1: Level 2 is unlocked and Levels 3-10 stay locked');
 check(s.texts.includes('✓ COMPLETED')&&s.texts.filter(t=>t.includes('COMPLETED')).length===1,'Level 1 shows ✓ COMPLETED, and only Level 1');
 await snap('select-after-level-1');
 await page.reload();await wait(()=>window.kingdomGame?.scene?.isActive('MainMenu'));
 check(JSON.stringify(clears(await stored()))===JSON.stringify({'campaign-01':1}),'Reload keeps the saved progress');
 m=await menu();check(m.state==='continue'&&m.texts.includes('CONTINUE CAMPAIGN')&&m.texts.some(t=>t.includes('Level 2 — Fortify the Crossing')),'After reload the Main Menu offers CONTINUE CAMPAIGN naming Level 2');
 await snap('menu-continue');
 await tap('MainMenu','continueButton');await wait(()=>window.kingdomGame.scene.isActive('MissionBriefing'));
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId)==='campaign-02'&&!(await active('Battle')),'Continue opens the Level 2 Mission Briefing and does not start a battle');
 await tap('MissionBriefing','backButton');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));s=await select();
 check(s.locked.includes('campaign-03')&&!s.open.includes('campaign-03'),'After reload Level 3 is still locked');
 await page.evaluate(()=>window.kingdomGame.scene.start('Battle',{mode:'campaign',levelId:'campaign-03'}));await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));await page.waitForTimeout(250);
 check(!(await active('Battle'))&&!(await active('HUD')),'After reload a direct start of locked Level 3 still redirects');
 // Replay Level 1.
 await briefing('campaign-01');await start();await winByWaves();r=await result();
 check(JSON.stringify(clears(r.key))===JSON.stringify({'campaign-01':2}),'Replaying Level 1 adds a clear and keeps progress');
 check(r.detail.includes('Level completed')&&!r.detail.includes('unlocked'),'A Level 1 replay says "Level completed", not "Level 2 unlocked"');
 await toResultSelect();s=await select();check(s.open.includes('campaign-02')&&s.locked.length===8,'Replay leaves Level 2 unlocked and Levels 3-10 locked');

 // ---- 3. Defeat, Retry and Quit never record ----
 await open();await toSelect();await briefing('campaign-01');await start();
 await keepHit(1e9);r=await result();
 check(r.title==='DEFEAT'&&r.key===null&&!/unlocked|Level completed|up to date/i.test(r.detail),'Defeat records nothing and shows no campaign message');
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
 check(r.title==='VICTORY'&&r.key===null&&!/unlocked|Level completed|up to date/i.test(r.detail),'The staged fixture can win but never records campaign progress or shows a campaign message');

 // ---- 5. Corrupt, newer-version and unavailable storage ----
 await open({seed:'{garbage'});m=await menu();
 check(m.state==='start'&&errors.length===0,'A malformed save recovers to a fresh, playable menu without errors');
 await toSelect();await briefing('campaign-01');await start();await winByWaves();r=await result();
 check(JSON.stringify(clears(r.key))===JSON.stringify({'campaign-01':1}),'The next Victory replaces the malformed save with a valid one');
 const future=JSON.stringify({version:2,levels:{'campaign-01':{clears:7}},stars:{'campaign-01':3}});
 await open({seed:future});await toSelect();s=await select();
 check(s.warning==="Progress can't be saved in this browser."&&s.open.length===2,'A newer-version save is not read as progress and the storage warning shows');
 await briefing('campaign-01');await start();await winByWaves();r=await result();
 check(r.key===future,'A newer-version save is not overwritten by Victory');
 await toResultSelect();s=await select();check(s.open.includes('campaign-02')&&s.warning!==null,'Progress continues in memory for the session (Level 2 unlocked) with the warning shown');
 await snap('select-newer-version');
 await open({init:`Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}});`});
 check(await stored()==='THROWS'&&(await menu()).state==='start','With localStorage blocked the game still reaches a playable menu');
 await toSelect();s=await select();check(s.warning!==null&&s.open.includes('campaign-01'),'Blocked storage: warning shown, Level 1 playable');
 await briefing('campaign-01');await start();await winByWaves();r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Level 2 unlocked'),'Blocked storage: Victory still unlocks Level 2 for the session');
 await toResultSelect();s=await select();check(s.open.includes('campaign-02')&&s.warning!==null,'Blocked storage: session progress persists across scenes');
 await tap('CampaignSelect','backButton');await wait(()=>window.kingdomGame.scene.isActive('MainMenu'));m=await menu();
 check(m.state==='continue'&&m.texts.some(t=>t.includes('Level 2')),'Blocked storage: Continue Campaign targets Level 2 in the same session');
 await open({init:`Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError');};`});
 await toSelect();await briefing('campaign-01');await start();await winByWaves();r=await result();check(r.detail.includes('Level 2 unlocked'),'A first clear whose write fails still says "Level 2 unlocked"');await toResultSelect();s=await select();
 check(r.title==='VICTORY'&&s.open.includes('campaign-02')&&s.warning!==null,'A failing write keeps session progress and shows the warning');
 await briefing('campaign-01');await start();await winByWaves();r=await result();
 check(r.detail.includes('Level completed')&&!r.detail.includes('unlocked'),'After a failed write the next clear in the session is a replay ("Level completed")');
 check(errors.length===0,'No page errors from any storage failure');

 // ---- 6. Out-of-order and unknown ids ----
 await open({seed:saveOf(3,5)});await toSelect();s=await select();
 check(JSON.stringify(s.open)===JSON.stringify(['campaign-01','campaign-20'])&&!s.texts.includes('✓ COMPLETED'),'A save with only Levels 3 and 5 unlocks nothing');
 await open({seed:JSON.stringify({version:1,levels:{'campaign-01':{clears:1},'campaign-12':{clears:1},'campaign-20':{clears:4}}})});await toSelect();s=await select();
 check(JSON.stringify(s.open)===JSON.stringify(['campaign-01','campaign-02','campaign-20'])&&s.texts.filter(t=>t==='✓ COMPLETED').length===1,'Unknown ids and a stored Level 20 entry do not unlock anything extra');

 // ---- 7. Level 5 → 6 → 7 → 8, up to date, and Level 20 ----
 await open({seed:saveOf(1,2,3,4)});m=await menu();check(m.state==='continue'&&m.texts.some(t=>t.includes('Level 5 — Iron Bulwark')),'With Levels 1-4 done, Continue targets Level 5');
 await toSelect();await briefing('campaign-05');await start();
 await destroy(['red-tower-front-north','red-tower-rear-north','red-tower-keep-north']);r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Level 6 unlocked')&&!r.detail.includes('up to date'),'Completing Level 5 now says "Level 6 unlocked"');
 check(JSON.stringify(clears(r.key))===JSON.stringify({'campaign-01':1,'campaign-02':1,'campaign-03':1,'campaign-04':1,'campaign-05':1}),'Completing Level 5 saves Level 5 and nothing else');
 await toResultSelect();s=await select();check(s.open.includes('campaign-06')&&JSON.stringify(s.locked)===JSON.stringify(['campaign-07','campaign-08','campaign-09','campaign-10']),'After Level 5: Level 6 is unlocked; Levels 7 to 10 stay locked');
 // An existing save from before Levels 6-8 existed continues at Level 6.
 await open({seed:saveOf(1,2,3,4,5)});m=await menu();check(m.state==='continue'&&m.texts.includes('CONTINUE CAMPAIGN')&&m.texts.some(t=>t.includes('Level 6 — Breach the Front')),'An existing Levels 1-5 save offers CONTINUE CAMPAIGN naming Level 6');
 await tap('MainMenu','continueButton');await wait(()=>window.kingdomGame.scene.isActive('MissionBriefing'));
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('MissionBriefing').levelId)==='campaign-06','Continue opens the Level 6 Mission Briefing');
 await start();let hud=await hudRows();
 check(objectiveRows(hud,[['Stun 4 raiders with Shield Bash','0/4'],['Defeat 2 Crimson waves','0/2'],['Destroy 2 of 3 front towers','0/2']]),`Level 6 HUD lists its three objectives with counters, the 2-of-3 breach locked (${JSON.stringify(hud.rows.map(x=>x.t))})`);
 // Levels 6 and 7 need Shield Bash stuns and Taunts, which only a played Guardian produces; their missions are proven headless
 // (tests/campaign-levels-6-8.cjs). Here the Simulation's own finish() ends the match as a Victory so the progression path is exercised.
 await forceWin();r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Level 7 unlocked')&&clears(r.key)['campaign-06']===1,'Clearing Level 6 says "Level 7 unlocked" and saves it');
 await toResultSelect();s=await select();check(s.open.includes('campaign-07')&&JSON.stringify(s.locked)===JSON.stringify(['campaign-08','campaign-09','campaign-10']),'After Level 6: Level 7 is unlocked; Levels 8 to 10 stay locked');
 await briefing('campaign-07');await start();hud=await hudRows();
 check(objectiveRows(hud,[['Complete 3 Archer Towers','0/3'],['Taunt 6 raiders','0/6'],['Archer Towers slay 12 raiders','0/12']]),`Level 7 HUD lists its three objectives with counters (${JSON.stringify(hud.rows.map(x=>x.t))})`);
 await forceWin();r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Level 8 unlocked')&&clears(r.key)['campaign-07']===1,'Clearing Level 7 says "Level 8 unlocked" and saves it');
 await toResultSelect();s=await select();check(s.open.includes('campaign-08')&&JSON.stringify(s.locked)===JSON.stringify(['campaign-09','campaign-10']),'After Level 7: Level 8 is unlocked; Levels 9 and 10 stay locked');
 await briefing('campaign-08');await start();hud=await hudRows();
 const l8=[['Build 2 Archer Towers','0/2'],['Defeat 5 Crimson waves','0/5'],['Destroy the 3 front towers','0/3']];
 check(hud.heading==='Build 2 Archer Towers'&&objectiveRows(hud,l8),`Level 8 HUD is headed by the first tide objective and lists the locked break objective at 0/3 (${hud.heading} | ${JSON.stringify(hud.rows.map(x=>x.t))})`);
 // Known behavior, shown as drawn: towers destroyed during the tide leave the locked break row at 0/3 until the tide ends.
 await destroy(['red-tower-keep-north','red-tower-keep-south','red-tower-front-north','red-tower-front-center']);hud=await hudRows();
 check(objectiveRows(hud,[['Destroy the 3 front towers','0/3']])&&!(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.ended)),`Both gate towers and two front towers down during the tide: the locked break row still reads 0/3 and the match goes on (${JSON.stringify(hud.rows.map(x=>x.t))})`);
 let tide=await playTide();hud=await hudRows();
 check(!tide.ended&&tide.phase==='break'&&tide.waves===5&&tide.down===4&&tide.front===2&&hud.heading==='Destroy the 3 front towers'&&objectiveRows(hud,[['Destroy the 3 front towers','2/3']]),`After five waves and two towers (${tide.seconds.toFixed(1)} s) the break opens and credits the two early front kills only: 2/3 (${JSON.stringify(tide)} | ${hud.heading} | ${JSON.stringify(hud.rows.map(x=>x.t))})`);
 await snap('level-8-break-2of3');
 await destroy(['red-tower-front-south']);r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Level 9 unlocked')&&!r.detail.includes('up to date'),'Completing Level 8 now says "Level 9 unlocked"');
 check(JSON.parse(r.key).levels['campaign-08'].clears===1&&!('campaign-20' in JSON.parse(r.key).levels)&&Object.keys(JSON.parse(r.key).levels).length===8&&JSON.parse(r.key).version===1,'Completing Level 8 saves Level 8 in the same version-1 format and does not touch Level 20');
 // Replay: the front line down first (gate towers left standing), so the break completes on the same tick the tide does.
 await toResultSelect();await briefing('campaign-08');await start();
 await destroy(['red-tower-front-north','red-tower-front-center','red-tower-front-south']);tide=await playTide();
 check(tide.ended&&tide.outcome==='victory'&&tide.reason==='objectives-complete'&&tide.waves===5&&tide.front===3&&tide.down===3&&tide.declaredAfter<=1,`With the front line down early and both gate towers standing, Level 8 is won as the fifth wave is defeated: the break completes with the tide (${JSON.stringify(tide)})`);
 r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Level completed')&&!r.detail.includes('up to date')&&JSON.parse(r.key).levels['campaign-08'].clears===2,'Replaying Level 8 says "Level completed" and counts a second clear');
 await toResultSelect();s=await select();check(JSON.stringify(s.locked)===JSON.stringify(['campaign-10'])&&s.open.includes('campaign-09')&&s.texts.filter(t=>t==='✓ COMPLETED').length===8,'After Level 8: Level 9 is unlocked and Level 10 stays locked');
 // ---- S6D Level 9: The Lone Vanguard ----
 await briefing('campaign-09');await start();hud=await hudRows();
 const l9=[['Slow 5 raiders with Vanguard Charge','0/5'],['Destroy the 3 wedge towers','0/3']];
 check(hud.heading==='Slow 5 raiders with Vanguard Charge'&&objectiveRows(hud,l9),`Level 9 HUD is headed by the Charge objective and lists both objectives at 0 (${hud.heading} | ${JSON.stringify(hud.rows.map(x=>x.t))})`);
 await destroy(wedge);hud=await hudRows();
 check(objectiveRows(hud,[['Slow 5 raiders with Vanguard Charge','0/5'],['Destroy the 3 wedge towers','3/3']])&&!(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.ended)),`With the wedge down the Charge row still reads 0/5 and the match goes on (${JSON.stringify(hud.rows.map(x=>x.t))})`);
 await snap('level-9-wedge-down');
 const van=await playVanguard();
 check(van.ended&&van.outcome==='victory'&&van.reason==='objectives-complete'&&van.slows>=5&&van.counter===5,`Level 9 is won by five Vanguard Charges that connect (${JSON.stringify(van)})`);
 r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Level 10 unlocked')&&!r.detail.includes('up to date')&&clears(r.key)['campaign-09']===1&&Object.keys(JSON.parse(r.key).levels).length===9,'Completing Level 9 says "Level 10 unlocked" and saves it');
 await toResultSelect();s=await select();check(s.locked.length===0&&s.open.includes('campaign-10'),'After Level 9: Level 10 is unlocked and nothing is locked');
 // ---- S6D Level 10: The Crimson Keep ----
 await briefing('campaign-10');await start();hud=await hudRows();
 const l10=[['Build 2 Archer Towers','0/2'],['Destroy the 2 gate towers','0/2'],['Destroy the Crimson Keep','0/1']];
 check(hud.heading==='Build 2 Archer Towers'&&objectiveRows(hud,l10),`Level 10 HUD is headed by the tower objective and lists the locked Keep objective (${hud.heading} | ${JSON.stringify(hud.rows.map(x=>x.t))})`);
 await killRedKeep();let st10=await page.evaluate(()=>{const sim=window.kingdomGame.scene.getScene('Battle').simulation;return{ended:sim.ended,phase:sim.missionStatus().activePhase};});
 check(!st10.ended&&st10.phase==='gates','The Crimson Keep destroyed first does not win and does not skip the gates');
 await destroy(gate);st10=await page.evaluate(()=>{const sim=window.kingdomGame.scene.getScene('Battle').simulation;return{ended:sim.ended,phase:sim.missionStatus().activePhase,towers:sim.missionStatus().objectives.find(o=>o.id==='towers').progress};});
 check(!st10.ended&&st10.phase==='gates'&&st10.towers===0,`Both gate towers down without the two Archer Towers does not win (${JSON.stringify(st10)})`);
 hud=await hudRows();await snap('level-10-gates-down');
 const sg=await buildTowers();
 check(sg.ended&&sg.outcome==='victory'&&sg.reason==='objectives-complete'&&sg.towers>=2,`The second Archer Tower completes the gates phase and, the Crimson Keep already down, wins (${JSON.stringify(sg)})`);
 r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Campaign up to date — all available levels complete')&&clears(r.key)['campaign-10']===1&&Object.keys(JSON.parse(r.key).levels).length===10&&!('campaign-20' in JSON.parse(r.key).levels),'Completing Level 10 shows "Campaign up to date — all available levels complete" and saves ten levels without Level 20');
 await toResultSelect();await briefing('campaign-10');await start();await destroy(gate);await buildTowers();await killRedKeep();r=await result();
 check(r.title==='VICTORY'&&r.detail.includes('Level completed')&&!r.detail.includes('up to date')&&JSON.parse(r.key).levels['campaign-10'].clears===2,'Replaying Level 10 says "Level completed" and counts a second clear');
 await toResultSelect();s=await select();check(s.locked.length===0&&s.open.includes('campaign-20')&&s.texts.filter(t=>t==='✓ COMPLETED').length===10,'All ten sequential levels show ✓ COMPLETED; Level 20 is not marked');
 await tap('CampaignSelect','backButton');await wait(()=>window.kingdomGame.scene.isActive('MainMenu'));m=await menu();
 check(m.state==='up-to-date'&&m.texts.includes('CAMPAIGN UP TO DATE')&&m.texts.some(t=>t.includes('Levels 1–10 complete')),'Main Menu says CAMPAIGN UP TO DATE with "Levels 1–10 complete"');
 await snap('menu-up-to-date');
 await tap('MainMenu','continueButton');await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));check(!(await active('MissionBriefing'))&&!(await active('Battle')),'Up to date: the button opens Campaign Select, never Level 20');
 // Level 20 stays playable on its own and records nothing.
 await open();await toSelect();await briefing('campaign-20');await start();
 check(await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').campaignLevel.number)===20,'Level 20 starts from a fresh save without clearing Levels 1-10');
 await killRedKeep();r=await result();check(r.title==='VICTORY'&&r.key===null&&!/unlocked|Level completed|up to date/i.test(r.detail),'A Level 20 Victory records nothing and shows no campaign message');
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
  const tags=sel.cards.filter(c=>c.t.includes('COMPLETED')||c.t.includes('LOCKED —')||c.t.includes('ALWAYS')),diffs=sel.cards.filter(c=>/^(INTRODUCTORY|STANDARD|FULL-BATTLE)$/.test(c.t));
  const clash=tags.some(tg=>diffs.some(d=>Math.abs(d.top-tg.top)<14&&tg.r>d.l-6&&tg.l<d.r));
  check(tags.length>=1&&!clash&&tags.every(c=>c.css>=10.9)&&sel.cards.every(c=>c.r<=960),`${tag}: Campaign Select status tags are visible, readable and do not collide with the difficulty label`);
  await wheel(4000);await snap(`select-end-${tag}`);
  const end=await select();check(end.enabled.some(e=>e[0]==='campaign-20'&&e[1]&&e[2])&&end.lockedInput.every(v=>!v),`${tag}: scrolled to the end, Level 20 is tappable and locked cards remain inert`);
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
 // ---- 9. Levels 6-10 objective HUD at mobile landscape ----
 const expected={'campaign-06':[['Stun 4 raiders with Shield Bash','0/4'],['Defeat 2 Crimson waves','0/2'],['Destroy 2 of 3 front towers','0/2']],
  'campaign-07':[['Complete 3 Archer Towers','0/3'],['Taunt 6 raiders','0/6'],['Archer Towers slay 12 raiders','0/12']],'campaign-08':[['Build 2 Archer Towers','0/2'],['Defeat 5 Crimson waves','0/5'],['Destroy the 3 front towers','0/3']],
  'campaign-09':[['Slow 5 raiders with Vanguard Charge','0/5'],['Destroy the 3 wedge towers','0/3']],'campaign-10':[['Build 2 Archer Towers','0/2'],['Destroy the 2 gate towers','0/2'],['Destroy the Crimson Keep','0/1']]};
 for(const [id,want] of Object.entries(expected)){
  await open({seed:saveOf(1,2,3,4,5,6,7,8,9),viewport:{width:844,height:390}});await toSelect();await briefing(id);await start();const hud=await hudRows();
  const ok=want.length>1?objectiveRows(hud,want):hud.heading===want[0][0]&&hud.rows.some(x=>x.t.includes(want[0][1]));
  check(ok&&hud.onScreen&&hud.clear&&hud.rows.every(x=>x.inside&&x.css>=10.9),`844x390: ${id} objective panel shows its objectives and counters, readable (≥ 10.9 CSS px), on screen and clear of the touch controls (${JSON.stringify(hud.rows.map(x=>[x.t,+x.css.toFixed(1)]))}${hud.collapsed?' collapsed':''})`);
  await snap(`hud-${id}-844x390`);
 }
 check(errors.length===0,'No browser errors in the whole run');
}finally{
 evidence.errors=errors;evidence.checks=checks;await writeFile(`${root}/report.json`,JSON.stringify(evidence,null,1));
 if(ctx)await ctx.close();await browser.close();
}
console.log(`\n${checks.filter(c=>c.passed).length}/${checks.length} checks passed`);
