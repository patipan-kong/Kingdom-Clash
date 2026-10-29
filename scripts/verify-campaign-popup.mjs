import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// S4B: real canvas input + measured Phaser bounds. Outcomes use the same controlled
// Simulation actions as verify-campaign-levels; these are not human playthroughs.
const root=process.env.POPUP_EVIDENCE_ROOT||'test-results/s4b-popup';await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true}),checks=[],errors=[],evidence=[];
// Campaign missions are launched directly, so the v2 save marks Chapter 1 cleared (the unlock guard would otherwise send them back to the briefing).
await page.addInitScript(()=>{try{if(!sessionStorage.getItem('seeded')){localStorage.setItem('kingdom-clash.campaign.v2',JSON.stringify({version:1,levels:Object.fromEntries([1,2,3,4,5,6].map(n=>['campaign-'+String(n).padStart(2,'0'),{clears:1}]))}));sessionStorage.setItem('seeded','1');}}catch{}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const check=(ok,name)=>{checks.push({name,passed:!!ok});assert.ok(ok,name);console.log('PASS '+name);};
const frames=async()=>{const f=await page.evaluate(()=>window.kingdomGame.loop.frame);await page.waitForFunction(f=>window.kingdomGame.loop.frame>f+3,f);};
const wait=fn=>page.waitForFunction(fn,null,{timeout:20000});
const shot=name=>page.screenshot({path:`${root}/${name}.png`});
async function tap(expr){const p=await page.evaluate(expr=>{const g=window.kingdomGame,h=g.scene.getScene('HUD'),o=new Function('h','return '+expr)(h),b=o.getBounds(),r=g.canvas.getBoundingClientRect();return{x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};},expr);await page.touchscreen.tap(p.x,p.y);await frames();}
async function launch(level){await page.goto(process.env.PROTOTYPE_URL||'http://127.0.0.1:5210/');await wait(()=>window.kingdomGame?.scene.isActive('MainMenu'));await page.evaluate(level=>{const g=window.kingdomGame;g.scene.stop('MainMenu');g.scene.start('Battle',level?{mode:'campaign',levelId:typeof level==='string'?level:{2:'campaign-02',4:'campaign-03'}[level]}:{mode:'quick',encounter:'extended'});},level);await wait(()=>window.visualReady&&window.kingdomGame.scene.getScene('HUD')?.pauseButtons?.length);await page.evaluate(()=>window.kingdomGame.scene.pause('Battle'));await frames();}
const measure=()=>page.evaluate(()=>{
 const g=window.kingdomGame,h=g.scene.getScene('HUD'),s=g.scene.getScene('Battle').simulation,k=g.canvas.getBoundingClientRect().height/540;
 const popup=h.missionPopup(),f=h.missionBounds,rect=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
 const ov=(a,b)=>a.x<b.x+b.width-.1&&a.x+a.width>b.x+.1&&a.y<b.y+b.height-.1&&a.y+a.height>b.y+.1;
 const inside=b=>b.x>=-.5&&b.y>=-.5&&b.x+b.width<=960.5&&b.y+b.height<=540.5;
 const container=h.shop.visible?h.shop.container:h.skills.container.visible?h.skills.container:h.buildPanel.container;
 const texts=container.list.filter(o=>o.type==='Text'&&o.visible&&o.text),hits=container.list.filter(o=>o.input?.enabled&&o.visible);
 const mt=h.missionPanel.list.filter(o=>o.type==='Text'&&o.visible&&o.text);
 return{popup,mission:f,collapsed:h.missionCollapsed,nonOverlap:!!popup&&!ov(f,popup),inside:inside(f)&&!!popup&&inside(popup),
  missionTextInside:mt.every(t=>{const b=rect(t);return b.x>=f.x-.5&&b.y>=f.y-.5&&b.x+b.width<=f.x+f.width+.5&&b.y+b.height<=f.y+f.height+.5;}),
  popupTextInside:texts.every(t=>{const b=rect(t);return b.x>=popup.x-.5&&b.x+b.width<=popup.x+popup.width+.5&&b.y>=popup.y-.5&&b.y+b.height<=popup.y+popup.height+.5;}),
  controlsClear:[...h.abilities.map(a=>a.hit),...h.utilities.map(a=>a.hit),h.joystickHit].every(o=>!ov(f,rect(o))),
  headerClear:container!==h.buildPanel.container||h.buildPanel.model.collapsed||!ov(rect(h.buildPanel.heading),rect(h.buildPanel.resources)),
  hitCount:hits.length,minFont:Math.min(...mt.map(t=>parseFloat(t.style.fontSize)*k)),
  state:JSON.stringify(s.missionStatus()),progress:h.missionView,depth:[h.overlay.depth,h.missionPanel.depth,container.parentContainer?.depth??container.depth],
  listeners:['cast','simulation-event','pause-visual','stick'].map(e=>g.events.listenerCount(e)),match:s.state.inventory.matchId};
});
async function win(level){await page.evaluate(level=>{
 const s=window.kingdomGame.scene.getScene('Battle').simulation,dt=1000/30+.01;
 const run=(stop,kill,max=6000)=>{let i=0;while(!s.ended&&!stop()&&i++<max){s.advance(dt);if(kill){const mark=s.events.length,src=kill==='tower'?Object.values(s.state.structures).find(t=>t.team==='blue'&&t.kind==='tower'):s.hero;for(const m of Object.values(s.state.units).filter(u=>u.team==='red'&&u.hp>0)){m.protectionTick=0;s.hit(src,m,240,'direct');}s.mission.evaluate(s.clock.tick,s.events.slice(mark));}}};
 const place=(cells,tag)=>cells.forEach(([col,row],i)=>s.send({type:'place',requestId:tag+i,kind:'tower',col,row}));
 const destroy=ids=>{for(const id of ids){const t=s.state.structures[id];t.protectionTick=0;s.hit(s.hero,t,1e9,'direct');}s.mission.evaluate(s.clock.tick,s.drainEvents());run(()=>false,null,7);};
 if(level===2){place([[12,10],[12,14]],'a');run(()=>s.clock.tick>=320,null);run(()=>false,'tower',9000);}
 if(level===4){destroy(['red-tower-front-north','red-tower-front-center','red-tower-front-south']);}
 },level);await frames();}
const modal=()=>page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),f=h.campaignResultBounds,ts=h.results.list.filter(o=>o.type==='Text'&&o.visible&&o.text),bs=ts.map(t=>t.getBounds()),ov=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5,k=window.kingdomGame.canvas.getBoundingClientRect().height/540;
 return{title:h.resultTitle.text,frame:f,progress:h.campaignResultProgress.text,rows:h.missionView.rows,inside:f.x>=0&&f.y>=0&&f.x+f.width<=960&&f.y+f.height<=540,textInside:bs.every(b=>b.left>=f.x-.5&&b.right<=f.x+f.width+.5&&b.top>=f.y-.5&&b.bottom<=f.y+f.height+.5),separate:bs.every((b,i)=>bs.slice(i+1).every(c=>!ov(b,c))),font:parseFloat(h.campaignResultProgress.style.fontSize)*k,hits:[h.restartHit,h.levelSelectHit,h.mainMenuHit].map(o=>({h:o.getBounds().height*k,w:o.getBounds().width*k}))};});
try{
 // Phase B2A: the cases are old Level 2 (Fortify the Crossing, Chapter 1 Mission 2: closed Shop, two towers, six waves) and case 4 (Against the Tide, old Level 8, Mission 3: open Shop,
 // one battery objective, no phases). The old Level 3 case (Strike the Outpost) is retired with that mission.
 for(const [width,height] of [[960,540],[844,390],[740,360]])for(const level of [2,4]){
  const tag=`${width}x${height}-level-${level}`;await page.setViewportSize({width,height});await launch(level);
  const baseline=await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return{bounds:h.missionBounds,state:JSON.stringify(h.missionView),listeners:['cast','simulation-event','pause-visual','stick'].map(e=>window.kingdomGame.events.listenerCount(e))};});
  for(const mode of ['Build','Shop','Skills']){
   if(mode==='Shop'&&level===2){check(await page.evaluate(()=>!window.kingdomGame.scene.getScene('Battle').simulation.setup.shop),`${tag}: Shop remains disabled by mission rules (no gameplay override)`);continue;}
   await tap(mode==='Skills'?'h.skillOpen':`h.utilities.find(u=>u.id==='${mode.toLowerCase()}').hit`);
   let m=await measure();evidence.push({tag,mode,...m});await shot(`${tag}-${mode.toLowerCase()}`);
   check(m.nonOverlap&&m.inside&&m.missionTextInside&&m.popupTextInside&&m.headerClear&&m.controlsClear&&m.minFont>=9.9,`${tag}: ${mode} and objective bounds/content fit, do not overlap or cover touch controls`);
   check(JSON.stringify(m.progress)===baseline.state,`${tag}: ${mode} preserves authoritative objective state`);
   await tap('h.pauseButton.hit');await wait(()=>window.kingdomGame.scene.getScene('HUD').paused);
   check(await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return h.overlay.visible&&h.overlay.depth>Math.max(h.missionPanel.depth,h.utilityPanel.depth,h.shop.container.depth,h.skills.container.depth);}),`${tag}: Pause above ${mode}`);
   await tap("h.pauseButtons.find(b=>b.id==='resume').hit");let after=await measure();
   check(!await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').paused)&&JSON.stringify(after.popup)===JSON.stringify(m.popup)&&after.nonOverlap,`${tag}: Resume retains ${mode} and objective layout`);
  }
  // Closing the current popup restores full objectives; opening/switching above used real touch.
  await tap('h.skills.closeHit');
  check(await page.evaluate(b=>{const h=window.kingdomGame.scene.getScene('HUD');return !h.missionCollapsed&&JSON.stringify(h.missionBounds)===JSON.stringify(b);},baseline.bounds),`${tag}: Close restores original full objective bounds`);
  // Explicit close for each other available popup, including Build's selected/collapsed tray.
  await tap('h.utilities[0].hit');await tap('h.buildPanel.hits[0]');await frames();let selected=await measure();check(selected.nonOverlap&&selected.inside,`${tag}: selected construction tray remains unobstructed`);await tap('h.buildPanel.hits[3]');
  if(level!==2){await tap('h.utilities[1].hit');await tap("h.shop.buttons.get('close').hit");}
  check(await page.evaluate(b=>{const h=window.kingdomGame.scene.getScene('HUD');return !h.missionPopup()&&!h.missionCollapsed&&JSON.stringify(h.missionBounds)===JSON.stringify(b);},baseline.bounds),`${tag}: Build/Shop Close restore normal objective layout`);
  await win(level);
  await page.evaluate(()=>window.kingdomGame.scene.resume('Battle'));await wait(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await frames();const m=await modal();evidence.push({tag,result:m});await shot(`${tag}-victory`);
  check(m.title==='VICTORY'&&m.progress.split('\n').length===m.rows.length&&m.rows.every(r=>m.progress.includes(`✓ ${r.label} — ${r.progress}/${r.target} complete`)),`${tag}: Victory lists every phase/objective with exact authoritative values`);
  check(m.inside&&m.textInside&&m.separate&&m.font>=12.9&&m.hits.every(h=>h.h>=47.9),`${tag}: Victory text, panel and 48px buttons fit without overlap`);
  const id=await page.evaluate(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.inventory.matchId);await tap('h.restartHit');await page.waitForFunction(id=>{const g=window.kingdomGame,h=g.scene.getScene('HUD');return window.visualReady&&g.scene.getScene('Battle').simulation.state.inventory.matchId!==id&&h.missionView&&!h.results.visible;},id);await frames();
  check(await page.evaluate(base=>{const g=window.kingdomGame,h=g.scene.getScene('HUD');return !h.missionPopup()&&!h.missionCollapsed&&h.missionView.rows.every(r=>r.progress===(r.id==='level'?1:0))&&JSON.stringify(base)===JSON.stringify(['cast','simulation-event','pause-visual','stick'].map(e=>g.events.listenerCount(e)));},baseline.listeners),`${tag}: Retry fresh objectives, no popup and unchanged listener counts`);
  await tap('h.pauseButton.hit');await tap("h.pauseButtons.find(b=>b.id==='levelSelect').hit");await wait(()=>window.kingdomGame.scene.isActive('CampaignSelect'));check(await page.evaluate(()=>{const g=window.kingdomGame;return !g.scene.isActive('HUD')&&!g.scene.isActive('Battle')&&g.events.listenerCount('cast')===0;}),`${tag}: Level Select releases HUD and listeners`);
 }
 await launch('full-battle');await tap('h.utilities[1].hit');check(await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD'),s=window.kingdomGame.scene.getScene('Battle').simulation;return h.missionCollapsed&&!h.missionKeep.text.includes('0/0 complete')&&h.missionPhase.text===`${Math.ceil(s.state.bases['red-base'].hp)}/${s.state.bases['red-base'].maxHp}`;}),'Level 20 compact summary uses real Crimson Keep HP, not synthetic objective counts');
 await launch(null);await tap('h.utilities[0].hit');check(await page.evaluate(()=>{const h=window.kingdomGame.scene.getScene('HUD');return !h.missionPanel.visible&&!h.missionCollapsed&&h.buildPanel.container.visible;}),'Quick Play retains popup layout with no campaign objective');await tap('h.pauseButton.hit');check(await page.evaluate(()=>!window.kingdomGame.scene.getScene('HUD').utilityPanel.visible),'Quick Play retains close-popups-on-Pause behavior');await tap("h.pauseButtons.find(b=>b.id==='mainMenu').hit");await wait(()=>window.kingdomGame.scene.isActive('MainMenu'));check(await page.evaluate(()=>window.kingdomGame.events.listenerCount('cast')===0),'Main Menu releases battle listeners');
 check(!errors.length,'No browser errors');
}catch(e){errors.push(e.stack||String(e));await shot('failure').catch(()=>{});}
await writeFile(`${root}/report.json`,JSON.stringify({passed:checks.filter(c=>c.passed).length,total:checks.length,checks,errors,evidence},null,2));await browser.close();console.log(JSON.stringify({passed:checks.filter(c=>c.passed).length,total:checks.length,errors},null,2));if(errors.length)process.exit(1);
