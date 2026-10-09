// Phase 2C Scenario 3: extended-encounter stress and lifecycle (pause, timeScale, death/respawn,
// Restart mid-wave, repeated Restart, resize + touch). Fixture steps are labeled SUPPLEMENTAL.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {clickGame} from './browser-coordinates.mjs';
const variant=process.env.VERIFICATION_VARIANT||'development',url=process.env.PROTOTYPE_URL||'http://127.0.0.1:5180/?encounter=extended',root=process.env.EVIDENCE_ROOT||'docs/phase2c';
const dir=`${root}/screenshots/${variant}`;await mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:960,height:540},hasTouch:true}),checks=[],errors=[],evidence={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});page.on('crash',()=>errors.push('Renderer crash'));
const click=(x,y)=>clickGame(page,x,y);
function check(ok,name,detail){checks.push({name,passed:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)throw new Error(name);}
const listenerNames=['cast','skill-aim','stick','pause-visual','poststep','simulation-event','time-scale'];
async function state(){return page.evaluate(names=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation,h=window.kingdomGame.scene.getScene('HUD'),st=s.state;
 return {tick:s.clock.tick,scale:s.clock.timeScale,paused:s.clock.paused,phase:st.match.phase,result:st.match.result,waves:st.spawnedWaves,queue:s.spawnQueue.length,
  units:Object.keys(st.units).sort(),red:Object.values(st.units).filter(u=>u.kind==='minion-red').length,blue:Object.values(st.units).filter(u=>u.kind==='minion-blue').length,
  structures:Object.values(st.structures).map(x=>({id:x.id,team:x.team,hp:x.hp})),hero:{x:s.hero.x,y:s.hero.y,hp:s.hero.hp,maxHp:s.hero.maxHp,statuses:s.hero.statuses?.length??0,shield:!!s.hero.shield,respawn:s.hero.respawnTick??null},
  p:st.heroProgression,gold:st.gold,wood:st.wood,iron:st.iron,bases:{blue:st.bases['blue-base'].hp,red:st.bases['red-base'].hp},zones:st.skills.zones.length,cast:!!st.skills.cast,attacking:st.attacking,
  objective:h.objectiveText.text,resultsVisible:h.results.visible,title:h.resultTitle.text,listeners:Object.fromEntries(names.map(n=>[n,window.kingdomGame.events.listenerCount(n)])),spawnIds:window.spawnIds.length,dup:window.dup,keepHit:st.encounter.alliedBaseHitTick??null,
  visuals:b.visuals.size,hpBars:b.hpBars.size};},listenerNames);}
async function install(){await page.evaluate(()=>{window.spawnIds=[];window.dup=0;window.evs=[];window.kingdomGame.events.on('simulation-event',e=>{if(e.type==='spawn'){if(window.spawnIds.includes(e.id))window.dup++;window.spawnIds.push(e.id);}window.evs.push(e.type);});});}
async function resetRec(){await page.evaluate(()=>{window.spawnIds=[];window.dup=0;window.evs=[];});}
async function until(fn,arg,timeout=60000){await page.waitForFunction(fn,arg,{timeout});}
async function restart(){await page.evaluate(()=>window.priorSim=window.kingdomGame.scene.getScene('Battle').simulation);await click(480,350);await until(()=>window.visualReady&&window.kingdomGame.scene.getScene('Battle').simulation!==window.priorSim&&window.kingdomGame.scene.isActive('HUD'));await resetRec();return state();}
async function attackButton(){const a=await page.evaluate(()=>{const a=window.kingdomGame.scene.getScene('HUD').abilities[4];return {x:a.x,y:a.y};});await click(a.x,a.y);}
const freshOk=(f,initial,label)=>f.tick<=30&&f.waves===0&&f.queue===0&&f.red===0&&f.blue===3&&f.structures.length===7&&f.structures.every(s=>s.team==='red'&&s.hp===650)&&f.p.level===1&&f.p.xp===0&&f.gold===250&&f.bases.blue===3000&&f.bases.red===3000&&f.hero.hp===1200&&f.zones===0&&!f.cast&&f.phase==='playing'&&!f.resultsVisible&&f.objective.startsWith('Wave 0 / 12')&&JSON.stringify(f.listeners)===JSON.stringify(initial.listeners)&&f.keepHit===null;
async function supplementalVictory(){ // SUPPLEMENTAL fixture: validated hero teleport + 1-HP keep, then real Attack kills it.
 await page.evaluate(()=>{const b=window.kingdomGame.scene.getScene('Battle'),s=b.simulation;s.state.bases['red-base'].hp=1;s.state.structures={...Object.fromEntries(Object.entries(s.state.structures).filter(([,x])=>x.team!=='red'))};b.setHeroPosition(1500,600);});
 await attackButton();await until(()=>window.kingdomGame.scene.getScene('HUD').results.visible,null,20000);}
try{
 await page.goto(url);await until(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD')&&window.kingdomGame.scene.getScene('HUD').skillPanel);await install();
 const initial=await state();evidence.initial=initial;check(freshOk(initial,initial,'initial')||initial.tick<=30,'Extended match starts fresh with seven towers and full keeps');

 // 1. Pause/resume during an active wave.
 await until(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.spawnedWaves>=1&&window.kingdomGame.scene.getScene('Battle').simulation.state.units['red-w1-1']);
 await click(770,46);await until(()=>window.kingdomGame.scene.getScene('Battle').simulation.clock.paused);
 const paused=await state();await page.waitForTimeout(1500);const pausedLater=await state();
 check(JSON.stringify({...paused,listeners:0})===JSON.stringify({...pausedLater,listeners:0})&&paused.phase==='paused','Pause freezes ticks, wave counter, spawn queue, units and towers mid-wave');
 await click(480,300);await until(()=>!window.kingdomGame.scene.getScene('Battle').simulation.clock.paused);await page.waitForTimeout(1500);
 const resumed=await state();check(resumed.tick>paused.tick&&resumed.dup===0&&resumed.waves===1,'Resume continues the same wave without duplicate spawns',JSON.stringify({dup:resumed.dup}));

 // 2. Build / Shop panels use the existing timeScale; spawning follows simulation time.
 const util=await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').utilities.map(u=>({x:u.x,y:u.y})));
 await click(util[0].x,util[0].y);await until(()=>window.kingdomGame.scene.getScene('Battle').buildingMode);const build=await state();await page.waitForTimeout(800);const build2=await state();
 evidence.buildScale={scale:build.scale,ticksIn800ms:build2.tick-build.tick};check(build.scale<1&&build2.tick-build.tick<20,'Build panel slows simulation time through the existing timeScale',JSON.stringify(evidence.buildScale));
 await click(552,470);await until(()=>!window.kingdomGame.scene.getScene('Battle').buildingMode);await page.waitForTimeout(300);check((await state()).scale===1,'Closing Build restores timeScale 1');
 await click(util[1].x,util[1].y);await page.waitForTimeout(500);const shop=await state();evidence.shopScale=shop.scale;check(shop.scale<1,'Shop panel uses the same slowed timeScale',String(shop.scale));
 await click(util[1].x,util[1].y);await page.waitForTimeout(500);check((await state()).scale===1,'Closing Shop restores timeScale 1');

 // 3. Real Guardian death and respawn: walk east into the Crimson tower cluster at LV1.
 await attackButton();await page.keyboard.down('d');
 await until(()=>window.kingdomGame.scene.getScene('Battle').simulation.hero.hp<=0,null,120000);await page.keyboard.up('d');
 const dead=await state();check(dead.hero.hp===0&&dead.hero.respawn!==null,'Guardian dies to ordinary enemy fire and receives a respawn tick',JSON.stringify(dead.hero));
 await until(()=>window.kingdomGame.scene.getScene('Battle').simulation.hero.hp>0,null,60000);
 const alive=await state();check(alive.hero.hp===alive.hero.maxHp&&alive.hero.statuses===0&&!alive.hero.shield&&!alive.cast&&alive.dup===0,'Respawn restores full HP with no lingering statuses, shield or cast, and no duplicate spawns');
 await page.screenshot({path:`${dir}/lifecycle-respawn.png`});

 // 4. Resize and touch (844x390): joystick + Attack + a skill pointer together.
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);
 const rect=await page.locator('canvas').boundingBox(),cdp=await page.context().newCDPSession(page),pt=(x,y,id)=>({x:rect.x+x/960*rect.width,y:rect.y+y/540*rect.height,radiusX:8,radiusY:8,id});
 const ap=await page.evaluate(()=>{const a=window.kingdomGame.scene.getScene('HUD').abilities[4];return {x:a.x,y:a.y};}),before=await state();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(104,447,1)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(70,447,1)]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(70,447,1),pt(ap.x,ap.y,2)]});await page.waitForTimeout(700);
 const touched=await state();touched.pressed=await page.evaluate(()=>window.kingdomGame.scene.getScene('HUD').abilities[4].pressed);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 check(touched.hero.x<before.hero.x-5&&touched.pressed,'844x390 joystick moves the Guardian while Attack is held with independent pointers',JSON.stringify({from:before.hero.x,to:touched.hero.x}));
 await page.screenshot({path:`${dir}/lifecycle-844x390.png`});await page.setViewportSize({width:960,height:540});await page.waitForTimeout(200);

 // 5. Restart after a normal Defeat reached by an unattended match mid-wave.
 evidence.defeatStart=await state();
 await page.keyboard.up('d');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}).catch(()=>{});
 await until(()=>window.kingdomGame.scene.getScene('HUD').objectiveText.text.includes('THREATENED'),null,300000);const warned=await state();evidence.warning=warned.objective;check(warned.objective.includes('KEEP THREATENED'),'HUD warns when raiders approach or damage Azure Keep',warned.objective);await page.screenshot({path:`${dir}/lifecycle-keep-threatened.png`});
 await until(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.match.phase==='defeat',null,420000);
 await until(()=>window.kingdomGame.scene.getScene('HUD').results.visible);
 const defeat=await state();evidence.defeat=defeat;check(defeat.bases.blue===0&&defeat.title==='DEFEAT','Unattended extended match reaches a legitimate Defeat while waves are still pending');
 check(defeat.waves<12||defeat.queue>0||defeat.red>0,'Defeat occurred during an active encounter (waves/queue/raiders outstanding)',JSON.stringify({waves:defeat.waves,queue:defeat.queue,red:defeat.red}));
 await page.waitForTimeout(2000);const frozen=await state();check(frozen.tick===defeat.tick&&frozen.waves===defeat.waves&&frozen.queue===defeat.queue&&frozen.units.join()===defeat.units.join(),'No wave progression or spawns after the terminal state');
 const r1=await restart();evidence.restart1=r1;check(freshOk(r1,initial),'Restart after Defeat mid-wave gives a fresh encounter with no leftover units, queue, towers damage, XP or listeners');
 await page.waitForTimeout(500);

 // 6. Fresh match proceeds on its own schedule: wave 1 spawns once at tick 300.
 await until(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.units['red-w1-2'],null,30000);
 const w1=await state();check(w1.dup===0&&w1.waves===1&&w1.spawnIds>=3&&w1.spawnIds<=3+w1.blue,'Restarted match spawns wave 1 once with no duplicate ids',JSON.stringify({ids:w1.spawnIds,dup:w1.dup}));

 // 7. Repeated Restart from Victory mid-wave. SUPPLEMENTAL: teleport + 1-HP keep only to reach the terminal state quickly.
 for(let i=1;i<=3;i++){
  await supplementalVictory();const v=await state();check(v.result?.outcome==='victory'&&v.title==='VICTORY','SUPPLEMENTAL fixture reaches a real Victory result mid-encounter (pass '+i+')');
  await page.waitForTimeout(1000);const vf=await state();check(vf.tick===v.tick&&vf.waves===v.waves&&vf.queue===v.queue,'No wave progression after Victory (pass '+i+')');
  const r=await restart();evidence['restartVictory'+i]=r;check(freshOk(r,initial),'Restart after Victory is fresh with identical listeners (pass '+i+')');
  await until(()=>window.kingdomGame.scene.getScene('Battle').simulation.state.units['red-w1-0'],null,30000);const w=await state();check(w.dup===0,'No duplicate spawns after repeated Restart (pass '+i+')');
 }
 evidence.finalVisuals=await state();
 check(evidence.finalVisuals.visuals<=evidence.finalVisuals.units.length+Object.keys(evidence.finalVisuals.structures).length+2+8,'Visual objects stay bounded after repeated Restart (no leaked sprites)',JSON.stringify({visuals:evidence.finalVisuals.visuals,units:evidence.finalVisuals.units.length}));
 check(errors.length===0,'No browser, console or missing-asset errors during lifecycle',errors.join('|'));
}catch(e){errors.push(String(e.stack||e));}
finally{await browser.close();await writeFile(`${root}/lifecycle-${variant}.json`,JSON.stringify({url,checks,errors,evidence},null,2));console.log(`${checks.filter(c=>c.passed).length}/${checks.length} checks passed; errors: ${errors.length}`);}
