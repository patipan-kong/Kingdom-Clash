// V1.2 release walk-through (docs/CAMPAIGN_GAMEPLAY_FREEZE.md "integrated regression gate"): both victory routes of the changed missions
// through the normal campaign entry, retry, progression, save/unlock, the Captain announcement (EN/TH/JA), mandatory objectives, protected
// Keeps and the final boss. Needs a server; runs on a release build: PROTOTYPE_URL=http://127.0.0.1:5750/ node scripts/verify-v12-walkthrough.mjs
// Menus, building and result buttons use real mouse/touch input. To keep it short, targets are destroyed with the simulation's own damage
// function and resources are granted; victory, defeat, objectives and progress are decided by the game. ONLY=routes,retry runs some sections.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {campaignFrames as frames,clickCampaignControl,openCampaignBriefing} from './campaign-browser-helpers.mjs';
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:5750/',dir=process.env.EVIDENCE||'test-results/v12-walkthrough';
await mkdir(dir,{recursive:true});
const only=process.env.ONLY?.split(','),want=n=>!only||only.includes(n),missions=process.env.MISSIONS?.split(',');
const launch=()=>chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
let browser=await launch(),contexts=0;
const newContext=async options=>{if(++contexts%4===0){await browser.close();browser=await launch();}return browser.newContext(options);};
let failed=0,total=0;const results=[];
const check=(ok,name,detail)=>{total++;if(!ok)failed++;results.push({name,passed:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${ok||detail===undefined?'':' '+JSON.stringify(detail)}`);};
const KEY='kingdom-clash.campaign.v2';
const ORDER=[1,2,3,4,5,6].flatMap(c=>[1,2,3,4,5,6].map(m=>`campaign-${String((c-1)*10+m).padStart(2,'0')}`));
const CHAPTER=['first-war','burning-frontier','frozen-crown','conquered-lands','rise-of-the-heroes','crimson-reckoning'];
const chapterOf=id=>CHAPTER[Math.floor(Number(id.slice(9))/10)];
const before=id=>{const n=Number(id.slice(9)),c=Math.floor(n/10);return ORDER.filter(o=>{const m=Number(o.slice(9)),d=Math.floor(m/10);return d<c||d===c&&m<n;});};
const nextOf=id=>ORDER[ORDER.indexOf(id)+1];

/** A fresh browser context whose save holds the clears before `id`, driven by real input from the main menu to the running match. */
async function open(id,{locale='en',touch=false,clears=before(id)}={}){
 const ctx=await newContext({viewport:touch?{width:844,height:390}:{width:1280,height:720},...(touch?{hasTouch:true,isMobile:true,deviceScaleFactor:2}:{})}),page=await ctx.newPage(),errors=[];
 page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(([KEY,save,locale])=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem(KEY,save);localStorage.setItem('kingdom-clash.locale.v1',locale);sessionStorage.setItem('seeded','1');}},
  [KEY,JSON.stringify({version:1,levels:Object.fromEntries(clears.map(c=>[c,{clears:1}]))}),locale]);
 const m={ctx,page,errors,id,input:touch?'touch':'mouse'};
 await page.goto(base);await scene(m,'MainMenu');await enter(m);return m;
}
const scene=(m,name)=>m.page.waitForFunction(n=>window.kingdomGame?.scene.isActive(n),name);
const click=(m,property,key,s)=>clickCampaignControl(m.page,property,key,m.input,s);
async function enter(m){
 await click(m,'campaignButton',undefined,'MainMenu');await scene(m,'ChapterSelect');await frames(m.page,4);
 await click(m,'chapterButtons',chapterOf(m.id),'ChapterSelect');await scene(m,'CampaignSelect');await frames(m.page,4);
 if(await m.page.evaluate(()=>!!window.kingdomGame.scene.getScene('CampaignSelect').conquestMap)){
  // Chapter 4's Conquest Map: choose the marker, then press Briefing.
  await click(m,'levelButtons',m.id,'CampaignSelect');
  const p=await m.page.evaluate(()=>{const g=window.kingdomGame,b=g.scene.getScene('CampaignSelect').conquestMap.briefingButton.getBounds(),r=g.canvas.getBoundingClientRect();return {x:r.x+b.centerX*r.width/960,y:r.y+b.centerY*r.height/540};});
  if(m.input==='touch')await m.page.touchscreen.tap(p.x,p.y);else await m.page.mouse.click(p.x,p.y);
  await scene(m,'MissionBriefing');
 }else await openCampaignBriefing(m.page,m.id,m.input);
 await frames(m.page,4);
 await click(m,'startButton',undefined,'MissionBriefing');await playing(m);
}
const playing=async m=>{
 await m.page.waitForFunction(id=>{const g=window.kingdomGame;return g.scene.isActive('HUD')&&g.scene.getScene('Battle').campaignLevel?.id===id&&g.scene.getScene('Battle').simulation?.state.match.phase==='playing'&&!g.scene.getScene('HUD').results.visible;},m.id);
 await frames(m.page,6);await safe(m);
};
const safe=m=>m.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;s.hero.hp=s.hero.maxHp=1e6;});
/** What the match looks like to the mission. */
const status=m=>m.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,st=s.missionStatus();
 return {ended:s.ended,outcome:s.outcome?.outcome??null,reason:s.outcome?.reason??null,phase:st.activePhase,objectives:Object.fromEntries(st.objectives.map(o=>[o.id,[o.progress,o.target,o.complete]])),
  keep:s.state.bases['red-base']&&{hp:s.state.bases['red-base'].hp,max:s.state.bases['red-base'].maxHp,shielded:!!s.state.bases['red-base'].invulnerable,damage:s.state.bases['red-base'].damage},
  structures:Object.keys(s.state.structures),red:Object.values(s.state.units).filter(u=>u.team==='red'&&u.hp>0).map(u=>u.id)};});
/** Real damage from the Guardian to these ids (structures, bases or units), judged by the mission as any hit would be. Shields still apply. */
const strike=(m,ids,steps=8)=>m.page.evaluate(([ids,steps])=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,mark=s.events.length;
 for(const id of ids){const t=s.state.structures[id]??s.state.bases[id]??s.state.units[id];if(t){t.protectionTick=0;s.hit(s.hero,t,1e9,'direct');}}
 if(!s.ended)s.mission.evaluate(s.clock.tick,s.events.slice(mark));
 for(let i=0;i<steps&&!s.ended;i++){s.hero.hp=s.hero.maxHp=1e6;s.advance(1000/30+.01);}},[ids,steps]);
/** Advance match time, killing Crimson soldiers as they appear, until the match ends, `waves` are down or `until` ticks pass. */
const holdWaves=(m,{waves=99,ticks=30000}={})=>m.page.evaluate(([waves,ticks])=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,DT=1000/30+.01,end=s.clock.tick+ticks;
 const done=()=>s.ended||s.clock.tick>=end||(s.missionStatus().objectives.find(o=>o.id==='waves')?.progress??0)>=waves;
 let n=0;while(!done()&&n++<60000){s.hero.hp=s.hero.maxHp=1e6;const k=s.state.bases['blue-base'];k.hp=k.maxHp;s.advance(DT);const mark=s.events.length;
  for(const u of Object.values(s.state.units).filter(u=>u.team==='red'&&u.hp>0&&u.kind==='minion-red')){u.protectionTick=0;s.hit(s.hero,u,1e9,'direct');}
  if(!s.ended)s.mission.evaluate(s.clock.tick,s.events.slice(mark));}
 for(let i=0;i<8&&!s.ended;i++){s.hero.hp=s.hero.maxHp=1e6;s.advance(DT);} // victory is declared by the next step
},[waves,ticks]);
const result=async m=>{
 await m.page.waitForFunction(()=>window.kingdomGame.scene.getScene('HUD').results.visible);await frames(m.page,8);
 return m.page.evaluate(KEY=>{const h=window.kingdomGame.scene.getScene('HUD');return {title:h.resultTitle.text,detail:h.resultDetail.text,buttons:Object.fromEntries(['restartHit','nextHit','chapterHit','levelSelectHit'].filter(k=>h[k].visible).map(k=>[k,h[k].getData('label').text])),
  saved:JSON.parse(localStorage.getItem(KEY)).levels};},KEY);
};
const hud=(m,property)=>click(m,property,undefined,'HUD');
const finish=async m=>{await m.ctx.close();};

/** Two Archer Towers through the real Build panel (keyboard B + mouse, or taps). Resources are granted. */
async function buildTowers(m,count=2){
 const {page}=m;
 await page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation;for(const [k,v] of Object.entries({wood:2000,iron:500}))s.economy.balances[k]=v*120;});await frames(page,6);
 const at=(x,y)=>page.evaluate(([x,y])=>{const r=window.kingdomGame.canvas.getBoundingClientRect();return {x:r.x+x*r.width/960,y:r.y+y*r.height/540};},[x,y]);
 const press=async p=>{if(m.input==='touch')await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);await frames(page,5);};
 const control=expr=>page.evaluate(expr=>{const g=window.kingdomGame,H=g.scene.getScene('HUD'),b=new Function('H','return '+expr)(H).getBounds();return {x:b.centerX,y:b.centerY};},expr);
 const tap=async expr=>{const c=await control(expr);await press(await at(c.x,c.y));};
 const placed=()=>page.evaluate(()=>Object.values(window.kingdomGame.scene.getScene('Battle').simulation.state.structures).filter(s=>s.team==='blue'&&s.id.startsWith('built-')).length);
 const open=()=>page.evaluate(()=>{const H=window.kingdomGame.scene.getScene('HUD');return H.utilityPanel.visible&&H.utilityMode==='Build';});
 for(let i=0;i<count;i++){
  const n=await placed();
  if(!await open()){if(m.input==='touch')await tap("H.utilities.find(u=>u.id==='build').hit");else{await page.keyboard.press('KeyB');await frames(page,5);}}
  if(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').buildPanel.model.collapsed))await tap('H.buildPanel.hits[4]');
  await tap('H.buildPanel.hits[1]');
  let confirmed=false;
  for(let y=170;y<=380&&!confirmed;y+=48)for(let x=200;x<=760&&!confirmed;x+=56){
   const covered=await page.evaluate(([x,y])=>{const b=window.kingdomGame.scene.getScene('HUD').buildPanel.bounds;return x>=b.x&&x<=b.x+b.width&&y>=b.y&&y<=b.y+b.height;},[x,y]);
   if(covered)continue;await press(await at(x,y));
   if(await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').buildPanel.hits[2].input.enabled)){await tap('H.buildPanel.hits[2]');
    await page.waitForFunction(n=>Object.values(window.kingdomGame.scene.getScene('Battle').simulation.state.structures).filter(s=>s.team==='blue'&&s.id.startsWith('built-')).length>n,n,{timeout:30000}).then(()=>confirmed=true,()=>{});}
  }
  if(!confirmed)return false;
  await page.waitForTimeout(450);
 }
 if(await open()){if(m.input==='touch')await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').closeUtility());else await page.keyboard.press('Escape');await frames(page,5);}
 return true;
}
const completeTowers=m=>holdWaves(m,{ticks:900});

// The eight changed missions: the original route's targets (null: waves) and what the Keep route must leave standing.
const FRONT=['red-tower-front-north','red-tower-front-center','red-tower-front-south'];
const BATTERIES=['red-tower-front-north','red-tower-rear-north','red-tower-keep-rear','red-tower-front-south','red-tower-rear-south'];
const MISSIONS={
 'campaign-01':{name:'C1M1',waves:5},'campaign-02':{name:'C1M2',waves:6,towers:true},
 'campaign-03':{name:'C1M3',targets:FRONT},'campaign-04':{name:'C1M4',targets:BATTERIES},
 'campaign-05':{name:'C1M5',camp:true},'campaign-11':{name:'C2M1',waves:6},
 'campaign-13':{name:'C2M3',targets:['red-tower-keep-north','red-tower-keep-south']},'campaign-14':{name:'C2M4',targets:['red-barracks-siege']},
};

if(want('routes'))for(const [id,spec] of Object.entries(MISSIONS))for(const route of ['original','keep']){
 if(missions&&!missions.includes(spec.name))continue;
 // The Keep route (and C1M2's original route) of every other mission is played with touch, so both inputs enter and finish missions.
 const touch=route==='keep'?id!=='campaign-02':id==='campaign-02';
 const L=`${spec.name} ${route} route (${touch?'touch':'keyboard/mouse'})`;
 try{
  const m=await open(id,{touch});
  let s=await status(m);check(!s.ended&&!s.keep.shielded&&s.keep.max>0,`${L}: starts from the menus with an open Crimson Keep`,s.keep);
  if(spec.towers){
   // Mandatory construction: neither alternative wins before the two towers stand.
   if(route==='original')await holdWaves(m,{waves:6});else await strike(m,['red-base']);
   s=await status(m);check(!s.ended&&s.objectives.towers[0]===0&&(route==='original'?s.objectives.waves[2]:s.objectives.keep[2]),`${L}: ${route==='original'?'six waves':'the razed Keep'} alone does not win without the two towers`,s.objectives);
   const built=await buildTowers(m);check(built,`${L}: two Archer Towers placed through the Build panel`);
   await completeTowers(m);
  }else{
   const targets=route==='keep'?['red-base']:spec.camp?await m.page.evaluate(()=>Object.keys(window.kingdomGame.scene.getScene('Battle').simulation.state.structures).filter(i=>i==='red-barracks-camp')):spec.targets;
   if(route==='original'&&spec.waves){await holdWaves(m,{waves:spec.waves-1});s=await status(m);check(!s.ended&&s.objectives.waves[0]===spec.waves-1,`${L}: ${spec.waves-1} waves are not enough`,s.objectives);await holdWaves(m,{waves:spec.waves});}
   else{
    if(route==='original'&&targets.length>1){await strike(m,targets.slice(0,-1));s=await status(m);check(!s.ended,`${L}: all but one target is not enough`,s.objectives);await strike(m,targets.slice(-1));}
    else await strike(m,targets);
   }
  }
  s=await status(m);check(s.ended&&s.outcome==='victory'&&s.reason==='objectives-complete',`${L}: Victory`,s);
  if(route==='keep')check(s.structures.some(i=>i.startsWith('red-')),`${L}: the other Crimson structures are left standing`,s.structures);
  else check(s.keep.hp===s.keep.max,`${L}: won with the Crimson Keep untouched`,s.keep);
  const r=await result(m);
  check(r.title==='VICTORY'&&r.saved[id]?.clears===1&&!r.saved[nextOf(id)]&&('nextHit' in r.buttons),`${L}: result saved once and offers the next mission`,{title:r.title,buttons:r.buttons,saved:r.saved[id]});
  // Progression survives a reload: the next mission is open, the one after it is not.
  await m.page.reload();await scene(m,'MainMenu');await click(m,'campaignButton',undefined,'MainMenu');await scene(m,'ChapterSelect');await frames(m.page,4);
  const next=nextOf(id);await click(m,'chapterButtons',chapterOf(next),'ChapterSelect');await scene(m,'CampaignSelect');await frames(m.page,6);
  const sel=await m.page.evaluate(()=>{const c=window.kingdomGame.scene.getScene('CampaignSelect');return {open:[...c.levelButtons.keys()],locked:[...c.lockedCards.keys()]};});
  const after=nextOf(next);
  check(sel.open.includes(next)&&!sel.open.includes(after),`${L}: after a reload ${next} is unlocked and ${after} stays locked`,sel);
  check(!m.errors.length,`${L}: no page errors`,m.errors);await finish(m);
 }catch(e){check(false,`${L}: walk-through error`,String(e.message).slice(0,300));}
}

if(want('retry'))for(const [id,name] of [['campaign-01','C1M1'],['campaign-02','C1M2'],['campaign-03','C1M3'],['campaign-14','C2M4']]){
 const L=`${name} retry`;
 try{
  const m=await open(id),start=await status(m);
  if(id==='campaign-02'){await buildTowers(m,1);await completeTowers(m);check((await status(m)).objectives.towers[0]===1,`${L}: one tower counted before the defeat`);}
  else await holdWaves(m,{ticks:900});
  await m.page.evaluate(()=>{const s=window.kingdomGame.scene.getScene('Battle').simulation,k=s.state.bases['blue-base'];s.hit({...s.hero,id:'raider',team:'red',kind:'minion-red'},k,1e9,'direct');for(let i=0;i<5&&!s.ended;i++)s.advance(1000/30+.01);});
  let r=await result(m);check(r.title!=='VICTORY'&&!r.saved[id]&&('restartHit' in r.buttons)&&!('nextHit' in r.buttons),`${L}: a Defeat offers Retry and saves nothing`,{title:r.title,buttons:r.buttons});
  await hud(m,'restartHit');await playing(m);let s=await status(m);
  const clean=o=>Object.values(o).every(v=>v[0]===0&&!v[2]);
  check(clean(s.objectives)&&s.keep.hp===s.keep.max&&start.structures.every(i=>s.structures.includes(i))&&!s.structures.some(i=>i.startsWith('built-')),`${L}: Retry restores objectives, Keep and structures`,{objectives:s.objectives,keep:s.keep});
  // The retried match can be won, and a replay adds a clear without moving the unlock.
  await strike(m,['red-base']);if(id==='campaign-02'){await buildTowers(m);await completeTowers(m);}
  r=await result(m);check(r.title==='VICTORY'&&r.saved[id]?.clears===1,`${L}: the retried match is won and saved`,r.saved[id]);
  await hud(m,'restartHit');await playing(m);await strike(m,['red-base']);if(id==='campaign-02'){await buildTowers(m);await completeTowers(m);}
  r=await result(m);check(r.saved[id]?.clears===2&&!r.saved[nextOf(id)],`${L}: Replay adds a second clear only`,r.saved[id]);
  await hud(m,'nextHit');await scene(m,'MissionBriefing');
  check(await m.page.evaluate(n=>window.kingdomGame.scene.getScene('MissionBriefing').levelId===n,nextOf(id)),`${L}: Next Mission opens the ${nextOf(id)} briefing`);
  check(!m.errors.length,`${L}: no page errors`,m.errors);await finish(m);
 }catch(e){check(false,`${L}: walk-through error`,String(e.message).slice(0,300));}
}

if(want('save'))try{
 // A fresh player: only C1M1 is open, and a locked card does nothing.
 const ctx=await newContext({viewport:{width:1280,height:720}}),page=await ctx.newPage(),m={ctx,page,input:'mouse',errors:[]};
 page.setDefaultTimeout(90000);page.on('pageerror',e=>m.errors.push(e.message));
 await page.goto(base);await scene(m,'MainMenu');check(await page.evaluate(k=>localStorage.getItem(k),KEY)===null,'save: a fresh browser has no progress');
 await click(m,'campaignButton',undefined,'MainMenu');await scene(m,'ChapterSelect');await frames(page,4);await click(m,'chapterButtons','first-war','ChapterSelect');await scene(m,'CampaignSelect');await frames(page,6);
 const sel=await page.evaluate(()=>{const c=window.kingdomGame.scene.getScene('CampaignSelect');return {open:[...c.levelButtons.keys()],inert:[...c.lockedCards.values()].every(h=>!h.input)};});
 check(sel.open.join()==='campaign-01'&&sel.inert,'save: only C1M1 is open; locked missions take no input',sel);
 await page.evaluate(()=>window.kingdomGame.scene.getScene('CampaignSelect').scene.start('Battle',{mode:'campaign',levelId:'campaign-03'}));await scene(m,'CampaignSelect');
 check(await page.evaluate(()=>!window.kingdomGame.scene.isActive('Battle')),'save: a locked mission cannot be started directly');
 await ctx.close();
}catch(e){check(false,'save: walk-through error',String(e.message).slice(0,300));}

if(want('captain'))for(const [locale,name] of [['en','Captain of the Ford'],['th','นายกองแห่งท่าข้าม'],['ja','渡河地点の隊長']])for(const touch of [false,true]){
 const L=`captain ${locale} (${touch?'touch':'desktop'})`;
 try{
  const m=await open('campaign-03',{locale,touch});
  const seen=()=>m.page.evaluate(name=>{const H=window.kingdomGame.scene.getScene('HUD'),out=[];const walk=(list,shown)=>{for(const o of list){const v=shown&&o.visible&&o.alpha>0;if(o.type==='Text'){if(v&&o.text.replace(/\s+/g,' ').includes(name)){const b=o.getBounds();out.push({x:Math.round(b.x),y:Math.round(b.y),right:Math.round(b.right),bottom:Math.round(b.bottom)});}}else if(o.list)walk(o.list,v);}};walk(H.children.list,true);return out;},name);
  check((await seen()).length===0,`${L}: no announcement before reaching the Captain`);
  await m.page.evaluate(()=>{const B=window.kingdomGame.scene.getScene('Battle'),c=B.simulation.state.units['red-warden-ford-captain'];for(const [dx,dy] of [[-120,0],[-140,60],[-140,-60],[-170,0],[-100,100]])if(B.setHeroPosition(c.x+dx,c.y+dy))break;});
  await m.page.waitForFunction(name=>{const H=window.kingdomGame.scene.getScene('HUD');const walk=l=>l.some(o=>o.visible&&(o.type==='Text'?o.text.replace(/\s+/g,' ').includes(name):o.list&&walk(o.list)));return walk(H.children.list);},name,{timeout:20000}).catch(()=>{});
  const found=await seen();await m.page.screenshot({path:`${dir}/captain-${locale}-${touch?'touch':'desktop'}.png`});
  check(found.length>0&&found.every(b=>b.x>=0&&b.y>=0&&b.right<=960&&b.bottom<=540),`${L}: the announcement shows "${name}" on screen`,found);
  await strike(m,['red-warden-ford-captain']);const s=await status(m);check(!s.ended&&!s.red.includes('red-warden-ford-captain'),`${L}: defeating the Captain is optional and does not end the mission`,s.objectives);
  check(!m.errors.length,`${L}: no page errors`,m.errors);await finish(m);
 }catch(e){check(false,`${L}: walk-through error`,String(e.message).slice(0,300));}
}

// Objective wrapping of every changed mission in all three languages: texts stay on screen. Stills for review.
if(want('wrap'))for(const locale of ['en','th','ja'])for(const touch of [false,true])for(const [id,spec] of Object.entries(MISSIONS)){
 const L=`objectives ${spec.name} ${locale} ${touch?'touch':'desktop'}`;
 try{
  const m=await open(id,{locale,touch});await frames(m.page,10);
  const out=await m.page.evaluate(()=>{const H=window.kingdomGame.scene.getScene('HUD'),bad=[];const walk=(list,shown)=>{for(const o of list){const v=shown&&o.visible&&o.alpha>0;if(o.type==='Text'){if(v&&o.text){const b=o.getBounds();if(b.x<-1||b.y<-1||b.right>961||b.bottom>541)bad.push([o.text.slice(0,40),Math.round(b.x),Math.round(b.right),Math.round(b.bottom)]);}}else if(o.list)walk(o.list,v);}};walk(H.children.list,true);return bad;});
  await m.page.screenshot({path:`${dir}/objectives-${spec.name}-${locale}-${touch?'touch':'desktop'}.png`});
  check(!out.length&&!m.errors.length,`${L}: HUD text stays on screen`,[...out,...m.errors]);await finish(m);
 }catch(e){check(false,`${L}: walk-through error`,String(e.message).slice(0,300));}
}

if(want('protected')){
 // C2M2: the Keep is protected scenery; the three phases remain.
 try{
  const m=await open('campaign-12');let s=await status(m);check(s.keep.shielded&&s.keep.damage!==undefined,'C2M2: the Crimson Keep starts protected',s.keep);
  check(Object.keys(s.objectives).join()==='stuns,slows,damage'&&s.phase==='shore','C2M2: the three mandatory phases remain, opening on Shield Bash',{phase:s.phase,objectives:s.objectives});
  await strike(m,['red-base']);s=await status(m);check(!s.ended&&s.keep.hp===s.keep.max,'C2M2: attacking the Keep does nothing',s.keep);
  check(!m.errors.length,'C2M2: no page errors',m.errors);await finish(m);
 }catch(e){check(false,'C2M2: walk-through error',String(e.message).slice(0,300));}
 // C1M6: the armed Keep finale has no alternative.
 try{
  const m=await open('campaign-06');let s=await status(m);check(Object.keys(s.objectives).join()==='keep'&&s.keep.damage>0,'C1M6: single objective against an armed Keep',{objectives:s.objectives,keep:s.keep});
  await strike(m,['red-base']);s=await status(m);check(s.outcome==='victory','C1M6: destroying the Keep wins',s.reason);
  const r=await result(m);check(r.buttons.nextHit==='NEXT CHAPTER'&&r.saved['campaign-06']?.clears===1,'C1M6: leads to the next chapter',r.buttons);await finish(m);
 }catch(e){check(false,'C1M6: walk-through error',String(e.message).slice(0,300));}
 // C4M1 Forest Edge: a gated territory siege.
 try{
  const m=await open('campaign-31');let s=await status(m);check(s.keep.shielded,'C4M1: the Keep starts shielded by the Forest Camp',s.keep);
  await strike(m,['red-base']);s=await status(m);check(!s.ended&&s.keep.hp===s.keep.max,'C4M1: the shielded Keep takes no damage',s.keep);
  await m.page.evaluate(()=>{const B=window.kingdomGame.scene.getScene('Battle'),S=B.simulation;for(const u of Object.values(S.state.units))if(u.team==='red'&&Math.hypot(u.x-1104,u.y-600)<320){u.protectionTick=0;S.hit(S.hero,u,1e9,'direct');}for(const id of ['c4-camp-north','c4-camp-south']){const t=S.state.structures[id];if(t){t.protectionTick=0;S.hit(S.hero,t,1e9,'direct');}}B.setHeroPosition(1080,576);for(let i=0;i<200&&!S.ended;i++){S.hero.hp=S.hero.maxHp=1e6;S.advance(1000/30+.01);}});
  s=await status(m);check(s.objectives.keep!==undefined&&!s.keep.shielded,'C4M1: capturing the camp drops the shield',{objectives:s.objectives,keep:s.keep});
  await strike(m,['red-base']);s=await status(m);check(s.outcome==='victory','C4M1: the Keep then falls and wins',s.reason);
  check(!m.errors.length,'C4M1: no page errors',m.errors);await finish(m);
 }catch(e){check(false,'C4M1: walk-through error',String(e.message).slice(0,300));}
 // C6M6: the final boss encounter and siege progression.
 try{
  const m=await open('campaign-56');let s=await status(m);check(s.keep.shielded&&s.phase==='break-line','C6M6: starts on the front line with the Keep protected',{phase:s.phase,keep:s.keep});
  await strike(m,['red-base']);s=await status(m);check(!s.ended&&s.keep.hp===s.keep.max,'C6M6: the Keep cannot be rushed',s.keep);
  const play=await m.page.evaluate(()=>{const B=window.kingdomGame.scene.getScene('Battle'),S=B.simulation,DT=1000/30+.01,log=[];
   const step=n=>{for(let i=0;i<n&&!S.ended;i++){S.hero.hp=S.hero.maxHp=1e6;const k=S.state.bases['blue-base'];k.hp=k.maxHp;S.advance(DT);}};
   const hit=t=>{if(!t||t.hp<=0||S.ended)return;const mark=S.events.length;t.protectionTick=0;S.hit(S.hero,t,1e9,'direct');if(!S.ended)S.mission.evaluate(S.clock.tick,S.events.slice(mark));};
   const obj=()=>S.missionStatus().objectives,phase=()=>S.missionStatus().activePhase;
   const targetsOf=id=>S.setup.mission.phases.flatMap(p=>p.objectives).find(o=>o.id===id)?.targets??[];
   for(const id of targetsOf('frontline'))hit(S.state.structures[id]);step(10);log.push(['phase',phase()]);
   // Capture the Forward Post: holders down, stand at the post (where the boss tests enter it) until the banner is raised.
   for(const id of S.setup.post.holders)hit(S.state.structures[id]);
   const spot=S.setup.respawnChain[0].candidates[0];B.setHeroPosition(spot.x,spot.y);
   for(let i=0;i<300&&phase()==='seize-post';i++){for(const u of Object.values(S.state.units))if(u.team==='red'&&!u.warlord)hit(u);step(2);}
   log.push(['phase',phase(),obj().map(o=>[o.id,o.progress,o.complete])]);
   const boss=()=>Object.values(S.state.units).find(u=>u.warlord);log.push(['boss',!!boss(),boss()?.maxHp]);
   const stages=new Set();
   for(let i=0;i<400&&!S.ended;i++){const b=boss();if(b){stages.add(b.warlordStage??'start');B.setHeroPosition(b.x-70,b.y);}
    for(const t of Object.values(S.state.structures))if(t.warBanner||t.banner&&t.team==='red')hit(t);hit(b);step(15);}
   return {log,stages:[...stages],ended:S.ended,outcome:S.outcome?.outcome??null,reason:S.outcome?.reason??null,phase:phase(),keepShielded:!!S.state.bases['red-base']?.invulnerable};});
  check(play.log[0][1]==='seize-post'&&play.log[1][1]==='arena','C6M6: front line, then the forward post, then the arena',play.log);
  check(play.log[2][1]===true,'C6M6: the Warlord is on the field',play.log[2]);
  check(play.ended&&play.outcome==='victory','C6M6: defeating the Warlord through his stages wins',play);
  if(play.outcome==='victory'){const r=await result(m);check(r.buttons.chapterHit==='CAMPAIGN COMPLETE'&&!('nextHit' in r.buttons)&&r.saved['campaign-56']?.clears===1,'C6M6: the finale says Campaign Complete and is saved',r.buttons);}
  check(!m.errors.length,'C6M6: no page errors',m.errors);await finish(m);
 }catch(e){check(false,'C6M6: walk-through error',String(e.message).slice(0,300));}
}
// The menu of this build.
if(want('version'))for(const locale of ['en','th','ja']){
 const ctx=await newContext({viewport:{width:1280,height:720}}),page=await ctx.newPage();
 await page.addInitScript(l=>localStorage.setItem('kingdom-clash.locale.v1',l),locale);await page.goto(base);await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('MainMenu'),null,{timeout:90000});await page.waitForTimeout(1200);
 const texts=await page.evaluate(()=>window.kingdomGame.scene.getScene('MainMenu').children.list.filter(o=>o.type==='Text').map(o=>o.text));
 check(texts.some(t=>t.endsWith(' · V1.2')),`version ${locale}: the main menu shows V1.2`,texts);await page.screenshot({path:`${dir}/menu-${locale}.png`});await ctx.close();
}
await writeFile(`${dir}/report${only?'-'+only.join('-'):''}.json`,JSON.stringify({passed:total-failed,failed,results},null,1));
console.log(`${total-failed}/${total} passed`);
await browser.close();process.exit(failed?1:0);
